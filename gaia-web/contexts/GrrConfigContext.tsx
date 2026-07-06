"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  parseGaiaSpecConfig,
  validateGaiaSpecConfig,
  type ConfigValidationResult,
  type GaiaSpecStore,
} from "@/lib/gaia-spec-config";
import {
  clearPersistedGrrConfig,
  loadPersistedGrrConfig,
  savePersistedGrrConfig,
} from "@/lib/grr-config-persistence";

const DEFAULT_CONFIG_PATH = "/GaiaStat2grrConfig.csv";
const INBOX_CONFIG_NAMES = ["GaiaStat2grrConfig.csv", "gaiaStat2grrConfig.csv"];

async function loadConfigFromInbox(): Promise<{ text: string; name: string } | null> {
  try {
    const listRes = await fetch(`/api/inbox/config?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!listRes.ok) return null;

    const list = (await listRes.json()) as {
      files?: { name: string }[];
    };
    const files = list.files ?? [];
    if (files.length === 0) return null;

    const preferred =
      files.find((f) =>
        INBOX_CONFIG_NAMES.some((n) => f.name.toLowerCase() === n.toLowerCase())
      ) ?? files[0];

    const fileRes = await fetch(
      `/api/inbox/config?file=${encodeURIComponent(preferred.name)}&t=${Date.now()}`,
      { cache: "no-store" }
    );
    if (!fileRes.ok) return null;

    const data = (await fileRes.json()) as { text?: string; fileName?: string };
    if (!data.text) return null;

    return { text: data.text, name: data.fileName ?? preferred.name };
  } catch {
    return null;
  }
}

export interface GrrConfigStoreState {
  specStore: GaiaSpecStore | null;
  configFileName: string | null;
  configError: string | null;
  configValidation: ConfigValidationResult | null;
  isUserConfig: boolean;
  configAppliedAt: number | null;
  configItemCount: number;
  loadSpecFromUser: (text: string, fileName: string) => void;
  reloadDefaultConfig: () => void;
}

const GrrConfigContext = createContext<GrrConfigStoreState | null>(null);

export function GrrConfigProvider({ children }: { children: ReactNode }) {
  const [specStore, setSpecStore] = useState<GaiaSpecStore | null>(null);
  const [configFileName, setConfigFileName] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configValidation, setConfigValidation] =
    useState<ConfigValidationResult | null>(null);
  const [isUserConfig, setIsUserConfig] = useState(false);
  const [configAppliedAt, setConfigAppliedAt] = useState<number | null>(null);

  const userOverrideRef = useRef(false);
  const initializedRef = useRef(false);

  const applySpecText = useCallback((text: string, name: string, fromUser: boolean) => {
    try {
      const store = parseGaiaSpecConfig(text);
      const validation = validateGaiaSpecConfig(store);
      setSpecStore(store);
      setConfigFileName(name);
      setConfigValidation(validation);
      setConfigError(null);
      setIsUserConfig(fromUser);
      setConfigAppliedAt(Date.now());
    } catch (e) {
      setSpecStore(null);
      setConfigValidation(null);
      setConfigError(e instanceof Error ? e.message : "Config 로드 실패");
      setConfigAppliedAt(Date.now());
    }
  }, []);

  const loadDefaultConfig = useCallback(() => {
    void loadConfigFromInbox()
      .then((inbox) => {
        if (userOverrideRef.current) return;
        if (inbox) {
          applySpecText(inbox.text, inbox.name, false);
          return;
        }

        return fetch(`${DEFAULT_CONFIG_PATH}?t=${Date.now()}`, { cache: "no-store" })
          .then((res) => {
            if (!res.ok) throw new Error("GaiaStat2grrConfig.csv를 찾을 수 없습니다.");
            return res.text();
          })
          .then((text) => {
            if (userOverrideRef.current) return;
            applySpecText(text, "GaiaStat2grrConfig.csv (번들)", false);
          });
      })
      .catch((e) => {
        if (userOverrideRef.current) return;
        setConfigError(
          e instanceof Error ? e.message : "Reference Config 자동 로드 실패"
        );
      });
  }, [applySpecText]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const persisted = loadPersistedGrrConfig();
    if (persisted) {
      userOverrideRef.current = true;
      applySpecText(persisted.csvText, persisted.fileName, true);
      return;
    }

    loadDefaultConfig();
  }, [applySpecText, loadDefaultConfig]);

  const loadSpecFromUser = useCallback(
    (text: string, fileName: string) => {
      userOverrideRef.current = true;
      savePersistedGrrConfig(fileName, text);
      applySpecText(text, fileName, true);
    },
    [applySpecText]
  );

  const reloadDefaultConfig = useCallback(() => {
    userOverrideRef.current = false;
    clearPersistedGrrConfig();
    setIsUserConfig(false);
    loadDefaultConfig();
  }, [loadDefaultConfig]);

  const value: GrrConfigStoreState = {
    specStore,
    configFileName,
    configError,
    configValidation,
    isUserConfig,
    configAppliedAt,
    configItemCount: specStore?.entries.length ?? 0,
    loadSpecFromUser,
    reloadDefaultConfig,
  };

  return (
    <GrrConfigContext.Provider value={value}>{children}</GrrConfigContext.Provider>
  );
}

export function useGrrConfigStore(): GrrConfigStoreState {
  const ctx = useContext(GrrConfigContext);
  if (!ctx) {
    throw new Error("useGrrConfigStore must be used within GrrConfigProvider");
  }
  return ctx;
}
