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
