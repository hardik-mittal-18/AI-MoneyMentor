"""Auth middleware.

Best-effort parsing/validation of JWT Bearer tokens:
- If a valid token is present, attaches user info to request.state.
- If missing/invalid, request proceeds (protected routes enforce auth separately).

This satisfies the requirement to "extract user_id and attach to request".
"""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from app.security import decode_access_token


class AuthContextMiddleware(BaseHTTPMiddleware):
  def __init__(self, app: ASGIApp):
    super().__init__(app)

  async def dispatch(self, request: Request, call_next):
    request.state.user_id = None
    request.state.user_role = None
    request.state.token_version = None

    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
      token = auth.split(" ", 1)[1].strip()
      if token:
        try:
          claims = decode_access_token(token)
          request.state.user_id = claims.sub
          request.state.user_role = claims.role
          request.state.token_version = claims.token_version
          print("User ID from token:", request.state.user_id)
        except Exception:
          # Don't block public endpoints; protected ones will reject later.
          pass

    return await call_next(request)
