import { getMetricValue } from "./csv-parser";
import { getSpecForJudgment, type GaiaSpecStore } from "./gaia-spec-config";
import {
  normalizeSocketLabel,
  socketsMatch,
  type GoldenComparisonResult,
  type GoldenFilter,
} from "./golden-socket-config";
import { WL_CENTER_SEARCH_TOKEN } from "./liw-grr-config";
import type { ParsedCsv } from "./types";

export type SpecResultLabel = "PASS" | "FAIL" | "SPEC MISSING" | "AMBIGUOUS SPEC MATCH";

export interface SocketGoldenRow {
  socket: string;
  normalizedSocket: string;
  metric: string;
  measuredValue: number | null;
  goldenReference: number | null;
  deltaFromGolden: number | null;
  lowerErs: number | null;
  upperErs: number | null;
  specResult: SpecResultLabel;
  goldenResult: GoldenComparisonResult;
  isGoldenSocket: boolean;
  sampleCount: number;
  failReason: string | null;
}

export interface GoldenSocketSummary {
  goldenSocket: string | null;
  goldenReference: number | null;
  totalSockets: number;
  withinGoldenLimit: number;
  outsideGoldenLimit: number;
  worstSocket: string | null;
  worstDelta: number | null;
  metric: string;
  goldenDeltaLimit: number;
}

function judgeSpecValue(
  value: number | null,
  lower: number | null,
  upper: number | null,
  matchStatus: string
): SpecResultLabel {
  if (matchStatus === "ambiguous") return "AMBIGUOUS SPEC MATCH";
  if (matchStatus === "missing" || lower === null || upper === null) return "SPEC MISSING";
  if (value === null) return "SPEC MISSING";
  if (value < lower || value > upper) return "FAIL";
  return "PASS";
}

function judgeGoldenResult(
  specResult: SpecResultLabel,
  delta: number | null,
  limit: number
): GoldenComparisonResult {
  if (specResult === "FAIL") return "FAIL";
  if (specResult === "SPEC MISSING" || specResult === "AMBIGUOUS SPEC MATCH") {
    return "N/A";
  }
  if (delta === null) return "N/A";
  if (Math.abs(delta) <= limit) return "PASS";
  return "WARNING";
}

function collectSocketValues(
  parsed: ParsedCsv,
  metric: string
): Map<string, number[]> {
  return collectSocketValuesFromHeaders(parsed, [metric]);
}

function collectSocketValuesFromHeaders(
  parsed: ParsedCsv,
  headers: string[]
): Map<string, number[]> {
  const bySocket = new Map<string, number[]>();
  const { rows, socketKey } = parsed;

  for (const row of rows) {
    const rawSocket = row[socketKey]?.trim();
    if (!rawSocket) continue;

    for (const header of headers) {
      const value = getMetricValue(row, header);
      if (value === null) continue;

      const norm = normalizeSocketLabel(rawSocket);
      const key = norm || rawSocket;
      if (!bySocket.has(key)) bySocket.set(key, []);
      bySocket.get(key)!.push(value);
    }
  }

  return bySocket;
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function analyzeGoldenSocketMetric(
  parsed: ParsedCsv,
  metric: string,
  goldenSocket: string | null,
  goldenDeltaLimit: number,
  specStore: GaiaSpecStore | null
): { rows: SocketGoldenRow[]; summary: GoldenSocketSummary } {
  return analyzeGoldenSocketMetricInternal(
    parsed,
    metric,
    collectSocketValues(parsed, metric),
    goldenSocket,
    goldenDeltaLimit,
    specStore
  );
}

function analyzeGoldenSocketMetricInternal(
  parsed: ParsedCsv,
  metricLabel: string,
  bySocket: Map<string, number[]>,
  goldenSocket: string | null,
  goldenDeltaLimit: number,
  specStore: GaiaSpecStore | null,
  specHeader?: string
): { rows: SocketGoldenRow[]; summary: GoldenSocketSummary } {
  const specInfo = getSpecForJudgment(
    specHeader ?? metricLabel,
    specStore,
    null,
    null
  );

  let goldenReference: number | null = null;
  if (goldenSocket) {
    for (const [socket, values] of bySocket) {
      if (socketsMatch(socket, goldenSocket)) {
        goldenReference = average(values);
        break;
      }
    }
  }

  const rows: SocketGoldenRow[] = [];

  for (const [socket, values] of bySocket) {
    const measuredValue = average(values);
    const isGolden = goldenSocket ? socketsMatch(socket, goldenSocket) : false;
    let delta: number | null = null;
    if (goldenSocket && goldenReference !== null) {
      delta = isGolden ? 0 : measuredValue - goldenReference;
    }

    const specResult = judgeSpecValue(
      measuredValue,
      specInfo.lower,
      specInfo.upper,
      specInfo.matchStatus
    );
    const goldenResult = goldenSocket
      ? isGolden
        ? specResult === "FAIL"
          ? "FAIL"
          : "PASS"
        : judgeGoldenResult(specResult, delta, goldenDeltaLimit)
      : "N/A";

    const failReasons: string[] = [];
    if (specResult === "FAIL") failReasons.push("ERS Out");
    if (goldenResult === "WARNING") failReasons.push("Golden Delta Out");

    rows.push({
      socket,
      normalizedSocket: normalizeSocketLabel(socket),
      metric: metricLabel,
      measuredValue,
      goldenReference,
      deltaFromGolden: isGolden ? 0 : delta,
      lowerErs: specInfo.lower,
      upperErs: specInfo.upper,
      specResult,
      goldenResult,
      isGoldenSocket: isGolden,
      sampleCount: values.length,
      failReason: failReasons.length > 0 ? failReasons.join(", ") : null,
    });
  }

  rows.sort((a, b) => {
    if (a.isGoldenSocket) return -1;
    if (b.isGoldenSocket) return 1;
    const da = Math.abs(a.deltaFromGolden ?? 0);
    const db = Math.abs(b.deltaFromGolden ?? 0);
    return da - db;
  });

  const comparable = rows.filter((r) => !r.isGoldenSocket && r.deltaFromGolden !== null);
  const within = comparable.filter(
    (r) => Math.abs(r.deltaFromGolden!) <= goldenDeltaLimit
  ).length;
  const outside = comparable.length - within;

  let worstSocket: string | null = null;
  let worstDelta: number | null = null;
  for (const r of comparable) {
    const abs = Math.abs(r.deltaFromGolden!);
    if (worstDelta === null || abs > Math.abs(worstDelta)) {
      worstDelta = r.deltaFromGolden;
      worstSocket = r.socket;
    }
  }

  return {
    rows,
    summary: {
      goldenSocket,
      goldenReference,
      totalSockets: rows.length,
      withinGoldenLimit: within,
      outsideGoldenLimit: outside,
      worstSocket,
      worstDelta,
      metric: metricLabel,
      goldenDeltaLimit,
    },
  };
}

export function filterGoldenRows(
  rows: SocketGoldenRow[],
  filter: GoldenFilter,
  limit: number
): SocketGoldenRow[] {
  switch (filter) {
    case "all":
      return rows;
    case "pass":
      return rows.filter((r) => r.goldenResult === "PASS");
    case "warning":
      return rows.filter((r) => r.goldenResult === "WARNING");
    case "fail":
      return rows.filter((r) => r.goldenResult === "FAIL");
    case "within_golden":
      return rows.filter(
        (r) =>
          r.isGoldenSocket ||
          (r.deltaFromGolden !== null && Math.abs(r.deltaFromGolden) <= limit)
      );
    case "outside_golden":
      return rows.filter(
        (r) =>
          !r.isGoldenSocket &&
          r.deltaFromGolden !== null &&
          Math.abs(r.deltaFromGolden) > limit
      );
    default:
      return rows;
  }
}

/** LIW GRR: PO / NTC / WL_CENTER Metric family */
export interface LiwGoldenMetricFamily {
  label: string;
  specHeader: string;
  valueHeaders: string[];
}

export function discoverLiwGoldenMetricFamilies(
  parsed: ParsedCsv,
  branch: "20C" | "50C"
): LiwGoldenMetricFamily[] {
  const token = `LIW${branch}`;
  const poHeaders: string[] = [];
  const ntcHeaders: string[] = [];
  const wlHeaders: string[] = [];
  let poSpecHeader = "";
  let ntcSpecHeader = "";
  let wlSpecHeader = "";

  for (const h of parsed.headers) {
    const u = h.toUpperCase();
    if (!u.includes(token)) continue;

    if (u.includes("_PO_")) {
      poHeaders.push(h);
      if (!poSpecHeader && u.includes("_PO_48MA")) poSpecHeader = h;
    }
    if (u.includes("NTC_TEMP_PRE")) {
      ntcHeaders.push(h);
      if (!ntcSpecHeader && u.includes("25MA_70MA_AVG")) ntcSpecHeader = h;
    }
    if (u.includes(WL_CENTER_SEARCH_TOKEN.toUpperCase())) {
      wlHeaders.push(h);
      if (!wlSpecHeader) wlSpecHeader = h;
    }
  }

  const families: LiwGoldenMetricFamily[] = [];
  if (poHeaders.length > 0) {
    families.push({
      label: `${token}_PO`,
      specHeader: poSpecHeader || poHeaders[0],
      valueHeaders: poHeaders,
    });
  }
  if (ntcHeaders.length > 0) {
    families.push({
      label: `${token}_NTC_TEMP_PRE`,
      specHeader: ntcSpecHeader || ntcHeaders[0],
      valueHeaders: ntcHeaders,
    });
  }
  if (wlHeaders.length > 0) {
    families.push({
      label: `${token}_WL_CENTER`,
      specHeader: wlSpecHeader || wlHeaders[0],
      valueHeaders: wlHeaders,
    });
  }
  return families;
}

export function analyzeGoldenSocketMetricFamily(
  parsed: ParsedCsv,
  family: LiwGoldenMetricFamily,
  goldenSocket: string | null,
  goldenDeltaLimit: number,
  specStore: GaiaSpecStore | null
): { rows: SocketGoldenRow[]; summary: GoldenSocketSummary } {
  const bySocket = collectSocketValuesFromHeaders(parsed, family.valueHeaders);
  return analyzeGoldenSocketMetricInternal(
    parsed,
    family.label,
    bySocket,
    goldenSocket,
    goldenDeltaLimit,
    specStore,
    family.specHeader
  );
}

export function analyzeLiwGoldenMetrics(
  parsed: ParsedCsv,
  branch: "20C" | "50C",
  goldenSocket: string | null,
  goldenDeltaLimit: number,
  specStore: GaiaSpecStore | null
): { rows: SocketGoldenRow[]; summaries: GoldenSocketSummary[] } {
  const families = discoverLiwGoldenMetricFamilies(parsed, branch);

  const allRows: SocketGoldenRow[] = [];
  const summaries: GoldenSocketSummary[] = [];

  for (const family of families) {
    const result = analyzeGoldenSocketMetricFamily(
      parsed,
      family,
      goldenSocket,
      goldenDeltaLimit,
      specStore
    );
    allRows.push(...result.rows);
    summaries.push(result.summary);
  }

  return { rows: allRows, summaries };
}
