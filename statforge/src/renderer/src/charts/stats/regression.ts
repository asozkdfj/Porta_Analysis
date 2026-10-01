export type FitDegree = 1 | 2 | 3;

export type RegressionResult = {
  coefficients: number[];
  r2: number;
  adjustedR2: number;
  rmse: number;
  sampleCount: number;
  residualDf: number;
  xMean: number;
  sxx: number;
  residualSE: number;
  predict: (x: number) => number;
  equation: string;
};

/** Solve least squares with Gram-Schmidt / normal eq via Gaussian elimination. */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    if (pivot !== col) {
      const tmp = M[col];
      M[col] = M[pivot];
      M[pivot] = tmp;
    }
    const div = M[col][col];
    for (let c = col; c <= n; c += 1) M[col][c] /= div;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c <= n; c += 1) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

function designRow(x: number, degree: FitDegree): number[] {
  const row = [1];
  let p = 1;
  for (let d = 1; d <= degree; d += 1) {
    p *= x;
    row.push(p);
  }
  return row;
}

/** Approximate two-tailed t critical (df≥1). Good enough for CI bands. */
export function tCritical(df: number, level = 0.95): number {
  if (df <= 0) return 1.96;
  // coarse approximation via normal for large df; small-df table-ish values
  if (level < 0.9) return 1.645;
  if (df >= 120) return 1.96;
  if (df >= 60) return 2.0;
  if (df >= 30) return 2.042;
  if (df >= 20) return 2.086;
  if (df >= 10) return 2.228;
  if (df >= 5) return 2.571;
  return 3.182;
}

export function fitPolynomial(
  xs: number[],
  ys: number[],
  degree: FitDegree = 1
): RegressionResult | null {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < xs.length; i += 1) {
    if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) pts.push([xs[i], ys[i]]);
  }
  if (pts.length < degree + 1) return null;

  const uniqueX = new Set(pts.map((p) => p[0]));
  if (uniqueX.size < 2) return null;

  const n = pts.length;
  const p = degree + 1;
  const XtX: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  const Xty: number[] = Array(p).fill(0);

  let xSum = 0;
  for (const [x, y] of pts) {
    xSum += x;
    const row = designRow(x, degree);
    for (let i = 0; i < p; i += 1) {
      Xty[i] += row[i] * y;
      for (let j = 0; j < p; j += 1) XtX[i][j] += row[i] * row[j];
    }
  }
  const xMean = xSum / n;

  const coefficients = solveLinearSystem(XtX, Xty);
  if (!coefficients) return null;

  const predict = (x: number) => {
    const row = designRow(x, degree);
    return row.reduce((s, v, i) => s + v * coefficients[i], 0);
  };

  const yMean = pts.reduce((s, [, y]) => s + y, 0) / n;
  let ssTot = 0;
  let ssRes = 0;
  let sxx = 0;
  for (const [x, y] of pts) {
    const yh = predict(x);
    ssTot += (y - yMean) ** 2;
    ssRes += (y - yh) ** 2;
    sxx += (x - xMean) ** 2;
  }
  const residualDf = Math.max(1, n - p);
  const residualSE = Math.sqrt(ssRes / residualDf);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const adjustedR2 =
    n <= p ? r2 : 1 - ((1 - r2) * (n - 1)) / Math.max(1, n - p);
  const rmse = Math.sqrt(ssRes / residualDf);

  const terms = coefficients.map((c, i) => {
    const abs = Math.abs(c);
    const body = abs.toPrecision(4);
    if (i === 0) return `${c < 0 ? "-" : ""}${body}`;
    const op = c < 0 ? " - " : " + ";
    const power = i === 1 ? "x" : `x^${i}`;
    return `${op}${body}${power}`;
  });
  const equation = `y = ${terms.join("")}`;

  return {
    coefficients,
    r2,
    adjustedR2,
    rmse,
    sampleCount: n,
    residualDf,
    xMean,
    sxx: sxx || 1e-12,
    residualSE,
    predict,
    equation,
  };
}

export function buildFitCurve(
  result: RegressionResult,
  xMin: number,
  xMax: number,
  points = 100
): Array<[number, number]> {
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax)) return [];
  if (xMin === xMax) return [[xMin, result.predict(xMin)]];
  const out: Array<[number, number]> = [];
  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1);
    const x = xMin + (xMax - xMin) * t;
    out.push([x, result.predict(x)]);
  }
  return out;
}

/**
 * 95% confidence band for the mean response (Line of Fit).
 * Returns closed polygon path: lower L→R then upper R→L.
 */
export function buildFitConfidenceBand(
  result: RegressionResult,
  xMin: number,
  xMax: number,
  level = 0.95,
  points = 80
): {
  lower: Array<[number, number]>;
  upper: Array<[number, number]>;
  polygon: Array<[number, number]>;
} {
  const tCrit = tCritical(result.residualDf, level);
  const lower: Array<[number, number]> = [];
  const upper: Array<[number, number]> = [];
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax)) {
    return { lower, upper, polygon: [] };
  }
  const span = xMax === xMin ? 1 : xMax - xMin;
  for (let i = 0; i < points; i += 1) {
    const x = xMin + (span * i) / (points - 1 || 1);
    const yhat = result.predict(x);
    const seMean =
      result.residualSE *
      Math.sqrt(1 / result.sampleCount + (x - result.xMean) ** 2 / result.sxx);
    const half = tCrit * seMean;
    lower.push([x, yhat - half]);
    upper.push([x, yhat + half]);
  }
  const polygon: Array<[number, number]> = [
    ...lower,
    ...upper.slice().reverse(),
  ];
  return { lower, upper, polygon };
}

export type CategoryMeanPoint = {
  xLabel: string;
  xIndex: number;
  /** Fit center (mean of Y at this X level). */
  mean: number;
  /** Data range at this X level — JMP interval paint uses min/max. */
  min: number;
  max: number;
  se: number;
  n: number;
  /** 95% CI of the mean (optional; display prefers min/max range). */
  lo: number;
  hi: number;
};

/** JMP-style: Line of Fit on categorical X → mean + data range at each X level. */
export function fitCategoryMeans(
  rows: Array<{ xLabel: string; xIndex: number; y: number }>,
  level = 0.95
): CategoryMeanPoint[] {
  const buckets = new Map<
    string,
    { xIndex: number; ys: number[] }
  >();
  for (const r of rows) {
    let b = buckets.get(r.xLabel);
    if (!b) {
      b = { xIndex: r.xIndex, ys: [] };
      buckets.set(r.xLabel, b);
    }
    b.ys.push(r.y);
  }
  const out: CategoryMeanPoint[] = [];
  for (const [xLabel, b] of Array.from(buckets.entries())) {
    const n = b.ys.length;
    if (n === 0) continue;
    const mean = b.ys.reduce((s: number, v: number) => s + v, 0) / n;
    let ss = 0;
    let min = b.ys[0];
    let max = b.ys[0];
    for (const y of b.ys) {
      ss += (y - mean) ** 2;
      if (y < min) min = y;
      if (y > max) max = y;
    }
    const se = n > 1 ? Math.sqrt(ss / (n - 1) / n) : 0;
    const half = tCritical(Math.max(1, n - 1), level) * se;
    out.push({
      xLabel,
      xIndex: b.xIndex,
      mean,
      min,
      max,
      se,
      n,
      lo: mean - half,
      hi: mean + half,
    });
  }
  out.sort((a, b) => a.xIndex - b.xIndex);
  return out;
}
