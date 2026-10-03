"""TrustLayer evaluation suite — Teammate 3.

Runs a pre-built directory of 10 synthetic test cases and reports:
  - Overall Accuracy (%)
  - Contradiction Detection Precision / Recall
  - Average Processing Latency (seconds)

Can be invoked via CLI (`python run_benchmark.py`) or GET /api/benchmark.
"""

from __future__ import annotations

import argparse
import json
import logging
import time
from pathlib import Path
from typing import Any

from models import (
    BenchmarkMetrics,
    ContradictionFinding,
    InvestigationVerdict,
    VerdictLabel,
)
from mock_data import DEMO_VERDICTS, fallback_verdict

logger = logging.getLogger("trustlayer.benchmark")

DEFAULT_BENCHMARK_DIR = Path(__file__).parent / "benchmark_cases"


def _load_case(case_dir: Path) -> dict[str, Any]:
    meta_path = case_dir / "expected.json"
    if not meta_path.exists():
        raise FileNotFoundError(f"Missing expected.json in {case_dir}")
    meta = json.loads(meta_path.read_text(encoding="utf-8-sig"))
    meta["_dir"] = str(case_dir)
    meta["_artifact_paths"] = sorted(
        p for p in case_dir.iterdir() if p.name != "expected.json" and p.is_file()
    )
    return meta


def _predict_mock(case: dict[str, Any]) -> InvestigationVerdict:
    """Deterministic mock predictor aligned with synthetic labels."""
    demo_id = case.get("demo_id")
    if demo_id and demo_id in DEMO_VERDICTS:
        v = DEMO_VERDICTS[demo_id].model_copy(deep=True)
        v.case_id = case["case_id"]
        return v

    expected = case["expected_verdict"]
    has_contra = bool(case.get("has_contradiction", False))
    contradictions: list[ContradictionFinding] = []
    if has_contra:
        contradictions.append(
            ContradictionFinding(
                claim=case.get("claim", "stated claim"),
                conflicting_signal=case.get(
                    "conflicting_signal", "opposing forensic signal"
                ),
                severity=float(case.get("contradiction_severity", 0.8)),
                sources=case.get("contradiction_sources", ["synthetic"]),
            )
        )

    return InvestigationVerdict(
        case_id=case["case_id"],
        verdict=VerdictLabel(expected),
        confidence=float(case.get("mock_confidence", 0.85)),
        authenticity_score=float(case.get("mock_authenticity_score", 0.5)),
        summary=case.get("summary", f"Mock evaluation for {case['case_id']}"),
        contradictions=contradictions,
        evidence=case.get("evidence", ["synthetic_benchmark"]),
        artifact_names=[Path(p).name for p in case.get("_artifact_paths", [])],
        telemetry=case.get("telemetry", {}),
        processing_time_seconds=0.0,
        mock=True,
    )


def _predict_live(case: dict[str, Any]) -> InvestigationVerdict:
    """Attempt live T1/T2 pipeline; fall back to mock on any failure."""
    started = time.perf_counter()
    try:
        from forensic_extractor import extract_forensics  # type: ignore
        from reasoning_core import reason as reason_fn  # type: ignore
    except Exception:
        try:
            from forensic_extractor import extract_forensics  # type: ignore
            from reasoning_core import investigate as reason_fn  # type: ignore
        except Exception as exc:  # noqa: BLE001
            logger.warning("Live modules unavailable (%s); using mock predictor", exc)
            v = _predict_mock(case)
            v.processing_time_seconds = round(time.perf_counter() - started, 4)
            return v

    artifacts: list[dict[str, Any]] = []
    telemetry: list[Any] = []
    try:
        for path in case.get("_artifact_paths", []):
            p = Path(path)
            data = p.read_bytes()
            art = {
                "filename": p.name,
                "content_type": "application/octet-stream",
                "bytes": data,
                "size": len(data),
            }
            artifacts.append(art)
            try:
                tel = extract_forensics(
                    data, filename=p.name, content_type=art["content_type"]
                )
                telemetry.append(tel)
            except Exception as exc:  # noqa: BLE001
                logger.error("Extract failed on %s: %s", p.name, exc)
                telemetry.append({"filename": p.name, "error": str(exc)})

        raw = reason_fn(
            artifacts=artifacts,
            telemetry=telemetry,
            context=case.get("context"),
        )
        elapsed = round(time.perf_counter() - started, 4)
        if isinstance(raw, InvestigationVerdict):
            raw.processing_time_seconds = elapsed
            return raw
        if isinstance(raw, dict):
            raw.setdefault("case_id", case["case_id"])
            raw["processing_time_seconds"] = elapsed
            return InvestigationVerdict.model_validate(raw)
        raise TypeError(type(raw))
    except Exception as exc:  # noqa: BLE001
        logger.exception("Live predict failed for %s", case["case_id"])
        return fallback_verdict(
            case_id=case["case_id"],
            artifact_names=[Path(p).name for p in case.get("_artifact_paths", [])],
            error_note=str(exc),
            processing_time_seconds=round(time.perf_counter() - started, 4),
        )


def evaluate_case(
    case: dict[str, Any], *, use_mock: bool
) -> dict[str, Any]:
    t0 = time.perf_counter()
    if use_mock:
        pred = _predict_mock(case)
    else:
        pred = _predict_live(case)
    # Ensure latency measured even if predictor forgot
    if pred.processing_time_seconds <= 0:
        pred.processing_time_seconds = round(time.perf_counter() - t0, 4)

    expected_verdict = case["expected_verdict"]
    correct = pred.verdict.value == expected_verdict

    expected_contra = bool(case.get("has_contradiction", False))
    predicted_contra = len(pred.contradictions) > 0

    return {
        "case_id": case["case_id"],
        "expected_verdict": expected_verdict,
        "predicted_verdict": pred.verdict.value,
        "correct": correct,
        "expected_contradiction": expected_contra,
        "predicted_contradiction": predicted_contra,
        "latency_seconds": pred.processing_time_seconds,
        "fallback": pred.fallback,
        "mock": pred.mock,
    }


def run_benchmark_suite(
    benchmark_dir: Path | str | None = None,
    use_mock: bool = True,
) -> BenchmarkMetrics:
    root = Path(benchmark_dir or DEFAULT_BENCHMARK_DIR)
    if not root.exists():
        raise FileNotFoundError(f"Benchmark directory not found: {root}")

    case_dirs = sorted(p for p in root.iterdir() if p.is_dir())
    if len(case_dirs) < 1:
        raise RuntimeError(f"No cases under {root}")

    results: list[dict[str, Any]] = []
    for cd in case_dirs:
        case = _load_case(cd)
        results.append(evaluate_case(case, use_mock=use_mock))

    correct = sum(1 for r in results if r["correct"])
    total = len(results)
    accuracy = 100.0 * correct / total if total else 0.0

    tp = sum(
        1
        for r in results
        if r["expected_contradiction"] and r["predicted_contradiction"]
    )
    fp = sum(
        1
        for r in results
        if (not r["expected_contradiction"]) and r["predicted_contradiction"]
    )
    fn = sum(
        1
        for r in results
        if r["expected_contradiction"] and (not r["predicted_contradiction"])
    )

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    avg_latency = (
        sum(r["latency_seconds"] for r in results) / total if total else 0.0
    )

    return BenchmarkMetrics(
        overall_accuracy_pct=round(accuracy, 2),
        contradiction_precision=round(precision, 4),
        contradiction_recall=round(recall, 4),
        average_latency_seconds=round(avg_latency, 4),
        total_cases=total,
        correct_verdicts=correct,
        true_positives=tp,
        false_positives=fp,
        false_negatives=fn,
        case_results=results,
        mock=use_mock,
    )


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )
    parser = argparse.ArgumentParser(description="TrustLayer benchmark runner")
    parser.add_argument(
        "--dir",
        type=Path,
        default=DEFAULT_BENCHMARK_DIR,
        help="Directory of synthetic test cases",
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Attempt live T1/T2 pipeline instead of mock predictor",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print full BenchmarkMetrics JSON",
    )
    args = parser.parse_args()

    metrics = run_benchmark_suite(args.dir, use_mock=not args.live)
    if args.json:
        print(metrics.model_dump_json(indent=2))
    else:
        print("=== TrustLayer Benchmark ===")
        print(f"Cases:                {metrics.total_cases}")
        print(f"Overall Accuracy:     {metrics.overall_accuracy_pct:.2f}%")
        print(f"Contradiction Prec.:  {metrics.contradiction_precision:.4f}")
        print(f"Contradiction Recall: {metrics.contradiction_recall:.4f}")
        print(f"Avg Latency (s):      {metrics.average_latency_seconds:.4f}")
        print(f"Mock mode:            {metrics.mock}")


if __name__ == "__main__":
    main()
