import { describe, expect, it } from "vitest";
import {
  createDefaultReferenceLine,
} from "../../src/shared/schemas/axis";
import {
  buildCombinedAnnotationSeries,
  buildReferenceLineAnnotation,
  buildReferenceRangeAnnotation,
} from "../../src/renderer/src/utils/reference-lines/buildReferenceAnnotations";
import {
  isReferenceLineInRange,
  validateReferenceLine,
} from "../../src/renderer/src/utils/reference-lines/validateReferenceLine";

describe("validateReferenceLine", () => {
  it("validates a line value", () => {
    const line = createDefaultReferenceLine({ value: 3600, label: "Target" });
    expect(validateReferenceLine(line, "y").valid).toBe(true);
  });

  it("rejects empty value", () => {
    const line = createDefaultReferenceLine({ value: undefined, label: "X" });
    (line as { value?: number }).value = undefined;
    const result = validateReferenceLine(
      { ...line, value: "" as unknown as number },
      "y"
    );
    expect(result.valid).toBe(false);
  });

  it("validates range start < end", () => {
    const ok = createDefaultReferenceLine({
      type: "range",
      startValue: 3400,
      endValue: 3800,
      label: "Spec",
    });
    expect(validateReferenceLine(ok, "y").valid).toBe(true);

    const bad = createDefaultReferenceLine({
      type: "range",
      startValue: 3800,
      endValue: 3400,
      label: "Spec",
    });
    expect(validateReferenceLine(bad, "y").valid).toBe(false);
  });
});

describe("isReferenceLineInRange", () => {
  it("detects out of range lines", () => {
    const line = createDefaultReferenceLine({ value: 4500, label: "USL" });
    expect(isReferenceLineInRange(line, { min: 3000, max: 4000 })).toBe(false);
    expect(isReferenceLineInRange(line, { min: 3000, max: 5000 })).toBe(true);
  });
});

describe("buildReference annotations", () => {
  it("builds Y horizontal markLine", () => {
    const line = createDefaultReferenceLine({
      value: 3800,
      label: "USL",
      lineStyle: "dashed",
    });
    const ann = buildReferenceLineAnnotation(line, "y");
    expect(ann).toMatchObject({ yAxis: 3800, name: "USL" });
  });

  it("builds X vertical markLine", () => {
    const line = createDefaultReferenceLine({
      value: 50,
      label: "Change",
    });
    const ann = buildReferenceLineAnnotation(line, "x");
    expect(ann).toMatchObject({ xAxis: 50, name: "Change" });
  });

  it("builds Y reference range markArea", () => {
    const line = createDefaultReferenceLine({
      type: "range",
      startValue: 3400,
      endValue: 3800,
      label: "Spec",
    });
    const area = buildReferenceRangeAnnotation(line, "y") as Array<
      Array<{ yAxis?: number }>
    >;
    expect(area?.[0]?.[0]).toMatchObject({ yAxis: 3400 });
    expect(area?.[0]?.[1]).toMatchObject({ yAxis: 3800 });
  });

  it("combines annotations without duplicating series", () => {
    const series = buildCombinedAnnotationSeries(
      [createDefaultReferenceLine({ value: 10, label: "XRef" })],
      [
        createDefaultReferenceLine({ value: 3400, label: "LSL" }),
        createDefaultReferenceLine({ value: 3600, label: "Target" }),
        createDefaultReferenceLine({ value: 3800, label: "USL" }),
      ],
      null,
      { min: 3000, max: 4000 }
    );
    expect(series?.id).toBe("__axis_annotations__");
    const ml = (series?.markLine as { data: unknown[] }).data;
    expect(ml.length).toBe(4);
  });

  it("omits out-of-range lines from render payload", () => {
    const series = buildCombinedAnnotationSeries(
      [],
      [createDefaultReferenceLine({ value: 4500, label: "Out" })],
      null,
      { min: 3000, max: 4000 }
    );
    expect(series).toBeNull();
  });
});
