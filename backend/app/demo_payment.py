"""Demo-only payment gateway helpers.

Provides:
- 6-digit OTP generation + in-memory storage with expiry
- Demo-safe email sending via SMTP when configured (otherwise simulated)

No card details are persisted; only last4 is kept transiently with OTP session.
"""

from __future__ import annotations

import logging
import os
import secrets
import smtplib
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

log = logging.getLogger("ai-money-mentor")


@dataclass
class OtpSession:
  email: str
  otp: str
  expires_at: datetime
  amount: float
  card_last4: str


_OTP_BY_EMAIL: dict[str, OtpSession] = {}


def _utcnow() -> datetime:
  return datetime.now(timezone.utc)


def generate_otp() -> str:
  """Return a 6-digit OTP as a string."""

  return f"{secrets.randbelow(1_000_000):06d}"


def store_otp_session(*, email: str, otp: str, amount: float, card_last4: str, ttl_seconds: int) -> OtpSession:
  expires_at = _utcnow() + timedelta(seconds=int(ttl_seconds))
  session = OtpSession(
    email=email,
    otp=otp,
    expires_at=expires_at,
    amount=float(amount),
    card_last4=str(card_last4),
  )
  _OTP_BY_EMAIL[email.lower()] = session
  return session


def get_otp_session(email: str) -> OtpSession | None:
  return _OTP_BY_EMAIL.get(email.lower())


def clear_otp_session(email: str) -> None:
  _OTP_BY_EMAIL.pop(email.lower(), None)


def verify_otp(*, email: str, otp: str) -> OtpSession:
  session = get_otp_session(email)
  if session is None:
    raise ValueError("No OTP requested for this email.")

  if _utcnow() > session.expires_at:
    clear_otp_session(email)
    raise ValueError("OTP expired. Please resend OTP.")

  if str(otp).strip() != session.otp:
    raise ValueError("Invalid OTP.")

  return session


def send_otp_email(*, to_email: str, otp: str) -> dict:
  """Send OTP via SMTP when configured, otherwise simulate.

  Env vars (optional):
  - SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD
  - SMTP_FROM (default: SMTP_USERNAME)
  - SMTP_TLS ("1"/"true" enables STARTTLS)

  Demo convenience:
  - DEMO_RETURN_OTP="true" will cause callers to echo OTP in API response.
  """

  host = (os.getenv("SMTP_HOST") or "").strip()
  port_raw = (os.getenv("SMTP_PORT") or "").strip()
  username = (os.getenv("SMTP_USERNAME") or "").strip()
  password = (os.getenv("SMTP_PASSWORD") or "").strip()
  from_email = (os.getenv("SMTP_FROM") or username or "").strip()
  smtp_tls_raw = (os.getenv("SMTP_TLS") or "").strip()
  tls = smtp_tls_raw.lower() in {"1", "true", "yes"}

  # If SMTP isn't configured, simulate delivery.
  if not host or not from_email:
    log.info("[DEMO] OTP for %s is %s (SMTP not configured)", to_email, otp)
    return {"delivery": "simulated", "reason": "smtp_not_configured"}

  try:
    port = int(port_raw) if port_raw else 587

    # Default to STARTTLS on the common submission port unless explicitly disabled.
    if not smtp_tls_raw and port == 587:
      tls = True

    msg = EmailMessage()
    msg["Subject"] = "Demo Payment OTP"
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(f"Your OTP for adding funds is: {otp}")

    with smtplib.SMTP(host=host, port=port, timeout=10) as smtp:
      if tls:
        smtp.starttls()
      if username and password:
        smtp.login(username, password)
      smtp.send_message(msg)

    return {"delivery": "smtp"}
  except Exception as e:
    # Demo-safe fallback: don't block the user flow.
    log.warning("SMTP send failed; simulating OTP delivery. error=%s", str(e))
    log.info("[DEMO] OTP for %s is %s (SMTP failure)", to_email, otp)
    return {
      "delivery": "simulated",
      "reason": "smtp_failed",
      "warning": "SMTP send failed; simulated delivery.",
      "smtp_error": str(e),
    }
