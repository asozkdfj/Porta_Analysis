import { describe, expect, it } from "vitest";
import {
  buildFitConfidenceBand,
  buildFitCurve,
  fitCategoryMeans,
  fitPolynomial,
} from "../../src/renderer/src/charts/stats/regression";
import { buildSmoother } from "../../src/renderer/src/charts/stats/smoother";

describe("fitPolynomial / Line of Fit", () => {
  it("recovers a known linear relationship", () => {
    const xs = [0, 1, 2, 3, 4, 5];
    const ys = xs.map((x) => 2 * x + 1);
    const fit = fitPolynomial(xs, ys, 1);
    expect(fit).not.toBeNull();
    expect(fit!.coefficients[0]).toBeCloseTo(1, 5);
    expect(fit!.coefficients[1]).toBeCloseTo(2, 5);
    expect(fit!.r2).toBeCloseTo(1, 8);
  });

  it("builds a confidence band that brackets the fit curve", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    const ys = [2.1, 3.9, 6.2, 7.8, 10.1, 11.9, 14.2, 15.8];
    const fit = fitPolynomial(xs, ys, 1)!;
    const curve = buildFitCurve(fit, 1, 8, 20);
    const band = buildFitConfidenceBand(fit, 1, 8, 0.95, 20);
    expect(band.lower).toHaveLength(20);
    expect(band.upper).toHaveLength(20);
    expect(band.polygon.length).toBe(40);
    for (let i = 0; i < curve.length; i += 1) {
      expect(band.lower[i][1]).toBeLessThan(curve[i][1]);
      expect(band.upper[i][1]).toBeGreaterThan(curve[i][1]);
    }
  });
});

describe("fitCategoryMeans", () => {
  it("computes per-category mean and min–max range", () => {
    const means = fitCategoryMeans(
      [
        { xLabel: "B", xIndex: 1, y: 10 },
        { xLabel: "B", xIndex: 1, y: 20 },
        { xLabel: "A", xIndex: 0, y: 4 },
        { xLabel: "A", xIndex: 0, y: 6 },
      ],
      0.95
    );
    expect(means).toHaveLength(2);
    expect(means[0].xLabel).toBe("A");
    expect(means[0].mean).toBeCloseTo(5);
    expect(means[0].min).toBe(4);
    expect(means[0].max).toBe(6);
    expect(means[1].xLabel).toBe("B");
    expect(means[1].mean).toBeCloseTo(15);
    expect(means[1].min).toBe(10);
    expect(means[1].max).toBe(20);
  });
});

describe("buildSmoother", () => {
  it("returns a LOESS curve through a nonlinear trend", () => {
    const xs = Array.from({ length: 30 }, (_, i) => i);
    const ys = xs.map((x) => Math.sin(x / 4) + x * 0.05);
    const smooth = buildSmoother(xs, ys, "loess", { span: 0.4, gridPoints: 40 });
    expect(smooth.length).toBe(40);
    // Should roughly follow the middle of the data, not a straight line only
    const mid = smooth[Math.floor(smooth.length / 2)];
    expect(Number.isFinite(mid.y)).toBe(true);
  });

  it("can evaluate only at category indices", () => {
    const xs = [0, 0, 1, 1, 2, 2, 3, 3];
    const ys = [1, 2, 3, 4, 2, 3, 5, 6];
    const smooth = buildSmoother(xs, ys, "loess", {
      span: 0.8,
      evalAt: [0, 1, 2, 3],
    });
    expect(smooth.map((p) => p.x)).toEqual([0, 1, 2, 3]);
  });
});
