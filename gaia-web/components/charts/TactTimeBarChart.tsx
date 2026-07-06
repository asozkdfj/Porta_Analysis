"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TactTimeGroupResult } from "@/lib/tact-time-types";

interface TactTimeBarChartProps {
  groups: TactTimeGroupResult[];
}

export function TactTimeBarChart({ groups }: TactTimeBarChartProps) {
  const chartGroups = groups.filter((g) => !g.isUngrouped || g.itemCount > 0);

  if (chartGroups.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          표시할 그룹 데이터가 없습니다.
        </CardContent>
      </Card>
    );
  }

  const data = chartGroups.map((g) => ({
    name: g.name,
    durationMs: g.totalDurationMs,
    color: g.color,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Grouped Tact Time Chart</CardTitle>
        <p className="text-xs text-muted-foreground">
          그룹별 총 소요 시간 (ms)
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={chartGroups.length > 4 ? -20 : 0}
                textAnchor={chartGroups.length > 4 ? "end" : "middle"}
                height={chartGroups.length > 4 ? 56 : 32}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                label={{
                  value: "Tact Time (ms)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  fontSize: 11,
                }}
              />
              <Tooltip
                formatter={(value: number) => [
                  `${value.toLocaleString()} ms`,
                  "Total Duration",
                ]}
              />
              <Bar dataKey="durationMs" radius={[4, 4, 0, 0]} maxBarSize={72}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
