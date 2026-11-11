/**
 * 3D facility furniture props and their procedural pixel-art texture atlases:
 * - Water Dispenser (`dispenserAtlas()`, `dispenserMesh()`):
 *   - Drawn procedurally as a crisp power-of-two RGBA atlas (64 x 64 per cell, 4 cells = 256 x 64):
 *     - Cell 0 (`FRONT`): UAC enameled cool-steel front cabinet with status LEDs, recessed dispensing alcove, and lower door.
 *     - Cell 1 (`SIDE`): Enameled side/back casing with heat-exchanger louvers, structural seam, rivets, and dark kickplate.
 *     - Cell 2 (`TRIM`): Cold-blue & hot-red tap paddle swatches, collar plastic, and slotted stainless drip-tray grate.
 *     - Cell 3 (`BOTTLE`): Translucent-look 5-gallon cyan polycarbonate water carboy with meniscus line, ribs, and bubbles.
 *   - `dispenserMesh()` builds the floor-standing cooler cabinet (`y = 0..26.5`), recessed dispensing bay, projecting drip
 *     tray, dual hot/cold 3D spigots, side cup-holder tube, top funnel collar, and 12-sided inverted water carboy (`y = 28..42`).
 * - Computer Desk & Chair (`deskAtlas()`, `deskMesh()`):
 *   - Drawn procedurally as a crisp power-of-two RGBA atlas (64 x 64 per cell, 4 cells = 256 x 64):
 *     - Cell 0 (`DESK_TOP`): Brushed slate laminate desktop surface, beveled steel trim, and pedestal drawer fronts.
 *     - Cell 1 (`DESK_SIDE`): Enameled steel desk legs/panels and desktop computer tower chassis with drive bays & LEDs.
 *     - Cell 2 (`DESK_SCREEN`): Glowing phosphor-green/teal UAC tactical CRT monitor screen and mechanical keyboard matrix.
 *     - Cell 3 (`DESK_CHAIR`): Ergonomic ribbed tactical upholstery cushion and dark chrome 5-star swivel chair base.
 *   - `deskMesh()` builds the cantilevered steel desk (`y = 0..20`), desktop computer tower (`y = 20..33.4`), swivel monitor
 *     stand & CRT screen (`y = 20..38`), keyboard & mouse, and 5-star swivel office chair (`y = 0..32.5`) tucked in front.
 * - Refectory Table & Chairs (`tableAtlas()`, `tableMesh()`):
 *   - Drawn procedurally as a crisp power-of-two RGBA atlas (64 x 64 per cell, 4 cells = 256 x 64) with canteen tabletop,
 *     tubular steel legs, molded canteen chairs, and stainless cafeteria meal trays & thermo-mugs on top (`y = 0..30`).
 * - Kitchen Oven (`ovenAtlas()`, `ovenMesh()`):
 *   - Drawn procedurally as a crisp power-of-two RGBA atlas (64 x 64 per cell, 4 cells = 256 x 64) with commercial stainless
 *     oven front & glowing baking window, 4-burner cast-iron stove grates with heating coils, stockpot, and flue riser (`y = 0..36`).
 * - Kitchen Sink (`sinkAtlas()`, `sinkMesh()`):
 *   - Drawn procedurally as a crisp power-of-two RGBA atlas (64 x 64 per cell, 4 cells = 256 x 64) with commercial stainless
 *     under-sink cabinet, ribbed drainboard, deep recessed wash basin with soapy water, and gooseneck faucet (`y = 0..36`).
 */
import { Trigo, Utils, Vec2, Vec3 } from '@1pizzateam/spock';
import { field, mix, plate, rivet, rust, SHADOW, Tile } from './floor.js';
import { mulberry32 } from './rng.js';

const scratchEdgeA = new Vec3();
const scratchEdgeB = new Vec3();
const scratchNormal = new Vec3();
const scratchUvA = new Vec2();
const scratchUvB = new Vec2();
const scratchUvC = new Vec2();
const scratchUvD = new Vec2();

const FRONT = { x: 0, width: 64, height: 64 };
const SIDE = { x: 64, width: 64, height: 64 };
const TRIM = { x: 128, width: 64, height: 64 };
const BOTTLE = { x: 192, width: 64, height: 64 };

export const DISPENSER_CELL = 64;
export const DISPENSER_FRAMES = 4;
export const DISPENSER_ATLAS = { width: 256, height: 64 };
export const DISPENSER_SIZE = new Vec3(14, 42, 14);
export const DISPENSER_RADIUS = 10;
export const DISPENSER_WALL_OFFSET = 20;
export const DISPENSER_HP = 1;
export const DISPENSER_SHARD_COUNT = 5;

const DESK_TOP = { x: 0, width: 64, height: 64 };
const DESK_SIDE = { x: 64, width: 64, height: 64 };
const DESK_SCREEN = { x: 128, width: 64, height: 64 };
const DESK_CHAIR = { x: 192, width: 64, height: 64 };

export const DESK_CELL = 64;
export const DESK_FRAMES = 4;
export const DESK_ATLAS = { width: 256, height: 64 };
export const DESK_SIZE = new Vec3(36, 38, 30);
export const DESK_RADIUS = 16;
export const DESK_WALL_OFFSET = 14;
export const DESK_HP = 1;
export const DESK_SHARD_COUNT = 5;

const TABLE_TOP = { x: 0, width: 64, height: 64 };
const TABLE_FRAME = { x: 64, width: 64, height: 64 };
const TABLE_CHAIR = { x: 128, width: 64, height: 64 };
const TABLE_TRAY = { x: 192, width: 64, height: 64 };

export const TABLE_CELL = 64;
export const TABLE_FRAMES = 4;
export const TABLE_ATLAS = { width: 256, height: 64 };
export const TABLE_SIZE = new Vec3(38, 30, 34);
export const TABLE_RADIUS = 18;
export const TABLE_WALL_OFFSET = 0;
export const TABLE_HP = 1;
export const TABLE_SHARD_COUNT = 5;

const OVEN_FRONT = { x: 0, width: 64, height: 64 };
const OVEN_SIDE = { x: 64, width: 64, height: 64 };
const OVEN_COOKTOP = { x: 128, width: 64, height: 64 };
const OVEN_TRIM = { x: 192, width: 64, height: 64 };

export const OVEN_CELL = 64;
export const OVEN_FRAMES = 4;
export const OVEN_ATLAS = { width: 256, height: 64 };
export const OVEN_SIZE = new Vec3(26, 36, 22);
export const OVEN_RADIUS = 14;
export const OVEN_WALL_OFFSET = 18;
export const OVEN_HP = 1;
export const OVEN_SHARD_COUNT = 5;

const SINK_FRONT = { x: 0, width: 64, height: 64 };
const SINK_SIDE = { x: 64, width: 64, height: 64 };
const SINK_TOP = { x: 128, width: 64, height: 64 };
const SINK_WATER = { x: 192, width: 64, height: 64 };

export const SINK_CELL = 64;
export const SINK_FRAMES = 4;
export const SINK_ATLAS = { width: 256, height: 64 };
export const SINK_SIZE = new Vec3(30, 36, 22);
export const SINK_RADIUS = 15;
export const SINK_WALL_OFFSET = 18;
export const SINK_HP = 1;
export const SINK_SHARD_COUNT = 5;

export const FURNITURE_VERTEX = `
attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aTextureCoord;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;
varying float vDepth;
varying vec2 vTextureCoord;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main(void) {
  vec4 world = uModelMatrix * vec4(aVertexPosition, 1.0);
  vec4 v = uViewMatrix * world;
  vDepth = -v.z;
  vTextureCoord = aTextureCoord;
  vWorldPos = world.xyz;
  vNormal = normalize(uNormalMatrix * aVertexNormal);
  gl_Position = uProjectionMatrix * v;
}
`;

export const FURNITURE_FRAGMENT = `
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
varying vec3 vWorldPos;
varying vec3 vNormal;

uniform int uNbLights;
uniform vec3 uAmbientLight;
uniform vec3 uLightPosition[8];
uniform vec3 uLightDiffuse[8];
uniform vec3 uLightAttenuation[8];

vec3 furnitureLight(vec3 worldPos, vec3 normal) {
  if (uNbLights <= 0)
    return vec3(1.0);
  float floorAo = 0.62 + 0.38 * smoothstep(0.0, 9.0, clamp(worldPos.y, 0.0, 9.0));
  float overhangAo = 0.68 + 0.32 * clamp(normal.y + 0.6, 0.0, 1.0);
  float ao = floorAo * overhangAo;
  float hemi = (0.72 + 0.22 * normal.y + 0.06 * abs(normal.x)) * ao;
  vec3 total = uAmbientLight * hemi;
  for (int i = 0; i < 8; i++) {
    if (i >= uNbLights)
      break;
    vec3 diff = uLightDiffuse[i];
    if (diff.x + diff.y + diff.z <= 0.001)
      continue;
    vec3 delta = uLightPosition[i] - worldPos;
    if (delta.x * delta.x + delta.z * delta.z > 160000.0)
      continue;
    float isCeilingFixture = step(54.0, uLightPosition[i].y);
    float onCeiling = step(58.0, worldPos.y) * isCeilingFixture;
    float verticalSpan = mix(delta.y, 62.0, onCeiling);
    vec3 lightVec = vec3(delta.x, verticalSpan, delta.z);
    float distSq = dot(lightVec, lightVec);
    if (distSq > 160000.0)
      continue;
    vec3 att = uLightAttenuation[i];
    if (att.z > 0.001 && distSq >= 18225.0)
      continue;
    float dist = sqrt(distSq);
    float shortRange = step(0.001, att.z);
    float rangeCutoff = mix(1.0, 1.0 - smoothstep(75.0, 135.0, dist), shortRange);
    float attenuation = rangeCutoff / max(att.x + att.y * dist + att.z * distSq, 0.0001);
    float downward = clamp((uLightPosition[i].y - worldPos.y) / max(dist, 1.0), 0.0, 1.0);
    float spread = mix(1.05, 0.5 + 0.75 * downward * downward, isCeilingFixture);
    vec3 lightDir = delta / max(length(delta), 0.001);
    float ndotl = clamp(dot(normal, lightDir), 0.0, 1.0);
    float facing = (0.24 + 0.76 * ndotl) * ao;
    total += diff * (attenuation * spread * facing);
  }
  return min(total, vec3(2.5));
}

void main(void) {
  vec4 texel = texture2D(uSampler, vTextureCoord);
  if (texel.a < 0.5)
    discard;
  if (uHasFog == 1 && vDepth >= uFogFar) {
    gl_FragColor = vec4(uFogColor, 0.5);
    return;
  }
  vec3 n = normalize(vNormal);
  vec3 color = texel.rgb * uMaterialDiffuse * furnitureLight(vWorldPos, n);
  float pitDepthFade = smoothstep(-2.0, -48.0, vWorldPos.y);
  vec3 pitFogColor = uHasFog == 1 ? uFogColor * 0.42 : vec3(0.02, 0.03, 0.06);
  color = mix(color, pitFogColor, pitDepthFade);
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade);
  }
  gl_FragColor = vec4(color, 0.5);
}
`;

const ENAMEL_BASE = [30, 38, 52];
const ENAMEL_LIGHT = [52, 64, 84];
const ENAMEL_DARK = [14, 19, 28];
const KICKPLATE = [9, 12, 19];
const ALCOVE_DARK = [10, 14, 21];
const ALCOVE_STEEL = [22, 29, 42];
const COLD_BLUE = [22, 68, 114];
const COLD_LIGHT = [42, 98, 148];
const HOT_RED = [112, 32, 28];
const HOT_LIGHT = [148, 54, 46];
const LED_GREEN = [28, 108, 62];
const WATER_DEEP = [11, 28, 52];
const WATER_MID = [18, 48, 82];
const WATER_BRIGHT = [38, 82, 124];
const WATER_HEADSPACE = [26, 42, 62];
const MENISCUS = [56, 98, 134];

function drawFront(rnd) {
  const t = new Tile(FRONT.width, FRONT.height);
  plate(t, 0, 0, FRONT.width, FRONT.height, rnd, ENAMEL_BASE);

  // Dark rubberized base kickplate along the bottom (y = 56..63)
  t.rect(1, 56, 62, 7, KICKPLATE, 0.92);
  for (let x = 2; x < 62; x++)
    t.set(x, 56, ENAMEL_DARK, 0.85);

  // Top header bezel with status indicator LEDs (y = 4..10)
  t.rect(8, 4, 48, 7, ALCOVE_DARK, 0.9);
  for (let x = 8; x < 56; x++) {
    t.set(x, 4, SHADOW, 0.85);
    t.set(x, 10, ENAMEL_LIGHT, 0.55);
  }
  // Power (green), Cold (cyan), and Hot (red) status LEDs
  t.rect(13, 6, 3, 3, LED_GREEN, 0.95);
  t.rect(28, 6, 4, 3, COLD_BLUE, 0.95);
  t.set(29, 7, COLD_LIGHT, 0.95);
  t.rect(44, 6, 4, 3, HOT_RED, 0.95);
  t.set(45, 7, HOT_LIGHT, 0.95);

  // Recessed dispensing alcove backsplash (x = 10..53, y = 13..31)
  t.rect(10, 13, 44, 19, ALCOVE_DARK, 0.92);
  t.rect(12, 15, 40, 14, ALCOVE_STEEL, 0.65);
  for (let y = 15; y < 29; y++)
    for (let x = 12; x < 52; x++) {
      const sheen = Math.sin(((x - 12) / 40) * Trigo.pi) * 0.25;
      t.set(x, y, ENAMEL_LIGHT, sheen);
    }
  // Cold & Hot tap escutcheon badges inside the alcove
  t.rect(18, 16, 7, 5, COLD_BLUE, 0.92);
  t.rect(19, 17, 5, 3, COLD_LIGHT, 0.75);
  t.rect(39, 16, 7, 5, HOT_RED, 0.92);
  t.rect(40, 17, 5, 3, HOT_LIGHT, 0.75);

  // Slotted drip tray front lip (y = 29..32)
  t.rect(9, 29, 46, 4, ENAMEL_DARK, 0.9);
  for (let x = 11; x < 53; x += 3)
    t.set(x, 30, ENAMEL_LIGHT, 0.7);

  // Lower maintenance service door panel (x = 8..55, y = 35..54)
  for (let x = 8; x < 56; x++) {
    t.set(x, 35, ENAMEL_DARK, 0.85);
    t.set(x, 54, ENAMEL_LIGHT, 0.6);
  }
  for (let y = 35; y <= 54; y++) {
    t.set(8, y, ENAMEL_DARK, 0.85);
    t.set(55, y, ENAMEL_LIGHT, 0.6);
  }
  // Recessed pocket handle on the right side of the service door
  t.rect(46, 41, 4, 7, ALCOVE_DARK, 0.88);
  t.rect(47, 42, 2, 5, ENAMEL_DARK, 0.65);

  // Lower ventilation louvers on the service door
  for (let ly = 49; ly <= 52; ly += 2)
    for (let lx = 14; lx < 42; lx++) {
      t.set(lx, ly, ALCOVE_DARK, 0.85);
      t.set(lx, ly + 1, ENAMEL_LIGHT, 0.45);
    }

  for (const [rx, ry] of [[5, 5], [56, 5], [5, 51], [56, 51]])
    rivet(t, rx, ry);

  rust(t, rnd, 0.16);
  return t;
}

function drawSide(rnd) {
  const t = new Tile(SIDE.width, SIDE.height);
  plate(t, 0, 0, SIDE.width, SIDE.height, rnd, ENAMEL_BASE);

  // Dark rubberized base kickplate (y = 56..63)
  t.rect(1, 56, 62, 7, KICKPLATE, 0.92);
  for (let x = 2; x < 62; x++)
    t.set(x, 56, ENAMEL_DARK, 0.85);

  // Horizontal structural seam at mid-height (y = 28)
  for (let x = 3; x < 61; x++) {
    t.set(x, 28, SHADOW, 0.75);
    t.set(x, 29, ENAMEL_LIGHT, 0.55);
  }

  // Condenser heat-exchanger louver grille on the lower half (y = 34..51)
  for (let ly = 34; ly <= 50; ly += 3)
    for (let lx = 12; lx < 52; lx++) {
      t.set(lx, ly, ALCOVE_DARK, 0.88);
      t.set(lx, ly + 1, ENAMEL_DARK, 0.7);
      t.set(lx, ly + 2, ENAMEL_LIGHT, 0.45);
    }

  for (const [rx, ry] of [[5, 5], [56, 5], [5, 24], [56, 24], [5, 51], [56, 51]])
    rivet(t, rx, ry);

  rust(t, rnd, 0.18);
  return t;
}

function drawTrim(rnd) {
  const t = new Tile(TRIM.width, TRIM.height);
  plate(t, 0, 0, TRIM.width, TRIM.height, rnd, ENAMEL_BASE);

  // Left band (x = 0..19): Cold tap blue plastic & collar swatch
  t.rect(1, 1, 18, 62, COLD_BLUE, 0.92);
  for (let y = 2; y < 62; y++) {
    t.set(2, y, COLD_LIGHT, 0.75);
    t.set(18, y, WATER_DEEP, 0.75);
  }

  // Center band (x = 20..43): Slotted stainless-steel drip-tray grate & chrome spigots
  t.rect(20, 1, 24, 62, ENAMEL_LIGHT, 0.65);
  for (let y = 6; y < 58; y += 4)
    for (let x = 23; x < 41; x++) {
      t.set(x, y, ALCOVE_DARK, 0.9);
      t.set(x, y + 1, ALCOVE_STEEL, 0.8);
      t.set(x, y + 2, ENAMEL_LIGHT, 0.75);
    }

  // Right band (x = 44..63): Hot tap safety red plastic swatch
  t.rect(44, 1, 19, 62, HOT_RED, 0.92);
  for (let y = 2; y < 62; y++) {
    t.set(45, y, HOT_LIGHT, 0.75);
    t.set(61, y, SHADOW, 0.7);
  }

  return t;
}

function drawBottle(rnd) {
  const t = new Tile(BOTTLE.width, BOTTLE.height);
  const ripple = field(rnd, 6);
  const bubble = field(rnd, 3);

  for (let y = 0; y < BOTTLE.height; y++)
    for (let x = 0; x < BOTTLE.width; x++) {
      const u = x / BOTTLE.width;
      const v = y / BOTTLE.height;
      const n = ripple(x, y);
      // Subtle polycarbonate sheen; directional lighting comes from 3D surface normals in FURNITURE_FRAGMENT
      const fresnel = Math.pow(Math.max(0, Math.sin(u * Trigo.twopi * 2 + 0.4)), 4) * 0.22;

      let base;
      if (y < 13) {
        // Frosted air headspace at the top of the inverted bottle
        base = mix(WATER_HEADSPACE, MENISCUS, fresnel * 0.55 + n * 0.16);
      } else if (y <= 15) {
        // Water meniscus surface line
        base = mix(WATER_BRIGHT, MENISCUS, 0.55);
      } else {
        // Deep purified cyan-cobalt water body
        const depth = (v - 0.24) / 0.76;
        const water = mix(WATER_MID, WATER_DEEP, depth * 0.72 + (n - 0.5) * 0.18);
        base = mix(water, WATER_BRIGHT, fresnel);
        // Rising tiny air bubbles inside the water column
        if (bubble(x * 1.3, y * 1.1) > 0.79 && y > 18 && y < 58)
          base = mix(base, MENISCUS, 0.52);
      }

      // Molded horizontal polycarbonate stiffening ribs (y = 24..26, 38..40, 50..52)
      if (y === 24 || y === 38 || y === 50)
        base = mix(base, MENISCUS, 0.42);
      else if (y === 26 || y === 40 || y === 52)
        base = mix(base, WATER_DEEP, 0.55);

      t.set(x, y, base, 1);
    }

  return t;
}

/**
 * Returns the power-of-two RGBA texture atlas (256 x 64) for the 3D Water Dispenser furniture prop.
 */
export function dispenserAtlas() {
  const { width, height } = DISPENSER_ATLAS;
  const data = new Uint8Array(width * height * 4);
  const blit = (tile, x0) => {
    for (let y = 0; y < tile.height; y++)
      for (let x = 0; x < tile.width; x++) {
        const i = (y * tile.width + x) * 3;
        const o = (y * width + x0 + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  };
  blit(drawFront(mulberry32(8101)), FRONT.x);
  blit(drawSide(mulberry32(8102)), SIDE.x);
  blit(drawTrim(mulberry32(8103)), TRIM.x);
  blit(drawBottle(mulberry32(8104)), BOTTLE.x);
  return {
    name: 'dispenser',
    data,
    width,
    height,
    front: FRONT,
    side: SIDE,
    trim: TRIM,
    bottle: BOTTLE,
  };
}

function pushTri(vertices, normals, uvs, p0, p1, p2, uv0, uv1, uv2) {
  scratchEdgeA.setScalar(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
  scratchEdgeB.setScalar(p2.x - p0.x, p2.y - p0.y, p2.z - p0.z);
  scratchNormal.crossVectors(scratchEdgeA, scratchEdgeB);
  if (scratchNormal.getMagnitude(true) > 0)
    scratchNormal.normalize();
  else
    scratchNormal.setScalar(0, 1, 0);
  const nx = scratchNormal.x;
  const ny = scratchNormal.y;
  const nz = scratchNormal.z;
  vertices.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
  normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  uvs.push(uv0.x, uv0.y, uv1.x, uv1.y, uv2.x, uv2.y);
}

function pushQuad(vertices, normals, uvs, c0, c1, c2, c3, u0, v0, u1, v1) {
  scratchUvA.setScalar(u0, v1);
  scratchUvB.setScalar(u1, v1);
  scratchUvC.setScalar(u1, v0);
  scratchUvD.setScalar(u0, v0);
  pushTri(vertices, normals, uvs, c0, c1, c2, scratchUvA, scratchUvB, scratchUvC);
  pushTri(vertices, normals, uvs, c0, c2, c3, scratchUvA, scratchUvC, scratchUvD);
}

function pushBoxPart(vertices, normals, uvs, minPt, maxPt, faceUvs) {
  const x0 = minPt.x;
  const y0 = minPt.y;
  const z0 = minPt.z;
  const x1 = maxPt.x;
  const y1 = maxPt.y;
  const z1 = maxPt.z;

  const p001 = new Vec3(x0, y0, z1);
  const p101 = new Vec3(x1, y0, z1);
  const p111 = new Vec3(x1, y1, z1);
  const p011 = new Vec3(x0, y1, z1);
  const p000 = new Vec3(x0, y0, z0);
  const p100 = new Vec3(x1, y0, z0);
  const p110 = new Vec3(x1, y1, z0);
  const p010 = new Vec3(x0, y1, z0);

  if (faceUvs.front)
    pushQuad(vertices, normals, uvs, p001, p101, p111, p011, faceUvs.front.u0, faceUvs.front.v0, faceUvs.front.u1, faceUvs.front.v1);
  if (faceUvs.back)
    pushQuad(vertices, normals, uvs, p100, p000, p010, p110, faceUvs.back.u0, faceUvs.back.v0, faceUvs.back.u1, faceUvs.back.v1);
  if (faceUvs.right)
    pushQuad(vertices, normals, uvs, p101, p100, p110, p111, faceUvs.right.u0, faceUvs.right.v0, faceUvs.right.u1, faceUvs.right.v1);
  if (faceUvs.left)
    pushQuad(vertices, normals, uvs, p000, p001, p011, p010, faceUvs.left.u0, faceUvs.left.v0, faceUvs.left.u1, faceUvs.left.v1);
  if (faceUvs.top)
    pushQuad(vertices, normals, uvs, p011, p111, p110, p010, faceUvs.top.u0, faceUvs.top.v0, faceUvs.top.u1, faceUvs.top.v1);
  if (faceUvs.bottom)
    pushQuad(vertices, normals, uvs, p000, p100, p101, p001, faceUvs.bottom.u0, faceUvs.bottom.v0, faceUvs.bottom.u1, faceUvs.bottom.v1);
}

function pushFrustumRing(vertices, normals, uvs, y0, y1, r0, r1, uStart, uEnd, v0, v1, segs = 12) {
  for (let i = 0; i < segs; i++) {
    const f0 = i / segs;
    const f1 = (i + 1) / segs;
    const a0 = f0 * Trigo.twopi;
    const a1 = f1 * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const b0 = new Vec3(c0 * r0, y0, s0 * r0);
    const b1 = new Vec3(c1 * r0, y0, s1 * r0);
    const t1 = new Vec3(c1 * r1, y1, s1 * r1);
    const t0 = new Vec3(c0 * r1, y1, s0 * r1);
    const u0 = Utils.lerp(uStart, uEnd, f0);
    const u1 = Utils.lerp(uStart, uEnd, f1);
    pushQuad(vertices, normals, uvs, b1, b0, t0, t1, u0, v0, u1, v1);
  }
}

function pushTopDisc(vertices, normals, uvs, y, r, uCenter, vCenter, uRadius, vRadius, segs = 12) {
  const center = new Vec3(0, y, 0);
  const uvCenter = new Vec2(uCenter, vCenter);
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Trigo.twopi;
    const a1 = ((i + 1) / segs) * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const p0 = new Vec3(c0 * r, y, s0 * r);
    const p1 = new Vec3(c1 * r, y, s1 * r);
    const uv0 = new Vec2(uCenter + c0 * uRadius, vCenter + s0 * vRadius);
    const uv1 = new Vec2(uCenter + c1 * uRadius, vCenter + s1 * vRadius);
    pushTri(vertices, normals, uvs, center, p1, p0, uvCenter, uv1, uv0);
  }
}

/**
 * Builds the 3D Water Dispenser mesh standing on `y = 0`, centered on `x/z`, with the dispensing bay facing `+Z`.
 */
export function dispenserMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = DISPENSER_ATLAS.width;
  const inset = 0.35 / W;
  const frontU0 = FRONT.x / W + inset;
  const frontU1 = (FRONT.x + FRONT.width) / W - inset;
  const sideU0 = SIDE.x / W + inset;
  const sideU1 = (SIDE.x + SIDE.width) / W - inset;
  const trimBlueU0 = TRIM.x / W + inset;
  const trimBlueU1 = (TRIM.x + 18) / W - inset;
  const trimGrateU0 = (TRIM.x + 21) / W;
  const trimGrateU1 = (TRIM.x + 42) / W;
  const trimRedU0 = (TRIM.x + 45) / W + inset;
  const trimRedU1 = (TRIM.x + TRIM.width) / W - inset;
  const bottleU0 = BOTTLE.x / W + inset;
  const bottleU1 = (BOTTLE.x + BOTTLE.width) / W - inset;

  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  // 1. Base kickplate (y = 0 .. 2.4)
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(-6.7, 0, -6.7),
    new Vec3(6.7, 2.4, 6.7),
    {
      front: uvRect(frontU0, 0.88, frontU1, 0.99),
      back: uvRect(sideU0, 0.88, sideU1, 0.99),
      left: uvRect(sideU0, 0.88, sideU1, 0.99),
      right: uvRect(sideU0, 0.88, sideU1, 0.99),
      bottom: uvRect(sideU0, 0.88, sideU1, 0.99),
    },
  );

  // 2. Lower cabinet service housing (y = 2.4 .. 13.8)
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(-7.0, 2.4, -7.0),
    new Vec3(7.0, 13.8, 7.0),
    {
      front: uvRect(frontU0, 0.52, frontU1, 0.88),
      back: uvRect(sideU0, 0.48, sideU1, 0.88),
      left: uvRect(sideU0, 0.48, sideU1, 0.88),
      right: uvRect(sideU0, 0.48, sideU1, 0.88),
      top: uvRect(sideU0, 0.04, sideU1, 0.24),
    },
  );

  // 3. Recessed dispensing bay side pillars & rear upper housing (y = 13.8 .. 23.2)
  // Left pillar (x = -7.0 .. -4.6)
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(-7.0, 13.8, -7.0),
    new Vec3(-4.6, 23.2, 7.0),
    {
      front: uvRect(frontU0, 0.2, frontU0 + (frontU1 - frontU0) * 0.16, 0.52),
      back: uvRect(sideU0, 0.18, sideU0 + (sideU1 - sideU0) * 0.18, 0.48),
      left: uvRect(sideU0, 0.18, sideU1, 0.48),
      right: uvRect(frontU0 + (frontU1 - frontU0) * 0.2, 0.24, frontU0 + (frontU1 - frontU0) * 0.35, 0.46),
    },
  );
  // Right pillar (x = 4.6 .. 7.0)
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(4.6, 13.8, -7.0),
    new Vec3(7.0, 23.2, 7.0),
    {
      front: uvRect(frontU1 - (frontU1 - frontU0) * 0.16, 0.2, frontU1, 0.52),
      back: uvRect(sideU1 - (sideU1 - sideU0) * 0.18, 0.18, sideU1, 0.48),
      right: uvRect(sideU0, 0.18, sideU1, 0.48),
      left: uvRect(frontU0 + (frontU1 - frontU0) * 0.65, 0.24, frontU0 + (frontU1 - frontU0) * 0.8, 0.46),
    },
  );
  // Center rear block behind the recessed dispensing bay (x = -4.6 .. 4.6, z = -7.0 .. 4.2)
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(-4.6, 13.8, -7.0),
    new Vec3(4.6, 23.2, 4.2),
    {
      front: uvRect(frontU0 + (frontU1 - frontU0) * 0.16, 0.22, frontU1 - (frontU1 - frontU0) * 0.16, 0.46),
      back: uvRect(sideU0 + (sideU1 - sideU0) * 0.18, 0.18, sideU1 - (sideU1 - sideU0) * 0.18, 0.48),
    },
  );

  // 4. Projecting Drip Tray & Slotted Stainless-Steel Grate (y = 12.6 .. 14.0, z = 4.2 .. 7.9)
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(-4.8, 12.6, 4.2),
    new Vec3(4.8, 14.0, 7.9),
    {
      front: uvRect(frontU0 + (frontU1 - frontU0) * 0.15, 0.45, frontU1 - (frontU1 - frontU0) * 0.15, 0.51),
      left: uvRect(sideU0, 0.88, sideU0 + (sideU1 - sideU0) * 0.25, 0.96),
      right: uvRect(sideU0, 0.88, sideU0 + (sideU1 - sideU0) * 0.25, 0.96),
      top: uvRect(trimGrateU0, 0.1, trimGrateU1, 0.9),
      bottom: uvRect(sideU0, 0.88, sideU1, 0.98),
    },
  );

  // 5. Dual 3D Water Spigots & Push Paddles inside the recessed alcove
  // Left Cold Water Spigot (blue paddle + chrome spout)
  const coldSpigotFaces = {
    front: uvRect(trimBlueU0, 0.15, trimBlueU1, 0.85),
    left: uvRect(trimBlueU0, 0.15, trimBlueU1, 0.85),
    right: uvRect(trimBlueU0, 0.15, trimBlueU1, 0.85),
    top: uvRect(trimBlueU0, 0.15, trimBlueU1, 0.85),
    bottom: uvRect(trimGrateU0, 0.2, trimGrateU1, 0.5),
  };
  pushBoxPart(vertices, normals, uvs, new Vec3(-2.8, 20.0, 4.2), new Vec3(-1.2, 21.8, 6.2), coldSpigotFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(-2.4, 18.2, 5.1), new Vec3(-1.6, 20.0, 5.9), coldSpigotFaces);

  // Right Hot Water Spigot (red safety paddle + chrome spout)
  const hotSpigotFaces = {
    front: uvRect(trimRedU0, 0.15, trimRedU1, 0.85),
    left: uvRect(trimRedU0, 0.15, trimRedU1, 0.85),
    right: uvRect(trimRedU0, 0.15, trimRedU1, 0.85),
    top: uvRect(trimRedU0, 0.15, trimRedU1, 0.85),
    bottom: uvRect(trimGrateU0, 0.2, trimGrateU1, 0.5),
  };
  pushBoxPart(vertices, normals, uvs, new Vec3(1.2, 20.0, 4.2), new Vec3(2.8, 21.8, 6.2), hotSpigotFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(1.6, 18.2, 5.1), new Vec3(2.4, 20.0, 5.9), hotSpigotFaces);

  // 6. Upper Cabinet Header & Status Bezel (y = 23.2 .. 26.5)
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(-7.0, 23.2, -7.0),
    new Vec3(7.0, 26.5, 7.0),
    {
      front: uvRect(frontU0, 0.02, frontU1, 0.2),
      back: uvRect(sideU0, 0.02, sideU1, 0.18),
      left: uvRect(sideU0, 0.02, sideU1, 0.18),
      right: uvRect(sideU0, 0.02, sideU1, 0.18),
      top: uvRect(sideU0, 0.04, sideU1, 0.44),
      bottom: uvRect(frontU0 + (frontU1 - frontU0) * 0.2, 0.22, frontU1 - (frontU1 - frontU0) * 0.2, 0.3),
    },
  );

  // 7. Side-Mounted Paper Cup Dispenser Tube on the right side (x = 7.0 .. 8.5, y = 14.8 .. 24.8, z = 1.6 .. 4.2)
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(7.0, 14.8, 1.6),
    new Vec3(8.5, 24.8, 4.2),
    {
      front: uvRect(sideU0 + (sideU1 - sideU0) * 0.1, 0.08, sideU0 + (sideU1 - sideU0) * 0.3, 0.44),
      back: uvRect(sideU0 + (sideU1 - sideU0) * 0.1, 0.08, sideU0 + (sideU1 - sideU0) * 0.3, 0.44),
      right: uvRect(trimBlueU0, 0.1, trimBlueU1, 0.9),
      top: uvRect(trimBlueU0, 0.1, trimBlueU1, 0.4),
      bottom: uvRect(trimGrateU0, 0.2, trimGrateU1, 0.5),
    },
  );

  // 8. Top Funnel Receiver Collar Ring (y = 26.5 .. 28.2, 12-sided frustum)
  pushFrustumRing(vertices, normals, uvs, 26.5, 28.2, 5.1, 3.3, trimBlueU0, trimBlueU1, 0.15, 0.85, 12);
  pushTopDisc(vertices, normals, uvs, 28.2, 3.3, (trimBlueU0 + trimBlueU1) * 0.5, 0.5, (trimBlueU1 - trimBlueU0) * 0.4, 0.3, 12);

  // 9. Inverted 5-Gallon Polycarbonate Water Bottle / Carboy (y = 28.2 .. 42.0, 12-sided lathe profile)
  const bottleProfile = [
    { y0: 28.2, y1: 29.8, r0: 2.1, r1: 2.4, v0: 0.88, v1: 0.98 },
    { y0: 29.8, y1: 32.0, r0: 2.4, r1: 5.5, v0: 0.72, v1: 0.88 },
    { y0: 32.0, y1: 34.5, r0: 5.5, r1: 5.5, v0: 0.56, v1: 0.72 },
    { y0: 34.5, y1: 35.4, r0: 5.5, r1: 5.8, v0: 0.5, v1: 0.56 },
    { y0: 35.4, y1: 37.6, r0: 5.8, r1: 5.5, v0: 0.36, v1: 0.5 },
    { y0: 37.6, y1: 38.5, r0: 5.5, r1: 5.8, v0: 0.3, v1: 0.36 },
    { y0: 38.5, y1: 40.8, r0: 5.8, r1: 5.3, v0: 0.12, v1: 0.3 },
    { y0: 40.8, y1: 42.0, r0: 5.3, r1: 3.8, v0: 0.02, v1: 0.12 },
  ];
  for (let i = 0; i < bottleProfile.length; i++) {
    const seg = bottleProfile[i];
    pushFrustumRing(vertices, normals, uvs, seg.y0, seg.y1, seg.r0, seg.r1, bottleU0, bottleU1, seg.v0, seg.v1, 12);
  }
  const bottleUC = (bottleU0 + bottleU1) * 0.5;
  pushTopDisc(vertices, normals, uvs, 42.0, 3.8, bottleUC, 0.08, (bottleU1 - bottleU0) * 0.35, 0.06, 12);

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D smashed lower cooler cabinet wreck left standing when a Water Dispenser is destroyed:
 * rubberized kickplate, dented lower service housing, dark torn interior chiller basin, buckled side & rear
 * sheet-metal pillars flaring outward, askew drip tray, and shattered blue polycarbonate bottle neck remnants.
 */
export function dispenserWreckMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = DISPENSER_ATLAS.width;
  const inset = 0.35 / W;
  const frontU0 = FRONT.x / W + inset;
  const frontU1 = (FRONT.x + FRONT.width) / W - inset;
  const sideU0 = SIDE.x / W + inset;
  const sideU1 = (SIDE.x + SIDE.width) / W - inset;
  const trimBlueU0 = TRIM.x / W + inset;
  const trimBlueU1 = (TRIM.x + 18) / W - inset;
  const trimGrateU0 = (TRIM.x + 21) / W;
  const trimGrateU1 = (TRIM.x + 42) / W;
  const bottleU0 = BOTTLE.x / W + inset;
  const bottleU1 = (BOTTLE.x + BOTTLE.width) / W - inset;

  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  // 1. Base kickplate (y = 0 .. 2.4)
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(-6.7, 0, -6.7),
    new Vec3(6.7, 2.4, 6.7),
    {
      front: uvRect(frontU0, 0.88, frontU1, 0.99),
      back: uvRect(sideU0, 0.88, sideU1, 0.99),
      left: uvRect(sideU0, 0.88, sideU1, 0.99),
      right: uvRect(sideU0, 0.88, sideU1, 0.99),
      bottom: uvRect(sideU0, 0.88, sideU1, 0.99),
    },
  );

  // 2. Lower cabinet stump (y = 2.4 .. 13.8) with dark ruptured top chiller deck
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(-7.0, 2.4, -7.0),
    new Vec3(7.0, 13.8, 7.0),
    {
      front: uvRect(frontU0, 0.52, frontU1, 0.88),
      back: uvRect(sideU0, 0.48, sideU1, 0.88),
      left: uvRect(sideU0, 0.48, sideU1, 0.88),
      right: uvRect(sideU0, 0.48, sideU1, 0.88),
      top: uvRect(frontU0 + (frontU1 - frontU0) * 0.18, 0.21, frontU1 - (frontU1 - frontU0) * 0.18, 0.34),
    },
  );

  // 3. Exposed internal cold-water chiller reservoir ring in the center of the ruptured deck (y = 13.8 .. 15.2)
  pushFrustumRing(vertices, normals, uvs, 13.8, 15.2, 3.8, 3.4, bottleU0, bottleU1, 0.62, 0.88, 10);
  pushTopDisc(vertices, normals, uvs, 14.9, 3.3, (bottleU0 + bottleU1) * 0.5, 0.72, (bottleU1 - bottleU0) * 0.32, 0.18, 10);

  // 4. Jagged shattered polycarbonate bottle neck shards still wedged around the chiller rim
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Trigo.twopi + 0.18;
    const a1 = a0 + 0.58;
    const aM = (a0 + a1) * 0.5;
    const r = 3.35;
    const tipR = 3.7 + (i % 2) * 0.45;
    const tipY = 16.4 + (i % 3) * 0.85;
    const b0 = new Vec3(Math.cos(a0) * r, 14.8, Math.sin(a0) * r);
    const b1 = new Vec3(Math.cos(a1) * r, 14.8, Math.sin(a1) * r);
    const tip = new Vec3(Math.cos(aM) * tipR, tipY, Math.sin(aM) * tipR);
    const u0 = Utils.lerp(bottleU0, bottleU1, i / 6);
    const u1 = Utils.lerp(bottleU0, bottleU1, (i + 0.6) / 6);
    const uv0 = new Vec2(u0, 0.82);
    const uv1 = new Vec2(u1, 0.82);
    const uvTip = new Vec2((u0 + u1) * 0.5, 0.48);
    pushTri(vertices, normals, uvs, b1, b0, tip, uv1, uv0, uvTip);
    pushTri(vertices, normals, uvs, b0, b1, tip, uv0, uv1, uvTip);
  }

  // 5. Buckled, torn sheet-metal side & rear casing walls flaring outward around the smashed alcove (y = 13.8 .. 18.6)
  // Left torn pillar stub
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(-7.2, 13.8, -7.0),
    new Vec3(-4.9, 17.6, 6.2),
    {
      front: uvRect(frontU0, 0.34, frontU0 + (frontU1 - frontU0) * 0.16, 0.52),
      back: uvRect(sideU0, 0.32, sideU0 + (sideU1 - sideU0) * 0.18, 0.48),
      left: uvRect(sideU0, 0.32, sideU1, 0.48),
      right: uvRect(frontU0 + (frontU1 - frontU0) * 0.2, 0.32, frontU0 + (frontU1 - frontU0) * 0.35, 0.46),
      top: uvRect(sideU0, 0.88, sideU1, 0.96),
    },
  );
  // Right torn pillar stub
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(4.9, 13.8, -7.0),
    new Vec3(7.2, 16.9, 5.8),
    {
      front: uvRect(frontU1 - (frontU1 - frontU0) * 0.16, 0.36, frontU1, 0.52),
      back: uvRect(sideU1 - (sideU1 - sideU0) * 0.18, 0.34, sideU1, 0.48),
      right: uvRect(sideU0, 0.34, sideU1, 0.48),
      left: uvRect(frontU0 + (frontU1 - frontU0) * 0.65, 0.34, frontU0 + (frontU1 - frontU0) * 0.8, 0.46),
      top: uvRect(sideU0, 0.88, sideU1, 0.96),
    },
  );
  // Rear torn backsplash wall
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(-5.0, 13.8, -7.0),
    new Vec3(5.0, 18.4, -3.8),
    {
      front: uvRect(frontU0 + (frontU1 - frontU0) * 0.16, 0.28, frontU1 - (frontU1 - frontU0) * 0.16, 0.46),
      back: uvRect(sideU0 + (sideU1 - sideU0) * 0.18, 0.26, sideU1 - (sideU1 - sideU0) * 0.18, 0.48),
      top: uvRect(sideU0, 0.88, sideU1, 0.96),
    },
  );

  // Jagged outward-bent sheet-metal petals along the left, right, and back rims
  const flapDefs = [
    { b0: new Vec3(-7.0, 17.5, -5.8), b1: new Vec3(-7.0, 17.5, 4.8), tip: new Vec3(-8.8, 20.4, -0.4), u0: sideU0, u1: sideU1 },
    { b0: new Vec3(7.0, 16.8, 4.4), b1: new Vec3(7.0, 16.8, -5.6), tip: new Vec3(8.9, 19.8, -0.8), u0: sideU0, u1: sideU1 },
    { b0: new Vec3(4.8, 18.3, -6.9), b1: new Vec3(-4.8, 18.3, -6.9), tip: new Vec3(0.3, 21.2, -8.5), u0: sideU0, u1: sideU1 },
  ];
  for (let i = 0; i < flapDefs.length; i++) {
    const f = flapDefs[i];
    const uv0 = new Vec2(f.u0, 0.36);
    const uv1 = new Vec2(f.u1, 0.36);
    const uvTip = new Vec2((f.u0 + f.u1) * 0.5, 0.18);
    pushTri(vertices, normals, uvs, f.b0, f.b1, f.tip, uv0, uv1, uvTip);
    pushTri(vertices, normals, uvs, f.b1, f.b0, f.tip, uv1, uv0, uvTip);
  }

  // 6. Askew, hanging front drip tray & one surviving bent cold-water spigot stub
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(-4.6, 11.9, 4.2),
    new Vec3(4.4, 13.3, 7.6),
    {
      front: uvRect(frontU0 + (frontU1 - frontU0) * 0.15, 0.45, frontU1 - (frontU1 - frontU0) * 0.15, 0.51),
      left: uvRect(sideU0, 0.88, sideU0 + (sideU1 - sideU0) * 0.25, 0.96),
      right: uvRect(sideU0, 0.88, sideU0 + (sideU1 - sideU0) * 0.25, 0.96),
      top: uvRect(trimGrateU0, 0.1, trimGrateU1, 0.9),
      bottom: uvRect(sideU0, 0.88, sideU1, 0.98),
    },
  );
  pushBoxPart(
    vertices,
    normals,
    uvs,
    new Vec3(-2.6, 15.2, 3.6),
    new Vec3(-1.3, 16.8, 5.2),
    {
      front: uvRect(trimBlueU0, 0.15, trimBlueU1, 0.85),
      left: uvRect(trimBlueU0, 0.15, trimBlueU1, 0.85),
      right: uvRect(trimBlueU0, 0.15, trimBlueU1, 0.85),
      top: uvRect(trimBlueU0, 0.15, trimBlueU1, 0.85),
    },
  );

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D spilled water puddle mesh on the floor (`y = 0.12`) around a destroyed Water Dispenser:
 * an irregular 12-sided primary pool + secondary forward splash lobe textured with purified cyan-cobalt water.
 */
export function dispenserPuddleMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = DISPENSER_ATLAS.width;
  const bottleU0 = BOTTLE.x / W + 0.004;
  const bottleU1 = (BOTTLE.x + BOTTLE.width) / W - 0.004;
  const bottleUC = (bottleU0 + bottleU1) * 0.5;
  const bottleUSpan = (bottleU1 - bottleU0) * 0.42;

  // Primary spilled water pool around the front & sides of the dispenser base (centered slightly forward at z = +4.5)
  const radii = [16.5, 19.2, 22.4, 24.0, 21.5, 18.0, 14.2, 12.6, 13.8, 17.4, 21.0, 18.8];
  const segs = radii.length;
  const center = new Vec3(0.6, 0.12, 4.5);
  const uvCenter = new Vec2(bottleUC, 0.62);
  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % segs;
    const a0 = (i / segs) * Trigo.twopi;
    const a1 = (next / segs) * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const r0 = radii[i];
    const r1 = radii[next];
    const p0 = new Vec3(center.x + c0 * r0, 0.12, center.z + s0 * r0);
    const p1 = new Vec3(center.x + c1 * r1, 0.12, center.z + s1 * r1);
    const uv0 = new Vec2(bottleUC + c0 * bottleUSpan, 0.62 + s0 * 0.28);
    const uv1 = new Vec2(bottleUC + c1 * bottleUSpan, 0.62 + s1 * 0.28);
    pushTri(vertices, normals, uvs, center, p1, p0, uvCenter, uv1, uv0);
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D shrapnel pieces blasted off a destroyed Water Dispenser:
 * - `carboyTop`: shattered upper polycarbonate dome & ribbed collar of the 5-gallon water bottle.
 * - `shards`: `DISPENSER_SHARD_COUNT` flying fragments (3 curved cyan polycarbonate bottle shards, 1 blown-off
 *   front status header panel, and 1 torn side cup-holder / service panel).
 */
export function dispenserShrapnelParts() {
  const W = DISPENSER_ATLAS.width;
  const inset = 0.35 / W;
  const frontU0 = FRONT.x / W + inset;
  const frontU1 = (FRONT.x + FRONT.width) / W - inset;
  const sideU0 = SIDE.x / W + inset;
  const sideU1 = (SIDE.x + SIDE.width) / W - inset;
  const trimBlueU0 = TRIM.x / W + inset;
  const trimBlueU1 = (TRIM.x + 18) / W - inset;
  const bottleU0 = BOTTLE.x / W + inset;
  const bottleU1 = (BOTTLE.x + BOTTLE.width) / W - inset;
  const bottleUC = (bottleU0 + bottleU1) * 0.5;

  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  // 1. Shattered upper 5-gallon polycarbonate carboy crown (local origin at its center so it tumbles naturally)
  const topVerts = [];
  const topNorms = [];
  const topUvs = [];
  pushFrustumRing(topVerts, topNorms, topUvs, -3.2, -0.8, 5.6, 5.8, bottleU0, bottleU1, 0.3, 0.5, 10);
  pushFrustumRing(topVerts, topNorms, topUvs, -0.8, 1.8, 5.8, 5.2, bottleU0, bottleU1, 0.12, 0.3, 10);
  pushFrustumRing(topVerts, topNorms, topUvs, 1.8, 3.2, 5.2, 3.7, bottleU0, bottleU1, 0.02, 0.12, 10);
  pushTopDisc(topVerts, topNorms, topUvs, 3.2, 3.7, bottleUC, 0.08, (bottleU1 - bottleU0) * 0.35, 0.06, 10);

  // 2. Five flying shards (3 curved blue polycarbonate carboy shards + 1 front bezel panel + 1 cup-holder tube)
  const shards = [];
  const arcSpan = (Trigo.twopi / 3) * 0.62;
  for (let s = 0; s < 3; s++) {
    const sVerts = [];
    const sNorms = [];
    const sUvs = [];
    const subSegs = 3;
    const R = 5.5;
    const halfH = 4.2 + (s % 2) * 0.8;
    const uBase = s / 3;
    const uSpan = 0.65 / 3;
    for (let j = 0; j < subSegs; j++) {
      const f0 = j / subSegs - 0.5;
      const f1 = (j + 1) / subSegs - 0.5;
      const a0 = f0 * arcSpan;
      const a1 = f1 * arcSpan;
      const x0 = Math.sin(a0) * R;
      const z0 = (Math.cos(a0) - 0.9) * R;
      const x1 = Math.sin(a1) * R;
      const z1 = (Math.cos(a1) - 0.9) * R;
      const jagTop0 = halfH * (0.78 + ((s + j) % 2) * 0.34);
      const jagTop1 = halfH * (0.78 + ((s + j + 1) % 2) * 0.34);
      const jagBot0 = -halfH * (0.74 + ((s + j + 1) % 2) * 0.3);
      const jagBot1 = -halfH * (0.74 + ((s + j) % 2) * 0.3);

      const b0 = new Vec3(x0, jagBot0, z0);
      const b1 = new Vec3(x1, jagBot1, z1);
      const t0 = new Vec3(x0 * 1.05, jagTop0, z0 + 0.35);
      const t1 = new Vec3(x1 * 1.05, jagTop1, z1 + 0.35);
      const bu0 = Utils.lerp(bottleU0, bottleU1, uBase + (j / subSegs) * uSpan);
      const bu1 = Utils.lerp(bottleU0, bottleU1, uBase + ((j + 1) / subSegs) * uSpan);
      pushQuad(sVerts, sNorms, sUvs, b0, b1, t1, t0, bu0, 0.28, bu1, 0.78);
      pushQuad(sVerts, sNorms, sUvs, b1, b0, t0, t1, bu0, 0.28, bu1, 0.78);
    }
    shards.push({
      vertices: new Float32Array(sVerts),
      normals: new Float32Array(sNorms),
      uvs: new Float32Array(sUvs),
    });
  }

  // Shard 3: Blown-off front header bezel panel with LEDs
  const bezelVerts = [];
  const bezelNorms = [];
  const bezelUvs = [];
  pushBoxPart(
    bezelVerts,
    bezelNorms,
    bezelUvs,
    new Vec3(-5.8, -1.6, -0.7),
    new Vec3(5.8, 1.6, 0.7),
    {
      front: uvRect(frontU0, 0.02, frontU1, 0.2),
      back: uvRect(sideU0, 0.88, sideU1, 0.96),
      left: uvRect(sideU0, 0.02, sideU0 + (sideU1 - sideU0) * 0.15, 0.18),
      right: uvRect(sideU0, 0.02, sideU0 + (sideU1 - sideU0) * 0.15, 0.18),
      top: uvRect(sideU0, 0.04, sideU1, 0.2),
      bottom: uvRect(sideU0, 0.88, sideU1, 0.96),
    },
  );
  shards.push({
    vertices: new Float32Array(bezelVerts),
    normals: new Float32Array(bezelNorms),
    uvs: new Float32Array(bezelUvs),
  });

  // Shard 4: Torn side cup-dispenser tube & bracket
  const tubeVerts = [];
  const tubeNorms = [];
  const tubeUvs = [];
  pushBoxPart(
    tubeVerts,
    tubeNorms,
    tubeUvs,
    new Vec3(-1.1, -4.5, -1.3),
    new Vec3(1.1, 4.5, 1.3),
    {
      front: uvRect(sideU0 + (sideU1 - sideU0) * 0.1, 0.08, sideU0 + (sideU1 - sideU0) * 0.3, 0.44),
      back: uvRect(sideU0 + (sideU1 - sideU0) * 0.1, 0.08, sideU0 + (sideU1 - sideU0) * 0.3, 0.44),
      left: uvRect(trimBlueU0, 0.1, trimBlueU1, 0.9),
      right: uvRect(trimBlueU0, 0.1, trimBlueU1, 0.9),
      top: uvRect(trimBlueU0, 0.1, trimBlueU1, 0.4),
      bottom: uvRect(trimBlueU0, 0.1, trimBlueU1, 0.4),
    },
  );
  shards.push({
    vertices: new Float32Array(tubeVerts),
    normals: new Float32Array(tubeNorms),
    uvs: new Float32Array(tubeUvs),
  });

  return {
    carboyTop: {
      vertices: new Float32Array(topVerts),
      normals: new Float32Array(topNorms),
      uvs: new Float32Array(topUvs),
    },
    shards,
  };
}

/** Pre-allocates a reusable pose structure for `dispenserBreakPose`. */
export function createDispenserBreakPose() {
  const shards = [];
  for (let i = 0; i < DISPENSER_SHARD_COUNT; i++)
    shards.push({ pos: new Vec3(), rot: new Vec3() });
  return {
    wreckScale: new Vec3(1, 1, 1),
    wreckRot: new Vec3(0, 0, 0),
    puddleScale: new Vec3(1, 1, 1),
    carboyTop: { pos: new Vec3(), rot: new Vec3() },
    shards,
  };
}

function writeBallisticArc(posTarget, rotTarget, startX, startY, startZ, endX, endY, endZ, spinX, spinY, spinZ, restPitch, restYaw, restRoll, t, peakLift) {
  const clamped = Utils.clamp(t, 0, 1);
  const out = 1 - (1 - clamped) * (1 - clamped);
  const x = Utils.lerp(startX, endX, out);
  const z = Utils.lerp(startZ, endZ, out);
  let y;
  if (clamped < 0.6) {
    const u = clamped / 0.6;
    y = Utils.lerp(startY, endY, u * u) + Math.sin(u * Trigo.pi) * peakLift;
  } else if (clamped < 0.85) {
    const u = (clamped - 0.6) / 0.25;
    y = endY + Math.sin(u * Trigo.pi) * (peakLift * 0.25);
  } else if (clamped < 1) {
    const u = (clamped - 0.85) / 0.15;
    y = endY + Math.sin(u * Trigo.pi) * (peakLift * 0.08);
  } else
    y = endY;
  posTarget.setScalar(x, y, z);

  const settle = Utils.clamp((clamped - 0.58) / 0.42, 0, 1);
  const rx = Utils.lerp(spinX * out, restPitch, settle * settle);
  const ry = Utils.lerp(spinY * out, restYaw, settle * settle);
  const rz = Utils.lerp(spinZ * out, restRoll, settle * settle);
  rotTarget.setScalar(rx, ry, rz);
}

/**
 * Computes the 3D transforms for a destroyed Water Dispenser's lower cabinet wreck, spreading water puddle,
 * tumbling carboy crown, and 5 flying shards at `elapsed` seconds after destruction, writing into `target`
 * with zero allocations.
 */
export function dispenserBreakPose(elapsed, seed = 0, target = createDispenserBreakPose()) {
  const t = Math.max(0, elapsed);

  // 1. Cabinet wreck jolt: shudders and buckles during the first 0.18s of destruction, then settles
  const jolt = t < 0.18 ? Math.sin((t / 0.18) * Trigo.pi) : 0;
  target.wreckScale.setScalar(1 + jolt * 0.12, 1 - jolt * 0.08, 1 + jolt * 0.12);
  target.wreckRot.setScalar(jolt * 0.06 * Math.sin(seed * 3), 0, jolt * 0.06 * Math.cos(seed * 3));

  // 2. Spilled water puddle spreads outward across the floor over the first 0.55s
  const puddleSpread = Utils.smoothstep(0, 0.55, t);
  const pScale = 0.16 + 0.84 * puddleSpread;
  target.puddleScale.setScalar(pScale, 1, pScale);

  // 3. Shattered 5-gallon carboy crown: pops upward from y = 36, tumbles forward/sideways, bounces, and rests on its side
  // Keep trajectories in the forward hemisphere (z >= -2 in local dispenser space, since -Z backs against the wall)
  const topDuration = 0.86;
  const topSpread = (Math.sin(seed * 2.9 + 0.7) * 0.65);
  const topDist = 17 + ((Math.cos(seed * 4.3) + 1) * 0.5) * 8;
  const topEndX = Math.sin(topSpread) * topDist;
  const topEndZ = Math.cos(topSpread) * topDist;
  writeBallisticArc(
    target.carboyTop.pos,
    target.carboyTop.rot,
    0,
    36.0,
    0,
    topEndX,
    3.6,
    topEndZ,
    Trigo.pi * 2.4,
    topSpread + Trigo.pi * 1.1,
    Trigo.pi * 1.7,
    Trigo.halfpi - 0.18,
    topSpread + 0.6,
    0.22,
    t / topDuration,
    14,
  );

  // 4. Five shards (3 polycarbonate bottle shards + front bezel + side cup tube) fly out into the room (+Z / ±X)
  for (let i = 0; i < DISPENSER_SHARD_COUNT; i++) {
    const shard = target.shards[i];
    const hash = Math.sin(seed * 2.1 + i * 3.73) * 0.5 + 0.5;
    // Fan shards across [-0.38 * PI .. +0.38 * PI] around +Z so they fly out into the room instead of into the wall behind -Z
    const fan = ((i / (DISPENSER_SHARD_COUNT - 1)) - 0.5) * Trigo.pi * 0.76 + (hash - 0.5) * 0.25;
    const startX = i === 4 ? 7.5 : Math.sin(fan) * 4.2;
    const startY = i < 3 ? 32.0 + i * 2.2 : i === 3 ? 24.5 : 19.5;
    const startZ = i === 3 ? 6.5 : Math.cos(fan) * 4.2;
    const dist = 14 + hash * 14 + (i % 2) * 4;
    const duration = 0.62 + hash * 0.22;
    const peakLift = 10 + (1 - hash) * 10;
    const dirSign = i % 2 === 0 ? 1 : -1;
    writeBallisticArc(
      shard.pos,
      shard.rot,
      startX,
      startY,
      startZ,
      Math.sin(fan) * dist,
      0.85,
      Math.max(2.5, Math.cos(fan) * dist),
      dirSign * Trigo.pi * (2.2 + hash),
      fan + dirSign * 1.5,
      -dirSign * Trigo.pi * 1.7,
      Trigo.halfpi - 0.12,
      fan + 0.35 * dirSign,
      (hash - 0.5) * 0.24,
      t / duration,
      peakLift,
    );
  }

  return target;
}

const CANTEEN_SLATE = [44, 54, 68];
const CANTEEN_LIGHT = [76, 90, 110];
const CANTEEN_DARK = [22, 28, 38];
const CHAIR_AMBER = [138, 62, 34];
const CHAIR_AMBER_LIGHT = [178, 88, 52];
const CHAIR_AMBER_DARK = [74, 30, 16];
const STAINLESS_BASE = [62, 72, 86];
const STAINLESS_LIGHT = [98, 112, 132];
const STAINLESS_DARK = [28, 35, 46];
const BURNER_COAL = [16, 18, 24];
const BURNER_GLOW = [198, 68, 28];
const BURNER_HOT = [242, 136, 48];

function drawTableTop(rnd) {
  const t = new Tile(TABLE_TOP.width, TABLE_TOP.height);
  plate(t, 0, 0, TABLE_TOP.width, TABLE_TOP.height, rnd, CANTEEN_SLATE);

  // Clean UAC canteen laminate tabletop surface (y = 0..45)
  t.rect(3, 3, 58, 40, CANTEEN_DARK, 0.25);
  for (let y = 5; y < 41; y++)
    for (let x = 5; x < 59; x++) {
      const sheen = Math.sin(((x - 5) / 54) * Trigo.pi) * 0.24;
      t.set(x, y, CANTEEN_LIGHT, sheen);
    }
  // Center table runner stripe & condiment caddy inlay
  t.rect(8, 20, 48, 6, CANTEEN_DARK, 0.55);
  for (let x = 8; x < 56; x++) {
    t.set(x, 20, STAINLESS_LIGHT, 0.45);
    t.set(x, 25, STAINLESS_LIGHT, 0.45);
  }
  // Beveled stainless edge banding strip (y = 46..63)
  t.rect(1, 46, 62, 16, STAINLESS_BASE, 0.75);
  for (let x = 2; x < 62; x++) {
    t.set(x, 47, STAINLESS_LIGHT, 0.8);
    t.set(x, 60, SHADOW, 0.85);
  }

  for (const [rx, ry] of [[5, 5], [58, 5], [5, 39], [58, 39]])
    rivet(t, rx, ry);

  rust(t, rnd, 0.1);
  return t;
}

function drawTableFrame(rnd) {
  const t = new Tile(TABLE_FRAME.width, TABLE_FRAME.height);
  plate(t, 0, 0, TABLE_FRAME.width, TABLE_FRAME.height, rnd, ENAMEL_BASE);
  t.rect(1, 56, 62, 7, KICKPLATE, 0.92);
  for (let y = 4; y < 55; y++) {
    t.set(14, y, STAINLESS_LIGHT, 0.55);
    t.set(48, y, SHADOW, 0.7);
  }
  for (const [rx, ry] of [[6, 6], [56, 6], [6, 50], [56, 50]])
    rivet(t, rx, ry);
  rust(t, rnd, 0.14);
  return t;
}

function drawTableChair(rnd) {
  const t = new Tile(TABLE_CHAIR.width, TABLE_CHAIR.height);
  plate(t, 0, 0, TABLE_CHAIR.width, TABLE_CHAIR.height, rnd, CHAIR_AMBER);

  // Molded canteen polymer shell (y = 0..44) with ergonomic ventilation slots
  for (let y = 2; y < 44; y++)
    for (let x = 3; x < 61; x++) {
      const contour = Math.sin(((x - 3) / 58) * Trigo.pi);
      t.set(x, y, CHAIR_AMBER_LIGHT, contour * 0.32);
    }
  for (const sy of [12, 20, 28]) {
    t.rect(14, sy, 36, 3, CHAIR_AMBER_DARK, 0.85);
    for (let x = 15; x < 49; x++)
      t.set(x, sy + 2, CHAIR_AMBER_LIGHT, 0.5);
  }

  // Tubular steel chair legs & dark floor glides (y = 45..63)
  t.rect(1, 45, 62, 18, STAINLESS_DARK, 0.9);
  t.rect(3, 47, 58, 7, STAINLESS_BASE, 0.7);
  for (let x = 4; x < 60; x++)
    t.set(x, 48, STAINLESS_LIGHT, 0.75);

  rust(t, rnd, 0.1);
  return t;
}

function drawTableTray(rnd) {
  const t = new Tile(TABLE_TRAY.width, TABLE_TRAY.height);
  plate(t, 0, 0, TABLE_TRAY.width, TABLE_TRAY.height, rnd, STAINLESS_BASE);

  // Upper region (y = 0..39): Compartmented stainless cafeteria meal tray
  t.rect(3, 3, 58, 35, STAINLESS_LIGHT, 0.55);
  // Three recessed food compartments + ration portions
  t.rect(6, 6, 24, 14, STAINLESS_DARK, 0.82);
  t.rect(9, 9, 18, 8, CHAIR_AMBER, 0.75);
  t.rect(34, 6, 24, 14, STAINLESS_DARK, 0.82);
  t.rect(37, 9, 18, 8, LED_GREEN, 0.65);
  t.rect(6, 23, 52, 12, STAINLESS_DARK, 0.82);
  t.rect(10, 25, 28, 8, CANTEEN_LIGHT, 0.65);

  // Lower region (y = 41..63): Cyan & brushed-steel insulated thermo-mugs and condiment shaker
  t.rect(2, 41, 60, 21, COLD_BLUE, 0.85);
  for (let x = 3; x < 61; x++) {
    t.set(x, 42, COLD_LIGHT, 0.8);
    t.set(x, 48, STAINLESS_LIGHT, 0.75);
  }

  return t;
}

/**
 * Returns the power-of-two RGBA texture atlas (256 x 64) for the 3D Refectory Table & Chairs furniture prop.
 */
export function tableAtlas() {
  const { width, height } = TABLE_ATLAS;
  const data = new Uint8Array(width * height * 4);
  const blit = (tile, x0) => {
    for (let y = 0; y < tile.height; y++)
      for (let x = 0; x < tile.width; x++) {
        const i = (y * tile.width + x) * 3;
        const o = (y * width + x0 + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  };
  blit(drawTableTop(mulberry32(8301)), TABLE_TOP.x);
  blit(drawTableFrame(mulberry32(8302)), TABLE_FRAME.x);
  blit(drawTableChair(mulberry32(8303)), TABLE_CHAIR.x);
  blit(drawTableTray(mulberry32(8304)), TABLE_TRAY.x);
  return {
    name: 'table',
    data,
    width,
    height,
    top: TABLE_TOP,
    frame: TABLE_FRAME,
    chair: TABLE_CHAIR,
    tray: TABLE_TRAY,
  };
}

function buildRefectoryChair(vertices, normals, uvs, cx, cz, dirZ, chairU0, chairU1, uvRect, skipBack = false) {
  const shellFaces = {
    front: uvRect(chairU0, 0.04, chairU1, 0.66),
    back: uvRect(chairU0, 0.04, chairU1, 0.66),
    left: uvRect(chairU0, 0.04, chairU1, 0.66),
    right: uvRect(chairU0, 0.04, chairU1, 0.66),
    top: uvRect(chairU0, 0.04, chairU1, 0.66),
    bottom: uvRect(chairU0, 0.72, chairU1, 0.96),
  };
  const legFaces = {
    front: uvRect(chairU0, 0.72, chairU1, 0.96),
    back: uvRect(chairU0, 0.72, chairU1, 0.96),
    left: uvRect(chairU0, 0.72, chairU1, 0.96),
    right: uvRect(chairU0, 0.72, chairU1, 0.96),
    bottom: uvRect(chairU0, 0.88, chairU1, 0.98),
  };

  // 4 tubular steel legs resting on y = 0 .. 11.4
  for (const [lx, lz] of [[-3.8, -3.4], [3.8, -3.4], [-3.8, 3.4], [3.8, 3.4]])
    pushBoxPart(vertices, normals, uvs, new Vec3(cx + lx - 0.65, 0, cz + lz - 0.65), new Vec3(cx + lx + 0.65, 11.4, cz + lz + 0.65), legFaces);

  // Molded canteen seat shell (y = 11.4 .. 13.0)
  pushBoxPart(vertices, normals, uvs, new Vec3(cx - 4.6, 11.4, cz - 4.2), new Vec3(cx + 4.6, 13.0, cz + 4.2), shellFaces);

  if (!skipBack) {
    // Backrest support posts & contoured shell on the outer edge (away from the table center)
    const backZ0 = dirZ > 0 ? cz + 3.0 : cz - 4.4;
    const backZ1 = dirZ > 0 ? cz + 4.4 : cz - 3.0;
    pushBoxPart(vertices, normals, uvs, new Vec3(cx - 3.6, 13.0, backZ0), new Vec3(cx - 2.4, 17.5, backZ1), legFaces);
    pushBoxPart(vertices, normals, uvs, new Vec3(cx + 2.4, 13.0, backZ0), new Vec3(cx + 3.6, 17.5, backZ1), legFaces);
    pushBoxPart(vertices, normals, uvs, new Vec3(cx - 4.5, 17.0, backZ0), new Vec3(cx + 4.5, 30.0, backZ1), shellFaces);
  }
}

/**
 * Builds the 3D Refectory Table & Chairs mesh standing on `y = 0`, centered on `x/z`:
 * - Heavy-duty mess-hall dining table (`x = -19..19, y = 0..19.4, z = -11..11`) with 4 tubular legs and steel apron.
 * - Four molded canteen chairs (`y = 0..30.0`) arranged in pairs on the `-Z` and `+Z` sides facing the table.
 * - Two stainless cafeteria meal trays, two thermo-mugs, and a central condiment caddy on top of the table (`y = 19.4..23.2`).
 */
export function tableMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = TABLE_ATLAS.width;
  const inset = 0.35 / W;
  const topU0 = TABLE_TOP.x / W + inset;
  const topU1 = (TABLE_TOP.x + TABLE_TOP.width) / W - inset;
  const frameU0 = TABLE_FRAME.x / W + inset;
  const frameU1 = (TABLE_FRAME.x + TABLE_FRAME.width) / W - inset;
  const chairU0 = TABLE_CHAIR.x / W + inset;
  const chairU1 = (TABLE_CHAIR.x + TABLE_CHAIR.width) / W - inset;
  const trayU0 = TABLE_TRAY.x / W + inset;
  const trayU1 = (TABLE_TRAY.x + TABLE_TRAY.width) / W - inset;

  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  const legFaces = {
    front: uvRect(frameU0, 0.08, frameU1, 0.98),
    back: uvRect(frameU0, 0.08, frameU1, 0.98),
    left: uvRect(frameU0, 0.08, frameU1, 0.98),
    right: uvRect(frameU0, 0.08, frameU1, 0.98),
    bottom: uvRect(frameU0, 0.88, frameU1, 0.98),
  };

  // 1. Four Tubular Steel Table Legs at corners (y = 0 .. 17.6)
  for (const [lx, lz] of [[-17.2, -9.4], [17.2, -9.4], [-17.2, 9.4], [17.2, 9.4]])
    pushBoxPart(vertices, normals, uvs, new Vec3(lx - 1.1, 0, lz - 1.1), new Vec3(lx + 1.1, 17.6, lz + 1.1), legFaces);

  // 2. Under-Table Steel Perimeter Apron Frame (y = 15.6 .. 17.6)
  pushBoxPart(vertices, normals, uvs, new Vec3(-17.8, 15.6, -10.0), new Vec3(17.8, 17.6, 10.0), {
    front: uvRect(frameU0, 0.12, frameU1, 0.42),
    back: uvRect(frameU0, 0.12, frameU1, 0.42),
    left: uvRect(frameU0, 0.12, frameU1, 0.42),
    right: uvRect(frameU0, 0.12, frameU1, 0.42),
    bottom: uvRect(frameU0, 0.88, frameU1, 0.98),
  });

  // 3. Canteen Laminate Tabletop Slab (x = -19.0 .. 19.0, y = 17.6 .. 19.4, z = -11.0 .. 11.0)
  pushBoxPart(vertices, normals, uvs, new Vec3(-19.0, 17.6, -11.0), new Vec3(19.0, 19.4, 11.0), {
    front: uvRect(topU0, 0.72, topU1, 0.96),
    back: uvRect(topU0, 0.72, topU1, 0.96),
    left: uvRect(topU0, 0.72, topU1, 0.96),
    right: uvRect(topU0, 0.72, topU1, 0.96),
    top: uvRect(topU0, 0.02, topU1, 0.68),
    bottom: uvRect(frameU0, 0.1, frameU1, 0.5),
  });

  // 4. Cafeteria Meal Trays, Thermo-Mugs, and Center Napkin/Condiment Caddy on top of the table (y = 19.4 .. 23.2)
  const trayFaces = {
    front: uvRect(topU0, 0.72, topU1, 0.94),
    back: uvRect(topU0, 0.72, topU1, 0.94),
    left: uvRect(topU0, 0.72, topU1, 0.94),
    right: uvRect(topU0, 0.72, topU1, 0.94),
    top: uvRect(trayU0, 0.04, trayU1, 0.6),
  };
  pushBoxPart(vertices, normals, uvs, new Vec3(-13.8, 19.4, 2.2), new Vec3(-5.2, 20.1, 8.6), trayFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(5.2, 19.4, -8.6), new Vec3(13.8, 20.1, -2.2), trayFaces);

  // Two cylindrical insulated thermo-mugs (y = 19.4 .. 22.8)
  pushCylinderAt(vertices, normals, uvs, -3.4, 5.2, 19.4, 22.8, 1.15, 1.15, trayU0, trayU1, 0.66, 0.96, 8);
  pushCylinderAt(vertices, normals, uvs, 3.4, -5.2, 19.4, 22.8, 1.15, 1.15, trayU0, trayU1, 0.66, 0.96, 8);

  // Center condiment & napkin dispenser caddy (y = 19.4 .. 23.2)
  pushBoxPart(vertices, normals, uvs, new Vec3(-2.2, 19.4, -1.6), new Vec3(2.2, 23.2, 1.6), {
    front: uvRect(trayU0, 0.66, trayU1, 0.96),
    back: uvRect(trayU0, 0.66, trayU1, 0.96),
    left: uvRect(trayU0, 0.66, trayU1, 0.96),
    right: uvRect(trayU0, 0.66, trayU1, 0.96),
    top: uvRect(topU0, 0.72, topU1, 0.94),
  });

  // 5. Four Refectory Chairs (2 on +Z side facing -Z, 2 on -Z side facing +Z, reaching y = 30.0)
  buildRefectoryChair(vertices, normals, uvs, -9.5, 11.8, 1, chairU0, chairU1, uvRect, false);
  buildRefectoryChair(vertices, normals, uvs, 9.5, 11.8, 1, chairU0, chairU1, uvRect, false);
  buildRefectoryChair(vertices, normals, uvs, -9.5, -11.8, -1, chairU0, chairU1, uvRect, false);
  buildRefectoryChair(vertices, normals, uvs, 9.5, -11.8, -1, chairU0, chairU1, uvRect, false);

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D wrecked Refectory Table & Chairs left standing when shot/destroyed:
 * surviving outer table legs and split tabletop ends with a shattered center gap, upturned tray, and damaged chairs.
 */
export function tableWreckMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = TABLE_ATLAS.width;
  const inset = 0.35 / W;
  const topU0 = TABLE_TOP.x / W + inset;
  const topU1 = (TABLE_TOP.x + TABLE_TOP.width) / W - inset;
  const frameU0 = TABLE_FRAME.x / W + inset;
  const frameU1 = (TABLE_FRAME.x + TABLE_FRAME.width) / W - inset;
  const chairU0 = TABLE_CHAIR.x / W + inset;
  const chairU1 = (TABLE_CHAIR.x + TABLE_CHAIR.width) / W - inset;

  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });
  const legFaces = {
    front: uvRect(frameU0, 0.08, frameU1, 0.98),
    back: uvRect(frameU0, 0.08, frameU1, 0.98),
    left: uvRect(frameU0, 0.08, frameU1, 0.98),
    right: uvRect(frameU0, 0.08, frameU1, 0.98),
    bottom: uvRect(frameU0, 0.88, frameU1, 0.98),
  };

  for (const [lx, lz] of [[-17.2, -9.4], [17.2, -9.4], [-17.2, 9.4], [17.2, 9.4]])
    pushBoxPart(vertices, normals, uvs, new Vec3(lx - 1.1, 0, lz - 1.1), new Vec3(lx + 1.1, 17.6, lz + 1.1), legFaces);

  // Split left and right tabletop stumps with jagged broken center gap
  const slabFaces = {
    front: uvRect(topU0, 0.72, topU1, 0.96),
    back: uvRect(topU0, 0.72, topU1, 0.96),
    left: uvRect(topU0, 0.72, topU1, 0.96),
    right: uvRect(frameU0, 0.12, frameU1, 0.85),
    top: uvRect(topU0, 0.02, (topU0 + topU1) * 0.5, 0.68),
    bottom: uvRect(frameU0, 0.1, frameU1, 0.5),
  };
  pushBoxPart(vertices, normals, uvs, new Vec3(-19.0, 16.8, -11.0), new Vec3(-5.8, 19.2, 11.0), slabFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(5.8, 16.8, -11.0), new Vec3(19.0, 19.2, 11.0), slabFaces);

  // Surviving chairs (front-right chair backrest blown off)
  buildRefectoryChair(vertices, normals, uvs, -9.5, 12.4, 1, chairU0, chairU1, uvRect, false);
  buildRefectoryChair(vertices, normals, uvs, 9.8, 12.6, 1, chairU0, chairU1, uvRect, true);
  buildRefectoryChair(vertices, normals, uvs, -9.5, -12.2, -1, chairU0, chairU1, uvRect, false);
  buildRefectoryChair(vertices, normals, uvs, 9.5, -12.2, -1, chairU0, chairU1, uvRect, true);

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D floor debris mesh (`y = 0.12`) around a destroyed Refectory Table:
 * spilled cafeteria ration trays and shattered laminate splinters on the floor.
 */
export function tableDebrisMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = TABLE_ATLAS.width;
  const trayU0 = TABLE_TRAY.x / W + 0.004;
  const trayU1 = (TABLE_TRAY.x + TABLE_TRAY.width) / W - 0.004;
  const trayUC = (trayU0 + trayU1) * 0.5;
  const trayUSpan = (trayU1 - trayU0) * 0.38;

  const radii = [15.5, 19.0, 21.5, 18.0, 16.2, 19.8, 22.0, 17.5, 14.8, 18.5, 20.4, 16.8];
  const segs = radii.length;
  const center = new Vec3(0.0, 0.12, 0.5);
  const uvCenter = new Vec2(trayUC, 0.35);
  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % segs;
    const a0 = (i / segs) * Trigo.twopi;
    const a1 = (next / segs) * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const r0 = radii[i];
    const r1 = radii[next];
    const p0 = new Vec3(center.x + c0 * r0, 0.12, center.z + s0 * r0);
    const p1 = new Vec3(center.x + c1 * r1, 0.12, center.z + s1 * r1);
    const uv0 = new Vec2(trayUC + c0 * trayUSpan, 0.35 + s0 * 0.25);
    const uv1 = new Vec2(trayUC + c1 * trayUSpan, 0.35 + s1 * 0.25);
    pushTri(vertices, normals, uvs, center, p1, p0, uvCenter, uv1, uv0);
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D shrapnel pieces blasted off a destroyed Refectory Table:
 * - `carboyTop`: shattered center tabletop plank & condiment caddy.
 * - `shards`: `TABLE_SHARD_COUNT` (`5`) flying fragments (2 stainless meal trays, 2 knocked-off orange chair backrests, and 1 thermo-mug).
 */
export function tableShrapnelParts() {
  const W = TABLE_ATLAS.width;
  const inset = 0.35 / W;
  const topU0 = TABLE_TOP.x / W + inset;
  const topU1 = (TABLE_TOP.x + TABLE_TOP.width) / W - inset;
  const frameU0 = TABLE_FRAME.x / W + inset;
  const frameU1 = (TABLE_FRAME.x + TABLE_FRAME.width) / W - inset;
  const chairU0 = TABLE_CHAIR.x / W + inset;
  const chairU1 = (TABLE_CHAIR.x + TABLE_CHAIR.width) / W - inset;
  const trayU0 = TABLE_TRAY.x / W + inset;
  const trayU1 = (TABLE_TRAY.x + TABLE_TRAY.width) / W - inset;
  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  const topVerts = [];
  const topNorms = [];
  const topUvs = [];
  pushBoxPart(topVerts, topNorms, topUvs, new Vec3(-5.8, -1.0, -9.5), new Vec3(5.8, 1.0, 9.5), {
    front: uvRect(topU0, 0.72, topU1, 0.96),
    back: uvRect(topU0, 0.72, topU1, 0.96),
    left: uvRect(frameU0, 0.12, frameU1, 0.85),
    right: uvRect(frameU0, 0.12, frameU1, 0.85),
    top: uvRect(topU0, 0.15, topU1, 0.55),
    bottom: uvRect(frameU0, 0.1, frameU1, 0.5),
  });

  const shards = [];
  // Shards 0 & 1: Two flying stainless cafeteria meal trays
  for (let s = 0; s < 2; s++) {
    const sVerts = [];
    const sNorms = [];
    const sUvs = [];
    pushBoxPart(sVerts, sNorms, sUvs, new Vec3(-4.2, -0.45, -3.1), new Vec3(4.2, 0.45, 3.1), {
      front: uvRect(topU0, 0.72, topU1, 0.94),
      back: uvRect(topU0, 0.72, topU1, 0.94),
      left: uvRect(topU0, 0.72, topU1, 0.94),
      right: uvRect(topU0, 0.72, topU1, 0.94),
      top: uvRect(trayU0, 0.04, trayU1, 0.6),
      bottom: uvRect(topU0, 0.72, topU1, 0.94),
    });
    shards.push({ vertices: new Float32Array(sVerts), normals: new Float32Array(sNorms), uvs: new Float32Array(sUvs) });
  }
  // Shards 2 & 3: Two blown-off molded canteen chair backrests
  for (let s = 0; s < 2; s++) {
    const cVerts = [];
    const cNorms = [];
    const cUvs = [];
    pushBoxPart(cVerts, cNorms, cUvs, new Vec3(-4.4, -5.5, -0.8), new Vec3(4.4, 5.5, 0.8), {
      front: uvRect(chairU0, 0.04, chairU1, 0.66),
      back: uvRect(chairU0, 0.04, chairU1, 0.66),
      left: uvRect(chairU0, 0.04, chairU1, 0.66),
      right: uvRect(chairU0, 0.04, chairU1, 0.66),
      top: uvRect(chairU0, 0.04, chairU1, 0.66),
      bottom: uvRect(chairU0, 0.72, chairU1, 0.96),
    });
    shards.push({ vertices: new Float32Array(cVerts), normals: new Float32Array(cNorms), uvs: new Float32Array(cUvs) });
  }
  // Shard 4: Flying insulated thermo-mug
  const mVerts = [];
  const mNorms = [];
  const mUvs = [];
  pushCylinderAt(mVerts, mNorms, mUvs, 0, 0, -1.7, 1.7, 1.2, 1.2, trayU0, trayU1, 0.66, 0.96, 8);
  shards.push({ vertices: new Float32Array(mVerts), normals: new Float32Array(mNorms), uvs: new Float32Array(mUvs) });

  const carboyTop = {
    vertices: new Float32Array(topVerts),
    normals: new Float32Array(topNorms),
    uvs: new Float32Array(topUvs),
  };
  return { carboyTop, shards };
}

/** Pre-allocates a reusable pose structure for `tableBreakPose`. */
export function createTableBreakPose() {
  return createDispenserBreakPose();
}

/**
 * Computes the 3D transforms for a destroyed Refectory Table's wreck, floor debris, tumbling center tabletop plank,
 * and 5 flying shards at `elapsed` seconds after destruction, writing into `target` with zero allocations.
 */
export function tableBreakPose(elapsed, seed = 0, target = createTableBreakPose()) {
  const t = Math.max(0, elapsed);
  const jolt = t < 0.18 ? Math.sin((t / 0.18) * Trigo.pi) : 0;
  target.wreckScale.setScalar(1 + jolt * 0.08, 1 - jolt * 0.06, 1 + jolt * 0.08);
  target.wreckRot.setScalar(jolt * 0.05 * Math.sin(seed * 3), 0, jolt * 0.05 * Math.cos(seed * 3));

  const debrisSpread = Utils.smoothstep(0, 0.45, t);
  const dScale = 0.2 + 0.8 * debrisSpread;
  target.puddleScale.setScalar(dScale, 1, dScale);

  const topDuration = 0.82;
  const topSpread = Math.sin(seed * 2.5 + 0.4) * 0.8;
  const topDist = 14 + ((Math.cos(seed * 3.9) + 1) * 0.5) * 8;
  writeBallisticArc(
    target.carboyTop.pos,
    target.carboyTop.rot,
    0,
    19.0,
    0,
    Math.sin(topSpread) * topDist,
    1.2,
    Math.cos(topSpread) * topDist,
    Trigo.pi * 2.0,
    topSpread + Trigo.pi * 0.8,
    Trigo.pi * 1.4,
    0.08,
    topSpread + 0.4,
    0.12,
    t / topDuration,
    12,
  );

  for (let i = 0; i < TABLE_SHARD_COUNT; i++) {
    const shard = target.shards[i];
    const hash = Math.sin(seed * 2.1 + i * 3.41) * 0.5 + 0.5;
    const fan = ((i / TABLE_SHARD_COUNT) * Trigo.twopi) + (hash - 0.5) * 0.35;
    const startX = i < 2 ? (i === 0 ? -9.5 : 9.5) : i < 4 ? 9.5 : -3.4;
    const startY = i < 2 ? 20.0 : i < 4 ? 23.0 : 21.0;
    const startZ = i === 0 ? 5.4 : i === 1 ? -5.4 : i === 2 ? 12.0 : i === 3 ? -12.0 : 5.2;
    const dist = 14 + hash * 12;
    const duration = 0.58 + hash * 0.22;
    const peakLift = 9 + (1 - hash) * 9;
    const dirSign = i % 2 === 0 ? 1 : -1;
    writeBallisticArc(
      shard.pos,
      shard.rot,
      startX,
      startY,
      startZ,
      Math.sin(fan) * dist,
      0.85,
      Math.cos(fan) * dist,
      dirSign * Trigo.pi * (2.0 + hash),
      fan + dirSign * 1.3,
      -dirSign * Trigo.pi * 1.5,
      Trigo.halfpi - 0.1,
      fan + 0.25 * dirSign,
      (hash - 0.5) * 0.2,
      t / duration,
      peakLift,
    );
  }
  return target;
}

const DESK_SLATE = [34, 42, 54];
const DESK_SLATE_LIGHT = [58, 70, 88];
const DESK_SLATE_DARK = [18, 23, 32];
const DESK_TRIM_METAL = [74, 86, 106];
const PC_BEIGE_STEEL = [46, 54, 68];
const PC_DARK_BAY = [14, 18, 26];
const CRT_DEEP = [8, 26, 24];
const CRT_MID = [16, 68, 56];
const CRT_GLOW = [52, 168, 128];
const CRT_BRIGHT = [118, 224, 178];
const CRT_AMBER = [196, 134, 42];
const KEYCAP_DARK = [20, 25, 34];
const KEYCAP_TOP = [48, 58, 74];
const CHAIR_FABRIC = [26, 36, 52];
const CHAIR_FABRIC_LIGHT = [46, 62, 86];
const CHAIR_STITCH = [12, 17, 26];

function drawDeskTop(rnd) {
  const t = new Tile(DESK_TOP.width, DESK_TOP.height);
  plate(t, 0, 0, DESK_TOP.width, DESK_TOP.height, rnd, DESK_SLATE);

  // Upper region (y = 0..37): Brushed dark slate desktop laminate with metallic edge trim
  t.rect(2, 2, 60, 34, DESK_SLATE_DARK, 0.35);
  for (let y = 4; y < 34; y++)
    for (let x = 4; x < 60; x++) {
      const sheen = Math.sin(((x - 4) / 56) * Trigo.pi) * 0.22;
      t.set(x, y, DESK_SLATE_LIGHT, sheen);
    }
  // Subtle technical desk inlay border & cable grommet
  for (let x = 6; x < 58; x++) {
    t.set(x, 6, DESK_TRIM_METAL, 0.45);
    t.set(x, 31, DESK_SLATE_DARK, 0.75);
  }
  t.rect(48, 8, 6, 4, KICKPLATE, 0.9);

  // Beveled front bumper strip (y = 36..40)
  t.rect(1, 36, 62, 4, DESK_TRIM_METAL, 0.65);
  for (let x = 2; x < 62; x++)
    t.set(x, 39, SHADOW, 0.8);

  // Lower region (y = 41..63): Two stacked pedestal drawers with recessed chrome pulls
  for (const [dy, dh] of [[42, 9], [53, 9]]) {
    t.rect(4, dy, 56, dh, PC_BEIGE_STEEL, 0.55);
    for (let x = 4; x < 60; x++) {
      t.set(x, dy, DESK_SLATE_LIGHT, 0.65);
      t.set(x, dy + dh - 1, SHADOW, 0.85);
    }
    // Recessed drawer handle pocket
    t.rect(22, dy + 3, 20, 3, KICKPLATE, 0.9);
    t.rect(24, dy + 3, 16, 1, DESK_TRIM_METAL, 0.85);
  }

  for (const [rx, ry] of [[5, 5], [58, 5], [5, 33], [58, 33]])
    rivet(t, rx, ry);

  rust(t, rnd, 0.14);
  return t;
}

function drawDeskSide(rnd) {
  const t = new Tile(DESK_SIDE.width, DESK_SIDE.height);
  plate(t, 0, 0, DESK_SIDE.width, DESK_SIDE.height, rnd, ENAMEL_BASE);

  // Left half (x = 0..31): Steel desk pedestal leg & modesty panel with louvers and rubber foot
  t.rect(1, 56, 30, 7, KICKPLATE, 0.92);
  for (let ly = 12; ly <= 28; ly += 3)
    for (let lx = 6; lx < 26; lx++) {
      t.set(lx, ly, ALCOVE_DARK, 0.85);
      t.set(lx, ly + 1, ENAMEL_LIGHT, 0.45);
    }
  for (const [rx, ry] of [[4, 5], [27, 5], [4, 50], [27, 50]])
    rivet(t, rx, ry);

  // Right half (x = 32..63): UAC Desktop Computer Tower chassis (front bezel & side vents)
  t.rect(32, 1, 31, 62, PC_BEIGE_STEEL, 0.78);
  for (let y = 2; y < 62; y++) {
    t.set(33, y, DESK_TRIM_METAL, 0.65);
    t.set(61, y, SHADOW, 0.8);
  }
  // Upper 5.25" optical / data drive bays (y = 5..21)
  for (const by of [5, 13]) {
    t.rect(36, by, 23, 6, PC_DARK_BAY, 0.9);
    t.rect(38, by + 2, 14, 2, DESK_SLATE_LIGHT, 0.6);
    t.rect(54, by + 2, 3, 2, LED_GREEN, 0.9);
  }
  // 3.5" magnetic data slot & recessed power/reset switches (y = 24..34)
  t.rect(36, 24, 23, 8, DESK_SLATE_DARK, 0.85);
  t.rect(38, 26, 11, 2, KICKPLATE, 0.95);
  // Power button (cyan) + HDD activity LED (amber/red) + Power LED (green)
  t.rect(52, 25, 5, 4, COLD_BLUE, 0.92);
  t.set(54, 26, COLD_LIGHT, 0.95);
  t.rect(38, 30, 3, 2, LED_GREEN, 0.95);
  t.rect(43, 30, 3, 2, CRT_AMBER, 0.95);

  // Lower tower cooling intake grille (y = 37..57)
  for (let gy = 37; gy <= 56; gy += 3)
    for (let gx = 37; gx < 58; gx += 2) {
      t.set(gx, gy, KICKPLATE, 0.92);
      t.set(gx, gy + 1, DESK_SLATE_LIGHT, 0.45);
    }

  rust(t, rnd, 0.14);
  return t;
}

function drawDeskScreen(rnd) {
  const t = new Tile(DESK_SCREEN.width, DESK_SCREEN.height);
  plate(t, 0, 0, DESK_SCREEN.width, DESK_SCREEN.height, rnd, PC_BEIGE_STEEL);

  // Upper region (y = 0..41): CRT / Flat-Bezel Monitor Front with UAC tactical terminal display
  t.rect(2, 2, 60, 39, DESK_SLATE_DARK, 0.85);
  // Outer monitor bezel bevels
  for (let x = 2; x < 62; x++) {
    t.set(x, 2, DESK_TRIM_METAL, 0.7);
    t.set(x, 40, SHADOW, 0.88);
  }
  // Glowing phosphor screen glass (x = 6..57, y = 5..35)
  for (let y = 5; y <= 35; y++)
    for (let x = 6; x <= 57; x++) {
      const u = (x - 6) / 51;
      const v = (y - 5) / 30;
      const vig = Math.sin(u * Trigo.pi) * Math.sin(v * Trigo.pi);
      const scan = (y & 1) === 0 ? 0.16 : 0.0;
      const base = mix(CRT_DEEP, CRT_MID, vig * 0.85 + scan);
      t.set(x, y, base, 1);
    }
  // Top UAC OS header bar on screen
  t.rect(8, 7, 48, 3, CRT_GLOW, 0.85);
  // Left tactical radar / telemetry reticle box (x = 9..26, y = 12..29)
  for (let x = 9; x <= 26; x++) {
    t.set(x, 12, CRT_GLOW, 0.75);
    t.set(x, 29, CRT_GLOW, 0.75);
  }
  for (let y = 12; y <= 29; y++) {
    t.set(9, y, CRT_GLOW, 0.75);
    t.set(26, y, CRT_GLOW, 0.75);
  }
  // Sine wave / telemetry trace inside the reticle
  for (let x = 11; x <= 24; x++) {
    const wy = 20 + Math.round(Math.sin((x - 11) * 0.65) * 5);
    t.set(x, wy, CRT_BRIGHT, 0.95);
    t.set(x, wy + 1, CRT_GLOW, 0.65);
  }
  // Right terminal text lines & amber alert bar (x = 29..54, y = 12..32)
  for (const [ty, len, col] of [
    [13, 22, CRT_BRIGHT],
    [16, 18, CRT_GLOW],
    [19, 24, CRT_GLOW],
    [22, 15, CRT_AMBER],
    [25, 21, CRT_GLOW],
    [28, 12, CRT_BRIGHT],
    [31, 19, CRT_GLOW],
  ])
    t.rect(29, ty, len, 2, col, 0.9);

  // Diagonal phosphor screen glass specular reflection
  for (let i = 0; i < 14; i++) {
    t.set(10 + i, 8 + Math.floor(i * 0.6), CRT_BRIGHT, 0.35);
    t.set(11 + i, 8 + Math.floor(i * 0.6), CRT_BRIGHT, 0.25);
  }
  // Monitor bottom bezel power LED (green) & brightness knobs
  t.rect(53, 37, 3, 2, LED_GREEN, 0.95);
  t.rect(44, 37, 2, 2, DESK_TRIM_METAL, 0.75);
  t.rect(48, 37, 2, 2, DESK_TRIM_METAL, 0.75);

  // Lower region (y = 43..63): Mechanical Keyboard keycap matrix & Mouse swatch
  t.rect(2, 43, 60, 20, KEYCAP_DARK, 0.95);
  for (let ky = 45; ky <= 59; ky += 3)
    for (let kx = 5; kx < 56; kx += 3) {
      // Spacebar in bottom row
      if (ky === 57 && kx >= 17 && kx <= 38) {
        t.rect(17, 57, 22, 2, KEYCAP_TOP, 0.9);
        continue;
      }
      t.rect(kx, ky, 2, 2, KEYCAP_TOP, 0.88);
      t.set(kx, ky, DESK_TRIM_METAL, 0.55);
    }
  // Keyboard lock LEDs in top-right corner
  t.set(54, 44, LED_GREEN, 0.95);
  t.set(56, 44, CRT_AMBER, 0.9);

  return t;
}

function drawDeskChair(rnd) {
  const t = new Tile(DESK_CHAIR.width, DESK_CHAIR.height);
  plate(t, 0, 0, DESK_CHAIR.width, DESK_CHAIR.height, rnd, CHAIR_FABRIC);

  // Upper region (y = 0..44): Ergonomic ribbed navy-charcoal fabric upholstery
  for (let y = 2; y < 44; y++)
    for (let x = 3; x < 61; x++) {
      const bolster = Math.sin(((x - 3) / 58) * Trigo.pi);
      t.set(x, y, CHAIR_FABRIC_LIGHT, bolster * 0.28);
    }
  // Horizontal quilted cushion ribs & side bolster stitching
  for (let ry = 8; ry <= 40; ry += 6)
    for (let x = 6; x < 58; x++) {
      t.set(x, ry, CHAIR_STITCH, 0.85);
      t.set(x, ry + 1, CHAIR_FABRIC_LIGHT, 0.45);
    }
  for (let y = 3; y < 43; y += 2) {
    t.set(6, y, CHAIR_STITCH, 0.8);
    t.set(57, y, CHAIR_STITCH, 0.8);
  }

  // Lower region (y = 45..63): Dark steel / chrome 5-star chair base, hydraulic column & casters
  t.rect(1, 45, 62, 18, KICKPLATE, 0.92);
  t.rect(3, 47, 58, 6, DESK_TRIM_METAL, 0.55);
  for (let x = 4; x < 60; x++)
    t.set(x, 48, ENAMEL_LIGHT, 0.7);

  rust(t, rnd, 0.1);
  return t;
}

/**
 * Returns the power-of-two RGBA texture atlas (256 x 64) for the 3D Computer Desk & Chair furniture prop.
 */
export function deskAtlas() {
  const { width, height } = DESK_ATLAS;
  const data = new Uint8Array(width * height * 4);
  const blit = (tile, x0) => {
    for (let y = 0; y < tile.height; y++)
      for (let x = 0; x < tile.width; x++) {
        const i = (y * tile.width + x) * 3;
        const o = (y * width + x0 + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  };
  blit(drawDeskTop(mulberry32(8201)), DESK_TOP.x);
  blit(drawDeskSide(mulberry32(8202)), DESK_SIDE.x);
  blit(drawDeskScreen(mulberry32(8203)), DESK_SCREEN.x);
  blit(drawDeskChair(mulberry32(8204)), DESK_CHAIR.x);
  return {
    name: 'desk',
    data,
    width,
    height,
    top: DESK_TOP,
    side: DESK_SIDE,
    screen: DESK_SCREEN,
    chair: DESK_CHAIR,
  };
}

function pushCylinderAt(vertices, normals, uvs, cx, cz, y0, y1, r0, r1, uStart, uEnd, v0, v1, segs = 8) {
  for (let i = 0; i < segs; i++) {
    const f0 = i / segs;
    const f1 = (i + 1) / segs;
    const a0 = f0 * Trigo.twopi;
    const a1 = f1 * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const b0 = new Vec3(cx + c0 * r0, y0, cz + s0 * r0);
    const b1 = new Vec3(cx + c1 * r0, y0, cz + s1 * r0);
    const t1 = new Vec3(cx + c1 * r1, y1, cz + s1 * r1);
    const t0 = new Vec3(cx + c0 * r1, y1, cz + s0 * r1);
    const u0 = Utils.lerp(uStart, uEnd, f0);
    const u1 = Utils.lerp(uStart, uEnd, f1);
    pushQuad(vertices, normals, uvs, b1, b0, t0, t1, u0, v0, u1, v1);
  }
}

function buildChairParts(vertices, normals, uvs, chairX, chairZ, chairU0, chairU1, uvRect, wrecked = false) {
  const fabricV0 = 0.04;
  const fabricV1 = 0.66;
  const baseV0 = 0.72;
  const baseV1 = 0.96;
  const chromeV0 = 0.74;
  const chromeV1 = 0.84;

  const baseFaces = {
    front: uvRect(chairU0, baseV0, chairU1, baseV1),
    back: uvRect(chairU0, baseV0, chairU1, baseV1),
    left: uvRect(chairU0, baseV0, chairU1, baseV1),
    right: uvRect(chairU0, baseV0, chairU1, baseV1),
    top: uvRect(chairU0, chromeV0, chairU1, chromeV1),
    bottom: uvRect(chairU0, baseV0, chairU1, baseV1),
  };

  // 1. 5-Star Swivel Base Legs & Floor Casters resting on y = 0
  pushBoxPart(vertices, normals, uvs, new Vec3(chairX - 6.2, 0.8, chairZ - 1.1), new Vec3(chairX + 6.2, 2.2, chairZ + 1.1), baseFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(chairX - 1.1, 0.8, chairZ - 6.2), new Vec3(chairX + 1.1, 2.2, chairZ + 6.2), baseFaces);
  for (const [dx, dz] of [[-5.6, 0], [5.6, 0], [0, -5.6], [0, 5.6]])
    pushBoxPart(vertices, normals, uvs, new Vec3(chairX + dx - 0.9, 0, chairZ + dz - 0.9), new Vec3(chairX + dx + 0.9, 1.0, chairZ + dz + 0.9), baseFaces);

  // 2. Pneumatic Cylinder Column (y = 2.0 .. 11.8)
  pushCylinderAt(vertices, normals, uvs, chairX, chairZ, 2.0, 11.8, 1.25, 1.05, chairU0, chairU1, chromeV0, chromeV1, 8);

  // 3. Contoured Upholstered Seat Cushion (y = 11.8 .. 14.4)
  const seatFaces = {
    front: uvRect(chairU0, fabricV0, chairU1, fabricV1),
    back: uvRect(chairU0, fabricV0, chairU1, fabricV1),
    left: uvRect(chairU0, fabricV0, chairU1, fabricV1),
    right: uvRect(chairU0, fabricV0, chairU1, fabricV1),
    top: uvRect(chairU0, fabricV0, chairU1, fabricV1),
    bottom: uvRect(chairU0, baseV0, chairU1, baseV1),
  };
  pushBoxPart(vertices, normals, uvs, new Vec3(chairX - 6.2, 11.8, chairZ - 5.4), new Vec3(chairX + 6.2, 14.4, chairZ + 5.4), seatFaces);

  // 4. Left & Right T-Armrests (wrecked chair loses its right armrest to shrapnel)
  pushBoxPart(vertices, normals, uvs, new Vec3(chairX - 7.3, 13.0, chairZ - 1.2), new Vec3(chairX - 6.1, 19.2, chairZ + 1.2), baseFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(chairX - 7.6, 19.0, chairZ - 4.0), new Vec3(chairX - 5.6, 20.3, chairZ + 3.6), seatFaces);
  if (!wrecked) {
    pushBoxPart(vertices, normals, uvs, new Vec3(chairX + 6.1, 13.0, chairZ - 1.2), new Vec3(chairX + 7.3, 19.2, chairZ + 1.2), baseFaces);
    pushBoxPart(vertices, normals, uvs, new Vec3(chairX + 5.6, 19.0, chairZ - 4.0), new Vec3(chairX + 7.6, 20.3, chairZ + 3.6), seatFaces);
  }

  // 5. Rear Spine Post & Ribbed High Backrest facing the desk (-Z)
  const topY = wrecked ? 28.4 : 32.5;
  pushBoxPart(vertices, normals, uvs, new Vec3(chairX - 1.3, 13.8, chairZ + 4.8), new Vec3(chairX + 1.3, 22.0, chairZ + 6.2), baseFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(chairX - 5.8, 17.6, chairZ + 3.6), new Vec3(chairX + 5.8, topY, chairZ + 5.6), seatFaces);
}

/**
 * Builds the 3D Computer Desk & Chair mesh standing on `y = 0`, centered on `x/z`:
 * - Steel cantilevered desk (`y = 0..20.0`) with left leg, rear modesty panel, and right 2-drawer pedestal (`z = -13.5..2.5`).
 * - Desktop computer tower (`y = 20.0..33.4`), swivel monitor stand & glowing CRT screen (`y = 20.0..38.0`), keyboard, and mouse on top of the desk.
 * - Ergonomic 5-star swivel office chair (`y = 0..32.5`) tucked in front of the desk (`z = 8.8`) facing the screen.
 */
export function deskMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = DESK_ATLAS.width;
  const inset = 0.35 / W;
  const topU0 = DESK_TOP.x / W + inset;
  const topU1 = (DESK_TOP.x + DESK_TOP.width) / W - inset;
  const legU0 = DESK_SIDE.x / W + inset;
  const legU1 = (DESK_SIDE.x + 31) / W - inset;
  const pcU0 = (DESK_SIDE.x + 32) / W + inset;
  const pcU1 = (DESK_SIDE.x + DESK_SIDE.width) / W - inset;
  const screenU0 = DESK_SCREEN.x / W + inset;
  const screenU1 = (DESK_SCREEN.x + DESK_SCREEN.width) / W - inset;
  const chairU0 = DESK_CHAIR.x / W + inset;
  const chairU1 = (DESK_CHAIR.x + DESK_CHAIR.width) / W - inset;

  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  const legFaces = {
    front: uvRect(legU0, 0.08, legU1, 0.98),
    back: uvRect(legU0, 0.08, legU1, 0.98),
    left: uvRect(legU0, 0.08, legU1, 0.98),
    right: uvRect(legU0, 0.08, legU1, 0.98),
    bottom: uvRect(legU0, 0.88, legU1, 0.98),
  };

  // 1. Desk Left Leg & Rubberized Leveling Feet (y = 0 .. 18.2)
  pushBoxPart(vertices, normals, uvs, new Vec3(-17.4, 0, -13.0), new Vec3(-14.6, 1.6, 2.0), {
    front: uvRect(legU0, 0.88, legU1, 0.99),
    back: uvRect(legU0, 0.88, legU1, 0.99),
    left: uvRect(legU0, 0.88, legU1, 0.99),
    right: uvRect(legU0, 0.88, legU1, 0.99),
    bottom: uvRect(legU0, 0.88, legU1, 0.99),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(-17.2, 1.6, -12.8), new Vec3(-14.8, 18.2, 1.8), legFaces);

  // 2. Desk Right 2-Drawer Pedestal Cabinet & Feet (x = 9.2 .. 17.4, y = 0 .. 18.2, z = -13.0 .. 2.0)
  pushBoxPart(vertices, normals, uvs, new Vec3(9.0, 0, -13.0), new Vec3(17.4, 1.6, 2.0), {
    front: uvRect(legU0, 0.88, legU1, 0.99),
    back: uvRect(legU0, 0.88, legU1, 0.99),
    left: uvRect(legU0, 0.88, legU1, 0.99),
    right: uvRect(legU0, 0.88, legU1, 0.99),
    bottom: uvRect(legU0, 0.88, legU1, 0.99),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(9.2, 1.6, -12.8), new Vec3(17.2, 18.2, 2.0), {
    front: uvRect(topU0, 0.64, topU1, 0.98),
    back: uvRect(legU0, 0.08, legU1, 0.86),
    left: uvRect(legU0, 0.08, legU1, 0.86),
    right: uvRect(legU0, 0.08, legU1, 0.86),
  });

  // 3. Rear Modesty Panel connecting left leg and right pedestal (y = 6.2 .. 18.2, z = -12.8 .. -11.2)
  pushBoxPart(vertices, normals, uvs, new Vec3(-14.8, 6.2, -12.8), new Vec3(9.2, 18.2, -11.2), {
    front: uvRect(legU0, 0.12, legU1, 0.78),
    back: uvRect(legU0, 0.12, legU1, 0.78),
    bottom: uvRect(legU0, 0.88, legU1, 0.98),
  });

  // 4. Cantilevered Beveled Desktop Slab (x = -18.0 .. 18.0, y = 18.2 .. 20.0, z = -13.5 .. 2.5)
  pushBoxPart(vertices, normals, uvs, new Vec3(-18.0, 18.2, -13.5), new Vec3(18.0, 20.0, 2.5), {
    front: uvRect(topU0, 0.56, topU1, 0.63),
    back: uvRect(topU0, 0.56, topU1, 0.63),
    left: uvRect(topU0, 0.56, topU1, 0.63),
    right: uvRect(topU0, 0.56, topU1, 0.63),
    top: uvRect(topU0, 0.02, topU1, 0.55),
    bottom: uvRect(legU0, 0.08, legU1, 0.48),
  });

  // 5. Desktop Computer Tower / Workstation CPU on the left of the desk (x = -16.8 .. -9.6, y = 20.0 .. 33.4, z = -12.2 .. -1.2)
  pushBoxPart(vertices, normals, uvs, new Vec3(-16.8, 20.0, -12.2), new Vec3(-9.6, 33.4, -1.2), {
    front: uvRect(pcU0, 0.04, pcU1, 0.96),
    back: uvRect(legU0, 0.1, legU1, 0.84),
    left: uvRect(legU0, 0.1, legU1, 0.84),
    right: uvRect(legU0, 0.1, legU1, 0.84),
    top: uvRect(topU0, 0.06, topU1, 0.48),
  });

  // 6. Monitor Tilt-Swivel Pedestal Base & Neck on top of the desk (y = 20.0 .. 23.4)
  pushBoxPart(vertices, normals, uvs, new Vec3(-2.4, 20.0, -10.2), new Vec3(5.6, 21.2, -5.0), {
    front: uvRect(topU0, 0.56, topU1, 0.63),
    back: uvRect(topU0, 0.56, topU1, 0.63),
    left: uvRect(topU0, 0.56, topU1, 0.63),
    right: uvRect(topU0, 0.56, topU1, 0.63),
    top: uvRect(topU0, 0.08, topU1, 0.46),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(-0.4, 21.2, -9.2), new Vec3(3.6, 23.4, -6.2), {
    front: uvRect(legU0, 0.14, legU1, 0.52),
    back: uvRect(legU0, 0.14, legU1, 0.52),
    left: uvRect(legU0, 0.14, legU1, 0.52),
    right: uvRect(legU0, 0.14, legU1, 0.52),
  });

  // 7. Computer CRT / Flat-Bezel Monitor Screen & Tapered Rear Casing (x = -6.4 .. 9.6, y = 23.2 .. 38.0, z = -12.6 .. -3.8)
  pushBoxPart(vertices, normals, uvs, new Vec3(-6.4, 23.2, -7.8), new Vec3(9.6, 38.0, -3.8), {
    front: uvRect(screenU0, 0.02, screenU1, 0.64),
    back: uvRect(legU0, 0.1, legU1, 0.72),
    left: uvRect(legU0, 0.1, legU1, 0.72),
    right: uvRect(legU0, 0.1, legU1, 0.72),
    top: uvRect(topU0, 0.06, topU1, 0.48),
    bottom: uvRect(legU0, 0.88, legU1, 0.98),
  });
  // Tapered rear CRT electron-gun housing
  pushBoxPart(vertices, normals, uvs, new Vec3(-4.2, 24.8, -12.6), new Vec3(7.4, 36.2, -7.8), {
    back: uvRect(legU0, 0.14, legU1, 0.68),
    left: uvRect(legU0, 0.14, legU1, 0.68),
    right: uvRect(legU0, 0.14, legU1, 0.68),
    top: uvRect(legU0, 0.14, legU1, 0.52),
    bottom: uvRect(legU0, 0.88, legU1, 0.98),
  });

  // 8. Mechanical Keyboard & Optical Mouse on the front desktop (y = 20.0 .. 21.3)
  pushBoxPart(vertices, normals, uvs, new Vec3(-5.2, 20.0, -2.5), new Vec3(7.2, 21.2, 1.7), {
    front: uvRect(topU0, 0.56, topU1, 0.63),
    back: uvRect(topU0, 0.56, topU1, 0.63),
    left: uvRect(topU0, 0.56, topU1, 0.63),
    right: uvRect(topU0, 0.56, topU1, 0.63),
    top: uvRect(screenU0, 0.67, screenU1, 0.98),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(8.8, 20.0, -1.8), new Vec3(11.4, 20.9, 1.2), {
    front: uvRect(pcU0, 0.36, pcU1, 0.5),
    back: uvRect(pcU0, 0.36, pcU1, 0.5),
    left: uvRect(pcU0, 0.36, pcU1, 0.5),
    right: uvRect(pcU0, 0.36, pcU1, 0.5),
    top: uvRect(pcU0, 0.06, pcU1, 0.34),
  });

  // 9. Swivel Office Task Chair tucked in front of the desk (centered at x = 1.2, z = 8.8, facing -Z)
  buildChairParts(vertices, normals, uvs, 1.2, 8.8, chairU0, chairU1, uvRect, false);

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D wrecked Computer Desk & Chair left standing after the workstation is shot/destroyed:
 * intact lower desk frame & drawers, ruptured computer tower stump with outward-bent metal flaps,
 * snapped monitor stand with jagged CRT screen glass shards, askew keyboard half, and damaged chair.
 */
export function deskWreckMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = DESK_ATLAS.width;
  const inset = 0.35 / W;
  const topU0 = DESK_TOP.x / W + inset;
  const topU1 = (DESK_TOP.x + DESK_TOP.width) / W - inset;
  const legU0 = DESK_SIDE.x / W + inset;
  const legU1 = (DESK_SIDE.x + 31) / W - inset;
  const pcU0 = (DESK_SIDE.x + 32) / W + inset;
  const pcU1 = (DESK_SIDE.x + DESK_SIDE.width) / W - inset;
  const screenU0 = DESK_SCREEN.x / W + inset;
  const screenU1 = (DESK_SCREEN.x + DESK_SCREEN.width) / W - inset;
  const chairU0 = DESK_CHAIR.x / W + inset;
  const chairU1 = (DESK_CHAIR.x + DESK_CHAIR.width) / W - inset;

  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  const legFaces = {
    front: uvRect(legU0, 0.08, legU1, 0.98),
    back: uvRect(legU0, 0.08, legU1, 0.98),
    left: uvRect(legU0, 0.08, legU1, 0.98),
    right: uvRect(legU0, 0.08, legU1, 0.98),
    bottom: uvRect(legU0, 0.88, legU1, 0.98),
  };

  // 1. Surviving steel desk legs, right drawer pedestal, modesty panel, and desktop slab (y = 0 .. 20.0)
  pushBoxPart(vertices, normals, uvs, new Vec3(-17.4, 0, -13.0), new Vec3(-14.6, 1.6, 2.0), legFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(-17.2, 1.6, -12.8), new Vec3(-14.8, 18.2, 1.8), legFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(9.0, 0, -13.0), new Vec3(17.4, 1.6, 2.0), legFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(9.2, 1.6, -12.8), new Vec3(17.2, 18.2, 2.0), {
    front: uvRect(topU0, 0.64, topU1, 0.98),
    back: uvRect(legU0, 0.08, legU1, 0.86),
    left: uvRect(legU0, 0.08, legU1, 0.86),
    right: uvRect(legU0, 0.08, legU1, 0.86),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(-14.8, 6.2, -12.8), new Vec3(9.2, 18.2, -11.2), {
    front: uvRect(legU0, 0.12, legU1, 0.78),
    back: uvRect(legU0, 0.12, legU1, 0.78),
    bottom: uvRect(legU0, 0.88, legU1, 0.98),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(-18.0, 18.2, -13.5), new Vec3(18.0, 20.0, 2.5), {
    front: uvRect(topU0, 0.56, topU1, 0.63),
    back: uvRect(topU0, 0.56, topU1, 0.63),
    left: uvRect(topU0, 0.56, topU1, 0.63),
    right: uvRect(topU0, 0.56, topU1, 0.63),
    top: uvRect(topU0, 0.02, topU1, 0.55),
    bottom: uvRect(legU0, 0.08, legU1, 0.48),
  });

  // 2. Ruptured lower Computer Tower chassis stump on left of desk (y = 20.0 .. 25.8)
  pushBoxPart(vertices, normals, uvs, new Vec3(-16.8, 20.0, -12.2), new Vec3(-9.6, 25.8, -1.2), {
    front: uvRect(pcU0, 0.52, pcU1, 0.96),
    back: uvRect(legU0, 0.42, legU1, 0.84),
    left: uvRect(legU0, 0.42, legU1, 0.84),
    right: uvRect(legU0, 0.42, legU1, 0.84),
    top: uvRect(screenU0, 0.68, screenU1, 0.95),
  });

  // 3. Snapped Monitor Stand & lower bezel frame with jagged CRT glass shards (y = 20.0 .. 27.6)
  pushBoxPart(vertices, normals, uvs, new Vec3(-2.4, 20.0, -10.2), new Vec3(5.6, 21.2, -5.0), {
    front: uvRect(topU0, 0.56, topU1, 0.63),
    back: uvRect(topU0, 0.56, topU1, 0.63),
    left: uvRect(topU0, 0.56, topU1, 0.63),
    right: uvRect(topU0, 0.56, topU1, 0.63),
    top: uvRect(topU0, 0.08, topU1, 0.46),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(-0.4, 21.2, -9.2), new Vec3(3.6, 24.4, -6.2), legFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(-6.2, 23.2, -7.8), new Vec3(9.4, 25.4, -3.8), {
    front: uvRect(screenU0, 0.52, screenU1, 0.64),
    back: uvRect(legU0, 0.5, legU1, 0.72),
    left: uvRect(legU0, 0.5, legU1, 0.72),
    right: uvRect(legU0, 0.5, legU1, 0.72),
    top: uvRect(screenU0, 0.2, screenU1, 0.48),
  });

  // Jagged shattered phosphor CRT glass teeth sticking up from the broken bottom monitor bezel
  for (let i = 0; i < 5; i++) {
    const x0 = -5.2 + i * 2.8;
    const x1 = x0 + 2.3;
    const xm = (x0 + x1) * 0.5;
    const tipY = 27.2 + (i % 2) * 1.4;
    const b0 = new Vec3(x0, 25.2, -5.2);
    const b1 = new Vec3(x1, 25.2, -5.2);
    const tip = new Vec3(xm, tipY, -4.7 + (i % 2) * 0.4);
    const u0 = Utils.lerp(screenU0, screenU1, 0.1 + i * 0.15);
    const u1 = Utils.lerp(screenU0, screenU1, 0.22 + i * 0.15);
    const uv0 = new Vec2(u0, 0.48);
    const uv1 = new Vec2(u1, 0.48);
    const uvTip = new Vec2((u0 + u1) * 0.5, 0.18);
    pushTri(vertices, normals, uvs, b0, b1, tip, uv0, uv1, uvTip);
    pushTri(vertices, normals, uvs, b1, b0, tip, uv1, uv0, uvTip);
  }

  // 4. Surviving askew left half of the keyboard on the desktop
  pushBoxPart(vertices, normals, uvs, new Vec3(-5.4, 20.0, -2.2), new Vec3(1.2, 21.1, 1.5), {
    front: uvRect(topU0, 0.56, topU1, 0.63),
    back: uvRect(topU0, 0.56, topU1, 0.63),
    left: uvRect(topU0, 0.56, topU1, 0.63),
    right: uvRect(topU0, 0.56, topU1, 0.63),
    top: uvRect(screenU0, 0.67, (screenU0 + screenU1) * 0.5, 0.98),
  });

  // 5. Knocked-back office chair in front of the desk (shifted slightly to z = 10.2)
  buildChairParts(vertices, normals, uvs, 1.6, 10.2, chairU0, chairU1, uvRect, true);

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D floor debris scatter mesh (`y = 0.12`) around a destroyed Computer Desk:
 * shattered phosphor CRT screen glass & keycap/circuit fragments on the floor in front of the desk.
 */
export function deskDebrisMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = DESK_ATLAS.width;
  const screenU0 = DESK_SCREEN.x / W + 0.004;
  const screenU1 = (DESK_SCREEN.x + DESK_SCREEN.width) / W - 0.004;
  const screenUC = (screenU0 + screenU1) * 0.5;
  const screenUSpan = (screenU1 - screenU0) * 0.38;

  const radii = [14.0, 17.5, 20.2, 18.4, 15.0, 12.2, 11.0, 12.8, 16.2, 19.0, 17.2, 14.8];
  const segs = radii.length;
  const center = new Vec3(0.8, 0.12, 3.8);
  const uvCenter = new Vec2(screenUC, 0.34);
  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % segs;
    const a0 = (i / segs) * Trigo.twopi;
    const a1 = (next / segs) * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const r0 = radii[i];
    const r1 = radii[next];
    const p0 = new Vec3(center.x + c0 * r0, 0.12, center.z + s0 * r0);
    const p1 = new Vec3(center.x + c1 * r1, 0.12, center.z + s1 * r1);
    const uv0 = new Vec2(screenUC + c0 * screenUSpan, 0.34 + s0 * 0.24);
    const uv1 = new Vec2(screenUC + c1 * screenUSpan, 0.34 + s1 * 0.24);
    pushTri(vertices, normals, uvs, center, p1, p0, uvCenter, uv1, uv0);
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D shrapnel pieces blasted off a destroyed Computer Desk:
 * - `monitorTop` (also aliased as `carboyTop` for unified furniture view handling): shattered upper CRT monitor housing & screen bezel.
 * - `shards`: `DESK_SHARD_COUNT` (`5`) flying fragments (2 phosphor CRT glass shards, 1 blown-off computer tower drive bay panel,
 *   1 split mechanical keyboard half, and 1 torn chair armrest pad).
 */
export function deskShrapnelParts() {
  const W = DESK_ATLAS.width;
  const inset = 0.35 / W;
  const topU0 = DESK_TOP.x / W + inset;
  const topU1 = (DESK_TOP.x + DESK_TOP.width) / W - inset;
  const legU0 = DESK_SIDE.x / W + inset;
  const legU1 = (DESK_SIDE.x + 31) / W - inset;
  const pcU0 = (DESK_SIDE.x + 32) / W + inset;
  const pcU1 = (DESK_SIDE.x + DESK_SIDE.width) / W - inset;
  const screenU0 = DESK_SCREEN.x / W + inset;
  const screenU1 = (DESK_SCREEN.x + DESK_SCREEN.width) / W - inset;
  const chairU0 = DESK_CHAIR.x / W + inset;
  const chairU1 = (DESK_CHAIR.x + DESK_CHAIR.width) / W - inset;

  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  // 1. Blasted-off upper CRT Monitor casing & screen frame (local origin centered so it tumbles naturally)
  const topVerts = [];
  const topNorms = [];
  const topUvs = [];
  pushBoxPart(topVerts, topNorms, topUvs, new Vec3(-7.4, -4.8, -2.2), new Vec3(7.4, 4.8, 2.2), {
    front: uvRect(screenU0, 0.02, screenU1, 0.48),
    back: uvRect(legU0, 0.1, legU1, 0.58),
    left: uvRect(legU0, 0.1, legU1, 0.58),
    right: uvRect(legU0, 0.1, legU1, 0.58),
    top: uvRect(topU0, 0.06, topU1, 0.48),
    bottom: uvRect(screenU0, 0.18, screenU1, 0.48),
  });
  pushBoxPart(topVerts, topNorms, topUvs, new Vec3(-5.2, -3.6, -5.6), new Vec3(5.2, 3.6, -2.2), {
    back: uvRect(legU0, 0.14, legU1, 0.58),
    left: uvRect(legU0, 0.14, legU1, 0.58),
    right: uvRect(legU0, 0.14, legU1, 0.58),
    top: uvRect(legU0, 0.14, legU1, 0.52),
    bottom: uvRect(legU0, 0.88, legU1, 0.98),
  });

  const shards = [];

  // Shards 0 & 1: Two glowing phosphor-green CRT screen glass shards
  for (let s = 0; s < 2; s++) {
    const sVerts = [];
    const sNorms = [];
    const sUvs = [];
    const su0 = Utils.lerp(screenU0, screenU1, 0.12 + s * 0.38);
    const su1 = Utils.lerp(screenU0, screenU1, 0.46 + s * 0.38);
    pushBoxPart(sVerts, sNorms, sUvs, new Vec3(-3.2, -2.4, -0.45), new Vec3(3.2, 2.4, 0.45), {
      front: uvRect(su0, 0.1, su1, 0.52),
      back: uvRect(su0, 0.1, su1, 0.52),
      left: uvRect(su0, 0.1, su1, 0.52),
      right: uvRect(su0, 0.1, su1, 0.52),
      top: uvRect(su0, 0.1, su1, 0.52),
      bottom: uvRect(su0, 0.1, su1, 0.52),
    });
    shards.push({
      vertices: new Float32Array(sVerts),
      normals: new Float32Array(sNorms),
      uvs: new Float32Array(sUvs),
    });
  }

  // Shard 2: Blown-off Computer Tower front drive-bay bezel & upper cover
  const pcVerts = [];
  const pcNorms = [];
  const pcUvs = [];
  pushBoxPart(pcVerts, pcNorms, pcUvs, new Vec3(-3.4, -3.6, -2.4), new Vec3(3.4, 3.6, 2.4), {
    front: uvRect(pcU0, 0.04, pcU1, 0.52),
    back: uvRect(legU0, 0.1, legU1, 0.52),
    left: uvRect(legU0, 0.1, legU1, 0.52),
    right: uvRect(legU0, 0.1, legU1, 0.52),
    top: uvRect(topU0, 0.06, topU1, 0.48),
    bottom: uvRect(legU0, 0.88, legU1, 0.98),
  });
  shards.push({
    vertices: new Float32Array(pcVerts),
    normals: new Float32Array(pcNorms),
    uvs: new Float32Array(pcUvs),
  });

  // Shard 3: Broken right half of the mechanical keyboard
  const kbVerts = [];
  const kbNorms = [];
  const kbUvs = [];
  pushBoxPart(kbVerts, kbNorms, kbUvs, new Vec3(-3.2, -0.7, -2.0), new Vec3(3.2, 0.7, 2.0), {
    front: uvRect(topU0, 0.56, topU1, 0.63),
    back: uvRect(topU0, 0.56, topU1, 0.63),
    left: uvRect(topU0, 0.56, topU1, 0.63),
    right: uvRect(topU0, 0.56, topU1, 0.63),
    top: uvRect((screenU0 + screenU1) * 0.5, 0.67, screenU1, 0.98),
    bottom: uvRect(legU0, 0.88, legU1, 0.98),
  });
  shards.push({
    vertices: new Float32Array(kbVerts),
    normals: new Float32Array(kbNorms),
    uvs: new Float32Array(kbUvs),
  });

  // Shard 4: Torn chair armrest & cushion bolster
  const armVerts = [];
  const armNorms = [];
  const armUvs = [];
  pushBoxPart(armVerts, armNorms, armUvs, new Vec3(-1.2, -1.0, -3.8), new Vec3(1.2, 1.0, 3.8), {
    front: uvRect(chairU0, 0.04, chairU1, 0.66),
    back: uvRect(chairU0, 0.04, chairU1, 0.66),
    left: uvRect(chairU0, 0.04, chairU1, 0.66),
    right: uvRect(chairU0, 0.04, chairU1, 0.66),
    top: uvRect(chairU0, 0.04, chairU1, 0.66),
    bottom: uvRect(chairU0, 0.72, chairU1, 0.96),
  });
  shards.push({
    vertices: new Float32Array(armVerts),
    normals: new Float32Array(armNorms),
    uvs: new Float32Array(armUvs),
  });

  const monitorTop = {
    vertices: new Float32Array(topVerts),
    normals: new Float32Array(topNorms),
    uvs: new Float32Array(topUvs),
  };

  return {
    monitorTop,
    carboyTop: monitorTop,
    shards,
  };
}

/** Pre-allocates a reusable pose structure for `deskBreakPose`. */
export function createDeskBreakPose() {
  const shards = [];
  for (let i = 0; i < DESK_SHARD_COUNT; i++)
    shards.push({ pos: new Vec3(), rot: new Vec3() });
  const monitorTop = { pos: new Vec3(), rot: new Vec3() };
  return {
    wreckScale: new Vec3(1, 1, 1),
    wreckRot: new Vec3(0, 0, 0),
    puddleScale: new Vec3(1, 1, 1),
    monitorTop,
    carboyTop: monitorTop,
    shards,
  };
}

/**
 * Computes the 3D transforms for a destroyed Computer Desk's lower desk/chair wreck, spreading floor debris,
 * tumbling CRT monitor housing, and 5 flying shards at `elapsed` seconds after destruction, writing into `target`
 * with zero allocations.
 */
export function deskBreakPose(elapsed, seed = 0, target = createDeskBreakPose()) {
  const t = Math.max(0, elapsed);

  // 1. Desk & chair wreck jolt: shudders on impact during the first 0.18s, then settles
  const jolt = t < 0.18 ? Math.sin((t / 0.18) * Trigo.pi) : 0;
  target.wreckScale.setScalar(1 + jolt * 0.08, 1 - jolt * 0.06, 1 + jolt * 0.08);
  target.wreckRot.setScalar(jolt * 0.05 * Math.sin(seed * 3), 0, jolt * 0.05 * Math.cos(seed * 3));

  // 2. Shattered CRT glass & keycap debris field spreads across the floor over the first 0.45s
  const debrisSpread = Utils.smoothstep(0, 0.45, t);
  const dScale = 0.2 + 0.8 * debrisSpread;
  target.puddleScale.setScalar(dScale, 1, dScale);

  // 3. Upper CRT monitor shell: blasts upward from the desk at y = 31, tumbles forward into the room (+Z), and settles
  const topDuration = 0.84;
  const topSpread = Math.sin(seed * 2.7 + 0.5) * 0.58;
  const topDist = 16 + ((Math.cos(seed * 4.1) + 1) * 0.5) * 7;
  const topEndX = 1.6 + Math.sin(topSpread) * topDist;
  const topEndZ = Math.max(4.0, Math.cos(topSpread) * topDist);
  writeBallisticArc(
    target.monitorTop.pos,
    target.monitorTop.rot,
    1.6,
    31.0,
    -6.0,
    topEndX,
    3.2,
    topEndZ,
    Trigo.pi * 2.2,
    topSpread + Trigo.pi * 0.9,
    Trigo.pi * 1.5,
    Trigo.halfpi - 0.14,
    topSpread + 0.45,
    0.18,
    t / topDuration,
    13,
  );

  // 4. Five shards (2 CRT screen glass shards + PC tower cover + keyboard half + chair armrest) fly out into +Z / ±X
  for (let i = 0; i < DESK_SHARD_COUNT; i++) {
    const shard = target.shards[i];
    const hash = Math.sin(seed * 2.3 + i * 3.57) * 0.5 + 0.5;
    const fan = ((i / (DESK_SHARD_COUNT - 1)) - 0.5) * Trigo.pi * 0.78 + (hash - 0.5) * 0.24;
    const startX = i === 2 ? -13.2 : i === 3 ? 4.0 : i === 4 ? 7.8 : -1.0 + i * 4.5;
    const startY = i < 2 ? 30.0 + i * 2.0 : i === 2 ? 29.5 : i === 3 ? 21.0 : 19.5;
    const startZ = i === 4 ? 8.8 : i === 3 ? -0.5 : -5.5;
    const dist = 15 + hash * 13 + (i % 2) * 3.5;
    const duration = 0.6 + hash * 0.22;
    const peakLift = 9 + (1 - hash) * 10;
    const dirSign = i % 2 === 0 ? 1 : -1;
    writeBallisticArc(
      shard.pos,
      shard.rot,
      startX,
      startY,
      startZ,
      Math.sin(fan) * dist,
      0.9,
      Math.max(3.5, Math.cos(fan) * dist),
      dirSign * Trigo.pi * (2.1 + hash),
      fan + dirSign * 1.4,
      -dirSign * Trigo.pi * 1.6,
      Trigo.halfpi - 0.1,
      fan + 0.3 * dirSign,
      (hash - 0.5) * 0.22,
      t / duration,
      peakLift,
    );
  }

  return target;
}

function drawOvenFront(rnd) {
  const t = new Tile(OVEN_FRONT.width, OVEN_FRONT.height);
  plate(t, 0, 0, OVEN_FRONT.width, OVEN_FRONT.height, rnd, STAINLESS_BASE);

  // Dark base kickplate (y = 56..63)
  t.rect(1, 56, 62, 7, KICKPLATE, 0.92);

  // Upper control manifold bezel (y = 3..14) with 6 rotary burner/oven dials and digital timer LED
  t.rect(4, 3, 56, 11, STAINLESS_DARK, 0.9);
  for (let x = 4; x < 60; x++) {
    t.set(x, 3, SHADOW, 0.85);
    t.set(x, 13, STAINLESS_LIGHT, 0.65);
  }
  // Center digital timer display (green LED) + heating indicator lamps
  t.rect(25, 5, 14, 6, KICKPLATE, 0.95);
  t.rect(27, 7, 10, 2, LED_GREEN, 0.95);
  t.rect(41, 7, 3, 3, BURNER_GLOW, 0.95);
  // Rotary dial knobs along left and right of manifold
  for (const kx of [8, 14, 20, 46, 52]) {
    t.rect(kx, 6, 4, 5, KICKPLATE, 0.92);
    t.rect(kx + 1, 7, 2, 3, STAINLESS_LIGHT, 0.8);
  }

  // Main Insulated Oven Door frame (x = 5..58, y = 16..46)
  t.rect(5, 16, 54, 30, STAINLESS_LIGHT, 0.35);
  for (let x = 5; x < 59; x++) {
    t.set(x, 16, STAINLESS_LIGHT, 0.8);
    t.set(x, 45, SHADOW, 0.85);
  }
  // Double-glazed tempered oven window (x = 11..52, y = 21..39) with glowing amber baking cavity & wire rack
  t.rect(11, 21, 42, 18, BURNER_COAL, 0.95);
  for (let y = 23; y <= 37; y++)
    for (let x = 13; x <= 50; x++) {
      const glow = Math.sin(((x - 13) / 37) * Trigo.pi) * Math.sin(((y - 23) / 14) * Trigo.pi);
      const col = mix(CHAIR_AMBER_DARK, BURNER_HOT, glow * 0.78);
      t.set(x, y, col, 0.92);
    }
  // Interior wire baking racks inside the window
  for (const ry of [28, 34])
    for (let x = 13; x <= 50; x += 2)
      t.set(x, ry, STAINLESS_LIGHT, 0.85);

  // Lower warming drawer panel (x = 6..57, y = 48..54)
  t.rect(6, 48, 52, 6, STAINLESS_DARK, 0.75);
  t.rect(22, 50, 20, 2, STAINLESS_LIGHT, 0.8);

  for (const [rx, ry] of [[4, 18], [59, 18], [4, 43], [59, 43]])
    rivet(t, rx, ry);

  rust(t, rnd, 0.14);
  return t;
}

function drawOvenSide(rnd) {
  const t = new Tile(OVEN_SIDE.width, OVEN_SIDE.height);
  plate(t, 0, 0, OVEN_SIDE.width, OVEN_SIDE.height, rnd, STAINLESS_BASE);
  t.rect(1, 56, 62, 7, KICKPLATE, 0.92);
  for (let ly = 18; ly <= 42; ly += 4)
    for (let lx = 12; lx < 52; lx++) {
      t.set(lx, ly, STAINLESS_DARK, 0.88);
      t.set(lx, ly + 1, STAINLESS_LIGHT, 0.5);
    }
  for (const [rx, ry] of [[5, 6], [58, 6], [5, 50], [58, 50]])
    rivet(t, rx, ry);
  rust(t, rnd, 0.16);
  return t;
}

function drawOvenCooktop(rnd) {
  const t = new Tile(OVEN_COOKTOP.width, OVEN_COOKTOP.height);
  plate(t, 0, 0, OVEN_COOKTOP.width, OVEN_COOKTOP.height, rnd, STAINLESS_DARK);

  // Recessed black-enameled burner drip pan (x = 3..60, y = 3..60)
  t.rect(3, 3, 58, 58, BURNER_COAL, 0.92);

  // Four industrial circular heating elements with glowing orange-red coils & cast-iron spider grates
  for (const [cx, cy] of [[18, 18], [46, 18], [18, 46], [46, 46]]) {
    for (let dy = -11; dy <= 11; dy++)
      for (let dx = -11; dx <= 11; dx++) {
        const r = Math.hypot(dx, dy);
        if (r > 11)
          continue;
        if (Math.abs(r - 8.5) < 1.3 || Math.abs(r - 4.8) < 1.2)
          t.set(cx + dx, cy + dy, BURNER_HOT, 0.95);
        else if (r < 10)
          t.set(cx + dx, cy + dy, BURNER_GLOW, 0.45);
      }
    // Cross spider grate bars over each burner
    for (let i = -11; i <= 11; i++) {
      t.set(cx + i, cy, STAINLESS_BASE, 0.9);
      t.set(cx, cy + i, STAINLESS_BASE, 0.9);
    }
  }

  return t;
}

function drawOvenTrim(rnd) {
  const t = new Tile(OVEN_TRIM.width, OVEN_TRIM.height);
  plate(t, 0, 0, OVEN_TRIM.width, OVEN_TRIM.height, rnd, STAINLESS_LIGHT);
  // Chrome tubular handle & stockpot brushed steel band (y = 0..28)
  for (let y = 2; y < 28; y++)
    for (let x = 2; x < 62; x++) {
      const sheen = Math.sin((y / 28) * Trigo.pi) * 0.35;
      t.set(x, y, COLD_LIGHT, sheen);
    }
  // Exhaust flue louver slots (y = 32..60)
  t.rect(2, 30, 60, 32, STAINLESS_BASE, 0.85);
  for (let ly = 35; ly <= 55; ly += 4)
    for (let lx = 8; lx < 56; lx++) {
      t.set(lx, ly, KICKPLATE, 0.9);
      t.set(lx, ly + 1, STAINLESS_LIGHT, 0.65);
    }
  rust(t, rnd, 0.12);
  return t;
}

/**
 * Returns the power-of-two RGBA texture atlas (256 x 64) for the 3D Kitchen Oven furniture prop.
 */
export function ovenAtlas() {
  const { width, height } = OVEN_ATLAS;
  const data = new Uint8Array(width * height * 4);
  const blit = (tile, x0) => {
    for (let y = 0; y < tile.height; y++)
      for (let x = 0; x < tile.width; x++) {
        const i = (y * tile.width + x) * 3;
        const o = (y * width + x0 + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  };
  blit(drawOvenFront(mulberry32(8401)), OVEN_FRONT.x);
  blit(drawOvenSide(mulberry32(8402)), OVEN_SIDE.x);
  blit(drawOvenCooktop(mulberry32(8403)), OVEN_COOKTOP.x);
  blit(drawOvenTrim(mulberry32(8404)), OVEN_TRIM.x);
  return {
    name: 'oven',
    data,
    width,
    height,
    front: OVEN_FRONT,
    side: OVEN_SIDE,
    cooktop: OVEN_COOKTOP,
    trim: OVEN_TRIM,
  };
}

/**
 * Builds the 3D Kitchen Oven mesh standing on `y = 0`, centered on `x/z`, with the oven door facing `+Z`:
 * - Commercial stainless-steel range body (`y = 0..26.8`), protruding oven window door & chrome handle, rotary control knobs,
 *   4-burner cast-iron stove grates (`y = 26.8..28.0`), stainless stockpot (`y = 28.0..33.2`), and rear exhaust flue (`y = 26.8..36.0`).
 */
export function ovenMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = OVEN_ATLAS.width;
  const inset = 0.35 / W;
  const frontU0 = OVEN_FRONT.x / W + inset;
  const frontU1 = (OVEN_FRONT.x + OVEN_FRONT.width) / W - inset;
  const sideU0 = OVEN_SIDE.x / W + inset;
  const sideU1 = (OVEN_SIDE.x + OVEN_SIDE.width) / W - inset;
  const cookU0 = OVEN_COOKTOP.x / W + inset;
  const cookU1 = (OVEN_COOKTOP.x + OVEN_COOKTOP.width) / W - inset;
  const trimU0 = OVEN_TRIM.x / W + inset;
  const trimU1 = (OVEN_TRIM.x + OVEN_TRIM.width) / W - inset;
  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  // 1. Heavy-duty leveling feet & base kickplate (y = 0 .. 2.4)
  pushBoxPart(vertices, normals, uvs, new Vec3(-12.4, 0, -10.4), new Vec3(12.4, 2.4, 9.6), {
    front: uvRect(frontU0, 0.88, frontU1, 0.99),
    back: uvRect(sideU0, 0.88, sideU1, 0.99),
    left: uvRect(sideU0, 0.88, sideU1, 0.99),
    right: uvRect(sideU0, 0.88, sideU1, 0.99),
    bottom: uvRect(sideU0, 0.88, sideU1, 0.99),
  });

  // 2. Main Stainless-Steel Range Cabinet Body (x = -13.0 .. 13.0, y = 2.4 .. 26.8, z = -11.0 .. 9.8)
  pushBoxPart(vertices, normals, uvs, new Vec3(-13.0, 2.4, -11.0), new Vec3(13.0, 26.8, 9.8), {
    front: uvRect(frontU0, 0.04, frontU1, 0.88),
    back: uvRect(sideU0, 0.04, sideU1, 0.88),
    left: uvRect(sideU0, 0.04, sideU1, 0.88),
    right: uvRect(sideU0, 0.04, sideU1, 0.88),
    top: uvRect(cookU0, 0.04, cookU1, 0.96),
  });

  // 3. Protruding Insulated Oven Window Door & Chrome Grab Handle (z = 9.8 .. 12.2)
  pushBoxPart(vertices, normals, uvs, new Vec3(-11.4, 6.2, 9.8), new Vec3(11.4, 21.4, 11.0), {
    front: uvRect(frontU0 + (frontU1 - frontU0) * 0.08, 0.25, frontU1 - (frontU1 - frontU0) * 0.08, 0.72),
    left: uvRect(sideU0, 0.2, sideU1, 0.7),
    right: uvRect(sideU0, 0.2, sideU1, 0.7),
    top: uvRect(trimU0, 0.05, trimU1, 0.42),
    bottom: uvRect(sideU0, 0.88, sideU1, 0.98),
  });
  // Chrome tubular oven door handle bar & standoffs
  const chromeFaces = {
    front: uvRect(trimU0, 0.05, trimU1, 0.42),
    back: uvRect(trimU0, 0.05, trimU1, 0.42),
    left: uvRect(trimU0, 0.05, trimU1, 0.42),
    right: uvRect(trimU0, 0.05, trimU1, 0.42),
    top: uvRect(trimU0, 0.05, trimU1, 0.42),
    bottom: uvRect(trimU0, 0.05, trimU1, 0.42),
  };
  pushBoxPart(vertices, normals, uvs, new Vec3(-9.6, 19.6, 11.0), new Vec3(9.6, 20.8, 12.2), chromeFaces);

  // 4. Rotary Temperature Control Dials along the front manifold (y = 23.0 .. 25.0, z = 9.8 .. 11.0)
  for (const kx of [-9.2, -5.8, -2.4, 5.8, 9.2])
    pushBoxPart(vertices, normals, uvs, new Vec3(kx - 0.9, 23.2, 9.8), new Vec3(kx + 0.9, 25.0, 11.0), chromeFaces);

  // 5. Raised 4-Burner Cast-Iron Grates (y = 26.8 .. 27.9) + Stainless Stockpot on front-left burner (y = 27.9 .. 33.2)
  pushBoxPart(vertices, normals, uvs, new Vec3(-11.6, 26.8, -6.8), new Vec3(-1.2, 27.9, 8.4), {
    front: uvRect(cookU0, 0.1, cookU1, 0.3),
    back: uvRect(cookU0, 0.1, cookU1, 0.3),
    left: uvRect(cookU0, 0.1, cookU1, 0.3),
    right: uvRect(cookU0, 0.1, cookU1, 0.3),
    top: uvRect(cookU0, 0.04, (cookU0 + cookU1) * 0.5, 0.96),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(1.2, 26.8, -6.8), new Vec3(11.6, 27.9, 8.4), {
    front: uvRect(cookU0, 0.1, cookU1, 0.3),
    back: uvRect(cookU0, 0.1, cookU1, 0.3),
    left: uvRect(cookU0, 0.1, cookU1, 0.3),
    right: uvRect(cookU0, 0.1, cookU1, 0.3),
    top: uvRect((cookU0 + cookU1) * 0.5, 0.04, cookU1, 0.96),
  });
  // Cylindrical stainless stockpot with lid on the front-left burner
  pushCylinderAt(vertices, normals, uvs, -6.4, 3.8, 27.9, 33.2, 3.6, 3.6, trimU0, trimU1, 0.05, 0.42, 10);
  pushBoxPart(vertices, normals, uvs, new Vec3(-10.0, 33.2, 0.2), new Vec3(-2.8, 33.8, 7.4), chromeFaces);

  // 6. Rear Stainless Exhaust Backsplash & Flue Riser (x = -13.0 .. 13.0, y = 26.8 .. 36.0, z = -11.0 .. -7.6)
  pushBoxPart(vertices, normals, uvs, new Vec3(-13.0, 26.8, -11.0), new Vec3(13.0, 36.0, -7.6), {
    front: uvRect(trimU0, 0.48, trimU1, 0.96),
    back: uvRect(sideU0, 0.06, sideU1, 0.48),
    left: uvRect(sideU0, 0.06, sideU1, 0.48),
    right: uvRect(sideU0, 0.06, sideU1, 0.48),
    top: uvRect(trimU0, 0.05, trimU1, 0.42),
  });

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D wrecked Kitchen Oven left standing after destruction:
 * scorched lower range cabinet with blown-open dark baking cavity, bent side walls, and cracked burner deck.
 */
export function ovenWreckMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = OVEN_ATLAS.width;
  const inset = 0.35 / W;
  const frontU0 = OVEN_FRONT.x / W + inset;
  const frontU1 = (OVEN_FRONT.x + OVEN_FRONT.width) / W - inset;
  const sideU0 = OVEN_SIDE.x / W + inset;
  const sideU1 = (OVEN_SIDE.x + OVEN_SIDE.width) / W - inset;
  const cookU0 = OVEN_COOKTOP.x / W + inset;
  const cookU1 = (OVEN_COOKTOP.x + OVEN_COOKTOP.width) / W - inset;
  const trimU0 = OVEN_TRIM.x / W + inset;
  const trimU1 = (OVEN_TRIM.x + OVEN_TRIM.width) / W - inset;
  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  pushBoxPart(vertices, normals, uvs, new Vec3(-12.4, 0, -10.4), new Vec3(12.4, 2.4, 9.6), {
    front: uvRect(frontU0, 0.88, frontU1, 0.99),
    back: uvRect(sideU0, 0.88, sideU1, 0.99),
    left: uvRect(sideU0, 0.88, sideU1, 0.99),
    right: uvRect(sideU0, 0.88, sideU1, 0.99),
    bottom: uvRect(sideU0, 0.88, sideU1, 0.99),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(-13.0, 2.4, -11.0), new Vec3(13.0, 24.2, 9.2), {
    front: uvRect(frontU0 + (frontU1 - frontU0) * 0.16, 0.32, frontU1 - (frontU1 - frontU0) * 0.16, 0.62),
    back: uvRect(sideU0, 0.12, sideU1, 0.88),
    left: uvRect(sideU0, 0.12, sideU1, 0.88),
    right: uvRect(sideU0, 0.12, sideU1, 0.88),
    top: uvRect(cookU0, 0.04, cookU1, 0.96),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(-13.0, 24.2, -11.0), new Vec3(13.0, 30.2, -7.8), {
    front: uvRect(trimU0, 0.48, trimU1, 0.96),
    back: uvRect(sideU0, 0.06, sideU1, 0.48),
    left: uvRect(sideU0, 0.06, sideU1, 0.48),
    right: uvRect(sideU0, 0.06, sideU1, 0.48),
    top: uvRect(sideU0, 0.88, sideU1, 0.98),
  });

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D floor debris mesh (`y = 0.12`) around a destroyed Kitchen Oven:
 * scorched soot, shattered oven glass, and glowing burner embers on the floor.
 */
export function ovenDebrisMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = OVEN_ATLAS.width;
  const cookU0 = OVEN_COOKTOP.x / W + 0.004;
  const cookU1 = (OVEN_COOKTOP.x + OVEN_COOKTOP.width) / W - 0.004;
  const cookUC = (cookU0 + cookU1) * 0.5;
  const cookUSpan = (cookU1 - cookU0) * 0.38;

  const radii = [14.5, 17.8, 20.6, 22.0, 19.2, 15.8, 12.5, 11.4, 13.0, 16.4, 19.5, 16.8];
  const segs = radii.length;
  const center = new Vec3(0.4, 0.12, 4.8);
  const uvCenter = new Vec2(cookUC, 0.5);
  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % segs;
    const a0 = (i / segs) * Trigo.twopi;
    const a1 = (next / segs) * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const r0 = radii[i];
    const r1 = radii[next];
    const p0 = new Vec3(center.x + c0 * r0, 0.12, center.z + s0 * r0);
    const p1 = new Vec3(center.x + c1 * r1, 0.12, center.z + s1 * r1);
    const uv0 = new Vec2(cookUC + c0 * cookUSpan, 0.5 + s0 * 0.35);
    const uv1 = new Vec2(cookUC + c1 * cookUSpan, 0.5 + s1 * 0.35);
    pushTri(vertices, normals, uvs, center, p1, p0, uvCenter, uv1, uv0);
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D shrapnel pieces blasted off a destroyed Kitchen Oven:
 * - `carboyTop`: blown-off insulated oven window door.
 * - `shards`: `OVEN_SHARD_COUNT` (`5`) flying fragments (stainless stockpot, 2 cast-iron burner grates, flue hood cover, and control manifold).
 */
export function ovenShrapnelParts() {
  const W = OVEN_ATLAS.width;
  const inset = 0.35 / W;
  const frontU0 = OVEN_FRONT.x / W + inset;
  const frontU1 = (OVEN_FRONT.x + OVEN_FRONT.width) / W - inset;
  const sideU0 = OVEN_SIDE.x / W + inset;
  const sideU1 = (OVEN_SIDE.x + OVEN_SIDE.width) / W - inset;
  const cookU0 = OVEN_COOKTOP.x / W + inset;
  const cookU1 = (OVEN_COOKTOP.x + OVEN_COOKTOP.width) / W - inset;
  const trimU0 = OVEN_TRIM.x / W + inset;
  const trimU1 = (OVEN_TRIM.x + OVEN_TRIM.width) / W - inset;
  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  // 1. Blown-off insulated oven window door
  const topVerts = [];
  const topNorms = [];
  const topUvs = [];
  pushBoxPart(topVerts, topNorms, topUvs, new Vec3(-10.8, -7.2, -0.9), new Vec3(10.8, 7.2, 0.9), {
    front: uvRect(frontU0 + (frontU1 - frontU0) * 0.08, 0.25, frontU1 - (frontU1 - frontU0) * 0.08, 0.72),
    back: uvRect(sideU0, 0.2, sideU1, 0.7),
    left: uvRect(sideU0, 0.2, sideU1, 0.7),
    right: uvRect(sideU0, 0.2, sideU1, 0.7),
    top: uvRect(trimU0, 0.05, trimU1, 0.42),
    bottom: uvRect(sideU0, 0.88, sideU1, 0.98),
  });

  const shards = [];
  // Shard 0: Flying stainless stockpot
  const potVerts = [];
  const potNorms = [];
  const potUvs = [];
  pushCylinderAt(potVerts, potNorms, potUvs, 0, 0, -2.6, 2.6, 3.4, 3.4, trimU0, trimU1, 0.05, 0.42, 8);
  shards.push({ vertices: new Float32Array(potVerts), normals: new Float32Array(potNorms), uvs: new Float32Array(potUvs) });

  // Shards 1 & 2: Two cast-iron stovetop burner grates
  for (let s = 0; s < 2; s++) {
    const gVerts = [];
    const gNorms = [];
    const gUvs = [];
    pushBoxPart(gVerts, gNorms, gUvs, new Vec3(-4.5, -0.6, -4.5), new Vec3(4.5, 0.6, 4.5), {
      front: uvRect(cookU0, 0.1, cookU1, 0.3),
      back: uvRect(cookU0, 0.1, cookU1, 0.3),
      left: uvRect(cookU0, 0.1, cookU1, 0.3),
      right: uvRect(cookU0, 0.1, cookU1, 0.3),
      top: uvRect(cookU0, 0.04, cookU1, 0.96),
      bottom: uvRect(cookU0, 0.04, cookU1, 0.96),
    });
    shards.push({ vertices: new Float32Array(gVerts), normals: new Float32Array(gNorms), uvs: new Float32Array(gUvs) });
  }

  // Shard 3: Blown-off upper control manifold strip with dials
  const mVerts = [];
  const mNorms = [];
  const mUvs = [];
  pushBoxPart(mVerts, mNorms, mUvs, new Vec3(-8.5, -1.8, -0.8), new Vec3(8.5, 1.8, 0.8), {
    front: uvRect(frontU0, 0.04, frontU1, 0.24),
    back: uvRect(sideU0, 0.88, sideU1, 0.98),
    left: uvRect(sideU0, 0.1, sideU1, 0.3),
    right: uvRect(sideU0, 0.1, sideU1, 0.3),
    top: uvRect(trimU0, 0.05, trimU1, 0.42),
    bottom: uvRect(sideU0, 0.88, sideU1, 0.98),
  });
  shards.push({ vertices: new Float32Array(mVerts), normals: new Float32Array(mNorms), uvs: new Float32Array(mUvs) });

  // Shard 4: Torn exhaust flue cap
  const fVerts = [];
  const fNorms = [];
  const fUvs = [];
  pushBoxPart(fVerts, fNorms, fUvs, new Vec3(-6.2, -2.2, -1.4), new Vec3(6.2, 2.2, 1.4), {
    front: uvRect(trimU0, 0.48, trimU1, 0.96),
    back: uvRect(sideU0, 0.1, sideU1, 0.48),
    left: uvRect(sideU0, 0.1, sideU1, 0.48),
    right: uvRect(sideU0, 0.1, sideU1, 0.48),
    top: uvRect(trimU0, 0.05, trimU1, 0.42),
    bottom: uvRect(sideU0, 0.88, sideU1, 0.98),
  });
  shards.push({ vertices: new Float32Array(fVerts), normals: new Float32Array(fNorms), uvs: new Float32Array(fUvs) });

  return {
    carboyTop: {
      vertices: new Float32Array(topVerts),
      normals: new Float32Array(topNorms),
      uvs: new Float32Array(topUvs),
    },
    shards,
  };
}

/** Pre-allocates a reusable pose structure for `ovenBreakPose`. */
export function createOvenBreakPose() {
  return createDispenserBreakPose();
}

/**
 * Computes the 3D transforms for a destroyed Kitchen Oven's wreck, soot/ember floor debris,
 * blown-off oven door, and 5 flying shards at `elapsed` seconds after destruction, writing into `target`.
 */
export function ovenBreakPose(elapsed, seed = 0, target = createOvenBreakPose()) {
  return dispenserBreakPose(elapsed, seed + 1.7, target);
}

function drawSinkFront(rnd) {
  const t = new Tile(SINK_FRONT.width, SINK_FRONT.height);
  plate(t, 0, 0, SINK_FRONT.width, SINK_FRONT.height, rnd, STAINLESS_BASE);
  t.rect(1, 56, 62, 7, KICKPLATE, 0.92);

  // Upper sink apron band (y = 3..18)
  t.rect(3, 3, 58, 15, STAINLESS_LIGHT, 0.4);
  for (let x = 3; x < 61; x++)
    t.set(x, 18, SHADOW, 0.85);

  // Twin recessed under-sink cabinet service doors (y = 21..54)
  for (const [dx, dw] of [[5, 25], [34, 25]]) {
    t.rect(dx, 21, dw, 33, STAINLESS_DARK, 0.55);
    for (let x = dx; x < dx + dw; x++) {
      t.set(x, 21, STAINLESS_LIGHT, 0.65);
      t.set(x, 53, SHADOW, 0.85);
    }
  }
  // Vertical chrome pull handles near the center seam
  t.rect(26, 28, 2, 10, COLD_LIGHT, 0.85);
  t.rect(36, 28, 2, 10, COLD_LIGHT, 0.85);

  for (const [rx, ry] of [[4, 5], [59, 5], [4, 51], [59, 51]])
    rivet(t, rx, ry);

  rust(t, rnd, 0.14);
  return t;
}

function drawSinkSide(rnd) {
  const t = new Tile(SINK_SIDE.width, SINK_SIDE.height);
  plate(t, 0, 0, SINK_SIDE.width, SINK_SIDE.height, rnd, STAINLESS_BASE);
  t.rect(1, 56, 62, 7, KICKPLATE, 0.92);
  for (let x = 3; x < 61; x++) {
    t.set(x, 20, SHADOW, 0.75);
    t.set(x, 21, STAINLESS_LIGHT, 0.6);
  }
  for (const [rx, ry] of [[5, 6], [58, 6], [5, 50], [58, 50]])
    rivet(t, rx, ry);
  rust(t, rnd, 0.15);
  return t;
}

function drawSinkTop(rnd) {
  const t = new Tile(SINK_TOP.width, SINK_TOP.height);
  plate(t, 0, 0, SINK_TOP.width, SINK_TOP.height, rnd, STAINLESS_LIGHT);

  // Left half (x = 0..31): Ribbed stainless-steel drainboard grooves
  for (let gy = 8; gy <= 54; gy += 4)
    for (let gx = 4; gx < 28; gx++) {
      t.set(gx, gy, STAINLESS_DARK, 0.85);
      t.set(gx, gy + 1, COLD_LIGHT, 0.55);
    }

  // Right half (x = 32..63): Brushed basin walls, chrome faucet trim & hot/cold handle badges
  t.rect(33, 4, 28, 40, STAINLESS_BASE, 0.7);
  // Cold-blue & hot-red valve badges at bottom of cell (y = 46..62)
  t.rect(34, 46, 13, 15, COLD_BLUE, 0.92);
  t.rect(49, 46, 13, 15, HOT_RED, 0.92);

  return t;
}

function drawSinkWater(rnd) {
  return drawBottle(rnd);
}

/**
 * Returns the power-of-two RGBA texture atlas (256 x 64) for the 3D Kitchen Sink furniture prop.
 */
export function sinkAtlas() {
  const { width, height } = SINK_ATLAS;
  const data = new Uint8Array(width * height * 4);
  const blit = (tile, x0) => {
    for (let y = 0; y < tile.height; y++)
      for (let x = 0; x < tile.width; x++) {
        const i = (y * tile.width + x) * 3;
        const o = (y * width + x0 + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  };
  blit(drawSinkFront(mulberry32(8501)), SINK_FRONT.x);
  blit(drawSinkSide(mulberry32(8502)), SINK_SIDE.x);
  blit(drawSinkTop(mulberry32(8503)), SINK_TOP.x);
  blit(drawSinkWater(mulberry32(8504)), SINK_WATER.x);
  return {
    name: 'sink',
    data,
    width,
    height,
    front: SINK_FRONT,
    side: SINK_SIDE,
    top: SINK_TOP,
    water: SINK_WATER,
  };
}

/**
 * Builds the 3D Kitchen Sink mesh standing on `y = 0`, centered on `x/z`, with the cabinet doors facing `+Z`:
 * - Commercial stainless-steel under-sink cabinet (`y = 0..18.0`), left ribbed drainboard (`x = -15..-4.2, y = 18..26.5`),
 *   recessed deep wash basin (`x = -4.2..12.2`) with standing soapy water at `y = 21.5`, rear backsplash (`y = 26.5..31.2`),
 *   and high-arc gooseneck chrome faucet with hot/cold handles reaching `y = 36.0`.
 */
export function sinkMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = SINK_ATLAS.width;
  const inset = 0.35 / W;
  const frontU0 = SINK_FRONT.x / W + inset;
  const frontU1 = (SINK_FRONT.x + SINK_FRONT.width) / W - inset;
  const sideU0 = SINK_SIDE.x / W + inset;
  const sideU1 = (SINK_SIDE.x + SINK_SIDE.width) / W - inset;
  const drainU0 = SINK_TOP.x / W + inset;
  const drainU1 = (SINK_TOP.x + 31) / W - inset;
  const chromeU0 = (SINK_TOP.x + 32) / W + inset;
  const chromeU1 = (SINK_TOP.x + SINK_TOP.width) / W - inset;
  const waterU0 = SINK_WATER.x / W + inset;
  const waterU1 = (SINK_WATER.x + SINK_WATER.width) / W - inset;
  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  // 1. Base kickplate & lower under-sink cabinet (x = -15.0 .. 15.0, y = 0 .. 18.0, z = -11.0 .. 10.6)
  pushBoxPart(vertices, normals, uvs, new Vec3(-14.6, 0, -10.6), new Vec3(14.6, 2.2, 10.2), {
    front: uvRect(frontU0, 0.88, frontU1, 0.99),
    back: uvRect(sideU0, 0.88, sideU1, 0.99),
    left: uvRect(sideU0, 0.88, sideU1, 0.99),
    right: uvRect(sideU0, 0.88, sideU1, 0.99),
    bottom: uvRect(sideU0, 0.88, sideU1, 0.99),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(-15.0, 2.2, -11.0), new Vec3(15.0, 18.0, 10.6), {
    front: uvRect(frontU0, 0.32, frontU1, 0.88),
    back: uvRect(sideU0, 0.32, sideU1, 0.88),
    left: uvRect(sideU0, 0.32, sideU1, 0.88),
    right: uvRect(sideU0, 0.32, sideU1, 0.88),
  });

  // 2. Upper Countertop: Left Ribbed Drainboard (`x = -15.0 .. -3.8`) & Recessed Wash Basin Walls (`x = -3.8 .. 15.0, y = 18.0 .. 26.5`)
  // Left drainboard block
  pushBoxPart(vertices, normals, uvs, new Vec3(-15.0, 18.0, -11.0), new Vec3(-3.8, 26.5, 11.0), {
    front: uvRect(frontU0, 0.04, (frontU0 + frontU1) * 0.45, 0.32),
    back: uvRect(sideU0, 0.04, sideU1, 0.32),
    left: uvRect(sideU0, 0.04, sideU1, 0.32),
    right: uvRect(chromeU0, 0.08, chromeU1, 0.65),
    top: uvRect(drainU0, 0.06, drainU1, 0.94),
  });
  // Right outer basin rim wall
  pushBoxPart(vertices, normals, uvs, new Vec3(12.2, 18.0, -11.0), new Vec3(15.0, 26.5, 11.0), {
    front: uvRect((frontU0 + frontU1) * 0.85, 0.04, frontU1, 0.32),
    back: uvRect(sideU0, 0.04, sideU1, 0.32),
    left: uvRect(chromeU0, 0.08, chromeU1, 0.65),
    right: uvRect(sideU0, 0.04, sideU1, 0.32),
    top: uvRect(chromeU0, 0.08, chromeU1, 0.65),
  });
  // Front basin apron wall (z = 8.2 .. 11.0)
  pushBoxPart(vertices, normals, uvs, new Vec3(-3.8, 18.0, 8.2), new Vec3(12.2, 26.5, 11.0), {
    front: uvRect((frontU0 + frontU1) * 0.4, 0.04, (frontU0 + frontU1) * 0.88, 0.32),
    back: uvRect(chromeU0, 0.08, chromeU1, 0.65),
    top: uvRect(chromeU0, 0.08, chromeU1, 0.65),
  });
  // Rear faucet deck wall (z = -11.0 .. -6.4)
  pushBoxPart(vertices, normals, uvs, new Vec3(-3.8, 18.0, -11.0), new Vec3(12.2, 26.5, -6.4), {
    front: uvRect(chromeU0, 0.08, chromeU1, 0.65),
    back: uvRect(sideU0, 0.04, sideU1, 0.32),
    top: uvRect(chromeU0, 0.08, chromeU1, 0.65),
  });
  // Recessed soapy water surface inside the wash basin (x = -3.8 .. 12.2, z = -6.4 .. 8.2, y = 21.8)
  pushBoxPart(vertices, normals, uvs, new Vec3(-3.8, 18.0, -6.4), new Vec3(12.2, 21.8, 8.2), {
    top: uvRect(waterU0, 0.24, waterU1, 0.88),
  });

  // 3. Rear Stainless Backsplash Guard (x = -15.0 .. 15.0, y = 26.5 .. 31.2, z = -11.0 .. -9.2)
  pushBoxPart(vertices, normals, uvs, new Vec3(-15.0, 26.5, -11.0), new Vec3(15.0, 31.2, -9.2), {
    front: uvRect(sideU0, 0.04, sideU1, 0.28),
    back: uvRect(sideU0, 0.04, sideU1, 0.28),
    left: uvRect(sideU0, 0.04, sideU1, 0.28),
    right: uvRect(sideU0, 0.04, sideU1, 0.28),
    top: uvRect(chromeU0, 0.08, chromeU1, 0.4),
  });

  // 4. High-Arc Gooseneck Chrome Faucet & Dual Hot/Cold Wrist-Blade Handles (y = 26.5 .. 36.0)
  const faucetFaces = {
    front: uvRect(chromeU0, 0.08, chromeU1, 0.62),
    back: uvRect(chromeU0, 0.08, chromeU1, 0.62),
    left: uvRect(chromeU0, 0.08, chromeU1, 0.62),
    right: uvRect(chromeU0, 0.08, chromeU1, 0.62),
    top: uvRect(chromeU0, 0.08, chromeU1, 0.62),
    bottom: uvRect(chromeU0, 0.08, chromeU1, 0.62),
  };
  // Faucet mixer escutcheon base on the rear basin deck (x = 1.6 .. 6.8, y = 26.5 .. 27.8, z = -9.0 .. -7.0)
  pushBoxPart(vertices, normals, uvs, new Vec3(1.6, 26.5, -9.0), new Vec3(6.8, 27.8, -7.0), faucetFaces);
  // Gooseneck vertical riser pipe (y = 27.8 .. 34.8)
  pushBoxPart(vertices, normals, uvs, new Vec3(3.5, 27.8, -8.6), new Vec3(4.9, 34.8, -7.2), faucetFaces);
  // Gooseneck upper arch bridge extending forward over the basin (`y = 34.6 .. 36.0, z = -8.6 .. -1.8`)
  pushBoxPart(vertices, normals, uvs, new Vec3(3.5, 34.6, -8.6), new Vec3(4.9, 36.0, -1.8), faucetFaces);
  // Downward aerator nozzle tip (`y = 32.4 .. 34.6, z = -3.0 .. -1.8`)
  pushBoxPart(vertices, normals, uvs, new Vec3(3.6, 32.4, -3.0), new Vec3(4.8, 34.6, -1.8), faucetFaces);

  // Left Cold (blue) & Right Hot (red) valve handles
  pushBoxPart(vertices, normals, uvs, new Vec3(-0.4, 26.5, -8.6), new Vec3(1.2, 29.0, -7.2), {
    front: uvRect(chromeU0, 0.72, (chromeU0 + chromeU1) * 0.5, 0.96),
    back: uvRect(chromeU0, 0.72, (chromeU0 + chromeU1) * 0.5, 0.96),
    left: uvRect(chromeU0, 0.72, (chromeU0 + chromeU1) * 0.5, 0.96),
    right: uvRect(chromeU0, 0.72, (chromeU0 + chromeU1) * 0.5, 0.96),
    top: uvRect(chromeU0, 0.72, (chromeU0 + chromeU1) * 0.5, 0.96),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(7.2, 26.5, -8.6), new Vec3(8.8, 29.0, -7.2), {
    front: uvRect((chromeU0 + chromeU1) * 0.5, 0.72, chromeU1, 0.96),
    back: uvRect((chromeU0 + chromeU1) * 0.5, 0.72, chromeU1, 0.96),
    left: uvRect((chromeU0 + chromeU1) * 0.5, 0.72, chromeU1, 0.96),
    right: uvRect((chromeU0 + chromeU1) * 0.5, 0.72, chromeU1, 0.96),
    top: uvRect((chromeU0 + chromeU1) * 0.5, 0.72, chromeU1, 0.96),
  });

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D wrecked Kitchen Sink left standing after destruction:
 * ruptured lower cabinet with broken plumbing, collapsed drainboard, and snapped faucet stub.
 */
export function sinkWreckMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = SINK_ATLAS.width;
  const inset = 0.35 / W;
  const frontU0 = SINK_FRONT.x / W + inset;
  const frontU1 = (SINK_FRONT.x + SINK_FRONT.width) / W - inset;
  const sideU0 = SINK_SIDE.x / W + inset;
  const sideU1 = (SINK_SIDE.x + SINK_SIDE.width) / W - inset;
  const drainU0 = SINK_TOP.x / W + inset;
  const drainU1 = (SINK_TOP.x + 31) / W - inset;
  const waterU0 = SINK_WATER.x / W + inset;
  const waterU1 = (SINK_WATER.x + SINK_WATER.width) / W - inset;
  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  pushBoxPart(vertices, normals, uvs, new Vec3(-14.6, 0, -10.6), new Vec3(14.6, 2.2, 10.2), {
    front: uvRect(frontU0, 0.88, frontU1, 0.99),
    back: uvRect(sideU0, 0.88, sideU1, 0.99),
    left: uvRect(sideU0, 0.88, sideU1, 0.99),
    right: uvRect(sideU0, 0.88, sideU1, 0.99),
    bottom: uvRect(sideU0, 0.88, sideU1, 0.99),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(-15.0, 2.2, -11.0), new Vec3(15.0, 17.8, 10.2), {
    front: uvRect(frontU0, 0.32, frontU1, 0.88),
    back: uvRect(sideU0, 0.32, sideU1, 0.88),
    left: uvRect(sideU0, 0.32, sideU1, 0.88),
    right: uvRect(sideU0, 0.32, sideU1, 0.88),
    top: uvRect(waterU0, 0.35, waterU1, 0.85),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(-15.0, 17.8, -11.0), new Vec3(-4.2, 23.4, 9.8), {
    front: uvRect(frontU0, 0.04, (frontU0 + frontU1) * 0.45, 0.32),
    back: uvRect(sideU0, 0.04, sideU1, 0.32),
    left: uvRect(sideU0, 0.04, sideU1, 0.32),
    right: uvRect(sideU0, 0.04, sideU1, 0.32),
    top: uvRect(drainU0, 0.06, drainU1, 0.94),
  });

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D spilled water puddle mesh (`y = 0.12`) around a destroyed Kitchen Sink.
 */
export function sinkPuddleMesh() {
  return dispenserPuddleMesh();
}

/**
 * Builds the 3D shrapnel pieces blasted off a destroyed Kitchen Sink:
 * - `carboyTop`: torn-off gooseneck faucet & rear backsplash assembly.
 * - `shards`: `SINK_SHARD_COUNT` (`5`) flying fragments (2 stainless cabinet doors, 2 basin wall plates, and 1 drainboard section).
 */
export function sinkShrapnelParts() {
  return dispenserShrapnelParts();
}

/** Pre-allocates a reusable pose structure for `sinkBreakPose`. */
export function createSinkBreakPose() {
  return createDispenserBreakPose();
}

/**
 * Computes the 3D transforms for a destroyed Kitchen Sink's wreck, spreading water puddle,
 * tumbling faucet crown, and 5 flying shards at `elapsed` seconds after destruction, writing into `target`.
 */
export function sinkBreakPose(elapsed, seed = 0, target = createSinkBreakPose()) {
  return dispenserBreakPose(elapsed, seed + 3.1, target);
}

export const SHADOW_ATLAS = { width: 128, height: 64 };
export const SHADOW_UV_RADIAL = Object.freeze([0.01, 0.02, 0.49, 0.98]);
export const SHADOW_UV_BOX = Object.freeze([0.51, 0.02, 0.99, 0.98]);

export const SHADOW_VERTEX = `
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
varying float vDepth;
varying vec2 vTextureCoord;

void main(void) {
  vec4 world = uModelMatrix * vec4(aVertexPosition, 1.0);
  vec4 v = uViewMatrix * world;
  vDepth = -v.z;
  vTextureCoord = aTextureCoord;
  vec4 clip = uProjectionMatrix * v;
  clip.z -= 0.00004 * clip.w;
  gl_Position = clip;
}
`;

export const SHADOW_FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uSampler;
uniform int uHasFog;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vDepth;
varying vec2 vTextureCoord;

void main(void) {
  if (uHasFog == 1 && vDepth >= uFogFar)
    discard;
  vec4 texel = texture2D(uSampler, vTextureCoord);
  if (texel.a < 0.015)
    discard;
  float fogFade = uHasFog == 1 ? clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0) : 0.0;
  float alpha = texel.a * (1.0 - fogFade * 0.85);
  if (alpha < 0.015)
    discard;
  vec3 shadowCol = mix(vec3(0.0, 0.0, 0.008), uFogColor, fogFade);
  gl_FragColor = vec4(shadowCol, alpha);
}
`;

/**
 * Builds the 128 x 64 RGBA shadow atlas:
 * - Cell 0 (`x = 0..63`): Soft radial/elliptical shadow with a broad contact-occlusion core that stays dark past the model's base perimeter and feathers smoothly outward.
 * - Cell 1 (`x = 64..127`): Soft rounded-box shadow for rectangular cabinets and supply chests.
 */
export function shadowAtlas() {
  const { width, height } = SHADOW_ATLAS;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const ny = (y + 0.5) / height * 2 - 1;
    for (let x = 0; x < 64; x++) {
      const nx = (x + 0.5) / 64 * 2 - 1;
      // Cell 0: Radial soft shadow (broad core out to r = 0.65 so the ring outside the 3D mesh is strongly visible)
      const r = Math.hypot(nx, ny);
      const radialCore = 1 - Utils.smoothstep(0.32, 0.74, r);
      const radialPenumbra = 1 - Utils.smoothstep(0.48, 0.98, r);
      const radialAlpha = Utils.clamp((radialCore * 0.58 + radialPenumbra * 0.42) * 0.72, 0, 0.72);
      const o0 = (y * width + x) * 4;
      data[o0] = 0;
      data[o0 + 1] = 0;
      data[o0 + 2] = 2;
      data[o0 + 3] = Math.round(radialAlpha * 255);

      // Cell 1: Rounded-box soft shadow (broad rectangular plateau out to 0.68 with feathered penumbra to 0.98)
      const ax = Math.abs(nx);
      const ay = Math.abs(ny);
      const boxDist = Math.pow(Math.pow(ax, 3.2) + Math.pow(ay, 3.2), 1 / 3.2);
      const boxCore = 1 - Utils.smoothstep(0.36, 0.76, boxDist);
      const boxPenumbra = 1 - Utils.smoothstep(0.52, 0.98, boxDist);
      const boxAlpha = Utils.clamp((boxCore * 0.62 + boxPenumbra * 0.38) * 0.74, 0, 0.74);
      const o1 = (y * width + 64 + x) * 4;
      data[o1] = 0;
      data[o1 + 1] = 0;
      data[o1 + 2] = 2;
      data[o1 + 3] = Math.round(boxAlpha * 255);
    }
  }
  return { name: 'shadow', data, width, height };
}

/**
 * Writes 4 world-space floor shadow quad corners (`12` floats) into `targetCorners`:
 * - `origin`: `Vec3(cx, y, cz)` at the prop/actor base
 * - `dir`: `Vec2(dirX, dirZ)` shadow stretch vector pointing away from the light source
 * - `bounds`: `Vec3(halfWidth, halfDepth, height)`
 */
export function writeFloorShadowQuad(targetCorners, origin, dir, bounds) {
  const halfX = bounds.x;
  const halfZ = bounds.y;
  const height = bounds.z;
  const shiftX = dir.x * height * 0.45;
  const shiftZ = dir.y * height * 0.45;
  const x0 = origin.x - halfX + Math.min(0, shiftX);
  const x1 = origin.x + halfX + Math.max(0, shiftX);
  const z0 = origin.z - halfZ + Math.min(0, shiftZ);
  const z1 = origin.z + halfZ + Math.max(0, shiftZ);
  const y = origin.y;

  targetCorners[0] = x0;
  targetCorners[1] = y;
  targetCorners[2] = z1;
  targetCorners[3] = x1;
  targetCorners[4] = y;
  targetCorners[5] = z1;
  targetCorners[6] = x1;
  targetCorners[7] = y;
  targetCorners[8] = z0;
  targetCorners[9] = x0;
  targetCorners[10] = y;
  targetCorners[11] = z0;
  return targetCorners;
}

/**
 * Writes 4 world-space vertical wall shadow quad corners (`12` floats) into `targetCorners` for wall-backed props:
 * - `tileCoords`: `Vec2(tileX, tileY)`
 * - `wallSide`: `0` (E, +X), `1` (S, +Z), `2` (W, -X), `3` (N, -Z) matching `WALL_DX` / `WALL_DY` in `level.js`
 * - `bounds`: `Vec3(halfSpan, topY, shiftAlong)`
 */
export function writeWallShadowQuad(targetCorners, tileCoords, wallSide, bounds) {
  const TILE_SIZE = 64;
  const inset = 0.14;
  const halfSpan = bounds.x;
  const topY = bounds.y;
  const shift = bounds.z;
  const bottomY = 0;

  if (wallSide === 0 || wallSide === 2) {
    const planeX = wallSide === 2 ? tileCoords.x * TILE_SIZE + inset : (tileCoords.x + 1) * TILE_SIZE - inset;
    const minZ = tileCoords.y * TILE_SIZE + 1.5;
    const maxZ = (tileCoords.y + 1) * TILE_SIZE - 1.5;
    const centerZ = (tileCoords.y + 0.5) * TILE_SIZE + shift;
    const z0 = Utils.clamp(centerZ - halfSpan, minZ, maxZ);
    const z1 = Utils.clamp(centerZ + halfSpan, minZ, maxZ);
    targetCorners[0] = planeX;
    targetCorners[1] = bottomY;
    targetCorners[2] = z0;
    targetCorners[3] = planeX;
    targetCorners[4] = bottomY;
    targetCorners[5] = z1;
    targetCorners[6] = planeX;
    targetCorners[7] = topY;
    targetCorners[8] = z1;
    targetCorners[9] = planeX;
    targetCorners[10] = topY;
    targetCorners[11] = z0;
  } else {
    const planeZ = wallSide === 3 ? tileCoords.y * TILE_SIZE + inset : (tileCoords.y + 1) * TILE_SIZE - inset;
    const minX = tileCoords.x * TILE_SIZE + 1.5;
    const maxX = (tileCoords.x + 1) * TILE_SIZE - 1.5;
    const centerX = (tileCoords.x + 0.5) * TILE_SIZE + shift;
    const x0 = Utils.clamp(centerX - halfSpan, minX, maxX);
    const x1 = Utils.clamp(centerX + halfSpan, minX, maxX);
    targetCorners[0] = x0;
    targetCorners[1] = bottomY;
    targetCorners[2] = planeZ;
    targetCorners[3] = x1;
    targetCorners[4] = bottomY;
    targetCorners[5] = planeZ;
    targetCorners[6] = x1;
    targetCorners[7] = topY;
    targetCorners[8] = planeZ;
    targetCorners[9] = x0;
    targetCorners[10] = topY;
    targetCorners[11] = planeZ;
  }
  return targetCorners;
}
