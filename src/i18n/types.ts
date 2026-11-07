export type Lang = "es" | "en";

export const LANGS = ["es", "en"] as const satisfies readonly Lang[];

/** A user-facing value available in every supported language. */
export type Localized<T = string> = { readonly [L in Lang]: T };

/** Shape every dictionary must satisfy: a missing key is a compile error. */
export interface Dictionary {
  meta: { title: string; description: string };
  a11y: {
    skipToContent: string;
    languageGroup: string;
    roomRegion: string;
    hudStatus: string;
  };
  common: { tbd: string };
  intro: { skipHint: string };
  hud: {
    lineProfile: string;
    lineEnv: string;
    lineLevel: string;
    levelLabel: string;
  };
  presentation: {
    eyebrow: string;
    greeting: string;
    role: string;
    tagline: string;
    downloadCv: string;
    viewProjects: string;
  };
  about: {
    eyebrow: string;
    title: string;
    text: string;
    openDialog: string;
    dialog: {
      title: string;
      photoPlaceholder: string;
      extraPlaceholder: string;
      close: string;
    };
  };
  interests: {
    eyebrow: string;
    title: string;
    items: readonly [string, string, string, string];
    more: string;
  };
  projects: { eyebrow: string; title: string; body: string };
}
