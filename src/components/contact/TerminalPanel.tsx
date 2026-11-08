"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/language-context";

const TYPE_MS = 55;
const HOLD_MS = 2200;

/**
 * Decorative terminal window that types a looping sequence of harmless status lines.
 * It only runs while visible (IntersectionObserver) and shows all lines at once under reduced motion.
 */
export function TerminalPanel() {
  const t = useT();
  const lines = t.contact.terminal.lines;
  const total = lines.reduce((sum, l) => sum + l.length, 0);
  const [chars, setChars] = useState(0);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Type, hold, restart. Only while on screen and with motion allowed.
  useEffect(() => {
    if (!visible || reduced) return;
    const id = window.setInterval(() => {
      setChars((c) => (c >= total + Math.round(HOLD_MS / TYPE_MS) ? 0 : c + 1));
    }, TYPE_MS);
    return () => window.clearInterval(id);
  }, [visible, reduced, total]);

  const budget = reduced ? Number.MAX_SAFE_INTEGER : chars;
  const typed = lines.map((line, i) => {
    const before = lines.slice(0, i).reduce((sum, l) => sum + l.length, 0);
    const shown = line.slice(0, Math.max(0, Math.min(line.length, budget - before)));
    return { shown, done: shown.length >= line.length };
  });
  const pending = typed.findIndex((l) => !l.done);
  const cursorAt = reduced || pending === -1 ? lines.length - 1 : pending;

  return (
    <div ref={ref} className="term" aria-hidden="true">
      <div className="term__bar">
        <span className="term__dot" />
        <span className="term__dot" />
        <span className="term__dot" />
        <span className="term__title">{t.contact.terminal.title}</span>
      </div>
      <div className="term__body">
        {typed.map((line, i) => (
          <p key={i} className="term__line">
            {line.shown}
            {i === cursorAt && <span className="term__cursor" />}
          </p>
        ))}
      </div>
    </div>
  );
}
