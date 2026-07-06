import { getNumericValue } from "./mini-jmp-parser";
import type { MiniJmpSummaryStats } from "./mini-jmp-types";

export function computeSummaryStats(
  rows: Record<string, string>[],
  column: string | null
): MiniJmpSummaryStats | null {
  if (!column) return null;

  const values = rows
    .map((r) => getNumericValue(r, column))
    .filter((v): v is number => v != null);

  if (values.length === 0) return null;

  const count = values.length;
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / count;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);

  return { count, mean, min, max, stdDev };
}

export function formatStat(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}
