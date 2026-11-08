export type HomePanelId = "about" | "presentation" | "interests";

/** Carousel ring order (left to right at load). Presentation (index 1) is active first. */
export const HOME_PANELS: readonly { id: HomePanelId; code: string; accent: "neon" | "teal" | "lime" }[] = [
  { id: "about", code: "P/02", accent: "teal" },
  { id: "presentation", code: "P/01", accent: "neon" },
  { id: "interests", code: "P/03", accent: "lime" },
];

export const DEFAULT_PANEL = 1;
