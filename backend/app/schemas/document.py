"""Request and response schemas for the Phase 4 Document Management API,
extended in Phase 5 with OCR text and status."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.core.constants import DEPARTMENTS, DOCUMENT_STATUSES
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

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def ocr_status(self) -> str:
        """'pending' | 'processing' | 'completed' | 'failed'. Derived, not
        stored - see app/services/ocr_status.py for why."""
        return ocr_status_tracker.get_status(self.id, self.ocr_text)


class DocumentListResponse(BaseModel):
    """Paginated-friendly wrapper so the frontend always knows the total count,
    even when `limit` trims the returned `items` (used by the dashboard's
    "recent documents" panel)."""

    items: list[DocumentResponse]
    total: int


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
