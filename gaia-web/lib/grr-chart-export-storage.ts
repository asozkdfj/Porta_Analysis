import type { AnalysisGroup } from "@/lib/types";

const STORAGE_KEY = "gaia-grr-chart-export-settings";

export interface GrrChartExportSettings {
  autoSaveCurrent: boolean;
  autoSaveOnLoad: boolean;
  /** 그룹별로 저장하지 않을 Metric 헤더 */
  disabledMetricsByGroup: Partial<Record<AnalysisGroup, string[]>>;
}

const DEFAULT_SETTINGS: GrrChartExportSettings = {
  autoSaveCurrent: false,
  autoSaveOnLoad: false,
  disabledMetricsByGroup: {},
};

export function loadGrrChartExportSettings(): GrrChartExportSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GrrChartExportSettings>;
    return {
      autoSaveCurrent: !!parsed.autoSaveCurrent,
      autoSaveOnLoad: !!parsed.autoSaveOnLoad,
      disabledMetricsByGroup: parsed.disabledMetricsByGroup ?? {},
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveGrrChartExportSettings(settings: GrrChartExportSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function isMetricExportEnabled(
  group: AnalysisGroup,
  metric: string,
  settings: GrrChartExportSettings
): boolean {
  const disabled = settings.disabledMetricsByGroup[group] ?? [];
  return !disabled.includes(metric);
}

export function setMetricExportEnabled(
  settings: GrrChartExportSettings,
  group: AnalysisGroup,
  metric: string,
  enabled: boolean
): GrrChartExportSettings {
  const prev = new Set(settings.disabledMetricsByGroup[group] ?? []);
  if (enabled) {
    prev.delete(metric);
  } else {
    prev.add(metric);
  }
  return {
    ...settings,
    disabledMetricsByGroup: {
      ...settings.disabledMetricsByGroup,
      [group]: [...prev],
    },
  };
}

export function listEnabledMetrics(
  group: AnalysisGroup,
  metrics: string[],
  settings: GrrChartExportSettings
): string[] {
  return metrics.filter((metric) => isMetricExportEnabled(group, metric, settings));
}
