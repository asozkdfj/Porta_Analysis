/** Golden Socket 후보 64개 (A01~H08) */
const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export const CANONICAL_GOLDEN_SOCKETS: string[] = ROWS.flatMap((row) =>
  Array.from({ length: 8 }, (_, i) => `${row}${String(i + 1).padStart(2, "0")}`)
);

export const GOLDEN_DELTA_LIMIT_OPTIONS = [0.5, 1.0, 2.0] as const;

export type GoldenDeltaLimit = (typeof GOLDEN_DELTA_LIMIT_OPTIONS)[number];

export type GoldenComparisonResult = "PASS" | "WARNING" | "FAIL" | "N/A";

export type GoldenFilter =
  | "all"
  | "pass"
  | "warning"
  | "fail"
  | "within_golden"
  | "outside_golden";

/** CSV TesterID ↔ Golden Socket (D05, G_01, AiO_G_05 등) 매칭용 정규화 */
export function normalizeSocketLabel(socket: string): string {
  const s = socket.trim().toUpperCase();
  const tail = s.match(/([A-H])[_\s-]?0?(\d{1,2})$/)?.[0];
  if (tail) {
    const m = tail.match(/([A-H])[_\s-]?0?(\d{1,2})$/);
    if (m) return `${m[1]}${m[2].padStart(2, "0")}`;
  }
  const direct = s.match(/^([A-H])(\d{1,2})$/);
  if (direct) return `${direct[1]}${direct[2].padStart(2, "0")}`;
  return s.replace(/[^A-Z0-9]/g, "");
}

export function socketsMatch(csvSocket: string, goldenSocket: string): boolean {
  if (!csvSocket || !goldenSocket) return false;
  if (csvSocket.trim() === goldenSocket.trim()) return true;
  if (csvSocket.toUpperCase() === goldenSocket.toUpperCase()) return true;
  return normalizeSocketLabel(csvSocket) === normalizeSocketLabel(goldenSocket);
}

export function goldenFilterLabel(filter: GoldenFilter): string {
  switch (filter) {
    case "all":
      return "ALL";
    case "pass":
      return "PASS";
    case "warning":
      return "WARNING";
    case "fail":
      return "FAIL";
    case "within_golden":
      return "Within Golden Limit";
    case "outside_golden":
      return "Outside Golden Limit";
  }
}
