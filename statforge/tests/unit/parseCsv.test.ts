import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseCsvText } from "../../src/renderer/src/data/parseCsv";
import { isLimitMetadataLabel } from "../../src/renderer/src/data/limitMetadata";
import { validateRoleDrop } from "../../src/renderer/src/utils/roleValidation";
import { buildScatterOption } from "../../src/renderer/src/charts/buildScatterOption";
import { createDefaultGraphConfig } from "../../src/shared/schemas/types";

describe("limit metadata", () => {
  it("detects upper/lower limit labels", () => {
    expect(isLimitMetadataLabel("Upper Limit ----->")).toBe(true);
    expect(isLimitMetadataLabel("Lower Limit ----->")).toBe(true);
    expect(isLimitMetadataLabel("Measurement Unit ------->")).toBe(true);
    expect(isLimitMetadataLabel("USL")).toBe(true);
    expect(isLimitMetadataLabel("F58HQ6005W20000Y92")).toBe(false);
  });

  it("filters limit rows from parsed CSV", () => {
    const csv = [
      "SerialNumber,value",
      "Upper Limit ----->,200",
      "Lower Limit ----->,10",
      "ABC123,55",
      "DEF456,66",
    ].join("\n");
    const { dataset, warnings } = parseCsvText(csv, "limits.csv");
    expect(dataset.rowCount).toBe(2);
    expect(warnings.some((w) => /메타 행 2개/.test(w))).toBe(true);
    const serial = dataset.columns.find((c) => c.name === "SerialNumber")!;
    const labels = dataset.columnsData[serial.id];
    expect(labels).toEqual(["ABC123", "DEF456"]);
  });

  it("filters measurement unit rows from parsed CSV", () => {
    const csv = [
      "SerialNumber,value",
      "Measurement Unit ------->,mm",
      "Upper Limit ----->,200",
      "SN-1,55",
    ].join("\n");
    const { dataset, warnings } = parseCsvText(csv, "units.csv");
    expect(dataset.rowCount).toBe(1);
    expect(warnings.some((w) => /메타 행 2개/.test(w))).toBe(true);
  });
});

describe("parseCsvText", () => {
  it("parses sample CSV and infers numeric columns", () => {
    const text = readFileSync(
      resolve(__dirname, "../../resources/sample/sample_data.csv"),
      "utf-8"
    );
    const { dataset } = parseCsvText(text, "sample_data.csv");
    expect(dataset.rowCount).toBe(20);
    expect(dataset.columns.length).toBe(6);
    const height = dataset.columns.find((c) => c.name === "height");
    expect(height?.dataType).toBe("numeric");
    expect(height?.modelingType).toBe("continuous");
  });

  it("throws on empty file", () => {
    expect(() => parseCsvText("   ", "empty.csv")).toThrow(/empty/i);
  });
});

describe("validateRoleDrop", () => {
  it("rejects non-numeric size role", () => {
    const result = validateRoleDrop("size", {
      id: "1",
      name: "species",
      dataType: "categorical",
      modelingType: "nominal",
      missingCount: 0,
      uniqueCount: 3,
      hidden: false,
    });
    expect(result.ok).toBe(false);
  });

  it("allows numeric x role", () => {
    const result = validateRoleDrop("x", {
      id: "1",
      name: "height",
      dataType: "numeric",
      modelingType: "continuous",
      missingCount: 0,
      uniqueCount: 10,
      hidden: false,
    });
    expect(result.ok).toBe(true);
  });
});

describe("buildScatterOption", () => {
  it("builds scatter option for numeric x/y", () => {
    const text = readFileSync(
      resolve(__dirname, "../../resources/sample/sample_data.csv"),
      "utf-8"
    );
    const { dataset } = parseCsvText(text, "sample_data.csv");
    const height = dataset.columns.find((c) => c.name === "height")!;
    const weight = dataset.columns.find((c) => c.name === "weight")!;
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: height.id, name: height.name }];
    config.roles.y = [{ columnId: weight.id, name: weight.name }];
    const option = buildScatterOption(dataset, config);
    expect(option).not.toBeNull();
    expect(option?.series).toBeTruthy();
  });

  it("builds scatter option for categorical text axes", () => {
    const text = readFileSync(
      resolve(__dirname, "../../resources/sample/sample_data.csv"),
      "utf-8"
    );
    const { dataset } = parseCsvText(text, "sample_data.csv");
    const species = dataset.columns.find((c) => c.name === "species")!;
    const group = dataset.columns.find((c) => c.name === "group")!;
    const config = createDefaultGraphConfig();
    config.roles.x = [{ columnId: species.id, name: species.name }];
    config.roles.y = [{ columnId: group.id, name: group.name }];
    const option = buildScatterOption(dataset, config);
    expect(option).not.toBeNull();
    const series = option?.series;
    expect(Array.isArray(series) ? series[0] : series).toBeTruthy();
  });
});
