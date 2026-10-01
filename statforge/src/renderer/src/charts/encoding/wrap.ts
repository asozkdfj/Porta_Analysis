import type { ColumnMeta, Dataset } from "@shared/schemas/types";
import { isLimitMetadataLabel } from "@renderer/data/limitMetadata";
import {
  createOverlayGroups,
  type GraphIssue,
  type OverlayGroup,
} from "./overlay";

export type WrapGroup = OverlayGroup;

export const WRAP_LEVEL_CAP = 36;
export const PAGE_LEVEL_CAP = 48;
/** Default number of columns in the wrap trellis (JMP-style). */
export const WRAP_GRID_COLS = 3;

/**
 * JMP Graph Builder Wrap / Page: one facet per level of the column.
 * Reuses Overlay grouping (categorical levels / continuous bins).
 */
export function createWrapGroups(
  dataset: Dataset,
  column: ColumnMeta | null,
  options: {
    showMissing?: boolean;
    binCount?: number;
    /** Defaults to WRAP_LEVEL_CAP; Page uses PAGE_LEVEL_CAP. */
    levelCap?: number;
    roleLabel?: string;
  } = {}
): { groups: WrapGroup[]; issues: GraphIssue[] } {
  if (!column) {
    return { groups: [], issues: [] };
  }

  const { groups, issues } = createOverlayGroups(dataset, column, {
    showMissing: options.showMissing ?? true,
    binCount: options.binCount ?? 5,
    order: "data",
  });

  const cap = options.levelCap ?? WRAP_LEVEL_CAP;
  const roleLabel = options.roleLabel ?? "Wrap";

  // Exclude synthetic "all" and GRR metadata labels (Lower/Upper Limit, Unit, …)
  let levels = groups.filter(
    (g) => g.key !== "__all__" && !isLimitMetadataLabel(g.label)
  );

  if (levels.length > cap) {
    issues.push({
      level: "warning",
      message: `${roleLabel} has ${levels.length} levels; showing the first ${cap}.`,
    });
    levels = levels.slice(0, cap);
  }

  if (levels.length === 0) {
    issues.push({
      level: "warning",
      message: `${roleLabel} column has no usable levels.`,
    });
  }

  return { groups: levels, issues };
}

/** Alias for Page role — same grouping, higher default cap. */
export function createPageGroups(
  dataset: Dataset,
  column: ColumnMeta | null,
  options: {
    showMissing?: boolean;
    binCount?: number;
  } = {}
): { groups: WrapGroup[]; issues: GraphIssue[] } {
  return createWrapGroups(dataset, column, {
    ...options,
    levelCap: PAGE_LEVEL_CAP,
    roleLabel: "Page",
  });
}

export function wrapGridSize(
  panelCount: number,
  cols = WRAP_GRID_COLS
): { cols: number; rows: number } {
  const c = Math.max(1, Math.min(cols, Math.max(1, panelCount)));
  const rows = Math.max(1, Math.ceil(panelCount / c));
  return { cols: c, rows };
}
