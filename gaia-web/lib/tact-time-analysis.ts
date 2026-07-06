import { getSnColor } from "./chart-colors";
import { parseTimeLabelToMs } from "./tact-time-parser";
import type {
  TactTimeAnalysis,
  TactTimeGroup,
  TactTimeGroupResult,
  TactTimeRow,
} from "./tact-time-types";

const UNGROUPED_ID = "__ungrouped__";
const UNGROUPED_NAME = "Ungrouped";
const UNGROUPED_COLOR = "#64748b";

function earliestTime(rows: TactTimeRow[]): string {
  if (rows.length === 0) return "—";
  return rows.reduce((best, row) => {
    if (!best) return row.startTime || "—";
    if (!row.startTime) return best;
    return parseTimeLabelToMs(row.startTime) < parseTimeLabelToMs(best)
      ? row.startTime
      : best;
  }, "");
}

function latestTime(rows: TactTimeRow[]): string {
  if (rows.length === 0) return "—";
  return rows.reduce((best, row) => {
    if (!best) return row.endTime || "—";
    if (!row.endTime) return best;
    return parseTimeLabelToMs(row.endTime) > parseTimeLabelToMs(best)
      ? row.endTime
      : best;
  }, "");
}

function buildGroupResult(
  id: string,
  name: string,
  items: TactTimeRow[],
  color: string,
  isUngrouped?: boolean
): TactTimeGroupResult {
  const headers = items.map((i) => i.header);
  return {
    id,
    name,
    headers,
    itemCount: items.length,
    totalDurationMs: items.reduce((s, i) => s + i.durationMs, 0),
    startTime: earliestTime(items),
    endTime: latestTime(items),
    items,
    color,
    isUngrouped,
  };
}

/** 그룹 설정을 현재 CSV Header에 맞게 정리 (없는 Header 제거) — 저장소 변경 없이 분석 시에만 사용 */
export function sanitizeGroupsForHeaders(
  groups: TactTimeGroup[],
  availableHeaders: string[]
): TactTimeGroup[] {
  const available = new Set(availableHeaders);
  const assigned = new Set<string>();

  return groups
    .map((g) => ({
      ...g,
      headers: g.headers.filter((h) => {
        if (!available.has(h) || assigned.has(h)) return false;
        assigned.add(h);
        return true;
      }),
    }))
    .filter((g) => g.headers.length > 0);
}

export function buildTactTimeAnalysis(
  rows: TactTimeRow[],
  groups: TactTimeGroup[]
): TactTimeAnalysis {
  const rowByHeader = new Map(rows.map((r) => [r.header, r]));
  const assigned = new Set<string>();
  const results: TactTimeGroupResult[] = [];

  groups.forEach((group, index) => {
    const items = group.headers
      .filter((h) => rowByHeader.has(h) && !assigned.has(h))
      .map((h) => {
        assigned.add(h);
        return rowByHeader.get(h)!;
      });

    if (items.length === 0) return;

    results.push(
      buildGroupResult(group.id, group.name, items, getSnColor(index))
    );
  });

  const ungroupedItems = rows.filter((r) => !assigned.has(r.header));
  if (ungroupedItems.length > 0) {
    results.push(
      buildGroupResult(
        UNGROUPED_ID,
        UNGROUPED_NAME,
        ungroupedItems,
        UNGROUPED_COLOR,
        true
      )
    );
  }

  const totalDurationMs = results.reduce((s, g) => s + g.totalDurationMs, 0);
  const longestGroup =
    results.length > 0
      ? results.reduce((max, g) =>
          g.totalDurationMs > max.totalDurationMs ? g : max
        )
      : null;

  return { groups: results, totalDurationMs, longestGroup };
}

export function getAssignedHeaders(groups: TactTimeGroup[]): Set<string> {
  const set = new Set<string>();
  for (const g of groups) {
    for (const h of g.headers) set.add(h);
  }
  return set;
}

export function validateGroupName(
  groups: TactTimeGroup[],
  name: string,
  excludeId?: string
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "그룹 이름을 입력하세요.";
  if (
    groups.some(
      (g) => g.id !== excludeId && g.name.toLowerCase() === trimmed.toLowerCase()
    )
  ) {
    return "이미 사용 중인 그룹 이름입니다.";
  }
  return null;
}
