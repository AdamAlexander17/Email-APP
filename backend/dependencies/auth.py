"""
Authentication dependency for protected routes.

Provides a FastAPI dependency that extracts and validates JWT tokens
from the Authorization header, ensuring only authenticated users
can access protected endpoints.
"""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from backend.dependencies.jwt_utils import decode_token

# This shows only a Bearer token input in Swagger "Authorize"
security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> dict:
    """
    FastAPI dependency that validates the JWT access token.

    Args:
        credentials: Bearer token extracted by HTTPBearer.

    Returns:
        Decoded token payload dict containing sub, username, and type.

    Raises:
        HTTPException: 401 if the token is missing, invalid, or expired.
    """
    token = credentials.credentials

    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Token is invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify token type is "access"
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=401,
            detail="Token is invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
