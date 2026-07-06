import type {
  LinearityAnalysisResult,
  LinearityBatchSummary,
  LinearityFilter,
  LinearityResultRow,
  LinearitySeriesDef,
  LinearityVerdict,
} from "./liw-linearity-types";
import { analyzeLinearity, buildRunOptions } from "./liw-linearity";
import type { ParsedCsv } from "./types";

export function failReasonLabel(verdict: LinearityVerdict): string | null {
  switch (verdict) {
    case "pass":
      return null;
    case "emission_failure":
      return "Emission Failure";
    case "non_linear":
      return "Non Linear";
    case "data_missing":
      return "Data Missing";
  }
}

export function getRunTime(parsed: ParsedCsv, rowIndex: number): string {
  const row = parsed.rows[rowIndex];
  return row?.StartTime || row?.timeStamp || row?.EndTime || "—";
}

function toResultRow(
  parsed: ParsedCsv,
  analysis: LinearityAnalysisResult
): LinearityResultRow {
  const { verdict, summary, run } = analysis;
  const isPass = verdict === "pass";

  return {
    run,
    runTime: getRunTime(parsed, run.rowIndex),
    verdict,
    resultLabel: isPass ? "PASS" : "FAIL",
    failReason: failReasonLabel(verdict),
    r2: summary.r2,
    maxValue: summary.maxValue,
    dynamicRange: summary.dynamicRange,
    maxResidual: summary.maxResidual,
    analysis,
  };
}

/** CSV 내 모든 Run(행)에 대해 선형성 분석 */
export function analyzeAllRuns(
  parsed: ParsedCsv,
  series: LinearitySeriesDef
): LinearityResultRow[] {
  const runs = buildRunOptions(parsed);
  const rows: LinearityResultRow[] = [];

  for (const run of runs) {
    const analysis = analyzeLinearity(parsed, run, series);
    if (analysis) {
      rows.push(toResultRow(parsed, analysis));
    }
  }

  return rows;
}

export function computeBatchSummary(rows: LinearityResultRow[]): LinearityBatchSummary {
  const total = rows.length;
  const pass = rows.filter((r) => r.verdict === "pass").length;
  const fail = total - pass;
  const emissionFailure = rows.filter((r) => r.verdict === "emission_failure").length;
  const nonLinear = rows.filter((r) => r.verdict === "non_linear").length;
  const dataMissing = rows.filter((r) => r.verdict === "data_missing").length;
  return {
    total,
    pass,
    fail,
    passRate: total > 0 ? (pass / total) * 100 : 0,
    failRate: total > 0 ? (fail / total) * 100 : 0,
    emissionFailure,
    nonLinear,
    dataMissing,
  };
}

export function filterResultRows(
  rows: LinearityResultRow[],
  filter: LinearityFilter
): LinearityResultRow[] {
  switch (filter) {
    case "all":
      return rows;
    case "pass":
      return rows.filter((r) => r.verdict === "pass");
    case "fail":
      return rows.filter((r) => r.verdict !== "pass");
    case "emission_failure":
    case "non_linear":
    case "data_missing":
      return rows.filter((r) => r.verdict === filter);
    default:
      return rows;
  }
}

export function filterLabel(filter: LinearityFilter): string {
  switch (filter) {
    case "all":
      return "ALL";
    case "pass":
      return "PASS";
    case "fail":
      return "FAIL";
    case "emission_failure":
      return "Emission Failure";
    case "non_linear":
      return "Non Linear";
    case "data_missing":
      return "Data Missing";
  }
}
