import { Trigo, Utils, Vec2 } from '@1pizzateam/spock';
import { mulberry32 } from './rng.js';

const scratchPt = new Vec2();

/**
 * What a bullet leaves behind and what it throws up, as pixel art drawn here in code (no image files): bullet holes in
 * steel (twelve kinds: clean punctures, torn petals, ricochet scrapes, cracked plate, double hits, dents, scorched ones) and the sparks of a pellet striking metal (four kinds, five frames each). One 32 x 32 cell
 * each, in a single row, padded to a power of two. The holes are flat quads on a wall face (see `holeQuad`), the sparks
 * are a short animation on a sprite that faces the camera.
 */

const IMPACT_CELL = 32;
// the atlas cells are twice as sharp: the legacy pictures are doubled, the blast art is painted at this size
const ATLAS_CELL = 64;
const ATLAS_SCALE = ATLAS_CELL / IMPACT_CELL;
const mid2 = (ATLAS_CELL - 1) / 2;
export const IMPACT_CELL_COUNT = 64;
export const HOLE_VARIANTS = 12;
export const SLASH_VARIANTS = 6;
export const SPARK_FRAMES = 5;
export const SPARK_VARIANTS = 4;
const BLAST_TIERS = 3;
// two painted bases per tier; the mark's variant picks one (bit 0) and mirrors it (bit 1)
const BLAST_BASES = 2;
const BLAST_SPAN = BLAST_TIERS * BLAST_BASES;
// the burn backdrop is this many times wider than the damage it sits under, and a little deeper in the surface
const BURN_SCALE = 1.9;
// like BLAST_OFFSET, only keeps the scorch off its face and below the holes; its place under the damage comes from draw order
const BURN_OFFSET = 0.1;
// the flat scorch lift likewise only clears the surface; draw order puts it under the damage
const BURN_LIFT = 0.1;
const SLASH_CELL = HOLE_VARIANTS + SPARK_FRAMES * SPARK_VARIANTS;
// three damage tiers of two paintings per surface: cell = surface start + tier * 2 + base, so an editor can mirror the layout
export const IMPACT_CELLS = {
  hole: 0,
  spark: HOLE_VARIANTS,
  slash: SLASH_CELL,
  brokenWall: SLASH_CELL + SLASH_VARIANTS,
  brokenFloor: SLASH_CELL + SLASH_VARIANTS + BLAST_SPAN,
  brokenCeiling: SLASH_CELL + SLASH_VARIANTS + BLAST_SPAN * 2,
  // the scorched backdrop under the damage: three tiers for walls, then three for floor and ceiling
  burn: SLASH_CELL + SLASH_VARIANTS + BLAST_SPAN * 3,
};

// marks stop this far short of the edge of a face, so none sits right on a corner
const EDGE = 0.3;
// a hole is a square this many world units across: the crater is a quarter of it, so about 3 units, and its cracks reach
// a little further
const HOLE_SIZE = 16;
// blast marks sit off their face and below bullet holes (0.25), so a hole shot into a blast still shows; overlap between
// blast marks is decided by draw order in World.syncBlasts and World.syncDoorMarks (scorch pass, then damage pass, oldest
// first, depth writes off), not by this offset
const BLAST_OFFSET = 0.15;
// a flat blast mark hovers this far off the floor or ceiling so it does not fight the surface for depth; layering between
// overlapping marks is by draw order, not by this lift
const FLAT_LIFT = 0.15;
const CEILING_HEIGHT = 64;
const MIN_SPAN = 1e-3;

const CHAR = [5, 7, 11];
const SCORCH = [12, 15, 23];
const CRACK = [8, 10, 16];
const RIM = [112, 130, 160];
const CHIP = [150, 168, 196];
const PLASTER = [172, 164, 148];
const CONCRETE = [118, 120, 124];
const CONCRETE_DARK = [68, 70, 76];
const REBAR = [150, 74, 40];
const RUBBLE_LIGHT = [136, 130, 120];
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
    const steps = Math.ceil(scratchPt.setScalar(x1 - x0, y1 - y0).getMagnitude() * 1.5) || 1;
    for (let i = 0; i <= steps; i++)
      this.put(Utils.lerp(x0, x1, i / steps), Utils.lerp(y0, y1, i / steps), color, over);
  }
}

const SHADE = [28, 34, 48];
const BARE = [138, 154, 182];

/** Fills an ellipse (radii rx, ry, turned by `turn`), calling `paint(x, y, d, lit)` where d is 0 at the middle and 1 at the edge. */
function ellipse(cx, cy, rx, ry, turn, paint) {
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const reach = Math.ceil(Math.max(rx, ry) + 2);
  for (let y = Math.floor(cy - reach); y <= Math.ceil(cy + reach); y++)
    for (let x = Math.floor(cx - reach); x <= Math.ceil(cx + reach); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const u = (dx * cos + dy * sin) / rx;
      const v = (-dx * sin + dy * cos) / ry;
      // which way the rim faces: lit on the upper left, in shadow on the lower right
      paint(x, y, scratchPt.setScalar(u, v).getMagnitude(), dx + dy);
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
    } else if (d <= 1.55 * e)
      c.put(x, y, side < 0 ? SCORCH : SHADE, false);
  });
}

function mix3(a, b, t) {
  return [Utils.lerp(a[0], b[0], t), Utils.lerp(a[1], b[1], t), Utils.lerp(a[2], b[2], t)];
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
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++)
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const d = scratchPt.setScalar(x - cx, y - cy).getMagnitude();
      if (d < radius && (x + y) % 2 === 0 && rnd() < (1.1 - d / radius) * density)
        c.put(x, y, SCORCH, false);
    }
}

/** Flecks of steel thrown out round a hit. */
function flecks(c, rnd, cx, cy, count, near, far) {
  for (let i = 0; i < count; i++) {
    const angle = rnd() * Trigo.twopi;
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
      const a = start + (k / petals) * Trigo.twopi + (rnd() - 0.5) * 0.4;
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
    for (let r of [5, 8])
      for (let k = 0; k < 14; k++) {
        const a = rnd() * 6.28;
        if (rnd() < 0.55)
          c.put(mid + Math.cos(a) * r, mid + Math.sin(a) * r, CRACK, false);
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
  // a spark has a small 2-pixel head and a short glowing tail behind it while it is fast
  const spark = (angle, speed, life, drop) => {
    if (t > life)
      return;
    const travel = t * speed;
    const x = mid + Math.cos(angle) * travel;
    const y = mid + Math.sin(angle) * travel + drop * t * t;
    const col = fade(life);
    c.put(x, y, col);
    if (t < life * 0.75)
      c.put(x + (Math.abs(Math.cos(angle)) > 0.5 ? 0 : 1), y + (Math.abs(Math.cos(angle)) > 0.5 ? 1 : 0), t < life * 0.35 ? ORANGE : EMBER, false);
    if (t < life * 0.65) {
      c.put(x - Math.cos(angle), y - Math.sin(angle) + drop * 0.1 * t, t < life * 0.35 ? ORANGE : EMBER, false);
      if (t < life * 0.4)
        c.put(x - Math.cos(angle) * 2, y - Math.sin(angle) * 2 + drop * 0.18 * t, EMBER, false);
    }
  };
  const flash = (size, color) => {
    c.put(mid, mid, color);
    for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]])
      c.put(mid + dx, mid + dy, size > 1 ? YELLOW : ORANGE, false);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
      for (let d = 1; d <= size; d++)
        c.put(mid + dx * d, mid + dy * d, d === 1 ? FLASH : YELLOW);
  };
  if (variant === 0) {
    if (frame === 0)
      flash(3, FLASH);
    else if (frame === 1)
      flash(2, YELLOW);
    for (let k = 0; k < 6; k++)
      spark(rnd() * Trigo.twopi, 7 + rnd() * 7, 0.55 + rnd() * 0.4, 6);
  } else if (variant === 1) {
    if (frame === 0)
      flash(2, FLASH);
    else if (frame === 1)
      flash(1, YELLOW);
    for (let k = 0; k < 7; k++)
      spark(Trigo.halfpi + (rnd() - 0.5) * 1.8, 4 + rnd() * 6, 0.5 + rnd() * 0.5, 12);
  } else if (variant === 2) {
    // a glint: a bright point with a cross, smaller on the second frame
    if (frame < 2)
      flash(frame === 0 ? 3 : 2, frame === 0 ? FLASH : YELLOW);
    for (let k = 0; k < 4; k++)
      spark(rnd() * Trigo.twopi, 3.5 + rnd() * 4.5, 0.7 + rnd() * 0.3, 10);
  } else {
    // a ricochet: the sparks leave in a narrow cone to one side
    const heading = -0.5 + rnd() * 0.4 + (rnd() < 0.5 ? 0 : Trigo.pi - 0.4);
    if (frame === 0)
      flash(2, FLASH);
    else if (frame === 1)
      flash(1, YELLOW);
    for (let k = 0; k < 5; k++)
      spark(heading + (rnd() - 0.5) * 0.7, 9 + rnd() * 6, 0.5 + rnd() * 0.45, 5);
  }
}

/**
 * A vertical chainsaw gash in steel: a deep, serrated vertical kerf chewed by the cutting chain teeth,
 * with jagged bare-metal burrs along both lips, friction scorch, and optional parallel chain-skip scratches.
 */
function drawSlash(c, variant, rnd) {
  const y0 = 3 + (variant % 2);
  const y1 = IMPACT_CELL - 4 - ((variant + 1) % 2);
  const tilt = (variant % 2 === 0 ? 1 : -1) * (0.05 + (variant % 3) * 0.045);
  const curve = (variant % 3 === 1 ? 1 : -1) * 0.8;

  for (let y = y0; y <= y1; y++) {
    const t = (y - y0) / (y1 - y0);
    const env = Math.sin(t * Trigo.pi);
    const cx = mid + (y - mid) * tilt + Math.sin(t * Trigo.pi) * curve + (rnd() - 0.5) * 0.35;
    const tooth = (y + variant) % 3 === 0;
    const halfW = (0.75 + 0.85 * env) + (tooth ? 0.55 : 0);

    // Friction scorch halo around the cut
    if (y % 2 === 0) {
      c.put(cx - halfW - 1.6, y, SCORCH, false);
      c.put(cx + halfW + 1.6, y, SHADE, false);
    }

    // Lit left burr lip and shadowed right burr lip with serrated chain-tooth notches
    c.put(cx - halfW - 0.7, y, tooth ? BARE : RIM);
    if (tooth)
      c.put(cx - halfW - 1.5, y, CHIP, false);
    c.put(cx + halfW + 0.7, y, tooth ? RIM : SHADE);
    if (tooth && (y + variant) % 2 === 0)
      c.put(cx + halfW + 1.5, y, SCORCH, false);

    // Deep vertical kerf trench in the steel
    for (let dx = -halfW; dx <= halfW; dx += 0.45)
      c.put(cx + dx, y, Math.abs(dx) < halfW * 0.55 ? CHAR : CRACK);
  }

  // Secondary parallel chain-skip scratch on variants 1 and 3
  if (variant === 1 || variant === 3) {
    const side = variant === 1 ? 3.4 : -3.4;
    const sy0 = y0 + 4;
    const sy1 = y1 - 3;
    for (let y = sy0; y <= sy1; y++) {
      const sx = mid + side + (y - mid) * tilt;
      c.put(sx, y, CRACK);
      if (y % 2 === 0)
        c.put(sx - 1, y, RIM, false);
    }
  }

  // Double-bite overlapping vertical chatter notch on variant 3
  if (variant === 3)
    for (let y = y0 + 2; y <= y1 - 5; y++) {
      const sx = mid + 1.6 - (y - mid) * tilt * 0.7;
      c.put(sx, y, CHAR);
      c.put(sx + 1, y, BARE, false);
    }

  // Stress cracks branching sideways from the vertical gash on variants 4 and 5
  if (variant >= 4) {
    crack(c, rnd, mid - 1, mid - 3, Trigo.pi + (rnd() - 0.5) * 0.5, 4, true, 0);
    crack(c, rnd, mid + 1, mid + 3, (rnd() - 0.5) * 0.5, 4, true, 0);
  }

  // Shaved metal flecks thrown out at the bottom of the vertical cut
  flecks(c, rnd, mid + (y1 - mid) * tilt, y1 - 1, 3, 1.5, 4.5);
}


const BRICK = [146, 78, 62];
const BRICK_DARK = [92, 48, 40];
const MORTAR = [128, 122, 112];
const DUST = [118, 116, 112];
const DUST_DARK = [70, 70, 74];
const PANEL = [156, 162, 172];
const PIPE = [104, 118, 130];
const JOIST = [96, 68, 46];
const SOOT = [[78, 80, 88], [38, 40, 48], [14, 16, 24]];
const SKIN = [PLASTER, DUST, PANEL];
const BORDER = 3;
const BLAST_RADIUS = [12, 17, 22];
const BLAST_CORE = [0, 0.45, 0.55];
const SHARD_POINTS = 8;

const bandOf = (v) => Math.max(0, Math.min(255, v));

/** A 64 px cell for the blast art: same `put` as `Cell`, but with alpha blending and a cleared border. */
class BlastCell {
  constructor() {
    this.pixels = new Uint8Array(ATLAS_CELL * ATLAS_CELL * 4);
  }

  put(x, y, color, alpha = 255, over = true) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < BORDER || y < BORDER || x >= ATLAS_CELL - BORDER || y >= ATLAS_CELL - BORDER || alpha <= 0)
      return;
    const o = (y * ATLAS_CELL + x) * 4;
    const old = this.pixels[o + 3];
    if (!over && old)
      return;
    const t = old ? alpha / 255 : 1;
    this.pixels[o] = bandOf(Utils.lerp(this.pixels[o], color[0], t));
    this.pixels[o + 1] = bandOf(Utils.lerp(this.pixels[o + 1], color[1], t));
    this.pixels[o + 2] = bandOf(Utils.lerp(this.pixels[o + 2], color[2], t));
    this.pixels[o + 3] = Math.max(old, alpha);
  }

  line(x0, y0, x1, y1, color, alpha = 255) {
    const steps = Math.ceil(scratchPt.setScalar(x1 - x0, y1 - y0).getMagnitude() * 1.5) || 1;
    for (let i = 0; i <= steps; i++)
      this.put(Utils.lerp(x0, x1, i / steps), Utils.lerp(y0, y1, i / steps), color, alpha);
  }
}

function hash2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = Utils.smoothstep(0, 1, x - ix);
  const fy = Utils.smoothstep(0, 1, y - iy);
  return Utils.lerp(
    Utils.lerp(hash2(ix, iy, seed), hash2(ix + 1, iy, seed), fx),
    Utils.lerp(hash2(ix, iy + 1, seed), hash2(ix + 1, iy + 1, seed), fx),
    fy,
  );
}

/** Three octaves of value noise, 0 to 1. */
function fbm(x, y, seed) {
  return vnoise(x, y, seed) * 0.57 + vnoise(x * 2, y * 2, seed + 1) * 0.29 + vnoise(x * 4, y * 4, seed + 2) * 0.14;
}

function shade3(color, k, jitter = 0) {
  return [color[0] * k + jitter, color[1] * k + jitter, color[2] * k + jitter];
}

/** What shows through the opening: brick courses on walls, slabs on floors, joists and panel backs on ceilings. */
function substrate(surface, x, y, tone, noise) {
  if (surface === 0) {
    const row = Math.floor(y / 6);
    const col = Math.floor((x + (row % 2) * 6) / 12);
    const mortar = y % 6 === 0 || (x + (row % 2) * 6) % 12 === 0;
    if (noise > 0.62)
      return shade3(CONCRETE, 0.8 + tone * 0.3);
    return mortar ? shade3(MORTAR, 0.85) : mix3(BRICK_DARK, BRICK, (tone + hash2(col, row, 3)) * 0.5);
  }
  if (surface === 1)
    return mix3(CONCRETE_DARK, CONCRETE, tone);
  return mix3(shade3(JOIST, 0.7), noise > 0.55 ? PANEL : JOIST, tone);
}

/**
 * One blast cell, painted at the atlas resolution in layers: a ragged outline (domain-warped noise), a dark crater, the
 * substrate in Voronoi shards with crack seams, a lit rim on the upper left and a shadowed one on the lower right, a
 * soot halo, then loose pieces (bars, pipes, flaps, rubble). `tier` is 0 scuffed, 1 chipped, 2 blown out; `base` tells the
 * two paintings of the same tier apart through their seed.
 */
function drawBlast(c, surface, tier, base, rnd) {
  const seed = Math.floor(rnd() * 100000);
  const ox = rnd() * 40;
  const oy = rnd() * 40;
  const radius = BLAST_RADIUS[tier];
  const core = BLAST_CORE[tier];
  const soot = SOOT[tier];
  const skin = SKIN[surface];
  const shards = SHARD_POINTS + tier * 3 + base * 4;
  const sx = new Array(shards);
  const sy = new Array(shards);
  for (let i = 0; i < shards; i++) {
    const a = rnd() * Trigo.twopi;
    const r = Math.sqrt(rnd()) * radius * 1.1;
    sx[i] = mid2 + Math.cos(a) * r;
    sy[i] = mid2 + Math.sin(a) * r;
  }
  for (let y = BORDER; y < ATLAS_CELL - BORDER; y++)
    for (let x = BORDER; x < ATLAS_CELL - BORDER; x++) {
      const dx = x - mid2;
      const dy = y - mid2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ux = dist ? dx / dist : 0;
      const uy = dist ? dy / dist : 0;
      const warp = fbm(ux * 1.7 + ox, uy * 1.7 + oy, seed) - 0.5;
      const reach = radius * (1 + warp * (0.7 + tier * 0.25)) + (vnoise(x * 0.5, y * 0.5, seed + 9) - 0.5) * 2;
      const d = dist / reach;
      if (d > 1.4)
        continue;
      let near = 1e9;
      let second = 1e9;
      let id = 0;
      for (let i = 0; i < shards; i++) {
        const ddx = x - sx[i];
        const ddy = y - sy[i];
        const dd = ddx * ddx + ddy * ddy;
        if (dd < near) {
          second = near;
          near = dd;
          id = i;
        } else if (dd < second)
          second = dd;
      }
      const seam = Math.sqrt(second) - Math.sqrt(near);
      const tone = hash2(id, seed, 17);
      const grain = fbm(x * 0.4, y * 0.4, seed + 5);
      const jitter = (hash2(x, y, seed) - 0.5) * 14;
      // lit on the upper left, in shadow on the lower right
      const lit = -(ux + uy) * 0.7071;
      let color;
      let alpha = 255;
      if (core > 0 && d < core) {
        const t = d / core;
        color = mix3(CHAR, shade3(substrate(surface, x, y, tone, grain), 0.28), t * t);
        if (seam < 1.2 && t > 0.4)
          color = shade3(color, 1.6, 6);
      } else if (d < 0.92) {
        const ring = core > 0 ? (d - core) / (0.92 - core) : d / 0.92;
        const ao = 0.55 + 0.45 * Utils.smoothstep(0, 1, ring);
        if (tier === 0)
          color = grain > 0.58 ? shade3(substrate(surface, x, y, tone, grain), 0.75 + 0.3 * lit) : shade3(skin, 0.62 + tone * 0.2 + lit * 0.12);
        else
          color = shade3(substrate(surface, x, y, tone, grain), ao + lit * 0.15 * ring);
        if (seam < 1.3)
          color = seam < 0.7 ? CRACK : shade3(color, 0.6);
        else if (lit > 0.5 && seam < 2.4)
          color = shade3(color, 1.35);
      } else if (d < 1.1) {
        // the lip: lit on the upper left, shadowed on the lower right
        if (lit > 0.15)
          color = shade3(skin, 0.95 + lit * 0.5 + (grain - 0.5) * 0.3);
        else
          color = shade3(DUST_DARK, 0.5 - lit * 0.2);
      } else {
        color = mix3(soot, shade3(skin, 0.5), grain * 0.5);
        alpha = 230 * (1 - Utils.smoothstep(1.1, 1.4, d));
      }
      alpha *= Utils.smoothstep(BORDER, BORDER + 5, Math.min(x, y, ATLAS_CELL - 1 - x, ATLAS_CELL - 1 - y));
      c.put(x, y, shade3(color, 1, jitter), alpha);
    }
  // hairline cracks fanning out of the opening into the surface
  const cracks = 3 + tier * 2 + base * 2;
  for (let i = 0; i < cracks; i++) {
    let a = (i / cracks) * Trigo.twopi + rnd() * 0.6;
    let px = mid2 + Math.cos(a) * radius * 0.9;
    let py = mid2 + Math.sin(a) * radius * 0.9;
    const length = radius * (0.4 + rnd() * 0.5);
    for (let s = 0; s < length; s++) {
      a += (rnd() - 0.5) * 0.7;
      px += Math.cos(a);
      py += Math.sin(a);
      c.put(px, py, CRACK, 235);
      c.put(px - 1, py - 1, CHIP, 150, false);
      if (s % 7 === 6)
        c.line(px, py, px + Math.cos(a + 0.9) * 4, py + Math.sin(a + 0.9) * 4, CRACK, 200);
    }
  }
  if (tier === 0)
    return;
  const bars = tier === 1 ? 2 : 4;
  for (let i = 0; i < bars; i++) {
    const a = rnd() * Trigo.twopi;
    const from = radius * 0.5;
    const to = radius * (0.9 + rnd() * 0.3);
    if (surface === 2) {
      // a pipe crossing the opening and, further in, joists
      const yy = mid2 - radius * 0.4 + i * 4;
      c.line(mid2 - radius * 0.8, yy, mid2 + radius * 0.8, yy + 1, PIPE);
      c.line(mid2 - radius * 0.8, yy - 1, mid2 + radius * 0.8, yy, CHIP, 220);
      if (tier === 2)
        c.line(mid2 - radius * 0.7 + i * 9, mid2 - radius * 0.7, mid2 - radius * 0.6 + i * 9, mid2 + radius * 0.7, JOIST);
    } else {
      c.line(mid2 + Math.cos(a) * from, mid2 + Math.sin(a) * from, mid2 + Math.cos(a) * to, mid2 + Math.sin(a) * to, REBAR);
      c.put(mid2 + Math.cos(a) * to, mid2 + Math.sin(a) * to, BARE);
    }
  }
  // flakes, flaps and rubble thrown round the opening
  const pieces = 14 + tier * 12 + base * 6;
  for (let i = 0; i < pieces; i++) {
    const a = rnd() * Trigo.twopi;
    const r = radius * (0.85 + rnd() * 0.5);
    const px = mid2 + Math.cos(a) * r;
    const py = mid2 + Math.sin(a) * r;
    const size = 1 + Math.floor(rnd() * (1 + tier));
    for (let k = 0; k < size; k++) {
      c.put(px + k, py, i % 2 ? RUBBLE_LIGHT : skin, 255, false);
      c.put(px + k + 1, py + 1, CONCRETE_DARK, 255, false);
    }
  }
  if (surface === 0 && tier === 2) {
    // a soot streak running up the wall from the top of the crater
    const w = 3 + base * 2;
    for (let y = BORDER; y < mid2 - radius; y++)
      for (let x = -w; x <= w; x++)
        c.put(mid2 + x + (vnoise(y * 0.3, seed, 4) - 0.5) * 6, y, SOOT[2], 150 * (1 - Math.abs(x) / (w + 1)) * ((y - BORDER) / (mid2 - radius - BORDER)), false);
  }
}

const BURN_REACH = [0.5, 0.68, 0.86];
const BURN_ALPHA = [150, 195, 235];

/**
 * The scorched backdrop of a blast: soot that bleeds far past the crater, darkest at its heart, with tongues licking
 * upward on walls (`flat` false) or spreading as a ragged star on floors and ceilings, fading out before the cell border.
 */
function drawBurn(c, flat, tier, rnd) {
  const seed = Math.floor(rnd() * 100000);
  const ox = rnd() * 40;
  const oy = rnd() * 40;
  const reach = (ATLAS_CELL / 2 - BORDER - 2) * BURN_REACH[tier];
  const tongues = 5 + tier * 2;
  const phase = rnd() * Trigo.twopi;
  for (let y = BORDER; y < ATLAS_CELL - BORDER; y++)
    for (let x = BORDER; x < ATLAS_CELL - BORDER; x++) {
      const dx = x - mid2;
      const dy = y - mid2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const a = Math.atan2(dy, dx);
      const warp = fbm(x * 0.12 + ox, y * 0.12 + oy, seed) - 0.5;
      let r = reach * (1 + warp * 0.9) * (1 + 0.35 * Math.cos(a * tongues + phase) * (0.4 + tier * 0.2));
      // flames climb: on a wall the soot reaches further up (small y) than down
      if (!flat)
        r *= dy < 0 ? 1.25 : 0.8;
      const d = dist / r;
      if (d >= 1)
        continue;
      const grain = fbm(x * 0.35, y * 0.35, seed + 3);
      const fade = 1 - Utils.smoothstep(0.25, 1, d);
      const alpha = BURN_ALPHA[tier] * fade * (0.7 + 0.3 * grain);
      const heat = 1 - Utils.smoothstep(0, 0.55, d);
      const color = mix3(shade3(SOOT[1], 0.6 + grain * 0.5), CHAR, heat);
      c.put(x, y, shade3(color, 1, (hash2(x, y, seed) - 0.5) * 8), alpha * Utils.smoothstep(BORDER, BORDER + 5, Math.min(x, y, ATLAS_CELL - 1 - x, ATLAS_CELL - 1 - y)));
    }
}

/** The atlas as RGBA pixels, ready to be a texture. */
export function impactAtlas() {
  const width = ATLAS_CELL * IMPACT_CELL_COUNT;
  const data = new Uint8Array(width * ATLAS_CELL * 4);
  const blastEnd = IMPACT_CELLS.brokenCeiling + BLAST_SPAN;
  for (let cell = 0; cell < IMPACT_CELL_COUNT; cell++) {
    if (cell >= IMPACT_CELLS.brokenWall && cell < blastEnd) {
      const b = new BlastCell();
      const broken = cell - IMPACT_CELLS.brokenWall;
      const tierBase = broken % BLAST_SPAN;
      drawBlast(b, Math.floor(broken / BLAST_SPAN), Math.floor(tierBase / BLAST_BASES), tierBase % BLAST_BASES, mulberry32(8192 + cell * 7919));
      for (let y = 0; y < ATLAS_CELL; y++)
        data.set(b.pixels.subarray(y * ATLAS_CELL * 4, (y + 1) * ATLAS_CELL * 4), (y * width + cell * ATLAS_CELL) * 4);
      continue;
    }
    if (cell >= IMPACT_CELLS.burn && cell < IMPACT_CELLS.burn + BLAST_TIERS * 2) {
      const b = new BlastCell();
      const n = cell - IMPACT_CELLS.burn;
      drawBurn(b, n >= BLAST_TIERS, n % BLAST_TIERS, mulberry32(16384 + cell * 7919));
      for (let y = 0; y < ATLAS_CELL; y++)
        data.set(b.pixels.subarray(y * ATLAS_CELL * 4, (y + 1) * ATLAS_CELL * 4), (y * width + cell * ATLAS_CELL) * 4);
      continue;
    }
    const c = new Cell();
    if (cell < HOLE_VARIANTS)
      drawHole(c, cell, mulberry32(2024 + cell * 7919));
    else if (cell < IMPACT_CELLS.slash)
      drawSpark(c, Math.floor((cell - HOLE_VARIANTS) / SPARK_FRAMES), (cell - HOLE_VARIANTS) % SPARK_FRAMES);
    else if (cell < IMPACT_CELLS.slash + SLASH_VARIANTS) {
      const slashIdx = cell - IMPACT_CELLS.slash;
      drawSlash(c, slashIdx, mulberry32(4096 + slashIdx * 6151));
    }
    for (let y = 0; y < ATLAS_CELL; y++)
      for (let x = 0; x < ATLAS_CELL; x++) {
        const s = ((y / ATLAS_SCALE | 0) * IMPACT_CELL + (x / ATLAS_SCALE | 0)) * 4;
        data.set(c.pixels.subarray(s, s + 4), (y * width + cell * ATLAS_CELL + x) * 4);
      }
  }
  return { name: 'impacts', data, width, height: ATLAS_CELL, cell: ATLAS_CELL, frames: IMPACT_CELL_COUNT };
}

/** Texture coordinates of a cell: [u0, v0, u1, v1], with v1 at the top of the image. */
export function impactCellUv(cell) {
  return [cell / IMPACT_CELL_COUNT, 0, (cell + 1) / IMPACT_CELL_COUNT, 1];
}

/**
 * A bullet hole or chainsaw slash on a wall face, as a flat quad just in front of it. The quad is cut where it would leave the face (the
 * face runs `lo` and `hi` along its tangent, and from the floor to `top`), and the picture is cut with it, so no hole
 * hangs in the air past a corner or above a low wall. Null when nothing of it is left on the face.
 * `pos` is a Vec3 (x, y in the game plane, z the height of the hit) and `normal` a Vec2 face normal in the game plane.
 * With `out` ({ corners: 12, uv: 4 }) the values are written in place and `out` is returned, valid until the next call; callers that
 * retain the quad (`cachedQuad`) must not pass `out`.
 */
export function holeQuad({ pos, normal, top, seed, kind = 'hole', lo = -Infinity, hi = Infinity, slope = 0 }, out = null) {
  const x = pos.x;
  const y = pos.y;
  const z = pos.z;
  const nx = normal.x;
  const ny = normal.y;
  const rnd = mulberry32(seed);
  const cell = kind === 'slash'
    ? IMPACT_CELLS.slash + Math.floor(rnd() * SLASH_VARIANTS)
    : IMPACT_CELLS.hole + Math.floor(rnd() * HOLE_VARIANTS);
  const half = HOLE_SIZE / 2;
  const cu0 = Math.max(-half, lo + EDGE);
  const cu1 = Math.min(half, hi - EDGE);
  const cv0 = Math.max(-half, 0.6 - z);
  const cv1 = Math.min(half, top - 0.6 - z);
  if (cu0 >= cu1 || cv0 >= cv1)
    return null;
  const tx = -ny;
  const ty = nx;
  const n0 = 0.25 - slope * cv0;
  const n1 = 0.25 - slope * cv1;
  const dest = out ?? { corners: new Array(12), uv: new Array(4) };
  const c = dest.corners;
  c[0] = x + tx * cu0 + nx * n0;
  c[1] = z + cv0;
  c[2] = y + ty * cu0 + ny * n0;
  c[3] = x + tx * cu1 + nx * n0;
  c[4] = z + cv0;
  c[5] = y + ty * cu1 + ny * n0;
  c[6] = x + tx * cu1 + nx * n1;
  c[7] = z + cv1;
  c[8] = y + ty * cu1 + ny * n1;
  c[9] = x + tx * cu0 + nx * n1;
  c[10] = z + cv1;
  c[11] = y + ty * cu0 + ny * n1;
  const a0 = cell / IMPACT_CELL_COUNT;
  const a1 = (cell + 1) / IMPACT_CELL_COUNT;
  const uv = dest.uv;
  uv[0] = a0 + ((cu0 - -half) / (half - -half)) * (a1 - a0);
  uv[1] = 0 + ((cv0 - -half) / (half - -half)) * (1 - 0);
  uv[2] = a0 + ((cu1 - -half) / (half - -half)) * (a1 - a0);
  uv[3] = 0 + ((cv1 - -half) / (half - -half)) * (1 - 0);
  return dest;
}

/**
 * Blast damage on a wall face, a flat quad just in front of it and cut where the face ends, like `holeQuad` but
 * larger (`size` world units across) and in the cell of the damage `tier` (0 to 2). Null when nothing of it is left.
 * `pos` is a Vec3 (the height of the blast in z), `normal` a Vec2. With `out` the values are written in place.
 */
export function blastWallQuad({ pos, normal, top, seed, tier, lo = -Infinity, hi = Infinity, slope = 0, size, variant = seed % 4 }, out = null) {
  const cell = IMPACT_CELLS.brokenWall + Utils.clamp(tier, 0, BLAST_TIERS - 1) * BLAST_BASES + (variant & 1);
  return wallQuadIn({ pos, normal, top, lo, hi, slope, size, variant }, out, cell, BLAST_OFFSET);
}

/**
 * The scorched backdrop of a wall blast: the same marks as `blastWallQuad`, `BURN_SCALE` times wider, a little closer to
 * the face so the damage draws over it, in the burn cell of the damage `tier`.
 */
export function burnWallQuad({ pos, normal, top, tier, lo = -Infinity, hi = Infinity, slope = 0, size, variant = 0 }, out = null) {
  const cell = IMPACT_CELLS.burn + Utils.clamp(tier, 0, BLAST_TIERS - 1);
  return wallQuadIn({ pos, normal, top, lo, hi, slope, size: size * BURN_SCALE, variant }, out, cell, BURN_OFFSET);
}

function wallQuadIn({ pos, normal, top, lo, hi, slope, size, variant }, out, cell, offset) {
  const half = size / 2;
  const cu0 = Math.max(-half, lo + EDGE);
  const cu1 = Math.min(half, hi - EDGE);
  const cv0 = Math.max(-half, 0.6 - pos.z);
  const cv1 = Math.min(half, top - 0.6 - pos.z);
  if (cu1 - cu0 < MIN_SPAN || cv1 - cv0 < MIN_SPAN)
    return null;
  const nx = normal.x;
  const ny = normal.y;
  const tx = -ny;
  const ty = nx;
  const n0 = offset - slope * cv0;
  const n1 = offset - slope * cv1;
  const dest = out ?? { corners: new Array(12), uv: new Array(4) };
  const c = dest.corners;
  c[0] = pos.x + tx * cu0 + nx * n0;
  c[1] = pos.z + cv0;
  c[2] = pos.y + ty * cu0 + ny * n0;
  c[3] = pos.x + tx * cu1 + nx * n0;
  c[4] = pos.z + cv0;
  c[5] = pos.y + ty * cu1 + ny * n0;
  c[6] = pos.x + tx * cu1 + nx * n1;
  c[7] = pos.z + cv1;
  c[8] = pos.y + ty * cu1 + ny * n1;
  c[9] = pos.x + tx * cu0 + nx * n1;
  c[10] = pos.z + cv1;
  c[11] = pos.y + ty * cu0 + ny * n1;
  const a0 = cell / IMPACT_CELL_COUNT;
  const a1 = (cell + 1) / IMPACT_CELL_COUNT;
  const uv = dest.uv;
  const mirror = (variant & 2) !== 0;
  uv[0] = a0 + ((mirror ? half - cu0 : cu0 + half) / size) * (a1 - a0);
  uv[1] = (cv0 + half) / size;
  uv[2] = a0 + ((mirror ? half - cu1 : cu1 + half) / size) * (a1 - a0);
  uv[3] = (cv1 + half) / size;
  return dest;
}

/**
 * Blast damage on the floor or, with `ceiling`, the ceiling: a horizontal square of `size` world units centred on `pos` (a
 * Vec3 whose x and y are the game plane), turned a quarter turn per `variant`, hovering a little off the surface.
 */
export function blastFlatQuad({ pos, seed, tier, size, ceiling = false, variant = seed % 4 }, out = null) {
  const cell = (ceiling ? IMPACT_CELLS.brokenCeiling : IMPACT_CELLS.brokenFloor) + Utils.clamp(tier, 0, BLAST_TIERS - 1) * BLAST_BASES + (variant & 1);
  return flatQuadIn(pos, size, ceiling, variant, out, cell, FLAT_LIFT);
}

/** The scorched backdrop of a floor or ceiling blast, `BURN_SCALE` times wider and under the damage. */
export function burnFlatQuad({ pos, tier, size, ceiling = false, variant = 0 }, out = null) {
  const cell = IMPACT_CELLS.burn + BLAST_TIERS + Utils.clamp(tier, 0, BLAST_TIERS - 1);
  return flatQuadIn(pos, size * BURN_SCALE, ceiling, variant, out, cell, BURN_LIFT);
}

function flatQuadIn(pos, size, ceiling, variant, out, cell, lift) {
  const half = size / 2;
  const height = ceiling ? CEILING_HEIGHT - lift : lift;
  const dest = out ?? { corners: new Array(12), uv: new Array(4) };
  const c = dest.corners;
  // the corners go round the square, started a quarter turn further on for each variant
  for (let k = 0; k < 4; k++) {
    const q = (k + variant) % 4;
    const sx = q === 0 || q === 3 ? -half : half;
    const sy = q < 2 ? -half : half;
    c[k * 3] = pos.x + sx;
    c[k * 3 + 1] = height;
    c[k * 3 + 2] = pos.y + sy;
  }
  const uv = dest.uv;
  uv[0] = cell / IMPACT_CELL_COUNT;
  uv[1] = 0;
  uv[2] = (cell + 1) / IMPACT_CELL_COUNT;
  uv[3] = 1;
  return dest;
}
