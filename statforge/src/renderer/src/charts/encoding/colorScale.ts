import type { CellValue, ColumnMeta, Dataset } from "@shared/schemas/types";
import { naturalSortStrings } from "@renderer/utils/naturalSort";
import { isContinuousModeling, type GraphIssue } from "./overlay";

export type ColorScale =
  | {
      kind: "discrete";
      colors: Map<string, string>;
      order: string[];
    }
  | {
      kind: "continuous";
      min: number;
      max: number;
      colorStops: Array<[number, string]>;
    };

/**
 * Highly separable qualitative palette (12). Avoids near-duplicate blues/oranges
 * that made SerialNumber lines look "mismatched" with the legend.
 */
export const DISCRETE_PALETTE = [
  "#1f77b4", // blue
  "#ff7f0e", // orange
  "#2ca02c", // green
  "#d62728", // red
  "#9467bd", // purple
  "#8c564b", // brown
  "#e377c2", // pink
  "#17becf", // cyan
  "#bcbd22", // olive
  "#7f7f7f", // gray
  "#aec7e8", // light blue
  "#ffbb78", // light orange
] as const;

const CONTINUOUS_STOPS: Array<[number, string]> = [
  [0, "#313695"],
  [0.25, "#74add1"],
  [0.5, "#ffffbf"],
  [0.75, "#f46d43"],
  [1, "#a50026"],
];

/** Single canonical key used by Color scale, Line series split, and legend. */
export function colorCategoryKey(value: CellValue | string | unknown): string {
  if (value == null) return "(Missing)";
  if (typeof value === "string") {
    const t = value.trim();
    return t.length === 0 ? "(Missing)" : t;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value);
}

function toNumber(value: CellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    return [
      Number.parseInt(h.slice(0, 2), 16),
      Number.parseInt(h.slice(2, 4), 16),
      Number.parseInt(h.slice(4, 6), 16),
    ] as const;
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export function createColorScale(
  dataset: Dataset,
  column: ColumnMeta | null
): { scale: ColorScale | null; issues: GraphIssue[] } {
  const issues: GraphIssue[] = [];
  if (!column) return { scale: null, issues };

  const values = dataset.columnsData[column.id] ?? [];

  if (isContinuousModeling(column) && column.dataType !== "boolean") {
    const nums = values
      .map(toNumber)
      .filter((n): n is number => n != null);
    if (nums.length === 0) {
      issues.push({
        level: "warning",
        message: `Color column "${column.name}" has no numeric values.`,
      });
      return { scale: null, issues };
    }
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    if (min === max) {
      issues.push({
        level: "info",
        message: `Color domain for "${column.name}" is constant; using a single color.`,
      });
    }
    return {
      scale: {
        kind: "continuous",
        min,
        max: max === min ? min + 1 : max,
        colorStops: CONTINUOUS_STOPS,
      },
      issues,
    };
  }

  const seen = new Set<string>();
  for (const v of values) {
    seen.add(colorCategoryKey(v));
  }
  // Stable, user-visible order — same order as ColorLegendPanel
  const order = naturalSortStrings(Array.from(seen));
  const colors = new Map<string, string>();
  order.forEach((key, i) => {
    colors.set(key, DISCRETE_PALETTE[i % DISCRETE_PALETTE.length] as string);
  });
  return { scale: { kind: "discrete", colors, order }, issues };
}

/** Lookup by raw cell or by already-canonical category key. */
export function resolveColor(
  scale: ColorScale | null,
  value: CellValue | string,
  fallback: string = DISCRETE_PALETTE[0]
): string {
  if (!scale) return fallback;
  if (scale.kind === "discrete") {
    const key = colorCategoryKey(value);
    return scale.colors.get(key) ?? fallback;
  }
  const n = toNumber(typeof value === "string" ? value : value);
  if (n == null) return "#9aa0a6";
  const t = (n - scale.min) / (scale.max - scale.min);
  const clamped = Math.min(1, Math.max(0, t));
  const stops = scale.colorStops;
  for (let i = 0; i < stops.length - 1; i += 1) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const local = (clamped - t0) / (t1 - t0 || 1);
      return lerpColor(c0, c1, local);
    }
  }
  return stops[stops.length - 1][1];
}

/** Discrete scale color for a category key — legend and series must use this. */
export function resolveDiscreteColor(
  scale: ColorScale | null,
  categoryKey: string,
  fallback: string = DISCRETE_PALETTE[0]
): string {
  if (!scale || scale.kind !== "discrete") return fallback;
  return scale.colors.get(categoryKey) ?? fallback;
}
