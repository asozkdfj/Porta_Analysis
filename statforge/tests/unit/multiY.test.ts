import { describe, expect, it } from "vitest";
import { buildChartOption } from "../../src/renderer/src/charts/buildChartOption";
import {
  createDefaultGraphConfig,
  type ColumnMeta,
  type Dataset,
} from "../../src/shared/schemas/types";

function makeMultiYDataset(): Dataset {
  const x: ColumnMeta = {
    id: "x",
    name: "TesterID",
    dataType: "categorical",
    modelingType: "nominal",
    missingCount: 0,
    uniqueCount: 2,
    hidden: false,
  };
  const y1: ColumnMeta = {
    id: "y1",
    name: "BC4",
    dataType: "numeric",
    modelingType: "continuous",
    missingCount: 0,
    uniqueCount: 4,
    hidden: false,
  };
  const y2: ColumnMeta = {
    id: "y2",
    name: "BC12",
    dataType: "numeric",
    modelingType: "continuous",
    missingCount: 0,
    uniqueCount: 4,
    hidden: false,
  };
  const y3: ColumnMeta = {
    id: "y3",
    name: "BC36",
    dataType: "numeric",
    modelingType: "continuous",
    missingCount: 0,
    uniqueCount: 4,
    hidden: false,
  };
  return {
    id: "multi-y",
    fileName: "m.csv",
    filePath: null,
    columns: [x, y1, y2, y3],
    columnsData: {
      x: ["T1", "T2", "T1", "T2"],
      // Different magnitude ranges — a shared manual Y from y1 would clip y2/y3
      y1: [200, 210, 220, 230],
      y2: [10, 12, 11, 13],
      y3: [1000, 1100, 1050, 1200],
    },
    rowCount: 4,
  };
}

describe("multi-Y stacked panels", () => {
  it("still builds points for Y2/Y3 when global Y is locked to Y1 range", () => {
    const ds = makeMultiYDataset();
    const base = createDefaultGraphConfig();
    base.roles.x = [{ columnId: "x", name: "TesterID" }];
    base.layers = base.layers.map((l) => ({
      ...l,
      enabled: l.kind === "points",
    }));
    // Simulate zoom on first panel locking global Y to BC4 range
    base.axes.y.scale.rangeMode = "manual";
    base.axes.y.scale.minimum = 190;
    base.axes.y.scale.maximum = 240;

    const mk = (yId: string, yName: string, row: number) => {
      const config = {
        ...base,
        roles: {
          ...base.roles,
          y: [{ columnId: yId, name: yName }],
        },
        // Independent Y: panelConfig clears manual — mirror that here
        axes: {
          ...base.axes,
          y: {
            ...base.axes.y,
            scale: {
              ...base.axes.y.scale,
              rangeMode: "auto" as const,
              minimum: null,
              maximum: null,
            },
          },
        },
      };
      return buildChartOption(ds, config, {
        row,
        col: 0,
        rowCount: 3,
        colCount: 1,
        suppressLegend: true,
        showXAxis: row === 2,
        showYAxis: true,
      });
    };

    const p1 = mk("y1", "BC4", 0);
    const p2 = mk("y2", "BC12", 1);
    const p3 = mk("y3", "BC36", 2);

    const countPts = (r: ReturnType<typeof buildChartOption>) => {
      const series = (r.option?.series ?? []) as Array<{
        type?: string;
        data?: unknown[];
      }>;
      return series
        .filter((s) => s.type === "scatter")
        .reduce((n, s) => n + (s.data?.length ?? 0), 0);
    };

    expect(countPts(p1)).toBe(4);
    expect(countPts(p2)).toBe(4);
    expect(countPts(p3)).toBe(4);

    // Without independent reset, manual Y1 range would still be on the axis —
    // with reset, Y2 should not be forced into 190–240
    const y2Axis = p2.option!.yAxis as { min?: number | ((...a: unknown[]) => number); max?: unknown };
    expect(y2Axis.min).not.toBe(190);
    expect(y2Axis.max).not.toBe(240);
  });

  it("clips Y2 points when shared manual Y1 range is incorrectly applied", () => {
    const ds = makeMultiYDataset();
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: "x", name: "TesterID" }];
    config.roles.y = [{ columnId: "y2", name: "BC12" }];
    config.layers = config.layers.map((l) => ({
      ...l,
      enabled: l.kind === "points",
    }));
    config.axes.y.scale.rangeMode = "manual";
    config.axes.y.scale.minimum = 190;
    config.axes.y.scale.maximum = 240;

    const { option } = buildChartOption(ds, config, {
      row: 1,
      col: 0,
      rowCount: 3,
      colCount: 1,
      suppressLegend: true,
    });
    expect(option).not.toBeNull();
    const yAxis = option!.yAxis as { min?: number; max?: number };
    expect(yAxis.min).toBe(190);
    expect(yAxis.max).toBe(240);
    // Points exist in series but lie outside the visible Y window (the bug symptom)
    const scatter = (option!.series as Array<{ type: string; data?: unknown[] }>).find(
      (s) => s.type === "scatter"
    );
    expect(scatter?.data?.length).toBe(4);
  });
});
