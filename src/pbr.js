import { Utils } from '@1pizzateam/spock';
import { mulberry32 } from './rng.js';
import { PILLAR, TILE, WALL } from './level.js';

/**
 * Material maps for the wall, floor and ceiling atlases.
 *
 * The atlas builders draw the relief as they paint (`Tile.relief`, `dome`, `groove`, `pipe`, in world units) and hand it
 * over as `atlas.relief`: that is the height field. The painted light and dark adds a little fine grain on top, and is
 * the whole height for an atlas that has no authored relief. From the height come two more atlases of the same layout,
 * made once at load:
 *
 *   normal: one RGBA atlas. RG = the tangent-space normal's x and y (z is rebuilt in the shader), B = the height
 *           (0.75 = the flat surface, 1 = 2 units up, 0 = 6 units down), for parallax, A = ambient occlusion
 *
 * Roughness and metalness are not stored: the shader works them out from the colour and the height.
 *
 * Each cell is filtered on its own and wraps around inside itself, so a cell tiles without a seam and never reads its
 * neighbour. Row 0 of the data is the top of the picture, which the texture upload flips: up on screen is +V.
 */

/** How steep the relief looks: 1 is as drawn, larger exaggerates it. */
const NORMAL_STRENGTH = 1.3;

const luminance = (r, g, b) => (r * 0.299 + g * 0.587 + b * 0.114) / 255;

/** One line of a box blur with wrap-around, in running sums: the cost does not grow with the radius. */
function blurLine(src, srcOffset, srcStride, dst, dstOffset, dstStride, length, radius) {
  const norm = 1 / (radius * 2 + 1);
  let sum = 0;
  for (let k = -radius; k <= radius; k++)
    sum += src[srcOffset + (((k % length) + length) % length) * srcStride];
  for (let i = 0; i < length; i++) {
    dst[dstOffset + i * dstStride] = sum * norm;
    sum += src[srcOffset + ((i + radius + 1) % length) * srcStride] - src[srcOffset + (((i - radius) % length + length) % length) * srcStride];
  }
}

/** A separable box blur of one `w` x `h` region, wrapping at its edges. */
function boxBlur(src, w, h, radius) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    blurLine(src, y * w, 1, tmp, y * w, 1, w, radius);
  for (let x = 0; x < w; x++)
    blurLine(tmp, x, w, out, x, w, h, radius);
  return out;
}

/**
 * Builds the normal atlas (normal x and y, height, AO) that goes with `atlas`
 * ({ data: RGBA bytes, relief, width, height, cell, optional regions }).
 *
 * @returns {{ normal: object }} an atlas of the same size and cell layout as `atlas`
 */
export function buildMaterialMaps(atlas, { strength = NORMAL_STRENGTH } = {}) {
  const { data, width, height, cell } = atlas;
  const normalData = new Uint8Array(width * height * 4);
  // the pieces of the atlas that are filtered and wrap on their own: equal square cells, 64 world units across, unless the
  // atlas lists its own regions ({ x, width, height, units }: `units` is the size of one texel in world units)
  const regions = atlas.regions ?? Array.from({ length: Math.round(width / cell) }, (_, f) => ({ x: f * cell, width: cell, height: cell, units: 64 / cell }));
  for (const region of regions) {
    const { x: x0, width: w, height: h } = region;
    const texelUnits = region.units;
    const lum = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = (y * width + x0 + x) * 4;
        lum[y * w + x] = luminance(data[o], data[o + 1], data[o + 2]);
      }
    }
    const smooth = boxBlur(lum, w, h, 1);
    const local = boxBlur(lum, w, h, 5);
    const wide = boxBlur(lum, w, h, 16);
    // height in world units: what was drawn, plus the fine grain of the painting with the big colour changes taken out
    const hf = new Float32Array(w * h);
    const grain = atlas.relief ? 0.3 : 4;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const drawn = atlas.relief ? atlas.relief[y * width + x0 + x] : 0;
        hf[i] = drawn + ((smooth[i] - wide[i]) * 4 + (smooth[i] - local[i]) * 2) * grain * 0.5;
      }
    const hLocal = boxBlur(hf, w, h, 6);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const xl = y * w + ((x - 1 + w) % w);
        const xr = y * w + ((x + 1) % w);
        const yu = ((y - 1 + h) % h) * w + x;
        const yd = ((y + 1) % h) * w + x;
        // slopes in world units per world unit
        const dhdx = ((hf[xr] - hf[xl]) * 0.5) / texelUnits;
        // row 0 is the top, +V is up, so the V slope is the opposite of the row slope
        const dhdrow = ((hf[yd] - hf[yu]) * 0.5) / texelUnits;
        let nx = -dhdx * strength;
        let ny = dhdrow * strength;
        let nz = 1;
        const inv = 1 / Math.hypot(nx, ny, nz);
        nx *= inv;
        ny *= inv;
        nz *= inv;
        const o = (y * width + x0 + x) * 4;
        // the darkening of the inside of a groove or well, and of painted cavities: the light barely reaches them
        const cavity = Utils.clamp((wide[i] - smooth[i]) * 2.2 + (local[i] - smooth[i]) * 3, 0, 1);
        const sunk = Utils.clamp((hLocal[i] - hf[i]) * 0.55, 0, 1);
        const ao = Utils.clamp(1 - Math.max(cavity, sunk) * 0.78, 0.25, 1);
        normalData[o] = Math.round((nx * 0.5 + 0.5) * 255);
        normalData[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        normalData[o + 2] = Math.round(Utils.clamp(0.75 + hf[i] / 8, 0, 1) * 255);
        normalData[o + 3] = Math.round(ao * 255);
      }
    }
  }
  return {
    normal: { name: `${atlas.name}-normal`, data: normalData, width, height, cell },
  };
}

/** Smooth random 0..1 on a size x size lattice that repeats seamlessly. */
function periodicNoise(rnd, cells) {
  const grid = Float32Array.from({ length: cells * cells }, () => rnd());
  return (u, v) => {
    const x = u * cells;
    const y = v * cells;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = Utils.smoothstep(0, 1, x - x0);
    const fy = Utils.smoothstep(0, 1, y - y0);
    const at = (ix, iy) => grid[(((iy % cells) + cells) % cells) * cells + (((ix % cells) + cells) % cells)];
    return Utils.lerp(Utils.lerp(at(x0, y0), at(x0 + 1, y0), fx), Utils.lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), fx), fy);
  };
}

/**
 * A small normal map of fine metal grain, pitting and brushing that repeats seamlessly. The shader lays it over the
 * relief of the atlases in world space, near the camera, so a wall keeps its detail up close instead of going soft.
 *
 * @returns {{ name: string, data: Uint8Array, width: number, height: number }}
 */
export function buildDetailNormal(size = 128, strength = 3) {
  const rnd = mulberry32(424242);
  const octaves = [[periodicNoise(rnd, 8), 0.45], [periodicNoise(rnd, 16), 0.3], [periodicNoise(rnd, 32), 0.2], [periodicNoise(rnd, 64), 0.12]];
  // brushed streaks: many cells across Y, few across X
  const streakGrid = Float32Array.from({ length: 4 * 96 }, () => rnd());
  const streak = (u, v) => {
    const x = u * 4;
    const y = v * 96;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = Utils.smoothstep(0, 1, x - x0);
    const at = (ix, iy) => streakGrid[(((iy % 96) + 96) % 96) * 4 + (((ix % 4) + 4) % 4)];
    return Utils.lerp(at(x0, y0), at(x0 + 1, y0), fx);
  };
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      let sum = 0;
      for (const [noise, weight] of octaves)
        sum += noise(u, v) * weight;
      h[y * size + x] = sum + streak(u, v) * 0.05;
    }
  }
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dhdx = (h[y * size + ((x + 1) % size)] - h[y * size + ((x - 1 + size) % size)]) * 0.5;
      const dhdy = (h[((y + 1) % size) * size + x] - h[((y - 1 + size) % size) * size + x]) * 0.5;
      let nx = -dhdx * strength * 8;
      let ny = dhdy * strength * 8;
      const inv = 1 / Math.hypot(nx, ny, 1);
      nx *= inv;
      ny *= inv;
      const o = (y * size + x) * 4;
      data[o] = Math.round((nx * 0.5 + 0.5) * 255);
      data[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[o + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      data[o + 3] = 255;
    }
  }
  return { name: 'detail-normal', data, width: size, height: size };
}

/** A box blur of a w x h map that stops at its edges. */
function boxBlurClamped(src, w, h, radius) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++)
        sum += src[y * w + Utils.clamp(x + k, 0, w - 1)];
      tmp[y * w + x] = sum / (radius * 2 + 1);
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++)
        sum += tmp[Utils.clamp(y + k, 0, h - 1) * w + x];
      out[y * w + x] = sum / (radius * 2 + 1);
    }
  }
  return out;
}

/**
 * The plan of a level as an occlusion map, for the shader to darken contact and corners with. One texel is
 * TILE / texelsPerTile world units, the map starts at the world origin, and it holds how much of the neighbourhood is
 * solid: R within about 16 units, G within about 48. Walls and pillars are solid, diagonal walls half.
 *
 * @returns {{ name: string, data: Uint8Array, width: number, height: number, worldSize: number[] }}
 */
export function buildLevelAo(level, texelsPerTile = 8) {
  const res = texelsPerTile;
  const w = level.width * res;
  const h = level.rowCount * res;
  const solid = new Float32Array(w * h);
  for (let ty = 0; ty < level.rowCount; ty++) {
    for (let tx = 0; tx < level.width; tx++) {
      const idx = ty * level.width + tx;
      const kind = level.kind[idx];
      const amount = level.diag?.[idx] ? 0.5 : kind === WALL || kind === PILLAR ? 1 : 0;
      if (amount === 0)
        continue;
      for (let y = 0; y < res; y++)
        for (let x = 0; x < res; x++)
          solid[(ty * res + y) * w + tx * res + x] = amount;
    }
  }
  const near = boxBlurClamped(solid, w, h, Math.max(1, Math.round(res * 0.25)));
  const wide = boxBlurClamped(solid, w, h, Math.round(res * 0.75));
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = Math.round(Utils.clamp(near[i], 0, 1) * 255);
    data[i * 4 + 1] = Math.round(Utils.clamp(wide[i], 0, 1) * 255);
    data[i * 4 + 3] = 255;
  }
  return { name: 'level-ao', data, width: w, height: h, worldSize: [level.width * TILE, level.rowCount * TILE] };
}

/**
 * A 256 x 256 tiling noise texture for the rust: R is random value noise, G is the same noise shifted by (37, 17) in
 * texture space, so one filtered read gives two layers of 3D value noise to blend between (see `noise3` in the floor shader).
 *
 * @returns {{ name: string, data: Uint8Array, width: number, height: number }}
 */
export function buildNoiseTexture(size = 256) {
  const rnd = mulberry32(7771);
  const base = new Uint8Array(size * size);
  for (let i = 0; i < base.length; i++)
    base[i] = Math.floor(rnd() * 256);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      data[o] = base[y * size + x];
      // the upload flips the picture upside down, so +17 in texture space is -17 in rows
      data[o + 1] = base[((y - 17 + size) % size) * size + ((x + 37) % size)];
      data[o + 2] = 128;
      data[o + 3] = 255;
    }
  }
  return { name: 'rust-noise', data, width: size, height: size };
}
