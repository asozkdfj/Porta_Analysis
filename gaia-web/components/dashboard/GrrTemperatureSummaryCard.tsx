"use client";

import { NTC_TEMP_PRE_SEARCH_TOKEN } from "@/lib/liw-grr-config";
import type { GrrNtcRunAnalysis } from "@/lib/liw-grr-ntc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
interface GrrTemperatureSummaryCardProps {
  analysis: GrrNtcRunAnalysis;
}

function fmt(n: number | null, digits = 2): string {
  if (n === null) return "—";
  return `${n.toFixed(digits)}°C`;
}

export function GrrTemperatureSummaryCard({
  analysis,
}: GrrTemperatureSummaryCardProps) {
  const { summary, run, verdict } = analysis;
  const rangePass =
    summary.tempRange !== null && summary.tempRange <= summary.rangeLimit;
  const rangeFail =
    summary.tempRange !== null && summary.tempRange > summary.rangeLimit;

  return (    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Temperature Summary · LIW{analysis.branch}</CardTitle>
        <p className="text-xs text-muted-foreground font-mono">
          *{NTC_TEMP_PRE_SEARCH_TOKEN}* · {summary.pointCount}/{summary.expectedCount} points ·{" "}
          {run.attemptLabel}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-lg border px-4 py-3">
            <div className="text-xs text-muted-foreground">Average Temperature</div>
            <div className="text-2xl font-bold mt-0.5">{fmt(summary.avgTemp)}</div>
          </div>
          <div className="rounded-lg border px-4 py-3">
            <div className="text-xs text-muted-foreground">Minimum Temperature</div>
            <div className="text-2xl font-bold mt-0.5">{fmt(summary.minTemp)}</div>
          </div>
          <div className="rounded-lg border px-4 py-3">
            <div className="text-xs text-muted-foreground">Maximum Temperature</div>
            <div className="text-2xl font-bold mt-0.5">{fmt(summary.maxTemp)}</div>
          </div>
          <div
            className={cn(
              "rounded-lg border px-4 py-3",
              rangePass && "border-emerald-200 bg-emerald-50/40",
              rangeFail && "border-red-200 bg-red-50/40"
            )}
          >
            <div className="text-xs text-muted-foreground">Temperature Range</div>
            <div
              className={cn(
                "text-2xl font-bold mt-0.5",
                rangePass && "text-emerald-700",
                rangeFail && "text-red-700"
              )}
            >
              {fmt(summary.tempRange)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              limit ≤{summary.rangeLimit}°C
              {rangePass && <span className="text-emerald-700"> · PASS</span>}
              {rangeFail && <span className="text-red-700"> · FAIL</span>}
              {verdict === "data_missing" && summary.tempRange === null && (
                <span className="text-amber-700"> · N/A</span>
              )}
            </div>
          </div>        </div>
      </CardContent>
    </Card>
  );
}
