"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EyeOff, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CYCLE_TOTAL_TIME_DESC,
  CYCLE_TOTAL_TIME_LABEL,
  CYCLE_TOTAL_TIME_ROW_LABEL,
  formatTactSeconds,
} from "@/lib/tact-time-cycles";
import type {
  TactTimeCompareMode,
  TactTimeCycle,
  TactTimeCycleSummary,
} from "@/lib/tact-time-types";

interface CycleTotalPoint {
  cycle: string;
  cycleId: string;
  totalTimeSec: number;
  totalTimeMs: number;
  isOutlier: boolean;
  isSelected: boolean;
  fromTotalTimeLabel: boolean;
}

interface TactTimeCycleTrendChartProps {
  cycles: TactTimeCycle[];
  summary: TactTimeCycleSummary;
  selectedCycleId: string | null;
  compareMode: TactTimeCompareMode;
  onCompareModeChange: (mode: TactTimeCompareMode) => void;
  onSelectCycle: (cycleId: string) => void;
  onExcludeCycle: (cycleId: string) => void;
}

function CycleTotalTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CycleTotalPoint }[];
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-slate-900">{point.cycle}</div>
      <div className="mt-1 font-mono text-slate-700">
        {CYCLE_TOTAL_TIME_LABEL}: {formatTactSeconds(point.totalTimeMs)}
      </div>
      <div className="mt-0.5 text-muted-foreground">
        CSV &quot;{CYCLE_TOTAL_TIME_ROW_LABEL}&quot; Label 값
      </div>
      {point.isOutlier && (
        <div className="mt-1 text-red-600 font-medium">Outlier</div>
      )}
    </div>
  );
}

export function TactTimeCycleTrendChart({
  cycles,
  summary,
  selectedCycleId,
  compareMode,
  onCompareModeChange,
  onSelectCycle,
  onExcludeCycle,
}: TactTimeCycleTrendChartProps) {
  const trendCycles = cycles.filter(
    (c) => c.fromTotalTimeLabel && c.totalDurationMs > 0
  );

  const data: CycleTotalPoint[] = trendCycles.map((c) => ({
    cycle: `#${c.cycleNumber}`,
    cycleId: c.id,
    totalTimeSec: c.totalDurationMs / 1000,
    totalTimeMs: c.totalDurationMs,
    isOutlier: c.isOutlier,
    isSelected: c.id === selectedCycleId,
    fromTotalTimeLabel: true,
  }));

  const avgSec = summary.avgDurationMs / 1000;
  const bestCycleId = summary.bestCycle?.id ?? null;
  const selectedCycle =
    trendCycles.find((c) => c.id === selectedCycleId) ?? null;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{CYCLE_TOTAL_TIME_LABEL} Trend</CardTitle>
          <p className="text-xs text-muted-foreground">{CYCLE_TOTAL_TIME_DESC}</p>
        </CardHeader>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          CSV에 &quot;{CYCLE_TOTAL_TIME_ROW_LABEL}&quot; Label 행이 없거나 DurationMs가
          비어 있습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{CYCLE_TOTAL_TIME_LABEL} Trend</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {CYCLE_TOTAL_TIME_DESC} · {data.length}개 Cycle · 막대 클릭 시
              Breakdown · 선택 후 제외 가능
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedCycleId}
              onClick={() => selectedCycleId && onExcludeCycle(selectedCycleId)}
            >
              <EyeOff className="h-4 w-4" />
              선택 Cycle 제외
            </Button>
            <Button
              type="button"
              variant={compareMode === "best-worst" ? "default" : "outline"}
              size="sm"
              onClick={() => onCompareModeChange("best-worst")}
            >
              Best vs Worst
            </Button>
            <Button
              type="button"
              variant={compareMode === "avg-worst" ? "default" : "outline"}
              size="sm"
              onClick={() => onCompareModeChange("avg-worst")}
            >
              Average vs Worst
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
              onClick={(state) => {
                const payload = state?.activePayload?.[0]?.payload as
                  | CycleTotalPoint
                  | undefined;
                if (payload?.cycleId) onSelectCycle(payload.cycleId);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="cycle" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                label={{
                  value: `${CYCLE_TOTAL_TIME_LABEL} (sec)`,
                  angle: -90,
                  position: "insideLeft",
                  offset: 8,
                  fontSize: 10,
                }}
              />
              <Tooltip
                content={<CycleTotalTooltip />}
                cursor={{ fill: "rgba(37, 99, 235, 0.08)" }}
              />
              <ReferenceLine
                y={avgSec}
                stroke="#64748b"
                strokeDasharray="4 4"
                label={{
                  value: `Avg ${avgSec.toFixed(1)}s`,
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#64748b",
                }}
              />
              <Bar
                dataKey="totalTimeSec"
                name={CYCLE_TOTAL_TIME_LABEL}
                radius={[4, 4, 0, 0]}
                maxBarSize={56}
              >
                {data.map((entry) => {
                  const isBest =
                    compareMode === "best-worst" &&
                    entry.cycleId === bestCycleId;
                  let fill = "#3b82f6";
                  if (entry.isSelected) fill = "#1d4ed8";
                  else if (isBest) fill = "#059669";
                  else if (entry.isOutlier) fill = "#dc2626";

                  let stroke: string | undefined;
                  if (entry.isSelected) stroke = "#1e3a8a";
                  else if (isBest) stroke = "#047857";
                  else if (entry.isOutlier) stroke = "#991b1b";

                  return (
                    <Cell
                      key={entry.cycleId}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={entry.isSelected || isBest ? 2 : 0}
                      style={{ cursor: "pointer" }}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {selectedCycle && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-blue-200 bg-blue-50/70 px-3 py-2.5">
            <Clock className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
            <span className="text-sm font-semibold text-blue-950">
              Cycle #{selectedCycle.cycleNumber}
            </span>
            <span className="hidden sm:inline text-blue-300">|</span>
            <span className="text-[11px] font-medium text-blue-700/90 shrink-0">
              로그 시간대
            </span>
            <span className="font-mono text-sm text-blue-950 tabular-nums tracking-tight">
              {selectedCycle.startTime && selectedCycle.endTime ? (
                <>
                  {selectedCycle.startTime}
                  <span className="mx-2 text-blue-400 font-sans">→</span>
                  {selectedCycle.endTime}
                </>
              ) : selectedCycle.startTime || selectedCycle.endTime ? (
                selectedCycle.startTime || selectedCycle.endTime
              ) : (
                <span className="text-blue-700/70 font-sans text-xs">
                  CSV StartLocal / EndLocal 없음
                </span>
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
