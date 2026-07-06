"use client";

import { cn } from "@/lib/utils";
import type { TactTimeRow } from "@/lib/tact-time-types";

interface TactTimeItemCardProps {
  row: TactTimeRow;
  selected?: boolean;
  disabled?: boolean;
  groupColor?: string;
  draggable?: boolean;
  onToggle?: () => void;
  onDragStart?: () => void;
  suppressNativeDrag?: boolean;
  compact?: boolean;
}

export function TactTimeItemCard({
  row,
  selected,
  disabled,
  groupColor,
  draggable,
  onToggle,
  onDragStart,
  suppressNativeDrag,
  compact,
}: TactTimeItemCardProps) {
  return (
    <button
      type="button"
      draggable={draggable && !disabled && !suppressNativeDrag}
      disabled={disabled && !onToggle}
      onClick={onToggle}
      onDragStart={(e) => {
        if (!draggable || disabled || suppressNativeDrag) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/tact-header", row.header);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      className={cn(
        "rounded-lg border bg-white text-left transition-all",
        compact ? "px-3 py-2 min-w-[100px]" : "px-4 py-3 min-w-[120px]",
        selected && "border-blue-500 ring-2 ring-blue-200 bg-blue-50/50",
        !selected && "border-slate-200 hover:border-slate-300 hover:shadow-sm",
        disabled && !selected && "opacity-50 cursor-not-allowed",
        draggable && !disabled && "cursor-grab active:cursor-grabbing"
      )}
      style={
        groupColor && !selected
          ? { borderLeftWidth: 4, borderLeftColor: groupColor }
          : undefined
      }
    >
      <div
        className={cn(
          "font-mono font-semibold text-slate-900 break-all",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {row.header}
      </div>
      <div
        className={cn(
          "mt-1 font-mono tabular-nums text-slate-600",
          compact ? "text-[11px]" : "text-xs"
        )}
      >
        {row.durationMs.toLocaleString()} ms
      </div>
    </button>
  );
}
