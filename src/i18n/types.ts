export type Lang = "es" | "en";

export const LANGS = ["es", "en"] as const satisfies readonly Lang[];

/** A user-facing value available in every supported language. */
export type Localized<T = string> = { readonly [L in Lang]: T };

/** Shape every dictionary must satisfy: a missing key is a compile error. */
export interface InterestItem {
  label: string;
  detail: string;
}

export interface Facet {
  label: string;
  text: string;
}

export interface Dictionary {
  meta: { title: string; description: string };
  a11y: {
    skipToContent: string;
    languageGroup: string;
    roomRegion: string;
    hudStatus: string;
  };
  common: { tbd: string; newTab: string };
  intro: { skipHint: string };
  hud: {
    lineProfile: string;
    lineEnv: string;
    lineLevel: string;
    levelLabel: string;
    back: string;
    sysOnline: string;
    scroll: string;
    motionOn: string;
    motionReduced: string;
    motionToReduced: string;
    motionToOn: string;
    motionSystem: string;
    motionSite: string;
  };
  debug: {
    title: string;
    copy: string;
    copied: string;
    copyFailed: string;
    close: string;
    hint: string;
    errors: string;
    none: string;
  };
  globe: {
    nodes: readonly [string, string, string];
  };
  presentation: {
    eyebrow: string;
    name: string;
    greeting: string;
    role: string;
    tagline: string;
    downloadCv: string;
    start: string;
  };
  about: {
    eyebrow: string;
    title: string;
    /** The approved About copy, one sentence (or pair) per facet. */
    facets: readonly [Facet, Facet, Facet, Facet];
    facetsLabel: string;
    teaserTitle: string;
    teaserLine: string;
    photoAlt: string;
    photoPlaceholder: string;
    profileLabel: string;
  };
  interests: {
    eyebrow: string;
    name: string;
    title: string;
    items: readonly [InterestItem, InterestItem, InterestItem, InterestItem, InterestItem, InterestItem];
    orbitLabel: string;
    teaserTitle: string;
    teaserLine: string;
  };
  home: {
    carouselLabel: string;
    slide: string;
    previous: string;
    next: string;
    indicatorLabel: string;
    open: string;
    openHint: string;
    active: string;
    windows: { presentation: string; about: string; interests: string };
    widgetLabel: string;
  };
  projects: {
    eyebrow: string;
    title: string;
    listLabel: string;
    previous: string;
    next: string;
    progressLabel: string;
    goTo: string;
    viewRepo: string;
    newTab: string;
    credits: string;
    technologies: string;
    imageAlt: string;
    imageMissing: string;
  };
  experience: {
    title: string;
    testimonialsTitle: string;
    pendingApproval: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    intro: string;
    fields: { name: string; email: string; message: string };
    submit: string;
    emailPending: string;
    mailHint: string;
    mailSubject: string;
    socialTitle: string;
    socialAria: { linkedin: string; github: string };
    emailLabel: string;
    emailAria: string;
    copyAria: string;
    copied: string;
    copyFailed: string;
    terminal: { title: string; lines: readonly string[] };
  };
  stack: {
    eyebrow: string;
    title: string;
    intro: string;
    hint: string;
    keyboardLabel: string;
    selectedSuffix: string;
    arrows: { up: string; down: string; left: string; right: string };
    panel: { label: string; empty: string; close: string };
  };
}
