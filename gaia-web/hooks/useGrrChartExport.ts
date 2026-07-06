"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildGrrChartFileName,
  captureElementAsPng,
  fetchGrrChartsOutboxInfo,
  saveGrrChartPng,
  waitForNextPaint,
  type GrrChartSaveResult,
} from "@/lib/grr-chart-export";
import {
  listEnabledMetrics,
  loadGrrChartExportSettings,
  saveGrrChartExportSettings,
  setMetricExportEnabled,
  type GrrChartExportSettings,
} from "@/lib/grr-chart-export-storage";
import type { AnalysisGroup, ParsedCsv } from "@/lib/types";

interface UseGrrChartExportOptions {
  parsed: ParsedCsv | null;
  group: AnalysisGroup;
  metrics: string[];
  metric: string;
  referenceSocket: string;
  serialFilter: string;
  fileName: string | null;
  exportRootRef: React.RefObject<HTMLDivElement | null>;
  setMetric: (metric: string) => void;
}

export function useGrrChartExport({
  parsed,
  group,
  metrics,
  metric,
  referenceSocket,
  serialFilter,
  fileName,
  exportRootRef,
  setMetric,
}: UseGrrChartExportOptions) {
  const [settings, setSettings] = useState<GrrChartExportSettings>(
    loadGrrChartExportSettings
  );
  const [outboxDir, setOutboxDir] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const metricRef = useRef(metric);
  const autoLoadKeyRef = useRef<string | null>(null);
  const lastAutoSaveKeyRef = useRef<string | null>(null);

  useEffect(() => {
    lastAutoSaveKeyRef.current = null;
    autoLoadKeyRef.current = null;
  }, [fileName, group]);

  useEffect(() => {
    metricRef.current = metric;
  }, [metric]);

  useEffect(() => {
    saveGrrChartExportSettings(settings);
  }, [settings]);

  const refreshOutboxInfo = useCallback(async () => {
    const info = await fetchGrrChartsOutboxInfo();
    if (info) setOutboxDir(info.outboxDir);
  }, []);

  useEffect(() => {
    void refreshOutboxInfo();
  }, [refreshOutboxInfo]);

  const enabledMetrics = useMemo(
    () => listEnabledMetrics(group, metrics, settings),
    [group, metrics, settings]
  );

  const waitForMetric = useCallback(async (targetMetric: string) => {
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      if (metricRef.current === targetMetric) {
        await waitForNextPaint(3);
        await new Promise((resolve) => setTimeout(resolve, 200));
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    return false;
  }, []);

  const saveCurrentChart = useCallback(
    async (metricOverride?: string): Promise<GrrChartSaveResult | null> => {
      const element = exportRootRef.current;
      if (!element || !parsed || !referenceSocket) return null;

      const activeMetric = metricOverride ?? metricRef.current;
      if (!activeMetric) return null;

      const blob = await captureElementAsPng(element);
      const chartFileName = buildGrrChartFileName({
        csvFileName: fileName,
        group,
        metric: activeMetric,
        referenceSocket,
      });
      const result = await saveGrrChartPng(chartFileName, blob);
      await refreshOutboxInfo();
      return result;
    },
    [exportRootRef, parsed, referenceSocket, fileName, group, refreshOutboxInfo]
  );

  const saveMetricChart = useCallback(
    async (targetMetric: string): Promise<GrrChartSaveResult | null> => {
      if (!parsed || !targetMetric) return null;

      if (metricRef.current !== targetMetric) {
        setMetric(targetMetric);
        const ready = await waitForMetric(targetMetric);
        if (!ready) {
          throw new Error(`차트 렌더 대기 시간 초과: ${targetMetric}`);
        }
      }

      return saveCurrentChart(targetMetric);
    },
    [parsed, setMetric, waitForMetric, saveCurrentChart]
  );

  const exportCurrent = useCallback(async () => {
    if (!parsed || !metric) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await saveMetricChart(metric);
      if (!result) {
        setStatus("저장할 차트가 없습니다.");
        return;
      }
      setStatus(
        result.mode === "outbox"
          ? `저장 완료 · ${result.absolutePath ?? result.fileName}`
          : `다운로드 저장 · ${result.fileName}`
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "차트 저장 실패");
    } finally {
      setBusy(false);
    }
  }, [parsed, metric, saveMetricChart]);

  const exportSelected = useCallback(async () => {
    if (!parsed || enabledMetrics.length === 0) return;
    setBusy(true);
    setStatus(null);
    const previousMetric = metricRef.current;
    let saved = 0;

    try {
      for (const targetMetric of enabledMetrics) {
        const result = await saveMetricChart(targetMetric);
        if (result) saved += 1;
      }
      if (previousMetric && previousMetric !== metricRef.current) {
        setMetric(previousMetric);
        await waitForMetric(previousMetric);
      }
      setStatus(`선택 Metric ${saved}/${enabledMetrics.length}개 저장 완료`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "일괄 저장 실패");
    } finally {
      setBusy(false);
    }
  }, [parsed, enabledMetrics, saveMetricChart, setMetric, waitForMetric]);

  const runAutoSaveForMetrics = useCallback(
    async (targetMetrics: string[]) => {
      if (!parsed || targetMetrics.length === 0) return;
      setBusy(true);
      const previousMetric = metricRef.current;
      let saved = 0;
      try {
        for (const targetMetric of targetMetrics) {
          const result = await saveMetricChart(targetMetric);
          if (result) saved += 1;
        }
        if (previousMetric && previousMetric !== metricRef.current) {
          setMetric(previousMetric);
          await waitForMetric(previousMetric);
        }
        setStatus(`자동 저장 ${saved}/${targetMetrics.length}개 완료`);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "자동 저장 실패");
      } finally {
        setBusy(false);
      }
    },
    [parsed, saveMetricChart, setMetric, waitForMetric]
  );

  useEffect(() => {
    if (!settings.autoSaveCurrent || !parsed || !metric || busy) return;
    const key = `${fileName ?? "csv"}|${group}|${metric}|${referenceSocket}|${serialFilter}`;
    if (lastAutoSaveKeyRef.current === key) return;
    lastAutoSaveKeyRef.current = key;

    const timer = window.setTimeout(() => {
      void (async () => {
        setBusy(true);
        try {
          const result = await saveMetricChart(metric);
          if (result) {
            setStatus(
              result.mode === "outbox"
                ? `자동 저장 · ${result.fileName}`
                : `자동 다운로드 · ${result.fileName}`
            );
          }
        } catch (e) {
          setStatus(e instanceof Error ? e.message : "자동 저장 실패");
        } finally {
          setBusy(false);
        }
      })();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    settings.autoSaveCurrent,
    parsed,
    metric,
    group,
    referenceSocket,
    serialFilter,
    fileName,
    busy,
    saveMetricChart,
  ]);

  useEffect(() => {
    if (!settings.autoSaveOnLoad || !parsed || metrics.length === 0 || busy) {
      return;
    }
    const key = `${fileName ?? "csv"}|${group}|${referenceSocket}|${serialFilter}|${metrics.join("||")}`;
    if (autoLoadKeyRef.current === key) return;
    autoLoadKeyRef.current = key;

    const targets = listEnabledMetrics(group, metrics, settings);
    if (targets.length === 0) return;

    void runAutoSaveForMetrics(targets);
  }, [
    settings,
    parsed,
    metrics,
    group,
    referenceSocket,
    serialFilter,
    fileName,
    busy,
    runAutoSaveForMetrics,
  ]);

  const setAutoSaveCurrent = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, autoSaveCurrent: enabled }));
  }, []);

  const setAutoSaveOnLoad = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, autoSaveOnLoad: enabled }));
  }, []);

  const toggleMetricEnabled = useCallback(
    (targetMetric: string, enabled: boolean) => {
      setSettings((prev) => setMetricExportEnabled(prev, group, targetMetric, enabled));
    },
    [group]
  );

  const selectAllMetrics = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      disabledMetricsByGroup: {
        ...prev.disabledMetricsByGroup,
        [group]: [],
      },
    }));
  }, [group]);

  const clearAllMetrics = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      disabledMetricsByGroup: {
        ...prev.disabledMetricsByGroup,
        [group]: [...metrics],
      },
    }));
  }, [group, metrics]);

  return {
    settings,
    outboxDir,
    status,
    busy,
    enabledMetrics,
    exportCurrent,
    exportSelected,
    setAutoSaveCurrent,
    setAutoSaveOnLoad,
    toggleMetricEnabled,
    selectAllMetrics,
    clearAllMetrics,
    refreshOutboxInfo,
  };
}
