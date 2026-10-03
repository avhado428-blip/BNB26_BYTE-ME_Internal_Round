"""Pre-baked hackathon demo responses (5 cases) + mock forensic telemetry.

Activated when USE_MOCK_DATA=true or when T1/T2 imports / runtime fail.
"""

from __future__ import annotations

from models import ContradictionFinding, InvestigationVerdict, VerdictLabel

# Keys the frontend / demo script can send via context or filename hints.
DEMO_CASE_IDS = (
    "demo_authentic_photo",
    "demo_deepfake_video",
    "demo_metadata_tamper",
    "demo_cross_modal_contradiction",
    "demo_inconclusive_noise",
)


def _v(**kwargs) -> InvestigationVerdict:
    return InvestigationVerdict(**kwargs)


DEMO_VERDICTS: dict[str, InvestigationVerdict] = {
    "demo_authentic_photo": _v(
        case_id="demo_authentic_photo",
        verdict=VerdictLabel.AUTHENTIC,
        confidence=0.94,
        authenticity_score=0.96,
        summary=(
            "EXIF, noise residual, and reverse-context checks align. "
            "No contradiction between visual content and stated context."
        ),
        contradictions=[],
        evidence=[
            "Intact camera EXIF chain",
            "PRNU residual consistent with claimed device class",
            "No splicing edges in high-frequency bands",
        ],
        artifact_names=["authentic_street.jpg"],
        telemetry={"ela_score": 0.08, "exif_intact": True, "ai_gen_prob": 0.04},
        processing_time_seconds=0.42,
        mock=True,
    ),
    "demo_deepfake_video": _v(
        case_id="demo_deepfake_video",
        verdict=VerdictLabel.MANIPULATED,
        confidence=0.91,
        authenticity_score=0.12,
        summary=(
            "Face-swap temporal flicker and lip-sync drift exceed thresholds. "
            "Classified as manipulated deepfake media."
        ),
        contradictions=[
            ContradictionFinding(
                claim="Speaker identity matches known subject",
                conflicting_signal="Facial landmark jitter inconsistent with optical flow",
                severity=0.88,
                sources=["video_frames", "audio_track"],
            )
        ],
        evidence=[
            "Temporal face boundary instability",
            "Mel-spectrogram / viseme mismatch",
            "Compression ghosting around mouth ROI",
        ],
        artifact_names=["interview_clip.mp4"],
        telemetry={"deepfake_score": 0.89, "lip_sync_error": 0.73},
        processing_time_seconds=1.15,
        mock=True,
    ),
    "demo_metadata_tamper": _v(
        case_id="demo_metadata_tamper",
        verdict=VerdictLabel.MANIPULATED,
        confidence=0.87,
        authenticity_score=0.28,
        summary=(
            "File timestamps and GPS EXIF conflict with claimed capture location "
            "and editing software fingerprints."
        ),
        contradictions=[
            ContradictionFinding(
                claim="Photo taken in Nairobi on 2024-03-12",
                conflicting_signal="GPS cluster and timezone offset map to Berlin",
                severity=0.81,
                sources=["exif", "context"],
            )
        ],
        evidence=[
            "GPS / timezone mismatch",
            "Software tag indicates bulk EXIF rewrite",
            "Thumbnail hash differs from full-res crop",
        ],
        artifact_names=["claim_nairobi.jpg"],
        telemetry={"exif_rewritten": True, "geo_mismatch": True},
        processing_time_seconds=0.55,
        mock=True,
    ),
    "demo_cross_modal_contradiction": _v(
        case_id="demo_cross_modal_contradiction",
        verdict=VerdictLabel.CONTRADICTORY,
        confidence=0.83,
        authenticity_score=0.45,
        summary=(
            "Image is likely unedited, but caption / ASR transcript assert an "
            "event timeline the visual scene cannot support."
        ),
        contradictions=[
            ContradictionFinding(
                claim="Caption: nighttime protest downtown",
                conflicting_signal="Daylight EXIF + shadow geometry imply midday",
                severity=0.92,
                sources=["image", "context_text"],
            ),
            ContradictionFinding(
                claim="Audio mentions rain and sirens",
                conflicting_signal="Visual scene is dry plaza, no emergency lighting",
                severity=0.74,
                sources=["audio", "image"],
            ),
        ],
        evidence=[
            "Cross-modal semantic conflict (vision vs text)",
            "Shadow-angle solar estimate vs claimed time",
        ],
        artifact_names=["plaza.jpg", "field_note.txt"],
        telemetry={"cross_modal_conflict": 0.91, "ela_score": 0.11},
        processing_time_seconds=0.88,
        mock=True,
    ),
    "demo_inconclusive_noise": _v(
        case_id="demo_inconclusive_noise",
        verdict=VerdictLabel.INCONCLUSIVE,
        confidence=0.41,
        authenticity_score=0.52,
        summary=(
            "Heavy recompression stripped forensic cues. Signals are mixed; "
            "no reliable authenticity or manipulation determination."
        ),
        contradictions=[],
        evidence=[
            "Multiple generational JPEG recompressions",
            "Insufficient resolution for PRNU",
            "Ambiguous AI-generation score near decision boundary",
        ],
        artifact_names=["noisy_repost.jpg"],
        telemetry={"ai_gen_prob": 0.49, "quality": "low"},
        processing_time_seconds=0.37,
        mock=True,
    ),
}


def resolve_demo_case(
    context: str | None, filenames: list[str]
) -> InvestigationVerdict | None:
    """Map context string or filename tokens to a pre-baked demo verdict."""
    blob = " ".join([context or "", *filenames]).lower()
    for case_id in DEMO_CASE_IDS:
        token = case_id.replace("demo_", "").replace("_", " ")
        if case_id in blob or token in blob or case_id.split("demo_")[-1] in blob:
            return DEMO_VERDICTS[case_id].model_copy(deep=True)
    # Explicit id in context
    for case_id, verdict in DEMO_VERDICTS.items():
        if case_id in blob:
            return verdict.model_copy(deep=True)
    return None


def fallback_verdict(
    *,
    case_id: str,
    artifact_names: list[str],
    error_note: str,
    processing_time_seconds: float = 0.0,
) -> InvestigationVerdict:
    """Schema-valid safe response when the live pipeline fails."""
    return InvestigationVerdict(
        case_id=case_id,
        verdict=VerdictLabel.INCONCLUSIVE,
        confidence=0.0,
        authenticity_score=0.5,
        summary=(
            "Investigation pipeline unavailable. Returning a safe inconclusive "
            "fallback so the client can continue without crashing."
        ),
        contradictions=[],
        evidence=["fallback_path"],
        artifact_names=artifact_names,
        telemetry={},
        processing_time_seconds=processing_time_seconds,
        mock=False,
        fallback=True,
        error_note=error_note,
    )
