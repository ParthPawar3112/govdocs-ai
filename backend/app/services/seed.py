"""Idempotent seed service for the required initial Admin and Officer users."""

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.user import User

DEFAULT_USERS = (
    {"username": "admin", "password": "admin123", "role": "Admin"},
    {"username": "officer", "password": "officer123", "role": "Officer"},
)


def seed_default_users() -> None:
    """Create the supplied accounts once without overwriting existing users."""
    db = SessionLocal()
    try:
        for user_data in DEFAULT_USERS:
            if db.query(User).filter(User.username == user_data["username"]).first() is None:
                db.add(
                    User(
                        username=user_data["username"],
                        password_hash=hash_password(user_data["password"]),
                        role=user_data["role"],
                    )
                )
        db.commit()
    finally:
        db.close()
