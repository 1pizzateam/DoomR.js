/**
 * The enemy projectile (hellfire orb) as a 2D pixel-art sprite animation:
 * - Drawn procedurally in code as a crisp power-of-two RGBA atlas (32 x 32 per cell, 8 frames = 256 x 32).
 * - A churning demonic blood-fire plasma sphere with a seething white-gold core, whipping crimson-orange flame tongues,
 *   dark necrotic cinder crust, and orbiting hell-sparks.
 */

export const FIREBALL_CELL = 32;
export const FIREBALL_FRAMES = 8;

const CORE_WHITE = [255, 250, 216];
const CORE_GOLD = [255, 216, 88];
const FLAME_ORANGE = [255, 140, 34];
const BLOOD_RED = [218, 44, 24];
const GORE_CRIMSON = [136, 16, 22];
const CINDER_DARK = [58, 14, 20];

function hash(x, y, salt) {
  let h = Math.imul(x * 374761393 + y * 668265263 + salt * 1274126177, 1103515245);
  h ^= h >>> 13;
  return ((Math.imul(h, 1274126177) >>> 0) % 4096) / 4096;
}

function drawFireballFrame(data, atlasWidth, frame) {
  const S = FIREBALL_CELL;
  const ox = frame * S;
  const cx = 15.5;
  const cy = 15.5;
  const phase = (frame / FIREBALL_FRAMES) * Math.PI * 2;
  const pulse = 1 + 0.08 * Math.sin(phase * 2);

  const put = (x, y, color) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 1 || y < 1 || x >= S - 1 || y >= S - 1)
      return;
    const o = (y * atlasWidth + ox + x) * 4;
    data[o] = color[0];
    data[o + 1] = color[1];
    data[o + 2] = color[2];
    data[o + 3] = 255;
  };

  // 1. Churning plasma body with swirling flame tongues and dark cinder crust
  const baseRadius = 10.2 * pulse;
  for (let y = 1; y < S - 1; y++) {
    for (let x = 1; x < S - 1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Swirling 4-lobe and 7-lobe demonic flame tongues
      const swirl =
        1 +
        0.18 * Math.sin(angle * 4 - phase * 2 + dist * 0.28) +
        0.12 * Math.cos(angle * 7 + phase * 3 - dist * 0.22);
      const r = dist / (baseRadius * swirl);
      if (r > 1.0)
        continue;

      const grain = (hash(x, y, frame + 1) - 0.5) * 0.18;
      const heat = 1 - r + grain;

      let color;
      if (heat > 0.74)
        color = CORE_WHITE;
      else if (heat > 0.54)
        color = CORE_GOLD;
      else if (heat > 0.34)
        color = FLAME_ORANGE;
      else if (heat > 0.16)
        color = BLOOD_RED;
      else if (heat > 0.05)
        color = GORE_CRIMSON;
      else
        color = CINDER_DARK;

      put(x, y, color);
    }
  }

  // 2. Whipping helical flame tendrils & orbiting hell-sparks
  for (let k = 0; k < 6; k++) {
    const baseAngle = phase + (k * Math.PI) / 3;
    for (let step = 0; step < 5; step++) {
      const t = step / 4;
      const rad = (7.2 + t * 4.8) * pulse;
      const a = baseAngle - t * 0.65;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      put(px, py, step < 2 ? CORE_GOLD : step < 4 ? FLAME_ORANGE : BLOOD_RED);
    }
    // Orbiting outer ember
    const sparkAngle = -phase * 1.5 + k * 1.047;
    const sparkRad = 11.4 + 1.4 * Math.sin(phase + k * 2.1);
    const sx = cx + Math.cos(sparkAngle) * sparkRad;
    const sy = cy + Math.sin(sparkAngle) * sparkRad;
    put(sx, sy, (k + frame) % 2 === 0 ? CORE_GOLD : FLAME_ORANGE);
  }
}

/** Returns the power-of-two RGBA sprite atlas for the enemy fireball projectile. */
export function fireballAtlas() {
  const width = FIREBALL_CELL * FIREBALL_FRAMES;
  const height = FIREBALL_CELL;
  const data = new Uint8Array(width * height * 4);
  for (let frame = 0; frame < FIREBALL_FRAMES; frame++)
    drawFireballFrame(data, width, frame);
  return { name: 'fireball', data, width, height, cell: FIREBALL_CELL, frames: FIREBALL_FRAMES };
}
