"""Pydantic request/response schemas for authentication and user management."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# --- Auth Schemas ---


class LoginRequest(BaseModel):
    """Schema for user login requests."""

    username: str = Field(..., max_length=50)
    password: str = Field(..., max_length=128)


class TokenResponse(BaseModel):
    """Schema for login response containing both tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """Schema for token refresh requests."""

    refresh_token: str


class AccessTokenResponse(BaseModel):
    """Schema for refresh response containing a new access token."""

    access_token: str
    token_type: str = "bearer"


# --- User Schemas ---


class UserCreate(BaseModel):
    """Schema for creating a new user."""

    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)



class UserUpdate(BaseModel):
    """Schema for updating an existing user."""

    username: str = Field(..., min_length=1, max_length=50)


class PasswordUpdate(BaseModel):
    """Schema for updating a user's password."""

    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    """Schema for user data in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime
    updated_at: datetime


class PaginatedUsersResponse(BaseModel):
    """Schema for paginated user list responses."""

    users: list[UserResponse]
    total: int
    page: int
    size: int
