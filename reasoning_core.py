"""
TrustLayer: Multi-Modal Authenticity Engine
Alias module for `reasoner.py` as specified in Team Blueprint (Workstream 2 & Workstream 3).

Teammates 1, 3, and 4 can import from either `reasoning_core` or `reasoner` interchangeably.
"""

from reasoner import (
    ExtractedClaim,
    ContradictionLink,
    CrossModalInconsistency,
    InvestigationVerdict,
    TrustLayerReasoner,
    evaluate_investigation_bundle,
    SYSTEM_PROMPT,
)

__all__ = [
    "ExtractedClaim",
    "ContradictionLink",
    "CrossModalInconsistency",
    "InvestigationVerdict",
    "TrustLayerReasoner",
    "evaluate_investigation_bundle",
    "SYSTEM_PROMPT",
]
