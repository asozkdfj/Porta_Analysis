import { useDroppable } from "@dnd-kit/core";
import type { ColumnRef, GraphConfig, GraphRoles, RoleKey } from "@shared/schemas/types";
import { GraphCanvas } from "@renderer/charts/GraphCanvas";
import { useDatasetStore } from "@renderer/stores/datasetStore";
import { useGraphStore } from "@renderer/stores/graphStore";
import { RoleDropZone } from "./RoleDropZone";

interface DropZoneCanvasProps {
  config: GraphConfig;
}

function shortLeaf(name: string): string {
  const leaf = name.split("::").pop() ?? name;
  return leaf;
}

/** JMP-style: "Y1 & Y2 vs. X" */
export function formatGraphRoleTitle(roles: GraphRoles): string {
  const join = (refs: ColumnRef[]) =>
    refs.map((r) => shortLeaf(r.name)).filter(Boolean).join(" & ");
  const y = join(roles.y);
  const x = join(roles.x);
  if (y && x) return `${y} vs. ${x}`;
  if (y) return y;
  if (x) return x;
  return "";
}

function Zone({
  role,
  label,
  config,
  className,
}: {
  role: RoleKey;
  label: string;
  config: GraphConfig;
  className?: string;
}) {
  const removeFromRole = useGraphStore((s) => s.removeFromRole);
  return (
    <RoleDropZone
      role={role}
      label={label}
      items={config.roles[role]}
      onRemove={(columnId) => removeFromRole(role, columnId)}
      className={className}
    />
  );
}

export function DropZoneCanvas({ config }: DropZoneCanvasProps) {
  const dataset = useDatasetStore((s) => s.dataset);
  const { setNodeRef, isOver } = useDroppable({
    id: "role:canvas",
    data: { role: "canvas" },
  });
  const autoTitle =
    config.options.titleText.trim() || formatGraphRoleTitle(config.roles);

  return (
    <div className="drop-grid" role="region" aria-label="Graph Builder canvas">
      <div className="graph-auto-title" title={autoTitle || undefined}>
        {autoTitle || "Drag variables into drop zones"}
      </div>

      <Zone role="groupX" label="Group X" config={config} className="zone-group-x" />

      <div className="zone-right-top">
        <Zone role="wrap" label="Wrap" config={config} />
        <Zone role="overlay" label="Overlay" config={config} />
      </div>

      <Zone role="y" label="Y" config={config} className="zone-y" />

      <div
        ref={setNodeRef}
        className={`drop-zone canvas zone-canvas ${isOver ? "active" : ""}`}
        aria-label="Graph canvas drop zone"
      >
        <GraphCanvas dataset={dataset} config={config} />
      </div>

      <div className="zone-right-side">
        <Zone role="color" label="Color" config={config} />
        <Zone role="groupY" label="Group Y" config={config} />
        <Zone role="frequency" label="Freq" config={config} />
      </div>

      <Zone role="mapShape" label="Map Shape" config={config} className="zone-map" />
      <Zone role="x" label="X" config={config} className="zone-x" />
      <Zone role="page" label="Page" config={config} className="zone-page" />
    </div>
  );
}
