import { useEffect, useRef, useState } from "react";
import type { AxisConfig, AxisId } from "@shared/schemas/axis";
import {
  ensureAxisConfig,
  resetAxisConfig,
  resetAxisScale,
} from "@shared/schemas/axis";
import { ensureGraphConfig } from "@shared/schemas/types";
import { useGraphStore } from "@renderer/stores/graphStore";
import { useHistoryStore } from "@renderer/stores/historyStore";
import { useAxisUiStore } from "@renderer/stores/axisUiStore";
import { validateAxisScale } from "@renderer/utils/axis/validateAxisScale";
import { AxisScalePanel } from "./AxisScalePanel";
import { AxisTickPanel } from "./AxisTickPanel";
import { AxisAppearancePanel } from "./AxisAppearancePanel";
import { AxisPreview } from "./AxisPreview";
import { ReferenceLinePanel } from "./reference-lines/ReferenceLinePanel";

export function AxisSettingsDialog() {
  const open = useAxisUiStore((s) => s.settingsOpen);
  const axisId = useAxisUiStore((s) => s.settingsAxisId);
  const focusTitle = useAxisUiStore((s) => s.focusTitle);
  const closeSettings = useAxisUiStore((s) => s.closeSettings);

  const config = useGraphStore((s) => s.config);
  const setAxis = useGraphStore((s) => s.setAxis);
  const pushHistory = useHistoryStore((s) => s.push);

  const [draft, setDraft] = useState<AxisConfig | null>(null);
  const [baseline, setBaseline] = useState<AxisConfig | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !axisId) {
      setDraft(null);
      setBaseline(null);
      return;
    }
    const cfg = ensureGraphConfig(config);
    const axis = structuredClone(cfg.axes[axisId]);
    setDraft(axis);
    setBaseline(structuredClone(axis));
  }, [open, axisId]); // eslint-disable-line react-hooks/exhaustive-deps -- open snapshot only

  useEffect(() => {
    if (open && focusTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [open, focusTitle, draft]);

  if (!open || !axisId || !draft || !baseline) return null;

  const validation = validateAxisScale(draft.scale, axisId);
  const title = axisId === "x" ? "X Axis Settings" : "Y Axis Settings";

  const commit = (close: boolean) => {
    if (!validation.valid) return;
    const next = ensureAxisConfig(axisId, draft);
    setAxis(axisId, next);
    pushHistory({
      graph: structuredClone(useGraphStore.getState().config),
      label: `${axisId.toUpperCase()} axis settings`,
    });
    if (close) closeSettings();
  };

  const cancel = () => {
    setAxis(axisId, baseline);
    closeSettings();
  };

  const resetDialog = () => {
    setDraft(resetAxisConfig(draft, { clearReferenceLines: false }));
  };

  return (
    <div className="axis-dialog-backdrop" role="presentation" onMouseDown={cancel}>
      <div
        className="axis-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="axis-dialog-header">
          <h2>{title}</h2>
          <button type="button" className="axis-dialog-close" onClick={cancel}>
            ×
          </button>
        </header>
        <div className="axis-dialog-body">
          <div className="axis-dialog-col">
            <AxisScalePanel
              axis={draft}
              onChange={(scale) =>
                setDraft({ ...draft, scale: { ...draft.scale, ...scale } })
              }
            />
            <AxisTickPanel
              axis={draft}
              onChange={(scale) =>
                setDraft({ ...draft, scale: { ...draft.scale, ...scale } })
              }
            />
          </div>
          <div className="axis-dialog-col">
            <AxisAppearancePanel
              axis={draft}
              titleInputRef={titleRef}
              onChange={(appearance) =>
                setDraft({
                  ...draft,
                  appearance: { ...draft.appearance, ...appearance },
                })
              }
            />
            <ReferenceLinePanel
              axis={draft}
              onChange={(referenceLines) =>
                setDraft({ ...draft, referenceLines })
              }
              onExpandScale={(minimum, maximum) =>
                setDraft({
                  ...draft,
                  scale: {
                    ...draft.scale,
                    rangeMode: "manual",
                    minimum,
                    maximum,
                  },
                })
              }
            />
          </div>
          <div className="axis-dialog-col axis-dialog-preview-col">
            <AxisPreview axis={draft} />
          </div>
        </div>
        <footer className="axis-dialog-footer">
          <button type="button" onClick={resetDialog}>
            Reset
          </button>
          <div className="axis-dialog-footer-right">
            <button type="button" onClick={cancel}>
              Cancel
            </button>
            <button
              type="button"
              disabled={!validation.valid}
              onClick={() => commit(false)}
            >
              Apply
            </button>
            <button
              type="button"
              className="axis-btn-primary"
              disabled={!validation.valid}
              onClick={() => commit(true)}
            >
              OK
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Helper for context-menu Reset Scale / Reset Axis without opening dialog. */
export function commitAxisChange(axisId: AxisId, axis: AxisConfig, label: string) {
  useGraphStore.getState().setAxis(axisId, ensureAxisConfig(axisId, axis));
  useHistoryStore.getState().push({
    graph: structuredClone(useGraphStore.getState().config),
    label,
  });
}

export { resetAxisScale, resetAxisConfig };
