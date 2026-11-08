import { imageMeta } from "@/data/generated/image-meta";
import type { Lang } from "@/i18n/types";

/** Which optional files exist in /public. Computed at build time on the server. */
export interface AssetAvailability {
  cv: Record<Lang, boolean>;
  photo: boolean;
}

export const cvPath = (lang: Lang) => `/cv/cv-${lang}.pdf`;

/** About photo: src and size come from the real file (scripts/sync-assets.mjs). Shown whole, any ratio. */
export const photo = imageMeta["personal.jpeg"] ?? { src: "/about/personal.jpeg", width: 3, height: 4 };
