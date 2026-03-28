"""Finance domain logic for AI Money Mentor.

This module contains pure computation functions used by the API layer.
All functions are Python 3.12 compatible and deterministic.
"""

from __future__ import annotations

import math


class FinanceError(ValueError):
  """Raised when finance calculations cannot be performed for given inputs."""

  pass


def clamp(value: float, low: float, high: float) -> float:
  """Clamp a numeric value into the inclusive range [low, high]."""

  return max(low, min(high, value))


def calculate_savings_rate_percent(*, income: float, expenses: float) -> float:
  """Calculate savings rate as percentage.

  Formula:
    savings_rate = (income - expenses) / income * 100
  """

  if income <= 0:
    raise FinanceError("income must be > 0")
  return ((income - expenses) / income) * 100.0


def calculate_emergency_fund_months(*, savings: float, expenses: float) -> float:
  """Calculate emergency fund buffer in months.

  Formula:
    emergency_fund_months = savings / expenses
  """

  if expenses <= 0:
    raise FinanceError("expenses must be > 0")
  if savings < 0:
    raise FinanceError("savings must be >= 0")
  return savings / expenses


def recommend_monthly_sip(*, income: float, expenses: float) -> int:
  """Recommend a monthly SIP amount (₹).

  Heuristic:
  - If monthly surplus <= 0: recommend 0
  - Else: invest ~70% of surplus as SIP
  """

  surplus = income - expenses
  if surplus <= 0:
    return 0
  return int(round(surplus * 0.70))


def sip_future_value(*, sip: float, years: int, annual_return: float = 0.12) -> int:
  """Project SIP future value using the standard SIP FV formula.

  Formula:
    FV = SIP × [((1+r)^n - 1) / r] × (1+r)

  Where:
  - r: monthly return rate
  - n: number of months

  Defaults:
  - annual_return = 12%

  Notes:
  - Uses years input to compute n = years * 12.
  """

  if sip <= 0:
    return 0
  if years <= 0:
    raise FinanceError("years must be > 0")

  monthly_rate = annual_return / 12.0
  if monthly_rate <= 0:
    raise FinanceError("annual_return must be > 0")

  n = years * 12
  r = monthly_rate

  fv = sip * ((math.pow(1 + r, n) - 1) / r) * (1 + r)
  return int(round(fv))


def _score_savings_rate(sr_percent: float) -> float:
  """Savings-rate score (0-100).

  Rule:
  - sr >= 30% => 100
  - sr <= 0%  => 0
  - Linear ramp in-between
  """

  return clamp((sr_percent / 30.0) * 100.0, 0.0, 100.0)


def _score_emergency_fund(ef_months: float) -> float:
  """Emergency-fund score (0-100).

  Rule:
  - ef >= 6 months => 100
  - ef <= 0 => 0
  - Linear ramp in-between
  """

  return clamp((ef_months / 6.0) * 100.0, 0.0, 100.0)


def _score_investment_potential(sip: float, income: float) -> float:
  """Investment potential score (0-100).

  Uses SIP as a fraction of income.
  - SIP >= 15% of income => 100
  - SIP <= 0 => 0
  - Linear ramp in-between
  """

  if income <= 0:
    return 0.0
  rate = sip / income
  return clamp((rate / 0.15) * 100.0, 0.0, 100.0)


def _score_expense_control(expenses: float, income: float) -> float:
  """Expense control score (0-100).

  Lower expenses are better.
  We use expense ratio = expenses / income.
  - ratio <= 50% => 100
  - ratio >= 90% => 0
  Linear ramp in-between.
  """

  if income <= 0:
    return 0.0
  ratio = expenses / income
  score = ((0.9 - ratio) / (0.9 - 0.5)) * 100.0
  return clamp(score, 0.0, 100.0)


def calculate_health_score(*, income: float, expenses: float, savings: float) -> int:
  """Calculate financial health score (0-100) using weighted components.

  Weights:
  - Savings rate: 30%
  - Emergency fund: 30%
  - Investment potential: 20%
  - Expense control: 20%

  Scoring rules (as requested):
  - Savings rate > 30% => high score
  - Emergency fund >= 6 months => full score
  - Lower expenses => better score
  """

  sr = calculate_savings_rate_percent(income=income, expenses=expenses)
  ef = calculate_emergency_fund_months(savings=savings, expenses=expenses)
  sip = recommend_monthly_sip(income=income, expenses=expenses)

  s1 = _score_savings_rate(sr)
  s2 = _score_emergency_fund(ef)
  s3 = _score_investment_potential(sip, income)
  s4 = _score_expense_control(expenses, income)

  total = round(0.30 * s1 + 0.30 * s2 + 0.20 * s3 + 0.20 * s4)
  return int(clamp(float(total), 0.0, 100.0))


def build_basic_advice(*, income: float, expenses: float, savings: float, goal: str, years: int) -> str:
  """Generate basic, practical advice for an Indian user.

  This is a deterministic fallback advice string for /analyze-finance.
  The AI endpoint can provide deeper personalized answers.
  """

  sr = calculate_savings_rate_percent(income=income, expenses=expenses)
  ef = calculate_emergency_fund_months(savings=savings, expenses=expenses)
  sip = recommend_monthly_sip(income=income, expenses=expenses)

  tips: list[str] = []

  if sr < 0:
    tips.append("Your expenses are higher than income. Cut discretionary spending and/or increase income first.")
  elif sr < 20:
    tips.append("Aim for a 20%+ savings rate. Start with a simple 50/30/20 split and track your top 2 categories.")
  elif sr < 30:
    tips.append("Good progress. Increasing savings rate above 30% will accelerate wealth compounding.")
  else:
    tips.append("Strong savings rate. Keep it consistent and automate investing.")

  if ef < 3:
    tips.append("Build an emergency fund of 6 months expenses. Keep it in a liquid fund/sweep FD for quick access.")
  elif ef < 6:
    tips.append("You're close to the 6-month emergency fund target. Top it up gradually.")
  else:
    tips.append("Emergency fund looks healthy. Now focus on long-term investments.")

  if sip <= 0:
    tips.append("Start a small SIP once you have positive monthly surplus (even ₹500-₹2,000).")
  else:
    tips.append("Set up an auto-debit SIP and review allocation quarterly (equity + debt mix).")

  if goal.strip():
    tips.append(
      f"For your goal: {goal.strip()} - stay consistent for {years} year(s) and avoid breaking long-term investments."
    )

  return " ".join(tips)
