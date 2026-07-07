"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  buildBoxPlotData,
  buildCategoryData,
  buildHeatmapData,
  buildHistogramData,
  buildParetoData,
  buildPointsPlotData,
  buildScatterLineData,
  canRenderChart,
  columnHasNumericValues,
  filterRows,
  pickGraphTypeForColumns,
  uniqueCategoryValues,
} from "@/lib/mini-jmp-chart-data";
import { importConfigFile, saveConfig } from "@/lib/mini-jmp-config";
import { parseMiniJmpExcel } from "@/lib/mini-jmp-excel-parser";
import { parseMiniJmpCsv, columnByName } from "@/lib/mini-jmp-parser";
import { MINI_JMP_PRESETS } from "@/lib/mini-jmp-presets";
import { computeCategoryFrequencies, computeFitYByX } from "@/lib/mini-jmp-fit";
import { computeSummaryStats } from "@/lib/mini-jmp-stats";
import type {
  MiniJmpAggregation,
  MiniJmpAxisSettings,
  MiniJmpChartAxisConfig,
  MiniJmpChartOptions,
  MiniJmpDataset,
  MiniJmpFilter,
  MiniJmpFilterOperator,
  MiniJmpGraphType,
  MiniJmpSavedConfig,
} from "@/lib/mini-jmp-types";
import { DEFAULT_MINI_JMP_AXIS_CONFIG } from "@/lib/mini-jmp-types";

const DEFAULT_OPTIONS: MiniJmpChartOptions = {
  showGrid: true,
  showDataLabels: false,
  showTrendLine: false,
  pointAlpha: 1,
  jitter: 0.45,
};

interface MiniJmpSnapshot {
  xColumn: string | null;
  yColumn: string | null;
  colorColumn: string | null;
  groupColumn: string | null;
  sizeColumn: string | null;
  labelColumn: string | null;
  graphType: MiniJmpGraphType;
  aggregation: MiniJmpAggregation;
  options: MiniJmpChartOptions;
  axisConfig: MiniJmpChartAxisConfig;
  filters: MiniJmpFilter[];
}

function snapshotState(s: MiniJmpSnapshot): MiniJmpSnapshot {
  return {
    ...s,
    options: { ...s.options },
    axisConfig: {
      x: { ...s.axisConfig.x, guideLines: [...s.axisConfig.x.guideLines] },
      y: { ...s.axisConfig.y, guideLines: [...s.axisConfig.y.guideLines] },
    },
    filters: [...s.filters],
  };
}

function resolveColumn(
  columns: MiniJmpDataset["columns"],
  name: string | null
): string | null {
  if (!name) return null;
  return columns.some((c) => c.name === name) ? name : null;
}

export function useMiniJmp() {
  const [dataset, setDataset] = useState<MiniJmpDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [columnSearch, setColumnSearch] = useState("");
  const [previewSearch, setPreviewSearch] = useState("");

  const [xColumn, setXColumn] = useState<string | null>(null);
  const [yColumn, setYColumn] = useState<string | null>(null);
  const [colorColumn, setColorColumn] = useState<string | null>(null);
  const [groupColumn, setGroupColumn] = useState<string | null>(null);
  const [sizeColumn, setSizeColumn] = useState<string | null>(null);
  const [labelColumn, setLabelColumn] = useState<string | null>(null);

  const [graphType, setGraphType] = useState<MiniJmpGraphType>("scatter");
  const [aggregation, setAggregation] = useState<MiniJmpAggregation>("average");
  const [options, setOptions] = useState<MiniJmpChartOptions>(DEFAULT_OPTIONS);
  const [axisConfig, setAxisConfig] = useState<MiniJmpChartAxisConfig>(
    DEFAULT_MINI_JMP_AXIS_CONFIG
  );
  const [filters, setFilters] = useState<MiniJmpFilter[]>([]);
  const [filterDraft, setFilterDraft] = useState<{
    column: string;
    operator: MiniJmpFilterOperator;
    value: string;
    value2: string;
  }>({ column: "", operator: "equals", value: "", value2: "" });
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [distributionColumn, setDistributionColumn] = useState<string | null>(null);

  const historyRef = useRef<MiniJmpSnapshot[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

  const currentSnapshot = useCallback(
    (): MiniJmpSnapshot => ({
      xColumn,
      yColumn,
      colorColumn,
      groupColumn,
      sizeColumn,
      labelColumn,
      graphType,
      aggregation,
      options,
      axisConfig,
      filters,
    }),
    [
      xColumn,
      yColumn,
      colorColumn,
      groupColumn,
      sizeColumn,
      labelColumn,
      graphType,
      aggregation,
      options,
      axisConfig,
      filters,
    ]
  );

  const pushHistory = useCallback(() => {
    historyRef.current = [
      snapshotState(currentSnapshot()),
      ...historyRef.current,
    ].slice(0, 30);
    setHistoryVersion((v) => v + 1);
  }, [currentSnapshot]);

  const applySnapshot = useCallback((s: MiniJmpSnapshot) => {
    setXColumn(s.xColumn);
    setYColumn(s.yColumn);
    setColorColumn(s.colorColumn);
    setGroupColumn(s.groupColumn);
    setSizeColumn(s.sizeColumn);
    setLabelColumn(s.labelColumn);
    setGraphType(s.graphType);
    setAggregation(s.aggregation);
    setOptions(s.options);
    setAxisConfig(s.axisConfig);
    setFilters(s.filters);
  }, []);

  const loadDataset = useCallback((parsed: MiniJmpDataset) => {
    setDataset(parsed);
    setError(null);
    setXColumn(null);
    setYColumn(null);
    setColorColumn(null);
    setGroupColumn(null);
    setSizeColumn(null);
    setLabelColumn(null);
    setFilters([]);
      setFilterDraft({ column: "", operator: "equals", value: "", value2: "" });
      setSelectedRowIndex(null);
      setDistributionColumn(null);
    setGraphType("scatter");
    setAxisConfig(DEFAULT_MINI_JMP_AXIS_CONFIG);
    setOptions(DEFAULT_OPTIONS);
    historyRef.current = [];
  }, []);

  const loadCsvText = useCallback(
    (text: string, fileName: string) => {
      try {
        loadDataset(parseMiniJmpCsv(text, fileName));
      } catch (e) {
        setError(e instanceof Error ? e.message : "CSV 파싱 실패");
        setDataset(null);
      }
    },
    [loadDataset]
  );

  const loadFile = useCallback(
    async (file: File) => {
      try {
        const lower = file.name.toLowerCase();
        if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
          const buf = await file.arrayBuffer();
          loadDataset(await parseMiniJmpExcel(buf, file.name));
        } else {
          loadDataset(parseMiniJmpCsv(await file.text(), file.name));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "파일 파싱 실패");
        setDataset(null);
      }
    },
    [loadDataset]
  );

  const assignColumn = useCallback(
    (zone: "x" | "y" | "color" | "group" | "size" | "label", name: string) => {
      pushHistory();
      if (zone === "x") setXColumn(name);
      if (zone === "y") setYColumn(name);
      if (zone === "color") setColorColumn(name);
      if (zone === "group") setGroupColumn(name);
      if (zone === "size") setSizeColumn(name);
      if (zone === "label") setLabelColumn(name);

      if (!dataset || (zone !== "x" && zone !== "y")) return;

      const nextX = zone === "x" ? name : xColumn;
      const nextY = zone === "y" ? name : yColumn;

      if (nextX && nextY) {
        setGraphType((prev) =>
          pickGraphTypeForColumns({
            columns: dataset.columns,
            rows: dataset.rows,
            xColumn: nextX,
            yColumn: nextY,
            preferred: prev === "line" ? "scatter" : prev,
          })
        );
      } else if (nextX && !nextY) {
        setGraphType("scatter");
      } else if (nextY && !nextX) {
        const yUsable = columnHasNumericValues(dataset.rows, nextY);
        if (yUsable) setGraphType("histogram");
      }
    },
    [dataset, xColumn, yColumn, pushHistory]
  );

  const clearZone = useCallback(
    (zone: "x" | "y" | "color" | "group" | "size" | "label") => {
      pushHistory();
      if (zone === "x") setXColumn(null);
      if (zone === "y") setYColumn(null);
      if (zone === "color") setColorColumn(null);
      if (zone === "group") setGroupColumn(null);
      if (zone === "size") setSizeColumn(null);
      if (zone === "label") setLabelColumn(null);
    },
    [pushHistory]
  );

  type DropZone = "x" | "y" | "color" | "group" | "size" | "label";

  const applyAxisGraphType = useCallback(
    (nx: string | null, ny: string | null, prev: MiniJmpGraphType) => {
      if (!dataset) return prev;
      if (nx && ny) {
        return pickGraphTypeForColumns({
          columns: dataset.columns,
          rows: dataset.rows,
          xColumn: nx,
          yColumn: ny,
          preferred: prev === "line" ? "scatter" : prev,
        });
      }
      if (nx && !ny) return "scatter";
      if (ny && !nx && columnHasNumericValues(dataset.rows, ny)) {
        return "histogram";
      }
      return prev;
    },
    [dataset]
  );

  const moveZone = useCallback(
    (from: DropZone, to: DropZone) => {
      if (from === to) return;
      pushHistory();

      const snap: Record<DropZone, string | null> = {
        x: xColumn,
        y: yColumn,
        color: colorColumn,
        group: groupColumn,
        size: sizeColumn,
        label: labelColumn,
      };

      const fromVal = snap[from];
      if (!fromVal) return;

      const toVal = snap[to];
      snap[from] = toVal;
      snap[to] = fromVal;

      setXColumn(snap.x);
      setYColumn(snap.y);
      setColorColumn(snap.color);
      setGroupColumn(snap.group);
      setSizeColumn(snap.size);
      setLabelColumn(snap.label);

      if (from === "x" || from === "y" || to === "x" || to === "y") {
        setGraphType((prev) => applyAxisGraphType(snap.x, snap.y, prev));
      }
    },
    [
      xColumn,
      yColumn,
      colorColumn,
      groupColumn,
      sizeColumn,
      labelColumn,
      applyAxisGraphType,
      pushHistory,
    ]
  );

  const swapXY = useCallback(() => {
    moveZone("x", "y");
  }, [moveZone]);

  const addFilter = useCallback(() => {
    if (!filterDraft.column || !filterDraft.value) return;
    if (filterDraft.operator === "between" && !filterDraft.value2.trim()) return;
    pushHistory();
    setFilters((prev) => {
      const next: MiniJmpFilter = {
        column: filterDraft.column,
        operator: filterDraft.operator,
        value: filterDraft.value,
        ...(filterDraft.operator === "between"
          ? { value2: filterDraft.value2 }
          : {}),
      };
      const dup = prev.some(
        (f) =>
          f.column === next.column &&
          f.operator === next.operator &&
          f.value === next.value &&
          f.value2 === next.value2
      );
      if (dup) return prev;
      return [...prev, next];
    });
  }, [filterDraft, pushHistory]);

  const removeFilter = useCallback(
    (index: number) => {
      pushHistory();
      setFilters((prev) => prev.filter((_, i) => i !== index));
    },
    [pushHistory]
  );

  const clearFilters = useCallback(() => {
    pushHistory();
    setFilters([]);
  }, [pushHistory]);

  const undo = useCallback(() => {
    const prev = historyRef.current.shift();
    if (prev) applySnapshot(prev);
    setHistoryVersion((v) => v + 1);
  }, [applySnapshot]);

  const resetGraph = useCallback(() => {
    pushHistory();
    setXColumn(null);
    setYColumn(null);
    setColorColumn(null);
    setGroupColumn(null);
    setSizeColumn(null);
    setLabelColumn(null);
    setGraphType("scatter");
    setAggregation("average");
    setOptions(DEFAULT_OPTIONS);
    setAxisConfig(DEFAULT_MINI_JMP_AXIS_CONFIG);
    setFilters([]);
  }, [pushHistory]);

  const applyConfig = useCallback(
    (config: MiniJmpSavedConfig) => {
      if (!dataset) return;
      pushHistory();
      setGraphType(config.graphType);
      setXColumn(resolveColumn(dataset.columns, config.xColumn));
      setYColumn(resolveColumn(dataset.columns, config.yColumn));
      setColorColumn(resolveColumn(dataset.columns, config.colorColumn));
      setGroupColumn(resolveColumn(dataset.columns, config.groupColumn));
      setSizeColumn(resolveColumn(dataset.columns, config.sizeColumn));
      setLabelColumn(resolveColumn(dataset.columns, config.labelColumn));
      setAggregation(config.aggregation);
      setOptions(config.options);
      setAxisConfig(config.axisConfig);
      setFilters(
        config.filters
          .filter((f) => dataset.columns.some((c) => c.name === f.column))
          .map((f) => ({
            column: f.column,
            operator: f.operator ?? "equals",
            value: f.value,
            value2: f.value2,
          }))
      );
    },
    [dataset, pushHistory]
  );

  const applyPreset = useCallback(
    (name: string) => {
      const preset = MINI_JMP_PRESETS.find((p) => p.name === name);
      if (preset) applyConfig(preset);
    },
    [applyConfig]
  );

  const buildCurrentConfig = useCallback(
    (name: string): MiniJmpSavedConfig => ({
      version: 1,
      name,
      graphType,
      xColumn,
      yColumn,
      colorColumn,
      groupColumn,
      sizeColumn,
      labelColumn,
      aggregation,
      options,
      axisConfig,
      filters,
    }),
    [
      graphType,
      xColumn,
      yColumn,
      colorColumn,
      groupColumn,
      sizeColumn,
      labelColumn,
      aggregation,
      options,
      axisConfig,
      filters,
    ]
  );

  const saveCurrentConfig = useCallback(
    (name: string) => {
      saveConfig(buildCurrentConfig(name));
    },
    [buildCurrentConfig]
  );

  const importConfigFromFile = useCallback(
    async (file: File) => {
      const config = await importConfigFile(file);
      applyConfig(config);
    },
    [applyConfig]
  );

  const setGraphTypeWithHistory = useCallback(
    (t: MiniJmpGraphType) => {
      pushHistory();
      setGraphType(t);
    },
    [pushHistory]
  );

  const filteredColumns = useMemo(() => {
    if (!dataset) return [];
    const q = columnSearch.trim().toLowerCase();
    if (!q) return dataset.columns;
    return dataset.columns.filter((c) => c.name.toLowerCase().includes(q));
  }, [dataset, columnSearch]);

  const filteredRows = useMemo(() => {
    if (!dataset) return [];
    return filterRows(dataset.rows, filters);
  }, [dataset, filters]);

  const renderState = useMemo(() => {
    if (!dataset) return { ok: false, message: "CSV/Excel을 업로드하세요." };
    return canRenderChart({
      graphType,
      columns: dataset.columns,
      rows: dataset.rows,
      xColumn,
      yColumn,
    });
  }, [dataset, graphType, xColumn, yColumn]);

  const zoneExtras = {
    colorColumn,
    groupColumn,
    labelColumn,
    sizeColumn,
  };

  const chartModel = useMemo(() => {
    if (!dataset || !renderState.ok) return null;

    const xCol = columnByName(dataset.columns, xColumn);
    const yCol = columnByName(dataset.columns, yColumn);
    const rows = filteredRows;

    if (graphType === "histogram") {
      const col = yColumn ?? xColumn;
      if (!col) return null;
      return {
        type: "histogram" as const,
        histogram: buildHistogramData({ rows, column: col, filters: [] }),
        column: col,
      };
    }

    if (graphType === "pareto") {
      const col = xColumn ?? yColumn;
      if (!col) return null;
      return {
        type: "pareto" as const,
        points: buildParetoData({ rows, column: col, filters: [] }),
        column: col,
      };
    }

    if (graphType === "heatmap" && xCol && yCol) {
      const heat = buildHeatmapData({
        rows,
        xColumn: xCol.name,
        yColumn: yCol.name,
        aggregation: "count",
        filters: [],
      });
      return {
        type: "heatmap" as const,
        ...heat,
        xLabel: xCol.name,
        yLabel: yCol.name,
      };
    }

    if (graphType === "scatter" && xCol) {
      const plot = buildPointsPlotData({
        rows,
        xColumn: xCol.name,
        yColumn: yColumn,
        ...zoneExtras,
        xCol,
        yCol: yCol ?? null,
      });
      return {
        type: "scatter" as const,
        mode: plot.mode,
        points: plot.points,
        xCategories: plot.xCategories,
        yCategories: plot.yCategories,
        pointTotal: plot.pointTotal,
        xCol,
        yCol: yCol ?? xCol,
        xLabel: xCol.name,
        yLabel: yColumn ?? "Y",
      };
    }

    if (!xCol || !yCol) return null;

    if (graphType === "bar") {
      return {
        type: "bar" as const,
        categories: buildCategoryData({
          rows,
          xColumn: xCol.name,
          yColumn: yCol.name,
          aggregation,
          filters: [],
        }),
        xLabel: xCol.name,
        yLabel: yCol.name,
      };
    }

    if (graphType === "box") {
      return {
        type: "box" as const,
        boxes: buildBoxPlotData({
          rows,
          xColumn: xCol.name,
          yColumn: yCol.name,
          filters: [],
        }),
        xLabel: xCol.name,
        yLabel: yCol.name,
      };
    }

    const lineResult = buildScatterLineData({
      rows,
      xColumn: xCol.name,
      yColumn: yCol.name,
      colorColumn,
      groupColumn,
      labelColumn,
      sizeColumn,
      xCol,
      yCol,
    });

    return {
      type: graphType === "line" ? ("line" as const) : ("scatter" as const),
      mode: "numeric" as const,
      points: lineResult.points,
      pointTotal: lineResult.total,
      xCategories: [] as string[],
      yCategories: [] as string[],
      xCol,
      yCol,
      xLabel: xCol.name,
      yLabel: yCol.name,
    };
  }, [
    dataset,
    filteredRows,
    renderState.ok,
    graphType,
    xColumn,
    yColumn,
    colorColumn,
    groupColumn,
    labelColumn,
    sizeColumn,
    aggregation,
  ]);

  const summaryStats = useMemo(() => {
    if (!dataset) return null;
    const col = yColumn ?? xColumn;
    if (!col) return null;
    const yCol = columnByName(dataset.columns, col);
    if (!yCol || !columnHasNumericValues(dataset.rows, col)) return null;
    return computeSummaryStats(filteredRows, col);
  }, [dataset, yColumn, xColumn, filteredRows]);

  const fitStats = useMemo(() => {
    if (!chartModel) return null;
    if (chartModel.type !== "scatter" && chartModel.type !== "line") return null;
    if (chartModel.mode !== "numeric") return null;
    return computeFitYByX(chartModel.points);
  }, [chartModel]);

  const distributionIsNumeric = useMemo(() => {
    if (!dataset || !distributionColumn) return false;
    return columnHasNumericValues(dataset.rows, distributionColumn);
  }, [dataset, distributionColumn]);

  const distributionStats = useMemo(() => {
    if (!distributionColumn || !distributionIsNumeric) return null;
    return computeSummaryStats(filteredRows, distributionColumn);
  }, [distributionColumn, distributionIsNumeric, filteredRows]);

  const distributionFreq = useMemo(() => {
    if (!distributionColumn || distributionIsNumeric) return null;
    return computeCategoryFrequencies(filteredRows, distributionColumn);
  }, [distributionColumn, distributionIsNumeric, filteredRows]);

  const previewRows = useMemo(() => {
    if (!dataset) return [];
    const q = previewSearch.trim().toLowerCase();
    const indexed = filteredRows.map((row, sourceIndex) => ({ row, sourceIndex }));
    const list = q
      ? indexed.filter(({ row }) =>
          Object.values(row).some((v) => v.toLowerCase().includes(q))
        )
      : indexed;
    return list.slice(0, 1000);
  }, [dataset, previewSearch, filteredRows]);

  const filterValueOptions = useMemo(() => {
    if (!dataset || !filterDraft.column) return [];
    return uniqueCategoryValues(dataset.rows, filterDraft.column, 100);
  }, [dataset, filterDraft.column]);

  const setOption = useCallback(
    <K extends keyof MiniJmpChartOptions>(key: K, value: MiniJmpChartOptions[K]) => {
      setOptions((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const setAxisSettings = useCallback(
    (axis: "x" | "y", settings: MiniJmpAxisSettings) => {
      setAxisConfig((prev) => ({ ...prev, [axis]: settings }));
    },
    []
  );

  const canUndo = useMemo(
    () => historyRef.current.length > 0,
    [historyVersion]
  );

  return {
    dataset,
    error,
    columnSearch,
    setColumnSearch,
    previewSearch,
    setPreviewSearch,
    filteredColumns,
    xColumn,
    yColumn,
    colorColumn,
    groupColumn,
    sizeColumn,
    labelColumn,
    graphType,
    setGraphType: setGraphTypeWithHistory,
    aggregation,
    setAggregation,
    options,
    setOption,
    axisConfig,
    setAxisSettings,
    filters,
    filterDraft,
    setFilterDraft,
    filterValueOptions,
    addFilter,
    removeFilter,
    clearFilters,
    loadCsvText,
    loadFile,
    assignColumn,
    clearZone,
    moveZone,
    swapXY,
    undo,
    resetGraph,
    canUndo,
    applyPreset,
    saveCurrentConfig,
    importConfigFromFile,
    buildCurrentConfig,
    renderState,
    chartModel,
    summaryStats,
    previewRows,
    presets: MINI_JMP_PRESETS,
    selectedRowIndex,
    setSelectedRowIndex,
    distributionColumn,
    setDistributionColumn,
    distributionStats,
    distributionFreq,
    distributionIsNumeric,
    fitStats,
    filteredRows,
  };
}
