/**
 * The player's shotgun, as pixel art drawn here in code (no image files): a pump-action with a blued steel barrel, a
 * wooden pump and gloved hands, seen from behind and above, pointing up the screen. Frames are 96 x 128 pixels side by
 * side in one atlas: the gun at rest, two frames of muzzle flash, a wisp of smoke, and the two stages of pumping.
 * The frame to show is worked out from the time since the shot (`weaponFrame`) and the place to draw it from the size
 * of the screen (`weaponPlacement`); both are headless, so they are tested.
 */

export const WEAPON_CELL_W = 96;
export const WEAPON_CELL_H = 128;
export const WEAPON_FRAMES = { idle: 0, flashA: 1, flashB: 2, smoke: 3, pumpA: 4, pumpB: 5 };
export const WEAPON_FRAME_COUNT = 6;

const W = WEAPON_CELL_W;
const H = WEAPON_CELL_H;
const CX = 48;
// the barrel's tip, where the flash and the smoke start
const MUZZLE_Y = 40;

const STEEL = [[10, 13, 22], [22, 28, 42], [38, 48, 68], [66, 82, 112], [112, 132, 166], [176, 192, 218]];
const WOOD = [[44, 24, 14], [72, 40, 22], [104, 62, 32], [140, 88, 44], [176, 116, 58]];
const GLOVE = [[12, 11, 14], [24, 22, 28], [40, 37, 46], [66, 62, 74]];
const SLEEVE = [[16, 22, 40], [26, 36, 62], [42, 58, 96], [66, 88, 136]];
const BRASS = [196, 148, 62];
const SHELL = [186, 38, 38];
const BOLT = [128, 146, 178];

const FLASH_WHITE = [255, 250, 226];
const FLASH_YELLOW = [255, 216, 100];
const FLASH_ORANGE = [255, 146, 40];
const FLASH_RED = [206, 66, 26];
const SMOKE = [[70, 76, 94], [104, 112, 134], [146, 154, 176]];

/** The seconds after a shot at which each frame of the animation starts. The pump follows the sound of it. */
export const WEAPON_TIMES = { flashA: 0, flashB: 0.045, smoke: 0.09, rest: 0.22, pumpA: 0.4, pumpB: 0.47, pumpBack: 0.56, done: 0.62 };

/** Which frame to show `elapsed` seconds after a shot. The pump only works when there is a shell to load. */
export function weaponFrame(elapsed, hasAmmo = true) {
  const t = WEAPON_TIMES;
  if (elapsed < 0)
    return WEAPON_FRAMES.idle;
  if (elapsed < t.flashB)
    return WEAPON_FRAMES.flashA;
  if (elapsed < t.smoke)
    return WEAPON_FRAMES.flashB;
  if (elapsed < t.rest)
    return WEAPON_FRAMES.smoke;
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
export function weaponPlacement({ width, height, bob = 0, moving = 0, recoil = 0 }) {
  const scale = Math.min(1.3, Math.max(0.7, height / 760));
  const pixel = Math.max(2, Math.round(3 * scale));
  const sway = Math.sin(bob) * 14 * moving * scale;
  const rise = Math.abs(Math.cos(bob)) * 8 * moving * scale;
  const x0 = Math.round(width / 2 + sway - (W / 2) * pixel);
  const y1 = Math.round(height + 12 + 8 * pixel + rise - recoil * 8 * pixel);
  return { x0, y0: y1 - H * pixel, x1: x0 + W * pixel, y1, pixel };
}

/** Texture coordinates of a frame, a hair inside its edges: [u0, v0, u1, v1], v1 at the top of the picture. */
export function weaponCellUv(frame) {
  const inset = 0.02 / (W * WEAPON_FRAME_COUNT);
  return [frame / WEAPON_FRAME_COUNT + inset, 0, (frame + 1) / WEAPON_FRAME_COUNT - inset, 1];
}

// ---- drawing -------------------------------------------------------------------------------------------------------

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
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++)
        this.put(x, y, color);
    }
  }

  line(x0, y0, x1, y1, color) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) || 1;
    for (let i = 0; i <= steps; i++)
      this.put(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, color);
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
      for (let x = 0; x < W; x++) {
        if (inside(x + 0.5, y + 0.5))
          row.push(x);
      }
      if (!row.length)
        continue;
      const first = row[0];
      const span = Math.max(1, row[row.length - 1] - first);
      const v = (y - top) / Math.max(1, bottom - top);
      for (const x of row)
        this.put(x, y, shade((x - first) / span, v, x, y));
    }
  }

  /** A blob: filled where `reach(angle)` says, coloured by `color(distance 0..1, x, y)`. */
  blob(cx, cy, rx, ry, reach, color) {
    for (let y = Math.floor(cy - ry * 1.6); y <= Math.ceil(cy + ry * 1.6); y++) {
      for (let x = Math.floor(cx - rx * 1.6); x <= Math.ceil(cx + rx * 1.6); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const d = Math.hypot(dx, dy);
        if (d <= reach(Math.atan2(dy, dx)))
          this.put(x, y, color(d / reach(Math.atan2(dy, dx)), x, y));
      }
    }
  }
}

/** A colour from a ramp, `t` 0..1, dithered between its two nearest steps so it reads as shading, not bands. */
function ramp(colors, t, x, y) {
  const at = Math.min(colors.length - 1, Math.max(0, t * (colors.length - 1)));
  const low = Math.floor(at);
  const high = Math.min(colors.length - 1, low + 1);
  const mix = at - low;
  const dither = ((x & 1) + (y & 1) * 2) / 4 + 0.125;
  return mix > dither ? colors[high] : colors[low];
}

/** A rounded steel part lit from the upper left: bright just left of the middle, dark at the right. */
const steel = (bias = 0) => (u, v, x, y) => ramp(STEEL, Math.max(0, 1 - Math.abs(u - 0.3) * 1.55) * 0.85 + 0.06 + bias, x, y);

const wood = (u, v, x, y) => {
  // the grain runs the length of it, so it varies with the column far more than with the row
  const grain = hash(x, 7) * 0.34 + hash(x >> 1, y >> 3) * 0.1;
  return ramp(WOOD, Math.min(1, 0.22 + grain + Math.max(0, 0.34 - u * 0.5)), x, y);
};

const glove = (u, v, x, y) => ramp(GLOVE, Math.max(0, 0.55 - u * 0.4 - v * 0.15) + hash(x, y) * 0.1, x, y);
const sleeve = (u, v, x, y) => ramp(SLEEVE, Math.max(0, 0.72 - u * 0.55) + hash(x >> 1, y) * 0.08, x, y);

function drawGun(a, pump, lit) {
  const dy = pump * 5;

  // the left sleeve comes up from the bottom left to the pump hand
  a.fill([[CX - 27, 84 + dy], [CX - 14, 86 + dy], [CX - 26, 128], [CX - 48, 128]], sleeve);
  for (let i = 0; i < 4; i++)
    a.line(CX - 26 + i * 2.5 - i * 1.2, 94 + dy + i * 8, CX - 16 + i * 2.5 - i * 1.2, 96 + dy + i * 8, SLEEVE[0]);

  // the barrel, narrowing away from us, and its bore and bead
  a.fill([[CX - 5, MUZZLE_Y], [CX + 5, MUZZLE_Y], [CX + 10, 98], [CX - 10, 98]], steel());
  a.rect(CX - 2, MUZZLE_Y, 4, 1, STEEL[0]);
  a.put(CX - 1, MUZZLE_Y - 1, STEEL[5]);
  a.put(CX, MUZZLE_Y - 1, STEEL[4]);
  // a rib along the top of the barrel
  for (let y = MUZZLE_Y + 2; y < 92; y += 2)
    a.put(CX - 0.5 + (y - MUZZLE_Y) * 0.01, y, STEEL[5]);

  // the receiver
  a.fill([[CX - 17, 95], [CX + 17, 95], [CX + 21, 128], [CX - 21, 128]], steel(-0.04));
  for (let x = CX - 17; x <= CX + 17; x++)
    a.put(x, 95, STEEL[0]);
  for (let x = CX - 18; x <= CX + 18; x++)
    a.put(x, 96, STEEL[4]);
  // the ejection port on the right, with the bolt in it, drawn further back when the pump is
  a.fill([[CX + 4, 99], [CX + 15, 99], [CX + 16, 108], [CX + 4, 108]], () => STEEL[0]);
  const bolt = pump >= 2 ? 99 : pump === 1 ? 101 : 104;
  a.rect(CX + 5, bolt, 9, 108 - bolt, BOLT);
  a.rect(CX + 5, bolt, 9, 1, STEEL[5]);
  // the screws
  for (const [x, y] of [[CX - 13, 100], [CX - 17, 119]])
    a.rect(x, y, 2, 2, STEEL[4]);

  // the right hand on the grip, and its forearm
  a.fill([[CX + 10, 113], [CX + 26, 109], [CX + 32, 128], [CX + 8, 128]], glove);
  a.fill([[CX + 25, 108], [CX + 34, 111], [CX + 44, 128], [CX + 31, 128]], sleeve);
  for (const x of [CX + 14, CX + 19, CX + 24])
    a.line(x, 113 - (x - CX - 14) * 0.35, x - 1, 120, GLOVE[0]);

  // the pump: a wooden forend with grooves, which slides back toward us as the gun is worked
  const top = 60 + dy;
  const bottom = 86 + dy;
  a.fill([[CX - 14, top], [CX + 14, top], [CX + 18, bottom], [CX - 18, bottom]], wood);
  for (let y = top + 2; y < bottom; y += 3) {
    for (let x = CX - 15; x <= CX + 16; x++) {
      if (a.has(x, y))
        a.put(x, y, WOOD[0]);
    }
  }
  for (let x = CX - 14; x <= CX + 14; x++)
    a.put(x, top, WOOD[4]);
  // a steel collar where the pump meets the barrel
  a.rect(CX - 10, top - 3, 20, 2, STEEL[3]);
  a.rect(CX - 10, top - 1, 20, 1, STEEL[0]);

  // the left hand over the pump: the back of the glove, knuckles and the fingers curling round each side
  a.fill([[CX - 17, top + 16], [CX + 17, top + 16], [CX + 20, bottom + 5], [CX - 20, bottom + 5]], glove);
  for (const x of [-11, -4, 4, 11]) {
    a.rect(CX + x - 2, top + 14, 4, 3, GLOVE[3]);
    a.line(CX + x, top + 17, CX + x + Math.sign(x) * 0.6, bottom + 4, GLOVE[0]);
  }
  for (const side of [-1, 1]) {
    a.fill([[CX + side * 17, top + 17], [CX + side * 22, top + 19], [CX + side * 22, top + 26], [CX + side * 18, top + 27]], glove);
    a.line(CX + side * 18, top + 21, CX + side * 22, top + 22, GLOVE[0]);
  }

  // a shell ejected from the port while the pump is back
  if (pump >= 2) {
    a.rect(CX + 20, 92, 5, 3, SHELL);
    a.rect(CX + 20, 95, 5, 2, BRASS);
    a.put(CX + 20, 92, [230, 96, 96]);
    a.put(CX + 19, 90, STEEL[3]);
  }

  // the flash lights the top of the barrel, so it reads as the thing that is shining
  if (lit) {
    for (let y = 0; y < 90; y++) {
      for (let x = 0; x < W; x++) {
        if (!a.has(x, y))
          continue;
        const k = Math.max(0, 1 - (y - MUZZLE_Y) / 42) * 0.55;
        const o = (y * W + x) * 4;
        const warm = (x + y) % 2 ? k : k * 0.6;
        a.pixels[o] = Math.round(a.pixels[o] + (255 - a.pixels[o]) * warm);
        a.pixels[o + 1] = Math.round(a.pixels[o + 1] + (170 - a.pixels[o + 1]) * warm);
        a.pixels[o + 2] = Math.round(a.pixels[o + 2] + (70 - a.pixels[o + 2]) * warm);
      }
    }
  }
}

/** The blast leaving the barrel: a hot white core inside yellow and orange, with jagged tongues, mostly upwards. */
function drawFlash(a, size, cool) {
  const cy = MUZZLE_Y - 6 * size;
  const reach = (angle) => {
    const spike = Math.abs(Math.sin(angle * 4.5 + 0.6)) ** 0.7;
    // longer straight up the screen, short out to the sides
    const up = Math.max(0, -Math.sin(angle));
    return (0.45 + 0.55 * spike) * (0.55 + 0.55 * up);
  };
  a.blob(CX, cy, 24 * size, 28 * size, reach, (d, x, y) => {
    if (d < 0.3)
      return FLASH_WHITE;
    if (d < 0.55 - cool * 0.2)
      return FLASH_YELLOW;
    if (d < 0.82 - cool * 0.25)
      return (x + y) % 2 && d > 0.7 ? FLASH_YELLOW : FLASH_ORANGE;
    return (x + y) % 2 ? FLASH_ORANGE : FLASH_RED;
  });
  // sparks thrown clear of it
  for (let i = 0; i < 12; i++) {
    const angle = -Math.PI / 2 + (hash(i, 3) - 0.5) * 2.6;
    const distance = (26 + hash(i, 4) * 22) * size;
    a.put(CX + Math.cos(angle) * distance, cy + Math.sin(angle) * distance * 1.1, hash(i, 5) < 0.5 ? FLASH_YELLOW : FLASH_ORANGE);
  }
}

/** Smoke curling up from the muzzle, dithered so it is see-through, thickening and drifting as it rises. */
function drawSmoke(a, strength) {
  for (let i = 0; i < 9; i++) {
    const y = MUZZLE_Y - 2 - i * 5.2;
    const x = CX + Math.sin(i * 0.8 + 0.4) * 5 - i * 0.7;
    const radius = (2.4 + i * 1.15) * strength;
    for (let py = Math.floor(y - radius); py <= Math.ceil(y + radius); py++) {
      for (let px = Math.floor(x - radius); px <= Math.ceil(x + radius); px++) {
        const d = Math.hypot(px - x, (py - y) * 1.3);
        if (d > radius)
          continue;
        // thinner at the edge, and thinner the higher it goes
        const body = (1 - d / radius) * (1 - i * 0.07);
        if (hash(px, py) < body * 0.9 + 0.1 && (px + py) % 2 === 0)
          a.put(px, py, SMOKE[body > 0.55 ? 2 : body > 0.28 ? 1 : 0]);
      }
    }
  }
}

/** One frame of the animation as RGBA pixels. */
function drawFrame(frame) {
  const a = new Art();
  const f = WEAPON_FRAMES;
  const pump = frame === f.pumpA ? 1 : frame === f.pumpB ? 2 : 0;
  drawGun(a, pump, frame === f.flashA || frame === f.flashB);
  if (frame === f.flashA)
    drawFlash(a, 1, 0);
  else if (frame === f.flashB) {
    drawFlash(a, 0.62, 1);
    drawSmoke(a, 0.45);
  } else if (frame === f.smoke)
    drawSmoke(a, 1);
  return a.pixels;
}

/** The atlas as RGBA pixels, ready to be a texture. */
export function weaponAtlas() {
  const width = W * WEAPON_FRAME_COUNT;
  const data = new Uint8Array(width * H * 4);
  for (let frame = 0; frame < WEAPON_FRAME_COUNT; frame++) {
    const pixels = drawFrame(frame);
    for (let y = 0; y < H; y++)
      data.set(pixels.subarray(y * W * 4, (y + 1) * W * 4), (y * width + frame * W) * 4);
  }
  return { name: 'weapon', data, width, height: H, cell: W, frames: WEAPON_FRAME_COUNT };
}
