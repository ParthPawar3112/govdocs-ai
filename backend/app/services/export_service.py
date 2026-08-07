"""
PDF Summary Report generation (Phase 8).

Uses fpdf2 - pure-Python, no native binary dependency, installs in seconds.
Chosen for the same reason this project already picked pymupdf over poppler
and pytesseract over easyocr: it has to install cleanly on Windows with no
extra setup step, and a one-page summary report doesn't need a heavier
toolkit like reportlab.

fpdf2's core fonts (Helvetica etc.) only support Latin-1, but OCR text can
contain characters outside that range - _safe_text() replaces anything
un-encodable rather than letting PDF generation crash on a single odd glyph.

Every multi_cell()/cell() call below passes new_x=LMARGIN, new_y=NEXT
explicitly: multi_cell's default cursor lands at the RIGHT margin (not the
left) whenever a line doesn't wrap, which silently zeroes out the available
width for the next call and raises FPDFException - explicit positioning
avoids that trap everywhere instead of just where it was first noticed.
"""
from fpdf import FPDF
from fpdf.enums import XPos, YPos

from app.models.document import Document

MAX_OCR_EXCERPT_CHARS = 1500
NEXT_LINE = {"new_x": XPos.LMARGIN, "new_y": YPos.NEXT}


def _safe_text(value: str | None) -> str:
    if not value:
        return "-"
    return value.encode("latin-1", errors="replace").decode("latin-1")


def _heading(pdf: FPDF, text: str) -> None:
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, _safe_text(text), **NEXT_LINE)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(2)


def _field(pdf: FPDF, label: str, value: str) -> None:
    pdf.set_font("Helvetica", "B", 10)
    pdf.multi_cell(0, 6, _safe_text(label), **NEXT_LINE)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6, _safe_text(value), **NEXT_LINE)
    pdf.ln(1)


def generate_summary_pdf(document: Document) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 16)
    pdf.multi_cell(0, 10, _safe_text(document.title), **NEXT_LINE)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, "GovDocs AI - Document Summary Report", **NEXT_LINE)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)

    _heading(pdf, "Document Details")
    _field(pdf, "Status:", document.status)
    _field(pdf, "Department:", document.department)
    _field(pdf, "Uploaded by:", document.uploaded_by)
    _field(pdf, "Upload date:", document.upload_date.strftime("%Y-%m-%d %H:%M") if document.upload_date else "-")
    _field(pdf, "File:", f"{document.original_filename} ({document.filesize} bytes)")
    if document.reviewed_by:
        _field(pdf, "Reviewed by:", document.reviewed_by)
        _field(pdf, "Reviewed at:", document.reviewed_at.strftime("%Y-%m-%d %H:%M") if document.reviewed_at else "-")
    if document.admin_remarks:
        _field(pdf, "Remarks:", document.admin_remarks)

    pdf.ln(3)
    _heading(pdf, "AI Analysis")
    if document.ai_processed:
        _field(pdf, "AI Title:", document.ai_title or "-")
        _field(pdf, "AI Department:", document.ai_department or "-")
        _field(pdf, "AI Category:", document.ai_category or "-")
        _field(pdf, "Confidence:", f"{document.ai_confidence:.0f}%" if document.ai_confidence is not None else "-")
        _field(pdf, "Keywords:", ", ".join(document.ai_keywords) if document.ai_keywords else "-")
        _field(pdf, "Summary:", document.ai_summary or "-")
    else:
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 7, "AI analysis not yet available for this document.", **NEXT_LINE)

    if document.ocr_text:
        pdf.ln(3)
        _heading(pdf, "Extracted Text (excerpt)")
        pdf.set_font("Courier", "", 9)
        excerpt = document.ocr_text[:MAX_OCR_EXCERPT_CHARS]
        if len(document.ocr_text) > MAX_OCR_EXCERPT_CHARS:
            excerpt += "..."
        pdf.multi_cell(0, 5, _safe_text(excerpt), **NEXT_LINE)

    return bytes(pdf.output())
