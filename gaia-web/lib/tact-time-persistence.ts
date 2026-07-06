import {
  TACT_TIME_STATION_COUNT,
  type TactTimeGroup,
  type TactTimeGroupStore,
  type TactTimeStationId,
  type TactTimeStationStore,
} from "./tact-time-types";

const STORAGE_KEY = "gaia.tactTimeStations.v2";
const LEGACY_STORAGE_KEY = "gaia.tactTimeGroups.v1";
export const DEFAULT_TACT_TIME_STATIONS_PATH =
  "/tact-time-default-stations.json";
const STORE_VERSION = 2;
const GROUP_STORE_VERSION = 1;

function normalizeGroups(groups: unknown): TactTimeGroup[] {
  if (!Array.isArray(groups)) return [];
  return groups
    .filter(
      (g): g is TactTimeGroup =>
        !!g &&
        typeof g === "object" &&
        "id" in g &&
        "name" in g &&
        Array.isArray((g as TactTimeGroup).headers)
    )
    .map((g) => ({
      id: g.id,
      name: String(g.name).trim(),
      headers: [
        ...new Set(g.headers.map((h) => String(h).trim()).filter(Boolean)),
      ],
    }));
}

export function createEmptyGroupStore(): TactTimeGroupStore {
  return { version: GROUP_STORE_VERSION, groups: [] };
}

export function createEmptyStationStore(): TactTimeStationStore {
  const stations: Record<string, TactTimeGroupStore> = {};
  for (let i = 1; i <= TACT_TIME_STATION_COUNT; i++) {
    stations[String(i)] = createEmptyGroupStore();
  }
  return { version: STORE_VERSION, activeStation: 1, stations };
}

function normalizeGroupStore(raw: unknown): TactTimeGroupStore {
  if (!raw || typeof raw !== "object") return createEmptyGroupStore();
  const parsed = raw as TactTimeGroupStore;
  return {
    version: GROUP_STORE_VERSION,
    groups: normalizeGroups(parsed.groups),
  };
}

function migrateLegacyGroupStore(): TactTimeGroupStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TactTimeGroupStore;
    return normalizeGroupStore(parsed);
  } catch {
    return null;
  }
}

export function normalizeStationStore(raw: unknown): TactTimeStationStore {
  const base = createEmptyStationStore();
  if (!raw || typeof raw !== "object") return base;

  const parsed = raw as Partial<TactTimeStationStore>;
  const active = parsed.activeStation;
  const activeStation: TactTimeStationId =
    typeof active === "number" && active >= 1 && active <= TACT_TIME_STATION_COUNT
      ? (active as TactTimeStationId)
      : 1;

  const stations = { ...base.stations };
  if (parsed.stations && typeof parsed.stations === "object") {
    for (let i = 1; i <= TACT_TIME_STATION_COUNT; i++) {
      const key = String(i);
      const stationRaw = (parsed.stations as Record<string, unknown>)[key];
      if (stationRaw) stations[key] = normalizeGroupStore(stationRaw);
    }
  }

  return { version: STORE_VERSION, activeStation, stations };
}

export function hasTactTimeStationConfig(store: TactTimeStationStore): boolean {
  return Object.values(store.stations).some((s) => s.groups.length > 0);
}

export function loadTactTimeStationStore(): TactTimeStationStore {
  if (typeof window === "undefined") return createEmptyStationStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeStationStore(JSON.parse(raw));

    const legacy = migrateLegacyGroupStore();
    const store = createEmptyStationStore();
    if (legacy) {
      store.stations["1"] = legacy;
    }
    return store;
  } catch {
    return createEmptyStationStore();
  }
}

export async function loadDefaultTactTimeStationStore(): Promise<TactTimeStationStore | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(
      `${DEFAULT_TACT_TIME_STATIONS_PATH}?t=${Date.now()}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json: unknown = await res.json();
    const store = normalizeStationStore(json);
    return hasTactTimeStationConfig(store) ? store : null;
  } catch {
    return null;
  }
}

export function saveTactTimeStationStore(store: TactTimeStationStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

/** @deprecated Station 1 legacy — use loadTactTimeStationStore */
export function loadTactTimeGroupStore(): TactTimeGroupStore {
  return loadTactTimeStationStore().stations["1"] ?? createEmptyGroupStore();
}

/** @deprecated use saveTactTimeStationStore */
export function saveTactTimeGroupStore(store: TactTimeGroupStore): void {
  const all = loadTactTimeStationStore();
  all.stations["1"] = normalizeGroupStore(store);
  saveTactTimeStationStore(all);
}

export function clearTactTimeStationStore(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
