import { DURATION, EASE, cssEase } from "@/lib/motion";
import { getActiveModule, subscribeActiveModule } from "@/lib/active-module";
import type { ModuleId } from "@/data/modules";

/**
 * The one shared pointer / scroll / visibility listener. It never touches React state: everything
 * goes out as CSS variables on <html> (--nx/--ny in -1..1, --mx/--my in px, --scroll in 0..1,
 * --scroll-px, --pct) or as variables on the element under the pointer (tilt and magnet).
 * Other imperative consumers (the globe) subscribe through `subscribePointer`.
 */

export interface PointerState {
  x: number;
  y: number;
  nx: number;
  ny: number;
  /** True while a fine pointer is over the page. */
  active: boolean;
  target: EventTarget | null;
}

export const pointer: PointerState = { x: 0, y: 0, nx: 0, ny: 0, active: false, target: null };

const MAGNET_PX = 5;
/** The active home panel's content (carousel center panel or open accordion row). */
export const PANEL_SELECTOR = '.cpanel[data-slot="center"] .cpanel__full, .acc[data-open="true"], .carousel__controls';
/** Elements that tilt / get pulled toward the pointer (fine pointers only). */
const TILT_SELECTOR = "[data-tilt], .academic, .t-card, .project__image";
const MAGNET_SELECTOR = "[data-magnet], .btn, .social__btn, .arrow-btn, .hud__back";
const TINT: Record<ModuleId, "neon" | "teal" | "lime"> = {
  room: "neon",
  stack: "teal",
  projects: "neon",
  experience: "lime",
  contact: "teal",
};

const pointerListeners = new Set<(p: PointerState) => void>();
const scrollListeners = new Set<() => void>();
/** Called (rAF-throttled) whenever the page scrolls or resizes. */
export function subscribeScroll(fn: () => void) {
  scrollListeners.add(fn);
  return () => {
    scrollListeners.delete(fn);
  };
}
export function subscribePointer(fn: (p: PointerState) => void) {
  pointerListeners.add(fn);
  return () => {
    pointerListeners.delete(fn);
  };
}

const root = () => document.documentElement;
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => window.matchMedia("(pointer: fine)").matches;

let started = false;

export function startAmbient(): () => void {
  if (started) return () => {};
  started = true;
  const el = root();
  el.dataset.motion = reduced() ? "reduced" : "on";

  let frame = 0;
  let pointerDirty = false;
  let scrollDirty = true;
  let hudEl: HTMLElement | null = null;
  let backEl: HTMLElement | null = null;
  let tiltEl: HTMLElement | null = null;
  let magnetEl: HTMLElement | null = null;

  const resetEl = (target: HTMLElement | null, vars: string[]) => {
    if (!target) return;
    vars.forEach((v) => target.style.removeProperty(v));
    delete target.dataset.live;
  };

  const flush = () => {
    frame = 0;
    if (pointerDirty) {
      pointerDirty = false;
      if (finePointer() && !reduced()) {
        const s = el.style;
        s.setProperty("--nx", pointer.nx.toFixed(3));
        s.setProperty("--ny", pointer.ny.toFixed(3));
        s.setProperty("--px", pointer.nx.toFixed(3));
        s.setProperty("--py", pointer.ny.toFixed(3));
        s.setProperty("--mx", `${pointer.x.toFixed(1)}px`);
        s.setProperty("--my", `${pointer.y.toFixed(1)}px`);
        if (pointer.active && el.dataset.pointer !== "on") el.dataset.pointer = "on";

        const target = pointer.target instanceof Element ? pointer.target : null;
        // Over the active home panel: the panel's parallax rests (CSS: --pdamp) and the globe ignores the pointer.
        const overPanel = target?.closest(PANEL_SELECTOR) != null;
        if (overPanel !== (el.dataset.panelHover === "1")) {
          if (overPanel) el.dataset.panelHover = "1";
          else delete el.dataset.panelHover;
        }
        const tilt = target?.closest<HTMLElement>(TILT_SELECTOR) ?? null;
        if (tilt !== tiltEl) {
          resetEl(tiltEl, ["--tx", "--ty"]);
          tiltEl = tilt;
        }
        if (tilt) {
          const r = tilt.getBoundingClientRect();
          const tx = Math.max(-1, Math.min(1, ((pointer.x - r.left) / r.width) * 2 - 1));
          const ty = Math.max(-1, Math.min(1, ((pointer.y - r.top) / r.height) * 2 - 1));
          tilt.style.setProperty("--tx", tx.toFixed(3));
          tilt.style.setProperty("--ty", ty.toFixed(3));
          tilt.dataset.live = "true";
        }

        const magnet = target?.closest<HTMLElement>(MAGNET_SELECTOR) ?? null;
        if (magnet !== magnetEl) {
          resetEl(magnetEl, ["--mgx", "--mgy"]);
          magnetEl = magnet;
        }
        if (magnet) {
          const r = magnet.getBoundingClientRect();
          const dx = (pointer.x - (r.left + r.width / 2)) / (r.width / 2);
          const dy = (pointer.y - (r.top + r.height / 2)) / (r.height / 2);
          magnet.style.setProperty("--mgx", (Math.max(-1, Math.min(1, dx)) * MAGNET_PX).toFixed(2));
          magnet.style.setProperty("--mgy", (Math.max(-1, Math.min(1, dy)) * MAGNET_PX).toFixed(2));
          magnet.dataset.live = "true";
        }
      }
      pointerListeners.forEach((fn) => fn(pointer));
    }
    if (scrollDirty) {
      scrollDirty = false;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const y = window.scrollY;
      const ratio = Math.min(1, y / max);
      // Written on the elements that read them (not on <html>): a root custom-property change would
      // restyle the whole document on every scroll frame.
      hudEl ??= document.querySelector<HTMLElement>(".hud-frame");
      backEl ??= document.querySelector<HTMLElement>(".atmo--back");
      hudEl?.style.setProperty("--pct", String(Math.round(ratio * 100)));
      backEl?.style.setProperty("--scroll-px", `${Math.round(y)}px`);
      scrollListeners.forEach((fn) => fn());
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(flush);
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.nx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ny = (event.clientY / window.innerHeight) * 2 - 1;
    pointer.active = true;
    pointer.target = event.target;
    pointerDirty = true;
    schedule();
  };
  const onLeave = () => {
    pointer.active = false;
    pointer.target = null;
    resetEl(tiltEl, ["--tx", "--ty"]);
    resetEl(magnetEl, ["--mgx", "--mgy"]);
    tiltEl = null;
    magnetEl = null;
    delete el.dataset.pointer;
    delete el.dataset.panelHover;
    pointerDirty = true;
    schedule();
  };
  let scrollTimer = 0;
  const onScroll = () => {
    scrollDirty = true;
    if (el.dataset.scrolling !== "1") el.dataset.scrolling = "1";
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => delete el.dataset.scrolling, 180);
    schedule();
  };
  const onVisibility = () => {
    if (document.hidden) el.dataset.hidden = "true";
    else delete el.dataset.hidden;
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  onVisibility();
  schedule();

  // Depth reveal: elements flagged data-reveal come in once, staggered by their order in the batch.
  const revealIO = new IntersectionObserver(
    (entries) => {
      let i = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target as HTMLElement;
        target.style.setProperty("--rd", String(i++));
        target.dataset.in = "true";
        revealIO.unobserve(target);
      }
    },
    { threshold: 0.12 },
  );
  const seen = new WeakSet<Element>();
  let scanFrame = 0;
  const scan = () => {
    scanFrame = 0;
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((node) => {
      if (seen.has(node)) return;
      seen.add(node);
      revealIO.observe(node);
    });
  };
  const mutations = new MutationObserver(() => {
    if (!scanFrame) scanFrame = requestAnimationFrame(scan);
  });
  mutations.observe(document.getElementById("app-root") ?? document.body, { childList: true, subtree: true });
  scan();

  // Per-module ambient tint, and the thin scan wipe when the module changes in EXPLORE.
  let lastModule: ModuleId = getActiveModule();
  const onModule = () => {
    const id = getActiveModule();
    el.dataset.tint = TINT[id];
    el.dataset.module = id;
    if (id === lastModule) return;
    lastModule = id;
    if (el.dataset.mode === "explore" && !reduced() && !document.hidden) {
      document.querySelector<HTMLElement>(".scan-wipe")?.animate(
        [
          { transform: "translate3d(0,-4vh,0)", opacity: 0 },
          { transform: "translate3d(0,10vh,0)", opacity: 1, offset: 0.12 },
          { transform: "translate3d(0,100vh,0)", opacity: 0.9, offset: 0.85 },
          { transform: "translate3d(0,108vh,0)", opacity: 0 },
        ],
        { duration: DURATION.wipe, easing: cssEase(EASE.inOut) },
      );
    }
  };
  onModule();
  const unsubscribeModule = subscribeActiveModule(onModule);

  return () => {
    started = false;
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    document.removeEventListener("visibilitychange", onVisibility);
    cancelAnimationFrame(frame);
    window.clearTimeout(scrollTimer);
    cancelAnimationFrame(scanFrame);
    revealIO.disconnect();
    mutations.disconnect();
    unsubscribeModule();
  };
}
