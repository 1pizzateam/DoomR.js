import { mulberry32 } from './rng.js';
import { GLOW, LIGHT, METAL, mix, plate, rivet, SHADOW, Tile } from './floor.js';

/**
 * The walls of an old space base: riveted steel bulkhead panels, vents, pipe runs, light strips, a console and the
 * green-lit exit hatch, in a pixel-art atlas drawn here in code. One cell is one 64 x 64 piece of wall (one tile wide
 * and as high as a low wall), so a texel is one world unit. The rust is not in the pictures: the shader of the doors
 * rusts the walls too, in the same many small patches, thicker low down.
 */

export const WALL_CELLS = { plain: 0, vent: 1, pipes: 2, lights: 3, console: 4, exit: 5, top: 6, seam: 7 };
export const WALL_CELL_COUNT = 8;
const SIZE = 64;

const SIGNAL = [70, 230, 150];
const FRAME = [20, 26, 40];

/** A bevelled recess or boss: light on one pair of edges, dark on the other. */
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

/** The bulkhead: two stacked plates, a kick plate at the foot and a trim at the top, riveted. */
function bulkhead(t, rnd) {
  plate(t, 0, 0, SIZE, SIZE, rnd, mix(METAL, FRAME, 0.25));
  // a joint between the plates, part way up
  for (let x = 0; x < SIZE; x++) {
    t.set(x, 31, SHADOW, 0.9);
    t.set(x, 32, LIGHT, 0.35);
  }
  // the trim along the top, and the kick plate along the foot
  for (let x = 0; x < SIZE; x++) {
    t.set(x, 3, SHADOW, 0.6);
    t.set(x, 4, LIGHT, 0.3);
    t.set(x, 56, LIGHT, 0.35);
    t.set(x, 57, SHADOW, 0.7);
  }
  for (let y = 58; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++)
      t.set(x, y, mix(METAL, SHADOW, 0.45 + ((x >> 3) + (y >> 2)) % 2 * 0.08));
  }
  // vertical joints at the sides, so neighbouring cells read as separate panels
  for (let y = 0; y < SIZE; y++) {
    t.set(0, y, SHADOW, 0.85);
    t.set(1, y, LIGHT, 0.2);
    t.set(SIZE - 1, y, SHADOW, 0.85);
  }
  for (const [x, y] of [[4, 6], [57, 6], [4, 24], [57, 24], [4, 35], [57, 35], [4, 50], [57, 50]])
    rivet(t, x, y);
}

function drawPlain(t, rnd) {
  bulkhead(t, rnd);
  // a few scuffs and a small stamped plate
  for (let k = 0; k < 8; k++) {
    const x = 6 + Math.floor(rnd() * 50);
    const y = 8 + Math.floor(rnd() * 44);
    for (let d = 0; d < 2 + Math.floor(rnd() * 5); d++)
      t.set(x + d, y + (d >> 1), LIGHT, 0.3);
  }
  bevel(t, 22, 14, 20, 12, false);
}

function drawVent(t, rnd) {
  bulkhead(t, rnd);
  bevel(t, 12, 9, 40, 40, true);
  for (let y = 13; y < 46; y += 4) {
    for (let x = 15; x < 49; x++) {
      t.set(x, y, SHADOW);
      t.set(x, y + 1, SHADOW, 0.8);
      t.set(x, y + 2, LIGHT, 0.45);
    }
  }
  for (const [x, y] of [[14, 11], [47, 11], [14, 44], [47, 44]])
    rivet(t, x, y);
}

function drawPipes(t, rnd) {
  bulkhead(t, rnd);
  for (const x of [13, 27, 48]) {
    const w = x === 27 ? 9 : 6;
    for (let px = x; px < x + w; px++) {
      const shade = Math.abs(px - (x + w / 2)) / (w / 2);
      for (let y = 0; y < 58; y++)
        t.set(px, y, mix(LIGHT, SHADOW, 0.25 + shade * 0.7), 0.95);
    }
    // clamps
    for (const y of [8, 28, 46]) {
      t.rect(x - 1, y, w + 2, 3, mix(METAL, LIGHT, 0.5));
      t.rect(x - 1, y + 3, w + 2, 1, SHADOW);
    }
  }
}

function drawLights(t, rnd) {
  bulkhead(t, rnd);
  for (const x of [18, 44]) {
    t.rect(x - 2, 8, 8, 46, SHADOW, 0.9);
    for (let y = 10; y < 52; y++) {
      t.set(x - 1, y, GLOW, 0.14);
      t.set(x + 4, y, GLOW, 0.14);
      t.set(x, y, GLOW, 0.4);
      t.set(x + 3, y, GLOW, 0.4);
      t.set(x + 1, y, mix(GLOW, [210, 230, 255], 0.25), 0.95);
      t.set(x + 2, y, mix(GLOW, [210, 230, 255], 0.25), 0.95);
    }
  }
}

function drawConsole(t, rnd) {
  bulkhead(t, rnd);
  bevel(t, 9, 10, 46, 38, false);
  // a dark screen with a trace on it
  t.rect(12, 13, 40, 18, SHADOW, 0.95);
  for (let x = 13; x < 51; x++) {
    const y = 22 + Math.round(Math.sin(x * 0.45) * 4 + Math.sin(x * 1.3) * 2);
    t.set(x, y, SIGNAL, 0.85);
    t.set(x, y + 1, SIGNAL, 0.25);
  }
  bevel(t, 12, 13, 40, 18, false);
  // rows of indicator lights and a few buttons
  for (let i = 0; i < 8; i++) {
    const lit = (i * 5 + 3) % 7 < 4;
    t.rect(13 + i * 5, 36, 3, 3, lit ? SIGNAL : mix(SHADOW, METAL, 0.5), lit ? 0.9 : 1);
  }
  for (let i = 0; i < 4; i++)
    t.rect(14 + i * 10, 42, 6, 3, mix(METAL, LIGHT, 0.5));
}

/** The exit: a hatch outlined in green, with chevrons pointing in, lit. */
function drawExit(t, rnd) {
  bulkhead(t, rnd);
  t.rect(10, 8, 44, 44, SHADOW, 0.85);
  bevel(t, 10, 8, 44, 44, false);
  for (let i = 0; i < 44; i++) {
    t.set(10 + i, 8, SIGNAL, 0.95);
    t.set(10 + i, 51, SIGNAL, 0.95);
    t.set(10, 8 + i, SIGNAL, 0.95);
    t.set(53, 8 + i, SIGNAL, 0.95);
  }
  for (const y0 of [16, 28, 40]) {
    for (let k = 0; k < 14; k++) {
      const x = 32 - 14 + k;
      const dy = k < 7 ? k : 13 - k;
      for (let w = 0; w < 3; w++) {
        t.set(x, y0 + dy / 1.4 + w, SIGNAL, 0.95);
        t.set(x + 14, y0 + dy / 1.4 + w, SIGNAL, 0.4);
      }
    }
  }
}

/** The top of a low wall or a pillar: plain plate with a bevelled edge. */
function drawTop(t, rnd) {
  plate(t, 0, 0, SIZE, SIZE, rnd, mix(METAL, SHADOW, 0.2));
  for (let i = 8; i < 56; i += 8) {
    for (let x = 4; x < 60; x++)
      t.set(x, i, SHADOW, 0.5);
  }
  rivet(t, 3, 3);
  rivet(t, 58, 3);
  rivet(t, 3, 58);
  rivet(t, 58, 58);
}

/** Two bulkhead plates meeting: for the upper part of a tall wall, so it is not a repeat of the lower one. */
function drawSeam(t, rnd) {
  bulkhead(t, rnd);
  for (let x = 0; x < SIZE; x++) {
    t.set(x, 12, SHADOW, 0.8);
    t.set(x, 13, LIGHT, 0.3);
  }
}

const DRAW = [drawPlain, drawVent, drawPipes, drawLights, drawConsole, drawExit, drawTop, drawSeam];

/** The atlas as RGBA pixels, ready to be a texture; its size is a power of two, so it can have mipmaps. */
export function wallAtlas() {
  const width = SIZE * WALL_CELL_COUNT;
  const data = new Uint8Array(width * SIZE * 4);
  DRAW.forEach((draw, cell) => {
    const t = new Tile(SIZE, SIZE);
    draw(t, mulberry32(9000 + cell * 7919));
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 3;
        const o = (y * width + cell * SIZE + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Math.max(0, Math.min(255, Math.round(t.pixels[i + k])));
        data[o + 3] = 255;
      }
    }
  });
  return { name: 'wall', data, width, height: SIZE, cell: SIZE, frames: WALL_CELL_COUNT };
}

/** Texture coordinates of a cell, a hair inside its edges; `v0` and `v1` pick how much of it height-wise (0..1). */
export function wallCellUv(cell, v0 = 0, v1 = 1) {
  const inset = 0.25 / (SIZE * WALL_CELL_COUNT);
  return [cell / WALL_CELL_COUNT + inset, v0, (cell + 1) / WALL_CELL_COUNT - inset, v1];
}

/** Which cell goes on a tile's face: the exit hatch on exits, otherwise a mix scattered by where the tile is. */
export function wallCellFor(x, y, d, exit = false) {
  if (exit)
    return WALL_CELLS.exit;
  let h = Math.imul(x * 73856093 ^ y * 19349663 ^ d * 83492791, 2654435761);
  h ^= h >>> 15;
  const r = ((Math.imul(h, 2246822519) >>> 0) % 1000) / 1000;
  if (r < 0.5)
    return WALL_CELLS.plain;
  if (r < 0.64)
    return WALL_CELLS.vent;
  if (r < 0.78)
    return WALL_CELLS.pipes;
  if (r < 0.88)
    return WALL_CELLS.lights;
  return WALL_CELLS.console;
}

/**
 * The quads of one flat wall face, one per tile along it and per 64 units up it, each with its cell and the part of the
 * picture that fits. `face` is { axis, plane, from, to (tiles), base, top, x, y, d, exit }. Corners come back as in
 * `faceCorners`: bottom-left, bottom-right, top-right, top-left.
 */
export function wallFaceQuads({ axis, plane, from, to, base, top, x, y, d, exit }) {
  const out = [];
  for (let a = from; a <= to; a++) {
    const tx = axis === 'x' ? x : a;
    const ty = axis === 'x' ? a : y;
    const cell = wallCellFor(tx, ty, d, exit);
    for (let y0 = base, step = 0; y0 < top - 1e-6; y0 += SIZE, step++) {
      const y1 = Math.min(top, y0 + SIZE);
      const part = (y1 - y0) / SIZE;
      // the first piece is the picture from the bottom; a shorter one above shows its top, so the trim stays at the top
      const uv = step === 0 ? wallCellUv(cell, 0, part) : wallCellUv(WALL_CELLS.seam, 1 - part, 1);
      const a0 = a * SIZE;
      const a1 = a0 + SIZE;
      const corners = axis === 'x'
        ? [[plane, y0, a0], [plane, y0, a1], [plane, y1, a1], [plane, y1, a0]]
        : [[a0, y0, plane], [a1, y0, plane], [a1, y1, plane], [a0, y1, plane]];
      out.push({ corners: corners.flat(), uv });
    }
  }
  return out;
}
