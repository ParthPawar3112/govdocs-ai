"""Request and response schemas for the Phase 4 Document Management API,
extended in Phase 5 with OCR text/status and Phase 6 with AI metadata."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.core.constants import DEPARTMENTS, DOCUMENT_STATUSES
from app.services import ai_status as ai_status_tracker
from app.services import ocr_status as ocr_status_tracker

DepartmentLiteral = Literal[DEPARTMENTS]  # type: ignore[valid-type]
StatusLiteral = Literal[DOCUMENT_STATUSES]  # type: ignore[valid-type]


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
    the client actually sends are changed."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    department: DepartmentLiteral | None = None
    description: str | None = None
    status: StatusLiteral | None = None


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
