import type { GrrConfigSpecResolution } from "./gaia-spec-config";

export type AnalysisGroup =
  | "FFBP"
  | "Ranging"
  | "JC"
  | "LIW"
  | "SMU";

export type PassFail = "PASS" | "FAIL" | "CHECK";

export interface ParsedCsv {
  headers: string[];
  upperSpecs: Record<string, number | null>;
  lowerSpecs: Record<string, number | null>;
  units: Record<string, string>;
  rows: Record<string, string>[];
  serialKey: string;
  socketKey: string;
}

export interface MetricInfo {
  header: string;
  label: string;
  upper: number | null;
  lower: number | null;
  unit: string;
}

export interface SocketMean {
  socket: string;
  mean: number;
  count: number;
  runId: string;
  timestamp: string;
  testSequence: number;
  attemptLabel: string;
  rowIndex: number;
}

export type GrrJudgmentLabel =
  | "PASS"
  | "FAIL"
  | "CHECK"
  | "SPEC MISSING"
  | "AMBIGUOUS SPEC MATCH";

export interface SerialGrrResult {
  serial: string;
  referenceSocket: string;
  /** Target tester 소켓 반복 측정 평균 */
  referenceValue: number;
  /** Target tester 소켓 반복 측정 stdev */
  referenceStdev: number;
  /** Target tester 소켓 반복 Run 최소/최대 (pct_err용) */
  referenceYmin: number;
  referenceYmax: number;
  /** 전체 소켓 평균값의 평균 (의사 골든) */
  pseudoGolden: number;
  socketMeans: SocketMean[];
  /** 가로 소켓 Range ymin — 의사 골든 − grr_stdev×criteriaStdev */
  ymin: number;
  /** 가로 소켓 Range ymax — min(max bound_up, golden + grr_stdev×criteriaStdev) */
  ymax: number;
  range: number;
  percentRange: number;
  upper: number | null;
  lower: number | null;
  /** 전체 소켓 평균값들의 stdev (Criteria 테이블) */
  calculatedStdev: number;
  calculatedGrr: number;
  measurementStatus: GrrJudgmentLabel;
  grrStatus: GrrJudgmentLabel;
  failReason: string | null;
  status: PassFail;
}

export interface AnalysisSummary {
  total: number;
  pass: number;
  fail: number;
  check: number;
}

export type SpecSource =
  | "exact"
  | "case-insensitive"
  | "normalized"
  | "contains"
  | "csv"
  | "fallback"
  | "none"
  | "ambiguous";

export interface MetricSpecLimits {
  found: boolean;
  lsl: number | null;
  usl: number | null;
  grrStdev: number | null;
  grrLimit: number | null;
  unit?: string;
  source: SpecSource;
  matchedItem?: string;
  matchStatus?: "matched" | "missing" | "ambiguous";
  ambiguousCandidates?: string[];
}

export interface GrrDashboardSpecResultEntry {
  /** 기준 소켓(Reference Socket) */
  socket: string;
  /** FAIL 상세 — 실패한 모듈(Serial) */
  serial?: string;
  metric?: string;
  metricLabel?: string;
}

export interface GrrDashboardSpecSummary {
  totalMetrics: number;
  specMatched: number;
  specMissing: number;
  ambiguousMatch: number;
  measurementPass: number;
  measurementFail: number;
  grrPass: number;
  grrFail: number;
  grrPassItems: GrrDashboardSpecResultEntry[];
  grrFailItems: GrrDashboardSpecResultEntry[];
}

export interface GroupGrrStats {
  /** mean(pseudoGolden) — GaiaStat2 group_avg_golden */
  groupAvgGolden: number;
  /** mean(referenceValue) — GaiaStat2 GRR_GROUP_AVG */
  groupAvg: number;
  groupAvgPercent: number;
  grrErrMax: number;
  grrErrMin: number;
  sampleCount: number;
  testLimitBand: number;
}

export type {
  GaiaStat2GrrSummary,
  GaiaStat2GrrResultLabel,
  GrrCriteriaRow,
  GrrTestResultRow,
  GrrPctErrRow,
  GrrPctErrDebugRow,
  TesterGrrSidebarEntry,
} from "./gaia-stat2-grr-summary";

export interface GaiaAnalysisResult {
  group: AnalysisGroup;
  metric: string;
  serials: SerialGrrResult[];
  summary: AnalysisSummary;
  sockets: string[];
  /** Config/CSV 기준 Spec 축 (Lower ERS ~ Upper ERS) */
  axisDomain: [number, number];
  /** 데이터+Spec 포함 실제 차트 표시 범위 */
  chartDomain: [number, number];
  spec: MetricSpecLimits;
  groupGrr: GroupGrrStats | null;
  specSource: SpecSource;
  matchedConfigItem?: string;
  specUnit?: string;
  configResolution: GrrConfigSpecResolution;
}

export interface AnalyzeRequest {
  csvText: string;
  group: AnalysisGroup;
  metricHeader: string;
  referenceSocket?: string;
  serialFilter?: string;
}
