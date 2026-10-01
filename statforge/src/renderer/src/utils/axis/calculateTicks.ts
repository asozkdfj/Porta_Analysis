const MAX_TICKS_HARD = 500;

/**
 * Generate tick values from min/max/increment.
 * Caps at MAX_TICKS_HARD; returns empty if increment invalid.
 */
export function calculateTickValues(
  min: number,
  max: number,
  increment: number,
  maxTicks = MAX_TICKS_HARD
): number[] {
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    !Number.isFinite(increment) ||
    increment <= 0 ||
    min >= max
  ) {
    return [];
  }
  const count = Math.floor((max - min) / increment) + 1;
  if (count > maxTicks) {
    return [];
  }
  const ticks: number[] = [];
  // Align start to increment grid
  let t = Math.ceil(min / increment - 1e-12) * increment;
  if (t < min - 1e-9) t += increment;
  for (; t <= max + 1e-9; t += increment) {
    ticks.push(Number(t.toPrecision(12)));
    if (ticks.length > maxTicks) return [];
  }
  return ticks;
}

export function estimateTickCount(
  min: number,
  max: number,
  increment: number
): number {
  if (!Number.isFinite(increment) || increment <= 0 || min >= max) return 0;
  return Math.floor((max - min) / increment) + 1;
}

export { MAX_TICKS_HARD };
