"use client";

import { useEffect, useRef } from "react";
import { useKeyboardState } from "@/lib/keyboard-store";

let lastX = -100;
let lastY = -100;

/** Small glowing orb that trails the pointer while it is over the keyboard. DOM + transform only. */
export function KeyboardOrb() {
  const { hoveredId } = useKeyboardState();
  const visible = hoveredId !== null;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!visible || !el) return;
    document.documentElement.dataset.orb = "on";
    let x = lastX;
    let y = lastY;
    let frame = 0;
    const loop = () => {
      x += (lastX - x) * 0.25;
      y += (lastY - y) * 0.25;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      frame = Math.abs(lastX - x) + Math.abs(lastY - y) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (event: PointerEvent) => {
      lastX = event.clientX;
      lastY = event.clientY;
      if (!frame) frame = requestAnimationFrame(loop);
    };
    loop();
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      delete document.documentElement.dataset.orb;
    };
  }, [visible]);

  return <div ref={ref} className="orb" data-visible={visible} aria-hidden="true" />;
}

/** Keeps the pointer position fresh even before the orb is shown. */
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointermove",
    (event) => {
      lastX = event.clientX;
      lastY = event.clientY;
    },
    { passive: true },
  );
}
