
"""Authentication routes (/auth).

Endpoints:
- POST /auth/signup
- POST /auth/login
- POST /auth/logout

Uses DB-backed users table and issues JWT access tokens.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.db_deps import get_db_required
from app.authz import require_user
from app.limiter import limiter
from app.models import User
from app.security import create_access_token, hash_password, verify_password
from app.storage import ensure_membership


router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
  name: str = Field(..., min_length=1, max_length=200)
  email: EmailStr
  password: str = Field(..., min_length=6, max_length=200)


class LoginRequest(BaseModel):
  email: EmailStr
  password: str = Field(..., min_length=1, max_length=200)


class AuthUserResponse(BaseModel):
  name: str
  email: EmailStr
  role: str


class AuthTokenResponse(BaseModel):
  access_token: str
  token_type: str = "bearer"
  expires_at: int
  user: AuthUserResponse


def _normalize_email(email: str) -> str:
  return (email or "").strip().lower()


@router.post("/signup", response_model=AuthTokenResponse)
@limiter.limit("5/minute")
def signup(request: Request, payload: SignupRequest, db: Session = Depends(get_db_required)) -> AuthTokenResponse:
  email = _normalize_email(str(payload.email))

  existing = db.get(User, email)
  if existing is not None:
    raise HTTPException(status_code=409, detail="Account already exists")

  pw_hash = hash_password(payload.password)

  user = User(
    id=email,
    name=payload.name.strip(),
    password_hash=pw_hash,
    role="user",
    token_version=0,
    is_active=True,
  )
  db.add(user)
  db.flush()

  # Default membership for new users.
  ensure_membership(db, user_id=user.id)
  db.commit()

  token, exp = create_access_token(subject=user.id, role=user.role, token_version=int(user.token_version or 0))
  return AuthTokenResponse(
    access_token=token,
    expires_at=exp,
    user=AuthUserResponse(name=user.name, email=user.id, role=user.role),
  )


@router.post("/login", response_model=AuthTokenResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db_required)) -> AuthTokenResponse:
  email = _normalize_email(str(payload.email))
  user = db.get(User, email)

  # Avoid account enumeration: same message for missing user or wrong password.
  if user is None or not user.is_active:
    raise HTTPException(status_code=401, detail="Invalid credentials")

  if not verify_password(payload.password, str(user.password_hash or "")):
    raise HTTPException(status_code=401, detail="Invalid credentials")

  token, exp = create_access_token(subject=user.id, role=user.role, token_version=int(user.token_version or 0))
  return AuthTokenResponse(
    access_token=token,
    expires_at=exp,
    user=AuthUserResponse(name=user.name, email=user.id, role=user.role),
  )


class LogoutResponse(BaseModel):
  status: str


@router.post("/logout", response_model=LogoutResponse)
@limiter.limit("30/minute")
def logout(request: Request, current_user: User = Depends(require_user), db: Session = Depends(get_db_required)) -> LogoutResponse:
  # Invalidate existing tokens by bumping token_version.
  current_user.token_version = int(current_user.token_version or 0) + 1
  db.add(current_user)
  db.commit()
  return LogoutResponse(status="ok")
