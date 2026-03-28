"""SQLAlchemy ORM models for persisted broker/SIP data.

Includes optional auth fields used by the FastAPI /auth endpoints.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _utcnow() -> datetime:
  return datetime.now(timezone.utc)


def _uuid() -> str:
  return str(uuid.uuid4())


class User(Base):
  __tablename__ = "users"

  # Keep user_id stable and simple for this app: use email as the primary key.
  id: Mapped[str] = mapped_column(String(320), primary_key=True)
  name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
  # Auth fields are optional so existing demo flows can still create users.
  password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
  role: Mapped[str] = mapped_column(String(32), nullable=False, default="user")
  token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
  is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
  updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

  broker_account: Mapped["BrokerAccount"] = relationship(back_populates="user", uselist=False)


class BrokerAccount(Base):
  __tablename__ = "broker_accounts"

  user_id: Mapped[str] = mapped_column(String(320), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
  balance: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
  updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

  user: Mapped[User] = relationship(back_populates="broker_account")


class PortfolioHolding(Base):
  __tablename__ = "portfolio"

  id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
  user_id: Mapped[str] = mapped_column(String(320), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

  stock: Mapped[str] = mapped_column(String(32), nullable=False)
  quantity: Mapped[float] = mapped_column(Numeric(18, 6), nullable=False, default=0)
  price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
  updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

  __table_args__ = (UniqueConstraint("user_id", "stock", name="uq_portfolio_user_stock"),)


class SipPlan(Base):
  __tablename__ = "sip_plans"

  id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
  user_id: Mapped[str] = mapped_column(String(320), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

  amount_per_day: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
  investment_type: Mapped[str] = mapped_column(String(32), nullable=False, default="mutual_funds")
  start_date: Mapped[date] = mapped_column(Date, nullable=False)

  days_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
  total_invested: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
  total_units: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False, default=0)
  last_run_date: Mapped[date | None] = mapped_column(Date, nullable=True)

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
  updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)


class Transaction(Base):
  __tablename__ = "transactions"

  id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
  user_id: Mapped[str] = mapped_column(String(320), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

  # e.g. "add_funds", "sip_run"
  type: Mapped[str] = mapped_column(String(32), nullable=False, default="add_funds")
  amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
  status: Mapped[str] = mapped_column(String(32), nullable=False, default="success")
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)

  meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class AuditLog(Base):
  __tablename__ = "audit_logs"

  id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
  user_id: Mapped[str] = mapped_column(String(320), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

  event: Mapped[str] = mapped_column(String(64), nullable=False, default="event")
  message: Mapped[str] = mapped_column(Text, nullable=False, default="")
  payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)


class Membership(Base):
  __tablename__ = "memberships"

  id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
  user_id: Mapped[str] = mapped_column(String(320), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)

  # free | normal | silver | gold
  plan: Mapped[str] = mapped_column(String(16), nullable=False, default="free")
  price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
  start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
