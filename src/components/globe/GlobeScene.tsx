"use client";

/* eslint-disable react-hooks/immutability --
   Imperative three.js code: the render loop mutates GPU-bound objects (uniforms, transforms) that
   were created once with useMemo. That is the intended react-three-fiber pattern, not React state. */

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import type { PerspectiveCamera } from "three";
import { PANEL_SELECTOR, subscribePointer, pointer } from "@/lib/ambient";
import { GLOBE_LABEL_COUNT, getGlobeLabels, setGlobeVisible } from "@/lib/globe-store";
import { DURATION, EASE, bezier } from "@/lib/motion";
import { getSiteMode, getSitePhase, subscribeSiteMode } from "@/lib/site-mode";
import { readToken } from "@/lib/tokens";

const CAM_Z = 16;
const NODE_COUNT = 24;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const FRAME_MS = 1000 / 45;
const AUTO_SPIN = 0.11; // rad / s
const BASE_TILT = 0.38;
const DRAG_SENSITIVITY = 0.0065;
/** Horizontal room a label needs beside its node (leader line + text box), px. */
const LABEL_REACH = 240;
/** The three nodes that carry DOM labels (lat, lon in degrees), well apart so one is usually visible. */
const LABEL_NODES: readonly [number, number][] = [
  [38, 24],
  [-6, 146],
  [-38, 262],
];
const NO_DRAG = "button, a, input, textarea, select, summary, [data-no-drag], .cpanel[data-slot='center'], .acc";

const ease = bezier(EASE.out);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const VERT = /* glsl */ `
uniform float uTime;
uniform float uBurst;
uniform float uSize;
uniform float uPx;
uniform float uCam;
uniform float uR;
uniform float uAspect;
uniform float uPtrOn;
uniform float uHot;
uniform float uDim;
uniform float uPanelDim;
uniform vec2 uPointer;
uniform vec2 uPanel;
uniform vec3 uTeal;
uniform vec3 uNeon;
uniform vec3 uNeonHi;
uniform vec3 uLime;
attribute float aSeed;
#ifdef NODE
attribute float aId;
#endif
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 p = position;
  vec3 n = normalize(p);

  // Burst: every point flies outward along its own jittered direction.
  vec3 jitter = vec3(fract(aSeed * 91.7), fract(aSeed * 53.3), fract(aSeed * 17.9)) - 0.5;
  vec3 dir = normalize(n + jitter * 1.3);
  p += dir * uBurst * (1.2 + aSeed * 4.5);

  vec4 wp = modelMatrix * vec4(p, 1.0);

  // Pointer repulsion, measured in screen space on the front hemisphere only.
  vec4 c0 = projectionMatrix * viewMatrix * wp;
  vec2 ndc = c0.xy / c0.w;
  vec3 wn = normalize(mat3(modelMatrix) * n);
  float front = smoothstep(-0.15, 0.4, wn.z);
  vec2 d = (ndc - uPointer) * vec2(uAspect, 1.0);
  float dist = length(d);
  float f = (1.0 - smoothstep(0.0, 0.34, dist)) * uPtrOn * front;
  vec2 away = d / max(dist, 0.0001);
  wp.xy += vec2(away.x / uAspect, away.y) * f * 0.5;
  wp.xyz -= wn * f * 0.12 * uR * 0.3;

  vec4 mv = viewMatrix * wp;
  gl_Position = projectionMatrix * mv;

  // Depth colouring: near = lime/neon, far = teal.
  float dep = clamp((-mv.z - (uCam - uR)) / (2.0 * uR), 0.0, 1.0);
  vec3 col = mix(uLime, uNeon, smoothstep(0.0, 0.45, dep));
  col = mix(col, uTeal, smoothstep(0.4, 1.0, dep));
  col = mix(col, uNeonHi, step(0.93, fract(aSeed * 7.31)) * 0.7);

  float pulse = f * (0.6 + 0.4 * sin(uTime * 9.0 + aSeed * 40.0));
  float alpha = (1.0 - 0.62 * dep) * (0.7 + 0.5 * fract(aSeed * 7.0));
  alpha *= 1.0 + f * 1.2;
  float size = uSize * (1.0 + f * 1.4 + pulse * 0.6);

#ifdef NODE
  float hot = 1.0 - step(0.5, abs(aId - uHot));
  float beat = 0.5 + 0.5 * sin(uTime * 1.8 + aId * 1.7);
  alpha = (1.0 - 0.55 * dep) * (0.75 + 0.25 * beat);
  size = uSize * (1.0 + 0.3 * beat + hot * 1.1 + f * 0.8);
  col = mix(col, vec3(1.0), 0.28 + hot * 0.45);
#endif

  float inPanel = (1.0 - smoothstep(uPanel.x - 0.06, uPanel.x + 0.06, abs(ndc.x)))
                * (1.0 - smoothstep(uPanel.y - 0.06, uPanel.y + 0.08, abs(ndc.y)));
  alpha *= uDim * (1.0 - inPanel * (1.0 - uPanelDim));
  alpha *= 1.0 - smoothstep(0.05, 0.85, uBurst);

  vColor = col;
  vAlpha = alpha;
  gl_PointSize = size * uPx * (uCam / -mv.z);
}
`;

const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
#ifdef NODE
  float a = smoothstep(0.5, 0.0, r) * 0.55 + smoothstep(0.2, 0.0, r);
#else
  float a = smoothstep(0.5, 0.05, r);
#endif
  gl_FragColor = vec4(vColor, vAlpha * a);
  #include <colorspace_fragment>
}
`;

/** Evenly spread points on a unit sphere (Fibonacci lattice). */
function fibonacciSphere(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y * y);
    const theta = i * GOLDEN;
    out[i * 3] = Math.cos(theta) * r;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = Math.sin(theta) * r;
  }
  return out;
}

/** Deterministic pseudo-random in [0, 1). */
const hash = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function fromLatLon(lat: number, lon: number): Vector3 {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return new Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
}

function buildNodes(): Vector3[] {
  const fib = fibonacciSphere(NODE_COUNT - GLOBE_LABEL_COUNT);
  const nodes: Vector3[] = [];
  for (let i = 0; i < fib.length / 3; i++) nodes.push(new Vector3(fib[i * 3], fib[i * 3 + 1], fib[i * 3 + 2]));
  // Labeled nodes go first so their index is stable: 0, 1, 2.
  return [...LABEL_NODES.map(([la, lo]) => fromLatLon(la, lo)), ...nodes];
}

/** Each node links to its two nearest neighbours; arcs are lifted off the surface. */
function buildArcs(nodes: Vector3[]): Float32Array {
  const pairs = new Set<string>();
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => ({ j, d: a.distanceToSquared(b) }))
      .filter((o) => o.j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 2)
      .forEach((o) => pairs.add(i < o.j ? `${i}-${o.j}` : `${o.j}-${i}`));
  });
  const SEG = 18;
  const out: number[] = [];
  const point = new Vector3();
  const prev = new Vector3();
  pairs.forEach((key) => {
    const [i, j] = key.split("-").map(Number) as [number, number];
    const a = nodes[i]!;
    const b = nodes[j]!;
    const angle = a.angleTo(b);
    for (let s = 0; s <= SEG; s++) {
      const t = s / SEG;
      // Spherical interpolation, then lift.
      const sin = Math.sin(angle) || 1;
      point
        .copy(a)
        .multiplyScalar(Math.sin((1 - t) * angle) / sin)
        .addScaledVector(b, Math.sin(t * angle) / sin)
        .normalize()
        .multiplyScalar(1.003 + (0.03 + 0.14 * (angle / Math.PI)) * Math.sin(Math.PI * t));
      if (s > 0) out.push(prev.x, prev.y, prev.z, point.x, point.y, point.z);
      prev.copy(point);
    }
  });
  return new Float32Array(out);
}

function pointCount(): number {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const low = window.innerWidth < 768 || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
  return low ? 4000 : 10000;
}

/** Soft rectangle (NDC half extents) covered by the active home panel, where the globe is dimmed. */
function panelRect(vw: number, vh: number): { x: number; y: number; dim: number } {
  const tall = vw >= 768 && vw < 1200 && vh >= 900;
  const accordion = vw < 768 || (vw < 1200 && !tall);
  if (accordion) return { x: 1, y: 1, dim: 0.5 };
  const width = Math.min(768, vw * (tall ? 0.9 : 0.54));
  const height = Math.min(496, vh - 248);
  return { x: width / vw, y: Math.max(0.3, height / vh), dim: 0.34 };
}

interface Burst {
  from: number;
  to: number;
  start: number;
  value: number;
}

/**
 * The point-cloud globe, rendered in the shared fixed canvas. All per-point work is in the vertex
 * shader. The loop runs (capped at ~45 fps) only while the globe is visible in HOME and the tab is
 * visible; the canvas frameloop itself stays "demand" and is driven by invalidate().
 */
export default function GlobeScene() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const world = useMemo(() => {
    const count = pointCount();
    const nodes = buildNodes();

    const uniforms = {
      uTime: { value: 0 },
      uBurst: { value: 1 },
      uSize: { value: 2.5 },
      uPx: { value: 1 },
      uCam: { value: CAM_Z },
      uR: { value: 3 },
      uAspect: { value: 1 },
      uPtrOn: { value: 0 },
      uHot: { value: -1 },
      uDim: { value: 1 },
      uPanelDim: { value: 0.4 },
      uPointer: { value: new Vector2() },
      uPanel: { value: new Vector2(1, 1) },
      uTeal: { value: new Color(readToken("--color-teal")) },
      uNeon: { value: new Color(readToken("--color-neon")) },
      uNeonHi: { value: new Color(readToken("--color-neon-hi")) },
      uLime: { value: new Color(readToken("--color-lime")) },
    };

    const sphere = new BufferGeometry();
    sphere.setAttribute("position", new BufferAttribute(fibonacciSphere(count), 3));
    sphere.setAttribute("aSeed", new BufferAttribute(Float32Array.from({ length: count }, (_, i) => hash(i)), 1));

    const nodeGeometry = new BufferGeometry();
    nodeGeometry.setAttribute(
      "position",
      new BufferAttribute(Float32Array.from(nodes.flatMap((v) => [v.x, v.y, v.z])), 3),
    );
    nodeGeometry.setAttribute(
      "aSeed",
      new BufferAttribute(Float32Array.from({ length: nodes.length }, (_, i) => hash(i + 9000)), 1),
    );
    nodeGeometry.setAttribute("aId", new BufferAttribute(Float32Array.from({ length: nodes.length }, (_, i) => i), 1));

    const arcGeometry = new BufferGeometry();
    arcGeometry.setAttribute("position", new BufferAttribute(buildArcs(nodes), 3));

    const common = { transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, uniforms };
    const pointMaterial = new ShaderMaterial({ ...common, vertexShader: VERT, fragmentShader: FRAG });
    const nodeMaterial = new ShaderMaterial({
      ...common,
      vertexShader: VERT,
      fragmentShader: FRAG,
      defines: { NODE: "" },
    });
    const arcMaterial = new LineBasicMaterial({
      color: new Color(readToken("--color-teal")),
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });

    const group = new Group();
    const pointsMesh = new Points(sphere, pointMaterial);
    const nodesMesh = new Points(nodeGeometry, nodeMaterial);
    const arcsMesh = new LineSegments(arcGeometry, arcMaterial);
    [pointsMesh, nodesMesh, arcsMesh].forEach((m) => {
      m.frustumCulled = false;
      group.add(m);
    });
    group.rotation.set(BASE_TILT, 0.4, 0);
    group.visible = false;

    return { count, nodes, uniforms, group, pointsMesh, nodesMesh, arcsMesh, arcMaterial, disposables: [sphere, nodeGeometry, arcGeometry, pointMaterial, nodeMaterial, arcMaterial] };
  }, []);

  const state = useMemo(
    () => ({
      burst: { from: 1, to: 1, start: 0, value: 1 } as Burst,
      rotY: 0.4,
      rotX: BASE_TILT,
      velY: AUTO_SPIN,
      velX: 0,
      dragging: false,
      lastX: 0,
      lastY: 0,
      pendingDX: 0,
      pendingDY: 0,
      hot: -1,
      lastFrame: null as number | null,
      lastTick: 0,
      raf: 0,
      running: false,
      layoutKey: "",
      tmp: new Vector3(),
      centre: new Vector3(),
    }),
    [],
  );

  // What the globe should be doing, from the site mode / transition phase.
  const wantedBurst = () => (getSiteMode() === "explore" || getSitePhase() === "enter-out" ? 1 : 0);
  const shouldRun = () => !document.hidden && (state.burst.value < 0.999 || state.burst.to === 0);

  const ensureLoop = () => {
    if (state.running || reducedMotion() || !shouldRun()) return;
    state.running = true;
    const tick = (now: number) => {
      if (!shouldRun() || reducedMotion()) {
        state.running = false;
        invalidate();
        return;
      }
      state.raf = requestAnimationFrame(tick);
      if (now - state.lastTick < FRAME_MS - 1) return;
      state.lastTick = now;
      invalidate();
    };
    state.raf = requestAnimationFrame(tick);
  };

  const retarget = () => {
    const next = wantedBurst();
    const b = state.burst;
    if (next !== b.to) {
      b.from = b.value;
      b.to = next;
      b.start = performance.now();
      if (reducedMotion()) b.value = next;
    }
    ensureLoop();
    invalidate();
  };

  useEffect(() => {
    // Diagnostic: how many points this device got (4000 on mobile / low-end, 10000 otherwise).
    document.documentElement.dataset.globePoints = String(world.count);
    const unsubscribe = subscribeSiteMode(retarget);
    const onVisible = () => {
      state.lastFrame = null;
      ensureLoop();
      invalidate();
    };
    document.addEventListener("visibilitychange", onVisible);
    // Initial burst value: assembled in HOME, already burst on a deep link into EXPLORE.
    state.burst.value = state.burst.from = state.burst.to = wantedBurst();
    state.burst.start = performance.now();
    retarget();
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      cancelAnimationFrame(state.raf);
      state.running = false;
      setGlobeVisible(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag to rotate (with inertia). Moves are only listened to while dragging; hover uses the shared listener.
  useEffect(() => {
    const room = document.getElementById("room");
    if (!room) return;
    const onDown = (event: PointerEvent) => {
      if (event.button > 0 || reducedMotion() || getSiteMode() !== "home") return;
      if (event.target instanceof Element && event.target.closest(NO_DRAG)) return;
      state.dragging = true;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.pendingDX = state.pendingDY = 0;
      room.dataset.dragging = "true";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      ensureLoop();
    };
    const onMove = (event: PointerEvent) => {
      state.pendingDX += event.clientX - state.lastX;
      state.pendingDY += event.clientY - state.lastY;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
    };
    const onUp = () => {
      state.dragging = false;
      delete room.dataset.dragging;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    room.addEventListener("pointerdown", onDown);
    return () => {
      room.removeEventListener("pointerdown", onDown);
      onUp();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hover moves wake a static (reduced-motion) frame too; the shared listener feeds this.
  useEffect(
    () =>
      subscribePointer((p) => {
        // Pointer moves over the panel do not wake the globe (it is not reacting to them).
        if (p.target instanceof Element && p.target.closest(PANEL_SELECTOR)) return;
        invalidate();
      }),
    [invalidate],
  );

  useEffect(
    () => () => {
      world.disposables.forEach((d) => d.dispose());
      world.group.removeFromParent();
    },
    [world],
  );

  // Layout: radius, panel dim rectangle.
  useEffect(() => {
    const vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * CAM_Z;
    const vw = vh * camera.aspect;
    const radius = Math.min(1.05 * vh, 1.0 * vw) / 2;
    world.group.scale.setScalar(radius);
    world.uniforms.uR.value = radius;
    world.uniforms.uAspect.value = camera.aspect;
    const rect = panelRect(window.innerWidth, window.innerHeight);
    world.uniforms.uPanel.value.set(rect.x, rect.y);
    world.uniforms.uPanelDim.value = rect.dim;
    world.uniforms.uDim.value = window.innerWidth < 768 ? 0.8 : 1;
    invalidate();
  }, [camera, size.width, size.height, world, invalidate]);

  useFrame((frame) => {
    const { group, uniforms, nodes } = world;
    const now = performance.now();
    const b = state.burst;
    const p = b.start === 0 ? 1 : Math.min(1, (now - b.start) / DURATION.burst);
    b.value = reducedMotion() ? b.to : b.from + (b.to - b.from) * ease(p);

    const home = getSiteMode() === "home";
    const visible = home || b.value < 0.999;
    setGlobeVisible(visible);
    group.visible = visible;
    if (!visible) return;

    const reduced = reducedMotion();
    const dt = Math.min(0.05, state.lastFrame === null ? 1 / 60 : (now - state.lastFrame) / 1000);
    state.lastFrame = now;

    // Rotation: drag, then inertia, easing back to the slow auto spin.
    if (!reduced) {
      if (state.dragging) {
        const dx = state.pendingDX;
        const dy = state.pendingDY;
        state.pendingDX = state.pendingDY = 0;
        state.rotY += dx * DRAG_SENSITIVITY;
        state.rotX = Math.max(-0.7, Math.min(0.9, state.rotX + dy * DRAG_SENSITIVITY * 0.6));
        const k = 1 - Math.exp(-dt * 14);
        state.velY += ((dx * DRAG_SENSITIVITY) / Math.max(dt, 1 / 120) - state.velY) * k;
      } else {
        state.velY += (AUTO_SPIN - state.velY) * (1 - Math.exp(-dt * 1.1));
        state.rotY += state.velY * dt;
        state.rotX += (BASE_TILT - state.rotX) * (1 - Math.exp(-dt * 0.9));
      }
    }
    group.rotation.set(state.rotX, state.rotY, 0);
    group.updateMatrixWorld(true);

    // Uniforms.
    uniforms.uTime.value = reduced ? 0 : now / 1000;
    uniforms.uBurst.value = b.value;
    uniforms.uPx.value = gl.getPixelRatio();
    // Over the active panel the globe does not react at all (uPtrOn eases to 0), and resumes when the pointer leaves.
    const overPanel = pointer.target instanceof Element && pointer.target.closest(PANEL_SELECTOR) !== null;
    const fine = pointer.active && !reduced && home && !state.dragging && !overPanel;
    uniforms.uPtrOn.value += ((fine ? 1 : 0) - uniforms.uPtrOn.value) * (reduced ? 1 : 0.2);
    uniforms.uPointer.value.set(pointer.nx, -pointer.ny);
    world.arcMaterial.opacity = 0.3 * (1 - Math.min(1, b.value * 1.6)) * uniforms.uDim.value;

    // Project the nodes: hover pick and DOM labels.
    const centre = state.centre.setFromMatrixPosition(group.matrixWorld);
    const radius = uniforms.uR.value;
    const w = frame.size.width;
    const h = frame.size.height;
    let hot = -1;
    let best = 26 * 26;
    const overUi =
      pointer.target instanceof Element && pointer.target.closest(".cpanel, .acc, .carousel__controls, .hud, button, a");
    nodes.forEach((node, i) => {
      state.tmp.copy(node);
      group.localToWorld(state.tmp);
      const frontness = (state.tmp.z - centre.z) / radius;
      const labelSlot = i < GLOBE_LABEL_COUNT ? getGlobeLabels()[i] : null;
      const needsPixels = labelSlot || (pointer.active && !overUi && !reduced && frontness > 0);
      if (!needsPixels) return;
      state.tmp.project(camera);
      const sx = ((state.tmp.x + 1) / 2) * w;
      const sy = ((1 - state.tmp.y) / 2) * h;
      if (labelSlot) {
        labelSlot.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
        const visibility = Math.max(0, Math.min(1, frontness * 3)) * (1 - Math.min(1, b.value * 2));
        labelSlot.style.opacity = visibility.toFixed(2);
        // Open toward whichever side has room for the label; keep the current side while it still fits.
        const fitsRight = sx + LABEL_REACH < w - 8;
        const fitsLeft = sx - LABEL_REACH > 8;
        const current = labelSlot.dataset.side;
        if (!((current === "r" && fitsRight) || (current === "l" && fitsLeft))) {
          labelSlot.dataset.side = fitsRight ? "r" : fitsLeft ? "l" : sx > w / 2 ? "l" : "r";
        }
      }
      if (pointer.active && !overUi && !reduced && frontness > 0) {
        const d = (sx - pointer.x) ** 2 + (sy - pointer.y) ** 2;
        if (d < best) {
          best = d;
          hot = i;
        }
      }
    });
    if (hot !== state.hot) {
      state.hot = hot;
      uniforms.uHot.value = hot;
      getGlobeLabels().forEach((el, i) => {
        if (el) el.dataset.hot = i === hot ? "true" : "false";
      });
    }
  });

  return <primitive object={world.group} />;
}
