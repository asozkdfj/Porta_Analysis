"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildChartMargin,
  formatAxisTick,
  Y_AXIS_LABEL_PROPS,
  Y_AXIS_TICK,
  Y_AXIS_WIDTH,
} from "@/lib/chart-axis";
import { computeChartDomainFromValues } from "@/lib/chart-domain";
import type { LinearityAnalysisResult } from "@/lib/liw-linearity-types";

interface LinearityScatterChartProps {
  analysis: LinearityAnalysisResult;
  yAxisLabel?: string;
}

export function LinearityScatterChart({
  analysis,
  yAxisLabel = "측정값",
}: LinearityScatterChartProps) {
  const included = analysis.points
    .filter((p) => !p.excluded)
    .map((p) => ({ x: p.index, y: p.actual, header: p.header }));

  const excluded = analysis.points
    .filter((p) => p.excluded)
    .map((p) => ({ x: p.index, y: p.actual, header: p.header }));

  const lineData = analysis.regressionLine.map((p) => ({ x: p.x, y: p.y }));

  const yVals = [
    ...analysis.points.map((p) => p.actual),
    ...analysis.regressionLine.map((p) => p.y),
  ];
  const [yLo, yHi] = computeChartDomainFromValues(yVals, null, null);
  const xLo = Math.min(...analysis.points.map((p) => p.index));
  const xHi = Math.max(...analysis.points.map((p) => p.index));
  const xPad = (xHi - xLo) * 0.02 || 1;

  const zoneEnd = analysis.analysisMinIndex;
  const margin = buildChartMargin(yLo, yHi);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">선형성 그래프</CardTitle>
        <p className="text-xs text-muted-foreground">
          {analysis.series.label} · Index &ge; {zoneEnd} 구간만 회귀 분석
          <span className="ml-2 text-slate-500">
            (회색 영역 = 분석 제외)
          </span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={margin}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[xLo - xPad, xHi + xPad]}
                tick={{ fontSize: 11 }}
                label={{ value: "Position Index", position: "insideBottom", offset: -10 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[yLo, yHi]}
                width={Y_AXIS_WIDTH}
                tick={Y_AXIS_TICK}
                tickFormatter={formatAxisTick}
                label={{ value: yAxisLabel, ...Y_AXIS_LABEL_PROPS }}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                formatter={(value: number) => value.toFixed(4)}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { header?: string; x?: number } | undefined;
                  return p?.header ?? `Index ${p?.x ?? ""}`;
                }}
              />
              <ReferenceArea
                x1={xLo - xPad}
                x2={zoneEnd}
                fill="#94a3b8"
                fillOpacity={0.15}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
              {excluded.length > 0 && (
                <Scatter
                  name="제외 구간"
                  data={excluded}
                  fill="#94a3b8"
                  line={false}
                />
              )}
              <Scatter
                name="분석 구간"
                data={included}
                fill="#2563eb"
                line={false}
              />
              {lineData.length > 0 && (
                <Line
                  name="회귀 직선"
                  data={lineData}
                  dataKey="y"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
