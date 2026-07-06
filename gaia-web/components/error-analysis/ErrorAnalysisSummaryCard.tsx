"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ErrorAnalysisSummary } from "@/lib/error-analysis-types";

interface ErrorAnalysisSummaryCardProps {
  summary: ErrorAnalysisSummary;
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
  highlight?: "pass" | "fail" | "neutral";
}) {
  const valueClass =
    highlight === "pass"
      ? "text-emerald-700"
      : highlight === "fail"
        ? "text-red-700"
        : "text-slate-900";

  return (
    <div className="rounded-lg border bg-white px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`text-xl font-bold font-mono mt-1 ${valueClass}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
      )}
    </div>
  );
}

export function ErrorAnalysisSummaryCard({
  summary,
}: ErrorAnalysisSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Error Summary</CardTitle>
        <p className="text-xs text-muted-foreground">
          전체 Test Run 기준 Yield 및 Fail 통계
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat
            label="Total Test"
            value={summary.totalCount.toLocaleString()}
          />
          <Stat
            label="PASS"
            value={summary.passCount.toLocaleString()}
            highlight="pass"
          />
          <Stat
            label="FAIL"
            value={summary.failCount.toLocaleString()}
            highlight="fail"
          />
          <Stat
            label="Yield"
            value={`${summary.yieldPercent.toFixed(2)}%`}
            highlight={
              summary.yieldPercent >= 95
                ? "pass"
                : summary.yieldPercent < 90
                  ? "fail"
                  : "neutral"
            }
          />
          <Stat
            label="Unique Errors"
            value={String(summary.uniqueErrorCount)}
          />
          <Stat
            label="Most Frequent Error"
            value={summary.topError ?? "—"}
            sub={
              summary.topError
                ? `${summary.topErrorCount} occurrences`
                : undefined
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
