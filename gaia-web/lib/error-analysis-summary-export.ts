import {
  captureElementAsPng,
  sanitizeGrrChartFileToken,
  waitForNextPaint,
} from "./grr-chart-export";

/** PowerPoint 16:9 slide (1920×1080) */
export const PPT_SLIDE_WIDTH = 1920;
export const PPT_SLIDE_HEIGHT = 1080;

export function buildErrorSummaryFileName(csvFileName: string): string {
  const base = sanitizeGrrChartFileToken(
    csvFileName.replace(/\.csv$/i, ""),
    48
  );
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${base}_error_summary_ppt_${stamp}.png`;
}

export async function captureErrorSummaryPng(
  element: HTMLElement
): Promise<Blob> {
  await waitForNextPaint(3);
  await new Promise((resolve) => setTimeout(resolve, 500));
  return captureElementAsPng(element, 1);
}

export async function saveErrorSummaryPng(
  element: HTMLElement,
  csvFileName: string
): Promise<{ fileName: string; blob: Blob }> {
  const fileName = buildErrorSummaryFileName(csvFileName);
  const blob = await captureErrorSummaryPng(element);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  return { fileName, blob };
}
