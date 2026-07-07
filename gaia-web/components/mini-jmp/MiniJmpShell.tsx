"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
import { FilePickButton } from "@/components/controls/FilePickButton";
import { ColumnListPanel } from "@/components/mini-jmp/ColumnListPanel";
import { DataPreviewTable } from "@/components/mini-jmp/DataPreviewTable";
import { DistributionPanel } from "@/components/mini-jmp/DistributionPanel";
import { FitYByXPanel } from "@/components/mini-jmp/FitYByXPanel";
import { DropZonePanel } from "@/components/mini-jmp/DropZonePanel";
import { GraphBuilderCanvas } from "@/components/mini-jmp/GraphBuilderCanvas";
import { GraphToolbar } from "@/components/mini-jmp/GraphToolbar";
import { OptionPanel } from "@/components/mini-jmp/OptionPanel";
import { SummaryStatsPanel } from "@/components/mini-jmp/SummaryStatsPanel";
import { useMiniJmp } from "@/hooks/useMiniJmp";
import { exportMiniJmpChartPng, exportFilteredCsv } from "@/lib/mini-jmp-export";

export function MiniJmpShell() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const jmp = useMiniJmp();

  const handleFile = async (file: File) => {
    await jmp.loadFile(file);
  };

  const handleSaveConfig = () => {
    const name = window.prompt("저장할 View 이름", "My View");
    if (!name?.trim()) return;
    jmp.saveCurrentConfig(name.trim());
  };

  const handleExport = async () => {
    if (!chartRef.current || !jmp.dataset) return;
    setExportBusy(true);
    setExportMsg(null);
    try {
      const name = await exportMiniJmpChartPng(
        chartRef.current,
        jmp.dataset.fileName
      );
      setExportMsg(`Saved: ${name}`);
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">mini-JMP</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Graph Builder · CSV → X/Y → Chart
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FilePickButton
                variant="secondary"
                className="bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onPick={handleFile}
              >
                <Upload className="h-4 w-4" />
                Upload CSV / Excel
              </FilePickButton>
              {jmp.dataset && (
                <span className="self-center text-xs font-mono text-slate-400">
                  {jmp.dataset.fileName} · {jmp.dataset.rows.length.toLocaleString()} rows
                </span>
              )}
            </div>
          </div>
          <AppNav />
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 space-y-4">
        {jmp.error && (
          <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {jmp.error}
          </div>
        )}

        {!jmp.dataset ? (
          <div className="rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/50 py-24 text-center">
            <p className="text-lg text-slate-300">CSV 또는 Excel 파일을 업로드하세요</p>
            <p className="text-sm text-slate-500 mt-2">
              첫 번째 행을 Header로 인식합니다 · TestTime, StartTime, TesterID 등
            </p>
            <div className="mt-6">
              <FilePickButton accept=".csv,.xlsx,.xls" onPick={handleFile}>
                <Upload className="h-4 w-4" />
                Upload CSV / Excel
              </FilePickButton>
            </div>
          </div>
        ) : (
          <>
            <GraphToolbar
              graphType={jmp.graphType}
              onGraphTypeChange={jmp.setGraphType}
              onSwapXY={jmp.swapXY}
              canSwapXY={Boolean(jmp.xColumn || jmp.yColumn)}
              onUndo={jmp.undo}
              canUndo={jmp.canUndo}
              onReset={jmp.resetGraph}
              presets={jmp.presets}
              onApplyPreset={jmp.applyPreset}
              onSaveConfig={handleSaveConfig}
              onImportConfig={jmp.importConfigFromFile}
              onExportCsv={() => {
                if (!jmp.dataset) return;
                exportFilteredCsv(
                  jmp.filteredRows,
                  jmp.dataset.headers,
                  jmp.dataset.fileName
                );
              }}
              onExport={() => void handleExport()}
              exportBusy={exportBusy}
              canExport={jmp.renderState.ok}
            />
            {exportMsg && (
              <p className="text-xs font-mono text-slate-400">{exportMsg}</p>
            )}

            <div className="grid gap-4 lg:grid-cols-[240px_1fr_260px] h-[min(560px,calc(100vh-280px))] min-h-[420px] items-stretch overflow-hidden">
              <ColumnListPanel
                columns={jmp.filteredColumns}
                search={jmp.columnSearch}
                onSearchChange={jmp.setColumnSearch}
                xColumn={jmp.xColumn}
                yColumn={jmp.yColumn}
                colorColumn={jmp.colorColumn}
                onDragStart={() => {}}
                onAssign={jmp.assignColumn}
              />

              <div className="flex flex-col gap-3 min-w-0 min-h-0 h-full overflow-hidden">
                <DropZonePanel
                  xColumn={jmp.xColumn}
                  yColumn={jmp.yColumn}
                  colorColumn={jmp.colorColumn}
                  groupColumn={jmp.groupColumn}
                  sizeColumn={jmp.sizeColumn}
                  labelColumn={jmp.labelColumn}
                  onDrop={jmp.assignColumn}
                  onClear={jmp.clearZone}
                  onMoveZone={jmp.moveZone}
                  onSwapXY={jmp.swapXY}
                />
                <div className="flex-1 min-h-0">
                  <GraphBuilderCanvas
                    chartRef={chartRef}
                    chartModel={jmp.chartModel}
                    renderOk={jmp.renderState.ok}
                    renderMessage={jmp.renderState.message}
                    graphType={jmp.graphType}
                    options={jmp.options}
                    axisConfig={jmp.axisConfig}
                    onAxisSettingsChange={jmp.setAxisSettings}
                    xColumn={jmp.xColumn}
                    yColumn={jmp.yColumn}
                    colorColumn={jmp.colorColumn}
                    groupColumn={jmp.groupColumn}
                    labelColumn={jmp.labelColumn}
                    selectedRowIndex={jmp.selectedRowIndex}
                    onRowSelect={jmp.setSelectedRowIndex}
                  />
                </div>
              </div>

              <OptionPanel
                graphType={jmp.graphType}
                onGraphTypeChange={jmp.setGraphType}
                xColumn={jmp.xColumn}
                yColumn={jmp.yColumn}
                colorColumn={jmp.colorColumn}
                groupColumn={jmp.groupColumn}
                columns={jmp.dataset.columns}
                aggregation={jmp.aggregation}
                onAggregationChange={jmp.setAggregation}
                options={jmp.options}
                onOptionChange={jmp.setOption}
                onAssign={jmp.assignColumn}
                onClear={jmp.clearZone}
                filterDraft={jmp.filterDraft}
                onFilterDraftChange={jmp.setFilterDraft}
                filterValueOptions={jmp.filterValueOptions}
                filters={jmp.filters}
                onAddFilter={jmp.addFilter}
                onRemoveFilter={jmp.removeFilter}
                onClearFilters={jmp.clearFilters}
              />
            </div>

            <FitYByXPanel
              xLabel={jmp.xColumn ?? "X"}
              yLabel={jmp.yColumn ?? "Y"}
              stats={jmp.fitStats}
              visible={
                jmp.graphType === "scatter" &&
                jmp.chartModel != null &&
                "mode" in jmp.chartModel &&
                jmp.chartModel.mode === "numeric"
              }
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <SummaryStatsPanel
                column={jmp.yColumn ?? jmp.xColumn}
                stats={jmp.summaryStats}
              />
              <DistributionPanel
                columns={jmp.dataset.columns}
                column={jmp.distributionColumn}
                onColumnChange={jmp.setDistributionColumn}
                numericStats={jmp.distributionStats}
                categoryFreq={jmp.distributionFreq}
                isNumeric={jmp.distributionIsNumeric}
              />
            </div>

            <DataPreviewTable
              headers={jmp.dataset.headers}
              rows={jmp.previewRows}
              search={jmp.previewSearch}
              onSearchChange={jmp.setPreviewSearch}
              xColumn={jmp.xColumn}
              yColumn={jmp.yColumn}
              totalRows={jmp.filteredRows.length}
              selectedRowIndex={jmp.selectedRowIndex}
              onRowSelect={jmp.setSelectedRowIndex}
            />
          </>
        )}
      </main>
    </div>
  );
}
