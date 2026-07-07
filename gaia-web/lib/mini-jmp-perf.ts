import type { MiniJmpPointsMode, MiniJmpScatterPoint } from "./mini-jmp-types";

/** Recharts SVG scatter 상한 — 초과 시 균등 샘플링 */
export const MAX_SCATTER_POINTS = 5000;

/** Line chart 포인트 상한 */
export const MAX_LINE_POINTS = 4000;

export function downsamplePoints<T>(items: T[], max: number): {
  items: T[];
  total: number;
} {
  const total = items.length;
  if (total <= max) return { items, total };
  const out: T[] = [];
  const step = total / max;
  for (let i = 0; i < max; i++) {
    out.push(items[Math.floor(i * step)]!);
  }
  return { items: out, total };
}

function jitterOffset(seed: number, spread: number): number {
  const h = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return (h - Math.floor(h) - 0.5) * spread;
}

/** Jitter는 렌더 단계에서만 적용 (슬라이더 조작 시 데이터 재빌드 방지) */
export function applyPointJitter(
  points: MiniJmpScatterPoint[],
  mode: MiniJmpPointsMode,
  jitterStrength: number,
  xCatCount: number,
  yCatCount: number
): MiniJmpScatterPoint[] {
  if (jitterStrength <= 0 || mode === "numeric") return points;

  const xSpread =
    Math.min(0.42, 0.9 / Math.max(xCatCount, 1)) * jitterStrength;

  if (mode === "x-only") {
    return points.map((p, idx) => {
      const i = p.i ?? idx;
      return {
        ...p,
        x: p.x + jitterOffset(i, xSpread),
        y: p.y + jitterOffset(i + 1000, 0.38 * jitterStrength),
      };
    });
  }

  if (mode === "cat-numeric") {
    const yJ = 0.015 * jitterStrength;
    return points.map((p, idx) => {
      const i = p.i ?? idx;
      return {
        ...p,
        x: p.x + jitterOffset(i, xSpread),
        y: p.y + jitterOffset(i + 500, yJ * Math.max(Math.abs(p.y), 1)),
      };
    });
  }

  if (mode === "categorical") {
    const ySpread =
      Math.min(0.42, 0.9 / Math.max(yCatCount, 1)) * jitterStrength;
    return points.map((p, idx) => {
      const i = p.i ?? idx;
      return {
        ...p,
        x: p.x + jitterOffset(i, xSpread),
        y: p.y + jitterOffset(i + 500, ySpread),
      };
    });
  }

  return points;
}
