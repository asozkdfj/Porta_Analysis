"use client";

import type { GrrChartPoint } from "@/lib/grr-chart-data";
import { GRR_CHART_LAYOUT } from "@/lib/grr-chart-layout";

interface AxisLike {
  scale: (v: number) => number;
}

export interface GrrSocketRangeLayerProps {
  xAxisMap?: Record<string, AxisLike>;
  yAxisMap?: Record<string, AxisLike>;
  points: GrrChartPoint[];
}

function getScale(map?: Record<string, AxisLike>): ((v: number) => number) | null {
  if (!map) return null;
  const axis = Object.values(map)[0];
  return axis?.scale ?? null;
}

/**
 * 소켓 Range 가로 막대 — ymin~ymax (의사 골든 축 절대 좌표).
 * Recharts ErrorBar + X jitter 조합은 막대 길이/위치가 어긋날 수 있어 Customized SVG로 직접 그림.
 */
export function GrrSocketRangeLayer({
  xAxisMap,
  yAxisMap,
  points,
}: GrrSocketRangeLayerProps) {
  const xScale = getScale(xAxisMap);
  const yScale = getScale(yAxisMap);
  if (!xScale || !yScale) return null;

  return (
    <g className="grr-socket-range-layer">
      {points.map((p) => {
        const x1 = xScale(p.ymin);
        const x2 = xScale(p.ymax);
        const y = yScale(p.y);
        const cap = 4;

        return (
          <g
            key={p.serial}
            stroke={p.color}
            strokeWidth={1.5}
            strokeOpacity={GRR_CHART_LAYOUT.socketRangeStrokeOpacity}
          >
            <line x1={x1} y1={y} x2={x2} y2={y} />
            <line x1={x1} y1={y - cap} x2={x1} y2={y + cap} />
            <line x1={x2} y1={y - cap} x2={x2} y2={y + cap} />
          </g>
        );
      })}
    </g>
  );
}
