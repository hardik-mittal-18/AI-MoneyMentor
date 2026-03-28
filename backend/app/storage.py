"""DB-backed storage operations with safe fallbacks.

This module contains small, testable functions that:
- Ensure a user + broker account exist
- Add funds (transaction + balance update)
- Read balance, portfolio, transactions
- Create SIP plans and run daily SIP updates
- Save audit logs

All operations assume the caller already has a SQLAlchemy Session.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import AuditLog, BrokerAccount, Membership, PortfolioHolding, SipPlan, Transaction, User
from app.sip_sim import _price_for_day  # reuse deterministic curve


MEMBERSHIP_PRICES: dict[str, float] = {
  "free": 0.0,
  "normal": 1000.0,
  "silver": 5000.0,
  "gold": 10000.0,
}


def normalize_plan(plan: str | None) -> str:
  p = str(plan or "").strip().lower()
  if p in {"free", "normal", "silver", "gold"}:
    return p
  raise ValueError("Invalid plan. Choose free, normal, silver, or gold.")


def price_for_plan(plan: str) -> float:
  p = normalize_plan(plan)
  return float(MEMBERSHIP_PRICES.get(p, 0.0))


def ensure_membership(db: Session, *, user_id: str) -> Membership:
  uid = (user_id or "").strip().lower()
  if not uid:
    raise ValueError("user_id is required")

  ensure_user(db, user_id=uid)
  m = db.execute(select(Membership).where(Membership.user_id == uid).limit(1)).scalar_one_or_none()
  if m is None:
    m = Membership(user_id=uid, plan="free", price=0)
    db.add(m)
    db.flush()
  return m


def get_membership_status(db: Session, *, user_id: str) -> Membership:
  return ensure_membership(db, user_id=user_id)


def buy_membership(db: Session, *, user_id: str, plan: str) -> Membership:
  uid = (user_id or "").strip().lower()
  if not uid:
    raise ValueError("user_id is required")
  p = normalize_plan(plan)
  price = price_for_plan(p)

  m = ensure_membership(db, user_id=uid)

  # Avoid double-charging if the user clicks upgrade again on the current plan.
  if str(m.plan or "free").strip().lower() == p:
    return m

  # Debit funds for paid plans.
  if float(price) > 0:
    ensure_user(db, user_id=uid)
    acct = db.get(BrokerAccount, uid)
    if acct is None:
      acct = BrokerAccount(user_id=uid, balance=0)
      db.add(acct)
      db.flush()

    current_balance = float(acct.balance or 0)
    if current_balance < float(price):
      raise ValueError(f"Insufficient funds. Required ₹{float(price):.0f}, available ₹{current_balance:.0f}. Please add funds.")

    db.add(
      Transaction(
        user_id=uid,
        type="membership_purchase",
        amount=float(price),
        status="success",
        meta={"plan": p, "from_plan": str(m.plan or "free")},
      )
    )
    acct.balance = current_balance - float(price)
    db.flush()

  m.plan = p
  m.price = float(price)
  m.start_date = datetime.now(timezone.utc)
  db.add(m)
  db.flush()
  return m


def ensure_user(db: Session, *, user_id: str, name: str | None = None) -> User:
  uid = (user_id or "").strip().lower()
  if not uid:
    raise ValueError("user_id is required")

  user = db.get(User, uid)
  if user is None:
    user = User(id=uid, name=(name or "").strip())
    db.add(user)
    db.flush()

  if name and not user.name:
    user.name = name.strip()

  # Ensure broker account exists
  acct = db.get(BrokerAccount, uid)
  if acct is None:
    acct = BrokerAccount(user_id=uid, balance=0)
    db.add(acct)
    db.flush()

  return user


def get_balance(db: Session, *, user_id: str) -> float:
  ensure_user(db, user_id=user_id)
  acct = db.get(BrokerAccount, user_id.strip().lower())
  if acct is None:
    return 0.0
  return float(acct.balance or 0)


def add_funds(db: Session, *, user_id: str, amount: float, status: str = "success", meta: dict | None = None) -> float:
  uid = (user_id or "").strip().lower()
  if not uid:
    raise ValueError("user_id is required")

  amt = float(amount)
  if amt <= 0:
    raise ValueError("amount must be > 0")

  ensure_user(db, user_id=uid)

  acct = db.get(BrokerAccount, uid)
  if acct is None:
    acct = BrokerAccount(user_id=uid, balance=0)
    db.add(acct)
    db.flush()

  db.add(
    Transaction(
      user_id=uid,
      type="add_funds",
      amount=amt,
      status=str(status or "success"),
      meta=meta,
    )
  )

  acct.balance = float(acct.balance or 0) + amt
  db.flush()
  return float(acct.balance)


def list_transactions(db: Session, *, user_id: str, limit: int = 50) -> list[Transaction]:
  uid = (user_id or "").strip().lower()
  ensure_user(db, user_id=uid)
  lim = max(1, min(int(limit or 50), 200))

  stmt = select(Transaction).where(Transaction.user_id == uid).order_by(Transaction.created_at.desc()).limit(lim)
  rows = db.execute(stmt).scalars().all()
  return list(rows)


def get_portfolio(db: Session, *, user_id: str) -> list[PortfolioHolding]:
  uid = (user_id or "").strip().lower()
  ensure_user(db, user_id=uid)
  stmt = select(PortfolioHolding).where(PortfolioHolding.user_id == uid).order_by(PortfolioHolding.stock.asc())
  return list(db.execute(stmt).scalars().all())


def upsert_portfolio_from_demo(db: Session, *, user_id: str, items: list[dict]) -> None:
  """Seed portfolio for a user from existing demo data (one-time convenience)."""

  uid = (user_id or "").strip().lower()
  ensure_user(db, user_id=uid)

  for x in items:
    stock = str(x.get("stock", "")).strip().upper()
    if not stock:
      continue

    qty = float(x.get("quantity", 0) or 0)
    price = float(x.get("price", 0) or 0)

    stmt = select(PortfolioHolding).where(PortfolioHolding.user_id == uid, PortfolioHolding.stock == stock)
    existing = db.execute(stmt).scalar_one_or_none()
    if existing is None:
      db.add(PortfolioHolding(user_id=uid, stock=stock, quantity=qty, price=price))
    else:
      existing.quantity = qty
      existing.price = price

  db.flush()


def create_sip_plan(db: Session, *, user_id: str, amount_per_day: float, investment_type: str, start_date: date) -> SipPlan:
  uid = (user_id or "").strip().lower()
  ensure_user(db, user_id=uid)

  amt = float(amount_per_day)
  if amt <= 0:
    raise ValueError("amount_per_day must be > 0")

  inv = str(investment_type or "mutual_funds").strip()
  if inv not in {"stocks", "mutual_funds"}:
    raise ValueError("investment_type must be stocks or mutual_funds")

  plan = SipPlan(
    user_id=uid,
    amount_per_day=float(round(amt, 2)),
    investment_type=inv,
    start_date=start_date,
    days_completed=0,
    total_invested=0,
    total_units=0,
    last_run_date=None,
  )
  db.add(plan)
  db.flush()
  return plan


def get_latest_sip_plan(db: Session, *, user_id: str) -> SipPlan | None:
  uid = (user_id or "").strip().lower()
  ensure_user(db, user_id=uid)
  stmt = select(SipPlan).where(SipPlan.user_id == uid).order_by(SipPlan.created_at.desc()).limit(1)
  return db.execute(stmt).scalar_one_or_none()


def run_daily_sip(db: Session, *, user_id: str) -> tuple[SipPlan, dict]:
  """Run one day of SIP: deduct broker balance and update totals."""

  uid = (user_id or "").strip().lower()
  ensure_user(db, user_id=uid)

  plan = get_latest_sip_plan(db, user_id=uid)
  if plan is None:
    raise ValueError("No SIP found. Create one first.")

  acct = db.get(BrokerAccount, uid)
  if acct is None:
    raise ValueError("Broker account not found")

  amount = float(plan.amount_per_day)
  balance = float(acct.balance or 0)
  if balance < amount:
    raise ValueError("Insufficient broker balance. Add funds to continue SIP.")

  day_index = int(plan.days_completed or 0)
  price = float(_price_for_day(plan.investment_type, day_index))
  units_bought = float(round(amount / price, 8))

  acct.balance = balance - amount

  plan.total_invested = float(round(float(plan.total_invested or 0) + amount, 2))
  plan.total_units = float(round(float(plan.total_units or 0) + units_bought, 8))
  plan.days_completed = int(plan.days_completed or 0) + 1

  today = datetime.utcnow().date()
  plan.last_run_date = today if plan.last_run_date is None else date.fromordinal(plan.last_run_date.toordinal() + 1)

  run_entry = {
    "day": int(plan.days_completed),
    "price": price,
    "invested": amount,
    "units_bought": units_bought,
    "timestamp": datetime.utcnow().isoformat() + "Z",
  }

  db.add(
    Transaction(
      user_id=uid,
      type="sip_run",
      amount=-amount,
      status="success",
      meta={"sip_plan_id": plan.id, **run_entry},
    )
  )

  db.flush()
  return plan, run_entry


def save_audit_log(db: Session, *, user_id: str | None, event: str, message: str, payload: dict | None = None) -> None:
  db.add(AuditLog(user_id=(user_id or "").strip().lower() or None, event=str(event or "event"), message=str(message or ""), payload=payload))
  db.flush()


def safe_call_db(fn, *args, **kwargs):
  """Wrap DB ops and rethrow as ValueError-friendly exceptions."""

  try:
    return fn(*args, **kwargs)
  except SQLAlchemyError as e:
    raise RuntimeError(f"Database error: {str(e)}") from e
