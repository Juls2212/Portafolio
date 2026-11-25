"use client";

import { useEffect } from "react";
import { startAmbient } from "@/lib/ambient";
import { initCapabilities } from "@/lib/capabilities";

/** Detects capabilities (WebGL, motion, hints) and starts the shared listener once. Renders nothing. */
export function AmbientBridge() {
  useEffect(() => {
    initCapabilities();
    return startAmbient();
  }, []);
  return null;
}
