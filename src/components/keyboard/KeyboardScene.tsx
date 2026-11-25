"use client";

/* eslint-disable react-hooks/immutability --
   Imperative three.js code: useFrame mutates GPU-bound objects (attributes, matrices, materials)
   created with useMemo. That is the intended pattern for react-three-fiber, not React state. */

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  Object3D,
  Vector3,
} from "three";
import type { Group, InstancedMesh, Mesh, MeshBasicMaterial, PerspectiveCamera } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { keyboardKeys } from "@/data/technologies";
import type { PosedModule } from "@/data/poses";
import { keyboardPoses } from "@/data/poses";
import type { KeyboardPose } from "@/data/poses";
import { getBoardExiting, getBoardShown, subscribeActiveModule } from "@/lib/active-module";
import { subscribeScroll } from "@/lib/ambient";
import {
  getKeyboardState,
  keyAtCell,
  keyboardActions,
  subscribeKeyboard,
} from "@/lib/keyboard-store";
import { clearGpuFailure, reportGpuFailure, useCapabilities } from "@/lib/capabilities";
import { readToken } from "@/lib/tokens";
import { KeyAnimator, REST_Y, SELECT_RISE, keyPosition } from "./animator";
import {
  BASE_DEPTH,
  BASE_HEIGHT,
  BASE_WIDTH,
  KEY_TOP_Y,
  cellCenter,
  cellFromLocal,
  createKeycapGeometry,
} from "./board";
import { createKeycapMaterial } from "./keycap-material";
import { createLogoAtlas } from "./logo-atlas";
import GlobeScene from "@/components/globe/GlobeScene";

const COUNT = keyboardKeys.length;
/** Stiffness of the critically damped follower that smooths the scroll-driven pose (1/s). */
const FOLLOW_OMEGA = 13;
const DPR_MOVING = 1.25;
const DPR_SETTLE_MS = 280;
/** Below this glide progress the board counts as sitting in the Stack pose (hover and clicks are live). */
const INTERACTIVE_BELOW = 0.03;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const INTERACTIVE_SELECTOR = "a, button, input, textarea, select, dialog, [data-keyboard-ignore]";

type Vec7 = Float32Array; // x, y, z, rx, ry, rz, scale

function radialTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new CanvasTexture(canvas);
}

/** Scale at which the board (in the pose's rotation) fills the pose's fit.x / fit.y of the half viewport. */
function computeFit(camera: PerspectiveCamera, pose: KeyboardPose): number {
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const holder = new Object3D();
  holder.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z);
  const corner = new Vector3();
  let scale = 1;
  for (let pass = 0; pass < 2; pass++) {
    holder.scale.setScalar(scale);
    holder.updateMatrixWorld(true);
    let maxX = 0;
    let maxY = 0;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (const y of [-BASE_HEIGHT, KEY_TOP_Y + SELECT_RISE * 0.4]) {
          corner.set((sx * BASE_WIDTH) / 2, y, (sz * BASE_DEPTH) / 2).applyMatrix4(holder.matrixWorld).project(camera);
          maxX = Math.max(maxX, Math.abs(corner.x));
          maxY = Math.max(maxY, Math.abs(corner.y));
        }
      }
    }
    scale *= Math.min(pose.fit.x / maxX, pose.fit.y / maxY);
  }
  return scale;
}

/** The key's own color, lightened when too dark to read against the dark room. */
function glowColorOf(hex: string): Color {
  const color = new Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return color.setHSL(hsl.h, hsl.s, Math.max(hsl.l, 0.62));
}

function Rig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const setDpr = useThree((s) => s.setDpr);

  const group = useRef<Group>(null);
  const caps = useRef<InstancedMesh>(null);
  const baseMesh = useRef<Mesh>(null);
  const floorGlow = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);

  const animator = useMemo(() => new KeyAnimator(), []);
  const resources = useMemo(() => {
    const neonHi = readToken("--color-neon-hi");
    const geometry = createKeycapGeometry();
    const aAtlas = new InstancedBufferAttribute(new Float32Array(COUNT * 2), 2);
    const aLogoColor = new InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
    const aFx = new InstancedBufferAttribute(new Float32Array(COUNT * 2), 2);
    aFx.setUsage(DynamicDrawUsage);
    geometry.setAttribute("aAtlas", aAtlas);
    geometry.setAttribute("aLogoColor", aLogoColor);
    geometry.setAttribute("aFx", aFx);
    return {
      geometry,
      aFx,
      material: createKeycapMaterial(),
      baseGeometry: new RoundedBoxGeometry(BASE_WIDTH, BASE_HEIGHT, BASE_DEPTH, 4, 0.2),
      plateGeometry: new RoundedBoxGeometry(BASE_WIDTH - 0.28, 0.05, BASE_DEPTH - 0.28, 3, 0.02),
      radial: radialTexture(),
      colors: {
        base: readToken("--color-panel"),
        plate: readToken("--color-abyss"),
        arrow: readToken("--color-deep"),
        arrowLogo: readToken("--color-ink"),
        neon: readToken("--color-neon"),
        neonHi: neonHi,
        teal: readToken("--color-teal"),
      },
      aAtlas,
      aLogoColor,
      glowColors: keyboardKeys.map((k) => glowColorOf(k.tech?.keyColor ?? neonHi)),
    };
  }, []);

  // Static per-instance data: color, atlas slot, logo color. Atlas arrives asynchronously.
  useEffect(() => {
    const mesh = caps.current;
    if (!mesh) return;
    const color = new Color();
    keyboardKeys.forEach((key, i) => {
      color.set(key.tech?.keyColor ?? resources.colors.arrow);
      mesh.setColorAt(i, color);
      color.set(key.tech?.logoColor ?? resources.colors.arrowLogo);
      resources.aLogoColor.setXYZ(i, color.r, color.g, color.b);
      resources.aAtlas.setXY(i, i % 8, Math.floor(i / 8));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    resources.aLogoColor.needsUpdate = true;
    resources.aAtlas.needsUpdate = true;

    let cancelled = false;
    let atlasTexture: CanvasTexture | null = null;
    createLogoAtlas()
      .then((texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        atlasTexture = texture;
        resources.material.userData.atlas.value = texture;
        invalidate();
      })
      .catch(() => {
        /* caps simply render without engraving */
      });
    return () => {
      cancelled = true;
      atlasTexture?.dispose();
    };
  }, [resources, invalidate]);

  // Dispose everything we created by hand.
  useEffect(
    () => () => {
      resources.geometry.dispose();
      resources.baseGeometry.dispose();
      resources.plateGeometry.dispose();
      resources.material.dispose();
      resources.radial.dispose();
    },
    [resources],
  );

  /**
   * Continuous pose. `p` is the glide progress between the Stack pose (0) and the Projects pose (1),
   * read each frame from where the Projects section sits relative to the viewport, then followed by a
   * frame-rate-independent critically damped spring (`v` is its velocity). `A` / `B` are the two
   * fitted poses [x, y, z, rx, ry, rz, scale], recomputed on resize.
   */
  const pose = useRef({
    p: 0,
    v: 0,
    A: new Float32Array(7) as Vec7,
    B: new Float32Array(7) as Vec7,
    cur: new Float32Array(7) as Vec7,
    ready: false,
    projectsEl: null as HTMLElement | null,
    layerEl: null as HTMLElement | null,
    fade: 1,
    dprLow: false,
    settledSince: 0,
  });
  const frame = useRef({
    last: null as number | null,
    hover: -1,
    prevSelected: null as string | null,
    prevPulse: 0,
    prevRaised: 0,
  });
  const dummy = useMemo(() => new Object3D(), []);
  const keyIndex = useMemo(() => new Map(keyboardKeys.map((k, i) => [k.id, i])), []);
  const buttonsDirty = useRef(true);
  const wasUnsettled = useRef(false);
  const tmp = useMemo(() => ({ a: new Vector3(), b: new Vector3(), c: new Vector3() }), []);

  const syncButtons = (g: Group) => {
    const els = document.querySelectorAll<HTMLElement>("[data-key-id]");
    if (els.length === 0) return;
    g.updateMatrixWorld(true);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const screen = (x: number, z: number) => {
      tmp.a.set(x, KEY_TOP_Y, z);
      g.localToWorld(tmp.a);
      tmp.a.project(camera);
      return { x: ((tmp.a.x + 1) / 2) * w, y: ((1 - tmp.a.y) / 2) * h };
    };
    els.forEach((el) => {
      const index = keyIndex.get(el.dataset.keyId ?? "");
      if (index === undefined) return;
      const { x, z } = keyPosition(index);
      const c = screen(x, z);
      const l = screen(x - 0.45, z);
      const r = screen(x + 0.45, z);
      const t = screen(x, z - 0.45);
      const b = screen(x, z + 0.45);
      const size = Math.max(8, (Math.hypot(r.x - l.x, r.y - l.y) + Math.hypot(b.x - t.x, b.y - t.y)) / 2);
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.transform = `translate(${c.x - size / 2}px, ${c.y - size / 2}px)`;
    });
  };

  const half = () => {
    const h = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    return { h, w: h * camera.aspect };
  };

  const targetFor = (moduleId: PosedModule): Float32Array => {
    const p = keyboardPoses[moduleId];
    const { h, w } = half();
    return new Float32Array([
      p.position.x * w,
      p.position.y * h,
      p.position.z,
      p.rotation.x,
      p.rotation.y,
      p.rotation.z,
      computeFit(camera, p),
    ]);
  };

  /** Where the Projects section sits: 0 while it is still a full screen below, 1 once it fills the viewport. */
  const readProgress = () => {
    const el = (pose.current.projectsEl ??= document.getElementById("projects"));
    if (!el) return 0;
    return clamp01(1 - el.getBoundingClientRect().top / window.innerHeight);
  };

  /** The board at glide progress q: x leads (it clears the left column first), scale follows. */
  const poseAt = (q: number, out: Float32Array) => {
    const { A, B } = pose.current;
    const qx = smoothstep(0, 0.5, q);
    const qs = smoothstep(0.1, 0.6, q);
    const qr = smoothstep(0, 1, q);
    out[0] = lerp(A[0]!, B[0]!, qx);
    out[1] = lerp(A[1]!, B[1]!, qx);
    out[2] = lerp(A[2]!, B[2]!, qx);
    out[3] = lerp(A[3]!, B[3]!, qr);
    out[4] = lerp(A[4]!, B[4]!, qr);
    out[5] = lerp(A[5]!, B[5]!, qr);
    out[6] = lerp(A[6]!, B[6]!, qs);
  };

  const refit = () => {
    const ps = pose.current;
    ps.A = targetFor("stack");
    ps.B = targetFor("projects");
    ps.ready = true;
    buttonsDirty.current = true;
  };

  // Entrance / exit and visibility. Each time the board goes from hidden to shown it snaps to the pose
  // for the current scroll position and replays the entrance; leaving Projects downward plays the exit.
  useEffect(() => {
    let wasShown = false;
    const apply = () => {
      const shown = getBoardShown();
      if (!pose.current.ready) refit();
      if (shown && !wasShown) {
        pose.current.p = readProgress();
        pose.current.v = 0;
        animator.restartEntrance(performance.now() / 1000);
        buttonsDirty.current = true;
      }
      if (!shown && wasShown && getBoardExiting()) animator.startExit(performance.now() / 1000);
      wasShown = shown;
      invalidate();
    };
    apply();
    const offModule = subscribeActiveModule(apply);
    // Scrolling drives the pose: wake the (demand) loop; the shared listener is already rAF-throttled.
    const offScroll = subscribeScroll(invalidate);
    return () => {
      offModule();
      offScroll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Viewport changes re-fit both poses.
  useEffect(() => {
    refit();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  // Keyboard store -> animator.
  useEffect(() => {
    const sync = () => {
      const now = performance.now() / 1000;
      const s = getKeyboardState();
      const f = frame.current;
      const indexOf = (id: string | null) => (id ? keyboardKeys.findIndex((k) => k.id === id) : -1);
      if (s.selectedId !== f.prevSelected) {
        f.prevSelected = s.selectedId;
        animator.select(indexOf(s.selectedId), now);
      }
      if (s.pulse && s.pulse.seq !== f.prevPulse) {
        f.prevPulse = s.pulse.seq;
        animator.pulse(indexOf(s.pulse.id), now);
      }
      if (s.raised.seq !== f.prevRaised) {
        f.prevRaised = s.raised.seq;
        animator.setRaised(s.raised.ids.map(indexOf).filter((i) => i >= 0), now);
      }
      f.hover = indexOf(s.hoveredId ?? s.focusedId);
      invalidate();
    };
    sync();
    return subscribeKeyboard(sync);
  }, [animator, invalidate]);

  // Pointer -> cell, pure math: intersect the pointer ray with the key plane in board-local space.
  useEffect(() => {
    const cellAt = (clientX: number, clientY: number): string | null => {
      const g = group.current;
      const p = pose.current;
      if (!g || !g.visible || !getBoardShown() || animator.exiting || p.p > INTERACTIVE_BELOW) return null;
      g.updateMatrixWorld(true);
      const ndcX = (clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(clientY / window.innerHeight) * 2 + 1;
      tmp.a.copy(camera.position);
      tmp.b.set(ndcX, ndcY, 0.5).unproject(camera);
      g.worldToLocal(tmp.a);
      g.worldToLocal(tmp.b);
      tmp.c.subVectors(tmp.b, tmp.a);
      if (Math.abs(tmp.c.y) < 1e-6) return null;
      const hitAt = (planeY: number) => {
        const t = (planeY - tmp.a.y) / tmp.c.y;
        if (t <= 0) return null;
        const cell = cellFromLocal(tmp.a.x + tmp.c.x * t, tmp.a.z + tmp.c.z * t);
        return cell ? (keyAtCell(cell.row, cell.col) ?? null) : null;
      };
      // Raised keys first: test the plane at each raised key's current height (tallest wins).
      const raised = animator.frames
        .map((f, i) => ({ y: f.y, i }))
        .filter((r) => r.y > 0.12)
        .sort((a, b) => b.y - a.y);
      for (const r of raised) {
        const id = hitAt(KEY_TOP_Y + r.y);
        if (id && id === keyboardKeys[r.i]?.id) return id;
      }
      return hitAt(KEY_TOP_Y);
    };
    const ignored = (target: EventTarget | null) =>
      target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null;

    const onMove = (event: PointerEvent) => {
      keyboardActions.setHovered(ignored(event.target) ? null : cellAt(event.clientX, event.clientY));
    };
    const onLeave = () => keyboardActions.setHovered(null);
    const onClick = (event: MouseEvent) => {
      if (ignored(event.target)) return;
      const id = cellAt(event.clientX, event.clientY);
      if (id) keyboardActions.activate(id);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("click", onClick);
      keyboardActions.setHovered(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    const g = group.current;
    const mesh = caps.current;
    if (!g || !mesh) return;
    const f = frame.current;
    // Shared canvas: while the board is off screen (HOME globe frames) skip all keyboard work.
    if (!g.visible && !getBoardShown() && !getBoardExiting() && !animator.exiting) {
      f.last = null;
      if (pose.current.fade !== 1) {
        pose.current.fade = 1;
        pose.current.layerEl?.style.removeProperty("--kb-fade");
      }
      return;
    }
    const p = pose.current;
    const nowMs = performance.now();
    const now = nowMs / 1000;
    const rawDt = f.last === null ? 1 / 60 : now - f.last;
    const dt = Math.min(0.033, rawDt);
    f.last = now;
    let active = false;

    // Pose: follow the scroll-driven progress with an exact critically damped step (any frame rate).
    const target = readProgress();
    const d = p.p - target;
    let settled = true;
    if (Math.abs(d) < 0.0006 && Math.abs(p.v) < 0.003) {
      p.p = target;
      p.v = 0;
    } else {
      settled = false;
      active = true;
      // Real elapsed time (the closed-form step is stable at any size), so a slow frame still catches up.
      const stepDt = Math.min(0.25, rawDt);
      const t1 = p.v + FOLLOW_OMEGA * d;
      const e = Math.exp(-FOLLOW_OMEGA * stepDt);
      p.p = target + (d + t1 * stepDt) * e;
      p.v = (p.v - FOLLOW_OMEGA * t1 * stepDt) * e;
    }
    poseAt(p.p, p.cur);

    // Edge-on turn, driven by the same progress; the board also dims while it crosses the content.
    const edge = Math.sin(Math.PI * p.p) ** 2;
    const fade = 1 - 0.5 * Math.sin(Math.PI * p.p) ** 0.8;
    if (Math.abs(fade - p.fade) > 0.015) {
      p.fade = fade;
      (p.layerEl ??= document.querySelector<HTMLElement>(".keyboard-layer"))?.style.setProperty("--kb-fade", fade.toFixed(2));
    }

    // Lower resolution while moving, restored once the pose has been still for a moment.
    if (window.devicePixelRatio > DPR_MOVING) {
      if (!settled && !p.dprLow) {
        p.dprLow = true;
        setDpr(DPR_MOVING);
      } else if (!settled) {
        p.settledSince = 0;
      } else if (p.dprLow) {
        if (p.settledSince === 0) p.settledSince = nowMs;
        if (nowMs - p.settledSince > DPR_SETTLE_MS) {
          p.dprLow = false;
          p.settledSince = 0;
          setDpr(Math.min(window.devicePixelRatio, 1.5));
        } else active = true;
      }
    }

    const scale = p.cur[6]!;
    g.position.set(p.cur[0]!, p.cur[1]!, p.cur[2]!);
    g.rotation.set(p.cur[3]! * (1 - 0.96 * edge), p.cur[4]! + edge * 0.9, p.cur[5]!);
    g.scale.setScalar(Math.max(scale, 0.0001));
    // The canvas is shared with the HOME globe, so the board must hide itself when its modules are off screen.
    // After its exit finishes the base plate has fully sunk (baseAppear 0), so the board stays hidden.
    g.visible =
      animator.entered &&
      scale > 0.002 &&
      (getBoardShown() || ((getBoardExiting() || animator.exiting) && animator.baseAppear > 0.002));

    // Test hook (only when window.__kbDebug is set): the board's on-screen box and glide state.
    const dbg = window as unknown as { __kbDebug?: boolean; __kbBox?: unknown };
    if (dbg.__kbDebug) {
      g.updateMatrixWorld(true);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      const pts: number[][] = [];
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          for (const y of [-BASE_HEIGHT, KEY_TOP_Y]) {
            tmp.a.set((sx * BASE_WIDTH) / 2, y, (sz * BASE_DEPTH) / 2).applyMatrix4(g.matrixWorld).project(camera);
            const px = ((tmp.a.x + 1) / 2) * window.innerWidth;
            const py = ((1 - tmp.a.y) / 2) * window.innerHeight;
            pts.push([px, py]);
            x0 = Math.min(x0, px);
            x1 = Math.max(x1, px);
            y0 = Math.min(y0, py);
            y1 = Math.max(y1, py);
          }
        }
      }
      dbg.__kbBox = { x0, y0, x1, y1, pts, p: p.p, visible: g.visible, fade: p.fade, t: performance.now() };
    }

    // The invisible DOM buttons follow the board's current on-screen transform.
    if (buttonsDirty.current || !settled || wasUnsettled.current) {
      wasUnsettled.current = !settled;
      buttonsDirty.current = false;
      if (g.visible) syncButtons(g);
    }

    // Keys.
    if (animator.update(dt, now, f.hover)) active = true;
    for (let i = 0; i < COUNT; i++) {
      const frameData = animator.frames[i]!;
      const { x, z } = keyPosition(i);
      dummy.position.set(x, REST_Y + frameData.y, z);
      dummy.scale.setScalar(Math.max(frameData.scale, 0.0001));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      resources.aFx.setXY(i, frameData.glow, frameData.dim);
    }
    mesh.instanceMatrix.needsUpdate = true;
    resources.aFx.needsUpdate = true;

    // Base plate, floor glow, selection halo and ripple ring.
    const appear = animator.baseAppear;
    if (baseMesh.current) baseMesh.current.scale.set(1, 0.2 + 0.8 * appear, 1);
    if (floorGlow.current) {
      (floorGlow.current.material as MeshBasicMaterial).opacity = 0.42 * appear;
    }
    const selected = getKeyboardState().selectedId;
    const selIndex = selected ? keyboardKeys.findIndex((k) => k.id === selected) : -1;
    if (halo.current) {
      const hm = halo.current.material as MeshBasicMaterial;
      if (selIndex >= 0) {
        const c = cellCenter(keyboardKeys[selIndex]!.row, keyboardKeys[selIndex]!.col);
        halo.current.position.set(c.x, 0.03, c.z);
        hm.color.copy(resources.glowColors[selIndex]!);
      }
      hm.opacity = selIndex >= 0 ? 0.85 * animator.frames[selIndex]!.glow : 0;
    }
    if (ring.current) {
      const rm = ring.current.material as MeshBasicMaterial;
      const r = animator.rippleState(now);
      if (r) {
        const c = cellCenter(keyboardKeys[r.index]!.row, keyboardKeys[r.index]!.col);
        ring.current.position.set(c.x, 0.035, c.z);
        rm.color.copy(resources.glowColors[r.index]!);
        ring.current.scale.setScalar(0.4 + r.age * 6.5);
        rm.opacity = (1 - r.age) ** 1.6 * 0.85;
      } else rm.opacity = 0;
    }

    if (active) invalidate();
    else f.last = null;
  });

  const { colors } = resources;
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[-3, 8, 6]} intensity={2.6} />
      <directionalLight position={[6, 3, -4]} intensity={0.9} color={colors.teal} />
      <group ref={group} visible={false}>
        <mesh ref={floorGlow} position={[0, -BASE_HEIGHT - 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[BASE_WIDTH * 2.1, BASE_DEPTH * 1.75]} />
          <meshBasicMaterial
            map={resources.radial}
            color={colors.neon}
            transparent
            opacity={0}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
        <mesh ref={baseMesh} geometry={resources.baseGeometry} position={[0, -BASE_HEIGHT / 2, 0]}>
          <meshStandardMaterial color={colors.base} roughness={0.55} metalness={0.25} />
        </mesh>
        <mesh geometry={resources.plateGeometry} position={[0, 0.0, 0]}>
          <meshStandardMaterial color={colors.plate} roughness={0.8} />
        </mesh>
        <instancedMesh
          ref={caps}
          args={[resources.geometry, resources.material, COUNT]}
          frustumCulled={false}
        />
        <mesh ref={halo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <planeGeometry args={[3.6, 3.6]} />
          <meshBasicMaterial
            map={resources.radial}
            color={colors.neonHi}
            transparent
            opacity={0}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
          <ringGeometry args={[0.92, 1, 64]} />
          <meshBasicMaterial
            color={colors.neonHi}
            transparent
            opacity={0}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      </group>
    </>
  );
}

/**
 * The single, fixed canvas. Loaded lazily; it persists across modules. It hosts the HOME globe and,
 * in 3D mode, the keyboard rig. frameloop stays "demand": each scene calls invalidate() itself.
 */
export default function KeyboardScene({ keyboard }: { keyboard: boolean }) {
  const light = useCapabilities().quality === "light";
  return (
    <Canvas
      frameloop="demand"
      dpr={light ? [1, 1] : [1, 1.5]}
      flat
      camera={{ position: [0, 0, 16], fov: 26, near: 1, far: 60 }}
      gl={{ alpha: true, antialias: !light, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        // Lost context: drop the canvas (static fallback shows); restored: bring it back.
        const el = gl.domElement;
        el.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          reportGpuFailure("WebGL context lost");
        });
        el.addEventListener("webglcontextrestored", () => clearGpuFailure());
      }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
    >
      <GlobeScene />
      {keyboard && <Rig />}
    </Canvas>
  );
}

