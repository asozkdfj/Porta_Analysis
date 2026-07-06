import Papa from "papaparse";
import type { ParsedCsv } from "./types";

const SERIAL_CANDIDATES = ["serialnumber", "barcode"];
const SOCKET_CANDIDATES = ["testerid", "socket"];

function findKey(headers: string[], candidates: string[]): string {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const idx = normalized.indexOf(c);
    if (idx >= 0) return headers[idx];
  }
  throw new Error(
    `필수 키를 찾을 수 없습니다. (${candidates.join(" 또는 ")})`
  );
}

function parseNumber(value: string | undefined): number | null {
  if (!value || !value.trim()) return null;
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * GAIA CSV 형식:
 * 1행 헤더, 2행 상한, 3행 하한, 4행 단위, 5행+ 데이터
 */
export function parseGaiaCsv(csvText: string): ParsedCsv {
  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? "CSV 파싱 오류");
  }

  const data = parsed.data;
  if (data.length < 5) {
    throw new Error("CSV는 최소 5행(헤더+스펙3+데이터1)이 필요합니다.");
  }

  const headers = data[0].map((h) => h.trim());
  const upperRow = data[1] ?? [];
  const lowerRow = data[2] ?? [];
  const unitRow = data[3] ?? [];

  const upperSpecs: Record<string, number | null> = {};
  const lowerSpecs: Record<string, number | null> = {};
  const units: Record<string, string> = {};

  headers.forEach((h, i) => {
    upperSpecs[h] = parseNumber(upperRow[i]);
    lowerSpecs[h] = parseNumber(lowerRow[i]);
    units[h] = (unitRow[i] ?? "").trim();
  });

  const serialKey = findKey(headers, SERIAL_CANDIDATES);
  const socketKey = findKey(headers, SOCKET_CANDIDATES);

  const rows: Record<string, string>[] = [];
  for (let r = 4; r < data.length; r++) {
    const rowArr = data[r];
    if (!rowArr || rowArr.every((c) => !c?.trim())) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (rowArr[i] ?? "").trim();
    });
    rows.push(row);
  }

  return {
    headers,
    upperSpecs,
    lowerSpecs,
    units,
    rows,
    serialKey,
    socketKey,
  };
}

export function getMetricValue(
  row: Record<string, string>,
  metricHeader: string
): number | null {
  return parseNumber(row[metricHeader]);
}
