import type { MiniJmpAxisRange, MiniJmpGuideLine } from "./mini-jmp-types";

export const DEFAULT_GUIDE_LINE_COLOR = "#888888";

export const GUIDE_LINE_COLOR_PRESETS: { label: string; color: string }[] = [
  { label: "회색", color: "#888888" },
  { label: "빨강", color: "#e74c3c" },
  { label: "파랑", color: "#3498db" },
  { label: "초록", color: "#27ae60" },
  { label: "주황", color: "#f39c12" },
  { label: "보라", color: "#9b59b6" },
  { label: "검정", color: "#222222" },
];

export function guideLineColor(line: MiniJmpGuideLine): string {
  return line.color ?? DEFAULT_GUIDE_LINE_COLOR;
}

export function applyAxisRange(
  base: [number, number] | ["dataMin", "dataMax"],
  range: MiniJmpAxisRange,
  extent?: { min: number; max: number }
): [number, number] {
  let lo: number;
  let hi: number;

  if (base[0] === "dataMin" && base[1] === "dataMax") {
    lo = extent?.min ?? 0;
    hi = extent?.max ?? 1;
  } else {
    [lo, hi] = base as [number, number];
  }

  if (range.min != null) lo = range.min;
  if (range.max != null) hi = range.max;
  if (lo >= hi) hi = lo + (hi === lo ? 1 : 0.001);

  return [lo, hi];
}

export function extentFromPoints(
  points: { x: number; y: number }[],
  key: "x" | "y"
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    const v = p[key];
    if (!Number.isFinite(v)) continue;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  if (!Number.isFinite(min)) return { min: 0, max: 1 };
  return { min, max };
}

export function stageBoundaryLines(
  categoryCount: number,
  stages: number
): MiniJmpGuideLine[] {
  if (categoryCount < 2 || stages < 2) return [];
  const perStage = categoryCount / stages;
  const lines: MiniJmpGuideLine[] = [];
  for (let s = 1; s < stages; s++) {
    lines.push({
      id: `stage-${s}-${categoryCount}`,
      position: s * perStage - 0.5,
      label: `Stage ${s + 1}`,
      color: GUIDE_LINE_COLOR_PRESETS[(s - 1) % GUIDE_LINE_COLOR_PRESETS.length]!.color,
    });
  }
  return lines;
}

export function newGuideLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
