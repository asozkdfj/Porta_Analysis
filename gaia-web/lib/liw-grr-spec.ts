import {
  resolveGrrConfigSpec,
  type GaiaSpecStore,
  type SpecMatchType,
} from "./gaia-spec-config";
import {
  WL_CENTER_SPEC_LOWER,
  WL_CENTER_SPEC_UPPER,
} from "./liw-grr-config";
import type { LinearityBranch } from "./liw-linearity-types";
import { getMetricValue } from "./csv-parser";
import type { ParsedCsv } from "./types";

export type GrrErsResult = "PASS" | "FAIL" | "SPEC MISSING" | "AMBIGUOUS SPEC MATCH";
export type GrrSpecMatchStatus = "matched" | "missing" | "ambiguous";

export interface GrrReferenceSpec {
  lower: number | null;
  upper: number | null;
  grrStdev: number | null;
  grrLimit: number | null;
  matchedItem: string | null;
  matchType: SpecMatchType | "none";
  specMatchStatus: GrrSpecMatchStatus;
  ambiguousCandidates: string[];
}

export interface GrrTestItemDef {
  header: string;
  testItem: string;
  category: "PO" | "NTC" | "WL_CENTER";
}

export interface GrrTestItemResult {
  testItem: string;
  header: string;
  category: GrrTestItemDef["category"];
  measuredValue: number | null;
  lowerErs: number | null;
  upperErs: number | null;
  grrStdev: number | null;
  grrLimit: number | null;
  result: GrrErsResult;
  specMatchStatus: GrrSpecMatchStatus;
  matchedConfigItem: string | null;
  ambiguousCandidates: string[];
}

export interface GrrSpecMappingSummary {
  totalTestItems: number;
  specMatchedCount: number;
  specMissingCount: number;
  ambiguousMatchCount: number;
  passCount: number;
  failCount: number;
  specMissingResultCount: number;
}

export function formatTestItemLabel(header: string): string {
  return header
    .replace(/^PROX::MOD_/i, "")
    .replace(/^MOD_/i, "")
    .trim();
}

export function isWlCenterHeader(header: string): boolean {
  return header.toUpperCase().includes("WL_CENTER");
}

export function resolveWlCenterFixedSpec(): GrrReferenceSpec {
  return {
    lower: WL_CENTER_SPEC_LOWER,
    upper: WL_CENTER_SPEC_UPPER,
    grrStdev: null,
    grrLimit: null,
    matchedItem: `WL_CENTER (${WL_CENTER_SPEC_LOWER}~${WL_CENTER_SPEC_UPPER})`,
    matchType: "none",
    specMatchStatus: "matched",
    ambiguousCandidates: [],
  };
}

export function resolveReferenceSpec(
  header: string,
  _branch: LinearityBranch,
  store: GaiaSpecStore | null,
  _parsed: ParsedCsv | null
): GrrReferenceSpec {
  if (isWlCenterHeader(header)) {
    return resolveWlCenterFixedSpec();
  }

  const resolution = resolveGrrConfigSpec(header, store);

  if (resolution.matchStatus === "ambiguous") {
    return {
      lower: null,
      upper: null,
      grrStdev: null,
      grrLimit: null,
      matchedItem: null,
      matchType: "none",
      specMatchStatus: "ambiguous",
      ambiguousCandidates: resolution.ambiguousCandidates,
    };
  }

  if (resolution.matchStatus === "missing") {
    return {
      lower: null,
      upper: null,
      grrStdev: null,
      grrLimit: null,
      matchedItem: null,
      matchType: "none",
      specMatchStatus: "missing",
      ambiguousCandidates: [],
    };
  }

  return {
    lower: resolution.lower,
    upper: resolution.upper,
    grrStdev: resolution.grrStdev,
    grrLimit: resolution.grrLimit,
    matchedItem: resolution.matchedItem,
    matchType: resolution.matchType === "none" ? "none" : resolution.matchType,
    specMatchStatus: "matched",
    ambiguousCandidates: [],
  };
}

export function judgeErsValue(
  value: number | null,
  spec: GrrReferenceSpec
): GrrErsResult {
  if (value === null) return "SPEC MISSING";
  if (spec.specMatchStatus === "ambiguous") return "AMBIGUOUS SPEC MATCH";
  if (spec.specMatchStatus === "missing") return "SPEC MISSING";
  if (spec.lower === null || spec.upper === null) return "SPEC MISSING";
  if (value < spec.lower || value > spec.upper) return "FAIL";
  return "PASS";
}

export function discoverGrrTestItems(
  parsed: ParsedCsv,
  branch: LinearityBranch
): GrrTestItemDef[] {
  const branchToken = `LIW${branch}`;
  const items: GrrTestItemDef[] = [];

  for (const header of parsed.headers) {
    const upper = header.toUpperCase();
    if (!upper.includes(branchToken)) continue;

    let category: GrrTestItemDef["category"] | null = null;
    if (upper.includes("_PO_")) category = "PO";
    else if (upper.includes("NTC_TEMP_PRE")) category = "NTC";
    else if (upper.includes("WL_CENTER")) category = "WL_CENTER";

    if (!category) continue;

    items.push({
      header,
      testItem: formatTestItemLabel(header),
      category,
    });
  }

  return items;
}

export function evaluateTestItem(
  header: string,
  category: GrrTestItemDef["category"],
  branch: LinearityBranch,
  store: GaiaSpecStore | null,
  parsed: ParsedCsv,
  rowIndex: number
): GrrTestItemResult {
  const spec = resolveReferenceSpec(header, branch, store, parsed);
  const measuredValue = getMetricValue(parsed.rows[rowIndex], header);

  return {
    testItem: formatTestItemLabel(header),
    header,
    category,
    measuredValue,
    lowerErs: spec.lower,
    upperErs: spec.upper,
    grrStdev: spec.grrStdev,
    grrLimit: spec.grrLimit,
    result: judgeErsValue(measuredValue, spec),
    specMatchStatus: spec.specMatchStatus,
    matchedConfigItem: spec.matchedItem,
    ambiguousCandidates: spec.ambiguousCandidates,
  };
}

export function evaluateGrrTestItemsForRun(
  parsed: ParsedCsv,
  branch: LinearityBranch,
  store: GaiaSpecStore | null,
  rowIndex: number,
  items: GrrTestItemDef[]
): GrrTestItemResult[] {
  return items.map((item) =>
    evaluateTestItem(
      item.header,
      item.category,
      branch,
      store,
      parsed,
      rowIndex
    )
  );
}

export function computeSpecMappingSummary(
  items: GrrTestItemDef[],
  store: GaiaSpecStore | null,
  parsed: ParsedCsv | null,
  branch: LinearityBranch
): Pick<
  GrrSpecMappingSummary,
  "totalTestItems" | "specMatchedCount" | "specMissingCount" | "ambiguousMatchCount"
> {
  let specMatchedCount = 0;
  let specMissingCount = 0;
  let ambiguousMatchCount = 0;

  for (const item of items) {
    const spec = resolveReferenceSpec(item.header, branch, store, parsed);
    if (spec.specMatchStatus === "matched") specMatchedCount++;
    else if (spec.specMatchStatus === "ambiguous") ambiguousMatchCount++;
    else specMissingCount++;
  }

  return {
    totalTestItems: items.length,
    specMatchedCount,
    specMissingCount,
    ambiguousMatchCount,
  };
}

export function aggregateErsResults(results: GrrErsResult[]): GrrErsResult {
  if (results.length === 0) return "SPEC MISSING";
  if (results.some((r) => r === "FAIL")) return "FAIL";
  if (results.some((r) => r === "AMBIGUOUS SPEC MATCH")) return "AMBIGUOUS SPEC MATCH";
  if (results.some((r) => r === "SPEC MISSING")) return "SPEC MISSING";
  return "PASS";
}

export function ersResultToLabel(result: GrrErsResult): string {
  return result;
}

export function ersFailReason(category: string, result: GrrErsResult): string | null {
  if (result === "FAIL") return `${category} Spec Out`;
  if (result === "SPEC MISSING") return `${category} Spec Missing`;
  if (result === "AMBIGUOUS SPEC MATCH") return `${category} Ambiguous Spec`;
  return null;
}
