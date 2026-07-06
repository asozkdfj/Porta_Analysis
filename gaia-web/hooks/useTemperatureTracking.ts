"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseGaiaCsv } from "@/lib/csv-parser";
import { buildTemperatureMockCsv } from "@/lib/temperature-mock-data";
import {
  analyzeAllTemperatureRows,
  analyzeTemperatureOverview,
  applyExcludedReadingsToOverview,
  applyExcludedReadingsToRows,
  computeTemperatureBatchSummary,
  filterOverviewBarcodes,
  filterTemperatureRows,
  findNtcHeaderForBranch,
  listBarcodes,
  listExcludedTemperatureReadings,
  makeTemperatureReadingKey,
} from "@/lib/temperature-tracking";
import type {
  TemperatureBranch,
  TemperatureFilter,
  TemperatureOverviewAnalysis,
  TemperatureResultRow,
} from "@/lib/temperature-tracking-types";
import { TEMPERATURE_BRANCHES } from "@/lib/temperature-tracking-types";
import type { ParsedCsv } from "@/lib/types";

function safeAnalyzeOverview(
  parsed: ParsedCsv,
  branch: TemperatureBranch
): TemperatureOverviewAnalysis | null {
  try {
    return analyzeTemperatureOverview(parsed, branch);
  } catch {
    return null;
  }
}

function safeAnalyzeRows(parsed: ParsedCsv, branch: TemperatureBranch) {
  try {
    return analyzeAllTemperatureRows(parsed, branch);
  } catch {
    return [];
  }
}

export function useTemperatureTracking() {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [branch, setBranch] = useState<TemperatureBranch>("20C");
  const [filter, setFilter] = useState<TemperatureFilter>("all");
  const [focusBarcode, setFocusBarcode] = useState<string | null>(null);
  const [highlightSocket, setHighlightSocket] = useState<string | null>(null);
  const [highlightRunId, setHighlightRunId] = useState<string | null>(null);
  const [excludedReadingKeys, setExcludedReadingKeys] = useState<Set<string>>(
    new Set()
  );
  const [selectedReadingKey, setSelectedReadingKey] = useState<string | null>(
    null
  );

  const resetFocus = useCallback(() => {
    setFocusBarcode(null);
    setHighlightSocket(null);
    setHighlightRunId(null);
    setSelectedReadingKey(null);
  }, []);

  const resetExclusions = useCallback(() => {
    setExcludedReadingKeys(new Set());
    setSelectedReadingKey(null);
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
        resetFocus();
        resetExclusions();
      } catch (e) {
        setParsed(null);
        setCsvText(null);
        setError(e instanceof Error ? e.message : "CSV 로드 실패");
        resetFocus();
      }
    },
    [resetFocus, resetExclusions]
  );

  const loadMock = useCallback(() => {
    loadCsvText(buildTemperatureMockCsv(), "temperature-mock.csv");
  }, [loadCsvText]);

  const refresh = useCallback(() => {
    if (csvText) {
      loadCsvText(csvText, fileName ?? undefined);
    }
  }, [csvText, fileName, loadCsvText]);

  const barcodes = useMemo(
    () => (parsed ? listBarcodes(parsed) : []),
    [parsed]
  );

  const branchHeader = useMemo(() => {
    if (!parsed) return null;
    return findNtcHeaderForBranch(parsed.headers, branch);
  }, [parsed, branch]);

  const overviewAnalysis = useMemo(() => {
    if (!parsed || !branchHeader) return null;
    return safeAnalyzeOverview(parsed, branch);
  }, [parsed, branch, branchHeader]);

  const filteredOverviewAnalysis = useMemo(() => {
    if (!overviewAnalysis) return null;
    return applyExcludedReadingsToOverview(
      overviewAnalysis,
      excludedReadingKeys
    );
  }, [overviewAnalysis, excludedReadingKeys]);

  const excludedReadings = useMemo(() => {
    if (!overviewAnalysis) return [];
    return listExcludedTemperatureReadings(
      overviewAnalysis,
      excludedReadingKeys
    );
  }, [overviewAnalysis, excludedReadingKeys]);

  const batchResults = useMemo(() => {
    if (!parsed || !branchHeader) return [];
    return safeAnalyzeRows(parsed, branch);
  }, [parsed, branch, branchHeader]);

  const effectiveBatchResults = useMemo(() => {
    return applyExcludedReadingsToRows(batchResults, excludedReadingKeys);
  }, [batchResults, excludedReadingKeys]);

  const batchSummary = useMemo(
    () => computeTemperatureBatchSummary(effectiveBatchResults),
    [effectiveBatchResults]
  );

  const filteredResults = useMemo(
    () => filterTemperatureRows(effectiveBatchResults, filter),
    [effectiveBatchResults, filter]
  );

  const visibleBarcodes = useMemo(() => {
    if (!filteredOverviewAnalysis) return [];
    return filterOverviewBarcodes(filteredOverviewAnalysis, filter);
  }, [filteredOverviewAnalysis, filter]);

  useEffect(() => {
    if (!filteredOverviewAnalysis || filteredOverviewAnalysis.barcodes.length === 0) {
      setFocusBarcode(null);
      return;
    }

    setFocusBarcode((prev) => {
      if (
        prev &&
        filteredOverviewAnalysis.barcodes.some((b) => b.barcode === prev)
      ) {
        return prev;
      }
      return filteredOverviewAnalysis.barcodes[0]?.barcode ?? null;
    });
  }, [filteredOverviewAnalysis]);

  const setBranchAndReset = useCallback(
    (next: TemperatureBranch) => {
      setBranch(next);
      setFilter("all");
      resetFocus();
      resetExclusions();
    },
    [resetFocus, resetExclusions]
  );

  const selectResultRow = useCallback((row: TemperatureResultRow) => {
    setBranch(row.branch);
    setFocusBarcode(row.barcode);
    setHighlightSocket(row.socket);
    setHighlightRunId(row.runId);
    setSelectedReadingKey(makeTemperatureReadingKey(row.barcode, row.runId));
    setFilter("all");
  }, []);

  const clearSocketHighlight = useCallback(() => {
    setHighlightSocket(null);
    setHighlightRunId(null);
  }, []);

  const excludeReading = useCallback(
    (key: string) => {
      setExcludedReadingKeys((prev) => new Set(prev).add(key));
      setSelectedReadingKey((prev) => (prev === key ? null : prev));
      setHighlightRunId((runId) => {
        if (!runId || !overviewAnalysis) return runId;
        const stillVisible = overviewAnalysis.barcodes.some((bc) =>
          bc.readings.some(
            (r) =>
              makeTemperatureReadingKey(bc.barcode, r.runId) === key &&
              r.runId === runId
          )
        );
        return stillVisible ? null : runId;
      });
      setHighlightSocket((socket) => {
        if (!socket || !overviewAnalysis) return socket;
        const match = overviewAnalysis.barcodes.some((bc) =>
          bc.readings.some(
            (r) =>
              makeTemperatureReadingKey(bc.barcode, r.runId) === key &&
              r.socket === socket
          )
        );
        return match ? null : socket;
      });
    },
    [overviewAnalysis]
  );

  const restoreReading = useCallback((key: string) => {
    setExcludedReadingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setSelectedReadingKey((prev) => (prev === key ? null : prev));
  }, []);

  const clearExcludedReadings = useCallback(() => {
    resetExclusions();
  }, [resetExclusions]);

  const hasData = !!parsed && !!branchHeader && !!filteredOverviewAnalysis;

  const activeFocusBarcode = useMemo(() => {
    if (!filteredOverviewAnalysis) return null;
    if (
      focusBarcode &&
      filteredOverviewAnalysis.barcodes.some((b) => b.barcode === focusBarcode)
    ) {
      return focusBarcode;
    }
    return filteredOverviewAnalysis.barcodes[0]?.barcode ?? null;
  }, [filteredOverviewAnalysis, focusBarcode]);

  return {
    parsed,
    fileName,
    error,
    barcodes,
    branch,
    setBranch: setBranchAndReset,
    branches: TEMPERATURE_BRANCHES,
    branchHeader,
    hasData,
    overviewAnalysis: filteredOverviewAnalysis,
    rawOverviewAnalysis: overviewAnalysis,
    visibleBarcodes,
    batchResults: effectiveBatchResults,
    batchSummary,
    filteredResults,
    filter,
    setFilter,
    focusBarcode: activeFocusBarcode,
    setFocusBarcode,
    highlightSocket,
    highlightRunId,
    clearSocketHighlight,
    selectedReadingKey,
    setSelectedReadingKey,
    excludedReadings,
    excludeReading,
    restoreReading,
    clearExcludedReadings,
    selectResultRow,
    loadCsvText,
    loadMock,
    refresh,
  };
}
