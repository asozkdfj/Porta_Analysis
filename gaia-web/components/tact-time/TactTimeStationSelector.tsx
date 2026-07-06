"use client";

import { cn } from "@/lib/utils";
import {
  TACT_TIME_STATION_COUNT,
  tactTimeStationLabel,
  type TactTimeStationId,
} from "@/lib/tact-time-types";

interface TactTimeStationSelectorProps {
  activeStation: TactTimeStationId;
  onSelectStation: (stationId: TactTimeStationId) => void;
  groupCounts?: Record<string, number>;
}

export function TactTimeStationSelector({
  activeStation,
  onSelectStation,
  groupCounts,
}: TactTimeStationSelectorProps) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Station</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Station별 Tact Time 그룹 설정이 독립적으로 저장됩니다 (localStorage)
          </p>
        </div>
        <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1">
          {tactTimeStationLabel(activeStation)} 선택됨
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {Array.from({ length: TACT_TIME_STATION_COUNT }, (_, i) => {
          const stationId = (i + 1) as TactTimeStationId;
          const active = stationId === activeStation;
          const groupCount = groupCounts?.[String(stationId)] ?? 0;
          return (
            <button
              key={stationId}
              type="button"
              onClick={() => onSelectStation(stationId)}
              className={cn(
                "rounded-md border px-3 py-2.5 text-left transition-colors",
                active
                  ? "border-blue-500 bg-blue-50 text-blue-950 ring-1 ring-blue-200"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
              )}
            >
              <div className="text-sm font-semibold">
                {tactTimeStationLabel(stationId)}
              </div>
              <div
                className={cn(
                  "text-[10px] mt-0.5",
                  active ? "text-blue-700/80" : "text-muted-foreground"
                )}
              >
                {groupCount > 0 ? `${groupCount} groups` : "설정 없음"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
