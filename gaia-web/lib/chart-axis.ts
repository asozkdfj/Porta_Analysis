/** Recharts 축 눈금 라벨 포맷 */
export function formatAxisTick(value: number): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs >= 1e7) return value.toExponential(1);
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  if (abs >= 1) return value.toFixed(2);
  return value.toFixed(3);
}

/** Y축 눈금 길이에 맞춘 왼쪽 여백 */
export function leftMarginForDomain(lo: number, hi: number): number {
  const samples = [lo, hi, (lo + hi) / 2, lo + (hi - lo) * 0.25, lo + (hi - lo) * 0.75];
  const maxChars = Math.max(...samples.map((v) => formatAxisTick(v).length), 4);
  return Math.min(84, Math.max(56, maxChars * 7 + 12));
}

export const CHART_MARGIN_RIGHT = 28;
export const CHART_MARGIN_BOTTOM = 44;
export const CHART_MARGIN_TOP = 16;

export function buildChartMargin(lo: number, hi: number) {
  return {
    top: CHART_MARGIN_TOP,
    right: CHART_MARGIN_RIGHT,
    bottom: CHART_MARGIN_BOTTOM,
    left: leftMarginForDomain(lo, hi),
  };
}

export const Y_AXIS_WIDTH = 56;

export const Y_AXIS_TICK = { fontSize: 11 };

export const Y_AXIS_LABEL_PROPS = {
  angle: -90,
  position: "left" as const,
  style: { textAnchor: "middle" as const, fontSize: 12 },
};
