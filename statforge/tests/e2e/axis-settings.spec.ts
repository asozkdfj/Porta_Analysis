import { test, expect } from "@playwright/test";
import {
  createDefaultGraphConfig,
  ensureGraphConfig,
} from "../../src/shared/schemas/types";
import { createDefaultReferenceLine } from "../../src/shared/schemas/axis";
import { buildCombinedAnnotationSeries } from "../../src/renderer/src/utils/reference-lines/buildReferenceAnnotations";
import { validateAxisScale } from "../../src/renderer/src/utils/axis/validateAxisScale";
import { buildAxisOptions } from "../../src/renderer/src/utils/axis/buildAxisOptions";

/**
 * Axis Settings scenario (logic-level E2E without Electron UI launch).
 * Full Electron UI e2e can be layered later; this locks the sample workflow.
 */
test("Y axis 3000–4000 with LSL/Target/USL reference lines", async () => {
  const config = createDefaultGraphConfig();
  config.axes.y.scale.rangeMode = "manual";
  config.axes.y.scale.minimum = 3000;
  config.axes.y.scale.maximum = 4000;
  config.axes.y.scale.tickMode = "manual";
  config.axes.y.scale.tickIncrement = 100;
  config.axes.y.referenceLines = [
    createDefaultReferenceLine({
      label: "LSL",
      value: 3400,
      lineStyle: "dashed",
      preset: "LSL",
    }),
    createDefaultReferenceLine({
      label: "Target",
      value: 3600,
      lineStyle: "solid",
      preset: "Target",
    }),
    createDefaultReferenceLine({
      label: "USL",
      value: 3800,
      lineStyle: "dashed",
      preset: "USL",
    }),
  ];

  expect(validateAxisScale(config.axes.y.scale, "y").valid).toBe(true);

  const yOpt = buildAxisOptions(config.axes.y, {
    continuous: true,
    defaultName: "Y",
    showAxisChrome: true,
  });
  expect(yOpt.min).toBe(3000);
  expect(yOpt.max).toBe(4000);
  expect(yOpt.interval).toBe(100);

  const ann = buildCombinedAnnotationSeries(
    [],
    config.axes.y.referenceLines,
    null,
    { min: 3000, max: 4000 }
  );
  expect(ann).not.toBeNull();
  const lines = (ann!.markLine as { data: Array<{ yAxis: number; name: string }> })
    .data;
  expect(lines.map((l) => l.name)).toEqual(["LSL", "Target", "USL"]);
  expect(lines.map((l) => l.yAxis)).toEqual([3400, 3600, 3800]);

  const restored = ensureGraphConfig(
    JSON.parse(JSON.stringify(config))
  );
  expect(restored.axes.y.scale.minimum).toBe(3000);
  expect(restored.axes.y.referenceLines).toHaveLength(3);
});

test("X and Y axis settings stay independent", async () => {
  const config = createDefaultGraphConfig();
  config.axes.x.scale.rangeMode = "manual";
  config.axes.x.scale.minimum = 0;
  config.axes.x.scale.maximum = 100;
  config.axes.x.referenceLines = [
    createDefaultReferenceLine({ label: "Mid", value: 50 }),
  ];
  config.axes.y.scale.rangeMode = "manual";
  config.axes.y.scale.minimum = 3000;
  config.axes.y.scale.maximum = 4000;
  config.axes.y.referenceLines = [
    createDefaultReferenceLine({ label: "LSL", value: 3400 }),
  ];

  expect(config.axes.x.scale.minimum).toBe(0);
  expect(config.axes.y.scale.minimum).toBe(3000);
  expect(config.axes.x.referenceLines).toHaveLength(1);
  expect(config.axes.y.referenceLines).toHaveLength(1);
  expect(config.axes.x.referenceLines[0].value).toBe(50);
  expect(config.axes.y.referenceLines[0].value).toBe(3400);
});
