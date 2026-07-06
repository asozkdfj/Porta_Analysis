"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  MINI_JMP_AGGREGATION_LABELS,
  MINI_JMP_GRAPH_LABELS,
  type MiniJmpAggregation,
  type MiniJmpChartOptions,
  type MiniJmpColumn,
  type MiniJmpFilter,
  type MiniJmpGraphType,
} from "@/lib/mini-jmp-types";

interface OptionPanelProps {
  graphType: MiniJmpGraphType;
  onGraphTypeChange: (t: MiniJmpGraphType) => void;
  xColumn: string | null;
  yColumn: string | null;
  colorColumn: string | null;
  groupColumn: string | null;
  columns: MiniJmpColumn[];
  aggregation: MiniJmpAggregation;
  onAggregationChange: (a: MiniJmpAggregation) => void;
  options: MiniJmpChartOptions;
  onOptionChange: <K extends keyof MiniJmpChartOptions>(
    key: K,
    value: MiniJmpChartOptions[K]
  ) => void;
  onAssign: (zone: "x" | "y" | "color" | "group", name: string) => void;
  onClear?: (zone: "x" | "y" | "color" | "group") => void;
  filterDraft: { column: string; value: string };
  onFilterDraftChange: (draft: { column: string; value: string }) => void;
  filterValueOptions: string[];
  filters: MiniJmpFilter[];
  onAddFilter: () => void;
  onRemoveFilter: (index: number) => void;
  onClearFilters: () => void;
}

function ScrollableColumnSelect({
  label,
  value,
  columns,
  onChange,
  onClear,
}: {
  label: string;
  value: string;
  columns: MiniJmpColumn[];
  onChange: (v: string) => void;
  onClear?: () => void;
}) {
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();
  const shown = q
    ? columns.filter((c) => c.name.toLowerCase().includes(q))
    : columns;

  return (
    <div className="space-y-1">
      <span className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {columns.length > 8 && (
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter..."
          className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] text-slate-100"
        />
      )}
      <div className="max-h-[132px] overflow-y-auto overscroll-y-contain rounded border border-slate-600 bg-slate-800">
        <button
          type="button"
          onClick={() => onClear?.()}
          className={cn(
            "block w-full px-2 py-1 text-left text-xs text-slate-400 hover:bg-slate-700",
            !value && "bg-blue-950/50 text-blue-200"
          )}
        >
          —
        </button>
        {shown.length === 0 ? (
          <p className="px-2 py-2 text-[10px] text-slate-500">No match</p>
        ) : (
          shown.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onChange(c.name)}
              className={cn(
                "block w-full px-2 py-1 text-left text-[10px] font-mono truncate hover:bg-slate-700",
                value === c.name
                  ? "bg-blue-950/50 text-blue-200"
                  : "text-slate-200"
              )}
              title={c.name}
            >
              {c.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OptionPanel({
  graphType,
  onGraphTypeChange,
  xColumn,
  yColumn,
  colorColumn,
  groupColumn,
  columns,
  aggregation,
  onAggregationChange,
  options,
  onOptionChange,
  onAssign,
  onClear,
  filterDraft,
  onFilterDraftChange,
  filterValueOptions,
  filters,
  onAddFilter,
  onRemoveFilter,
  onClearFilters,
}: OptionPanelProps) {
  const stringColumns = columns.filter((c) => c.kind === "string");

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-slate-700 bg-slate-900">
      <div className="shrink-0 border-b border-slate-700 px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Options
        </h3>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-3 space-y-3 text-sm">
        <SelectRow
          label="Graph Type"
          value={graphType}
          options={Object.entries(MINI_JMP_GRAPH_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(v) => onGraphTypeChange(v as MiniJmpGraphType)}
        />
        <ScrollableColumnSelect
          label="X Variable"
          value={xColumn ?? ""}
          columns={columns}
          onChange={(v) => onAssign("x", v)}
          onClear={() => onClear?.("x")}
        />
        <ScrollableColumnSelect
          label="Y Variable"
          value={yColumn ?? ""}
          columns={columns}
          onChange={(v) => onAssign("y", v)}
          onClear={() => onClear?.("y")}
        />
        <ScrollableColumnSelect
          label="Color Variable"
          value={colorColumn ?? ""}
          columns={columns}
          onChange={(v) => onAssign("color", v)}
          onClear={() => onClear?.("color")}
        />
        <ScrollableColumnSelect
          label="Group Variable"
          value={groupColumn ?? ""}
          columns={columns}
          onChange={(v) => onAssign("group", v)}
          onClear={() => onClear?.("group")}
        />
        <SelectRow
          label="Aggregation"
          value={aggregation}
          options={Object.entries(MINI_JMP_AGGREGATION_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(v) => onAggregationChange(v as MiniJmpAggregation)}
        />

        <div className="space-y-2 pt-1 border-t border-slate-700">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Display</p>
          {(
            [
              ["showGrid", "Show Grid"],
              ["showDataLabels", "Show Data Labels"],
              ["showTrendLine", "Show Trend Line"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) => onOptionChange(key, e.target.checked)}
                className="rounded border-slate-600"
              />
              {label}
            </label>
          ))}
          <label className="block space-y-1 pt-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              Point Alpha ({Math.round((options.pointAlpha ?? 1) * 100)}%)
            </span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={options.pointAlpha ?? 1}
              onChange={(e) => onOptionChange("pointAlpha", Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              Jitter ({Math.round((options.jitter ?? 0.45) * 100)}%)
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={options.jitter ?? 0.45}
              onChange={(e) => onOptionChange("jitter", Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </label>
        </div>

        <div className="space-y-2 pt-1 border-t border-slate-700">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Filter</p>
          <ScrollableColumnSelect
            label="Column"
            value={filterDraft.column}
            columns={stringColumns}
            onChange={(v) => onFilterDraftChange({ column: v, value: "" })}
            onClear={() => onFilterDraftChange({ column: "", value: "" })}
          />
          <SelectRow
            label="Value"
            value={filterDraft.value}
            options={[
              { value: "", label: "—" },
              ...filterValueOptions.map((v) => ({ value: v, label: v })),
            ]}
            onChange={(v) =>
              onFilterDraftChange({ ...filterDraft, value: v })
            }
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAddFilter}
              className="flex-1 rounded bg-slate-700 py-1 text-xs text-white hover:bg-slate-600"
            >
              Apply Filter
            </button>
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-400 hover:bg-slate-700"
            >
              Clear
            </button>
          </div>
          {filters.length > 0 && (
            <ul className="space-y-1">
              {filters.map((f, i) => (
                <li
                  key={`${f.column}-${f.value}-${i}`}
                  className="flex items-center justify-between rounded bg-slate-800 px-2 py-1 text-[10px] font-mono text-slate-300"
                >
                  <span className="truncate">
                    {f.column} = {f.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveFilter(i)}
                    className="text-slate-500 hover:text-red-400 ml-1"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
