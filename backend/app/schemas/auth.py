"""Authentication request and response schemas exposed by the API."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    """Validated JSON credentials accepted by the login endpoint."""

    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class RegisterRequest(BaseModel):
    """Public Citizen sign-up payload. The 8-character minimum is enforced
    here; the username-uniqueness and new/confirm-match checks are business
    rules done in the router so their error messages can be specific (mirrors
    ChangePasswordRequest below)."""

    full_name: str = Field(min_length=1, max_length=120)
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    """The short-lived bearer token returned after successful login."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Safe user data returned to authenticated frontend clients.

    full_name/citizen_id are additive and only populated for Citizen accounts -
    they serialize as null for Admin/Officer, so existing consumers are
    unaffected."""

    id: int
    username: str
    role: str
    created_at: datetime
    full_name: str | None = None
    citizen_id: str | None = None

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    """A concise response shape for stateless actions such as logout."""

    message: str


class ChangePasswordRequest(BaseModel):
    """Validated payload for the Change Password endpoint. The 8-character
    minimum is enforced here; the current-password check and the
    new/confirm match check are business rules, done in the router so the
    error messages can be specific (mirrors how document validation is
    split between schema and router elsewhere in this codebase)."""

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=1, max_length=128)
