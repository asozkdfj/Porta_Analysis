"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ErrorAnalysisRecord } from "@/lib/error-analysis-types";

interface ErrorDrillDownPanelProps {
  socket: string;
  records: ErrorAnalysisRecord[];
}

export function ErrorDrillDownPanel({
  socket,
  records,
}: ErrorDrillDownPanelProps) {
  const failRecords = records.filter((r) => r.status === "FAIL");
  const allItems = failRecords.flatMap((r) => r.failingItems);

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Drill Down · Socket {socket}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {failRecords.length} Fail runs · {allItems.length} fail item entries
        </p>
      </CardHeader>
      <CardContent>
        {allItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            이 Socket에 Fail 이력이 없습니다.
          </p>
        ) : (
          <ul className="max-h-48 overflow-y-auto space-y-1 font-mono text-sm">
            {allItems.map((item, i) => (
              <li
                key={`${item}-${i}`}
                className="rounded border px-3 py-1.5 text-slate-800"
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
