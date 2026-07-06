export type MiniJmpColumnKind = "numeric" | "string" | "datetime";

export type MiniJmpGraphType =
  | "scatter"
  | "line"
  | "bar"
  | "histogram"
  | "box";

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
  sampleValues: string[];
}

export interface MiniJmpDataset {
  fileName: string;
  headers: string[];
  columns: MiniJmpColumn[];
  rows: Record<string, string>[];
}

export interface MiniJmpFilter {
  column: string;
  value: string;
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

export interface MiniJmpSummaryStats {
  count: number;
  mean: number | null;
  min: number | null;
  max: number | null;
  stdDev: number | null;
}

export type MiniJmpPointsMode = "x-only" | "categorical" | "cat-numeric" | "numeric";

export interface MiniJmpScatterPoint {
  x: number;
  y: number;
  color?: string;
  label?: string;
  rawX?: string;
  rawY?: string;
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
};

export const MINI_JMP_AGGREGATION_LABELS: Record<MiniJmpAggregation, string> = {
  none: "None",
  count: "Count",
  average: "Average",
  sum: "Sum",
  min: "Min",
  max: "Max",
};
