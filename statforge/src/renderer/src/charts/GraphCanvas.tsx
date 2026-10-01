import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useRef } from "react";
import type { ColumnRef, Dataset, GraphConfig } from "@shared/schemas/types";
import { ensureGraphConfig } from "@shared/schemas/types";
import type { AxisId } from "@shared/schemas/axis";
import { buildChartOption, type PanelLayout } from "./buildChartOption";
import {
  ColorLegendPanel,
  hasExternalSeriesLegend,
} from "./ColorLegendPanel";
import {
  createPageGroups,
  createWrapGroups,
  wrapGridSize,
  WRAP_GRID_COLS,
} from "./encoding/wrap";
import {
  createAllGroup,
  createGroupXGroups,
  createGroupYGroups,
  intersectRowIndices,
  isAllGroup,
} from "./encoding/group";
import type { CellValue } from "@shared/schemas/types";
import { usePreferenceStore } from "@renderer/stores/preferenceStore";
import { useAxisUiStore } from "@renderer/stores/axisUiStore";
import { useGraphStore } from "@renderer/stores/graphStore";
import { useHistoryStore } from "@renderer/stores/historyStore";

interface GraphCanvasProps {
  dataset: Dataset | null;
  config: GraphConfig;
}

type FacetMode = "default" | "wrap" | "page" | "group";

type PanelSpec = {
  key: string;
  x: ColumnRef;
  y: ColumnRef;
  row: number;
  col: number;
  caption?: string;
  /** Group Y: level label shown on the right strip (JMP-style). */
  groupYLabel?: string;
  rowFilter?: number[];
  /** Bottom row of rectangular Wrap trellis → show X-axis. */
  showXAxis?: boolean;
  /** Leftmost column → show Y-axis. */
  showYAxis?: boolean;
  /** Spacer cell with no data (keeps X-axis aligned like JMP). */
  empty?: boolean;
};

function shortLeaf(name: string, max = 36): string {
  const leaf = name.split("::").pop() ?? name;
  return leaf.length <= max ? leaf : `${leaf.slice(0, max - 1)}…`;
}

function cellToFinite(value: CellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** JMP Wrap: one common Y scale across all facets for the same Y column. */
function computeSharedYRange(
  dataset: Dataset,
  yColumnId: string,
  panels: PanelSpec[],
  paddingRatio = 0.08
): { min: number; max: number } | undefined {
  const raw = dataset.columnsData[yColumnId] ?? [];
  const values: number[] = [];
  for (const panel of panels) {
    if (panel.y.columnId !== yColumnId) continue;
    const rows =
      panel.rowFilter ??
      Array.from({ length: dataset.rowCount }, (_, i) => i);
    for (const i of rows) {
      const n = cellToFinite(raw[i] ?? null);
      if (n != null) values.push(n);
    }
  }
  if (values.length === 0) return undefined;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    const base = Math.abs(min) || 1;
    min -= base * paddingRatio;
    max += base * paddingRatio;
  } else {
    const span = max - min;
    min -= span * paddingRatio;
    max += span * paddingRatio;
  }
  return { min, max };
}

function buildPanels(
  dataset: Dataset,
  config: GraphConfig
): {
  panels: PanelSpec[];
  gridRows: number;
  gridCols: number;
  mode: FacetMode;
  facetTitle: string | null;
  groupXTitle: string | null;
  groupYTitle: string | null;
  issues: string[];
} {
  const empty = {
    panels: [] as PanelSpec[],
    gridRows: 0,
    gridCols: 0,
    mode: "default" as FacetMode,
    facetTitle: null as string | null,
    groupXTitle: null as string | null,
    groupYTitle: null as string | null,
    issues: [] as string[],
  };

  const xs = config.roles.x;
  const ys = config.roles.y;
  if (xs.length === 0 || ys.length === 0) {
    return empty;
  }

  const wrapRef = config.roles.wrap[0];
  const pageRef = config.roles.page[0];
  const groupXRef = config.roles.groupX[0];
  const groupYRef = config.roles.groupY[0];
  const wrapCol = wrapRef
    ? dataset.columns.find((c) => c.id === wrapRef.columnId) ?? null
    : null;
  const pageCol = pageRef
    ? dataset.columns.find((c) => c.id === pageRef.columnId) ?? null
    : null;
  const groupXCol = groupXRef
    ? dataset.columns.find((c) => c.id === groupXRef.columnId) ?? null
    : null;
  const groupYCol = groupYRef
    ? dataset.columns.find((c) => c.id === groupYRef.columnId) ?? null
    : null;

  const facetOptions = {
    binCount: config.options.overlayBinCount,
    showMissing: config.options.overlayShowMissing,
  };

  // Page: one full-width graph per level, stacked vertically (scroll)
  if (pageCol) {
    const { groups, issues } = createPageGroups(dataset, pageCol, facetOptions);
    const issueMessages = issues.map((i) => i.message);
    if (wrapCol) {
      issueMessages.push("Page is active — Wrap is ignored until Page is cleared.");
    }
    if (groupXCol || groupYCol) {
      issueMessages.push(
        "Page is active — Group X/Y are ignored until Page is cleared."
      );
    }
    if (groups.length === 0) {
      return {
        ...empty,
        mode: "page",
        facetTitle: pageCol.name,
        issues: issueMessages,
      };
    }

    const panels: PanelSpec[] = [];
    const multiY = ys.length > 1;
    let row = 0;
    for (const g of groups) {
      for (const y of ys) {
        for (const x of xs) {
          panels.push({
            key: `page:${pageCol.id}:${g.key}|${y.columnId}|${x.columnId}`,
            x,
            y,
            row,
            col: 0,
            rowFilter: g.rowIndices,
            caption: multiY
              ? `${shortLeaf(g.label, 28)} · ${shortLeaf(y.name, 20)}`
              : shortLeaf(g.label, 48),
            showYAxis: true,
            showXAxis: true,
          });
          row += 1;
        }
      }
    }

    return {
      panels,
      gridRows: panels.length,
      gridCols: 1,
      mode: "page",
      facetTitle: pageCol.name,
      groupXTitle: null,
      groupYTitle: null,
      issues: issueMessages,
    };
  }

  // Group X / Group Y: axis-aligned facets (JMP-style columns / rows)
  if (groupXCol || groupYCol) {
    const issueMessages: string[] = [];
    if (wrapCol) {
      issueMessages.push(
        "Group X/Y are active — Wrap is ignored until Group is cleared."
      );
    }

    const gxResult = groupXCol
      ? createGroupXGroups(dataset, groupXCol, facetOptions)
      : { groups: [createAllGroup(dataset)], issues: [] };
    const gyResult = groupYCol
      ? createGroupYGroups(dataset, groupYCol, facetOptions)
      : { groups: [createAllGroup(dataset)], issues: [] };
    issueMessages.push(...gxResult.issues.map((i) => i.message));
    issueMessages.push(...gyResult.issues.map((i) => i.message));

    const gxGroups = gxResult.groups;
    const gyGroups = gyResult.groups;
    if (gxGroups.length === 0 || gyGroups.length === 0) {
      return {
        ...empty,
        mode: "group",
        facetTitle: groupXCol?.name ?? groupYCol?.name ?? null,
        groupXTitle: groupXCol?.name ?? null,
        groupYTitle: groupYCol?.name ?? null,
        issues: issueMessages,
      };
    }

    const panels: PanelSpec[] = [];
    const multiY = ys.length > 1;
    const hasGx = Boolean(groupXCol);
    const hasGy = Boolean(groupYCol);

    // Rows: Group Y levels × Y variables; Cols: Group X levels × X variables
    let row = 0;
    for (const gy of gyGroups) {
      for (const y of ys) {
        let col = 0;
        for (const gx of gxGroups) {
          for (const x of xs) {
            const rows = intersectRowIndices(gx.rowIndices, gy.rowIndices);
            const parts: string[] = [];
            if (hasGx && !isAllGroup(gx)) parts.push(shortLeaf(gx.label, 28));
            if (multiY) parts.push(shortLeaf(y.name, 18));
            panels.push({
              key: `group:${groupXCol?.id ?? "_"}:${gx.key}|${groupYCol?.id ?? "_"}:${gy.key}|${y.columnId}|${x.columnId}`,
              x,
              y,
              row,
              col,
              rowFilter: rows,
              // Group X: level name across the top of each column
              caption:
                hasGx && !isAllGroup(gx)
                  ? parts.join(" · ") || shortLeaf(gx.label, 40)
                  : multiY
                    ? shortLeaf(y.name, 36)
                    : undefined,
              // Group Y: level name on the right strip
              groupYLabel:
                hasGy && !isAllGroup(gy)
                  ? multiY
                    ? `${shortLeaf(gy.label, 28)} · ${shortLeaf(y.name, 16)}`
                    : shortLeaf(gy.label, 48)
                  : undefined,
              // Y chrome is drawn in a shared left rail so every plot is the same width
              showYAxis: false,
              showXAxis: false, // filled after grid size known
            });
            col += 1;
          }
        }
        row += 1;
      }
    }

    const gridRows = row;
    const gridCols = panels.length > 0 ? Math.max(...panels.map((p) => p.col)) + 1 : 0;
    for (const p of panels) {
      p.showXAxis = p.row === gridRows - 1;
      p.showYAxis = false;
    }

    return {
      panels,
      gridRows,
      gridCols,
      mode: "group",
      facetTitle: groupXCol?.name ?? groupYCol?.name ?? null,
      groupXTitle: groupXCol?.name ?? null,
      groupYTitle: groupYCol?.name ?? null,
      issues: issueMessages,
    };
  }

  if (wrapCol) {
    const { groups, issues } = createWrapGroups(dataset, wrapCol, facetOptions);
    const issueMessages = issues.map((i) => i.message);
    if (groups.length === 0) {
      return {
        ...empty,
        mode: "wrap",
        facetTitle: wrapCol.name,
        issues: issueMessages,
      };
    }

    const panels: PanelSpec[] = [];
    const multiY = ys.length > 1;
    for (const y of ys) {
      for (const g of groups) {
        for (const x of xs) {
          panels.push({
            key: `wrap:${wrapCol.id}:${g.key}|${y.columnId}|${x.columnId}`,
            x,
            y,
            row: 0,
            col: 0,
            rowFilter: g.rowIndices,
            caption: multiY
              ? `${shortLeaf(g.label, 22)} · ${shortLeaf(y.name, 18)}`
              : shortLeaf(g.label, 40),
          });
        }
      }
    }

    const { cols, rows } = wrapGridSize(panels.length, WRAP_GRID_COLS);
    panels.forEach((p, i) => {
      p.row = Math.floor(i / cols);
      p.col = i % cols;
    });

    const occupied = new Set(panels.map((p) => `${p.row},${p.col}`));
    const x0 = xs[0]!;
    const y0 = ys[0]!;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const key = `${r},${c}`;
        if (occupied.has(key)) continue;
        panels.push({
          key: `wrap:empty:${r}:${c}`,
          x: x0,
          y: y0,
          row: r,
          col: c,
          empty: true,
          rowFilter: [],
        });
      }
    }

    for (const p of panels) {
      p.showYAxis = p.col === 0;
      p.showXAxis = p.row === rows - 1;
    }

    return {
      panels,
      gridRows: rows,
      gridCols: cols,
      mode: "wrap",
      facetTitle: wrapCol.name,
      groupXTitle: null,
      groupYTitle: null,
      issues: issueMessages,
    };
  }

  const panels: PanelSpec[] = [];
  ys.forEach((y, row) => {
    xs.forEach((x, col) => {
      panels.push({
        key: `${y.columnId}__${x.columnId}`,
        x,
        y,
        row,
        col,
      });
    });
  });
  return {
    panels,
    gridRows: ys.length,
    gridCols: xs.length,
    mode: "default",
    facetTitle: null,
    groupXTitle: null,
    groupYTitle: null,
    issues: [],
  };
}

function panelConfig(
  base: GraphConfig,
  x: ColumnRef,
  y: ColumnRef,
  options?: {
    /**
     * Multi-Y stack: each panel must autoscale its own Y.
     * A shared manual range (from zoom on the first panel) would clip other Ys.
     */
    independentYScale?: boolean;
  }
): GraphConfig {
  const config = ensureGraphConfig(base);
  const yAxis = options?.independentYScale
    ? {
        ...config.axes.y,
        scale: {
          ...config.axes.y.scale,
          rangeMode: "auto" as const,
          minimum: null,
          maximum: null,
        },
        appearance: {
          ...config.axes.y.appearance,
          title: "",
        },
      }
    : config.axes.y;

  return {
    ...config,
    roles: {
      ...config.roles,
      x: [x],
      y: [y],
      // Avoid nesting facets inside each cell
      wrap: [],
      page: [],
    },
    axes: {
      ...config.axes,
      y: yAxis,
    },
    options: {
      ...config.options,
      titleText: "",
    },
  };
}

function hitAxis(hostWidth: number, hostHeight: number, offsetX: number, offsetY: number): AxisId | null {
  const yStrip = Math.max(96, hostWidth * 0.18);
  const xStrip = Math.max(72, hostHeight * 0.2);
  const onY = offsetX <= yStrip;
  const onX = offsetY >= hostHeight - xStrip;
  if (onY && !onX) return "y";
  if (onX && !onY) return "x";
  if (onY && onX) {
    return offsetX / yStrip < (hostHeight - offsetY) / xStrip ? "y" : "x";
  }
  return null;
}

function ChartPanel({
  dataset,
  config,
  layout,
  notifyIssues,
}: {
  dataset: Dataset;
  config: GraphConfig;
  layout?: PanelLayout;
  notifyIssues: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReactECharts>(null);
  const notify = usePreferenceStore((s) => s.notify);
  const lastIssues = useRef("");
  const zoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openContextMenu = useAxisUiStore((s) => s.openContextMenu);
  const openSettings = useAxisUiStore((s) => s.openSettings);
  const patchAxis = useGraphStore((s) => s.patchAxis);

  const built = useMemo(
    () => buildChartOption(dataset, config, layout),
    [dataset, config, layout]
  );

  const stackedPanels = (layout?.rowCount ?? 1) > 1 || (layout?.colCount ?? 1) > 1;
  /** Multi-Y / facet grids must not write one panel’s Y zoom into the global axis. */
  const lockGlobalYZoom = stackedPanels || Boolean(layout?.sharedYRange);

  useEffect(() => {
    if (!notifyIssues) return;
    const key = built.issues.map((i) => `${i.level}:${i.message}`).join("|");
    if (!key || key === lastIssues.current) return;
    lastIssues.current = key;
    for (const issue of built.issues.slice(0, 2)) {
      notify(
        issue.level === "error" ? "error" : issue.level === "warning" ? "warning" : "info",
        issue.message
      );
    }
  }, [built.issues, notify, notifyIssues]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const resize = () => chartRef.current?.getEchartsInstance()?.resize();
    resize();
    const raf = requestAnimationFrame(() => resize());
    const raf2 = requestAnimationFrame(() => resize());
    const observer = new ResizeObserver(() => resize());
    observer.observe(host);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf2);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [built.option]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const resolveAxis = (ev: MouseEvent): AxisId | null => {
      const rect = host.getBoundingClientRect();
      return hitAxis(rect.width, rect.height, ev.clientX - rect.left, ev.clientY - rect.top);
    };

    const onContextMenu = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const axis = resolveAxis(ev);
      openContextMenu(axis, ev.clientX, ev.clientY);
    };

    const onDblClick = (ev: MouseEvent) => {
      const axis = resolveAxis(ev);
      if (axis) {
        ev.preventDefault();
        openSettings(axis);
      }
    };

    host.addEventListener("contextmenu", onContextMenu);
    host.addEventListener("dblclick", onDblClick);

    const chart = chartRef.current?.getEchartsInstance();
    const onDataZoom = () => {
      if (!chart) return;
      const opt = chart.getOption() as {
        xAxis?: Array<{ min?: number; max?: number }>;
        yAxis?: Array<{ min?: number; max?: number }>;
      };
      const xA = Array.isArray(opt.xAxis) ? opt.xAxis[0] : undefined;
      const yA = Array.isArray(opt.yAxis) ? opt.yAxis[0] : undefined;

      if (zoomTimer.current) clearTimeout(zoomTimer.current);
      zoomTimer.current = setTimeout(() => {
        if (
          typeof xA?.min === "number" &&
          typeof xA?.max === "number" &&
          Number.isFinite(xA.min) &&
          Number.isFinite(xA.max)
        ) {
          patchAxis("x", {
            scale: {
              ...ensureGraphConfig(useGraphStore.getState().config).axes.x.scale,
              rangeMode: "manual",
              minimum: xA.min,
              maximum: xA.max,
            },
          });
        }
        // Multi-Y / facets: each panel (or sharedYRange) owns Y — never stamp global axes.y
        if (
          !lockGlobalYZoom &&
          typeof yA?.min === "number" &&
          typeof yA?.max === "number" &&
          Number.isFinite(yA.min) &&
          Number.isFinite(yA.max)
        ) {
          patchAxis("y", {
            scale: {
              ...ensureGraphConfig(useGraphStore.getState().config).axes.y.scale,
              rangeMode: "manual",
              minimum: yA.min,
              maximum: yA.max,
            },
          });
        }
        useHistoryStore.getState().push({
          graph: structuredClone(useGraphStore.getState().config),
          label: "Axis zoom",
        });
      }, 300);
    };

    if (chart) {
      chart.on("datazoom", onDataZoom);
    }

    return () => {
      host.removeEventListener("contextmenu", onContextMenu);
      host.removeEventListener("dblclick", onDblClick);
      if (chart) chart.off("datazoom", onDataZoom);
      if (zoomTimer.current) clearTimeout(zoomTimer.current);
    };
  }, [built.option, openContextMenu, openSettings, patchAxis, lockGlobalYZoom]);

  if (!built.option) {
    return <div className="canvas-hint panel-hint">No plot for this panel</div>;
  }

  return (
    <div ref={hostRef} className="chart-host">
      <ReactECharts
        ref={chartRef}
        option={built.option}
        style={{ width: "100%", height: "100%" }}
        notMerge
        lazyUpdate={false}
        opts={{ renderer: "canvas" }}
      />
    </div>
  );
}

/** Left-rail Y axis for Group facets — keeps every plot column the same width. */
function GroupSharedYAxis({
  yName,
  range,
  showCaptionSpacer,
  isBottomRow,
  compactChrome,
  showAxisTitle,
}: {
  yName: string;
  range?: { min: number; max: number };
  showCaptionSpacer: boolean;
  isBottomRow: boolean;
  /** Many Group Y rows — shrink X-axis strip so rows still fit. */
  compactChrome?: boolean;
  /** Only the center rail cell shows the Y variable name (JMP-style). */
  showAxisTitle?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReactECharts>(null);
  const bottomPad = isBottomRow ? (compactChrome ? 26 : 40) : 4;

  const option = useMemo(
    () => ({
      animation: false,
      backgroundColor: "#ffffff",
      grid: {
        left: compactChrome ? 44 : 50,
        right: 2,
        top: 4,
        bottom: bottomPad,
        containLabel: false,
      },
      xAxis: {
        type: "value" as const,
        show: false,
        min: 0,
        max: 1,
      },
      yAxis: {
        type: "value" as const,
        min: range?.min,
        max: range?.max,
        scale: true,
        name: showAxisTitle ? shortLeaf(yName, 22) : undefined,
        nameLocation: "middle" as const,
        nameGap: compactChrome ? 32 : 40,
        nameTextStyle: {
          fontSize: 9,
          overflow: "truncate" as const,
          width: 88,
        },
        axisLabel: { fontSize: compactChrome ? 9 : 10, hideOverlap: true, color: "#333" },
        axisTick: { show: true },
        axisLine: { show: true },
        splitLine: { show: false },
      },
      series: [
        {
          type: "scatter" as const,
          data: [] as number[][],
          silent: true,
          symbolSize: 0,
        },
      ],
    }),
    [yName, range?.min, range?.max, bottomPad, compactChrome, showAxisTitle]
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const resize = () => chartRef.current?.getEchartsInstance()?.resize();
    resize();
    const raf = requestAnimationFrame(() => resize());
    const observer = new ResizeObserver(() => resize());
    observer.observe(host);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [option]);

  return (
    <div className="chart-panel-cell chart-panel-cell--group chart-panel-cell--group-yaxis">
      {showCaptionSpacer ? (
        <div className="chart-panel-caption chart-panel-caption--spacer" aria-hidden>
          {"\u00A0"}
        </div>
      ) : null}
      <div ref={hostRef} className="chart-host">
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ width: "100%", height: "100%" }}
          notMerge
          lazyUpdate
          opts={{ renderer: "canvas" }}
        />
      </div>
    </div>
  );
}

export function GraphCanvas({ dataset, config }: GraphCanvasProps) {
  const cfg = ensureGraphConfig(config);
  const built = useMemo(
    () => (dataset ? buildPanels(dataset, cfg) : null),
    [dataset, cfg]
  );
  const panels = built?.panels ?? [];
  const stacked = panels.length > 1;
  const mode = built?.mode ?? "default";
  const isWrap = mode === "wrap";
  const isPage = mode === "page";
  const isGroup = mode === "group";
  const isFacet = isWrap || isPage || isGroup;
  const showSideLegend = Boolean(
    dataset && hasExternalSeriesLegend(dataset, cfg) && !isFacet
  );

  const notify = usePreferenceStore((s) => s.notify);
  const wrapIssuesKey = useRef("");
  useEffect(() => {
    if (!built?.issues.length) return;
    const key = built.issues.join("|");
    if (key === wrapIssuesKey.current) return;
    wrapIssuesKey.current = key;
    notify("warning", built.issues[0]!);
  }, [built?.issues, notify]);

  const sharedYByColumn = useMemo(() => {
    if (!dataset || !isFacet) return new Map<string, { min: number; max: number }>();
    const map = new Map<string, { min: number; max: number }>();
    for (const y of cfg.roles.y) {
      const range = computeSharedYRange(dataset, y.columnId, panels);
      if (range) map.set(y.columnId, range);
    }
    return map;
  }, [dataset, isFacet, cfg.roles.y, panels]);

  const nRows = built?.gridRows ?? 0;
  const nCols = built?.gridCols ?? 0;
  const groupYTitle = built?.groupYTitle ?? null;
  const hasGroupYStrip = isGroup && Boolean(groupYTitle);

  const groupYRowLabels = useMemo(() => {
    if (!hasGroupYStrip || nRows === 0) return [] as string[];
    const labels: string[] = Array.from({ length: nRows }, () => "");
    for (const p of panels) {
      if (p.groupYLabel && !labels[p.row]) labels[p.row] = p.groupYLabel;
    }
    return labels;
  }, [hasGroupYStrip, nRows, panels]);

  if (!dataset) {
    return <div className="canvas-hint">Drag variables into drop zones</div>;
  }

  if (panels.length === 0) {
    return <div className="canvas-hint">Drag variables into drop zones</div>;
  }

  const suppressLegend = stacked || showSideLegend || isFacet;
  const facetTitle = built?.facetTitle ?? null;
  const groupXTitle = built?.groupXTitle ?? null;
  const compactGroupChrome = isGroup && nRows >= 5;
  // Multi-Y linked stack (not Wrap/Group/Page): each row autoscales its own Y
  const independentYScale = !isFacet && nRows > 1;

  const renderPanel = (panel: PanelSpec, i: number) => (
    <div
      key={panel.key}
      className={`chart-panel-cell ${
        isPage
          ? "chart-panel-cell--page"
          : isGroup
            ? `chart-panel-cell--group${
                groupXTitle ? " chart-panel-cell--group-x" : ""
              }${groupYTitle ? " chart-panel-cell--group-y" : ""}`
            : isWrap
              ? `chart-panel-cell--wrap${panel.empty ? " chart-panel-cell--wrap-empty" : ""}`
              : panel.row < nRows - 1
                ? "chart-panel-cell--stack"
                : "chart-panel-cell--base"
      }`}
    >
      {panel.caption && !panel.empty ? (
        <div className="chart-panel-caption" title={panel.caption}>
          {panel.caption}
        </div>
      ) : isWrap && panel.empty && panel.showXAxis ? (
        <div className="chart-panel-caption chart-panel-caption--spacer" aria-hidden>
          {"\u00A0"}
        </div>
      ) : null}
      <ChartPanel
        dataset={dataset}
        config={panelConfig(cfg, panel.x, panel.y, { independentYScale })}
        layout={{
          row: panel.row,
          col: panel.col,
          rowCount: nRows,
          colCount: nCols,
          suppressLegend: true,
          rowFilter: panel.rowFilter,
          sharedYRange: sharedYByColumn.get(panel.y.columnId),
          showXAxis: isFacet
            ? Boolean(panel.showXAxis)
            : panel.row === nRows - 1,
          showYAxis: isWrap || isGroup ? Boolean(panel.showYAxis) : true,
          whiteBackground: isFacet,
          allowEmptyAxes: Boolean(panel.empty),
        }}
        notifyIssues={i === 0 && !panel.empty}
      />
    </div>
  );

  const plot =
    panels.length === 1 && !isFacet ? (
      <ChartPanel
        dataset={dataset}
        config={panelConfig(cfg, panels[0]!.x, panels[0]!.y)}
        layout={
          suppressLegend
            ? {
                row: 0,
                col: 0,
                rowCount: 1,
                colCount: 1,
                suppressLegend: true,
                rowFilter: panels[0]!.rowFilter,
              }
            : panels[0]!.rowFilter
              ? {
                  row: 0,
                  col: 0,
                  rowCount: 1,
                  colCount: 1,
                  rowFilter: panels[0]!.rowFilter,
                }
              : undefined
        }
        notifyIssues
      />
    ) : isPage ? (
      <div className="chart-page-root">
        {facetTitle ? (
          <div className="chart-wrap-title" title={facetTitle}>
            <span className="chart-wrap-title__text">{shortLeaf(facetTitle, 48)}</span>
          </div>
        ) : null}
        <div
          className="chart-page-stack"
          aria-label={`Page panels by ${facetTitle ?? "Page"}`}
        >
          {panels.map((panel, i) => renderPanel(panel, i))}
        </div>
      </div>
    ) : isGroup ? (
      <div className="chart-group-root">
        {groupXTitle ? (
          <div className="chart-wrap-title" title={groupXTitle}>
            <span className="chart-wrap-title__text">
              {shortLeaf(groupXTitle, 48)}
            </span>
          </div>
        ) : null}
        <div
          className={`chart-group-body${hasGroupYStrip ? " chart-group-body--with-y" : ""}`}
        >
          <div
            className="chart-panel-grid chart-panel-grid--linked chart-panel-grid--group"
            style={{
              // Fit all Group Y rows in one viewport — shrink rather than scroll
              gridTemplateRows: `repeat(${nRows}, minmax(0, 1fr))`,
              // Extra first column: shared Y axis so all plot columns are equal width
              gridTemplateColumns: `56px repeat(${nCols}, minmax(0, 1fr))`,
            }}
            aria-label={`Group panels ${nRows}×${nCols}`}
          >
            {Array.from({ length: nRows }, (_, row) => {
              const rowPanels = panels
                .filter((p) => p.row === row)
                .sort((a, b) => a.col - b.col);
              const yRef = rowPanels[0]?.y;
              const yRange = yRef
                ? sharedYByColumn.get(yRef.columnId)
                : undefined;
              const needCaptionSpacer = rowPanels.some((p) => Boolean(p.caption));
              return (
                <div key={`group-row-${row}`} className="chart-group-row-contents">
                  <GroupSharedYAxis
                    yName={yRef?.name ?? "Y"}
                    range={yRange}
                    showCaptionSpacer={needCaptionSpacer}
                    isBottomRow={row === nRows - 1}
                    compactChrome={compactGroupChrome}
                    showAxisTitle={row === Math.floor((nRows - 1) / 2)}
                  />
                  {rowPanels.map((panel, i) => renderPanel(panel, row * nCols + i))}
                </div>
              );
            })}
          </div>
          {hasGroupYStrip ? (
            <div className="chart-group-y-rail" aria-label={`Group Y: ${groupYTitle}`}>
              <div
                className="chart-group-y-rail__levels"
                style={{ gridTemplateRows: `repeat(${nRows}, minmax(0, 1fr))` }}
              >
                {groupYRowLabels.map((label, ri) => (
                  <div
                    key={`gy-${ri}-${label}`}
                    className="chart-group-y-label"
                    title={label}
                  >
                    <span className="chart-group-y-label__text">{label}</span>
                  </div>
                ))}
              </div>
              <div className="chart-group-y-rail__title" title={groupYTitle!}>
                <span>{shortLeaf(groupYTitle!, 36)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    ) : (
      <div className={`chart-wrap-root ${isWrap ? "chart-wrap-root--trellis" : ""}`}>
        {facetTitle ? (
          <div className="chart-wrap-title" title={facetTitle}>
            <span className="chart-wrap-title__text">{shortLeaf(facetTitle, 48)}</span>
          </div>
        ) : null}
        <div
          className={`chart-panel-grid chart-panel-grid--linked ${
            isWrap ? "chart-panel-grid--wrap" : ""
          }`}
          style={{
            gridTemplateRows: isWrap
              ? `repeat(${nRows}, minmax(160px, 1fr))`
              : `repeat(${nRows}, minmax(72px, 1fr))`,
            gridTemplateColumns: `repeat(${nCols}, minmax(0, 1fr))`,
          }}
          aria-label={
            isWrap
              ? `Wrap panels by ${facetTitle ?? "Wrap"}`
              : `Linked graph panels ${nRows}×${nCols}`
          }
        >
          {panels.map((panel, i) => renderPanel(panel, i))}
        </div>
      </div>
    );

  if (!showSideLegend) return plot;

  return (
    <div className="chart-with-legend">
      <div className="chart-with-legend__plot">{plot}</div>
      <ColorLegendPanel dataset={dataset} config={cfg} />
    </div>
  );
}
