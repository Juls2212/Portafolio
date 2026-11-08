import { CanvasTexture, LinearMipmapLinearFilter, LinearFilter, SRGBColorSpace } from "three";
import { keyboardKeys } from "@/data/technologies";
import type { KeyDef } from "@/data/technologies";

export const ATLAS_SLOTS = 8;
const CELL = 128;
/** Inner padding inside a cell, as a fraction of the cell, so mipmaps never bleed between logos. */
export const ATLAS_PAD = 0.11;

/** Slot of each key in the atlas (row-major, in `keyboardKeys` order). */
export function atlasSlot(index: number): { col: number; row: number } {
  return { col: index % ATLAS_SLOTS, row: Math.floor(index / ATLAS_SLOTS) };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function drawArrow(ctx: CanvasRenderingContext2D, direction: KeyDef["direction"], size: number) {
  const c = size / 2;
  const r = size * 0.36;
  const angle = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI }[direction ?? "up"];
  ctx.save();
  ctx.translate(c, c);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(-r * 0.7, r * 0.85);
  ctx.lineTo(-r * 0.7, -r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawInitials(ctx: CanvasRenderingContext2D, text: string, size: number) {
  ctx.font = `700 ${size * 0.42}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, size / 2);
  // Dashed frame marks this as a fallback, not a real logo.
  ctx.lineWidth = size * 0.03;
  ctx.setLineDash([size * 0.06, size * 0.05]);
  ctx.strokeRect(size * 0.1, size * 0.1, size * 0.8, size * 0.8);
}

/**
 * One alpha-mask atlas holding every logo (and arrow glyph). The shader tints it,
 * so the whole keyboard needs a single texture and a single draw call for caps.
 */
export async function createLogoAtlas(): Promise<CanvasTexture> {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = CELL * ATLAS_SLOTS;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");

  const images = await Promise.all(
    keyboardKeys.map((key) => (key.tech?.logo ? loadImage(key.tech.logo).catch(() => null) : null)),
  );

  keyboardKeys.forEach((key, index) => {
    const { col, row } = atlasSlot(index);
    const inner = CELL * (1 - ATLAS_PAD * 2);
    ctx.save();
    ctx.translate(col * CELL + CELL * ATLAS_PAD, row * CELL + CELL * ATLAS_PAD);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    const img = images[index];
    if (key.kind === "arrow") drawArrow(ctx, key.direction, inner);
    else if (img) ctx.drawImage(img, 0, 0, inner, inner);
    else drawInitials(ctx, key.tech?.initials ?? "", inner);
    ctx.restore();
  });

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  return texture;
}
