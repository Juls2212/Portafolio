"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { DEFAULT_LANG, dictionaries } from "./dictionaries";
import type { Dictionary, Lang } from "./types";

const STORAGE_KEY = "portfolio.lang";

/**
 * Tiny external store: the server (and the first hydration pass) always sees
 * the default language; the stored/detected one is applied right after mount.
 */
let current: Lang | null = null;
const listeners = new Set<() => void>();

function detectLang(): Lang {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") return stored;
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : DEFAULT_LANG;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): Lang => (current ??= detectLang());
const getServerSnapshot = (): Lang => DEFAULT_LANG;

interface LanguageValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLang = useCallback((next: Lang) => {
    current = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
    listeners.forEach((l) => l());
  }, []);

  const t = dictionaries[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.meta.title;
    const setMeta = (selector: string, content: string) =>
      document.head.querySelector(selector)?.setAttribute("content", content);
    setMeta('meta[name="description"]', t.meta.description);
    setMeta('meta[property="og:title"]', t.meta.title);
    setMeta('meta[property="og:description"]', t.meta.description);
    setMeta('meta[property="og:locale"]', lang === "es" ? "es" : "en");
  }, [lang, t]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguageValue(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useT/useLang must be used inside <LanguageProvider>");
  return value;
}

/** Current dictionary. */
export const useT = (): Dictionary => useLanguageValue().t;

/** Current language and its setter. */
export function useLang(): Pick<LanguageValue, "lang" | "setLang"> {
  const { lang, setLang } = useLanguageValue();
  return { lang, setLang };
}
