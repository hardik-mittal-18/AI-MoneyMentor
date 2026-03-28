"""In-process demo state for resettable UI demos.

This keeps the demo usable without requiring real broker connections or
persistent storage.

State is per-backend-process (memory). Restarting the backend also resets it.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.broker_demo import load_demo_portfolio


@dataclass
class DemoState:
  broker_balance: float = 0.0
  # When set, overrides portfolio.json output (e.g. after reset).
  portfolio_override: list[dict] | None = None


_STATE = DemoState()


def get_demo_state() -> DemoState:
  return _STATE


def get_portfolio_payload(*, json_path: Path) -> dict:
  """Return portfolio payload, using override when present."""

  if _STATE.portfolio_override is not None:
    # Keep the same shape as portfolio.json output.
    return {"user": "Demo User", "portfolio": list(_STATE.portfolio_override)}

  return load_demo_portfolio(json_path)


def reset_demo_portfolio(*, json_path: Path) -> dict:
  """Reset portfolio to zero-quantity holdings for demo."""

  base = load_demo_portfolio(json_path)
  stocks = [str(x.get("stock", "")).strip().upper() for x in base.get("portfolio", [])]

  override: list[dict] = []
  for s in stocks:
    if not s:
      continue
    override.append({"stock": s, "quantity": 0.0, "price": 0.0})

  _STATE.portfolio_override = override
  _STATE.broker_balance = 0.0
  return {"user": "Demo User", "portfolio": list(override)}


def clear_demo_overrides() -> None:
  _STATE.portfolio_override = None


def add_broker_funds(*, amount: float) -> float:
  """Add funds to the demo broker balance and return new balance."""

  amt = float(amount)
  if amt <= 0:
    raise ValueError("Amount must be > 0")
  _STATE.broker_balance = float(_STATE.broker_balance) + amt
  return float(_STATE.broker_balance)


def get_broker_balance() -> float:
  return float(_STATE.broker_balance)
