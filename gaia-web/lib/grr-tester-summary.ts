import { resolveGrrConfigSpec, type GaiaSpecStore } from "./gaia-spec-config";
import { analyzeGaiaGrr } from "./grr-calculator";
import {
  buildGaiaStat2GrrSummary,
  type GaiaStat2GrrResultLabel,
  type GaiaStat2GrrSummary,
} from "./gaia-stat2-grr-summary";
import { findMetricsForGroup, resolveAnalysisGroupForHeader } from "./groups";
import {
  listAllReferenceConfigItems,
  resolveHeaderForConfigItem,
} from "./metric-filter";
import type { AnalysisGroup, ParsedCsv } from "./types";

export type GrrTesterSummaryScope = "group" | "reference_all";

export interface GrrTesterSummaryFomRow {
  fom: string;
  grrResult: GaiaStat2GrrResultLabel;
  pctErrMin: number;
  pctErrMax: number;
}

export interface GrrTesterSummary {
  testerId: string;
  isTargetTester: boolean;
  grrResult: GaiaStat2GrrResultLabel;
  pctErrMin: number;
  pctErrMax: number;
  rows: GrrTesterSummaryFomRow[];
  scope?: GrrTesterSummaryScope;
}

export interface GrrSummaryReport {
  scope?: GrrTesterSummaryScope;
  activeTester?: string;
  testers: GrrTesterSummary[];
}

export function listSocketsFromParsed(parsed: ParsedCsv): string[] {
  const set = new Set<string>();
  for (const row of parsed.rows) {
    const socket = row[parsed.socketKey]?.trim();
    if (socket) set.add(socket);
  }
  return [...set].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

/** GRR Summary: 데이터 없음(check/limit_missing) → pass, NA(null) → 0 */
function normalizeSummaryResult(
  result: GaiaStat2GrrResultLabel
): GaiaStat2GrrResultLabel {
  if (result === "check" || result === "grr_limit_missing") return "pass";
  return result;
}

function normalizePct(value: number | null): number {
  return value ?? 0;
}

function aggregateGrrResult(
  rows: GrrTesterSummaryFomRow[]
): GaiaStat2GrrResultLabel {
  if (rows.length === 0) return "pass";
  if (rows.some((r) => r.grrResult === "fail")) return "fail";
  return "pass";
}

function buildSummaryRow(
  fom: string,
  stat2: GaiaStat2GrrSummary
): GrrTesterSummaryFomRow {
  return {
    fom,
    grrResult: normalizeSummaryResult(stat2.grrResult),
    pctErrMin: normalizePct(stat2.grrPctErrMin),
    pctErrMax: normalizePct(stat2.grrPctErrMax),
  };
}

function missingDataRow(fom: string): GrrTesterSummaryFomRow {
  return {
    fom,
    grrResult: "pass",
    pctErrMin: 0,
    pctErrMax: 0,
  };
}

function finalizeSummary(
  testerId: string,
  rows: GrrTesterSummaryFomRow[],
  options?: {
    activeTester?: string;
    scope?: GrrTesterSummaryScope;
  }
): GrrTesterSummary {
  return {
    testerId,
    isTargetTester: testerId === options?.activeTester,
    grrResult: aggregateGrrResult(rows),
    pctErrMin: rows.length > 0 ? Math.min(...rows.map((r) => r.pctErrMin)) : 0,
    pctErrMax: rows.length > 0 ? Math.max(...rows.map((r) => r.pctErrMax)) : 0,
    rows,
    scope: options?.scope,
  };
}

function evaluateConfigItemRow(
  parsed: ParsedCsv,
  specStore: GaiaSpecStore,
  configItem: string,
  testerId: string,
  options?: {
    serialFilter?: string;
    configVersion?: string | null;
  }
): GrrTesterSummaryFomRow {
  const resolved = resolveHeaderForConfigItem(configItem, parsed.headers);
  if (!resolved) {
    return missingDataRow(configItem);
  }

  const group = resolveAnalysisGroupForHeader(resolved);
  const analysis = analyzeGaiaGrr(parsed, group, resolved, {
    specStore,
    referenceSocket: testerId,
    serialFilter: options?.serialFilter,
  });

  if (analysis.serials.length === 0) {
    return missingDataRow(configItem);
  }

  const stat2 = buildGaiaStat2GrrSummary(
    analysis,
    options?.configVersion ?? null
  );

  return buildSummaryRow(configItem, stat2);
}

function buildSingleTesterReferenceSummary(
  parsed: ParsedCsv,
  specStore: GaiaSpecStore,
  testerId: string,
  options?: {
    activeTester?: string;
    serialFilter?: string;
    configVersion?: string | null;
  }
): GrrTesterSummary {
  const configItems = listAllReferenceConfigItems(specStore);
  const rows = configItems.map((configItem) =>
    evaluateConfigItemRow(parsed, specStore, configItem, testerId, options)
  );

  return finalizeSummary(testerId, rows, {
    activeTester: options?.activeTester,
    scope: "reference_all",
  });
}

/** GaiaStat2 GRR Summary — Tester(소켓) 기준 현재 Analysis Group FOM 요약 */
export function buildGrrTesterSummary(
  parsed: ParsedCsv,
  group: AnalysisGroup,
  specStore: GaiaSpecStore | null,
  testerId: string,
  options?: {
    activeTester?: string;
    liwBranch?: "50C" | "20C" | "all";
    serialFilter?: string;
    configVersion?: string | null;
  }
): GrrTesterSummary | null {
  if (!specStore) return null;

  const liwBranch = options?.liwBranch ?? "all";
  const { metrics } = findMetricsForGroup(parsed.headers, group, {
    liwBranch,
    specStore,
  });

  const rows: GrrTesterSummaryFomRow[] = [];

  for (const metric of metrics) {
    if (resolveGrrConfigSpec(metric, specStore).matchStatus !== "matched") {
      continue;
    }

    const analysis = analyzeGaiaGrr(parsed, group, metric, {
      specStore,
      referenceSocket: testerId,
      serialFilter: options?.serialFilter,
    });

    const stat2 = buildGaiaStat2GrrSummary(
      analysis,
      options?.configVersion ?? null
    );

    rows.push(buildSummaryRow(metric, stat2));
  }

  if (rows.length === 0) return null;

  return finalizeSummary(testerId, rows, {
    activeTester: options?.activeTester,
    scope: "group",
  });
}

/** Reference(GrrConfig) 전체 Test Item · 단일 Tester 요약 */
export function buildGrrFullReferenceSummary(
  parsed: ParsedCsv,
  specStore: GaiaSpecStore | null,
  testerId: string,
  options?: {
    activeTester?: string;
    serialFilter?: string;
    configVersion?: string | null;
  }
): GrrTesterSummary | null {
  if (!specStore || specStore.entries.length === 0) return null;

  return buildSingleTesterReferenceSummary(parsed, specStore, testerId, options);
}

function buildTesterSummariesForAllSockets(
  parsed: ParsedCsv,
  specStore: GaiaSpecStore,
  testerIds: string[],
  buildOne: (
    testerId: string,
    options?: {
      activeTester?: string;
      serialFilter?: string;
      configVersion?: string | null;
    }
  ) => GrrTesterSummary | null,
  options?: {
    activeTester?: string;
    serialFilter?: string;
    configVersion?: string | null;
  }
): GrrTesterSummary[] {
  const ids =
    testerIds.length > 0 ? testerIds : listSocketsFromParsed(parsed);

  return ids
    .map((testerId) =>
      buildOne(testerId, {
        ...options,
        activeTester: options?.activeTester,
      })
    )
    .filter((summary): summary is GrrTesterSummary => summary !== null);
}

/** Reference(GrrConfig) 전체 · 모든 소켓(Tester) GRR Summary */
export function buildGrrFullReferenceReport(
  parsed: ParsedCsv,
  specStore: GaiaSpecStore | null,
  testerIds: string[],
  options?: {
    activeTester?: string;
    serialFilter?: string;
    configVersion?: string | null;
  }
): GrrSummaryReport | null {
  if (!specStore || specStore.entries.length === 0) return null;

  const testers = testerIds.map((testerId) =>
    buildSingleTesterReferenceSummary(parsed, specStore, testerId, options)
  );

  if (testers.length === 0) return null;

  return {
    scope: "reference_all",
    activeTester: options?.activeTester,
    testers,
  };
}

/** 현재 Analysis Group · 모든 소켓(Tester) GRR Summary */
export function buildGrrGroupReport(
  parsed: ParsedCsv,
  group: AnalysisGroup,
  specStore: GaiaSpecStore | null,
  testerIds: string[],
  options?: {
    activeTester?: string;
    liwBranch?: "50C" | "20C" | "all";
    serialFilter?: string;
    configVersion?: string | null;
  }
): GrrSummaryReport | null {
  if (!specStore) return null;

  const testers = buildTesterSummariesForAllSockets(
    parsed,
    specStore,
    testerIds,
    (testerId, inner) =>
      buildGrrTesterSummary(parsed, group, specStore, testerId, {
        ...options,
        ...inner,
      })
  );

  if (testers.length === 0) return null;

  return {
    scope: "group",
    activeTester: options?.activeTester,
    testers,
  };
}
