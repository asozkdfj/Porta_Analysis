"use client";

import { useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
import { Button } from "@/components/ui/button";
import { FilePickButton } from "@/components/controls/FilePickButton";
import { InboxCsvPanel } from "@/components/controls/InboxCsvPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAnalysisSummaryCapture } from "@/components/error-analysis/ErrorAnalysisSummaryCapture";
import { ErrorAnalysisSummaryCard } from "@/components/error-analysis/ErrorAnalysisSummaryCard";
import { ErrorDetailTable } from "@/components/error-analysis/ErrorDetailTable";
import { ErrorDistributionChart } from "@/components/error-analysis/ErrorDistributionChart";
import { ErrorContPinInspectionCard } from "@/components/error-analysis/ErrorContPinInspectionCard";
import { ErrorContFailMapHeatmap } from "@/components/error-analysis/ErrorContFailMapHeatmap";
import { ErrorDrillDownPanel } from "@/components/error-analysis/ErrorDrillDownPanel";
import { ErrorFailMapHeatmap } from "@/components/error-analysis/ErrorFailMapHeatmap";
import { ErrorFiltersBar } from "@/components/error-analysis/ErrorFiltersBar";
import { ErrorRankingChart } from "@/components/error-analysis/ErrorRankingChart";
import { ErrorRankingPanels } from "@/components/error-analysis/ErrorRankingPanels";
import { ErrorTestTimeChart } from "@/components/error-analysis/ErrorTestTimeChart";
import { ErrorTimeTrendPanel } from "@/components/error-analysis/ErrorTimeTrendPanel";
import {
  ErrorUphSummaryCard,
  ErrorUphTrendChart,
} from "@/components/error-analysis/ErrorUphPanel";
import { ErrorTrendChart } from "@/components/error-analysis/ErrorTrendChart";
import { useErrorAnalysis } from "@/hooks/useErrorAnalysis";
import { saveErrorSummaryPng } from "@/lib/error-analysis-summary-export";

export function ErrorAnalysisShell() {
  const captureRef = useRef<HTMLDivElement>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);
  const {
    analysis,
    rawAnalysis,
    error,
    filters,
    drillDownSocket,
    contDrillDownSocket,
    uphCountMode,
    uphIntervalMinutes,
    setUphCountMode,
    setUphIntervalMinutes,
    loadCsvText,
    loadMock,
    setFilter,
    resetFilters,
    drillIntoSocket,
    drillIntoContSocket,
    clearDrillDown,
    clearContDrillDown,
  } = useErrorAnalysis();

  const handleFile = async (file: File) => {
    const text = await file.text();
    loadCsvText(text, file.name);
  };

  const drillRecords =
    drillDownSocket && rawAnalysis
      ? rawAnalysis.records.filter((r) => r.socket === drillDownSocket)
      : [];

  const handleSaveSummary = async () => {
    if (!rawAnalysis) return;
    if (!summaryOpen) setSummaryOpen(true);
    setCaptureBusy(true);
    setCaptureMessage(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, summaryOpen ? 0 : 500));
      const node = captureRef.current;
      if (!node) throw new Error("Summary 미리보기를 불러오지 못했습니다.");
      const { fileName } = await saveErrorSummaryPng(node, rawAnalysis.fileName);
      setCaptureMessage(`저장됨: ${fileName}`);
    } catch (e) {
      setCaptureMessage(
        e instanceof Error ? e.message : "Summary PNG 저장 실패"
      );
    } finally {
      setCaptureBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight">Data Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Error Analysis Dashboard · Fail Root Cause Analysis
          </p>
          <AppNav />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Error Analysis</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV Upload · Failing Items 기반 Fail 분석 · Stage×Socket
                  Heatmap
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
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {rawAnalysis ? (
              <p className="text-xs text-muted-foreground font-mono">
                {rawAnalysis.fileName} · {rawAnalysis.records.length} test runs
              </p>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-md">
                CSV를 업로드하면 Error Summary, Stage×Socket Fail Map, Trend,
                Detail Table을 확인할 수 있습니다.
              </p>
            )}
            <InboxCsvPanel
              module="error-analysis"
              onLoad={loadCsvText}
              loadedFileName={rawAnalysis?.fileName ?? null}
            />
          </CardContent>
        </Card>

        {analysis && rawAnalysis && (
          <>
            <ErrorFiltersBar
              filters={filters}
              availableGroups={rawAnalysis.availableGroups}
              availableSockets={rawAnalysis.availableSockets}
              availableStages={rawAnalysis.availableStages}
              availableStations={rawAnalysis.availableStations}
              availableFailItems={rawAnalysis.availableFailItems}
              drillDownSocket={drillDownSocket}
              onFilterChange={setFilter}
              onReset={resetFilters}
              onClearDrillDown={clearDrillDown}
            />

            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Summary Report</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      PPT 16:9 (1920×1080) · 한 장 요약 PNG
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={summaryOpen ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setSummaryOpen((v) => !v)}
                    >
                      {summaryOpen ? "미리보기 닫기" : "미리보기 열기"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={captureBusy}
                      onClick={() => void handleSaveSummary()}
                    >
                      <Camera className="h-4 w-4" />
                      {captureBusy ? "저장 중…" : "PPT PNG 저장"}
                    </Button>
                  </div>
                </div>
                {captureMessage && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    {captureMessage}
                  </p>
                )}
              </CardHeader>
              {summaryOpen && (
                <CardContent className="overflow-x-auto pb-6 bg-slate-100">
                  <p className="text-[11px] text-slate-500 mb-3">
                    미리보기 — 실제 저장 크기 1920×1080 (PowerPoint 16:9)
                  </p>
                  <div className="inline-block shadow-lg">
                    <ErrorAnalysisSummaryCapture
                    ref={captureRef}
                    analysis={analysis}
                    fileName={rawAnalysis.fileName}
                    uphCountMode={uphCountMode}
                    uphIntervalMinutes={uphIntervalMinutes}
                  />
                  </div>
                </CardContent>
              )}
            </Card>

            <ErrorAnalysisSummaryCard summary={analysis.summary} />

            <ErrorUphSummaryCard
              uph={analysis.uphAnalysis}
              testTimeAnalysis={analysis.testTimeAnalysis}
              countMode={uphCountMode}
              intervalMinutes={uphIntervalMinutes}
              onCountModeChange={setUphCountMode}
              onIntervalChange={setUphIntervalMinutes}
            />

            <div className="grid gap-4 lg:grid-cols-2 items-start">
              <ErrorTestTimeChart analysis={analysis.testTimeAnalysis} />
              <ErrorUphTrendChart trend={analysis.uphTrend} />
            </div>

            <ErrorTimeTrendPanel
              testTimeAnalysis={analysis.testTimeAnalysis}
              uphTrend={analysis.uphChartTrend}
            />

            <ErrorRankingChart items={analysis.errorRanking} />

            <ErrorContPinInspectionCard items={analysis.contPinInspection} />

            <div className="grid gap-4 lg:grid-cols-2 items-start">
              <div className="space-y-4 min-w-0">
                <ErrorFailMapHeatmap
                  cells={analysis.failMap}
                  selectedSocket={drillDownSocket}
                  onSelectSocket={drillIntoSocket}
                />
                {drillDownSocket && (
                  <ErrorDrillDownPanel
                    socket={drillDownSocket}
                    records={drillRecords}
                  />
                )}
              </div>
              <div className="min-w-0">
                <ErrorContFailMapHeatmap
                  cells={analysis.contFailMap}
                  selectedSocket={contDrillDownSocket}
                  onSelectSocket={drillIntoContSocket}
                />
              </div>
            </div>

            <ErrorDistributionChart
              slices={analysis.distribution}
              distributionItemsByGroup={analysis.distributionItemsByGroup}
            />

            <ErrorTrendChart points={analysis.trend} />

            <ErrorRankingPanels
              socketRanking={analysis.socketRanking}
              stageRanking={analysis.stageRanking}
              correlations={analysis.correlations}
            />

            <ErrorDetailTable records={analysis.records} />
          </>
        )}
      </main>
    </div>
  );
}
