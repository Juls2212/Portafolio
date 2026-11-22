/**
 * Shared motion system. The CSS custom properties in globals.css (--ease-*, --dur-*) mirror these
 * values: change both together. JS animations (decode, globe burst, scan wipe) read from here.
 */
export const EASE = {
  /** Default deceleration for entrances and panel moves. */
  out: [0.2, 0.8, 0.2, 1],
  /** Small overshoot, used for settling (active panel, key press). */
  spring: [0.3, 1.5, 0.6, 1],
  /** Gentle overshoot for the active panel settling into place. */
  settle: [0.25, 1.15, 0.5, 1],
  /** Accelerating exit. */
  in: [0.5, 0, 0.9, 0.5],
  /** Symmetric, for loops and wipes. */
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const DURATION = {
  /** Micro interactions (hover, press). */
  fast: 180,
  /** Standard element transitions. */
  base: 500,
  /** Panel moves and reveals. */
  slow: 650,
  /** Heading decode. */
  decode: 600,
  /** Module scan wipe. */
  wipe: 400,
  /** Globe burst / reassemble. */
  burst: 900,
} as const;

type Curve = readonly [number, number, number, number];

export const cssEase = (curve: Curve) => `cubic-bezier(${curve.join(", ")})`;

/** Cubic-bezier solver (Newton + bisection) so JS-driven values follow the same curves as CSS. */
export function bezier([x1, y1, x2, y2]: Curve): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-5) return sampleY(t);
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 20; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-5) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}
