"use client";

import { useState } from "react";
import { ArrowLeftRight, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DropZone = "x" | "y" | "color" | "group" | "size" | "label";

interface DropZonePanelProps {
  xColumn: string | null;
  yColumn: string | null;
  colorColumn: string | null;
  groupColumn: string | null;
  sizeColumn: string | null;
  labelColumn: string | null;
  onDrop: (zone: DropZone, column: string) => void;
  onClear: (zone: DropZone) => void;
  onMoveZone: (from: DropZone, to: DropZone) => void;
  onSwapXY: () => void;
}

function Zone({
  zone,
  title,
  value,
  required,
  onDrop,
  onClear,
  onMoveZone,
}: {
  zone: DropZone;
  title: string;
  value: string | null;
  required?: boolean;
  onDrop: (column: string) => void;
  onClear: () => void;
  onMoveZone: (from: DropZone, to: DropZone) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const fromZone = e.dataTransfer.getData("text/from-zone") as DropZone | "";
        const col = e.dataTransfer.getData("text/column");
        if (fromZone && fromZone !== zone) {
          onMoveZone(fromZone, zone);
          return;
        }
        if (col) onDrop(col);
      }}
      className={cn(
        "rounded-md border-2 border-dashed px-2 py-2 min-h-[48px] flex items-center justify-between gap-1 transition-colors",
        dragOver
          ? "border-amber-400 bg-amber-950/30"
          : value
            ? "border-blue-500/60 bg-blue-950/30"
            : "border-slate-600 bg-slate-800/40"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">
          {title}
          {required && <span className="text-red-400 ml-1">*</span>}
        </div>
        {value ? (
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/column", value);
              e.dataTransfer.setData("text/from-zone", zone);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="mt-0.5 flex items-center gap-1 rounded bg-slate-800/80 px-1.5 py-0.5 cursor-grab active:cursor-grabbing hover:bg-slate-700/80"
            title="드래그하여 다른 Zone으로 이동 · X↔Y 교환"
          >
            <GripVertical className="h-3 w-3 shrink-0 text-slate-500" />
            <span className="text-xs font-mono text-slate-100 truncate">
              {value}
            </span>
          </div>
        ) : (
          <div className="text-xs font-mono text-slate-500 truncate mt-0.5">
            Drop column here
          </div>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700"
          aria-label={`Clear ${title}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function DropZonePanel({
  xColumn,
  yColumn,
  colorColumn,
  groupColumn,
  sizeColumn,
  labelColumn,
  onDrop,
  onClear,
  onMoveZone,
  onSwapXY,
}: DropZonePanelProps) {
  const canSwap = Boolean(xColumn || yColumn);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
        <Zone
          zone="x"
          title="X"
          value={xColumn}
          required
          onDrop={(c) => onDrop("x", c)}
          onClear={() => onClear("x")}
          onMoveZone={onMoveZone}
        />
        <button
          type="button"
          onClick={onSwapXY}
          disabled={!canSwap}
          title="X ↔ Y 교환 (JMP)"
          className={cn(
            "self-center rounded border px-2 py-3 text-slate-300 transition-colors",
            canSwap
              ? "border-slate-600 bg-slate-800 hover:bg-slate-700 hover:text-white"
              : "border-slate-700 bg-slate-900 opacity-40 cursor-not-allowed"
          )}
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <Zone
          zone="y"
          title="Y"
          value={yColumn}
          required
          onDrop={(c) => onDrop("y", c)}
          onClear={() => onClear("y")}
          onMoveZone={onMoveZone}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Zone
          zone="color"
          title="Color"
          value={colorColumn}
          onDrop={(c) => onDrop("color", c)}
          onClear={() => onClear("color")}
          onMoveZone={onMoveZone}
        />
        <Zone
          zone="group"
          title="Group"
          value={groupColumn}
          onDrop={(c) => onDrop("group", c)}
          onClear={() => onClear("group")}
          onMoveZone={onMoveZone}
        />
        <Zone
          zone="size"
          title="Size"
          value={sizeColumn}
          onDrop={(c) => onDrop("size", c)}
          onClear={() => onClear("size")}
          onMoveZone={onMoveZone}
        />
        <Zone
          zone="label"
          title="Label"
          value={labelColumn}
          onDrop={(c) => onDrop("label", c)}
          onClear={() => onClear("label")}
          onMoveZone={onMoveZone}
        />
      </div>
      <p className="text-[10px] text-slate-500 text-center">
        컬럼을 Zone에 드래그 · Zone 간 드래그로 X/Y 교환 · ⇄ 버튼으로 스왑
      </p>
    </div>
  );
}
