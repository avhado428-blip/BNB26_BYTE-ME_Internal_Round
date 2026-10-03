import { Investigation } from "@/lib/types";

export const demoCases: Investigation[] = [
  {
    id: "TL-001",
    title: "Authentic Press",
    verdict: "Authentic",
    confidence: 96,
    uncertainty: 4,

    artifacts: [
      {
        id: "press-image",
        filename: "press-conference.jpg",
        modality: "image",
        thumbnail: "/evidence/press-conference.svg",
        description: "Original press conference photograph.",
         forensic: {
    provenance: 96,
    syntheticProbability: 4,
    metadataIntegrity: 97,
    crossModalConsistency: 94,
  },
      },
      {
        id: "press-video",
        filename: "press-footage.mp4",
        modality: "video",
        description: "Matching press conference footage.",
        forensic: {
    provenance: 93,
    syntheticProbability: 6,
    metadataIntegrity: 91,
    crossModalConsistency: 96,
  },
      },
      {
        id: "press-document",
        filename: "official-record.pdf",
        modality: "document",
        description: "Official event record.",
         forensic: {
    provenance: 98,
    syntheticProbability: 2,
    metadataIntegrity: 99,
    crossModalConsistency: 95,
  },
      },
    ],

   connections: [
  {
    id: "edge-1",
    source: "press-image",
    target: "press-video",
    relationship: "Corroborates",
  },
  {
    id: "edge-2",
    source: "press-video",
    target: "press-document",
    relationship: "Corroborates",
  },
  {
    id: "edge-3",
    source: "press-document",
    target: "verdict",
    relationship: "Corroborates",
  },
],

    evidenceChain: [
      {
        id: "step-1",
        title: "Metadata consistency",
        description:
          "Image metadata is consistent with the documented event timeline.",
        severity: "low",
      },
      {
        id: "step-2",
        title: "Visual consistency",
        description:
          "No significant synthetic artifacts were detected.",
        severity: "low",
      },
      {
        id: "step-3",
        title: "Cross-modal agreement",
        description:
          "Image, video, and official documentation describe the same event.",
        severity: "low",
      },
    ],
    analysisPipeline: [
  {
    id: "pipeline-1",
    label: "Artifact ingestion",
    status: "complete",
    detail: "3 artifacts successfully processed.",
  },
  {
    id: "pipeline-2",
    label: "Metadata extraction",
    status: "complete",
    detail: "No significant metadata anomalies detected.",
  },
  {
    id: "pipeline-3",
    label: "Cross-modal comparison",
    status: "complete",
    detail: "Evidence shows strong agreement.",
  },
  {
    id: "pipeline-4",
    label: "Synthetic signal analysis",
    status: "complete",
    detail: "No significant synthetic indicators detected.",
  },
  {
    id: "pipeline-5",
    label: "Investigation synthesis",
    status: "complete",
    detail: "Evidence supports an authentic classification.",
  },
],
  },

  {
    id: "TL-002",
    title: "Coordinated Deepfake Attack",
    verdict: "Coordinated Synthetic",
    confidence: 91,
    uncertainty: 9,

    artifacts: [
      {
        id: "attack-image",
        filename: "candidate-image.jpg",
        modality: "image",
        thumbnail: "/evidence/deepfake.svg",
        description: "Suspected synthetic image.",
         forensic: {
    provenance: 21,
    syntheticProbability: 94,
    metadataIntegrity: 38,
    crossModalConsistency: 18,
  },
      },
      {
        id: "attack-video",
        filename: "candidate-video.mp4",
        modality: "video",
        description: "Suspected manipulated video.",
        forensic: {
    provenance: 27,
    syntheticProbability: 89,
    metadataIntegrity: 42,
    crossModalConsistency: 22,
  },
      },
      {
        id: "attack-audio",
        filename: "voice-recording.wav",
        modality: "audio",
        description: "Synthetic voice recording.",
        forensic: {
    provenance: 19,
    syntheticProbability: 92,
    metadataIntegrity: 34,
    crossModalConsistency: 16,
  },
      },
    ],

    connections: [
  {
    id: "edge-4",
    source: "attack-image",
    target: "attack-video",
    relationship: "Contradicts",
  },
  {
    id: "edge-5",
    source: "attack-video",
    target: "attack-audio",
    relationship: "Contradicts",
  },
  {
    id: "edge-6",
    source: "attack-audio",
    target: "verdict",
    relationship: "Contradicts",
  },
],

    evidenceChain: [
      {
        id: "step-4",
        title: "Synthetic visual artifacts",
        description:
          "Facial regions contain patterns associated with generated imagery.",
        severity: "high",
      },
      {
        id: "step-5",
        title: "Audio inconsistency",
        description:
          "Voice characteristics are inconsistent with the supplied source material.",
        severity: "high",
      },
      {
        id: "step-6",
        title: "Cross-modal contradiction",
        description:
          "Independent artifacts contain mutually inconsistent evidence.",
        severity: "high",
      },
    ],
    analysisPipeline: [
  {
    id: "pipeline-6",
    label: "Artifact ingestion",
    status: "complete",
    detail: "3 suspicious artifacts successfully processed.",
  },
  {
    id: "pipeline-7",
    label: "Metadata extraction",
    status: "warning",
    detail: "Multiple metadata inconsistencies detected.",
  },
  {
    id: "pipeline-8",
    label: "Cross-modal comparison",
    status: "warning",
    detail: "Artifacts contain contradictory signals.",
  },
  {
    id: "pipeline-9",
    label: "Synthetic signal analysis",
    status: "warning",
    detail: "Strong synthetic indicators detected.",
  },
  {
    id: "pipeline-10",
    label: "Investigation synthesis",
    status: "complete",
    detail: "Evidence supports a coordinated synthetic classification.",
  },
],
  },

  {
    id: "TL-003",
    title: "Incomplete Evidence",
    verdict: "Insufficient Evidence",
    confidence: 48,
    uncertainty: 52,

    artifacts: [
      {
        id: "incomplete-image",
        filename: "unknown-source.png",
        modality: "image",
        thumbnail: "/evidence/unknown-source.svg",
        description: "Image with incomplete provenance.",
         forensic: {
    provenance: 18,
    syntheticProbability: 51,
    metadataIntegrity: 29,
    crossModalConsistency: 44,
  },
      },
      {
        id: "incomplete-message",
        filename: "forwarded-message.txt",
        modality: "message",
        description: "Unverified message accompanying the image.",
        forensic: {
    provenance: 12,
    syntheticProbability: 47,
    metadataIntegrity: 22,
    crossModalConsistency: 31,
  },
      },
    ],

    connections: [
  {
    id: "edge-7",
    source: "incomplete-image",
    target: "incomplete-message",
    relationship: "Contradicts",
  },
  {
    id: "edge-8",
    source: "incomplete-message",
    target: "verdict",
    relationship: "Contradicts",
  },
],

    evidenceChain: [
      {
        id: "step-7",
        title: "Missing provenance",
        description:
          "The original source of the primary artifact could not be established.",
        severity: "medium",
      },
      {
        id: "step-8",
        title: "Limited corroboration",
        description:
          "No independent source was available to verify the claim.",
        severity: "medium",
      },
      {
        id: "step-9",
        title: "Uncertainty remains",
        description:
          "Available evidence is insufficient to establish authenticity.",
        severity: "medium",
      },
    ],
    analysisPipeline: [
  {
    id: "pipeline-11",
    label: "Artifact ingestion",
    status: "complete",
    detail: "2 artifacts successfully processed.",
  },
  {
    id: "pipeline-12",
    label: "Metadata extraction",
    status: "warning",
    detail: "Source metadata is incomplete.",
  },
  {
    id: "pipeline-13",
    label: "Cross-modal comparison",
    status: "warning",
    detail: "Independent corroboration is unavailable.",
  },
  {
    id: "pipeline-14",
    label: "Synthetic signal analysis",
    status: "warning",
    detail: "Available signals are inconclusive.",
  },
  {
    id: "pipeline-15",
    label: "Investigation synthesis",
    status: "warning",
    detail: "Evidence is insufficient for a definitive classification.",
  },
],
  },
];