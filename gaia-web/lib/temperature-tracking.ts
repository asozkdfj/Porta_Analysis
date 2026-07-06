import { getMetricValue } from "./csv-parser";
import {
  computeRetestSummary,
  getRunTimestamp,
} from "./test-run";
import {
  BRANCH_FIXED_LIMITS,
  NTC_TEMP_HEADER_TOKEN,
  SOCKET_LETTER_RANGE,
  SOCKET_SLOT_COUNT,
  TEMP_PASS_DELTA,
  TEMP_WARNING_DELTA,
} from "./temperature-tracking-config";
import type { ParsedCsv } from "./types";
import type {
  TemperatureAggregateSummary,
  TemperatureBarcodeAnalysis,
  TemperatureBatchSummary,
  TemperatureBranch,
  TemperatureBarcodeSeries,
  TemperatureChartPoint,
  TemperatureExcludedReading,
  TemperatureFilter,
  TemperatureLimits,
  TemperatureOverviewAnalysis,
  TemperatureResultRow,
  TemperatureSeriesStats,
  TemperatureSocketReading,
  TemperatureSocketSeries,
  TemperaturePoint,
  TemperatureVerdict,
} from "./temperature-tracking-types";
import {
  compareSocketsLetterFirst,
  findRunsForBarcodeSocket,
  listBarcodes,
  listSocketsForBarcode,
} from "./liw-linearity";

export { listBarcodes, listSocketsForBarcode };

function verdictForSingleReading(
  value: number,
  limits: TemperatureLimits
): { verdict: TemperatureVerdict; specOut: boolean } {
  const specOut = isTempSpecOut(value, limits);
  if (specOut) return { verdict: "fail", specOut: true };
  return { verdict: "pass", specOut: false };
}

/**
 * TesterID / Socket ID → 차트용 라벨 (예: AiO_G_01 → G_01, G_08 → G_08)
 */
export function formatSocketChartLabel(socket: string): string {
  const trimmed = socket.trim();

  const suffix = trimmed.match(/_([A-Za-z])_(\d+)\s*$/);
  if (suffix) {
    return `${suffix[1].toUpperCase()}_${suffix[2].padStart(2, "0")}`;
  }

  const direct = trimmed.match(/^([A-Za-z])_(\d+)$/);
  if (direct) {
    return `${direct[1].toUpperCase()}_${direct[2].padStart(2, "0")}`;
  }

  return trimmed;
}

const SOCKET_ID_ROW_KEYS = [
  "PROX::MOD_INIT_SOCKET_ID",
  "Socket",
  "socket",
] as const;

/** CSV 행의 SOCKET_ID 컬럼이 있으면 우선 사용 */
export function resolveSocketDisplayLabel(
  socket: string,
  row?: Record<string, string>
): string {
  if (row) {
    for (const key of SOCKET_ID_ROW_KEYS) {
      const value = row[key]?.trim();
      if (value) return formatSocketChartLabel(value);
    }
  }
  return formatSocketChartLabel(socket);
}

export function isTempSpecOut(
  value: number,
  limits: TemperatureLimits
): boolean {
  if (limits.lower !== null && value < limits.lower) return true;
  if (limits.upper !== null && value > limits.upper) return true;
  return false;
}

function computeVerdictForValues(
  values: number[],
  limits: TemperatureLimits
): { verdict: TemperatureVerdict; specOut: boolean } {
  const specOut = values.some((v) => isTempSpecOut(v, limits));
  if (specOut) return { verdict: "fail", specOut: true };

  const delta =
    values.length > 0 ? Math.max(...values) - Math.min(...values) : 0;
  return { verdict: verdictFromDelta(delta), specOut: false };
}

export function formatBarcodeChartLabel(barcode: string, tail = 8): string {
  if (barcode.length <= tail + 1) return barcode;
  return `…${barcode.slice(-tail)}`;
}

/** A_01 ~ H_08 차트 라벨 순서 (알파벳 우선) */
export function buildStandardSocketChartLabels(): string[] {
  const labels: string[] = [];
  for (const letter of SOCKET_LETTER_RANGE) {
    for (let slot = 1; slot <= SOCKET_SLOT_COUNT; slot++) {
      labels.push(`${letter}_${String(slot).padStart(2, "0")}`);
    }
  }
  return labels;
}

function extractSocketPrefix(socket: string): string | null {
  const match = socket.trim().match(/^(.+)_([A-Za-z])_(\d+)\s*$/);
  return match ? match[1] : null;
}

/** CSV에 없는 슬롯도 A~H × 01~08 전체 축 순서로 채움 */
function expandSocketOrderToFullGrid(sockets: string[]): string[] {
  if (sockets.length === 0) return [];

  const byLabel = new Map<string, string>();
  for (const socket of sockets) {
    byLabel.set(formatSocketChartLabel(socket), socket);
  }

  const prefix =
    sockets.map(extractSocketPrefix).find((value) => value !== null) ?? "AiO";

  return buildStandardSocketChartLabels().map(
    (label) => byLabel.get(label) ?? `${prefix}_${label}`
  );
}

export function listAllSockets(parsed: ParsedCsv): string[] {
  const seen = new Set<string>();
  for (const row of parsed.rows) {
    const socket = row[parsed.socketKey]?.trim();
    if (socket) seen.add(socket);
  }
  const discovered = [...seen].sort(compareSocketsLetterFirst);
  return expandSocketOrderToFullGrid(discovered);
}

function worstVerdict(verdicts: TemperatureVerdict[]): TemperatureVerdict {
  if (verdicts.includes("fail")) return "fail";
  if (verdicts.includes("warning")) return "warning";
  return "pass";
}

export function findNtcTempHeaders(headers: string[]): string[] {
  const token = NTC_TEMP_HEADER_TOKEN.toUpperCase();
  return headers.filter((h) => h.toUpperCase().includes(token));
}

export function findNtcHeaderForBranch(
  headers: string[],
  branch: TemperatureBranch
): string | null {
  const token = NTC_TEMP_HEADER_TOKEN.toUpperCase();
  const branchToken = `LIW${branch}_`;
  for (const header of headers) {
    const upper = header.toUpperCase();
    if (upper.includes(token) && upper.includes(branchToken)) return header;
  }
  return null;
}

export function getBranchLimits(
  _parsed: ParsedCsv,
  _header: string,
  branch: TemperatureBranch
): TemperatureLimits {
  return { ...BRANCH_FIXED_LIMITS[branch] };
}

export function verdictFromDelta(delta: number): TemperatureVerdict {
  if (delta < TEMP_PASS_DELTA) return "pass";
  if (delta < TEMP_WARNING_DELTA) return "warning";
  return "fail";
}

export function verdictStatusLabel(verdict: TemperatureVerdict): string {
  switch (verdict) {
    case "pass":
      return "PASS";
    case "warning":
      return "WARNING";
    case "fail":
      return "FAIL";
  }
}

export function verdictMessage(
  verdict: TemperatureVerdict,
  opts?: { specOut?: boolean }
): string {
  switch (verdict) {
    case "pass":
      return "Temperature Stable";
    case "warning":
      return "Temperature Drift Detected";
    case "fail":
      return opts?.specOut ? "Temperature Spec Out" : "Temperature Out Of Range";
  }
}

function parseTemp(row: Record<string, string>, header: string): number | null {
  return getMetricValue(row, header);
}

function computeStats(values: number[]): TemperatureSeriesStats | null {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const delta = max - min;

  let stdDev = 0;
  if (values.length >= 2) {
    const variance =
      values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1);
    stdDev = Math.sqrt(variance);
  }

  return { avg, min, max, delta, stdDev };
}

function aggregateStats(
  values: number[]
): Omit<
  TemperatureAggregateSummary,
  | "passCount"
  | "warningCount"
  | "failCount"
  | "overallVerdict"
  | "overallMessage"
  | "socketCount"
> {
  if (values.length === 0) {
    return {
      avgTemp: null,
      minTemp: null,
      maxTemp: null,
      tempRange: null,
      stdDev: null,
    };
  }

  const minTemp = Math.min(...values);
  const maxTemp = Math.max(...values);
  const avgTemp = values.reduce((a, b) => a + b, 0) / values.length;
  const tempRange = maxTemp - minTemp;

  let stdDev = 0;
  if (values.length >= 2) {
    const variance =
      values.reduce((s, v) => s + (v - avgTemp) ** 2, 0) / (values.length - 1);
    stdDev = Math.sqrt(variance);
  }

  return { avgTemp, minTemp, maxTemp, tempRange, stdDev };
}

function sortRunsByTime(parsed: ParsedCsv, barcode: string, socket: string) {
  const runs = findRunsForBarcodeSocket(parsed, barcode, socket, "retest");
  return [...runs].sort((a, b) => {
    const ta =
      parsed.rows[a.rowIndex].StartTime ||
      parsed.rows[a.rowIndex].timeStamp ||
      "";
    const tb =
      parsed.rows[b.rowIndex].StartTime ||
      parsed.rows[b.rowIndex].timeStamp ||
      "";
    return ta.localeCompare(tb);
  });
}

function buildSocketSeries(
  parsed: ParsedCsv,
  runs: ReturnType<typeof findRunsForBarcodeSocket>,
  socket: string,
  header: string,
  limits: TemperatureLimits
): TemperatureSocketSeries | null {
  const points: TemperaturePoint[] = [];

  runs.forEach((run, i) => {
    const row = parsed.rows[run.rowIndex];
    const value = parseTemp(row, header);
    if (value === null) return;
    const timestamp =
      row.StartTime || row.timeStamp || row.EndTime || `Run ${i + 1}`;
    points.push({ seq: i + 1, timestamp, value });
  });

  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const stats = computeStats(values)!;
  const { verdict, specOut } = computeVerdictForValues(values, limits);
  const firstRow = parsed.rows[runs[0].rowIndex];
  const socketLabel = resolveSocketDisplayLabel(socket, firstRow);

  return {
    socket,
    socketLabel,
    points,
    stats,
    verdict,
    statusLabel: verdictStatusLabel(verdict),
    message: verdictMessage(verdict, { specOut }),
  };
}

function buildBarcodeSeries(
  parsed: ParsedCsv,
  barcode: string,
  header: string,
  socketOrder: string[],
  limits: TemperatureLimits
): TemperatureBarcodeSeries | null {
  const readings: TemperatureSocketReading[] = [];

  for (let i = 0; i < socketOrder.length; i++) {
    const socket = socketOrder[i];
    const runs = sortRunsByTime(parsed, barcode, socket);

    for (const run of runs) {
      const row = parsed.rows[run.rowIndex];
      const value = parseTemp(row, header);
      if (value === null) continue;

      const { verdict, specOut } = verdictForSingleReading(value, limits);

      readings.push({
        runId: run.runId,
        rowIndex: run.rowIndex,
        socket,
        socketIndex: i + 1,
        socketLabel: resolveSocketDisplayLabel(socket, row),
        value,
        verdict,
        specOut,
        testSequence: run.testSequence,
        attemptLabel: run.attemptLabel,
        timestamp: run.timestamp,
      });
    }
  }

  if (readings.length === 0) return null;

  const values = readings.map((r) => r.value);
  const stats = computeStats(values)!;
  const verdict = worstVerdict(readings.map((r) => r.verdict));
  const hasSpecOut = readings.some((r) => r.specOut);

  return {
    barcode,
    barcodeLabel: formatBarcodeChartLabel(barcode),
    readings,
    stats,
    verdict,
    statusLabel: verdictStatusLabel(verdict),
    message: verdictMessage(verdict, { specOut: hasSpecOut && verdict === "fail" }),
  };
}

function buildRunResultRow(
  parsed: ParsedCsv,
  run: ReturnType<typeof findRunsForBarcodeSocket>[number],
  barcode: string,
  socket: string,
  branch: TemperatureBranch,
  header: string,
  limits: TemperatureLimits
): TemperatureResultRow | null {
  const row = parsed.rows[run.rowIndex];
  const value = parseTemp(row, header);
  if (value === null) return null;

  const { verdict, specOut } = verdictForSingleReading(value, limits);

  return {
    runId: run.runId,
    rowIndex: run.rowIndex,
    barcode,
    socket,
    socketLabel: resolveSocketDisplayLabel(socket, row),
    branch,
    header,
    avgTemp: value,
    minTemp: value,
    maxTemp: value,
    deltaTemp: 0,
    stdDev: 0,
    verdict,
    statusLabel: verdictStatusLabel(verdict),
    message: verdictMessage(verdict, { specOut }),
    pointCount: 1,
    limits,
    testSequence: run.testSequence,
    attemptLabel: run.attemptLabel,
    timestamp: run.timestamp,
  };
}

export function analyzeTemperatureOverview(
  parsed: ParsedCsv,
  branch: TemperatureBranch
): TemperatureOverviewAnalysis | null {
  const header = findNtcHeaderForBranch(parsed.headers, branch);
  if (!header) return null;

  const limits = getBranchLimits(parsed, header, branch);
  const socketOrder = listAllSockets(parsed);
  if (socketOrder.length === 0) return null;

  const barcodes: TemperatureBarcodeSeries[] = [];
  for (const barcode of listBarcodes(parsed)) {
    const series = buildBarcodeSeries(
      parsed,
      barcode,
      header,
      socketOrder,
      limits
    );
    if (series) barcodes.push(series);
  }

  if (barcodes.length === 0) return null;

  const allValues = barcodes.flatMap((b) => b.readings.map((r) => r.value));
  const agg = aggregateStats(allValues);
  const passCount = barcodes.filter((b) => b.verdict === "pass").length;
  const warningCount = barcodes.filter((b) => b.verdict === "warning").length;
  const failCount = barcodes.filter((b) => b.verdict === "fail").length;

  let overallVerdict: TemperatureVerdict = "pass";
  if (failCount > 0) overallVerdict = "fail";
  else if (warningCount > 0) overallVerdict = "warning";

  return {
    branch,
    header,
    limits,
    socketOrder,
    barcodes,
    summary: {
      barcodeCount: barcodes.length,
      socketCount: socketOrder.length,
      ...agg,
      passCount,
      warningCount,
      failCount,
      overallVerdict,
      overallMessage: verdictMessage(overallVerdict),
    },
  };
}

export function analyzeTemperatureBarcode(
  parsed: ParsedCsv,
  barcode: string,
  branch: TemperatureBranch,
  socketFilter?: string
): TemperatureBarcodeAnalysis | null {
  const header = findNtcHeaderForBranch(parsed.headers, branch);
  if (!header) return null;

  const limits = getBranchLimits(parsed, header, branch);
  const sockets = listSocketsForBarcode(parsed, barcode).filter(
    (socket) => !socketFilter || socket === socketFilter
  );

  const series: TemperatureSocketSeries[] = [];
  for (const socket of sockets) {
    const runs = sortRunsByTime(parsed, barcode, socket);
    const socketSeries = buildSocketSeries(parsed, runs, socket, header, limits);
    if (socketSeries) series.push(socketSeries);
  }

  if (series.length === 0) return null;

  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const agg = aggregateStats(allValues);
  const passCount = series.filter((s) => s.verdict === "pass").length;
  const warningCount = series.filter((s) => s.verdict === "warning").length;
  const failCount = series.filter((s) => s.verdict === "fail").length;

  let overallVerdict: TemperatureVerdict = "pass";
  if (failCount > 0) overallVerdict = "fail";
  else if (warningCount > 0) overallVerdict = "warning";

  return {
    barcode,
    branch,
    header,
    limits,
    maxSequenceCount: Math.max(...series.map((s) => s.points.length)),
    sockets: series,
    summary: {
      socketCount: series.length,
      ...agg,
      passCount,
      warningCount,
      failCount,
      overallVerdict,
      overallMessage: verdictMessage(overallVerdict),
    },
  };
}

export function analyzeAllTemperatureRows(
  parsed: ParsedCsv,
  branch: TemperatureBranch
): TemperatureResultRow[] {
  const header = findNtcHeaderForBranch(parsed.headers, branch);
  if (!header) return [];

  const limits = getBranchLimits(parsed, header, branch);
  const rows: TemperatureResultRow[] = [];

  for (const barcode of listBarcodes(parsed)) {
    for (const socket of listSocketsForBarcode(parsed, barcode)) {
      const runs = sortRunsByTime(parsed, barcode, socket);
      for (const run of runs) {
        const row = buildRunResultRow(
          parsed,
          run,
          barcode,
          socket,
          branch,
          header,
          limits
        );
        if (row) rows.push(row);
      }
    }
  }

  return rows;
}

export function computeTemperatureBatchSummary(
  rows: TemperatureResultRow[]
): TemperatureBatchSummary {
  const total = rows.length;
  const pass = rows.filter((r) => r.verdict === "pass").length;
  const warning = rows.filter((r) => r.verdict === "warning").length;
  const fail = rows.filter((r) => r.verdict === "fail").length;

  const allValues = rows.map((r) => r.avgTemp);
  const agg = aggregateStats(allValues);

  let overallVerdict: TemperatureVerdict = "pass";
  if (fail > 0) overallVerdict = "fail";
  else if (warning > 0) overallVerdict = "warning";

  const retest = computeRetestSummary(
    rows.map((r) => ({
      barcode: r.barcode,
      socket: r.socket,
      testSequence: r.testSequence,
    })),
    (r) =>
      rows.some(
        (row) =>
          row.barcode === r.barcode &&
          row.socket === r.socket &&
          row.testSequence === r.testSequence &&
          row.verdict === "pass"
      )
  );

  return {
    total,
    pass,
    warning,
    fail,
    passRate: total > 0 ? (pass / total) * 100 : 0,
    warningRate: total > 0 ? (warning / total) * 100 : 0,
    failRate: total > 0 ? (fail / total) * 100 : 0,
    socketCount: new Set(rows.map((r) => r.socket)).size,
    uniqueBarcodes: retest.uniqueBarcodes,
    retestCount: retest.retestCount,
    retestRate: retest.retestRate,
    passAfterRetest: retest.passAfterRetest,
    failAfterRetest: retest.failAfterRetest,
    ...agg,
    passCount: pass,
    warningCount: warning,
    failCount: fail,
    overallVerdict,
    overallMessage: verdictMessage(overallVerdict),
  };
}

export function filterTemperatureRows(
  rows: TemperatureResultRow[],
  filter: TemperatureFilter
): TemperatureResultRow[] {
  if (filter === "all") return rows;
  return rows.filter((r) => r.verdict === filter);
}

export function filterLabel(filter: TemperatureFilter): string {
  switch (filter) {
    case "all":
      return "ALL";
    case "pass":
      return "PASS";
    case "warning":
      return "WARNING";
    case "fail":
      return "FAIL";
  }
}

export function buildOverviewChartData(
  analysis: TemperatureOverviewAnalysis,
  barcodes: TemperatureBarcodeSeries[]
): TemperatureChartPoint[] {
  if (barcodes.length === 0) return [];

  return analysis.socketOrder.map((socket, i) => {
    const point: TemperatureChartPoint = {
      socket,
      socketLabel: formatSocketChartLabel(socket),
      socketIndex: i + 1,
    };

    for (const bc of barcodes) {
      const reading = bc.readings.find((r) => r.socket === socket);
      if (reading) point[bc.barcode] = reading.value;
    }

    return point;
  });
}

export function filterOverviewBarcodes(
  analysis: TemperatureOverviewAnalysis,
  filter: TemperatureFilter
): TemperatureBarcodeSeries[] {
  if (filter === "all") return analysis.barcodes;
  return analysis.barcodes.filter((b) => b.verdict === filter);
}

export function computeOverallAverageFromBarcodes(
  barcodes: TemperatureBarcodeSeries[]
): number | null {
  const values = barcodes.flatMap((b) => b.readings.map((r) => r.value));
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function makeTemperatureReadingKey(
  barcode: string,
  runId: string
): string {
  return `${barcode}|${runId}`;
}

export function isTemperatureReadingExcluded(
  barcode: string,
  runId: string,
  excludedKeys: ReadonlySet<string>
): boolean {
  return excludedKeys.has(makeTemperatureReadingKey(barcode, runId));
}

function recomputeBarcodeSeries(
  series: TemperatureBarcodeSeries
): TemperatureBarcodeSeries | null {
  if (series.readings.length === 0) return null;

  const values = series.readings.map((r) => r.value);
  const stats = computeStats(values);
  if (!stats) return null;

  const verdict = worstVerdict(series.readings.map((r) => r.verdict));
  const hasSpecOut = series.readings.some((r) => r.specOut);

  return {
    ...series,
    stats,
    verdict,
    statusLabel: verdictStatusLabel(verdict),
    message: verdictMessage(verdict, { specOut: hasSpecOut && verdict === "fail" }),
  };
}

function buildOverviewSummary(
  barcodes: TemperatureBarcodeSeries[],
  socketCount: number
): TemperatureOverviewAnalysis["summary"] {
  const allValues = barcodes.flatMap((b) => b.readings.map((r) => r.value));
  const agg = aggregateStats(allValues);
  const passCount = barcodes.filter((b) => b.verdict === "pass").length;
  const warningCount = barcodes.filter((b) => b.verdict === "warning").length;
  const failCount = barcodes.filter((b) => b.verdict === "fail").length;

  let overallVerdict: TemperatureVerdict = "pass";
  if (failCount > 0) overallVerdict = "fail";
  else if (warningCount > 0) overallVerdict = "warning";

  return {
    barcodeCount: barcodes.length,
    socketCount,
    ...agg,
    passCount,
    warningCount,
    failCount,
    overallVerdict,
    overallMessage: verdictMessage(overallVerdict),
  };
}

export function applyExcludedReadingsToOverview(
  analysis: TemperatureOverviewAnalysis,
  excludedKeys: ReadonlySet<string>
): TemperatureOverviewAnalysis {
  if (excludedKeys.size === 0) return analysis;

  const barcodes = analysis.barcodes
    .map((bc) => {
      const readings = bc.readings.filter(
        (r) => !isTemperatureReadingExcluded(bc.barcode, r.runId, excludedKeys)
      );
      return recomputeBarcodeSeries({ ...bc, readings });
    })
    .filter((bc): bc is TemperatureBarcodeSeries => bc !== null);

  return {
    ...analysis,
    barcodes,
    summary: buildOverviewSummary(barcodes, analysis.socketOrder.length),
  };
}

export function applyExcludedReadingsToRows(
  rows: TemperatureResultRow[],
  excludedKeys: ReadonlySet<string>
): TemperatureResultRow[] {
  if (excludedKeys.size === 0) return rows;
  return rows.filter(
    (r) => !isTemperatureReadingExcluded(r.barcode, r.runId, excludedKeys)
  );
}

export function listExcludedTemperatureReadings(
  analysis: TemperatureOverviewAnalysis,
  excludedKeys: ReadonlySet<string>
): TemperatureExcludedReading[] {
  if (excludedKeys.size === 0) return [];

  const excluded: TemperatureExcludedReading[] = [];
  for (const bc of analysis.barcodes) {
    for (const reading of bc.readings) {
      if (!isTemperatureReadingExcluded(bc.barcode, reading.runId, excludedKeys)) {
        continue;
      }
      excluded.push({
        key: makeTemperatureReadingKey(bc.barcode, reading.runId),
        barcode: bc.barcode,
        barcodeLabel: bc.barcodeLabel,
        runId: reading.runId,
        socket: reading.socket,
        socketLabel: reading.socketLabel,
        value: reading.value,
        attemptLabel: reading.attemptLabel,
      });
    }
  }
  return excluded;
}
