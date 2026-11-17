import { Bezier, Rect, Trigo, Vec2 } from '@1pizzateam/spock';
import { mulberry32 } from './rng.js';
import { PRINT_UNIT, RES, SCALE, TIP_HEIGHTS, paintDrop, paintFloorSplatCell, paintGib, paintPrint, paintStem, paintTip, paintWallSplatCell } from './bloodpaint.js';

/**
 * Blood as 2D sprites: one high definition atlas, painted in code by bloodpaint.js, and the functions that
 * place a cell of it in the world: flat on the floor, flat on a wall, or facing the camera. They only compute
 * corners and texture coordinates, so they stay headless and tested; the world puts them in a RoostR mesh.
 *
 * The atlas is a single row of 128 x 128 texel cells: floor splats, wall splats, footprints, droplets, gibs, and the stems and tips of drips.
 * The texels are lit and red already (wet highlights, thin blood bright, thick blood dark), so the mesh only has to dim them.
 */

export const CELL = 32;
/** Texels across one cell of the atlas: the cells are painted at 4 texels to a unit of the CELL grid. */
export const CELL_TEXELS = RES;
const FLOOR_VARIANTS = 6;
const WALL_VARIANTS = 4;
export const GIB_VARIANTS = 5;
export const CELLS = {
  floor: 0,
  wall: FLOOR_VARIANTS,
  printFilled: FLOOR_VARIANTS + WALL_VARIANTS,
  printOutline: FLOOR_VARIANTS + WALL_VARIANTS + 1,
  drop: FLOOR_VARIANTS + WALL_VARIANTS + 2,
  gib: FLOOR_VARIANTS + WALL_VARIANTS + 3,
  dripStem: FLOOR_VARIANTS + WALL_VARIANTS + 3 + GIB_VARIANTS,
};
// the kinds of drip: how its stem looks and how it ends. The stems come first, then the tips.
export const STEM_KINDS = 6;
export const TIP_KINDS = 4;
CELLS.stems = CELLS.dripStem;
CELLS.tips = CELLS.stems + STEM_KINDS;
const CELL_COUNT = CELLS.tips + TIP_KINDS;

// marks stop this far short of the edge of a face, so none sits right on a corner
const EDGE = 0.3;
const scratchTangent = new Vec2();
const scratchCornerMin = new Vec2();
const scratchCornerMax = new Vec2();

// The atlas is painted at 128 texels a cell (see bloodpaint.js); CELL stays the 32-unit grid that the marks, drips and
// footprints are laid out in, so every size and offset below is unchanged.
export { TIP_HEIGHTS };
const PRINT_PIXELS = PRINT_UNIT / SCALE;

// A drip is a stem running down and a small tip at its end. The stems repeat every 32 units top to bottom, in the
// middle 12 columns of their cell, so a stem of any length is a stack of them. The tips are 6 to 9 units tall, from the
// top of their cell, and narrow, pointed or ragged, never a round blob.
const STEM_FROM = 10;
const STEM_TO = 22;

let atlas = null;

/** The atlas as RGBA pixels, ready to be a texture. It is drawn once and shared. */
export function bloodAtlas() {
  if (atlas)
    return atlas;
  const cellPx = RES;
  const width = cellPx * CELL_COUNT;
  const height = cellPx;
  const data = new Uint8Array(width * height * 4);
  const layers = [];
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    const rnd = mulberry32(1000 + cell * 7919);
    let pixels;
    if (cell < FLOOR_VARIANTS) {
      const painted = paintFloorSplatCell(cell, rnd);
      pixels = painted.pixels;
      layers[cell] = painted.layers;
    }
    else if (cell < CELLS.printFilled) {
      const painted = paintWallSplatCell(cell - FLOOR_VARIANTS, rnd);
      pixels = painted.pixels;
      layers[cell] = painted.layers;
    }
    else if (cell <= CELLS.printOutline)
      pixels = paintPrint(cell === CELLS.printFilled);
    else if (cell === CELLS.drop)
      pixels = paintDrop();
    else if (cell >= CELLS.stems && cell < CELLS.tips) {
      const painted = paintStem(cell - CELLS.stems);
      pixels = painted.pixels;
      layers[cell] = painted.layers;
    } else if (cell >= CELLS.tips) {
      const painted = paintTip(cell - CELLS.tips);
      pixels = painted.pixels;
      layers[cell] = painted.layers;
    }
    else
      pixels = paintGib(cell - CELLS.gib, rnd);
    for (let y = 0; y < cellPx; y++)
      data.set(pixels.subarray(y * cellPx * 4, (y + 1) * cellPx * 4), (y * width + cell * cellPx) * 4);
  }
  // `layers[cell]` keeps the unlit height, coverage, colour and gloss of the splats and drips, for MergedBlood to merge
  atlas = { name: 'blood', data, width, height, cell: cellPx, frames: CELL_COUNT, layers };
  return atlas;
}

const CELL_UVS = Array.from({ length: CELL_COUNT }, (_, cell) => [cell / CELL_COUNT, 0, (cell + 1) / CELL_COUNT, 1]);

/** Texture coordinates of a cell: [u0, v0, u1, v1], with v1 at the top of the image. */
export function cellUv(cell) {
  return CELL_UVS[cell] ?? [cell / CELL_COUNT, 0, (cell + 1) / CELL_COUNT, 1];
}

// A mark is a flat quad. Its corners come back as 12 numbers (bottom-left, bottom-right, top-right, top-left, in 3D)
// and its texture rectangle as [u0, v0, u1, v1]; null when nothing is left of it.

/** `out` when given, else a fresh mark quad: 12 corner numbers and a 4-number texture rectangle. */
function markTarget(out) {
  return out ?? { corners: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], uv: [0, 0, 0, 0] };
}

function setCorner(corners, i, x, y, z) {
  corners[i] = x;
  corners[i + 1] = y;
  corners[i + 2] = z;
}

/** Writes the four corners of a square of half-size `half` turned by `cos`/`sin` about `pos` at `height`, with `shift` along its local y. */
function setTurnedSquare(corners, pos, cos, sin, half, shift, height) {
  const lo = -half + shift;
  const hi = half + shift;
  setCorner(corners, 0, pos.x + cos * -half - sin * lo, height, pos.y + sin * -half + cos * lo);
  setCorner(corners, 3, pos.x + cos * half - sin * lo, height, pos.y + sin * half + cos * lo);
  setCorner(corners, 6, pos.x + cos * half - sin * hi, height, pos.y + sin * half + cos * hi);
  setCorner(corners, 9, pos.x + cos * -half - sin * hi, height, pos.y + sin * -half + cos * hi);
}

function setUv(uv, u0, v0, u1, v1) {
  uv[0] = u0;
  uv[1] = v0;
  uv[2] = u1;
  uv[3] = v1;
}

/** Which of the floor pictures a splat is, and how it is turned: worked out from its seed, so the quad and the merged floor agree. */
export function floorSplatPlacement(seed) {
  const rnd = mulberry32(seed);
  return { variant: Math.floor(rnd() * FLOOR_VARIANTS), angle: rnd() * Trigo.twopi };
}

/** A splat on the floor, turned any way round. `size` is the splat's, and the quad is 3.2 times as wide. With `out` the quad is written into it. */
export function floorSplatQuad({ pos, size, seed, height = 0.3 }, out = null) {
  const { variant, angle } = floorSplatPlacement(seed);
  const quad = markTarget(out);
  setTurnedSquare(quad.corners, pos, Math.cos(angle), Math.sin(angle), size * 1.6, 0, height);
  const uv = cellUv(CELLS.floor + variant);
  setUv(quad.uv, uv[0], uv[1], uv[2], uv[3]);
  return quad;
}

/** A persistent chunk of meat, bone, skull, or organ resting on the floor after an XDeath gibbing. With `out` the quad is written into it. */
export function floorGibQuad({ pos, size, variant = 0, angle = 0, height = 0.36 }, out = null) {
  const quad = markTarget(out);
  setTurnedSquare(quad.corners, pos, Math.cos(angle), Math.sin(angle), size, 0, height);
  const uv = cellUv(CELLS.gib + ((variant >>> 0) % GIB_VARIANTS));
  setUv(quad.uv, uv[0], uv[1], uv[2], uv[3]);
  return quad;
}

/**
 * A shoe print. `strength` picks a filled, hatched print or just an outline, and a left foot is a mirrored right one.
 * Like the line version it is about 10.6 * 1.8 * scale long. With `out` the quad is written into it.
 */
export function printQuad({ pos, angle, side, strength, scale }, out = null) {
  const size = scale * 1.8 * (0.75 + 0.25 * Math.min(1, strength));
  const half = (CELL / 2) * (size / PRINT_PIXELS);
  const offset = side * 0.3 * side * size;
  const quad = markTarget(out);
  setTurnedSquare(quad.corners, pos, Math.cos(angle), Math.sin(angle), half, offset, 0.32);
  const uv = cellUv(strength > 0.55 ? CELLS.printFilled : CELLS.printOutline);
  if (side < 0)
    setUv(quad.uv, uv[0], uv[3], uv[2], uv[1]);
  else
    setUv(quad.uv, uv[0], uv[1], uv[2], uv[3]);
  return quad;
}

/**
 * A splat on a wall face, with its drips running down. It is cut where it leaves the face (the face runs `lo` and
 * `hi` along its tangent, from the splat's height `z` and up to `top`), so none hangs in the air past a corner,
 * an opening or the top of the wall. With `out` the quad is written into it (and left untouched when nothing is left).
 */
export function wallSplatQuad({ pos, normal, size, top, seed, lo = -Infinity, hi = Infinity, slope = 0 }, out = null) {
  const rnd = mulberry32(seed);
  const variant = Math.floor(rnd() * WALL_VARIANTS);
  const pixel = size / 10;
  // the splat is the whole 32 x 32 cell, centred on the hit
  const u0 = -16 * pixel;
  const u1 = 16 * pixel;
  const v0 = -16 * pixel;
  const v1 = 16 * pixel;
  const cu0 = Math.max(u0, lo + EDGE);
  const cu1 = Math.min(u1, hi - EDGE);
  const cv0 = Math.max(v0, 0.6 - pos.z);
  const cv1 = Math.min(v1, top - 0.6 - pos.z);
  if (cu0 >= cu1 || cv0 >= cv1)
    return null;
  const nx = normal.x;
  const ny = normal.y;
  const tx = -ny;
  const ty = nx;
  const quad = markTarget(out);
  const c = quad.corners;
  const n0 = 0.4 - slope * cv0;
  const n1 = 0.4 - slope * cv1;
  setCorner(c, 0, pos.x + tx * cu0 + nx * n0, pos.z + cv0, pos.y + ty * cu0 + ny * n0);
  setCorner(c, 3, pos.x + tx * cu1 + nx * n0, pos.z + cv0, pos.y + ty * cu1 + ny * n0);
  setCorner(c, 6, pos.x + tx * cu1 + nx * n1, pos.z + cv1, pos.y + ty * cu1 + ny * n1);
  setCorner(c, 9, pos.x + tx * cu0 + nx * n1, pos.z + cv1, pos.y + ty * cu0 + ny * n1);
  const uv = cellUv(CELLS.wall + variant);
  const a0 = uv[0];
  const b0 = uv[1];
  const du = uv[2] - a0;
  const dv = uv[3] - b0;
  // the cut takes the same share off the picture
  setUv(quad.uv, a0 + ((cu0 - u0) / (u1 - u0)) * du, b0 + ((cv0 - v0) / (v1 - v0)) * dv, a0 + ((cu1 - u0) / (u1 - u0)) * du, b0 + ((cv1 - v0) / (v1 - v0)) * dv);
  return quad;
}

// ---- drips ---------------------------------------------------------------------------------------------------------

const DRIP_SEED = 0x9e3779b9;

/**
 * The drips of a splat on a wall, worked out from its seed: where along it each one starts, how far it runs, when it
 * lets go and how long it takes, and what each one looks like. The same seed always gives the same drips, so the
 * simulation and the picture agree. They differ a lot: threads and ribbons, wavy, beaded, broken or doubled stems,
 * pointed, slanted, needle or frayed ends, stubs and long runs, and runs that slow, stutter or creep.
 */
export function wallDrips(seed, size) {
  const drips = [];
  fillDrips(seed, size, drips);
  return drips;
}

/** The drips of `wallDrips` written into `out`, reusing the objects already in it; returns how many there are. */
function fillDrips(seed, size, out) {
  const rnd = mulberry32((seed ^ DRIP_SEED) >>> 0);
  const count = (rnd() < 0.15 ? 1 : 2 + Math.floor(rnd() * 3)) + (size > 8 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const d = out[i] ?? (out[i] = { u: 0, length: 0, delay: 0, duration: 0, pixel: 0, stem: 0, tip: 0, profile: 0 });
    const stub = rnd() < 0.25;
    d.u = (rnd() - 0.5) * size * 1.5;
    d.length = stub ? 4 + rnd() * 6 : 9 + rnd() * (14 + size * 3);
    d.delay = rnd() * 1.1;
    d.duration = 1.8 + rnd() * 4.2;
    // units of the wall per pixel of the drip's picture: slender and proportional to the scaled-down splats
    d.pixel = (0.26 + size * 0.018) * (0.75 + rnd() * 0.55);
    d.stem = Math.floor(rnd() * STEM_KINDS);
    d.tip = Math.floor(rnd() * TIP_KINDS);
    d.profile = Math.floor(rnd() * 4);
  }
  return count;
}

const SCRATCH_DRIPS = [];
const COLS = [0, 0];

// Where the blood of each wall splat is solid, per column of its 32-unit cell: the rows (from the top) of the highest and
// lowest solid texel, so a drip can come out of the body instead of out of thin air.
const BODY_ROWS = [];

function bodyRows(variant) {
  if (BODY_ROWS[variant])
    return BODY_ROWS[variant];
  const layers = bloodAtlas().layers[CELLS.wall + variant];
  const n = CELL_TEXELS;
  const per = n / CELL;
  let top = 0;
  for (let i = 0; i < layers.H.length; i++)
    top = Math.max(top, layers.H[i]);
  const rows = [];
  for (let col = 0; col < CELL; col++) {
    let low = -1;
    let high = Infinity;
    for (let y = 0; y < n; y++)
      for (let x = col * per; x < (col + 1) * per; x++) {
        const i = y * n + x;
        if (layers.cov[i] > 0.9 && layers.H[i] > top * 0.4) {
          low = Math.max(low, y);
          high = Math.min(high, y);
        }
      }
    // a column with no body has high > low
    rows.push(low < 0 ? { low: -1, high: Infinity } : { low: low / per, high: high / per });
  }
  BODY_ROWS[variant] = rows;
  return rows;
}

/**
 * The height, above the hit and in wall units, where a stem of half-width `half` at `u` leaves the body of the splat, or
 * NaN when the body there is too thin or missing for the stem to sit inside it.
 */
function bodyBottom(variant, size, u, half) {
  const rows = bodyRows(variant);
  const pixel = size / 10;
  const first = Math.max(0, Math.floor(CELL / 2 + (u - half) / pixel));
  const last = Math.min(CELL - 1, Math.floor(CELL / 2 + (u + half) / pixel));
  if (last < first)
    return NaN;
  // the highest lower edge and the lowest upper edge across the stem: its top has to lie inside the body everywhere
  let low = Infinity;
  let high = -Infinity;
  for (let c = first; c <= last; c++) {
    low = Math.min(low, rows[c].low);
    high = Math.max(high, rows[c].high);
  }
  if (!(low - high >= 3))
    return NaN;
  // a little inside the body, so the stem's soft top is hidden in it
  return (CELL / 2 - low + 2.5) * pixel;
}

/** How long, in seconds, until every drip of a splat has stopped. */
export function dripTime(seed, size) {
  const count = fillDrips(seed, size, SCRATCH_DRIPS);
  let end = -Infinity;
  for (let i = 0; i < count; i++) {
    const d = SCRATCH_DRIPS[i];
    const t = d.delay + d.duration;
    if (t > end)
      end = t;
  }
  return end;
}

/** How far a drip has run, 0..1, `t` of the way through its time: some slow steadily, some stutter, some creep. */
function progress(t, profile) {
  const ease = (x) => Bezier.quadratic(0, 1, 1, x);
  if (profile === 0)
    return ease(t);
  if (profile === 1) {
    // it runs, stops, then runs again
    if (t < 0.3)
      return 0.5 * ease(t / 0.3);
    if (t < 0.55)
      return 0.5;
    return 0.5 + 0.5 * ease((t - 0.55) / 0.45);
  }
  if (profile === 2)
    return Bezier.cubic(0, 0, 1, 1, t);
  return Bezier.cubic(0, 1, 1, 1, t);
}

/** `columns` written into `COLS`, without allocating. */
function columnsInto(cell) {
  const uv = cellUv(cell);
  const share = (uv[2] - uv[0]) / CELL;
  COLS[0] = uv[0] + share * STEM_FROM;
  COLS[1] = uv[0] + share * STEM_TO;
}

/**
 * Reusable output for `wallDripQuads` and `screenSplatQuads`: `quads` is a growing pool of descriptors owned by the
 * target. The next call overwrites them, and only the first `count` are valid.
 */
export function createQuadTarget() {
  return { quads: [], count: 0 };
}

/** Corner of a wall quad at (u, v) across and up the face, written into `corners[o..o + 2]`; `position` is (x, y, height). */
function writeCorner(corners, o, position, tangent, normal, slope, u, v) {
  const n = 0.45 - slope * v;
  corners[o] = position.x + tangent.x * u + normal.x * n;
  corners[o + 1] = position.z + v;
  corners[o + 2] = position.y + tangent.y * u + normal.y * n;
}

function dripSlot(target, i) {
  return target.quads[i] ?? (target.quads[i] = { corners: new Array(12).fill(0), uv: [0, 0, 0, 0] });
}

// a stem is this much narrower at its end than where it leaves the splat
const TAPER = 0.5;

/** A quad on the wall: `half` wide about `centre` at its bottom and `halfTop` at its top, so a stem can narrow as it runs. */
function pushDripQuad(target, position, tangent, normal, slope, centre, half, halfTop, v0, v1, a0, b0, a1, b1) {
  const q = dripSlot(target, target.count++);
  const c = q.corners;
  writeCorner(c, 0, position, tangent, normal, slope, centre - half, v0);
  writeCorner(c, 3, position, tangent, normal, slope, centre + half, v0);
  writeCorner(c, 6, position, tangent, normal, slope, centre + halfTop, v1);
  writeCorner(c, 9, position, tangent, normal, slope, centre - halfTop, v1);
  const uv = q.uv;
  uv[0] = a0;
  uv[1] = b0;
  uv[2] = a1;
  uv[3] = b1;
}

/**
 * The drips of a splat on a wall at the age it has now, as quads: a stem running down from the splat and a small tip at
 * its end. A drip starts fast and slows as the blood thickens, then stays where it stopped. They are cut where the face
 * ends and stop at the floor, like the splat itself. Each is `{ corners, uv }`. Without a `target` the quads are fresh
 * and returned as an array; with a `createQuadTarget()` they are written into it (overwritten by the next call, valid
 * up to `target.count`) and the target is returned.
 */
export function wallDripQuads({ pos, normal, size, top, seed, age = 0, lo = -Infinity, hi = Infinity, slope = 0 }, target = null) {
  const out = target ?? createQuadTarget();
  out.count = 0;
  const z = pos.z;
  scratchTangent.setScalar(-normal.y, normal.x);
  const floor = 0.6 - z;
  const variant = Math.floor(mulberry32(seed)() * WALL_VARIANTS);
  const count = fillDrips(seed, size, SCRATCH_DRIPS);
  for (let i = 0; i < count; i++) {
    const drip = SCRATCH_DRIPS[i];
    const t = Math.min(1, (age - drip.delay) / drip.duration);
    if (t <= 0)
      continue;
    const px = drip.pixel;
    const half = ((STEM_TO - STEM_FROM) / 2) * px;
    // a drip whose spot has no body under it slides toward the middle of the splat until it has one
    let u = drip.u;
    let start = bodyBottom(variant, size, u, half);
    for (let k = 1; k <= 4 && Number.isNaN(start); k++) {
      u = drip.u * (1 - k / 4);
      start = bodyBottom(variant, size, u, half);
    }
    if (Number.isNaN(start) || u - half < lo + EDGE || u + half > hi - EDGE || start > top - 0.6 - z)
      continue;
    const tipHeight = TIP_HEIGHTS[drip.tip] * px;
    // the end of the stem, resting on the floor when it gets there
    const head = Math.max(floor + tipHeight - px, start - drip.length * progress(t, drip.profile));
    columnsInto(CELLS.stems + drip.stem);
    const s0 = COLS[0];
    const s1 = COLS[1];
    const segment = CELL * px;
    const bottom = head + px;
    // it narrows steadily from where it leaves the splat to where it ends; the end is wider than a hairline
    const run = Math.max(1e-6, start - bottom);
    const narrowing = (y) => 1 - (1 - TAPER) * Math.min(1, Math.max(0, (start - y) / run));
    for (let top2 = start; top2 > bottom + 1e-6; top2 -= segment) {
      const partBottom = Math.max(bottom, top2 - segment);
      pushDripQuad(out, pos, scratchTangent, normal, slope, u, half * narrowing(partBottom), half * narrowing(top2), partBottom, top2, s0, 1 - (top2 - partBottom) / segment, s1, 1);
    }
    columnsInto(CELLS.tips + drip.tip);
    const end = half * narrowing(bottom);
    pushDripQuad(out, pos, scratchTangent, normal, slope, u, end, end, head + px - tipHeight, head + px, COLS[0], 1 - TIP_HEIGHTS[drip.tip] / CELL, COLS[1], 1);
  }
  if (target)
    return target;
  out.quads.length = out.count;
  return out.quads;
}

/**
 * A droplet or a gib in the air: a square facing the camera, turned by `spin` in the view plane.
 * `right` and `up` are the camera's axes in the world.
 */
export function particleQuad({ pos, gib, variant = 0, scale = 1, visualScale }, right, up, spin = 0, target = null) {
  const half = (gib ? 1.75 : 0.65) * (visualScale ?? scale);
  const cos = Math.cos(spin) * half;
  const sin = Math.sin(spin) * half;
  const x = pos.x;
  const y = pos.y;
  const z = pos.z;
  const r0 = right.x;
  const r1 = right.y;
  const r2 = right.z;
  const u0 = up.x;
  const u1 = up.y;
  const u2 = up.z;
  const cell = gib ? CELLS.gib + ((variant >>> 0) % GIB_VARIANTS) : CELLS.drop;
  const corners = target ? target.corners : new Array(12);
  // (-1, -1)
  let r = -cos + sin;
  let u = -sin - cos;
  corners[0] = x + r0 * r + u0 * u;
  corners[1] = z + r1 * r + u1 * u;
  corners[2] = y + r2 * r + u2 * u;
  // (1, -1)
  r = cos + sin;
  u = sin - cos;
  corners[3] = x + r0 * r + u0 * u;
  corners[4] = z + r1 * r + u1 * u;
  corners[5] = y + r2 * r + u2 * u;
  // (1, 1)
  r = cos - sin;
  u = sin + cos;
  corners[6] = x + r0 * r + u0 * u;
  corners[7] = z + r1 * r + u1 * u;
  corners[8] = y + r2 * r + u2 * u;
  // (-1, 1)
  r = -cos - sin;
  u = -sin + cos;
  corners[9] = x + r0 * r + u0 * u;
  corners[10] = z + r1 * r + u1 * u;
  corners[11] = y + r2 * r + u2 * u;
  if (target) {
    target.uv = cellUv(cell);
    return target;
  }
  return { corners, uv: cellUv(cell) };
}

/**
 * Blood on the player's view, as flat 2D quads in screen pixels: a starburst that grows out, and a drip that slides
 * down from it, all fading with `fade`. Each quad is `{ rect, uv, fade }` with a Rect, y down. It is the same atlas as
 * the blood in the world, so the same red pixels are on the glass. Without a `target` the quads are fresh and returned
 * as an array; with a `createQuadTarget()` they are written into it (overwritten by the next call, valid up to
 * `target.count`) and the target is returned.
 */
export function screenSplatQuads({ pos, size, age, drip, seed }, viewportSize, fade, target = null) {
  const out = target ?? createQuadTarget();
  out.count = 0;
  const rnd = mulberry32(seed);
  const grow = 1 - Math.pow(1 - Math.min(1, age * 7), 3);
  const half = size * (0.35 + 0.65 * grow) * 1.4;
  const cx = pos.x * viewportSize.x;
  const cy = pos.y * viewportSize.y;
  const burst = cellUv(CELLS.floor + Math.floor(rnd() * FLOOR_VARIANTS));
  setScreenQuad(out, scratchCornerMin.setScalar(cx - half, cy - half), scratchCornerMax.setScalar(cx + half, cy + half), burst[0], burst[1], burst[2], burst[3], fade);
  const run = drip * Math.min(1, age * 0.9);
  if (run > 4) {
    // the drip on the glass is the ribbon kind, with a slanted or pointed tip; slender screen-pixel scale
    const dx = cx + (rnd() - 0.5) * size * 0.4;
    const px = 0.55;
    const top = cy + size * 0.2;
    const half = ((STEM_TO - STEM_FROM) / 2) * px * 2;
    columnsInto(CELLS.stems + 1);
    const s0 = COLS[0];
    const s1 = COLS[1];
    const tip = rnd() < 0.5 ? 0 : 1;
    const segment = CELL * px * 2;
    for (let y0 = 0; y0 > -run + 1e-6; y0 -= segment) {
      const bottom = Math.max(-run, y0 - segment);
      setScreenQuad(out, scratchCornerMin.setScalar(dx - half, top - y0), scratchCornerMax.setScalar(dx + half, top - bottom), s0, 1 - (y0 - bottom) / segment, s1, 1, fade);
    }
    columnsInto(CELLS.tips + tip);
    const tipHeight = TIP_HEIGHTS[tip] * px * 2;
    setScreenQuad(out, scratchCornerMin.setScalar(dx - half, top + run - px * 2), scratchCornerMax.setScalar(dx + half, top + run - px * 2 + tipHeight), COLS[0], 1 - TIP_HEIGHTS[tip] / CELL, COLS[1], 1, fade);
  }
  if (target)
    return target;
  out.quads.length = out.count;
  return out.quads;
}

function setScreenQuad(target, topLeft, bottomRight, u0, v0, u1, v1, fade) {
  const q = target.quads[target.count] ?? (target.quads[target.count] = { rect: new Rect(), uv: [0, 0, 0, 0], fade: 0 });
  target.count++;
  q.rect.topLeftCorner.copy(topLeft);
  q.rect.bottomRightCorner.copy(bottomRight);
  q.uv[0] = u0;
  q.uv[1] = v0;
  q.uv[2] = u1;
  q.uv[3] = v1;
  q.fade = fade;
}
