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
import os

from PIL import Image

from app.core.config import settings
from app.db.database import SessionLocal
from app.models.document import Document
from app.services import ocr_status

logger = logging.getLogger("govdocs.ocr")

IMAGE_TYPES = {"jpg", "jpeg", "png"}
PDF_TYPES = {"pdf"}

# EasyOCR's Reader is expensive to construct (loads model weights), so it's
# built once and reused - never per-request.
_easyocr_reader = None


def _pdf_to_images(filepath: str) -> list[Image.Image]:
    """
    Renders every page of a PDF to a PIL Image via PyMuPDF.
    No external Poppler dependency required.
    """
    import fitz  # PyMuPDF

    images: list[Image.Image] = []

    with fitz.open(filepath) as pdf:
        for page in pdf:
            pixmap = page.get_pixmap(dpi=200)
            images.append(Image.open(io.BytesIO(pixmap.tobytes("png"))))

    return images


def _run_tesseract(images: list[Image.Image]) -> str:
    import pytesseract

    # 1. Use path from .env if provided
    if getattr(settings, "TESSERACT_CMD", None):
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

    else:
        # 2. Try common Windows install locations
        possible_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]

        for path in possible_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                break

    # 3. Verify executable exists
    if not os.path.exists(pytesseract.pytesseract.tesseract_cmd):
        raise RuntimeError(
            "Tesseract OCR executable not found. "
            "Install Tesseract OCR or configure TESSERACT_CMD in .env."
        )

    pages = []

    for image in images:
        text = pytesseract.image_to_string(image)
        if text.strip():
            pages.append(text.strip())

    return "\n\n".join(pages)


def _run_easyocr(images: list[Image.Image]) -> str:
    import numpy as np
    import easyocr

    global _easyocr_reader

    if _easyocr_reader is None:
        _easyocr_reader = easyocr.Reader(["en"])

    pages = []

    for image in images:
        lines = _easyocr_reader.readtext(
            np.array(image),
            detail=0,
            paragraph=True,
        )
        pages.append("\n".join(lines))

    return "\n\n".join(page.strip() for page in pages if page.strip())


def _run_configured_engine(images: list[Image.Image]) -> str:
    if settings.OCR_ENGINE == "easyocr":
        try:
            return _run_easyocr(images)

        except ImportError:
            logger.warning(
                "EasyOCR is not installed. Falling back to Tesseract."
            )
            return _run_tesseract(images)

    return _run_tesseract(images)


def extract_text(filepath: str, filetype: str) -> str:
    """
    Reads the file and extracts text.
    """

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
    Background task entry point.
    """

    db = SessionLocal()

    try:
        document = db.get(Document, document_id)

        if document is None:
            return

        text = extract_text(
            document.filepath,
            document.filetype,
        )

        document.ocr_text = text

        db.commit()

        ocr_status.mark_done(document_id)

        logger.info(
            f"OCR completed for document {document_id} ({len(text)} chars)"
        )

    except Exception:
        logger.exception(f"OCR failed for document {document_id}")
        ocr_status.mark_failed(document_id)

    finally:
        db.close()