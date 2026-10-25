import { Trigo, Utils, Vec2, Vec3 } from '@1pizzateam/spock';
import { LIGHT_GLSL, SOLID_ALPHA } from './quads.js';
import { mulberry32 } from './rng.js';

export { LIGHT_GLSL };

const scratchPt = new Vec2();

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
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        this.set(x, y, color, amount);
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
      const sx = Utils.smoothstep(0, 1, fx);
      const sy = Utils.smoothstep(0, 1, fy);
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
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const grain = (rnd() - 0.5) * 7 + (((x >> 2) + (y >> 2)) % 2 ? 1.5 : 0);
      t.set(x, y, [base[0] + grain, base[1] + grain, base[2] + grain * 1.2]);
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
  for (let y = 2; y < t.height - 2; y++)
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
  for (let y = 7; y < 57; y++)
    for (let x = 7; x < 57; x++) {
      const bar = (x + y) % 8 < 2 || (x - y + 64) % 8 < 2;
      t.set(x, y, bar ? mix(METAL, LIGHT, 0.55 + (rnd() - 0.5) * 0.2) : SHADOW);
      if (bar && (x + y) % 8 === 0)
        t.set(x, y, LIGHT, 0.5);
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
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const d = scratchPt.setScalar(x - cx, y - cy).getMagnitude();
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
  // the wheel handle
  for (let a = 0; a < 6; a++) {
    const angle = (a / 6) * Trigo.pi;
    for (let d = -8; d <= 8; d += 0.5)
      t.set(cx + Math.cos(angle) * d, cy + Math.sin(angle) * d, mix(METAL, LIGHT, 0.7));
  }
  t.rect(29, 29, 5, 5, LIGHT, 0.8);
  for (let k = 0; k < 8; k++) {
    const angle = (k / 8) * Trigo.twopi + 0.4;
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
  for (const y of [19, 27, 41])
    for (let x = 0; x < 64; x++) {
      const sag = Math.round(Math.sin(x * 0.12 + y) * 0.9);
      t.set(x, y + sag, LIGHT, 0.7);
      t.set(x, y + sag + 1, mix(METAL, LIGHT, 0.25));
      t.set(x, y + sag + 2, mix(METAL, SHADOW, 0.3));
      t.set(x, y + sag + 3, SHADOW);
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
  for (let y = 5; y < 59; y++)
    for (let x = 3; x < 61; x++) {
      const stripe = Math.floor((x + y) / 9) % 2 === 0;
      if (!stripe)
        continue;
      const worn = wear(x, y) > 0.62;
      t.set(x, y, worn ? mix(HAZARD, RUST_DARK, 0.75) : mix(HAZARD, RUST, 0.25 + (rnd() - 0.5) * 0.2), 0.9);
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
    for (let y = 0; y < height; y++)
      for (let x = 0; x < TILE_PIXELS; x++) {
        const i = (y * TILE_PIXELS + x) * 3;
        const o = (y * width + cell * TILE_PIXELS + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
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
  if (uHasFog == 1 && vDepth >= uFogFar) {
    gl_FragColor = vec4(uFogColor, ${SOLID_ALPHA});
    return;
  }
  vec3 steel = texture2D(uSampler, vTextureCoord).rgb;
  vec3 color = steel;
  // the lights and the hazard stripes stay as they are
  float lit = smoothstep(0.06, 0.2, steel.b - steel.r);
  float amount = 0.0;
  if (lit < 0.95) {
    // many small patches, a third of a tile to a tile across, scattered over the floor; a slow drift makes some stretches
    // of deck dirtier than others without ever making one big patch
    float spots = noise(vWorld / 44.0 + 13.0) * 0.6 + noise(vWorld / 18.0 + 5.0) * 0.4;
    if (spots > 0.48) {
      float drift = noise(vWorld / 360.0 + 90.0) - 0.5;
      float area = smoothstep(0.63, 0.74, spots - drift * 0.1);
      // it gathers along the seams of the plates, where water sat
      vec2 seam = abs(fract(vWorld / 32.0) - 0.5);
      float nearSeam = 1.0 - smoothstep(0.34, 0.5, max(seam.x, seam.y));
      area = clamp(area + nearSeam * 0.3 * smoothstep(0.54, 0.64, spots), 0.0, 1.0);
      // the fine grain: a pixel of rust per texel up close, fading to nothing far away
      float near = 1.0 - smoothstep(220.0, 620.0, vDepth);
      amount = area * 0.8;
      if (near > 0.01 && area > 0.25) {
        vec2 texel = floor(vWorld);
        float grain = noise(texel / 3.0) * 0.6 + noise(texel / 1.3 + 40.0) * 0.4;
        amount = area * mix(0.8, 0.3 + grain * 0.9, near);
      }
      amount *= 1.0 - lit;
    }
  }

  if (amount > 0.3) {
    vec3 paint = (amount > 0.9 ? RUST_BRIGHT : (amount > 0.6 ? RUST : RUST_DARK)) * 0.62;
    // the relief of the plate shows through the rust
    color = clamp(paint + (steel - STEEL) * 0.9, 0.0, 1.0);
  }
  color *= uMaterialDiffuse * surfaceLight(vWorldPos, lit);
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA});
}
`;


/** Smooth random 0..1 that repeats seamlessly across `period` pixels in both X and Y. */
export function periodicField(rnd, baseCells, period = TILE_PIXELS) {
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
      const sx = Utils.smoothstep(0, 1, fx);
      const sy = Utils.smoothstep(0, 1, fy);
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
  for (let y = 0; y < height; y++)
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
  if (uHasFog == 1 && vDepth >= uFogFar) {
    gl_FragColor = vec4(uFogColor, ${SOLID_ALPHA});
    return;
  }
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
    color = mix(color, uFogColor, fade);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA});
}
`;


/**
 * A 64x64 futuristic quantum teleporter machine atlas: brushed titanium octagonal housing,
 * corner status beacons, radial power bus conduits, segmented magnetic stator rings, and a
 * high-energy cyan-emerald quantum phase core.
 */
export function teleporterAtlas() {
  const width = TILE_PIXELS;
  const height = TILE_PIXELS;
  const data = new Uint8Array(width * height * 4);
  const rnd = mulberry32(44119);
  const grain = field(rnd, 6);
  const cx = 31.5;
  const cy = 31.5;

  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const g = grain(x, y);
      const dx = x - cx;
      const dy = y - cy;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      const d = scratchPt.setScalar(dx, dy).getMagnitude();
      const oct = Math.max(ax, ay, (ax + ay) * 0.7071);
      const border = Math.min(x, y, width - 1 - x, height - 1 - y);

      // Brushed titanium deck chassis
      let r = Math.round(24 + g * 16);
      let gr = Math.round(32 + g * 20);
      let b = Math.round(46 + g * 24);

      if (border < 3) {
        const edge = border === 1 ? 1.38 : 0.62;
        r = Math.round(r * edge);
        gr = Math.round(gr * edge);
        b = Math.round(b * edge);
      }

      // Octagonal structural seam and recessed bolt channel
      if (Math.abs(oct - 28.5) < 1.1) {
        r = 12;
        gr = 18;
        b = 28;
      }

      // Radial power bus conduits along cardinal and diagonal axes
      const cardinalBus = Math.min(ax, ay);
      const diagBus = Math.abs(ax - ay) * 0.7071;
      const busDist = Math.min(cardinalBus, diagBus);
      if (d >= 13.5 && d <= 28.5 && busDist < 2.2) {
        if (busDist < 0.95) {
          const glow = 1 - busDist / 0.95;
          r = Math.round(Utils.lerp(r, 52, glow));
          gr = Math.round(Utils.lerp(gr, 224, glow));
          b = Math.round(Utils.lerp(b, 250, glow));
        } else {
          r = 14;
          gr = 24;
          b = 38;
        }
      }

      // Corner status beacons on the outer housing
      const cornerDist = scratchPt.setScalar(ax - 23.5, ay - 23.5).getMagnitude();
      if (cornerDist < 3.2) {
        if (cornerDist < 1.9) {
          const hot = 1 - cornerDist / 1.9;
          r = Math.round(Utils.lerp(40, 150, hot));
          gr = Math.round(Utils.lerp(180, 252, hot));
          b = Math.round(Utils.lerp(210, 255, hot));
        } else {
          r = 12;
          gr = 20;
          b = 30;
        }
      }

      // Heavy magnetic containment collar with ribbed cooling vents
      if (d < 25.8 && d >= 20.2) {
        const angle = Math.atan2(dy, dx);
        const vent = Math.cos(angle * 16);
        const ringDist = Math.abs(d - 22.8);
        if (ringDist < 1.45 && vent > -0.25) {
          const hot = (1 - ringDist / 1.45) * (0.65 + 0.35 * Math.max(0, vent));
          r = Math.round(Utils.lerp(20, 78, hot));
          gr = Math.round(Utils.lerp(36, 238, hot));
          b = Math.round(Utils.lerp(54, 255, hot));
        } else {
          r = Math.round(16 + g * 10);
          gr = Math.round(24 + g * 12);
          b = Math.round(38 + g * 16);
        }
      } else if (d < 20.2) {
        // Cryo-blue quantum phase chamber basin
        r = Math.round(14 + g * 14);
        gr = Math.round(32 + g * 22);
        b = Math.round(52 + g * 28);

        // Precision concentric harmonic stabilizer rings
        const outerHarmonic = Math.abs(d - 16.2);
        const innerHarmonic = Math.abs(d - 11.2);
        const harmonicDist = Math.min(outerHarmonic, innerHarmonic);
        if (harmonicDist < 1.35) {
          const hot = 1 - harmonicDist / 1.35;
          r = Math.round(Utils.lerp(r, 64, hot));
          gr = Math.round(Utils.lerp(gr, 236, hot));
          b = Math.round(Utils.lerp(b, 248, hot));
        }

        // Inner waveguide crosshairs
        if (d >= 7.0 && d <= 16.5 && cardinalBus < 1.15) {
          const trace = 1 - cardinalBus / 1.15;
          r = Math.round(Utils.lerp(r, 82, trace * 0.85));
          gr = Math.round(Utils.lerp(gr, 246, trace));
          b = Math.round(Utils.lerp(b, 255, trace));
        }

        // Bright cyan-emerald-white quantum aperture core
        if (d < 8.2) {
          const core = Math.max(0, 1 - d / 8.2);
          const hotCore = core * core;
          r = Math.round(Utils.lerp(r, 185, hotCore));
          gr = Math.round(Utils.lerp(gr, 252, core));
          b = Math.round(Utils.lerp(b, 255, core));
        }
      }

      const o = (y * width + x) * 4;
      data[o] = Utils.clamp(r, 0, 255);
      data[o + 1] = Utils.clamp(gr, 0, 255);
      data[o + 2] = Utils.clamp(b, 0, 255);
      data[o + 3] = 255;
    }
  return { name: 'teleporter', data, width, height, cell: TILE_PIXELS, frames: 1 };
}

/**
 * Builds the 3D quad geometry for a futuristic quantum teleporter machine at `center` (`Vec3`: x, baseY, z)
 * with dimensions `size` (`Vec2`: tileSpan, ceilingHeight). Includes the base deck plate, stepped two-tier
 * bevelled emitter pedestal, four corner field-containment pylons with stabilizer fins, and an overhead
 * suspended ceiling quantum emitter assembly when `size.y > 0`.
 */
export function teleporterMachineQuads(center, size) {
  const cx = center.x;
  const baseY = center.y;
  const cz = center.z;
  const halfTile = size.x * 0.5;
  const ceilY = size.y;
  const quads = [];

  const pushBox = (hx, hz, y0, y1, sideUv, capUv, capAtTop = true) => {
    const x0 = cx - hx;
    const x1 = cx + hx;
    const z0 = cz - hz;
    const z1 = cz + hz;
    quads.push(
      { corners: [x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1], uv: sideUv },
      { corners: [x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0], uv: sideUv },
      { corners: [x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0], uv: sideUv },
      { corners: [x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1], uv: sideUv }
    );
    if (capAtTop)
      quads.push({ corners: [x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0], uv: capUv });
    else
      quads.push({ corners: [x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1], uv: capUv });
  };

  // 1. Base deck plate covering the tile floor
  const fx0 = cx - halfTile;
  const fx1 = cx + halfTile;
  const fz0 = cz - halfTile;
  const fz1 = cz + halfTile;
  quads.push({
    corners: [fx0, baseY, fz1, fx1, baseY, fz1, fx1, baseY, fz0, fx0, baseY, fz0],
    uv: [0, 0, 1, 1],
  });

  // 2. Two-tier stepped 3D quantum emitter pedestal on the floor
  const tier1Y = baseY + 2.2;
  const tier2Y = baseY + 3.6;
  pushBox(25.5, 25.5, baseY, tier1Y, [0.1, 0.44, 0.9, 0.56], [0.08, 0.08, 0.92, 0.92], true);
  pushBox(18.0, 18.0, tier1Y, tier2Y, [0.18, 0.46, 0.82, 0.54], [0.18, 0.18, 0.82, 0.82], true);

  // 3. Four corner quantum field-emitter pylons with glowing energy conduit strips
  const pylonTop = ceilY > 0 ? ceilY - 4.0 : baseY + 46.0;
  const pylonOffset = 24.5;
  const pylonHalf = 2.4;
  const pylonUv = [0.44, 0.08, 0.56, 0.92];
  const collarUv = [0.22, 0.46, 0.78, 0.54];
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (const [sx, sz] of corners) {
    const px = cx + sx * pylonOffset;
    const pz = cz + sz * pylonOffset;
    const px0 = px - pylonHalf;
    const px1 = px + pylonHalf;
    const pz0 = pz - pylonHalf;
    const pz1 = pz + pylonHalf;
    quads.push(
      { corners: [px0, tier1Y, pz1, px1, tier1Y, pz1, px1, pylonTop, pz1, px0, pylonTop, pz1], uv: pylonUv },
      { corners: [px1, tier1Y, pz0, px0, tier1Y, pz0, px0, pylonTop, pz0, px1, pylonTop, pz0], uv: pylonUv },
      { corners: [px0, tier1Y, pz0, px0, tier1Y, pz1, px0, pylonTop, pz1, px0, pylonTop, pz0], uv: pylonUv },
      { corners: [px1, tier1Y, pz1, px1, tier1Y, pz0, px1, pylonTop, pz0, px1, pylonTop, pz1], uv: pylonUv }
    );
    // Glowing capacitor coil collars along each pylon
    for (const ringY of [baseY + 16.0, baseY + 32.0, baseY + 46.0]) {
      if (ringY + 2.2 > pylonTop)
        continue;
      const rx0 = px - (pylonHalf + 1.1);
      const rx1 = px + (pylonHalf + 1.1);
      const rz0 = pz - (pylonHalf + 1.1);
      const rz1 = pz + (pylonHalf + 1.1);
      const ry0 = ringY;
      const ry1 = ringY + 2.2;
      quads.push(
        { corners: [rx0, ry0, rz1, rx1, ry0, rz1, rx1, ry1, rz1, rx0, ry1, rz1], uv: collarUv },
        { corners: [rx1, ry0, rz0, rx0, ry0, rz0, rx0, ry1, rz0, rx1, ry1, rz0], uv: collarUv },
        { corners: [rx0, ry0, rz0, rx0, ry0, rz1, rx0, ry1, rz1, rx0, ry1, rz0], uv: collarUv },
        { corners: [rx1, ry0, rz1, rx1, ry0, rz0, rx1, ry1, rz0, rx1, ry1, rz1], uv: collarUv },
        { corners: [rx0, ry1, rz1, rx1, ry1, rz1, rx1, ry1, rz0, rx0, ry1, rz0], uv: collarUv },
        { corners: [rx0, ry0, rz0, rx1, ry0, rz0, rx1, ry0, rz1, rx0, ry0, rz1], uv: collarUv }
      );
    }
  }

  // 4. Overhead ceiling quantum emitter hood and focusing ring
  if (ceilY > 0) {
    const hoodMid = ceilY - 2.6;
    const hoodLow = ceilY - 4.4;
    pushBox(25.5, 25.5, hoodMid, ceilY, [0.1, 0.44, 0.9, 0.56], [0.08, 0.08, 0.92, 0.92], false);
    pushBox(18.0, 18.0, hoodLow, hoodMid, [0.18, 0.46, 0.82, 0.54], [0.18, 0.18, 0.82, 0.82], false);
  }

  return quads;
}

/**
 * Converts `teleporterMachineQuads(center, size)` into a triangle-list mesh `{ vertices, uvs }`
 * with `Float32Array` buffers suitable for RoostR `CustomMesh` and BlendR catalog import.
 */
export function teleporterMachineMesh(center = new Vec3(0, 0, 0), size = new Vec2(64, 62.8)) {
  const quads = teleporterMachineQuads(center, size);
  const vertices = new Float32Array(quads.length * 18);
  const uvs = new Float32Array(quads.length * 12);
  let vOut = 0;
  let uOut = 0;
  for (const { corners, uv } of quads) {
    const [u0, v0, u1, v1] = uv;
    const cornerUvs = [
      u0, v0,
      u1, v0,
      u1, v1,
      u0, v1,
    ];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      vertices[vOut++] = corners[k * 3];
      vertices[vOut++] = corners[k * 3 + 1];
      vertices[vOut++] = corners[k * 3 + 2];
      uvs[uOut++] = cornerUvs[k * 2];
      uvs[uOut++] = cornerUvs[k * 2 + 1];
    }
  }
  return { vertices, uvs };
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
  if (uHasFog == 1 && vDepth >= uFogFar) {
    gl_FragColor = vec4(uFogColor, ${SOLID_ALPHA});
    return;
  }
  vec2 centered = vTextureCoord - vec2(0.5);
  float dist = length(centered);
  vec3 tex = texture2D(uSampler, vTextureCoord).rgb;
  float pulse = 0.82 + 0.18 * sin(uTime * 5.6);
  float ringWave = 0.5 + 0.5 * sin(dist * 38.0 - uTime * 7.2);
  float elevWave = 0.5 + 0.5 * sin(vWorldPos.y * 0.35 - uTime * 6.0);
  float inside = 1.0 - smoothstep(0.32, 0.42, dist);
  float techGlow = smoothstep(0.34, 0.72, max(tex.g, tex.b));
  vec3 cyanBeam = vec3(0.18, 0.88, 1.0);
  vec3 emeraldCore = vec3(0.24, 0.98, 0.78);
  vec3 plasma = mix(cyanBeam, emeraldCore, ringWave * 0.55 + smoothstep(0.16, 0.0, dist) * 0.45);
  vec3 lit = tex * (0.92 + 0.38 * pulse * techGlow) + plasma * (0.34 * inside * ringWave + 0.32 * techGlow * pulse * (0.7 + 0.3 * elevWave));
  vec3 color = lit * uMaterialDiffuse * max(vec3(0.78, 0.9, 0.96), surfaceLight(vWorldPos, max(inside, techGlow) * 0.88));
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA});
}
`;


export const CRATE_CELL = TILE_PIXELS;
export const CRATE_FRAMES = 4;
export const CRATE_CELLS = {
  side: 0,
  top: 1,
  frame: 2,
  trim: 3,
};

export function crateCellUv(cell = 0, v0 = 0, v1 = 1) {
  const inset = 0.25 / (CRATE_CELL * CRATE_FRAMES);
  return [cell / CRATE_FRAMES + inset, v0, (cell + 1) / CRATE_FRAMES - inset, v1];
}

function drawCrateSideCell(t, rnd) {
  const S = CRATE_CELL;
  plate(t, 0, 0, S, S, rnd, mix(METAL, [24, 34, 52], 0.28));

  // Outer structural seam and bevel
  for (let i = 0; i < S; i++) {
    t.set(i, 0, LIGHT, 0.45);
    t.set(i, S - 1, SHADOW, 0.9);
    t.set(0, i, LIGHT, 0.35);
    t.set(S - 1, i, SHADOW, 0.9);
  }

  // Top and bottom industrial amber/black diagonal hazard stripes
  for (const [y0, y1] of [[3, 8], [55, 60]])
    for (let y = y0; y <= y1; y++)
      for (let x = 5; x < S - 5; x++) {
        if (y === y0 || y === y1) {
          t.set(x, y, SHADOW, 0.88);
          continue;
        }
        const stripe = ((x + y) & 4) === 0;
        t.set(x, y, stripe ? mix(HAZARD, [255, 208, 72], 0.35) : [18, 22, 30], 0.92);
      }

  // Recessed armored cargo bay with diagonal X-bracing ribs
  t.rect(7, 10, S - 14, S - 20, mix(SHADOW, METAL, 0.28), 0.72);
  for (let y = 11; y < S - 11; y++)
    for (let x = 8; x < S - 8; x++) {
      const d1 = Math.abs((x - 8) - (y - 11) * ((S - 16) / (S - 22)));
      const d2 = Math.abs((S - 9 - x) - (y - 11) * ((S - 16) / (S - 22)));
      const dMin = Math.min(d1, d2);
      if (dMin < 2.2)
        t.set(x, y, dMin < 1.1 ? mix(METAL, LIGHT, 0.38) : SHADOW, 0.85);
    }

  // Central futuristic UAC digital manifest & cryo-containment status console
  t.rect(13, 25, S - 26, 14, [12, 18, 28], 0.95);
  for (let x = 13; x < S - 13; x++) {
    t.set(x, 25, SHADOW);
    t.set(x, 38, LIGHT, 0.45);
  }
  // Glowing cyan telemetry waveform & power bars inside display
  for (let x = 16; x < S - 22; x++) {
    const bar = (x - 16) % 5 < 3;
    if (bar) {
      t.rect(x, 28, 1, 8, [56, 232, 252], 0.92);
      t.set(x, 27, [160, 248, 255], 0.65);
    }
  }
  // Amber containment lock indicator beacon on right of console
  t.rect(S - 20, 28, 4, 8, [252, 184, 52], 0.95);

  for (const [rx, ry] of [[4, 11], [S - 6, 11], [4, 50], [S - 6, 50], [10, 13], [S - 12, 13], [10, 48], [S - 12, 48]])
    rivet(t, rx, ry);
}

function drawCrateTopCell(t, rnd) {
  const S = CRATE_CELL;
  plate(t, 0, 0, S, S, rnd, mix(METAL, [28, 38, 56], 0.22));
  const cx = 31.5;
  const cy = 31.5;

  // Recessed octagonal lid perimeter groove and anti-skid diamond tread
  for (let y = 5; y < S - 5; y++)
    for (let x = 5; x < S - 5; x++) {
      const border = x === 5 || x === S - 6 || y === 5 || y === S - 6;
      if (border) {
        t.set(x, y, SHADOW, 0.85);
        continue;
      }
      const tread = ((x + y) & 3) === 0 && ((x - y) & 3) === 0;
      if (tread)
        t.set(x, y, LIGHT, 0.26);
    }

  // Central octagonal UAC containment seal & glowing cyan harmonic ring
  for (let y = 16; y < S - 16; y++)
    for (let x = 16; x < S - 16; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = scratchPt.setScalar(dx, dy).getMagnitude();
      if (d < 13.5 && d >= 11.2)
        t.set(x, y, SHADOW, 0.9);
      else if (d < 11.2 && d >= 9.0)
        t.set(x, y, [56, 232, 252], 0.88);
      else if (d < 9.0) {
        const cross = Math.min(Math.abs(dx), Math.abs(dy)) < 1.3;
        t.set(x, y, cross ? [142, 248, 255] : [18, 28, 42], 0.92);
      }
    }

  rivets(t, 2);
}

function drawCrateFrameCell(t, rnd) {
  const S = CRATE_CELL;
  plate(t, 0, 0, S, S, rnd, mix(SHADOW, METAL, 0.35));

  // Heavy vertical shock-absorber bumper ribs & recessed grav-lifter slots
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const edge = x < 3 || x >= S - 3 || y < 2 || y >= S - 2;
      const rib = y % 8 === 0 || y % 8 === 1;
      const slot = y >= 48 && y <= 58 && ((x >= 10 && x <= 24) || (x >= 39 && x <= 53));
      if (slot)
        t.set(x, y, [10, 14, 22], 0.95);
      else if (edge)
        t.set(x, y, SHADOW, 0.85);
      else if (rib)
        t.set(x, y, y % 8 === 0 ? SHADOW : LIGHT, 0.48);
    }

  for (const ry of [6, 20, 34, 46]) {
    rivet(t, 5, ry);
    rivet(t, S - 7, ry);
  }
}

function drawCrateTrimCell(t, rnd) {
  const S = CRATE_CELL;
  plate(t, 0, 0, S, S, rnd, mix(METAL, LIGHT, 0.18));

  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const centerDist = Math.abs(x - 31.5);
      const bus = centerDist < 3.2;
      const latch = (y % 16 >= 5 && y % 16 <= 10) && centerDist >= 5 && centerDist <= 14;
      if (bus) {
        const glow = 1 - centerDist / 3.2;
        t.set(x, y, mix([28, 120, 156], [96, 246, 255], glow), 0.92);
      } else if (latch)
        t.set(x, y, SHADOW, 0.78);
    }
}

const CRATE_DRAW = [drawCrateSideCell, drawCrateTopCell, drawCrateFrameCell, drawCrateTrimCell];

/**
 * Returns the 256x64 power-of-two RGBA pixel-art atlas for the 3D UAC futuristic cover crate (`o` / `PILLAR`).
 */
export function crateAtlas() {
  const width = CRATE_CELL * CRATE_FRAMES;
  const height = CRATE_CELL;
  const data = new Uint8Array(width * height * 4);
  CRATE_DRAW.forEach((draw, cell) => {
    const tile = new Tile(CRATE_CELL, CRATE_CELL);
    draw(tile, mulberry32(51000 + cell * 8831));
    for (let y = 0; y < height; y++)
      for (let x = 0; x < CRATE_CELL; x++) {
        const i = (y * CRATE_CELL + x) * 3;
        const o = (y * width + cell * CRATE_CELL + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name: 'crate', data, width, height, cell: CRATE_CELL, frames: CRATE_FRAMES };
}

/**
 * Builds the 3D quad geometry for a futuristic UAC armored cover crate at `center` (`Vec3`: x, baseY, z)
 * with dimensions `size` (`Vec2`: tileSpan, crateHeight). Fits the 64x26x64 waist-high cover footprint
 * with a grav-skid base plinth, recessed diagonal-braced cargo core, 4 heavy corner bumper pillars,
 * 4 side clamping bulkheads with cyan telemetry consoles, beveled armored lid, transverse locking straps,
 * and corner tie-down lugs.
 */
export function crateQuads(center = new Vec3(0, 0, 0), size = new Vec2(64, 26)) {
  const cx = center.x;
  const baseY = center.y;
  const cz = center.z;
  const scaleXZ = size.x / 64;
  const scaleY = size.y / 26;
  const quads = [];

  const uvSide = crateCellUv(CRATE_CELLS.side);
  const uvTop = crateCellUv(CRATE_CELLS.top);
  const uvFrame = crateCellUv(CRATE_CELLS.frame);
  const uvTrim = crateCellUv(CRATE_CELLS.trim);

  const pushBoxAt = (ox, oz, hx, hz, y0, y1, sideUv, capUv, includeBottom = false) => {
    const x0 = cx + (ox - hx) * scaleXZ;
    const x1 = cx + (ox + hx) * scaleXZ;
    const z0 = cz + (oz - hz) * scaleXZ;
    const z1 = cz + (oz + hz) * scaleXZ;
    const by0 = baseY + y0 * scaleY;
    const by1 = baseY + y1 * scaleY;
    quads.push(
      { corners: [x0, by0, z1, x1, by0, z1, x1, by1, z1, x0, by1, z1], uv: sideUv },
      { corners: [x1, by0, z0, x0, by0, z0, x0, by1, z0, x1, by1, z0], uv: sideUv },
      { corners: [x0, by0, z0, x0, by0, z1, x0, by1, z1, x0, by1, z0], uv: sideUv },
      { corners: [x1, by0, z1, x1, by0, z0, x1, by1, z0, x1, by1, z1], uv: sideUv },
      { corners: [x0, by1, z1, x1, by1, z1, x1, by1, z0, x0, by1, z0], uv: capUv }
    );
    if (includeBottom)
      quads.push({ corners: [x0, by0, z0, x1, by0, z0, x1, by0, z1, x0, by0, z1], uv: capUv });
  };

  // 1. Heavy grav-skid base pallet plinth (y = 0 .. 3.4)
  pushBoxAt(0, 0, 31.2, 31.2, 0.0, 3.4, uvFrame, uvFrame, true);

  // 2. Main armored octagonal/recessed cargo container core (y = 3.5 .. 22.8)
  pushBoxAt(0, 0, 29.6, 29.6, 3.5, 22.8, uvSide, uvTop, false);

  // 3. Four reinforced vertical corner bumper pillars (y = 0.1 .. 25.3, outer faces at ±31.9)
  const cornerCenters = [
    [-26.8, -26.8],
    [26.8, -26.8],
    [26.8, 26.8],
    [-26.8, 26.8],
  ];
  for (const [ox, oz] of cornerCenters) {
    pushBoxAt(ox, oz, 5.1, 5.1, 0.1, 25.3, uvFrame, uvFrame, false);
    // 4. Corner tie-down / stacking lugs atop each corner pillar (y = 25.35 .. 26.0)
    pushBoxAt(ox, oz, 3.6, 3.6, 25.35, 26.0, uvTrim, uvTrim, false);
  }

  // 5. Four recessed side armor bulkheads & telemetry consoles (outer faces at ±31.85)
  pushBoxAt(0, 30.8, 19.2, 1.05, 4.2, 22.1, uvSide, uvTrim, false);
  pushBoxAt(0, -30.8, 19.2, 1.05, 4.2, 22.1, uvSide, uvTrim, false);
  pushBoxAt(30.8, 0, 1.05, 19.2, 4.2, 22.1, uvSide, uvTrim, false);
  pushBoxAt(-30.8, 0, 1.05, 19.2, 4.2, 22.1, uvSide, uvTrim, false);

  // 6. Beveled upper containment lid (y = 22.85 .. 24.85)
  pushBoxAt(0, 0, 28.4, 28.4, 22.85, 24.85, uvFrame, uvTop, false);

  // 7. Two transverse hydraulic locking clamp bars across the lid (y = 24.9 .. 26.0)
  pushBoxAt(-12.5, 0, 2.8, 29.2, 24.9, 26.0, uvTrim, uvTrim, false);
  pushBoxAt(12.5, 0, 2.8, 29.2, 24.9, 26.0, uvTrim, uvTrim, false);

  // 8. Central UAC octagonal containment seal cap (y = 24.9 .. 25.85)
  pushBoxAt(0, 0, 6.2, 6.2, 24.9, 25.85, uvTrim, uvTop, false);

  return quads;
}

/**
 * Converts `crateQuads(center, size)` into a triangle-list mesh `{ vertices, uvs }`
 * with `Float32Array` buffers suitable for RoostR `CustomMesh` and BlendR catalog import.
 */
export function crateMesh(center = new Vec3(0, 0, 0), size = new Vec2(64, 26)) {
  const quads = crateQuads(center, size);
  const vertices = new Float32Array(quads.length * 18);
  const uvs = new Float32Array(quads.length * 12);
  let vOut = 0;
  let uOut = 0;
  for (const { corners, uv } of quads) {
    const [u0, v0, u1, v1] = uv;
    const cornerUvs = [
      u0, v0,
      u1, v0,
      u1, v1,
      u0, v1,
    ];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      vertices[vOut++] = corners[k * 3];
      vertices[vOut++] = corners[k * 3 + 1];
      vertices[vOut++] = corners[k * 3 + 2];
      uvs[uOut++] = cornerUvs[k * 2];
      uvs[uOut++] = cornerUvs[k * 2 + 1];
    }
  }
  return { vertices, uvs };
}

export const CRATE_FRAGMENT = `
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
  if (uHasFog == 1 && vDepth >= uFogFar) {
    gl_FragColor = vec4(uFogColor, ${SOLID_ALPHA});
    return;
  }
  vec3 tex = texture2D(uSampler, vTextureCoord).rgb;
  float pulse = 0.86 + 0.14 * sin(uTime * 3.8 + (vWorldPos.x + vWorldPos.z) * 0.04);
  float cyanGlow = smoothstep(0.42, 0.78, min(tex.g, tex.b) - tex.r * 0.35);
  float amberGlow = smoothstep(0.45, 0.78, min(tex.r, tex.g) - tex.b * 0.45);
  float emissive = max(cyanGlow, amberGlow * 0.75);
  vec3 lit = tex * (0.94 + 0.28 * pulse * emissive) + vec3(0.08, 0.32, 0.38) * (cyanGlow * pulse * 0.35);
  vec3 color = lit * uMaterialDiffuse * max(vec3(0.76, 0.86, 0.92), surfaceLight(vWorldPos, emissive * 0.82));
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA});
}
`;

// ---- Martian surface dirt & boulders (E1M5 Red Planet) -------------------------------------------------------------

const MARS_DIRT_BASE = [126, 52, 24];
const MARS_DIRT_LIGHT = [178, 86, 38];
const MARS_DIRT_OCHRE = [204, 108, 48];
const MARS_DIRT_SHADOW = [54, 20, 10];
const MARS_BASALT = [42, 26, 22];

const MARS_TAU = Trigo.twopi / TILE_PIXELS;

function periodicDirtGrain(x, y) {
  const ix = ((x % TILE_PIXELS) + TILE_PIXELS) % TILE_PIXELS;
  const iy = ((y % TILE_PIXELS) + TILE_PIXELS) % TILE_PIXELS;
  let h = Math.imul(ix * 374761393 ^ iy * 668265263, 1274126177);
  h ^= h >>> 13;
  return (((Math.imul(h, 1911520717) >>> 0) % 1000) / 1000) - 0.5;
}

function dirtEdgeMask(x, y, margin = 4) {
  const mx = Math.min(x, TILE_PIXELS - 1 - x);
  const my = Math.min(y, TILE_PIXELS - 1 - y);
  return Utils.smoothstep(0, margin, mx) * Utils.smoothstep(0, margin, my);
}

function wrapDirtCoord(v) {
  return ((Math.round(v) % TILE_PIXELS) + TILE_PIXELS) % TILE_PIXELS;
}

function createSharedDirtTile() {
  const baseRnd = mulberry32(41000);
  const warpX = periodicField(baseRnd, 3, TILE_PIXELS);
  const warpY = periodicField(baseRnd, 3, TILE_PIXELS);
  const coarse = periodicField(baseRnd, 3, TILE_PIXELS);
  const medium = periodicField(baseRnd, 6, TILE_PIXELS);
  const fine = periodicField(baseRnd, 12, TILE_PIXELS);
  const tile = new Tile();

  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      // Domain-warped periodic coordinates so the base regolith has organic patches with zero linear stripes
      const wx = x + (warpX(x, y) - 0.5) * 20;
      const wy = y + (warpY(x, y) - 0.5) * 20;
      const c = coarse(wx, wy);
      const m = medium(wx + 11, wy + 7);
      const f = fine(x, y);
      const ridge = 1 - Math.abs((coarse(wx + 23, wy + 37) - 0.5) * 2);
      const shade = c * 0.45 + m * 0.35 + f * 0.2;
      let col = mix(MARS_DIRT_SHADOW, MARS_DIRT_BASE, Utils.clamp(shade * 1.15, 0, 1));
      col = mix(col, MARS_DIRT_LIGHT, ridge * 0.4 + (f - 0.5) * 0.24);
      if (shade > 0.64 && ridge > 0.56)
        col = mix(col, MARS_DIRT_OCHRE, (shade - 0.64) * 1.55);
      const grain = periodicDirtGrain(x, y) * 12;
      tile.set(x, y, [col[0] + grain, col[1] + grain * 0.7, col[2] + grain * 0.45]);
    }

  // Modulo-wrapped pebbles across the entire 64x64 tile (no empty border corridor)
  for (let k = 0; k < 20; k++) {
    const px = baseRnd() * TILE_PIXELS;
    const py = baseRnd() * TILE_PIXELS;
    const rx = 1.1 + baseRnd() * 2.3;
    const ry = 0.9 + baseRnd() * 1.9;
    const basalt = baseRnd() < 0.45;
    const rockCol = basalt ? mix(MARS_BASALT, MARS_DIRT_BASE, 0.25) : mix(MARS_DIRT_BASE, MARS_DIRT_LIGHT, 0.5);
    const rCeil = Math.ceil(Math.max(rx, ry)) + 1;
    for (let dy = -rCeil; dy <= rCeil; dy++)
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        const d = scratchPt.setScalar(dx / rx, dy / ry).getMagnitude();
        if (d > 1.15)
          continue;
        const wx = wrapDirtCoord(px + dx);
        const wy = wrapDirtCoord(py + dy);
        if (d > 0.88)
          tile.set(wx, wy, MARS_DIRT_SHADOW, 0.65);
        else {
          const highlight = dx - dy < 0 ? 0.35 : -0.25;
          const c = highlight > 0 ? mix(rockCol, MARS_DIRT_OCHRE, highlight) : mix(rockCol, MARS_DIRT_SHADOW, -highlight);
          tile.set(wx, wy, c, 0.92);
        }
      }
  }

  return tile;
}

let sharedDirtTile = null;

function drawMarsRegolithBase(t) {
  sharedDirtTile ??= createSharedDirtTile();
  t.pixels.set(sharedDirtTile.pixels);
}

function scatterMarsPebbles(t, rnd, count, maxRadius = 3.0) {
  for (let k = 0; k < count; k++) {
    const px = 6 + rnd() * (TILE_PIXELS - 12);
    const py = 6 + rnd() * (TILE_PIXELS - 12);
    const rx = 1.1 + rnd() * maxRadius;
    const ry = 0.9 + rnd() * (maxRadius * 0.85);
    const basalt = rnd() < 0.45;
    const rockCol = basalt ? mix(MARS_BASALT, MARS_DIRT_BASE, 0.25) : mix(MARS_DIRT_BASE, MARS_DIRT_LIGHT, 0.5);
    const rCeil = Math.ceil(Math.max(rx, ry)) + 1;
    for (let dy = -rCeil; dy <= rCeil; dy++)
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        const x = Math.round(px + dx);
        const y = Math.round(py + dy);
        const mask = dirtEdgeMask(x, y, 5);
        if (mask <= 0.01)
          continue;
        const d = scratchPt.setScalar(dx / rx, dy / ry).getMagnitude();
        if (d > 1.15)
          continue;
        if (d > 0.88)
          t.set(x, y, MARS_DIRT_SHADOW, 0.65 * mask);
        else {
          const highlight = dx - dy < 0 ? 0.35 : -0.25;
          const c = highlight > 0 ? mix(rockCol, MARS_DIRT_OCHRE, highlight) : mix(rockCol, MARS_DIRT_SHADOW, -highlight);
          t.set(x, y, c, 0.92 * mask);
        }
      }
  }
}

function drawMarsPlain(t, rnd) {
  drawMarsRegolithBase(t);
  const drift = periodicField(rnd, 3, TILE_PIXELS);
  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      const mask = dirtEdgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const d = drift(x, y);
      if (d > 0.56)
        t.set(x, y, MARS_DIRT_LIGHT, (d - 0.56) * 0.95 * mask);
      else if (d < 0.42)
        t.set(x, y, MARS_DIRT_SHADOW, (0.42 - d) * 0.75 * mask);
    }
  scatterMarsPebbles(t, rnd, 10, 2.2);
}

function drawMarsDunes(t, rnd) {
  drawMarsRegolithBase(t);
  const warpX = periodicField(rnd, 3, TILE_PIXELS);
  const warpY = periodicField(rnd, 3, TILE_PIXELS);
  const crest = periodicField(rnd, 4, TILE_PIXELS);
  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      const mask = dirtEdgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const wx = x + (warpX(x, y) - 0.5) * 22;
      const wy = y + (warpY(x, y) - 0.5) * 22;
      const ridge = 1 - Math.abs((crest(wx, wy) - 0.5) * 2);
      if (ridge > 0.62)
        t.set(x, y, MARS_DIRT_OCHRE, (ridge - 0.62) * 1.45 * mask);
      else if (ridge < 0.36)
        t.set(x, y, MARS_DIRT_SHADOW, (0.36 - ridge) * 1.25 * mask);
    }
  scatterMarsPebbles(t, rnd, 9, 1.9);
}

function drawMarsCrater(t, rnd) {
  drawMarsRegolithBase(t);
  const cx = 31.5 + (rnd() - 0.5) * 8;
  const cy = 31.5 + (rnd() - 0.5) * 8;
  const rOuter = 20;
  const wobble = periodicField(rnd, 4, TILE_PIXELS);
  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      const mask = dirtEdgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const dx = x - cx;
      const dy = y - cy;
      const d = scratchPt.setScalar(dx, dy).getMagnitude() + (wobble(x, y) - 0.5) * 3.8;
      if (d < rOuter && d >= rOuter - 4.5) {
        const lit = (dx + dy) < 0 ? MARS_DIRT_OCHRE : MARS_DIRT_SHADOW;
        t.set(x, y, lit, 0.52 * mask);
      } else if (d < rOuter - 4.5) {
        const depth = 1 - d / (rOuter - 4.5);
        const bowl = (dx + dy) > 0 ? MARS_DIRT_LIGHT : MARS_DIRT_SHADOW;
        t.set(x, y, mix(MARS_DIRT_SHADOW, bowl, 0.35), (0.38 + depth * 0.45) * mask);
      }
    }
  scatterMarsPebbles(t, rnd, 12, 2.5);
}

function drawMarsBasaltPatch(t, rnd) {
  drawMarsRegolithBase(t);
  const patch = periodicField(rnd, 3, TILE_PIXELS);
  const detail = periodicField(rnd, 8, TILE_PIXELS);
  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      const mask = dirtEdgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const m = patch(x, y) * 0.75 + detail(x, y) * 0.25;
      if (m > 0.52) {
        const edge = Math.min(1, (m - 0.52) * 4.8) * mask;
        const strata = detail(x + 13, y + 7) > 0.55 ? MARS_DIRT_SHADOW : MARS_BASALT;
        t.set(x, y, mix(MARS_DIRT_BASE, strata, 0.75), edge * 0.86);
      }
    }
  scatterMarsPebbles(t, rnd, 16, 3.0);
}

function drawMarsCrackedClay(t, rnd) {
  drawMarsRegolithBase(t);
  const basin = periodicField(rnd, 3, TILE_PIXELS);
  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      const mask = dirtEdgeMask(x, y, 5);
      if (mask > 0.01 && basin(x, y) > 0.48)
        t.set(x, y, mix(MARS_DIRT_BASE, MARS_DIRT_OCHRE, 0.38), (basin(x, y) - 0.48) * 1.1 * mask);
    }
  for (let c = 0; c < 5; c++) {
    let x = 10 + Math.floor(rnd() * 44);
    let y = 6;
    while (y < TILE_PIXELS - 6) {
      x = Utils.clamp(x + Math.round((rnd() - 0.5) * 2.8), 7, TILE_PIXELS - 8);
      y += 1;
      const mask = dirtEdgeMask(x, y, 5);
      t.set(x, y, MARS_DIRT_SHADOW, 0.88 * mask);
      t.set(x + 1, y, MARS_DIRT_OCHRE, 0.36 * mask);
    }
  }
  scatterMarsPebbles(t, rnd, 11, 2.3);
}

function drawMarsRuts(t, rnd) {
  drawMarsRegolithBase(t);
  const bendField = periodicField(rnd, 3, TILE_PIXELS);
  for (const y0 of [20, 44])
    for (let x = 5; x < TILE_PIXELS - 5; x++) {
      const mask = dirtEdgeMask(x, y0, 5);
      const bend = Math.round((bendField(x, y0) - 0.5) * 10);
      const yc = Utils.clamp(y0 + bend, 7, TILE_PIXELS - 8);
      t.set(x, yc - 2, MARS_DIRT_OCHRE, 0.42 * mask);
      t.set(x, yc - 1, MARS_DIRT_SHADOW, 0.68 * mask);
      t.set(x, yc, MARS_DIRT_SHADOW, 0.82 * mask);
      t.set(x, yc + 1, MARS_DIRT_BASE, 0.52 * mask);
      t.set(x, yc + 2, MARS_DIRT_OCHRE, 0.38 * mask);
    }
  scatterMarsPebbles(t, rnd, 14, 2.5);
}

function drawMarsThreshold(t, rnd) {
  drawMarsRegolithBase(t);
  const scree = periodicField(rnd, 4, TILE_PIXELS);
  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      const mask = dirtEdgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const s = scree(x, y);
      if (s > 0.58)
        t.set(x, y, MARS_DIRT_OCHRE, (s - 0.58) * 1.15 * mask);
      else if (s < 0.38)
        t.set(x, y, MARS_BASALT, (0.38 - s) * 1.25 * mask);
    }
  scatterMarsPebbles(t, rnd, 20, 3.4);
}

function drawMarsFissure(t, rnd) {
  drawMarsRegolithBase(t);
  let y = 24 + Math.floor(rnd() * 16);
  for (let x = 6; x < TILE_PIXELS - 6; x++) {
    y = Utils.clamp(y + Math.round((rnd() - 0.5) * 2.2), 10, TILE_PIXELS - 10);
    const mask = dirtEdgeMask(x, y, 5);
    t.set(x, y - 2, MARS_DIRT_SHADOW, 0.68 * mask);
    t.set(x, y - 1, [220, 88, 24], 0.55 * mask);
    t.set(x, y, [255, 142, 42], 0.82 * mask);
    t.set(x, y + 1, [220, 88, 24], 0.55 * mask);
    t.set(x, y + 2, MARS_DIRT_SHADOW, 0.68 * mask);
  }
  scatterMarsPebbles(t, rnd, 12, 2.4);
}

const MARS_DIRT_DRAW = [
  drawMarsPlain,
  drawMarsDunes,
  drawMarsCrater,
  drawMarsBasaltPatch,
  drawMarsCrackedClay,
  drawMarsRuts,
  drawMarsThreshold,
  drawMarsFissure,
];

/**
 * 8-cell 512x64 procedural Martian surface dirt atlas for outdoor planet tiles (`planet: 'mars'`).
 * Replaces steel deck plates with wind-rippled iron-oxide regolith, sand dunes, basalt scree, craters, and parched cracks.
 */
export function marsDirtAtlas() {
  const width = TILE_PIXELS * FLOOR_CELL_COUNT;
  const height = TILE_PIXELS;
  const data = new Uint8Array(width * height * 4);
  MARS_DIRT_DRAW.forEach((draw, cell) => {
    const tile = new Tile();
    draw(tile, mulberry32(41000 + cell * 88793));
    for (let y = 0; y < height; y++)
      for (let x = 0; x < TILE_PIXELS; x++) {
        const i = (y * TILE_PIXELS + x) * 3;
        const o = (y * width + cell * TILE_PIXELS + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name: 'marsDirt', data, width, height, cell: TILE_PIXELS, frames: FLOOR_CELL_COUNT };
}

export const MARS_DIRT_FRAGMENT = `
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

vec3 sampleDirtCell(vec2 p, float seed) {
  vec2 tileId = floor(p / 64.0);
  float cell = floor(hash(tileId + seed) * 8.0);
  vec2 t = floor(mod(p, 64.0)) + 0.5;
  return texture2D(uSampler, vec2((cell * 64.0 + t.x) / 512.0, t.y / 64.0)).rgb;
}

void main(void) {
  if (uHasFog == 1 && vDepth >= uFogFar) {
    gl_FragColor = vec4(uFogColor, ${SOLID_ALPHA});
    return;
  }
  // Domain-warp world coordinates and blend 3 incommensurate rotated/scaled layers across all 8 periodic dirt cells
  // (mod(vWorld, 64.0) base with shared periodic cell borders so tile seams and repetition never appear)
  vec2 warp = vec2(
    noise(vWorld / 58.0 + vec2(3.7, 9.2)) - 0.5,
    noise(vWorld / 52.0 + vec2(19.4, 7.1)) - 0.5
  ) * 24.0;
  vec2 pA = vWorld + warp;
  vec3 dirt = sampleDirtCell(pA, 0.0);
  if (vDepth < 680.0) {
    vec2 pB = vec2(vWorld.x * 0.58 - vWorld.y * 0.51, vWorld.x * 0.51 + vWorld.y * 0.58) + warp * 0.7 + vec2(31.4, 73.8);
    vec3 dirtB = sampleDirtCell(pB, 17.3);
    float blendAB = smoothstep(0.24, 0.76, noise(vWorld / 74.0 + 5.0));
    dirt = mix(dirt, dirtB, blendAB);
  }
  float near = 1.0 - smoothstep(180.0, 520.0, vDepth);
  float grit = 0.0;
  if (near > 0.01) {
    vec2 pC = vec2(-vWorld.x * 0.43 - vWorld.y * 0.67, vWorld.x * 0.67 - vWorld.y * 0.43) - warp * 0.5 + vec2(89.1, 17.6);
    vec3 dirtC = sampleDirtCell(pC, 43.9);
    float blendC = smoothstep(0.32, 0.78, noise(vWorld / 118.0 + 29.0));
    dirt = mix(dirt, dirtC, blendC * 0.58);
    vec2 texel = floor(vWorld);
    grit = ((noise(texel / 3.9) - 0.5) * 0.6 + (noise(texel / 1.8 + 17.0) - 0.5) * 0.4) * 0.14 * near;
  }
  dirt = mix(vec3(0.50, 0.21, 0.10), dirt, 0.35 + 0.65 * near);

  // Multi-scale domain-warped geological zones, twisted erosion ridges, and gravel scree (no periodic sine waves)
  float macro = noise(vWorld / 195.0 + 19.0) * 0.55 + noise(pA / 78.0 + 7.0) * 0.45;
  float ridge = 0.5;
  float scree = 0.5;
  if (vDepth < 680.0) {
    ridge = 1.0 - abs(noise((pA + warp * 0.8) / 38.0 + 41.0) * 2.0 - 1.0);
    scree = noise((vWorld - warp) / 21.0 + 63.0);
  }
  vec3 ochre = vec3(0.78, 0.39, 0.17);
  vec3 rustClay = vec3(0.62, 0.24, 0.11);
  vec3 basalt = vec3(0.22, 0.11, 0.07);
  vec3 color = dirt;
  color = mix(color, ochre, smoothstep(0.54, 0.84, macro * 0.6 + ridge * 0.4) * 0.32);
  color = mix(color, rustClay, smoothstep(0.55, 0.82, scree * 0.65 + (1.0 - ridge) * 0.35) * 0.24);
  color = mix(color, basalt, smoothstep(0.58, 0.85, (1.0 - macro) * 0.65 + (1.0 - scree) * 0.35) * 0.36);
  color = clamp(color + grit, 0.0, 1.0);
  float ember = smoothstep(0.32, 0.58, dirt.r - dirt.g * 0.65) * smoothstep(0.45, 0.75, dirt.g);
  color *= uMaterialDiffuse * surfaceLight(vWorldPos, ember * 0.45);
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA});
}
`;

export const MARS_BOULDER_CELLS = {
  crag: 0,
  strata: 1,
  scoured: 2,
  cap: 3,
};
export const MARS_BOULDER_CELL_COUNT = 4;

const BOULDER_ABYSS = [14, 6, 4];
const BOULDER_DARK = [34, 15, 10];
const BOULDER_SLATE = [68, 34, 22];
const BOULDER_BASE = [124, 52, 26];
const BOULDER_LIGHT = [178, 86, 38];
const BOULDER_HIGHLIGHT = [228, 134, 64];

function drawBoulderCell(t, rnd, variant) {
  const S = TILE_PIXELS;
  const warpX = periodicField(rnd, 3, S);
  const warpY = periodicField(rnd, 3, S);
  const coarse = periodicField(rnd, 3, S);
  const medium = periodicField(rnd, 6, S);
  const fine = periodicField(rnd, 12, S);
  // Subtle directional brightness per cell so 3D boulder faces have natural volume while matching the floor palette
  const shadeScale = variant === MARS_BOULDER_CELLS.crag
    ? 1.06
    : variant === MARS_BOULDER_CELLS.strata
      ? 0.96
      : variant === MARS_BOULDER_CELLS.scoured
        ? 0.84
        : 1.10;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const wx = x + (warpX(x, y) - 0.5) * 20;
      const wy = y + (warpY(x, y) - 0.5) * 20;
      const c = coarse(wx, wy);
      const m = medium(wx + 11, wy + 7);
      const f = fine(x, y);
      const ridge = 1 - Math.abs((coarse(wx + 23, wy + 37) - 0.5) * 2);
      const shade = c * 0.45 + m * 0.35 + f * 0.2;
      let col = mix(MARS_DIRT_SHADOW, MARS_DIRT_BASE, Utils.clamp(shade * 1.15, 0, 1));
      col = mix(col, MARS_DIRT_LIGHT, ridge * 0.4 + (f - 0.5) * 0.24);
      if (shade > 0.64 && ridge > 0.56)
        col = mix(col, MARS_DIRT_OCHRE, (shade - 0.64) * 1.55);

      const grain = periodicDirtGrain(x, y) * 12;
      t.set(x, y, [
        (col[0] + grain) * shadeScale,
        (col[1] + grain * 0.7) * shadeScale,
        (col[2] + grain * 0.45) * shadeScale,
      ]);
    }
  scatterMarsPebbles(t, rnd, 16, 2.5);
  // Ensure full dynamic range for boulder crevices and sunlit lips
  t.set(16, 16, BOULDER_ABYSS, 0.9);
  t.set(17, 16, BOULDER_HIGHLIGHT, 0.9);
}

export const MARS_ROCK_FRAGMENT = `
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
varying float vHeight;
varying vec2 vTextureCoord;
varying vec2 vSurface;
varying vec3 vWorldPos;

${RUST_GLSL}
${LIGHT_GLSL}

vec3 sampleRockCell(vec2 p, float seed) {
  vec2 tileId = floor(p / 64.0);
  float r = floor(hash(tileId + seed) * 7.0);
  float cell = r >= 5.0 ? r + 1.0 : r;
  vec2 t = floor(mod(p, 64.0)) + 0.5;
  return texture2D(uSampler, vec2((cell * 64.0 + t.x) / 512.0, t.y / 64.0)).rgb;
}

void main(void) {
  if (vHeight < -0.01)
    discard;
  if (uHasFog == 1 && vDepth >= uFogFar) {
    gl_FragColor = vec4(uFogColor, ${SOLID_ALPHA});
    return;
  }
  // Preserve the glowing green exit chevrons on exit monolith walls without evaluating rock noise
  vec3 uvTex = texture2D(uSampler, vTextureCoord).rgb;
  vec3 rock;
  vec3 color;
  if (uvTex.g > uvTex.r) {
    rock = uvTex;
    color = uvTex;
  } else {
    // Domain-warp surface coordinates and blend 3 incommensurate rotated/scaled layers across all 7 periodic rock cells
    // so walls share the floor's color & organic variety without any repeating 64-unit grid or tile seams
    vec2 warp = vec2(
      noise(vSurface / 58.0 + vec2(3.7, 9.2)) - 0.5,
      noise(vSurface / 52.0 + vec2(19.4, 7.1)) - 0.5
    ) * 24.0;
    vec2 pA = vSurface + warp;
    rock = sampleRockCell(pA, 0.0);
    if (vDepth < 680.0) {
      vec2 pB = vec2(vSurface.x * 0.58 - vSurface.y * 0.51, vSurface.x * 0.51 + vSurface.y * 0.58) + warp * 0.7 + vec2(31.4, 73.8);
      vec3 rockB = sampleRockCell(pB, 17.3);
      float blendAB = smoothstep(0.24, 0.76, noise(vSurface / 74.0 + 5.0));
      rock = mix(rock, rockB, blendAB);
    }
    float near = 1.0 - smoothstep(180.0, 520.0, vDepth);
    float grit = 0.0;
    if (near > 0.01) {
      vec2 pC = vec2(-vSurface.x * 0.43 - vSurface.y * 0.67, vSurface.x * 0.67 - vSurface.y * 0.43) - warp * 0.5 + vec2(89.1, 17.6);
      vec3 rockC = sampleRockCell(pC, 43.9);
      float blendC = smoothstep(0.32, 0.78, noise(vSurface / 118.0 + 29.0));
      rock = mix(rock, rockC, blendC * 0.58);
      vec2 texel = floor(vSurface);
      grit = ((noise(texel / 3.9) - 0.5) * 0.6 + (noise(texel / 1.8 + 17.0) - 0.5) * 0.4) * 0.14 * near;
    }
    rock = mix(vec3(0.50, 0.21, 0.10), rock, 0.35 + 0.65 * near);

    // Same multi-scale domain-warped geological zones, twisted erosion ridges, and gravel scree as MARS_DIRT_FRAGMENT
    float macro = noise(vSurface / 195.0 + 19.0) * 0.55 + noise(pA / 78.0 + 7.0) * 0.45;
    float ridge = 0.5;
    float scree = 0.5;
    if (vDepth < 680.0) {
      ridge = 1.0 - abs(noise((pA + warp * 0.8) / 38.0 + 41.0) * 2.0 - 1.0);
      scree = noise((vSurface - warp) / 21.0 + 63.0);
    }
    vec3 ochre = vec3(0.78, 0.39, 0.17);
    vec3 rustClay = vec3(0.62, 0.24, 0.11);
    vec3 basalt = vec3(0.22, 0.11, 0.07);
    color = rock;
    color = mix(color, ochre, smoothstep(0.54, 0.84, macro * 0.6 + ridge * 0.4) * 0.32);
    color = mix(color, rustClay, smoothstep(0.55, 0.82, scree * 0.65 + (1.0 - ridge) * 0.35) * 0.24);
    color = mix(color, basalt, smoothstep(0.58, 0.85, (1.0 - macro) * 0.65 + (1.0 - scree) * 0.35) * 0.36);
    color = clamp(color + grit, 0.0, 1.0);
  }
  float ember = smoothstep(0.32, 0.58, rock.r - rock.g * 0.65) * smoothstep(0.45, 0.75, rock.g);
  float exitGlow = smoothstep(0.06, 0.2, rock.g - rock.r);
  color *= uMaterialDiffuse * surfaceLight(vWorldPos, max(ember * 0.45, exitGlow * 0.85));
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA});
}
`;

/**
 * 256x64 4-cell procedural Martian rock boulder atlas (`crag`, `strata`, `scoured`, `cap`)
 * for outdoor rock cover outcrops (`o` / `PILLAR`) on `planet: 'mars'`.
 */
export function marsBoulderAtlas() {
  const width = TILE_PIXELS * MARS_BOULDER_CELL_COUNT;
  const height = TILE_PIXELS;
  const data = new Uint8Array(width * height * 4);
  for (let cell = 0; cell < MARS_BOULDER_CELL_COUNT; cell++) {
    const t = new Tile(TILE_PIXELS, TILE_PIXELS);
    drawBoulderCell(t, mulberry32(62000 + cell * 49999), cell);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < TILE_PIXELS; x++) {
        const i = (y * TILE_PIXELS + x) * 3;
        const o = (y * width + cell * TILE_PIXELS + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(t.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  }
  return { name: 'marsBoulder', data, width, height, cell: TILE_PIXELS, frames: MARS_BOULDER_CELL_COUNT };
}

export function marsBoulderCellUv(cell, flipV = false) {
  const inset = 0.25 / (TILE_PIXELS * MARS_BOULDER_CELL_COUNT);
  return [cell / MARS_BOULDER_CELL_COUNT + inset, flipV ? 1 : 0, (cell + 1) / MARS_BOULDER_CELL_COUNT - inset, flipV ? 0 : 1];
}

export const MARS_BOULDER_BASE_INSET = 1.0;
export const MARS_BOULDER_SLOPE = 0.5;

/**
 * Builds the 3D quad geometry for a jagged Martian boulder cluster (`'o'` / `PILLAR` tile outdoors on Mars).
 * `center` is a `Vec3(x, baseY, z)` and `size` is a `Vec2(footprint, height)`.
 */
export function marsBoulderQuads(center, size = new Vec2(64, 26)) {
  const cx = center.x;
  const baseY = center.y;
  const cz = center.z;
  const scaleXZ = size.x / 64;
  const scaleY = size.y / 26;
  const quads = [];

  const uvCrag = marsBoulderCellUv(MARS_BOULDER_CELLS.crag, false);
  const uvStrata = marsBoulderCellUv(MARS_BOULDER_CELLS.strata, false);
  const uvScoured = marsBoulderCellUv(MARS_BOULDER_CELLS.scoured, false);
  const uvCap = marsBoulderCellUv(MARS_BOULDER_CELLS.cap, false);

  // Tapered rock frustum helper (wider base, narrower weathered top) with directional face shading
  const pushRockMass = (ox, oz, hxBot, hzBot, hxTop, hzTop, y0, y1, southUv, northUv, westUv, eastUv, capUv) => {
    const bx0 = cx + (ox - hxBot) * scaleXZ;
    const bx1 = cx + (ox + hxBot) * scaleXZ;
    const bz0 = cz + (oz - hzBot) * scaleXZ;
    const bz1 = cz + (oz + hzBot) * scaleXZ;
    const tx0 = cx + (ox - hxTop) * scaleXZ;
    const tx1 = cx + (ox + hxTop) * scaleXZ;
    const tz0 = cz + (oz - hzTop) * scaleXZ;
    const tz1 = cz + (oz + hzTop) * scaleXZ;
    const by0 = baseY + y0 * scaleY;
    const by1 = baseY + y1 * scaleY;
    quads.push(
      { corners: [bx0, by0, bz1, bx1, by0, bz1, tx1, by1, tz1, tx0, by1, tz1], uv: southUv },
      { corners: [bx1, by0, bz0, bx0, by0, bz0, tx0, by1, tz0, tx1, by1, tz0], uv: northUv },
      { corners: [bx0, by0, bz0, bx0, by0, bz1, tx0, by1, tz1, tx0, by1, tz0], uv: westUv },
      { corners: [bx1, by0, bz1, bx1, by0, bz0, tx1, by1, tz0, tx1, by1, tz1], uv: eastUv },
      { corners: [tx0, by1, tz1, tx1, by1, tz1, tx1, by1, tz0, tx0, by1, tz0], uv: capUv }
    );
  };

  // Continuous 0.5-slope rock frustum across 3 geological strata tiers (half-width 31 -> 28 -> 22 -> 18 from y = 0 .. 26)
  // 1. Broad buried bedrock plinth emerging from Martian sand (y = 0 .. 6.0)
  pushRockMass(0, 0, 31.0, 31.0, 28.0, 28.0, 0.0, 6.0, uvStrata, uvScoured, uvScoured, uvCrag, uvCap);
  // 2. Main central jagged rock torso (y = 6.0 .. 18.0)
  pushRockMass(0, 0, 28.0, 28.0, 22.0, 22.0, 6.0, 18.0, uvCrag, uvScoured, uvStrata, uvCrag, uvCap);
  // 3. Upper weathered crag shoulder (y = 18.0 .. 26.0)
  pushRockMass(0, 0, 22.0, 22.0, 18.0, 18.0, 18.0, 26.0, uvCrag, uvStrata, uvScoured, uvCrag, uvCap);
  // 4. Northwest summit crag peak crowning the top plateau (y = 24.5 .. 26.8)
  pushRockMass(-4.5, -3.5, 11.5, 10.5, 8.0, 7.5, 24.5, 26.8, uvCrag, uvStrata, uvScoured, uvCrag, uvCap);
  // 5. Southeast summit crag ridge crowning the top plateau (y = 24.2 .. 26.4)
  pushRockMass(4.5, 4.0, 11.0, 10.5, 7.5, 7.0, 24.2, 26.4, uvCrag, uvScoured, uvStrata, uvStrata, uvCap);
  // 6. Southwest fractured summit spur crowning the top plateau (y = 24.0 .. 26.2)
  pushRockMass(-3.5, 4.5, 10.0, 9.5, 7.0, 6.5, 24.0, 26.2, uvStrata, uvScoured, uvScoured, uvCrag, uvCap);

  return quads;
}

export function marsBoulderMesh(center = new Vec3(0, 0, 0), size = new Vec2(64, 26)) {
  const quads = marsBoulderQuads(center, size);
  const vertices = new Float32Array(quads.length * 18);
  const uvs = new Float32Array(quads.length * 12);
  let vOut = 0;
  let uOut = 0;
  for (const { corners, uv } of quads) {
    const [u0, v0, u1, v1] = uv;
    const cornerUvs = [
      u0, v0,
      u1, v0,
      u1, v1,
      u0, v1,
    ];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      vertices[vOut++] = corners[k * 3];
      vertices[vOut++] = corners[k * 3 + 1];
      vertices[vOut++] = corners[k * 3 + 2];
      uvs[uOut++] = cornerUvs[k * 2];
      uvs[uOut++] = cornerUvs[k * 2 + 1];
    }
  }
  return { vertices, uvs };
}




