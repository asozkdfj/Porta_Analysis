import { describe, expect, it } from "vitest";
import {
  createColorScale,
  resolveDiscreteColor,
  DISCRETE_PALETTE,
  colorCategoryKey,
} from "../../src/renderer/src/charts/encoding/colorScale";
import { resolveSeriesLegend } from "../../src/renderer/src/charts/ColorLegendPanel";
import { buildChartOption } from "../../src/renderer/src/charts/buildChartOption";
import {
  createDefaultGraphConfig,
  type ColumnMeta,
  type Dataset,
} from "../../src/shared/schemas/types";

function serialDataset(): Dataset {
  const serial: ColumnMeta = {
    id: "sn",
    name: "SerialNumber",
    dataType: "character",
    modelingType: "nominal",
    missingCount: 0,
    uniqueCount: 9,
    hidden: false,
  };
  const x: ColumnMeta = {
    id: "x",
    name: "TesterID",
    dataType: "character",
    modelingType: "nominal",
    missingCount: 0,
    uniqueCount: 3,
    hidden: false,
  };
  const y: ColumnMeta = {
    id: "y",
    name: "Measure",
    dataType: "numeric",
    modelingType: "continuous",
    missingCount: 0,
    uniqueCount: 9,
    hidden: false,
  };
  const sns = [
    "F58HQ6005VY0000Y92",
    "F58HQ6005WA0000Y92",
    "F58HQ6005WB0000Y92",
    "F58HQ6005WC0000Y92",
    "F58HQ6005WD0000Y92",
    "F58HQ6005WE0000Y92",
    "F58HQ6005WF0000Y92",
    "F58HQ6005WG0000Y92",
    "F58HQ6005WH0000Y92",
  ];
  const xs = ["S1", "S2", "S3"];
  const columnsData: Dataset["columnsData"] = {
    sn: [],
    x: [],
    y: [],
  };
  let row = 0;
  for (const sn of sns) {
    for (const xv of xs) {
      columnsData.sn.push(sn);
      columnsData.x.push(xv);
      columnsData.y.push(100 + row);
      row += 1;
    }
  }
  return {
    id: "ds",
    fileName: "t.csv",
    filePath: null,
    columns: [serial, x, y],
    columnsData,
    rowCount: columnsData.y.length,
  };
}

describe("Color legend matches chart series", () => {
  it("assigns distinct palette colors without near-duplicate pairs for 9 levels", () => {
    const ds = serialDataset();
    const { scale } = createColorScale(ds, ds.columns[0]);
    expect(scale?.kind).toBe("discrete");
    if (scale?.kind !== "discrete") return;
    const colors = scale.order.map((k) => scale.colors.get(k)!);
    expect(new Set(colors).size).toBe(9);
    // First 9 palette entries must all be unique
    expect(new Set(DISCRETE_PALETTE.slice(0, 9)).size).toBe(9);
  });

  it("legend swatch color equals line series color for each SerialNumber", () => {
    const ds = serialDataset();
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: "x", name: "TesterID" }];
    config.roles.y = [{ columnId: "y", name: "Measure" }];
    config.roles.color = [{ columnId: "sn", name: "SerialNumber" }];
    config.layers = config.layers.map((l) => ({
      ...l,
      enabled: l.kind === "line",
    }));
    config.activeLayer = "line";

    const legend = resolveSeriesLegend(ds, config);
    expect(legend).not.toBeNull();
    expect(legend!.items.length).toBe(9);

    const built = buildChartOption(ds, config);
    expect(built.option).not.toBeNull();
    const series = (built.option!.series as Array<{
      name?: string;
      lineStyle?: { color?: string };
      itemStyle?: { color?: string };
      id?: string;
    }>).filter((s) => s.id !== "__axis_annotations__" && s.name);

    for (const item of legend!.items) {
      const s = series.find((ser) => ser.name === item.key);
      expect(s, `missing series for ${item.key}`).toBeTruthy();
      expect(s!.lineStyle?.color).toBe(item.color);
      expect(s!.itemStyle?.color).toBe(item.color);
      expect(resolveDiscreteColor(createColorScale(ds, ds.columns[0]).scale, item.key)).toBe(
        item.color
      );
    }
  });

  it("colorCategoryKey trims consistently", () => {
    expect(colorCategoryKey("  ABC  ")).toBe("ABC");
    expect(colorCategoryKey("")).toBe("(Missing)");
  });
});
