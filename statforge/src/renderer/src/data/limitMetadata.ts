/**
 * GRR / measurement CSV files often prepend spec / metadata rows such as:
 *   "Upper Limit ----->"
 *   "Lower Limit ----->"
 *   "Measurement Unit ------->"
 * Those should not appear as categories on plot axes.
 */

const METADATA_LABEL_PATTERNS: RegExp[] = [
  /^\s*upper\s*(spec\s*)?limit\b/i,
  /^\s*lower\s*(spec\s*)?limit\b/i,
  /^\s*(usl|lsl|ucl|lcl)\b/i,
  /^\s*(upper|lower)\s*spec\b/i,
  /^\s*measurement\s*unit\b/i,
  /^\s*unit\s*-{2,}>/i,
  /limit\s*-{0,}>\s*$/i,
  /measurement\s*unit\s*-{0,}>\s*$/i,
];

export function isLimitMetadataLabel(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return METADATA_LABEL_PATTERNS.some((re) => re.test(v));
}

export function isLimitMetadataRow(
  row: Record<string, string>,
  headers: string[]
): boolean {
  for (const header of headers) {
    const cell = String(row[header] ?? "");
    if (isLimitMetadataLabel(cell)) return true;
  }
  return false;
}

export function filterLimitMetadataRows<T extends Record<string, string>>(
  rows: T[],
  headers: string[]
): { kept: T[]; removedCount: number } {
  const kept: T[] = [];
  let removedCount = 0;
  for (const row of rows) {
    if (isLimitMetadataRow(row, headers)) {
      removedCount += 1;
      continue;
    }
    kept.push(row);
  }
  return { kept, removedCount };
}
