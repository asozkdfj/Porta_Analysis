import type { AxisAppearanceConfig, AxisNumberFormat } from "@shared/schemas/axis";

export function formatAxisValue(
  value: number | string,
  formatConfig: Pick<
    AxisAppearanceConfig,
    "numberFormat" | "decimalPlaces" | "prefix" | "suffix"
  >
): string {
  const prefix = formatConfig.prefix ?? "";
  const suffix = formatConfig.suffix ?? "";
  const formatted = formatCore(value, formatConfig.numberFormat, formatConfig.decimalPlaces);
  return `${prefix}${formatted}${suffix}`;
}

function formatCore(
  value: number | string,
  format: AxisNumberFormat,
  decimalPlaces: number | null
): string {
  if (typeof value === "string") {
    if (format === "auto") return value;
    const n = Number(value);
    if (!Number.isFinite(n)) return value;
    return formatNumber(n, format, decimalPlaces);
  }
  if (!Number.isFinite(value)) return String(value);
  return formatNumber(value, format, decimalPlaces);
}

function formatNumber(
  n: number,
  format: AxisNumberFormat,
  decimalPlaces: number | null
): string {
  const dp = decimalPlaces ?? undefined;
  switch (format) {
    case "integer":
      return String(Math.round(n));
    case "decimal":
      return dp != null ? n.toFixed(dp) : String(n);
    case "scientific":
      return dp != null ? n.toExponential(dp) : n.toExponential();
    case "percentage":
      return dp != null ? `${(n * 100).toFixed(dp)}%` : `${n * 100}%`;
    case "date":
      return new Date(n).toLocaleDateString();
    case "datetime":
      return new Date(n).toLocaleString();
    case "auto":
    default:
      if (dp != null) return n.toFixed(dp);
      if (Math.abs(n) >= 1e6 || (Math.abs(n) > 0 && Math.abs(n) < 1e-3)) {
        return n.toExponential(2);
      }
      return String(Number(n.toPrecision(6)));
  }
}
