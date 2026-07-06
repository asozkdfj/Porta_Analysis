"use client";

import { cn } from "@/lib/utils";
import {
  MINI_JMP_GRAPH_LABELS,
  type MiniJmpGraphType,
} from "@/lib/mini-jmp-types";

const GRAPH_TYPES: MiniJmpGraphType[] = [
  "scatter",
  "line",
  "bar",
  "histogram",
  "box",
];

interface GraphToolbarProps {
  graphType: MiniJmpGraphType;
  onGraphTypeChange: (t: MiniJmpGraphType) => void;
  onSwapXY?: () => void;
  canSwapXY?: boolean;
  onExport?: () => void;
  exportBusy?: boolean;
  canExport?: boolean;
}

export function GraphToolbar({
  graphType,
  onGraphTypeChange,
  onSwapXY,
  canSwapXY,
  onExport,
  exportBusy,
  canExport,
}: GraphToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {GRAPH_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onGraphTypeChange(t)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                graphType === t
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
            >
              {MINI_JMP_GRAPH_LABELS[t]}
            </button>
          ))}
        </div>
        {onSwapXY && (
          <button
            type="button"
            disabled={!canSwapXY}
            onClick={onSwapXY}
            className="rounded border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40"
            title="X ↔ Y 축 변수 교환"
          >
            Swap X/Y
          </button>
        )}
      </div>
      {onExport && (
        <button
          type="button"
          disabled={!canExport || exportBusy}
          onClick={onExport}
          className="rounded bg-slate-700 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-600 disabled:opacity-40"
        >
          {exportBusy ? "Exporting…" : "Export Chart PNG"}
        </button>
      )}
    </div>
  );
}
