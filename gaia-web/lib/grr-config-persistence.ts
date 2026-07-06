/** 업로드 Reference Config localStorage 유지 (기본 90일) */

const STORAGE_KEY = "gaia.grrConfig.v1";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export interface PersistedGrrConfig {
  fileName: string;
  csvText: string;
  savedAt: number;
}

export function savePersistedGrrConfig(fileName: string, csvText: string): void {
  try {
    const payload: PersistedGrrConfig = {
      fileName,
      csvText,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota exceeded 등 — 무시 */
  }
}

export function loadPersistedGrrConfig(): PersistedGrrConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedGrrConfig;
    if (!parsed?.csvText || !parsed?.fileName || !parsed?.savedAt) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearPersistedGrrConfig();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPersistedGrrConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
