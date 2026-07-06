"use client";

import type { GrrWlCenterRunAnalysis } from "@/lib/liw-grr-wl-center";
import { wlCenterBranchToken } from "@/lib/liw-grr-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GrrWlCenterSummaryCardProps {
  analysis: GrrWlCenterRunAnalysis;
}

function fmt(n: number | null, digits = 4): string {
  if (n === null) return "—";
  return n.toFixed(digits);
}

export function GrrWlCenterSummaryCard({ analysis }: GrrWlCenterSummaryCardProps) {
  const { summary, run } = analysis;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">WL_CENTER Summary · LIW{analysis.branch}</CardTitle>
        <p className="text-xs text-muted-foreground font-mono">
          *{wlCenterBranchToken(analysis.branch)}* · 판정 Index {summary.skippedPointCount}~
          {summary.expectedCount - 1} · {summary.analysisPointCount}/
          {summary.analysisExpectedCount} points · Spec {summary.specLower ?? "—"}~
          {summary.specUpper ?? "—"} · {run.attemptLabel}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="rounded-lg border px-3 py-3">
            <div className="text-xs text-muted-foreground">Analysis Points</div>
            <div className="text-xl font-bold mt-0.5">
              {summary.analysisPointCount}/{summary.analysisExpectedCount}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Skip Index 0~{summary.skippedPointCount - 1}
            </div>
          </div>
          <div className="rounded-lg border px-3 py-3">
            <div className="text-xs text-muted-foreground">Average</div>
            <div className="text-xl font-bold mt-0.5">{fmt(summary.avg)}</div>
          </div>
          <div className="rounded-lg border px-3 py-3">
            <div className="text-xs text-muted-foreground">Minimum</div>
            <div className="text-xl font-bold mt-0.5">{fmt(summary.min)}</div>
          </div>
          <div className="rounded-lg border px-3 py-3">
            <div className="text-xs text-muted-foreground">Maximum</div>
            <div className="text-xl font-bold mt-0.5">{fmt(summary.max)}</div>
          </div>
          <div className="rounded-lg border px-3 py-3">
            <div className="text-xs text-muted-foreground">Range</div>
            <div className="text-xl font-bold mt-0.5">{fmt(summary.range)}</div>
          </div>
          <div className="rounded-lg border px-3 py-3">
            <div className="text-xs text-muted-foreground">Std Dev</div>
            <div className="text-xl font-bold mt-0.5">{fmt(summary.stdDev)}</div>
          </div>
          <div className="rounded-lg border px-3 py-3">
            <div className="text-xs text-muted-foreground">Max Deviation</div>
            <div className="text-xl font-bold mt-0.5">{fmt(summary.maxDeviation)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
