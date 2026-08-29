"""User database model used by the Phase 2 authentication system.

Extended for the Citizen role: `full_name` and `citizen_id` are additive and
nullable - existing Admin/Officer rows keep NULL for both. `citizen_id` is the
human-readable public identity (CIT-000001, ...) assigned only to Citizen
accounts at registration; see app/services/citizen_id.py. The column is added
to pre-existing databases by app/db/migrate.py::ensure_user_profile_columns.
"""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class User(Base):
    """A login-enabled user with an application role (Admin / Officer / Citizen)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Citizen role additions - nullable, only populated for role == "Citizen".
    full_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    citizen_id: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)
