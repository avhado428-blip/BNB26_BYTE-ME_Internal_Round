"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MediaArtifact } from "@/lib/types";

type MediaArtifactNodeData = {
  artifact: MediaArtifact;
};

type MediaArtifactNodeProps = NodeProps & {
  data: MediaArtifactNodeData;
};

const modalityIcons: Record<
  MediaArtifact["modality"],
  string
> = {
  image: "IMG",
  video: "VID",
  audio: "AUD",
  document: "DOC",
  message: "MSG",
};

export default function MediaArtifactNode({
  data,
}: MediaArtifactNodeProps) {
  const artifact = data.artifact;

  const icon = modalityIcons[artifact.modality];

  return (
    <div className="min-w-[220px] rounded-lg border border-slate-700 bg-[#111827] px-4 py-4 shadow-xl">
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-cyan-400"
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-slate-500"
      />

      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-cyan-500/20 bg-cyan-500/5 text-[9px] font-bold text-cyan-400">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-200">
            {artifact.filename}
          </p>

          <p className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
            {artifact.modality}
          </p>
        </div>
      </div>

      {artifact.description && (
        <p className="mt-3 text-[10px] leading-4 text-slate-500">
          {artifact.description}
        </p>
      )}

      {artifact.forensic && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded border border-slate-700 bg-[#0b1120] px-2 py-2">
            <p className="text-[8px] font-semibold tracking-wider text-slate-600">
              PROVENANCE
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-300">
              {artifact.forensic.provenance}%
            </p>
          </div>

          <div className="rounded border border-slate-700 bg-[#0b1120] px-2 py-2">
            <p className="text-[8px] font-semibold tracking-wider text-slate-600">
              SYNTHETIC
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-300">
              {artifact.forensic.syntheticProbability}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
