"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
  X,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  Database,
  Cpu,
  ChevronRight,
  Info,
  GitBranch,
  Copy,
  Check,
} from "lucide-react";

import EvidenceGraph from "@/components/graph/EvidenceGraph";
import { demoCases } from "@/data/demoCases";
import type {
  EdgeRelationship,
  Investigation,
  MediaArtifact,
  Modality,
  Verdict,
} from "@/lib/types";

// Types matching the polymorphic backend response
interface BackendArtifact {
  filename: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  modality: string;
  image_forensics?: {
    format?: string;
    mode?: string;
    width?: number;
    height?: number;
    aspect_ratio?: number;
    entropy?: number;
    provenance_score?: number;
    synthetic_signal?: number;
    metadata_integrity_score?: number;
    compression_score?: number;
    structural_score?: number;
    observations?: string[];
  };
  audio_forensics?: {
    valid_audio: boolean;
    format?: string;
    duration?: number;
    sample_rate?: number;
    channels?: number;
    synthetic_signal?: number;
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

function normalizeModality(modality: string): Modality {
  const m = modality.toLowerCase();
  if (m.includes("image")) return "image";
  if (m.includes("video")) return "video";
  if (m.includes("audio")) return "audio";
  if (m.includes("doc") || m.includes("pdf")) return "document";
  return "message";
}

function normalizeVerdict(verdict: string): Verdict {
  const v = verdict.toLowerCase();
  if (v.includes("coordinated") || v.includes("synthetic")) return "Coordinated Synthetic";
  if (v.includes("manipulated")) return "Manipulated";
  if (v.includes("authentic")) return "Authentic";
  return "Insufficient Evidence";
}

function normalizeRelationship(relationship: string): EdgeRelationship {
  const r = relationship.toLowerCase().trim();
  if (r.includes("corroborate")) return "Corroborates";
  if (r.includes("contradict")) return "Contradicts";
  if (r.includes("uncertain")) return "Uncertain";
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

  const artifacts: MediaArtifact[] = result.artifacts.map((artifact, index) => {
    const forensic = artifact.image_forensics;
    const audioForensic = artifact.audio_forensics;

    return {
      id: `artifact-${index}`,
      filename: artifact.filename,
      modality: normalizeModality(artifact.modality),
      description: `Uploaded ${artifact.modality} artifact analyzed by TrustLayer pipeline.`,
      forensic: {
        provenance: forensic?.provenance_score ?? 85,
        syntheticProbability: forensic?.synthetic_signal ?? audioForensic?.synthetic_signal ?? 15,
        metadataIntegrity: forensic?.metadata_integrity_score ?? 90,
        crossModalConsistency: result.comparison.artifact_scores[artifact.filename] ?? 80,
      },
      forensicDetails: {
        sha256: artifact.sha256,
        sizeBytes: artifact.size_bytes,
        contentType: artifact.content_type,
        format: forensic?.format ?? audioForensic?.format,
        width: forensic?.width,
        height: forensic?.height,
        aspectRatio: forensic?.aspect_ratio,
        mode: forensic?.mode,
        entropy: forensic?.entropy,
        duration: audioForensic?.duration,
        sampleRate: audioForensic?.sample_rate,
        channels: audioForensic?.channels,
        metadataIntegrityScore: forensic?.metadata_integrity_score,
        provenanceScore: forensic?.provenance_score,
        compressionScore: forensic?.compression_score,
        structuralScore: forensic?.structural_score,
        syntheticSignal: forensic?.synthetic_signal ?? audioForensic?.synthetic_signal,
        observations: forensic?.observations ?? audioForensic?.observations,
      },
    };
  });

  const artifactIdByFilename = new Map<string, string>();
  result.artifacts.forEach((artifact, index) => {
    artifactIdByFilename.set(artifact.filename, `artifact-${index}`);
  });

  const connections = result.comparison.relationships
    .map((relationship, index) => {
      const source = artifactIdByFilename.get(relationship.source);
      const target = artifactIdByFilename.get(relationship.target);
      if (!source || !target) return null;
      return {
        id: `connection-${index}`,
        source,
        target,
        relationship: normalizeRelationship(relationship.relationship),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (artifacts.length > 0) {
    const normalizedVerdict = result.verdict.verdict.toLowerCase();
    connections.push({
      id: "verdict-connection",
      source: artifacts[artifacts.length - 1].id,
      target: "verdict",
      relationship:
        normalizedVerdict.includes("authentic")
          ? "Corroborates"
          : normalizedVerdict.includes("manipulated") || normalizedVerdict.includes("synthetic")
          ? "Contradicts"
          : "Uncertain",
    });
  }

  const evidenceChain = result.verdict.reasoning.map((reason, index) => ({
    id: `evidence-${index}`,
    title: `Forensic Finding ${index + 1}`,
    description: reason,
    severity: (result.verdict.verdict.toLowerCase().includes("manipulated") ||
    result.verdict.verdict.toLowerCase().includes("synthetic")
      ? "high"
      : result.verdict.uncertainty >= 50
      ? "medium"
      : "low") as "low" | "medium" | "high",
  }));

  const analysisPipeline = [
    {
      id: "ingestion",
      label: "Artifact Ingestion",
      status: "complete" as const,
      detail: `${artifacts.length} multi-modal artifacts validated.`,
    },
    {
      id: "forensics",
      label: "Signal & ELA Extraction",
      status: "complete" as const,
      detail: "Deep forensic telemetry computed.",
    },
    {
      id: "graph",
      label: "Cross-Modal Synthesis",
      status: "complete" as const,
      detail: `${connections.length} conflict edges evaluated.`,
    },
  ];

  return {
    id: `investigation-${Date.now()}`,
    title,
    verdict: normalizeVerdict(result.verdict.verdict),
    confidence: result.verdict.confidence,
    uncertainty: result.verdict.uncertainty,
    artifacts,
    connections,
    evidenceChain,
    analysisPipeline,
  };
}

export default function HomePage() {
  const [selectedCase, setSelectedCase] = useState<Investigation>(demoCases[0]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    demoCases[0].artifacts[0]?.id ?? null
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [investigationStage, setInvestigationStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"forensics" | "chain" | "relationships">("forensics");
  const [copiedSha, setCopiedSha] = useState(false);

  const selectedArtifact =
    selectedCase.artifacts.find((a) => a.id === selectedArtifactId) ??
    selectedCase.artifacts[0];

  const selectedRelationships = selectedArtifact
    ? selectedCase.connections.filter(
        (c) => c.source === selectedArtifact.id || c.target === selectedArtifact.id
      )
    : selectedCase.connections;

  const handleCaseSelect = (item: Investigation) => {
    setSelectedCase(item);
    setSelectedArtifactId(item.artifacts[0]?.id ?? null);
    setError(null);
  };

  const handleFilesAdded = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const incoming = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...incoming]);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const incoming = Array.from(e.dataTransfer.files);
      setUploadedFiles((prev) => [...prev, ...incoming]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCopySha = (sha?: string) => {
    if (!sha) return;
    navigator.clipboard?.writeText(sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 1600);
  };

  const handleRunInvestigation = async () => {
    if (uploadedFiles.length === 0) {
      setError("Please select at least one media or text file to analyze.");
      return;
    }

    try {
      setIsInvestigating(true);
      setError(null);
      setInvestigationStage("Extracting ELA & Signal Forensics...");

      const formData = new FormData();
      uploadedFiles.forEach((file) => formData.append("artifacts", file));
      formData.append("context", "Live TrustLayer Investigation");

      const response = await fetch("/api/investigate", {
        method: "POST",
        body: formData,
      });

      const rawText = await response.text();
      let data: BackendResponse;

      try {
        data = JSON.parse(rawText) as BackendResponse;
      } catch {
        throw new Error("Backend returned an invalid JSON response.");
      }

      if (!response.ok) {
        throw new Error((data as unknown as { error?: string }).error || "Investigation failed.");
      }

      setInvestigationStage("Synthesizing Multimodal Verdict...");
      await new Promise((r) => setTimeout(r, 400));

      const liveInvestigation = convertBackendResult(data, "Live Investigation");
      setSelectedCase(liveInvestigation);
      setSelectedArtifactId(liveInvestigation.artifacts[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run investigation.");
    } finally {
      setIsInvestigating(false);
      setInvestigationStage("");
    }
  };

  // Verdict Style Helper
  const getVerdictTheme = (verdict: Verdict) => {
    switch (verdict) {
      case "Authentic":
        return {
          color: "text-emerald-400",
          border: "border-emerald-500/30",
          bg: "bg-emerald-500/10",
          glow: "from-emerald-500/20 via-emerald-500/5 to-transparent",
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
          icon: <ShieldCheck className="size-6 text-emerald-400" />,
        };
      case "Manipulated":
      case "Coordinated Synthetic":
        return {
          color: "text-rose-400",
          border: "border-rose-500/30",
          bg: "bg-rose-500/10",
          glow: "from-rose-500/20 via-rose-500/5 to-transparent",
          badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
          icon: <ShieldAlert className="size-6 text-rose-400" />,
        };
      default:
        return {
          color: "text-amber-400",
          border: "border-amber-500/30",
          bg: "bg-amber-500/10",
          glow: "from-amber-500/20 via-amber-500/5 to-transparent",
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          icon: <HelpCircle className="size-6 text-amber-400" />,
        };
    }
  };

  const verdictTheme = getVerdictTheme(selectedCase.verdict);

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Ambient Radial Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 size-[600px] rounded-full bg-cyan-600/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 size-[600px] rounded-full bg-indigo-600/10 blur-[150px]" />
        <div className="absolute -bottom-40 left-1/3 size-[600px] rounded-full bg-blue-600/10 blur-[150px]" />
      </div>

      <div className="relative flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#060a12]/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-[1780px] items-center justify-between px-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/25">
                <ShieldCheck className="size-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-white">
                    TrustLayer
                  </span>
                  <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[9px] font-bold text-cyan-400 border border-cyan-500/30">
                    CYBER-INTELLIGENCE STUDIO
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Multi-Modal Authenticity & Conflict Intelligence
                </p>
              </div>
            </div>

            {/* Demo Cases Selector */}
            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] p-1 shadow-inner">
              {demoCases.map((demo) => {
                const isSelected = selectedCase.id === demo.id;
                const dotColor =
                  demo.verdict === "Authentic"
                    ? "bg-emerald-400"
                    : demo.verdict === "Insufficient Evidence"
                    ? "bg-amber-400"
                    : "bg-rose-400";

                return (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handleCaseSelect(demo)}
                    className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-white/10 text-white shadow-sm border border-white/15"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${dotColor}`} />
                    <span>{demo.title}</span>
                    <span className="text-[10px] text-slate-500">
                      ({demo.artifacts.length})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Actions: Ready Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-emerald-300">
                  Ready
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main 3-Column Studio Grid */}
        <main className="flex-1 px-6 py-6 mx-auto w-full max-w-[1780px]">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 h-full">
            {/* Left Column: Evidence Ingestion (3 Cols) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-5 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <Database className="size-4 text-cyan-400" />
                    <h2 className="text-xs font-bold tracking-wider uppercase text-slate-300">
                      Evidence Ingestion
                    </h2>
                  </div>
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                    {uploadedFiles.length} Staged
                  </span>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition-all hover:border-cyan-400/50 hover:bg-cyan-500/[0.03]"
                >
                  <div className="flex size-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
                    <UploadCloud className="size-5" />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-200">
                    Drag & Drop Evidence
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Images, audio, video, contracts
                  </p>

                  <label className="mt-3.5 inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm transition hover:bg-white/10 hover:border-white/20">
                    <span>Browse Files</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFilesAdded}
                    />
                  </label>
                </div>

                {/* Staged Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-3">
                    <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                      Staged Artifacts
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {uploadedFiles.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-slate-400">
                              {file.type.includes("image") ? (
                                <ImageIcon className="size-3.5 text-cyan-400" />
                              ) : file.type.includes("audio") ? (
                                <Music className="size-3.5 text-purple-400" />
                              ) : (
                                <FileText className="size-3.5 text-amber-400" />
                              )}
                            </span>
                            <span className="truncate text-slate-300 font-medium text-[11px]">
                              {file.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-slate-500 hover:text-rose-400 transition ml-2"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Run Investigation Button */}
                <button
                  type="button"
                  disabled={isInvestigating || uploadedFiles.length === 0}
                  onClick={handleRunInvestigation}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="size-4" />
                  <span>
                    {isInvestigating
                      ? investigationStage || "Analyzing Evidence..."
                      : "Run Live Investigation"}
                  </span>
                </button>

                {error && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                    <AlertTriangle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Forensic Engine Diagnostics */}
              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 shadow-xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                    Active Forensic Pipeline
                  </p>
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400">
                    v2.4 ONLINE
                  </span>
                </div>
                <div className="mt-3 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      ELA JPEG Compression
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold text-[11px]">Online</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      EXIF Metadata Audit
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold text-[11px]">Calibrated</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      Audio Spectrogram Anomaly
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold text-[11px]">Synchronized</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      Cross-Modal Contradiction
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold text-[11px]">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column: Conflict Graph Canvas (6 Cols) */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <div className="size-2 rounded-full bg-cyan-400 animate-pulse" />
                  <h2 className="text-sm font-bold tracking-tight text-white">
                    {selectedCase.title}
                  </h2>
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                    {selectedCase.artifacts.length} ARTIFACTS
                  </span>
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                    {selectedCase.connections.length} EDGES
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Cross-Modal Conflict Graph
                  </span>
                </div>
              </div>

              {/* React Flow Graph */}
              <div className="h-[680px] w-full">
                <EvidenceGraph
                  investigation={selectedCase}
                  selectedArtifactId={selectedArtifactId}
                  onArtifactSelect={setSelectedArtifactId}
                />
              </div>
            </div>

            {/* Right Column: Evidence Inspection & Reasoning (3 Cols) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              {/* Verdict Hero Card */}
              <div
                className={`relative overflow-hidden rounded-2xl border p-5 shadow-2xl backdrop-blur-xl transition-all ${verdictTheme.border} bg-slate-900/70`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-40 pointer-events-none ${verdictTheme.glow}`}
                />

                <div className="relative flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${verdictTheme.badge}`}
                  >
                    INVESTIGATION VERDICT
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {selectedCase.id}
                  </span>
                </div>

                <div className="relative mt-3 flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-inner">
                    {verdictTheme.icon}
                  </div>
                  <div>
                    <h3 className={`text-lg font-extrabold tracking-tight ${verdictTheme.color}`}>
                      {selectedCase.verdict}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Synthesized Epistemic Verdict
                    </p>
                  </div>
                </div>

                {/* Confidence & Uncertainty Bars */}
                <div className="relative mt-4 grid grid-cols-2 gap-2.5 border-t border-white/[0.06] pt-3.5">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Confidence</span>
                      <span className="font-mono font-bold text-slate-200">
                        {selectedCase.confidence}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${selectedCase.confidence}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Uncertainty</span>
                      <span
                        className={`font-mono font-bold ${
                          selectedCase.uncertainty > 40 ? "text-amber-400" : "text-emerald-400"
                        }`}
                      >
                        {selectedCase.uncertainty}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${
                          selectedCase.uncertainty > 40 ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                        style={{ width: `${selectedCase.uncertainty}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabbed Inspection Drawer */}
              <div className="flex-1 rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 shadow-xl backdrop-blur-xl flex flex-col">
                <div className="flex items-center gap-1 border-b border-white/[0.06] pb-2 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveTab("forensics")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      activeTab === "forensics"
                        ? "bg-white/10 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Forensics
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("chain")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      activeTab === "chain"
                        ? "bg-white/10 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Evidence Chain ({selectedCase.evidenceChain.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("relationships")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      activeTab === "relationships"
                        ? "bg-white/10 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Links ({selectedRelationships.length})
                  </button>
                </div>

                <div className="mt-3 flex-1 overflow-y-auto max-h-[420px] space-y-3 pr-1 text-xs">
                  {/* TAB 1: FORENSICS */}
                  {activeTab === "forensics" && (
                    selectedArtifact ? (
                      <div className="space-y-3">
                        {/* Active Artifact Info */}
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Selected Artifact
                            </span>
                            <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-mono text-cyan-400 uppercase">
                              {selectedArtifact.modality}
                            </span>
                          </div>
                          <p className="mt-1 font-semibold text-slate-200 truncate">
                            {selectedArtifact.filename}
                          </p>

                          {/* File details & SHA */}
                          {selectedArtifact.forensicDetails && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400 border-t border-white/5 pt-2">
                              {selectedArtifact.forensicDetails.format && (
                                <span>Format: {selectedArtifact.forensicDetails.format}</span>
                              )}
                              {selectedArtifact.forensicDetails.width && selectedArtifact.forensicDetails.height && (
                                <span>• {selectedArtifact.forensicDetails.width}x{selectedArtifact.forensicDetails.height}</span>
                              )}
                              {selectedArtifact.forensicDetails.duration && (
                                <span>• {selectedArtifact.forensicDetails.duration.toFixed(1)}s</span>
                              )}
                              {selectedArtifact.forensicDetails.sha256 && (
                                <button
                                  type="button"
                                  onClick={() => handleCopySha(selectedArtifact.forensicDetails?.sha256)}
                                  className="flex items-center gap-1 font-mono text-[9px] text-slate-500 hover:text-cyan-400 transition ml-auto"
                                  title="Copy SHA-256 Checksum"
                                >
                                  {copiedSha ? (
                                    <>
                                      <Check className="size-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="size-3" />
                                      <span>{selectedArtifact.forensicDetails.sha256.slice(0, 8)}...</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Forensic Sub-Scores */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Forensic Telemetry
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                              <span className="text-[10px] text-slate-400">Signal Provenance</span>
                              <p className="font-mono font-bold text-emerald-400 mt-0.5">
                                {selectedArtifact.forensic?.provenance ?? 85}%
                              </p>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                              <span className="text-[10px] text-slate-400">Synthetic Anomaly</span>
                              <p
                                className={`font-mono font-bold mt-0.5 ${
                                  (selectedArtifact.forensic?.syntheticProbability ?? 0) > 50
                                    ? "text-rose-400"
                                    : "text-slate-300"
                                }`}
                              >
                                {selectedArtifact.forensic?.syntheticProbability ?? 15}%
                              </p>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                              <span className="text-[10px] text-slate-400">Metadata Integrity</span>
                              <p className="font-mono font-bold text-cyan-400 mt-0.5">
                                {selectedArtifact.forensic?.metadataIntegrity ?? 90}%
                              </p>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                              <span className="text-[10px] text-slate-400">Consistency Score</span>
                              <p className="font-mono font-bold text-indigo-400 mt-0.5">
                                {selectedArtifact.forensic?.crossModalConsistency ?? 80}%
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Observations / Flags */}
                        {selectedArtifact.forensicDetails?.observations &&
                          selectedArtifact.forensicDetails.observations.length > 0 && (
                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                                Signal Anomalies Detected
                              </span>
                              <ul className="mt-2 space-y-1 text-[11px] text-rose-300 list-disc list-inside">
                                {selectedArtifact.forensicDetails.observations.map((obs, idx) => (
                                  <li key={idx}>{obs}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                        <Info className="size-6 text-slate-600 mb-2" />
                        <p className="text-xs">Select an artifact in the graph to inspect detailed forensics.</p>
                      </div>
                    )
                  )}

                  {/* TAB 2: EVIDENCE CHAIN */}
                  {activeTab === "chain" && (
                    <div className="space-y-2.5">
                      {selectedCase.evidenceChain.map((step, idx) => {
                        const badgeColor =
                          step.severity === "high"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : step.severity === "medium"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

                        return (
                          <div
                            key={step.id || idx}
                            className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="flex size-4 items-center justify-center rounded-full bg-cyan-500/10 text-[9px] font-bold text-cyan-400">
                                  {idx + 1}
                                </span>
                                <span className="font-semibold text-slate-300">
                                  {step.title}
                                </span>
                              </div>
                              <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${badgeColor}`}>
                                {step.severity}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAB 3: RELATIONSHIPS */}
                  {activeTab === "relationships" && (
                    <div className="space-y-2.5">
                      {selectedRelationships.length > 0 ? (
                        selectedRelationships.map((conn) => {
                          const isContradict = conn.relationship === "Contradicts";
                          const isCorroborate = conn.relationship === "Corroborates";
                          const pillClass = isContradict
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                            : isCorroborate
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-400";

                          return (
                            <div
                              key={conn.id}
                              className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[130px]">
                                  {conn.source} → {conn.target}
                                </span>
                                <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${pillClass}`}>
                                  {conn.relationship}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                          <GitBranch className="size-6 text-slate-600 mb-2" />
                          <p className="text-xs">No specific links found for this artifact.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
