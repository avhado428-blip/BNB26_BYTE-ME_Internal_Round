"""
TrustLayer: Multi-Modal Authenticity Engine
Alias and Integration module for `reasoner.py` (Workstream 2: Multimodal Reasoner).

Provides compatibility with both Teammate 2's `evaluate_investigation_bundle`
and Teammate 3's `main.py` imports (`reason`, `investigate`).
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional, Union
from pathlib import Path

from reasoner import (
    ExtractedClaim,
    ContradictionLink,
    CrossModalInconsistency,
    InvestigationVerdict,
    TrustLayerReasoner,
    evaluate_investigation_bundle,
    SYSTEM_PROMPT,
)


async def reason(
    artifacts: Union[List[Dict[str, Any]], List[Union[str, Path]]],
    telemetry: Optional[Union[Dict[str, Any], List[Any]]] = None,
    context: Optional[str] = None,
    **kwargs: Any,
) -> InvestigationVerdict:
    """
    Main async entrypoint consumed by Teammate 3 (main.py).
    Routes artifacts and telemetry through TrustLayerReasoner.
    """
    telemetry_dict: Dict[str, Any] = {}
    if isinstance(telemetry, dict):
        telemetry_dict = telemetry
    elif isinstance(telemetry, list):
        telemetry_dict = {"signals": telemetry}

    reasoner = TrustLayerReasoner()
    return await reasoner.analyze_investigation(
        artifacts=artifacts,
        telemetry=telemetry_dict,
        incident_notes=context,
        **kwargs,
    )


# Alternate entrypoint name checked by main.py
investigate = reason

__all__ = [
    "ExtractedClaim",
    "ContradictionLink",
    "CrossModalInconsistency",
    "InvestigationVerdict",
    "TrustLayerReasoner",
    "evaluate_investigation_bundle",
    "reason",
    "investigate",
    "SYSTEM_PROMPT",
]
