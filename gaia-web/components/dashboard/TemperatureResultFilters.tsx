"use client";

import type { TemperatureFilter } from "@/lib/temperature-tracking-types";
import { filterLabel } from "@/lib/temperature-tracking";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TemperatureResultFiltersProps {
  filter: TemperatureFilter;
  onFilterChange: (filter: TemperatureFilter) => void;
  showing: number;
  total: number;
}

const FILTERS: TemperatureFilter[] = ["all", "pass", "warning", "fail"];

export function TemperatureResultFilters({
  filter,
  onFilterChange,
  showing,
  total,
}: TemperatureResultFiltersProps) {
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
              f === "warning" && filter !== f && "text-amber-700 border-amber-200",
              f === "fail" && filter !== f && "text-red-700 border-red-200"
            )}
            onClick={() => onFilterChange(f)}
          >
            {filterLabel(f)}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Showing <strong>{showing}</strong> of <strong>{total}</strong> items
        {" · "}Filter: <strong>{filterLabel(filter)}</strong>
      </p>
    </div>
  );
}
