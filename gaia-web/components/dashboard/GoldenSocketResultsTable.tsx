"use client";

import type { GaiaAnalysisResult, GaiaStat2GrrSummary } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  goldenFilterLabel,
  type GoldenFilter,
} from "@/lib/golden-socket-config";
import {
  filterGoldenRows,
  type SocketGoldenRow,
} from "@/lib/golden-socket-analysis";

interface GoldenSocketResultsTableProps {
  rows: SocketGoldenRow[];
  filter: GoldenFilter;
  onFilterChange: (f: GoldenFilter) => void;
  goldenDeltaLimit: number;
  analysis?: GaiaAnalysisResult | null;
  referenceSocket?: string;
  stat2Summary?: GaiaStat2GrrSummary | null;
}

const FILTERS: GoldenFilter[] = [
  "all",
  "pass",
  "warning",
  "fail",
  "within_golden",
  "outside_golden",
];

function resultBadge(
  result: SocketGoldenRow["specResult"] | SocketGoldenRow["goldenResult"]
) {
  if (result === "PASS") return <Badge variant="success">{result}</Badge>;
  if (result === "FAIL") return <Badge variant="danger">{result}</Badge>;
  if (result === "WARNING") return <Badge variant="warning">{result}</Badge>;
  return <Badge variant="outline">{result}</Badge>;
}

export function GoldenSocketResultsTable({
  rows,
  filter,
  onFilterChange,
  goldenDeltaLimit,
  analysis,
  referenceSocket,
  stat2Summary,
}: GoldenSocketResultsTableProps) {
  const filtered = filterGoldenRows(rows, filter, goldenDeltaLimit);

  const grrFailCount =
    stat2Summary?.testResultTable.filter((r) => r.result === "fail").length ??
    analysis?.serials.filter((s) => s.grrStatus === "FAIL").length ??
    0;
  const grrPassCount =
    stat2Summary?.testResultTable.filter((r) => r.result === "pass").length ??
    analysis?.serials.filter((s) => s.grrStatus === "PASS").length ??
    0;
  const groupGrrFail = stat2Summary?.grrResult === "fail";

  function socketGrrLabel(socket: string): string {
    if (!referenceSocket || socket !== referenceSocket) return "—";
    if (groupGrrFail || grrFailCount > 0) return "FAIL";
    if (grrPassCount > 0) return "PASS";
    return "CHECK";
  }

  function effectiveGoldenResult(
    row: SocketGoldenRow
  ): SocketGoldenRow["goldenResult"] {
    const grr = socketGrrLabel(row.socket);
    if (grr === "FAIL") return "FAIL";
    return row.goldenResult;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Golden Comparison Results</CardTitle>
        <Tabs value={filter} onValueChange={(v) => onFilterChange(v as GoldenFilter)}>
          <TabsList className="h-auto flex-wrap justify-start gap-1">
            {FILTERS.map((f) => (
              <TabsTrigger key={f} value={f} className="text-xs">
                {goldenFilterLabel(f)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Rank</th>
              <th className="py-2 pr-3 font-medium">Socket</th>
              <th className="py-2 pr-3 font-medium">Metric</th>
              <th className="py-2 pr-3 font-medium text-right">Measured</th>
              <th className="py-2 pr-3 font-medium text-right">Golden Ref</th>
              <th className="py-2 pr-3 font-medium text-right">Delta</th>
              <th className="py-2 pr-3 font-medium text-right">Lower ERS</th>
              <th className="py-2 pr-3 font-medium text-right">Upper ERS</th>
              <th className="py-2 pr-3 font-medium">Spec Result</th>
              <th className="py-2 pr-3 font-medium">Golden Result</th>
              <th className="py-2 font-medium">GRR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-6 text-center text-muted-foreground">
                  표시할 결과가 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => (
                <tr
                  key={`${row.socket}-${row.metric}`}
                  className={`border-b last:border-0 ${
                    row.isGoldenSocket ? "bg-indigo-50/50" : ""
                  }`}
                >
                  <td className="py-2 pr-3 font-mono">{idx + 1}</td>
                  <td className="py-2 pr-3 font-mono font-medium">
                    {row.socket}
                    {row.isGoldenSocket && (
                      <span className="ml-1 text-[10px] text-indigo-600">(Golden)</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 max-w-[180px] truncate" title={row.metric}>
                    {row.metric}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {row.measuredValue?.toFixed(4) ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {row.goldenReference?.toFixed(4) ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {row.deltaFromGolden !== null
                      ? `${row.deltaFromGolden >= 0 ? "+" : ""}${row.deltaFromGolden.toFixed(4)}`
                      : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {row.lowerErs?.toFixed(4) ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {row.upperErs?.toFixed(4) ?? "—"}
                  </td>
                  <td className="py-2 pr-3">{resultBadge(row.specResult)}</td>
                  <td className="py-2 pr-3">{resultBadge(effectiveGoldenResult(row))}</td>
                  <td className="py-2">
                    {(() => {
                      const label = socketGrrLabel(row.socket);
                      if (label === "—") return <span className="text-muted-foreground">—</span>;
                      return resultBadge(label as "PASS" | "FAIL" | "WARNING");
                    })()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
