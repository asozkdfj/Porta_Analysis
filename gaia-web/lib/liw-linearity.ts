import { getMetricValue } from "./csv-parser";
import {
  annotateRunSequences,
  buildTestRunIdentity,
  getRunTimestamp,
  type RunLabelMode,
} from "./test-run";
import {
  EMISSION_ABSOLUTE_MIN_MAX,
  EMISSION_ABSOLUTE_MIN_RANGE,
  EMISSION_MIN_INCREASE_RATIO,
  EMISSION_MIN_RANGE_RATIO,
  LINEARITY_ANALYSIS_MIN_INDEX,
  LINEARITY_FAIL_R2,
  LINEARITY_MAX_RESIDUAL_RATIO,
  LINEARITY_PASS_R2,
} from "./liw-linearity-config";
import type { ParsedCsv } from "./types";
import type {
  EmissionCheckResult,
  LinearityAnalysisResult,
  LinearityPoint,
  LinearityRegression,
  LinearityRunOption,
  LinearitySeriesDef,
  LinearitySummary,
  LinearityVerdict,
} from "./liw-linearity-types";

export interface IndexedHeader {
  index: number;
  header: string;
}

export { LINEARITY_ANALYSIS_MIN_INDEX };

/** Socket 정렬 — 알파벳 우선 (A_01 → A_02 → … → B_01) */
export function compareSocketsLetterFirst(a: string, b: string): number {
  const parse = (socket: string): { letter: string; num: number } | null => {
    const trimmed = socket.trim();
    const suffix = trimmed.match(/_([A-Za-z])_(\d+)\s*$/);
    if (suffix) {
      return { letter: suffix[1].toUpperCase(), num: Number(suffix[2]) };
    }
    const direct = trimmed.match(/^([A-Za-z])_(\d+)$/);
    if (direct) {
      return { letter: direct[1].toUpperCase(), num: Number(direct[2]) };
    }
    return null;
  };

  const pa = parse(a);
  const pb = parse(b);
  if (pa && pb) {
    const byLetter = pa.letter.localeCompare(pb.letter);
    if (byLetter !== 0) return byLetter;
    return pa.num - pb.num;
  }
  if (pa && !pb) return -1;
  if (!pa && pb) return 1;
  return a.localeCompare(b, undefined, { numeric: true });
}

/** LIW20C_PO_0 / PO_0P0MA / PO_2P5MA 등 인덱스 헤더 수집 */
export function findIndexedSeriesHeaders(
  headers: string[],
  headerToken: string
): IndexedHeader[] {
  const token = headerToken.toUpperCase();
  const found: IndexedHeader[] = [];

  for (const header of headers) {
    const upper = header.toUpperCase();
    const pos = upper.indexOf(token);
    if (pos < 0) continue;

    const suffix = upper.slice(pos + token.length);
    const index = parseSeriesSuffix(suffix);
    if (index === null) continue;

    found.push({ index, header });
  }

  return found.sort((a, b) => a.index - b.index);
}

function parseSeriesSuffix(suffix: string): number | null {
  const maMatch = suffix.match(/^(\d+)P(\d+)MA$/i);
  if (maMatch) {
    return Number(maMatch[1]) + Number(maMatch[2]) / 10;
  }

  const numMatch = suffix.match(/^(\d+)$/);
  if (numMatch) {
    return Number(numMatch[1]);
  }

  return null;
}

export function isExcludedAnalysisIndex(index: number): boolean {
  return index < LINEARITY_ANALYSIS_MIN_INDEX;
}

export function toRunOption(
  parsed: ParsedCsv,
  rowIndex: number,
  sequenceMap?: Map<number, { testSequence: number; attemptLabel: string }>
): LinearityRunOption {
  const identity = buildTestRunIdentity(parsed, rowIndex, sequenceMap);
  const label = [
    identity.barcode,
    identity.socket,
    identity.attemptLabel,
    identity.timestamp !== "—" ? identity.timestamp : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: String(rowIndex),
    runId: identity.runId,
    label,
    rowIndex,
    barcode: identity.barcode,
    socket: identity.socket,
    timestamp: identity.timestamp,
    testSequence: identity.testSequence,
    attemptLabel: identity.attemptLabel,
  };
}

export function listBarcodes(parsed: ParsedCsv): string[] {
  const seen = new Set<string>();
  for (const row of parsed.rows) {
    const bc = row[parsed.serialKey]?.trim();
    if (bc) seen.add(bc);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function listSocketsForBarcode(parsed: ParsedCsv, barcode: string): string[] {
  const seen = new Set<string>();
  for (const row of parsed.rows) {
    if (row[parsed.serialKey]?.trim() !== barcode) continue;
    const socket = row[parsed.socketKey]?.trim();
    if (socket) seen.add(socket);
  }
  return [...seen].sort(compareSocketsLetterFirst);
}

export function findRunsForBarcodeSocket(
  parsed: ParsedCsv,
  barcode: string,
  socket: string,
  labelMode: RunLabelMode = "repeat"
): LinearityRunOption[] {
  const rowIndexes: number[] = [];
  for (let rowIndex = 0; rowIndex < parsed.rows.length; rowIndex++) {
    const row = parsed.rows[rowIndex];
    if (row[parsed.serialKey]?.trim() !== barcode) continue;
    if (row[parsed.socketKey]?.trim() !== socket) continue;
    rowIndexes.push(rowIndex);
  }

  const sequenceMap = annotateRunSequences(rowIndexes, parsed, labelMode);
  return rowIndexes.map((rowIndex) => toRunOption(parsed, rowIndex, sequenceMap));
}

export function pickPrimaryRun(
  runs: LinearityRunOption[],
  parsed: ParsedCsv
): LinearityRunOption | null {
  if (runs.length === 0) return null;
  if (runs.length === 1) return runs[0];

  return [...runs].sort((a, b) => {
    const ta = getRunTimestamp(parsed.rows[a.rowIndex]);
    const tb = getRunTimestamp(parsed.rows[b.rowIndex]);
    if (ta !== tb) return tb.localeCompare(ta);
    return b.rowIndex - a.rowIndex;
  })[0];
}

export function buildRunOptions(
  parsed: ParsedCsv,
  labelMode: RunLabelMode = "repeat"
): LinearityRunOption[] {
  const rowIndexes = parsed.rows.map((_, i) => i);
  const sequenceMap = annotateRunSequences(rowIndexes, parsed, labelMode);
  return rowIndexes.map((rowIndex) => toRunOption(parsed, rowIndex, sequenceMap));
}

export function extractSeriesPoints(
  parsed: ParsedCsv,
  run: LinearityRunOption,
  series: LinearitySeriesDef
): LinearityPoint[] {
  const headers = findIndexedSeriesHeaders(parsed.headers, series.headerToken);
  const row = parsed.rows[run.rowIndex];
  if (!row) return [];

  const points: LinearityPoint[] = [];
  for (const { index, header } of headers) {
    const actual = getMetricValue(row, header);
    if (actual === null) continue;
    points.push({
      index,
      header,
      target: index,
      actual,
      predicted: 0,
      residual: 0,
      excluded: isExcludedAnalysisIndex(index),
    });
  }

  return points;
}

export function linearRegression(
  points: Pick<LinearityPoint, "index" | "actual">[]
): LinearityRegression | null {
  const n = points.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const p of points) {
    sumX += p.index;
    sumY += p.actual;
    sumXY += p.index * p.actual;
    sumXX += p.index * p.index;
  }

  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const pred = slope * p.index + intercept;
    ssTot += (p.actual - yMean) ** 2;
    ssRes += (p.actual - pred) ** 2;
  }

  const r2 = ssTot > 1e-12 ? Math.max(0, 1 - ssRes / ssTot) : 1;

  return { slope, intercept, r2 };
}

export function judgeEmission(
  analysisPoints: LinearityPoint[]
): EmissionCheckResult {
  const vals = analysisPoints.map((p) => p.actual);
  const maxValue = Math.max(...vals);
  const minValue = Math.min(...vals);
  const dynamicRange = maxValue - minValue;
  const avgValue = vals.reduce((a, b) => a + b, 0) / vals.length;

  let increases = 0;
  for (let i = 1; i < analysisPoints.length; i++) {
    if (analysisPoints[i].actual > analysisPoints[i - 1].actual + 1e-6) {
      increases++;
    }
  }
  const increaseRatio =
    analysisPoints.length > 1 ? increases / (analysisPoints.length - 1) : 0;

  const quickReg = linearRegression(analysisPoints);
  const slopeEstimate = quickReg?.slope ?? 0;

  const minRange = Math.max(
    EMISSION_ABSOLUTE_MIN_RANGE,
    maxValue * EMISSION_MIN_RANGE_RATIO
  );

  let passed = true;
  let reason: string | undefined;

  if (maxValue < EMISSION_ABSOLUTE_MIN_MAX) {
    passed = false;
    reason = `Max Value(${maxValue.toFixed(2)}) below threshold`;
  } else if (dynamicRange < minRange) {
    passed = false;
    reason = `Dynamic Range(${dynamicRange.toFixed(2)}) too small`;
  } else if (slopeEstimate <= 0.01) {
    passed = false;
    reason = `No growth trend (Slope≈${slopeEstimate.toFixed(4)})`;
  } else if (
    increaseRatio < EMISSION_MIN_INCREASE_RATIO &&
    dynamicRange < minRange * 1.5
  ) {
    passed = false;
    reason = `Irregular weak increase (${(increaseRatio * 100).toFixed(0)}%)`;
  }

  return {
    passed,
    maxValue,
    minValue,
    avgValue,
    dynamicRange,
    slopeEstimate,
    increaseRatio,
    reason,
  };
}

export function detectResidualPattern(points: LinearityPoint[]): boolean {
  if (points.length < 5) return false;

  const residuals = points.map((p) => p.residual);
  const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const xMean = points.reduce((s, p) => s + p.index, 0) / points.length;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (const p of points) {
    const dx = p.index - xMean;
    const dy = p.residual - mean;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const trendR2 =
    denX > 1e-12 && denY > 1e-12 ? (num * num) / (denX * denY) : 0;

  let lagSum = 0;
  for (let i = 0; i < residuals.length - 1; i++) {
    lagSum += residuals[i] * residuals[i + 1];
  }
  const varRes =
    residuals.reduce((s, r) => s + (r - mean) ** 2, 0) / residuals.length;
  const lagCorr =
    varRes > 1e-12 ? Math.abs(lagSum / ((residuals.length - 1) * varRes)) : 0;

  return trendR2 > 0.25 || lagCorr > 0.45;
}

export function judgeLinearityVerdict(
  regression: LinearityRegression,
  analysisPoints: LinearityPoint[],
  dynamicRange: number,
  hasResidualPattern: boolean
): { verdict: LinearityVerdict; statusTitle: string; statusMessage: string } {
  const absResiduals = analysisPoints.map((p) => Math.abs(p.residual));
  const maxResidual = absResiduals.length ? Math.max(...absResiduals) : 0;
  const residualRatio =
    dynamicRange > 1e-12 ? maxResidual / dynamicRange : maxResidual;

  const { r2 } = regression;

  if (r2 < LINEARITY_FAIL_R2) {
    return {
      verdict: "non_linear",
      statusTitle: "FAIL",
      statusMessage: "Non Linear Pattern Detected",
    };
  }

  if (hasResidualPattern && r2 < LINEARITY_PASS_R2) {
    return {
      verdict: "non_linear",
      statusTitle: "FAIL",
      statusMessage: "Non Linear Pattern Detected",
    };
  }

  if (residualRatio > LINEARITY_MAX_RESIDUAL_RATIO && r2 < LINEARITY_PASS_R2) {
    return {
      verdict: "non_linear",
      statusTitle: "FAIL",
      statusMessage: "Non Linear Pattern Detected",
    };
  }

  if (r2 < LINEARITY_PASS_R2) {
    return {
      verdict: "non_linear",
      statusTitle: "FAIL",
      statusMessage: "Non Linear Pattern Detected",
    };
  }

  return {
    verdict: "pass",
    statusTitle: "PASS",
    statusMessage: "Linearity OK",
  };
}

function applyRegressionToAll(
  allPoints: LinearityPoint[],
  regression: LinearityRegression
): LinearityPoint[] {
  return allPoints.map((p) => {
    if (p.excluded) {
      return { ...p, predicted: 0, residual: 0 };
    }
    const predicted = regression.slope * p.index + regression.intercept;
    return { ...p, predicted, residual: p.actual - predicted };
  });
}

function buildSummary(
  allPoints: LinearityPoint[],
  analysisWithResiduals: LinearityPoint[],
  emission: EmissionCheckResult,
  regression: LinearityRegression | null
): LinearitySummary {
  const absResiduals = analysisWithResiduals.map((p) => Math.abs(p.residual));

  return {
    totalPointCount: allPoints.length,
    analysisPointCount: analysisWithResiduals.length,
    analysisStartIndex: LINEARITY_ANALYSIS_MIN_INDEX,
    maxValue: emission.maxValue,
    minValue: emission.minValue,
    dynamicRange: emission.dynamicRange,
    avgValue: emission.avgValue,
    slope: regression?.slope ?? null,
    intercept: regression?.intercept ?? null,
    r2: regression?.r2 ?? null,
    maxResidual: absResiduals.length ? Math.max(...absResiduals) : null,
    meanResidual: absResiduals.length
      ? absResiduals.reduce((a, b) => a + b, 0) / absResiduals.length
      : null,
  };
}

export function buildRegressionLine(
  analysisPoints: LinearityPoint[],
  regression: LinearityRegression
): { x: number; y: number }[] {
  if (analysisPoints.length === 0) return [];
  const xs = analysisPoints.map((p) => p.index);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  return [
    { x: minX, y: regression.slope * minX + regression.intercept },
    { x: maxX, y: regression.slope * maxX + regression.intercept },
  ];
}

export function analyzeLinearity(
  parsed: ParsedCsv,
  run: LinearityRunOption,
  series: LinearitySeriesDef
): LinearityAnalysisResult {
  const allPoints = extractSeriesPoints(parsed, run, series);
  const analysisPoints = allPoints.filter((p) => !p.excluded);

  if (allPoints.length === 0 || analysisPoints.length < 2) {
    return {
      series,
      run,
      points: allPoints,
      analysisMinIndex: LINEARITY_ANALYSIS_MIN_INDEX,
      emission: {
        passed: false,
        maxValue: 0,
        minValue: 0,
        avgValue: 0,
        dynamicRange: 0,
        slopeEstimate: 0,
        increaseRatio: 0,
        reason: "Insufficient measurement data",
      },
      regression: null,
      summary: {
        totalPointCount: allPoints.length,
        analysisPointCount: analysisPoints.length,
        analysisStartIndex: LINEARITY_ANALYSIS_MIN_INDEX,
        maxValue: 0,
        minValue: 0,
        dynamicRange: 0,
        avgValue: 0,
        slope: null,
        intercept: null,
        r2: null,
        maxResidual: null,
        meanResidual: null,
      },
      verdict: "data_missing",
      statusTitle: "FAIL",
      statusMessage: "Data Missing",
      hasResidualPattern: false,
      regressionLine: [],
    };
  }

  const emission = judgeEmission(analysisPoints);

  if (!emission.passed) {
    return {
      series,
      run,
      points: allPoints,
      analysisMinIndex: LINEARITY_ANALYSIS_MIN_INDEX,
      emission,
      regression: null,
      summary: buildSummary(allPoints, analysisPoints, emission, null),
      verdict: "emission_failure",
      statusTitle: "FAIL",
      statusMessage: "Emission Failure",
      hasResidualPattern: false,
      regressionLine: [],
    };
  }

  const regression = linearRegression(analysisPoints);
  if (!regression) {
    return {
      series,
      run,
      points: allPoints,
      analysisMinIndex: LINEARITY_ANALYSIS_MIN_INDEX,
      emission,
      regression: null,
      summary: buildSummary(allPoints, analysisPoints, emission, null),
      verdict: "data_missing",
      statusTitle: "FAIL",
      statusMessage: "Data Missing",
      hasResidualPattern: false,
      regressionLine: [],
    };
  }

  const points = applyRegressionToAll(allPoints, regression);
  const analysisWithResiduals = points.filter((p) => !p.excluded);
  const hasResidualPattern = detectResidualPattern(analysisWithResiduals);
  const { verdict, statusTitle, statusMessage } = judgeLinearityVerdict(
    regression,
    analysisWithResiduals,
    emission.dynamicRange,
    hasResidualPattern
  );

  return {
    series,
    run,
    points,
    analysisMinIndex: LINEARITY_ANALYSIS_MIN_INDEX,
    emission,
    regression,
    summary: buildSummary(points, analysisWithResiduals, emission, regression),
    verdict,
    statusTitle,
    statusMessage,
    hasResidualPattern,
    regressionLine: buildRegressionLine(analysisPoints, regression),
  };
}
