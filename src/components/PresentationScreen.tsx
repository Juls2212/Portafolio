"use client";

import { ScreenFrame } from "@/components/ScreenFrame";
import { profile } from "@/data/profile";
import { useT } from "@/i18n/language-context";

export function PresentationScreen() {
  const t = useT();

  return (
    <ScreenFrame titleId="screen-presentation-title" position="center" accent="neon" order={1}>
      <p className="screen__eyebrow">{t.presentation.eyebrow}</p>
      <h1 id="screen-presentation-title" className="screen__hero">
        {t.presentation.greeting}{" "}
        <span className="bg-linear-to-r from-neon via-neon-hi to-lime bg-clip-text text-transparent">
          {profile.name}
        </span>
      </h1>
      <p className="screen__role">{t.presentation.role}</p>
      <p className="screen__text">{t.presentation.tagline}</p>
      <div className="screen__actions">
        {/* CV file is not defined yet: kept focusable but inert. */}
        <button
          type="button"
          className="btn btn--primary"
          aria-disabled="true"
          onClick={(event) => event.preventDefault()}
        >
          {t.presentation.downloadCv}
          <span className="btn__tbd">{t.common.tbd}</span>
        </button>
        <a href="#projects" className="btn btn--ghost">
          {t.presentation.viewProjects}
        </a>
      </div>
    </ScreenFrame>
  );
}
