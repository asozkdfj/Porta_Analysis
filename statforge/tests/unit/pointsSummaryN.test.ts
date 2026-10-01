import { describe, expect, it } from "vitest";
import { buildChartOption } from "../../src/renderer/src/charts/buildChartOption";
import {
  createDefaultGraphConfig,
  type ColumnMeta,
  type Dataset,
} from "../../src/shared/schemas/types";

function ds(): Dataset {
  const x: ColumnMeta = {
    id: "x",
    name: "TesterID",
    dataType: "categorical",
    modelingType: "nominal",
    missingCount: 0,
    uniqueCount: 3,
    hidden: false,
  };
  const y: ColumnMeta = {
    id: "y",
    name: "Y",
    dataType: "numeric",
    modelingType: "continuous",
    missingCount: 0,
    uniqueCount: 6,
    hidden: false,
  };
  const o: ColumnMeta = {
    id: "o",
    name: "Serial",
    dataType: "categorical",
    modelingType: "nominal",
    missingCount: 0,
    uniqueCount: 2,
    hidden: false,
  };
  return {
    id: "t",
    fileName: "t.csv",
    filePath: null,
    columns: [x, y, o],
    columnsData: {
      x: ["A", "A", "B", "B", "C", "C"],
      y: [200, 210, 220, 230, 240, 250],
      o: ["S1", "S1", "S1", "S2", "S2", "S2"],
    },
    rowCount: 6,
  };
}

describe("points summary N", () => {
  it("does not throw with summaryStatistic n and errorInterval auto", () => {
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: "x", name: "TesterID" }];
    config.roles.y = [{ columnId: "y", name: "Y" }];
    config.roles.overlay = [{ columnId: "o", name: "Serial" }];
    config.layers = config.layers.map((l) => ({
      ...l,
      enabled: l.kind === "points",
    }));
    config.options.points.summaryStatistic = "n";
    config.options.points.errorInterval = "auto";
    config.options.points.jitter = "auto";

    const { option } = buildChartOption(ds(), config);
    expect(option).not.toBeNull();
    const series = (option!.series ?? []) as Array<{
      type?: string;
      data?: Array<{ value?: [unknown, number] }>;
      renderItem?: unknown;
    }>;
    const scatter = series.filter((s) => s.type === "scatter");
    expect(scatter.length).toBeGreaterThan(0);
    for (const s of scatter) {
      for (const d of s.data ?? []) {
        expect(Number.isFinite(d.value?.[1])).toBe(true);
      }
    }
  });
});
