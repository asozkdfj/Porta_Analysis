"use client";

import type { GrrResultRow } from "@/lib/liw-grr-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GrrResultsTableProps {
  rows: GrrResultRow[];
  selectedRunId: string | null;
  onSelectRow: (row: GrrResultRow) => void;
}

function ResultBadge({ label }: { label: string }) {
  if (label === "SPEC MISSING") {
    return (
      <Badge variant="warning" className="text-[10px]">
        SPEC MISSING
      </Badge>
    );
  }
  if (label === "N/A") {
    return (
      <Badge variant="secondary" className="text-[10px]">
        N/A
      </Badge>
    );
  }
  return (
    <Badge variant={label === "PASS" ? "success" : "danger"} className="text-[10px]">
      {label}
    </Badge>
  );
}

export function GrrResultsTable({
  rows,
  selectedRunId,
  onSelectRow,
}: GrrResultsTableProps) {
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
          Barcode · Socket · Run ID · Attempt 기준 · PO / NTC / WL_CENTER 종합
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
              <th className="py-2 pr-3 font-medium">PO Result</th>
              <th className="py-2 pr-3 font-medium">NTC Result</th>
              <th className="py-2 pr-3 font-medium">WL_CENTER Result</th>
              <th className="py-2 pr-3 font-medium">Overall</th>
              <th className="py-2 font-medium">Fail Reason</th>
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
                  <td className="py-2 pr-3 text-xs whitespace-nowrap">{row.runTime}</td>
                  <td className="py-2 pr-3">
                    <ResultBadge label={row.poResult} />
                  </td>
                  <td className="py-2 pr-3">
                    <ResultBadge label={row.ntcResult} />
                  </td>
                  <td className="py-2 pr-3">
                    <ResultBadge label={row.wlCenterResult} />
                  </td>
                  <td className="py-2 pr-3">
                    <ResultBadge label={row.overallResult} />
                  </td>
                  <td className="py-2 text-xs text-muted-foreground max-w-[240px]">
                    {row.overallFailReason ?? "—"}
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
