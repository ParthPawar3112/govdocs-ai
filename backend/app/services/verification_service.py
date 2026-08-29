"""
Document Trust & Verification engine ("The Bad Reading" challenge).

What this DOES: extract factual claims from a document, inspect its
provenance, look for corroboration and contradiction against other stored
government documents, weigh reliability signals, and produce an EXPLAINABLE
classification - VERIFIED / CORROBORATED / NEEDS_REVIEW / FLAGGED - plus the
reasons behind it.

What this does NOT do: decide absolute truth. Every score is a reliability
assessment, every uncertain item stays uncertain, nothing suspicious is
deleted, and a human reviewer can always override the machine.

Scope note: "available evidence" here means the GovDocs repository itself -
this layer does not crawl the public web. That boundary is surfaced in the
UI ("No other stored government document corroborates this claim").
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import (
    REVIEW_DECISIONS,
    SOURCE_TYPE_AUTHORITY,
    SOURCE_TYPE_LABELS,
    SUPERSEDE_TOKENS,
    SUSPICIOUS_CONTENT_TOKENS,
)
from app.db.database import SessionLocal
from app.models.document import Document
from app.models.user import User
from app.models.verification import (
    ClaimContradiction,
    DocumentClaim,
    DocumentVerification,
    VerificationEvent,
)
from app.services import audit_service

logger = logging.getLogger("govdocs.verification")

# --------------------------------------------------------------------------- #
# small helpers                                                               #
# --------------------------------------------------------------------------- #
_AMOUNT_RE = re.compile(
    r"(?:₹|rs\.?|inr)\s?([\d,]+(?:\.\d+)?)\s?(lakh|crore|thousand|k)?",
    re.IGNORECASE,
)
_REF_RE = re.compile(
    r"(?:circular|notification|g\.?\s?r\.?|order|ref(?:erence)?|memo|no)\.?\s*(?:no\.?)?\s*[:\-]?\s*"
    r"([A-Za-z0-9][A-Za-z0-9/\-\.]{3,})",
    re.IGNORECASE,
)
_SCHEME_RE = re.compile(
    r"([A-Z][A-Za-z&\.\- ]{2,60}?(?:Scheme|Yojana|Yojna|Abhiyan|Programme|Program|Mission|Nidhi|Pension|Fund))",
)
_DATE_RE = re.compile(r"\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4})\b")
_PCT_RE = re.compile(r"(\d{1,3}(?:\.\d+)?\s?%)")
_FULL_DATE_RE = re.compile(
    r"\b(\d{1,2})[ /\-.](\d{1,2}|[A-Za-z]{3,9})[ /\-.](\d{2,4})\b|\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b"
)
_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1
)}
_LOCATION_RE = re.compile(
    r"\b(?:in|at|for|of)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\s+(?:district|taluka|tehsil|block|village|municipality|division)\b"
)
_NEGATIVE_SCHEME_RE = re.compile(
    r"\b(fake|fraud|fraudulent|scam|scrapp?ed|discontinued|cancelled|canceled|stopped|hoax|bogus|withdrawn)\b",
    re.IGNORECASE,
)
_MULTIPLIER = {None: 1, "": 1, "k": 1_000, "thousand": 1_000, "lakh": 100_000, "crore": 10_000_000}


def _location_guess(text: str) -> str | None:
    match = _LOCATION_RE.search(text or "")
    return match.group(1).strip()[:200] if match else None


def _parse_any_date(text: str):
    """Best-effort -> datetime.date (day precision) or None. Handles
    'DD/MM/YYYY', 'DD Month YYYY', 'Month DD, YYYY', 'YYYY-MM-DD'."""
    from datetime import date as _date

    text = (text or "").strip()
    iso = re.match(r"(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if iso:
        try:
            return _date(int(iso.group(1)), int(iso.group(2)), int(iso.group(3)))
        except ValueError:
            return None
    match = _FULL_DATE_RE.search(text)
    if not match:
        year = re.search(r"\b(19|20)\d{2}\b", text)
        if year:
            try:
                return _date(int(year.group(0)), 1, 1)
            except ValueError:
                return None
        return None
    try:
        if match.group(1):
            day, mon_raw, yr = match.group(1), match.group(2), match.group(3)
            month = _MONTHS.get(mon_raw[:3].lower()) if not mon_raw.isdigit() else int(mon_raw)
        else:
            mon_raw, day, yr = match.group(4), match.group(5), match.group(6)
            month = _MONTHS.get(mon_raw[:3].lower())
        if not month:
            return None
        year_int = int(yr)
        if year_int < 100:
            year_int += 2000
        return _date(year_int, month, int(day))
    except (ValueError, TypeError):
        return None


def sha256_of(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


_SCHEME_STOPWORDS = {"the", "a", "an", "this", "that", "old", "new", "revised", "draft"}


def _norm_scheme(name: str | None) -> str:
    if not name:
        return ""
    cleaned = re.sub(r"[^a-z0-9 ]", " ", name.lower())
    tokens = [t for t in cleaned.split() if t]
    while tokens and tokens[0] in _SCHEME_STOPWORDS:
        tokens.pop(0)
    return " ".join(tokens)


def _scheme_match(a: str | None, b: str | None) -> bool:
    """Fuzzy 'same scheme' test - exact, substring, or strong token overlap,
    so 'The PM-KISAN Farmer Support Scheme' matches 'PM-KISAN Farmer Support
    Scheme'."""
    na, nb = _norm_scheme(a), _norm_scheme(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    if len(na) >= 6 and len(nb) >= 6 and (na in nb or nb in na):
        return True
    ta, tb = set(na.split()), set(nb.split())
    if not ta or not tb:
        return False
    overlap = len(ta & tb) / len(ta | tb)
    return overlap >= 0.6


def _amount_to_number(raw: str, multiplier: str | None) -> float | None:
    try:
        value = float(raw.replace(",", ""))
    except ValueError:
        return None
    return value * _MULTIPLIER.get((multiplier or "").lower(), 1)


def _parse_amounts(text: str) -> list[dict]:
    out = []
    for match in _AMOUNT_RE.finditer(text or ""):
        number = _amount_to_number(match.group(1), match.group(2))
        if number is not None:
            out.append({"raw": match.group(0).strip(), "value": number})
    return out


# --------------------------------------------------------------------------- #
# Gemini (optional) - reused pattern from ai_service, but its own prompts     #
# --------------------------------------------------------------------------- #
def _gemini_json(prompt: str) -> dict | list | None:
    if not settings.GEMINI_API_KEY:
        return None
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        return None
    try:
        try:
            client = genai.Client(
                api_key=settings.GEMINI_API_KEY,
                http_options=types.HttpOptions(timeout=20_000),  # ms - don't stall the pipeline
            )
        except TypeError:  # older SDK without http_options
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        raw = (response.text or "").strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].removeprefix("json").strip()
        return json.loads(raw)
    except Exception as exc:  # noqa: BLE001 - AI is best-effort here
        logger.warning(f"verification Gemini call failed, falling back to heuristics: {exc}")
        return None


_CLAIM_PROMPT = """You extract discrete factual CLAIMS from the OCR text of a government document.
A claim is a specific assertion that could be checked against records (an amount, an eligibility rule,
a date/deadline, a policy statement, a statistic).

OCR TEXT:
{ocr_text}

Return ONLY JSON: a list of up to 8 objects, most important first:
[
  {{
    "claim_text": "one sentence, quoted or closely paraphrased",
    "claim_type": "monetary | eligibility | date | deadline | policy | statistic | contact | other",
    "entities": ["people/departments/places named"],
    "dates": ["any dates mentioned"],
    "amounts": ["any amounts mentioned, e.g. Rs 6000"],
    "percentages": ["any percentages mentioned, e.g. 25%"],
    "location": "district / taluka / village / state this claim applies to, or empty",
    "scheme_name": "the scheme/programme this claim is about, or empty",
    "issuing_organization": "the body said to issue it, or empty",
    "reference_number": "any circular/GR/notification number tied to this claim, or empty",
    "confidence": 0
  }}
]
Rules: JSON only. No markdown. If the text has no checkable claims, return [].
"""

_ASSESS_PROMPT = """You are a reliability analyst for a government document repository.
You do NOT decide whether the document is true. You only surface signals a human reviewer should weigh.

DOCUMENT TEXT (OCR):
{ocr_text}

KNOWN PROVENANCE:
{provenance}

EXTRACTED CLAIMS:
{claims}

Return ONLY JSON:
{{
  "suggested_status": "VERIFIED | CORROBORATED | NEEDS_REVIEW | FLAGGED",
  "confidence": 0,
  "observations": ["neutral factual notes about the document's form and provenance"],
  "possible_issues": ["specific reliability concerns, phrased cautiously"]
}}
Guidance:
- Prefer NEEDS_REVIEW when provenance is incomplete or claims cannot be checked.
- Use FLAGGED only for strong signs of manipulation, forgery, or contradiction with official info.
- Never output VERIFIED unless an official/departmental source and a reference number are present.
- JSON only. No markdown.
"""


# --------------------------------------------------------------------------- #
# claim extraction                                                            #
# --------------------------------------------------------------------------- #
def _extract_claims_ai(ocr_text: str) -> list[dict] | None:
    data = _gemini_json(_CLAIM_PROMPT.format(ocr_text=ocr_text[:9000]))
    if not isinstance(data, list):
        return None
    claims = []
    for item in data[:8]:
        if not isinstance(item, dict) or not str(item.get("claim_text", "")).strip():
            continue
        claims.append(
            {
                "claim_text": str(item.get("claim_text", "")).strip()[:600],
                "claim_type": str(item.get("claim_type", "other")).strip().lower() or "other",
                "entities": [str(e).strip() for e in (item.get("entities") or []) if str(e).strip()][:12],
                "dates": [str(d).strip() for d in (item.get("dates") or []) if str(d).strip()][:12],
                "amounts": [str(a).strip() for a in (item.get("amounts") or []) if str(a).strip()][:12],
                "percentages": [str(p).strip() for p in (item.get("percentages") or []) if str(p).strip()][:12],
                "location": (str(item.get("location", "")).strip() or None),
                "scheme_name": (str(item.get("scheme_name", "")).strip() or None),
                "issuing_organization": (str(item.get("issuing_organization", "")).strip() or None),
                "reference_number": (str(item.get("reference_number", "")).strip() or None),
                "ai_confidence": _safe_float(item.get("confidence")),
                "extraction_method": "ai",
            }
        )
    return claims


def _safe_float(value) -> float | None:
    try:
        return max(0.0, min(100.0, float(value)))
    except (TypeError, ValueError):
        return None


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?\n])\s+", text or "") if s.strip()]


def _extract_claims_heuristic(ocr_text: str) -> list[dict]:
    text = ocr_text or ""
    scheme_guess = None
    scheme_match = _SCHEME_RE.search(text)
    if scheme_match:
        scheme_guess = scheme_match.group(1).strip()[:200]
    ref_guess = None
    ref_match = _REF_RE.search(text)
    if ref_match:
        ref_guess = ref_match.group(1).strip()[:120]

    claims: list[dict] = []
    seen: set[str] = set()
    for sentence in _split_sentences(text):
        low = sentence.lower()
        amounts = _AMOUNT_RE.findall(sentence)
        pcts = _PCT_RE.findall(sentence)
        negative = bool(_NEGATIVE_SCHEME_RE.search(sentence)) and (
            "scheme" in low or "yojana" in low or bool(scheme_guess)
        )
        dates = _DATE_RE.findall(sentence)
        is_deadline = any(k in low for k in ("deadline", "last date", "closes on", "close on", "apply by", "extended to"))
        if not (amounts or pcts or negative or ("eligib" in low) or is_deadline):
            continue
        key = low[:120]
        if key in seen:
            continue
        seen.add(key)
        if is_deadline:
            claim_type = "deadline"
        elif amounts:
            claim_type = "monetary"
        elif pcts:
            claim_type = "statistic"
        elif negative:
            claim_type = "policy"
        elif "eligib" in low:
            claim_type = "eligibility"
        else:
            claim_type = "other"
        claims.append(
            {
                "claim_text": sentence[:600],
                "claim_type": claim_type,
                "entities": [],
                "dates": dates[:8],
                "amounts": [f"₹{a[0]}{(' ' + a[1]) if a[1] else ''}" for a in amounts][:8],
                "percentages": [p if p.endswith("%") else f"{p}%" for p in pcts][:8],
                "location": _location_guess(sentence),
                "scheme_name": scheme_guess,
                "issuing_organization": None,
                "reference_number": ref_guess,
                "ai_confidence": None,
                "extraction_method": "heuristic",
            }
        )
        if len(claims) >= 8:
            break
    return claims


# --------------------------------------------------------------------------- #
# provenance / source type                                                    #
# --------------------------------------------------------------------------- #
_GOV_DOMAIN_RE = re.compile(r"https?://[^\s]*\.(gov\.in|nic\.in|gov)(/|$|\s)", re.IGNORECASE)


def resolve_source_type(db: Session, document: Document, provided: str | None) -> str:
    if provided in SOURCE_TYPE_LABELS:
        return provided
    uploader = db.query(User).filter(User.username == document.uploaded_by).first()
    role = uploader.role if uploader else None
    if role == "Citizen":
        return "user_submitted"
    if role in ("Admin", "Officer"):
        return "departmental"
    return "unknown"


def _provenance_completeness(verification: DocumentVerification, document: Document) -> tuple[int, list[str]]:
    have = 0
    missing: list[str] = []
    checks = {
        "an issuing department": bool(document.department),
        "a reference / circular number": bool(verification.source_reference_no),
        "a publication date": bool(verification.source_published_date),
        "a source link or issuing body": bool(verification.source_url or verification.issuing_organization),
        "a file integrity hash": bool(document.file_sha256),
    }
    for label, present in checks.items():
        if present:
            have += 1
        else:
            missing.append(label)
    return int(round(have / len(checks) * 15)), missing


# --------------------------------------------------------------------------- #
# suspicious content                                                          #
# --------------------------------------------------------------------------- #
def _suspicious_indicators(ocr_text: str) -> list[dict]:
    text = (ocr_text or "").lower()
    hits: list[dict] = []
    for token in SUSPICIOUS_CONTENT_TOKENS:
        if token in text:
            hits.append(
                {
                    "code": "informal_forward_language",
                    "label": f'Contains phrasing typical of an informal forward: "{token}"',
                    "severity": "medium",
                }
            )
    # shouting urgency
    if re.search(r"\b(URGENT|IMMEDIATELY|ACT NOW|LAST DATE TODAY)\b", ocr_text or ""):
        hits.append(
            {"code": "urgency_language", "label": "Uses urgency/pressure language.", "severity": "low"}
        )
    # de-duplicate by label
    unique = {h["label"]: h for h in hits}
    return list(unique.values())


# --------------------------------------------------------------------------- #
# corroboration & contradiction (within the repository)                        #
# --------------------------------------------------------------------------- #
def _amounts_close(a: float, b: float) -> bool:
    if a == 0 or b == 0:
        return a == b
    return abs(a - b) / max(a, b) <= 0.05


def _find_corroboration(db: Session, document: Document, claim_row: DocumentClaim) -> list[dict]:
    if not _norm_scheme(claim_row.scheme_name):
        return []
    claim_amounts = [x["value"] for x in _parse_amounts(claim_row.claim_text)]
    out: list[dict] = []
    others = (
        db.query(DocumentClaim)
        .filter(DocumentClaim.document_id != document.id)
        .all()
    )
    seen_docs: set[int] = set()
    for other in others:
        if not _scheme_match(claim_row.scheme_name, other.scheme_name):
            continue
        if other.document_id in seen_docs:
            continue
        other_amounts = [x["value"] for x in _parse_amounts(other.claim_text)]
        amount_ok = (not claim_amounts) or any(
            _amounts_close(x, y) for x in claim_amounts for y in other_amounts
        )
        if claim_row.claim_type == "monetary" and claim_amounts and not amount_ok:
            continue
        other_doc = db.get(Document, other.document_id)
        other_ver = _get_or_none(db, other.document_id)
        seen_docs.add(other.document_id)
        out.append(
            {
                "document_id": other.document_id,
                "title": other_doc.title if other_doc else f"DOC-{other.document_id}",
                "source_type": other_ver.source_type if other_ver else "unknown",
                "note": "Same scheme and consistent details.",
            }
        )
    return out


def _detect_contradictions(
    db: Session, document: Document, claim_rows: list[DocumentClaim]
) -> list[ClaimContradiction]:
    created: list[ClaimContradiction] = []
    # One contradiction row per (field, other_document_id) - no matter how many
    # individual claim pairs collide.
    seen: set[tuple[str, int | None]] = set()
    other_claims = db.query(DocumentClaim).filter(DocumentClaim.document_id != document.id).all()
    title_cache: dict[int, str] = {}

    def _title(doc_id: int) -> str:
        if doc_id not in title_cache:
            other_doc = db.get(Document, doc_id)
            title_cache[doc_id] = other_doc.title if other_doc else f"DOC-{doc_id}"
        return title_cache[doc_id]

    for claim in claim_rows:
        has_scheme = bool(_norm_scheme(claim.scheme_name))
        my_amounts = [x["value"] for x in _parse_amounts(claim.claim_text)]
        my_negative = bool(_NEGATIVE_SCHEME_RE.search(claim.claim_text))

        for other in other_claims:
            if has_scheme and _norm_scheme(other.scheme_name):
                if not _scheme_match(claim.scheme_name, other.scheme_name):
                    continue
            elif not _shared_entities(claim, other):
                continue

            other_amounts = [x["value"] for x in _parse_amounts(other.claim_text)]
            other_title = _title(other.document_id)

            # 1. Monetary conflict for the same scheme.
            if (
                claim.claim_type == "monetary"
                and my_amounts
                and other_amounts
                and ("amount", other.document_id) not in seen
                and not any(_amounts_close(x, y) for x in my_amounts for y in other_amounts)
            ):
                seen.add(("amount", other.document_id))
                row = ClaimContradiction(
                    document_id=document.id,
                    claim_id=claim.id,
                    other_document_id=other.document_id,
                    other_claim_id=other.id,
                    field="amount",
                    value_a=_fmt_amounts(my_amounts),
                    value_b=_fmt_amounts(other_amounts),
                    explanation=(
                        f'This document states {_fmt_amounts(my_amounts)} for the same scheme, '
                        f'while "{other_title}" states {_fmt_amounts(other_amounts)}.'
                    ),
                    resolution="NEEDS_HUMAN_REVIEW",
                )
                db.add(row)
                created.append(row)

            # 2. "Scheme is fake / scrapped" vs a document describing it normally.
            if (
                my_negative
                and not _NEGATIVE_SCHEME_RE.search(other.claim_text)
                and ("status", other.document_id) not in seen
            ):
                seen.add(("status", other.document_id))
                row = ClaimContradiction(
                    document_id=document.id,
                    claim_id=claim.id,
                    other_document_id=other.document_id,
                    other_claim_id=other.id,
                    field="status",
                    value_a="claims the scheme is fake / discontinued",
                    value_b=f'"{other_title}" treats the scheme as active',
                    explanation=(
                        "This document asserts the scheme is fraudulent or discontinued, which "
                        f'conflicts with "{other_title}".'
                    ),
                    resolution="NEEDS_HUMAN_REVIEW",
                )
                db.add(row)
                created.append(row)

    return created


def _shared_entities(a: DocumentClaim, b: DocumentClaim) -> bool:
    ea = {str(x).lower() for x in (a.entities or [])}
    eb = {str(x).lower() for x in (b.entities or [])}
    return len(ea & eb) >= 2


def _fmt_amounts(values: list[float]) -> str:
    return ", ".join(f"₹{int(v):,}" if float(v).is_integer() else f"₹{v:,.2f}" for v in values) or "—"


# --------------------------------------------------------------------------- #
# outdated / superseded detection (Feature 7)                                 #
# --------------------------------------------------------------------------- #
_DEADLINE_HINT_RE = re.compile(
    r"(deadline|last date|closes? on|close on|apply by|applications? close|valid (?:till|until|up to))",
    re.IGNORECASE,
)


def _pub_date(verification: DocumentVerification) -> "object | None":
    return _parse_any_date(verification.source_published_date or "")


def _detect_outdated(
    db: Session, document: Document, verification: DocumentVerification, claim_rows: list[DocumentClaim]
) -> dict:
    """A document is 'outdated' when, for the same scheme, a NEWER document from
    an official/departmental source exists, or its own stated deadline has
    passed and a newer document exists. The historical document is preserved -
    only its current relevance is marked. Repository-only evidence."""
    from datetime import date as _date

    result = {"is_outdated": False, "superseded_by": None, "reason": None}

    schemes = {c.scheme_name for c in claim_rows if _norm_scheme(c.scheme_name)}
    if not schemes and document.ai_title:
        schemes = {document.ai_title}
    if not schemes:
        return result

    my_pub = _pub_date(verification)
    today = _date.today()

    # Own stated deadline in the past?
    my_deadline = None
    for claim in claim_rows:
        if claim.claim_type == "deadline" or _DEADLINE_HINT_RE.search(claim.claim_text or ""):
            for token in (claim.dates or []) + re.findall(r"[A-Za-z0-9 ,/\-.]+", claim.claim_text or ""):
                parsed = _parse_any_date(str(token))
                if parsed and (my_deadline is None or parsed > my_deadline):
                    my_deadline = parsed

    # Look for a newer document about the same scheme.
    candidates = (
        db.query(DocumentVerification)
        .filter(DocumentVerification.document_id != document.id)
        .all()
    )
    newest = None
    newest_pub = my_pub
    for cand in candidates:
        cand_doc = db.get(Document, cand.document_id)
        if cand_doc is None:
            continue
        cand_claims = db.query(DocumentClaim).filter(DocumentClaim.document_id == cand.document_id).all()
        cand_schemes = {c.scheme_name for c in cand_claims if _norm_scheme(c.scheme_name)} or {cand_doc.ai_title}
        if not any(_scheme_match(s, cs) for s in schemes for cs in cand_schemes if cs):
            continue
        if cand.source_type not in ("official", "departmental", "trusted_external"):
            continue
        cand_pub = _pub_date(cand)
        cand_text = (cand_doc.ocr_text or "").lower()
        supersedes_language = any(tok in cand_text for tok in SUPERSEDE_TOKENS)
        if cand_pub and (newest_pub is None or cand_pub > newest_pub):
            newest, newest_pub = cand_doc, cand_pub
        elif supersedes_language and my_pub and cand_pub and cand_pub >= my_pub and newest is None:
            newest = cand_doc

    # Only conclude "superseded" when we actually know THIS document's date and
    # a newer one exists. A missing date means "unknown", not "outdated".
    if newest is not None and newest_pub and my_pub is not None and newest_pub > my_pub:
        result["is_outdated"] = True
        result["superseded_by"] = newest.id
        result["reason"] = (
            f'A newer document for the same scheme exists ("{newest.title}", '
            f"published {newest_pub.isoformat()}). This document may be superseded - verify current guidance."
        )
        return result

    if my_deadline and my_deadline < today and newest is not None:
        result["is_outdated"] = True
        result["superseded_by"] = newest.id
        result["reason"] = (
            f"The stated deadline ({my_deadline.isoformat()}) has passed and a newer document "
            f'("{newest.title}") exists for this scheme.'
        )
    elif my_deadline and my_deadline < today:
        result["is_outdated"] = True
        result["reason"] = (
            f"The stated deadline ({my_deadline.isoformat()}) has already passed - this information "
            "may no longer be current."
        )
    return result


_DISPLAY_STATUS_KEEPS_BASE = ("FLAGGED", "UNVERIFIED")


def _effective_status(base_status: str, currency_status: str | None) -> str:
    """The status shown in badges: OUTDATED overrides a clean base, but a
    FLAGGED document stays FLAGGED (a fake that is also old is still a fake)."""
    if currency_status == "outdated" and base_status not in _DISPLAY_STATUS_KEEPS_BASE:
        return "OUTDATED"
    return base_status


# --------------------------------------------------------------------------- #
# scoring & classification                                                    #
# --------------------------------------------------------------------------- #
def _score_and_classify(*, signals: dict) -> tuple[str, float, str, list[str]]:
    reasons: list[str] = []
    score = 50.0

    source_type = signals["source_type"]
    score += SOURCE_TYPE_AUTHORITY.get(source_type, -10)
    if source_type == "unknown":
        reasons.append("The source of this document could not be identified.")
    elif source_type in ("official", "departmental"):
        reasons.append(f"{SOURCE_TYPE_LABELS[source_type]} on record.")

    score += signals["provenance_points"]
    if signals["provenance_missing"]:
        reasons.append("Provenance is incomplete: missing " + ", ".join(signals["provenance_missing"]) + ".")

    corroboration = signals["corroboration_count"]
    contradictions = signals["contradiction_count"]
    # A conflict with an AUTHORITATIVE document is strong evidence; a conflict
    # with an unverified/unknown-source document is not - it more likely means
    # the *other* document is the problem, so it only warrants NEEDS_REVIEW.
    auth_contradictions = signals.get("authoritative_contradiction_count", contradictions)
    weak_contradictions = contradictions - auth_contradictions
    score += min(corroboration * 6, 18)
    if corroboration == 0 and signals["has_monetary_claim"]:
        reasons.append("No other stored government document corroborates the amounts claimed here.")
    elif corroboration >= 2 and contradictions == 0:
        reasons.append(f"{corroboration} other stored documents corroborate the key details.")

    score -= auth_contradictions * 24 + weak_contradictions * 8
    if auth_contradictions:
        reasons.append(
            f"{auth_contradictions} claim(s) here conflict with an authoritative document on file "
            "(see Contradictions)."
        )
    if weak_contradictions:
        reasons.append(
            f"{weak_contradictions} claim(s) here differ from another non-authoritative document on "
            "file - a reviewer should confirm which is correct."
        )
    if signals.get("resolved_contradiction_count"):
        reasons.append(
            f"{signals['resolved_contradiction_count']} conflicting lower-authority document(s) exist, "
            "but this is the authoritative version (conflict resolved by authority)."
        )

    suspicious = signals["suspicious_count"]
    score -= suspicious * 8
    if suspicious:
        reasons.append("The text uses language more typical of an informal forward than an issued notice.")

    ai_conf = signals.get("ai_confidence") or 0
    score += ai_conf / 100 * 10
    if ai_conf and ai_conf < 45:
        reasons.append("Automated reading of this document had low confidence.")

    freshness = signals.get("freshness")  # "fresh" | "old" | None
    if freshness == "fresh":
        score += 5
    elif freshness == "old":
        score -= 5
        reasons.append("The stated publication date is quite old; it may be superseded.")

    score = max(0.0, min(100.0, round(score, 1)))

    if score >= 70:
        band = "High"
    elif score >= 50:
        band = "Moderate"
    elif score >= 30:
        band = "Low"
    else:
        band = "Very Low"

    forgery = signals.get("forgery_signal", False)
    # FLAGGED requires an actual misinformation signal - not merely a conflict
    # or thin provenance. Conflicting-but-not-manipulated documents are
    # NEEDS_REVIEW so a human decides (per the challenge: "do not silently
    # choose one claim").
    flag_worthy = forgery or score < 12 or auth_contradictions >= 2
    if flag_worthy:
        status = "FLAGGED"
        reasons.insert(0, "Potential misinformation detected - this document should not be treated as authoritative.")
    elif source_type in ("official", "departmental") and score >= 70 and contradictions == 0 and signals["provenance_points"] >= 9:
        status = "VERIFIED"
        reasons.insert(0, "An authoritative source and corroborating records support this document.")
    elif corroboration >= 2 and score >= 55 and auth_contradictions == 0:
        status = "CORROBORATED"
        reasons.insert(0, "Multiple credible and independent sources agree, but authoritative confirmation is not on file.")
    else:
        status = "NEEDS_REVIEW"
        if contradictions:
            reasons.insert(0, "Conflicting information found - a reviewer should confirm which document is current and correct.")
        else:
            reasons.insert(0, "The evidence on file is not sufficient to confirm this document automatically.")

    return status, score, band, _dedupe(reasons)


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out


# --------------------------------------------------------------------------- #
# persistence helpers                                                         #
# --------------------------------------------------------------------------- #
def _get_or_none(db: Session, document_id: int) -> DocumentVerification | None:
    return (
        db.query(DocumentVerification)
        .filter(DocumentVerification.document_id == document_id)
        .first()
    )


def get_or_create(db: Session, document: Document, *, source_type: str | None = None,
                  source_url: str | None = None, source_reference_no: str | None = None,
                  source_published_date: str | None = None,
                  issuing_organization: str | None = None) -> DocumentVerification:
    row = _get_or_none(db, document.id)
    if row is None:
        row = DocumentVerification(document_id=document.id)
        db.add(row)
    if source_type:
        row.source_type = source_type
    if source_url:
        row.source_url = source_url
    if source_reference_no:
        row.source_reference_no = source_reference_no
    if source_published_date:
        row.source_published_date = source_published_date
    if issuing_organization:
        row.issuing_organization = issuing_organization
    db.commit()
    db.refresh(row)
    return row


def record_event(db: Session, document_id: int, actor: str, action: str, detail: str | None = None) -> None:
    try:
        db.add(VerificationEvent(document_id=document_id, actor=actor, action=action, detail=detail))
        db.commit()
    except Exception:  # noqa: BLE001
        db.rollback()


# --------------------------------------------------------------------------- #
# orchestrator                                                                #
# --------------------------------------------------------------------------- #
def process_document_verification(document_id: int, use_ai: bool = True) -> None:
    """Runs after AI metadata extraction (chained from ai_service) or on a
    manual re-analyse. Owns its own DB session - safe as a BackgroundTask.

    use_ai=False forces the deterministic heuristic path only (no Gemini
    round-trips) - used by the demo seeder so it stays fast and repeatable."""
    db = SessionLocal()
    try:
        document = db.get(Document, document_id)
        if document is None:
            return
        verification = get_or_create(db, document)
        verification.error = None

        ocr_text = document.ocr_text or ""

        # 1. claim extraction (AI first, heuristic fallback).
        ai_claims = _extract_claims_ai(ocr_text) if (use_ai and ocr_text.strip()) else None
        raw_claims = ai_claims if ai_claims else _extract_claims_heuristic(ocr_text)
        method = "ai" if ai_claims else ("heuristic" if raw_claims else "none")

        db.query(ClaimContradiction).filter(ClaimContradiction.document_id == document_id).delete()
        db.query(DocumentClaim).filter(DocumentClaim.document_id == document_id).delete()
        db.commit()

        claim_rows: list[DocumentClaim] = []
        for raw in raw_claims:
            row = DocumentClaim(
                document_id=document_id,
                claim_text=raw["claim_text"],
                claim_type=raw.get("claim_type", "other"),
                entities=raw.get("entities") or [],
                dates=raw.get("dates") or [],
                amounts=raw.get("amounts") or [],
                percentages=raw.get("percentages") or [],
                location=raw.get("location"),
                scheme_name=raw.get("scheme_name") or (document.ai_title if raw.get("claim_type") == "monetary" else None),
                issuing_organization=raw.get("issuing_organization"),
                reference_number=raw.get("reference_number") or verification.source_reference_no,
                ai_confidence=raw.get("ai_confidence"),
                extraction_method=raw.get("extraction_method", method),
                status="UNVERIFIED",
            )
            db.add(row)
            claim_rows.append(row)
        db.commit()
        for row in claim_rows:
            db.refresh(row)

        # 2. contradictions (repository-wide).
        contradiction_rows = _detect_contradictions(db, document, claim_rows)
        db.commit()

        # 3. corroboration per claim.
        corroboration_map: dict[int, list[dict]] = {}
        total_corroboration = 0
        for row in claim_rows:
            corr = _find_corroboration(db, document, row)
            corroboration_map[row.id] = corr
            total_corroboration += len(corr)

        # 4. provenance + suspicious signals.
        prov_points, prov_missing = _provenance_completeness(verification, document)
        suspicious = _suspicious_indicators(ocr_text)
        has_monetary = any(r.claim_type == "monetary" for r in claim_rows)

        # Feature 6: when an authoritative document clearly outranks the other
        # side of a conflict, the conflict is RESOLVED_BY_AUTHORITY for this
        # (authoritative) document - it is not penalised, and the resolution is
        # recorded. Conflicts that are NOT resolved this way are counted, and
        # split by whether the other document is itself authoritative.
        own_authority = SOURCE_TYPE_AUTHORITY.get(verification.source_type, -10)
        counted_contradictions: list = []
        authoritative_contradictions = 0
        for c in contradiction_rows:
            other_ver = _get_or_none(db, c.other_document_id) if c.other_document_id else None
            other_src = other_ver.source_type if other_ver else "unknown"
            other_authority = SOURCE_TYPE_AUTHORITY.get(other_src, -10)
            if verification.source_type in ("official", "departmental") and own_authority >= other_authority + 15:
                c.resolution = "RESOLVED_BY_AUTHORITY"
                c.resolved_by = f"this document ({SOURCE_TYPE_LABELS[verification.source_type]})"
            else:
                counted_contradictions.append(c)
                # A superseded (outdated) document is not "authoritative" for
                # the purpose of flagging another document.
                if other_src in ("official", "departmental") and (
                    other_ver is None or other_ver.currency_status != "outdated"
                ):
                    authoritative_contradictions += 1
        db.commit()

        # Forgery = manipulation language + an authoritative contradiction, OR
        # a suspicious informal forward that also makes a monetary claim from an
        # unverified source. A plain conflict is NOT forgery.
        forgery_signal = (
            (any(s["severity"] == "medium" for s in suspicious) and authoritative_contradictions >= 1)
            or (
                any(s["code"] == "informal_forward_language" for s in suspicious)
                and has_monetary
                and verification.source_type in ("user_submitted", "unknown")
                and len(counted_contradictions) >= 1
            )
        )

        freshness = _freshness(verification.source_published_date)

        # 4b. outdated / superseded detection (Feature 7).
        outdated_info = _detect_outdated(db, document, verification, claim_rows)
        verification.currency_status = "outdated" if outdated_info["is_outdated"] else "current"
        verification.superseded_by_document_id = outdated_info["superseded_by"]
        verification.superseded_reason = outdated_info["reason"]

        # 5. optional AI reliability read (never authoritative).
        ai_assessment = None if not use_ai else _gemini_json(
            _ASSESS_PROMPT.format(
                ocr_text=ocr_text[:6000],
                provenance=json.dumps(
                    {
                        "source_type": verification.source_type,
                        "reference_number": verification.source_reference_no,
                        "published_date": verification.source_published_date,
                        "department": document.department,
                        "uploaded_by": document.uploaded_by,
                    }
                ),
                claims=json.dumps([r.claim_text for r in claim_rows][:8]),
            )
        )
        if not isinstance(ai_assessment, dict):
            ai_assessment = None

        # 6. score + classify.
        signals = {
            "source_type": verification.source_type,
            "provenance_points": prov_points,
            "provenance_missing": prov_missing,
            "corroboration_count": total_corroboration,
            "contradiction_count": len(counted_contradictions),
            "authoritative_contradiction_count": authoritative_contradictions,
            "resolved_contradiction_count": len(contradiction_rows) - len(counted_contradictions),
            "suspicious_count": len(suspicious),
            "has_monetary_claim": has_monetary,
            "ai_confidence": document.ai_confidence,
            "freshness": freshness,
            "forgery_signal": forgery_signal,
            "outdated": outdated_info["is_outdated"],
        }
        status, score, band, reasons = _score_and_classify(signals=signals)
        if outdated_info["is_outdated"] and outdated_info["reason"]:
            reasons.append(outdated_info["reason"])

        if ai_assessment and isinstance(ai_assessment.get("possible_issues"), list):
            for issue in ai_assessment["possible_issues"][:4]:
                text = str(issue).strip()
                if text and text not in reasons:
                    reasons.append("AI note: " + text)

        # 7. per-claim status - a claim is only FLAGGED when the whole document
        # is; a claim that merely conflicts is NEEDS_REVIEW.
        for row in claim_rows:
            claim_conflicts = [c for c in contradiction_rows if c.claim_id == row.id]
            if claim_conflicts and status == "FLAGGED":
                row.status = "FLAGGED"
            elif claim_conflicts:
                row.status = "NEEDS_REVIEW"
            elif len(corroboration_map.get(row.id, [])) >= 2:
                row.status = "CORROBORATED"
            elif status in ("VERIFIED", "CORROBORATED"):
                row.status = "CORROBORATED"
            else:
                row.status = "NEEDS_REVIEW"

        # 8. persist verification.
        verification.verification_status = status
        verification.trust_score = score
        verification.trust_band = band
        verification.reasons = reasons
        verification.risk_factors = suspicious + (
            [{"code": "contradiction", "label": c.explanation, "severity": "high"} for c in contradiction_rows]
        )
        verification.evidence = {
            "corroborating": [item for sub in corroboration_map.values() for item in sub][:20],
            "contradicting": [
                {
                    "field": c.field,
                    "value_a": c.value_a,
                    "value_b": c.value_b,
                    "explanation": c.explanation,
                    "other_document_id": c.other_document_id,
                    "resolution": c.resolution,
                }
                for c in contradiction_rows
            ],
            "note": "Evidence is drawn from the GovDocs repository only - this layer does not crawl the public web.",
        }
        verification.signals = signals
        verification.ai_assessment = ai_assessment
        verification.analysis_method = "ai" if (ai_claims or ai_assessment) else "heuristic"
        verification.ai_confidence = document.ai_confidence
        verification.last_verified_at = _now()
        db.commit()

        effective = _effective_status(status, verification.currency_status)
        record_event(
            db, document_id, "system", "Verification Completed",
            f"{effective} (base {status}, trust {score}/100, {len(claim_rows)} claims, "
            f"{len(contradiction_rows)} contradiction(s), "
            f"currency={verification.currency_status}, method={verification.analysis_method})",
        )
        try:
            audit_service.log_action(
                db, user="system", action="Verification Completed", document_id=document_id,
                details=f"{effective} trust={score}",
            )
        except Exception:  # noqa: BLE001
            pass
        logger.info(f"verification done for document {document_id}: {effective} ({score})")
    except Exception as exc:  # noqa: BLE001
        logger.exception(f"verification failed for document {document_id}")
        try:
            row = _get_or_none(db, document_id)
            if row is not None:
                row.error = str(exc)[:1000]
                db.commit()
            record_event(db, document_id, "system", "Verification Failed", str(exc)[:300])
        except Exception:  # noqa: BLE001
            pass
    finally:
        db.close()


def _freshness(published: str | None) -> str | None:
    if not published:
        return None
    year_match = re.search(r"(19|20)\d{2}", published)
    if not year_match:
        return None
    year = int(year_match.group(0))
    now_year = _now().year
    if year > now_year + 1:
        return "old"  # future-dated -> suspicious, treat as penalty
    if now_year - year <= 2:
        return "fresh"
    if now_year - year >= 8:
        return "old"
    return None


# --------------------------------------------------------------------------- #
# human-in-the-loop review                                                    #
# --------------------------------------------------------------------------- #
def submit_for_review(db: Session, document: Document, actor: str) -> DocumentVerification:
    verification = get_or_create(db, document)
    verification.review_status = "pending_review"
    verification.submitted_by = actor
    verification.submitted_at = _now()
    db.commit()
    db.refresh(verification)
    record_event(db, document.id, actor, "Sent for Trust Review", None)
    try:
        audit_service.log_action(db, user=actor, action="Sent for Trust Review", document_id=document.id)
    except Exception:  # noqa: BLE001
        pass
    return verification


def apply_review_decision(
    db: Session, document: Document, reviewer: str, decision: str, reason: str | None
) -> DocumentVerification:
    if decision not in REVIEW_DECISIONS:
        raise ValueError("decision must be one of: " + ", ".join(REVIEW_DECISIONS))
    verification = get_or_create(db, document)
    verification.reviewer = reviewer
    verification.reviewer_decision = decision
    verification.reviewer_reason = reason
    verification.reviewed_at = _now()
    verification.review_status = "resolved"

    reasons = list(verification.reasons or [])
    if decision == "mark_outdated":
        # Currency only - the base classification (accuracy) is untouched.
        verification.currency_status = "outdated"
        if not verification.superseded_reason:
            verification.superseded_reason = reason or "Marked outdated by a government officer."
        human_line = "A government officer marked this document as outdated / superseded."
    else:
        verification.verification_status = REVIEW_DECISIONS[decision]
        human_line = f"Reviewed by a government officer: marked {REVIEW_DECISIONS[decision]}."
    verification.reasons = [human_line] + [r for r in reasons if r != human_line]

    db.commit()
    db.refresh(verification)
    outcome = "OUTDATED" if decision == "mark_outdated" else REVIEW_DECISIONS[decision]
    record_event(
        db, document.id, reviewer, "Trust Review Decision",
        f"{decision} -> {outcome}" + (f": {reason}" if reason else ""),
    )
    try:
        audit_service.log_action(
            db, user=reviewer, action="Trust Review Decision", document_id=document.id,
            details=f"{decision} ({outcome})",
        )
    except Exception:  # noqa: BLE001
        pass
    return verification


# --------------------------------------------------------------------------- #
# API payload builders                                                        #
# --------------------------------------------------------------------------- #
def _compact_row(row: DocumentVerification) -> dict:
    return {
        "status": _effective_status(row.verification_status, row.currency_status),
        "base_status": row.verification_status,
        "currency_status": row.currency_status,
        "superseded_by_document_id": row.superseded_by_document_id,
        "trust_score": row.trust_score,
        "trust_band": row.trust_band,
        "source_type": row.source_type,
        "source_type_label": SOURCE_TYPE_LABELS.get(row.source_type, "Unknown source"),
        "review_status": row.review_status,
        "last_verified_at": row.last_verified_at.isoformat() if row.last_verified_at else None,
    }


def compact(db: Session, document_id: int) -> dict | None:
    """Small block for search results / document lists - no heavy fields."""
    row = _get_or_none(db, document_id)
    return _compact_row(row) if row is not None else None


def compact_bulk(db: Session, document_ids: list[int]) -> dict[int, dict]:
    if not document_ids:
        return {}
    rows = (
        db.query(DocumentVerification)
        .filter(DocumentVerification.document_id.in_(document_ids))
        .all()
    )
    return {
        r.document_id: _compact_row(r)
        for r in rows
    }


def full_payload(db: Session, document: Document, *, include_reviewer: bool) -> dict:
    row = _get_or_none(db, document.id)
    claims = (
        db.query(DocumentClaim)
        .filter(DocumentClaim.document_id == document.id)
        .order_by(DocumentClaim.id.asc())
        .all()
    )
    contradictions = (
        db.query(ClaimContradiction)
        .filter(ClaimContradiction.document_id == document.id)
        .order_by(ClaimContradiction.id.asc())
        .all()
    )
    events = (
        db.query(VerificationEvent)
        .filter(VerificationEvent.document_id == document.id)
        .order_by(VerificationEvent.created_at.desc())
        .limit(50)
        .all()
    )

    provenance = {
        "uploader": document.uploaded_by or "Unknown",
        "upload_timestamp": document.upload_date.isoformat() if document.upload_date else None,
        "original_filename": document.original_filename or "Unknown",
        "file_sha256": document.file_sha256 or "Unknown",
        "issuing_department": document.department or "Unknown",
        "publication_date": (row.source_published_date if row else None) or "Unknown",
        "reference_number": (row.source_reference_no if row else None) or "Unknown",
        "source_url": (row.source_url if row else None) or "Unknown",
        "issuing_organization": (row.issuing_organization if row else None) or "Unknown",
        "document_type": (document.filetype or "Unknown"),
        "source_type": (row.source_type if row else "unknown"),
        "source_type_label": SOURCE_TYPE_LABELS.get(row.source_type if row else "unknown", "Unknown source"),
    }

    review = {
        "review_status": row.review_status if row else "not_submitted",
        "submitted_by": (row.submitted_by if row else None),
        "submitted_at": (row.submitted_at.isoformat() if row and row.submitted_at else None),
        "decision": (row.reviewer_decision if row else None),
        "decision_status": (
            "OUTDATED"
            if row and row.reviewer_decision == "mark_outdated"
            else (row.verification_status if row and row.reviewer_decision else None)
        ),
        "reviewed_at": (row.reviewed_at.isoformat() if row and row.reviewed_at else None),
    }
    if include_reviewer:
        review["reviewer"] = row.reviewer if row else None
        review["reviewer_reason"] = row.reviewer_reason if row else None

    base_status = row.verification_status if row else "UNVERIFIED"
    currency = row.currency_status if row else "current"
    superseded_by = row.superseded_by_document_id if row else None
    superseded_doc = db.get(Document, superseded_by) if superseded_by else None

    return {
        "document_id": document.id,
        "status": _effective_status(base_status, currency),
        "base_status": base_status,
        "currency_status": currency,
        "superseded_by": (
            {"document_id": superseded_by, "title": superseded_doc.title if superseded_doc else f"DOC-{superseded_by}"}
            if superseded_by
            else None
        ),
        "superseded_reason": (row.superseded_reason if row else None),
        "trust_score": row.trust_score if row else None,
        "trust_band": row.trust_band if row else None,
        "analysis_method": row.analysis_method if row else None,
        "ai_confidence": row.ai_confidence if row else document.ai_confidence,
        "last_verified_at": (row.last_verified_at.isoformat() if row and row.last_verified_at else None),
        "reasons": (row.reasons if row else []) or [],
        "risk_factors": (row.risk_factors if row else []) or [],
        "provenance": provenance,
        "claims": [
            {
                "id": c.id,
                "claim_text": c.claim_text,
                "claim_type": c.claim_type,
                "entities": c.entities or [],
                "dates": c.dates or [],
                "amounts": c.amounts or [],
                "percentages": c.percentages or [],
                "location": c.location,
                "scheme_name": c.scheme_name,
                "issuing_organization": c.issuing_organization,
                "reference_number": c.reference_number,
                "ai_confidence": c.ai_confidence,
                "status": c.status,
                "extraction_method": c.extraction_method,
            }
            for c in claims
        ],
        "evidence": (row.evidence if row else {}) or {},
        "contradictions": [
            {
                "id": c.id,
                "field": c.field,
                "value_a": c.value_a,
                "value_b": c.value_b,
                "explanation": c.explanation,
                "other_document_id": c.other_document_id,
                "resolution": c.resolution,
            }
            for c in contradictions
        ],
        "ai_assessment": (row.ai_assessment if row else None),
        "review": review,
        "events": [
            {
                "actor": e.actor,
                "action": e.action,
                "detail": e.detail,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ],
        "disclaimer": (
            "This is an evidence-based reliability assessment, not a determination of absolute "
            "truth. Items that cannot be confirmed remain marked as uncertain."
        ),
    }
