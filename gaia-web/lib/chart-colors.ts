/** SN별 구분용 팔레트 — 흰 배경 대비 고채도 */
export const SN_COLORS = [
  "#1d4ed8",
  "#dc2626",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#4f46e5",
  "#0d9488",
  "#b45309",
  "#9333ea",
  "#e11d48",
] as const;

export function getSnColor(index: number): string {
  return SN_COLORS[index % SN_COLORS.length];
}
