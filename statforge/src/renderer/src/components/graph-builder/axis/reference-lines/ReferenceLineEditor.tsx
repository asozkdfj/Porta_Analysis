import type {
  ReferenceLabelPosition,
  ReferenceLine,
  ReferenceLineStyle,
} from "@shared/schemas/axis";
import { validateReferenceLine } from "@renderer/utils/reference-lines/validateReferenceLine";

interface ReferenceLineEditorProps {
  draft: Partial<ReferenceLine>;
  onChange: (patch: Partial<ReferenceLine>) => void;
  onAdd: () => void;
  onUpdate: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  hasSelection: boolean;
  onPreset: (preset: "LSL" | "Target" | "USL" | "Custom") => void;
}

export function ReferenceLineEditor({
  draft,
  onChange,
  onAdd,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  hasSelection,
  onPreset,
}: ReferenceLineEditorProps) {
  const validation = validateReferenceLine(draft, "y");
  const canCommit = validation.valid;

  return (
    <div className="ref-line-editor">
      <div className="ref-presets">
        <span>Preset</span>
        {(["LSL", "Target", "USL", "Custom"] as const).map((p) => (
          <button key={p} type="button" onClick={() => onPreset(p)}>
            {p}
          </button>
        ))}
      </div>
      <div className="axis-field">
        <span>Type</span>
        <select
          value={draft.type ?? "line"}
          onChange={(e) =>
            onChange({ type: e.target.value as "line" | "range" })
          }
        >
          <option value="line">Line</option>
          <option value="range">Range</option>
        </select>
      </div>
      {(draft.type ?? "line") === "line" ? (
        <div className="axis-field">
          <span>Value</span>
          <input
            type="number"
            value={draft.value ?? ""}
            onChange={(e) =>
              onChange({
                value: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
        </div>
      ) : (
        <>
          <div className="axis-field">
            <span>Start Value</span>
            <input
              type="number"
              value={draft.startValue ?? ""}
              onChange={(e) =>
                onChange({
                  startValue:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="axis-field">
            <span>End Value</span>
            <input
              type="number"
              value={draft.endValue ?? ""}
              onChange={(e) =>
                onChange({
                  endValue:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
        </>
      )}
      <div className="axis-field">
        <span>Label</span>
        <input
          type="text"
          value={draft.label ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>
      <div className="axis-field">
        <span>Line Color</span>
        <input
          type="color"
          value={draft.lineColor ?? "#c0392b"}
          onChange={(e) => onChange({ lineColor: e.target.value })}
        />
      </div>
      <div className="axis-field">
        <span>Line Width</span>
        <input
          type="number"
          min={0.5}
          step={0.5}
          value={draft.lineWidth ?? 1.5}
          onChange={(e) => onChange({ lineWidth: Number(e.target.value) })}
        />
      </div>
      <div className="axis-field">
        <span>Line Style</span>
        <select
          value={draft.lineStyle ?? "dashed"}
          onChange={(e) =>
            onChange({ lineStyle: e.target.value as ReferenceLineStyle })
          }
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
          <option value="dashDot">Dash Dot</option>
        </select>
      </div>
      <div className="axis-field">
        <span>Opacity</span>
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={draft.opacity ?? 0.9}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
        />
      </div>
      <label className="axis-check">
        <input
          type="checkbox"
          checked={draft.labelVisible !== false}
          onChange={(e) => onChange({ labelVisible: e.target.checked })}
        />
        Label Visible
      </label>
      <div className="axis-field">
        <span>Label Color</span>
        <input
          type="color"
          value={draft.labelColor ?? "#333333"}
          onChange={(e) => onChange({ labelColor: e.target.value })}
        />
      </div>
      <div className="axis-field">
        <span>Label Font Size</span>
        <input
          type="number"
          min={8}
          max={24}
          value={draft.labelFontSize ?? 11}
          onChange={(e) => onChange({ labelFontSize: Number(e.target.value) })}
        />
      </div>
      <div className="axis-field">
        <span>Label Weight</span>
        <select
          value={draft.labelFontWeight ?? "normal"}
          onChange={(e) =>
            onChange({
              labelFontWeight: e.target.value as "normal" | "bold",
            })
          }
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
        </select>
      </div>
      <div className="axis-field">
        <span>Label Position</span>
        <select
          value={draft.labelPosition ?? "insideEnd"}
          onChange={(e) =>
            onChange({
              labelPosition: e.target.value as ReferenceLabelPosition,
            })
          }
        >
          <option value="insideStart">Inside Start</option>
          <option value="insideEnd">Inside End</option>
          <option value="outsideStart">Outside Start</option>
          <option value="outsideEnd">Outside End</option>
          <option value="center">Center</option>
        </select>
      </div>
      {(draft.type ?? "line") === "range" && (
        <>
          <div className="axis-field">
            <span>Fill Color</span>
            <input
              type="color"
              value={draft.fillColor ?? draft.lineColor ?? "#c0392b"}
              onChange={(e) => onChange({ fillColor: e.target.value })}
            />
          </div>
          <div className="axis-field">
            <span>Fill Opacity</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={draft.fillOpacity ?? 0.12}
              onChange={(e) => onChange({ fillOpacity: Number(e.target.value) })}
            />
          </div>
        </>
      )}
      {!validation.valid && (
        <ul className="axis-error-list">
          {validation.errors.map((e) => (
            <li key={e.field}>{e.message}</li>
          ))}
        </ul>
      )}
      <div className="ref-line-actions">
        <button type="button" disabled={!canCommit} onClick={onAdd}>
          Add
        </button>
        <button
          type="button"
          disabled={!hasSelection || !canCommit}
          onClick={onUpdate}
        >
          Update
        </button>
        <button type="button" disabled={!hasSelection} onClick={onRemove}>
          Remove
        </button>
        <button type="button" disabled={!hasSelection} onClick={onDuplicate}>
          Duplicate
        </button>
        <button type="button" disabled={!hasSelection} onClick={onMoveUp}>
          Move Up
        </button>
        <button type="button" disabled={!hasSelection} onClick={onMoveDown}>
          Move Down
        </button>
      </div>
    </div>
  );
}
