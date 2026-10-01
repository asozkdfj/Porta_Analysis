import { describe, expect, it } from "vitest";
import { createColorScale, resolveColor } from "../../src/renderer/src/charts/encoding/colorScale";
import { createIntervalValues } from "../../src/renderer/src/charts/encoding/interval";
import { createEqualWidthBins, createOverlayGroups } from "../../src/renderer/src/charts/encoding/overlay";
import { createSizeScale, resolveSize } from "../../src/renderer/src/charts/encoding/sizeScale";
import { buildFitCurve, fitPolynomial } from "../../src/renderer/src/charts/stats/regression";
import { buildSmoother, movingAverageSmooth } from "../../src/renderer/src/charts/stats/smoother";
import { buildChartOption } from "../../src/renderer/src/charts/buildChartOption";
import {
  createDefaultGraphConfig,
  type ColumnMeta,
  type Dataset,
} from "../../src/shared/schemas/types";

function makeDataset(): Dataset {
  const sex: ColumnMeta = {
    id: "sex",
    name: "Sex",
    dataType: "categorical",
    modelingType: "nominal",
    missingCount: 0,
    uniqueCount: 2,
    hidden: false,
  };
  const height: ColumnMeta = {
    id: "height",
    name: "Height",
    dataType: "numeric",
    modelingType: "continuous",
    missingCount: 0,
    uniqueCount: 6,
    hidden: false,
  };
  const weight: ColumnMeta = {
    id: "weight",
    name: "Weight",
    dataType: "numeric",
    modelingType: "continuous",
    missingCount: 0,
    uniqueCount: 6,
    hidden: false,
  };
  const age: ColumnMeta = {
    id: "age",
    name: "Age",
    dataType: "numeric",
    modelingType: "continuous",
    missingCount: 0,
    uniqueCount: 6,
    hidden: false,
  };
  const size: ColumnMeta = {
    id: "sampleSize",
    name: "SampleSize",
    dataType: "numeric",
    modelingType: "continuous",
    missingCount: 0,
    uniqueCount: 6,
    hidden: false,
  };
  const err: ColumnMeta = {
    id: "err",
    name: "ErrorDelta",
    dataType: "numeric",
    modelingType: "continuous",
    missingCount: 0,
    uniqueCount: 6,
    hidden: false,
  };
  const lo: ColumnMeta = {
    id: "lo",
    name: "LowerLimit",
    dataType: "numeric",
    modelingType: "continuous",
    missingCount: 0,
    uniqueCount: 6,
    hidden: false,
  };
  const hi: ColumnMeta = {
    id: "hi",
    name: "UpperLimit",
    dataType: "numeric",
    modelingType: "continuous",
    missingCount: 0,
    uniqueCount: 6,
    hidden: false,
  };

  return {
    id: "t",
    fileName: "t.csv",
    filePath: null,
    columns: [sex, height, weight, age, size, err, lo, hi],
    columnsData: {
      sex: ["M", "F", "M", "F", "M", "F"],
      height: [170, 160, 180, 165, 175, 158],
      weight: [70, 55, 85, 58, 78, 52],
      age: [20, 30, 40, 25, 35, 45],
      sampleSize: [5, 10, 20, 8, 15, 12],
      err: [2, 3, -1, 4, 2, 1],
      lo: [68, 52, 90, 50, 70, 60],
      hi: [72, 58, 80, 66, 82, 55],
    },
    rowCount: 6,
  };
}

describe("overlay encoding", () => {
  it("creates categorical overlay groups", () => {
    const ds = makeDataset();
    const sex = ds.columns[0];
    const { groups } = createOverlayGroups(ds, sex);
    expect(groups.map((g) => g.key).sort()).toEqual(["F", "M"]);
    expect(groups.find((g) => g.key === "M")?.rowIndices).toHaveLength(3);
  });

  it("creates equal-width bins", () => {
    const { labels } = createEqualWidthBins([10, 20, 30, 40, 50], 4);
    expect(labels.length).toBe(4);
  });
});

describe("color and size scales", () => {
  it("builds discrete color scale", () => {
    const ds = makeDataset();
    const { scale } = createColorScale(ds, ds.columns[0]);
    expect(scale?.kind).toBe("discrete");
    if (scale?.kind === "discrete") {
      expect(resolveColor(scale, "M")).toMatch(/^#/);
    }
  });

  it("builds continuous color scale", () => {
    const ds = makeDataset();
    const { scale } = createColorScale(ds, ds.columns[3]);
    expect(scale?.kind).toBe("continuous");
  });

  it("maps size between min and max px", () => {
    const ds = makeDataset();
    const { scale } = createSizeScale(ds, ds.columns[4], { minPx: 4, maxPx: 24 });
    expect(scale).not.toBeNull();
    const small = resolveSize(scale, 5, 6);
    const large = resolveSize(scale, 20, 6);
    expect(large).toBeGreaterThan(small);
  });
});

describe("interval values", () => {
  it("computes symmetric intervals from one column", () => {
    const ds = makeDataset();
    const y = (ds.columnsData.weight as number[]).map((v) => v);
    const { pairs, issues } = createIntervalValues(ds, y, [ds.columns[5]]);
    expect(pairs[0].valid).toBe(true);
    expect(pairs[0].lower).toBe(68);
    expect(pairs[0].upper).toBe(72);
    expect(issues.some((i) => i.level === "warning")).toBe(true);
  });

  it("validates asymmetric lower/upper", () => {
    const ds = makeDataset();
    const y = (ds.columnsData.weight as number[]).map((v) => v);
    const { pairs } = createIntervalValues(ds, y, [ds.columns[6], ds.columns[7]]);
    expect(pairs[0].valid).toBe(true);
    expect(pairs[2].valid).toBe(false); // 90 > 80
  });
});

describe("regression and smoother", () => {
  it("fits a linear model", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 4, 6, 8, 10];
    const fit = fitPolynomial(xs, ys, 1);
    expect(fit).not.toBeNull();
    expect(fit!.r2).toBeCloseTo(1, 5);
    expect(fit!.predict(6)).toBeCloseTo(12, 5);
    expect(buildFitCurve(fit!, 1, 5, 5)).toHaveLength(5);
  });

  it("fits quadratic", () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = xs.map((x) => 1 + 2 * x + 3 * x * x);
    const fit = fitPolynomial(xs, ys, 2);
    expect(fit).not.toBeNull();
    expect(fit!.r2).toBeCloseTo(1, 4);
  });

  it("sorts smoother inputs", () => {
    const pts = movingAverageSmooth([3, 1, 2], [30, 10, 20], 3);
    expect(pts[0].x).toBe(1);
    expect(pts.map((p) => p.x)).toEqual([1, 2, 3]);
  });

  it("builds loess smoother", () => {
    const xs = Array.from({ length: 30 }, (_, i) => i);
    const ys = xs.map((x) => Math.sin(x / 5) + x * 0.1);
    const smooth = buildSmoother(xs, ys, "loess", { span: 0.4 });
    expect(smooth.length).toBeGreaterThan(10);
  });
});

describe("buildChartOption integration", () => {
  it("builds overlay points series", () => {
    const ds = makeDataset();
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: "height", name: "Height" }];
    config.roles.y = [{ columnId: "weight", name: "Weight" }];
    config.roles.overlay = [{ columnId: "sex", name: "Sex" }];
    const { option } = buildChartOption(ds, config);
    expect(option).not.toBeNull();
    expect((option!.series as object[]).length).toBeGreaterThanOrEqual(2);
  });

  it("builds line of fit and smoother together", () => {
    const ds = makeDataset();
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: "height", name: "Height" }];
    config.roles.y = [{ columnId: "weight", name: "Weight" }];
    config.layers = config.layers.map((l) => ({
      ...l,
      enabled: l.kind === "points" || l.kind === "smoother" || l.kind === "lineOfFit",
    }));
    const { option } = buildChartOption(ds, config);
    expect(option).not.toBeNull();
    const types = (option!.series as Array<{ type: string }>).map((s) => s.type);
    expect(types).toContain("scatter");
    expect(types.filter((t) => t === "line").length).toBeGreaterThanOrEqual(2);
  });

  it("Smoother without Overlay: one curve per panel (Group Y facet)", () => {
    const ds = makeDataset();
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: "height", name: "Height" }];
    config.roles.y = [{ columnId: "weight", name: "Weight" }];
    config.roles.overlay = [];
    config.layers = config.layers.map((l) => ({
      ...l,
      enabled: l.kind === "points" || l.kind === "smoother",
    }));
    const { option } = buildChartOption(ds, config, {
      row: 1,
      col: 0,
      rowCount: 3,
      colCount: 1,
      suppressLegend: true,
    });
    const lines = (option!.series as Array<{ type: string; name?: string; lineStyle?: { color?: string } }>).filter(
      (s) => s.type === "line" && s.name === "Smoother"
    );
    expect(lines).toHaveLength(1);
    // Panel row 1 → second palette color
    expect(lines[0].lineStyle?.color).toBeTruthy();
  });

  it("Smoother with Overlay: one curve per overlay level", () => {
    const ds = makeDataset();
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: "height", name: "Height" }];
    config.roles.y = [{ columnId: "weight", name: "Weight" }];
    config.roles.overlay = [{ columnId: "sex", name: "Sex" }];
    config.layers = config.layers.map((l) => ({
      ...l,
      enabled: l.kind === "points" || l.kind === "smoother",
    }));
    const { option } = buildChartOption(ds, config);
    const smoothers = (
      option!.series as Array<{ type: string; name?: string; lineStyle?: { color?: string } }>
    ).filter((s) => s.type === "line" && (s.name === "F" || s.name === "M"));
    expect(smoothers).toHaveLength(2);
    expect(smoothers[0].lineStyle?.color).not.toBe(smoothers[1].lineStyle?.color);
  });

  it("Line of Fit with Overlay + categorical X: mean marks + min–max range (no line)", () => {
    // Mimic JMP: TesterID-like categorical X, SerialNumber-like Overlay
    const serial: ColumnMeta = {
      id: "serial",
      name: "SerialNumber",
      dataType: "categorical",
      modelingType: "nominal",
      missingCount: 0,
      uniqueCount: 2,
      hidden: false,
    };
    const tester: ColumnMeta = {
      id: "tester",
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
      uniqueCount: 12,
      hidden: false,
    };
    const ds: Dataset = {
      id: "lof",
      fileName: "lof.csv",
      filePath: null,
      columns: [serial, tester, y],
      columnsData: {
        serial: ["A", "A", "A", "A", "A", "A", "B", "B", "B", "B", "B", "B"],
        tester: ["T1", "T1", "T2", "T2", "T3", "T3", "T1", "T1", "T2", "T2", "T3", "T3"],
        y: [10, 12, 20, 22, 30, 28, 11, 13, 19, 21, 29, 31],
      },
      rowCount: 12,
    };
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: "tester", name: "TesterID" }];
    config.roles.y = [{ columnId: "y", name: "Y" }];
    config.roles.overlay = [{ columnId: "serial", name: "SerialNumber" }];
    config.layers = config.layers.map((l) => ({
      ...l,
      enabled: l.kind === "lineOfFit",
    }));
    const { option } = buildChartOption(ds, config);
    expect(option).not.toBeNull();
    const series = option!.series as Array<{
      type: string;
      name?: string;
      data?: unknown[];
    }>;
    const fitMarks = series.filter(
      (s) => s.type === "scatter" && (s.name === "A" || s.name === "B")
    );
    const bands = series.filter(
      (s) => s.type === "custom" && String(s.name).includes("range")
    );
    const lines = series.filter((s) => s.type === "line");
    expect(fitMarks).toHaveLength(2);
    expect(bands).toHaveLength(2);
    expect(lines).toHaveLength(0);
  });
});
