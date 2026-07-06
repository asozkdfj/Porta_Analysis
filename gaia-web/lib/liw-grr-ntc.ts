import { getMetricValue } from "./csv-parser";
import type { LinearityBranch, LinearityRunOption } from "./liw-linearity-types";
import {
  GRR_STEP_POINT_COUNT,
  NTC_TEMP_PRE_SEARCH_TOKEN,
  NTC_TEMP_RANGE_LIMIT,
} from "./liw-grr-config";
import { findIndexedNtcTempPreHeaders } from "./liw-grr-temperature";
import type { GrrTemperatureSummary } from "./liw-grr-temperature";
import type { GaiaSpecStore } from "./gaia-spec-config";
import type { ParsedCsv } from "./types";

export type GrrNtcVerdict = "pass" | "data_missing" | "drift";

export interface GrrNtcPoint {
  pointIndex: number;
  poIndex: number;
  temperature: number;
  header: string;
}

export interface GrrExcludedTrendPoint {
  key: string;
  label: string;
  value: number;
}

export function makeGrrNtcPointKey(pointIndex: number): string {
  return String(pointIndex);
}

export interface GrrNtcRunAnalysis {
  branch: LinearityBranch;
  run: LinearityRunOption;
  headers: string[];
  points: GrrNtcPoint[];
  summary: GrrTemperatureSummary & {
    pointCount: number;
    expectedCount: number;
    rangeLimit: number;
  };
  verdict: GrrNtcVerdict;
  statusTitle: string;
  statusMessage: string;
  failReason: string | null;
}

function summarizeNtc(values: number[]): GrrNtcRunAnalysis["summary"] {
  if (values.length === 0) {
    return {
      pointCount: 0,
      expectedCount: GRR_STEP_POINT_COUNT,
      avgTemp: null,
      minTemp: null,
      maxTemp: null,
      tempRange: null,
      rangeLimit: NTC_TEMP_RANGE_LIMIT,
    };
  }
  const minTemp = Math.min(...values);
  const maxTemp = Math.max(...values);
  const avgTemp = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    pointCount: values.length,
    expectedCount: GRR_STEP_POINT_COUNT,
    avgTemp,
    minTemp,
    maxTemp,
    tempRange: maxTemp - minTemp,
    rangeLimit: NTC_TEMP_RANGE_LIMIT,
  };
}

export function ntcFailReasonLabel(verdict: GrrNtcVerdict): string | null {
  switch (verdict) {
    case "pass":
      return null;
    case "data_missing":
      return "NTC Data Missing";
    case "drift":
      return "NTC Drift";
  }
}

export function findNtcTempPreSearchHeaders(headers: string[]): string[] {
  const token = NTC_TEMP_PRE_SEARCH_TOKEN.toUpperCase();
  return headers.filter((h) => h.toUpperCase().includes(token));
}

export function analyzeGrrNtcRun(
  parsed: ParsedCsv,
  branch: LinearityBranch,
  run: LinearityRunOption,
  _specStore: GaiaSpecStore | null
): GrrNtcRunAnalysis | null {
  const indexed = findIndexedNtcTempPreHeaders(parsed.headers, branch);
  if (indexed.length === 0) return null;

  const row = parsed.rows[run.rowIndex];
  const points: GrrNtcPoint[] = [];

  indexed.forEach(({ index, header }, pointIndex) => {
    const temperature = getMetricValue(row, header);
    if (temperature === null) return;
    points.push({
      pointIndex,
      poIndex: index,
      temperature,
      header,
    });
  });

  if (points.length === 0) return null;

  const values = points.map((p) => p.temperature);
  const summary = summarizeNtc(values);

  return {
    branch,
    run,
    headers: indexed.map((h) => h.header),
    points,
    summary,
    ...buildNtcRunVerdict(summary),
  };
}

function buildNtcRunVerdict(
  summary: GrrNtcRunAnalysis["summary"]
): Pick<GrrNtcRunAnalysis, "verdict" | "statusTitle" | "statusMessage" | "failReason"> {
  let verdict: GrrNtcVerdict = "pass";
  let statusTitle = "NTC PASS";
  let statusMessage = `${summary.pointCount}/${GRR_STEP_POINT_COUNT} points · Range ${summary.tempRange?.toFixed(2) ?? "—"}°C (limit ≤${NTC_TEMP_RANGE_LIMIT}°C)`;

  if (summary.pointCount < GRR_STEP_POINT_COUNT) {
    verdict = "data_missing";
    statusTitle = "NTC FAIL — Data Missing";
    statusMessage = `${summary.pointCount}/${GRR_STEP_POINT_COUNT} temperature points collected`;
  } else if (
    summary.tempRange !== null &&
    summary.tempRange > NTC_TEMP_RANGE_LIMIT
  ) {
    verdict = "drift";
    statusTitle = "NTC FAIL — Drift";
    statusMessage = `Temperature range ${summary.tempRange.toFixed(2)}°C exceeds limit ${NTC_TEMP_RANGE_LIMIT}°C`;
  }

  return {
    verdict,
    statusTitle,
    statusMessage,
    failReason: ntcFailReasonLabel(verdict),
  };
}

export function applyExcludedNtcPoints(
  analysis: GrrNtcRunAnalysis,
  excludedKeys: ReadonlySet<string>
): GrrNtcRunAnalysis {
  if (excludedKeys.size === 0) return analysis;

  const points = analysis.points.filter(
    (p) => !excludedKeys.has(makeGrrNtcPointKey(p.pointIndex))
  );
  const summary = summarizeNtc(points.map((p) => p.temperature));

  return {
    ...analysis,
    points,
    summary,
    ...buildNtcRunVerdict(summary),
  };
}

export function listExcludedNtcPoints(
  analysis: GrrNtcRunAnalysis,
  excludedKeys: ReadonlySet<string>
): GrrExcludedTrendPoint[] {
  if (excludedKeys.size === 0) return [];

  return analysis.points
    .filter((p) => excludedKeys.has(makeGrrNtcPointKey(p.pointIndex)))
    .map((p) => ({
      key: makeGrrNtcPointKey(p.pointIndex),
      label: `PO ${p.poIndex} mA`,
      value: p.temperature,
    }));
}
