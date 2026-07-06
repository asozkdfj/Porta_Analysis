"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConfigValidationResult, CoverageReport } from "@/lib/gaia-spec-config";
import type { GaiaAnalysisResult } from "@/lib/types";

interface ConfigStatusPanelProps {
  configValidation: ConfigValidationResult | null;
  configError: string | null;
  coverage: CoverageReport | null;
  analysis: GaiaAnalysisResult | null;
}

const SOURCE_LABEL: Record<string, string> = {
  exact: "GrrConfig (정확일치)",
  "case-insensitive": "GrrConfig (대소문자 무시)",
  normalized: "GrrConfig (정규화 매칭)",
  contains: "GrrConfig (포함매칭)",
  ambiguous: "AMBIGUOUS SPEC MATCH",
  csv: "CSV 2~3행 (미사용)",
  fallback: "Fallback 범위",
  none: "SPEC MISSING",
};

export function ConfigStatusPanel({
  configValidation,
  configError,
  coverage,
  analysis,
}: ConfigStatusPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Config / Spec 상태</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {configError && (
          <p className="text-red-600 text-xs">{configError}</p>
        )}

        {configValidation && (
          <div className="flex flex-wrap gap-2">
            <Badge variant={configValidation.valid ? "success" : "danger"}>
              {configValidation.valid ? "Config 유효" : "Config 오류"}
            </Badge>
            <Badge variant="outline">
              Item {configValidation.itemCount}개
            </Badge>
          </div>
        )}

        {analysis && (
          <div className="rounded-md border bg-slate-50 p-3 space-y-1 text-xs">
            <div>
              <span className="text-muted-foreground">Spec 출처: </span>
              {SOURCE_LABEL[analysis.specSource] ?? analysis.specSource}
            </div>
            {analysis.matchedConfigItem && (
              <div className="truncate" title={analysis.matchedConfigItem}>
                <span className="text-muted-foreground">매칭 Item: </span>
                {analysis.matchedConfigItem}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">그래프 축: </span>
              {analysis.axisDomain[0]} ~ {analysis.axisDomain[1]}
              {analysis.specUnit ? ` (${analysis.specUnit})` : ""}
            </div>
          </div>
        )}

        {coverage && coverage.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Metric Coverage</span>
              <Badge variant={coverage.coveragePercent >= 80 ? "success" : "warning"}>
                {coverage.coveragePercent}% ({coverage.registered}/{coverage.total})
              </Badge>
            </div>
            {coverage.missing.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-amber-700">
                  미등록 Metric {coverage.missing.length}개
                </summary>
                <ul className="mt-1 max-h-24 overflow-auto text-muted-foreground">
                  {coverage.missing.slice(0, 20).map((m) => (
                    <li key={m} className="truncate" title={m}>
                      {m}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {configValidation && configValidation.issues.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              검증 이슈 {configValidation.issues.length}건
            </summary>
            <ul className="mt-1 max-h-32 overflow-auto space-y-1">
              {configValidation.issues.slice(0, 15).map((issue, i) => (
                <li
                  key={`${issue.code}-${i}`}
                  className={issue.severity === "error" ? "text-red-600" : "text-amber-700"}
                >
                  [{issue.code}] {issue.message}
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
