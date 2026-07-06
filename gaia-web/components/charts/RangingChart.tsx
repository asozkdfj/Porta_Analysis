"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GaiaAnalysisResult } from "@/lib/types";

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea", "#0891b2"];

interface RangingChartProps {
  analysis: GaiaAnalysisResult | null;
}

export function RangingChart({ analysis }: RangingChartProps) {
  if (!analysis || analysis.serials.length === 0) {
    return null;
  }

  const sockets = analysis.sockets;
  const chartData = sockets.map((socket) => {
    const row: Record<string, string | number> = { socket };
    analysis.serials.forEach((s) => {
      const matches = s.socketMeans.filter((m) => m.socket === socket);
      const found = matches.sort((a, b) => b.testSequence - a.testSequence)[0];
      row[s.serial] = found?.mean ?? NaN;
    });
    return row;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ranging 오버레이 (소켓별 평균)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="socket" />
              <YAxis />
              <Tooltip />
              <Legend />
              {analysis.serials.slice(0, 8).map((s, i) => (
                <Line
                  key={s.serial}
                  type="monotone"
                  dataKey={s.serial}
                  stroke={COLORS[i % COLORS.length]}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
