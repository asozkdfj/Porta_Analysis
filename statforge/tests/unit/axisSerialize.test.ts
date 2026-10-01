import { describe, expect, it } from "vitest";
import {
  createDefaultGraphConfig,
  ensureGraphConfig,
  type GraphConfig,
} from "../../src/shared/schemas/types";
import {
  createDefaultReferenceLine,
  ensureGraphAxes,
} from "../../src/shared/schemas/axis";

describe("axis serialize / restore", () => {
  it("round-trips axes through JSON", () => {
    const config = createDefaultGraphConfig();
    config.axes.y.scale.rangeMode = "manual";
    config.axes.y.scale.minimum = 3000;
    config.axes.y.scale.maximum = 4000;
    config.axes.y.scale.reverse = true;
    config.axes.y.referenceLines = [
      createDefaultReferenceLine({ label: "LSL", value: 3400 }),
      createDefaultReferenceLine({ label: "Target", value: 3600 }),
      createDefaultReferenceLine({ label: "USL", value: 3800 }),
    ];

    const raw = JSON.parse(JSON.stringify({ schemaVersion: 2, graph: config }));
    const restored = ensureGraphConfig(raw.graph as GraphConfig);
    expect(restored.axes.y.scale.minimum).toBe(3000);
    expect(restored.axes.y.scale.maximum).toBe(4000);
    expect(restored.axes.y.scale.reverse).toBe(true);
    expect(restored.axes.y.referenceLines).toHaveLength(3);
    expect(restored.axes.y.referenceLines.map((r) => r.label)).toEqual([
      "LSL",
      "Target",
      "USL",
    ]);
  });

  it("migrates missing axes to defaults", () => {
    const legacy = createDefaultGraphConfig();
    const { axes: _drop, ...withoutAxes } = legacy;
    const migrated = ensureGraphConfig(withoutAxes as GraphConfig);
    expect(migrated.axes.x.id).toBe("x");
    expect(migrated.axes.y.id).toBe("y");
    expect(migrated.axes.y.scale.rangeMode).toBe("auto");
  });

  it("ensureGraphAxes fills partial", () => {
    const axes = ensureGraphAxes({
      y: {
        id: "y",
        scale: {
          ...createDefaultGraphConfig().axes.y.scale,
          rangeMode: "manual",
          minimum: 1,
          maximum: 2,
        },
        appearance: createDefaultGraphConfig().axes.y.appearance,
        referenceLines: [],
      },
    });
    expect(axes.x.scale.rangeMode).toBe("auto");
    expect(axes.y.scale.minimum).toBe(1);
  });
});
