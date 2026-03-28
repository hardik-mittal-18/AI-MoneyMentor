"""AutoCost AI pipeline.

Implements a deterministic, rule-based end-to-end automation pipeline:
- Load dataset (CSV)
- Detect anomalies (duplicates, >20% above average, sudden spikes)
- Generate recommendations (rule-based)
- Apply simulated fixes (remove duplicates, reduce high/spike costs by 10–30%)
- Calculate savings impact
- Emit audit logs per action

This module is dependency-free (stdlib only) to keep deployment simple.
"""

from __future__ import annotations

import csv
import hashlib
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Literal


DatasetMode = Literal["auto", "manual"]


@dataclass(frozen=True)
class CostRecord:
  record_id: str
  date: str
  service: str
  owner: str
  cost_inr: float
  notes: str


@dataclass(frozen=True)
class Anomaly:
  anomaly_type: Literal["duplicate", "high_cost", "spike"]
  record_id: str
  date: str
  service: str
  owner: str
  cost_inr: float
  issue: str
  recommendation: str
  expected_savings: float
  reasoning: str
  confidence_score: float


@dataclass(frozen=True)
class Action:
  record_id: str
  action_taken: str
  reason: str
  savings_generated: float


@dataclass(frozen=True)
class AuditLog:
  timestamp: str
  issue: str
  action_taken: str
  reason: str
  savings_generated: float


def _utc_ts() -> str:
  return datetime.now(timezone.utc).isoformat()


def _clamp(value: float, low: float, high: float) -> float:
  return max(low, min(high, value))


def _stable_percent(record_id: str, low: float = 0.10, high: float = 0.30) -> float:
  """Stable pseudo-random percentage in [low, high] based on record id."""

  digest = hashlib.sha256(record_id.encode("utf-8")).hexdigest()
  # take 8 hex chars -> int
  n = int(digest[:8], 16)
  r = (n % 10_000) / 10_000.0
  return low + (high - low) * r


def load_cost_dataset(csv_path: Path) -> list[CostRecord]:
  if not csv_path.exists():
    raise FileNotFoundError(f"Dataset not found: {csv_path}")

  records: list[CostRecord] = []
  with csv_path.open("r", encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    required = {"record_id", "date", "service", "owner", "cost_inr", "notes"}
    if not required.issubset(set(reader.fieldnames or [])):
      raise ValueError(f"CSV must include columns: {sorted(required)}")

    for row in reader:
      cost = float(row["cost_inr"])
      records.append(
        CostRecord(
          record_id=str(row["record_id"]).strip(),
          date=str(row["date"]).strip(),
          service=str(row["service"]).strip(),
          owner=str(row["owner"]).strip(),
          cost_inr=cost,
          notes=str(row.get("notes", "")).strip(),
        )
      )

  return records


def _mean(values: Iterable[float]) -> float:
  items = list(values)
  if not items:
    return 0.0
  return sum(items) / len(items)


def detect_anomalies(records: list[CostRecord]) -> list[Anomaly]:
  if not records:
    return []

  avg_cost = _mean(r.cost_inr for r in records)
  high_cost_threshold = avg_cost * 1.2

  # duplicates: same service+owner+date+cost counted multiple times
  key_to_first_idx: dict[tuple[str, str, str, float], int] = {}
  duplicate_indices: set[int] = set()
  for idx, r in enumerate(records):
    k = (r.date, r.service, r.owner, float(r.cost_inr))
    if k in key_to_first_idx:
      duplicate_indices.add(idx)
    else:
      key_to_first_idx[k] = idx

  # spikes: compare within service+owner over time ordering
  by_stream: dict[tuple[str, str], list[tuple[str, int, CostRecord]]] = {}
  for idx, r in enumerate(records):
    by_stream.setdefault((r.service, r.owner), []).append((r.date, idx, r))

  spike_indices: set[int] = set()
  for _stream, items in by_stream.items():
    items_sorted = sorted(items, key=lambda t: t[0])
    prev_cost: float | None = None
    for _date, idx, r in items_sorted:
      if prev_cost is None:
        prev_cost = r.cost_inr
        continue
      # spike if +50% over previous and also above average threshold
      if prev_cost > 0 and r.cost_inr >= prev_cost * 1.5 and r.cost_inr >= high_cost_threshold:
        spike_indices.add(idx)
      prev_cost = r.cost_inr

  anomalies: list[Anomaly] = []

  for idx, r in enumerate(records):
    if idx in duplicate_indices:
      confidence = 0.95
      issue = "Duplicate cost entry"
      recommendation = "Remove duplicate record to avoid double-billing."
      expected = float(r.cost_inr)
      reasoning = "Same date/service/owner/cost appears more than once."
      anomalies.append(
        Anomaly(
          anomaly_type="duplicate",
          record_id=r.record_id,
          date=r.date,
          service=r.service,
          owner=r.owner,
          cost_inr=float(r.cost_inr),
          issue=issue,
          recommendation=recommendation,
          expected_savings=expected,
          reasoning=reasoning,
          confidence_score=confidence,
        )
      )
      continue

    if idx in spike_indices:
      ratio = r.cost_inr / max(1.0, avg_cost)
      confidence = _clamp((ratio - 1.2) / 1.3 + 0.65, 0.60, 0.92)
      percent = _stable_percent(r.record_id, 0.10, 0.30)
      expected = float(r.cost_inr * percent)
      issue = "Sudden cost spike"
      recommendation = "Investigate spike; apply temporary throttling/rightsizing to reduce cost."
      reasoning = "Cost increased sharply vs previous period in the same service stream."
      anomalies.append(
        Anomaly(
          anomaly_type="spike",
          record_id=r.record_id,
          date=r.date,
          service=r.service,
          owner=r.owner,
          cost_inr=float(r.cost_inr),
          issue=issue,
          recommendation=recommendation,
          expected_savings=expected,
          reasoning=reasoning,
          confidence_score=confidence,
        )
      )
      continue

    if r.cost_inr >= high_cost_threshold:
      ratio = r.cost_inr / max(1.0, avg_cost)
      confidence = _clamp((ratio - 1.2) / 1.0 + 0.55, 0.55, 0.90)
      percent = _stable_percent(r.record_id, 0.10, 0.30)
      expected = float(r.cost_inr * percent)
      issue = "Cost above average (>20%)"
      recommendation = "Rightsize or optimize configuration to reduce cost by 10–30%."
      reasoning = f"Cost {r.cost_inr:.0f} is above threshold {high_cost_threshold:.0f} based on dataset average."
      anomalies.append(
        Anomaly(
          anomaly_type="high_cost",
          record_id=r.record_id,
          date=r.date,
          service=r.service,
          owner=r.owner,
          cost_inr=float(r.cost_inr),
          issue=issue,
          recommendation=recommendation,
          expected_savings=expected,
          reasoning=reasoning,
          confidence_score=confidence,
        )
      )

  # Sort anomalies: duplicates first (highest certainty), then by expected savings desc
  anomalies.sort(key=lambda a: (0 if a.anomaly_type == "duplicate" else 1, -a.expected_savings))
  return anomalies


def apply_fixes(
  records: list[CostRecord],
  anomalies: list[Anomaly],
  *,
  mode: DatasetMode,
) -> tuple[list[CostRecord], list[Action], list[AuditLog]]:
  """Apply simulated fixes.

  In "manual" mode, no changes are applied (preview only).
  """

  if mode == "manual":
    return records, [], []

  # remove duplicates (based on same key as detection)
  seen: set[tuple[str, str, str, float]] = set()
  deduped: list[CostRecord] = []
  for r in records:
    k = (r.date, r.service, r.owner, float(r.cost_inr))
    if k in seen:
      continue
    seen.add(k)
    deduped.append(r)

  by_id = {r.record_id: r for r in deduped}

  actions: list[Action] = []
  logs: list[AuditLog] = []

  fixed: list[CostRecord] = []
  anomaly_by_id: dict[str, Anomaly] = {a.record_id: a for a in anomalies}

  for r in deduped:
    a = anomaly_by_id.get(r.record_id)
    if not a:
      fixed.append(r)
      continue

    if a.anomaly_type == "duplicate":
      # duplicates already removed; remaining record is kept
      fixed.append(r)
      continue

    percent = _stable_percent(r.record_id, 0.10, 0.30)
    new_cost = float(r.cost_inr * (1.0 - percent))
    savings = float(r.cost_inr - new_cost)

    action_taken = "Reduce cost"
    reason = a.recommendation

    fixed.append(
      CostRecord(
        record_id=r.record_id,
        date=r.date,
        service=r.service,
        owner=r.owner,
        cost_inr=new_cost,
        notes=r.notes,
      )
    )

    actions.append(
      Action(
        record_id=r.record_id,
        action_taken=f"{action_taken} ({int(round(percent * 100))}% reduction)",
        reason=reason,
        savings_generated=savings,
      )
    )

    logs.append(
      AuditLog(
        timestamp=_utc_ts(),
        issue=a.issue,
        action_taken=f"{action_taken} ({int(round(percent * 100))}% reduction)",
        reason=a.reasoning,
        savings_generated=savings,
      )
    )

  # Also add logs for removed duplicates (savings = removed cost)
  # We derive removed duplicates by comparing totals.
  total_before = sum(r.cost_inr for r in records)
  total_after_dedup = sum(r.cost_inr for r in deduped)
  dedup_savings = float(total_before - total_after_dedup)
  if dedup_savings > 0:
    logs.append(
      AuditLog(
        timestamp=_utc_ts(),
        issue="Duplicate entries removed",
        action_taken="Remove duplicates",
        reason="Duplicate keys were detected and removed to prevent double-counting.",
        savings_generated=dedup_savings,
      )
    )
    actions.append(
      Action(
        record_id="*",
        action_taken="Remove duplicates",
        reason="Duplicate keys detected",
        savings_generated=dedup_savings,
      )
    )

  return fixed, actions, logs


def calculate_totals(records: list[CostRecord]) -> float:
  return float(sum(r.cost_inr for r in records))


def run_pipeline(*, dataset_path: Path, mode: DatasetMode) -> dict:
  """Run the full pipeline and return a JSON-serializable dict."""

  pipeline_logs: list[str] = []

  pipeline_logs.append("Processing Data...")
  records = load_cost_dataset(dataset_path)

  pipeline_logs.append("Detecting Anomalies...")
  anomalies = detect_anomalies(records)

  pipeline_logs.append("Generating Recommendations...")
  # recommendations are embedded in anomalies (rule-based)

  pipeline_logs.append("Applying Fixes...")
  fixed_records, actions, audit_logs = apply_fixes(records, anomalies, mode=mode)

  pipeline_logs.append("Calculating Savings...")
  total_before = calculate_totals(records)
  total_after = calculate_totals(fixed_records)

  savings = float(max(0.0, total_before - total_after))
  improvement_percent = float((savings / total_before) * 100.0) if total_before > 0 else 0.0

  avg_confidence = float(_mean(a.confidence_score for a in anomalies)) if anomalies else 0.0

  return {
    "total_before": round(total_before, 2),
    "total_after": round(total_after, 2),
    "savings": round(savings, 2),
    "improvement_percent": round(improvement_percent, 2),
    "ai_confidence_score": round(avg_confidence * 100.0, 2),
    "anomalies": [
      {
        "type": a.anomaly_type,
        "record_id": a.record_id,
        "date": a.date,
        "service": a.service,
        "owner": a.owner,
        "cost_inr": round(a.cost_inr, 2),
        "confidence_score": round(a.confidence_score, 3),
        "issue": a.issue,
        "recommendation": a.recommendation,
        "expected_savings": round(a.expected_savings, 2),
        "reasoning": a.reasoning,
      }
      for a in anomalies
    ],
    "actions": [
      {
        "record_id": x.record_id,
        "action_taken": x.action_taken,
        "reason": x.reason,
        "savings_generated": round(x.savings_generated, 2),
      }
      for x in actions
    ],
    "logs": [
      {
        "timestamp": l.timestamp,
        "issue": l.issue,
        "action_taken": l.action_taken,
        "reason": l.reason,
        "savings_generated": round(l.savings_generated, 2),
      }
      for l in audit_logs
    ],
    "pipeline_steps": pipeline_logs,
    "mode": mode,
    "record_count": len(records),
  }
