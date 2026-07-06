"use client";

import type { LinearityResultRow } from "@/lib/liw-linearity-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LinearityResultsTableProps {
  rows: LinearityResultRow[];
  selectedRunId: string | null;
  onSelectRow: (row: LinearityResultRow) => void;
}

function fmt(n: number | null, digits = 4): string {
  if (n === null) return "—";
  return n.toFixed(digits);
}

export function LinearityResultsTable({
  rows,
  selectedRunId,
  onSelectRow,
}: LinearityResultsTableProps) {
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
        <CardTitle className="text-lg">분석 결과</CardTitle>
        <p className="text-xs text-muted-foreground">
          각 Test Run을 독립 행으로 표시합니다
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Barcode</th>
              <th className="py-2 pr-3 font-medium">Socket</th>
              <th className="py-2 pr-3 font-medium">Run ID</th>
              <th className="py-2 pr-3 font-medium">Run</th>
              <th className="py-2 pr-3 font-medium">Timestamp</th>
              <th className="py-2 pr-3 font-medium">Result</th>
              <th className="py-2 pr-3 font-medium">Fail Reason</th>
              <th className="py-2 pr-3 font-medium text-right">R²</th>
              <th className="py-2 pr-3 font-medium text-right">Max Value</th>
              <th className="py-2 pr-3 font-medium text-right">Dynamic Range</th>
              <th className="py-2 font-medium text-right">Max Residual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = selectedRunId === row.run.runId;
              return (
                <tr
                  key={row.run.runId}
                  className={cn(
                    "border-b cursor-pointer hover:bg-slate-50 transition-colors",
                    selected && "bg-blue-50 hover:bg-blue-50"
                  )}
                  onClick={() => onSelectRow(row)}
                >
                  <td className="py-2 pr-3 font-mono text-xs">{row.run.barcode}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{row.run.socket}</td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-muted-foreground">
                    #{row.run.rowIndex + 5}
                  </td>
                  <td className="py-2 pr-3 text-xs whitespace-nowrap">
                    {row.run.attemptLabel}
                  </td>
                  <td className="py-2 pr-3 text-xs whitespace-nowrap">
                    {row.runTime}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge
                      variant={row.resultLabel === "PASS" ? "success" : "danger"}
                    >
                      {row.resultLabel}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {row.failReason ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {fmt(row.r2, 6)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {fmt(row.maxValue)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {fmt(row.dynamicRange)}
                  </td>
                  <td className="py-2 text-right font-mono text-xs">
                    {fmt(row.maxResidual)}
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
