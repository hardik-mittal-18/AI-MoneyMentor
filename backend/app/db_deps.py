"""FastAPI dependencies for database sessions.

The core DB module (`app.db`) is used by both API and internal logic.
These helpers provide API-friendly error codes for cases where the DB is not configured.
"""

from __future__ import annotations

from typing import Iterator

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db import get_sessionmaker, is_db_enabled


def get_db_required() -> Iterator[Session]:
  if not is_db_enabled():
    raise HTTPException(status_code=503, detail="Database not configured. Set DATABASE_URL to enable auth.")

  session_local = get_sessionmaker()
  db = session_local()
  try:
    yield db
  finally:
    db.close()
