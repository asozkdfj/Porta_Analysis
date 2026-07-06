"use client";



import { useMemo, useState } from "react";

import type { GrrDashboardSpecResultEntry, GrrDashboardSpecSummary } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { cn } from "@/lib/utils";



interface GrrDashboardSpecSummaryCardProps {

  summary: GrrDashboardSpecSummary;

  configFileName?: string | null;

}



type GrrDetailFilter = "grrPass" | "grrFail" | null;



export function GrrDashboardSpecSummaryCard({

  summary,

  configFileName,

}: GrrDashboardSpecSummaryCardProps) {

  const [detailFilter, setDetailFilter] = useState<GrrDetailFilter>(null);



  const toggleFilter = (next: GrrDetailFilter) => {

    setDetailFilter((current) => (current === next ? null : next));

  };



  const detailItems =

    detailFilter === "grrPass"

      ? summary.grrPassItems

      : detailFilter === "grrFail"

        ? summary.grrFailItems

        : [];



  return (

    <Card>

      <CardHeader className="pb-3">

        <CardTitle className="text-lg">GrrConfig Spec Mapping Summary</CardTitle>

        <p className="text-xs text-muted-foreground">

          Reference GrrConfig · Metric / GRR Stdev / GRR Limit / Upper ERS / Lower ERS

          {configFileName && ` · ${configFileName}`}

        </p>

        <p className="text-xs text-muted-foreground">

          GRR PASS/FAIL — 소켓 기준 · 해당 소켓 Reference 시 모든 Metric·모듈 PASS

        </p>

      </CardHeader>

      <CardContent className="space-y-4">

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">

          <Stat label="Total Metrics" value={summary.totalMetrics} />

          <Stat label="Spec Matched" value={summary.specMatched} variant="pass" />

          <Stat label="Spec Missing" value={summary.specMissing} variant="warn" />

          <Stat label="Ambiguous Match" value={summary.ambiguousMatch} variant="warn" />

          <Stat label="Measurement PASS" value={summary.measurementPass} variant="pass" />

          <Stat label="Measurement FAIL" value={summary.measurementFail} variant="fail" />

          <Stat

            label="GRR PASS"

            value={summary.grrPass}

            variant="pass"

            active={detailFilter === "grrPass"}

            onClick={() => toggleFilter("grrPass")}

          />

          <Stat

            label="GRR FAIL"

            value={summary.grrFail}

            variant="fail"

            active={detailFilter === "grrFail"}

            onClick={() => toggleFilter("grrFail")}

          />

        </div>



        {detailFilter && (

          <GrrResultDetailList

            filter={detailFilter}

            items={detailItems}

            onClose={() => setDetailFilter(null)}

          />

        )}

      </CardContent>

    </Card>

  );

}



function GrrResultDetailList({

  filter,

  items,

  onClose,

}: {

  filter: "grrPass" | "grrFail";

  items: GrrDashboardSpecResultEntry[];

  onClose: () => void;

}) {

  const title =

    filter === "grrPass" ? "GRR PASS 소켓" : "GRR FAIL 소켓 · 실패 상세";

  const border =

    filter === "grrPass" ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30";



  const failBySocket = useMemo(() => {

    if (filter !== "grrFail") return [];

    const map = new Map<string, GrrDashboardSpecResultEntry[]>();

    for (const item of items) {

      const list = map.get(item.socket) ?? [];

      list.push(item);

      map.set(item.socket, list);

    }

    return [...map.entries()].sort(([a], [b]) =>

      a.localeCompare(b, undefined, { numeric: true })

    );

  }, [filter, items]);



  const passCount = filter === "grrPass" ? items.length : failBySocket.length;



  return (

    <div className={cn("rounded-lg border p-3", border)}>

      <div className="flex items-center justify-between gap-2 mb-2">

        <p className="text-sm font-semibold">

          {title}{" "}

          <span className="text-muted-foreground font-normal">({passCount})</span>

        </p>

        <button

          type="button"

          onClick={onClose}

          className="text-xs text-muted-foreground hover:text-foreground"

        >

          닫기

        </button>

      </div>

      {items.length === 0 ? (

        <p className="text-sm text-muted-foreground py-2">해당 항목이 없습니다.</p>

      ) : filter === "grrPass" ? (

        <div className="max-h-56 overflow-y-auto">

          <table className="w-full text-xs">

            <thead>

              <tr className="text-left text-muted-foreground border-b">

                <th className="py-1.5 font-medium">Socket</th>

              </tr>

            </thead>

            <tbody>

              {items.map((item) => (

                <tr key={item.socket} className="border-b last:border-0">

                  <td className="py-1.5 font-mono">{item.socket}</td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      ) : (

        <div className="max-h-64 overflow-y-auto space-y-3">

          {failBySocket.map(([socket, failures]) => (

            <div key={socket} className="rounded-md border bg-white/60 px-3 py-2">

              <p className="font-mono text-sm font-semibold text-red-800 mb-1.5">

                {socket}

              </p>

              <table className="w-full text-xs">

                <thead>

                  <tr className="text-left text-muted-foreground border-b">

                    <th className="py-1 pr-3 font-medium">모듈 (Serial)</th>

                    <th className="py-1 font-medium">Metric</th>

                  </tr>

                </thead>

                <tbody>

                  {failures.map((item, i) => (

                    <tr

                      key={`${item.serial}-${item.metric}-${i}`}

                      className="border-b last:border-0"

                    >

                      <td className="py-1 pr-3 font-mono whitespace-nowrap">

                        {item.serial ?? "—"}

                      </td>

                      <td

                        className="py-1 font-mono truncate max-w-[360px]"

                        title={item.metric}

                      >

                        {item.metricLabel ?? item.metric ?? "—"}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          ))}

        </div>

      )}

    </div>

  );

}



function Stat({

  label,

  value,

  variant = "default",

  active,

  onClick,

}: {

  label: string;

  value: number;

  variant?: "default" | "pass" | "fail" | "warn";

  active?: boolean;

  onClick?: () => void;

}) {

  const border =

    variant === "pass"

      ? "border-emerald-200 bg-emerald-50/40"

      : variant === "fail"

        ? "border-red-200 bg-red-50/40"

        : variant === "warn"

          ? "border-amber-200 bg-amber-50/40"

          : "border-slate-200";



  const className = cn(

    "rounded-lg border px-3 py-3 text-left w-full transition-colors",

    border,

    onClick && "cursor-pointer hover:bg-slate-50/80",

    !onClick && "cursor-default",

    active && "ring-2 ring-slate-900 ring-offset-1"

  );



  if (onClick) {

    return (

      <button type="button" onClick={onClick} className={className}>

        <div className="text-xs text-muted-foreground">{label}</div>

        <div className="text-2xl font-bold mt-0.5">{value}</div>

      </button>

    );

  }



  return (

    <div className={className}>

      <div className="text-xs text-muted-foreground">{label}</div>

      <div className="text-2xl font-bold mt-0.5">{value}</div>

    </div>

  );

}


