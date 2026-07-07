import Papa from "papaparse";
import type { MiniJmpColumn, MiniJmpColumnKind, MiniJmpDataset } from "./mini-jmp-types";

const DATE_PATTERNS = [
  /^\d{4}[-/]\d{1,2}[-/]\d{1,2}[ T]\d{1,2}:\d{2}/,
  /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
];

function parseNumeric(raw: string): number | null {
  const s = raw.trim().replace(/,/g, "").replace(/\s*(ms|s|sec|seconds?)$/i, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDateTimeMs(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const direct = Date.parse(s.replace(" ", "T"));
  if (Number.isFinite(direct)) return direct;
  for (const pat of DATE_PATTERNS) {
    if (pat.test(s)) {
      const t = Date.parse(s.replace(" ", "T"));
      if (Number.isFinite(t)) return t;
    }
  }
  return null;
}

const DATETIME_NAME_HINTS =
  /^(starttime|endtime|timestamp|time\s*stamp|datetime|date\s*time)/i;
const NUMERIC_NAME_HINTS =
  /^(testtime|test_time|elapsed|duration|uph|run\s*index|index|count|errcode)/i;

const BOOLEAN_VALUES = new Set([
  "true",
  "false",
  "pass",
  "fail",
  "ok",
  "ng",
  "yes",
  "no",
  "y",
  "n",
  "1",
  "0",
]);

function isBooleanLike(values: string[]): boolean {
  const samples = values.filter((v) => v.trim()).slice(0, 200);
  if (samples.length === 0) return false;
  let hits = 0;
  for (const v of samples) {
    if (BOOLEAN_VALUES.has(v.trim().toLowerCase())) hits += 1;
  }
  return hits / samples.length >= 0.85;
}

function inferColumnKind(values: string[], columnName = ""): MiniJmpColumnKind {
  const samples = values.filter((v) => v.trim()).slice(0, 200);
  if (samples.length === 0) return "string";

  if (isBooleanLike(samples)) return "boolean";

  let numericHits = 0;
  let dateHits = 0;

  for (const v of samples) {
    if (parseNumeric(v) != null) numericHits += 1;
    if (parseDateTimeMs(v) != null) dateHits += 1;
  }

  const ratio = samples.length;
  const name = columnName.trim();

  if (DATETIME_NAME_HINTS.test(name) && dateHits / ratio >= 0.5) {
    return "datetime";
  }
  if (NUMERIC_NAME_HINTS.test(name) && numericHits / ratio >= 0.5) {
    return "numeric";
  }
  if (dateHits / ratio >= 0.6 && dateHits > numericHits) return "datetime";
  if (numericHits / ratio >= 0.7) return "numeric";
  return "string";
}

function detectGaiaFormat(rows: string[][]): boolean {
  if (rows.length < 5) return false;
  const h = rows[0]?.map((c) => c.trim().toLowerCase()) ?? [];
  return (
    h.includes("serialnumber") ||
    h.includes("barcode") ||
    h.includes("test pass/fail status")
  );
}

export function getCellValue(row: Record<string, string>, column: string): string {
  return (row[column] ?? "").trim();
}

export function getNumericValue(row: Record<string, string>, column: string): number | null {
  return parseNumeric(getCellValue(row, column));
}

export function getDateTimeMs(row: Record<string, string>, column: string): number | null {
  return parseDateTimeMs(getCellValue(row, column));
}

export function getXNumeric(
  row: Record<string, string>,
  column: string,
  kind: MiniJmpColumnKind,
  runIndex: number
): number | null {
  if (kind === "numeric") return getNumericValue(row, column);
  if (kind === "datetime") return getDateTimeMs(row, column);
  return runIndex;
}

export function buildDatasetFromMatrix(
  rawRows: string[][],
  fileName: string
): MiniJmpDataset {
  const rowsFiltered = rawRows.filter((r) => r.some((c) => c?.trim()));
  if (rowsFiltered.length < 2) {
    throw new Error("헤더와 데이터 행이 필요합니다.");
  }

  const isGaia = detectGaiaFormat(rowsFiltered);
  const headerRow = rowsFiltered[0].map((h) => h.trim());
  const dataRows = isGaia ? rowsFiltered.slice(4) : rowsFiltered.slice(1);

  const rows: Record<string, string>[] = [];
  for (const rowArr of dataRows) {
    if (!rowArr.some((c) => c?.trim())) continue;
    const row: Record<string, string> = {};
    headerRow.forEach((h, i) => {
      row[h] = (rowArr[i] ?? "").trim();
    });
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error("유효한 데이터 행이 없습니다.");
  }

  const totalRows = rows.length;
  const columns: MiniJmpColumn[] = headerRow.map((name, index) => {
    const values = rows.map((r) => r[name] ?? "");
    const nonEmpty = values.filter((v) => v.trim());
    const unique = new Set(nonEmpty);
    return {
      name,
      kind: inferColumnKind(values, name),
      index,
      nonEmptyCount: nonEmpty.length,
      missingCount: totalRows - nonEmpty.length,
      uniqueCount: unique.size,
      sampleValues: nonEmpty.slice(0, 3),
    };
  });

  return { fileName, headers: headerRow, columns, rows };
}

export function parseMiniJmpCsv(text: string, fileName: string): MiniJmpDataset {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? "CSV 파싱 오류");
  }

  const rawRows = parsed.data.filter((r) => r.some((c) => c?.trim()));
  return buildDatasetFromMatrix(rawRows, fileName);
}

export function columnByName(
  columns: MiniJmpColumn[],
  name: string | null
): MiniJmpColumn | null {
  if (!name) return null;
  return columns.find((c) => c.name === name) ?? null;
}
