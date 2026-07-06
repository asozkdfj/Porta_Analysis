"use client";

import { useEffect } from "react";
import { FileSpreadsheet, X } from "lucide-react";
import { TactTimeReportPanel } from "@/components/tact-time/TactTimeReportPanel";
import { Button } from "@/components/ui/button";
import type { StationCsvMap } from "@/lib/tact-time-report-types";
import type {
  TactTimeStationId,
  TactTimeStationStore,
} from "@/lib/tact-time-types";

interface TactTimeReportDialogProps {
  open: boolean;
  onClose: () => void;
  stationStore: TactTimeStationStore;
  uploads: StationCsvMap;
  onUpload: (stationId: TactTimeStationId, fileName: string, text: string) => void;
  onClear: (stationId: TactTimeStationId) => void;
  selectedCycleNumber?: number | null;
}

export function TactTimeReportDialog({
  open,
  onClose,
  stationStore,
  uploads,
  onUpload,
  onClear,
  selectedCycleNumber = null,
}: TactTimeReportDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tact-time-report-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative z-10 flex w-full max-w-3xl max-h-[min(90vh,880px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b bg-slate-50 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2
              id="tact-time-report-title"
              className="text-base font-semibold flex items-center gap-2 text-slate-900"
            >
              <FileSpreadsheet className="h-5 w-5 shrink-0 text-slate-600" />
              Tact Time Report Export
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              Station 1~8 CSV를 업로드한 뒤 Excel 보고서를 생성합니다. Setting
              그룹 설정이 적용됩니다.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-4 sm:px-5">
          <TactTimeReportPanel
            embedded
            stationStore={stationStore}
            uploads={uploads}
            onUpload={onUpload}
            onClear={onClear}
            selectedCycleNumber={selectedCycleNumber}
          />
        </div>
      </div>
    </div>
  );
}
