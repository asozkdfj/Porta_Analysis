"use client";

import type {
  TemperatureAggregateSummary,
  TemperatureFilter,
} from "@/lib/temperature-tracking-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface TemperatureFilterStats {
  total: number;
  pass: number;
  warning: number;
  fail: number;
}

interface TemperatureSummaryCardProps {
  summary: TemperatureAggregateSummary;
  filterStats: TemperatureFilterStats | null;
  activeFilter: TemperatureFilter;
  onFilterChange: (filter: TemperatureFilter) => void;
}

function fmt(n: number | null, digits = 2): string {
  if (n === null) return "—";
  return n.toFixed(digits);
}

function pct(count: number, total: number): string {
  if (total <= 0) return "0.0%";
  return `${((count / total) * 100).toFixed(1)}%`;
}

function StatCell({
  label,
  value,
  sub,
  active,
  onClick,
  variant = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  active?: boolean;
  onClick?: () => void;
  variant?: "default" | "pass" | "warning" | "fail";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "rounded-lg border px-4 py-3 text-left transition-colors",
        onClick && "cursor-pointer hover:bg-slate-50",
        !onClick && "cursor-default",
        active && "ring-2 ring-slate-900 ring-offset-1",
        variant === "pass" && "border-emerald-200 bg-emerald-50/50",
        variant === "warning" && "border-amber-200 bg-amber-50/50",
        variant === "fail" && "border-red-200 bg-red-50/50"
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </button>
  );
}

export function TemperatureSummaryCard({
  summary,
  filterStats,
  activeFilter,
  onFilterChange,
}: TemperatureSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Temperature Summary</CardTitle>
        <p className="text-xs text-muted-foreground">{summary.overallMessage}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {"barcodeCount" in summary && (
            <StatCell
              label="Barcode Count"
              value={summary.barcodeCount as number}
            />
          )}
          <StatCell label="Socket Count" value={summary.socketCount} />
          <StatCell
            label="Average Temperature"
            value={`${fmt(summary.avgTemp)}°C`}
          />
          <StatCell label="Minimum Temperature" value={`${fmt(summary.minTemp)}°C`} />
          <StatCell label="Maximum Temperature" value={`${fmt(summary.maxTemp)}°C`} />
          <StatCell label="Temperature Range" value={`${fmt(summary.tempRange)}°C`} />
          <StatCell label="Standard Deviation" value={fmt(summary.stdDev, 3)} />
        </div>

        {filterStats && filterStats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCell
              label="Total"
              value={filterStats.total}
              active={activeFilter === "all"}
              onClick={() => onFilterChange("all")}
            />
            <StatCell
              label="PASS"
              value={filterStats.pass}
              sub={pct(filterStats.pass, filterStats.total)}
              variant="pass"
              active={activeFilter === "pass"}
              onClick={() => onFilterChange("pass")}
            />
            <StatCell
              label="WARNING"
              value={filterStats.warning}
              sub={pct(filterStats.warning, filterStats.total)}
              variant="warning"
              active={activeFilter === "warning"}
              onClick={() => onFilterChange("warning")}
            />
            <StatCell
              label="FAIL"
              value={filterStats.fail}
              sub={pct(filterStats.fail, filterStats.total)}
              variant="fail"
              active={activeFilter === "fail"}
              onClick={() => onFilterChange("fail")}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
