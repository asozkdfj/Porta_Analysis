"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CYCLE_TOTAL_TIME_LABEL,
  formatTactSeconds,
} from "@/lib/tact-time-cycles";
import type { TactTimeCycle } from "@/lib/tact-time-types";

interface TactTimeCycleExplorerProps {
  cycles: TactTimeCycle[];
  selectedCycle: TactTimeCycle | null;
  onSelectCycle: (cycleId: string) => void;
}

export function TactTimeCycleExplorer({
  cycles,
  selectedCycle,
  onSelectCycle,
}: TactTimeCycleExplorerProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Cycle Breakdown &amp; Drill Down</CardTitle>
        <p className="text-xs text-muted-foreground">
          Cycle 선택 → 그룹별 Breakdown → 세부 Header Duration
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {cycles.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCycle(c.id)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs transition-colors text-left",
                selectedCycle?.id === c.id
                  ? "border-blue-500 bg-blue-50 text-blue-900"
                  : "border-slate-200 hover:bg-slate-50",
                c.isOutlier && "ring-1 ring-red-300"
              )}
            >
              <div className="font-mono font-semibold">#{c.cycleNumber}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {CYCLE_TOTAL_TIME_LABEL}
              </div>
              <div className="font-mono font-semibold">
                {formatTactSeconds(c.totalDurationMs)}
              </div>
              {c.isOutlier && (
                <Badge variant="danger" className="ml-1 text-[9px] px-1">
                  Outlier
                </Badge>
              )}
            </button>
          ))}
        </div>

        {!selectedCycle ? (
          <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-md">
            Cycle을 선택하세요.
          </p>
        ) : (
          <div className="rounded-lg border bg-slate-50/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-sm font-semibold">
                  Cycle #{selectedCycle.cycleNumber}
                </span>
                {selectedCycle.isOutlier && (
                  <Badge variant="danger" className="ml-2 text-[10px]">
                    Outlier Detected
                  </Badge>
                )}
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 text-right">
                <div className="text-[10px] font-medium text-blue-800/80 uppercase tracking-wide">
                  {CYCLE_TOTAL_TIME_LABEL}
                </div>
                <div className="font-mono text-lg font-bold text-blue-950">
                  {formatTactSeconds(selectedCycle.totalDurationMs)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {selectedCycle.groupBreakdown.map((group) => {
                const open = expandedGroups.has(group.groupId);
                return (
                  <div
                    key={group.groupId}
                    className="rounded-md border bg-white overflow-hidden"
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50"
                      onClick={() => toggleGroup(group.groupId)}
                    >
                      <div className="flex items-center gap-2">
                        {open ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="font-semibold text-sm">
                          {group.groupName}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-semibold">
                        {formatTactSeconds(group.durationMs)}
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                          (그룹)
                        </span>
                      </span>
                    </button>
                    {open && (
                      <div className="border-t px-3 py-2 space-y-1 bg-slate-50/80">
                        {group.items.map((item) => (
                          <div
                            key={item.header}
                            className="flex justify-between text-xs font-mono py-1"
                          >
                            <span className="text-slate-700 pl-6">
                              └ {item.header}
                            </span>
                            <span className="tabular-nums">
                              {formatTactSeconds(item.durationMs)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
