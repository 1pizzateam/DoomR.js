import { Trigo, Utils, Vec2, Vec3 } from '@1pizzateam/spock';
import { SOLID_TEXTURED_FRAGMENT } from './quads.js';
import { mulberry32 } from './rng.js';
import floorRustShader from './shaders/floor-rust.shadergun.json' with { type: 'json' };
import slimeShader from './shaders/slime.shadergun.json' with { type: 'json' };
import acidMistShader from './shaders/acid-mist.shadergun.json' with { type: 'json' };
import teleporterShader from './shaders/teleporter.shadergun.json' with { type: 'json' };
import marsDirtShader from './shaders/mars-dirt.shadergun.json' with { type: 'json' };

const scratchPt = new Vec2();

/**
 * The floor of an old space base: worn deck plates, grating, hatches, cable runs, inlaid light strips and the odd
 * bolted-on patch or a cracked panel, as a pixel-art atlas drawn here in code (no image files). A cell is one 64 x 64 tile of
 * the level, so one texel is one world unit.
 *
 * The colours stay dark so the lines and the glow still read over them: the metal is a blue-grey close to the
 * background, and the rust is a dull brown, not the bright orange that means danger. The one bright orange on the
 * floor is the hazard striping on a doorstep, which is meant to.
 */

export const TILE_PIXELS = 256;
export const FLOOR_CELLS = { plain: 0, grating: 1, hatch: 2, patched: 3, cracked: 4, conduit: 5, hazard: 6, lights: 7 };
export const FLOOR_CELL_COUNT = 8;

export const METAL = [21, 27, 39];
export const LIGHT = [44, 56, 78];
export const SHADOW = [9, 12, 19];
const RUST = [72, 38, 19];
const RUST_BRIGHT = [112, 58, 24];
const RUST_DARK = [38, 21, 13];
const HAZARD = [160, 90, 30];
export const GLOW = [76, 128, 232];

export const mix = (a, b, t) => [Utils.lerp(a[0], b[0], t), Utils.lerp(a[1], b[1], t), Utils.lerp(a[2], b[2], t)];

function texelMicroGrain(px, py) {
  let h = Math.imul(px * 374761393 ^ py * 668265263, 1274126177);
  h ^= h >>> 13;
  return (((Math.imul(h, 1911520717) >>> 0) % 1000) / 1000) - 0.5;
}

/** A small RGB picture to draw on; the barrel shares it. */
export class Tile {
  constructor(width = TILE_PIXELS, height = TILE_PIXELS, scale = 1) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.pixels = new Float32Array(width * height * 3);
  }

  setRaw(px, py, color, amount = 1) {
    px = Math.round(px);
    py = Math.round(py);
    if (px < 0 || py < 0 || px >= this.width || py >= this.height)
      return;
    const i = (py * this.width + px) * 3;
    for (let k = 0; k < 3; k++)
      this.pixels[i + k] = Utils.lerp(this.pixels[i + k], color[k], amount);
  }

  set(x, y, color, amount = 1) {
    const s = this.scale;
    if (s === 1) {
      this.setRaw(x, y, color, amount);
      return;
    }
    const px0 = Math.round(x * s);
    const py0 = Math.round(y * s);
    for (let dy = 0; dy < s; dy++)
      for (let dx = 0; dx < s; dx++)
        this.setRaw(px0 + dx, py0 + dy, color, amount);
  }

  get(x, y) {
    const px = Math.round(x * this.scale);
    const py = Math.round(y * this.scale);
    const i = (py * this.width + px) * 3;
    return [this.pixels[i], this.pixels[i + 1], this.pixels[i + 2]];
  }

  rect(x0, y0, w, h, color, amount = 1) {
    const s = this.scale;
    if (s === 1) {
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++)
          this.setRaw(x, y, color, amount);
      return;
    }
    const px0 = Math.round(x0 * s);
    const py0 = Math.round(y0 * s);
    const px1 = Math.round((x0 + w) * s);
    const py1 = Math.round((y0 + h) * s);
    for (let py = py0; py < py1; py++)
      for (let px = px0; px < px1; px++)
        this.setRaw(px, py, color, amount);
  }
}

/** Smooth random 0..1 over the plane, a few octaves, so rust spreads in patches rather than as speckle. */
export function field(rnd, scale) {
  const size = 12;
  const grids = [0, 1, 2].map(() => Array.from({ length: (size + 1) * (size + 1) }, () => rnd()));
  return (x, y) => {
    let total = 0;
    let weight = 0;
    for (let o = 0; o < 3; o++) {
      const cell = scale / 2 ** o;
      const gx = x / cell;
      const gy = y / cell;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = gx - x0;
      const fy = gy - y0;
      const sx = Utils.smoothstep(0, 1, fx);
      const sy = Utils.smoothstep(0, 1, fy);
      const at = (ix, iy) => grids[o][(((iy % size) + size) % size) * (size + 1) + (((ix % size) + size) % size)];
      const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
      const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
      const w = 1 / 2 ** o;
      total += (top * (1 - sy) + bottom * sy) * w;
      weight += w;
    }
    return total / weight;
  };
}

/** A beveled steel plate: grain, a light edge top and left, a dark one bottom and right, and rivets in the corners. */
export function plate(t, x0, y0, w, h, rnd, base = METAL) {
  const s = t.scale;
  if (s > 1 && x0 === 0 && y0 === 0 && w === t.width && h === t.height) {
    w /= s;
    h /= s;
  }
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const grain = (rnd() - 0.5) * 7 + (((x >> 2) + (y >> 2)) % 2 ? 1.5 : 0);
      if (s === 1) {
        t.setRaw(x, y, [base[0] + grain, base[1] + grain, base[2] + grain * 1.2]);
      } else {
        const px0 = Math.round(x * s);
        const py0 = Math.round(y * s);
        for (let dy = 0; dy < s; dy++)
          for (let dx = 0; dx < s; dx++) {
            const px = px0 + dx;
            const py = py0 + dy;
            const micro = (((px + (py >> 1)) & 3) === 0 ? 0.85 : -0.28) + texelMicroGrain(px, py) * 2.2;
            const g = grain * 0.78 + micro;
            t.setRaw(px, py, [base[0] + g, base[1] + g, base[2] + g * 1.2]);
          }
      }
    }
  if (s === 1) {
    for (let i = 0; i < w; i++) {
      t.set(x0 + i, y0, LIGHT, 0.85);
      t.set(x0 + i, y0 + 1, LIGHT, 0.3);
      t.set(x0 + i, y0 + h - 1, SHADOW);
      t.set(x0 + i, y0 + h - 2, SHADOW, 0.5);
    }
    for (let i = 0; i < h; i++) {
      t.set(x0, y0 + i, LIGHT, 0.7);
      t.set(x0 + w - 1, y0 + i, SHADOW);
      t.set(x0 + w - 2, y0 + i, SHADOW, 0.5);
    }
    return;
  }
  const px0 = Math.round(x0 * s);
  const py0 = Math.round(y0 * s);
  const pw = Math.round(w * s);
  const ph = Math.round(h * s);
  // Soft inner ambient occlusion gradient near machined seams
  const aoSpan = Math.min(8, Math.floor(Math.min(pw, ph) * 0.15));
  for (let py = py0; py < py0 + ph; py++)
    for (let px = px0; px < px0 + pw; px++) {
      const dEdge = Math.min(px - px0, py - py0, px0 + pw - 1 - px, py0 + ph - 1 - py);
      if (dEdge >= 2 && dEdge < aoSpan)
        t.setRaw(px, py, SHADOW, (1 - (dEdge - 2) / (aoSpan - 2)) * 0.22);
    }
  // Crisp native-resolution 2px expansion seam + 3px machined 45° chamfer highlight/shadow
  for (let dx = 0; dx < pw; dx++) {
    const px = px0 + dx;
    t.setRaw(px, py0, SHADOW, 0.78);
    t.setRaw(px, py0 + 1, LIGHT, 0.88);
    t.setRaw(px, py0 + 2, LIGHT, 0.52);
    t.setRaw(px, py0 + 3, LIGHT, 0.22);
    t.setRaw(px, py0 + ph - 4, SHADOW, 0.28);
    t.setRaw(px, py0 + ph - 3, SHADOW, 0.58);
    t.setRaw(px, py0 + ph - 2, SHADOW, 0.88);
    t.setRaw(px, py0 + ph - 1, SHADOW, 0.98);
  }
  for (let dy = 0; dy < ph; dy++) {
    const py = py0 + dy;
    t.setRaw(px0, py, SHADOW, 0.78);
    t.setRaw(px0 + 1, py, LIGHT, 0.75);
    t.setRaw(px0 + 2, py, LIGHT, 0.42);
    t.setRaw(px0 + 3, py, LIGHT, 0.18);
    t.setRaw(px0 + pw - 4, py, SHADOW, 0.28);
    t.setRaw(px0 + pw - 3, py, SHADOW, 0.58);
    t.setRaw(px0 + pw - 2, py, SHADOW, 0.88);
    t.setRaw(px0 + pw - 1, py, SHADOW, 0.98);
  }
}

export function rivet(t, x, y) {
  const s = t.scale;
  if (s === 1) {
    t.rect(x, y, 3, 3, mix(METAL, LIGHT, 0.55));
    t.set(x, y, LIGHT);
    t.set(x + 2, y + 2, SHADOW);
    t.set(x + 1, y + 3, SHADOW, 0.7);
    t.set(x + 3, y + 1, SHADOW, 0.7);
    return;
  }
  const cx = (x + 1.5) * s - 0.5;
  const cy = (y + 1.5) * s - 0.5;
  const r = 1.65 * s;
  const px0 = Math.floor(cx - r - 2);
  const py0 = Math.floor(cy - r - 2);
  const px1 = Math.ceil(cx + r + 2);
  const py1 = Math.ceil(cy + r + 2);
  for (let py = py0; py <= py1; py++)
    for (let px = px0; px <= px1; px++) {
      const dx = (px - cx) / r;
      const dy = (py - cy) / r;
      const d = Math.hypot(dx, dy);
      if (d <= 1.0) {
        const nz = Math.sqrt(Math.max(0, 1 - d * d));
        const spec = Math.max(0, -dx * 0.65 - dy * 0.65 + nz * 0.38);
        const col = spec > 0.55
          ? mix(METAL, LIGHT, Math.min(1, 0.45 + (spec - 0.55) * 1.4))
          : mix(SHADOW, METAL, Math.max(0.15, nz * 0.85));
        t.setRaw(px, py, col, 0.95);
      } else if (d <= 1.28 && (dx > -0.2 || dy > -0.2)) {
        t.setRaw(px, py, SHADOW, (1 - (d - 1.0) / 0.28) * 0.75);
      }
    }
}

function rivets(t, inset) {
  const far = 64 - inset - 3;
  for (const [x, y] of [[inset, inset], [far, inset], [inset, far], [far, far]])
    rivet(t, x, y);
}

/**
 * Rust: it grows from a few places, brightest where it is thickest, and runs down in streaks. `amount` is how much
 * of the tile is touched, `holes` how much of that has rotted through to the dark below.
 */
export function rust(t, rnd, amount, holes = 0) {
  const s = t.scale;
  const patch = field(rnd, 16);
  const medium = field(rnd, 7);
  const fine = field(rnd, 3);
  const margin = 2 * s;
  for (let py = margin; py < t.height - margin; py++)
    for (let px = margin; px < t.width - margin; px++) {
      const x = px / s;
      const y = py / s;
      const jx = (fine(x + 11, y + 37) - 0.5) * 4.5;
      const jy = (fine(x + 53, y + 19) - 0.5) * 4.5;
      const micro = s > 1 ? texelMicroGrain(px, py) * 0.14 : (rnd() - 0.5) * 0.12;
      const ridged = 1 - Math.abs(fine(x + 43, y + 11) * 2 - 1);
      const n = patch(x + jx, y + jy) * 0.44 + medium(x + 17 + jx * 0.5, y + 29 + jy * 0.5) * 0.34 + ridged * 0.22 + micro;
      const edge = n - (1 - amount * 0.88);
      if (edge <= 0)
        continue;
      const depth = Math.min(1, edge * 4.2);
      let color = mix(RUST_DARK, RUST, fine(x + 40, y) * 0.8 + 0.2);
      if (depth > 0.56 && fine(x, y + 31) > 0.46)
        color = mix(RUST, RUST_BRIGHT, (fine(x * 2, y * 2) - 0.3) * 1.2);
      if (holes && n > 1 - holes)
        color = mix(SHADOW, RUST_DARK, fine(x, y) * 0.3);
      t.setRaw(px, py, color, 0.34 + depth * 0.59);
    }
  // streaks run down from the thickest patches
  const lw = t.width / s;
  const lh = t.height / s;
  for (let k = 0; k < 5; k++) {
    const x = 4 + Math.floor(rnd() * (lw - 8));
    const y0 = 3 + Math.floor(rnd() * Math.max(1, lh - 18));
    if (patch(x, y0) * 0.6 + medium(x + 17, y0 + 29) * 0.4 < 1 - amount * 0.85)
      continue;
    const length = 4 + Math.floor(rnd() * 10);
    for (let d = 0; d < length; d++)
      t.set(x, y0 + d, RUST_DARK, 0.52 * (1 - d / length));
  }
}

function scuffs(t, rnd, count) {
  const s = t.scale;
  const lw = t.width / s;
  const lh = t.height / s;
  for (let k = 0; k < count; k++) {
    const x = 3 + Math.floor(rnd() * (lw - 6));
    const y = 3 + Math.floor(rnd() * (lh - 6));
    const length = 2 + Math.floor(rnd() * 5);
    if (s === 1) {
      for (let d = 0; d < length; d++)
        t.set(x + d, y + (d >> 1), LIGHT, 0.35);
    } else {
      const px0 = Math.round(x * s);
      const py0 = Math.round(y * s);
      const steps = length * s;
      for (let i = 0; i < steps; i++) {
        const fade = Math.sin((i / steps) * Trigo.pi);
        const px = px0 + i;
        const py = py0 + Math.round(i * 0.45);
        t.setRaw(px, py, SHADOW, 0.48 * fade);
        t.setRaw(px, py + 1, LIGHT, 0.52 * fade);
      }
    }
  }
}

/** Embosses a subtle anti-slip diamond tread pattern and recessed panel pocket inside a deck plate. */
function deckPlateDetail(t, x0, y0, w, h) {
  const s = t.scale;
  const px0 = (x0 + 4) * s;
  const py0 = (y0 + 4) * s;
  const px1 = (x0 + w - 4) * s;
  const py1 = (y0 + h - 4) * s;
  // Recessed inner border groove
  for (let px = px0; px < px1; px++) {
    t.setRaw(px, py0, SHADOW, 0.62);
    t.setRaw(px, py0 + 1, LIGHT, 0.35);
    t.setRaw(px, py1 - 2, SHADOW, 0.45);
    t.setRaw(px, py1 - 1, LIGHT, 0.42);
  }
  for (let py = py0; py < py1; py++) {
    t.setRaw(px0, py, SHADOW, 0.62);
    t.setRaw(px0 + 1, py, LIGHT, 0.35);
    t.setRaw(px1 - 2, py, SHADOW, 0.45);
    t.setRaw(px1 - 1, py, LIGHT, 0.42);
  }
  // Subtle raised anti-slip lozenge lugs inside the panel field
  for (let py = py0 + 6; py < py1 - 6; py++)
    for (let px = px0 + 6; px < px1 - 6; px++) {
      const cellX = px % 16;
      const cellY = py % 16;
      const alt = (((px >> 4) + (py >> 4)) & 1) === 0;
      const u = alt ? cellX - cellY : cellX + cellY - 15;
      const v = alt ? cellX + cellY - 15 : cellX - cellY;
      if (Math.abs(u) <= 1 && Math.abs(v) <= 4) {
        t.setRaw(px, py, u <= 0 ? LIGHT : SHADOW, u <= 0 ? 0.22 : 0.28);
      }
    }
}

function drawPlain(t, rnd) {
  // four interlocking machined deck plates with anti-slip tread, corner gussets, and domed rivets
  for (const [x, y] of [[0, 0], [32, 0], [0, 32], [32, 32]]) {
    plate(t, x, y, 32, 32, rnd);
    deckPlateDetail(t, x, y, 32, 32);
    for (const [rx, ry] of [[x + 2, y + 2], [x + 27, y + 2], [x + 2, y + 27], [x + 27, y + 27]])
      rivet(t, rx, ry);
  }
  scuffs(t, rnd, 9);
}

function drawGrating(t, rnd) {
  plate(t, 0, 0, 64, 64, rnd);
  const s = t.scale;
  const g0 = 6 * s;
  const g1 = 58 * s;
  // Machined outer grating frame bezel (5..59)
  for (let i = 5 * s; i < 59 * s; i++) {
    for (let k = 0; k < s; k++) {
      t.setRaw(i, 5 * s + k, k < 2 ? SHADOW : LIGHT, k < 2 ? 0.9 : 0.45);
      t.setRaw(5 * s + k, i, k < 2 ? SHADOW : LIGHT, k < 2 ? 0.9 : 0.45);
      t.setRaw(i, 58 * s + k, k < 2 ? SHADOW : LIGHT, k < 2 ? 0.65 : 0.72);
      t.setRaw(58 * s + k, i, k < 2 ? SHADOW : LIGHT, k < 2 ? 0.65 : 0.72);
    }
  }
  // High-definition diamond-mesh industrial grating over a dark sub-floor pit with deep I-beam joists
  for (let py = g0; py < g1; py++)
    for (let px = g0; px < g1; px++) {
      const lx = px / s;
      const ly = py / s;
      const dA = Math.abs(((px + py) % 24) - 12);
      const dB = Math.abs(((px - py + 512) % 24) - 12);
      const dBar = Math.min(dA, dB);
      const crossPin = (px % 32) < 3;
      if (dBar <= 3.2 || crossPin) {
        const profile = crossPin && dBar > 3.2
          ? 1 - Math.abs((px % 32) - 1) / 2.2
          : Math.max(0, 1 - dBar / 3.4);
        const topSpec = dA < dB ? ((px + py) % 24 < 12) : ((px - py + 512) % 24 < 12);
        const shade = 0.25 + profile * 0.55 + (topSpec ? 0.16 : -0.12);
        const jitter = (((px * 13 ^ py * 29) & 7) - 3.5) * 0.015;
        const col = mix(SHADOW, mix(METAL, LIGHT, 0.72), Utils.clamp(shade + jitter, 0.08, 0.96));
        t.setRaw(px, py, col, 0.98);
      } else {
        // Deep pit void with two dimly lit sub-floor support girders at y = 21 and y = 43
        const joistDist = Math.min(Math.abs(ly - 21), Math.abs(ly - 43));
        const joist = joistDist < 2.2 ? (1 - joistDist / 2.2) * 0.28 : 0;
        t.setRaw(px, py, mix(SHADOW, METAL, joist), 0.98);
      }
    }
  for (const pos of [2, 18, 43, 59]) {
    rivet(t, pos, 1);
    rivet(t, pos, 60);
  }
  for (const pos of [18, 43]) {
    rivet(t, 1, pos);
    rivet(t, 60, pos);
  }
}

function drawHatch(t, rnd) {
  plate(t, 0, 0, 64, 64, rnd);
  deckPlateDetail(t, 0, 0, 64, 64);
  const cx = 31.5;
  const cy = 31.5;
  const s = t.scale;
  for (let py = 0; py < t.height; py++)
    for (let px = 0; px < t.width; px++) {
      const x = (px + 0.5) / s - 0.5;
      const y = (py + 0.5) / s - 0.5;
      const dx = x - cx;
      const dy = y - cy;
      const d = scratchPt.setScalar(dx, dy).getMagnitude();
      if (d < 24.2 && d >= 22.0) {
        // Outer machined collar bevel
        const bevelAmt = (dx + dy) / (d + 0.01) < 0 ? 0.55 : 0.15;
        t.setRaw(px, py, mix(SHADOW, LIGHT, bevelAmt), 0.88);
      } else if (d < 22.0 && d >= 19.2) {
        // Deep recessed gasket channel
        t.setRaw(px, py, SHADOW, 0.96);
      } else if (d < 19.2 && d >= 17.2) {
        // Raised hatch cover rim with directional 3D specular highlight
        const spec = Math.max(0.15, 0.55 - (dx + dy) / (d * 2.2));
        t.setRaw(px, py, mix(SHADOW, LIGHT, spec), 0.92);
      } else if (d < 17.2) {
        // Ribbed anti-slip circular hatch cover with radial cross-stiffeners
        const ribY = Math.abs(((y + 4) % 6) - 3);
        const crossStiff = Math.min(Math.abs(dx), Math.abs(dy)) < 1.35;
        let col = crossStiff
          ? mix(METAL, LIGHT, 0.38)
          : ribY < 1.1
            ? mix(METAL, LIGHT, 0.46 - ribY * 0.2)
            : mix(METAL, SHADOW, 0.32);
        // Subtle radial brushed shading
        const dome = Math.max(0, 1 - (d / 17.2) ** 2) * 0.12;
        col = mix(col, LIGHT, dome);
        t.setRaw(px, py, col, 0.96);
      }
      // 3D-shaded circular handwheel ring (r = 8.2..10.2), 6 spokes, and central locking cap (r < 3.6)
      if (d <= 10.6) {
        const ang = Math.atan2(dy, dx);
        const spokeDist = Math.abs(Math.sin(ang * 3)) * d;
        const onRing = d >= 7.8 && d <= 10.2;
        const onSpoke = d >= 3.2 && d <= 8.4 && spokeDist < 1.05;
        const onHub = d < 3.6;
        if (onHub) {
          const nz = Math.sqrt(Math.max(0, 1 - (d / 3.6) ** 2));
          const spec = Math.max(0, (-dx - dy) * 0.18 + nz * 0.75);
          t.setRaw(px, py, mix(SHADOW, LIGHT, Utils.clamp(spec, 0.25, 0.95)), 0.98);
        } else if (onRing) {
          const tube = 1 - Math.abs(d - 9.0) / 1.25;
          t.setRaw(px, py, mix(SHADOW, LIGHT, 0.25 + tube * 0.65), 0.96);
        } else if (onSpoke) {
          const ridge = 1 - spokeDist / 1.05;
          t.setRaw(px, py, mix(SHADOW, LIGHT, 0.22 + ridge * 0.58), 0.94);
        } else if (d >= 7.2 && d <= 10.6) {
          t.setRaw(px, py, SHADOW, 0.55);
        }
      }
    }
  for (let k = 0; k < 8; k++) {
    const angle = (k / 8) * Trigo.twopi + 0.4;
    rivet(t, Math.round(cx + Math.cos(angle) * 25.5) - 1, Math.round(cy + Math.sin(angle) * 25.5) - 1);
  }
}

/** A square of fresh plate bolted over a damaged place, with a bead of weld round it. */
function drawPatched(t, rnd) {
  drawPlain(t, rnd);
  const s = t.scale;
  const w = 30 + Math.floor(rnd() * 8);
  const h = 22 + Math.floor(rnd() * 8);
  const x0 = 8 + Math.floor(rnd() * (64 - w - 16));
  const y0 = 8 + Math.floor(rnd() * (64 - h - 16));
  // Drop shadow cast by the overlapping repair plate onto the deck below
  const px0 = x0 * s;
  const py0 = y0 * s;
  const pw = w * s;
  const ph = h * s;
  for (let py = py0 - 4; py < py0 + ph + 6; py++)
    for (let px = px0 - 4; px < px0 + pw + 6; px++)
      if (px < px0 || px >= px0 + pw || py < py0 || py >= py0 + ph)
        t.setRaw(px, py, SHADOW, 0.68);
  plate(t, x0, y0, w, h, rnd, mix(METAL, LIGHT, 0.24));
  // Native-resolution rippled TIG-weld bead around the entire patch perimeter
  for (let dx = -2; dx <= pw + 1; dx++) {
    const ripple = Math.sin(dx * 0.85) * 0.5 + 0.5;
    for (const [by, sign] of [[py0 - 1, -1], [py0 + ph, 1]]) {
      t.setRaw(px0 + dx, by + sign * 2, SHADOW, 0.82);
      t.setRaw(px0 + dx, by + sign, mix(SHADOW, METAL, 0.45 + ripple * 0.35), 0.9);
      t.setRaw(px0 + dx, by, mix(METAL, LIGHT, 0.35 + ripple * 0.55), 0.92);
    }
  }
  for (let dy = -2; dy <= ph + 1; dy++) {
    const ripple = Math.sin(dy * 0.85) * 0.5 + 0.5;
    for (const [bx, sign] of [[px0 - 1, -1], [px0 + pw, 1]]) {
      t.setRaw(bx + sign * 2, py0 + dy, SHADOW, 0.82);
      t.setRaw(bx + sign, py0 + dy, mix(SHADOW, METAL, 0.45 + ripple * 0.35), 0.9);
      t.setRaw(bx, py0 + dy, mix(METAL, LIGHT, 0.35 + ripple * 0.55), 0.92);
    }
  }
  const midX = x0 + (w >> 1) - 1;
  for (const [x, y] of [
    [x0 + 2, y0 + 2], [midX, y0 + 2], [x0 + w - 5, y0 + 2],
    [x0 + 2, y0 + h - 5], [midX, y0 + h - 5], [x0 + w - 5, y0 + h - 5],
  ])
    rivet(t, x, y);
}

/** A plate that has split: a crack with branches, and chips knocked out along it. */
function drawCracked(t, rnd) {
  drawPlain(t, rnd);
  const s = t.scale;
  let x = 8 + Math.floor(rnd() * 20);
  let y = 4;
  const branches = [];
  let prevX = x;
  while (y < 64 - 5) {
    prevX = x;
    x += Math.round((rnd() - 0.45) * 2.4);
    y += 1;
    // Carve a high-resolution jagged fracture line across all `s` sub-rows
    for (let sub = 0; sub < s; sub++) {
      const f = sub / s;
      const jitter = Math.sin((y * s + sub) * 0.9) * 0.65;
      const cx = Math.round((prevX + (x - prevX) * f) * s + jitter);
      const cy = y * s + sub;
      for (let dx = -4; dx <= 5; dx++) {
        if (dx >= -1 && dx <= 1)
          t.setRaw(cx + dx, cy, SHADOW, 0.98);
        else if (dx === 2 || dx === 3)
          t.setRaw(cx + dx, cy, SHADOW, dx === 2 ? 0.72 : 0.38);
        else if (dx === -2 || dx === -3)
          t.setRaw(cx + dx, cy, LIGHT, dx === -2 ? 0.52 : 0.24);
      }
    }
    if (rnd() < 0.07)
      branches.push([x, y, rnd() < 0.5 ? -1 : 1]);
  }
  for (const [bx, by, dir] of branches) {
    let px = bx;
    let py = by;
    const len = 6 + Math.floor(rnd() * 12);
    for (let i = 0; i < len; i++) {
      const ox = px;
      const oy = py;
      px += dir;
      py += Math.round(rnd() * 1.5);
      const fade = 1 - i / len;
      for (let sub = 0; sub < s; sub++) {
        const f = sub / s;
        const rx = Math.round((ox + (px - ox) * f) * s);
        const ry = Math.round((oy + (py - oy) * f) * s);
        t.setRaw(rx, ry, SHADOW, 0.92 * fade);
        t.setRaw(rx + 1, ry, SHADOW, 0.58 * fade);
        t.setRaw(rx, ry + 1, LIGHT, 0.38 * fade);
      }
    }
  }
  for (let k = 0; k < 7; k++) {
    const cx = (10 + Math.floor(rnd() * 40)) * s;
    const cy = (6 + Math.floor(rnd() * 50)) * s;
    const rx = (2 + Math.floor(rnd() * 3)) * s * 0.55;
    const ry = s * 0.9;
    for (let dy = -Math.ceil(ry) - 1; dy <= Math.ceil(ry) + 1; dy++)
      for (let dx = -Math.ceil(rx) - 1; dx <= Math.ceil(rx) + 1; dx++) {
        const d = Math.hypot(dx / rx, dy / ry);
        if (d <= 0.85)
          t.setRaw(cx + dx, cy + dy, SHADOW, 0.9);
        else if (d <= 1.2)
          t.setRaw(cx + dx, cy + dy, dx + dy > 0 ? LIGHT : SHADOW, 0.45);
      }
  }
}

function drawConduit(t, rnd) {
  drawPlain(t, rnd);
  const s = t.scale;
  // Recessed dark cable trench across y = 16..46
  for (let py = 16 * s; py < 46 * s; py++)
    for (let px = 0; px < t.width; px++) {
      const border = py < 16 * s + 2 || py >= 46 * s - 2;
      t.setRaw(px, py, border ? LIGHT : SHADOW, border ? 0.32 : 0.45);
    }
  // Three 3D cylindrical armored power cables with helical BX ribbing running across the tile
  for (const [yBase, rad] of [[19.5, 1.85], [28.0, 2.25], [40.5, 1.85]])
    for (let px = 0; px < t.width; px++) {
      const lx = (px + 0.5) / s;
      const sag = Math.sin(lx * 0.12 + yBase) * 0.85;
      const cy = (yBase + sag) * s;
      const rPx = rad * s;
      const rib = Math.sin(px * 0.95 + yBase * 3) * 0.12;
      for (let dy = -Math.ceil(rPx) - 2; dy <= Math.ceil(rPx) + 3; dy++) {
        const py = Math.round(cy + dy);
        const norm = dy / rPx;
        if (Math.abs(norm) <= 1.0) {
          const nz = Math.sqrt(Math.max(0, 1 - norm * norm));
          const spec = Math.max(0, -norm * 0.55 + nz * 0.65) + rib;
          const col = spec > 0.62
            ? mix(METAL, LIGHT, Math.min(1, 0.38 + (spec - 0.62) * 1.45))
            : mix(SHADOW, METAL, Math.max(0.12, nz * 0.85 + rib));
          t.setRaw(px, py, col, 0.96);
        } else if (norm > 1.0 && norm <= 1.45) {
          t.setRaw(px, py, SHADOW, (1 - (norm - 1.0) / 0.45) * 0.78);
        }
      }
    }
  // Machined steel bridge clamps strapping the cables down
  for (const x of [14, 46]) {
    const px0 = x * s;
    const py0 = 15 * s;
    const pw = 5 * s;
    const ph = 33 * s;
    for (let py = py0; py < py0 + ph; py++)
      for (let px = px0 - 2; px < px0 + pw + 2; px++) {
        if (px < px0 || px >= px0 + pw) {
          t.setRaw(px, py, SHADOW, 0.75);
          continue;
        }
        const edgeX = Math.min(px - px0, px0 + pw - 1 - px);
        const edgeY = Math.min(py - py0, py0 + ph - 1 - py);
        if (edgeY < 2)
          t.setRaw(px, py, py < py0 + 2 ? LIGHT : SHADOW, 0.88);
        else if (edgeX < 2)
          t.setRaw(px, py, px < px0 + 2 ? LIGHT : SHADOW, 0.75);
        else
          t.setRaw(px, py, mix(METAL, LIGHT, 0.36), 0.96);
      }
    rivet(t, x + 1, 17);
    rivet(t, x + 1, 30);
    rivet(t, x + 1, 42);
  }
}

/** The doorstep: dull orange and dark stripes, worn through in places. */
function drawHazard(t, rnd) {
  plate(t, 0, 0, 64, 64, rnd, [18, 21, 29]);
  const s = t.scale;
  const wear = field(rnd, 8);
  const fineWear = field(rnd, 20);
  // Crisp 45° native-resolution hazard stripes with paint chipping & diamond-tread texture
  for (let py = 5 * s; py < 59 * s; py++)
    for (let px = 3 * s; px < 61 * s; px++) {
      const lx = px / s;
      const ly = py / s;
      const band = ((px + py) / (9 * s)) % 2;
      const stripeDist = Math.min(band, Math.abs(band - 1), 2 - band) * 9 * s;
      const stripe = band < 1.0;
      const tread = (((px % 12) === (py % 12)) || ((px + py) % 12 === 0)) && (px % 12 > 2) && (px % 12 < 9);
      if (!stripe) {
        if (stripeDist < 1.5)
          t.setRaw(px, py, SHADOW, 0.75);
        else if (tread)
          t.setRaw(px, py, LIGHT, 0.14);
        continue;
      }
      const wVal = wear(lx, ly) * 0.75 + fineWear(lx, ly) * 0.25 + texelMicroGrain(px, py) * 0.08;
      const worn = wVal > 0.62;
      let col = worn
        ? mix(HAZARD, RUST_DARK, 0.78)
        : mix(HAZARD, RUST, 0.22 + (fineWear(lx + 13, ly + 7) - 0.5) * 0.24);
      if (tread && !worn)
        col = mix(col, LIGHT, 0.12);
      const edgeAlpha = Math.min(1, stripeDist * 0.75) * 0.92;
      t.setRaw(px, py, col, edgeAlpha);
    }
  // Recessed steel threshold rails top & bottom
  for (let px = 3 * s; px < 61 * s; px++)
    for (let k = 0; k < s; k++) {
      t.setRaw(px, 5 * s + k, k < 2 ? SHADOW : LIGHT, k < 2 ? 0.92 : 0.45);
      t.setRaw(px, 58 * s + k, k < 2 ? LIGHT : SHADOW, k < 2 ? 0.45 : 0.92);
    }
  rivets(t, 1);
}

/** Inlaid strips of light, the futuristic part: the one thing on the floor that is not dim. */
function drawLights(t, rnd) {
  drawPlain(t, rnd);
  const s = t.scale;
  for (const y of [14, 49]) {
    // Dark recessed steel bezel housing around each floor light strip
    const py0 = (y - 3) * s;
    const py1 = (y + 4) * s;
    const px0 = 4 * s;
    const px1 = 60 * s;
    for (let py = py0; py < py1; py++)
      for (let px = px0; px < px1; px++) {
        const border = px < 6 * s || px >= 58 * s || py < py0 + 2 || py >= py1 - 2;
        if (border) {
          const hi = py >= py1 - 2 || px >= 58 * s;
          t.setRaw(px, py, hi ? LIGHT : SHADOW, hi ? 0.42 : 0.92);
          continue;
        }
        const lx = (px + 0.5) / s;
        const ly = (py + 0.5) / s - 0.5;
        const flicker = lx > 24 && lx < 31 ? 0.35 + 0.12 * Math.sin(px * 0.5) : 1;
        const dy = Math.abs(ly - y);
        const baffle = (px % (4 * s)) < 2;
        if (baffle && dy < 2.2) {
          t.setRaw(px, py, mix(SHADOW, GLOW, 0.28 * flicker), 0.88);
          continue;
        }
        const core = Math.max(0, 1 - dy / 2.6);
        const corePow = core * core;
        const col = mix(GLOW, [220, 238, 255], corePow * 0.42);
        const alpha = (0.12 + 0.86 * corePow) * flicker;
        t.setRaw(px, py, col, alpha);
      }
  }
}

const DRAW = [drawPlain, drawGrating, drawHatch, drawPatched, drawCracked, drawConduit, drawHazard, drawLights];

/** The atlas as RGBA pixels, ready to be a texture. Its size is a power of two, so it can have mipmaps. */
export function floorAtlas() {
  const width = TILE_PIXELS * FLOOR_CELL_COUNT;
  const height = TILE_PIXELS;
  const data = new Uint8Array(width * height * 4);
  DRAW.forEach((draw, cell) => {
    const tile = new Tile(TILE_PIXELS, TILE_PIXELS, TILE_PIXELS / 64);
    draw(tile, mulberry32(7000 + cell * 104729));
    for (let y = 0; y < height; y++)
      for (let x = 0; x < TILE_PIXELS; x++) {
        const i = (y * TILE_PIXELS + x) * 3;
        const o = (y * width + cell * TILE_PIXELS + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name: 'floor', data, width, height, cell: TILE_PIXELS, frames: FLOOR_CELL_COUNT };
}

/** Texture coordinates of a cell: [u0, v0, u1, v1], with v1 at the top of the image. A hair inside, so mipmaps do not bleed. */
export function floorCellUv(cell) {
  const inset = 0.25 / (TILE_PIXELS * FLOOR_CELL_COUNT);
  return [cell / FLOOR_CELL_COUNT + inset, 0, (cell + 1) / FLOOR_CELL_COUNT - inset, 1];
}

/**
 * Which cell is on a tile. Doorsteps are hazard stripes; the rest are scattered by a hash of where they are, so a room
 * is neither a grid of copies nor random noise, and the same level always looks the same.
 */
export function floorCellFor(x, y, door = false) {
  if (door)
    return FLOOR_CELLS.hazard;
  let h = Math.imul(x * 73856093 ^ y * 19349663, 2654435761);
  h ^= h >>> 15;
  const r = ((Math.imul(h, 2246822519) >>> 0) % 1000) / 1000;
  if (r < 0.46)
    return FLOOR_CELLS.plain;
  if (r < 0.58)
    return FLOOR_CELLS.grating;
  if (r < 0.66)
    return FLOOR_CELLS.hatch;
  if (r < 0.77)
    return FLOOR_CELLS.patched;
  if (r < 0.82)
    return FLOOR_CELLS.cracked;
  if (r < 0.92)
    return FLOOR_CELLS.conduit;
  return FLOOR_CELLS.lights;
}

export const FLOOR_VERTEX = floorRustShader.vertex;

export const FLOOR_FRAGMENT = floorRustShader.fragment;


/** Smooth random 0..1 that repeats seamlessly across `period` pixels in both X and Y. */
export function periodicField(rnd, baseCells, period = TILE_PIXELS) {
  const octaves = [0, 1, 2].map((o) => {
    const cells = baseCells * 2 ** o;
    return {
      cells,
      grid: Array.from({ length: cells * cells }, () => rnd()),
    };
  });
  return (x, y) => {
    let total = 0;
    let weight = 0;
    for (let o = 0; o < 3; o++) {
      const { cells, grid } = octaves[o];
      const gx = (x / period) * cells;
      const gy = (y / period) * cells;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = gx - x0;
      const fy = gy - y0;
      const sx = Utils.smoothstep(0, 1, fx);
      const sy = Utils.smoothstep(0, 1, fy);
      const at = (ix, iy) => grid[(((iy % cells) + cells) % cells) * cells + (((ix % cells) + cells) % cells)];
      const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
      const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
      const w = 1 / 2 ** o;
      total += (top * (1 - sy) + bottom * sy) * w;
      weight += w;
    }
    return total / weight;
  };
}

export function slimeAtlas() {
  const width = TILE_PIXELS;
  const height = TILE_PIXELS;
  const data = new Uint8Array(width * height * 4);
  const rnd = mulberry32(99173);
  const swirl = periodicField(rnd, 4, TILE_PIXELS);
  const fine = periodicField(rnd, 8, TILE_PIXELS);
  const micro = periodicField(rnd, 16, TILE_PIXELS);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const s = swirl(x, y) * 0.55 + fine(x, y) * 0.30 + micro(x, y) * 0.15;
      const r = Math.round(14 + s * 46);
      const g = Math.round(68 + s * 155);
      const b = Math.round(16 + s * 38);
      const o = (y * width + x) * 4;
      data[o] = Utils.clamp(r, 0, 255);
      data[o + 1] = Utils.clamp(g, 0, 255);
      data[o + 2] = Utils.clamp(b, 0, 255);
      data[o + 3] = 255;
    }
  return { name: 'slime', data, width, height, cell: TILE_PIXELS, frames: 1 };
}

export const SLIME_FRAGMENT = slimeShader.fragment;
export const ACID_MIST_FRAGMENT = acidMistShader.fragment;


/**
 * A 256x256 futuristic quantum teleporter machine atlas: brushed titanium octagonal housing,
 * corner status beacons, radial power bus conduits, segmented magnetic stator rings, and a
 * high-energy cyan-emerald quantum phase core.
 */
export function teleporterAtlas() {
  const width = TILE_PIXELS;
  const height = TILE_PIXELS;
  const data = new Uint8Array(width * height * 4);
  const rnd = mulberry32(44119);
  const grain = field(rnd, 6);
  const invScale = 64 / TILE_PIXELS;
  const cx = 31.5;
  const cy = 31.5;

  for (let py = 0; py < height; py++)
    for (let px = 0; px < width; px++) {
      const x = (px + 0.5) * invScale - 0.5;
      const y = (py + 0.5) * invScale - 0.5;
      const g = Utils.clamp(grain(x, y) + texelMicroGrain(px, py) * 0.08, 0, 1);
      const dx = x - cx;
      const dy = y - cy;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      const d = scratchPt.setScalar(dx, dy).getMagnitude();
      const oct = Math.max(ax, ay, (ax + ay) * 0.7071);
      const border = Math.min(x, y, 63 - x, 63 - y);

      // Brushed titanium deck chassis
      let r = Math.round(24 + g * 16);
      let gr = Math.round(32 + g * 20);
      let b = Math.round(46 + g * 24);

      if (border < 3) {
        const edge = border >= 0.75 && border < 1.75 ? 1.38 : 0.62;
        r = Math.round(r * edge);
        gr = Math.round(gr * edge);
        b = Math.round(b * edge);
      }

      // Octagonal structural seam and recessed bolt channel
      if (Math.abs(oct - 28.5) < 1.1) {
        r = 12;
        gr = 18;
        b = 28;
      }

      // Radial power bus conduits along cardinal and diagonal axes
      const cardinalBus = Math.min(ax, ay);
      const diagBus = Math.abs(ax - ay) * 0.7071;
      const busDist = Math.min(cardinalBus, diagBus);
      if (d >= 13.5 && d <= 28.5 && busDist < 2.2) {
        if (busDist < 0.95) {
          const glow = 1 - busDist / 0.95;
          r = Math.round(Utils.lerp(r, 52, glow));
          gr = Math.round(Utils.lerp(gr, 224, glow));
          b = Math.round(Utils.lerp(b, 250, glow));
        } else {
          r = 14;
          gr = 24;
          b = 38;
        }
      }

      // Corner status beacons on the outer housing
      const cornerDist = scratchPt.setScalar(ax - 23.5, ay - 23.5).getMagnitude();
      if (cornerDist < 3.2) {
        if (cornerDist < 1.9) {
          const hot = 1 - cornerDist / 1.9;
          r = Math.round(Utils.lerp(40, 150, hot));
          gr = Math.round(Utils.lerp(180, 252, hot));
          b = Math.round(Utils.lerp(210, 255, hot));
        } else {
          r = 12;
          gr = 20;
          b = 30;
        }
      }

      // Heavy magnetic containment collar with ribbed cooling vents
      if (d < 25.8 && d >= 20.2) {
        const angle = Math.atan2(dy, dx);
        const vent = Math.cos(angle * 16);
        const ringDist = Math.abs(d - 22.8);
        if (ringDist < 1.45 && vent > -0.25) {
          const hot = (1 - ringDist / 1.45) * (0.65 + 0.35 * Math.max(0, vent));
          r = Math.round(Utils.lerp(20, 78, hot));
          gr = Math.round(Utils.lerp(36, 238, hot));
          b = Math.round(Utils.lerp(54, 255, hot));
        } else {
          r = Math.round(16 + g * 10);
          gr = Math.round(24 + g * 12);
          b = Math.round(38 + g * 16);
        }
      } else if (d < 20.2) {
        // Cryo-blue quantum phase chamber basin
        r = Math.round(14 + g * 14);
        gr = Math.round(32 + g * 22);
        b = Math.round(52 + g * 28);

        // Precision concentric harmonic stabilizer rings
        const outerHarmonic = Math.abs(d - 16.2);
        const innerHarmonic = Math.abs(d - 11.2);
        const harmonicDist = Math.min(outerHarmonic, innerHarmonic);
        if (harmonicDist < 1.35) {
          const hot = 1 - harmonicDist / 1.35;
          r = Math.round(Utils.lerp(r, 64, hot));
          gr = Math.round(Utils.lerp(gr, 236, hot));
          b = Math.round(Utils.lerp(b, 248, hot));
        }

        // Inner waveguide crosshairs
        if (d >= 7.0 && d <= 16.5 && cardinalBus < 1.15) {
          const trace = 1 - cardinalBus / 1.15;
          r = Math.round(Utils.lerp(r, 82, trace * 0.85));
          gr = Math.round(Utils.lerp(gr, 246, trace));
          b = Math.round(Utils.lerp(b, 255, trace));
        }

        // Bright cyan-emerald-white quantum aperture core
        if (d < 8.2) {
          const core = Math.max(0, 1 - d / 8.2);
          const hotCore = core * core;
          r = Math.round(Utils.lerp(r, 185, hotCore));
          gr = Math.round(Utils.lerp(gr, 252, core));
          b = Math.round(Utils.lerp(b, 255, core));
        }
      }

      const o = (py * width + px) * 4;
      data[o] = Utils.clamp(r, 0, 255);
      data[o + 1] = Utils.clamp(gr, 0, 255);
      data[o + 2] = Utils.clamp(b, 0, 255);
      data[o + 3] = 255;
    }
  return { name: 'teleporter', data, width, height, cell: TILE_PIXELS, frames: 1 };
}

/**
 * Builds the 3D quad geometry for a futuristic quantum teleporter machine at `center` (`Vec3`: x, baseY, z)
 * with dimensions `size` (`Vec2`: tileSpan, ceilingHeight). Includes the base deck plate, stepped two-tier
 * bevelled emitter pedestal, four corner field-containment pylons with stabilizer fins, and an overhead
 * suspended ceiling quantum emitter assembly when `size.y > 0`.
 */
export function teleporterMachineQuads(center, size) {
  const cx = center.x;
  const baseY = center.y;
  const cz = center.z;
  const halfTile = size.x * 0.5;
  const ceilY = size.y;
  const quads = [];

  const pushBox = (hx, hz, y0, y1, sideUv, capUv, capAtTop = true) => {
    const x0 = cx - hx;
    const x1 = cx + hx;
    const z0 = cz - hz;
    const z1 = cz + hz;
    quads.push(
      { corners: [x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1], uv: sideUv },
      { corners: [x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0], uv: sideUv },
      { corners: [x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0], uv: sideUv },
      { corners: [x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1], uv: sideUv }
    );
    if (capAtTop)
      quads.push({ corners: [x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0], uv: capUv });
    else
      quads.push({ corners: [x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1], uv: capUv });
  };

  // 1. Base deck plate covering the tile floor
  const fx0 = cx - halfTile;
  const fx1 = cx + halfTile;
  const fz0 = cz - halfTile;
  const fz1 = cz + halfTile;
  quads.push({
    corners: [fx0, baseY, fz1, fx1, baseY, fz1, fx1, baseY, fz0, fx0, baseY, fz0],
    uv: [0, 0, 1, 1],
  });

  // 2. Two-tier stepped 3D quantum emitter pedestal on the floor
  const tier1Y = baseY + 2.2;
  const tier2Y = baseY + 3.6;
  pushBox(25.5, 25.5, baseY, tier1Y, [0.1, 0.44, 0.9, 0.56], [0.08, 0.08, 0.92, 0.92], true);
  pushBox(18.0, 18.0, tier1Y, tier2Y, [0.18, 0.46, 0.82, 0.54], [0.18, 0.18, 0.82, 0.82], true);

  // 3. Four corner quantum field-emitter pylons with glowing energy conduit strips
  const pylonTop = ceilY > 0 ? ceilY - 4.0 : baseY + 46.0;
  const pylonOffset = 24.5;
  const pylonHalf = 2.4;
  const pylonUv = [0.44, 0.08, 0.56, 0.92];
  const collarUv = [0.22, 0.46, 0.78, 0.54];
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (const [sx, sz] of corners) {
    const px = cx + sx * pylonOffset;
    const pz = cz + sz * pylonOffset;
    const px0 = px - pylonHalf;
    const px1 = px + pylonHalf;
    const pz0 = pz - pylonHalf;
    const pz1 = pz + pylonHalf;
    quads.push(
      { corners: [px0, tier1Y, pz1, px1, tier1Y, pz1, px1, pylonTop, pz1, px0, pylonTop, pz1], uv: pylonUv },
      { corners: [px1, tier1Y, pz0, px0, tier1Y, pz0, px0, pylonTop, pz0, px1, pylonTop, pz0], uv: pylonUv },
      { corners: [px0, tier1Y, pz0, px0, tier1Y, pz1, px0, pylonTop, pz1, px0, pylonTop, pz0], uv: pylonUv },
      { corners: [px1, tier1Y, pz1, px1, tier1Y, pz0, px1, pylonTop, pz0, px1, pylonTop, pz1], uv: pylonUv }
    );
    // Glowing capacitor coil collars along each pylon
    for (const ringY of [baseY + 16.0, baseY + 32.0, baseY + 46.0]) {
      if (ringY + 2.2 > pylonTop)
        continue;
      const rx0 = px - (pylonHalf + 1.1);
      const rx1 = px + (pylonHalf + 1.1);
      const rz0 = pz - (pylonHalf + 1.1);
      const rz1 = pz + (pylonHalf + 1.1);
      const ry0 = ringY;
      const ry1 = ringY + 2.2;
      quads.push(
        { corners: [rx0, ry0, rz1, rx1, ry0, rz1, rx1, ry1, rz1, rx0, ry1, rz1], uv: collarUv },
        { corners: [rx1, ry0, rz0, rx0, ry0, rz0, rx0, ry1, rz0, rx1, ry1, rz0], uv: collarUv },
        { corners: [rx0, ry0, rz0, rx0, ry0, rz1, rx0, ry1, rz1, rx0, ry1, rz0], uv: collarUv },
        { corners: [rx1, ry0, rz1, rx1, ry0, rz0, rx1, ry1, rz0, rx1, ry1, rz1], uv: collarUv },
        { corners: [rx0, ry1, rz1, rx1, ry1, rz1, rx1, ry1, rz0, rx0, ry1, rz0], uv: collarUv },
        { corners: [rx0, ry0, rz0, rx1, ry0, rz0, rx1, ry0, rz1, rx0, ry0, rz1], uv: collarUv }
      );
    }
  }

  // 4. Overhead ceiling quantum emitter hood and focusing ring
  if (ceilY > 0) {
    const hoodMid = ceilY - 2.6;
    const hoodLow = ceilY - 4.4;
    pushBox(25.5, 25.5, hoodMid, ceilY, [0.1, 0.44, 0.9, 0.56], [0.08, 0.08, 0.92, 0.92], false);
    pushBox(18.0, 18.0, hoodLow, hoodMid, [0.18, 0.46, 0.82, 0.54], [0.18, 0.18, 0.82, 0.82], false);
  }

  return quads;
}

/**
 * Converts `teleporterMachineQuads(center, size)` into a triangle-list mesh `{ vertices, uvs }`
 * with `Float32Array` buffers suitable for RoostR `CustomMesh` and BlendR catalog import.
 */
export function teleporterMachineMesh(center = new Vec3(0, 0, 0), size = new Vec2(64, 62.8)) {
  const quads = teleporterMachineQuads(center, size);
  const vertices = new Float32Array(quads.length * 18);
  const uvs = new Float32Array(quads.length * 12);
  let vOut = 0;
  let uOut = 0;
  for (const { corners, uv } of quads) {
    const [u0, v0, u1, v1] = uv;
    const cornerUvs = [
      u0, v0,
      u1, v0,
      u1, v1,
      u0, v1,
    ];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      vertices[vOut++] = corners[k * 3];
      vertices[vOut++] = corners[k * 3 + 1];
      vertices[vOut++] = corners[k * 3 + 2];
      uvs[uOut++] = cornerUvs[k * 2];
      uvs[uOut++] = cornerUvs[k * 2 + 1];
    }
  }
  return { vertices, uvs };
}

export const TELEPORTER_FRAGMENT = teleporterShader.fragment;


export const CRATE_CELL = TILE_PIXELS;
export const CRATE_FRAMES = 4;
const CRATE_CELLS = {
  side: 0,
  top: 1,
  frame: 2,
  trim: 3,
};

function crateCellUv(cell = 0, v0 = 0, v1 = 1) {
  const inset = 0.25 / (CRATE_CELL * CRATE_FRAMES);
  return [cell / CRATE_FRAMES + inset, v0, (cell + 1) / CRATE_FRAMES - inset, v1];
}

function drawCrateSideCell(t, rnd) {
  const S = 64;
  plate(t, 0, 0, S, S, rnd, mix(METAL, [24, 34, 52], 0.28));

  // Outer structural seam and bevel
  for (let i = 0; i < S; i++) {
    t.set(i, 0, LIGHT, 0.45);
    t.set(i, S - 1, SHADOW, 0.9);
    t.set(0, i, LIGHT, 0.35);
    t.set(S - 1, i, SHADOW, 0.9);
  }

  // Top and bottom industrial amber/black diagonal hazard stripes
  for (const [y0, y1] of [[3, 8], [55, 60]])
    for (let y = y0; y <= y1; y++)
      for (let x = 5; x < S - 5; x++) {
        if (y === y0 || y === y1) {
          t.set(x, y, SHADOW, 0.88);
          continue;
        }
        const stripe = ((x + y) & 4) === 0;
        t.set(x, y, stripe ? mix(HAZARD, [255, 208, 72], 0.35) : [18, 22, 30], 0.92);
      }

  // Recessed armored cargo bay with diagonal X-bracing ribs
  t.rect(7, 10, S - 14, S - 20, mix(SHADOW, METAL, 0.28), 0.72);
  const s = t.scale;
  for (let py = 11 * s; py < (S - 11) * s; py++)
    for (let px = 8 * s; px < (S - 8) * s; px++) {
      const x = (px + 0.5) / s - 0.5;
      const y = (py + 0.5) / s - 0.5;
      const d1 = Math.abs((x - 8) - (y - 11) * ((S - 16) / (S - 22)));
      const d2 = Math.abs((S - 9 - x) - (y - 11) * ((S - 16) / (S - 22)));
      const dMin = Math.min(d1, d2);
      if (dMin < 2.2)
        t.setRaw(px, py, dMin < 1.1 ? mix(METAL, LIGHT, 0.38) : SHADOW, 0.85);
    }

  // Central futuristic UAC digital manifest & cryo-containment status console
  t.rect(13, 25, S - 26, 14, [12, 18, 28], 0.95);
  for (let x = 13; x < S - 13; x++) {
    t.set(x, 25, SHADOW);
    t.set(x, 38, LIGHT, 0.45);
  }
  // Glowing cyan telemetry waveform & power bars inside display
  for (let x = 16; x < S - 22; x++) {
    const bar = (x - 16) % 5 < 3;
    if (bar) {
      t.rect(x, 28, 1, 8, [56, 232, 252], 0.92);
      t.set(x, 27, [160, 248, 255], 0.65);
    }
  }
  // Amber containment lock indicator beacon on right of console
  t.rect(S - 20, 28, 4, 8, [252, 184, 52], 0.95);

  for (const [rx, ry] of [[4, 11], [S - 6, 11], [4, 50], [S - 6, 50], [10, 13], [S - 12, 13], [10, 48], [S - 12, 48]])
    rivet(t, rx, ry);
}

function drawCrateTopCell(t, rnd) {
  const S = 64;
  plate(t, 0, 0, S, S, rnd, mix(METAL, [28, 38, 56], 0.22));
  const cx = 31.5;
  const cy = 31.5;

  // Recessed octagonal lid perimeter groove and anti-skid diamond tread
  for (let y = 5; y < S - 5; y++)
    for (let x = 5; x < S - 5; x++) {
      const border = x === 5 || x === S - 6 || y === 5 || y === S - 6;
      if (border) {
        t.set(x, y, SHADOW, 0.85);
        continue;
      }
      const tread = ((x + y) & 3) === 0 && ((x - y) & 3) === 0;
      if (tread)
        t.set(x, y, LIGHT, 0.26);
    }

  // Central octagonal UAC containment seal & glowing cyan harmonic ring
  const s = t.scale;
  for (let py = 16 * s; py < (S - 16) * s; py++)
    for (let px = 16 * s; px < (S - 16) * s; px++) {
      const x = (px + 0.5) / s - 0.5;
      const y = (py + 0.5) / s - 0.5;
      const dx = x - cx;
      const dy = y - cy;
      const d = scratchPt.setScalar(dx, dy).getMagnitude();
      if (d < 13.5 && d >= 11.2)
        t.setRaw(px, py, SHADOW, 0.9);
      else if (d < 11.2 && d >= 9.0)
        t.setRaw(px, py, [56, 232, 252], 0.88);
      else if (d < 9.0) {
        const cross = Math.min(Math.abs(dx), Math.abs(dy)) < 1.3;
        t.setRaw(px, py, cross ? [142, 248, 255] : [18, 28, 42], 0.92);
      }
    }

  rivets(t, 2);
}

function drawCrateFrameCell(t, rnd) {
  const S = 64;
  plate(t, 0, 0, S, S, rnd, mix(SHADOW, METAL, 0.35));

  // Heavy vertical shock-absorber bumper ribs & recessed grav-lifter slots
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const edge = x < 3 || x >= S - 3 || y < 2 || y >= S - 2;
      const rib = y % 8 === 0 || y % 8 === 1;
      const slot = y >= 48 && y <= 58 && ((x >= 10 && x <= 24) || (x >= 39 && x <= 53));
      if (slot)
        t.set(x, y, [10, 14, 22], 0.95);
      else if (edge)
        t.set(x, y, SHADOW, 0.85);
      else if (rib)
        t.set(x, y, y % 8 === 0 ? SHADOW : LIGHT, 0.48);
    }

  for (const ry of [6, 20, 34, 46]) {
    rivet(t, 5, ry);
    rivet(t, S - 7, ry);
  }
}

function drawCrateTrimCell(t, rnd) {
  const S = 64;
  plate(t, 0, 0, S, S, rnd, mix(METAL, LIGHT, 0.18));

  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const centerDist = Math.abs(x - 31.5);
      const bus = centerDist < 3.2;
      const latch = (y % 16 >= 5 && y % 16 <= 10) && centerDist >= 5 && centerDist <= 14;
      if (bus) {
        const glow = 1 - centerDist / 3.2;
        t.set(x, y, mix([28, 120, 156], [96, 246, 255], glow), 0.92);
      } else if (latch)
        t.set(x, y, SHADOW, 0.78);
    }
}

const CRATE_DRAW = [drawCrateSideCell, drawCrateTopCell, drawCrateFrameCell, drawCrateTrimCell];

/**
 * Returns the 1024x256 power-of-two RGBA pixel-art atlas for the 3D UAC futuristic cover crate (`o` / `PILLAR`).
 */
export function crateAtlas() {
  const width = CRATE_CELL * CRATE_FRAMES;
  const height = CRATE_CELL;
  const data = new Uint8Array(width * height * 4);
  CRATE_DRAW.forEach((draw, cell) => {
    const tile = new Tile(CRATE_CELL, CRATE_CELL, CRATE_CELL / 64);
    draw(tile, mulberry32(51000 + cell * 8831));
    for (let y = 0; y < height; y++)
      for (let x = 0; x < CRATE_CELL; x++) {
        const i = (y * CRATE_CELL + x) * 3;
        const o = (y * width + cell * CRATE_CELL + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name: 'crate', data, width, height, cell: CRATE_CELL, frames: CRATE_FRAMES };
}

/**
 * Builds the 3D quad geometry for a futuristic UAC armored cover crate at `center` (`Vec3`: x, baseY, z)
 * with dimensions `size` (`Vec2`: tileSpan, crateHeight). Fits the 64x26x64 waist-high cover footprint
 * with a grav-skid base plinth, recessed diagonal-braced cargo core, 4 heavy corner bumper pillars,
 * 4 side clamping bulkheads with cyan telemetry consoles, beveled armored lid, transverse locking straps,
 * and corner tie-down lugs.
 */
export function crateQuads(center = new Vec3(0, 0, 0), size = new Vec2(64, 26)) {
  const cx = center.x;
  const baseY = center.y;
  const cz = center.z;
  const scaleXZ = size.x / 64;
  const scaleY = size.y / 26;
  const quads = [];

  const uvSide = crateCellUv(CRATE_CELLS.side);
  const uvTop = crateCellUv(CRATE_CELLS.top);
  const uvFrame = crateCellUv(CRATE_CELLS.frame);
  const uvTrim = crateCellUv(CRATE_CELLS.trim);

  const pushBoxAt = (ox, oz, hx, hz, y0, y1, sideUv, capUv, includeBottom = false) => {
    const x0 = cx + (ox - hx) * scaleXZ;
    const x1 = cx + (ox + hx) * scaleXZ;
    const z0 = cz + (oz - hz) * scaleXZ;
    const z1 = cz + (oz + hz) * scaleXZ;
    const by0 = baseY + y0 * scaleY;
    const by1 = baseY + y1 * scaleY;
    quads.push(
      { corners: [x0, by0, z1, x1, by0, z1, x1, by1, z1, x0, by1, z1], uv: sideUv },
      { corners: [x1, by0, z0, x0, by0, z0, x0, by1, z0, x1, by1, z0], uv: sideUv },
      { corners: [x0, by0, z0, x0, by0, z1, x0, by1, z1, x0, by1, z0], uv: sideUv },
      { corners: [x1, by0, z1, x1, by0, z0, x1, by1, z0, x1, by1, z1], uv: sideUv },
      { corners: [x0, by1, z1, x1, by1, z1, x1, by1, z0, x0, by1, z0], uv: capUv }
    );
    if (includeBottom)
      quads.push({ corners: [x0, by0, z0, x1, by0, z0, x1, by0, z1, x0, by0, z1], uv: capUv });
  };

  // 1. Heavy grav-skid base pallet plinth (y = 0 .. 3.4)
  pushBoxAt(0, 0, 31.2, 31.2, 0.0, 3.4, uvFrame, uvFrame, true);

  // 2. Main armored octagonal/recessed cargo container core (y = 3.5 .. 22.8)
  pushBoxAt(0, 0, 29.6, 29.6, 3.5, 22.8, uvSide, uvTop, false);

  // 3. Four reinforced vertical corner bumper pillars (y = 0.1 .. 25.3, outer faces at ±31.9)
  const cornerCenters = [
    [-26.8, -26.8],
    [26.8, -26.8],
    [26.8, 26.8],
    [-26.8, 26.8],
  ];
  for (const [ox, oz] of cornerCenters) {
    pushBoxAt(ox, oz, 5.1, 5.1, 0.1, 25.3, uvFrame, uvFrame, false);
    // 4. Corner tie-down / stacking lugs atop each corner pillar (y = 25.35 .. 26.0)
    pushBoxAt(ox, oz, 3.6, 3.6, 25.35, 26.0, uvTrim, uvTrim, false);
  }

  // 5. Four recessed side armor bulkheads & telemetry consoles (outer faces at ±31.85)
  pushBoxAt(0, 30.8, 19.2, 1.05, 4.2, 22.1, uvSide, uvTrim, false);
  pushBoxAt(0, -30.8, 19.2, 1.05, 4.2, 22.1, uvSide, uvTrim, false);
  pushBoxAt(30.8, 0, 1.05, 19.2, 4.2, 22.1, uvSide, uvTrim, false);
  pushBoxAt(-30.8, 0, 1.05, 19.2, 4.2, 22.1, uvSide, uvTrim, false);

  // 6. Beveled upper containment lid (y = 22.85 .. 24.85)
  pushBoxAt(0, 0, 28.4, 28.4, 22.85, 24.85, uvFrame, uvTop, false);

  // 7. Two transverse hydraulic locking clamp bars across the lid (y = 24.9 .. 26.0)
  pushBoxAt(-12.5, 0, 2.8, 29.2, 24.9, 26.0, uvTrim, uvTrim, false);
  pushBoxAt(12.5, 0, 2.8, 29.2, 24.9, 26.0, uvTrim, uvTrim, false);

  // 8. Central UAC octagonal containment seal cap (y = 24.9 .. 25.85)
  pushBoxAt(0, 0, 6.2, 6.2, 24.9, 25.85, uvTrim, uvTop, false);

  return quads;
}

/**
 * Converts `crateQuads(center, size)` into a triangle-list mesh `{ vertices, uvs }`
 * with `Float32Array` buffers suitable for RoostR `CustomMesh` and BlendR catalog import.
 */
export function crateMesh(center = new Vec3(0, 0, 0), size = new Vec2(64, 26)) {
  const quads = crateQuads(center, size);
  const vertices = new Float32Array(quads.length * 18);
  const uvs = new Float32Array(quads.length * 12);
  let vOut = 0;
  let uOut = 0;
  for (const { corners, uv } of quads) {
    const [u0, v0, u1, v1] = uv;
    const cornerUvs = [
      u0, v0,
      u1, v0,
      u1, v1,
      u0, v1,
    ];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      vertices[vOut++] = corners[k * 3];
      vertices[vOut++] = corners[k * 3 + 1];
      vertices[vOut++] = corners[k * 3 + 2];
      uvs[uOut++] = cornerUvs[k * 2];
      uvs[uOut++] = cornerUvs[k * 2 + 1];
    }
  }
  return { vertices, uvs };
}

export const CRATE_FRAGMENT = SOLID_TEXTURED_FRAGMENT;

// ---- Martian surface dirt & boulders (E1M5 Red Planet) -------------------------------------------------------------

const MARS_DIRT_BASE = [126, 52, 24];
const MARS_DIRT_LIGHT = [178, 86, 38];
const MARS_DIRT_OCHRE = [204, 108, 48];
const MARS_DIRT_SHADOW = [54, 20, 10];
const MARS_BASALT = [42, 26, 22];


function periodicDirtGrain(x, y) {
  const ix = ((x % TILE_PIXELS) + TILE_PIXELS) % TILE_PIXELS;
  const iy = ((y % TILE_PIXELS) + TILE_PIXELS) % TILE_PIXELS;
  let h = Math.imul(ix * 374761393 ^ iy * 668265263, 1274126177);
  h ^= h >>> 13;
  return (((Math.imul(h, 1911520717) >>> 0) % 1000) / 1000) - 0.5;
}

function dirtEdgeMask(x, y, margin = 4) {
  const S = TILE_PIXELS / 64;
  const mx = Math.min(x, TILE_PIXELS - 1 - x);
  const my = Math.min(y, TILE_PIXELS - 1 - y);
  return Utils.smoothstep(0, margin * S, mx) * Utils.smoothstep(0, margin * S, my);
}

function wrapDirtCoord(v) {
  return ((Math.round(v) % TILE_PIXELS) + TILE_PIXELS) % TILE_PIXELS;
}

function createSharedDirtTile() {
  const S = TILE_PIXELS / 64;
  const baseRnd = mulberry32(41000);
  const warpX = periodicField(baseRnd, 3, TILE_PIXELS);
  const warpY = periodicField(baseRnd, 3, TILE_PIXELS);
  const coarse = periodicField(baseRnd, 3, TILE_PIXELS);
  const medium = periodicField(baseRnd, 6, TILE_PIXELS);
  const fine = periodicField(baseRnd, 12, TILE_PIXELS);
  const micro = periodicField(baseRnd, 24, TILE_PIXELS);
  const tile = new Tile();

  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      // Domain-warped periodic coordinates so the base regolith has organic patches with zero linear stripes
      const wx = x + (warpX(x, y) - 0.5) * 20 * S;
      const wy = y + (warpY(x, y) - 0.5) * 20 * S;
      const c = coarse(wx, wy);
      const m = medium(wx + 11 * S, wy + 7 * S);
      const f = fine(x, y) * 0.72 + micro(x, y) * 0.28;
      const ridge = 1 - Math.abs((coarse(wx + 23 * S, wy + 37 * S) - 0.5) * 2);
      const shade = c * 0.45 + m * 0.35 + f * 0.2;
      let col = mix(MARS_DIRT_SHADOW, MARS_DIRT_BASE, Utils.clamp(shade * 1.15, 0, 1));
      col = mix(col, MARS_DIRT_LIGHT, ridge * 0.4 + (f - 0.5) * 0.24);
      if (shade > 0.64 && ridge > 0.56)
        col = mix(col, MARS_DIRT_OCHRE, (shade - 0.64) * 1.55);
      const grain = periodicDirtGrain(x, y) * 12;
      tile.set(x, y, [col[0] + grain, col[1] + grain * 0.7, col[2] + grain * 0.45]);
    }

  // Fine modulo-wrapped regolith gravel & grit across the 256x256 tile (polygonal falloff, no large ringed ovals)
  for (let k = 0; k < 34; k++) {
    const px = baseRnd() * TILE_PIXELS;
    const py = baseRnd() * TILE_PIXELS;
    const rx = 1.3 + baseRnd() * 2.2;
    const ry = 1.1 + baseRnd() * 1.8;
    const p1 = baseRnd() * Trigo.twopi;
    const p2 = baseRnd() * Trigo.twopi;
    const basalt = baseRnd() < 0.45;
    const rockCol = basalt ? mix(MARS_BASALT, MARS_DIRT_SHADOW, 0.3) : mix(MARS_DIRT_BASE, MARS_DIRT_LIGHT, 0.5);
    const rCeil = Math.ceil(Math.max(rx, ry) * 1.35) + 1;
    for (let dy = -rCeil; dy <= rCeil; dy++)
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        const ang = Math.atan2(dy, dx);
        const facet = 1 + 0.24 * Math.cos(ang * 3 + p1) + 0.14 * Math.sin(ang * 5 + p2);
        const d = scratchPt.setScalar(dx / rx, dy / ry).getMagnitude() / facet;
        if (d >= 1.0)
          continue;
        const wx = wrapDirtCoord(px + dx);
        const wy = wrapDirtCoord(py + dy);
        const falloff = (1 - d) * (1 - d);
        const dirLit = Utils.clamp((-dx / rx - dy / ry) * 0.3, -0.32, 0.35);
        const c = dirLit >= 0 ? mix(rockCol, MARS_DIRT_OCHRE, dirLit) : mix(rockCol, MARS_DIRT_SHADOW, -dirLit);
        tile.set(wx, wy, c, 0.46 * falloff);
      }
  }

  return tile;
}

let sharedDirtTile = null;

function drawMarsRegolithBase(t) {
  sharedDirtTile ??= createSharedDirtTile();
  t.pixels.set(sharedDirtTile.pixels);
}

function scatterMarsPebbles(t, rnd, count, maxRadius = 3.0) {
  const S = TILE_PIXELS / 64;
  for (let k = 0; k < count * 2; k++) {
    const px = 6 * S + rnd() * (TILE_PIXELS - 12 * S);
    const py = 6 * S + rnd() * (TILE_PIXELS - 12 * S);
    const rx = 1.4 + rnd() * (maxRadius * 1.1);
    const ry = 1.1 + rnd() * (maxRadius * 0.88);
    const p1 = rnd() * Trigo.twopi;
    const p2 = rnd() * Trigo.twopi;
    const basalt = rnd() < 0.45;
    const rockCol = basalt ? mix(MARS_BASALT, MARS_DIRT_SHADOW, 0.3) : mix(MARS_DIRT_BASE, MARS_DIRT_LIGHT, 0.5);
    const rCeil = Math.ceil(Math.max(rx, ry) * 1.35) + 1;
    for (let dy = -rCeil; dy <= rCeil; dy++)
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        const x = Math.round(px + dx);
        const y = Math.round(py + dy);
        const mask = dirtEdgeMask(x, y, 5);
        if (mask <= 0.01)
          continue;
        const ang = Math.atan2(dy, dx);
        const facet = 1 + 0.25 * Math.cos(ang * 3 + p1) + 0.15 * Math.sin(ang * 5 + p2);
        const d = scratchPt.setScalar(dx / rx, dy / ry).getMagnitude() / facet;
        if (d >= 1.0)
          continue;
        const falloff = (1 - d) * (1 - d);
        const dirLit = Utils.clamp((-dx / rx - dy / ry) * 0.32, -0.35, 0.38);
        const c = dirLit >= 0 ? mix(rockCol, MARS_DIRT_OCHRE, dirLit) : mix(rockCol, MARS_DIRT_SHADOW, -dirLit);
        t.set(x, y, c, 0.5 * falloff * mask);
      }
  }
}

function drawMarsPlain(t, rnd) {
  drawMarsRegolithBase(t);
  const drift = periodicField(rnd, 3, TILE_PIXELS);
  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      const mask = dirtEdgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const d = drift(x, y);
      if (d > 0.56)
        t.set(x, y, MARS_DIRT_LIGHT, (d - 0.56) * 0.95 * mask);
      else if (d < 0.42)
        t.set(x, y, MARS_DIRT_SHADOW, (0.42 - d) * 0.75 * mask);
    }
  scatterMarsPebbles(t, rnd, 10, 2.2);
}

function drawMarsDunes(t, rnd) {
  const S = TILE_PIXELS / 64;
  drawMarsRegolithBase(t);
  const warpX = periodicField(rnd, 3, TILE_PIXELS);
  const warpY = periodicField(rnd, 3, TILE_PIXELS);
  const crest = periodicField(rnd, 4, TILE_PIXELS);
  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      const mask = dirtEdgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const wx = x + (warpX(x, y) - 0.5) * 22 * S;
      const wy = y + (warpY(x, y) - 0.5) * 22 * S;
      const ridge = 1 - Math.abs((crest(wx, wy) - 0.5) * 2);
      if (ridge > 0.62)
        t.set(x, y, MARS_DIRT_OCHRE, (ridge - 0.62) * 1.45 * mask);
      else if (ridge < 0.36)
        t.set(x, y, MARS_DIRT_SHADOW, (0.36 - ridge) * 1.25 * mask);
    }
  scatterMarsPebbles(t, rnd, 9, 1.9);
}

function drawMarsCrater(t, rnd) {
  const S = TILE_PIXELS / 64;
  drawMarsRegolithBase(t);
  const cx = (31.5 + (rnd() - 0.5) * 8) * S;
  const cy = (31.5 + (rnd() - 0.5) * 8) * S;
  const rOuter = 19 * S;
  const rimWidth = 5.5 * S;
  const wobble = periodicField(rnd, 4, TILE_PIXELS);
  const fineWobble = periodicField(rnd, 9, TILE_PIXELS);
  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      const mask = dirtEdgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const dx = x - cx;
      const dy = y - cy;
      const rawR = scratchPt.setScalar(dx, dy).getMagnitude();
      const d = rawR + (wobble(x, y) - 0.5) * 7.5 * S + (fineWobble(x, y) - 0.5) * 2.8 * S;
      if (d >= rOuter)
        continue;
      const dir = (dx + dy) / (rawR + 4 * S);
      const rInner = rOuter - rimWidth;
      if (d >= rInner) {
        const rimProfile = Math.sin(((d - rInner) / rimWidth) * Trigo.pi);
        const rimCol = mix(MARS_DIRT_SHADOW, MARS_DIRT_OCHRE, Utils.clamp(0.5 - dir * 0.45, 0, 1));
        t.set(x, y, rimCol, rimProfile * 0.42 * mask);
      } else {
        const depth = Utils.smoothstep(rInner, 0, d);
        const bowlCol = mix(MARS_DIRT_SHADOW, MARS_DIRT_LIGHT, Utils.clamp(0.32 + dir * 0.28, 0, 0.72));
        t.set(x, y, bowlCol, depth * 0.52 * mask);
      }
    }
  scatterMarsPebbles(t, rnd, 12, 2.5);
}

function drawMarsBasaltPatch(t, rnd) {
  const S = TILE_PIXELS / 64;
  drawMarsRegolithBase(t);
  const patch = periodicField(rnd, 3, TILE_PIXELS);
  const detail = periodicField(rnd, 8, TILE_PIXELS);
  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      const mask = dirtEdgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const m = patch(x, y) * 0.75 + detail(x, y) * 0.25;
      if (m > 0.52) {
        const edge = Math.min(1, (m - 0.52) * 4.8) * mask;
        const strata = detail(x + 13 * S, y + 7 * S) > 0.55 ? MARS_DIRT_SHADOW : MARS_BASALT;
        t.set(x, y, mix(MARS_DIRT_BASE, strata, 0.75), edge * 0.86);
      }
    }
  scatterMarsPebbles(t, rnd, 16, 3.0);
}

function drawMarsCrackedClay(t, rnd) {
  const S = TILE_PIXELS / 64;
  drawMarsRegolithBase(t);
  const basin = periodicField(rnd, 3, TILE_PIXELS);
  const bend = periodicField(rnd, 3, TILE_PIXELS);
  const microBend = periodicField(rnd, 9, TILE_PIXELS);
  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      const mask = dirtEdgeMask(x, y, 5);
      if (mask > 0.01 && basin(x, y) > 0.48)
        t.set(x, y, mix(MARS_DIRT_BASE, MARS_DIRT_OCHRE, 0.38), (basin(x, y) - 0.48) * 1.1 * mask);
    }
  for (let c = 0; c < 4; c++) {
    const xBase = (12 + rnd() * 40) * S;
    const y0 = Math.round((7 + rnd() * 5) * S);
    const y1 = Math.round((57 - rnd() * 5) * S);
    const span = Math.max(1, y1 - y0);
    const seedX = rnd() * TILE_PIXELS;
    for (let y = y0; y < y1; y++) {
      const progress = (y - y0) / span;
      const taper = Math.sin(progress * Trigo.pi);
      const offset = (bend(seedX, y) - 0.5) * 14 * S + (microBend(seedX + 29, y) - 0.5) * 3.2 * S;
      const cx = Utils.clamp(xBase + offset, 7 * S, TILE_PIXELS - 8 * S);
      const xInt = Math.round(cx);
      const mask = dirtEdgeMask(xInt, y, 5) * taper;
      if (mask <= 0.02)
        continue;
      t.set(xInt, y, MARS_DIRT_SHADOW, 0.76 * mask);
      t.set(xInt - 1, y, MARS_DIRT_SHADOW, 0.45 * mask);
      t.set(xInt + 1, y, MARS_DIRT_OCHRE, 0.32 * mask);
      t.set(xInt + 2, y, MARS_DIRT_OCHRE, 0.16 * mask);
    }
  }
  scatterMarsPebbles(t, rnd, 11, 2.3);
}

function drawMarsRuts(t, rnd) {
  const S = TILE_PIXELS / 64;
  drawMarsRegolithBase(t);
  const bendField = periodicField(rnd, 3, TILE_PIXELS);
  for (const y0 of [20 * S, 44 * S])
    for (let x = 5 * S; x < TILE_PIXELS - 5 * S; x++) {
      const mask = dirtEdgeMask(x, y0, 5);
      const bend = Math.round((bendField(x, y0) - 0.5) * 10 * S);
      const yc = Utils.clamp(y0 + bend, 7 * S, TILE_PIXELS - 8 * S);
      for (let dy = -2 * S; dy <= 2 * S; dy++) {
        const u = dy / S;
        if (u < -1.2)
          t.set(x, yc + dy, MARS_DIRT_OCHRE, 0.42 * mask);
        else if (u < 0.4)
          t.set(x, yc + dy, MARS_DIRT_SHADOW, (u < -0.3 ? 0.68 : 0.82) * mask);
        else if (u < 1.3)
          t.set(x, yc + dy, MARS_DIRT_BASE, 0.52 * mask);
        else
          t.set(x, yc + dy, MARS_DIRT_OCHRE, 0.38 * mask);
      }
    }
  scatterMarsPebbles(t, rnd, 14, 2.5);
}

function drawMarsThreshold(t, rnd) {
  drawMarsRegolithBase(t);
  const scree = periodicField(rnd, 4, TILE_PIXELS);
  for (let y = 0; y < TILE_PIXELS; y++)
    for (let x = 0; x < TILE_PIXELS; x++) {
      const mask = dirtEdgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const s = scree(x, y);
      if (s > 0.58)
        t.set(x, y, MARS_DIRT_OCHRE, (s - 0.58) * 1.15 * mask);
      else if (s < 0.38)
        t.set(x, y, MARS_BASALT, (0.38 - s) * 1.25 * mask);
    }
  scatterMarsPebbles(t, rnd, 20, 3.4);
}

function drawMarsFissure(t, rnd) {
  const S = TILE_PIXELS / 64;
  drawMarsRegolithBase(t);
  const sway = periodicField(rnd, 3, TILE_PIXELS);
  const jag = periodicField(rnd, 8, TILE_PIXELS);
  const yBase = (24 + rnd() * 16) * S;
  const x0 = 6 * S;
  const x1 = TILE_PIXELS - 6 * S;
  const span = x1 - x0;
  for (let x = x0; x < x1; x++) {
    const progress = (x - x0) / span;
    const taper = Math.sin(progress * Trigo.pi);
    const cy = Utils.clamp(
      yBase + (sway(x, 31 * S) - 0.5) * 16 * S + (jag(x, 47 * S) - 0.5) * 4 * S,
      10 * S,
      TILE_PIXELS - 10 * S
    );
    const yInt = Math.round(cy);
    const mask = dirtEdgeMask(x, yInt, 5) * taper;
    const halfSpan = Math.ceil(1.6 * S);
    for (let dy = -halfSpan; dy <= halfSpan; dy++) {
      const ad = Math.abs(yInt + dy - cy) / S;
      if (ad < 0.5)
        t.set(x, yInt + dy, [255, 142, 42], (1 - ad / 0.5) * 0.78 * mask);
      else if (ad < 1.25)
        t.set(x, yInt + dy, [220, 88, 24], (1 - (ad - 0.5) / 0.75) * 0.54 * mask);
      else if (ad < 1.85)
        t.set(x, yInt + dy, MARS_DIRT_SHADOW, (1 - (ad - 1.25) / 0.6) * 0.62 * mask);
    }
  }
  scatterMarsPebbles(t, rnd, 12, 2.4);
}

const MARS_DIRT_DRAW = [
  drawMarsPlain,
  drawMarsDunes,
  drawMarsCrater,
  drawMarsBasaltPatch,
  drawMarsCrackedClay,
  drawMarsRuts,
  drawMarsThreshold,
  drawMarsFissure,
];

/**
 * 8-cell 2048x256 procedural Martian surface dirt atlas for outdoor planet tiles (`planet: 'mars'`).
 * Replaces steel deck plates with wind-rippled iron-oxide regolith, sand dunes, basalt scree, craters, and parched cracks.
 */
export function marsDirtAtlas() {
  const width = TILE_PIXELS * FLOOR_CELL_COUNT;
  const height = TILE_PIXELS;
  const data = new Uint8Array(width * height * 4);
  MARS_DIRT_DRAW.forEach((draw, cell) => {
    const tile = new Tile();
    draw(tile, mulberry32(41000 + cell * 88793));
    for (let y = 0; y < height; y++)
      for (let x = 0; x < TILE_PIXELS; x++) {
        const i = (y * TILE_PIXELS + x) * 3;
        const o = (y * width + cell * TILE_PIXELS + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name: 'marsDirt', data, width, height, cell: TILE_PIXELS, frames: FLOOR_CELL_COUNT };
}

export const MARS_DIRT_FRAGMENT = marsDirtShader.fragment;

const MARS_BOULDER_CELLS = {
  crag: 0,
  strata: 1,
  scoured: 2,
  cap: 3,
};
export const MARS_BOULDER_CELL_COUNT = 4;

const BOULDER_ABYSS = [14, 6, 4];
const BOULDER_HIGHLIGHT = [228, 134, 64];

function drawBoulderCell(t, rnd, variant) {
  const S = TILE_PIXELS;
  const Scale = S / 64;
  const warpX = periodicField(rnd, 3, S);
  const warpY = periodicField(rnd, 3, S);
  const coarse = periodicField(rnd, 3, S);
  const medium = periodicField(rnd, 6, S);
  const fine = periodicField(rnd, 12, S);
  const micro = periodicField(rnd, 24, S);
  // Subtle directional brightness per cell so 3D boulder faces have natural volume while matching the floor palette
  const shadeScale = variant === MARS_BOULDER_CELLS.crag
    ? 1.06
    : variant === MARS_BOULDER_CELLS.strata
      ? 0.96
      : variant === MARS_BOULDER_CELLS.scoured
        ? 0.84
        : 1.10;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const wx = x + (warpX(x, y) - 0.5) * 20 * Scale;
      const wy = y + (warpY(x, y) - 0.5) * 20 * Scale;
      const c = coarse(wx, wy);
      const m = medium(wx + 11 * Scale, wy + 7 * Scale);
      const f = fine(x, y) * 0.72 + micro(x, y) * 0.28;
      const ridge = 1 - Math.abs((coarse(wx + 23 * Scale, wy + 37 * Scale) - 0.5) * 2);
      const shade = c * 0.45 + m * 0.35 + f * 0.2;
      let col = mix(MARS_DIRT_SHADOW, MARS_DIRT_BASE, Utils.clamp(shade * 1.15, 0, 1));
      col = mix(col, MARS_DIRT_LIGHT, ridge * 0.4 + (f - 0.5) * 0.24);
      if (shade > 0.64 && ridge > 0.56)
        col = mix(col, MARS_DIRT_OCHRE, (shade - 0.64) * 1.55);

      const grain = periodicDirtGrain(x, y) * 12;
      t.set(x, y, [
        (col[0] + grain) * shadeScale,
        (col[1] + grain * 0.7) * shadeScale,
        (col[2] + grain * 0.45) * shadeScale,
      ]);
    }
  scatterMarsPebbles(t, rnd, 16, 2.5);
  // Ensure full dynamic range for boulder crevices and sunlit lips
  t.set(16 * Scale, 16 * Scale, BOULDER_ABYSS, 0.9);
  t.set(17 * Scale, 16 * Scale, BOULDER_HIGHLIGHT, 0.9);
}

export const MARS_ROCK_FRAGMENT = MARS_DIRT_FRAGMENT;

/**
 * 1024x256 4-cell procedural Martian rock boulder atlas (`crag`, `strata`, `scoured`, `cap`)
 * for outdoor rock cover outcrops (`o` / `PILLAR`) on `planet: 'mars'`.
 */
export function marsBoulderAtlas() {
  const width = TILE_PIXELS * MARS_BOULDER_CELL_COUNT;
  const height = TILE_PIXELS;
  const data = new Uint8Array(width * height * 4);
  for (let cell = 0; cell < MARS_BOULDER_CELL_COUNT; cell++) {
    const t = new Tile(TILE_PIXELS, TILE_PIXELS);
    drawBoulderCell(t, mulberry32(62000 + cell * 49999), cell);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < TILE_PIXELS; x++) {
        const i = (y * TILE_PIXELS + x) * 3;
        const o = (y * width + cell * TILE_PIXELS + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(t.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  }
  return { name: 'marsBoulder', data, width, height, cell: TILE_PIXELS, frames: MARS_BOULDER_CELL_COUNT };
}

function marsBoulderCellUv(cell, flipV = false) {
  const inset = 0.25 / (TILE_PIXELS * MARS_BOULDER_CELL_COUNT);
  return [cell / MARS_BOULDER_CELL_COUNT + inset, flipV ? 1 : 0, (cell + 1) / MARS_BOULDER_CELL_COUNT - inset, flipV ? 0 : 1];
}

export const MARS_BOULDER_BASE_INSET = 1.0;
export const MARS_BOULDER_SLOPE = 0.5;

/**
 * Builds the 3D quad geometry for a jagged Martian boulder cluster (`'o'` / `PILLAR` tile outdoors on Mars).
 * `center` is a `Vec3(x, baseY, z)` and `size` is a `Vec2(footprint, height)`.
 */
export function marsBoulderQuads(center, size = new Vec2(64, 26)) {
  const cx = center.x;
  const baseY = center.y;
  const cz = center.z;
  const scaleXZ = size.x / 64;
  const scaleY = size.y / 26;
  const quads = [];

  const uvCrag = marsBoulderCellUv(MARS_BOULDER_CELLS.crag, false);
  const uvStrata = marsBoulderCellUv(MARS_BOULDER_CELLS.strata, false);
  const uvScoured = marsBoulderCellUv(MARS_BOULDER_CELLS.scoured, false);
  const uvCap = marsBoulderCellUv(MARS_BOULDER_CELLS.cap, false);

  // Tapered rock frustum helper (wider base, narrower weathered top) with directional face shading
  const pushRockMass = (ox, oz, hxBot, hzBot, hxTop, hzTop, y0, y1, southUv, northUv, westUv, eastUv, capUv) => {
    const bx0 = cx + (ox - hxBot) * scaleXZ;
    const bx1 = cx + (ox + hxBot) * scaleXZ;
    const bz0 = cz + (oz - hzBot) * scaleXZ;
    const bz1 = cz + (oz + hzBot) * scaleXZ;
    const tx0 = cx + (ox - hxTop) * scaleXZ;
    const tx1 = cx + (ox + hxTop) * scaleXZ;
    const tz0 = cz + (oz - hzTop) * scaleXZ;
    const tz1 = cz + (oz + hzTop) * scaleXZ;
    const by0 = baseY + y0 * scaleY;
    const by1 = baseY + y1 * scaleY;
    quads.push(
      { corners: [bx0, by0, bz1, bx1, by0, bz1, tx1, by1, tz1, tx0, by1, tz1], uv: southUv },
      { corners: [bx1, by0, bz0, bx0, by0, bz0, tx0, by1, tz0, tx1, by1, tz0], uv: northUv },
      { corners: [bx0, by0, bz0, bx0, by0, bz1, tx0, by1, tz1, tx0, by1, tz0], uv: westUv },
      { corners: [bx1, by0, bz1, bx1, by0, bz0, tx1, by1, tz0, tx1, by1, tz1], uv: eastUv },
      { corners: [tx0, by1, tz1, tx1, by1, tz1, tx1, by1, tz0, tx0, by1, tz0], uv: capUv }
    );
  };

  // Continuous 0.5-slope rock frustum across 3 geological strata tiers (half-width 31 -> 28 -> 22 -> 18 from y = 0 .. 26)
  // 1. Broad buried bedrock plinth emerging from Martian sand (y = 0 .. 6.0)
  pushRockMass(0, 0, 31.0, 31.0, 28.0, 28.0, 0.0, 6.0, uvStrata, uvScoured, uvScoured, uvCrag, uvCap);
  // 2. Main central jagged rock torso (y = 6.0 .. 18.0)
  pushRockMass(0, 0, 28.0, 28.0, 22.0, 22.0, 6.0, 18.0, uvCrag, uvScoured, uvStrata, uvCrag, uvCap);
  // 3. Upper weathered crag shoulder (y = 18.0 .. 26.0)
  pushRockMass(0, 0, 22.0, 22.0, 18.0, 18.0, 18.0, 26.0, uvCrag, uvStrata, uvScoured, uvCrag, uvCap);
  // 4. Northwest summit crag peak crowning the top plateau (y = 24.5 .. 26.8)
  pushRockMass(-4.5, -3.5, 11.5, 10.5, 8.0, 7.5, 24.5, 26.8, uvCrag, uvStrata, uvScoured, uvCrag, uvCap);
  // 5. Southeast summit crag ridge crowning the top plateau (y = 24.2 .. 26.4)
  pushRockMass(4.5, 4.0, 11.0, 10.5, 7.5, 7.0, 24.2, 26.4, uvCrag, uvScoured, uvStrata, uvStrata, uvCap);
  // 6. Southwest fractured summit spur crowning the top plateau (y = 24.0 .. 26.2)
  pushRockMass(-3.5, 4.5, 10.0, 9.5, 7.0, 6.5, 24.0, 26.2, uvStrata, uvScoured, uvScoured, uvCrag, uvCap);

  return quads;
}

export function marsBoulderMesh(center = new Vec3(0, 0, 0), size = new Vec2(64, 26)) {
  const quads = marsBoulderQuads(center, size);
  const vertices = new Float32Array(quads.length * 18);
  const uvs = new Float32Array(quads.length * 12);
  let vOut = 0;
  let uOut = 0;
  for (const { corners, uv } of quads) {
    const [u0, v0, u1, v1] = uv;
    const cornerUvs = [
      u0, v0,
      u1, v0,
      u1, v1,
      u0, v1,
    ];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      vertices[vOut++] = corners[k * 3];
      vertices[vOut++] = corners[k * 3 + 1];
      vertices[vOut++] = corners[k * 3 + 2];
      uvs[uOut++] = cornerUvs[k * 2];
      uvs[uOut++] = cornerUvs[k * 2 + 1];
    }
  }
  return { vertices, uvs };
}

const SPLASH_LOBES_A = [1.06, 1.22, 0.92, 1.18, 1.04, 0.86, 1.15, 0.94];
const SPLASH_LOBES_B = [0.94, 1.14, 1.08, 0.88, 1.18, 1.02, 0.9, 1.12];
const SPLASH_LOBES_DROP = [1.04, 0.92, 1.08, 0.95, 1.05, 0.9, 1.06, 0.96];

/**
 * Builds the 3D organic floor-level acid splash puddles and satellite splatter droplets for an Acid Splash Floor tile (',').
 * `center` is `Vec3(x, baseY, z)` and `size` is `Vec2(tileSize, 0)`.
 * Unlike recessed '~' slime pits, ',' keeps the normal floor deck at `baseY` (-0.2) and layers raised, glowing green
 * acid pools (`y ≈ 0.10 .. 0.24`) and connecting rivulets across the floor.
 */
export function acidSplashQuads(center, size = new Vec2(64, 0), seed = 0, neighborMask = 0) {
  const cx = center.x;
  const baseY = center.y;
  const cz = center.z;
  const scaleXZ = size.x / 64;
  const edgeY = baseY + 0.30;
  const rimY = baseY + 0.38;
  const innerY = baseY + 0.44;
  const quads = [];
  const uv = [0, 0, 1, 1];

  const pushSplashBlob = (ox, oz, rx, rz, rot, lobes, bevel = 1.25) => {
    const bx = cx + ox * scaleXZ;
    const bz = cz + oz * scaleXZ;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    const segs = 8;
    const px = new Array(segs);
    const pz = new Array(segs);
    const ex = new Array(segs);
    const ez = new Array(segs);

    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Trigo.twopi;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const l = lobes[(i + (seed & 7)) & 7];
      const lx = ca * rx * l * scaleXZ;
      const lz = sa * rz * l * scaleXZ;
      const lox = ca * (rx * l + bevel) * scaleXZ;
      const loz = sa * (rz * l + bevel) * scaleXZ;
      px[i] = bx + lx * cosR - lz * sinR;
      pz[i] = bz + lx * sinR + lz * cosR;
      ex[i] = bx + lox * cosR - loz * sinR;
      ez[i] = bz + lox * sinR + loz * cosR;
    }

    for (let i = 0; i < segs; i += 2) {
      const i1 = (i + 1) & 7;
      const i2 = (i + 2) & 7;
      quads.push({
        corners: [
          bx, innerY, bz,
          px[i2], rimY, pz[i2],
          px[i1], rimY, pz[i1],
          px[i], rimY, pz[i],
        ],
        uv,
      });
    }

    for (let i = 0; i < segs; i++) {
      const next = (i + 1) & 7;
      quads.push({
        corners: [
          px[i], rimY, pz[i],
          ex[i], edgeY, ez[i],
          ex[next], edgeY, ez[next],
          px[next], rimY, pz[next],
        ],
        uv,
      });
    }
  };

  const s0 = (seed & 7) - 3.5;
  const s1 = ((seed >>> 3) & 7) - 3.5;
  const rot0 = ((seed & 15) / 16) * Trigo.twopi;
  const mainOx = s0 * 0.85;
  const mainOz = s1 * 0.85;

  // 1. Central irregular multi-lobed acid splash pool
  pushSplashBlob(mainOx, mainOz, 15.8, 13.6, rot0, SPLASH_LOBES_A, 1.35);

  // 2. Secondary medium splash pool offset into a deterministic quadrant
  const quadAngle = rot0 + 0.95;
  const secOx = Math.cos(quadAngle) * 14.5;
  const secOz = Math.sin(quadAngle) * 14.5;
  pushSplashBlob(secOx, secOz, 9.2, 7.8, rot0 + 1.4, SPLASH_LOBES_B, 1.05);

  // 3. Three satellite splatter droplets scattered toward the remaining quadrants
  for (let d = 0; d < 3; d++) {
    const da = rot0 + 2.25 + d * 1.45;
    const dist = (18.5 + ((seed + d * 5) & 3) * 1.8);
    const dr = 3.8 + (((seed >>> (d * 2)) & 3) * 0.65);
    pushSplashBlob(
      Math.cos(da) * dist,
      Math.sin(da) * dist,
      dr * 1.12,
      dr * 0.92,
      da,
      SPLASH_LOBES_DROP,
      0.65
    );
  }

  // 4. Connecting rivulets toward cardinal neighbors (0: -x, 1: +x, 2: -z, 3: +z) that also have acid/barrels
  const dirX = [-1, 1, 0, 0];
  const dirZ = [0, 0, -1, 1];
  for (let d = 0; d < 4; d++) {
    if (!(neighborMask & (1 << d)))
      continue;
    const dx = dirX[d];
    const dz = dirZ[d];
    pushSplashBlob(
      mainOx * 0.4 + dx * 21.5,
      mainOz * 0.4 + dz * 21.5,
      dx !== 0 ? 10.5 : 6.8,
      dz !== 0 ? 10.5 : 6.8,
      rot0 + d * 0.7,
      SPLASH_LOBES_B,
      0.95
    );
  }

  return quads;
}



