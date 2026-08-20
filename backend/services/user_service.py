"""
User service layer for business logic.

Handles password hashing, user authentication, CRUD operations,
pagination, filtering, sorting, and uniqueness validation.
"""

from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.models.user import User
from backend.schemas.user import UserCreate, UserUpdate

# bcrypt password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    """
    Authenticate a user by username and password.

    Returns the User object if credentials are valid, otherwise None.
    """
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_user(db: Session, user_data: UserCreate) -> User:
    """
    Create a new user record in the database.

    Hashes the password before storing. Raises HTTPException 409
    if username already exists.
    """
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Username is already taken")

    hashed = hash_password(user_data.password)
    user = User(
        username=user_data.username,
        password_hash=hashed,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_users(
    db: Session,
    page: int,
    size: int,
    username_filter: str | None,
    sort_by: str,
    sort_dir: str,
) -> tuple[list[User], int]:
    """
    Retrieve a paginated, filtered, and sorted list of users.

    Filtering uses case-insensitive partial matching on username.
    Sorting supports: id, username, created_at with asc/desc direction.
    Defaults to id ascending.

    Returns a tuple of (users list, total count).
    """
    query = db.query(User)

    # Apply username filter with case-insensitive partial matching
    if username_filter:
        query = query.filter(User.username.ilike(f"%{username_filter}%"))

    # Get total count before pagination
    total = query.count()

    # Apply sorting
    sort_columns = {
        "id": User.id,
        "username": User.username,
        "created_at": User.created_at,
        "updated_at": User.updated_at,
    }
    sort_column = sort_columns.get(sort_by, User.id)

    if sort_dir.lower() == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * size
    users = query.offset(offset).limit(size).all()

    return users, total


def get_user_by_id(db: Session, user_id: int) -> User | None:
    """
    Retrieve a single user by ID.

    Returns the User object or None if not found.
    """
    return db.query(User).filter(User.id == user_id).first()


def update_user(db: Session, user_id: int, user_data: UserUpdate) -> User:
    """
    Update an existing user record.

    Checks uniqueness of username against other users.
    Raises HTTPException 404 if user not found, 409 for duplicate username.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check for duplicate username (excluding the current user)
    existing_user = (
        db.query(User)
        .filter(User.username == user_data.username, User.id != user_id)
        .first()
    )
    if existing_user:
        raise HTTPException(status_code=409, detail="Username is already taken")

    user.username = user_data.username
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int, current_user_id: int) -> None:
    """
    Delete a user record.

    Raises HTTPException 403 if attempting self-deletion,
    404 if user not found.
    """
    if user_id == current_user_id:
        raise HTTPException(
            status_code=403, detail="Cannot delete your own account"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()


def update_password(db: Session, user_id: int, new_password: str) -> None:
    """
    Update a user's password.

    Hashes the new password and updates the record.
    Raises HTTPException 404 if user not found.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(new_password)
    db.commit()
