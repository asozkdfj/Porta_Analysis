import { captureElementAsPng, sanitizeGrrChartFileToken } from "./grr-chart-export";

export function buildMiniJmpChartFileName(csvFileName: string): string {
  const base = sanitizeGrrChartFileToken(
    csvFileName.replace(/\.csv$/i, ""),
    48
  );
  return `${base}_mini_jmp_chart.png`;
}

export async function exportMiniJmpChartPng(
  element: HTMLElement,
  csvFileName: string
): Promise<string> {
  const fileName = buildMiniJmpChartFileName(csvFileName);
  const blob = await captureElementAsPng(element, 2);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  return fileName;
}

export function exportFilteredCsv(
  rows: Record<string, string>[],
  headers: string[],
  fileName: string
): void {
  const escape = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.replace(/\.(csv|xlsx)$/i, "") + "_filtered.csv";
  a.click();
  URL.revokeObjectURL(url);
}
