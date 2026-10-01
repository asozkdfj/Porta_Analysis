import type { ColumnMeta, Dataset } from "@shared/schemas/types";
import { createWrapGroups, type WrapGroup } from "./wrap";
import type { GraphIssue } from "./overlay";

export type GroupFacet = WrapGroup;

export const GROUP_LEVEL_CAP = 24;

const ALL_KEY = "__all__";

/** Single synthetic group covering every row (no Group X / Group Y column). */
export function createAllGroup(dataset: Dataset): GroupFacet {
  return {
    key: ALL_KEY,
    label: "",
    rowIndices: Array.from({ length: dataset.rowCount }, (_, i) => i),
  };
}

export function createGroupXGroups(
  dataset: Dataset,
  column: ColumnMeta | null,
  options: { showMissing?: boolean; binCount?: number } = {}
): { groups: GroupFacet[]; issues: GraphIssue[] } {
  return createWrapGroups(dataset, column, {
    ...options,
    levelCap: GROUP_LEVEL_CAP,
    roleLabel: "Group X",
  });
}

export function createGroupYGroups(
  dataset: Dataset,
  column: ColumnMeta | null,
  options: { showMissing?: boolean; binCount?: number } = {}
): { groups: GroupFacet[]; issues: GraphIssue[] } {
  return createWrapGroups(dataset, column, {
    ...options,
    levelCap: GROUP_LEVEL_CAP,
    roleLabel: "Group Y",
  });
}

/** Intersection of two row-index lists (order follows `a`). */
export function intersectRowIndices(a: number[], b: number[]): number[] {
  if (a.length === 0 || b.length === 0) return [];
  const set = new Set(b);
  return a.filter((i) => set.has(i));
}

export function isAllGroup(group: GroupFacet): boolean {
  return group.key === ALL_KEY;
}
