"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface MarqueeRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const DRAG_THRESHOLD_PX = 4;

function normalizeRect(x1: number, y1: number, x2: number, y2: number) {
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    right: Math.max(x1, x2),
    bottom: Math.max(y1, y2),
  };
}

function intersects(
  a: { left: number; top: number; right: number; bottom: number },
  b: DOMRect
) {
  return !(
    b.right < a.left ||
    b.left > a.right ||
    b.bottom < a.top ||
    b.top > a.bottom
  );
}

interface UseMarqueeSelectionOptions {
  enabled: boolean;
  selected: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
}

export function useMarqueeSelection({
  enabled,
  selected,
  onSelectionChange,
}: UseMarqueeSelectionOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const [marqueeDragging, setMarqueeDragging] = useState(false);
  const marqueeActiveRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    active: boolean;
    additive: boolean;
    startedOnHeader: string | null;
    baseSelection: Set<string>;
  } | null>(null);

  const registerItemRef = useCallback(
    (header: string, el: HTMLDivElement | null) => {
      if (el) itemRefs.current.set(header, el);
      else itemRefs.current.delete(header);
    },
    []
  );

  const headersInMarquee = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const box = normalizeRect(x1, y1, x2, y2);
    const hits: string[] = [];
    for (const [header, el] of itemRefs.current) {
      if (intersects(box, el.getBoundingClientRect())) {
        hits.push(header);
      }
    }
    return hits;
  }, []);

  const applyMarqueeSelection = useCallback(
    (hits: string[], additive: boolean, base: Set<string>) => {
      if (additive) {
        onSelectionChange(new Set([...base, ...hits]));
      } else {
        onSelectionChange(new Set(hits));
      }
    },
    [onSelectionChange]
  );

  const onContainerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || e.button !== 0) return;

      const headerEl = (e.target as HTMLElement).closest("[data-tact-header]");
      const startedOnHeader =
        headerEl?.getAttribute("data-tact-header") ?? null;

      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        active: false,
        additive: e.shiftKey,
        startedOnHeader,
        baseSelection: e.shiftKey ? new Set(selected) : new Set(),
      };
      marqueeActiveRef.current = false;
      setMarqueeDragging(false);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [enabled, selected]
  );

  const onContainerPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.active && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

      drag.active = true;
      marqueeActiveRef.current = true;
      setMarqueeDragging(true);
      setMarquee({
        x1: drag.startX,
        y1: drag.startY,
        x2: e.clientX,
        y2: e.clientY,
      });

      const hits = headersInMarquee(
        drag.startX,
        drag.startY,
        e.clientX,
        e.clientY
      );
      applyMarqueeSelection(hits, drag.additive, drag.baseSelection);
    },
    [applyMarqueeSelection, headersInMarquee]
  );

  const finishPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }

      if (!drag.active) {
        if (drag.startedOnHeader) {
          onSelectionChange(
            (() => {
              const next = drag.additive ? new Set(selected) : new Set<string>();
              if (next.has(drag.startedOnHeader!)) next.delete(drag.startedOnHeader!);
              else next.add(drag.startedOnHeader!);
              return next;
            })()
          );
        } else if (!drag.additive) {
          onSelectionChange(new Set());
        }
      }

      dragRef.current = null;
      marqueeActiveRef.current = false;
      setMarqueeDragging(false);
      setMarquee(null);
    },
    [onSelectionChange, selected]
  );

  useEffect(() => {
    if (!enabled) {
      dragRef.current = null;
      marqueeActiveRef.current = false;
      setMarqueeDragging(false);
      setMarquee(null);
    }
  }, [enabled]);

  return {
    containerRef,
    registerItemRef,
    marquee,
    marqueeDragging,
    marqueeActiveRef,
    onContainerPointerDown,
    onContainerPointerMove,
    onContainerPointerUp: finishPointer,
    onContainerPointerCancel: finishPointer,
  };
}
