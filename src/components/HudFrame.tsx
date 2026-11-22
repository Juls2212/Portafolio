"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { modules } from "@/data/modules";
import { useLang, useT } from "@/i18n/language-context";
import { useActiveModule } from "@/lib/active-module";
import { useSiteMode } from "@/lib/site-mode";

const pad = (n: number) => String(n).padStart(2, "0");

/** Client time, refreshed once a minute. Empty on the server and first render (no hydration mismatch). */
function LocalTime() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
    };
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="hud-frame__time">{time}</span>;
}

/**
 * Small mono readouts that frame the screen: static system label, current module, real scroll
 * progress (EXPLORE), client time, and five ticks along the left edge. Decorative: aria-hidden,
 * pointer-events none. The scroll percentage is a CSS counter fed by --pct (no re-render on scroll).
 */
export function HudFrame() {
  const t = useT();
  const { lang } = useLang();
  const activeId = useActiveModule();
  const mode = useSiteMode();
  const active = modules.find((m) => m.id === activeId) ?? modules[0];

  return (
    <div className="hud-frame" aria-hidden="true">
      <ol className="hud-ticks">
        {modules.map((m) => (
          <li key={m.id} data-on={m.id === active.id} />
        ))}
      </ol>
      <p className="hud-frame__sys hud-boot" style={{ "--b": 5 } as CSSProperties}>
        <span className="hud-frame__led" />
        {t.hud.sysOnline}
      </p>
      <p className="hud-frame__readout hud-boot" style={{ "--b": 6 } as CSSProperties}>
        <span className="hud-frame__module">{active.label[lang]}</span>
        {mode === "explore" && (
          <span className="hud-frame__scroll">
            {t.hud.scroll} <span className="hud-frame__pct" />
          </span>
        )}
        <LocalTime />
      </p>
    </div>
  );
}
