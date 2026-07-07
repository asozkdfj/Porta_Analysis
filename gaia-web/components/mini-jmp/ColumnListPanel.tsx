"use client";

import { Hash, Calendar, Type, ToggleLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MiniJmpColumn, MiniJmpColumnKind } from "@/lib/mini-jmp-types";

interface ColumnListPanelProps {
  columns: MiniJmpColumn[];
  search: string;
  onSearchChange: (v: string) => void;
  xColumn: string | null;
  yColumn: string | null;
  colorColumn: string | null;
  onDragStart: (column: string) => void;
  onAssign: (zone: "x" | "y" | "color", column: string) => void;
}

function kindIcon(kind: MiniJmpColumnKind) {
  if (kind === "numeric") return Hash;
  if (kind === "datetime") return Calendar;
  if (kind === "boolean") return ToggleLeft;
  return Type;
}

function kindLabel(kind: MiniJmpColumnKind) {
  if (kind === "numeric") return "Number";
  if (kind === "datetime") return "DateTime";
  if (kind === "boolean") return "Boolean";
  return "Text";
}

export function ColumnListPanel({
  columns,
  search,
  onSearchChange,
  xColumn,
  yColumn,
  colorColumn,
  onDragStart,
  onAssign,
}: ColumnListPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-slate-700 bg-slate-900">
      <div className="shrink-0 border-b border-slate-700 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Columns
          </h3>
          <span className="text-[10px] text-slate-500 tabular-nums">
            {columns.length.toLocaleString()}
          </span>
        </div>
        <input
          type="search"
          placeholder="Search columns..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="mt-2 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
        />
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-2 space-y-1">
        {columns.map((col) => {
          const Icon = kindIcon(col.kind);
          const active =
            col.name === xColumn ||
            col.name === yColumn ||
            col.name === colorColumn;
          return (
            <li key={col.name}>
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/column", col.name);
                  onDragStart(col.name);
                }}
                className={cn(
                  "group rounded border px-2 py-1.5 cursor-grab active:cursor-grabbing",
                  active
                    ? "border-blue-500 bg-blue-950/40"
                    : "border-slate-700 bg-slate-800/60 hover:border-slate-500"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-mono text-slate-100 truncate" title={col.name}>
                      {col.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      [{kindLabel(col.kind)}] · n={col.nonEmptyCount.toLocaleString()}
                      {col.missingCount > 0 && (
                        <span className="text-amber-500/80">
                          {" "}
                          · miss {col.missingCount.toLocaleString()}
                        </span>
                      )}
                      {" "}
                      · uniq {col.uniqueCount.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-200 hover:bg-blue-700"
                    onClick={() => onAssign("x", col.name)}
                  >
                    X
                  </button>
                  <button
                    type="button"
                    className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-200 hover:bg-blue-700"
                    onClick={() => onAssign("y", col.name)}
                  >
                    Y
                  </button>
                  <button
                    type="button"
                    className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-200 hover:bg-violet-700"
                    onClick={() => onAssign("color", col.name)}
                  >
                    Color
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
