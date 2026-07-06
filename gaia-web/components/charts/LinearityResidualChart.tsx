"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildChartMargin,
  formatAxisTick,
  Y_AXIS_LABEL_PROPS,
  Y_AXIS_TICK,
  Y_AXIS_WIDTH,
} from "@/lib/chart-axis";
import type { LinearityAnalysisResult } from "@/lib/liw-linearity-types";

interface LinearityResidualChartProps {
  analysis: LinearityAnalysisResult;
}

export function LinearityResidualChart({ analysis }: LinearityResidualChartProps) {
  const data = analysis.points
    .filter((p) => !p.excluded)
    .map((p) => ({
      index: p.index,
      residual: p.residual,
      header: p.header,
    }));

  if (data.length === 0 || analysis.verdict === "emission_failure") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Residual Plot</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          발광 실패 — Residual 분석 없음
        </CardContent>
      </Card>
    );
  }

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.residual)), 0.001);
  const pad = maxAbs * 0.15;
  const yLo = -maxAbs - pad;
  const yHi = maxAbs + pad;
  const margin = buildChartMargin(yLo, yHi);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Residual Plot</CardTitle>
        <p className="text-xs text-muted-foreground">
          Index &ge; {analysis.analysisMinIndex} · Residual = 실제값 − 회귀선 예측값
          {analysis.hasResidualPattern && (
            <span className="text-amber-700 ml-1">· 체계적 패턴 감지됨</span>
          )}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={margin}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="index"
                type="number"
                tick={{ fontSize: 11 }}
                label={{ value: "Position Index", position: "insideBottom", offset: -10 }}
              />
              <YAxis
                domain={[yLo, yHi]}
                width={Y_AXIS_WIDTH}
                tick={Y_AXIS_TICK}
                tickFormatter={formatAxisTick}
                label={{ value: "Residual", ...Y_AXIS_LABEL_PROPS }}
              />
              <Tooltip
                formatter={(value: number) => value.toFixed(4)}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { header?: string } | undefined;
                  return p?.header ?? "";
                }}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
              <Bar dataKey="residual" fill="#6366f1" opacity={0.75} barSize={8} />
              <Line
                type="monotone"
                dataKey="residual"
                stroke="#4338ca"
                strokeWidth={1.5}
                dot={{ r: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
