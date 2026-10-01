import { useMemo, useState } from "react";
import type { AxisConfig, ReferenceLine } from "@shared/schemas/axis";
import {
  createDefaultReferenceLine,
} from "@shared/schemas/axis";
import { parseAxisBound } from "@renderer/utils/axis/validateAxisScale";
import { ReferenceLineEditor } from "./ReferenceLineEditor";
import { ReferenceLineList } from "./ReferenceLineList";

interface ReferenceLinePanelProps {
  axis: AxisConfig;
  onChange: (lines: ReferenceLine[]) => void;
  onExpandScale: (minimum: number, maximum: number) => void;
}

function emptyDraft(): Partial<ReferenceLine> {
  return {
    type: "line",
    value: undefined,
    label: "",
    lineColor: "#c0392b",
    lineWidth: 1.5,
    lineStyle: "dashed",
    opacity: 0.9,
    labelVisible: true,
    labelColor: "#333333",
    labelFontSize: 11,
    labelFontWeight: "normal",
    labelPosition: "insideEnd",
    labelAxisSide: "same",
    fillColor: "#c0392b",
    fillOpacity: 0.12,
    visible: true,
    preset: "Custom",
  };
}

export function ReferenceLinePanel({
  axis,
  onChange,
  onExpandScale,
}: ReferenceLinePanelProps) {
  const lines = axis.referenceLines;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ReferenceLine>>(emptyDraft);

  const selected = useMemo(
    () => lines.find((l) => l.id === selectedId) ?? null,
    [lines, selectedId]
  );

  const selectLine = (id: string) => {
    setSelectedId(id);
    const line = lines.find((l) => l.id === id);
    if (line) setDraft({ ...line });
  };

  const applyPreset = (preset: "LSL" | "Target" | "USL" | "Custom") => {
    const colors: Record<string, string> = {
      LSL: "#e67e22",
      Target: "#2980b9",
      USL: "#c0392b",
      Custom: "#c0392b",
    };
    setDraft((d) => ({
      ...d,
      type: "line",
      label: preset === "Custom" ? d.label || "Reference" : preset,
      preset,
      lineStyle: preset === "Target" ? "solid" : "dashed",
      lineColor: colors[preset],
      labelPosition: "insideEnd",
    }));
  };

  const handleAdd = () => {
    const line = createDefaultReferenceLine(draft);
    onChange([...lines, line]);
    setSelectedId(line.id);
    setDraft({ ...line });
  };

  const handleUpdate = () => {
    if (!selectedId) return;
    onChange(
      lines.map((l) =>
        l.id === selectedId ? createDefaultReferenceLine({ ...draft, id: selectedId }) : l
      )
    );
  };

  const handleRemove = () => {
    if (!selectedId) return;
    onChange(lines.filter((l) => l.id !== selectedId));
    setSelectedId(null);
    setDraft(emptyDraft());
  };

  const handleDuplicate = () => {
    if (!selected) return;
    const copy = createDefaultReferenceLine({
      ...selected,
      id: undefined,
      label: `${selected.label} copy`,
    });
    const idx = lines.findIndex((l) => l.id === selectedId);
    const next = [...lines];
    next.splice(idx + 1, 0, copy);
    onChange(next);
    setSelectedId(copy.id);
    setDraft({ ...copy });
  };

  const move = (dir: -1 | 1) => {
    if (!selectedId) return;
    const idx = lines.findIndex((l) => l.id === selectedId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= lines.length) return;
    const next = [...lines];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  const expandToInclude = (line: ReferenceLine) => {
    const values: number[] = [];
    if (line.type === "line") {
      const v = parseAxisBound(line.value ?? null);
      if (v != null) values.push(v);
    } else {
      const a = parseAxisBound(line.startValue ?? null);
      const b = parseAxisBound(line.endValue ?? null);
      if (a != null) values.push(a);
      if (b != null) values.push(b);
    }
    if (values.length === 0) return;
    const curMin = parseAxisBound(axis.scale.minimum) ?? Math.min(...values);
    const curMax = parseAxisBound(axis.scale.maximum) ?? Math.max(...values);
    onExpandScale(Math.min(curMin, ...values), Math.max(curMax, ...values));
  };

  return (
    <section className="axis-panel axis-ref-panel">
      <h3 className="axis-panel-title">Reference Lines</h3>
      <ReferenceLineEditor
        draft={draft}
        onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
        onDuplicate={handleDuplicate}
        onMoveUp={() => move(-1)}
        onMoveDown={() => move(1)}
        hasSelection={Boolean(selectedId)}
        onPreset={applyPreset}
      />
      <ReferenceLineList
        lines={lines}
        selectedId={selectedId}
        scale={axis.scale}
        onSelect={selectLine}
        onExpandToInclude={expandToInclude}
      />
    </section>
  );
}
