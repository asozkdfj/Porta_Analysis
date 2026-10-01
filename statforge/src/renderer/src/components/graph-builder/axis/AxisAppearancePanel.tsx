import type { RefObject } from "react";
import type {
  AxisAppearanceConfig,
  AxisConfig,
  AxisLabelOrientation,
  AxisNumberFormat,
} from "@shared/schemas/axis";

interface AxisAppearancePanelProps {
  axis: AxisConfig;
  onChange: (appearance: Partial<AxisAppearanceConfig>) => void;
  titleInputRef?: RefObject<HTMLInputElement | null>;
}

export function AxisAppearancePanel({
  axis,
  onChange,
  titleInputRef,
}: AxisAppearancePanelProps) {
  const a = axis.appearance;

  return (
    <section className="axis-panel axis-appearance-panel">
      <h3 className="axis-panel-title">Axis Labels</h3>
      <div className="axis-field">
        <span>Axis Title</span>
        <input
          ref={titleInputRef}
          type="text"
          value={a.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <label className="axis-check">
        <input
          type="checkbox"
          checked={a.showTitle}
          onChange={(e) => onChange({ showTitle: e.target.checked })}
        />
        Show Axis Title
      </label>
      <label className="axis-check">
        <input
          type="checkbox"
          checked={a.showTickMarks}
          onChange={(e) => onChange({ showTickMarks: e.target.checked })}
        />
        Show Tick Marks
      </label>
      <label className="axis-check">
        <input
          type="checkbox"
          checked={a.showTickLabels}
          onChange={(e) => onChange({ showTickLabels: e.target.checked })}
        />
        Show Tick Labels
      </label>
      <label className="axis-check">
        <input
          type="checkbox"
          checked={a.showGrid}
          onChange={(e) => onChange({ showGrid: e.target.checked })}
        />
        Show Grid
      </label>
      <label className="axis-check">
        <input
          type="checkbox"
          checked={a.tickMarksInside}
          onChange={(e) => onChange({ tickMarksInside: e.target.checked })}
        />
        Tick Marks Inside Graph
      </label>
      <div className="axis-field">
        <span>Label Orientation</span>
        <select
          value={a.labelOrientation}
          onChange={(e) =>
            onChange({
              labelOrientation: e.target.value as AxisLabelOrientation,
            })
          }
        >
          <option value="auto">Automatic</option>
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertical</option>
          <option value="angled45">45°</option>
          <option value="angledMinus45">-45°</option>
        </select>
      </div>
      <div className="axis-field">
        <span>Wrap Lines</span>
        <input
          type="number"
          min={1}
          max={5}
          value={a.labelWrapLines}
          onChange={(e) =>
            onChange({ labelWrapLines: Math.max(1, Number(e.target.value) || 1) })
          }
        />
      </div>
      <div className="axis-field">
        <span>Number Format</span>
        <select
          value={a.numberFormat}
          onChange={(e) =>
            onChange({ numberFormat: e.target.value as AxisNumberFormat })
          }
        >
          <option value="auto">Auto</option>
          <option value="integer">Integer</option>
          <option value="decimal">Decimal</option>
          <option value="scientific">Scientific</option>
          <option value="percentage">Percentage</option>
          <option value="date">Date</option>
          <option value="datetime">DateTime</option>
        </select>
      </div>
      <div className="axis-field">
        <span>Decimal Places</span>
        <input
          type="number"
          min={0}
          max={12}
          value={a.decimalPlaces ?? ""}
          placeholder="auto"
          onChange={(e) =>
            onChange({
              decimalPlaces:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </div>
      <div className="axis-field">
        <span>Prefix</span>
        <input
          type="text"
          value={a.prefix}
          onChange={(e) => onChange({ prefix: e.target.value })}
        />
      </div>
      <div className="axis-field">
        <span>Suffix</span>
        <input
          type="text"
          value={a.suffix}
          onChange={(e) => onChange({ suffix: e.target.value })}
        />
      </div>
    </section>
  );
}
