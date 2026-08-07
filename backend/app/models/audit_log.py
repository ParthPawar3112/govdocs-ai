"""Audit log model (Phase 8) - an append-only record of who did what, when.

A brand-new table, so it's created automatically by Base.metadata.create_all()
on startup (see app/db/migrate.py for why that's NOT true of new columns on
the pre-existing `documents` table). No updates or deletes are ever issued
against this table by the application - only inserts and reads.
"""
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class AuditLog(Base):
    """One recorded action, e.g. a login, an upload, or an approval."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # Nullable: some actions (e.g. Login) aren't tied to a specific document.
    document_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
