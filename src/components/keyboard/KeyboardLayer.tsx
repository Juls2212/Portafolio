"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useKeyboardMode, useWebGL } from "@/hooks/useKeyboardMode";
import { useLayerOn } from "@/lib/active-module";
import { useIntroDone } from "@/lib/intro-store";
import { useGlobeVisible } from "@/lib/globe-store";

/** WebGL code is its own chunk and never runs on the server. */
const KeyboardScene = dynamic(() => import("./KeyboardScene"), { ssr: false });

/**
 * The one fixed canvas behind the page. It mounts after the intro when WebGL is available.
 * Visually it exists in HOME (globe) and in Stack / Projects (keyboard, 3D mode only): it fades out
 * everywhere else, and while hidden it requests no frames.
 */
export function KeyboardLayer() {
  const introDone = useIntroDone();
  const mode = useKeyboardMode();
  const on = useLayerOn();
  const webgl = useWebGL();
  const globeVisible = useGlobeVisible();
  const keyboard = mode === "3d";
  const ready = introDone && webgl;

  // Fetch the WebGL chunk as soon as the page is idle (the HOME globe needs it right after the intro).
  useEffect(() => {
    if (!webgl) return;
    const load = () => void import("./KeyboardScene");
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(load);
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [webgl]);

  // The canvas mounts after the intro and stays mounted: HOME shows the globe, Stack/Projects the keyboard.
  if (!ready) return null;
  return (
    <div className="keyboard-layer" data-visible={(keyboard && on) || globeVisible} aria-hidden="true">
      <KeyboardScene keyboard={keyboard} />
    </div>
  );
}
