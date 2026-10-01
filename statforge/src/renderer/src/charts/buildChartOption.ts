import type { EChartsOption } from "echarts";
import type {
  CellValue,
  ColumnMeta,
  Dataset,
  GraphConfig,
  GraphLayerKind,
} from "@shared/schemas/types";
import { ensureGraphConfig } from "@shared/schemas/types";
import { SCATTER_SAMPLE_LIMIT } from "@shared/constants/app";
import { isLimitMetadataLabel } from "../data/limitMetadata";
import { createColorScale, resolveColor, DISCRETE_PALETTE, colorCategoryKey, resolveDiscreteColor } from "./encoding/colorScale";
import { createIntervalValues } from "./encoding/interval";
import { createOverlayGroups, type GraphIssue } from "./encoding/overlay";
import { createSizeScale, resolveSize } from "./encoding/sizeScale";
import { buildFitCurve, buildFitConfidenceBand, fitCategoryMeans, fitPolynomial } from "./stats/regression";
import { buildSmoother } from "./stats/smoother";
import {
  buildAggregatedLinePoints,
} from "./stats/lineAggregate";
import {
  buildPointsWithSummary,
  computeJitterOffsets,
  pointsSummaryUsesRawYScale,
} from "./stats/pointsAggregate";
import { shouldUseContinuousAxis } from "./buildScatterOption";
import { naturalSortStrings } from "@renderer/utils/naturalSort";
import { buildAxisOptions, effectiveManualRange, categoryLabelRotate } from "@renderer/utils/axis/buildAxisOptions";
import { buildCombinedAnnotationSeries } from "@renderer/utils/reference-lines/buildReferenceAnnotations";
import { parseAxisBound } from "@renderer/utils/axis/validateAxisScale";

type PointDatum = {
  value: [number | string, number | string];
  rowIndex: number;
  xLabel: string;
  yLabel: string;
  group: string;
  seriesHint?: string;
  itemStyle?: { color?: string };
  symbolSize?: number;
};

type TooltipParam = {
  seriesName?: string;
  name?: string;
  value?: unknown;
  color?: string;
  data?: unknown;
  marker?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTooltipHtml(
  params: TooltipParam,
  xName: string,
  yName: string
): string {
  const data = params.data as
    | {
        xLabel?: string;
        yLabel?: string;
        group?: string;
        seriesHint?: string;
        value?: [number | string, number | string];
      }
    | undefined;

  let xText = "";
  let yText = "";
  if (data && typeof data === "object") {
    xText = data.xLabel ?? (data.value != null ? String(data.value[0]) : "");
    yText = data.yLabel ?? (data.value != null ? String(data.value[1]) : "");
  } else if (Array.isArray(params.value)) {
    xText = String(params.value[0] ?? "");
    yText = String(params.value[1] ?? "");
  } else if (params.value != null) {
    yText = String(params.value);
  }

  const series =
    (params.seriesName && params.seriesName !== "__axis_annotations__"
      ? params.seriesName
      : null) ||
    data?.seriesHint ||
    data?.group;

  const rows: string[] = [];
  if (series) {
    rows.push(
      `<div style="font-weight:600;margin-bottom:4px">${params.marker ?? ""}${escapeHtml(series)}</div>`
    );
  }
  if (data?.seriesHint && series !== data.seriesHint) {
    rows.push(
      `<div><span style="color:#666">Color</span>: <b>${escapeHtml(data.seriesHint)}</b></div>`
    );
  }
  rows.push(
    `<div><span style="color:#666">${escapeHtml(shortName(xName, 24))}</span>: <b>${escapeHtml(xText)}</b></div>`
  );
  rows.push(
    `<div><span style="color:#666">${escapeHtml(shortName(yName, 24))}</span>: <b>${escapeHtml(yText)}</b></div>`
  );
  return rows.join("");
}

function sampleIndices(rowCount: number, limit: number): number[] {
  if (rowCount <= limit) return Array.from({ length: rowCount }, (_, i) => i);
  const step = rowCount / limit;
  return Array.from({ length: limit }, (_, i) => Math.floor(i * step));
}

function sampleRowFilter(rows: number[], limit: number): number[] {
  if (rows.length <= limit) return rows;
  const step = rows.length / limit;
  return Array.from({ length: limit }, (_, i) => rows[Math.floor(i * step)]!);
}

function cellToLabel(value: CellValue): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t || isLimitMetadataLabel(t)) return null;
    return t;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function toNum(value: CellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim() !== "") {
    if (isLimitMetadataLabel(value)) return null;
    const n = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function shortName(name: string, max = 28): string {
  const leaf = name.split("::").pop() ?? name;
  return leaf.length <= max ? leaf : `${leaf.slice(0, max - 1)}…`;
}

function col(
  dataset: Dataset,
  columnId: string | undefined
): ColumnMeta | null {
  if (!columnId) return null;
  return dataset.columns.find((c) => c.id === columnId) ?? null;
}

function markerSymbol(
  shape: string
): "circle" | "rect" | "diamond" | "triangle" {
  if (shape === "square") return "rect";
  if (shape === "diamond") return "diamond";
  if (shape === "triangle") return "triangle";
  return "circle";
}
export type BuildChartResult = {
  option: EChartsOption | null;
  issues: GraphIssue[];
};

/** Layout hints when rendering a multi-Y / multi-X / Wrap stacked panel (JMP-style). */
export type PanelLayout = {
  row: number;
  col: number;
  rowCount: number;
  colCount: number;
  /** Hide built-in ECharts legend (external ColorLegendPanel is used). */
  suppressLegend?: boolean;
  /** When set, only these dataset row indices are plotted (Wrap facet). */
  rowFilter?: number[];
  /**
   * Shared continuous Y extent across Wrap (or stacked) panels — JMP-style
   * common scale so facets are comparable at a glance.
   */
  sharedYRange?: { min: number; max: number };
  /**
   * Show X-axis chrome on this facet. For Wrap grids, true on the bottom row
   * of the rectangular trellis (including empty placeholder cells).
   */
  showXAxis?: boolean;
  /** Show Y-axis title/ticks — Wrap: only leftmost column. */
  showYAxis?: boolean;
  /** Force white plot background (Wrap trellis). */
  whiteBackground?: boolean;
  /** Allow building axes with no series (empty Wrap placeholder). */
  allowEmptyAxes?: boolean;
};

function axisPaddingExtent(paddingRatio = 0.08) {
  return {
    min: (extent: { min: number; max: number }) => {
      const span = extent.max - extent.min;
      if (!Number.isFinite(span) || span === 0) {
        const base = Math.abs(extent.min) || 1;
        return extent.min - base * 0.05;
      }
      return extent.min - span * paddingRatio;
    },
    max: (extent: { min: number; max: number }) => {
      const span = extent.max - extent.min;
      if (!Number.isFinite(span) || span === 0) {
        const base = Math.abs(extent.max) || 1;
        return extent.max + base * 0.05;
      }
      return extent.max + span * paddingRatio;
    },
  };
}

export function buildChartOption(
  dataset: Dataset,
  rawConfig: GraphConfig,
  panel?: PanelLayout
): BuildChartResult {
  const config = ensureGraphConfig(rawConfig);
  const issues: GraphIssue[] = [];
  const xRef = config.roles.x[0];
  const yRef = config.roles.y[0];
  if (!xRef || !yRef) return { option: null, issues };

  const xCol = col(dataset, xRef.columnId);
  const yCol = col(dataset, yRef.columnId);
  if (!xCol || !yCol) return { option: null, issues };

  const overlayCol = col(dataset, config.roles.overlay[0]?.columnId);
  const colorCol = col(dataset, config.roles.color[0]?.columnId);
  const sizeCol = col(dataset, config.roles.size[0]?.columnId);
  const intervalCols = config.roles.interval
    .map((r) => col(dataset, r.columnId))
    .filter((c): c is ColumnMeta => c != null);

  const xContinuous = shouldUseContinuousAxis(dataset, xCol);
  const yContinuous = shouldUseContinuousAxis(dataset, yCol);

  const xRaw = dataset.columnsData[xCol.id] ?? [];
  const yRaw = dataset.columnsData[yCol.id] ?? [];

  // Category order for non-continuous X — natural sort (socket / TesterID trends)
  const xCategoryOrder: string[] = [];
  const xCategoryIndex = new Map<string, number>();
  if (!xContinuous) {
    const seen: string[] = [];
    const seenSet = new Set<string>();
    for (const v of xRaw) {
      const label = cellToLabel(v);
      if (label == null || seenSet.has(label)) continue;
      seenSet.add(label);
      seen.push(label);
    }
    const sorted = naturalSortStrings(seen);
    sorted.forEach((label, idx) => {
      xCategoryOrder.push(label);
      xCategoryIndex.set(label, idx);
    });
  }

  const xCoords: Array<number | null> = [];
  const yCoords: Array<number | null> = [];
  const xLabels: Array<string | null> = [];
  const yLabels: Array<string | null> = [];

  for (let i = 0; i < dataset.rowCount; i += 1) {
    if (xContinuous) {
      const n = toNum(xRaw[i]);
      xCoords.push(n);
      xLabels.push(n == null ? null : String(n));
    } else {
      const label = cellToLabel(xRaw[i]);
      xLabels.push(label);
      xCoords.push(label == null ? null : (xCategoryIndex.get(label) ?? null));
    }
    if (yContinuous) {
      const n = toNum(yRaw[i]);
      yCoords.push(n);
      yLabels.push(n == null ? null : String(n));
    } else {
      const label = cellToLabel(yRaw[i]);
      yLabels.push(label);
      yCoords.push(label == null ? null : toNum(yRaw[i]));
    }
  }

  const overlay = createOverlayGroups(dataset, overlayCol, {
    binCount: config.options.overlayBinCount,
    showMissing: config.options.overlayShowMissing,
  });
  issues.push(...overlay.issues);

  // Wrap facet: keep only rows in this panel (`[]` = intentionally empty placeholder)
  const rowFilter = panel?.rowFilter;
  const rowSet = rowFilter != null ? new Set(rowFilter) : null;
  if (rowSet) {
    for (const g of overlay.groups) {
      g.rowIndices = g.rowIndices.filter((i) => rowSet.has(i));
    }
  }

  const color = createColorScale(dataset, colorCol);
  issues.push(...color.issues);

  const size = createSizeScale(dataset, sizeCol, {
    minPx: config.options.sizeMinPx,
    maxPx: config.options.sizeMaxPx,
  });
  issues.push(...size.issues);

  const intervals = createIntervalValues(dataset, yCoords, intervalCols);
  issues.push(...intervals.issues);

  const enabled = new Set(
    config.layers.filter((l) => l.enabled).map((l) => l.kind)
  );
  if (enabled.size === 0) {
    issues.push({ level: "info", message: "No graph elements are enabled." });
    return { option: null, issues };
  }

  if ((enabled.has("smoother") || enabled.has("lineOfFit")) && !yContinuous) {
    issues.push({
      level: "warning",
      message: "Smoother / Line of Fit require a continuous numeric Y.",
    });
  }

  const indices =
    rowFilter != null
      ? sampleRowFilter(rowFilter, SCATTER_SAMPLE_LIMIT)
      : sampleIndices(dataset.rowCount, SCATTER_SAMPLE_LIMIT);
  const series: object[] = [];
  const legendData: string[] = [];

  const sortedLayers = [...config.layers]
    .filter((l) => l.enabled)
    .sort((a, b) => a.zIndex - b.zIndex);

  const hasOverlayRole = Boolean(overlayCol);
  // Multi-Y / multi-X panels: JMP colors each Y (or X) series differently when Overlay is empty.
  const panelSeriesIndex =
    (panel?.row ?? 0) * (panel?.colCount ?? 1) + (panel?.col ?? 0);

  for (const layer of sortedLayers) {
    addLayerSeries({
      kind: layer.kind,
      dataset,
      config,
      groups: overlay.groups,
      hasOverlayRole,
      panelSeriesIndex,
      overlayCol,
      xContinuous,
      yContinuous,
      xCoords,
      yCoords,
      xLabels,
      yLabels,
      xCategoryOrder,
      xRaw,
      yRaw,
      colorCol,
      sizeCol,
      colorScale: color.scale,
      sizeScale: size.scale,
      intervalPairs: intervals.pairs,
      indices,
      series,
      legendData,
      issues,
    });
  }

  if (series.length === 0) {
    if (!panel?.allowEmptyAxes) {
      return { option: null, issues };
    }
  }

  const stacked = (panel?.rowCount ?? 1) > 1 || (panel?.colCount ?? 1) > 1;
  const isWrapFacet = Boolean(panel?.whiteBackground || panel?.rowFilter || panel?.allowEmptyAxes);
  const isBottom =
    panel?.showXAxis != null
      ? panel.showXAxis
      : !panel || panel.row === panel.rowCount - 1;
  const isTop = !panel || panel.row === 0;
  const showYChrome = panel?.showYAxis != null ? panel.showYAxis : true;
  // Stacked panels must share identical plot width — never put legend inside one pane.
  const useExternalLegend = Boolean(panel?.suppressLegend) || stacked;
  const showEchartsLegend =
    config.options.showLegend &&
    legendData.length > 0 &&
    !useExternalLegend;
  const showTitle = !stacked;
  const title =
    config.options.titleText ||
    `${shortName(yRef.name, 40)} vs ${shortName(xRef.name, 40)}`;

  const yPad = axisPaddingExtent(config.axes.y.scale.paddingEnd || 0.08);
  const xPad = axisPaddingExtent(config.axes.x.scale.paddingEnd || 0.05);
  // Facets: keep left/right gutters identical so every panel’s plot area matches.
  const rightGutter = stacked
    ? isWrapFacet
      ? 4
      : 10
    : showEchartsLegend
      ? 128
      : 14;
  const catCount = xContinuous ? 0 : xCategoryOrder.length;
  const xRotate = categoryLabelRotate(
    catCount,
    config.axes.x.appearance.labelOrientation
  );
  // JMP Wrap/Group: keep X labels tight under the plot (no floating gap)
  const manyFacetRows = isWrapFacet && (panel?.rowCount ?? 1) >= 5;
  const bottomForX = isBottom
    ? xContinuous
      ? isWrapFacet
        ? manyFacetRows
          ? 22
          : 28
        : 36
      : isWrapFacet
        ? manyFacetRows
          ? 26
          : 40
        : xRotate >= 60
          ? 88
          : xRotate >= 45
            ? 72
            : catCount > 8
              ? 56
              : 48
    : isWrapFacet
      ? 2
      : 6;

  // Facets: thin category labels (auto interval) — dense RowID etc. stay readable
  const showAllXLabels = !isWrapFacet;
  const xAxisBuilt = buildAxisOptions(config.axes.x, {
    continuous: xContinuous,
    categoryData: xCategoryOrder,
    defaultName: shortName(xRef.name),
    showAxisChrome: isBottom,
    showAllCategoryLabels: showAllXLabels,
    paddingExtent: xPad,
    nameGap: isWrapFacet && isBottom ? (xRotate >= 45 ? 36 : 22) : undefined,
  });
  // JMP facets: no vertical category grid lines
  if (isWrapFacet) {
    xAxisBuilt.splitLine = { show: false };
  }

  const yAxisBuilt = buildAxisOptions(config.axes.y, {
    continuous: yContinuous,
    defaultName: shortName(yRef.name, stacked || isWrapFacet ? 22 : 36),
    showAxisChrome: showYChrome,
    paddingExtent: yPad,
    stackedY: stacked || isWrapFacet,
    nameGap: isWrapFacet && showYChrome ? 40 : undefined,
  });
  // Keep horizontal grid from Y; hide axis chrome chrome itself on non-rail panels
  if (isWrapFacet && !showYChrome) {
    yAxisBuilt.axisLine = { show: false };
    yAxisBuilt.axisTick = { show: false };
  }
  // JMP Wrap/Group: lock facets to a common Y scale (wins over stale global zoom).
  // Skip when Points summary is N/Sum/… — plotted Y is no longer the raw measure.
  const pointsEnabled = config.layers.some((l) => l.kind === "points" && l.enabled);
  const keepSharedY =
    !pointsEnabled ||
    pointsSummaryUsesRawYScale(config.options.points.summaryStatistic);
  if (yContinuous && panel?.sharedYRange && keepSharedY) {
    yAxisBuilt.min = panel.sharedYRange.min;
    yAxisBuilt.max = panel.sharedYRange.max;
  }

  // Resolve visible ranges for clipping reference lines
  const xManual = effectiveManualRange(config.axes.x.scale);
  const yManual = effectiveManualRange(config.axes.y.scale);

  const annotation = buildCombinedAnnotationSeries(
    config.axes.x.referenceLines,
    config.axes.y.referenceLines,
    xContinuous ? xManual : null,
    yContinuous ? yManual : null
  );

  const seriesWithAnn = annotation
    ? [...series, annotation]
    : series;

  const option: EChartsOption = {
    animation: false,
    backgroundColor: panel?.whiteBackground ? "#ffffff" : undefined,
    // Shared categorical palette so ECharts defaults never diverge from Color scale
    color: [...DISCRETE_PALETTE],
    title: showTitle
      ? {
          text: title,
          left: "center",
          top: 4,
          textStyle: { fontSize: 13, fontWeight: 600 },
        }
      : undefined,
    tooltip: {
      trigger: "item",
      confine: true,
      appendToBody: true,
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "#ccc",
      borderWidth: 1,
      textStyle: { color: "#222", fontSize: 12 },
      extraCssText: "box-shadow:0 2px 8px rgba(0,0,0,0.12);max-width:360px;",
      formatter: (raw) => {
        const params = (Array.isArray(raw) ? raw[0] : raw) as TooltipParam;
        if (!params || params.seriesName === "__axis_annotations__") return "";
        return formatTooltipHtml(params, xRef.name, yRef.name);
      },
    },
    legend: {
      show: showEchartsLegend,
      type: "scroll",
      orient: "vertical",
      right: 4,
      top: "middle",
      height: "80%",
      textStyle: { fontSize: 10 },
      formatter: (name: string) =>
        name.length > 18 ? `${name.slice(0, 8)}…${name.slice(-6)}` : name,
      data: Array.from(new Set(legendData)),
    },
    grid: stacked
      ? {
          // Equal plot areas: same left gutter on every facet column.
          // Group mode draws Y chrome in an external rail (showYAxis=false).
          left: isWrapFacet ? (showYChrome ? 64 : 4) : 92,
          right: rightGutter,
          top: isTop ? (isWrapFacet ? 6 : 10) : isWrapFacet ? 4 : 6,
          bottom: bottomForX,
          containLabel: false,
          backgroundColor: panel?.whiteBackground ? "#ffffff" : undefined,
          show: Boolean(panel?.whiteBackground),
          borderWidth: 0,
        }
      : {
          left: 18,
          right: showEchartsLegend ? rightGutter : 20,
          top: showTitle ? 40 : 16,
          bottom: Math.max(12, bottomForX - 24),
          containLabel: true,
        },
    xAxis: xAxisBuilt as EChartsOption["xAxis"],
    yAxis: yAxisBuilt as EChartsOption["yAxis"],
    visualMap:
      color.scale?.kind === "continuous" && !stacked
        ? {
            show: config.options.showLegend,
            min: color.scale.min,
            max: color.scale.max,
            calculable: true,
            orient: "vertical",
            right: 4,
            top: "middle",
            dimension: 2,
            inRange: {
              color: color.scale.colorStops.map((s) => s[1]),
            },
            text: [shortName(colorCol?.name ?? "Color", 16)],
          }
        : undefined,
    // Inside dataZoom: wheel zoom only — mouse move must stay free for point hover on all panels
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: 0,
        filterMode: "none",
        zoomOnMouseWheel: true,
        moveOnMouseMove: false,
        moveOnMouseWheel: false,
      },
      {
        type: "inside",
        yAxisIndex: 0,
        filterMode: "none",
        zoomOnMouseWheel: "shift",
        moveOnMouseMove: false,
        moveOnMouseWheel: false,
      },
    ],
    series: seriesWithAnn as EChartsOption["series"],
  };

  // Soft warn for log scale with non-positive data
  if (config.axes.x.scale.scaleType === "log" && xContinuous) {
    const hasBad = indices.some((i) => {
      const v = xCoords[i];
      return v != null && v <= 0;
    });
    if (hasBad) {
      issues.push({
        level: "warning",
        message: "로그 축은 0보다 큰 값만 표시할 수 있습니다.",
      });
    }
  }
  if (config.axes.y.scale.scaleType === "log" && yContinuous) {
    const hasBad = indices.some((i) => {
      const v = yCoords[i];
      return v != null && v <= 0;
    });
    if (hasBad) {
      issues.push({
        level: "warning",
        message: "로그 축은 0보다 큰 값만 표시할 수 있습니다.",
      });
    }
  }

  void parseAxisBound;

  return { option, issues };
}

function addLayerSeries(args: {
  kind: GraphLayerKind;
  dataset: Dataset;
  config: GraphConfig;
  groups: ReturnType<typeof createOverlayGroups>["groups"];
  hasOverlayRole: boolean;
  panelSeriesIndex: number;
  overlayCol: ColumnMeta | null;
  xContinuous: boolean;
  yContinuous: boolean;
  xCoords: Array<number | null>;
  yCoords: Array<number | null>;
  xLabels: Array<string | null>;
  yLabels: Array<string | null>;
  xCategoryOrder: string[];
  xRaw: CellValue[];
  yRaw: CellValue[];
  colorCol: ColumnMeta | null;
  sizeCol: ColumnMeta | null;
  colorScale: ReturnType<typeof createColorScale>["scale"];
  sizeScale: ReturnType<typeof createSizeScale>["scale"];
  intervalPairs: ReturnType<typeof createIntervalValues>["pairs"];
  indices: number[];
  series: object[];
  legendData: string[];
  issues: GraphIssue[];
}): void {
  const {
    kind,
    config,
    groups,
    hasOverlayRole,
    panelSeriesIndex,
    overlayCol,
    xContinuous,
    yContinuous,
    xCoords,
    yCoords,
    xLabels,
    yLabels,
    xCategoryOrder,
    xRaw,
    colorCol,
    sizeCol,
    colorScale,
    sizeScale,
    intervalPairs,
    indices,
    series,
    legendData,
    issues,
  } = args;

  const pointsOpt = config.options.points;
  const lineOpt = config.options.line;
  const fitOpt = config.options.lineOfFit;
  const smoothOpt = config.options.smoother;

  /** JMP: Overlay series color, or Color scale when Color===Overlay, else panel/Y color. */
  const colorForOverlayGroup = (gi: number, groupKey: string): string => {
    if (
      hasOverlayRole &&
      colorCol &&
      overlayCol &&
      colorCol.id === overlayCol.id &&
      colorScale?.kind === "discrete"
    ) {
      return resolveDiscreteColor(colorScale, groupKey);
    }
    if (hasOverlayRole) return overlayColor(gi);
    return overlayColor(panelSeriesIndex);
  };

  for (let gi = 0; gi < groups.length; gi += 1) {
    const group = groups[gi];
    const groupSet = new Set(group.rowIndices);
    const name =
      groups.length === 1 && group.key === "__all__" ? kindLabel(kind) : group.label;

    if (kind === "points") {
      if (!pointsOpt.applyOverlay && group.key !== groups[0].key) continue;

      type RawRow = {
        xKey: string;
        xValue: number | string;
        yValue: number;
        rowIndex: number;
        colorVal: CellValue;
        sizeVal: CellValue;
        xl: string;
      };
      const rawRows: RawRow[] = [];
      for (const i of indices) {
        if (!groupSet.has(i)) continue;
        const xl = xLabels[i];
        const yl = yLabels[i];
        if (xl == null || yl == null) continue;
        if (xContinuous && xCoords[i] == null) continue;
        if (yContinuous && yCoords[i] == null) continue;
        const yNum = yContinuous ? (yCoords[i] as number) : toNum(yl);
        if (yNum == null || !Number.isFinite(yNum)) continue;
        const xValue: number | string = xContinuous ? (xCoords[i] as number) : xl;
        rawRows.push({
          xKey: xl,
          xValue,
          yValue: yNum,
          rowIndex: i,
          colorVal: colorCol ? args.dataset.columnsData[colorCol.id][i] ?? null : null,
          sizeVal: sizeCol ? args.dataset.columnsData[sizeCol.id][i] ?? null : null,
          xl,
        });
      }

      const aggregated = buildPointsWithSummary(
        rawRows.map((r) => ({
          xKey: r.xKey,
          xValue: r.xValue,
          yValue: r.yValue,
          rowIndex: r.rowIndex,
        })),
        pointsOpt.summaryStatistic,
        pointsOpt.errorInterval,
        pointsOpt.intervalStyle
      );

      // Map aggregated points back to styling from a representative raw row
      const rawByIndex = new Map(rawRows.map((r) => [r.rowIndex, r]));
      const xKeysForJitter = aggregated.map((p) => p.xKey);
      const jitterOn =
        pointsOpt.jitter !== "none" &&
        (pointsOpt.summaryStatistic === "none" || pointsOpt.jitter !== "auto");
      const offsets = jitterOn
        ? computeJitterOffsets(
            xKeysForJitter,
            pointsOpt.jitter,
            pointsOpt.jitterLimit,
            gi * 17 + 1
          )
        : aggregated.map(() => 0);

      const data: PointDatum[] = [];
      const intervalData: Array<[number | string, number, number]> = [];

      aggregated.forEach((p, pi) => {
        const raw = rawByIndex.get(p.rowIndex);
        const xl = String(p.xValue);
        let xPlot: number | string = p.xValue;
        const off = offsets[pi] ?? 0;
        if (off !== 0) {
          if (xContinuous && typeof p.xValue === "number") {
            // Continuous: offset as a small fraction of a unit span
            xPlot = p.xValue + off * 0.15;
          } else {
            const idx = xCategoryOrder.indexOf(String(p.xValue));
            xPlot = (idx >= 0 ? idx : pi) + off;
          }
        }

        const colorVal = raw?.colorVal ?? null;
        const sizeVal = raw?.sizeVal ?? null;
        const datum: PointDatum = {
          value: [xPlot, p.yValue],
          rowIndex: p.rowIndex,
          xLabel: xl,
          yLabel: String(p.yValue),
          group: group.label,
          seriesHint:
            colorCol && colorVal != null ? colorCategoryKey(colorVal) : undefined,
        };
        if (pointsOpt.applyColor) {
          datum.itemStyle = {
            color: resolveColor(
              colorScale,
              colorVal,
              colorForOverlayGroup(gi, group.key)
            ),
          };
        } else {
          datum.itemStyle = { color: colorForOverlayGroup(gi, group.key) };
        }
        if (pointsOpt.applySize) {
          datum.symbolSize = resolveSize(
            sizeScale,
            sizeVal,
            pointsOpt.markerSize || config.options.markerSize
          );
        } else {
          datum.symbolSize = pointsOpt.markerSize || config.options.markerSize;
        }
        data.push(datum);

        if (
          p.lo != null &&
          p.hi != null &&
          Number.isFinite(p.lo) &&
          Number.isFinite(p.hi) &&
          yContinuous
        ) {
          intervalData.push([xPlot, p.lo, p.hi]);
        }

        // Interval role columns (custom) — only when summary is none
        if (
          pointsOpt.applyInterval &&
          pointsOpt.summaryStatistic === "none" &&
          intervalPairs[p.rowIndex]?.valid
        ) {
          const lo = intervalPairs[p.rowIndex].lower;
          const hi = intervalPairs[p.rowIndex].upper;
          if (lo != null && hi != null && yContinuous) {
            intervalData.push([xPlot, lo, hi]);
          }
        }
      });

      if (data.length === 0) continue;
      legendData.push(name);

      if (intervalData.length > 0) {
        const style = pointsOpt.intervalStyle;
        if (style === "band") {
          series.push({
            type: "custom",
            name: `${name} interval`,
            clip: true,
            renderItem: createIntervalBandRenderer(),
            data: intervalData,
            z: 15,
            silent: true,
            itemStyle: {
              color: colorForOverlayGroup(gi, group.key),
              opacity: 0.18,
            },
          });
        } else {
          series.push({
            type: "custom",
            name: `${name} interval`,
            clip: true,
            renderItem: createErrorBarSeriesRenderer(),
            data: intervalData,
            z: 20,
            silent: true,
            itemStyle: { color: "#666" },
          });
        }
      }

      series.push({
        type: "scatter",
        name,
        data,
        symbol: markerSymbol(pointsOpt.markerShape),
        itemStyle: { opacity: pointsOpt.opacity },
        z: 60,
        large: false,
        emphasis: {
          focus: "none",
          scale: 1.35,
          itemStyle: {
            opacity: 1,
            borderColor: "#111",
            borderWidth: 2,
            shadowBlur: 8,
            shadowColor: "rgba(0,0,0,0.35)",
          },
        },
        select: {
          itemStyle: {
            opacity: 1,
            borderColor: "#111",
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: "rgba(0,0,0,0.4)",
          },
        },
        selectedMode: "single",
        tooltip: { show: true },
      });
      continue;
    }

    if (kind === "line") {
      if (!lineOpt.applyOverlay && group.key !== groups[0].key) continue;

      // Split by Color (JMP Overlay/Color): each level = one polyline
      const colorBySeries =
        lineOpt.applyColor &&
        colorCol &&
        colorScale?.kind === "discrete";

      type SubSeries = { key: string; label: string; indices: number[] };
      const subSeries: SubSeries[] = [];

      if (colorBySeries) {
        const map = new Map<string, number[]>();
        for (const i of group.rowIndices) {
          if (xLabels[i] == null || yCoords[i] == null) continue;
          const raw = args.dataset.columnsData[colorCol.id][i];
          const key = colorCategoryKey(raw);
          if (!map.has(key)) {
            map.set(key, []);
          }
          map.get(key)!.push(i);
        }
        // Same order as ColorLegendPanel / createColorScale
        for (const key of naturalSortStrings(Array.from(map.keys()))) {
          subSeries.push({ key, label: key, indices: map.get(key) ?? [] });
        }
      } else {
        const indices = group.rowIndices.filter(
          (i) => xLabels[i] != null && yCoords[i] != null
        );
        subSeries.push({
          key: group.key,
          label: name,
          indices,
        });
      }

      for (let si = 0; si < subSeries.length; si += 1) {
        const sub = subSeries[si];
        const rows = sub.indices.map((i) => {
          const xl = xLabels[i]!;
          const xValue: number | string = xContinuous ? (xCoords[i] as number) : xl;
          const sortKey = xCoords[i] ?? 0;
          return {
            xKey: String(xl),
            xValue,
            yValue: yCoords[i] as number,
            sortKey: typeof sortKey === "number" ? sortKey : 0,
            rowOrder: i,
          };
        });

        const data = buildAggregatedLinePoints(
          rows,
          lineOpt.summaryStatistic,
          lineOpt.sortOrder
        );
        if (data.length < 2) continue;

        const seriesName =
          colorBySeries && groups.length === 1 && group.key === "__all__"
            ? sub.label
            : colorBySeries
              ? `${group.label}: ${sub.label}`
              : sub.label;

        legendData.push(seriesName);
        // Must use the Color scale map (same as ColorLegendPanel) — never series index fallback
        const lineColor = colorBySeries
          ? resolveDiscreteColor(colorScale, sub.key)
          : colorForOverlayGroup(gi, group.key);

        const pointEmphasis = {
          focus: "none" as const,
          scale: 1.4,
          itemStyle: {
            opacity: 1,
            color: lineColor,
            borderColor: "#111",
            borderWidth: 2,
            shadowBlur: 8,
            shadowColor: "rgba(0,0,0,0.35)",
          },
        };
        const pointSelect = {
          itemStyle: {
            opacity: 1,
            color: lineColor,
            borderColor: "#111",
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: "rgba(0,0,0,0.4)",
          },
        };

        // Clean polyline (no permanent dots)
        series.push({
          type: "line",
          name: seriesName,
          data,
          showSymbol: lineOpt.showMarkers,
          symbol: "circle",
          symbolSize: 7,
          triggerLineEvent: false,
          lineStyle: {
            width: lineOpt.lineWidth,
            opacity: lineOpt.opacity,
            color: lineColor,
          },
          itemStyle: { color: lineColor, opacity: lineOpt.showMarkers ? 1 : 0 },
          connectNulls: lineOpt.connectNulls,
          z: 50,
          // Line itself should not steal hover from point hit-layer
          silent: false,
          emphasis: lineOpt.showMarkers ? pointEmphasis : { disabled: true },
          tooltip: { show: lineOpt.showMarkers },
        });

        // Invisible scatter hit-layer — works on every stacked panel (opacity:0 often ignores hits)
        if (!lineOpt.showMarkers) {
          series.push({
            type: "scatter",
            name: seriesName,
            data,
            symbol: "circle",
            symbolSize: 16,
            itemStyle: {
              color: lineColor,
              opacity: 0.01,
              borderWidth: 0,
            },
            z: 80,
            clip: false,
            legendHoverLink: false,
            large: false,
            emphasis: pointEmphasis,
            select: pointSelect,
            selectedMode: "single",
            tooltip: { show: true },
          });
        }
      }
      continue;
    }

    if (kind === "lineOfFit" || kind === "smoother") {
      // Y must be continuous; X may be continuous OR categorical (indices / means)
      if (!yContinuous) {
        if (group.key === groups[0].key) {
          issues.push({
            level: "warning",
            message: `${kindLabel(kind)} requires a continuous numeric Y.`,
          });
        }
        continue;
      }

      // JMP Smoother / Line of Fit sequence:
      // 1) No Overlay → one curve for all points in this panel (Group Y facet).
      // 2) Overlay set + applyOverlay → one curve per Overlay level (e.g. SerialNumber),
      //    colored like the matching point series.
      const applyOverlay =
        kind === "lineOfFit" ? fitOpt.applyOverlay : smoothOpt.applyOverlay;
      if (hasOverlayRole && !applyOverlay && group.key !== groups[0].key) {
        continue;
      }
      if (!hasOverlayRole && group.key !== groups[0].key) continue;

      const groupByColor =
        (kind === "lineOfFit" ? fitOpt.groupByColor : smoothOpt.groupByColor) &&
        colorCol &&
        colorScale?.kind === "discrete" &&
        !hasOverlayRole; // Overlay already splits series; don't double-split

      type FitSub = { key: string; label: string; indices: number[] };
      const fitSubs: FitSub[] = [];
      if (groupByColor && colorCol) {
        const map = new Map<string, number[]>();
        for (const i of group.rowIndices) {
          if (yCoords[i] == null) continue;
          if (xContinuous && xCoords[i] == null) continue;
          if (!xContinuous && xLabels[i] == null) continue;
          const key = colorCategoryKey(args.dataset.columnsData[colorCol.id][i]);
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(i);
        }
        for (const key of naturalSortStrings(Array.from(map.keys()))) {
          fitSubs.push({ key, label: key, indices: map.get(key) ?? [] });
        }
      } else {
        fitSubs.push({
          key: group.key,
          label: name,
          indices: group.rowIndices,
        });
      }

      for (let fi = 0; fi < fitSubs.length; fi += 1) {
        const sub = fitSubs[fi];
        const seriesName =
          groupByColor && groups.length === 1 && group.key === "__all__"
            ? `${kindLabel(kind)}: ${sub.label}`
            : groupByColor
              ? `${kindLabel(kind)}: ${group.label}/${sub.label}`
              : name;
        const lineColor = groupByColor
          ? resolveDiscreteColor(colorScale, sub.key)
          : colorForOverlayGroup(gi, group.key);

        if (kind === "smoother") {
          const xs: number[] = [];
          const ys: number[] = [];
          for (const i of sub.indices) {
            const x = xCoords[i];
            const y = yCoords[i];
            if (x == null || y == null) continue;
            xs.push(x);
            ys.push(y);
          }
          if (xs.length < 3) {
            issues.push({
              level: "info",
              message: `Smoother skipped for "${seriesName}" (need ≥3 points).`,
            });
            continue;
          }
          const evalAt = xContinuous
            ? undefined
            : Array.from(new Set(xs)).sort((a, b) => a - b);
          const smooth = buildSmoother(xs, ys, smoothOpt.method, {
            span: smoothOpt.span,
            windowSize: smoothOpt.windowSize,
            gridPoints: 120,
            evalAt,
          });
          if (smooth.length < 2) continue;
          // Map category-index smoother back to category labels for ECharts category axis
          const data = xContinuous
            ? smooth.map((p) => [p.x, p.y] as [number, number])
            : smooth.map((p) => {
                const idx = Math.round(p.x);
                const label =
                  xCategoryOrder[idx] ??
                  xCategoryOrder[
                    Math.max(0, Math.min(xCategoryOrder.length - 1, idx))
                  ];
                return [label, p.y] as [string, number];
              });
          legendData.push(seriesName);
          series.push({
            type: "line",
            name: seriesName,
            data,
            showSymbol: false,
            smooth: smoothOpt.method === "loess",
            clip: false,
            lineStyle: {
              width: Math.max(2, smoothOpt.lineWidth),
              opacity: smoothOpt.opacity,
              color: lineColor,
              type: "solid",
            },
            itemStyle: { color: lineColor },
            z: 35,
            tooltip: {
              formatter: () =>
                `Smoother (${smoothOpt.method === "loess" ? "LOESS" : "Moving Avg"})`,
            },
          });
          continue;
        }

        // —— Line of Fit ——
        // JMP: continuous X → linear regression + 95% mean CI band
        //      categorical X → mean(Y) at each X level + 95% CI ribbon (Overlay splits series)
        if (xContinuous) {
          const xs: number[] = [];
          const ys: number[] = [];
          for (const i of sub.indices) {
            const x = xCoords[i];
            const y = yCoords[i];
            if (x == null || y == null) continue;
            xs.push(x);
            ys.push(y);
          }
          if (xs.length < 3) {
            issues.push({
              level: "info",
              message: `Line of Fit skipped for "${seriesName}" (need ≥3 points).`,
            });
            continue;
          }
          const fit = fitPolynomial(xs, ys, fitOpt.degree);
          if (!fit) {
            issues.push({
              level: "warning",
              message: `Line of Fit failed for "${seriesName}".`,
            });
            continue;
          }
          const xMin = Math.min(...xs);
          const xMax = Math.max(...xs);
          const curve = buildFitCurve(fit, xMin, xMax, 120);
          const band = buildFitConfidenceBand(fit, xMin, xMax, 0.95, 80);

          pushConfidenceBandSeries(series, {
            name: `${seriesName} 95% CI`,
            lower: band.lower,
            upper: band.upper,
            color: lineColor,
            opacity: 0.2,
          });

          legendData.push(seriesName);
          series.push({
            type: "line",
            name: seriesName,
            data: curve.map(([x, y]) => [x, y]),
            showSymbol: false,
            clip: false,
            lineStyle: {
              width: Math.max(2, fitOpt.lineWidth),
              opacity: fitOpt.opacity,
              color: lineColor,
              type: "solid",
            },
            itemStyle: { color: lineColor },
            z: 40,
            tooltip: {
              formatter: () => {
                const bits = ["Line of Fit"];
                if (fitOpt.showEquation) bits.push(fit.equation);
                if (fitOpt.showR2) bits.push(`R² = ${fit.r2.toFixed(4)}`);
                bits.push("95% CI band");
                return bits.join("<br/>");
              },
            },
          });
        } else {
          // Categorical X: not every raw point — mean marker + light min–max range bar
          // (JMP interval look). Overlay → one series per level.
          const rows: Array<{ xLabel: string; xIndex: number; y: number }> = [];
          for (const i of sub.indices) {
            const xl = xLabels[i];
            const y = yCoords[i];
            const xi = xCoords[i];
            if (xl == null || y == null || xi == null) continue;
            rows.push({ xLabel: xl, xIndex: xi, y });
          }
          const means = fitCategoryMeans(rows, 0.95);
          if (means.length < 1) continue;

          pushCategoryRangeIntervalSeries(series, {
            name: `${seriesName} range`,
            means,
            color: lineColor,
            opacity: 0.22,
          });

          legendData.push(seriesName);
          // JMP categorical Line of Fit: mean markers only — no connecting line
          series.push({
            type: "scatter",
            name: seriesName,
            data: means.map((m) => ({
              value: [m.xLabel, m.mean],
              xLabel: m.xLabel,
              yLabel: Number.isFinite(m.mean) ? m.mean.toPrecision(6) : String(m.mean),
              n: m.n,
              yMin: m.min,
              yMax: m.max,
            })),
            symbol: "circle",
            symbolSize: 8,
            clip: false,
            itemStyle: {
              color: lineColor,
              borderColor: "#fff",
              borderWidth: 1,
              opacity: fitOpt.opacity,
            },
            z: 40,
            tooltip: {
              formatter: (p: {
                data?: {
                  xLabel?: string;
                  yLabel?: string;
                  n?: number;
                  yMin?: number;
                  yMax?: number;
                };
              }) => {
                const d = p.data;
                return [
                  "Line of Fit (mean ± range)",
                  d?.xLabel ? `X: ${d.xLabel}` : "",
                  d?.yLabel ? `Mean: ${d.yLabel}` : "",
                  d?.yMin != null && d?.yMax != null
                    ? `Range: ${d.yMin} – ${d.yMax}`
                    : "",
                  d?.n != null ? `n: ${d.n}` : "",
                ]
                  .filter(Boolean)
                  .join("<br/>");
              },
            },
          });
        }
      }
    }
  }

  void xRaw;
}

/**
 * Categorical Line of Fit interval: light vertical bar = data min–max,
 * center is drawn separately as the mean symbol on the fit line.
 */
function pushCategoryRangeIntervalSeries(
  series: object[],
  args: {
    name: string;
    means: Array<{ xLabel: string; mean: number; min: number; max: number; n: number }>;
    color: string;
    opacity: number;
  }
): void {
  const { name, means, color, opacity } = args;
  if (means.length === 0) return;

  series.push({
    type: "custom",
    name,
    coordinateSystem: "cartesian2d",
    clip: false,
    silent: true,
    legendHoverLink: false,
    tooltip: { show: false },
    z: 28,
    // min/max/mean drive axis extent — never a dummy 0
    data: means.map((m) => [m.xLabel, m.min, m.max, m.mean]),
    encode: { x: 0, y: [1, 2, 3] },
    renderItem: (
      _params: { dataIndex: number },
      api: {
        value: (dim: number) => number | string;
        coord: (v: [number | string, number]) => number[];
        size: (v: [number, number]) => number[];
      }
    ) => {
      const xLabel = api.value(0) as string;
      const yMin = Number(api.value(1));
      const yMax = Number(api.value(2));
      const mean = Number(api.value(3));
      if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || !Number.isFinite(mean)) {
        return;
      }

      const mid = api.coord([xLabel, mean]);
      const pMin = api.coord([xLabel, yMin]);
      const pMax = api.coord([xLabel, yMax]);
      if (!mid || !pMin || !pMax) return;

      const catW = api.size([1, 0])?.[0] ?? 12;
      const halfW = Math.max(3, Math.min(16, catW * 0.32));
      const top = Math.min(pMin[1], pMax[1]);
      const height = Math.max(2, Math.abs(pMax[1] - pMin[1]));

      return {
        type: "rect",
        shape: {
          x: mid[0] - halfW,
          y: top,
          width: halfW * 2,
          height,
          r: 1,
        },
        style: {
          fill: color,
          opacity,
        },
        silent: true,
      };
    },
  });
}

/** Continuous-X CI ribbon (regression mean confidence band). */
function pushConfidenceBandSeries(
  series: object[],
  args: {
    name: string;
    lower: Array<[number | string, number]>;
    upper: Array<[number | string, number]>;
    color: string;
    opacity: number;
  }
): void {
  const { name, lower, upper, color, opacity } = args;
  if (lower.length < 2 || upper.length !== lower.length) return;
  const polygon: Array<[number | string, number]> = [
    ...lower,
    ...upper.slice().reverse(),
  ];
  series.push({
    type: "custom",
    name,
    coordinateSystem: "cartesian2d",
    clip: false,
    silent: true,
    legendHoverLink: false,
    tooltip: { show: false },
    z: 28,
    data: polygon,
    encode: { x: 0, y: 1 },
    renderItem: (
      params: {
        dataIndex: number;
        context: { rendered?: boolean };
      },
      api: {
        coord: (v: [number | string, number]) => number[];
      }
    ) => {
      void params.dataIndex;
      if (params.context.rendered) return;
      params.context.rendered = true;
      const points: number[][] = [];
      for (let i = 0; i < polygon.length; i += 1) {
        const p = api.coord(polygon[i]);
        if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) points.push(p);
      }
      if (points.length < 3) return;
      return {
        type: "polygon",
        shape: { points },
        style: {
          fill: color,
          opacity,
        },
        silent: true,
      };
    },
  });
}

function kindLabel(kind: GraphLayerKind): string {
  switch (kind) {
    case "points":
      return "Points";
    case "line":
      return "Line";
    case "smoother":
      return "Smoother";
    case "lineOfFit":
      return "Line of Fit";
  }
}

function overlayColor(index: number): string {
  return DISCRETE_PALETTE[index % DISCRETE_PALETTE.length];
}

/** Error bars for a whole series: each datum is [x, lo, hi]. */
function createErrorBarSeriesRenderer() {
  return (params: {
    dataInside?: unknown;
    data?: unknown;
    coordSys: { x: number; y: number; width: number; height: number };
    api: {
      value: (dim: number) => number | string;
      coord: (v: Array<number | string>) => number[];
      style: () => { fill?: string; stroke?: string };
    };
  }) => {
    try {
      const api = params.api;
      const x = api.value(0);
      const lo = Number(api.value(1));
      const hi = Number(api.value(2));
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return undefined;
      const low = api.coord([x, lo]);
      const high = api.coord([x, hi]);
      if (
        !low ||
        !high ||
        !Number.isFinite(low[0]) ||
        !Number.isFinite(low[1]) ||
        !Number.isFinite(high[0]) ||
        !Number.isFinite(high[1])
      ) {
        return undefined;
      }
      const halfWidth = 4;
      const stroke = api.style().stroke ?? api.style().fill ?? "#666";
      return {
        type: "group",
        children: [
          {
            type: "line",
            shape: { x1: low[0], y1: low[1], x2: high[0], y2: high[1] },
            style: { stroke, lineWidth: 1 },
          },
          {
            type: "line",
            shape: {
              x1: low[0] - halfWidth,
              y1: low[1],
              x2: low[0] + halfWidth,
              y2: low[1],
            },
            style: { stroke, lineWidth: 1 },
          },
          {
            type: "line",
            shape: {
              x1: high[0] - halfWidth,
              y1: high[1],
              x2: high[0] + halfWidth,
              y2: high[1],
            },
            style: { stroke, lineWidth: 1 },
          },
        ],
      };
    } catch {
      return undefined;
    }
  };
}

/** Vertical band between lo/hi for each x. */
function createIntervalBandRenderer() {
  return (params: {
    api: {
      value: (dim: number) => number | string;
      coord: (v: Array<number | string>) => number[];
      size: (v: Array<number | string>) => number[];
      style: () => { fill?: string; opacity?: number };
    };
  }) => {
    try {
      const api = params.api;
      const x = api.value(0);
      const lo = Number(api.value(1));
      const hi = Number(api.value(2));
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return undefined;
      const low = api.coord([x, lo]);
      const high = api.coord([x, hi]);
      if (
        !low ||
        !high ||
        !Number.isFinite(low[0]) ||
        !Number.isFinite(low[1]) ||
        !Number.isFinite(high[0]) ||
        !Number.isFinite(high[1])
      ) {
        return undefined;
      }
      const bandHalf = 6;
      const style = api.style();
      return {
        type: "rect",
        shape: {
          x: low[0] - bandHalf,
          y: Math.min(low[1], high[1]),
          width: bandHalf * 2,
          height: Math.abs(high[1] - low[1]),
        },
        style: {
          fill: style.fill ?? "#888",
          opacity: style.opacity ?? 0.18,
        },
      };
    } catch {
      return undefined;
    }
  };
}
