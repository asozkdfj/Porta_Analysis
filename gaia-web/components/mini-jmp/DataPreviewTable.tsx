"use client";

import { cn } from "@/lib/utils";

export interface PreviewRow {
  row: Record<string, string>;
  sourceIndex: number;
}

interface DataPreviewTableProps {
  headers: string[];
  rows: PreviewRow[];
  search: string;
  onSearchChange: (v: string) => void;
  xColumn: string | null;
  yColumn: string | null;
  totalRows: number;
  selectedRowIndex: number | null;
  onRowSelect: (sourceIndex: number | null) => void;
}

export function DataPreviewTable({
  headers,
  rows,
  search,
  onSearchChange,
  xColumn,
  yColumn,
  totalRows,
  selectedRowIndex,
  onRowSelect,
}: DataPreviewTableProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Data Preview
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">
            {rows.length} / {totalRows.toLocaleString()} rows
            {selectedRowIndex != null && (
              <span className="text-amber-400 ml-1">
                · selected #{selectedRowIndex + 1}
              </span>
            )}
          </span>
          <input
            type="search"
            placeholder="Search preview..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] text-slate-100 w-40"
          />
        </div>
      </div>
      <div className="overflow-auto max-h-[220px]">
        <table className="w-full text-[10px] border-collapse">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr>
              <th className="text-left py-1.5 px-2 font-medium border-b border-slate-700 text-slate-500 w-10">
                #
              </th>
              {headers.map((h) => (
                <th
                  key={h}
                  className={cn(
                    "text-left py-1.5 px-2 font-medium border-b border-slate-700 whitespace-nowrap",
                    h === xColumn || h === yColumn
                      ? "text-blue-300 bg-blue-950/40"
                      : "text-slate-400"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length + 1}
                  className="py-8 text-center text-slate-500"
                >
                  No rows
                </td>
              </tr>
            ) : (
              rows.map(({ row, sourceIndex }) => (
                <tr
                  key={sourceIndex}
                  onClick={() =>
                    onRowSelect(
                      selectedRowIndex === sourceIndex ? null : sourceIndex
                    )
                  }
                  className={cn(
                    "border-b border-slate-800 cursor-pointer",
                    selectedRowIndex === sourceIndex
                      ? "bg-amber-950/50 ring-1 ring-inset ring-amber-600/60"
                      : "hover:bg-slate-800/50"
                  )}
                >
                  <td className="py-1 px-2 text-slate-500 tabular-nums">
                    {sourceIndex + 1}
                  </td>
                  {headers.map((h) => (
                    <td
                      key={h}
                      className={cn(
                        "py-1 px-2 font-mono whitespace-nowrap max-w-[200px] truncate",
                        h === xColumn || h === yColumn
                          ? "text-blue-200"
                          : "text-slate-300"
                      )}
                      title={row[h]}
                    >
                      {row[h] ?? ""}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
