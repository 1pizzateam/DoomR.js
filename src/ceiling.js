import { AmbientLight, MAX_LIGHTS, PointLight, Vec2, Vec3 } from '@1pizzateam/roostr';
import { Trigo, Utils } from '@1pizzateam/spock';
import { mulberry32 } from './rng.js';
import { GLOW, LIGHT, LIGHT_GLSL, METAL, mix, periodicField, plate, rivet, SHADOW, Tile } from './floor.js';
import { CEILING, DOOR, FLOOR, PILLAR, TILE } from './level.js';
import { SOLID_ALPHA } from './quads.js';

const scratchPt = new Vec2();
const scratchPixel = new Vec2();
const scratchDir = new Vec3();
const scratchNormal = new Vec3();

/**
 * The ceiling of an old space base: deep recessed coffer bays, heavy I-beam girders, X-braced space-frame trusses,
 * cylindrical HVAC ducts, exhaust turbine shafts, overhead coolant pipe manifolds, maintenance hatches, and recessed
 * fluorescent troffers, drawn as an 8-cell 512x64 pixel-art atlas. Unlike the floor and walls, the ceiling uses its own
 * shader without brown floor rust so it reads unmistakably as a dark overhead industrial superstructure.
 */

export const CEILING_CELLS = {
  panels: 0,
  ribs: 1,
  duct: 2,
  grille: 3,
  light: 4,
  truss: 5,
  pipes: 6,
  hatch: 7,
};
export const CEILING_CELL_COUNT = 8;
export const CEILING_LIGHT_COLOR = new Vec3(0.85, 0.96, 1.12);
export const CEILING_AMBIENT_COLOR = new Vec3(0.45, 0.5, 0.58);
export const CEILING_LIGHT_ATTENUATION = new Vec3(1, 0.0032, 0.000018);
export const CEILING_LIGHT_RADIUS = TILE * 11;
export const MUZZLE_LIGHT_COLOR = new Vec3(3.6, 2.35, 0.95);
export const MUZZLE_LIGHT_ATTENUATION = new Vec3(1, 0.014, 0.0012);
export const ROCKET_LIGHT_COLOR = new Vec3(1.48, 0.86, 0.28);
export const FIREBALL_LIGHT_COLOR = new Vec3(1.38, 0.44, 0.22);
export const BOOM_LIGHT_COLOR = new Vec3(1.75, 0.96, 0.34);
export const TELEPORT_LIGHT_COLOR = new Vec3(0.36, 1.48, 1.05);
export const DYNAMIC_LIGHT_ATTENUATION = new Vec3(1, 0.0052, 0.000042);
export const DYNAMIC_LIGHT_RADIUS = TILE * 9;
export const MAX_DYNAMIC_LIGHTS = 4;
const SIZE = 64;
const VOID = [5, 7, 13];
const COFFER = [11, 15, 25];
const GIRDER = [24, 32, 48];
const FLANGE = [54, 70, 98];
const WARM = [214, 232, 255];
const CYAN_LED = [68, 188, 245];

/**
 * Heavy load-bearing perimeter I-beam girder framing a deep sunken 50x50 overhead coffer cavity.
 * Adjacent tiles meet flange-to-flange to form continuous overhead box beams with recessed bays between them.
 */
function cofferBase(t, rnd, cavityColor = COFFER) {
  // Outer structural girder frame (0..63)
  plate(t, 0, 0, SIZE, SIZE, rnd, GIRDER);
  for (let i = 0; i < SIZE; i++) {
    t.set(i, 0, VOID, 0.9);
    t.set(0, i, VOID, 0.9);
    t.set(i, SIZE - 1, VOID, 0.9);
    t.set(SIZE - 1, i, VOID, 0.9);
    t.set(i, 2, FLANGE, 0.55);
    t.set(2, i, FLANGE, 0.55);
    t.set(i, SIZE - 3, SHADOW, 0.75);
    t.set(SIZE - 3, i, SHADOW, 0.75);
  }

  // Deep stepped coffer recess (6..57)
  t.rect(6, 6, 52, 52, VOID, 0.95);
  for (let y = 8; y < 56; y++)
    for (let x = 8; x < 56; x++) {
      const grain = (rnd() - 0.5) * 4;
      t.set(x, y, [cavityColor[0] + grain, cavityColor[1] + grain, cavityColor[2] + grain * 1.2]);
    }
  // Inner bevel of the sunken coffer lip
  for (let i = 6; i < 58; i++) {
    t.set(i, 6, VOID);
    t.set(i, 7, VOID, 0.85);
    t.set(6, i, VOID);
    t.set(7, i, VOID, 0.85);
    t.set(i, 57, FLANGE, 0.45);
    t.set(57, i, FLANGE, 0.45);
  }

  // Corner gusset plates and structural bolts on the perimeter girder
  for (const [gx, gy] of [[2, 2], [54, 2], [2, 54], [54, 54]]) {
    t.rect(gx, gy, 8, 8, mix(GIRDER, FLANGE, 0.25), 0.85);
    rivet(t, gx + 2, gy + 2);
  }
}

/** Cell 0: Twin recessed coffered acoustic/cooling bays separated by a central I-beam rib. */
function drawPanels(t, rnd) {
  cofferBase(t, rnd, COFFER);
  // Central divider girder across y = 29..34
  t.rect(6, 28, 52, 8, VOID, 0.9);
  t.rect(6, 29, 52, 6, GIRDER, 0.95);
  for (let x = 6; x < 58; x++) {
    t.set(x, 30, FLANGE, 0.65);
    t.set(x, 34, VOID, 0.9);
  }
  for (const x of [12, 31, 50])
    rivet(t, x, 31);

  // Fine recessed acoustic micro-slats inside both upper and lower coffer bays
  for (const [y0, y1] of [[10, 26], [38, 54]]) {
    t.rect(10, y0, 44, y1 - y0, VOID, 0.7);
    for (let y = y0 + 1; y < y1 - 1; y += 3)
      for (let x = 12; x < 52; x++) {
        t.set(x, y, mix(COFFER, FLANGE, 0.28), 0.85);
        t.set(x, y + 1, VOID, 0.92);
      }
    // Vertical stiffener strap down the middle of the slats
    t.rect(30, y0, 4, y1 - y0, GIRDER, 0.9);
    for (let y = y0; y < y1; y++)
      t.set(31, y, FLANGE, 0.4);
  }
}

/** Cell 1: Heavy open-plenum structural rafters with deep shadow voids and lateral tie-rods. */
function drawRibs(t, rnd) {
  cofferBase(t, rnd, VOID);
  // Two horizontal tie-rods deep inside the plenum
  for (const ty of [18, 45]) {
    t.rect(8, ty - 1, 48, 4, mix(GIRDER, SHADOW, 0.35), 0.9);
    for (let x = 8; x < 56; x++)
      t.set(x, ty, FLANGE, 0.35);
  }
  // Four heavy vertical I-beam rafters spanning the bay
  for (const x of [11, 24, 37, 50]) {
    t.rect(x - 2, 4, 7, 56, VOID, 0.85);
    t.rect(x - 1, 4, 5, 56, GIRDER, 0.96);
    for (let y = 4; y < 60; y++) {
      t.set(x, y, FLANGE, 0.72);
      t.set(x + 1, y, mix(GIRDER, FLANGE, 0.4), 0.9);
      t.set(x + 3, y, VOID, 0.95);
    }
    for (const y of [10, 31, 51]) {
      t.rect(x - 2, y, 7, 3, mix(GIRDER, FLANGE, 0.55));
      t.rect(x - 2, y + 3, 7, 1, VOID);
    }
  }
}

/** Cell 2: Overhead cylindrical HVAC ventilation trunk with bolted flange collars and side conduits. */
function drawDuct(t, rnd) {
  cofferBase(t, rnd, VOID);
  // Twin thin armored conduit pipes alongside the main trunk
  for (const py of [10, 51])
    for (let x = 6; x < 58; x++) {
      t.set(x, py, VOID);
      t.set(x, py + 1, FLANGE, 0.65);
      t.set(x, py + 2, GIRDER, 0.9);
      t.set(x, py + 3, VOID);
    }
  // Main cylindrical overhead HVAC trunk (y = 17..47)
  for (let y = 17; y < 47; y++) {
    const norm = (y - 31.5) / 15;
    const cyl = Math.sqrt(Math.max(0, 1 - norm * norm));
    const col = mix(VOID, mix(GIRDER, FLANGE, 0.65), 0.18 + cyl * 0.78);
    for (let x = 4; x < 60; x++)
      t.set(x, y, col, 0.98);
  }
  // Longitudinal lock-seam along the crown of the duct
  for (let x = 4; x < 60; x++) {
    t.set(x, 31, FLANGE, 0.6);
    t.set(x, 32, VOID, 0.75);
  }
  // Heavy bolted flange collars strapping the duct to the ceiling frame
  for (const x of [12, 30, 48]) {
    t.rect(x - 1, 15, 6, 34, VOID, 0.85);
    t.rect(x, 15, 4, 34, mix(GIRDER, FLANGE, 0.52));
    t.rect(x, 15, 1, 34, FLANGE, 0.8);
    t.rect(x + 3, 15, 1, 34, VOID, 0.9);
    rivet(t, x + 1, 19);
    rivet(t, x + 1, 43);
  }
}

/** Cell 3: Recessed octagonal exhaust fan turbine & armored louver grille. */
function drawGrille(t, rnd) {
  cofferBase(t, rnd, COFFER);
  const cx = 31.5;
  const cy = 31.5;
  // Deep circular/octagonal exhaust well with dark fan blades visible inside
  for (let y = 11; y < 53; y++)
    for (let x = 11; x < 53; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = scratchPt.setScalar(dx, dy).getMagnitude();
      if (r < 20.5) {
        if (r > 18.2)
          t.set(x, y, mix(GIRDER, FLANGE, 0.45), 0.95);
        else if (r < 5.2)
          t.set(x, y, mix(GIRDER, FLANGE, 0.35), 0.95);
        else {
          const angle = Math.atan2(dy, dx) + r * 0.08;
          const blade = Math.sin(angle * 6) > 0.15;
          t.set(x, y, blade ? mix(COFFER, GIRDER, 0.55) : VOID, 0.96);
        }
      }
    }
  // Heavy protective grating bars across the turbine well
  for (let x = 14; x <= 50; x += 6) {
    t.rect(x, 12, 2, 40, mix(GIRDER, FLANGE, 0.45), 0.9);
    t.rect(x + 2, 12, 1, 40, VOID, 0.85);
  }
  t.rect(12, 30, 40, 3, GIRDER, 0.92);
  for (let x = 12; x < 52; x++)
    t.set(x, 30, FLANGE, 0.65);
  rivet(t, 30, 30);
}

/** Cell 4: Recessed industrial fluorescent troffer with twin high-output tubes and louver baffles. */
function drawLight(t, rnd) {
  cofferBase(t, rnd, COFFER);
  // Outer recessed troffer housing
  t.rect(6, 16, 52, 32, VOID, 0.96);
  for (let x = 6; x < 58; x++) {
    t.set(x, 16, VOID);
    t.set(x, 17, FLANGE, 0.6);
    t.set(x, 46, FLANGE, 0.6);
    t.set(x, 47, VOID);
  }
  // Polished parabolic reflector bed and twin bright fluorescent tubes
  for (let y = 19; y < 45; y++)
    for (let x = 9; x < 55; x++) {
      const dTube1 = Math.abs(y - 25.5);
      const dTube2 = Math.abs(y - 37.5);
      const dCenter = Math.abs(y - 31.5);
      const tube = Math.max(0, 1 - Math.min(dTube1, dTube2) / 5.2);
      const spine = Math.max(0, 1 - dCenter / 3.5) * 0.85;
      const glow = Math.max(tube, spine);
      t.set(x, y, mix(GLOW, WARM, 0.45 + 0.52 * glow), 0.72 + 0.28 * glow);
    }
  // Cross louver baffles dividing the troffer into 4 bays
  for (const x of [19, 31, 43]) {
    t.rect(x, 18, 2, 28, GIRDER, 0.75);
    t.rect(x, 18, 1, 28, FLANGE, 0.55);
  }
}

/** Cell 5: Diagonal X-braced space-frame truss over a deep plenum cavity. */
function drawTruss(t, rnd) {
  cofferBase(t, rnd, VOID);
  // Background cable bundle running across the dark plenum
  for (let x = 8; x < 56; x++) {
    t.set(x, 30, GIRDER, 0.75);
    t.set(x, 31, FLANGE, 0.4);
    t.set(x, 33, GIRDER, 0.75);
  }
  // Diagonal X-brace struts from corner to corner
  for (let y = 8; y < 56; y++)
    for (let x = 8; x < 56; x++) {
      const d1 = Math.abs(x - y);
      const d2 = Math.abs(x - (63 - y));
      const d = Math.min(d1, d2);
      if (d <= 3.2) {
        const edge = d < 1.2 ? 0.75 : d < 2.2 ? 0.45 : 0.1;
        t.set(x, y, mix(GIRDER, FLANGE, edge), 0.95);
      } else if (d <= 4.5)
        t.set(x, y, VOID, 0.9);
    }
  // Central bolted gusset plate where the X-struts cross
  t.rect(25, 25, 14, 14, VOID, 0.9);
  t.rect(26, 26, 12, 12, mix(GIRDER, FLANGE, 0.35), 0.95);
  for (let i = 26; i < 38; i++) {
    t.set(i, 26, FLANGE, 0.8);
    t.set(26, i, FLANGE, 0.8);
    t.set(i, 37, VOID, 0.9);
    t.set(37, i, VOID, 0.9);
  }
  for (const [rx, ry] of [[28, 28], [34, 28], [28, 34], [34, 34]])
    rivet(t, rx, ry);
}

/** Cell 6: Overhead coolant pipe manifold with clamp brackets and cyan telemetry gauge. */
function drawPipes(t, rnd) {
  cofferBase(t, rnd, COFFER);
  t.rect(10, 10, 44, 44, VOID, 0.82);
  // Three parallel overhead pipes running along X
  for (const [yc, rad] of [[17, 4], [31, 6], [46, 4]])
    for (let dy = -rad; dy <= rad; dy++) {
      const cyl = Math.sqrt(Math.max(0, 1 - (dy / (rad + 0.5)) ** 2));
      const col = mix(VOID, FLANGE, 0.2 + cyl * 0.72);
      for (let x = 6; x < 58; x++)
        t.set(x, yc + dy, col, 0.96);
    }
  // Vertical cross-over manifold box & pipe clamps
  for (const x of [16, 46]) {
    t.rect(x, 11, 4, 42, mix(GIRDER, FLANGE, 0.48), 0.95);
    t.rect(x, 11, 1, 42, FLANGE, 0.75);
    t.rect(x + 3, 11, 1, 42, VOID, 0.9);
  }
  t.rect(27, 22, 10, 18, GIRDER, 0.95);
  for (let i = 0; i < 10; i++) {
    t.set(27 + i, 22, FLANGE, 0.75);
    t.set(27 + i, 39, VOID, 0.9);
  }
  // Small cold-cyan pressure indicator on the manifold
  t.rect(30, 29, 4, 4, CYAN_LED, 0.9);
}

/** Cell 7: Recessed octagonal overhead service hatch with dog-clamps and status beacon. */
function drawHatch(t, rnd) {
  cofferBase(t, rnd, COFFER);
  t.rect(11, 11, 42, 42, VOID, 0.9);
  t.rect(13, 13, 38, 38, mix(COFFER, GIRDER, 0.65), 0.96);
  for (let i = 13; i < 51; i++) {
    t.set(i, 13, FLANGE, 0.7);
    t.set(13, i, FLANGE, 0.7);
    t.set(i, 50, VOID, 0.9);
    t.set(50, i, VOID, 0.9);
  }
  // Reinforcement cross-ribs and central lock boss
  t.rect(16, 30, 32, 4, GIRDER, 0.9);
  t.rect(30, 16, 4, 32, GIRDER, 0.9);
  t.rect(26, 26, 12, 12, mix(GIRDER, FLANGE, 0.4), 0.95);
  // Four heavy dog-clamps on the hatch edges
  for (const [cx, cy] of [[29, 12], [29, 48], [12, 29], [48, 29]])
    t.rect(cx, cy, 6, 4, FLANGE, 0.8);
  // Twin cyan status LEDs on the hatch lock
  t.rect(29, 31, 2, 2, CYAN_LED, 0.92);
  t.rect(33, 31, 2, 2, CYAN_LED, 0.92);
}

const DRAW = [drawPanels, drawRibs, drawDuct, drawGrille, drawLight, drawTruss, drawPipes, drawHatch];

/** The atlas as RGBA pixels, ready to be a texture; its size is a power of two, so it can have mipmaps. */
export function ceilingAtlas() {
  const width = SIZE * 8;
  const data = new Uint8Array(width * SIZE * 4);
  DRAW.forEach((draw, cell) => {
    const t = new Tile(SIZE, SIZE);
    draw(t, mulberry32(4400 + cell * 7919));
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 3;
        const o = (y * width + cell * SIZE + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(t.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name: 'ceiling', data, width, height: SIZE, cell: SIZE, frames: 8 };
}

export function ceilingCellUv(cell) {
  const inset = 0.25 / (SIZE * 8);
  return [cell / 8 + inset, 0, (cell + 1) / 8 - inset, 1];
}

/** Which cell hangs over a tile: light fixtures spaced on a wide 5x4 grid, and structural bays/ducts/trusses across the rest. */
export function ceilingCellFor(x, y) {
  if (x % 5 === 2 && y % 4 === 3)
    return CEILING_CELLS.light;
  let h = Math.imul(x * 73856093 ^ y * 19349663 ^ 5, 2654435761);
  h ^= h >>> 15;
  const r = ((Math.imul(h, 2246822519) >>> 0) % 1000) / 1000;
  if (r < 0.26)
    return CEILING_CELLS.panels;
  if (r < 0.44)
    return CEILING_CELLS.ribs;
  if (r < 0.6)
    return CEILING_CELLS.truss;
  if (r < 0.74)
    return CEILING_CELLS.duct;
  if (r < 0.86)
    return CEILING_CELLS.pipes;
  if (r < 0.94)
    return CEILING_CELLS.grille;
  return CEILING_CELLS.hatch;
}

/**
 * Dedicated fragment shader for the ceiling: unlike the floor and walls, it never applies brown floor rust puddles.
 * Instead it deepens the recessed overhead coffer cavities, shades girder seams with dark industrial soot, and keeps
 * the fluorescent light diffusers and cyan status beacons crisp and self-lit.
 */
export const CEILING_FRAGMENT = `
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

${LIGHT_GLSL}

void main(void) {
  if (uHasFog == 1 && vDepth >= uFogFar) {
    gl_FragColor = vec4(uFogColor, ${SOLID_ALPHA});
    return;
  }
  vec3 tex = texture2D(uSampler, vTextureCoord).rgb;

  // Fluorescent diffusers and cyan status beacons have strong blue/cyan luminance and stay self-lit
  float lit = smoothstep(0.10, 0.30, tex.b - tex.r * 0.65);

  // Subtle coffer-grid ambient occlusion at 64-unit tile girder seams and recessed interior cavities
  vec2 tileUv = fract(vWorld / 64.0);
  vec2 border = min(tileUv, 1.0 - tileUv);
  float edgeGirder = 1.0 - smoothstep(0.0, 0.11, min(border.x, border.y));
  float recessWell = smoothstep(0.09, 0.18, min(border.x, border.y));

  // Cool dark gunmetal overhead grading so the ceiling stays visually distinct from the warm rusted floor and walls
  vec3 overheadTint = mix(vec3(0.76, 0.84, 0.98), vec3(0.92, 0.97, 1.08), edgeGirder);
  vec3 shaded = tex * mix(overheadTint * (1.0 - 0.18 * recessWell), vec3(1.06, 1.08, 1.12), lit);

  vec3 color = shaded * uMaterialDiffuse * surfaceLight(vWorldPos, lit * 0.92);
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA});
}
`;

/**
 * Every ceiling tile with a light fixture texture (`CEILING_CELLS.light`) over a roofed floor or doorway tile gets a 3D
 * light fixture entry positioned just beneath the ceiling diffuser.
 */
export function ceilingLightFixtures(level) {
  const fixtures = [];
  const lightY = CEILING - 2;
  for (let ty = 0; ty < level.rowCount; ty++)
    for (let tx = 0; tx < level.width; tx++) {
      const idx = ty * level.width + tx;
      if ((level.kind[idx] !== FLOOR && level.kind[idx] !== DOOR && level.kind[idx] !== PILLAR && !level.diag[idx]) || level.arena?.has(idx))
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
    const light = new PointLight({
      position: new Vec3(0, -9999, 0),
      diffuse: new Vec3(0, 0, 0),
      constantAttenuation: CEILING_LIGHT_ATTENUATION.x,
      linearAttenuation: CEILING_LIGHT_ATTENUATION.y,
      quadraticAttenuation: CEILING_LIGHT_ATTENUATION.z,
    });
    if (typeof scene.addLight === 'function')
      scene.addLight(light);
    pointLights.push(light);
  }
  return { ambient, pointLights };
}

/**
 * Gathers transient dynamic point lights from weapon muzzle flashes, flying rockets/fireballs,
 * barrel/rocket detonations, teleporter plasma bursts, and burning barrels near `cameraPos`.
 */
export function collectDynamicLights(game, cameraPos, time = 0, maxRadius = Infinity, fog = null) {
  if (!game)
    return [];
  const radius = Math.min(DYNAMIC_LIGHT_RADIUS, maxRadius);
  const maxDistSq = radius * radius;
  const candidates = [];
  const player = game.player;

  if (player && (player.flash ?? 0) > 0 && game.state !== 'dead' && game.state !== 'title') {
    const weapon = player.weapon ?? 'shotgun';
    if (weapon !== 'fist' && weapon !== 'knife' && weapon !== 'chainsaw') {
      const flashRatio = Math.min(1, player.flash / 0.12);
      const mult = weapon === 'rocket' ? 1.18 : weapon === 'chaingun' ? 0.92 : 1.02;
      const mx = player.pos.x + Math.cos(player.angle) * 24;
      const my = (player.eye ?? 28) - 4;
      const mz = player.pos.y + Math.sin(player.angle) * 24;
      const position = new Vec3(mx, my, mz);
      candidates.push({
        kind: 'muzzle',
        position,
        color: MUZZLE_LIGHT_COLOR,
        strength: flashRatio * mult,
        attenuation: MUZZLE_LIGHT_ATTENUATION,
        sortKey: -1000,
      });
    }
  }

  if (Array.isArray(game.shots))
    for (let i = 0; i < game.shots.length; i++) {
      const shot = game.shots[i];
      if (fog && !fog.canSeeNear(shot.pos))
        continue;
      const position = new Vec3(shot.pos.x, 24, shot.pos.y);
      const distSq = cameraPos ? cameraPos.getDistance(position, true) : 0;
      if (distSq > maxDistSq)
        continue;
      const isRocket = shot.kind === 'rocket';
      const flicker = 0.92 + 0.08 * Math.sin(time * 32 + i * 1.9);
      const fade = 1 - 0.35 * (distSq / maxDistSq);
      candidates.push({
        kind: isRocket ? 'rocket' : 'fireball',
        position,
        color: isRocket ? ROCKET_LIGHT_COLOR : FIREBALL_LIGHT_COLOR,
        strength: (isRocket ? 1.15 : 0.95) * flicker * fade,
        attenuation: DYNAMIC_LIGHT_ATTENUATION,
        sortKey: distSq * (isRocket ? 0.65 : 0.85),
      });
    }

  if (Array.isArray(game.effects))
    for (let i = 0; i < game.effects.length; i++) {
      const effect = game.effects[i];
      if (effect.age >= effect.life || effect.type === 'spark')
        continue;
      if (fog && !fog.canSeeNear(scratchPt.setScalar(effect.x, effect.y), effect.type === 'boom' ? 2 : 1))
        continue;
      const ey = effect.type === 'boom' ? 20 : (effect.z ?? 24);
      const position = new Vec3(effect.x, ey, effect.y);
      const distSq = cameraPos ? cameraPos.getDistance(position, true) : 0;
      if (distSq > maxDistSq)
        continue;
      const lifeRatio = Math.max(0, 1 - effect.age / Math.max(0.001, effect.life));
      const fade = 1 - 0.3 * (distSq / maxDistSq);
      const isBoom = effect.type === 'boom';
      const isTeleport = effect.type === 'teleport';
      const color = isBoom
        ? BOOM_LIGHT_COLOR
        : isTeleport
          ? TELEPORT_LIGHT_COLOR
          : FIREBALL_LIGHT_COLOR;
      const baseStrength = isBoom ? 1.38 : isTeleport ? 1.25 : 1.05;
      candidates.push({
        kind: effect.type ?? 'blast',
        position,
        color,
        strength: lifeRatio * baseStrength * fade,
        attenuation: DYNAMIC_LIGHT_ATTENUATION,
        sortKey: distSq * (isBoom || isTeleport ? 0.5 : 0.8),
      });
    }

  if (Array.isArray(game.barrels))
    for (let i = 0; i < game.barrels.length; i++) {
      const barrel = game.barrels[i];
      if (barrel.gone || !(barrel.fuse >= 0))
        continue;
      if (fog && !fog.canSeeNear(barrel.pos))
        continue;
      const position = new Vec3(barrel.pos.x, 18, barrel.pos.y);
      const distSq = cameraPos ? cameraPos.getDistance(position, true) : 0;
      if (distSq > maxDistSq)
        continue;
      const pulse = 0.75 + 0.35 * Math.abs(Math.sin(time * 55 + i));
      candidates.push({
        kind: 'Fuse',
        position,
        color: BOOM_LIGHT_COLOR,
        strength: pulse,
        attenuation: DYNAMIC_LIGHT_ATTENUATION,
        sortKey: distSq * 0.9,
      });
    }

  candidates.sort((a, b) => a.sortKey - b.sortKey);
  return candidates.slice(0, MAX_DYNAMIC_LIGHTS);
}

const rankedFixturesPool = [];
const rankedFixturesScratch = [];

/**
 * Positions the scene's active RoostR PointLight pool: transient dynamic lights (muzzle flash, flying rockets and
 * fireballs, explosions, teleporter bursts) claim the first slots, and the remaining slots illuminate the ceiling
 * light fixtures nearest `cameraPos`.
 */
export function updateCeilingLights(pointLights, fixtures, cameraPos, time = 0, game = null, maxRadius = Infinity, fog = null) {
  const limit = pointLights.length;
  if (!limit)
    return pointLights;
  const dynamic = game ? collectDynamicLights(game, cameraPos, time, maxRadius, fog) : [];
  const dynCount = Math.min(dynamic.length, Math.min(MAX_DYNAMIC_LIGHTS, limit));

  for (let i = 0; i < dynCount; i++) {
    const light = pointLights[i];
    const dyn = dynamic[i];
    light.setPosition(dyn.position);
    light.setConstantAttenuation(dyn.attenuation.x);
    light.setLinearAttenuation(dyn.attenuation.y);
    light.setQuadraticAttenuation(dyn.attenuation.z);
    light.diffuse.scaleVector(dyn.color, dyn.strength);
  }

  const ceilingRadius = Math.min(CEILING_LIGHT_RADIUS, maxRadius);
  const maxDistSq = ceilingRadius * ceilingRadius;
  let rankedCount = 0;
  for (let i = 0; i < fixtures.length; i++) {
    const fixture = fixtures[i];
    if (fog && !fog.canSeeNear(scratchPt.setScalar(fixture.position.x, fixture.position.z)))
      continue;
    const distSq = cameraPos.getDistance(fixture.position, true);
    if (distSq <= maxDistSq) {
      let item = rankedFixturesPool[rankedCount];
      if (!item) {
        item = { fixture: null, distSq: 0 };
        rankedFixturesPool[rankedCount] = item;
      }
      item.fixture = fixture;
      item.distSq = distSq;
      rankedFixturesScratch[rankedCount++] = item;
    }
  }
  rankedFixturesScratch.length = rankedCount;
  rankedFixturesScratch.sort((a, b) => a.distSq - b.distSq);

  for (let i = dynCount; i < limit; i++) {
    const light = pointLights[i];
    light.setConstantAttenuation(CEILING_LIGHT_ATTENUATION.x);
    light.setLinearAttenuation(CEILING_LIGHT_ATTENUATION.y);
    light.setQuadraticAttenuation(CEILING_LIGHT_ATTENUATION.z);
    const entry = rankedFixturesScratch[i - dynCount];
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
  if (uHasFog == 1 && vDepth >= uFogFar)
    discard;
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

// ---- Martian sky panorama & camera-centered dome (E1M5 Red Planet) -------------------------------------------------

export const MARS_SKY_WIDTH = 1024;
export const MARS_SKY_HEIGHT = 256;

const SKY_ZENITH = [36, 11, 10];
const SKY_UPPER = [76, 24, 14];
const SKY_MID = [132, 50, 21];
const SKY_LOWER = [176, 78, 34];
const SKY_FOG = [117, 46, 15];
const SUN_CORE = [255, 238, 188];
const SUN_HALO = [238, 152, 68];
const MOON_LIT = [226, 168, 114];
const MOON_MID = [142, 82, 48];
const MOON_DARK = [52, 20, 13];
const CLOUD_LIT = [214, 108, 46];
const CLOUD_DARK = [88, 30, 14];
const RIDGE_FAR_DARK = [74, 25, 13];
const RIDGE_FAR_LIT = [146, 60, 26];
const RIDGE_NEAR_ABYSS = [36, 13, 7];
const RIDGE_NEAR_DARK = [64, 23, 11];
const RIDGE_NEAR_BASE = [108, 42, 18];
const RIDGE_NEAR_LIT = [166, 74, 32];

function skyDeltaX(x, cx) {
  let dx = x - cx;
  if (dx > MARS_SKY_WIDTH * 0.5)
    dx -= MARS_SKY_WIDTH;
  else if (dx < -MARS_SKY_WIDTH * 0.5)
    dx += MARS_SKY_WIDTH;
  return dx;
}

const skySmooth = Utils.smoothstep;

export const PHOBOS_CENTER = new Vec2(632, 92);
export const DEIMOS_CENTER = new Vec2(836, 104);
export const PHOBOS_ANGULAR_RADIUS = 0.096;
export const DEIMOS_ANGULAR_RADIUS = 0.044;

/**
 * Maps a panorama pixel coordinate `pixel` (`Vec2(x, y)`) in `marsSkyAtlas` to the exact 3D unit direction
 * vector on the celestial dome matching `MARS_SKY_FRAGMENT`'s `(u, v)` projection.
 */
export function skyPixelDir(pixel, target = new Vec3()) {
  const u = pixel.x / MARS_SKY_WIDTH;
  const v = Utils.clamp(pixel.y / (MARS_SKY_HEIGHT - 1), 0, 1);
  const az = (u - 0.5) * Trigo.pi * 2;
  const elev = (1 - v) ** (1 / 0.88);
  const dirY = Utils.clamp(elev * 0.54, 0, 0.999);
  const horiz = Math.sqrt(Math.max(0, 1 - dirY * dirY));
  return target.setScalar(horiz * Math.cos(az), dirY, horiz * Math.sin(az));
}

function skyTangentBasis(pixel, right = new Vec3(), down = new Vec3(), center = new Vec3()) {
  skyPixelDir(pixel, center);
  const az = (pixel.x / MARS_SKY_WIDTH - 0.5) * Trigo.pi * 2;
  right.setScalar(-Math.sin(az), 0, Math.cos(az));
  down.crossVectors(center, right).normalize();
}

const phobosBasisRight = new Vec3();
const phobosBasisDown = new Vec3();
const phobosBasisCenter = new Vec3();
skyTangentBasis(PHOBOS_CENTER, phobosBasisRight, phobosBasisDown, phobosBasisCenter);

const deimosBasisRight = new Vec3();
const deimosBasisDown = new Vec3();
const deimosBasisCenter = new Vec3();
skyTangentBasis(DEIMOS_CENTER, deimosBasisRight, deimosBasisDown, deimosBasisCenter);
const sunLightDir = new Vec3(-0.68, -0.34, 0.65).normalize();

/**
 * 1024x256 horizontally seamless 360-degree Martian sky panorama atlas (`planet: 'mars'`).
 * Includes a deep rust-violet zenith grading down into warm iron-oxide dust haze, a pale hazy sun with an amber
 * forward-scattering aureole, twin cratered moons Phobos & Deimos, wind-sheared dust-storm cloud bands, and
 * multi-layered distant Martian mountain ranges, flat-topped mesas, and crater rims fading into `MARS_SKY_VEC`.
 */
export function marsSkyAtlas({ includeMoons = true } = {}) {
  const width = MARS_SKY_WIDTH;
  const height = MARS_SKY_HEIGHT;
  const tile = new Tile(width, height);
  const rnd = mulberry32(77319);
  const warp = periodicField(rnd, 6, width);
  const cloudCoarse = periodicField(rnd, 6, width);
  const cloudMed = periodicField(rnd, 12, width);
  const cloudFine = periodicField(rnd, 24, width);
  const ridgeFieldA = periodicField(rnd, 6, width);
  const ridgeFieldB = periodicField(rnd, 14, width);
  const strataField = periodicField(rnd, 28, width);

  const sunX = 224;
  const sunY = 60;

  // 1. Smooth atmospheric gradient, wind-sheared dust cloud strata, and solar dust-scattering corona
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    let baseCol;
    if (t < 0.28)
      baseCol = mix(SKY_ZENITH, SKY_UPPER, skySmooth(0, 0.28, t));
    else if (t < 0.58)
      baseCol = mix(SKY_UPPER, SKY_MID, skySmooth(0.28, 0.58, t));
    else if (t < 0.82)
      baseCol = mix(SKY_MID, SKY_LOWER, skySmooth(0.58, 0.82, t));
    else
      baseCol = mix(SKY_LOWER, SKY_FOG, skySmooth(0.82, 1.0, t));

    const cloudBand = Math.sin(Utils.clamp((y - 28) / 164, 0, 1) * Trigo.pi);

    for (let x = 0; x < width; x++) {
      let col = [baseCol[0], baseCol[1], baseCol[2]];

      // Wind-swept horizontal dust cloud strata in the upper and mid sky
      if (cloudBand > 0.02) {
        const wx = x + (warp(x, y * 3) - 0.5) * 76;
        const wy = y * 4.2 + (warp(x + 194, y * 2) - 0.5) * 36;
        const c = cloudCoarse(wx, wy) * 0.54 + cloudMed(wx + 82, wy) * 0.32 + cloudFine(x, y * 2) * 0.14;
        const cAbove = cloudCoarse(wx, wy - 14) * 0.6 + cloudMed(wx + 82, wy - 14) * 0.4;
        const density = skySmooth(0.41, 0.82, c) * cloudBand;
        if (density > 0.005) {
          const sunlitBillow = Utils.clamp((c - cAbove + 0.08) * 3.6, 0, 1);
          const cloudCol = mix(CLOUD_DARK, CLOUD_LIT, sunlitBillow);
          col = mix(col, cloudCol, density * 0.64);
        }
      }

      // Pale hazy Martian sun and butterscotch atmospheric Mie-scattering corona (aspect-corrected to 3D angular space)
      const sdx = skyDeltaX(x, sunX);
      const sdy = y - sunY;
      const haloDist = scratchPt.setScalar(sdx, sdy * 0.55).getMagnitude();
      if (haloDist < 110) {
        const aureole = (1 - haloDist / 110) ** 2.2;
        col = mix(col, SUN_HALO, aureole * 0.62);
        const sunDist = scratchPt.setScalar(sdx, sdy * 0.378).getMagnitude();
        if (sunDist < 36) {
          const inner = (1 - sunDist / 36) ** 1.6;
          col = mix(col, mix(SUN_HALO, SUN_CORE, 0.65), inner * 0.78);
        }
        if (sunDist < 12) {
          const disc = skySmooth(12, 5.5, sunDist);
          const hazeStreak = 0.9 + 0.1 * cloudMed(x * 2, y * 6);
          col = mix(col, SUN_CORE, disc * hazeStreak);
        }
      }

      tile.set(x, y, col);
    }
  }

  // 2. Twin Martian moons: Phobos and Deimos projected as irregular, battered 3D rocky bodies in angular sky space
  if (includeMoons) {
    const phobosX = PHOBOS_CENTER.x;
    const phobosY = PHOBOS_CENTER.y;
    for (let dy = -48; dy <= 48; dy++)
      for (let dx = -22; dx <= 22; dx++) {
        const y = phobosY + dy;
        if (y < 0 || y >= height)
          continue;
        const x = ((phobosX + dx) % width + width) % width;
        skyPixelDir(scratchPixel.setScalar(x, y), scratchDir);
        const rawNx = scratchDir.dotProduct(phobosBasisRight) / PHOBOS_ANGULAR_RADIUS;
        const rawNy = scratchDir.dotProduct(phobosBasisDown) / PHOBOS_ANGULAR_RADIUS;
        const ang = Math.atan2(rawNy, rawNx);
        const limbR = 1.0
          + 0.018 * Math.cos(ang * 2 - 0.4)
          - 0.012 * Math.sin(ang * 3 + 1.1)
          + (cloudCoarse(x * 3, y * 3) - 0.5) * 0.028;
        const nx = rawNx / limbR;
        const ny = rawNy / limbR;
        const normDist = scratchPt.setScalar(nx, ny).getMagnitude();
        if (normDist > 1.0)
          continue;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const wx = nx + (warp(x * 4, y * 4) - 0.5) * 0.1;
        const wy = ny + (warp(x * 4 + 97, y * 4 + 53) - 0.5) * 0.1;
        const ndotl = Math.max(0, scratchNormal.setScalar(nx, ny, nz).dotProduct(sunLightDir));
        const limb = nz ** 0.35;
        let light = Utils.clamp((0.12 + 0.92 * ndotl) * (0.72 + 0.28 * limb), 0, 1);

        // Domain-warped irregular basins on Phobos (Stickney + secondary basins)
        for (const [cx, cy, cr] of [[-0.34, 0.16, 0.34], [0.24, -0.26, 0.23], [0.16, 0.33, 0.19], [-0.08, -0.39, 0.17], [0.46, 0.06, 0.16]]) {
          const cd = scratchPt.setScalar(wx - cx, wy - cy).getMagnitude();
          if (cd < cr) {
            const rim = cd / cr;
            if (rim > 0.72) {
              const rimBlend = Math.sin(((rim - 0.72) / 0.28) * Trigo.pi);
              const slope = cd > 1e-4 ? ((wx - cx) * 0.88 + (wy - cy) * 0.47) / cd : 0;
              light = Utils.clamp(light + slope * 0.16 * rimBlend, 0, 1);
            } else {
              const bowl = skySmooth(0, 0.72, rim);
              light *= 0.64 + 0.22 * bowl;
            }
          }
        }
        const surfDetail = (cloudFine(x * 3, y * 3) - 0.5) * 0.09 + (strataField(x * 2, y * 2) - 0.5) * 0.06;
        const moonShade = Utils.clamp(light + surfDetail * (light > 0.18 ? 1 : 0.35), 0, 1);
        const moonCol = moonShade > 0.55
          ? mix(MOON_MID, MOON_LIT, (moonShade - 0.55) / 0.45)
          : mix(MOON_DARK, MOON_MID, moonShade / 0.55);
        const edgeSoft = skySmooth(1.0, 0.85, normDist);
        tile.set(x, y, moonCol, edgeSoft * 0.94);
      }

    const deimosX = DEIMOS_CENTER.x;
    const deimosY = DEIMOS_CENTER.y;
    for (let dy = -26; dy <= 26; dy++)
      for (let dx = -12; dx <= 12; dx++) {
        const y = deimosY + dy;
        if (y < 0 || y >= height)
          continue;
        const x = ((deimosX + dx) % width + width) % width;
        skyPixelDir(scratchPixel.setScalar(x, y), scratchDir);
        const rawNx = scratchDir.dotProduct(deimosBasisRight) / DEIMOS_ANGULAR_RADIUS;
        const rawNy = scratchDir.dotProduct(deimosBasisDown) / DEIMOS_ANGULAR_RADIUS;
        const ang = Math.atan2(rawNy, rawNx);
        const limbR = 1.0
          + 0.024 * Math.sin(ang * 2 + 0.8)
          + 0.014 * Math.cos(ang * 3 - 0.5)
          + (cloudCoarse(x * 4, y * 4) - 0.5) * 0.028;
        const nx = rawNx / limbR;
        const ny = rawNy / limbR;
        const normDist = scratchPt.setScalar(nx, ny).getMagnitude();
        if (normDist > 1.0)
          continue;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const wx = nx + (warp(x * 4, y * 4) - 0.5) * 0.1;
        const wy = ny + (warp(x * 4 + 61, y * 4 + 29) - 0.5) * 0.1;
        const ndotl = Math.max(0, scratchNormal.setScalar(nx, ny, nz).dotProduct(sunLightDir));
        const limb = nz ** 0.35;
        let light = Utils.clamp((0.14 + 0.9 * ndotl) * (0.72 + 0.28 * limb), 0, 1);
        for (const [cx, cy, cr] of [[-0.22, 0.15, 0.36], [0.26, -0.18, 0.24], [0.05, 0.38, 0.2]]) {
          const craterDist = scratchPt.setScalar(wx - cx, wy - cy).getMagnitude();
          if (craterDist < cr)
            light *= 0.74 + 0.26 * skySmooth(0, cr, craterDist);
        }
        const surfDetail = (cloudFine(x * 3, y * 3) - 0.5) * 0.08;
        const moonShade = Utils.clamp(light + surfDetail * (light > 0.18 ? 1 : 0.35), 0, 1);
        const moonCol = moonShade > 0.5
          ? mix(MOON_MID, MOON_LIT, (moonShade - 0.5) / 0.5)
          : mix(MOON_DARK, MOON_MID, moonShade / 0.5);
        const edgeSoft = skySmooth(1.0, 0.83, normDist);
        tile.set(x, y, moonCol, edgeSoft * 0.92);
      }
  }

  // 3. Multi-layered distant Martian mountain ranges, flat-topped mesas, and caldera crater rims
  const farHeight = new Float32Array(width);
  const nearHeight = new Float32Array(width);
  const tau = (Trigo.pi * 2) / width;

  for (let x = 0; x < width; x++) {
    const a = x * tau;
    // Far range: high shield-volcano slopes, flat-topped tableland mesas, and distant crater rims (y = 128..194)
    const rawFar = 156
      - 22 * Math.sin(a * 2 + 0.4)
      - 14 * Math.cos(a * 5 - 1.1)
      - 10 * Math.sin(a * 9 + 2.3)
      + (ridgeFieldA(x, 40) - 0.5) * 28
      + (ridgeFieldB(x, 104) - 0.5) * 12;
    farHeight[x] = rawFar < 136 ? 136 + (rawFar - 136) * 0.25 : Utils.clamp(rawFar, 128, 196);

    // Near range: sharper eroded Valles Marineris canyon crags, buttes, and foreground ridges (y = 160..220)
    const rawNear = 188
      - 18 * Math.sin(a * 3 - 0.8)
      - 12 * Math.cos(a * 7 + 0.6)
      - 9 * Math.sin(a * 13 - 1.7)
      + (ridgeFieldA(x + 346, 176) - 0.5) * 30
      + (ridgeFieldB(x + 122, 208) - 0.5) * 16;
    nearHeight[x] = rawNear < 168 ? 168 + (rawNear - 168) * 0.3 : Utils.clamp(rawNear, 160, 220);
  }

  for (let x = 0; x < width; x++) {
    const xm = (x - 3 + width) % width;
    const xp = (x + 3) % width;
    const farTop = farHeight[x];
    const farSlope = (farHeight[xp] - farHeight[xm]) * 0.5;
    const nearTop = nearHeight[x];
    const nearSlope = (nearHeight[xp] - nearHeight[xm]) * 0.5;

    // Paint far mountain range
    for (let y = Math.max(0, Math.floor(farTop - 1)); y < height; y++) {
      const depthFromRim = y - farTop;
      if (depthFromRim < -1)
        continue;
      const sunFacing = Utils.clamp(0.5 + farSlope * 0.14, 0, 1);
      const strata = strataField(x, y * 3.2);
      const rimGlow = Math.exp(-Math.max(0, depthFromRim) * 0.12) * (0.45 + 0.55 * sunFacing);
      let col = mix(RIDGE_FAR_DARK, RIDGE_FAR_LIT, sunFacing * 0.72 + strata * 0.28);
      col = mix(col, CLOUD_LIT, rimGlow * 0.35);
      const haze = Utils.clamp(Math.max(0, depthFromRim) / 76, 0, 1);
      col = mix(col, SKY_MID, haze * 0.45);
      const edgeAlpha = skySmooth(-1.0, 1.2, depthFromRim);
      tile.set(x, y, col, edgeAlpha);
    }

    // Paint near craggy canyon & mesa range in front of the far range
    for (let y = Math.max(0, Math.floor(nearTop - 1)); y < height; y++) {
      const depthFromRim = y - nearTop;
      if (depthFromRim < -1)
        continue;
      const sunFacing = Utils.clamp(0.48 + nearSlope * 0.16, 0, 1);
      const strata = strataField(x + 66, y * 3.8);
      const gully = ridgeFieldB(x * 2, y * 2);
      let col = mix(RIDGE_NEAR_DARK, RIDGE_NEAR_BASE, sunFacing * 0.65 + strata * 0.35);
      if (sunFacing > 0.52 && strata > 0.45)
        col = mix(col, RIDGE_NEAR_LIT, skySmooth(0.52, 0.92, sunFacing) * skySmooth(0.45, 0.85, strata));
      if (sunFacing < 0.42 || gully < 0.38) {
        const shadowWeight = Math.max(skySmooth(0.42, 0.18, sunFacing), skySmooth(0.38, 0.16, gully));
        col = mix(col, RIDGE_NEAR_ABYSS, shadowWeight * 0.55);
      }
      if (depthFromRim >= 0 && depthFromRim < 3.5)
        col = mix(col, RIDGE_NEAR_LIT, (1 - depthFromRim / 3.5) * (0.3 + 0.5 * sunFacing));
      const edgeAlpha = skySmooth(-1.0, 1.2, depthFromRim);
      tile.set(x, y, col, edgeAlpha);
    }

    // 4. Seamless foothill fog blend into MARS_SKY_VEC at the bottom horizon (y = 208..255)
    for (let y = 208; y < height; y++) {
      const ft = Utils.clamp((y - 208) / (height - 1 - 208), 0, 1);
      const smoothFog = ft * ft * (3 - 2 * ft);
      tile.set(x, y, SKY_FOG, smoothFog);
    }
  }

  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const o = (y * width + x) * 4;
      data[o] = Utils.clamp(Math.round(tile.pixels[i]), 0, 255);
      data[o + 1] = Utils.clamp(Math.round(tile.pixels[i + 1]), 0, 255);
      data[o + 2] = Utils.clamp(Math.round(tile.pixels[i + 2]), 0, 255);
      data[o + 3] = 255;
    }
  return { name: 'marsSky', data, width, height, cell: height, frames: 1 };
}

/**
 * Builds a camera-centered panoramic sky cylinder/dome mesh `{ vertices, uvs }` with dimensions `size`
 * (`Vec2(radius, height)`). Extends below the horizon (`-0.35 * height`) and closes at the zenith (`+height`)
 * so any camera pitch or roll sees a continuous 360-degree sky over outdoor canyon walls while indoor ceilings
 * and walls naturally occlude it.
 */
export function marsSkyMesh(size = new Vec2(1200, 720)) {
  const radius = size.x;
  const height = size.y;
  const radialSegments = 64;
  const rings = [
    { y: -height * 0.35, r: radius, v: 1.0 },
    { y: 0, r: radius, v: 0.98 },
    { y: height * 0.28, r: radius * 0.96, v: 0.56 },
    { y: height * 0.56, r: radius * 0.82, v: 0.22 },
    { y: height * 0.82, r: radius * 0.52, v: 0.06 },
    { y: height, r: 0, v: 0.0 },
  ];
  const bands = rings.length - 1;
  const vertices = new Float32Array(radialSegments * bands * 18);
  const uvs = new Float32Array(radialSegments * bands * 12);
  let vOut = 0;
  let uOut = 0;

  for (let b = 0; b < bands; b++) {
    const r0 = rings[b];
    const r1 = rings[b + 1];
    for (let s = 0; s < radialSegments; s++) {
      const u0 = s / radialSegments;
      const u1 = (s + 1) / radialSegments;
      const a0 = u0 * Trigo.pi * 2;
      const a1 = u1 * Trigo.pi * 2;
      const c0 = Math.cos(a0);
      const s0 = Math.sin(a0);
      const c1 = Math.cos(a1);
      const s1 = Math.sin(a1);

      const corners = [
        c0 * r0.r, r0.y, s0 * r0.r,
        c1 * r0.r, r0.y, s1 * r0.r,
        c1 * r1.r, r1.y, s1 * r1.r,
        c0 * r1.r, r1.y, s0 * r1.r,
      ];
      const cornerUvs = [
        u0, r0.v,
        u1, r0.v,
        u1, r1.v,
        u0, r1.v,
      ];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        vertices[vOut++] = corners[k * 3];
        vertices[vOut++] = corners[k * 3 + 1];
        vertices[vOut++] = corners[k * 3 + 2];
        uvs[uOut++] = cornerUvs[k * 2];
        uvs[uOut++] = cornerUvs[k * 2 + 1];
      }
    }
  }
  return { vertices, uvs };
}

export const MARS_SKY_VERTEX = `
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
varying vec3 vRayDir;
varying vec2 vTextureCoord;

void main(void) {
  vec4 world = uModelMatrix * vec4(aVertexPosition, 1.0);
  vRayDir = aVertexPosition;
  vTextureCoord = aTextureCoord;
  gl_Position = uProjectionMatrix * uViewMatrix * world;
}
`;

export const MARS_SKY_FRAGMENT = `
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
varying vec3 vRayDir;
varying vec2 vTextureCoord;

float skyHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float skyNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(skyHash(i), skyHash(i + vec2(1.0, 0.0)), u.x),
    mix(skyHash(i + vec2(0.0, 1.0)), skyHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float skyFbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * skyNoise(p);
    p = p * 2.03 + vec2(17.3, 9.2);
    amp *= 0.5;
  }
  return v;
}

float skyPeriodicNoise(vec2 p, float periodX) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float ix0 = mod(mod(i.x, periodX) + periodX, periodX);
  float ix1 = mod(ix0 + 1.0, periodX);
  return mix(
    mix(skyHash(vec2(ix0, i.y)), skyHash(vec2(ix1, i.y)), u.x),
    mix(skyHash(vec2(ix0, i.y + 1.0)), skyHash(vec2(ix1, i.y + 1.0)), u.x),
    u.y
  );
}

float skyPeriodicFbm(vec2 p, float periodX) {
  float v = 0.0;
  float amp = 0.5;
  float per = periodX;
  for (int i = 0; i < 4; i++) {
    v += amp * skyPeriodicNoise(p, per);
    p = p * 2.0 + vec2(17.0, 9.2);
    per *= 2.0;
    amp *= 0.5;
  }
  return v;
}

vec3 sampleSmoothSky(vec2 uv) {
  vec2 texSize = vec2(${MARS_SKY_WIDTH}.0, ${MARS_SKY_HEIGHT}.0);
  vec2 pix = uv * texSize - 0.5;
  vec2 fl = floor(pix);
  vec2 fr = fract(pix);
  vec2 smoothUv = (fl + fr * fr * (3.0 - 2.0 * fr) + 0.5) / texSize;
  return texture2D(uSampler, vec2(fract(smoothUv.x), clamp(smoothUv.y, 0.004, 0.996))).rgb;
}

float moonWarpedBasin(vec2 nxy, vec2 warp, vec2 center, float radius, float depth, float hasPeak) {
  vec2 delta = (nxy + warp * (0.09 + radius * 0.12)) - center;
  // Slight elliptical & angular asymmetry so no basin is a geometric circle
  float ang = atan(delta.y, delta.x);
  float shapeMod = 1.0
    + 0.09 * sin(ang * 3.0 + center.x * 9.0)
    + 0.06 * cos(ang * 5.0 - center.y * 7.0)
    + 0.03 * sin(ang * 7.0 + 1.4);
  float d = length(delta) / max(radius * shapeMod, 0.001);
  if (d >= 1.35)
    return 0.0;
  // Slumped cavity bowl + raised rugged ejecta rim + optional central rebound peak
  float bowl = d < 0.82 ? -depth * (1.0 - smoothstep(0.0, 0.82, d * d)) : 0.0;
  float rimWave = exp(-pow((d - 0.88) / 0.24, 2.0)) * depth * 0.34 * (0.82 + 0.36 * skyNoise(nxy * 12.0 + center * 5.0));
  float peak = (hasPeak > 0.5 && d < 0.26) ? depth * 0.22 * (1.0 - smoothstep(0.0, 0.26, d)) : 0.0;
  return bowl + rimWave + peak;
}

float moonCellularCraters(vec2 p, float scale, float seed) {
  vec2 sp = p * scale + vec2(seed * 3.1, seed * 5.7);
  vec2 cell = floor(sp);
  vec2 frac = fract(sp) - 0.5;
  float h = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 neighbor = vec2(float(dx), float(dy));
      vec2 cid = cell + neighbor;
      float r1 = skyHash(cid);
      float r2 = skyHash(cid + vec2(19.3, 41.7));
      vec2 jitter = (vec2(r1, r2) - 0.5) * 0.72;
      vec2 diff = neighbor + jitter - frac;
      float rad = mix(0.22, 0.46, skyHash(cid + vec2(7.1, 13.9)));
      float d = length(diff) / rad;
      if (d < 1.25) {
        float cBowl = d < 0.78 ? -(1.0 - d * d / 0.6084) : 0.0;
        float cRim = exp(-pow((d - 0.86) / 0.22, 2.0)) * 0.32;
        h += (cBowl + cRim) * (0.45 + 0.55 * r1);
      }
    }
  }
  return h;
}

float moonLimbRadius(vec2 nxy, float isPhobos) {
  float ang = atan(nxy.y, nxy.x);
  vec2 ringPt = vec2(cos(ang), sin(ang));
  float n1 = skyFbm(ringPt * 2.2 + vec2(isPhobos * 4.1, 2.3)) - 0.5;
  float n2 = skyNoise(ringPt * 6.5 + vec2(1.7, isPhobos * 5.3)) - 0.5;
  float harmonic = isPhobos > 0.5
    ? 0.018 * cos(ang * 2.0 - 0.4) - 0.012 * sin(ang * 3.0 + 1.1) + 0.007 * cos(ang * 5.0 - 0.7)
    : 0.024 * sin(ang * 2.0 + 0.8) + 0.014 * cos(ang * 3.0 - 0.5) + 0.008 * sin(ang * 4.0 + 1.9);
  return 1.0 + harmonic + n1 * 0.028 + n2 * 0.010;
}

float moonRelief(vec2 nxy, float isPhobos) {
  vec2 warp = vec2(
    skyFbm(nxy * 3.1 + vec2(isPhobos * 5.2, 1.3)) - 0.5,
    skyFbm(nxy * 3.1 + vec2(8.4, isPhobos * 2.9 + 4.7)) - 0.5
  );
  vec2 wuv = nxy + warp * 0.12;

  // Base highland/mare macro-topography + soft ridged tectonic crust
  float macro = (skyFbm(wuv * 2.4 + vec2(isPhobos * 3.3, 0.7)) - 0.5) * 0.24;
  float ridgeNoise = 1.0 - abs(skyFbm(wuv * 4.2 + vec2(2.1, isPhobos * 6.4)) * 2.0 - 1.0);
  float ridges = (ridgeNoise * ridgeNoise - 0.4) * 0.11;

  // Soft multi-scale overlapping cellular impact craters across the sphere
  float craters = moonCellularCraters(wuv, 3.2, isPhobos * 7.0 + 1.0) * 0.14
    + moonCellularCraters(wuv + warp * 0.08, 6.4, isPhobos * 13.0 + 4.0) * 0.06;

  // Major named irregular impact basins & fracture grooves
  if (isPhobos > 0.5) {
    // Stickney mega-basin on western limb with central rebound mound + Hall, Roche, Todd & Reldresal basins
    craters += moonWarpedBasin(nxy, warp, vec2(-0.34, 0.16), 0.34, 0.30, 1.0);
    craters += moonWarpedBasin(nxy, warp, vec2(0.24, -0.26), 0.23, 0.21, 0.0);
    craters += moonWarpedBasin(nxy, warp, vec2(0.16, 0.33), 0.19, 0.18, 0.0);
    craters += moonWarpedBasin(nxy, warp, vec2(-0.08, -0.39), 0.17, 0.15, 0.0);
    craters += moonWarpedBasin(nxy, warp, vec2(0.46, 0.06), 0.16, 0.14, 0.0);
    // Phobos catenary crater-chain grooves radiating from Stickney
    float grooveCoord = (wuv.y - 0.42 * wuv.x) * 26.0 + warp.x * 5.0;
    float grooveMask = smoothstep(0.95, 0.15, length(nxy - vec2(-0.05, 0.05)));
    float grooves = (sin(grooveCoord) * 0.5 + 0.5);
    craters -= pow(1.0 - grooves, 3.0) * 0.04 * grooveMask;
  } else {
    // Deimos: Voltaire & Swift regolith-mantled basins + irregular ridge saddle
    craters += moonWarpedBasin(nxy, warp, vec2(-0.22, 0.15), 0.36, 0.26, 0.0);
    craters += moonWarpedBasin(nxy, warp, vec2(0.26, -0.18), 0.24, 0.19, 0.0);
    craters += moonWarpedBasin(nxy, warp, vec2(0.05, 0.38), 0.20, 0.15, 0.0);
  }

  // Subtle regolith micro-grit
  float grit = (skyNoise(nxy * 18.0 + warp * 2.0) - 0.5) * 0.028
    + (skyNoise(nxy * 34.0 - warp * 2.5) - 0.5) * 0.012;

  return macro + ridges + craters + grit;
}

vec4 evalMoonSphere(vec3 dir, vec3 center, vec3 right, vec3 down, float radius, float isPhobos) {
  if (dot(dir, center) <= 0.0)
    return vec4(0.0);
  vec2 nxy = vec2(dot(dir, right), dot(dir, down)) / radius;
  if (dot(nxy, nxy) > 1.16)
    return vec4(0.0);
  float limbR = moonLimbRadius(nxy, isPhobos);
  vec2 snxy = nxy / limbR;
  float r2 = dot(snxy, snxy);
  if (r2 >= 1.0)
    return vec4(0.0);
  float r = sqrt(r2);
  float nz = sqrt(max(0.0, 1.0 - r2));
  vec3 baseNormal = normalize(vec3(snxy.x, snxy.y, nz));

  // Evaluate 3D surface relief and finite-difference normal perturbation on the sphere
  float eps = 0.028;
  float h0 = moonRelief(snxy, isPhobos);
  float hx = moonRelief(snxy + vec2(eps, 0.0), isPhobos);
  float hy = moonRelief(snxy + vec2(0.0, eps), isPhobos);
  vec2 gradH = vec2(hx - h0, hy - h0) / eps;

  // Softly perturb 3D normal so crater walls and ridges cast gentle relief across the terminator
  float bumpScale = mix(0.18, 0.08, r * r);
  vec3 normal = normalize(vec3(
    baseNormal.x - gradH.x * bumpScale,
    baseNormal.y - gradH.y * bumpScale,
    max(0.08, baseNormal.z)
  ));

  vec3 sunDir = normalize(vec3(-0.68, -0.34, 0.62));
  // Soft horizon self-shadowing where upwind crater rims catch low-angle sunlight
  float hSun1 = moonRelief(snxy + sunDir.xy * 0.055, isPhobos);
  float hSun2 = moonRelief(snxy + sunDir.xy * 0.11, isPhobos);
  float rimShadow = clamp(1.0 - max(0.0, (hSun1 - h0) * 1.1 + (hSun2 - h0) * 0.7), 0.52, 1.0);

  // Lommel-Seeliger / Oren-Nayar dusty lunar regolith reflectance (avoids plastic Lambertian look)
  float rawNdotL = dot(normal, sunDir);
  float ndotl = max(0.0, rawNdotL) * rimShadow;
  float regolithScatter = ndotl / (ndotl + nz * 0.58 + 0.14);
  float directLight = mix(ndotl, regolithScatter, 0.52);

  // Soft terminator transition + subtle warm Mars-shine on the shadowed hemisphere
  float terminator = smoothstep(-0.18, 0.22, dot(baseNormal, sunDir) + h0 * 0.20);
  float marsShine = max(0.0, dot(baseNormal, normalize(vec3(0.45, 0.55, -0.2)))) * 0.09;
  float light = clamp(0.06 + marsShine + directLight * terminator * 0.96, 0.0, 1.0);

  // Subtle selenological albedo: dark basin floors, regolith, and soft ejecta rims
  float albedoNoise = skyFbm(snxy * 4.5 + vec2(isPhobos * 2.7, 6.1));
  float ejectaBoost = clamp((h0 + 0.03) * 0.22 + length(gradH) * 0.015, -0.07, 0.09);
  float shade = clamp(light * (0.88 + 0.18 * albedoNoise) + ejectaBoost * (0.25 + 0.75 * terminator), 0.0, 1.0);

  vec3 moonAbyss = vec3(0.165, 0.062, 0.039);
  vec3 moonDark = vec3(0.392, 0.184, 0.106);
  vec3 moonMid = vec3(0.647, 0.396, 0.235);
  vec3 moonLit = vec3(0.925, 0.725, 0.502);
  vec3 moonCol;
  if (shade < 0.28)
    moonCol = mix(moonAbyss, moonDark, shade / 0.28);
  else if (shade < 0.62)
    moonCol = mix(moonDark, moonMid, (shade - 0.28) / 0.34);
  else
    moonCol = mix(moonMid, moonLit, (shade - 0.62) / 0.38);

  // Subtle mineral hue shift between dark iron-rich basins and paler highland ejecta
  moonCol += vec3(0.025, 0.01, -0.006) * (albedoNoise - 0.5) * shade;

  float alpha = smoothstep(1.0, 0.88, r) * 0.94;
  return vec4(clamp(moonCol, 0.0, 1.0), alpha);
}

void main(void) {
  vec3 dir = normalize(vRayDir);
  float stormFog = uHasFog == 1 ? clamp((800.0 - uFogFar) / 540.0, 0.0, 1.0) : 0.0;
  float horizonTop = mix(0.045, 0.28, stormFog);
  float horizonHaze = 1.0 - smoothstep(-0.01, horizonTop, dir.y);
  vec3 fogCol = uHasFog == 1 ? uFogColor : vec3(0.46, 0.18, 0.06);
  if (horizonHaze >= 0.999) {
    gl_FragColor = vec4(fogCol, ${SOLID_ALPHA});
    return;
  }

  float u = fract(atan(dir.z, dir.x) * 0.159154943 + 0.5);
  float elev = clamp(dir.y / 0.54, 0.0, 1.0);
  float v = clamp(1.0 - pow(elev, 0.88), 0.004, 0.996);

  // Smooth C1 Hermite-filtered panoramic Martian sky (zenith, Phobos & Deimos, hazy sun, and mountain silhouettes)
  vec3 sky = sampleSmoothSky(vec2(u, v));

  // Per-fragment 3D ray-sphere shading for Phobos & Deimos so both moons remain razor-sharp, undistorted 3D spheres at any angle
  vec4 phobos = evalMoonSphere(
    dir,
    vec3(${phobosBasisCenter.x.toFixed(6)}, ${phobosBasisCenter.y.toFixed(6)}, ${phobosBasisCenter.z.toFixed(6)}),
    vec3(${phobosBasisRight.x.toFixed(6)}, ${phobosBasisRight.y.toFixed(6)}, ${phobosBasisRight.z.toFixed(6)}),
    vec3(${phobosBasisDown.x.toFixed(6)}, ${phobosBasisDown.y.toFixed(6)}, ${phobosBasisDown.z.toFixed(6)}),
    ${PHOBOS_ANGULAR_RADIUS.toFixed(4)},
    1.0
  );
  sky = mix(sky, phobos.rgb, phobos.a);

  vec4 deimos = evalMoonSphere(
    dir,
    vec3(${deimosBasisCenter.x.toFixed(6)}, ${deimosBasisCenter.y.toFixed(6)}, ${deimosBasisCenter.z.toFixed(6)}),
    vec3(${deimosBasisRight.x.toFixed(6)}, ${deimosBasisRight.y.toFixed(6)}, ${deimosBasisRight.z.toFixed(6)}),
    vec3(${deimosBasisDown.x.toFixed(6)}, ${deimosBasisDown.y.toFixed(6)}, ${deimosBasisDown.z.toFixed(6)}),
    ${DEIMOS_ANGULAR_RADIUS.toFixed(4)},
    0.0
  );
  sky = mix(sky, deimos.rgb, deimos.a);

  // Continuous high-resolution rock strata micro-detail on distant mountain ranges (periodic across u = 0 / 1)
  float mountainZone = smoothstep(0.46, 0.56, v) * (1.0 - smoothstep(0.84, 0.94, v));
  if (mountainZone > 0.01) {
    float strata = skyPeriodicFbm(vec2(u * 48.0, v * 96.0), 48.0) - 0.5;
    sky += vec3(0.055, 0.024, 0.01) * strata * mountainZone;
  }

  // Multi-octave drifting wind-driven Martian dust-storm clouds scrolling smoothly across the sky dome (periodic across u = 0 / 1)
  float cloudMask = smoothstep(0.02, 0.16, elev) * (1.0 - smoothstep(0.52, 0.88, elev));
  float billow = 0.5;
  vec3 color = sky;
  if (cloudMask > 0.001 || stormFog > 0.001) {
    vec2 windUvA = vec2(u * 10.0 - uTime * 0.11, elev * 6.5 + sin(u * 6.2831853) * 0.25);
    vec2 windUvB = vec2(u * 18.0 - uTime * 0.19 + 4.7, elev * 11.0 - uTime * 0.03);
    billow = skyPeriodicFbm(windUvA, 10.0) * 0.65 + skyPeriodicFbm(windUvB, 18.0) * 0.35;
    vec3 dustCloud = mix(vec3(0.46, 0.17, 0.08), vec3(0.78, 0.35, 0.16), smoothstep(0.38, 0.72, billow));
    float cloudStrength = smoothstep(0.38 - stormFog * 0.10, 0.74, billow) * cloudMask * mix(0.38, 0.68, stormFog);
    color = mix(sky, dustCloud, cloudStrength);
  }

  // Seamless horizon and full-dome atmospheric fog blend into uFogColor (MARS_SKY_VEC):
  // lower sky rays travel a longer optical path (skyDist) through the ground-hugging dust layer using the
  // same uFogNear/uFogFar bounds as the walls and floor, while stormFog blankets the entire sky dome.
  float skyDist = 72.0 / max(dir.y, 0.02);
  float opticalFog = uHasFog == 1
    ? clamp((skyDist - uFogNear) / max(uFogFar - uFogNear, 1.0), 0.0, 1.0)
    : 0.0;
  float skyFog = clamp(
    max(horizonHaze, mix(opticalFog, 1.0, stormFog * 0.65) - (1.0 - billow) * 0.05 * stormFog),
    0.0,
    1.0
  );
  color = mix(color * uMaterialDiffuse, fogCol, skyFog);

  gl_FragColor = vec4(color, ${SOLID_ALPHA});
}
`;

