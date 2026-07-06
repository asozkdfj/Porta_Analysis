import { AlertTriangle } from "lucide-react";
import { formatSpecValue } from "@/lib/grr-chart-data";
import type { GroupGrrStats, MetricSpecLimits } from "@/lib/types";

interface SpecInfoPanelProps {
  spec: MetricSpecLimits;
  metric: string;
  groupGrr?: GroupGrrStats | null;
}

export function SpecInfoPanel({ spec, metric, groupGrr }: SpecInfoPanelProps) {
  if (!spec.found) {
    const hasGrrMeta = spec.grrLimit !== null || spec.grrStdev !== null;
    const isAmbiguous = spec.matchStatus === "ambiguous";
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <div className="flex items-center gap-1.5 font-medium">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {isAmbiguous ? "AMBIGUOUS SPEC MATCH" : "SPEC MISSING — GrrConfig 조회 실패"}
        </div>
        {isAmbiguous && spec.ambiguousCandidates && spec.ambiguousCandidates.length > 0 && (
          <p className="mt-1 text-[10px] opacity-90 truncate" title={spec.ambiguousCandidates.join(", ")}>
            후보: {spec.ambiguousCandidates.join(", ")}
          </p>
        )}
        {hasGrrMeta && (
          <div className="mt-1 grid grid-cols-2 gap-x-2 text-amber-700/90">
            {spec.grrStdev !== null && <span>GRR Stdev: {spec.grrStdev}</span>}
            {spec.grrLimit !== null && (
              <span>
                GRR Limit: {spec.grrLimit}
                {spec.grrLimit < 0.15
                  ? ` (${(spec.grrLimit * 100).toFixed(1)}%)`
                  : ` (${spec.grrLimit}%)`}
              </span>
            )}
          </div>
        )}
        {groupGrr && groupGrr.testLimitBand > 0 && (
          <div className="mt-1 text-[10px] opacity-90">
            GRR Spec: Lower ERS ±{groupGrr.testLimitBand.toFixed(4)}
          </div>
        )}
        {spec.matchedItem && (
          <span className="block truncate text-[10px] mt-0.5 opacity-80" title={spec.matchedItem}>
            ← {spec.matchedItem}
            {spec.source === "csv" && " · Log CSV ERS"}
          </span>
        )}
        <p className="mt-1 text-amber-700/90 truncate" title={metric}>
          {metric}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-red-200 bg-red-50/60 px-3 py-2 text-xs space-y-1">
      <div className="font-semibold text-red-800">Spec Limits</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-red-900/90">
        <span>
          Lower ERS: <strong>{formatSpecValue(spec.lsl)}</strong>
          {spec.unit ? ` ${spec.unit}` : ""}
        </span>
        <span>
          Upper ERS: <strong>{formatSpecValue(spec.usl)}</strong>
          {spec.unit ? ` ${spec.unit}` : ""}
        </span>
      </div>
      <div className="text-red-700/80 pt-0.5 border-t border-red-200/60">
        Spec Range:{" "}
        {spec.lsl !== null && spec.usl !== null
          ? `${formatSpecValue(spec.lsl)} ~ ${formatSpecValue(spec.usl)}`
          : spec.lsl !== null
            ? `≥ ${formatSpecValue(spec.lsl)} (하한만)`
            : spec.usl !== null
              ? `≤ ${formatSpecValue(spec.usl)} (상한만)`
              : "—"}
        <div className="mt-1 grid grid-cols-2 gap-x-2">
          {spec.grrStdev !== null && <span>GRR Stdev: {spec.grrStdev}</span>}
          {spec.grrLimit !== null && (
            <span>
              GRR Limit: {spec.grrLimit}
              {spec.grrLimit < 0.15
                ? ` (${(spec.grrLimit * 100).toFixed(1)}%)`
                : ` (${spec.grrLimit}%)`}
            </span>
          )}
        </div>
        {groupGrr && groupGrr.testLimitBand > 0 && (
          <div className="mt-1 text-[10px] opacity-90">
            GRR Spec line: Lower ERS ±{groupGrr.testLimitBand.toFixed(4)}
            {spec.grrLimit !== null && (
              <span> (= GRR Limit {spec.grrLimit})</span>
            )}
          </div>
        )}
        {spec.matchedItem && (
          <span className="block truncate text-[10px] mt-0.5 opacity-80" title={spec.matchedItem}>
            ← {spec.matchedItem}
            {spec.source === "csv" && " · Log CSV ERS"}
          </span>
        )}
      </div>
    </div>
  );
}
