"""Document database model used by the Phase 4 Document Management module."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Document(Base):
    """A digitized government record with its file metadata and review status."""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # original_filename preserves what the user uploaded (e.g. "ration_card.pdf")
    # for display and download purposes. filename is the unique name it's
    # actually stored under on disk (e.g. "3f9c...b2.pdf") so two uploads
    # named "scan.pdf" never collide.
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    filepath: Mapped[str] = mapped_column(String(500), nullable=False)
    filesize: Mapped[int] = mapped_column(Integer, nullable=False)  # bytes
    filetype: Mapped[str] = mapped_column(String(10), nullable=False)  # pdf/jpg/jpeg/png

    uploaded_by: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    upload_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Pending", index=True)

    # Phase 5 - the ONE field that module adds. Nullable: empty until OCR
    # runs (automatically after upload, or via manual retry).
    ocr_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Phase 6 - exactly the 8 fields specified for AI Metadata Extraction.
    # All nullable/defaulted so existing rows (and OCR-only documents where
    # AI hasn't run yet) remain perfectly valid.
    ai_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ai_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ai_keywords: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_processed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ai_error: Mapped[str | None] = mapped_column(Text, nullable=True)
