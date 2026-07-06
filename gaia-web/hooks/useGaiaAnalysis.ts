"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseGaiaCsv } from "@/lib/csv-parser";
import {
  validateMetricCoverage,
  type CoverageReport,
} from "@/lib/gaia-spec-config";
import { findMetricsForGroup } from "@/lib/groups";
import { analyzeGaiaGrr } from "@/lib/grr-calculator";
import { buildGrrDashboardSpecSummary } from "@/lib/grr-spec-summary";
import {
  buildGaiaStat2GrrSummary,
  buildTesterSidebarEntries,
} from "@/lib/gaia-stat2-grr-summary";
import { analyzeGoldenSocketMetric } from "@/lib/golden-socket-analysis";
import { socketsMatch } from "@/lib/golden-socket-config";
import { useGrrConfigStore } from "@/hooks/useGrrConfigStore";
import { useGoldenSocket } from "@/contexts/GoldenSocketContext";
import type { MetricFilterSource } from "@/lib/grr-metric-policy";
import type {
  AnalysisGroup,
  GaiaAnalysisResult,
  GaiaStat2GrrSummary,
  GrrDashboardSpecSummary,
  ParsedCsv,
  TesterGrrSidebarEntry,
} from "@/lib/types";

export function useGaiaAnalysis() {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const {
    specStore,
    configFileName,
    configError,
    configValidation,
    isUserConfig,
    configAppliedAt,
    configItemCount,
    loadSpecFromUser,
    reloadDefaultConfig,
  } = useGrrConfigStore();
  const [group, setGroup] = useState<AnalysisGroup>("LIW");
  const [metric, setMetric] = useState<string>("");
  const [referenceSocket, setReferenceSocket] = useState<string>("");
  const [serialFilter, setSerialFilter] = useState<string>("ALL");
  const [liwBranch, setLiwBranch] = useState<"all" | "50C" | "20C">("all");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { goldenSocket, goldenDeltaLimit } = useGoldenSocket();

  const loadCsvText = useCallback((text: string, name?: string) => {
    try {
      const result = parseGaiaCsv(text);
      setParsed(result);
      setFileName(name ?? null);
      setError(null);
      setSerialFilter("ALL");
      setReferenceSocket("");
      setMetric("");
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : "CSV 로드 실패");
    }
  }, []);

  const { metrics, metricFilterSource } = useMemo(() => {
    if (!parsed) {
      return {
        metrics: [] as string[],
        metricFilterSource: null as MetricFilterSource | null,
      };
    }
    const result = findMetricsForGroup(parsed.headers, group, {
      liwBranch,
      specStore,
    });
    return { metrics: result.metrics, metricFilterSource: result.filterSource };
  }, [parsed, group, liwBranch, specStore]);

  const coverage: CoverageReport | null = useMemo(() => {
    if (!metrics.length) return null;
    return validateMetricCoverage(metrics, specStore);
  }, [metrics, specStore]);

  const serials = useMemo(() => {
    if (!parsed) return [];
    const key = parsed.serialKey;
    return [...new Set(parsed.rows.map((r) => r[key]).filter(Boolean))].sort();
  }, [parsed]);

  const sockets = useMemo(() => {
    if (!parsed) return [];
    const key = parsed.socketKey;
    const set = new Set(parsed.rows.map((r) => r[key]).filter(Boolean));
    return [...set].sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [parsed]);

  const activeMetric = metric || metrics[0] || "";

  useEffect(() => {
    if (!goldenSocket || sockets.length === 0) return;
    const match = sockets.find((s) => socketsMatch(s, goldenSocket));
    if (match) setReferenceSocket(match);
  }, [goldenSocket, sockets]);

  const analysis: GaiaAnalysisResult | null = useMemo(() => {
    if (!parsed || !activeMetric) return null;
    const ref = referenceSocket || sockets[0] || "";
    return analyzeGaiaGrr(parsed, group, activeMetric, {
      referenceSocket: ref,
      serialFilter: serialFilter,
      specStore,
    });
  }, [parsed, group, activeMetric, referenceSocket, serialFilter, sockets, specStore, configAppliedAt]);

  const dashboardSpecSummary: GrrDashboardSpecSummary | null = useMemo(() => {
    if (!parsed || !specStore) return null;
    return buildGrrDashboardSpecSummary(parsed, group, specStore, liwBranch, {
      referenceSocket: referenceSocket || sockets[0] || "",
      serialFilter,
    });
  }, [parsed, group, specStore, liwBranch, referenceSocket, serialFilter, sockets, configAppliedAt]);

  const goldenAnalysis = useMemo(() => {
    if (!parsed || !activeMetric) return null;
    return analyzeGoldenSocketMetric(
      parsed,
      activeMetric,
      goldenSocket,
      goldenDeltaLimit,
      specStore
    );
  }, [parsed, activeMetric, goldenSocket, goldenDeltaLimit, specStore, configAppliedAt]);

  const stat2Summary: GaiaStat2GrrSummary | null = useMemo(() => {
    if (!analysis) return null;
    return buildGaiaStat2GrrSummary(
      analysis,
      specStore?.version ?? configFileName
    );
  }, [analysis, specStore?.version, configFileName]);

  const testerSidebarEntries: TesterGrrSidebarEntry[] = useMemo(() => {
    if (!parsed || !activeMetric || sockets.length === 0) return [];

    const getSummaryForTester = (testerId: string) => {
      const result = analyzeGaiaGrr(parsed, group, activeMetric, {
        referenceSocket: testerId,
        serialFilter,
        specStore,
      });
      return buildGaiaStat2GrrSummary(
        result,
        specStore?.version ?? configFileName
      );
    };

    return buildTesterSidebarEntries(
      sockets,
      referenceSocket || sockets[0] || "",
      getSummaryForTester
    );
  }, [
    parsed,
    group,
    activeMetric,
    sockets,
    referenceSocket,
    serialFilter,
    specStore,
    configFileName,
    configAppliedAt,
  ]);

  return {
    parsed,
    specStore,
    configFileName,
    configValidation,
    configError,
    isUserConfig,
    configAppliedAt,
    configItemCount,
    coverage,
    group,
    setGroup,
    metric: activeMetric,
    setMetric,
    referenceSocket: referenceSocket || sockets[0] || "",
    setReferenceSocket,
    serialFilter,
    setSerialFilter,
    liwBranch,
    setLiwBranch,
    metrics,
    metricFilterSource,
    serials,
    sockets,
    analysis,
    goldenAnalysis,
    goldenSocket,
    goldenDeltaLimit,
    dashboardSpecSummary,
    stat2Summary,
    testerSidebarEntries,
    error,
    fileName,
    loadCsvText,
    loadSpecFromUser,
    reloadDefaultConfig,
  };
}
