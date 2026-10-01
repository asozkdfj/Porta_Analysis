import type { ReferenceLine } from "@shared/schemas/axis";
import { effectiveManualRange } from "@renderer/utils/axis/buildAxisOptions";
import type { AxisScaleConfig } from "@shared/schemas/axis";
import { isReferenceLineInRange } from "@renderer/utils/reference-lines/validateReferenceLine";

interface ReferenceLineListProps {
  lines: ReferenceLine[];
  selectedId: string | null;
  scale: AxisScaleConfig;
  onSelect: (id: string) => void;
  onExpandToInclude: (line: ReferenceLine) => void;
}

function describe(line: ReferenceLine): string {
  if (line.type === "range") {
    return `${line.label} — ${line.startValue} to ${line.endValue}`;
  }
  return `${line.label} — ${line.value}`;
}

export function ReferenceLineList({
  lines,
  selectedId,
  scale,
  onSelect,
  onExpandToInclude,
}: ReferenceLineListProps) {
  const range = effectiveManualRange(scale);

  if (lines.length === 0) {
    return <p className="axis-muted">No reference lines yet.</p>;
  }

  return (
    <ul className="ref-line-list">
      {lines.map((line) => {
        const out = range ? !isReferenceLineInRange(line, range) : false;
        return (
          <li
            key={line.id}
            className={`ref-line-list-item ${selectedId === line.id ? "is-selected" : ""}`}
          >
            <button type="button" onClick={() => onSelect(line.id)}>
              <span
                className="ref-line-swatch"
                style={{ background: line.lineColor }}
              />
              <span className="ref-line-desc">{describe(line)}</span>
              {out && <span className="ref-out-of-range">Out of range</span>}
            </button>
            {out && (
              <button
                type="button"
                className="ref-expand-btn"
                onClick={() => onExpandToInclude(line)}
              >
                Expand Axis to Include
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
