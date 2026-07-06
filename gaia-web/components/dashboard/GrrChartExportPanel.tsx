"use client";

import { FolderOutput, ImageDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTestItemLabel } from "@/lib/liw-grr-spec";
import {
  isMetricExportEnabled,
  type GrrChartExportSettings,
} from "@/lib/grr-chart-export-storage";
import type { AnalysisGroup } from "@/lib/types";

interface GrrChartExportPanelProps {
  group: AnalysisGroup;
  metrics: string[];
  settings: GrrChartExportSettings;
  enabledCount: number;
  outboxDir: string | null;
  status: string | null;
  busy: boolean;
  disabled?: boolean;
  onExportCurrent: () => void;
  onExportSelected: () => void;
  onToggleMetric: (metric: string, enabled: boolean) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onAutoSaveCurrentChange: (enabled: boolean) => void;
  onAutoSaveOnLoadChange: (enabled: boolean) => void;
}

export function GrrChartExportPanel({
  group,
  metrics,
  settings,
  enabledCount,
  outboxDir,
  status,
  busy,
  disabled,
  onExportCurrent,
  onExportSelected,
  onToggleMetric,
  onSelectAll,
  onClearAll,
  onAutoSaveCurrentChange,
  onAutoSaveOnLoadChange,
}: GrrChartExportPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderOutput className="h-4 w-4" />
          Correlation 그래프 저장
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          로컬 outbox에 PNG로 저장합니다. 서버 쓰기가 불가하면 브라우저 다운로드로
          대체됩니다.
        </p>
        {outboxDir && (
          <p className="text-[11px] font-mono text-slate-600 break-all">
            {outboxDir}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={disabled || busy}
            onClick={onExportCurrent}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageDown className="h-4 w-4" />
            )}
            현재 차트 저장
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || busy || enabledCount === 0}
            onClick={onExportSelected}
          >
            선택 Metric 일괄 저장 ({enabledCount})
          </Button>
        </div>

        <div className="space-y-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoSaveCurrent}
              onChange={(e) => onAutoSaveCurrentChange(e.target.checked)}
              disabled={disabled || busy}
              className="rounded"
            />
            Metric / Reference 변경 시 현재 차트 자동 저장
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoSaveOnLoad}
              onChange={(e) => onAutoSaveOnLoadChange(e.target.checked)}
              disabled={disabled || busy}
              className="rounded"
            />
            CSV 로드 시 선택 Metric 일괄 자동 저장
          </label>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-700">
              저장할 Metric 선택 · {group}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={disabled || metrics.length === 0}
                onClick={onSelectAll}
              >
                전체 선택
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={disabled || metrics.length === 0}
                onClick={onClearAll}
              >
                전체 해제
              </Button>
            </div>
          </div>
          {metrics.length === 0 ? (
            <p className="text-xs text-muted-foreground">Metric 없음</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {metrics.map((metric) => {
                const enabled = isMetricExportEnabled(group, metric, settings);
                const label = formatTestItemLabel(metric);
                return (
                  <label
                    key={metric}
                    className="flex items-start gap-2 rounded px-1 py-1 hover:bg-white cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => onToggleMetric(metric, e.target.checked)}
                      disabled={disabled || busy}
                      className="mt-0.5 rounded"
                    />
                    <span className="min-w-0">
                      <span className="block font-mono text-[11px] text-slate-900 break-all">
                        {label}
                      </span>
                      {label !== metric && (
                        <span className="block font-mono text-[10px] text-muted-foreground break-all">
                          {metric}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {status && (
          <p className="text-xs text-slate-600 font-mono break-all">{status}</p>
        )}
      </CardContent>
    </Card>
  );
}
