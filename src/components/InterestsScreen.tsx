"use client";

import { ScreenFrame } from "@/components/ScreenFrame";
import { useT } from "@/i18n/language-context";

export function InterestsScreen() {
  const t = useT();

  return (
    <ScreenFrame titleId="screen-interests-title" position="right" accent="lime" order={2}>
      <p className="screen__eyebrow">{t.interests.eyebrow}</p>
      <h2 id="screen-interests-title" className="screen__title">
        {t.interests.title}
      </h2>
      <ul className="interest-list">
        {t.interests.items.map((item, index) => (
          <li key={index}>
            <span className="interest-list__n" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            {item}
          </li>
        ))}
      </ul>
      <div className="screen__actions">
        {/* Destination not defined yet: kept focusable but inert. */}
        <button
          type="button"
          className="btn btn--ghost"
          aria-disabled="true"
          onClick={(event) => event.preventDefault()}
        >
          {t.interests.more}
          <span className="btn__tbd">{t.common.tbd}</span>
        </button>
      </div>
    </ScreenFrame>
  );
}
