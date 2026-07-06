/**
 * GRR 차트 1:1 플롯 레이아웃
 *
 * Recharts는 Y축 width / X축 height가 플롯 크기에 추가되므로
 * chart width/height를 역산해 플롯 영역(plotSize × plotSize)을 정사각형으로 맞춘다.
 */
export const GRR_CHART_LAYOUT = {
  plotSize: 560,
  yAxisWidth: 52,
  xAxisHeight: 40,
  margin: { top: 20, right: 16, bottom: 28, left: 16 },
  /** 겹치는 SN 점·막대가 보이도록 */
  pointFillOpacity: 0.72,
  pointStrokeOpacity: 0.85,
  socketRangeStrokeOpacity: 0.55,
  repeatabilityStrokeOpacity: 0.65,
} as const;

export function getGrrChartDimensions(): { width: number; height: number } {
  const { plotSize, yAxisWidth, xAxisHeight, margin } = GRR_CHART_LAYOUT;
  return {
    width: plotSize + yAxisWidth + margin.left + margin.right,
    height: plotSize + xAxisHeight + margin.top + margin.bottom,
  };
}

export interface GrrPlotBounds {
  left: number;
  top: number;
  size: number;
}

export function getGrrPlotBounds(): GrrPlotBounds {
  const { plotSize, yAxisWidth, margin } = GRR_CHART_LAYOUT;
  return {
    left: yAxisWidth + margin.left,
    top: margin.top,
    size: plotSize,
  };
}

/** 플롯 픽셀 → 데이터 좌표 (의사 골든 X, 기준 소켓 Y) */
export function grrPlotPixelToData(
  px: number,
  py: number,
  domain: [number, number],
  bounds = getGrrPlotBounds()
): { dataX: number; dataY: number } | null {
  const [lo, hi] = domain;
  const { left, top, size } = bounds;
  if (px < left || px > left + size || py < top || py > top + size) {
    return null;
  }
  const tX = (px - left) / size;
  const tY = (py - top) / size;
  return {
    dataX: lo + tX * (hi - lo),
    dataY: hi - tY * (hi - lo),
  };
}
