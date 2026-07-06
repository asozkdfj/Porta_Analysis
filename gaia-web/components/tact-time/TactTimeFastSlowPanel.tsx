"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CYCLE_TOTAL_TIME_LABEL,
  computeAvgVsSelectedDeltas,
  computeBestVsSelectedDeltas,
  formatTactSeconds,
} from "@/lib/tact-time-cycles";
import type {
  TactTimeCompareMode,
  TactTimeCycle,
  TactTimeCycleSummary,
  TactTimeGroupAvgWorstDelta,
  TactTimeGroupDelta,
} from "@/lib/tact-time-types";

interface TactTimeFastSlowPanelProps {
  compareMode: TactTimeCompareMode;
  summary: TactTimeCycleSummary;
  selectedCycle: TactTimeCycle | null;
  measurableCycles: TactTimeCycle[];
}

function DeltaList({
  items,
  rootCauseGroup,
}: {
  items: TactTimeGroupDelta[] | TactTimeGroupAvgWorstDelta[];
  rootCauseGroup: string | null;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">비교할 Cycle이 부족합니다.</p>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {items.map((d) => (
        <div
          key={d.groupId}
          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="font-semibold truncate">{d.groupName}</span>
            {d.groupName === rootCauseGroup && (
              <Badge variant="danger" className="text-[10px] shrink-0">
                주요 원인
              </Badge>
            )}
          </div>
          <span
            className={`font-mono shrink-0 ml-2 ${
              d.deltaMs >= 0 ? "text-red-600" : "text-emerald-600"
            }`}
          >
            {d.deltaMs >= 0 ? "+" : "−"}
            {formatTactSeconds(Math.abs(d.deltaMs))}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TactTimeFastSlowPanel({
  compareMode,
  summary,
  selectedCycle,
  measurableCycles,
}: TactTimeFastSlowPanelProps) {
  const bestCycle = summary.bestCycle;

  const { deltas, rootCauseGroup, rootCauseMessage } = useMemo(() => {
    if (!selectedCycle || !bestCycle) {
      return {
        deltas: [] as TactTimeGroupDelta[],
        rootCauseGroup: null,
        rootCauseMessage: "Best/Selected Cycle 비교 데이터가 부족합니다.",
      };
    }
    const computed = computeBestVsSelectedDeltas(bestCycle, selectedCycle);
    const top = computed[0] ?? null;
    return {
      deltas: computed,
      rootCauseGroup: top?.groupName ?? null,
      rootCauseMessage: top
        ? `${top.groupName}가 Tact 증가의 주요 원인 (+${(top.deltaMs / 1000).toFixed(1)} sec, Best Cycle #${bestCycle.cycleNumber} vs Selected Cycle #${selectedCycle.cycleNumber})`
        : "Best/Selected Cycle 비교 데이터가 부족합니다.",
    };
  }, [bestCycle, selectedCycle]);

  const {
    avgDeltas,
    avgRootCauseGroup,
    avgRootCauseMessage,
  } = useMemo(() => {
    if (!selectedCycle) {
      return {
        avgDeltas: [] as TactTimeGroupAvgWorstDelta[],
        avgRootCauseGroup: null,
        avgRootCauseMessage: "Average/Selected Cycle 비교 데이터가 부족합니다.",
      };
    }
    const computed = computeAvgVsSelectedDeltas(measurableCycles, selectedCycle);
    const top = computed[0] ?? null;
    return {
      avgDeltas: computed,
      avgRootCauseGroup: top?.groupName ?? null,
      avgRootCauseMessage: top
        ? `${top.groupName}가 평균 대비 Selected에서 가장 큰 증가 (+${(top.deltaMs / 1000).toFixed(1)} sec, Avg vs Selected Cycle #${selectedCycle.cycleNumber})`
        : "Average/Selected Cycle 비교 데이터가 부족합니다.",
    };
  }, [measurableCycles, selectedCycle]);

  const selectedDiffFromAvg = selectedCycle
    ? selectedCycle.totalDurationMs - summary.avgDurationMs
    : 0;
  const selectedDiffFromBest = selectedCycle && bestCycle
    ? selectedCycle.totalDurationMs - bestCycle.totalDurationMs
    : 0;

  if (compareMode === "avg-worst") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Average vs Selected Cycle</CardTitle>
            <p className="text-xs text-muted-foreground">
              Trend에서 선택한 Cycle vs {summary.cycleCount} Cycles 평균
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                <div className="text-xs text-blue-700 font-medium">
                  Average Cycle
                </div>
                <div className="text-2xl font-bold font-mono mt-1">Avg</div>
                <div className="text-sm font-mono text-blue-800 mt-1">
                  {formatTactSeconds(summary.avgDurationMs)}
                </div>
                <div className="text-[10px] text-blue-700/80 mt-0.5">
                  {summary.cycleCount} Cycles 평균
                </div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
                <div className="text-xs text-red-700 font-medium">
                  Selected Cycle
                </div>
                <div className="text-2xl font-bold font-mono mt-1">
                  {selectedCycle ? `#${selectedCycle.cycleNumber}` : "—"}
                </div>
                <div className="text-sm font-mono text-red-800 mt-1">
                  {selectedCycle
                    ? formatTactSeconds(selectedCycle.totalDurationMs)
                    : "—"}
                </div>
                <div className="text-[10px] text-red-700/80 mt-0.5">
                  {CYCLE_TOTAL_TIME_LABEL}
                </div>
              </div>
            </div>
            <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {CYCLE_TOTAL_TIME_LABEL} 차이:{" "}
              </span>
              <span className="font-mono font-semibold">
                {selectedDiffFromAvg >= 0 ? "+" : "−"}
                {formatTactSeconds(Math.abs(selectedDiffFromAvg))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Delta Analysis (Avg vs Selected)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Selected − Average 그룹별 차이
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <DeltaList items={avgDeltas} rootCauseGroup={avgRootCauseGroup} />
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {avgRootCauseMessage}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Best vs Selected Cycle</CardTitle>
          <p className="text-xs text-muted-foreground">
            Trend에서 선택한 Cycle vs 최단 Cycle
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="text-xs text-emerald-700 font-medium">
                Best Cycle
              </div>
              <div className="text-2xl font-bold font-mono mt-1">
                {bestCycle ? `#${bestCycle.cycleNumber}` : "—"}
              </div>
              <div className="text-sm font-mono text-emerald-800 mt-1">
                {formatTactSeconds(summary.minDurationMs)}
              </div>
              <div className="text-[10px] text-emerald-700/80 mt-0.5">
                {CYCLE_TOTAL_TIME_LABEL}
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
              <div className="text-xs text-red-700 font-medium">
                Selected Cycle
              </div>
              <div className="text-2xl font-bold font-mono mt-1">
                {selectedCycle ? `#${selectedCycle.cycleNumber}` : "—"}
              </div>
              <div className="text-sm font-mono text-red-800 mt-1">
                {selectedCycle
                  ? formatTactSeconds(selectedCycle.totalDurationMs)
                  : "—"}
              </div>
              <div className="text-[10px] text-red-700/80 mt-0.5">
                {CYCLE_TOTAL_TIME_LABEL}
              </div>
            </div>
          </div>
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              {CYCLE_TOTAL_TIME_LABEL} 차이:{" "}
            </span>
            <span className="font-mono font-semibold">
              {selectedDiffFromBest >= 0 ? "+" : "−"}
              {formatTactSeconds(Math.abs(selectedDiffFromBest))}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Delta Analysis (Best vs Selected)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Selected − Best 그룹별 차이
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <DeltaList items={deltas} rootCauseGroup={rootCauseGroup} />
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {rootCauseMessage}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
