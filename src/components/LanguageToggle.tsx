"use client";

import { useLang, useT } from "@/i18n/language-context";
import { LANGS } from "@/i18n/types";
import type { Lang } from "@/i18n/types";

/** Language autonyms are never translated. */
const LANGUAGE_NAMES: Record<Lang, string> = { es: "Español", en: "English" };

export function LanguageToggle() {
  const t = useT();
  const { lang, setLang } = useLang();

  return (
    <div role="group" aria-label={t.a11y.languageGroup} className="lang-toggle">
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-label={LANGUAGE_NAMES[code]}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className="lang-toggle__btn"
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
