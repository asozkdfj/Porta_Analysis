"use client";

import { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CYCLE_TOTAL_TIME_LABEL,
  formatTactSeconds,
} from "@/lib/tact-time-cycles";
import type { TactTimeGroupContribution } from "@/lib/tact-time-types";

interface TactTimeContributionChartProps {
  contributions: TactTimeGroupContribution[];
}

const PIE_TOP_N = 10;
const OTHER_COLOR = "#94a3b8";

function buildPieData(contributions: TactTimeGroupContribution[]) {
  if (contributions.length <= PIE_TOP_N) {
    return contributions.map((c) => ({
      name: c.groupName,
      value: c.percent,
      avgMs: c.avgDurationMs,
      color: c.color,
    }));
  }

  const top = contributions.slice(0, PIE_TOP_N);
  const rest = contributions.slice(PIE_TOP_N);
  const otherPercent = rest.reduce((s, c) => s + c.percent, 0);
  const otherAvgMs = rest.reduce((s, c) => s + c.avgDurationMs, 0);

  return [
    ...top.map((c) => ({
      name: c.groupName,
      value: c.percent,
      avgMs: c.avgDurationMs,
      color: c.color,
    })),
    {
      name: `기타 (${rest.length}개)`,
      value: otherPercent,
      avgMs: otherAvgMs,
      color: OTHER_COLOR,
    },
  ];
}

export function TactTimeContributionChart({
  contributions,
}: TactTimeContributionChartProps) {
  const pieData = useMemo(
    () => buildPieData(contributions),
    [contributions]
  );

  if (contributions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Group Contribution 데이터가 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Group Contribution</CardTitle>
        <p className="text-xs text-muted-foreground">
          {CYCLE_TOTAL_TIME_LABEL} 대비 그룹별 평균 기여도 (%) · 파이는 상위{" "}
          {PIE_TOP_N}개, 전체 목록은 우측
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={36}
                  isAnimationActive={false}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, _name, item) => {
                    const p = item?.payload as { avgMs?: number; name?: string };
                    return [
                      `${value.toFixed(1)}% (avg ${formatTactSeconds(p?.avgMs ?? 0)})`,
                      p?.name ?? "Contribution",
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
            {contributions.map((c) => (
              <div
                key={c.groupId}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="font-medium truncate">{c.groupName}</span>
                </div>
                <div className="text-right font-mono text-xs shrink-0 ml-2">
                  <div>{c.percent.toFixed(1)}%</div>
                  <div className="text-muted-foreground">
                    avg {formatTactSeconds(c.avgDurationMs)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
