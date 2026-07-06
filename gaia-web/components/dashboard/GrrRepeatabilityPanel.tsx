"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GrrSocketRepeatabilityChart } from "@/components/charts/GrrSocketRepeatabilityChart";
import {
  repeatabilityTierColor,
  type GrrRepeatabilityBySocket,
  type RepeatabilitySocketView,
} from "@/lib/grr-repeatability";

interface GrrRepeatabilityPanelProps {
  data: GrrRepeatabilityBySocket;
  goldenSocket?: string | null;
  activeReferenceSocket?: string;
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

function SocketDetailTable({ view }: { view: RepeatabilitySocketView }) {
  const { summary } = view;

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-muted-foreground">
            <th className="py-2 px-3 font-medium">Barcode (Serial)</th>
            <th className="py-2 px-3 font-medium text-right">Avg</th>
            <th className="py-2 px-3 font-medium text-right">Stdev</th>
            <th className="py-2 px-3 font-medium text-right">Bound Up</th>
            <th className="py-2 px-3 font-medium text-right">Bound Dn</th>
            <th className="py-2 px-3 font-medium text-right">Range</th>
            <th className="py-2 px-3 font-medium">Tier</th>
            <th className="py-2 px-3 font-medium text-right">Runs</th>
          </tr>
        </thead>
        <tbody>
          {summary.modules.map((row) => (
            <tr key={row.serial} className="border-b last:border-0">
              <td
                className="py-2 px-3 font-mono font-medium truncate max-w-[180px]"
                title={row.serial}
              >
                {row.serial}
              </td>
              <td className="py-2 px-3 text-right font-mono">
                {row.avg.toFixed(6)}
              </td>
              <td className="py-2 px-3 text-right font-mono">
                {row.stdev.toFixed(6)}
              </td>
              <td className="py-2 px-3 text-right font-mono">
                {row.boundUp.toFixed(6)}
              </td>
              <td className="py-2 px-3 text-right font-mono">
                {row.boundDn.toFixed(6)}
              </td>
              <td
                className="py-2 px-3 text-right font-mono font-semibold"
                style={{ color: repeatabilityTierColor(row.tier) }}
              >
                {row.repeatabilityRange.toFixed(6)}
                {row.outOfSpec && (
                  <span className="block text-[10px] text-red-600 font-normal">
                    Spec 초과
                  </span>
                )}
              </td>
              <td className="py-2 px-3">{tierBadge(row.tier)}</td>
              <td className="py-2 px-3 text-right font-mono">{row.runCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function pickDefaultSocket(
  sockets: RepeatabilitySocketView[],
  referenceSocket?: string,
  goldenSocket?: string | null
): string {
  if (referenceSocket && sockets.some((s) => s.socket === referenceSocket)) {
    return referenceSocket;
  }
  if (goldenSocket && sockets.some((s) => s.socket === goldenSocket)) {
    return goldenSocket;
  }
  return sockets[0]?.socket ?? "";
}

export function GrrRepeatabilityPanel({
  data,
  goldenSocket,
  activeReferenceSocket,
}: GrrRepeatabilityPanelProps) {
  const { sockets, thresholds } = data;
  const [activeSocket, setActiveSocket] = useState(() =>
    pickDefaultSocket(sockets, activeReferenceSocket, goldenSocket)
  );

  useEffect(() => {
    if (sockets.length === 0) return;
    const preferred = pickDefaultSocket(
      sockets,
      activeReferenceSocket,
      goldenSocket
    );
    const exists = sockets.some((s) => s.socket === activeSocket);
    if (!exists) setActiveSocket(preferred);
  }, [sockets, activeSocket, activeReferenceSocket, goldenSocket]);

  const activeView = useMemo(
    () => sockets.find((s) => s.socket === activeSocket) ?? sockets[0],
    [sockets, activeSocket]
  );

  if (!activeView || sockets.length === 0) return null;

  const { summary } = activeView;
  const isGolden = goldenSocket === activeView.socket;
  const isTarget = activeReferenceSocket === activeView.socket;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Repeatability — Socket별 Barcode 반복성
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Socket 선택 시 해당 Socket의 전체 Barcode 반복 Run 비교 · Range = 2 ×
          (GRR Stdev × Stdev) · Green ≤ {thresholds.goodMax} · Yellow ≤{" "}
          {thresholds.warnMax}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sockets.length > 1 && (
          <Tabs value={activeSocket} onValueChange={setActiveSocket}>
            <TabsList className="h-auto flex-wrap justify-start gap-1">
              {sockets.map((s) => {
                const isG = goldenSocket === s.socket;
                const isT = activeReferenceSocket === s.socket;
                return (
                  <TabsTrigger
                    key={s.socket}
                    value={s.socket}
                    className="text-xs font-mono gap-1"
                  >
                    {s.socket}
                    {isG && (
                      <span className="text-[9px] text-indigo-600">G</span>
                    )}
                    {isT && !isG && (
                      <span className="text-[9px] text-sky-600">T</span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Socket </span>
            <span className="font-mono font-semibold">{activeView.socket}</span>
            {isGolden && (
              <span className="ml-1 text-[10px] text-indigo-600">Golden</span>
            )}
            {isTarget && !isGolden && (
              <span className="ml-1 text-[10px] text-sky-600">Target</span>
            )}
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Barcode </span>
            <span className="font-mono font-semibold">
              {summary.modules.length}개
            </span>
          </div>
        </div>

        <GrrSocketRepeatabilityChart
          summary={summary}
          socketLabel={activeView.socket}
          isGoldenSocket={isGolden}
          isTargetSocket={isTarget}
        />

        <SocketDetailTable view={activeView} />
      </CardContent>
    </Card>
  );
}
