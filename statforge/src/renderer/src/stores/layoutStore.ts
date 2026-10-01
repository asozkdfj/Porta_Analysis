import { create } from "zustand";
import { COLUMN_PANEL_WIDTH } from "@shared/constants/app";

interface LayoutState {
  columnPanelWidth: number;
  columnPanelVisible: boolean;
  propertiesPanelVisible: boolean;
  propertiesPanelHeight: number;
  theme: "light" | "dark";
  zoom: number;
  setColumnPanelWidth: (width: number) => void;
  setColumnPanelVisible: (visible: boolean) => void;
  setPropertiesPanelVisible: (visible: boolean) => void;
  setPropertiesPanelHeight: (height: number) => void;
  setTheme: (theme: "light" | "dark") => void;
  setZoom: (zoom: number) => void;
  resetLayout: () => void;
}

const defaults = {
  columnPanelWidth: COLUMN_PANEL_WIDTH,
  columnPanelVisible: true,
  propertiesPanelVisible: true,
  propertiesPanelHeight: 220,
  theme: "light" as const,
  zoom: 1,
};

export const useLayoutStore = create<LayoutState>((set) => ({
  ...defaults,
  setColumnPanelWidth: (columnPanelWidth) =>
    set({ columnPanelWidth: Math.min(480, Math.max(180, columnPanelWidth)) }),
  setColumnPanelVisible: (columnPanelVisible) => set({ columnPanelVisible }),
  setPropertiesPanelVisible: (propertiesPanelVisible) =>
    set({ propertiesPanelVisible }),
  setPropertiesPanelHeight: (propertiesPanelHeight) =>
    set({
      propertiesPanelHeight: Math.min(480, Math.max(160, propertiesPanelHeight)),
    }),
  setTheme: (theme) => set({ theme }),
  setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.5, zoom)) }),
  resetLayout: () => set({ ...defaults }),
}));
