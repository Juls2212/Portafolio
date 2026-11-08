import { useSyncExternalStore } from "react";
import { modules } from "@/data/modules";
import type { ModuleId } from "@/data/modules";
import { hasKeyboard } from "@/data/poses";

/**
 * Which room module dominates the viewport. One IntersectionObserver (no scroll handlers):
 * - `active` switches only when another section covers at least SWITCH_AT of the viewport.
 * - `clear` is true once the active section covers at least CLEAR_AT of it.
 * - `shown` says whether the keyboard should exist: only Stack and Projects have one. It appears
 *   once such a module clearly fills the viewport and goes away when leaving them.
 * - `layerOn` keeps the canvas layer visible a little longer when leaving downward, so the exit
 *   animation can play.
 */
const SWITCH_AT = 0.6;
const CLEAR_AT = 0.92;
const SHOW_AT = 0.9;
/** Hidden again as soon as Room (keyboard-less modules above) show this much. */
const HIDE_AT = 0.1;
/** Length of the keyboard's exit animation when leaving Projects downward. */
export const EXIT_MS = 900;

let active: ModuleId = "room";
let clear = false;
let shown = false;
let layerOn = false;
let exiting = false;
let layerTimer: ReturnType<typeof setTimeout> | null = null;
const ratios = new Map<string, number>();
const listeners = new Set<() => void>();
let observer: IntersectionObserver | null = null;

const notify = () => listeners.forEach((l) => l());

function recompute() {
  let best: string | null = null;
  let bestRatio = 0;
  ratios.forEach((ratio, id) => {
    if (ratio > bestRatio) {
      best = id;
      bestRatio = ratio;
    }
  });
  let changed = false;
  if (best && best !== active && bestRatio >= SWITCH_AT) {
    active = best as ModuleId;
    changed = true;
  }
  const nextClear = (ratios.get(active) ?? 0) >= CLEAR_AT;
  if (nextClear !== clear) {
    clear = nextClear;
    changed = true;
  }

  let upperRatio = 0;
  ratios.forEach((ratio, id) => {
    if (id === "room") upperRatio += ratio;
  });
  const nextShown =
    hasKeyboard(active) && upperRatio <= HIDE_AT && (shown || (ratios.get(active) ?? 0) >= SHOW_AT);
  if (nextShown !== shown) {
    const leavingDown = shown && !nextShown && (active === "experience" || active === "contact");
    shown = nextShown;
    changed = true;
    if (layerTimer) clearTimeout(layerTimer);
    layerTimer = null;
    if (shown) {
      layerOn = true;
      exiting = false;
    } else if (leavingDown) {
      // Keep the layer up while the exit animation plays, then hide it.
      exiting = true;
      layerTimer = setTimeout(() => {
        layerOn = false;
        exiting = false;
        layerTimer = null;
        notify();
      }, EXIT_MS);
    } else {
      layerOn = false;
      exiting = false;
    }
  }
  if (changed) notify();
}

function start() {
  const thresholds = Array.from({ length: 51 }, (_, i) => i / 50);
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const covered = entry.isIntersecting ? entry.intersectionRect.height / window.innerHeight : 0;
        ratios.set(entry.target.id, Math.min(1, covered));
      }
      recompute();
    },
    { threshold: thresholds },
  );
  modules.forEach((m) => {
    const el = document.getElementById(m.id);
    if (el) observer?.observe(el);
  });
}

export function subscribeActiveModule(listener: () => void) {
  if (listeners.size === 0) start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}

export const getActiveModule = (): ModuleId => active;
export const getModuleClear = (): boolean => clear;
export const getBoardShown = (): boolean => shown;
/** True while the exit animation of a downward departure is running. */
export const getBoardExiting = (): boolean => exiting;
export const getLayerOn = (): boolean => layerOn;

export function useActiveModule(): ModuleId {
  return useSyncExternalStore(subscribeActiveModule, getActiveModule, () => "room" as ModuleId);
}

/** True when the active module's section (almost) fills the viewport. */
export function useModuleClear(): boolean {
  return useSyncExternalStore(subscribeActiveModule, getModuleClear, () => false);
}

/** True while the keyboard layer is on screen (including the exit animation). */
export function useLayerOn(): boolean {
  return useSyncExternalStore(subscribeActiveModule, getLayerOn, () => false);
}
