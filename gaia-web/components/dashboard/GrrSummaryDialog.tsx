"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  GrrSummaryReport,
  GrrTesterSummary,
} from "@/lib/grr-tester-summary";

interface GrrSummaryDialogProps {
  report: GrrSummaryReport | null;
  open: boolean;
  onClose: () => void;
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function resultLabel(result: string): string {
  return result;
}

function resultClass(result: string): string {
  if (result === "fail") return "text-red-600 font-semibold";
  if (result === "pass") return "text-emerald-600 font-semibold";
  return "text-amber-600";
}

function TesterSummarySection({ summary }: { summary: GrrTesterSummary }) {
  const targetSuffix = summary.isTargetTester ? " (target tester)" : "";

  return (
    <section
      className={cn(
        "rounded border px-3 py-3",
        summary.isTargetTester
          ? "border-slate-400 bg-slate-50/80 ring-1 ring-slate-300"
          : "border-slate-200 bg-white"
      )}
    >
      <div className="space-y-0.5 mb-3">
        <div>
          TesterID:{" "}
          <span className="font-semibold">{summary.testerId}</span>
          {targetSuffix}
        </div>
        <div>
          GRR Result:{" "}
          <span className={resultClass(summary.grrResult)}>
            {resultLabel(summary.grrResult)}
          </span>
        </div>
        <div>GRR PCT_ERR_MIN: {fmtPct(summary.pctErrMin)}</div>
        <div>GRR PCT_ERR_MAX: {fmtPct(summary.pctErrMax)}</div>
      </div>

      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="py-1.5 pr-3 font-semibold">FOM</th>
            <th className="py-1.5 pr-3 font-semibold w-24">grr_result</th>
            <th className="py-1.5 pr-3 font-semibold text-right w-28">
              pct_err_min
            </th>
            <th className="py-1.5 font-semibold text-right w-28">
              pct_err_max
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.rows.map((row) => (
            <tr
              key={row.fom}
              className="border-b border-slate-100 last:border-0"
            >
              <td className="py-1 pr-3 align-top break-all" title={row.fom}>
                {row.fom}
              </td>
              <td
                className={cn(
                  "py-1 pr-3 align-top",
                  row.grrResult === "fail"
                    ? "text-red-600"
                    : row.grrResult === "pass"
                      ? "text-emerald-600"
                      : "text-amber-600"
                )}
              >
                {resultLabel(row.grrResult)}
              </td>
              <td className="py-1 pr-3 text-right align-top tabular-nums">
                {fmtPct(row.pctErrMin)}
              </td>
              <td className="py-1 text-right align-top tabular-nums">
                {fmtPct(row.pctErrMax)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function GrrSummaryDialog({
  report,
  open,
  onClose,
}: GrrSummaryDialogProps) {
  const activeRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !report?.activeTester) return;
    activeRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [open, report?.activeTester, report?.testers.length]);

  if (!open || !report || report.testers.length === 0) return null;

  const itemCount = report.testers[0]?.rows.length ?? 0;
  const scopeLabel =
    report.scope === "reference_all"
      ? `Reference 전체 · ${report.testers.length} sockets · ${itemCount} items`
      : report.scope === "group"
        ? `${report.testers.length} sockets · 현재 그룹`
        : `${report.testers.length} sockets`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30" aria-hidden />
      <div
        role="dialog"
        aria-labelledby="grr-summary-title"
        className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col rounded border border-slate-300 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-4 py-2 bg-slate-50 shrink-0">
          <h2
            id="grr-summary-title"
            className="text-sm font-semibold text-slate-800"
          >
            GRR Summary
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {scopeLabel}
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-slate-900 space-y-4">
          {report.testers.map((summary) => (
            <div
              key={summary.testerId}
              ref={
                summary.isTargetTester
                  ? (el) => {
                      activeRef.current = el;
                    }
                  : undefined
              }
            >
              <TesterSummarySection summary={summary} />
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 px-4 py-3 flex justify-center bg-slate-50 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
