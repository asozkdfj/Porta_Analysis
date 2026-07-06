import {
  columnByName,
  getCellValue,
  getNumericValue,
  getXNumeric,
} from "./mini-jmp-parser";
import type {
  MiniJmpAggregation,
  MiniJmpBoxPlotGroup,
  MiniJmpCategoryPoint,
  MiniJmpColumn,
  MiniJmpFilter,
  MiniJmpGraphType,
  MiniJmpHistogramBin,
  MiniJmpPointsMode,
  MiniJmpScatterPoint,
} from "./mini-jmp-types";

function applyFilters(
  rows: Record<string, string>[],
  filters: MiniJmpFilter[]
): Record<string, string>[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every((f) => getCellValue(row, f.column) === f.value)
  );
}

function aggregateValues(
  values: number[],
  aggregation: MiniJmpAggregation
): number {
  if (values.length === 0) return 0;
  switch (aggregation) {
    case "count":
      return values.length;
    case "sum":
      return values.reduce((s, v) => s + v, 0);
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "average":
    case "none":
    default:
      return values.reduce((s, v) => s + v, 0) / values.length;
  }
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base]! + rest * (sorted[base + 1]! - sorted[base]!);
  }
  return sorted[base]!;
}

function jitterOffset(seed: number, spread: number): number {
  const h = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return (h - Math.floor(h) - 0.5) * spread;
}

export function uniqueOrderedCategories(
  rows: Record<string, string>[],
  column: string
): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const row of rows) {
    const v = getCellValue(row, column) || "(empty)";
    if (!seen.has(v)) {
      seen.add(v);
      order.push(v);
    }
  }
  return order.sort((a, b) => naturalCompare(a, b));
}

export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** Color/Legend 순서 — X축 카테고리 순서 우선 */
export function sortColorKeys(
  keys: string[],
  preferredOrder?: string[]
): string[] {
  const unique = [...new Set(keys.filter(Boolean))];
  if (preferredOrder?.length) {
    const rank = new Map(preferredOrder.map((k, i) => [k, i]));
    return unique.sort((a, b) => {
      const ra = rank.get(a);
      const rb = rank.get(b);
      if (ra != null && rb != null) return ra - rb;
      if (ra != null) return -1;
      if (rb != null) return 1;
      return naturalCompare(a, b);
    });
  }
  return unique.sort(naturalCompare);
}

function columnIsCategoryAxis(col: MiniJmpColumn): boolean {
  return col.kind === "string";
}

export function buildPointsPlotData(input: {
  rows: Record<string, string>[];
  xColumn: string;
  yColumn: string | null;
  colorColumn: string | null;
  xCol: MiniJmpColumn;
  yCol: MiniJmpColumn | null;
  filters: MiniJmpFilter[];
  jitter?: number;
}): {
  mode: MiniJmpPointsMode;
  points: MiniJmpScatterPoint[];
  xCategories: string[];
  yCategories: string[];
} {
  const filtered = applyFilters(input.rows, input.filters);
  const jitterStrength = input.jitter ?? 0.45;

  const pickColor = (row: Record<string, string>) =>
    input.colorColumn
      ? getCellValue(row, input.colorColumn) || undefined
      : undefined;

  const xCats = uniqueOrderedCategories(filtered, input.xColumn);
  const xIndex = new Map(xCats.map((c, i) => [c, i]));
  const xSpread =
    Math.min(0.42, 0.9 / Math.max(xCats.length, 1)) * jitterStrength;

  if (!input.yColumn || !input.yCol) {
    const points: MiniJmpScatterPoint[] = [];
    filtered.forEach((row, i) => {
      const rawX = getCellValue(row, input.xColumn) || "(empty)";
      const xi = xIndex.get(rawX) ?? 0;
      points.push({
        x: xi + jitterOffset(i, xSpread),
        y: 0.5 + jitterOffset(i + 1000, 0.38 * jitterStrength),
        rawX,
        rawY: "",
        color: pickColor(row),
      });
    });
    return { mode: "x-only", points, xCategories: xCats, yCategories: [] };
  }

  const yCol = input.yCol;
  const yNumeric = yColumnIsPlottable(yCol, filtered);
  const xIsCategory = columnIsCategoryAxis(input.xCol);
  const yIsCategory = columnIsCategoryAxis(yCol);

  // JMP: X=범주, Y=숫자 → X축 하단(범주), Y축 좌측(숫자)
  if (yNumeric && !yIsCategory && xIsCategory) {
    const yJitter = 0.015 * jitterStrength;
    const points: MiniJmpScatterPoint[] = [];
    filtered.forEach((row, i) => {
      const rawX = getCellValue(row, input.xColumn) || "(empty)";
      const rawY = getCellValue(row, input.yColumn!) || "";
      const y = getNumericValue(row, input.yColumn!);
      if (y == null) return;
      const xi = xIndex.get(rawX) ?? 0;
      points.push({
        x: xi + jitterOffset(i, xSpread),
        y: y + jitterOffset(i + 500, yJitter * Math.max(Math.abs(y), 1)),
        rawX,
        rawY,
        color: pickColor(row),
      });
    });
    return { mode: "cat-numeric", points, xCategories: xCats, yCategories: [] };
  }

  const xNumeric =
    input.xCol.kind === "numeric" ||
    (input.xCol.kind === "datetime" && !xIsCategory);

  if (yNumeric && (xNumeric || input.xCol.kind === "datetime") && !yIsCategory) {
    return {
      mode: "numeric",
      points: buildScatterLineData({
        rows: input.rows,
        xColumn: input.xColumn,
        yColumn: input.yColumn,
        colorColumn: input.colorColumn,
        xCol: input.xCol,
        yCol: input.yCol,
        filters: input.filters,
      }),
      xCategories: [],
      yCategories: [],
    };
  }

  const yCats = uniqueOrderedCategories(filtered, input.yColumn);
  const yIndex = new Map(yCats.map((c, i) => [c, i]));
  const ySpread =
    Math.min(0.42, 0.9 / Math.max(yCats.length, 1)) * jitterStrength;

  const points: MiniJmpScatterPoint[] = [];
  filtered.forEach((row, i) => {
    const rawX = getCellValue(row, input.xColumn) || "(empty)";
    const rawY = getCellValue(row, input.yColumn!) || "(empty)";

    let x: number;
    if (xNumeric && !columnIsCategoryAxis(input.xCol)) {
      x =
        getXNumeric(row, input.xColumn, input.xCol.kind, i + 1) ??
        (xIndex.get(rawX) ?? 0);
    } else {
      const xi = xIndex.get(rawX) ?? 0;
      x = xi + jitterOffset(i, xSpread);
    }

    let y: number;
    if (yNumeric && !columnIsCategoryAxis(yCol)) {
      y = getNumericValue(row, input.yColumn!) ?? 0;
    } else {
      const yi = yIndex.get(rawY) ?? 0;
      y = yi + jitterOffset(i + 500, ySpread);
    }

    points.push({
      x,
      y,
      rawX,
      rawY,
      color: pickColor(row),
    });
  });

  return {
    mode: "categorical",
    points,
    xCategories: xCats,
    yCategories: yCats,
  };
}

export function buildScatterLineData(input: {
  rows: Record<string, string>[];
  xColumn: string;
  yColumn: string;
  colorColumn: string | null;
  xCol: MiniJmpColumn;
  yCol: MiniJmpColumn;
  filters: MiniJmpFilter[];
}): MiniJmpScatterPoint[] {
  const filtered = applyFilters(input.rows, input.filters);
  const points: MiniJmpScatterPoint[] = [];

  filtered.forEach((row, i) => {
    const y = getNumericValue(row, input.yColumn);
    if (y == null) return;

    const x =
      getXNumeric(row, input.xColumn, input.xCol.kind, i + 1) ??
      (input.xCol.kind === "string"
        ? null
        : getNumericValue(row, input.xColumn));
    if (x == null || !Number.isFinite(x)) return;

    const color = input.colorColumn
      ? getCellValue(row, input.colorColumn) || undefined
      : undefined;

    points.push({
      x,
      y,
      color,
      rawX: getCellValue(row, input.xColumn),
      rawY: getCellValue(row, input.yColumn),
    });
  });

  return points.sort((a, b) => a.x - b.x);
}

export function buildCategoryData(input: {
  rows: Record<string, string>[];
  xColumn: string;
  yColumn: string;
  aggregation: MiniJmpAggregation;
  filters: MiniJmpFilter[];
}): MiniJmpCategoryPoint[] {
  const filtered = applyFilters(input.rows, input.filters);
  const groups = new Map<string, number[]>();

  for (const row of filtered) {
    const cat = getCellValue(row, input.xColumn) || "(empty)";
    const y = getNumericValue(row, input.yColumn);
    if (!groups.has(cat)) groups.set(cat, []);
    if (y != null) groups.get(cat)!.push(y);
  }

  return [...groups.entries()]
    .map(([category, values]) => ({
      category,
      value: aggregateValues(
        values,
        input.aggregation === "none" ? "average" : input.aggregation
      ),
      count: values.length,
    }))
    .sort((a, b) => b.value - a.value);
}

export function buildHistogramData(input: {
  rows: Record<string, string>[];
  column: string;
  filters: MiniJmpFilter[];
  binCount?: number;
}): MiniJmpHistogramBin[] {
  const filtered = applyFilters(input.rows, input.filters);
  const values = filtered
    .map((r) => getNumericValue(r, input.column))
    .filter((v): v is number => v != null);

  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const bins = input.binCount ?? Math.min(20, Math.ceil(Math.sqrt(values.length)));
  const span = max - min || 1;
  const width = span / bins;

  const counts = Array.from({ length: bins }, () => 0);
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    counts[idx]! += 1;
  }

  return counts.map((count, i) => {
    const binStart = min + i * width;
    const binEnd = i === bins - 1 ? max : min + (i + 1) * width;
    return {
      binStart,
      binEnd,
      label: `${binStart.toFixed(1)}–${binEnd.toFixed(1)}`,
      count,
    };
  });
}

export function buildBoxPlotData(input: {
  rows: Record<string, string>[];
  xColumn: string;
  yColumn: string;
  filters: MiniJmpFilter[];
}): MiniJmpBoxPlotGroup[] {
  const filtered = applyFilters(input.rows, input.filters);
  const groups = new Map<string, number[]>();

  for (const row of filtered) {
    const cat = getCellValue(row, input.xColumn) || "(empty)";
    const y = getNumericValue(row, input.yColumn);
    if (y == null) continue;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(y);
  }

  return [...groups.entries()]
    .map(([category, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return {
        category,
        min: sorted[0]!,
        q1: quantile(sorted, 0.25),
        median: quantile(sorted, 0.5),
        q3: quantile(sorted, 0.75),
        max: sorted[sorted.length - 1]!,
        count: sorted.length,
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category));
}

export function suggestGraphType(
  xCol: MiniJmpColumn | null,
  yCol: MiniJmpColumn | null,
  graphType: MiniJmpGraphType
): MiniJmpGraphType {
  if (graphType === "histogram") return "histogram";
  if (!xCol && yCol?.kind === "numeric") return "histogram";
  if (!xCol || !yCol) return graphType;

  if (xCol.kind === "string" && yCol.kind === "string") return "scatter";
  if (graphType === "box" && xCol.kind === "string" && yCol.kind === "numeric") {
    return "box";
  }
  if (graphType === "bar" && xCol.kind === "string" && yCol.kind === "numeric") {
    return "bar";
  }
  if (
    graphType === "line" &&
    yCol.kind !== "string" &&
    (xCol.kind === "datetime" || xCol.kind === "numeric")
  ) {
    return "line";
  }
  if (xCol.kind === "numeric" && yCol.kind === "numeric") return "scatter";
  if (xCol.kind === "string" && yCol.kind === "numeric") return "scatter";
  if (xCol.kind === "datetime" && yCol.kind === "numeric") return "line";
  if (xCol.kind === "string") return "scatter";
  return graphType;
}

export function columnHasNumericValues(
  rows: Record<string, string>[],
  column: string,
  threshold = 0.7
): boolean {
  const samples = rows.slice(0, 300);
  if (samples.length === 0) return false;
  let hits = 0;
  for (const row of samples) {
    if (getNumericValue(row, column) != null) hits += 1;
  }
  return hits / samples.length >= threshold;
}

export function yColumnIsPlottable(
  yCol: MiniJmpColumn | null,
  rows: Record<string, string>[]
): boolean {
  if (!yCol) return false;
  if (yCol.kind === "numeric") return true;
  return columnHasNumericValues(rows, yCol.name);
}

export function canRenderChart(input: {
  graphType: MiniJmpGraphType;
  columns: MiniJmpColumn[];
  rows: Record<string, string>[];
  xColumn: string | null;
  yColumn: string | null;
}): { ok: boolean; message: string } {
  const xCol = columnByName(input.columns, input.xColumn);
  const yCol = columnByName(input.columns, input.yColumn);

  if (input.graphType === "histogram") {
    const col = yCol ?? xCol;
    if (!col) return { ok: false, message: "Histogram: Numeric 컬럼을 지정하세요." };
    if (!yColumnIsPlottable(col, input.rows)) {
      return { ok: false, message: "Histogram: 숫자로 해석 가능한 컬럼이 필요합니다." };
    }
    return { ok: true, message: "" };
  }

  if (input.graphType === "scatter") {
    if (!xCol) {
      return { ok: false, message: "X 변수를 지정하세요." };
    }
    return { ok: true, message: "" };
  }

  if (!xCol || !yCol) {
    return { ok: false, message: "X와 Y 변수를 모두 지정하세요." };
  }

  if (input.graphType === "line") {
    if (!yColumnIsPlottable(yCol, input.rows)) {
      return {
        ok: false,
        message: "Line Chart: Y는 숫자 컬럼이어야 합니다. (예: TestTime)",
      };
    }
    return { ok: true, message: "" };
  }

  if (input.graphType === "bar" || input.graphType === "box") {
    if (xCol.kind !== "string" && xCol.kind !== "datetime") {
      return { ok: false, message: "X는 Category(Text) 또는 DateTime 컬럼이어야 합니다." };
    }
    if (!yColumnIsPlottable(yCol, input.rows)) {
      return {
        ok: false,
        message: "Y는 숫자 값이 있는 컬럼이어야 합니다. (예: TestTime)",
      };
    }
    return { ok: true, message: "" };
  }

  return { ok: true, message: "" };
}

export function pickGraphTypeForColumns(input: {
  columns: MiniJmpColumn[];
  rows: Record<string, string>[];
  xColumn: string;
  yColumn: string;
  preferred?: MiniJmpGraphType;
}): MiniJmpGraphType {
  const xCol = columnByName(input.columns, input.xColumn);
  const yCol = columnByName(input.columns, input.yColumn);
  if (!xCol || !yCol) return input.preferred ?? "scatter";

  const candidates: MiniJmpGraphType[] = [];
  const preferred = suggestGraphType(xCol, yCol, input.preferred ?? "scatter");
  candidates.push(preferred);
  for (const t of ["scatter", "line", "bar", "box", "histogram"] as const) {
    if (!candidates.includes(t)) candidates.push(t);
  }

  for (const graphType of candidates) {
    const check = canRenderChart({
      graphType,
      columns: input.columns,
      rows: input.rows,
      xColumn: input.xColumn,
      yColumn: input.yColumn,
    });
    if (check.ok) return graphType;
  }
  return input.preferred ?? "scatter";
}

export function uniqueCategoryValues(
  rows: Record<string, string>[],
  column: string,
  limit = 50
): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const v = getCellValue(row, column);
    if (v) set.add(v);
    if (set.size >= limit) break;
  }
  return [...set].sort();
}

const COLOR_PALETTE = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#ca8a04",
  "#4f46e5",
  "#0d9488",
  "#b45309",
  "#7c3aed",
];

export function colorForSeries(_key: string, index: number): string {
  return COLOR_PALETTE[index % COLOR_PALETTE.length]!;
}

export { COLOR_PALETTE };
