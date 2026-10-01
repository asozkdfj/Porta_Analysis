import type {
  AxisAppearanceConfig,
  AxisConfig,
  AxisLabelOrientation,
  AxisScaleConfig,
} from "@shared/schemas/axis";
import { formatAxisValue } from "./formatAxisLabel";
import { parseAxisBound } from "./validateAxisScale";

export type EChartsAxisPartial = Record<string, unknown>;

function labelRotate(orientation: AxisLabelOrientation, fallback = 0): number {
  switch (orientation) {
    case "horizontal":
      return 0;
    case "vertical":
      return 90;
    case "angled45":
      return 45;
    case "angledMinus45":
      return -45;
    case "auto":
    default:
      return fallback;
  }
}

/** Auto rotate for dense category axes so every label can fit. */
export function categoryLabelRotate(count: number, orientation: AxisLabelOrientation): number {
  if (orientation !== "auto") return labelRotate(orientation, 0);
  if (count > 40) return 90;
  if (count > 16) return 60;
  if (count > 8) return 45;
  return 0;
}

export function categoryLabelFontSize(count: number): number {
  if (count > 60) return 8;
  if (count > 30) return 9;
  return 10;
}

/**
 * Build ECharts xAxis/yAxis partial from AxisConfig.
 * Auto range leaves min/max undefined so ECharts (or padding helpers) decide.
 */
export function buildAxisOptions(
  axis: AxisConfig,
  opts: {
    continuous: boolean;
    categoryData?: string[];
    defaultName: string;
    showAxisChrome: boolean;
    fallbackLabelRotate?: number;
    /** When true (default for category X), show every tick label — no skipping. */
    showAllCategoryLabels?: boolean;
    /** Multi-Y stacked panels — tighter Y title treatment */
    stackedY?: boolean;
    /** Override default nameGap (Wrap trellis uses tighter gaps). */
    nameGap?: number;
    paddingExtent?: {
      min: (extent: { min: number; max: number }) => number;
      max: (extent: { min: number; max: number }) => number;
    };
  }
): EChartsAxisPartial {
  const { scale, appearance } = axis;
  const name =
    appearance.showTitle && opts.showAxisChrome
      ? appearance.title || opts.defaultName
      : undefined;

  const labelFormatter = (value: string | number) =>
    formatAxisValue(value, appearance);

  if (!opts.continuous || scale.scaleType === "category") {
    const catCount = opts.categoryData?.length ?? 0;
    const showAll = opts.showAllCategoryLabels !== false;
    // When thinning labels (facets), keep them mostly horizontal — denser ticks are skipped
    const rotate =
      !showAll && appearance.labelOrientation === "auto"
        ? catCount > 32
          ? 45
          : 0
        : categoryLabelRotate(catCount, appearance.labelOrientation);
    const defaultNameGap = showAll && rotate >= 45 ? 56 : 28;
    return {
      type: "category",
      data: opts.categoryData,
      inverse: scale.reverse,
      ...(showAll ? { interval: 0 } : {}),
      name,
      nameLocation: "middle",
      nameGap: opts.nameGap ?? defaultNameGap,
      axisLabel: {
        show: appearance.showTickLabels && opts.showAxisChrome,
        rotate,
        hideOverlap: !showAll,
        interval: showAll ? 0 : "auto",
        fontSize: categoryLabelFontSize(catCount),
        formatter: labelFormatter,
      },
      axisTick: {
        show: appearance.showTickMarks && opts.showAxisChrome,
        interval: showAll ? 0 : "auto",
        inside: appearance.tickMarksInside,
        alignWithLabel: true,
      },
      splitLine: { show: appearance.showGrid },
    };
  }

  const isLog = scale.scaleType === "log";
  const yNameGap = opts.stackedY ? 52 : axis.id === "y" ? 44 : 28;
  const base: EChartsAxisPartial = {
    type: isLog ? "log" : scale.scaleType === "time" ? "time" : "value",
    inverse: scale.reverse,
    scale: !isLog && !scale.includeZero,
    name,
    nameLocation: "middle",
    nameGap: opts.nameGap ?? (axis.id === "y" ? yNameGap : 28),
    nameTextStyle: {
      fontSize: opts.stackedY ? 9 : 10,
      overflow: "truncate",
      width: opts.stackedY ? 88 : 120,
    },
    axisLabel: {
      show: appearance.showTickLabels && opts.showAxisChrome,
      fontSize: 10,
      hideOverlap: true,
      rotate: labelRotate(appearance.labelOrientation, 0),
      formatter: labelFormatter,
    },
    axisTick: {
      show: appearance.showTickMarks && opts.showAxisChrome,
      inside: appearance.tickMarksInside,
    },
    splitLine: { show: appearance.showGrid },
  };

  if (isLog) {
    base.logBase = scale.logBase === Math.E ? Math.E : scale.logBase;
  }

  if (scale.rangeMode === "manual") {
    const min = parseAxisBound(scale.minimum);
    const max = parseAxisBound(scale.maximum);
    if (min != null) base.min = min;
    if (max != null) base.max = max;
  } else if (!isLog && opts.paddingExtent) {
    Object.assign(base, opts.paddingExtent);
  }

  if (scale.tickMode === "manual" && scale.tickIncrement != null) {
    const inc = parseAxisBound(scale.tickIncrement);
    if (inc != null && inc > 0) {
      base.interval = inc;
      base.minInterval = inc;
    }
  }

  if (scale.minorTickCount > 0) {
    base.minorTick = { show: true, splitNumber: scale.minorTickCount };
    base.minorSplitLine = { show: false };
  }

  void opts.fallbackLabelRotate;

  return base;
}

export function effectiveManualRange(
  scale: AxisScaleConfig
): { min: number; max: number } | null {
  if (scale.rangeMode !== "manual") return null;
  const min = parseAxisBound(scale.minimum);
  const max = parseAxisBound(scale.maximum);
  if (min == null || max == null || min >= max) return null;
  return { min, max };
}

export function syncAppearanceTitle(
  appearance: AxisAppearanceConfig,
  fallback: string
): string {
  return appearance.title?.trim() ? appearance.title : fallback;
}
