"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  repeatabilityErrorBarOffsets,
  repeatabilityTierColor,
  type ModuleRepeatabilityRow,
  type RepeatabilitySocketSummary,
} from "@/lib/grr-repeatability";

interface GrrSocketRepeatabilityChartProps {
  summary: RepeatabilitySocketSummary;
  socketLabel: string;
  isGoldenSocket?: boolean;
  isTargetSocket?: boolean;
}

interface ChartRow extends ModuleRepeatabilityRow {
  barIndex: number;
  repeatabilityY: [number, number];
  fill: string;
  stroke: string;
}

function ModuleDot(props: unknown) {
  const { cx, cy, payload } = props as {
    cx?: number;
    cy?: number;
    payload?: ChartRow;
  };
  if (cx == null || cy == null || !payload) return <g />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={payload.fill}
      stroke={payload.stroke}
      strokeWidth={2}
    />
  );
}

export function GrrSocketRepeatabilityChart({
  summary,
  socketLabel,
  isGoldenSocket,
  isTargetSocket,
}: GrrSocketRepeatabilityChartProps) {
  const data: ChartRow[] = useMemo(
    () =>
      summary.modules.map((row, index) => {
        const tierColor = repeatabilityTierColor(row.tier);
        return {
          ...row,
          barIndex: index,
          repeatabilityY: repeatabilityErrorBarOffsets(
            row.avg,
            row.boundUp,
            row.boundDn
          ),
          fill: tierColor,
          stroke: tierColor,
        };
      }),
    [summary]
  );

  if (data.length === 0) return null;

  const yVals = data.flatMap((d) => [d.boundDn, d.boundUp]);
  const yMin = Math.min(...yVals);
  const yMax = Math.max(...yVals);
  const pad = (yMax - yMin) * 0.08 || 0.5;
  const yDomain: [number, number] = [yMin - pad, yMax + pad];
  const xDomain: [number, number] = [-0.5, data.length - 0.5];

  const socketBadge = isGoldenSocket
    ? "Golden Socket"
    : isTargetSocket
      ? "Target Socket"
      : null;

  // 18자 Barcode 라벨이 잘리지 않도록 포인트당 너비·하단 여백 확보
  const barSlotWidth = 120;
  const chartWidth = Math.max(480, data.length * barSlotWidth);
  const chartHeight = 340;
  const xAxisHeight = 80;
  const bottomMargin = 88;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Barcode Repeatability —{" "}
          <span className="font-mono">{socketLabel}</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {socketBadge && (
            <span className="font-medium text-slate-700">{socketBadge} · </span>
          )}
          이 Socket의 전체 Barcode 반복 Run · 세로 Error Bar = Bound Up / Bound Dn
        </p>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <div
            style={{
              width: chartWidth,
              height: chartHeight,
              margin: "0 auto",
            }}
          >
            <ComposedChart
              width={chartWidth}
              height={chartHeight}
              margin={{ top: 16, right: 16, bottom: bottomMargin, left: 48 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="barIndex"
                domain={xDomain}
                ticks={data.map((d) => d.barIndex)}
                tick={{ fontSize: 8, fontFamily: "ui-monospace, monospace" }}
                angle={-40}
                textAnchor="end"
                height={xAxisHeight}
                tickFormatter={(index: number) => data[index]?.serial ?? ""}
              />
              <YAxis
                type="number"
                domain={yDomain}
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => v.toFixed(4)}
                label={{
                  value: "Avg ± Repeatability",
                  angle: -90,
                  position: "insideLeft",
                  offset: 8,
                  fontSize: 10,
                }}
              />
              <ZAxis range={[80, 80]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]?.payload) return null;
                  const p = payload[0].payload as ChartRow;
                  return (
                    <div className="rounded-md border bg-white p-3 text-xs shadow-md max-w-xs">
                      <div className="font-mono font-semibold mb-1">
                        Socket: {socketLabel}
                      </div>
                      <div className="font-mono text-muted-foreground mb-1 truncate">
                        Barcode: {p.serial}
                      </div>
                      <div className="space-y-0.5 text-muted-foreground font-mono">
                        <div>Avg: {p.avg.toFixed(6)}</div>
                        <div>Stdev: {p.stdev.toFixed(6)}</div>
                        <div>
                          GRR Stdev: {p.grrStdev?.toFixed(4) ?? "—"}
                        </div>
                        <div>Bound Up: {p.boundUp.toFixed(6)}</div>
                        <div>Bound Dn: {p.boundDn.toFixed(6)}</div>
                        <div>
                          Repeatability Range:{" "}
                          {p.repeatabilityRange.toFixed(6)}
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              {data.map((row) => (
                <Scatter
                  key={row.serial}
                  name={row.serial}
                  data={[row]}
                  dataKey="avg"
                  fill={row.fill}
                  shape={ModuleDot}
                  legendType="none"
                  isAnimationActive={false}
                >
                  <ErrorBar
                    dataKey="repeatabilityY"
                    direction="y"
                    width={4}
                    stroke="#64748b"
                    strokeWidth={2}
                  />
                </Scatter>
              ))}
            </ComposedChart>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
