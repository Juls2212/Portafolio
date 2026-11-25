"use client";

import { Component } from "react";
import type { ReactNode } from "react";
import { reportGpuFailure } from "@/lib/capabilities";
import { reportError } from "@/lib/diagnostics";

/**
 * Catches anything thrown while the WebGL canvas mounts or renders (context creation failure, shader
 * errors...). The canvas is dropped, the failure is published (the site then shows the static globe
 * fallback and the DOM keyboard) and the rest of the page keeps working: no blank or broken screen.
 */
export class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportError("webgl-canvas", error);
    reportGpuFailure(error instanceof Error ? error.message : "canvas failed to mount");
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
