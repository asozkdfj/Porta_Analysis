/** 선형성 분석 시작 Position Index (0~3 구간 제외) */
export const LINEARITY_ANALYSIS_MIN_INDEX = 4;

/** 발광 판정 — 분석 구간 Max Value 하한 */
export const EMISSION_ABSOLUTE_MIN_MAX = 5;

/** Dynamic Range = max - min; max × 비율과 절대값 중 큰 값 적용 */
export const EMISSION_MIN_RANGE_RATIO = 0.08;
export const EMISSION_ABSOLUTE_MIN_RANGE = 3;

/** 인접 포인트 증가 비율 하한 */
export const EMISSION_MIN_INCREASE_RATIO = 0.45;

/** 선형성 R² 기준 */
export const LINEARITY_PASS_R2 = 0.99;
export const LINEARITY_FAIL_R2 = 0.95;

/** |Residual| / Dynamic Range 비율 상한 (초과 시 Non Linear) */
export const LINEARITY_MAX_RESIDUAL_RATIO = 0.35;
