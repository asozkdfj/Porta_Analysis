/** GRR 배치당 고정 모듈(Barcode) 수 */
export const GRR_MODULE_COUNT = 8;

/** WL_CENTER / NTC PO 스텝 기대 포인트 수 */
export const GRR_STEP_POINT_COUNT = 37;

/** WL_CENTER 초기 고정 구간 (Index 0~10, 값 1130 고정) — 판정 제외 */
export const WL_CENTER_SKIP_POINT_COUNT = 11;

/** WL_CENTER 판정 Spec (Index 11~36 구간) — GrrConfig 대신 고정값 사용 */
export const WL_CENTER_SPEC_LOWER = 1119;
export const WL_CENTER_SPEC_UPPER = 1141;

/** NTC 온도 Trend 안정성 — PO 스텝별 Range 상한 (°C) */
export const NTC_TEMP_RANGE_LIMIT = 0.25;

/** Header 검색 토큰 */
export const NTC_TEMP_PRE_SEARCH_TOKEN = "NTC_TEMP_PRE";
export const WL_CENTER_SEARCH_TOKEN = "WL_CENTER";

export function formatGrrModuleSlotLabel(slot: number): string {
  return `M${String(slot).padStart(2, "0")}`;
}

export function wlCenterBranchToken(branch: string): string {
  return `LIW${branch}_WL_CENTER_`;
}
