"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TactTimeGroupResult } from "@/lib/tact-time-types";

interface TactTimeGroupTableProps {
  groups: TactTimeGroupResult[];
}

export function TactTimeGroupTable({ groups }: TactTimeGroupTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          그룹 데이터가 없습니다. Setting에서 그룹을 구성하세요.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Grouped Tact Time Table</CardTitle>
        <p className="text-xs text-muted-foreground">
          행을 클릭하면 세부 아이템 Duration을 펼칠 수 있습니다.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 w-8" />
              <th className="py-2 pr-3 font-medium">Group Name</th>
              <th className="py-2 pr-3 font-medium">Included Items</th>
              <th className="py-2 pr-3 font-medium text-right">Item Count</th>
              <th className="py-2 pr-3 font-medium text-right">
                Total Duration(ms)
              </th>
              <th className="py-2 pr-3 font-medium">Start Time</th>
              <th className="py-2 font-medium">End Time</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const isOpen = expanded.has(group.id);
              return (
                <GroupRows
                  key={group.id}
                  group={group}
                  isOpen={isOpen}
                  onToggle={() => toggle(group.id)}
                />
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function GroupRows({
  group,
  isOpen,
  onToggle,
}: {
  group: TactTimeGroupResult;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="border-b cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <td className="py-2.5 pr-2 text-muted-foreground">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </td>
        <td className="py-2.5 pr-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: group.color }}
            />
            <span className="font-semibold">{group.name}</span>
            {group.isUngrouped && (
              <Badge variant="secondary" className="text-[10px]">
                ETC
              </Badge>
            )}
          </div>
        </td>
        <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground max-w-[280px] truncate">
          {group.headers.join(", ")}
        </td>
        <td className="py-2.5 pr-3 text-right tabular-nums">{group.itemCount}</td>
        <td className="py-2.5 pr-3 text-right font-mono font-semibold tabular-nums">
          {group.totalDurationMs.toLocaleString()}
        </td>
        <td className="py-2.5 pr-3 font-mono text-xs">{group.startTime}</td>
        <td className="py-2.5 font-mono text-xs">{group.endTime}</td>
      </tr>
      {isOpen &&
        group.items.map((item) => (
          <tr
            key={`${group.id}-${item.header}`}
            className="border-b bg-slate-50/80 text-xs"
          >
            <td />
                  <td className="py-2 pr-3 pl-6 font-mono text-slate-700">
                    └ {item.header}
                    {item.occurrenceCount && item.occurrenceCount > 1 && (
                      <span className="text-muted-foreground ml-1">
                        ×{item.occurrenceCount}
                      </span>
                    )}
                  </td>
            <td className="py-2 pr-3 text-muted-foreground">—</td>
            <td className="py-2 pr-3 text-right">1</td>
            <td className="py-2 pr-3 text-right font-mono tabular-nums">
              {item.durationMs.toLocaleString()}
            </td>
            <td className="py-2 pr-3 font-mono">{item.startTime || "—"}</td>
            <td className="py-2 font-mono">{item.endTime || "—"}</td>
          </tr>
        ))}
    </>
  );
}
