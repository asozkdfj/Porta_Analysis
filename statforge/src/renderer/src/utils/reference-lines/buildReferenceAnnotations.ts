import type {
  AxisId,
  ReferenceLabelPosition,
  ReferenceLine,
  ReferenceLineStyle,
} from "@shared/schemas/axis";
import { parseAxisBound } from "../axis/validateAxisScale";
import { isReferenceLineInRange } from "./validateReferenceLine";

function echartsLineType(
  style: ReferenceLineStyle
): "solid" | "dashed" | "dotted" {
  if (style === "dashDot") return "dashed";
  if (style === "dotted") return "dotted";
  if (style === "dashed") return "dashed";
  return "solid";
}

function labelPositionForECharts(
  axisId: AxisId,
  pos: ReferenceLabelPosition
): string {
  // ECharts markLine label positions
  if (axisId === "y") {
    switch (pos) {
      case "insideStart":
        return "insideStartTop";
      case "insideEnd":
        return "insideEndTop";
      case "outsideStart":
        return "start";
      case "outsideEnd":
        return "end";
      case "center":
        return "middle";
      default:
        return "insideEndTop";
    }
  }
  switch (pos) {
    case "insideStart":
      return "insideStartTop";
    case "insideEnd":
      return "insideEndTop";
    case "outsideStart":
      return "start";
    case "outsideEnd":
      return "end";
    case "center":
      return "middle";
    default:
      return "insideEndTop";
  }
}

export function buildReferenceLineAnnotation(
  line: ReferenceLine,
  axisId: AxisId
): Record<string, unknown> | null {
  if (!line.visible || line.type !== "line") return null;
  const v = parseAxisBound(line.value ?? null);
  if (v == null) return null;

  const coord =
    axisId === "y"
      ? { yAxis: v }
      : { xAxis: v };

  return {
    ...coord,
    name: line.label,
    lineStyle: {
      color: line.lineColor,
      width: line.lineWidth,
      type: echartsLineType(line.lineStyle),
      opacity: line.opacity,
    },
    label: {
      show: line.labelVisible,
      formatter: line.label,
      color: line.labelColor,
      fontSize: line.labelFontSize,
      fontWeight: line.labelFontWeight,
      position: labelPositionForECharts(axisId, line.labelPosition),
    },
    emphasis: { disabled: true },
  };
}

export function buildReferenceRangeAnnotation(
  line: ReferenceLine,
  axisId: AxisId
): unknown[] | null {
  if (!line.visible || line.type !== "range") return null;
  const start = parseAxisBound(line.startValue ?? null);
  const end = parseAxisBound(line.endValue ?? null);
  if (start == null || end == null || start >= end) return null;

  if (axisId === "y") {
    return [
      [
        {
          yAxis: start,
          itemStyle: {
            color: line.fillColor ?? line.lineColor,
            opacity: line.fillOpacity ?? 0.12,
          },
        },
        { yAxis: end },
      ],
    ];
  }
  return [
    [
      {
        xAxis: start,
        itemStyle: {
          color: line.fillColor ?? line.lineColor,
          opacity: line.fillOpacity ?? 0.12,
        },
      },
      { xAxis: end },
    ],
  ];
}

export type AnnotationLayer = {
  markLineData: Record<string, unknown>[];
  markAreaData: unknown[];
};

/**
 * Build markLine / markArea payloads for a single silent annotation series.
 * Lines outside the visible range are omitted from rendering but kept in config.
 */
export function buildAxisAnnotationLayer(
  lines: ReferenceLine[],
  axisId: AxisId,
  visibleRange: { min: number; max: number } | null
): AnnotationLayer {
  const markLineData: Record<string, unknown>[] = [];
  const markAreaData: unknown[] = [];

  for (const line of lines) {
    if (line.type !== "range" || !line.visible) continue;
    if (visibleRange && !isReferenceLineInRange(line, visibleRange)) continue;
    const area = buildReferenceRangeAnnotation(line, axisId);
    if (area) markAreaData.push(...area);
  }
  for (const line of lines) {
    if (line.type !== "line" || !line.visible) continue;
    if (visibleRange && !isReferenceLineInRange(line, visibleRange)) continue;
    const ml = buildReferenceLineAnnotation(line, axisId);
    if (ml) markLineData.push(ml);
  }

  return { markLineData, markAreaData };
}

/** Merge X and Y annotations into one ECharts series object. */
export function buildCombinedAnnotationSeries(
  xLines: ReferenceLine[],
  yLines: ReferenceLine[],
  xRange: { min: number; max: number } | null,
  yRange: { min: number; max: number } | null
): Record<string, unknown> | null {
  const xAnn = buildAxisAnnotationLayer(xLines, "x", xRange);
  const yAnn = buildAxisAnnotationLayer(yLines, "y", yRange);
  const markLineData = [...xAnn.markLineData, ...yAnn.markLineData];
  const markAreaData = [...xAnn.markAreaData, ...yAnn.markAreaData];
  if (markLineData.length === 0 && markAreaData.length === 0) return null;

  return {
    type: "line",
    id: "__axis_annotations__",
    name: "__axis_annotations__",
    data: [],
    silent: true,
    symbol: "none",
    lineStyle: { opacity: 0, width: 0 },
    tooltip: { show: false },
    legendHoverLink: false,
    z: 15,
    markLine:
      markLineData.length > 0
        ? {
            silent: true,
            symbol: ["none", "none"],
            animation: false,
            data: markLineData,
          }
        : undefined,
    markArea:
      markAreaData.length > 0
        ? {
            silent: true,
            animation: false,
            data: markAreaData,
          }
        : undefined,
  };
}
