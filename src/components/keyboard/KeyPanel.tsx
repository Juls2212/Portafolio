"use client";

import { keyById } from "@/data/technologies";
import { useLang, useT } from "@/i18n/language-context";
import { keyboardActions, useKeyboardState } from "@/lib/keyboard-store";

/** Localized details of the selected key. Announced politely to assistive tech. */
export function KeyPanel() {
  const t = useT();
  const { lang } = useLang();
  const { selectedId } = useKeyboardState();
  const tech = selectedId ? keyById.get(selectedId)?.tech : undefined;

  return (
    <aside className="key-panel" data-keyboard-ignore data-open={Boolean(tech)} aria-label={t.stack.panel.label}>
      <span className="corner corner--tl" aria-hidden="true" />
      <span className="corner corner--br" aria-hidden="true" />
      <div role="status" aria-live="polite">
        {tech ? (
          <>
            <p className="screen__eyebrow key-panel__category">{tech.category[lang]}</p>
            <h3 className="key-panel__name">{tech.name}</h3>
            <p className="key-panel__text">{tech.description[lang]}</p>
            <span className="sr-only">{t.stack.selectedSuffix}</span>
          </>
        ) : (
          <p className="key-panel__text key-panel__text--empty">{t.stack.panel.empty}</p>
        )}
      </div>
      {tech && (
        <button type="button" className="btn btn--ghost key-panel__close" onClick={() => keyboardActions.select(null)}>
          {t.stack.panel.close}
        </button>
      )}
    </aside>
  );
}
