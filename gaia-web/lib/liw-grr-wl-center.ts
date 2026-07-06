import { getMetricValue } from "./csv-parser";
import { findIndexedSeriesHeaders, type IndexedHeader } from "./liw-linearity";
import type { LinearityBranch, LinearityRunOption } from "./liw-linearity-types";
import {
  GRR_STEP_POINT_COUNT,
  WL_CENTER_SEARCH_TOKEN,
  WL_CENTER_SKIP_POINT_COUNT,
  WL_CENTER_SPEC_LOWER,
  WL_CENTER_SPEC_UPPER,
  wlCenterBranchToken,
} from "./liw-grr-config";
import {
  judgeErsValue,
  resolveWlCenterFixedSpec,
  type GrrReferenceSpec,
} from "./liw-grr-spec";
import type { GaiaSpecStore } from "./gaia-spec-config";
import type { ParsedCsv } from "./types";

export type GrrWlCenterVerdict = "pass" | "data_missing" | "drift" | "spec_missing";

export interface GrrWlCenterPoint {
  pointIndex: number;
  seriesIndex: number;
  value: number;
  header: string;
  excluded: boolean;
  specOut: boolean;
  spec: GrrReferenceSpec;
}

export interface GrrExcludedTrendPoint {
  key: string;
  label: string;
  value: number;
}

export function makeGrrWlCenterPointKey(pointIndex: number): string {
  return String(pointIndex);
}

export interface GrrWlCenterSummary {
  pointCount: number;
  expectedCount: number;
  skippedPointCount: number;
  analysisPointCount: number;
  analysisExpectedCount: number;
  specLower: number | null;
  specUpper: number | null;
  matchedConfigItem: string | null;
  specMatchStatus: "matched" | "missing" | "ambiguous";
  avg: number | null;
  min: number | null;
  max: number | null;
  range: number | null;
  stdDev: number | null;
  maxDeviation: number | null;
}

export interface GrrWlCenterRunAnalysis {
  branch: LinearityBranch;
  run: LinearityRunOption;
  headers: string[];
  points: GrrWlCenterPoint[];
  summary: GrrWlCenterSummary;
  verdict: GrrWlCenterVerdict;
  statusTitle: string;
  statusMessage: string;
  failReason: string | null;
}

function parseIntegerSuffix(header: string): number | null {
  const match = header.match(/WL_CENTER_(\d+)(?:[^0-9]|$)/i);
  if (!match) return null;
  return Number(match[1]);
}

export function isWlCenterExcludedIndex(pointIndex: number): boolean {
  return pointIndex < WL_CENTER_SKIP_POINT_COUNT;
}

export function findWlCenterIndexedHeaders(
  headers: string[],
  branch: LinearityBranch
): IndexedHeader[] {
  const branchToken = wlCenterBranchToken(branch);
  const branchIndexed = findIndexedSeriesHeaders(headers, branchToken);
  if (branchIndexed.length > 0) return branchIndexed;

  const token = WL_CENTER_SEARCH_TOKEN.toUpperCase();
  const found: IndexedHeader[] = [];

  for (const header of headers) {
    const upper = header.toUpperCase();
    if (!upper.includes(token)) continue;
    const idx = parseIntegerSuffix(header);
    if (idx === null) continue;
    found.push({ index: idx, header });
  }

  const deduped = new Map<number, string>();
  for (const item of found.sort((a, b) => a.index - b.index)) {
    if (!deduped.has(item.index)) deduped.set(item.index, item.header);
  }

  return [...deduped.entries()]
    .map(([index, h]) => ({ index, header: h }))
    .sort((a, b) => a.index - b.index);
}

export function getWlCenterChartPoints(points: GrrWlCenterPoint[]): GrrWlCenterPoint[] {
  return points.filter((p) => !p.excluded);
}

function summarizeWlCenter(analysisValues: number[]) {
  if (analysisValues.length === 0) {
    return {
      avg: null,
      min: null,
      max: null,
      range: null,
      stdDev: null,
      maxDeviation: null,
    };
  }

  const min = Math.min(...analysisValues);
  const max = Math.max(...analysisValues);
  const avg = analysisValues.reduce((a, b) => a + b, 0) / analysisValues.length;
  const variance =
    analysisValues.reduce((sum, v) => sum + (v - avg) ** 2, 0) / analysisValues.length;
  const stdDev = Math.sqrt(variance);
  const maxDeviation = Math.max(...analysisValues.map((v) => Math.abs(v - avg)));

  return { avg, min, max, range: max - min, stdDev, maxDeviation };
}

function formatWlCenterXRange(points: GrrWlCenterPoint[]): string {
  if (points.length === 0) return "— mA";
  const xs = points.map((p) => p.seriesIndex);
  return `${Math.min(...xs)}~${Math.max(...xs)} mA`;
}

export function wlCenterFailReasonLabel(verdict: GrrWlCenterVerdict): string | null {
  switch (verdict) {
    case "pass":
      return null;
    case "data_missing":
      return "WL_CENTER Data Missing";
    case "drift":
      return "WL_CENTER Drift";
    case "spec_missing":
      return "WL_CENTER Spec Missing";
  }
}

export function analyzeGrrWlCenterRun(
  parsed: ParsedCsv,
  branch: LinearityBranch,
  run: LinearityRunOption,
  specStore: GaiaSpecStore | null
): GrrWlCenterRunAnalysis | null {
  const indexed = findWlCenterIndexedHeaders(parsed.headers, branch);
  if (indexed.length === 0) return null;

  const analysisExpectedCount = GRR_STEP_POINT_COUNT - WL_CENTER_SKIP_POINT_COUNT;
  const row = parsed.rows[run.rowIndex];
  const points: GrrWlCenterPoint[] = [];

  indexed.forEach(({ index, header }, pointIndex) => {
    const value = getMetricValue(row, header);
    if (value === null) return;
    const excluded = isWlCenterExcludedIndex(pointIndex);
    const spec = resolveWlCenterFixedSpec();
    const ers = judgeErsValue(value, spec);
    points.push({
      pointIndex,
      seriesIndex: index,
      value,
      header,
      excluded,
      spec,
      specOut: !excluded && ers === "FAIL",
    });
  });

  if (points.length === 0) return null;

  const analysisPoints = points.filter((p) => !p.excluded);
  const analysisValues = analysisPoints.map((p) => p.value);
  const stats = summarizeWlCenter(analysisValues);

  const chartSpec = resolveWlCenterFixedSpec();

  const summary: GrrWlCenterSummary = {
    pointCount: points.length,
    expectedCount: GRR_STEP_POINT_COUNT,
    skippedPointCount: WL_CENTER_SKIP_POINT_COUNT,
    analysisPointCount: analysisPoints.length,
    analysisExpectedCount,
    specLower: chartSpec.lower,
    specUpper: chartSpec.upper,
    matchedConfigItem: chartSpec.matchedItem,
    specMatchStatus: chartSpec.specMatchStatus,
    ...stats,
  };

  return {
    branch,
    run,
    headers: indexed.map((h) => h.header),
    points,
    summary,
    ...buildWlCenterRunVerdict(summary, analysisPoints),
  };
}

function buildWlCenterRunVerdict(
  summary: GrrWlCenterSummary,
  analysisPoints: GrrWlCenterPoint[]
): Pick<
  GrrWlCenterRunAnalysis,
  "verdict" | "statusTitle" | "statusMessage" | "failReason"
> {
  let verdict: GrrWlCenterVerdict = "pass";
  let statusTitle = "WL_CENTER PASS";
  let statusMessage = `${summary.analysisPointCount}/${summary.analysisExpectedCount} points · ${formatWlCenterXRange(analysisPoints)} · Spec ${WL_CENTER_SPEC_LOWER}~${WL_CENTER_SPEC_UPPER}`;

  if (summary.analysisPointCount < summary.analysisExpectedCount) {
    verdict = "data_missing";
    statusTitle = "WL_CENTER FAIL — Data Missing";
    statusMessage = `판정 구간 ${summary.analysisPointCount}/${summary.analysisExpectedCount} points · ${formatWlCenterXRange(analysisPoints)}`;
  } else if (analysisPoints.some((p) => p.specOut)) {
    const outCount = analysisPoints.filter((p) => p.specOut).length;
    verdict = "drift";
    statusTitle = "WL_CENTER FAIL — Drift";
    statusMessage = `${outCount} point(s) outside Spec ${WL_CENTER_SPEC_LOWER}~${WL_CENTER_SPEC_UPPER}`;
  }

  return {
    verdict,
    statusTitle,
    statusMessage,
    failReason: wlCenterFailReasonLabel(verdict),
  };
}

export function applyExcludedWlCenterPoints(
  analysis: GrrWlCenterRunAnalysis,
  excludedKeys: ReadonlySet<string>
): GrrWlCenterRunAnalysis {
  if (excludedKeys.size === 0) return analysis;

  const points = analysis.points.filter(
    (p) => !excludedKeys.has(makeGrrWlCenterPointKey(p.pointIndex))
  );
  const analysisPoints = points.filter((p) => !p.excluded);
  const analysisValues = analysisPoints.map((p) => p.value);
  const stats = summarizeWlCenter(analysisValues);
  const chartSpec = resolveWlCenterFixedSpec();
  const analysisExpectedCount =
    GRR_STEP_POINT_COUNT - WL_CENTER_SKIP_POINT_COUNT;

  const summary: GrrWlCenterSummary = {
    pointCount: points.length,
    expectedCount: GRR_STEP_POINT_COUNT,
    skippedPointCount: WL_CENTER_SKIP_POINT_COUNT,
    analysisPointCount: analysisPoints.length,
    analysisExpectedCount,
    specLower: chartSpec.lower,
    specUpper: chartSpec.upper,
    matchedConfigItem: chartSpec.matchedItem,
    specMatchStatus: chartSpec.specMatchStatus,
    ...stats,
  };

  return {
    ...analysis,
    points,
    summary,
    ...buildWlCenterRunVerdict(summary, analysisPoints),
  };
}

export function listExcludedWlCenterPoints(
  analysis: GrrWlCenterRunAnalysis,
  excludedKeys: ReadonlySet<string>
): GrrExcludedTrendPoint[] {
  if (excludedKeys.size === 0) return [];

  return analysis.points
    .filter((p) => excludedKeys.has(makeGrrWlCenterPointKey(p.pointIndex)))
    .map((p) => ({
      key: makeGrrWlCenterPointKey(p.pointIndex),
      label: `PO ${p.seriesIndex} mA`,
      value: p.value,
    }));
}
