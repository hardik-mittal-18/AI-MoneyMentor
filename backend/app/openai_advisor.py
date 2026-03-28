"""OpenAI advisor integration for AI Money Mentor.

This module encapsulates all OpenAI API calls and related error handling.
"""

from __future__ import annotations

import os

try:
  from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover
  OpenAI = None  # type: ignore


class AIAdvisorError(RuntimeError):
  """Raised when the AI advisor cannot generate a response."""

  pass


def generate_advice_answer(*, question: str, income: float, expenses: float) -> str:
  """Generate AI-based financial advice using OpenAI Chat Completions.

  Environment:
  - OPENAI_API_KEY is loaded from `.env` (via python-dotenv in main.py)

  Prompt:
    "You are a smart financial advisor for Indian users. Give practical, simple advice."

  Returns:
  - answer string
  """

  api_key = os.getenv("OPENAI_API_KEY")
  if not api_key:
    raise AIAdvisorError("OPENAI_API_KEY is not set")

  if OpenAI is None:
    raise AIAdvisorError("OpenAI SDK not installed")

  model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
  timeout_seconds = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "20"))

  client = OpenAI(api_key=api_key, timeout=timeout_seconds)

  system_prompt = "You are a smart financial advisor for Indian users. Give practical, simple advice."
  user_prompt = (
    f"User question: {question}\n\n"
    f"User context (monthly): income=₹{income:.0f}, expenses=₹{expenses:.0f}.\n"
    "Answer with practical steps. Use ₹. Keep it concise and actionable."
  )

  try:
    resp = client.chat.completions.create(
      model=model,
      messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
      ],
      temperature=0.4,
      max_tokens=450,
    )
  except Exception as e:
    raise AIAdvisorError("OpenAI request failed") from e

  content = (resp.choices[0].message.content or "").strip()
  if not content:
    raise AIAdvisorError("Empty response from AI advisor")

  return content
