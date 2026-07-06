import type { GrrChartPoint } from "./grr-chart-data";

/**
 * 차트 축 범위: 데이터 min/max와 Spec(LSL/USL)을 모두 포함
 * graphMin = min(dataMin, lowerLimit)
 * graphMax = max(dataMax, upperLimit)
 */
export function computeChartDomain(
  points: GrrChartPoint[],
  lsl: number | null,
  usl: number | null,
  paddingRatio = 0.04
): [number, number] {
  if (points.length === 0) {
    if (lsl !== null && usl !== null) return [lsl, usl];
    return [0, 1];
  }

  const dataVals = points.flatMap((p) => [
    p.x,
    p.y,
    p.ymin,
    p.ymax,
    p.otherMin,
    p.otherMax,
    p.pseudoGolden,
  ]);

  let minV = Math.min(...dataVals);
  let maxV = Math.max(...dataVals);

  if (lsl !== null) minV = Math.min(minV, lsl);
  if (usl !== null) maxV = Math.max(maxV, usl);

  if (minV === maxV) {
    const pad = Math.abs(minV) * 0.1 || 1;
    return [minV - pad, maxV + pad];
  }

  const pad = (maxV - minV) * paddingRatio;
  return [minV - pad, maxV + pad];
}

/** 도메인 중심 기준으로 범위 확대/축소 (factor 1 = 유지, <1 Y축 확대, >1 Y축 축소) */
export function scaleDomainAroundCenter(
  domain: [number, number],
  factor: number
): [number, number] {
  if (!Number.isFinite(factor) || factor <= 0) return domain;
  const [lo, hi] = domain;
  const center = (lo + hi) / 2;
  const half = (hi - lo) / 2;
  return [center - half * factor, center + half * factor];
}

/** 분석 결과 숫자 배열만으로 차트 도메인 계산 */
export function computeChartDomainFromValues(
  values: number[],
  lsl: number | null,
  usl: number | null,
  paddingRatio = 0.04
): [number, number] {
  if (values.length === 0) {
    if (lsl !== null && usl !== null) return [lsl, usl];
    return [0, 1];
  }
  let minV = Math.min(...values);
  let maxV = Math.max(...values);
  if (lsl !== null) minV = Math.min(minV, lsl);
  if (usl !== null) maxV = Math.max(maxV, usl);
  if (minV === maxV) {
    const pad = Math.abs(minV) * 0.1 || 1;
    return [minV - pad, maxV + pad];
  }
  const pad = (maxV - minV) * paddingRatio;
  return [minV - pad, maxV + pad];
}
