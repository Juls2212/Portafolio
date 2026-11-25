import { useCapabilities } from "@/lib/capabilities";

/**
 * "3d": desktop width, WebGL usable and motion not reduced.
 * "dom": everything else (mobile, reduced motion, no WebGL or lost context, server render).
 * The decision (and the reason) lives in src/lib/capabilities.ts.
 */
export type KeyboardMode = "3d" | "dom";

export function useKeyboardMode(): KeyboardMode {
  return useCapabilities().keyboard;
}

/** True when WebGL is usable right now (false on the server and for the first client render). */
export function useWebGL(): boolean {
  return useCapabilities().webgl;
}
