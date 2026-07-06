import {
  DEFAULT_ABNORMAL_TEST_TIME_THRESHOLD_SEC,
  isAbnormalTestTime,
  UPH_COMBINED_CHART_INTERVAL_MINUTES,
  UPH_END_STATION,
  UPH_ROLLING_WINDOW_MS,
  UPH_START_STATION,
  type UphCountMode,
  type UphIntervalMinutes,
} from "./error-analysis-config";

export interface UphTrendBuildOptions {
  /** 첫 StartTime 에 UPH=0 앵커 포인트 추가 */
  includeStartAnchor?: boolean;
  /** 완료 없는 구간도 UPH=0 으로 표시 (선 연결용) */
  zeroWhenEmpty?: boolean;
}
import { parseErrorDateTimeMs } from "./error-analysis-parser";
import type {
  ErrorAnalysisRecord,
  TestTimeAnalysis,
  TestTimePoint,
  UphAnalysis,
  UphTrendAnalysis,
  UphTrendPoint,
} from "./error-analysis-types";

function formatDateTimeLabel(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatIntervalLabel(startMs: number, endMs: number): string {
  return `${formatDateTimeLabel(startMs)} ~ ${formatDateTimeLabel(endMs)}`;
}

function formatElapsed(sec: number | null): string {
  if (sec == null || sec <= 0) return "—";
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatUphValue(uph: number | null): string {
  if (uph == null || !Number.isFinite(uph)) return "—";
  return `${Math.round(uph)} units/hour`;
}

export { formatElapsed };

function hasStationEvents(
  records: ErrorAnalysisRecord[],
  station: number
): boolean {
  return records.some((r) => r.station === station);
}

/** StartTime 컬럼 — Station2 이벤트 행, 없으면 Station8 완료 행의 StartTime */
function collectStartTimeMs(records: ErrorAnalysisRecord[]): number[] {
  const useStation2Rows = hasStationEvents(records, UPH_START_STATION);

  return records
    .filter((rec) => {
      if (!rec.startTime.trim()) return false;
      if (parseErrorDateTimeMs(rec.startTime) == null) return false;
      if (rec.station == null) return true;
      if (useStation2Rows) return rec.station === UPH_START_STATION;
      return rec.station === UPH_END_STATION;
    })
    .map((rec) => parseErrorDateTimeMs(rec.startTime)!);
}

/** EndTime 컬럼 — Station8 완료 행 (Station 없으면 EndTime 있는 행) */
function collectEndTimeMs(records: ErrorAnalysisRecord[]): number[] {
  const useStation8Rows = hasStationEvents(records, UPH_END_STATION);

  return records
    .filter((rec) => {
      if (!rec.endTime.trim()) return false;
      if (parseErrorDateTimeMs(rec.endTime) == null) return false;
      if (rec.station == null) return true;
      if (useStation8Rows) return rec.station === UPH_END_STATION;
      return true;
    })
    .map((rec) => parseErrorDateTimeMs(rec.endTime)!);
}

function isCompletionRecord(rec: ErrorAnalysisRecord): boolean {
  if (!rec.endTime.trim()) return false;
  if (parseErrorDateTimeMs(rec.endTime) == null) return false;
  if (rec.station == null) return true;
  return rec.station === UPH_END_STATION;
}

function countCompletedModules(
  records: ErrorAnalysisRecord[],
  mode: UphCountMode
): number {
  const completions = records.filter(isCompletionRecord);
  if (mode === "unique") {
    return new Set(completions.map((r) => r.barcode)).size;
  }
  return completions.length;
}

export function buildUphAnalysis(
  records: ErrorAnalysisRecord[],
  testTimeAnalysis: TestTimeAnalysis,
  countMode: UphCountMode = "completion"
): UphAnalysis {
  const startTimes = collectStartTimeMs(records);
  const endTimes = collectEndTimeMs(records);
  const completedModuleCount = countCompletedModules(records, countMode);
  const abnormalTestCount = testTimeAnalysis.abnormalCount;

  if (startTimes.length === 0 || endTimes.length === 0) {
    return {
      uph: null,
      completedModuleCount,
      elapsedTimeSec: null,
      firstStartTime: null,
      lastEndTime: null,
      firstStartTimeMs: null,
      lastEndTimeMs: null,
      averageTestTimeSec:
        testTimeAnalysis.points.length > 0 ? testTimeAnalysis.meanSec : null,
      abnormalTestCount,
      countMode,
      statusMessage:
        startTimes.length === 0 && endTimes.length === 0
          ? "StartTime / EndTime 데이터 없음 (INVALID TIME DATA)"
          : startTimes.length === 0
            ? "StartTime 데이터 없음 (INVALID TIME DATA)"
            : "EndTime 데이터 없음 (INVALID TIME DATA)",
      isValid: false,
    };
  }

  const firstStartTimeMs = Math.min(...startTimes);
  const lastEndTimeMs = Math.max(...endTimes);
  const elapsedTimeSec = (lastEndTimeMs - firstStartTimeMs) / 1000;

  if (elapsedTimeSec <= 0) {
    return {
      uph: null,
      completedModuleCount,
      elapsedTimeSec: null,
      firstStartTime: formatDateTimeLabel(firstStartTimeMs),
      lastEndTime: formatDateTimeLabel(lastEndTimeMs),
      firstStartTimeMs,
      lastEndTimeMs,
      averageTestTimeSec:
        testTimeAnalysis.points.length > 0 ? testTimeAnalysis.meanSec : null,
      abnormalTestCount,
      countMode,
      statusMessage: "INVALID TIME DATA — EndTime이 StartTime보다 이릅니다",
      isValid: false,
    };
  }

  const uph =
    completedModuleCount > 0
      ? (completedModuleCount * 3600) / elapsedTimeSec
      : 0;

  return {
    uph,
    completedModuleCount,
    elapsedTimeSec,
    firstStartTime: formatDateTimeLabel(firstStartTimeMs),
    lastEndTime: formatDateTimeLabel(lastEndTimeMs),
    firstStartTimeMs,
    lastEndTimeMs,
    averageTestTimeSec:
      testTimeAnalysis.points.length > 0 ? testTimeAnalysis.meanSec : null,
    abnormalTestCount,
    countMode,
    statusMessage: null,
    isValid: true,
  };
}

export function buildUphTrend(
  records: ErrorAnalysisRecord[],
  uphAnalysis: UphAnalysis,
  intervalMinutes: number = 10,
  countMode: UphCountMode = "completion",
  options: UphTrendBuildOptions = {}
): UphTrendAnalysis {
  const points: UphTrendPoint[] = [];

  if (
    !uphAnalysis.isValid ||
    uphAnalysis.firstStartTimeMs == null ||
    uphAnalysis.lastEndTimeMs == null
  ) {
    return { intervalMinutes, points };
  }

  const firstStart = uphAnalysis.firstStartTimeMs;
  const lastEnd = uphAnalysis.lastEndTimeMs;
  const sampleMs = intervalMinutes * 60 * 1000;

  const completions = records
    .filter(isCompletionRecord)
    .map((rec) => ({
      ms: parseErrorDateTimeMs(rec.endTime)!,
      barcode: rec.barcode,
    }))
    .sort((a, b) => a.ms - b.ms);

  const sampleTimes: number[] = [];
  if (options.includeStartAnchor) {
    sampleTimes.push(firstStart);
  }
  for (let t = firstStart + sampleMs; t < lastEnd; t += sampleMs) {
    sampleTimes.push(t);
  }
  if (
    sampleTimes.length === 0 ||
    sampleTimes[sampleTimes.length - 1]! < lastEnd
  ) {
    sampleTimes.push(lastEnd);
  }

  for (const sampleTime of sampleTimes) {
    const windowStart = Math.max(
      firstStart,
      sampleTime - UPH_ROLLING_WINDOW_MS
    );
    const inWindow = completions.filter(
      (c) => c.ms > windowStart && c.ms <= sampleTime
    );

    let completedCount: number;
    if (countMode === "unique") {
      completedCount = new Set(inWindow.map((c) => c.barcode)).size;
    } else {
      completedCount = inWindow.length;
    }

    const windowElapsedSec = (sampleTime - windowStart) / 1000;
    let uph: number | null = null;
    if (windowElapsedSec > 0 && completedCount > 0) {
      uph = (completedCount * 3600) / windowElapsedSec;
    } else if (completedCount > 0) {
      uph = 0;
    } else if (options.zeroWhenEmpty) {
      uph = 0;
    }

    const isFullHour = sampleTime - windowStart >= UPH_ROLLING_WINDOW_MS;
    const windowLabel = isFullHour
      ? `최근 1h · ${formatDateTimeLabel(sampleTime)}`
      : `${formatIntervalLabel(windowStart, sampleTime)}`;

    points.push({
      intervalStartMs: windowStart,
      intervalEndMs: sampleTime,
      label: windowLabel,
      completedCount,
      windowElapsedSec,
      uph,
    });
  }

  return { intervalMinutes, points };
}

/** Test Time & UPH Trend 차트 전용 — 5분 샘플, 첫 StartTime 에서 UPH=0 */
export function buildUphChartTrend(
  records: ErrorAnalysisRecord[],
  uphAnalysis: UphAnalysis,
  countMode: UphCountMode = "completion"
): UphTrendAnalysis {
  const intervalMinutes = UPH_COMBINED_CHART_INTERVAL_MINUTES;
  const points: UphTrendPoint[] = [];

  if (
    !uphAnalysis.isValid ||
    uphAnalysis.firstStartTimeMs == null ||
    uphAnalysis.lastEndTimeMs == null
  ) {
    return { intervalMinutes, points };
  }

  const firstStart = uphAnalysis.firstStartTimeMs;
  const lastEnd = uphAnalysis.lastEndTimeMs;
  const sampleMs = intervalMinutes * 60 * 1000;

  const completions = records
    .filter(isCompletionRecord)
    .map((rec) => ({
      ms: parseErrorDateTimeMs(rec.endTime)!,
      barcode: rec.barcode,
    }))
    .sort((a, b) => a.ms - b.ms);

  const sampleTimes: number[] = [firstStart];
  for (let t = firstStart + sampleMs; t < lastEnd; t += sampleMs) {
    sampleTimes.push(t);
  }
  if (sampleTimes[sampleTimes.length - 1]! < lastEnd) {
    sampleTimes.push(lastEnd);
  }

  for (const sampleTime of sampleTimes) {
    if (sampleTime === firstStart) {
      points.push({
        intervalStartMs: firstStart,
        intervalEndMs: firstStart,
        label: `시작 · ${formatDateTimeLabel(firstStart)}`,
        completedCount: 0,
        windowElapsedSec: 0,
        uph: 0,
      });
      continue;
    }

    const windowStart = Math.max(
      firstStart,
      sampleTime - UPH_ROLLING_WINDOW_MS
    );
    const inWindow = completions.filter(
      (c) => c.ms > windowStart && c.ms <= sampleTime
    );

    let completedCount: number;
    if (countMode === "unique") {
      completedCount = new Set(inWindow.map((c) => c.barcode)).size;
    } else {
      completedCount = inWindow.length;
    }

    const windowElapsedSec = (sampleTime - windowStart) / 1000;
    let uph = 0;
    if (windowElapsedSec > 0 && completedCount > 0) {
      uph = (completedCount * 3600) / windowElapsedSec;
    }

    const isFullHour = sampleTime - windowStart >= UPH_ROLLING_WINDOW_MS;
    const windowLabel = isFullHour
      ? `최근 1h · ${formatDateTimeLabel(sampleTime)}`
      : `${formatIntervalLabel(windowStart, sampleTime)}`;

    points.push({
      intervalStartMs: windowStart,
      intervalEndMs: sampleTime,
      label: windowLabel,
      completedCount,
      windowElapsedSec,
      uph,
    });
  }

  return { intervalMinutes, points };
}

/** Test Time Trend용 — Station8 완료 행 또는 Station 미지정 레코드 */
export function recordsForTestTimeTrend(
  records: ErrorAnalysisRecord[]
): ErrorAnalysisRecord[] {
  const hasStationData = records.some((r) => r.station != null);
  if (!hasStationData) return records;
  return records.filter(
    (r) => r.station == null || r.station === UPH_END_STATION
  );
}

export function buildTestTimePoint(
  rec: ErrorAnalysisRecord,
  thresholdSec = DEFAULT_ABNORMAL_TEST_TIME_THRESHOLD_SEC
): Omit<TestTimePoint, "isAbnormal" | "isSlow"> | null {
  if (rec.testTimeSec == null || rec.testTimeSec <= 0) return null;

  const startTimeMs = parseErrorDateTimeMs(rec.startTime || rec.timestamp);

  return {
    runIndex: rec.runIndex,
    testTimeSec: rec.testTimeSec,
    status: rec.status,
    barcode: rec.barcode,
    socket: rec.socket,
    station: rec.station,
    startTime: rec.startTime || rec.timestamp,
    endTime: rec.endTime,
    startTimeMs,
  };
}

export function markAbnormalPoints(
  basePoints: Omit<TestTimePoint, "isAbnormal" | "isSlow">[],
  thresholdSec = DEFAULT_ABNORMAL_TEST_TIME_THRESHOLD_SEC
): TestTimePoint[] {
  return basePoints.map((p) => {
    const isAbnormal = isAbnormalTestTime(p.testTimeSec, thresholdSec);
    return { ...p, isAbnormal, isSlow: isAbnormal };
  });
}

export function resolveAbnormalStatus(
  testTimeSec: number | null,
  thresholdSec = DEFAULT_ABNORMAL_TEST_TIME_THRESHOLD_SEC
): "Normal" | "Abnormal" | "N/A" {
  if (testTimeSec == null || testTimeSec <= 0) return "N/A";
  return isAbnormalTestTime(testTimeSec, thresholdSec) ? "Abnormal" : "Normal";
}
