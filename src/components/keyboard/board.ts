import { BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { KEYBOARD_COLS, KEYBOARD_ROWS } from "@/data/technologies";

/** Board dimensions in world units (1 unit = one key pitch). */
export const PITCH = 1;
export const CAP_SIZE = 0.9;
export const CAP_HEIGHT = 0.46;
export const CAP_DISH = 0.05;
export const BASE_PADDING = 0.55;
export const BASE_HEIGHT = 0.55;
/** Gap between the base top and the underside of a resting keycap. */
export const CAP_LIFT = 0.04;

export const BOARD_WIDTH = KEYBOARD_COLS * PITCH;
export const BOARD_DEPTH = KEYBOARD_ROWS * PITCH;
export const BASE_WIDTH = BOARD_WIDTH + BASE_PADDING;
export const BASE_DEPTH = BOARD_DEPTH + BASE_PADDING;
/** Local y of the (undished) top plane of a resting keycap: used for the pointer math. */
export const KEY_TOP_Y = CAP_LIFT + CAP_HEIGHT - CAP_DISH * 0.4;

export function cellCenter(row: number, col: number): { x: number; z: number } {
  return {
    x: (col - (KEYBOARD_COLS - 1) / 2) * PITCH,
    z: (row - (KEYBOARD_ROWS - 1) / 2) * PITCH,
  };
}

/** Pure-math hit test: local-space point on the key plane to a grid cell. */
export function cellFromLocal(x: number, z: number): { row: number; col: number } | null {
  const col = Math.floor(x / PITCH + KEYBOARD_COLS / 2);
  const row = Math.floor(z / PITCH + KEYBOARD_ROWS / 2);
  if (row < 0 || row >= KEYBOARD_ROWS || col < 0 || col >= KEYBOARD_COLS) return null;
  return { row, col };
}

/** Rounded, slightly tapered keycap with a concave top. Origin sits at the bottom center. */
export function createKeycapGeometry(): BufferGeometry {
  const geometry = new RoundedBoxGeometry(CAP_SIZE, CAP_HEIGHT, CAP_SIZE, 5, 0.11);
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  if (!position || !normal) return geometry;
  const half = CAP_SIZE / 2;

  for (let i = 0; i < position.count; i++) {
    let x = position.getX(i);
    let y = position.getY(i);
    let z = position.getZ(i);
    const t = (y + CAP_HEIGHT / 2) / CAP_HEIGHT;
    const taper = 1 - 0.1 * t;
    x *= taper;
    z *= taper;

    const topness = Math.max(0, Math.min(1, (normal.getY(i) - 0.7) / 0.3));
    if (topness > 0) {
      const r2 = Math.min(1, (x * x + z * z) / (half * half));
      y -= CAP_DISH * (1 - r2) * topness;
      const nx = normal.getX(i) - ((2 * CAP_DISH * x) / (half * half)) * topness;
      const nz = normal.getZ(i) - ((2 * CAP_DISH * z) / (half * half)) * topness;
      const ny = normal.getY(i);
      const len = Math.hypot(nx, ny, nz) || 1;
      normal.setXYZ(i, nx / len, ny / len, nz / len);
    }
    position.setXYZ(i, x, y, z);
  }
  geometry.translate(0, CAP_HEIGHT / 2, 0);
  position.needsUpdate = true;
  normal.needsUpdate = true;
  return geometry;
}
