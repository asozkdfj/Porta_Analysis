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
import {
  ERROR_CHART_BAR,
  ERROR_CHART_BAR_ACCENT,
} from "@/lib/error-analysis-types";
import type { ErrorRankItem } from "@/lib/error-analysis-types";

interface ErrorRankingChartProps {
  items: ErrorRankItem[];
  maxItems?: number;
  chartHeight?: number;
  embedded?: boolean;
}

export function ErrorRankingChart({
  items,
  maxItems = 15,
  chartHeight = 360,
  embedded = false,
}: ErrorRankingChartProps) {
  const data = items.slice(0, maxItems).map((item, i) => ({
    rank: i + 1,
    name:
      item.item.length > 28 ? `${item.item.slice(0, 26)}…` : item.item,
    fullName: item.item,
    count: item.count,
    fill: i < 3 ? ERROR_CHART_BAR_ACCENT : ERROR_CHART_BAR,
  }));

  if (data.length === 0) {
    const empty = (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Fail 데이터가 없습니다.
      </div>
    );
    return embedded ? empty : <Card><CardContent>{empty}</CardContent></Card>;
  }

  const chart = (
    <div className="w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: embedded ? 9 : 11, fill: "#64748b" }} />
          <YAxis
            type="category"
            dataKey="name"
            width={embedded ? 130 : 160}
            tick={{ fontSize: embedded ? 9 : 10, fill: "#475569" }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
            }}
            formatter={(v: number) => [v, "Count"]}
            labelFormatter={(_l, payload) => {
              const p = payload?.[0]?.payload as { fullName?: string };
              return p?.fullName ?? "";
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.fullName} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  if (embedded) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 shrink-0">
          Top Error Ranking
        </h3>
        <p className="text-[9px] text-slate-500 mb-1 shrink-0">
          errStr · 모듈당 1건 · 상위 {maxItems}개
        </p>
        <div className="flex-1 min-h-0">{chart}</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Top Error Ranking</CardTitle>
        <p className="text-xs text-muted-foreground">
          errStr 기준 Fail 빈도 순 · 모듈당 1건 · 상위 {maxItems}개
        </p>
      </CardHeader>
      <CardContent>{chart}</CardContent>
    </Card>
  );
}
