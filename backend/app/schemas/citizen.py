"""Citizen-facing response schemas.

Deliberately narrower than DocumentResponse: a Citizen sees processing status,
the final result, an appropriate summary, the decision and any officer remarks -
not the raw OCR dump, AI confidence, internal error strings, or the reviewing
staff member's username. The mapping from a Document ORM row lives in
app/routers/citizen.py::_to_citizen_document so the status trackers (which are
in-memory, see app/services/ocr_status.py) are read at request time.
"""
from datetime import datetime

from pydantic import BaseModel


class CitizenDocStats(BaseModel):
    """Counts for the Citizen dashboard's "My Documents" summary. The five
    shown buckets partition every document: total == processing +
    needs_correction + approved + rejected. `awaiting_review` is a hint
    subset of `processing` (cleared OCR + AI, now with an officer)."""

    total: int
    processing: int
    awaiting_review: int
    needs_correction: int
    approved: int
    rejected: int


class CitizenDocumentResponse(BaseModel):
    """One of the Citizen's own submitted documents, safe fields only."""

    id: int
    title: str
    department: str
    description: str | None
    original_filename: str
    filesize: int
    filetype: str
    upload_date: datetime

    status: str
    ocr_status: str
    ai_status: str
    lifecycle_status: str

    ai_title: str | None
    ai_summary: str | None
    ai_category: str | None
    ai_keywords: list[str] | None
    ai_output_language: str | None

    officer_remarks: str | None
    reviewed_at: datetime | None


class CitizenDashboardResponse(BaseModel):
    """Everything the Citizen landing page needs in one call."""

    full_name: str | None
    citizen_id: str | None
    username: str
    stats: CitizenDocStats
    recent: list[CitizenDocumentResponse]
