"""
Fast "is this actually a document?" gate, run SYNCHRONOUSLY at upload time.

Government offices should not have selfies, landscapes, memes or random
screenshots sitting in the review queue. This rejects a non-document image
BEFORE a Document row is created - the upload returns 422 immediately and
nothing enters OCR / AI / review.

Deliberately lightweight and dependency-free: one downscaled OCR probe plus
a handful of Pillow pixel statistics. Pillow, pytesseract and PyMuPDF are
already used by ocr_service.py.

Fail-open: any *unexpected* error here lets the upload through (better a
rare false accept than a bug blocking every upload). Only an explicit
NotADocumentError blocks.
"""
from __future__ import annotations

import io
import logging
import os
import re

from PIL import Image, ImageOps

from app.core.config import settings

logger = logging.getLogger("govdocs.doccheck")

_OCR_MAX_SIDE = 700          # downscale before the OCR probe, for speed
_OCR_TIMEOUT_S = 5          # never let a pathological image hang tesseract
_MIN_TEXT_CHARS = 22          # OCR alphanumerics -> "clearly a document"
_MIN_TEXT_WORDS = 5           # OCR word-like tokens -> "clearly a document"
_SOME_TEXT_CHARS = 8
_SOME_TEXT_WORDS = 2
# Latin + Devanagari (Marathi/Hindi) word tokens.
_WORD_RE = re.compile(r"[A-Za-zऀ-ॿ]{2,}")


class NotADocumentError(Exception):
    """The uploaded file does not look like a real document - reject the upload."""

    def __init__(self, reason: str, signals: dict | None = None) -> None:
        super().__init__(reason)
        self.reason = reason
        self.signals = signals or {}


# --------------------------------------------------------------------------- #
# image helpers                                                               #
# --------------------------------------------------------------------------- #
def _open_image(content: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(content))
    image.load()
    return image


def _downscaled_rgb(image: Image.Image, max_side: int) -> Image.Image:
    width, height = image.size
    scale = max_side / max(width, height)
    if scale < 1:
        image = image.resize((max(1, int(width * scale)), max(1, int(height * scale))))
    return image.convert("RGB")


def _trim_dark_border(image_rgb: Image.Image) -> Image.Image:
    """Scanner beds and phone-camera framing leave a thick near-black border
    around the actual document. Crop to the bounding box of the non-dark
    content so the appearance stats and OCR see the document, not the frame.
    Only crops when a real document-sized region remains."""
    try:
        grey = ImageOps.grayscale(image_rgb)
        content = grey.point(lambda p: 255 if p > 55 else 0)
        bbox = content.getbbox()
        if not bbox:
            return image_rgb
        x0, y0, x1, y1 = bbox
        w, h = image_rgb.size
        if (x1 - x0) >= 0.35 * w and (y1 - y0) >= 0.35 * h and (x1 - x0) * (y1 - y0) < 0.98 * w * h:
            return image_rgb.crop(bbox)
    except Exception:  # noqa: BLE001
        pass
    return image_rgb


def _appearance_signals(image_rgb: Image.Image) -> dict:
    """Cheap colour/brightness stats on a 160x160 thumbnail.

    A scanned/photographed document is mostly a light (even if cream/grey)
    background with some dark ink. A photo is colourful and saturated."""
    thumb = image_rgb.resize((160, 160))
    pixels = list(thumb.getdata())
    total = len(pixels) or 1
    bright = dark = 0
    saturation_sum = 0.0
    for r, g, b in pixels:
        hi, lo = max(r, g, b), min(r, g, b)
        # "light background" - pale/cream/off-white/light-grey all count.
        if hi >= 170 and (hi - lo) <= 60:
            bright += 1
        if hi <= 110:
            dark += 1
        saturation_sum += 0.0 if hi == 0 else (hi - lo) / hi
    return {
        "bright_frac": round(bright / total, 3),        # light background
        "dark_frac": round(dark / total, 3),            # ink / text present
        "mean_saturation": round(saturation_sum / total, 3),  # low for docs
    }


def _has_ink_on_page(sig: dict) -> bool:
    """A page: a light-ish background with a visible dark ink/text pattern -
    what separates a blurry document from a blank wall or a plain-background
    portrait."""
    return (
        sig["bright_frac"] >= 0.25
        and sig["mean_saturation"] <= 0.28
        and sig["dark_frac"] >= 0.004
    )


def _paper_like(sig: dict) -> bool:
    """Plausibly a page - a mostly-light background, or an ink-on-page pattern.
    Used to accept a document even when OCR can't read it (blur, low light)."""
    return sig["bright_frac"] >= 0.35 or _has_ink_on_page(sig)


def _clearly_a_photo(sig: dict) -> bool:
    """Reject WITHOUT running OCR (pure-noise images can hang tesseract):
      - colourful  -> a photo / screenshot, or random RGB noise; and
      - almost no light background -> a grey mush (downscaled noise), a very
        dark photo, or a black frame.
    Computed AFTER trimming any dark border, so a real bordered scan / cream
    ID card / tinted photocopy still has a high bright_frac and passes."""
    return sig["mean_saturation"] >= 0.34 or sig["bright_frac"] < 0.08


def _looks_like_real_text(text: str) -> bool:
    """Distinguish genuine OCR'd document text from tesseract hallucinating on
    a photo/noise: real prose has many 4+ letter words; OCR-of-junk is mostly
    2-3 character fragments ('ee', 'oe', 'Uo', 'hh', ...)."""
    words = _WORD_RE.findall(text)
    if len(words) < 6:
        return False
    longish = [w for w in words if len(w) >= 4]
    if len(longish) < 5:
        return False
    return (len(longish) / len(words)) >= 0.30


# --------------------------------------------------------------------------- #
# OCR probe                                                                   #
# --------------------------------------------------------------------------- #
def _ocr_probe(image_rgb: Image.Image) -> tuple[int, int, str]:
    """Returns (alphanumeric_char_count, word_count, raw_text).
    (-1, -1, "") if OCR is unavailable; (0, 0, "") on timeout / no text."""
    try:
        import pytesseract

        if settings.TESSERACT_CMD:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        if settings.TESSDATA_PREFIX:
            os.environ["TESSDATA_PREFIX"] = settings.TESSDATA_PREFIX
    except Exception:  # noqa: BLE001 - pytesseract not importable
        logger.exception("document-check OCR probe unavailable")
        return -1, -1, ""

    grey = image_rgb.convert("L")
    # "eng" first: fast and enough to answer "is there text here". Fall back to
    # the full configured set (e.g. eng+mar) only if eng yields nothing - the
    # real downstream OCR still runs the full set on the stored file.
    langs = ["eng"]
    configured = settings.OCR_LANGUAGE or "eng"
    if configured != "eng":
        langs.append(configured)
    best = (-1, -1, "")
    for lang in langs:
        try:
            text = pytesseract.image_to_string(
                grey, lang=lang, config="--psm 6", timeout=_OCR_TIMEOUT_S
            )
            alnum = sum(ch.isalnum() for ch in text)
            words = len(_WORD_RE.findall(text))
            if alnum >= 12:                         # got real text - done
                return alnum, words, text
            best = (max(best[0], alnum), max(best[1], words), text or best[2])
        except RuntimeError:  # pytesseract timeout
            logger.warning("document-check OCR probe timed out (%ss)", _OCR_TIMEOUT_S)
            return -1, -1, ""
        except Exception:  # noqa: BLE001 - bad lang / traineddata: try next
            continue
    return best


# --------------------------------------------------------------------------- #
# public entry points                                                        #
# --------------------------------------------------------------------------- #
def _check_pdf(content: bytes) -> None:
    """A PDF is almost always a real document; just confirm it parses and has
    at least one page. An image-only PDF still gets full OCR downstream."""
    try:
        import fitz  # PyMuPDF

        with fitz.open(stream=content, filetype="pdf") as pdf:
            if pdf.page_count < 1:
                raise NotADocumentError("This PDF has no pages.")
    except NotADocumentError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise NotADocumentError("This PDF could not be read as a valid document.") from exc


_REJECT_MESSAGE = (
    "This image does not look like a document. Please upload a clear scan or photo of the "
    "actual document (certificate, circular, application, ID card, letter or official "
    "notice) - not a personal photo, screenshot or unrelated picture."
)


def _check_image(content: bytes) -> None:
    try:
        image_rgb = _downscaled_rgb(_open_image(content), _OCR_MAX_SIDE)
    except Exception as exc:  # noqa: BLE001
        raise NotADocumentError("This image file could not be read.") from exc

    # Crop away any near-black scanner/camera border so the document itself
    # drives every signal below.
    image_rgb = _trim_dark_border(image_rgb)
    signals = _appearance_signals(image_rgb)

    # 1. Reject WITHOUT OCR: colourful photo/noise, or no paper-like background.
    if _clearly_a_photo(signals):
        logger.info("document-check: REJECT (not a page, no OCR) %s", signals)
        raise NotADocumentError(_REJECT_MESSAGE, signals)

    # 2. Plausibly a page - does it carry readable document text?
    alnum, words, text = _ocr_probe(image_rgb)
    signals.update(ocr_alnum=alnum, ocr_words=words)
    real_text = _looks_like_real_text(text)

    paper_like = _paper_like(signals)
    ink_on_page = _has_ink_on_page(signals)
    clearly_text = alnum >= _MIN_TEXT_CHARS and words >= _MIN_TEXT_WORDS and real_text
    some_text = alnum >= _SOME_TEXT_CHARS and words >= _SOME_TEXT_WORDS and real_text

    accept = (
        clearly_text                        # readable document text
        or (some_text and paper_like)       # sparse text on a page (form, ID, stamp)
        or (alnum == -1 and paper_like)     # OCR unavailable / timed out, but it IS a page
        or (alnum <= 0 and ink_on_page)     # OCR read nothing, but a light page WITH ink (blur/low light)
    )

    logger.info(
        "document-check: %s  alnum=%s words=%s bright=%.2f sat=%.2f dark=%.3f paper=%s ink=%s",
        "ACCEPT" if accept else "REJECT",
        alnum, words, signals["bright_frac"], signals["mean_saturation"],
        signals["dark_frac"], paper_like, ink_on_page,
    )

    if not accept:
        raise NotADocumentError(_REJECT_MESSAGE, signals)


def validate_is_document(content: bytes, extension: str) -> None:
    """Raise NotADocumentError to reject the upload. Any other failure is
    swallowed (fail-open) so a bug here never blocks every upload."""
    try:
        if extension == "pdf":
            _check_pdf(content)
        else:
            _check_image(content)
    except NotADocumentError:
        raise
    except Exception:  # noqa: BLE001
        logger.exception("document-check crashed - allowing the upload through")
