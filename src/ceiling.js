import { mulberry32 } from './rng.js';
import { GLOW, LIGHT, METAL, mix, plate, rivet, SHADOW, Tile } from './floor.js';

/**
 * The ceiling of an old space base: dark steel panels with ribs, ducts, grilles and long light fixtures, as a
 * pixel-art atlas drawn here in code. One cell is one 64 x 64 tile of the level. It is seen from below, far off and
 * near the top of the screen, so it is kept dark and quiet. The rust is the floor's, worked out in its shader.
 */

export const CEILING_CELLS = { panels: 0, ribs: 1, duct: 2, grille: 3, light: 4 };
export const CEILING_CELL_COUNT = 5;
const SIZE = 64;
const FRAME = [14, 19, 30];
const WARM = [214, 232, 255];

function base(t, rnd) {
  plate(t, 0, 0, SIZE, SIZE, rnd, mix(METAL, FRAME, 0.5));
  for (let i = 0; i < SIZE; i++) {
    t.set(i, 32, SHADOW, 0.6);
    t.set(32, i, SHADOW, 0.6);
  }
  for (const [x, y] of [[4, 4], [57, 4], [4, 57], [57, 57]])
    rivet(t, x, y);
}

function drawPanels(t, rnd) {
  base(t, rnd);
  for (let k = 0; k < 6; k++) {
    const x = 6 + Math.floor(rnd() * 50);
    const y = 6 + Math.floor(rnd() * 50);
    for (let d = 0; d < 2 + Math.floor(rnd() * 5); d++)
      t.set(x + d, y, LIGHT, 0.25);
  }
}

/** Structural ribs across the tile, with a deep shadow either side. */
function drawRibs(t, rnd) {
  base(t, rnd);
  for (const x of [10, 28, 46]) {
    t.rect(x - 2, 0, 8, SIZE, SHADOW, 0.55);
    t.rect(x, 0, 4, SIZE, mix(METAL, LIGHT, 0.45));
    for (let y = 0; y < SIZE; y++) {
      t.set(x, y, LIGHT, 0.5);
      t.set(x + 3, y, SHADOW, 0.8);
    }
    for (const y of [8, 36]) {
      t.rect(x - 1, y, 6, 3, mix(METAL, LIGHT, 0.6));
      t.rect(x - 1, y + 3, 6, 1, SHADOW);
    }
  }
}

/** A round duct running along the tile, with bands. */
function drawDuct(t, rnd) {
  base(t, rnd);
  for (let y = 14; y < 50; y++) {
    const shade = Math.abs(y - 32) / 18;
    for (let x = 0; x < SIZE; x++)
      t.set(x, y, mix(LIGHT, SHADOW, 0.15 + shade * 0.8), 0.96);
  }
  for (const x of [10, 30, 52]) {
    t.rect(x, 12, 4, 40, mix(METAL, LIGHT, 0.5));
    t.rect(x + 4, 12, 1, 40, SHADOW);
    t.rect(x, 12, 1, 40, LIGHT, 0.5);
  }
}

function drawGrille(t, rnd) {
  base(t, rnd);
  t.rect(10, 10, 44, 44, SHADOW, 0.9);
  for (let x = 13; x < 51; x += 4)
    t.rect(x, 12, 2, 40, mix(METAL, LIGHT, 0.4));
  for (const [a, b] of [[10, 10], [10, 53]]) {
    for (let i = 0; i < 44; i++)
      t.set(10 + i, a === 10 && b === 10 ? 10 : 53, LIGHT, 0.6);
  }
}

/** A long light fixture: a recessed housing with a bright diffuser, the one bright thing up there. */
function drawLight(t, rnd) {
  base(t, rnd);
  t.rect(6, 22, 52, 20, SHADOW, 0.95);
  for (let y = 25; y < 39; y++) {
    for (let x = 9; x < 55; x++) {
      const edge = Math.min(y - 25, 38 - y) / 6;
      t.set(x, y, mix(GLOW, WARM, 0.55 + 0.4 * Math.min(1, edge)), 0.9);
    }
  }
  for (let x = 6; x < 58; x++) {
    t.set(x, 22, LIGHT, 0.7);
    t.set(x, 41, SHADOW);
  }
  for (const x of [20, 32, 44])
    t.rect(x, 25, 1, 14, SHADOW, 0.6);
}

const DRAW = [drawPanels, drawRibs, drawDuct, drawGrille, drawLight];

/** The atlas as RGBA pixels, ready to be a texture; its size is a power of two, so it can have mipmaps. */
export function ceilingAtlas() {
  const width = SIZE * 8;
  const data = new Uint8Array(width * SIZE * 4);
  DRAW.forEach((draw, cell) => {
    const t = new Tile(SIZE, SIZE);
    draw(t, mulberry32(4400 + cell * 7919));
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
  // the unused cells are plain steel, so the atlas can stay a power of two
  for (let cell = CEILING_CELL_COUNT; cell < 8; cell++) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const o = (y * width + cell * SIZE + x) * 4;
        data.set([METAL[0], METAL[1], METAL[2], 255], o);
      }
    }
  }
  return { name: 'ceiling', data, width, height: SIZE, cell: SIZE, frames: 8 };
}

export function ceilingCellUv(cell) {
  const inset = 0.25 / (SIZE * 8);
  return [cell / 8 + inset, 0, (cell + 1) / 8 - inset, 1];
}

/** Which cell hangs over a tile: light fixtures in a regular rhythm, so a room reads as lit, the rest scattered. */
export function ceilingCellFor(x, y) {
  if ((x + 2 * y) % 5 === 0)
    return CEILING_CELLS.light;
  let h = Math.imul(x * 73856093 ^ y * 19349663 ^ 5, 2654435761);
  h ^= h >>> 15;
  const r = ((Math.imul(h, 2246822519) >>> 0) % 1000) / 1000;
  if (r < 0.45)
    return CEILING_CELLS.panels;
  if (r < 0.7)
    return CEILING_CELLS.ribs;
  if (r < 0.88)
    return CEILING_CELLS.duct;
  return CEILING_CELLS.grille;
}
