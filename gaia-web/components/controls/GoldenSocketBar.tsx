"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GOLDEN_DELTA_LIMIT_OPTIONS,
  type GoldenDeltaLimit,
} from "@/lib/golden-socket-config";
import { useGoldenSocket } from "@/contexts/GoldenSocketContext";

export function GoldenSocketBar() {
  const {
    goldenSocket,
    setGoldenSocket,
    goldenDeltaLimit,
    setGoldenDeltaLimit,
    socketOptions,
  } = useGoldenSocket();

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
        <div className="min-w-[200px]">
          <Label className="mb-2 block text-sm font-medium">Golden Socket</Label>
          <Select
            value={goldenSocket ?? "__none__"}
            onValueChange={(v) => setGoldenSocket(v === "__none__" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="No Golden Socket Selected" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="__none__">No Golden Socket Selected</SelectItem>
              {socketOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[160px]">
          <Label className="mb-2 block text-sm font-medium">Golden Delta Limit</Label>
          <Select
            value={String(goldenDeltaLimit)}
            onValueChange={(v) => setGoldenDeltaLimit(Number(v) as GoldenDeltaLimit)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOLDEN_DELTA_LIMIT_OPTIONS.map((limit) => (
                <SelectItem key={limit} value={String(limit)}>
                  ±{limit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground sm:max-w-md sm:text-right">
        {goldenSocket
          ? `Golden Reference = Average(${goldenSocket}) · Delta = Measured − Golden Reference`
          : "Golden Socket을 선택하면 Spec 판정에 더해 Golden 기준 비교가 적용됩니다."}
      </p>
    </div>
  );
}
