"""Password hashing and JWT helpers for the authentication module."""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt before it reaches SQLite."""
    return password_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Safely compare a plaintext password with its bcrypt hash."""
    return password_context.verify(plain_password, password_hash)


def create_access_token(subject: str) -> str:
    """Create a JWT with a user identifier and the configured 30-minute expiry."""
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(
        {"sub": subject, "exp": expires_at},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> str | None:
    """Return the authenticated user id from a valid token, otherwise None."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        subject = payload.get("sub")
        return subject if isinstance(subject, str) else None
    except JWTError:
        return None
