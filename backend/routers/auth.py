"""
Authentication router for login and token refresh endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies.jwt_utils import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from backend.models.user import User
from backend.schemas.user import (
    AccessTokenResponse,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
)
from backend.services.user_service import authenticate_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user and return access + refresh tokens.

    Returns 401 if credentials are invalid.
    """
    user = authenticate_user(db, request.username, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    access_token = create_access_token(user.id, user.username)
    refresh_token = create_refresh_token(user.id)

    # Store tokens in the database
    user.access_token = access_token
    user.refresh_token = refresh_token
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(request: RefreshRequest, db: Session = Depends(get_db)):
    """
    Issue a new access token given a valid refresh token.

    Validates that the token type is "refresh" and has not expired.
    Returns 401 if the refresh token is invalid or expired.
    """
    try:
        payload = decode_token(request.refresh_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired",
        )

    user_id = int(payload["sub"])

    # Look up the user to get current username for the new access token
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired",
        )

    access_token = create_access_token(user.id, user.username)

    # Store new access token in the database
    user.access_token = access_token
    db.commit()

    return AccessTokenResponse(access_token=access_token)
