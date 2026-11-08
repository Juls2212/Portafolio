import { KEYBOARD_COLS, KEYBOARD_ROWS, keyboardKeys } from "@/data/technologies";
import { CAP_LIFT, cellCenter } from "./board";

const COUNT = keyboardKeys.length;

export const HOVER_SINK = 0.17;
export const SELECT_PRESS = 0.2;
export const SELECT_RISE = 0.85;
export const API_RISE = 0.6;

const ENTRANCE_BASE = 0.34;
const ENTRANCE_STAGGER = 0.05;
const ENTRANCE_DROP = 0.42;
const ENTRANCE_HEIGHT = 3.2;
const RIPPLE_DURATION = 1.15;
const CASCADE_STEP = 0.045;
const PRESS_TIME = 0.11;
const EXIT_STAGGER = 0.05;
const EXIT_KEY = 0.3;
const EXIT_BASE_DELAY = 0.4;
const EXIT_BASE = 0.4;
const EXIT_TOTAL = EXIT_BASE_DELAY + EXIT_BASE;

interface Pending {
  at: number;
  value: boolean;
}

/** Piecewise "fall, small bounce, tiny bounce". t in 0..1, returns height factor 1..0. */
function dropCurve(t: number): number {
  if (t <= 0) return 1;
  if (t < 0.58) return 1 - (t / 0.58) ** 2;
  if (t < 0.8) {
    const u = (t - 0.58) / 0.22;
    return 0.1 * (1 - (2 * u - 1) ** 2);
  }
  if (t < 1) {
    const u = (t - 0.8) / 0.2;
    return 0.035 * (1 - (2 * u - 1) ** 2);
  }
  return 0;
}

function spring(y: number, v: number, target: number, k: number, c: number, dt: number) {
  const nv = v + (k * (target - y) - c * v) * dt;
  return { y: y + nv * dt, v: nv };
}

export interface KeyFrame {
  /** Local y offset above the resting position (before CAP_LIFT). */
  y: number;
  /** 0..1 uniform scale (0 = not yet entered). */
  scale: number;
  glow: number;
  dim: number;
}

/**
 * Pure animation state for the 42 keys. No three.js objects in here: the scene reads
 * `frames` after every `update()` and writes instance matrices / attributes.
 */
export class KeyAnimator {
  readonly frames: KeyFrame[] = Array.from({ length: COUNT }, () => ({
    y: 0,
    scale: 0,
    glow: 0,
    dim: 0,
  }));
  /** 0..1 appearance of the base plate (it shows up before the keys). */
  baseAppear = 0;

  private hoverY = new Float32Array(COUNT);
  private hoverV = new Float32Array(COUNT);
  private riseY = new Float32Array(COUNT);
  private riseV = new Float32Array(COUNT);
  private pressUntil = new Float32Array(COUNT).fill(-1);
  private apiRaised = new Uint8Array(COUNT);
  private apiPending: (Pending | null)[] = Array(COUNT).fill(null);
  private dimTarget = new Float32Array(COUNT);
  private dimPending: ({ at: number; value: number } | null)[] = Array(COUNT).fill(null);
  private glowValue = new Float32Array(COUNT);
  private dimValue = new Float32Array(COUNT);

  private entranceStart: number | null = null;
  private exitStart: number | null = null;
  private ripple: { index: number; start: number } | null = null;
  private selectedIndex = -1;

  get entered(): boolean {
    return this.entranceStart !== null;
  }

  startEntrance(now: number) {
    if (this.entranceStart === null) this.entranceStart = now;
  }

  /** Replays the entrance (base first, then the diagonal wave of drops). */
  restartEntrance(now: number) {
    this.entranceStart = now;
    this.exitStart = null;
  }

  /** Exit: keys drop away back-to-front, then the base sinks and fades. */
  startExit(now: number) {
    if (this.exitStart === null) this.exitStart = now;
  }

  get exiting(): boolean {
    return this.exitStart !== null;
  }

  /** Marks the key as freshly selected: it sinks first, then rises with a ripple. */
  select(index: number, now: number) {
    this.selectedIndex = index;
    if (index < 0) this.ripple = null;
    if (index >= 0) {
      this.pressUntil[index] = now + PRESS_TIME;
      this.ripple = { index, start: now + PRESS_TIME };
    }
  }

  pulse(index: number, now: number) {
    if (index >= 0) this.pressUntil[index] = now + PRESS_TIME;
  }

  /**
   * Phase-3 hook: the raised set is a pure function of the latest call. Every pending cascade step is
   * cancelled first, keys that already match the target are left alone (shared keys stay up), and only
   * the rest is scheduled back-to-front. Rapid calls can therefore never leave stale keys up.
   */
  setRaised(indices: readonly number[], now: number) {
    const next = new Set(indices);
    for (let i = 0; i < COUNT; i++) {
      this.apiPending[i] = null;
      this.dimPending[i] = null;
    }
    const changed: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      if (next.has(i) !== (this.apiRaised[i] === 1)) changed.push(i);
    }
    // Back-to-front: far rows first, then left to right.
    changed.sort((a, b) => cellOrder(a) - cellOrder(b));
    changed.forEach((i, rank) => {
      this.apiPending[i] = { at: now + rank * CASCADE_STEP, value: next.has(i) };
    });
    const dimTo = next.size > 0 ? 1 : 0;
    for (let i = 0; i < COUNT; i++) {
      const target = next.has(i) ? 0 : dimTo;
      if (this.dimTarget[i] === target) continue;
      this.dimPending[i] = { at: now + (keyboardKeys[i]?.row ?? 0) * CASCADE_STEP, value: target };
    }
  }

  /** Advances everything. Returns true while any animation is still running. */
  update(dt: number, now: number, hoverIndex: number): boolean {
    let active = false;
    const steps = dt > 1 / 45 ? 2 : 1;
    const h = dt / steps;

    for (let i = 0; i < COUNT; i++) {
      const pa = this.apiPending[i];
      if (pa) {
        if (now >= pa.at) {
          this.apiRaised[i] = pa.value ? 1 : 0;
          this.apiPending[i] = null;
        } else active = true;
      }
      const pd = this.dimPending[i];
      if (pd) {
        if (now >= pd.at) {
          this.dimTarget[i] = pd.value;
          this.dimPending[i] = null;
        } else active = true;
      }
    }

    const hover = hoverIndex >= 0 ? keyboardKeys[hoverIndex] : undefined;
    const ripple = this.ripple && now - this.ripple.start < RIPPLE_DURATION ? this.ripple : null;
    if (!ripple) this.ripple = null;
    else active = true;
    const rippleKey = ripple ? keyboardKeys[ripple.index] : undefined;

    for (let i = 0; i < COUNT; i++) {
      const key = keyboardKeys[i];
      if (!key) continue;

      // Hover: the key under the pointer sinks fully, its neighbours slightly.
      let weight = 0;
      if (hover && i !== this.selectedIndex) {
        const d = Math.hypot(key.row - hover.row, key.col - hover.col);
        weight = d === 0 ? 1 : d <= 1.5 ? 0.38 : d <= 2.1 ? 0.14 : 0;
      }
      const hoverTarget = -HOVER_SINK * weight;
      const pressing = hoverTarget < this.hoverY[i]!;
      let hy = this.hoverY[i]!;
      let hv = this.hoverV[i]!;
      for (let s = 0; s < steps; s++) {
        const r = pressing ? spring(hy, hv, hoverTarget, 900, 54, h) : spring(hy, hv, hoverTarget, 230, 9, h);
        hy = r.y;
        hv = r.v;
      }
      this.hoverY[i] = hy;
      this.hoverV[i] = hv;

      // Rise: press-down phase, then selection height; or the phase-3 raised height.
      const pressed = now < this.pressUntil[i]!;
      const riseTarget = pressed
        ? -SELECT_PRESS
        : i === this.selectedIndex
          ? SELECT_RISE
          : this.apiRaised[i]
            ? API_RISE
            : 0;
      let ry = this.riseY[i]!;
      let rv = this.riseV[i]!;
      for (let s = 0; s < steps; s++) {
        const r = spring(ry, rv, riseTarget, riseTarget < ry ? 700 : 150, riseTarget < ry ? 50 : 12.5, h);
        ry = r.y;
        rv = r.v;
      }
      this.riseY[i] = ry;
      this.riseV[i] = rv;
      if (pressed) active = true;

      // Glow and dim ease toward their targets.
      const glowTarget = i === this.selectedIndex && !pressed ? 1 : this.apiRaised[i] ? 0.85 : 0;
      this.glowValue[i] = this.glowValue[i]! + (glowTarget - this.glowValue[i]!) * Math.min(1, dt * 12);
      this.dimValue[i] = this.dimValue[i]! + (this.dimTarget[i]! - this.dimValue[i]!) * Math.min(1, dt * 9);

      if (
        Math.abs(hy - hoverTarget) > 0.0015 ||
        Math.abs(hv) > 0.02 ||
        Math.abs(ry - riseTarget) > 0.0015 ||
        Math.abs(rv) > 0.02 ||
        Math.abs(glowTarget - this.glowValue[i]!) > 0.004 ||
        Math.abs(this.dimTarget[i]! - this.dimValue[i]!) > 0.004
      ) {
        active = true;
      }

      // Entrance: diagonal wave of bouncing drops.
      let drop = 0;
      let scale = 1;
      if (this.entranceStart === null) scale = 0;
      else {
        const t = (now - this.entranceStart - ENTRANCE_BASE - (key.row + key.col) * ENTRANCE_STAGGER) / ENTRANCE_DROP;
        if (t < 0) scale = 0;
        else if (t < 1) {
          drop = dropCurve(t) * ENTRANCE_HEIGHT;
          scale = Math.min(1, t * 8);
          active = true;
        }
      }

      let bump = 0;
      if (ripple && rippleKey) {
        const age = now - ripple.start;
        const d = Math.hypot(key.row - rippleKey.row, key.col - rippleKey.col);
        bump = 0.11 * Math.exp(-(((d - age * 5.2) / 0.85) ** 2)) * (1 - age / RIPPLE_DURATION);
        if (d === 0) bump = 0;
      }

      let exitDrop = 0;
      if (this.exitStart !== null) {
        const te = Math.min(1, Math.max(0, (now - this.exitStart - key.row * EXIT_STAGGER) / EXIT_KEY));
        exitDrop = te * te * 1.8;
        scale *= 1 - te * te;
        if (now - this.exitStart < EXIT_TOTAL + 0.1) active = true;
      }

      const frame = this.frames[i]!;
      frame.y = drop + hy + ry + bump - exitDrop;
      frame.scale = scale;
      frame.glow = this.glowValue[i]!;
      frame.dim = this.dimValue[i]!;
    }

    // Keep rendering until the whole entrance (including keys still waiting for their turn) is done.
    if (this.entranceStart !== null && now - this.entranceStart < KeyAnimator.ENTRANCE_TOTAL + 0.1) active = true;

    if (this.exitStart !== null) {
      const t = Math.min(1, Math.max(0, (now - this.exitStart - EXIT_BASE_DELAY) / EXIT_BASE));
      this.baseAppear = 1 - t * t;
      return active;
    }

    // Base plate appears first.
    if (this.entranceStart === null) this.baseAppear = 0;
    else {
      const t = Math.min(1, (now - this.entranceStart) / ENTRANCE_BASE);
      this.baseAppear = 1 - (1 - t) ** 3;
      if (t < 1) active = true;
    }
    return active;
  }

  /** Ripple ring progress for the scene (null when idle). */
  rippleState(now: number): { index: number; age: number } | null {
    if (!this.ripple) return null;
    const age = now - this.ripple.start;
    return age >= 0 && age < RIPPLE_DURATION ? { index: this.ripple.index, age: age / RIPPLE_DURATION } : null;
  }

  /** Total span of the entrance, for reference / tests. */
  static readonly ENTRANCE_TOTAL =
    ENTRANCE_BASE + (KEYBOARD_ROWS - 1 + KEYBOARD_COLS - 1) * ENTRANCE_STAGGER + ENTRANCE_DROP;
}

function cellOrder(index: number): number {
  const key = keyboardKeys[index];
  return key ? key.row * 10 + key.col : 0;
}

/** Local position (x, z) of a key. */
export function keyPosition(index: number): { x: number; z: number } {
  const key = keyboardKeys[index];
  return key ? cellCenter(key.row, key.col) : { x: 0, z: 0 };
}

export const REST_Y = CAP_LIFT;
