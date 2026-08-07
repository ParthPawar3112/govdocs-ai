"""
OCR service: extracts text from an uploaded document's file.

Engine is configurable via settings.OCR_ENGINE ("tesseract" | "easyocr"),
switchable with zero code changes. Both engine functions are lazy-imported
so the app runs fine even if only one engine's package is installed - which
is the default (see requirements.txt).

Responsibilities (per the module boundary): read the file, detect its type,
render PDF pages to images, run the configured engine, return the text.
Everything about *when* OCR runs (on upload vs. on retry) lives in the
router, not here - this module only knows how to turn a file into text.
"""
import io
import logging

from PIL import Image

from app.core.config import settings
from app.db.database import SessionLocal
from app.models.document import Document
from app.services import audit_service, ocr_status

logger = logging.getLogger("govdocs.ocr")

IMAGE_TYPES = {"jpg", "jpeg", "png"}
PDF_TYPES = {"pdf"}

# EasyOCR's Reader is expensive to construct (loads model weights), so it's
# built once and reused - never per-request.
_easyocr_reader = None


def _pdf_to_images(filepath: str) -> list[Image.Image]:
    """Renders every page of a PDF to a PIL Image via PyMuPDF - no external
    binary required (unlike poppler/pdf2image), which matters for a smooth
    Windows install."""
    import fitz  # PyMuPDF

    images: list[Image.Image] = []
    with fitz.open(filepath) as pdf:
        for page in pdf:
            pixmap = page.get_pixmap(dpi=200)
            images.append(Image.open(io.BytesIO(pixmap.tobytes("png"))))
    return images


def _run_tesseract(images: list[Image.Image]) -> str:
    import pytesseract

    if settings.TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

    pages = [pytesseract.image_to_string(image) for image in images]
    return "\n\n".join(page.strip() for page in pages if page.strip())


def _run_easyocr(images: list[Image.Image]) -> str:
    import numpy as np
    import easyocr

    global _easyocr_reader
    if _easyocr_reader is None:
        _easyocr_reader = easyocr.Reader(["en"])

    pages = []
    for image in images:
        lines = _easyocr_reader.readtext(np.array(image), detail=0, paragraph=True)
        pages.append("\n".join(lines))
    return "\n\n".join(page.strip() for page in pages if page.strip())


def _run_configured_engine(images: list[Image.Image]) -> str:
    if settings.OCR_ENGINE == "easyocr":
        try:
            return _run_easyocr(images)
        except ImportError:
            logger.warning(
                "OCR_ENGINE=easyocr but the easyocr package isn't installed - "
                "falling back to Tesseract for this request. Run "
                "`pip install easyocr` to use EasyOCR, or set OCR_ENGINE=tesseract "
                "in .env to silence this warning."
            )
            return _run_tesseract(images)
    return _run_tesseract(images)


def extract_text(filepath: str, filetype: str) -> str:
    """Reads the file at `filepath`, detects handling by `filetype`, and
    returns extracted text. Raises on unsupported types or read failures -
    callers are responsible for catching and recording failure state."""
    filetype = filetype.lower()

    if filetype in IMAGE_TYPES:
        images = [Image.open(filepath)]
    elif filetype in PDF_TYPES:
        images = _pdf_to_images(filepath)
    else:
        raise ValueError(f"OCR does not support file type: {filetype}")

    return _run_configured_engine(images)


def process_document_ocr(document_id: int) -> None:
    """
    Entry point for the automatic, post-upload OCR run. Designed to be
    handed to FastAPI's BackgroundTasks, so it owns its own DB session
    rather than reusing the request's (which is closed by the time a
    background task executes).

    On success, immediately chains into AI metadata extraction (Phase 6),
    per that phase's trigger condition ("begins immediately after OCR
    completes successfully"). Called as a plain function, not scheduled as
    a *new* BackgroundTask - we're already executing inside a background
    worker thread here, so the HTTP request/response was never at risk of
    blocking either way; this just continues that same background work.
    """
    db = SessionLocal()
    try:
        document = db.get(Document, document_id)
        if document is None:
            return

        audit_service.log_action(db, user=document.uploaded_by, action="OCR Started", document_id=document_id)

        text = extract_text(document.filepath, document.filetype)
        document.ocr_text = text
        document.ocr_error = None
        db.commit()
        ocr_status.mark_done(document_id)
        logger.info(f"OCR completed for document {document_id} ({len(text)} chars)")
        audit_service.log_action(
            db, user=document.uploaded_by, action="OCR Completed", document_id=document_id,
            details=f"{len(text)} characters extracted",
        )
    except Exception as exc:
        logger.exception(f"OCR failed for document {document_id}")
        ocr_status.mark_failed(document_id)
        document = db.get(Document, document_id)
        if document is not None:
            document.ocr_error = str(exc)[:1000]
            db.commit()
            audit_service.log_action(
                db, user=document.uploaded_by, action="OCR Failed", document_id=document_id,
                details=str(exc)[:500],
            )
        return
    finally:
        db.close()

    # Deliberately outside the try/except/finally above: an AI failure must
    # never be mislabeled as an OCR failure, and OCR's own DB session is
    # already closed by this point - process_document_ai opens its own.
    from app.services.ai_service import process_document_ai

    process_document_ai(document_id)
