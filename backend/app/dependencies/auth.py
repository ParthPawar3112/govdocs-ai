"""Current-user dependency that protects authenticated API endpoints."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate a bearer token and load its active user from the database."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    subject = decode_access_token(credentials.credentials)
    if subject is None or not subject.isdigit():
        raise unauthorized

    user = db.get(User, int(subject))
    if user is None:
        raise unauthorized
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Phase 8 - gate for endpoints only Admins may call (audit log, analytics,
    settings, archive). Officers still authenticate normally elsewhere."""
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires Admin privileges.",
        )
    return current_user


def require_staff(current_user: User = Depends(get_current_user)) -> User:
    """Government-office roles (Admin or Officer) - the document repository,
    Smart Search, and the review workflow. Citizens are scoped to their own
    uploads via the /api/citizen/* endpoints instead."""
    if current_user.role not in ("Admin", "Officer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires Officer or Admin privileges.",
        )
    return current_user


def require_citizen(current_user: User = Depends(get_current_user)) -> User:
    """Gate for the Citizen self-service endpoints."""
    if current_user.role != "Citizen":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available to Citizen accounts.",
        )
    return current_user
