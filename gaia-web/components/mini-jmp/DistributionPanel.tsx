"use client";

import { formatStat } from "@/lib/mini-jmp-stats";
import type { MiniJmpCategoryFreq, MiniJmpColumn, MiniJmpSummaryStats } from "@/lib/mini-jmp-types";

interface DistributionPanelProps {
  columns: MiniJmpColumn[];
  column: string | null;
  onColumnChange: (name: string) => void;
  numericStats: MiniJmpSummaryStats | null;
  categoryFreq: MiniJmpCategoryFreq[] | null;
  isNumeric: boolean;
}

export function DistributionPanel({
  columns,
  column,
  onColumnChange,
  numericStats,
  categoryFreq,
  isNumeric,
}: DistributionPanelProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900">
      <div className="border-b border-slate-700 px-3 py-2 flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Distribution
        </h3>
        <select
          value={column ?? ""}
          onChange={(e) => onColumnChange(e.target.value)}
          className="ml-auto rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] text-slate-100 max-w-[200px]"
        >
          <option value="">Column 선택…</option>
          {columns.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {!column ? (
        <p className="px-3 py-4 text-xs text-slate-500 text-center">
          컬럼을 선택하면 분포·빈도를 확인할 수 있습니다.
        </p>
      ) : isNumeric && numericStats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 text-xs">
          {[
            ["Count", numericStats.count.toLocaleString()],
            ["Missing", numericStats.missingCount.toLocaleString()],
            ["Mean", formatStat(numericStats.mean)],
            ["Median", formatStat(numericStats.median)],
            ["Min", formatStat(numericStats.min)],
            ["Max", formatStat(numericStats.max)],
            ["Std Dev", formatStat(numericStats.stdDev)],
            ["IQR", formatStat(numericStats.iqr)],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-slate-700 bg-slate-800/60 px-2 py-1.5">
              <div className="text-[10px] text-slate-500">{label}</div>
              <div className="font-mono font-semibold text-slate-100">{value}</div>
            </div>
          ))}
        </div>
      ) : categoryFreq && categoryFreq.length > 0 ? (
        <div className="max-h-[180px] overflow-y-auto p-2">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left py-1 px-2">Category</th>
                <th className="text-right py-1 px-2">Count</th>
                <th className="text-right py-1 px-2">%</th>
              </tr>
            </thead>
            <tbody>
              {categoryFreq.map((row) => (
                <tr key={row.category} className="border-b border-slate-800">
                  <td className="py-1 px-2 font-mono text-slate-200 truncate max-w-[180px]" title={row.category}>
                    {row.category}
                  </td>
                  <td className="py-1 px-2 text-right text-slate-300">{row.count}</td>
                  <td className="py-1 px-2 text-right text-slate-400">{row.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-3 py-4 text-xs text-slate-500 text-center">데이터 없음</p>
      )}
    </div>
  );
}
