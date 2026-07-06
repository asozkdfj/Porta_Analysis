/**
 * GRR 통계 (GaiaStat2 정렬)
 *
 * PCT Error = avg_golden + grr_limit 기준 (ERS 미사용)
 * Bound = avg ± (grr_stdev × stdev)
 */

export function grrMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** 표본 표준편차 — 반복 Run stdev (n ≥ 2, Excel STDEV.S) */
export function grrSampleStdev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = grrMean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export interface SocketRunAggregate {
  socket: string;
  runs: number[];
  avg: number;
  stdev: number;
}

export function aggregateSocketRuns(
  measurements: { socket: string; mean: number }[]
): SocketRunAggregate[] {
  const bySocket = new Map<string, number[]>();
  for (const m of measurements) {
    if (!bySocket.has(m.socket)) bySocket.set(m.socket, []);
    bySocket.get(m.socket)!.push(m.mean);
  }
  return [...bySocket.entries()].map(([socket, runs]) => ({
    socket,
    runs,
    avg: grrMean(runs),
    stdev: grrSampleStdev(runs),
  }));
}

export function computePseudoGolden(socketAvgs: number[]): number {
  return grrMean(socketAvgs);
}

/**
 * GaiaStat2 가로 소켓 Range (의사 골든 축) — Config Spec 기준 (Show Info 동일)
 *
 * 소켓별 Test Result: bound_dn/up = avg ± (grr_stdev × stdev)
 * Criteria STD: criteriaStdev = STDEV.S(소켓 평균들)
 * specMargin = grr_stdev × criteriaStdev
 *
 * ymax (고정): min(max bound_up, 의사 골든 + specMargin)
 * ymin (대칭): 의사 골든 − specMargin
 */
export function computeSocketRangeBounds(
  perSocket: SocketRunAggregate[],
  grrLimit: number | null,
  grrStdev: number | null = null
): { ymin: number; ymax: number } {
  if (perSocket.length === 0) return { ymin: 0, ymax: 0 };

  const socketAvgs = perSocket.map((s) => s.avg);
  const pseudoGolden = grrMean(socketAvgs);
  const criteriaStdev = grrSampleStdev(socketAvgs);

  const specMargin =
    grrStdev !== null && grrStdev > 0 && criteriaStdev > 0
      ? grrStdev * criteriaStdev
      : 0;

  let minBoundDn = Infinity;
  let maxBoundUp = -Infinity;
  for (const s of perSocket) {
    const { boundDn, boundUp } = computeTestResultBounds(
      s.avg,
      s.stdev,
      grrStdev
    );
    minBoundDn = Math.min(minBoundDn, boundDn);
    maxBoundUp = Math.max(maxBoundUp, boundUp);
  }

  const ymax =
    specMargin > 0
      ? Math.min(maxBoundUp, pseudoGolden + specMargin)
      : maxBoundUp;
  const ymin = specMargin > 0 ? pseudoGolden - specMargin : minBoundDn;

  return { ymin, ymax };
}

/** bound_up/dn = avg ± (grr_stdev × stdev) */
export function computeTestResultBounds(
  avg: number,
  measuredStdev: number,
  grrStdev: number | null
): { boundUp: number; boundDn: number; boundDelta: number } {
  const boundDelta =
    grrStdev !== null && grrStdev > 0 ? grrStdev * measuredStdev : 0;
  return {
    boundDelta,
    boundUp: avg + boundDelta,
    boundDn: avg - boundDelta,
  };
}

/**
 * PCT_ERR — Golden + GRR Limit 기준
 * pct_err_upper = ((bound_up - avg_golden) / grr_limit) × 100
 * pct_err_lower = ((bound_dn - avg_golden) / grr_limit) × 100
 */
export function computePctErrFromGoldenLimit(
  boundUp: number,
  boundDn: number,
  avgGolden: number,
  grrLimit: number
): { pctErrUpper: number; pctErrLower: number } {
  return {
    pctErrUpper: ((boundUp - avgGolden) / grrLimit) * 100,
    pctErrLower: ((boundDn - avgGolden) / grrLimit) * 100,
  };
}

export function judgeSerialPctErrPass(
  pctErrUpper: number,
  pctErrLower: number
): boolean {
  return pctErrUpper <= 100 && pctErrLower >= -100;
}

export type GrrPctErrJudgment = "PASS" | "FAIL" | "CHECK";

/** Serial GRR 판정 — avg_golden + grr_limit PCT Error 기준 */
export function judgeSerialGrrByPctErr(
  referenceValue: number,
  referenceStdev: number,
  avgGolden: number,
  grrStdev: number | null,
  grrLimit: number | null
): GrrPctErrJudgment {
  if (grrLimit === null || grrLimit <= 0) return "CHECK";

  const { boundUp, boundDn } = computeTestResultBounds(
    referenceValue,
    referenceStdev,
    grrStdev
  );
  const { pctErrUpper, pctErrLower } = computePctErrFromGoldenLimit(
    boundUp,
    boundDn,
    avgGolden,
    grrLimit
  );
  return judgeSerialPctErrPass(pctErrUpper, pctErrLower) ? "PASS" : "FAIL";
}

export function judgeGroupPctErrPass(
  pctErrMax: number,
  pctErrMin: number
): boolean {
  return pctErrMax <= 100 && pctErrMin >= -100;
}

/** GaiaStat2 검증용 Reference 예시 */
export const GRR_PCT_ERR_REFERENCE_EXAMPLE = {
  avg: 19.933183,
  stdev: 0.014247,
  grrStdev: 3,
  avgGolden: 19.920115,
  grrLimit: 0.8,
  expectedBoundUp: 19.975923,
  expectedBoundDn: 19.890442,
  expectedPctErrUpper: 6.976047,
  expectedPctErrLower: -3.70906,
} as const;

export const GRR_PCT_ERR_PREVIOUS_FORMULA =
  "pct_err = ((bound - spec_center) / spec_half_range) × 100  [ERS 기반 — 제거됨]";

export const GRR_PCT_ERR_CURRENT_FORMULA =
  "pct_err_upper = ((bound_up - avg_golden) / grr_limit) × 100; " +
  "pct_err_lower = ((bound_dn - avg_golden) / grr_limit) × 100";

export interface GrrPctErrReferenceVerification {
  expected: {
    boundUp: number;
    boundDn: number;
    pctErrUpper: number;
    pctErrLower: number;
  };
  actual: {
    boundUp: number;
    boundDn: number;
    pctErrUpper: number;
    pctErrLower: number;
  };
  match: boolean;
  previousFormula: string;
  currentFormula: string;
}

export function verifyGrrPctErrReferenceExample(
  tolerance = 0.001
): GrrPctErrReferenceVerification {
  const ex = GRR_PCT_ERR_REFERENCE_EXAMPLE;
  const { boundUp, boundDn } = computeTestResultBounds(
    ex.avg,
    ex.stdev,
    ex.grrStdev
  );
  const pct = computePctErrFromGoldenLimit(
    boundUp,
    boundDn,
    ex.avgGolden,
    ex.grrLimit
  );

  const match =
    Math.abs(boundUp - ex.expectedBoundUp) < 0.001 &&
    Math.abs(boundDn - ex.expectedBoundDn) < 0.001 &&
    Math.abs(pct.pctErrUpper - ex.expectedPctErrUpper) < tolerance &&
    Math.abs(pct.pctErrLower - ex.expectedPctErrLower) < tolerance;

  return {
    expected: {
      boundUp: ex.expectedBoundUp,
      boundDn: ex.expectedBoundDn,
      pctErrUpper: ex.expectedPctErrUpper,
      pctErrLower: ex.expectedPctErrLower,
    },
    actual: {
      boundUp,
      boundDn,
      pctErrUpper: pct.pctErrUpper,
      pctErrLower: pct.pctErrLower,
    },
    match,
    previousFormula: GRR_PCT_ERR_PREVIOUS_FORMULA,
    currentFormula: GRR_PCT_ERR_CURRENT_FORMULA,
  };
}
