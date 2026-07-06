"use client";

import type { GrrFilter } from "@/lib/liw-grr-types";
import { grrFilterLabel } from "@/lib/liw-grr-batch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GrrResultFiltersProps {
  filter: GrrFilter;
  onFilterChange: (filter: GrrFilter) => void;
  showing: number;
  total: number;
}

const FILTERS: GrrFilter[] = [
  "all",
  "pass",
  "fail",
  "po_fail",
  "ntc_fail",
  "wl_center_fail",
];

export function GrrResultFilters({
  filter,
  onFilterChange,
  showing,
  total,
}: GrrResultFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className={cn(
              filter === f && "shadow-sm",
              filter !== f && f.endsWith("_fail") && "text-red-700 border-red-200"
            )}
            onClick={() => onFilterChange(f)}
          >
            {grrFilterLabel(f)}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Showing <strong>{showing}</strong> of <strong>{total}</strong> results · Filter:{" "}
        <strong>{grrFilterLabel(filter)}</strong>
      </p>
    </div>
  );
}
