import type { AxisId, ReferenceLine } from "@shared/schemas/axis";
import { parseAxisBound } from "../axis/validateAxisScale";

export type RefValidationIssue = {
  field: string;
  message: string;
};

export type RefValidationResult = {
  valid: boolean;
  errors: RefValidationIssue[];
};

export function validateReferenceLine(
  line: Partial<ReferenceLine>,
  _axisId: AxisId
): RefValidationResult {
  const errors: RefValidationIssue[] = [];

  if (!line.label?.trim()) {
    errors.push({ field: "label", message: "Label이 필요합니다." });
  }

  if (line.type === "range") {
    const start = parseAxisBound(line.startValue ?? null);
    const end = parseAxisBound(line.endValue ?? null);
    if (line.startValue === "" || line.startValue == null || start == null) {
      errors.push({
        field: "startValue",
        message: "Start Value는 유효한 숫자여야 합니다.",
      });
    }
    if (line.endValue === "" || line.endValue == null || end == null) {
      errors.push({
        field: "endValue",
        message: "End Value는 유효한 숫자여야 합니다.",
      });
    }
    if (start != null && end != null && start >= end) {
      errors.push({
        field: "startValue",
        message: "Start Value는 End Value보다 작아야 합니다.",
      });
    }
  } else {
    const v = parseAxisBound(line.value ?? null);
    if (line.value === "" || line.value == null || v == null) {
      errors.push({
        field: "value",
        message: "Value는 유효한 숫자여야 합니다.",
      });
    }
  }

  if (line.opacity != null && (line.opacity < 0 || line.opacity > 1)) {
    errors.push({
      field: "opacity",
      message: "Opacity는 0~1 범위여야 합니다.",
    });
  }
  if (line.lineWidth != null && line.lineWidth <= 0) {
    errors.push({
      field: "lineWidth",
      message: "Line Width는 0보다 커야 합니다.",
    });
  }

  return { valid: errors.length === 0, errors };
}

export function isReferenceLineInRange(
  line: ReferenceLine,
  range: { min: number; max: number } | null
): boolean {
  if (!range) return true;
  if (line.type === "line") {
    const v = parseAxisBound(line.value ?? null);
    if (v == null) return false;
    return v >= range.min && v <= range.max;
  }
  const a = parseAxisBound(line.startValue ?? null);
  const b = parseAxisBound(line.endValue ?? null);
  if (a == null || b == null) return false;
  // Overlaps visible range
  return a <= range.max && b >= range.min;
}
