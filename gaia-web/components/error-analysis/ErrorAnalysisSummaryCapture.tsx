"use client";

import { forwardRef } from "react";
import { ErrorDistributionChart } from "@/components/error-analysis/ErrorDistributionChart";
import { ErrorRankingChart } from "@/components/error-analysis/ErrorRankingChart";
import { ErrorTimeTrendPanel } from "@/components/error-analysis/ErrorTimeTrendPanel";
import {
  UPH_COUNT_MODE_LABELS,
  UPH_INTERVAL_LABELS,
  type UphCountMode,
  type UphIntervalMinutes,
} from "@/lib/error-analysis-config";
import {
  PPT_SLIDE_HEIGHT,
  PPT_SLIDE_WIDTH,
} from "@/lib/error-analysis-summary-export";
import type { ErrorAnalysisResult } from "@/lib/error-analysis-types";
import { formatElapsed, formatUphValue } from "@/lib/error-analysis-uph";

interface ErrorAnalysisSummaryCaptureProps {
  analysis: ErrorAnalysisResult;
  fileName: string;
  uphCountMode: UphCountMode;
  uphIntervalMinutes: UphIntervalMinutes;
  capturedAt?: Date;
}

function CaptureStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pass" | "fail" | "warn" | "accent";
}) {
  const toneClass =
    tone === "pass"
      ? "text-emerald-700"
      : tone === "fail"
        ? "text-red-700"
        : tone === "warn"
          ? "text-amber-700"
          : tone === "accent"
            ? "text-blue-700"
            : "text-slate-900";

  return (
    <div className="rounded border border-slate-200 bg-white px-2.5 py-1.5 min-w-0">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 truncate">
        {label}
      </div>
      <div
        className={`text-base font-bold font-mono leading-tight mt-0.5 truncate ${toneClass}`}
        title={value}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[9px] text-slate-500 truncate" title={sub}>
          {sub}
        </div>
      )}
    </div>
  );
}

function formatSec(sec: number | null): string {
  if (sec == null || sec <= 0) return "—";
  return `${sec.toFixed(1)}s`;
}

export const ErrorAnalysisSummaryCapture = forwardRef<
  HTMLDivElement,
  ErrorAnalysisSummaryCaptureProps
>(function ErrorAnalysisSummaryCapture(
  {
    analysis,
    fileName,
    uphCountMode,
    uphIntervalMinutes,
    capturedAt = new Date(),
  },
  ref
) {
  const { summary, uphAnalysis, testTimeAnalysis } = analysis;
  const stamp = capturedAt.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const topErrorShort =
    summary.topError && summary.topError.length > 36
      ? `${summary.topError.slice(0, 34)}…`
      : (summary.topError ?? "—");

  return (
    <div
      ref={ref}
      className="bg-white text-slate-900 overflow-hidden box-border flex flex-col"
      style={{ width: PPT_SLIDE_WIDTH, height: PPT_SLIDE_HEIGHT, padding: 28 }}
    >
      {/* Header — file name emphasis */}
      <header className="shrink-0 mb-3">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Porta · Error Analysis · PPT Summary
            </p>
            <div className="mt-2 rounded-lg border-l-[6px] border-blue-600 bg-slate-900 px-5 py-3 shadow-sm">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-300">
                Source File
              </div>
              <div
                className="mt-1 text-[28px] font-bold font-mono leading-tight text-white break-all"
                title={fileName}
              >
                {fileName}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right text-[11px] text-slate-500 pt-6">
            <div>{stamp}</div>
            <div className="mt-1 font-mono font-semibold text-slate-700">
              {analysis.records.length.toLocaleString()} test runs
            </div>
            <div className="mt-2 flex flex-col gap-1 items-end">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px]">
                {UPH_COUNT_MODE_LABELS[uphCountMode]}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px]">
                Interval {UPH_INTERVAL_LABELS[uphIntervalMinutes]}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Error Summary — single compact row */}
      <section className="shrink-0 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
          Error Summary
        </h3>
        <div className="grid grid-cols-6 gap-2">
          <CaptureStat
            label="Total Test"
            value={summary.totalCount.toLocaleString()}
          />
          <CaptureStat
            label="PASS"
            value={summary.passCount.toLocaleString()}
            tone="pass"
          />
          <CaptureStat
            label="FAIL"
            value={summary.failCount.toLocaleString()}
            tone="fail"
          />
          <CaptureStat
            label="Yield"
            value={`${summary.yieldPercent.toFixed(2)}%`}
            tone={
              summary.yieldPercent >= 95
                ? "pass"
                : summary.yieldPercent < 90
                  ? "fail"
                  : undefined
            }
          />
          <CaptureStat
            label="Unique Errors"
            value={String(summary.uniqueErrorCount)}
          />
          <CaptureStat
            label="Top Error"
            value={topErrorShort}
            sub={
              summary.topError
                ? `${summary.topErrorCount} ea`
                : undefined
            }
            tone="fail"
          />
        </div>
      </section>

      {/* Middle — UPH+Trend (left) | Ranking (right) */}
      <div className="grid grid-cols-[1.05fr_0.95fr] gap-3 flex-1 min-h-0 mb-3">
        <section className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 flex flex-col min-h-0">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5 shrink-0">
            UPH &amp; Test Time · Trend
          </h3>
          <div className="grid grid-cols-4 gap-1.5 mb-2 shrink-0">
            <CaptureStat
              label="UPH"
              value={formatUphValue(uphAnalysis.uph)}
              tone="accent"
            />
            <CaptureStat
              label="Completed"
              value={uphAnalysis.completedModuleCount.toLocaleString()}
            />
            <CaptureStat
              label="Elapsed"
              value={formatElapsed(uphAnalysis.elapsedTimeSec)}
            />
            <CaptureStat
              label="Abnormal TT"
              value={`${testTimeAnalysis.abnormalCount}`}
              sub={`${testTimeAnalysis.abnormalRate.toFixed(1)}%`}
              tone={testTimeAnalysis.abnormalCount > 0 ? "warn" : undefined}
            />
            <CaptureStat
              label="Avg Test Time"
              value={formatSec(testTimeAnalysis.meanSec)}
            />
            <CaptureStat
              label="Min / Max TT"
              value={`${formatSec(testTimeAnalysis.minSec)} / ${formatSec(testTimeAnalysis.maxSec)}`}
            />
            <CaptureStat
              label="Threshold"
              value={formatSec(testTimeAnalysis.abnormalThresholdSec)}
            />
            <CaptureStat
              label="Avg UPH TT"
              value={
                uphAnalysis.averageTestTimeSec != null
                  ? formatSec(uphAnalysis.averageTestTimeSec)
                  : "—"
              }
            />
          </div>
          <div className="flex-1 min-h-0 rounded border border-slate-200 bg-white p-1">
            <ErrorTimeTrendPanel
              testTimeAnalysis={testTimeAnalysis}
              uphTrend={analysis.uphChartTrend}
              chartHeight={248}
              embedded
            />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-2.5 flex flex-col min-h-0">
          <ErrorRankingChart
            items={analysis.errorRanking}
            maxItems={7}
            chartHeight={360}
            embedded
          />
        </section>
      </div>

      {/* Bottom — Distribution */}
      <section className="shrink-0 rounded-lg border border-slate-200 bg-white p-2.5">
        <ErrorDistributionChart
          slices={analysis.distribution}
          distributionItemsByGroup={analysis.distributionItemsByGroup}
          captureMode
          embedded
          pieHeight={148}
        />
      </section>
    </div>
  );
});
