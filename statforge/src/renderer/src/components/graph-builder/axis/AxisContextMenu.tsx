import { ensureGraphConfig } from "@shared/schemas/types";
import type { AxisId } from "@shared/schemas/axis";
import {
  resetAxisConfig,
  resetAxisScale,
} from "@shared/schemas/axis";
import { useAxisUiStore } from "@renderer/stores/axisUiStore";
import { useGraphStore } from "@renderer/stores/graphStore";
import { useLayoutStore } from "@renderer/stores/layoutStore";
import { commitAxisChange } from "./AxisSettingsDialog";

function AxisMenuItems({
  axisId,
  onDone,
}: {
  axisId: AxisId;
  onDone: () => void;
}) {
  const openSettings = useAxisUiStore((s) => s.openSettings);
  const prefix = axisId === "x" ? "X" : "Y";

  const run = (fn: () => void) => {
    fn();
    onDone();
  };

  return (
    <>
      <li>
        <button
          type="button"
          role="menuitem"
          onClick={() => run(() => openSettings(axisId))}
        >
          {prefix} Axis Settings…
        </button>
      </li>
      <li>
        <button
          type="button"
          role="menuitem"
          onClick={() =>
            run(() => {
              const cfg = ensureGraphConfig(useGraphStore.getState().config);
              const axis = cfg.axes[axisId];
              if (
                axis.referenceLines.length > 0 &&
                !window.confirm(
                  "Reset Axis will clear scale and appearance. Remove reference lines as well?"
                )
              ) {
                commitAxisChange(
                  axisId,
                  resetAxisConfig(axis, { clearReferenceLines: false }),
                  `Reset ${prefix} axis`
                );
                return;
              }
              commitAxisChange(
                axisId,
                resetAxisConfig(axis, {
                  clearReferenceLines: axis.referenceLines.length > 0,
                }),
                `Reset ${prefix} axis`
              );
            })
          }
        >
          Reset {prefix} Axis
        </button>
      </li>
      <li>
        <button
          type="button"
          role="menuitem"
          onClick={() =>
            run(() => {
              const cfg = ensureGraphConfig(useGraphStore.getState().config);
              commitAxisChange(
                axisId,
                resetAxisScale(cfg.axes[axisId], true),
                `Reset ${prefix} scale`
              );
            })
          }
        >
          Reset {prefix} Scale
        </button>
      </li>
      <li>
        <button
          type="button"
          role="menuitem"
          onClick={() => run(() => openSettings(axisId, { focusTitle: true }))}
        >
          Edit {prefix} Axis Label…
        </button>
      </li>
    </>
  );
}

export function AxisContextMenu() {
  const menu = useAxisUiStore((s) => s.contextMenu);
  const close = useAxisUiStore((s) => s.closeContextMenu);
  const openSettings = useAxisUiStore((s) => s.openSettings);

  if (!menu) return null;

  const { axisId, x, y } = menu;

  return (
    <>
      <div className="axis-context-backdrop" onMouseDown={close} />
      <ul
        className="axis-context-menu"
        style={{ left: x, top: y }}
        role="menu"
      >
        {axisId == null ? (
          <>
            <li>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  openSettings("x");
                  close();
                }}
              >
                X Axis Settings…
              </button>
            </li>
            <li>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  openSettings("y");
                  close();
                }}
              >
                Y Axis Settings…
              </button>
            </li>
            <li className="axis-menu-separator" aria-hidden />
            <li>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  useLayoutStore.getState().setPropertiesPanelVisible(true);
                  close();
                }}
              >
                Show Properties
              </button>
            </li>
          </>
        ) : (
          <>
            <AxisMenuItems axisId={axisId} onDone={close} />
            <li className="axis-menu-separator" aria-hidden />
            <li>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  useLayoutStore.getState().setPropertiesPanelVisible(true);
                  close();
                }}
              >
                Show Properties
              </button>
            </li>
          </>
        )}
      </ul>
    </>
  );
}
