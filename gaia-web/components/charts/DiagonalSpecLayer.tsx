"use client";

import { clippedParallelBandSegments } from "@/lib/grr-test-limit";

const BORDER_STROKE = "#94a3b8";
/** y=x 의사 골든 기준선 */
const CENTER_STROKE = "#16a34a";
/** GRR Spec 평행선 — 연한 빨강 */
const SPEC_BAND_STROKE = "#f87171";

interface AxisLike {
  scale: (v: number) => number;
}

export interface DiagonalSpecLayerProps {
  xAxisMap?: Record<string, AxisLike>;
  yAxisMap?: Record<string, AxisLike>;
  domain: [number, number];
  testLimitBand: number;
  showTestLimit: boolean;
}

function getScale(map?: Record<string, AxisLike>): ((v: number) => number) | null {
  if (!map) return null;
  const axis = Object.values(map)[0];
  return axis?.scale ?? null;
}

function SpecLine({
  x1,
  y1,
  x2,
  y2,
  xScale,
  yScale,
  stroke,
  strokeWidth,
  dash,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  xScale: (v: number) => number;
  yScale: (v: number) => number;
  stroke: string;
  strokeWidth: number;
  dash: string;
}) {
  return (
    <line
      x1={xScale(x1)}
      y1={yScale(y1)}
      x2={xScale(x2)}
      y2={yScale(y2)}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
      fill="none"
    />
  );
}

/**
 * Recharts ReferenceLine은 ComposedChart+Scatter에서 segment가 안 그려지는 경우가 있어
 * Customized SVG 레이어로 Spec 선을 직접 렌더링.
 */
export function DiagonalSpecLayer({
  xAxisMap,
  yAxisMap,
  domain,
  testLimitBand,
  showTestLimit,
}: DiagonalSpecLayerProps) {
  const xScale = getScale(xAxisMap);
  const yScale = getScale(yAxisMap);
  if (!xScale || !yScale) return null;

  const [lo, hi] = domain;
  const band = testLimitBand;
  const { upper, lower } = clippedParallelBandSegments(lo, hi, band);

  const common = { xScale, yScale };

  return (
    <g className="gaia-spec-lines" pointerEvents="none">
      {/* 파란 Spec 사각 테두리 */}
      <SpecLine x1={lo} y1={lo} x2={hi} y2={lo} {...common} stroke={BORDER_STROKE} strokeWidth={2} dash="6 4" />
      <SpecLine x1={hi} y1={lo} x2={hi} y2={hi} {...common} stroke={BORDER_STROKE} strokeWidth={2} dash="6 4" />
      <SpecLine x1={hi} y1={hi} x2={lo} y2={hi} {...common} stroke={BORDER_STROKE} strokeWidth={2} dash="6 4" />
      <SpecLine x1={lo} y1={hi} x2={lo} y2={lo} {...common} stroke={BORDER_STROKE} strokeWidth={2} dash="6 4" />

      {/* y=x Pseudo Golden — 기준선 */}
      <SpecLine
        x1={lo}
        y1={lo}
        x2={hi}
        y2={hi}
        {...common}
        stroke={CENTER_STROKE}
        strokeWidth={2}
        dash="5 3"
      />

      {/* y=x ± GRR Limit */}
      {showTestLimit && band > 0 && (
        <>
          <SpecLine
            x1={upper[0].x}
            y1={upper[0].y}
            x2={upper[1].x}
            y2={upper[1].y}
            {...common}
            stroke={SPEC_BAND_STROKE}
            strokeWidth={2.5}
            dash="6 4"
          />
          <SpecLine
            x1={lower[0].x}
            y1={lower[0].y}
            x2={lower[1].x}
            y2={lower[1].y}
            {...common}
            stroke={SPEC_BAND_STROKE}
            strokeWidth={2.5}
            dash="6 4"
          />
        </>
      )}
    </g>
  );
}
