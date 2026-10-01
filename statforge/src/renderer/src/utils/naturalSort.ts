/**
 * Natural compare for socket / TesterID style labels:
 * "A_01" < "A_02" < "A_10" < "B_01"
 */
export function naturalCompare(a: string, b: string): number {
  const ax = a.trim();
  const bx = b.trim();
  if (ax === bx) return 0;
  return ax.localeCompare(bx, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function naturalSortStrings(values: string[]): string[] {
  return [...values].sort(naturalCompare);
}
