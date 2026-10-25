import { Trigo, Utils, Vec2 } from '@1pizzateam/spock';
import { mulberry32 } from './rng.js';
import { field, GLOW, LIGHT, METAL, mix, periodicField, plate, rivet, SHADOW, Tile } from './floor.js';

const scratchPt = new Vec2();

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
  for (let y = 58; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++)
      t.set(x, y, mix(METAL, SHADOW, 0.45 + ((x >> 3) + (y >> 2)) % 2 * 0.08));
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
  for (let y = 13; y < 46; y += 4)
    for (let x = 15; x < 49; x++) {
      t.set(x, y, SHADOW);
      t.set(x, y + 1, SHADOW, 0.8);
      t.set(x, y + 2, LIGHT, 0.45);
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
  for (const y0 of [16, 28, 40])
    for (let k = 0; k < 14; k++) {
      const x = 32 - 14 + k;
      const dy = k < 7 ? k : 13 - k;
      for (let w = 0; w < 3; w++) {
        t.set(x, y0 + dy / 1.4 + w, SIGNAL, 0.95);
        t.set(x + 14, y0 + dy / 1.4 + w, SIGNAL, 0.4);
      }
    }
}

/** The top of a low wall or a pillar: plain plate with a bevelled edge. */
function drawTop(t, rnd) {
  plate(t, 0, 0, SIZE, SIZE, rnd, mix(METAL, SHADOW, 0.2));
  for (let i = 8; i < 56; i += 8)
    for (let x = 4; x < 60; x++)
      t.set(x, i, SHADOW, 0.5);
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
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 3;
        const o = (y * width + cell * SIZE + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(t.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name: 'wall', data, width, height: SIZE, cell: SIZE, frames: WALL_CELL_COUNT };
}

// ---- Martian rock cliff walls (E1M5 Red Planet) --------------------------------------------------------------------

const ROCK_ABYSS = [28, 11, 6];
const ROCK_DARK = [54, 20, 10];
const ROCK_BASALT = [42, 26, 22];
const ROCK_BASE = [126, 52, 24];
const ROCK_LIGHT = [178, 86, 38];
const ROCK_OCHRE = [204, 108, 48];

const TAU = Trigo.twopi / SIZE;

function periodicGrain(x, y) {
  const ix = ((x % SIZE) + SIZE) % SIZE;
  const iy = ((y % SIZE) + SIZE) % SIZE;
  let h = Math.imul(ix * 374761393 ^ iy * 668265263, 1274126177);
  h ^= h >>> 13;
  return (((Math.imul(h, 1911520717) >>> 0) % 1000) / 1000) - 0.5;
}

/** Smooth 0..1 mask that is 0 at all four tile borders (`x = 0, 63`, `y = 0, 63`) and 1 in the tile interior. */
function edgeMask(x, y, margin = 4) {
  const mx = Math.min(x, SIZE - 1 - x);
  const my = Math.min(y, SIZE - 1 - y);
  return Utils.smoothstep(0, margin, mx) * Utils.smoothstep(0, margin, my);
}

function wrapCoord(v) {
  return ((Math.round(v) % SIZE) + SIZE) % SIZE;
}

function createSharedRockTile() {
  const baseRnd = mulberry32(51000);
  const warpX = periodicField(baseRnd, 3, SIZE);
  const warpY = periodicField(baseRnd, 3, SIZE);
  const coarse = periodicField(baseRnd, 3, SIZE);
  const medium = periodicField(baseRnd, 6, SIZE);
  const fine = periodicField(baseRnd, 12, SIZE);
  const tile = new Tile(SIZE, SIZE);

  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      // Domain-warped periodic coordinates matching the floor regolith (no linear sine stripes)
      const wx = x + (warpX(x, y) - 0.5) * 20;
      const wy = y + (warpY(x, y) - 0.5) * 20;
      const c = coarse(wx, wy);
      const m = medium(wx + 11, wy + 7);
      const f = fine(x, y);
      const ridge = 1 - Math.abs((coarse(wx + 23, wy + 37) - 0.5) * 2);
      const shade = c * 0.45 + m * 0.35 + f * 0.2;
      let col = mix(ROCK_DARK, ROCK_BASE, Utils.clamp(shade * 1.15, 0, 1));
      col = mix(col, ROCK_LIGHT, ridge * 0.4 + (f - 0.5) * 0.24);
      if (shade > 0.64 && ridge > 0.56)
        col = mix(col, ROCK_OCHRE, (shade - 0.64) * 1.55);

      const grain = periodicGrain(x, y) * 12;
      tile.set(x, y, [col[0] + grain, col[1] + grain * 0.7, col[2] + grain * 0.45]);
    }

  // Modulo-wrapped regolith pebbles & stones matching the floor density and shading
  for (let k = 0; k < 22; k++) {
    const px = baseRnd() * SIZE;
    const py = baseRnd() * SIZE;
    const rx = 1.1 + baseRnd() * 2.4;
    const ry = 0.9 + baseRnd() * 2.0;
    const basalt = baseRnd() < 0.45;
    const rockCol = basalt ? mix(ROCK_BASALT, ROCK_BASE, 0.25) : mix(ROCK_BASE, ROCK_LIGHT, 0.5);
    const rCeil = Math.ceil(Math.max(rx, ry)) + 1;
    for (let dy = -rCeil; dy <= rCeil; dy++)
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        const d = scratchPt.setScalar(dx / rx, dy / ry).getMagnitude();
        if (d > 1.15)
          continue;
        const wx = wrapCoord(px + dx);
        const wy = wrapCoord(py + dy);
        if (d > 0.88)
          tile.set(wx, wy, k === 0 ? ROCK_ABYSS : ROCK_DARK, 0.65);
        else {
          const highlight = dx - dy < 0 ? 0.35 : -0.25;
          const c = highlight > 0 ? mix(rockCol, ROCK_OCHRE, highlight) : mix(rockCol, ROCK_DARK, -highlight);
          tile.set(wx, wy, c, 0.92);
        }
      }
  }

  return tile;
}

let sharedRockTile = null;

function rockCliffBase(t) {
  sharedRockTile ??= createSharedRockTile();
  t.pixels.set(sharedRockTile.pixels);
}

function scatterRockNodules(t, rnd, count, maxRadius = 3.4) {
  for (let k = 0; k < count; k++) {
    const px = 6 + rnd() * (SIZE - 12);
    const py = 6 + rnd() * (SIZE - 12);
    const rx = 1.3 + rnd() * maxRadius;
    const ry = 1.0 + rnd() * (maxRadius * 0.8);
    const basalt = rnd() < 0.48;
    const rockCol = basalt ? mix(ROCK_BASALT, ROCK_BASE, 0.3) : mix(ROCK_BASE, ROCK_LIGHT, 0.55);
    const rCeil = Math.ceil(Math.max(rx, ry)) + 1;
    for (let dy = -rCeil; dy <= rCeil; dy++)
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        const x = Math.round(px + dx);
        const y = Math.round(py + dy);
        const mask = edgeMask(x, y, 5);
        if (mask <= 0.01)
          continue;
        const d = scratchPt.setScalar(dx / rx, dy / ry).getMagnitude();
        if (d > 1.15)
          continue;
        if (d > 0.86)
          t.set(x, y, ROCK_ABYSS, 0.72 * mask);
        else {
          const highlight = dx - dy < 0 ? 0.42 : -0.32;
          const c = highlight > 0 ? mix(rockCol, ROCK_OCHRE, highlight) : mix(rockCol, ROCK_DARK, -highlight);
          t.set(x, y, c, 0.88 * mask);
        }
      }
  }
}

function carveRockCracks(t, rnd, count) {
  for (let k = 0; k < count; k++) {
    let x = 8 + Math.floor(rnd() * (SIZE - 16));
    let y = 6 + Math.floor(rnd() * 6);
    const maxY = SIZE - 6 - Math.floor(rnd() * 6);
    while (y < maxY) {
      x = Utils.clamp(x + Math.round((rnd() - 0.5) * 2.6), 7, SIZE - 8);
      y += 1;
      const mask = edgeMask(x, y, 5);
      if (mask <= 0.02)
        continue;
      t.set(x, y, ROCK_ABYSS, 0.85 * mask);
      t.set(x - 1, y, ROCK_DARK, 0.58 * mask);
      t.set(x + 1, y, ROCK_OCHRE, 0.5 * mask);
    }
  }
}

function drawRockPlain(t, rnd) {
  rockCliffBase(t);
  const drift = periodicField(rnd, 3, SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const mask = edgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const d = drift(x, y);
      if (d > 0.56)
        t.set(x, y, ROCK_LIGHT, (d - 0.56) * 0.95 * mask);
      else if (d < 0.42)
        t.set(x, y, ROCK_DARK, (0.42 - d) * 0.75 * mask);
    }
  scatterRockNodules(t, rnd, 9, 2.4);
}

function drawRockFissures(t, rnd) {
  rockCliffBase(t);
  const warpX = periodicField(rnd, 3, SIZE);
  const warpY = periodicField(rnd, 3, SIZE);
  const strata = periodicField(rnd, 4, SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const mask = edgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const wx = x + (warpX(x, y) - 0.5) * 22;
      const wy = y + (warpY(x, y) - 0.5) * 22;
      const ridge = 1 - Math.abs((strata(wx, wy) - 0.5) * 2);
      if (ridge > 0.64)
        t.set(x, y, ROCK_OCHRE, (ridge - 0.64) * 1.45 * mask);
      else if (ridge < 0.35)
        t.set(x, y, ROCK_DARK, (0.35 - ridge) * 1.35 * mask);
    }
  scatterRockNodules(t, rnd, 10, 2.6);
}

function drawRockColumns(t, rnd) {
  rockCliffBase(t);
  const patch = periodicField(rnd, 3, SIZE);
  const detail = periodicField(rnd, 8, SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const mask = edgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const p = patch(x, y) * 0.75 + detail(x, y) * 0.25;
      if (p > 0.52) {
        const edge = Math.min(1, (p - 0.52) * 4.6) * mask;
        const vein = detail(x + 13, y + 7) > 0.62 ? ROCK_OCHRE : detail(x + 5, y + 19) < 0.38 ? ROCK_DARK : ROCK_BASALT;
        t.set(x, y, mix(ROCK_BASE, vein, 0.74), edge * 0.82);
      }
    }
  scatterRockNodules(t, rnd, 14, 3.0);
}

function drawRockMagmaVeins(t, rnd) {
  rockCliffBase(t);
  carveRockCracks(t, rnd, 3);
  for (const xStart of [20, 44]) {
    let x = xStart;
    for (let y = 6; y < 58; y++) {
      x = Utils.clamp(x + Math.round((rnd() - 0.5) * 2.0), 8, SIZE - 8);
      const mask = edgeMask(x, y, 5);
      t.set(x - 2, y, ROCK_DARK, 0.7 * mask);
      t.set(x + 2, y, ROCK_DARK, 0.7 * mask);
      t.set(x - 1, y, [210, 72, 20], 0.6 * mask);
      t.set(x + 1, y, [210, 72, 20], 0.6 * mask);
      t.set(x, y, [255, 148, 48], 0.88 * mask);
    }
  }
  scatterRockNodules(t, rnd, 10, 2.5);
}

function drawRockAlcove(t, rnd) {
  rockCliffBase(t);
  const hollow = periodicField(rnd, 3, SIZE);
  const rim = periodicField(rnd, 6, SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const mask = edgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const h = hollow(x, y);
      if (h > 0.52) {
        const depth = Math.min(1, (h - 0.52) * 4.2) * mask;
        const ledge = rim(x + 9, y + 15) > 0.56 ? ROCK_OCHRE : ROCK_DARK;
        t.set(x, y, mix(ROCK_BASALT, ledge, 0.58), depth * 0.78);
      }
    }
  scatterRockNodules(t, rnd, 11, 2.8);
}

function drawRockExit(t) {
  rockCliffBase(t);
  // Ancient rock-hewn monolith portal with glowing exit chevrons so the exit remains unmistakable outdoors
  t.rect(10, 8, 44, 46, ROCK_ABYSS, 0.9);
  for (let i = 0; i < 44; i++) {
    t.set(10 + i, 8, SIGNAL, 0.95);
    t.set(10 + i, 53, SIGNAL, 0.95);
    t.set(10, 8 + i, SIGNAL, 0.95);
    t.set(53, 8 + i, SIGNAL, 0.95);
  }
  for (const y0 of [16, 28, 40])
    for (let k = 0; k < 14; k++) {
      const x = 32 - 14 + k;
      const dy = k < 7 ? k : 13 - k;
      for (let w = 0; w < 3; w++) {
        t.set(x, y0 + dy / 1.4 + w, SIGNAL, 0.95);
        t.set(x + 14, y0 + dy / 1.4 + w, SIGNAL, 0.4);
      }
    }
}

function drawRockTop(t, rnd) {
  rockCliffBase(t);
  const scree = periodicField(rnd, 4, SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const mask = edgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const s = scree(x, y);
      if (s > 0.58)
        t.set(x, y, ROCK_OCHRE, (s - 0.58) * 1.15 * mask);
      else if (s < 0.38)
        t.set(x, y, ROCK_BASALT, (0.38 - s) * 1.25 * mask);
    }
  scatterRockNodules(t, rnd, 16, 3.4);
  carveRockCracks(t, rnd, 2);
}

function drawRockSeam(t, rnd) {
  rockCliffBase(t);
  const basin = periodicField(rnd, 3, SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const mask = edgeMask(x, y, 5);
      if (mask > 0.01 && basin(x, y) > 0.48)
        t.set(x, y, mix(ROCK_BASE, ROCK_OCHRE, 0.38), (basin(x, y) - 0.48) * 1.1 * mask);
    }
  scatterRockNodules(t, rnd, 12, 2.6);
  carveRockCracks(t, rnd, 4);
}

const MARS_ROCK_DRAW = [
  drawRockPlain,
  drawRockFissures,
  drawRockColumns,
  drawRockMagmaVeins,
  drawRockAlcove,
  drawRockExit,
  drawRockTop,
  drawRockSeam,
];

/**
 * 8-cell 512x64 procedural Martian canyon rock & cliff wall atlas for `planet: 'mars'`.
 * Replaces riveted steel bulkheads, vents, pipes, and consoles with craggy red-orange rock strata and fissures.
 */
export function marsRockAtlas() {
  const width = SIZE * WALL_CELL_COUNT;
  const data = new Uint8Array(width * SIZE * 4);
  MARS_ROCK_DRAW.forEach((draw, cell) => {
    const t = new Tile(SIZE, SIZE);
    draw(t, mulberry32(51000 + cell * 9973));
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 3;
        const o = (y * width + cell * SIZE + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(t.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name: 'marsRock', data, width, height: SIZE, cell: SIZE, frames: WALL_CELL_COUNT };
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

/**
 * The quads of one diagonal (45-degree) wall hypotenuse face, stacked 64 units at a time from `base` to `top`.
 */
export function diagWallFaceQuads({ ax, ay, bx, by, base, top, x, y, diag, exit }) {
  const out = [];
  const cell = wallCellFor(x, y, 4 + diag, exit);
  for (let y0 = base, step = 0; y0 < top - 1e-6; y0 += SIZE, step++) {
    const y1 = Math.min(top, y0 + SIZE);
    const part = (y1 - y0) / SIZE;
    const uv = step === 0 ? wallCellUv(cell, 0, part) : wallCellUv(WALL_CELLS.seam, 1 - part, 1);
    const corners = [[ax, y0, ay], [bx, y0, by], [bx, y1, by], [ax, y1, ay]];
    out.push({ corners: corners.flat(), uv });
  }
  return out;
}
