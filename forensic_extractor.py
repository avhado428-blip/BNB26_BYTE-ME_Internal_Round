import io
import os
import tempfile
from typing import Any

import exifread
import librosa
import numpy as np
from PIL import Image, ImageChops


# ---------------------------------------------------------------------------
# Core signal extraction helpers
# ---------------------------------------------------------------------------

def perform_ela(image_bytes: bytes, quality: int = 90) -> dict[str, Any]:
    """Error Level Analysis. Returns a JSON-safe dict, never raises."""
    try:
        original = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        buffer = io.BytesIO()
        original.save(buffer, "JPEG", quality=quality)
        buffer.seek(0)
        resaved = Image.open(buffer).convert("RGB")

        diff = ImageChops.difference(original, resaved)
        arr = np.asarray(diff, dtype=np.float32) * 10
        arr = np.clip(arr, 0, 255)
        gray = arr.mean(axis=2)

        return {
            "ela_ok": True,
            "max_anomaly_score": float(gray.max()),
            "mean_difference": float(gray.mean()),
            "p99_difference": float(np.percentile(gray, 99)),
            "high_anomaly_ratio": float((gray > 50).mean()),
            "image_width": int(original.width),
            "image_height": int(original.height),
        }
    except Exception as exc:  # pragma: no cover - defensive fail-safe
        return {"ela_ok": False, "error": str(exc)}


SUSPICIOUS_SOFTWARE = [
    "photoshop",
    "gimp",
    "midjourney",
    "dall",
    "stable diffusion",
    "firefly",
    "canva",
    "lightroom",
    "snapseed",
    "picsart",
]


def _to_degrees(values, ref):
    """Convert EXIF GPS values to signed decimal degrees."""
    try:
        d, m, s = [float(v) for v in values]
        deg = d + m / 60.0 + s / 3600.0
        if str(ref).strip().upper() in ("S", "W"):
            deg = -deg
        return round(deg, 6)
    except Exception:
        return None


def extract_exif_metadata(image_bytes: bytes) -> dict[str, Any]:
    """Parse EXIF and flag suspicious signs. Never raises."""
    try:
        tags = exifread.process_file(io.BytesIO(image_bytes), details=False)
        flags: list[str] = []

        if not tags:
            return {
                "exif_ok": True,
                "has_exif": False,
                "flags": ["no_exif_metadata"],
            }

        def get(key: str):
            return str(tags[key]).strip() if key in tags else None

        date_taken = get("EXIF DateTimeOriginal")
        camera_make = get("Image Make")
        camera_model = get("Image Model")
        software = get("Image Software")

        lat = lon = None
        if "GPS GPSLatitude" in tags and "GPS GPSLongitude" in tags:
            lat = _to_degrees(tags["GPS GPSLatitude"].values, tags.get("GPS GPSLatitudeRef", "N"))
            lon = _to_degrees(tags["GPS GPSLongitude"].values, tags.get("GPS GPSLongitudeRef", "E"))

        if software and any(k in software.lower() for k in SUSPICIOUS_SOFTWARE):
            flags.append(f"editing_or_ai_software: {software}")
        if not date_taken:
            flags.append("missing_capture_date")
        if not camera_make and not camera_model:
            flags.append("missing_camera_info")

        payload = {
            "exif_ok": True,
            "has_exif": True,
            "DateTimeOriginal": date_taken,
            "CameraMake": camera_make,
            "CameraModel": camera_model,
            "Software": software,
            "gps_latitude": lat,
            "gps_longitude": lon,
            "flags": flags,
        }
        payload["date_taken"] = date_taken
        payload["camera_make"] = camera_make
        payload["camera_model"] = camera_model
        payload["software"] = software
        return payload
    except Exception as exc:  # pragma: no cover
        return {"exif_ok": False, "error": str(exc)}


def analyze_audio_signal(audio_bytes: bytes) -> dict[str, Any]:
    """Spectral/silence heuristics for synthetic speech clues. Never raises."""
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".audio") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        y, sr = librosa.load(tmp_path, sr=None, mono=True)
        if y.size == 0:
            return {"audio_ok": False, "error": "empty audio"}

        duration = float(len(y) / sr)
        flags: list[str] = []

        if float(np.max(np.abs(y))) == 0.0:
            return {
                "audio_ok": True,
                "duration_sec": duration,
                "flags": ["audio_is_entirely_silent"],
            }

        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        rms = librosa.feature.rms(y=y)[0]

        centroid_mean = float(centroid.mean())
        centroid_variance = float(centroid.var())
        centroid_cv = float(centroid.std() / centroid_mean) if centroid_mean else 0.0

        quiet_ratio = float((rms < 0.02 * rms.max()).mean())
        digital_silence_ratio = float((np.abs(y) < 1e-4).mean())

        spec = np.abs(librosa.stft(y)) ** 2
        energy = spec.mean(axis=1)
        freqs = librosa.fft_frequencies(sr=sr)
        cum = np.cumsum(energy)
        rolloff_hz = float(freqs[np.searchsorted(cum, 0.995 * cum[-1])])
        nyquist = sr / 2.0
        rolloff_vs_nyquist = rolloff_hz / nyquist

        if duration < 3.0:
            flags.append("very_short_clip_low_reliability")
        if digital_silence_ratio > 0.05:
            flags.append("digital_silence_gaps")

        payload = {
            "audio_ok": True,
            "duration_sec": round(duration, 2),
            "sample_rate": int(sr),
            "spectral_centroid_mean": round(centroid_mean, 2),
            "spectral_centroid_variance": round(centroid_variance, 2),
            "spectral_centroid_cv": round(centroid_cv, 3),
            "zero_crossing_rate_mean": round(float(zcr.mean()), 4),
            "quiet_frame_ratio": round(quiet_ratio, 3),
            "digital_silence_ratio": round(digital_silence_ratio, 4),
            "energy_rolloff_hz": round(rolloff_hz, 1),
            "rolloff_vs_nyquist": round(rolloff_vs_nyquist, 3),
            "flags": flags,
        }
        payload["unnatural_silence_dropoffs"] = bool(digital_silence_ratio > 0.05)
        return payload
    except Exception as exc:  # pragma: no cover
        return {"audio_ok": False, "error": str(exc)}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
AUDIO_EXT = {".wav", ".mp3", ".m4a", ".flac", ".ogg"}
VIDEO_EXT = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
TEXT_EXT = {".txt", ".md"}


def _single_artifact_analysis(data: bytes, *, filename: str = "unnamed") -> dict[str, Any]:
    """Build one artifact analysis entry, suitable for telemetry and pipeline use."""
    ext = os.path.splitext(filename or "unnamed")[1].lower()
    entry: dict[str, Any] = {
        "filename": filename,
        "size_bytes": len(data),
        "modality": "unknown",
        "flags": [],
    }

    if ext in IMAGE_EXT:
        entry["modality"] = "image"
        entry["ela"] = perform_ela(data)
        entry["exif"] = extract_exif_metadata(data)
        entry["ela_anomalies"] = entry["ela"]
        entry["exif_metadata"] = entry["exif"]
        entry["flags"] = list(entry["exif"].get("flags", []))
        if ext == ".png":
            entry["note"] = "ELA is designed for JPEG; treat PNG ELA as unreliable"
    elif ext in AUDIO_EXT:
        entry["modality"] = "audio"
        entry["audio"] = analyze_audio_signal(data)
        entry["audio_spectrogram"] = entry["audio"]
        entry["flags"] = list(entry["audio"].get("flags", []))
    elif ext in VIDEO_EXT:
        entry["modality"] = "video"
        entry["flags"] = []
        entry["note"] = "video forensics not implemented yet"
    elif ext in TEXT_EXT:
        entry["modality"] = "text"
        entry["char_count"] = len(data)
        entry["flags"] = []
    else:
        entry["flags"] = ["unsupported_file_type"]

    return entry


def extract_forensics(
    artifacts: Any,
    *,
    filename: str | None = None,
    content_type: str | None = None,
) -> dict[str, Any]:
    """
    Compatibility wrapper for the repo's backend and benchmark pipeline.

    Supports both of these call patterns:
      - extract_forensics([{"filename": "a.jpg", "content": b"..."}, ...])
      - extract_forensics(b"...", filename="a.jpg", content_type="image/jpeg")
    """
    if isinstance(artifacts, (list, tuple)):
        report = {"artifacts": {}, "all_flags": []}
        for art in artifacts:
            name = "unknown"
            try:
                art_dict = art if isinstance(art, dict) else {"filename": str(art)}
                name = str(art_dict.get("filename", "unknown"))
                data = art_dict.get("content") or art_dict.get("bytes") or b""
                entry = _single_artifact_analysis(data, filename=name)
                report["artifacts"][name] = entry
                report["all_flags"].extend(f"{name}: {flag}" for flag in entry.get("flags", []))
            except Exception as exc:  # pragma: no cover
                report["artifacts"][name] = {"filename": name, "error": str(exc), "flags": []}
        return report

    if isinstance(artifacts, dict):
        name = str(artifacts.get("filename", filename or "unnamed"))
        payload = artifacts.get("content") or artifacts.get("bytes") or b""
        return _single_artifact_analysis(payload, filename=name)

    data = bytes(artifacts)
    safe_filename = filename or "unnamed"
    return _single_artifact_analysis(data, filename=safe_filename)


__all__ = [
    "perform_ela",
    "extract_exif_metadata",
    "analyze_audio_signal",
    "extract_forensics",
    "IMAGE_EXT",
    "AUDIO_EXT",
    "VIDEO_EXT",
    "TEXT_EXT",
]


if __name__ == "__main__":
    import json
    import sys

    artifacts: list[dict[str, Any]] = []
    for path in sys.argv[1:]:
        with open(path, "rb") as fh:
            artifacts.append({"filename": os.path.basename(path), "content": fh.read()})
    print(json.dumps(extract_forensics(artifacts), indent=2))
