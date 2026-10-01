import { describe, expect, it } from "vitest";
import {
  buildPointsWithSummary,
  computeErrorInterval,
  computeJitterOffsets,
  summarizeValues,
} from "../../src/renderer/src/charts/stats/pointsAggregate";

describe("summarizeValues", () => {
  it("computes mean / median / n / q1", () => {
    const v = [1, 2, 3, 4, 5];
    expect(summarizeValues(v, "mean")).toBe(3);
    expect(summarizeValues(v, "median")).toBe(3);
    expect(summarizeValues(v, "n")).toBe(5);
    expect(summarizeValues(v, "q1")).toBe(2);
    expect(summarizeValues(v, "min")).toBe(1);
    expect(summarizeValues(v, "max")).toBe(5);
  });
});

describe("computeErrorInterval", () => {
  it("returns SE band around center", () => {
    const v = [10, 12, 14, 16];
    const band = computeErrorInterval(v, 13, "standardError");
    expect(band).not.toBeNull();
    expect(band!.lo).toBeLessThan(13);
    expect(band!.hi).toBeGreaterThan(13);
  });

  it("auto uses SE when n≥2", () => {
    const band = computeErrorInterval([1, 2, 3], 2, "auto");
    expect(band).not.toBeNull();
  });
});

describe("computeJitterOffsets", () => {
  it("fans out packed duplicates", () => {
    const keys = ["A", "A", "A", "B"];
    const off = computeJitterOffsets(keys, "packed", 0.4, 1);
    expect(off[0]).toBeCloseTo(-0.4);
    expect(off[1]).toBeCloseTo(0);
    expect(off[2]).toBeCloseTo(0.4);
    expect(off[3]).toBe(0);
  });

  it("auto only jitters collisions", () => {
    const keys = ["A", "A", "B"];
    const off = computeJitterOffsets(keys, "auto", 0.3, 1);
    expect(Math.abs(off[0]!)).toBeGreaterThan(0);
    expect(off[2]).toBe(0);
  });
});

describe("buildPointsWithSummary", () => {
  const rows = [
    { xKey: "T1", xValue: "T1", yValue: 10, rowIndex: 0 },
    { xKey: "T1", xValue: "T1", yValue: 20, rowIndex: 1 },
    { xKey: "T2", xValue: "T2", yValue: 30, rowIndex: 2 },
  ];

  it("keeps raw points when summary is none", () => {
    const pts = buildPointsWithSummary(rows, "none", "none", "errorBar");
    expect(pts).toHaveLength(3);
  });

  it("aggregates mean per X with error bars", () => {
    const pts = buildPointsWithSummary(rows, "mean", "range", "errorBar");
    expect(pts).toHaveLength(2);
    const t1 = pts.find((p) => p.xKey === "T1")!;
    expect(t1.yValue).toBe(15);
    expect(t1.lo).toBe(10);
    expect(t1.hi).toBe(20);
  });

  it("N summary has no error interval (scale stays count)", () => {
    const pts = buildPointsWithSummary(rows, "n", "auto", "errorBar");
    expect(pts).toHaveLength(2);
    expect(pts.find((p) => p.xKey === "T1")?.yValue).toBe(2);
    expect(pts.every((p) => p.lo == null && p.hi == null)).toBe(true);
  });
});
