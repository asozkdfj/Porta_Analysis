"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EyeOff, Minus, Plus, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/controls/SearchableSelect";
import { cn } from "@/lib/utils";
import {
  buildChartMargin,
  formatAxisTick,
  Y_AXIS_LABEL_PROPS,
  Y_AXIS_TICK,
  Y_AXIS_WIDTH,
} from "@/lib/chart-axis";
import {
  computeChartDomainFromValues,
  scaleDomainAroundCenter,
} from "@/lib/chart-domain";
import { getSnColor } from "@/lib/chart-colors";
import {
  computeOverallAverageFromBarcodes,
  formatSocketChartLabel,
  isTempSpecOut,
  makeTemperatureReadingKey,
} from "@/lib/temperature-tracking";
import type {
  TemperatureBarcodeSeries,
  TemperatureOverviewAnalysis,
} from "@/lib/temperature-tracking-types";

interface ChartPoint {
  x: number;
  xTick: number;
  runId: string;
  readingKey: string;
  socket: string;
  socketLabel: string;
  y: number;
  barcode: string;
  barcodeLabel: string;
  specOut: boolean;
  attemptLabel: string;
}

interface TemperatureTrendChartProps {
  analysis: TemperatureOverviewAnalysis;
  barcodes: TemperatureBarcodeSeries[];
  focusBarcode: string;
  onFocusBarcodeChange?: (barcode: string) => void;
  highlightSocket?: string | null;
  highlightRunId?: string | null;
  selectedReadingKey?: string | null;
  onSelectReading?: (key: string | null) => void;
  onExcludeReading?: (key: string) => void;
}

const Y_SCALE_MIN = 25;
const Y_SCALE_MAX = 400;
const Y_SCALE_STEP = 5;
const Y_SCALE_DEFAULT = 100;
const CHART_HEIGHT = 500;
const X_AXIS_HEIGHT = 72;
const CHART_BOTTOM_MARGIN = 64;
const X_TICK_ANGLE = -55;

function fmtLimit(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}°C`;
}

function formatTooltipValue(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "—";
  return `${num.toFixed(2)} °C`;
}

function jitter01(text: string): number {
  // deterministic 0..1
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export function TemperatureTrendChart({
  analysis,
  barcodes,
  focusBarcode,
  onFocusBarcodeChange,
  highlightSocket,
  highlightRunId,
  selectedReadingKey,
  onSelectReading,
  onExcludeReading,
}: TemperatureTrendChartProps) {
  const [barcodeMenuOpen, setBarcodeMenuOpen] = useState(false);
  const [yScalePct, setYScalePct] = useState(Y_SCALE_DEFAULT);

  const analysisKey = `${analysis.branch}|${analysis.socketOrder.join(",")}|${analysis.summary.barcodeCount}`;
  useEffect(() => {
    setYScalePct(Y_SCALE_DEFAULT);
  }, [analysisKey]);

  const allValues = useMemo(
    () => barcodes.flatMap((b) => b.readings.map((r) => r.value)),
    [barcodes]
  );
  const baseYDomain = useMemo(
    () =>
      computeChartDomainFromValues(
        allValues,
        analysis.limits.lower,
        analysis.limits.upper
      ),
    [allValues, analysis.limits.lower, analysis.limits.upper]
  );
  const [yLo, yHi] = useMemo(
    () => scaleDomainAroundCenter(baseYDomain, yScalePct / 100),
    [baseYDomain, yScalePct]
  );

  if (barcodes.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          표시할 온도 데이터가 없습니다.
        </CardContent>
      </Card>
    );
  }

  const focusSeries =
    barcodes.find((b) => b.barcode === focusBarcode) ?? barcodes[0];
  const focusIndex = barcodes.findIndex((b) => b.barcode === focusSeries.barcode);

  const overallAvg = computeOverallAverageFromBarcodes(barcodes);
  const { limits, branch, summary } = analysis;
  const margin = {
    ...buildChartMargin(yLo, yHi),
    bottom: CHART_BOTTOM_MARGIN,
  };

  if (allValues.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          표시할 온도 데이터가 없습니다.
        </CardContent>
      </Card>
    );
  }

  const socketCount = analysis.socketOrder.length;
  const ticks = Array.from({ length: socketCount }, (_, i) => i + 1);
  const xTickFontSize = socketCount > 48 ? 8 : socketCount > 32 ? 9 : 10;
  const socketLabelByIndex = new Map(
    analysis.socketOrder.map((socket, i) => [
      i + 1,
      formatSocketChartLabel(socket),
    ])
  );
  const firstSocketLabel =
    socketLabelByIndex.get(1) ?? formatSocketChartLabel(analysis.socketOrder[0] ?? "");
  const lastSocketLabel =
    socketLabelByIndex.get(socketCount) ??
    formatSocketChartLabel(analysis.socketOrder[socketCount - 1] ?? "");

  const backgroundPoints: ChartPoint[] = barcodes.flatMap((bc) =>
    bc.readings.map((r) => ({
      x: r.socketIndex + (jitter01(`${bc.barcode}|${r.runId}`) - 0.5) * 0.22,
      xTick: r.socketIndex,
      runId: r.runId,
      readingKey: makeTemperatureReadingKey(bc.barcode, r.runId),
      socket: r.socket,
      socketLabel: r.socketLabel,
      y: r.value,
      barcode: bc.barcode,
      barcodeLabel: bc.barcodeLabel,
      specOut: r.specOut || isTempSpecOut(r.value, limits),
      attemptLabel: r.attemptLabel,
    }))
  );

  const focusPoints: ChartPoint[] = focusSeries.readings.map((r) => ({
    x: r.socketIndex + (jitter01(`${focusSeries.barcode}|${r.runId}`) - 0.5) * 0.12,
    xTick: r.socketIndex,
    runId: r.runId,
    readingKey: makeTemperatureReadingKey(focusSeries.barcode, r.runId),
    socket: r.socket,
    socketLabel: r.socketLabel,
    y: r.value,
    barcode: focusSeries.barcode,
    barcodeLabel: focusSeries.barcodeLabel,
    specOut: r.specOut || isTempSpecOut(r.value, limits),
    attemptLabel: r.attemptLabel,
  }));

  const selectedPoint =
    selectedReadingKey != null
      ? [...backgroundPoints, ...focusPoints].find(
          (p) => p.readingKey === selectedReadingKey
        )
      : undefined;

  const handlePointClick = (point: ChartPoint) => {
    if (!onSelectReading) return;
    onSelectReading(
      selectedReadingKey === point.readingKey ? null : point.readingKey
    );
    if (onFocusBarcodeChange && point.barcode !== focusBarcode) {
      onFocusBarcodeChange(point.barcode);
    }
  };

  return (
    <Card className={cn("relative", barcodeMenuOpen && "z-40")}>
      <CardHeader className="pb-2 space-y-3">
        <div>
          <CardTitle className="text-lg">Temperature Overview · LIW{branch}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            전체 Barcode {summary.barcodeCount}개 · 검은 점 = 전체 분포
            {" · "}Socket {firstSocketLabel} ~ {lastSocketLabel}
            {" · "}Spec {fmtLimit(limits.lower)} ~ {fmtLimit(limits.upper)}
            {limits.target !== null && ` · Target ${fmtLimit(limits.target)}`}
            {" · "}점 클릭 → 선택 · 선택 데이터 제외
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onExcludeReading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedReadingKey}
              onClick={() =>
                selectedReadingKey && onExcludeReading(selectedReadingKey)
              }
            >
              <EyeOff className="h-4 w-4" />
              선택 데이터 제외
            </Button>
          )}
          {selectedPoint && (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
              선택:{" "}
              <span className="font-mono font-semibold">
                {selectedPoint.socketLabel}
              </span>
              {" · "}
              {selectedPoint.barcodeLabel}
              {" · "}
              {selectedPoint.y.toFixed(2)}°C
            </span>
          )}
        </div>
        {onFocusBarcodeChange && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm max-w-xl">
            <SearchableSelect
              label="강조 Barcode"
              variant="compact"
              accentColor={getSnColor(focusIndex)}
              options={barcodes.map((b) => b.barcode)}
              value={focusBarcode}
              onChange={onFocusBarcodeChange}
              onOpenChange={setBarcodeMenuOpen}
              placeholder="Barcode 검색 또는 선택"
              emptyMessage="일치하는 Barcode 없음"
              className="w-full"
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <span className="font-medium text-slate-700">Y축 Scale</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label="Y축 확대"
            onClick={() =>
              setYScalePct((pct) => Math.max(Y_SCALE_MIN, pct - Y_SCALE_STEP))
            }
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <input
            type="range"
            min={Y_SCALE_MIN}
            max={Y_SCALE_MAX}
            step={Y_SCALE_STEP}
            value={yScalePct}
            onChange={(e) => setYScalePct(Number(e.target.value))}
            className="h-1.5 w-36 cursor-pointer accent-slate-800"
            aria-label="Y축 scale"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label="Y축 축소"
            onClick={() =>
              setYScalePct((pct) => Math.min(Y_SCALE_MAX, pct + Y_SCALE_STEP))
            }
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[3rem] font-mono text-slate-600">{yScalePct}%</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground"
            onClick={() => setYScalePct(Y_SCALE_DEFAULT)}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            초기화
          </Button>
          <span className="text-muted-foreground">
            낮을수록 Y축 확대 · 100% = 자동 범위
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={margin}>
              <CartesianGrid strokeDasharray="3 3" />
              {limits.lower !== null && limits.upper !== null && (
                <>
                  <ReferenceArea
                    y1={yLo}
                    y2={limits.lower}
                    fill="#dc2626"
                    fillOpacity={0.06}
                    strokeOpacity={0}
                  />
                  <ReferenceArea
                    y1={limits.lower}
                    y2={limits.upper}
                    fill="#16a34a"
                    fillOpacity={0.08}
                    strokeOpacity={0}
                  />
                  <ReferenceArea
                    y1={limits.upper}
                    y2={yHi}
                    fill="#dc2626"
                    fillOpacity={0.06}
                    strokeOpacity={0}
                  />
                </>
              )}
              {limits.lower !== null && limits.upper === null && (
                <ReferenceArea
                  y1={limits.lower}
                  y2={yHi}
                  fill="#16a34a"
                  fillOpacity={0.08}
                  strokeOpacity={0}
                />
              )}
              {limits.upper !== null && limits.lower === null && (
                <ReferenceArea
                  y1={yLo}
                  y2={limits.upper}
                  fill="#16a34a"
                  fillOpacity={0.08}
                  strokeOpacity={0}
                />
              )}
              <XAxis
                type="number"
                dataKey="x"
                domain={[0.5, socketCount + 0.5]}
                ticks={ticks}
                interval={0}
                minTickGap={0}
                allowDecimals={false}
                height={X_AXIS_HEIGHT}
                angle={X_TICK_ANGLE}
                textAnchor="end"
                tick={{ fontSize: xTickFontSize, fill: "#64748b" }}
                tickFormatter={(value) =>
                  socketLabelByIndex.get(Number(value)) ?? ""
                }
                label={{
                  value: "Socket",
                  position: "insideBottom",
                  offset: -4,
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[yLo, yHi]}
                tick={Y_AXIS_TICK}
                tickFormatter={formatAxisTick}
                width={Y_AXIS_WIDTH}
                label={{
                  ...Y_AXIS_LABEL_PROPS,
                  value: "Temperature (°C)",
                  offset: 8,
                }}
              />
              <Tooltip
                formatter={(value, _name, item) => {
                  const p = item?.payload as {
                    y?: number;
                    barcodeLabel?: string;
                    barcode?: string;
                    specOut?: boolean;
                  };
                  if (!p) return [formatTooltipValue(value), ""];
                  const label = p.specOut ? " (Spec Out)" : "";
                  return [
                    `${formatTooltipValue(p.y)}${label}`,
                    p.barcodeLabel ?? p.barcode ?? "",
                  ];
                }}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as {
                    socketLabel?: string;
                    attemptLabel?: string;
                  };
                  return p?.socketLabel
                    ? `Socket ${p.socketLabel}${p.attemptLabel ? ` · ${p.attemptLabel}` : ""}`
                    : "Socket";
                }}
              />
              {/* 전체 Barcode 분포 (배경) */}
              <Scatter
                data={backgroundPoints}
                fill="#0f172a"
                fillOpacity={0.65}
                stroke="none"
                isAnimationActive={false}
                shape={(props: {
                  cx?: number;
                  cy?: number;
                  payload?: ChartPoint;
                }) => {
                  const { cx, cy, payload } = props;
                  if (cx === undefined || cy === undefined || !payload) {
                    return (
                      <circle
                        key={`bg-empty-${payload?.barcode ?? "x"}-${payload?.socket ?? "x"}`}
                        cx={0}
                        cy={0}
                        r={0}
                        fill="none"
                        stroke="none"
                      />
                    );
                  }
                  const out = payload.specOut;
                  const isSelected = payload.readingKey === selectedReadingKey;
                  return (
                    <circle
                      key={`${payload.barcode}-${payload.socket}-${payload.xTick}`}
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 5.2 : out ? 3.4 : 3}
                      fill={isSelected ? "#f59e0b" : out ? "#dc2626" : "#0f172a"}
                      fillOpacity={isSelected ? 1 : out ? 0.85 : 0.65}
                      stroke={isSelected ? "#b45309" : out ? "#991b1b" : "none"}
                      strokeWidth={isSelected ? 2 : out ? 0.8 : 0}
                      style={{ cursor: onSelectReading ? "pointer" : undefined }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePointClick(payload);
                      }}
                    />
                  );
                }}
              />

              {/* 강조 Barcode (전면) */}
              <Scatter
                data={focusPoints}
                fill={getSnColor(focusIndex)}
                stroke={getSnColor(focusIndex)}
                isAnimationActive={false}
                shape={(props: {
                  cx?: number;
                  cy?: number;
                  payload?: ChartPoint;
                }) => {
                  const { cx, cy, payload } = props;
                  if (cx === undefined || cy === undefined || !payload) {
                    return (
                      <circle
                        key={`focus-empty-${payload?.socket ?? "x"}-${payload?.xTick ?? "x"}`}
                        cx={0}
                        cy={0}
                        r={0}
                        fill="none"
                        stroke="none"
                      />
                    );
                  }
                  const isHL =
                    (!!highlightRunId && payload.runId === highlightRunId) ||
                    (!highlightRunId &&
                      !!highlightSocket &&
                      payload.socket === highlightSocket);
                  const isSelected = payload.readingKey === selectedReadingKey;
                  const out = payload.specOut;
                  const strokeColor = isSelected
                    ? "#b45309"
                    : out
                      ? "#dc2626"
                      : getSnColor(focusIndex);
                  return (
                    <circle
                      key={`focus-${payload.socket}-${payload.xTick}`}
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 8 : isHL ? 7 : out ? 5 : 4.2}
                      fill={
                        isSelected
                          ? "#f59e0b"
                          : out
                            ? "#dc2626"
                            : isHL
                              ? getSnColor(focusIndex)
                              : "#fff"
                      }
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 3 : isHL ? 3 : out ? 2.5 : 2}
                      style={{ cursor: onSelectReading ? "pointer" : undefined }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePointClick(payload);
                      }}
                    />
                  );
                }}
              />
              {overallAvg !== null && (
                <ReferenceLine
                  y={overallAvg}
                  stroke="#64748b"
                  strokeDasharray="6 4"
                  label={{
                    value: `Avg ${overallAvg.toFixed(1)}°C`,
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                />
              )}
              {limits.target !== null && (
                <ReferenceLine
                  y={limits.target}
                  stroke="#16a34a"
                  strokeDasharray="4 4"
                  label={{
                    value: `Target ${limits.target.toFixed(1)}°C`,
                    position: "insideBottomLeft",
                    fontSize: 10,
                    fill: "#16a34a",
                  }}
                />
              )}
              {limits.upper !== null && (
                <ReferenceLine
                  y={limits.upper}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  label={{
                    value: `Upper ${limits.upper.toFixed(1)}°C`,
                    position: "insideTopLeft",
                    fontSize: 10,
                    fill: "#dc2626",
                  }}
                />
              )}
              {limits.lower !== null && (
                <ReferenceLine
                  y={limits.lower}
                  stroke="#2563eb"
                  strokeDasharray="4 4"
                  label={{
                    value: `Lower ${limits.lower.toFixed(1)}°C`,
                    position: "insideBottomRight",
                    fontSize: 10,
                    fill: "#2563eb",
                  }}
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getSnColor(focusIndex) }}
            />
            <span className="text-muted-foreground">강조</span>
            <span className="font-mono font-semibold text-slate-900 truncate max-w-[240px]">
              {focusSeries.barcodeLabel}
            </span>
          </span>
          {highlightSocket && (
            <span className="rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5 text-blue-700">
              Socket{" "}
              <span className="font-mono font-semibold">
                {formatSocketChartLabel(highlightSocket)}
              </span>
            </span>
          )}
          <span className="text-muted-foreground">
            검은 점 = 전체 Barcode 분포 · 빨간 점 = Spec 이탈 · 주황 점 =
            선택 · 강조 Barcode는 색 테두리 원
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
