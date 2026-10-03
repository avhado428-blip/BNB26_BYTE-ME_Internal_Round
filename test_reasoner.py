"""
TrustLayer: Multi-Modal Authenticity Engine
Test Harness for Multimodal Reasoning Engine (Workstream 2)

Tests cross-modal triangulation, pairwise contradiction detection,
epistemic uncertainty evaluation, and verdict synthesis across 3 core scenarios:
  1. Authentic Event (Keynote presentation with coherent lighting, audio, and transcript)
  2. Isolated Manipulation (Document splice with ELA compression anomaly and EXIF tampering)
  3. Coordinated Synthetic Attack (AI image vs AI cloned audio vs social disinformation)
  4. Insufficient Evidence Safeguard (Degraded audio and uncorroborated text)

Can be executed standalone (`python test_reasoner.py`) or via pytest (`pytest test_reasoner.py`).
"""

import math
import os
import shutil
import struct
import tempfile
import wave
from pathlib import Path
from typing import Dict, Any

import sys

# Configure stdout for UTF-8 on Windows if needed
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from PIL import Image
import pytest

from reasoner import (
    ExtractedClaim,
    ContradictionLink,
    CrossModalInconsistency,
    InvestigationVerdict,
    TrustLayerReasoner,
    evaluate_investigation_bundle,
)


# ============================================================================
# ANSI Color & Formatting Utilities
# ============================================================================

class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"


def format_badge(verdict: str) -> str:
    badges = {
        "authentic": f"{Colors.GREEN}{Colors.BOLD}[ AUTHENTIC ]{Colors.RESET}",
        "manipulated": f"{Colors.YELLOW}{Colors.BOLD}[ MANIPULATED (LOCAL) ]{Colors.RESET}",
        "coordinated_synthetic": f"{Colors.RED}{Colors.BOLD}[ COORDINATED SYNTHETIC ATTACK ]{Colors.RESET}",
        "insufficient_evidence": f"{Colors.CYAN}{Colors.BOLD}[ INSUFFICIENT EVIDENCE ]{Colors.RESET}",
    }
    return badges.get(verdict, f"[{verdict.upper()}]")


def print_investigation_report(title: str, verdict: InvestigationVerdict):
    """Prints a beautiful, formatted forensic report to the console."""
    print("\n" + "=" * 80)
    print(f"{Colors.BOLD}{Colors.HEADER}>>> TRUSTLAYER FORENSIC INVESTIGATION REPORT{Colors.RESET}")
    print(f"{Colors.BOLD}Scenario:{Colors.RESET} {title}")
    print(f"{Colors.BOLD}Case ID:{Colors.RESET}  {verdict.case_id}")
    print("-" * 80)

    # Verdict & Uncertainty
    print(f"{Colors.BOLD}Overall Verdict:{Colors.RESET}        {format_badge(verdict.overall_verdict)}")
    print(f"{Colors.BOLD}Confidence Score:{Colors.RESET}       {verdict.confidence_score * 100:.1f}%")
    print(f"{Colors.BOLD}Epistemic Uncertainty:{Colors.RESET}  {verdict.uncertainty_level.upper()}")
    print(f"{Colors.BOLD}Uncertainty Reasoning:{Colors.RESET}  {Colors.DIM}{verdict.uncertainty_justification}{Colors.RESET}")

    # Extracted Claims
    print(f"\n{Colors.BOLD}{Colors.BLUE}[ Extracted Claims ({len(verdict.claims_extracted)}) ]{Colors.RESET}")
    for idx, c in enumerate(verdict.claims_extracted, 1):
        anchor_str = f" @ {c.spatial_or_temporal_anchor}" if c.spatial_or_temporal_anchor else ""
        print(f"  {idx}. [{c.modality.upper()}] {Colors.BOLD}{c.source_artifact}{Colors.RESET}{anchor_str}")
        print(f"     -> {c.claim_summary}")

    # Contradictions Detected (Graph Edges)
    print(f"\n{Colors.BOLD}{Colors.RED}[ Cross-Modal Contradiction Graph Edges ({len(verdict.contradictions_detected)}) ]{Colors.RESET}")
    if not verdict.contradictions_detected:
        print(f"  {Colors.GREEN}No cross-modal contradictions detected. Artifacts corroborate mutually.{Colors.RESET}")
    else:
        for idx, link in enumerate(verdict.contradictions_detected, 1):
            sev_color = Colors.RED if link.severity == "critical" else Colors.YELLOW
            print(f"  {idx}. {Colors.BOLD}{link.artifact_source_a}{Colors.RESET} <---> {Colors.BOLD}{link.artifact_source_b}{Colors.RESET}")
            print(f"     Type: {sev_color}{link.conflict_type.upper()}{Colors.RESET} | Severity: {sev_color}{link.severity.upper()}{Colors.RESET}")
            print(f"     Reasoning: {link.evidence_reasoning}")

    # Explainable Evidence Chain
    print(f"\n{Colors.BOLD}{Colors.CYAN}[ Step-by-Step Explainable Evidence Chain ]{Colors.RESET}")
    for step in verdict.explainable_evidence_chain:
        print(f"  {step}")

    # React Flow Graph Export Validation
    graph_dict = verdict.to_graph_dict()
    print(f"\n{Colors.BOLD}[ React Flow Export ]:{Colors.RESET} {len(graph_dict['nodes'])} Nodes, {len(graph_dict['edges'])} Edges generated for Next.js UI.")
    print("=" * 80)


# ============================================================================
# Synthetic Test Asset Generators
# ============================================================================

def create_synthetic_image(file_path: Path, color=(100, 150, 200), size=(320, 240)):
    """Creates a dummy test image on disk."""
    img = Image.new("RGB", size, color=color)
    img.save(file_path, "JPEG", quality=90)


def create_synthetic_audio(file_path: Path, duration_sec: float = 1.0, freq: float = 440.0):
    """Creates a dummy WAV audio recording on disk."""
    sample_rate = 16000
    n_frames = int(sample_rate * duration_sec)
    with wave.open(str(file_path), "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        frames = bytearray()
        for i in range(n_frames):
            val = int(32767.0 * 0.2 * math.sin(2.0 * math.pi * freq * i / sample_rate))
            frames.extend(struct.pack("<h", val))
        f.writeframes(frames)


def create_synthetic_text(file_path: Path, text: str):
    """Creates a dummy text document on disk."""
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(text)


# ============================================================================
# Test Cases
# ============================================================================

@pytest.fixture(scope="module")
def test_workspace():
    """Creates a temporary workspace with synthetic test media."""
    temp_dir = Path(tempfile.mkdtemp(prefix="trustlayer_test_"))
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


def test_authentic_event(test_workspace):
    """
    Test Case A: Authentic Event
    A genuine auditorium keynote where visual lighting, audio room acoustics,
    and press release transcript consistently match without contradiction.
    """
    case_dir = test_workspace / "case_authentic"
    case_dir.mkdir(exist_ok=True)

    img_path = case_dir / "keynote_stage.jpg"
    audio_path = case_dir / "keynote_speech.wav"
    text_path = case_dir / "official_transcript.txt"

    create_synthetic_image(img_path, color=(220, 220, 230))
    create_synthetic_audio(audio_path, duration_sec=4.0, freq=300.0)
    create_synthetic_text(
        text_path,
        "Good morning everyone. Today we are proud to unveil our next-generation architecture at the Convention Center."
    )

    telemetry = {
        "ela_anomalies": {"max_anomaly_score": 0.04, "mean_difference": 0.01},
        "exif_metadata": {
            "DateTimeOriginal": "2026-09-15 10:02:14",
            "CameraModel": "Sony A7 IV",
            "Software": "In-Camera Firmware v2.0"
        },
        "audio_spectrogram": {
            "spectral_centroid_variance": 1.42,
            "zero_crossing_rate": 0.078,
            "unnatural_silence_dropoffs": False
        }
    }

    reasoner = TrustLayerReasoner(mock_mode=True)
    verdict = reasoner.analyze_investigation_sync(
        artifacts=[img_path, audio_path, text_path],
        telemetry=telemetry,
        incident_notes="Official annual keynote presentation held in indoor convention center hall.",
        case_id="CASE-AUTHENTIC-CONTROL"
    )

    print_investigation_report("Case A: Authentic Keynote Control", verdict)

    # Assertions
    assert verdict.overall_verdict == "authentic"
    assert verdict.confidence_score >= 0.85
    assert verdict.uncertainty_level == "low"
    assert len(verdict.contradictions_detected) == 0
    assert len(verdict.claims_extracted) >= 2
    assert len(verdict.explainable_evidence_chain) >= 3


def test_isolated_manipulation(test_workspace):
    """
    Test Case B: Isolated Manipulation
    A signed contract document where an executive signature region has been spliced
    and tampered with in Adobe Acrobat, but no multi-asset generative campaign exists.
    """
    case_dir = test_workspace / "case_manipulated"
    case_dir.mkdir(exist_ok=True)

    doc_img = case_dir / "signed_agreement_splice.jpg"
    text_path = case_dir / "press_release.txt"

    create_synthetic_image(doc_img, color=(245, 245, 245))
    create_synthetic_text(
        text_path,
        "Board of Directors confirms no amendments or changes have been made to the merger agreement."
    )

    telemetry = {
        "ela_anomalies": {"max_anomaly_score": 0.89, "mean_difference": 0.18},
        "exif_metadata": {
            "DateTimeOriginal": "2026-09-10 14:20:00",
            "Software": "Adobe Acrobat Pro 2024 (Windows)"
        }
    }

    reasoner = TrustLayerReasoner(mock_mode=True)
    verdict = reasoner.analyze_investigation_sync(
        artifacts=[doc_img, text_path],
        telemetry=telemetry,
        incident_notes="Leaked contract copy alleged to contain modified valuation terms.",
        case_id="CASE-SPLICE-FRAUD"
    )

    print_investigation_report("Case B: Isolated Document Splice Fraud", verdict)

    # Assertions
    assert verdict.overall_verdict == "manipulated"
    assert verdict.confidence_score >= 0.85
    assert verdict.uncertainty_level == "low"
    assert len(verdict.contradictions_detected) >= 1
    assert verdict.contradictions_detected[0].severity in ("medium", "critical")


def test_coordinated_synthetic_attack(test_workspace):
    """
    Test Case C: Coordinated Synthetic Attack
    A fabricated press event where an AI-generated image depicting midday sunny courtyard
    contradicts an AI-cloned audio statement claiming a nocturnal thunderstorm,
    coupled with synthetic audio silence dropoffs and social media disinformation.
    """
    case_dir = test_workspace / "case_coordinated"
    case_dir.mkdir(exist_ok=True)

    ai_img = case_dir / "ai_press_conference.jpg"
    ai_audio = case_dir / "cloned_statement.wav"
    tweet_text = case_dir / "breaking_social_post.txt"

    create_synthetic_image(ai_img, color=(180, 200, 160))
    create_synthetic_audio(ai_audio, duration_sec=5.0, freq=220.0)
    create_synthetic_text(
        tweet_text,
        "BREAKING: Mayor declares city-wide curfew during midnight storm disaster!"
    )

    telemetry = {
        "ela_anomalies": {"max_anomaly_score": 0.32, "mean_difference": 0.05},
        "exif_metadata": {
            "DateTimeOriginal": "2026-10-01 23:45:00",
            "Software": "StableDiffusion WebUI / Midjourney"
        },
        "audio_spectrogram": {
            "spectral_centroid_variance": 0.02,
            "zero_crossing_rate": 0.012,
            "unnatural_silence_dropoffs": True
        }
    }

    reasoner = TrustLayerReasoner(mock_mode=True)
    verdict = reasoner.analyze_investigation_sync(
        artifacts=[ai_img, ai_audio, tweet_text],
        telemetry=telemetry,
        incident_notes="Claimed breaking emergency press conference during midnight storm.",
        case_id="CASE-COORDINATED-SYNTHETIC"
    )

    print_investigation_report("Case C: Coordinated Synthetic Disinformation Attack", verdict)

    # Assertions
    assert verdict.overall_verdict == "coordinated_synthetic"
    assert verdict.confidence_score >= 0.90
    assert verdict.uncertainty_level == "low"
    assert len(verdict.contradictions_detected) >= 1

    # Verify cross-modal conflict types
    conflict_types = {c.conflict_type for c in verdict.contradictions_detected}
    assert any(t in ("environmental_lighting", "acoustic_noise", "temporal") for t in conflict_types)


def test_insufficient_evidence_safeguard(test_workspace):
    """
    Test Case D: Insufficient Evidence / Epistemic Calibration
    Degraded 3-second audio and anonymous unverified text claim.
    The engine must NOT hallucinate conviction, but trigger 'insufficient_evidence'
    with high epistemic uncertainty.
    """
    case_dir = test_workspace / "case_insufficient"
    case_dir.mkdir(exist_ok=True)

    audio_3s = case_dir / "compressed_audio_3s.wav"
    pastebin = case_dir / "anonymous_pastebin.txt"

    create_synthetic_audio(audio_3s, duration_sec=2.5, freq=500.0)
    create_synthetic_text(pastebin, "Anonymous leak claiming insider conspiracy.")

    telemetry = {
        "audio_spectrogram": {
            "spectral_centroid_variance": 0.8,
            "zero_crossing_rate": 0.05,
            "unnatural_silence_dropoffs": False
        }
    }

    reasoner = TrustLayerReasoner(mock_mode=True)
    verdict = reasoner.analyze_investigation_sync(
        artifacts=[audio_3s, pastebin],
        telemetry=telemetry,
        incident_notes="Anonymous tip uploaded to pastebin with 3-second low quality audio.",
        case_id="CASE-INSUFFICIENT-DATA"
    )

    print_investigation_report("Case D: Epistemic Calibration Safeguard", verdict)

    # Assertions
    assert verdict.overall_verdict == "insufficient_evidence"
    assert verdict.uncertainty_level == "high"
    assert verdict.confidence_score <= 0.50
    assert "insufficient" in verdict.uncertainty_justification.lower() or "prevent" in verdict.uncertainty_justification.lower()


def test_shared_data_contract_compatibility():
    """
    Validates that Pydantic v2 schemas satisfy both the Architecture Blueprint
    and user prompt parameter aliases.
    """
    # 1. ExtractedClaim aliases
    c1 = ExtractedClaim(
        source_artifact="video.mp4",
        modality="video",
        claim_summary="Muzzle flash absent",
        spatial_or_temporal_anchor="00:03"
    )
    assert c1.source_modality == "video"
    assert c1.claim_text == "Muzzle flash absent"
    assert c1.timestamp_or_region == "00:03"

    # Alternate construction
    c2 = ExtractedClaim(
        source_artifact="audio.wav",
        source_modality="audio",
        claim_text="Gunfire burst audible",
        timestamp_or_region="00:03"
    )
    assert c2.modality == "audio"
    assert c2.claim_summary == "Gunfire burst audible"
    assert c2.spatial_or_temporal_anchor == "00:03"

    # 2. ContradictionLink / CrossModalInconsistency aliases
    link1 = ContradictionLink(
        artifact_source_a="video.mp4",
        artifact_source_b="audio.wav",
        conflict_type="temporal",
        severity="critical",
        evidence_reasoning="Acoustic report without optical flash."
    )
    assert link1.artifact_a == "video.mp4"
    assert link1.artifact_b == "audio.wav"
    assert link1.description == "Acoustic report without optical flash."

    link2 = CrossModalInconsistency(
        artifact_a="photo.jpg",
        artifact_b="statement.txt",
        conflict_type="environmental_lighting",
        severity="critical",
        description="Daylight vs nocturnal claim."
    )
    assert link2.artifact_source_a == "photo.jpg"
    assert link2.artifact_source_b == "statement.txt"
    assert link2.evidence_reasoning == "Daylight vs nocturnal claim."

    # 3. InvestigationVerdict aliases
    v = InvestigationVerdict(
        case_id="TEST-CONTRACT-01",
        verdict="coordinated_synthetic",
        confidence_score=0.95,
        uncertainty_level="low",
        uncertainty_reasoning="Clear cross-modal contradictions.",
        claims=[c1, c2],
        inconsistencies=[link1, link2],
        explainable_evidence_chain=["Step 1", "Step 2"]
    )
    assert v.overall_verdict == "coordinated_synthetic"
    assert v.verdict == "coordinated_synthetic"
    assert v.uncertainty_justification == "Clear cross-modal contradictions."
    assert v.uncertainty_reasoning == "Clear cross-modal contradictions."
    assert len(v.claims_extracted) == 2
    assert len(v.claims) == 2
    assert len(v.contradictions_detected) == 2
    assert len(v.inconsistencies) == 2

    # Graph representation test for Teammate 4
    graph = v.to_graph_dict()
    assert "nodes" in graph
    assert "edges" in graph
    assert len(graph["nodes"]) >= 3  # 2 artifacts + 1 verdict node
    assert len(graph["edges"]) >= 2


# ============================================================================
# Standalone CLI Test Runner
# ============================================================================

def run_all_investigation_tests():
    """Runs all 4 test cases sequentially and prints colored diagnostic summaries."""
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.GREEN}   TrustLayer Multi-Modal Authenticity Engine -- Forensic Test Suite{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}   GDG Hackathon Track 1 | Workstream 2: Multimodal Reasoner{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.RESET}\n")

    temp_dir = Path(tempfile.mkdtemp(prefix="trustlayer_suite_"))
    try:
        print(f"{Colors.BOLD}1/5 Running Data Contract Compatibility Verification...{Colors.RESET}")
        test_shared_data_contract_compatibility()
        print(f"    {Colors.GREEN}[PASS] Pydantic v2 Universal Data Contract verified successfully.{Colors.RESET}\n")

        print(f"{Colors.BOLD}2/5 Running Case A: Authentic Event Control...{Colors.RESET}")
        test_authentic_event(temp_dir)

        print(f"{Colors.BOLD}3/5 Running Case B: Isolated Manipulation (Splice Fraud)...{Colors.RESET}")
        test_isolated_manipulation(temp_dir)

        print(f"{Colors.BOLD}4/5 Running Case C: Coordinated Synthetic Attack...{Colors.RESET}")
        test_coordinated_synthetic_attack(temp_dir)

        print(f"{Colors.BOLD}5/5 Running Case D: Epistemic Uncertainty Calibration Safeguard...{Colors.RESET}")
        test_insufficient_evidence_safeguard(temp_dir)

        print(f"\n{Colors.BOLD}{Colors.GREEN}{'='*80}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.GREEN}   ALL 5 FORENSIC INVESTIGATION TESTS PASSED WITH 100% SUCCESS!{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.GREEN}{'='*80}{Colors.RESET}\n")

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    run_all_investigation_tests()
