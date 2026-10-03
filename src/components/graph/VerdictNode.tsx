"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

type VerdictData = {
  verdict: string;
  confidence: number;
  uncertainty: number;
};

type VerdictNodeProps = NodeProps & {
  data: VerdictData;
};

const verdictStyles: Record<
  string,
  {
    border: string;
    text: string;
    dot: string;
  }
> = {
  Authentic: {
    border: "border-emerald-500/50",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  Manipulated: {
    border: "border-red-500/50",
    text: "text-red-400",
    dot: "bg-red-400",
  },
  "Coordinated Synthetic": {
    border: "border-red-500/50",
    text: "text-red-400",
    dot: "bg-red-400",
  },
  "Insufficient Evidence": {
    border: "border-amber-500/50",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
};

export default function VerdictNode({
  data,
}: VerdictNodeProps) {
  const style =
    verdictStyles[data.verdict] ??
    verdictStyles["Insufficient Evidence"];

  return (
    <div
      className={`min-w-[230px] rounded-lg border bg-[#111827] px-5 py-4 shadow-xl ${style.border}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-slate-500"
      />

      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${style.dot}`}
        />

        <p className="text-[9px] font-semibold tracking-[0.2em] text-slate-500">
          INVESTIGATION VERDICT
        </p>
      </div>

      <p
        className={`mt-3 text-lg font-semibold ${style.text}`}
      >
        {data.verdict}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded border border-slate-700 bg-[#0b1120] px-3 py-2">
          <p className="text-[8px] font-semibold tracking-widest text-slate-600">
            CONFIDENCE
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-200">
            {data.confidence}%
          </p>
        </div>

        <div className="rounded border border-slate-700 bg-[#0b1120] px-3 py-2">
          <p className="text-[8px] font-semibold tracking-widest text-slate-600">
            UNCERTAINTY
          </p>

          <p className="mt-1 text-sm font-semibold text-amber-400">
            {data.uncertainty}%
          </p>
        </div>
      </div>
    </div>
  );
}

