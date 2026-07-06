import type { GaiaSpecStore } from "./gaia-spec-config";
import { findMetricsWithGrrConfig, type MetricFilterSource } from "./metric-filter";
import type { AnalysisGroup } from "./types";

export const ANALYSIS_GROUPS: AnalysisGroup[] = [
  "FFBP",
  "Ranging",
  "JC",
  "LIW",
  "SMU",
];

const LIW_TEMPERATURE_BRANCHES = ["20C", "50C"] as const;

/**
 * 최우선 LIW 강제 분류 — FFBP/SMU 등 기존 매칭보다 우선 (구 ETC 예외 항목)
 */
export const FORCE_LIW_TOKENS = [
  "NCTSE_WL_CENTER_ICOMP_70",
  "CTSE_TOTAL_POWER_MWP",
  "PDLEAK",
] as const;

/** @deprecated FORCE_LIW_TOKENS 사용 */
export const FORCE_ETC_TOKENS = FORCE_LIW_TOKENS;

export function isForceLiwHeader(header: string): boolean {
  const upper = header.toUpperCase();
  return FORCE_LIW_TOKENS.some((token) => upper.includes(token));
}

/** @deprecated isForceLiwHeader 사용 */
export function isForceEtcHeader(header: string): boolean {
  return isForceLiwHeader(header);
}

/** 그룹별 헤더 매칭 규칙 */
export const GROUP_PATTERNS: Record<
  AnalysisGroup,
  { includes: string[]; excludes?: string[] }
> = {
  FFBP: {
    includes: ["FFBP", "CTSE", "NCTSE"],
  },
  Ranging: {
    includes: ["BC4MM", "BC12MM", "BC36MM", "BC150MM", "IMX_RX"],
  },
  JC: {
    includes: ["PB2PB1", "PB2", "1200NM", "1650NM"],
  },
  LIW: {
    includes: ["LIW", "CPortaGRRhelperView", "NTC_TEMP_PRE", "C_NTC_TEMP_PRE"],
  },
  SMU: {
    includes: ["CONT", "LEAKAGE", "IDD", "CAPDETECT"],
  },
};

export const GROUP_LABELS: Record<AnalysisGroup, string> = {
  FFBP: "FFBP / CTSE / NCTSE",
  Ranging: "BC4MM ~ BC150MM · IMX_RX",
  JC: "PB2 / 1200NM / 1650NM",
  LIW: "LIW · 온도(20C / 50C) · NTC · 미분류·예외 항목",
  SMU: "CONT / LEAKAGE / IDD / Capdetect",
};

function includesAnyToken(upper: string, tokens: string[]): boolean {
  return tokens.some((token) => upper.includes(token.toUpperCase()));
}

function matchByIncludes(
  upper: string,
  rule: { includes: string[]; excludes?: string[] }
): boolean {
  if (rule.includes.length === 0) return false;
  if (!includesAnyToken(upper, rule.includes)) return false;
  if (rule.excludes?.some((token) => upper.includes(token.toUpperCase()))) {
    return false;
  }
  return true;
}

/** LIW catch-all 제외 — 다른 분석 그룹(또는 LIW 명시 패턴)에 속하는지 */
export function headerMatchesAnyGroupExceptLiwCatchAll(header: string): boolean {
  if (isForceLiwHeader(header)) return false;

  for (const group of ANALYSIS_GROUPS) {
    if (group === "LIW") {
      const upper = header.toUpperCase();
      if (matchByIncludes(upper, GROUP_PATTERNS.LIW)) return true;
      for (const branch of LIW_TEMPERATURE_BRANCHES) {
        if (upper.includes(branch)) return true;
      }
      continue;
    }

    if (matchByIncludes(header.toUpperCase(), GROUP_PATTERNS[group])) return true;
  }

  return false;
}

/** @deprecated headerMatchesAnyGroupExceptLiwCatchAll 사용 */
export function headerMatchesAnyGroupExceptEtc(header: string): boolean {
  return headerMatchesAnyGroupExceptLiwCatchAll(header);
}

/** LIW 전용: 50C / 20C 분기 — contains("20C") / contains("50C") */
export function matchHeaderForGroup(
  header: string,
  group: AnalysisGroup,
  liwBranch?: "50C" | "20C" | "all"
): boolean {
  const upper = header.toUpperCase();

  if (isForceLiwHeader(header)) {
    if (group !== "LIW") return false;
    if (liwBranch && liwBranch !== "all") {
      return upper.includes(liwBranch.toUpperCase());
    }
    return true;
  }

  const rule = GROUP_PATTERNS[group];

  if (group === "LIW") {
    if (liwBranch && liwBranch !== "all") {
      return upper.includes(liwBranch.toUpperCase());
    }
    if (matchByIncludes(upper, rule)) return true;
    return !headerMatchesAnyGroupExceptLiwCatchAll(header);
  }

  return matchByIncludes(upper, rule);
}

/** GRR 분석 시 Metric이 속하는 분석 그룹 추론 */
export function resolveAnalysisGroupForHeader(header: string): AnalysisGroup {
  for (const group of ANALYSIS_GROUPS) {
    if (group === "LIW") {
      if (matchHeaderForGroup(header, "LIW", "all")) return "LIW";
      continue;
    }
    if (matchHeaderForGroup(header, group)) return group;
  }
  return "LIW";
}

export interface FindMetricsOptions {
  liwBranch?: "50C" | "20C" | "all";
  specStore?: GaiaSpecStore | null;
}

export interface FindMetricsResult {
  metrics: string[];
  filterSource: MetricFilterSource;
}

/**
 * 그룹 Metric 목록 = Reference(GrrConfig) Item ∩ CSV Header ∩ Analysis Group
 * (정책: lib/grr-metric-policy.ts — Fallback 없음)
 */
export function findMetricsForGroup(
  headers: string[],
  group: AnalysisGroup,
  liwBranchOrOptions: "50C" | "20C" | "all" | FindMetricsOptions = "all"
): FindMetricsResult {
  const options: FindMetricsOptions =
    typeof liwBranchOrOptions === "string"
      ? { liwBranch: liwBranchOrOptions }
      : liwBranchOrOptions;

  const liwBranch = options.liwBranch ?? "all";
  const result = findMetricsWithGrrConfig(
    headers,
    group,
    options.specStore ?? null,
    liwBranch
  );

  return { metrics: result.metrics, filterSource: result.source };
}
