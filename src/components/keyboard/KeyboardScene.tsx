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
import { hasKeyboard, keyboardPoses } from "@/data/poses";
import type { PosedModule } from "@/data/poses";
import type { KeyboardPose } from "@/data/poses";
import { getActiveModule, getBoardExiting, getBoardShown, subscribeActiveModule } from "@/lib/active-module";
import {
  getKeyboardState,
  keyAtCell,
  keyboardActions,
  subscribeKeyboard,
} from "@/lib/keyboard-store";
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

const COUNT = keyboardKeys.length;
const SPRING_OMEGA = 7;
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

  const pose = useRef({
    cur: new Float32Array([0, 0, 0, 0, 0, 0, 0]) as Vec7,
    vel: new Float32Array(7),
    target: new Float32Array(7) as Vec7,
    start: new Float32Array(7) as Vec7,
    total: 0,
    moduleId: "stack" as PosedModule,
    initialised: false,
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

  const distance = (a: Float32Array, b: Float32Array) => {
    const { h, w } = half();
    return (
      Math.abs(a[0]! - b[0]!) / w +
      Math.abs(a[1]! - b[1]!) / h +
      Math.abs(a[3]! - b[3]!) +
      Math.abs(a[4]! - b[4]!) +
      Math.abs(a[6]! - b[6]!) / Math.max(0.01, Math.max(a[6]!, b[6]!, 0.5))
    );
  };

  /** Point the pose spring at a moduleId; decide whether to snap or animate. */
  const retarget = (moduleId: PosedModule, forceSnap = false) => {
    const p = pose.current;
    p.moduleId = moduleId;
    p.target = targetFor(moduleId);
    const appearing = p.cur[6]! < 0.02 && p.target[6]! > 0;
    if (!p.initialised || forceSnap || (appearing && !animator.entered)) {
      p.cur.set(p.target);
      p.vel.fill(0);
      p.initialised = true;
    } else if (appearing) {
      // Re-appearing after being hidden: land in place, then grow (edge-on turn plays on the way).
      p.cur.set(p.target);
      p.cur[6] = 0;
      p.vel.fill(0);
    }
    p.start.set(p.cur);
    p.total = distance(p.cur, p.target);
  };

  // Stack <-> Projects glide. Each time the board goes from hidden to shown it snaps to its pose and
  // replays the entrance; leaving Projects downward plays the exit instead. Other modules have no pose.
  useEffect(() => {
    let last: PosedModule | null = null;
    let wasShown = false;
    const apply = () => {
      const moduleId = getActiveModule();
      const shown = getBoardShown();
      if (hasKeyboard(moduleId) && moduleId !== last) {
        last = moduleId;
        retarget(moduleId, false);
        buttonsDirty.current = true;
      }
      if (shown && !wasShown && hasKeyboard(moduleId)) {
        retarget(moduleId, true);
        animator.restartEntrance(performance.now() / 1000);
        buttonsDirty.current = true;
      }
      if (!shown && wasShown && getBoardExiting()) animator.startExit(performance.now() / 1000);
      wasShown = shown;
      invalidate();
    };
    apply();
    return subscribeActiveModule(apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Viewport changes re-fit the board and keep the current module's pose.
  useEffect(() => {
    if (!pose.current.initialised) return;
    retarget(pose.current.moduleId, true);
    buttonsDirty.current = true;
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
      if (!g || !g.visible || !getBoardShown() || animator.exiting || !keyboardPoses[p.moduleId].interactive) return null;
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
    const p = pose.current;
    const nowMs = performance.now();
    const now = nowMs / 1000;
    const dt = Math.min(0.033, f.last === null ? 1 / 60 : now - f.last);
    f.last = now;
    let active = false;

    // Pose spring (critically damped).
    let settled = true;
    for (let i = 0; i < 7; i++) {
      const diff = p.target[i]! - p.cur[i]!;
      const acc = SPRING_OMEGA * SPRING_OMEGA * diff - 2 * SPRING_OMEGA * p.vel[i]!;
      p.vel[i] = p.vel[i]! + acc * dt;
      p.cur[i] = p.cur[i]! + p.vel[i]! * dt;
      if (Math.abs(diff) > 0.0008 || Math.abs(p.vel[i]!) > 0.004) settled = false;
    }
    if (settled) {
      p.cur.set(p.target);
      p.vel.fill(0);
      p.total = 0;
    } else active = true;

    // Edge-on turn in the middle of a move.
    let edge = 0;
    if (p.total > 0.02) {
      const progress = Math.min(1, Math.max(0, 1 - distance(p.cur, p.target) / p.total));
      edge = Math.sin(Math.PI * progress) ** 2;
    }

    const scale = p.cur[6]!;
    g.position.set(p.cur[0]!, p.cur[1]!, p.cur[2]!);
    g.rotation.set(p.cur[3]! * (1 - 0.96 * edge), p.cur[4]! + edge * 0.9, p.cur[5]!);
    g.scale.setScalar(Math.max(scale, 0.0001));
    g.visible = animator.entered && scale > 0.002;

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

/** The single, fixed canvas. Loaded lazily; it persists while the board moves between modules. */
export default function KeyboardScene() {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      flat
      camera={{ position: [0, 0, 16], fov: 26, near: 1, far: 60 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
    >
      <Rig />
    </Canvas>
  );
}

