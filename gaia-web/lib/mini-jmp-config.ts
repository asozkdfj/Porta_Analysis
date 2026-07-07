import type { MiniJmpSavedConfig } from "./mini-jmp-types";

const STORAGE_KEY = "mini-jmp-saved-configs";

export function listSavedConfigs(): MiniJmpSavedConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MiniJmpSavedConfig[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConfig(config: MiniJmpSavedConfig): void {
  const list = listSavedConfigs().filter((c) => c.name !== config.name);
  list.unshift(config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
}

export function deleteSavedConfig(name: string): void {
  const list = listSavedConfigs().filter((c) => c.name !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function exportConfigFile(config: MiniJmpSavedConfig): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${config.name.replace(/\s+/g, "_")}.mini-jmp.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importConfigFile(file: File): Promise<MiniJmpSavedConfig> {
  const text = await file.text();
  const parsed = JSON.parse(text) as MiniJmpSavedConfig;
  if (parsed.version !== 1) throw new Error("지원하지 않는 설정 파일입니다.");
  return parsed;
}
