import { create } from "zustand";
import type { AxisId } from "@shared/schemas/axis";

/** UI-only state for Axis Settings dialog / context menu. */
interface AxisUiState {
  settingsOpen: boolean;
  settingsAxisId: AxisId | null;
  /** When true, focus title field after open (Edit Axis Label). */
  focusTitle: boolean;
  contextMenu: {
    /** Fixed axis, or null to let user pick X/Y */
    axisId: AxisId | null;
    x: number;
    y: number;
  } | null;
  openSettings: (axisId: AxisId, opts?: { focusTitle?: boolean }) => void;
  closeSettings: () => void;
  openContextMenu: (
    axisId: AxisId | null,
    x: number,
    y: number
  ) => void;
  closeContextMenu: () => void;
}

export const useAxisUiStore = create<AxisUiState>((set) => ({
  settingsOpen: false,
  settingsAxisId: null,
  focusTitle: false,
  contextMenu: null,
  openSettings: (axisId, opts) =>
    set({
      settingsOpen: true,
      settingsAxisId: axisId,
      focusTitle: Boolean(opts?.focusTitle),
      contextMenu: null,
    }),
  closeSettings: () =>
    set({ settingsOpen: false, settingsAxisId: null, focusTitle: false }),
  openContextMenu: (axisId, x, y) =>
    set({ contextMenu: { axisId, x, y } }),
  closeContextMenu: () => set({ contextMenu: null }),
}));
