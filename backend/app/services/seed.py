"""Idempotent seed service for the required initial Admin and Officer users,
plus one demo Citizen account for evaluation."""

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.user import User

DEFAULT_USERS = (
    {"username": "admin", "password": "admin123", "role": "Admin"},
    {"username": "officer", "password": "officer123", "role": "Officer"},
)

# Demo Citizen account - clearly a seeded demo credential, same convention as
# admin123 / officer123 above. Created only if absent; never overwrites a real
# account. citizen_id is fixed so real sign-ups start at CIT-000002.
DEMO_CITIZEN = {
    "username": "citizen_demo",
    "password": "citizen123",
    "role": "Citizen",
    "full_name": "Demo Citizen",
    "citizen_id": "CIT-000001",
}


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

        if db.query(User).filter(User.username == DEMO_CITIZEN["username"]).first() is None:
            db.add(
                User(
                    username=DEMO_CITIZEN["username"],
                    password_hash=hash_password(DEMO_CITIZEN["password"]),
                    role=DEMO_CITIZEN["role"],
                    full_name=DEMO_CITIZEN["full_name"],
                    citizen_id=DEMO_CITIZEN["citizen_id"],
                )
            )

        db.commit()
    finally:
        db.close()
