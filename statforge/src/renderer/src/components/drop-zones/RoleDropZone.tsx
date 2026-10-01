import { useDraggable, useDroppable } from "@dnd-kit/core";
import { X } from "lucide-react";
import type { CSSProperties } from "react";
import type { ColumnMeta, ColumnRef, RoleKey } from "@shared/schemas/types";
import { useDatasetStore } from "@renderer/stores/datasetStore";
import { useHistoryStore } from "@renderer/stores/historyStore";
import { useGraphStore } from "@renderer/stores/graphStore";
import { useAxisUiStore } from "@renderer/stores/axisUiStore";

interface RoleDropZoneProps {
  role: RoleKey;
  label: string;
  items: ColumnRef[];
  onRemove: (columnId: string) => void;
  className?: string;
  style?: CSSProperties;
}

function shortLeaf(name: string, max = 28): string {
  const leaf = name.split("::").pop() ?? name;
  return leaf.length <= max ? leaf : `${leaf.slice(0, max - 1)}…`;
}

function RolePill({
  role,
  label,
  item,
  column,
  prefix,
  onRemove,
}: {
  role: RoleKey;
  label: string;
  item: ColumnRef;
  column: ColumnMeta | undefined;
  prefix: string;
  onRemove: (columnId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pill:${role}:${item.columnId}`,
    data: {
      type: "role-pill" as const,
      fromRole: role,
      columnId: item.columnId,
      column:
        column ??
        ({
          id: item.columnId,
          name: item.name,
          dataType: "character",
          modelingType: "nominal",
          missingCount: 0,
          uniqueCount: 0,
          hidden: false,
        } satisfies ColumnMeta),
      ref: item,
    },
  });

  const display = shortLeaf(item.name, role === "y" || role === "x" ? 22 : 26);

  return (
    <div
      ref={setNodeRef}
      className={`role-pill ${isDragging ? "dragging" : ""}`}
      title={`${item.name} — drag to another drop zone`}
      {...listeners}
      {...attributes}
      style={{ touchAction: "none", opacity: isDragging ? 0.45 : 1 }}
    >
      {column ? <span className={`type-badge ${column.dataType}`} aria-hidden /> : null}
      <span>
        {prefix}
        {display}
      </span>
      <button
        type="button"
        aria-label={`Remove ${item.name} from ${label}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.columnId);
          useHistoryStore.getState().push({
            graph: structuredClone(useGraphStore.getState().config),
            label: `Remove ${item.name} from ${role}`,
          });
        }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

export function RoleDropZone({
  role,
  label,
  items,
  onRemove,
  className = "",
  style,
}: RoleDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `role:${role}`,
    data: { role },
  });
  const dataset = useDatasetStore((s) => s.dataset);
  const openContextMenu = useAxisUiStore((s) => s.openContextMenu);
  const openSettings = useAxisUiStore((s) => s.openSettings);

  const axisId = role === "x" || role === "y" ? role : null;

  return (
    <div
      ref={setNodeRef}
      className={`drop-zone role-${role} ${items.length ? "has-items" : ""} ${isOver ? "active" : ""} ${className}`}
      style={style}
      data-role={role}
      aria-label={`${label} drop zone`}
      onContextMenu={
        axisId
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              openContextMenu(axisId, e.clientX, e.clientY);
            }
          : undefined
      }
      onDoubleClick={
        axisId
          ? (e) => {
              e.preventDefault();
              openSettings(axisId);
            }
          : undefined
      }
      title={
        axisId
          ? `${label}: right-click for Axis Settings`
          : role === "overlay" || role === "color"
            ? `${label}: drop a column to split / color series`
            : undefined
      }
    >
      <div className="drop-zone-label">
        {label}
        {items.length > 1 ? (
          <span className="drop-zone-count"> ({items.length})</span>
        ) : null}
      </div>
      <div className="pill-list">
        {items.map((item, index) => {
          const col = dataset?.columns.find((c) => c.id === item.columnId);
          const prefix =
            role === "interval"
              ? items.length === 1
                ? "± "
                : index === 0
                  ? "Lower: "
                  : "Upper: "
              : "";
          return (
            <RolePill
              key={`${role}-${item.columnId}`}
              role={role}
              label={label}
              item={item}
              column={col}
              prefix={prefix}
              onRemove={onRemove}
            />
          );
        })}
      </div>
    </div>
  );
}
