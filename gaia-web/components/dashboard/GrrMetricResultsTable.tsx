"use client";

import type { GaiaAnalysisResult } from "@/lib/types";
import {
  computeSerialStat2Rows,
  stat2ResultToGrrJudgment,
} from "@/lib/gaia-stat2-grr-summary";
import type { GaiaStat2GrrSummary } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GrrMetricResultsTableProps {
  analysis: GaiaAnalysisResult;
  stat2Summary?: GaiaStat2GrrSummary | null;
}

function ResultBadge({ label }: { label: string }) {
  if (label === "SPEC MISSING" || label === "AMBIGUOUS SPEC MATCH") {
    return (
      <Badge variant="warning" className="text-[10px]">
        {label}
      </Badge>
    );
  }
  if (label === "CHECK") {
    return (
      <Badge variant="secondary" className="text-[10px]">
        CHECK
      </Badge>
    );
  }
  return (
    <Badge variant={label === "PASS" ? "success" : "danger"} className="text-[10px]">
      {label}
    </Badge>
  );
}

function fmt(n: number | null, digits = 4): string {
  if (n === null) return "—";
  return n.toFixed(digits);
}

export function GrrMetricResultsTable({
  analysis,
  stat2Summary,
}: GrrMetricResultsTableProps) {
  const { spec, serials } = analysis;
  if (serials.length === 0) return null;

  const refSocket = serials[0]?.referenceSocket ?? "—";
  const groupResult = stat2Summary?.grrResult ?? null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Metric Results</CardTitle>
          {groupResult && (
            <Badge
              variant={
                groupResult === "pass"
                  ? "success"
                  : groupResult === "fail"
                    ? "danger"
                    : "warning"
              }
            >
              GRR {groupResult.toUpperCase()} · {refSocket}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate" title={analysis.metric}>
          {analysis.metric}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Serial</th>
              <th className="py-2 pr-3 font-medium text-right">Measured (Golden)</th>
              <th className="py-2 pr-3 font-medium text-right">Socket Stdev</th>
              <th className="py-2 pr-3 font-medium text-right">Ref Stdev</th>
              <th className="py-2 pr-3 font-medium text-right">Calc GRR %</th>
              <th className="py-2 pr-3 font-medium text-right">GRR Stdev</th>
              <th className="py-2 pr-3 font-medium text-right">GRR Limit</th>
              <th className="py-2 pr-3 font-medium text-right">pct_err_upper</th>
              <th className="py-2 pr-3 font-medium text-right">pct_err_lower</th>
              <th className="py-2 pr-3 font-medium text-right">Lower ERS</th>
              <th className="py-2 pr-3 font-medium text-right">Upper ERS</th>
              <th className="py-2 pr-3 font-medium">Measurement</th>
              <th className="py-2 pr-3 font-medium">GRR</th>
              <th className="py-2 pr-3 font-medium">Spec Match</th>
              <th className="py-2 font-medium">Fail Reason</th>
            </tr>
          </thead>
          <tbody>
            {serials.map((row) => {
              const stat2 = computeSerialStat2Rows(row, spec.grrLimit, spec.grrStdev);
              return (
              <tr key={row.serial} className="border-b">
                <td className="py-2 pr-3 font-mono text-xs">{row.serial}</td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {fmt(row.pseudoGolden)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {fmt(row.calculatedStdev)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {fmt(row.referenceStdev)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {fmt(row.calculatedGrr, 2)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {fmt(spec.grrStdev)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {fmt(spec.grrLimit)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {stat2.testResult.pctErrUpper !== null
                    ? `${stat2.testResult.pctErrUpper.toFixed(3)}%`
                    : "—"}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {stat2.testResult.pctErrLower !== null
                    ? `${stat2.testResult.pctErrLower.toFixed(3)}%`
                    : "—"}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {fmt(spec.lsl)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {fmt(spec.usl)}
                </td>
                <td className="py-2 pr-3">
                  <ResultBadge label={row.measurementStatus} />
                </td>
                <td className="py-2 pr-3">
                  <ResultBadge
                    label={stat2ResultToGrrJudgment(stat2.testResult.result)}
                  />
                </td>
                <td className="py-2 pr-3 text-xs">
                  {spec.matchStatus === "matched"
                    ? spec.matchedItem ?? "matched"
                    : spec.matchStatus === "ambiguous"
                      ? "AMBIGUOUS"
                      : "SPEC MISSING"}
                </td>
                <td className="py-2 text-xs text-muted-foreground">
                  {row.failReason ?? "—"}
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
