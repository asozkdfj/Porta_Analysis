import { DropZoneCanvas } from "@renderer/components/drop-zones/DropZoneCanvas";
import { AxisSettingsDialog } from "@renderer/components/graph-builder/axis/AxisSettingsDialog";
import { AxisContextMenu } from "@renderer/components/graph-builder/axis/AxisContextMenu";
import { useGraphStore } from "@renderer/stores/graphStore";

export function GraphBuilder() {
  const config = useGraphStore((s) => s.config);

  return (
    <div className="graph-builder">
      <DropZoneCanvas config={config} />
      <AxisContextMenu />
      <AxisSettingsDialog />
    </div>
  );
}
