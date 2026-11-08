import { useSyncExternalStore } from "react";
import { keyboardActions, keyboardApi } from "@/lib/keyboard-store";

/**
 * Two modes: HOME (the room with the carousel, no page scroll) and EXPLORE (Stack, Projects,
 * Experience, Contact). The only way from HOME to EXPLORE is the "Empecemos" button (or a deep link).
 * The real switch is CSS on <html data-mode>; this store drives it and the short transition.
 */
export type SiteMode = "home" | "explore";
type Phase = "idle" | "enter-out" | "enter-in" | "exit-out" | "exit-in";

const ENTER_OUT_MS = 650;
const ENTER_IN_MS = 500;
const EXIT_OUT_MS = 450;
const EXIT_IN_MS = 600;
export const MODULE_HASH = /^#(stack|projects|experience|contact)$/;

let mode: SiteMode | null = null;
let phase: Phase = "idle";
let resetCount = 0;
let canvasWanted = false;
const listeners = new Set<() => void>();
const timers: ReturnType<typeof setTimeout>[] = [];

const notify = () => listeners.forEach((l) => l());
const root = () => document.documentElement;
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function getMode(): SiteMode {
  if (mode === null) {
    mode = root().dataset.mode === "explore" ? "explore" : "home";
    if (mode === "explore") canvasWanted = true;
  }
  return mode;
}

function apply() {
  const el = root();
  el.dataset.mode = getMode();
  if (phase === "idle") delete el.dataset.phase;
  else el.dataset.phase = phase;
}

function setPhase(next: Phase) {
  phase = next;
  apply();
  notify();
}

function later(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms));
}

function flash(kind: "enter" | "exit") {
  root().dataset.flash = kind;
  later(() => delete root().dataset.flash, 1200);
}

function switchTo(next: SiteMode) {
  mode = next;
  if (next === "explore") canvasWanted = true;
  else {
    // Back to start: nothing selected, keyboard lowered, gallery and carousel reset.
    keyboardActions.reset();
    keyboardApi.lowerAll();
    resetCount += 1;
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  apply();
  window.scrollTo({ top: 0, behavior: "instant" });
  notify();
}

const focusStackHeading = () =>
  requestAnimationFrame(() => document.getElementById("stack-title")?.focus({ preventScroll: true }));
/** The carousel and the accordion both hold an "Empecemos" button; focus the one that is on screen. */
const focusStartButton = () =>
  requestAnimationFrame(() => {
    const visible = [...document.querySelectorAll<HTMLElement>("[data-start-button]")].find(
      (el) => el.getClientRects().length > 0,
    );
    visible?.focus({ preventScroll: true });
  });

export function enterExplore() {
  if (getMode() === "explore" || phase !== "idle") return;
  canvasWanted = true;
  if (reduced()) {
    switchTo("explore");
    focusStackHeading();
    return;
  }
  flash("enter");
  setPhase("enter-out");
  later(() => {
    switchTo("explore");
    setPhase("enter-in");
    focusStackHeading();
    later(() => setPhase("idle"), ENTER_IN_MS);
  }, ENTER_OUT_MS);
}

export function backToHome() {
  if (getMode() === "home" || phase !== "idle") return;
  if (reduced()) {
    switchTo("home");
    focusStartButton();
    return;
  }
  flash("exit");
  setPhase("exit-out");
  later(() => {
    switchTo("home");
    setPhase("exit-in");
    focusStartButton();
    later(() => setPhase("idle"), EXIT_IN_MS);
  }, EXIT_OUT_MS);
}

/** A hash pointing at a module opens EXPLORE directly, with no gate transition. */
export function openFromHash(hash: string) {
  if (!MODULE_HASH.test(hash) || getMode() === "explore") return false;
  switchTo("explore");
  document.querySelector(hash)?.scrollIntoView({ block: "start" });
  return true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSiteMode(): SiteMode {
  return useSyncExternalStore(subscribe, getMode, () => "home" as SiteMode);
}

/** Increments each time the site returns to HOME: components key on it to reset their state. */
export function useResetCount(): number {
  return useSyncExternalStore(subscribe, () => resetCount, () => 0);
}

/** True from the start of the enter transition on: the keyboard canvas is mounted from then. */
export function useCanvasWanted(): boolean {
  return useSyncExternalStore(subscribe, () => canvasWanted || getMode() === "explore", () => false);
}
