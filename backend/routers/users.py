"""
Task 1 – Usha V
User CRUD API: in-memory list as DB, Pydantic validation, correct HTTP status codes.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid

router = APIRouter(prefix="/users", tags=["Task 1 – User CRUD"])

# ─── In-Memory DB ─────────────────────────────────────────────────────────────
_users_db: list[dict] = []


# ─── Models ──────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, examples=["Alice"])
    email: str = Field(..., examples=["alice@example.com"])
    age: Optional[int] = Field(None, ge=0, le=150, examples=[25])


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=150)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    age: Optional[int]


# ─── Helpers ─────────────────────────────────────────────────────────────────
def _find_user(user_id: str) -> dict:
    for u in _users_db:
        if u["id"] == user_id:
            return u
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"User '{user_id}' not found",
    )


def _email_exists(email: str, exclude_id: str = None) -> bool:
    return any(
        u["email"] == email and u["id"] != exclude_id
        for u in _users_db
    )


# ─── Routes ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=list[UserResponse], status_code=status.HTTP_200_OK)
def get_all_users():
    """Return all users. Empty list if none exist."""
    return _users_db


@router.get("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_user(user_id: str):
    """Get a single user by ID. Returns 404 if not found."""
    return _find_user(user_id)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate):
    """
    Create a new user.
    - 201: Created successfully
    - 409: Email already in use
    - 422: Validation error (handled by FastAPI/Pydantic)
    """
    if _email_exists(user.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{user.email}' is already registered",
        )
    new_user = {
        "id": str(uuid.uuid4()),
        "name": user.name,
        "email": user.email,
        "age": user.age,
    }
    _users_db.append(new_user)
    return new_user


@router.put("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
def update_user(user_id: str, updates: UserUpdate):
    """
    Update an existing user (partial update supported).
    - 200: Updated
    - 404: User not found
    - 409: New email already taken by another user
    """
    user = _find_user(user_id)

    if updates.email and _email_exists(updates.email, exclude_id=user_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{updates.email}' is already registered",
        )

    if updates.name is not None:
        user["name"] = updates.name
    if updates.email is not None:
        user["email"] = updates.email
    if updates.age is not None:
        user["age"] = updates.age

    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str):
    """
    Delete a user by ID.
    - 204: Deleted (no body)
    - 404: Not found
    """
    user = _find_user(user_id)
    _users_db.remove(user)
