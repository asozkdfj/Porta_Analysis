import {
  computePctErrFromGoldenLimit,
  computeTestResultBounds,
  judgeGroupPctErrPass,
  judgeSerialPctErrPass,
  verifyGrrPctErrReferenceExample,
  type GrrPctErrReferenceVerification,
} from "./grr-stats";
import type {
  GaiaAnalysisResult,
  GrrJudgmentLabel,
  PassFail,
  SerialGrrResult,
} from "./types";

export type GaiaStat2GrrResultLabel =
  | "pass"
  | "fail"
  | "check"
  | "grr_limit_missing";

export interface GrrCriteriaRow {
  serial: string;
  avgGolden: number;
  grrLimit: number | null;
  grrLimitUp: number;
  grrLimitDn: number;
}

export interface GrrTestResultRow {
  serial: string;
  avgGolden: number;
  avg: number;
  stdev: number;
  grrStdev: number | null;
  grrLimit: number | null;
  boundUp: number;
  boundDn: number;
  pctErrUpper: number | null;
  pctErrLower: number | null;
  result: GaiaStat2GrrResultLabel;
}

export interface GrrPctErrRow {
  serial: string;
  pctErrUpper: number;
  pctErrLower: number;
}

export interface GrrPctErrDebugRow {
  serial: string;
  avgGolden: number;
  avg: number;
  stdev: number;
  grrStdev: number | null;
  grrLimit: number | null;
  boundUp: number;
  boundDn: number;
  pctErrUpper: number | null;
  pctErrLower: number | null;
  boundUpFormula: string;
  boundDnFormula: string;
  pctErrUpperFormula: string;
  pctErrLowerFormula: string;
}

export interface GaiaStat2GrrSummary {
  metric: string;
  metricLabel: string;
  targetTester: string;
  sampleCount: number;
  limitHigh: number | null;
  limitLow: number | null;
  ersHigh: number | null;
  ersLow: number | null;
  grrStdev: number | null;
  grrLimit: number | null;
  configVersion: string | null;

  grrGroupAvg: number;
  grrPctErrMax: number | null;
  grrPctErrMin: number | null;
  grrResult: GaiaStat2GrrResultLabel;

  criteriaTable: GrrCriteriaRow[];
  testResultTable: GrrTestResultRow[];
  pctErrTable: GrrPctErrRow[];
  groupAvgGolden: number;
  groupAvg: number;

  pctErrDebug: GrrPctErrDebugRow[];
  referenceVerification: GrrPctErrReferenceVerification;
}

export interface TesterGrrSidebarEntry {
  testerId: string;
  grrResult: GaiaStat2GrrResultLabel;
  isActive: boolean;
}

function formatBoundFormula(
  avg: number,
  grrStdev: number | null,
  stdev: number,
  sign: "+" | "-"
): string {
  const mult = grrStdev ?? 0;
  return `${avg.toFixed(6)} ${sign} (${mult} × ${stdev.toFixed(6)})`;
}

function formatPctFormula(
  bound: number,
  avgGolden: number,
  grrLimit: number,
  label: "upper" | "lower"
): string {
  const boundLabel = label === "upper" ? "bound_up" : "bound_dn";
  return `((${boundLabel} ${bound.toFixed(6)} - avg_golden ${avgGolden.toFixed(6)}) / grr_limit ${grrLimit}) × 100`;
}

/** Stat2 result → UI judgment (단일 기준) */
export function stat2ResultToGrrJudgment(
  result: GaiaStat2GrrResultLabel
): GrrJudgmentLabel {
  if (result === "pass") return "PASS";
  if (result === "fail") return "FAIL";
  return "CHECK";
}

export function stat2ResultToPassFail(
  result: GaiaStat2GrrResultLabel
): PassFail {
  return stat2ResultToGrrJudgment(result) as PassFail;
}

/** Serial GRR status를 Stat2 계산 결과로 동기화 */
export function applySerialGrrJudgments(
  serials: SerialGrrResult[],
  grrLimit: number | null,
  grrStdev: number | null,
  buildFailReason: (
    measurement: GrrJudgmentLabel,
    grr: GrrJudgmentLabel
  ) => string | null
): void {
  for (const s of serials) {
    const { testResult } = computeSerialStat2Rows(s, grrLimit, grrStdev);
    s.grrStatus = stat2ResultToGrrJudgment(testResult.result);
    s.failReason = buildFailReason(s.measurementStatus, s.grrStatus);
    s.status = stat2ResultToPassFail(testResult.result);
  }
}

export function computeSerialStat2Rows(
  serial: SerialGrrResult,
  grrLimit: number | null,
  grrStdev: number | null
): {
  criteria: GrrCriteriaRow;
  testResult: GrrTestResultRow;
  debug: GrrPctErrDebugRow;
} {
  const avgGolden = serial.pseudoGolden;
  const limit = grrLimit ?? 0;

  const grrLimitUp = limit > 0 ? avgGolden + limit : avgGolden;
  const grrLimitDn = limit > 0 ? avgGolden - limit : avgGolden;

  const testAvg = serial.referenceValue;
  const testStdev = serial.referenceStdev;
  const { boundUp, boundDn } = computeTestResultBounds(
    testAvg,
    testStdev,
    grrStdev
  );

  let pctErrUpper: number | null = null;
  let pctErrLower: number | null = null;
  let result: GaiaStat2GrrResultLabel = "check";

  if (grrLimit === null || grrLimit <= 0) {
    result = "grr_limit_missing";
  } else {
    const pct = computePctErrFromGoldenLimit(
      boundUp,
      boundDn,
      avgGolden,
      grrLimit
    );
    pctErrUpper = pct.pctErrUpper;
    pctErrLower = pct.pctErrLower;
    result = judgeSerialPctErrPass(pctErrUpper, pctErrLower) ? "pass" : "fail";
  }

  const debug: GrrPctErrDebugRow = {
    serial: serial.serial,
    avgGolden,
    avg: testAvg,
    stdev: testStdev,
    grrStdev,
    grrLimit,
    boundUp,
    boundDn,
    pctErrUpper,
    pctErrLower,
    boundUpFormula: formatBoundFormula(testAvg, grrStdev, testStdev, "+"),
    boundDnFormula: formatBoundFormula(testAvg, grrStdev, testStdev, "-"),
    pctErrUpperFormula:
      grrLimit && grrLimit > 0
        ? formatPctFormula(boundUp, avgGolden, grrLimit, "upper")
        : "N/A (grr_limit missing)",
    pctErrLowerFormula:
      grrLimit && grrLimit > 0
        ? formatPctFormula(boundDn, avgGolden, grrLimit, "lower")
        : "N/A (grr_limit missing)",
  };

  return {
    criteria: {
      serial: serial.serial,
      avgGolden,
      grrLimit,
      grrLimitUp,
      grrLimitDn,
    },
    testResult: {
      serial: serial.serial,
      avgGolden,
      avg: testAvg,
      stdev: testStdev,
      grrStdev,
      grrLimit,
      boundUp,
      boundDn,
      pctErrUpper,
      pctErrLower,
      result,
    },
    debug,
  };
}

function judgeGroupGrrResult(
  rows: GrrTestResultRow[],
  grrLimit: number | null
): GaiaStat2GrrResultLabel {
  if (rows.length === 0) return "check";
  if (grrLimit === null || grrLimit <= 0) return "grr_limit_missing";

  const uppers = rows
    .map((r) => r.pctErrUpper)
    .filter((v): v is number => v !== null);
  const lowers = rows
    .map((r) => r.pctErrLower)
    .filter((v): v is number => v !== null);

  if (uppers.length === 0 || lowers.length === 0) return "check";

  const pctErrMax = Math.max(...uppers);
  const pctErrMin = Math.min(...lowers);

  return judgeGroupPctErrPass(pctErrMax, pctErrMin) ? "pass" : "fail";
}

export function buildGaiaStat2GrrSummary(
  analysis: GaiaAnalysisResult,
  configVersion?: string | null
): GaiaStat2GrrSummary {
  const { spec, serials, metric } = analysis;
  const grrLimit = spec.grrLimit;
  const grrStdev = spec.grrStdev;

  const criteriaTable: GrrCriteriaRow[] = [];
  const testResultTable: GrrTestResultRow[] = [];
  const pctErrDebug: GrrPctErrDebugRow[] = [];

  for (const serial of serials) {
    const rows = computeSerialStat2Rows(serial, grrLimit, grrStdev);
    criteriaTable.push(rows.criteria);
    testResultTable.push(rows.testResult);
    pctErrDebug.push(rows.debug);
  }

  const groupAvgGolden =
    serials.length > 0
      ? serials.reduce((s, x) => s + x.pseudoGolden, 0) / serials.length
      : 0;

  const groupAvg =
    serials.length > 0
      ? serials.reduce((s, x) => s + x.referenceValue, 0) / serials.length
      : 0;

  const uppers = testResultTable
    .map((r) => r.pctErrUpper)
    .filter((v): v is number => v !== null);
  const lowers = testResultTable
    .map((r) => r.pctErrLower)
    .filter((v): v is number => v !== null);

  const pctErrMax = uppers.length > 0 ? Math.max(...uppers) : null;
  const pctErrMin = lowers.length > 0 ? Math.min(...lowers) : null;

  const targetTester =
    serials[0]?.referenceSocket ?? analysis.sockets[0] ?? "";

  const grrResult = judgeGroupGrrResult(testResultTable, grrLimit);
  const referenceVerification = verifyGrrPctErrReferenceExample();

  if (typeof console !== "undefined") {
    console.info("[GRR PCT_ERR] formula:", referenceVerification.currentFormula);
    console.info(
      "[GRR PCT_ERR] reference verification:",
      referenceVerification.match ? "PASS" : "FAIL",
      referenceVerification
    );
    if (pctErrDebug.length > 0) {
      console.info("[GRR PCT_ERR] sample debug (first serial):", pctErrDebug[0]);
    }
  }

  const pctErrTable: GrrPctErrRow[] = testResultTable.map((r) => ({
    serial: r.serial,
    pctErrUpper: r.pctErrUpper ?? 0,
    pctErrLower: r.pctErrLower ?? 0,
  }));

  return {
    metric,
    metricLabel: metric.split("::").pop() ?? metric,
    targetTester,
    sampleCount: serials.length,
    limitHigh: spec.usl,
    limitLow: spec.lsl,
    ersHigh: spec.usl,
    ersLow: spec.lsl,
    grrStdev,
    grrLimit,
    configVersion: configVersion ?? null,
    grrGroupAvg: groupAvg,
    grrPctErrMax: pctErrMax,
    grrPctErrMin: pctErrMin,
    grrResult,
    criteriaTable,
    testResultTable,
    pctErrTable,
    groupAvgGolden,
    groupAvg,
    pctErrDebug,
    referenceVerification,
  };
}

export function buildTesterSidebarEntries(
  sockets: string[],
  activeTester: string,
  getSummaryForTester: (testerId: string) => GaiaStat2GrrSummary | null
): TesterGrrSidebarEntry[] {
  return sockets.map((testerId) => {
    const summary = getSummaryForTester(testerId);
    return {
      testerId,
      grrResult: summary?.grrResult ?? "check",
      isActive: testerId === activeTester,
    };
  });
}

export { computeTestResultBounds } from "./grr-stats";
