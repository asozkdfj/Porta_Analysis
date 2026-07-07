"use client";

import { formatStat } from "@/lib/mini-jmp-stats";
import type { MiniJmpSummaryStats } from "@/lib/mini-jmp-types";

interface SummaryStatsPanelProps {
  column: string | null;
  stats: MiniJmpSummaryStats | null;
}

export function SummaryStatsPanel({ column, stats }: SummaryStatsPanelProps) {
  if (!column || !stats) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-4 text-xs text-slate-500 text-center">
        Numeric 컬럼 선택 시 Summary Statistics가 표시됩니다.
      </div>
    );
  }

  const items = [
    { label: "Count", value: stats.count.toLocaleString() },
    { label: "Missing", value: stats.missingCount.toLocaleString() },
    { label: "Mean", value: formatStat(stats.mean) },
    { label: "Median", value: formatStat(stats.median) },
    { label: "Min", value: formatStat(stats.min) },
    { label: "Max", value: formatStat(stats.max) },
    { label: "Range", value: formatStat(stats.range) },
    { label: "Std Dev", value: formatStat(stats.stdDev) },
    { label: "Q1", value: formatStat(stats.q1) },
    { label: "Q3", value: formatStat(stats.q3) },
    { label: "IQR", value: formatStat(stats.iqr) },
  ];

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900">
      <div className="border-b border-slate-700 px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Summary Statistics
        </h3>
        <p className="text-[10px] font-mono text-blue-300 mt-0.5">{column}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 p-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded border border-slate-700 bg-slate-800/60 px-2 py-1.5"
          >
            <div className="text-[10px] uppercase text-slate-500">{item.label}</div>
            <div className="text-sm font-mono font-semibold text-slate-100">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
