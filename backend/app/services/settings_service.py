"""
Settings service (Phase 8).

Most values on the Settings page (OCR engine, Gemini model, max upload size,
allowed file types) stay .env-driven read-only display, matching this
project's existing philosophy in core/config.py ("change this one value, no
code changes needed") - persisting an override layer for them would fight
that design rather than extend it. The single exception is the AI
confidence threshold, which has real UI impact (the low-confidence warning
in AIAnalysisPanel) and genuinely benefits from being tunable without a
restart - so it's the one value backed by the app_settings table.
"""
from sqlalchemy.orm import Session

from app.core.config import settings as app_config
from app.core.constants import ALLOWED_UPLOAD_TYPES, DEFAULT_AI_CONFIDENCE_THRESHOLD
from app.db.database import SessionLocal
from app.models.app_setting import AppSetting

SETTINGS_ROW_ID = 1


def seed_default_settings() -> None:
    """Creates the single settings row once, if it doesn't already exist."""
    db = SessionLocal()
    try:
        if db.get(AppSetting, SETTINGS_ROW_ID) is None:
            db.add(AppSetting(id=SETTINGS_ROW_ID, ai_confidence_threshold=DEFAULT_AI_CONFIDENCE_THRESHOLD))
            db.commit()
    finally:
        db.close()


def _get_row(db: Session) -> AppSetting:
    row = db.get(AppSetting, SETTINGS_ROW_ID)
    if row is None:
        # Startup seeding should always have created this - fall back
        # defensively rather than 500 the Settings page.
        row = AppSetting(id=SETTINGS_ROW_ID, ai_confidence_threshold=DEFAULT_AI_CONFIDENCE_THRESHOLD)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def get_settings(db: Session) -> dict:
    row = _get_row(db)
    return {
        "app_name": app_config.APP_NAME,
        "environment": app_config.ENV,
        "ocr_engine": app_config.OCR_ENGINE,
        "gemini_model": app_config.GEMINI_MODEL,
        "gemini_configured": bool(app_config.GEMINI_API_KEY),
        "max_upload_size_mb": app_config.MAX_UPLOAD_SIZE_MB,
        "allowed_file_types": sorted(ALLOWED_UPLOAD_TYPES),
        "ai_confidence_threshold": row.ai_confidence_threshold,
    }


def update_confidence_threshold(db: Session, value: float) -> dict:
    row = _get_row(db)
    row.ai_confidence_threshold = value
    db.commit()
    return get_settings(db)
