"use client";

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import MediaArtifactNode from "./MediaArtifactNode";
import VerdictNode from "./VerdictNode";
import type { Investigation, MediaArtifact } from "@/lib/types";

interface EvidenceGraphProps {
  investigation: Investigation;
  selectedArtifactId?: string | null;
  onArtifactSelect?: (artifactId: string) => void;
}

type MediaArtifactNodeData = {
  artifact: MediaArtifact;
};

type VerdictNodeData = {
  verdict: string;
  confidence: number;
  uncertainty: number;
};

type MediaArtifactGraphNode = Node<MediaArtifactNodeData>;
type VerdictGraphNode = Node<VerdictNodeData>;
type EvidenceGraphNode = MediaArtifactGraphNode | VerdictGraphNode;

export default function EvidenceGraph({
  investigation,
  selectedArtifactId,
  onArtifactSelect,
}: EvidenceGraphProps) {
  const nodes: EvidenceGraphNode[] = [];

  investigation.artifacts.forEach((artifact, index) => {
    const positions = [
      { x: 60, y: 80 },
      { x: 60, y: 270 },
      { x: 60, y: 460 },
      { x: 60, y: 650 },
    ];

    nodes.push({
      id: artifact.id,
      type: "mediaArtifact",
      position: positions[index % positions.length],
      selected: selectedArtifactId === artifact.id,
      data: {
        artifact,
      },
    });
  });

  nodes.push({
    id: "verdict",
    type: "verdict",
    position: {
      x: 520,
      y: Math.max(160, Math.min(320, investigation.artifacts.length * 90)),
    },
    data: {
      verdict: investigation.verdict,
      confidence: investigation.confidence,
      uncertainty: investigation.uncertainty,
    },
  });

  const edges: Edge[] = investigation.connections.map((connection) => {
    const isCorroborates = connection.relationship === "Corroborates";
    const isContradicts = connection.relationship === "Contradicts";
    const isUncertain = connection.relationship === "Uncertain";

    let stroke = "#64748b";
    let labelColor = "#94a3b8";
    let strokeDasharray = "4 4";
    let animated = false;

    if (isCorroborates) {
      stroke = "#10b981";
      labelColor = "#34d399";
      strokeDasharray = "0";
    } else if (isContradicts) {
      stroke = "#ef4444";
      labelColor = "#f87171";
      strokeDasharray = "5 4";
      animated = true;
    } else if (isUncertain) {
      stroke = "#f59e0b";
      labelColor = "#fbbf24";
      strokeDasharray = "5 5";
    }

    return {
      id: connection.id,
      source: connection.source,
      target: connection.target,
      animated,
      label: connection.relationship.toUpperCase(),
      style: {
        stroke,
        strokeWidth: 2,
        strokeDasharray,
      },
      labelStyle: {
        fill: labelColor,
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: "0.08em",
      },
      labelBgStyle: {
        fill: "#0f172a",
        fillOpacity: 0.95,
      },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
        width: 16,
        height: 16,
      },
    };
  });

  const nodeTypes = {
    mediaArtifact: MediaArtifactNode,
    verdict: VerdictNode,
  };

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    if (node.type === "mediaArtifact") {
      onArtifactSelect?.(node.id);
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/70 shadow-2xl backdrop-blur-xl">
      {/* Canvas */}
      <div className="h-full min-h-[640px] w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{
            padding: 0.25,
          }}
          minZoom={0.4}
          maxZoom={1.5}
          attributionPosition="bottom-right"
        >
          <Background gap={28} size={1.2} color="#1e293b" />

          {/* Styled Dark Controls */}
          <Controls
            showInteractive={false}
            className="!rounded-xl !border !border-white/10 !bg-slate-900/90 !p-0.5 !shadow-2xl !backdrop-blur-md [&>button]:!border-0 [&>button]:!bg-transparent [&>button]:!text-slate-300 hover:[&>button]:!bg-white/10 hover:[&>button]:!text-white"
          />
        </ReactFlow>
      </div>

      {/* Floating Bottom Legend */}
      <div className="absolute inset-x-4 bottom-3 z-10 flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/85 px-4 py-2.5 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
            RELATIONSHIPS
          </span>
        </div>

        <div className="flex items-center gap-4 text-[10px] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded-full bg-emerald-400" />
            <span className="text-emerald-400">CORROBORATES</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dashed border-rose-500" />
            <span className="text-rose-400">CONTRADICTS</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dashed border-amber-400" />
            <span className="text-amber-400">UNCERTAIN</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-5 border-t border-dotted border-slate-500" />
            <span className="text-slate-500">UNRELATED</span>
          </div>
        </div>
      </div>
    </div>
  );
}