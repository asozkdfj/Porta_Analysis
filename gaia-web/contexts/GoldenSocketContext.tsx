"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CANONICAL_GOLDEN_SOCKETS,
  GOLDEN_DELTA_LIMIT_OPTIONS,
  type GoldenDeltaLimit,
} from "@/lib/golden-socket-config";

const STORAGE_KEY_SOCKET = "gaia.goldenSocket";
const STORAGE_KEY_LIMIT = "gaia.goldenDeltaLimit";

interface GoldenSocketContextValue {
  goldenSocket: string | null;
  setGoldenSocket: (socket: string | null) => void;
  goldenDeltaLimit: GoldenDeltaLimit;
  setGoldenDeltaLimit: (limit: GoldenDeltaLimit) => void;
  socketOptions: string[];
}

const GoldenSocketContext = createContext<GoldenSocketContextValue | null>(null);

export function GoldenSocketProvider({ children }: { children: ReactNode }) {
  const [goldenSocket, setGoldenSocketState] = useState<string | null>(null);
  const [goldenDeltaLimit, setGoldenDeltaLimitState] =
    useState<GoldenDeltaLimit>(1.0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedSocket = localStorage.getItem(STORAGE_KEY_SOCKET);
      const storedLimit = localStorage.getItem(STORAGE_KEY_LIMIT);
      if (storedSocket && storedSocket !== "__none__") {
        setGoldenSocketState(storedSocket);
      }
      const parsedLimit = Number(storedLimit);
      if (GOLDEN_DELTA_LIMIT_OPTIONS.includes(parsedLimit as GoldenDeltaLimit)) {
        setGoldenDeltaLimitState(parsedLimit as GoldenDeltaLimit);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setGoldenSocket = useCallback((socket: string | null) => {
    setGoldenSocketState(socket);
    try {
      localStorage.setItem(STORAGE_KEY_SOCKET, socket ?? "__none__");
    } catch {
      /* ignore */
    }
  }, []);

  const setGoldenDeltaLimit = useCallback((limit: GoldenDeltaLimit) => {
    setGoldenDeltaLimitState(limit);
    try {
      localStorage.setItem(STORAGE_KEY_LIMIT, String(limit));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      goldenSocket: hydrated ? goldenSocket : null,
      setGoldenSocket,
      goldenDeltaLimit,
      setGoldenDeltaLimit,
      socketOptions: CANONICAL_GOLDEN_SOCKETS,
    }),
    [goldenSocket, goldenDeltaLimit, setGoldenSocket, setGoldenDeltaLimit, hydrated]
  );

  return (
    <GoldenSocketContext.Provider value={value}>
      {children}
    </GoldenSocketContext.Provider>
  );
}

export function useGoldenSocket() {
  const ctx = useContext(GoldenSocketContext);
  if (!ctx) {
    throw new Error("useGoldenSocket must be used within GoldenSocketProvider");
  }
  return ctx;
}
