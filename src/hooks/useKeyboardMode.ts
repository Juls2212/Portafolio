import { useSyncExternalStore } from "react";

/**
 * "3d": desktop width, motion allowed and WebGL available.
 * "dom": everything else (mobile, reduced motion, no WebGL, server render).
 */
export type KeyboardMode = "3d" | "dom";

const QUERIES = ["(min-width: 768px)", "(prefers-reduced-motion: no-preference)"] as const;

let webgl: boolean | null = null;
function hasWebGL(): boolean {
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
