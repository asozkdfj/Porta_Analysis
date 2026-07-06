import type { LinearitySummary, LinearityVerdict } from "@/lib/liw-linearity-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LinearitySummaryPanelProps {
  summary: LinearitySummary;
  verdict: LinearityVerdict;
  statusMessage: string;
  hasResidualPattern: boolean;
  emissionReason?: string;
  seriesLabel: string;
  runLabel: string;
}

function verdictVariant(
  verdict: LinearityVerdict
): "success" | "danger" | "warning" {
  if (verdict === "pass") return "success";
  if (verdict === "data_missing") return "warning";
  return "danger";
}

function fmt(n: number | null, digits = 4): string {
  if (n === null) return "—";
  return n.toFixed(digits);
}

export function LinearitySummaryPanel({
  summary,
  verdict,
  statusMessage,
  hasResidualPattern,
  emissionReason,
  seriesLabel,
  runLabel,
}: LinearitySummaryPanelProps) {
  const items = [
    { label: "전체 Point", value: String(summary.totalPointCount) },
    { label: "분석 Point", value: String(summary.analysisPointCount) },
    { label: "분석 시작 Index", value: String(summary.analysisStartIndex) },
    { label: "Max Value", value: fmt(summary.maxValue) },
    { label: "Min Value", value: fmt(summary.minValue) },
    { label: "Dynamic Range", value: fmt(summary.dynamicRange) },
    { label: "Slope", value: fmt(summary.slope, 6) },
    { label: "Intercept", value: fmt(summary.intercept, 6) },
    { label: "R²", value: fmt(summary.r2, 6) },
    { label: "Max Residual", value: fmt(summary.maxResidual) },
    { label: "Avg Residual", value: fmt(summary.meanResidual) },
    { label: "최종 판정", value: statusMessage },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">분석 결과 요약</CardTitle>
          <Badge variant={verdictVariant(verdict)}>{statusMessage}</Badge>
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate" title={runLabel}>
          {seriesLabel} · {runLabel}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {items.map((item) => (
            <div key={item.label} className="rounded border px-3 py-2 bg-slate-50/80">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="font-mono font-semibold mt-0.5 truncate" title={item.value}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
          <p>
            <strong>판정 순서:</strong> ① 발광 여부 (Index≥{summary.analysisStartIndex}) → ②
            선형 회귀 → ③ R² / Residual
          </p>
          {emissionReason && (
            <p className="text-red-700">발광 실패 사유: {emissionReason}</p>
          )}
          {verdict !== "emission_failure" && (
            <p>
              Residual 패턴:{" "}
              {hasResidualPattern ? "감지됨" : "랜덤 분포에 가까움"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
