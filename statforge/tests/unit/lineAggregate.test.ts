import { describe, expect, it } from "vitest";
import { buildAggregatedLinePoints } from "../../src/renderer/src/charts/stats/lineAggregate";

describe("buildAggregatedLinePoints", () => {
  it("aggregates duplicate X with mean so no vertical zig-zag", () => {
    const rows = [
      { xKey: "A", xValue: "A", yValue: 10, sortKey: 0, rowOrder: 0 },
      { xKey: "A", xValue: "A", yValue: 20, sortKey: 0, rowOrder: 1 },
      { xKey: "B", xValue: "B", yValue: 30, sortKey: 1, rowOrder: 2 },
      { xKey: "B", xValue: "B", yValue: 50, sortKey: 1, rowOrder: 3 },
    ];
    const pts = buildAggregatedLinePoints(rows, "mean", "xAsc");
    expect(pts).toHaveLength(2);
    expect(pts[0].value).toEqual(["A", 15]);
    expect(pts[1].value).toEqual(["B", 40]);
  });

  it("orders by X category sortKey", () => {
    const rows = [
      { xKey: "B", xValue: "B", yValue: 2, sortKey: 1, rowOrder: 0 },
      { xKey: "A", xValue: "A", yValue: 1, sortKey: 0, rowOrder: 1 },
    ];
    const pts = buildAggregatedLinePoints(rows, "mean", "xAsc");
    expect(pts.map((p) => p.value[0])).toEqual(["A", "B"]);
  });
});
