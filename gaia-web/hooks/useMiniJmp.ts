"use client";

import { useCallback, useMemo, useState } from "react";
import {
  buildBoxPlotData,
  buildCategoryData,
  buildHistogramData,
  buildPointsPlotData,
  buildScatterLineData,
  canRenderChart,
  columnHasNumericValues,
  pickGraphTypeForColumns,
  uniqueCategoryValues,
} from "@/lib/mini-jmp-chart-data";
import { parseMiniJmpCsv, columnByName } from "@/lib/mini-jmp-parser";
import { computeSummaryStats } from "@/lib/mini-jmp-stats";
import type {
  MiniJmpAggregation,
  MiniJmpChartOptions,
  MiniJmpDataset,
  MiniJmpFilter,
  MiniJmpGraphType,
} from "@/lib/mini-jmp-types";

const DEFAULT_OPTIONS: MiniJmpChartOptions = {
  showGrid: true,
  showDataLabels: false,
  showTrendLine: false,
  pointAlpha: 1,
  jitter: 0.45,
};

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
  const [filters, setFilters] = useState<MiniJmpFilter[]>([]);
  const [filterDraft, setFilterDraft] = useState<{
    column: string;
    value: string;
  }>({ column: "", value: "" });

  const loadCsvText = useCallback((text: string, fileName: string) => {
    try {
      const parsed = parseMiniJmpCsv(text, fileName);
      setDataset(parsed);
      setError(null);
      setXColumn(null);
      setYColumn(null);
      setColorColumn(null);
      setGroupColumn(null);
      setSizeColumn(null);
      setLabelColumn(null);
      setFilters([]);
      setFilterDraft({ column: "", value: "" });
      setGraphType("scatter");
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV 파싱 실패");
      setDataset(null);
    }
  }, []);

  const assignColumn = useCallback(
    (zone: "x" | "y" | "color" | "group" | "size" | "label", name: string) => {
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
    [dataset, xColumn, yColumn]
  );

  const clearZone = useCallback(
    (zone: "x" | "y" | "color" | "group" | "size" | "label") => {
      if (zone === "x") setXColumn(null);
      if (zone === "y") setYColumn(null);
      if (zone === "color") setColorColumn(null);
      if (zone === "group") setGroupColumn(null);
      if (zone === "size") setSizeColumn(null);
      if (zone === "label") setLabelColumn(null);
    },
    []
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
    ]
  );

  const swapXY = useCallback(() => {
    moveZone("x", "y");
  }, [moveZone]);

  const addFilter = useCallback(() => {
    if (!filterDraft.column || !filterDraft.value) return;
    setFilters((prev) => {
      const next = prev.filter(
        (f) =>
          !(f.column === filterDraft.column && f.value === filterDraft.value)
      );
      return [...next, { column: filterDraft.column, value: filterDraft.value }];
    });
  }, [filterDraft]);

  const removeFilter = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFilters = useCallback(() => setFilters([]), []);

  const filteredColumns = useMemo(() => {
    if (!dataset) return [];
    const q = columnSearch.trim().toLowerCase();
    if (!q) return dataset.columns;
    return dataset.columns.filter((c) => c.name.toLowerCase().includes(q));
  }, [dataset, columnSearch]);

  const renderState = useMemo(() => {
    if (!dataset) return { ok: false, message: "CSV를 업로드하세요." };
    return canRenderChart({
      graphType,
      columns: dataset.columns,
      rows: dataset.rows,
      xColumn,
      yColumn,
    });
  }, [dataset, graphType, xColumn, yColumn]);

  const chartModel = useMemo(() => {
    if (!dataset || !renderState.ok) return null;

    const xCol = columnByName(dataset.columns, xColumn);
    const yCol = columnByName(dataset.columns, yColumn);
    const rows = dataset.rows;

    if (graphType === "histogram") {
      const col = yColumn ?? xColumn;
      if (!col) return null;
      return {
        type: "histogram" as const,
        histogram: buildHistogramData({ rows, column: col, filters }),
        column: col,
      };
    }

    if (graphType === "scatter" && xCol) {
      const plot = buildPointsPlotData({
        rows,
        xColumn: xCol.name,
        yColumn: yColumn,
        colorColumn,
        xCol,
        yCol: yCol ?? null,
        filters,
        jitter: options.jitter,
      });
      return {
        type: "scatter" as const,
        mode: plot.mode,
        points: plot.points,
        xCategories: plot.xCategories,
        yCategories: plot.yCategories,
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
          filters,
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
          filters,
        }),
        xLabel: xCol.name,
        yLabel: yCol.name,
      };
    }

    const points = buildScatterLineData({
      rows,
      xColumn: xCol.name,
      yColumn: yCol.name,
      colorColumn,
      xCol,
      yCol,
      filters,
    });

    return {
      type: graphType === "line" ? ("line" as const) : ("scatter" as const),
      mode: "numeric" as const,
      points,
      xCategories: [] as string[],
      yCategories: [] as string[],
      xCol,
      yCol,
      xLabel: xCol.name,
      yLabel: yCol.name,
    };
  }, [
    dataset,
    renderState.ok,
    graphType,
    xColumn,
    yColumn,
    colorColumn,
    aggregation,
    filters,
    options.jitter,
  ]);

  const summaryStats = useMemo(() => {
    if (!dataset) return null;
    const col = yColumn ?? xColumn;
    if (!col) return null;
    const yCol = columnByName(dataset.columns, col);
    if (!yCol || !columnHasNumericValues(dataset.rows, col)) return null;

    let rows = dataset.rows;
    if (filters.length > 0) {
      rows = rows.filter((row) =>
        filters.every((f) => (row[f.column] ?? "").trim() === f.value)
      );
    }
    return computeSummaryStats(rows, col);
  }, [dataset, yColumn, xColumn, filters]);

  const previewRows = useMemo(() => {
    if (!dataset) return [];
    const q = previewSearch.trim().toLowerCase();
    let rows = dataset.rows;
    if (filters.length > 0) {
      rows = rows.filter((row) =>
        filters.every((f) => (row[f.column] ?? "").trim() === f.value)
      );
    }
    if (!q) return rows.slice(0, 100);
    return rows
      .filter((row) =>
        Object.values(row).some((v) => v.toLowerCase().includes(q))
      )
      .slice(0, 100);
  }, [dataset, previewSearch, filters]);

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
    setGraphType,
    aggregation,
    setAggregation,
    options,
    setOption,
    filters,
    filterDraft,
    setFilterDraft,
    filterValueOptions,
    addFilter,
    removeFilter,
    clearFilters,
    loadCsvText,
    assignColumn,
    clearZone,
    moveZone,
    swapXY,
    renderState,
    chartModel,
    summaryStats,
    previewRows,
  };
}
