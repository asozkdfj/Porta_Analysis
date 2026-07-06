import { getMetricValue } from "./csv-parser";
import { buildRunOptions, findIndexedSeriesHeaders } from "./liw-linearity";
import type { LinearityBranch, LinearityRunOption } from "./liw-linearity-types";
import type { ParsedCsv } from "./types";

/** 분기별 온도 헤더 검색 토큰 (예: 20C_NTC_TEMP_PRE, 50C_NTC_TEMP_PRE) */
export function ntcTempPreBranchToken(branch: LinearityBranch): string {
  return `${branch}_NTC_TEMP_PRE`;
}

/** PO 스텝과 동일 suffix의 인덱스별 NTC 헤더 토큰 (예: LIW20C_NTC_TEMP_PRE_) */
export function ntcTempPreIndexedToken(branch: LinearityBranch): string {
  return `LIW${branch}_NTC_TEMP_PRE_`;
}

export interface GrrTemperaturePoint {
  runId: string;
  rowIndex: number;
  sequence: number;
  attemptLabel: string;
  timestamp: string;
  barcode: string;
  socket: string;
  temperature: number;
  headerCount: number;
}

export interface GrrTemperatureSummary {
  avgTemp: number | null;
  minTemp: number | null;
  maxTemp: number | null;
  tempRange: number | null;
}

export interface GrrTemperatureAnalysis {
  branch: LinearityBranch;
  headers: string[];
  points: GrrTemperaturePoint[];
  summary: GrrTemperatureSummary;
}

export interface GrrPoStepTemperaturePoint {
  poIndex: number;
  temperature: number;
  header: string;
}

export interface GrrPoStepTemperatureAnalysis {
  branch: LinearityBranch;
  run: LinearityRunOption;
  headers: string[];
  points: GrrPoStepTemperaturePoint[];
  summary: GrrTemperatureSummary;
}

export function findNtcTempPreHeaders(
  headers: string[],
  branch: LinearityBranch
): string[] {
  const token = ntcTempPreBranchToken(branch).toUpperCase();
  return headers.filter((h) => h.toUpperCase().includes(token));
}

export function findIndexedNtcTempPreHeaders(
  headers: string[],
  branch: LinearityBranch
) {
  return findIndexedSeriesHeaders(headers, ntcTempPreIndexedToken(branch));
}

function summarizeTemperatures(values: number[]): GrrTemperatureSummary {
  if (values.length === 0) {
    return { avgTemp: null, minTemp: null, maxTemp: null, tempRange: null };
  }
  const minTemp = Math.min(...values);
  const maxTemp = Math.max(...values);
  const avgTemp = values.reduce((a, b) => a + b, 0) / values.length;
  return { avgTemp, minTemp, maxTemp, tempRange: maxTemp - minTemp };
}

function readRowTemperature(
  row: Record<string, string>,
  headers: string[]
): { temperature: number; headerCount: number } | null {
  const values = headers
    .map((header) => getMetricValue(row, header))
    .filter((v): v is number => v !== null);

  if (values.length === 0) return null;

  return {
    temperature: values.reduce((a, b) => a + b, 0) / values.length,
    headerCount: values.length,
  };
}

/** 선택 분기(20C/50C)의 NTC 헤더만 사용해 GRR Run 순서 기준 온도 추출 */
export function analyzeGrrTemperature(
  parsed: ParsedCsv,
  branch: LinearityBranch
): GrrTemperatureAnalysis | null {
  const headers = findNtcTempPreHeaders(parsed.headers, branch);
  if (headers.length === 0) return null;

  const runs = buildRunOptions(parsed, "repeat");
  const sorted = [...runs].sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp.localeCompare(b.timestamp);
    return a.rowIndex - b.rowIndex;
  });

  const points: GrrTemperaturePoint[] = [];

  sorted.forEach((run, i) => {
    const row = parsed.rows[run.rowIndex];
    const reading = readRowTemperature(row, headers);
    if (!reading) return;

    points.push({
      runId: run.runId,
      rowIndex: run.rowIndex,
      sequence: i + 1,
      attemptLabel: run.attemptLabel,
      timestamp: run.timestamp,
      barcode: run.barcode,
      socket: run.socket,
      temperature: reading.temperature,
      headerCount: reading.headerCount,
    });
  });

  if (points.length === 0) return null;

  return {
    branch,
    headers,
    points,
    summary: summarizeTemperatures(points.map((p) => p.temperature)),
  };
}

/** 선택 Run에서 PO 스텝(0→2.5→90)별 NTC_TEMP_PRE 온도 추출 */
export function analyzeGrrPoStepTemperature(
  parsed: ParsedCsv,
  branch: LinearityBranch,
  run: LinearityRunOption
): GrrPoStepTemperatureAnalysis | null {
  const indexed = findIndexedNtcTempPreHeaders(parsed.headers, branch);
  if (indexed.length === 0) return null;

  const row = parsed.rows[run.rowIndex];
  const points: GrrPoStepTemperaturePoint[] = [];

  for (const { index, header } of indexed) {
    const temperature = getMetricValue(row, header);
    if (temperature === null) continue;
    points.push({ poIndex: index, temperature, header });
  }

  if (points.length === 0) return null;

  return {
    branch,
    run,
    headers: indexed.map((h) => h.header),
    points,
    summary: summarizeTemperatures(points.map((p) => p.temperature)),
  };
}
