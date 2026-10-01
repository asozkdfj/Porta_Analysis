import type { AxisConfig, AxisScaleConfig } from "@shared/schemas/axis";
import { validateAxisScale } from "@renderer/utils/axis/validateAxisScale";

interface AxisTickPanelProps {
  axis: AxisConfig;
  onChange: (scale: Partial<AxisScaleConfig>) => void;
}

export function AxisTickPanel({ axis, onChange }: AxisTickPanelProps) {
  const scale = axis.scale;
  const validation = validateAxisScale(scale, axis.id);
  const tickError = validation.errors.find((e) => e.field === "tickIncrement");
  const tickWarn = validation.warnings.find((e) => e.field === "tickIncrement");
  const auto = scale.tickMode === "auto";

  return (
    <section className="axis-panel axis-tick-panel">
      <h3 className="axis-panel-title">Tick Increment</h3>
      <label className="axis-check">
        <input
          type="radio"
          name={`tick-mode-${axis.id}`}
          checked={auto}
          onChange={() => onChange({ tickMode: "auto" })}
        />
        Automatic Tick Increment
      </label>
      <label className="axis-check">
        <input
          type="radio"
          name={`tick-mode-${axis.id}`}
          checked={!auto}
          onChange={() => onChange({ tickMode: "manual" })}
        />
        Manual Tick Increment
      </label>
      <div className="axis-field">
        <span>Increment</span>
        <input
          type="number"
          className={tickError ? "axis-input-error" : undefined}
          disabled={auto}
          min={0}
          step="any"
          value={scale.tickIncrement ?? ""}
          onChange={(e) =>
            onChange({
              tickIncrement:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </div>
      {tickError && <p className="axis-error-text">{tickError.message}</p>}
      {tickWarn && <p className="axis-warn-text">{tickWarn.message}</p>}
      <div className="axis-field">
        <span>Minor Tick Count</span>
        <input
          type="number"
          min={0}
          max={10}
          value={scale.minorTickCount}
          onChange={(e) =>
            onChange({ minorTickCount: Math.max(0, Number(e.target.value) || 0) })
          }
        />
      </div>
    </section>
  );
}
