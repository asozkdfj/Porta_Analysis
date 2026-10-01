import { useDraggable } from "@dnd-kit/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownAZ, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { ColumnMeta, RoleKey } from "@shared/schemas/types";
import { assignColumnToRole } from "@renderer/components/dnd/DndWorkspace";
import { useDatasetStore } from "@renderer/stores/datasetStore";
import { useGraphStore } from "@renderer/stores/graphStore";
import { useSelectionStore } from "@renderer/stores/selectionStore";

const CONTEXT_ROLES: Array<{ role: RoleKey; label: string }> = [
  { role: "y", label: "Y 축에 배치" },
  { role: "x", label: "X 축에 배치" },
  { role: "color", label: "Color" },
  { role: "overlay", label: "Overlay" },
  { role: "groupX", label: "Group X" },
  { role: "groupY", label: "Group Y" },
  { role: "wrap", label: "Wrap" },
];

function DraggableColumnRow({
  column,
  selected,
  onClick,
  onContextMenu,
  onDoubleClick,
}: {
  column: ColumnMeta;
  selected: boolean;
  onClick: (e: MouseEvent) => void;
  onContextMenu: (e: MouseEvent) => void;
  onDoubleClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `column:${column.id}`,
    data: { type: "column", column },
  });

  return (
    <div
      ref={setNodeRef}
      className={`column-row ${selected ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
      style={{ opacity: isDragging ? 0.35 : 1 }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      {...listeners}
      {...attributes}
      role="option"
      aria-selected={selected}
      title={`${column.name} (${column.dataType} / ${column.modelingType}) — 드래그하여 Drop Zone에 배치`}
    >
      <span className={`type-badge ${column.dataType}`} aria-hidden />
      <span className="column-name">{column.name}</span>
      {column.missingCount > 0 ? (
        <span className="missing-dot" title="Has missing values" />
      ) : null}
    </div>
  );
}

export function ColumnBrowser() {
  const dataset = useDatasetStore((s) => s.dataset);
  const selectedColumnIds = useSelectionStore((s) => s.selectedColumnIds);
  const toggleColumn = useSelectionStore((s) => s.toggleColumn);
  const roles = useGraphStore((s) => s.config.roles);
  const [query, setQuery] = useState("");
  /** Default: CSV header order. Sort button cycles file → A-Z → Z-A. */
  const [sortMode, setSortMode] = useState<"file" | "asc" | "desc">("file");
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    column: ColumnMeta;
  } | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(() => {
    const list = dataset?.columns ?? [];
    const filtered = query.trim()
      ? list.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
      : list;
    if (sortMode === "file") return filtered;
    return [...filtered].sort((a, b) =>
      sortMode === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
  }, [dataset, query, sortMode]);

  const orderedIds = useMemo(() => columns.map((c) => c.id), [columns]);

  const virtualizer = useVirtualizer({
    count: columns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 16,
  });

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  const quickAssign = (column: ColumnMeta) => {
    if (roles.y.length === 0) assignColumnToRole(column, "y");
    else if (roles.x.length === 0) assignColumnToRole(column, "x");
    else assignColumnToRole(column, "y");
  };

  if (!dataset) {
    return (
      <div className="column-browser">
        <div className="column-browser-header">
          <div className="column-count">0 Columns</div>
        </div>
        <div className="empty-state">Open a CSV file to browse columns.</div>
      </div>
    );
  }

  return (
    <div className="column-browser">
      <div className="column-browser-header">
        <div className="column-count">
          {dataset.columns.length.toLocaleString()} Columns
        </div>
        <p className="column-hint">드래그하여 X/Y 등에 놓거나, 더블클릭으로 빠른 배치</p>
        <div className="column-search-row">
          <input
            type="search"
            placeholder="Enter column name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search columns"
          />
          <button
            type="button"
            className="icon-btn"
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            <X size={14} />
          </button>
          <button
            type="button"
            className={`icon-btn ${sortMode !== "file" ? "active" : ""}`}
            aria-label={
              sortMode === "file"
                ? "Sort A to Z"
                : sortMode === "asc"
                  ? "Sort Z to A"
                  : "Restore file order"
            }
            title={
              sortMode === "file"
                ? "CSV 헤더 순서 (클릭: A→Z)"
                : sortMode === "asc"
                  ? "A→Z (클릭: Z→A)"
                  : "Z→A (클릭: 파일 순서)"
            }
            onClick={() =>
              setSortMode((m) =>
                m === "file" ? "asc" : m === "asc" ? "desc" : "file"
              )
            }
          >
            <ArrowDownAZ size={14} />
          </button>
        </div>
      </div>
      <div className="column-list" ref={parentRef} role="listbox" aria-label="Columns">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const column = columns[virtualRow.index];
            return (
              <div
                key={column.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <DraggableColumnRow
                  column={column}
                  selected={selectedColumnIds.includes(column.id)}
                  onClick={(e) =>
                    toggleColumn(
                      column.id,
                      e.ctrlKey || e.metaKey,
                      e.shiftKey,
                      orderedIds
                    )
                  }
                  onDoubleClick={() => quickAssign(column)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({ x: e.clientX, y: e.clientY, column });
                  }}
                />
              </div>
            );
          })}
        </div>
        {columns.length === 0 ? (
          <div className="empty-state">
            <Search size={14} style={{ marginRight: 6 }} />
            No columns match “{query}”.
          </div>
        ) : null}
      </div>

      {menu ? (
        <div
          className="column-context-menu"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          {CONTEXT_ROLES.map((item) => (
            <button
              key={item.role}
              type="button"
              role="menuitem"
              onClick={() => {
                assignColumnToRole(menu.column, item.role);
                setMenu(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
