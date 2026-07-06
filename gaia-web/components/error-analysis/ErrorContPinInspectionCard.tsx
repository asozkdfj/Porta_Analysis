"use client";

import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ContPinInspectionItem } from "@/lib/error-analysis-types";

interface ErrorContPinInspectionCardProps {
  items: ContPinInspectionItem[];
  maxItems?: number;
}

function priorityLabel(rank: number): {
  text: string;
  variant: "danger" | "warning" | "outline";
} {
  if (rank <= 3) return { text: "우선 점검", variant: "danger" };
  if (rank <= 6) return { text: "점검 권장", variant: "warning" };
  return { text: "참고", variant: "outline" };
}

export function ErrorContPinInspectionCard({
  items,
  maxItems = 12,
}: ErrorContPinInspectionCardProps) {
  const ranked = items.slice(0, maxItems);
  const maxCount = ranked[0]?.totalCount ?? 1;

  if (ranked.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5 text-slate-500" />
            CONT Pin 점검 가이드
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            CONT Fail Map 기준 — 점검이 필요한 Pin 우선순위
          </p>
        </CardHeader>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          CONT 관련 Fail이 없습니다. (CONT2_pin 형식 Fail Item 없음)
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-600" />
          CONT Pin 점검 가이드
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          CONT Fail Map 기준 · Fail 빈도가 높은 Pin부터 점검 · 상위{" "}
          {ranked.length}개
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ranked.map((item, index) => {
            const rank = index + 1;
            const priority = priorityLabel(rank);
            const barWidth = Math.max(
              8,
              Math.round((item.totalCount / maxCount) * 100)
            );

            return (
              <div
                key={item.pinLabel}
                className={cn(
                  "rounded-lg border bg-white p-4 transition-shadow hover:shadow-sm",
                  rank <= 3 && "border-amber-200 bg-amber-50/40"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    #{rank}
                  </span>
                  <Badge variant={priority.variant} className="text-[10px]">
                    {priority.text}
                  </Badge>
                </div>

                <div className="mt-2 font-mono text-base font-bold text-slate-900">
                  <span className="text-amber-700">{item.contactLabel}</span>
                  <span className="text-slate-400">_</span>
                  <span>{item.pin}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>
                    Fail{" "}
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {item.totalCount}
                    </span>
                    회
                  </span>
                  <span>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {item.socketCount}
                    </span>
                    개 Socket
                  </span>
                  <span className="tabular-nums">
                    {item.percent.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      rank <= 3 ? "bg-amber-500" : "bg-slate-400"
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    주요 발생 Socket
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.topSockets.map((s) => (
                      <Badge
                        key={`${item.pinLabel}-${s.socket}`}
                        variant="outline"
                        className="text-[10px] font-mono font-normal"
                      >
                        {s.socket}
                        <span className="ml-1 text-muted-foreground">
                          ({s.count})
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
