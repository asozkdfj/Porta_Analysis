"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  buildChartMargin,
  formatAxisTick,
  Y_AXIS_LABEL_PROPS,
  Y_AXIS_TICK,
  Y_AXIS_WIDTH,
} from "@/lib/chart-axis";
import {
  CHART_Y_SCALE_DEFAULT,
  ChartYScaleToolbar,
} from "@/components/charts/ChartYScaleToolbar";
import {
  computeChartDomainFromValues,
  scaleDomainAroundCenter,
} from "@/lib/chart-domain";
import {
  getWlCenterChartPoints,
  makeGrrWlCenterPointKey,
  type GrrWlCenterRunAnalysis,
} from "@/lib/liw-grr-wl-center";
import { WL_CENTER_SKIP_POINT_COUNT, wlCenterBranchToken } from "@/lib/liw-grr-config";

interface GrrWlCenterTrendChartProps {
  analysis: GrrWlCenterRunAnalysis;
  selectedPointKey?: string | null;
  onSelectPoint?: (key: string | null) => void;
  onExcludePoint?: (key: string) => void;
}

type ChartRow = ReturnType<typeof getWlCenterChartPoints>[number] & {
  pointKey: string;
  poIndex: number;
};

export function GrrWlCenterTrendChart({
  analysis,
  selectedPointKey,
  onSelectPoint,
  onExcludePoint,
}: GrrWlCenterTrendChartProps) {
  const { summary } = analysis;
  const [yScalePct, setYScalePct] = useState(CHART_Y_SCALE_DEFAULT);

  const chartPoints = getWlCenterChartPoints(analysis.points);
  const analysisKey = `${analysis.branch}|${analysis.run.runId}|${chartPoints.length}`;
  useEffect(() => {
    setYScalePct(CHART_Y_SCALE_DEFAULT);
  }, [analysisKey]);

  const values = useMemo(() => chartPoints.map((p) => p.value), [chartPoints]);
  const baseYDomain = useMemo(
    () =>
      computeChartDomainFromValues(
        values,
        summary.specLower,
        summary.specUpper
      ),
    [values, summary.specLower, summary.specUpper]
  );
  const [yLo, yHi] = useMemo(
    () => scaleDomainAroundCenter(baseYDomain, yScalePct / 100),
    [baseYDomain, yScalePct]
  );
  const margin = buildChartMargin(yLo, yHi);
  const avg = summary.avg;

  const data: ChartRow[] = chartPoints.map((p) => ({
    ...p,
    pointKey: makeGrrWlCenterPointKey(p.pointIndex),
    poIndex: p.seriesIndex,
  }));

  const xMin = data.length > 0 ? Math.min(...data.map((d) => d.poIndex)) : 0;
  const xMax = data.length > 0 ? Math.max(...data.map((d) => d.poIndex)) : 90;

  const selectedPoint = selectedPointKey
    ? data.find((p) => p.pointKey === selectedPointKey)
    : undefined;

  const handlePointClick = (point: ChartRow) => {
    if (!onSelectPoint) return;
    onSelectPoint(selectedPointKey === point.pointKey ? null : point.pointKey);
  };

  return (
    <Card>
      <CardHeader className="pb-2 space-y-3">
        <div>
          <CardTitle className="text-lg">WL_CENTER Trend · LIW{analysis.branch}</CardTitle>
          <p className="text-xs text-muted-foreground">
            *{wlCenterBranchToken(analysis.branch)}* · 초기 {WL_CENTER_SKIP_POINT_COUNT}
            점 제외 · {xMin}~{xMax} mA · Spec {summary.specLower ?? "—"}~
            {summary.specUpper ?? "—"} · {analysis.run.attemptLabel} · 점 클릭 → 선택 ·
            선택 데이터 제외
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onExcludePoint && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedPointKey}
              onClick={() => selectedPointKey && onExcludePoint(selectedPointKey)}
            >
              <EyeOff className="h-4 w-4" />
              선택 데이터 제외
            </Button>
          )}
          {selectedPoint && (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
              선택: PO {selectedPoint.poIndex} mA · {selectedPoint.value.toFixed(4)}
            </span>
          )}
        </div>
        <ChartYScaleToolbar
          value={yScalePct}
          onChange={setYScalePct}
          onReset={() => setYScalePct(CHART_Y_SCALE_DEFAULT)}
        />
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={margin}>
              <CartesianGrid strokeDasharray="3 3" />
              <ReferenceArea
                y1={summary.specLower ?? undefined}
                y2={summary.specUpper ?? undefined}
                fill="#22c55e"
                fillOpacity={0.08}
              />
              <XAxis
                dataKey="poIndex"
                type="number"
                domain={[xMin, xMax]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => String(v)}
                label={{
                  value: "PO Current (mA)",
                  position: "insideBottom",
                  offset: -8,
                  fontSize: 12,
                }}
              />
              <YAxis
                domain={[yLo, yHi]}
                tick={Y_AXIS_TICK}
                tickFormatter={formatAxisTick}
                width={Y_AXIS_WIDTH}
                label={{
                  ...Y_AXIS_LABEL_PROPS,
                  value: "WL_CENTER",
                  offset: 8,
                }}
              />
              <Tooltip
                formatter={(value, _name, item) => {
                  const p = item?.payload as ChartRow | undefined;
                  const label = p?.specOut ? " (Spec 이탈)" : "";
                  return [`${Number(value).toFixed(4)}${label}`, "WL_CENTER"];
                }}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as ChartRow | undefined;
                  if (!p) return "";
                  return `PO ${p.poIndex} mA`;
                }}
              />
              {summary.specLower !== null && (
                <ReferenceLine
                  y={summary.specLower}
                  stroke="#16a34a"
                  strokeDasharray="4 4"
                  label={{
                    value: `Lower ${summary.specLower}`,
                    position: "insideBottomLeft",
                    fontSize: 10,
                    fill: "#16a34a",
                  }}
                />
              )}
              {summary.specUpper !== null && (
                <ReferenceLine
                  y={summary.specUpper}
                  stroke="#16a34a"
                  strokeDasharray="4 4"
                  label={{
                    value: `Upper ${summary.specUpper}`,
                    position: "insideTopLeft",
                    fontSize: 10,
                    fill: "#16a34a",
                  }}
                />
              )}
              {avg !== null && (
                <ReferenceLine
                  y={avg}
                  stroke="#64748b"
                  strokeDasharray="6 4"
                  label={{
                    value: `Avg ${avg.toFixed(3)}`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "#64748b",
                  }}
                />
              )}
              <Scatter
                dataKey="value"
                shape={(props: { cx?: number; cy?: number; payload?: ChartRow }) => {
                  const { cx, cy, payload } = props;
                  if (cx === undefined || cy === undefined || !payload) return <g />;
                  const isSelected = payload.pointKey === selectedPointKey;
                  const fill = isSelected
                    ? "#f59e0b"
                    : payload.specOut
                      ? "#dc2626"
                      : "#7c3aed";
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 6 : payload.specOut ? 5 : 3.5}
                      fill={fill}
                      stroke={isSelected ? "#b45309" : "#fff"}
                      strokeWidth={isSelected ? 2 : 1}
                      style={{ cursor: onSelectPoint ? "pointer" : undefined }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePointClick(payload);
                      }}
                    />
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Index 0~{WL_CENTER_SKIP_POINT_COUNT - 1} (1130 고정) 제외 · X축 PO Current
          (mA) · 빨간 점 = Spec 이탈 · 주황 점 = 선택
        </p>
      </CardContent>
    </Card>
  );
}
