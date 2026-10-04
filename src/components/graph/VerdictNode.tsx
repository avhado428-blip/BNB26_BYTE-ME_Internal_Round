"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

type VerdictData = {
  verdict: string;
  confidence: number;
  uncertainty: number;
};

type VerdictNodeProps = NodeProps & {
  data: VerdictData;
};

export default function VerdictNode({ data }: VerdictNodeProps) {
  const verdict = data.verdict;
  const isAuthentic = verdict.toLowerCase().includes("authentic");
  const isManipulated =
    verdict.toLowerCase().includes("manipulated") ||
    verdict.toLowerCase().includes("synthetic");

  const getVerdictConfig = () => {
    if (isAuthentic) {
      return {
        icon: <ShieldCheck className="size-5 text-emerald-400" />,
        badgeText: "VERIFIED AUTHENTIC",
        badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        border: "border-emerald-500/40 shadow-emerald-500/10",
        glow: "from-emerald-500/10 to-transparent",
        accent: "text-emerald-400",
      };
    }
    if (isManipulated) {
      return {
        icon: <ShieldAlert className="size-5 text-rose-400" />,
        badgeText: "MANIPULATION DETECTED",
        badgeBg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        border: "border-rose-500/50 shadow-rose-500/15",
        glow: "from-rose-500/15 to-transparent",
        accent: "text-rose-400",
      };
    }
    return {
      icon: <HelpCircle className="size-5 text-amber-400" />,
      badgeText: "INSUFFICIENT EVIDENCE",
      badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      border: "border-amber-500/40 shadow-amber-500/10",
      glow: "from-amber-500/10 to-transparent",
      accent: "text-amber-400",
    };
  };

  const config = getVerdictConfig();

  return (
    <div
      className={`relative min-w-[260px] overflow-hidden rounded-xl border bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md transition-all ${config.border}`}
    >
      {/* Ambient gradient top glow */}
      <div
        className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b opacity-40 pointer-events-none ${config.glow}`}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!size-2.5 !border-2 !border-slate-900 !bg-slate-400"
      />

      {/* Header Pill */}
      <div className="relative flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${config.badgeBg}`}
        >
          {config.badgeText}
        </span>
        <span className="text-[9px] font-mono uppercase text-slate-500">
          AI CORE v2
        </span>
      </div>

      {/* Main Verdict Label */}
      <div className="relative mt-2.5 flex items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5">
          {config.icon}
        </div>
        <div>
          <h3 className={`text-base font-bold tracking-tight ${config.accent}`}>
            {verdict}
          </h3>
          <p className="text-[10px] text-slate-400">Synthesized Verdict</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="relative mt-3.5 grid grid-cols-2 gap-2 border-t border-white/5 pt-2.5">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">
            Confidence
          </p>
          <p className="mt-0.5 font-mono text-sm font-bold text-slate-200">
            {data.confidence}%
          </p>
        </div>

        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">
            Uncertainty
          </p>
          <p
            className={`mt-0.5 font-mono text-sm font-bold ${
              data.uncertainty > 40 ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {data.uncertainty}%
          </p>
        </div>
      </div>
    </div>
  );
}
