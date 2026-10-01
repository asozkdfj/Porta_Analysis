export type SmootherMethod = "movingAverage" | "loess";

export type SmootherPoint = { x: number; y: number };

function sortPairs(xs: number[], ys: number[]): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < xs.length; i += 1) {
    if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) pts.push([xs[i], ys[i]]);
  }
  pts.sort((a, b) => a[0] - b[0]);
  return pts;
}

export function movingAverageSmooth(
  xs: number[],
  ys: number[],
  windowSize: number
): SmootherPoint[] {
  const pts = sortPairs(xs, ys);
  if (pts.length < 2) return [];
  const w = Math.max(3, Math.min(pts.length, Math.floor(windowSize) | 1));
  const half = Math.floor(w / 2);
  const out: SmootherPoint[] = [];
  for (let i = 0; i < pts.length; i += 1) {
    const from = Math.max(0, i - half);
    const to = Math.min(pts.length - 1, i + half);
    let sum = 0;
    let n = 0;
    for (let j = from; j <= to; j += 1) {
      sum += pts[j][1];
      n += 1;
    }
    out.push({ x: pts[i][0], y: sum / n });
  }
  return out;
}

/** Simple tricube-weighted local linear LOESS. */
export function loessSmooth(
  xs: number[],
  ys: number[],
  span = 0.4,
  gridPoints = 80,
  evalAt?: number[]
): SmootherPoint[] {
  const pts = sortPairs(xs, ys);
  if (pts.length < 3) return [];

  const n = pts.length;
  const k = Math.max(3, Math.min(n, Math.floor(span * n)));
  const xMin = pts[0][0];
  const xMax = pts[n - 1][0];
  if (xMin === xMax) return [{ x: xMin, y: pts.reduce((s, p) => s + p[1], 0) / n }];

  let grid: number[];
  if (evalAt && evalAt.length > 0) {
    grid = Array.from(new Set(evalAt.filter((v) => Number.isFinite(v)))).sort(
      (a, b) => a - b
    );
  } else {
    grid = [];
    for (let g = 0; g < gridPoints; g += 1) {
      grid.push(xMin + ((xMax - xMin) * g) / (gridPoints - 1));
    }
  }

  const out: SmootherPoint[] = [];
  for (const x0 of grid) {
    const dists = pts.map((p, i) => ({ i, d: Math.abs(p[0] - x0) }));
    dists.sort((a, b) => a.d - b.d);
    const neighbors = dists.slice(0, k);
    const maxD = neighbors[neighbors.length - 1].d || 1;
    let sw = 0;
    let swx = 0;
    let swy = 0;
    let swxx = 0;
    let swxy = 0;
    for (const { i, d } of neighbors) {
      const u = d / maxD;
      const w = (1 - u ** 3) ** 3;
      const [x, y] = pts[i];
      sw += w;
      swx += w * x;
      swy += w * y;
      swxx += w * x * x;
      swxy += w * x * y;
    }
    const denom = sw * swxx - swx * swx;
    const beta1 = Math.abs(denom) < 1e-12 ? 0 : (sw * swxy - swx * swy) / denom;
    const beta0 = (swy - beta1 * swx) / sw;
    out.push({ x: x0, y: beta0 + beta1 * x0 });
  }
  return out;
}

export function buildSmoother(
  xs: number[],
  ys: number[],
  method: SmootherMethod,
  options: {
    span?: number;
    windowSize?: number;
    gridPoints?: number;
    evalAt?: number[];
  } = {}
): SmootherPoint[] {
  if (method === "movingAverage") {
    return movingAverageSmooth(xs, ys, options.windowSize ?? 9);
  }
  return loessSmooth(
    xs,
    ys,
    options.span ?? 0.45,
    options.gridPoints ?? 100,
    options.evalAt
  );
}
