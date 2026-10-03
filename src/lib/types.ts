export type Modality =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "message";

export type Verdict =
  | "Authentic"
  | "Manipulated"
  | "Coordinated Synthetic"
  | "Insufficient Evidence";

export type EdgeRelationship =
  | "Corroborates"
  | "Contradicts"
  | "Uncertain"
  | "Unrelated";

export interface ForensicDetails {
  sha256?: string;
  sizeBytes?: number;
  contentType?: string;

  format?: string | null;
  width?: number | null;
  height?: number | null;
  aspectRatio?: number | null;
  mode?: string | null;
  entropy?: number | null;

  duration?: number | null;
  sampleRate?: number | null;
  channels?: number | null;
  frames?: number | null;
  subtype?: string | null;
  rms?: number | null;
  peak?: number | null;
  zeroCrossingRate?: number | null;
  spectralCentroid?: number | null;
  dynamicRange?: number | null;

  metadata?: Record<string, string>;

  camera?: {
    make?: string | null;
    model?: string | null;
  };

  dateTaken?: string | null;
  software?: string | null;

  metadataIntegrityScore?: number | null;
  provenanceScore?: number | null;
  compressionScore?: number | null;
  structuralScore?: number | null;
  syntheticSignal?: number | null;

  observations?: string[];
}

export interface MediaArtifact {
  id: string;
  filename: string;
  modality: Modality;
  thumbnail?: string;
  description?: string;

  forensic?: {
    provenance: number;
    syntheticProbability: number;
    metadataIntegrity: number;
    crossModalConsistency: number;
  };

  forensicDetails?: ForensicDetails;
}

export interface EvidenceConnection {
  id: string;
  source: string;
  target: string;
  relationship: EdgeRelationship;
}

export interface EvidenceStep {
  id: string;
  title: string;
  description: string;
  severity?: "low" | "medium" | "high";
}

export interface AnalysisStage {
  id: string;
  label: string;
  status: "complete" | "warning" | "pending";
  detail: string;
}

export interface Investigation {
  id: string;
  title: string;
  verdict: Verdict;
  confidence: number;
  uncertainty: number;
  artifacts: MediaArtifact[];
  connections: EvidenceConnection[];
  evidenceChain: EvidenceStep[];
  analysisPipeline: AnalysisStage[];
}
