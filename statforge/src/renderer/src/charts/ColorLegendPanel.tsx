import type { Dataset, GraphConfig } from "@shared/schemas/types";
import { ensureGraphConfig } from "@shared/schemas/types";
import { createColorScale, DISCRETE_PALETTE } from "./encoding/colorScale";
import { createOverlayGroups } from "./encoding/overlay";

function shortLeaf(name: string, max = 28): string {
  const leaf = name.split("::").pop() ?? name;
  return leaf.length <= max ? leaf : `${leaf.slice(0, max - 1)}…`;
}

type LegendItem = { key: string; color: string };

function legendFromColor(dataset: Dataset, config: GraphConfig): {
  title: string;
  items: LegendItem[];
} | null {
  const colorRef = config.roles.color[0];
  if (!colorRef) return null;
  const colorCol = dataset.columns.find((c) => c.id === colorRef.columnId);
  if (!colorCol) return null;
  const { scale } = createColorScale(dataset, colorCol);
  if (!scale || scale.kind !== "discrete") return null;
  // Use scale.order exactly (already natural-sorted when colors were assigned)
  return {
    title: colorCol.name,
    items: scale.order.map((key) => ({
      key,
      color: scale.colors.get(key) ?? DISCRETE_PALETTE[0],
    })),
  };
}

function legendFromOverlay(dataset: Dataset, config: GraphConfig): {
  title: string;
  items: LegendItem[];
} | null {
  const overlayRef = config.roles.overlay[0];
  if (!overlayRef) return null;
  const overlayCol = dataset.columns.find((c) => c.id === overlayRef.columnId);
  if (!overlayCol) return null;
  const { groups } = createOverlayGroups(dataset, overlayCol, {
    binCount: config.options.overlayBinCount,
    showMissing: config.options.overlayShowMissing,
  });
  const usable = groups.filter((g) => g.key !== "__all__");
  if (usable.length === 0) return null;
  return {
    title: overlayCol.name,
    items: usable.map((g, i) => ({
      key: g.label,
      color: DISCRETE_PALETTE[i % DISCRETE_PALETTE.length],
    })),
  };
}

/** Resolve a right-side series legend (Color preferred, else Overlay). */
export function resolveSeriesLegend(
  dataset: Dataset,
  config: GraphConfig
): { title: string; items: LegendItem[] } | null {
  const cfg = ensureGraphConfig(config);
  if (!cfg.options.showLegend) return null;
  return legendFromColor(dataset, cfg) ?? legendFromOverlay(dataset, cfg);
}

export function hasExternalSeriesLegend(
  dataset: Dataset,
  config: GraphConfig
): boolean {
  return resolveSeriesLegend(dataset, config) != null;
}

/** Right-side series legend — keeps stacked plot widths identical. */
export function ColorLegendPanel({
  dataset,
  config,
}: {
  dataset: Dataset;
  config: GraphConfig;
}) {
  const legend = resolveSeriesLegend(dataset, config);
  if (!legend || legend.items.length === 0) return null;

  return (
    <aside className="color-legend-panel" aria-label={`${legend.title} legend`}>
      <div className="color-legend-title" title={legend.title}>
        {shortLeaf(legend.title, 22)}
      </div>
      <div className="color-legend-subtitle">Color legend</div>
      <div className="color-legend-list">
        {legend.items.map((item) => (
          <div key={item.key} className="color-legend-item" title={item.key}>
            <span
              className="color-legend-swatch"
              style={{ background: item.color }}
              aria-hidden
            />
            <span className="color-legend-label">{item.key}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

/** @deprecated use hasExternalSeriesLegend */
export function hasDiscreteColorLegend(
  dataset: Dataset,
  config: GraphConfig
): boolean {
  return hasExternalSeriesLegend(dataset, config);
}
