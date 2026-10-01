import { useCallback, useMemo } from "react";
import {
  createDefaultGraphConfig,
  type GraphElementType,
} from "@shared/schemas/types";
import { parseCsvText } from "@renderer/data/parseCsv";
import { useDatasetStore } from "@renderer/stores/datasetStore";
import { useGraphStore } from "@renderer/stores/graphStore";
import { useHistoryStore } from "@renderer/stores/historyStore";
import { useLayoutStore } from "@renderer/stores/layoutStore";
import { usePreferenceStore } from "@renderer/stores/preferenceStore";
import { useProjectStore } from "@renderer/stores/projectStore";
import { useSelectionStore } from "@renderer/stores/selectionStore";
import { APP_NAME, APP_VERSION } from "@shared/constants/app";

function hasDesktopApi(): boolean {
  return typeof window !== "undefined" && typeof window.statforge !== "undefined";
}

export function useAppActions() {
  const setDataset = useDatasetStore((s) => s.setDataset);
  const clearDataset = useDatasetStore((s) => s.clear);
  const dataset = useDatasetStore((s) => s.dataset);
  const notify = usePreferenceStore((s) => s.notify);
  const project = useProjectStore();
  const graph = useGraphStore();
  const history = useHistoryStore();
  const canUndo = useHistoryStore((s) => s.past.length > 1);
  const canRedo = useHistoryStore((s) => s.future.length > 0);
  const layout = useLayoutStore();
  const selection = useSelectionStore();

  const pushHistory = useCallback((label: string) => {
    useHistoryStore.getState().push({
      graph: structuredClone(useGraphStore.getState().config),
      label,
    });
  }, []);

  const applyParsedCsv = useCallback(
    (
      content: string,
      fileName: string,
      filePath: string | null,
      historyLabel = "Open data"
    ) => {
      const lower = fileName.toLowerCase();
      if (lower.endsWith(".xlsx") || lower.endsWith(".json") || lower.endsWith(".parquet")) {
        notify(
          "warning",
          `${fileName}: this format is planned for a later phase. Please open a CSV for Phase 1.`
        );
        return;
      }

      const { dataset: parsed, warnings } = parseCsvText(content, fileName, filePath);
      setDataset(parsed);
      graph.replaceConfig(createDefaultGraphConfig());
      history.clear();
      history.push({
        graph: structuredClone(useGraphStore.getState().config),
        label: historyLabel,
      });
      project.setDirty(true);
      selection.clearColumnSelection();
      selection.clearRowSelection();
      for (const w of warnings) notify("warning", w);
      notify(
        "info",
        `Loaded ${parsed.rowCount.toLocaleString()} rows × ${parsed.columns.length} columns`
      );
    },
    [graph, history, notify, project, selection, setDataset]
  );

  const openData = useCallback(async () => {
    try {
      if (!hasDesktopApi()) {
        notify("error", "Desktop file dialogs are only available in the Electron app.");
        return;
      }
      const result = await window.statforge.openDataFile();
      if (result.canceled) return;
      applyParsedCsv(result.content, result.fileName, result.filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open data file.";
      notify("error", message);
    }
  }, [applyParsedCsv, notify]);

  const openDataFromPath = useCallback(
    async (filePath: string) => {
      try {
        if (!hasDesktopApi()) {
          notify("error", "Opening files by path is only available in the Electron app.");
          return;
        }
        const content = await window.statforge.readTextFile(filePath);
        const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
        applyParsedCsv(content, fileName, filePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to open data file.";
        notify("error", message);
      }
    },
    [applyParsedCsv, notify]
  );
  const newProject = useCallback(() => {
    clearDataset();
    graph.replaceConfig(createDefaultGraphConfig());
    history.clear();
    project.newProject();
    selection.clearColumnSelection();
    selection.clearRowSelection();
    notify("info", "Started a new project.");
  }, [clearDataset, graph, history, notify, project, selection]);

  const saveProjectAs = useCallback(async () => {
    if (!hasDesktopApi()) {
      notify("error", "Saving is only available in the Electron app.");
      return;
    }
    const dialog = await window.statforge.saveProjectDialog(
      `${project.projectName}.statforge`
    );
    if (dialog.canceled) return;
    const payload = {
      version: 2,
      schemaVersion: 2,
      app: APP_NAME,
      projectName: project.projectName,
      dataset: dataset
        ? {
            fileName: dataset.fileName,
            filePath: dataset.filePath,
            columns: dataset.columns,
            columnsData: dataset.columnsData,
            rowCount: dataset.rowCount,
          }
        : null,
      graph: graph.config,
      layout: {
        columnPanelWidth: layout.columnPanelWidth,
        propertiesPanelHeight: layout.propertiesPanelHeight,
        theme: layout.theme,
      },
    };
    await window.statforge.writeTextFile(dialog.filePath, JSON.stringify(payload, null, 2));
    project.setProjectPath(dialog.filePath);
    project.setDirty(false);
    notify("info", "Project saved.");
  }, [dataset, graph.config, layout, notify, project]);

  const saveProject = useCallback(async () => {
    if (project.projectPath && hasDesktopApi()) {
      const payload = {
        version: 2,
        schemaVersion: 2,
        app: APP_NAME,
        projectName: project.projectName,
        dataset,
        graph: graph.config,
        layout: {
          columnPanelWidth: layout.columnPanelWidth,
          propertiesPanelHeight: layout.propertiesPanelHeight,
          theme: layout.theme,
        },
      };
      await window.statforge.writeTextFile(
        project.projectPath,
        JSON.stringify(payload, null, 2)
      );
      project.setDirty(false);
      notify("info", "Project saved.");
      return;
    }
    await saveProjectAs();
  }, [dataset, graph.config, layout, notify, project, saveProjectAs]);

  const openProject = useCallback(async () => {
    if (!hasDesktopApi()) {
      notify("error", "Opening projects is only available in the Electron app.");
      return;
    }
    try {
      const result = await window.statforge.openProjectFile();
      if (result.canceled) return;
      const parsed = JSON.parse(result.content) as {
        version?: number;
        schemaVersion?: number;
        projectName?: string;
        dataset?: typeof dataset;
        graph?: typeof graph.config;
        layout?: {
          columnPanelWidth?: number;
          propertiesPanelHeight?: number;
          theme?: "light" | "dark";
        };
      };
      if (parsed.dataset) setDataset({ ...parsed.dataset, id: `ds_${Date.now()}` });
      else clearDataset();
      // ensureGraphConfig migrates missing axes (version 1 → 2)
      if (parsed.graph) graph.replaceConfig(parsed.graph);
      if (parsed.projectName) project.setProjectName(parsed.projectName);
      project.setProjectPath(result.filePath);
      project.setDirty(false);
      if (parsed.layout?.columnPanelWidth) {
        layout.setColumnPanelWidth(parsed.layout.columnPanelWidth);
      }
      if (parsed.layout?.propertiesPanelHeight) {
        layout.setPropertiesPanelHeight(parsed.layout.propertiesPanelHeight);
      }
      if (parsed.layout?.theme) layout.setTheme(parsed.layout.theme);
      notify("info", "Project restored.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open project.";
      notify("error", message);
    }
  }, [clearDataset, graph, layout, notify, project, setDataset]);

  const undo = useCallback(() => {
    const snap = history.undo();
    if (snap) graph.replaceConfig(structuredClone(snap.graph));
  }, [graph, history]);

  const redo = useCallback(() => {
    const snap = history.redo();
    if (snap) graph.replaceConfig(structuredClone(snap.graph));
  }, [graph, history]);

  return useMemo(
    () => ({
      openData,
      openDataFromPath,
      openProject,
      saveProject,
      saveProjectAs,
      newProject,
      exit: () => void window.statforge?.close(),
      undo,
      redo,
      canUndo,
      canRedo,
      selectAllColumns: () => {
        const ids = useDatasetStore.getState().dataset?.columns.map((c) => c.id) ?? [];
        selection.setSelectedColumns(ids);
      },
      clearRowSelection: () => selection.clearRowSelection(),
      showDataTable: () => project.setViewMode("dataTable"),
      showGraphBuilder: () => project.setViewMode("graphBuilder"),
      setElementType: (t: GraphElementType) => {
        pushHistory("Change graph type");
        graph.setElementType(t);
      },
      toggleLayer: (
        kind: import("@shared/schemas/types").GraphLayerKind,
        exclusive: boolean
      ) => {
        pushHistory(exclusive ? `Select ${kind}` : `Toggle ${kind}`);
        graph.toggleLayer(kind, exclusive);
      },
      resetLayout: () => layout.resetLayout(),
      toggleColumnPanel: () =>
        layout.setColumnPanelVisible(!useLayoutStore.getState().columnPanelVisible),
      togglePropertiesPanel: () =>
        layout.setPropertiesPanelVisible(
          !useLayoutStore.getState().propertiesPanelVisible
        ),
      zoomIn: () => layout.setZoom(useLayoutStore.getState().zoom + 0.1),
      zoomOut: () => layout.setZoom(useLayoutStore.getState().zoom - 0.1),
      toggleTheme: () =>
        layout.setTheme(useLayoutStore.getState().theme === "light" ? "dark" : "light"),
      about: () =>
        notify("info", `${APP_NAME} ${APP_VERSION} — desktop statistical graph builder`),
      pushHistory,
    }),
    [
      canRedo,
      canUndo,
      graph,
      history,
      layout,
      newProject,
      notify,
      openData,
      openDataFromPath,
      openProject,
      project,
      pushHistory,
      redo,
      saveProject,
      saveProjectAs,
      selection,
      undo,
    ]
  );
}
