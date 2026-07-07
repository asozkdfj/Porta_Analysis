import { getCellValue, getNumericValue } from "./mini-jmp-parser";
import type { MiniJmpFitStats, MiniJmpScatterPoint } from "./mini-jmp-types";

export function computeFitYByX(points: MiniJmpScatterPoint[]): MiniJmpFitStats {
  const pts = points.filter(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y)
  );
  const n = pts.length;
  if (n < 2) {
    return {
      correlation: null,
      rSquared: null,
      slope: null,
      intercept: null,
      pointCount: n,
    };
  }

  const sumX = pts.reduce((s, p) => s + p.x, 0);
  const sumY = pts.reduce((s, p) => s + p.y, 0);
  const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = pts.reduce((s, p) => s + p.x * p.x, 0);
  const sumYY = pts.reduce((s, p) => s + p.y * p.y, 0);

  const denom = n * sumXX - sumX * sumX;
  const denomY = n * sumYY - sumY * sumY;

  let slope: number | null = null;
  let intercept: number | null = null;
  if (Math.abs(denom) > 1e-12) {
    slope = (n * sumXY - sumX * sumY) / denom;
    intercept = (sumY - slope * sumX) / n;
  }

  let correlation: number | null = null;
  if (denom > 0 && denomY > 0) {
    correlation =
      (n * sumXY - sumX * sumY) / Math.sqrt(denom * denomY);
  }

  return {
    correlation,
    rSquared: correlation != null ? correlation * correlation : null,
    slope,
    intercept,
    pointCount: n,
  };
}

export function computeCategoryFrequencies(
  rows: Record<string, string>[],
  column: string,
  limit = 30
): { category: string; count: number; percent: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const v = getCellValue(row, column) || "(empty)";
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const total = rows.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, count]) => ({
      category,
      count,
      percent: Math.round((count / total) * 1000) / 10,
    }));
}

export function rowMatchesFilter(
  row: Record<string, string>,
  filter: {
    column: string;
    operator: string;
    value: string;
    value2?: string;
  }
): boolean {
  const raw = getCellValue(row, filter.column);
  const op = filter.operator || "equals";

  if (op === "equals") return raw === filter.value;
  if (op === "contains") {
    return raw.toLowerCase().includes(filter.value.toLowerCase());
  }
  if (op === "notContains") {
    return !raw.toLowerCase().includes(filter.value.toLowerCase());
  }

  const num = getNumericValue(row, filter.column);
  const v = Number(filter.value);
  const v2 = filter.value2 != null ? Number(filter.value2) : null;

  if (op === "gte") return num != null && num >= v;
  if (op === "lte") return num != null && num <= v;
  if (op === "between") {
    return num != null && v2 != null && num >= v && num <= v2;
  }
  return raw === filter.value;
}
