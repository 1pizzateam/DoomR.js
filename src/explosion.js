/**
 * The explosion of a barrel as a 2D sprite animation: a flash and a shockwave, a boiling fireball that cools from
 * white through yellow and orange to red, sparks thrown out of it, and then smoke that thins away. Drawn here in
 * code, one 64 x 64 cell per frame, 16 frames side by side in a 1024 x 64 atlas (a power of two).
 */

export const EXPLOSION_CELL = 64;
export const EXPLOSION_FRAMES = 16;

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

/** The picture of the explosion at `t`, 0 at the flash and 1 when only a little smoke is left; RGBA, 64 x 64. */
function drawFrame(t) {
  const size = EXPLOSION_CELL;
  const out = new Uint8Array(size * size * 4);
  const put = (x, y, color) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= size || y >= size)
      return;
    const o = (y * size + x) * 4;
    out[o] = color[0];
    out[o + 1] = color[1];
    out[o + 2] = color[2];
    out[o + 3] = 255;
  };

  const grow = 1 - (1 - Math.min(1, t / 0.5)) ** 2;
  const radius = 5 + 19 * grow;
  const cool = smooth(0.3, 0.95, t);
  const cx = 31.5;
  // the fireball climbs as it burns, and flattens at the bottom where it meets the floor
  const cy = 38 - 9 * smooth(0.1, 1, t);
  const phase = t * 5;
  const dissolve = smooth(0.72, 1, t) * 0.96;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = (y - cy) * (dy0(y, cy) ? 1.25 : 1);
      const d = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const lumpy = 1 + 0.2 * Math.sin(angle * 3 + phase + 1.3) + 0.13 * Math.sin(angle * 5 - phase * 1.4) + 0.08 * Math.sin(angle * 9 + phase * 2);
      const edge = Math.min(radius * lumpy, 29);
      if (d > edge)
        continue;
      const grain = (hash(x, y, 1) - 0.5) * 0.3;
      const heat = (1 - d / edge) * (1.15 - cool * 0.55) + grain * (1 - cool * 0.5);
      if (hash(x, y, 2) < dissolve)
        continue;
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
      // as it cools the outside goes to smoke first, a little more of it every frame
      if (heat < cool * 0.34)
        color = (x + y) % 2 ? SMOKE : SMOKE_DARK;
      put(x, y, color);
    }
  }

  // the shockwave: a ring that runs out ahead of the fire and thins to nothing
  if (t < 0.55) {
    const ring = 8 + 21 * (t / 0.55);
    const fade = 1 - t / 0.55;
    for (let k = 0; k < 360; k += 2) {
      const a = (k * Math.PI) / 180;
      if (hash(k, 3, 7) > 0.35 + fade * 0.6)
        continue;
      put(cx + Math.cos(a) * ring, cy + Math.sin(a) * ring * 0.8, fade > 0.5 ? WHITE : YELLOW);
    }
  }

  // sparks and embers, thrown out and falling
  for (let k = 0; k < 22; k++) {
    const angle = hash(k, 1, 11) * Math.PI * 2;
    const speed = 12 + hash(k, 2, 11) * 30;
    const life = 0.4 + hash(k, 3, 11) * 0.55;
    if (t < 0.05 || t > life)
      continue;
    const travel = (t - 0.05) * speed * 1.1;
    const x = cx + Math.cos(angle) * travel;
    const y = cy + Math.sin(angle) * travel * 0.8 + 38 * (t - 0.05) ** 2 - 4;
    const hot = t < life * 0.6;
    put(x, y, hot ? YELLOW : ORANGE);
    if (hot && hash(k, 4, 11) < 0.5)
      put(x - Math.cos(angle), y - Math.sin(angle) * 0.8, ORANGE);
  }

  // a column of smoke, rising out of the top of it, in the second half
  if (t > 0.45) {
    const rise = smooth(0.45, 1, t);
    for (let k = 0; k < 5; k++) {
      const bx = cx + (hash(k, 5, 13) - 0.5) * 20 * (0.4 + rise);
      const by = cy - 4 - rise * (14 + k * 4) - k * 1.5;
      const r = 3 + hash(k, 6, 13) * 4 + rise * 3;
      for (let y = Math.floor(by - r); y <= Math.ceil(by + r); y++) {
        for (let x = Math.floor(bx - r); x <= Math.ceil(bx + r); x++) {
          if (Math.hypot(x - bx, y - by) <= r && hash(x, y, 17) > dissolve * 0.8 + 0.12 && (x + y) % 2 === (k & 1))
            put(x, y, hash(x, y, 19) < 0.5 ? SMOKE : SMOKE_DARK);
        }
      }
    }
  }

  // the first instant: a hard white flash with spikes
  if (t < 0.12) {
    const flash = 1 - t / 0.12;
    for (let k = 0; k < 10; k++) {
      const angle = (k / 10) * Math.PI * 2 + 0.3;
      const reach = (10 + 14 * hash(k, 1, 23)) * (0.5 + flash * 0.5);
      for (let d = 0; d < reach; d += 0.7)
        put(cx + Math.cos(angle) * d, cy + Math.sin(angle) * d, d < reach * 0.5 ? WHITE : YELLOW);
    }
  }
  return out;
}

// the fireball is squashed a little at its base, where it sits on the floor
function dy0(y, cy) {
  return y > cy;
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
