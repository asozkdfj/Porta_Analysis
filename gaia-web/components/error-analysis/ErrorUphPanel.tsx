"use client";

import { cn } from "@/lib/utils";
import {
  UPH_COUNT_MODE_LABELS,
  UPH_INTERVAL_LABELS,
  type UphCountMode,
  type UphIntervalMinutes,
} from "@/lib/error-analysis-config";
import type { TestTimeAnalysis, UphAnalysis, UphTrendAnalysis } from "@/lib/error-analysis-types";
import { formatElapsed, formatUphValue } from "@/lib/error-analysis-uph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface ErrorUphSummaryCardProps {
  uph: UphAnalysis;
  testTimeAnalysis: TestTimeAnalysis;
  countMode: UphCountMode;
  intervalMinutes: UphIntervalMinutes;
  onCountModeChange: (mode: UphCountMode) => void;
  onIntervalChange: (min: UphIntervalMinutes) => void;
  readOnly?: boolean;
}

function formatSec(sec: number): string {
  return `${sec.toFixed(1)}s`;
}

function formatUphIntervalLabel(minutes: number): string {
  if (minutes in UPH_INTERVAL_LABELS) {
    return UPH_INTERVAL_LABELS[minutes as UphIntervalMinutes];
  }
  return `${minutes} min`;
}

export function ErrorUphSummaryCard({
  uph,
  testTimeAnalysis,
  countMode,
  intervalMinutes,
  onCountModeChange,
  onIntervalChange,
  readOnly = false,
}: ErrorUphSummaryCardProps) {
  const stats = [
    { label: "UPH", value: formatUphValue(uph.uph), highlight: true },
    {
      label: "Completed Modules",
      value: uph.completedModuleCount.toLocaleString(),
    },
    { label: "Elapsed Time", value: formatElapsed(uph.elapsedTimeSec) },
    { label: "First Start Time", value: uph.firstStartTime ?? "—", mono: true },
    { label: "Last End Time", value: uph.lastEndTime ?? "—", mono: true },
    {
      label: "Average Test Time",
      value:
        uph.averageTestTimeSec != null
          ? formatSec(uph.averageTestTimeSec)
          : "—",
    },
    {
      label: "Abnormal Test Count",
      value: `${uph.abnormalTestCount}`,
      warn: uph.abnormalTestCount > 0,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">UPH Summary</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              StartTime / EndTime 컬럼 · Station 2 시작 ~ Station 8 완료
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {readOnly ? (
              <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                <span className="rounded-md border bg-slate-50 px-2 py-1">
                  Count: {UPH_COUNT_MODE_LABELS[countMode]}
                </span>
                <span className="rounded-md border bg-slate-50 px-2 py-1">
                  Interval: {UPH_INTERVAL_LABELS[intervalMinutes]}
                </span>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Count Mode
                  </Label>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    value={countMode}
                    onChange={(e) =>
                      onCountModeChange(e.target.value as UphCountMode)
                    }
                  >
                    {(Object.keys(UPH_COUNT_MODE_LABELS) as UphCountMode[]).map(
                      (m) => (
                        <option key={m} value={m}>
                          {UPH_COUNT_MODE_LABELS[m]}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    UPH Trend Interval
                  </Label>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    value={intervalMinutes}
                    onChange={(e) =>
                      onIntervalChange(
                        Number(e.target.value) as UphIntervalMinutes
                      )
                    }
                  >
                    {([10, 30, 60] as UphIntervalMinutes[]).map((m) => (
                      <option key={m} value={m}>
                        {UPH_INTERVAL_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!uph.isValid && uph.statusMessage && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {uph.statusMessage}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-md border bg-slate-50/80 px-3 py-2"
            >
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </div>
              <div
                className={cn(
                  "text-sm font-semibold mt-0.5",
                  stat.mono && "font-mono",
                  stat.highlight && "text-blue-700",
                  stat.warn && "text-red-700",
                  !stat.highlight && !stat.warn && "text-slate-800"
                )}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t">
          {[
            {
              label: "Average Test Time",
              value: formatSec(testTimeAnalysis.meanSec),
            },
            {
              label: "Min Test Time",
              value: formatSec(testTimeAnalysis.minSec),
            },
            {
              label: "Max Test Time",
              value: formatSec(testTimeAnalysis.maxSec),
            },
            {
              label: "Threshold",
              value: formatSec(testTimeAnalysis.abnormalThresholdSec),
            },
            {
              label: "Abnormal Count",
              value: `${testTimeAnalysis.abnormalCount}`,
              warn: testTimeAnalysis.abnormalCount > 0,
            },
            {
              label: "Abnormal Rate",
              value: `${testTimeAnalysis.abnormalRate.toFixed(1)}%`,
              warn: testTimeAnalysis.abnormalRate > 0,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-md border bg-white px-3 py-2"
            >
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </div>
              <div
                className={cn(
                  "text-sm font-semibold font-mono mt-0.5",
                  stat.warn ? "text-red-700" : "text-slate-800"
                )}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ErrorUphTrendChartProps {
  trend: UphTrendAnalysis;
}

export function ErrorUphTrendChart({ trend }: ErrorUphTrendChartProps) {
  if (trend.points.length === 0) {
    return null;
  }

  const maxUph = Math.max(
    ...trend.points.map((p) => p.uph ?? 0),
    1
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">UPH Trend</CardTitle>
        <p className="text-xs text-muted-foreground">
          {formatUphIntervalLabel(trend.intervalMinutes)} 샘플 · 1시간 롤링 누적 UPH
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {trend.points.map((p) => (
            <div key={p.label} className="flex items-center gap-3 text-xs">
              <div className="w-28 shrink-0 font-mono text-muted-foreground">
                {p.label}
              </div>
              <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                {p.uph != null && p.uph > 0 && (
                  <div
                    className="h-full bg-blue-500/80 rounded transition-all"
                    style={{
                      width: `${Math.min(100, (p.uph / maxUph) * 100)}%`,
                    }}
                  />
                )}
              </div>
              <div className="w-24 shrink-0 text-right font-mono font-semibold">
                {p.uph != null ? `${Math.round(p.uph)} UPH` : "—"}
              </div>
              <div className="w-12 shrink-0 text-right text-muted-foreground">
                {p.completedCount} ea
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
