"""Shared API response models for TrustLayer (Teammate 3 / API contract).

InvestigationVerdict is the validated JSON contract the frontend consumes.
Teammate 2 may export a richer type; we re-export / fall back to this schema.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class VerdictLabel(str, Enum):
    AUTHENTIC = "AUTHENTIC"
    MANIPULATED = "MANIPULATED"
    CONTRADICTORY = "CONTRADICTORY"
    INCONCLUSIVE = "INCONCLUSIVE"


class ContradictionFinding(BaseModel):
    claim: str = Field(..., description="Claim or signal under dispute")
    conflicting_signal: str = Field(..., description="Opposing evidence")
    severity: float = Field(ge=0.0, le=1.0, description="0=low, 1=critical")
    sources: list[str] = Field(default_factory=list)


class InvestigationVerdict(BaseModel):
    """Validated investigation response returned by POST /api/investigate."""

    case_id: str = Field(..., description="Stable id for this investigation run")
    verdict: VerdictLabel
    confidence: float = Field(ge=0.0, le=1.0)
    authenticity_score: float = Field(
        ge=0.0, le=1.0, description="1.0 = fully authentic"
    )
    summary: str
    contradictions: list[ContradictionFinding] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    artifact_names: list[str] = Field(default_factory=list)
    telemetry: dict[str, Any] = Field(default_factory=dict)
    processing_time_seconds: float = Field(ge=0.0, default=0.0)
    mock: bool = Field(default=False, description="True when served from mock path")
    fallback: bool = Field(
        default=False,
        description="True when T1/T2 failed and a safe fallback was returned",
    )
    error_note: Optional[str] = Field(
        default=None,
        description="Non-fatal pipeline note for operators (never crash the UI)",
    )


class BenchmarkMetrics(BaseModel):
    overall_accuracy_pct: float
    contradiction_precision: float
    contradiction_recall: float
    average_latency_seconds: float
    total_cases: int
    correct_verdicts: int
    true_positives: int
    false_positives: int
    false_negatives: int
    case_results: list[dict[str, Any]] = Field(default_factory=list)
    mock: bool = False
