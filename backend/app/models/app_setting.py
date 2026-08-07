"""Application settings model (Phase 8).

Most Settings-page values (OCR engine, Gemini model, max upload size, allowed
file types) are intentionally left as read-only .env-driven config - that's
the existing design (see core/config.py: "change this one value, no code
changes needed"). This table holds the ONE value that's genuinely useful to
tune at runtime without a restart: the AI confidence threshold used to flag
low-confidence extractions for review.

Single-row table by convention (id is always 1) - seeded once by
app/services/settings_service.py, never a second row inserted.
"""
from sqlalchemy import Float, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.core.constants import DEFAULT_AI_CONFIDENCE_THRESHOLD
from app.db.database import Base


class AppSetting(Base):
    """Singleton row of admin-tunable runtime settings."""

    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ai_confidence_threshold: Mapped[float] = mapped_column(
        Float, nullable=False, default=DEFAULT_AI_CONFIDENCE_THRESHOLD
    )
