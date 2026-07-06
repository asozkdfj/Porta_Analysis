export type TemperatureBranch = "20C" | "50C";
export type TemperatureVerdict = "pass" | "warning" | "fail";
export type TemperatureFilter = "all" | "pass" | "warning" | "fail";

export const TEMPERATURE_BRANCHES: TemperatureBranch[] = ["20C", "50C"];

export interface TemperaturePoint {
  seq: number;
  timestamp: string;
  value: number;
}

export interface TemperatureSeriesStats {
  avg: number;
  min: number;
  max: number;
  delta: number;
  stdDev: number;
}

export interface TemperatureLimits {
  target: number | null;
  upper: number | null;
  lower: number | null;
}

export interface TemperatureSocketReading {
  runId: string;
  rowIndex: number;
  socket: string;
  socketIndex: number;
  socketLabel: string;
  value: number;
  verdict: TemperatureVerdict;
  specOut: boolean;
  testSequence: number;
  attemptLabel: string;
  timestamp: string;
}

export interface TemperatureSocketSeries {
  socket: string;
  socketLabel: string;
  points: TemperaturePoint[];
  stats: TemperatureSeriesStats;
  verdict: TemperatureVerdict;
  statusLabel: string;
  message: string;
}

export interface TemperatureAggregateSummary {
  socketCount: number;
  avgTemp: number | null;
  minTemp: number | null;
  maxTemp: number | null;
  tempRange: number | null;
  stdDev: number | null;
  passCount: number;
  warningCount: number;
  failCount: number;
  overallVerdict: TemperatureVerdict;
  overallMessage: string;
}

export interface TemperatureBarcodeSeries {
  barcode: string;
  barcodeLabel: string;
  readings: TemperatureSocketReading[];
  stats: TemperatureSeriesStats;
  verdict: TemperatureVerdict;
  statusLabel: string;
  message: string;
}

export interface TemperatureOverviewAnalysis {
  branch: TemperatureBranch;
  header: string;
  limits: TemperatureLimits;
  socketOrder: string[];
  barcodes: TemperatureBarcodeSeries[];
  summary: TemperatureAggregateSummary & { barcodeCount: number };
}

export interface TemperatureBarcodeAnalysis {
  barcode: string;
  branch: TemperatureBranch;
  header: string;
  limits: TemperatureLimits;
  maxSequenceCount: number;
  sockets: TemperatureSocketSeries[];
  summary: TemperatureAggregateSummary;
}

export interface TemperatureResultRow {
  runId: string;
  rowIndex: number;
  barcode: string;
  socket: string;
  socketLabel: string;
  branch: TemperatureBranch;
  header: string;
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  deltaTemp: number;
  stdDev: number;
  verdict: TemperatureVerdict;
  statusLabel: string;
  message: string;
  pointCount: number;
  limits: TemperatureLimits;
  testSequence: number;
  attemptLabel: string;
  timestamp: string;
}

export interface TemperatureBatchSummary extends TemperatureAggregateSummary {
  total: number;
  pass: number;
  warning: number;
  fail: number;
  passRate: number;
  warningRate: number;
  failRate: number;
  uniqueBarcodes: number;
  retestCount: number;
  retestRate: number;
  passAfterRetest: number;
  failAfterRetest: number;
}

export interface TemperatureChartPoint {
  socket: string;
  socketLabel: string;
  socketIndex: number;
  [seriesKey: string]: number | string;
}

/** Barcode + runId 복합 키 (차트 제외 상태) */
export interface TemperatureExcludedReading {
  key: string;
  barcode: string;
  barcodeLabel: string;
  runId: string;
  socket: string;
  socketLabel: string;
  value: number;
  attemptLabel: string;
}
