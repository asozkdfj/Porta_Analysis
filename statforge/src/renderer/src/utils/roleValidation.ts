import type { ColumnMeta, DataType, GraphConfig, GraphRoles, RoleKey } from "@shared/schemas/types";

export function isNumericDataType(dataType: DataType): boolean {
  return dataType === "numeric" || dataType === "date" || dataType === "datetime";
}

export function isCategoricalDataType(dataType: DataType): boolean {
  return (
    dataType === "categorical" ||
    dataType === "character" ||
    dataType === "boolean"
  );
}

export function validateRoleDrop(
  role: RoleKey,
  column: ColumnMeta,
  _currentCount?: number
): { ok: true } | { ok: false; message: string } {
  switch (role) {
    case "size":
      if (column.dataType !== "numeric" && column.dataType !== "date" && column.dataType !== "datetime") {
        return {
          ok: false,
          message: `Size 역할에는 숫자형 컬럼이 필요합니다. "${column.name}" is ${column.dataType}.`,
        };
      }
      return { ok: true };
    case "frequency":
      if (column.dataType !== "numeric") {
        return {
          ok: false,
          message: `Frequency requires a numeric column. "${column.name}" is ${column.dataType}.`,
        };
      }
      return { ok: true };
    case "interval":
      if (column.dataType !== "numeric") {
        return {
          ok: false,
          message: `Interval requires a numeric column. "${column.name}" is ${column.dataType}.`,
        };
      }
      return { ok: true };
    case "mapShape":
      if (!isCategoricalDataType(column.dataType) && column.dataType !== "character") {
        return {
          ok: false,
          message: `Map Shape prefers categorical columns. "${column.name}" is ${column.dataType}.`,
        };
      }
      return { ok: true };
    default:
      return { ok: true };
  }
}

export function inferChartHint(roles: GraphRoles): string {
  const x = roles.x[0];
  const y = roles.y[0];
  if (!x && !y) return "Drag variables into drop zones";
  if (x && !y) return "Histogram / Count chart ready";
  if (!x && y) return "Single-axis plot ready";
  return "Scatter / category plot ready";
}

export function rolesHaveScatter(config: GraphConfig): boolean {
  return config.roles.x.length > 0 && config.roles.y.length > 0;
}
