"""
Document Trust & Verification endpoints ("The Bad Reading" challenge).

Follows the existing conventions: /api/... prefix, `get_current_user` for
document-scoped reads (with the same Citizen-ownership rule as the documents
router), `require_staff` for reviewer actions. Reviewer identity is only
included for staff callers.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user, require_admin, require_staff
from app.models.audit_log import AuditLog
from app.models.document import Document
from app.models.user import User
from app.models.verification import (
    ClaimContradiction,
    DocumentClaim,
    DocumentVerification,
    VerificationEvent,
)
from app.schemas.verification import ReviewDecisionRequest
from app.services import file_storage, verification_service

router = APIRouter(prefix="/api/verification", tags=["verification"])

# --------------------------------------------------------------------------- #
# Demo scenario ("The Bad Reading") - five documents about ONE scheme         #
# (PM-KISAN Farmer Support Scheme) that together exercise every path:         #
#   A  current official circular ...................... VERIFIED              #
#   B  WhatsApp forward, contradicts A + suspicious ... FLAGGED               #
#   C  older circular, past deadline, superseded by A . OUTDATED              #
#   D  district notice with a different amount ........ NEEDS_REVIEW / conflict#
#   E  scanned notice with no provenance at all ....... NEEDS_REVIEW          #
# --------------------------------------------------------------------------- #
_DEMO_TAG = "[BadReading Demo]"

_DEMO_DOCS = [
    {
        "text": (
            "DEPARTMENT OF AGRICULTURE AND FARMERS WELFARE\n"
            "Circular No. PMK/2024/CIRC/118      Dated: 01 June 2024\n\n"
            "Subject: PM-KISAN Farmer Support Scheme - revised instalment guidance.\n\n"
            "It is hereby notified that under the PM-KISAN Farmer Support Scheme, eligible "
            "land-holding farmer families shall receive Rs 6,000 per year, released in three "
            "equal instalments of Rs 2,000 through Direct Benefit Transfer.\n"
            "Eligibility is subject to Aadhaar seeding and land-record verification by the "
            "concerned Tehsildar. This circular supersedes earlier instalment guidance and "
            "applications remain open through the year.\n\n"
            "(Signed) Under Secretary, Department of Agriculture and Farmers Welfare"
        ),
        "title": f"{_DEMO_TAG} PM-KISAN Farmer Support - Department Circular (2024)",
        "department": "Agriculture",
        "ai_title": "PM-KISAN Farmer Support Scheme - 2024 Instalment Circular",
        "ai_summary": (
            "Official 2024 circular from the Department of Agriculture setting the PM-KISAN "
            "Farmer Support Scheme benefit at Rs 6,000 per year in three instalments."
        ),
        "ai_category": "Circular",
        "ai_confidence": 88.0,
        "source": {
            "source_type": "official",
            "source_reference_no": "PMK/2024/CIRC/118",
            "source_published_date": "2024-06-01",
            "issuing_organization": "Department of Agriculture and Farmers Welfare",
        },
    },
    {
        "text": (
            "*Forwarded as received* - please share widely before it is deleted!!\n\n"
            "BREAKING GOVT ALERT: The PM-KISAN Farmer Support Scheme now gives Rs 50,000 "
            "one-time to EVERY farmer, no conditions. The old Rs 6,000 scheme is being "
            "scrapped and was fraudulent all along.\n"
            "Register now to get the amount - limited period only. Click here to claim. "
            "100% guaranteed. Act now, this offer will be withdrawn immediately.\n"
            "Forwarded message. WhatsApp. Share this with all farmer groups."
        ),
        "title": f"{_DEMO_TAG} Forwarded WhatsApp - PM-KISAN scheme update",
        "department": "Agriculture",
        "ai_title": "Forwarded message about PM-KISAN payments",
        "ai_summary": (
            "An unattributed forwarded message claiming the PM-KISAN Farmer Support Scheme now "
            "pays Rs 50,000 one-time to every farmer and that the earlier scheme was fraudulent."
        ),
        "ai_category": "Forwarded message",
        "ai_confidence": 41.0,
        "source": {"source_type": "user_submitted"},
    },
    {
        "text": (
            "DEPARTMENT OF AGRICULTURE AND FARMERS WELFARE\n"
            "Circular No. PMK/2022/CIRC/091      Dated: 15 February 2022\n\n"
            "Subject: PM-KISAN Farmer Support Scheme - instalment guidance for 2022-23.\n\n"
            "Under the PM-KISAN Farmer Support Scheme, eligible farmer families shall receive "
            "Rs 6,000 per year in three instalments. Fresh applications for this cycle must be "
            "submitted to the Tehsildar. The last date to apply is 31 March 2023.\n\n"
            "(Signed) Under Secretary, Department of Agriculture and Farmers Welfare"
        ),
        "title": f"{_DEMO_TAG} PM-KISAN Farmer Support - Circular (2022, older)",
        "department": "Agriculture",
        "ai_title": "PM-KISAN Farmer Support Scheme - 2022 Circular",
        "ai_summary": (
            "Older 2022 departmental circular for the PM-KISAN Farmer Support Scheme with an "
            "application deadline of 31 March 2023."
        ),
        "ai_category": "Circular",
        "ai_confidence": 82.0,
        "source": {
            "source_type": "departmental",
            "source_reference_no": "PMK/2022/CIRC/091",
            "source_published_date": "2022-02-15",
            "issuing_organization": "Department of Agriculture and Farmers Welfare",
        },
    },
    {
        "text": (
            "OFFICE OF THE DISTRICT COLLECTOR\n"
            "Public Notice - PM-KISAN Farmer Support Scheme\n\n"
            "Farmers in this district enrolled under the PM-KISAN Farmer Support Scheme will "
            "receive Rs 8,000 per year as enhanced assistance. Beneficiaries should update their "
            "bank details at the nearest Common Service Centre.\n"
            "No reference number was printed on this notice.\n"
        ),
        "title": f"{_DEMO_TAG} District notice - enhanced PM-KISAN amount",
        "department": "Agriculture",
        "ai_title": "District public notice - PM-KISAN enhanced amount",
        "ai_summary": (
            "A district-level public notice stating farmers under the PM-KISAN Farmer Support "
            "Scheme will receive Rs 8,000 per year - more than the departmental circular states."
        ),
        "ai_category": "Public notice",
        "ai_confidence": 58.0,
        "source": {
            "source_type": "trusted_external",
            "source_published_date": "2024-09-10",
            "issuing_organization": "Office of the District Collector",
        },
    },
    {
        "text": (
            "NOTICE\n\n"
            "Benefits under the PM-KISAN Farmer Support Scheme have been increased to "
            "Rs 12,000 per year with immediate effect. All farmers are eligible.\n"
            "For details contact your local representative.\n"
        ),
        "title": f"{_DEMO_TAG} Unsigned scan - PM-KISAN benefit increase",
        "department": "Agriculture",
        "ai_title": "Unsigned notice claiming a PM-KISAN benefit increase",
        "ai_summary": (
            "An unsigned, undated scanned notice with no issuing office or reference number, "
            "claiming PM-KISAN Farmer Support Scheme benefits have risen to Rs 12,000 per year."
        ),
        "ai_category": "Unverified notice",
        "ai_confidence": 44.0,
        "source": {"source_type": "unknown"},
    },
    {
        "text": (
            "STATE DEPARTMENT OF AGRICULTURE - PRESS RELEASE\n"
            "Ref: SDA/PR/2024/047      Dated: 20 June 2024\n\n"
            "The State Department of Agriculture confirms that under the PM-KISAN Farmer "
            "Support Scheme, eligible land-holding farmer families continue to receive "
            "Rs 6,000 per year in three instalments of Rs 2,000, credited by Direct Benefit "
            "Transfer after Aadhaar seeding and land-record verification.\n"
        ),
        "title": f"{_DEMO_TAG} State Agriculture Dept - PM-KISAN press release",
        "department": "Agriculture",
        "ai_title": "State Agriculture Department press release - PM-KISAN",
        "ai_summary": (
            "A State Department of Agriculture press release independently confirming the "
            "PM-KISAN Farmer Support Scheme benefit of Rs 6,000 per year in three instalments."
        ),
        "ai_category": "Press release",
        "ai_confidence": 84.0,
        "source": {
            "source_type": "trusted_external",
            "source_reference_no": "SDA/PR/2024/047",
            "source_published_date": "2024-06-20",
            "issuing_organization": "State Department of Agriculture",
        },
    },
]


def _render_text_png(text: str) -> bytes:
    """Render plain text to a PNG so the demo documents are real files with a
    real preview (Pillow is already a dependency - used by OCR)."""
    from PIL import Image, ImageDraw

    lines: list[str] = []
    for paragraph in text.split("\n"):
        while len(paragraph) > 92:
            cut = paragraph.rfind(" ", 0, 92)
            cut = cut if cut > 0 else 92
            lines.append(paragraph[:cut])
            paragraph = paragraph[cut:].lstrip()
        lines.append(paragraph)
    width, line_h, pad = 760, 22, 40
    height = pad * 2 + line_h * max(len(lines), 1)
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    for i, line in enumerate(lines):
        draw.text((pad, pad + i * line_h), line, fill=(15, 23, 42))
    import io

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


@router.post("/demo/seed")
def demo_seed(current_user: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    """DEMO ONLY - create the two 'Bad Reading' scenario documents and run the
    trust assessment on them. Idempotent-ish: call /demo/reset first to redo."""
    created: list[dict] = []
    for spec in _DEMO_DOCS:
        content = _render_text_png(spec["text"])
        stored_filename, filepath = file_storage.save_file(content, "png")
        document = Document(
            title=spec["title"],
            department=spec["department"],
            description="Demo document for the Bad Reading challenge.",
            original_filename=spec["title"].replace(_DEMO_TAG, "").strip().replace(" ", "_") + ".png",
            filename=stored_filename,
            filepath=filepath,
            filesize=len(content),
            filetype="png",
            uploaded_by=current_user.username,
            status="Pending",
            ai_output_language="english",
            file_sha256=verification_service.sha256_of(content),
            ocr_text=spec["text"],
            ai_title=spec["ai_title"],
            ai_summary=spec["ai_summary"],
            ai_department=spec["department"],
            ai_category=spec["ai_category"],
            ai_keywords=["PM-KISAN", "farmer", "scheme", "instalment"],
            ai_confidence=spec["ai_confidence"],
            ai_processed=True,
        )
        db.add(document)
        db.commit()
        db.refresh(document)

        source = dict(spec["source"])
        resolved_type = verification_service.resolve_source_type(
            db, document, source.pop("source_type", None)
        )
        verification_service.get_or_create(db, document, source_type=resolved_type, **source)
        created.append({"document_id": document.id, "title": document.title})

    # Assess in order so the circular exists before the forward is compared to
    # it. use_ai=False keeps the seeder fast + deterministic for a live demo -
    # the heuristic path already produces the intended VERIFIED / FLAGGED split.
    results = []
    for item in created:
        verification_service.process_document_verification(item["document_id"], use_ai=False)
        payload = verification_service.compact(db, item["document_id"])
        results.append({**item, **(payload or {})})

    return {"ok": True, "seeded": results, "note": "Open Trust & Verification on each document."}


@router.post("/demo/reset")
def demo_reset(current_user: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    docs = db.query(Document).filter(Document.title.like(f"%{_DEMO_TAG}%")).all()
    ids = [d.id for d in docs]
    for document in docs:
        try:
            file_storage.delete_file(document.filepath)
        except Exception:  # noqa: BLE001
            pass
        db.query(ClaimContradiction).filter(ClaimContradiction.document_id == document.id).delete()
        db.query(DocumentClaim).filter(DocumentClaim.document_id == document.id).delete()
        db.query(VerificationEvent).filter(VerificationEvent.document_id == document.id).delete()
        db.query(DocumentVerification).filter(DocumentVerification.document_id == document.id).delete()
        db.query(AuditLog).filter(AuditLog.document_id == document.id).delete()
        db.delete(document)
    db.commit()
    return {"ok": True, "removed_document_ids": ids}


def _load_document(document_id: int, user: User, db: Session) -> Document:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    # Same rule as the documents router: a Citizen only reaches their own uploads.
    if user.role == "Citizen" and document.uploaded_by != user.username:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.get("/review-queue")
def review_queue(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Documents that need a human trust decision: explicitly sent for review,
    auto-classified NEEDS_REVIEW / FLAGGED, or auto-detected as OUTDATED -
    and not yet resolved."""
    rows = (
        db.query(DocumentVerification)
        .filter(
            or_(
                DocumentVerification.review_status == "pending_review",
                DocumentVerification.verification_status.in_(("NEEDS_REVIEW", "FLAGGED")),
                DocumentVerification.currency_status == "outdated",
            )
        )
        .all()
    )
    out: list[dict] = []
    for row in rows:
        if row.review_status == "resolved":
            continue
        document = db.get(Document, row.document_id)
        if document is None:
            continue
        effective = verification_service._effective_status(  # noqa: SLF001 - internal helper
            row.verification_status, row.currency_status
        )
        out.append(
            {
                "document_id": document.id,
                "title": document.title,
                "department": document.department,
                "uploaded_by": document.uploaded_by,
                "upload_date": document.upload_date.isoformat() if document.upload_date else None,
                "status": effective,
                "base_status": row.verification_status,
                "currency_status": row.currency_status,
                "trust_score": row.trust_score,
                "trust_band": row.trust_band,
                "source_type": row.source_type,
                "review_status": row.review_status,
                "last_verified_at": row.last_verified_at.isoformat() if row.last_verified_at else None,
            }
        )
    _order = {"FLAGGED": 0, "NEEDS_REVIEW": 1, "OUTDATED": 2}
    out.sort(key=lambda item: (_order.get(item["status"], 3), item["upload_date"] or ""))
    return out


@router.get("/{document_id}")
def get_verification(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    document = _load_document(document_id, current_user, db)
    include_reviewer = current_user.role in ("Admin", "Officer")
    return verification_service.full_payload(db, document, include_reviewer=include_reviewer)


@router.get("/{document_id}/claims")
def get_claims(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    document = _load_document(document_id, current_user, db)
    return verification_service.full_payload(db, document, include_reviewer=False)["claims"]


@router.get("/{document_id}/contradictions")
def get_contradictions(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    document = _load_document(document_id, current_user, db)
    return verification_service.full_payload(db, document, include_reviewer=False)["contradictions"]


@router.post("/{document_id}/analyze")
def analyze(
    document_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
) -> dict:
    """(Re)run the trust assessment. Staff-only - used from the Verification
    panel's 'Re-run analysis' and by the demo seeder."""
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    background_tasks.add_task(verification_service.process_document_verification, document_id)
    return {"ok": True, "message": "Trust analysis scheduled.", "document_id": document_id}


@router.post("/{document_id}/submit-review")
def submit_review(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Send a document into the human trust-review queue. The uploader (incl.
    a Citizen, for their own document) or any staff member may do this."""
    document = _load_document(document_id, current_user, db)
    verification_service.submit_for_review(db, document, actor=current_user.username)
    return verification_service.full_payload(
        db, document, include_reviewer=current_user.role in ("Admin", "Officer")
    )


@router.post("/{document_id}/review-decision")
def review_decision(
    document_id: int,
    payload: ReviewDecisionRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
) -> dict:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    try:
        verification_service.apply_review_decision(
            db, document, reviewer=current_user.username,
            decision=payload.decision.strip().lower(), reason=payload.reason,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return verification_service.full_payload(db, document, include_reviewer=True)


@router.get("/{document_id}/history")
def get_history(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    document = _load_document(document_id, current_user, db)
    return verification_service.full_payload(db, document, include_reviewer=False)["events"]
