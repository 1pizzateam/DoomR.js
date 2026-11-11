import { Utils, Vec2, Vec3 } from '@1pizzateam/spock';
import { mulberry32 } from './rng.js';
import { FLOOR_FRAGMENT, FLOOR_VERTEX, GLOW, LIGHT, METAL, mix, plate, rivet, SHADOW, Tile } from './floor.js';

/**
 * The doors of an old space base: heavy sliding blast doors in two leaves, with a hazard-striped frame, recessed
 * panels, a viewing slit in each leaf and green status lights, rusted like the floor. A pixel-art atlas drawn here in
 * code: the face of the door (64 x 64, one texel per world unit) and its top, side by side in a 128 x 64 image.
 */

const DOOR_FACE = 0;
const DOOR_TOP = 1;
export const DOOR_CELLS = 2;
export const DOOR_THICKNESS = 8;
export const DOOR_INSET = 6;
const SIZE = 64;

const SIGNAL = [70, 230, 150];
const HAZARD = [150, 86, 30];
const HAZARD_DARK = [22, 20, 26];
const FRAME = [14, 18, 27];

const LOCK_THEMES = {
  red: { signal: [248, 36, 54], glow: [255, 118, 126], stripe: [196, 24, 38] },
  yellow: { signal: [252, 198, 38], glow: [255, 236, 118], stripe: [196, 142, 22] },
  blue: { signal: [58, 146, 255], glow: [138, 204, 255], stripe: [32, 96, 204] },
};

function bevel(t, x0, y0, w, h, rise = true) {
  const [a, b] = rise ? [LIGHT, SHADOW] : [SHADOW, LIGHT];
  for (let i = 0; i < w; i++) {
    t.set(x0 + i, y0, a, 0.8);
    t.set(x0 + i, y0 + h - 1, b);
  }
  for (let i = 0; i < h; i++) {
    t.set(x0, y0 + i, a, 0.65);
    t.set(x0 + w - 1, y0 + i, b);
  }
}

function hazardStrip(t, x0, y0, w, h, color = HAZARD) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++)
      t.set(x, y, Math.floor((x + y) / 4) % 2 ? color : HAZARD_DARK);
  for (let x = x0; x < x0 + w; x++) {
    t.set(x, y0, SHADOW, 0.7);
    t.set(x, y0 + h - 1, SHADOW, 0.7);
  }
}

function drawFace(rnd, lockColor = null) {
  const theme = lockColor ? LOCK_THEMES[lockColor] : null;
  const sig = theme ? theme.signal : SIGNAL;
  const slitGlow = theme ? theme.glow : GLOW;
  const stripeColor = theme ? theme.stripe : HAZARD;
  const t = new Tile(SIZE, SIZE);
  plate(t, 0, 0, SIZE, SIZE, rnd, mix(METAL, FRAME, 0.4));

  // the frame: dark, with hazard striping across the top and the bottom
  hazardStrip(t, 4, 3, 56, 7, stripeColor);
  hazardStrip(t, 4, 54, 56, 7, stripeColor);

  // two leaves, each with a recessed panel, ribs and a viewing slit
  for (const x0 of [5, 33]) {
    plate(t, x0, 12, 26, 40, rnd, mix(METAL, LIGHT, 0.18));
    bevel(t, x0 + 3, 28, 20, 20, false);
    for (let y = 31; y < 46; y += 4)
      for (let x = x0 + 5; x < x0 + 21; x++) {
        t.set(x, y, SHADOW, 0.55);
        t.set(x, y + 1, LIGHT, 0.2);
      }
    // the viewing slit
    for (let y = 16; y < 24; y++)
      for (let x = x0 + 5; x < x0 + 21; x++)
        t.set(x, y, mix(SHADOW, slitGlow, (theme ? 0.34 : 0.14) + (y - 16) * 0.018));
    bevel(t, x0 + 4, 15, 18, 10, false);
    for (let x = x0 + 5; x < x0 + 21; x++)
      t.set(x, 17, slitGlow, theme ? 0.85 : 0.5);
    rivet(t, x0 + 1, 13);
    rivet(t, x0 + 22, 13);
    rivet(t, x0 + 1, 47);
    rivet(t, x0 + 22, 47);
  }

  // the seam between the leaves
  for (let y = 11; y < 53; y++) {
    t.set(31, y, SHADOW);
    t.set(32, y, SHADOW);
    t.set(30, y, SHADOW, 0.45);
    t.set(33, y, LIGHT, 0.35);
  }

  // status lights either side of the seam: green when unlocked, or blazing keycard color when locked
  for (const x of [28, 35]) {
    const y0 = theme ? 14 : 26;
    const y1 = theme ? 50 : 38;
    for (let y = y0; y < y1; y++) {
      t.set(x, y, sig, 0.95);
      t.set(x + 1, y, theme ? slitGlow : sig, theme ? 0.8 : 0.65);
      t.set(x - 1, y, SHADOW, 0.6);
    }
  }
  if (theme) {
    // vertical keycard lock rails along the outer door jambs & central keycard reader escutcheon
    for (const x of [2, 60])
      for (let y = 12; y < 52; y++) {
        t.set(x, y, sig, 0.92);
        t.set(x + 1, y, slitGlow, 0.75);
      }
    t.rect(26, 27, 12, 10, SHADOW, 0.85);
    bevel(t, 26, 27, 12, 10, false);
    t.rect(28, 29, 8, 6, sig, 0.95);
    t.rect(29, 30, 6, 2, slitGlow, 0.9);
  }
  for (const x of [8, 53])
    t.rect(x, 54, 3, 2, sig, 0.9);
  return t;
}

function drawTop(rnd) {
  const t = new Tile(SIZE, SIZE);
  plate(t, 0, 0, SIZE, SIZE, rnd, mix(METAL, SHADOW, 0.3));
  for (let i = 8; i < 56; i += 8)
    for (let x = 4; x < 60; x++)
      t.set(x, i, SHADOW, 0.6);
  rivet(t, 3, 3);
  rivet(t, 58, 3);
  rivet(t, 3, 58);
  rivet(t, 58, 58);
  return t;
}

function buildDoorAtlas(name, lockColor = null) {
  const width = SIZE * DOOR_CELLS;
  const data = new Uint8Array(width * SIZE * 4);
  [drawFace(mulberry32(555), lockColor), drawTop(mulberry32(777))].forEach((tile, cell) => {
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 3;
        const o = (y * width + cell * SIZE + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name, data, width, height: SIZE, cell: SIZE, frames: DOOR_CELLS };
}

/** The atlas as RGBA pixels, ready to be a texture; its size is a power of two, so it can have mipmaps. */
export function doorAtlas() {
  return buildDoorAtlas('door', null);
}

/** Color-coded security door atlas ('red', 'yellow', or 'blue') with blazing keycard lock rails and status bars. */
export function lockedDoorAtlas(color = 'red') {
  return buildDoorAtlas(`${color}Door`, color);
}

const scratchCorner0 = new Vec3();
const scratchCorner1 = new Vec3();
const scratchCorner2 = new Vec3();
const scratchCorner3 = new Vec3();
const scratchUvMin = new Vec2();
const scratchUvMax = new Vec2();

function pushQuad(vertices, uvs, c0, c1, c2, c3, uvMin, uvMax) {
  vertices.push(c0.x, c0.y, c0.z, c1.x, c1.y, c1.z, c2.x, c2.y, c2.z, c0.x, c0.y, c0.z, c2.x, c2.y, c2.z, c3.x, c3.y, c3.z);
  uvs.push(uvMin.x, uvMin.y, uvMax.x, uvMin.y, uvMax.x, uvMax.y, uvMin.x, uvMin.y, uvMax.x, uvMax.y, uvMin.x, uvMax.y);
}

// one cell of an atlas of `cells` cells across, a hair inside its edges, v = 1 at the top of the picture
function pushCellQuad(vertices, uvs, c0, c1, c2, c3, cell, cells) {
  const u0 = cell / cells;
  const u1 = (cell + 1) / cells;
  const inset = 0.25 / (SIZE * cells);
  pushQuad(vertices, uvs, c0, c1, c2, c3, scratchUvMin.setScalar(u0 + inset, 0), scratchUvMax.setScalar(u1 - inset, 1));
}

// the four sides of a box standing on y = 0 take sideCell and its top takes topCell
function pushBoxFaces(vertices, uvs, h, height, sideCell, topCell, cells) {
  const c0 = scratchCorner0;
  const c1 = scratchCorner1;
  const c2 = scratchCorner2;
  const c3 = scratchCorner3;
  pushCellQuad(vertices, uvs, c0.setScalar(-h, 0, h), c1.setScalar(h, 0, h), c2.setScalar(h, height, h), c3.setScalar(-h, height, h), sideCell, cells);
  pushCellQuad(vertices, uvs, c0.setScalar(h, 0, -h), c1.setScalar(-h, 0, -h), c2.setScalar(-h, height, -h), c3.setScalar(h, height, -h), sideCell, cells);
  pushCellQuad(vertices, uvs, c0.setScalar(h, 0, h), c1.setScalar(h, 0, -h), c2.setScalar(h, height, -h), c3.setScalar(h, height, h), sideCell, cells);
  pushCellQuad(vertices, uvs, c0.setScalar(-h, 0, -h), c1.setScalar(-h, 0, h), c2.setScalar(-h, height, h), c3.setScalar(-h, height, -h), sideCell, cells);
  pushCellQuad(vertices, uvs, c0.setScalar(-h, height, h), c1.setScalar(h, height, h), c2.setScalar(h, height, -h), c3.setScalar(-h, height, -h), topCell, cells);
}

/**
 * The door as a box: four sides showing the face and a top, standing on y = 0. `dimensions` is a
 * Vec2(size, height) or Vec3(size, height, depth); the box is `size` wide and deep and `height` tall.
 * Vertices, texture coordinates (v = 1 at the top of a picture) and a primitive, for a RoostR CustomMesh.
 */
export function doorBox(dimensions) {
  const vertices = [];
  const uvs = [];
  pushBoxFaces(vertices, uvs, dimensions.x / 2, dimensions.y, DOOR_FACE, DOOR_TOP, DOOR_CELLS);
  return { vertices, uvs };
}

/**
 * Two thin blast door slabs recessed inside the 64-unit wall thickness (front & back airlock pair).
 * `dimensions` is a Vec3(width, height, thickness). When `alongY` is true, the corridor runs along Z
 * (doorway width spans X, slabs separated along Z); when false, the corridor runs along X (doorway width
 * spans Z, slabs separated along X).
 */
export function doubleDoorBox(dimensions, alongY = false, inset = DOOR_INSET) {
  const h = dimensions.x / 2;
  const height = dimensions.y;
  const thickness = dimensions.z;
  const outer = SIZE / 2 - inset;
  const vertices = [];
  const uvs = [];
  const c0 = scratchCorner0;
  const c1 = scratchCorner1;
  const c2 = scratchCorner2;
  const c3 = scratchCorner3;
  const push = (cell, uSpan = 1, vSpan = 1) => {
    const u0 = cell / DOOR_CELLS;
    const u1 = u0 + uSpan / DOOR_CELLS;
    const insetU = 0.25 / (SIZE * DOOR_CELLS);
    const insetV = 0.25 / SIZE;
    pushQuad(vertices, uvs, c0, c1, c2, c3, scratchUvMin.setScalar(u0 + insetU, insetV), scratchUvMax.setScalar(u1 - insetU, vSpan - insetV));
  };
  const edgeSpan = Math.min(1, thickness / SIZE);
  for (let slab = 0; slab < 2; slab++) {
    const d0 = slab === 0 ? -outer : outer - thickness;
    const d1 = slab === 0 ? -outer + thickness : outer;
    if (alongY) {
      c0.setScalar(-h, 0, d1); c1.setScalar(h, 0, d1); c2.setScalar(h, height, d1); c3.setScalar(-h, height, d1);
      push(DOOR_FACE);
      c0.setScalar(h, 0, d0); c1.setScalar(-h, 0, d0); c2.setScalar(-h, height, d0); c3.setScalar(h, height, d0);
      push(DOOR_FACE);
      c0.setScalar(h, 0, d1); c1.setScalar(h, 0, d0); c2.setScalar(h, height, d0); c3.setScalar(h, height, d1);
      push(DOOR_TOP, edgeSpan, 1);
      c0.setScalar(-h, 0, d0); c1.setScalar(-h, 0, d1); c2.setScalar(-h, height, d1); c3.setScalar(-h, height, d0);
      push(DOOR_TOP, edgeSpan, 1);
      c0.setScalar(-h, height, d1); c1.setScalar(h, height, d1); c2.setScalar(h, height, d0); c3.setScalar(-h, height, d0);
      push(DOOR_TOP, 1, edgeSpan);
    } else {
      c0.setScalar(d1, 0, h); c1.setScalar(d1, 0, -h); c2.setScalar(d1, height, -h); c3.setScalar(d1, height, h);
      push(DOOR_FACE);
      c0.setScalar(d0, 0, -h); c1.setScalar(d0, 0, h); c2.setScalar(d0, height, h); c3.setScalar(d0, height, -h);
      push(DOOR_FACE);
      c0.setScalar(d0, 0, h); c1.setScalar(d1, 0, h); c2.setScalar(d1, height, h); c3.setScalar(d0, height, h);
      push(DOOR_TOP, edgeSpan, 1);
      c0.setScalar(d1, 0, -h); c1.setScalar(d0, 0, -h); c2.setScalar(d0, height, -h); c3.setScalar(d1, height, -h);
      push(DOOR_TOP, edgeSpan, 1);
      c0.setScalar(d1, height, h); c1.setScalar(d1, height, -h); c2.setScalar(d0, height, -h); c3.setScalar(d0, height, h);
      push(DOOR_TOP, 1, edgeSpan);
    }
  }
  return { vertices, uvs };
}

/**
 * A secret push-wall door disguised as a flush bulkhead wall panel (cell 0 of the 8-cell wall atlas).
 * `dimensions` is a Vec2(size, height) or Vec3(size, height, depth).
 */
export function secretDoorBox(dimensions, wallCells = 8) {
  const vertices = [];
  const uvs = [];
  pushBoxFaces(vertices, uvs, dimensions.x / 2, dimensions.y, 0, 0, wallCells);
  return { vertices, uvs };
}


// ---- the shaders ---------------------------------------------------------------------------------------------------
// The same rust as the floor, in many small patches, but worked out on the door itself (from where a point is on its
// face), so it does not slide off the door as it sinks into the floor. Each door has its own, from where it stands.
// What is below the floor is not drawn.

export const DOOR_VERTEX = FLOOR_VERTEX;

// Unlike doors, wall quads must keep their screen coverage aligned with the solid backing at grazing angles.
export const WALL_VERTEX = FLOOR_VERTEX;

export const DOOR_FRAGMENT = FLOOR_FRAGMENT;
// walls are bigger and nearer than doors, so their patches are smaller and there are fewer of them
export const WALL_FRAGMENT = FLOOR_FRAGMENT;
