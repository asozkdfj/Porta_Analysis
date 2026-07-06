import { getSnColor } from "./chart-colors";
import { isFullAxisSpec } from "./gaia-spec-config";
import { socketsMatch } from "./golden-socket-config";
import { computeTestResultBounds } from "./grr-stats";
import { repeatabilityErrorBarOffsets } from "./grr-repeatability";
import type { GaiaAnalysisResult, MetricSpecLimits, PassFail, SerialGrrResult, SpecSource } from "./types";

export interface GrrChartPoint {
  serial: string;
  /** 의사 골든 → X */
  x: number;
  /** 기준 소켓 평균 → Y */
  y: number;
  ymin: number;
  ymax: number;
  otherMin: number;
  otherMax: number;
  /** 소켓 전체 Range 가로 ErrorBar (의사 골든 축) */
  socketRangeX: [number, number];
  /** Repeatability 세로 ErrorBar (기준 소켓 Y축) — bound_up / bound_dn */
  repeatabilityY: [number, number];
  avg: number;
  stdev: number;
  grrStdev: number | null;
  boundUp: number;
  boundDn: number;
  repeatabilityRange: number;
  /** 세로 Error Bar가 ERS 스펙 밖이면 true (FAIL) */
  repeatabilityOutOfSpec: boolean;
  color: string;
  status: PassFail;
  referenceSocket: string;
  range: number;
  otherRange: number;
  pseudoGolden: number;
  referenceValue: number;
  socketMeans: { socket: string; mean: number }[];
}

export interface GrrChartModel {
  points: GrrChartPoint[];
  /** Spec Lower~Upper 고정 축 (GaiaStat2 방식) */
  plotDomain: [number, number];
  spec: MetricSpecLimits;
  testLimitBand: number;
}

function computeOtherRange(
  socketMeans: SerialGrrResult["socketMeans"],
  referenceSocket: string
): { otherMin: number; otherMax: number } {
  const others = socketMeans
    .filter((s) => !socketsMatch(s.socket, referenceSocket))
    .map((s) => s.mean);

  if (others.length === 0) {
    const ref =
      socketMeans.find((s) => socketsMatch(s.socket, referenceSocket))?.mean ??
      0;
    return { otherMin: ref, otherMax: ref };
  }

  return {
    otherMin: Math.min(...others),
    otherMax: Math.max(...others),
  };
}

function applyXJitter(
  points: GrrChartPoint[],
  domain: [number, number]
): GrrChartPoint[] {
  const span = domain[1] - domain[0] || 1;
  const jitterUnit = span * 0.015;

  const buckets = new Map<string, GrrChartPoint[]>();
  for (const p of points) {
    const key = p.x.toFixed(4);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(p);
  }

  return points.map((p) => {
    const bucket = buckets.get(p.x.toFixed(4))!;
    if (bucket.length <= 1) return p;
    const idx = bucket.indexOf(p);
    const offset = (idx - (bucket.length - 1) / 2) * jitterUnit;
    return { ...p, x: p.x + offset };
  });
}

export function buildGrrChartModel(analysis: GaiaAnalysisResult): GrrChartModel {
  const spec = analysis.spec;
  const plotDomain: [number, number] = isFullAxisSpec(spec.lsl, spec.usl)
    ? analysis.axisDomain
    : analysis.chartDomain;

  const raw: GrrChartPoint[] = analysis.serials.map((s, i) => {
    const refValue = s.referenceValue;
    const golden = s.pseudoGolden;
    const { otherMin, otherMax } = computeOtherRange(s.socketMeans, s.referenceSocket);
    const grrStdev = spec.grrStdev;
    const { boundUp, boundDn } = computeTestResultBounds(
      refValue,
      s.referenceStdev,
      grrStdev
    );
    const repeatabilityRange = boundUp - boundDn;
    const lsl = spec.lsl;
    const usl = spec.usl;
    const repeatabilityOutOfSpec =
      (lsl !== null && boundDn < lsl) || (usl !== null && boundUp > usl);

    return {
      serial: s.serial,
      x: golden,
      y: refValue,
      ymin: s.ymin,
      ymax: s.ymax,
      otherMin,
      otherMax,
      socketRangeX: [golden - s.ymin, s.ymax - golden],
      repeatabilityY: repeatabilityErrorBarOffsets(refValue, boundUp, boundDn),
      avg: refValue,
      stdev: s.referenceStdev,
      grrStdev,
      boundUp,
      boundDn,
      repeatabilityRange,
      repeatabilityOutOfSpec,
      color: getSnColor(i),
      status: s.status,
      referenceSocket: s.referenceSocket,
      range: s.range,
      otherRange: otherMax - otherMin,
      pseudoGolden: golden,
      referenceValue: refValue,
      socketMeans: s.socketMeans.map(({ socket, mean }) => ({ socket, mean })),
    };
  });

  const points = applyXJitter(raw, plotDomain);

  return {
    points,
    plotDomain,
    spec,
    testLimitBand: analysis.groupGrr?.testLimitBand ?? 0,
  };
}

export function buildGrrChartPoints(analysis: GaiaAnalysisResult): GrrChartPoint[] {
  return buildGrrChartModel(analysis).points;
}

export function formatSpecValue(value: number | null, digits = 4): string {
  if (value === null) return "—";
  return value.toFixed(digits);
}

export function warnSpecNotFound(metric: string, source: SpecSource): void {
  if (source === "none" || source === "fallback") {
    console.warn(`[WARN] Spec not found for metric: ${metric}`);
  }
}
