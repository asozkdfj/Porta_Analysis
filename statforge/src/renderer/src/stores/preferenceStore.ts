import { create } from "zustand";
import type { AppNotification } from "@shared/schemas/types";

interface PreferenceState {
  showTooltips: boolean;
  denseUi: boolean;
  notifications: AppNotification[];
  setShowTooltips: (v: boolean) => void;
  setDenseUi: (v: boolean) => void;
  notify: (level: AppNotification["level"], message: string) => void;
  dismiss: (id: string) => void;
  clearNotifications: () => void;
}

export const usePreferenceStore = create<PreferenceState>((set, get) => ({
  showTooltips: true,
  denseUi: true,
  notifications: [],
  setShowTooltips: (showTooltips) => set({ showTooltips }),
  setDenseUi: (denseUi) => set({ denseUi }),
  notify: (level, message) => {
    const item: AppNotification = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      level,
      message,
      createdAt: Date.now(),
    };
    set({ notifications: [...get().notifications.slice(-19), item] });
  },
  dismiss: (id) =>
    set({ notifications: get().notifications.filter((n) => n.id !== id) }),
  clearNotifications: () => set({ notifications: [] }),
}));
