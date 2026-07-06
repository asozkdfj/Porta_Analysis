"use client";

import { cn } from "@/lib/utils";
import type { TesterGrrSidebarEntry } from "@/lib/types";

interface GrrTesterSidebarProps {
  entries: TesterGrrSidebarEntry[];
  onSelectTester: (testerId: string) => void;
  onOpenSummary?: (testerId: string) => void;
  disabled?: boolean;
}

function resultClass(result: TesterGrrSidebarEntry["grrResult"]): string {
  if (result === "pass") return "bg-emerald-600 hover:bg-emerald-700 text-white";
  if (result === "fail") return "bg-red-600 hover:bg-red-700 text-white";
  return "bg-amber-500 hover:bg-amber-600 text-white";
}

export function GrrTesterSidebar({
  entries,
  onSelectTester,
  onOpenSummary,
  disabled,
}: GrrTesterSidebarProps) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-md border bg-white p-3">
      <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
        Tester (Target)
      </div>
      {onOpenSummary && (
        <p className="text-[10px] text-muted-foreground mb-2">
          더블클릭: GRR Summary
        </p>
      )}
      <div className="flex flex-col gap-1 max-h-[480px] overflow-y-auto">
        {entries.map((entry) => (
          <button
            key={entry.testerId}
            type="button"
            disabled={disabled}
            onClick={() => onSelectTester(entry.testerId)}
            onDoubleClick={() => onOpenSummary?.(entry.testerId)}
            className={cn(
              "rounded px-2 py-1.5 text-left text-xs font-mono transition-colors",
              resultClass(entry.grrResult),
              entry.isActive && "ring-2 ring-offset-1 ring-slate-900",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            title={`${entry.testerId} — GRR ${entry.grrResult}`}
          >
            {entry.testerId}
          </button>
        ))}
      </div>
    </div>
  );
}
