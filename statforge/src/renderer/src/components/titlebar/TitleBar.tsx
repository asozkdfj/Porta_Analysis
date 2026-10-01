import { useEffect, useState } from "react";
import { useDatasetStore } from "@renderer/stores/datasetStore";
import { useProjectStore } from "@renderer/stores/projectStore";

export function TitleBar() {
  const fileName = useDatasetStore((s) => s.dataset?.fileName ?? null);
  const windowTitle = useProjectStore((s) => s.windowTitle);
  const title = windowTitle(fileName);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    void window.statforge?.setTitle(title);
  }, [title]);

  useEffect(() => {
    void window.statforge?.isMaximized().then(setMaximized);
  }, []);

  return (
    <header className="titlebar" role="banner">
      <div className="titlebar-title">{title}</div>
      <div className="titlebar-controls">
        <button
          type="button"
          aria-label="Minimize"
          onClick={() => void window.statforge?.minimize()}
        >
          ─
        </button>
        <button
          type="button"
          aria-label={maximized ? "Restore" : "Maximize"}
          onClick={() => {
            void window.statforge?.maximize();
            setMaximized((v) => !v);
          }}
        >
          {maximized ? "❐" : "□"}
        </button>
        <button
          type="button"
          className="close"
          aria-label="Close"
          onClick={() => void window.statforge?.close()}
        >
          ×
        </button>
      </div>
    </header>
  );
}
