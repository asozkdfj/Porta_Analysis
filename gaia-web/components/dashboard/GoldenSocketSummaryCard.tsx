"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GoldenSocketSummary } from "@/lib/golden-socket-analysis";
import type { GaiaStat2GrrSummary } from "@/lib/types";

interface GoldenSocketSummaryCardProps {
  summary: GoldenSocketSummary;
  stat2Summary?: GaiaStat2GrrSummary | null;
}

export function GoldenSocketSummaryCard({
  summary,
  stat2Summary,
}: GoldenSocketSummaryCardProps) {
  const {
    goldenSocket,
    goldenReference,
    totalSockets,
    withinGoldenLimit,
    outsideGoldenLimit,
    worstSocket,
    worstDelta,
    metric,
    goldenDeltaLimit,
  } = summary;

  if (!goldenSocket) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Golden Socket Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No Golden Socket Selected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          Golden Socket Summary
          <Badge variant="outline" className="font-mono text-xs">
            {metric}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Golden Socket</dt>
            <dd className="font-semibold font-mono">{goldenSocket}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Golden Reference</dt>
            <dd className="font-mono">
              {goldenReference !== null ? goldenReference.toFixed(4) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total Sockets</dt>
            <dd className="font-semibold">{totalSockets}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Golden Delta Limit</dt>
            <dd className="font-mono">±{goldenDeltaLimit}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Within Golden Limit</dt>
            <dd className="font-semibold text-emerald-700">{withinGoldenLimit}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Outside Golden Limit</dt>
            <dd className="font-semibold text-amber-700">{outsideGoldenLimit}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Worst Socket</dt>
            <dd className="font-mono font-semibold">{worstSocket ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Worst Delta</dt>
            <dd className="font-mono font-semibold">
              {worstDelta !== null
                ? `${worstDelta >= 0 ? "+" : ""}${worstDelta.toFixed(4)}`
                : "—"}
            </dd>
          </div>
          {stat2Summary && (
            <>
              <div>
                <dt className="text-muted-foreground">GRR Result</dt>
                <dd>
                  <Badge
                    variant={
                      stat2Summary.grrResult === "pass"
                        ? "success"
                        : stat2Summary.grrResult === "fail"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {stat2Summary.grrResult.toUpperCase()}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">pct_err_max</dt>
                <dd className="font-mono font-semibold">
                  {stat2Summary.grrPctErrMax !== null
                    ? `${stat2Summary.grrPctErrMax.toFixed(3)}%`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">pct_err_min</dt>
                <dd className="font-mono font-semibold">
                  {stat2Summary.grrPctErrMin !== null
                    ? `${stat2Summary.grrPctErrMin.toFixed(3)}%`
                    : "—"}
                </dd>
              </div>
            </>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
