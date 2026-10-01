import type { SummaryStatistic } from "@shared/schemas/types";
import type { LineSortOrder } from "@shared/schemas/types";
import { summarizeValues } from "./pointsAggregate";

export type LinePoint = {
  xKey: string;
  xValue: number | string;
  yValue: number;
  sortKey: number;
};

export type AggregatedLineDatum = {
  value: [number | string, number];
  xLabel: string;
  yLabel: string;
};

/**
 * Build one Y per X category (JMP Line + Summary Statistic).
 * Avoids vertical zig-zags from connecting multiple rows that share the same X.
 */
export function buildAggregatedLinePoints(
  rows: Array<{
    xKey: string;
    xValue: number | string;
    yValue: number;
    sortKey: number;
    rowOrder: number;
  }>,
  summaryStatistic: SummaryStatistic,
  sortOrder: LineSortOrder
): AggregatedLineDatum[] {
  if (rows.length === 0) return [];

  // Row order without aggregation: connect in data order (may zig-zag if duplicate X)
  if (summaryStatistic === "none" && sortOrder === "rowOrder") {
    const ordered = [...rows].sort((a, b) => a.rowOrder - b.rowOrder);
    return ordered.map((r) => ({
      value: [r.xValue, r.yValue] as [number | string, number],
      xLabel: String(r.xKey),
      yLabel: String(r.yValue),
    }));
  }

  const buckets = new Map<
    string,
    { xValue: number | string; sortKey: number; firstRow: number; ys: number[] }
  >();
  const keyOrder: string[] = [];

  for (const r of rows) {
    let b = buckets.get(r.xKey);
    if (!b) {
      b = {
        xValue: r.xValue,
        sortKey: r.sortKey,
        firstRow: r.rowOrder,
        ys: [],
      };
      buckets.set(r.xKey, b);
      keyOrder.push(r.xKey);
    }
    b.ys.push(r.yValue);
  }

  let keys = [...keyOrder];
  if (sortOrder === "xAsc") {
    keys.sort((a, b) => {
      const ba = buckets.get(a)!;
      const bb = buckets.get(b)!;
      if (ba.sortKey !== bb.sortKey) return ba.sortKey - bb.sortKey;
      return String(ba.xValue).localeCompare(String(bb.xValue));
    });
  } else if (sortOrder === "xDesc") {
    keys.sort((a, b) => {
      const ba = buckets.get(a)!;
      const bb = buckets.get(b)!;
      if (ba.sortKey !== bb.sortKey) return bb.sortKey - ba.sortKey;
      return String(bb.xValue).localeCompare(String(ba.xValue));
    });
  } else {
    keys.sort((a, b) => buckets.get(a)!.firstRow - buckets.get(b)!.firstRow);
  }

  const out: AggregatedLineDatum[] = [];
  const stat = summaryStatistic === "none" ? "mean" : summaryStatistic;
  for (const k of keys) {
    const b = buckets.get(k)!;
    const y = summarizeValues(b.ys, stat);
    if (y == null || !Number.isFinite(y)) continue;
    out.push({
      value: [b.xValue, y],
      xLabel: String(b.xValue),
      yLabel: String(y),
    });
  }
  return out;
}

export function cellSeriesKey(value: unknown): string {
  if (value == null) return "(Missing)";
  if (typeof value === "string") {
    const t = value.trim();
    return t.length === 0 ? "(Missing)" : t;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value);
}
