import { existsSync } from "node:fs";
import path from "node:path";
import { cvPath, photo } from "@/data/assets";
import type { AssetAvailability } from "@/data/assets";

const exists = (publicPath: string) => existsSync(path.join(process.cwd(), "public", publicPath));

/** Server-only: a missing file turns into a disabled button / labeled placeholder, never a broken link. */
export function getAssetAvailability(): AssetAvailability {
  return {
    cv: { es: exists(cvPath("es")), en: exists(cvPath("en")) },
    photo: exists(photo.src),
  };
}
