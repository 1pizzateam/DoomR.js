import { AmbientLight, MAX_LIGHTS, PointLight, Vec2, Vec3 } from '@1pizzateam/roostr';
import { mulberry32 } from './rng.js';
import { GLOW, LIGHT, LIGHT_GLSL, METAL, mix, plate, rivet, SHADOW, Tile } from './floor.js';
import { CEILING, DOOR, FLOOR, PILLAR, TILE } from './level.js';
import { SOLID_ALPHA } from './quads.js';

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
  for (let y = 8; y < 56; y++) {
    for (let x = 8; x < 56; x++) {
      const grain = (rnd() - 0.5) * 4;
      t.set(x, y, [cavityColor[0] + grain, cavityColor[1] + grain, cavityColor[2] + grain * 1.2]);
    }
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
    for (let y = y0 + 1; y < y1 - 1; y += 3) {
      for (let x = 12; x < 52; x++) {
        t.set(x, y, mix(COFFER, FLANGE, 0.28), 0.85);
        t.set(x, y + 1, VOID, 0.92);
      }
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
  for (const py of [10, 51]) {
    for (let x = 6; x < 58; x++) {
      t.set(x, py, VOID);
      t.set(x, py + 1, FLANGE, 0.65);
      t.set(x, py + 2, GIRDER, 0.9);
      t.set(x, py + 3, VOID);
    }
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
  for (let y = 11; y < 53; y++) {
    for (let x = 11; x < 53; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
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
  for (let y = 19; y < 45; y++) {
    for (let x = 9; x < 55; x++) {
      const dTube1 = Math.abs(y - 25.5);
      const dTube2 = Math.abs(y - 37.5);
      const dCenter = Math.abs(y - 31.5);
      const tube = Math.max(0, 1 - Math.min(dTube1, dTube2) / 5.2);
      const spine = Math.max(0, 1 - dCenter / 3.5) * 0.85;
      const glow = Math.max(tube, spine);
      t.set(x, y, mix(GLOW, WARM, 0.45 + 0.52 * glow), 0.72 + 0.28 * glow);
    }
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
  for (let y = 8; y < 56; y++) {
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
  for (const [yc, rad] of [[17, 4], [31, 6], [46, 4]]) {
    for (let dy = -rad; dy <= rad; dy++) {
      const cyl = Math.sqrt(Math.max(0, 1 - (dy / (rad + 0.5)) ** 2));
      const col = mix(VOID, FLANGE, 0.2 + cyl * 0.72);
      for (let x = 6; x < 58; x++)
        t.set(x, yc + dy, col, 0.96);
    }
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
    color = mix(color, uFogColor, fade * 0.9);
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
  for (let ty = 0; ty < level.rowCount; ty++) {
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
export function collectDynamicLights(game, cameraPos, time = 0) {
  if (!game)
    return [];
  const maxDistSq = DYNAMIC_LIGHT_RADIUS * DYNAMIC_LIGHT_RADIUS;
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

  if (Array.isArray(game.shots)) {
    for (let i = 0; i < game.shots.length; i++) {
      const shot = game.shots[i];
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
  }

  if (Array.isArray(game.effects)) {
    for (let i = 0; i < game.effects.length; i++) {
      const effect = game.effects[i];
      if (effect.age >= effect.life || effect.type === 'spark')
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
  }

  if (Array.isArray(game.barrels)) {
    for (let i = 0; i < game.barrels.length; i++) {
      const barrel = game.barrels[i];
      if (barrel.gone || !(barrel.fuse >= 0))
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
  }

  candidates.sort((a, b) => a.sortKey - b.sortKey);
  return candidates.slice(0, MAX_DYNAMIC_LIGHTS);
}

/**
 * Positions the scene's active RoostR PointLight pool: transient dynamic lights (muzzle flash, flying rockets and
 * fireballs, explosions, teleporter bursts) claim the first slots, and the remaining slots illuminate the ceiling
 * light fixtures nearest `cameraPos`.
 */
export function updateCeilingLights(pointLights, fixtures, cameraPos, time = 0, game = null) {
  const limit = pointLights.length;
  if (!limit)
    return pointLights;
  const dynamic = game ? collectDynamicLights(game, cameraPos, time) : [];
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

  const maxDistSq = CEILING_LIGHT_RADIUS * CEILING_LIGHT_RADIUS;
  const ranked = [];
  for (let i = 0; i < fixtures.length; i++) {
    const fixture = fixtures[i];
    const distSq = cameraPos.getDistance(fixture.position, true);
    if (distSq <= maxDistSq)
      ranked.push({ fixture, distSq });
  }
  ranked.sort((a, b) => a.distSq - b.distSq);

  for (let i = dynCount; i < limit; i++) {
    const light = pointLights[i];
    light.setConstantAttenuation(CEILING_LIGHT_ATTENUATION.x);
    light.setLinearAttenuation(CEILING_LIGHT_ATTENUATION.y);
    light.setQuadraticAttenuation(CEILING_LIGHT_ATTENUATION.z);
    const entry = ranked[i - dynCount];
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
