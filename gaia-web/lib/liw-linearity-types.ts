export type LinearityBranch = "20C" | "50C";
export type LinearityMetricKind = "PO" | "FB" | "ERR";

/** 최종 판정 */
export type LinearityVerdict = "pass" | "emission_failure" | "non_linear" | "data_missing";

export type LinearityFilter =
  | "all"
  | "pass"
  | "fail"
  | "emission_failure"
  | "non_linear"
  | "data_missing";

export interface LinearitySeriesDef {
  kind: LinearityMetricKind;
  branch: LinearityBranch;
  label: string;
  headerToken: string;
}

export interface LinearityRunOption {
  id: string;
  runId: string;
  label: string;
  rowIndex: number;
  barcode: string;
  socket: string;
  timestamp: string;
  testSequence: number;
  attemptLabel: string;
}

export interface LinearityPoint {
  index: number;
  header: string;
  target: number;
  actual: number;
  predicted: number;
  residual: number;
  /** Index < 4 구간 — 선형성 분석 제외 */
  excluded: boolean;
}

export interface LinearityRegression {
  slope: number;
  intercept: number;
  r2: number;
}

export interface EmissionCheckResult {
  passed: boolean;
  maxValue: number;
  minValue: number;
  avgValue: number;
  dynamicRange: number;
  slopeEstimate: number;
  increaseRatio: number;
  reason?: string;
}

export interface LinearitySummary {
  totalPointCount: number;
  analysisPointCount: number;
  analysisStartIndex: number;
  maxValue: number;
  minValue: number;
  dynamicRange: number;
  avgValue: number;
  slope: number | null;
  intercept: number | null;
  r2: number | null;
  maxResidual: number | null;
  meanResidual: number | null;
}

export interface LinearityAnalysisResult {
  series: LinearitySeriesDef;
  run: LinearityRunOption;
  points: LinearityPoint[];
  analysisMinIndex: number;
  emission: EmissionCheckResult;
  regression: LinearityRegression | null;
  summary: LinearitySummary;
  verdict: LinearityVerdict;
  statusTitle: string;
  statusMessage: string;
  hasResidualPattern: boolean;
  regressionLine: { x: number; y: number }[];
}

export interface LinearityResultRow {
  run: LinearityRunOption;
  runTime: string;
  verdict: LinearityVerdict;
  resultLabel: "PASS" | "FAIL";
  failReason: string | null;
  r2: number | null;
  maxValue: number | null;
  dynamicRange: number | null;
  maxResidual: number | null;
  analysis: LinearityAnalysisResult;
}

export interface LinearityBatchSummary {
  total: number;
  pass: number;
  fail: number;
  passRate: number;
  failRate: number;
  emissionFailure: number;
  nonLinear: number;
  dataMissing: number;
}
