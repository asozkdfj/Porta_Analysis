"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CYCLE_TOTAL_TIME_DESC,
  CYCLE_TOTAL_TIME_LABEL,
  formatTactSeconds,
} from "@/lib/tact-time-cycles";
import type { TactTimeCycleSummary } from "@/lib/tact-time-types";

interface TactTimeCycleSummaryCardProps {
  summary: TactTimeCycleSummary;
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "good" | "bad" | "warn";
}) {
  const border =
    highlight === "good"
      ? "border-emerald-200 bg-emerald-50/40"
      : highlight === "bad"
        ? "border-red-200 bg-red-50/40"
        : highlight === "warn"
          ? "border-amber-200 bg-amber-50/40"
          : "border-slate-200";

  return (
    <div className={`rounded-lg border px-4 py-3 ${border}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold font-mono mt-0.5">{value}</div>
      {sub && (
        <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
      )}
    </div>
  );
}

export function TactTimeCycleSummaryCard({
  summary,
}: TactTimeCycleSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{CYCLE_TOTAL_TIME_LABEL} Summary</CardTitle>
        <p className="text-xs text-muted-foreground">
          {CYCLE_TOTAL_TIME_DESC} · {summary.cycleCount} Cycles · Outlier: 평균+3σ
          또는 상위 5%
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <Stat
            label="Avg Cycle Total"
            value={formatTactSeconds(summary.avgDurationMs)}
            sub="Cycle당 평균"
          />
          <Stat
            label="Min Cycle Total"
            value={formatTactSeconds(summary.minDurationMs)}
            sub={
              summary.bestCycle
                ? `Cycle #${summary.bestCycle.cycleNumber}`
                : undefined
            }
            highlight="good"
          />
          <Stat
            label="Max Cycle Total"
            value={formatTactSeconds(summary.maxDurationMs)}
            sub={
              summary.worstCycle
                ? `Cycle #${summary.worstCycle.cycleNumber}`
                : undefined
            }
            highlight="bad"
          />
          <Stat
            label="Std Dev"
            value={formatTactSeconds(summary.stdDevMs)}
            sub="Cycle Total 기준"
          />
          <Stat
            label="Best − Worst"
            value={formatTactSeconds(summary.differenceMs)}
            sub="Cycle Total 차이"
          />
          <Stat
            label="Outlier Count"
            value={String(summary.outlierCount)}
            highlight={summary.outlierCount > 0 ? "warn" : undefined}
          />
          <Stat
            label="Outlier Threshold"
            value={formatTactSeconds(summary.outlierThresholdMs)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
