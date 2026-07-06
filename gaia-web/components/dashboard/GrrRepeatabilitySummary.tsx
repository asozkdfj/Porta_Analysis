"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  REPEATABILITY_THRESHOLDS,
  repeatabilityTierColor,
  type SocketRepeatabilitySummary,
} from "@/lib/grr-repeatability";

interface GrrRepeatabilitySummaryProps {
  summary: SocketRepeatabilitySummary;
  referenceSocket?: string;
  goldenSocket?: string | null;
}

function tierBadge(tier: "good" | "medium" | "poor") {
  const variant =
    tier === "good" ? "success" : tier === "medium" ? "warning" : "danger";
  const label =
    tier === "good" ? "Good" : tier === "medium" ? "Medium" : "Poor";
  return (
    <Badge variant={variant} className="text-[10px]">
      {label}
    </Badge>
  );
}

export function GrrRepeatabilitySummary({
  summary,
  referenceSocket,
  goldenSocket,
}: GrrRepeatabilitySummaryProps) {
  const { thresholds } = summary;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Repeatability Summary</CardTitle>
        <p className="text-xs text-muted-foreground">
          Range = Bound Up − Bound Dn = 2 × (GRR Stdev × Stdev) · Green ≤{" "}
          {thresholds.goodMax} · Yellow ≤ {thresholds.warnMax}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-md border border-emerald-200 bg-emerald-50/40 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Best Repeatability</dt>
            <dd className="font-mono font-semibold text-emerald-800">
              {summary.bestSocket ?? "—"}
            </dd>
            <dd className="text-xs font-mono text-emerald-700">
              {summary.smallestRange !== null
                ? summary.smallestRange.toFixed(6)
                : "—"}
            </dd>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50/40 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Worst Repeatability</dt>
            <dd className="font-mono font-semibold text-red-800">
              {summary.worstSocket ?? "—"}
            </dd>
            <dd className="text-xs font-mono text-red-700">
              {summary.largestRange !== null
                ? summary.largestRange.toFixed(6)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Smallest Range</dt>
            <dd className="font-mono font-semibold">
              {summary.smallestRange?.toFixed(6) ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Largest Range</dt>
            <dd className="font-mono font-semibold">
              {summary.largestRange?.toFixed(6) ?? "—"}
            </dd>
          </div>
        </dl>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Socket</th>
                <th className="py-2 pr-3 font-medium text-right">Avg</th>
                <th className="py-2 pr-3 font-medium text-right">Stdev</th>
                <th className="py-2 pr-3 font-medium text-right">Bound Up</th>
                <th className="py-2 pr-3 font-medium text-right">Bound Dn</th>
                <th className="py-2 pr-3 font-medium text-right">Range</th>
                <th className="py-2 pr-3 font-medium">Tier</th>
                <th className="py-2 font-medium text-right">Runs</th>
              </tr>
            </thead>
            <tbody>
              {summary.sockets.map((row) => {
                const isRef = referenceSocket && row.socket === referenceSocket;
                const isGolden = goldenSocket && row.socket === goldenSocket;
                return (
                  <tr
                    key={row.socket}
                    className={`border-b ${
                      isGolden
                        ? "bg-indigo-50/60"
                        : isRef
                          ? "bg-sky-50/40"
                          : ""
                    }`}
                  >
                    <td className="py-2 pr-3 font-mono font-medium">
                      {row.socket}
                      {isGolden && (
                        <span className="ml-1 text-[10px] text-indigo-600">
                          (Golden)
                        </span>
                      )}
                      {isRef && !isGolden && (
                        <span className="ml-1 text-[10px] text-sky-600">
                          (Target)
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {row.avg.toFixed(6)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {row.stdev.toFixed(6)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {row.boundUp.toFixed(6)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {row.boundDn.toFixed(6)}
                    </td>
                    <td
                      className="py-2 pr-3 text-right font-mono font-semibold"
                      style={{ color: repeatabilityTierColor(row.tier) }}
                    >
                      {row.repeatabilityRange.toFixed(6)}
                    </td>
                    <td className="py-2 pr-3">{tierBadge(row.tier)}</td>
                    <td className="py-2 text-right font-mono">{row.runCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
