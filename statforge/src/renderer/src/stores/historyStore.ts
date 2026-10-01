import { create } from "zustand";
import { MAX_HISTORY } from "@shared/constants/app";
import type { GraphConfig } from "@shared/schemas/types";

export type HistorySnapshot = {
  graph: GraphConfig;
  label: string;
};

interface HistoryState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  push: (snapshot: HistorySnapshot) => void;
  undo: () => HistorySnapshot | null;
  redo: () => HistorySnapshot | null;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  push: (snapshot) => {
    const past = [...get().past, snapshot];
    while (past.length > MAX_HISTORY) past.shift();
    set({ past, future: [] });
  },
  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return null;
    const nextPast = [...past];
    const current = nextPast.pop()!;
    set({ past: nextPast, future: [current, ...future] });
    return nextPast[nextPast.length - 1] ?? null;
  },
  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return null;
    const [next, ...rest] = future;
    set({ past: [...past, next], future: rest });
    return next;
  },
  clear: () => set({ past: [], future: [] }),
  canUndo: () => get().past.length > 1,
  canRedo: () => get().future.length > 0,
}));
