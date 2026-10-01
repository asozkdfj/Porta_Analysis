/** Axis Settings & Reference Lines schema (X/Y independent). */

export type AxisId = "x" | "y";

export type AxisScaleType = "linear" | "log" | "time" | "category";

export type AxisRangeMode = "auto" | "manual";

export type AxisTickMode = "auto" | "manual";

export type AxisLabelOrientation =
  | "auto"
  | "horizontal"
  | "vertical"
  | "angled45"
  | "angledMinus45";

export type ReferenceLineStyle = "solid" | "dashed" | "dotted" | "dashDot";

export type ReferenceLabelPosition =
  | "insideStart"
  | "insideEnd"
  | "outsideStart"
  | "outsideEnd"
  | "center";

export type AxisNumberFormat =
  | "auto"
  | "integer"
  | "decimal"
  | "scientific"
  | "percentage"
  | "date"
  | "datetime";

export type FitUsingMode = "allValidData" | "visibleAxisRangeOnly";

export type ReferenceLine = {
  id: string;
  type: "line" | "range";
  value?: number | string;
  startValue?: number | string;
  endValue?: number | string;
  label: string;
  lineColor: string;
  lineWidth: number;
  lineStyle: ReferenceLineStyle;
  opacity: number;
  labelVisible: boolean;
  labelColor: string;
  labelFontSize: number;
  labelFontWeight: "normal" | "bold";
  labelPosition: ReferenceLabelPosition;
  labelAxisSide: "same" | "opposite";
  fillColor?: string;
  fillOpacity?: number;
  boundaryLineVisible?: boolean;
  visible: boolean;
  /** Spec preset tag for UI */
  preset?: "LSL" | "Target" | "USL" | "Mean" | "Zero" | "Custom";
  /** When true and preset is Mean, value may be recomputed (schema reserved). */
  dynamicStatistic?: boolean;
};

export type AxisScaleConfig = {
  scaleType: AxisScaleType;
  rangeMode: AxisRangeMode;
  minimum: number | string | null;
  maximum: number | string | null;
  reverse: boolean;
  tickMode: AxisTickMode;
  tickIncrement: number | null;
  minorTickCount: number;
  includeZero: boolean;
  niceScale: boolean;
  logBase: 10 | 2 | typeof Math.E;
  paddingStart: number;
  paddingEnd: number;
  includeReferenceLinesInAutoRange: boolean;
  fitUsing: FitUsingMode;
};

export type AxisAppearanceConfig = {
  title: string;
  showTitle: boolean;
  showTickMarks: boolean;
  showTickLabels: boolean;
  showGrid: boolean;
  tickMarksInside: boolean;
  labelOrientation: AxisLabelOrientation;
  labelWrapLines: number;
  numberFormat: AxisNumberFormat;
  decimalPlaces: number | null;
  prefix: string;
  suffix: string;
};

export type AxisConfig = {
  id: AxisId;
  scale: AxisScaleConfig;
  appearance: AxisAppearanceConfig;
  referenceLines: ReferenceLine[];
};

export type GraphAxisConfig = {
  x: AxisConfig;
  y: AxisConfig;
};

export function createDefaultAxisScale(): AxisScaleConfig {
  return {
    scaleType: "linear",
    rangeMode: "auto",
    minimum: null,
    maximum: null,
    reverse: false,
    tickMode: "auto",
    tickIncrement: null,
    minorTickCount: 0,
    includeZero: false,
    niceScale: true,
    logBase: 10,
    paddingStart: 0.05,
    paddingEnd: 0.05,
    includeReferenceLinesInAutoRange: true,
    fitUsing: "allValidData",
  };
}

export function createDefaultAxisAppearance(
  title = ""
): AxisAppearanceConfig {
  return {
    title,
    showTitle: true,
    showTickMarks: true,
    showTickLabels: true,
    showGrid: true,
    tickMarksInside: false,
    labelOrientation: "auto",
    labelWrapLines: 1,
    numberFormat: "auto",
    decimalPlaces: null,
    prefix: "",
    suffix: "",
  };
}

export function createDefaultReferenceLine(
  partial?: Partial<ReferenceLine>
): ReferenceLine {
  const id =
    partial?.id ??
    `ref_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    type: "line",
    value: 0,
    label: "Reference",
    lineColor: "#c0392b",
    lineWidth: 1.5,
    lineStyle: "dashed",
    opacity: 0.9,
    labelVisible: true,
    labelColor: "#333333",
    labelFontSize: 11,
    labelFontWeight: "normal",
    labelPosition: "insideEnd",
    labelAxisSide: "same",
    fillColor: "#c0392b",
    fillOpacity: 0.12,
    boundaryLineVisible: true,
    visible: true,
    preset: "Custom",
    dynamicStatistic: false,
    ...partial,
    id,
  };
}

export function createDefaultAxisConfig(id: AxisId): AxisConfig {
  return {
    id,
    scale: createDefaultAxisScale(),
    appearance: createDefaultAxisAppearance(""),
    referenceLines: [],
  };
}

export function createDefaultGraphAxes(): GraphAxisConfig {
  return {
    x: createDefaultAxisConfig("x"),
    y: createDefaultAxisConfig("y"),
  };
}

export function ensureAxisConfig(
  id: AxisId,
  partial?: Partial<AxisConfig> | null
): AxisConfig {
  const base = createDefaultAxisConfig(id);
  if (!partial) return base;
  return {
    id,
    scale: { ...base.scale, ...partial.scale },
    appearance: { ...base.appearance, ...partial.appearance },
    referenceLines: Array.isArray(partial.referenceLines)
      ? partial.referenceLines.map((r) => createDefaultReferenceLine(r))
      : [],
  };
}

export function ensureGraphAxes(
  axes?: Partial<GraphAxisConfig> | null
): GraphAxisConfig {
  return {
    x: ensureAxisConfig("x", axes?.x),
    y: ensureAxisConfig("y", axes?.y),
  };
}

/** Reset scale to auto defaults; keep reverse & reference lines by default. */
export function resetAxisScale(axis: AxisConfig, keepReverse = true): AxisConfig {
  const scale = createDefaultAxisScale();
  if (keepReverse) scale.reverse = axis.scale.reverse;
  scale.scaleType = axis.scale.scaleType;
  scale.logBase = axis.scale.logBase;
  return { ...axis, scale };
}

/** Full axis reset (optionally clear reference lines). */
export function resetAxisConfig(
  axis: AxisConfig,
  options: { clearReferenceLines: boolean }
): AxisConfig {
  const next = createDefaultAxisConfig(axis.id);
  next.scale.scaleType = axis.scale.scaleType;
  if (!options.clearReferenceLines) {
    next.referenceLines = axis.referenceLines;
  }
  return next;
}
