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

type MediaArtifactGraphNode =
  Node<MediaArtifactNodeData>;

type VerdictGraphNode =
  Node<VerdictNodeData>;

type EvidenceGraphNode =
  | MediaArtifactGraphNode
  | VerdictGraphNode;

export default function EvidenceGraph({
  investigation,
  selectedArtifactId,
  onArtifactSelect,
}: EvidenceGraphProps) {
  const nodes: EvidenceGraphNode[] = [];

  investigation.artifacts.forEach(
    (artifact, index) => {
      const positions = [
        { x: 80, y: 70 },
        { x: 80, y: 270 },
        { x: 80, y: 470 },
      ];

      nodes.push({
        id: artifact.id,
        type: "mediaArtifact",
        position:
          positions[index] ?? {
            x: 80,
            y: 70 + index * 200,
          },
        selected:
          artifact.id === selectedArtifactId,
        data: {
          artifact,
        },
      });
    }
  );

  nodes.push({
    id: "verdict",
    type: "verdict",
    position: {
      x: 500,
      y: 270,
    },
    data: {
      verdict: investigation.verdict,
      confidence: investigation.confidence,
      uncertainty: investigation.uncertainty,
    },
  });

  const edges: Edge[] =
    investigation.connections.map(
      (connection) => {
        const isCorroborates =
          connection.relationship ===
          "Corroborates";

        const isContradicts =
          connection.relationship ===
          "Contradicts";

        const isUncertain =
          connection.relationship ===
          "Uncertain";

        const isUnrelated =
          connection.relationship ===
          "Unrelated";

        let stroke = "#64748b";
        let labelColor = "#94a3b8";
        let strokeDasharray = "4 4";
        let animated = false;

        if (isCorroborates) {
          stroke = "#10b981";
          labelColor = "#34d399";
          strokeDasharray = "0";
        }

        if (isContradicts) {
          stroke = "#ef4444";
          labelColor = "#f87171";
          strokeDasharray = "6 4";
          animated = true;
        }

        if (isUncertain) {
          stroke = "#f59e0b";
          labelColor = "#fbbf24";
          strokeDasharray = "5 5";
        }

        if (isUnrelated) {
          stroke = "#64748b";
          labelColor = "#94a3b8";
          strokeDasharray = "3 5";
        }

        return {
          id: connection.id,
          source: connection.source,
          target: connection.target,
          type: "smoothstep",
          animated,
          label: connection.relationship.toUpperCase(),
          labelStyle: {
            fill: labelColor,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1,
          },
          labelBgStyle: {
            fill: "#0b1120",
            fillOpacity: 0.95,
          },
          labelBgPadding: [6, 3],
          style: {
            stroke,
            strokeWidth: 2,
            strokeDasharray,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: stroke,
          },
        };
      }
    );

  const nodeTypes = {
    mediaArtifact: MediaArtifactNode,
    verdict: VerdictNode,
  };

  const handleNodeClick: NodeMouseHandler = (
    _,
    node
  ) => {
    if (node.type === "mediaArtifact") {
      onArtifactSelect?.(node.id);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-[#0b1120]">
      <div className="flex h-[680px] w-full flex-col">
        <div className="min-h-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            fitView
            fitViewOptions={{
              padding: 0.3,
            }}
            minZoom={0.4}
            maxZoom={1.5}
            attributionPosition="bottom-left"
          >
            <Background
              gap={24}
              size={1}
              color="#1e293b"
            />

            <Controls
              showInteractive={false}
            />
          </ReactFlow>
        </div>

        <div className="flex h-10 items-center gap-5 overflow-x-auto border-t border-slate-700 bg-[#111827] px-4">
          <span className="shrink-0 text-[9px] font-semibold tracking-widest text-slate-500">
            RELATIONSHIPS
          </span>

          <div className="flex shrink-0 items-center gap-2">
            <span className="h-0.5 w-7 bg-emerald-500" />

            <span className="text-[10px] text-slate-400">
              CORROBORATES
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="w-7 border-t-2 border-dashed border-red-500" />

            <span className="text-[10px] text-slate-400">
              CONTRADICTS
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="w-7 border-t-2 border-dashed border-amber-500" />

            <span className="text-[10px] text-slate-400">
              UNCERTAIN
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="w-7 border-t-2 border-dotted border-slate-500" />

            <span className="text-[10px] text-slate-400">
              UNRELATED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}