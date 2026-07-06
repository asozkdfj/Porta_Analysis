"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_ABNORMAL_TEST_TIME_THRESHOLD_SEC } from "@/lib/error-analysis-config";
import type { ErrorAnalysisRecord } from "@/lib/error-analysis-types";
import { resolveAbnormalStatus } from "@/lib/error-analysis-uph";

interface ErrorDetailTableProps {
  records: ErrorAnalysisRecord[];
  maxRows?: number;
}

function formatTestTime(sec: number | null): string {
  if (sec == null || sec <= 0) return "—";
  return `${sec.toFixed(1)}s`;
}

export function ErrorDetailTable({
  records,
  maxRows = 200,
}: ErrorDetailTableProps) {
  const rows = records.slice(0, maxRows);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Test Time Detail Table</CardTitle>
        <p className="text-xs text-muted-foreground">
          {records.length.toLocaleString()} rows
          {records.length > maxRows
            ? ` · 상위 ${maxRows}개 표시`
            : ""}
          {" · Abnormal ≥ "}
          {DEFAULT_ABNORMAL_TEST_TIME_THRESHOLD_SEC}s
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left py-2 px-2 font-medium">Barcode</th>
              <th className="text-left py-2 px-2 font-medium">Station</th>
              <th className="text-left py-2 px-2 font-medium">Socket</th>
              <th className="text-left py-2 px-2 font-medium">Status</th>
              <th className="text-left py-2 px-2 font-medium whitespace-nowrap">
                StartTime
              </th>
              <th className="text-left py-2 px-2 font-medium whitespace-nowrap">
                EndTime
              </th>
              <th className="text-left py-2 px-2 font-medium">Test Time</th>
              <th className="text-left py-2 px-2 font-medium">Abnormal</th>
              <th className="text-left py-2 px-2 font-medium min-w-[160px]">
                Failing Items
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-12 text-center text-muted-foreground"
                >
                  표시할 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((rec) => {
                const abnormal = resolveAbnormalStatus(rec.testTimeSec);
                return (
                  <tr key={rec.id} className="border-b hover:bg-slate-50/80">
                    <td className="py-2 px-2 font-mono">{rec.barcode}</td>
                    <td className="py-2 px-2 font-mono">
                      {rec.station != null ? `Station ${rec.station}` : "—"}
                    </td>
                    <td className="py-2 px-2 font-mono">{rec.socket}</td>
                    <td className="py-2 px-2">
                      <Badge
                        variant={rec.status === "PASS" ? "success" : "danger"}
                        className="text-[10px]"
                      >
                        {rec.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] whitespace-nowrap">
                      {rec.startTime || "INVALID TIME DATA"}
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] whitespace-nowrap">
                      {rec.endTime || "—"}
                    </td>
                    <td className="py-2 px-2 font-mono">
                      {formatTestTime(rec.testTimeSec)}
                    </td>
                    <td className="py-2 px-2">
                      <Badge
                        variant={
                          abnormal === "Abnormal"
                            ? "danger"
                            : abnormal === "Normal"
                              ? "success"
                              : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {abnormal}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px]">
                      {rec.failingItems.length > 0
                        ? rec.failingItems.join("; ")
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
