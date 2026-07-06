import type { ParsedCsv } from "./types";

export interface TestRunIdentity {
  runId: string;
  rowIndex: number;
  barcode: string;
  socket: string;
  timestamp: string;
  testSequence: number;
  attemptLabel: string;
}

export interface RetestSummary {
  totalTests: number;
  uniqueBarcodes: number;
  retestCount: number;
  retestRate: number;
  passAfterRetest: number;
  failAfterRetest: number;
}

export function getRunTimestamp(row: Record<string, string>): string {
  return (row.StartTime || row.timeStamp || row.EndTime || "").trim();
}

export function barcodeSocketKey(barcode: string, socket: string): string {
  return `${barcode}|${socket}`;
}

/** Barcode + Socket + Timestamp + rowIndex — 각 CSV 행을 고유하게 식별 */
export function buildRunId(parsed: ParsedCsv, rowIndex: number): string {
  const row = parsed.rows[rowIndex];
  const barcode = row[parsed.serialKey]?.trim() || "";
  const socket = row[parsed.socketKey]?.trim() || "";
  const timestamp = getRunTimestamp(row);
  return `${barcode}|${socket}|${timestamp}|${rowIndex}`;
}

export type RunLabelMode = "retest" | "repeat";

export function formatAttemptLabel(
  sequence: number,
  mode: RunLabelMode = "retest"
): string {
  if (mode === "repeat") return `Run #${sequence}`;
  if (sequence <= 1) return "Test #1";
  return `Retest #${sequence - 1}`;
}

/** 동일 Barcode+Socket 내 시간순 testSequence / 라벨 부여 */
export function annotateRunSequences(
  rowIndexes: number[],
  parsed: ParsedCsv,
  labelMode: RunLabelMode = "retest"
): Map<number, { testSequence: number; attemptLabel: string }> {
  const groups = new Map<string, number[]>();

  for (const rowIndex of rowIndexes) {
    const row = parsed.rows[rowIndex];
    const barcode = row[parsed.serialKey]?.trim() || "";
    const socket = row[parsed.socketKey]?.trim() || "";
    const key = barcodeSocketKey(barcode, socket);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(rowIndex);
  }

  const result = new Map<number, { testSequence: number; attemptLabel: string }>();

  for (const indexes of groups.values()) {
    const sorted = [...indexes].sort((a, b) => {
      const ta = getRunTimestamp(parsed.rows[a]);
      const tb = getRunTimestamp(parsed.rows[b]);
      if (ta !== tb) return ta.localeCompare(tb);
      return a - b;
    });

    sorted.forEach((rowIndex, i) => {
      const testSequence = i + 1;
      result.set(rowIndex, {
        testSequence,
        attemptLabel: formatAttemptLabel(testSequence, labelMode),
      });
    });
  }

  return result;
}

export function buildTestRunIdentity(
  parsed: ParsedCsv,
  rowIndex: number,
  sequenceMap?: Map<number, { testSequence: number; attemptLabel: string }>
): TestRunIdentity {
  const row = parsed.rows[rowIndex];
  const barcode = row[parsed.serialKey]?.trim() || "";
  const socket = row[parsed.socketKey]?.trim() || "";
  const seq = sequenceMap?.get(rowIndex) ?? { testSequence: 1, attemptLabel: "Test #1" };

  return {
    runId: buildRunId(parsed, rowIndex),
    rowIndex,
    barcode,
    socket,
    timestamp: getRunTimestamp(row) || "—",
    testSequence: seq.testSequence,
    attemptLabel: seq.attemptLabel,
  };
}

export function computeRetestSummary<
  T extends {
    barcode: string;
    socket: string;
    testSequence: number;
  },
>(
  rows: T[],
  isPass: (row: T) => boolean
): RetestSummary {
  const totalTests = rows.length;
  const uniqueBarcodes = new Set(rows.map((r) => r.barcode)).size;
  const retests = rows.filter((r) => r.testSequence > 1);
  const retestCount = retests.length;
  const retestRate = totalTests > 0 ? (retestCount / totalTests) * 100 : 0;
  const passAfterRetest = retests.filter(isPass).length;
  const failAfterRetest = retests.filter((r) => !isPass(r)).length;

  return {
    totalTests,
    uniqueBarcodes,
    retestCount,
    retestRate,
    passAfterRetest,
    failAfterRetest,
  };
}
