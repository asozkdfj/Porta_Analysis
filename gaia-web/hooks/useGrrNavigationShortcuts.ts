"use client";

import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function cycleList<T>(items: T[], current: T, direction: 1 | -1): T | null {
  if (items.length === 0) return null;
  const idx = items.indexOf(current);
  const base = idx >= 0 ? idx : 0;
  const next = (base + direction + items.length) % items.length;
  return items[next] ?? null;
}

export interface GrrNavigationShortcutsOptions {
  enabled?: boolean;
  metrics: string[];
  metric: string;
  onMetricChange: (metric: string) => void;
  sockets: string[];
  referenceSocket: string;
  onReferenceSocketChange: (socket: string) => void;
}

/**
 * GRR 대시보드 키보드 단축키
 * - Ctrl + ↑/↓ : 이전/다음 Metric
 * - Alt + ↑/↓ : 이전/다음 기준 소켓
 */
export function useGrrNavigationShortcuts({
  enabled = true,
  metrics,
  metric,
  onMetricChange,
  sockets,
  referenceSocket,
  onReferenceSocketChange,
}: GrrNavigationShortcutsOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;

      const direction: 1 | -1 = e.key === "ArrowDown" ? 1 : -1;

      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        const current = metric || metrics[0] || "";
        const next = cycleList(metrics, current, direction);
        if (!next || next === current) return;
        e.preventDefault();
        onMetricChange(next);
        return;
      }

      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        const current = referenceSocket || sockets[0] || "";
        const next = cycleList(sockets, current, direction);
        if (!next || next === current) return;
        e.preventDefault();
        onReferenceSocketChange(next);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    enabled,
    metrics,
    metric,
    onMetricChange,
    sockets,
    referenceSocket,
    onReferenceSocketChange,
  ]);
}

export const GRR_NAVIGATION_SHORTCUTS = {
  metricNext: "Ctrl + ↓",
  metricPrev: "Ctrl + ↑",
  socketNext: "Alt + ↓",
  socketPrev: "Alt + ↑",
} as const;
