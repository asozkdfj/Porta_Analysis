import { CANONICAL_GOLDEN_SOCKETS } from "./golden-socket-config";
import {
  DEFAULT_ABNORMAL_TEST_TIME_THRESHOLD_SEC,
  type UphCountMode,
  type UphIntervalMinutes,
} from "./error-analysis-config";
import {
  buildUphAnalysis,
  buildUphChartTrend,
  buildUphTrend,
  markAbnormalPoints,
  recordsForTestTimeTrend,
  buildTestTimePoint,
} from "./error-analysis-uph";
import { parseErrorDateTimeMs } from "./error-analysis-parser";
import { resolveAbnormalStatus } from "./error-analysis-uph";
import type {
  ErrorAnalysisFilters,
  ErrorAnalysisRecord,
  ErrorAnalysisResult,
  ErrorAnalysisSummary,
  ErrorCorrelationPair,
  ErrorDistributionSlice,
  ErrorRankItem,
  ErrorTrendPoint,
  SocketFailCell,
  ContFailCell,
  ContPinInspectionItem,
  ContPinStat,
  SocketRankItem,
  StageRankItem,
  TestTimeAnalysis,
  TestTimePoint,
} from "./error-analysis-types";
import {
  ERROR_DISTRIBUTION_COLORS,
  isContactFailItem,
  parseContactFailItem,
  resolveErrorDistributionGroup,
} from "./error-analysis-types";
import type { ErrorDistributionGroup } from "./error-analysis-types";

const STAGES = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
const SOCKET_NUMS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

function buildSummary(records: ErrorAnalysisRecord[]): ErrorAnalysisSummary {
  const totalCount = records.length;
  const passCount = records.filter((r) => r.status === "PASS").length;
  const failCount = records.filter((r) => r.status === "FAIL").length;
  const yieldPercent =
    totalCount > 0 ? (passCount / totalCount) * 100 : 0;

  const errorCounts = new Map<string, number>();
  for (const rec of records) {
    if (rec.status !== "FAIL") continue;
    for (const item of rec.failingItems) {
      errorCounts.set(item, (errorCounts.get(item) ?? 0) + 1);
    }
  }

  const ranked = [...errorCounts.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked[0] ?? null;

  return {
    totalCount,
    passCount,
    failCount,
    yieldPercent,
    uniqueErrorCount: errorCounts.size,
    topError: top?.[0] ?? null,
    topErrorCount: top?.[1] ?? 0,
  };
}

function buildErrorRanking(records: ErrorAnalysisRecord[]): ErrorRankItem[] {
  const counts = new Map<string, number>();
  let totalFails = 0;
  for (const rec of records) {
    if (rec.status !== "FAIL") continue;
    const errStr = (rec.errorMessage?.trim() || rec.primaryFailItem).trim();
    if (!errStr) continue;
    counts.set(errStr, (counts.get(errStr) ?? 0) + 1);
    totalFails += 1;
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([item, count]) => ({
      item,
      count,
      percent: totalFails > 0 ? (count / totalFails) * 100 : 0,
    }));
}

function buildFailMap(records: ErrorAnalysisRecord[]): SocketFailCell[] {
  const failRecords = records.filter((r) => r.status === "FAIL");
  const cells: SocketFailCell[] = [];

  for (const stage of STAGES) {
    for (const num of SOCKET_NUMS) {
      const socket = `${stage}${String(num).padStart(2, "0")}`;
      const cellRecords = failRecords.filter((r) => r.socket === socket);
      const errorCounts = new Map<string, number>();
      for (const rec of cellRecords) {
        for (const item of rec.failingItems) {
          errorCounts.set(item, (errorCounts.get(item) ?? 0) + 1);
        }
      }
      const topErrors: ErrorRankItem[] = [...errorCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([item, count]) => ({
          item,
          count,
          percent: cellRecords.length > 0 ? (count / cellRecords.length) * 100 : 0,
        }));

      cells.push({
        stage,
        socketNum: num,
        socket,
        failCount: cellRecords.length,
        topErrors,
        records: cellRecords,
      });
    }
  }

  return cells;
}

function buildDistributionItemsByGroup(
  records: ErrorAnalysisRecord[]
): Partial<Record<ErrorDistributionGroup, ErrorRankItem[]>> {
  const byGroup = new Map<ErrorDistributionGroup, Map<string, number>>();

  for (const rec of records) {
    if (rec.status !== "FAIL") continue;
    const item = rec.primaryFailItem;
    const group = resolveErrorDistributionGroup(item);
    if (!byGroup.has(group)) byGroup.set(group, new Map());
    const counts = byGroup.get(group)!;
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  const result: Partial<Record<ErrorDistributionGroup, ErrorRankItem[]>> = {};
  for (const [group, counts] of byGroup) {
    const total = [...counts.values()].reduce((s, v) => s + v, 0);
    result[group] = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([item, count]) => ({
        item,
        count,
        percent: total > 0 ? (count / total) * 100 : 0,
      }));
  }
  return result;
}

function buildContFailMap(records: ErrorAnalysisRecord[]): ContFailCell[] {
  const failRecords = records.filter((r) => r.status === "FAIL");
  const cells: ContFailCell[] = [];

  for (const stage of STAGES) {
    for (const num of SOCKET_NUMS) {
      const socket = `${stage}${String(num).padStart(2, "0")}`;
      const cellRecords = failRecords.filter((r) => r.socket === socket);
      const pinCounts = new Map<string, ContPinStat>();

      for (const rec of cellRecords) {
        for (const item of rec.failingItems) {
          if (!isContactFailItem(item)) continue;
          const parsed = parseContactFailItem(item);
          if (!parsed) continue;
          const key = parsed.pinLabel;
          const existing = pinCounts.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            pinCounts.set(key, { ...parsed, count: 1 });
          }
        }
      }

      const pins = [...pinCounts.values()].sort((a, b) => b.count - a.count);
      const failCount = pins.reduce((s, p) => s + p.count, 0);

      cells.push({
        stage,
        socketNum: num,
        socket,
        failCount,
        topPins: pins.slice(0, 3),
        pins,
      });
    }
  }

  return cells;
}

function buildContPinInspectionList(
  cells: ContFailCell[]
): ContPinInspectionItem[] {
  const pinMap = new Map<
    string,
    { stat: ContPinStat; sockets: Map<string, number> }
  >();

  for (const cell of cells) {
    for (const pin of cell.pins) {
      const key = pin.pinLabel;
      let entry = pinMap.get(key);
      if (!entry) {
        entry = {
          stat: { ...pin, count: 0 },
          sockets: new Map(),
        };
        pinMap.set(key, entry);
      }
      entry.stat.count += pin.count;
      entry.sockets.set(
        cell.socket,
        (entry.sockets.get(cell.socket) ?? 0) + pin.count
      );
    }
  }

  const total = [...pinMap.values()].reduce((s, e) => s + e.stat.count, 0);

  return [...pinMap.values()]
    .map(({ stat, sockets }) => ({
      contactLabel: stat.contactLabel,
      pin: stat.pin,
      pinLabel: stat.pinLabel,
      totalCount: stat.count,
      socketCount: sockets.size,
      topSockets: [...sockets.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([socket, count]) => ({ socket, count })),
      percent: total > 0 ? (stat.count / total) * 100 : 0,
    }))
    .sort((a, b) => b.totalCount - a.totalCount);
}

function buildDistribution(
  records: ErrorAnalysisRecord[]
): ErrorDistributionSlice[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const rec of records) {
    if (rec.status !== "FAIL") continue;
    const group = resolveErrorDistributionGroup(rec.primaryFailItem);
    counts.set(group, (counts.get(group) ?? 0) + 1);
    total += 1;
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([group, count]) => ({
      group: group as ErrorDistributionSlice["group"],
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
      color: ERROR_DISTRIBUTION_COLORS[group as ErrorDistributionSlice["group"]],
    }));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * p) - 1)
  );
  return sorted[idx]!;
}

const EMPTY_TEST_TIME_ANALYSIS: TestTimeAnalysis = {
  points: [],
  abnormalRuns: [],
  slowRuns: [],
  medianSec: 0,
  meanSec: 0,
  p95Sec: 0,
  abnormalThresholdSec: DEFAULT_ABNORMAL_TEST_TIME_THRESHOLD_SEC,
  slowThresholdSec: DEFAULT_ABNORMAL_TEST_TIME_THRESHOLD_SEC,
  abnormalCount: 0,
  slowCount: 0,
  abnormalRate: 0,
  maxSec: 0,
  minSec: 0,
};

function buildTestTimeAnalysis(records: ErrorAnalysisRecord[]): TestTimeAnalysis {
  const trendRecords = recordsForTestTimeTrend(records);
  const values: number[] = [];
  const basePoints: Omit<TestTimePoint, "isAbnormal" | "isSlow">[] = [];

  for (const rec of trendRecords) {
    const point = buildTestTimePoint(rec);
    if (!point) continue;
    values.push(point.testTimeSec);
    basePoints.push(point);
  }

  if (basePoints.length === 0) {
    return EMPTY_TEST_TIME_ANALYSIS;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const medianSec = percentile(sorted, 0.5);
  const p95Sec = percentile(sorted, 0.95);
  const meanSec = values.reduce((s, v) => s + v, 0) / values.length;
  const abnormalThresholdSec = DEFAULT_ABNORMAL_TEST_TIME_THRESHOLD_SEC;

  const points = markAbnormalPoints(basePoints, abnormalThresholdSec).sort(
    (a, b) => {
      if (a.startTimeMs != null && b.startTimeMs != null) {
        return a.startTimeMs - b.startTimeMs;
      }
      return a.runIndex - b.runIndex;
    }
  );

  const abnormalRuns = points
    .filter((p) => p.isAbnormal)
    .sort((a, b) => {
      if (a.startTime && b.startTime && a.startTime !== b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return a.runIndex - b.runIndex;
    });

  const abnormalCount = points.filter((p) => p.isAbnormal).length;

  return {
    points,
    abnormalRuns,
    slowRuns: abnormalRuns,
    medianSec,
    meanSec,
    p95Sec,
    abnormalThresholdSec,
    slowThresholdSec: abnormalThresholdSec,
    abnormalCount,
    slowCount: abnormalCount,
    abnormalRate:
      points.length > 0 ? (abnormalCount / points.length) * 100 : 0,
    maxSec: sorted[sorted.length - 1]!,
    minSec: sorted[0]!,
  };
}

function buildTrend(records: ErrorAnalysisRecord[]): ErrorTrendPoint[] {
  const bucketSize = Math.max(1, Math.ceil(records.length / 80));
  const points: ErrorTrendPoint[] = [];

  for (let i = 0; i < records.length; i += bucketSize) {
    const slice = records.slice(i, i + bucketSize);
    const failCount = slice.filter((r) => r.status === "FAIL").length;
    points.push({
      runIndex: slice[0]?.runIndex ?? i + 1,
      failCount,
      barcode: slice[0]?.barcode ?? "",
    });
  }
  return points;
}

function buildSocketRanking(records: ErrorAnalysisRecord[]): SocketRankItem[] {
  const counts = new Map<string, number>();
  for (const rec of records) {
    if (rec.status !== "FAIL") continue;
    counts.set(rec.socket, (counts.get(rec.socket) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([socket, failCount]) => ({ socket, failCount }));
}

function buildStageRanking(records: ErrorAnalysisRecord[]): StageRankItem[] {
  const counts = new Map<string, number>();
  for (const rec of records) {
    if (rec.status !== "FAIL") continue;
    counts.set(rec.stage, (counts.get(rec.stage) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([stage, failCount]) => ({ stage, failCount }));
}

function buildCorrelations(
  records: ErrorAnalysisRecord[]
): ErrorCorrelationPair[] {
  const pairCounts = new Map<string, number>();

  for (const rec of records) {
    if (rec.status !== "FAIL" || rec.failingItems.length < 2) continue;
    const items = [...new Set(rec.failingItems)];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const key = `${a}→${b}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return [...pairCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([key, count]) => {
      const [from, to] = key.split("→");
      return { from: from!, to: to!, count };
    });
}

export function buildErrorAnalysis(
  fileName: string,
  records: ErrorAnalysisRecord[],
  options?: {
    uphCountMode?: UphCountMode;
    uphIntervalMinutes?: UphIntervalMinutes;
  }
): ErrorAnalysisResult {
  const failItems = new Set<string>();
  const groups = new Set<string>();
  const sockets = new Set<string>();
  const stages = new Set<string>();
  const stations = new Set<number>();

  for (const rec of records) {
    sockets.add(rec.socket);
    stages.add(rec.stage);
    if (rec.station != null) stations.add(rec.station);
    if (rec.primaryFailItem) failItems.add(rec.primaryFailItem);
    for (const item of rec.failingItems) failItems.add(item);
    for (const g of rec.analysisGroups) groups.add(g);
  }

  const contFailMap = buildContFailMap(records);
  const testTimeAnalysis = buildTestTimeAnalysis(records);
  const uphCountMode = options?.uphCountMode ?? "completion";
  const uphIntervalMinutes = options?.uphIntervalMinutes ?? 10;
  const uphAnalysis = buildUphAnalysis(records, testTimeAnalysis, uphCountMode);
  const uphTrend = buildUphTrend(
    records,
    uphAnalysis,
    uphIntervalMinutes,
    uphCountMode
  );
  const uphChartTrend = buildUphChartTrend(
    records,
    uphAnalysis,
    uphCountMode
  );

  return {
    fileName,
    records,
    summary: buildSummary(records),
    errorRanking: buildErrorRanking(records),
    failMap: buildFailMap(records),
    contFailMap,
    contPinInspection: buildContPinInspectionList(contFailMap),
    distribution: buildDistribution(records),
    trend: buildTrend(records),
    socketRanking: buildSocketRanking(records),
    stageRanking: buildStageRanking(records),
    correlations: buildCorrelations(records),
    availableGroups: [...groups].sort() as ErrorAnalysisResult["availableGroups"],
    availableSockets: [...sockets].sort(),
    availableStages: [...stages].sort(),
    availableStations: [...stations].sort((a, b) => a - b),
    availableFailItems: [...failItems].sort(),
    distributionItemsByGroup: buildDistributionItemsByGroup(records),
    testTimeAnalysis,
    uphAnalysis,
    uphTrend,
    uphChartTrend,
  };
}

export function filterErrorRecords(
  records: ErrorAnalysisRecord[],
  filters: ErrorAnalysisFilters
): ErrorAnalysisRecord[] {
  const q = filters.search.trim().toLowerCase();
  const rangeStartMs = filters.timeRangeStart.trim()
    ? parseErrorDateTimeMs(filters.timeRangeStart)
    : null;
  const rangeEndMs = filters.timeRangeEnd.trim()
    ? parseErrorDateTimeMs(filters.timeRangeEnd)
    : null;

  return records.filter((rec) => {
    if (filters.passFail !== "ALL" && rec.status !== filters.passFail) {
      return false;
    }
    if (filters.socket !== "ALL" && rec.socket !== filters.socket) {
      return false;
    }
    if (filters.stage !== "ALL" && rec.stage !== filters.stage) {
      return false;
    }
    if (filters.station !== "ALL" && rec.station !== filters.station) {
      return false;
    }
    if (
      filters.failItem !== "ALL" &&
      rec.primaryFailItem !== filters.failItem &&
      !rec.failingItems.includes(filters.failItem)
    ) {
      return false;
    }
    if (
      filters.analysisGroup !== "ALL" &&
      !rec.analysisGroups.includes(filters.analysisGroup)
    ) {
      return false;
    }
    if (filters.abnormalStatus !== "ALL") {
      const status = resolveAbnormalStatus(rec.testTimeSec);
      if (status !== filters.abnormalStatus) return false;
    }
    if (rangeStartMs != null || rangeEndMs != null) {
      const recMs =
        parseErrorDateTimeMs(rec.startTime) ??
        parseErrorDateTimeMs(rec.timestamp);
      if (recMs == null) return false;
      if (rangeStartMs != null && recMs < rangeStartMs) return false;
      if (rangeEndMs != null && recMs > rangeEndMs) return false;
    }
    if (q) {
      const hay = [
        rec.barcode,
        rec.socket,
        rec.stage,
        rec.primaryFailItem,
        rec.startTime,
        rec.endTime,
        rec.errorMessage ?? "",
        rec.station != null ? `station${rec.station}` : "",
        ...rec.failingItems,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function filterErrorAnalysis(
  analysis: ErrorAnalysisResult,
  filters: ErrorAnalysisFilters,
  options?: {
    uphCountMode?: UphCountMode;
    uphIntervalMinutes?: UphIntervalMinutes;
  }
): ErrorAnalysisResult {
  const records = filterErrorRecords(analysis.records, filters);
  return buildErrorAnalysis(analysis.fileName, records, options);
}

export { CANONICAL_GOLDEN_SOCKETS, STAGES, SOCKET_NUMS };

export function failMapHeatColor(count: number): {
  bg: string;
  text: string;
} {
  if (count <= 0) {
    return { bg: "#1e293b", text: "#475569" };
  }
  if (count <= 3) {
    return { bg: "#7f1d1d", text: "#fecaca" };
  }
  if (count <= 9) {
    return { bg: "#dc2626", text: "#ffffff" };
  }
  return { bg: "#991b1b", text: "#ffffff" };
}
