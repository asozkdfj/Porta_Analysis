"use client";

import type { LinearityFilter } from "@/lib/liw-linearity-types";
import { filterLabel } from "@/lib/liw-linearity-batch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LinearityResultFiltersProps {
  filter: LinearityFilter;
  onFilterChange: (filter: LinearityFilter) => void;
  showing: number;
  total: number;
}

const MAIN_FILTERS: LinearityFilter[] = ["all", "pass", "fail"];
const FAIL_FILTERS: LinearityFilter[] = [
  "emission_failure",
  "non_linear",
  "data_missing",
];

export function LinearityResultFilters({
  filter,
  onFilterChange,
  showing,
  total,
}: LinearityResultFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {MAIN_FILTERS.map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className={cn(filter === f && "shadow-sm")}
            onClick={() => onFilterChange(f)}
          >
            {filterLabel(f)}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {FAIL_FILTERS.map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className={cn(
              "text-xs",
              filter === f && "shadow-sm",
              filter !== f && "text-red-700 border-red-200"
            )}
            onClick={() => onFilterChange(f)}
          >
            {filterLabel(f)}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Showing <strong>{showing}</strong> of <strong>{total}</strong> results
        {" · "}Filter: <strong>{filterLabel(filter)}</strong>
      </p>
    </div>
  );
}
