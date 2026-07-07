export type MiniJmpColumnKind = "numeric" | "string" | "datetime" | "boolean";

export type MiniJmpGraphType =
  | "scatter"
  | "line"
  | "bar"
  | "histogram"
  | "box"
  | "pareto"
  | "heatmap";

export type MiniJmpAggregation =
  | "none"
  | "count"
  | "average"
  | "sum"
  | "min"
  | "max";

export interface MiniJmpColumn {
  name: string;
  kind: MiniJmpColumnKind;
  index: number;
  nonEmptyCount: number;
  missingCount: number;
  uniqueCount: number;
  sampleValues: string[];
}

export interface MiniJmpDataset {
  fileName: string;
  headers: string[];
  columns: MiniJmpColumn[];
  rows: Record<string, string>[];
}

export type MiniJmpFilterOperator =
  | "equals"
  | "contains"
  | "notContains"
  | "gte"
  | "lte"
  | "between";

export interface MiniJmpFilter {
  column: string;
  operator: MiniJmpFilterOperator;
  value: string;
  /** between 연산 시 상한 */
  value2?: string;
}

export interface MiniJmpChartOptions {
  showGrid: boolean;
  showDataLabels: boolean;
  showTrendLine: boolean;
  /** Point opacity 0.1–1.0 (JMP-style alpha) */
  pointAlpha: number;
  /** Jitter strength 0–1 */
  jitter: number;
}

/** null = 데이터 자동 */
export interface MiniJmpAxisRange {
  min: number | null;
  max: number | null;
}

export interface MiniJmpGuideLine {
  id: string;
  /** 축 값 (숫자 축) 또는 카테고리 인덱스·경계(예: 15.5) */
  position: number;
  label?: string;
  /** 점선 색상 (hex). 미지정 시 기본 회색 */
  color?: string;
}

export interface MiniJmpAxisSettings {
  range: MiniJmpAxisRange;
  guideLines: MiniJmpGuideLine[];
}

export interface MiniJmpChartAxisConfig {
  x: MiniJmpAxisSettings;
  y: MiniJmpAxisSettings;
}

export const DEFAULT_MINI_JMP_AXIS_CONFIG: MiniJmpChartAxisConfig = {
  x: { range: { min: null, max: null }, guideLines: [] },
  y: { range: { min: null, max: null }, guideLines: [] },
};

export interface MiniJmpSummaryStats {
  count: number;
  missingCount: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  range: number | null;
  stdDev: number | null;
  q1: number | null;
  q3: number | null;
  iqr: number | null;
}

export type MiniJmpPointsMode = "x-only" | "categorical" | "cat-numeric" | "numeric";

export interface MiniJmpScatterPoint {
  x: number;
  y: number;
  /** Jitter seed (row index) */
  i?: number;
  color?: string;
  group?: string;
  label?: string;
  /** Normalized point radius multiplier 0.4–1.6 */
  size?: number;
  rawX?: string;
  rawY?: string;
}

export interface MiniJmpHeatmapCell {
  x: string;
  y: string;
  value: number;
  xIndex: number;
  yIndex: number;
}

export interface MiniJmpCategoryFreq {
  category: string;
  count: number;
  percent: number;
}

export interface MiniJmpFitStats {
  correlation: number | null;
  rSquared: number | null;
  slope: number | null;
  intercept: number | null;
  pointCount: number;
}

export interface MiniJmpParetoPoint {
  category: string;
  count: number;
  cumulativePct: number;
}

export interface MiniJmpSavedConfig {
  version: 1;
  name: string;
  graphType: MiniJmpGraphType;
  xColumn: string | null;
  yColumn: string | null;
  colorColumn: string | null;
  groupColumn: string | null;
  sizeColumn: string | null;
  labelColumn: string | null;
  aggregation: MiniJmpAggregation;
  options: MiniJmpChartOptions;
  axisConfig: MiniJmpChartAxisConfig;
  filters: MiniJmpFilter[];
}

export interface MiniJmpCategoryPoint {
  category: string;
  value: number;
  count: number;
}

export interface MiniJmpHistogramBin {
  binStart: number;
  binEnd: number;
  label: string;
  count: number;
}

export interface MiniJmpBoxPlotGroup {
  category: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
}

export const MINI_JMP_GRAPH_LABELS: Record<MiniJmpGraphType, string> = {
  scatter: "Scatter Plot",
  line: "Line Chart",
  bar: "Bar Chart",
  histogram: "Histogram",
  box: "Box Plot",
  pareto: "Pareto Chart",
  heatmap: "Heatmap",
};

export const MINI_JMP_AGGREGATION_LABELS: Record<MiniJmpAggregation, string> = {
  none: "None",
  count: "Count",
  average: "Average",
  sum: "Sum",
  min: "Min",
  max: "Max",
};
