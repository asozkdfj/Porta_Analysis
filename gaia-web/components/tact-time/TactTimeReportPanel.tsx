"use client";

import { useCallback, useMemo, useState } from "react";
import { Download, FileSpreadsheet, X } from "lucide-react";
import { FilePickButton } from "@/components/controls/FilePickButton";
import { InboxCsvPanel } from "@/components/controls/InboxCsvPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  downloadTactTimeReport,
  exportTactTimeReportExcel,
} from "@/lib/tact-time-report-excel";
import { buildTactTimeFullReport } from "@/lib/tact-time-report";
import {
  DEFAULT_TACT_TIME_REPORT_THRESHOLDS,
  type StationCsvMap,
  type TactTimeReportCycleMode,
} from "@/lib/tact-time-report-types";
import type {
  TactTimeStationId,
  TactTimeStationStore,
} from "@/lib/tact-time-types";
import {
  TACT_TIME_STATION_COUNT,
  tactTimeStationLabel,
} from "@/lib/tact-time-types";
import { cn } from "@/lib/utils";

interface TactTimeReportPanelProps {
  embedded?: boolean;
  stationStore: TactTimeStationStore;
  uploads: StationCsvMap;
  onUpload: (stationId: TactTimeStationId, fileName: string, text: string) => void;
  onClear: (stationId: TactTimeStationId) => void;
  selectedCycleNumber?: number | null;
}

const CYCLE_MODE_OPTIONS: { value: TactTimeReportCycleMode; label: string }[] =
  [
    { value: "average", label: "Average Cycle (기본)" },
    { value: "first", label: "First Cycle" },
    { value: "worst", label: "Worst Cycle" },
    { value: "selected", label: "Selected Cycle (분석 화면 선택)" },
  ];

export function TactTimeReportPanel({
  embedded = false,
  stationStore,
  uploads,
  onUpload,
  onClear,
  selectedCycleNumber = null,
}: TactTimeReportPanelProps) {
  const [cycleMode, setCycleMode] =
    useState<TactTimeReportCycleMode>("average");
  const [checkPercent, setCheckPercent] = useState(
    DEFAULT_TACT_TIME_REPORT_THRESHOLDS.checkPercentAboveAvg
  );
  const [useSigma, setUseSigma] = useState(
    DEFAULT_TACT_TIME_REPORT_THRESHOLDS.useSigma
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [expandedInbox, setExpandedInbox] = useState<TactTimeStationId | null>(
    null
  );

  const uploadedCount = useMemo(
    () =>
      Object.values(uploads).filter(
        (u) => u != null && u.text.length > 0
      ).length,
    [uploads]
  );

  const preview = useMemo(
    () =>
      buildTactTimeFullReport(
        uploads,
        stationStore,
        cycleMode,
        { checkPercentAboveAvg: checkPercent, useSigma },
        selectedCycleNumber
      ),
    [uploads, stationStore, cycleMode, checkPercent, useSigma, selectedCycleNumber]
  );

  const handlePick = useCallback(
    async (stationId: TactTimeStationId, file: File) => {
      const text = await file.text();
      onUpload(stationId, file.name, text);
    },
    [onUpload]
  );

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const report = buildTactTimeFullReport(
        uploads,
        stationStore,
        cycleMode,
        { checkPercentAboveAvg: checkPercent, useSigma },
        selectedCycleNumber
      );
      const { blob, fileName } = await exportTactTimeReportExcel(report);
      downloadTactTimeReport(blob, fileName);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Excel 생성 실패");
    } finally {
      setExporting(false);
    }
  };

  const body = (
    <>
      {!embedded && (
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b mb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Tact Time Report Export
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Station 1~8 CSV 업로드 후 Single Cycle Breakdown 기준 Excel 보고서
              생성 · Setting 그룹 설정 적용
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs text-muted-foreground">
          {uploadedCount > 0
            ? `${uploadedCount}개 Station CSV 준비됨`
            : "Station CSV를 업로드하세요"}
        </p>
        <Button
          type="button"
          disabled={uploadedCount === 0 || exporting}
          onClick={() => void handleExport()}
        >
          <Download className="h-4 w-4" />
          {exporting ? "생성 중…" : "Export Excel"}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Cycle 기준</Label>
            <Select
              value={cycleMode}
              onValueChange={(v) => setCycleMode(v as TactTimeReportCycleMode)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CYCLE_MODE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">CHECK 임계값 (% above avg)</Label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={checkPercent}
              onChange={(e) => setCheckPercent(Number(e.target.value) || 0)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">3σ 규칙</Label>
            <label className="flex h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useSigma}
                onChange={(e) => setUseSigma(e.target.checked)}
                className="rounded border-slate-300"
              />
              평균 + 3σ 초과 시 CHECK
            </label>
          </div>
        </div>

        {cycleMode === "selected" && !selectedCycleNumber && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            분석 화면에서 Cycle을 선택하거나, First/Average/Worst 모드를
            사용하세요.
          </p>
        )}

        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-[88px_1fr_auto] gap-2 bg-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
            <span>Station</span>
            <span>CSV File</span>
            <span>Actions</span>
          </div>
          {Array.from({ length: TACT_TIME_STATION_COUNT }, (_, i) => {
            const stationId = (i + 1) as TactTimeStationId;
            const upload = uploads[stationId];
            const stationPreview = preview.stations.find(
              (s) => s.stationId === stationId
            );
            return (
              <div
                key={stationId}
                className="grid grid-cols-[88px_1fr_auto] gap-2 items-center px-3 py-2 border-t border-slate-100 text-sm"
              >
                <span className="font-medium text-slate-800">
                  {tactTimeStationLabel(stationId)}
                </span>
                <div className="min-w-0">
                  {upload ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs truncate">
                        {upload.fileName}
                      </span>
                      {stationPreview?.hasData && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {stationPreview.totalSec?.toFixed(2)} sec ·{" "}
                          {stationPreview.status}
                        </span>
                      )}
                      {stationPreview?.error && (
                        <span className="text-[10px] text-red-600 truncate">
                          {stationPreview.error}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No Data
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <FilePickButton
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onPick={(f) => void handlePick(stationId, f)}
                  >
                    Upload
                  </FilePickButton>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setExpandedInbox((cur) =>
                        cur === stationId ? null : stationId
                      )
                    }
                  >
                    Inbox
                  </Button>
                  {upload && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onClear(stationId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {expandedInbox != null && (
          <InboxCsvPanel
            key={expandedInbox}
            module="tact-time"
            station={expandedInbox}
            compact
            onLoad={(text, fileName) => onUpload(expandedInbox, fileName, text)}
            loadedFileName={uploads[expandedInbox]?.fileName}
          />
        )}

        {uploadedCount > 0 && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-700 mb-2">
              Summary Preview · {uploadedCount} stations
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-1 pr-3">Station</th>
                    <th className="py-1 pr-3">Total(sec)</th>
                    <th className="py-1 pr-3">Status</th>
                    <th className="py-1">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.stations
                    .filter((s) => s.hasData || s.fileName)
                    .map((s) => (
                      <tr
                        key={s.stationId}
                        className={cn(
                          "border-b border-slate-100",
                          s.status === "CHECK" && "bg-amber-50"
                        )}
                      >
                        <td className="py-1 pr-3 font-mono">S{s.stationId}</td>
                        <td className="py-1 pr-3 font-mono">
                          {s.totalSec != null ? s.totalSec.toFixed(2) : "—"}
                        </td>
                        <td className="py-1 pr-3">{s.status}</td>
                        <td className="py-1 text-muted-foreground">
                          {s.remark || s.error || "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {exportError && (
          <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">
            {exportError}
          </p>
        )}
      </div>
    </>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardContent className="pt-6">{body}</CardContent>
    </Card>
  );
}
