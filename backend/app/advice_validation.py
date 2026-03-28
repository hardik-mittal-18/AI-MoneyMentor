"""Validation + correction layer for AI financial advice (demo-safe).

Goals:
- Detect and block unsafe or misleading claims (e.g., guaranteed profit).
- Detect unrealistic return expectations.
- Return structured metadata: risk_level, confidence, warning.

This is intentionally rule-based and deterministic.
"""

from __future__ import annotations

import re


_UNSAFE_PHRASES = [
  re.compile(r"\bguaranteed\s+profit\b", re.IGNORECASE),
  re.compile(r"\bguaranteed\s+returns?\b", re.IGNORECASE),
  re.compile(r"\b100%\s+return\b", re.IGNORECASE),
  re.compile(r"\brisk-?free\b", re.IGNORECASE),
]

# Very rough pattern for monthly return percentages, e.g. "30% per month" / "30% monthly"
_MONTHLY_RETURN = re.compile(r"(?P<pct>\d{1,3}(?:\.\d+)?)\s*%\s*(?:per\s*month|monthly)", re.IGNORECASE)


def _detect_unrealistic_monthly_return(text: str) -> float | None:
  match = _MONTHLY_RETURN.search(text)
  if not match:
    return None
  try:
    return float(match.group("pct"))
  except Exception:  # noqa: BLE001
    return None


def validate_and_correct_advice(text: str) -> dict:
  """Validate and (if needed) correct advice.

  Returns:
    {
      advice: str,
      risk_level: "Low"|"Medium"|"High",
      confidence: float (0-100),
      warning?: str
    }
  """

  original = (text or "").strip()
  advice = original
  risk_level = "Low"
  confidence = 92.0
  warning: str | None = None

  if not advice:
    return {
      "advice": "I couldn't generate advice right now. Please try again.",
      "risk_level": "Medium",
      "confidence": 60.0,
      "warning": "Unable to provide a confident answer. Please verify before investing.",
    }

  unsafe_hits = any(p.search(advice) for p in _UNSAFE_PHRASES)
  monthly_pct = _detect_unrealistic_monthly_return(advice)
  unrealistic_return = monthly_pct is not None and monthly_pct > 25

  if unsafe_hits or unrealistic_return:
    risk_level = "High"
    confidence = 72.0
    warning = "This is a high-risk suggestion. Please verify before investing."

    # Rewrite: strip unsafe claims and add safety language.
    cleaned = advice
    cleaned = re.sub(r"\bguaranteed\b", "not guaranteed", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\brisk-?free\b", "lower risk", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b100%\s+return\b", "high returns", cleaned, flags=re.IGNORECASE)

    if unrealistic_return and monthly_pct is not None:
      cleaned += (
        "\n\nNote: A target of "
        f"{monthly_pct:.0f}% monthly returns is typically unrealistic. "
        "Consider a long-term plan with diversified assets and realistic expectations."
      )

    cleaned += (
      "\n\nSafety note: There are no guaranteed profits in markets. "
      "Diversify, consider your risk tolerance, and consult a qualified advisor if unsure."
    )

    advice = cleaned.strip()

  # Medium risk if leverage/derivatives language appears
  if re.search(r"\b(leverage|options|futures|margin)\b", advice, flags=re.IGNORECASE):
    risk_level = "High" if risk_level == "High" else "Medium"
    confidence = min(confidence, 80.0)
    warning = warning or "This involves higher risk instruments. Please verify before investing."

  # Clamp confidence
  confidence = max(50.0, min(98.0, confidence))

  result = {
    "advice": advice,
    "risk_level": risk_level,
    "confidence": round(confidence, 1),
  }
  if warning:
    result["warning"] = warning
  return result
