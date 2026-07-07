"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AxisSettingsDialog } from "@/components/mini-jmp/AxisSettingsDialog";
import { colorForSeries, computeLinearTrend, sortColorKeys } from "@/lib/mini-jmp-chart-data";
import { applyAxisRange, extentFromPoints, guideLineColor } from "@/lib/mini-jmp-axis";
import { applyPointJitter } from "@/lib/mini-jmp-perf";
import type {
  MiniJmpAxisSettings,
  MiniJmpBoxPlotGroup,
  MiniJmpCategoryPoint,
  MiniJmpChartAxisConfig,
  MiniJmpChartOptions,
  MiniJmpGraphType,
  MiniJmpHeatmapCell,
  MiniJmpHistogramBin,
  MiniJmpParetoPoint,
  MiniJmpPointsMode,
  MiniJmpScatterPoint,
} from "@/lib/mini-jmp-types";

export type MiniJmpChartModel =
  | { type: "histogram"; histogram: MiniJmpHistogramBin[]; column: string }
  | { type: "pareto"; points: MiniJmpParetoPoint[]; column: string }
  | {
      type: "heatmap";
      cells: MiniJmpHeatmapCell[];
      xCategories: string[];
      yCategories: string[];
      maxValue: number;
      xLabel: string;
      yLabel: string;
    }
  | {
      type: "bar";
      categories: MiniJmpCategoryPoint[];
      xLabel: string;
      yLabel: string;
    }
  | {
      type: "box";
      boxes: MiniJmpBoxPlotGroup[];
      xLabel: string;
      yLabel: string;
    }
  | {
      type: "scatter" | "line";
      mode: MiniJmpPointsMode;
      points: MiniJmpScatterPoint[];
      xCategories: string[];
      yCategories: string[];
      pointTotal?: number;
      xCol: { kind: string; name: string };
      yCol: { kind: string; name: string };
      xLabel: string;
      yLabel: string;
    };

interface GraphBuilderCanvasProps {
  chartModel: MiniJmpChartModel | null;
  renderOk: boolean;
  renderMessage: string;
  graphType: MiniJmpGraphType;
  options: MiniJmpChartOptions;
  axisConfig: MiniJmpChartAxisConfig;
  onAxisSettingsChange: (axis: "x" | "y", settings: MiniJmpAxisSettings) => void;
  xColumn: string | null;
  yColumn: string | null;
  colorColumn: string | null;
  groupColumn?: string | null;
  labelColumn?: string | null;
  selectedRowIndex?: number | null;
  onRowSelect?: (index: number | null) => void;
  chartRef?: React.RefObject<HTMLDivElement | null>;
}

const JMP_CHART = {
  frameBg: "#f0f0f0",
  plotBg: "#ffffff",
  border: "#b8b8b8",
  grid: "#d0d0d0",
  axis: "#333333",
  title: "#222222",
  defaultPoint: "#000000",
  pointRadius: 4.5,
  barFill: "#4a7ab8",
} as const;

function heatmapColor(value: number, max: number): string {
  const t = max > 0 ? value / max : 0;
  const r = Math.round(240 - t * 200);
  const b = Math.round(100 + t * 155);
  return `rgb(${r},180,${b})`;
}

function HeatmapChart({
  chartRef,
  chartModel,
}: {
  chartRef?: React.RefObject<HTMLDivElement | null>;
  chartModel: Extract<MiniJmpChartModel, { type: "heatmap" }>;
}) {
  const { cells, xCategories, yCategories, maxValue, xLabel, yLabel } = chartModel;
  return (
    <ChartFrame
      chartRef={chartRef}
      title={`${yLabel} × ${xLabel} Heatmap`}
    >
      <div className="flex h-full min-h-[200px] flex-col p-2 gap-1">
        <div
          className="flex-1 min-h-0 grid gap-px bg-slate-200"
          style={{
            gridTemplateColumns: `repeat(${Math.max(xCategories.length, 1)}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${Math.max(yCategories.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((cell) => (
            <div
              key={`${cell.x}-${cell.y}`}
              title={`${cell.x} × ${cell.y}: ${cell.value}`}
              className="min-h-[6px] flex items-center justify-center text-[8px] text-slate-800"
              style={{ backgroundColor: heatmapColor(cell.value, maxValue) }}
            >
              {cell.value > 0 && xCategories.length <= 20 ? cell.value : ""}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-slate-500 px-1">
          <span>{xLabel} →</span>
          <span>↑ {yLabel}</span>
          <span>max {maxValue}</span>
        </div>
      </div>
    </ChartFrame>
  );
}

function JmpScatterDot(props: unknown) {
  const p = props as {
    cx?: number;
    cy?: number;
    payload?: { fill?: string; size?: number; i?: number };
    fillOpacity?: number;
    selectedRowIndex?: number;
  };
  const { cx, cy, payload, fillOpacity = 1, selectedRowIndex } = p;
  const fill = payload?.fill ?? JMP_CHART.defaultPoint;
  const r = JMP_CHART.pointRadius * (payload?.size ?? 1);
  const selected = selectedRowIndex != null && payload?.i === selectedRowIndex;
  if (cx == null || cy == null) {
    return <circle cx={0} cy={0} r={0} fill="none" />;
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      fillOpacity={fillOpacity}
      stroke={selected ? "#f59e0b" : "none"}
      strokeWidth={selected ? 2.5 : 0}
    />
  );
}

function ChartFrame({
  chartRef,
  title,
  subtitle,
  children,
}: {
  chartRef?: React.RefObject<HTMLDivElement | null>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={chartRef}
      className="flex h-full min-h-0 flex-1 flex-col rounded border p-2"
      style={{
        backgroundColor: JMP_CHART.frameBg,
        borderColor: JMP_CHART.border,
      }}
    >
      <p
        className="mb-2 truncate text-center text-sm font-medium"
        style={{ color: JMP_CHART.title }}
      >
        {title}
      </p>
      {subtitle && (
        <p className="-mt-1 mb-2 text-center text-[10px] text-gray-500">{subtitle}</p>
      )}
      <div
        className="flex-1 min-h-0 rounded border"
        style={{ backgroundColor: JMP_CHART.plotBg, borderColor: "#dcdcdc" }}
      >
        {children}
      </div>
    </div>
  );
}

function formatXTick(v: number, isTime: boolean): string {
  if (!Number.isFinite(v)) return "";
  if (isTime) {
    const d = new Date(v);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return String(Math.round(v * 100) / 100);
}

function AxisPreviewCanvas({
  xColumn,
  yColumn,
  renderMessage,
  options,
  chartRef,
}: {
  xColumn: string | null;
  yColumn: string | null;
  renderMessage: string;
  options: MiniJmpChartOptions;
  chartRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const gridStroke = options.showGrid ? JMP_CHART.grid : "transparent";
  const waitingFor =
    !xColumn && yColumn
      ? "X 변수를 지정하세요"
      : xColumn && !yColumn
        ? "Y 변수를 지정하세요"
        : renderMessage;

  return (
    <ChartFrame chartRef={chartRef} title={`${yColumn ?? "Y"} vs ${xColumn ?? "X"}`}>
      <div className="relative h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={[{ x: 0.5, y: 0.5 }]}
            margin={{ top: 12, right: 20, bottom: 32, left: 52 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 1]}
              tick={{ fontSize: 10, fill: JMP_CHART.axis }}
              axisLine={{ stroke: JMP_CHART.axis }}
              label={{
                value: xColumn ?? "X",
                position: "insideBottom",
                offset: -2,
                fill: JMP_CHART.axis,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 10, fill: JMP_CHART.axis }}
              axisLine={{ stroke: JMP_CHART.axis }}
              label={{
                value: yColumn ?? "Y",
                angle: -90,
                position: "insideLeft",
                offset: 12,
                fill: JMP_CHART.axis,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        {waitingFor && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
            <p className="rounded-md bg-white/90 px-3 py-2 text-center text-sm text-gray-600 border border-gray-300">
              {waitingFor}
            </p>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}

function PointsPlotChart({
  chartModel,
  options,
  axisConfig,
  onAxisSettingsChange,
  colorColumn,
  groupColumn,
  labelColumn,
  selectedRowIndex,
  onRowSelect,
  chartRef,
  gridStroke,
}: {
  chartModel: Extract<MiniJmpChartModel, { type: "scatter" | "line" }>;
  options: MiniJmpChartOptions;
  axisConfig: MiniJmpChartAxisConfig;
  onAxisSettingsChange: (axis: "x" | "y", settings: MiniJmpAxisSettings) => void;
  colorColumn: string | null;
  groupColumn?: string | null;
  labelColumn?: string | null;
  selectedRowIndex?: number | null;
  onRowSelect?: (index: number | null) => void;
  chartRef?: React.RefObject<HTMLDivElement | null>;
  gridStroke: string;
}) {
  const [axisDialog, setAxisDialog] = useState<"x" | "y" | null>(null);
  const isTime = chartModel.xCol.kind === "datetime";
  const mode = chartModel.mode ?? "numeric";
  const xCats = chartModel.xCategories;
  const yCats = chartModel.yCategories;
  const deferredJitter = useDeferredValue(options.jitter ?? 0.45);

  const rawColorKeys = useMemo(
    () =>
      [
        ...new Set(
          chartModel.points
            .map((p) => p.color ?? p.group)
            .filter((c): c is string => Boolean(c))
        ),
      ],
    [chartModel.points]
  );

  const colorOrderHint =
    xCats.length > 0 && rawColorKeys.every((k) => xCats.includes(k))
      ? xCats
      : undefined;
  const colorKeys = useMemo(
    () => sortColorKeys(rawColorKeys, colorOrderHint),
    [rawColorKeys, colorOrderHint]
  );
  const useColor = Boolean((colorColumn || groupColumn) && colorKeys.length > 0);
  const alpha = options.pointAlpha ?? 1;

  const lineGroups = useMemo(() => {
    if (chartModel.type !== "line") return null;
    const field = groupColumn ? "group" : colorColumn ? "color" : null;
    if (!field) return null;
    const keys = sortColorKeys([
      ...new Set(
        chartModel.points
          .map((p) => p[field])
          .filter((c): c is string => Boolean(c))
      ),
    ]);
    return keys.map((key, i) => ({
      key,
      color: colorForSeries(key, i),
      data: chartModel.points
        .filter((p) => p[field] === key)
        .sort((a, b) => a.x - b.x),
    }));
  }, [chartModel.type, chartModel.points, groupColumn, colorColumn]);

  const displayPoints = useMemo(() => {
    const jittered = applyPointJitter(
      chartModel.points,
      mode,
      deferredJitter,
      xCats.length,
      yCats.length
    );
    if (!useColor) {
      return jittered.map((p) => ({ ...p, fill: JMP_CHART.defaultPoint }));
    }
    const colorMap = new Map(
      colorKeys.map((key, i) => [key, colorForSeries(key, i)])
    );
    return jittered.map((p) => {
      const seriesKey = p.color ?? p.group;
      return {
        ...p,
        fill: seriesKey ? colorMap.get(seriesKey) ?? JMP_CHART.defaultPoint : JMP_CHART.defaultPoint,
      };
    });
  }, [chartModel.points, mode, deferredJitter, xCats.length, yCats.length, useColor, colorKeys]);

  const trendPoints = useMemo(() => {
    if (!options.showTrendLine || mode !== "numeric") return null;
    return computeLinearTrend(displayPoints);
  }, [options.showTrendLine, mode, displayPoints]);

  const categoricalX =
    mode === "x-only" || mode === "categorical" || mode === "cat-numeric";
  const categoricalY = mode === "categorical";

  const baseXDomain: [number, number] | ["dataMin", "dataMax"] =
    categoricalX && xCats.length > 0
      ? [-0.5, xCats.length - 0.5]
      : ["dataMin", "dataMax"];
  const baseYDomain: [number, number] | ["dataMin", "dataMax"] =
    mode === "x-only"
      ? [0, 1]
      : categoricalY && yCats.length > 0
        ? [-0.5, yCats.length - 0.5]
        : ["dataMin", "dataMax"];

  const xExtent = useMemo(() => {
    if (categoricalX && xCats.length > 0) {
      return { min: -0.5, max: xCats.length - 0.5 };
    }
    return extentFromPoints(displayPoints, "x");
  }, [displayPoints, categoricalX, xCats.length]);

  const yExtent = useMemo(() => {
    if (mode === "x-only") return { min: 0, max: 1 };
    if (categoricalY && yCats.length > 0) {
      return { min: -0.5, max: yCats.length - 0.5 };
    }
    return extentFromPoints(displayPoints, "y");
  }, [displayPoints, mode, categoricalY, yCats.length]);

  const xDomain = applyAxisRange(baseXDomain, axisConfig.x.range, xExtent);
  const yDomain = applyAxisRange(baseYDomain, axisConfig.y.range, yExtent);

  const yAxisWidth =
    categoricalY && yCats.length > 0
      ? Math.min(220, Math.max(72, ...yCats.map((c) => c.length * 5.5)))
      : 56;

  const truncate = (s: string, max = 28) =>
    s.length > max ? `${s.slice(0, max - 1)}…` : s;

  const scatterTitle = `${chartModel.yLabel} vs ${chartModel.xLabel}${colorColumn ? ` · Color: ${colorColumn}` : ""}`;
  const pointTotal = chartModel.pointTotal ?? chartModel.points.length;
  const downsampleNote =
    pointTotal > chartModel.points.length
      ? `표시 ${chartModel.points.length.toLocaleString()} / 전체 ${pointTotal.toLocaleString()} 포인트 (성능을 위해 샘플링)`
      : undefined;

  const legendBottom = useColor ? 36 : 0;
  const xLabelBottom =
    (categoricalX && xCats.length > 5 ? 56 : 28) + legendBottom;

  const openAxisDialog = (axis: "x" | "y") => (e: React.MouseEvent) => {
    e.preventDefault();
    setAxisDialog(axis);
  };

  return (
    <>
      <ChartFrame chartRef={chartRef} title={scatterTitle} subtitle={downsampleNote}>
        <div className="relative h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={displayPoints}
              margin={{ left: 8, right: 16, bottom: xLabelBottom, top: 8 }}
              onClick={(state) => {
                const pt = state?.activePayload?.[0]?.payload as
                  | MiniJmpScatterPoint
                  | undefined;
                if (pt?.i != null && onRowSelect) {
                  onRowSelect(selectedRowIndex === pt.i ? null : pt.i);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              {axisConfig.x.guideLines.map((line) => {
                const stroke = guideLineColor(line);
                return (
                <ReferenceLine
                  key={line.id}
                  x={line.position}
                  stroke={stroke}
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  ifOverflow="extendDomain"
                  label={
                    line.label
                      ? {
                          value: line.label,
                          position: "insideTopLeft",
                          fontSize: 9,
                          fill: stroke,
                        }
                      : undefined
                  }
                />
              );
              })}
              {axisConfig.y.guideLines.map((line) => {
                const stroke = guideLineColor(line);
                return (
                <ReferenceLine
                  key={line.id}
                  y={line.position}
                  stroke={stroke}
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  ifOverflow="extendDomain"
                  label={
                    line.label
                      ? {
                          value: line.label,
                          position: "insideTopRight",
                          fontSize: 9,
                          fill: stroke,
                        }
                      : undefined
                  }
                />
              );
              })}
              <XAxis
            type="number"
            dataKey="x"
            domain={xDomain}
            ticks={categoricalX ? xCats.map((_, i) => i) : undefined}
            tick={{ fontSize: 9, fill: JMP_CHART.axis }}
            axisLine={{ stroke: JMP_CHART.axis }}
            angle={xCats.length > 5 ? -35 : 0}
            textAnchor={xCats.length > 5 ? "end" : "middle"}
            height={xCats.length > 5 ? 64 : 32}
            interval={0}
            tickFormatter={(v) =>
              categoricalX
                ? truncate(xCats[Math.round(Number(v))] ?? "")
                : formatXTick(v, isTime)
            }
            label={{
              value: chartModel.xLabel,
              position: "insideBottom",
              offset: categoricalX && xCats.length > 5 ? -8 : 0,
              fill: JMP_CHART.axis,
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={yDomain}
            width={yAxisWidth}
            ticks={
              mode === "x-only"
                ? []
                : categoricalY
                  ? yCats.map((_, i) => i)
                  : undefined
            }
            tick={{ fontSize: 9, fill: JMP_CHART.axis }}
            axisLine={{ stroke: JMP_CHART.axis }}
            interval={0}
            tickFormatter={(v) =>
              categoricalY
                ? truncate(yCats[Math.round(Number(v))] ?? "")
                : typeof v === "number"
                  ? String(Math.round(v * 1000) / 1000)
                  : String(v)
            }
            label={{
              value: mode === "x-only" ? "" : chartModel.yLabel,
              angle: -90,
              position: "insideLeft",
              fill: JMP_CHART.axis,
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{ background: "#fff", border: `1px solid ${JMP_CHART.border}`, fontSize: 11 }}
            formatter={(_v: number, _n, p) => {
              const pt = p?.payload as MiniJmpScatterPoint | undefined;
              if (!pt) return ["", ""];
              return [pt.rawY || pt.y, chartModel.yLabel];
            }}
            labelFormatter={(_l, payload) => {
              const pt = (payload?.[0]?.payload ?? {}) as MiniJmpScatterPoint;
              const parts = [
                pt.rawX && `X: ${pt.rawX}`,
                pt.rawY && `Y: ${pt.rawY}`,
                pt.color && `Color: ${pt.color}`,
                pt.group && `Group: ${pt.group}`,
                pt.label && `Label: ${pt.label}`,
                pt.i != null && `Row: ${pt.i + 1}`,
              ].filter(Boolean);
              return parts.join(" · ") || chartModel.xLabel;
            }}
          />
          {useColor && (
            <foreignObject x={0} y="92%" width="100%" height="8%">
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-2">
                {colorKeys.map((key, i) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 text-[10px]"
                    style={{ color: JMP_CHART.axis }}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: colorForSeries(key, i) }}
                    />
                    {key}
                  </span>
                ))}
              </div>
            </foreignObject>
          )}
          {chartModel.type === "line" ? (
            lineGroups && lineGroups.length > 0 ? (
              lineGroups.map((g) => (
                <Line
                  key={g.key}
                  name={g.key}
                  data={g.data}
                  type="monotone"
                  dataKey="y"
                  stroke={g.color}
                  strokeOpacity={alpha}
                  dot={false}
                  isAnimationActive={false}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey="y"
                stroke={JMP_CHART.barFill}
                strokeOpacity={alpha}
                dot={false}
                isAnimationActive={false}
              />
            )
          ) : (
            <Scatter
              data={displayPoints}
              fill={JMP_CHART.defaultPoint}
              fillOpacity={alpha}
              shape={(props: unknown) =>
                JmpScatterDot(
                  Object.assign({}, props, {
                    selectedRowIndex: selectedRowIndex ?? undefined,
                  })
                )
              }
              isAnimationActive={false}
            />
          )}
          {trendPoints && (
            <Line
              data={trendPoints}
              type="linear"
              dataKey="y"
              stroke="#666666"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          )}
            </ComposedChart>
          </ResponsiveContainer>
          <div
            className="absolute bottom-0 left-0 right-0 z-10"
            style={{ height: Math.min(xLabelBottom + 12, 80) }}
            onContextMenu={openAxisDialog("x")}
            title="X축 우클릭 → Range / 구분선 설정"
          />
          <div
            className="absolute top-0 left-0 z-10"
            style={{
              width: yAxisWidth + 12,
              bottom: Math.min(xLabelBottom + 12, 80),
            }}
            onContextMenu={openAxisDialog("y")}
            title="Y축 우클릭 → Range / 구분선 설정"
          />
        </div>
      </ChartFrame>

      <AxisSettingsDialog
        open={axisDialog === "x"}
        axis="x"
        axisLabel={chartModel.xLabel}
        categorical={categoricalX}
        categories={xCats}
        dataExtent={categoricalX ? xExtent : xExtent}
        settings={axisConfig.x}
        onApply={(s) => onAxisSettingsChange("x", s)}
        onClose={() => setAxisDialog(null)}
      />
      <AxisSettingsDialog
        open={axisDialog === "y"}
        axis="y"
        axisLabel={chartModel.yLabel}
        categorical={categoricalY}
        categories={yCats}
        dataExtent={categoricalY ? yExtent : yExtent}
        settings={axisConfig.y}
        onApply={(s) => onAxisSettingsChange("y", s)}
        onClose={() => setAxisDialog(null)}
      />
    </>
  );
}

export const GraphBuilderCanvas = memo(function GraphBuilderCanvas({
  chartModel,
  renderOk,
  renderMessage,
  graphType,
  options,
  axisConfig,
  onAxisSettingsChange,
  xColumn,
  yColumn,
  colorColumn,
  groupColumn,
  labelColumn,
  selectedRowIndex,
  onRowSelect,
  chartRef,
}: GraphBuilderCanvasProps) {
  if (!renderOk || !chartModel) {
    const showPreview =
      (xColumn || yColumn) && graphType !== "scatter";
    if (showPreview) {
      return (
        <AxisPreviewCanvas
          chartRef={chartRef}
          xColumn={xColumn}
          yColumn={yColumn}
          renderMessage={renderMessage}
          options={options}
        />
      );
    }

    return (
      <div
        ref={chartRef}
        className="flex h-full min-h-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-slate-900/80 text-slate-400"
      >
        <div className="text-center px-6">
          <p className="text-lg font-medium text-slate-300">
            Drag variables into drop zones
          </p>
          <p className="text-sm mt-2 text-slate-500">
            {renderMessage || "왼쪽 Column을 X / Y Drop Zone에 배치하세요."}
          </p>
        </div>
      </div>
    );
  }

  const gridStroke = options.showGrid ? JMP_CHART.grid : "transparent";

  if (chartModel.type === "histogram") {
    return (
      <ChartFrame chartRef={chartRef} title={`${chartModel.column} Distribution`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartModel.histogram}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: JMP_CHART.axis }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: JMP_CHART.axis }} />
            <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${JMP_CHART.border}` }} />
            <Bar dataKey="count" fill={JMP_CHART.barFill} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    );
  }

  if (chartModel.type === "bar") {
    return (
      <ChartFrame chartRef={chartRef} title={`${chartModel.yLabel} vs ${chartModel.xLabel}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartModel.categories}
            margin={{
              left: 8,
              right: 16,
              bottom: chartModel.categories.length > 5 ? 56 : 32,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              type="category"
              dataKey="category"
              tick={{ fontSize: 9, fill: JMP_CHART.axis }}
              angle={chartModel.categories.length > 5 ? -35 : 0}
              textAnchor={chartModel.categories.length > 5 ? "end" : "middle"}
              interval={0}
              height={chartModel.categories.length > 5 ? 64 : 32}
              label={{
                value: chartModel.xLabel,
                position: "insideBottom",
                offset: chartModel.categories.length > 5 ? -8 : 0,
                fill: JMP_CHART.axis,
                fontSize: 10,
              }}
            />
            <YAxis
              type="number"
              tick={{ fontSize: 10, fill: JMP_CHART.axis }}
              label={{
                value: chartModel.yLabel,
                angle: -90,
                position: "insideLeft",
                fill: JMP_CHART.axis,
                fontSize: 10,
              }}
            />
            <Tooltip
              contentStyle={{ background: "#fff", border: `1px solid ${JMP_CHART.border}` }}
              formatter={(v: number, _n, p) => [
                `${v} (n=${(p?.payload as { count?: number })?.count ?? 0})`,
                chartModel.yLabel,
              ]}
            />
            <Bar dataKey="value" fill={JMP_CHART.barFill} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    );
  }

  if (chartModel.type === "box") {
    return (
      <div ref={chartRef} className="flex h-full min-h-0 flex-1 flex-col rounded-lg border border-slate-700 bg-slate-900 p-3 overflow-x-auto">
        <p className="text-xs text-slate-400 mb-2">
          Box Plot · {chartModel.yLabel} by {chartModel.xLabel}
        </p>
        <div className="flex gap-4 items-end h-[360px] px-4 pb-8">
          {chartModel.boxes.map((box) => {
            const span = box.max - box.min || 1;
            const scale = (v: number) => ((v - box.min) / span) * 100;
            return (
              <div key={box.category} className="flex flex-col items-center min-w-[72px] flex-1">
                <div className="relative h-[280px] w-10 bg-slate-800/50 rounded">
                  <div
                    className="absolute left-1/2 w-px bg-slate-500 -translate-x-1/2"
                    style={{ bottom: `${scale(box.min)}%`, height: `${scale(box.max) - scale(box.min)}%` }}
                  />
                  <div
                    className="absolute left-1 right-1 bg-blue-500/30 border border-blue-400 rounded-sm"
                    style={{
                      bottom: `${scale(box.q1)}%`,
                      height: `${Math.max(scale(box.q3) - scale(box.q1), 2)}%`,
                    }}
                  />
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-blue-300"
                    style={{ bottom: `${scale(box.median)}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-2 text-center truncate w-full" title={box.category}>
                  {box.category}
                </div>
                <div className="text-[9px] text-slate-500">n={box.count}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (chartModel.type === "pareto") {
    return (
      <ChartFrame chartRef={chartRef} title={`Pareto · ${chartModel.column}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartModel.points}
            margin={{ left: 8, right: 48, bottom: chartModel.points.length > 6 ? 72 : 40, top: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="category"
              type="category"
              tick={{ fontSize: 9, fill: JMP_CHART.axis }}
              angle={chartModel.points.length > 6 ? -35 : 0}
              textAnchor={chartModel.points.length > 6 ? "end" : "middle"}
              interval={0}
              height={chartModel.points.length > 6 ? 64 : 32}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: JMP_CHART.axis }}
              label={{ value: "Count", angle: -90, position: "insideLeft", fill: JMP_CHART.axis, fontSize: 10 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: JMP_CHART.axis }}
              label={{ value: "Cumulative %", angle: 90, position: "insideRight", fill: JMP_CHART.axis, fontSize: 10 }}
            />
            <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${JMP_CHART.border}`, fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="count" fill={JMP_CHART.barFill} isAnimationActive={false} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativePct"
              stroke="#e74c3c"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>
    );
  }

  if (chartModel.type === "heatmap") {
    return <HeatmapChart chartRef={chartRef} chartModel={chartModel} />;
  }

  return (
    <PointsPlotChart
      chartModel={chartModel}
      options={options}
      axisConfig={axisConfig}
      onAxisSettingsChange={onAxisSettingsChange}
      colorColumn={colorColumn}
      groupColumn={groupColumn}
      labelColumn={labelColumn}
      selectedRowIndex={selectedRowIndex}
      onRowSelect={onRowSelect}
      chartRef={chartRef}
      gridStroke={gridStroke}
    />
  );
});
