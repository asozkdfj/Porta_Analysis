/** Error Analysis — Test Time / UPH 설정 (추후 UI Setting 연동 가능) */

/** Abnormal Test Time 고정 기준 (초) */
export const DEFAULT_ABNORMAL_TEST_TIME_THRESHOLD_SEC = 170;

export type UphCountMode = "completion" | "unique";

export const UPH_COUNT_MODE_LABELS: Record<UphCountMode, string> = {
  completion: "Test Completion Count",
  unique: "Unique Module Count",
};

/** UPH Trend 구간 (분) */
export type UphIntervalMinutes = 10 | 30 | 60;

export const UPH_INTERVAL_OPTIONS: UphIntervalMinutes[] = [10, 30, 60];

export const UPH_INTERVAL_LABELS: Record<UphIntervalMinutes, string> = {
  10: "10 min",
  30: "30 min",
  60: "1 hour",
};

/** UPH Trend 롤링 윈도우 (1시간) */
export const UPH_ROLLING_WINDOW_MS = 60 * 60 * 1000;

/** Test Time & UPH Trend 차트 전용 샘플 간격 (분) */
export const UPH_COMBINED_CHART_INTERVAL_MINUTES = 5;

/**
 * UPH 시간 기준 (CSV 헤더는 StartTime / EndTime)
 * - 시작: StartTime 컬럼 (Station=2 행, 또는 Station8 단일 행의 StartTime)
 * - 종료: EndTime 컬럼 (Station=8 완료 행)
 */
export const UPH_START_STATION = 2;
export const UPH_END_STATION = 8;

export function isAbnormalTestTime(
  testTimeSec: number | null,
  thresholdSec = DEFAULT_ABNORMAL_TEST_TIME_THRESHOLD_SEC
): boolean {
  return testTimeSec != null && testTimeSec >= thresholdSec;
}
