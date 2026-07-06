"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  ErrorDistributionGroup,
  ErrorDistributionSlice,
  ErrorRankItem,
} from "@/lib/error-analysis-types";
import { ERROR_DISTRIBUTION_LABELS } from "@/lib/error-analysis-types";

interface ErrorDistributionChartProps {
  slices: ErrorDistributionSlice[];
  distributionItemsByGroup: Partial<
    Record<ErrorDistributionGroup, ErrorRankItem[]>
  >;
  captureMode?: boolean;
  pieHeight?: number;
  embedded?: boolean;
}

export function ErrorDistributionChart({
  slices,
  distributionItemsByGroup,
  captureMode = false,
  pieHeight = 260,
  embedded = false,
}: ErrorDistributionChartProps) {
  const [expandedGroup, setExpandedGroup] =
    useState<ErrorDistributionGroup | null>(null);

  const data = slices.map((s) => ({
    group: s.group,
    name: ERROR_DISTRIBUTION_LABELS[s.group],
    value: s.count,
    percent: s.percent,
    color: s.color,
  }));

  if (data.length === 0) {
    const empty = (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Error Distribution 데이터가 없습니다.
      </div>
    );
    return embedded ? empty : <Card><CardContent>{empty}</CardContent></Card>;
  }

  const innerRadius = embedded ? 36 : 52;
  const outerRadius = embedded ? 62 : 88;

  const toggleGroup = (group: ErrorDistributionGroup) => {
    const items = distributionItemsByGroup[group];
    if (!items?.length) return;
    setExpandedGroup((prev) => (prev === group ? null : group));
  };

  const expandedItems = expandedGroup
    ? distributionItemsByGroup[expandedGroup] ?? []
    : [];

  const legend = (
    <div
      className={cn(
        embedded
          ? "grid grid-cols-2 gap-x-4 gap-y-1 content-center flex-1"
          : "max-h-[220px] overflow-y-auto space-y-1.5 pr-1"
      )}
    >
      {data.map((d) => {
        const items = distributionItemsByGroup[d.group] ?? [];
        const canExpand = !captureMode && items.length > 0;
        const isExpanded = expandedGroup === d.group;

        if (captureMode) {
          return (
            <div
              key={d.name}
              className={cn(
                "flex items-center justify-between",
                embedded
                  ? "text-[10px] py-0.5"
                  : "rounded-md border px-3 py-2 text-sm"
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="font-medium truncate">{d.name}</span>
              </div>
              <span className="font-mono text-muted-foreground shrink-0 ml-2 tabular-nums">
                {d.value} ({d.percent.toFixed(1)}%)
              </span>
            </div>
          );
        }

        return (
          <button
            key={d.name}
            type="button"
            disabled={!canExpand}
            onClick={() => toggleGroup(d.group)}
            className={cn(
              "w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm text-left transition-colors",
              canExpand && "hover:bg-slate-50 cursor-pointer",
              isExpanded && "border-slate-400 bg-slate-50",
              !canExpand && "cursor-default opacity-70"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="font-medium truncate">{d.name}</span>
              {canExpand &&
                (isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ))}
            </div>
            <span className="font-mono text-muted-foreground shrink-0 ml-2 text-xs">
              {d.value} ({d.percent.toFixed(1)}%)
            </span>
          </button>
        );
      })}
    </div>
  );

  const chartBody = (
    <div
      className={cn(
        embedded ? "flex items-center gap-4" : "grid gap-4 lg:grid-cols-2"
      )}
    >
      <div
        className={embedded ? "shrink-0" : "w-full"}
        style={{
          width: embedded ? pieHeight + 40 : undefined,
          height: pieHeight,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              onClick={
                captureMode
                  ? undefined
                  : (_, index) => {
                      const entry = data[index];
                      if (entry) toggleGroup(entry.group);
                    }
              }
              style={{ cursor: captureMode ? "default" : "pointer" }}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                  stroke={
                    expandedGroup === entry.group ? "#475569" : undefined
                  }
                  strokeWidth={expandedGroup === entry.group ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
              }}
              formatter={(v: number, _n, item) => {
                const p = item?.payload as { percent?: number };
                return [
                  captureMode
                    ? `${v} (${(p?.percent ?? 0).toFixed(1)}%)`
                    : `${v} (${(p?.percent ?? 0).toFixed(1)}%) · 클릭하여 errStr 보기`,
                  "Fail (모듈 수)",
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className={cn("space-y-2", embedded && "flex-1 min-w-0")}>
        {legend}
        {!captureMode && expandedGroup && expandedItems.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              {ERROR_DISTRIBUTION_LABELS[expandedGroup]} errStr ·{" "}
              {expandedItems.length}개
            </div>
            <ul className="max-h-40 overflow-y-auto space-y-1">
              {expandedItems.map((item) => (
                <li
                  key={item.item}
                  className="flex items-center justify-between gap-2 text-xs font-mono text-slate-700"
                >
                  <span className="truncate">{item.item}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {item.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
          Error Distribution
        </h3>
        <p className="text-[9px] text-slate-500 mb-1.5">
          errStr 기준 · 모듈당 1회 집계
        </p>
        {chartBody}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Error Distribution</CardTitle>
        <p className="text-xs text-muted-foreground">
          errStr(최초 Fail Item) 기준 · 모듈당 1회 집계 · 그룹 클릭 시 errStr
          항목 확인
        </p>
      </CardHeader>
      <CardContent>{chartBody}</CardContent>
    </Card>
  );
}
