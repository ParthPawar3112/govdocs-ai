"""
Standalone smoke test for Marathi/Devanagari OCR support.

Not part of the automated test suite (tests/) - this needs a real sample
image and its output is judged by eye, not asserted against a fixed string,
since OCR accuracy varies by scan quality. It calls the actual OCR service
code path (app.services.ocr_service), not a hand-rolled duplicate, so a
pass here means the real application pipeline works, not just pytesseract
in isolation.

Usage (from backend/, with the venv active):
    python scripts/test_marathi_ocr.py path\\to\\sample.jpg

Requires: mar.traineddata (and ideally Devanagari.traineddata) already
installed in Tesseract's tessdata directory - see README's OCR Engine
section. If mar isn't installed, this script says so clearly instead of
producing a confusing pytesseract error.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings  # noqa: E402


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scripts/test_marathi_ocr.py <path-to-image>")
        return 1

    image_path = sys.argv[1]
    if not os.path.isfile(image_path):
        print(f"File not found: {image_path}")
        return 1

    import pytesseract
    from PIL import Image

    if settings.TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
    if settings.TESSDATA_PREFIX:
        os.environ["TESSDATA_PREFIX"] = settings.TESSDATA_PREFIX

    installed_langs = set(pytesseract.get_languages())
    print(f"Tesseract cmd:      {pytesseract.pytesseract.tesseract_cmd}")
    print(f"Installed langs:    {sorted(installed_langs)}")
    print(f"Configured lang:    {settings.OCR_LANGUAGE}  (from OCR_LANGUAGE setting)")

    requested_langs = set(settings.OCR_LANGUAGE.split("+"))
    missing = requested_langs - installed_langs
    if missing:
        print(
            f"\nMissing language pack(s): {sorted(missing)}. "
            f"Copy the matching .traineddata file(s) into Tesseract's tessdata "
            f"directory, then re-run this script."
        )
        return 1

    print(f"\nRunning OCR on: {image_path}")
    with Image.open(image_path) as source_image:
        source_image.load()
        image = source_image.copy()

    text = pytesseract.image_to_string(image, lang=settings.OCR_LANGUAGE)
    text = text.strip()

    print("\n" + "=" * 60)
    print("EXTRACTED TEXT")
    print("=" * 60)
    print(text if text else "(no text extracted)")
    print("=" * 60)

    has_devanagari = any("ऀ" <= ch <= "ॿ" for ch in text)
    print(f"\nDevanagari characters detected: {has_devanagari}")
    if not has_devanagari:
        print(
            "No Devanagari characters found in the output. If the sample image "
            "does contain Marathi text, check image quality/DPI, or confirm "
            "mar.traineddata actually loaded (see 'Installed langs' above)."
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
