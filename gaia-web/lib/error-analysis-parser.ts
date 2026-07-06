import Papa from "papaparse";
import { normalizeSocketLabel } from "./golden-socket-config";
import type { ErrorAnalysisRecord, ErrorPassFail } from "./error-analysis-types";
import { resolveErrorDistributionGroup } from "./error-analysis-types";

const BARCODE_KEYS = ["serialnumber", "barcode"];
const SOCKET_KEYS = ["testerid", "socket"];
const STATUS_KEYS = ["test pass/fail status", "pass/fail", "status", "result"];
const FAILING_KEYS = ["failing items", "failing item", "fail items"];
const ERROR_MSG_KEYS = ["errstr", "error message", "errormessage", "message"];
const TIMESTAMP_KEYS = ["timestamp", "time stamp"];
const START_TIME_KEYS = ["starttime", "start time"];
const END_TIME_KEYS = ["endtime", "end time"];
const TEST_TIME_KEYS = ["testtime", "test time"];
const STATION_KEYS = ["station", "station number", "station no", "stationno"];
const STAGE_KEYS = [
  "prox::mod_init_stage",
  "stage",
  "stagename",
  "mod_init_stage",
];

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

function findKey(headers: string[], candidates: string[]): string | null {
  const map = new Map(headers.map((h) => [normKey(h), h]));
  for (const c of candidates) {
    const hit = map.get(c);
    if (hit) return hit;
  }
  return null;
}

function isSpecRow(row: string[], statusIdx: number): boolean {
  if (!row.length) return true;
  const first = (row[0] ?? "").trim();
  if (!first || first.startsWith("Measurement")) return true;
  if (statusIdx >= 0) {
    const st = (row[statusIdx] ?? "").trim().toUpperCase();
    if (!st || st === "NA") return true;
  }
  return false;
}

function parseStatus(raw: string): ErrorPassFail | null {
  const s = raw.trim().toUpperCase();
  if (s === "PASS") return "PASS";
  if (s === "FAIL") return "FAIL";
  return null;
}

function splitFailingItems(raw: string): string[] {
  if (!raw.trim()) return [];
  const parts = raw
    .split(/[;,|]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function shortItemLabel(item: string): string {
  const stripped = item.replace(/^PROX::MOD_/, "").replace(/^PROX::/, "");
  return stripped || item;
}

function parseTestTimeSec(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** CSV 시각 문자열 → epoch ms (파싱 실패 시 null) */
export function parseErrorDateTimeMs(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();

  const isoLike = s.replace(" ", "T");
  const direct = Date.parse(isoLike);
  if (Number.isFinite(direct)) return direct;

  const m = s.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2}):(\d{2})/
  );
  if (m) {
    const d = new Date(
      parseInt(m[1]!, 10),
      parseInt(m[2]!, 10) - 1,
      parseInt(m[3]!, 10),
      parseInt(m[4]!, 10),
      parseInt(m[5]!, 10),
      parseInt(m[6]!, 10)
    );
    const t = d.getTime();
    return Number.isFinite(t) ? t : null;
  }

  return null;
}

export function parseStationNumber(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  const direct = Number(s.replace(/,/g, ""));
  if (Number.isFinite(direct) && direct > 0) return Math.trunc(direct);
  const m = s.match(/(?:station\s*)?(\d+)/i);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseStageFromSocket(socket: string): string {
  const norm = normalizeSocketLabel(socket);
  if (/^[A-H]\d{2}$/.test(norm)) return norm[0];
  const m = socket.match(/([A-H])[_\s-]?0?\d{1,2}$/i);
  if (m) return m[1].toUpperCase();
  return "—";
}

function parseSocketNum(socket: string): number {
  const norm = normalizeSocketLabel(socket);
  const m = norm.match(/^[A-H](\d{2})$/);
  if (m) return parseInt(m[1], 10);
  const tail = socket.match(/(\d{1,2})$/);
  return tail ? parseInt(tail[1], 10) : 0;
}

export interface ParsedErrorCsv {
  fileName: string;
  records: ErrorAnalysisRecord[];
}

function buildRecord(
  row: Record<string, string>,
  keys: {
    barcode: string;
    socket: string;
    status: string;
    failing: string | null;
    errorMsg: string | null;
    timestamp: string | null;
    startTime: string | null;
    endTime: string | null;
    testTime: string | null;
    station: string | null;
    stage: string | null;
  },
  runIndex: number
): ErrorAnalysisRecord | null {
  const barcode = (row[keys.barcode] ?? "").trim();
  if (!barcode) return null;

  const status = parseStatus(row[keys.status] ?? "");
  if (!status) return null;

  const socketRaw = (row[keys.socket] ?? "").trim();
  const socket = normalizeSocketLabel(socketRaw || "—");
  const stageRaw = keys.stage ? (row[keys.stage] ?? "").trim() : "";
  const stage =
    stageRaw && stageRaw !== "NA" ? stageRaw.toUpperCase() : parseStageFromSocket(socketRaw);

  let failingItems = keys.failing
    ? splitFailingItems(row[keys.failing] ?? "")
    : [];
  const errorMessage = keys.errorMsg
    ? (row[keys.errorMsg] ?? "").trim() || null
    : null;

  failingItems = failingItems.map(shortItemLabel);

  let primaryFailItem = "";
  if (status === "FAIL") {
    if (errorMessage) {
      primaryFailItem = shortItemLabel(errorMessage);
    } else if (failingItems.length > 0) {
      primaryFailItem = failingItems[0]!;
    } else {
      primaryFailItem = "UNKNOWN";
    }
    if (failingItems.length === 0) {
      failingItems = [primaryFailItem];
    }
  }

  const startTime = keys.startTime
    ? (row[keys.startTime] ?? "").trim()
    : "";
  const endTime = keys.endTime ? (row[keys.endTime] ?? "").trim() : "";
  const timestamp = keys.timestamp
    ? (row[keys.timestamp] ?? "").trim()
    : startTime;

  const testTimeSec = keys.testTime
    ? parseTestTimeSec(row[keys.testTime])
    : null;

  const station = keys.station
    ? parseStationNumber(row[keys.station])
    : null;

  const analysisGroups =
    status === "FAIL"
      ? [resolveErrorDistributionGroup(primaryFailItem)]
      : [];

  return {
    id: `run-${runIndex}`,
    runIndex,
    barcode,
    socketRaw,
    socket,
    stage,
    status,
    failingItems,
    errorMessage,
    primaryFailItem,
    timestamp,
    startTime,
    endTime,
    testTimeSec,
    station,
    analysisGroups,
  };
}

function detectGaiaFormat(rows: string[][]): boolean {
  if (rows.length < 5) return false;
  const h = rows[0].map((x) => normKey(x));
  const hasFailing = h.some((x) => FAILING_KEYS.includes(x));
  const row4Status = (rows[4]?.[1] ?? "").trim().toUpperCase();
  return hasFailing && (row4Status === "PASS" || row4Status === "FAIL");
}

export function parseErrorAnalysisCsv(
  csvText: string,
  fileName: string
): ParsedErrorCsv {
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? "CSV 파싱 오류");
  }

  const rows = parsed.data.filter((r) => r.some((c) => c?.trim()));
  if (rows.length < 2) {
    throw new Error("CSV 데이터가 부족합니다.");
  }

  const isGaia = detectGaiaFormat(rows);
  const headerRow = rows[0].map((h) => h.trim());
  const dataRows = isGaia ? rows.slice(4) : rows.slice(1);

  const barcodeKey = findKey(headerRow, BARCODE_KEYS);
  const socketKey = findKey(headerRow, SOCKET_KEYS);
  const statusKey = findKey(headerRow, STATUS_KEYS);
  const failingKey = findKey(headerRow, FAILING_KEYS);
  const errorMsgKey = findKey(headerRow, ERROR_MSG_KEYS);
  const timestampKey = findKey(headerRow, TIMESTAMP_KEYS);
  const startTimeKey = findKey(headerRow, START_TIME_KEYS);
  const endTimeKey = findKey(headerRow, END_TIME_KEYS);
  const testTimeKey = findKey(headerRow, TEST_TIME_KEYS);
  const stationKey = findKey(headerRow, STATION_KEYS);
  const stageKey = findKey(headerRow, STAGE_KEYS);

  if (!barcodeKey) {
    throw new Error("Barcode(SerialNumber) 컬럼을 찾을 수 없습니다.");
  }
  if (!statusKey) {
    throw new Error("Test Pass/Fail Status 컬럼을 찾을 수 없습니다.");
  }
  if (!failingKey && !errorMsgKey) {
    throw new Error(
      '"Failing Items" 또는 errStr(Error Message) 컬럼이 필요합니다.'
    );
  }

  const keys = {
    barcode: barcodeKey,
    socket: socketKey ?? barcodeKey,
    status: statusKey,
    failing: failingKey,
    errorMsg: errorMsgKey,
    timestamp: timestampKey,
    startTime: startTimeKey,
    endTime: endTimeKey,
    testTime: testTimeKey,
    station: stationKey,
    stage: stageKey,
  };

  const statusIdx = headerRow.indexOf(statusKey);
  const records: ErrorAnalysisRecord[] = [];
  let runIndex = 0;

  for (const rowArr of dataRows) {
    if (isSpecRow(rowArr, statusIdx)) continue;

    const row: Record<string, string> = {};
    headerRow.forEach((h, i) => {
      row[h] = (rowArr[i] ?? "").trim();
    });

    runIndex += 1;
    const rec = buildRecord(row, keys, runIndex);
    if (rec) records.push(rec);
  }

  if (records.length === 0) {
    throw new Error("유효한 Test Run 데이터가 없습니다.");
  }

  return { fileName, records };
}

export { parseSocketNum, parseStageFromSocket };
