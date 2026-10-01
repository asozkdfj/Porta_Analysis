import type { AxisConfig } from "@shared/schemas/axis";
import { formatAxisValue } from "@renderer/utils/axis/formatAxisLabel";
import { calculateTickValues } from "@renderer/utils/axis/calculateTicks";
import { parseAxisBound } from "@renderer/utils/axis/validateAxisScale";
import { validateAxisScale } from "@renderer/utils/axis/validateAxisScale";

interface AxisPreviewProps {
  axis: AxisConfig;
}

export function AxisPreview({ axis }: AxisPreviewProps) {
  const validation = validateAxisScale(axis.scale, axis.id);
  if (!validation.valid) {
    return (
      <section className="axis-panel axis-preview-panel axis-preview-error">
        <h3 className="axis-panel-title">Preview</h3>
        <p>설정을 확인하세요.</p>
        <ul>
          {validation.errors.map((e) => (
            <li key={e.field + e.message}>{e.message}</li>
          ))}
        </ul>
      </section>
    );
  }

  const min =
    axis.scale.rangeMode === "manual"
      ? parseAxisBound(axis.scale.minimum) ?? 0
      : 0;
  const max =
    axis.scale.rangeMode === "manual"
      ? parseAxisBound(axis.scale.maximum) ?? 100
      : 100;
  const lo = axis.scale.reverse ? max : min;
  const hi = axis.scale.reverse ? min : max;
  const displayMin = Math.min(lo, hi);
  const displayMax = Math.max(lo, hi);

  const ticks =
    axis.scale.tickMode === "manual" && axis.scale.tickIncrement
      ? calculateTickValues(Math.min(min, max), Math.max(min, max), axis.scale.tickIncrement).slice(
          0,
          12
        )
      : [min, (min + max) / 2, max];

  const isY = axis.id === "y";

  return (
    <section className="axis-panel axis-preview-panel">
      <h3 className="axis-panel-title">Preview</h3>
      <div className={`axis-preview-canvas ${isY ? "is-y" : "is-x"}`}>
        <div className="axis-preview-plot">
          {axis.referenceLines.map((line) => {
            if (!line.visible) return null;
            if (line.type === "range") {
              const a = parseAxisBound(line.startValue ?? null);
              const b = parseAxisBound(line.endValue ?? null);
              if (a == null || b == null) return null;
              const p1 = ((a - displayMin) / (displayMax - displayMin || 1)) * 100;
              const p2 = ((b - displayMin) / (displayMax - displayMin || 1)) * 100;
              const style = isY
                ? {
                    bottom: `${Math.min(p1, p2)}%`,
                    height: `${Math.abs(p2 - p1)}%`,
                    left: 0,
                    right: 0,
                    background: line.fillColor ?? line.lineColor,
                    opacity: line.fillOpacity ?? 0.15,
                  }
                : {
                    left: `${Math.min(p1, p2)}%`,
                    width: `${Math.abs(p2 - p1)}%`,
                    top: 0,
                    bottom: 0,
                    background: line.fillColor ?? line.lineColor,
                    opacity: line.fillOpacity ?? 0.15,
                  };
              return (
                <div key={line.id} className="axis-preview-range" style={style} />
              );
            }
            const v = parseAxisBound(line.value ?? null);
            if (v == null) return null;
            const pct = ((v - displayMin) / (displayMax - displayMin || 1)) * 100;
            const style = isY
              ? {
                  bottom: `${pct}%`,
                  left: 0,
                  right: 0,
                  borderTop: `${line.lineWidth}px ${line.lineStyle === "solid" ? "solid" : "dashed"} ${line.lineColor}`,
                }
              : {
                  left: `${pct}%`,
                  top: 0,
                  bottom: 0,
                  borderLeft: `${line.lineWidth}px ${line.lineStyle === "solid" ? "solid" : "dashed"} ${line.lineColor}`,
                };
            return (
              <div key={line.id} className="axis-preview-line" style={style}>
                {line.labelVisible && (
                  <span style={{ color: line.labelColor, fontSize: line.labelFontSize }}>
                    {line.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="axis-preview-ticks">
          {(axis.scale.reverse ? [...ticks].reverse() : ticks).map((t) => (
            <span key={String(t)}>
              {formatAxisValue(t, axis.appearance)}
            </span>
          ))}
        </div>
      </div>
      <p className="axis-muted">
        {axis.scale.rangeMode === "auto" ? "Auto range" : `${min} → ${max}`}
        {axis.scale.reverse ? " (reversed)" : ""}
      </p>
    </section>
  );
}
