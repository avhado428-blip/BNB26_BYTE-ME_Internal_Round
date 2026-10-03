from typing import Any


def generate_verdict(
    artifacts: list[dict[str, Any]],
    comparison: dict[str, Any],
) -> dict[str, Any]:
    if not artifacts:
        return {
            "verdict": "Insufficient Evidence",
            "confidence": 0,
            "uncertainty": 100,
            "reasoning": [
                "No evidence artifacts were provided."
            ],
            "signals": [],
        }

    signals = []
    reasoning = []

    suspicious_score = 0
    supporting_score = 0
    uncertainty_score = 0

    image_count = 0

    for artifact in artifacts:
        filename = artifact.get(
            "filename",
            "unknown",
        )

        modality = artifact.get(
            "modality",
            "unknown",
        )

        signals.append(
            {
                "artifact": filename,
                "modality": modality,
            }
        )

        if modality != "image":
            uncertainty_score += 1

            reasoning.append(
                f"{filename} is a {modality} artifact and was "
                f"not evaluated with image-specific forensic signals."
            )

            continue

        image_count += 1

        image_forensics = artifact.get(
            "image_forensics",
            {},
        )

        metadata_score = image_forensics.get(
            "metadata_integrity_score"
        )

        provenance_score = image_forensics.get(
            "provenance_score"
        )

        compression_score = image_forensics.get(
            "compression_score"
        )

        structural_score = image_forensics.get(
            "structural_score"
        )

        synthetic_signal = image_forensics.get(
            "synthetic_signal"
        )

        entropy = image_forensics.get(
            "entropy"
        )

        metadata = image_forensics.get(
            "metadata",
            {},
        )

        observations = image_forensics.get(
            "observations",
            [],
        )

        # -------------------------------------------------
        # Metadata integrity
        # -------------------------------------------------

        if metadata_score is not None:
            if metadata_score >= 80:
                supporting_score += 2

                reasoning.append(
                    f"{filename} contains relatively strong "
                    f"metadata integrity signals."
                )

            elif metadata_score >= 50:
                reasoning.append(
                    f"{filename} contains partially informative "
                    f"metadata signals."
                )

            else:
                uncertainty_score += 1

                reasoning.append(
                    f"{filename} has limited metadata integrity "
                    f"signals."
                )

        # -------------------------------------------------
        # Provenance
        # -------------------------------------------------

        if provenance_score is not None:
            if provenance_score >= 80:
                supporting_score += 2

                reasoning.append(
                    f"{filename} contains relatively strong "
                    f"provenance signals."
                )

            elif provenance_score >= 50:
                reasoning.append(
                    f"{filename} contains partial provenance signals."
                )

            else:
                uncertainty_score += 1

                reasoning.append(
                    f"{filename} has limited provenance information; "
                    f"this increases uncertainty but does not by itself "
                    f"indicate manipulation."
                )

        # -------------------------------------------------
        # Compression
        # -------------------------------------------------

        if compression_score is not None:
            if compression_score < 40:
                suspicious_score += 2

                reasoning.append(
                    f"{filename} shows an unusual compression "
                    f"characteristic that warrants review."
                )

            elif compression_score >= 80:
                supporting_score += 1

                reasoning.append(
                    f"{filename} shows relatively consistent "
                    f"compression characteristics."
                )

        # -------------------------------------------------
        # Structural signals
        # -------------------------------------------------

        if structural_score is not None:
            if structural_score < 40:
                suspicious_score += 2

                reasoning.append(
                    f"{filename} shows weaker structural image signals."
                )

            elif structural_score >= 80:
                supporting_score += 1

                reasoning.append(
                    f"{filename} shows relatively consistent "
                    f"structural image signals."
                )

        # -------------------------------------------------
        # Synthetic signal
        # -------------------------------------------------

        if synthetic_signal is not None:
            signals.append(
                {
                    "artifact": filename,
                    "observation": (
                        f"Synthetic signal score: "
                        f"{synthetic_signal}."
                    ),
                }
            )

            if synthetic_signal >= 75:
                suspicious_score += 3

                reasoning.append(
                    f"{filename} contains elevated synthetic "
                    f"indicators across the available forensic signals."
                )

            elif synthetic_signal >= 55:
                suspicious_score += 1

                reasoning.append(
                    f"{filename} contains some synthetic indicators "
                    f"that warrant further review."
                )

            elif synthetic_signal < 30:
                supporting_score += 2

                reasoning.append(
                    f"{filename} contains relatively low synthetic "
                    f"indicators."
                )

            else:
                reasoning.append(
                    f"{filename} does not show strong synthetic "
                    f"indicators from the available signals."
                )

        # -------------------------------------------------
        # Entropy
        # -------------------------------------------------

        if entropy is not None:
            signals.append(
                {
                    "artifact": filename,
                    "observation": (
                        f"Image entropy measured at {entropy}."
                    ),
                }
            )

            if entropy < 2.0:
                uncertainty_score += 1

                reasoning.append(
                    f"{filename} has unusually low image entropy; "
                    f"this characteristic requires contextual review."
                )

            elif entropy > 7.5:
                uncertainty_score += 1

                reasoning.append(
                    f"{filename} has relatively high image entropy; "
                    f"this characteristic is recorded as contextual evidence."
                )

        # -------------------------------------------------
        # Metadata observations
        # -------------------------------------------------

        if not metadata:
            signals.append(
                {
                    "artifact": filename,
                    "observation": (
                        "No EXIF metadata was found."
                    ),
                }
            )

        if metadata.get("Software"):
            software = metadata.get(
                "Software"
            )

            signals.append(
                {
                    "artifact": filename,
                    "observation": (
                        f"Software metadata identifies: "
                        f"{software}."
                    ),
                }
            )

            uncertainty_score += 1

            reasoning.append(
                f"{filename} contains software metadata "
                f"that should be reviewed as part of provenance analysis."
            )

        # -------------------------------------------------
        # Analyzer observations
        # -------------------------------------------------

        for observation in observations:
            signals.append(
                {
                    "artifact": filename,
                    "observation": observation,
                }
            )

    # =========================================================
    # CROSS-ARTIFACT RELATIONSHIPS
    # =========================================================

    relationships = comparison.get(
        "relationships",
        [],
    )

    if relationships:
        reasoning.append(
            f"Cross-artifact comparison produced "
            f"{len(relationships)} evidence relationship(s)."
        )

        for relationship in relationships:
            consistency_score = relationship.get(
                "consistency_score"
            )

            source = relationship.get(
                "source",
                "unknown",
            )

            target = relationship.get(
                "target",
                "unknown",
            )

            relationship_type = relationship.get(
                "relationship",
                "unknown",
            )

            explanation = relationship.get(
                "explanation"
            )

            # -------------------------------------------------
            # Consistency score
            # -------------------------------------------------

            if consistency_score is not None:
                signals.append(
                    {
                        "artifact": (
                            f"{source} -> {target}"
                        ),
                        "observation": (
                            f"Cross-artifact consistency "
                            f"score: {consistency_score}."
                        ),
                    }
                )

            # -------------------------------------------------
            # Corroborates
            # -------------------------------------------------

            if relationship_type == "Corroborates":
                supporting_score += 2

                if consistency_score is not None:
                    if consistency_score >= 85:
                        supporting_score += 2

                    elif consistency_score >= 70:
                        supporting_score += 1

                reasoning.append(
                    f"{source} and {target} provide corroborating "
                    f"evidence signals."
                )

            # -------------------------------------------------
            # Contradicts
            # -------------------------------------------------

            elif relationship_type == "Contradicts":
                suspicious_score += 2

                if consistency_score is not None:
                    if consistency_score < 30:
                        suspicious_score += 2

                    elif consistency_score < 50:
                        suspicious_score += 1

                reasoning.append(
                    f"{source} and {target} contain contradictory "
                    f"evidence signals."
                )

            # -------------------------------------------------
            # Unrelated
            # -------------------------------------------------

            elif relationship_type == "Unrelated":
                uncertainty_score += 1

                reasoning.append(
                    f"{source} and {target} do not provide enough "
                    f"shared evidence context to establish a meaningful "
                    f"relationship."
                )

            # -------------------------------------------------
            # Explanation
            # -------------------------------------------------

            if explanation:
                signals.append(
                    {
                        "artifact": (
                            f"{source} -> {target}"
                        ),
                        "observation": explanation,
                    }
                )

    else:
        uncertainty_score += 2

        reasoning.append(
            "No cross-artifact relationships were available "
            "for comparison."
        )

    # =========================================================
    # FINAL VERDICT
    # =========================================================

    total_evidence = (
        suspicious_score +
        supporting_score
    )

    if total_evidence == 0:
        verdict = "Insufficient Evidence"

        confidence = 30

        uncertainty = 70

        reasoning.append(
            "Available forensic signals are insufficient "
            "to establish a reliable classification."
        )

    elif suspicious_score > supporting_score:
        difference = (
            suspicious_score -
            supporting_score
        )

        confidence = 50 + (
            difference * 5
        )

        confidence = min(
            88,
            confidence,
        )

        confidence -= min(
            10,
            uncertainty_score * 2,
        )

        confidence = max(
            45,
            confidence,
        )

        uncertainty = 100 - confidence

        verdict = "Potentially Manipulated"

        reasoning.append(
            "The available evidence contains more suspicious "
            "signals than supporting signals."
        )

    elif supporting_score > suspicious_score:
        difference = (
            supporting_score -
            suspicious_score
        )

        confidence = 50 + (
            difference * 5
        )

        confidence = min(
            88,
            confidence,
        )

        confidence -= min(
            10,
            uncertainty_score * 2,
        )

        confidence = max(
            45,
            confidence,
        )

        uncertainty = 100 - confidence

        verdict = "No Strong Manipulation Signal"

        reasoning.append(
            "The available evidence contains more supporting "
            "signals than suspicious signals."
        )

    else:
        verdict = "Insufficient Evidence"

        confidence = 40

        uncertainty = 60

        reasoning.append(
            "Suspicious and supporting signals are too closely "
            "balanced for a reliable classification."
        )

    # ---------------------------------------------------------
    # No image evidence
    # ---------------------------------------------------------

    if image_count == 0:
        verdict = "Insufficient Evidence"

        confidence = min(
            confidence,
            35,
        )

        uncertainty = 100 - confidence

        reasoning.append(
            "No image artifacts were available for image-specific "
            "forensic analysis."
        )

    return {
        "verdict": verdict,
        "confidence": confidence,
        "uncertainty": uncertainty,
        "reasoning": reasoning,
        "signals": signals,
    }