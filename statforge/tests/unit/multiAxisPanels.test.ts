import { describe, expect, it } from "vitest";
import { createDefaultGraphConfig, type ColumnRef } from "../../src/shared/schemas/types";

function buildPanels(config: { roles: { x: ColumnRef[]; y: ColumnRef[] } }) {
  const xs = config.roles.x;
  const ys = config.roles.y;
  if (xs.length === 0 || ys.length === 0) return [];
  const panels: Array<{ x: ColumnRef; y: ColumnRef }> = [];
  for (const y of ys) {
    for (const x of xs) {
      panels.push({ x, y });
    }
  }
  return panels;
}

describe("multi X/Y panels", () => {
  it("creates equal panel count for two Y variables", () => {
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: "serial", name: "SerialNumber" }];
    config.roles.y = [
      { columnId: "bc4", name: "bc4MM" },
      { columnId: "bc12", name: "bc12MM" },
    ];
    const panels = buildPanels(config);
    expect(panels).toHaveLength(2);
    expect(panels[0].y.name).toBe("bc4MM");
    expect(panels[1].y.name).toBe("bc12MM");
  });

  it("creates matrix for multiple X and Y", () => {
    const config = createDefaultGraphConfig();
    config.roles.x = [
      { columnId: "x1", name: "X1" },
      { columnId: "x2", name: "X2" },
    ];
    config.roles.y = [
      { columnId: "y1", name: "Y1" },
      { columnId: "y2", name: "Y2" },
    ];
    expect(buildPanels(config)).toHaveLength(4);
  });
});
