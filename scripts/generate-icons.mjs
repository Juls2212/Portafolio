// Generates the site icons from one hand-drawn "JP" monogram (outlined strokes, no font dependency).
// Outputs: src/app/icon.svg, src/app/apple-icon.png (180x180), src/app/favicon.ico (16/32/48).
// Run with: node scripts/generate-icons.mjs
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const BG = "#08140F";
const NEON = "#1FE08F";
const NEON_HI = "#5CFFB1";

const letters = `
  <g fill="none" stroke="url(#g)" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(-2 0)">
    <path d="M31 17V37Q31 46 23 46Q16 46 15 40"/>
    <path d="M39 47V17H47Q55 17 55 26Q55 35 47 35H39"/>
  </g>`;
const defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NEON_HI}"/><stop offset="1" stop-color="${NEON}"/></linearGradient></defs>`;

const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${defs}
  <rect x="2" y="2" width="60" height="60" rx="14" fill="${BG}" stroke="${NEON}" stroke-width="2.5"/>${letters}
</svg>
`;
// Apple masks the corners itself, so this one is a full-bleed square with a thin inner border.
const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${defs}
  <rect width="64" height="64" fill="${BG}"/><rect x="3" y="3" width="58" height="58" rx="12" fill="none" stroke="${NEON}" stroke-opacity=".7" stroke-width="1.6"/>${letters}
</svg>
`;

writeFileSync("src/app/icon.svg", rounded);

const png = (svg, size) => sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toBuffer();
writeFileSync("src/app/apple-icon.png", await png(square, 180));

// ICO container with embedded PNG images.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((s) => png(rounded, s)));
const head = Buffer.alloc(6);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);
  e.writeUInt8(s, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(images[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return e;
});
writeFileSync("src/app/favicon.ico", Buffer.concat([head, ...dir, ...images]));

// Preview sheet (not shipped) for checking small sizes.
if (process.argv[2]) {
  const tiles = await Promise.all([16, 32, 64, 180].map((s) => png(rounded, s)));
  const sheet = sharp({ create: { width: 320, height: 200, channels: 4, background: "#222" } });
  let x = 10;
  const comps = tiles.map((b, i) => { const c = { input: b, left: x, top: 10 }; x += [16, 32, 64, 180][i] + 10; return c; });
  await sheet.composite(comps).png().toFile(process.argv[2]);
}
