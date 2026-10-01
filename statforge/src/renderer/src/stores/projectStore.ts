import { create } from "zustand";
import {
  APP_NAME,
  DEFAULT_PROJECT_NAME,
  GRAPH_BUILDER_LABEL,
} from "@shared/constants/app";

interface ProjectState {
  projectName: string;
  projectPath: string | null;
  dirty: boolean;
  viewMode: "graphBuilder" | "dataTable";
  setProjectName: (name: string) => void;
  setProjectPath: (path: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setViewMode: (mode: "graphBuilder" | "dataTable") => void;
  newProject: () => void;
  windowTitle: (fileName: string | null) => string;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectName: DEFAULT_PROJECT_NAME,
  projectPath: null,
  dirty: false,
  viewMode: "graphBuilder",
  setProjectName: (projectName) => set({ projectName, dirty: true }),
  setProjectPath: (projectPath) => set({ projectPath }),
  setDirty: (dirty) => set({ dirty }),
  setViewMode: (viewMode) => set({ viewMode }),
  newProject: () =>
    set({
      projectName: DEFAULT_PROJECT_NAME,
      projectPath: null,
      dirty: false,
      viewMode: "graphBuilder",
    }),
  windowTitle: (fileName) => {
    const dataLabel = fileName ?? get().projectName;
    return `${dataLabel} - ${GRAPH_BUILDER_LABEL} - ${APP_NAME}`;
  },
}));
