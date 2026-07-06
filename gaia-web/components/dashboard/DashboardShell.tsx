"use client";

import { useCallback, useRef, useState } from "react";
import { CsvUploader } from "@/components/controls/CsvUploader";
import { ControlPanel } from "@/components/controls/ControlPanel";
import { GoldenSocketBar } from "@/components/controls/GoldenSocketBar";
import { GaiaGrrChart } from "@/components/charts/GaiaGrrChart";
import { GoldenDeltaChart } from "@/components/charts/GoldenDeltaChart";
import { RangingChart } from "@/components/charts/RangingChart";
import { GrrChartExportPanel } from "@/components/dashboard/GrrChartExportPanel";
import { GrrDashboardSpecSummaryCard } from "@/components/dashboard/GrrDashboardSpecSummaryCard";
import { GrrSummaryDialog } from "@/components/dashboard/GrrSummaryDialog";
import { GrrTesterSidebar } from "@/components/dashboard/GrrTesterSidebar";
import { GoldenSocketResultsTable } from "@/components/dashboard/GoldenSocketResultsTable";
import { GoldenSocketSummaryCard } from "@/components/dashboard/GoldenSocketSummaryCard";
import { ConfigStatusPanel } from "@/components/dashboard/ConfigStatusPanel";
import { SummaryPanel } from "@/components/dashboard/SummaryPanel";
import { ConfigUploader } from "@/components/controls/ConfigUploader";
import { AppNav } from "@/components/layout/AppNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGaiaAnalysis } from "@/hooks/useGaiaAnalysis";
import { useGrrChartExport } from "@/hooks/useGrrChartExport";
import {
  GRR_NAVIGATION_SHORTCUTS,
  useGrrNavigationShortcuts,
} from "@/hooks/useGrrNavigationShortcuts";
import {
  buildGrrFullReferenceReport,
  buildGrrGroupReport,
} from "@/lib/grr-tester-summary";
import type { GrrSummaryReport } from "@/lib/grr-tester-summary";
import type { GoldenFilter } from "@/lib/golden-socket-config";
import { MOCK_CSV } from "@/lib/mock-data";

export function DashboardShell() {
  const [goldenFilter, setGoldenFilter] = useState<GoldenFilter>("all");
  const [grrSummaryOpen, setGrrSummaryOpen] = useState(false);
  const [grrSummaryData, setGrrSummaryData] = useState<GrrSummaryReport | null>(
    null
  );
  const grrChartExportRef = useRef<HTMLDivElement | null>(null);

  const {
    group,
    setGroup,
    metric,
    setMetric,
    referenceSocket,
    setReferenceSocket,
    serialFilter,
    setSerialFilter,
    liwBranch,
    setLiwBranch,
    metrics,
    serials,
    sockets,
    analysis,
    error,
    fileName,
    parsed,
    loadCsvText,
    specStore,
    configFileName,
    configValidation,
    configError,
    isUserConfig,
    configAppliedAt,
    configItemCount,
    coverage,
    dashboardSpecSummary,
    stat2Summary,
    testerSidebarEntries,
    goldenAnalysis,
    goldenSocket,
    goldenDeltaLimit,
    loadSpecFromUser,
    reloadDefaultConfig,
    metricFilterSource,
  } = useGaiaAnalysis();

  const chartExport = useGrrChartExport({
    parsed,
    group,
    metrics,
    metric,
    referenceSocket,
    serialFilter,
    fileName,
    exportRootRef: grrChartExportRef,
    setMetric,
  });

  useGrrNavigationShortcuts({
    enabled: !!parsed,
    metrics,
    metric,
    onMetricChange: setMetric,
    sockets,
    referenceSocket,
    onReferenceSocketChange: setReferenceSocket,
  });

  const handleMock = useCallback(() => {
    loadCsvText(MOCK_CSV, "mock-sample.csv");
  }, [loadCsvText]);

  const handleOpenGrrSummary = useCallback(
    (testerId: string) => {
      if (!parsed || !specStore) return;
      const report = buildGrrGroupReport(parsed, group, specStore, sockets, {
        activeTester: testerId,
        liwBranch,
        serialFilter: serialFilter === "ALL" ? undefined : serialFilter,
        configVersion: specStore.version ?? configFileName,
      });
      if (!report) return;
      setGrrSummaryData(report);
      setGrrSummaryOpen(true);
    },
    [
      parsed,
      specStore,
      group,
      sockets,
      liwBranch,
      serialFilter,
      configFileName,
    ]
  );

  const handleCloseGrrSummary = useCallback(() => {
    setGrrSummaryOpen(false);
  }, []);

  const handleOpenFullGrrSummary = useCallback(() => {
    if (!parsed || !specStore || sockets.length === 0) return;
    const report = buildGrrFullReferenceReport(
      parsed,
      specStore,
      sockets,
      {
        activeTester: referenceSocket,
        serialFilter: serialFilter === "ALL" ? undefined : serialFilter,
        configVersion: specStore.version ?? configFileName,
      }
    );
    if (!report) return;
    setGrrSummaryData(report);
    setGrrSummaryOpen(true);
  }, [
    parsed,
    specStore,
    sockets,
    referenceSocket,
    serialFilter,
    configFileName,
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Data Analysis</h1>
              <p className="text-sm text-muted-foreground">
                CSV 기반 GRR 분석 · FFBP / Ranging / JC / LIW / SMU
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenFullGrrSummary}
              disabled={!parsed || !specStore || sockets.length === 0}
              className="shrink-0"
            >
              GRR Summary
            </Button>
          </div>
          <AppNav />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        <GoldenSocketBar />

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {goldenAnalysis && (
          <GoldenSocketSummaryCard
            summary={goldenAnalysis.summary}
            stat2Summary={stat2Summary}
          />
        )}

        {dashboardSpecSummary && parsed && (
          <GrrDashboardSpecSummaryCard
            summary={dashboardSpecSummary}
            configFileName={configFileName}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* 설정/컨트롤 패널 */}
          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">데이터 &amp; 컨트롤</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ConfigUploader
                  fileName={configFileName}
                  version={specStore?.version ?? null}
                  itemCount={configItemCount}
                  appliedAt={configAppliedAt}
                  isUserConfig={isUserConfig}
                  onLoad={loadSpecFromUser}
                  onReloadDefault={reloadDefaultConfig}
                />
                <CsvUploader
                  fileName={fileName}
                  onLoad={loadCsvText}
                  onLoadMock={handleMock}
                  inboxModule="grr"
                />
                <ControlPanel
                  group={group}
                  onGroupChange={setGroup}
                  metrics={metrics}
                  metric={metric}
                  onMetricChange={setMetric}
                  sockets={sockets}
                  referenceSocket={referenceSocket}
                  onReferenceSocketChange={setReferenceSocket}
                  serials={serials}
                  serialFilter={serialFilter}
                  onSerialFilterChange={setSerialFilter}
                  liwBranch={liwBranch}
                  onLiwBranchChange={setLiwBranch}
                  metricFilterSource={metricFilterSource}
                  disabled={!parsed}
                />
              </CardContent>
            </Card>

            <ConfigStatusPanel
              configValidation={configValidation}
              configError={configError}
              coverage={coverage}
              analysis={analysis}
            />
            <SummaryPanel analysis={analysis} stat2Summary={stat2Summary} />
            <GrrChartExportPanel
              group={group}
              metrics={metrics}
              settings={chartExport.settings}
              enabledCount={chartExport.enabledMetrics.length}
              outboxDir={chartExport.outboxDir}
              status={chartExport.status}
              busy={chartExport.busy}
              disabled={!parsed || !analysis}
              onExportCurrent={() => void chartExport.exportCurrent()}
              onExportSelected={() => void chartExport.exportSelected()}
              onToggleMetric={chartExport.toggleMetricEnabled}
              onSelectAll={chartExport.selectAllMetrics}
              onClearAll={chartExport.clearAllMetrics}
              onAutoSaveCurrentChange={chartExport.setAutoSaveCurrent}
              onAutoSaveOnLoadChange={chartExport.setAutoSaveOnLoad}
            />
          </aside>

          {/* 결과 표시 영역 */}
          <section className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <GaiaGrrChart
                analysis={analysis}
                stat2Summary={stat2Summary}
                goldenSocket={goldenSocket}
                exportRootRef={grrChartExportRef}
              />
              {testerSidebarEntries.length > 0 && (
                <GrrTesterSidebar
                  entries={testerSidebarEntries}
                  onSelectTester={setReferenceSocket}
                  onOpenSummary={handleOpenGrrSummary}
                  disabled={!parsed}
                />
              )}
            </div>
            <GrrSummaryDialog
              report={grrSummaryData}
              open={grrSummaryOpen}
              onClose={handleCloseGrrSummary}
            />
            {goldenAnalysis && (
              <GoldenDeltaChart
                rows={goldenAnalysis.rows}
                goldenDeltaLimit={goldenDeltaLimit}
                goldenSocket={goldenSocket}
              />
            )}
            {goldenAnalysis && goldenSocket && (
              <GoldenSocketResultsTable
                rows={goldenAnalysis.rows}
                filter={goldenFilter}
                onFilterChange={setGoldenFilter}
                goldenDeltaLimit={goldenDeltaLimit}
                analysis={analysis}
                referenceSocket={referenceSocket}
                stat2Summary={stat2Summary}
              />
            )}
            {group === "Ranging" && <RangingChart analysis={analysis} />}
          </section>
        </div>
      </main>
    </div>
  );
}
