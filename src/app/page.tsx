"use client";

import { useState } from "react";

import EvidenceGraph from "@/components/graph/EvidenceGraph";
import EvidenceInspection from "@/components/inspection/EvidenceInspection";
import EvidenceUploader from "@/components/upload/EvidenceUploader";
import { demoCases } from "@/data/demoCases";
import type {
  EdgeRelationship,
  Investigation,
  MediaArtifact,
  Modality,
  Verdict,
} from "@/lib/types";

interface BackendArtifact {
  filename: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  modality: string;
  image_forensics?: {
    valid_image?: boolean;
    format?: string;
    width?: number;
    height?: number;
    mode?: string;
    aspect_ratio?: number;
    metadata?: Record<string, string>;
    camera?: {
      make?: string | null;
      model?: string | null;
    };
    date_taken?: string | null;
    software?: string | null;
    metadata_integrity_score?: number;
    provenance_score?: number;
    compression_score?: number;
    structural_score?: number;
    synthetic_signal?: number;
    entropy?: number;
    observations?: string[];
  };
  audio_forensics?: {
  valid_audio: boolean;
  format?: string | null;
  subtype?: string | null;
  duration?: number | null;
  sample_rate?: number | null;
  channels?: number | null;
  frames?: number | null;
  rms?: number | null;
  peak?: number | null;
  zero_crossing_rate?: number | null;
  spectral_centroid?: number | null;
  dynamic_range?: number | null;
  synthetic_signal?: number | null;
  observations?: string[];
};
}

interface BackendRelationship {
  source: string;
  target: string;
  relationship: string;
  consistency_score?: number;
  explanation?: string;
}

interface BackendResponse {
  status: string;
  context?: string | null;
  artifact_count: number;
  artifacts: BackendArtifact[];
  comparison: {
    artifact_count: number;
    relationships: BackendRelationship[];
    artifact_scores: Record<string, number>;
    summary: string;
  };
  verdict: {
    verdict: string;
    confidence: number;
    uncertainty: number;
    reasoning: string[];
    signals: Array<Record<string, unknown>>;
  };
  message: string;
}

function normalizeModality(
  modality: string
): Modality {
  switch (modality.toLowerCase()) {
    case "image":
      return "image";

    case "video":
      return "video";

    case "audio":
      return "audio";

    case "document":
      return "document";

    case "message":
    case "text":
      return "message";

    default:
      return "message";
  }
}

function normalizeVerdict(
  verdict: string
): Verdict {
  const normalized = verdict
    .toLowerCase()
    .replace(/_/g, " ");

  if (
    normalized.includes("coordinated") ||
    normalized.includes("synthetic")
  ) {
    return "Coordinated Synthetic";
  }

  if (
    normalized.includes("manipulated") ||
    normalized.includes("potentially")
  ) {
    return "Manipulated";
  }

  if (
    normalized.includes("authentic") ||
    normalized.includes("no strong")
  ) {
    return "Authentic";
  }

  return "Insufficient Evidence";
}

function normalizeRelationship(
  relationship: string
): EdgeRelationship {
  const normalized = relationship
    .toLowerCase()
    .trim();

  if (normalized === "corroborates") {
    return "Corroborates";
  }

  if (normalized === "contradicts") {
    return "Contradicts";
  }

  if (normalized === "uncertain") {
    return "Uncertain";
  }

  return "Unrelated";
}

function convertBackendResult(
  rawResult: BackendResponse | Record<string, unknown>,
  title: string
): Investigation {
  let result: BackendResponse;

  if (Array.isArray((rawResult as BackendResponse).artifacts)) {
    result = rawResult as BackendResponse;
  } else {
    const raw = rawResult as Record<string, unknown>;
    const names = (raw.artifact_names as string[]) || [];
    const telemetry = (raw.forensic_telemetry || raw.telemetry || {}) as Record<string, Record<string, unknown>>;
    const contradictions = (raw.contradictions_detected || raw.contradictions || []) as Array<Record<string, unknown>>;
    const evidence = (raw.explainable_evidence_chain || raw.evidence || []) as string[];
    const verdictStr = String(raw.overall_verdict || raw.verdict || "insufficient_evidence");
    const confVal = typeof raw.confidence_score === "number" ? Math.round(raw.confidence_score * 100) : (typeof raw.confidence === "number" ? (raw.confidence <= 1 ? Math.round(raw.confidence * 100) : raw.confidence) : 80);
    const uncertVal = raw.uncertainty_level === "low" ? 10 : (raw.uncertainty_level === "high" ? 80 : 35);

    const synthArtifacts: BackendArtifact[] = names.map((name) => {
      const ext = name.split(".").pop()?.toLowerCase() || "";
      const isImg = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
      const isAud = ["wav", "mp3", "ogg", "flac"].includes(ext);
      const mod = isImg ? "image" : (isAud ? "audio" : (["mp4", "mov"].includes(ext) ? "video" : "document"));
      const tel = telemetry[name] || {};
      const elaObj = tel.ela as Record<string, unknown> | undefined;
      const elaScore = typeof elaObj?.max_anomaly_score === "number" ? elaObj.max_anomaly_score : (typeof tel.ela_score === "number" ? tel.ela_score : 0.05);
      const audioSpec = tel.audio_spectrogram as Record<string, unknown> | undefined;

      return {
        filename: name,
        content_type: isImg ? `image/${ext}` : (isAud ? `audio/${ext}` : "application/octet-stream"),
        size_bytes: typeof tel.size_bytes === "number" ? tel.size_bytes : 1024,
        sha256: typeof tel.sha256 === "string" ? tel.sha256 : "computed_sha256",
        modality: mod,
        image_forensics: isImg ? {
          format: ext.toUpperCase(),
          mode: "RGB",
          width: typeof tel.width === "number" ? tel.width : 1920,
          height: typeof tel.height === "number" ? tel.height : 1080,
          aspect_ratio: 1.777,
          entropy: 7.2,
          provenance_score: 85,
          synthetic_signal: Math.round(elaScore * 100),
          metadata_integrity_score: tel.exif_metadata ? 90 : 70,
          compression_score: Math.round((1 - elaScore) * 100),
          structural_score: 88,
          observations: (tel.suspicious_software_flags as string[]) || [],
        } : undefined,
        audio_forensics: isAud ? {
          valid_audio: true,
          format: ext.toUpperCase(),
          duration: typeof audioSpec?.duration_seconds === "number" ? audioSpec.duration_seconds : 5.0,
          sample_rate: typeof audioSpec?.sample_rate === "number" ? audioSpec.sample_rate : 44100,
          channels: 2,
          synthetic_signal: audioSpec?.zero_crossing_rate ? 20 : 50,
          observations: [],
        } : undefined,
      };
    });

    const relationships: BackendRelationship[] = contradictions.map((c) => ({
      source: String(c.artifact_source_a || c.artifact_a || names[0] || "source"),
      target: String(c.artifact_source_b || c.artifact_b || names[1] || "target"),
      relationship: "Contradicts",
      consistency_score: Math.round((1 - (c.severity === "critical" ? 0.9 : 0.5)) * 100),
      explanation: String(c.evidence_reasoning || c.description || "Cross-modal contradiction detected"),
    }));

    result = {
      status: "received",
      context: raw.case_id ? String(raw.case_id) : null,
      artifact_count: synthArtifacts.length,
      artifacts: synthArtifacts,
      comparison: {
        artifact_count: synthArtifacts.length,
        relationships,
        artifact_scores: {},
        summary: String(raw.uncertainty_justification || raw.summary || "Investigation completed"),
      },
      verdict: {
        verdict: String(verdictStr),
        confidence: confVal,
        uncertainty: uncertVal,
        reasoning: evidence.length ? evidence : [String(raw.uncertainty_justification || "Evidence analyzed")],
        signals: [],
      },
      message: "Analyzed by TrustLayer",
    };
  }

  const artifacts: MediaArtifact[] =
    result.artifacts.map((artifact, index) => {
      const forensic = artifact.image_forensics;
      const audioForensic = artifact.audio_forensics;
console.log(
  "TRUSTLAYER AUDIO FORENSICS:",
  artifact.filename,
  artifact.audio_forensics
);
      return {
        id: `artifact-${index}`,
        filename: artifact.filename,
        modality: normalizeModality(
          artifact.modality
        ),
        description:
          artifact.modality === "image"
            ? "Uploaded image analyzed by the TrustLayer forensic pipeline."
            : `Uploaded ${artifact.modality} artifact analyzed by the TrustLayer investigation pipeline.`,

        forensic: {
          provenance:
            forensic?.provenance_score ?? 50,

          syntheticProbability:
            forensic?.synthetic_signal ?? 50,

          metadataIntegrity:
            forensic?.metadata_integrity_score ??
            50,

          crossModalConsistency:
            result.comparison
              .artifact_scores[
              artifact.filename
            ] ?? 50,
        },

        forensicDetails: {
  sha256: artifact.sha256,
  sizeBytes: artifact.size_bytes,
  contentType: artifact.content_type,

  format:
    forensic?.format ??
    audioForensic?.format,

  width: forensic?.width,
  height: forensic?.height,

  aspectRatio:
    forensic?.aspect_ratio,

  mode:
    forensic?.mode,

  entropy:
    forensic?.entropy,

  subtype:
    audioForensic?.subtype,

  duration:
    audioForensic?.duration,

  sampleRate:
    audioForensic?.sample_rate,

  channels:
    audioForensic?.channels,

  frames:
    audioForensic?.frames,

  rms:
    audioForensic?.rms,

  peak:
    audioForensic?.peak,

  zeroCrossingRate:
    audioForensic?.zero_crossing_rate,

  spectralCentroid:
    audioForensic?.spectral_centroid,

  dynamicRange:
    audioForensic?.dynamic_range,

  metadata:
    forensic?.metadata,

  camera: forensic?.camera
    ? {
        make: forensic.camera.make,
        model: forensic.camera.model,
      }
    : undefined,

  dateTaken:
    forensic?.date_taken,

  software:
    forensic?.software,

  metadataIntegrityScore:
    forensic?.metadata_integrity_score,

  provenanceScore:
    forensic?.provenance_score,

  compressionScore:
    forensic?.compression_score,

  structuralScore:
    forensic?.structural_score,

  syntheticSignal:
    forensic?.synthetic_signal ??
    audioForensic?.synthetic_signal,

  observations:
    forensic?.observations ??
    audioForensic?.observations,
},
      };
    });

  const artifactIdByFilename =
    new Map<string, string>();

  result.artifacts.forEach(
    (artifact, index) => {
      artifactIdByFilename.set(
        artifact.filename,
        `artifact-${index}`
      );
    }
  );

  const connections =
    result.comparison.relationships
      .map(
        (
          relationship,
          index
        ) => {
          const source =
            artifactIdByFilename.get(
              relationship.source
            );

          const target =
            artifactIdByFilename.get(
              relationship.target
            );

          if (!source || !target) {
            return null;
          }

          return {
            id: `connection-${index}`,
            source,
            target,
            relationship:
              normalizeRelationship(
                relationship.relationship
              ),
          };
        }
      )
      .filter(
        (
          connection
        ): connection is {
          id: string;
          source: string;
          target: string;
          relationship: EdgeRelationship;
        } => connection !== null
      );

  if (artifacts.length > 0) {
    const normalizedVerdict =
      result.verdict.verdict.toLowerCase();

    connections.push({
      id: "verdict-connection",
      source:
        artifacts[artifacts.length - 1].id,
      target: "verdict",
      relationship:
        normalizedVerdict.includes(
          "authentic"
        ) ||
        normalizedVerdict.includes(
          "no strong"
        )
          ? "Corroborates"
          : normalizedVerdict.includes(
                "manipulated"
              ) ||
            normalizedVerdict.includes(
              "synthetic"
            )
            ? "Contradicts"
            : "Uncertain",
    });
  }

  const evidenceChain =
    result.verdict.reasoning.map(
      (reason, index) => ({
        id: `evidence-${index}`,
        title: `Forensic finding ${index + 1}`,
        description: reason,
        severity:
          (result.verdict.verdict
            .toLowerCase()
            .includes("manipulated") ||
          result.verdict.verdict
            .toLowerCase()
            .includes("synthetic")
            ? "high"
            : result.verdict.uncertainty >= 50
              ? "medium"
              : "low") as "low" | "medium" | "high",
      })
    );

  const analysisPipeline = [
    {
      id: "ingestion",
      label: "Artifact ingestion",
      status: "complete" as const,
      detail: `${result.artifact_count} artifact${
        result.artifact_count === 1
          ? ""
          : "s"
      } successfully processed.`,
    },
    {
      id: "metadata",
      label: "Metadata extraction",
      status:
        result.artifacts.some(
          (artifact) =>
            artifact.image_forensics
              ?.metadata_integrity_score !==
              undefined &&
            artifact.image_forensics
              .metadata_integrity_score < 50
        )
          ? ("warning" as const)
          : ("complete" as const),
      detail:
        "Metadata and provenance signals were extracted from available artifacts.",
    },
    {
      id: "comparison",
      label: "Cross-modal comparison",
      status:
        result.comparison.relationships.some(
          (relationship) =>
            relationship.relationship ===
            "Contradicts"
        )
          ? ("warning" as const)
          : ("complete" as const),
      detail:
        result.comparison.summary ||
        "Cross-artifact evidence relationships were evaluated.",
    },
    {
      id: "synthetic",
      label: "Synthetic signal analysis",
      status:
        result.artifacts.some(
          (artifact) =>
            (
              artifact.image_forensics
                ?.synthetic_signal ?? 0
            ) >= 75
        )
          ? ("warning" as const)
          : ("complete" as const),
      detail:
        "Available forensic signals were evaluated for synthetic indicators.",
    },
    {
      id: "synthesis",
      label: "Investigation synthesis",
      status:
        result.verdict.uncertainty >= 50
          ? ("warning" as const)
          : ("complete" as const),
      detail:
        "The investigation engine synthesized forensic and cross-artifact evidence.",
    },
  ];

  return {
    id: `investigation-${Date.now()}`,
    title,
    verdict: normalizeVerdict(
      result.verdict.verdict
    ),
    confidence: result.verdict.confidence,
    uncertainty: result.verdict.uncertainty,
    artifacts,
    connections,
    evidenceChain,
    analysisPipeline,
  };
}

export default function Home() {
  const [selectedCase, setSelectedCase] =
    useState<Investigation>(
      demoCases[0]
    );

  const [
    selectedArtifactId,
    setSelectedArtifactId,
  ] = useState<string | null>(
    demoCases[0].artifacts[0]?.id ?? null
  );

  const [
    uploadedFiles,
    setUploadedFiles,
  ] = useState<File[]>([]);

  const [isInvestigating, setIsInvestigating] =
    useState(false);

  const [investigationStage, setInvestigationStage] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [activeMode, setActiveMode] =
    useState<"demo" | "live">("demo");

  const runDemoCase = async () => {
    setError(null);
    setActiveMode("demo");
    setIsInvestigating(true);

    const stages = [
      "Loading demonstration evidence...",
      "Reviewing forensic signals...",
      "Comparing evidence artifacts...",
      "Calibrating investigation confidence...",
      "Building evidence graph...",
    ];

    try {
      for (
        let index = 0;
        index < stages.length;
        index++
      ) {
        setInvestigationStage(
          stages[index]
        );

        await new Promise(
          (resolve) =>
            setTimeout(resolve, 280)
        );
      }

      setInvestigationStage(
        "Rendering investigation results..."
      );

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 350)
      );

      setSelectedArtifactId(
        selectedCase.artifacts[0]?.id ?? null
      );
    } finally {
      setIsInvestigating(false);
      setInvestigationStage("");
    }
  };

  const runInvestigation = async () => {
    if (uploadedFiles.length === 0) {
      setError(
        "Please upload at least one evidence artifact first."
      );

      return;
    }

    setError(null);
    setActiveMode("live");
    setIsInvestigating(true);

    const stages = [
      "Uploading evidence bundle...",
      "Extracting forensic signals...",
      "Comparing evidence artifacts...",
      "Calibrating investigation confidence...",
      "Building evidence graph...",
    ];

    try {
      for (
        let index = 0;
        index < stages.length;
        index++
      ) {
        setInvestigationStage(
          stages[index]
        );

        await new Promise(
          (resolve) =>
            setTimeout(resolve, 350)
        );
      }

      const formData = new FormData();

      uploadedFiles.forEach(
        (file) => {
          formData.append(
            "artifacts",
            file
          );
        }
      );

      formData.append(
        "context",
        "Live TrustLayer Investigation"
      );

      const response = await fetch(
        "/api/investigate",
        {
          method: "POST",
          body: formData,
        }
      );

      const rawText =
        await response.text();

      let data: BackendResponse;

      try {
        data = JSON.parse(
          rawText
        ) as BackendResponse;
      } catch {
        throw new Error(
          "The investigation backend returned an invalid response."
        );
      }

      if (!response.ok) {
        const backendError =
          (
            data as unknown as {
              error?: string;
            }
          ).error;

        throw new Error(
          backendError ||
            "Investigation failed."
        );
      }

      setInvestigationStage(
        "Rendering investigation results..."
      );

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 400)
      );

      const investigation =
        convertBackendResult(
          data,
          "Live Investigation"
        );

      setSelectedCase(
        investigation
      );

      setSelectedArtifactId(
        investigation.artifacts[0]
          ?.id ?? null
      );
    } catch (investigationError) {
      console.error(
        investigationError
      );

      setError(
        investigationError instanceof
          Error
          ? investigationError.message
          : "Unable to complete the investigation."
      );
    } finally {
      setIsInvestigating(false);
      setInvestigationStage("");
    }
  };

  const handleDemoCaseChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selected =
      demoCases.find(
        (demoCase) =>
          demoCase.id ===
          event.target.value
      );

    if (!selected) {
      return;
    }

    setSelectedCase(
      selected
    );

    setSelectedArtifactId(
      selected.artifacts[0]
        ?.id ?? null
    );

    setUploadedFiles([]);
    setError(null);
    setActiveMode("demo");
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100">
      {isInvestigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#0f172a] p-8 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />

              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                TrustLayer investigation
              </span>
            </div>

            <h2 className="text-2xl font-semibold text-white">
              Analyzing evidence
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              {investigationStage}
            </p>

            <div className="mt-6 h-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-500" />
            </div>

            <div className="mt-5 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Evidence engine processing
            </div>
          </div>
        </div>
      )}

      <header className="border-b border-slate-800 bg-[#0b1120]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-sm font-bold text-emerald-400">
                T
              </div>

              <h1 className="text-xl font-semibold tracking-tight text-white">
                TrustLayer
              </h1>

              <span
                className={`rounded border px-2 py-1 text-[8px] font-semibold uppercase tracking-widest ${
                  activeMode === "live"
                    ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-400"
                    : "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                }`}
              >
                {activeMode === "live"
                  ? "LIVE"
                  : "DEMO"}
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Multi-modal digital authenticity
              investigation
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Demo case
            </span>

            <select
              value={selectedCase.id}
              onChange={
                handleDemoCaseChange
              }
              className="rounded-md border border-slate-700 bg-[#111827] px-3 py-2 text-xs text-slate-200 outline-none transition hover:border-slate-600 focus:border-emerald-500"
            >
              {demoCases.map(
                (demoCase) => (
                  <option
                    key={demoCase.id}
                    value={demoCase.id}
                  >
                    {demoCase.title}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={runDemoCase}
              disabled={isInvestigating}
              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Run demo
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {demoCases.map(
            (demoCase) => {
              const isSelected =
                selectedCase.id ===
                demoCase.id;

              return (
                <button
                  key={demoCase.id}
                  type="button"
                  onClick={() => {
                    setSelectedCase(
                      demoCase
                    );

                    setSelectedArtifactId(
                      demoCase
                        .artifacts[0]
                        ?.id ?? null
                    );

                    setUploadedFiles([]);
                    setError(null);
                    setActiveMode(
                      "demo"
                    );
                  }}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    isSelected
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-slate-800 bg-[#0b1120] hover:border-slate-700 hover:bg-[#111827]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-[0.18em] ${
                        isSelected
                          ? "text-emerald-400"
                          : "text-slate-600"
                      }`}
                    >
                      DEMO CASE
                    </span>

                    <span className="text-[9px] text-slate-600">
                      {
                        demoCase
                          .artifacts
                          .length
                      }{" "}
                      ARTIFACTS
                    </span>
                  </div>

                  <div className="mt-2 text-sm font-semibold text-slate-200">
                    {demoCase.title}
                  </div>

                  <div className="mt-2 text-[10px] leading-4 text-slate-500">
                    {demoCase.verdict}
                  </div>
                </button>
              );
            }
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)_380px]">
          <aside className="space-y-6">
            <EvidenceUploader
              onFilesChange={
                setUploadedFiles
              }
            />

            <button
              type="button"
              onClick={
                runInvestigation
              }
              disabled={
                isInvestigating ||
                uploadedFiles.length ===
                  0
              }
              className="w-full rounded-md border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-cyan-400 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Run live investigation
            </button>

            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/5 p-4 text-xs leading-5 text-red-300">
                {error}
              </div>
            )}

            <div className="rounded-lg border border-slate-800 bg-[#0b1120] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Investigation status
                </div>

                <span
                  className={`rounded border px-2 py-1 text-[8px] font-semibold uppercase tracking-widest ${
                    activeMode === "live"
                      ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-400"
                      : "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                  }`}
                >
                  {activeMode}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />

                <span className="text-xs text-slate-300">
                  Evidence engine online
                </span>
              </div>

              <div className="mt-3 text-[11px] leading-5 text-slate-500">
                TrustLayer combines artifact
                metadata, image forensics,
                cross-artifact comparison,
                and explainable evidence
                signals.
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Evidence relationship graph
                  </div>

                  <span className="text-slate-700">
                    /
                  </span>

                  <div className="text-[9px] font-semibold uppercase tracking-widest text-emerald-500/70">
                    {activeMode}
                  </div>
                </div>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  {selectedCase.title}
                </h2>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                  Artifacts
                </div>

                <div className="mt-1 text-lg font-semibold text-slate-200">
                  {
                    selectedCase.artifacts
                      .length
                  }
                </div>
              </div>
            </div>

            <EvidenceGraph
              investigation={
                selectedCase
              }
              selectedArtifactId={
                selectedArtifactId
              }
              onArtifactSelect={
                setSelectedArtifactId
              }
            />

            <div className="mt-6 rounded-lg border border-slate-800 bg-[#0b1120]">
              <div className="border-b border-slate-800 px-5 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Analysis pipeline
                </div>
              </div>

              <div className="divide-y divide-slate-800">
                {selectedCase.analysisPipeline.map(
                  (stage) => (
                    <div
                      key={stage.id}
                      className="flex items-center justify-between gap-6 px-5 py-4"
                    >
                      <div>
                        <div className="text-xs font-medium text-slate-200">
                          {stage.label}
                        </div>

                        <div className="mt-1 text-[11px] text-slate-500">
                          {stage.detail}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${
                          stage.status ===
                          "complete"
                            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                            : stage.status ===
                                "warning"
                              ? "border-amber-500/30 bg-amber-500/5 text-amber-400"
                              : "border-slate-700 bg-slate-800/50 text-slate-500"
                        }`}
                      >
                        {stage.status}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>

          <aside className="min-w-0">
            <EvidenceInspection
              investigation={
                selectedCase
              }
              selectedArtifactId={
                selectedArtifactId
              }
            />
          </aside>
        </div>
      </div>

      <footer className="border-t border-slate-800 bg-[#0b1120]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <span className="text-[9px] uppercase tracking-[0.18em] text-slate-600">
            TRUSTLAYER FORENSIC INVESTIGATION
            SYSTEM
          </span>

          <span className="text-[9px] uppercase tracking-[0.18em] text-slate-600">
            {activeMode === "live"
              ? "LIVE STATUS • BACKEND CONNECTED"
              : "DEMO STATUS • EVIDENCE SIMULATION"}
          </span>
        </div>
      </footer>
    </main>
  );
}
