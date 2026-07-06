"use client";

import type { GaiaStat2GrrSummary } from "@/lib/types";

interface GrrStat2SummaryPanelProps {
  summary: GaiaStat2GrrSummary;
}

function fmt(n: number | null, digits = 6): string {
  if (n === null) return "NA";
  return n.toFixed(digits);
}

function fmtPct(n: number | null, digits = 6): string {
  if (n === null) return "NA";
  return `${n.toFixed(digits)}%`;
}

function resultColor(result: string): string {
  if (result === "pass") return "text-emerald-400";
  if (result === "fail") return "text-red-400";
  if (result === "grr_limit_missing") return "text-amber-400";
  return "text-amber-300";
}

export function GrrStat2SummaryPanel({ summary }: GrrStat2SummaryPanelProps) {
  const {
    targetTester,
    metricLabel,
    sampleCount,
    grrGroupAvg,
    grrPctErrMax,
    grrPctErrMin,
    grrResult,
    grrLimit,
    grrStdev,
    criteriaTable,
    testResultTable,
    groupAvgGolden,
    groupAvg,
    pctErrDebug,
    referenceVerification,
  } = summary;

  const ver = referenceVerification;

  return (
    <div className="rounded-md border bg-slate-900 text-slate-100 p-4 text-[11px] font-mono leading-relaxed overflow-x-auto">
      <div className="mb-3 space-y-0.5">
        <div className="text-slate-300">
          TesterID: <span className="text-white font-semibold">{targetTester}</span>{" "}
          (Target tester)
        </div>
        <div>
          [{metricLabel}, {sampleCount} samples]
        </div>
        <div>grr_limit (Config) = {fmt(grrLimit)}</div>
        <div>grr_stdev (Config) = {fmt(grrStdev)}</div>
        <div>GRR_GROUP_AVG = {fmt(grrGroupAvg)}</div>
        <div>GRR_PCT_ERR_MAX = {fmtPct(grrPctErrMax)}</div>
        <div>GRR_PCT_ERR_MIN = {fmtPct(grrPctErrMin)}</div>
        <div className={resultColor(grrResult)}>
          GRR_RESULT = {grrResult}
        </div>
      </div>

      <div className="mb-4 rounded border border-slate-700 bg-slate-950/60 p-3">
        <div className="text-slate-400 mb-2">[GRR_PCT_ERR_DEBUG — 공식 검증]</div>
        <div className="text-slate-500 text-[9px] mb-2 space-y-1">
          <div>
            <span className="text-red-400/80">이전:</span> {ver.previousFormula}
          </div>
          <div>
            <span className="text-emerald-400/80">현재:</span> {ver.currentFormula}
          </div>
        </div>
        <div
          className={`mb-2 font-semibold ${ver.match ? "text-emerald-400" : "text-red-400"}`}
        >
          Reference 예시 검증: {ver.match ? "PASS ✓" : "FAIL ✗"}
        </div>
        <table className="w-full border-collapse text-[9px] mb-2">
          <thead>
            <tr className="border-b border-slate-700 text-slate-500">
              <th className="text-left py-1 pr-2" />
              <th className="text-right py-1 pr-2">bound_up</th>
              <th className="text-right py-1 pr-2">bound_dn</th>
              <th className="text-right py-1 pr-2">pct_err_upper</th>
              <th className="text-right py-1">pct_err_lower</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800 text-slate-400">
              <td className="py-1 pr-2">기대값</td>
              <td className="text-right py-1 pr-2">{ver.expected.boundUp.toFixed(6)}</td>
              <td className="text-right py-1 pr-2">{ver.expected.boundDn.toFixed(6)}</td>
              <td className="text-right py-1 pr-2">{ver.expected.pctErrUpper.toFixed(6)}%</td>
              <td className="text-right py-1">{ver.expected.pctErrLower.toFixed(6)}%</td>
            </tr>
            <tr className="text-slate-200">
              <td className="py-1 pr-2">계산값</td>
              <td className="text-right py-1 pr-2">{ver.actual.boundUp.toFixed(6)}</td>
              <td className="text-right py-1 pr-2">{ver.actual.boundDn.toFixed(6)}</td>
              <td className="text-right py-1 pr-2">{ver.actual.pctErrUpper.toFixed(6)}%</td>
              <td className="text-right py-1">{ver.actual.pctErrLower.toFixed(6)}%</td>
            </tr>
          </tbody>
        </table>
        {pctErrDebug[0] && (
          <div className="text-[9px] text-slate-500 space-y-0.5 border-t border-slate-800 pt-2">
            <div>첫 Serial ({pctErrDebug[0].serial}) 계산식:</div>
            <div>bound_up: {pctErrDebug[0].boundUpFormula}</div>
            <div>bound_dn: {pctErrDebug[0].boundDnFormula}</div>
            <div>pct_err_upper: {pctErrDebug[0].pctErrUpperFormula}</div>
            <div>pct_err_lower: {pctErrDebug[0].pctErrLowerFormula}</div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="text-slate-400 mb-1">[GRR_CRITERIA_TABLE]</div>
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="text-left py-1 pr-2">serial</th>
              <th className="text-right py-1 pr-2">avg_golden</th>
              <th className="text-right py-1 pr-2">grr_limit</th>
              <th className="text-right py-1 pr-2">grr_limit_up</th>
              <th className="text-right py-1">grr_limit_dn</th>
            </tr>
          </thead>
          <tbody>
            {criteriaTable.map((row) => (
              <tr key={row.serial} className="border-b border-slate-800">
                <td className="py-0.5 pr-2 truncate max-w-[120px]" title={row.serial}>
                  {row.serial}
                </td>
                <td className="text-right py-0.5 pr-2">{fmt(row.avgGolden)}</td>
                <td className="text-right py-0.5 pr-2">{fmt(row.grrLimit)}</td>
                <td className="text-right py-0.5 pr-2">{fmt(row.grrLimitUp)}</td>
                <td className="text-right py-0.5">{fmt(row.grrLimitDn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-4">
        <div className="text-slate-400 mb-1">[GRR_TEST_RESULT_TABLE]</div>
        <table className="w-full border-collapse text-[10px] min-w-[1000px]">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="text-left py-1 pr-2">serial</th>
              <th className="text-right py-1 pr-2">avg_golden</th>
              <th className="text-right py-1 pr-2">avg</th>
              <th className="text-right py-1 pr-2">stdev</th>
              <th className="text-right py-1 pr-2">grr_stdev</th>
              <th className="text-right py-1 pr-2">grr_limit</th>
              <th className="text-right py-1 pr-2">bound_up</th>
              <th className="text-right py-1 pr-2">bound_dn</th>
              <th className="text-right py-1 pr-2">pct_err_upper</th>
              <th className="text-right py-1 pr-2">pct_err_lower</th>
              <th className="text-right py-1">result</th>
            </tr>
          </thead>
          <tbody>
            {testResultTable.map((row) => (
              <tr key={row.serial} className="border-b border-slate-800">
                <td className="py-0.5 pr-2 truncate max-w-[120px]" title={row.serial}>
                  {row.serial}
                </td>
                <td className="text-right py-0.5 pr-2">{fmt(row.avgGolden)}</td>
                <td className="text-right py-0.5 pr-2">{fmt(row.avg)}</td>
                <td className="text-right py-0.5 pr-2">{fmt(row.stdev)}</td>
                <td className="text-right py-0.5 pr-2">{fmt(row.grrStdev)}</td>
                <td className="text-right py-0.5 pr-2">{fmt(row.grrLimit)}</td>
                <td className="text-right py-0.5 pr-2">{fmt(row.boundUp)}</td>
                <td className="text-right py-0.5 pr-2">{fmt(row.boundDn)}</td>
                <td className="text-right py-0.5 pr-2">{fmtPct(row.pctErrUpper)}</td>
                <td className="text-right py-0.5 pr-2">{fmtPct(row.pctErrLower)}</td>
                <td className={`text-right py-0.5 ${resultColor(row.result)}`}>
                  {row.result}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-2">
        <div className="text-slate-400 mb-1">[GRR_PCT_ERR_MAX/MIN]</div>
        <div>pct_err_max = {fmtPct(grrPctErrMax)}</div>
        <div>pct_err_min = {fmtPct(grrPctErrMin)}</div>
        <div className={resultColor(grrResult)}>grr {grrResult}</div>
        <p className="text-slate-500 text-[9px] mt-1">
          PASS: pct_err_max ≤ 100% AND pct_err_min ≥ -100%
        </p>
      </div>

      <div>
        <div className="text-slate-400 mb-1">[GRR_GROUP_AVG]</div>
        <div>group_avg_golden = {fmt(groupAvgGolden)}</div>
        <div>group_avg = {fmt(groupAvg)}</div>
      </div>
    </div>
  );
}
