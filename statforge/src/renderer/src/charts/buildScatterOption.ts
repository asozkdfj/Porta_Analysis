import { SCATTER_SAMPLE_LIMIT } from "@shared/constants/app";
import type { CellValue, ColumnMeta, Dataset, GraphConfig } from "@shared/schemas/types";
import { isLimitMetadataLabel } from "../data/limitMetadata";
import { getNumericColumnValues } from "../data/parseCsv";
import { isNumericDataType } from "../utils/roleValidation";
import type { EChartsOption } from "echarts";

/** Prefer real category ticks; overlap hiding keeps dense serial axes readable. */
const CATEGORY_DENSE_THRESHOLD = 40;

function sampleIndices(rowCount: number, limit: number): number[] {
  if (rowCount <= limit) {
    return Array.from({ length: rowCount }, (_, i) => i);
  }
  const step = rowCount / limit;
  const indices: number[] = [];
  for (let i = 0; i < limit; i += 1) {
    indices.push(Math.floor(i * step));
  }
  return indices;
}

function cellToLabel(value: CellValue): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    if (t.length === 0) return null;
    if (isLimitMetadataLabel(t)) return null;
    return t;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function truncateLabel(value: string, max = 22): string {
  if (value.length <= max) return value;
  const head = Math.ceil((max - 1) * 0.55);
  const tail = max - 1 - head;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Shorten PROX::MOD_FOO_BAR → FOO_BAR for axis titles */
function shortAxisName(name: string, max = 28): string {
  const parts = name.split("::");
  const leaf = parts[parts.length - 1] ?? name;
  return truncateLabel(leaf, max);
}

function numericRatio(dataset: Dataset, columnId: string): number {
  const values = dataset.columnsData[columnId] ?? [];
  let nonMissing = 0;
  let numeric = 0;
  for (const v of values) {
    if (v == null || (typeof v === "string" && v.trim() === "")) continue;
    nonMissing += 1;
    if (typeof v === "number" && Number.isFinite(v)) {
      numeric += 1;
      continue;
    }
    if (typeof v === "boolean") {
      numeric += 1;
      continue;
    }
    if (typeof v === "string") {
      if (isLimitMetadataLabel(v)) continue;
      const n = Number(v.replace(/,/g, "").trim());
      if (Number.isFinite(n) && v.trim() !== "") numeric += 1;
    }
  }
  return nonMissing === 0 ? 0 : numeric / nonMissing;
}

/**
 * Prefer continuous axis when the column is typed numeric/date OR mostly parses as numbers.
 * Barcodes / serials / text stay categorical.
 */
export function shouldUseContinuousAxis(
  dataset: Dataset,
  column: ColumnMeta
): boolean {
  if (
    isNumericDataType(column.dataType) &&
    column.dataType !== "date" &&
    column.dataType !== "datetime"
  ) {
    return numericRatio(dataset, column.id) >= 0.5;
  }
  if (column.dataType === "date" || column.dataType === "datetime") {
    return true;
  }
  return numericRatio(dataset, column.id) >= 0.9;
}

type AxisSeries = {
  continuous: boolean;
  coords: Array<number | null>;
  labels: Array<string | null>;
  categoryOrder: string[];
};

function buildAxisSeries(
  dataset: Dataset,
  column: ColumnMeta,
  continuous: boolean
): AxisSeries {
  if (continuous) {
    const nums = getNumericColumnValues(dataset, column.id);
    return {
      continuous: true,
      coords: nums,
      labels: nums.map((n) => (n == null ? null : String(n))),
      categoryOrder: [],
    };
  }

  const raw = dataset.columnsData[column.id] ?? [];
  const labels = raw.map((v) => cellToLabel(v));
  const order: string[] = [];
  const indexOf = new Map<string, number>();
  for (const label of labels) {
    if (label == null) continue;
    if (!indexOf.has(label)) {
      indexOf.set(label, order.length);
      order.push(label);
    }
  }
  const coords = labels.map((label) =>
    label == null ? null : (indexOf.get(label) ?? null)
  );
  return { continuous: false, coords, labels, categoryOrder: order };
}

function axisConfig(
  series: AxisSeries,
  name: string,
  logScale: boolean,
  showGrid: boolean,
  vertical: boolean
): Record<string, unknown> {
  if (series.continuous) {
    return {
      type: logScale ? "log" : "value",
      name,
      nameLocation: "middle",
      nameGap: vertical ? 44 : 32,
      splitLine: { show: showGrid },
    };
  }

  const dense = series.categoryOrder.length > CATEGORY_DENSE_THRESHOLD;
  return {
    type: "category",
    data: series.categoryOrder,
    name,
    nameLocation: "middle",
    nameGap: vertical ? 36 : dense ? 42 : 30,
    axisLabel: {
      rotate: vertical ? 0 : dense || series.categoryOrder.length > 8 ? 35 : 0,
      interval: "auto",
      hideOverlap: true,
      showMinLabel: true,
      showMaxLabel: true,
      fontSize: 10,
      margin: 8,
      formatter: (value: string) => truncateLabel(String(value), dense ? 12 : 18),
    },
    axisTick: { alignWithLabel: true },
    splitLine: { show: showGrid },
  };
}

export function buildScatterOption(
  dataset: Dataset,
  config: GraphConfig
): EChartsOption | null {
  const xRef = config.roles.x[0];
  const yRef = config.roles.y[0];
  if (!xRef || !yRef) return null;

  const xCol = dataset.columns.find((c) => c.id === xRef.columnId);
  const yCol = dataset.columns.find((c) => c.id === yRef.columnId);
  if (!xCol || !yCol) return null;

  const xContinuous = shouldUseContinuousAxis(dataset, xCol);
  const yContinuous = shouldUseContinuousAxis(dataset, yCol);
  const xSeries = buildAxisSeries(dataset, xCol, xContinuous);
  const ySeries = buildAxisSeries(dataset, yCol, yContinuous);

  const indices = sampleIndices(dataset.rowCount, SCATTER_SAMPLE_LIMIT);

  type Point = {
    value: [number | string, number | string];
    xLabel: string;
    yLabel: string;
  };

  const points: Point[] = [];
  for (const i of indices) {
    const xLabel = xSeries.labels[i];
    const yLabel = ySeries.labels[i];
    if (xLabel == null || yLabel == null) continue;

    const xValue: number | string = xSeries.continuous
      ? (xSeries.coords[i] as number)
      : xLabel;
    const yValue: number | string = ySeries.continuous
      ? (ySeries.coords[i] as number)
      : yLabel;

    if (xSeries.continuous && xSeries.coords[i] == null) continue;
    if (ySeries.continuous && ySeries.coords[i] == null) continue;

    points.push({ value: [xValue, yValue], xLabel, yLabel });
  }

  if (points.length === 0) return null;

  const title = config.options.titleText || `${shortAxisName(yRef.name, 40)} vs ${shortAxisName(xRef.name, 40)}`;
  const xName = config.options.xAxisTitle || shortAxisName(xRef.name);
  const yName = config.options.yAxisTitle || shortAxisName(yRef.name);
  const xDense =
    !xSeries.continuous && xSeries.categoryOrder.length > CATEGORY_DENSE_THRESHOLD;

  return {
    animation: false,
    title: {
      text: title,
      left: "center",
      top: 6,
      textStyle: { fontSize: 13, fontWeight: 600, overflow: "truncate", width: 480 },
    },
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: (params: unknown) => {
        const p = params as { data?: Point };
        if (!p.data) return "";
        return `${xRef.name}: ${p.data.xLabel}<br/>${yRef.name}: ${p.data.yLabel}`;
      },
    },
    grid: {
      left: 12,
      right: 20,
      top: 44,
      bottom: xDense ? 8 : 8,
      containLabel: true,
      show: config.options.showGrid,
    },
    xAxis: {
      ...axisConfig(
        xSeries,
        xName,
        config.options.logX && xContinuous,
        config.options.showGrid,
        false
      ),
      // Keep the X axis title readable under the plot width
      nameTextStyle: { fontSize: 11, padding: [8, 0, 0, 0] },
    },
    yAxis: {
      ...axisConfig(
        ySeries,
        yName,
        config.options.logY && yContinuous,
        config.options.showGrid,
        true
      ),
      nameTextStyle: { fontSize: 11 },
    },
    legend: { show: false },
    series: [
      {
        type: "scatter",
        name: "Points",
        data: points,
        symbolSize: config.options.markerSize,
        itemStyle: {
          opacity: config.options.opacity,
          color: "#2f6fed",
        },
        large: points.length > 5000,
        largeThreshold: 5000,
      },
    ],
  };
}
