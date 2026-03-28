"""Daily SIP auto-investment simulation (demo mode only).

Stores state in-process (memory). No real transactions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Literal


InvestmentType = Literal["stocks", "mutual_funds"]


def _parse_date(value: str) -> date:
  try:
    return date.fromisoformat(value)
  except Exception as e:  # noqa: BLE001
    raise ValueError("start_date must be ISO date YYYY-MM-DD") from e


def _today() -> date:
  return datetime.utcnow().date()


def _price_for_day(investment_type: InvestmentType, day_index: int) -> float:
  """Deterministic demo price curve.

  - stocks: higher volatility
  - mutual_funds: smoother
  """

  if day_index < 0:
    day_index = 0

  if investment_type == "stocks":
    base = 100.0
    drift = 0.12
    wave = 4.0
  else:
    base = 50.0
    drift = 0.08
    wave = 1.8

  # Simple deterministic series
  price = base + (day_index * drift) + (wave * __import__("math").sin(day_index / 3.7))
  return max(1.0, float(round(price, 2)))


@dataclass
class SipState:
  amount_per_day: float
  investment_type: InvestmentType
  start_date: date
  created_at: datetime
  days_completed: int = 0
  total_invested: float = 0.0
  total_units: float = 0.0
  last_run_date: date | None = None
  run_history: list[dict] = field(default_factory=list)

  def current_price(self) -> float:
    return _price_for_day(self.investment_type, self.days_completed)

  def current_value(self) -> float:
    return float(round(self.total_units * self.current_price(), 2))

  def profit_loss(self) -> float:
    return float(round(self.current_value() - self.total_invested, 2))

  def run_daily(self) -> dict:
    day_idx = self.days_completed
    price = _price_for_day(self.investment_type, day_idx)

    invested = float(self.amount_per_day)
    units_bought = float(round(invested / price, 8))

    self.total_invested = float(round(self.total_invested + invested, 2))
    self.total_units = float(round(self.total_units + units_bought, 8))
    self.days_completed += 1
    self.last_run_date = _today() if self.last_run_date is None else (self.last_run_date + timedelta(days=1))

    entry = {
      "day": self.days_completed,
      "price": price,
      "invested": invested,
      "units_bought": units_bought,
      "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    self.run_history.append(entry)
    return entry


# Single demo SIP per backend process.
_DEMO_SIP: SipState | None = None


def create_sip(*, amount_per_day: float, investment_type: InvestmentType, start_date: str) -> SipState:
  global _DEMO_SIP

  if not (amount_per_day and amount_per_day > 0):
    raise ValueError("amount_per_day must be > 0")

  parsed = _parse_date(start_date)

  _DEMO_SIP = SipState(
    amount_per_day=float(round(amount_per_day, 2)),
    investment_type=investment_type,
    start_date=parsed,
    created_at=datetime.utcnow(),
  )
  return _DEMO_SIP


def get_sip() -> SipState | None:
  return _DEMO_SIP


def run_daily() -> SipState:
  if _DEMO_SIP is None:
    raise ValueError("No SIP found. Create one first.")

  _DEMO_SIP.run_daily()
  return _DEMO_SIP


def reset_sip_progress() -> bool:
  """Reset SIP progress counters to zero (demo only).

  Returns True if a SIP existed and was reset.
  """

  global _DEMO_SIP
  if _DEMO_SIP is None:
    return False

  _DEMO_SIP.days_completed = 0
  _DEMO_SIP.total_invested = 0.0
  _DEMO_SIP.total_units = 0.0
  _DEMO_SIP.last_run_date = None
  _DEMO_SIP.run_history.clear()
  return True
