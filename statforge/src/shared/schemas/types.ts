import {
  createDefaultGraphAxes,
  ensureGraphAxes,
  type GraphAxisConfig,
} from "./axis";

export type {
  AxisId,
  AxisScaleType,
  AxisRangeMode,
  AxisTickMode,
  AxisLabelOrientation,
  ReferenceLineStyle,
  ReferenceLabelPosition,
  AxisNumberFormat,
  FitUsingMode,
  ReferenceLine,
  AxisScaleConfig,
  AxisAppearanceConfig,
  AxisConfig,
  GraphAxisConfig,
} from "./axis";

export {
  createDefaultAxisScale,
  createDefaultAxisAppearance,
  createDefaultReferenceLine,
  createDefaultAxisConfig,
  createDefaultGraphAxes,
  ensureAxisConfig,
  ensureGraphAxes,
  resetAxisScale,
  resetAxisConfig,
} from "./axis";

export type DataType =
  | "numeric"
  | "character"
  | "boolean"
  | "date"
  | "datetime"
  | "categorical";

export type ModelingType = "continuous" | "ordinal" | "nominal";

export type CellValue = string | number | boolean | null;

export interface ColumnMeta {
  id: string;
  name: string;
  dataType: DataType;
  modelingType: ModelingType;
  missingCount: number;
  uniqueCount: number;
  hidden: boolean;
}

export interface Dataset {
  id: string;
  fileName: string | null;
  filePath: string | null;
  columns: ColumnMeta[];
  /** Column-oriented storage: columnId -> values */
  columnsData: Record<string, CellValue[]>;
  rowCount: number;
}

/** Legacy toolbar chart kinds (kept for non-core tools). */
export type GraphElementType =
  | "points"
  | "line"
  | "bar"
  | "area"
  | "histogram"
  | "boxplot"
  | "violin"
  | "heatmap"
  | "pie"
  | "mosaic"
  | "errorbar"
  | "trend"
  | "smoother"
  | "lineOfFit";

/** Core Graph Builder layer elements (can be combined). */
export type GraphLayerKind = "points" | "smoother" | "lineOfFit" | "line";

export type RoleKey =
  | "title"
  | "x"
  | "y"
  | "groupX"
  | "groupY"
  | "wrap"
  | "overlay"
  | "color"
  | "size"
  | "interval"
  | "frequency"
  | "page"
  | "mapShape";

export interface ColumnRef {
  columnId: string;
  name: string;
}

export interface GraphRoles {
  title: ColumnRef[];
  x: ColumnRef[];
  y: ColumnRef[];
  groupX: ColumnRef[];
  groupY: ColumnRef[];
  wrap: ColumnRef[];
  overlay: ColumnRef[];
  color: ColumnRef[];
  size: ColumnRef[];
  interval: ColumnRef[];
  frequency: ColumnRef[];
  page: ColumnRef[];
  mapShape: ColumnRef[];
}

export type SummaryStatistic =
  | "none"
  | "n"
  | "count" // legacy alias of n
  | "mean"
  | "median"
  | "geometricMean"
  | "min"
  | "minimum" // legacy
  | "max"
  | "maximum" // legacy
  | "range"
  | "sum"
  | "cumulativeSum"
  | "pctTotal"
  | "pctFactor"
  | "pctGrandTotal"
  | "stdDev"
  | "variance"
  | "stdErr"
  | "iqr"
  | "mad"
  | "q1"
  | "q3";

export type ErrorInterval =
  | "auto"
  | "none"
  | "range"
  | "iqr"
  | "standardError"
  | "standardDeviation"
  | "confidenceInterval"
  | "mad"
  | "customInterval"
  | "twoWayInterval";

export type IntervalStyle = "errorBar" | "band" | "hashBand" | "line";

export type JitterMode =
  | "none"
  | "auto"
  | "randomUniform"
  | "randomNormal"
  | "packed"
  | "centeredGrid"
  | "positiveGrid"
  | "densityRandom"
  // legacy aliases
  | "random"
  | "uniform"
  | "normal"
  | "centered";

export type SmootherMethod = "loess" | "movingAverage";
export type FitDegree = 1 | 2 | 3;
export type LineSortOrder = "xAsc" | "xDesc" | "rowOrder";

export interface PointsLayerOptions {
  summaryStatistic: SummaryStatistic;
  errorInterval: ErrorInterval;
  intervalStyle: IntervalStyle;
  jitter: JitterMode;
  jitterLimit: number;
  opacity: number;
  markerSize: number;
  markerShape: "circle" | "square" | "diamond" | "triangle";
  showLabels: boolean;
  applyColor: boolean;
  applySize: boolean;
  applyOverlay: boolean;
  applyInterval: boolean;
}

export interface SmootherLayerOptions {
  method: SmootherMethod;
  span: number;
  windowSize: number;
  lineWidth: number;
  opacity: number;
  applyOverlay: boolean;
  groupByColor: boolean;
}

export interface LineOfFitLayerOptions {
  degree: FitDegree;
  lineWidth: number;
  opacity: number;
  showEquation: boolean;
  showR2: boolean;
  applyOverlay: boolean;
  groupByColor: boolean;
}

export interface LineLayerOptions {
  summaryStatistic: SummaryStatistic;
  sortOrder: LineSortOrder;
  connectNulls: boolean;
  lineWidth: number;
  opacity: number;
  showMarkers: boolean;
  applyColor: boolean;
  applyOverlay: boolean;
  applyInterval: boolean;
}

export interface GraphLayerConfig {
  kind: GraphLayerKind;
  enabled: boolean;
  zIndex: number;
}

export interface GraphOptions {
  summaryStatistic: SummaryStatistic;
  errorInterval: ErrorInterval;
  intervalStyle: IntervalStyle;
  jitter: JitterMode;
  jitterLimit: number;
  opacity: number;
  markerSize: number;
  markerShape: "circle" | "square" | "diamond" | "triangle";
  showLabels: boolean;
  showLegend: boolean;
  showGrid: boolean;
  titleText: string;
  xAxisTitle: string;
  yAxisTitle: string;
  logX: boolean;
  logY: boolean;
  /** Continuous Overlay bin count */
  overlayBinCount: number;
  overlayShowMissing: boolean;
  sizeMinPx: number;
  sizeMaxPx: number;
  points: PointsLayerOptions;
  smoother: SmootherLayerOptions;
  lineOfFit: LineOfFitLayerOptions;
  line: LineLayerOptions;
}

export interface GraphConfig {
  id: string;
  /** Legacy single-type field; syncs with layers (Shift+click exclusive select). */
  elementType: GraphElementType;
  roles: GraphRoles;
  options: GraphOptions;
  layers: GraphLayerConfig[];
  activeLayer: GraphLayerKind;
  /** Independent X/Y axis settings (scale, appearance, reference lines). */
  axes: GraphAxisConfig;
}

export interface AppNotification {
  id: string;
  level: "info" | "warning" | "error";
  message: string;
  createdAt: number;
}

export function createEmptyRoles(): GraphRoles {
  return {
    title: [],
    x: [],
    y: [],
    groupX: [],
    groupY: [],
    wrap: [],
    overlay: [],
    color: [],
    size: [],
    interval: [],
    frequency: [],
    page: [],
    mapShape: [],
  };
}

export function createDefaultPointsOptions(): PointsLayerOptions {
  return {
    summaryStatistic: "none",
    errorInterval: "auto",
    intervalStyle: "errorBar",
    jitter: "auto",
    jitterLimit: 0.3,
    opacity: 0.85,
    markerSize: 6,
    markerShape: "circle",
    showLabels: false,
    applyColor: true,
    applySize: true,
    applyOverlay: true,
    applyInterval: true,
  };
}

export function createDefaultSmootherOptions(): SmootherLayerOptions {
  return {
    method: "loess",
    span: 0.45,
    windowSize: 9,
    lineWidth: 2,
    opacity: 0.95,
    applyOverlay: true,
    groupByColor: false,
  };
}

export function createDefaultLineOfFitOptions(): LineOfFitLayerOptions {
  return {
    degree: 1,
    lineWidth: 2,
    opacity: 0.95,
    showEquation: true,
    showR2: true,
    applyOverlay: true,
    groupByColor: false,
  };
}

export function createDefaultLineOptions(): LineLayerOptions {
  return {
    // JMP Graph Builder Line defaults to Mean — one point per X per series
    summaryStatistic: "mean",
    sortOrder: "xAsc",
    connectNulls: false,
    lineWidth: 2,
    opacity: 0.9,
    showMarkers: false,
    applyColor: true,
    applyOverlay: true,
    applyInterval: true,
  };
}

export function createDefaultLayers(): GraphLayerConfig[] {
  return [
    { kind: "points", enabled: true, zIndex: 60 },
    { kind: "smoother", enabled: false, zIndex: 30 },
    { kind: "lineOfFit", enabled: false, zIndex: 40 },
    { kind: "line", enabled: false, zIndex: 50 },
  ];
}

export function createDefaultGraphOptions(): GraphOptions {
  return {
    summaryStatistic: "none",
    errorInterval: "auto",
    intervalStyle: "errorBar",
    jitter: "auto",
    jitterLimit: 0.3,
    opacity: 0.85,
    markerSize: 6,
    markerShape: "circle",
    showLabels: false,
    showLegend: true,
    showGrid: true,
    titleText: "",
    xAxisTitle: "",
    yAxisTitle: "",
    logX: false,
    logY: false,
    overlayBinCount: 5,
    overlayShowMissing: true,
    sizeMinPx: 4,
    sizeMaxPx: 24,
    points: createDefaultPointsOptions(),
    smoother: createDefaultSmootherOptions(),
    lineOfFit: createDefaultLineOfFitOptions(),
    line: createDefaultLineOptions(),
  };
}

export function createDefaultGraphConfig(): GraphConfig {
  return {
    id: `graph_${Date.now()}`,
    elementType: "points",
    roles: createEmptyRoles(),
    options: createDefaultGraphOptions(),
    layers: createDefaultLayers(),
    activeLayer: "points",
    axes: createDefaultGraphAxes(),
  };
}

/** Migrate older configs that lack layers / axes. */
export function ensureGraphConfig(config: GraphConfig): GraphConfig {
  const base = createDefaultGraphConfig();
  const layers = config.layers?.length ? config.layers : createDefaultLayers();
  const options: GraphOptions = {
    ...createDefaultGraphOptions(),
    ...config.options,
    points: { ...createDefaultPointsOptions(), ...config.options?.points },
    smoother: { ...createDefaultSmootherOptions(), ...config.options?.smoother },
    lineOfFit: { ...createDefaultLineOfFitOptions(), ...config.options?.lineOfFit },
    line: { ...createDefaultLineOptions(), ...config.options?.line },
  };

  let axes = ensureGraphAxes(
    (config as GraphConfig & { axes?: GraphAxisConfig }).axes
  );
  const hadAxes = Boolean(
    (config as GraphConfig & { axes?: GraphAxisConfig }).axes
  );

  // Absorb legacy flat axis fields into axes only when migrating old projects.
  if (!hadAxes) {
    if (options.logX) {
      axes = {
        ...axes,
        x: { ...axes.x, scale: { ...axes.x.scale, scaleType: "log" } },
      };
    }
    if (options.logY) {
      axes = {
        ...axes,
        y: { ...axes.y, scale: { ...axes.y.scale, scaleType: "log" } },
      };
    }
    if (options.xAxisTitle) {
      axes = {
        ...axes,
        x: {
          ...axes.x,
          appearance: { ...axes.x.appearance, title: options.xAxisTitle },
        },
      };
    }
    if (options.yAxisTitle) {
      axes = {
        ...axes,
        y: {
          ...axes.y,
          appearance: { ...axes.y.appearance, title: options.yAxisTitle },
        },
      };
    }
    if (typeof config.options?.showGrid === "boolean") {
      axes = {
        x: {
          ...axes.x,
          appearance: { ...axes.x.appearance, showGrid: options.showGrid },
        },
        y: {
          ...axes.y,
          appearance: { ...axes.y.appearance, showGrid: options.showGrid },
        },
      };
    }
  }

  // Mirror axes → legacy options for older UI bits that still read them
  options.logX = axes.x.scale.scaleType === "log";
  options.logY = axes.y.scale.scaleType === "log";
  options.xAxisTitle = axes.x.appearance.title;
  options.yAxisTitle = axes.y.appearance.title;
  options.showGrid = axes.x.appearance.showGrid || axes.y.appearance.showGrid;

  return {
    ...base,
    ...config,
    layers,
    options,
    axes,
    activeLayer: config.activeLayer ?? "points",
  };
}
