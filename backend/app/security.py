"""Security utilities (password hashing, JWT creation/verification).

- Password hashing uses bcrypt (via passlib) when available.
- JWT uses HS256 with a secret stored in env var JWT_SECRET.

Note: For production, prefer short-lived access tokens + refresh tokens.
This demo keeps it simple and secure enough for a hackathon app.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass

import jwt
from passlib.context import CryptContext


_pwd_context = CryptContext(
  schemes=["bcrypt"],
  deprecated="auto",
)


def get_jwt_secret() -> str:
  secret = (os.getenv("JWT_SECRET") or "").strip()
  if not secret:
    raise RuntimeError("JWT_SECRET is not set")
  return secret


def get_access_token_ttl_seconds() -> int:
  raw = (os.getenv("JWT_ACCESS_TOKEN_TTL_SECONDS") or "").strip()
  if raw:
    try:
      return max(60, int(raw))
    except Exception:
      return 3600

  # Default: 1 hour
  return 3600


def hash_password(password: str) -> str:
  pw = str(password or "")
  if len(pw) < 6:
    raise ValueError("Password must be at least 6 characters")
  return _pwd_context.hash(pw)


def verify_password(password: str, password_hash: str) -> bool:
  if not password_hash:
    return False
  try:
    return bool(_pwd_context.verify(str(password or ""), str(password_hash)))
  except Exception:
    return False


@dataclass(frozen=True)
class TokenClaims:
  sub: str
  role: str
  token_version: int
  exp: int


def create_access_token(*, subject: str, role: str, token_version: int) -> tuple[str, int]:
  now = int(time.time())
  ttl = int(get_access_token_ttl_seconds())
  exp = now + ttl

  payload = {
    "sub": str(subject).strip().lower(),
    "role": str(role or "user"),
    "tv": int(token_version or 0),
    "iat": now,
    "exp": exp,
  }

  token = jwt.encode(payload, get_jwt_secret(), algorithm="HS256")
  return token, exp


def decode_access_token(token: str) -> TokenClaims:
  try:
    payload = jwt.decode(token, get_jwt_secret(), algorithms=["HS256"])
  except jwt.ExpiredSignatureError as e:
    raise ValueError("Token expired") from e
  except jwt.InvalidTokenError as e:
    raise ValueError("Invalid token") from e

  sub = str(payload.get("sub") or "").strip().lower()
  if not sub:
    raise ValueError("Invalid token")

  role = str(payload.get("role") or "user")
  tv = payload.get("tv")
  try:
    token_version = int(tv)
  except Exception:
    token_version = 0

  exp = payload.get("exp")
  try:
    exp_i = int(exp)
  except Exception:
    exp_i = 0

  return TokenClaims(sub=sub, role=role, token_version=token_version, exp=exp_i)
