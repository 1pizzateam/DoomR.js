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
 * - Facility Toilet Bowl (`toiletAtlas()`, `toiletMesh()`):
 *   - Drawn procedurally as a crisp power-of-two RGBA atlas (64 x 64 per cell, 4 cells = 256 x 64) with glazed vitreous-china
 *     porcelain pedestal & sculpted oval bowl, rear flush cistern tank with chrome handle, contoured seat ring & hinged open lid,
 *     and recessed standing bowl water (`y = 0..31`).
 */
import { Rect, Trigo, Utils, Vec2, Vec3 } from '@1pizzateam/spock';
import { blitTile, field, mix, plate, rivet, rust, SHADOW, Tile } from './floor.js';
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

const DISPENSER_CELL = 64;
const DISPENSER_FRAMES = 4;
export const DISPENSER_ATLAS = { width: 256, height: 64 };
export const DISPENSER_RADIUS = 10;
export const DISPENSER_WALL_OFFSET = 20;
export const DISPENSER_HP = 1;
export const DISPENSER_SHARD_COUNT = 5;

const DESK_TOP = { x: 0, width: 64, height: 64 };
const DESK_SIDE = { x: 64, width: 64, height: 64 };
const DESK_SCREEN = { x: 128, width: 64, height: 64 };
const DESK_CHAIR = { x: 192, width: 64, height: 64 };

const DESK_CELL = 64;
const DESK_FRAMES = 4;
export const DESK_ATLAS = { width: 256, height: 64 };
export const DESK_RADIUS = 16;
export const DESK_WALL_OFFSET = 14;
export const DESK_HP = 1;
export const DESK_SHARD_COUNT = 5;

const TABLE_TOP = { x: 0, width: 64, height: 64 };
const TABLE_FRAME = { x: 64, width: 64, height: 64 };
const TABLE_CHAIR = { x: 128, width: 64, height: 64 };
const TABLE_TRAY = { x: 192, width: 64, height: 64 };

const TABLE_CELL = 64;
const TABLE_FRAMES = 4;
const TABLE_ATLAS = { width: 256, height: 64 };
export const TABLE_RADIUS = 18;
export const TABLE_WALL_OFFSET = 0;
export const TABLE_HP = 1;
const TABLE_SHARD_COUNT = 5;

const OVEN_FRONT = { x: 0, width: 64, height: 64 };
const OVEN_SIDE = { x: 64, width: 64, height: 64 };
const OVEN_COOKTOP = { x: 128, width: 64, height: 64 };
const OVEN_TRIM = { x: 192, width: 64, height: 64 };

const OVEN_CELL = 64;
const OVEN_FRAMES = 4;
const OVEN_ATLAS = { width: 256, height: 64 };
export const OVEN_RADIUS = 14;
export const OVEN_WALL_OFFSET = 18;
export const OVEN_HP = 1;
const OVEN_SHARD_COUNT = 5;

const SINK_FRONT = { x: 0, width: 64, height: 64 };
const SINK_SIDE = { x: 64, width: 64, height: 64 };
const SINK_TOP = { x: 128, width: 64, height: 64 };
const SINK_WATER = { x: 192, width: 64, height: 64 };

const SINK_CELL = 64;
const SINK_FRAMES = 4;
const SINK_ATLAS = { width: 256, height: 64 };
export const SINK_RADIUS = 15;
export const SINK_WALL_OFFSET = 18;
export const SINK_HP = 1;
const SINK_SHARD_COUNT = 5;

const PLANT_POT = { x: 0, width: 128, height: 128 };
const PLANT_FOLIAGE = { x: 128, width: 128, height: 128 };
const PLANT_STEM = { x: 256, width: 128, height: 128 };
const PLANT_SOIL = { x: 384, width: 128, height: 128 };

const PLANT_CELL = 128;
const PLANT_FRAMES = 4;
const PLANT_ATLAS = { width: 512, height: 128 };
export const PLANT_RADIUS = 12;
export const PLANT_WALL_OFFSET = 16;
export const PLANT_HP = 1;
export const PLANT_SHARD_COUNT = 5;

const TOILET_PORCELAIN = { x: 0, width: 64, height: 64 };
const TOILET_CISTERN = { x: 64, width: 64, height: 64 };
const TOILET_SEAT = { x: 128, width: 64, height: 64 };
const TOILET_WATER = { x: 192, width: 64, height: 64 };

const TOILET_CELL = 64;
const TOILET_FRAMES = 4;
const TOILET_ATLAS = { width: 256, height: 64 };
export const TOILET_RADIUS = 12;
export const TOILET_WALL_OFFSET = 18;
export const TOILET_HP = 1;
export const TOILET_SHARD_COUNT = 5;

const SPACESHIP_HULL = { x: 0, width: 128, height: 128 };
const SPACESHIP_COCKPIT = { x: 128, width: 128, height: 128 };
const SPACESHIP_ENGINE = { x: 256, width: 128, height: 128 };
const SPACESHIP_WING = { x: 384, width: 128, height: 128 };

const SPACESHIP_CELL = 128;
const SPACESHIP_FRAMES = 4;
const SPACESHIP_ATLAS = { width: 512, height: 128 };
export const SPACESHIP_RADIUS = 95;
export const SPACESHIP_WALL_OFFSET = 0;
export const SPACESHIP_HP = Infinity;
export const SPACESHIP_SHARD_COUNT = 5;

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
#extension GL_OES_standard_derivatives : enable
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

uniform int uHasPbr;
uniform sampler2D uNormalSampler;
uniform sampler2D uDetailSampler;
uniform sampler2D uAoSampler;
uniform vec2 uAoInvSize;
uniform vec3 uCameraPosition;

const float PBR_EXPOSURE = 3.0;

float ggxDistribution(float nh, float rough) {
  float a = rough * rough;
  float a2 = a * a;
  float d = nh * nh * (a2 - 1.0) + 1.0;
  return a2 / (3.14159265 * d * d + 0.0001);
}

vec3 filmicTone(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

/**
 * Physically based shading of a furniture, barrel or chest surface. The normal map (RG: tangent-space normal, B: height,
 * A: baked ambient occlusion) is laid over the mesh's own smooth normal through a tangent frame taken from how the
 * position and uv change on screen. Roughness and metalness come from the colour and height; the lights, ranges and
 * falloff are those of furnitureLight, and the room's occlusion map grounds the piece against walls and corners.
 */
vec3 furniturePbr(vec3 albedoSrgb, float emissive) {
  vec3 P = vWorldPos;
  vec3 V = normalize(uCameraPosition - P);
  vec3 Ng = normalize(vNormal);
  if (dot(Ng, V) < 0.0)
    Ng = -Ng;
  vec3 dpx = dFdx(P);
  vec3 dpy = dFdy(P);
  vec2 duvx = dFdx(vTextureCoord);
  vec2 duvy = dFdy(vTextureCoord);
  vec3 dp2perp = cross(dpy, Ng);
  vec3 dp1perp = cross(Ng, dpx);
  vec3 T = dp2perp * duvx.x + dp1perp * duvy.x;
  vec3 B = dp2perp * duvx.y + dp1perp * duvy.y;
  float invmax = inversesqrt(max(max(dot(T, T), dot(B, B)), 0.000000000001));
  T *= invmax;
  B *= invmax;
  vec4 nm = texture2D(uNormalSampler, vTextureCoord);
  vec3 nt = vec3(nm.xy * 2.0 - 1.0, 0.0);
  nt.z = sqrt(max(0.0, 1.0 - dot(nt.xy, nt.xy)));
  float detailFade = 1.0 - smoothstep(120.0, 360.0, vDepth);
  if (detailFade > 0.001) {
    vec2 dn = texture2D(uDetailSampler, vec2(dot(P, T), dot(P, B)) / 24.0).xy * 2.0 - 1.0;
    nt = normalize(vec3(nt.xy + dn * 0.12 * detailFade, nt.z));
  }
  vec3 N = normalize(T * nt.x + B * nt.y + Ng * nt.z);
  float hh = (nm.b - 0.75) * 8.0;
  float warm = clamp((albedoSrgb.r - albedoSrgb.b) * 2.83, 0.0, 1.0);
  // living green (leaves, canes) is matte: it must not take the steel look the dark cool colours of the hangar get
  float organic = smoothstep(0.03, 0.13, albedoSrgb.g - max(albedoSrgb.r, albedoSrgb.b));
  float rough = clamp(0.52 - 0.12 * clamp(hh, 0.0, 1.6) + 0.18 * clamp(-hh, 0.0, 1.7) + warm * 0.18 + organic * 0.3, 0.1, 1.0);
  float metal = mix(clamp(0.62 - warm * 0.5, 0.05, 0.7), 0.0, organic);
  vec3 a0 = max(albedoSrgb, vec3(0.0));
  vec3 albedo = a0 * (a0 * (a0 * 0.305306011 + 0.682171111) + 0.012522878);
  vec3 F0 = mix(vec3(0.04), min(albedo * 2.0 + 0.03, vec3(0.6)), metal);
  vec3 diffuseColor = albedo * (1.0 - 0.5 * metal);
  float NV = max(dot(N, V), 0.02);
  float k = (rough + 1.0) * (rough + 1.0) * 0.125;
  // standing on the floor and, against a wall or in a corner, in the shade of it
  vec2 lvl = texture2D(uAoSampler, P.xz * uAoInvSize).rg;
  float groundFade = smoothstep(34.0, 0.0, P.y);
  float room = 1.0 - clamp(lvl.r * 0.55, 0.0, 0.45) * groundFade - clamp((lvl.g - 0.42) * 1.4, 0.0, 0.35) * groundFade;
  float floorAo = 0.62 + 0.38 * smoothstep(0.0, 9.0, clamp(P.y, 0.0, 9.0));
  float overhangAo = 0.68 + 0.32 * clamp(Ng.y + 0.6, 0.0, 1.0);
  float ao = nm.a * floorAo * overhangAo * room;
  float sky = N.y * 0.5 + 0.5;
  vec3 irradiance = uAmbientLight * 0.85 * ao * (0.55 + 0.45 * sky);
  vec3 diffuseAcc = vec3(0.0);
  vec3 specAcc = vec3(0.0);
  if (uNbLights > 0) {
    for (int i = 0; i < 8; i++) {
      if (i >= uNbLights)
        break;
      vec3 diff = uLightDiffuse[i];
      if (diff.x + diff.y + diff.z <= 0.001)
        continue;
      vec3 delta = uLightPosition[i] - P;
      if (delta.x * delta.x + delta.z * delta.z > 160000.0)
        continue;
      float isCeilingFixture = step(54.0, uLightPosition[i].y);
      float distSq = dot(delta, delta);
      if (distSq > 160000.0)
        continue;
      vec3 att = uLightAttenuation[i];
      if (att.z > 0.001 && distSq >= 18225.0)
        continue;
      float dist = sqrt(distSq);
      float shortRange = step(0.001, att.z);
      float rangeCutoff = mix(1.0, 1.0 - smoothstep(75.0, 135.0, dist), shortRange);
      float attenuation = rangeCutoff / max(att.x + att.y * dist + att.z * distSq, 0.0001);
      float downward = clamp(delta.y / max(dist, 1.0), 0.0, 1.0);
      float spread = mix(1.05, 0.5 + 0.75 * downward * downward, isCeilingFixture);
      vec3 lc = diff * (attenuation * spread);
      vec3 L = delta / max(dist, 0.001);
      float wrapN = clamp(dot(N, L) * 0.85 + 0.15, 0.0, 1.0);
      diffuseAcc += lc * wrapN;
      if (i < 4) {
        float NL = max(dot(N, L), 0.0);
        vec3 H = normalize(L + V);
        float NH = max(dot(N, H), 0.0);
        float fv = 1.0 - max(dot(V, H), 0.0);
        float fv2 = fv * fv;
        float G = (NL / (NL * (1.0 - k) + k)) * (NV / (NV * (1.0 - k) + k));
        vec3 F = F0 + (1.0 - F0) * (fv2 * fv2 * fv);
        specAcc += lc * F * (ggxDistribution(NH, rough) * G / (4.0 * NV)) * (0.55 * step(0.0, dot(Ng, L)));
      }
    }
  }
  vec3 lightTotal = min(irradiance + diffuseAcc * ao, vec3(2.5));
  vec3 R = reflect(-V, N);
  float fn = 1.0 - NV;
  float fn2 = fn * fn;
  vec3 Fenv = F0 + (max(vec3(1.0 - rough), F0) - F0) * (fn2 * fn2 * fn);
  float envUp = mix(0.3, 1.0, smoothstep(-0.2, 0.8, R.y));
  vec3 envSpec = Fenv * uAmbientLight * envUp * ao * 0.1;
  vec3 colorLin = diffuseColor * lightTotal + specAcc * ao + envSpec;
  colorLin += albedo * emissive * 1.8;
  // the exposure was tuned for the dark steel of the walls: bright paint (barrels, chests) would burn out to white at it
  float brightness = dot(albedo, vec3(0.299, 0.587, 0.114));
  float exposure = PBR_EXPOSURE * mix(1.0, 0.16, smoothstep(0.04, 0.3, brightness));
  vec3 mapped = filmicTone(colorLin * exposure);
  return pow(mapped, vec3(0.4545));
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
  vec3 color;
  if (uHasPbr == 1) {
    float peak = max(texel.r, max(texel.g, texel.b));
    float emissive = smoothstep(0.55, 0.8, peak) * smoothstep(0.25, 0.5, peak - min(texel.r, min(texel.g, texel.b)));
    color = furniturePbr(texel.rgb * uMaterialDiffuse, emissive);
  } else
    color = texel.rgb * uMaterialDiffuse * furnitureLight(vWorldPos, n);
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

  // relief: kickplate and alcove are recessed, the header bezel and badges stand out, the service door is a panel
  t.relief(1, 56, 62, 7, -0.8, 0.8);
  t.relief(8, 4, 48, 7, -1.0, 0.8);
  t.relief(10, 13, 44, 19, -2.2, 1.2);
  t.relief(9, 29, 46, 4, 1.0, 0.7);
  t.relief(18, 16, 7, 5, 0.8, 0.5);
  t.relief(39, 16, 7, 5, 0.8, 0.5);
  t.relief(8, 35, 48, 20, 0.6, 0.8);
  t.relief(46, 41, 4, 7, -1.4, 0.5);
  for (let ly = 49; ly <= 52; ly += 2)
    t.groove(14, ly, 41, ly, 1.1, 0.7);
  for (let x = 11; x < 53; x += 3)
    t.groove(x, 30, x, 32, 1.0, 0.5);

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

  // relief: kickplate recessed, a pressed seam at mid-height, louvers cut as slots
  t.relief(1, 56, 62, 7, -0.8, 0.8);
  t.groove(3, 28.5, 60, 28.5, 1.5, 0.8);
  for (let ly = 34; ly <= 50; ly += 3)
    t.groove(12, ly + 0.5, 51, ly + 0.5, 1.6, 1.0);

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

  // relief: moulded plastic collars stand up, the drip-tray grate is slotted
  t.relief(1, 1, 18, 62, 1.0, 1.2);
  t.relief(44, 1, 19, 62, 1.0, 1.2);
  for (let y = 6; y < 58; y += 4)
    t.groove(23, y + 1, 40, y + 1, 2.2, 1.6);

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

  // relief: the moulded stiffening ribs of the bottle, and a smooth neck
  for (const y of [25, 39, 51])
    t.pipe(0, y - 1.5, BOTTLE.width, 3, 0.9, true);

  return t;
}

/**
 * Returns the power-of-two RGBA texture atlas (256 x 64) for the 3D Water Dispenser furniture prop.
 */
export function dispenserAtlas() {
  const { width, height } = DISPENSER_ATLAS;
  const data = new Uint8Array(width * height * 4);
  const relief = new Float32Array(width * height);
  const blit = (tile, x0) => blitTile(data, relief, width, tile, x0);
  blit(drawFront(mulberry32(8101)), FRONT.x);
  blit(drawSide(mulberry32(8102)), SIDE.x);
  blit(drawTrim(mulberry32(8103)), TRIM.x);
  blit(drawBottle(mulberry32(8104)), BOTTLE.x);
  return {
    name: 'dispenser',
    data,
    relief,
    width,
    height,
    cell: DISPENSER_CELL,
    frames: DISPENSER_FRAMES,
    front: FRONT,
    side: SIDE,
    trim: TRIM,
    bottle: BOTTLE,
  };
}

const argV3a = new Vec3();
const argV3b = new Vec3();
const argV3c = new Vec3();
const argV3d = new Vec3();
const argV2a = new Vec2();
const argV2b = new Vec2();
const argV2c = new Vec2();
const argV2d = new Vec2();
const argUv = new Rect();
// Writes the corners exactly (not via centre and size) so UVs stay bit-identical.
const uvBox = (u0, v0, u1, v1) => {
  argUv.topLeftCorner.setScalar(u0, v0);
  argUv.bottomRightCorner.setScalar(u1, v1);
  return argUv;
};

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

function pushQuad(vertices, normals, uvs, c0, c1, c2, c3, uv) {
  const u0 = uv.topLeftCorner.x;
  const v0 = uv.topLeftCorner.y;
  const u1 = uv.bottomRightCorner.x;
  const v1 = uv.bottomRightCorner.y;
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
    pushQuad(vertices, normals, uvs, p001, p101, p111, p011, uvBox(faceUvs.front.u0, faceUvs.front.v0, faceUvs.front.u1, faceUvs.front.v1));
  if (faceUvs.back)
    pushQuad(vertices, normals, uvs, p100, p000, p010, p110, uvBox(faceUvs.back.u0, faceUvs.back.v0, faceUvs.back.u1, faceUvs.back.v1));
  if (faceUvs.right)
    pushQuad(vertices, normals, uvs, p101, p100, p110, p111, uvBox(faceUvs.right.u0, faceUvs.right.v0, faceUvs.right.u1, faceUvs.right.v1));
  if (faceUvs.left)
    pushQuad(vertices, normals, uvs, p000, p001, p011, p010, uvBox(faceUvs.left.u0, faceUvs.left.v0, faceUvs.left.u1, faceUvs.left.v1));
  if (faceUvs.top)
    pushQuad(vertices, normals, uvs, p011, p111, p110, p010, uvBox(faceUvs.top.u0, faceUvs.top.v0, faceUvs.top.u1, faceUvs.top.v1));
  if (faceUvs.bottom)
    pushQuad(vertices, normals, uvs, p000, p100, p101, p001, uvBox(faceUvs.bottom.u0, faceUvs.bottom.v0, faceUvs.bottom.u1, faceUvs.bottom.v1));
}

/** A frustum ring from `base` to `top` (Vec3, centred on x/z), narrowing from `radius.x` to `radius.y`; `uv` spans (uStart, v0)..(uEnd, v1). */
function pushFrustumRing(vertices, normals, uvs, base, top, radius, uv, segs = 12) {
  const y0 = base.y;
  const y1 = top.y;
  const r0 = radius.x;
  const r1 = radius.y;
  const uStart = uv.topLeftCorner.x;
  const v0 = uv.topLeftCorner.y;
  const uEnd = uv.bottomRightCorner.x;
  const v1 = uv.bottomRightCorner.y;
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
    pushQuad(vertices, normals, uvs, b1, b0, t0, t1, uvBox(u0, v0, u1, v1));
  }
}

function pushTopDisc(vertices, normals, uvs, pos, r, uvCentre, uvRadius, segs = 12) {
  const y = pos.y;
  const uCenter = uvCentre.x;
  const vCenter = uvCentre.y;
  const uRadius = uvRadius.x;
  const vRadius = uvRadius.y;
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
  pushFrustumRing(vertices, normals, uvs, argV3a.setScalar(0, 26.5, 0), argV3b.setScalar(0, 28.2, 0), argV2a.setScalar(5.1, 3.3), uvBox(trimBlueU0, 0.15, trimBlueU1, 0.85), 12);
  pushTopDisc(vertices, normals, uvs, argV3a.setScalar(0, 28.2, 0), 3.3, argV2a.setScalar((trimBlueU0 + trimBlueU1) * 0.5, 0.5), argV2b.setScalar((trimBlueU1 - trimBlueU0) * 0.4, 0.3), 12);

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
    pushFrustumRing(vertices, normals, uvs, argV3a.setScalar(0, seg.y0, 0), argV3b.setScalar(0, seg.y1, 0), argV2a.setScalar(seg.r0, seg.r1), uvBox(bottleU0, seg.v0, bottleU1, seg.v1), 12);
  }
  const bottleUC = (bottleU0 + bottleU1) * 0.5;
  pushTopDisc(vertices, normals, uvs, argV3a.setScalar(0, 42.0, 0), 3.8, argV2a.setScalar(bottleUC, 0.08), argV2b.setScalar((bottleU1 - bottleU0) * 0.35, 0.06), 12);

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
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
  pushFrustumRing(vertices, normals, uvs, argV3a.setScalar(0, 13.8, 0), argV3b.setScalar(0, 15.2, 0), argV2a.setScalar(3.8, 3.4), uvBox(bottleU0, 0.62, bottleU1, 0.88), 10);
  pushTopDisc(vertices, normals, uvs, argV3a.setScalar(0, 14.9, 0), 3.3, argV2a.setScalar((bottleU0 + bottleU1) * 0.5, 0.72), argV2b.setScalar((bottleU1 - bottleU0) * 0.32, 0.18), 10);

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

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
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

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
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
  pushFrustumRing(topVerts, topNorms, topUvs, argV3a.setScalar(0, -3.2, 0), argV3b.setScalar(0, -0.8, 0), argV2a.setScalar(5.6, 5.8), uvBox(bottleU0, 0.3, bottleU1, 0.5), 10);
  pushFrustumRing(topVerts, topNorms, topUvs, argV3a.setScalar(0, -0.8, 0), argV3b.setScalar(0, 1.8, 0), argV2a.setScalar(5.8, 5.2), uvBox(bottleU0, 0.12, bottleU1, 0.3), 10);
  pushFrustumRing(topVerts, topNorms, topUvs, argV3a.setScalar(0, 1.8, 0), argV3b.setScalar(0, 3.2, 0), argV2a.setScalar(5.2, 3.7), uvBox(bottleU0, 0.02, bottleU1, 0.12), 10);
  pushTopDisc(topVerts, topNorms, topUvs, argV3a.setScalar(0, 3.2, 0), 3.7, argV2a.setScalar(bottleUC, 0.08), argV2b.setScalar((bottleU1 - bottleU0) * 0.35, 0.06), 10);

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
      pushQuad(sVerts, sNorms, sUvs, b0, b1, t1, t0, uvBox(bu0, 0.28, bu1, 0.78));
      pushQuad(sVerts, sNorms, sUvs, b1, b0, t0, t1, uvBox(bu0, 0.28, bu1, 0.78));
    }
    shards.push(flipV({
      vertices: new Float32Array(sVerts),
      normals: new Float32Array(sNorms),
      uvs: new Float32Array(sUvs),
    }));
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
  shards.push(flipV({
    vertices: new Float32Array(bezelVerts),
    normals: new Float32Array(bezelNorms),
    uvs: new Float32Array(bezelUvs),
  }));

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
  shards.push(flipV({
    vertices: new Float32Array(tubeVerts),
    normals: new Float32Array(tubeNorms),
    uvs: new Float32Array(tubeUvs),
  }));

  return {
    carboyTop: flipV({
      vertices: new Float32Array(topVerts),
      normals: new Float32Array(topNorms),
      uvs: new Float32Array(topUvs),
    }),
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

function writeBallisticArc(posTarget, rotTarget, start, end, spin, rest, t, peakLift) {
  const startX = start.x;
  const startY = start.y;
  const startZ = start.z;
  const endX = end.x;
  const endY = end.y;
  const endZ = end.z;
  const spinX = spin.x;
  const spinY = spin.y;
  const spinZ = spin.z;
  const restPitch = rest.x;
  const restYaw = rest.y;
  const restRoll = rest.z;
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
  writeBallisticArc(target.carboyTop.pos, target.carboyTop.rot, argV3a.setScalar(0, 36.0, 0), argV3b.setScalar(topEndX, 3.6, topEndZ), argV3c.setScalar(Trigo.pi * 2.4, topSpread + Trigo.pi * 1.1, Trigo.pi * 1.7), argV3d.setScalar(Trigo.halfpi - 0.18, topSpread + 0.6, 0.22), t / topDuration, 14);

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
    writeBallisticArc(shard.pos, shard.rot, argV3a.setScalar(startX, startY, startZ), argV3b.setScalar(Math.sin(fan) * dist, 0.85, Math.max(2.5, Math.cos(fan) * dist)), argV3c.setScalar(dirSign * Trigo.pi * (2.2 + hash), fan + dirSign * 1.5, -dirSign * Trigo.pi * 1.7), argV3d.setScalar(Trigo.halfpi - 0.12, fan + 0.35 * dirSign, (hash - 0.5) * 0.24), t / duration, peakLift);
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

function buildRefectoryChair(vertices, normals, uvs, pos, dirZ, chairU0, chairU1, uvRect, skipBack = false) {
  const cx = pos.x;
  const cz = pos.y;
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
  pushCylinderAt(vertices, normals, uvs, argV3a.setScalar(-3.4, 19.4, 5.2), argV3b.setScalar(-3.4, 22.8, 5.2), argV2a.setScalar(1.15, 1.15), uvBox(trayU0, 0.66, trayU1, 0.96), 8);
  pushCylinderAt(vertices, normals, uvs, argV3a.setScalar(3.4, 19.4, -5.2), argV3b.setScalar(3.4, 22.8, -5.2), argV2a.setScalar(1.15, 1.15), uvBox(trayU0, 0.66, trayU1, 0.96), 8);

  // Center condiment & napkin dispenser caddy (y = 19.4 .. 23.2)
  pushBoxPart(vertices, normals, uvs, new Vec3(-2.2, 19.4, -1.6), new Vec3(2.2, 23.2, 1.6), {
    front: uvRect(trayU0, 0.66, trayU1, 0.96),
    back: uvRect(trayU0, 0.66, trayU1, 0.96),
    left: uvRect(trayU0, 0.66, trayU1, 0.96),
    right: uvRect(trayU0, 0.66, trayU1, 0.96),
    top: uvRect(topU0, 0.72, topU1, 0.94),
  });

  // 5. Four Refectory Chairs (2 on +Z side facing -Z, 2 on -Z side facing +Z, reaching y = 30.0)
  buildRefectoryChair(vertices, normals, uvs, argV2a.setScalar(-9.5, 11.8), 1, chairU0, chairU1, uvRect, false);
  buildRefectoryChair(vertices, normals, uvs, argV2a.setScalar(9.5, 11.8), 1, chairU0, chairU1, uvRect, false);
  buildRefectoryChair(vertices, normals, uvs, argV2a.setScalar(-9.5, -11.8), -1, chairU0, chairU1, uvRect, false);
  buildRefectoryChair(vertices, normals, uvs, argV2a.setScalar(9.5, -11.8), -1, chairU0, chairU1, uvRect, false);

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
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
  buildRefectoryChair(vertices, normals, uvs, argV2a.setScalar(-9.5, 12.4), 1, chairU0, chairU1, uvRect, false);
  buildRefectoryChair(vertices, normals, uvs, argV2a.setScalar(9.8, 12.6), 1, chairU0, chairU1, uvRect, true);
  buildRefectoryChair(vertices, normals, uvs, argV2a.setScalar(-9.5, -12.2), -1, chairU0, chairU1, uvRect, false);
  buildRefectoryChair(vertices, normals, uvs, argV2a.setScalar(9.5, -12.2), -1, chairU0, chairU1, uvRect, true);

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
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

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
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
    shards.push(flipV({ vertices: new Float32Array(sVerts), normals: new Float32Array(sNorms), uvs: new Float32Array(sUvs) }));
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
    shards.push(flipV({ vertices: new Float32Array(cVerts), normals: new Float32Array(cNorms), uvs: new Float32Array(cUvs) }));
  }
  // Shard 4: Flying insulated thermo-mug
  const mVerts = [];
  const mNorms = [];
  const mUvs = [];
  pushCylinderAt(mVerts, mNorms, mUvs, argV3a.setScalar(0, -1.7, 0), argV3b.setScalar(0, 1.7, 0), argV2a.setScalar(1.2, 1.2), uvBox(trayU0, 0.66, trayU1, 0.96), 8);
  shards.push(flipV({ vertices: new Float32Array(mVerts), normals: new Float32Array(mNorms), uvs: new Float32Array(mUvs) }));

  const carboyTop = flipV({
    vertices: new Float32Array(topVerts),
    normals: new Float32Array(topNorms),
    uvs: new Float32Array(topUvs),
  });
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
  writeBallisticArc(target.carboyTop.pos, target.carboyTop.rot, argV3a.setScalar(0, 19.0, 0), argV3b.setScalar(Math.sin(topSpread) * topDist, 1.2, Math.cos(topSpread) * topDist), argV3c.setScalar(Trigo.pi * 2.0, topSpread + Trigo.pi * 0.8, Trigo.pi * 1.4), argV3d.setScalar(0.08, topSpread + 0.4, 0.12), t / topDuration, 12);

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
    writeBallisticArc(shard.pos, shard.rot, argV3a.setScalar(startX, startY, startZ), argV3b.setScalar(Math.sin(fan) * dist, 0.85, Math.cos(fan) * dist), argV3c.setScalar(dirSign * Trigo.pi * (2.0 + hash), fan + dirSign * 1.3, -dirSign * Trigo.pi * 1.5), argV3d.setScalar(Trigo.halfpi - 0.1, fan + 0.25 * dirSign, (hash - 0.5) * 0.2), t / duration, peakLift);
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

  // relief: a laminate top inside a metal edge, a raised front bumper, drawers as panels with sunk pulls
  t.relief(4, 4, 56, 32, -0.5, 1.0);
  t.relief(48, 8, 6, 4, -1.8, 0.5);
  t.relief(1, 36, 62, 4, 1.2, 0.9);
  for (const [dy, dh] of [[42, 9], [53, 9]]) {
    t.relief(4, dy, 56, dh, 0.7, 0.7);
    t.relief(22, dy + 3, 20, 3, -1.4, 0.5);
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

  // relief: louvers cut into the pedestal, the tower is a raised chassis with sunk drive bays and a slotted grille
  for (let ly = 12; ly <= 28; ly += 3)
    t.groove(6, ly + 0.5, 25, ly + 0.5, 1.4, 0.9);
  t.relief(1, 56, 30, 7, -0.8, 0.8);
  t.relief(32, 1, 31, 62, 0.9, 1.0);
  for (const by of [5, 13])
    t.relief(36, by, 23, 6, -1.2, 0.6);
  t.relief(36, 24, 23, 8, -1.0, 0.6);
  t.relief(52, 25, 5, 4, 0.8, 0.5);
  for (let gy = 37; gy <= 56; gy += 3)
    for (let gx = 37; gx < 58; gx += 2)
      t.dome(gx + 0.5, gy + 0.5, 0.9, -1.2);

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
  // relief: the bezel stands out around a slightly sunk, smooth glass; knobs are bumps; each keycap is a block
  t.relief(2, 2, 60, 39, 1.2, 1.0);
  t.relief(6, 5, 52, 31, -1.6, 1.4);
  t.dome(45, 38, 1.1, 1.0);
  t.dome(49, 38, 1.1, 1.0);

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
  // the keys stand on a sunk tray
  t.relief(2, 43, 60, 20, -0.8, 0.8);
  for (let ky = 45; ky <= 59; ky += 3)
    for (let kx = 5; kx < 56; kx += 3)
      t.relief(kx, ky, ky === 57 && kx >= 17 && kx <= 38 ? 22 : 2, 2, 1.1, 0.4);

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

  // relief: padded, quilted upholstery - bolsters bulge, the stitched ribs and side seams pinch in
  for (let y = 2; y < 44; y++)
    for (let x = 3; x < 61; x++) {
      const bolster = Math.sin(((x - 3) / 58) * Trigo.pi);
      t.relief(x, y, 1, 1, 1.6 * bolster, 0.1);
    }
  for (let ry = 8; ry <= 40; ry += 6)
    t.groove(6, ry + 0.5, 57, ry + 0.5, 1.6, 1.0);
  t.groove(6, 3, 6, 43, 1.2, 0.6);
  t.groove(57, 3, 57, 43, 1.2, 0.6);
  t.relief(3, 47, 58, 6, 0.9, 0.8);

  rust(t, rnd, 0.1);
  return t;
}

/**
 * Returns the power-of-two RGBA texture atlas (256 x 64) for the 3D Computer Desk & Chair furniture prop.
 */
export function deskAtlas() {
  const { width, height } = DESK_ATLAS;
  const data = new Uint8Array(width * height * 4);
  const relief = new Float32Array(width * height);
  const blit = (tile, x0) => blitTile(data, relief, width, tile, x0);
  blit(drawDeskTop(mulberry32(8201)), DESK_TOP.x);
  blit(drawDeskSide(mulberry32(8202)), DESK_SIDE.x);
  blit(drawDeskScreen(mulberry32(8203)), DESK_SCREEN.x);
  blit(drawDeskChair(mulberry32(8204)), DESK_CHAIR.x);
  return {
    name: 'desk',
    data,
    relief,
    width,
    height,
    cell: DESK_CELL,
    frames: DESK_FRAMES,
    top: DESK_TOP,
    side: DESK_SIDE,
    screen: DESK_SCREEN,
    chair: DESK_CHAIR,
  };
}

function pushCylinderAt(vertices, normals, uvs, base, top, radius, uv, segs = 8) {
  const cx = base.x;
  const cz = base.z;
  const y0 = base.y;
  const y1 = top.y;
  const r0 = radius.x;
  const r1 = radius.y;
  const uStart = uv.topLeftCorner.x;
  const v0 = uv.topLeftCorner.y;
  const uEnd = uv.bottomRightCorner.x;
  const v1 = uv.bottomRightCorner.y;
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
    pushQuad(vertices, normals, uvs, b1, b0, t0, t1, uvBox(u0, v0, u1, v1));
  }
}

function buildChairParts(vertices, normals, uvs, pos, chairU0, chairU1, uvRect, wrecked = false) {
  const chairX = pos.x;
  const chairZ = pos.y;
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
  pushCylinderAt(vertices, normals, uvs, argV3a.setScalar(chairX, 2.0, chairZ), argV3b.setScalar(chairX, 11.8, chairZ), argV2a.setScalar(1.25, 1.05), uvBox(chairU0, chromeV0, chairU1, chromeV1), 8);

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
function deskMeshAuthored() {
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
  buildChairParts(vertices, normals, uvs, argV2a.setScalar(1.2, 8.8), chairU0, chairU1, uvRect, false);

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
function deskWreckMeshAuthored() {
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
  buildChairParts(vertices, normals, uvs, argV2a.setScalar(1.6, 10.2), chairU0, chairU1, uvRect, true);

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
function deskDebrisMeshAuthored() {
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
function deskShrapnelPartsAuthored() {
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

/**
 * The desk meshes are authored with V counted down from the top of the picture (row 0 = v 0), but the atlas is uploaded
 * flipped so that up is +V. Turn the authored V over so the screen, keyboard and tower land the right way up.
 */
function flipV(geometry) {
  const { uvs } = geometry;
  for (let i = 1; i < uvs.length; i += 2)
    uvs[i] = 1 - uvs[i];
  return geometry;
}

export function deskMesh() {
  return flipV(deskMeshAuthored());
}

export function deskWreckMesh() {
  return flipV(deskWreckMeshAuthored());
}

export function deskDebrisMesh() {
  return flipV(deskDebrisMeshAuthored());
}

export function deskShrapnelParts() {
  const parts = deskShrapnelPartsAuthored();
  flipV(parts.carboyTop);
  if (parts.monitorTop && parts.monitorTop !== parts.carboyTop)
    flipV(parts.monitorTop);
  for (const shard of parts.shards)
    flipV(shard);
  return parts;
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
  writeBallisticArc(target.monitorTop.pos, target.monitorTop.rot, argV3a.setScalar(1.6, 31.0, -6.0), argV3b.setScalar(topEndX, 3.2, topEndZ), argV3c.setScalar(Trigo.pi * 2.2, topSpread + Trigo.pi * 0.9, Trigo.pi * 1.5), argV3d.setScalar(Trigo.halfpi - 0.14, topSpread + 0.45, 0.18), t / topDuration, 13);

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
    writeBallisticArc(shard.pos, shard.rot, argV3a.setScalar(startX, startY, startZ), argV3b.setScalar(Math.sin(fan) * dist, 0.9, Math.max(3.5, Math.cos(fan) * dist)), argV3c.setScalar(dirSign * Trigo.pi * (2.1 + hash), fan + dirSign * 1.4, -dirSign * Trigo.pi * 1.6), argV3d.setScalar(Trigo.halfpi - 0.1, fan + 0.3 * dirSign, (hash - 0.5) * 0.22), t / duration, peakLift);
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
  pushCylinderAt(vertices, normals, uvs, argV3a.setScalar(-6.4, 27.9, 3.8), argV3b.setScalar(-6.4, 33.2, 3.8), argV2a.setScalar(3.6, 3.6), uvBox(trimU0, 0.05, trimU1, 0.42), 10);
  pushBoxPart(vertices, normals, uvs, new Vec3(-10.0, 33.2, 0.2), new Vec3(-2.8, 33.8, 7.4), chromeFaces);

  // 6. Rear Stainless Exhaust Backsplash & Flue Riser (x = -13.0 .. 13.0, y = 26.8 .. 36.0, z = -11.0 .. -7.6)
  pushBoxPart(vertices, normals, uvs, new Vec3(-13.0, 26.8, -11.0), new Vec3(13.0, 36.0, -7.6), {
    front: uvRect(trimU0, 0.48, trimU1, 0.96),
    back: uvRect(sideU0, 0.06, sideU1, 0.48),
    left: uvRect(sideU0, 0.06, sideU1, 0.48),
    right: uvRect(sideU0, 0.06, sideU1, 0.48),
    top: uvRect(trimU0, 0.05, trimU1, 0.42),
  });

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
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

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
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

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
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
  pushCylinderAt(potVerts, potNorms, potUvs, argV3a.setScalar(0, -2.6, 0), argV3b.setScalar(0, 2.6, 0), argV2a.setScalar(3.4, 3.4), uvBox(trimU0, 0.05, trimU1, 0.42), 8);
  shards.push(flipV({ vertices: new Float32Array(potVerts), normals: new Float32Array(potNorms), uvs: new Float32Array(potUvs) }));

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
    shards.push(flipV({ vertices: new Float32Array(gVerts), normals: new Float32Array(gNorms), uvs: new Float32Array(gUvs) }));
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
  shards.push(flipV({ vertices: new Float32Array(mVerts), normals: new Float32Array(mNorms), uvs: new Float32Array(mUvs) }));

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
  shards.push(flipV({ vertices: new Float32Array(fVerts), normals: new Float32Array(fNorms), uvs: new Float32Array(fUvs) }));

  return {
    carboyTop: flipV({
      vertices: new Float32Array(topVerts),
      normals: new Float32Array(topNorms),
      uvs: new Float32Array(topUvs),
    }),
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

  // Right half (x = 32..63): Clean brushed stainless-steel basin walls, chrome faucet & wrist-blade handles
  t.rect(33, 4, 28, 56, STAINLESS_BASE, 0.72);
  for (let gy = 8; gy <= 54; gy += 6) {
    t.rect(35, gy, 24, 1, STAINLESS_LIGHT, 0.38);
    t.rect(35, gy + 1, 24, 1, STAINLESS_DARK, 0.28);
  }

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
  const chromeU0 = (SINK_TOP.x + 33) / W + inset;
  const chromeU1 = (SINK_TOP.x + 61) / W - inset;
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

  // Left & Right wrist-blade valve handles
  pushBoxPart(vertices, normals, uvs, new Vec3(-0.4, 26.5, -8.6), new Vec3(1.2, 29.0, -7.2), faucetFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(7.2, 26.5, -8.6), new Vec3(8.8, 29.0, -7.2), faucetFaces);

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
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

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
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

export const buildConferenceTable = tableMesh;
export const buildKitchenSink = sinkMesh;

const POT_TERRACOTTA = [142, 68, 42];
const POT_LIGHT = [178, 92, 58];
const POT_DARK = [98, 46, 28];
const POT_RIM = [162, 82, 52];
const POT_CHALK = [196, 168, 140];
const LEAF_DARK = [16, 56, 26];
const LEAF_BASE = [30, 88, 38];
const LEAF_MID = [46, 118, 46];
const LEAF_LIGHT = [92, 142, 64];
const LEAF_RIB = [112, 142, 76];
const CANE_BASE = [92, 98, 54];
const CANE_LIGHT = [118, 126, 72];
const CANE_DARK = [56, 60, 34];
const SOIL_DARK = [28, 19, 15];
const SOIL_BASE = [46, 33, 25];
const SOIL_LIGHT = [74, 56, 42];
const SOIL_GRIT = [116, 104, 92];

function plantHash(x, y, seed = 0) {
  let h = Math.imul(x * 374761393 ^ y * 668265263 ^ seed * 2246822519, 1274126177);
  h ^= h >>> 13;
  h = Math.imul(h, 1911520717);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Smooth value noise in 0..1: bilinear blend of hashed lattice points `1 / freq` texels apart. */
function plantNoise(px, py, freq, seed = 0) {
  const x = px / freq;
  const y = py / freq;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = Utils.smoothstep(0, 1, x - x0);
  const fy = Utils.smoothstep(0, 1, y - y0);
  return Utils.lerp(
    Utils.lerp(plantHash(x0, y0, seed), plantHash(x0 + 1, y0, seed), fx),
    Utils.lerp(plantHash(x0, y0 + 1, seed), plantHash(x0 + 1, y0 + 1, seed), fx),
    fy
  );
}

/** The blade's half width (0..1 of the leaf cell) a fraction `t` of the way from its base (0) to its tip (1): a lanceolate leaf. */
function leafHalfWidth(t) {
  if (t <= 0 || t >= 1)
    return 0;
  return Math.min(0.9, 3.1 * Math.pow(t, 0.8) * Math.pow(1 - t, 1.1));
}

function drawPlantPot(rnd) {
  const t = new Tile(PLANT_POT.width, PLANT_POT.height, 2);
  plate(t, 0, 0, 64, 64, rnd, POT_TERRACOTTA);
  t.rect(2, 4, 60, 10, POT_RIM, 0.9);
  for (let x = 3; x < 61; x++) {
    t.set(x, 4, POT_LIGHT, 0.7);
    t.set(x, 13, POT_DARK, 0.8);
  }
  for (let y = 15; y < 58; y++) {
    const taper = Math.floor(((y - 15) / 43) * 6);
    const x0 = 4 + taper;
    const x1 = 60 - taper;
    for (let x = x0; x < x1; x++) {
      const sheen = Math.sin(((x - x0) / (x1 - x0)) * Trigo.pi) * 0.28;
      t.set(x, y, POT_LIGHT, sheen);
    }
  }
  t.rect(8, 58, 48, 5, POT_DARK, 0.85);
  // fired clay: cloudy glaze mottling, fine speckle and white mineral bloom near the foot
  for (let py = 0; py < t.height; py++)
    for (let px = 0; px < t.width; px++) {
      const cloud = plantNoise(px, py, 14, 3) * 0.6 + plantNoise(px, py, 5, 4) * 0.4;
      t.setRaw(px, py, cloud > 0.5 ? POT_LIGHT : POT_DARK, Math.abs(cloud - 0.5) * 0.55);
      if (py > 90 && plantNoise(px, py, 9, 5) > 0.7)
        t.setRaw(px, py, POT_CHALK, (py - 90) / 60 * 0.18);
      if (plantHash(px, py, 6) > 0.985)
        t.setRaw(px, py, POT_DARK, 0.7);
    }
  // relief: the thick rolled rim, a gently bellied pot wall, a recessed foot
  t.pipe(2, 4, 60, 10, 1.6, true);
  t.relief(4, 15, 56, 43, 0.5, 2.0);
  t.relief(8, 58, 48, 5, -0.8, 0.6);
  return t;
}

/** One lanceolate leaf with a midrib, herringbone veins and a waxy gradient, plus its cut-out mask (255 inside the blade). */
function drawPlantFoliage() {
  const t = new Tile(PLANT_FOLIAGE.width, PLANT_FOLIAGE.height);
  const H = t.ensureRelief();
  const size = PLANT_FOLIAGE.width;
  const mask = new Uint8Array(size * size);
  for (let py = 0; py < size; py++)
    for (let px = 0; px < size; px++) {
      const along = (size - 5 - py) / (size - 10);
      const across = (px + 0.5 - size / 2) / (size / 2);
      const hw = leafHalfWidth(along);
      const i = py * size + px;
      const f = hw > 0.001 ? Math.abs(across) / hw : 2;
      if (f > 1) {
        t.setRaw(px, py, LEAF_MID);
        continue;
      }
      mask[i] = 255;
      const mottle = plantNoise(px, py, 11, 7) * 0.6 + plantNoise(px, py, 4, 8) * 0.4;
      let col = mix(LEAF_BASE, LEAF_MID, Utils.clamp(0.25 + along * 0.7 + (mottle - 0.5) * 0.7, 0, 1));
      col = mix(col, LEAF_DARK, Utils.smoothstep(0.55, 1.0, f) * 0.55 + (1 - Utils.smoothstep(0.0, 0.25, along)) * 0.4);
      col = mix(col, LEAF_LIGHT, Utils.smoothstep(0.0, 0.5, 0.5 - f) * 0.35 * (0.5 + mottle));
      const rib = Math.abs(across) * size * 0.5;
      let height = 0.18 * (1 - f * f);
      // side veins sweep up toward the tip at a shallow angle
      const vein = (along * 15 + Math.abs(across) * 3.4) % 1;
      if (rib > 1.6 && vein < 0.1 && f < 0.94) {
        col = mix(col, LEAF_LIGHT, 0.32);
        height -= 0.1;
      }
      if (rib <= 1.7 && along > 0.02 && along < 0.96) {
        col = mix(col, LEAF_RIB, 0.85 - rib * 0.2);
        height += 0.4 * (1 - rib / 1.7);
      }
      t.setRaw(px, py, col);
      H[i] = height;
    }
  t.mask = mask;
  return t;
}

function drawPlantStem() {
  const t = new Tile(PLANT_STEM.width, PLANT_STEM.height);
  const size = PLANT_STEM.width;
  const H = t.ensureRelief();
  for (let py = 0; py < size; py++)
    for (let px = 0; px < size; px++) {
      const fibre = plantNoise(px, py * 0.12, 3.2, 11);
      let col = mix(CANE_BASE, CANE_LIGHT, fibre * 0.8);
      const ring = ((py + 6) % 32) / 32;
      const node = Math.exp(-Math.pow((ring - 0.5) * 18, 2));
      col = mix(col, CANE_DARK, node * 0.8);
      // old leaf scars: a pale crescent just under every node
      if (ring > 0.54 && ring < 0.62 && plantNoise(px, py, 8, 12) > 0.45)
        col = mix(col, CANE_LIGHT, 0.4);
      t.setRaw(px, py, col);
      H[py * size + px] = (fibre - 0.5) * 0.25 + node * 0.5;
    }
  return t;
}

function drawPlantSoil() {
  const t = new Tile(PLANT_SOIL.width, PLANT_SOIL.height, 2);
  const size = PLANT_SOIL.width;
  for (let py = 0; py < size; py++)
    for (let px = 0; px < size; px++) {
      const clump = plantNoise(px, py, 9, 21) * 0.65 + plantNoise(px, py, 3, 22) * 0.35;
      let col = mix(SOIL_DARK, SOIL_LIGHT, clump);
      col = mix(SOIL_BASE, col, 0.8);
      if (plantHash(px, py, 23) > 0.992)
        col = SOIL_GRIT;
      t.setRaw(px, py, col);
    }
  // relief: loose, lumpy crumbs of soil
  const rnd = mulberry32(8705);
  for (let k = 0; k < 220; k++)
    t.dome(3 + rnd() * 58, 3 + rnd() * 58, 0.8 + rnd() * 1.6, (rnd() - 0.35) * 1.1);
  return t;
}

/**
 * Returns the power-of-two RGBA texture atlas (512 x 128, four 128-texel cells) for the 3D Office Plant furniture prop. The
 * foliage cell is a single cut-out leaf: texels outside the blade have alpha 0 and are discarded by the furniture shader.
 */
export function plantAtlas() {
  const { width, height } = PLANT_ATLAS;
  const data = new Uint8Array(width * height * 4);
  const relief = new Float32Array(width * height);
  const blit = (tile, x0) => blitTile(data, relief, width, tile, x0);
  blit(drawPlantPot(mulberry32(8701)), PLANT_POT.x);
  const foliage = drawPlantFoliage();
  blit(foliage, PLANT_FOLIAGE.x);
  for (let y = 0; y < PLANT_FOLIAGE.height; y++)
    for (let x = 0; x < PLANT_FOLIAGE.width; x++)
      data[(y * width + PLANT_FOLIAGE.x + x) * 4 + 3] = foliage.mask[y * PLANT_FOLIAGE.width + x];
  blit(drawPlantStem(), PLANT_STEM.x);
  blit(drawPlantSoil(), PLANT_SOIL.x);
  return {
    name: 'plant',
    data,
    relief,
    width,
    height,
    cell: PLANT_CELL,
    frames: PLANT_FRAMES,
    pot: PLANT_POT,
    foliage: PLANT_FOLIAGE,
    stem: PLANT_STEM,
    soil: PLANT_SOIL,
  };
}

/**
 * Pushes one arching leaf: a ribbon of `segs` rows from its base at (`ox`, `oy`, `oz`), heading along `yaw` (radians, in the
 * floor plane), rising at `pitch` and bending down by `droop` over its `length`. `fold` lifts the two edges into a shallow V
 * along the midrib. Normals are smooth across the blade, `foliage` is the leaf cell's u range.
 */
function pushLeaf(vertices, normals, uvs, foliage, pos, yaw, length, width, pitch, droop, fold = 0.35, segs = 6) {
  const ox = pos.x;
  const oy = pos.y;
  const oz = pos.z;
  const dx = Math.cos(yaw);
  const dz = Math.sin(yaw);
  const sx = -dz;
  const sz = dx;
  const rows = [];
  let x = ox;
  let y = oy;
  let z = oz;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const theta = pitch - droop * t;
    rows.push({ x, y, z, theta, t });
    const step = length / segs;
    const mid = pitch - droop * ((i + 0.5) / segs);
    x += dx * Math.cos(mid) * step;
    y += Math.sin(mid) * step;
    z += dz * Math.cos(mid) * step;
  }
  // blade vertices: left edge, midrib, right edge
  const grid = rows.map((r) => {
    const half = width * 0.5 * Math.sin(Math.min(1, 0.35 + r.t * 3) * Trigo.halfpi);
    const lift = fold * half;
    const cx = Math.cos(r.theta);
    const sy = Math.sin(r.theta);
    // the blade normal: up and out of the leaf, perpendicular to its heading
    const nx = -dx * sy;
    const ny = cx;
    const nz = -dz * sy;
    const slope = fold * 0.9;
    const v = Utils.lerp(0.97, 0.03, r.t);
    const make = (side, u) => {
      const k = side * half;
      const tilt = -side * slope;
      let ax = nx + sx * tilt;
      let ay = ny;
      let az = nz + sz * tilt;
      const inv = 1 / Math.hypot(ax, ay, az);
      ax *= inv;
      ay *= inv;
      az *= inv;
      return { p: [r.x + sx * k, r.y + (side === 0 ? 0 : lift), r.z + sz * k], n: [ax, ay, az], u: Utils.lerp(foliage.u0, foliage.u1, u), v };
    };
    return [make(-1, 0), make(0, 0.5), make(1, 1)];
  });
  const push = (a, b, c) => {
    for (const q of [a, b, c]) {
      vertices.push(q.p[0], q.p[1], q.p[2]);
      normals.push(q.n[0], q.n[1], q.n[2]);
      uvs.push(q.u, q.v);
    }
  };
  for (let i = 0; i < segs; i++) {
    const a = grid[i];
    const b = grid[i + 1];
    for (let c = 0; c < 2; c++) {
      push(a[c], a[c + 1], b[c + 1]);
      push(a[c], b[c + 1], b[c]);
    }
  }
}

/** Pushes a slim round cane from (`cx`, `y0`, `cz`) up to `y1`, narrowing from `r0` to `r1`, with smooth radial normals. */
function pushCane(vertices, normals, uvs, stem, base, top, radius, segs = 7) {
  const cx = base.x;
  const cz = base.z;
  const y0 = base.y;
  const y1 = top.y;
  const r0 = radius.x;
  const r1 = radius.y;
  const slope = (r0 - r1) / Math.max(y1 - y0, 0.001);
  const ring = Math.hypot(1, slope);
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Trigo.twopi;
    const a1 = ((i + 1) / segs) * Trigo.twopi;
    const u0 = Utils.lerp(stem.u0, stem.u1, i / segs);
    const u1 = Utils.lerp(stem.u0, stem.u1, (i + 1) / segs);
    const corners = [[a0, y0, r0, u0, 0.96], [a1, y0, r0, u1, 0.96], [a1, y1, r1, u1, 0.04], [a0, y1, r1, u0, 0.04]];
    const q = corners.map(([a, y, r, u, v]) => ({
      p: [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r],
      n: [Math.cos(a) / ring, slope / ring, Math.sin(a) / ring],
      u,
      v,
    }));
    for (const idx of [0, 1, 2, 0, 2, 3]) {
      vertices.push(q[idx].p[0], q[idx].p[1], q[idx].p[2]);
      normals.push(q[idx].n[0], q[idx].n[1], q[idx].n[2]);
      uvs.push(q[idx].u, q[idx].v);
    }
  }
}

/**
 * Builds the 3D Office Plant mesh standing on `y = 0`, centered on `x/z`:
 * - Terracotta planter pot (`y = 0..15.0`) with tapered base, outer rim, and potting soil.
 * - Central and branching stems rising from the soil (`y = 14.0..26.0`).
 * - Layered foliage leaves / fronds (`y = 20.0..36.0`).
 */
export function buildOfficePlant() {
  const vertices = [];
  const normals = [];
  const uvs = [];
  const { pot, foliage, stem, soil } = plantUvs();
  const potMid = (pot.u0 + pot.u1) * 0.5;
  const potHalf = (pot.u1 - pot.u0) * 0.4;
  const soilMid = (soil.u0 + soil.u1) * 0.5;
  const soilHalf = (soil.u1 - soil.u0) * 0.45;

  // 1. Terracotta planter pot (y = 0 .. 15.0): a bellied wall, a thick rolled rim and a flat foot
  pushFrustumRing(vertices, normals, uvs, argV3a.setScalar(0, 0, 0), argV3b.setScalar(0, 1.2, 0), argV2a.setScalar(5.6, 6.0), uvBox(pot.u0, 0.82, pot.u1, 0.95), 20);
  pushFrustumRing(vertices, normals, uvs, argV3a.setScalar(0, 1.2, 0), argV3b.setScalar(0, 9.5, 0), argV2a.setScalar(6.0, 7.9), uvBox(pot.u0, 0.3, pot.u1, 0.82), 20);
  pushFrustumRing(vertices, normals, uvs, argV3a.setScalar(0, 9.5, 0), argV3b.setScalar(0, 12.8, 0), argV2a.setScalar(7.9, 8.4), uvBox(pot.u0, 0.2, pot.u1, 0.3), 20);
  pushFrustumRing(vertices, normals, uvs, argV3a.setScalar(0, 12.8, 0), argV3b.setScalar(0, 13.4, 0), argV2a.setScalar(8.4, 9.0), uvBox(pot.u0, 0.1, pot.u1, 0.2), 20);
  pushFrustumRing(vertices, normals, uvs, argV3a.setScalar(0, 13.4, 0), argV3b.setScalar(0, 15.0, 0), argV2a.setScalar(9.0, 8.8), uvBox(pot.u0, 0.05, pot.u1, 0.1), 20);
  pushFrustumRing(vertices, normals, uvs, argV3a.setScalar(0, 15.0, 0), argV3b.setScalar(0, 14.2, 0), argV2a.setScalar(8.8, 8.0), uvBox(pot.u0, 0.05, pot.u1, 0.1), 20);
  pushTopDisc(vertices, normals, uvs, argV3a.setScalar(0, 0, 0), 5.6, argV2a.setScalar(potMid, 0.5), argV2b.setScalar(potHalf, 0.4), 20);

  // 2. Potting soil heaped a little in the middle
  pushFrustumRing(vertices, normals, uvs, argV3a.setScalar(0, 14.2, 0), argV3b.setScalar(0, 14.9, 0), argV2a.setScalar(8.0, 5.6), uvBox(soil.u0, 0.2, soil.u1, 0.8), 20);
  pushTopDisc(vertices, normals, uvs, argV3a.setScalar(0, 14.9, 0), 5.6, argV2a.setScalar(soilMid, 0.5), argV2b.setScalar(soilHalf * 0.7, 0.35), 20);

  // 3. Three slim canes of different heights, each carrying a crown of arching leaves; shorter leaves spring from the soil
  const rnd = mulberry32(8710);
  const canes = [
    { x: 0.2, z: 0.0, top: 25.4, leaves: 8, length: 10.0, pitch: 1.18 },
    { x: -2.6, z: 1.6, top: 20.6, leaves: 7, length: 9.2, pitch: 1.08 },
    { x: 2.4, z: -1.8, top: 22.8, leaves: 7, length: 9.6, pitch: 1.12 },
  ];
  for (const cane of canes) {
    pushCane(vertices, normals, uvs, stem, argV3a.setScalar(cane.x, 14.5, cane.z), argV3b.setScalar(cane.x, cane.top, cane.z), argV2a.setScalar(0.78, 0.5));
    for (let i = 0; i < cane.leaves; i++) {
      const yaw = (i / cane.leaves) * Trigo.twopi + rnd() * 0.5;
      // leaves alternate between young and upright and old and drooping
      const old = i % 2;
      pushLeaf(vertices, normals, uvs, foliage, argV3a.setScalar(cane.x, cane.top - 0.4, cane.z), yaw, cane.length * (0.8 + rnd() * 0.3), 3.2 + rnd() * 0.8, cane.pitch - old * 0.5 + rnd() * 0.2, 0.9 + old * 0.7 + rnd() * 0.4, 0.4, 6);
    }
  }
  for (let i = 0; i < 7; i++) {
    const yaw = (i / 7) * Trigo.twopi + 0.3 + rnd() * 0.4;
    pushLeaf(vertices, normals, uvs, foliage, argV3a.setScalar(Math.cos(yaw) * 1.6, 14.7, Math.sin(yaw) * 1.6), yaw, 8.0 + rnd() * 2.5, 3.4 + rnd() * 0.8, 0.85 + rnd() * 0.3, 0.9 + rnd() * 0.5, 0.45, 6);
  }

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
}

/** The atlas fractions the plant's meshes read their textures from. */
function plantUvs() {
  const W = PLANT_ATLAS.width;
  const inset = 0.35 / W;
  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });
  const pot = { u0: PLANT_POT.x / W + inset, u1: (PLANT_POT.x + PLANT_POT.width) / W - inset };
  const foliage = { u0: PLANT_FOLIAGE.x / W + inset, u1: (PLANT_FOLIAGE.x + PLANT_FOLIAGE.width) / W - inset };
  const stem = { u0: PLANT_STEM.x / W + inset, u1: (PLANT_STEM.x + PLANT_STEM.width) / W - inset };
  const soil = { u0: PLANT_SOIL.x / W + inset, u1: (PLANT_SOIL.x + PLANT_SOIL.width) / W - inset };
  const boxUvs = (cell, v0, v1) => {
    const r = uvRect(cell.u0, v0, cell.u1, v1);
    return { front: r, back: r, left: r, right: r, top: r, bottom: r };
  };
  return { uvRect, pot, foliage, stem, soil, boxUvs };
}

/**
 * Builds the 3D wreck left standing when an Office Plant is destroyed: the lower half of the terracotta pot with a jagged
 * broken rim, a mound of spilled potting soil heaped in it, a snapped stem stub and a few leaves lying on the soil.
 */
export function plantWreckMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];
  const { pot, foliage, stem, soil } = plantUvs();
  const potMid = (pot.u0 + pot.u1) * 0.5;

  // 1. The pot's lower half (y = 0 .. 8.0), its base disc, and the broken edge it leaves
  pushFrustumRing(vertices, normals, uvs, argV3a.setScalar(0, 0, 0), argV3b.setScalar(0, 8.0, 0), argV2a.setScalar(6.2, 7.5), uvBox(pot.u0, 0.5, pot.u1, 0.9), 12);
  pushTopDisc(vertices, normals, uvs, argV3a.setScalar(0, 0, 0), 6.2, argV2a.setScalar(potMid, 0.5), argV2b.setScalar((pot.u1 - pot.u0) * 0.4, 0.4), 12);
  for (let i = 0; i < 12; i++) {
    // a saw-tooth rim: the pot wall is torn away higher in some places than others
    const a0 = (i / 12) * Trigo.twopi;
    const a1 = ((i + 1) / 12) * Trigo.twopi;
    const aM = (a0 + a1) * 0.5;
    const tooth = [0, 2.6, 0.8, 3.4, 0.4, 1.8, 0, 3.0, 1.2, 2.2, 0.6, 3.6][i];
    if (tooth < 0.5)
      continue;
    const b0 = new Vec3(Math.cos(a0) * 7.5, 8.0, Math.sin(a0) * 7.5);
    const b1 = new Vec3(Math.cos(a1) * 7.5, 8.0, Math.sin(a1) * 7.5);
    const tip = new Vec3(Math.cos(aM) * 7.7, 8.0 + tooth, Math.sin(aM) * 7.7);
    const uA = Utils.lerp(pot.u0, pot.u1, i / 12);
    const uB = Utils.lerp(pot.u0, pot.u1, (i + 1) / 12);
    pushTri(vertices, normals, uvs, b1, b0, tip, new Vec2(uB, 0.45), new Vec2(uA, 0.45), new Vec2((uA + uB) * 0.5, 0.25));
    pushTri(vertices, normals, uvs, b0, b1, tip, new Vec2(uA, 0.45), new Vec2(uB, 0.45), new Vec2((uA + uB) * 0.5, 0.25));
  }

  // 2. Spilled potting soil heaped in the pot, higher in the middle
  pushTopDisc(vertices, normals, uvs, argV3a.setScalar(0, 8.2, 0), 7.2, argV2a.setScalar((soil.u0 + soil.u1) * 0.5, 0.5), argV2b.setScalar((soil.u1 - soil.u0) * 0.45, 0.45), 12);
  pushFrustumRing(vertices, normals, uvs, argV3a.setScalar(0, 8.2, 0), argV3b.setScalar(0, 9.4, 0), argV2a.setScalar(7.0, 4.4), uvBox(soil.u0, 0.2, soil.u1, 0.7), 10);
  pushTopDisc(vertices, normals, uvs, argV3a.setScalar(0, 9.4, 0), 4.4, argV2a.setScalar((soil.u0 + soil.u1) * 0.5, 0.5), argV2b.setScalar((soil.u1 - soil.u0) * 0.3, 0.3), 10);

  // 3. A snapped cane stub and a few leaves torn off and lying on the soil
  pushCane(vertices, normals, uvs, stem, argV3a.setScalar(0, 9.2, 0), argV3b.setScalar(0, 14.0, 0), argV2a.setScalar(0.8, 0.55));
  pushLeaf(vertices, normals, uvs, foliage, argV3a.setScalar(-1.0, 9.5, 0.8), 2.6, 5.8, 3.0, 0.12, 0.25, 0.25, 4);
  pushLeaf(vertices, normals, uvs, foliage, argV3a.setScalar(1.2, 9.5, -1.0), -0.9, 5.6, 3.0, 0.1, 0.3, 0.25, 4);
  pushLeaf(vertices, normals, uvs, foliage, argV3a.setScalar(0.8, 9.6, 1.4), 0.7, 4.6, 2.6, 0.14, 0.2, 0.25, 4);

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
}

/**
 * Builds the 3D spilled potting soil mesh on the floor (`y = 0.12`) around a destroyed Office Plant: an irregular
 * 12-sided pool of dark soil, spread a little further to the front.
 */
export function plantDebrisMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];
  const { soil } = plantUvs();
  const uc = (soil.u0 + soil.u1) * 0.5;
  const uSpan = (soil.u1 - soil.u0) * 0.42;
  const radii = [11.0, 13.4, 15.8, 14.6, 12.0, 10.0, 9.2, 10.6, 12.8, 14.2, 12.4, 10.4];
  const center = new Vec3(0.4, 0.12, 2.6);
  const uvCenter = new Vec2(uc, 0.5);
  for (let i = 0; i < radii.length; i++) {
    const next = (i + 1) % radii.length;
    const a0 = (i / radii.length) * Trigo.twopi;
    const a1 = (next / radii.length) * Trigo.twopi;
    const p0 = new Vec3(center.x + Math.cos(a0) * radii[i], 0.12, center.z + Math.sin(a0) * radii[i]);
    const p1 = new Vec3(center.x + Math.cos(a1) * radii[next], 0.12, center.z + Math.sin(a1) * radii[next]);
    const uv0 = new Vec2(uc + Math.cos(a0) * uSpan, 0.5 + Math.sin(a0) * 0.4);
    const uv1 = new Vec2(uc + Math.cos(a1) * uSpan, 0.5 + Math.sin(a1) * 0.4);
    pushTri(vertices, normals, uvs, center, p1, p0, uvCenter, uv1, uv0);
  }
  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
}

/**
 * Builds the 3D shrapnel blasted off a destroyed Office Plant:
 * - `carboyTop` (the name every furniture piece shares for its top part): the leafy crown torn off the stems, with its
 *   local origin at its centre so it tumbles.
 * - `shards`: `PLANT_SHARD_COUNT` flying fragments, 3 curved shards of terracotta pot and 2 tufts of leaves.
 */
export function plantShrapnelParts() {
  const { pot, foliage, stem } = plantUvs();

  const crownVerts = [];
  const crownNorms = [];
  const crownUvs = [];
  pushCane(crownVerts, crownNorms, crownUvs, stem, argV3a.setScalar(0, -4.5, 0), argV3b.setScalar(0, -0.5, 0), argV2a.setScalar(0.6, 0.5));
  for (let i = 0; i < 7; i++)
    pushLeaf(crownVerts, crownNorms, crownUvs, foliage, argV3a.setScalar(0, -0.5, 0), (i / 7) * Trigo.twopi, 6.4 + (i % 2) * 1.4, 2.8, 0.7 - (i % 2) * 0.35, 0.9, 0.35, 4);

  const shards = [];
  // three curved pieces of the pot wall, each a jagged strip of the terracotta
  const arcSpan = (Trigo.twopi / 3) * 0.5;
  for (let s = 0; s < 3; s++) {
    const verts = [];
    const norms = [];
    const uvs = [];
    const subSegs = 3;
    const R = 7.4;
    const halfH = 3.2 + (s % 2) * 0.9;
    const uBase = s / 3;
    const uSpan = 0.6 / 3;
    for (let j = 0; j < subSegs; j++) {
      const a0 = (j / subSegs - 0.5) * arcSpan;
      const a1 = ((j + 1) / subSegs - 0.5) * arcSpan;
      const x0 = Math.sin(a0) * R;
      const z0 = (Math.cos(a0) - 0.9) * R;
      const x1 = Math.sin(a1) * R;
      const z1 = (Math.cos(a1) - 0.9) * R;
      const top0 = halfH * (0.74 + ((s + j) % 2) * 0.4);
      const top1 = halfH * (0.74 + ((s + j + 1) % 2) * 0.4);
      const bot0 = -halfH * (0.7 + ((s + j + 1) % 2) * 0.3);
      const bot1 = -halfH * (0.7 + ((s + j) % 2) * 0.3);
      const b0 = new Vec3(x0, bot0, z0);
      const b1 = new Vec3(x1, bot1, z1);
      const t0 = new Vec3(x0 * 1.04, top0, z0 + 0.3);
      const t1 = new Vec3(x1 * 1.04, top1, z1 + 0.3);
      const u0 = Utils.lerp(pot.u0, pot.u1, uBase + (j / subSegs) * uSpan);
      const u1 = Utils.lerp(pot.u0, pot.u1, uBase + ((j + 1) / subSegs) * uSpan);
      pushQuad(verts, norms, uvs, b0, b1, t1, t0, uvBox(u0, 0.3, u1, 0.85));
      pushQuad(verts, norms, uvs, b1, b0, t0, t1, uvBox(u0, 0.3, u1, 0.85));
    }
    shards.push(flipV({ vertices: new Float32Array(verts), normals: new Float32Array(norms), uvs: new Float32Array(uvs) }));
  }
  // two tufts of leaves
  for (let s = 0; s < 2; s++) {
    const verts = [];
    const norms = [];
    const uvs = [];
    for (let i = 0; i < 3; i++)
      pushLeaf(verts, norms, uvs, foliage, argV3a.setScalar(0, 0, 0), (i / 3) * Trigo.twopi + s * 0.9, 4.6, 2.2, 0.06, 0.12, 0.25, 3);
    shards.push(flipV({ vertices: new Float32Array(verts), normals: new Float32Array(norms), uvs: new Float32Array(uvs) }));
  }
  return {
    carboyTop: flipV({ vertices: new Float32Array(crownVerts), normals: new Float32Array(crownNorms), uvs: new Float32Array(crownUvs) }),
    shards,
  };
}

/** Pre-allocates a reusable pose structure for `plantBreakPose`. */
export function createPlantBreakPose() {
  return createDispenserBreakPose();
}

/**
 * Computes the 3D transforms for a destroyed Office Plant's wreck, spilled potting soil,
 * broken pot fragments, and flying foliage shards at `elapsed` seconds after destruction,
 * writing into `target` with zero allocations.
 */
export function plantBreakPose(elapsed, seed = 0, target = createPlantBreakPose()) {
  const t = Math.max(0, elapsed);
  const jolt = t < 0.18 ? Math.sin((t / 0.18) * Trigo.pi) : 0;
  target.wreckScale.setScalar(1 + jolt * 0.1, 1 - jolt * 0.08, 1 + jolt * 0.1);
  target.wreckRot.setScalar(jolt * 0.05 * Math.sin(seed * 3), 0, jolt * 0.05 * Math.cos(seed * 3));

  const soilSpread = Utils.smoothstep(0, 0.45, t);
  const sScale = 0.2 + 0.8 * soilSpread;
  target.puddleScale.setScalar(sScale, 1, sScale);

  const topDuration = 0.8;
  const topSpread = Math.sin(seed * 2.3 + 0.5) * 0.8;
  const topDist = 12 + ((Math.cos(seed * 3.7) + 1) * 0.5) * 6;
  writeBallisticArc(target.carboyTop.pos, target.carboyTop.rot, argV3a.setScalar(0, 18.0, 0), argV3b.setScalar(Math.sin(topSpread) * topDist, 1.5, Math.cos(topSpread) * topDist), argV3c.setScalar(Trigo.pi * 2.2, topSpread + Trigo.pi * 0.6, Trigo.pi * 1.2), argV3d.setScalar(0.1, topSpread + 0.3, 0.1), t / topDuration, 10);

  for (let i = 0; i < PLANT_SHARD_COUNT; i++) {
    const shard = target.shards[i];
    const hash = Math.sin(seed * 2.5 + i * 3.14) * 0.5 + 0.5;
    const fan = ((i / PLANT_SHARD_COUNT) * Trigo.twopi) + (hash - 0.5) * 0.4;
    const startX = Math.cos(fan) * 6;
    const startY = 8.0 + hash * 6.0;
    const startZ = Math.sin(fan) * 6;
    const dist = 10 + hash * 10;
    const duration = 0.55 + hash * 0.25;
    const peakLift = 8 + (1 - hash) * 8;
    writeBallisticArc(shard.pos, shard.rot, argV3a.setScalar(startX, startY, startZ), argV3b.setScalar(Math.cos(fan) * dist, 0.8, Math.sin(fan) * dist), argV3c.setScalar(Trigo.pi * (2 + hash), fan + Trigo.pi * 0.5, Trigo.pi * 1.5), argV3d.setScalar(0.15, fan, 0.2), t / duration, peakLift);
  }
  return target;
}

const PORCELAIN_BASE = [148, 158, 172];
const PORCELAIN_LIGHT = [186, 196, 208];
const PORCELAIN_DARK = [86, 96, 112];
const PORCELAIN_SHADOW = [38, 46, 58];
const SEAT_BASE = [162, 172, 184];
const SEAT_LIGHT = [196, 204, 216];
const SEAT_DARK = [98, 108, 122];
const STALL_PANEL = [56, 72, 92];
const STALL_LIGHT = [84, 104, 128];
const STALL_DARK = [34, 46, 62];
const STALL_TRIM = [142, 154, 168];

/** Pivot point (`Vec3`) on the inner edge of the front-left stall pilaster where the swinging battant door is hinged. */
export const TOILET_DOOR_PIVOT = new Vec3(-15.6, 0, 25.8);

function drawToiletPorcelain(rnd) {
  const t = new Tile(TOILET_PORCELAIN.width, TOILET_PORCELAIN.height);
  plate(t, 0, 0, TOILET_PORCELAIN.width, TOILET_PORCELAIN.height, rnd, PORCELAIN_BASE);

  // Upper rolled vitreous-china bowl rim band (y = 2..13)
  t.rect(1, 2, 62, 11, PORCELAIN_LIGHT, 0.72);
  for (let x = 2; x < 62; x++) {
    t.set(x, 3, SEAT_LIGHT, 0.85);
    t.set(x, 12, PORCELAIN_DARK, 0.82);
    t.set(x, 13, PORCELAIN_SHADOW, 0.75);
  }

  // Sculpted bellied bowl & siphon trapway contour (y = 14..48)
  for (let y = 14; y < 48; y++)
    for (let x = 3; x < 61; x++) {
      const sheen = Math.sin(((x - 3) / 58) * Trigo.pi) * Math.sin(((y - 14) / 34) * Trigo.pi);
      t.set(x, y, PORCELAIN_LIGHT, sheen * 0.48);
    }
  // Recessed trapway S-curve contour on the side of the pedestal
  t.rect(14, 24, 36, 18, PORCELAIN_DARK, 0.32);
  for (let x = 16; x < 48; x++) {
    t.set(x, 24, PORCELAIN_SHADOW, 0.55);
    t.set(x, 41, PORCELAIN_LIGHT, 0.65);
  }

  // Flanged porcelain floor pedestal foot & dark rubberized seal gasket (y = 49..63)
  t.rect(2, 49, 60, 8, PORCELAIN_DARK, 0.45);
  for (let x = 3; x < 61; x++)
    t.set(x, 49, PORCELAIN_LIGHT, 0.7);
  t.rect(1, 57, 62, 6, KICKPLATE, 0.92);

  // Porcelain floor-bolt caps on the flanged foot
  for (const [rx, ry] of [[16, 53], [48, 53]])
    rivet(t, rx, ry);

  // Relief: rolled bowl rim, bellied ceramic trapway boss, and recessed floor gasket
  t.pipe(1, 2, 62, 11, 1.5, true);
  t.relief(6, 16, 52, 30, 0.9, 2.2);
  t.relief(14, 24, 36, 18, -0.6, 1.4);
  t.relief(1, 57, 62, 6, -0.8, 0.8);

  rust(t, rnd, 0.1);
  return t;
}

function drawToiletCistern(rnd) {
  const t = new Tile(TOILET_CISTERN.width, TOILET_CISTERN.height);
  plate(t, 0, 0, 32, TOILET_CISTERN.height, rnd, PORCELAIN_BASE);
  plate(t, 32, 0, 32, TOILET_CISTERN.height, rnd, STALL_PANEL);

  // Left half (x = 0..31): Porcelain Cistern Tank, Overhanging Lid, Chrome Flush Lever & Supply Valve
  t.rect(1, 2, 30, 10, PORCELAIN_LIGHT, 0.78);
  for (let x = 1; x < 31; x++) {
    t.set(x, 3, SEAT_LIGHT, 0.85);
    t.set(x, 11, PORCELAIN_DARK, 0.85);
    t.set(x, 12, SHADOW, 0.88);
  }
  // Dual-flush chrome button badge inlaid in the center of the tank lid
  t.rect(11, 4, 10, 5, STAINLESS_LIGHT, 0.9);
  t.rect(12, 5, 4, 3, STAINLESS_DARK, 0.75);
  t.rect(17, 5, 3, 3, SEAT_LIGHT, 0.85);

  // Main cistern front wall with recessed beveled inspection panel (x = 3..29, y = 16..46)
  t.rect(3, 16, 26, 30, PORCELAIN_DARK, 0.24);
  for (let y = 17; y < 45; y++)
    for (let x = 4; x < 28; x++) {
      const sheen = Math.sin(((x - 4) / 24) * Trigo.pi) * 0.36;
      t.set(x, y, PORCELAIN_LIGHT, sheen);
    }
  for (let x = 3; x < 29; x++) {
    t.set(x, 16, PORCELAIN_SHADOW, 0.7);
    t.set(x, 45, PORCELAIN_LIGHT, 0.75);
  }

  // Left-mounted chrome flush lever escutcheon & handle bar (x = 4..13, y = 19..25)
  t.rect(4, 19, 4, 6, STAINLESS_DARK, 0.9);
  t.rect(5, 20, 8, 4, STAINLESS_LIGHT, 0.92);
  t.rect(6, 21, 6, 2, SEAT_LIGHT, 0.85);

  // Lower band (y = 49..63): Chrome water supply valve, braided riser pipe & rubber tank gasket
  t.rect(1, 49, 30, 14, STAINLESS_BASE, 0.85);
  for (let x = 1; x < 31; x++) {
    t.set(x, 50, STAINLESS_LIGHT, 0.8);
    t.set(x, 56, PORCELAIN_SHADOW, 0.85);
  }
  t.rect(3, 58, 8, 5, COLD_BLUE, 0.9);

  // Right half (x = 32..63): Powder-Coated Restroom Cubicle Partition & Swinging Battant Door Panel
  // Top anodized aluminum headrail & cap-rail trim (y = 1..6)
  t.rect(32, 1, 32, 5, STALL_TRIM, 0.88);
  for (let x = 32; x < 64; x++) {
    t.set(x, 1, SEAT_LIGHT, 0.85);
    t.set(x, 5, STALL_DARK, 0.85);
  }
  // Main enameled steel stall partition & door surface (y = 7..56)
  for (let y = 7; y < 56; y++)
    for (let x = 33; x < 63; x++) {
      const sheen = Math.sin(((x - 33) / 30) * Trigo.pi) * 0.28;
      t.set(x, y, STALL_LIGHT, sheen);
    }
  // Recessed beveled battant door inner panel (x = 36..59, y = 11..51)
  t.rect(36, 11, 24, 40, STALL_DARK, 0.35);
  for (let x = 36; x < 60; x++) {
    t.set(x, 11, PORCELAIN_SHADOW, 0.8);
    t.set(x, 50, STALL_LIGHT, 0.72);
  }
  for (let y = 11; y < 51; y++) {
    t.set(36, y, PORCELAIN_SHADOW, 0.75);
    t.set(59, y, STALL_LIGHT, 0.68);
  }
  // Horizontal privacy ventilation louver slots in the lower door panel (y = 38..48)
  for (const ly of [38, 41, 44, 47])
    for (let lx = 39; lx < 57; lx++) {
      t.set(lx, ly, PORCELAIN_SHADOW, 0.88);
      t.set(lx, ly + 1, STALL_LIGHT, 0.65);
    }
  // Chrome rotary door latch & Vacant/Occupied indicator window (x = 53..61, y = 26..32)
  t.rect(53, 26, 8, 6, STAINLESS_LIGHT, 0.9);
  t.rect(54, 28, 3, 2, LED_GREEN, 0.85);
  t.rect(57, 28, 3, 2, HOT_RED, 0.85);

  // Bottom stainless-steel pilaster floor shoe (y = 57..63)
  t.rect(32, 57, 32, 6, KICKPLATE, 0.9);
  for (let x = 32; x < 64; x++)
    t.set(x, 57, STALL_TRIM, 0.75);

  // Relief: cistern lid, recessed cistern panel, stall headrail, recessed door bevel, louver slots & rotary latch
  t.relief(1, 2, 30, 10, 1.2, 1.0);
  t.groove(1, 12.5, 30, 12.5, 1.6, 1.2);
  t.relief(3, 16, 26, 30, -0.5, 1.2);
  t.relief(4, 19, 9, 6, 1.1, 0.6);
  t.relief(32, 1, 32, 5, 1.0, 0.8);
  t.relief(36, 11, 24, 40, -0.6, 1.2);
  t.relief(53, 26, 8, 6, 1.1, 0.6);

  for (const [rx, ry] of [[7, 52], [25, 52], [35, 9], [60, 9], [35, 53], [60, 53]])
    rivet(t, rx, ry);

  rust(t, rnd, 0.12);
  return t;
}

function drawToiletSeat(rnd) {
  const t = new Tile(TOILET_SEAT.width, TOILET_SEAT.height);
  plate(t, 0, 0, TOILET_SEAT.width, TOILET_SEAT.height, rnd, SEAT_BASE);

  // Upper region (y = 0..41): Contoured enameled polymer toilet seat ring & hinged lid surface
  for (let y = 2; y < 40; y++)
    for (let x = 2; x < 62; x++) {
      const contour = Math.sin(((x - 2) / 60) * Trigo.pi) * Math.sin(((y - 2) / 38) * Trigo.pi);
      t.set(x, y, SEAT_LIGHT, contour * 0.55);
    }
  // Subtle recessed inner lid bevel & rubberized seat bumpers
  for (let x = 8; x < 56; x++) {
    t.set(x, 7, SEAT_DARK, 0.65);
    t.set(x, 34, SEAT_LIGHT, 0.75);
  }
  t.rect(12, 36, 10, 3, PORCELAIN_DARK, 0.75);
  t.rect(42, 36, 10, 3, PORCELAIN_DARK, 0.75);

  // Lower region (y = 42..63): Chrome hinge brackets (left) & dark inner siphon throat (right)
  t.rect(1, 42, 32, 21, STAINLESS_LIGHT, 0.85);
  for (let x = 2; x < 32; x++) {
    t.set(x, 44, SEAT_LIGHT, 0.85);
    t.set(x, 58, STAINLESS_DARK, 0.85);
  }
  t.rect(34, 42, 29, 21, ALCOVE_DARK, 0.94);

  t.relief(2, 2, 60, 38, 1.1, 1.6);
  t.relief(8, 7, 48, 27, -0.5, 1.2);
  t.pipe(1, 43, 32, 18, 1.0, true);

  return t;
}

function drawToiletWater(rnd) {
  const t = new Tile(TOILET_WATER.width, TOILET_WATER.height);
  const ripple = field(rnd, 5);
  const cx = TOILET_WATER.width * 0.5;
  const cy = TOILET_WATER.height * 0.5;

  for (let y = 0; y < TOILET_WATER.height; y++)
    for (let x = 0; x < TOILET_WATER.width; x++) {
      const dx = (x + 0.5 - cx) / 30;
      const dy = (y + 0.5 - cy) / 30;
      const r = Math.hypot(dx, dy);
      const n = ripple(x, y);

      let col;
      if (r > 0.86) {
        // Glazed inner porcelain bowl wall sloping down toward the water line
        const rimShade = Utils.clamp((r - 0.86) / 0.22, 0, 1);
        col = mix(PORCELAIN_DARK, PORCELAIN_LIGHT, rimShade * 0.75 + (n - 0.5) * 0.12);
      } else if (r > 0.78) {
        // Waterline meniscus & faint mineral ring
        col = mix(MENISCUS, PORCELAIN_BASE, 0.45);
      } else if (r < 0.28) {
        // Deep dark siphon trapway drain hole at the bottom of the bowl
        const throat = Utils.clamp(r / 0.28, 0, 1);
        col = mix(ALCOVE_DARK, WATER_DEEP, throat * 0.72);
      } else {
        // Clear facility water pool with concentric caustic ripples
        const depth = (0.78 - r) / 0.5;
        const wave = Math.sin(r * 26 + n * 4.5) * 0.5 + 0.5;
        const baseWater = mix(WATER_BRIGHT, WATER_MID, depth * 0.68);
        col = mix(baseWater, MENISCUS, wave * 0.28);
      }
      t.set(x, y, col, 1);
    }

  t.dome(cx, cy, 26, -1.6);
  return t;
}

/**
 * Returns the power-of-two RGBA texture atlas (256 x 64) for the 3D Facility Toilet Bowl furniture prop.
 */
export function toiletAtlas() {
  const { width, height } = TOILET_ATLAS;
  const data = new Uint8Array(width * height * 4);
  const relief = new Float32Array(width * height);
  const blit = (tile, x0) => blitTile(data, relief, width, tile, x0);
  blit(drawToiletPorcelain(mulberry32(8801)), TOILET_PORCELAIN.x);
  blit(drawToiletCistern(mulberry32(8802)), TOILET_CISTERN.x);
  blit(drawToiletSeat(mulberry32(8803)), TOILET_SEAT.x);
  blit(drawToiletWater(mulberry32(8804)), TOILET_WATER.x);
  return {
    name: 'toilet',
    data,
    relief,
    width,
    height,
    cell: TOILET_CELL,
    frames: TOILET_FRAMES,
    porcelain: TOILET_PORCELAIN,
    cistern: TOILET_CISTERN,
    seat: TOILET_SEAT,
    water: TOILET_WATER,
    front: TOILET_PORCELAIN,
    side: TOILET_CISTERN,
    top: TOILET_SEAT,
  };
}

function pushOvalFrustum(vertices, normals, uvs, base, top, baseRadius, topRadius, uv, segs = 14, inward = false) {
  const cz0 = base.z;
  const cz1 = top.z;
  const y0 = base.y;
  const y1 = top.y;
  const rx0 = baseRadius.x;
  const rz0 = baseRadius.y;
  const rx1 = topRadius.x;
  const rz1 = topRadius.y;
  const uStart = uv.topLeftCorner.x;
  const v0 = uv.topLeftCorner.y;
  const uEnd = uv.bottomRightCorner.x;
  const v1 = uv.bottomRightCorner.y;
  for (let i = 0; i < segs; i++) {
    const f0 = i / segs;
    const f1 = (i + 1) / segs;
    const a0 = f0 * Trigo.twopi;
    const a1 = f1 * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const b0 = new Vec3(c0 * rx0, y0, cz0 + s0 * rz0);
    const b1 = new Vec3(c1 * rx0, y0, cz0 + s1 * rz0);
    const t1 = new Vec3(c1 * rx1, y1, cz1 + s1 * rz1);
    const t0 = new Vec3(c0 * rx1, y1, cz1 + s0 * rz1);
    const u0 = Utils.lerp(uStart, uEnd, f0);
    const u1 = Utils.lerp(uStart, uEnd, f1);
    if (inward)
      pushQuad(vertices, normals, uvs, b0, b1, t1, t0, uvBox(u0, v0, u1, v1));
    else
      pushQuad(vertices, normals, uvs, b1, b0, t0, t1, uvBox(u0, v0, u1, v1));
  }
}

function pushOvalRingCap(vertices, normals, uvs, pos, outer, inner, uvCentre, uvRadius, segs = 14) {
  const cz = pos.z;
  const y = pos.y;
  const rxOuter = outer.x;
  const rzOuter = outer.y;
  const rxInner = inner.x;
  const rzInner = inner.y;
  const uCenter = uvCentre.x;
  const vCenter = uvCentre.y;
  const uRadius = uvRadius.x;
  const vRadius = uvRadius.y;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Trigo.twopi;
    const a1 = ((i + 1) / segs) * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const o0 = new Vec3(c0 * rxOuter, y, cz + s0 * rzOuter);
    const o1 = new Vec3(c1 * rxOuter, y, cz + s1 * rzOuter);
    const i1 = new Vec3(c1 * rxInner, y, cz + s1 * rzInner);
    const i0 = new Vec3(c0 * rxInner, y, cz + s0 * rzInner);
    const uo0 = new Vec2(uCenter + c0 * uRadius, vCenter + s0 * vRadius);
    const uo1 = new Vec2(uCenter + c1 * uRadius, vCenter + s1 * vRadius);
    const ui1 = new Vec2(uCenter + c1 * uRadius * 0.68, vCenter + s1 * vRadius * 0.68);
    const ui0 = new Vec2(uCenter + c0 * uRadius * 0.68, vCenter + s0 * vRadius * 0.68);
    pushTri(vertices, normals, uvs, o0, i1, o1, uo0, ui1, uo1);
    pushTri(vertices, normals, uvs, o0, i0, i1, uo0, ui0, ui1);
  }
}

function pushOvalDisc(vertices, normals, uvs, pos, radius, uvCentre, uvRadius, segs = 14) {
  const cz = pos.z;
  const y = pos.y;
  const rx = radius.x;
  const rz = radius.y;
  const uCenter = uvCentre.x;
  const vCenter = uvCentre.y;
  const uRadius = uvRadius.x;
  const vRadius = uvRadius.y;
  const center = new Vec3(0, y, cz);
  const uvCenter = new Vec2(uCenter, vCenter);
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Trigo.twopi;
    const a1 = ((i + 1) / segs) * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const p0 = new Vec3(c0 * rx, y, cz + s0 * rz);
    const p1 = new Vec3(c1 * rx, y, cz + s1 * rz);
    const uv0 = new Vec2(uCenter + c0 * uRadius, vCenter + s0 * vRadius);
    const uv1 = new Vec2(uCenter + c1 * uRadius, vCenter + s1 * vRadius);
    pushTri(vertices, normals, uvs, center, p1, p0, uvCenter, uv1, uv0);
  }
}

function buildToiletStall(vertices, normals, uvs, porcU0, porcU1, stallU0, stallU1, chromeU0, chromeU1) {
  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });
  const panelFaces = {
    front: uvRect(stallU0, 0.12, stallU1, 0.88),
    back: uvRect(stallU0, 0.12, stallU1, 0.88),
    left: uvRect(stallU0, 0.12, stallU1, 0.88),
    right: uvRect(stallU0, 0.12, stallU1, 0.88),
    top: uvRect(stallU0, 0.02, stallU1, 0.1),
    bottom: uvRect(stallU0, 0.82, stallU1, 0.9),
  };
  const railFaces = {
    front: uvRect(stallU0, 0.02, stallU1, 0.1),
    back: uvRect(stallU0, 0.02, stallU1, 0.1),
    left: uvRect(stallU0, 0.02, stallU1, 0.1),
    right: uvRect(stallU0, 0.02, stallU1, 0.1),
    top: uvRect(stallU0, 0.02, stallU1, 0.1),
    bottom: uvRect(stallU0, 0.02, stallU1, 0.1),
  };
  const shoeFaces = {
    front: uvRect(stallU0, 0.9, stallU1, 0.99),
    back: uvRect(stallU0, 0.9, stallU1, 0.99),
    left: uvRect(stallU0, 0.9, stallU1, 0.99),
    right: uvRect(stallU0, 0.9, stallU1, 0.99),
    top: uvRect(stallU0, 0.02, stallU1, 0.1),
    bottom: uvRect(stallU0, 0.9, stallU1, 0.99),
  };
  const chromeFaces = {
    front: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    back: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    left: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    right: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    top: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    bottom: uvRect(chromeU0, 0.68, chromeU1, 0.96),
  };

  // 1. Left & Right Cubicle Side Partition Panels (y = 7.2 .. 49.0, z = -13.6 .. 25.0)
  pushBoxPart(vertices, normals, uvs, new Vec3(-24.6, 7.2, -13.6), new Vec3(-23.0, 49.0, 25.0), panelFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(23.0, 7.2, -13.6), new Vec3(24.6, 49.0, 25.0), panelFaces);

  // Side partition top anodized aluminum cap rails (y = 49.0 .. 50.4)
  pushBoxPart(vertices, normals, uvs, new Vec3(-24.8, 49.0, -13.6), new Vec3(-22.8, 50.4, 25.0), railFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(22.8, 49.0, -13.6), new Vec3(24.8, 50.4, 25.0), railFaces);

  // Brushed-chrome pedestal support legs under left & right partitions (y = 0 .. 7.2) + floor shoes
  for (const sx of [-23.8, 23.8])
    for (const sz of [-6.0, 15.0]) {
      pushBoxPart(vertices, normals, uvs, new Vec3(sx - 0.9, 0, sz - 0.9), new Vec3(sx + 0.9, 1.4, sz + 0.9), shoeFaces);
      pushBoxPart(vertices, normals, uvs, new Vec3(sx - 0.55, 1.4, sz - 0.55), new Vec3(sx + 0.55, 7.2, sz + 0.55), chromeFaces);
    }

  // Rear chrome wall-fixing U-brackets anchoring partitions to the rear bulkhead wall (z = -13.8 .. -12.0)
  for (const sx of [-23.8, 23.8])
    for (const by of [13.0, 41.0])
      pushBoxPart(vertices, normals, uvs, new Vec3(sx - 1.0, by, -13.8), new Vec3(sx + 1.0, by + 3.2, -12.0), chromeFaces);

  // 2. Front Floor-to-Headrail Pilaster Door Jambs (z = 25.0 .. 26.6, y = 0 .. 50.4)
  // Left pilaster (x = -24.8 .. -15.6) & stainless floor shoe
  pushBoxPart(vertices, normals, uvs, new Vec3(-25.0, 0, 24.8), new Vec3(-15.4, 2.2, 26.8), shoeFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(-24.8, 2.2, 25.0), new Vec3(-15.6, 50.4, 26.6), panelFaces);
  // Right pilaster (x = 15.6 .. 24.8) & stainless floor shoe + chrome latch keeper strike
  pushBoxPart(vertices, normals, uvs, new Vec3(15.4, 0, 24.8), new Vec3(25.0, 2.2, 26.8), shoeFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(15.6, 2.2, 25.0), new Vec3(24.8, 50.4, 26.6), panelFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(14.9, 26.2, 24.8), new Vec3(15.8, 29.6, 26.8), chromeFaces);

  // 3. Overhead Anodized Aluminum Anti-Grip Headrail Bar spanning the front of the cubicle (y = 50.4 .. 52.2)
  pushBoxPart(vertices, normals, uvs, new Vec3(-25.0, 50.4, 24.8), new Vec3(25.0, 52.2, 26.8), railFaces);

  // 4. Wall-Mounted Chrome Toilet Paper Dispenser & Roll on the inside of the right partition wall
  pushBoxPart(vertices, normals, uvs, new Vec3(20.6, 19.2, 0.8), new Vec3(23.0, 20.8, 6.4), chromeFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(21.0, 16.2, 1.2), new Vec3(22.8, 19.2, 6.0), {
    front: uvRect(porcU0, 0.04, porcU1, 0.22),
    back: uvRect(porcU0, 0.04, porcU1, 0.22),
    left: uvRect(porcU0, 0.04, porcU1, 0.22),
    right: uvRect(porcU0, 0.04, porcU1, 0.22),
    bottom: uvRect(porcU0, 0.04, porcU1, 0.22),
  });
}

/**
 * Builds the 3D Hinged Swinging Stall Door ("porte battante") mesh in hinge-local space (pivot at `TOILET_DOOR_PIVOT`):
 * - Suspended door panel (`x = 0.3..30.9, y = 7.6..48.6, z = -0.65..0.65`) with bottom & top clearance gaps,
 *   recessed beveled panel, and lower privacy ventilation louver slots.
 * - Upper & lower brushed-chrome gravity-pivot barrel hinges along `x = 0`.
 * - Double-sided chrome rotary Vacant/Occupied indicator latch & pull handle on the free edge (`x = 26.4..30.4`).
 */
export function toiletDoorMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = TOILET_ATLAS.width;
  const inset = 0.35 / W;
  const stallU0 = (TOILET_CISTERN.x + 32) / W + inset;
  const stallU1 = (TOILET_CISTERN.x + TOILET_CISTERN.width) / W - inset;
  const chromeU0 = TOILET_SEAT.x / W + inset;
  const chromeU1 = (TOILET_SEAT.x + 31) / W - inset;
  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  const chromeFaces = {
    front: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    back: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    left: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    right: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    top: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    bottom: uvRect(chromeU0, 0.68, chromeU1, 0.96),
  };

  // Main swinging battant door leaf (suspended at y = 7.6 .. 48.6 with top & bottom clearance gaps)
  pushBoxPart(vertices, normals, uvs, new Vec3(0.35, 7.6, -0.65), new Vec3(30.85, 48.6, 0.65), {
    front: uvRect(stallU0, 0.11, stallU1, 0.88),
    back: uvRect(stallU1, 0.11, stallU0, 0.88),
    left: uvRect(stallU0, 0.02, stallU1, 0.1),
    right: uvRect(stallU0, 0.02, stallU1, 0.1),
    top: uvRect(stallU0, 0.02, stallU1, 0.1),
    bottom: uvRect(stallU0, 0.82, stallU1, 0.9),
  });

  // Upper & lower chrome gravity-pivot barrel hinges at the left pilaster edge (x = -0.35 .. 1.0)
  pushBoxPart(vertices, normals, uvs, new Vec3(-0.35, 11.0, -0.95), new Vec3(1.0, 14.4, 0.95), chromeFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(-0.35, 42.0, -0.95), new Vec3(1.0, 45.4, 0.95), chromeFaces);

  // Rotary Vacant/Occupied latch housing & horizontal pull handle near the right edge (x = 26.2 .. 30.4)
  pushBoxPart(vertices, normals, uvs, new Vec3(26.2, 26.0, -1.15), new Vec3(30.4, 29.8, 1.15), {
    front: uvRect(stallU0 + (stallU1 - stallU0) * 0.62, 0.4, stallU1, 0.52),
    back: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    left: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    right: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    top: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    bottom: uvRect(chromeU0, 0.68, chromeU1, 0.96),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(27.2, 26.8, -1.85), new Vec3(29.4, 29.0, 1.85), chromeFaces);

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
}

/**
 * Builds the 3D Facility Toilet Cubicle & Bowl mesh standing on `y = 0`, centered on `x/z`, with the rear cistern tank at `-Z`,
 * sculpted oval bowl projecting forward toward `+Z`, side partition walls on chrome pedestal legs, front pilaster jambs,
 * overhead headrail bar, and wall-mounted toilet paper dispenser:
 * - Flanged vitreous-china pedestal foot & sculpted oval bowl (`y = 0..16.2`, `z = -8.6..11.8`) with recessed inner
 *   porcelain walls and standing bowl water at `y = 12.2`.
 * - Contoured oval toilet seat ring (`y = 16.2..17.1`), chrome hinge posts, and raised hinged cover lid (`y = 17.1..28.4`).
 * - Rear porcelain flush cistern tank (`y = 15.8..29.2`), beveled tank lid with chrome dual-flush button (`y = 29.2..31.0`),
 *   left-side chrome flush handle lever, and rear water supply stop-valve & riser pipe.
 * - Restroom cubicle side partition walls (`x = ±23.8, y = 7.2..50.4`), front pilasters (`z = 25.0..26.6`), and headrail (`y = 50.4..52.2`).
 */
export function toiletMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = TOILET_ATLAS.width;
  const inset = 0.35 / W;
  const porcU0 = TOILET_PORCELAIN.x / W + inset;
  const porcU1 = (TOILET_PORCELAIN.x + TOILET_PORCELAIN.width) / W - inset;
  const cistU0 = TOILET_CISTERN.x / W + inset;
  const cistU1 = (TOILET_CISTERN.x + 31) / W - inset;
  const stallU0 = (TOILET_CISTERN.x + 32) / W + inset;
  const stallU1 = (TOILET_CISTERN.x + TOILET_CISTERN.width) / W - inset;
  const seatU0 = TOILET_SEAT.x / W + inset;
  const seatU1 = (TOILET_SEAT.x + TOILET_SEAT.width) / W - inset;
  const chromeU0 = TOILET_SEAT.x / W + inset;
  const chromeU1 = (TOILET_SEAT.x + 31) / W - inset;
  const waterU0 = TOILET_WATER.x / W + inset;
  const waterU1 = (TOILET_WATER.x + TOILET_WATER.width) / W - inset;
  const waterUC = (waterU0 + waterU1) * 0.5;
  const waterUSpan = (waterU1 - waterU0) * 0.44;
  const seatUC = (seatU0 + seatU1) * 0.5;
  const seatUSpan = (seatU1 - seatU0) * 0.42;

  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  // 0. Restroom Stall Cubicle Partition Walls, Chrome Pedestal Legs, Front Pilasters & Overhead Headrail
  buildToiletStall(vertices, normals, uvs, porcU0, porcU1, stallU0, stallU1, chromeU0, chromeU1);

  // 1. Flanged Oval Porcelain Pedestal Base & Sculpted Bowl Outer Belly (y = 0 .. 16.2)
  pushOvalDisc(vertices, normals, uvs, argV3a.setScalar(0, 0, 2.0), argV2a.setScalar(5.2, 7.2), argV2b.setScalar((porcU0 + porcU1) * 0.5, 0.85), argV2c.setScalar((porcU1 - porcU0) * 0.35, 0.1), 14);
  pushOvalFrustum(vertices, normals, uvs, argV3a.setScalar(0, 0, 2.0), argV3b.setScalar(0, 2.0, 2.0), argV2a.setScalar(5.2, 7.2), argV2b.setScalar(4.6, 6.6), uvBox(porcU0, 0.78, porcU1, 0.98), 14);
  pushOvalFrustum(vertices, normals, uvs, argV3a.setScalar(0, 2.0, 2.0), argV3b.setScalar(0, 8.2, 2.4), argV2a.setScalar(4.6, 6.6), argV2b.setScalar(4.9, 7.2), uvBox(porcU0, 0.42, porcU1, 0.78), 14);
  pushOvalFrustum(vertices, normals, uvs, argV3a.setScalar(0, 8.2, 2.4), argV3b.setScalar(0, 13.6, 3.0), argV2a.setScalar(4.9, 7.2), argV2b.setScalar(6.8, 8.6), uvBox(porcU0, 0.18, porcU1, 0.42), 14);
  pushOvalFrustum(vertices, normals, uvs, argV3a.setScalar(0, 13.6, 3.0), argV3b.setScalar(0, 16.2, 3.0), argV2a.setScalar(6.8, 8.6), argV2b.setScalar(7.0, 8.8), uvBox(porcU0, 0.03, porcU1, 0.2), 14);

  // Rear porcelain trapway housing & cistern mounting deck (x = -5.4 .. 5.4, y = 0 .. 16.2, z = -9.4 .. 0.8)
  pushBoxPart(vertices, normals, uvs, new Vec3(-5.0, 0, -8.8), new Vec3(5.0, 13.6, 0.4), {
    front: uvRect(porcU0, 0.22, porcU1, 0.96),
    back: uvRect(porcU0, 0.22, porcU1, 0.96),
    left: uvRect(porcU0, 0.22, porcU1, 0.96),
    right: uvRect(porcU0, 0.22, porcU1, 0.96),
    bottom: uvRect(porcU0, 0.85, porcU1, 0.98),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(-6.2, 13.6, -9.6), new Vec3(6.2, 16.2, -1.2), {
    front: uvRect(porcU0, 0.04, porcU1, 0.22),
    back: uvRect(porcU0, 0.04, porcU1, 0.22),
    left: uvRect(porcU0, 0.04, porcU1, 0.22),
    right: uvRect(porcU0, 0.04, porcU1, 0.22),
    top: uvRect(porcU0, 0.04, porcU1, 0.2),
  });

  // 2. Hollowed Inner Porcelain Bowl Cavity & Standing Bowl Water (y = 11.4 .. 16.2)
  pushOvalRingCap(vertices, normals, uvs, argV3a.setScalar(0, 16.2, 3.0), argV2a.setScalar(7.0, 8.8), argV2b.setScalar(4.7, 6.4), argV2c.setScalar((porcU0 + porcU1) * 0.5, 0.1), argV2d.setScalar((porcU1 - porcU0) * 0.4, 0.08), 14);
  pushOvalFrustum(vertices, normals, uvs, argV3a.setScalar(0, 11.4, 2.8), argV3b.setScalar(0, 16.2, 3.0), argV2a.setScalar(3.5, 4.7), argV2b.setScalar(4.7, 6.4), uvBox(porcU0, 0.08, porcU1, 0.38), 14, true);
  pushOvalDisc(vertices, normals, uvs, argV3a.setScalar(0, 12.2, 2.9), argV2a.setScalar(4.1, 5.5), argV2b.setScalar(waterUC, 0.5), argV2c.setScalar(waterUSpan, 0.42), 14);

  // 3. Contoured Oval Toilet Seat Ring, Chrome Hinge Brackets & Raised Open Lid
  pushOvalFrustum(vertices, normals, uvs, argV3a.setScalar(0, 16.2, 3.0), argV3b.setScalar(0, 17.1, 3.0), argV2a.setScalar(6.8, 8.6), argV2b.setScalar(6.6, 8.4), uvBox(seatU0, 0.06, seatU1, 0.58), 14);
  pushOvalFrustum(vertices, normals, uvs, argV3a.setScalar(0, 16.2, 3.0), argV3b.setScalar(0, 17.1, 3.0), argV2a.setScalar(4.4, 6.1), argV2b.setScalar(4.5, 6.2), uvBox(seatU0, 0.06, seatU1, 0.58), 14, true);
  pushOvalRingCap(vertices, normals, uvs, argV3a.setScalar(0, 17.1, 3.0), argV2a.setScalar(6.6, 8.4), argV2b.setScalar(4.5, 6.2), argV2c.setScalar(seatUC, 0.3), argV2d.setScalar(seatUSpan, 0.24), 14);

  const chromeFaces = {
    front: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    back: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    left: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    right: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    top: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    bottom: uvRect(chromeU0, 0.68, chromeU1, 0.96),
  };
  // Chrome seat hinge posts at the rear of the bowl rim
  pushBoxPart(vertices, normals, uvs, new Vec3(-3.8, 16.2, -4.4), new Vec3(-2.4, 17.6, -2.8), chromeFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(2.4, 16.2, -4.4), new Vec3(3.8, 17.6, -2.8), chromeFaces);

  // Raised hinged toilet cover lid resting upright in front of the cistern tank (y = 17.2 .. 28.4, z = -4.2 .. -3.1)
  pushBoxPart(vertices, normals, uvs, new Vec3(-5.8, 17.2, -4.2), new Vec3(5.8, 28.4, -3.1), {
    front: uvRect(seatU0, 0.04, seatU1, 0.62),
    back: uvRect(seatU0, 0.04, seatU1, 0.62),
    left: uvRect(seatU0, 0.04, seatU1, 0.62),
    right: uvRect(seatU0, 0.04, seatU1, 0.62),
    top: uvRect(seatU0, 0.04, seatU1, 0.22),
  });

  // 4. Rear Porcelain Cistern Tank, Overhanging Lid, Chrome Flush Lever & Water Supply Valve (y = 4.6 .. 31.0)
  pushBoxPart(vertices, normals, uvs, new Vec3(-7.4, 15.8, -10.4), new Vec3(7.4, 29.2, -4.2), {
    front: uvRect(cistU0, 0.2, cistU1, 0.78),
    back: uvRect(porcU0, 0.16, porcU1, 0.76),
    left: uvRect(porcU0, 0.16, porcU1, 0.76),
    right: uvRect(porcU0, 0.16, porcU1, 0.76),
    bottom: uvRect(porcU0, 0.72, porcU1, 0.88),
  });
  // Overhanging beveled porcelain cistern tank lid (y = 29.2 .. 31.0)
  pushBoxPart(vertices, normals, uvs, new Vec3(-7.8, 29.2, -10.8), new Vec3(7.8, 31.0, -3.9), {
    front: uvRect(cistU0, 0.03, cistU1, 0.2),
    back: uvRect(cistU0, 0.03, cistU1, 0.2),
    left: uvRect(cistU0, 0.03, cistU1, 0.2),
    right: uvRect(cistU0, 0.03, cistU1, 0.2),
    top: uvRect(cistU0, 0.03, cistU1, 0.2),
    bottom: uvRect(porcU0, 0.72, porcU1, 0.88),
  });
  // Left-side chrome flush lever handle protruding from the cistern
  pushBoxPart(vertices, normals, uvs, new Vec3(-9.0, 26.4, -5.6), new Vec3(-7.4, 27.8, -4.0), chromeFaces);

  // Rear-left chrome water supply pipe & wall angle-stop valve under the cistern (y = 4.6 .. 15.8)
  pushBoxPart(vertices, normals, uvs, new Vec3(-6.2, 5.2, -10.6), new Vec3(-4.6, 6.8, -7.8), chromeFaces);
  pushBoxPart(vertices, normals, uvs, new Vec3(-5.8, 6.8, -8.8), new Vec3(-5.0, 15.8, -8.0), chromeFaces);

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
}

export const buildToilet = toiletMesh;

/**
 * Builds the 3D wrecked Facility Toilet Cubicle & Bowl left standing after destruction:
 * cubicle partition walls with fractured porcelain pedestal stump (`y = 0..12.6`), jagged ceramic teeth around the shattered bowl rim,
 * exposed siphon water pool, snapped supply pipe stub, and cracked rear cistern base mount.
 */
export function toiletWreckMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = TOILET_ATLAS.width;
  const inset = 0.35 / W;
  const porcU0 = TOILET_PORCELAIN.x / W + inset;
  const porcU1 = (TOILET_PORCELAIN.x + TOILET_PORCELAIN.width) / W - inset;
  const stallU0 = (TOILET_CISTERN.x + 32) / W + inset;
  const stallU1 = (TOILET_CISTERN.x + TOILET_CISTERN.width) / W - inset;
  const chromeU0 = TOILET_SEAT.x / W + inset;
  const chromeU1 = (TOILET_SEAT.x + 31) / W - inset;
  const waterU0 = TOILET_WATER.x / W + inset;
  const waterU1 = (TOILET_WATER.x + TOILET_WATER.width) / W - inset;
  const waterUC = (waterU0 + waterU1) * 0.5;
  const waterUSpan = (waterU1 - waterU0) * 0.44;
  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  // 0. Standing Restroom Cubicle Partition Walls, Pilasters & Headrail around the wrecked bowl
  buildToiletStall(vertices, normals, uvs, porcU0, porcU1, stallU0, stallU1, chromeU0, chromeU1);

  // 1. Surviving lower porcelain pedestal foot & lower bowl stump (y = 0 .. 11.2)
  pushOvalDisc(vertices, normals, uvs, argV3a.setScalar(0, 0, 2.0), argV2a.setScalar(5.2, 7.2), argV2b.setScalar((porcU0 + porcU1) * 0.5, 0.85), argV2c.setScalar((porcU1 - porcU0) * 0.35, 0.1), 12);
  pushOvalFrustum(vertices, normals, uvs, argV3a.setScalar(0, 0, 2.0), argV3b.setScalar(0, 2.0, 2.0), argV2a.setScalar(5.2, 7.2), argV2b.setScalar(4.6, 6.6), uvBox(porcU0, 0.78, porcU1, 0.98), 12);
  pushOvalFrustum(vertices, normals, uvs, argV3a.setScalar(0, 2.0, 2.0), argV3b.setScalar(0, 8.2, 2.4), argV2a.setScalar(4.6, 6.6), argV2b.setScalar(4.9, 7.2), uvBox(porcU0, 0.42, porcU1, 0.78), 12);
  pushOvalFrustum(vertices, normals, uvs, argV3a.setScalar(0, 8.2, 2.4), argV3b.setScalar(0, 11.2, 2.8), argV2a.setScalar(4.9, 7.2), argV2b.setScalar(6.1, 7.9), uvBox(porcU0, 0.24, porcU1, 0.42), 12);
  pushOvalDisc(vertices, normals, uvs, argV3a.setScalar(0, 10.6, 2.8), argV2a.setScalar(5.6, 7.3), argV2b.setScalar(waterUC, 0.5), argV2c.setScalar(waterUSpan, 0.42), 12);

  // Jagged fractured porcelain teeth around the shattered bowl rim (y = 11.2 .. 14.8)
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * Trigo.twopi;
    const a1 = ((i + 1) / 10) * Trigo.twopi;
    const aM = (a0 + a1) * 0.5;
    const tooth = [2.8, 0.9, 3.4, 0.4, 2.5, 3.2, 0.6, 2.9, 1.4, 3.6][i];
    if (tooth < 0.7)
      continue;
    const b0 = new Vec3(Math.cos(a0) * 6.1, 11.2, 2.8 + Math.sin(a0) * 7.9);
    const b1 = new Vec3(Math.cos(a1) * 6.1, 11.2, 2.8 + Math.sin(a1) * 7.9);
    const tip = new Vec3(Math.cos(aM) * 6.4, 11.2 + tooth, 2.8 + Math.sin(aM) * 8.2);
    const uA = Utils.lerp(porcU0, porcU1, i / 10);
    const uB = Utils.lerp(porcU0, porcU1, (i + 1) / 10);
    const uv0 = new Vec2(uA, 0.35);
    const uv1 = new Vec2(uB, 0.35);
    const uvTip = new Vec2((uA + uB) * 0.5, 0.12);
    pushTri(vertices, normals, uvs, b1, b0, tip, uv1, uv0, uvTip);
    pushTri(vertices, normals, uvs, b0, b1, tip, uv0, uv1, uvTip);
  }

  // 2. Fractured rear trapway block & snapped water supply stub
  pushBoxPart(vertices, normals, uvs, new Vec3(-5.0, 0, -8.8), new Vec3(5.0, 12.4, 0.2), {
    front: uvRect(porcU0, 0.28, porcU1, 0.96),
    back: uvRect(porcU0, 0.28, porcU1, 0.96),
    left: uvRect(porcU0, 0.28, porcU1, 0.96),
    right: uvRect(porcU0, 0.28, porcU1, 0.96),
    top: uvRect(waterU0, 0.2, waterU1, 0.8),
    bottom: uvRect(porcU0, 0.85, porcU1, 0.98),
  });
  pushBoxPart(vertices, normals, uvs, new Vec3(-5.8, 5.2, -9.8), new Vec3(-4.8, 11.8, -8.0), {
    front: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    back: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    left: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    right: uvRect(chromeU0, 0.68, chromeU1, 0.96),
    top: uvRect(chromeU0, 0.68, chromeU1, 0.96),
  });

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
}

/**
 * Builds the 3D spilled toilet water puddle mesh (`y = 0.12`) around a destroyed Facility Toilet Bowl.
 */
export function toiletPuddleMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];

  const W = TOILET_ATLAS.width;
  const waterU0 = TOILET_WATER.x / W + 0.004;
  const waterU1 = (TOILET_WATER.x + TOILET_WATER.width) / W - 0.004;
  const waterUC = (waterU0 + waterU1) * 0.5;
  const waterUSpan = (waterU1 - waterU0) * 0.36;

  const radii = [15.0, 18.2, 21.6, 23.0, 20.4, 16.8, 13.4, 11.8, 13.2, 16.6, 19.8, 17.4];
  const segs = radii.length;
  const center = new Vec3(0.4, 0.12, 4.2);
  const uvCenter = new Vec2(waterUC, 0.5);
  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % segs;
    const a0 = (i / segs) * Trigo.twopi;
    const a1 = (next / segs) * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const p0 = new Vec3(center.x + c0 * radii[i], 0.12, center.z + s0 * radii[i]);
    const p1 = new Vec3(center.x + c1 * radii[next], 0.12, center.z + s1 * radii[next]);
    const uv0 = new Vec2(waterUC + c0 * waterUSpan, 0.5 + s0 * 0.32);
    const uv1 = new Vec2(waterUC + c1 * waterUSpan, 0.5 + s1 * 0.32);
    pushTri(vertices, normals, uvs, center, p1, p0, uvCenter, uv1, uv0);
  }

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
}

export const toiletDebrisMesh = toiletPuddleMesh;

/**
 * Builds the 3D shrapnel pieces blasted off a destroyed Facility Toilet Bowl:
 * - `carboyTop`: blown-off porcelain cistern lid & upper tank rim.
 * - `shards`: `TOILET_SHARD_COUNT` (`5`) flying fragments (2 curved white porcelain bowl shards, 1 broken toilet seat half,
 *   1 torn hinged cover lid, and 1 fractured cistern front panel with chrome flush handle).
 */
export function toiletShrapnelParts() {
  const W = TOILET_ATLAS.width;
  const inset = 0.35 / W;
  const porcU0 = TOILET_PORCELAIN.x / W + inset;
  const porcU1 = (TOILET_PORCELAIN.x + TOILET_PORCELAIN.width) / W - inset;
  const cistU0 = TOILET_CISTERN.x / W + inset;
  const cistU1 = (TOILET_CISTERN.x + 31) / W - inset;
  const seatU0 = TOILET_SEAT.x / W + inset;
  const seatU1 = (TOILET_SEAT.x + TOILET_SEAT.width) / W - inset;
  const uvRect = (u0, v0, u1, v1) => ({ u0, v0, u1, v1 });

  // 1. Blown-off porcelain cistern tank lid & upper tank rim (centered at local origin)
  const topVerts = [];
  const topNorms = [];
  const topUvs = [];
  pushBoxPart(topVerts, topNorms, topUvs, new Vec3(-7.6, -1.2, -3.4), new Vec3(7.6, 1.2, 3.4), {
    front: uvRect(cistU0, 0.03, cistU1, 0.22),
    back: uvRect(cistU0, 0.03, cistU1, 0.22),
    left: uvRect(cistU0, 0.03, cistU1, 0.22),
    right: uvRect(cistU0, 0.03, cistU1, 0.22),
    top: uvRect(cistU0, 0.03, cistU1, 0.2),
    bottom: uvRect(porcU0, 0.72, porcU1, 0.88),
  });

  const shards = [];

  // Shards 0 & 1: Two curved glazed porcelain bowl rim fragments
  const arcSpan = (Trigo.twopi / 3) * 0.55;
  for (let s = 0; s < 2; s++) {
    const sVerts = [];
    const sNorms = [];
    const sUvs = [];
    const subSegs = 3;
    const R = 6.6;
    const halfH = 3.2 + s * 0.6;
    for (let j = 0; j < subSegs; j++) {
      const a0 = (j / subSegs - 0.5) * arcSpan;
      const a1 = ((j + 1) / subSegs - 0.5) * arcSpan;
      const x0 = Math.sin(a0) * R;
      const z0 = (Math.cos(a0) - 0.9) * R;
      const x1 = Math.sin(a1) * R;
      const z1 = (Math.cos(a1) - 0.9) * R;
      const b0 = new Vec3(x0, -halfH * (0.75 + ((s + j) % 2) * 0.25), z0);
      const b1 = new Vec3(x1, -halfH * (0.75 + ((s + j + 1) % 2) * 0.25), z1);
      const t0 = new Vec3(x0 * 1.04, halfH, z0 + 0.3);
      const t1 = new Vec3(x1 * 1.04, halfH, z1 + 0.3);
      const u0 = Utils.lerp(porcU0, porcU1, (j / subSegs) * 0.45 + s * 0.45);
      const u1 = Utils.lerp(porcU0, porcU1, ((j + 1) / subSegs) * 0.45 + s * 0.45);
      pushQuad(sVerts, sNorms, sUvs, b0, b1, t1, t0, uvBox(u0, 0.05, u1, 0.55));
      pushQuad(sVerts, sNorms, sUvs, b1, b0, t0, t1, uvBox(u0, 0.05, u1, 0.55));
    }
    shards.push({ vertices: new Float32Array(sVerts), normals: new Float32Array(sNorms), uvs: new Float32Array(sUvs) });
  }

  // Shard 2: Broken half of the contoured toilet seat ring
  const seatVerts = [];
  const seatNorms = [];
  const seatUvs = [];
  pushBoxPart(seatVerts, seatNorms, seatUvs, new Vec3(-2.4, -0.6, -5.2), new Vec3(2.4, 0.6, 5.2), {
    front: uvRect(seatU0, 0.06, seatU1, 0.58),
    back: uvRect(seatU0, 0.06, seatU1, 0.58),
    left: uvRect(seatU0, 0.06, seatU1, 0.58),
    right: uvRect(seatU0, 0.06, seatU1, 0.58),
    top: uvRect(seatU0, 0.06, seatU1, 0.58),
    bottom: uvRect(seatU0, 0.06, seatU1, 0.58),
  });
  shards.push({ vertices: new Float32Array(seatVerts), normals: new Float32Array(seatNorms), uvs: new Float32Array(seatUvs) });

  // Shard 3: Torn-off hinged toilet cover lid
  const lidVerts = [];
  const lidNorms = [];
  const lidUvs = [];
  pushBoxPart(lidVerts, lidNorms, lidUvs, new Vec3(-5.2, -5.0, -0.55), new Vec3(5.2, 5.0, 0.55), {
    front: uvRect(seatU0, 0.04, seatU1, 0.62),
    back: uvRect(seatU0, 0.04, seatU1, 0.62),
    left: uvRect(seatU0, 0.04, seatU1, 0.62),
    right: uvRect(seatU0, 0.04, seatU1, 0.62),
    top: uvRect(seatU0, 0.04, seatU1, 0.22),
    bottom: uvRect(seatU0, 0.04, seatU1, 0.22),
  });
  shards.push({ vertices: new Float32Array(lidVerts), normals: new Float32Array(lidNorms), uvs: new Float32Array(lidUvs) });

  // Shard 4: Shattered cistern front plate with chrome flush lever
  const tankVerts = [];
  const tankNorms = [];
  const tankUvs = [];
  pushBoxPart(tankVerts, tankNorms, tankUvs, new Vec3(-4.8, -3.6, -0.8), new Vec3(4.8, 3.6, 0.8), {
    front: uvRect(cistU0, 0.22, cistU1, 0.72),
    back: uvRect(porcU0, 0.22, porcU1, 0.72),
    left: uvRect(porcU0, 0.22, porcU1, 0.72),
    right: uvRect(porcU0, 0.22, porcU1, 0.72),
    top: uvRect(porcU0, 0.22, porcU1, 0.72),
    bottom: uvRect(porcU0, 0.22, porcU1, 0.72),
  });
  shards.push({ vertices: new Float32Array(tankVerts), normals: new Float32Array(tankNorms), uvs: new Float32Array(tankUvs) });

  for (const shard of shards)
    flipV(shard);

  return {
    carboyTop: flipV({
      vertices: new Float32Array(topVerts),
      normals: new Float32Array(topNorms),
      uvs: new Float32Array(topUvs),
    }),
    shards,
  };
}

/** Pre-allocates a reusable pose structure for `toiletBreakPose`. */
export function createToiletBreakPose() {
  return createDispenserBreakPose();
}

/**
 * Computes the 3D transforms for a destroyed Facility Toilet Bowl's pedestal wreck, spreading water puddle,
 * tumbling porcelain cistern lid, and 5 flying shards at `elapsed` seconds after destruction, writing into `target`
 * with zero allocations.
 */
export function toiletBreakPose(elapsed, seed = 0, target = createToiletBreakPose()) {
  return dispenserBreakPose(elapsed, seed + 4.3, target);
}

const SHIP_HULL_BASE = [46, 56, 72];
const SHIP_HULL_LIGHT = [76, 90, 112];
const SHIP_HULL_DARK = [22, 28, 38];
const SHIP_SEAM_DARK = [12, 16, 24];
const SHIP_BELLY_DARK = [18, 22, 30];
const SHIP_HAZARD_GOLD = [188, 138, 38];
const SHIP_HAZARD_HIGHLIGHT = [224, 178, 72];
const SHIP_HAZARD_DARK = [24, 28, 36];
const SHIP_ACCENT_TEAL = [44, 156, 198];
const SHIP_STENCIL_WHITE = [196, 212, 228];
const SHIP_GLASS_DEEP = [14, 42, 74];
const SHIP_GLASS_MID = [28, 92, 146];
const SHIP_GLASS_GLINT = [118, 214, 252];
const SHIP_HUD_GREEN = [48, 224, 168];
const SHIP_RADOME_DARK = [16, 20, 28];
const SHIP_PLASMA_CORE = [220, 250, 255];
const SHIP_PLASMA_CYAN = [64, 208, 255];
const SHIP_PLASMA_RIM = [24, 98, 168];
const SHIP_NOZZLE_METAL = [34, 40, 52];
const SHIP_NOZZLE_HEAT = [68, 54, 44];
const SHIP_STROBE_RED = [238, 48, 42];
const SHIP_STROBE_GREEN = [42, 232, 96];

function drawSpaceshipHullCell(rnd) {
  const w = SPACESHIP_HULL.width;
  const h = SPACESHIP_HULL.height;
  const t = new Tile(w, h);
  plate(t, 0, 0, w, h, rnd, SHIP_HULL_BASE);

  // Upper armored hull plates (y = 0..66) with panel seams, access hatches & rivets
  for (let y = 2; y < 66; y++) {
    const sheen = Math.sin((y / 66) * Math.PI) * 0.16;
    for (let x = 2; x < w - 2; x++) {
      if (sheen > 0)
        t.set(x, y, SHIP_HULL_LIGHT, sheen);
    }
  }
  for (const sy of [22, 44, 66]) {
    t.rect(2, sy, w - 4, 1, SHIP_SEAM_DARK, 0.88);
    t.rect(2, sy + 1, w - 4, 1, SHIP_HULL_LIGHT, 0.42);
    t.groove(2, sy, w - 3, sy, 1.4, 0.9);
  }
  for (const sx of [32, 64, 96]) {
    t.rect(sx, 2, 1, 64, SHIP_SEAM_DARK, 0.82);
    t.rect(sx + 1, 2, 1, 64, SHIP_HULL_LIGHT, 0.36);
    t.groove(sx, 2, sx, 65, 1.3, 0.8);
  }
  // Recessed maintenance inspection hatches & rivets
  t.rect(8, 6, 20, 12, SHIP_HULL_DARK, 0.55);
  t.relief(8, 6, 20, 12, -1.1, 0.8);
  t.rect(68, 26, 24, 14, SHIP_HULL_DARK, 0.55);
  t.relief(68, 26, 24, 14, -1.1, 0.8);
  for (const rx of [6, 28, 36, 60, 68, 92, 100, 122]) {
    for (const ry of [5, 19, 26, 41, 48, 63])
      rivet(t, rx, ry);
  }

  // Framed dark-steel structural armor trim & weathered ochre-gold tactical caution band (y = 68..91)
  t.rect(2, 68, w - 4, 24, SHIP_HAZARD_DARK, 0.88);
  t.rect(2, 68, w - 4, 2, SHIP_SEAM_DARK, 0.94);
  t.rect(2, 70, w - 4, 1, SHIP_HULL_LIGHT, 0.45);
  t.rect(2, 89, w - 4, 1, SHIP_HULL_LIGHT, 0.35);
  t.rect(2, 90, w - 4, 2, SHIP_SEAM_DARK, 0.94);
  for (let y = 73; y <= 86; y++) {
    const vNorm = (y - 73) / 13;
    const crown = Math.sin(vNorm * Math.PI);
    const bandCol = mix(SHIP_HAZARD_GOLD, SHIP_HAZARD_HIGHLIGHT, crown * 0.55);
    for (let x = 4; x < w - 4; x++) {
      const inBlock = (x % 16) >= 3 && (x % 16) <= 13;
      const isCenterGroove = y === 79 || y === 80;
      if (inBlock && !isCenterGroove)
        t.set(x, y, bandCol, 0.78);
      else
        t.set(x, y, SHIP_HAZARD_DARK, 0.86);
    }
  }
  for (let rx = 18; rx < w - 10; rx += 16) {
    rivet(t, rx, 71);
    rivet(t, rx, 88);
  }
  t.relief(3, 72, w - 6, 16, 0.7, 0.8);

  // Lower-left: Squadron teal-cyan stripe & UAC block stencil markings (x = 2..63, y = 94..125)
  t.rect(2, 94, 62, 32, SHIP_HULL_DARK, 0.9);
  t.rect(4, 98, 58, 8, SHIP_ACCENT_TEAL, 0.88);
  t.rect(4, 98, 58, 1, SHIP_GLASS_GLINT, 0.65);
  for (const bx of [8, 18, 28, 42, 52]) {
    t.rect(bx, 110, 7, 11, SHIP_STENCIL_WHITE, 0.86);
    t.rect(bx + 2, 113, 3, 5, SHIP_HULL_DARK, 0.9);
  }

  // Lower-right: Dark thermal-ablative ventral belly tiles (x = 64..125, y = 94..125)
  t.rect(64, 94, 62, 32, SHIP_BELLY_DARK, 0.95);
  for (let ty = 96; ty < 124; ty += 8) {
    t.rect(65, ty, 60, 1, SHIP_SEAM_DARK, 0.85);
    t.groove(65, ty, 124, ty, 1.2, 0.7);
    for (let tx = 66; tx < 124; tx += 12)
      t.rect(tx, ty, 1, 8, SHIP_SEAM_DARK, 0.8);
  }
  rust(t, rnd, 0.14);
  return t;
}

function drawSpaceshipCockpitCell(rnd) {
  const w = SPACESHIP_COCKPIT.width;
  const h = SPACESHIP_COCKPIT.height;
  const t = new Tile(w, h);
  plate(t, 0, 0, w, h, rnd, SHIP_HULL_DARK);

  // Upper region (y = 2..72): Polarized sapphire-cyan armored ballistic canopy glass
  t.rect(3, 3, w - 6, 70, SHIP_GLASS_DEEP, 0.96);
  for (let y = 5; y < 71; y++) {
    const vNorm = (y - 5) / 66;
    for (let x = 5; x < w - 5; x++) {
      const uNorm = (x - 5) / (w - 10);
      const grad = Utils.clamp(1 - vNorm * 0.7 + Math.sin(uNorm * Math.PI) * 0.25, 0, 1);
      t.set(x, y, SHIP_GLASS_MID, grad * 0.72);
      const diag = (x * 0.75 + y * 1.1) % 44;
      if (diag < 5.5)
        t.set(x, y, SHIP_GLASS_GLINT, (1 - diag / 5.5) * 0.78);
    }
  }
  // Glowing holographic tactical HUD projection inside lower canopy (y = 46..62)
  t.rect(22, 46, 36, 16, SHIP_HUD_GREEN, 0.38);
  t.rect(26, 54, 28, 1, SHIP_HUD_GREEN, 0.85);
  t.rect(40, 48, 1, 12, SHIP_HUD_GREEN, 0.85);
  t.rect(70, 46, 36, 16, SHIP_HUD_GREEN, 0.38);
  t.rect(74, 54, 28, 1, SHIP_HUD_GREEN, 0.85);
  // Heavy titanium canopy frame mullions & rivets
  t.rect(2, 2, w - 4, 4, SHIP_HULL_BASE, 0.96);
  t.rect(2, 70, w - 4, 4, SHIP_HULL_BASE, 0.96);
  t.relief(5, 6, 56, 63, -1.4, 1.1);
  t.relief(67, 6, 54, 63, -1.4, 1.1);
  for (const mx of [2, 62, 122]) {
    t.rect(mx, 2, 4, 72, SHIP_HULL_BASE, 0.96);
    for (let ry = 8; ry < 70; ry += 12)
      rivet(t, mx + 2, ry);
  }

  // Lower-left (x = 2..63, y = 76..125): Carbon-composite nose radome & phased-array radar rings
  t.rect(2, 76, 62, 50, SHIP_RADOME_DARK, 0.96);
  for (let y = 78; y < 124; y++) {
    for (let x = 4; x < 62; x++) {
      const dist = Math.hypot(x - 33, y - 101);
      const ring = Math.sin(dist * 0.52);
      if (ring > 0.65)
        t.set(x, y, SHIP_HULL_BASE, 0.38);
    }
  }
  t.rect(8, 101, 50, 1, SHIP_ACCENT_TEAL, 0.45);
  t.rect(33, 80, 1, 42, SHIP_ACCENT_TEAL, 0.45);

  // Lower-right (x = 66..125, y = 76..125): FLIR optical sensor aperture & avionics bay
  t.rect(66, 76, 60, 50, SHIP_HULL_DARK, 0.94);
  for (let y = 80; y < 122; y++) {
    for (let x = 70; x < 122; x++) {
      const d = Math.hypot(x - 96, y - 101);
      if (d < 16)
        t.set(x, y, d < 7 ? SHIP_GLASS_GLINT : d < 12 ? SHIP_ACCENT_TEAL : SHIP_GLASS_DEEP, 1);
    }
  }
  t.relief(80, 85, 32, 32, 1.2, 1.2);
  return t;
}

function drawSpaceshipEngineCell(rnd) {
  const w = SPACESHIP_ENGINE.width;
  const h = SPACESHIP_ENGINE.height;
  const t = new Tile(w, h);
  plate(t, 0, 0, w, h, rnd, SHIP_NOZZLE_METAL);

  // Upper-left (x = 2..62, y = 2..64): Radial jet turbine compressor intake blades
  for (let y = 4; y < 62; y++) {
    for (let x = 4; x < 62; x++) {
      const dx = x - 33;
      const dy = y - 33;
      const r = Math.hypot(dx, dy);
      if (r < 27) {
        const angle = Math.atan2(dy, dx);
        const blade = Math.sin(angle * 12 + r * 0.18);
        const col = r < 7 ? SHIP_HULL_LIGHT : blade > 0 ? SHIP_HULL_BASE : SHIP_SEAM_DARK;
        t.set(x, y, col, 1);
      }
    }
  }
  t.relief(6, 6, 54, 54, -1.8, 1.5);

  // Upper-right (x = 66..125, y = 2..64): Powered-down cold reactor exhaust core (inactive hangar state)
  t.rect(66, 4, 58, 58, SHIP_SEAM_DARK, 0.98);
  for (let y = 6; y < 62; y++) {
    for (let x = 68; x < 124; x++) {
      const dx = x - 96;
      const dy = y - 34;
      const r = Math.hypot(dx, dy) / 28;
      if (r <= 1) {
        const angle = Math.atan2(dy, dx);
        const vane = Math.cos(angle * 16);
        const ring = Math.cos(r * Math.PI * 3.5) * 0.5 + 0.5;
        const baseCol = r < 0.34
          ? SHIP_NOZZLE_METAL
          : r < 0.52
            ? SHIP_SEAM_DARK
            : r < 0.84
              ? (vane > 0.35 ? SHIP_HULL_BASE : SHIP_HULL_DARK)
              : SHIP_NOZZLE_METAL;
        t.set(x, y, mix(baseCol, SHIP_HULL_LIGHT, ring * 0.16), 1);
      } else {
        t.set(x, y, SHIP_SEAM_DARK, 1);
      }
    }
  }
  t.relief(68, 6, 56, 56, -1.6, 1.4);

  // Lower-left (x = 2..62, y = 66..125): Glowing cyan-white fusion afterburner plasma core (active state)
  t.rect(2, 66, 60, 58, SHIP_PLASMA_RIM, 0.98);
  for (let y = 68; y < 124; y++) {
    for (let x = 4; x < 60; x++) {
      const r = Math.hypot(x - 32, y - 96) / 28;
      if (r <= 1) {
        const ring = Math.cos(r * Math.PI * 3.5) * 0.5 + 0.5;
        const coreCol = r < 0.38 ? SHIP_PLASMA_CORE : r < 0.72 ? mix(SHIP_PLASMA_CORE, SHIP_PLASMA_CYAN, (r - 0.38) / 0.34) : mix(SHIP_PLASMA_CYAN, SHIP_PLASMA_RIM, (r - 0.72) / 0.28);
        t.set(x, y, mix(coreCol, SHIP_PLASMA_CORE, ring * 0.28), 1);
      } else
        t.set(x, y, SHIP_SEAM_DARK, 1);
    }
  }

  // Lower-right upper half (x = 66..125, y = 66..94): Slotted reactor heat-exchanger louvers & piping
  t.rect(66, 66, 58, 28, SHIP_HULL_DARK, 0.92);
  for (let ly = 69; ly < 92; ly += 5) {
    t.rect(70, ly, 50, 2, SHIP_SEAM_DARK, 0.95);
    t.rect(70, ly + 2, 50, 1, SHIP_HULL_LIGHT, 0.45);
    t.groove(70, ly + 1, 119, ly + 1, 1.5, 0.9);
  }
  t.rect(95, 67, 2, 26, SHIP_NOZZLE_HEAT, 0.7);

  // Lower-right lower half (x = 66..125, y = 96..125): Rib-reinforced heat-blued thruster nozzle petals & chrome struts
  t.rect(66, 96, 58, 28, SHIP_NOZZLE_METAL, 0.95);
  for (let y = 97; y < 124; y++) {
    const heat = Utils.clamp((y - 97) / 27, 0, 1);
    for (let x = 68; x < 124; x++) {
      t.set(x, y, SHIP_NOZZLE_HEAT, heat * 0.42);
      if ((x - 68) % 7 === 0)
        t.set(x, y, SHIP_SEAM_DARK, 1);
      else if ((x - 68) % 7 === 1)
        t.set(x, y, SHIP_HULL_LIGHT, 0.48);
    }
  }
  return t;
}

function drawSpaceshipWingCell(rnd) {
  const w = SPACESHIP_WING.width;
  const h = SPACESHIP_WING.height;
  const t = new Tile(w, h);
  plate(t, 0, 0, w, h, rnd, SHIP_HULL_BASE);

  // Upper region (y = 2..68): Swept wing composite armor skin, flap hinge lines & vortex generators
  t.rect(2, 24, w - 4, 1, SHIP_SEAM_DARK, 0.88);
  t.rect(2, 25, w - 4, 1, SHIP_HULL_LIGHT, 0.45);
  t.rect(2, 52, w - 4, 1, SHIP_SEAM_DARK, 0.88);
  t.groove(2, 24, w - 3, 24, 1.3, 0.8);
  t.groove(2, 52, w - 3, 52, 1.3, 0.8);
  for (let x = 8; x < w - 8; x += 16) {
    t.rect(x, 4, 1, 62, SHIP_SEAM_DARK, 0.75);
    t.rect(x + 4, 54, 8, 10, SHIP_HULL_DARK, 0.7);
    rivet(t, x + 3, 8);
    rivet(t, x + 3, 48);
  }
  t.rect(6, 30, w - 12, 8, SHIP_ACCENT_TEAL, 0.82);
  t.rect(6, 30, w - 12, 1, SHIP_STENCIL_WHITE, 0.65);

  // Lower-left (x = 2..64, y = 72..125): Multi-tube AGM rocket launcher face & rotary cannon barrels
  t.rect(2, 72, 62, 52, SHIP_SEAM_DARK, 0.96);
  for (const cy of [86, 110]) {
    for (const cx of [14, 33, 52]) {
      for (let y = cy - 8; y <= cy + 8; y++) {
        for (let x = cx - 8; x <= cx + 8; x++) {
          const r = Math.hypot(x - cx, y - cy);
          if (r < 7.5)
            t.set(x, y, r < 3.5 ? SHIP_HAZARD_GOLD : r < 5.5 ? SHIP_SEAM_DARK : SHIP_HULL_LIGHT, 1);
        }
      }
    }
  }

  // Lower-right (x = 68..125, y = 72..125): Port red & starboard green wingtip navigation strobes
  t.rect(68, 72, 56, 25, SHIP_STROBE_RED, 0.96);
  t.rect(74, 77, 44, 15, [255, 190, 180], 0.85);
  t.rect(68, 99, 56, 25, SHIP_STROBE_GREEN, 0.96);
  t.rect(74, 104, 44, 15, [190, 255, 210], 0.85);
  return t;
}

/**
 * Generates the 512 x 128 RGBA texture atlas (with height relief) for the massive UAC Heavy Assault Dropship:
 * - Cell 0 (`SPACESHIP_HULL`, `x = 0..127`): Naval-gunmetal armored fuselage plating, amber/black chevron hazard stripes,
 *   squadron teal accents, block stencils, and scorched ventral thermal tiles.
 * - Cell 1 (`SPACESHIP_COCKPIT`, `x = 128..255`): Polarized sapphire-cyan multi-pane ballistic canopy glass with specular glints,
 *   holographic green HUD glow, carbon nose radome, and FLIR optical sensor aperture.
 * - Cell 2 (`SPACESHIP_ENGINE`, `x = 256..383`): Radial turbine intake blades, reactor cooling louvers, glowing cyan-white
 *   fusion afterburner plasma core, and heat-blued thruster nozzle petals.
 * - Cell 3 (`SPACESHIP_WING`, `x = 384..511`): Swept delta-wing composite armor skin, multi-tube AGM missile pod face,
 *   and high-intensity port-red / starboard-green wingtip navigation strobes.
 */
export function spaceshipAtlas() {
  const { width, height } = SPACESHIP_ATLAS;
  const data = new Uint8Array(width * height * 4);
  const relief = new Float32Array(width * height);
  const blit = (tile, x0) => blitTile(data, relief, width, tile, x0);
  blit(drawSpaceshipHullCell(mulberry32(8801)), SPACESHIP_HULL.x);
  blit(drawSpaceshipCockpitCell(mulberry32(8802)), SPACESHIP_COCKPIT.x);
  blit(drawSpaceshipEngineCell(mulberry32(8803)), SPACESHIP_ENGINE.x);
  blit(drawSpaceshipWingCell(mulberry32(8804)), SPACESHIP_WING.x);
  return {
    name: 'spaceship',
    data,
    relief,
    width,
    height,
    cell: SPACESHIP_CELL,
    frames: SPACESHIP_FRAMES,
    hull: SPACESHIP_HULL,
    cockpit: SPACESHIP_COCKPIT,
    engine: SPACESHIP_ENGINE,
    wing: SPACESHIP_WING,
  };
}

function shipCellUv(cell, uSpan, vSpan) {
  const W = SPACESHIP_ATLAS.width;
  return {
    u0: (cell.x + uSpan.x * cell.width) / W,
    v0: vSpan.x,
    u1: (cell.x + uSpan.y * cell.width) / W,
    v1: vSpan.y,
  };
}

function pushShipQuad(vertices, normals, uvs, c0, c1, c2, c3, uv) {
  pushQuad(vertices, normals, uvs, c0, c1, c2, c3, uvBox(uv.u0, uv.v0, uv.u1, uv.v1));
}

function pushShipBox(vertices, normals, uvs, minPt, maxPt, uv, topUv = uv, bottomUv = uv) {
  pushBoxPart(vertices, normals, uvs, minPt, maxPt, {
    front: uv,
    back: uv,
    left: uv,
    right: uv,
    top: topUv,
    bottom: bottomUv,
  });
}

function pushShipFrustum(vertices, normals, uvs, ySpan, bottomHalfXZ, topHalfXZ, centerXZ, faceUvs) {
  const y0 = ySpan.x;
  const y1 = ySpan.y;
  const bx = bottomHalfXZ.x;
  const bz = bottomHalfXZ.y;
  const tx = topHalfXZ.x;
  const tz = topHalfXZ.y;
  const cx = centerXZ.x;
  const cz = centerXZ.z;

  const b00 = new Vec3(cx - bx, y0, cz - bz);
  const b10 = new Vec3(cx + bx, y0, cz - bz);
  const b11 = new Vec3(cx + bx, y0, cz + bz);
  const b01 = new Vec3(cx - bx, y0, cz + bz);
  const t00 = new Vec3(cx - tx, y1, cz - tz);
  const t10 = new Vec3(cx + tx, y1, cz - tz);
  const t11 = new Vec3(cx + tx, y1, cz + tz);
  const t01 = new Vec3(cx - tx, y1, cz + tz);

  pushShipQuad(vertices, normals, uvs, b01, b11, t11, t01, faceUvs.side);
  pushShipQuad(vertices, normals, uvs, b10, b00, t00, t10, faceUvs.side);
  pushShipQuad(vertices, normals, uvs, b11, b10, t10, t11, faceUvs.side);
  pushShipQuad(vertices, normals, uvs, b00, b01, t01, t00, faceUvs.side);
  if (faceUvs.top)
    pushShipQuad(vertices, normals, uvs, t01, t11, t10, t00, faceUvs.top);
  if (faceUvs.bottom)
    pushShipQuad(vertices, normals, uvs, b00, b10, b11, b01, faceUvs.bottom);
}

/**
 * Pushes a sculpted fuselage section connecting two 16-point chined aerospace cross-sections at `z0` (aft) and `z1` (forward).
 */
function pushSpaceshipFuselageSection(vertices, normals, uvs, zSpan, aftProfile, fwdProfile, faceUvMap) {
  const z0 = zSpan.x;
  const z1 = zSpan.y;
  const cy0 = aftProfile.x;
  const hw0 = aftProfile.y;
  const hh0 = aftProfile.z;
  const cy1 = fwdProfile.x;
  const hw1 = fwdProfile.y;
  const hh1 = fwdProfile.z;

  const ring = (cy, hw, hh, z) => [
    new Vec3(-hw * 0.24, cy + hh, z),
    new Vec3(hw * 0.24, cy + hh, z),
    new Vec3(hw * 0.56, cy + hh * 0.94, z),
    new Vec3(hw * 0.82, cy + hh * 0.72, z),
    new Vec3(hw * 0.96, cy + hh * 0.38, z),
    new Vec3(hw, cy + hh * 0.04, z),
    new Vec3(hw * 0.97, cy - hh * 0.34, z),
    new Vec3(hw * 0.84, cy - hh * 0.68, z),
    new Vec3(hw * 0.60, cy - hh * 0.92, z),
    new Vec3(hw * 0.26, cy - hh, z),
    new Vec3(-hw * 0.26, cy - hh, z),
    new Vec3(-hw * 0.60, cy - hh * 0.92, z),
    new Vec3(-hw * 0.84, cy - hh * 0.68, z),
    new Vec3(-hw * 0.97, cy - hh * 0.34, z),
    new Vec3(-hw, cy + hh * 0.04, z),
    new Vec3(-hw * 0.96, cy + hh * 0.38, z),
    new Vec3(-hw * 0.82, cy + hh * 0.72, z),
    new Vec3(-hw * 0.56, cy + hh * 0.94, z),
  ];

  const r0 = ring(cy0, hw0, hh0, z0);
  const r1 = ring(cy1, hw1, hh1, z1);
  const faceUvs = [
    faceUvMap.top,
    faceUvMap.top,
    faceUvMap.upperSide,
    faceUvMap.upperSide,
    faceUvMap.side,
    faceUvMap.side,
    faceUvMap.lowerSide,
    faceUvMap.lowerSide,
    faceUvMap.belly,
    faceUvMap.belly,
    faceUvMap.belly,
    faceUvMap.lowerSide,
    faceUvMap.lowerSide,
    faceUvMap.side,
    faceUvMap.side,
    faceUvMap.upperSide,
    faceUvMap.upperSide,
    faceUvMap.top,
  ];
  const n = r0.length;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    pushShipQuad(vertices, normals, uvs, r0[i], r0[next], r1[next], r1[i], faceUvs[i]);
  }
}

/**
 * Pushes a sculpted 12-point aerodynamic nacelle section connecting `z0` (aft) and `z1` (forward) around `centerXY`.
 */
function pushSpaceshipNacelleSection(vertices, normals, uvs, centerXY, zSpan, aftHalfWH, fwdHalfWH, faceUvMap) {
  const cx = centerXY.x;
  const cy = centerXY.y;
  const z0 = zSpan.x;
  const z1 = zSpan.y;
  const ring = (hw, hh, z) => [
    new Vec3(cx - hw * 0.38, cy + hh, z),
    new Vec3(cx + hw * 0.38, cy + hh, z),
    new Vec3(cx + hw * 0.80, cy + hh * 0.76, z),
    new Vec3(cx + hw, cy + hh * 0.28, z),
    new Vec3(cx + hw, cy - hh * 0.28, z),
    new Vec3(cx + hw * 0.80, cy - hh * 0.76, z),
    new Vec3(cx + hw * 0.38, cy - hh, z),
    new Vec3(cx - hw * 0.38, cy - hh, z),
    new Vec3(cx - hw * 0.80, cy - hh * 0.76, z),
    new Vec3(cx - hw, cy - hh * 0.28, z),
    new Vec3(cx - hw, cy + hh * 0.28, z),
    new Vec3(cx - hw * 0.80, cy + hh * 0.76, z),
  ];
  const r0 = ring(aftHalfWH.x, aftHalfWH.y, z0);
  const r1 = ring(fwdHalfWH.x, fwdHalfWH.y, z1);
  const uvsBySeg = [
    faceUvMap.top,
    faceUvMap.upper,
    faceUvMap.side,
    faceUvMap.side,
    faceUvMap.lower,
    faceUvMap.bottom,
    faceUvMap.bottom,
    faceUvMap.lower,
    faceUvMap.side,
    faceUvMap.side,
    faceUvMap.upper,
    faceUvMap.top,
  ];
  for (let i = 0; i < 12; i++) {
    const next = (i + 1) % 12;
    pushShipQuad(vertices, normals, uvs, r0[i], r0[next], r1[next], r1[i], uvsBySeg[i]);
  }
}

/**
 * Pushes a cambered multi-segment supercritical airfoil wing or fin panel connecting an inner root chord to an outer tip chord.
 */
function pushSweptWing(vertices, normals, uvs, rootX, tipX, rootZ, tipZ, rootY, tipY, uvSkin, uvEdge) {
  const isStbd = tipX >= rootX;
  const xIn = isStbd ? rootX : tipX;
  const xOut = isStbd ? tipX : rootX;
  const zRIn = isStbd ? rootZ.x : tipZ.x;
  const zFIn = isStbd ? rootZ.y : tipZ.y;
  const zROut = isStbd ? tipZ.x : rootZ.x;
  const zFOut = isStbd ? tipZ.y : rootZ.y;
  const yBIn = isStbd ? rootY.x : tipY.x;
  const yTIn = isStbd ? rootY.y : tipY.y;
  const yBOut = isStbd ? tipY.x : rootY.x;
  const yTOut = isStbd ? tipY.y : rootY.y;

  // 5 chordwise stations (0.0 = trailing edge, 0.25 = aft spar, 0.62 = max camber crown, 0.88 = leading shoulder, 1.0 = leading edge)
  const chordFracs = [0.0, 0.24, 0.60, 0.88, 1.0];
  const topProfile = [0.58, 0.88, 1.0, 0.82, 0.52];
  const botProfile = [0.42, 0.16, 0.0, 0.18, 0.48];

  const makeAirfoilStations = (x, zRear, zFront, yBot, yTop) => {
    const dz = zFront - zRear;
    const dy = yTop - yBot;
    const topPts = [];
    const botPts = [];
    for (let i = 0; i < chordFracs.length; i++) {
      const z = zRear + dz * chordFracs[i];
      topPts.push(new Vec3(x, yBot + dy * topProfile[i], z));
      botPts.push(new Vec3(x, yBot + dy * botProfile[i], z));
    }
    return { topPts, botPts };
  };

  // Subdivide spanwise into 2 sections for smoother airfoil twist/taper
  const spanFracs = [0.0, 0.52, 1.0];
  const stations = spanFracs.map((t) =>
    makeAirfoilStations(
      xIn + (xOut - xIn) * t,
      zRIn + (zROut - zRIn) * t,
      zFIn + (zFOut - zFIn) * t,
      yBIn + (yBOut - yBIn) * t,
      yTIn + (yTOut - yTIn) * t,
    ),
  );

  for (let s = 0; s < stations.length - 1; s++) {
    const st0 = stations[s];
    const st1 = stations[s + 1];
    for (let c = 0; c < chordFracs.length - 1; c++) {
      const stripUv = c === 0 || c === chordFracs.length - 2 ? uvEdge : uvSkin;
      pushShipQuad(vertices, normals, uvs, st0.topPts[c + 1], st1.topPts[c + 1], st1.topPts[c], st0.topPts[c], stripUv);
      pushShipQuad(vertices, normals, uvs, st0.botPts[c], st1.botPts[c], st1.botPts[c + 1], st0.botPts[c + 1], stripUv);
    }
    // Leading & trailing edge closures
    const last = chordFracs.length - 1;
    pushShipQuad(vertices, normals, uvs, st0.botPts[last], st1.botPts[last], st1.topPts[last], st0.topPts[last], uvEdge);
    pushShipQuad(vertices, normals, uvs, st1.botPts[0], st0.botPts[0], st0.topPts[0], st1.topPts[0], uvEdge);
  }

  // Root & tip rib endcaps
  const rootSt = stations[0];
  const tipSt = stations[stations.length - 1];
  for (let c = 0; c < chordFracs.length - 1; c++) {
    pushShipQuad(vertices, normals, uvs, tipSt.botPts[c + 1], tipSt.botPts[c], tipSt.topPts[c], tipSt.topPts[c + 1], uvEdge);
    pushShipQuad(vertices, normals, uvs, rootSt.botPts[c], rootSt.botPts[c + 1], rootSt.topPts[c + 1], rootSt.topPts[c], uvEdge);
  }
}

/**
 * Pushes a high-resolution horizontal cylinder / thruster bell along the Z axis from `z0` to `z1` (16 radial segments by default).
 */
function pushAxialOctagonalTube(vertices, normals, uvs, centerXY, zSpan, radii, uvSide, uvRearCap, uvFrontCap, sides = 16) {
  const cx = centerXY.x;
  const cy = centerXY.y;
  const z0 = zSpan.x;
  const z1 = zSpan.y;
  const r0 = radii.x;
  const r1 = radii.y;
  const ring0 = [];
  const ring1 = [];
  for (let i = 0; i < sides; i++) {
    const a = ((i + 0.5) / sides) * Trigo.twopi;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    ring0.push(new Vec3(cx + ca * r0, cy + sa * r0, z0));
    ring1.push(new Vec3(cx + ca * r1, cy + sa * r1, z1));
  }
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    pushShipQuad(vertices, normals, uvs, ring0[i], ring1[i], ring1[next], ring0[next], uvSide);
  }
  if (uvRearCap) {
    const c0 = new Vec3(cx, cy, z0);
    const uc = (uvRearCap.u0 + uvRearCap.u1) * 0.5;
    const vc = (uvRearCap.v0 + uvRearCap.v1) * 0.5;
    const ur = (uvRearCap.u1 - uvRearCap.u0) * 0.48;
    const vr = (uvRearCap.v1 - uvRearCap.v0) * 0.48;
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      const a0 = ((i + 0.5) / sides) * Trigo.twopi;
      const a1 = ((next + 0.5) / sides) * Trigo.twopi;
      scratchUvA.setScalar(uc, vc);
      scratchUvB.setScalar(uc + Math.cos(a1) * ur, vc + Math.sin(a1) * vr);
      scratchUvC.setScalar(uc + Math.cos(a0) * ur, vc + Math.sin(a0) * vr);
      pushTri(vertices, normals, uvs, c0, ring0[next], ring0[i], scratchUvA, scratchUvB, scratchUvC);
    }
  }
  if (uvFrontCap) {
    const c1 = new Vec3(cx, cy, z1);
    const uc = (uvFrontCap.u0 + uvFrontCap.u1) * 0.5;
    const vc = (uvFrontCap.v0 + uvFrontCap.v1) * 0.5;
    const ur = (uvFrontCap.u1 - uvFrontCap.u0) * 0.48;
    const vr = (uvFrontCap.v1 - uvFrontCap.v0) * 0.48;
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      const a0 = ((i + 0.5) / sides) * Trigo.twopi;
      const a1 = ((next + 0.5) / sides) * Trigo.twopi;
      scratchUvA.setScalar(uc, vc);
      scratchUvB.setScalar(uc + Math.cos(a0) * ur, vc + Math.sin(a0) * vr);
      scratchUvC.setScalar(uc + Math.cos(a1) * ur, vc + Math.sin(a1) * vr);
      pushTri(vertices, normals, uvs, c1, ring1[i], ring1[next], scratchUvA, scratchUvB, scratchUvC);
    }
  }
}

/**
 * Pushes a cylindrical wheel/tire with hubcaps along the X axle at `center` (`Vec3`), with `radius` (`y/z`) and `halfWidth` (`x`).
 */
function pushLandingWheel(vertices, normals, uvs, center, radiusAndWidth, uvTire, uvHub, sides = 16) {
  const x0 = center.x - radiusAndWidth.y;
  const x1 = center.x + radiusAndWidth.y;
  const cy = center.y;
  const cz = center.z;
  const r = radiusAndWidth.x;
  const ringL = [];
  const ringR = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Trigo.twopi;
    const py = cy + Math.sin(a) * r;
    const pz = cz + Math.cos(a) * r;
    ringL.push(new Vec3(x0, py, pz));
    ringR.push(new Vec3(x1, py, pz));
  }
  const cL = new Vec3(x0, cy, cz);
  const cR = new Vec3(x1, cy, cz);
  const uc = (uvHub.u0 + uvHub.u1) * 0.5;
  const vc = (uvHub.v0 + uvHub.v1) * 0.5;
  const ur = (uvHub.u1 - uvHub.u0) * 0.45;
  const vr = (uvHub.v1 - uvHub.v0) * 0.45;
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    pushShipQuad(vertices, normals, uvs, ringL[i], ringR[i], ringR[next], ringL[next], uvTire);
    const a0 = (i / sides) * Trigo.twopi;
    const a1 = (next / sides) * Trigo.twopi;
    scratchUvA.setScalar(uc, vc);
    scratchUvB.setScalar(uc + Math.cos(a1) * ur, vc + Math.sin(a1) * vr);
    scratchUvC.setScalar(uc + Math.cos(a0) * ur, vc + Math.sin(a0) * vr);
    pushTri(vertices, normals, uvs, cL, ringL[next], ringL[i], scratchUvA, scratchUvB, scratchUvC);
    pushTri(vertices, normals, uvs, cR, ringR[i], ringR[next], scratchUvA, scratchUvC, scratchUvB);
  }
}

/**
 * Pushes a sculpted multi-facet geodesic canopy section between `z0` and `z1`.
 */
function pushCanopySection(vertices, normals, uvs, zSpan, aftArch, fwdArch, uvGlass, uvFrame) {
  const z0 = zSpan.x;
  const z1 = zSpan.y;
  // Each archVec is Vec3(baseY, crownY, halfWidth)
  const buildArch = (arch, z) => {
    const yBase = arch.x;
    const yTop = arch.y;
    const hw = arch.z;
    const h = yTop - yBase;
    return [
      new Vec3(-hw, yBase, z),
      new Vec3(-hw * 0.88, yBase + h * 0.46, z),
      new Vec3(-hw * 0.54, yBase + h * 0.84, z),
      new Vec3(-hw * 0.18, yTop, z),
      new Vec3(hw * 0.18, yTop, z),
      new Vec3(hw * 0.54, yBase + h * 0.84, z),
      new Vec3(hw * 0.88, yBase + h * 0.46, z),
      new Vec3(hw, yBase, z),
    ];
  };
  const a0 = buildArch(aftArch, z0);
  const a1 = buildArch(fwdArch, z1);
  for (let i = 0; i < a0.length - 1; i++) {
    const paneUv = i === 3 ? uvFrame : uvGlass;
    pushShipQuad(vertices, normals, uvs, a0[i], a1[i], a1[i + 1], a0[i + 1], paneUv);
  }
}

/**
 * Builds the high-definition 3D UAC Heavy Assault Dropship (`SC-09 "Valkyrie"`) mesh (`190 x 110 x 320` units, ~3 x 5 tiles):
 * - Spans `x in [-95, +95]`, `y in [0, 110]` (rising well above the 64-unit hangar wall height), and `z in [-160, +160]`.
 * - High-poly 18-point chined stealth fuselage across 16 longitudinal stations (`z = -144..+160`) with multi-stage ogive radome,
 *   aft hydraulic assault boarding ramp, geodesic wrap-around tandem ballistic cockpit canopy (`z = +12..+134`) with pilot &
 *   weapons-officer seats/HUDs, chin-mounted 6-barrel 30mm Gatling rotary cannon & spherical FLIR gimbal, wheeled tri-gear
 *   hydraulic landing undercarriage (`y = 0..24`), dorsal reactor spine with twin 16-segment turbine intakes & AWACS radar dome,
 *   cambered supercritical airfoil canards & swept delta wings with slotted flaps, 19-tube AGM rocket pods & finned anti-ship
 *   missiles, 12-point sculpted outboard VTOL tilt-engine nacelles (`x = +-68..+-95`), canted airfoil tail fins (`y = 60..110`),
 *   and twin 20-segment main aft fusion thruster bells (`z = -160..-132`) with recessed glowing cyan-white plasma cores.
 */
export function spaceshipMesh(options = {}) {
  const reactorsActive = typeof options === 'boolean' ? options : Boolean(options?.reactorsActive);
  const vertices = [];
  const normals = [];
  const uvs = [];

  const uvHullPlate = shipCellUv(SPACESHIP_HULL, new Vec2(0.04, 0.96), new Vec2(0.04, 0.50));
  const uvHullSeam = shipCellUv(SPACESHIP_HULL, new Vec2(0.06, 0.94), new Vec2(0.16, 0.38));
  const uvHullHazard = shipCellUv(SPACESHIP_HULL, new Vec2(0.04, 0.96), new Vec2(0.54, 0.71));
  const uvHullSquadron = shipCellUv(SPACESHIP_HULL, new Vec2(0.04, 0.48), new Vec2(0.75, 0.96));
  const uvHullBelly = shipCellUv(SPACESHIP_HULL, new Vec2(0.52, 0.96), new Vec2(0.75, 0.96));

  const uvCanopyGlass = shipCellUv(SPACESHIP_COCKPIT, new Vec2(0.06, 0.94), new Vec2(0.06, 0.52));
  const uvCanopyHud = shipCellUv(SPACESHIP_COCKPIT, new Vec2(0.16, 0.84), new Vec2(0.34, 0.52));
  const uvRadome = shipCellUv(SPACESHIP_COCKPIT, new Vec2(0.04, 0.48), new Vec2(0.60, 0.96));
  const uvFlirSensor = shipCellUv(SPACESHIP_COCKPIT, new Vec2(0.54, 0.96), new Vec2(0.60, 0.96));

  const uvTurbineIntake = shipCellUv(SPACESHIP_ENGINE, new Vec2(0.04, 0.48), new Vec2(0.04, 0.48));
  const uvReactorInactive = shipCellUv(SPACESHIP_ENGINE, new Vec2(0.54, 0.96), new Vec2(0.04, 0.48));
  const uvReactorActive = shipCellUv(SPACESHIP_ENGINE, new Vec2(0.06, 0.46), new Vec2(0.54, 0.94));
  const uvEngineLouvers = shipCellUv(SPACESHIP_ENGINE, new Vec2(0.54, 0.96), new Vec2(0.53, 0.73));
  const uvNozzlePetals = shipCellUv(SPACESHIP_ENGINE, new Vec2(0.54, 0.96), new Vec2(0.76, 0.96));
  const uvPlasmaCore = reactorsActive ? uvReactorActive : uvReactorInactive;
  const uvReactorConeSide = reactorsActive ? uvReactorActive : uvNozzlePetals;

  const uvWingSkin = shipCellUv(SPACESHIP_WING, new Vec2(0.04, 0.96), new Vec2(0.04, 0.52));
  const uvRocketPod = shipCellUv(SPACESHIP_WING, new Vec2(0.04, 0.50), new Vec2(0.58, 0.96));
  const uvStrobeRed = shipCellUv(SPACESHIP_WING, new Vec2(0.56, 0.94), new Vec2(0.58, 0.74));
  const uvStrobeGreen = shipCellUv(SPACESHIP_WING, new Vec2(0.56, 0.94), new Vec2(0.79, 0.95));

  const fuselageUvs = {
    top: uvHullPlate,
    upperSide: uvHullSquadron,
    side: uvHullPlate,
    lowerSide: uvHullSeam,
    belly: uvHullBelly,
  };
  const radomeUvs = {
    top: uvRadome,
    upperSide: uvRadome,
    side: uvRadome,
    lowerSide: uvRadome,
    belly: uvHullBelly,
  };

  // 1. 16-STATION 18-POINT SCULPTED CHINED FUSELAGE & OGIVE RADOME (z = -144..+160)
  const stations = [
    { z: -144, profile: new Vec3(44.5, 22.5, 17.0) },
    { z: -126, profile: new Vec3(43.8, 28.5, 20.0) },
    { z: -102, profile: new Vec3(43.0, 34.0, 22.8) },
    { z: -76, profile: new Vec3(42.4, 37.2, 24.5) },
    { z: -46, profile: new Vec3(42.0, 38.6, 25.4) },
    { z: -14, profile: new Vec3(42.0, 38.8, 25.5) },
    { z: 18, profile: new Vec3(41.8, 38.2, 25.0) },
    { z: 46, profile: new Vec3(40.5, 35.0, 23.2) },
    { z: 72, profile: new Vec3(38.8, 30.2, 20.6) },
    { z: 96, profile: new Vec3(36.8, 24.8, 17.5) },
    { z: 116, profile: new Vec3(34.8, 19.2, 14.2) },
    { z: 132, profile: new Vec3(33.2, 14.0, 10.6) },
    { z: 144, profile: new Vec3(32.0, 9.2, 7.2) },
    { z: 152, profile: new Vec3(31.4, 5.2, 4.2) },
    { z: 157, profile: new Vec3(31.1, 2.2, 1.9) },
  ];
  for (let i = 0; i < stations.length - 1; i++) {
    const s0 = stations[i];
    const s1 = stations[i + 1];
    const uvMap = s0.z >= 116 ? radomeUvs : fuselageUvs;
    pushSpaceshipFuselageSection(
      vertices,
      normals,
      uvs,
      new Vec2(s0.z, s1.z),
      s0.profile,
      s1.profile,
      uvMap,
    );
  }
  // Precision nose pitot-static probe boom (z = +155..+160) & dual AOA sensor vanes
  pushAxialOctagonalTube(
    vertices,
    normals,
    uvs,
    new Vec2(0, 31.0),
    new Vec2(154, 160),
    new Vec2(1.8, 0.45),
    uvNozzlePetals,
    null,
    uvRadome,
    12,
  );
  for (const side of [-1, 1]) {
    pushSweptWing(
      vertices,
      normals,
      uvs,
      side * 12.5,
      side * 16.5,
      new Vec2(126, 136),
      new Vec2(128, 133),
      new Vec2(31.5, 33.2),
      new Vec2(31.8, 33.0),
      uvNozzlePetals,
      uvHullSeam,
    );
  }

  // Aft fuselage bulkhead, recessed troop-bay doorway & lowered hydraulic assault boarding ramp (z = -150..-110)
  pushShipBox(vertices, normals, uvs, new Vec3(-22, 26, -144), new Vec3(22, 60, -140), uvEngineLouvers);
  pushShipBox(vertices, normals, uvs, new Vec3(-16, 24, -142), new Vec3(16, 52, -136), uvHullBelly);
  pushSweptWing(
    vertices,
    normals,
    uvs,
    -15.5,
    15.5,
    new Vec2(-149, -112),
    new Vec2(-149, -112),
    new Vec2(3.2, 20.5),
    new Vec2(3.2, 20.5),
    uvHullBelly,
    uvHullHazard,
  );
  // Anti-slip boarding ramp cleats & twin hydraulic actuator rams
  for (let cz = -145; cz <= -118; cz += 6) {
    const t = (cz - -149) / 37;
    const cy = 4.2 + t * 15.5;
    pushShipBox(vertices, normals, uvs, new Vec3(-13.5, cy, cz - 0.9), new Vec3(13.5, cy + 1.4, cz + 0.9), uvNozzlePetals);
  }
  for (const side of [-1, 1]) {
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(side * 14.0, 19.0),
      new Vec2(-139, -120),
      new Vec2(1.4, 1.1),
      uvNozzlePetals,
      uvHullSeam,
      uvHullSeam,
      10,
    );
  }

  // Sculpted lateral fuselage armor chines, wing-root strake fillets, troop airlock doors & forward weapon sponsons
  for (const side of [-1, 1]) {
    const xIn = side > 0 ? 35 : -43.5;
    const xOut = side > 0 ? 43.5 : -35;
    pushShipBox(vertices, normals, uvs, new Vec3(xIn, 22, -42), new Vec3(xOut, 56, 14), uvHullSquadron);
    pushShipBox(
      vertices,
      normals,
      uvs,
      new Vec3(side > 0 ? 42.2 : -45.0, 24.5, -34),
      new Vec3(side > 0 ? 45.0 : -42.2, 52.5, 8),
      uvHullPlate,
    );
    // Airlock lower threshold caution sill
    pushShipBox(
      vertices,
      normals,
      uvs,
      new Vec3(side > 0 ? 42.4 : -45.2, 22.5, -34),
      new Vec3(side > 0 ? 45.2 : -42.4, 25.0, 8),
      uvHullHazard,
    );
    // Airlock door vertical stiffener ribs & grab handle
    for (const rz of [-26, -13, 0]) {
      pushShipBox(
        vertices,
        normals,
        uvs,
        new Vec3(side > 0 ? 44.6 : -45.8, 26, rz - 1.2),
        new Vec3(side > 0 ? 45.8 : -44.6, 50, rz + 1.2),
        uvHullSeam,
      );
    }
    // Forward cheek avionics & RCS thruster sponsons (z = +48..+112)
    pushShipFrustum(
      vertices,
      normals,
      uvs,
      new Vec2(24, 45),
      new Vec2(5.5, 31),
      new Vec2(3.8, 24),
      new Vec3(side * 31.5, 0, 78),
      { top: uvHullPlate, bottom: uvHullBelly, side: uvHullSeam },
    );
    // Wing-root aerodynamic strake fillet blending fuselage into inner delta wing (z = -92..+52)
    pushSweptWing(
      vertices,
      normals,
      uvs,
      side * 33,
      side * 46,
      new Vec2(-90, 52),
      new Vec2(-88, 28),
      new Vec2(42, 58),
      new Vec2(44, 55),
      uvHullPlate,
      uvHullSeam,
    );
  }

  // 2. GEODESIC TANDEM BALLISTIC CANOPY & DETAILED COCKPIT INTERIOR (y = 44..74, z = +12..+134)
  const canopyStations = [
    { z: 12, arch: new Vec3(53.0, 71.5, 16.5) },
    { z: 34, arch: new Vec3(53.0, 73.5, 17.8) },
    { z: 58, arch: new Vec3(52.0, 73.0, 17.4) },
    { z: 80, arch: new Vec3(49.5, 68.5, 16.2) },
    { z: 100, arch: new Vec3(46.8, 63.5, 14.8) },
    { z: 118, arch: new Vec3(44.0, 56.5, 12.2) },
    { z: 133, arch: new Vec3(41.2, 46.8, 8.2) },
  ];
  for (let i = 0; i < canopyStations.length - 1; i++) {
    const c0 = canopyStations[i];
    const c1 = canopyStations[i + 1];
    pushCanopySection(
      vertices,
      normals,
      uvs,
      new Vec2(c0.z, c1.z),
      c0.arch,
      c1.arch,
      uvCanopyGlass,
      uvHullPlate,
    );
  }
  // Sculpted external titanium canopy arch ribs along station joints
  for (const st of canopyStations) {
    if (st.z <= 14 || st.z >= 130)
      continue;
    pushCanopySection(
      vertices,
      normals,
      uvs,
      new Vec2(st.z - 1.3, st.z + 1.3),
      new Vec3(st.arch.x, st.arch.y + 0.7, st.arch.z + 0.6),
      new Vec3(st.arch.x, st.arch.y + 0.7, st.arch.z + 0.6),
      uvHullPlate,
      uvHullSeam,
    );
  }
  // Tandem cockpit interior: pilot & weapons-officer ejection seats, glare-shields & glowing HUD combiners
  for (const seatZ of [44, 88]) {
    const seatY = seatZ > 65 ? 46 : 50;
    // Armored seat bucket & twin headrest bolsters
    pushShipBox(vertices, normals, uvs, new Vec3(-5.8, seatY, seatZ - 4.5), new Vec3(5.8, seatY + 13.5, seatZ - 1.2), uvHullBelly);
    pushShipBox(vertices, normals, uvs, new Vec3(-4.6, seatY + 13.5, seatZ - 4.2), new Vec3(4.6, seatY + 18.2, seatZ - 1.5), uvHullHazard);
    // Forward instrument console & holographic green HUD combiner glass
    pushShipBox(vertices, normals, uvs, new Vec3(-7.5, seatY + 4.0, seatZ + 6.5), new Vec3(7.5, seatY + 10.5, seatZ + 12.5), uvHullSeam);
    pushShipBox(vertices, normals, uvs, new Vec3(-4.8, seatY + 10.5, seatZ + 8.0), new Vec3(4.8, seatY + 15.8, seatZ + 9.2), uvCanopyHud);
  }

  // 3. CHIN-MOUNTED 6-BARREL 30MM GATLING ROTARY CANNON & SPHERICAL FLIR GIMBAL (z = +100..+159)
  pushShipFrustum(
    vertices,
    normals,
    uvs,
    new Vec2(14.5, 24.5),
    new Vec2(11.5, 16.0),
    new Vec2(13.5, 19.0),
    new Vec3(0, 0, 116),
    { top: uvHullSeam, bottom: uvHullBelly, side: uvHullSeam },
  );
  // Multi-ring spherical/geodesic FLIR electro-optical sensor turret (z = +116..+132)
  const flirRings = [
    { z: 115.0, r: 4.2 },
    { z: 118.0, r: 6.8 },
    { z: 122.0, r: 7.6 },
    { z: 126.0, r: 6.8 },
    { z: 129.2, r: 4.4 },
  ];
  for (let i = 0; i < flirRings.length - 1; i++) {
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(0, 14.0),
      new Vec2(flirRings[i].z, flirRings[i + 1].z),
      new Vec2(flirRings[i].r, flirRings[i + 1].r),
      uvFlirSensor,
      i === 0 ? uvHullSeam : null,
      i === flirRings.length - 2 ? uvFlirSensor : null,
      14,
    );
  }
  // Twin chin weapon pods each housing a 6-barrel 30mm Gatling cluster + barrel spider clamps
  for (const side of [-1, 1]) {
    const cx = side * 7.2;
    const cy = 18.8;
    // Armored recoil drum & rotor drive housing
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(cx, cy),
      new Vec2(118, 134),
      new Vec2(3.6, 3.3),
      uvHullSeam,
      uvHullBelly,
      uvNozzlePetals,
      12,
    );
    // 3 barrel clamp discs along the Gatling cluster
    for (const clampZ of [139, 148, 155.5]) {
      pushAxialOctagonalTube(
        vertices,
        normals,
        uvs,
        new Vec2(cx, cy),
        new Vec2(clampZ - 0.9, clampZ + 0.9),
        new Vec2(2.85, 2.85),
        uvHullHazard,
        uvNozzlePetals,
        uvNozzlePetals,
        12,
      );
    }
    // 6 individual high-velocity rotary barrels around the cluster perimeter
    for (let b = 0; b < 6; b++) {
      const a = (b / 6) * Trigo.twopi;
      const bx = cx + Math.cos(a) * 1.85;
      const by = cy + Math.sin(a) * 1.85;
      pushAxialOctagonalTube(
        vertices,
        normals,
        uvs,
        new Vec2(bx, by),
        new Vec2(133, 158.5),
        new Vec2(0.58, 0.55),
        uvNozzlePetals,
        null,
        uvRocketPod,
        8,
      );
    }
  }

  // 4. WHEELED TRI-GEAR HEAVY HYDRAULIC LANDING UNDERCARRIAGE (y = 0..24)
  // Forward twin-wheel nose gear (z = +94..+108, resting on y = 0)
  pushShipBox(vertices, normals, uvs, new Vec3(-2.6, 5.5, 98.5), new Vec3(2.6, 23.5, 103.5), uvNozzlePetals);
  pushShipBox(vertices, normals, uvs, new Vec3(-1.8, 8.0, 91.5), new Vec3(1.8, 22.0, 98.5), uvHullHazard);
  // Nose gear open bay doors
  for (const side of [-1, 1]) {
    pushShipBox(
      vertices,
      normals,
      uvs,
      new Vec3(side * 7.8 - 0.9, 13.5, 90),
      new Vec3(side * 7.8 + 0.9, 22.5, 110),
      uvHullPlate,
    );
    pushLandingWheel(
      vertices,
      normals,
      uvs,
      new Vec3(side * 4.4, 5.2, 101.0),
      new Vec2(5.2, 1.8),
      uvHullBelly,
      uvNozzlePetals,
      16,
    );
  }

  // Port & Starboard quad-wheel heavy main landing bogies (x = +-44, z = -54..-24, resting on y = 0)
  for (const side of [-1, 1]) {
    const gx = side * 44;
    // Sponson wheel-well fairing & open armored bay doors
    pushShipFrustum(
      vertices,
      normals,
      uvs,
      new Vec2(14, 25),
      new Vec2(11.5, 18),
      new Vec2(9.5, 15),
      new Vec3(side * 37, 0, -39),
      { top: uvHullSeam, bottom: uvHullBelly, side: uvHullSeam },
    );
    pushShipBox(
      vertices,
      normals,
      uvs,
      new Vec3(gx + side * 6.5 - 1.0, 10.5, -55),
      new Vec3(gx + side * 6.5 + 1.0, 22.0, -23),
      uvHullPlate,
    );
    // Main oleo-pneumatic shock strut, bogie beam & diagonal drag brace
    pushShipBox(vertices, normals, uvs, new Vec3(gx - 2.6, 5.5, -42.5), new Vec3(gx + 2.6, 22.5, -35.5), uvNozzlePetals);
    pushShipBox(vertices, normals, uvs, new Vec3(gx - 2.2, 4.2, -50.5), new Vec3(gx + 2.2, 7.6, -27.5), uvHullSeam);
    for (const wz of [-47.5, -30.5]) {
      for (const wxOff of [-4.2, 4.2]) {
        pushLandingWheel(
          vertices,
          normals,
          uvs,
          new Vec3(gx + wxOff, 5.8, wz),
          new Vec2(5.8, 1.9),
          uvHullBelly,
          uvNozzlePetals,
          16,
        );
      }
    }
  }

  // 5. SCULPTED DORSAL REACTOR SPINE, TWIN 16-SEGMENT TURBINE SCOOPS & AWACS RADAR DOME (y = 64..107)
  const spineStations = [
    { z: -136, arch: new Vec3(62, 76, 15.0) },
    { z: -96, arch: new Vec3(64, 82, 19.5) },
    { z: -48, arch: new Vec3(65, 84, 21.0) },
    { z: -4, arch: new Vec3(65, 82, 19.5) },
    { z: 24, arch: new Vec3(63, 75, 15.5) },
  ];
  for (let i = 0; i < spineStations.length - 1; i++) {
    pushCanopySection(
      vertices,
      normals,
      uvs,
      new Vec2(spineStations[i].z, spineStations[i + 1].z),
      spineStations[i].arch,
      spineStations[i + 1].arch,
      uvEngineLouvers,
      uvHullPlate,
    );
  }
  // Twin 16-sided supersonic dorsal turbine intakes with central shock cones (x = +-14.5, z = -22..+40)
  for (const side of [-1, 1]) {
    const ix = side * 14.8;
    const iy = 72.5;
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(ix, iy),
      new Vec2(-22, 26),
      new Vec2(7.6, 7.4),
      uvHullPlate,
      null,
      null,
      16,
    );
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(ix, iy),
      new Vec2(26, 39),
      new Vec2(7.4, 6.4),
      uvHullSeam,
      null,
      uvTurbineIntake,
      16,
    );
    // Supersonic intake centerbody shock spike
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(ix, iy),
      new Vec2(35, 44),
      new Vec2(2.6, 0.3),
      uvRadome,
      null,
      uvRadome,
      12,
    );
  }
  // Dorsal radar mast & 16-segment phased-array AWACS rotodome (y = 82..107, z = -38..-8)
  pushSweptWing(
    vertices,
    normals,
    uvs,
    -2.6,
    2.6,
    new Vec2(-36, 0),
    new Vec2(-34, -6),
    new Vec2(80, 102),
    new Vec2(80, 102),
    uvHullSquadron,
    uvHullSeam,
  );
  pushSpaceshipNacelleSection(
    vertices,
    normals,
    uvs,
    new Vec2(0, 103.8),
    new Vec2(-40, -24),
    new Vec2(5.5, 1.8),
    new Vec2(12.5, 3.0),
    { top: uvRadome, upper: uvRadome, side: uvHullSquadron, lower: uvRadome, bottom: uvHullBelly },
  );
  pushSpaceshipNacelleSection(
    vertices,
    normals,
    uvs,
    new Vec2(0, 103.8),
    new Vec2(-24, -8),
    new Vec2(12.5, 3.0),
    new Vec2(5.5, 1.8),
    { top: uvRadome, upper: uvRadome, side: uvHullSquadron, lower: uvRadome, bottom: uvHullBelly },
  );

  // 6. CAMBERED AIRFOIL CANARDS, SWEPT DELTA WINGS, SLOTTED FLAPS & ORDNANCE (x = +-26..+-82)
  for (const side of [-1, 1]) {
    // Forward Variable-Incidence Canard Foreplanes (z = +62..+110)
    pushSweptWing(
      vertices,
      normals,
      uvs,
      side * 25,
      side * 56,
      new Vec2(72, 109),
      new Vec2(63, 84),
      new Vec2(35.8, 41.8),
      new Vec2(34.5, 38.4),
      uvWingSkin,
      uvHullSeam,
    );
    // Main Inner & Outer Swept Supercritical Delta Wing Panels (x = +-35..+-74, z = -92..+38)
    pushSweptWing(
      vertices,
      normals,
      uvs,
      side * 35,
      side * 55,
      new Vec2(-86, 38),
      new Vec2(-90, 16),
      new Vec2(44.5, 56.5),
      new Vec2(42.8, 52.8),
      uvWingSkin,
      uvHullSeam,
    );
    pushSweptWing(
      vertices,
      normals,
      uvs,
      side * 55,
      side * 74,
      new Vec2(-90, 16),
      new Vec2(-93, -6),
      new Vec2(42.8, 52.8),
      new Vec2(40.8, 48.8),
      uvWingSkin,
      uvHullSeam,
    );
    // Articulated trailing-edge slotted flaps & underwing flap-track actuator fairings
    pushSweptWing(
      vertices,
      normals,
      uvs,
      side * 38,
      side * 68,
      new Vec2(-98, -86),
      new Vec2(-100, -90),
      new Vec2(40.5, 45.5),
      new Vec2(39.0, 43.2),
      uvWingSkin,
      uvHullSeam,
    );
    for (const fx of [side * 44, side * 56, side * 66]) {
      pushAxialOctagonalTube(
        vertices,
        normals,
        uvs,
        new Vec2(fx, 41.5),
        new Vec2(-96, -70),
        new Vec2(1.4, 2.2),
        uvHullSeam,
        uvNozzlePetals,
        null,
        10,
      );
    }

    // Underwing ordnance pylons, 16-sided 19-tube AGM rocket pod & twin finned anti-ship missiles
    const pylon1X = side * 49;
    const pylon2X = side * 62;
    pushSweptWing(
      vertices,
      normals,
      uvs,
      pylon1X - 1.8,
      pylon1X + 1.8,
      new Vec2(-46, 12),
      new Vec2(-46, 12),
      new Vec2(33, 47),
      new Vec2(33, 47),
      uvHullSeam,
      uvHullPlate,
    );
    pushSweptWing(
      vertices,
      normals,
      uvs,
      pylon2X - 1.6,
      pylon2X + 1.6,
      new Vec2(-54, 4),
      new Vec2(-54, 4),
      new Vec2(32, 45),
      new Vec2(32, 45),
      uvHullSeam,
      uvHullPlate,
    );

    // 19-tube cylindrical AGM rocket launcher pod (x = +-49, z = -54..+26)
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(pylon1X, 30.8),
      new Vec2(-54, -46),
      new Vec2(4.6, 6.6),
      uvNozzlePetals,
      uvPlasmaCore,
      null,
      16,
    );
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(pylon1X, 30.8),
      new Vec2(-46, 24),
      new Vec2(6.6, 6.4),
      uvHullSquadron,
      null,
      uvRocketPod,
      16,
    );

    // Heavy anti-ship missile with multi-stage ogive seeker nose & cruciform fins (x = +-62, z = -60..+34)
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(pylon2X, 30.2),
      new Vec2(-60, 18),
      new Vec2(3.8, 3.8),
      uvHullSquadron,
      uvPlasmaCore,
      null,
      16,
    );
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(pylon2X, 30.2),
      new Vec2(18, 28),
      new Vec2(3.8, 2.1),
      uvRadome,
      null,
      null,
      16,
    );
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(pylon2X, 30.2),
      new Vec2(28, 34),
      new Vec2(2.1, 0.35),
      uvFlirSensor,
      null,
      uvFlirSensor,
      16,
    );
    // Missile cruciform tail & seeker fins
    for (const fz of [-56, 8]) {
      pushShipBox(vertices, normals, uvs, new Vec3(pylon2X - 6.8, 29.6, fz), new Vec3(pylon2X + 6.8, 30.8, fz + 8), uvWingSkin);
      pushShipBox(vertices, normals, uvs, new Vec3(pylon2X - 0.6, 23.4, fz), new Vec3(pylon2X + 0.6, 37.0, fz + 8), uvWingSkin);
    }
  }

  // 7. 12-POINT SCULPTED OUTBOARD VTOL TILT-ENGINE NACELLES & WINGTIPS (x = +-68..+-95)
  const nacelleUvs = {
    top: uvWingSkin,
    upper: uvHullSquadron,
    side: uvEngineLouvers,
    lower: uvHullSeam,
    bottom: uvHullBelly,
  };
  for (const side of [-1, 1]) {
    const nx = side * 80;
    const ny = 47.0;
    const nacStations = [
      { z: -98, wh: new Vec2(8.8, 9.2) },
      { z: -78, wh: new Vec2(11.2, 12.2) },
      { z: -42, wh: new Vec2(12.0, 13.5) },
      { z: -6, wh: new Vec2(11.6, 13.0) },
      { z: 16, wh: new Vec2(10.2, 11.2) },
    ];
    for (let i = 0; i < nacStations.length - 1; i++) {
      pushSpaceshipNacelleSection(
        vertices,
        normals,
        uvs,
        new Vec2(nx, ny),
        new Vec2(nacStations[i].z, nacStations[i + 1].z),
        nacStations[i].wh,
        nacStations[i + 1].wh,
        nacelleUvs,
      );
    }
    // Forward 16-sided supersonic turbine intake cowl & spinner cone (z = +14..+31)
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(nx, ny),
      new Vec2(14, 28),
      new Vec2(9.6, 8.4),
      uvHullSeam,
      null,
      uvTurbineIntake,
      16,
    );
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(nx, ny),
      new Vec2(26, 33),
      new Vec2(3.2, 0.4),
      uvNozzlePetals,
      null,
      uvRadome,
      12,
    );
    // Aft 20-sided vectoring thruster nozzle & glowing cyan plasma core (z = -116..-96)
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(nx, ny),
      new Vec2(-106, -96),
      new Vec2(9.2, 8.4),
      uvHullSeam,
      null,
      null,
      20,
    );
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(nx, ny),
      new Vec2(-116, -104),
      new Vec2(7.6, 9.5),
      uvNozzlePetals,
      uvPlasmaCore,
      null,
      20,
    );
    // Ventral VTOL hover thruster ring underneath nacelle (y = 30.5..35, z = -42)
    pushShipFrustum(
      vertices,
      normals,
      uvs,
      new Vec2(30.5, 34.5),
      new Vec2(6.8, 6.8),
      new Vec2(8.0, 8.0),
      new Vec3(nx, 0, -42),
      { top: uvHullBelly, bottom: uvPlasmaCore, side: uvNozzlePetals },
    );
    // Outboard canted winglet fin & navigation strobe housing (x = +-88..+-95)
    pushSweptWing(
      vertices,
      normals,
      uvs,
      side * 88,
      side * 95,
      new Vec2(-88, -6),
      new Vec2(-82, -30),
      new Vec2(42, 52),
      new Vec2(54, 74),
      uvWingSkin,
      uvHullSeam,
    );
    const uvStrobe = side < 0 ? uvStrobeRed : uvStrobeGreen;
    pushShipBox(
      vertices,
      normals,
      uvs,
      new Vec3(side > 0 ? 90.5 : -94.8, 43.5, -48),
      new Vec3(side > 0 ? 94.8 : -90.5, 49.5, -20),
      uvStrobe,
    );
  }

  // 8. CAMBERED CANTED VERTICAL TAIL FINS (y = 60..110) & TWIN 20-SEGMENT MAIN AFT FUSION DRIVES (z = -160..-132)
  for (const side of [-1, 1]) {
    const rootX = side * 21;
    const tipX = side * 37.5;
    pushSweptWing(
      vertices,
      normals,
      uvs,
      rootX,
      tipX,
      new Vec2(-144, -72),
      new Vec2(-148, -108),
      new Vec2(60, 68),
      new Vec2(104, 110),
      uvWingSkin,
      uvHullSquadron,
    );
    // Tailfin tip RWR sensor pod & anti-collision beacon (y = 106..110)
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(tipX, 108.0),
      new Vec2(-148, -104),
      new Vec2(2.0, 1.4),
      side < 0 ? uvStrobeRed : uvStrobeGreen,
      uvNozzlePetals,
      uvRadome,
      12,
    );

    // Massive 20-segment multi-stage main aft fusion thruster bell (x = +-17, y = 44, z = -160..-132)
    const ex = side * 17.2;
    const ey = 44.0;
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(ex, ey),
      new Vec2(-146, -134),
      new Vec2(16.4, 15.6),
      uvEngineLouvers,
      null,
      null,
      20,
    );
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(ex, ey),
      new Vec2(-153, -145),
      new Vec2(15.2, 16.6),
      uvHullSeam,
      null,
      null,
      20,
    );
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(ex, ey),
      new Vec2(-160, -152),
      new Vec2(12.6, 15.2),
      uvNozzlePetals,
      uvPlasmaCore,
      null,
      20,
    );
    // Central magnetic pinch exhaust cone inside thruster bell
    pushAxialOctagonalTube(
      vertices,
      normals,
      uvs,
      new Vec2(ex, ey),
      new Vec2(-159.5, -148),
      new Vec2(1.2, 5.8),
      uvReactorConeSide,
      uvPlasmaCore,
      null,
      12,
    );
  }

  // Central aft tailcone auxiliary fusion thruster between the main bells (z = -156..-138)
  pushAxialOctagonalTube(
    vertices,
    normals,
    uvs,
    new Vec2(0, 44.0),
    new Vec2(-156, -138),
    new Vec2(5.6, 7.8),
    uvNozzlePetals,
    uvPlasmaCore,
    null,
    16,
  );

  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
}

export const buildSpaceship = spaceshipMesh;

/**
 * Builds the 3D UAC Heavy Assault Dropship mesh with its fusion reactors and VTOL thrusters ignited (active state).
 */
export function spaceshipActiveMesh() {
  return spaceshipMesh({ reactorsActive: true });
}

/**
 * Builds the intact heavy hull mesh for the indestructible spaceship (satisfies the `FURNITURE_KINDS` interface).
 */
export function spaceshipWreckMesh() {
  return spaceshipMesh();
}

/**
 * Builds the settled floor-debris mesh for the spaceship (satisfies the `FURNITURE_KINDS` interface).
 */
export function spaceshipDebrisMesh() {
  const vertices = [];
  const normals = [];
  const uvs = [];
  const uvHull = shipCellUv(SPACESHIP_HULL, new Vec2(0.06, 0.94), new Vec2(0.06, 0.48));
  pushShipBox(vertices, normals, uvs, new Vec3(-6, 0.1, -6), new Vec3(6, 2.2, 6), uvHull);
  return flipV({
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  });
}

/**
 * Builds the 5 animated shrapnel meshes for the spaceship (`FURNITURE_KINDS` interface parity).
 */
export function spaceshipShrapnelParts() {
  const uvHull = shipCellUv(SPACESHIP_HULL, new Vec2(0.06, 0.94), new Vec2(0.06, 0.48));
  const uvHazard = shipCellUv(SPACESHIP_HULL, new Vec2(0.06, 0.94), new Vec2(0.54, 0.71));
  const topVerts = [];
  const topNorms = [];
  const topUvs = [];
  pushShipBox(topVerts, topNorms, topUvs, new Vec3(-5, -1.5, -5), new Vec3(5, 1.5, 5), uvHull);
  const specs = [
    new Vec3(3.5, 1.2, 4.5),
    new Vec3(3.0, 1.0, 4.0),
    new Vec3(2.8, 0.8, 3.2),
    new Vec3(4.0, 0.9, 2.8),
    new Vec3(2.5, 1.4, 2.5),
  ];
  const shards = specs.map((half, i) => {
    const v = [];
    const n = [];
    const t = [];
    pushShipBox(v, n, t, new Vec3(-half.x, -half.y, -half.z), new Vec3(half.x, half.y, half.z), i & 1 ? uvHazard : uvHull);
    return flipV({
      vertices: new Float32Array(v),
      normals: new Float32Array(n),
      uvs: new Float32Array(t),
    });
  });
  return {
    carboyTop: flipV({
      vertices: new Float32Array(topVerts),
      normals: new Float32Array(topNorms),
      uvs: new Float32Array(topUvs),
    }),
    shards,
  };
}

/**
 * Allocates a reusable zero-allocation break-pose target for `spaceshipBreakPose()`.
 */
export function createSpaceshipBreakPose() {
  return createDispenserBreakPose();
}

/**
 * Computes the ballistic shrapnel trajectory pose for `spaceshipShrapnelParts()` into `target`.
 */
export function spaceshipBreakPose(elapsed, seed = 0, target = createSpaceshipBreakPose()) {
  return dispenserBreakPose(elapsed, seed + 5.7, target);
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
