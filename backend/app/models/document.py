"""Document database model used by the Phase 4 Document Management module."""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
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

    # Phase 5 - the ONE field this module adds. Nullable: empty until OCR
    # runs (automatically after upload, or via manual retry).
    ocr_text: Mapped[str | None] = mapped_column(Text, nullable=True)
