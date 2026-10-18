import { Utils } from '@1pizzateam/spock';
import { LIGHT_GLSL, SOLID_ALPHA } from './quads.js';
import { mulberry32 } from './rng.js';

export { LIGHT_GLSL };

/**
 * The floor of an old space base: worn deck plates, grating, hatches, cable runs, inlaid light strips and the odd
 * bolted-on patch or a cracked panel, as a pixel-art atlas drawn here in code (no image files). A cell is one 64 x 64 tile of
 * the level, so one texel is one world unit.
 *
 * The colours stay dark so the lines and the glow still read over them: the metal is a blue-grey close to the
 * background, and the rust is a dull brown, not the bright orange that means danger. The one bright orange on the
 * floor is the hazard striping on a doorstep, which is meant to.
 */

export const TILE_PIXELS = 64;
export const FLOOR_CELLS = { plain: 0, grating: 1, hatch: 2, patched: 3, cracked: 4, conduit: 5, hazard: 6, lights: 7 };
export const FLOOR_CELL_COUNT = 8;

export const METAL = [21, 27, 39];
export const LIGHT = [44, 56, 78];
export const SHADOW = [9, 12, 19];
export const RUST = [72, 38, 19];
export const RUST_BRIGHT = [112, 58, 24];
export const RUST_DARK = [38, 21, 13];
export const HAZARD = [160, 90, 30];
export const GLOW = [76, 128, 232];

export const mix = (a, b, t) => [Utils.lerp(a[0], b[0], t), Utils.lerp(a[1], b[1], t), Utils.lerp(a[2], b[2], t)];

/** A small RGB picture to draw on; the barrel shares it. */
export class Tile {
  constructor(width = TILE_PIXELS, height = TILE_PIXELS) {
    this.width = width;
    this.height = height;
    this.pixels = new Float32Array(width * height * 3);
  }

  set(x, y, color, amount = 1) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height)
      return;
    const i = (y * this.width + x) * 3;
    for (let k = 0; k < 3; k++)
      this.pixels[i + k] = Utils.lerp(this.pixels[i + k], color[k], amount);
  }

  get(x, y) {
    const i = (y * this.width + x) * 3;
    return [this.pixels[i], this.pixels[i + 1], this.pixels[i + 2]];
  }

  rect(x0, y0, w, h, color, amount = 1) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++)
        this.set(x, y, color, amount);
    }
  }
}

/** Smooth random 0..1 over the plane, a few octaves, so rust spreads in patches rather than as speckle. */
export function field(rnd, scale) {
  const size = 12;
  const grids = [0, 1, 2].map(() => Array.from({ length: (size + 1) * (size + 1) }, () => rnd()));
  return (x, y) => {
    let total = 0;
    let weight = 0;
    for (let o = 0; o < 3; o++) {
      const cell = scale / 2 ** o;
      const gx = x / cell;
      const gy = y / cell;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = gx - x0;
      const fy = gy - y0;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const at = (ix, iy) => grids[o][(((iy % size) + size) % size) * (size + 1) + (((ix % size) + size) % size)];
      const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
      const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
      const w = 1 / 2 ** o;
      total += (top * (1 - sy) + bottom * sy) * w;
      weight += w;
    }
    return total / weight;
  };
}

/** A beveled steel plate: grain, a light edge top and left, a dark one bottom and right, and rivets in the corners. */
export function plate(t, x0, y0, w, h, rnd, base = METAL) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const grain = (rnd() - 0.5) * 7 + (((x >> 2) + (y >> 2)) % 2 ? 1.5 : 0);
      t.set(x, y, [base[0] + grain, base[1] + grain, base[2] + grain * 1.2]);
    }
  }
  for (let i = 0; i < w; i++) {
    t.set(x0 + i, y0, LIGHT, 0.85);
    t.set(x0 + i, y0 + 1, LIGHT, 0.3);
    t.set(x0 + i, y0 + h - 1, SHADOW);
    t.set(x0 + i, y0 + h - 2, SHADOW, 0.5);
  }
  for (let i = 0; i < h; i++) {
    t.set(x0, y0 + i, LIGHT, 0.7);
    t.set(x0 + w - 1, y0 + i, SHADOW);
    t.set(x0 + w - 2, y0 + i, SHADOW, 0.5);
  }
}

export function rivet(t, x, y) {
  t.rect(x, y, 3, 3, mix(METAL, LIGHT, 0.55));
  t.set(x, y, LIGHT);
  t.set(x + 2, y + 2, SHADOW);
  t.set(x + 1, y + 3, SHADOW, 0.7);
  t.set(x + 3, y + 1, SHADOW, 0.7);
}

function rivets(t, inset) {
  const far = TILE_PIXELS - inset - 3;
  for (const [x, y] of [[inset, inset], [far, inset], [inset, far], [far, far]])
    rivet(t, x, y);
}

/**
 * Rust: it grows from a few places, brightest where it is thickest, and runs down in streaks. `amount` is how much
 * of the tile is touched, `holes` how much of that has rotted through to the dark below.
 */
export function rust(t, rnd, amount, holes = 0) {
  const patch = field(rnd, 22);
  const fine = field(rnd, 5);
  for (let y = 2; y < t.height - 2; y++) {
    for (let x = 2; x < t.width - 2; x++) {
      const n = patch(x, y) + (fine(x, y) - 0.5) * 0.25;
      const edge = n - (1 - amount);
      if (edge <= 0)
        continue;
      const depth = Math.min(1, edge * 4);
      let color = mix(RUST_DARK, RUST, fine(x + 40, y) * 0.8 + 0.2);
      if (depth > 0.55 && fine(x, y + 31) > 0.45)
        color = mix(RUST, RUST_BRIGHT, (fine(x * 2, y * 2) - 0.3) * 1.2);
      if (holes && n > 1 - holes)
        color = mix(SHADOW, RUST_DARK, fine(x, y) * 0.3);
      t.set(x, y, color, 0.35 + depth * 0.6);
    }
  }
  // streaks run down from the thick places
  for (let k = 0; k < 7; k++) {
    const x = 4 + Math.floor(rnd() * (t.width - 8));
    const y0 = 3 + Math.floor(rnd() * Math.max(1, t.height - 20));
    if (patch(x, y0) < 1 - amount * 0.9)
      continue;
    const length = 4 + Math.floor(rnd() * 14);
    for (let d = 0; d < length; d++)
      t.set(x, y0 + d, RUST_DARK, 0.55 * (1 - d / length));
  }
}

function scuffs(t, rnd, count) {
  for (let k = 0; k < count; k++) {
    const x = 3 + Math.floor(rnd() * (t.width - 6));
    const y = 3 + Math.floor(rnd() * (t.height - 6));
    const length = 2 + Math.floor(rnd() * 5);
    for (let d = 0; d < length; d++)
      t.set(x + d, y + (d >> 1), LIGHT, 0.35);
  }
}

function drawPlain(t, rnd) {
  // four plates in a tile: the seams are what makes it read as a deck
  for (const [x, y] of [[0, 0], [32, 0], [0, 32], [32, 32]])
    plate(t, x, y, 32, 32, rnd);
  rivets(t, 3);
  scuffs(t, rnd, 9);
}

function drawGrating(t, rnd) {
  plate(t, 0, 0, 64, 64, rnd);
  // a mesh of bars over a dark drop
  for (let y = 7; y < 57; y++) {
    for (let x = 7; x < 57; x++) {
      const bar = (x + y) % 8 < 2 || (x - y + 64) % 8 < 2;
      t.set(x, y, bar ? mix(METAL, LIGHT, 0.55 + (rnd() - 0.5) * 0.2) : SHADOW);
      if (bar && (x + y) % 8 === 0)
        t.set(x, y, LIGHT, 0.5);
    }
  }
  // the frame round it
  for (let i = 5; i < 59; i++) {
    t.set(i, 5, SHADOW);
    t.set(i, 58, LIGHT, 0.7);
    t.set(5, i, SHADOW);
    t.set(58, i, LIGHT, 0.7);
  }
  rivets(t, 1);
}

function drawHatch(t, rnd) {
  plate(t, 0, 0, 64, 64, rnd);
  const cx = 31.5;
  const cy = 31.5;
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < 22 && d >= 19)
        t.set(x, y, SHADOW);
      else if (d < 19 && d >= 17)
        t.set(x, y, LIGHT, 0.6);
      else if (d < 17) {
        // the cover: a few ribs across it
        const rib = Math.abs(((x + 4) % 9) - 4) < 1;
        t.set(x, y, rib ? mix(METAL, LIGHT, 0.45) : mix(METAL, SHADOW, 0.25));
      }
    }
  }
  // the wheel handle
  for (let a = 0; a < 6; a++) {
    const angle = (a / 6) * Math.PI;
    for (let d = -8; d <= 8; d += 0.5)
      t.set(cx + Math.cos(angle) * d, cy + Math.sin(angle) * d, mix(METAL, LIGHT, 0.7));
  }
  t.rect(29, 29, 5, 5, LIGHT, 0.8);
  for (let k = 0; k < 8; k++) {
    const angle = (k / 8) * Math.PI * 2 + 0.4;
    rivet(t, Math.round(cx + Math.cos(angle) * 25) - 1, Math.round(cy + Math.sin(angle) * 25) - 1);
  }
}

/** A square of fresh plate bolted over a damaged place, with a bead of weld round it. */
function drawPatched(t, rnd) {
  drawPlain(t, rnd);
  const w = 30 + Math.floor(rnd() * 8);
  const h = 22 + Math.floor(rnd() * 8);
  const x0 = 8 + Math.floor(rnd() * (TILE_PIXELS - w - 16));
  const y0 = 8 + Math.floor(rnd() * (TILE_PIXELS - h - 16));
  plate(t, x0, y0, w, h, rnd, mix(METAL, LIGHT, 0.28));
  for (let i = 0; i < w; i++) {
    t.set(x0 + i, y0 - 1, SHADOW, 0.8);
    t.set(x0 + i, y0 + h, SHADOW, 0.8);
  }
  for (let i = 0; i < h; i++) {
    t.set(x0 - 1, y0 + i, SHADOW, 0.8);
    t.set(x0 + w, y0 + i, SHADOW, 0.8);
  }
  for (const [x, y] of [[x0 + 2, y0 + 2], [x0 + w - 5, y0 + 2], [x0 + 2, y0 + h - 5], [x0 + w - 5, y0 + h - 5]])
    rivet(t, x, y);
}

/** A plate that has split: a crack with branches, and chips knocked out along it. */
function drawCracked(t, rnd) {
  drawPlain(t, rnd);
  let x = 8 + Math.floor(rnd() * 20);
  let y = 4;
  const branches = [];
  while (y < TILE_PIXELS - 5) {
    x += Math.round((rnd() - 0.45) * 2.4);
    y += 1;
    t.set(x, y, SHADOW);
    t.set(x + 1, y, SHADOW, 0.55);
    t.set(x - 1, y, LIGHT, 0.3);
    if (rnd() < 0.07)
      branches.push([x, y, rnd() < 0.5 ? -1 : 1]);
  }
  for (const [bx, by, dir] of branches) {
    let px = bx;
    let py = by;
    for (let i = 0; i < 6 + Math.floor(rnd() * 12); i++) {
      px += dir;
      py += Math.round(rnd() * 1.5);
      t.set(px, py, SHADOW, 0.9);
      t.set(px, py + 1, LIGHT, 0.25);
    }
  }
  for (let k = 0; k < 7; k++) {
    const cx = 10 + Math.floor(rnd() * 40);
    const cy = 6 + Math.floor(rnd() * 50);
    t.rect(cx, cy, 2 + Math.floor(rnd() * 3), 2, SHADOW, 0.8);
  }
}

function drawConduit(t, rnd) {
  drawPlain(t, rnd);
  // cables run across the tile under clamps
  for (const y of [19, 27, 41]) {
    for (let x = 0; x < 64; x++) {
      const sag = Math.round(Math.sin(x * 0.12 + y) * 0.9);
      t.set(x, y + sag, LIGHT, 0.7);
      t.set(x, y + sag + 1, mix(METAL, LIGHT, 0.25));
      t.set(x, y + sag + 2, mix(METAL, SHADOW, 0.3));
      t.set(x, y + sag + 3, SHADOW);
    }
  }
  for (const x of [14, 46]) {
    t.rect(x, 15, 5, 33, mix(METAL, LIGHT, 0.35));
    t.rect(x, 15, 5, 1, LIGHT);
    t.rect(x, 47, 5, 1, SHADOW);
    rivet(t, x + 1, 17);
    rivet(t, x + 1, 42);
  }
}

/** The doorstep: dull orange and dark stripes, worn through in places. */
function drawHazard(t, rnd) {
  plate(t, 0, 0, 64, 64, rnd, [18, 21, 29]);
  const wear = field(rnd, 8);
  for (let y = 5; y < 59; y++) {
    for (let x = 3; x < 61; x++) {
      const stripe = Math.floor((x + y) / 9) % 2 === 0;
      if (!stripe)
        continue;
      const worn = wear(x, y) > 0.62;
      t.set(x, y, worn ? mix(HAZARD, RUST_DARK, 0.75) : mix(HAZARD, RUST, 0.25 + (rnd() - 0.5) * 0.2), 0.9);
    }
  }
  for (let i = 3; i < 61; i++) {
    t.set(i, 5, SHADOW);
    t.set(i, 58, SHADOW);
  }
  rivets(t, 1);
}

/** Inlaid strips of light, the futuristic part: the one thing on the floor that is not dim. */
function drawLights(t, rnd) {
  drawPlain(t, rnd);
  for (const y of [14, 49]) {
    for (let x = 6; x < 58; x++) {
      const flicker = x > 24 && x < 31 ? 0.35 : 1;
      t.set(x, y - 2, GLOW, 0.1 * flicker);
      t.set(x, y + 2, GLOW, 0.1 * flicker);
      t.set(x, y - 1, GLOW, 0.3 * flicker);
      t.set(x, y + 1, GLOW, 0.3 * flicker);
      t.set(x, y, mix(GLOW, [210, 230, 255], 0.25), 0.95 * flicker);
    }
    t.rect(4, y - 2, 2, 5, SHADOW);
    t.rect(58, y - 2, 2, 5, SHADOW);
  }
}

const DRAW = [drawPlain, drawGrating, drawHatch, drawPatched, drawCracked, drawConduit, drawHazard, drawLights];

/** The atlas as RGBA pixels, ready to be a texture. Its size is a power of two, so it can have mipmaps. */
export function floorAtlas() {
  const width = TILE_PIXELS * FLOOR_CELL_COUNT;
  const height = TILE_PIXELS;
  const data = new Uint8Array(width * height * 4);
  DRAW.forEach((draw, cell) => {
    const tile = new Tile();
    draw(tile, mulberry32(7000 + cell * 104729));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < TILE_PIXELS; x++) {
        const i = (y * TILE_PIXELS + x) * 3;
        const o = (y * width + cell * TILE_PIXELS + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
    }
  });
  return { name: 'floor', data, width, height, cell: TILE_PIXELS, frames: FLOOR_CELL_COUNT };
}

/** Texture coordinates of a cell: [u0, v0, u1, v1], with v1 at the top of the image. A hair inside, so mipmaps do not bleed. */
export function floorCellUv(cell) {
  const inset = 0.25 / (TILE_PIXELS * FLOOR_CELL_COUNT);
  return [cell / FLOOR_CELL_COUNT + inset, 0, (cell + 1) / FLOOR_CELL_COUNT - inset, 1];
}

/**
 * Which cell is on a tile. Doorsteps are hazard stripes; the rest are scattered by a hash of where they are, so a room
 * is neither a grid of copies nor random noise, and the same level always looks the same.
 */
export function floorCellFor(x, y, door = false) {
  if (door)
    return FLOOR_CELLS.hazard;
  let h = Math.imul(x * 73856093 ^ y * 19349663, 2654435761);
  h ^= h >>> 15;
  const r = ((Math.imul(h, 2246822519) >>> 0) % 1000) / 1000;
  if (r < 0.46)
    return FLOOR_CELLS.plain;
  if (r < 0.58)
    return FLOOR_CELLS.grating;
  if (r < 0.66)
    return FLOOR_CELLS.hatch;
  if (r < 0.77)
    return FLOOR_CELLS.patched;
  if (r < 0.82)
    return FLOOR_CELLS.cracked;
  if (r < 0.92)
    return FLOOR_CELLS.conduit;
  return FLOOR_CELLS.lights;
}

// ---- rust, in the shader -------------------------------------------------------------------------------------------
//
// Rust is not drawn in the tiles. It is worked out per pixel from where that pixel is in the world, so a patch carries
// on across the seam between tiles and gathers along the seams of the plates, instead of stopping at the edge of one
// tile with a clean tile beside it. There are many small patches, not a few big ones. Close up it is blocky, a pixel
// of rust per texel of the deck; far away only the patches are left, which keeps it from crawling.

const rgb = (color) => color.map((v) => (v / 255).toFixed(4)).join(', ');

/** The steel and rust colours, and a hash and a smooth noise, for any shader that rusts something. */
export const RUST_GLSL = `
const vec3 STEEL = vec3(${rgb(METAL)});
const vec3 RUST_DARK = vec3(${rgb(RUST_DARK)});
const vec3 RUST = vec3(${rgb(RUST)});
const vec3 RUST_BRIGHT = vec3(${rgb(RUST_BRIGHT)});

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

export const FLOOR_VERTEX = `
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
varying float vDepth;
varying vec2 vTextureCoord;
varying vec2 vWorld;
varying vec3 vWorldPos;

void main(void) {
  vec4 world = uModelMatrix * vec4(aVertexPosition, 1.0);
  vec4 v = uViewMatrix * world;
  vDepth = -v.z;
  v.z += 1.2 + vDepth * 0.01;
  vTextureCoord = aTextureCoord;
  vWorld = world.xz;
  vWorldPos = world.xyz;
  gl_Position = uProjectionMatrix * v;
}
`;

export const FLOOR_FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uSampler;
uniform vec3 uMaterialDiffuse;
uniform int uHasFog;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vDepth;
varying vec2 vTextureCoord;
varying vec2 vWorld;
varying vec3 vWorldPos;

${RUST_GLSL}
${LIGHT_GLSL}
void main(void) {
  vec3 steel = texture2D(uSampler, vTextureCoord).rgb;
  vec3 color = steel;

  // many small patches, a third of a tile to a tile across, scattered over the floor; a slow drift makes some stretches
  // of deck dirtier than others without ever making one big patch
  float spots = noise(vWorld / 44.0 + 13.0) * 0.6 + noise(vWorld / 18.0 + 5.0) * 0.4;
  float drift = noise(vWorld / 360.0 + 90.0) - 0.5;
  float area = smoothstep(0.63, 0.74, spots - drift * 0.1);
  // it gathers along the seams of the plates, where water sat
  vec2 seam = abs(fract(vWorld / 32.0) - 0.5);
  float nearSeam = 1.0 - smoothstep(0.34, 0.5, max(seam.x, seam.y));
  area = clamp(area + nearSeam * 0.3 * smoothstep(0.54, 0.64, spots), 0.0, 1.0);
  // the fine grain: a pixel of rust per texel up close, fading to nothing far away
  float near = 1.0 - smoothstep(260.0, 820.0, vDepth);
  vec2 texel = floor(vWorld);
  float grain = noise(texel / 3.0) * 0.6 + noise(texel / 1.3 + 40.0) * 0.4;
  float amount = area * mix(0.8, 0.3 + grain * 0.9, near);
  // the lights and the hazard stripes stay as they are
  float lit = smoothstep(0.06, 0.2, steel.b - steel.r);
  amount *= 1.0 - lit;

  if (amount > 0.3) {
    vec3 paint = (amount > 0.9 ? RUST_BRIGHT : (amount > 0.6 ? RUST : RUST_DARK)) * 0.62;
    // the relief of the plate shows through the rust
    color = clamp(paint + (steel - STEEL) * 0.9, 0.0, 1.0);
  }
  color *= uMaterialDiffuse * surfaceLight(vWorldPos, lit);
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade * 0.9);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA});
}
`;

/** Smooth random 0..1 that repeats seamlessly across `period` pixels in both X and Y. */
function periodicField(rnd, baseCells, period = TILE_PIXELS) {
  const octaves = [0, 1, 2].map((o) => {
    const cells = baseCells * 2 ** o;
    return {
      cells,
      grid: Array.from({ length: cells * cells }, () => rnd()),
    };
  });
  return (x, y) => {
    let total = 0;
    let weight = 0;
    for (let o = 0; o < 3; o++) {
      const { cells, grid } = octaves[o];
      const gx = (x / period) * cells;
      const gy = (y / period) * cells;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = gx - x0;
      const fy = gy - y0;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const at = (ix, iy) => grid[(((iy % cells) + cells) % cells) * cells + (((ix % cells) + cells) % cells)];
      const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
      const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
      const w = 1 / 2 ** o;
      total += (top * (1 - sy) + bottom * sy) * w;
      weight += w;
    }
    return total / weight;
  };
}

export function slimeAtlas() {
  const width = TILE_PIXELS;
  const height = TILE_PIXELS;
  const data = new Uint8Array(width * height * 4);
  const rnd = mulberry32(99173);
  const swirl = periodicField(rnd, 4, TILE_PIXELS);
  const fine = periodicField(rnd, 8, TILE_PIXELS);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = swirl(x, y) * 0.65 + fine(x, y) * 0.35;
      const r = Math.round(14 + s * 46);
      const g = Math.round(68 + s * 155);
      const b = Math.round(16 + s * 38);
      const o = (y * width + x) * 4;
      data[o] = Utils.clamp(r, 0, 255);
      data[o + 1] = Utils.clamp(g, 0, 255);
      data[o + 2] = Utils.clamp(b, 0, 255);
      data[o + 3] = 255;
    }
  }
  return { name: 'slime', data, width, height, cell: TILE_PIXELS, frames: 1 };
}

export const SLIME_FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uSampler;
uniform vec3 uMaterialDiffuse;
uniform float uTime;
uniform int uHasFog;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vDepth;
varying vec2 vTextureCoord;
varying vec2 vWorld;
varying vec3 vWorldPos;

${RUST_GLSL}
${LIGHT_GLSL}
void main(void) {
  vec2 uv = vWorld / 64.0;
  vec2 driftA = vec2(
    sin(vWorld.y * 0.08 + uTime * 0.75) * 0.035 + uTime * 0.012,
    cos(vWorld.x * 0.08 - uTime * 0.6) * 0.035 + uTime * 0.008
  );
  vec2 driftB = vec2(
    cos((vWorld.x + vWorld.y) * 0.055 - uTime * 0.52) * 0.03 - uTime * 0.009,
    sin((vWorld.x - vWorld.y) * 0.055 + uTime * 0.68) * 0.03 + uTime * 0.011
  );
  vec3 baseA = texture2D(uSampler, uv + driftA).rgb;
  vec3 baseB = texture2D(uSampler, uv * 0.75 + vec2(0.37, 0.61) + driftB).rgb;
  vec3 base = mix(baseA, baseB, 0.45);
  float churn = noise(vWorld / 16.0 + vec2(uTime * 0.22, -uTime * 0.16)) * 0.6
              + noise(vWorld / 7.0 - vec2(uTime * 0.35, uTime * 0.28)) * 0.4;
  float bubble = smoothstep(0.74, 0.88, churn);
  float pulse = 0.92 + 0.08 * sin(uTime * 1.2 + vWorld.x * 0.05 + vWorld.y * 0.05);
  vec3 glow = mix(base * pulse, vec3(0.58, 1.0, 0.28), bubble * 0.78);
  vec3 color = glow * uMaterialDiffuse * max(vec3(0.68, 0.92, 0.68), surfaceLight(vWorldPos, 0.75));
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade * 0.9);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA});
}
`;

function segmentDistance(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy || 1;
  const t = Utils.clamp(((px - ax) * vx + (py - ay) * vy) / len2, 0, 1);
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

/**
 * A 64x64 Doom-style glowing pentagram teleporter pad: dark bevelled UAC steel frame,
 * concentric rune circle, five-pointed demonic pentagram, and an emerald-crimson plasma core.
 */
export function teleporterAtlas() {
  const width = TILE_PIXELS;
  const height = TILE_PIXELS;
  const data = new Uint8Array(width * height * 4);
  const rnd = mulberry32(44119);
  const grain = field(rnd, 6);
  const cx = 31.5;
  const cy = 31.5;
  const radius = 21.5;

  const starPts = [];
  for (let k = 0; k < 5; k++) {
    const angle = -Math.PI / 2 + (k * Math.PI * 2) / 5;
    starPts.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  const chords = [
    [starPts[0], starPts[2]],
    [starPts[2], starPts[4]],
    [starPts[4], starPts[1]],
    [starPts[1], starPts[3]],
    [starPts[3], starPts[0]],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const g = grain(x, y);
      const d = Math.hypot(x - cx, y - cy);
      const border = Math.min(x, y, width - 1 - x, height - 1 - y);
      let r = Math.round(20 + g * 16);
      let gr = Math.round(25 + g * 18);
      let b = Math.round(34 + g * 22);

      if (border < 3) {
        const edge = border === 1 ? 1.35 : 0.65;
        r = Math.round(r * edge);
        gr = Math.round(gr * edge);
        b = Math.round(b * edge);
      }

      if (d < 25.5 && d >= 22.8) {
        r = 16;
        gr = 20;
        b = 28;
      } else if (d < 22.8) {
        // Dark obsidian portal basin with swirling plasma undertone
        r = Math.round(26 + g * 24);
        gr = Math.round(14 + g * 28);
        b = Math.round(22 + g * 26);

        // Outer rune circle
        const ringDist = Math.abs(d - radius);
        let lineDist = ringDist;
        for (const [p0, p1] of chords)
          lineDist = Math.min(lineDist, segmentDistance(x, y, p0[0], p0[1], p1[0], p1[1]));

        if (lineDist < 2.1) {
          const hot = Math.max(0, 1 - lineDist / 2.1);
          r = Math.round(Utils.lerp(r, 248, hot));
          gr = Math.round(Utils.lerp(gr, 96 + 90 * hot * hot, hot));
          b = Math.round(Utils.lerp(b, 54, hot));
        }

        // Emerald-cyan warp core at the center of the pentagram
        if (d < 7.5) {
          const core = Math.max(0, 1 - d / 7.5);
          r = Math.round(Utils.lerp(r, 90, core * 0.7));
          gr = Math.round(Utils.lerp(gr, 245, core));
          b = Math.round(Utils.lerp(b, 185, core * 0.85));
        }
      }

      const o = (y * width + x) * 4;
      data[o] = Utils.clamp(r, 0, 255);
      data[o + 1] = Utils.clamp(gr, 0, 255);
      data[o + 2] = Utils.clamp(b, 0, 255);
      data[o + 3] = 255;
    }
  }
  return { name: 'teleporter', data, width, height, cell: TILE_PIXELS, frames: 1 };
}

export const TELEPORTER_FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uSampler;
uniform vec3 uMaterialDiffuse;
uniform float uTime;
uniform int uHasFog;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vDepth;
varying vec2 vTextureCoord;
varying vec2 vWorld;
varying vec3 vWorldPos;

${RUST_GLSL}
${LIGHT_GLSL}
void main(void) {
  vec2 centered = vTextureCoord - vec2(0.5);
  float dist = length(centered);
  vec3 tex = texture2D(uSampler, vTextureCoord).rgb;
  float pulse = 0.78 + 0.22 * sin(uTime * 5.2);
  float ringWave = 0.5 + 0.5 * sin(dist * 34.0 - uTime * 6.5);
  float inside = 1.0 - smoothstep(0.33, 0.37, dist);
  float runeGlow = smoothstep(0.32, 0.68, max(tex.r, tex.g));
  vec3 plasma = mix(vec3(0.95, 0.24, 0.14), vec3(0.22, 0.96, 0.68), ringWave * 0.55 + smoothstep(0.14, 0.0, dist) * 0.45);
  vec3 lit = mix(tex, tex * (0.9 + 0.45 * pulse) + plasma * (0.32 * inside * ringWave + 0.28 * runeGlow * pulse), inside);
  vec3 color = lit * uMaterialDiffuse * max(vec3(0.76, 0.86, 0.82), surfaceLight(vWorldPos, inside * 0.85));
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade * 0.9);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA});
}
`;



