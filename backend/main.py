from fastapi import FastAPI, File, Form, UploadFile
from typing import Optional

from analyzers.file_analyzer import analyze_file
from analyzers.image_analyzer import analyze_image
from analyzers.audio_analyzer import analyze_audio
from analyzers.evidence_comparator import compare_artifacts
from reasoning.verdict_engine import generate_verdict
from models.investigation import InvestigationResponse


app = FastAPI(
    title="TrustLayer API",
    description="AI-powered digital authenticity and evidence investigation backend.",
    version="1.0.0",
)


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "TrustLayer Backend",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }


@app.post(
    "/api/investigate",
    response_model=InvestigationResponse,
)
async def investigate(
    artifacts: list[UploadFile] = File(...),
    context: Optional[str] = Form(None),
):
    artifact_results = []

    for artifact in artifacts:
        contents = await artifact.read()

        analysis = analyze_file(
            filename=artifact.filename or "unknown",
            content_type=artifact.content_type,
            data=contents,
        )

        if analysis["modality"] == "image":
            image_analysis = analyze_image(contents)
            analysis["image_forensics"] = image_analysis

        elif analysis["modality"] == "audio":
            audio_analysis = analyze_audio(contents)
            analysis["audio_forensics"] = audio_analysis

        artifact_results.append(analysis)

    comparison = compare_artifacts(
        artifact_results
    )

    verdict = generate_verdict(
        artifacts=artifact_results,
        comparison=comparison,
    )

    return {
        "status": "received",
        "context": context,
        "artifact_count": len(artifact_results),
        "artifacts": artifact_results,
        "comparison": comparison,
        "verdict": verdict,
        "message": "Evidence successfully analyzed by TrustLayer backend.",
    }