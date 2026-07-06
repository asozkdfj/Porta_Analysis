"use client";

import { RefreshCw, Upload } from "lucide-react";
import { GrrTemperatureTrendChart } from "@/components/charts/GrrTemperatureTrendChart";
import { GrrWlCenterTrendChart } from "@/components/charts/GrrWlCenterTrendChart";
import { LinearityResidualChart } from "@/components/charts/LinearityResidualChart";
import { LinearityScatterChart } from "@/components/charts/LinearityScatterChart";
import { GrrBatchSummaryCard } from "@/components/dashboard/GrrBatchSummaryCard";
import { GrrMetricStatusBanner } from "@/components/dashboard/GrrMetricStatusBanner";
import { GrrResultFilters } from "@/components/dashboard/GrrResultFilters";
import { GrrResultsTable } from "@/components/dashboard/GrrResultsTable";
import { GrrTemperatureSummaryCard } from "@/components/dashboard/GrrTemperatureSummaryCard";
import { GrrWlCenterSummaryCard } from "@/components/dashboard/GrrWlCenterSummaryCard";
import { LinearityStatusBanner } from "@/components/dashboard/LinearityStatusBanner";
import { LinearitySummaryPanel } from "@/components/dashboard/LinearitySummaryPanel";
import { AppNav } from "@/components/layout/AppNav";
import { GrrModulePicker } from "@/components/controls/GrrModulePicker";
import { ConfigUploader } from "@/components/controls/ConfigUploader";
import { FilePickButton } from "@/components/controls/FilePickButton";
import { InboxCsvPanel } from "@/components/controls/InboxCsvPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLiwLinearity } from "@/hooks/useLiwLinearity";
import {
  NTC_TEMP_PRE_SEARCH_TOKEN,
  WL_CENTER_SEARCH_TOKEN,
} from "@/lib/liw-grr-config";
import type { LinearityBranch } from "@/lib/liw-linearity-types";

function formatSocketLabel(socket: string): string {
  const num = socket.replace(/^.*_/, "").replace(/\D/g, "");
  return num ? `Socket ${num} (${socket})` : socket;
}

function SectionHeading({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b pb-2">
      <h2 className="text-base font-bold text-slate-900">
        {index}. {title}
      </h2>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
  );
}

function ExcludedTrendPointsPanel({
  title,
  points,
  valueDigits,
  valueSuffix,
  onRestore,
  onRestoreAll,
}: {
  title: string;
  points: { key: string; label: string; value: number }[];
  valueDigits: number;
  valueSuffix: string;
  onRestore: (key: string) => void;
  onRestoreAll: () => void;
}) {
  if (points.length === 0) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-700">
          {title} · {points.length}개 (그래프·요약에서 미포함)
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onRestoreAll}
        >
          전체 복원
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {points.map((point) => (
          <Button
            key={point.key}
            type="button"
            variant="outline"
            size="sm"
            className="font-mono text-xs"
            onClick={() => onRestore(point.key)}
          >
            {point.label} · {point.value.toFixed(valueDigits)}
            {valueSuffix} 복원
          </Button>
        ))}
      </div>
    </div>
  );
}

export function LiwLinearityShell() {
  const {
    fileName,
    error,
    grrModules,
    barcodeOverflow,
    selectModule,
    activeModuleCount,
    loadedRun,
    matchCount,
    selectedBarcode,
    selectedSocket,
    sockets,
    setSocket,
    loadData,
    branch,
    setBranch,
    branches,
    series,
    matchedHeaders,
    indexedNtcHeaders,
    indexedWlCenterHeaders,
    activeRow,
    ntcAnalysis,
    wlCenterAnalysis,
    excludedNtcPoints,
    excludedWlCenterPoints,
    selectedNtcPointKey,
    setSelectedNtcPointKey,
    selectedWlCenterPointKey,
    setSelectedWlCenterPointKey,
    excludeNtcPoint,
    excludeWlCenterPoint,
    restoreNtcPoint,
    restoreWlCenterPoint,
    clearExcludedNtcPoints,
    clearExcludedWlCenterPoints,
    batchSummary,
    configFileName,
    configError,
    specStore,
    isUserConfig,
    configAppliedAt,
    configItemCount,
    loadSpecFromUser,
    reloadDefaultConfig,
    filteredResults,
    filter,
    setFilter,
    selectResultRow,
    loadCsvText,
    loadMock,
    refresh,
    parsed,
  } = useLiwLinearity();

  const handleFile = async (file: File) => {
    const text = await file.text();
    loadCsvText(text, file.name);
  };

  const poAnalysis = activeRow?.poAnalysis ?? null;
  const hasDetail = !!(poAnalysis || ntcAnalysis || wlCenterAnalysis);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight">Data Analysis</h1>
          <p className="text-sm text-muted-foreground">
            LIW 분석 · PO + NTC + WL_CENTER
          </p>
          <AppNav />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {configError && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Reference Config: {configError}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card className="border-slate-300 bg-white shadow-sm">
          <CardContent className="py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">분석 대상</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-mono font-semibold text-slate-800">
                    LIW{branch}
                  </span>
                  {" · "}PO <code className="font-mono">{series.headerToken}*</code>
                  {parsed && ` · PO ${matchedHeaders.length}컬럼`}
                  {parsed && indexedNtcHeaders.length > 0 && ` · NTC ${indexedNtcHeaders.length}점`}
                  {parsed && indexedWlCenterHeaders.length > 0 &&
                    ` · WL_CENTER ${indexedWlCenterHeaders.length}점`}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    LIW 온도 분기
                  </Label>
                  <Tabs
                    value={branch}
                    onValueChange={(v) => setBranch(v as LinearityBranch)}
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
                <div className="flex flex-wrap gap-2 text-xs self-end">
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800 font-medium">
                    PO
                  </span>
                  <span className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-sky-800 font-medium">
                    NTC · *{NTC_TEMP_PRE_SEARCH_TOKEN}*
                  </span>
                  <span className="rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-800 font-medium">
                    WL_CENTER · *{WL_CENTER_SEARCH_TOKEN}*
                  </span>
                </div>
              </div>
            </div>
            {parsed && matchedHeaders.length === 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <code className="font-mono">{series.headerToken}*</code> PO 컬럼을 찾지 못했습니다.
              </div>
            )}
            {parsed && indexedNtcHeaders.length === 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <code className="font-mono">*{NTC_TEMP_PRE_SEARCH_TOKEN}*</code> 온도 컬럼을
                찾지 못했습니다.
              </div>
            )}
            {parsed && indexedWlCenterHeaders.length === 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <code className="font-mono">*{WL_CENTER_SEARCH_TOKEN}*</code> 컬럼을 찾지
                못했습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {batchSummary.total > 0 && (
          <div className="space-y-4">
            <GrrBatchSummaryCard
              summary={batchSummary}
              activeFilter={filter}
              onFilterChange={setFilter}
            />
            <GrrResultFilters
              filter={filter}
              onFilterChange={setFilter}
              showing={filteredResults.length}
              total={batchSummary.total}
            />
          </div>
        )}

        {parsed && activeModuleCount > 0 && (
          <GrrModulePicker
            modules={grrModules}
            selectedBarcode={selectedBarcode}
            onSelectModule={selectModule}
            barcodeOverflow={barcodeOverflow}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">데이터</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <ConfigUploader
                  fileName={configFileName}
                  version={specStore?.version ?? null}
                  itemCount={configItemCount}
                  appliedAt={configAppliedAt}
                  isUserConfig={isUserConfig}
                  onLoad={loadSpecFromUser}
                  onReloadDefault={reloadDefaultConfig}
                />
                <div className="space-y-2">
                  <Label>Log (CSV)</Label>
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
                  </div>
                  {fileName && (
                    <p className="text-xs text-muted-foreground truncate" title={fileName}>
                      {fileName}
                    </p>
                  )}
                  <InboxCsvPanel
                    module="liw"
                    onLoad={loadCsvText}
                    loadedFileName={fileName}
                    compact
                  />
                </div>

                {sockets.length > 1 && selectedBarcode && (
                  <div className="space-y-2">
                    <Label>Socket</Label>
                    <Select
                      value={selectedSocket}
                      onValueChange={(socket) => {
                        setSocket(socket);
                        loadData();
                      }}
                      disabled={!parsed || sockets.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Socket 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {sockets.map((socket) => (
                          <SelectItem key={socket} value={socket}>
                            {formatSocketLabel(socket)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-8">
            {loadedRun && activeRow && (
              <Card className="border-slate-200 bg-white">
                <CardContent className="py-4">
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm items-center">
                    <div>
                      <span className="text-muted-foreground">Barcode</span>
                      <span className="ml-2 font-mono font-semibold">{selectedBarcode}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Socket</span>
                      <span className="ml-2 font-mono font-semibold">
                        {formatSocketLabel(selectedSocket)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Attempt</span>
                      <span className="ml-2 font-semibold">{loadedRun.attemptLabel}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Overall</span>
                      <span className="ml-2">
                        <Badge
                          variant={
                            activeRow.overallResult === "PASS"
                              ? "success"
                              : activeRow.overallResult === "SPEC MISSING"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {activeRow.overallResult}
                        </Badge>
                      </span>
                    </div>
                    {matchCount > 1 && (
                      <span className="text-xs text-amber-700">
                        동일 Barcode+Socket {matchCount}건 — 최신 Run 사용
                      </span>
                    )}
                  </div>
                  {activeRow.overallFailReason && (
                    <p className="text-xs text-red-700 mt-2">{activeRow.overallFailReason}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {!hasDetail ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground text-sm">
                  CSV 업로드 후 상단 M01~M08 모듈을 선택하거나 테이블 행을 클릭하세요
                </CardContent>
              </Card>
            ) : (
              <>
                {poAnalysis && (
                  <div className="space-y-4">
                    <SectionHeading
                      index={1}
                      title="PO Analysis"
                      description="LIW PO 선형성 · Regression · Residual"
                    />
                    <LinearityStatusBanner
                      statusTitle={poAnalysis.statusTitle}
                      statusMessage={poAnalysis.statusMessage}
                      verdict={poAnalysis.verdict}
                    />
                    <LinearityScatterChart
                      analysis={poAnalysis}
                      yAxisLabel={`LIW${branch}_PO`}
                    />
                    <LinearityResidualChart analysis={poAnalysis} />
                    <LinearitySummaryPanel
                      summary={poAnalysis.summary}
                      verdict={poAnalysis.verdict}
                      statusMessage={poAnalysis.statusMessage}
                      hasResidualPattern={poAnalysis.hasResidualPattern}
                      emissionReason={poAnalysis.emission.reason}
                      seriesLabel={poAnalysis.series.label}
                      runLabel={poAnalysis.run.label}
                    />
                  </div>
                )}

                {ntcAnalysis && (
                  <div className="space-y-4">
                    <SectionHeading
                      index={2}
                      title="NTC Temperature"
                      description={`NTC_TEMP_PRE 포함 Header · PO 스텝별 온도 안정성`}
                    />
                    <GrrMetricStatusBanner
                      statusTitle={ntcAnalysis.statusTitle}
                      statusMessage={ntcAnalysis.statusMessage}
                      passed={ntcAnalysis.verdict === "pass"}
                      warn={ntcAnalysis.verdict === "data_missing"}
                    />
                    <GrrTemperatureSummaryCard analysis={ntcAnalysis} />
                    <GrrTemperatureTrendChart
                      analysis={ntcAnalysis}
                      selectedPointKey={selectedNtcPointKey}
                      onSelectPoint={setSelectedNtcPointKey}
                      onExcludePoint={excludeNtcPoint}
                    />
                    <ExcludedTrendPointsPanel
                      title="NTC Temperature에서 제외된 데이터"
                      points={excludedNtcPoints}
                      valueDigits={2}
                      valueSuffix="°C"
                      onRestore={restoreNtcPoint}
                      onRestoreAll={clearExcludedNtcPoints}
                    />
                  </div>
                )}

                {wlCenterAnalysis && (
                  <div className="space-y-4">
                    <SectionHeading
                      index={3}
                      title="WL_CENTER Analysis"
                      description="WL_CENTER 37-point stability · Drift / Spike detection"
                    />
                    <GrrMetricStatusBanner
                      statusTitle={wlCenterAnalysis.statusTitle}
                      statusMessage={wlCenterAnalysis.statusMessage}
                      passed={wlCenterAnalysis.verdict === "pass"}
                      warn={wlCenterAnalysis.verdict === "data_missing"}
                      specMissing={wlCenterAnalysis.verdict === "spec_missing"}
                    />
                    <GrrWlCenterSummaryCard analysis={wlCenterAnalysis} />
                    <GrrWlCenterTrendChart
                      analysis={wlCenterAnalysis}
                      selectedPointKey={selectedWlCenterPointKey}
                      onSelectPoint={setSelectedWlCenterPointKey}
                      onExcludePoint={excludeWlCenterPoint}
                    />
                    <ExcludedTrendPointsPanel
                      title="WL_CENTER에서 제외된 데이터"
                      points={excludedWlCenterPoints}
                      valueDigits={4}
                      valueSuffix=""
                      onRestore={restoreWlCenterPoint}
                      onRestoreAll={clearExcludedWlCenterPoints}
                    />
                  </div>
                )}

              </>
            )}
          </section>
        </div>

        {batchSummary.total > 0 && (
          <GrrResultsTable
            rows={filteredResults}
            selectedRunId={loadedRun?.runId ?? null}
            onSelectRow={selectResultRow}
          />
        )}
      </main>
    </div>
  );
}
