
"use client";

import { useState } from "react";
import type {
  EdgeRelationship,
  Investigation,
} from "@/lib/types";

interface EvidenceInspectionProps {
  investigation: Investigation;
  selectedArtifactId?: string | null;
}

const relationshipStyles: Record<
  EdgeRelationship,
  {
    color: string;
    border: string;
    background: string;
    dot: string;
    description: string;
  }
> = {
  Corroborates: {
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    background: "bg-emerald-500/5",
    dot: "bg-emerald-400",
    description:
      "Evidence supports or aligns with the connected artifact.",
  },

  Contradicts: {
    color: "text-red-400",
    border: "border-red-500/30",
    background: "bg-red-500/5",
    dot: "bg-red-400",
    description:
      "Evidence contains signals that conflict with the connected artifact.",
  },

  Uncertain: {
    color: "text-amber-400",
    border: "border-amber-500/30",
    background: "bg-amber-500/5",
    dot: "bg-amber-400",
    description:
      "Available evidence is not strong enough to establish a clear relationship.",
  },

  Unrelated: {
    color: "text-slate-400",
    border: "border-slate-600/40",
    background: "bg-slate-500/5",
    dot: "bg-slate-500",
    description:
      "No meaningful relationship was established between these artifacts.",
  },
};

export default function EvidenceInspection({
  investigation,
  selectedArtifactId,
}: EvidenceInspectionProps) {
  const selectedArtifact =
    investigation.artifacts.find(
      (artifact) =>
        artifact.id === selectedArtifactId
    );

  const selectedRelationships =
    selectedArtifact
      ? investigation.connections.filter(
          (connection) =>
            connection.source ===
              selectedArtifact.id ||
            connection.target ===
              selectedArtifact.id
        )
      : [];

  const [
    selectedEvidenceStep,
    setSelectedEvidenceStep,
  ] = useState<string | null>(null);

  const verdictStyles = {
    Authentic: {
      border: "border-emerald-500/40",
      text: "text-emerald-400",
      background: "bg-emerald-500/5",
      dot: "bg-emerald-400",
      label: "LOW RISK",
    },

    Manipulated: {
      border: "border-red-500/40",
      text: "text-red-400",
      background: "bg-red-500/5",
      dot: "bg-red-400",
      label: "HIGH RISK",
    },

    "Coordinated Synthetic": {
      border: "border-red-500/40",
      text: "text-red-400",
      background: "bg-red-500/5",
      dot: "bg-red-400",
      label: "HIGH RISK",
    },

    "Insufficient Evidence": {
      border: "border-amber-500/40",
      text: "text-amber-400",
      background: "bg-amber-500/5",
      dot: "bg-amber-400",
      label: "REVIEW",
    },
  }[investigation.verdict];

  return (
    <aside className="flex h-[680px] flex-col overflow-hidden rounded-lg border border-slate-700 bg-[#111827]">
      <div className="shrink-0 border-b border-slate-700 bg-[#0f172a] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500">
              EVIDENCE INSPECTION
            </p>

            <h2 className="mt-1 text-sm font-semibold text-slate-100">
              Investigation Findings
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

            <span className="text-[9px] font-semibold tracking-widest text-emerald-500">
              ENGINE ONLINE
            </span>
          </div>
        </div>

        <div
          className={`rounded-md border ${verdictStyles.border} ${verdictStyles.background} p-4`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${verdictStyles.dot}`}
              />

              <span className="text-[9px] font-semibold tracking-widest text-slate-500">
                CURRENT VERDICT
              </span>
            </div>

            <span
              className={`rounded border px-2 py-1 text-[8px] font-bold tracking-widest ${verdictStyles.border} ${verdictStyles.text}`}
            >
              {verdictStyles.label}
            </span>
          </div>

          <p
            className={`mt-3 text-lg font-semibold ${verdictStyles.text}`}
          >
            {investigation.verdict}
          </p>

          <p className="mt-1 text-[11px] text-slate-500">
            {investigation.title}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <SignalSummary
            label="CONFIDENCE"
            value={investigation.confidence}
            color="emerald"
          />

          <SignalSummary
            label="UNCERTAINTY"
            value={investigation.uncertainty}
            color="amber"
          />
        </div>

        <div className="mt-3 rounded-md border border-slate-800 bg-[#111827] px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-600">
              INVESTIGATION STATE
            </span>

            <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
              {investigation.artifacts.length}{" "}
              ARTIFACT
              {investigation.artifacts.length === 1
                ? ""
                : "S"}
            </span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {selectedArtifact ? (
          <section className="border-b border-slate-700">
            <div className="p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-cyan-500/20 bg-cyan-500/5 text-sm font-bold text-cyan-400">
                  {getModalityIcon(
                    selectedArtifact.modality
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold tracking-[0.18em] text-slate-600">
                        SELECTED EVIDENCE
                      </p>

                      <h3 className="mt-1 truncate text-sm font-semibold text-slate-100">
                        {selectedArtifact.filename}
                      </h3>
                    </div>

                    <span className="shrink-0 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[8px] font-semibold tracking-widest text-cyan-300">
                      {selectedArtifact.modality.toUpperCase()}
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] leading-4 text-slate-500">
                    {selectedArtifact.description}
                  </p>
                </div>
              </div>

              <ArtifactStatus
                artifact={selectedArtifact}
              />
            </div>
          </section>
        ) : (
          <section className="border-b border-slate-700 p-5">
            <div className="rounded-md border border-dashed border-slate-700 bg-[#0f172a] p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-600">
                ?
              </div>

              <p className="mt-3 text-xs font-medium text-slate-400">
                No evidence selected
              </p>

              <p className="mt-1 text-[11px] leading-4 text-slate-600">
                Select an artifact in the investigation
                graph to inspect its forensic signals.
              </p>
            </div>
          </section>
        )}

        {selectedArtifact && (
          <section className="border-b border-slate-700 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-widest text-slate-400">
                  EVIDENCE RELATIONSHIPS
                </p>

                <p className="mt-1 text-[10px] text-slate-600">
                  Connections detected during
                  cross-artifact analysis
                </p>
              </div>

              <span className="rounded border border-slate-700 bg-[#0f172a] px-2 py-1 text-[9px] font-semibold tracking-widest text-slate-500">
                {selectedRelationships.length} LINKS
              </span>
            </div>

            {selectedRelationships.length > 0 ? (
              <div className="space-y-2">
                {selectedRelationships.map(
                  (connection) => {
                    const isOutgoing =
                      connection.source ===
                      selectedArtifact.id;

                    const connectedId =
                      isOutgoing
                        ? connection.target
                        : connection.source;

                    const connectedArtifact =
                      investigation.artifacts.find(
                        (artifact) =>
                          artifact.id === connectedId
                      );

                    const style =
                      relationshipStyles[
                        connection.relationship
                      ];

                    return (
                      <div
                        key={connection.id}
                        className={`rounded-md border ${style.border} ${style.background} p-3`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                            />

                            <span
                              className={`text-[9px] font-bold tracking-widest ${style.color}`}
                            >
                              {connection.relationship.toUpperCase()}
                            </span>
                          </div>

                          <span className="text-[8px] font-semibold tracking-widest text-slate-600">
                            {isOutgoing
                              ? "OUTGOING"
                              : "INCOMING"}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2 rounded border border-slate-800 bg-[#0b1120] px-2.5 py-2">
                          <span className="text-[9px] text-slate-600">
                            {isOutgoing ? "→" : "←"}
                          </span>

                          <span className="truncate text-[11px] font-medium text-slate-300">
                            {connectedArtifact?.filename ??
                              "Investigation Verdict"}
                          </span>
                        </div>

                        <p className="mt-2 text-[10px] leading-4 text-slate-600">
                          {style.description}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-700 p-4 text-center">
                <p className="text-[11px] text-slate-500">
                  No relationships detected.
                </p>
              </div>
            )}
          </section>
        )}

        <section className="border-b border-slate-700 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest text-slate-400">
                FORENSIC ANALYSIS
              </p>

              <p className="mt-1 text-[10px] text-slate-600">
                Explainable signals derived from the
                selected artifact
              </p>
            </div>

            {selectedArtifact?.forensic && (
              <span className="rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 text-[8px] font-semibold tracking-widest text-cyan-400">
                SIGNALS
              </span>
            )}
          </div>

          {selectedArtifact?.forensic ? (
            <div className="space-y-4">
              <ForensicMetric
                label="Provenance Integrity"
                value={
                  selectedArtifact.forensic.provenance
                }
                description="How strongly the artifact's available provenance signals support its origin."
              />

              <ForensicMetric
                label="Synthetic Signal"
                value={
                  selectedArtifact.forensic
                    .syntheticProbability
                }
                inverted
                description="Heuristic signal indicating characteristics associated with synthetic or manipulated content."
              />

              <ForensicMetric
                label="Metadata Integrity"
                value={
                  selectedArtifact.forensic
                    .metadataIntegrity
                }
                description="Consistency of available metadata and provenance fields."
              />

              <ForensicMetric
                label="Cross-Modal Consistency"
                value={
                  selectedArtifact.forensic
                    .crossModalConsistency
                }
                description="Agreement between this artifact and related evidence."
              />
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-700 bg-[#0f172a] p-4 text-center">
              <p className="text-xs text-slate-500">
                Select an artifact to view forensic signals.
              </p>
            </div>
          )}

          <div className="mt-4 rounded-md border border-slate-800 bg-[#0b1120] p-3">
            <div className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />

              <p className="text-[9px] leading-4 text-slate-600">
                Synthetic Signal is an explainable heuristic
                indicator, not a validated probability or
                standalone deepfake detector.
              </p>
            </div>
          </div>
        </section>

        {selectedArtifact && (
          <ForensicDetails
            artifact={selectedArtifact}
          />
        )}

        <section className="border-b border-slate-700 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest text-slate-400">
                EVIDENCE CHAIN
              </p>

              <p className="mt-1 text-[10px] text-slate-600">
                Key findings contributing to the investigation
              </p>
            </div>

            <span className="rounded border border-slate-700 bg-[#0f172a] px-2 py-1 text-[9px] font-semibold tracking-widest text-slate-500">
              {investigation.evidenceChain.length} FINDINGS
            </span>
          </div>

          <div className="space-y-2">
            {investigation.evidenceChain.map(
              (step, index) => {
                const isSelected =
                  selectedEvidenceStep === step.id;

                const severityStyles = {
                  low: {
                    badge:
                      "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
                    dot: "bg-emerald-400",
                  },

                  medium: {
                    badge:
                      "border-amber-500/30 bg-amber-500/5 text-amber-400",
                    dot: "bg-amber-400",
                  },

                  high: {
                    badge:
                      "border-red-500/30 bg-red-500/5 text-red-400",
                    dot: "bg-red-400",
                  },
                }[
                  step.severity ?? "low"
                ];

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      setSelectedEvidenceStep(
                        isSelected ? null : step.id
                      );
                    }}
                    className={`w-full rounded-md border p-3 text-left transition-all ${
                      isSelected
                        ? "border-cyan-500/40 bg-cyan-500/5"
                        : "border-slate-700 bg-[#0f172a] hover:border-slate-600 hover:bg-[#111827]"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
                          isSelected
                            ? "border-cyan-500/50 bg-cyan-500/5 text-cyan-400"
                            : "border-slate-700 text-slate-500"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p
                            className={`text-xs font-semibold ${
                              isSelected
                                ? "text-cyan-300"
                                : "text-slate-300"
                            }`}
                          >
                            {step.title}
                          </p>

                          <span
                            className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold tracking-wider ${severityStyles.badge}`}
                          >
                            {(
                              step.severity ?? "low"
                            ).toUpperCase()}
                          </span>
                        </div>

                        <p className="mt-1 text-[11px] leading-4 text-slate-500">
                          {step.description}
                        </p>

                        {isSelected && (
                          <div className="mt-3 border-t border-slate-800 pt-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${severityStyles.dot}`}
                              />

                              <span className="text-[9px] font-semibold tracking-widest text-slate-500">
                                FORENSIC FINDING SELECTED
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </section>

        <section className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest text-slate-400">
                ANALYSIS PIPELINE
              </p>

              <p className="mt-1 text-[10px] text-slate-600">
                Investigation processing stages
              </p>
            </div>

            <span className="rounded border border-slate-700 bg-[#0f172a] px-2 py-1 text-[9px] font-semibold tracking-widest text-slate-500">
              {investigation.analysisPipeline.length} STAGES
            </span>
          </div>

          <div>
            {investigation.analysisPipeline.map(
              (stage, index) => {
                const isLast =
                  index ===
                  investigation.analysisPipeline.length - 1;

                const statusStyles = {
                  complete: {
                    dot: "bg-emerald-400",
                    text: "text-emerald-400",
                    label: "COMPLETE",
                  },

                  warning: {
                    dot: "bg-amber-400",
                    text: "text-amber-400",
                    label: "REVIEW",
                  },

                  pending: {
                    dot: "bg-slate-500",
                    text: "text-slate-500",
                    label: "PENDING",
                  },
                }[stage.status];

                return (
                  <div
                    key={stage.id}
                    className="flex gap-3"
                  >
                    <div className="flex w-3 shrink-0 flex-col items-center">
                      <span
                        className={`mt-1.5 h-2 w-2 rounded-full ${statusStyles.dot}`}
                      />

                      {!isLast && (
                        <span className="mt-1 h-full w-px bg-slate-700" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-300">
                          {stage.label}
                        </p>

                        <span
                          className={`text-[8px] font-semibold tracking-wider ${statusStyles.text}`}
                        >
                          {statusStyles.label}
                        </span>
                      </div>

                      <p className="mt-1 text-[11px] leading-4 text-slate-500">
                        {stage.detail}
                      </p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}

function ForensicDetails({
  artifact,
}: {
  artifact: Investigation["artifacts"][number];
}) {
  const details = artifact.forensicDetails;

  return (
    <section className="border-b border-slate-700 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-slate-400">
            FORENSIC DETAILS
          </p>

          <p className="mt-1 text-[10px] text-slate-600">
            Raw forensic metadata and image analysis results
          </p>
        </div>

        <span className="rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 text-[8px] font-semibold tracking-widest text-cyan-400">
          RAW SIGNALS
        </span>
      </div>

      {!details ? (
        <div className="rounded-md border border-dashed border-slate-700 bg-[#0f172a] p-4 text-center">
          <p className="text-xs text-slate-500">
            Detailed forensic extraction is not available
            for this artifact.
          </p>

          <p className="mt-1 text-[10px] leading-4 text-slate-700">
            Modality-specific forensic analysis will be added
            for this evidence type.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <ForensicDetailsGroup title="FILE IDENTITY">
            <DetailRow
              label="SHA-256"
              value={details.sha256}
              mono
            />

            <DetailRow
              label="FILE SIZE"
              value={formatBytes(details.sizeBytes)}
            />

            <DetailRow
              label="CONTENT TYPE"
              value={details.contentType}
            />
          </ForensicDetailsGroup>

          {(details.format ||
  details.width ||
  details.height ||
  details.aspectRatio ||
  details.mode ||
  details.entropy !== undefined) && (
  <ForensicDetailsGroup title="IMAGE PROPERTIES">
    <DetailRow
      label="FORMAT"
      value={details.format}
    />

    <DetailRow
      label="DIMENSIONS"
      value={
        details.width !== undefined &&
        details.height !== undefined
          ? `${details.width} × ${details.height}`
          : undefined
      }
    />

    <DetailRow
      label="ASPECT RATIO"
      value={
        details.aspectRatio != null
          ? details.aspectRatio.toFixed(3)
          : undefined
      }
    />

    <DetailRow
      label="COLOR MODE"
      value={details.mode}
    />

    <DetailRow
      label="ENTROPY"
      value={
        details.entropy != null
          ? details.entropy.toFixed(3)
          : undefined
      }
    />
  </ForensicDetailsGroup>
)}

          {(details.metadata ||
            details.camera ||
            details.dateTaken ||
            details.software) && (
            <ForensicDetailsGroup title="PROVENANCE & METADATA">
              <DetailRow
                label="CAMERA MAKE"
                value={details.camera?.make}
              />

              <DetailRow
                label="CAMERA MODEL"
                value={details.camera?.model}
              />

              <DetailRow
                label="DATE TAKEN"
                value={details.dateTaken}
              />

              <DetailRow
                label="SOFTWARE"
                value={details.software}
              />

              {details.metadata &&
                Object.keys(details.metadata).length > 0 && (
                  <div className="mt-2 rounded border border-slate-800 bg-[#0b1120] p-3">
                    <p className="mb-2 text-[8px] font-semibold tracking-widest text-slate-600">
                      EXIF / METADATA
                    </p>

                    <div className="space-y-1.5">
                      {Object.entries(details.metadata).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="flex items-start justify-between gap-3"
                          >
                            <span className="min-w-0 flex-1 break-all text-[9px] text-slate-600">
                              {key}
                            </span>

                            <span className="max-w-[60%] break-all text-right text-[9px] text-slate-400">
                              {value}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </ForensicDetailsGroup>
          )}

          {(details.metadataIntegrityScore !== undefined ||
            details.provenanceScore !== undefined ||
            details.compressionScore !== undefined ||
            details.structuralScore !== undefined ||
            details.syntheticSignal !== undefined) && (
            <ForensicDetailsGroup title="FORENSIC SUB-SCORES">
              <ScoreRow
                label="METADATA INTEGRITY"
                value={details.metadataIntegrityScore}
              />

              <ScoreRow
                label="PROVENANCE"
                value={details.provenanceScore}
              />

              <ScoreRow
                label="COMPRESSION"
                value={details.compressionScore}
              />

              <ScoreRow
                label="STRUCTURAL"
                value={details.structuralScore}
              />

              <ScoreRow
                label="SYNTHETIC SIGNAL"
                value={details.syntheticSignal}
                inverted
              />
            </ForensicDetailsGroup>
          )}

          {details.observations &&
            details.observations.length > 0 && (
              <ForensicDetailsGroup title="OBSERVATIONS">
                <div className="space-y-2">
                  {details.observations.map(
                    (observation, index) => (
                      <div
                        key={`${observation}-${index}`}
                        className="flex gap-2 rounded border border-slate-800 bg-[#0b1120] p-2.5"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />

                        <p className="text-[10px] leading-4 text-slate-400">
                          {observation}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </ForensicDetailsGroup>
            )}
        </div>
      )}
    </section>
  );
}

function ForensicDetailsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[8px] font-semibold tracking-[0.16em] text-slate-600">
        {title}
      </p>

      <div className="overflow-hidden rounded-md border border-slate-800 bg-[#0f172a]">
        {children}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-3 py-2.5 last:border-b-0">
      <span className="shrink-0 text-[9px] font-semibold tracking-wider text-slate-600">
        {label}
      </span>

      <span
        className={`max-w-[65%] break-all text-right text-[10px] ${
          value
            ? "text-slate-300"
            : "text-slate-700"
        } ${mono ? "font-mono" : ""}`}
      >
        {value ?? "NOT AVAILABLE"}
      </span>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  inverted = false,
}: {
  label: string;
  value?: number | null;
  inverted?: boolean;
}) {
  if (value == null) {
    return (
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2.5 last:border-b-0">
        <span className="text-[9px] font-semibold tracking-wider text-slate-600">
          {label}
        </span>

        <span className="text-[9px] text-slate-700">
          NOT AVAILABLE
        </span>
      </div>
    );
  }

  const safeValue = Math.max(
    0,
    Math.min(100, value)
  );

  const isHighRisk = inverted
    ? safeValue >= 70
    : safeValue <= 40;

  const isMediumRisk = inverted
    ? safeValue >= 40 && safeValue < 70
    : safeValue > 40 && safeValue < 70;

  const barColor = isHighRisk
    ? "bg-red-500"
    : isMediumRisk
      ? "bg-amber-500"
      : "bg-emerald-500";

  const textColor = isHighRisk
    ? "text-red-400"
    : isMediumRisk
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div className="border-b border-slate-800 px-3 py-2.5 last:border-b-0">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[9px] font-semibold tracking-wider text-slate-600">
          {label}
        </span>

        <span
          className={`text-[10px] font-semibold ${textColor}`}
        >
          {safeValue.toFixed(0)}%
        </span>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{
            width: `${safeValue}%`,
          }}
        />
      </div>
    </div>
  );
}

function SignalSummary({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "amber";
}) {
  const textColor =
    color === "emerald"
      ? "text-emerald-400"
      : "text-amber-400";

  const barColor =
    color === "emerald"
      ? "bg-emerald-500"
      : "bg-amber-500";

  return (
    <div className="rounded-md border border-slate-700 bg-[#111827] p-3">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-semibold tracking-widest text-slate-500">
          {label}
        </p>

        <span
          className={`text-[9px] font-bold ${textColor}`}
        >
          {value}%
        </span>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{
            width: `${value}%`,
          }}
        />
      </div>
    </div>
  );
}

function ArtifactStatus({
  artifact,
}: {
  artifact: Investigation["artifacts"][number];
}) {
  const syntheticSignal =
    artifact.forensic?.syntheticProbability ?? 0;

  const isSuspicious =
    syntheticSignal >= 70;

  const isUncertain =
    syntheticSignal >= 40 &&
    syntheticSignal < 70;

  const status = isSuspicious
    ? "SUSPICIOUS"
    : isUncertain
      ? "REVIEW"
      : "CONSISTENT";

  const statusColor =
    isSuspicious
      ? "text-red-400"
      : isUncertain
        ? "text-amber-400"
        : "text-emerald-400";

  const statusDot =
    isSuspicious
      ? "bg-red-400"
      : isUncertain
        ? "bg-amber-400"
        : "bg-emerald-400";

  const description =
    isSuspicious
      ? "Forensic signals indicate elevated indicators associated with synthetic or manipulated content."
      : isUncertain
        ? "Available signals are inconclusive and should be interpreted alongside the connected evidence."
        : "Available forensic signals are broadly consistent with the current investigation.";

  return (
    <div className="rounded-md border border-slate-700 bg-[#0b1120] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[9px] font-semibold tracking-widest text-slate-500">
          EVIDENCE STATUS
        </span>

        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${statusDot}`}
          />

          <span
            className={`text-[9px] font-bold tracking-widest ${statusColor}`}
          >
            {status}
          </span>
        </div>
      </div>

      <p className="text-[11px] leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function ForensicMetric({
  label,
  value,
  inverted = false,
  description,
}: {
  label: string;
  value: number;
  inverted?: boolean;
  description: string;
}) {
  const isHighRisk = inverted
    ? value >= 70
    : value <= 40;

  const isMediumRisk = inverted
    ? value >= 40 && value < 70
    : value > 40 && value < 70;

  const barColor = isHighRisk
    ? "bg-red-500"
    : isMediumRisk
      ? "bg-amber-500"
      : "bg-emerald-500";

  const textColor = isHighRisk
    ? "text-red-400"
    : isMediumRisk
      ? "text-amber-400"
      : "text-emerald-400";

  const statusLabel = isHighRisk
    ? "ELEVATED"
    : isMediumRisk
      ? "MODERATE"
      : "STRONG";

  return (
    <div className="rounded-md border border-slate-800 bg-[#0f172a] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-300">
          {label}
        </span>

        <div className="flex items-center gap-2">
          <span
            className={`text-[8px] font-semibold tracking-wider ${textColor}`}
          >
            {statusLabel}
          </span>

          <span
            className={`text-xs font-semibold ${textColor}`}
          >
            {value}%
          </span>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{
            width: `${Math.max(
              0,
              Math.min(100, value)
            )}%`,
          }}
        />
      </div>

      <p className="mt-2 text-[9px] leading-4 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function getModalityIcon(
  modality: string
) {
  switch (modality) {
    case "image":
      return "◉";

    case "video":
      return "▶";

    case "audio":
      return "◒";

    case "document":
      return "▤";

    case "message":
      return "≡";

    default:
      return "•";
  }
}

function formatBytes(
  bytes?: number
) {
  if (bytes === undefined) {
    return undefined;
  }

  if (bytes === 0) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.floor(
    Math.log(bytes) /
      Math.log(1024)
  );

  const safeIndex = Math.min(
    index,
    units.length - 1
  );

  return `${(
    bytes /
    Math.pow(1024, safeIndex)
  ).toFixed(
    safeIndex === 0 ? 0 : 2
  )} ${units[safeIndex]}`;
}

