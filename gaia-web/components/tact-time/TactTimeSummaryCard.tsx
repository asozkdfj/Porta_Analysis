"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TactTimeAnalysis } from "@/lib/tact-time-types";

interface TactTimeSummaryCardProps {
  analysis: TactTimeAnalysis;
  itemCount: number;
  groupCount: number;
}

export function TactTimeSummaryCard({
  analysis,
  itemCount,
  groupCount,
}: TactTimeSummaryCardProps) {
  const definedGroups = analysis.groups.filter((g) => !g.isUngrouped);
  const ungrouped = analysis.groups.find((g) => g.isUngrouped);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Tact Time Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <Stat label="Total Items" value={String(itemCount)} />
          <Stat label="Defined Groups" value={String(groupCount)} />
          <Stat
            label="Total Tact Time"
            value={`${analysis.totalDurationMs.toLocaleString()} ms`}
          />
          <Stat
            label="Longest Group"
            value={analysis.longestGroup?.name ?? "—"}
            sub={
              analysis.longestGroup
                ? `${analysis.longestGroup.totalDurationMs.toLocaleString()} ms`
                : undefined
            }
          />
          {ungrouped && ungrouped.itemCount > 0 && (
            <Stat
              label="Ungrouped"
              value={`${ungrouped.totalDurationMs.toLocaleString()} ms`}
              sub={`${ungrouped.itemCount} items`}
            />
          )}
        </div>

        {definedGroups.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {definedGroups.map((g) => (
              <div
                key={g.id}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: g.color }}
                />
                <span className="font-semibold">{g.name}</span>
                <span className="font-mono text-muted-foreground">
                  {g.totalDurationMs.toLocaleString()} ms
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-0.5 font-mono">{value}</div>
      {sub && (
        <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
      )}
    </div>
  );
}
