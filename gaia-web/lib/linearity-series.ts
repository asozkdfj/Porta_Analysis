import type { LinearityBranch, LinearityMetricKind, LinearitySeriesDef } from "./liw-linearity-types";

export const LINEARITY_BRANCHES: LinearityBranch[] = ["20C", "50C"];
export const LINEARITY_KINDS: LinearityMetricKind[] = ["PO", "FB", "ERR"];

export function buildSeriesDef(
  branch: LinearityBranch,
  kind: LinearityMetricKind
): LinearitySeriesDef {
  const headerToken = `LIW${branch}_${kind}_`;
  return {
    branch,
    kind,
    headerToken,
    label: `LIW${branch}_${kind}_*`,
  };
}

/** GRR 페이지 UI 기본 — PO, 분기는 UI에서 20C/50C 선택 */
export const DEFAULT_LINEARITY_SERIES = buildSeriesDef("20C", "PO");
