import { getNumericValue } from "./mini-jmp-parser";
import type { MiniJmpSummaryStats } from "./mini-jmp-types";

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base]! + rest * (sorted[base + 1]! - sorted[base]!);
  }
  return sorted[base]!;
}

export function computeSummaryStats(
  rows: Record<string, string>[],
  column: string | null
): MiniJmpSummaryStats | null {
  if (!column) return null;

  const totalRows = rows.length;
  const values = rows
    .map((r) => getNumericValue(r, column))
    .filter((v): v is number => v != null);

  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const count = values.length;
  const missingCount = totalRows - count;
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / count;
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);

  return {
    count,
    missingCount,
    mean,
    median,
    min,
    max,
    range: max - min,
    stdDev,
    q1,
    q3,
    iqr: q3 - q1,
  };
}

export function formatStat(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}
