"""Authorization helpers (dependencies).

- `require_user` validates that a request has a valid JWT and that the user exists.
- Token invalidation is implemented with `User.token_version`.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db_deps import get_db_required
from app.models import User


def require_user(request: Request, db: Session = Depends(get_db_required)) -> User:
  user_id = getattr(request.state, "user_id", None)
  token_version = getattr(request.state, "token_version", None)

  if not user_id:
    raise HTTPException(status_code=401, detail="Unauthorized")

  user = db.get(User, str(user_id).strip().lower())
  if user is None or not bool(user.is_active):
    raise HTTPException(status_code=401, detail="Unauthorized")

  try:
    tv = int(token_version)
  except Exception:
    tv = 0

  if int(user.token_version or 0) != tv:
    raise HTTPException(status_code=401, detail="Unauthorized")

  return user


def require_admin(current_user: User = Depends(require_user)) -> User:
  if str(current_user.role or "user") != "admin":
    raise HTTPException(status_code=403, detail="Forbidden")
  return current_user
