"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useKeyboardMode } from "@/hooks/useKeyboardMode";
import { useLayerOn } from "@/lib/active-module";
import { useIntroDone } from "@/lib/intro-store";
import { useCanvasWanted } from "@/lib/site-mode";

/** WebGL code is its own chunk and never runs on the server. */
const KeyboardScene = dynamic(() => import("./KeyboardScene"), { ssr: false });

/**
 * The one fixed canvas behind the page. It mounts when EXPLORE begins (after the intro, 3D mode only).
 * It exists visually only in Stack and Projects: it fades out everywhere else (after its exit
 * animation when leaving Projects downward), and while hidden it requests no frames.
 */
export function KeyboardLayer() {
  const introDone = useIntroDone();
  const mode = useKeyboardMode();
  const on = useLayerOn();
  const wanted = useCanvasWanted();
  const ready = introDone && mode === "3d";

  // While idle in HOME, fetch the WebGL chunk so entering EXPLORE does not stall.
  useEffect(() => {
    if (!ready || wanted) return;
    const load = () => void import("./KeyboardScene");
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(load);
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(load, 800);
    return () => clearTimeout(id);
  }, [ready, wanted]);

  // The canvas mounts when the enter transition starts (or on a deep link) and stays mounted.
  if (!ready || !wanted) return null;
  return (
    <div className="keyboard-layer" data-visible={on} aria-hidden="true">
      <KeyboardScene />
    </div>
  );
}
