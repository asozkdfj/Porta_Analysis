"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ErrorTrendPoint } from "@/lib/error-analysis-types";
import { ERROR_TREND_BAR } from "@/lib/error-analysis-types";

interface ErrorTrendChartProps {
  points: ErrorTrendPoint[];
}

export function ErrorTrendChart({ points }: ErrorTrendChartProps) {
  if (points.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Trend 데이터가 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Error Trend</CardTitle>
        <p className="text-xs text-muted-foreground">
          Run 순서 기준 Fail 발생 추이 (버킷 집계)
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={points}
              margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="runIndex"
                tick={{ fontSize: 10 }}
                label={{
                  value: "Run Index",
                  position: "insideBottom",
                  offset: -4,
                  fontSize: 10,
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                allowDecimals={false}
                label={{
                  value: "Fail Count",
                  angle: -90,
                  position: "insideLeft",
                  offset: 8,
                  fontSize: 10,
                }}
              />
              <Tooltip
                formatter={(v: number) => [v, "Fail Count"]}
                labelFormatter={(l) => `Run #${l}`}
              />
              <Bar dataKey="failCount" fill={ERROR_TREND_BAR} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
