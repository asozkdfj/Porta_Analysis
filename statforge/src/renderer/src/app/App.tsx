import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import { ColumnBrowser } from "@renderer/components/column-browser/ColumnBrowser";
import { DndWorkspace } from "@renderer/components/dnd/DndWorkspace";
import { GraphBuilder } from "@renderer/components/graph-builder/GraphBuilder";
import { MenuBar } from "@renderer/components/menu/MenuBar";
import { Notifications } from "@renderer/components/notifications/Notifications";
import { PropertyPanel } from "@renderer/components/property-panel/PropertyPanel";
import { TitleBar } from "@renderer/components/titlebar/TitleBar";
import { Toolbar } from "@renderer/components/toolbar/Toolbar";
import { useAppActions } from "@renderer/hooks/useAppActions";
import { useLayoutStore } from "@renderer/stores/layoutStore";

export function App() {
  const columnPanelVisible = useLayoutStore((s) => s.columnPanelVisible);
  const propertiesPanelVisible = useLayoutStore((s) => s.propertiesPanelVisible);
  const columnPanelWidth = useLayoutStore((s) => s.columnPanelWidth);
  const propertiesPanelHeight = useLayoutStore((s) => s.propertiesPanelHeight);
  const theme = useLayoutStore((s) => s.theme);
  const setColumnPanelWidth = useLayoutStore((s) => s.setColumnPanelWidth);
  const setPropertiesPanelHeight = useLayoutStore((s) => s.setPropertiesPanelHeight);
  const actions = useAppActions();

  const draggingCol = useRef(false);
  const draggingProp = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "o") {
        e.preventDefault();
        void actions.openData();
      } else if (key === "s") {
        e.preventDefault();
        void actions.saveProject();
      } else if (key === "n") {
        e.preventDefault();
        actions.newProject();
      } else if (key === "z") {
        e.preventDefault();
        actions.undo();
      } else if (key === "y") {
        e.preventDefault();
        actions.redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions]);

  const onColSplitterMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingCol.current) return;
      setColumnPanelWidth(e.clientX);
    },
    [setColumnPanelWidth]
  );

  const onPropSplitterMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingProp.current) return;
      const panel = document.querySelector(".left-panel") as HTMLElement | null;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      setPropertiesPanelHeight(rect.bottom - e.clientY);
    },
    [setPropertiesPanelHeight]
  );

  useEffect(() => {
    const up = () => {
      draggingCol.current = false;
      draggingProp.current = false;
    };
    window.addEventListener("mousemove", onColSplitterMove);
    window.addEventListener("mousemove", onPropSplitterMove);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", onColSplitterMove);
      window.removeEventListener("mousemove", onPropSplitterMove);
      window.removeEventListener("mouseup", up);
    };
  }, [onColSplitterMove, onPropSplitterMove]);

  return (
    <div
      className="app-shell"
      style={
        {
          "--left-width": columnPanelVisible ? `${columnPanelWidth}px` : "0px",
          "--props-height": `${propertiesPanelHeight}px`,
        } as CSSProperties
      }
    >
      <TitleBar />
      <MenuBar />
      <Toolbar />
      <DndWorkspace>
        <div
          className="workspace"
          style={{
            gridTemplateColumns: columnPanelVisible
              ? `${columnPanelWidth}px 4px 1fr`
              : "0 0 1fr",
          }}
        >
          {columnPanelVisible ? (
            <aside
              className={`left-panel ${propertiesPanelVisible ? "" : "no-props"}`}
              aria-label="Left panel"
            >
              <ColumnBrowser />
              {propertiesPanelVisible ? (
                <>
                  <button
                    type="button"
                    className="splitter-h"
                    aria-label="Resize properties panel"
                    onMouseDown={() => {
                      draggingProp.current = true;
                    }}
                  />
                  <PropertyPanel />
                </>
              ) : null}
            </aside>
          ) : (
            <div />
          )}
          {columnPanelVisible ? (
            <button
              type="button"
              className="splitter-v"
              aria-label="Resize column panel"
              onMouseDown={() => {
                draggingCol.current = true;
              }}
            />
          ) : (
            <div />
          )}
          <main className="graph-workspace" aria-label="Graph workspace">
            <GraphBuilder />
          </main>
        </div>
      </DndWorkspace>
      <Notifications />
    </div>
  );
}
