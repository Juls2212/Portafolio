"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/i18n/language-context";
import { finishIntro, useIntroDone } from "@/lib/intro-store";

const DURATION_MS = 2000;
const MAX_DPR = 1.5;
const TRAIL_CELLS = 14;

interface Column {
  delay: number;
  speed: number;
}

/** Deterministic glyph per cell and time step so glyphs flicker without Math.random per frame. */
function glyph(col: number, row: number, step: number): string {
  const h = Math.imul(col * 73856093 ^ row * 19349663 ^ step * 83492791, 2654435761);
  return (h >>> 16) & 1 ? "1" : "0";
}

function readToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Full-screen rain of 1s and 0s that uncovers the room column by column.
 * It plays only when <html data-intro="on"> was set by the inline gate script,
 * and unmounts itself when finished or skipped.
 */
export function MatrixRain() {
  const t = useT();
  const done = useIntroDone();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const gate = root.dataset.intro;
    if ((gate !== "on" && gate !== "playing") || !canvas || !ctx) {
      finishIntro();
      return;
    }

    const colors = {
      cover: readToken("--color-abyss"),
      head: readToken("--color-ink"),
      hi: readToken("--color-neon-hi"),
      trail: readToken("--color-neon"),
    };
    const font = readToken("--font-mono") || "monospace";

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = width < 640 ? 14 : 18;
    const cols = Math.ceil(width / cell);
    const travel = height + (TRAIL_CELLS + 1) * cell;
    const columns: Column[] = Array.from({ length: cols }, () => {
      const delay = Math.random() * DURATION_MS * 0.4;
      return { delay, speed: travel / (DURATION_MS - delay - 60) };
    });

    ctx.font = `${cell - 3}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let frame = 0;
    let start = 0;
    let finished = false;

    const end = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      removeListeners();
      finishIntro();
    };

    const draw = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      if (elapsed >= DURATION_MS) {
        end();
        return;
      }
      ctx.clearRect(0, 0, width, height);
      const step = Math.floor(elapsed / 90);

      for (let c = 0; c < cols; c++) {
        const col = columns[c];
        if (!col) continue;
        const x = c * cell;
        const headY = (elapsed - col.delay) * col.speed;
        // Cover everything below the head; above it the room is already revealed.
        const coverTop = elapsed < col.delay ? 0 : Math.max(0, headY);
        if (coverTop < height) {
          ctx.fillStyle = colors.cover;
          ctx.fillRect(x, coverTop, cell + 1, height - coverTop);
        }
        if (elapsed < col.delay) continue;

        const headRow = Math.floor(headY / cell);
        for (let k = 0; k <= TRAIL_CELLS; k++) {
          const row = headRow - k;
          if (row < 0 || row * cell > height) continue;
          const cy = row * cell + cell / 2;
          if (k === 0) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = colors.head;
          } else {
            ctx.globalAlpha = Math.pow(1 - k / (TRAIL_CELLS + 1), 1.5);
            ctx.fillStyle = k < 3 ? colors.hi : colors.trail;
          }
          ctx.fillText(glyph(c, row, step), x + cell / 2, cy);
        }
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    const skip = () => end();
    const events = ["keydown", "pointerdown", "wheel", "touchstart"] as const;
    function removeListeners() {
      events.forEach((e) => window.removeEventListener(e, skip));
    }
    events.forEach((e) => window.addEventListener(e, skip, { passive: true }));

    // Paint the opaque cover first, then let the room exist underneath it.
    ctx.fillStyle = colors.cover;
    ctx.fillRect(0, 0, width, height);
    root.dataset.intro = "playing";
    frame = requestAnimationFrame(draw);

    return () => {
      finished = true;
      cancelAnimationFrame(frame);
      removeListeners();
    };
  }, []);

  if (done) return null;

  return (
    <div className="matrix-layer" aria-hidden="true">
      <canvas ref={canvasRef} className="matrix-canvas" />
      <p className="matrix-hint">{t.intro.skipHint}</p>
    </div>
  );
}
