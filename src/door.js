import { Utils } from '@1pizzateam/spock';
import { SOLID_ALPHA } from './quads.js';
import { mulberry32 } from './rng.js';
import { GLOW, LIGHT, LIGHT_GLSL, METAL, mix, plate, rivet, RUST_GLSL, SHADOW, Tile } from './floor.js';

/**
 * The doors of an old space base: heavy sliding blast doors in two leaves, with a hazard-striped frame, recessed
 * panels, a viewing slit in each leaf and green status lights, rusted like the floor. A pixel-art atlas drawn here in
 * code: the face of the door (64 x 64, one texel per world unit) and its top, side by side in a 128 x 64 image.
 */

export const DOOR_FACE = 0;
export const DOOR_TOP = 1;
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

/**
 * The door as a box: four sides showing the face and a top, standing on y = 0, `size` wide and deep and `height` tall.
 * Vertices, texture coordinates (v = 1 at the top of a picture) and a primitive, for a RoostR CustomMesh.
 */
export function doorBox(size, height) {
  const h = size / 2;
  const sides = [
    [[-h, 0, h], [h, 0, h], [h, height, h], [-h, height, h]],
    [[h, 0, -h], [-h, 0, -h], [-h, height, -h], [h, height, -h]],
    [[h, 0, h], [h, 0, -h], [h, height, -h], [h, height, h]],
    [[-h, 0, -h], [-h, 0, h], [-h, height, h], [-h, height, -h]],
  ];
  const vertices = [];
  const uvs = [];
  const push = (corners, cell) => {
    const u0 = cell / DOOR_CELLS;
    const u1 = (cell + 1) / DOOR_CELLS;
    const inset = 0.25 / (SIZE * DOOR_CELLS);
    const uv = [[u0 + inset, 0], [u1 - inset, 0], [u1 - inset, 1], [u0 + inset, 1]];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      vertices.push(...corners[k]);
      uvs.push(...uv[k]);
    }
  };
  for (const corners of sides)
    push(corners, DOOR_FACE);
  push([[-h, height, h], [h, height, h], [h, height, -h], [-h, height, -h]], DOOR_TOP);
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
  const slabs = [
    [-outer, -outer + thickness],
    [outer - thickness, outer],
  ];
  const vertices = [];
  const uvs = [];
  const push = (corners, cell, uSpan = 1, vSpan = 1) => {
    const u0 = cell / DOOR_CELLS;
    const u1 = u0 + uSpan / DOOR_CELLS;
    const insetU = 0.25 / (SIZE * DOOR_CELLS);
    const insetV = 0.25 / SIZE;
    const uv = [
      [u0 + insetU, insetV],
      [u1 - insetU, insetV],
      [u1 - insetU, vSpan - insetV],
      [u0 + insetU, vSpan - insetV],
    ];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      vertices.push(...corners[k]);
      uvs.push(...uv[k]);
    }
  };
  const edgeSpan = Math.min(1, thickness / SIZE);
  for (const [d0, d1] of slabs) {
    if (alongY) {
      push([[-h, 0, d1], [h, 0, d1], [h, height, d1], [-h, height, d1]], DOOR_FACE);
      push([[h, 0, d0], [-h, 0, d0], [-h, height, d0], [h, height, d0]], DOOR_FACE);
      push([[h, 0, d1], [h, 0, d0], [h, height, d0], [h, height, d1]], DOOR_TOP, edgeSpan, 1);
      push([[-h, 0, d0], [-h, 0, d1], [-h, height, d1], [-h, height, d0]], DOOR_TOP, edgeSpan, 1);
      push([[-h, height, d1], [h, height, d1], [h, height, d0], [-h, height, d0]], DOOR_TOP, 1, edgeSpan);
    } else {
      push([[d1, 0, h], [d1, 0, -h], [d1, height, -h], [d1, height, h]], DOOR_FACE);
      push([[d0, 0, -h], [d0, 0, h], [d0, height, h], [d0, height, -h]], DOOR_FACE);
      push([[d0, 0, h], [d1, 0, h], [d1, height, h], [d0, height, h]], DOOR_TOP, edgeSpan, 1);
      push([[d1, 0, -h], [d0, 0, -h], [d0, height, -h], [d1, height, -h]], DOOR_TOP, edgeSpan, 1);
      push([[d1, height, h], [d1, height, -h], [d0, height, -h], [d0, height, h]], DOOR_TOP, 1, edgeSpan);
    }
  }
  return { vertices, uvs };
}

/**
 * A secret push-wall door disguised as a flush bulkhead wall panel (cell 0 of the 8-cell wall atlas).
 * `dimensions` is a Vec2(size, height) or Vec3(size, height, depth).
 */
export function secretDoorBox(dimensions, wallCells = 8) {
  const h = dimensions.x / 2;
  const height = dimensions.y;
  const sides = [
    [[-h, 0, h], [h, 0, h], [h, height, h], [-h, height, h]],
    [[h, 0, -h], [-h, 0, -h], [-h, height, -h], [h, height, -h]],
    [[h, 0, h], [h, 0, -h], [h, height, -h], [h, height, h]],
    [[-h, 0, -h], [-h, 0, h], [-h, height, h], [-h, height, -h]],
  ];
  const vertices = [];
  const uvs = [];
  const push = (corners, cell) => {
    const u0 = cell / wallCells;
    const u1 = (cell + 1) / wallCells;
    const inset = 0.25 / (SIZE * wallCells);
    const uv = [[u0 + inset, 0], [u1 - inset, 0], [u1 - inset, 1], [u0 + inset, 1]];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      vertices.push(...corners[k]);
      uvs.push(...uv[k]);
    }
  };
  for (const corners of sides)
    push(corners, 0);
  push([[-h, height, h], [h, height, h], [h, height, -h], [-h, height, -h]], 0);
  return { vertices, uvs };
}


// ---- the shaders ---------------------------------------------------------------------------------------------------
// The same rust as the floor, in many small patches, but worked out on the door itself (from where a point is on its
// face), so it does not slide off the door as it sinks into the floor. Each door has its own, from where it stands.
// What is below the floor is not drawn.

export const DOOR_VERTEX = `
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
varying float vDepth;
varying float vHeight;
varying vec2 vTextureCoord;
varying vec2 vSurface;
varying vec3 vWorldPos;

void main(void) {
  vec4 world = uModelMatrix * vec4(aVertexPosition, 1.0);
  vec4 v = uViewMatrix * world;
  vDepth = -v.z;
  v.z += 1.2 + vDepth * 0.01;
  vHeight = world.y;
  vTextureCoord = aTextureCoord;
  // a point on the door or wall: along it (cardinal or diagonal) and up it, apart from every other door
  vSurface = vec2(aVertexPosition.x * 1.13 + aVertexPosition.z * 0.87, aVertexPosition.y) + uModelMatrix[3].xz * 0.37;
  vWorldPos = world.xyz;
  gl_Position = uProjectionMatrix * v;
}
`;

/**
 * The fragment shader of a rusted surface. `scale` is the size of the patches in world units and `threshold` how much of
 * the surface they take: higher is less rust.
 */
function rustedFragment(scale, threshold) {
  return `
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

void main(void) {
  if (vHeight < -0.01)
    discard;
  vec3 steel = texture2D(uSampler, vTextureCoord).rgb;
  vec3 color = steel;

  // small patches scattered over the door, thicker low down where water ran
  float spots = noise(vSurface / ${scale.toFixed(1)} + 3.0) * 0.6 + noise(vSurface / ${(scale * 0.43).toFixed(1)} + 17.0) * 0.4;
  float low = 1.0 - smoothstep(0.0, 40.0, vSurface.y);
  float area = smoothstep(${(threshold).toFixed(2)} - low * 0.06, ${(threshold + 0.1).toFixed(2)} - low * 0.06, spots);
  float near = 1.0 - smoothstep(260.0, 820.0, vDepth);
  vec2 texel = floor(vSurface);
  float grain = noise(texel / 3.0) * 0.6 + noise(texel / 1.3 + 40.0) * 0.4;
  float amount = area * mix(0.8, 0.3 + grain * 0.9, near);
  // the lights and the hazard stripes stay as they are
  float peak = max(steel.r, max(steel.g, steel.b));
  float lit = max(max(smoothstep(0.06, 0.2, steel.b - steel.r), smoothstep(0.06, 0.2, steel.g - steel.r)), smoothstep(0.68, 0.85, peak));
  float hazard = smoothstep(0.1, 0.2, steel.r - steel.b);
  amount *= (1.0 - lit) * (1.0 - hazard * 0.6);

  if (amount > 0.3) {
    vec3 paint = (amount > 0.9 ? RUST_BRIGHT : (amount > 0.6 ? RUST : RUST_DARK)) * 0.62;
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
}

export const DOOR_FRAGMENT = rustedFragment(14, 0.62);
// walls are bigger and nearer than doors, so their patches are smaller and there are fewer of them
export const WALL_FRAGMENT = rustedFragment(8, 0.7);
