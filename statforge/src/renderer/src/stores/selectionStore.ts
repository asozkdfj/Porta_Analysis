import { create } from "zustand";

interface SelectionState {
  selectedColumnIds: string[];
  selectedRowIndices: number[];
  lastClickedColumnId: string | null;
  setSelectedColumns: (ids: string[]) => void;
  toggleColumn: (
    id: string,
    additive: boolean,
    range: boolean,
    orderedIds: string[]
  ) => void;
  clearColumnSelection: () => void;
  setSelectedRows: (indices: number[]) => void;
  clearRowSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedColumnIds: [],
  selectedRowIndices: [],
  lastClickedColumnId: null,
  setSelectedColumns: (selectedColumnIds) => set({ selectedColumnIds }),
  toggleColumn: (id, additive, range, orderedIds) => {
    const { selectedColumnIds, lastClickedColumnId } = get();
    if (range && lastClickedColumnId) {
      const a = orderedIds.indexOf(lastClickedColumnId);
      const b = orderedIds.indexOf(id);
      if (a >= 0 && b >= 0) {
        const [start, end] = a < b ? [a, b] : [b, a];
        const rangeIds = orderedIds.slice(start, end + 1);
        set({
          selectedColumnIds: additive
            ? Array.from(new Set([...selectedColumnIds, ...rangeIds]))
            : rangeIds,
          lastClickedColumnId: id,
        });
        return;
      }
    }
    if (additive) {
      const exists = selectedColumnIds.includes(id);
      set({
        selectedColumnIds: exists
          ? selectedColumnIds.filter((x) => x !== id)
          : [...selectedColumnIds, id],
        lastClickedColumnId: id,
      });
      return;
    }
    set({ selectedColumnIds: [id], lastClickedColumnId: id });
  },
  clearColumnSelection: () =>
    set({ selectedColumnIds: [], lastClickedColumnId: null }),
  setSelectedRows: (selectedRowIndices) => set({ selectedRowIndices }),
  clearRowSelection: () => set({ selectedRowIndices: [] }),
}));
