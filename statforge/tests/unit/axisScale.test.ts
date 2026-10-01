import { describe, expect, it } from "vitest";
import { calculateAutoRange, calculateNiceRange } from "../../src/renderer/src/utils/axis/calculateAutoRange";
import { calculateTickValues, estimateTickCount } from "../../src/renderer/src/utils/axis/calculateTicks";
import { formatAxisValue } from "../../src/renderer/src/utils/axis/formatAxisLabel";
import {
  createDefaultAxisScale,
  createDefaultReferenceLine,
} from "../../src/shared/schemas/axis";
import { validateAxisScale } from "../../src/renderer/src/utils/axis/validateAxisScale";

describe("calculateAutoRange", () => {
  it("computes range from data", () => {
    const r = calculateAutoRange([10, 20, 30], {
      niceScale: false,
      paddingRatio: 0,
      includeReferenceLines: false,
    });
    expect(r.minimum).toBe(10);
    expect(r.maximum).toBe(30);
  });

  it("includes reference lines when enabled", () => {
    const r = calculateAutoRange([3300, 3900], {
      niceScale: false,
      paddingRatio: 0,
      includeReferenceLines: true,
      referenceLines: [
        createDefaultReferenceLine({ value: 3000, label: "LSL" }),
        createDefaultReferenceLine({ value: 4000, label: "USL" }),
      ],
    });
    expect(r.minimum).toBe(3000);
    expect(r.maximum).toBe(4000);
  });

  it("includes interval extras", () => {
    const r = calculateAutoRange([10, 20], {
      niceScale: false,
      paddingRatio: 0,
      extraValues: [5, 25],
      includeReferenceLines: false,
    });
    expect(r.minimum).toBe(5);
    expect(r.maximum).toBe(25);
  });
});

describe("calculateNiceRange", () => {
  it("expands to nice bounds", () => {
    const r = calculateNiceRange(3, 97);
    expect(r.minimum).toBeLessThanOrEqual(3);
    expect(r.maximum).toBeGreaterThanOrEqual(97);
  });
});

describe("validateAxisScale", () => {
  it("rejects minimum >= maximum", () => {
    const scale = createDefaultAxisScale();
    scale.rangeMode = "manual";
    scale.minimum = 4000;
    scale.maximum = 3000;
    const result = validateAxisScale(scale, "y");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "minimum")).toBe(true);
  });

  it("accepts valid manual range", () => {
    const scale = createDefaultAxisScale();
    scale.rangeMode = "manual";
    scale.minimum = 3000;
    scale.maximum = 4000;
    expect(validateAxisScale(scale, "y").valid).toBe(true);
  });

  it("keeps reverse independent of min/max", () => {
    const scale = createDefaultAxisScale();
    scale.rangeMode = "manual";
    scale.minimum = 0;
    scale.maximum = 100;
    scale.reverse = true;
    const result = validateAxisScale(scale, "x");
    expect(result.valid).toBe(true);
    expect(scale.minimum).toBe(0);
    expect(scale.maximum).toBe(100);
    expect(scale.reverse).toBe(true);
  });

  it("rejects log with non-positive minimum", () => {
    const scale = createDefaultAxisScale();
    scale.scaleType = "log";
    scale.rangeMode = "manual";
    scale.minimum = 0;
    scale.maximum = 100;
    expect(validateAxisScale(scale, "y").valid).toBe(false);
  });
});

describe("calculateTickValues", () => {
  it("generates increment ticks", () => {
    const ticks = calculateTickValues(0, 100, 10);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(100);
    expect(ticks.length).toBe(11);
  });

  it("limits excessive tick count", () => {
    expect(calculateTickValues(0, 100, 0.001).length).toBe(0);
    expect(estimateTickCount(0, 100, 0.001)).toBeGreaterThan(500);
  });
});

describe("formatAxisValue", () => {
  it("formats decimal with prefix/suffix", () => {
    expect(
      formatAxisValue(10, {
        numberFormat: "integer",
        decimalPlaces: null,
        prefix: "$",
        suffix: " mm",
      })
    ).toBe("$10 mm");
  });

  it("formats percentage", () => {
    expect(
      formatAxisValue(0.25, {
        numberFormat: "percentage",
        decimalPlaces: 0,
        prefix: "",
        suffix: "",
      })
    ).toBe("25%");
  });
});
