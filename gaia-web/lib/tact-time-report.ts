import { buildTactTimeCycleAnalysis } from "./tact-time-cycles";
import { TACT_TIME_ETC_GROUP_ID } from "./tact-time-cycles";
import { applyStationHeaderTransforms } from "./tact-time-header-disambiguation";
import { parseTactTimeCsv } from "./tact-time-parser";
import type {
  StationCsvMap,
  TactTimeFullReport,
  TactTimeReportCycleMode,
  TactTimeReportGroupRow,
  TactTimeReportStatus,
  TactTimeReportThresholds,
  TactTimeStationReport,
} from "./tact-time-report-types";
import { DEFAULT_TACT_TIME_REPORT_THRESHOLDS } from "./tact-time-report-types";
import type {
  TactTimeCycle,
  TactTimeGroup,
  TactTimeStationId,
  TactTimeStationStore,
} from "./tact-time-types";
import {
  TACT_TIME_STATION_COUNT,
  tactTimeStationLabel,
} from "./tact-time-types";

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function msToSec(ms: number): number {
  return ms / 1000;
}

function groupIncludedItems(
  groupId: string,
  groups: TactTimeGroup[],
  cycle: TactTimeCycle | null
): string {
  const configured = groups.find((g) => g.id === groupId);
  if (configured && configured.headers.length > 0) {
    return configured.headers.join(", ");
  }
  if (groupId === TACT_TIME_ETC_GROUP_ID) {
    if (cycle) {
      const etcItems = cycle.entries
        .filter((e) => e.groupId === TACT_TIME_ETC_GROUP_ID)
        .map((e) => e.header);
      return etcItems.length > 0 ? etcItems.join(", ") : "기타 항목";
    }
    return "기타 항목";
  }
  return "";
}

function buildRowsFromCycle(
  cycle: TactTimeCycle,
  groups: TactTimeGroup[]
): TactTimeReportGroupRow[] {
  const breakdownMap = new Map(
    cycle.groupBreakdown.map((g) => [g.groupId, g])
  );
  const seen = new Set<string>();
  const rows: TactTimeReportGroupRow[] = [];

  for (const entry of cycle.entries) {
    if (seen.has(entry.groupId)) continue;
    seen.add(entry.groupId);
    const gb = breakdownMap.get(entry.groupId);
    if (!gb || gb.durationMs <= 0) continue;
    rows.push({
      groupName: gb.groupName,
      durationMs: gb.durationMs,
      durationSec: msToSec(gb.durationMs),
      includedItems: groupIncludedItems(entry.groupId, groups, cycle),
    });
  }

  for (const gb of cycle.groupBreakdown) {
    if (seen.has(gb.groupId)) continue;
    rows.push({
      groupName: gb.groupName,
      durationMs: gb.durationMs,
      durationSec: msToSec(gb.durationMs),
      includedItems: groupIncludedItems(gb.groupId, groups, cycle),
    });
  }

  return rows;
}

function buildRowsFromAverage(
  cycles: TactTimeCycle[],
  groups: TactTimeGroup[]
): { totalSec: number; rows: TactTimeReportGroupRow[] } {
  const measurable = cycles.filter((c) => c.totalDurationMs > 0);
  if (measurable.length === 0) {
    return { totalSec: 0, rows: [] };
  }

  const groupMeta = new Map<string, string>();
  for (const g of groups) groupMeta.set(g.id, g.name);
  groupMeta.set(TACT_TIME_ETC_GROUP_ID, "ETC");

  for (const cycle of measurable) {
    for (const gb of cycle.groupBreakdown) {
      if (!groupMeta.has(gb.groupId)) {
        groupMeta.set(gb.groupId, gb.groupName);
      }
    }
  }

  const rows: TactTimeReportGroupRow[] = [];
  const seen = new Set<string>();

  const templateCycle = measurable[0]!;
  const templateOrder: string[] = [];
  for (const entry of templateCycle.entries) {
    if (!templateOrder.includes(entry.groupId)) {
      templateOrder.push(entry.groupId);
    }
  }
  for (const gb of templateCycle.groupBreakdown) {
    if (!templateOrder.includes(gb.groupId)) {
      templateOrder.push(gb.groupId);
    }
  }

  for (const groupId of templateOrder) {
    if (seen.has(groupId)) continue;
    seen.add(groupId);
    const durations = measurable.map(
      (c) => c.groupBreakdown.find((g) => g.groupId === groupId)?.durationMs ?? 0
    );
    const avgMs = mean(durations);
    if (avgMs <= 0) continue;
    rows.push({
      groupName: groupMeta.get(groupId) ?? groupId,
      durationMs: avgMs,
      durationSec: msToSec(avgMs),
      includedItems: groupIncludedItems(
        groupId,
        groups,
        templateCycle ?? null
      ),
    });
  }

  for (const [groupId, name] of groupMeta) {
    if (seen.has(groupId)) continue;
    const durations = measurable.map(
      (c) => c.groupBreakdown.find((g) => g.groupId === groupId)?.durationMs ?? 0
    );
    const avgMs = mean(durations);
    if (avgMs <= 0) continue;
    rows.push({
      groupName: name,
      durationMs: avgMs,
      durationSec: msToSec(avgMs),
      includedItems: groupIncludedItems(
        groupId,
        groups,
        templateCycle ?? null
      ),
    });
  }

  return {
    totalSec: msToSec(mean(measurable.map((c) => c.totalDurationMs))),
    rows,
  };
}

function pickCycle(
  cycles: TactTimeCycle[],
  mode: TactTimeReportCycleMode,
  selectedCycleNumber: number | null,
  summary: ReturnType<typeof buildTactTimeCycleAnalysis>
): { cycle: TactTimeCycle | null; label: string } {
  const measurable = cycles.filter(
    (c) => c.fromTotalTimeLabel && c.totalDurationMs > 0
  );
  if (measurable.length === 0) {
    return { cycle: null, label: "No valid cycle" };
  }

  switch (mode) {
    case "first":
      return { cycle: measurable[0]!, label: `Cycle #${measurable[0]!.cycleNumber}` };
    case "worst":
      return {
        cycle: summary?.summary.worstCycle ?? measurable[measurable.length - 1]!,
        label: `Worst Cycle #${(summary?.summary.worstCycle ?? measurable[measurable.length - 1]!).cycleNumber}`,
      };
    case "selected": {
      const n = selectedCycleNumber ?? measurable[0]!.cycleNumber;
      const found =
        measurable.find((c) => c.cycleNumber === n) ?? measurable[0]!;
      return { cycle: found, label: `Cycle #${found.cycleNumber}` };
    }
    case "average":
    default:
      return { cycle: null, label: `Average (${measurable.length} cycles)` };
  }
}

export function buildStationReport(
  stationId: TactTimeStationId,
  upload: { fileName: string; text: string } | null | undefined,
  groups: TactTimeGroup[],
  cycleMode: TactTimeReportCycleMode,
  selectedCycleNumber: number | null = null
): TactTimeStationReport {
  const base: TactTimeStationReport = {
    stationId,
    stationLabel: tactTimeStationLabel(stationId),
    fileName: upload?.fileName ?? null,
    hasData: false,
    error: null,
    cycleMode,
    cycleLabel: "",
    totalSec: null,
    groups: [],
    status: "N/A",
    remark: upload ? "" : "Station skipped",
  };

  if (!upload?.text) return base;

  try {
    const raw = parseTactTimeCsv(upload.text, upload.fileName);
    const parsed = applyStationHeaderTransforms(raw, stationId);
    const cycleAnalysis = buildTactTimeCycleAnalysis(
      parsed.logEntries,
      groups
    );

    if (!cycleAnalysis || cycleAnalysis.summary.cycleCount === 0) {
      return {
        ...base,
        fileName: upload.fileName,
        error:
          cycleAnalysis?.rootCauseMessage ??
          "유효한 Cycle(Total time) 데이터가 없습니다.",
        remark: "No valid cycle data",
      };
    }

    const { cycle, label } = pickCycle(
      cycleAnalysis.cycles,
      cycleMode,
      selectedCycleNumber,
      cycleAnalysis
    );

    let groups_rows: TactTimeReportGroupRow[];
    let totalSec: number;

    if (cycleMode === "average" || !cycle) {
      const avg = buildRowsFromAverage(cycleAnalysis.cycles, groups);
      groups_rows = avg.rows;
      totalSec = avg.totalSec;
    } else {
      groups_rows = buildRowsFromCycle(cycle, groups);
      totalSec = msToSec(cycle.totalDurationMs);
    }

    return {
      ...base,
      fileName: upload.fileName,
      hasData: true,
      cycleLabel: label,
      totalSec,
      groups: groups_rows,
      status: "OK",
      remark: "",
    };
  } catch (e) {
    return {
      ...base,
      fileName: upload.fileName,
      error: e instanceof Error ? e.message : "분석 실패",
      remark: "Parse error",
    };
  }
}

function collectGroupColumns(stations: TactTimeStationReport[]): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const station of stations) {
    for (const row of station.groups) {
      if (seen.has(row.groupName)) continue;
      seen.add(row.groupName);
      order.push(row.groupName);
    }
  }
  return order;
}

function buildRemark(
  station: TactTimeStationReport,
  peers: TactTimeStationReport[]
): string {
  const others = peers.filter(
    (s) => s.hasData && s.stationId !== station.stationId
  );
  if (others.length === 0) return "Total Tact Increased";

  let maxIncrease = 0;
  let maxGroup = "";

  for (const row of station.groups) {
    const peerAvgs = others
      .map((s) => s.groups.find((g) => g.groupName === row.groupName))
      .filter((g): g is TactTimeReportGroupRow => !!g)
      .map((g) => g.durationSec);
    if (peerAvgs.length === 0) continue;
    const peerAvg = mean(peerAvgs);
    const increase = row.durationSec - peerAvg;
    if (increase > maxIncrease) {
      maxIncrease = increase;
      maxGroup = row.groupName;
    }
  }

  if (maxGroup && maxIncrease >= 0.05) {
    return `${maxGroup} Increased`;
  }
  return "Total Tact Increased";
}

function applyStatusRules(
  stations: TactTimeStationReport[],
  thresholds: TactTimeReportThresholds
): TactTimeStationReport[] {
  const withData = stations.filter((s) => s.hasData && s.totalSec != null);
  const totals = withData.map((s) => s.totalSec!);
  const avg = mean(totals);
  const sd = stdDev(totals, avg);

  return stations.map((station) => {
    if (!station.hasData || station.totalSec == null) {
      return {
        ...station,
        status: "N/A" as TactTimeReportStatus,
        remark: station.remark || "Station skipped",
      };
    }

    if (withData.length < 2) {
      return { ...station, status: "OK" as TactTimeReportStatus, remark: "" };
    }

    const percentAbove = avg > 0 ? ((station.totalSec - avg) / avg) * 100 : 0;
    const sigmaExceeded =
      thresholds.useSigma && station.totalSec > avg + 3 * sd;
    const percentExceeded =
      percentAbove > thresholds.checkPercentAboveAvg;

    if (percentExceeded || sigmaExceeded) {
      return {
        ...station,
        status: "CHECK" as TactTimeReportStatus,
        remark: buildRemark(station, withData),
      };
    }

    return { ...station, status: "OK" as TactTimeReportStatus, remark: "" };
  });
}

export function buildTactTimeFullReport(
  uploads: StationCsvMap,
  stationStore: TactTimeStationStore,
  cycleMode: TactTimeReportCycleMode,
  thresholds: TactTimeReportThresholds,
  selectedCycleNumber: number | null = null
): TactTimeFullReport {
  const stations: TactTimeStationReport[] = [];

  for (let i = 1; i <= TACT_TIME_STATION_COUNT; i++) {
    const stationId = i as TactTimeStationId;
    const groups =
      stationStore.stations[String(stationId)]?.groups ?? [];
    stations.push(
      buildStationReport(
        stationId,
        uploads[stationId],
        groups,
        cycleMode,
        selectedCycleNumber
      )
    );
  }

  const withStatus = applyStatusRules(stations, thresholds);

  return {
    generatedAt: new Date(),
    cycleMode,
    thresholds,
    stations: withStatus,
    groupColumns: collectGroupColumns(withStatus),
  };
}
