import type { AnalysisGroup } from "./types";
import type { UphCountMode, UphIntervalMinutes } from "./error-analysis-config";

export type ErrorPassFail = "PASS" | "FAIL";

export type AbnormalStatus = "Normal" | "Abnormal" | "N/A";

/** Pie / Filter용 Error Distribution 카테고리 */
export type ErrorDistributionGroup =
  | "LIW"
  | "SMU"
  | "WL"
  | "Ranging"
  | "Temperature"
  | "FFBP"
  | "JC"
  | "Others";

export interface ErrorAnalysisRecord {
  id: string;
  runIndex: number;
  barcode: string;
  socketRaw: string;
  socket: string;
  stage: string;
  status: ErrorPassFail;
  failingItems: string[];
  /** errStr — 최초 발생 Fail Item (모듈당 대표 1건) */
  errorMessage: string | null;
  /** Distribution·필터용 대표 Fail Item (errStr 우선) */
  primaryFailItem: string;
  timestamp: string;
  /** StartTime 컬럼 (테스트 시작 시각) */
  startTime: string;
  /** EndTime 컬럼 (테스트 종료 시각) */
  endTime: string;
  /** TestTime 컬럼 (초 단위, 없으면 null) */
  testTimeSec: number | null;
  /** 장비 Station 번호 (2~8, 없으면 null) */
  station: number | null;
  analysisGroups: ErrorDistributionGroup[];
}

export interface ErrorAnalysisSummary {
  totalCount: number;
  passCount: number;
  failCount: number;
  yieldPercent: number;
  uniqueErrorCount: number;
  topError: string | null;
  topErrorCount: number;
}

export interface ErrorRankItem {
  item: string;
  count: number;
  percent: number;
}

export interface SocketFailCell {
  stage: string;
  socketNum: number;
  socket: string;
  failCount: number;
  topErrors: ErrorRankItem[];
  records: ErrorAnalysisRecord[];
}

export interface ContPinStat {
  contactLabel: string;
  pin: string;
  pinLabel: string;
  count: number;
}

/** CONT Fail Map 기반 Pin 점검 우선순위 */
export interface ContPinInspectionItem {
  contactLabel: string;
  pin: string;
  pinLabel: string;
  totalCount: number;
  socketCount: number;
  topSockets: { socket: string; count: number }[];
  percent: number;
}

export interface ContFailCell {
  stage: string;
  socketNum: number;
  socket: string;
  failCount: number;
  topPins: ContPinStat[];
  pins: ContPinStat[];
}

export interface ErrorDistributionSlice {
  group: ErrorDistributionGroup;
  count: number;
  percent: number;
  color: string;
}

export interface ErrorTrendPoint {
  runIndex: number;
  failCount: number;
  barcode: string;
}

export interface TestTimePoint {
  runIndex: number;
  testTimeSec: number;
  status: ErrorPassFail;
  barcode: string;
  socket: string;
  station: number | null;
  startTime: string;
  endTime: string;
  /** StartTime 파싱 ms (차트 시간축용, 없으면 null) */
  startTimeMs: number | null;
  isAbnormal: boolean;
  /** @deprecated isAbnormal 사용 */
  isSlow: boolean;
}

export interface TestTimeAnalysis {
  points: TestTimePoint[];
  /** Abnormal Run (StartTime 포함) */
  abnormalRuns: TestTimePoint[];
  /** @deprecated abnormalRuns 사용 */
  slowRuns: TestTimePoint[];
  medianSec: number;
  meanSec: number;
  p95Sec: number;
  abnormalThresholdSec: number;
  /** @deprecated abnormalThresholdSec 사용 */
  slowThresholdSec: number;
  abnormalCount: number;
  /** @deprecated abnormalCount 사용 */
  slowCount: number;
  abnormalRate: number;
  maxSec: number;
  minSec: number;
}

export interface UphAnalysis {
  uph: number | null;
  completedModuleCount: number;
  elapsedTimeSec: number | null;
  firstStartTime: string | null;
  lastEndTime: string | null;
  firstStartTimeMs: number | null;
  lastEndTimeMs: number | null;
  averageTestTimeSec: number | null;
  abnormalTestCount: number;
  countMode: UphCountMode;
  /** Station2/8 데이터 부족 등 */
  statusMessage: string | null;
  isValid: boolean;
}

export interface UphTrendPoint {
  /** 롤링 윈도우 시작 시각 */
  intervalStartMs: number;
  /** 샘플 시각 (이 시점까지 누적) */
  intervalEndMs: number;
  label: string;
  /** 윈도우 내 완료 Module 수 */
  completedCount: number;
  /** 윈도우 경과 시간(초) */
  windowElapsedSec: number;
  uph: number | null;
}

export interface UphTrendAnalysis {
  intervalMinutes: number;
  points: UphTrendPoint[];
}

export interface SocketRankItem {
  socket: string;
  failCount: number;
}

export interface StageRankItem {
  stage: string;
  failCount: number;
}

export interface ErrorCorrelationPair {
  from: string;
  to: string;
  count: number;
}

export interface ErrorAnalysisFilters {
  analysisGroup: ErrorDistributionGroup | "ALL";
  socket: string | "ALL";
  stage: string | "ALL";
  station: number | "ALL";
  failItem: string | "ALL";
  passFail: "ALL" | ErrorPassFail;
  abnormalStatus: "ALL" | AbnormalStatus;
  timeRangeStart: string;
  timeRangeEnd: string;
  search: string;
}

export interface ErrorAnalysisResult {
  fileName: string;
  records: ErrorAnalysisRecord[];
  summary: ErrorAnalysisSummary;
  errorRanking: ErrorRankItem[];
  failMap: SocketFailCell[];
  distribution: ErrorDistributionSlice[];
  trend: ErrorTrendPoint[];
  socketRanking: SocketRankItem[];
  stageRanking: StageRankItem[];
  correlations: ErrorCorrelationPair[];
  availableGroups: ErrorDistributionGroup[];
  availableSockets: string[];
  availableStages: string[];
  availableFailItems: string[];
  /** Analysis Group별 Fail Item 목록 */
  distributionItemsByGroup: Partial<
    Record<ErrorDistributionGroup, ErrorRankItem[]>
  >;
  contFailMap: ContFailCell[];
  /** CONT Fail Map 기반 Pin 점검 우선순위 */
  contPinInspection: ContPinInspectionItem[];
  /** TestTime 추이 · Abnormal 탐지 */
  testTimeAnalysis: TestTimeAnalysis;
  /** Station2~8 기준 UPH */
  uphAnalysis: UphAnalysis;
  uphTrend: UphTrendAnalysis;
  /** Test Time & UPH Trend 차트 전용 (5분 샘플, 시작 0) */
  uphChartTrend: UphTrendAnalysis;
  availableStations: number[];
}

export const ERROR_DISTRIBUTION_COLORS: Record<ErrorDistributionGroup, string> = {
  LIW: "#3b82f6",
  SMU: "#8b5cf6",
  WL: "#06b6d4",
  Ranging: "#f59e0b",
  Temperature: "#0ea5e9",
  FFBP: "#10b981",
  JC: "#ec4899",
  Others: "#94a3b8",
};

/** 차트·Heatmap 공통 — 눈에 편한 톤 */
export const ERROR_CHART_BAR = "#64748b";
export const ERROR_CHART_BAR_ACCENT = "#475569";
export const ERROR_TREND_BAR = "#94a3b8";

export const ERROR_DISTRIBUTION_LABELS: Record<ErrorDistributionGroup, string> = {
  LIW: "LIW",
  SMU: "SMU",
  WL: "WL",
  Ranging: "Ranging",
  Temperature: "Temperature",
  FFBP: "FFBP",
  JC: "JC",
  Others: "Others",
};

export function resolveErrorDistributionGroup(
  item: string
): ErrorDistributionGroup {
  const upper = item.toUpperCase();

  if (
    upper.includes("LIW") ||
    upper.includes("COEFF") ||
    upper.includes("OTPV20C")
  ) {
    return "LIW";
  }

  if (
    upper.includes("NTC") ||
    upper.includes("TEMP") ||
    upper.includes("TEMPERATURE")
  ) {
    return "Temperature";
  }

  if (upper.includes("WL")) return "WL";

  if (
    upper.includes("IMX") ||
    upper.includes("BC4MM") ||
    upper.includes("BC12MM") ||
    upper.includes("BC36MM") ||
    upper.includes("BC150MM") ||
    upper.includes("RANGING")
  ) {
    return "Ranging";
  }

  if (
    upper.includes("CONT") ||
    upper.includes("LEAKAGE") ||
    upper.includes("IDD") ||
    upper.includes("CAPDETECT") ||
    upper.includes("SMU")
  ) {
    return "SMU";
  }

  if (
    upper.includes("FFBP") ||
    upper.includes("CTSE") ||
    upper.includes("NCTSE")
  ) {
    return "FFBP";
  }

  if (
    upper.includes("PB2") ||
    upper.includes("1200NM") ||
    upper.includes("1650NM")
  ) {
    return "JC";
  }

  return "Others";
}

/** CONT2_VDD 형태의 컨택 Fail Item 여부 */
export function isContactFailItem(item: string): boolean {
  const normalized = item
    .replace(/^PROX::MOD_/, "")
    .replace(/^PROX::/, "");
  return /CONT\d*_[A-Za-z0-9]/i.test(normalized);
}

/** CONT2_pin 형식에서 Station(CONT2)과 Pin 추출 */
export function parseContactFailItem(item: string): {
  contactLabel: string;
  pin: string;
  pinLabel: string;
} | null {
  if (!isContactFailItem(item)) return null;

  const normalized = item
    .replace(/^PROX::MOD_/, "")
    .replace(/^PROX::/, "");

  const withStation = normalized.match(/CONT(\d+)_([A-Za-z0-9]+)/i);
  if (withStation) {
    const contactLabel = `CONT${withStation[1]}`;
    const pin = withStation[2]!;
    return { contactLabel, pin, pinLabel: `${contactLabel}_${pin}` };
  }

  const base = normalized.match(/CONT_([A-Za-z0-9]+)/i);
  if (base) {
    const pin = base[1]!;
    return { contactLabel: "CONT", pin, pinLabel: `CONT_${pin}` };
  }

  return null;
}

/** AnalysisGroup → ErrorDistributionGroup (GRR 호환) */
export function analysisGroupToDistribution(
  group: AnalysisGroup
): ErrorDistributionGroup {
  if (group === "Ranging") return "Ranging";
  if (group === "SMU") return "SMU";
  if (group === "LIW") return "LIW";
  if (group === "FFBP") return "FFBP";
  if (group === "JC") return "JC";
  return "Others";
}
