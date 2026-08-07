"""Request and response schemas for the Phase 8 Settings API."""
from pydantic import BaseModel, Field


class SettingsResponse(BaseModel):
    app_name: str
    environment: str
    ocr_engine: str
    gemini_model: str
    gemini_configured: bool
    max_upload_size_mb: int
    allowed_file_types: list[str]
    ai_confidence_threshold: float


class SettingsUpdate(BaseModel):
    ai_confidence_threshold: float = Field(ge=0, le=100)
