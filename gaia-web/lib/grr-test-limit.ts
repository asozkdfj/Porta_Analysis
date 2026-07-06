import type { PassFail, SerialGrrResult } from "./types";
import {
  computePctErrFromGoldenLimit,
  computeTestResultBounds,
} from "./grr-stats";

/**
 * GaiaStat2 GRR Spec 평행선 (y=x ± band)
 *
 * band = Config GRR Limit (절대값)
 * x = Lower ERS 일 때 y = Lower ERS ± GRR Limit
 */
export function computeGrrSpecBand(
  grrLimit: number | null,
  lsl: number,
  usl: number
): number {
  if (grrLimit !== null && grrLimit > 0) return grrLimit;
  return Math.max((usl - lsl) * 0.05, 0);
}

/** @deprecated GRR Limit는 절대값 — computeGrrSpecBand 사용 */
export function grrLimitToPercentFactor(grrLimit: number): number {
  return grrLimit < 0.15 ? grrLimit : grrLimit / 100;
}

export function computeTestLimitBand(params: {
  groupAvg: number;
  grrLimit: number | null;
  grrStdev: number | null;
  lsl: number;
  usl: number;
}): number {
  return computeGrrSpecBand(params.grrLimit, params.lsl, params.usl);
}

export interface GroupGrrStats {
  groupAvgGolden: number;
  groupAvg: number;
  groupAvgPercent: number;
  grrErrMax: number;
  grrErrMin: number;
  sampleCount: number;
  testLimitBand: number;
}

function safePercent(numerator: number, denominator: number): number {
  if (Math.abs(denominator) < 1e-12) return 0;
  return (numerator / denominator) * 100;
}

function serialPctErr(
  serial: SerialGrrResult,
  grrStdev: number | null,
  grrLimit: number | null
): { pctErrUpper: number; pctErrLower: number } | null {
  if (grrLimit === null || grrLimit <= 0) return null;

  const { boundUp, boundDn } = computeTestResultBounds(
    serial.referenceValue,
    serial.referenceStdev,
    grrStdev
  );
  return computePctErrFromGoldenLimit(
    boundUp,
    boundDn,
    serial.pseudoGolden,
    grrLimit
  );
}

export function computeGroupGrrStats(
  serials: SerialGrrResult[],
  grrLimit: number | null,
  grrStdev: number | null,
  lsl: number | null,
  usl: number | null,
  bandLsl?: number,
  bandUsl?: number
): GroupGrrStats | null {
  if (serials.length === 0) return null;

  const groupAvgGolden =
    serials.reduce((s, x) => s + x.pseudoGolden, 0) / serials.length;

  const groupAvg =
    serials.reduce((s, x) => s + x.referenceValue, 0) / serials.length;

  const refDeltas = serials.map((s) => s.referenceValue - s.pseudoGolden);
  const groupAvgPercent = safePercent(
    refDeltas.reduce((a, b) => a + b, 0) / serials.length,
    groupAvgGolden
  );

  const pctErrs = serials
    .map((s) => serialPctErr(s, grrStdev, grrLimit))
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const errHighs = pctErrs.map((p) => p.pctErrUpper);
  const errLows = pctErrs.map((p) => p.pctErrLower);

  const plotLsl = lsl ?? bandLsl ?? 0;
  const plotUsl = usl ?? bandUsl ?? plotLsl + 1;

  const testLimitBand = computeTestLimitBand({
    groupAvg: groupAvgGolden,
    grrLimit,
    grrStdev,
    lsl: plotLsl,
    usl: plotUsl,
  });

  return {
    groupAvgGolden,
    groupAvg,
    groupAvgPercent,
    grrErrMax: errHighs.length > 0 ? Math.max(...errHighs) : 0,
    grrErrMin: errLows.length > 0 ? Math.min(...errLows) : 0,
    sampleCount: serials.length,
    testLimitBand,
  };
}

/**
 * Test Limit 밴드 판정 (그래프 빨간 평행선 = pseudoGolden ± band)
 * 소켓 Range(ymin~ymax)가 밴드를 벗어나면 FAIL
 */
export function judgeTestLimitBand(
  ymin: number,
  ymax: number,
  pseudoGolden: number,
  band: number | null
): PassFail {
  if (band === null || band <= 0) return "CHECK";

  const lo = pseudoGolden - band;
  const hi = pseudoGolden + band;

  if (ymin >= lo && ymax <= hi) return "PASS";
  return "FAIL";
}

export function clippedParallelBandSegments(
  lo: number,
  hi: number,
  band: number
): {
  upper: [{ x: number; y: number }, { x: number; y: number }];
  lower: [{ x: number; y: number }, { x: number; y: number }];
} {
  const b = Math.max(0, Math.min(band, (hi - lo) / 2));
  return {
    upper: [
      { x: lo, y: lo + b },
      { x: hi - b, y: hi },
    ],
    lower: [
      { x: lo + b, y: lo },
      { x: hi, y: hi - b },
    ],
  };
}
