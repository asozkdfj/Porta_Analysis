"use client";

import type { LinearityBatchSummary, LinearityFilter } from "@/lib/liw-linearity-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LinearityBatchSummaryCardProps {
  summary: LinearityBatchSummary;
  activeFilter: LinearityFilter;
  onFilterChange: (filter: LinearityFilter) => void;
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
  variant?: "default" | "pass" | "fail";
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
        variant === "fail" && "border-red-200 bg-red-50/50"
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </button>
  );
}

export function LinearityBatchSummaryCard({
  summary,
  activeFilter,
  onFilterChange,
}: LinearityBatchSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">PASS / FAIL Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCell
            label="Total Count"
            value={summary.total}
            active={activeFilter === "all"}
            onClick={() => onFilterChange("all")}
          />
          <StatCell
            label="PASS Count"
            value={summary.pass}
            sub={`${summary.passRate.toFixed(1)}%`}
            variant="pass"
            active={activeFilter === "pass"}
            onClick={() => onFilterChange("pass")}
          />
          <StatCell
            label="FAIL Count"
            value={summary.fail}
            sub={`${summary.failRate.toFixed(1)}%`}
            variant="fail"
            active={activeFilter === "fail"}
            onClick={() => onFilterChange("fail")}
          />
          <StatCell
            label="PASS Rate"
            value={`${summary.passRate.toFixed(1)}%`}
            sub={`FAIL ${summary.failRate.toFixed(1)}%`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <StatCell
            label="Emission Failure"
            value={summary.emissionFailure}
            active={activeFilter === "emission_failure"}
            onClick={() => onFilterChange("emission_failure")}
          />
          <StatCell
            label="Non Linear"
            value={summary.nonLinear}
            active={activeFilter === "non_linear"}
            onClick={() => onFilterChange("non_linear")}
          />
          <StatCell
            label="Data Missing"
            value={summary.dataMissing}
            active={activeFilter === "data_missing"}
            onClick={() => onFilterChange("data_missing")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
