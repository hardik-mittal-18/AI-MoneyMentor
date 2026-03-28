"""FastAPI application entrypoint for AI Money Mentor.

Run locally:
  uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.requests import Request

from app.auth_middleware import AuthContextMiddleware
from app.auth_routes import router as auth_router
from app.membership_routes import router as membership_router
from app.limiter import limiter
from app.db import Base, init_engine, is_db_enabled, try_db_ping
import app.models  # noqa: F401
from app.finance import FinanceError
from app.routes import router


log = logging.getLogger("ai-money-mentor")


def _configure_logging() -> None:
  """Configure basic structured logging for the API process."""

  logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
  )


def create_app() -> FastAPI:
  """Create and configure the FastAPI app.

  - Loads environment variables
  - Enables CORS
  - Registers routes and exception handlers
  """

  # Load .env in local/dev environments and override any existing OS env vars.
  # This keeps demo behavior predictable when users tweak backend/.env.
  load_dotenv(override=True)
  _configure_logging()

  app = FastAPI(title="AI Money Mentor API", version="1.0.0")

  # Rate limiting (in-memory). Good for demo; for production use a shared store.
  app.state.limiter = limiter
  app.add_middleware(SlowAPIMiddleware)

  @app.exception_handler(RateLimitExceeded)
  async def _rate_limited(_request: Request, _exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Too many requests"})

  # Best-effort auth context extraction from JWT bearer tokens.
  app.add_middleware(AuthContextMiddleware)

  origins_raw = (os.getenv("CORS_ALLOW_ORIGINS") or os.getenv("FRONTEND_ORIGINS") or "").strip()
  if not origins_raw:
    origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
  elif origins_raw == "*":
    origins = ["*"]
  else:
    origins = [o.strip() for o in origins_raw.split(",") if o.strip()]

  app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
  )

  app.include_router(router)
  app.include_router(auth_router)
  app.include_router(membership_router)

  @app.on_event("startup")
  def _startup() -> None:
    if not is_db_enabled():
      log.info("DATABASE_URL not set; running in demo (no DB) mode")
      return

    try:
      engine = init_engine()
      if engine is None:
        log.info("DATABASE_URL not set; running in demo (no DB) mode")
        return

      ok, err = try_db_ping()
      if not ok:
        log.warning("DB ping failed; continuing with demo fallbacks. error=%s", err)
        return

      Base.metadata.create_all(bind=engine)
      log.info("DB initialized and tables ensured")
    except Exception as e:
      # Do not crash the API on startup; routes will fall back.
      log.warning("DB init failed; continuing with demo fallbacks. error=%s", str(e))

  @app.exception_handler(FinanceError)
  async def finance_error_handler(_request: Request, exc: FinanceError):
    """Convert domain computation errors into 400 responses."""

    return JSONResponse(status_code=400, content={"detail": str(exc)})

  return app


app = create_app()
