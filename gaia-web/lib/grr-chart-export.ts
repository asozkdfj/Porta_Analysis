import type { AnalysisGroup } from "@/lib/types";

export interface GrrChartSaveResult {
  mode: "outbox" | "download";
  fileName: string;
  absolutePath?: string;
  outboxDir?: string;
}

export function sanitizeGrrChartFileToken(value: string, maxLen = 80): string {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!cleaned) return "metric";
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

export function buildGrrChartFileName(input: {
  csvFileName?: string | null;
  group: AnalysisGroup;
  metric: string;
  referenceSocket: string;
}): string {
  const csvBase = sanitizeGrrChartFileToken(
    (input.csvFileName ?? "grr").replace(/\.csv$/i, ""),
    48
  );
  const metricToken = sanitizeGrrChartFileToken(input.metric, 96);
  const socketToken = sanitizeGrrChartFileToken(input.referenceSocket, 32);
  return `${csvBase}_${input.group}_${metricToken}_${socketToken}.png`;
}

export async function captureElementAsPng(
  element: HTMLElement,
  pixelRatio = 2
): Promise<Blob> {
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(element, {
    pixelRatio,
    cacheBust: true,
    backgroundColor: "#ffffff",
  });
  const response = await fetch(dataUrl);
  return response.blob();
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function saveGrrChartPng(
  fileName: string,
  blob: Blob
): Promise<GrrChartSaveResult> {
  try {
    const pngBase64 = await blobToBase64(blob);
    const response = await fetch("/api/outbox/grr-charts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, pngBase64 }),
    });
    if (response.ok) {
      const data = (await response.json()) as {
        absolutePath?: string;
        outboxDir?: string;
      };
      return {
        mode: "outbox",
        fileName,
        absolutePath: data.absolutePath,
        outboxDir: data.outboxDir,
      };
    }
  } catch {
    // fallback to browser download
  }

  downloadBlob(blob, fileName);
  return { mode: "download", fileName };
}

export async function fetchGrrChartsOutboxInfo(): Promise<{
  outboxDir: string;
  files: string[];
} | null> {
  try {
    const response = await fetch("/api/outbox/grr-charts");
    if (!response.ok) return null;
    return (await response.json()) as { outboxDir: string; files: string[] };
  } catch {
    return null;
  }
}

export function waitForNextPaint(frames = 2): Promise<void> {
  return new Promise((resolve) => {
    let remaining = frames;
    const step = () => {
      remaining -= 1;
      if (remaining <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
