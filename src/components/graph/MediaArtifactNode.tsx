"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Music,
  Video as VideoIcon,
} from "lucide-react";
import type { MediaArtifact } from "@/lib/types";

type MediaArtifactNodeData = {
  artifact: MediaArtifact;
};

type MediaArtifactNodeProps = NodeProps & {
  data: MediaArtifactNodeData;
};

export default function MediaArtifactNode({
  data,
  selected,
}: MediaArtifactNodeProps) {
  const artifact = data.artifact;

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case "image":
        return <ImageIcon className="size-4 text-cyan-400" />;
      case "audio":
        return <Music className="size-4 text-purple-400" />;
      case "video":
        return <VideoIcon className="size-4 text-indigo-400" />;
      case "document":
        return <FileText className="size-4 text-amber-400" />;
      default:
        return <MessageSquare className="size-4 text-slate-400" />;
    }
  };

  const provenance = artifact.forensic?.provenance ?? 85;
  const synthetic = artifact.forensic?.syntheticProbability ?? 15;

  return (
    <div
      className={`group relative min-w-[240px] rounded-xl border bg-slate-900/90 p-3.5 shadow-2xl backdrop-blur-md transition-all duration-200 ${
        selected
          ? "border-cyan-400/80 ring-2 ring-cyan-400/20 shadow-cyan-500/10"
          : "border-slate-800 hover:border-slate-700 hover:shadow-cyan-500/5"
      }`}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2.5 !border-2 !border-slate-900 !bg-slate-400 transition-colors group-hover:!bg-cyan-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2.5 !border-2 !border-slate-900 !bg-cyan-400 shadow-sm shadow-cyan-400/50"
      />

      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 shadow-inner">
          {getModalityIcon(artifact.modality)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-200">
            {artifact.filename}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-sm bg-white/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-400">
              {artifact.modality}
            </span>
            {artifact.forensicDetails?.format && (
              <span className="text-[9px] text-slate-500">
                • {artifact.forensicDetails.format}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Forensic Signal Bars */}
      <div className="mt-3 space-y-1.5 border-t border-white/5 pt-2.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400">Signal Provenance</span>
          <span className="font-mono font-medium text-emerald-400">
            {provenance}%
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${Math.min(100, Math.max(0, provenance))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400">Synthetic Anomaly</span>
          <span
            className={`font-mono font-medium ${
              synthetic > 50 ? "text-rose-400" : "text-slate-400"
            }`}
          >
            {synthetic}%
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full ${
              synthetic > 50 ? "bg-rose-500" : "bg-slate-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, synthetic))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
