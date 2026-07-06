"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { stat2ResultToPassFail } from "@/lib/gaia-stat2-grr-summary";
import type { GaiaAnalysisResult, GaiaStat2GrrSummary } from "@/lib/types";

interface SummaryPanelProps {
  analysis: GaiaAnalysisResult | null;
  stat2Summary?: GaiaStat2GrrSummary | null;
}

function statusVariant(status: string) {
  if (status === "PASS") return "success" as const;
  if (status === "FAIL") return "danger" as const;
  return "warning" as const;
}

export function SummaryPanel({ analysis, stat2Summary }: SummaryPanelProps) {
  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">요약</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          CSV를 로드하고 Metric을 선택하면 PASS/FAIL 요약이 표시됩니다.
        </CardContent>
      </Card>
    );
  }

  const { serials, metric } = analysis;

  const stat2BySerial = new Map(
    stat2Summary?.testResultTable.map((r) => [r.serial, r]) ?? []
  );

  const kpi = stat2Summary
    ? {
        total: stat2Summary.testResultTable.length,
        pass: stat2Summary.testResultTable.filter((r) => r.result === "pass")
          .length,
        fail: stat2Summary.testResultTable.filter((r) => r.result === "fail")
          .length,
        check: stat2Summary.testResultTable.filter(
          (r) => r.result !== "pass" && r.result !== "fail"
        ).length,
      }
    : analysis.summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">요약 KPI</CardTitle>
        <p className="text-xs text-muted-foreground truncate" title={metric}>
          {metric}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {stat2Summary && (
          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span className="text-muted-foreground">GRR Group Result</span>
            <Badge
              variant={
                stat2Summary.grrResult === "pass"
                  ? "success"
                  : stat2Summary.grrResult === "fail"
                    ? "danger"
                    : "warning"
              }
            >
              {stat2Summary.grrResult.toUpperCase()}
            </Badge>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-md bg-muted p-2">
            <div className="text-lg font-bold">{kpi.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="rounded-md bg-emerald-50 p-2">
            <div className="text-lg font-bold text-emerald-700">{kpi.pass}</div>
            <div className="text-xs text-muted-foreground">PASS</div>
          </div>
          <div className="rounded-md bg-red-50 p-2">
            <div className="text-lg font-bold text-red-700">{kpi.fail}</div>
            <div className="text-xs text-muted-foreground">FAIL</div>
          </div>
          <div className="rounded-md bg-amber-50 p-2">
            <div className="text-lg font-bold text-amber-700">{kpi.check}</div>
            <div className="text-xs text-muted-foreground">CHECK</div>
          </div>
        </div>

        <div className="max-h-64 overflow-auto space-y-2">
          {serials.map((s) => {
            const stat2Row = stat2BySerial.get(s.serial);
            const status = stat2Row
              ? stat2ResultToPassFail(stat2Row.result)
              : s.status;
            return (
              <div
                key={s.serial}
                className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm"
              >
                <span className="truncate font-mono text-xs" title={s.serial}>
                  {s.serial}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    R={s.range.toFixed(4)}
                  </span>
                  <Badge variant={statusVariant(status)}>{status}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
