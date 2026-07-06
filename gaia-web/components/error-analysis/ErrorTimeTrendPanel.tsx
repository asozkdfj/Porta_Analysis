"use client";

import { useMemo } from "react";
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
import type {
  TestTimeAnalysis,
  TestTimePoint,
  UphTrendAnalysis,
} from "@/lib/error-analysis-types";

interface ErrorTimeTrendPanelProps {
  testTimeAnalysis: TestTimeAnalysis;
  uphTrend: UphTrendAnalysis;
  chartHeight?: number;
  embedded?: boolean;
}

function formatSec(sec: number): string {
  return `${sec.toFixed(1)}s`;
}

function formatTimeMs(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type TrendChartRow = TestTimePoint & {
  xMs: number;
  timeLabel: string;
};

type UphChartRow = {
  xMs: number;
  uph: number;
  uphLabel: string;
  uphCompletedCount: number;
  windowElapsedSec: number;
};

function isFiniteMs(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

function isValidDomain(domain: [number, number]): boolean {
  return (
    Number.isFinite(domain[0]) &&
    Number.isFinite(domain[1]) &&
    domain[1] > domain[0]
  );
}

function findNearestUphPoint(
  xMs: number,
  uphRows: UphChartRow[],
  maxDeltaMs = 3 * 60 * 1000
): UphChartRow | null {
  if (uphRows.length === 0) return null;

  let best = uphRows[0]!;
  let bestDist = Math.abs(best.xMs - xMs);

  for (const row of uphRows) {
    const dist = Math.abs(row.xMs - xMs);
    if (dist < bestDist) {
      best = row;
      bestDist = dist;
    }
  }

  return bestDist <= maxDeltaMs ? best : null;
}

function formatUphCompact(uph: number): string {
  return `${Math.round(uph).toLocaleString()} UPH`;
}

function formatWindowElapsed(sec: number): string {
  if (sec <= 0) return "시작";
  if (sec < 3600) return `${Math.round(sec / 60)}분 구간`;
  return "최근 1시간";
}

interface CombinedTrendTooltipProps extends TooltipProps<number, string> {
  uphChartData: UphChartRow[];
  timeBased: boolean;
}

function CombinedTrendTooltip({
  active,
  payload,
  label,
  uphChartData,
  timeBased,
}: CombinedTrendTooltipProps) {
  if (!active) return null;

  const xMs =
    typeof label === "number"
      ? label
      : label != null && !Number.isNaN(Number(label))
        ? Number(label)
        : payload?.[0]?.payload?.xMs != null
          ? Number(payload[0].payload.xMs)
          : null;

  const testPayload = payload?.find(
    (entry) =>
      entry.dataKey === "testTimeSec" &&
      entry.payload &&
      Number.isFinite((entry.payload as TrendChartRow).testTimeSec)
  )?.payload as TrendChartRow | undefined;

  const uphPayload = payload?.find((entry) => entry.dataKey === "uph")
    ?.payload as UphChartRow | undefined;

  const uphPoint =
    uphPayload ??
    (xMs != null && timeBased
      ? findNearestUphPoint(xMs, uphChartData)
      : null);

  if (!testPayload && !uphPoint) return null;

  const timeLabel =
    xMs != null && timeBased
      ? formatTimeMs(xMs)
      : testPayload?.timeLabel ??
        (uphPoint ? formatTimeMs(uphPoint.xMs) : "—");

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-lg min-w-[200px]">
      <div className="font-semibold text-slate-800 border-b border-slate-100 pb-1.5 mb-2">
        {timeLabel}
      </div>

      {uphPoint && (
        <div className="rounded-md bg-blue-50 border border-blue-100 px-2.5 py-2 mb-2">
          <div className="text-[10px] font-medium text-blue-700 uppercase tracking-wide">
            UPH Trend
          </div>
          <div className="text-xl font-bold text-blue-900 font-mono mt-0.5">
            {formatUphCompact(uphPoint.uph)}
          </div>
          <div className="text-[11px] text-blue-800/90 mt-1">
            완료 {uphPoint.uphCompletedCount.toLocaleString()} ea ·{" "}
            {formatWindowElapsed(uphPoint.windowElapsedSec)}
          </div>
          <div className="text-[10px] text-blue-700/80 mt-1 font-mono">
            {uphPoint.uphLabel}
          </div>
        </div>
      )}

      {testPayload && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            Test Time
          </div>
          {testPayload.startTime ? (
            <div className="font-mono text-slate-600 text-[11px]">
              StartTime · {testPayload.startTime}
            </div>
          ) : null}
          <div className="text-slate-800">
            <span className="font-mono font-semibold text-base">
              {formatSec(testPayload.testTimeSec)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Badge
              variant={testPayload.status === "FAIL" ? "danger" : "secondary"}
              className="text-[10px]"
            >
              {testPayload.status}
            </Badge>
            {testPayload.isAbnormal ? (
              <Badge variant="danger" className="text-[10px]">
                Abnormal
              </Badge>
            ) : (
              <Badge variant="success" className="text-[10px]">
                Normal
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground font-mono text-[10px]">
            {testPayload.barcode} · {testPayload.socket}
          </div>
        </div>
      )}
    </div>
  );
}

function buildTimeAxisDomain(
  testRows: { xMs: number }[],
  uphRows: { xMs: number }[],
  timeBased: boolean
): [number, number] {
  const xs = (timeBased
    ? [...testRows.map((r) => r.xMs), ...uphRows.map((r) => r.xMs)]
    : testRows.map((r) => r.xMs)
  ).filter(Number.isFinite);

  if (xs.length === 0) return [0, 1];

  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const span = max - min;

  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];

  if (!timeBased || span <= 0) {
    const pad = span > 0 ? Math.max(span * 0.02, 0.5) : 1;
    return [min - pad, max + pad];
  }

  const pad = Math.max(span * 0.02, 60_000);
  return [min - pad, max + pad];
}

function TestTimeDot(props: DotProps & { payload?: TrendChartRow }) {
  const { cx, cy, payload } = props;
  if (
    cx == null ||
    cy == null ||
    !Number.isFinite(cx) ||
    !Number.isFinite(cy) ||
    !payload
  ) {
    return null;
  }

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

function EmptyTrendPanel({
  embedded,
  message,
}: {
  embedded?: boolean;
  message: string;
}) {
  const body = (
    <div className="flex h-full min-h-[120px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Test Time &amp; UPH Trend</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

export function ErrorTimeTrendPanel({
  testTimeAnalysis,
  uphTrend,
  chartHeight = 320,
  embedded = false,
}: ErrorTimeTrendPanelProps) {
  const { points, abnormalThresholdSec } = testTimeAnalysis;

  const chartModel = useMemo(() => {
    const timeBased = points.some((p) => isFiniteMs(p.startTimeMs));

    const testChartData: TrendChartRow[] = (timeBased
      ? points
          .filter((p) => isFiniteMs(p.startTimeMs))
          .map((p) => ({
            ...p,
            xMs: p.startTimeMs!,
            timeLabel: formatTimeMs(p.startTimeMs!),
          }))
      : points
          .filter((p) => Number.isFinite(p.runIndex))
          .map((p) => ({
            ...p,
            xMs: p.runIndex,
            timeLabel: `Run #${p.runIndex}`,
          }))
    )
      .filter(
        (row) =>
          Number.isFinite(row.xMs) &&
          Number.isFinite(row.testTimeSec) &&
          row.testTimeSec > 0
      )
      .sort((a, b) => a.xMs - b.xMs);

    const uphChartData: UphChartRow[] = uphTrend.points
      .filter((p) => p.uph != null && isFiniteMs(p.intervalEndMs))
      .map((p) => ({
        xMs: p.intervalEndMs,
        uph: p.uph!,
        uphLabel: p.label,
        uphCompletedCount: p.completedCount,
        windowElapsedSec: p.windowElapsedSec,
      }))
      .filter((row) => Number.isFinite(row.xMs) && Number.isFinite(row.uph))
      .sort((a, b) => a.xMs - b.xMs);

    const hasUphTrend = timeBased && uphChartData.length > 0;
    const xDomain = buildTimeAxisDomain(
      testChartData,
      uphChartData,
      timeBased
    );

    return {
      timeBased,
      testChartData,
      uphChartData,
      hasUphTrend,
      xDomain,
      canRender:
        testChartData.length > 0 && isValidDomain(xDomain),
    };
  }, [points, uphTrend.points]);

  if (chartModel.testChartData.length === 0) {
    return (
      <EmptyTrendPanel
        embedded={embedded}
        message="TestTime 데이터가 없습니다. CSV에 TestTime 컬럼이 있는지 확인해 주세요."
      />
    );
  }

  if (!chartModel.canRender) {
    return (
      <EmptyTrendPanel
        embedded={embedded}
        message="차트 축 데이터를 계산할 수 없습니다. StartTime / TestTime 형식을 확인해 주세요."
      />
    );
  }

  const { timeBased, testChartData, uphChartData, hasUphTrend, xDomain } =
    chartModel;
  const showReferenceLine = Number.isFinite(abnormalThresholdSec);

  const legend = (
    <div
      className={
        embedded
          ? "flex flex-wrap gap-3 text-[9px] text-slate-500 mb-1 shrink-0"
          : "flex flex-wrap gap-4 text-[11px] text-muted-foreground mt-2"
      }
    >
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-slate-500" />
        Normal
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Abnormal
      </span>
      {hasUphTrend && (
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-blue-500" />
          UPH
        </span>
      )}
      {!timeBased && uphChartData.length > 0 && (
        <span className="text-amber-700">
          StartTime 없음 — UPH Trend는 StartTime 파싱 시 함께 표시됩니다.
        </span>
      )}
    </div>
  );

  const chart = (
    <>
      {embedded && legend}
      <div
        className="w-full min-w-[280px]"
        style={{ height: chartHeight, minHeight: chartHeight }}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={280}>
          <ComposedChart
            data={testChartData}
            margin={{
              top: embedded ? 8 : 12,
              right: hasUphTrend ? (embedded ? 40 : 48) : 16,
              left: 4,
              bottom: embedded ? 4 : 8,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="xMs"
              type="number"
              domain={xDomain}
              allowDataOverflow={false}
              tick={{ fontSize: embedded ? 9 : 10 }}
              tickFormatter={(v: number) =>
                timeBased ? formatTimeMs(v) : `#${Math.round(v)}`
              }
              tickCount={embedded ? 6 : 8}
            />
            <YAxis
              yAxisId="testTime"
              tick={{ fontSize: embedded ? 9 : 11 }}
              tickFormatter={(v: number) => `${v}s`}
              width={embedded ? 36 : 48}
              domain={[0, "auto"]}
            />
            {hasUphTrend && (
              <YAxis
                yAxisId="uph"
                orientation="right"
                domain={[0, "auto"]}
                tick={{ fontSize: embedded ? 9 : 11 }}
                width={embedded ? 32 : 40}
                tickFormatter={(v: number) => `${v}`}
              />
            )}
            <Tooltip
              shared
              cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
              content={
                <CombinedTrendTooltip
                  uphChartData={uphChartData}
                  timeBased={timeBased}
                />
              }
            />
            {showReferenceLine && (
              <ReferenceLine
                yAxisId="testTime"
                y={abnormalThresholdSec}
                stroke="#ef4444"
                strokeDasharray="6 4"
                strokeWidth={embedded ? 1.5 : 2}
                ifOverflow="hidden"
              />
            )}
            <Line
              yAxisId="testTime"
              name="Test Time"
              type="monotone"
              dataKey="testTimeSec"
              stroke="none"
              connectNulls={false}
              dot={<TestTimeDot />}
              activeDot={{ r: embedded ? 4 : 6 }}
              isAnimationActive={false}
            />
            {hasUphTrend && (
              <Line
                yAxisId="uph"
                name="UPH"
                data={uphChartData}
                type="monotone"
                dataKey="uph"
                stroke="#3b82f6"
                strokeWidth={embedded ? 1.5 : 2}
                dot={{ r: embedded ? 2.5 : 4, fill: "#3b82f6", strokeWidth: 0 }}
                activeDot={{
                  r: embedded ? 5 : 7,
                  fill: "#2563eb",
                  stroke: "#fff",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {!embedded && legend}
    </>
  );

  if (embedded) {
    return <div className="h-full flex flex-col min-h-0">{chart}</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Test Time &amp; UPH Trend</CardTitle>
        <p className="text-xs text-muted-foreground">
          {timeBased
            ? "동일 시간축 · Test Time = StartTime · UPH = 5분 샘플 · 1시간 롤링"
            : "StartTime 파싱 불가 — Run Index 기준 Test Time 표시"}
        </p>
      </CardHeader>
      <CardContent>{chart}</CardContent>
    </Card>
  );
}
