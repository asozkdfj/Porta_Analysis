"use client";

import type { MiniJmpFitStats } from "@/lib/mini-jmp-types";

interface FitYByXPanelProps {
  xLabel: string;
  yLabel: string;
  stats: MiniJmpFitStats | null;
  visible: boolean;
}

function fmt(v: number | null, digits = 4): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function FitYByXPanel({ xLabel, yLabel, stats, visible }: FitYByXPanelProps) {
  if (!visible || !stats) return null;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2">
        Fit Y by X · {yLabel} vs {xLabel}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {[
          ["n", stats.pointCount.toLocaleString()],
          ["Correlation (r)", fmt(stats.correlation)],
          ["R²", fmt(stats.rSquared)],
          ["Slope", fmt(stats.slope)],
          ["Intercept", fmt(stats.intercept)],
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-slate-700 bg-slate-800/60 px-2 py-1.5">
            <div className="text-[10px] text-slate-500">{label}</div>
            <div className="font-mono font-semibold text-slate-100">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
