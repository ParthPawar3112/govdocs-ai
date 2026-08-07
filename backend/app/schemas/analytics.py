"""Response schemas for the Phase 8 Analytics API."""
from pydantic import BaseModel


class AnalyticsSummaryResponse(BaseModel):
    total: int
    uploaded_today: int
    pending: int
    approved: int
    rejected: int
    needs_correction: int
    archived: int
    ocr_success: int
    ocr_failure: int
    ai_success: int
    ai_failure: int
    most_common_department: str | None
    most_common_category: str | None


class UploadsOverTimePoint(BaseModel):
    date: str
    count: int


class BreakdownEntry(BaseModel):
    label: str
    count: int
