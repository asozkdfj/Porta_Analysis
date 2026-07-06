import Papa from "papaparse";

/** Config 조회 실패 시 그래프 축 Fallback */
export const FALLBACK_AXIS_RANGE = { lower: -1, upper: 1 } as const;

const META_ITEMS = new Set(["serialnumber", "testerid", "starttime"]);
const SKIP_ROW_PREFIX = "//";

export type SpecMatchType = "exact" | "case-insensitive" | "normalized" | "contains" | "fallback";

export type GrrConfigMatchStatus = "matched" | "missing" | "ambiguous";

export interface GrrConfigSpecResolution {
  metric: string;
  matchStatus: GrrConfigMatchStatus;
  matchType: SpecMatchType | "none";
  matchedItem: string | null;
  ambiguousCandidates: string[];
  lower: number | null;
  upper: number | null;
  grrStdev: number | null;
  grrLimit: number | null;
  unit: string;
}

interface ConfigMatchCandidate {
  entry: GaiaSpecEntry;
  matchType: SpecMatchType;
  score: number;
}

export interface GaiaSpecEntry {
  item: string;
  grrStdev: number | null;
  grrLimit: number | null;
  upper: number | null;
  lower: number | null;
  unit: string;
}

export interface GaiaSpecLookup {
  lower: number;
  upper: number;
  grrStdev: number | null;
  grrLimit: number | null;
  unit: string;
  matchedItem: string;
  matchType: SpecMatchType;
}

export interface GaiaSpecStore {
  version: string;
  entries: GaiaSpecEntry[];
  byItem: Map<string, GaiaSpecEntry>;
}

export interface ConfigValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  item?: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  version: string;
  itemCount: number;
  issues: ConfigValidationIssue[];
}

export interface CoverageReport {
  registered: number;
  total: number;
  coveragePercent: number;
  missing: string[];
  matched: { metric: string; configItem: string; matchType: SpecMatchType }[];
}

function parseNumber(value: string | undefined): number | null {
  if (!value || !value.trim()) return null;
  const v = value.trim();
  if (v.toUpperCase() === "NA" || v === "-") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Test Item / Header 이름 정규화 (대소문자, 공백, 구분자 무시) */
export function normalizeMetricKey(metric: string): string {
  return metric
    .trim()
    .replace(/^PROX::MOD_/i, "")
    .replace(/^MOD_/i, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .toUpperCase();
}

/** Contains/normalized 매칭용 — underscore·hyphen·공백 제거 */
export function looseNormalizeKey(metric: string): string {
  return normalizeMetricKey(metric).replace(/[_\s-]/g, "");
}

function extractTempBranch(text: string): string | null {
  const m = text.toUpperCase().match(/(?:LIW|MOD_LIW)?(\d+)C/);
  return m ? `${m[1]}C` : null;
}

/**
 * GaiaStat2grrConfig CSV 파싱
 * 1행: 버전/제품명, 2행: 헤더, 3행: 구분, 4행~: Item + GRR Stdev/Limit/Upper ERS/Lower ERS/Unit
 */
export function parseGaiaSpecConfig(csvText: string): GaiaSpecStore {
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? "Config CSV 파싱 오류");
  }

  const rows = parsed.data;
  if (rows.length < 4) {
    throw new Error("GaiaStat2grrConfig 형식이 올바르지 않습니다 (최소 4행 필요).");
  }

  const version = (rows[0][0] ?? "").trim();
  const entries: GaiaSpecEntry[] = [];
  const byItem = new Map<string, GaiaSpecEntry>();

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    const item = (row[0] ?? "").trim();
    if (!item || item.startsWith(SKIP_ROW_PREFIX)) continue;
    if (META_ITEMS.has(item.toLowerCase())) continue;

    const entry: GaiaSpecEntry = {
      item,
      grrStdev: parseNumber(row[1]),
      grrLimit: parseNumber(row[2]),
      upper: parseNumber(row[3]),
      lower: parseNumber(row[4]),
      unit: (row[5] ?? "").trim(),
    };

    entries.push(entry);
    byItem.set(item, entry);
  }

  return { version, entries, byItem };
}

export function tryGetGaiaSpecForItem(
  metric: string,
  store: GaiaSpecStore | null
): GaiaSpecLookup | null {
  const entry = findConfigEntryForMetric(metric, store);
  if (!entry || !hasAxisSpec(entry.entry)) return null;
  return toLookup(entry.entry, entry.matchType);
}

function findConfigMatchCandidates(
  metric: string,
  store: GaiaSpecStore | null
): ConfigMatchCandidate[] {
  if (!store || !metric) return [];

  const exact = store.byItem.get(metric);
  if (exact) return [{ entry: exact, matchType: "exact", score: 1000 }];

  const ciKey = [...store.byItem.keys()].find(
    (k) => k.toLowerCase() === metric.toLowerCase()
  );
  if (ciKey) {
    return [{ entry: store.byItem.get(ciKey)!, matchType: "case-insensitive", score: 900 }];
  }

  const normMetric = normalizeMetricKey(metric);
  const looseMetric = looseNormalizeKey(metric);
  const normalizedMatches = store.entries.filter(
    (e) =>
      normalizeMetricKey(e.item) === normMetric ||
      looseNormalizeKey(e.item) === looseMetric
  );
  if (normalizedMatches.length === 1) {
    return [{ entry: normalizedMatches[0], matchType: "normalized", score: 850 }];
  }
  if (normalizedMatches.length > 1) {
    return normalizedMatches.map((entry) => ({
      entry,
      matchType: "normalized" as const,
      score: 850,
    }));
  }

  const m = metric.toUpperCase();
  const containsCandidates: ConfigMatchCandidate[] = [];

  for (const entry of store.entries) {
    const item = entry.item.toUpperCase();
    const looseItem = looseNormalizeKey(entry.item);
    let score = 0;

    if (m === item) score = 800;
    else if (m.includes(item)) score = item.length + 100;
    else if (item.includes(m)) score = m.length + 50;
    else if (looseItem.length >= 6 && looseMetric.includes(looseItem)) {
      score = looseItem.length + 40;
    } else if (looseMetric.length >= 6 && looseItem.includes(looseMetric)) {
      score = looseMetric.length + 30;
    } else if (
      m.includes("NTC_TEMP_PRE_25MA_70MA_AVG") &&
      item.includes("NTC_TEMP_PRE_25MA_70MA_AVG")
    ) {
      const metricBranch = extractTempBranch(m);
      const itemBranch = extractTempBranch(item);
      if (!metricBranch || !itemBranch || metricBranch === itemBranch) {
        score = 80 + item.length;
      }
    }

    if (score > 0) {
      containsCandidates.push({ entry, matchType: "contains", score });
    }
  }

  if (containsCandidates.length === 0) return [];

  const maxScore = Math.max(...containsCandidates.map((c) => c.score));
  return containsCandidates.filter((c) => c.score === maxScore);
}

/** GrrConfig reference file 기준 Metric → 전체 spec row 조회 */
export function resolveGrrConfigSpec(
  metric: string,
  store: GaiaSpecStore | null
): GrrConfigSpecResolution {
  const empty: GrrConfigSpecResolution = {
    metric,
    matchStatus: "missing",
    matchType: "none",
    matchedItem: null,
    ambiguousCandidates: [],
    lower: null,
    upper: null,
    grrStdev: null,
    grrLimit: null,
    unit: "",
  };

  const candidates = findConfigMatchCandidates(metric, store);
  if (candidates.length === 0) return empty;

  if (candidates.length > 1) {
    return {
      ...empty,
      matchStatus: "ambiguous",
      matchType: candidates[0].matchType,
      ambiguousCandidates: candidates.map((c) => c.entry.item),
    };
  }

  const { entry, matchType } = candidates[0];
  return {
    metric,
    matchStatus: "matched",
    matchType,
    matchedItem: entry.item,
    ambiguousCandidates: [],
    lower: entry.lower,
    upper: entry.upper,
    grrStdev: entry.grrStdev,
    grrLimit: entry.grrLimit,
    unit: entry.unit,
  };
}

/** ERS Spec 없어도 GRR Stdev/Limit 등 Config 메타 조회 */
export function findConfigEntryForMetric(
  metric: string,
  store: GaiaSpecStore | null
): { entry: GaiaSpecEntry; matchType: SpecMatchType } | null {
  const resolution = resolveGrrConfigSpec(metric, store);
  if (resolution.matchStatus !== "matched" || !resolution.matchedItem) return null;
  const entry = store?.byItem.get(resolution.matchedItem);
  if (!entry) return null;
  return {
    entry,
    matchType:
      resolution.matchType === "none" || resolution.matchType === "fallback"
        ? "contains"
        : resolution.matchType,
  };
}

export function getAxisDomain(
  metric: string,
  store: GaiaSpecStore | null,
  _csvLower: number | null = null,
  _csvUpper: number | null = null
): { domain: [number, number]; source: SpecMatchType | "csv" | "fallback"; matchedItem?: string } {
  const resolution = resolveGrrConfigSpec(metric, store);
  if (
    resolution.matchStatus === "matched" &&
    isFullAxisSpec(resolution.lower, resolution.upper)
  ) {
    const source: SpecMatchType | "csv" | "fallback" =
      resolution.matchType === "none" || resolution.matchType === "fallback"
        ? "fallback"
        : resolution.matchType;
    return {
      domain: [resolution.lower!, resolution.upper!],
      source,
      matchedItem: resolution.matchedItem ?? undefined,
    };
  }

  return {
    domain: [FALLBACK_AXIS_RANGE.lower, FALLBACK_AXIS_RANGE.upper],
    source: "fallback",
  };
}

export function getSpecForJudgment(
  metric: string,
  store: GaiaSpecStore | null,
  _csvLower: number | null = null,
  _csvUpper: number | null = null
): {
  lower: number | null;
  upper: number | null;
  grrStdev: number | null;
  grrLimit: number | null;
  unit?: string;
  source: SpecMatchType | "csv" | "fallback" | "none" | "ambiguous";
  matchedItem?: string;
  matchStatus: GrrConfigMatchStatus;
  ambiguousCandidates: string[];
} {
  const resolution = resolveGrrConfigSpec(metric, store);

  if (resolution.matchStatus === "ambiguous") {
    return {
      lower: null,
      upper: null,
      grrStdev: null,
      grrLimit: null,
      source: "ambiguous",
      matchStatus: "ambiguous",
      ambiguousCandidates: resolution.ambiguousCandidates,
    };
  }

  if (resolution.matchStatus === "missing") {
    return {
      lower: null,
      upper: null,
      grrStdev: null,
      grrLimit: null,
      source: "none",
      matchStatus: "missing",
      ambiguousCandidates: [],
    };
  }

  return {
    lower: resolution.lower,
    upper: resolution.upper,
    grrStdev: resolution.grrStdev,
    grrLimit: resolution.grrLimit,
    unit: resolution.unit,
    source: resolution.matchType,
    matchedItem: resolution.matchedItem ?? undefined,
    matchStatus: "matched",
    ambiguousCandidates: [],
  };
}

export function validateGaiaSpecConfig(store: GaiaSpecStore): ConfigValidationResult {
  const issues: ConfigValidationIssue[] = [];
  const seen = new Map<string, string>();

  for (const entry of store.entries) {
    const key = entry.item.toLowerCase();
    if (seen.has(key)) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_ITEM",
        message: `중복 Item: ${entry.item}`,
        item: entry.item,
      });
    } else {
      seen.set(key, entry.item);
    }

    if (entry.upper !== null && entry.lower !== null && entry.lower >= entry.upper) {
      issues.push({
        severity: "error",
        code: "INVALID_SPEC_RANGE",
        message: `Lower >= Upper: ${entry.item} (${entry.lower} ~ ${entry.upper})`,
        item: entry.item,
      });
    }

    if (entry.upper === null && entry.lower === null) {
      issues.push({
        severity: "warning",
        code: "MISSING_SPEC",
        message: `Spec 없음: ${entry.item}`,
        item: entry.item,
      });
    }
  }

  if (!store.version) {
    issues.push({
      severity: "warning",
      code: "MISSING_VERSION",
      message: "Config 버전(1행)이 비어 있습니다.",
    });
  }

  return {
    valid: !issues.some((i) => i.severity === "error"),
    version: store.version,
    itemCount: store.entries.length,
    issues,
  };
}

export function validateMetricCoverage(
  metrics: string[],
  store: GaiaSpecStore | null
): CoverageReport {
  const matched: CoverageReport["matched"] = [];
  const missing: string[] = [];

  for (const metric of metrics) {
    const resolution = resolveGrrConfigSpec(metric, store);
    if (resolution.matchStatus === "matched" && hasAnySpecLimit(resolution.lower, resolution.upper)) {
      const matchType: SpecMatchType =
        resolution.matchType === "none" || resolution.matchType === "fallback"
          ? "contains"
          : resolution.matchType;
      matched.push({
        metric,
        configItem: resolution.matchedItem ?? metric,
        matchType,
      });
    } else {
      missing.push(metric);
    }
  }

  const total = metrics.length;
  const registered = matched.length;

  return {
    registered,
    total,
    coveragePercent: total > 0 ? Math.round((registered / total) * 100) : 0,
    missing,
    matched,
  };
}

function hasAxisSpec(entry: GaiaSpecEntry): boolean {
  return isFullAxisSpec(entry.lower, entry.upper);
}

export function isFullAxisSpec(
  lower: number | null,
  upper: number | null
): boolean {
  return lower !== null && upper !== null && lower < upper;
}

export function hasAnySpecLimit(
  lower: number | null,
  upper: number | null
): boolean {
  return lower !== null || upper !== null;
}

function toLookup(entry: GaiaSpecEntry, matchType: SpecMatchType): GaiaSpecLookup {
  return {
    lower: entry.lower!,
    upper: entry.upper!,
    grrStdev: entry.grrStdev,
    grrLimit: entry.grrLimit,
    unit: entry.unit,
    matchedItem: entry.item,
    matchType,
  };
}
