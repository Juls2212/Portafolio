"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import { DURATION } from "@/lib/motion";

const GLYPHS = "01!<>/\\[]{}#$%&*+-=?01";
const SCRAMBLE_MS = 55;

/**
 * Heading text that resolves from random symbols and 1/0 into the real text (once, ~600 ms) when it
 * enters the viewport. The real characters are always the element's content (so screen readers,
 * search and copy see the true text) and they keep their place in the layout, so nothing moves:
 * until a character resolves it is transparent and a scrambled glyph is drawn over it by CSS
 * (`.dc[data-g]::before`, content from the data-g attribute, so no extra DOM). Reduced motion and
 * language switches after the first reveal show the final text immediately.
 */
export function DecodeText({ text }: { text: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const played = useRef(false);
  const words = useMemo(() => text.split(" "), [text]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const cells = [...el.querySelectorAll<HTMLElement>(".dc")];
    const random = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
    const resolve = (c: HTMLElement) => {
      c.dataset.r = "1";
      delete c.dataset.g;
    };

    const finish = () => {
      cells.forEach(resolve);
      el.dataset.state = "done";
      played.current = true;
    };
    // Switching language after the reveal (or reduced motion): show the final text, no replay.
    if (played.current || document.documentElement.dataset.motion === "reduced") {
      finish();
      return;
    }

    el.dataset.state = "pending";
    cells.forEach((c) => {
      delete c.dataset.r;
      c.dataset.g = random();
    });

    let frame = 0;
    const play = () => {
      el.dataset.state = "running";
      const start = performance.now();
      const n = cells.length;
      const at = cells.map((_, i) => (i / n) * DURATION.decode * 0.72 + Math.random() * DURATION.decode * 0.28);
      let lastScramble = 0;
      const step = (now: number) => {
        const t = now - start;
        const doScramble = now - lastScramble > SCRAMBLE_MS;
        if (doScramble) lastScramble = now;
        let remaining = 0;
        cells.forEach((c, i) => {
          if (c.dataset.r) return;
          if (t >= at[i]!) resolve(c);
          else {
            remaining++;
            if (doScramble) c.dataset.g = random();
          }
        });
        if (remaining > 0 && !document.hidden) frame = requestAnimationFrame(step);
        else finish();
      };
      frame = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        play();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [text]);

  return (
    <span ref={root} className="decode" data-state="pending">
      {words.map((word, wi) => (
        <Fragment key={wi}>
          {wi > 0 && " "}
          <span className="decode__word">
            {[...word].map((ch, ci) => (
              <span key={ci} className="dc">
                {ch}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
