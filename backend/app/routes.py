"""API routes for AI Money Mentor.

Defines:
- GET /health
- POST /analyze-finance
- POST /ai-advice

All request/response bodies are validated using Pydantic models.
"""

import logging
import os
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from starlette.requests import Request

from sqlalchemy.orm import Session

from app.authz import require_user
from app.models import User
from app.limiter import limiter

from app.finance import (
  FinanceError,
  build_basic_advice,
  calculate_emergency_fund_months,
  calculate_health_score,
  calculate_savings_rate_percent,
  recommend_monthly_sip,
  sip_future_value,
)
from app.openai_advisor import AIAdvisorError, generate_advice_answer
from app.autocost_pipeline import run_pipeline
from app.broker_demo import analyze_portfolio_rules, compute_total_value, load_demo_portfolio
from app.advice_validation import validate_and_correct_advice
from app.sip_sim import _price_for_day, create_sip, get_sip, reset_sip_progress, run_daily
from app.demo_state import add_broker_funds, get_broker_balance, get_demo_state, get_portfolio_payload, reset_demo_portfolio
from app.demo_payment import generate_otp, send_otp_email, store_otp_session, verify_otp

from app.db import is_db_enabled, get_sessionmaker
from app.storage import (
  add_funds as db_add_funds,
  create_sip_plan as db_create_sip_plan,
  get_balance as db_get_balance,
  get_latest_sip_plan,
  get_portfolio as db_get_portfolio,
  list_transactions as db_list_transactions,
  run_daily_sip as db_run_daily_sip,
  save_audit_log as db_save_audit_log,
  ensure_membership,
  upsert_portfolio_from_demo,
)

router = APIRouter()
log = logging.getLogger("ai-money-mentor")


DEFAULT_USER_ID = "demo.user@example.com"


def _get_user_id(
  request: Request,
  x_user_id: str | None = Header(default=None, alias="X-User-Id"),
  user_id: str | None = Query(default=None),
) -> str:
  state_uid = getattr(request.state, "user_id", None)
  uid = (state_uid or x_user_id or user_id or "").strip().lower()
  return uid or DEFAULT_USER_ID


def _require_user_id(current_user: User = Depends(require_user)) -> str:
  return str(current_user.id)


def _get_db_optional() -> Session | None:
  """Create a DB session if enabled, otherwise return None."""

  if not is_db_enabled():
    return None
  try:
    session_local = get_sessionmaker()
    return session_local()
  except Exception:
    return None


def _close_db(db: Session | None) -> None:
  if db is None:
    return
  try:
    db.close()
  except Exception:
    pass


def _get_membership_plan(db: Session | None, *, user_id: str) -> str:
  """Best-effort membership lookup; defaults to free on failures."""

  if db is None:
    return "free"
  try:
    m = ensure_membership(db, user_id=user_id)
    return str(m.plan or "free").strip().lower() or "free"
  except Exception:
    return "free"


class TransactionItem(BaseModel):
  id: str
  type: str
  amount: float
  status: str
  created_at: str
  meta: dict | None = None

class PortfolioItem(BaseModel):
  stock: str = Field(..., min_length=1)
  quantity: float = Field(..., ge=0)
  price: float = Field(..., ge=0)

class DashboardResponse(BaseModel):
  balance: float
  portfolio: list[PortfolioItem] = Field(default_factory=list)
  transactions: list[TransactionItem] = Field(default_factory=list)


class AddFundsRequest(BaseModel):
  """Add funds after a successful payment.

  Supports demo OTP flow by accepting `otp` (and optional `email`).
  When `otp` is provided, the amount is taken from the OTP session.
  """

  amount: float | None = Field(default=None, gt=0)
  status: str = Field(default="success", max_length=32)
  otp: str | None = Field(default=None, min_length=6, max_length=6)
  email: str | None = Field(default=None, min_length=3, max_length=320)


def _dashboard_from_db(db: Session, *, user_id: str, include_portfolio: bool, include_transactions: bool) -> DashboardResponse:
  bal = float(db_get_balance(db, user_id=user_id))

  portfolio_items: list[PortfolioItem] = []
  if include_portfolio:
    holdings = db_get_portfolio(db, user_id=user_id)
    portfolio_items = [PortfolioItem(stock=h.stock, quantity=float(h.quantity), price=float(h.price)) for h in holdings]

  tx_items: list[TransactionItem] = []
  if include_transactions:
    txs = db_list_transactions(db, user_id=user_id)
    tx_items = [
      TransactionItem(
        id=t.id,
        type=str(t.type),
        amount=float(t.amount),
        status=str(t.status),
        created_at=t.created_at.isoformat(),
        meta=t.meta,
      )
      for t in txs
    ]

  return DashboardResponse(balance=bal, portfolio=portfolio_items, transactions=tx_items)


def _demo_advice(*, question: str, income: float, expenses: float) -> str:
  """Deterministic fallback advice when OpenAI is unavailable.

  Keeps the app usable in demo mode without requiring external API keys.
  """

  income = float(income)
  expenses = float(expenses)
  surplus = max(0.0, income - expenses)
  savings_rate = 0.0
  try:
    savings_rate = float(calculate_savings_rate_percent(income=income, expenses=expenses))
  except Exception:
    savings_rate = 0.0

  lines: list[str] = []
  lines.append("Demo Advisor (offline):")
  lines.append(f"- Your monthly surplus is about ₹{surplus:,.0f} (income ₹{income:,.0f} − expenses ₹{expenses:,.0f}).")
  lines.append(f"- Your savings rate is ~{savings_rate:.0f}%. Aim for 20–30% if possible.")
  lines.append("- Build/maintain an emergency fund of 3–6 months of expenses before taking high risk.")
  if surplus > 0:
    sip = int(max(500.0, min(surplus, surplus * 0.4)))
    lines.append(f"- A simple start: SIP ₹{sip:,.0f}/month into a low-cost diversified index fund (demo suggestion).")
  else:
    lines.append("- Since surplus is low, reduce expenses by 5–10% first, then start a small SIP.")
  lines.append("- Diversify: avoid putting >25–30% in a single stock; review monthly.")
  lines.append(f"- Your question: “{question.strip()}” → start with a budget + SIP + safety buffer.")
  lines.append("Note: This is educational info, not guaranteed returns.")

  return "\n".join(lines)


class HealthResponse(BaseModel):
  """Response payload for GET /health."""

  status: str


class AnalyzeFinanceRequest(BaseModel):
  """Request payload for POST /analyze-finance."""

  income: float = Field(..., gt=0, description="Monthly income (₹)")
  expenses: float = Field(..., gt=0, description="Monthly expenses (₹)")
  savings: float = Field(..., ge=0, description="Current savings / emergency buffer (₹)")
  goal: str = Field(..., min_length=1, max_length=2000, description="User goal (text)")
  years: int = Field(..., ge=1, le=50, description="Investment horizon in years")


class AnalyzeFinanceResponse(BaseModel):
  """Response payload for POST /analyze-finance."""

  health_score: int = Field(..., ge=0, le=100)
  savings_rate: float = Field(..., description="Savings rate (%)")
  emergency_fund_months: float = Field(..., description="Emergency fund months")
  sip_recommendation: int = Field(..., ge=0, description="Recommended SIP per month (₹)")
  investment_projection: int = Field(..., ge=0, description="Projected SIP future value for the given horizon (₹)")
  advice: str


class AIAdviceRequest(BaseModel):
  """Request payload for POST /ai-advice."""

  # Support both request contracts: {question, income, expenses} and {query}
  question: str | None = Field(default=None, min_length=1, max_length=2000)
  query: str | None = Field(default=None, min_length=1, max_length=2000)
  income: float = Field(default=1, gt=0, description="Monthly income (₹)")
  expenses: float = Field(default=0, ge=0, description="Monthly expenses (₹)")


class AIAdviceResponse(BaseModel):
  """Response payload for POST /ai-advice."""

  advice: str
  risk_level: Literal["Low", "Medium", "High"]
  confidence: float = Field(..., ge=0, le=100)
  warning: str | None = None
  # Backward compatibility
  answer: str


class AISipPlanRequest(BaseModel):
  monthly_income: float = Field(..., gt=0, description="Monthly income (₹)")
  monthly_expenses: float = Field(..., ge=0, description="Monthly expenses (₹)")


class AISipAllocation(BaseModel):
  sip: int
  emergency: int
  buffer: int


class AISipDailyPlanItem(BaseModel):
  plan: Literal["Conservative", "Balanced", "Aggressive"]
  amount_per_day: int = Field(..., ge=0)
  type: str


class AISipPlanResponse(BaseModel):
  monthly_savings: int
  investment_allocation: AISipAllocation
  daily_sip_plan: list[AISipDailyPlanItem]
  broker_check: str
  broker_balance: float
  warning: str | None = None
  advice: str
  risk_level: Literal["Low", "Medium", "High"]
  confidence: float = Field(..., ge=0, le=100)


class RunAIPipelineRequest(BaseModel):
  """Request payload for POST /run-ai-pipeline."""

  mode: Literal["auto", "manual"] = Field(
    default="auto",
    description="auto applies simulated fixes; manual returns a preview without applying fixes",
  )
  dataset: str | None = Field(
    default=None,
    description="Optional dataset name. If omitted, uses the bundled sample dataset.",
  )


class RunAIPipelineResponse(BaseModel):
  """Response payload for POST /run-ai-pipeline."""

  total_before: float
  total_after: float
  savings: float
  improvement_percent: float
  ai_confidence_score: float | None = None
  anomalies: list[dict]
  actions: list[dict]
  logs: list[dict]
  pipeline_steps: list[str]
  mode: str
  record_count: int


class BrokerPortfolioItem(BaseModel):
  stock: str = Field(..., min_length=1)
  quantity: float = Field(..., ge=0)
  price: float = Field(..., ge=0)


class BrokerPortfolioResponse(BaseModel):
  user: str
  portfolio: list[BrokerPortfolioItem]
  total_value: float


class AnalyzePortfolioRequest(BaseModel):
  portfolio: list[BrokerPortfolioItem]


class AnalyzePortfolioResponse(BaseModel):
  risks: list[str]
  suggestions: list[str]
  opportunities: list[str]
  estimated_gain: float
  confidence_score: float | None = None


class BrokerBalanceResponse(BaseModel):
  demo_mode: bool
  broker_balance: float


class SendOtpRequest(BaseModel):
  email: str = Field(..., min_length=3, max_length=320)
  amount: float = Field(..., gt=0, description="Amount to add (₹)")
  card_last4: str = Field(..., min_length=4, max_length=4, description="Last 4 digits only")


class SendOtpResponse(BaseModel):
  status: Literal["otp_sent"]
  delivery: Literal["smtp", "simulated"]
  expires_in_seconds: int
  masked_card: str
  demo_mode: bool
  warning: str | None = None
  demo_otp: str | None = None


class VerifyOtpRequest(BaseModel):
  email: str = Field(..., min_length=3, max_length=320)
  otp: str = Field(..., min_length=6, max_length=6)


class VerifyOtpResponse(BaseModel):
  status: Literal["success"]
  new_balance: float
  demo_mode: bool


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
  """Health check endpoint."""

  return HealthResponse(status="ok")


@router.get("/balance", response_model=DashboardResponse)
def get_balance_route(user_id: str = Depends(_require_user_id)) -> DashboardResponse:
  """Get broker balance for the current user."""

  db = _get_db_optional()
  try:
    if db is not None:
      try:
        return _dashboard_from_db(db, user_id=user_id, include_portfolio=False, include_transactions=False)
      except Exception:
        db.rollback()
        log.exception("DB error in /balance; falling back to demo")

    return DashboardResponse(balance=float(get_broker_balance()), portfolio=[], transactions=[])
  finally:
    _close_db(db)


@router.get("/portfolio", response_model=DashboardResponse)
def get_portfolio_route(user_id: str = Depends(_require_user_id)) -> DashboardResponse:
  """Fetch portfolio holdings for the current user."""

  db = _get_db_optional()
  try:
    if db is not None:
      try:
        # Convenience: seed from bundled demo portfolio on first use.
        holdings = db_get_portfolio(db, user_id=user_id)
        if len(holdings) == 0:
          json_path = Path(__file__).resolve().parent / "data" / "portfolio.json"
          demo = get_portfolio_payload(json_path=json_path)
          upsert_portfolio_from_demo(db, user_id=user_id, items=list(demo.get("portfolio") or []))
          db.commit()

        return _dashboard_from_db(db, user_id=user_id, include_portfolio=True, include_transactions=False)
      except Exception:
        db.rollback()
        log.exception("DB error in /portfolio; falling back to demo")

    # Demo fallback
    json_path = Path(__file__).resolve().parent / "data" / "portfolio.json"
    data = get_portfolio_payload(json_path=json_path)
    items = [PortfolioItem(**x) for x in (data.get("portfolio") or [])]
    return DashboardResponse(balance=float(get_broker_balance()), portfolio=items, transactions=[])
  finally:
    _close_db(db)


@router.get("/transactions", response_model=DashboardResponse)
def get_transactions_route(
  user_id: str = Depends(_require_user_id),
  limit: int = Query(default=50, ge=1, le=200),
) -> DashboardResponse:
  """List transactions for the current user."""

  db = _get_db_optional()
  try:
    if db is not None:
      try:
        bal = float(db_get_balance(db, user_id=user_id))
        txs = db_list_transactions(db, user_id=user_id, limit=limit)
        tx_items = [
          TransactionItem(
            id=t.id,
            type=str(t.type),
            amount=float(t.amount),
            status=str(t.status),
            created_at=t.created_at.isoformat(),
            meta=t.meta,
          )
          for t in txs
        ]
        return DashboardResponse(balance=bal, portfolio=[], transactions=tx_items)
      except Exception:
        db.rollback()
        log.exception("DB error in /transactions; falling back to demo")

    return DashboardResponse(balance=float(get_broker_balance()), portfolio=[], transactions=[])
  finally:
    _close_db(db)


@router.post("/add-funds", response_model=DashboardResponse)
@limiter.limit("30/minute")
def add_funds_route(request: Request, payload: AddFundsRequest, user_id: str = Depends(_require_user_id)) -> DashboardResponse:
  """Record a successful payment and update broker balance.

  - Inserts a row in `transactions`
  - Updates `broker_accounts.balance`

  Demo OTP mode: if `otp` is provided, verifies OTP and uses the stored amount.
  """

  # Always credit the authenticated user's account.
  uid = (user_id or "").strip().lower() or DEFAULT_USER_ID

  amount: float | None = payload.amount
  meta: dict | None = None
  if payload.otp:
    otp = str(payload.otp).strip()
    try:
      session = verify_otp(email=uid, otp=otp)
      from app.demo_payment import clear_otp_session

      clear_otp_session(uid)
      amount = float(session.amount)
      meta = {"card_last4": session.card_last4, "payment": "otp_demo"}
    except ValueError as e:
      raise HTTPException(status_code=400, detail=str(e)) from e

  if amount is None:
    raise HTTPException(status_code=400, detail="amount is required")

  db = _get_db_optional()
  try:
    if db is not None:
      try:
        new_balance = float(db_add_funds(db, user_id=uid, amount=float(amount), status=payload.status, meta=meta))
        db.commit()
        # Include latest txs for convenience
        txs = db_list_transactions(db, user_id=uid, limit=50)
        tx_items = [
          TransactionItem(
            id=t.id,
            type=str(t.type),
            amount=float(t.amount),
            status=str(t.status),
            created_at=t.created_at.isoformat(),
            meta=t.meta,
          )
          for t in txs
        ]
        return DashboardResponse(balance=new_balance, portfolio=[], transactions=tx_items)
      except Exception:
        db.rollback()
        log.exception("DB error in /add-funds; falling back to demo")

    # Demo fallback: in-memory balance only
    new_balance = add_broker_funds(amount=float(amount))
    return DashboardResponse(balance=float(new_balance), portfolio=[], transactions=[])
  finally:
    _close_db(db)


@router.post("/analyze-finance", response_model=AnalyzeFinanceResponse)
def analyze_finance(payload: AnalyzeFinanceRequest) -> AnalyzeFinanceResponse:
  """Analyze personal finance and return structured insights."""

  try:
    sr = calculate_savings_rate_percent(income=payload.income, expenses=payload.expenses)
    ef = calculate_emergency_fund_months(savings=payload.savings, expenses=payload.expenses)
    score = calculate_health_score(income=payload.income, expenses=payload.expenses, savings=payload.savings)

    sip = recommend_monthly_sip(income=payload.income, expenses=payload.expenses)
    projection = sip_future_value(sip=float(sip), years=payload.years, annual_return=0.12)

    advice = build_basic_advice(
      income=payload.income,
      expenses=payload.expenses,
      savings=payload.savings,
      goal=payload.goal,
      years=payload.years,
    )

    return AnalyzeFinanceResponse(
      health_score=score,
      savings_rate=round(sr, 2),
      emergency_fund_months=round(ef, 2),
      sip_recommendation=sip,
      investment_projection=projection,
      advice=advice,
    )
  except FinanceError as e:
    raise HTTPException(status_code=400, detail=str(e)) from e
  except Exception:
    log.exception("Unexpected error in /analyze-finance")
    raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/ai-advice", response_model=AIAdviceResponse)
def ai_advice(payload: AIAdviceRequest, user_id: str = Depends(_get_user_id)) -> AIAdviceResponse:
  """Generate AI-based financial advice using OpenAI."""

  try:
    question = (payload.question or payload.query or "").strip()
    if not question:
      raise HTTPException(status_code=400, detail="question (or query) is required")

    warning: str | None = None
    try:
      answer = generate_advice_answer(
        question=question,
        income=payload.income,
        expenses=payload.expenses,
      )
    except AIAdvisorError as e:
      # Keep the UI functional even when OpenAI is down/misconfigured.
      log.warning("OpenAI advisor unavailable; using demo fallback: %s", str(e))
      answer = _demo_advice(question=question, income=payload.income, expenses=payload.expenses)
      warning = f"OpenAI unavailable. Showing demo advice. ({str(e)})"

    validated = validate_and_correct_advice(answer)
    advice_text = str(validated.get("advice", "")).strip()

    # Best-effort: persist audit log if DB is available.
    db = _get_db_optional()
    try:
      if db is not None:
        try:
          db_save_audit_log(
            db,
            user_id=user_id,
            event="ai_advice",
            message=question,
            payload={"warning": warning, "risk_level": validated.get("risk_level"), "confidence": validated.get("confidence")},
          )
          db.commit()
        except Exception:
          db.rollback()
    finally:
      _close_db(db)

    return AIAdviceResponse(
      advice=advice_text,
      risk_level=validated.get("risk_level", "Low"),
      confidence=float(validated.get("confidence", 80.0)) if warning is None else min(65.0, float(validated.get("confidence", 65.0))),
      warning=validated.get("warning") or warning,
      answer=advice_text,
    )
  except Exception:
    log.exception("Unexpected error in /ai-advice")
    raise HTTPException(status_code=502, detail="AI advisor unavailable")


@router.post("/ai-sip-plan", response_model=AISipPlanResponse)
def ai_sip_plan(payload: AISipPlanRequest, user_id: str = Depends(_get_user_id)) -> AISipPlanResponse:
  """Generate intelligent SIP plans from income/expenses (demo-safe, rule-based)."""

  income = float(payload.monthly_income)
  expenses = float(payload.monthly_expenses)
  savings = int(round(income - expenses))

  if savings <= 0:
    return AISipPlanResponse(
      monthly_savings=0,
      investment_allocation=AISipAllocation(sip=0, emergency=0, buffer=0),
      daily_sip_plan=[],
      broker_check="No SIP execution possible without positive savings",
      broker_balance=float(get_demo_state().broker_balance),
      warning="No investment possible (savings ≤ 0).",
      advice="No investment possible right now. Reduce expenses or increase income first, then start a small SIP.",
      risk_level="Low",
      confidence=90,
    )

  # Smart allocation
  sip_monthly = int(round(savings * 0.60))
  emergency = int(round(savings * 0.20))
  buffer = int(round(savings * 0.20))
  # Fix rounding drift to keep total consistent
  drift = savings - (sip_monthly + emergency + buffer)
  buffer += drift

  # Daily SIP conversion (simple demo: 30-day month)
  sip_daily = int(round(sip_monthly / 30.0))

  # Distribute daily SIP into 3 plans (ratios derived from example: 300/300/200)
  conservative = int(round(sip_daily * 0.375))
  balanced = int(round(sip_daily * 0.375))
  aggressive = max(0, sip_daily - conservative - balanced)

  plans = [
    AISipDailyPlanItem(plan="Conservative", amount_per_day=conservative, type="Index Funds"),
    AISipDailyPlanItem(plan="Balanced", amount_per_day=balanced, type="Index + Midcap"),
    AISipDailyPlanItem(plan="Aggressive", amount_per_day=aggressive, type="Stocks"),
  ]

  broker_balance = float(get_demo_state().broker_balance)
  db = _get_db_optional()
  try:
    if db is not None:
      try:
        broker_balance = float(db_get_balance(db, user_id=user_id))
      except Exception:
        db.rollback()
  finally:
    _close_db(db)
  max_required = max((p.amount_per_day for p in plans), default=0)
  warning: str | None = None
  if broker_balance < float(max_required):
    warning = "Insufficient broker balance. Please add funds to continue SIP."

  return AISipPlanResponse(
    monthly_savings=savings,
    investment_allocation=AISipAllocation(sip=sip_monthly, emergency=emergency, buffer=buffer),
    daily_sip_plan=plans,
    broker_check="Ensure sufficient balance before execution",
    broker_balance=broker_balance,
    warning=warning,
    advice="Invest consistently to grow corpus over time.",
    risk_level="Medium",
    confidence=85,
  )


class SipCreateRequest(BaseModel):
  amount_per_day: float = Field(..., gt=0, description="Daily investment amount (₹)")
  investment_type: Literal["stocks", "mutual_funds"] = Field(...)
  start_date: str = Field(..., description="ISO date YYYY-MM-DD")


class SipStatusResponse(BaseModel):
  demo_mode: bool
  amount_per_day: float
  investment_type: Literal["stocks", "mutual_funds"]
  start_date: str
  days_completed: int
  total_invested: float
  total_units: float
  current_price: float
  current_value: float
  profit_loss: float
  last_run_date: str | None = None


class SipRunDailyResponse(BaseModel):
  status: SipStatusResponse
  run: dict


def _sip_to_response_demo() -> SipStatusResponse:
  sip = get_sip()
  if sip is None:
    raise HTTPException(status_code=404, detail="No SIP found. Create one first.")

  return SipStatusResponse(
    demo_mode=True,
    amount_per_day=float(sip.amount_per_day),
    investment_type=sip.investment_type,
    start_date=sip.start_date.isoformat(),
    days_completed=int(sip.days_completed),
    total_invested=float(sip.total_invested),
    total_units=float(sip.total_units),
    current_price=float(sip.current_price()),
    current_value=float(sip.current_value()),
    profit_loss=float(sip.profit_loss()),
    last_run_date=sip.last_run_date.isoformat() if sip.last_run_date else None,
  )


def _sip_to_response_db(plan) -> SipStatusResponse:
  days_completed = int(plan.days_completed or 0)
  total_invested = float(plan.total_invested or 0)
  total_units = float(plan.total_units or 0)
  price = float(_price_for_day(str(plan.investment_type), days_completed))
  current_value = float(round(total_units * price, 2))
  profit_loss = float(round(current_value - total_invested, 2))

  return SipStatusResponse(
    demo_mode=False,
    amount_per_day=float(plan.amount_per_day),
    investment_type=str(plan.investment_type),
    start_date=plan.start_date.isoformat(),
    days_completed=days_completed,
    total_invested=total_invested,
    total_units=total_units,
    current_price=price,
    current_value=current_value,
    profit_loss=profit_loss,
    last_run_date=plan.last_run_date.isoformat() if plan.last_run_date else None,
  )


@router.post("/sip/create", response_model=SipStatusResponse)
def sip_create(payload: SipCreateRequest, user_id: str = Depends(_require_user_id)) -> SipStatusResponse:
  """Create a SIP plan (DB-backed when available, otherwise demo memory)."""

  # Feature access control:
  # Free users are limited to ₹100/day max SIP.
  amount_per_day = float(payload.amount_per_day)
  max_free = 100.0

  # Try DB first
  db = _get_db_optional()
  try:
    if db is not None:
      try:
        m = ensure_membership(db, user_id=user_id)
        plan = str(m.plan or "free").strip().lower() or "free"
        if plan == "free" and amount_per_day > max_free:
          raise HTTPException(status_code=403, detail=f"Free plan SIP limit is ₹{int(max_free)}/day. Upgrade membership to increase.")

        from datetime import date as _date

        start = _date.fromisoformat(payload.start_date)
        plan = db_create_sip_plan(
          db,
          user_id=user_id,
          amount_per_day=amount_per_day,
          investment_type=str(payload.investment_type),
          start_date=start,
        )
        db.commit()
        return _sip_to_response_db(plan)
      except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e
      except Exception:
        db.rollback()
        log.exception("DB error in /sip/create; falling back to demo")

    # Demo fallback
    if amount_per_day > max_free:
      raise HTTPException(status_code=403, detail=f"Free plan SIP limit is ₹{int(max_free)}/day. Upgrade membership to increase.")
    create_sip(
      amount_per_day=amount_per_day,
      investment_type=payload.investment_type,
      start_date=payload.start_date,
    )
    return _sip_to_response_demo()
  finally:
    _close_db(db)


@router.get("/sip/status", response_model=SipStatusResponse)
def sip_status(user_id: str = Depends(_require_user_id)) -> SipStatusResponse:
  """Get current SIP status (DB-backed per user when available)."""

  db = _get_db_optional()
  try:
    if db is not None:
      try:
        plan = get_latest_sip_plan(db, user_id=user_id)
        if plan is None:
          raise HTTPException(status_code=404, detail="No SIP found. Create one first.")
        return _sip_to_response_db(plan)
      except HTTPException:
        raise
      except Exception:
        db.rollback()
        log.exception("DB error in /sip/status; falling back to demo")

    return _sip_to_response_demo()
  finally:
    _close_db(db)


@router.post("/sip/run-daily", response_model=SipRunDailyResponse)
def sip_run_daily(user_id: str = Depends(_require_user_id)) -> SipRunDailyResponse:
  """Run one day of SIP: deduct balance and update invested/units."""

  db = _get_db_optional()
  try:
    if db is not None:
      try:
        plan, run_entry = db_run_daily_sip(db, user_id=user_id)
        db.commit()
        return SipRunDailyResponse(status=_sip_to_response_db(plan), run=run_entry)
      except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e
      except Exception:
        db.rollback()
        log.exception("DB error in /sip/run-daily; falling back to demo")

    # Demo fallback (deduct from demo broker balance)
    sip = get_sip()
    if sip is None:
      raise HTTPException(status_code=404, detail="No SIP found. Create one first.")

    state = get_demo_state()
    amount = float(sip.amount_per_day)
    if float(state.broker_balance) < amount:
      raise HTTPException(status_code=400, detail="Insufficient broker balance. Add funds to continue SIP.")

    state.broker_balance = float(state.broker_balance) - amount
    sip = run_daily()
    last_run = sip.run_history[-1] if sip.run_history else {}
    return SipRunDailyResponse(status=_sip_to_response_demo(), run=last_run)
  finally:
    _close_db(db)


@router.post("/sip/run", response_model=SipRunDailyResponse)
def sip_run(user_id: str = Depends(_require_user_id)) -> SipRunDailyResponse:
  """Alias for running one day of SIP."""

  return sip_run_daily(user_id=user_id)


@router.post("/run-ai-pipeline", response_model=RunAIPipelineResponse)
def run_ai_pipeline(payload: RunAIPipelineRequest, user_id: str = Depends(_require_user_id)) -> RunAIPipelineResponse:
  """Run the AutoCost AI end-to-end automation pipeline."""

  try:
    # Gold-only feature: full automation.
    db = _get_db_optional()
    try:
      plan = _get_membership_plan(db, user_id=user_id)
      if plan != "gold":
        raise HTTPException(status_code=403, detail="Gold membership required for automation.")
    finally:
      _close_db(db)

    # Only a single bundled dataset is supported right now.
    dataset_path = Path(__file__).resolve().parent / "data" / "autocost_sample.csv"
    result = run_pipeline(dataset_path=dataset_path, mode=payload.mode)
    return RunAIPipelineResponse(**result)
  except FileNotFoundError as e:
    raise HTTPException(status_code=404, detail=str(e)) from e
  except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e)) from e
  except Exception:
    log.exception("Unexpected error in /run-ai-pipeline")
    raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/broker/portfolio", response_model=BrokerPortfolioResponse)
def get_broker_portfolio(user_id: str = Depends(_require_user_id)) -> BrokerPortfolioResponse:
  """Return a demo portfolio from a local JSON file (no real broker API)."""

  try:
    db = _get_db_optional()
    try:
      if db is not None:
        try:
          holdings = db_get_portfolio(db, user_id=user_id)
          if len(holdings) == 0:
            json_path = Path(__file__).resolve().parent / "data" / "portfolio.json"
            demo = get_portfolio_payload(json_path=json_path)
            upsert_portfolio_from_demo(db, user_id=user_id, items=list(demo.get("portfolio") or []))
            db.commit()
            holdings = db_get_portfolio(db, user_id=user_id)

          items = [
            {"stock": h.stock, "quantity": float(h.quantity), "price": float(h.price)}
            for h in holdings
          ]
          total_value = compute_total_value(items) if items else 0.0
          return BrokerPortfolioResponse(
            user=str(user_id),
            portfolio=[BrokerPortfolioItem(**x) for x in items],
            total_value=round(float(total_value), 2),
          )
        except Exception:
          db.rollback()
          log.exception("DB error in /broker/portfolio; falling back to demo")
    finally:
      _close_db(db)

    json_path = Path(__file__).resolve().parent / "data" / "portfolio.json"
    data = get_portfolio_payload(json_path=json_path)
    total_value = compute_total_value(data["portfolio"]) if data.get("portfolio") else 0.0
    return BrokerPortfolioResponse(
      user=str(data["user"]),
      portfolio=[BrokerPortfolioItem(**x) for x in data["portfolio"]],
      total_value=round(total_value, 2),
    )
  except FileNotFoundError as e:
    raise HTTPException(status_code=404, detail=str(e)) from e
  except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e)) from e
  except Exception:
    log.exception("Unexpected error in /broker/portfolio")
    raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/analyze-portfolio", response_model=AnalyzePortfolioResponse)
def analyze_portfolio(payload: AnalyzePortfolioRequest, user_id: str = Depends(_require_user_id)) -> AnalyzePortfolioResponse:
  """Simulated AI analysis for a portfolio (rule-based demo)."""

  try:
    # Silver+ feature: advanced AI insights + risk analysis.
    db = _get_db_optional()
    try:
      plan = _get_membership_plan(db, user_id=user_id)
      if plan not in {"silver", "gold"}:
        raise HTTPException(status_code=403, detail="Silver membership required for risk analysis.")
    finally:
      _close_db(db)

    items = [x.model_dump() for x in payload.portfolio]
    result = analyze_portfolio_rules(items)
    return AnalyzePortfolioResponse(**result)
  except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e)) from e
  except Exception:
    log.exception("Unexpected error in /analyze-portfolio")
    raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/broker/balance", response_model=BrokerBalanceResponse)
def broker_balance(user_id: str = Depends(_require_user_id)) -> BrokerBalanceResponse:
  """Return the current demo broker balance."""

  try:
    db = _get_db_optional()
    try:
      if db is not None:
        try:
          bal = float(db_get_balance(db, user_id=user_id))
          return BrokerBalanceResponse(demo_mode=False, broker_balance=bal)
        except Exception:
          db.rollback()
          log.exception("DB error in /broker/balance; falling back to demo")
    finally:
      _close_db(db)

    return BrokerBalanceResponse(demo_mode=True, broker_balance=get_broker_balance())
  except Exception:
    log.exception("Unexpected error in /broker/balance")
    raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/send-otp", response_model=SendOtpResponse)
@limiter.limit("5/minute")
def send_otp(request: Request, payload: SendOtpRequest, user_id: str = Depends(_require_user_id)) -> SendOtpResponse:
  """Demo payment gateway: generate OTP and send to user's email.

  DEMO ONLY: No real payment capture is performed.
  Card details are never stored; only last4 is used for masking.
  """

  # Bind OTP sessions to the authenticated user.
  email = str(user_id).strip().lower()
  card_last4 = "".join([c for c in str(payload.card_last4) if c.isdigit()])
  if len(card_last4) != 4:
    raise HTTPException(status_code=400, detail="card_last4 must be exactly 4 digits")

  ttl = int(os.getenv("DEMO_OTP_TTL_SECONDS") or 180)
  ttl = max(120, min(300, ttl))  # 2–5 min

  otp = generate_otp()
  store_otp_session(email=email, otp=otp, amount=float(payload.amount), card_last4=card_last4, ttl_seconds=ttl)

  delivery_info = send_otp_email(to_email=email, otp=otp)
  delivery = str(delivery_info.get("delivery", "simulated"))
  warning = delivery_info.get("warning")
  reason = delivery_info.get("reason")
  smtp_error = delivery_info.get("smtp_error")

  require_smtp = (os.getenv("OTP_REQUIRE_SMTP") or "").strip().lower() in {"1", "true", "yes"}
  if require_smtp and delivery != "smtp":
    # If we couldn't actually email the OTP, don't allow the flow to continue.
    from app.demo_payment import clear_otp_session

    clear_otp_session(email)
    detail = "OTP email delivery failed. Configure Gmail SMTP (use an App Password) and try again."
    if reason:
      detail = f"{detail} reason={reason}"
    if warning:
      detail = f"{detail} warning={warning}"
    if smtp_error:
      detail = f"{detail} smtp_error={smtp_error}"
    raise HTTPException(
      status_code=502,
      detail=detail,
    )

  demo_return = (os.getenv("DEMO_RETURN_OTP") or "").strip().lower() in {"1", "true", "yes"}
  # Never echo OTP when SMTP is required.
  if require_smtp:
    demo_return = False

  return SendOtpResponse(
    status="otp_sent",
    delivery="smtp" if delivery == "smtp" else "simulated",
    expires_in_seconds=ttl,
    masked_card=f"**** **** **** {card_last4}",
    demo_mode=True,
    warning=str(warning) if warning else None,
    demo_otp=otp if demo_return else None,
  )


@router.post("/verify-otp", response_model=VerifyOtpResponse)
@limiter.limit("10/minute")
def verify_otp_route(request: Request, payload: VerifyOtpRequest, user_id: str = Depends(_require_user_id)) -> VerifyOtpResponse:
  """Demo payment gateway: verify OTP, then credit broker balance."""

  # Verify OTP for the authenticated user.
  email = str(user_id).strip().lower()
  otp = str(payload.otp).strip()

  try:
    session = verify_otp(email=email, otp=otp)
    from app.demo_payment import clear_otp_session

    clear_otp_session(email)

    amount = float(session.amount)
    meta = {"card_last4": session.card_last4, "payment": "otp_demo"}

    db = _get_db_optional()
    try:
      if db is not None:
        try:
          new_balance = float(db_add_funds(db, user_id=email, amount=amount, status="success", meta=meta))
          db.commit()
          return VerifyOtpResponse(status="success", new_balance=new_balance, demo_mode=False)
        except Exception:
          db.rollback()
          log.exception("DB error in /verify-otp; falling back to demo")

      # Demo fallback
      new_balance = float(add_broker_funds(amount=amount))
      return VerifyOtpResponse(status="success", new_balance=new_balance, demo_mode=True)
    finally:
      _close_db(db)
  except HTTPException:
    raise
  except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e)) from e
  except Exception:
    log.exception("Unexpected error in /verify-otp")
    raise HTTPException(status_code=500, detail="Internal server error")


class ResetDemoResponse(BaseModel):
  status: str
  sip_reset: bool
  portfolio_reset: bool
  broker_balance: float
  ai: dict


@router.post("/reset-demo", response_model=ResetDemoResponse)
def reset_demo() -> ResetDemoResponse:
  """Reset in-memory demo state to a fresh-zero baseline."""

  try:
    sip_reset = reset_sip_progress()

    json_path = Path(__file__).resolve().parent / "data" / "portfolio.json"
    reset_demo_portfolio(json_path=json_path)

    return ResetDemoResponse(
      status="ok",
      sip_reset=bool(sip_reset),
      portfolio_reset=True,
      broker_balance=get_broker_balance(),
      ai={"advice": "", "confidence": 0, "risk_level": ""},
    )
  except Exception:
    log.exception("Unexpected error in /reset-demo")
    raise HTTPException(status_code=500, detail="Internal server error")
