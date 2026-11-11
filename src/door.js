import { Utils } from '@1pizzateam/spock';
import { mulberry32 } from './rng.js';
import { BASE_FLOOR_LEVEL, ELEVATOR_DOOR_THICKNESS, TILE } from './level.js';
import { FLOOR_FRAGMENT, FLOOR_VERTEX, GLOW, LIGHT, METAL, mix, plate, rivet, SHADOW, Tile, TILE_PIXELS } from './floor.js';

export { ELEVATOR_DOOR_THICKNESS };

/**
 * The doors of an old space base: heavy sliding blast doors in two leaves, with a hazard-striped frame, recessed
 * panels, a viewing slit in each leaf and green status lights, rusted like the floor. A pixel-art atlas drawn here in
 * code: the face of the door (256 x 256, 4 texels per world unit) and its top, side by side in a 512 x 256 image.
 */

const DOOR_FACE = 0;
const DOOR_TOP = 1;
export const DOOR_CELLS = 2;
export const DOOR_THICKNESS = 8;
export const DOOR_INSET = 6;
const SIZE = TILE_PIXELS;

const SIGNAL = [70, 230, 150];
const HAZARD = [150, 86, 30];
const HAZARD_DARK = [22, 20, 26];
const FRAME = [14, 18, 27];

const LOCK_THEMES = {
  red: { signal: [248, 36, 54], glow: [255, 118, 126], stripe: [196, 24, 38] },
  yellow: { signal: [252, 198, 38], glow: [255, 236, 118], stripe: [196, 142, 22] },
  blue: { signal: [58, 146, 255], glow: [138, 204, 255], stripe: [32, 96, 204] },
};

/** A bevelled recess or boss: light on one pair of edges, dark on the other, drawn at native 256x256 precision. */
function bevel(t, x0, y0, w, h, rise = true) {
  const s = t.scale;
  const [a, b] = rise ? [LIGHT, SHADOW] : [SHADOW, LIGHT];
  if (s === 1) {
    for (let i = 0; i < w; i++) {
      t.set(x0 + i, y0, a, 0.8);
      t.set(x0 + i, y0 + h - 1, b);
    }
    for (let i = 0; i < h; i++) {
      t.set(x0, y0 + i, a, 0.65);
      t.set(x0 + w - 1, y0 + i, b);
    }
    return;
  }
  const px0 = Math.round(x0 * s);
  const py0 = Math.round(y0 * s);
  const pw = Math.round(w * s);
  const ph = Math.round(h * s);
  for (let dx = 0; dx < pw; dx++) {
    const px = px0 + dx;
    t.setRaw(px, py0, SHADOW, 0.88);
    t.setRaw(px, py0 + 1, a, 0.85);
    t.setRaw(px, py0 + 2, a, 0.48);
    t.setRaw(px, py0 + 3, a, 0.2);
    t.setRaw(px, py0 + ph - 4, b, 0.22);
    t.setRaw(px, py0 + ph - 3, b, 0.52);
    t.setRaw(px, py0 + ph - 2, b, 0.88);
    t.setRaw(px, py0 + ph - 1, SHADOW, 0.96);
  }
  for (let dy = 0; dy < ph; dy++) {
    const py = py0 + dy;
    t.setRaw(px0, py, SHADOW, 0.85);
    t.setRaw(px0 + 1, py, a, 0.72);
    t.setRaw(px0 + 2, py, a, 0.4);
    t.setRaw(px0 + 3, py, a, 0.16);
    t.setRaw(px0 + pw - 4, py, b, 0.22);
    t.setRaw(px0 + pw - 3, py, b, 0.52);
    t.setRaw(px0 + pw - 2, py, b, 0.88);
    t.setRaw(px0 + pw - 1, py, SHADOW, 0.96);
  }
}

function hazardStrip(t, x0, y0, w, h, color = HAZARD) {
  const s = t.scale;
  const px0 = Math.round(x0 * s);
  const py0 = Math.round(y0 * s);
  const px1 = Math.round((x0 + w) * s);
  const py1 = Math.round((y0 + h) * s);
  const band = 4 * s;
  for (let py = py0; py < py1; py++)
    for (let px = px0; px < px1; px++) {
      const diag = (px + py) / band;
      const frac = diag - Math.floor(diag);
      const stripe = Math.floor(diag) & 1;
      const edge = Math.min(frac, 1 - frac) * band;
      const blend = Utils.clamp(0.5 + (stripe ? 1 : -1) * (edge - 0.5), 0, 1);
      t.setRaw(px, py, mix(HAZARD_DARK, color, blend), 0.96);
    }
  bevel(t, x0, y0, w, h, false);
}

function drawFace(rnd, lockColor = null) {
  const theme = lockColor ? LOCK_THEMES[lockColor] : null;
  const sig = theme ? theme.signal : SIGNAL;
  const slitGlow = theme ? theme.glow : GLOW;
  const stripeColor = theme ? theme.stripe : HAZARD;
  const t = new Tile(SIZE, SIZE, SIZE / 64);
  const s = t.scale;
  plate(t, 0, 0, 64, 64, rnd, mix(METAL, FRAME, 0.4));

  // the frame: dark, with hazard striping across the top and the bottom
  hazardStrip(t, 4, 3, 56, 7, stripeColor);
  hazardStrip(t, 4, 54, 56, 7, stripeColor);

  // two leaves, each with a recessed panel, ribs and a viewing slit
  for (const x0 of [5, 33]) {
    plate(t, x0, 12, 26, 40, rnd, mix(METAL, LIGHT, 0.18));
    bevel(t, x0 + 3, 28, 20, 20, false);
    for (let y = 31; y < 46; y += 4) {
      const py = Math.round(y * s);
      for (let px = Math.round((x0 + 5) * s); px < Math.round((x0 + 21) * s); px++) {
        t.setRaw(px, py - 1, SHADOW, 0.35);
        t.setRaw(px, py, SHADOW, 0.85);
        t.setRaw(px, py + 1, SHADOW, 0.72);
        t.setRaw(px, py + 2, LIGHT, 0.55);
        t.setRaw(px, py + 3, LIGHT, 0.24);
      }
    }
    // the viewing slit with smooth vertical gradient & anti-aliased inner glow tube
    for (let py = Math.round(16 * s); py < Math.round(24 * s); py++) {
      const ly = py / s;
      const grad = (theme ? 0.34 : 0.14) + (ly - 16) * 0.018;
      const tube = Math.max(0, 1 - Math.abs(ly - 17.5) / 1.6);
      const col = mix(mix(SHADOW, slitGlow, grad), slitGlow, tube * (theme ? 0.82 : 0.48));
      for (let px = Math.round((x0 + 5) * s); px < Math.round((x0 + 21) * s); px++)
        t.setRaw(px, py, col, 0.98);
    }
    bevel(t, x0 + 4, 15, 18, 10, false);
    rivet(t, x0 + 1, 13);
    rivet(t, x0 + 22, 13);
    rivet(t, x0 + 1, 47);
    rivet(t, x0 + 22, 47);
  }

  // the seam between the leaves at native 256x256 resolution
  const seamPx = Math.round(32 * s);
  for (let py = Math.round(11 * s); py < Math.round(53 * s); py++) {
    t.setRaw(seamPx - 4, py, SHADOW, 0.28);
    t.setRaw(seamPx - 3, py, SHADOW, 0.58);
    t.setRaw(seamPx - 2, py, SHADOW, 0.92);
    t.setRaw(seamPx - 1, py, SHADOW, 0.98);
    t.setRaw(seamPx, py, SHADOW, 0.98);
    t.setRaw(seamPx + 1, py, SHADOW, 0.88);
    t.setRaw(seamPx + 2, py, LIGHT, 0.55);
    t.setRaw(seamPx + 3, py, LIGHT, 0.25);
  }

  // status lights either side of the seam: smooth cylindrical LED bars
  for (const x of [28, 35]) {
    const y0 = theme ? 14 : 26;
    const y1 = theme ? 50 : 38;
    const cx = (x + 0.85) * s;
    const rad = 1.45 * s;
    for (let py = Math.round(y0 * s); py < Math.round(y1 * s); py++)
      for (let px = Math.floor(cx - rad - 2); px <= Math.ceil(cx + rad + 2); px++) {
        const d = Math.abs(px - cx) / rad;
        if (d <= 1.0) {
          const core = Math.pow(1 - d, 1.25);
          t.setRaw(px, py, mix(sig, theme ? slitGlow : [215, 255, 235], core * 0.38), 0.82 + 0.16 * core);
        } else if (d <= 1.6) {
          t.setRaw(px, py, SHADOW, (1 - (d - 1.0) / 0.6) * 0.55);
        }
      }
  }
  if (theme) {
    // vertical keycard lock rails along the outer door jambs & central keycard reader escutcheon
    for (const x of [2, 60]) {
      const cx = (x + 1.0) * s;
      const rad = 1.35 * s;
      for (let py = Math.round(12 * s); py < Math.round(52 * s); py++)
        for (let px = Math.floor(cx - rad - 1); px <= Math.ceil(cx + rad + 1); px++) {
          const d = Math.abs(px - cx) / rad;
          if (d <= 1.0) {
            const core = Math.pow(1 - d, 1.3);
            t.setRaw(px, py, mix(sig, slitGlow, core * 0.65), 0.3 + 0.65 * core);
          }
        }
    }
    t.rect(26, 27, 12, 10, SHADOW, 0.85);
    bevel(t, 26, 27, 12, 10, false);
    t.rect(28, 29, 8, 6, sig, 0.95);
    t.rect(29, 30, 6, 2, slitGlow, 0.9);
  }
  for (const x of [8, 53]) {
    t.rect(x, 54, 3, 2, sig, 0.9);
    bevel(t, x, 54, 3, 2, true);
  }
  return t;
}

function drawTop(rnd) {
  const t = new Tile(SIZE, SIZE, SIZE / 64);
  const s = t.scale;
  plate(t, 0, 0, 64, 64, rnd, mix(METAL, SHADOW, 0.3));
  for (let i = 8; i < 56; i += 8) {
    const py = Math.round(i * s);
    for (let px = Math.round(4 * s); px < Math.round(60 * s); px++) {
      t.setRaw(px, py - 1, SHADOW, 0.45);
      t.setRaw(px, py, SHADOW, 0.85);
      t.setRaw(px, py + 1, LIGHT, 0.42);
    }
  }
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

// Vector-stroke glyph segments in normalized [0..1] x [0..1] space for native 256x256 SDF rendering
const ELEVATOR_GLYPHS = {
  L: [
    [0.14, 0.08, 0.14, 0.92],
    [0.14, 0.92, 0.88, 0.92],
  ],
  E: [
    [0.14, 0.08, 0.14, 0.92],
    [0.14, 0.08, 0.88, 0.08],
    [0.14, 0.50, 0.76, 0.50],
    [0.14, 0.92, 0.88, 0.92],
  ],
  V: [
    [0.10, 0.08, 0.50, 0.92],
    [0.90, 0.08, 0.50, 0.92],
  ],
  '-': [
    [0.16, 0.50, 0.84, 0.50],
  ],
  0: [
    [0.28, 0.08, 0.72, 0.08],
    [0.72, 0.08, 0.88, 0.24],
    [0.88, 0.24, 0.88, 0.76],
    [0.88, 0.76, 0.72, 0.92],
    [0.72, 0.92, 0.28, 0.92],
    [0.28, 0.92, 0.12, 0.76],
    [0.12, 0.76, 0.12, 0.24],
    [0.12, 0.24, 0.28, 0.08],
    [0.22, 0.74, 0.78, 0.26],
  ],
  1: [
    [0.24, 0.24, 0.52, 0.08],
    [0.52, 0.08, 0.52, 0.92],
    [0.22, 0.92, 0.82, 0.92],
  ],
  2: [
    [0.14, 0.24, 0.30, 0.08],
    [0.30, 0.08, 0.72, 0.08],
    [0.72, 0.08, 0.88, 0.24],
    [0.88, 0.24, 0.88, 0.42],
    [0.88, 0.42, 0.12, 0.92],
    [0.12, 0.92, 0.88, 0.92],
  ],
  3: [
    [0.14, 0.20, 0.28, 0.08],
    [0.28, 0.08, 0.72, 0.08],
    [0.72, 0.08, 0.88, 0.24],
    [0.88, 0.24, 0.88, 0.38],
    [0.88, 0.38, 0.70, 0.50],
    [0.36, 0.50, 0.70, 0.50],
    [0.70, 0.50, 0.88, 0.62],
    [0.88, 0.62, 0.88, 0.76],
    [0.88, 0.76, 0.72, 0.92],
    [0.72, 0.92, 0.28, 0.92],
    [0.28, 0.92, 0.14, 0.80],
  ],
  4: [
    [0.68, 0.08, 0.12, 0.64],
    [0.12, 0.64, 0.88, 0.64],
    [0.68, 0.08, 0.68, 0.92],
  ],
  5: [
    [0.86, 0.08, 0.14, 0.08],
    [0.14, 0.08, 0.14, 0.48],
    [0.14, 0.48, 0.72, 0.48],
    [0.72, 0.48, 0.88, 0.62],
    [0.88, 0.62, 0.88, 0.78],
    [0.88, 0.78, 0.72, 0.92],
    [0.72, 0.92, 0.26, 0.92],
    [0.26, 0.92, 0.12, 0.80],
  ],
  6: [
    [0.78, 0.16, 0.64, 0.08],
    [0.64, 0.08, 0.28, 0.08],
    [0.28, 0.08, 0.12, 0.24],
    [0.12, 0.24, 0.12, 0.76],
    [0.12, 0.76, 0.28, 0.92],
    [0.28, 0.92, 0.72, 0.92],
    [0.72, 0.92, 0.88, 0.76],
    [0.88, 0.76, 0.88, 0.60],
    [0.88, 0.60, 0.72, 0.48],
    [0.72, 0.48, 0.12, 0.48],
  ],
  7: [
    [0.12, 0.08, 0.88, 0.08],
    [0.88, 0.08, 0.36, 0.92],
  ],
  8: [
    [0.28, 0.08, 0.72, 0.08],
    [0.72, 0.08, 0.88, 0.22],
    [0.88, 0.22, 0.88, 0.38],
    [0.88, 0.38, 0.72, 0.50],
    [0.72, 0.50, 0.28, 0.50],
    [0.28, 0.50, 0.12, 0.38],
    [0.12, 0.38, 0.12, 0.22],
    [0.12, 0.22, 0.28, 0.08],
    [0.72, 0.50, 0.88, 0.62],
    [0.88, 0.62, 0.88, 0.78],
    [0.88, 0.78, 0.72, 0.92],
    [0.72, 0.92, 0.28, 0.92],
    [0.28, 0.92, 0.12, 0.78],
    [0.12, 0.78, 0.12, 0.62],
    [0.12, 0.62, 0.28, 0.50],
  ],
  9: [
    [0.88, 0.52, 0.28, 0.52],
    [0.28, 0.52, 0.12, 0.38],
    [0.12, 0.38, 0.12, 0.24],
    [0.12, 0.24, 0.28, 0.08],
    [0.28, 0.08, 0.72, 0.08],
    [0.72, 0.08, 0.88, 0.24],
    [0.88, 0.24, 0.88, 0.76],
    [0.88, 0.76, 0.72, 0.92],
    [0.72, 0.92, 0.28, 0.92],
  ],
};

function segmentDistPx(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const len2 = vx * vx + vy * vy;
  const u = len2 > 1e-6 ? Utils.clamp(((px - x1) * vx + (py - y1) * vy) / len2, 0, 1) : 0;
  return Math.hypot(px - (x1 + u * vx), py - (y1 + u * vy));
}

function drawElevatorText(t, text, cxLog, y0Log, color, glowColor, pxScale = 2) {
  const s = t.scale;
  const rawChars = [...String(text).toUpperCase()];
  const charW = 8 * pxScale;
  const charH = 12 * pxScale;
  const gap = 3 * pxScale;
  const spaceW = 5 * pxScale;
  const strokeRad = 0.82 * pxScale;
  const haloRad = strokeRad + 3.4;
  let totalW = 0;
  for (let i = 0; i < rawChars.length; i++) {
    const ch = rawChars[i];
    if (ch === ' ')
      totalW += spaceW;
    else if (ELEVATOR_GLYPHS[ch])
      totalW += charW + (i < rawChars.length - 1 && rawChars[i + 1] !== ' ' ? gap : 0);
  }
  if (!totalW)
    return;
  const pxStart = cxLog * s - totalW * 0.5;
  const pyBase = y0Log * s;

  let cursor = pxStart;
  for (let i = 0; i < rawChars.length; i++) {
    const ch = rawChars[i];
    if (ch === ' ') {
      cursor += spaceW;
      continue;
    }
    const segs = ELEVATOR_GLYPHS[ch];
    if (!segs)
      continue;
    const x0 = Math.floor(cursor - haloRad - 1);
    const x1 = Math.ceil(cursor + charW + haloRad + 1);
    const y0 = Math.floor(pyBase - haloRad - 1);
    const y1 = Math.ceil(pyBase + charH + haloRad + 1);
    for (let py = y0; py <= y1; py++)
      for (let px = x0; px <= x1; px++) {
        let minDist = Infinity;
        for (let k = 0; k < segs.length; k++) {
          const seg = segs[k];
          const d = segmentDistPx(
            px,
            py,
            cursor + seg[0] * charW,
            pyBase + seg[1] * charH,
            cursor + seg[2] * charW,
            pyBase + seg[3] * charH,
          );
          if (d < minDist)
            minDist = d;
        }
        if (minDist <= strokeRad + 0.65) {
          const edgeCov = Utils.clamp(strokeRad + 0.55 - minDist, 0, 1);
          const core = Math.pow(Utils.clamp(1 - minDist / Math.max(0.5, strokeRad), 0, 1), 0.75);
          const vShade = 1 - Math.abs((py - pyBase) / charH - 0.42) * 0.25;
          const strokeCol = mix(glowColor, color, Utils.clamp(0.45 + 0.55 * core * vShade, 0, 1));
          t.setRaw(px, py, strokeCol, 0.96 * edgeCov);
        } else if (minDist <= haloRad) {
          const halo = Math.pow(1 - (minDist - strokeRad) / (haloRad - strokeRad), 1.8);
          t.setRaw(px, py, glowColor, halo * 0.36);
        }
      }
    cursor += charW + (i < rawChars.length - 1 && rawChars[i + 1] !== ' ' ? gap : 0);
  }
}

function drawElevatorOuterFace(rnd, floorLevel = BASE_FLOOR_LEVEL) {
  const t = new Tile(SIZE, SIZE, SIZE / 64);
  const s = t.scale;
  const steel = mix(METAL, LIGHT, 0.28);
  const darkSteel = mix(METAL, FRAME, 0.52);
  const cyan = [64, 218, 255];
  const cyanBright = [205, 250, 255];
  const amber = [255, 182, 42];
  const amberBright = [255, 240, 168];
  plate(t, 0, 0, 64, 64, rnd, darkSteel);

  // Outer armored elevator architrave jambs with vertical guide-rail grooves
  for (const x0 of [1, 59]) {
    plate(t, x0, 2, 4, 60, rnd, mix(METAL, SHADOW, 0.25));
    for (let y = 6; y < 58; y += 8)
      rivet(t, x0 + 1, y);
  }

  // Overhead digital floor-indicator transom header (x = 5..59, y = 2..15)
  plate(t, 5, 2, 54, 13, rnd, mix(METAL, SHADOW, 0.35));
  bevel(t, 5, 2, 54, 13, true);
  // Dark recessed CRT/LED marquee screen (x = 8..56, y = 4..13) with native-resolution scanlines and grid
  const mx0 = Math.round(8 * s);
  const mx1 = Math.round(56 * s);
  const my0 = Math.round(4 * s);
  const my1 = Math.round(13 * s);
  for (let py = my0; py < my1; py++)
    for (let px = mx0; px < mx1; px++) {
      const scan = (py & 1) === 0 ? [7, 10, 16] : [12, 18, 28];
      const dot = ((px & 3) === 0 && (py & 3) === 0) ? mix(scan, amber, 0.08) : scan;
      t.setRaw(px, py, dot, 0.96);
    }
  bevel(t, 7, 3, 50, 11, false);

  const label = `LEVEL ${floorLevel}`;
  drawElevatorText(t, label, 32, 5.5, amberBright, amber, 2);

  // Twin elevator car doors below the transom (y = 16..57), distinct brushed-steel vertical-fluted design (no viewing slits)
  for (const x0 of [6, 33]) {
    plate(t, x0, 16, 25, 41, rnd, steel);
    bevel(t, x0, 16, 25, 41, true);
    // Upper and lower recessed architectural coffers
    bevel(t, x0 + 3, 19, 19, 14, false);
    bevel(t, x0 + 3, 36, 19, 17, false);
    // High-res 3D cylindrical vertical brushed-steel flutes inside the coffers
    for (let x = x0 + 5; x < x0 + 21; x += 3) {
      const fcx = (x + 1.0) * s;
      const frad = 1.15 * s;
      for (const [fy0, fy1] of [[20.5, 31.5], [37.5, 51.5]]) {
        for (let py = Math.round(fy0 * s); py < Math.round(fy1 * s); py++)
          for (let px = Math.floor(fcx - frad); px <= Math.ceil(fcx + frad); px++) {
            const nx = (px - fcx) / frad;
            if (Math.abs(nx) > 1)
              continue;
            const shade = nx < 0 ? mix(SHADOW, METAL, 0.35 + (1 + nx) * 0.45) : mix(METAL, LIGHT, nx * 0.48);
            t.setRaw(px, py, shade, 0.78);
          }
      }
    }
    // Horizontal machined bumper rail across the mid-section of each leaf
    bevel(t, x0 + 2, 33, 21, 2.5, true);
    rivet(t, x0 + 1, 17);
    rivet(t, x0 + 21, 17);
    rivet(t, x0 + 1, 53);
    rivet(t, x0 + 21, 53);
  }

  // Center rubber safety astragal seam between the two leaves at native 256x256 precision
  const seamPx = Math.round(32 * s);
  for (let py = Math.round(16 * s); py < Math.round(58 * s); py++) {
    t.setRaw(seamPx - 4, py, LIGHT, 0.25);
    t.setRaw(seamPx - 3, py, LIGHT, 0.48);
    t.setRaw(seamPx - 2, py, SHADOW, 0.92);
    t.setRaw(seamPx - 1, py, SHADOW, 0.98);
    t.setRaw(seamPx, py, SHADOW, 0.98);
    t.setRaw(seamPx + 1, py, SHADOW, 0.92);
    t.setRaw(seamPx + 2, py, SHADOW, 0.58);
    t.setRaw(seamPx + 3, py, SHADOW, 0.28);
  }

  // Illuminated floor level badge stenciled across the center of the elevator doors (y = 22..33)
  const bx0 = Math.round(18 * s);
  const bx1 = Math.round(46 * s);
  const by0 = Math.round(22 * s);
  const by1 = Math.round(33 * s);
  for (let py = by0; py < by1; py++)
    for (let px = bx0; px < bx1; px++) {
      const scan = (py & 1) === 0 ? [8, 13, 21] : [12, 20, 32];
      t.setRaw(px, py, scan, 0.95);
    }
  bevel(t, 18, 22, 28, 11, false);
  drawElevatorText(t, `LVL ${floorLevel}`, 32, 24.5, cyanBright, cyan, 2);

  // Smooth cylindrical cyan status beacon tubes flanking the center badge
  for (const x of [15, 48]) {
    const cx = (x + 0.8) * s;
    const rad = 1.45 * s;
    for (let py = Math.round(22 * s); py < Math.round(33 * s); py++)
      for (let px = Math.floor(cx - rad - 2); px <= Math.ceil(cx + rad + 2); px++) {
        const d = Math.abs(px - cx) / rad;
        if (d <= 1.0) {
          const core = Math.pow(1 - d, 1.35);
          t.setRaw(px, py, mix(cyan, cyanBright, core * 0.72), 0.35 + 0.63 * core);
        } else if (d <= 1.7) {
          t.setRaw(px, py, SHADOW, (1 - (d - 1.0) / 0.7) * 0.55);
        }
      }
  }

  // Grooved threshold sill plate at the bottom (y = 58..63) at native resolution
  plate(t, 5, 58, 54, 5, rnd, mix(METAL, SHADOW, 0.4));
  for (let x = 7; x < 57; x += 2) {
    const px = Math.round(x * s);
    for (let py = Math.round(59 * s); py < Math.round(62 * s); py++) {
      t.setRaw(px - 1, py, SHADOW, 0.65);
      t.setRaw(px, py, LIGHT, 0.52);
      t.setRaw(px + 1, py, LIGHT, 0.28);
    }
  }

  return t;
}

/**
 * 4-cell 1024x256 power-of-two elevator door atlas (compatible with WebGL1 mipmaps):
 * cell 0 is the interior cab face, cell 1 is the edge/top cap, and cell 2 is the distinct
 * exterior lobby face displaying the current floor level (`LEVEL -4`..`LEVEL 0`).
 */
export function elevatorDoorAtlas(floorLevel = BASE_FLOOR_LEVEL) {
  const cells = 4;
  const width = SIZE * cells;
  const data = new Uint8Array(width * SIZE * 4);
  const innerTile = drawFace(mulberry32(555), null);
  const topTile = drawTop(mulberry32(777));
  const outerTile = drawElevatorOuterFace(mulberry32(999 + floorLevel * 31), floorLevel);
  const tiles = [innerTile, topTile, outerTile, outerTile];
  tiles.forEach((tile, cell) => {
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 3;
        const o = (y * width + cell * SIZE + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name: `elevatorDoor_${floorLevel}`, data, width, height: SIZE, cell: SIZE, frames: cells, floorLevel };
}

/**
 * The door as a box: four sides showing the face and a top, standing on y = 0. `dimensions` is a
 * Vec2(size, height) or Vec3(size, height, depth); the box is `size` wide and deep and `height` tall.
 * Vertices, texture coordinates (v = 1 at the top of a picture) and a primitive, for a RoostR CustomMesh.
 */
export function doorBox(dimensions) {
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
  const outer = TILE / 2 - inset;
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
  const edgeSpan = Math.min(1, thickness / TILE);
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
 * Single thin elevator door slab (`[-thickness / 2, +thickness / 2]`) that does not occupy a full grid square.
 * When `cells` >= 3, the face opening into the level (`outwardDir > 0` for +X/+Z, `< 0` for -X/-Z) maps to the
 * distinct exterior elevator door face (cell 2) while the cab interior face maps to cell 0.
 */
export function elevatorDoorBox(dimensions, alongY = false, outwardDir = 1, cells = 4) {
  const h = dimensions.x / 2;
  const height = dimensions.y;
  const thickness = dimensions.z;
  const d0 = -thickness / 2;
  const d1 = thickness / 2;
  const outerCell = cells >= 3 ? 2 : DOOR_FACE;
  const posFaceCell = outwardDir >= 0 ? outerCell : DOOR_FACE;
  const negFaceCell = outwardDir >= 0 ? DOOR_FACE : outerCell;
  const vertices = [];
  const uvs = [];
  const push = (corners, cell, uSpan = 1, vSpan = 1) => {
    const u0 = cell / cells;
    const u1 = u0 + uSpan / cells;
    const insetU = 0.25 / (SIZE * cells);
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
  const edgeSpan = Math.min(1, thickness / TILE);
  if (alongY) {
    push([[-h, 0, d1], [h, 0, d1], [h, height, d1], [-h, height, d1]], posFaceCell);
    push([[h, 0, d0], [-h, 0, d0], [-h, height, d0], [h, height, d0]], negFaceCell);
    push([[h, 0, d1], [h, 0, d0], [h, height, d0], [h, height, d1]], DOOR_TOP, edgeSpan, 1);
    push([[-h, 0, d0], [-h, 0, d1], [-h, height, d1], [-h, height, d0]], DOOR_TOP, edgeSpan, 1);
    push([[-h, height, d1], [h, height, d1], [h, height, d0], [-h, height, d0]], DOOR_TOP, 1, edgeSpan);
  } else {
    push([[d1, 0, h], [d1, 0, -h], [d1, height, -h], [d1, height, h]], posFaceCell);
    push([[d0, 0, -h], [d0, 0, h], [d0, height, h], [d0, height, -h]], negFaceCell);
    push([[d0, 0, h], [d1, 0, h], [d1, height, h], [d0, height, h]], DOOR_TOP, edgeSpan, 1);
    push([[d1, 0, -h], [d0, 0, -h], [d0, height, -h], [d1, height, -h]], DOOR_TOP, edgeSpan, 1);
    push([[d1, height, h], [d1, height, -h], [d0, height, -h], [d0, height, h]], DOOR_TOP, 1, edgeSpan);
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

export const DOOR_VERTEX = FLOOR_VERTEX;

// Unlike doors, wall quads must keep their screen coverage aligned with the solid backing at grazing angles.
export const WALL_VERTEX = FLOOR_VERTEX;

export const DOOR_FRAGMENT = FLOOR_FRAGMENT;
// walls are bigger and nearer than doors, so their patches are smaller and there are fewer of them
export const WALL_FRAGMENT = FLOOR_FRAGMENT;
