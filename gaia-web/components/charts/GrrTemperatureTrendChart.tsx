"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
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
import { NTC_TEMP_PRE_SEARCH_TOKEN } from "@/lib/liw-grr-config";
import { makeGrrNtcPointKey, type GrrNtcRunAnalysis } from "@/lib/liw-grr-ntc";

interface GrrTemperatureTrendChartProps {
  analysis: GrrNtcRunAnalysis;
  selectedPointKey?: string | null;
  onSelectPoint?: (key: string | null) => void;
  onExcludePoint?: (key: string) => void;
}

type ChartRow = GrrNtcRunAnalysis["points"][number] & {
  pointKey: string;
  label: string;
};

export function GrrTemperatureTrendChart({
  analysis,
  selectedPointKey,
  onSelectPoint,
  onExcludePoint,
}: GrrTemperatureTrendChartProps) {
  const { summary } = analysis;
  const [yScalePct, setYScalePct] = useState(CHART_Y_SCALE_DEFAULT);

  const analysisKey = `${analysis.branch}|${analysis.run.runId}|${analysis.points.length}`;
  useEffect(() => {
    setYScalePct(CHART_Y_SCALE_DEFAULT);
  }, [analysisKey]);

  const values = useMemo(
    () => analysis.points.map((p) => p.temperature),
    [analysis.points]
  );
  const baseYDomain = useMemo(
    () => computeChartDomainFromValues(values, null, null),
    [values]
  );
  const [yLo, yHi] = useMemo(
    () => scaleDomainAroundCenter(baseYDomain, yScalePct / 100),
    [baseYDomain, yScalePct]
  );
  const margin = buildChartMargin(yLo, yHi);
  const avg = summary.avgTemp;

  const data: ChartRow[] = analysis.points.map((p) => ({
    ...p,
    pointKey: makeGrrNtcPointKey(p.pointIndex),
    label: `${p.poIndex} mA`,
  }));

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
          <CardTitle className="text-lg">
            Temperature Trend · LIW{analysis.branch}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            *{NTC_TEMP_PRE_SEARCH_TOKEN}* · PO 스텝별 온도 ({analysis.points.length}
            점) · Range {summary.tempRange?.toFixed(2) ?? "—"}°C (limit ≤
            {summary.rangeLimit}°C) · {analysis.run.attemptLabel} · 점 클릭 →
            선택 · 선택 데이터 제외
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
              선택: PO {selectedPoint.poIndex} mA ·{" "}
              {selectedPoint.temperature.toFixed(2)}°C
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
            <LineChart data={data} margin={margin}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="poIndex"
                type="number"
                domain={["dataMin", "dataMax"]}
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
                  value: "Temperature (°C)",
                  offset: 8,
                }}
              />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(2)} °C`, "Temperature"]}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as ChartRow | undefined;
                  if (!p) return "";
                  return `PO ${p.poIndex} mA`;
                }}
              />
              {avg !== null && (
                <ReferenceLine
                  y={avg}
                  stroke="#64748b"
                  strokeDasharray="6 4"
                  label={{
                    value: `Avg ${avg.toFixed(1)}°C`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "#64748b",
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#2563eb"
                strokeWidth={2}
                dot={(props: {
                  cx?: number;
                  cy?: number;
                  payload?: ChartRow;
                }) => {
                  const { cx, cy, payload } = props;
                  if (cx === undefined || cy === undefined || !payload) return <g />;
                  const isSelected = payload.pointKey === selectedPointKey;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 6 : 3.5}
                      fill={isSelected ? "#f59e0b" : "#2563eb"}
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
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          온도 안정성(흔들림) 확인용 — ERS Upper/Lower 라인 없음 · Min{" "}
          {summary.minTemp?.toFixed(2) ?? "—"}°C · Max{" "}
          {summary.maxTemp?.toFixed(2) ?? "—"}°C · 주황 점 = 선택
        </p>
      </CardContent>
    </Card>
  );
}
