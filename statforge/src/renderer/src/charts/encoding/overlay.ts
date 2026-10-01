import type { CellValue, ColumnMeta, Dataset, ModelingType } from "@shared/schemas/types";
import { naturalSortStrings } from "@renderer/utils/naturalSort";

export type OverlayGroup = {
  key: string;
  label: string;
  rowIndices: number[];
};

export type GraphIssue = {
  level: "error" | "warning" | "info";
  message: string;
};

const MISSING_LABEL = "(Missing)";

function cellLabel(value: CellValue): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t.length === 0 ? null : t;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function createEqualWidthBins(
  values: number[],
  binCount: number
): { edges: number[]; labels: string[] } {
  const n = Math.max(2, Math.min(20, Math.floor(binCount)));
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) {
    return { edges: [0, 1], labels: ["0–1"] };
  }
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (min === max) {
    return { edges: [min, max], labels: [`${min}`] };
  }
  const width = (max - min) / n;
  const edges: number[] = [];
  for (let i = 0; i <= n; i += 1) edges.push(min + width * i);
  edges[edges.length - 1] = max;
  const labels = edges.slice(0, -1).map((lo, i) => {
    const hi = edges[i + 1];
    return `${formatBin(lo)}–${formatBin(hi)}`;
  });
  return { edges, labels };
}

function formatBin(n: number): string {
  if (Math.abs(n) >= 100 || Number.isInteger(n)) return String(Math.round(n * 1000) / 1000);
  return n.toPrecision(4);
}

function binIndex(value: number, edges: number[]): number {
  if (!Number.isFinite(value) || edges.length < 2) return -1;
  if (value <= edges[0]) return 0;
  for (let i = 0; i < edges.length - 1; i += 1) {
    if (value <= edges[i + 1]) return i;
  }
  return edges.length - 2;
}

export function createOverlayGroups(
  dataset: Dataset,
  column: ColumnMeta | null,
  options: {
    showMissing?: boolean;
    binCount?: number;
    order?: "data" | "asc" | "desc";
  } = {}
): { groups: OverlayGroup[]; issues: GraphIssue[] } {
  const showMissing = options.showMissing ?? true;
  const order = options.order ?? "data";
  const issues: GraphIssue[] = [];

  if (!column) {
    return {
      groups: [
        {
          key: "__all__",
          label: "All",
          rowIndices: Array.from({ length: dataset.rowCount }, (_, i) => i),
        },
      ],
      issues,
    };
  }

  const values = dataset.columnsData[column.id] ?? [];
  const isContinuous =
    column.modelingType === "continuous" &&
    (column.dataType === "numeric" ||
      column.dataType === "date" ||
      column.dataType === "datetime");

  const map = new Map<string, number[]>();

  if (isContinuous) {
    const nums = values.map((v) => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v.replace(/,/g, ""));
        return Number.isFinite(n) ? n : null;
      }
      return null;
    });
    const { edges, labels } = createEqualWidthBins(
      nums.filter((n): n is number => n != null),
      options.binCount ?? 5
    );
    if (labels.length === 0) {
      issues.push({ level: "error", message: "Failed to create Overlay bins." });
    }
    for (let i = 0; i < dataset.rowCount; i += 1) {
      const n = nums[i];
      if (n == null) {
        if (showMissing) {
          const list = map.get(MISSING_LABEL) ?? [];
          list.push(i);
          map.set(MISSING_LABEL, list);
        }
        continue;
      }
      const idx = binIndex(n, edges);
      if (idx < 0) continue;
      const label = labels[idx] ?? String(n);
      const list = map.get(label) ?? [];
      list.push(i);
      map.set(label, list);
    }
  } else {
    for (let i = 0; i < dataset.rowCount; i += 1) {
      const label = cellLabel(values[i]);
      if (label == null) {
        if (showMissing) {
          const list = map.get(MISSING_LABEL) ?? [];
          list.push(i);
          map.set(MISSING_LABEL, list);
        }
        continue;
      }
      const list = map.get(label) ?? [];
      list.push(i);
      map.set(label, list);
    }
  }

  let keys = Array.from(map.keys());
  if (order === "data") {
    // Natural-sort categorical IDs so Overlay palette order matches Color legend
    // when the same column is dropped on Overlay (JMP SerialNumber case).
    if (!isContinuous) keys = naturalSortStrings(keys);
  } else if (order === "asc") {
    keys.sort((a, b) => a.localeCompare(b));
  } else if (order === "desc") {
    keys.sort((a, b) => b.localeCompare(a));
  }

  const OVERLAY_LEVEL_CAP = 120;
  if (keys.length > OVERLAY_LEVEL_CAP) {
    issues.push({
      level: "warning",
      message: `Overlay has ${keys.length} levels; showing the first ${OVERLAY_LEVEL_CAP}.`,
    });
    keys = keys.slice(0, OVERLAY_LEVEL_CAP);
  }

  const groups: OverlayGroup[] = keys.map((key) => ({
    key,
    label: key,
    rowIndices: map.get(key) ?? [],
  }));

  return { groups, issues };
}

export function isContinuousModeling(column: ColumnMeta): boolean {
  return (
    column.modelingType === "continuous" ||
    column.dataType === "numeric" ||
    column.dataType === "date" ||
    column.dataType === "datetime"
  );
}

export function modelingHint(column: ColumnMeta): ModelingType {
  return column.modelingType;
}
