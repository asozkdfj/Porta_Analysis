import type { ReferenceLine } from "@shared/schemas/axis";
import { parseAxisBound } from "./validateAxisScale";

export type AutoRangeOptions = {
  includeZero?: boolean;
  niceScale?: boolean;
  paddingRatio?: number;
  includeReferenceLines?: boolean;
  referenceLines?: ReferenceLine[];
  /** Extra numeric extents (interval, bands, etc.) */
  extraValues?: number[];
};

export type AutoRangeResult = {
  minimum: number;
  maximum: number;
};

/** Nice round range similar to d3-scale nice. */
export function calculateNiceRange(min: number, max: number): AutoRangeResult {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { minimum: 0, maximum: 1 };
  }
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    return { minimum: min - pad, maximum: max + pad };
  }
  const span = max - min;
  const step = niceStep(span / 5);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  return { minimum: niceMin, maximum: niceMax };
}

function niceStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const exp = Math.floor(Math.log10(rough));
  const f = rough / 10 ** exp;
  let nf: number;
  if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 5) nf = 5;
  else nf = 10;
  return nf * 10 ** exp;
}

function collectRefValues(lines: ReferenceLine[]): number[] {
  const out: number[] = [];
  for (const line of lines) {
    if (!line.visible) continue;
    if (line.type === "line") {
      const v = parseAxisBound(line.value ?? null);
      if (v != null) out.push(v);
    } else {
      const a = parseAxisBound(line.startValue ?? null);
      const b = parseAxisBound(line.endValue ?? null);
      if (a != null) out.push(a);
      if (b != null) out.push(b);
    }
  }
  return out;
}

/**
 * Compute auto axis range from data values + optional extras / reference lines.
 */
export function calculateAutoRange(
  dataValues: number[],
  options: AutoRangeOptions = {}
): AutoRangeResult {
  const values = [
    ...dataValues.filter((v) => Number.isFinite(v)),
    ...(options.extraValues ?? []).filter((v) => Number.isFinite(v)),
  ];
  if (options.includeReferenceLines !== false && options.referenceLines) {
    values.push(...collectRefValues(options.referenceLines));
  }

  let min: number;
  let max: number;
  if (values.length === 0) {
    min = 0;
    max = 1;
  } else {
    min = Math.min(...values);
    max = Math.max(...values);
  }

  if (options.includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }

  const pad = options.paddingRatio ?? 0.05;
  if (min === max) {
    const base = Math.abs(min) || 1;
    min -= base * pad;
    max += base * pad;
  } else {
    const span = max - min;
    min -= span * pad;
    max += span * pad;
  }

  if (options.niceScale !== false) {
    return calculateNiceRange(min, max);
  }
  return { minimum: min, maximum: max };
}
