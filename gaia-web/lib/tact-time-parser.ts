import Papa from "papaparse";
import type {
  ParsedTactTimeCsv,
  TactTimeLogEntry,
  TactTimeRow,
} from "./tact-time-types";

const LABEL_COLUMN_CANDIDATES = [
  "Label",
  "Header",
  "Item",
  "Test Item",
  "TestItem",
  "Name",
];

const DURATION_COLUMN_CANDIDATES = [
  "DurationMs",
  "Duration(ms)",
  "DurationM",
  "Duration",
  "duration_ms",
  "ElapsedMs",
  "Elapsed",
];

const START_COLUMN_CANDIDATES = [
  "StartLocal",
  "Start Time",
  "StartTime",
  "start_time",
  "Start",
];

const END_COLUMN_CANDIDATES = [
  "EndLocal",
  "End Time",
  "EndTime",
  "end_time",
  "End",
];

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumnKey(
  headers: string[],
  candidates: string[]
): string | null {
  const map = new Map(headers.map((h) => [normalizeKey(h), h]));

  for (const c of candidates) {
    const hit = map.get(normalizeKey(c));
    if (hit) return hit;
  }

  for (const c of candidates) {
    const nc = normalizeKey(c);
    if (nc.length < 4) continue;
    for (const h of headers) {
      const nh = normalizeKey(h);
      if (nh.startsWith(nc) || nc.startsWith(nh)) return h;
    }
  }

  return null;
}

function parseDuration(value: string | undefined): number {
  if (!value?.trim()) return 0;
  const n = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/** Cycle 시작 행 — Total time 없이도 새 DUT 사이클이 시작됨 */
export const TACT_TIME_CYCLE_START_LABEL = "Init_Test_Proc";

export function isTactTimeCycleStartLabel(header: string): boolean {
  return header.trim() === TACT_TIME_CYCLE_START_LABEL;
}

/** CSV Label 컬럼 값이 Cycle 전체 Total Time 행인지 (예: Total time, TotalTime) */
export function isCycleTotalTimeLabel(header: string): boolean {
  const normalized = header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (
    normalized === "totaltime" ||
    normalized === "totaltacttime" ||
    normalized === "totaltact" ||
    normalized === "cycletotaltime" ||
    normalized.startsWith("totaltime") ||
    normalized.endsWith("totaltime") ||
    normalized.includes("totaltact")
  ) {
    return true;
  }
  return (
    normalized.includes("total") &&
    normalized.includes("time") &&
    !normalized.includes("start") &&
    !normalized.includes("end") &&
    !normalized.includes("local")
  );
}

function parseFractionalSeconds(frac: string): number {
  if (!frac) return 0;
  return Number(frac.padEnd(3, "0").slice(0, 3));
}

/**
 * 시간 문자열 → 비교용 ms
 * - HH:mm:ss.SSS (10:00:00.120)
 * - MM:SS.f (19:46.1 — StartLocal/EndLocal 형식)
 */
export function parseTimeLabelToMs(label: string): number {
  const trimmed = label.trim();
  if (!trimmed) return 0;

  const hms = trimmed.match(
    /^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/
  );
  if (hms) {
    const h = Number(hms[1]);
    const m = Number(hms[2]);
    const s = Number(hms[3]);
    const frac = hms[4] ? parseFractionalSeconds(hms[4]) : 0;
    return (h * 3600 + m * 60 + s) * 1000 + frac;
  }

  const ms = trimmed.match(/^(\d{1,3}):(\d{2})(?:\.(\d+))?$/);
  if (ms) {
    const minutes = Number(ms[1]);
    const seconds = Number(ms[2]);
    const frac = ms[3] ? parseFractionalSeconds(ms[3]) : 0;
    return (minutes * 60 + seconds) * 1000 + frac;
  }

  return 0;
}

function mergeRows(existing: TactTimeRow, incoming: TactTimeRow): TactTimeRow {
  const startMsExisting = parseTimeLabelToMs(existing.startTime);
  const startMsIncoming = parseTimeLabelToMs(incoming.startTime);
  const endMsExisting = parseTimeLabelToMs(existing.endTime);
  const endMsIncoming = parseTimeLabelToMs(incoming.endTime);

  let startTime = existing.startTime;
  if (incoming.startTime) {
    if (!existing.startTime || startMsIncoming < startMsExisting) {
      startTime = incoming.startTime;
    }
  }

  let endTime = existing.endTime;
  if (incoming.endTime) {
    if (!existing.endTime || endMsIncoming > endMsExisting) {
      endTime = incoming.endTime;
    }
  }

  return {
    header: existing.header,
    durationMs: existing.durationMs + incoming.durationMs,
    startTime,
    endTime,
    occurrenceCount: (existing.occurrenceCount ?? 1) + 1,
  };
}

/** Total time 행 기준으로 로그를 Cycle 단위로 분할 */
export function splitLogEntriesByTotalTimeMarker(
  entries: TactTimeLogEntry[]
): TactTimeLogEntry[][] {
  if (entries.length === 0) return [];

  const ordered = [...entries].sort((a, b) => a.rowIndex - b.rowIndex);
  const cycles: TactTimeLogEntry[][] = [];
  let current: TactTimeLogEntry[] = [];

  for (const entry of ordered) {
    current.push(entry);
    if (isCycleTotalTimeLabel(entry.header)) {
      cycles.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    cycles.push(current);
  }

  return cycles;
}

/** Setting 카탈로그: 1 Cycle 기준 순서 + 이후 Cycle에만 있는 retry 헤더 */
export function buildSettingCatalogHeaders(
  logEntries: TactTimeLogEntry[]
): string[] {
  const cycles = splitLogEntriesByTotalTimeMarker(logEntries);
  const templateEntries = (cycles[0] ?? logEntries).filter(
    (e) => !isCycleTotalTimeLabel(e.header)
  );

  const result: string[] = [];
  const seen = new Set<string>();

  for (const entry of templateEntries) {
    if (seen.has(entry.header)) continue;
    seen.add(entry.header);
    result.push(entry.header);
  }

  for (const entry of logEntries) {
    if (isCycleTotalTimeLabel(entry.header)) continue;
    if (seen.has(entry.header)) continue;
    seen.add(entry.header);
    result.push(entry.header);
  }

  return result;
}

/** Setting용 row 목록 — 첫 Cycle 기준 + retry로 추가된 헤더 */
export function aggregateSettingRowsFromLogEntries(
  logEntries: TactTimeLogEntry[]
): TactTimeRow[] {
  const byHeader = aggregateRowsFromLogEntries(
    logEntries.filter((e) => !isCycleTotalTimeLabel(e.header))
  );
  const rowMap = new Map(byHeader.map((r) => [r.header, r]));
  const order = buildSettingCatalogHeaders(logEntries);
  return order
    .map((header) => rowMap.get(header))
    .filter((r): r is TactTimeRow => !!r);
}

export function aggregateRowsFromLogEntries(
  logEntries: TactTimeLogEntry[]
): TactTimeRow[] {
  const byLabel = new Map<string, TactTimeRow>();

  for (const entry of logEntries) {
    if (isCycleTotalTimeLabel(entry.header)) continue;

    const incoming: TactTimeRow = {
      header: entry.header,
      durationMs: entry.durationMs,
      startTime: entry.startTime,
      endTime: entry.endTime,
      occurrenceCount: 1,
    };

    const prev = byLabel.get(entry.header);
    if (prev) {
      byLabel.set(entry.header, mergeRows(prev, incoming));
    } else {
      byLabel.set(entry.header, incoming);
    }
  }

  return [...byLabel.values()];
}

export function parseTactTimeCsv(
  csvText: string,
  fileName = "tact-time.csv"
): ParsedTactTimeCsv {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? "CSV 파싱 오류");
  }

  const fields = parsed.meta.fields ?? [];
  if (fields.length === 0) {
    throw new Error("CSV 헤더를 찾을 수 없습니다.");
  }

  const labelKey = findColumnKey(fields, LABEL_COLUMN_CANDIDATES);
  const durationKey = findColumnKey(fields, DURATION_COLUMN_CANDIDATES);
  const startKey = findColumnKey(fields, START_COLUMN_CANDIDATES);
  const endKey = findColumnKey(fields, END_COLUMN_CANDIDATES);

  if (!labelKey) {
    throw new Error(
      `Label(테스트 아이템) 컬럼을 찾을 수 없습니다. 감지된 컬럼: ${fields.join(", ")}`
    );
  }
  if (!durationKey) {
    throw new Error(
      `Duration 컬럼을 찾을 수 없습니다. 감지된 컬럼: ${fields.join(", ")}`
    );
  }

  const byLabel = new Map<string, TactTimeRow>();
  const logEntries: TactTimeLogEntry[] = [];

  parsed.data.forEach((row, rowIndex) => {
    const header = (row[labelKey] ?? "").trim();
    if (!header) return;

    const startTime = startKey ? (row[startKey] ?? "").trim() : "";
    const endTime = endKey ? (row[endKey] ?? "").trim() : "";
    const durationMs = parseDuration(row[durationKey]);

    logEntries.push({
      rowIndex,
      header,
      durationMs,
      startTime,
      endTime,
      startMs: parseTimeLabelToMs(startTime),
      endMs: parseTimeLabelToMs(endTime),
    });

    if (isCycleTotalTimeLabel(header)) return;

    const incoming: TactTimeRow = {
      header,
      durationMs,
      startTime,
      endTime,
      occurrenceCount: 1,
    };

    const prev = byLabel.get(header);
    if (prev) {
      byLabel.set(header, mergeRows(prev, incoming));
    } else {
      byLabel.set(header, incoming);
    }
  });

  const rows = [...byLabel.values()];

  if (rows.length === 0) {
    throw new Error("유효한 Tact Time 행이 없습니다.");
  }

  return { fileName, rows, logEntries };
}
