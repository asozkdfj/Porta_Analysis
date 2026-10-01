import type { CellValue, ColumnMeta, Dataset } from "@shared/schemas/types";
import type { GraphIssue } from "./overlay";

export type IntervalPair = {
  lower: number | null;
  upper: number | null;
  valid: boolean;
};

function toNumber(value: CellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function createIntervalValues(
  dataset: Dataset,
  yValues: Array<number | null>,
  intervalColumns: ColumnMeta[]
): { pairs: IntervalPair[]; issues: GraphIssue[] } {
  const issues: GraphIssue[] = [];
  const pairs: IntervalPair[] = Array.from({ length: dataset.rowCount }, () => ({
    lower: null,
    upper: null,
    valid: false,
  }));

  if (intervalColumns.length === 0) return { pairs, issues };

  if (intervalColumns.length > 2) {
    issues.push({
      level: "error",
      message: "Interval accepts at most two numeric columns (Lower / Upper).",
    });
  }

  const cols = intervalColumns.slice(0, 2);
  let invalidCount = 0;

  if (cols.length === 1) {
    const deltaCol = dataset.columnsData[cols[0].id] ?? [];
    for (let i = 0; i < dataset.rowCount; i += 1) {
      const y = yValues[i];
      const d = toNumber(deltaCol[i]);
      if (y == null || d == null) continue;
      if (d < 0) {
        invalidCount += 1;
        continue;
      }
      pairs[i] = { lower: y - d, upper: y + d, valid: true };
    }
  } else {
    const lowerCol = dataset.columnsData[cols[0].id] ?? [];
    const upperCol = dataset.columnsData[cols[1].id] ?? [];
    for (let i = 0; i < dataset.rowCount; i += 1) {
      const lo = toNumber(lowerCol[i]);
      const hi = toNumber(upperCol[i]);
      if (lo == null || hi == null) continue;
      if (lo > hi) {
        invalidCount += 1;
        continue;
      }
      pairs[i] = { lower: lo, upper: hi, valid: true };
    }
  }

  if (invalidCount > 0) {
    issues.push({
      level: "warning",
      message: `${invalidCount} rows have invalid Interval values and were skipped.`,
    });
  }

  return { pairs, issues };
}

export function validateIntervalColumns(
  count: number
): GraphIssue | null {
  if (count > 2) {
    return {
      level: "error",
      message: "Interval accepts at most two numeric columns.",
    };
  }
  return null;
}
