import type { TactTimeStationId } from "./tact-time-types";

export type TactTimeReportCycleMode =
  | "average"
  | "first"
  | "worst"
  | "selected";

export type TactTimeReportStatus = "OK" | "CHECK" | "N/A";

export interface TactTimeReportThresholds {
  /** 평균 대비 이 비율(%) 초과 시 CHECK — 기본 10 */
  checkPercentAboveAvg: number;
  /** 평균 + 3σ 초과 시에도 CHECK */
  useSigma: boolean;
}

export const DEFAULT_TACT_TIME_REPORT_THRESHOLDS: TactTimeReportThresholds = {
  checkPercentAboveAvg: 10,
  useSigma: true,
};

export interface StationCsvUpload {
  fileName: string;
  text: string;
}

export type StationCsvMap = Partial<
  Record<TactTimeStationId, StationCsvUpload | null>
>;

export interface TactTimeReportGroupRow {
  groupName: string;
  /** ms 단위 (Excel Tact 컬럼) */
  durationMs: number;
  durationSec: number;
  includedItems: string;
}

export interface TactTimeStationReport {
  stationId: TactTimeStationId;
  stationLabel: string;
  fileName: string | null;
  hasData: boolean;
  error: string | null;
  cycleMode: TactTimeReportCycleMode;
  cycleLabel: string;
  totalSec: number | null;
  groups: TactTimeReportGroupRow[];
  status: TactTimeReportStatus;
  remark: string;
}

export interface TactTimeFullReport {
  generatedAt: Date;
  cycleMode: TactTimeReportCycleMode;
  thresholds: TactTimeReportThresholds;
  stations: TactTimeStationReport[];
  groupColumns: string[];
}
