import type { TemperatureBranch, TemperatureLimits } from "./temperature-tracking-types";

/** NTC 온도 헤더 검색 토큰 */
export const NTC_TEMP_HEADER_TOKEN = "NTC_TEMP_PRE_25MA_70MA_AVG";

/** Delta Temp < PASS → PASS */
export const TEMP_PASS_DELTA = 2;

/** PASS ≤ Delta < WARNING → WARNING */
export const TEMP_WARNING_DELTA = 5;

/** 분기별 고정 Spec 한계 (°C) — CSV 값 무시 */
export const BRANCH_FIXED_LIMITS: Record<TemperatureBranch, TemperatureLimits> = {
  "20C": { lower: 17, upper: 23, target: 20 },
  "50C": { lower: 47, upper: 53, target: 50 },
};

/** 차트 X축 전체 소켓 그리드 — A~H × 01~08 */
export const SOCKET_LETTER_RANGE = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
] as const;
export const SOCKET_SLOT_COUNT = 8;

/** @deprecated BRANCH_FIXED_LIMITS 사용 */
export const BRANCH_FALLBACK_LIMITS = BRANCH_FIXED_LIMITS;
