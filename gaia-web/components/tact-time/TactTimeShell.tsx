"use client";

import { Settings, Upload, FileSpreadsheet } from "lucide-react";
import { TactTimeCycleTrendChart } from "@/components/charts/TactTimeCycleTrendChart";
import { TactTimeSingleCycleChart } from "@/components/charts/TactTimeSingleCycleChart";
import { TactTimeContributionChart } from "@/components/tact-time/TactTimeContributionChart";
import { TactTimeCycleExplorer } from "@/components/tact-time/TactTimeCycleExplorer";
import { TactTimeCycleHeatmap } from "@/components/tact-time/TactTimeCycleHeatmap";
import { TactTimeCycleSummaryCard } from "@/components/tact-time/TactTimeCycleSummaryCard";
import { TactTimeFastSlowPanel } from "@/components/tact-time/TactTimeFastSlowPanel";
import { TactTimeGroupTable } from "@/components/tact-time/TactTimeGroupTable";
import { TactTimeReportDialog } from "@/components/tact-time/TactTimeReportDialog";
import { TactTimeSettingDialog } from "@/components/tact-time/TactTimeSettingDialog";
import { TactTimeStationSelector } from "@/components/tact-time/TactTimeStationSelector";
import { AppNav } from "@/components/layout/AppNav";
import { FilePickButton } from "@/components/controls/FilePickButton";
import { InboxCsvPanel } from "@/components/controls/InboxCsvPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTactTimeAnalysis } from "@/hooks/useTactTimeAnalysis";
import { CYCLE_TOTAL_TIME_LABEL, formatTactSeconds } from "@/lib/tact-time-cycles";
import { isCycleTotalTimeLabel } from "@/lib/tact-time-parser";
import {
  getStationDisambiguationHint,
  stationUsesHeaderDisambiguation,
} from "@/lib/tact-time-header-disambiguation";

import type { StationCsvMap } from "@/lib/tact-time-report-types";
import {
  tactTimeStationLabel,
  type TactTimeCompareMode,
  type TactTimeStationId,
} from "@/lib/tact-time-types";
import { useCallback, useMemo, useState } from "react";

export function TactTimeShell() {
  const {
    parsed,
    fileName,
    error,
    analysis,
    cycleAnalysis,
    selectedCycle,
    selectedCycleId,
    setSelectedCycleId,
    excludeCycle,
    restoreCycle,
    stationId,
    setStationId,
    stationGroupCounts,
    groupStore,
    unassignedHeaders,
    settingOpen,
    setSettingOpen,
    loadCsvText,
    loadMock,
    createGroup,
    updateGroup,
    deleteGroup,
    addItemsToGroup,
    removeItemFromGroup,
    resetGroups,
    exportSettings,
    importSettings,
    saveDeployDefault,
    stationStore,
  } = useTactTimeAnalysis();

  const [compareMode, setCompareMode] =
    useState<TactTimeCompareMode>("best-worst");
  const [reportUploads, setReportUploads] = useState<StationCsvMap>({});
  const [reportOpen, setReportOpen] = useState(false);

  const loadCsvForStation = useCallback(
    (text: string, fileName: string, targetStation?: TactTimeStationId) => {
      const sid = targetStation ?? stationId;
      loadCsvText(text, fileName);
      setReportUploads((prev) => ({
        ...prev,
        [sid]: { fileName, text },
      }));
    },
    [loadCsvText, stationId]
  );

  const handleFile = async (file: File) => {
    const text = await file.text();
    loadCsvForStation(text, file.name);
  };

  const handleReportUpload = useCallback(
    (sid: TactTimeStationId, fileName: string, text: string) => {
      setReportUploads((prev) => ({ ...prev, [sid]: { fileName, text } }));
      if (sid === stationId) {
        loadCsvText(text, fileName);
      }
    },
    [stationId, loadCsvText]
  );

  const handleReportClear = useCallback((sid: TactTimeStationId) => {
    setReportUploads((prev) => ({ ...prev, [sid]: null }));
  }, []);

  const selectedCycleNumber = useMemo(() => {
    if (!selectedCycle) return null;
    return selectedCycle.cycleNumber;
  }, [selectedCycle]);

  const measurableCycles = useMemo(
    () =>
      cycleAnalysis?.cycles.filter(
        (c) => c.fromTotalTimeLabel && c.totalDurationMs > 0
      ) ?? [],
    [cycleAnalysis]
  );

  const heatmapGroups = useMemo(() => {
    if (!cycleAnalysis) return [];
    return cycleAnalysis.contributions.map((c) => ({
      id: c.groupId,
      name: c.groupName,
      color: c.color,
    }));
  }, [cycleAnalysis]);

  const activeCycleId =
    selectedCycleId ?? selectedCycle?.id ?? cycleAnalysis?.cycles[0]?.id ?? null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight">Data Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Tact Time Root Cause Analysis · Cycle 기반 공정별 소요 시간 분석
          </p>
          <AppNav />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              Station 1~8 Tact Time CSV로 고객 제출용 Excel 보고서를 생성합니다.
            </p>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => setReportOpen(true)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Tact Time Report Export
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        <TactTimeStationSelector
          activeStation={stationId}
          onSelectStation={setStationId}
          groupCounts={stationGroupCounts}
        />

        <TactTimeReportDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          stationStore={stationStore}
          uploads={reportUploads}
          onUpload={handleReportUpload}
          onClear={handleReportClear}
          selectedCycleNumber={selectedCycleNumber}
        />

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">
                  Tact Time Analysis · {tactTimeStationLabel(stationId)}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {tactTimeStationLabel(stationId)} 그룹 설정 적용 · CSV: Label,
                  DurationMs, StartLocal, EndLocal
                  {stationUsesHeaderDisambiguation(stationId) && (
                    <> · {getStationDisambiguationHint(stationId)}</>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <FilePickButton variant="outline" onPick={handleFile}>
                  <Upload className="h-4 w-4" />
                  CSV Upload
                </FilePickButton>
                <Button type="button" variant="secondary" onClick={loadMock}>
                  Mock
                </Button>
                <Button
                  type="button"
                  onClick={() => setSettingOpen(true)}
                  disabled={!parsed}
                >
                  <Settings className="h-4 w-4" />
                  Tact Time Setting
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {fileName && parsed && (
              <p className="text-xs text-muted-foreground font-mono">
                {fileName} · {parsed.logEntries.length} log rows ·{" "}
                {parsed.rows.length} unique labels
                {" · "}
                {parsed.logEntries.filter((e) => isCycleTotalTimeLabel(e.header)).length}{" "}
                &quot;Total time&quot; rows ·{" "}
                {cycleAnalysis?.summary.cycleCount ?? 0} cycles
              </p>
            )}
            {!parsed && (
              <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-md">
                CSV 업로드 후 Cycle별 {CYCLE_TOTAL_TIME_LABEL} Trend와 Root Cause
                분석을 확인합니다. Setting에서 SMU / Ranging / LIW 그룹을
                구성하세요.
              </p>
            )}
            <div className={parsed ? "mt-4" : ""}>
              <InboxCsvPanel
                key={stationId}
                module="tact-time"
                station={stationId}
                onLoad={(text, name) => loadCsvForStation(text, name)}
                loadedFileName={fileName}
              />
            </div>
          </CardContent>
        </Card>

        {parsed && cycleAnalysis && (
          <>
            {cycleAnalysis.summary.cycleCount === 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {cycleAnalysis.rootCauseMessage}
              </div>
            )}

            <TactTimeCycleTrendChart
              cycles={cycleAnalysis.cycles}
              summary={cycleAnalysis.summary}
              selectedCycleId={activeCycleId}
              compareMode={compareMode}
              onCompareModeChange={setCompareMode}
              onSelectCycle={setSelectedCycleId}
              onExcludeCycle={excludeCycle}
            />

            {cycleAnalysis.excludedCycles.length > 0 && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-700 mb-2">
                  분석에서 제외된 Cycle · {cycleAnalysis.excludedCycles.length}개
                  (평균·Trend·비교 통계에 미포함)
                </p>
                <div className="flex flex-wrap gap-2">
                  {cycleAnalysis.excludedCycles.map((cycle) => (
                    <Button
                      key={cycle.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs"
                      onClick={() => restoreCycle(cycle.id)}
                    >
                      #{cycle.cycleNumber} · {formatTactSeconds(cycle.totalDurationMs)}{" "}
                      복원
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {cycleAnalysis.summary.cycleCount > 0 && (
              <>
                <TactTimeCycleSummaryCard summary={cycleAnalysis.summary} />

                <TactTimeSingleCycleChart
                  cycles={cycleAnalysis.cycles}
                  selectedCycle={selectedCycle}
                  avgCycleTotalMs={cycleAnalysis.summary.avgDurationMs}
                  onSelectCycle={setSelectedCycleId}
                />

                <TactTimeFastSlowPanel
                  compareMode={compareMode}
                  summary={cycleAnalysis.summary}
                  selectedCycle={selectedCycle}
                  measurableCycles={measurableCycles}
                />

                <TactTimeContributionChart
                  contributions={cycleAnalysis.contributions}
                />

                <TactTimeCycleHeatmap
                  cycles={cycleAnalysis.cycles}
                  groupOrder={heatmapGroups}
                  selectedCycleId={activeCycleId}
                  onSelectCycle={setSelectedCycleId}
                />

                <TactTimeCycleExplorer
                  cycles={cycleAnalysis.cycles}
                  selectedCycle={selectedCycle}
                  onSelectCycle={setSelectedCycleId}
                />
              </>
            )}
          </>
        )}

        {parsed && analysis && groupStore.groups.length > 0 && (
          <TactTimeGroupTable groups={analysis.groups} />
        )}

        {parsed && (
          <TactTimeSettingDialog
            open={settingOpen}
            onClose={() => setSettingOpen(false)}
            stationId={stationId}
            rows={parsed.rows}
            groups={groupStore.groups}
            unassignedHeaders={unassignedHeaders}
            onCreateGroup={createGroup}
            onUpdateGroup={updateGroup}
            onDeleteGroup={deleteGroup}
            onAddItemsToGroup={addItemsToGroup}
            onRemoveItemFromGroup={removeItemFromGroup}
            onResetGroups={resetGroups}
            onExportSettings={exportSettings}
            onImportSettings={importSettings}
            onSaveDeployDefault={
              process.env.NODE_ENV === "development"
                ? saveDeployDefault
                : undefined
            }
          />
        )}
      </main>
    </div>
  );
}
