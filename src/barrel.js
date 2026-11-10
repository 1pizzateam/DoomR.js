import { Trigo, Utils, Vec2, Vec3 } from '@1pizzateam/spock';
import { mulberry32 } from './rng.js';
import { field, mix, plate, rivet, rust, SHADOW, Tile } from './floor.js';

const scratchPt = new Vec2();
const scratchUvA = new Vec2();
const scratchUvB = new Vec2();
const scratchUvC = new Vec2();
const scratchUvD = new Vec2();
const scratchEdgeA = new Vec3();
const scratchEdgeB = new Vec3();
const scratchNormal = new Vec3();

/**
 * The skin of an explosive barrel: an orange oil drum, as a pixel-art atlas drawn here in code. The side is 128 x 64
 * (round the barrel and down it) with a hazard band, rolling hoops, two warning labels, weld seams and rust; the lid is
 * 64 x 64; and the fourth 64 x 64 cell is scorched soot, blistered steel, and glowing residual embers for the ruptured
 * barrel stump and flying shrapnel after detonation.
 */

const SIDE = { x: 0, width: 128, height: 64 };
const LID = { x: 128, width: 64, height: 64 };
const CHAR = { x: 192, width: 64, height: 64 };
export const BARREL_ATLAS = { width: 256, height: 64 };
export const BARREL_STAVE_COUNT = 5;

export const BARREL_FIRE_VERTEX = `
attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aTextureCoord;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform float uTime;
uniform float uPhase;
uniform float uHeat;
varying float vDepth;
varying float vHeight;
varying vec2 vTextureCoord;
varying vec2 vWorld;
varying vec3 vLocalPos;
varying vec3 vWorldPos;

void main(void) {
  vec2 quadId = floor(aTextureCoord);
  vec2 uv = clamp((fract(aTextureCoord) - 0.02) / 0.96, 0.0, 1.0);
  float kind = quadId.y;
  float isSmoke = step(1.5, kind);
  float isVertical = step(0.5, kind);
  float hFrac = mix(0.25, 1.0 - uv.y, isVertical);
  float swayEnv = hFrac * hFrac * isVertical;

  float speed = mix(1.45, 0.72, isSmoke);
  float phase = aVertexPosition.y * mix(0.22, 0.14, isSmoke) - uTime * speed + uPhase * 0.25 + quadId.x * 1.7;
  float swayX = sin(phase) * mix(0.16, 0.36, isSmoke) * swayEnv;
  float swayZ = cos(phase * 0.87 + 1.3) * mix(0.16, 0.36, isSmoke) * swayEnv;

  vec3 displaced = aVertexPosition + vec3(swayX, 0.0, swayZ);
  vec4 world = uModelMatrix * vec4(displaced, 1.0);
  vec4 v = uViewMatrix * world;
  vDepth = -v.z;
  vHeight = world.y;
  vTextureCoord = aTextureCoord;
  vWorld = world.xz;
  vLocalPos = aVertexPosition;
  vWorldPos = world.xyz;
  vec4 clip = uProjectionMatrix * v;
  clip.z -= 0.00001 * clip.w;
  gl_Position = clip;
}
`;

export const BARREL_FIRE_FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uSampler;
uniform vec3 uMaterialDiffuse;
uniform float uTime;
uniform float uPhase;
uniform float uHeat;
uniform float uDissolve;
uniform int uHasFog;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vDepth;
varying float vHeight;
varying vec2 vTextureCoord;
varying vec2 vWorld;
varying vec3 vLocalPos;
varying vec3 vWorldPos;

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

uniform int uNbLights;
uniform vec3 uAmbientLight;
uniform vec3 uLightPosition[8];
uniform vec3 uLightDiffuse[8];
uniform vec3 uLightAttenuation[8];

vec3 surfaceLight(vec3 worldPos, float emissive) {
  if (uNbLights <= 0)
    return vec3(1.0);
  vec3 total = uAmbientLight;
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
    total += diff * (attenuation * spread);
  }
  return mix(min(total, vec3(2.5)), max(total, vec3(1.35)), clamp(emissive, 0.0, 1.0));
}

vec3 evalFireRamp(float t) {
  vec3 soot = vec3(0.12, 0.10, 0.11);
  vec3 ember = vec3(0.54, 0.10, 0.03);
  vec3 crimson = vec3(0.94, 0.21, 0.04);
  vec3 orange = vec3(1.06, 0.54, 0.09);
  vec3 gold = vec3(1.16, 0.88, 0.30);
  vec3 plasma = vec3(1.26, 1.16, 0.84);

  if (t < 0.18)
    return mix(soot, ember, clamp(t / 0.18, 0.0, 1.0));
  if (t < 0.40)
    return mix(ember, crimson, (t - 0.18) / 0.22);
  if (t < 0.66)
    return mix(crimson, orange, (t - 0.40) / 0.26);
  if (t < 0.90)
    return mix(orange, gold, (t - 0.66) / 0.24);
  return mix(gold, plasma, clamp((t - 0.90) / 0.35, 0.0, 1.0));
}

void main(void) {
  if (uHasFog == 1 && vDepth >= uFogFar)
    discard;
  vec2 quadId = floor(vTextureCoord);
  vec2 uv = clamp((fract(vTextureCoord) - 0.02) / 0.96, 0.0, 1.0);
  float kind = quadId.y;
  float isSmoke = step(1.5, kind);
  float q1 = hash(quadId + vec2(3.1, 7.7));
  float q2 = hash(quadId + vec2(19.3, 41.9));
  float q3 = hash(quadId + vec2(53.7, 11.3));
  float dir = q3 > 0.5 ? 1.0 : -1.0;
  float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));

  vec3 color;
  float alpha;

  if (isSmoke > 0.5) {
    float spatialPhase = noise(vWorld * 0.032 + vec2(q1 * 5.0, q2 * 5.0)) * 14.0;
    float localSpeed = 0.52 + q2 * 0.36;
    float t = uTime * localSpeed + q1 * 37.0 + spatialPhase;
    vec2 seedShift = vec2(q1 * 29.0 - q3 * 17.0, q2 * 31.0 + q1 * 13.0);
    vec2 p = vWorld / (6.8 + q3 * 3.4) + seedShift;
    float rise = uTime * (0.30 + q2 * 0.16) + q1 * 23.0 + spatialPhase * 0.5;
    float yCoord = vLocalPos.y * 0.20 - rise;
    float sway = sin(vLocalPos.y * (0.24 + q3 * 0.08) - t * 0.72 + (vWorld.x * dir + vWorld.y) * 0.09 + q1 * 6.283) * 0.34;
    vec2 f1 = vec2(p.x + p.y * 0.6 * dir + sway * 0.4 + t * 0.04 * dir, yCoord + (p.y - p.x) * 0.35);
    vec2 f2 = vec2((p.x - p.y * 0.7 * dir) * 2.1 - sway * 0.65 - t * 0.06 * dir, yCoord * 1.85 + (p.x + p.y) * 0.25 + q2 * 11.0);
    vec2 f3 = p * 1.35 + vec2(t * 0.07 * dir, -rise * 0.35) + sway * 0.2;
    float density = noise(f1) * 0.5
                  + noise(f2) * 0.3
                  + noise(f3) * 0.2;
    float plumeWave = 0.62 + 0.38 * sin(vLocalPos.y * 0.36 - t * 0.85 + density * 3.2 + q2 * 6.283);
    float hFrac = 1.0 - uv.y;
    float radial = length((uv - vec2(0.5, 0.54)) * vec2(1.9, 1.6));
    float layerWeight = clamp(1.0 - radial * 0.52, 0.18, 1.0) * (1.0 - 0.52 * hFrac * hFrac);
    float wisp = smoothstep(0.30 - 0.09 * layerWeight, 0.85, density * plumeWave);
    float soft = smoothstep(0.0, 0.26, edge);
    alpha = clamp(wisp * (0.24 + 0.76 * layerWeight) * 0.44 * soft, 0.0, 1.0);
    alpha *= smoothstep(4.0, 26.0, vDepth);

    vec3 texTint = texture2D(uSampler, fract(vWorld / 64.0 + vec2(q1 * 0.73 + uTime * 0.02 * dir, q2 * 0.61 - uTime * 0.03))).rgb;
    vec3 sootDark = vec3(0.11, 0.10, 0.12);
    vec3 ashLight = vec3(0.27, 0.26, 0.29);
    vec3 smokeBase = mix(sootDark, ashLight, smoothstep(0.45, 0.88, density * plumeWave));
    smokeBase = mix(smokeBase, smokeBase * (0.75 + 0.5 * texTint), 0.15);
    float underGlow = (1.0 - smoothstep(0.0, 0.68, hFrac)) * clamp(uHeat * 0.85, 0.6, 1.35);
    vec3 fireBounce = vec3(0.98, 0.40, 0.09) * underGlow * (0.26 + 0.38 * (1.0 - density));
    vec3 lit = max(vec3(0.55, 0.55, 0.60), surfaceLight(vWorldPos, 0.35));
    color = mix(smokeBase, smokeBase * lit, 0.6) + fireBounce;
  } else if (kind < 0.5) {
    vec2 centered = (uv - 0.5) * 2.0;
    float r = length(centered);
    float radialSoft = 1.0 - smoothstep(0.24, 0.96, r);
    float t = uTime * (0.68 + q2 * 0.32) + q1 * 19.0 + uPhase * 0.15;
    vec2 p = vLocalPos.xz * 0.28 + vec2(q1 * 13.0, q2 * 17.0);
    float n1 = noise(p + vec2(t * 0.35 * dir, -t * 0.42));
    float n2 = noise(p * 2.15 - vec2(t * 0.52 * dir, t * 0.48) + vec2(4.7, 9.1));
    float n3 = noise(p * 4.1 + vec2(t * 0.65, -t * 0.6));
    float emberNoise = n1 * 0.5 + n2 * 0.32 + n3 * 0.18;
    float temp = clamp((1.08 - r * 0.82) * (0.62 + 0.58 * emberNoise) * uHeat, 0.0, 1.3);
    color = evalFireRamp(temp);
    float soft = smoothstep(0.0, 0.24, edge) * radialSoft;
    alpha = clamp(soft * smoothstep(0.14, 0.54, temp) * 0.88, 0.0, 1.0);
    alpha *= smoothstep(3.0, 16.0, vDepth);
  } else {
    float hFrac = clamp(1.0 - uv.y, 0.0, 1.0);
    float xCentered = (uv.x - 0.5) * 2.0;
    float localSpeed = 0.88 + q2 * 0.38;
    float t = uTime * localSpeed + q1 * 29.0 + uPhase * 0.18;
    float sway = sin(hFrac * (4.2 + q3 * 1.4) - t * 0.92 + q1 * 6.283) * (0.05 + 0.11 * hFrac);
    vec2 p = vec2((xCentered + sway) * (1.85 + q3 * 0.55), hFrac * 2.8 - t);
    vec2 f1 = p + vec2(q1 * 11.0, q2 * 17.0);
    vec2 f2 = p * 2.15 + vec2(-sway * 1.1 + t * 0.16 * dir, -t * 0.48) + vec2(q2 * 23.0, q3 * 13.0);
    vec2 f3 = p * 4.1 + vec2(t * 0.24 * dir, -t * 0.82) + vec2(7.3, 19.1);
    float turb = noise(f1) * 0.50
               + noise(f2) * 0.32
               + noise(f3) * 0.18;
    float tongueWave = 0.68 + 0.32 * sin(hFrac * 5.2 - t * 1.05 + turb * 3.2 + q2 * 6.283);

    float halfWidth = mix(0.80, 0.18, pow(hFrac, 0.85));
    float xDist = abs(xCentered + sway * 0.42) / max(halfWidth, 0.08);
    float coreMask = clamp(1.0 - xDist * xDist * (0.66 + 0.34 * hFrac), 0.0, 1.0);
    float verticalFade = smoothstep(0.0, 0.12, hFrac) * (1.0 - smoothstep(0.56, 0.98, hFrac));
    float shape = coreMask * verticalFade * (0.50 + 0.84 * turb * tongueWave);
    float soft = smoothstep(0.0, 0.22, edge);
    float flameAlpha = smoothstep(clamp(uDissolve, 0.12, 0.32), 0.72, shape) * soft;

    float coreTemp = (1.0 - 0.66 * hFrac) * (1.0 - 0.52 * clamp(xDist, 0.0, 1.0));
    float localTemp = clamp(uHeat * (0.70 * coreTemp + 0.58 * turb * tongueWave), 0.0, 1.32);
    vec3 fireCol = evalFireRamp(localTemp);
    vec3 texTint = texture2D(uSampler, fract(uv * 0.5 + vec2(q1 * 0.5, q2 * 0.5 - uTime * 0.10))).rgb;
    fireCol = mix(fireCol, fireCol * (0.76 + 0.48 * texTint), 0.16);
    float tipSmoke = smoothstep(0.54, 0.92, hFrac) * smoothstep(0.62, 0.18, localTemp);
    vec3 sootTip = vec3(0.14, 0.12, 0.13);
    color = mix(fireCol, sootTip, tipSmoke * 0.74);
    color *= mix(vec3(1.0), normalize(max(uMaterialDiffuse, vec3(0.2))), 0.2);
    alpha = clamp(flameAlpha * mix(0.88, 0.50, tipSmoke), 0.0, 1.0);
    alpha *= smoothstep(3.0, 16.0, vDepth);
  }

  if (alpha <= 0.004)
    discard;
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade);
  }
  gl_FragColor = vec4(color, alpha);
}
`;

const PAINT = [178, 96, 34];
const PAINT_LIGHT = [236, 140, 52];
const PAINT_DARK = [96, 48, 20];
const BAND_DARK = [26, 22, 28];
const BAND_PAINT = [218, 124, 38];
const LABEL = [172, 178, 190];
const LABEL_INK = [34, 22, 22];

function paint(t, x0, y0, w, h, rnd, top) {
  for (let y = y0; y < y0 + h; y++) {
    // lighter towards the top, as if lit from above
    const shade = 1.08 - ((y - y0) / h) * (top ? 0.34 : 0.2);
    for (let x = x0; x < x0 + w; x++) {
      const grain = 1 + (rnd() - 0.5) * 0.1;
      t.set(x, y, [PAINT[0] * shade * grain, PAINT[1] * shade * grain, PAINT[2] * shade * grain]);
    }
  }
}

/** A flame: a teardrop with a notch cut out of it, in dark ink on a pale plate. */
function flameLabel(t, cx, cy) {
  t.rect(cx - 12, cy - 8, 24, 17, LABEL);
  for (let i = 0; i < 24; i++) {
    t.set(cx - 12 + i, cy - 8, LABEL_INK);
    t.set(cx - 12 + i, cy + 8, LABEL_INK);
  }
  for (let i = 0; i < 17; i++) {
    t.set(cx - 12, cy - 8 + i, LABEL_INK);
    t.set(cx + 11, cy - 8 + i, LABEL_INK);
  }
  // the flame: pointed at the top, round at the bottom, leaning a little, with a smaller one cut out of its belly
  const flame = (height, scale, ink, lift) => {
    for (let dy = 0; dy < height; dy++) {
      const k = (dy + 0.5) / height;
      const half = 5.6 * scale * Math.pow(k, 0.6) * Math.sqrt(1 - Math.pow(k, 4));
      const lean = 2.2 * scale * (1 - k) * (1 - k);
      for (let x = Math.round(cx + lean - half); x <= Math.round(cx + lean + half); x++)
        t.set(x, cy - 7 + lift + dy, ink);
    }
  };
  flame(15, 1, LABEL_INK, 0);
  flame(8, 0.5, LABEL, 6);
}

function drawSide(rnd) {
  const t = new Tile(SIDE.width, SIDE.height);
  paint(t, 0, 0, SIDE.width, SIDE.height, rnd, true);

  // the top and bottom rims
  for (let x = 0; x < SIDE.width; x++) {
    t.set(x, 0, PAINT_LIGHT, 0.9);
    t.set(x, 1, PAINT_LIGHT, 0.4);
    t.set(x, 4, PAINT_DARK, 0.9);
    t.set(x, 5, PAINT_DARK, 0.4);
    t.set(x, 58, PAINT_LIGHT, 0.5);
    t.set(x, 59, PAINT_DARK, 0.7);
    t.set(x, 63, SHADOW);
    t.set(x, 62, SHADOW, 0.6);
  }
  // the rolling hoops: raised rings with a light edge above and a dark one below
  for (const y of [13, 52])
    for (let x = 0; x < SIDE.width; x++) {
      t.set(x, y, PAINT_LIGHT, 0.85);
      t.set(x, y + 1, mix(PAINT, PAINT_LIGHT, 0.45));
      t.set(x, y + 2, mix(PAINT, PAINT_LIGHT, 0.25));
      t.set(x, y + 3, PAINT_DARK, 0.95);
      t.set(x, y + 4, SHADOW, 0.5);
    }

  // the hazard band
  const wear = field(rnd, 10);
  for (let y = 21; y < 32; y++)
    for (let x = 0; x < SIDE.width; x++) {
      const stripe = Math.floor((x - y * 1.0 + 256) / 7) % 2 === 0;
      const worn = wear(x, y * 3) > 0.68;
      t.set(x, y, stripe ? mix(BAND_PAINT, PAINT_DARK, worn ? 0.55 : 0.05) : BAND_DARK, 0.97);
    }
  for (let x = 0; x < SIDE.width; x++) {
    t.set(x, 20, SHADOW, 0.85);
    t.set(x, 32, SHADOW, 0.85);
    t.set(x, 33, PAINT_DARK, 0.4);
  }

  // two warning labels, on opposite sides, so one is always in view
  flameLabel(t, 32, 42);
  flameLabel(t, 96, 42);

  // weld seams, where the sheet meets itself
  for (const x of [0, 64])
    for (let y = 5; y < 58; y++) {
      t.set(x, y, PAINT_DARK, 0.9);
      t.set(x + 1, y, PAINT_LIGHT, 0.25);
    }
  // dents and scrapes
  for (let k = 0; k < 14; k++) {
    const x = Math.floor(rnd() * SIDE.width);
    const y = 6 + Math.floor(rnd() * 50);
    const length = 3 + Math.floor(rnd() * 8);
    for (let d = 0; d < length; d++)
      t.set(x + d, y + (d >> 2), k % 2 ? PAINT_LIGHT : PAINT_DARK, 0.5);
  }
  rust(t, rnd, 0.3);
  return t;
}

function drawLid(rnd) {
  const t = new Tile(LID.width, LID.height);
  paint(t, 0, 0, LID.width, LID.height, rnd, false);
  const cx = 31.5;
  const cy = 31.5;
  for (let y = 0; y < LID.height; y++)
    for (let x = 0; x < LID.width; x++) {
      const d = scratchPt.setScalar(x - cx, y - cy).getMagnitude();
      if (d > 29 && d <= 31)
        t.set(x, y, PAINT_LIGHT, 0.9);
      else if (d > 27 && d <= 29)
        t.set(x, y, PAINT_DARK, 0.9);
      else if (d > 21 && d <= 22.6)
        t.set(x, y, PAINT_DARK);
      else if (d > 22.6 && d <= 23.6)
        t.set(x, y, PAINT_LIGHT, 0.5);
    }
  // two bungs
  for (const [bx, by, r] of [[22, 30, 7], [44, 38, 4.5]]) {
    for (let y = 0; y < LID.height; y++)
      for (let x = 0; x < LID.width; x++) {
        const d = scratchPt.setScalar(x - bx, y - by).getMagnitude();
        if (d <= r - 1.5)
          t.set(x, y, mix(PAINT, SHADOW, 0.35));
        else if (d <= r)
          t.set(x, y, PAINT_LIGHT, 0.8);
        else if (d <= r + 1)
          t.set(x, y, SHADOW, 0.8);
      }
    for (let d = -r + 2; d <= r - 2; d++) {
      t.set(bx + d, by, SHADOW);
      t.set(bx, by + d, SHADOW);
    }
  }
  for (const [x, y] of [[8, 8], [55, 8], [8, 55], [55, 55]])
    rivet(t, x, y);
  rust(t, rnd, 0.35);
  return t;
}

function drawChar(rnd) {
  const t = new Tile(CHAR.width, CHAR.height);
  plate(t, 0, 0, CHAR.width, CHAR.height, rnd);
  const sootField = field(rnd, 9);
  const emberField = field(rnd, 5);
  const cx = 31.5;
  const cy = 31.5;
  for (let y = 0; y < CHAR.height; y++)
    for (let x = 0; x < CHAR.width; x++) {
      const d = scratchPt.setScalar(x - cx, y - cy).getMagnitude() / 31.5;
      const n = sootField(x, y);
      const e = emberField(x * 1.4, y * 1.4);
      // Dark carbonized soot core with glowing ember fissures and blistered orange rust around the torn rim
      const soot = [16 + n * 18, 13 + n * 15, 16 + n * 17];
      t.set(x, y, soot, 0.88);
      if (d < 0.72 && e > 0.74)
        t.set(x, y, [218, 86 + (e - 0.74) * 320, 26], 0.82);
      else if (d >= 0.72 && n > 0.52)
        t.set(x, y, mix(PAINT_DARK, soot, 0.45), 0.7);
    }
  rust(t, rnd, 0.42);
  return t;
}

/** The atlas as RGBA pixels, ready to be a texture; its size is a power of two, so it can have mipmaps. */
export function barrelAtlas() {
  const { width, height } = BARREL_ATLAS;
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
  blit(drawSide(mulberry32(31337)), SIDE.x);
  blit(drawLid(mulberry32(4242)), LID.x);
  blit(drawChar(mulberry32(7)), CHAR.x);
  return { name: 'barrel', data, width, height, side: SIDE, lid: LID, char: CHAR };
}

/**
 * Points a RoostR Cylinder's texture coordinates at the barrel atlas: the side wraps round the left half, the caps
 * show the lid. `radialSegments` and `heightSegments` are the ones the cylinder was made with, and the caps are left
 * open at the ends of the index list, so the side comes first.
 */
export function skinBarrel(cylinder, radialSegments, heightSegments = 1) {
  const sideVertices = (radialSegments + 1) * (heightSegments + 1);
  const { uvs } = cylinder;
  const { width } = BARREL_ATLAS;
  const inset = 0.25 / width;
  for (let i = 0; i < uvs.length / 2; i++) {
    const u = uvs[i * 2];
    uvs[i * 2] = i < sideVertices
      ? (SIDE.x + u * SIDE.width) / width + (u === 0 ? inset : u === 1 ? -inset : 0)
      : (LID.x + u * LID.width) / width + (u === 0 ? inset : u === 1 ? -inset : 0);
  }
  return cylinder;
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

/**
 * Builds the 3D ruptured barrel stump & scorched floor crater left behind when a barrel detonates:
 * a blackened blast-scorch ring on the floor, a charred lower drum collar, an ember-sludge interior floor,
 * and 12 jagged peeled-open metal petals flaring outward around the rim.
 */
export function barrelWreckMesh(size = new Vec2(9.5, 26)) {
  const R = size.x;
  const H = size.y;
  const segs = 12;
  const vertices = [];
  const normals = [];
  const uvs = [];

  const sideU0 = 0.002;
  const sideU1 = (SIDE.x + SIDE.width) / BARREL_ATLAS.width - 0.002;
  const charU0 = CHAR.x / BARREL_ATLAS.width + 0.003;
  const charU1 = (CHAR.x + CHAR.width) / BARREL_ATLAS.width - 0.003;
  const charUC = (charU0 + charU1) * 0.5;

  const collarH = H * 0.24;
  const petalHeights = [0.46, 0.34, 0.56, 0.38, 0.52, 0.31, 0.49, 0.36, 0.55, 0.33, 0.48, 0.37];
  const petalFlares = [1.34, 1.16, 1.46, 1.22, 1.38, 1.14, 1.42, 1.2, 1.44, 1.18, 1.36, 1.22];

  for (let i = 0; i < segs; i++) {
    const u0 = i / segs;
    const u1 = (i + 1) / segs;
    const a0 = u0 * Trigo.twopi;
    const a1 = u1 * Trigo.twopi;
    const aMid = (a0 + a1) * 0.5;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const cM = Math.cos(aMid);
    const sM = Math.sin(aMid);

    // 1. Scorched floor crater rim around the barrel base (y = 0.08)
    const scorchR = R * (1.42 + (i % 2) * 0.14);
    const scorchNextR = R * (1.42 + ((i + 1) % 2) * 0.14);
    pushTri(
      vertices,
      normals,
      uvs,
      new Vec3(0, 0.08, 0),
      new Vec3(c1 * scorchNextR, 0.08, s1 * scorchNextR),
      new Vec3(c0 * scorchR, 0.08, s0 * scorchR),
      new Vec2(charUC, 0.5),
      new Vec2(charUC + c1 * 0.11, 0.5 + s1 * 0.42),
      new Vec2(charUC + c0 * 0.11, 0.5 + s0 * 0.42)
    );

    // 2. Charred interior floor plate inside the ruptured stump (y = 1.4)
    const innerFloorR = R * 0.94;
    pushTri(
      vertices,
      normals,
      uvs,
      new Vec3(0, 1.4, 0),
      new Vec3(c1 * innerFloorR, 1.1, s1 * innerFloorR),
      new Vec3(c0 * innerFloorR, 1.1, s0 * innerFloorR),
      new Vec2(charUC, 0.5),
      new Vec2(charUC + c1 * 0.09, 0.5 + s1 * 0.36),
      new Vec2(charUC + c0 * 0.09, 0.5 + s0 * 0.36)
    );

    // 3. Lower drum collar (y = 0 .. collarH): orange/rusted outer skin + charred soot inner wall
    const rBase = R * 0.985;
    const rCollar = R * 1.04;
    const b0 = new Vec3(c0 * rBase, 0, s0 * rBase);
    const b1 = new Vec3(c1 * rBase, 0, s1 * rBase);
    const m0 = new Vec3(c0 * rCollar, collarH, s0 * rCollar);
    const m1 = new Vec3(c1 * rCollar, collarH, s1 * rCollar);
    const su0 = Utils.lerp(sideU0, sideU1, u0);
    const su1 = Utils.lerp(sideU0, sideU1, u1);
    pushQuad(vertices, normals, uvs, b0, b1, m1, m0, su0, 0.68, su1, 0.98);
    pushQuad(vertices, normals, uvs, b1, b0, m0, m1, charU0, 0.55, charU1, 0.95);

    // 4. Jagged peeled-open metal petal flaring outward from the collar rim
    const h0 = H * petalHeights[i];
    const h1 = H * petalHeights[(i + 1) % segs];
    const f0 = R * petalFlares[i];
    const f1 = R * petalFlares[(i + 1) % segs];
    const tipR = R * (petalFlares[i] + 0.16);
    const tipH = H * (petalHeights[i] + 0.09);

    const t0 = new Vec3(c0 * f0, h0, s0 * f0);
    const t1 = new Vec3(c1 * f1, h1, s1 * f1);
    const tip = new Vec3(cM * tipR, tipH, sM * tipR);

    // Outer face of flared petal (shows hazard band / orange paint)
    pushQuad(vertices, normals, uvs, m0, m1, t1, t0, su0, 0.36, su1, 0.68);
    pushTri(vertices, normals, uvs, t0, t1, tip, new Vec2(su0, 0.36), new Vec2(su1, 0.36), new Vec2((su0 + su1) * 0.5, 0.22));

    // Inner face of flared petal (shows blackened soot & glowing embers)
    pushQuad(vertices, normals, uvs, m1, m0, t0, t1, charU0, 0.18, charU1, 0.55);
    pushTri(vertices, normals, uvs, t1, t0, tip, new Vec2(charU1, 0.18), new Vec2(charU0, 0.18), new Vec2(charUC, 0.05));
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D shrapnel parts blasted off a detonating barrel:
 * - `lid`: warped, buckled circular steel drum head with bungs and scorched underside.
 * - `staves`: `BARREL_STAVE_COUNT` curved, twisted orange/hazard metal shell fragments that fly outward and bounce on the floor.
 */
export function barrelShrapnelParts(size = new Vec2(9.5, 26)) {
  const R = size.x;
  const H = size.y;
  const sideU0 = 0.002;
  const sideU1 = (SIDE.x + SIDE.width) / BARREL_ATLAS.width - 0.002;
  const lidU0 = LID.x / BARREL_ATLAS.width + 0.003;
  const lidU1 = (LID.x + LID.width) / BARREL_ATLAS.width - 0.003;
  const lidUC = (lidU0 + lidU1) * 0.5;
  const charU0 = CHAR.x / BARREL_ATLAS.width + 0.003;
  const charU1 = (CHAR.x + CHAR.width) / BARREL_ATLAS.width - 0.003;
  const charUC = (charU0 + charU1) * 0.5;

  // 1. Warped 3D barrel lid (buckled upward along one edge from internal blast pressure)
  const lidVerts = [];
  const lidNorms = [];
  const lidUvs = [];
  const lidSegs = 10;
  const lidR = R * 0.96;
  const lidThick = 1.15;
  for (let i = 0; i < lidSegs; i++) {
    const a0 = (i / lidSegs) * Trigo.twopi;
    const a1 = ((i + 1) / lidSegs) * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const warp0 = Math.max(0, c0) * 1.85;
    const warp1 = Math.max(0, c1) * 1.85;

    const top0 = new Vec3(c0 * lidR, lidThick * 0.5 + warp0, s0 * lidR);
    const top1 = new Vec3(c1 * lidR, lidThick * 0.5 + warp1, s1 * lidR);
    const bot0 = new Vec3(c0 * lidR, -lidThick * 0.5 + warp0, s0 * lidR);
    const bot1 = new Vec3(c1 * lidR, -lidThick * 0.5 + warp1, s1 * lidR);

    pushTri(
      lidVerts,
      lidNorms,
      lidUvs,
      new Vec3(0, lidThick * 0.5 + 0.35, 0),
      top1,
      top0,
      new Vec2(lidUC, 0.5),
      new Vec2(lidUC + c1 * 0.12, 0.5 + s1 * 0.46),
      new Vec2(lidUC + c0 * 0.12, 0.5 + s0 * 0.46)
    );
    pushTri(
      lidVerts,
      lidNorms,
      lidUvs,
      new Vec3(0, -lidThick * 0.5 + 0.35, 0),
      bot0,
      bot1,
      new Vec2(charUC, 0.5),
      new Vec2(charUC + c0 * 0.11, 0.5 + s0 * 0.42),
      new Vec2(charUC + c1 * 0.11, 0.5 + s1 * 0.42)
    );
    pushQuad(lidVerts, lidNorms, lidUvs, bot0, bot1, top1, top0, charU0, 0.2, charU1, 0.8);
  }

  // 2. Curved, twisted 3D torn barrel stave shards (`BARREL_STAVE_COUNT` pieces)
  const staves = [];
  const arcSpan = (Trigo.twopi / BARREL_STAVE_COUNT) * 0.78;
  for (let s = 0; s < BARREL_STAVE_COUNT; s++) {
    const sVerts = [];
    const sNorms = [];
    const sUvs = [];
    const subSegs = 3;
    const staveH = H * (0.36 + (s % 2) * 0.08);
    const halfH = staveH * 0.5;
    const uBase = s / BARREL_STAVE_COUNT;
    const uSpan = 0.78 / BARREL_STAVE_COUNT;

    for (let j = 0; j < subSegs; j++) {
      const f0 = j / subSegs - 0.5;
      const f1 = (j + 1) / subSegs - 0.5;
      const a0 = f0 * arcSpan;
      const a1 = f1 * arcSpan;
      // Local coordinates centered on the stave body at radius ~0 so rotations spin around the shard's own center of mass
      const x0 = Math.sin(a0) * R;
      const z0 = (Math.cos(a0) - 0.92) * R;
      const x1 = Math.sin(a1) * R;
      const z1 = (Math.cos(a1) - 0.92) * R;
      const jagTop0 = halfH * (0.82 + ((s + j) % 2) * 0.32);
      const jagTop1 = halfH * (0.82 + ((s + j + 1) % 2) * 0.32);
      const jagBot0 = -halfH * (0.78 + ((s + j + 1) % 2) * 0.28);
      const jagBot1 = -halfH * (0.78 + ((s + j) % 2) * 0.28);
      const bend0 = f0 * 1.1;
      const bend1 = f1 * 1.1;

      const b0 = new Vec3(x0, jagBot0, z0 + bend0);
      const b1 = new Vec3(x1, jagBot1, z1 + bend1);
      const t0 = new Vec3(x0 * 1.08, jagTop0, z0 + 0.65 + bend0);
      const t1 = new Vec3(x1 * 1.08, jagTop1, z1 + 0.65 + bend1);

      const su0 = Utils.lerp(sideU0, sideU1, uBase + (j / subSegs) * uSpan);
      const su1 = Utils.lerp(sideU0, sideU1, uBase + ((j + 1) / subSegs) * uSpan);
      pushQuad(sVerts, sNorms, sUvs, b0, b1, t1, t0, su0, 0.14, su1, 0.66);
      pushQuad(sVerts, sNorms, sUvs, b1, b0, t0, t1, charU0, 0.2, charU1, 0.8);
    }

    staves.push({
      vertices: new Float32Array(sVerts),
      normals: new Float32Array(sNorms),
      uvs: new Float32Array(sUvs),
    });
  }

  return {
    lid: {
      vertices: new Float32Array(lidVerts),
      normals: new Float32Array(lidNorms),
      uvs: new Float32Array(lidUvs),
    },
    staves,
  };
}

function pushHorizontalSheet(vertices, normals, uvs, cx, y, cz, spanX, spanZ, angle, seed, kind) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const rx = ca * spanX;
  const rz = sa * spanX;
  const fx = -sa * spanZ;
  const fz = ca * spanZ;
  const c0 = new Vec3(cx - rx + fx, y, cz - rz + fz);
  const c1 = new Vec3(cx + rx + fx, y, cz + rz + fz);
  const c2 = new Vec3(cx + rx - fx, y, cz + rz - fz);
  const c3 = new Vec3(cx - rx - fx, y, cz - rz - fz);
  pushQuad(vertices, normals, uvs, c0, c1, c2, c3, seed + 0.02, kind + 0.02, seed + 0.98, kind + 0.98);
}

function pushPlumeQuad(vertices, normals, uvs, cx, lowY, topY, cz, halfSpan, angle, driftX, driftZ, topExpand, seed, kind) {
  const dx = Math.cos(angle) * halfSpan;
  const dz = Math.sin(angle) * halfSpan;
  const tdx = dx * topExpand;
  const tdz = dz * topExpand;
  const b0 = new Vec3(cx - dx, lowY, cz - dz);
  const b1 = new Vec3(cx + dx, lowY, cz + dz);
  const t1 = new Vec3(cx + driftX + tdx, topY, cz + driftZ + tdz);
  const t0 = new Vec3(cx + driftX - tdx, topY, cz + driftZ - tdz);
  pushQuad(vertices, normals, uvs, b0, b1, t1, t0, seed + 0.02, kind + 0.02, seed + 0.98, kind + 0.98);
}

/**
 * Builds the 3D soft-feathered fire & acid-fog-style smoke plume mesh that burns continuously inside a ruptured barrel
 * stump after detonation: horizontal glowing ember/flame sheets inside the stump, crossed vertical & flared peripheral
 * flame plumes, and layered horizontal + crossed vertical drifting smoke plumes modeled on `acidMistBatch`.
 */
export function barrelFireMesh(size = new Vec2(9.5, 26)) {
  const R = size.x;
  const H = size.y;
  const vertices = [];
  const normals = [];
  const uvs = [];

  // 1. Horizontal glowing ember & flame bed sheets inside the ruptured stump (kind = 0)
  pushHorizontalSheet(vertices, normals, uvs, 0, 1.45, 0, R * 0.88, R * 0.88, 0.18, 0, 0);
  pushHorizontalSheet(vertices, normals, uvs, 0.25, 2.85, -0.2, R * 0.82, R * 0.82, 0.96, 1, 0);

  // 2. Central crossed vertical flame plumes rising from the ruptured barrel core (kind = 1)
  const coreAngles = [0.15, 1.19, 2.24];
  const coreHeights = [0.64, 0.56, 0.60];
  for (let i = 0; i < 3; i++) {
    const a = coreAngles[i];
    const drift = (i - 1) * 0.45;
    pushPlumeQuad(
      vertices,
      normals,
      uvs,
      Math.cos(a) * 0.35,
      1.15,
      H * coreHeights[i],
      Math.sin(a) * 0.35,
      R * 0.78,
      a,
      drift,
      -drift * 0.7,
      1.06,
      i,
      1
    );
  }

  // 3. Six peripheral flame tongues licking up around the inner collar rim between the peeled-open petals (kind = 1)
  const tongueHeights = [0.48, 0.40, 0.52, 0.42, 0.50, 0.41];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Trigo.twopi + 0.26;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const ringR = R * 0.46;
    pushPlumeQuad(
      vertices,
      normals,
      uvs,
      ca * ringR,
      1.25,
      H * tongueHeights[i],
      sa * ringR,
      R * 0.48,
      a + Trigo.halfpi * 0.65,
      ca * R * 0.22,
      sa * R * 0.22,
      1.12,
      3 + i,
      1
    );
  }

  // 4. Acid-mist-style drifting smoke: stacked horizontal mist layers + crossed vertical rising smoke plumes (kind = 2)
  const smokeLayerFracs = [0.46, 0.68, 0.92];
  const smokeLayerSpans = [0.92, 1.08, 1.24];
  for (let i = 0; i < 3; i++) {
    const ox = (i - 1) * 0.65;
    const oz = ((i % 2) - 0.5) * 0.75;
    pushHorizontalSheet(
      vertices,
      normals,
      uvs,
      ox,
      H * smokeLayerFracs[i],
      oz,
      R * smokeLayerSpans[i],
      R * smokeLayerSpans[i],
      i * 0.85 + 0.3,
      10 + i,
      2
    );
  }

  const smokePlumeHeights = [1.08, 0.96, 1.16, 1.02];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Trigo.pi + (i % 2) * 0.22 + 0.38;
    const ox = Math.cos(a * 1.7) * R * 0.18;
    const oz = Math.sin(a * 1.7) * R * 0.18;
    const lowY = H * (0.28 + (i % 2) * 0.06);
    const topY = H * smokePlumeHeights[i];
    pushPlumeQuad(
      vertices,
      normals,
      uvs,
      ox,
      lowY,
      topY,
      oz,
      R * (0.88 + (i % 2) * 0.12),
      a,
      Math.cos(a + 0.6) * R * 0.28,
      Math.sin(a + 0.6) * R * 0.28,
      1.26,
      14 + i,
      2
    );
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds a compact 3D soft-feathered flame cluster and acid-fog-style rising smoke wisp for the blown-off barrel lid
 * and scattered metal stave shards.
 */
export function barrelShrapnelFireMesh(size = new Vec2(9.5, 26)) {
  const R = size.x;
  const H = size.y;
  const vertices = [];
  const normals = [];
  const uvs = [];

  // 1. Glowing ember/flame base sheet on the shrapnel shard (kind = 0)
  pushHorizontalSheet(vertices, normals, uvs, 0, 0.28, 0, R * 0.38, R * 0.38, 0.25, 0, 0);

  // 2. Three crossed vertical flame plumes licking up from the scorched shard (kind = 1)
  const flameAngles = [0.2, 1.25, 2.3];
  const flameHeights = [0.28, 0.23, 0.26];
  for (let i = 0; i < 3; i++) {
    const a = flameAngles[i];
    pushPlumeQuad(
      vertices,
      normals,
      uvs,
      Math.cos(a) * 0.2,
      0.12,
      H * flameHeights[i],
      Math.sin(a) * 0.2,
      R * 0.36,
      a,
      Math.cos(a + 0.4) * 0.35,
      Math.sin(a + 0.4) * 0.35,
      1.08,
      i,
      1
    );
  }

  // 3. Acid-mist-style drifting smoke wisp above the shrapnel flame: horizontal mist sheet + 2 crossed plumes (kind = 2)
  pushHorizontalSheet(vertices, normals, uvs, 0.15, H * 0.26, -0.12, R * 0.46, R * 0.46, 0.7, 6, 2);
  for (let i = 0; i < 2; i++) {
    const a = 0.42 + i * Trigo.halfpi;
    pushPlumeQuad(
      vertices,
      normals,
      uvs,
      0.12 * (i === 0 ? 1 : -1),
      H * 0.13,
      H * (0.46 + i * 0.05),
      -0.1 * (i === 0 ? 1 : -1),
      R * 0.44,
      a,
      0.45 * (i === 0 ? 1 : -0.6),
      -0.35 * (i === 0 ? 0.6 : -1),
      1.22,
      7 + i,
      2
    );
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/** Pre-allocates a reusable pose structure for `barrelExplosionPose`. */
export function createBarrelExplosionPose() {
  const staves = [];
  const staveFires = [];
  for (let i = 0; i < BARREL_STAVE_COUNT; i++) {
    staves.push({ pos: new Vec3(), rot: new Vec3() });
    staveFires.push({ pos: new Vec3(), rot: new Vec3(), scale: new Vec3(1, 1, 1) });
  }
  return {
    wreckScale: new Vec3(1, 1, 1),
    wreckRot: new Vec3(0, 0, 0),
    lid: { pos: new Vec3(), rot: new Vec3() },
    staves,
    wreckFire: {
      pos: new Vec3(),
      rot: new Vec3(),
      scale: new Vec3(1, 1, 1),
      heat: 1.05,
      dissolve: 0.2,
      progress: 0.32,
      phase: 0.7,
    },
    lidFire: {
      pos: new Vec3(),
      rot: new Vec3(),
      scale: new Vec3(1, 1, 1),
    },
    staveFires,
    fireColor: new Vec3(1, 0.85, 0.42),
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
    y = endY + Math.sin(u * Trigo.pi) * (peakLift * 0.26);
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
 * Computes the 3D transforms for a detonated barrel's ruptured base, flying lid, and 5 shrapnel staves
 * at `elapsed` seconds after detonation, writing into `target` with zero allocations.
 */
export function barrelExplosionPose(elapsed, seed = 0, target = createBarrelExplosionPose()) {
  const t = Math.max(0, elapsed);

  // 1. Ruptured stump jolt: peels outward during the first 0.18s of detonation, then settles on the floor
  const jolt = t < 0.18 ? Math.sin((t / 0.18) * Trigo.pi) : 0;
  target.wreckScale.setScalar(1 + jolt * 0.18, 1 - jolt * 0.12, 1 + jolt * 0.18);
  target.wreckRot.setScalar(jolt * 0.08 * Math.sin(seed * 3), seed, jolt * 0.08 * Math.cos(seed * 3));

  // 2. Blown-off barrel lid: blasts high toward the ceiling, flips end-over-end, bounces twice, and rests on the floor
  const lidDuration = 0.92;
  const lidAngle = seed * 1.73 + 0.45;
  const lidDist = 24 + ((Math.sin(seed * 5.1) + 1) * 0.5) * 11;
  const lidEndX = Math.cos(lidAngle) * lidDist;
  const lidEndZ = Math.sin(lidAngle) * lidDist;
  writeBallisticArc(
    target.lid.pos,
    target.lid.rot,
    0,
    25.5,
    0,
    lidEndX,
    0.75,
    lidEndZ,
    Trigo.pi * 3.1,
    lidAngle + Trigo.pi * 1.4,
    Trigo.pi * 2.2,
    0.14,
    lidAngle + 0.8,
    -0.12,
    t / lidDuration,
    28
  );

  // 3. Five torn metal staves: blast outward radially in parabolic arcs, bounce across the floor, and settle around the stump
  for (let i = 0; i < BARREL_STAVE_COUNT; i++) {
    const stave = target.staves[i];
    const hash = Math.sin(seed * 2.3 + i * 4.17) * 0.5 + 0.5;
    const angle = seed + (i / BARREL_STAVE_COUNT) * Trigo.twopi + (hash - 0.5) * 0.42;
    const startR = 8.2;
    const dist = 20 + hash * 18 + (i % 2) * 5;
    const duration = 0.68 + hash * 0.24;
    const peakLift = 14 + (1 - hash) * 13;
    const dirSign = i % 2 === 0 ? 1 : -1;
    writeBallisticArc(
      stave.pos,
      stave.rot,
      Math.cos(angle) * startR,
      15.5 + (i % 3) * 1.8,
      Math.sin(angle) * startR,
      Math.cos(angle) * dist,
      0.85,
      Math.sin(angle) * dist,
      dirSign * Trigo.pi * (2.4 + hash),
      angle + dirSign * 1.8,
      -dirSign * Trigo.pi * 1.9,
      Trigo.halfpi - 0.16,
      angle + 0.4 * dirSign,
      (hash - 0.5) * 0.28,
      t / duration,
      peakLift
    );
  }

  // 4. Persistent post-detonation fire inside the ruptured stump & smaller flame licks on the scattered shrapnel
  const flare = t < 0.6 ? (1 - t / 0.6) * 0.24 : 0;
  const waveA = Math.sin(t * 2.4 + seed * 1.9);
  const waveB = Math.cos(t * 3.5 - seed * 2.7);
  const waveC = Math.sin(t * 1.6 + seed * 0.8);
  const flicker = 0.5 * waveA + 0.32 * waveB + 0.18 * waveC;

  if (target.wreckFire) {
    const wf = target.wreckFire;
    wf.pos.setScalar(
      0.08 * Math.sin(t * 1.9 + seed),
      0.05 + 0.04 * Math.abs(waveA),
      0.08 * Math.cos(t * 1.7 - seed)
    );
    wf.rot.setScalar(
      0.015 * Math.sin(t * 2.1 + seed * 1.3),
      seed * 1.3 + 0.035 * waveC + 0.02 * waveA,
      0.015 * Math.cos(t * 1.8 - seed * 1.1)
    );
    const sx = 0.98 + flare * 0.16 + 0.025 * waveB - 0.015 * waveA;
    const sy = 1.0 + flare * 0.26 + 0.05 * flicker;
    const sz = 0.98 + flare * 0.16 - 0.025 * waveB + 0.015 * waveA;
    wf.scale.setScalar(sx, sy, sz);
    wf.heat = 1.06 + flare * 0.22 + 0.06 * flicker;
    wf.dissolve = 0.21 - flare * 0.05 - 0.015 * waveA;
    wf.progress = 0.34 + 0.06 * Math.sin(t * 1.8 + seed);
    wf.phase = (seed * 1.7 + t * 0.45) % Trigo.twopi;
  }

  if (target.fireColor) {
    const glow = Utils.clamp(0.5 + 0.5 * flicker + flare * 0.5, 0, 1);
    target.fireColor.setScalar(
      0.98 + 0.06 * glow,
      0.76 + 0.14 * glow,
      0.34 + 0.12 * glow
    );
  }

  if (target.lidFire) {
    const lf = target.lidFire;
    const lidWaveA = Math.sin(t * 2.7 + seed * 3.1 + 1.2);
    const lidWaveB = Math.cos(t * 3.8 - seed * 1.4);
    lf.pos.setScalar(target.lid.pos.x, target.lid.pos.y + 0.22, target.lid.pos.z);
    lf.rot.setScalar(
      0.02 * lidWaveA,
      seed * 2.1 + 0.04 * lidWaveB + 0.025 * lidWaveA,
      0.02 * lidWaveB
    );
    const lsXZ = 0.78 + flare * 0.14 + 0.025 * lidWaveB;
    const lsY = 0.86 + flare * 0.22 + 0.05 * lidWaveA;
    lf.scale.setScalar(lsXZ, lsY, lsXZ);
  }

  if (target.staveFires) {
    for (let i = 0; i < BARREL_STAVE_COUNT; i++) {
      const sf = target.staveFires[i];
      if (!sf)
        continue;
      const sp = target.staves[i].pos;
      const pOff = seed * 2.3 + (i + 1) * 1.93;
      const swA = Math.sin(t * (2.5 + i * 0.22) + pOff);
      const swB = Math.cos(t * (3.6 + i * 0.18) - pOff * 1.3);
      sf.pos.setScalar(sp.x, sp.y + 0.18, sp.z);
      sf.rot.setScalar(
        0.02 * swA,
        pOff + 0.04 * swB + 0.025 * swA,
        0.02 * swB
      );
      const baseScale = 0.66 + (i % 2) * 0.1;
      const sXZ = baseScale + flare * 0.12 + 0.025 * swB;
      const sY = baseScale * 1.08 + flare * 0.18 + 0.05 * swA;
      sf.scale.setScalar(sXZ, sY, sXZ);
    }
  }

  return target;
}

/**
 * Builds the 3D multi-lobed glowing green acid puddle on the floor underneath and in front of a horizontal
 * leaking barrel (`'z'`), complete with a raised outer meniscus rim and satellite splatter pools.
 */
export function barrelAcidPuddleMesh(size = new Vec2(9.5, 26)) {
  const R = size.x;
  const H = size.y;
  const vertices = [];
  const normals = [];
  const uvs = [];

  const segs = 16;
  const centerX = 0;
  const centerZ = H * 0.36;
  const innerY = 0.22;
  const rimY = 0.18;
  const floorY = 0.12;
  const lobeRadii = [
    1.04, 1.16, 1.28, 1.18,
    0.96, 1.12, 1.24, 1.08,
    0.88, 0.94, 1.06, 0.92,
    0.86, 1.02, 1.18, 1.10,
  ];
  const radiusX = R * 1.65;
  const radiusZ = H * 0.72;
  const centerTop = new Vec3(centerX, innerY, centerZ);
  const centerUv = new Vec2(0.5, 0.5);

  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % segs;
    const a0 = (i / segs) * Trigo.twopi;
    const a1 = (next / segs) * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const l0 = lobeRadii[i];
    const l1 = lobeRadii[next];

    const x0 = centerX + c0 * radiusX * l0;
    const z0 = centerZ + s0 * radiusZ * l0;
    const x1 = centerX + c1 * radiusX * l1;
    const z1 = centerZ + s1 * radiusZ * l1;

    const ox0 = centerX + c0 * (radiusX * l0 + 1.35);
    const oz0 = centerZ + s0 * (radiusZ * l0 + 1.35);
    const ox1 = centerX + c1 * (radiusX * l1 + 1.35);
    const oz1 = centerZ + s1 * (radiusZ * l1 + 1.35);

    const p0 = new Vec3(x0, rimY, z0);
    const p1 = new Vec3(x1, rimY, z1);
    const e0 = new Vec3(ox0, floorY, oz0);
    const e1 = new Vec3(ox1, floorY, oz1);

    pushTri(
      vertices,
      normals,
      uvs,
      centerTop,
      p1,
      p0,
      centerUv,
      new Vec2(0.5 + c1 * 0.44 * l1, 0.5 + s1 * 0.44 * l1),
      new Vec2(0.5 + c0 * 0.44 * l0, 0.5 + s0 * 0.44 * l0)
    );
    pushQuad(vertices, normals, uvs, p0, p1, e1, e0, i / segs, 0.15, (i + 1) / segs, 0.85);
  }

  // Satellite acid splatter droplets around the main pool
  const droplets = [
    new Vec3(-R * 1.48, H * 0.78, 3.8),
    new Vec3(R * 1.36, H * 0.86, 3.2),
    new Vec3(-R * 0.35, H * 1.18, 2.9),
  ];
  const dropSegs = 8;
  for (let d = 0; d < droplets.length; d++) {
    const drop = droplets[d];
    const dx = drop.x;
    const dz = drop.y;
    const dr = drop.z;
    const dropCenter = new Vec3(dx, 0.17, dz);
    for (let i = 0; i < dropSegs; i++) {
      const a0 = (i / dropSegs) * Trigo.twopi;
      const a1 = ((i + 1) / dropSegs) * Trigo.twopi;
      const c0 = Math.cos(a0);
      const s0 = Math.sin(a0);
      const c1 = Math.cos(a1);
      const s1 = Math.sin(a1);
      pushTri(
        vertices,
        normals,
        uvs,
        dropCenter,
        new Vec3(dx + c1 * dr, floorY, dz + s1 * dr),
        new Vec3(dx + c0 * dr, floorY, dz + s0 * dr),
        centerUv,
        new Vec2(0.5 + c1 * 0.25, 0.5 + s1 * 0.25),
        new Vec2(0.5 + c0 * 0.25, 0.5 + s0 * 0.25)
      );
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D gushing/dripping green acid streams pouring from a horizontal barrel's lower front bung and
 * corroded belly seam down into the floor puddle.
 */
export function barrelAcidStreamMesh(size = new Vec2(9.5, 26)) {
  const R = size.x;
  const H = size.y;
  const vertices = [];
  const normals = [];
  const uvs = [];

  const buildStreamTube = (topX, topY, topZ, midX, midY, midZ, botX, botY, botZ, rTop, rMid, rBot) => {
    const radial = 6;
    for (let i = 0; i < radial; i++) {
      const u0 = i / radial;
      const u1 = (i + 1) / radial;
      const a0 = u0 * Trigo.twopi;
      const a1 = u1 * Trigo.twopi;
      const c0 = Math.cos(a0);
      const s0 = Math.sin(a0);
      const c1 = Math.cos(a1);
      const s1 = Math.sin(a1);

      const t0 = new Vec3(topX + c0 * rTop, topY, topZ + s0 * rTop);
      const t1 = new Vec3(topX + c1 * rTop, topY, topZ + s1 * rTop);
      const m0 = new Vec3(midX + c0 * rMid, midY, midZ + s0 * rMid);
      const m1 = new Vec3(midX + c1 * rMid, midY, midZ + s1 * rMid);
      const b0 = new Vec3(botX + c0 * rBot, botY, botZ + s0 * rBot);
      const b1 = new Vec3(botX + c1 * rBot, botY, botZ + s1 * rBot);

      pushQuad(vertices, normals, uvs, m0, m1, t1, t0, u0, 0.05, u1, 0.5);
      pushQuad(vertices, normals, uvs, b0, b1, m1, m0, u0, 0.5, u1, 0.95);
    }
  };

  // 1. Primary gushing stream pouring from the lower bung on the front lid (+Z end)
  buildStreamTube(
    -R * 0.18, R * 0.62, H * 0.48,
    -R * 0.2, R * 0.34, H * 0.57,
    -R * 0.22, 0.15, H * 0.63,
    1.15, 0.92, 2.25
  );

  // 2. Secondary trickle dripping from the corroded lower lid rim
  buildStreamTube(
    R * 0.24, R * 0.78, H * 0.47,
    R * 0.26, R * 0.42, H * 0.52,
    R * 0.28, 0.15, H * 0.56,
    0.72, 0.55, 1.45
  );

  // 3. Weeping rivulet running down the corroded side seam of the horizontal drum
  buildStreamTube(
    R * 0.86, R * 0.74, H * 0.12,
    R * 0.94, R * 0.38, H * 0.16,
    R * 0.88, 0.15, H * 0.2,
    0.68, 0.82, 1.65
  );

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}
