"""Membership subscription routes (/membership).

Provides:
- GET /membership/status
- POST /membership/buy

Membership is SaaS-style and attached to the authenticated user.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.authz import require_user
from app.db_deps import get_db_required
from app.limiter import limiter
from app.models import User
from app.storage import buy_membership, get_membership_status, normalize_plan, price_for_plan


router = APIRouter(prefix="/membership", tags=["membership"])


class MembershipStatusResponse(BaseModel):
  plan: str
  price: float
  start_date: str


class BuyMembershipRequest(BaseModel):
  plan: str = Field(..., min_length=1, max_length=16)


class BuyMembershipResponse(BaseModel):
  status: str
  payment: str
  membership: MembershipStatusResponse


@router.get("/status", response_model=MembershipStatusResponse)
@limiter.limit("60/minute")
def status(request: Request, current_user: User = Depends(require_user), db: Session = Depends(get_db_required)) -> MembershipStatusResponse:
  m = get_membership_status(db, user_id=str(current_user.id))
  db.commit()
  return MembershipStatusResponse(
    plan=str(m.plan or "free"),
    price=float(m.price or 0),
    start_date=(m.start_date or datetime.now(timezone.utc)).isoformat(),
  )


@router.post("/buy", response_model=BuyMembershipResponse)
@limiter.limit("20/minute")
def buy(request: Request, payload: BuyMembershipRequest, current_user: User = Depends(require_user), db: Session = Depends(get_db_required)) -> BuyMembershipResponse:
  try:
    plan = normalize_plan(payload.plan)
  except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e)) from e

  try:
    m = buy_membership(db, user_id=str(current_user.id), plan=plan)
  except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e)) from e
  db.commit()

  return BuyMembershipResponse(
    status="ok",
    payment="balance_debit",
    membership=MembershipStatusResponse(
      plan=str(m.plan or "free"),
      price=float(price_for_plan(plan)),
      start_date=(m.start_date or datetime.now(timezone.utc)).isoformat(),
    ),
  )
