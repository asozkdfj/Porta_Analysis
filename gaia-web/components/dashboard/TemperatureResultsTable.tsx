"use client";

import type { TemperatureResultRow } from "@/lib/temperature-tracking-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TemperatureResultsTableProps {
  rows: TemperatureResultRow[];
  selectedRunId: string | null;
  onSelectRow: (row: TemperatureResultRow) => void;
}

function fmt(n: number, digits = 2): string {
  return n.toFixed(digits);
}

function rowKey(row: TemperatureResultRow): string {
  return `${row.runId}|${row.branch}`;
}

function badgeVariant(
  status: string
): "success" | "warning" | "danger" | "secondary" {
  if (status === "PASS") return "success";
  if (status === "WARNING") return "warning";
  if (status === "FAIL") return "danger";
  return "secondary";
}

export function TemperatureResultsTable({
  rows,
  selectedRunId,
  onSelectRow,
}: TemperatureResultsTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          필터 조건에 맞는 결과가 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Stability Analysis</CardTitle>
        <p className="text-xs text-muted-foreground">
          각 Test Run을 독립 행으로 표시합니다 (Barcode + Socket + Run)
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Barcode</th>
              <th className="py-2 pr-3 font-medium">Socket</th>
              <th className="py-2 pr-3 font-medium">Run ID</th>
              <th className="py-2 pr-3 font-medium">Attempt</th>
              <th className="py-2 pr-3 font-medium">Timestamp</th>
              <th className="py-2 pr-3 font-medium">Branch</th>
              <th className="py-2 pr-3 font-medium text-right">Temp</th>
              <th className="py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = selectedRunId === row.runId;
              return (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "border-b cursor-pointer hover:bg-slate-50 transition-colors",
                    selected && "bg-blue-50 hover:bg-blue-50"
                  )}
                  onClick={() => onSelectRow(row)}
                >
                  <td className="py-2 pr-3 font-mono text-xs">{row.barcode}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{row.socketLabel}</td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-muted-foreground max-w-[140px] truncate" title={row.runId}>
                    {row.rowIndex >= 0 ? `#${row.rowIndex + 5}` : row.runId.slice(-12)}
                  </td>
                  <td className="py-2 pr-3 text-xs whitespace-nowrap">{row.attemptLabel}</td>
                  <td className="py-2 pr-3 text-xs whitespace-nowrap">{row.timestamp}</td>
                  <td className="py-2 pr-3 font-semibold text-xs">LIW{row.branch}</td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {fmt(row.avgTemp)}°C
                  </td>
                  <td className="py-2">
                    <Badge variant={badgeVariant(row.statusLabel)}>
                      {row.statusLabel}
                    </Badge>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {row.message}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
