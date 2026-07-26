"""Authentication request and response schemas exposed by the API."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    """Validated JSON credentials accepted by the login endpoint."""

    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    """The short-lived bearer token returned after successful login."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Safe user data returned to authenticated frontend clients."""

    id: int
    username: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    """A concise response shape for stateless actions such as logout."""

    message: str
