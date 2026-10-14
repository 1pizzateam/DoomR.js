/**
 * The explosion of a barrel as a 2D sprite animation: a ground-deflected flash and horizontal shockwave, a boiling
 * hemispherical fireball that flattens and spreads across the floor before mushrooming upward, sparks thrown up and
 * skittering along the deck, and smoke that thins away. Drawn here in code, one 64 x 64 cell per frame, 16 frames
 * side by side in a 1024 x 64 atlas (a power of two).
 */

export const EXPLOSION_CELL = 64;
export const EXPLOSION_FRAMES = 16;
export const EXPLOSION_FLOOR_Y = 61;

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

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

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
      const dCap = Math.hypot(dx / capScaleX, capDy / capScaleY) / lumpy;

      // Wide horizontal ground-deflected blast skirt hugging the floor (h = 0..skirtRy)
      const skirtLump = 1 + 0.12 * Math.sin(dx * 0.35 + phase * 1.6);
      const dSkirt = Math.hypot(dx / (skirtRx * skirtLump), h / skirtRy);

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
      const a = (k * Math.PI) / 180;
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
    const angle = (0.04 + hash(k, 1, 11) * 0.92) * Math.PI;
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
      for (let y = Math.floor(by - r); y <= Math.ceil(by + r); y++) {
        for (let x = Math.floor(bx - r); x <= Math.ceil(bx + r); x++) {
          if (Math.hypot((x - bx) / (groundCollar ? 1.45 : 1.15), y - by) <= r && hash(x, y, 17) > dissolve * 0.8 + 0.12 && (x + y) % 2 === (k & 1))
            put(x, y, hash(x, y, 19) < 0.5 ? SMOKE : SMOKE_DARK);
        }
      }
    }
  }

  // 5. The first instant: a hard white hemispherical ground flash with upward and lateral floor spikes
  if (t < 0.12) {
    const flash = 1 - t / 0.12;
    for (let k = 0; k < 11; k++) {
      const angle = (0.02 + (k / 10) * 0.96) * Math.PI;
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
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < EXPLOSION_CELL; x++)
        data.set(picture.subarray((y * EXPLOSION_CELL + x) * 4, (y * EXPLOSION_CELL + x) * 4 + 4), (y * width + frame * EXPLOSION_CELL + x) * 4);
    }
  }
  return { name: 'explosion', data, width, height, cell: EXPLOSION_CELL, frames: EXPLOSION_FRAMES };
}
