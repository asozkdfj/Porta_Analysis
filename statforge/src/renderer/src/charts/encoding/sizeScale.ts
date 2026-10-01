import type { CellValue, ColumnMeta, Dataset } from "@shared/schemas/types";
import type { GraphIssue } from "./overlay";

export type SizeScale = {
  minValue: number;
  maxValue: number;
  minPx: number;
  maxPx: number;
  scaleType: "linear" | "sqrt" | "log";
};

function toNumber(value: CellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function createSizeScale(
  dataset: Dataset,
  column: ColumnMeta | null,
  options: { minPx?: number; maxPx?: number; scaleType?: SizeScale["scaleType"] } = {}
): { scale: SizeScale | null; issues: GraphIssue[] } {
  const issues: GraphIssue[] = [];
  if (!column) return { scale: null, issues };

  const values = (dataset.columnsData[column.id] ?? [])
    .map(toNumber)
    .filter((n): n is number => n != null);

  if (values.length === 0) {
    issues.push({
      level: "warning",
      message: `Size column "${column.name}" has no numeric values.`,
    });
    return { scale: null, issues };
  }

  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);
  if (minValue < 0) {
    issues.push({
      level: "warning",
      message: `Size column "${column.name}" has negative values; clamping to 0.`,
    });
    minValue = 0;
  }
  const positives = values.map((v) => Math.max(0, v));
  minValue = Math.min(...positives);
  maxValue = Math.max(...positives);

  return {
    scale: {
      minValue,
      maxValue: maxValue === minValue ? minValue + 1 : maxValue,
      minPx: options.minPx ?? 4,
      maxPx: options.maxPx ?? 24,
      scaleType: options.scaleType ?? "sqrt",
    },
    issues,
  };
}

/** Map value → marker pixel size (area-proportional by default via sqrt). */
export function resolveSize(
  scale: SizeScale | null,
  value: CellValue,
  fallback: number
): number {
  if (!scale) return fallback;
  const raw = toNumber(value);
  if (raw == null) return fallback;
  const v = Math.max(0, raw);
  const { minValue, maxValue, minPx, maxPx, scaleType } = scale;
  let t = (v - minValue) / (maxValue - minValue);
  t = Math.min(1, Math.max(0, t));
  if (scaleType === "sqrt") t = Math.sqrt(t);
  if (scaleType === "log") {
    const lo = Math.log1p(minValue);
    const hi = Math.log1p(maxValue);
    t = hi === lo ? 0.5 : (Math.log1p(v) - lo) / (hi - lo);
    t = Math.min(1, Math.max(0, t));
  }
  return minPx + (maxPx - minPx) * t;
}
