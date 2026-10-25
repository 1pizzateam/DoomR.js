import { Trigo, Utils, Vec2, Vec3 } from '@1pizzateam/spock';

/**
 * The explosion of a barrel as a 2D sprite animation: a ground-deflected flash and horizontal shockwave, a boiling
 * hemispherical fireball that flattens and spreads across the floor before mushrooming upward, sparks thrown up and
 * skittering along the deck, and smoke that thins away. Drawn here in code, one 64 x 64 cell per frame, 16 frames
 * side by side in a 1024 x 64 atlas (a power of two).
 */

export const EXPLOSION_CELL = 64;
export const EXPLOSION_FRAMES = 16;
export const EXPLOSION_FLOOR_Y = 61;

const scratchPt = new Vec2();

const WHITE = [255, 248, 214];
const YELLOW = [255, 214, 96];
const ORANGE = [255, 150, 42];
const RED = [214, 62, 24];
const DARK_RED = [118, 28, 18];
const SMOKE = [74, 56, 54];
const SMOKE_DARK = [42, 34, 38];

/** A cheap, repeatable hash of a pixel, 0..1, so a frame always comes out the same. */
function hash(x, y, salt) {
  let h = Math.imul(x * 374761393 + y * 668265263 + salt * 1274126177, 1103515245);
  h ^= h >>> 13;
  return ((Math.imul(h, 1274126177) >>> 0) % 4096) / 4096;
}

const smooth = Utils.smoothstep;

/** The picture of the ground explosion at `t`, 0 at the flash and 1 when only a little smoke is left; RGBA, 64 x 64. */
function drawFrame(t) {
  const size = EXPLOSION_CELL;
  const floorY = EXPLOSION_FLOOR_Y;
  const out = new Uint8Array(size * size * 4);
  const put = (x, y, color) => {
    x = Math.round(x);
    y = Math.round(y);
    // the ground at floorY blocks anything from going below it, and a 1px border keeps every cell self-contained
    if (x < 1 || y < 1 || x >= size - 1 || y > floorY)
      return;
    const o = (y * size + x) * 4;
    out[o] = color[0];
    out[o + 1] = color[1];
    out[o + 2] = color[2];
    out[o + 3] = 255;
  };

  const grow = 1 - (1 - Math.min(1, t / 0.45)) ** 2;
  const rise = smooth(0.18, 0.95, t);
  const cool = smooth(0.28, 0.95, t);
  const dissolve = smooth(0.7, 1, t) * 0.97;
  const cx = 31.5;
  const phase = t * 5.2;

  // 1. Hemispherical ground-blast dome + horizontal floor-deflected Mach skirt + rising mushroom cap
  const domeRx = 7 + 20.5 * grow;
  const domeRy = 6 + 34 * grow + 8 * rise;
  const capCy = floorY - (4 + 24 * rise);
  const skirtRx = 9 + 21.5 * grow * (1 - 0.25 * smooth(0.6, 1, t));
  const skirtRy = 4.5 + 7.5 * grow;

  for (let y = 1; y <= floorY; y++) {
    const h = floorY - y;
    for (let x = 1; x < size - 1; x++) {
      const dx = x - cx;
      const adx = Math.abs(dx);
      const angle = Math.atan2(-h, dx);
      const lumpy =
        1 +
        0.16 * Math.sin(angle * 3 + phase + 1.1) +
        0.11 * Math.sin(angle * 5 - phase * 1.4) +
        0.07 * Math.sin(angle * 9 + phase * 2.1);

      // Upper hemispherical / mushrooming cap lobe
      const capDy = y - capCy;
      const capScaleX = capDy > 0 ? domeRx * (0.72 + 0.28 * (1 - rise)) : domeRx;
      const capScaleY = capDy > 0 ? Math.max(5, floorY - capCy) : Math.max(5, domeRy * 0.68);
      const dCap = scratchPt.setScalar(dx / capScaleX, capDy / capScaleY).getMagnitude() / lumpy;

      // Wide horizontal ground-deflected blast skirt hugging the floor (h = 0..skirtRy)
      const skirtLump = 1 + 0.12 * Math.sin(dx * 0.35 + phase * 1.6);
      const dSkirt = scratchPt.setScalar(dx / (skirtRx * skirtLump), h / skirtRy).getMagnitude();

      // Combine the flat-bottomed floor skirt and the rising dome into a single non-spherical ground plume
      const d = Math.min(dCap, dSkirt, (dCap + dSkirt) * 0.56);
      if (d > 1 || adx > 29.5 || y < 2)
        continue;
      if (hash(x, y, 2) < dissolve)
        continue;

      const grain = (hash(x, y, 1) - 0.5) * 0.28;
      // Hotter core near the ground detonation center and inside the rising cap
      const floorBoost = h < 5 && t < 0.45 ? (1 - h / 5) * 0.18 * (1 - t / 0.45) : 0;
      const heat = (1 - d) * (1.16 - cool * 0.58) + floorBoost + grain * (1 - cool * 0.5);

      let color;
      if (heat > 0.78)
        color = WHITE;
      else if (heat > 0.52)
        color = YELLOW;
      else if (heat > 0.3)
        color = ORANGE;
      else if (heat > 0.14)
        color = RED;
      else if (heat > 0.04)
        color = DARK_RED;
      else
        color = (x + y) % 2 ? SMOKE : SMOKE_DARK;
      if (heat < cool * 0.36)
        color = (x + y) % 2 ? SMOKE : SMOKE_DARK;
      put(x, y, color);
    }
  }

  // 2. Ground shockwave: an upper hemispherical pressure arch plus a bright horizontal blast wave skimming the floor
  if (t < 0.55) {
    const prog = t / 0.55;
    const ringX = Math.min(29.5, 9 + 21 * prog);
    const ringY = Math.min(floorY - 3, 7 + 34 * prog);
    const fade = 1 - prog;
    for (let k = 0; k <= 180; k += 2) {
      const a = Trigo.degreeToRadian(k);
      if (hash(k, 3, 7) > 0.35 + fade * 0.6)
        continue;
      put(cx + Math.cos(a) * ringX, floorY - Math.sin(a) * ringY, fade > 0.5 ? WHITE : YELLOW);
    }
    // Horizontal ground-hugging shock skirt racing outward along the floor
    for (let dx = -Math.floor(ringX); dx <= Math.floor(ringX); dx++) {
      if (hash(dx + 32, 4, 9) > 0.45 + fade * 0.5)
        continue;
      const edgeHot = Math.abs(dx) > ringX * 0.65;
      put(cx + dx, floorY, edgeHot && fade > 0.4 ? WHITE : YELLOW);
      if (edgeHot)
        put(cx + dx, floorY - 1, fade > 0.5 ? YELLOW : ORANGE);
    }
  }

  // 3. Sparks and embers: blasted upward and sideways from the floor, arcing and skittering along the deck
  for (let k = 0; k < 24; k++) {
    // Upper hemisphere angles only (0.04*PI .. 0.96*PI) — the floor blocks downward ejection
    const angle = (0.04 + hash(k, 1, 11) * 0.92) * Trigo.pi;
    const speed = 14 + hash(k, 2, 11) * 30;
    const life = 0.4 + hash(k, 3, 11) * 0.55;
    if (t < 0.05 || t > life)
      continue;
    const dt = t - 0.05;
    const travel = dt * speed * 1.12;
    const x = cx + Math.cos(angle) * travel;
    const rawY = floorY - 2 - Math.sin(angle) * travel * 0.95 + 42 * dt * dt;
    // Embers that hit the floor bounce softly along the ground instead of falling through it
    const y = rawY > floorY ? Math.max(floorY - 3, floorY - (rawY - floorY) * 0.35) : rawY;
    const hot = t < life * 0.6;
    put(x, y, hot ? YELLOW : ORANGE);
    if (hot && hash(k, 4, 11) < 0.5)
      put(x - Math.cos(angle), Math.min(floorY, y + Math.sin(angle) * 0.8), ORANGE);
  }

  // 4. Billowing mushroom cap & ground-collar smoke in the second half
  if (t > 0.42) {
    const smokeRise = smooth(0.42, 1, t);
    for (let k = 0; k < 6; k++) {
      const groundCollar = k < 2;
      const bx = groundCollar
        ? cx + (k === 0 ? -1 : 1) * (10 + smokeRise * 12)
        : cx + (hash(k, 5, 13) - 0.5) * 24 * (0.45 + smokeRise);
      const by = groundCollar
        ? floorY - 3 - smokeRise * 3
        : capCy - 4 - smokeRise * (10 + (k - 2) * 3.5);
      const r = (groundCollar ? 3.5 : 4) + hash(k, 6, 13) * 3.5 + smokeRise * 2.5;
      for (let y = Math.floor(by - r); y <= Math.ceil(by + r); y++)
        for (let x = Math.floor(bx - r); x <= Math.ceil(bx + r); x++)
          if (scratchPt.setScalar((x - bx) / (groundCollar ? 1.45 : 1.15), y - by).getMagnitude() <= r && hash(x, y, 17) > dissolve * 0.8 + 0.12 && (x + y) % 2 === (k & 1))
            put(x, y, hash(x, y, 19) < 0.5 ? SMOKE : SMOKE_DARK);
    }
  }

  // 5. The first instant: a hard white hemispherical ground flash with upward and lateral floor spikes
  if (t < 0.12) {
    const flash = 1 - t / 0.12;
    for (let k = 0; k < 11; k++) {
      const angle = (0.02 + (k / 10) * 0.96) * Trigo.pi;
      const reach = (8 + 11 * hash(k, 1, 23)) * (0.45 + flash * 0.55);
      for (let d = 0; d < reach; d += 0.7)
        put(cx + Math.cos(angle) * d * 1.15, floorY - 1 - Math.sin(angle) * d * 0.9, d < reach * 0.5 ? WHITE : YELLOW);
    }
  }
  return out;
}

/** The atlas as RGBA pixels, ready to be a texture. */
export function explosionAtlas() {
  const width = EXPLOSION_CELL * EXPLOSION_FRAMES;
  const height = EXPLOSION_CELL;
  const data = new Uint8Array(width * height * 4);
  for (let frame = 0; frame < EXPLOSION_FRAMES; frame++) {
    const picture = drawFrame(frame / (EXPLOSION_FRAMES - 1));
    for (let y = 0; y < height; y++)
      for (let x = 0; x < EXPLOSION_CELL; x++)
        data.set(picture.subarray((y * EXPLOSION_CELL + x) * 4, (y * EXPLOSION_CELL + x) * 4 + 4), (y * width + frame * EXPLOSION_CELL + x) * 4);
  }
  return { name: 'explosion', data, width, height, cell: EXPLOSION_CELL, frames: EXPLOSION_FRAMES };
}

const TELE_WHITE = [236, 255, 248];
const TELE_CYAN = [104, 255, 228];
const TELE_GREEN = [56, 232, 148];
const TELE_EMERALD = [24, 168, 98];
const TELE_DEEP = [12, 88, 62];

/**
 * Classic Doom TFOG teleporter materialization frame at `t` (0..1): an 8-point star-flash tearing open into a
 * swirling emerald-cyan plasma vortex with crackling lightning arcs and dissipating dimensional sparks.
 */
function drawTeleportFrame(t) {
  const size = EXPLOSION_CELL;
  const out = new Uint8Array(size * size * 4);
  const put = (x, y, color) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1)
      return;
    const o = (y * size + x) * 4;
    out[o] = color[0];
    out[o + 1] = color[1];
    out[o + 2] = color[2];
    out[o + 3] = 255;
  };

  const cx = 31.5;
  const cy = 31.5;
  const open = smooth(0, 0.28, t);
  const fade = smooth(0.58, 1, t);
  const dissolve = smooth(0.72, 1, t) * 0.94;
  const spin = t * Trigo.pi * 3.4;

  // 1. Swirling vertical plasma vortex body + concentric dimensional rings
  const rx = (8 + 20 * open) * (1 - 0.22 * fade);
  const ry = (11 + 22 * open) * (1 - 0.15 * fade);
  for (let y = 2; y < size - 2; y++)
    for (let x = 2; x < size - 2; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const angle = Math.atan2(dy, dx);
      const rNorm = scratchPt.setScalar(dx / rx, dy / ry).getMagnitude();
      const spiral =
        1 +
        0.18 * Math.sin(angle * 4 - spin + rNorm * 5.5) +
        0.12 * Math.cos(angle * 6 + spin * 1.4 - rNorm * 4);
      const d = rNorm / spiral;
      if (d > 1)
        continue;
      if (hash(x, y, 31) < dissolve)
        continue;

      // Concentric plasma wave bands inside the vortex
      const ringWave = 0.5 + 0.5 * Math.cos((d * 3.2 - t * 2.6) * Trigo.twopi);
      const grain = (hash(x, y, 37) - 0.5) * 0.24;
      const energy = (1 - d) * (1.15 - fade * 0.55) + ringWave * 0.28 * (1 - d * 0.6) + grain;

      // Hollow out the outer band slightly as it fades so rings stand out clearly
      if (t > 0.45 && energy < 0.24 + fade * 0.22 && hash(x, y, 41) < 0.65)
        continue;

      let color;
      if (energy > 0.86)
        color = TELE_WHITE;
      else if (energy > 0.64)
        color = TELE_CYAN;
      else if (energy > 0.42)
        color = TELE_GREEN;
      else if (energy > 0.22)
        color = TELE_EMERALD;
      else
        color = TELE_DEEP;
      put(x, y, color);
    }

  // 2. Crackling radial plasma lightning tendrils whipping around the vortex
  const boltCount = 12;
  for (let b = 0; b < boltCount; b++) {
    const baseAngle = (b / boltCount) * Trigo.twopi + spin * (b % 2 === 0 ? 0.65 : -0.55);
    const maxReach = (10 + 19 * open) * (0.7 + 0.3 * hash(b, 1, 53)) * (1 - 0.3 * fade);
    const steps = Math.ceil(maxReach * 1.4);
    for (let s = 2; s <= steps; s++) {
      const frac = s / steps;
      if (frac < fade * 0.45)
        continue;
      const jitter = (hash(b * 17 + s, Math.floor(t * 15), 59) - 0.5) * 0.42;
      const a = baseAngle + Math.sin(frac * 6 + spin) * 0.22 + jitter;
      const r = frac * maxReach;
      const lx = cx + Math.cos(a) * r * 0.96;
      const ly = cy + Math.sin(a) * r * 1.08;
      put(lx, ly, frac < 0.45 ? TELE_WHITE : frac < 0.78 ? TELE_CYAN : TELE_GREEN);
    }
  }

  // 3. Classic 8-point TFOG star-flash spikes (strongest on opening and on the final snap)
  const starPulse = t < 0.32 ? 1 - t / 0.32 : t > 0.68 ? Math.sin(((t - 0.68) / 0.32) * Trigo.pi) * 0.75 : 0.25;
  if (starPulse > 0.05)
    for (let k = 0; k < 8; k++) {
      const cardinal = k % 2 === 0;
      const a = (k * Trigo.pi) / 4;
      const reach = (cardinal ? 27 : 19) * (0.45 + 0.55 * starPulse);
      for (let r = 0; r <= reach; r += 0.65) {
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        const hot = r < reach * 0.48;
        put(px, py, hot ? TELE_WHITE : TELE_CYAN);
        if (cardinal && r < reach * 0.65) {
          put(px - Math.sin(a), py + Math.cos(a), hot ? TELE_CYAN : TELE_GREEN);
          put(px + Math.sin(a), py - Math.cos(a), hot ? TELE_CYAN : TELE_GREEN);
        }
      }
    }

  // 4. Orbiting plasma sparks & dimensional motes
  for (let k = 0; k < 22; k++) {
    const a = hash(k, 2, 71) * Trigo.twopi + spin * (0.4 + hash(k, 3, 71) * 0.6);
    const dist = (6 + hash(k, 4, 71) * 22) * (0.35 + 0.75 * Math.min(1, t * 1.6));
    if (dist > 29)
      continue;
    const sx = cx + Math.cos(a) * dist;
    const sy = cy + Math.sin(a) * dist * 1.05;
    const bright = hash(k, Math.floor(t * 15), 73) > 0.45;
    put(sx, sy, bright ? TELE_WHITE : TELE_GREEN);
    if (bright) {
      put(sx + 1, sy, TELE_CYAN);
      put(sx - 1, sy, TELE_CYAN);
      put(sx, sy + 1, TELE_CYAN);
      put(sx, sy - 1, TELE_CYAN);
    }
  }

  return out;
}

/** The 16-frame 1024x64 Doom TFOG teleporter plasma atlas as RGBA pixels. */
export function teleportAtlas() {
  const width = EXPLOSION_CELL * EXPLOSION_FRAMES;
  const height = EXPLOSION_CELL;
  const data = new Uint8Array(width * height * 4);
  for (let frame = 0; frame < EXPLOSION_FRAMES; frame++) {
    const picture = drawTeleportFrame(frame / (EXPLOSION_FRAMES - 1));
    for (let y = 0; y < height; y++)
      for (let x = 0; x < EXPLOSION_CELL; x++)
        data.set(picture.subarray((y * EXPLOSION_CELL + x) * 4, (y * EXPLOSION_CELL + x) * 4 + 4), (y * width + frame * EXPLOSION_CELL + x) * 4);
  }
  return { name: 'teleport', data, width, height, cell: EXPLOSION_CELL, frames: EXPLOSION_FRAMES };
}

// =====================================================================================================================
// 3D VOLUMETRIC EXPLOSION (SINGLE 3D EXPLODING FIREBALL MESH + PARTICLE SHOWER)
// =====================================================================================================================

export const EXPLOSION_3D_CELL = 64;
export const EXPLOSION_3D_FRAMES = 4;
export const EXPLOSION_3D_CELLS = {
  core: 0,
  plume: 1,
  ring: 2,
  smoke: 3,
};

const scratchNormal = new Vec3();

function valueNoise2d(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = Utils.smoothstep(0, 1, fx);
  const uy = Utils.smoothstep(0, 1, fy);
  const n00 = hash(ix, iy, seed);
  const n10 = hash(ix + 1, iy, seed);
  const n01 = hash(ix, iy + 1, seed);
  const n11 = hash(ix + 1, iy + 1, seed);
  return Utils.lerp(Utils.lerp(n00, n10, ux), Utils.lerp(n01, n11, ux), uy);
}

function fbm2d(u, v, seed) {
  // Periodic in u (0..1 wraps seamlessly around 3D cylinders/spheres)
  const a = u * Trigo.twopi;
  const cx = Math.cos(a);
  const sx = Math.sin(a);
  let sum = 0;
  let amp = 0.5;
  let freq = 2.2;
  for (let oct = 0; oct < 4; oct++) {
    const nx = (cx + 1.5) * freq;
    const ny = (sx + 1.5) * freq + v * freq * 1.6;
    sum += valueNoise2d(nx, ny, seed + oct * 19) * amp;
    freq *= 2.05;
    amp *= 0.5;
  }
  return sum / 0.9375;
}

function sampleBlackbodyRgb(heat, target) {
  const h = Utils.clamp(heat, 0, 1.25);
  if (h >= 0.92) {
    const k = Utils.clamp((h - 0.92) / 0.33, 0, 1);
    target[0] = Utils.lerp(255, 255, k);
    target[1] = Utils.lerp(228, 253, k);
    target[2] = Utils.lerp(112, 238, k);
  } else if (h >= 0.66) {
    const k = (h - 0.66) / 0.26;
    target[0] = Utils.lerp(255, 255, k);
    target[1] = Utils.lerp(132, 228, k);
    target[2] = Utils.lerp(24, 112, k);
  } else if (h >= 0.4) {
    const k = (h - 0.4) / 0.26;
    target[0] = Utils.lerp(196, 255, k);
    target[1] = Utils.lerp(36, 132, k);
    target[2] = Utils.lerp(12, 24, k);
  } else if (h >= 0.18) {
    const k = (h - 0.18) / 0.22;
    target[0] = Utils.lerp(68, 196, k);
    target[1] = Utils.lerp(24, 36, k);
    target[2] = Utils.lerp(22, 12, k);
  } else {
    const k = h / 0.18;
    target[0] = Utils.lerp(28, 68, k);
    target[1] = Utils.lerp(24, 24, k);
    target[2] = Utils.lerp(26, 22, k);
  }
  return target;
}

function draw3dCell(data, width, cellIndex, fn) {
  const S = EXPLOSION_3D_CELL;
  const x0 = cellIndex * S;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const rgba = fn(x, y, S);
      if (!rgba)
        continue;
      const o = (y * width + x0 + x) * 4;
      data[o] = Utils.clamp(Math.round(rgba[0]), 0, 255);
      data[o + 1] = Utils.clamp(Math.round(rgba[1]), 0, 255);
      data[o + 2] = Utils.clamp(Math.round(rgba[2]), 0, 255);
      data[o + 3] = Utils.clamp(Math.round(rgba[3] ?? 255), 0, 255);
    }
}

/**
 * Power-of-two 256 x 64 smooth continuous RGBA pyrotechnic atlas for the 3D volumetric explosion meshes:
 * - Cell 0 (`core`): High-temperature cellular plasma & branching magma veins for the detonation core.
 * - Cell 1 (`plume`): Multi-octave cauliflower convection billows with glowing internal magma fissures.
 * - Cell 2 (`ring`): Smooth supersonic shockwave pressure band with Mach streaks and soft transparent edges.
 * - Cell 3 (`smoke`): Dense turbulent charcoal soot domes with deep glowing ember crevices.
 */
export function explosion3dAtlas() {
  const width = EXPLOSION_3D_CELL * EXPLOSION_3D_FRAMES;
  const height = EXPLOSION_3D_CELL;
  const data = new Uint8Array(width * height * 4);
  const rgb = [0, 0, 0];

  // Cell 0: Continuous incandescent cellular fireball core
  draw3dCell(data, width, EXPLOSION_3D_CELLS.core, (x, y, S) => {
    const u = x / S;
    const v = y / S;
    const fbm = fbm2d(u, v, 101);
    const ridges = 1 - Math.abs(fbm * 2 - 1);
    const wave =
      0.64 +
      0.24 * fbm +
      0.24 * (ridges * ridges) +
      0.12 * Math.sin(u * Trigo.twopi * 3 + Math.cos(v * Trigo.pi * 4));
    sampleBlackbodyRgb(wave, rgb);
    return [rgb[0], rgb[1], rgb[2], 255];
  });

  // Cell 1: Boiling mushroom cloud plume (rounded cauliflower domes + incandescent crevices)
  draw3dCell(data, width, EXPLOSION_3D_CELLS.plume, (x, y, S) => {
    const u = x / S;
    const v = y / S;
    const fbm = fbm2d(u, v, 137);
    const detail = fbm2d((u + 0.37) % 1, v * 1.4, 173);
    const billow = Math.min(1, Math.abs(fbm * 2 - 1) * 2.2);
    const crevice = Math.pow(1 - billow, 2.2);
    const heat = Utils.clamp(0.32 + 0.56 * crevice + 0.24 * detail - v * 0.1, 0.12, 1.15);
    sampleBlackbodyRgb(heat, rgb);
    return [rgb[0], rgb[1], rgb[2], 255];
  });

  // Cell 2: Ground shockwave ring (v = 0 is inner edge, v = 0.5 is blazing shock ridge, v = 1 is outer ragged tip)
  draw3dCell(data, width, EXPLOSION_3D_CELLS.ring, (x, y, S) => {
    const v = y / (S - 1);
    const u = x / S;
    const fbm = fbm2d(u, v, 211);
    const streak = 0.08 * Math.sin(u * Trigo.twopi * 10) + 0.09 * (fbm - 0.5);
    const dist = Math.abs(v - (0.5 + streak));
    const band = 1 - dist * 2.55;
    if (band <= 0.06)
      return null;
    const heat = Utils.clamp(Math.pow(band, 0.75) * 1.18, 0.25, 1.22);
    sampleBlackbodyRgb(heat, rgb);
    return [rgb[0], rgb[1], rgb[2], 255];
  });

  // Cell 3: Rolling volcanic smoke lobe with deep glowing ember fissures
  draw3dCell(data, width, EXPLOSION_3D_CELLS.smoke, (x, y, S) => {
    const u = x / S;
    const v = y / S;
    const fbm = fbm2d(u, v, 263);
    const sub = fbm2d((u + 0.51) % 1, v * 1.3, 293);
    const dome = Math.min(1, Math.abs(fbm * 2 - 1) * 2.4);
    const fissure = Math.pow(1 - dome, 3.2);
    const heat = Utils.clamp(0.08 + 0.56 * fissure + 0.14 * sub, 0.04, 0.96);
    sampleBlackbodyRgb(heat, rgb);
    return [rgb[0], rgb[1], rgb[2], 255];
  });

  return {
    name: 'explosion3d',
    data,
    width,
    height,
    cell: EXPLOSION_3D_CELL,
    frames: EXPLOSION_3D_FRAMES,
    cells: EXPLOSION_3D_CELLS,
  };
}

function cellUvBounds(cell) {
  const step = 1 / EXPLOSION_3D_FRAMES;
  const pad = 1.5 / (EXPLOSION_3D_CELL * EXPLOSION_3D_FRAMES);
  return [cell * step + pad, (cell + 1) * step - pad];
}

function evalSurfaceVertex(uFrac, vFrac, evalPt, centerY = 0) {
  const p = evalPt(uFrac, vFrac);
  const epsU = 1 / 64;
  const epsV = 1 / 64;
  const vMid = Utils.clamp(vFrac, epsV, 1 - epsV);
  const pu1 = evalPt((uFrac + epsU) % 1, vMid);
  const pu0 = evalPt((uFrac - epsU + 1) % 1, vMid);
  const vHi = Math.min(1, vFrac + epsV);
  const vLo = Math.max(0, vFrac - epsV);
  const pv1 = evalPt(uFrac, vHi);
  const pv0 = evalPt(uFrac, vLo);

  const tx = pu1[0] - pu0[0];
  const ty = pu1[1] - pu0[1];
  const tz = pu1[2] - pu0[2];
  const bx = pv1[0] - pv0[0];
  const by = pv1[1] - pv0[1];
  const bz = pv1[2] - pv0[2];

  // Outward normal: cross(tangentV, tangentU) oriented outward from (0, centerY, 0)
  scratchNormal.setScalar(
    by * tz - bz * ty,
    bz * tx - bx * tz,
    bx * ty - by * tx
  );
  if (scratchNormal.getMagnitude(true) > 1e-8) {
    scratchNormal.normalize();
    const dy = p[1] - centerY;
    if (scratchNormal.x * p[0] + scratchNormal.y * dy + scratchNormal.z * p[2] < 0)
      scratchNormal.scale(-1);
  } else
    scratchNormal.setScalar(0, 1, 0);

  return {
    p,
    n: [scratchNormal.x, scratchNormal.y, scratchNormal.z],
  };
}

function pushSmoothTri(vertices, normals, uvs, v0, v1, v2, uv0, uv1, uv2) {
  vertices.push(v0.p[0], v0.p[1], v0.p[2], v1.p[0], v1.p[1], v1.p[2], v2.p[0], v2.p[1], v2.p[2]);
  normals.push(v0.n[0], v0.n[1], v0.n[2], v1.n[0], v1.n[1], v1.n[2], v2.n[0], v2.n[1], v2.n[2]);
  uvs.push(uv0[0], uv0[1], uv1[0], uv1[1], uv2[0], uv2[1]);
}

function pushSmoothQuad(vertices, normals, uvs, v00, v10, v11, v01, u0, tv0, u1, tv1) {
  pushSmoothTri(vertices, normals, uvs, v00, v01, v11, [u0, tv0], [u0, tv1], [u1, tv1]);
  pushSmoothTri(vertices, normals, uvs, v00, v11, v10, [u0, tv0], [u1, tv1], [u1, tv0]);
}

function buildParametricMesh(radialSegs, rings, cell, evalPt, centerY = 0) {
  const vertices = [];
  const normals = [];
  const uvs = [];
  const [cu0, cu1] = cellUvBounds(cell);
  const vPad = 1.5 / EXPLOSION_3D_CELL;

  const grid = [];
  for (let r = 0; r <= rings; r++) {
    const vFrac = r / rings;
    const row = [];
    for (let s = 0; s <= radialSegs; s++) {
      const uFrac = (s % radialSegs) / radialSegs;
      row.push(evalSurfaceVertex(uFrac, vFrac, evalPt, centerY));
    }
    grid.push(row);
  }

  for (let r = 0; r < rings; r++) {
    const tv0 = Utils.lerp(1 - vPad, vPad, r / rings);
    const tv1 = Utils.lerp(1 - vPad, vPad, (r + 1) / rings);
    for (let s = 0; s < radialSegs; s++) {
      const u0 = Utils.lerp(cu0, cu1, s / radialSegs);
      const u1 = Utils.lerp(cu0, cu1, (s + 1) / radialSegs);
      pushSmoothQuad(
        vertices,
        normals,
        uvs,
        grid[r][s],
        grid[r][s + 1],
        grid[r + 1][s + 1],
        grid[r + 1][s],
        u0,
        tv0,
        u1,
        tv1
      );
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

function buildLumpyDome(rx, ry, rz, radialSegs, rings, cell, phaseSalt) {
  return buildParametricMesh(
    radialSegs,
    rings,
    cell,
    (uFrac, vFrac) => {
      const elev = vFrac * Trigo.halfpi;
      const azim = uFrac * Trigo.twopi;
      const cosE = Math.cos(elev);
      const sinE = Math.sin(elev);
      const billow =
        1 +
        0.16 * Math.sin(azim * 3 + elev * 3.2 + phaseSalt) * cosE +
        0.11 * Math.cos(azim * 5 - elev * 4.1 + phaseSalt * 1.7) * cosE +
        0.06 * Math.sin(azim * 8 + elev * 5.0 - phaseSalt * 0.9) * cosE;
      const x = Math.cos(azim) * cosE * rx * billow;
      const y = sinE * ry * (1 + 0.1 * Math.sin(elev * 3 + phaseSalt) * cosE);
      const z = Math.sin(azim) * cosE * rz * billow;
      return [x, y, z];
    },
    0
  );
}

/**
 * Builds the single sculpted 3D exploding fireball dome mesh normalized to `size` (`Vec3`),
 * with smooth analytical per-vertex normals and floor-anchored base (`y >= 0`).
 */
export function explosion3dMesh(size = new Vec3(1, 1, 1)) {
  return buildLumpyDome(size.x, size.y, size.z, 28, 16, EXPLOSION_3D_CELLS.plume, 0.7);
}

/** Pre-allocates a reusable pose structure for `explosion3dPose`. */
export function createExplosion3dPose() {
  return {
    progress: 0,
    pos: new Vec3(),
    rot: new Vec3(),
    scale: new Vec3(1, 1, 1),
    color: new Vec3(1, 1, 1),
    heat: 1,
    dissolve: 0,
    phase: 0.7,
    active: true,
  };
}

function setHeatColor(targetVec, heat) {
  // Maps normalized heat (1.08 = warm golden-orange flash -> 0.85 = amber -> 0.55 = orange -> 0.3 = crimson -> 0.0 = dark smoke)
  if (heat >= 0.85) {
    const k = Utils.clamp((heat - 0.85) / 0.35, 0, 1);
    targetVec.setScalar(
      Utils.lerp(1.02, 1.08, k),
      Utils.lerp(0.76, 0.92, k),
      Utils.lerp(0.28, 0.52, k)
    );
  } else if (heat >= 0.52) {
    const k = (heat - 0.52) / 0.33;
    targetVec.setScalar(
      Utils.lerp(0.96, 1.02, k),
      Utils.lerp(0.46, 0.76, k),
      Utils.lerp(0.14, 0.28, k)
    );
  } else if (heat >= 0.25) {
    const k = (heat - 0.25) / 0.27;
    targetVec.setScalar(
      Utils.lerp(0.52, 0.96, k),
      Utils.lerp(0.22, 0.46, k),
      Utils.lerp(0.18, 0.14, k)
    );
  } else {
    const k = Utils.clamp(heat / 0.25, 0, 1);
    targetVec.setScalar(
      Utils.lerp(0.22, 0.52, k),
      Utils.lerp(0.18, 0.22, k),
      Utils.lerp(0.2, 0.18, k)
    );
  }
}

/**
 * Evaluates the single 3D exploding mesh animation at normalized lifetime `progress` (`0..1`),
 * writing transform, thermal energy (`heat`), color, and 3D erosion threshold (`dissolve`) into `target` with zero allocations.
 */
export function explosion3dPose(progress, target = createExplosion3dPose()) {
  const t = Utils.clamp(progress, 0, 1);
  target.progress = t;
  const flash = Math.max(0, 1 - t / 0.14);
  const grow = 1 - Math.pow(1 - Math.min(1, t / 0.34), 2.4);
  const rise = Math.pow(Utils.clamp((t - 0.04) / 0.92, 0, 1), 0.78);
  const cool = smooth(0.12, 0.86, t);
  const dissolve = smooth(0.56, 1.0, t) * 0.94;

  const radius = 0.42 + 0.68 * grow + 0.14 * flash + 0.12 * rise;
  const height = 0.38 + 0.62 * grow + 0.12 * flash + 0.22 * rise;
  const lift = 0.18 * rise;
  const heat = 1.08 - cool * 0.94;

  target.pos.setScalar(0, lift, 0);
  target.rot.setScalar(0, t * 0.45, 0);
  target.scale.setScalar(radius, height, radius);
  target.heat = heat;
  setHeatColor(target.color, heat);
  target.dissolve = dissolve;
  target.phase = 0.7;
  target.active = t < 0.995;

  return target;
}

export const EXPLOSION_PARTICLE_COUNT = 88;

/**
 * Generates a high-density shower of small camera-facing spark & cinder particles (`1.0..2.4` world units across,
 * matching blood droplet particle scale) and velocity-aligned spark needles around a `boom` explosion effect.
 *
 * Strictly accepts `@1pizzateam/spock` `Vec3` instances for camera `right` and `up` axes.
 */
export function explosionParticleQuads(effect, right, up) {
  const age = effect.age ?? 0;
  const life = effect.life ?? 0.45;
  const t = Utils.clamp(age / Math.max(0.001, life), 0, 1);
  if (t >= 0.995)
    return [];

  const radius = (effect.radius ?? 60) * (effect.scale ?? 1);
  const cx = effect.x ?? 0;
  const cy = effect.y ?? 0;
  const baseZ = Math.max(0, effect.z ?? 0);
  const rx = right.x;
  const ry = right.y;
  const rz = right.z;
  const ux = up.x;
  const uy = up.y;
  const uz = up.z;

  const quads = [];
  for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
    // 0..43: crisp pinpoint spark dots (half = 0.55..1.10 world units -> 1.1..2.2 units diameter)
    // 44..67: fast radial velocity-aligned spark needles (halfWidth = 0.42..0.72, halfLen = 1.8..4.0 world units)
    // 68..87: tumbling hot ember cinders & buoyant updraft sparks (half = 0.65..1.20 world units)
    const kind = i < 44 ? 0 : i < 68 ? 1 : 2;
    const lifeEnd = 0.58 + 0.41 * hash(i, 3, 809);
    if (t >= lifeEnd)
      continue;
    const pt = t / lifeEnd;

    const azim = (i / EXPLOSION_PARTICLE_COUNT) * Trigo.twopi * 2.39996 + (hash(i, 7, 811) - 0.5) * 0.35;
    const cosA = Math.cos(azim);
    const sinA = Math.sin(azim);
    const r0 = (0.08 + 0.34 * hash(i, 11, 821)) * radius;
    const vRad = (1.15 + 1.85 * hash(i, 13, 823)) * radius;
    const vUp = (0.72 + 1.38 * hash(i, 17, 827)) * radius;
    const grav = (3.4 + 2.4 * hash(i, 19, 829)) * radius;
    const y0 = baseZ + (0.06 + 0.46 * hash(i, 23, 839)) * radius;
    const floorY = 0.8 + 0.6 * hash(i, 29, 853);

    const vImpact = Math.sqrt(vUp * vUp + 2 * grav * Math.max(0, y0 - floorY));
    const tHit = (vUp + vImpact) / grav;

    let worldY;
    let radialDist;
    let velRad;
    let velY;
    if (t <= tHit) {
      worldY = y0 + vUp * t - 0.5 * grav * t * t;
      radialDist = r0 + vRad * t;
      velRad = vRad;
      velY = vUp - grav * t;
    } else {
      const dt1 = t - tHit;
      const vBounce1 = vImpact * (0.44 + 0.18 * hash(i, 31, 857));
      const tBounce1 = (2 * vBounce1) / grav;
      if (dt1 <= tBounce1) {
        worldY = floorY + vBounce1 * dt1 - 0.5 * grav * dt1 * dt1;
        velY = vBounce1 - grav * dt1;
      } else {
        const dt2 = dt1 - tBounce1;
        const vBounce2 = vBounce1 * 0.45;
        const tBounce2 = (2 * vBounce2) / grav;
        if (dt2 <= tBounce2) {
          worldY = floorY + vBounce2 * dt2 - 0.5 * grav * dt2 * dt2;
          velY = vBounce2 - grav * dt2;
        } else {
          worldY = floorY;
          velY = 0;
        }
      }
      const drag = 2.2;
      radialDist = r0 + vRad * tHit + vRad * 0.72 * (1 - Math.exp(-dt1 * drag)) / drag;
      velRad = vRad * 0.72 * Math.exp(-dt1 * drag);
    }

    const swirlAz = kind === 2 ? (hash(i, 37, 859) - 0.5) * 1.4 * t : 0;
    const curAz = azim + swirlAz;
    const cAz = Math.cos(curAz);
    const sAz = Math.sin(curAz);
    const px = cx + cAz * radialDist;
    const pz = cy + sAz * radialDist;
    const py = worldY;

    // Encode quantized heat slot (1..24) in the integer part of u so the fragment shader shades white-hot -> gold -> orange -> ember
    const rawHeat = (kind === 1 ? 1.48 : kind === 0 ? 1.38 : 1.22) * (1 - 0.72 * Math.pow(pt, 1.35));
    const slot = Math.max(1, Math.min(24, Math.round(rawHeat * 16)));
    const uv = [slot + 0.02, 0.02, slot + 0.98, 0.98];

    if (kind === 1) {
      // Velocity-aligned fine spark needle: stretches along 3D velocity vector with a razor-thin camera-facing width
      const vx = cosA * velRad;
      const vz = sinA * velRad;
      const vy = velY;
      const speed = Math.hypot(vx, vy, vz) || 1;
      const dirX = vx / speed;
      const dirY = vy / speed;
      const dirZ = vz / speed;
      const halfLen = (1.7 + 2.3 * hash(i, 41, 863)) * (1 - 0.45 * pt);
      const halfW = (0.42 + 0.3 * hash(i, 43, 877)) * (1 - 0.3 * pt);
      const axX = dirX * halfLen;
      const axY = dirY * halfLen;
      const axZ = dirZ * halfLen;
      // Perpendicular width axis in the camera plane
      let wx = dirY * uz - dirZ * uy + rx * 0.35;
      let wy = dirZ * ux - dirX * uz + ry * 0.35;
      let wz = dirX * uy - dirY * ux + rz * 0.35;
      const wLen = Math.hypot(wx, wy, wz) || 1;
      wx = (wx / wLen) * halfW;
      wy = (wy / wLen) * halfW;
      wz = (wz / wLen) * halfW;
      quads.push({
        corners: [
          px - axX - wx, py - axY - wy, pz - axZ - wz,
          px + axX - wx, py + axY - wy, pz + axZ - wz,
          px + axX + wx, py + axY + wy, pz + axZ + wz,
          px - axX + wx, py - axY + wy, pz - axZ + wz,
        ],
        uv,
      });
    } else {
      // Small camera-facing spark dot or tumbling cinder speck (half = 0.55..1.18 world units -> 1.1..2.35 units diameter)
      const baseHalf = kind === 0
        ? 0.55 + 0.52 * hash(i, 47, 881)
        : 0.68 + 0.5 * hash(i, 53, 883);
      const half = baseHalf * (1 - 0.38 * pt * pt);
      const spin = t * (10 + 8 * hash(i, 59, 887)) + i * 1.1;
      const c = Math.cos(spin) * half;
      const s = Math.sin(spin) * half;
      const axX = rx * c - ux * s;
      const axY = ry * c - uy * s;
      const axZ = rz * c - uz * s;
      const ayX = rx * s + ux * c;
      const ayY = ry * s + uy * c;
      const ayZ = rz * s + uz * c;
      quads.push({
        corners: [
          px - axX - ayX, py - axY - ayY, pz - axZ - ayZ,
          px + axX - ayX, py + axY - ayY, pz + axZ - ayZ,
          px + axX + ayX, py + axY + ayY, pz + axZ + ayZ,
          px - axX + ayX, py - axY + ayY, pz - axZ + ayZ,
        ],
        uv,
      });
    }
  }
  return quads;
}
