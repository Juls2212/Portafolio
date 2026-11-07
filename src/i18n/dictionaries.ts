import { en } from "./en";
import { es } from "./es";
import type { Dictionary, Lang } from "./types";

export const dictionaries: Record<Lang, Dictionary> = { es, en };

export const DEFAULT_LANG: Lang = "es";
