"use client";

import type { GrrModuleItem } from "@/lib/liw-grr-modules";
import { GRR_MODULE_COUNT } from "@/lib/liw-grr-config";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GrrModulePickerProps {
  modules: GrrModuleItem[];
  selectedBarcode: string;
  onSelectModule: (barcode: string) => void;
  barcodeOverflow?: number;
}

function verdictBadgeVariant(
  resultLabel: string | null
): "success" | "danger" | "secondary" | "warning" {
  if (resultLabel === "PASS") return "success";
  if (resultLabel === "SPEC MISSING") return "warning";
  if (!resultLabel || resultLabel === "N/A") return "secondary";
  return "danger";
}

export function GrrModulePicker({
  modules,
  selectedBarcode,
  onSelectModule,
  barcodeOverflow = 0,
}: GrrModulePickerProps) {
  const activeCount = modules.filter((m) => m.barcode).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">모듈 선택 (Barcode)</CardTitle>
        <p className="text-xs text-muted-foreground">
          GRR {GRR_MODULE_COUNT}개 모듈 · CSV에서 {activeCount}개 Barcode 매칭
          {barcodeOverflow > 0 && (
            <span className="text-amber-700">
              {" "}
              · 초과 {barcodeOverflow}개는 M{String(GRR_MODULE_COUNT).padStart(2, "0")} 이후
              제외
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {modules.map((mod) => {
            const selected = mod.barcode !== null && mod.barcode === selectedBarcode;
            const disabled = !mod.barcode;

            return (
              <button
                key={mod.slotLabel}
                type="button"
                disabled={disabled}
                onClick={() => mod.barcode && onSelectModule(mod.barcode)}
                title={mod.barcode ?? `${mod.slotLabel} — 데이터 없음`}
                className={cn(
                  "rounded-lg border px-3 py-3 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  disabled &&
                    "border-dashed border-slate-200 bg-slate-50/50 text-muted-foreground cursor-not-allowed",
                  !disabled && !selected && "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300",
                  selected && "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-xs font-bold tracking-wide",
                      selected ? "text-blue-700" : "text-slate-600"
                    )}
                  >
                    {mod.slotLabel}
                  </span>
                  {mod.resultLabel && (
                    <Badge variant={verdictBadgeVariant(mod.resultLabel)} className="text-[10px] px-1.5 py-0">
                      {mod.resultLabel}
                    </Badge>
                  )}
                </div>
                {mod.barcode ? (
                  <>
                    <div
                      className={cn(
                        "mt-1.5 font-mono text-sm font-semibold truncate",
                        selected ? "text-blue-900" : "text-slate-900"
                      )}
                    >
                      {mod.barcodeLabel}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground truncate" title={mod.barcode}>
                      {mod.barcode}
                    </div>
                    {mod.runCount > 1 && (
                      <div className="mt-1 text-[10px] text-amber-700">
                        Run {mod.runCount}건 · 최신 사용
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-2 text-xs text-muted-foreground">—</div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
