"use client";

import { useCallback, useMemo, useState } from "react";
import { buildErrorAnalysis, filterErrorAnalysis } from "@/lib/error-analysis";
import type {
  UphCountMode,
  UphIntervalMinutes,
} from "@/lib/error-analysis-config";
import { parseErrorAnalysisCsv } from "@/lib/error-analysis-parser";
import { ERROR_ANALYSIS_MOCK_CSV } from "@/lib/error-analysis-mock-data";
import type {
  ErrorAnalysisFilters,
  ErrorAnalysisResult,
  ErrorDistributionGroup,
  ErrorPassFail,
} from "@/lib/error-analysis-types";

const DEFAULT_FILTERS: ErrorAnalysisFilters = {
  analysisGroup: "ALL",
  socket: "ALL",
  stage: "ALL",
  station: "ALL",
  failItem: "ALL",
  passFail: "ALL",
  abnormalStatus: "ALL",
  timeRangeStart: "",
  timeRangeEnd: "",
  search: "",
};

export function useErrorAnalysis() {
  const [rawAnalysis, setRawAnalysis] = useState<ErrorAnalysisResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ErrorAnalysisFilters>(DEFAULT_FILTERS);
  const [drillDownSocket, setDrillDownSocket] = useState<string | null>(null);
  const [contDrillDownSocket, setContDrillDownSocket] = useState<string | null>(
    null
  );
  const [uphCountMode, setUphCountMode] = useState<UphCountMode>("completion");
  const [uphIntervalMinutes, setUphIntervalMinutes] =
    useState<UphIntervalMinutes>(10);

  const loadCsvText = useCallback((text: string, fileName: string) => {
    try {
      const parsed = parseErrorAnalysisCsv(text, fileName);
      setRawAnalysis(
        buildErrorAnalysis(parsed.fileName, parsed.records, {
          uphCountMode: "completion",
          uphIntervalMinutes: 10,
        })
      );
      setError(null);
      setFilters(DEFAULT_FILTERS);
      setDrillDownSocket(null);
      setContDrillDownSocket(null);
      setUphCountMode("completion");
      setUphIntervalMinutes(10);
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV 파싱 실패");
    }
  }, []);

  const loadMock = useCallback(() => {
    loadCsvText(ERROR_ANALYSIS_MOCK_CSV, "error-analysis-mock.csv");
  }, [loadCsvText]);

  const analysis = useMemo(() => {
    if (!rawAnalysis) return null;
    const merged: ErrorAnalysisFilters = {
      ...filters,
      socket: drillDownSocket ?? filters.socket,
    };
    return filterErrorAnalysis(rawAnalysis, merged, {
      uphCountMode,
      uphIntervalMinutes,
    });
  }, [
    rawAnalysis,
    filters,
    drillDownSocket,
    uphCountMode,
    uphIntervalMinutes,
  ]);

  const setFilter = useCallback(
    <K extends keyof ErrorAnalysisFilters>(
      key: K,
      value: ErrorAnalysisFilters[K]
    ) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      if (key === "socket" && value !== "ALL") {
        setDrillDownSocket(null);
      }
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setDrillDownSocket(null);
    setContDrillDownSocket(null);
  }, []);

  const drillIntoSocket = useCallback((socket: string) => {
    setDrillDownSocket(socket);
    setContDrillDownSocket(null);
    setFilters((prev) => ({ ...prev, socket: "ALL" }));
  }, []);

  const drillIntoContSocket = useCallback((socket: string) => {
    setContDrillDownSocket(socket);
    setDrillDownSocket(null);
  }, []);

  const clearDrillDown = useCallback(() => {
    setDrillDownSocket(null);
  }, []);

  const clearContDrillDown = useCallback(() => {
    setContDrillDownSocket(null);
  }, []);

  return {
    analysis,
    rawAnalysis,
    error,
    filters,
    drillDownSocket,
    contDrillDownSocket,
    uphCountMode,
    uphIntervalMinutes,
    setUphCountMode,
    setUphIntervalMinutes,
    loadCsvText,
    loadMock,
    setFilter,
    resetFilters,
    drillIntoSocket,
    drillIntoContSocket,
    clearDrillDown,
    clearContDrillDown,
    setSearch: (search: string) => setFilter("search", search),
    setAnalysisGroup: (v: ErrorDistributionGroup | "ALL") =>
      setFilter("analysisGroup", v),
    setSocket: (v: string | "ALL") => setFilter("socket", v),
    setStage: (v: string | "ALL") => setFilter("stage", v),
    setFailItem: (v: string | "ALL") => setFilter("failItem", v),
    setPassFail: (v: "ALL" | ErrorPassFail) => setFilter("passFail", v),
  };
}
