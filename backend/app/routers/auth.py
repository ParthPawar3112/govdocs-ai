"""Login, logout, and current-user endpoints for Phase 2 authentication."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    TokenResponse,
    UserResponse,
)
from app.services import audit_service

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate credentials and return a 30-minute bearer JWT."""
    user = db.query(User).filter(User.username == credentials.username).first()
    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    audit_service.log_action(db, user=user.username, action="Login")
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user)) -> MessageResponse:
    """Validate the caller before confirming client-side token removal."""
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    """Return profile data for the authenticated bearer-token user."""
    return current_user


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """
    Lets the authenticated user (Admin or Officer) change their own
    password. Doesn't touch the login flow itself - only reuses its
    existing hash_password/verify_password helpers. The caller's current
    token stays valid (it's short-lived anyway); the frontend logs the user
    out afterward so they re-authenticate with the new password.
    """
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation do not match",
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    audit_service.log_action(db, user=current_user.username, action="Password Changed")
    return MessageResponse(message="Password changed successfully")
