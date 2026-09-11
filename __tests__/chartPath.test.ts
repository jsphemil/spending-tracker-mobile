import { monotoneCubicPath, monotoneCubicSample } from "../services/chartPath";

const series = [
  { x: 0, y: 100 },
  { x: 10, y: 60 },
  { x: 20, y: 70 },
  { x: 30, y: 20 },
  { x: 40, y: 20 },
  { x: 50, y: 90 },
];

describe("monotoneCubicPath", () => {
  it("handles degenerate inputs", () => {
    expect(monotoneCubicPath([])).toBe("");
    expect(monotoneCubicPath([{ x: 5, y: 5 }])).toBe("M5,5");
    expect(monotoneCubicPath([{ x: 0, y: 0 }, { x: 10, y: 5 }])).toBe("M0,0 L10,5");
  });

  it("passes through every point", () => {
    const d = monotoneCubicPath(series);
    expect(d.startsWith("M0,100")).toBe(true);
    for (const p of series.slice(1)) {
      expect(d).toContain(` ${p.x},${p.y}`);
    }
    expect(d.split(" C").length - 1).toBe(series.length - 1);
  });

  it("never overshoots the range of a segment's endpoints", () => {
    for (let i = 0; i < series.length - 1; i++) {
      const lo = Math.min(series[i].y, series[i + 1].y);
      const hi = Math.max(series[i].y, series[i + 1].y);
      for (let u = 0; u <= 1; u += 0.05) {
        const { y } = monotoneCubicSample(series, i, u);
        expect(y).toBeGreaterThanOrEqual(lo - 1e-6);
        expect(y).toBeLessThanOrEqual(hi + 1e-6);
      }
    }
  });

  it("stays flat across a flat segment (no invented dip between equal months)", () => {
    for (let u = 0; u <= 1; u += 0.1) {
      expect(monotoneCubicSample(series, 3, u).y).toBeCloseTo(20, 6);
    }
  });
});
