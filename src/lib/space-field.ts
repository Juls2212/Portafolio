/**
 * Deterministic starfield with a few constellations, plus the pure drawing routine used by the
 * EXPLORE background canvas. Positions are normalised (0..1); depth `d` scales how far a star
 * shifts with scroll and pointer (far = small). Constellation members share one depth, so a
 * constellation moves as a rigid shape and wraps as a group.
 */
export interface Star {
  x: number;
  y: number;
  d: number;
  size: number;
  alpha: number;
  /** Constellation index, or -1 for a loose star. */
  cluster: number;
  /** Colour slot: 0 neon-hi, 1 teal, 2 lime. */
  tone: 0 | 1 | 2;
}

export interface Edge {
  a: number;
  b: number;
  /** Extra links only show in the dense (Experience) state. */
  extra: boolean;
}

export interface Field {
  stars: Star[];
  edges: Edge[];
  clusterCenters: { x: number; y: number }[];
}

function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const CLUSTERS = 8;
const PER_CLUSTER = 6;

export function createField(count: number): Field {
  const rand = rng(20260);
  const stars: Star[] = [];
  const edges: Edge[] = [];
  const clusterCenters: { x: number; y: number }[] = [];

  for (let c = 0; c < CLUSTERS; c++) {
    const cx = 0.08 + rand() * 0.84;
    const cy = rand();
    const d = 0.35 + rand() * 0.55;
    clusterCenters.push({ x: cx, y: cy });
    const first = stars.length;
    for (let i = 0; i < PER_CLUSTER; i++) {
      stars.push({
        x: cx + (rand() - 0.5) * 0.14,
        y: cy + (rand() - 0.5) * 0.2,
        d,
        size: 0.9 + rand() * 1.1,
        alpha: 0.38 + rand() * 0.2,
        cluster: c,
        tone: (c % 3) as 0 | 1 | 2,
      });
    }
    // Chain through the members in x order, then a couple of extra cross links.
    const ids = Array.from({ length: PER_CLUSTER }, (_, i) => first + i).sort((p, q) => stars[p]!.x - stars[q]!.x);
    for (let i = 0; i < ids.length - 1; i++) edges.push({ a: ids[i]!, b: ids[i + 1]!, extra: false });
    edges.push({ a: ids[0]!, b: ids[2]!, extra: true }, { a: ids[1]!, b: ids[4]!, extra: true }, { a: ids[2]!, b: ids[5]!, extra: true });
  }
  // Dense state: neighbouring constellations are joined too.
  for (let c = 0; c < CLUSTERS - 1; c++) edges.push({ a: c * PER_CLUSTER + 5, b: (c + 1) * PER_CLUSTER, extra: true });

  const loose = Math.max(0, count - stars.length);
  for (let i = 0; i < loose; i++) {
    stars.push({
      x: rand(),
      y: rand(),
      d: 0.12 + rand() * 0.88,
      size: 0.5 + rand() * 1.1,
      alpha: 0.2 + rand() * 0.3,
      cluster: -1,
      tone: rand() < 0.7 ? 0 : rand() < 0.5 ? 1 : 2,
    });
  }
  return { stars, edges, clusterCenters };
}

export interface DrawParams {
  width: number;
  height: number;
  dpr: number;
  scrollY: number;
  /** Pointer in -1..1. */
  nx: number;
  ny: number;
  /** 0 = base constellations, 1 = dense and brighter (Experience). */
  density: number;
  colors: readonly [string, string, string];
  /** Viewport rects (text blocks) where nothing is drawn, so stars and lines never sit behind text. */
  exclude?: readonly { x: number; y: number; w: number; h: number }[];
}

const SCROLL_RATE = 0.28;
const POINTER_PX = 20;
const mod = (v: number, m: number) => ((v % m) + m) % m;

/** Screen position of a normalised point at depth d. Wraps vertically with a margin. */
function place(x: number, y: number, d: number, p: DrawParams) {
  const wrapH = p.height + 80;
  return {
    x: x * p.width - p.nx * d * POINTER_PX,
    y: mod(y * p.height - p.scrollY * d * SCROLL_RATE - p.ny * d * POINTER_PX * 0.6, wrapH) - 40,
  };
}

export function drawField(ctx: CanvasRenderingContext2D, field: Field, p: DrawParams) {
  ctx.setTransform(p.dpr, 0, 0, p.dpr, 0, 0);
  ctx.clearRect(0, 0, p.width, p.height);
  if (p.exclude && p.exclude.length > 0) {
    const hole = new Path2D();
    hole.rect(0, 0, p.width, p.height);
    for (const r of p.exclude) hole.rect(r.x, r.y, r.w, r.h);
    ctx.save();
    ctx.clip(hole, "evenodd");
  }

  // Constellations move rigidly: one wrap offset per cluster, taken from its centre.
  const wrapH = p.height + 80;
  const shift = field.clusterCenters.map((c, i) => {
    const d = field.stars[i * PER_CLUSTER]!.d;
    const centre = place(c.x, c.y, d, p);
    return { dx: -p.nx * d * POINTER_PX, dy: centre.y - c.y * p.height };
  });
  const pos = field.stars.map((s) => {
    if (s.cluster < 0) return place(s.x, s.y, s.d, p);
    const sh = shift[s.cluster]!;
    return { x: s.x * p.width + sh.dx, y: s.y * p.height + sh.dy };
  });

  // Lines first (under the stars). Base chains are faint; extras fade in with density.
  ctx.lineWidth = 1;
  for (const e of field.edges) {
    const a = pos[e.a]!;
    const b = pos[e.b]!;
    if (Math.abs(a.y - b.y) > wrapH / 2) continue; // never draw across a wrap
    const alpha = e.extra ? 0.04 + 0.2 * p.density : 0.09 + 0.1 * p.density;
    if (alpha < 0.02) continue;
    const star = field.stars[e.a]!;
    ctx.strokeStyle = p.colors[star.tone];
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  for (let i = 0; i < field.stars.length; i++) {
    const s = field.stars[i]!;
    const q = pos[i]!;
    if (q.y < -4 || q.y > p.height + 4) continue;
    ctx.fillStyle = p.colors[s.tone];
    ctx.globalAlpha = s.alpha * (s.cluster >= 0 ? 0.8 + 0.4 * p.density : 1);
    ctx.beginPath();
    ctx.arc(q.x, q.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (p.exclude && p.exclude.length > 0) ctx.restore();
}
