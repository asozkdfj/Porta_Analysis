"use client";

import { getGrrPlotBounds } from "@/lib/grr-chart-layout";

export interface GrrChartCursor {
  px: number;
  py: number;
  dataX: number;
  dataY: number;
}

interface AxisLike {
  scale: (v: number) => number;
}

export interface GrrChartCrosshairLayerProps {
  xAxisMap?: Record<string, AxisLike>;
  yAxisMap?: Record<string, AxisLike>;
  domain: [number, number];
  cursor: GrrChartCursor | null;
}

function getScale(map?: Record<string, AxisLike>): ((v: number) => number) | null {
  if (!map) return null;
  const axis = Object.values(map)[0];
  return axis?.scale ?? null;
}

/**
 * 마우스 위치 크로스헤어 + 좌표 라벨 (의사 골든 X, 기준 소켓 Y)
 */
export function GrrChartCrosshairLayer({
  xAxisMap,
  yAxisMap,
  domain,
  cursor,
}: GrrChartCrosshairLayerProps) {
  const xScale = getScale(xAxisMap);
  const yScale = getScale(yAxisMap);
  if (!xScale || !yScale || !cursor) return null;

  const [lo, hi] = domain;
  const bounds = getGrrPlotBounds();
  const plotLeft = xScale(lo);
  const plotRight = xScale(hi);
  const plotTop = yScale(hi);
  const plotBottom = yScale(lo);
  const cx = xScale(cursor.dataX);
  const cy = yScale(cursor.dataY);

  const labelX = Math.min(cx + 8, plotRight - 4);
  const labelY = Math.max(cy - 10, plotTop + 14);

  return (
    <g className="grr-crosshair" pointerEvents="none">
      <line
        x1={cx}
        y1={plotTop}
        x2={cx}
        y2={plotBottom}
        stroke="#64748b"
        strokeWidth={1}
        strokeDasharray="4 3"
        strokeOpacity={0.85}
      />
      <line
        x1={plotLeft}
        y1={cy}
        x2={plotRight}
        y2={cy}
        stroke="#64748b"
        strokeWidth={1}
        strokeDasharray="4 3"
        strokeOpacity={0.85}
      />
      <circle cx={cx} cy={cy} r={3.5} fill="#334155" fillOpacity={0.9} />
      <rect
        x={labelX - 4}
        y={labelY - 12}
        width={bounds.size * 0.42}
        height={22}
        rx={4}
        fill="white"
        fillOpacity={0.92}
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      <text
        x={labelX}
        y={labelY}
        fontSize={10}
        fontFamily="ui-monospace, monospace"
        fill="#334155"
      >
        {`X ${cursor.dataX.toFixed(4)}  ·  Y ${cursor.dataY.toFixed(4)}`}
      </text>
    </g>
  );
}
