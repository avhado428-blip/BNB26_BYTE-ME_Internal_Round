import math
from io import BytesIO

from PIL import Image
from PIL.ExifTags import TAGS


def calculate_image_entropy(
    image: Image.Image,
) -> float:
    grayscale = image.convert("L")

    histogram = grayscale.histogram()

    total_pixels = sum(histogram)

    if total_pixels == 0:
        return 0.0

    entropy = 0.0

    for count in histogram:
        if count == 0:
            continue

        probability = count / total_pixels

        entropy -= (
            probability *
            math.log2(probability)
        )

    return round(entropy, 3)


def extract_exif_metadata(data: bytes) -> dict:
    try:
        image = Image.open(BytesIO(data))
        exif_data = image.getexif()

        metadata = {}

        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(
                tag_id,
                str(tag_id),
            )

            if isinstance(value, bytes):
                value = value.decode(
                    "utf-8",
                    errors="replace",
                )

            metadata[tag_name] = str(value)

        return metadata

    except Exception:
        return {}


def calculate_metadata_score(
    metadata: dict,
) -> int:
    if not metadata:
        return 25

    score = 30

    if metadata.get("Make"):
        score += 15

    if metadata.get("Model"):
        score += 15

    if metadata.get("DateTimeOriginal"):
        score += 15

    if metadata.get("GPSInfo"):
        score += 10

    if metadata.get("Artist"):
        score += 5

    if metadata.get("Copyright"):
        score += 5

    if metadata.get("Software"):
        score -= 10

    return max(
        0,
        min(100, score),
    )


def calculate_provenance_score(
    metadata: dict,
) -> int:
    if not metadata:
        return 25

    score = 20

    if metadata.get("Make"):
        score += 20

    if metadata.get("Model"):
        score += 20

    if metadata.get("DateTimeOriginal"):
        score += 20

    if metadata.get("GPSInfo"):
        score += 10

    if metadata.get("Copyright"):
        score += 5

    if metadata.get("Software"):
        score -= 15

    return max(
        0,
        min(100, score),
    )


def analyze_jpeg_structure(
    image: Image.Image,
    data: bytes,
) -> dict:
    observations = []

    compression_score = 70

    if image.format != "JPEG":
        return {
            "compression_score": 70,
            "observations": [
                "JPEG-specific compression analysis was not applicable."
            ],
        }

    try:
        quantization_tables = getattr(
            image,
            "quantization",
            {},
        )

        if quantization_tables:
            table_count = len(
                quantization_tables
            )

            if table_count == 1:
                compression_score -= 5

                observations.append(
                    "The JPEG contains a single quantization table."
                )

            elif table_count >= 2:
                compression_score += 5

                observations.append(
                    "The JPEG contains multiple quantization tables."
                )

        if len(data) < 50_000:
            compression_score -= 5

            observations.append(
                "The JPEG file has a relatively small encoded size."
            )

        elif len(data) > 10_000_000:
            compression_score += 5

            observations.append(
                "The JPEG file has a relatively large encoded size."
            )

        if image.width >= 4000 or image.height >= 4000:
            compression_score += 5

            observations.append(
                "The JPEG has a high-resolution dimension profile."
            )

    except Exception:
        observations.append(
            "JPEG compression structure could not be fully inspected."
        )

    return {
        "compression_score": max(
            0,
            min(100, compression_score),
        ),
        "observations": observations,
    }


def calculate_structural_score(
    width: int,
    height: int,
    image_format: str,
    entropy: float,
) -> int:
    score = 65

    if width >= 512 and height >= 512:
        score += 10

    if width >= 1920 and height >= 1080:
        score += 5

    if width < 256 or height < 256:
        score -= 20

    if width < 128 or height < 128:
        score -= 10

    if image_format in {
        "JPEG",
        "PNG",
        "WEBP",
    }:
        score += 5

    if entropy < 2.0:
        score -= 10

    elif entropy >= 5.0:
        score += 5

    return max(
        0,
        min(100, score),
    )


def calculate_synthetic_signal(
    metadata_score: int,
    provenance_score: int,
    compression_score: int,
    structural_score: int,
    entropy: float,
    software: str | None,
) -> int:
    signal = 100

    signal -= int(
        metadata_score * 0.15
    )

    signal -= int(
        provenance_score * 0.20
    )

    signal -= int(
        compression_score * 0.30
    )

    signal -= int(
        structural_score * 0.20
    )

    if entropy < 2.0:
        signal += 10

    elif entropy > 7.5:
        signal += 5

    if software:
        signal += 10

    return max(
        0,
        min(100, signal),
    )


def analyze_image(data: bytes) -> dict:
    try:
        image = Image.open(
            BytesIO(data)
        )

        width, height = image.size

        image_format = (
            image.format or "UNKNOWN"
        )

        metadata = extract_exif_metadata(
            data
        )

        entropy = calculate_image_entropy(
            image
        )

        software = metadata.get(
            "Software"
        )

        camera_make = metadata.get(
            "Make"
        )

        camera_model = metadata.get(
            "Model"
        )

        date_taken = metadata.get(
            "DateTimeOriginal"
        )

        observations = []

        if metadata:
            observations.append(
                "EXIF metadata is present in the image."
            )
        else:
            observations.append(
                "No EXIF metadata was found in the image."
            )

        if camera_make:
            observations.append(
                f"Camera manufacturer metadata: {camera_make}."
            )

        if camera_model:
            observations.append(
                f"Camera model metadata: {camera_model}."
            )

        if date_taken:
            observations.append(
                "A capture timestamp is present in the metadata."
            )

        if software:
            observations.append(
                f"Software metadata identifies: {software}."
            )

            observations.append(
                "The presence of editing software metadata should be reviewed as a provenance signal."
            )

        if width >= 4000 or height >= 4000:
            observations.append(
                "The image has a high-resolution dimension profile."
            )

        if width < 256 or height < 256:
            observations.append(
                "The image has a relatively small dimension profile."
            )

        aspect_ratio = (
            round(
                width / height,
                3,
            )
            if height
            else 0
        )

        if aspect_ratio >= 1.7:
            observations.append(
                "The image uses a wide aspect ratio."
            )

        elif aspect_ratio <= 0.6:
            observations.append(
                "The image uses a tall aspect ratio."
            )

        if entropy < 2.0:
            observations.append(
                "Image entropy is unusually low and indicates a relatively simple visual structure."
            )

        elif entropy >= 7.5:
            observations.append(
                "Image entropy is relatively high and indicates a complex visual structure."
            )

        metadata_score = calculate_metadata_score(
            metadata
        )

        provenance_score = calculate_provenance_score(
            metadata
        )

        jpeg_analysis = analyze_jpeg_structure(
            image,
            data,
        )

        compression_score = jpeg_analysis[
            "compression_score"
        ]

        observations.extend(
            jpeg_analysis["observations"]
        )

        structural_score = calculate_structural_score(
            width,
            height,
            image_format,
            entropy,
        )

        synthetic_signal = calculate_synthetic_signal(
            metadata_score,
            provenance_score,
            compression_score,
            structural_score,
            entropy,
            software,
        )

        return {
            "valid_image": True,
            "format": image_format,
            "width": width,
            "height": height,
            "aspect_ratio": aspect_ratio,
            "mode": image.mode,
            "entropy": entropy,
            "metadata": metadata,
            "camera": {
                "make": camera_make,
                "model": camera_model,
            },
            "date_taken": date_taken,
            "software": software,
            "metadata_integrity_score": metadata_score,
            "provenance_score": provenance_score,
            "compression_score": compression_score,
            "structural_score": structural_score,
            "synthetic_signal": synthetic_signal,
            "observations": observations,
        }

    except Exception as error:
        return {
            "valid_image": False,
            "error": str(error),
            "metadata": {},
            "observations": [
                "The uploaded file could not be parsed as a valid image."
            ],
            "metadata_integrity_score": 0,
            "provenance_score": 0,
            "compression_score": 0,
            "structural_score": 0,
            "synthetic_signal": 0,
        }