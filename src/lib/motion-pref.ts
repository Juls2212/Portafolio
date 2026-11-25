import { useSyncExternalStore } from "react";

/**
 * Motion preference. The operating system setting (prefers-reduced-motion) is respected by default,
 * and the HUD control can override it for this site ("on" or "reduced"); the choice is kept in
 * localStorage (guarded: storage can be blocked) and in memory. The result is published as
 * <html data-motion="on|reduced" data-motion-source="os|site">, which the stylesheet and the
 * animation code read, so one switch drives CSS and JS alike.
 */
export type MotionChoice = "on" | "reduced";

const KEY = "portfolio.motion";
const listeners = new Set<() => void>();
let override: MotionChoice | null | undefined; // undefined = not read yet
let osQuery: MediaQueryList | null = null;

function readStored(): MotionChoice | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "on" || v === "reduced" ? v : null;
  } catch {
    return null;
  }
}

const osReduced = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

function getOverride(): MotionChoice | null {
  if (override === undefined) override = readStored();
  return override;
}

export interface MotionState {
  reduced: boolean;
  source: "os" | "site";
  os: boolean;
  override: MotionChoice | null;
}

export function getMotionState(): MotionState {
  const o = getOverride();
  const os = osReduced();
  return { reduced: o ? o === "reduced" : os, source: o ? "site" : "os", os, override: o };
}

function publish() {
  const s = getMotionState();
  const el = document.documentElement;
  el.dataset.motion = s.reduced ? "reduced" : "on";
  el.dataset.motionSource = s.source;
}

/** Fast check for render loops: reads what the stylesheet reads. */
export function isReducedMotion(): boolean {
  if (typeof document === "undefined") return false;
  const v = document.documentElement.dataset.motion;
  return v ? v === "reduced" : getMotionState().reduced;
}

export function setMotionChoice(choice: MotionChoice | null) {
  override = choice;
  try {
    if (choice) window.localStorage.setItem(KEY, choice);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the choice still holds for this visit */
  }
  publish();
  snapshot = null;
  listeners.forEach((l) => l());
}

/** Starts following OS changes. Safe to call more than once. */
export function initMotionPref() {
  publish();
  if (osQuery) return;
  try {
    osQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    osQuery.addEventListener("change", () => {
      publish();
      snapshot = null;
      listeners.forEach((l) => l());
    });
  } catch {
    /* old browsers: the attribute set by the gate script stays */
  }
}

export function subscribeMotion(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let snapshot: MotionState | null = null;
const getSnapshot = (): MotionState => (snapshot ??= getMotionState());
const SERVER: MotionState = { reduced: false, source: "os", os: false, override: null };

export function useMotionState(): MotionState {
  return useSyncExternalStore(subscribeMotion, getSnapshot, () => SERVER);
}

export function useReducedMotion(): boolean {
  return useMotionState().reduced;
}
