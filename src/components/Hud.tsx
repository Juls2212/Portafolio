"use client";

import { useEffect, useState } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { modules } from "@/data/modules";
import type { ModuleId } from "@/data/modules";
import { profile } from "@/data/profile";
import { useLang, useT } from "@/i18n/language-context";
import { useIntroDone } from "@/lib/intro-store";

const TYPE_INTERVAL_MS = 26;
const pad = (n: number) => String(n).padStart(2, "0");

/** Characters revealed so far. Persisting it across language switches means no replay. */
function useTypedChars(active: boolean): number {
  const [chars, setChars] = useState(0);
  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setInterval(
      () => setChars((c) => (reduced ? Number.MAX_SAFE_INTEGER : c + 1)),
      reduced ? 0 : TYPE_INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, [active]);
  return chars;
}

/** Keeps the counter in sync with whichever module section is crossing the viewport middle. */
function useActiveModule(): ModuleId {
  const [active, setActive] = useState<ModuleId>("room");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id as ModuleId);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    modules.forEach((m) => {
      const el = document.getElementById(m.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return active;
}

/** Bottom HUD label; lives at the foot of the room so it never overlaps stacked screens. */
export function LevelLabel() {
  const t = useT();
  return <p className="hud-level">{t.hud.levelLabel}</p>;
}

export function Hud() {
  const t = useT();
  const { lang } = useLang();
  const introDone = useIntroDone();
  const chars = useTypedChars(introDone);
  const activeId = useActiveModule();

  const active = modules.find((m) => m.id === activeId) ?? modules[0];
  const lines = [`${t.hud.lineProfile} ${profile.name}`, t.hud.lineEnv, t.hud.lineLevel];

  let remaining = chars;
  const typed = lines.map((line) => {
    const visible = Math.max(0, Math.min(line.length, remaining));
    remaining -= line.length;
    return { full: line, shown: line.slice(0, visible), complete: visible >= line.length };
  });
  const cursorLine = typed.findIndex((l) => !l.complete);
  const cursorAt = cursorLine === -1 ? typed.length - 1 : cursorLine;

  return (
    <>
      <header className="hud hud--top">
        <div className="hud__terminal" role="status" aria-label={t.a11y.hudStatus}>
          <span className="sr-only">{lines.join(". ")}</span>
          <div aria-hidden="true">
            {typed.map((line, i) => (
              <p key={i} className="hud__line" data-visible={line.shown.length > 0}>
                {line.shown}
                {i === cursorAt && <span className="hud__cursor" />}
              </p>
            ))}
          </div>
        </div>
        <div className="hud__right">
          <p className="hud__counter">
            {pad(active.number)} / {pad(modules.length)} · {active.label[lang]}
          </p>
          <LanguageToggle />
        </div>
      </header>
    </>
  );
}
