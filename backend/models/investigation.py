from typing import Any, Optional

from pydantic import BaseModel


class VerdictResult(BaseModel):
    verdict: str
    confidence: int
    uncertainty: int
    reasoning: list[str]
    signals: list[dict[str, Any]]


class ArtifactResult(BaseModel):
    filename: str
    content_type: str
    size_bytes: int
    sha256: str
    modality: str
    image_forensics: Optional[dict[str, Any]] = None


class EvidenceRelationship(BaseModel):
    source: str
    target: str
    relationship: str
    consistency_score: int
    explanation: str


class ComparisonResult(BaseModel):
    artifact_count: int
    relationships: list[EvidenceRelationship]
    artifact_scores: dict[str, int]
    summary: str


class InvestigationResponse(BaseModel):
    status: str
    context: Optional[str]
    artifact_count: int
    artifacts: list[ArtifactResult]
    comparison: ComparisonResult
    verdict: VerdictResult
    message: str

