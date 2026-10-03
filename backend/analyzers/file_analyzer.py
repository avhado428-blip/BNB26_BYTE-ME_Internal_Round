import hashlib
from pathlib import Path


def calculate_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def detect_modality(filename: str, content_type: str | None) -> str:
    extension = Path(filename).suffix.lower()

    image_extensions = {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
        ".bmp",
        ".tiff",
        ".svg",
    }

    video_extensions = {
        ".mp4",
        ".mov",
        ".avi",
        ".mkv",
        ".webm",
        ".mpeg",
        ".mpg",
    }

    audio_extensions = {
        ".mp3",
        ".wav",
        ".ogg",
        ".flac",
        ".m4a",
        ".aac",
    }

    document_extensions = {
        ".pdf",
        ".doc",
        ".docx",
        ".ppt",
        ".pptx",
        ".xls",
        ".xlsx",
    }

    message_extensions = {
        ".txt",
        ".csv",
        ".json",
        ".xml",
        ".md",
    }

    if extension in image_extensions:
        return "image"

    if extension in video_extensions:
        return "video"

    if extension in audio_extensions:
        return "audio"

    if extension in document_extensions:
        return "document"

    if extension in message_extensions:
        return "message"

    if content_type:
        if content_type.startswith("image/"):
            return "image"

        if content_type.startswith("video/"):
            return "video"

        if content_type.startswith("audio/"):
            return "audio"

        if content_type.startswith("text/"):
            return "message"

    return "unknown"


def analyze_file(
    filename: str,
    content_type: str | None,
    data: bytes,
) -> dict:
    return {
        "filename": filename,
        "content_type": content_type or "application/octet-stream",
        "size_bytes": len(data),
        "sha256": calculate_sha256(data),
        "modality": detect_modality(filename, content_type),
    }