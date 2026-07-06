"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CYCLE_TOTAL_TIME_LABEL,
  formatTactSeconds,
  TACT_TIME_ETC_GROUP_ID,
} from "@/lib/tact-time-cycles";
import type { TactTimeCycle } from "@/lib/tact-time-types";

interface TactTimeSingleCycleChartProps {
  cycles: TactTimeCycle[];
  selectedCycle: TactTimeCycle | null;
  avgCycleTotalMs: number;
  onSelectCycle: (cycleId: string) => void;
}

function formatSecTooltip(sec: number) {
  return `${sec.toFixed(2)} sec (${Math.round(sec * 1000).toLocaleString()} ms)`;
}

export function TactTimeSingleCycleChart({
  cycles,
  selectedCycle,
  avgCycleTotalMs,
  onSelectCycle,
}: TactTimeSingleCycleChartProps) {
  if (cycles.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Cycle 데이터가 없습니다.
        </CardContent>
      </Card>
    );
  }

  const cycle = selectedCycle ?? cycles[0];
  const cycleIndex = cycles.findIndex((c) => c.id === cycle.id);
  const prevCycle = cycleIndex > 0 ? cycles[cycleIndex - 1] : null;
  const nextCycle =
    cycleIndex >= 0 && cycleIndex < cycles.length - 1
      ? cycles[cycleIndex + 1]
      : null;

  const stackRow: Record<string, number | string> = {
    label: `#${cycle.cycleNumber}`,
  };
  for (const g of cycle.groupBreakdown) {
    stackRow[g.groupId] = g.durationMs / 1000;
  }
  const stackData = [stackRow];

  const seenGroupIds = new Set<string>();
  const groupOrderData: {
    order: number;
    name: string;
    sec: number;
    color: string;
    itemCount: number;
  }[] = [];

  for (const entry of cycle.entries) {
    if (seenGroupIds.has(entry.groupId)) continue;
    seenGroupIds.add(entry.groupId);
    const group = cycle.groupBreakdown.find((g) => g.groupId === entry.groupId);
    if (!group) continue;
    groupOrderData.push({
      order: groupOrderData.length + 1,
      name: group.groupName,
      sec: group.durationMs / 1000,
      color: group.color,
      itemCount: group.items.length,
    });
  }

  const avgSec = avgCycleTotalMs > 0 ? avgCycleTotalMs / 1000 : 0;
  const cycleSec = cycle.totalDurationMs / 1000;
  const stepsSumMs = cycle.entries.reduce((s, e) => s + e.durationMs, 0);
  const unaccountedMs = Math.max(0, cycle.totalDurationMs - stepsSumMs);
  const ungroupedEntries = cycle.entries.filter(
    (e) => e.groupId === TACT_TIME_ETC_GROUP_ID
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Single Cycle Tact Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              선택한 1개 Cycle의 그룹별 소요 시간 (실행 순서)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 px-0"
              disabled={!prevCycle}
              onClick={() => prevCycle && onSelectCycle(prevCycle.id)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold font-mono min-w-[72px] text-center">
              Cycle #{cycle.cycleNumber}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 px-0"
              disabled={!nextCycle}
              onClick={() => nextCycle && onSelectCycle(nextCycle.id)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <div className="rounded-md border border-blue-200 bg-blue-50/60 px-3 py-1.5">
            <span className="text-[10px] font-medium text-blue-800/80 uppercase tracking-wide">
              {CYCLE_TOTAL_TIME_LABEL}
            </span>
            <span className="ml-2 font-mono text-sm font-bold text-blue-950">
              {formatTactSeconds(cycle.totalDurationMs)}
            </span>
          </div>
          {cycle.isOutlier && cycle.totalDurationMs > 0 && (
            <Badge variant="danger" className="text-[10px]">
              Outlier
            </Badge>
          )}
          {avgCycleTotalMs > 0 && cycle.totalDurationMs > 0 && (
            <span className="text-xs text-muted-foreground font-mono">
              vs 평균 {formatTactSeconds(avgCycleTotalMs)}
              {cycleSec > avgSec ? (
                <span className="text-red-600 ml-1">
                  (+{formatTactSeconds(cycle.totalDurationMs - avgCycleTotalMs)})
                </span>
              ) : cycleSec < avgSec ? (
                <span className="text-emerald-600 ml-1">
                  (−{formatTactSeconds(avgCycleTotalMs - cycle.totalDurationMs)})
                </span>
              ) : null}
            </span>
          )}
          {cycle.totalDurationMs === 0 && (
            <span className="text-xs text-amber-700">
              Total time DurationMs가 0 — 비교에서 제외됨
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {(ungroupedEntries.length > 0 || unaccountedMs > 500) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 space-y-2">
            {ungroupedEntries.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-amber-950">
                  미할당 Labels (ETC) · {ungroupedEntries.length}개
                </h3>
                <p className="text-xs text-amber-900/80 mt-0.5">
                  Setting에서 그룹에 넣지 않은 Header — Tact Time Setting에서
                  확인·할당하세요.
                </p>
                <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 text-xs font-mono">
                  {ungroupedEntries.map((item) => (
                    <li
                      key={item.header}
                      className="flex justify-between gap-2 text-slate-800"
                    >
                      <span className="truncate">{item.header}</span>
                      <span className="shrink-0 tabular-nums">
                        {formatTactSeconds(item.durationMs)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {unaccountedMs > 500 && (
              <p className="text-xs text-amber-900/90 font-mono">
                Label 합계 {formatTactSeconds(stepsSumMs)} · {CYCLE_TOTAL_TIME_LABEL}{" "}
                {formatTactSeconds(cycle.totalDurationMs)} · 미포함 구간{" "}
                {formatTactSeconds(unaccountedMs)}
              </p>
            )}
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold mb-2">그룹별 구성 (Stacked)</h3>
          <div className="h-[56px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stackData}
                margin={{ top: 4, right: 16, left: 48, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Duration (sec)",
                    position: "insideBottom",
                    offset: -2,
                    fontSize: 10,
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  width={44}
                />
                <Tooltip
                  formatter={(v: number, name) => {
                    const g = cycle.groupBreakdown.find((gb) => gb.groupId === name);
                    const pct =
                      cycle.totalDurationMs > 0
                        ? ((v * 1000) / cycle.totalDurationMs) * 100
                        : 0;
                    return [
                      `${formatSecTooltip(v)} · ${pct.toFixed(1)}%`,
                      g?.groupName ?? name,
                    ];
                  }}
                />
                {cycle.groupBreakdown.map((g) => (
                  <Bar
                    key={g.groupId}
                    dataKey={g.groupId}
                    stackId="cycle"
                    fill={g.color}
                    name={g.groupId}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 max-h-28 overflow-y-auto rounded-md border bg-slate-50/80 px-3 py-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {cycle.groupBreakdown.map((g) => (
                <span
                  key={g.groupId}
                  className="inline-flex items-center gap-1.5 text-[10px] text-slate-700"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                  <span className="break-all">{g.groupName}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">그룹별 소요 시간 (실행 순서)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={groupOrderData}
                margin={{ top: 12, right: 16, left: 8, bottom: 56 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={groupOrderData.length > 6 ? -35 : 0}
                  textAnchor={groupOrderData.length > 6 ? "end" : "middle"}
                  height={groupOrderData.length > 6 ? 72 : 36}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Duration (sec)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 8,
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  formatter={(v: number, _n, item) => {
                    const p = item?.payload as { itemCount?: number };
                    const labels =
                      p?.itemCount && p.itemCount > 1
                        ? ` · ${p.itemCount} labels`
                        : "";
                    return [formatSecTooltip(v) + labels, "Group"];
                  }}
                  labelFormatter={(label) => `Group: ${label}`}
                />
                <Bar dataKey="sec" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {groupOrderData.map((entry) => (
                    <Cell key={`${entry.order}-${entry.name}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
