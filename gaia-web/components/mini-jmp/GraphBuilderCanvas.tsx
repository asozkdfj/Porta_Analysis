"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorForSeries, sortColorKeys } from "@/lib/mini-jmp-chart-data";
import type {
  MiniJmpBoxPlotGroup,
  MiniJmpCategoryPoint,
  MiniJmpChartOptions,
  MiniJmpGraphType,
  MiniJmpHistogramBin,
  MiniJmpPointsMode,
  MiniJmpScatterPoint,
} from "@/lib/mini-jmp-types";

export type MiniJmpChartModel =
  | { type: "histogram"; histogram: MiniJmpHistogramBin[]; column: string }
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
  xColumn: string | null;
  yColumn: string | null;
  colorColumn: string | null;
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

function JmpScatterDot(props: unknown) {
  const p = props as {
    cx?: number;
    cy?: number;
    fill?: string;
    fillOpacity?: number;
  };
  const { cx, cy, fill = JMP_CHART.defaultPoint, fillOpacity = 1 } = p;
  if (cx == null || cy == null) {
    return <circle cx={0} cy={0} r={0} fill="none" />;
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={JMP_CHART.pointRadius}
      fill={fill}
      fillOpacity={fillOpacity}
    />
  );
}

function ChartFrame({
  chartRef,
  title,
  children,
}: {
  chartRef?: React.RefObject<HTMLDivElement | null>;
  title: string;
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

export function GraphBuilderCanvas({
  chartModel,
  renderOk,
  renderMessage,
  graphType,
  options,
  xColumn,
  yColumn,
  colorColumn,
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

  const isTime = chartModel.xCol.kind === "datetime";
  const mode = chartModel.mode ?? "numeric";
  const xCats = chartModel.xCategories;
  const yCats = chartModel.yCategories;

  const rawColorKeys = [
    ...new Set(
      chartModel.points
        .map((p) => p.color)
        .filter((c): c is string => Boolean(c))
    ),
  ];
  const colorOrderHint =
    xCats.length > 0 && rawColorKeys.every((k) => xCats.includes(k))
      ? xCats
      : undefined;
  const colorKeys = sortColorKeys(rawColorKeys, colorOrderHint);
  const useColor = Boolean(colorColumn && colorKeys.length > 0);
  const alpha = options.pointAlpha ?? 1;

  const scatterGroups = useColor
    ? colorKeys.map((key, i) => ({
        key,
        color: colorForSeries(key, i),
        data: chartModel.points.filter((p) => p.color === key),
      }))
    : [{ key: "all", color: JMP_CHART.defaultPoint, data: chartModel.points }];

  const categoricalX =
    mode === "x-only" || mode === "categorical" || mode === "cat-numeric";
  const categoricalY = mode === "categorical";

  const xDomain: [number, number] | ["dataMin", "dataMax"] =
    categoricalX && xCats.length > 0
      ? [-0.5, xCats.length - 0.5]
      : ["dataMin", "dataMax"];
  const yDomain: [number, number] | ["dataMin", "dataMax"] =
    mode === "x-only"
      ? [0, 1]
      : categoricalY && yCats.length > 0
        ? [-0.5, yCats.length - 0.5]
        : ["dataMin", "dataMax"];

  const yAxisWidth =
    categoricalY && yCats.length > 0
      ? Math.min(220, Math.max(72, ...yCats.map((c) => c.length * 5.5)))
      : 56;

  const truncate = (s: string, max = 28) =>
    s.length > max ? `${s.slice(0, max - 1)}…` : s;

  const scatterTitle = `${chartModel.yLabel} vs ${chartModel.xLabel}${colorColumn ? ` · Color: ${colorColumn}` : ""}`;

  const legendBottom = useColor ? 36 : 0;
  const xLabelBottom =
    (categoricalX && xCats.length > 5 ? 56 : 28) + legendBottom;

  return (
    <ChartFrame chartRef={chartRef} title={scatterTitle}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartModel.points}
          margin={{ left: 8, right: 16, bottom: xLabelBottom, top: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
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
              const parts = [pt.rawX && `X: ${pt.rawX}`, pt.rawY && `Y: ${pt.rawY}`, pt.color && `Color: ${pt.color}`].filter(Boolean);
              return parts.join(" · ") || chartModel.xLabel;
            }}
          />
          {useColor && (
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{
                fontSize: 10,
                color: JMP_CHART.axis,
                paddingTop: 8,
                width: "100%",
              }}
            />
          )}
          {chartModel.type === "line" ? (
            <Line
              type="monotone"
              dataKey="y"
              stroke={JMP_CHART.barFill}
              strokeOpacity={alpha}
              dot={{ r: 4, fill: JMP_CHART.barFill, fillOpacity: alpha }}
              isAnimationActive={false}
            />
          ) : useColor ? (
            scatterGroups.map((g) => (
              <Scatter
                key={g.key}
                name={g.key}
                data={g.data}
                fill={g.color}
                fillOpacity={alpha}
                shape={JmpScatterDot}
                isAnimationActive={false}
              />
            ))
          ) : (
            <Scatter
              data={chartModel.points}
              fill={JMP_CHART.defaultPoint}
              fillOpacity={alpha}
              shape={JmpScatterDot}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
