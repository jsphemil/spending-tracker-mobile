// SVG path helpers for the hand-drawn charts (spec.md §5.22 "Analytics").

export interface Point {
  x: number;
  y: number;
}

// Monotone cubic interpolation (Fritsch–Carlson) rendered as an SVG path
// of cubic Béziers. Chosen over Catmull-Rom on purpose: a financial series
// must not show a dip or a bump *between* two months that the data doesn't
// contain, and monotone tangents guarantee the curve never overshoots the
// range of its neighbouring points. Passes through every point exactly.
// Assumes x is strictly increasing, which the chart callers guarantee.
export function monotoneCubicPath(points: Point[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${fmt(points[0].x)},${fmt(points[0].y)}`;
  if (n === 2) return `M${fmt(points[0].x)},${fmt(points[0].y)} L${fmt(points[1].x)},${fmt(points[1].y)}`;

  // Secant slopes between consecutive points.
  const dx: number[] = [];
  const dy: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x;
    dy[i] = points[i + 1].y - points[i].y;
    m[i] = dx[i] === 0 ? 0 : dy[i] / dx[i];
  }

  // Tangent at each point: average of neighbouring secants, zeroed at a
  // local extremum so the curve turns flat there instead of overshooting.
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  }
  // Fritsch–Carlson limiter: keep each tangent within 3× the secant.
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      t[i] = tau * a * m[i];
      t[i + 1] = tau * b * m[i];
    }
  }

  let d = `M${fmt(points[0].x)},${fmt(points[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const h = dx[i] / 3;
    const c1x = p0.x + h;
    const c1y = p0.y + t[i] * h;
    const c2x = p1.x - h;
    const c2y = p1.y - t[i + 1] * h;
    d += ` C${fmt(c1x)},${fmt(c1y)} ${fmt(c2x)},${fmt(c2y)} ${fmt(p1.x)},${fmt(p1.y)}`;
  }
  return d;
}

// Evaluates the same curve at parameter u∈[0,1] within segment i — only
// used by tests to prove the no-overshoot property; not needed at render.
export function monotoneCubicSample(points: Point[], i: number, u: number): Point {
  const d = monotoneCubicPath(points);
  const segs = d.split(" C").slice(1);
  const [c1, c2, p] = segs[i].split(" ").map((s) => s.split(",").map(Number));
  const p0 = points[i];
  const b = (a: number, b: number, c: number, e: number) =>
    (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u ** 2 * c + u ** 3 * e;
  return { x: b(p0.x, c1[0], c2[0], p[0]), y: b(p0.y, c1[1], c2[1], p[1]) };
}

// Rounds a value up to a "nice" number for an axis ceiling (1/2/5 × a
// power of 10) so gridlines land on readable figures instead of an
// arbitrary max like ₹12,04,549.
export function niceCeiling(value: number): number {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
