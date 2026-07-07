"use client";

import { cn } from "@/lib/utils";
import {
  MINI_JMP_GRAPH_LABELS,
  type MiniJmpGraphType,
  type MiniJmpSavedConfig,
} from "@/lib/mini-jmp-types";

const GRAPH_TYPES: MiniJmpGraphType[] = [
  "scatter",
  "line",
  "bar",
  "histogram",
  "box",
  "pareto",
  "heatmap",
];

interface GraphToolbarProps {
  graphType: MiniJmpGraphType;
  onGraphTypeChange: (t: MiniJmpGraphType) => void;
  onSwapXY?: () => void;
  canSwapXY?: boolean;
  onExport?: () => void;
  onExportCsv?: () => void;
  exportBusy?: boolean;
  canExport?: boolean;
  onUndo?: () => void;
  canUndo?: boolean;
  onReset?: () => void;
  presets?: MiniJmpSavedConfig[];
  onApplyPreset?: (name: string) => void;
  onSaveConfig?: () => void;
  onImportConfig?: (file: File) => void | Promise<void>;
}

export function GraphToolbar({
  graphType,
  onGraphTypeChange,
  onSwapXY,
  canSwapXY,
  onExport,
  onExportCsv,
  exportBusy,
  canExport,
  onUndo,
  canUndo,
  onReset,
  presets,
  onApplyPreset,
  onSaveConfig,
  onImportConfig,
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
        {onUndo && (
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className="rounded border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          >
            Undo
          </button>
        )}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700"
          >
            Reset
          </button>
        )}
        {presets && presets.length > 0 && onApplyPreset && (
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onApplyPreset(e.target.value);
                e.target.value = "";
              }
            }}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200"
          >
            <option value="">Preset…</option>
            {presets.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onSaveConfig && (
          <button
            type="button"
            onClick={onSaveConfig}
            className="rounded border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700"
          >
            Save View
          </button>
        )}
        {onImportConfig && (
          <label className="cursor-pointer rounded border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700">
            Load View
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImportConfig(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className="rounded border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700"
          >
            Export CSV
          </button>
        )}
        {onExport && (
          <button
            type="button"
            disabled={!canExport || exportBusy}
            onClick={onExport}
            className="rounded bg-slate-700 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-600 disabled:opacity-40"
          >
            {exportBusy ? "Exporting…" : "Export PNG"}
          </button>
        )}
      </div>
    </div>
  );
}
