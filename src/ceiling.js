import { AmbientLight, MAX_LIGHTS, PointLight, Vec2, Vec3 } from '@1pizzateam/roostr';
import { mulberry32 } from './rng.js';
import { GLOW, LIGHT, METAL, mix, plate, rivet, SHADOW, Tile } from './floor.js';
import { CEILING, DOOR, FLOOR, TILE } from './level.js';

/**
 * The ceiling of an old space base: dark steel panels with ribs, ducts, grilles and long light fixtures, as a
 * pixel-art atlas drawn here in code. One cell is one 64 x 64 tile of the level. It is seen from below, far off and
 * near the top of the screen, so it is kept dark and quiet. The rust is the floor's, worked out in its shader.
 */

export const CEILING_CELLS = { panels: 0, ribs: 1, duct: 2, grille: 3, light: 4 };
export const CEILING_CELL_COUNT = 5;
export const CEILING_LIGHT_COLOR = new Vec3(0.85, 0.96, 1.12);
export const CEILING_AMBIENT_COLOR = new Vec3(0.56, 0.62, 0.72);
export const CEILING_LIGHT_ATTENUATION = new Vec3(1, 0.0032, 0.000018);
export const CEILING_LIGHT_RADIUS = TILE * 11;
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

/** Which cell hangs over a tile: light fixtures spaced on a wide 5x4 grid so rooms aren't crowded, the rest scattered. */
export function ceilingCellFor(x, y) {
  if (x % 5 === 2 && y % 4 === 3)
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

/**
 * Every ceiling tile with a light fixture texture (`CEILING_CELLS.light`) over a roofed floor or doorway tile gets a 3D
 * light fixture entry positioned just beneath the ceiling diffuser.
 */
export function ceilingLightFixtures(level) {
  const fixtures = [];
  const lightY = CEILING - 2;
  for (let ty = 0; ty < level.rowCount; ty++) {
    for (let tx = 0; tx < level.width; tx++) {
      const idx = ty * level.width + tx;
      if ((level.kind[idx] !== FLOOR && level.kind[idx] !== DOOR) || level.arena?.has(idx))
        continue;
      if (ceilingCellFor(tx, ty) !== CEILING_CELLS.light)
        continue;
      let h = Math.imul(tx * 73856093 ^ ty * 19349663 ^ 17, 2654435761);
      h = (h ^ (h >>> 15)) >>> 0;
      fixtures.push({
        tile: new Vec2(tx, ty),
        position: new Vec3((tx + 0.5) * TILE, lightY, (ty + 0.5) * TILE),
        phase: (h % 628) / 100,
        flicker: h % 5 === 0,
      });
    }
  }
  return fixtures;
}

/** Registers an AmbientLight and up to `MAX_LIGHTS` reusable PointLight instances in the RoostR scene. */
export function createCeilingLights(scene, count = MAX_LIGHTS) {
  if (typeof scene.clearLights === 'function')
    scene.clearLights();
  const ambient = new AmbientLight(CEILING_AMBIENT_COLOR.clone());
  if (typeof scene.addLight === 'function')
    scene.addLight(ambient);
  const pointLights = [];
  for (let i = 0; i < count; i++) {
    const light = new PointLight(
      new Vec3(0, -9999, 0),
      new Vec3(0, 0, 0),
      CEILING_LIGHT_ATTENUATION.clone()
    );
    if (typeof scene.addLight === 'function')
      scene.addLight(light);
    pointLights.push(light);
  }
  return { ambient, pointLights };
}

/**
 * Positions the scene's active RoostR PointLight pool at the ceiling light fixtures nearest `cameraPos`, with smooth
 * distance fade at the outer selection boundary and subtle fluorescent hum on worn tubes.
 */
export function updateCeilingLights(pointLights, fixtures, cameraPos, time = 0) {
  const limit = pointLights.length;
  if (!limit)
    return pointLights;
  const maxDistSq = CEILING_LIGHT_RADIUS * CEILING_LIGHT_RADIUS;
  const ranked = [];
  for (let i = 0; i < fixtures.length; i++) {
    const fixture = fixtures[i];
    const distSq = cameraPos.getDistance(fixture.position, true);
    if (distSq <= maxDistSq)
      ranked.push({ fixture, distSq });
  }
  ranked.sort((a, b) => a.distSq - b.distSq);

  for (let i = 0; i < limit; i++) {
    const light = pointLights[i];
    const entry = ranked[i];
    if (!entry) {
      light.diffuse.setScalar(0, 0, 0);
      continue;
    }
    const { fixture, distSq } = entry;
    light.setPosition(fixture.position);
    const ratio = distSq / maxDistSq;
    const windowFade = ratio > 0.65 ? Math.max(0, 1 - (ratio - 0.65) / 0.35) : 1;
    let hum = 1;
    if (fixture.flicker) {
      const wave = Math.sin(time * 19 + fixture.phase) * Math.sin(time * 43 + fixture.phase * 1.7);
      hum = wave < -0.68 ? 0.64 : 0.96 + 0.04 * wave;
    }
    light.diffuse.scaleVector(CEILING_LIGHT_COLOR, windowFade * hum);
  }
  return pointLights;
}

export const CEILING_CONE_VERTEX = `
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
varying float vDepth;
varying vec3 vWorldPos;
varying vec2 vFixtureCenter;

void main(void) {
  vec4 world = uModelMatrix * vec4(aVertexPosition, 1.0);
  vec4 v = uViewMatrix * world;
  vDepth = -v.z;
  vWorldPos = world.xyz;
  vFixtureCenter = aTextureCoord;
  gl_Position = uProjectionMatrix * v;
}
`;

export const CEILING_CONE_FRAGMENT = `
precision mediump float;
uniform vec3 uMaterialDiffuse;
uniform float uTime;
uniform int uHasFog;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vDepth;
varying vec3 vWorldPos;
varying vec2 vFixtureCenter;

void main(void) {
  float t = clamp((62.6 - vWorldPos.y) / 52.6, 0.0, 1.0);
  float topSoft = smoothstep(0.0, 0.06, t);
  float vFade = topSoft * (1.0 - t) * (1.0 - t) * (1.0 - t * 0.45);

  vec2 rel = vWorldPos.xz - vFixtureCenter;
  vec2 span = mix(vec2(22.0, 6.0), vec2(38.0, 20.0), t);
  vec2 q = rel / span;
  float xFade = 1.0 - smoothstep(0.12, 1.0, abs(q.x));
  float zFade = 1.0 - smoothstep(0.05, 1.0, abs(q.y));
  float hFade = xFade * xFade * zFade;

  // four soft fanned shafts matching the four louver bays of the ceiling fixture, diffusing as they descend
  float bay = 0.5 + 0.5 * cos(q.x * 12.56637);
  float shafts = mix(0.52 + 0.48 * bay * bay, 1.0, t * 0.72);

  float seed = fract(sin(dot(vFixtureCenter, vec2(12.9898, 78.233))) * 43758.5453);
  float hum = 1.0;
  if (seed < 0.2) {
    float wave = sin(uTime * 19.0 + seed * 31.4) * sin(uTime * 43.0 + seed * 53.4);
    hum = wave < -0.68 ? 0.64 : 0.96 + 0.04 * wave;
  }

  float nearFade = smoothstep(10.0, 34.0, vDepth);
  float fogFade = uHasFog == 1 ? 1.0 - clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0) : 1.0;
  float alpha = vFade * hFade * shafts * hum * nearFade * fogFade * 0.075;
  if (alpha <= 0.001)
    discard;
  gl_FragColor = vec4(uMaterialDiffuse * alpha, 0.0);
}
`;

/**
 * Builds intersecting translucent trapezoidal light-cone quads ("god rays") hanging softly beneath each ceiling light
 * fixture. Every vertex carries its fixture's `(cx, cz)` world center in `uvs` so the shader can evaluate a seamless
 * 3D cone volume and four fanned louver shafts without affine trapezoid distortion.
 */
export function ceilingLightCones(fixtures) {
  const quadsPerFixture = 4;
  const vertices = new Float32Array(fixtures.length * quadsPerFixture * 18);
  const uvs = new Float32Array(fixtures.length * quadsPerFixture * 12);
  const yTop = CEILING - 1.4;
  const yBot = 10;
  const topX = 22;
  const botX = 38;
  const topZ = 6;
  const botZ = 20;
  const sheets = [
    [-topX, -topZ * 0.55, topX, -topZ * 0.55, -botX, -botZ * 0.65, botX, -botZ * 0.65],
    [-topX, topZ * 0.55, topX, topZ * 0.55, -botX, botZ * 0.65, botX, botZ * 0.65],
    [-topX * 0.85, -topZ, topX * 0.85, topZ, -botX * 0.85, -botZ, botX * 0.85, botZ],
    [-topX * 0.85, topZ, topX * 0.85, -topZ, -botX * 0.85, botZ, botX * 0.85, -botZ],
  ];
  let v = 0;
  let t = 0;
  for (let i = 0; i < fixtures.length; i++) {
    const cx = fixtures[i].position.x;
    const cz = fixtures[i].position.z;
    for (let s = 0; s < sheets.length; s++) {
      const [tx0, tz0, tx1, tz1, bx0, bz0, bx1, bz1] = sheets[s];
      const corners = [
        cx + bx0, yBot, cz + bz0,
        cx + bx1, yBot, cz + bz1,
        cx + tx1, yTop, cz + tz1,
        cx + tx0, yTop, cz + tz0,
      ];
      for (const c of [0, 1, 2, 0, 2, 3]) {
        const k = c * 3;
        vertices[v++] = corners[k];
        vertices[v++] = corners[k + 1];
        vertices[v++] = corners[k + 2];
        uvs[t++] = cx;
        uvs[t++] = cz;
      }
    }
  }
  return { vertices, uvs, count: fixtures.length * quadsPerFixture * 6 };
}
