"use client";

import { useEffect, useRef } from "react";
import { readToken } from "@/lib/tokens";

const MAX_DPR = 1.5;
const FRAME_MS = 50; // ~20 fps
const CELL = 20;
const TRAIL = 12;

/** Deterministic glyph per cell/time step. */
function glyph(col: number, row: number, step: number): string {
  const h = Math.imul((col * 73856093) ^ (row * 19349663) ^ (step * 83492791), 2654435761);
  return (h >>> 16) & 1 ? "1" : "0";
}

/**
 * Very faint 1/0 rain behind the Contact module. It runs only while its section is on screen
 * (IntersectionObserver), at ~20 fps, DPR <= 1.5, and not at all under reduced motion.
 */
export function CodeRain() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const color = readToken("--color-neon");
    const font = readToken("--font-mono") || "monospace";
    let width = 0;
    let height = 0;
    let cols = 0;
    let speeds: number[] = [];
    let offsets: number[] = [];
    let frame = 0;
    let last = 0;
    let running = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${CELL - 6}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      cols = Math.ceil(width / CELL);
      speeds = Array.from({ length: cols }, () => 3 + Math.random() * 6);
      offsets = Array.from({ length: cols }, () => Math.random() * 100);
    };

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - last < FRAME_MS) return;
      last = now;
      const t = now / 1000;
      const rows = Math.ceil(height / CELL);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      for (let c = 0; c < cols; c++) {
        const head = (t * speeds[c]! + offsets[c]!) % (rows + TRAIL + 8);
        const headRow = Math.floor(head);
        for (let k = 0; k < TRAIL; k++) {
          const row = headRow - k;
          if (row < 0 || row >= rows) continue;
          ctx.globalAlpha = 0.14 * (1 - k / TRAIL) ** 1.6;
          ctx.fillText(glyph(c, row, Math.floor(t * 4)), c * CELL + CELL / 2, row * CELL + CELL / 2);
        }
      }
      ctx.globalAlpha = 1;
    };

    const start = () => {
      if (running) return;
      running = true;
      resize();
      frame = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) start();
      else stop();
    });
    observer.observe(parent);
    const onResize = () => running && resize();
    window.addEventListener("resize", onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      stop();
    };
  }, []);

  return <canvas ref={ref} className="code-rain" aria-hidden="true" />;
}
