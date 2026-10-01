import { describe, expect, it } from "vitest";
import { createPageGroups, createWrapGroups, wrapGridSize } from "../../src/renderer/src/charts/encoding/wrap";
import { buildChartOption } from "../../src/renderer/src/charts/buildChartOption";
import {
  createDefaultGraphConfig,
  type ColumnMeta,
  type Dataset,
} from "../../src/shared/schemas/types";

function makeDataset(): Dataset {
  const serial: ColumnMeta = {
    id: "serial",
    name: "SerialNumber",
    dataType: "categorical",
    modelingType: "nominal",
    missingCount: 0,
    uniqueCount: 3,
    hidden: false,
  };
  const x: ColumnMeta = {
    id: "x",
    name: "TesterID",
    dataType: "categorical",
    modelingType: "nominal",
    missingCount: 0,
    uniqueCount: 2,
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
  return {
    id: "w",
    fileName: "w.csv",
    filePath: null,
    columns: [serial, x, y],
    columnsData: {
      serial: ["S1", "S1", "S2", "S2", "S3", "S3"],
      x: ["T1", "T2", "T1", "T2", "T1", "T2"],
      y: [10, 12, 20, 22, 30, 32],
    },
    rowCount: 6,
  };
}

describe("createWrapGroups", () => {
  it("creates one group per SerialNumber level", () => {
    const ds = makeDataset();
    const { groups } = createWrapGroups(ds, ds.columns[0]!);
    expect(groups.map((g) => g.key).sort()).toEqual(["S1", "S2", "S3"]);
    expect(groups.find((g) => g.key === "S1")?.rowIndices).toEqual([0, 1]);
  });

  it("returns empty groups when column is null", () => {
    const ds = makeDataset();
    expect(createWrapGroups(ds, null).groups).toEqual([]);
  });
});

describe("createPageGroups", () => {
  it("creates one group per page level", () => {
    const ds = makeDataset();
    const { groups } = createPageGroups(ds, ds.columns[0]!);
    expect(groups.map((g) => g.key).sort()).toEqual(["S1", "S2", "S3"]);
  });
});

describe("wrapGridSize", () => {
  it("computes rows for a 3-column trellis", () => {
    expect(wrapGridSize(8, 3)).toEqual({ cols: 3, rows: 3 });
    expect(wrapGridSize(2, 3)).toEqual({ cols: 2, rows: 1 });
  });
});

describe("buildChartOption rowFilter (Wrap facet)", () => {
  it("plots only filtered wrap rows", () => {
    const ds = makeDataset();
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: "x", name: "TesterID" }];
    config.roles.y = [{ columnId: "y", name: "Y" }];
    config.layers = config.layers.map((l) => ({
      ...l,
      enabled: l.kind === "points",
    }));

    const all = buildChartOption(ds, config);
    const s1 = buildChartOption(ds, config, {
      row: 0,
      col: 0,
      rowCount: 1,
      colCount: 1,
      rowFilter: [0, 1],
    });

    expect(all.option).not.toBeNull();
    expect(s1.option).not.toBeNull();

    const allPts = (all.option!.series as Array<{ type: string; data?: unknown[] }>).find(
      (s) => s.type === "scatter"
    );
    const s1Pts = (s1.option!.series as Array<{ type: string; data?: unknown[] }>).find(
      (s) => s.type === "scatter"
    );
    expect((allPts?.data?.length ?? 0)).toBe(6);
    expect((s1Pts?.data?.length ?? 0)).toBe(2);
  });

  it("applies sharedYRange so wrap facets share a Y scale", () => {
    const ds = makeDataset();
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: "x", name: "TesterID" }];
    config.roles.y = [{ columnId: "y", name: "Y" }];
    config.layers = config.layers.map((l) => ({
      ...l,
      enabled: l.kind === "points",
    }));

    const shared = { min: 0, max: 100 };
    const { option } = buildChartOption(ds, config, {
      row: 0,
      col: 0,
      rowCount: 2,
      colCount: 2,
      rowFilter: [0, 1],
      sharedYRange: shared,
      suppressLegend: true,
    });
    expect(option).not.toBeNull();
    const yAxis = option!.yAxis as { min?: number; max?: number };
    expect(yAxis.min).toBe(0);
    expect(yAxis.max).toBe(100);
  });

  it("shows X-axis chrome when showXAxis is true (wrap column bottom)", () => {
    const ds = makeDataset();
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: "x", name: "TesterID" }];
    config.roles.y = [{ columnId: "y", name: "Y" }];
    config.layers = config.layers.map((l) => ({
      ...l,
      enabled: l.kind === "points",
    }));

    const hidden = buildChartOption(ds, config, {
      row: 0,
      col: 2,
      rowCount: 3,
      colCount: 3,
      showXAxis: false,
      showYAxis: false,
      whiteBackground: true,
      suppressLegend: true,
    });
    const shown = buildChartOption(ds, config, {
      row: 1,
      col: 2,
      rowCount: 3,
      colCount: 3,
      showXAxis: true,
      showYAxis: false,
      whiteBackground: true,
      suppressLegend: true,
    });

    const xHidden = hidden.option!.xAxis as { axisLabel?: { show?: boolean }; name?: string };
    const xShown = shown.option!.xAxis as { axisLabel?: { show?: boolean }; name?: string };
    const yMid = shown.option!.yAxis as { axisLabel?: { show?: boolean }; name?: string };
    expect(xHidden.axisLabel?.show).toBe(false);
    expect(xShown.axisLabel?.show).toBe(true);
    expect(yMid.axisLabel?.show).toBe(false);
    expect(shown.option!.backgroundColor).toBe("#ffffff");
  });

  it("builds empty wrap placeholder with axes only", () => {
    const ds = makeDataset();
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: "x", name: "TesterID" }];
    config.roles.y = [{ columnId: "y", name: "Y" }];
    config.layers = config.layers.map((l) => ({
      ...l,
      enabled: l.kind === "points",
    }));
    const { option } = buildChartOption(ds, config, {
      row: 2,
      col: 2,
      rowCount: 3,
      colCount: 3,
      rowFilter: [],
      allowEmptyAxes: true,
      showXAxis: true,
      showYAxis: false,
      whiteBackground: true,
      suppressLegend: true,
      sharedYRange: { min: 0, max: 40 },
    });
    expect(option).not.toBeNull();
    expect((option!.series as unknown[]).length).toBe(0);
    const xAxis = option!.xAxis as { axisLabel?: { show?: boolean } };
    expect(xAxis.axisLabel?.show).toBe(true);
  });
});
