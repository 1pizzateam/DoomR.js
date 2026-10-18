/**
 * The player's shotgun, as pixel art drawn here in code (no image files), modelled on the classic Doom / Doom II
 * pump-action shotgun (SHTG):
 * - In idle and firing (flashA, flashB) frames, the gun sits low at the bottom centre of the screen and is
 *   strongly foreshortened toward the horizon (SHTGA0 perspective): wide faceted gunmetal receiver at the bottom edge,
 *   rapidly converging cylindrical blued-steel barrel with perforated cooling slots, ventilated top sighting rib and
 *   brass front bead, and the ribbed dark walnut forend hugging the underside of the barrel.
 * - In the two pump frames (pumpA, pumpB), the marine lifts the shotgun slightly in 3D perspective
 *   (SHTGB0 / SHTGC0) while his leather-gloved left hand and forearm rack the ribbed wooden forend back,
 *   opening the breech and ejecting a spent red-and-brass 12-gauge shell.
 *
 * Frames are 192 x 256 pixels side by side in one atlas.
 */

import { Trigo, Utils } from '@1pizzateam/spock';

export const WEAPON_CELL_W = 192;
export const WEAPON_CELL_H = 256;
export const WEAPON_FRAMES = { idle: 0, flashA: 1, flashB: 2, pumpA: 3, pumpB: 4 };
export const WEAPON_FRAME_COUNT = 5;

export const WEAPON_ORDER = ['shotgun', 'chainsaw', 'chaingun', 'rocket'];
export const WEAPON_SLOTS = { 1: 'chainsaw', 2: 'shotgun', 3: 'chaingun', 4: 'rocket' };

export const WEAPONS = {
  knife: {
    id: 'knife',
    slot: 1,
    label: 'KNIFE',
    ammoType: null,
    ammoCost: 0,
    cooldown: 0.3,
    reach: 42,
    damage: 3,
  },
  chainsaw: {
    id: 'chainsaw',
    slot: 1,
    label: 'CHAINSAW',
    ammoType: null,
    ammoCost: 0,
    cooldown: 0.14,
    reach: 38,
    damage: 3,
  },
  shotgun: {
    id: 'shotgun',
    slot: 2,
    label: 'SHOTGUN',
    ammoType: 'shells',
    ammoCost: 1,
    cooldown: 1.05,
    pellets: 6,
    damage: 3,
    minDamage: 1,
    spread: 0.105,
    falloffStart: 120,
    falloffEnd: 480,
  },
  chaingun: {
    id: 'chaingun',
    slot: 3,
    label: 'CHAINGUN',
    ammoType: 'bullets',
    ammoCost: 1,
    cooldown: 0.13,
    damage: 2,
    spread: 0.035,
  },
  rocket: {
    id: 'rocket',
    slot: 4,
    label: 'ROCKET',
    ammoType: 'rockets',
    ammoCost: 1,
    cooldown: 0.78,
    damage: 45,
    splashDamage: 40,
    splashRadius: 165,
    speed: 520,
  },
};

const W = WEAPON_CELL_W;
const H = WEAPON_CELL_H;
const CX = 96;
// Low horizon-aimed muzzle tip (occupies only the bottom third of the 256px cell so the gun points into the horizon)
const MUZZLE_Y = 166;

const STEEL = [
  [9, 11, 15],
  [18, 21, 28],
  [31, 36, 46],
  [48, 56, 70],
  [72, 82, 100],
  [104, 116, 138],
  [144, 158, 182],
  [194, 208, 228]
];

const BOLT = [
  [30, 34, 42],
  [60, 68, 82],
  [98, 110, 128],
  [140, 154, 174],
  [180, 194, 212],
  [216, 224, 238]
];

const WOOD = [
  [36, 20, 10],
  [64, 38, 18],
  [96, 55, 26],
  [128, 74, 35],
  [160, 94, 45],
  [190, 116, 56]
];

const GLOVE = [
  [28, 17, 10],
  [46, 28, 17],
  [70, 44, 26],
  [96, 62, 38],
  [124, 82, 50],
  [152, 104, 64]
];

const ARM = [
  [54, 32, 20],
  [82, 50, 32],
  [114, 72, 48],
  [144, 94, 64],
  [172, 116, 80],
  [194, 138, 98]
];

const CUFF = [
  [16, 20, 16],
  [28, 36, 26],
  [44, 56, 38],
  [64, 80, 54],
  [88, 106, 74]
];

const BRASS = [
  [82, 60, 18],
  [132, 98, 30],
  [178, 134, 44],
  [215, 170, 64],
  [226, 186, 98]
];

const SHELL = [
  [85, 14, 14],
  [138, 22, 22],
  [188, 34, 34],
  [225, 62, 62]
];

const FIRE_RAMP = [
  [72, 14, 6],
  [128, 22, 8],
  [182, 42, 10],
  [224, 78, 14],
  [248, 128, 22],
  [255, 186, 44],
  [255, 232, 116],
  [255, 254, 238]
];

const HAZARD_YELLOW = [
  [58, 42, 8],
  [104, 76, 14],
  [154, 114, 22],
  [198, 152, 30],
  [232, 184, 42],
  [252, 212, 74]
];

const OLIVE_DRAB = [
  [18, 22, 14],
  [34, 42, 26],
  [54, 66, 42],
  [78, 94, 60],
  [106, 126, 82],
  [138, 160, 108]
];

/** The seconds after a shot at which each frame of the animation starts. Deliberate, weighty pump-action cycle. */
export const WEAPON_TIMES = { flashA: 0, flashB: 0.055, rest: 0.12, pumpA: 0.28, pumpB: 0.48, pumpBack: 0.74, done: 0.94 };

/** Which frame to show `elapsed` seconds after a shot. The pump only works when there is a shell to load. */
export function weaponFrame(elapsed, hasAmmo = true, weapon = 'shotgun', time = 0) {
  if (!Number.isFinite(elapsed) || elapsed < 0) {
    if (weapon === 'chainsaw')
      return (Math.floor(time * 14) & 1) === 0 ? WEAPON_FRAMES.idle : WEAPON_FRAMES.pumpA;
    return WEAPON_FRAMES.idle;
  }
  if (weapon === 'chainsaw') {
    if (elapsed < 0.06)
      return WEAPON_FRAMES.flashA;
    if (elapsed < 0.12)
      return WEAPON_FRAMES.flashB;
    return WEAPON_FRAMES.idle;
  }
  if (weapon === 'chaingun') {
    if (elapsed < 0.032)
      return WEAPON_FRAMES.flashA;
    if (elapsed < 0.065)
      return WEAPON_FRAMES.flashB;
    if (elapsed < 0.098)
      return WEAPON_FRAMES.pumpA;
    if (elapsed < 0.13)
      return WEAPON_FRAMES.pumpB;
    if (hasAmmo) {
      if (elapsed < 0.21)
        return WEAPON_FRAMES.pumpA;
      if (elapsed < 0.31)
        return WEAPON_FRAMES.pumpB;
      if (elapsed < 0.41)
        return WEAPON_FRAMES.pumpA;
    }
    return WEAPON_FRAMES.idle;
  }
  if (weapon === 'rocket') {
    if (elapsed < 0.09)
      return WEAPON_FRAMES.flashA;
    if (elapsed < 0.24)
      return WEAPON_FRAMES.flashB;
    if (hasAmmo) {
      if (elapsed < 0.48)
        return WEAPON_FRAMES.pumpA;
      if (elapsed < 0.68)
        return WEAPON_FRAMES.pumpB;
    }
    return WEAPON_FRAMES.idle;
  }
  const t = WEAPON_TIMES;
  if (elapsed < t.flashB)
    return WEAPON_FRAMES.flashA;
  if (elapsed < t.rest)
    return WEAPON_FRAMES.flashB;
  if (hasAmmo) {
    if (elapsed >= t.pumpA && elapsed < t.pumpB)
      return WEAPON_FRAMES.pumpA;
    if (elapsed >= t.pumpB && elapsed < t.pumpBack)
      return WEAPON_FRAMES.pumpB;
    if (elapsed >= t.pumpBack && elapsed < t.done)
      return WEAPON_FRAMES.pumpA;
  }
  return WEAPON_FRAMES.idle;
}

/**
 * Where the gun goes on a screen of `width` x `height` CSS pixels: a rectangle `{ x0, y0, x1, y1, pixel }`, y down.
 * Pixels of the art are whole screen pixels, so it stays sharp. It sways as the player walks and rises with the kick;
 * it stands a few art pixels below the edge, so the kick never shows a gap under it.
 */
export function weaponPlacement({ width, height, bob = 0, moving = 0, recoil = 0, switchOffset = 0 }) {
  const scale = Math.min(1.4, Math.max(0.7, height / 760));
  const pixel = Math.max(2, Math.round(2 * scale));
  const sway = Math.sin(bob) * 14 * moving * scale;
  const rise = Math.abs(Math.cos(bob)) * 8 * moving * scale;
  const drop = Math.round(Utils.clamp(switchOffset, 0, 1) * H * pixel * 0.45);
  const x0 = Math.round(width / 2 + sway - (W / 2) * pixel);
  const y1 = Math.round(height + 16 + 8 * pixel + rise - recoil * 6 * pixel) + drop;
  return { x0, y0: y1 - H * pixel, x1: x0 + W * pixel, y1, pixel };
}

/** Texture coordinates of a frame, a hair inside its edges: [u0, v0, u1, v1], v1 at the top of the picture. */
export function weaponCellUv(frame, weapon) {
  const f = Utils.clamp(frame | 0, 0, WEAPON_FRAME_COUNT - 1);
  const inset = 0.02 / (W * WEAPON_FRAME_COUNT);
  const u0 = f / WEAPON_FRAME_COUNT + inset;
  const u1 = (f + 1) / WEAPON_FRAME_COUNT - inset;
  if (!weapon)
    return [u0, 0, u1, 1];
  const rowIndex = Math.max(0, WEAPON_ORDER.indexOf(weapon));
  const rows = WEAPON_ORDER.length;
  const vInset = 0.02 / (H * rows);
  const v1 = 1 - rowIndex / rows - vInset;
  const v0 = 1 - (rowIndex + 1) / rows + vInset;
  return [u0, v0, u1, v1];
}

// ---- drawing -------------------------------------------------------------------------------------------------------

const BAYER4 = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5
];

function hash(x, y) {
  let h = Math.imul(x * 374761393 + y * 668265263, 1103515245);
  h ^= h >>> 13;
  return ((Math.imul(h, 1274126177) >>> 0) % 1024) / 1024;
}

class Art {
  constructor() {
    this.pixels = new Uint8Array(W * H * 4);
  }

  put(x, y, color) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H)
      return;
    const o = (y * W + x) * 4;
    this.pixels[o] = color[0];
    this.pixels[o + 1] = color[1];
    this.pixels[o + 2] = color[2];
    this.pixels[o + 3] = 255;
  }

  has(x, y) {
    return x >= 0 && y >= 0 && x < W && y < H && this.pixels[(y * W + x) * 4 + 3] > 0;
  }

  rect(x0, y0, w, h, color) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        this.put(x, y, color);
  }

  line(x0, y0, x1, y1, color) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) || 1;
    for (let i = 0; i <= steps; i++)
      this.put(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, color);
  }

  circle(cx, cy, r, color) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r)
          this.put(x, y, color);
  }

  /**
   * Fills a polygon. `shade(u, v, x, y)` returns the colour, u 0..1 across the shape on that row and v 0..1 down it.
   */
  fill(points, shade) {
    const inside = (x, y) => {
      let hit = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
          hit = !hit;
      }
      return hit;
    };
    const ys = points.map((p) => p[1]);
    const top = Math.floor(Math.min(...ys));
    const bottom = Math.ceil(Math.max(...ys));
    for (let y = top; y <= bottom; y++) {
      const row = [];
      for (let x = 0; x < W; x++)
        if (inside(x + 0.5, y + 0.5))
          row.push(x);
      if (!row.length)
        continue;
      const first = row[0];
      const span = Math.max(1, row[row.length - 1] - first);
      const v = (y - top) / Math.max(1, bottom - top);
      for (const x of row)
        this.put(x, y, shade((x - first) / span, v, x, y));
    }
  }
}

/** A colour from a ramp, `t` 0..1, dithered with a 4x4 Bayer matrix so it reads as smooth shading. */
function ramp(colors, t, x, y) {
  const at = Math.min(colors.length - 1, Math.max(0, t * (colors.length - 1)));
  const low = Math.floor(at);
  const high = Math.min(colors.length - 1, low + 1);
  const mix = at - low;
  const dither = (BAYER4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
  return mix > dither ? colors[high] : colors[low];
}

/** Cylindrical steel lit from upper-left: bright specular ridge left of centre, deep gunmetal shadow on the right. */
const steelCyl = (bias = 0) => (u, v, x, y) => {
  const spec = Math.exp(-(((u - 0.32) / 0.16) ** 2)) * 0.58;
  const body = Math.max(0, 1 - Math.abs(u - 0.38) * 1.5) * 0.48;
  const rim = u > 0.8 ? (u - 0.8) * 0.85 : 0;
  return ramp(STEEL, Math.min(1, Math.max(0, 0.04 + body + spec + rim + bias)), x, y);
};

/**
 * Classic Doom centered shotgun (SHTGA0), heavily foreshortened so it sits low at the bottom of the screen and points
 * horizontally forward toward the horizon.
 */
function drawCenteredGun(a, lit) {
  // 1. Wide foreshortened gunmetal receiver at the bottom edge (y = 216..255)
  const recTop = 216;
  for (let y = recTop; y < H; y++) {
    const v = (y - recTop) / (H - 1 - recTop);
    const p = v ** 1.15;
    const shoulderCurve = v < 0.22 ? Math.sin((v / 0.22) * (Math.PI / 2)) : 1;
    const halfW = Math.round(20 + shoulderCurve * 5 + p * 12);
    const flatHalf = Math.round(13 + p * 7);
    const bevelHalf = Math.round(18 + shoulderCurve * 4 + p * 10);

    for (let x = CX - halfW; x <= CX + halfW; x++) {
      const dx = x - CX;
      const adx = Math.abs(dx);
      if (adx === halfW) {
        a.put(x, y, STEEL[0]);
        continue;
      }
      let shade = 0.24;
      if (adx <= 5)
        shade = adx === 5 ? 0.54 : 0.1 + (1 - adx / 5) * 0.06;
      else if (adx <= flatHalf)
        shade = dx < 0 ? 0.5 - (adx - 5) * 0.012 : 0.36 - (adx - 5) * 0.012;
      else if (adx <= bevelHalf) {
        const bu = (adx - flatHalf) / Math.max(1, bevelHalf - flatHalf);
        if (dx < 0)
          shade = 0.78 - bu * 0.24;
        else
          shade = 0.26 - bu * 0.1;
      } else {
        const wu = (adx - bevelHalf) / Math.max(1, halfW - bevelHalf);
        shade = dx < 0 ? 0.28 - wu * 0.16 : 0.14 - wu * 0.08;
      }
      shade += (hash(x, y) - 0.5) * 0.05;
      a.put(x, y, ramp(STEEL, shade, x, y));
    }

    // Anti-glare serrations down the centre receiver sighting channel
    if (y >= 224 && y % 2 === 0)
      a.line(CX - 4, y, CX + 4, y, STEEL[0]);

    // Machined horizontal grip grooves on the lower receiver flanks
    if (y >= 232 && y <= 253 && y % 3 === 0) {
      a.line(CX - bevelHalf + 1, y, CX - flatHalf - 2, y, STEEL[1]);
      a.line(CX + flatHalf + 2, y, CX + bevelHalf - 1, y, STEEL[0]);
    }
  }

  // Foreshortened side ejection port slit along the right receiver bevel
  for (let y = 224; y <= 240; y++) {
    const portL = CX + 17 + Math.round((y - 224) * 0.22);
    const portR = portL + 4;
    a.put(portL, y, STEEL[0]);
    for (let x = portL + 1; x < portR; x++)
      a.put(x, y, y === 224 || y === 240 ? STEEL[0] : BOLT[2]);
    a.put(portR, y, STEEL[0]);
  }

  // Receiver locking pins on the left cheek
  for (const [px, py] of [[CX - 23, 228], [CX - 28, 244]]) {
    a.circle(px, py, 2, STEEL[0]);
    a.put(px - 1, py - 1, STEEL[5]);
    a.put(px, py, STEEL[2]);
  }

  // 2. Foreshortened ribbed walnut pump forend (y = 180..224, wide at the rear and tapering sharply toward the horizon)
  const foreTop = 180;
  const foreBot = 224;
  for (let y = foreTop; y <= foreBot; y++) {
    const v = (y - foreTop) / (foreBot - foreTop);
    const p = v ** 1.2;
    const curve = Math.sin(v * Math.PI);
    const shoulder = v < 0.14 ? Math.sin((v / 0.14) * (Math.PI / 2)) : v > 0.86 ? Math.sin(((1 - v) / 0.14) * (Math.PI / 2)) : 1;
    // Strong perspective flare from front (16px) to rear (29px) so the forend reads as horizontal
    const halfW = Math.round((16 + p * 12 + curve * 3.5) * (0.76 + 0.24 * shoulder));
    // Perspective-compressed rib spacing (tighter near the front, wider near the camera)
    const ribCoord = Math.floor((v ** 0.78) * 11 * 4);
    const ribPhase = ribCoord % 4;
    const isGroove = ribPhase === 0;
    const isHighlight = ribPhase === 1 || ribPhase === 2;
    for (let x = CX - halfW; x <= CX + halfW; x++) {
      const u = (x - (CX - halfW)) / Math.max(1, halfW * 2);
      const edgeDist = 1 - Math.abs(u - 0.5) * 2;
      if (edgeDist < 0.05) {
        a.put(x, y, WOOD[0]);
        continue;
      }
      const sideLight = u < 0.5 ? 0.7 + (0.5 - u) * 0.34 : 0.5 - (u - 0.5) * 0.26;
      const grain = (hash(x, y >> 1) - 0.5) * 0.14;
      let shade = sideLight * Math.min(1, edgeDist * 1.9) + grain;
      if (isGroove)
        shade -= 0.26;
      else if (isHighlight)
        shade += 0.15;
      a.put(x, y, ramp(WOOD, shade, x, y));
    }
  }

  // Deep shadow channel where the horizontal barrel sits inside the wooden forend
  const barrelBot = 228;
  for (let y = foreTop; y <= foreBot; y++) {
    const t = ((y - MUZZLE_Y) / (barrelBot - MUZZLE_Y)) ** 1.18;
    const bHalf = Math.round(9 + t * 10) + 1;
    a.put(CX - bHalf, y, STEEL[0]);
    a.put(CX - bHalf - 1, y, WOOD[0]);
    a.put(CX + bHalf, y, STEEL[0]);
    a.put(CX + bHalf + 1, y, WOOD[0]);
  }

  // 3. Foreshortened cylindrical blued-steel barrel & heat-shield shroud (y = 166..228)
  const barrelTop = MUZZLE_Y;
  for (let y = barrelTop; y <= barrelBot; y++) {
    const v = (y - barrelTop) / (barrelBot - barrelTop);
    const p = v ** 1.18;
    const ringCurve = y > 220 ? Math.cos(((y - 220) / 8) * (Math.PI / 2)) * 2 : 0;
    const halfW = Math.round(9 + p * 10 - (y > 220 ? 2 - ringCurve : 0));
    for (let x = CX - halfW; x <= CX + halfW; x++) {
      if (x === CX - halfW || x === CX + halfW) {
        a.put(x, y, STEEL[0]);
        continue;
      }
      const u = (x - (CX - halfW)) / (halfW * 2);
      const ringBias = y === 216 || y === 220 ? -0.22 : y >= 217 && y <= 219 ? 0.12 : 0;
      a.put(x, y, steelCyl(-v * 0.03 + ringBias)(u, v, x, y));
    }
  }

  // Perspective-foreshortened cooling slots along the upper barrel heat shield
  for (const [sy, sh] of [[176, 2], [182, 2], [189, 3], [197, 3], [206, 4]]) {
    const v = (sy - barrelTop) / (barrelBot - barrelTop);
    const p = v ** 1.18;
    const off = Math.round(5.5 + p * 5);
    for (let dy = 0; dy < sh; dy++) {
      const w = sh >= 3 && (dy === 0 || dy === sh - 1) ? 2 : 3;
      for (let dx = 0; dx < w; dx++) {
        a.put(CX - off - dx, sy + dy, dy === sh - 1 ? STEEL[5] : STEEL[0]);
        a.put(CX + off + dx, sy + dy, dy === sh - 1 ? STEEL[3] : STEEL[0]);
      }
    }
  }

  // Front barrel band / heat-shield collar near the muzzle (y = 171..174)
  for (let y = 171; y <= 174; y++) {
    const halfW = 10;
    for (let x = CX - halfW; x <= CX + halfW; x++) {
      if (x === CX - halfW || x === CX + halfW) {
        a.put(x, y, STEEL[0]);
        continue;
      }
      const u = (x - (CX - halfW)) / (halfW * 2);
      const b = y === 171 ? 0.18 : y === 174 ? -0.22 : 0.05;
      a.put(x, y, steelCyl(b)(u, 0, x, y));
    }
  }

  // Strongly foreshortened horizontal muzzle crown & dark bore at the tip (flat ellipse showing horizon aim)
  for (let y = MUZZLE_Y - 2; y <= MUZZLE_Y + 2; y++)
    for (let x = CX - 9; x <= CX + 9; x++) {
      const dx = (x - CX) / 9;
      const dy = (y - MUZZLE_Y) / 2.2;
      const d = Math.hypot(dx, dy);
      if (d <= 1.05) {
        if (d > 0.72)
          a.put(x, y, dy < 0 ? STEEL[6] : STEEL[2]);
        else if (d > 0.5)
          a.put(x, y, STEEL[1]);
        else
          a.put(x, y, STEEL[0]);
      }
    }

  // 4. Perspective-tapering ventilated sighting rib running down the top centre of the barrel
  for (let y = MUZZLE_Y + 1; y <= barrelBot; y++) {
    const v = (y - MUZZLE_Y) / (barrelBot - MUZZLE_Y);
    const ribHalf = v > 0.65 ? 5 : v > 0.28 ? 4 : 3;
    const isVent = Math.floor((v ** 0.8) * 28) % 4 < 2;
    for (let x = CX - ribHalf; x <= CX + ribHalf; x++) {
      if (x === CX - ribHalf)
        a.put(x, y, STEEL[1]);
      else if (x === CX - ribHalf + 1)
        a.put(x, y, isVent ? STEEL[4] : STEEL[6]);
      else if (x === CX + ribHalf)
        a.put(x, y, STEEL[0]);
      else
        a.put(x, y, isVent ? STEEL[1] : STEEL[2]);
    }
  }

  // Front iron sight pedestal and bright brass aiming bead at the muzzle
  a.rect(CX - 2, MUZZLE_Y - 4, 5, 4, STEEL[2]);
  a.line(CX - 1, MUZZLE_Y - 4, CX - 1, MUZZLE_Y - 1, STEEL[5]);
  a.rect(CX - 1, MUZZLE_Y - 6, 3, 3, BRASS[3]);
  a.put(CX, MUZZLE_Y - 6, BRASS[4]);
  a.put(CX + 1, MUZZLE_Y - 4, BRASS[1]);

  // 5. Warm golden-orange muzzle-flash reflection down the barrel, forend and receiver
  if (lit)
    applyFlashLight(a, CX, MUZZLE_Y, lit);
}

/**
 * Classic Doom pump-action reload frames (`pumpA` / `pumpB`) in 3D foreshortened perspective:
 * The shotgun stays pointed forward toward the horizon (matching `drawCenteredGun`), lifting slightly and canting
 * only ~9° in `pumpA` and ~14° in `pumpB` so it never swings sideways across the camera.
 * The ribbed walnut forend slides backward along the barrel toward the receiver, gripped on its left-underside by
 * the marine's gloved left hand (thumb along the left flank pointing toward the muzzle, fingers tucked underneath
 * the walnut forend so the barrel and wood sit cleanly on top of the palm).
 */
function drawAngledPumpGun(a, pump = 1) {
  // Subtle lift & slight leftward cant (~9° in pumpA, ~14° in pumpB) while pointing into the horizon
  const topY = pump === 2 ? 140 : 146;
  const topX = pump === 2 ? 112 : 118;
  const botX = pump === 2 ? 138 : 134;
  const spanY = H - 1 - topY;
  const centerAt = (y) => topX + ((y - topY) / spanY) * (botX - topX);

  const recTop = 212;
  // Walnut forend slides backward along the barrel toward the receiver:
  // In pumpA: y = 160..198; in pumpB: y = 173..211 (right up against recTop = 212, exposing the chrome action bars ahead)
  const foreTop = pump === 2 ? 173 : 160;
  const foreBot = pump === 2 ? 211 : 198;

  const foreHalfAt = (y) => {
    const v = Math.max(0, Math.min(1, (y - foreTop) / Math.max(1, foreBot - foreTop)));
    const p = v ** 1.08;
    const curve = Math.sin(Math.min(1, v * 1.12) * Math.PI) * 2.5;
    return 15.0 + p * 10.5 + curve;
  };

  // Wrist sits just below the bottom-left edge of the walnut forend, giving the forearm 45-58px of natural vertical reach
  const wristY = foreBot + 2;
  const wristX = Math.round(centerAt(foreBot) - foreHalfAt(foreBot) - 2);
  const elbowX = pump === 2 ? 82 : 74;

  // 1. Background Layer: Marine's muscular left forearm, olive wrist cuff, and under-forend palm/fingers
  //    Drawn BEFORE the shotgun receiver & barrel so the fingers tuck naturally UNDERNEATH the walnut forend!
  for (let y = Math.max(0, Math.floor(wristY - 3)); y < H; y++) {
    const v = (y - wristY) / Math.max(1, H - 1 - wristY);
    const cx = wristX + (elbowX - wristX) * (v ** 0.92);
    const swell = Math.sin(Math.min(1, v * 1.15) * Math.PI) * 4.5;
    const halfW = 14.0 + v * 5.5 + swell;
    for (let x = Math.floor(cx - halfW); x <= Math.ceil(cx + halfW); x++) {
      const u = (x - (cx - halfW)) / (halfW * 2);
      if (u < 0 || u > 1)
        continue;
      if (u < 0.06 || u > 0.94) {
        a.put(x, y, ARM[0]);
        continue;
      }
      const muscle = Math.sin(u * Math.PI) * 0.65 + (u < 0.44 ? 0.22 : -0.06);
      const tendon = Math.exp(-(((u - 0.38) / 0.13) ** 2)) * 0.2 * (1 - v * 0.4);
      a.put(x, y, ramp(ARM, muscle + tendon - v * 0.05 + (hash(x, y) - 0.5) * 0.07, x, y));
    }
  }

  // Olive green wrist cuff at the base of the leather glove
  a.fill([
    [wristX - 14, wristY - 4],
    [wristX + 14, wristY + 3],
    [wristX + 12, wristY + 10],
    [wristX - 16, wristY + 3]
  ], (u, v, x, y) => {
    if (u < 0.07 || u > 0.93 || v < 0.12 || v > 0.88)
      return CUFF[0];
    return ramp(CUFF, (1 - Math.abs(u - 0.35) * 1.4) * 0.8 + 0.1, x, y);
  });

  // Under-forend palm & 4 knuckles curling underneath the bottom-left rim of the walnut forend (background layer)
  for (let y = foreBot - 10; y <= wristY + 2; y++) {
    const v = (y - (foreBot - 10)) / Math.max(1, wristY + 2 - (foreBot - 10));
    const cx = centerAt(y);
    const fHalf = foreHalfAt(Math.min(foreBot, y));
    const x0 = Math.round(cx - fHalf - 7 + v * 2);
    const x1 = Math.round(cx + 2 - v * 6);
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0);
      if (u < 0.06 || u > 0.94 || v > 0.94) {
        a.put(x, y, GLOVE[0]);
        continue;
      }
      const knuckle = Math.sin(u * Math.PI * 3.5) * 0.12 * (1 - v);
      const shade = (1 - Math.abs(u - 0.36) * 1.15) * 0.52 + (1 - v) * 0.14 + knuckle + (hash(x, y) - 0.5) * 0.06;
      a.put(x, y, ramp(GLOVE, shade - 0.08, x, y));
    }
  }

  // 2. Middle Layer: The 3D foreshortened shotgun (receiver, exposed twin chrome action bars, sliding walnut forend,
  //    blued-steel barrel with perforated shroud, ventilated top rib, and brass front bead sight)
  // 2A. Heavy machined steel receiver at the bottom of the screen (y = recTop..255)
  for (let y = recTop; y < H; y++) {
    const v = (y - recTop) / (H - 1 - recTop);
    const cx = centerAt(y);
    const halfW = 20 + (v ** 1.05) * 17;
    const x0 = Math.round(cx - halfW);
    const x1 = Math.round(cx + halfW);
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0);
      if (u < 0.035 || u > 0.965) {
        a.put(x, y, STEEL[0]);
        continue;
      }
      // Open ejection port on the upper-right deck/wall of the receiver
      if (v >= 0.08 && v <= 0.58 && u >= 0.62 && u <= 0.88) {
        const openV = pump === 2 ? 0.46 : 0.22;
        if (v < 0.08 + openV) {
          const isBrassLifter = u >= 0.68 && u <= 0.82 && v > 0.18;
          a.put(x, y, isBrassLifter ? BRASS[2] : STEEL[0]);
        } else {
          const bu = (u - 0.62) / 0.26;
          a.put(x, y, ramp(BOLT, 0.35 + (1 - Math.abs(bu - 0.5) * 1.4) * 0.55, x, y));
        }
        continue;
      }

      let shade = 0.22;
      if (u < 0.2)
        shade = 0.14 + (u / 0.2) * 0.46;
      else if (u > 0.8)
        shade = 0.12 + ((1 - u) / 0.2) * 0.24;
      else {
        const cu = (u - 0.2) / 0.6;
        shade = 0.62 - Math.abs(cu - 0.4) * 0.42 - v * 0.12;
        if (Math.abs(u - 0.2) < 0.025 || Math.abs(u - 0.8) < 0.025)
          shade = 0.82;
        if (Math.abs(cu - 0.5) < 0.025)
          shade -= 0.16;
      }
      if (((y - recTop) % 5 === 0) && (u < 0.18 || u > 0.82))
        shade -= 0.15;
      a.put(x, y, ramp(STEEL, shade + (hash(x, y) - 0.5) * 0.05, x, y));
    }
  }

  // 2B. Under-barrel magazine tube & twin gleaming chrome action bars exposed ahead of the pulled-back walnut forend
  const exposedTop = topY + 10;
  const exposedBot = recTop + 2;
  for (let y = exposedTop; y <= exposedBot; y++) {
    const v = (y - topY) / spanY;
    const cx = centerAt(y);
    const barHalfW = 9.5 + (v ** 1.1) * 12.5;
    for (let x = Math.round(cx - barHalfW); x <= Math.round(cx + barHalfW); x++) {
      const d = Math.abs(x - cx) / barHalfW;
      if (d > 0.9)
        a.put(x, y, STEEL[0]);
      else if (d > 0.64) {
        // Gleaming chrome twin action bars that pull the pump forend back into the receiver
        const rodU = (d - 0.64) / 0.26;
        a.put(x, y, ramp(BOLT, 0.42 + Math.sin(rodU * Math.PI) * 0.52, x, y));
      } else
        a.put(x, y, STEEL[1]);
    }
  }

  // 2C. Ribbed walnut pump forend (slid back along the barrel to foreTop..foreBot)
  for (let y = foreTop; y <= foreBot; y++) {
    const v = (y - foreTop) / Math.max(1, foreBot - foreTop);
    const cx = centerAt(y);
    const halfW = foreHalfAt(y);
    const x0 = Math.round(cx - halfW);
    const x1 = Math.round(cx + halfW);

    const ribPhase = ((v ** 0.82) * 8.5) % 1;
    const isGroove = ribPhase < 0.22;
    const isHighlight = ribPhase >= 0.22 && ribPhase < 0.38;

    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0);
      const edgeDist = 1 - Math.abs(u - 0.5) * 2;
      if (u < 0.045 || u > 0.955 || v < 0.03 || v > 0.97) {
        a.put(x, y, WOOD[0]);
        continue;
      }
      const sideLight = u < 0.5 ? 0.74 + (0.5 - u) * 0.34 : 0.54 - (u - 0.5) * 0.26;
      const grain = (hash(x >> 1, y) - 0.5) * 0.12;
      let shade = sideLight * Math.min(1, edgeDist * 1.9) + grain;
      if (isGroove)
        shade -= 0.26;
      else if (isHighlight)
        shade += 0.14;
      a.put(x, y, ramp(WOOD, shade, x, y));
    }
  }

  // 3. Foreground Left-Flank Grip: The gloved left thumb & radial side of the hand wrapping up the LEFT side of the
  //    walnut forend (drawn BEFORE the central steel barrel so it never covers the barrel, and pointing naturally
  //    forward along the left flank of the wood!)
  const thumbTop = foreTop + 3;
  const palmBot = wristY + 2;
  for (let y = thumbTop; y <= palmBot; y++) {
    const v = (y - thumbTop) / Math.max(1, palmBot - thumbTop); // 0 at thumb tip, 1 at wrist cuff
    const cx = centerAt(y);
    const fHalf = foreHalfAt(Math.min(foreBot, y));
    const woodLeft = cx - fHalf;
    const bHalf = 7.5 + (((y - topY) / (recTop + 6 - topY)) ** 1.15) * 9.0;

    // Outer edge of the glove swells gently around the left side of the wood and tapers into the wrist cuff
    const outerX = woodLeft - (v < 0.45 ? 3.5 + Math.sin((v / 0.45) * Math.PI) * 3.0 : 5.5 - (v - 0.45) * 3.0);
    // Inner edge of the thumb hugs the left side of the walnut forend, staying strictly left of the steel barrel!
    const rawInner = woodLeft + (v < 0.35 ? 3.0 + v * 12.0 : 7.2 + (v - 0.35) * 5.0);
    const innerX = Math.min(cx - bHalf - 1.5, rawInner);
    const x0 = Math.round(outerX);
    const x1 = Math.round(innerX);
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0);
      if (u < 0.1 || u > 0.9 || v < 0.05 || v > 0.95) {
        a.put(x, y, GLOVE[0]);
        continue;
      }
      // Subtle thumb knuckle crease at v ≈ 0.36
      const crease = Math.abs(v - 0.36) < 0.04 ? -0.15 : 0;
      const shade = Math.sin(u * Math.PI) * 0.56 + (1 - v * 0.35) * 0.18 + crease - 0.06 + (hash(x, y) - 0.5) * 0.06;
      a.put(x, y, ramp(GLOVE, shade, x, y));
    }
  }

  // 4. Top Layer: Central blued-steel barrel, perforated heat shield, ventilated sighting rib & brass bead (y = topY..recTop + 6)
  //    Drawn AFTER the hand so the barrel sits cleanly ON TOP OF the grip without any part of the hand crossing over it!
  const bEnd = recTop + 6;
  for (let y = topY; y <= bEnd; y++) {
    const v = (y - topY) / (bEnd - topY);
    const p = v ** 1.15;
    const cx = centerAt(y);
    const halfW = 7.5 + p * 9.0;
    const x0 = Math.round(cx - halfW);
    const x1 = Math.round(cx + halfW);
    const shroudSlot = y > topY + 6 && y < bEnd - 6 && (Math.floor((v ** 0.78) * 14) % 2 === 0);

    // Shadow channel on the walnut forend right beside the barrel
    if (y >= foreTop && y <= foreBot) {
      a.put(x0 - 1, y, WOOD[0]);
      a.put(x1 + 1, y, WOOD[0]);
    }

    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0);
      if (u < 0.06 || u > 0.94) {
        a.put(x, y, STEEL[0]);
        continue;
      }
      if (shroudSlot && ((u > 0.15 && u < 0.27) || (u > 0.73 && u < 0.85))) {
        a.put(x, y, STEEL[0]);
        continue;
      }
      a.put(x, y, steelCyl(0)(u, v, x, y));
    }

    // Elevated ventilated sighting rib down the top center of the barrel
    const ribHalf = 2.8 + p * 2.8;
    const rx0 = Math.round(cx - ribHalf);
    const rx1 = Math.round(cx + ribHalf);
    const ribPost = Math.floor((v ** 0.78) * 12) % 2 === 0;
    for (let x = rx0; x <= rx1; x++) {
      const ru = (x - rx0) / Math.max(1, rx1 - rx0);
      if (ru < 0.15 || ru > 0.85)
        a.put(x, y, STEEL[0]);
      else {
        const postBoost = ribPost ? 0.08 : -0.1;
        a.put(x, y, ramp(STEEL, 0.56 - Math.abs(ru - 0.38) * 0.45 - v * 0.12 + postBoost, x, y));
      }
    }
  }

  // Foreshortened elliptical muzzle crown & front brass bead sight at (topX, topY)
  for (let y = topY - 4; y <= topY + 5; y++)
    for (let x = topX - 11; x <= topX + 11; x++) {
      const d = Math.hypot((x - topX) / 8.0, (y - (topY + 1)) / 2.3);
      if (d <= 1.05) {
        if (d > 0.78)
          a.put(x, y, STEEL[0]);
        else if (d > 0.48)
          a.put(x, y, y < topY + 1 ? STEEL[6] : STEEL[3]);
        else
          a.put(x, y, STEEL[0]);
      }
    }
  a.put(topX, topY - 3, BRASS[3]);
  a.put(topX - 1, topY - 3, BRASS[2]);
  a.put(topX, topY - 2, BRASS[2]);
  a.put(topX, topY - 1, STEEL[4]);

  // 5. Spent red-and-brass 12-gauge shell ejecting to the upper-right from the open breech in pumpB
  if (pump >= 2) {
    const ex = Math.round(centerAt(recTop + 6) + 34);
    const ey = recTop - 2;
    const sAngle = -0.42;
    const sc = Math.cos(sAngle);
    const ss = Math.sin(sAngle);
    for (let dy = -9; dy <= 9; dy++)
      for (let dx = -12; dx <= 12; dx++) {
        const rx2 = dx * sc - dy * ss;
        const ry2 = dx * ss + dy * sc;
        if (Math.abs(rx2) <= 8.5 && Math.abs(ry2) <= 3.6) {
          const v = (ry2 + 3.6) / 7.2;
          const cyl = Math.sin(v * Math.PI);
          if (rx2 < -3.5) {
            const rim = rx2 < -7 ? 0.15 : 0;
            a.put(ex + dx, ey + dy, ramp(BRASS, 0.25 + cyl * 0.65 + rim, ex + dx, ey + dy));
          } else
            a.put(ex + dx, ey + dy, ramp(SHELL, 0.2 + cyl * 0.72, ex + dx, ey + dy));
        }
      }
  }
}

function applyFlashLight(a, cx, cy, strength) {
  for (let y = MUZZLE_Y - 8; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!a.has(x, y))
        continue;
      const dist = Math.hypot(x - cx, (y - cy) * 1.15);
      const k = Math.max(0, 1 - dist / 92) * 0.64 * strength;
      if (k <= 0)
        continue;
      const o = (y * W + x) * 4;
      const warm = ((x + y) & 1) ? k : k * 0.78;
      a.pixels[o] = Math.min(228, Math.round(a.pixels[o] + (245 - a.pixels[o]) * warm));
      a.pixels[o + 1] = Math.min(185, Math.round(a.pixels[o + 1] + (165 - a.pixels[o + 1]) * warm));
      a.pixels[o + 2] = Math.round(a.pixels[o + 2] + (65 - a.pixels[o + 2]) * warm * 0.6);
    }
}

/**
 * Angular flame lobe helper: returns 0..1 peak centered at `targetAngle` with half-width `width`.
 */
function flameSpike(angle, targetAngle, width, sharpness = 1.25) {
  let diff = Math.abs(angle - targetAngle);
  if (diff > Math.PI)
    diff = Math.PI * 2 - diff;
  if (diff >= width)
    return 0;
  return (1 - diff / width) ** sharpness;
}

/**
 * Classic Doom (SHTFA0 / SHTFB0) volumetric 3D foreshortened muzzle blast:
 * Because the shotgun is aimed horizontally into the horizon, the blast expands around the muzzle crown in perspective
 * (wide horizontal side-flares, upper-diagonal flame plumes, and a central fireball), while the near barrel and
 * sighting rib remain in the foreground in front of the lower blast rim.
 */
function drawFlash(a, size, cool, muzzleY = MUZZLE_Y) {
  const cy = muzzleY - 2;
  const rx = cool ? 28 : 44;
  const ry = cool ? 20 : 31;

  for (let y = Math.floor(cy - ry * 1.35); y <= muzzleY + 14; y++)
    for (let x = Math.floor(CX - rx * 1.35); x <= Math.ceil(CX + rx * 1.35); x++) {
      const rawDx = x - CX;
      const rawDy = y - cy;

      // The near barrel (width ~ 20px below muzzleY + 2) is in the foreground in front of the muzzle blast,
      // except right at the muzzle crown (y <= muzzleY + 2) where the plasma core erupts over the lip.
      if (y > muzzleY + 2 && Math.abs(rawDx) < 9 + (y - muzzleY) * 0.22)
        continue;

      const dx = rawDx / rx;
      const dy = rawDy / ry;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);

      // Volumetric Doom SHTFA0 / SHTFB0 flame lobes radiating around the muzzle axis:
      // - Wide horizontal blast wings (left & right)
      // - Thick upper-diagonal fire plumes
      // - Central upward blast tongue
      // - Lower-side perspective flares wrapping around the barrel sides
      const upMain = flameSpike(angle, -Math.PI * 0.5, 0.52, 1.18) * 1.05;
      const diagL = flameSpike(angle, -Math.PI * 0.72, 0.48, 1.2) * (cool ? 0.92 : 1.08);
      const diagR = flameSpike(angle, -Math.PI * 0.28, 0.48, 1.2) * (cool ? 0.96 : 1.1);
      const wingL = flameSpike(angle, -Math.PI * 0.95, 0.46, 1.15) * 1.12;
      const wingR = flameSpike(angle, -Math.PI * 0.05, 0.46, 1.15) * 1.12;
      const lowL = flameSpike(angle, Math.PI * 0.82, 0.36, 1.3) * 0.78;
      const lowR = flameSpike(angle, Math.PI * 0.18, 0.36, 1.3) * 0.78;

      // Organic ragged flame tongues along the perimeter (without thin needle spikes)
      const wave1 = Math.sin(angle * 7 + (cool ? 1.8 : 0.4)) * 0.5 + 0.5;
      const wave2 = Math.cos(angle * 13 - (cool ? 1.1 : 0.2)) * 0.5 + 0.5;
      const licks = (wave1 * 0.65 + wave2 * 0.35) * 0.18;

      const lobe = Math.max(upMain, diagL, diagR, wingL, wingR, lowL, lowR);
      const maxReach = 0.42 + lobe * 0.64 + licks * (0.35 + lobe * 0.65);

      if (dist > maxReach)
        continue;

      const normD = dist / maxReach;
      // 2D cellular/turbulent fire noise so the interior has rolling bright yellow/orange flame pockets
      const cellNoise = (hash(x >> 1, (y >> 1) + (cool ? 31 : 7)) - 0.5) * 0.18;
      const fineNoise = (hash(x, y) - 0.5) * 0.08;
      const heat = Math.min(1, Math.max(0, (1 - normD ** 1.25) * (cool ? 0.92 : 1.12) + cellNoise + fineNoise));

      // Dithered dark-red outer edge so it blends into the dark room instead of a hard sticker border
      if (heat < 0.14 && ((x + y) & 1) === 1)
        continue;

      a.put(x, y, ramp(FIRE_RAMP, heat, x, y));
    }

  // Intense white-yellow fireball core expanding out of the muzzle bore (CX, muzzleY - 1)
  const coreRx = cool ? 8 : 13;
  const coreRy = cool ? 5 : 8;
  for (let y = Math.floor(cy - coreRy); y <= muzzleY + 2; y++)
    for (let x = Math.floor(CX - coreRx); x <= Math.ceil(CX + coreRx); x++) {
      const cd = Math.hypot((x - CX) / coreRx, (y - (muzzleY - 1)) / coreRy);
      if (cd <= 1) {
        const coreHeat = Math.min(1, 0.72 + (1 - cd) * 0.35);
        a.put(x, y, ramp(FIRE_RAMP, coreHeat, x, y));
      }
    }

  // Foreground muzzle rim & glowing front brass sight silhouette at the base of the blast
  a.line(CX - 6, muzzleY + 2, CX + 6, muzzleY + 2, STEEL[2]);
  a.rect(CX - 1, muzzleY - 2, 3, 3, BRASS[4]);
  a.put(CX, muzzleY - 3, FIRE_RAMP[7]);
}

/** One frame of the shotgun animation as RGBA pixels. */
function drawFrame(frame) {
  const a = new Art();
  const f = WEAPON_FRAMES;
  if (frame === f.pumpA)
    drawAngledPumpGun(a, 1);
  else if (frame === f.pumpB)
    drawAngledPumpGun(a, 2);
  else {
    const lit = frame === f.flashA ? 1 : frame === f.flashB ? 0.65 : 0;
    drawCenteredGun(a, lit);
    if (frame === f.flashA)
      drawFlash(a, 1, 0);
    else if (frame === f.flashB)
      drawFlash(a, 0.62, 1);
  }
  return a.pixels;
}

function drawChainsawArt(frame) {
  const a = new Art();
  const active = frame === WEAPON_FRAMES.flashA || frame === WEAPON_FRAMES.flashB;
  const buzzDx = frame === WEAPON_FRAMES.flashA ? -2 : frame === WEAPON_FRAMES.flashB ? 2 : frame === WEAPON_FRAMES.pumpA ? -1 : 0;
  const buzzDy = active ? -3 : frame === WEAPON_FRAMES.pumpA ? 1 : 0;
  const cx = CX + buzzDx;
  const chainPhase = frame * 2;

  // 1. Rear/Lower 2-Stroke Engine Housing, Recoil Starter Louvers & Cylinder Fins (y = 212..H-1)
  const bodyTop = 212 + buzzDy;
  for (let y = bodyTop; y < H; y++) {
    const v = (y - bodyTop) / Math.max(1, H - 1 - bodyTop);
    const p = v ** 1.12;
    const leftHalf = Math.round(26 + p * 14);
    const rightHalf = Math.round(22 + p * 14);
    for (let dx = -leftHalf; dx <= rightHalf; dx++) {
      const x = cx + dx;
      const u = (dx + leftHalf) / Math.max(1, leftHalf + rightHalf);
      if (dx === -leftHalf || dx === rightHalf || y === bodyTop) {
        a.put(x, y, WOOD[0]);
        continue;
      }
      // Dark cast-iron cylinder head & horizontal cooling fins in the upper-middle housing (left of the vertical bar)
      if (dx >= -8 && dx <= 4 && v < 0.52) {
        const fin = (y - bodyTop) % 3 === 0;
        a.put(x, y, fin ? STEEL[4] : STEEL[1]);
        continue;
      }
      // Recoil starter housing on the left flank with horizontal black air-intake louvers
      const recoilLouver = dx < -10 && dx > -leftHalf + 4 && v > 0.22 && v < 0.82 && (y - bodyTop) % 4 < 2;
      if (recoilLouver) {
        a.put(x, y, STEEL[0]);
        continue;
      }
      // Recessed vertical bar-mount channel where the vertical guide bar slots into the engine block (dx = 4..10)
      if (dx >= 4 && dx <= 10 && v < 0.48) {
        a.put(x, y, STEEL[0]);
        continue;
      }
      const cyl = Math.sin(u * Math.PI) * 0.72 + (u < 0.45 ? 0.18 : -0.04);
      a.put(x, y, ramp(HAZARD_YELLOW, cyl + (hash(x, y) - 0.5) * 0.08, x, y));
    }
  }

  // 2. Tubular Wrap-Around Front Handlebar (arches over the left/top of the engine block) & Black Chain-Brake Hand Guard
  const handleTop = 200 + buzzDy;
  for (let y = handleTop; y <= bodyTop + 18; y++)
    for (let dx = -31; dx <= 3; dx++) {
      const x = cx + dx;
      // Top crossbar (y ≈ handleTop..handleTop+5) curving down the left flank (dx ≈ -31..-25)
      const onTopBar = y >= handleTop && y <= handleTop + 5 && dx >= -27 && dx <= 2;
      const onLeftLeg = dx >= -31 && dx <= -25 && y >= handleTop + 2;
      const onRightMount = dx >= -1 && dx <= 3 && y >= handleTop + 2 && y <= bodyTop + 2;
      if (onTopBar || onLeftLeg || onRightMount) {
        const rim = y === handleTop || dx === -31 || (onTopBar && y === handleTop + 1);
        a.put(x, y, rim ? STEEL[4] : STEEL[1]);
      }
    }

  // Vertical black chain-brake hand guard plate in front of the top handlebar, left of the vertical blade
  const brakeTop = 203 + buzzDy;
  for (let y = brakeTop; y <= bodyTop + 2; y++)
    for (let dx = -14; dx <= 1; dx++) {
      const x = cx + dx;
      const border = y === brakeTop || dx === -14 || dx === 1;
      const slot = !border && y >= brakeTop + 3 && y <= brakeTop + 6 && (dx === -10 || dx === -6 || dx === -2);
      a.put(x, y, slot ? STEEL[0] : border ? STEEL[3] : STEEL[1]);
    }

  // 3. Upright VERTICAL Guide Bar & Vertical Cutting Chain (perpendicular to the ground!)
  //    In 1st-person perspective, each station `s` (0 at nose tip -> 1 at clutch mount) is a vertical column `x`
  //    spanning vertically from `topY(s)` (upper cutting spine) down to `botY(s)` (lower return rail).
  const xTip = cx - 3;
  const xBase = cx + 8;
  const barSpanX = xBase - xTip;
  const barBounds = (x) => {
    const s = Utils.clamp((x - xTip) / Math.max(1, barSpanX), 0, 1);
    const p = s ** 1.06;
    const midY = 178 + buzzDy + p * 34;
    const straightHalfH = 9.5 + p * 6.0;
    // Smooth vertical semicircular nose sprocket at the front tip (s < 0.28)
    const uNose = Math.min(1, s / 0.28);
    const noseCurve = Math.sqrt(Math.max(0, 1 - (1 - uNose) ** 2));
    const halfH = straightHalfH * (0.64 + 0.36 * noseCurve);
    const topY = Math.round(midY - halfH);
    const botY = Math.round(midY + halfH);
    const spineThick = 2 + (s > 0.45 ? 1 : 0);
    return { s, topY, botY, spineThick };
  };

  // Pass 1: Solid vertical steel guide bar body (drawn first so adjacent columns never overwrite the chain loop)
  for (let x = xTip; x <= xBase; x++) {
    const { s, topY, botY, spineThick } = barBounds(x);

    // 3a. Thin horizontal steel thickness of the vertical blade (top chain groove & right side of the vertical plate)
    for (let tx = 1; tx <= spineThick; tx++) {
      // Top spine edge showing the two steel rails and the dark central chain groove (`tx === 1`)
      a.put(x + tx, topY, tx === 1 ? STEEL[0] : STEEL[5]);
      a.put(x + tx, topY + 1, tx === 1 ? STEEL[1] : STEEL[4]);
      for (let y = topY + 2; y <= botY; y++)
        a.put(x + tx, y, tx === spineThick ? STEEL[1] : STEEL[2]);
    }

    // 3b. Left vertical cheek face of the upright guide bar (y = topY..botY)
    for (let y = topY; y <= botY; y++) {
      const vBar = (y - topY) / Math.max(1, botY - topY); // 0 at top edge -> 1 at bottom edge
      if (y === topY) {
        a.put(x, y, STEEL[7]);
        continue;
      }
      if (y === botY || (s < 0.12 && (vBar < 0.15 || vBar > 0.85))) {
        a.put(x, y, STEEL[1]);
        continue;
      }
      // Top and bottom hardened chain-rail bevels
      if (vBar < 0.16) {
        a.put(x, y, vBar < 0.09 ? STEEL[6] : STEEL[2]);
        continue;
      }
      if (vBar > 0.84) {
        a.put(x, y, vBar > 0.92 ? STEEL[2] : STEEL[1]);
        continue;
      }
      // Nose sprocket rivet & central vertical-plate lightening slot / oil channel
      const noseRivet = Math.abs(s - 0.22) < 0.06 && Math.abs(vBar - 0.5) < 0.12;
      const centerSlot = s > 0.32 && s < 0.88 && Math.abs(vBar - 0.5) < 0.11;
      if (noseRivet) {
        a.put(x, y, BOLT[4]);
        continue;
      }
      if (centerSlot) {
        a.put(x, y, STEEL[0]);
        continue;
      }
      // Diagonal yellow/black hazard stencil on the vertical cheek face
      const hazardBand = s > 0.28 && s < 0.86 && Math.abs(vBar - 0.5) < 0.34;
      if (hazardBand && ((x + y) & 3) < 2) {
        a.put(x, y, ramp(HAZARD_YELLOW, 0.58 + (0.5 - vBar) * 0.25, x, y));
        continue;
      }
      const cheekShade = 0.62 - vBar * 0.28 + (hash(x, y) - 0.5) * 0.08;
      a.put(x, y, ramp(STEEL, cheekShade, x, y));
    }
  }

  // Pass 2: Unbroken vertical cutting chain loop (top spine run, bottom return run, and front nose wrap)
  for (let x = xTip; x <= xBase; x++) {
    const { s, topY, botY, spineThick } = barBounds(x);
    const nextBounds = barBounds(Math.min(xBase, x + 1));

    // 3c. TOP CUTTING CHAIN RUN: rides continuously along the upper spine (`topY..nextTopY`) with teeth sticking UPWARD (-y)
    const linkIdx = x - xTip + chainPhase;
    const isRivet = linkIdx % 2 === 0;
    const topSpanEnd = Math.max(topY, nextBounds.topY);
    for (let y = topY; y <= topSpanEnd; y++)
      for (let tx = 0; tx <= spineThick; tx++) {
        a.put(x + tx, y - 1, isRivet && tx === 1 ? BOLT[4] : STEEL[1]);
        a.put(x + tx, y - 2, tx === 0 ? STEEL[3] : STEEL[2]);
      }
    const topToothPhase = (linkIdx + 12) % 3;
    if (topToothPhase < 2) {
      const toothH = (topToothPhase === 0 ? 4 : 3) + (s > 0.5 ? 1 : 0);
      const blood = ((x + frame * 3) % 5 === 0) || (active && ((x + frame) & 1) === 0);
      for (let dy = 3; dy <= toothH + 1; dy++) {
        const ty = topY - dy;
        const isTip = dy >= toothH;
        const col = blood && isTip ? SHELL[3] : isTip ? BOLT[5] : BOLT[3];
        a.put(x + 1, ty, col);
        if (dy <= toothH)
          a.put(x + 2, ty, blood ? SHELL[2] : STEEL[5]);
      }
    }

    // 3d. BOTTOM RETURN CHAIN RUN: bridges every vertical pixel from `botY` to `nextBounds.botY` so the bottom chain is
    //     100% solid and unbroken all the way from the front nose sprocket into the lower clutch housing.
    const botSpanEnd = Math.max(botY + 1, nextBounds.botY);
    for (let y = botY; y <= botSpanEnd; y++) {
      const botRivet = ((y + x - chainPhase) & 1) === 0;
      a.put(x + 1, y, STEEL[0]);
      a.put(x + 2, y, STEEL[1]);
      a.put(x, y, botRivet ? BOLT[4] : STEEL[2]);
      a.put(x - 1, y, botRivet ? STEEL[3] : STEEL[1]);
      const botToothPhase = ((y + x - chainPhase) % 3 + 3) % 3;
      if (botToothPhase < 2) {
        const blood = active && ((y + frame) % 3 === 0);
        const tipCol = blood ? SHELL[3] : BOLT[5];
        a.put(x - 1, y + 1, BOLT[3]);
        a.put(x, y + 1, STEEL[2]);
        a.put(x - 2, y + 2, tipCol);
        a.put(x - 1, y + 2, blood ? SHELL[2] : BOLT[4]);
        if (botToothPhase === 0)
          a.put(x - 2, y + 3, tipCol);
      }
    }
  }

  // 3e. FRONT VERTICAL NOSE SPROCKET WRAP: joins topY(xTip) and botY(xTip) seamlessly around the front tip (`xTip`)
  const { topY: noseTopY, botY: noseBotY } = barBounds(xTip);
  for (let y = noseTopY; y <= noseBotY; y++) {
    const nv = (y - noseTopY) / Math.max(1, noseBotY - noseTopY);
    const curveOut = Math.round(Math.sin(nv * Math.PI) * 2.2);
    const nx = xTip - curveOut;
    a.put(nx, y, ((y + chainPhase) & 1) ? BOLT[4] : STEEL[1]);
    a.put(nx + 1, y, STEEL[2]);
    // Forward-and-vertical cutter teeth radiating around the vertical nose arc
    if (((y + chainPhase) % 3) !== 2) {
      const blood = ((y + frame) % 4 === 0) || (active && ((y + frame) & 1) === 0);
      const tipCol = blood ? SHELL[3] : BOLT[5];
      a.put(nx - 1, y, BOLT[3]);
      a.put(nx - 2, y + (nv < 0.35 ? -1 : nv > 0.65 ? 1 : 0), tipCol);
    }
  }

  // 4. Right-Side Vertical Clutch/Sprocket Cover, Bar-Mount Stud Nuts & Steel Bucking Spikes (clamping the vertical bar base)
  const clutchTop = 211 + buzzDy;
  for (let y = clutchTop; y < H - 4; y++) {
    const v = (y - clutchTop) / Math.max(1, H - 5 - clutchTop);
    const x0 = cx + 9;
    const x1 = cx + 22 + Math.round(v * 6);
    for (let x = x0; x <= x1; x++) {
      const border = x === x0 || x === x1 || y === clutchTop || y === H - 5;
      if (border) {
        a.put(x, y, STEEL[0]);
        continue;
      }
      const bevel = x <= x0 + 2 || y <= clutchTop + 2;
      a.put(x, y, bevel ? STEEL[4] : STEEL[2]);
    }
  }
  // Two bright silver hex bar-mount nuts clamping the vertical guide bar inside the clutch cover
  for (const [nx, ny] of [
    [cx + 14, 224 + buzzDy],
    [cx + 19, 231 + buzzDy],
  ]) {
    a.rect(nx - 1, ny - 1, 3, 3, BOLT[2]);
    a.put(nx, ny, BOLT[5]);
  }
  // Sharp vertical steel bucking spikes (bumper dawgs) at the front of the clutch mount
  for (const sy of [208 + buzzDy, 214 + buzzDy, 220 + buzzDy]) {
    a.put(cx + 5, sy, BOLT[4]);
    a.put(cx + 4, sy - 1, BOLT[5]);
  }

  // 5. High-speed vertical chain blur, sparks & blood flecks strictly in the VERTICAL blade plane when attacking
  if (active) {
    const phase = frame === WEAPON_FRAMES.flashA ? 0 : 2;
    for (let x = xTip - 1; x <= xBase; x += 2) {
      const { s, topY, botY } = barBounds(x);
      const isBlood = ((x + phase) % 3) === 0;
      // Dorsal sparks/blood flying upward above the vertical top spine
      a.put(x + 1, topY - 5 - ((x + phase) & 1), isBlood ? SHELL[3] : BOLT[5]);
      a.put(x + 2, topY - 4, isBlood ? SHELL[2] : BOLT[4]);
      // Ventral sparks/blood flying downward below the vertical return edge
      if (s < 0.85)
        a.put(x - 2, botY + 4 + ((x + phase) & 1), isBlood ? SHELL[2] : BOLT[4]);
    }
  }
  return a.pixels;
}

/**
 * Heavily foreshortened rotary chaingun / rail-barrel assembly aimed horizontally into the horizon:
 * - Low muzzle crown (`topY = 178 + recoilDy`) and compact vertical span (`topY .. clampY`), with the 6 rotary barrels
 *   flaring steeply in 3D perspective from a tight horizon-aimed cluster at the muzzle (`clusterRx = 7.5`, `rad = 2`)
 *   out to a wide heavy rotor housing at the receiver (`clusterRx = 22.5`, `rad = 5.5`).
 * - Depth-sorted barrels with foreshortened horizontal elliptical rotor clamp rings and 6 dark bore holes facing forward.
 */
/**
 * Draws a 3D foreshortened bottleneck brass rifle cartridge casing being extracted and spun through the air:
 * - Rebated base rim + dark recessed extractor groove at the rear (`u < -0.58`),
 * - Cylindrical specular brass body (`BRASS[0..4]`) with bright axial highlight ridge,
 * - Tapered bottleneck shoulder (`u > 0.42`) and scorched dark hollow case mouth at the front tip (`u > 0.72`),
 * - Crisp dark `STEEL[0]` silhouette outline.
 */
function drawExtractedCasing(a, cx, cy, angle, scale = 1) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const halfL = 7.5 * scale;
  const halfR = 2.6 * scale;
  const bound = Math.ceil(halfL + halfR + 2);
  for (let dy = -bound; dy <= bound; dy++)
    for (let dx = -bound; dx <= bound; dx++) {
      const along = dx * cos + dy * sin;
      const perp = -dx * sin + dy * cos;
      const u = along / halfL;
      if (u < -1.08 || u > 1.08)
        continue;
      // Bottleneck rifle cartridge profile: wide rim at base, recessed extractor groove, straight body, tapered neck
      let profile = 1;
      if (u < -0.78)
        profile = 1.08;
      else if (u < -0.56)
        profile = 0.78;
      else if (u > 0.62)
        profile = 0.66;
      else if (u > 0.36)
        profile = 1 - ((u - 0.36) / 0.26) * 0.34;
      const rMax = halfR * profile;
      const absPerp = Math.abs(perp);
      if (absPerp > rMax + 0.95)
        continue;
      const px = Math.round(cx + dx);
      const py = Math.round(cy + dy);
      if (absPerp >= rMax - 0.15 || u < -0.94 || u > 0.94) {
        // Scorched open case mouth at the very front tip
        if (u > 0.82 && absPerp < rMax * 0.65)
          a.put(px, py, FIRE_RAMP[0]);
        else
          a.put(px, py, STEEL[0]);
        continue;
      }
      const v = (perp / Math.max(0.5, rMax) + 1) * 0.5;
      // Dark recessed extractor groove just ahead of the base rim
      if (u >= -0.78 && u < -0.56) {
        a.put(px, py, v < 0.45 ? BRASS[1] : STEEL[1]);
        continue;
      }
      // Scorched powder residue around the bottleneck mouth
      if (u > 0.72) {
        a.put(px, py, absPerp < rMax * 0.48 ? STEEL[0] : BRASS[1]);
        continue;
      }
      // Cylindrical brass shading with a hot specular highlight band along the upper-left side of the case
      const cyl = Math.sin(v * Math.PI);
      const spec = Math.exp(-(((v - 0.34) / 0.18) ** 2)) * 0.32;
      const rimBoost = u < -0.78 ? 0.14 : 0;
      const shade = Utils.clamp(0.18 + cyl * 0.56 + spec + rimBoost, 0, 1);
      a.put(px, py, shade > 0.88 ? FIRE_RAMP[6] : ramp(BRASS, shade, px, py));
    }
}

function drawChaingunArt(frame) {
  const a = new Art();
  const rolling = frame !== WEAPON_FRAMES.idle;
  const firing = frame === WEAPON_FRAMES.flashA || frame === WEAPON_FRAMES.flashB;
  const recoilDy =
    frame === WEAPON_FRAMES.flashA
      ? 3
      : frame === WEAPON_FRAMES.flashB
        ? 5
        : frame === WEAPON_FRAMES.pumpA
          ? 1
          : 0;
  const cx = CX + (frame === WEAPON_FRAMES.flashB ? 1 : frame === WEAPON_FRAMES.flashA ? -1 : 0);
  const topY = 178 + recoilDy;
  const clampY = 218 + recoilDy;
  // Advance by exactly 45 deg (pi/4) per active frame (1..4 -> 45, 90, 135, 180 deg) so opposite barrel pairs (180 deg apart)
  // keep rolling smoothly across both firing (`flashA`/`flashB`) and spin-down (`pumpA`/`pumpB`).
  const spin = rolling ? frame * (Math.PI / 4) : 0.18;

  // Draw the volumetric muzzle blast behind the barrel bundle ONLY on active firing frames (flashA / flashB)
  if (frame === WEAPON_FRAMES.flashA)
    drawFlash(a, 1, 0, topY - 2);
  else if (frame === WEAPON_FRAMES.flashB)
    drawFlash(a, 0.65, 1, topY - 2);

  // 1. Sort the 6 rotary barrels back-to-front by 3D depth so lower/nearer barrels occlude upper/farther barrels.
  //    Barrels are paired 180 deg apart (`role = i % 3`) with high-contrast visual treatments so rotation is unmistakable:
  //    - role 0: bright polished chrome-steel power-rail barrel with brass induction rings & energized amber guide stripe
  //    - role 1: dark blued-gunmetal fluted barrel with deep black cooling slots
  //    - role 2: medium steel barrel with Machined annular cooling ribs
  const count = 6;
  const barrels = [];
  for (let i = 0; i < count; i++) {
    const phase = spin + (i / count) * Trigo.twopi;
    barrels.push({ sx: Math.sin(phase), depth: Math.cos(phase), role: i % 3, idx: i });
  }
  barrels.sort((b0, b1) => b0.depth - b1.depth);

  // Dark central spindle core between the converging barrels so there are no hollow gaps
  for (let y = topY + 2; y <= clampY; y++) {
    const v = (y - topY) / Math.max(1, clampY - topY);
    const coreHalf = Math.round(5 + (v ** 1.22) * 13);
    for (let dx = -coreHalf; dx <= coreHalf; dx++)
      a.put(cx + dx, y, STEEL[0]);
  }

  for (const { sx, depth, role } of barrels) {
    const yStart = Math.round(topY + depth * 1.6);
    for (let y = yStart; y <= clampY; y++) {
      const v = Utils.clamp((y - topY) / Math.max(1, clampY - topY), 0, 1);
      const p = v ** 1.24;
      // Strong perspective flare from the horizon muzzle tip (7.5px) to the near receiver shroud (22px)
      const clusterRx = 7.5 + p * 14.5;
      const bx = cx + sx * clusterRx;
      const rad = Math.max(2, Math.round(2.1 + p * 2.9 + depth * 0.65));
      const x0 = Math.round(bx - rad);
      const x1 = Math.round(bx + rad);
      const relY = y - yStart;
      for (let x = x0; x <= x1; x++) {
        if (x === x0 || x === x1) {
          a.put(x, y, STEEL[0]);
          continue;
        }
        const u = (x - x0) / Math.max(1, x1 - x0);
        if (role === 0) {
          // Bright chrome & brass master power-rail barrel: high-contrast landmark that sweeps across the rotor
          const brassRing = relY > 4 && relY % 7 < 2;
          if (brassRing) {
            a.put(x, y, ramp(BRASS, 0.48 + Math.sin(u * Math.PI) * 0.46 + depth * 0.1, x, y));
            continue;
          }
          if (firing && depth > -0.1 && Math.abs(u - 0.48) < 0.2 && relY > 3) {
            a.put(x, y, FIRE_RAMP[depth > 0.4 ? 4 : 3]);
            continue;
          }
          a.put(x, y, steelCyl(depth * 0.18 + 0.24 - v * 0.03)(u, v, x, y));
        } else if (role === 1) {
          // Deep dark gunmetal fluted barrel with dark perforated cooling vents for stark light/dark contrast
          const ventSlot = relY > 5 && relY % 5 < 2 && u > 0.24 && u < 0.76;
          if (ventSlot) {
            a.put(x, y, STEEL[0]);
            continue;
          }
          a.put(x, y, steelCyl(depth * 0.12 - 0.22 - v * 0.04)(u, v, x, y));
        } else {
          // Ribbed gunmetal barrel
          const rib = relY > 4 && relY % 4 === 0 ? 0.14 : -0.04;
          a.put(x, y, steelCyl(depth * 0.15 + rib - v * 0.04)(u, v, x, y));
        }
      }
    }
  }

  // 2. Foreshortened 3D elliptical rotor clamp collars with 6 orbiting barrel lugs & brass/steel locking bolts
  for (const bandV of [0.35, 0.72]) {
    const by = Math.round(topY + bandV * (clampY - topY));
    const p = bandV ** 1.24;
    const rx = Math.round(10.5 + p * 17.5);
    const ry = 2.4 + p * 1.4;
    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++)
      for (let dx = -rx; dx <= rx; dx++) {
        const d = Math.hypot(dx / rx, dy / ry);
        if (d >= 0.72 && d <= 1.04) {
          const u = (dx + rx) / (rx * 2);
          const edge = d > 0.92 || d < 0.78;
          a.put(cx + dx, by + dy, edge ? STEEL[0] : steelCyl(-0.12)(u, bandV, cx + dx, by + dy));
        }
      }
    // Orbiting 3D clamp lugs & bright locking bolts locked to each barrel's rotating phase
    const lugClusterRx = 7.5 + p * 14.5;
    const lugHalfW = bandV > 0.5 ? 2 : 1;
    for (const { sx, depth, role } of barrels) {
      if (depth < -0.25)
        continue;
      const lx = Math.round(cx + sx * lugClusterRx);
      const ly = Math.round(by + depth * (ry * 0.55));
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -lugHalfW - 1; dx <= lugHalfW + 1; dx++) {
          const border = Math.abs(dy) === 2 || Math.abs(dx) === lugHalfW + 1;
          if (border) {
            a.put(lx + dx, ly + dy, STEEL[0]);
            continue;
          }
          if (dy === 0 && Math.abs(dx) <= 1) {
            const boltCol = role === 0 ? (firing ? FIRE_RAMP[4] : BRASS[3]) : role === 1 ? STEEL[2] : STEEL[6];
            a.put(lx + dx, ly + dy, boltCol);
          } else
            a.put(lx + dx, ly + dy, role === 0 ? BRASS[2] : role === 1 ? STEEL[1] : STEEL[4]);
        }
    }
  }

  // 3. Foreshortened horizontal elliptical muzzle rotor crown at `topY` with 6 orbiting barrel muzzles & bores
  const muzRx = 10;
  const muzRy = 2.8;
  for (let y = Math.floor(topY - muzRy - 1); y <= Math.ceil(topY + muzRy + 1); y++)
    for (let x = cx - muzRx - 1; x <= cx + muzRx + 1; x++) {
      const dx = (x - cx) / muzRx;
      const dy = (y - topY) / muzRy;
      const d = Math.hypot(dx, dy);
      if (d <= 1.06) {
        if (d > 0.84)
          a.put(x, y, dy < 0 ? STEEL[6] : STEEL[0]);
        else
          a.put(x, y, dy < 0 ? STEEL[4] : STEEL[2]);
      }
    }
  for (const { sx, depth, role } of barrels) {
    const holeX = Math.round(cx + sx * 6.6);
    const holeY = Math.round(topY + depth * 1.3);
    const rimCol = role === 0 ? BRASS[3] : role === 1 ? STEEL[2] : STEEL[5];
    const hotBore = firing && role === 0 && depth > 0;
    a.put(holeX - 1, holeY - 1, rimCol);
    a.put(holeX, holeY - 1, rimCol);
    a.put(holeX + 1, holeY - 1, rimCol);
    a.put(holeX - 1, holeY, hotBore ? FIRE_RAMP[3] : STEEL[0]);
    a.put(holeX, holeY, hotBore ? FIRE_RAMP[4] : STEEL[0]);
    a.put(holeX + 1, holeY, hotBore ? FIRE_RAMP[2] : STEEL[1]);
  }

  // 4. Wide foreshortened twin-cheek gunmetal receiver, central spinning rotor drive gear, left ammo feed & right breech port
  const recTop = clampY - 3;
  // Ammo belt only advances when actively firing rounds (`flashA`/`flashB`); drive gear spins whenever barrels roll
  const beltShift = frame === WEAPON_FRAMES.flashA ? 2 : frame === WEAPON_FRAMES.flashB ? 4 : 0;
  const gearShift = rolling ? frame * 3 : 0;
  for (let y = recTop; y < H; y++) {
    const v = (y - recTop) / Math.max(1, H - 1 - recTop);
    const p = v ** 1.15;
    const shoulder = v < 0.2 ? Math.sin((v / 0.2) * (Math.PI / 2)) : 1;
    const half = Math.round(23 + shoulder * 4 + p * 15);
    const bevelHalf = Math.round(16 + shoulder * 3 + p * 11);
    for (let dx = -half; dx <= half; dx++) {
      const x = cx + dx;
      const adx = Math.abs(dx);
      if (adx === half || (y === recTop && adx <= bevelHalf)) {
        a.put(x, y, STEEL[0]);
        continue;
      }
      const u = (dx + half) / Math.max(1, half * 2);
      // Exposed horizontal rotary drive gear in the upper receiver window whose teeth spin left-to-right while rolling
      if (y >= recTop + 2 && y <= recTop + 9 && adx <= 12) {
        if (y === recTop + 2 || y === recTop + 9 || adx === 12) {
          a.put(x, y, STEEL[0]);
          continue;
        }
        const toothPhase = ((dx + 32 - gearShift) % 5 + 5) % 5;
        const isTooth = toothPhase < 2;
        const isBrassTooth = ((dx + 32 - gearShift) % 10 + 10) % 10 < 2;
        if (isBrassTooth)
          a.put(x, y, ramp(BRASS, 0.52 + (1 - adx / 12) * 0.38, x, y));
        else
          a.put(x, y, isTooth ? STEEL[5] : STEEL[0]);
        continue;
      }
      // Right-side mechanical breech ejection port (`dx = 14..23, y = recTop + 3..recTop + 11`):
      // Opens with reciprocating extractor claw and hot chamber flash ONLY while firing (`flashA`/`flashB`);
      // stays closed with a machined bolt cover during `idle`, `pumpA`, and `pumpB`.
      if (dx >= 14 && dx <= 23 && y >= recTop + 3 && y <= recTop + 11) {
        const border = dx === 14 || dx === 23 || y === recTop + 3 || y === recTop + 11;
        if (border) {
          a.put(x, y, dx === 23 ? BRASS[2] : STEEL[0]);
          continue;
        }
        if (firing) {
          const clawMaxX = frame === WEAPON_FRAMES.flashA ? 17 : 19;
          if (dx <= clawMaxX && y >= recTop + 5 && y <= recTop + 9) {
            // Silver reciprocating extractor claw & bolt face kicking spent brass out of the port
            a.put(x, y, dx === clawMaxX ? BOLT[5] : BOLT[3]);
          } else if (frame === WEAPON_FRAMES.flashA && dx >= 18 && y >= recTop + 5 && y <= recTop + 9) {
            // Incandescent breech propellant gas inside the open chamber on primary extraction
            a.put(x, y, dx < 21 ? FIRE_RAMP[5] : FIRE_RAMP[3]);
          } else if (frame === WEAPON_FRAMES.flashB && dx >= 20 && y >= recTop + 6 && y <= recTop + 8) {
            a.put(x, y, FIRE_RAMP[2]);
          } else
            a.put(x, y, STEEL[0]);
        } else {
          // Closed steel bolt carrier slide with horizontal extractor guide groove when not firing
          const groove = y === recTop + 7;
          a.put(x, y, groove ? STEEL[1] : BOLT[2]);
        }
        continue;
      }
      // Perspective-foreshortened linked brass cartridge belt feeding into the left receiver cheek
      const beltOuter = -half + 2;
      const beltInner = -bevelHalf + 5;
      if (dx > beltOuter && dx < beltInner && v > 0.12 && v < 0.88) {
        const beltPos = y + beltShift + Math.floor(adx * 0.25);
        const pitch = ((beltPos % 4) + 4) % 4;
        if (pitch < 2) {
          const roundU = (dx - beltOuter) / Math.max(1, beltInner - beltOuter);
          // Disintegrating dark steel link clip in the middle, copper tip on the inside, polished brass case on the outside
          if (roundU > 0.42 && roundU < 0.62)
            a.put(x, y, STEEL[2]);
          else if (roundU >= 0.76)
            a.put(x, y, FIRE_RAMP[3]);
          else
            a.put(x, y, ramp(BRASS, 0.52 + Math.sin(roundU * Math.PI) * 0.42 + (pitch === 0 ? 0.1 : -0.06), x, y));
          continue;
        }
      }
      let shade = 0.24;
      if (adx <= 6)
        shade = adx === 6 ? 0.58 : 0.14 + (1 - adx / 6) * 0.08;
      else if (adx <= bevelHalf)
        shade = dx < 0 ? 0.62 - (adx - 6) * 0.014 : 0.38 - (adx - 6) * 0.012;
      else
        shade = dx < 0 ? 0.32 : 0.16;
      if (y >= recTop + 12 && y % 3 === 0 && adx > 8 && adx < bevelHalf - 2)
        shade -= 0.16;
      a.put(x, y, ramp(STEEL, shade + (hash(x, y) - 0.5) * 0.05, x, y));
    }
  }

  // 5. Animated 3D brass bullet casing extraction — strictly on active firing frames (`flashA` and `flashB`)
  //    so bullet extraction stops immediately when shooting stops while `pumpA`/`pumpB` keep rolling the barrel.
  if (frame === WEAPON_FRAMES.flashA) {
    // Hot breech gas puff & brass ejector sparks bursting out of the open right ejection port
    for (const [gx, gy, col] of [
      [cx + 22, recTop + 5, FIRE_RAMP[6]],
      [cx + 23, recTop + 4, FIRE_RAMP[5]],
      [cx + 24, recTop + 6, FIRE_RAMP[4]],
      [cx + 22, recTop + 8, FIRE_RAMP[4]],
      [cx + 25, recTop + 3, FIRE_RAMP[6]],
    ])
      a.put(gx, gy, col);
    // Stage 1A: Freshly extracted bottleneck brass casing kicking upward-right out of the breech port
    drawExtractedCasing(a, cx + 29, recTop + 5, -0.36, 1.0);
    // Stage 2A: Previous round's spent casing tumbling further out along the parabolic ejection arc
    drawExtractedCasing(a, cx + 45, recTop + 1, 0.58, 0.9);
  } else if (frame === WEAPON_FRAMES.flashB) {
    // Residual ember glint & brass motion streak trailing from the ejection port lip
    for (const [gx, gy, col] of [
      [cx + 23, recTop + 6, FIRE_RAMP[4]],
      [cx + 25, recTop + 5, BRASS[4]],
      [cx + 27, recTop + 4, BRASS[3]],
      [cx + 29, recTop + 3, BRASS[4]],
    ])
      a.put(gx, gy, col);
    // Stage 1B: Primary casing cresting the upper-right arc and rotating clockwise
    drawExtractedCasing(a, cx + 36, recTop + 1, 0.14, 0.96);
    // Stage 2B: Previous casing spinning downward-right toward the edge of the screen
    drawExtractedCasing(a, cx + 52, recTop + 9, 1.32, 0.84);
  }

  if (frame === WEAPON_FRAMES.flashA) {
    applyFlashLight(a, cx, topY, 0.85);
    // Compact white-hot plasma/muzzle core right at the top firing barrel bore so the spinning barrels below stay 100% clear
    for (let dy = -4; dy <= 1; dy++)
      for (let dx = -5; dx <= 5; dx++) {
        const d = Math.hypot(dx / 5, dy / 3.5);
        if (d <= 1)
          a.put(cx + dx, topY - 2 + dy, d < 0.55 ? FIRE_RAMP[5] : FIRE_RAMP[4]);
      }
  } else if (frame === WEAPON_FRAMES.flashB) {
    applyFlashLight(a, cx, topY, 0.55);
    for (let dy = -3; dy <= 1; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.hypot(dx / 4, dy / 2.8);
        if (d <= 1)
          a.put(cx + dx, topY - 2 + dy, d < 0.5 ? FIRE_RAMP[5] : FIRE_RAMP[3]);
      }
  }
  return a.pixels;
}

/**
 * Heavily foreshortened rocket launcher aimed horizontally toward the horizon (matching the shotgun's perspective):
 * - Low muzzle crown (`topY = 178 + recoilDy`) and steep perspective flare (`half` from `10` px at the muzzle tip out to
 *   `40` px across the wide armored breech housing at the bottom edge).
 * - Circumferential reinforcing collars and hazard stripes curve in 3D elliptical perspective across the barrel cylinder.
 * - Perspective-tapering top sighting rail, front iron sight bead, and a flat horizontal elliptical muzzle collar & bore.
 */
function drawRocketArt(frame) {
  const a = new Art();
  const recoilDy = frame === WEAPON_FRAMES.flashA ? 4 : frame === WEAPON_FRAMES.flashB ? 9 : frame === WEAPON_FRAMES.pumpA ? 5 : frame === WEAPON_FRAMES.pumpB ? 2 : 0;
  const topY = 178 + recoilDy;
  const recTop = 218 + recoilDy;

  // 1. Strongly foreshortened cylindrical olive-drab launch tube & wide rear recoil housing (y = topY .. H - 1)
  for (let y = topY; y < H; y++) {
    const v = (y - topY) / Math.max(1, H - 1 - topY);
    const p = v ** 1.24;
    // Curved 3D circumferential coordinate so rings wrap around the horizontal cylinder instead of flat 2D lines
    const baseHalf = Math.round(10 + p * 27);
    const isRearHousing = y >= recTop;
    const housingFlare = isRearHousing ? Math.round(((y - recTop) / Math.max(1, H - 1 - recTop)) * 5) : 0;
    const half = baseHalf + housingFlare;

    for (let dx = -half; dx <= half; dx++) {
      const x = CX + dx;
      const adx = Math.abs(dx);
      if (adx === half) {
        a.put(x, y, OLIVE_DRAB[0]);
        continue;
      }
      const u = (dx + half) / Math.max(1, half * 2);
      const arch = Math.sin(u * Math.PI) * 0.075;
      const vCurve = v + arch;
      const collar = (vCurve > 0.36 && vCurve < 0.45) || (vCurve > 0.72 && vCurve < 0.8);
      const hazard = vCurve > 0.16 && vCurve < 0.29 && Math.abs(u - 0.5) < 0.38;
      if (hazard) {
        const stripe = ((dx + Math.round(y - arch * 18)) & 7) < 4;
        a.put(x, y, stripe ? HAZARD_YELLOW[4] : STEEL[1]);
        continue;
      }
      // Side stabilization rails / cheek pods along the lower receiver flanks
      if (isRearHousing && adx > baseHalf - 5) {
        const railShade = dx < 0 ? 0.52 : 0.24;
        a.put(x, y, ramp(STEEL, railShade + (hash(x, y) - 0.5) * 0.05, x, y));
        continue;
      }
      const cyl = Math.sin(u * Math.PI) * 0.68 + (u < 0.42 ? 0.22 : -0.04) + (collar ? 0.14 : 0);
      if (collar && (Math.abs(vCurve - 0.36) < 0.014 || Math.abs(vCurve - 0.45) < 0.014))
        a.put(x, y, STEEL[1]);
      else if (collar)
        a.put(x, y, steelCyl(0.08)(u, v, x, y));
      else
        a.put(x, y, ramp(OLIVE_DRAB, cyl - v * 0.04 + (hash(x, y) - 0.5) * 0.06, x, y));
    }
  }

  // 2. Perspective-tapering top guidance / sighting rib running down the top centre of the launch tube (like the shotgun rib)
  for (let y = topY + 2; y < H; y++) {
    const v = (y - topY) / Math.max(1, H - 1 - topY);
    const p = v ** 1.18;
    const ribHalf = Math.round(2.5 + p * 4.5);
    const isVent = Math.floor((v ** 0.8) * 22) % 3 === 0;
    for (let x = CX - ribHalf; x <= CX + ribHalf; x++) {
      if (x === CX - ribHalf || x === CX + ribHalf)
        a.put(x, y, STEEL[0]);
      else if (x === CX - ribHalf + 1)
        a.put(x, y, isVent ? STEEL[4] : STEEL[6]);
      else
        a.put(x, y, isVent ? STEEL[1] : STEEL[3]);
    }
  }

  // 3. Foreshortened horizontal elliptical muzzle blast collar & dark recessed bore at `(CX, topY)`
  const muzRx = 11.5;
  const muzRy = 3.1;
  const warhead = frame === WEAPON_FRAMES.idle || frame === WEAPON_FRAMES.pumpB;
  for (let y = Math.floor(topY - muzRy - 1); y <= Math.ceil(topY + muzRy + 1); y++)
    for (let x = Math.floor(CX - muzRx - 1); x <= Math.ceil(CX + muzRx + 1); x++) {
      const dx = (x - CX) / muzRx;
      const dy = (y - topY) / muzRy;
      const d = Math.hypot(dx, dy);
      if (d <= 1.06) {
        if (d > 0.76)
          a.put(x, y, dy < 0 ? STEEL[6] : STEEL[2]);
        else if (d > 0.56)
          a.put(x, y, STEEL[1]);
        else if (warhead && d <= 0.46)
          a.put(x, y, ramp(SHELL, 0.72 - d * 0.9, x, y));
        else
          a.put(x, y, STEEL[0]);
      }
    }

  // Front iron sight pedestal and bright brass aiming bead at the muzzle crown
  a.rect(CX - 2, topY - 5, 5, 3, STEEL[2]);
  a.rect(CX - 1, topY - 7, 3, 2, BRASS[3]);
  a.put(CX, topY - 7, BRASS[4]);

  if (frame === WEAPON_FRAMES.flashA) {
    drawFlash(a, 1.1, 0, topY);
    applyFlashLight(a, CX, topY + 2, 1);
  } else if (frame === WEAPON_FRAMES.flashB) {
    drawFlash(a, 0.7, 1, topY);
    applyFlashLight(a, CX, topY + 2, 0.65);
  }
  return a.pixels;
}

function drawWeaponFramePixels(weapon, frame) {
  if (weapon === 'chainsaw')
    return drawChainsawArt(frame);
  if (weapon === 'chaingun')
    return drawChaingunArt(frame);
  if (weapon === 'rocket')
    return drawRocketArt(frame);
  return drawFrame(frame);
}

/** The atlas as RGBA pixels, ready to be a texture. */
export function weaponAtlas(weapon = 'shotgun') {
  const width = W * WEAPON_FRAME_COUNT;
  const data = new Uint8Array(width * H * 4);
  for (let frame = 0; frame < WEAPON_FRAME_COUNT; frame++) {
    const pixels = drawWeaponFramePixels(weapon, frame);
    for (let y = 0; y < H; y++)
      data.set(pixels.subarray(y * W * 4, (y + 1) * W * 4), (y * width + frame * W) * 4);
  }
  return { name: 'weapon', data, width, height: H, cell: W, frames: WEAPON_FRAME_COUNT };
}

/** Combined 4-row atlas for all weapons in WEAPON_ORDER. */
export function arsenalAtlas() {
  const width = W * WEAPON_FRAME_COUNT;
  const height = H * WEAPON_ORDER.length;
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < WEAPON_ORDER.length; row++) {
    const weapon = WEAPON_ORDER[row];
    const rowOffset = row * H;
    for (let frame = 0; frame < WEAPON_FRAME_COUNT; frame++) {
      const pixels = drawWeaponFramePixels(weapon, frame);
      for (let y = 0; y < H; y++)
        data.set(pixels.subarray(y * W * 4, (y + 1) * W * 4), ((rowOffset + y) * width + frame * W) * 4);
    }
  }
  return { name: 'weapon', data, width, height, cell: W, frames: WEAPON_FRAME_COUNT };
}
