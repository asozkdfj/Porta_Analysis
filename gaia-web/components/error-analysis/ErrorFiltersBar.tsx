"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type {
  ErrorAnalysisFilters,
  ErrorDistributionGroup,
  ErrorPassFail,
} from "@/lib/error-analysis-types";
import { ERROR_DISTRIBUTION_LABELS } from "@/lib/error-analysis-types";

interface ErrorFiltersBarProps {
  filters: ErrorAnalysisFilters;
  availableGroups: ErrorDistributionGroup[];
  availableSockets: string[];
  availableStages: string[];
  availableStations: number[];
  availableFailItems: string[];
  drillDownSocket: string | null;
  onFilterChange: <K extends keyof ErrorAnalysisFilters>(
    key: K,
    value: ErrorAnalysisFilters[K]
  ) => void;
  onReset: () => void;
  onClearDrillDown: () => void;
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <select
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ErrorFiltersBar({
  filters,
  availableGroups,
  availableSockets,
  availableStages,
  availableStations,
  availableFailItems,
  drillDownSocket,
  onFilterChange,
  onReset,
  onClearDrillDown,
}: ErrorFiltersBarProps) {
  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Search Fail Item
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="LIW, WL, IDD, LEAKAGE…"
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                value={filters.search}
                onChange={(e) => onFilterChange("search", e.target.value)}
              />
            </div>
          </div>

          <SelectFilter
            label="Analysis Group"
            value={filters.analysisGroup}
            options={[
              { value: "ALL", label: "All Groups" },
              ...availableGroups.map((g) => ({
                value: g,
                label: ERROR_DISTRIBUTION_LABELS[g],
              })),
            ]}
            onChange={(v) =>
              onFilterChange(
                "analysisGroup",
                v as ErrorAnalysisFilters["analysisGroup"]
              )
            }
          />

          <SelectFilter
            label="Socket"
            value={filters.socket}
            options={[
              { value: "ALL", label: "All Sockets" },
              ...availableSockets.map((s) => ({ value: s, label: s })),
            ]}
            onChange={(v) => onFilterChange("socket", v)}
          />

          {availableStations.length > 0 && (
            <SelectFilter
              label="Station"
              value={filters.station === "ALL" ? "ALL" : String(filters.station)}
              options={[
                { value: "ALL", label: "All Stations" },
                ...availableStations.map((s) => ({
                  value: String(s),
                  label: `Station ${s}`,
                })),
              ]}
              onChange={(v) =>
                onFilterChange(
                  "station",
                  v === "ALL" ? "ALL" : Number(v)
                )
              }
            />
          )}

          <SelectFilter
            label="Stage"
            value={filters.stage}
            options={[
              { value: "ALL", label: "All Stages" },
              ...availableStages.map((s) => ({ value: s, label: `Stage ${s}` })),
            ]}
            onChange={(v) => onFilterChange("stage", v)}
          />

          <SelectFilter
            label="Fail Item"
            value={filters.failItem}
            options={[
              { value: "ALL", label: "All Items" },
              ...availableFailItems.slice(0, 50).map((f) => ({
                value: f,
                label: f.length > 32 ? `${f.slice(0, 30)}…` : f,
              })),
            ]}
            onChange={(v) => onFilterChange("failItem", v)}
          />

          <SelectFilter
            label="PASS / FAIL"
            value={filters.passFail}
            options={[
              { value: "ALL", label: "ALL" },
              { value: "PASS", label: "PASS" },
              { value: "FAIL", label: "FAIL" },
            ]}
            onChange={(v) =>
              onFilterChange("passFail", v as "ALL" | ErrorPassFail)
            }
          />

          <SelectFilter
            label="Abnormal"
            value={filters.abnormalStatus}
            options={[
              { value: "ALL", label: "ALL" },
              { value: "Normal", label: "Normal" },
              { value: "Abnormal", label: "Abnormal" },
            ]}
            onChange={(v) =>
              onFilterChange(
                "abnormalStatus",
                v as ErrorAnalysisFilters["abnormalStatus"]
              )
            }
          />

          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            Reset
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3 pt-1 border-t">
          <div className="space-y-1 min-w-[180px]">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Time Range Start
            </Label>
            <input
              type="text"
              placeholder="2026-03-08 10:00:00"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-mono"
              value={filters.timeRangeStart}
              onChange={(e) => onFilterChange("timeRangeStart", e.target.value)}
            />
          </div>
          <div className="space-y-1 min-w-[180px]">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Time Range End
            </Label>
            <input
              type="text"
              placeholder="2026-03-08 12:00:00"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-mono"
              value={filters.timeRangeEnd}
              onChange={(e) => onFilterChange("timeRangeEnd", e.target.value)}
            />
          </div>
        </div>

        {drillDownSocket && (
          <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
            <span className="text-blue-900">
              Drill Down:{" "}
              <span className="font-mono font-bold">{drillDownSocket}</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 ml-auto"
              onClick={onClearDrillDown}
            >
              <X className="h-4 w-4" />
              닫기
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
