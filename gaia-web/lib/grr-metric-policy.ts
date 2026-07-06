/**
 * GAIA GRR 분석 — Metric(Test Item) 선정 원칙
 *
 * 이 파일이 GRR Metric 정책의 단일 기준(Single Source of Truth)입니다.
 * GRR 대시보드(/), Metric 필터, Spec Summary 관련 변경 시 반드시 이 원칙을 따릅니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 원칙 1. Metric 출처 = Reference 파일(GrrConfig)만
 *   - 분석 대상 Test Item은 CSV 헤더 전체가 아니라
 *     Reference 파일에 등록된 Item 목록에서만 선정합니다.
 *   - CSV 헤더는 Reference Item과 매칭(resolve)하는 용도로만 사용합니다.
 *
 * 원칙 2. Metric = Reference Item ∩ CSV Header ∩ Analysis Group
 *   - Reference Item이 현재 Analysis Group 분류에 맞아야 합니다.
 *   - 해당 Item이 CSV에서 resolve된 실제 Header가 있어야 합니다.
 *   - 세 조건을 모두 만족할 때만 Metric 목록에 포함합니다.
 *
 * 원칙 3. Fallback 금지
 *   - Reference 미로드, 그룹 매칭 없음, CSV 교집합 없음 → Metric 빈 목록
 *   - CSV 헤더 패턴(GROUP_PATTERNS)만으로 Metric을 채우지 않습니다.
 *
 * 원칙 4. Analysis Group 분류는 별도 레이어
 *   - GROUP_PATTERNS / FORCE_LIW_TOKENS(lib/groups.ts)는
 *     Reference Item을 어느 그룹 탭에 보여줄지 분류합니다.
 *   - 분류 규칙이 Metric 출처를 Reference가 아닌 CSV로 바꾸지 않습니다.
 *
 * 원칙 5. Spec / GRR 판정
 *   - Upper/Lower ERS, GRR Stdev, GRR Limit은 Reference(GrrConfig) 기준
 *   - ERS는 GRR PCT Error 판정에 사용하지 않음 (별도 Stat2 규칙)
 *
 * 구현 위치: lib/metric-filter.ts → findMetricsWithGrrConfig()
 * 그룹 분류: lib/groups.ts → matchHeaderForGroup()
 * ─────────────────────────────────────────────────────────────
 */

/** Reference(GrrConfig) 기준 Metric 필터 결과 출처 */
export type MetricFilterSource =
  | "grrconfig"
  | "no_config"
  | "no_match";

export const GRR_METRIC_POLICY = {
  /** Metric은 Reference 파일 Item에서만 선정 */
  metricSource: "grrconfig_only" as const,
  /** CSV 헤더 단독 Fallback 비허용 */
  allowHeaderOnlyFallback: false,
} as const;

export function metricFilterSourceLabel(source: MetricFilterSource | null): string {
  switch (source) {
    case "grrconfig":
      return "Reference(GrrConfig) 기준";
    case "no_config":
      return "Reference 미로드 — Metric 없음";
    case "no_match":
      return "Reference ∩ CSV ∩ 그룹 결과 없음";
    default:
      return "";
  }
}
