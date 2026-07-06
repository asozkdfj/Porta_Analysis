"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ErrorCorrelationPair,
  SocketRankItem,
  StageRankItem,
} from "@/lib/error-analysis-types";

interface ErrorRankingPanelsProps {
  socketRanking: SocketRankItem[];
  stageRanking: StageRankItem[];
  correlations: ErrorCorrelationPair[];
}

function RankList({
  title,
  items,
  valueKey,
}: {
  title: string;
  items: { label: string; value: number }[];
  valueKey: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            데이터 없음
          </p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {items.map((item, i) => (
              <div
                key={`${item.label}-${i}`}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="font-mono font-semibold truncate">
                  {item.label}
                </span>
                <span className="font-mono text-slate-600 shrink-0 ml-2">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ErrorRankingPanels({
  socketRanking,
  stageRanking,
  correlations,
}: ErrorRankingPanelsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <RankList
        title="Socket Ranking"
        items={socketRanking.slice(0, 12).map((s) => ({
          label: s.socket,
          value: s.failCount,
        }))}
        valueKey="failCount"
      />
      <RankList
        title="Stage Ranking"
        items={stageRanking.map((s) => ({
          label: `Stage ${s.stage}`,
          value: s.failCount,
        }))}
        valueKey="failCount"
      />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Error Correlation</CardTitle>
          <p className="text-xs text-muted-foreground">
            동일 DUT에서 함께 발생한 Error 쌍
          </p>
        </CardHeader>
        <CardContent>
          {correlations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              상관 데이터 없음
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {correlations.slice(0, 10).map((c) => (
                <div
                  key={`${c.from}-${c.to}`}
                  className="rounded-md border px-3 py-2 text-xs"
                >
                  <div className="font-mono text-slate-800 truncate">
                    {c.from}
                  </div>
                  <div className="text-center text-muted-foreground py-0.5">
                    ↓ ({c.count})
                  </div>
                  <div className="font-mono text-slate-800 truncate">
                    {c.to}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
