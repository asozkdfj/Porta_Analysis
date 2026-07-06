"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RetestSummary } from "@/lib/test-run";

interface RetestSummaryCardProps {
  summary: RetestSummary;
}

function StatCell({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export function RetestSummaryCard({ summary }: RetestSummaryCardProps) {
  if (summary.totalTests === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Retest Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCell label="Total Tests" value={summary.totalTests} />
          <StatCell label="Unique Barcodes" value={summary.uniqueBarcodes} />
          <StatCell
            label="Retest Count"
            value={summary.retestCount}
            sub={`${summary.retestRate.toFixed(1)}%`}
          />
          <StatCell label="Retest Rate" value={`${summary.retestRate.toFixed(1)}%`} />
          <StatCell label="Pass After Retest" value={summary.passAfterRetest} />
          <StatCell label="Fail After Retest" value={summary.failAfterRetest} />
        </div>
      </CardContent>
    </Card>
  );
}
