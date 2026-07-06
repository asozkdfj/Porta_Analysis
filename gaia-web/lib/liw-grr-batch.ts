import { analyzeLinearity, buildRunOptions } from "./liw-linearity";

import { failReasonLabel, getRunTime } from "./liw-linearity-batch";

import type { LinearitySeriesDef, LinearityVerdict } from "./liw-linearity-types";

import { analyzeGrrNtcRun } from "./liw-grr-ntc";

import {

  aggregateErsResults,

  computeSpecMappingSummary,

  discoverGrrTestItems,

  evaluateGrrTestItemsForRun,

  ersFailReason,

  type GrrErsResult,

  type GrrTestItemResult,

  type GrrTestItemDef,

} from "./liw-grr-spec";

import type {

  GrrBatchSummary,

  GrrFilter,

  GrrResultLabel,

  GrrResultRow,

  GrrSpecMappingSummary,

} from "./liw-grr-types";

import { analyzeGrrWlCenterRun } from "./liw-grr-wl-center";

import type { LinearityBranch } from "./liw-linearity-types";

import type { GaiaSpecStore } from "./gaia-spec-config";

import type { ParsedCsv } from "./types";



function formatPoFailReason(verdict: LinearityVerdict): string | null {

  const base = failReasonLabel(verdict);

  if (!base) return null;

  return `PO ${base}`;

}



function verdictToLabel(

  verdict: "pass" | "data_missing" | "drift" | "spec_missing" | "spike"

): GrrResultLabel {

  if (verdict === "pass") return "PASS";

  if (verdict === "spec_missing") return "SPEC MISSING";

  return "FAIL";

}



function poScalarResults(

  testItemResults: GrrTestItemResult[]

): GrrErsResult[] {

  return testItemResults

    .filter(

      (t) =>

        t.category === "PO" &&

        (t.testItem.includes("_PO_48MA") || t.testItem.includes("_PO_22MW"))

    )

    .map((t) => t.result);

}



function resolvePoResult(

  poAnalysis: ReturnType<typeof analyzeLinearity>,

  testItemResults: GrrTestItemResult[]

): { result: GrrResultLabel; failReason: string | null } {

  const reasons: string[] = [];

  let result: GrrResultLabel = "N/A";



  if (poAnalysis) {

    result = poAnalysis.verdict === "pass" ? "PASS" : "FAIL";

    const r = formatPoFailReason(poAnalysis.verdict);

    if (r) reasons.push(r);

  }



  const scalar = poScalarResults(testItemResults);

  if (scalar.length > 0) {

    const scalarAgg = aggregateErsResults(scalar);

    if (scalarAgg === "FAIL") {

      result = "FAIL";

      reasons.push("PO Spec Out");

    } else if (scalarAgg === "SPEC MISSING" && result === "PASS") {

      result = "SPEC MISSING";

      reasons.push("PO Spec Missing");

    } else if (scalarAgg === "PASS" && result === "N/A") {

      result = "PASS";

    }

  }



  return { result, failReason: reasons.length > 0 ? reasons.join(", ") : null };

}



function resolveCategoryResult(

  analysis: { verdict: string; failReason: string | null } | null

): { result: GrrResultLabel; failReason: string | null } {

  if (!analysis) return { result: "N/A", failReason: null };

  return {

    result: verdictToLabel(analysis.verdict as "pass" | "spec_missing" | "drift" | "data_missing"),

    failReason: analysis.failReason,

  };

}



function buildOverallFailReasons(row: Omit<GrrResultRow, "overallResult" | "overallFailReason">): string[] {

  const reasons: string[] = [];

  if (row.poFailReason) reasons.push(row.poFailReason);

  if (row.ntcFailReason) reasons.push(row.ntcFailReason);

  if (row.wlCenterFailReason) reasons.push(row.wlCenterFailReason);

  return reasons;

}



function buildOverallResult(

  po: GrrResultLabel,

  ntc: GrrResultLabel,

  wl: GrrResultLabel

): GrrResultLabel {

  const results = [po, ntc, wl].filter((r) => r !== "N/A");

  if (results.length === 0) return "N/A";

  if (results.some((r) => r === "FAIL")) return "FAIL";

  if (results.some((r) => r === "SPEC MISSING")) return "SPEC MISSING";

  return "PASS";

}



export function analyzeGrrResultRow(

  parsed: ParsedCsv,

  branch: LinearityBranch,

  series: LinearitySeriesDef,

  runIndex: number,

  specStore: GaiaSpecStore | null,

  testItemDefs: GrrTestItemDef[]

): GrrResultRow | null {

  const runs = buildRunOptions(parsed, "repeat");

  const run = runs[runIndex];

  if (!run) return null;



  const testItemResults = evaluateGrrTestItemsForRun(

    parsed,

    branch,

    specStore,

    run.rowIndex,

    testItemDefs

  );



  const poAnalysis = analyzeLinearity(parsed, run, series);

  const ntcAnalysis = analyzeGrrNtcRun(parsed, branch, run, specStore);

  const wlCenterAnalysis = analyzeGrrWlCenterRun(parsed, branch, run, specStore);



  if (!poAnalysis && !ntcAnalysis && !wlCenterAnalysis) return null;



  const po = resolvePoResult(poAnalysis, testItemResults);

  const ntc = resolveCategoryResult(ntcAnalysis);

  const wl = resolveCategoryResult(wlCenterAnalysis);



  const partial = {

    run,

    runTime: getRunTime(parsed, run.rowIndex),

    poResult: po.result,

    poFailReason: po.failReason,

    ntcResult: ntc.result,

    ntcFailReason: ntc.failReason,

    wlCenterResult: wl.result,

    wlCenterFailReason: wl.failReason,

    poAnalysis,

    ntcAnalysis,

    wlCenterAnalysis,

    testItemResults,

  };



  const reasons = buildOverallFailReasons(partial);



  return {

    ...partial,

    overallResult: buildOverallResult(po.result, ntc.result, wl.result),

    overallFailReason: reasons.length > 0 ? reasons.join(", ") : null,

  };

}



export function analyzeAllGrrRuns(

  parsed: ParsedCsv,

  branch: LinearityBranch,

  series: LinearitySeriesDef,

  specStore: GaiaSpecStore | null

): GrrResultRow[] {

  const testItemDefs = discoverGrrTestItems(parsed, branch);

  const runs = buildRunOptions(parsed, "repeat");

  const rows: GrrResultRow[] = [];



  for (let i = 0; i < runs.length; i++) {

    const row = analyzeGrrResultRow(parsed, branch, series, i, specStore, testItemDefs);

    if (row) rows.push(row);

  }



  return rows;

}



export function buildGrrSpecMappingSummary(

  parsed: ParsedCsv,

  branch: LinearityBranch,

  specStore: GaiaSpecStore | null,

  rows: GrrResultRow[]

): GrrSpecMappingSummary {

  const items = discoverGrrTestItems(parsed, branch);

  const mapping = computeSpecMappingSummary(items, specStore, parsed, branch);



  let passCount = 0;

  let failCount = 0;

  let specMissingResultCount = 0;



  for (const row of rows) {

    for (const item of row.testItemResults) {

      if (item.result === "PASS") passCount++;

      else if (item.result === "FAIL") failCount++;

      else specMissingResultCount++;

    }

  }



  return {
    ...mapping,
    passCount,
    failCount,
    specMissingResultCount,
    ambiguousMatchCount: mapping.ambiguousMatchCount,
  };

}



export function computeGrrBatchSummary(rows: GrrResultRow[]): GrrBatchSummary {

  const total = rows.length;

  const pass = rows.filter((r) => r.overallResult === "PASS").length;

  const fail = rows.filter((r) => r.overallResult === "FAIL").length;

  const specMissing = rows.filter((r) => r.overallResult === "SPEC MISSING").length;

  return {

    total,

    pass,

    fail,

    passRate: total > 0 ? (pass / total) * 100 : 0,

    failRate: total > 0 ? ((fail + specMissing) / total) * 100 : 0,

    poFail: rows.filter((r) => r.poResult === "FAIL").length,

    ntcFail: rows.filter((r) => r.ntcResult === "FAIL").length,

    wlCenterFail: rows.filter((r) => r.wlCenterResult === "FAIL").length,

    specMissing,

  };

}



export function filterGrrResultRows(

  rows: GrrResultRow[],

  filter: GrrFilter

): GrrResultRow[] {

  switch (filter) {

    case "all":

      return rows;

    case "pass":

      return rows.filter((r) => r.overallResult === "PASS");

    case "fail":

      return rows.filter((r) => r.overallResult === "FAIL" || r.overallResult === "SPEC MISSING");

    case "po_fail":

      return rows.filter((r) => r.poResult === "FAIL" || r.poResult === "SPEC MISSING");

    case "ntc_fail":

      return rows.filter((r) => r.ntcResult === "FAIL" || r.ntcResult === "SPEC MISSING");

    case "wl_center_fail":

      return rows.filter((r) => r.wlCenterResult === "FAIL" || r.wlCenterResult === "SPEC MISSING");

    default:

      return rows;

  }

}



export function grrFilterLabel(filter: GrrFilter): string {

  switch (filter) {

    case "all":

      return "ALL";

    case "pass":

      return "PASS";

    case "fail":

      return "FAIL";

    case "po_fail":

      return "PO FAIL";

    case "ntc_fail":

      return "NTC FAIL";

    case "wl_center_fail":

      return "WL_CENTER FAIL";

  }

}



export { discoverGrrTestItems };


