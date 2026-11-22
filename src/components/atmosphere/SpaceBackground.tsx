"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { getActiveModule, subscribeActiveModule } from "@/lib/active-module";
import { pointer, subscribePointer, subscribeScroll } from "@/lib/ambient";
import { createField, drawField } from "@/lib/space-field";
import { getSiteMode, subscribeSiteMode } from "@/lib/site-mode";
import { readToken } from "@/lib/tokens";

const MAX_DPR = 1.5;
/** Text blocks that keep the starfield out from behind them. */
const TEXT_BLOCKS = ".stack__head, .projects__head, .exp-head__titles, .experience__sub, .contact__col, .project__body";
const PAD = 14;
/** While scrolling, redraw at most this often (about every other frame); a full redraw follows when it stops. */
const SCROLL_DRAW_MS = 30;
const SCROLL_SETTLE_MS = 160;
const TWEEN_MS = 700;

/** Deterministic circuit traces (orthogonal runs with 45-degree chamfers) for the Stack backdrop. */
const TRACES = (() => {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const out: { d: string; end: [number, number] }[] = [];
  for (let i = 0; i < 16; i++) {
    let x = Math.round(rand() * 12) * 100;
    let y = Math.round(rand() * 8) * 100;
    let d = `M${x} ${y}`;
    let horizontal = rand() < 0.5;
    const segments = 3 + Math.floor(rand() * 3);
    for (let s = 0; s < segments; s++) {
      const len = (1 + Math.floor(rand() * 3)) * 100 * (rand() < 0.5 ? -1 : 1);
      const chamfer = 28 * (rand() < 0.5 ? 1 : -1);
      const run = len - Math.sign(len) * 28;
      if (horizontal) {
        d += ` L${x + run} ${y} L${x + len} ${y + chamfer}`;
        x += len;
        y += chamfer;
      } else {
        d += ` L${x} ${y + run} L${x + chamfer} ${y + len}`;
        y += len;
        x += chamfer;
      }
      horizontal = !horizontal;
    }
    out.push({ d, end: [x, y] });
  }
  return out;
})();

/**
 * EXPLORE-only background (HOME hides it with CSS): a 2D starfield with faint constellations, a
 * static perspective floor, and per-module layers (circuit traces for Stack, an accent glow for
 * Projects). The canvas is drawn only when something changes (scroll, pointer, resize, module
 * change), never in a continuous loop. DPR is capped at 1.5; mobile gets fewer stars.
 */
export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const mobile = window.innerWidth < 768;
    const field = createField(mobile ? 100 : 250);
    canvas.dataset.stars = String(field.stars.length); // diagnostic
    const colors = [readToken("--color-neon-hi"), readToken("--color-teal"), readToken("--color-lime")] as const;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let density = getActiveModule() === "experience" ? 1 : 0;
    let densityFrom = density;
    let densityTo = density;
    let tweenStart = 0;
    let frame = 0;
    let tween = 0;
    let dirty = true;
    let scrolling = false;
    let lastDraw = 0;
    let settleTimer = 0;
    /** Text-block rects in document coordinates, measured on resize / settle (no layout reads per frame). */
    let docRects: { x: number; y: number; w: number; h: number }[] = [];

    const measure = () => {
      const sy = window.scrollY;
      docRects = [...document.querySelectorAll<HTMLElement>(TEXT_BLOCKS)]
        .filter((el) => !el.closest("[inert]"))
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0)
        .map((r) => ({ x: r.left - PAD, y: r.top + sy - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 }));
    };

    const active = () => getSiteMode() === "explore" && !document.hidden;

    const render = (now = performance.now()) => {
      frame = 0;
      if (!active() || !dirty) return;
      if (scrolling && now - lastDraw < SCROLL_DRAW_MS) {
        frame = requestAnimationFrame(render);
        return;
      }
      dirty = false;
      lastDraw = now;
      const sy = window.scrollY;
      const exclude = docRects
        .map((r) => ({ x: r.x, y: r.y - sy, w: r.w, h: r.h }))
        .filter((r) => r.y + r.h > 0 && r.y < height);
      drawField(ctx, field, {
        exclude,
        width,
        height,
        dpr,
        scrollY: window.scrollY,
        nx: pointer.active ? pointer.nx : 0,
        ny: pointer.active ? pointer.ny : 0,
        density,
        colors,
      });
    };
    const invalidate = () => {
      dirty = true;
      if (!frame && active()) frame = requestAnimationFrame(render);
    };
    const onScroll = () => {
      scrolling = true;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        scrolling = false;
        measure();
        invalidate();
      }, SCROLL_SETTLE_MS);
      invalidate();
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      measure();
      invalidate();
    };

    // Short tween of the constellation density when the active module changes (event-driven).
    const runTween = (now: number) => {
      const t = Math.min(1, (now - tweenStart) / TWEEN_MS);
      density = densityFrom + (densityTo - densityFrom) * t;
      dirty = true;
      render();
      tween = t < 1 ? requestAnimationFrame(runTween) : 0;
    };
    const onModule = () => {
      const target = getActiveModule() === "experience" ? 1 : 0;
      if (target === densityTo) return;
      densityFrom = density;
      densityTo = target;
      tweenStart = performance.now();
      if (!tween && active()) tween = requestAnimationFrame(runTween);
      else if (!active()) {
        density = target;
        invalidate();
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", invalidate);
    const offPointer = subscribePointer(invalidate);
    const offScroll = subscribeScroll(onScroll);
    // Entering EXPLORE: the sections only exist now, so measure them (and again once reveals settle).
    const offMode = subscribeSiteMode(() => {
      measure();
      invalidate();
      window.setTimeout(() => {
        measure();
        invalidate();
      }, 900);
    });
    const offModule = subscribeActiveModule(onModule);
    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", invalidate);
      offPointer();
      offScroll();
      offMode();
      offModule();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(tween);
      window.clearTimeout(settleTimer);
    };
  }, []);

  return (
    <div className="space-bg" aria-hidden="true">
      <div className="space-bg__glow" />
      <svg className="space-bg__circuit" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <g className="circuit__traces">
          {TRACES.map((t, i) => (
            <path key={i} d={t.d} />
          ))}
          {TRACES.map((t, i) => (
            <circle key={`n${i}`} cx={t.end[0]} cy={t.end[1]} r="4" />
          ))}
        </g>
        <g className="circuit__pulses">
          {TRACES.map((t, i) => (
            <path key={i} d={t.d} pathLength={100} style={{ "--k": i } as CSSProperties} />
          ))}
        </g>
      </svg>
      <div className="space-bg__floor">
        <div className="space-bg__plane" />
      </div>
      <canvas ref={canvasRef} className="space-bg__canvas" />
      <div className="space-bg__twinkle" />
    </div>
  );
}
