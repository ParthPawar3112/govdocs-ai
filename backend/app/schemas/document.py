"""Request and response schemas for the Phase 4 Document Management API,
extended in Phase 5 with OCR text/status, Phase 6 with AI metadata, and
Phase 8 with the review workflow and a derived lifecycle status."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.core.constants import DEPARTMENTS, DOCUMENT_STATUSES, REVIEW_ACTIONS
from app.services import ai_status as ai_status_tracker
from app.services import ocr_status as ocr_status_tracker

DepartmentLiteral = Literal[DEPARTMENTS]  # type: ignore[valid-type]
StatusLiteral = Literal[DOCUMENT_STATUSES]  # type: ignore[valid-type]
ReviewActionLiteral = Literal[REVIEW_ACTIONS]  # type: ignore[valid-type]


def compute_lifecycle_status(*, status: str, ocr_status: str, ai_status: str) -> str:
    """
    Single source of truth for the Phase 8 lifecycle badge - a 9-value status
    (Uploaded / OCR Processing / OCR Completed / AI Processing / Pending
    Review / Approved / Rejected / Needs Correction / Archived) derived
    entirely from fields that already exist, so nothing new has to be kept
    in sync. Once OCR+AI finish, the document sits in "Pending Review" until
    an admin acts via POST /documents/{id}/review or /archive.
    """
    if status in ("Approved", "Rejected", "Needs Correction", "Archived"):
        return status
    if ocr_status == "processing":
        return "OCR Processing"
    if ocr_status == "failed":
        return "OCR Failed"
    if ocr_status != "completed":
        return "Uploaded"
    if ai_status == "processing":
        return "AI Processing"
    if ai_status == "failed":
        return "AI Failed"
    if ai_status == "completed":
        return "Pending Review"
    return "OCR Completed"


class DocumentResponse(BaseModel):
    """Full document record returned to authenticated clients."""

    id: int
    title: str
    department: str
    description: str | None
    original_filename: str
    filesize: int
    filetype: str
    uploaded_by: str
    upload_date: datetime
    status: str
    ocr_text: str | None

    # Phase 6 - exactly the 8 fields that phase specifies.
    ai_title: str | None
    ai_summary: str | None
    ai_department: str | None
    ai_category: str | None
    ai_keywords: list[str] | None
    ai_confidence: float | None
    ai_processed: bool
    ai_error: str | None
    ocr_error: str | None
    # Which language ai_title/ai_summary were written in - None for rows that
    # predate this feature, treated identically to "english" everywhere.
    ai_output_language: str | None

    # Phase 8 - Document Approval Workflow.
    admin_remarks: str | None
    reviewed_by: str | None
    reviewed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def ocr_status(self) -> str:
        """'pending' | 'processing' | 'completed' | 'failed'. Derived, not
        stored - see app/services/ocr_status.py for why."""
        return ocr_status_tracker.get_status(self.id, self.ocr_text)

    @computed_field
    @property
    def ai_status(self) -> str:
        """'pending' | 'processing' | 'completed' | 'failed'. Derived from
        ai_processed/ai_error plus the in-memory tracker for the
        in-flight case - see app/services/ai_status.py."""
        return ai_status_tracker.get_status(self.id, self.ai_processed, self.ai_error)

    @computed_field
    @property
    def lifecycle_status(self) -> str:
        """The Phase 8 9-value status badge - see compute_lifecycle_status()."""
        return compute_lifecycle_status(status=self.status, ocr_status=self.ocr_status, ai_status=self.ai_status)


class DocumentListResponse(BaseModel):
    """Paginated-friendly wrapper so the frontend always knows the total count,
    even when `limit` trims the returned `items` (used by the dashboard's
    "recent documents" panel).

    `items` and `total` keep their exact Phase 4 meaning (total = count
    matching the current filters) - existing callers (dashboard, search bar)
    that only read those two fields are unaffected. Everything else here is
    additive, for Phase 7's pagination controls and stats bar.
    """

    items: list[DocumentResponse]
    total: int

    # Phase 7 additions - all optional-safe for older callers to ignore.
    overall_total: int = 0
    ai_processed_count: int = 0
    ocr_processed_count: int = 0
    page: int = 1
    page_size: int = 0
    total_pages: int = 1
    used_fuzzy_fallback: bool = False


class DocumentUpdate(BaseModel):
    """Editable fields for an existing document. All optional - only fields
    the client actually sends are changed.

    Phase 8: the ai_* fields let an Admin correct AI-extracted metadata from
    the Review page before approving - additive to the Phase 4 fields above,
    existing callers that only send title/department/description/status are
    unaffected."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    department: DepartmentLiteral | None = None
    description: str | None = None
    status: StatusLiteral | None = None

    ai_title: str | None = Field(default=None, min_length=1, max_length=255)
    ai_summary: str | None = None
    ai_department: str | None = Field(default=None, max_length=100)
    ai_category: str | None = Field(default=None, max_length=100)
    ai_keywords: list[str] | None = None
    ai_confidence: float | None = Field(default=None, ge=0, le=100)


class ReviewRequest(BaseModel):
    """Body for POST /documents/{id}/review - the Admin's approve/reject/
    send-back decision plus optional remarks shown to the uploading Officer."""

    action: ReviewActionLiteral
    remarks: str | None = Field(default=None, max_length=2000)


class DocumentStatsResponse(BaseModel):
    """Counts consumed by the Dashboard's stat cards and summary line."""

    total: int
    uploaded_today: int
    pending: int
    approved: int
    rejected: int


class FilterOptionsResponse(BaseModel):
    """Distinct values for filter dropdowns that aren't a fixed enum -
    categories and uploaded-by are both AI-generated/open-ended, so a
    hardcoded list would drift out of sync with what's actually in the DB."""

    categories: list[str]
    uploaded_by: list[str]
