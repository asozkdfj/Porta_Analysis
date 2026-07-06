"use client";

import type { GrrSpecMappingSummary } from "@/lib/liw-grr-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GrrSpecMappingSummaryCardProps {
  summary: GrrSpecMappingSummary;
  configFileName?: string | null;
}

export function GrrSpecMappingSummaryCard({
  summary,
  configFileName,
}: GrrSpecMappingSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Spec Mapping Summary</CardTitle>
        <p className="text-xs text-muted-foreground">
          Reference file Upper/Lower ERS 기준
          {configFileName && ` · ${configFileName}`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Total Test Items" value={summary.totalTestItems} />
          <Stat label="Spec Matched" value={summary.specMatchedCount} />
          <Stat label="Spec Missing" value={summary.specMissingCount} variant="warn" />
          <Stat label="Ambiguous Match" value={summary.ambiguousMatchCount ?? 0} variant="warn" />
          <Stat label="PASS" value={summary.passCount} variant="pass" />
          <Stat label="FAIL" value={summary.failCount} variant="fail" />
          <Stat label="SPEC MISSING" value={summary.specMissingResultCount} variant="warn" />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "pass" | "fail" | "warn";
}) {
  const border =
    variant === "pass"
      ? "border-emerald-200 bg-emerald-50/40"
      : variant === "fail"
        ? "border-red-200 bg-red-50/40"
        : variant === "warn"
          ? "border-amber-200 bg-amber-50/40"
          : "border-slate-200";

  return (
    <div className={`rounded-lg border px-3 py-3 ${border}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
    </div>
  );
}
