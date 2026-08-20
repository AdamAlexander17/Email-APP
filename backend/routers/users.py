"""
Users router for user management CRUD endpoints.

All endpoints require authentication via get_current_user dependency.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.schemas.user import (
    PaginatedUsersResponse,
    PasswordUpdate,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from backend.services.user_service import (
    create_user,
    delete_user,
    get_user_by_id,
    get_users,
    update_password,
    update_user,
)

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=PaginatedUsersResponse)
def list_users(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=5, le=100),
    username: str | None = Query(default=None),
    sort_by: str = Query(default="id"),
    sort_dir: str = Query(default="asc"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve a paginated list of users.

    Supports filtering by username (partial match), sorting by
    id/username/created_at, and pagination with configurable page size.
    """
    users, total = get_users(db, page, size, username, sort_by, sort_dir)
    return PaginatedUsersResponse(
        users=users,
        total=total,
        page=page,
        size=size,
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_single_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve a single user by ID.

    Returns 404 if the user does not exist.
    """
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("", response_model=UserResponse, status_code=201)
def create_new_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new user.

    Returns 409 if the username is already taken.
    """
    return create_user(db, user_data)


@router.put("/{user_id}", response_model=UserResponse)
def update_existing_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Update an existing user's username.

    Returns 404 if not found, 409 if the new username is already taken.
    """
    return update_user(db, user_id, user_data)


@router.delete("/{user_id}", status_code=204)
def delete_existing_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a user by ID.

    Returns 403 if attempting to delete your own account, 404 if not found.
    """
    current_user_id = int(current_user["sub"])
    delete_user(db, user_id, current_user_id)


@router.put("/{user_id}/password", status_code=200)
def update_user_password(
    user_id: int,
    password_data: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Update a user's password.

    Validates that new_password matches confirm_password and meets
    length requirements (8-128 characters). Returns 404 if user not found.
    """
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=400, detail="Passwords do not match"
        )

    update_password(db, user_id, password_data.new_password)
    return {"message": "Password updated successfully"}
