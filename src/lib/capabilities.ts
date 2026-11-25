import { useSyncExternalStore } from "react";
import { getMotionState, initMotionPref, subscribeMotion } from "@/lib/motion-pref";

/**
 * What this browser can do, and which mode each animated piece runs in. Hints only ever lower the
 * quality; nothing switches the whole experience off except what truly cannot work (no WebGL, or the
 * user's reduced-motion choice). Published on <html> as data-quality / data-globe-mode /
 * data-keyboard-mode / data-bg-mode so CSS and the diagnostics overlay can read it.
 */
export interface GpuInfo {
  /** 0 = unavailable. */
  webgl: 0 | 1 | 2;
  reason: string | null;
  renderer: string | null;
  vendor: string | null;
  /** Software rasteriser (SwiftShader, llvmpipe, ...) or a browser-reported major performance caveat. */
  software: boolean;
  perfCaveat: boolean;
}

export type Quality = "full" | "light";
export interface Modes {
  quality: Quality;
  /** full / light: animated; still: one calm frame (reduced motion); fallback: static SVG (no WebGL). */
  globe: "full" | "light" | "still" | "fallback";
  keyboard: "3d" | "dom";
  keyboardWhy: string;
  background: "full" | "light" | "still";
  /** WebGL is usable right now (detected and not lost). */
  webgl: boolean;
}

const SOFTWARE_RE = /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render|microsoft basic/i;
const NO_GPU: GpuInfo = { webgl: 0, reason: "not detected yet", renderer: null, vendor: null, software: false, perfCaveat: false };

let gpu: GpuInfo | null = null;
let failure: string | null = null;
const listeners = new Set<() => void>();
let cached: Modes | null = null;

type Probe = { gl: WebGLRenderingContext | WebGL2RenderingContext | null; error: string | null };
function probe(kind: "webgl2" | "webgl", attrs?: WebGLContextAttributes): Probe {
  try {
    const canvas = document.createElement("canvas");
    return { gl: canvas.getContext(kind, attrs) as Probe["gl"], error: null };
  } catch (e) {
    return { gl: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Robust WebGL detection: webgl2 then webgl, strict then forgiving, never throws. Cached. */
export function detectGpu(): GpuInfo {
  if (gpu) return gpu;
  if (typeof document === "undefined") return NO_GPU;
  let version: 0 | 1 | 2 = 0;
  let caveat = false;
  let error: string | null = null;
  let found: Probe["gl"] = null;

  const strict = { failIfMajorPerformanceCaveat: true };
  for (const [kind, attrs, caveated] of [
    ["webgl2", strict, false],
    ["webgl", strict, false],
    ["webgl2", undefined, true],
    ["webgl", undefined, true],
  ] as const) {
    const r = probe(kind, attrs);
    error ??= r.error;
    if (r.gl) {
      found = r.gl;
      version = kind === "webgl2" ? 2 : 1;
      caveat = caveated;
      break;
    }
  }

  let renderer: string | null = null;
  let vendor: string | null = null;
  if (found) {
    try {
      const ext = found.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        renderer = String(found.getParameter(ext.UNMASKED_RENDERER_WEBGL));
        vendor = String(found.getParameter(ext.UNMASKED_VENDOR_WEBGL));
      } else {
        renderer = String(found.getParameter(found.RENDERER));
        vendor = String(found.getParameter(found.VENDOR));
      }
    } catch {
      /* renderer string is optional */
    }
    try {
      found.getExtension("WEBGL_lose_context")?.loseContext(); // free the probe context
    } catch {
      /* ignore */
    }
  }

  gpu = {
    webgl: version,
    reason: version ? null : (error ?? "getContext returned null (WebGL disabled, blocklisted GPU or no GPU)"),
    renderer,
    vendor,
    software: caveat || SOFTWARE_RE.test(`${renderer ?? ""} ${vendor ?? ""}`),
    perfCaveat: caveat,
  };
  return gpu;
}

function hints() {
  const nav = typeof navigator === "undefined" ? null : (navigator as Navigator & { deviceMemory?: number });
  return { cores: nav?.hardwareConcurrency ?? null, memory: nav?.deviceMemory ?? null };
}

/** Points for the globe: hints reduce quality, they never disable it. */
export function globePointCount(quality: Quality): number {
  const { cores, memory } = hints();
  if (quality === "light") return 3000;
  const small = typeof window !== "undefined" && window.innerWidth < 768;
  return small || (cores ?? 8) <= 4 || (memory ?? 8) <= 4 ? 4000 : 10000;
}

function compute(): Modes {
  const g = detectGpu();
  const { cores, memory } = hints();
  const reduced = getMotionState().reduced;
  const webgl = g.webgl > 0 && failure === null;
  const quality: Quality = g.software || (cores !== null && cores <= 2) || (memory !== null && memory <= 2) ? "light" : "full";
  const wide = typeof window !== "undefined" && window.innerWidth >= 768;
  const keyboard: Modes["keyboard"] = webgl && wide && !reduced ? "3d" : "dom";
  const keyboardWhy = !webgl ? (failure ?? g.reason ?? "no WebGL") : !wide ? "viewport < 768px" : reduced ? "reduced motion" : "ok";
  return {
    quality,
    globe: !webgl ? "fallback" : reduced ? "still" : quality,
    keyboard,
    keyboardWhy,
    background: reduced ? "still" : quality === "light" ? "light" : "full",
    webgl,
  };
}

const SERVER: Modes = { quality: "full", globe: "fallback", keyboard: "dom", keyboardWhy: "server", background: "still", webgl: false };

function publish(m: Modes) {
  const el = document.documentElement;
  el.dataset.quality = m.quality;
  el.dataset.globeMode = m.globe;
  el.dataset.keyboardMode = m.keyboard;
  el.dataset.bgMode = m.background;
  el.dataset.webgl = m.webgl ? "1" : "0";
}

function refresh() {
  const next = compute();
  if (cached && JSON.stringify(cached) === JSON.stringify(next)) return;
  cached = next;
  publish(next);
  listeners.forEach((l) => l());
}

let started = false;
/** Detects, publishes, and keeps modes current (motion choice, viewport width). Idempotent. */
export function initCapabilities() {
  initMotionPref();
  if (started) {
    refresh();
    return;
  }
  started = true;
  refresh();
  subscribeMotion(refresh);
  try {
    window.matchMedia("(min-width: 768px)").addEventListener("change", refresh);
  } catch {
    /* ignore */
  }
}

/** A GL failure after mount (context lost, init error): the site falls back without a blank screen. */
export function reportGpuFailure(reason: string) {
  if (failure === reason) return;
  failure = reason;
  refresh();
}
export function clearGpuFailure() {
  if (failure === null) return;
  failure = null;
  refresh();
}
export const getGpuFailure = () => failure;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function getSnapshot(): Modes {
  if (!cached) {
    cached = compute();
    publish(cached);
  }
  return cached;
}

/** Imperative access (render loops, one-off decisions at mount). */
export const getModes = (): Modes => getSnapshot();

export function useCapabilities(): Modes {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER);
}

/** Everything the diagnostics overlay prints, gathered on demand. */
export function collectReport() {
  const g = detectGpu();
  const m = getSnapshot();
  const motion = getMotionState();
  const { cores, memory } = hints();
  const el = document.documentElement;
  const mq = (q: string) => {
    try {
      return window.matchMedia(q).matches;
    } catch {
      return null;
    }
  };
  const uaData = (navigator as Navigator & { userAgentData?: { brands?: { brand: string; version: string }[]; platform?: string } }).userAgentData;
  return {
    userAgent: navigator.userAgent,
    browserBrands: uaData?.brands?.map((b) => `${b.brand} ${b.version}`) ?? null,
    platform: uaData?.platform ?? navigator.platform ?? null,
    language: navigator.language,
    reducedMotion: { os: motion.os, siteOverride: motion.override, effective: motion.reduced, source: motion.source },
    webgl: { version: g.webgl, failureReason: failure ?? g.reason, renderer: g.renderer, vendor: g.vendor, software: g.software, performanceCaveat: g.perfCaveat, lostOrFailedAtRuntime: failure },
    dpr: window.devicePixelRatio,
    cores,
    memoryGB: memory,
    pointer: { fine: mq("(pointer: fine)"), coarse: mq("(pointer: coarse)"), hover: mq("(hover: hover)") },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    modes: {
      quality: m.quality,
      intro: el.dataset.introMode ?? "unknown",
      globe: m.globe,
      keyboard: `${m.keyboard} (${m.keyboardWhy})`,
      background: m.background,
    },
    cssSupports: {
      colorMix: CSS.supports("color", "color-mix(in oklab, red 50%, blue)"),
      has: CSS.supports("selector(:has(a))"),
      property: typeof CSS.registerProperty === "function",
      clipPathPolygon: CSS.supports("clip-path", "polygon(0 0, 100% 0, 100% 100%)"),
      svh: CSS.supports("height", "100svh"),
      containerQueries: CSS.supports("container-type", "inline-size"),
    },
  };
}
