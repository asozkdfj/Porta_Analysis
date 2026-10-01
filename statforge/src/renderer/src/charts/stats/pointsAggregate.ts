import type {
  ErrorInterval,
  IntervalStyle,
  JitterMode,
  SummaryStatistic,
} from "@shared/schemas/types";

function sorted(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function quantile(s: number[], p: number): number {
  if (s.length === 0) return NaN;
  if (s.length === 1) return s[0]!;
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo]!;
  const t = idx - lo;
  return s[lo]! * (1 - t) + s[hi]! * t;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sampleStdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values);
  const ss = values.reduce((a, v) => a + (v - m) ** 2, 0);
  return Math.sqrt(ss / (values.length - 1));
}

function medianAbsDev(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = sorted(values);
  const med = quantile(s, 0.5);
  const abs = sorted(values.map((v) => Math.abs(v - med)));
  return quantile(abs, 0.5);
}

/** Normalize legacy Line aliases to JMP Points names. */
export function normalizeSummaryStat(stat: SummaryStatistic): SummaryStatistic {
  if (stat === "count") return "n";
  if (stat === "minimum") return "min";
  if (stat === "maximum") return "max";
  return stat;
}

export function summarizeValues(
  values: number[],
  stat: SummaryStatistic,
  context?: { allValuesSum?: number; factorSum?: number; grandSum?: number }
): number | null {
  if (values.length === 0) return null;
  const kind = normalizeSummaryStat(stat);
  const s = sorted(values);
  switch (kind) {
    case "none":
      return values[0] ?? null;
    case "n":
      return values.length;
    case "mean":
      return mean(values);
    case "median":
      return quantile(s, 0.5);
    case "geometricMean": {
      if (values.some((v) => v <= 0)) return null;
      const logSum = values.reduce((a, v) => a + Math.log(v), 0);
      return Math.exp(logSum / values.length);
    }
    case "min":
      return s[0]!;
    case "max":
      return s[s.length - 1]!;
    case "range":
      return s[s.length - 1]! - s[0]!;
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "cumulativeSum":
      return values.reduce((a, b) => a + b, 0);
    case "pctTotal": {
      const tot = context?.allValuesSum;
      if (tot == null || tot === 0) return null;
      return (100 * values.reduce((a, b) => a + b, 0)) / tot;
    }
    case "pctFactor": {
      const tot = context?.factorSum;
      if (tot == null || tot === 0) return null;
      return (100 * values.reduce((a, b) => a + b, 0)) / tot;
    }
    case "pctGrandTotal": {
      const tot = context?.grandSum;
      if (tot == null || tot === 0) return null;
      return (100 * values.reduce((a, b) => a + b, 0)) / tot;
    }
    case "stdDev":
      return sampleStdDev(values);
    case "variance": {
      const sd = sampleStdDev(values);
      return sd == null ? null : sd * sd;
    }
    case "stdErr": {
      const sd = sampleStdDev(values);
      return sd == null ? null : sd / Math.sqrt(values.length);
    }
    case "iqr":
      return quantile(s, 0.75) - quantile(s, 0.25);
    case "mad":
      return medianAbsDev(values);
    case "q1":
      return quantile(s, 0.25);
    case "q3":
      return quantile(s, 0.75);
    default:
      return values[0] ?? null;
  }
}

export type ErrorBand = { lo: number; hi: number };

/**
 * Error interval around a center (usually the summary statistic).
 * `auto` → Standard Error when n≥2, else None.
 */
export function computeErrorInterval(
  values: number[],
  center: number,
  mode: ErrorInterval
): ErrorBand | null {
  if (values.length === 0 || !Number.isFinite(center)) return null;
  const resolved: ErrorInterval =
    mode === "auto" ? (values.length >= 2 ? "standardError" : "none") : mode;
  if (resolved === "none" || resolved === "customInterval" || resolved === "twoWayInterval") {
    return null;
  }

  const s = sorted(values);
  switch (resolved) {
    case "range":
      return { lo: s[0]!, hi: s[s.length - 1]! };
    case "iqr":
      return { lo: quantile(s, 0.25), hi: quantile(s, 0.75) };
    case "standardError": {
      const sd = sampleStdDev(values);
      if (sd == null) return null;
      const se = sd / Math.sqrt(values.length);
      return { lo: center - se, hi: center + se };
    }
    case "standardDeviation": {
      const sd = sampleStdDev(values);
      if (sd == null) return null;
      return { lo: center - sd, hi: center + sd };
    }
    case "confidenceInterval": {
      // Approx 95% CI for the mean (normal): ±1.96 SE
      const sd = sampleStdDev(values);
      if (sd == null) return null;
      const se = sd / Math.sqrt(values.length);
      const z = 1.96;
      return { lo: center - z * se, hi: center + z * se };
    }
    case "mad": {
      const mad = medianAbsDev(values);
      if (mad == null) return null;
      return { lo: center - mad, hi: center + mad };
    }
    default:
      return null;
  }
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  // Box-Muller
  const u = Math.max(1e-12, rand());
  const v = Math.max(1e-12, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function normalizeJitter(mode: JitterMode): JitterMode {
  if (mode === "random" || mode === "uniform") return "randomUniform";
  if (mode === "normal") return "randomNormal";
  if (mode === "centered") return "centeredGrid";
  return mode;
}

/**
 * Horizontal jitter offsets in category units (about ±jitterLimit).
 * Group by xKey so overlapping points fan out.
 */
export function computeJitterOffsets(
  xKeys: string[],
  mode: JitterMode,
  jitterLimit: number,
  seed = 1
): number[] {
  const limit = Math.max(0, Math.min(1, jitterLimit));
  const kind = normalizeJitter(mode);
  const n = xKeys.length;
  const out = new Array<number>(n).fill(0);
  if (kind === "none" || limit === 0 || n === 0) return out;

  const groups = new Map<string, number[]>();
  xKeys.forEach((k, i) => {
    const list = groups.get(k);
    if (list) list.push(i);
    else groups.set(k, [i]);
  });

  // auto: only jitter keys that have collisions
  let g = 0;
  for (const [, idxs] of Array.from(groups.entries())) {
    const collide = idxs.length > 1;
    if (!collide) {
      g += 1;
      continue;
    }
    const rand = mulberry32(seed + g * 9973 + idxs.length);
    const m = idxs.length;
    const effective =
      kind === "auto" ? "packed" : kind === "densityRandom" ? "randomUniform" : kind;

    for (let j = 0; j < m; j += 1) {
      const i = idxs[j]!;
      let offset = 0;
      switch (effective) {
        case "randomUniform":
          offset = (rand() * 2 - 1) * limit;
          break;
        case "randomNormal":
          offset = Math.max(-limit, Math.min(limit, gaussian(rand) * (limit / 2)));
          break;
        case "packed":
        case "centeredGrid": {
          offset = m === 1 ? 0 : -limit + (2 * limit * j) / (m - 1);
          break;
        }
        case "positiveGrid":
          offset = m === 1 ? 0 : (limit * j) / (m - 1);
          break;
        default:
          offset = (rand() * 2 - 1) * limit;
      }
      out[i] = offset;
    }
    g += 1;
  }
  return out;
}

export type AggregatedPoint = {
  xKey: string;
  xValue: number | string;
  yValue: number;
  lo?: number;
  hi?: number;
  rowIndex: number;
  count: number;
};

/** Summaries that live on the same Y scale as the raw response (location). */
const LOCATION_SUMMARIES = new Set([
  "mean",
  "median",
  "min",
  "minimum",
  "max",
  "maximum",
  "q1",
  "q3",
]);

/** True when Points Y values stay on the original measurement scale. */
export function pointsSummaryUsesRawYScale(stat: SummaryStatistic): boolean {
  const kind = normalizeSummaryStat(stat);
  return kind === "none" || LOCATION_SUMMARIES.has(kind);
}
/**
 * Aggregate raw rows by X for Points + Summary Statistic (JMP-style).
 * When summary is `none`, returns one point per input row (no aggregation).
 * Error intervals only apply to location summaries (Mean/Median/…);
 * N / Sum / Std Dev etc. skip intervals so the Y scale stays coherent.
 */
export function buildPointsWithSummary(
  rows: Array<{
    xKey: string;
    xValue: number | string;
    yValue: number;
    rowIndex: number;
  }>,
  summaryStatistic: SummaryStatistic,
  errorInterval: ErrorInterval,
  _intervalStyle: IntervalStyle
): AggregatedPoint[] {
  if (rows.length === 0) return [];
  const kind = normalizeSummaryStat(summaryStatistic);

  if (kind === "none") {
    return rows.map((r) => ({
      xKey: r.xKey,
      xValue: r.xValue,
      yValue: r.yValue,
      rowIndex: r.rowIndex,
      count: 1,
    }));
  }

  const buckets = new Map<
    string,
    { xValue: number | string; ys: number[]; firstRow: number }
  >();
  const order: string[] = [];
  let grandSum = 0;
  for (const r of rows) {
    grandSum += r.yValue;
    let b = buckets.get(r.xKey);
    if (!b) {
      b = { xValue: r.xValue, ys: [], firstRow: r.rowIndex };
      buckets.set(r.xKey, b);
      order.push(r.xKey);
    }
    b.ys.push(r.yValue);
  }

  const allowInterval =
    errorInterval !== "none" && LOCATION_SUMMARIES.has(kind);

  const out: AggregatedPoint[] = [];
  let running = 0;
  for (const k of order) {
    const b = buckets.get(k)!;
    const ctx = {
      allValuesSum: grandSum,
      factorSum: grandSum,
      grandSum,
    };
    const y =
      kind === "cumulativeSum"
        ? (running += b.ys.reduce((a, v) => a + v, 0))
        : summarizeValues(b.ys, kind, ctx);
    if (y == null || !Number.isFinite(y)) continue;

    const band = allowInterval
      ? computeErrorInterval(b.ys, y, errorInterval)
      : null;

    out.push({
      xKey: k,
      xValue: b.xValue,
      yValue: y,
      lo:
        band && Number.isFinite(band.lo) && Number.isFinite(band.hi)
          ? band.lo
          : undefined,
      hi:
        band && Number.isFinite(band.lo) && Number.isFinite(band.hi)
          ? band.hi
          : undefined,
      rowIndex: b.firstRow,
      count: b.ys.length,
    });
  }
  return out;
}
