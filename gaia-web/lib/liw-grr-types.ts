import type { LinearityAnalysisResult, LinearityRunOption } from "./liw-linearity-types";

import type { GrrNtcRunAnalysis } from "./liw-grr-ntc";

import type { GrrTestItemResult, GrrSpecMappingSummary } from "./liw-grr-spec";

import type { GrrWlCenterRunAnalysis } from "./liw-grr-wl-center";



export type GrrResultLabel = "PASS" | "FAIL" | "N/A" | "SPEC MISSING" | "AMBIGUOUS SPEC MATCH";



export type GrrFilter =

  | "all"

  | "pass"

  | "fail"

  | "po_fail"

  | "ntc_fail"

  | "wl_center_fail";



export interface GrrResultRow {

  run: LinearityRunOption;

  runTime: string;

  poResult: GrrResultLabel;

  poFailReason: string | null;

  ntcResult: GrrResultLabel;

  ntcFailReason: string | null;

  wlCenterResult: GrrResultLabel;

  wlCenterFailReason: string | null;

  overallResult: GrrResultLabel;

  overallFailReason: string | null;

  poAnalysis: LinearityAnalysisResult | null;

  ntcAnalysis: GrrNtcRunAnalysis | null;

  wlCenterAnalysis: GrrWlCenterRunAnalysis | null;

  testItemResults: GrrTestItemResult[];

}



export interface GrrBatchSummary {

  total: number;

  pass: number;

  fail: number;

  passRate: number;

  failRate: number;

  poFail: number;

  ntcFail: number;

  wlCenterFail: number;

  specMissing: number;

}



export type { GrrSpecMappingSummary };


