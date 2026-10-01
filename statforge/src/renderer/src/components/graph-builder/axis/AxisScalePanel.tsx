import type { AxisConfig, AxisScaleConfig } from "@shared/schemas/axis";
import { validateAxisScale } from "@renderer/utils/axis/validateAxisScale";

interface AxisScalePanelProps {
  axis: AxisConfig;
  onChange: (scale: Partial<AxisScaleConfig>) => void;
}

export function AxisScalePanel({ axis, onChange }: AxisScalePanelProps) {
  const scale = axis.scale;
  const validation = validateAxisScale(scale, axis.id);
  const auto = scale.rangeMode === "auto";
  const minError = validation.errors.find((e) => e.field === "minimum");
  const maxError = validation.errors.find((e) => e.field === "maximum");

  return (
    <section className="axis-panel axis-scale-panel">
      <h3 className="axis-panel-title">Scale</h3>
      <label className="axis-check">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) =>
            onChange({ rangeMode: e.target.checked ? "auto" : "manual" })
          }
        />
        Automatic Range
      </label>
      <div className="axis-field">
        <span>Minimum</span>
        <input
          type="number"
          className={minError ? "axis-input-error" : undefined}
          disabled={auto}
          value={scale.minimum ?? ""}
          onChange={(e) =>
            onChange({
              minimum: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </div>
      {minError && <p className="axis-error-text">{minError.message}</p>}
      <div className="axis-field">
        <span>Maximum</span>
        <input
          type="number"
          className={maxError ? "axis-input-error" : undefined}
          disabled={auto}
          value={scale.maximum ?? ""}
          onChange={(e) =>
            onChange({
              maximum: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </div>
      {maxError && <p className="axis-error-text">{maxError.message}</p>}
      <label className="axis-check">
        <input
          type="checkbox"
          checked={scale.reverse}
          onChange={(e) => onChange({ reverse: e.target.checked })}
        />
        Reverse Order
      </label>
      <div className="axis-field">
        <span>Scale Type</span>
        <select
          value={scale.scaleType}
          onChange={(e) =>
            onChange({
              scaleType: e.target.value as AxisScaleConfig["scaleType"],
            })
          }
        >
          <option value="linear">Linear</option>
          <option value="log">Log</option>
          <option value="time">Time</option>
          <option value="category">Category</option>
        </select>
      </div>
      {scale.scaleType === "log" && (
        <div className="axis-field">
          <span>Log Base</span>
          <select
            value={String(scale.logBase)}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                logBase: v === "e" ? Math.E : (Number(v) as 10 | 2),
              });
            }}
          >
            <option value="10">10</option>
            <option value="2">2</option>
            <option value="e">e</option>
          </select>
        </div>
      )}
      <label className="axis-check">
        <input
          type="checkbox"
          checked={scale.includeZero}
          onChange={(e) => onChange({ includeZero: e.target.checked })}
        />
        Include Zero
      </label>
      <label className="axis-check">
        <input
          type="checkbox"
          checked={scale.niceScale}
          onChange={(e) => onChange({ niceScale: e.target.checked })}
        />
        Nice Scale
      </label>
      <label className="axis-check">
        <input
          type="checkbox"
          checked={scale.includeReferenceLinesInAutoRange}
          onChange={(e) =>
            onChange({ includeReferenceLinesInAutoRange: e.target.checked })
          }
        />
        Include Reference Lines in Auto Range
      </label>
    </section>
  );
}
