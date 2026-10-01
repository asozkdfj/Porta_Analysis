import { describe, expect, it } from "vitest";
import {
  createAllGroup,
  createGroupXGroups,
  createGroupYGroups,
  intersectRowIndices,
} from "../../src/renderer/src/charts/encoding/group";
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
  const site: ColumnMeta = {
    id: "site",
    name: "Site",
    dataType: "categorical",
    modelingType: "nominal",
    missingCount: 0,
    uniqueCount: 2,
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
    id: "g",
    fileName: "g.csv",
    filePath: null,
    columns: [serial, site, x, y],
    columnsData: {
      serial: ["S1", "S1", "S2", "S2", "S3", "S3"],
      site: ["A", "B", "A", "B", "A", "B"],
      x: ["T1", "T2", "T1", "T2", "T1", "T2"],
      y: [10, 12, 20, 22, 30, 32],
    },
    rowCount: 6,
  };
}

describe("createGroupXGroups / createGroupYGroups", () => {
  it("creates one column group per SerialNumber", () => {
    const ds = makeDataset();
    const { groups } = createGroupXGroups(ds, ds.columns[0]!);
    expect(groups.map((g) => g.key).sort()).toEqual(["S1", "S2", "S3"]);
  });

  it("creates one row group per Site", () => {
    const ds = makeDataset();
    const { groups } = createGroupYGroups(ds, ds.columns[1]!);
    expect(groups.map((g) => g.key).sort()).toEqual(["A", "B"]);
  });
});

describe("intersectRowIndices", () => {
  it("intersects Group X and Group Y filters", () => {
    const ds = makeDataset();
    const gx = createGroupXGroups(ds, ds.columns[0]!).groups.find((g) => g.key === "S1")!;
    const gy = createGroupYGroups(ds, ds.columns[1]!).groups.find((g) => g.key === "A")!;
    expect(intersectRowIndices(gx.rowIndices, gy.rowIndices)).toEqual([0]);
  });

  it("returns empty when either side is empty", () => {
    expect(intersectRowIndices([0, 1], [])).toEqual([]);
  });
});

describe("createAllGroup", () => {
  it("covers every row", () => {
    const ds = makeDataset();
    expect(createAllGroup(ds).rowIndices).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

// Keep createDefaultGraphConfig import used (roles exist for groupX/groupY)
describe("graph roles include groupX/groupY", () => {
  it("defaults to empty group roles", () => {
    const cfg = createDefaultGraphConfig();
    expect(cfg.roles.groupX).toEqual([]);
    expect(cfg.roles.groupY).toEqual([]);
  });
});
