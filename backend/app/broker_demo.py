"""Demo-mode broker integration and portfolio analysis.

This module is intentionally rule-based and deterministic.
It simulates a broker portfolio fetch (from local JSON) and a lightweight
"AI" analysis step for UI demos.
"""

from __future__ import annotations

import json
from pathlib import Path


STOCK_TO_SECTOR: dict[str, str] = {
  "RELIANCE": "Energy",
  "TCS": "IT",
  "INFY": "IT",
  "HDFCBANK": "Banking",
  "ICICIBANK": "Banking",
  "SBIN": "Banking",
  "ITC": "FMCG",
  "HINDUNILVR": "FMCG",
}


def compute_total_value(portfolio: list[dict]) -> float:
  return float(sum(float(x["quantity"]) * float(x["price"]) for x in portfolio))


def load_demo_portfolio(json_path: Path) -> dict:
  if not json_path.exists():
    raise FileNotFoundError(f"Portfolio file not found: {json_path}")

  payload = json.loads(json_path.read_text(encoding="utf-8"))
  if not isinstance(payload, dict):
    raise ValueError("portfolio.json must contain a JSON object")

  user = payload.get("user")
  portfolio = payload.get("portfolio")
  if not isinstance(user, str) or not user.strip():
    raise ValueError("portfolio.json must include a non-empty 'user' string")
  if not isinstance(portfolio, list) or len(portfolio) == 0:
    raise ValueError("portfolio.json must include a non-empty 'portfolio' list")

  # basic normalization + validation
  normalized: list[dict] = []
  for idx, item in enumerate(portfolio):
    if not isinstance(item, dict):
      raise ValueError(f"portfolio[{idx}] must be an object")

    stock = str(item.get("stock", "")).strip().upper()
    quantity = item.get("quantity")
    price = item.get("price")

    if not stock:
      raise ValueError(f"portfolio[{idx}].stock is required")
    try:
      q = float(quantity)
      p = float(price)
    except Exception as e:  # noqa: BLE001
      raise ValueError(f"portfolio[{idx}] quantity/price must be numbers") from e

    if q <= 0:
      raise ValueError(f"portfolio[{idx}].quantity must be > 0")
    if p <= 0:
      raise ValueError(f"portfolio[{idx}].price must be > 0")

    normalized.append({"stock": stock, "quantity": q, "price": p})

  return {"user": user.strip(), "portfolio": normalized}


def analyze_portfolio_rules(portfolio: list[dict]) -> dict:
  """Rule-based analysis to simulate AI portfolio insights."""

  total_value = compute_total_value(portfolio)
  if total_value <= 0:
    return {
      "risks": ["Portfolio value is zero"],
      "suggestions": [],
      "opportunities": [],
      "estimated_gain": 0.0,
      "confidence_score": 50.0,
    }

  # allocations
  per_stock_value: dict[str, float] = {}
  for item in portfolio:
    stock = str(item["stock"]).upper()
    value = float(item["quantity"]) * float(item["price"])
    per_stock_value[stock] = per_stock_value.get(stock, 0.0) + value

  per_sector_value: dict[str, float] = {}
  for stock, value in per_stock_value.items():
    sector = STOCK_TO_SECTOR.get(stock, "Other")
    per_sector_value[sector] = per_sector_value.get(sector, 0.0) + value

  stock_allocations = sorted(
    ((stock, value / total_value) for stock, value in per_stock_value.items()),
    key=lambda x: x[1],
    reverse=True,
  )

  sector_allocations = sorted(
    ((sector, value / total_value) for sector, value in per_sector_value.items()),
    key=lambda x: x[1],
    reverse=True,
  )

  risks: list[str] = []
  suggestions: list[str] = []
  opportunities: list[str] = []

  # Risk 1: sector concentration
  if sector_allocations:
    top_sector, top_sector_pct = sector_allocations[0]
    if top_sector_pct >= 0.55:
      risks.append(f"Overexposure to {top_sector} sector")
      suggestions.append(f"Reduce {top_sector} exposure by 10–20% to diversify")
    elif top_sector_pct >= 0.45:
      risks.append(f"High concentration in {top_sector} sector")

  # Risk 2: single-stock concentration
  for stock, pct in stock_allocations[:2]:
    if pct >= 0.40:
      risks.append(f"High allocation to {stock} ({int(round(pct * 100))}%)")
      suggestions.append(f"Trim {stock} by ~15% and rebalance")

  # Opportunities: suggest adding underrepresented sectors
  banking_pct = next((pct for sector, pct in sector_allocations if sector == "Banking"), 0.0)
  if banking_pct < 0.10:
    opportunities.append("Consider adding banking stocks for diversification")

  # If IT is dominant, provide concrete IT reduction suggestion
  it_pct = next((pct for sector, pct in sector_allocations if sector == "IT"), 0.0)
  if it_pct >= 0.45 and "INFY" in per_stock_value:
    suggestions.append("Reduce INFY allocation by 20%")

  # Always provide at least one suggestion/opportunity for demo UX
  if not suggestions:
    suggestions.append("Rebalance periodically and keep any one stock below 25%")
  if not opportunities:
    opportunities.append("Review defensive sectors (FMCG/Pharma) for stability")

  # Estimated gain: simulate modest improvement from rebalancing
  # Tie gain to portfolio size and concentration.
  concentration_bonus = 0.0
  if sector_allocations and sector_allocations[0][1] >= 0.45:
    concentration_bonus += 0.010
  if stock_allocations and stock_allocations[0][1] >= 0.35:
    concentration_bonus += 0.008

  estimated_gain = round(total_value * (0.012 + concentration_bonus), 2)

  confidence_score = 86.0
  if "Other" in per_sector_value:
    confidence_score -= 6.0
  confidence_score = max(60.0, min(95.0, confidence_score))

  return {
    "risks": risks,
    "suggestions": suggestions,
    "opportunities": opportunities,
    "estimated_gain": estimated_gain,
    "confidence_score": confidence_score,
  }
