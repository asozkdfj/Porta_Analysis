import { create } from "zustand";
import type { Dataset } from "@shared/schemas/types";

interface DatasetState {
  dataset: Dataset | null;
  loadError: string | null;
  setDataset: (dataset: Dataset | null) => void;
  setLoadError: (message: string | null) => void;
  clear: () => void;
}

export const useDatasetStore = create<DatasetState>((set) => ({
  dataset: null,
  loadError: null,
  setDataset: (dataset) => set({ dataset, loadError: null }),
  setLoadError: (loadError) => set({ loadError }),
  clear: () => set({ dataset: null, loadError: null }),
}));
