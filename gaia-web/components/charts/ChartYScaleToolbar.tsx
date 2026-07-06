"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CHART_Y_SCALE_MIN = 25;
export const CHART_Y_SCALE_MAX = 400;
export const CHART_Y_SCALE_STEP = 5;
export const CHART_Y_SCALE_DEFAULT = 100;

interface ChartYScaleToolbarProps {
  value: number;
  onChange: (value: number) => void;
  onReset: () => void;
  className?: string;
}

export function ChartYScaleToolbar({
  value,
  onChange,
  onReset,
  className,
}: ChartYScaleToolbarProps) {
  return (
    <div
      className={
        className ??
        "flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
      }
    >
      <span className="font-medium text-slate-700">Y축 Scale</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-7 p-0"
        aria-label="Y축 확대"
        onClick={() =>
          onChange(Math.max(CHART_Y_SCALE_MIN, value - CHART_Y_SCALE_STEP))
        }
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <input
        type="range"
        min={CHART_Y_SCALE_MIN}
        max={CHART_Y_SCALE_MAX}
        step={CHART_Y_SCALE_STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-36 cursor-pointer accent-slate-800"
        aria-label="Y축 scale"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-7 p-0"
        aria-label="Y축 축소"
        onClick={() =>
          onChange(Math.min(CHART_Y_SCALE_MAX, value + CHART_Y_SCALE_STEP))
        }
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <span className="min-w-[3rem] font-mono text-slate-600">{value}%</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-muted-foreground"
        onClick={onReset}
      >
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        초기화
      </Button>
      <span className="text-muted-foreground">
        낮을수록 Y축 확대 · 100% = 자동 범위
      </span>
    </div>
  );
}
