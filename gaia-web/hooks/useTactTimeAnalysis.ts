"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildTactTimeAnalysis,
  getAssignedHeaders,
  validateGroupName,
} from "@/lib/tact-time-analysis";
import { buildTactTimeCycleAnalysis } from "@/lib/tact-time-cycles";
import { applyStationHeaderTransforms } from "@/lib/tact-time-header-disambiguation";
import {
  aggregateRowsFromLogEntries,
  buildSettingCatalogHeaders,
  isCycleTotalTimeLabel,
  parseTactTimeCsv,
} from "@/lib/tact-time-parser";
import {
  createEmptyGroupStore,
  createEmptyStationStore,
  hasTactTimeStationConfig,
  loadDefaultTactTimeStationStore,
  loadTactTimeStationStore,
  normalizeStationStore,
  saveTactTimeStationStore,
} from "@/lib/tact-time-persistence";
import { TACT_TIME_MOCK_CSV } from "@/lib/tact-time-mock-data";
import type {
  ParsedTactTimeCsv,
  TactTimeGroup,
  TactTimeGroupStore,
  TactTimeRow,
  TactTimeStationId,
  TactTimeStationStore,
} from "@/lib/tact-time-types";

function newGroupId(): string {
  return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function stationKey(stationId: TactTimeStationId): string {
  return String(stationId);
}

export function useTactTimeAnalysis() {
  const [rawParsed, setRawParsed] = useState<ParsedTactTimeCsv | null>(null);
  const [stationStore, setStationStore] = useState<TactTimeStationStore>(
    createEmptyStationStore
  );
  const [stationStoreReady, setStationStoreReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingOpen, setSettingOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [excludedCycleIds, setExcludedCycleIds] = useState<Set<string>>(
    () => new Set()
  );

  const stationId = stationStore.activeStation;

  const groupStore = useMemo(
    () =>
      stationStore.stations[stationKey(stationId)] ?? createEmptyGroupStore(),
    [stationStore, stationId]
  );

  const parsed = useMemo(() => {
    if (!rawParsed) return null;
    return applyStationHeaderTransforms(rawParsed, stationId);
  }, [rawParsed, stationId]);

  const stationGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [key, store] of Object.entries(stationStore.stations)) {
      counts[key] = store.groups.length;
    }
    return counts;
  }, [stationStore.stations]);

  useEffect(() => {
    const stored = loadTactTimeStationStore();
    if (hasTactTimeStationConfig(stored)) {
      setStationStore(stored);
      setStationStoreReady(true);
      return;
    }

    void loadDefaultTactTimeStationStore().then((defaults) => {
      if (defaults) {
        setStationStore(defaults);
        saveTactTimeStationStore(defaults);
      } else {
        setStationStore(stored);
      }
      setStationStoreReady(true);
    });
  }, []);

  useEffect(() => {
    if (!stationStoreReady) return;
    saveTactTimeStationStore(stationStore);
  }, [stationStore, stationStoreReady]);

  const updateCurrentStationGroups = useCallback(
    (updater: (prev: TactTimeGroupStore) => TactTimeGroupStore) => {
      setStationStore((prev) => {
        const key = stationKey(prev.activeStation);
        const current = prev.stations[key] ?? createEmptyGroupStore();
        const nextGroups = updater(current);
        return {
          ...prev,
          stations: { ...prev.stations, [key]: nextGroups },
        };
      });
    },
    []
  );

  const setStationId = useCallback((nextStation: TactTimeStationId) => {
    setStationStore((prev) => {
      const key = stationKey(nextStation);
      return {
        ...prev,
        activeStation: nextStation,
        stations: {
          ...prev.stations,
          [key]: prev.stations[key] ?? createEmptyGroupStore(),
        },
      };
    });
    setSelectedCycleId(null);
  }, []);

  const loadCsvText = useCallback((text: string, fileName: string) => {
    try {
      const next = parseTactTimeCsv(text, fileName);
      setRawParsed(next);
      setError(null);
      setSelectedCycleId(null);
      setExcludedCycleIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV 파싱 실패");
    }
  }, []);

  const loadMock = useCallback(() => {
    loadCsvText(TACT_TIME_MOCK_CSV, "tact-time-mock.csv");
  }, [loadCsvText]);

  const cycleAnalysis = useMemo(() => {
    if (!parsed) return null;
    return buildTactTimeCycleAnalysis(
      parsed.logEntries,
      groupStore.groups,
      excludedCycleIds
    );
  }, [parsed, groupStore.groups, excludedCycleIds]);

  const excludeCycle = useCallback((cycleId: string) => {
    setExcludedCycleIds((prev) => {
      if (prev.has(cycleId)) return prev;
      const next = new Set(prev);
      next.add(cycleId);
      return next;
    });
    setSelectedCycleId((current) => (current === cycleId ? null : current));
  }, []);

  const restoreCycle = useCallback((cycleId: string) => {
    setExcludedCycleIds((prev) => {
      if (!prev.has(cycleId)) return prev;
      const next = new Set(prev);
      next.delete(cycleId);
      return next;
    });
  }, []);

  const selectedCycle = useMemo(() => {
    if (!cycleAnalysis) return null;
    if (selectedCycleId) {
      return (
        cycleAnalysis.cycles.find((c) => c.id === selectedCycleId) ?? null
      );
    }
    return (
      cycleAnalysis.summary.worstCycle ?? cycleAnalysis.cycles[0] ?? null
    );
  }, [cycleAnalysis, selectedCycleId]);

  const analysis = useMemo(() => {
    if (!parsed) return null;
    return buildTactTimeAnalysis(parsed.rows, groupStore.groups);
  }, [parsed, groupStore.groups]);

  const assignedHeaders = useMemo(
    () => getAssignedHeaders(groupStore.groups),
    [groupStore.groups]
  );

  const unassignedHeaders = useMemo(() => {
    if (!parsed) return [];
    const catalog = buildSettingCatalogHeaders(parsed.logEntries);
    return catalog.filter((header) => !assignedHeaders.has(header));
  }, [parsed, assignedHeaders]);

  const rowByHeader = useMemo(() => {
    if (!parsed) return new Map<string, TactTimeRow>();
    const rows = aggregateRowsFromLogEntries(
      parsed.logEntries.filter((e) => !isCycleTotalTimeLabel(e.header))
    );
    return new Map(rows.map((r) => [r.header, r]));
  }, [parsed]);

  const createGroup = useCallback(
    (name: string, headers: string[]) => {
      const nameError = validateGroupName(groupStore.groups, name);
      if (nameError) return nameError;

      const unique = headers.filter(
        (h) => !assignedHeaders.has(h) && rowByHeader.has(h)
      );
      if (unique.length === 0) return "그룹에 추가할 항목을 선택하세요.";

      updateCurrentStationGroups((prev) => ({
        ...prev,
        groups: [
          ...prev.groups,
          { id: newGroupId(), name: name.trim(), headers: unique },
        ],
      }));
      return null;
    },
    [groupStore.groups, assignedHeaders, rowByHeader, updateCurrentStationGroups]
  );

  const updateGroup = useCallback(
    (
      groupId: string,
      patch: { name?: string; headers?: string[] }
    ): string | null => {
      const target = groupStore.groups.find((g) => g.id === groupId);
      if (!target) return "그룹을 찾을 수 없습니다.";

      if (patch.name !== undefined) {
        const nameError = validateGroupName(
          groupStore.groups,
          patch.name,
          groupId
        );
        if (nameError) return nameError;
      }

      if (patch.headers) {
        const otherAssigned = new Set<string>();
        for (const g of groupStore.groups) {
          if (g.id === groupId) continue;
          for (const h of g.headers) otherAssigned.add(h);
        }
        const invalid = patch.headers.some(
          (h) => otherAssigned.has(h) || !rowByHeader.has(h)
        );
        if (invalid) return "다른 그룹에 이미 포함된 항목이 있습니다.";
      }

      updateCurrentStationGroups((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                name: patch.name !== undefined ? patch.name.trim() : g.name,
                headers: patch.headers ?? g.headers,
              }
            : g
        ),
      }));
      return null;
    },
    [groupStore.groups, rowByHeader, updateCurrentStationGroups]
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      updateCurrentStationGroups((prev) => ({
        ...prev,
        groups: prev.groups.filter((g) => g.id !== groupId),
      }));
    },
    [updateCurrentStationGroups]
  );

  const addItemsToGroup = useCallback(
    (groupId: string, headers: string[]): string | null => {
      const target = groupStore.groups.find((g) => g.id === groupId);
      if (!target) return "그룹을 찾을 수 없습니다.";

      const toAdd = headers.filter(
        (h) => !assignedHeaders.has(h) && rowByHeader.has(h)
      );
      if (toAdd.length === 0) return "추가할 수 있는 항목이 없습니다.";

      return updateGroup(groupId, {
        headers: [...target.headers, ...toAdd],
      });
    },
    [groupStore.groups, assignedHeaders, rowByHeader, updateGroup]
  );

  const removeItemFromGroup = useCallback(
    (groupId: string, header: string) => {
      const target = groupStore.groups.find((g) => g.id === groupId);
      if (!target) return;
      const nextHeaders = target.headers.filter((h) => h !== header);
      if (nextHeaders.length === 0) {
        deleteGroup(groupId);
        return;
      }
      updateGroup(groupId, { headers: nextHeaders });
    },
    [groupStore.groups, deleteGroup, updateGroup]
  );

  const resetGroups = useCallback(() => {
    updateCurrentStationGroups(() => createEmptyGroupStore());
  }, [updateCurrentStationGroups]);

  const exportSettings = useCallback(() => {
    const blob = new Blob([JSON.stringify(stationStore, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tact-time-stations.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [stationStore]);

  const importSettings = useCallback(async (file: File) => {
    const text = await file.text();
    const store = normalizeStationStore(JSON.parse(text));
    setStationStore(store);
    saveTactTimeStationStore(store);
  }, []);

  const saveDeployDefault = useCallback(async (): Promise<string | null> => {
    if (!hasTactTimeStationConfig(stationStore)) {
      return "저장할 그룹 설정이 없습니다.";
    }
    const res = await fetch("/api/dev/tact-time-default", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stationStore),
    });
    const data = (await res.json()) as { error?: string; groupCount?: number };
    if (!res.ok) return data.error ?? "저장 실패";
    return null;
  }, [stationStore]);

  return {
    parsed,
    fileName: parsed?.fileName ?? null,
    error,
    analysis,
    cycleAnalysis,
    selectedCycle,
    selectedCycleId,
    setSelectedCycleId,
    excludedCycleIds,
    excludeCycle,
    restoreCycle,
    stationId,
    setStationId,
    stationGroupCounts,
    groupStore,
    assignedHeaders,
    unassignedHeaders,
    rowByHeader,
    settingOpen,
    setSettingOpen,
    loadCsvText,
    loadMock,
    createGroup,
    updateGroup,
    deleteGroup,
    addItemsToGroup,
    removeItemFromGroup,
    resetGroups,
    exportSettings,
    importSettings,
    saveDeployDefault,
    stationStore,
  };
}
