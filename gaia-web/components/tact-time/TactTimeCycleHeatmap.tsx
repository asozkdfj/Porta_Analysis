"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CYCLE_TOTAL_TIME_LABEL,
  formatTactSeconds,
} from "@/lib/tact-time-cycles";
import type { TactTimeCycle } from "@/lib/tact-time-types";

interface TactTimeCycleHeatmapProps {
  cycles: TactTimeCycle[];
  groupOrder: { id: string; name: string; color: string }[];
  selectedCycleId: string | null;
  onSelectCycle: (cycleId: string) => void;
}

function heatColor(ratio: number): string {
  if (ratio <= 0) return "rgb(241 245 249)";
  const t = Math.min(1, ratio);
  const r = Math.round(255 - t * 120);
  const g = Math.round(245 - t * 180);
  const b = Math.round(249 - t * 200);
  return `rgb(${r} ${g} ${b})`;
}

export function TactTimeCycleHeatmap({
  cycles,
  groupOrder,
  selectedCycleId,
  onSelectCycle,
}: TactTimeCycleHeatmapProps) {
  if (cycles.length === 0 || groupOrder.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Heatmap 데이터가 없습니다.
        </CardContent>
      </Card>
    );
  }

  const maxCell = Math.max(
    ...cycles.flatMap((c) =>
      c.groupBreakdown.map((g) => g.durationMs)
    ),
    1
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Cycle × Group Heatmap</CardTitle>
        <p className="text-xs text-muted-foreground">
          셀: 그룹별 소요 시간 · 마지막 열: {CYCLE_TOTAL_TIME_LABEL}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 pr-3 font-medium sticky left-0 bg-white">
                Cycle
              </th>
              {groupOrder.map((g) => (
                <th
                  key={g.id}
                  className="text-center py-2 px-2 font-medium min-w-[72px]"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full mr-1"
                    style={{ backgroundColor: g.color }}
                  />
                  {g.name}
                </th>
              ))}
              <th className="text-center py-2 px-2 font-medium min-w-[88px] border-l bg-slate-50">
                {CYCLE_TOTAL_TIME_LABEL}
              </th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((cycle) => {
              const breakdownMap = new Map(
                cycle.groupBreakdown.map((g) => [g.groupId, g.durationMs])
              );
              return (
                <tr
                  key={cycle.id}
                  className={cn(
                    "cursor-pointer border-t",
                    selectedCycleId === cycle.id && "bg-blue-50/60",
                    cycle.isOutlier && "ring-1 ring-inset ring-red-200"
                  )}
                  onClick={() => onSelectCycle(cycle.id)}
                >
                  <td className="py-2 pr-3 font-mono font-semibold sticky left-0 bg-inherit">
                    #{cycle.cycleNumber}
                    {cycle.isOutlier && (
                      <span className="ml-1 text-[10px] text-red-600">
                        OUT
                      </span>
                    )}
                  </td>
                  {groupOrder.map((g) => {
                    const ms = breakdownMap.get(g.id) ?? 0;
                    const ratio = ms / maxCell;
                    return (
                      <td
                        key={g.id}
                        className="text-center py-2 px-1 font-mono tabular-nums"
                        style={{ backgroundColor: heatColor(ratio) }}
                        title={`${g.name}: ${formatTactSeconds(ms)}`}
                      >
                        {ms > 0 ? (ms / 1000).toFixed(1) : "—"}
                      </td>
                    );
                  })}
                  <td
                    className="text-center py-2 px-2 font-mono font-semibold tabular-nums border-l bg-slate-50/80"
                    title={CYCLE_TOTAL_TIME_LABEL}
                  >
                    {(cycle.totalDurationMs / 1000).toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
