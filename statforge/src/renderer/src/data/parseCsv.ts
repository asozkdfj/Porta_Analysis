import Papa from "papaparse";
import type {
  CellValue,
  ColumnMeta,
  DataType,
  Dataset,
  ModelingType,
} from "@shared/schemas/types";
import { filterLimitMetadataRows } from "./limitMetadata";

const BOOLEAN_TRUE = new Set(["true", "t", "yes", "y", "1"]);
const BOOLEAN_FALSE = new Set(["false", "f", "no", "n", "0"]);

function isMissing(raw: string): boolean {
  const v = raw.trim();
  return v === "" || v.toLowerCase() === "na" || v.toLowerCase() === "null" || v === ".";
}

function looksLikeDate(value: string): boolean {
  if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(value) && !/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(value)) {
    return false;
  }
  const t = Date.parse(value);
  return !Number.isNaN(t);
}

function looksLikeDateTime(value: string): boolean {
  return looksLikeDate(value) && /\d{1,2}:\d{2}/.test(value);
}

function inferColumnType(samples: string[]): {
  dataType: DataType;
  modelingType: ModelingType;
} {
  const nonMissing = samples.filter((s) => !isMissing(s));
  if (nonMissing.length === 0) {
    return { dataType: "character", modelingType: "nominal" };
  }

  let numeric = 0;
  let booleanCount = 0;
  let dateCount = 0;
  let dateTimeCount = 0;

  for (const raw of nonMissing.slice(0, 200)) {
    const v = raw.trim();
    const lower = v.toLowerCase();
    // Prefer numeric parse before boolean — industrial CSVs often use 0/1 flags
    // alongside continuous measurements; "0"/"1" alone should not force boolean.
    const n = Number(v.replace(/,/g, ""));
    if (v !== "" && Number.isFinite(n) && !/[a-z]/i.test(v.replace(/[eE][+-]?\d+/, ""))) {
      // pure numeric tokens (incl. scientific) count as numeric
      if (!/^(true|false|t|f|yes|no|y|n)$/i.test(v)) {
        numeric += 1;
        continue;
      }
    }
    if (BOOLEAN_TRUE.has(lower) || BOOLEAN_FALSE.has(lower)) {
      booleanCount += 1;
      continue;
    }
    if (looksLikeDateTime(v)) {
      dateTimeCount += 1;
      continue;
    }
    if (looksLikeDate(v)) {
      dateCount += 1;
      continue;
    }
  }

  const total = nonMissing.slice(0, 200).length;
  const ratio = (n: number) => n / total;

  if (ratio(booleanCount) > 0.9 && ratio(numeric) < 0.5) {
    return { dataType: "boolean", modelingType: "nominal" };
  }
  if (ratio(dateTimeCount) > 0.8) {
    return { dataType: "datetime", modelingType: "continuous" };
  }
  if (ratio(dateCount) > 0.8) {
    return { dataType: "date", modelingType: "continuous" };
  }
  if (ratio(numeric) >= 0.6) {
    return { dataType: "numeric", modelingType: "continuous" };
  }

  const unique = new Set(nonMissing.map((s) => s.trim())).size;
  if (unique <= Math.max(20, nonMissing.length * 0.05)) {
    return { dataType: "categorical", modelingType: "nominal" };
  }
  return { dataType: "character", modelingType: "nominal" };
}

function coerceValue(raw: string, dataType: DataType): CellValue {
  if (isMissing(raw)) return null;
  const v = raw.trim();
  switch (dataType) {
    case "numeric": {
      const n = Number(v.replace(/,/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    case "boolean": {
      const lower = v.toLowerCase();
      if (BOOLEAN_TRUE.has(lower)) return true;
      if (BOOLEAN_FALSE.has(lower)) return false;
      return null;
    }
    case "date":
    case "datetime": {
      const t = Date.parse(v);
      return Number.isNaN(t) ? null : t;
    }
    default:
      return v;
  }
}

export interface ParseCsvResult {
  dataset: Dataset;
  warnings: string[];
}

export function parseCsvText(
  text: string,
  fileName: string,
  filePath: string | null = null
): ParseCsvResult {
  const warnings: string[] = [];
  if (!text || text.trim().length === 0) {
    throw new Error("The file is empty.");
  }

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    warnings.push(`CSV parse warning: ${first.message}`);
  }

  const rowsRaw = parsed.data;
  if (rowsRaw.length === 0) {
    throw new Error("No data rows found in the file.");
  }

  const headers = parsed.meta.fields?.filter((h) => h && h.length > 0) ?? [];
  if (headers.length === 0) {
    throw new Error("No column headers found.");
  }

  const { kept: rows, removedCount } = filterLimitMetadataRows(rowsRaw, headers);
  if (removedCount > 0) {
    warnings.push(
      `Upper/Lower Limit·Measurement Unit 등 메타 행 ${removedCount}개를 자동으로 제외했습니다.`
    );
  }
  if (rows.length === 0) {
    throw new Error("No data rows left after removing limit/spec metadata rows.");
  }

  const columns: ColumnMeta[] = [];
  const columnsData: Record<string, CellValue[]> = {};

  for (const name of headers) {
    const samples = rows.map((r) => String(r[name] ?? ""));
    const inferred = inferColumnType(samples);
    const missingCount = samples.filter((s) => isMissing(s)).length;
    const uniqueCount = new Set(
      samples.filter((s) => !isMissing(s)).map((s) => s.trim())
    ).size;
    const id = `col_${columns.length}_${name.replace(/\W+/g, "_")}`;
    columns.push({
      id,
      name,
      dataType: inferred.dataType,
      modelingType: inferred.modelingType,
      missingCount,
      uniqueCount,
      hidden: false,
    });
    columnsData[id] = samples.map((s) => coerceValue(s, inferred.dataType));
  }

  const dataset: Dataset = {
    id: `ds_${Date.now()}`,
    fileName,
    filePath,
    columns,
    columnsData,
    rowCount: rows.length,
  };

  return { dataset, warnings };
}

export function getNumericColumnValues(
  dataset: Dataset,
  columnId: string
): Array<number | null> {
  const values = dataset.columnsData[columnId] ?? [];
  return values.map((v) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "string") {
      const n = Number(v.replace(/,/g, "").trim());
      return Number.isFinite(n) ? n : null;
    }
    return null;
  });
}

/** True when at least some values coerce to finite numbers. */
export function columnHasNumericValues(dataset: Dataset, columnId: string): boolean {
  return getNumericColumnValues(dataset, columnId).some((v) => v != null);
}
