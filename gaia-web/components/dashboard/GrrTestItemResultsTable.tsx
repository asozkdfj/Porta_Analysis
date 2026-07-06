"use client";

import type { GrrTestItemResult } from "@/lib/liw-grr-spec";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GrrTestItemResultsTableProps {
  items: GrrTestItemResult[];
  title?: string;
}

function ResultBadge({ label }: { label: string }) {
  if (label === "SPEC MISSING") {
    return (
      <Badge variant="warning" className="text-[10px]">
        SPEC MISSING
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

function sortItems(items: GrrTestItemResult[]): GrrTestItemResult[] {
  const priority = (item: GrrTestItemResult): number => {
    if (item.testItem.includes("_PO_48MA")) return 0;
    if (item.testItem.includes("_PO_22MW")) return 1;
    if (item.testItem.includes("NTC_TEMP_PRE_25MA_70MA_AVG")) return 2;
    if (item.testItem.includes("_WL_CENTER_22MW")) return 3;
    return 10;
  };
  return [...items].sort((a, b) => {
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;
    return a.testItem.localeCompare(b.testItem, undefined, { numeric: true });
  });
}

export function GrrTestItemResultsTable({
  items,
  title = "Test Item Spec Results",
}: GrrTestItemResultsTableProps) {
  if (items.length === 0) return null;

  const rows = sortItems(items);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Reference Upper/Lower ERS 기준 · LIW20C_PO_48MA 등 전체 Test Item
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Test Item</th>
              <th className="py-2 pr-3 font-medium text-right">Measured Value</th>
              <th className="py-2 pr-3 font-medium text-right">Lower ERS</th>
              <th className="py-2 pr-3 font-medium text-right">Upper ERS</th>
              <th className="py-2 pr-3 font-medium">Result</th>
              <th className="py-2 font-medium">Spec Match Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.header}
                className={
                  item.testItem.includes("_PO_48MA") ? "bg-violet-50/50" : undefined
                }
              >
                <td className="py-2 pr-3 font-mono text-xs">{item.testItem}</td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {fmt(item.measuredValue)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {fmt(item.lowerErs)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {fmt(item.upperErs)}
                </td>
                <td className="py-2 pr-3">
                  <ResultBadge label={item.result} />
                </td>
                <td className="py-2 text-xs text-muted-foreground">
                  {item.specMatchStatus === "matched"
                    ? item.matchedConfigItem ?? "matched"
                    : "SPEC MISSING"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
