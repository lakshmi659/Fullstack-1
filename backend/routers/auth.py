"""
Task 2 – Madhushree NM
JWT Authentication: mock login endpoint + protected routes via FastAPI dependency.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional
import jwt

router = APIRouter(prefix="/auth", tags=["Task 2 – JWT Auth"])

# ─── Config ──────────────────────────────────────────────────────────────────
SECRET_KEY = "super-secret-dev-key-change-in-prod"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

MOCK_USERS = {
    "admin": {"username": "admin", "password": "admin123", "role": "admin"},
    "user":  {"username": "user",  "password": "user123",  "role": "user"},
}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ─── Models ──────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int


class TokenData(BaseModel):
    username: str
    role: str


class ProtectedResponse(BaseModel):
    message: str
    user: str
    role: str
    issued_at: str


# ─── Helpers ─────────────────────────────────────────────────────────────────
def _create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=15))
    payload.update({"exp": expire, "iat": now})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── Dependencies ────────────────────────────────────────────────────────────
def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> TokenData:
    payload = _decode_token(token)
    username: str = payload.get("sub", "")
    role: str = payload.get("role", "")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject",
        )
    return TokenData(username=username, role=role)


def require_admin(current_user: Annotated[TokenData, Depends(get_current_user)]):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ─── Routes ──────────────────────────────────────────────────────────────────
@router.post("/login", response_model=Token)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """Login with username + password. Returns signed JWT."""
    user = MOCK_USERS.get(form_data.username)
    if not user or user["password"] != form_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = _create_access_token(
        data={"sub": user["username"], "role": user["role"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(
        access_token=token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=ProtectedResponse)
def protected_route(current_user: Annotated[TokenData, Depends(get_current_user)]):
    """Protected endpoint — requires valid Bearer token."""
    return ProtectedResponse(
        message="You have access to this protected resource",
        user=current_user.username,
        role=current_user.role,
        issued_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/admin-only")
def admin_only_route(admin: Annotated[TokenData, Depends(require_admin)]):
    """Admin-only route — returns 403 for non-admin users."""
    return {"message": f"Welcome, admin {admin.username}!"}
