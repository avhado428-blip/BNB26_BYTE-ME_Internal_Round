from pathlib import Path
from typing import Any


def get_file_family(filename: str) -> str:
    name = Path(filename).stem.lower()

    separators = [
        "_",
        "-",
        " ",
        ".",
    ]

    for separator in separators:
        if separator in name:
            name = name.split(separator)[0]

    return name


def compare_artifacts(
    artifacts: list[dict[str, Any]],
) -> dict:
    relationships = []

    artifact_scores = {
        artifact.get("filename", "unknown"): []
        for artifact in artifacts
    }

    if len(artifacts) < 2:
        return {
            "artifact_count": len(artifacts),
            "relationships": [],
            "artifact_scores": {
                filename: 50
                for filename in artifact_scores
            },
            "summary": (
                "At least two artifacts are required "
                "for cross-modal comparison."
            ),
        }

    for index, source in enumerate(artifacts):
        for target in artifacts[index + 1:]:
            source_name = source.get(
                "filename",
                "unknown",
            )

            target_name = target.get(
                "filename",
                "unknown",
            )

            source_modality = source.get(
                "modality",
                "unknown",
            )

            target_modality = target.get(
                "modality",
                "unknown",
            )

            score = 50
            evidence_strength = 0
            contradiction_strength = 0
            observations = []

            source_family = get_file_family(
                source_name
            )

            target_family = get_file_family(
                target_name
            )

            source_forensics = source.get(
                "image_forensics",
                {},
            )

            target_forensics = target.get(
                "image_forensics",
                {},
            )

            # -------------------------------------------------
            # 1. Modality relationship
            # -------------------------------------------------

            if source_modality != target_modality:
                evidence_strength += 1

                score += 5

                observations.append(
                    "Artifacts provide evidence from different modalities."
                )

            else:
                observations.append(
                    "Artifacts use the same modality."
                )

            # -------------------------------------------------
            # 2. Filename relationship
            # -------------------------------------------------

            if (
                source_family
                and target_family
                and source_family == target_family
            ):
                evidence_strength += 2

                score += 15

                observations.append(
                    "Filenames share a common evidence identifier."
                )

            else:
                observations.append(
                    "Filenames do not share a common evidence identifier."
                )

            # -------------------------------------------------
            # 3. Capture timestamps
            # -------------------------------------------------

            source_date = source_forensics.get(
                "date_taken"
            )

            target_date = target_forensics.get(
                "date_taken"
            )

            if source_date and target_date:
                evidence_strength += 2

                if source_date == target_date:
                    score += 15

                    observations.append(
                        "Available capture timestamps match."
                    )

                else:
                    contradiction_strength += 2

                    score -= 15

                    observations.append(
                        "Available capture timestamps differ."
                    )

            elif source_date or target_date:
                observations.append(
                    "Only one artifact contains a capture timestamp."
                )

            else:
                observations.append(
                    "Capture timestamps are unavailable."
                )

            # -------------------------------------------------
            # 4. Image dimensions
            # -------------------------------------------------

            source_dimensions = (
                source_forensics.get("width"),
                source_forensics.get("height"),
            )

            target_dimensions = (
                target_forensics.get("width"),
                target_forensics.get("height"),
            )

            if (
                source_modality == "image"
                and target_modality == "image"
                and source_dimensions != (None, None)
                and target_dimensions != (None, None)
            ):
                if source_dimensions == target_dimensions:
                    evidence_strength += 1

                    score += 5

                    observations.append(
                        "Image dimensions match."
                    )

                else:
                    observations.append(
                        "Image dimensions differ."
                    )

            # -------------------------------------------------
            # 5. Image format
            # -------------------------------------------------

            source_format = source_forensics.get(
                "format"
            )

            target_format = target_forensics.get(
                "format"
            )

            if (
                source_modality == "image"
                and target_modality == "image"
                and source_format
                and target_format
            ):
                if source_format == target_format:
                    evidence_strength += 1

                    score += 5

                    observations.append(
                        "Image formats match."
                    )

                else:
                    observations.append(
                        "Image formats differ."
                    )

            # -------------------------------------------------
            # 6. Image entropy
            # -------------------------------------------------

            source_entropy = source_forensics.get(
                "entropy"
            )

            target_entropy = target_forensics.get(
                "entropy"
            )

            if (
                source_entropy is not None
                and target_entropy is not None
            ):
                entropy_difference = abs(
                    source_entropy -
                    target_entropy
                )

                if entropy_difference <= 0.5:
                    evidence_strength += 1

                    score += 5

                    observations.append(
                        "Image entropy characteristics are similar."
                    )

                elif entropy_difference >= 1.5:
                    observations.append(
                        "Image entropy characteristics differ noticeably."
                    )

                else:
                    observations.append(
                        "Image entropy characteristics show a moderate difference."
                    )

            # -------------------------------------------------
            # 7. Metadata consistency
            # -------------------------------------------------

            source_metadata = source_forensics.get(
                "metadata_integrity_score"
            )

            target_metadata = target_forensics.get(
                "metadata_integrity_score"
            )

            if (
                source_metadata is not None
                and target_metadata is not None
            ):
                metadata_difference = abs(
                    source_metadata -
                    target_metadata
                )

                if metadata_difference <= 10:
                    evidence_strength += 1

                    score += 5

                    observations.append(
                        "Metadata integrity signals are similar."
                    )

                elif metadata_difference >= 40:
                    observations.append(
                        "Metadata integrity signals differ substantially."
                    )

            # -------------------------------------------------
            # 8. Synthetic signal comparison
            # -------------------------------------------------

            source_synthetic = source_forensics.get(
                "synthetic_signal"
            )

            target_synthetic = target_forensics.get(
                "synthetic_signal"
            )

            if (
                source_synthetic is not None
                and target_synthetic is not None
            ):
                synthetic_difference = abs(
                    source_synthetic -
                    target_synthetic
                )

                if synthetic_difference <= 15:
                    evidence_strength += 1

                    score += 5

                    observations.append(
                        "Synthetic signal characteristics are similar."
                    )

                elif synthetic_difference >= 40:
                    observations.append(
                        "Synthetic signal characteristics differ substantially."
                    )

            # -------------------------------------------------
            # 9. Provenance comparison
            # -------------------------------------------------

            source_provenance = source_forensics.get(
                "provenance_score"
            )

            target_provenance = target_forensics.get(
                "provenance_score"
            )

            if (
                source_provenance is not None
                and target_provenance is not None
            ):
                provenance_difference = abs(
                    source_provenance -
                    target_provenance
                )

                if provenance_difference <= 15:
                    evidence_strength += 1

                    score += 5

                    observations.append(
                        "Provenance characteristics are similar."
                    )

                elif provenance_difference >= 40:
                    observations.append(
                        "Provenance characteristics differ substantially."
                    )

            # -------------------------------------------------
            # 10. Explicit contradiction detection
            # -------------------------------------------------

            if (
                source_date
                and target_date
                and source_date != target_date
            ):
                contradiction_strength += 2

            if (
                source_synthetic is not None
                and target_synthetic is not None
            ):
                synthetic_difference = abs(
                    source_synthetic -
                    target_synthetic
                )

                if synthetic_difference >= 50:
                    contradiction_strength += 1

            # -------------------------------------------------
            # 11. Clamp score
            # -------------------------------------------------

            score = max(
                0,
                min(100, score),
            )

            # -------------------------------------------------
            # 12. Relationship classification
            # -------------------------------------------------

            if contradiction_strength >= 2:
                relationship = "Contradicts"

            elif (
                evidence_strength >= 5
                and score >= 75
            ):
                relationship = "Corroborates"

            elif (
                evidence_strength >= 3
                and score >= 70
            ):
                relationship = "Corroborates"

            elif (
                evidence_strength >= 2
                and score >=55
            ):
                relationship ="Uncertain"    
   
            else:
                relationship = "Unrelated"

            # -------------------------------------------------
            # 13. Relationship explanation
            # -------------------------------------------------

            explanation = " ".join(
                observations
            )

            relationships.append(
                {
                    "source": source_name,
                    "target": target_name,
                    "relationship": relationship,
                    "consistency_score": score,
                    "explanation": explanation,
                }
            )

            # -------------------------------------------------
            # 14. Artifact scoring
            # -------------------------------------------------

            artifact_scores[
                source_name
            ].append(score)

            artifact_scores[
                target_name
            ].append(score)

    # ---------------------------------------------------------
    # Calculate per-artifact cross-modal consistency
    # ---------------------------------------------------------

    final_artifact_scores = {}

    for filename, scores in artifact_scores.items():
        if scores:
            final_artifact_scores[filename] = round(
                sum(scores) / len(scores)
            )
        else:
            final_artifact_scores[filename] = 50

    # ---------------------------------------------------------
    # Build summary
    # ---------------------------------------------------------

    corroborating_count = sum(
        1
        for relationship in relationships
        if relationship["relationship"] == "Corroborates"
    )

    contradicting_count = sum(
        1
        for relationship in relationships
        if relationship["relationship"] == "Contradicts"
    )

    unrelated_count = sum(
        1
        for relationship in relationships
        if relationship["relationship"] == "Unrelated"
    )

    summary = (
        f"Cross-artifact comparison completed for "
        f"{len(artifacts)} artifacts. "
        f"{corroborating_count} relationship(s) corroborate, "
        f"{contradicting_count} contradict, and "
        f"{unrelated_count} are unrelated based on "
        f"available forensic and contextual signals."
    )

    return {
        "artifact_count": len(artifacts),
        "relationships": relationships,
        "artifact_scores": final_artifact_scores,
        "summary": summary,
    }