"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SocketGoldenRow } from "@/lib/golden-socket-analysis";

interface GoldenDeltaChartProps {
  rows: SocketGoldenRow[];
  goldenDeltaLimit: number;
  goldenSocket: string | null;
}

export function GoldenDeltaChart({
  rows,
  goldenDeltaLimit,
  goldenSocket,
}: GoldenDeltaChartProps) {
  const data = rows
    .filter((r) => r.deltaFromGolden !== null)
    .map((r) => ({
      socket: r.socket,
      delta: r.deltaFromGolden!,
      isGolden: r.isGoldenSocket,
      goldenResult: r.goldenResult,
    }));

  if (!goldenSocket || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Golden Delta Graph</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            Golden Socket을 선택하고 데이터를 로드하면 Delta From Golden 그래프가 표시됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  function barColor(delta: number, isGolden: boolean): string {
    if (isGolden) return "#6366f1";
    if (Math.abs(delta) <= goldenDeltaLimit) return "#22c55e";
    return "#f59e0b";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Golden Delta Graph</CardTitle>
        <p className="text-xs text-muted-foreground">
          Delta From Golden (±{goldenDeltaLimit} limit)
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="socket"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                label={{
                  value: "Delta From Golden",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11 },
                }}
              />
              <Tooltip
                formatter={(value: number) => [
                  `${value >= 0 ? "+" : ""}${value.toFixed(4)}`,
                  "Delta",
                ]}
              />
              <ReferenceLine y={goldenDeltaLimit} stroke="#94a3b8" strokeDasharray="4 4" />
              <ReferenceLine y={-goldenDeltaLimit} stroke="#94a3b8" strokeDasharray="4 4" />
              <ReferenceLine y={0} stroke="#64748b" />
              <Bar dataKey="delta" radius={[2, 2, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={barColor(entry.delta, entry.isGolden)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
