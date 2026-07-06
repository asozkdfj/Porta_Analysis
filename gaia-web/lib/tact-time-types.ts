export interface TactTimeRow {
  header: string;
  durationMs: number;
  startTime: string;
  endTime: string;
  /** 동일 Label이 로그에 여러 번 등장한 경우 */
  occurrenceCount?: number;
}

/** CSV 원본 로그 1행 */
export interface TactTimeLogEntry {
  rowIndex: number;
  header: string;
  durationMs: number;
  startTime: string;
  endTime: string;
  startMs: number;
  endMs: number;
}

export interface ParsedTactTimeCsv {
  fileName: string;
  /** Setting/그룹 구성용 — Label별 합산 */
  rows: TactTimeRow[];
  /** Cycle 분석용 — 원본 로그 순서 */
  logEntries: TactTimeLogEntry[];
}

export interface TactTimeGroup {
  id: string;
  name: string;
  headers: string[];
}

export interface TactTimeGroupStore {
  version: number;
  groups: TactTimeGroup[];
}

export const TACT_TIME_STATION_COUNT = 8;

export type TactTimeStationId =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8;

export interface TactTimeStationStore {
  version: number;
  activeStation: TactTimeStationId;
  stations: Record<string, TactTimeGroupStore>;
}

export function isTactTimeStationId(n: number): n is TactTimeStationId {
  return Number.isInteger(n) && n >= 1 && n <= TACT_TIME_STATION_COUNT;
}

export function tactTimeStationLabel(stationId: TactTimeStationId): string {
  return `Station ${stationId}`;
}

/** Inbox 폴더명: inbox/tact-time/Station1 … Station8 */
export function tactTimeStationInboxFolder(
  stationId: TactTimeStationId
): string {
  return `Station${stationId}`;
}

export function parseTactTimeStationInboxFolder(
  folderName: string
): TactTimeStationId | null {
  const m = /^Station([1-8])$/.exec(folderName);
  if (!m) return null;
  const n = Number(m[1]);
  return isTactTimeStationId(n) ? n : null;
}

export interface TactTimeGroupResult {
  id: string;
  name: string;
  headers: string[];
  itemCount: number;
  totalDurationMs: number;
  startTime: string;
  endTime: string;
  items: TactTimeRow[];
  color: string;
  isUngrouped?: boolean;
}

export interface TactTimeAnalysis {
  groups: TactTimeGroupResult[];
  totalDurationMs: number;
  longestGroup: TactTimeGroupResult | null;
}

export interface TactTimeCycleItem {
  header: string;
  durationMs: number;
  startTime: string;
  endTime: string;
  groupId: string;
  groupName: string;
  groupColor: string;
}

export interface TactTimeCycleGroupBreakdown {
  groupId: string;
  groupName: string;
  durationMs: number;
  color: string;
  items: TactTimeCycleItem[];
}

export interface TactTimeCycle {
  id: string;
  cycleNumber: number;
  totalDurationMs: number;
  /** CSV에 Total time Label이 있어 그 값을 사용했는지 */
  fromTotalTimeLabel?: boolean;
  startTime: string;
  endTime: string;
  entries: TactTimeCycleItem[];
  groupBreakdown: TactTimeCycleGroupBreakdown[];
  isOutlier: boolean;
}

export interface TactTimeGroupContribution {
  groupId: string;
  groupName: string;
  avgDurationMs: number;
  percent: number;
  color: string;
}

export interface TactTimeGroupDelta {
  groupId: string;
  groupName: string;
  bestMs: number;
  worstMs: number;
  deltaMs: number;
  color: string;
}

/** Average vs Worst Cycle 그룹별 차이 */
export interface TactTimeGroupAvgWorstDelta {
  groupId: string;
  groupName: string;
  avgMs: number;
  worstMs: number;
  deltaMs: number;
  color: string;
}

export interface TactTimeCycleSummary {
  cycleCount: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  stdDevMs: number;
  bestCycle: TactTimeCycle | null;
  worstCycle: TactTimeCycle | null;
  differenceMs: number;
  outlierCount: number;
  outlierThresholdMs: number;
}

export type TactTimeCompareMode = "best-worst" | "avg-worst";

export interface TactTimeCycleAnalysis {
  cycles: TactTimeCycle[];
  summary: TactTimeCycleSummary;
  contributions: TactTimeGroupContribution[];
  deltas: TactTimeGroupDelta[];
  avgWorstDeltas: TactTimeGroupAvgWorstDelta[];
  rootCauseGroup: string | null;
  rootCauseMessage: string;
  avgWorstRootCauseGroup: string | null;
  avgWorstRootCauseMessage: string;
  /** 분석 통계·차트에서 제외된 Cycle (복원 가능) */
  excludedCycles: TactTimeCycle[];
}
