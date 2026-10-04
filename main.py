"""TrustLayer API backend — Teammate 3.

POST /api/investigate  → forensic_extractor (T1) + reasoning_core (T2)
GET  /api/benchmark    → synthetic evaluation suite metrics
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Callable, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from mock_data import (
    DEMO_CASE_IDS,
    DEMO_VERDICTS,
    fallback_verdict,
    resolve_demo_case,
)
from models import BenchmarkMetrics, InvestigationVerdict


# Logging---------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("trustlayer.api")


# Config----------------------------------------------------------
USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
PIPELINE_TIMEOUT_SECONDS = float(os.getenv("PIPELINE_TIMEOUT_SECONDS", "45"))
BENCHMARK_DIR = Path(
    os.getenv("BENCHMARK_DIR", Path(__file__).parent / "benchmark_cases")
)

# Next.js frontend origins (hackathon + local)
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,https://localhost:3000",
    ).split(",")
    if o.strip()
]


# Optional Teammate 1 / Teammate 2 imports (never crash on missing modules)---------------------------------------------------------
_extract_fn: Optional[Callable[..., Any]] = None
_reason_fn: Optional[Callable[..., Any]] = None
_T1_IMPORT_ERROR: Optional[str] = None
_T2_IMPORT_ERROR: Optional[str] = None

try:
    from forensic_extractor import (  # type: ignore
        extract_forensics,
    )

    _extract_fn = extract_forensics
    logger.info("Loaded forensic_extractor.extract_forensics (Teammate 1)")
except Exception as exc:  # noqa: BLE001 — intentional soft-fail for live demo
    _T1_IMPORT_ERROR = str(exc)
    logger.warning("Teammate 1 forensic_extractor unavailable: %s", exc)

try:
    from reasoning_core import (  # type: ignore
        reason as reason_investigation,
    )

    _reason_fn = reason_investigation
    logger.info("Loaded reasoning_core.reason (Teammate 2)")
except Exception as exc:  # noqa: BLE001
    # Alternate common names Teammate 2 might export
    try:
        from reasoning_core import (  # type: ignore
            investigate as reason_investigation,
        )

        _reason_fn = reason_investigation
        logger.info("Loaded reasoning_core.investigate (Teammate 2)")
    except Exception as exc2:  # noqa: BLE001
        _T2_IMPORT_ERROR = f"{exc} | {exc2}"
        logger.warning("Teammate 2 reasoning_core unavailable: %s", _T2_IMPORT_ERROR)

# Prefer T2 schema if exported
try:
    from reasoning_core import InvestigationVerdict as _T2Verdict  # type: ignore

    InvestigationVerdict = _T2Verdict  # type: ignore[misc]
except Exception:  # noqa: BLE001
    pass


# App-----------------------------------------------------------
@asynccontextmanager
async def lifespan(_app: FastAPI):
    mode = "MOCK" if USE_MOCK_DATA else "LIVE"
    logger.info(
        "TrustLayer API starting | mode=%s | T1=%s | T2=%s",
        mode,
        "ok" if _extract_fn else f"fallback ({_T1_IMPORT_ERROR})",
        "ok" if _reason_fn else f"fallback ({_T2_IMPORT_ERROR})",
    )
    yield
    logger.info("TrustLayer API shutdown")


app = FastAPI(
    title="TrustLayer API",
    description=(
        "Multi-Modal Authenticity Engine — backend for the Next.js frontend.\n\n"
        "**Investigate** uploads with optional context; **Benchmark** runs the "
        "synthetic evaluation suite.\n\n"
        f"Mock mode (`USE_MOCK_DATA`): **{'ON' if USE_MOCK_DATA else 'OFF'}**. "
        f"Demo case ids: `{', '.join(DEMO_CASE_IDS)}`."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    contact={"name": "TrustLayer Teammate 3 — API / Eval"},
    servers=[
        {"url": "http://localhost:8000", "description": "Local FastAPI"},
        {"url": "http://127.0.0.1:8000", "description": "Local loopback"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Helpers-------------------------------------------------------
MEDIA_CONTENT_PREFIXES = ("image/", "video/", "audio/")
MEDIA_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
    ".mp3",
    ".wav",
    ".flac",
    ".m4a",
    ".aac",
}


def _is_media(filename: str, content_type: str | None) -> bool:
    ct = (content_type or "").lower()
    if any(ct.startswith(p) for p in MEDIA_CONTENT_PREFIXES):
        return True
    return Path(filename or "").suffix.lower() in MEDIA_EXTENSIONS


async def _read_upload(upload: UploadFile) -> dict[str, Any]:
    data = await upload.read()
    return {
        "filename": upload.filename or "unnamed",
        "content_type": upload.content_type or "application/octet-stream",
        "bytes": data,
        "size": len(data),
    }


async def _run_extract(artifact: dict[str, Any]) -> dict[str, Any]:
    """Call Teammate 1 extractor (sync or async) with timeout."""
    if _extract_fn is None:
        return {
            "filename": artifact["filename"],
            "skipped": True,
            "reason": _T1_IMPORT_ERROR or "forensic_extractor not loaded",
        }

    async def _call() -> Any:
        result = _extract_fn(
            artifact["bytes"],
            filename=artifact["filename"],
            content_type=artifact["content_type"],
        )
        if asyncio.iscoroutine(result):
            return await result
        return await asyncio.to_thread(lambda: result)

    return await asyncio.wait_for(_call(), timeout=PIPELINE_TIMEOUT_SECONDS)


async def _run_reason(
    artifacts: list[dict[str, Any]],
    telemetry: list[Any],
    context: str | None,
) -> Any:
    if _reason_fn is None:
        raise RuntimeError(_T2_IMPORT_ERROR or "reasoning_core not loaded")

    # Pass bytes-free artifact descriptors + telemetry
    light_artifacts = [
        {
            "filename": a["filename"],
            "content_type": a["content_type"],
            "size": a["size"],
            "bytes": a["bytes"],
        }
        for a in artifacts
    ]

    async def _call() -> Any:
        result = _reason_fn(
            artifacts=light_artifacts,
            telemetry=telemetry,
            context=context,
        )
        if asyncio.iscoroutine(result):
            return await result
        return await asyncio.to_thread(lambda: result)

    return await asyncio.wait_for(_call(), timeout=PIPELINE_TIMEOUT_SECONDS)


def _coerce_verdict(raw: Any, *, case_id: str, names: list[str], elapsed: float) -> InvestigationVerdict:
    if isinstance(raw, InvestigationVerdict):
        raw.processing_time_seconds = elapsed
        if not raw.case_id:
            raw.case_id = case_id
        if not raw.artifact_names:
            raw.artifact_names = names
        return raw
    if hasattr(raw, "model_dump"):
        data = raw.model_dump()
    elif isinstance(raw, dict):
        data = dict(raw)
    elif hasattr(raw, "dict") and callable(raw.dict):
        data = raw.dict()
    else:
        raise TypeError(f"Unsupported verdict type: {type(raw)!r}")

    data.setdefault("case_id", case_id)
    data.setdefault("artifact_names", names)
    data["processing_time_seconds"] = elapsed
    return InvestigationVerdict.model_validate(data)


# Routes----------------------------------------------------------
@app.get("/", tags=["health"])
async def root():
    return {
        "service": "TrustLayer API",
        "docs": "/docs",
        "investigate": "POST /api/investigate",
        "benchmark": "GET /api/benchmark",
        "use_mock_data": USE_MOCK_DATA,
        "teammate1_loaded": _extract_fn is not None,
        "teammate2_loaded": _reason_fn is not None,
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "mock": USE_MOCK_DATA}


@app.post(
    "/api/investigate",
    response_model=InvestigationVerdict,
    tags=["investigation"],
    summary="Investigate uploaded artifacts",
    response_description="Validated InvestigationVerdict JSON",
)
async def investigate(
    artifacts: list[UploadFile] = File(
        ..., description="One or more media / text evidence files"
    ),
    context: Optional[str] = Form(
        None, description="Optional investigator or claim context string"
    ),
):
    """Route media → Teammate 1 forensics, then Teammate 2 reasoning.

    Failures / timeouts return a schema-valid inconclusive fallback.
    Set ``USE_MOCK_DATA=true`` for pre-baked demo responses.
    """
    started = time.perf_counter()
    case_id = f"inv_{uuid.uuid4().hex[:12]}"

    try:
        loaded = await asyncio.gather(*[_read_upload(u) for u in artifacts])
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed reading uploads")
        return _coerce_verdict(
            fallback_verdict(
                case_id=case_id,
                artifact_names=[],
                error_note=f"upload_read_error: {exc}",
            ),
            case_id=case_id,
            names=[],
            elapsed=round(time.perf_counter() - started, 4),
        )

    names = [a["filename"] for a in loaded]

    # --- Full mock mode (live stage safety) ---------------------------------
    if USE_MOCK_DATA:
        demo = resolve_demo_case(context, names)
        if demo is None:
            # Round-robin first demo if no hint matched
            demo = DEMO_VERDICTS[DEMO_CASE_IDS[0]].model_copy(deep=True)
            demo.case_id = case_id
        else:
            demo.case_id = case_id
        demo.artifact_names = names or demo.artifact_names
        demo.processing_time_seconds = round(time.perf_counter() - started, 4)
        demo.mock = True
        logger.info("Serving mock verdict for case_id=%s demo=%s", case_id, demo.verdict)
        return _coerce_verdict(
            demo,
            case_id=case_id,
            names=names or demo.artifact_names,
            elapsed=round(time.perf_counter() - started, 4),
        )

    # Soft mock if packages/keys clearly unavailable
    if _extract_fn is None and _reason_fn is None:
        demo = resolve_demo_case(context, names)
        if demo is not None:
            demo.case_id = case_id
            demo.artifact_names = names or demo.artifact_names
            demo.processing_time_seconds = round(time.perf_counter() - started, 4)
            demo.mock = True
            demo.error_note = "T1/T2 unavailable — demo mock matched from context/filename"
            logger.warning("Auto-mock demo path: %s", demo.error_note)
            return _coerce_verdict(
                demo,
                case_id=case_id,
                names=names or demo.artifact_names,
                elapsed=round(time.perf_counter() - started, 4),
            )

    # --- Live pipeline: parallel forensic extraction on media --------------
    media = [a for a in loaded if _is_media(a["filename"], a["content_type"])]
    non_media = [a for a in loaded if a not in media]

    telemetry: list[Any] = []
    try:
        if media and _extract_fn is not None:
            extract_tasks = [_run_extract(m) for m in media]
            results = await asyncio.gather(*extract_tasks, return_exceptions=True)
            for m, res in zip(media, results):
                if isinstance(res, Exception):
                    logger.error(
                        "Forensic extract failed for %s: %s", m["filename"], res
                    )
                    telemetry.append(
                        {
                            "filename": m["filename"],
                            "error": str(res),
                            "fallback": True,
                        }
                    )
                else:
                    telemetry.append(res)
        elif media:
            logger.warning("Skipping media forensics — T1 not loaded")
            telemetry.extend(
                {
                    "filename": m["filename"],
                    "skipped": True,
                    "reason": _T1_IMPORT_ERROR,
                }
                for m in media
            )

        # Non-media artifacts still go to reasoner as raw descriptors
        for nm in non_media:
            telemetry.append(
                {
                    "filename": nm["filename"],
                    "content_type": nm["content_type"],
                    "kind": "non_media",
                    "preview": nm["bytes"][:2048].decode("utf-8", errors="replace"),
                }
            )

        if _reason_fn is None:
            raise RuntimeError(_T2_IMPORT_ERROR or "reasoning_core not loaded")

        raw = await _run_reason(loaded, telemetry, context)
        elapsed = round(time.perf_counter() - started, 4)
        return _coerce_verdict(raw, case_id=case_id, names=names, elapsed=elapsed)

    except asyncio.TimeoutError:
        logger.error("Pipeline timeout after %ss", PIPELINE_TIMEOUT_SECONDS)
        return _coerce_verdict(
            fallback_verdict(
                case_id=case_id,
                artifact_names=names,
                error_note=f"timeout_after_{PIPELINE_TIMEOUT_SECONDS}s",
                processing_time_seconds=round(time.perf_counter() - started, 4),
            ),
            case_id=case_id,
            names=names,
            elapsed=round(time.perf_counter() - started, 4),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Investigate pipeline failed")
        # Last-resort: try demo mock for stage demos
        demo = resolve_demo_case(context, names)
        if demo is not None:
            demo.case_id = case_id
            demo.artifact_names = names
            demo.processing_time_seconds = round(time.perf_counter() - started, 4)
            demo.mock = True
            demo.fallback = True
            demo.error_note = f"pipeline_error_using_demo: {exc}"
            return _coerce_verdict(
                demo,
                case_id=case_id,
                names=names,
                elapsed=round(time.perf_counter() - started, 4),
            )
        return _coerce_verdict(
            fallback_verdict(
                case_id=case_id,
                artifact_names=names,
                error_note=str(exc),
                processing_time_seconds=round(time.perf_counter() - started, 4),
            ),
            case_id=case_id,
            names=names,
            elapsed=round(time.perf_counter() - started, 4),
        )


@app.get(
    "/api/benchmark",
    response_model=BenchmarkMetrics,
    tags=["evaluation"],
    summary="Run synthetic benchmark suite",
)
async def benchmark():
    """Execute the pre-built directory of 10 synthetic test cases."""
    from run_benchmark import run_benchmark_suite

    try:
        metrics = await asyncio.to_thread(
            run_benchmark_suite, BENCHMARK_DIR, USE_MOCK_DATA
        )
        return metrics
    except Exception as exc:  # noqa: BLE001
        logger.exception("Benchmark failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/demo-cases", tags=["investigation"], summary="List mock demo case ids")
async def demo_cases():
    return {
        "use_mock_data": USE_MOCK_DATA,
        "cases": [
            {
                "id": cid,
                "verdict": DEMO_VERDICTS[cid].verdict,
                "summary": DEMO_VERDICTS[cid].summary,
            }
            for cid in DEMO_CASE_IDS
        ],
    }


# Allow `python main.py` for quick demos
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "false").lower() in {"1", "true", "yes"},
    )
