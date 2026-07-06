"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  failMapHeatColor,
  SOCKET_NUMS,
  STAGES,
} from "@/lib/error-analysis";
import type { ContFailCell } from "@/lib/error-analysis-types";

interface ErrorContFailMapHeatmapProps {
  cells: ContFailCell[];
  selectedSocket: string | null;
  onSelectSocket: (socket: string) => void;
}

export function ErrorContFailMapHeatmap({
  cells,
  selectedSocket,
  onSelectSocket,
}: ErrorContFailMapHeatmapProps) {
  const [hovered, setHovered] = useState<ContFailCell | null>(null);

  const cellMap = new Map(cells.map((c) => [c.socket, c]));
  const maxFail = Math.max(...cells.map((c) => c.failCount), 1);
  const activeCell =
    (selectedSocket ? cellMap.get(selectedSocket) : null) ?? hovered;

  return (
    <Card className="border-slate-800 bg-slate-950 text-slate-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg tracking-wide uppercase text-slate-100">
          CONT Fail Map
        </CardTitle>
        <p className="text-xs text-slate-400">
          Stage × Socket · CONT 포함 Fail Item · 셀 클릭 시 Pin Drill Down
        </p>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <div className="grid grid-cols-[28px_repeat(8,1fr)] gap-1 mb-1">
            <div />
            {SOCKET_NUMS.map((n) => (
              <div
                key={n}
                className="text-center text-[10px] font-semibold text-slate-400"
              >
                S{n}
              </div>
            ))}
          </div>
          {STAGES.map((stage) => (
            <div
              key={stage}
              className="grid grid-cols-[28px_repeat(8,1fr)] gap-1 mb-1"
            >
              <div className="flex items-center justify-center text-xs font-bold text-slate-400">
                {stage}
              </div>
              {SOCKET_NUMS.map((num) => {
                const socket = `${stage}${String(num).padStart(2, "0")}`;
                const cell = cellMap.get(socket);
                const count = cell?.failCount ?? 0;
                const colors = failMapHeatColor(count);
                const selected = selectedSocket === socket;

                return (
                  <button
                    key={socket}
                    type="button"
                    className={cn(
                      "h-7 rounded-md flex items-center justify-center font-mono text-[10px] font-bold transition-all",
                      "hover:ring-2 hover:ring-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400",
                      selected && "ring-2 ring-amber-400 scale-[1.02]"
                    )}
                    style={{
                      backgroundColor: colors.bg,
                      color: colors.text,
                    }}
                    onMouseEnter={() => cell && setHovered(cell)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => onSelectSocket(socket)}
                  >
                    {count > 0 ? count : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {activeCell && activeCell.failCount > 0 && (
          <div className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm">
            <div className="font-semibold text-slate-100">
              Socket : {activeCell.socket}
              {selectedSocket && (
                <span className="ml-2 text-[10px] font-normal text-amber-400/90">
                  Pin Drill Down
                </span>
              )}
            </div>
            <div className="text-slate-300 mt-0.5">
              CONT Fail Count :{" "}
              <span className="font-mono font-bold text-amber-400">
                {activeCell.failCount}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">
                Fail Pin (CONT2_pin)
              </div>
              <ul className="max-h-36 overflow-y-auto space-y-1">
                {activeCell.pins.map((p) => (
                  <li
                    key={p.pinLabel}
                    className="flex items-center justify-between gap-2 rounded border border-slate-700/80 bg-slate-950/50 px-2 py-1 text-xs font-mono"
                  >
                    <span className="text-slate-200">
                      <span className="text-amber-400/90">{p.contactLabel}</span>
                      <span className="text-slate-500">_</span>
                      <span>{p.pin}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-400">
                      {p.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-3 w-full flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          <span>Legend:</span>
          {[0, 2, 6, 12].map((n) => {
            const c = failMapHeatColor(n);
            return (
              <span key={n} className="inline-flex items-center gap-1">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: c.bg }}
                />
                {n === 0 ? "0" : n <= 3 ? "1–3" : n <= 9 ? "4–9" : "10+"}
              </span>
            );
          })}
          <span className="text-slate-600 ml-auto">Max CONT Fail: {maxFail}</span>
        </div>
      </CardContent>
    </Card>
  );
}
