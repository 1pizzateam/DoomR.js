import { mulberry32 } from './rng.js';

/**
 * What a bullet leaves behind and what it throws up, as pixel art drawn here in code (no image files): bullet holes in
 * steel (twelve kinds: clean punctures, torn petals, ricochet scrapes, cracked plate, double hits, dents, scorched ones) and the sparks of a pellet striking metal (four kinds, five frames each). One 32 x 32 cell
 * each, in a single row, padded to a power of two. The holes are flat quads on a wall face (see `holeQuad`), the sparks
 * are a short animation on a sprite that faces the camera.
 */

export const IMPACT_CELL = 32;
export const IMPACT_CELL_COUNT = 32;
export const HOLE_VARIANTS = 12;
export const SPARK_FRAMES = 5;
export const SPARK_VARIANTS = 4;
export const IMPACT_CELLS = { hole: 0, spark: HOLE_VARIANTS };

// marks stop this far short of the edge of a face, so none sits right on a corner
const EDGE = 0.3;
// a hole is a square this many world units across: the crater is a quarter of it, so about 3 units, and its cracks reach
// a little further
const HOLE_SIZE = 16;

const CHAR = [5, 7, 11];
const SCORCH = [12, 15, 23];
const CRACK = [8, 10, 16];
const RIM = [112, 130, 160];
const CHIP = [150, 168, 196];
const FLASH = [255, 252, 226];
const YELLOW = [255, 220, 110];
const ORANGE = [255, 150, 46];
const EMBER = [196, 78, 28];

const mid = (IMPACT_CELL - 1) / 2;

class Cell {
  constructor() {
    this.pixels = new Uint8Array(IMPACT_CELL * IMPACT_CELL * 4);
  }

  put(x, y, color, over = true) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= IMPACT_CELL || y >= IMPACT_CELL)
      return;
    const o = (y * IMPACT_CELL + x) * 4;
    if (!over && this.pixels[o + 3])
      return;
    this.pixels[o] = color[0];
    this.pixels[o + 1] = color[1];
    this.pixels[o + 2] = color[2];
    this.pixels[o + 3] = 255;
  }

  line(x0, y0, x1, y1, color, over = true) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5) || 1;
    for (let i = 0; i <= steps; i++)
      this.put(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, color, over);
  }
}

const SHADE = [28, 34, 48];
const BARE = [138, 154, 182];

/** Fills an ellipse (radii rx, ry, turned by `turn`), calling `paint(x, y, d, lit)` where d is 0 at the middle and 1 at the edge. */
function ellipse(cx, cy, rx, ry, turn, paint) {
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const reach = Math.ceil(Math.max(rx, ry) + 2);
  for (let y = Math.floor(cy - reach); y <= Math.ceil(cy + reach); y++) {
    for (let x = Math.floor(cx - reach); x <= Math.ceil(cx + reach); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const u = (dx * cos + dy * sin) / rx;
      const v = (-dx * sin + dy * cos) / ry;
      // which way the rim faces: lit on the upper left, in shadow on the lower right
      paint(x, y, Math.hypot(u, v), dx + dy);
    }
  }
}

/** A dent or crater: dark inside, a bevelled rim round it, and a bright edge of bare metal where the steel was torn. */
function crater(c, cx, cy, rx, ry, turn, { depth = 1, bare = true, rnd } = {}) {
  const wobble = rnd() * 6.28;
  ellipse(cx, cy, rx, ry, turn, (x, y, d, side) => {
    const e = 1 + 0.1 * Math.sin(Math.atan2(y - cy, x - cx) * 3 + wobble);
    if (d <= (1 - 0.34) * e) {
      // dark inside, darkest in the middle; shallow dents stay lighter
      const inner = d / e;
      c.put(x, y, depth > 0.6 ? (inner < 0.45 ? CHAR : mix3(CHAR, SCORCH, inner)) : mix3(SHADE, SCORCH, inner));
    } else if (d <= 1.12 * e) {
      c.put(x, y, side < 0 ? RIM : SCORCH);
      // a line of bare, freshly torn metal on the lit lip
      if (bare && side < -1 && d > 0.85 * e)
        c.put(x, y, BARE);
    } else if (d <= 1.55 * e) {
      c.put(x, y, side < 0 ? SCORCH : SHADE, false);
    }
  });
}

function mix3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** A crack that wanders, with side branches; `light` puts a thin lit edge beside it. */
function crack(c, rnd, x, y, angle, length, light = true, branches = 1) {
  let a = angle;
  for (let d = 0; d < length; d++) {
    a += (rnd() - 0.5) * 0.7;
    x += Math.cos(a);
    y += Math.sin(a);
    c.put(x, y, CRACK);
    if (light && d % 2 === 0)
      c.put(x + 1, y + 1, RIM, false);
    if (branches > 0 && d > 2 && rnd() < 0.18)
      crack(c, rnd, x, y, a + (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.5), 2 + Math.floor(rnd() * 4), false, branches - 1);
  }
}

/** A soft scorch: dithered dark, thinning outwards. */
function scorch(c, rnd, cx, cy, radius, density = 1) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < radius && (x + y) % 2 === 0 && rnd() < (1.1 - d / radius) * density)
        c.put(x, y, SCORCH, false);
    }
  }
}

/** Flecks of steel thrown out round a hit. */
function flecks(c, rnd, cx, cy, count, near, far) {
  for (let i = 0; i < count; i++) {
    const angle = rnd() * Math.PI * 2;
    const distance = near + rnd() * (far - near);
    const x = cx + Math.cos(angle) * distance;
    const y = cy + Math.sin(angle) * distance;
    c.put(x, y, CHIP, false);
    if (rnd() < 0.5)
      c.put(x + 1, y, RIM, false);
  }
}

// the kinds of hole, each a different way for a pellet to meet steel
const KINDS = [
  // a clean puncture: a round crater, a thin halo and a few short cracks
  (c, rnd) => {
    scorch(c, rnd, mid, mid, 6, 0.5);
    for (let i = 0; i < 3 + Math.floor(rnd() * 2); i++)
      crack(c, rnd, mid, mid, rnd() * 6.28, 3 + Math.floor(rnd() * 4), true, 0);
    crater(c, mid, mid, 3.4, 3.2, 0, { rnd });
  },
  // torn metal: the steel is peeled back round the hole in bent, bright petals
  (c, rnd) => {
    const petals = 4 + Math.floor(rnd() * 3);
    const start = rnd() * 6.28;
    for (let k = 0; k < petals; k++) {
      const a = start + (k / petals) * Math.PI * 2 + (rnd() - 0.5) * 0.4;
      const length = 4 + rnd() * 3;
      for (let d = 2.5; d < length + 2.5; d += 0.6) {
        const w = Math.max(0.3, 1.6 * (1 - (d - 2.5) / length));
        for (let o = -w; o <= w; o += 0.6)
          c.put(mid + Math.cos(a) * d - Math.sin(a) * o, mid + Math.sin(a) * d + Math.cos(a) * o, o < 0 ? CHIP : RIM);
      }
      c.line(mid + Math.cos(a) * 2.5, mid + Math.sin(a) * 2.5, mid + Math.cos(a) * (length + 2.5), mid + Math.sin(a) * (length + 2.5), SHADE, false);
    }
    crater(c, mid, mid, 2.8, 2.8, 0, { rnd });
  },
  // a ricochet: an elongated gouge, with a scrape running on from it
  (c, rnd) => {
    const turn = rnd() * 6.28;
    const dx = Math.cos(turn);
    const dy = Math.sin(turn);
    for (let d = 2; d < 11; d += 0.7) {
      const fade = 1 - d / 11;
      if (rnd() < 0.5 + fade * 0.5) {
        c.put(mid + dx * d, mid + dy * d, CRACK);
        c.put(mid + dx * d - dy, mid + dy * d + dx, RIM, false);
      }
    }
    crater(c, mid, mid, 4.8, 2.1, turn, { rnd });
    flecks(c, rnd, mid + dx * 8, mid + dy * 8, 3, 0, 4);
  },
  // cracked plate: the hit has split the plate, with long cracks and a chip knocked out
  (c, rnd) => {
    const main = rnd() * 6.28;
    for (let i = 0; i < 4; i++)
      crack(c, rnd, mid, mid, main + i * 1.57 + (rnd() - 0.5) * 0.8, 8 + Math.floor(rnd() * 7), true, 1);
    crater(c, mid, mid, 2.6, 2.6, 0, { rnd });
    const a = rnd() * 6.28;
    crater(c, mid + Math.cos(a) * 5, mid + Math.sin(a) * 5, 1.4, 1.2, 0, { depth: 0.4, bare: false, rnd });
  },
  // two pellets close together
  (c, rnd) => {
    const a = rnd() * 6.28;
    const gap = 2.6 + rnd() * 1.4;
    scorch(c, rnd, mid, mid, 7, 0.45);
    crater(c, mid + Math.cos(a) * gap, mid + Math.sin(a) * gap, 2.4, 2.3, 0, { rnd });
    crater(c, mid - Math.cos(a) * gap, mid - Math.sin(a) * gap, 2.0, 2.0, 0, { rnd });
    crack(c, rnd, mid, mid, a + 1.57, 4 + Math.floor(rnd() * 3), true, 0);
  },
  // a dent: the steel took it without being pierced
  (c, rnd) => {
    scorch(c, rnd, mid, mid, 6, 0.35);
    crater(c, mid, mid, 4.0, 3.7, rnd() * 3, { depth: 0.3, bare: false, rnd });
    c.put(mid, mid, CHAR);
    c.put(mid + 1, mid, CHAR);
    flecks(c, rnd, mid, mid, 2, 5, 8);
  },
  // a hot hit: a wide black scorch round a small crater, with soot streaks running up
  (c, rnd) => {
    scorch(c, rnd, mid, mid, 10, 1);
    scorch(c, rnd, mid, mid, 6, 1);
    for (let i = 0; i < 3; i++)
      c.line(mid - 3 + i * 3 + (rnd() - 0.5) * 2, mid - 3, mid - 3 + i * 3 + (rnd() - 0.5) * 3, mid - 6 - rnd() * 5, SCORCH, false);
    crater(c, mid, mid, 2.7, 2.6, 0, { rnd });
  },
  // a star: a puncture with sharp cracks radiating, like a shot through glass
  (c, rnd) => {
    const n = 7 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++)
      crack(c, rnd, mid, mid, (i / n) * 6.28 + rnd() * 0.3, 4 + Math.floor(rnd() * 6), false, 0);
    for (let r of [5, 8]) {
      for (let k = 0; k < 14; k++) {
        const a = rnd() * 6.28;
        if (rnd() < 0.55)
          c.put(mid + Math.cos(a) * r, mid + Math.sin(a) * r, CRACK, false);
      }
    }
    crater(c, mid, mid, 2.4, 2.4, 0, { rnd });
  },
];

/** A bullet hole of one of several kinds (the variant picks the kind and, past the last kind, how it differs). */
function drawHole(c, variant, rnd) {
  KINDS[variant % KINDS.length](c, rnd);
  // a few flecks of bare steel on most of them
  if (variant % 3 !== 0)
    flecks(c, rnd, mid, mid, 1 + Math.floor(rnd() * 3), 6, 10);
}

/**
 * One frame of one kind of spark, small and quick, because a pellet on steel is a small thing:
 * 0 a tiny flash and a few sparks flying out, 1 a short shower falling, 2 a glint and a couple of embers,
 * 3 a ricochet, a few streaks thrown to one side.
 */
function drawSpark(c, variant, frame) {
  const t = frame / (SPARK_FRAMES - 1);
  const rnd = mulberry32(900 + variant * 131);
  const fade = (life) => (t < life * 0.35 ? YELLOW : t < life * 0.7 ? ORANGE : EMBER);
  // a spark is a point, with a tail of one pixel behind it while it is fast
  const spark = (angle, speed, life, drop) => {
    if (t > life)
      return;
    const travel = t * speed;
    const x = mid + Math.cos(angle) * travel;
    const y = mid + Math.sin(angle) * travel + drop * t * t;
    c.put(x, y, fade(life));
    if (t < life * 0.5)
      c.put(x - Math.cos(angle), y - Math.sin(angle) + drop * 0.1 * t, EMBER, false);
  };
  const flash = (size, color) => {
    c.put(mid, mid, color);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let d = 1; d <= size; d++)
        c.put(mid + dx * d, mid + dy * d, d === 1 ? FLASH : YELLOW);
    }
  };
  if (variant === 0) {
    if (frame === 0)
      flash(2, FLASH);
    else if (frame === 1)
      flash(1, YELLOW);
    for (let k = 0; k < 6; k++)
      spark(rnd() * Math.PI * 2, 7 + rnd() * 7, 0.55 + rnd() * 0.4, 6);
  } else if (variant === 1) {
    if (frame === 0)
      c.put(mid, mid, FLASH);
    for (let k = 0; k < 7; k++)
      spark(Math.PI / 2 + (rnd() - 0.5) * 1.8, 4 + rnd() * 6, 0.5 + rnd() * 0.5, 12);
  } else if (variant === 2) {
    if (frame < 2) {
      // a glint: a bright point with a cross, smaller on the second frame
      c.put(mid, mid, FLASH);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
        c.put(mid + dx, mid + dy, frame === 0 ? FLASH : YELLOW);
      if (frame === 0) {
        for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]])
          c.put(mid + dx, mid + dy, YELLOW);
      }
    }
    for (let k = 0; k < 3; k++)
      spark(rnd() * Math.PI * 2, 3 + rnd() * 4, 0.7 + rnd() * 0.3, 10);
  } else {
    // a ricochet: the sparks leave in a narrow cone to one side
    const heading = -0.5 + rnd() * 0.4 + (rnd() < 0.5 ? 0 : Math.PI - 0.4);
    if (frame === 0)
      flash(1, FLASH);
    for (let k = 0; k < 5; k++)
      spark(heading + (rnd() - 0.5) * 0.7, 9 + rnd() * 6, 0.5 + rnd() * 0.45, 5);
  }
}

/** The atlas as RGBA pixels, ready to be a texture. */
export function impactAtlas() {
  const width = IMPACT_CELL * IMPACT_CELL_COUNT;
  const data = new Uint8Array(width * IMPACT_CELL * 4);
  for (let cell = 0; cell < IMPACT_CELL_COUNT; cell++) {
    const c = new Cell();
    if (cell < HOLE_VARIANTS)
      drawHole(c, cell, mulberry32(2024 + cell * 7919));
    else if (cell < HOLE_VARIANTS + SPARK_FRAMES * SPARK_VARIANTS)
      drawSpark(c, Math.floor((cell - HOLE_VARIANTS) / SPARK_FRAMES), (cell - HOLE_VARIANTS) % SPARK_FRAMES);
    for (let y = 0; y < IMPACT_CELL; y++) {
      for (let x = 0; x < IMPACT_CELL; x++)
        data.set(c.pixels.subarray((y * IMPACT_CELL + x) * 4, (y * IMPACT_CELL + x) * 4 + 4), (y * width + cell * IMPACT_CELL + x) * 4);
    }
  }
  return { name: 'impacts', data, width, height: IMPACT_CELL, cell: IMPACT_CELL, frames: IMPACT_CELL_COUNT };
}

/** Texture coordinates of a cell: [u0, v0, u1, v1], with v1 at the top of the image. */
export function impactCellUv(cell) {
  return [cell / IMPACT_CELL_COUNT, 0, (cell + 1) / IMPACT_CELL_COUNT, 1];
}

/**
 * A bullet hole on a wall face, as a flat quad just in front of it. The quad is cut where it would leave the face (the
 * face runs `lo` and `hi` along its tangent, and from the floor to `top`), and the picture is cut with it, so no hole
 * hangs in the air past a corner or above a low wall. Null when nothing of it is left on the face.
 * (nx, ny) is the face normal in the game plane, z the height of the hit.
 */
export function holeQuad({ x, y, z, nx, ny, top, seed, lo = -Infinity, hi = Infinity }) {
  const rnd = mulberry32(seed);
  const variant = Math.floor(rnd() * HOLE_VARIANTS);
  const half = HOLE_SIZE / 2;
  const cu0 = Math.max(-half, lo + EDGE);
  const cu1 = Math.min(half, hi - EDGE);
  const cv0 = Math.max(-half, 0.6 - z);
  const cv1 = Math.min(half, top - 0.6 - z);
  if (cu0 >= cu1 || cv0 >= cv1)
    return null;
  const tx = -ny;
  const ty = nx;
  const at = (u, v) => [x + tx * u + nx * 0.5, z + v, y + ty * u + ny * 0.5];
  const [a0, b0, a1, b1] = impactCellUv(IMPACT_CELLS.hole + variant);
  const share = (v, from, to) => (v - from) / (to - from);
  return {
    corners: [...at(cu0, cv0), ...at(cu1, cv0), ...at(cu1, cv1), ...at(cu0, cv1)],
    uv: [a0 + share(cu0, -half, half) * (a1 - a0), b0 + share(cv0, -half, half) * (b1 - b0), a0 + share(cu1, -half, half) * (a1 - a0), b0 + share(cv1, -half, half) * (b1 - b0)],
  };
}
