"""Database wiring (SQLAlchemy) for PostgreSQL (e.g., Supabase).

- Reads connection string from env var: DATABASE_URL
- Initializes engine once and provides a per-request Session.

If DATABASE_URL is not set, callers should treat DB as disabled and fall back
(e.g., demo in-memory state).
"""

from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

log = logging.getLogger("ai-money-mentor")


class Base(DeclarativeBase):
  pass


_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def _normalize_database_url(url: str) -> str:
  """Normalize DATABASE_URL for SQLAlchemy.

  Supabase provides standard Postgres URLs. We keep the URL as-is but allow
  users to provide either 'postgres://' or 'postgresql://' schemes.
  """

  u = (url or "").strip()
  if u.startswith("postgres://"):
    # SQLAlchemy expects postgresql://
    return "postgresql://" + u[len("postgres://") :]
  return u


def get_database_url() -> str | None:
  url = os.getenv("DATABASE_URL")
  if not url:
    return None
  url = _normalize_database_url(url)
  return url if url else None


def is_db_enabled() -> bool:
  return bool(get_database_url())


def init_engine() -> Engine | None:
  """Initialize and cache the SQLAlchemy engine/sessionmaker.

  Returns None when DATABASE_URL is missing.
  """

  global _engine, _SessionLocal

  if _engine is not None and _SessionLocal is not None:
    return _engine

  url = get_database_url()
  if not url:
    return None

  # SQLite is useful for demo/local persistence.
  if url.startswith("sqlite"):
    _engine = create_engine(
      url,
      connect_args={"check_same_thread": False},
    )
  else:
    connect_args: dict = {}
    # For Supabase managed Postgres, SSL is typically required. Let users encode
    # sslmode in the URL if they want; otherwise we keep defaults.
    # psycopg2 reads PGSSLMODE too, so we don't force it here.

    _engine = create_engine(
      url,
      pool_pre_ping=True,
      pool_size=int(os.getenv("DB_POOL_SIZE") or 5),
      max_overflow=int(os.getenv("DB_MAX_OVERFLOW") or 10),
      connect_args=connect_args,
    )
  _SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False)
  return _engine


def get_engine() -> Engine:
  engine = init_engine()
  if engine is None:
    raise RuntimeError("DATABASE_URL not set; DB disabled")
  return engine


def get_sessionmaker() -> sessionmaker[Session]:
  init_engine()
  if _SessionLocal is None:
    raise RuntimeError("DATABASE_URL not set; DB disabled")
  return _SessionLocal


def get_db() -> Iterator[Session]:
  """FastAPI dependency: yields a Session and closes it."""

  session_local = get_sessionmaker()
  db = session_local()
  try:
    yield db
  finally:
    db.close()


@contextmanager
def db_session() -> Iterator[Session]:
  """Context manager for internal usage outside request scope."""

  session_local = get_sessionmaker()
  db = session_local()
  try:
    yield db
    db.commit()
  except Exception:
    db.rollback()
    raise
  finally:
    db.close()


def try_db_ping() -> tuple[bool, str | None]:
  """Best-effort connectivity check.

  Returns (ok, error_message).
  """

  if not is_db_enabled():
    return False, "DATABASE_URL not set"

  try:
    engine = get_engine()
    with engine.connect() as conn:
      conn.exec_driver_sql("SELECT 1")
    return True, None
  except SQLAlchemyError as e:
    return False, str(e)
