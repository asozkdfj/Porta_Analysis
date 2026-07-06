"use client";

import { RefreshCw, Upload } from "lucide-react";
import { TemperatureTrendChart } from "@/components/charts/TemperatureTrendChart";
import { AppNav } from "@/components/layout/AppNav";
import { TemperatureResultFilters } from "@/components/dashboard/TemperatureResultFilters";
import { TemperatureResultsTable } from "@/components/dashboard/TemperatureResultsTable";
import { RetestSummaryCard } from "@/components/dashboard/RetestSummaryCard";
import { TemperatureStatusBanner } from "@/components/dashboard/TemperatureStatusBanner";
import { TemperatureSummaryCard } from "@/components/dashboard/TemperatureSummaryCard";
import { Button } from "@/components/ui/button";
import { FilePickButton } from "@/components/controls/FilePickButton";
import { InboxCsvPanel } from "@/components/controls/InboxCsvPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTemperatureTracking } from "@/hooks/useTemperatureTracking";
import {
  NTC_TEMP_HEADER_TOKEN,
  TEMP_PASS_DELTA,
  TEMP_WARNING_DELTA,
} from "@/lib/temperature-tracking-config";
import type { TemperatureBranch } from "@/lib/temperature-tracking-types";
import type { TemperatureFilterStats } from "@/components/dashboard/TemperatureSummaryCard";

export function TemperatureTrackingShell() {
  const {
    fileName,
    error,
    branch,
    setBranch,
    branches,
    branchHeader,
    hasData,
    overviewAnalysis,
    visibleBarcodes,
    batchSummary,
    filteredResults,
    filter,
    setFilter,
    focusBarcode,
    setFocusBarcode,
    highlightSocket,
    highlightRunId,
    clearSocketHighlight,
    selectedReadingKey,
    setSelectedReadingKey,
    excludedReadings,
    excludeReading,
    restoreReading,
    clearExcludedReadings,
    selectResultRow,
    loadCsvText,
    loadMock,
    refresh,
    parsed,
  } = useTemperatureTracking();

  const handleFile = async (file: File) => {
    const text = await file.text();
    loadCsvText(text, file.name);
  };

  const displaySummary = overviewAnalysis?.summary ?? batchSummary;

  const filterStats: TemperatureFilterStats | null =
    batchSummary.total > 0
      ? {
          total: batchSummary.total,
          pass: batchSummary.pass,
          warning: batchSummary.warning,
          fail: batchSummary.fail,
        }
      : null;

  const retestSummary =
    batchSummary.total > 0
      ? {
          totalTests: batchSummary.total,
          uniqueBarcodes: batchSummary.uniqueBarcodes,
          retestCount: batchSummary.retestCount,
          retestRate: batchSummary.retestRate,
          passAfterRetest: batchSummary.passAfterRetest,
          failAfterRetest: batchSummary.failAfterRetest,
        }
      : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight">Data Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Temperature Tracking · Socket별 Barcode 온도 분포
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

        <Card className="border-slate-300 bg-white shadow-sm">
          <CardContent className="py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">데이터 수집</p>
                <p className="text-xs text-muted-foreground font-mono">
                  패턴: *LIW{"{20C|50C}"}_*{NTC_TEMP_HEADER_TOKEN}*
                  {parsed && branchHeader && ` · LIW${branch} 매칭`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilePickButton variant="outline" onPick={handleFile}>
                    <Upload className="h-4 w-4" />
                    CSV 업로드
                  </FilePickButton>
                  <Button type="button" variant="secondary" onClick={loadMock}>
                    Mock
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={refresh}
                    disabled={!parsed}
                    title="Refresh"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  {fileName && (
                    <span
                      className="text-xs text-muted-foreground self-center truncate max-w-[200px]"
                      title={fileName}
                    >
                      {fileName}
                    </span>
                  )}
                </div>
                <InboxCsvPanel
                  module="temperature"
                  onLoad={loadCsvText}
                  loadedFileName={fileName}
                  compact
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  LIW 온도 분기
                </Label>
                <Tabs
                  value={branch}
                  onValueChange={(v) => setBranch(v as TemperatureBranch)}
                >
                  <TabsList className="h-9">
                    {branches.map((b) => (
                      <TabsTrigger
                        key={b}
                        value={b}
                        disabled={!parsed}
                        className="px-5 font-semibold"
                      >
                        {b}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              그래프: 전체 Barcode × Socket(G_01~G_08) 온도 위치 · Spec 이탈 시 FAIL
              상·하한 · 안정성 판정 PASS Δ&lt;{TEMP_PASS_DELTA}°C · WARNING{" "}
              {TEMP_PASS_DELTA}~{TEMP_WARNING_DELTA}°C · FAIL Δ≥{TEMP_WARNING_DELTA}°C
            </p>
            {parsed && !branchHeader && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                LIW{branch} NTC 온도 컬럼을 찾지 못했습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {displaySummary.socketCount > 0 && (
          <div className="space-y-4">
            <TemperatureSummaryCard
              summary={displaySummary}
              filterStats={filterStats}
              activeFilter={filter}
              onFilterChange={setFilter}
            />
            {retestSummary && <RetestSummaryCard summary={retestSummary} />}
            <TemperatureResultFilters
              filter={filter}
              onFilterChange={setFilter}
              showing={hasData ? visibleBarcodes.length : filteredResults.length}
              total={
                batchSummary.total > 0
                  ? batchSummary.total
                  : (overviewAnalysis?.barcodes.length ?? 0)
              }
            />
          </div>
        )}

        <section className="space-y-6">
          {!parsed || !branchHeader ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                CSV 업로드 후 20C/50C를 선택하면 전체 Barcode의 Socket별 온도
                그래프가 표시됩니다.
              </CardContent>
            </Card>
          ) : !overviewAnalysis ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                LIW{branch} 온도 데이터를 분석할 수 없습니다. NTC 컬럼과 측정
                데이터를 확인해 주세요.
              </CardContent>
            </Card>
          ) : !focusBarcode ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                Barcode 데이터를 불러오는 중입니다.
              </CardContent>
            </Card>
          ) : (
            <>
              <TemperatureStatusBanner
                verdict={overviewAnalysis.summary.overallVerdict}
                message={overviewAnalysis.summary.overallMessage}
              />
              <TemperatureTrendChart
                analysis={overviewAnalysis}
                barcodes={overviewAnalysis.barcodes}
                focusBarcode={focusBarcode}
                onFocusBarcodeChange={(barcode) => {
                  setFocusBarcode(barcode);
                  clearSocketHighlight();
                }}
                highlightSocket={highlightSocket}
                highlightRunId={highlightRunId}
                selectedReadingKey={selectedReadingKey}
                onSelectReading={setSelectedReadingKey}
                onExcludeReading={excludeReading}
              />

              {excludedReadings.length > 0 && (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-700">
                      분석에서 제외된 데이터 · {excludedReadings.length}개
                      (그래프·요약·하단 테이블에서 미포함)
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={clearExcludedReadings}
                    >
                      전체 복원
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {excludedReadings.map((reading) => (
                      <Button
                        key={reading.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs"
                        onClick={() => restoreReading(reading.key)}
                      >
                        {reading.socketLabel} · {reading.barcodeLabel} ·{" "}
                        {reading.value.toFixed(2)}°C 복원
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {batchSummary.total > 0 && (
          <div className="relative z-0 pt-4 border-t border-slate-200">
            <TemperatureResultsTable
            rows={filteredResults}
            selectedRunId={highlightRunId}
            onSelectRow={selectResultRow}
          />
          </div>
        )}
      </main>
    </div>
  );
}
