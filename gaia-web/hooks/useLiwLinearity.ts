"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseGaiaCsv } from "@/lib/csv-parser";
import {
  analyzeAllGrrRuns,
  computeGrrBatchSummary,
  filterGrrResultRows,
} from "@/lib/liw-grr-batch";
import { useGrrConfigStore } from "@/hooks/useGrrConfigStore";
import {
  findIndexedSeriesHeaders,
  findRunsForBarcodeSocket,
  listBarcodes,
  listSocketsForBarcode,
  pickPrimaryRun,
} from "@/lib/liw-linearity";
import { findIndexedNtcTempPreHeaders } from "@/lib/liw-grr-temperature";
import {
  applyExcludedWlCenterPoints,
  findWlCenterIndexedHeaders,
  listExcludedWlCenterPoints,
} from "@/lib/liw-grr-wl-center";
import {
  applyExcludedNtcPoints,
  listExcludedNtcPoints,
} from "@/lib/liw-grr-ntc";
import { buildGrrModules, countActiveGrrModules } from "@/lib/liw-grr-modules";
import { GRR_MODULE_COUNT } from "@/lib/liw-grr-config";
import { buildSeriesDef, LINEARITY_BRANCHES } from "@/lib/linearity-series";
import { buildLinearityMockCsv } from "@/lib/linearity-mock-data";
import type { LinearityBranch, LinearityRunOption } from "@/lib/liw-linearity-types";
import type { GrrFilter, GrrResultRow } from "@/lib/liw-grr-types";
import type { ParsedCsv } from "@/lib/types";

export function useLiwLinearity() {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    specStore,
    configFileName,
    configError,
    isUserConfig,
    configAppliedAt,
    configItemCount,
    loadSpecFromUser,
    reloadDefaultConfig,
  } = useGrrConfigStore();
  const [selectedBarcode, setSelectedBarcode] = useState("");
  const [selectedSocket, setSelectedSocket] = useState("");
  const [loadedRun, setLoadedRun] = useState<LinearityRunOption | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [branch, setBranchState] = useState<LinearityBranch>("20C");
  const [filter, setFilter] = useState<GrrFilter>("all");
  const [excludedNtcPointKeys, setExcludedNtcPointKeys] = useState<Set<string>>(
    new Set()
  );
  const [excludedWlCenterPointKeys, setExcludedWlCenterPointKeys] = useState<
    Set<string>
  >(new Set());
  const [selectedNtcPointKey, setSelectedNtcPointKey] = useState<string | null>(
    null
  );
  const [selectedWlCenterPointKey, setSelectedWlCenterPointKey] = useState<
    string | null
  >(null);

  const resetTrendExclusions = useCallback(() => {
    setExcludedNtcPointKeys(new Set());
    setExcludedWlCenterPointKeys(new Set());
    setSelectedNtcPointKey(null);
    setSelectedWlCenterPointKey(null);
  }, []);

  const series = useMemo(() => buildSeriesDef(branch, "PO"), [branch]);

  const resetSelection = useCallback(() => {
    setSelectedBarcode("");
    setSelectedSocket("");
    setLoadedRun(null);
    setMatchCount(0);
    setFilter("all");
  }, []);

  const loadCsvText = useCallback(
    (text: string, name?: string) => {
      try {
        const result = parseGaiaCsv(text);
        setParsed(result);
        setCsvText(text);
        setFileName(name ?? null);
        setError(null);
        setFilter("all");
        setSelectedBarcode("");
        setSelectedSocket("");
        setLoadedRun(null);
        setMatchCount(0);
        resetTrendExclusions();
      } catch (e) {
        setParsed(null);
        setCsvText(null);
        resetSelection();
        resetTrendExclusions();
        setError(e instanceof Error ? e.message : "CSV 로드 실패");
      }
    },
    [resetSelection, resetTrendExclusions]
  );

  const loadMock = useCallback(() => {
    loadCsvText(buildLinearityMockCsv(), "grr-mock.csv");
  }, [loadCsvText]);

  const refresh = useCallback(() => {
    if (csvText) {
      loadCsvText(csvText, fileName ?? undefined);
    }
  }, [csvText, fileName, loadCsvText]);

  const setBranch = useCallback((next: LinearityBranch) => {
    setBranchState(next);
    setLoadedRun(null);
    setMatchCount(0);
    setFilter("all");
    resetTrendExclusions();
  }, [resetTrendExclusions]);

  const barcodes = useMemo(
    () => (parsed ? listBarcodes(parsed) : []),
    [parsed]
  );

  const sockets = useMemo(() => {
    if (!parsed || !selectedBarcode) return [];
    return listSocketsForBarcode(parsed, selectedBarcode);
  }, [parsed, selectedBarcode]);

  const matchedHeaders = useMemo(() => {
    if (!parsed) return [];
    return findIndexedSeriesHeaders(parsed.headers, series.headerToken);
  }, [parsed, series.headerToken]);

  const indexedNtcHeaders = useMemo(
    () => (parsed ? findIndexedNtcTempPreHeaders(parsed.headers, branch) : []),
    [parsed, branch]
  );

  const indexedWlCenterHeaders = useMemo(
    () => (parsed ? findWlCenterIndexedHeaders(parsed.headers, branch) : []),
    [parsed, branch]
  );

  const batchResults = useMemo(() => {
    if (!parsed || matchedHeaders.length === 0) return [];
    return analyzeAllGrrRuns(parsed, branch, series, specStore);
  }, [parsed, branch, series, specStore, matchedHeaders.length, configAppliedAt]);

  const batchSummary = useMemo(
    () => computeGrrBatchSummary(batchResults),
    [batchResults]
  );

  const filteredResults = useMemo(
    () => filterGrrResultRows(batchResults, filter),
    [batchResults, filter]
  );

  const grrModules = useMemo(
    () => (parsed ? buildGrrModules(parsed, batchResults) : []),
    [parsed, batchResults]
  );

  const barcodeOverflow = useMemo(() => {
    if (!parsed) return 0;
    return Math.max(0, barcodes.length - GRR_MODULE_COUNT);
  }, [parsed, barcodes.length]);

  const activeRow = useMemo(
    () => batchResults.find((r) => r.run.runId === loadedRun?.runId) ?? null,
    [batchResults, loadedRun]
  );

  const rawNtcAnalysis = activeRow?.ntcAnalysis ?? null;
  const rawWlCenterAnalysis = activeRow?.wlCenterAnalysis ?? null;

  const ntcAnalysis = useMemo(() => {
    if (!rawNtcAnalysis) return null;
    return applyExcludedNtcPoints(rawNtcAnalysis, excludedNtcPointKeys);
  }, [rawNtcAnalysis, excludedNtcPointKeys]);

  const wlCenterAnalysis = useMemo(() => {
    if (!rawWlCenterAnalysis) return null;
    return applyExcludedWlCenterPoints(
      rawWlCenterAnalysis,
      excludedWlCenterPointKeys
    );
  }, [rawWlCenterAnalysis, excludedWlCenterPointKeys]);

  const excludedNtcPoints = useMemo(() => {
    if (!rawNtcAnalysis) return [];
    return listExcludedNtcPoints(rawNtcAnalysis, excludedNtcPointKeys);
  }, [rawNtcAnalysis, excludedNtcPointKeys]);

  const excludedWlCenterPoints = useMemo(() => {
    if (!rawWlCenterAnalysis) return [];
    return listExcludedWlCenterPoints(
      rawWlCenterAnalysis,
      excludedWlCenterPointKeys
    );
  }, [rawWlCenterAnalysis, excludedWlCenterPointKeys]);

  useEffect(() => {
    resetTrendExclusions();
  }, [loadedRun?.runId, resetTrendExclusions]);

  const excludeNtcPoint = useCallback((key: string) => {
    setExcludedNtcPointKeys((prev) => new Set(prev).add(key));
    setSelectedNtcPointKey((prev) => (prev === key ? null : prev));
  }, []);

  const excludeWlCenterPoint = useCallback((key: string) => {
    setExcludedWlCenterPointKeys((prev) => new Set(prev).add(key));
    setSelectedWlCenterPointKey((prev) => (prev === key ? null : prev));
  }, []);

  const restoreNtcPoint = useCallback((key: string) => {
    setExcludedNtcPointKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setSelectedNtcPointKey((prev) => (prev === key ? null : prev));
  }, []);

  const restoreWlCenterPoint = useCallback((key: string) => {
    setExcludedWlCenterPointKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setSelectedWlCenterPointKey((prev) => (prev === key ? null : prev));
  }, []);

  const clearExcludedNtcPoints = useCallback(() => {
    setExcludedNtcPointKeys(new Set());
    setSelectedNtcPointKey(null);
  }, []);

  const clearExcludedWlCenterPoints = useCallback(() => {
    setExcludedWlCenterPointKeys(new Set());
    setSelectedWlCenterPointKey(null);
  }, []);

  const selectModule = useCallback(
    (barcode: string) => {
      if (!parsed || !barcode) return;

      const sockets = listSocketsForBarcode(parsed, barcode);
      const socket = sockets[0] ?? "";
      setSelectedBarcode(barcode);
      setSelectedSocket(socket);

      if (!socket) {
        setMatchCount(0);
        setLoadedRun(null);
        return;
      }

      const matches = findRunsForBarcodeSocket(parsed, barcode, socket, "repeat");
      setMatchCount(matches.length);
      setLoadedRun(pickPrimaryRun(matches, parsed));
    },
    [parsed]
  );

  const setSocket = useCallback((socket: string) => {
    setSelectedSocket(socket);
    setLoadedRun(null);
    setMatchCount(0);
  }, []);

  useEffect(() => {
    if (!selectedSocket && sockets.length === 1) {
      setSelectedSocket(sockets[0]);
    }
  }, [sockets, selectedSocket]);

  const selectResultRow = useCallback((row: GrrResultRow) => {
    setSelectedBarcode(row.run.barcode);
    setSelectedSocket(row.run.socket);
    setLoadedRun(row.run);
    setMatchCount(1);
  }, []);

  const loadData = useCallback(() => {
    if (!parsed || !selectedBarcode || !selectedSocket) return;

    const matches = findRunsForBarcodeSocket(parsed, selectedBarcode, selectedSocket, "repeat");
    setMatchCount(matches.length);
    setLoadedRun(pickPrimaryRun(matches, parsed));
  }, [parsed, selectedBarcode, selectedSocket]);

  return {
    parsed,
    fileName,
    configFileName,
    configError,
    isUserConfig,
    configAppliedAt,
    configItemCount,
    loadSpecFromUser,
    reloadDefaultConfig,
    error,
    barcodes,
    sockets,
    selectedBarcode,
    selectedSocket,
    setSocket,
    loadData,
    loadedRun,
    matchCount,
    branch,
    setBranch,
    branches: LINEARITY_BRANCHES,
    series,
    matchedHeaders,
    indexedNtcHeaders,
    indexedWlCenterHeaders,
    activeRow,
    ntcAnalysis,
    wlCenterAnalysis,
    excludedNtcPoints,
    excludedWlCenterPoints,
    selectedNtcPointKey,
    setSelectedNtcPointKey,
    selectedWlCenterPointKey,
    setSelectedWlCenterPointKey,
    excludeNtcPoint,
    excludeWlCenterPoint,
    restoreNtcPoint,
    restoreWlCenterPoint,
    clearExcludedNtcPoints,
    clearExcludedWlCenterPoints,
    batchResults,
    batchSummary,
    filteredResults,
    filter,
    setFilter,
    grrModules,
    barcodeOverflow,
    selectModule,
    activeModuleCount: countActiveGrrModules(grrModules),
    selectResultRow,
    loadCsvText,
    loadMock,
    refresh,
    specStore,
  };
}
