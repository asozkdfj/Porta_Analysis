"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
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

interface TargetVsActualChartProps {
  analysis: LinearityAnalysisResult;
}

export function TargetVsActualChart({ analysis }: TargetVsActualChartProps) {
  const scatterData = analysis.points
    .filter((p) => !p.excluded)
    .map((p) => ({
      x: p.target,
      y: p.actual,
      header: p.header,
    }));

  if (scatterData.length === 0) {
    return null;
  }

  const vals = scatterData.flatMap((p) => [p.x, p.y]);
  const [lo, hi] = computeChartDomainFromValues(vals, null, null);
  const identityLine = [
    { x: lo, y: lo },
    { x: hi, y: hi },
  ];

  const margin = buildChartMargin(lo, hi);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Target vs Actual</CardTitle>
        <p className="text-xs text-muted-foreground">
          분석 구간만 표시 · Y=X 기준선
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={margin}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[lo, hi]}
                tick={{ fontSize: 11 }}
                tickFormatter={formatAxisTick}
                label={{ value: "Target Position", position: "insideBottom", offset: -10 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[lo, hi]}
                width={Y_AXIS_WIDTH}
                tick={Y_AXIS_TICK}
                tickFormatter={formatAxisTick}
                label={{ value: "Actual", ...Y_AXIS_LABEL_PROPS }}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                formatter={(value: number) => value.toFixed(4)}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { header?: string } | undefined;
                  return p?.header ?? "";
                }}
              />
              <Scatter name="Actual" data={scatterData} fill="#0d9488" />
              <Line
                name="Y = X"
                data={identityLine}
                dataKey="y"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
