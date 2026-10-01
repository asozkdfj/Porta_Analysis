import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseCsvText } from "../../src/renderer/src/data/parseCsv";

/**
 * Phase 1 smoke test: parsing and scatter readiness without launching Electron UI.
 * Full Electron launch e2e is added in Phase 4.
 */
test("sample CSV is scatter-ready", async () => {
  const text = readFileSync(
    resolve(__dirname, "../../resources/sample/sample_data.csv"),
    "utf-8"
  );
  const { dataset } = parseCsvText(text, "sample_data.csv");
  expect(dataset.rowCount).toBeGreaterThan(0);
  const numeric = dataset.columns.filter((c) => c.dataType === "numeric");
  expect(numeric.length).toBeGreaterThanOrEqual(2);
});
