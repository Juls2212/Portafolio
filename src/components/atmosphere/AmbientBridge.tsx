"use client";

import { useEffect } from "react";
import { startAmbient } from "@/lib/ambient";

/** Starts the shared pointer/scroll listener once. Renders nothing. */
export function AmbientBridge() {
  useEffect(() => startAmbient(), []);
  return null;
}
