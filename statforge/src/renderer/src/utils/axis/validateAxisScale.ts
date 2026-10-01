import type {
  AxisConfig,
  AxisId,
  AxisScaleConfig,
  AxisScaleType,
} from "@shared/schemas/axis";

export type AxisValidationIssue = {
  field: "minimum" | "maximum" | "tickIncrement" | "scaleType" | "general";
  message: string;
};

export type AxisValidationResult = {
  valid: boolean;
  errors: AxisValidationIssue[];
  warnings: AxisValidationIssue[];
};

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

export function parseAxisBound(
  value: number | string | null | undefined
): number | null {
  return toFiniteNumber(value);
}

/**
 * Validate axis scale config for Apply/OK enablement.
 * Linear numeric validation is fully enforced; category/time are lightly checked.
 */
export function validateAxisScale(
  scale: AxisScaleConfig,
  axisId: AxisId,
  options?: { isNumericAxis?: boolean }
): AxisValidationResult {
  const errors: AxisValidationIssue[] = [];
  const warnings: AxisValidationIssue[] = [];
  const isNumeric = options?.isNumericAxis !== false;

  if (scale.scaleType === "log" && !isNumeric) {
    errors.push({
      field: "scaleType",
      message: "로그 축은 숫자형 축에서만 사용할 수 있습니다.",
    });
  }

  if (scale.rangeMode === "manual") {
    const min = toFiniteNumber(scale.minimum);
    const max = toFiniteNumber(scale.maximum);

    if (scale.minimum === "" || scale.minimum == null) {
      errors.push({ field: "minimum", message: "Minimum 값이 필요합니다." });
    } else if (min == null) {
      errors.push({
        field: "minimum",
        message: "Minimum은 유효한 숫자여야 합니다.",
      });
    }

    if (scale.maximum === "" || scale.maximum == null) {
      errors.push({ field: "maximum", message: "Maximum 값이 필요합니다." });
    } else if (max == null) {
      errors.push({
        field: "maximum",
        message: "Maximum은 유효한 숫자여야 합니다.",
      });
    }

    if (min != null && max != null) {
      if (min >= max) {
        errors.push({
          field: "minimum",
          message: "Minimum은 Maximum보다 작아야 합니다.",
        });
      }
      if (scale.scaleType === "log") {
        if (min <= 0) {
          errors.push({
            field: "minimum",
            message: "로그 축은 0보다 큰 값만 표시할 수 있습니다.",
          });
        }
        if (max <= 0) {
          errors.push({
            field: "maximum",
            message: "로그 축은 0보다 큰 값만 표시할 수 있습니다.",
          });
        }
      }
    }
  }

  if (scale.tickMode === "manual") {
    const inc = toFiniteNumber(scale.tickIncrement);
    if (inc == null || inc <= 0) {
      errors.push({
        field: "tickIncrement",
        message: "Tick Increment는 0보다 커야 합니다.",
      });
    } else {
      const min =
        scale.rangeMode === "manual"
          ? toFiniteNumber(scale.minimum)
          : null;
      const max =
        scale.rangeMode === "manual"
          ? toFiniteNumber(scale.maximum)
          : null;
      if (min != null && max != null) {
        const count = Math.floor((max - min) / inc) + 1;
        if (count > 1000) {
          errors.push({
            field: "tickIncrement",
            message:
              "현재 간격으로 너무 많은 눈금이 생성됩니다. 더 큰 간격을 입력하세요.",
          });
        } else if (count > 500) {
          warnings.push({
            field: "tickIncrement",
            message: `눈금이 ${count}개입니다. 권장 최대는 500개입니다.`,
          });
        }
      }
    }
  }

  void axisId;
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateAxisConfig(
  axis: AxisConfig,
  options?: { isNumericAxis?: boolean }
): AxisValidationResult {
  return validateAxisScale(axis.scale, axis.id, options);
}

export function inferScaleType(params: {
  isContinuous: boolean;
  dataType?: string;
}): AxisScaleType {
  if (params.dataType === "date" || params.dataType === "datetime") return "time";
  if (!params.isContinuous) return "category";
  return "linear";
}
