"""
AI Metadata Extraction service (Phase 6).

Responsible ONLY for turning OCR text into structured metadata via Gemini -
it doesn't know about OCR, file storage, or HTTP. Orchestration (when this
runs) lives in ocr_service.py, which calls process_document_ai() once OCR
succeeds, and in the router, which schedules it as a FastAPI BackgroundTask
for the manual retry endpoint.

Design notes:
- response_mime_type="application/json" asks Gemini's API itself to
  constrain output to valid JSON (not just prompt instructions asking
  nicely) - this is the modern, more reliable way to get "JSON only".
- A markdown-fence strip is kept anyway as a defensive fallback.
- Retries (MAX_ATTEMPTS) cover transient failures: network blips, rate
  limits, or an occasional malformed response. A manual retry is also
  exposed via the API for persistent failures.
"""
import json
import logging
import time

from app.core.config import settings
from app.db.database import SessionLocal
from app.models.document import Document
from app.services import ai_status

logger = logging.getLogger("govdocs.ai")

MAX_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 2

PROMPT_TEMPLATE = """You are analyzing a scanned government document. Below is the OCR-extracted text from it.

OCR TEXT:
{ocr_text}

Analyze this OCR text.
Return ONLY JSON.
{{
"title": "",
"summary": "",
"department": "",
"category": "",
"keywords": [],
"confidence": 0
}}

Field guidance:
- title: a short, human-readable title for this document (max ~10 words)
- summary: 2-3 sentence plain-language summary of what this document is and contains
- department: your best guess at the issuing/relevant government department
- category: a short document category label (e.g. "Certificate", "Land Record", "ID Proof")
- keywords: 3-8 relevant keywords or short phrases from the document
- confidence: your confidence in this analysis, as an integer from 0 to 100

Rules:
- No markdown
- No explanations
- JSON only
"""

REQUIRED_KEYS = ("title", "summary", "department", "category", "keywords", "confidence")


class AIServiceError(Exception):
    """Raised for any failure in the Gemini call, parsing, or validation -
    callers only need to catch this one type."""


class AIConfigurationError(AIServiceError):
    """A permanent setup problem (missing API key, missing package) - never
    worth retrying, unlike a transient network/parsing failure."""


def _call_gemini(ocr_text: str) -> str:
    if not settings.GEMINI_API_KEY:
        raise AIConfigurationError(
            "GEMINI_API_KEY is not configured. Add it to your .env file - "
            "see README for how to get a key."
        )

    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise AIConfigurationError(
            "The google-genai package isn't installed. Run "
            "`pip install google-genai`."
        ) from exc

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    prompt = PROMPT_TEMPLATE.format(ocr_text=ocr_text[:12000])  # keep prompts bounded

    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
    except Exception as exc:  # Gemini SDK errors, network errors, etc.
        raise AIServiceError(f"Gemini API call failed: {exc}") from exc

    if not response.text:
        raise AIServiceError("Gemini returned an empty response")

    return response.text


def _strip_markdown_fence(text: str) -> str:
    """Defensive cleanup in case the model wraps output in ```json ... ```
    despite response_mime_type=json - costs nothing when it's not needed."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        cleaned = cleaned.removeprefix("json").strip()
    return cleaned


def _parse_and_validate(raw_text: str) -> dict:
    cleaned = _strip_markdown_fence(raw_text)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise AIServiceError(f"Gemini response was not valid JSON: {exc}") from exc

    if not isinstance(data, dict):
        raise AIServiceError("Gemini response JSON was not an object")

    missing = [key for key in REQUIRED_KEYS if key not in data]
    if missing:
        raise AIServiceError(f"Gemini response missing required keys: {missing}")

    title = str(data["title"]).strip()
    if not title:
        raise AIServiceError("Gemini response had an empty title")

    keywords = data["keywords"]
    if not isinstance(keywords, list):
        raise AIServiceError("'keywords' must be a JSON array")
    keywords = [str(k).strip() for k in keywords if str(k).strip()]

    try:
        confidence = float(data["confidence"])
    except (TypeError, ValueError) as exc:
        raise AIServiceError("'confidence' must be a number") from exc
    confidence = max(0.0, min(100.0, confidence))  # clamp defensively

    return {
        "ai_title": title[:255],
        "ai_summary": str(data["summary"]).strip(),
        "ai_department": str(data["department"]).strip()[:100],
        "ai_category": str(data["category"]).strip()[:100],
        "ai_keywords": keywords,
        "ai_confidence": confidence,
    }


def extract_metadata(ocr_text: str) -> dict:
    """Single attempt: call Gemini, parse, validate. Raises AIServiceError
    on any failure - retry policy lives in process_document_ai, not here,
    so this function stays simple and independently testable/mockable."""
    raw_text = _call_gemini(ocr_text)
    return _parse_and_validate(raw_text)


def process_document_ai(document_id: int) -> None:
    """
    Entry point for AI metadata extraction. Designed to be handed to
    FastAPI's BackgroundTasks (or called directly from within an already-
    background OCR task - see ocr_service.py), so it owns its own DB
    session rather than reusing a request's.
    """
    logger.info(f"AI metadata extraction starting for document {document_id}")
    ai_status.mark_processing(document_id)

    db = SessionLocal()
    try:
        document = db.get(Document, document_id)
        if document is None:
            logger.warning(f"AI metadata extraction skipped - document {document_id} not found")
            return
        if not document.ocr_text:
            logger.warning(
                f"AI metadata extraction skipped for document {document_id} - no OCR text available"
            )
            return

        last_error: Exception | None = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                metadata = extract_metadata(document.ocr_text)
                for field, value in metadata.items():
                    setattr(document, field, value)
                document.ai_processed = True
                document.ai_error = None
                db.commit()
                logger.info(
                    f"AI metadata extraction completed for document {document_id} "
                    f"(attempt {attempt}/{MAX_ATTEMPTS}, confidence={metadata['ai_confidence']})"
                )
                return
            except AIConfigurationError as exc:
                # Not worth retrying - a missing API key won't fix itself
                # in the next 2 seconds. Fail immediately and clearly.
                last_error = exc
                logger.warning(f"AI metadata extraction misconfigured for document {document_id}: {exc}")
                break
            except Exception as exc:  # noqa: BLE001 - genuinely want to retry on anything else
                last_error = exc
                logger.warning(
                    f"AI metadata extraction attempt {attempt}/{MAX_ATTEMPTS} "
                    f"failed for document {document_id}: {exc}"
                )
                if attempt < MAX_ATTEMPTS:
                    time.sleep(RETRY_BACKOFF_SECONDS * attempt)

        # All attempts exhausted.
        logger.exception(
            f"AI metadata extraction failed permanently for document {document_id}",
            exc_info=last_error,
        )
        document.ai_error = str(last_error)[:1000]
        document.ai_processed = False
        db.commit()
    finally:
        ai_status.clear_processing(document_id)
        db.close()
