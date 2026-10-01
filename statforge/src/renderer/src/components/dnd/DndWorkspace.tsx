import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState, type ReactNode } from "react";
import type { ColumnMeta, ColumnRef, RoleKey } from "@shared/schemas/types";
import { useGraphStore } from "@renderer/stores/graphStore";
import { useHistoryStore } from "@renderer/stores/historyStore";
import { usePreferenceStore } from "@renderer/stores/preferenceStore";
import { validateRoleDrop } from "@renderer/utils/roleValidation";

const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length > 0) return pointer;
  return rectIntersection(args);
};

function resolveRole(overId: string | number | undefined): RoleKey | null {
  if (typeof overId !== "string") return null;
  if (overId === "role:canvas") {
    const roles = useGraphStore.getState().config.roles;
    if (roles.y.length === 0) return "y";
    if (roles.x.length === 0) return "x";
    return "y";
  }
  if (!overId.startsWith("role:")) return null;
  return overId.slice("role:".length) as RoleKey;
}

export function assignColumnToRole(column: ColumnMeta, role: RoleKey): boolean {
  const roles = useGraphStore.getState().config.roles;
  const check = validateRoleDrop(
    role,
    column,
    role === "interval" ? roles.interval.length : undefined
  );
  if (!check.ok) {
    usePreferenceStore.getState().notify("error", check.message);
    return false;
  }
  useGraphStore.getState().assignRole(role, {
    columnId: column.id,
    name: column.name,
  });
  useHistoryStore.getState().push({
    graph: structuredClone(useGraphStore.getState().config),
    label: `Assign ${column.name} to ${role}`,
  });
  return true;
}

function movePillToRole(
  fromRole: RoleKey,
  column: ColumnMeta,
  ref: ColumnRef,
  toRole: RoleKey
): boolean {
  if (fromRole === toRole) return false;
  const roles = useGraphStore.getState().config.roles;
  const check = validateRoleDrop(
    toRole,
    column,
    toRole === "interval" ? roles.interval.length : undefined
  );
  if (!check.ok) {
    usePreferenceStore.getState().notify("error", check.message);
    return false;
  }
  useGraphStore.getState().moveAcrossRoles(fromRole, toRole, ref.columnId);
  useHistoryStore.getState().push({
    graph: structuredClone(useGraphStore.getState().config),
    label: `Move ${ref.name} ${fromRole} → ${toRole}`,
  });
  return true;
}

type ActiveDrag =
  | { kind: "column"; column: ColumnMeta }
  | { kind: "pill"; column: ColumnMeta; fromRole: RoleKey; ref: ColumnRef };

export function DndWorkspace({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDrag | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const onDragStart = (event: DragStartEvent) => {
    document.body.classList.add("is-dragging");
    const data = event.active.data.current;
    if (data?.type === "role-pill") {
      setActive({
        kind: "pill",
        column: data.column as ColumnMeta,
        fromRole: data.fromRole as RoleKey,
        ref: data.ref as ColumnRef,
      });
      return;
    }
    const column = data?.column as ColumnMeta | undefined;
    setActive(column ? { kind: "column", column } : null);
  };

  const onDragCancel = () => {
    setActive(null);
    document.body.classList.remove("is-dragging");
  };

  const onDragEnd = (event: DragEndEvent) => {
    document.body.classList.remove("is-dragging");
    const role = resolveRole(event.over?.id);
    const data = event.active.data.current;
    setActive(null);
    if (!role) return;

    if (data?.type === "role-pill") {
      movePillToRole(
        data.fromRole as RoleKey,
        data.column as ColumnMeta,
        data.ref as ColumnRef,
        role
      );
      return;
    }

    const column = data?.column as ColumnMeta | undefined;
    if (!column) return;
    assignColumnToRole(column, role);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="role-pill drag-overlay-pill">
            <span className={`type-badge ${active.column.dataType}`} />
            <span>{active.column.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
