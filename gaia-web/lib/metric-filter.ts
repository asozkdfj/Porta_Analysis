import type { GaiaSpecStore } from "./gaia-spec-config";
import { matchHeaderForGroup } from "./groups";
import {
  GRR_METRIC_POLICY,
  type MetricFilterSource,
} from "./grr-metric-policy";
import type { AnalysisGroup } from "./types";

export type { MetricFilterSource } from "./grr-metric-policy";

export interface MetricFilterResult {
  metrics: string[];
  source: MetricFilterSource;
}

function sortMetrics(items: string[]): string[] {
  return [...items].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Config Item → CSV Header 매칭 (Exact → CI → Contains)
 */
export function resolveHeaderForConfigItem(
  configItem: string,
  headers: string[]
): string | null {
  if (headers.includes(configItem)) return configItem;

  const ci = headers.find((h) => h.toLowerCase() === configItem.toLowerCase());
  if (ci) return ci;

  const itemUp = configItem.toUpperCase();
  let best: string | null = null;
  let bestScore = 0;

  for (const h of headers) {
    const hUp = h.toUpperCase();
    let score = 0;
    if (hUp === itemUp) score = 200;
    else if (hUp.includes(itemUp)) score = 100 + itemUp.length;
    else if (itemUp.includes(hUp)) score = 50 + hUp.length;

    if (score > bestScore) {
      bestScore = score;
      best = h;
    }
  }

  return bestScore > 0 ? best : null;
}

/** CSV Header가 GrrConfig에 등록된 Item과 연결되는지 */
export function isHeaderInGrrConfig(header: string, store: GaiaSpecStore): boolean {
  if (store.byItem.has(header)) return true;
  if ([...store.byItem.keys()].some((k) => k.toLowerCase() === header.toLowerCase())) {
    return true;
  }
  const hUp = header.toUpperCase();
  for (const item of store.byItem.keys()) {
    const itemUp = item.toUpperCase();
    if (hUp.includes(itemUp) || itemUp.includes(hUp)) return true;
  }
  return false;
}

/**
 * GRR Metric 목록 — Reference(GrrConfig) Item만 사용 (정책: lib/grr-metric-policy.ts)
 *
 * Metric = Reference Item ∩ CSV Header ∩ Analysis Group
 * Fallback(헤더 패턴 단독) 없음.
 */
export function findMetricsWithGrrConfig(
  headers: string[],
  group: AnalysisGroup,
  specStore: GaiaSpecStore | null,
  liwBranch: "50C" | "20C" | "all" = "all"
): MetricFilterResult {
  if (!GRR_METRIC_POLICY.allowHeaderOnlyFallback && (!specStore || specStore.entries.length === 0)) {
    console.warn(
      `[GRR Policy] Reference(GrrConfig) 미로드 — Metric 목록을 비웁니다 (${group})`
    );
    return { metrics: [], source: "no_config" };
  }

  const seen = new Set<string>();
  const metrics: string[] = [];

  for (const entry of specStore!.entries) {
    if (!matchHeaderForGroup(entry.item, group, liwBranch)) continue;

    const resolved = resolveHeaderForConfigItem(entry.item, headers);
    if (!resolved || seen.has(resolved)) continue;

    if (!matchHeaderForGroup(resolved, group, liwBranch)) continue;

    seen.add(resolved);
    metrics.push(resolved);
  }

  if (metrics.length === 0) {
    console.warn(
      `[GRR Policy] Reference ∩ CSV ∩ ${group} 결과 없음 — Metric 목록 비움`
    );
    return { metrics: [], source: "no_match" };
  }

  return { metrics: sortMetrics(metrics), source: "grrconfig" };
}

/** Reference(GrrConfig)에 등록된 전체 Test Item (중복 제거, 파일 순서 유지) */
export function listAllReferenceConfigItems(specStore: GaiaSpecStore): string[] {
  const seen = new Set<string>();
  const items: string[] = [];

  for (const entry of specStore.entries) {
    const item = entry.item.trim();
    if (!item || seen.has(item)) continue;
    seen.add(item);
    items.push(item);
  }

  return items;
}
