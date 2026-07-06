"use client";

import { useMemo, useState, type RefObject } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Customized,
  ErrorBar,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DiagonalSpecLayer,
  type DiagonalSpecLayerProps,
} from "@/components/charts/DiagonalSpecLayer";
import {
  GrrChartCrosshairLayer,
  type GrrChartCursor,
  type GrrChartCrosshairLayerProps,
} from "@/components/charts/GrrChartCrosshairLayer";
import {
  GrrSocketRangeLayer,
  type GrrSocketRangeLayerProps,
} from "@/components/charts/GrrSocketRangeLayer";
import { GrrStat2SummaryPanel } from "@/components/dashboard/GrrStat2SummaryPanel";
import { GrrRepeatabilityPanel } from "@/components/dashboard/GrrRepeatabilityPanel";
import { GrrMetricResultsTable } from "@/components/dashboard/GrrMetricResultsTable";
import {
  buildGrrChartModel,
  type GrrChartPoint,
} from "@/lib/grr-chart-data";
import { buildRepeatabilityBySocket } from "@/lib/grr-repeatability";
import {
  getGrrChartDimensions,
  grrPlotPixelToData,
  GRR_CHART_LAYOUT,
} from "@/lib/grr-chart-layout";
import type { GaiaAnalysisResult, GaiaStat2GrrSummary } from "@/lib/types";
import { isFullAxisSpec } from "@/lib/gaia-spec-config";
import { formatTestItemLabel } from "@/lib/liw-grr-spec";

const { width: CHART_WIDTH, height: CHART_HEIGHT } = getGrrChartDimensions();
const {
  margin: CHART_MARGIN,
  yAxisWidth,
  xAxisHeight,
  pointFillOpacity,
  pointStrokeOpacity,
  repeatabilityStrokeOpacity,
} = GRR_CHART_LAYOUT;

interface GaiaGrrChartProps {
  analysis: GaiaAnalysisResult | null;
  stat2Summary?: GaiaStat2GrrSummary | null;
  goldenSocket?: string | null;
  exportRootRef?: RefObject<HTMLDivElement | null>;
}

function CustomTooltip({
  active,
  payload,
  testBand,
}: {
  active?: boolean;
  payload?: { payload?: GrrChartPoint }[];
  testBand: number | null;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const p = payload[0].payload;

  const vsLimit =
    testBand !== null && testBand > 0
      ? p.ymin >= p.x - testBand && p.ymax <= p.x + testBand
        ? "Limit 내"
        : "Limit 초과"
      : null;

  return (
    <div className="rounded-md border bg-white p-3 text-xs shadow-md max-w-xs">
      <div className="font-mono font-semibold mb-1" style={{ color: p.color }}>
        {p.serial}
      </div>
      <div className="space-y-0.5 text-muted-foreground font-mono">
        <div>Socket: {p.referenceSocket}</div>
        <div>Avg: {p.avg.toFixed(6)}</div>
        <div>Stdev: {p.stdev.toFixed(6)}</div>
        <div>GRR Stdev: {p.grrStdev?.toFixed(4) ?? "—"}</div>
        <div>Bound Up: {p.boundUp.toFixed(6)}</div>
        <div>Bound Dn: {p.boundDn.toFixed(6)}</div>
        <div>Repeatability Range: {p.repeatabilityRange.toFixed(6)}</div>
        {p.repeatabilityOutOfSpec && (
          <div className="text-red-600 font-semibold">Repeatability: Spec 초과 (FAIL)</div>
        )}
        <div className="pt-1 border-t mt-1">
          의사 골든: {p.x.toFixed(4)}
        </div>
        <div>기준 소켓 ({p.referenceSocket}): {p.y.toFixed(4)}</div>
        <div>소켓 Range: {p.ymin.toFixed(4)} ~ {p.ymax.toFixed(4)}</div>
        {testBand !== null && testBand > 0 && (
          <div>
            GRR Spec: {(p.x - testBand).toFixed(4)} ~ {(p.x + testBand).toFixed(4)}
            {vsLimit && <span className="ml-1">({vsLimit})</span>}
          </div>
        )}
      </div>
      <Badge
        variant={p.status === "PASS" ? "success" : p.status === "FAIL" ? "danger" : "warning"}
        className="mt-2"
      >
        {p.status}
      </Badge>
    </div>
  );
}

function GaiaSnShape(props: unknown) {
  const { cx, cy, payload } = props as {
    cx?: number;
    cy?: number;
    payload?: GrrChartPoint;
  };
  if (cx == null || cy == null || !payload) return <g />;

  return (
    <rect
      x={cx - 6}
      y={cy - 6}
      width={12}
      height={12}
      fill={payload.color}
      fillOpacity={pointFillOpacity}
      stroke="#1e293b"
      strokeOpacity={pointStrokeOpacity}
      strokeWidth={1.5}
      rx={1}
    />
  );
}

function Stat2ParamPanel({ summary }: { summary: GaiaStat2GrrSummary }) {
  const fmt = (v: number | null) => (v === null ? "NA" : String(v));

  return (
    <div className="rounded-md border border-red-200 bg-red-50/60 px-3 py-2 text-xs space-y-1 shrink-0 w-full sm:w-44">
      <div className="font-semibold text-red-800">Parameters</div>
      <div className="grid gap-0.5 text-red-900/90 font-mono">
        <span>limit_high: {fmt(summary.limitHigh)}</span>
        <span>limit_low: {fmt(summary.limitLow)}</span>
        <span>ers_high: {fmt(summary.ersHigh)}</span>
        <span>ers_low: {fmt(summary.ersLow)}</span>
        <span>grr_stdev: {fmt(summary.grrStdev)}</span>
        <span>grr_limit: {fmt(summary.grrLimit)}</span>
      </div>
      {summary.configVersion && (
        <div className="text-[10px] text-red-700/70 truncate pt-1 border-t border-red-200/60">
          {summary.configVersion}
        </div>
      )}
    </div>
  );
}

function ChartHeaderMeta({
  metric,
  metricLabel,
  targetTester,
  sampleCount,
  groupGrr,
  fullAxis,
  spec,
  testLimitBand,
  lo,
  hi,
}: {
  metric: string;
  metricLabel: string;
  targetTester: string;
  sampleCount: number;
  groupGrr: GaiaAnalysisResult["groupGrr"];
  fullAxis: boolean;
  spec: GaiaAnalysisResult["spec"];
  testLimitBand: number;
  lo: number;
  hi: number;
}) {
  const axisLine = fullAxis
    ? `축=Lower ERS ${spec.lsl} ~ Upper ERS ${spec.usl} · GRR Spec = Lower ERS ± ${testLimitBand.toFixed(4)}`
    : spec.found
      ? `축=데이터(${lo.toFixed(2)}~${hi.toFixed(2)})${
          spec.lsl !== null ? ` · LSL ≥ ${spec.lsl}` : ""
        }${spec.usl !== null ? ` · USL ≤ ${spec.usl}` : ""}${
          testLimitBand > 0
            ? ` · GRR Spec = Lower ERS ± ${testLimitBand.toFixed(4)}`
            : ""
        }`
      : `축=데이터(${lo.toFixed(2)}~${hi.toFixed(2)})${
          testLimitBand > 0
            ? ` · GRR Spec = Lower ERS ± ${testLimitBand.toFixed(4)}`
            : ""
        }`;

  return (
    <div className="space-y-2.5 flex-1 min-w-0">
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Test Item
        </p>
        <CardTitle
          className="text-xl sm:text-2xl font-semibold font-mono tracking-tight text-slate-900 break-all leading-tight"
          title={metric}
        >
          {metricLabel}
        </CardTitle>
        {metric !== metricLabel && (
          <p
            className="text-xs text-muted-foreground font-mono break-all"
            title={metric}
          >
            {metric}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs">
          <span className="font-medium text-blue-700/80">Reference Socket</span>
          <span className="font-mono font-semibold text-blue-950">
            {targetTester}
          </span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="font-medium text-muted-foreground">Samples</span>
          <span className="font-mono font-semibold text-slate-900">
            {sampleCount}
          </span>
        </span>
      </div>

      {groupGrr && (
        <p className="text-xs text-muted-foreground font-mono">
          GRR_GROUP_AVG = {groupGrr.groupAvg.toFixed(6)}
          {" · "}GRR_PCT_ERR_MAX = {groupGrr.grrErrMax.toFixed(1)}%
          {" · "}GRR_PCT_ERR_MIN = {groupGrr.grrErrMin.toFixed(1)}%
        </p>
      )}

      <p className="text-xs text-muted-foreground">{axisLine}</p>
    </div>
  );
}

function ChartLegend({ points }: { points: GrrChartPoint[] }) {
  return (
    <div className="flex flex-col gap-1 overflow-y-auto text-[10px] shrink-0 w-36 pt-2" style={{ maxHeight: CHART_HEIGHT }}>
      {points.map((p) => (
        <div key={p.serial} className="flex items-center gap-1.5 min-w-0">
          <span
            className="inline-block w-2.5 h-2.5 shrink-0 border border-white/80"
            style={{ backgroundColor: p.color }}
          />
          <span className="font-mono truncate" title={p.serial}>
            {p.serial}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GaiaGrrChart({
  analysis,
  stat2Summary,
  goldenSocket,
  exportRootRef,
}: GaiaGrrChartProps) {
  const [showTestLimit, setShowTestLimit] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showRepeatability, setShowRepeatability] = useState(true);
  const [chartCursor, setChartCursor] = useState<GrrChartCursor | null>(null);

  const model = useMemo(
    () => (analysis ? buildGrrChartModel(analysis) : null),
    [analysis]
  );

  const repeatabilityBySocket = useMemo(
    () => (analysis ? buildRepeatabilityBySocket(analysis) : null),
    [analysis]
  );

  if (!analysis || !model || model.points.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">GRR 그래프</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          분석 결과가 없습니다. CSV와 Metric을 확인하세요.
        </CardContent>
      </Card>
    );
  }

  const { points, plotDomain, spec, testLimitBand } = model;
  const [lo, hi] = plotDomain;
  const groupGrr = analysis.groupGrr;
  const fullAxis = isFullAxisSpec(spec.lsl, spec.usl);
  const targetTester =
    stat2Summary?.targetTester ??
    analysis.serials[0]?.referenceSocket ??
    "—";
  const sampleCount = analysis.serials.length;
  const metricLabel =
    stat2Summary?.metricLabel ?? formatTestItemLabel(analysis.metric);

  return (
    <Card className="h-full">
      <div ref={exportRootRef} className="bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <ChartHeaderMeta
              metric={analysis.metric}
              metricLabel={metricLabel}
              targetTester={targetTester}
              sampleCount={sampleCount}
              groupGrr={groupGrr}
              fullAxis={fullAxis}
              spec={spec}
              testLimitBand={testLimitBand}
              lo={lo}
              hi={hi}
            />
            {stat2Summary && <Stat2ParamPanel summary={stat2Summary} />}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-4 mb-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showTestLimit}
                onChange={(e) => setShowTestLimit(e.target.checked)}
                className="rounded"
              />
              Show GRR Spec Line
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showRepeatability}
                onChange={(e) => setShowRepeatability(e.target.checked)}
                className="rounded"
              />
              Show Repeatability (Y Error Bar)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showInfo}
                onChange={(e) => setShowInfo(e.target.checked)}
                className="rounded"
              />
              Show Info
            </label>
          </div>

          <div className="flex flex-row justify-center items-start gap-2 mx-auto">
            <div className="flex flex-col items-center gap-1">
              {chartCursor && (
                <p className="text-xs font-mono text-slate-600 tabular-nums">
                  의사 골든 (X):{" "}
                  <span className="font-semibold text-slate-800">
                    {chartCursor.dataX.toFixed(4)}
                  </span>
                  {" · "}
                  기준 소켓 (Y):{" "}
                  <span className="font-semibold text-slate-800">
                    {chartCursor.dataY.toFixed(4)}
                  </span>
                </p>
              )}
              <div
                className="rounded-md border border-slate-200 bg-white"
                style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const px = e.clientX - rect.left;
                  const py = e.clientY - rect.top;
                  const data = grrPlotPixelToData(px, py, plotDomain);
                  setChartCursor(data ? { px, py, ...data } : null);
                }}
                onMouseLeave={() => setChartCursor(null)}
              >
                <ComposedChart
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  data={points}
                  margin={CHART_MARGIN}
                >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                dataKey="x"
                domain={plotDomain}
                allowDataOverflow
                height={xAxisHeight}
                tickCount={6}
                padding={{ left: 0, right: 0 }}
                tick={{ fontSize: 11 }}
                label={{
                  value: "의사 골든 (X)",
                  position: "insideBottom",
                  offset: -4,
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={plotDomain}
                allowDataOverflow
                width={yAxisWidth}
                tickCount={6}
                padding={{ top: 0, bottom: 0 }}
                tick={{ fontSize: 11 }}
                label={{
                  value: "기준 소켓 (Y)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  fontSize: 11,
                }}
              />
              <ZAxis range={[80, 80]} />
              <Tooltip content={<CustomTooltip testBand={testLimitBand} />} />

              {points.map((p) => {
                const repeatStroke = p.repeatabilityOutOfSpec ? "#dc2626" : p.color;
                return (
                  <Scatter
                    key={p.serial}
                    name={p.serial}
                    data={[p]}
                    fill={p.color}
                    shape={GaiaSnShape}
                    legendType="square"
                  >
                    {showRepeatability && (
                      <ErrorBar
                        dataKey="repeatabilityY"
                        direction="y"
                        width={5}
                        stroke={repeatStroke}
                        strokeWidth={p.repeatabilityOutOfSpec ? 3 : 2.5}
                        strokeOpacity={
                          p.repeatabilityOutOfSpec ? 1 : repeatabilityStrokeOpacity
                        }
                      />
                    )}
                  </Scatter>
                );
              })}

              <Customized
                component={(props: Record<string, unknown>) => (
                  <>
                    <GrrSocketRangeLayer
                      xAxisMap={props.xAxisMap as GrrSocketRangeLayerProps["xAxisMap"]}
                      yAxisMap={props.yAxisMap as GrrSocketRangeLayerProps["yAxisMap"]}
                      points={points}
                    />
                    <DiagonalSpecLayer
                      xAxisMap={props.xAxisMap as DiagonalSpecLayerProps["xAxisMap"]}
                      yAxisMap={props.yAxisMap as DiagonalSpecLayerProps["yAxisMap"]}
                      domain={plotDomain}
                      testLimitBand={testLimitBand}
                      showTestLimit={showTestLimit}
                    />
                    <GrrChartCrosshairLayer
                      xAxisMap={props.xAxisMap as GrrChartCrosshairLayerProps["xAxisMap"]}
                      yAxisMap={props.yAxisMap as GrrChartCrosshairLayerProps["yAxisMap"]}
                      domain={plotDomain}
                      cursor={chartCursor}
                    />
                  </>
                )}
              />
            </ComposedChart>
          </div>
          </div>
          <ChartLegend points={points} />
        </div>

          <p className="text-center text-xs font-semibold text-red-600 mt-2 tracking-wide">
            !!! PSEUDO_GOLDEN !!!
          </p>
        </CardContent>
      </div>

      <CardContent className="pt-0">
        {analysis && (
          <div className="mt-4">
            <GrrMetricResultsTable
              analysis={analysis}
              stat2Summary={stat2Summary}
            />
          </div>
        )}

        {repeatabilityBySocket && repeatabilityBySocket.sockets.length > 0 && (
          <div className="mt-4">
            <GrrRepeatabilityPanel
              data={repeatabilityBySocket}
              goldenSocket={goldenSocket}
              activeReferenceSocket={targetTester}
            />
          </div>
        )}

        {showInfo && stat2Summary && (
          <div className="mt-4">
            <GrrStat2SummaryPanel summary={stat2Summary} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
