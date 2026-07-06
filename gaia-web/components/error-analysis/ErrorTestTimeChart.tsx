"use client";

import type { DotProps, TooltipProps } from "recharts";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TestTimeAnalysis, TestTimePoint } from "@/lib/error-analysis-types";

interface ErrorTestTimeChartProps {
  analysis: TestTimeAnalysis;
}

function formatSec(sec: number): string {
  return `${sec.toFixed(1)}s`;
}

function TestTimeTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0].payload as TestTimePoint;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-slate-800">Run #{label}</div>
      {p.startTime ? (
        <div className="mt-1 font-mono text-slate-600">
          StartTime · {p.startTime}
        </div>
      ) : null}
      <div className="mt-1 text-slate-700">
        Test Time ·{" "}
        <span className="font-mono font-semibold">{formatSec(p.testTimeSec)}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <Badge
          variant={p.status === "FAIL" ? "danger" : "secondary"}
          className="text-[10px]"
        >
          {p.status}
        </Badge>
        {p.isAbnormal ? (
          <Badge variant="danger" className="text-[10px]">
            Abnormal
          </Badge>
        ) : (
          <Badge variant="success" className="text-[10px]">
            Normal
          </Badge>
        )}
      </div>
      <div className="mt-1 text-muted-foreground font-mono">
        {p.barcode} · {p.socket}
      </div>
    </div>
  );
}

function TestTimeDot(props: DotProps & { payload?: TestTimePoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;

  const isFail = payload.status === "FAIL";
  const fill = payload.isAbnormal
    ? "#ef4444"
    : isFail
      ? "#f97316"
      : "#64748b";
  const r = payload.isAbnormal ? 5 : isFail ? 4.5 : 3;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke={payload.isAbnormal ? "#b91c1c" : isFail ? "#c2410c" : "#475569"}
      strokeWidth={payload.isAbnormal ? 2 : 1}
    />
  );
}

export function ErrorTestTimeChart({ analysis }: ErrorTestTimeChartProps) {
  const { points, abnormalThresholdSec } = analysis;

  if (points.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Test Time Trend</CardTitle>
          <p className="text-xs text-muted-foreground">
            TestTime 컬럼 기준 · Abnormal Threshold {abnormalThresholdSec}s
          </p>
        </CardHeader>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          TestTime 데이터가 없습니다. CSV에 TestTime 헤더가 있는지 확인해
          주세요.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Test Time Trend</CardTitle>
        <p className="text-xs text-muted-foreground">
          Run 순서별 Test Time · Abnormal ≥ {abnormalThresholdSec}s
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
            Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            FAIL
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-red-600/40" />
            Abnormal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-6 border-t-2 border-dashed border-red-500" />
            {abnormalThresholdSec}s Threshold
          </span>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={points}
              margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="runIndex"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={{ fontSize: 10 }}
                tickCount={8}
                label={{
                  value: "Run Index",
                  position: "insideBottom",
                  offset: -4,
                  fontSize: 10,
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${v}s`}
              />
              <Tooltip content={<TestTimeTooltip />} />
              <ReferenceLine
                y={abnormalThresholdSec}
                stroke="#ef4444"
                strokeDasharray="6 4"
                strokeWidth={2}
                label={{
                  value: `${abnormalThresholdSec}s Threshold`,
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#ef4444",
                }}
              />
              <Line
                type="monotone"
                dataKey="testTimeSec"
                stroke="#cbd5e1"
                strokeWidth={1}
                dot={<TestTimeDot />}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {analysis.abnormalRuns.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50/50 px-4 py-3">
            <div className="text-sm font-semibold text-red-900">
              Abnormal Test Time 발생 (≥ {abnormalThresholdSec}s)
            </div>
            <p className="text-xs text-red-800/80 mt-0.5">
              {analysis.abnormalRuns.length}건 ·{" "}
              {analysis.abnormalRate.toFixed(1)}%
            </p>
            <ul className="mt-3 max-h-44 overflow-y-auto space-y-2 pr-1">
              {analysis.abnormalRuns.map((run) => (
                <li
                  key={`abnormal-${run.runIndex}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-100 bg-white px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-mono font-semibold text-slate-800">
                      {run.startTime || "—"}
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      Run #{run.runIndex} · {run.barcode} · {run.socket}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-semibold text-red-800">
                      {formatSec(run.testTimeSec)}
                    </span>
                    <Badge variant="danger" className="text-[10px]">
                      Abnormal
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
