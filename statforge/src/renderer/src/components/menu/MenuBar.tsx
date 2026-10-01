import { useEffect, useRef, useState } from "react";
import { useAppActions } from "@renderer/hooks/useAppActions";

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  separator?: boolean;
}

interface MenuDef {
  id: string;
  label: string;
  items: MenuItem[];
}

export function MenuBar() {
  const actions = useAppActions();
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  const menus: MenuDef[] = [
    {
      id: "file",
      label: "File",
      items: [
        { label: "New Project", shortcut: "Ctrl+N", action: actions.newProject },
        { label: "Open Data…", shortcut: "Ctrl+O", action: actions.openData },
        { label: "Open Project…", action: actions.openProject },
        { separator: true, label: "" },
        { label: "Save Project", shortcut: "Ctrl+S", action: actions.saveProject },
        { label: "Save Project As…", action: actions.saveProjectAs },
        { separator: true, label: "" },
        { label: "Export Graph…", disabled: true },
        { separator: true, label: "" },
        { label: "Exit", action: actions.exit },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z", action: actions.undo, disabled: !actions.canUndo },
        { label: "Redo", shortcut: "Ctrl+Y", action: actions.redo, disabled: !actions.canRedo },
        { separator: true, label: "" },
        { label: "Cut", disabled: true },
        { label: "Copy", disabled: true },
        { label: "Paste", disabled: true },
        { label: "Select All", action: actions.selectAllColumns },
      ],
    },
    {
      id: "tables",
      label: "Tables",
      items: [{ label: "Data Table", action: actions.showDataTable, disabled: true }],
    },
    {
      id: "rows",
      label: "Rows",
      items: [
        { label: "Select All", disabled: true },
        { label: "Clear Selection", action: actions.clearRowSelection },
        { label: "Exclude Selected", disabled: true },
        { label: "Hide Selected", disabled: true },
        { label: "Delete Selected", disabled: true },
      ],
    },
    {
      id: "columns",
      label: "Columns",
      items: [
        { label: "New Column", disabled: true },
        { label: "Rename Column", disabled: true },
        { label: "Delete Column", disabled: true },
        { label: "Change Data Type", disabled: true },
        { label: "Set Modeling Type", disabled: true },
      ],
    },
    {
      id: "analyze",
      label: "Analyze",
      items: [{ label: "Distribution", disabled: true }],
    },
    {
      id: "graph",
      label: "Graph",
      items: [
        { label: "Graph Builder", action: actions.showGraphBuilder },
        { label: "Scatter Plot", action: () => actions.setElementType("points") },
        { label: "Histogram", action: () => actions.setElementType("histogram"), disabled: true },
        { label: "Box Plot", action: () => actions.setElementType("boxplot"), disabled: true },
        { label: "Bar Chart", action: () => actions.setElementType("bar"), disabled: true },
        { label: "Line Chart", action: () => actions.setElementType("line"), disabled: true },
        { label: "Heatmap", action: () => actions.setElementType("heatmap"), disabled: true },
      ],
    },
    {
      id: "tools",
      label: "Tools",
      items: [{ label: "Preferences", disabled: true }],
    },
    {
      id: "view",
      label: "View",
      items: [
        { label: "Reset Layout", action: actions.resetLayout },
        { label: "Toggle Column Panel", action: actions.toggleColumnPanel },
        { label: "Toggle Properties Panel", action: actions.togglePropertiesPanel },
        { label: "Zoom In", action: actions.zoomIn },
        { label: "Zoom Out", action: actions.zoomOut },
        { label: "Toggle Theme", action: actions.toggleTheme },
      ],
    },
    {
      id: "window",
      label: "Window",
      items: [{ label: "Minimize", action: () => void window.statforge?.minimize() }],
    },
    {
      id: "help",
      label: "Help",
      items: [{ label: "About StatForge", action: actions.about }],
    },
  ];

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenId(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <nav className="menubar" ref={rootRef} aria-label="Main menu">
      {menus.map((menu) => (
        <div className="menubar-item" key={menu.id}>
          <button
            type="button"
            className="menubar-button"
            aria-haspopup="menu"
            aria-expanded={openId === menu.id}
            onClick={() => setOpenId((id) => (id === menu.id ? null : menu.id))}
            onMouseEnter={() => {
              if (openId) setOpenId(menu.id);
            }}
          >
            {menu.label}
          </button>
          {openId === menu.id ? (
            <div className="menu-dropdown" role="menu">
              {menu.items.map((item, index) =>
                item.separator ? (
                  <div className="menu-sep" key={`sep-${menu.id}-${index}`} />
                ) : (
                  <button
                    key={`${menu.id}-${item.label}`}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      item.action?.();
                      setOpenId(null);
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut ? (
                      <span className="menu-shortcut">{item.shortcut}</span>
                    ) : null}
                  </button>
                )
              )}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
