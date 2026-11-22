"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useHydrated } from "@/components/home/AboutFacets";
import { useT } from "@/i18n/language-context";

/** Local inline line icons, one per interest (same order as the dictionary items). */
const ICONS: readonly ReactNode[] = [
  // telescope (Astronomy, the sun)
  <path key="a" d="M3 15l13-6 2 4-13 6zM16 9l4-2M9 18l-2 3M11 17l3 4M5 14l2 4" />,
  // headphones (Music)
  <path key="b" d="M4 15v-3a8 8 0 0116 0v3M4 14h3v6H5a1 1 0 01-1-1zM20 14h-3v6h2a1 1 0 001-1z" />,
  // trophy (Taekwondo and football)
  <path key="c" d="M8 4h8v5a4 4 0 01-8 0zM8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M9 20h6M10 17h4" />,
  // open book (Reading)
  <path key="d" d="M12 6c-2-1.5-5-2-8-1v13c3-1 6-.5 8 1 2-1.5 5-2 8-1V5c-3-1-6-.5-8 1zM12 6v13" />,
  // theater masks (Theater)
  <path key="e" d="M3 5h9v6a4.5 4.5 0 01-9 0zM6 9h.01M9 9h.01M5.5 12.5c.9.7 2.6.7 3.5 0M13 10h8v5a4 4 0 01-8 0zM15.5 13h.01M18.5 13h.01M15 16c.8.5 2.2.5 3 0" />,
  // puzzle piece (Rubik's cubes)
  <path key="f" d="M10 4a2 2 0 114 0v2h3a1 1 0 011 1v3h-2a2 2 0 100 4h2v3a1 1 0 01-1 1h-3v-2a2 2 0 10-4 0v2H7a1 1 0 01-1-1v-3h2a2 2 0 100-4H6V7a1 1 0 011-1h3z" />,
];

/** Where each satellite sits: ring (1 inner, 2 outer) and start angle in degrees. */
const SLOTS: readonly { ring: 1 | 2; angle: number }[] = [
  { ring: 1, angle: 0 }, // unused: index 0 is the sun
  { ring: 1, angle: -90 },
  { ring: 1, angle: 30 },
  { ring: 1, angle: 150 },
  { ring: 2, angle: 90 },
  { ring: 2, angle: 210 },
];

const STARS = [
  [14, 24, 0], [30, 72, 1], [52, 16, 2], [70, 60, 3], [84, 30, 4], [62, 86, 5],
] as const;

function Icon({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="orbit__icon">
      {ICONS[index]}
    </svg>
  );
}

/**
 * Eases the rings' rotation to a stop while the pointer or focus is inside the orbit, and back up
 * when it leaves. Both the ring spin and the nodes' counter-spin are CSS animations; changing their
 * playbackRate together keeps them in sync, so nodes stay upright and nothing jumps.
 */
function useOrbitEasing(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof CSSAnimation === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let hover = false;
    let focus = false;
    let target = 1;
    let rate = 1;
    let raf = 0;
    let last = 0;
    const apply = () => {
      for (const a of el.getAnimations({ subtree: true })) {
        if (a instanceof CSSAnimation && (a.animationName === "orbit-spin" || a.animationName === "orbit-unspin")) {
          a.updatePlaybackRate(rate);
        }
      }
    };
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Ease-out to a stop (fast), ease-in back to full speed (slower).
      const k = target < rate ? 9 : 3;
      rate += (target - rate) * (1 - Math.exp(-dt * k));
      if (Math.abs(rate - target) < 0.004) rate = target;
      apply();
      raf = rate === target ? 0 : requestAnimationFrame(step);
    };
    const update = () => {
      target = hover || focus ? 0 : 1;
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    };
    const onEnter = () => {
      hover = true;
      update();
    };
    const onLeave = () => {
      hover = false;
      update();
    };
    const onFocusIn = () => {
      focus = true;
      update();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return;
      focus = false;
      update();
    };
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}

/**
 * Interests as an orbital system. Astronomy is the sun; the other five are buttons on two slowly
 * rotating rings (CSS only; each button counter-rotates so it stays upright). One tab stop with arrow
 * keys (roving tabindex); hover or focus previews an item, click / Enter / Space selects it. The
 * readout shows the previewed or selected item's approved text. Below md the rings become a plain grid.
 */
export function InterestsOrbit() {
  const t = useT();
  const id = useId();
  const hydrated = useHydrated();
  const [selected, setSelected] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const [rover, setRover] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const orbitRef = useRef<HTMLDivElement>(null);
  useOrbitEasing(orbitRef);
  const items = t.interests.items;
  const shown = preview ?? selected;

  const focusItem = (to: number) => {
    const next = (to + items.length) % items.length;
    setRover(next);
    buttons.current[next]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    // The carousel listens for arrows too: keep these keys inside the toolbar.
    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) event.stopPropagation();
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(rover + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(rover - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(items.length - 1);
    }
  };

  const itemButton = (index: number, className: string, style?: CSSProperties, children?: ReactNode) => (
    <button
      ref={(el) => {
        buttons.current[index] = el;
      }}
      type="button"
      className={className}
      style={style}
      aria-pressed={index === selected}
      aria-describedby={`${id}-detail-${index}`}
      tabIndex={index === rover ? 0 : -1}
      data-preview={preview === index}
      onClick={() => {
        setSelected(index);
        setRover(index);
      }}
      onMouseEnter={() => setPreview(index)}
      onMouseLeave={() => setPreview(null)}
      onFocus={() => {
        setRover(index);
        setPreview(index);
      }}
      onBlur={() => setPreview(null)}
    >
      <Icon index={index} />
      <span className="orbit__label">{items[index]!.label}</span>
      {children}
    </button>
  );

  const ringNodes = (ring: 1 | 2) =>
    SLOTS.map((slot, index) => ({ slot, index }))
      .filter(({ slot, index }) => index > 0 && slot.ring === ring)
      .map(({ slot, index }) => (
        <div key={index} className="orbit__node" style={{ "--a": `${slot.angle}deg` } as CSSProperties}>
          {itemButton(index, "orbit__btn")}
        </div>
      ));

  return (
    <div className="orbit-layout">
      <div ref={orbitRef} role="toolbar" aria-label={t.interests.orbitLabel} className="orbit" onKeyDown={onKeyDown}>
        <span className="orbit__path orbit__path--1" aria-hidden="true" />
        <span className="orbit__path orbit__path--2" aria-hidden="true" />
        {itemButton(
          0,
          "orbit__sun",
          undefined,
          <span className="starfield" aria-hidden="true">
            {STARS.map(([x, y, k]) => (
              <span key={k} style={{ left: `${x}%`, top: `${y}%`, "--k": k } as CSSProperties} />
            ))}
          </span>,
        )}
        <div className="orbit__ring orbit__ring--1">{ringNodes(1)}</div>
        <div className="orbit__ring orbit__ring--2">{ringNodes(2)}</div>
      </div>
      <div className="orbit-readout">
        {items.map((item, index) => (
          <div
            key={item.label}
            id={`${id}-detail-${index}`}
            className="orbit-readout__item"
            hidden={hydrated && index !== shown}
          >
            <h3>{item.label}</h3>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
