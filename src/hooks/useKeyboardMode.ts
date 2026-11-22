import { useSyncExternalStore } from "react";

/**
 * "3d": desktop width, motion allowed and WebGL available.
 * "dom": everything else (mobile, reduced motion, no WebGL, server render).
 */
export type KeyboardMode = "3d" | "dom";

const QUERIES = ["(min-width: 768px)", "(prefers-reduced-motion: no-preference)"] as const;

let webgl: boolean | null = null;
export function hasWebGL(): boolean {
  if (webgl === null) {
    // The gate script already probed WebGL before first paint.
    const flag = document.documentElement.dataset.webgl;
    if (flag) webgl = flag === "1";
  }
  if (webgl === null) {
    try {
      const canvas = document.createElement("canvas");
      webgl = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

function subscribe(listener: () => void) {
  const lists = QUERIES.map((q) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener("change", listener));
  return () => lists.forEach((l) => l.removeEventListener("change", listener));
}

function getSnapshot(): KeyboardMode {
  return QUERIES.every((q) => window.matchMedia(q).matches) && hasWebGL() ? "3d" : "dom";
}

export function useKeyboardMode(): KeyboardMode {
  return useSyncExternalStore(subscribe, getSnapshot, () => "dom" as KeyboardMode);
}

const noop = () => () => {};

/** True when WebGL is available (false on the server and for the first client render). */
export function useWebGL(): boolean {
  return useSyncExternalStore(noop, hasWebGL, () => false);
}
