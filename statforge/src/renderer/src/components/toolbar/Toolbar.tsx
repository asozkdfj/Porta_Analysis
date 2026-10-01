import {
  Activity,
  AreaChart,
  BarChart3,
  Box,
  Circle,
  Filter,
  FolderOpen,
  Grid3x3,
  Hand,
  LineChart,
  Maximize2,
  Minimize2,
  PieChart,
  Plus,
  Redo2,
  Save,
  ScatterChart,
  Square,
  Table2,
  TrendingUp,
  Undo2,
  Waves,
} from "lucide-react";
import { useAppActions } from "@renderer/hooks/useAppActions";
import { useGraphStore } from "@renderer/stores/graphStore";
import {
  ensureGraphConfig,
  type GraphElementType,
  type GraphLayerKind,
} from "@shared/schemas/types";

function ToolButton({
  label,
  active,
  disabled,
  pressed,
  selected,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  pressed?: boolean;
  /** Property-panel focus (activeLayer) — distinct from “layer enabled”. */
  selected?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`toolbar-btn ${active ? "active" : ""} ${selected ? "selected" : ""}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed ?? active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Toolbar() {
  const actions = useAppActions();
  const raw = useGraphStore((s) => s.config);
  const config = ensureGraphConfig(raw);
  const elementType = config.elementType;
  const activeLayer = config.activeLayer;
  const enabled = new Set(config.layers.filter((l) => l.enabled).map((l) => l.kind));

  const setType = (t: GraphElementType) => actions.setElementType(t);
  const toggleLayer = (kind: GraphLayerKind, e: React.MouseEvent) => {
    actions.toggleLayer(kind, e.shiftKey);
  };

  return (
    <div className="toolbar-stack" role="toolbar" aria-label="Main toolbar">
      <div className="toolbar-row">
        <ToolButton label="New Project" onClick={() => actions.newProject()}>
          <Plus size={15} />
        </ToolButton>
        <ToolButton label="Open Data" onClick={() => void actions.openData()}>
          <FolderOpen size={15} />
        </ToolButton>
        <ToolButton label="Save Project" onClick={() => void actions.saveProject()}>
          <Save size={15} />
        </ToolButton>
        <span className="toolbar-sep" />
        <ToolButton
          label="Undo"
          onClick={() => actions.undo()}
          disabled={!actions.canUndo}
        >
          <Undo2 size={15} />
        </ToolButton>
        <ToolButton
          label="Redo"
          onClick={() => actions.redo()}
          disabled={!actions.canRedo}
        >
          <Redo2 size={15} />
        </ToolButton>
        <span className="toolbar-sep" />
        <ToolButton label="Data Table" disabled>
          <Table2 size={15} />
        </ToolButton>
        <ToolButton label="Filter" disabled>
          <Filter size={15} />
        </ToolButton>
        <ToolButton label="Select" disabled>
          <Hand size={15} />
        </ToolButton>
        <ToolButton label="Pan" disabled>
          <MoveIcon />
        </ToolButton>
        <ToolButton label="Zoom In" onClick={() => actions.zoomIn()}>
          <Maximize2 size={15} />
        </ToolButton>
        <ToolButton label="Zoom Out" onClick={() => actions.zoomOut()}>
          <Minimize2 size={15} />
        </ToolButton>
      </div>
      <div className="toolbar-row">
        <ToolButton
          label="Points (Shift+click = only this)"
          active={enabled.has("points")}
          selected={activeLayer === "points"}
          pressed={enabled.has("points")}
          onClick={(e) => toggleLayer("points", e)}
        >
          <ScatterChart size={15} />
        </ToolButton>
        <ToolButton
          label="Smoother: Shows a smooth curve through the data. Best for continuous X and Y with an unknown relationship. (Shift+click = only this)"
          active={enabled.has("smoother")}
          selected={activeLayer === "smoother"}
          pressed={enabled.has("smoother")}
          onClick={(e) => toggleLayer("smoother", e)}
        >
          <Waves size={15} />
        </ToolButton>
        <ToolButton
          label="Line Of Fit: Shows a linear regression with confidence intervals for continuous X and Y. Fits means for categorical X. (Shift+click = only this)"
          active={enabled.has("lineOfFit")}
          selected={activeLayer === "lineOfFit"}
          pressed={enabled.has("lineOfFit")}
          onClick={(e) => toggleLayer("lineOfFit", e)}
        >
          <TrendingUp size={15} />
        </ToolButton>
        <ToolButton
          label="Line (Shift+click = only this)"
          active={enabled.has("line")}
          selected={activeLayer === "line"}
          pressed={enabled.has("line")}
          onClick={(e) => toggleLayer("line", e)}
        >
          <LineChart size={15} />
        </ToolButton>
        <span className="toolbar-sep" />
        <ToolButton label="Bar" active={elementType === "bar"} onClick={() => setType("bar")}>
          <BarChart3 size={15} />
        </ToolButton>
        <ToolButton
          label="Area"
          active={elementType === "area"}
          onClick={() => setType("area")}
        >
          <AreaChart size={15} />
        </ToolButton>
        <ToolButton
          label="Histogram"
          active={elementType === "histogram"}
          onClick={() => setType("histogram")}
        >
          <Activity size={15} />
        </ToolButton>
        <ToolButton
          label="Box Plot"
          active={elementType === "boxplot"}
          onClick={() => setType("boxplot")}
        >
          <Box size={15} />
        </ToolButton>
        <ToolButton
          label="Violin"
          active={elementType === "violin"}
          onClick={() => setType("violin")}
        >
          <Circle size={15} />
        </ToolButton>
        <ToolButton
          label="Heatmap"
          active={elementType === "heatmap"}
          onClick={() => setType("heatmap")}
        >
          <Grid3x3 size={15} />
        </ToolButton>
        <ToolButton label="Pie" active={elementType === "pie"} onClick={() => setType("pie")}>
          <PieChart size={15} />
        </ToolButton>
        <ToolButton label="Mosaic" active={elementType === "mosaic"} disabled>
          <Square size={15} />
        </ToolButton>
      </div>
    </div>
  );
}

function MoveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
    </svg>
  );
}
