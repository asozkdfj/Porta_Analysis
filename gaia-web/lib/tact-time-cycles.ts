import { getSnColor } from "./chart-colors";
import { isCycleTotalTimeLabel, parseTimeLabelToMs } from "./tact-time-parser";
import type {
  TactTimeCycle,
  TactTimeCycleAnalysis,
  TactTimeCycleGroupBreakdown,
  TactTimeCycleItem,
  TactTimeCycleSummary,
  TactTimeGroup,
  TactTimeGroupContribution,
  TactTimeGroupDelta,
  TactTimeGroupAvgWorstDelta,
  TactTimeLogEntry,
} from "./tact-time-types";

const UNGROUPED_ID = "__ungrouped__";
const UNGROUPED_NAME = "ETC";
const UNGROUPED_COLOR = "#64748b";

export const TACT_TIME_ETC_GROUP_ID = UNGROUPED_ID;

interface GroupMeta {
  id: string;
  name: string;
  color: string;
  headers: Set<string>;
}

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

function buildGroupMetas(groups: TactTimeGroup[]): GroupMeta[] {
  return groups.map((g, index) => ({
    id: g.id,
    name: g.name,
    color: getSnColor(index),
    headers: new Set(g.headers),
  }));
}

function resolveGroup(
  header: string,
  metas: GroupMeta[]
): GroupMeta {
  for (const meta of metas) {
    if (meta.headers.has(header)) return meta;
  }
  return {
    id: UNGROUPED_ID,
    name: UNGROUPED_NAME,
    color: UNGROUPED_COLOR,
    headers: new Set(),
  };
}

/** 로그를 Cycle 단위로 분할 — Total time Label 기준 (1행 = 1 Cycle 종료) */
export function detectCyclesByTotalTimeMarker(
  entries: TactTimeLogEntry[]
): TactTimeLogEntry[][] {
  if (entries.length === 0) return [];

  const ordered = [...entries].sort((a, b) => a.rowIndex - b.rowIndex);
  const cycles: TactTimeLogEntry[][] = [];
  let current: TactTimeLogEntry[] = [];

  for (const entry of ordered) {
    if (isCycleTotalTimeLabel(entry.header)) {
      cycles.push([...current, entry]);
      current = [];
    } else {
      current.push(entry);
    }
  }

  return cycles;
}

export function logHasTotalTimeLabel(entries: TactTimeLogEntry[]): boolean {
  return entries.some((e) => isCycleTotalTimeLabel(e.header));
}

/** 로그를 Cycle 단위로 분할 — Label 재등장 또는 시간 역전 시 새 Cycle */
export function detectCycles(entries: TactTimeLogEntry[]): TactTimeLogEntry[][] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => {
    if (a.startMs !== b.startMs) return a.startMs - b.startMs;
    return a.rowIndex - b.rowIndex;
  });

  const cycles: TactTimeLogEntry[][] = [];
  let current: TactTimeLogEntry[] = [];
  const labelsInCycle = new Set<string>();
  let lastEndMs = -1;

  for (const entry of sorted) {
    const duplicateLabel =
      labelsInCycle.has(entry.header) && current.length > 0;
    const timeBackward =
      lastEndMs >= 0 &&
      entry.startMs > 0 &&
      entry.startMs < lastEndMs - 30;

    if (current.length > 0 && (duplicateLabel || timeBackward)) {
      cycles.push(current);
      current = [];
      labelsInCycle.clear();
      lastEndMs = -1;
    }

    current.push(entry);
    labelsInCycle.add(entry.header);
    if (entry.endMs > lastEndMs) lastEndMs = entry.endMs;
    else if (entry.startMs + entry.durationMs > lastEndMs) {
      lastEndMs = entry.startMs + entry.durationMs;
    }
  }

  if (current.length > 0) cycles.push(current);
  return cycles;
}

function earliestLabel(entries: TactTimeLogEntry[]): string {
  if (entries.length === 0) return "—";
  return entries.reduce((best, e) => {
    if (!best) return e.startTime || "—";
    if (!e.startTime) return best;
    return parseTimeLabelToMs(e.startTime) < parseTimeLabelToMs(best)
      ? e.startTime
      : best;
  }, "");
}

function latestLabel(entries: TactTimeLogEntry[]): string {
  if (entries.length === 0) return "—";
  return entries.reduce((best, e) => {
    if (!best) return e.endTime || "—";
    if (!e.endTime) return best;
    return parseTimeLabelToMs(e.endTime) > parseTimeLabelToMs(best)
      ? e.endTime
      : best;
  }, "");
}

function buildCycleGroupBreakdown(
  items: TactTimeCycleItem[]
): TactTimeCycleGroupBreakdown[] {
  const map = new Map<string, TactTimeCycleGroupBreakdown>();

  for (const item of items) {
    const existing = map.get(item.groupId);
    if (existing) {
      existing.durationMs += item.durationMs;
      existing.items.push(item);
    } else {
      map.set(item.groupId, {
        groupId: item.groupId,
        groupName: item.groupName,
        durationMs: item.durationMs,
        color: item.groupColor,
        items: [item],
      });
    }
  }

  return [...map.values()].sort((a, b) => b.durationMs - a.durationMs);
}

function resolveCycleTotalDurationMs(rawEntries: TactTimeLogEntry[]): {
  totalDurationMs: number;
  fromTotalTimeLabel: boolean;
} {
  const totalRows = rawEntries.filter((e) => isCycleTotalTimeLabel(e.header));
  if (totalRows.length === 0) {
    return { totalDurationMs: 0, fromTotalTimeLabel: false };
  }
  const last = totalRows[totalRows.length - 1]!;
  return { totalDurationMs: last.durationMs, fromTotalTimeLabel: true };
}

function buildSingleCycle(
  cycleNumber: number,
  rawEntries: TactTimeLogEntry[],
  metas: GroupMeta[],
  isOutlier: boolean
): TactTimeCycle {
  const stepEntries = rawEntries.filter((e) => !isCycleTotalTimeLabel(e.header));
  const entries: TactTimeCycleItem[] = stepEntries.map((e) => {
    const group = resolveGroup(e.header, metas);
    return {
      header: e.header,
      durationMs: e.durationMs,
      startTime: e.startTime,
      endTime: e.endTime,
      groupId: group.id,
      groupName: group.name,
      groupColor: group.color,
    };
  });

  const { totalDurationMs, fromTotalTimeLabel } =
    resolveCycleTotalDurationMs(rawEntries);

  return {
    id: `cycle-${cycleNumber}`,
    cycleNumber,
    totalDurationMs,
    fromTotalTimeLabel,
    startTime: earliestLabel(stepEntries.length > 0 ? stepEntries : rawEntries),
    endTime: latestLabel(stepEntries.length > 0 ? stepEntries : rawEntries),
    entries,
    groupBreakdown: buildCycleGroupBreakdown(entries),
    isOutlier,
  };
}

function detectOutliers(
  cycles: TactTimeCycle[],
  totals: number[]
): { thresholdMs: number; outlierIds: Set<string> } {
  if (cycles.length === 0) {
    return { thresholdMs: 0, outlierIds: new Set() };
  }

  const avg = mean(totals);
  const sd = stdDev(totals, avg);
  const sigmaThreshold = avg + 3 * sd;

  const sortedDesc = [...totals].sort((a, b) => b - a);
  const topN = Math.max(1, Math.ceil(cycles.length * 0.05));
  const percentileThreshold = sortedDesc[topN - 1] ?? sortedDesc[0];

  const thresholdMs = Math.min(sigmaThreshold, percentileThreshold);
  const outlierIds = new Set<string>();

  cycles.forEach((c) => {
    if (c.totalDurationMs >= thresholdMs && c.totalDurationMs > avg) {
      outlierIds.add(c.id);
    }
  });

  return { thresholdMs, outlierIds };
}

function emptyCycleAnalysis(
  rootCauseMessage: string
): TactTimeCycleAnalysis {
  return {
    cycles: [],
    summary: {
      cycleCount: 0,
      avgDurationMs: 0,
      minDurationMs: 0,
      maxDurationMs: 0,
      stdDevMs: 0,
      bestCycle: null,
      worstCycle: null,
      differenceMs: 0,
      outlierCount: 0,
      outlierThresholdMs: 0,
    },
    contributions: [],
    deltas: [],
    avgWorstDeltas: [],
    rootCauseGroup: null,
    rootCauseMessage,
    avgWorstRootCauseGroup: null,
    avgWorstRootCauseMessage: "Average/Worst Cycle 비교 데이터가 부족합니다.",
    excludedCycles: [],
  };
}

export function buildTactTimeCycleAnalysis(
  logEntries: TactTimeLogEntry[],
  groups: TactTimeGroup[],
  excludedCycleIds: ReadonlySet<string> = new Set()
): TactTimeCycleAnalysis | null {
  if (logEntries.length === 0) return null;

  if (!logHasTotalTimeLabel(logEntries)) {
    return emptyCycleAnalysis(
      `CSV에 "${CYCLE_TOTAL_TIME_ROW_LABEL}" Label이 없습니다. Cycle Total Time 분석을 할 수 없습니다.`
    );
  }

  const rawCycles = detectCyclesByTotalTimeMarker(logEntries);
  if (rawCycles.length === 0) return null;

  const metas = buildGroupMetas(groups);

  const preliminary = rawCycles.map((raw, i) =>
    buildSingleCycle(i + 1, raw, metas, false)
  );
  const validPreliminary = preliminary.filter(
    (c) =>
      c.fromTotalTimeLabel &&
      c.totalDurationMs > 0 &&
      !excludedCycleIds.has(c.id)
  );
  if (validPreliminary.length === 0) {
    const excludedOnly = preliminary.filter(
      (c) =>
        c.fromTotalTimeLabel &&
        c.totalDurationMs > 0 &&
        excludedCycleIds.has(c.id)
    );
    if (excludedOnly.length > 0) {
      return {
        ...emptyCycleAnalysis(
          "모든 Cycle이 분석에서 제외되었습니다. 아래에서 복원하세요."
        ),
        excludedCycles: excludedOnly,
      };
    }
    return emptyCycleAnalysis(
      `"${CYCLE_TOTAL_TIME_ROW_LABEL}" Label 행은 있으나 유효한 DurationMs가 없습니다.`
    );
  }

  const totals = validPreliminary.map((c) => c.totalDurationMs);
  const { thresholdMs, outlierIds } = detectOutliers(validPreliminary, totals);

  const allCycles = rawCycles
    .map((raw, i) =>
      buildSingleCycle(
        i + 1,
        raw,
        metas,
        outlierIds.has(`cycle-${i + 1}`)
      )
    )
    .filter((c) => c.fromTotalTimeLabel);

  const excludedCycles = allCycles.filter((c) => excludedCycleIds.has(c.id));
  const cycles = allCycles.filter((c) => !excludedCycleIds.has(c.id));
  const measurableCycles = cycles.filter((c) => c.totalDurationMs > 0);
  const statsTotals = measurableCycles.map((c) => c.totalDurationMs);

  const avgDurationMs = mean(statsTotals);
  const minDurationMs = Math.min(...statsTotals);
  const maxDurationMs = Math.max(...statsTotals);
  const stdDevMs = stdDev(statsTotals, avgDurationMs);

  const bestCycle =
    measurableCycles.find((c) => c.totalDurationMs === minDurationMs) ?? null;
  const worstCycle =
    measurableCycles.find((c) => c.totalDurationMs === maxDurationMs) ?? null;

  const summary: TactTimeCycleSummary = {
    cycleCount: measurableCycles.length,
    avgDurationMs,
    minDurationMs,
    maxDurationMs,
    stdDevMs,
    bestCycle,
    worstCycle,
    differenceMs: maxDurationMs - minDurationMs,
    outlierCount: outlierIds.size,
    outlierThresholdMs: thresholdMs,
  };

  const groupNames = new Map<string, GroupMeta>();
  for (const meta of metas) groupNames.set(meta.id, meta);
  groupNames.set(UNGROUPED_ID, {
    id: UNGROUPED_ID,
    name: UNGROUPED_NAME,
    color: UNGROUPED_COLOR,
    headers: new Set(),
  });

  for (const cycle of cycles) {
    for (const gb of cycle.groupBreakdown) {
      if (!groupNames.has(gb.groupId)) {
        groupNames.set(gb.groupId, {
          id: gb.groupId,
          name: gb.groupName,
          color: gb.color,
          headers: new Set(),
        });
      }
    }
  }

  const contributionTotals = new Map<string, number>();
  for (const cycle of measurableCycles) {
    for (const gb of cycle.groupBreakdown) {
      contributionTotals.set(
        gb.groupId,
        (contributionTotals.get(gb.groupId) ?? 0) + gb.durationMs
      );
    }
  }

  const totalAllCycles = [...contributionTotals.values()].reduce(
    (s, v) => s + v,
    0
  );

  const contributions: TactTimeGroupContribution[] = [...groupNames.values()]
    .map((meta) => {
      const sumMs = contributionTotals.get(meta.id) ?? 0;
      const avgMs = measurableCycles.length > 0 ? sumMs / measurableCycles.length : 0;
      const percent =
        totalAllCycles > 0 ? (sumMs / totalAllCycles) * 100 : 0;
      return {
        groupId: meta.id,
        groupName: meta.name,
        avgDurationMs: avgMs,
        percent,
        color: meta.color,
      };
    })
    .filter((c) => c.avgDurationMs > 0)
    .sort((a, b) => b.percent - a.percent);

  const deltas: TactTimeGroupDelta[] = [];
  if (bestCycle && worstCycle) {
    const bestMap = new Map(
      bestCycle.groupBreakdown.map((g) => [g.groupId, g.durationMs])
    );
    const worstMap = new Map(
      worstCycle.groupBreakdown.map((g) => [g.groupId, g.durationMs])
    );
    const allGroupIds = new Set([...bestMap.keys(), ...worstMap.keys()]);

    for (const gid of allGroupIds) {
      const meta = groupNames.get(gid);
      if (!meta) continue;
      const bestMs = bestMap.get(gid) ?? 0;
      const worstMs = worstMap.get(gid) ?? 0;
      deltas.push({
        groupId: gid,
        groupName: meta.name,
        bestMs,
        worstMs,
        deltaMs: worstMs - bestMs,
        color: meta.color,
      });
    }
    deltas.sort((a, b) => b.deltaMs - a.deltaMs);
  }

  const rootCause = deltas[0] ?? null;
  const rootCauseGroup = rootCause?.groupName ?? null;
  const rootCauseMessage = rootCause
    ? `${rootCause.groupName}가 Tact 증가의 주요 원인 (+${(rootCause.deltaMs / 1000).toFixed(1)} sec, Best Cycle #${bestCycle?.cycleNumber} vs Worst Cycle #${worstCycle?.cycleNumber})`
    : "Best/Worst Cycle 비교 데이터가 부족합니다.";

  const avgWorstDeltas: TactTimeGroupAvgWorstDelta[] = [];
  if (worstCycle && measurableCycles.length > 0) {
    const avgByGroup = new Map<string, number>();
    for (const cycle of measurableCycles) {
      for (const gb of cycle.groupBreakdown) {
        avgByGroup.set(
          gb.groupId,
          (avgByGroup.get(gb.groupId) ?? 0) + gb.durationMs
        );
      }
    }
    for (const [gid, sum] of avgByGroup) {
      avgByGroup.set(gid, sum / measurableCycles.length);
    }

    const worstMap = new Map(
      worstCycle.groupBreakdown.map((g) => [g.groupId, g.durationMs])
    );
    const allGroupIds = new Set([...avgByGroup.keys(), ...worstMap.keys()]);

    for (const gid of allGroupIds) {
      const meta = groupNames.get(gid);
      if (!meta) continue;
      const avgMs = avgByGroup.get(gid) ?? 0;
      const worstMs = worstMap.get(gid) ?? 0;
      avgWorstDeltas.push({
        groupId: gid,
        groupName: meta.name,
        avgMs,
        worstMs,
        deltaMs: worstMs - avgMs,
        color: meta.color,
      });
    }
    avgWorstDeltas.sort((a, b) => b.deltaMs - a.deltaMs);
  }

  const avgWorstRoot = avgWorstDeltas[0] ?? null;
  const avgWorstRootCauseGroup = avgWorstRoot?.groupName ?? null;
  const avgWorstRootCauseMessage = avgWorstRoot
    ? `${avgWorstRoot.groupName}가 평균 대비 Worst에서 가장 큰 증가 (+${(avgWorstRoot.deltaMs / 1000).toFixed(1)} sec, Avg vs Worst Cycle #${worstCycle?.cycleNumber})`
    : "Average/Worst Cycle 비교 데이터가 부족합니다.";

  return {
    cycles,
    summary,
    contributions,
    deltas,
    avgWorstDeltas,
    rootCauseGroup,
    rootCauseMessage,
    avgWorstRootCauseGroup,
    avgWorstRootCauseMessage,
    excludedCycles,
  };
}

/** Trend에서 선택한 Cycle vs Best — 그룹별 차이 */
export function computeBestVsSelectedDeltas(
  bestCycle: TactTimeCycle,
  selectedCycle: TactTimeCycle
): TactTimeGroupDelta[] {
  const bestMap = new Map(
    bestCycle.groupBreakdown.map((g) => [g.groupId, g])
  );
  const selectedMap = new Map(
    selectedCycle.groupBreakdown.map((g) => [g.groupId, g])
  );
  const allGroupIds = new Set([...bestMap.keys(), ...selectedMap.keys()]);
  const deltas: TactTimeGroupDelta[] = [];

  for (const gid of allGroupIds) {
    const best = bestMap.get(gid);
    const selected = selectedMap.get(gid);
    const meta = selected ?? best;
    if (!meta) continue;
    const bestMs = best?.durationMs ?? 0;
    const worstMs = selected?.durationMs ?? 0;
    deltas.push({
      groupId: gid,
      groupName: meta.groupName,
      bestMs,
      worstMs,
      deltaMs: worstMs - bestMs,
      color: meta.color,
    });
  }

  return deltas.sort((a, b) => b.deltaMs - a.deltaMs);
}

/** Trend에서 선택한 Cycle vs 평균 — 그룹별 차이 */
export function computeAvgVsSelectedDeltas(
  measurableCycles: TactTimeCycle[],
  selectedCycle: TactTimeCycle
): TactTimeGroupAvgWorstDelta[] {
  if (measurableCycles.length === 0) return [];

  const avgByGroup = new Map<string, number>();
  const groupMeta = new Map<string, { name: string; color: string }>();

  for (const cycle of measurableCycles) {
    for (const gb of cycle.groupBreakdown) {
      groupMeta.set(gb.groupId, { name: gb.groupName, color: gb.color });
      avgByGroup.set(
        gb.groupId,
        (avgByGroup.get(gb.groupId) ?? 0) + gb.durationMs
      );
    }
  }
  for (const [gid, sum] of avgByGroup) {
    avgByGroup.set(gid, sum / measurableCycles.length);
  }

  const selectedMap = new Map(
    selectedCycle.groupBreakdown.map((g) => [g.groupId, g])
  );
  const allGroupIds = new Set([...avgByGroup.keys(), ...selectedMap.keys()]);
  const deltas: TactTimeGroupAvgWorstDelta[] = [];

  for (const gid of allGroupIds) {
    const selected = selectedMap.get(gid);
    const meta = groupMeta.get(gid);
    const avgMs = avgByGroup.get(gid) ?? 0;
    const worstMs = selected?.durationMs ?? 0;
    deltas.push({
      groupId: gid,
      groupName: selected?.groupName ?? meta?.name ?? gid,
      avgMs,
      worstMs,
      deltaMs: worstMs - avgMs,
      color: selected?.color ?? meta?.color ?? UNGROUPED_COLOR,
    });
  }

  return deltas.sort((a, b) => b.deltaMs - a.deltaMs);
}

/** 한 Cycle(1회 Test Run)의 전체 소요 시간 — CSV Total time Label 값 우선 */
export const CYCLE_TOTAL_TIME_LABEL = "Cycle Total Time";
export const CYCLE_TOTAL_TIME_ROW_LABEL = "Total time";
export const CYCLE_TOTAL_TIME_DESC = `CSV Label "${CYCLE_TOTAL_TIME_ROW_LABEL}"의 DurationMs만 사용 (Label 합산 없음)`;

export function formatTactSeconds(ms: number, digits = 1): string {
  return `${(ms / 1000).toFixed(digits)} sec`;
}

export function formatTactMs(ms: number): string {
  return `${ms.toLocaleString()} ms`;
}
