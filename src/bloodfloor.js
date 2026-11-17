import { floorSplatPlacement } from './bloodsprites.js';
import { litColor } from './bloodpaint.js';

/**
 * Blood that runs together.
 *
 * Splats and drips drawn one quad each lie on top of one another like stickers: every one keeps its own rim and shading,
 * so where two overlap you can see both outlines, and a dozen drips side by side look like a curtain of cords. Real blood
 * joins up into one wet surface. So the floor, and each wall face, is cut into square tiles of the world, each a small
 * height field that the blood is poured into:
 *
 *   - heights meet at the thicker one and add a little where they overlap, so blood is deeper where two have joined,
 *   - the colour is a mix weighted by thickness, so thick blood keeps its depth and thin blood stays bright,
 *   - the coverage is the union of the two, so the edge of one disappears inside another,
 *   - the whole surface is then lit once, from its combined slope, by the same light as the atlas: one continuous wet
 *     pool with a single meniscus around it, and no seam anywhere.
 *
 * Headless: it only fills pixel arrays. The world uploads each tile that changed and draws it as one quad.
 */

/** World units across a tile. */
export const CHUNK = 32;
/** Texels per world unit. */
export const TPU = 8;
/** Texels past each edge of a tile: neighbouring tiles overlap and show the same blood, so no seam shows between them. */
export const PAD = 2;
export const TEX = CHUNK * TPU + PAD * 2;
/** The most tiles at once (about 0.9 MB of memory each); past that, nothing new is poured and the caller draws it itself. */
export const MAX_CHUNKS = 160;

const OVERLAP_GAIN = 0.35;
const CELL = 128;

/** The floor: u is world x, v is world y. */
export const FLOOR = { id: 'floor', kind: 'floor', up: false };

/** A wall face: u runs along its tangent (-ny, nx) and v is the height. `plane` is the face's coordinate on its axis. */
function makeWall(nx, ny, plane) {
  return { id: `wall ${nx} ${ny} ${plane}`, kind: 'wall', up: true, nx, ny, plane, tx: -ny, ty: nx };
}

/** The world position of the point at (u, along the normal `lift`) on a wall face, written into `out` as [x, y]. */
function wallPoint(s, u, lift, out) {
  // on the face u = x * tx + y * ty with the other coordinate fixed at the plane
  if (s.nx !== 0) {
    out[0] = s.plane + s.nx * lift;
    out[1] = u / s.ty;
  } else {
    out[0] = u / s.tx;
    out[1] = s.plane + s.ny * lift;
  }
}

const POINT = [0, 0];

export class MergedBlood {
  /** `atlas` is the blood atlas, whose `layers` are the unlit splats and drips. */
  constructor(atlas) {
    this.layers = atlas.layers;
    this.frames = atlas.frames;
    this.chunks = new Map();
    this.surfaces = new Map();
    this.changed = new Set();
    this.out = new Float32Array(3);
    this.at = [0, 0];
  }

  clear() {
    this.chunks.clear();
    this.changed.clear();
  }

  /** The surface of the wall face with normal (nx, ny) at `plane`: the same object every time, so it can be compared. */
  wall(nx, ny, plane) {
    const key = `wall ${nx} ${ny} ${plane}`;
    let s = this.surfaces.get(key);
    if (!s) {
      s = makeWall(nx, ny, plane);
      this.surfaces.set(key, s);
    }
    return s;
  }

  /** The tile of `surface` at (cu, cv), made when it is new and there is room; null when there is not. */
  chunk(surface, cu, cv, create = true) {
    const key = `${surface.id}:${cu},${cv}`;
    let c = this.chunks.get(key);
    if (c || !create || this.chunks.size >= MAX_CHUNKS)
      return c ?? null;
    const n = TEX * TEX;
    c = {
      key,
      surface,
      cu,
      cv,
      // the surface coordinates of the first texel's edge
      u0: cu * CHUNK - PAD / TPU,
      v0: cv * CHUNK - PAD / TPU,
      H: new Float32Array(n),
      cov: new Uint8Array(n),
      rgb: new Uint8Array(n * 3),
      gloss: new Uint8Array(n),
      // row 0 of the data is v = 0: the low side of the tile in v
      atlas: { name: `blood-${key}`, data: new Uint8Array(n * 4), width: TEX, height: TEX },
      dirty: null,
    };
    this.chunks.set(key, c);
    return c;
  }

  /** Whether every tile in the range exists or could be made. */
  room(surface, cu0, cu1, cv0, cv1) {
    let missing = 0;
    for (let cv = cv0; cv <= cv1; cv++)
      for (let cu = cu0; cu <= cu1; cu++)
        if (!this.chunks.has(`${surface.id}:${cu},${cv}`))
          missing++;
    return this.chunks.size + missing <= MAX_CHUNKS;
  }

  /**
   * Pours one floor splat (`size` and `seed` as for floorSplatQuad) into the tiles under it. Returns false, pouring
   * nothing, when the tiles it needs cannot be made (the cap), so the caller can draw that splat itself.
   */
  stamp(x, y, size, seed) {
    const { variant, angle } = floorSplatPlacement(seed);
    const layer = this.layers[variant];
    if (!layer)
      return true;
    const half = size * 1.6;
    const reach = half * Math.SQRT2 + PAD / TPU;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // heights are scaled with the picture, so the slopes (and so the shading) are kept
    const heightScale = (TPU * 2 * half) / CELL;
    const cu0 = Math.floor((x - reach) / CHUNK);
    const cu1 = Math.floor((x + reach) / CHUNK);
    const cv0 = Math.floor((y - reach) / CHUNK);
    const cv1 = Math.floor((y + reach) / CHUNK);
    if (!this.room(FLOOR, cu0, cu1, cv0, cv1))
      return false;
    const inv = CELL / (2 * half);
    const locate = (u, v, out) => {
      const dx = u - x;
      const dy = v - y;
      const a = dx * cos + dy * sin;
      const b = -dx * sin + dy * cos;
      if (a <= -half || a >= half || b <= -half || b >= half)
        return false;
      // the cell: columns run along a, and the top row is +b
      out[0] = a * inv + CELL / 2 - 0.5;
      out[1] = CELL / 2 - b * inv - 0.5;
      return true;
    };
    for (let cv = cv0; cv <= cv1; cv++)
      for (let cu = cu0; cu <= cu1; cu++)
        this.pour(this.chunk(FLOOR, cu, cv), locate, layer, heightScale, x - reach, x + reach, y - reach, y + reach);
    return true;
  }

  /**
   * Pours a flat picture on a wall face: the rectangle [uMin, uMax] x [vMin, vMax] of `surface` shows the texture
   * rectangle `uv` of the atlas ([u0, v0, u1, v1], v0 at the bottom), as one of the wall splat, stem or tip cells.
   * Returns false, pouring nothing, when the tiles it needs cannot be made.
   */
  stampRect(surface, uMin, uMax, vMin, vMax, uv, widthBottom = 1, widthTop = 1) {
    const cell = Math.floor(((uv[0] + uv[2]) / 2) * this.frames);
    const layer = this.layers[cell];
    if (!layer || uMax <= uMin || vMax <= vMin)
      return true;
    const cx0 = uv[0] * this.frames - cell;
    const cx1 = uv[2] * this.frames - cell;
    const heightScale = (TPU * (uMax - uMin)) / (Math.abs(cx1 - cx0) * CELL || 1);
    const cu0 = Math.floor((uMin - PAD / TPU) / CHUNK);
    const cu1 = Math.floor((uMax + PAD / TPU) / CHUNK);
    const cv0 = Math.floor((vMin - PAD / TPU) / CHUNK);
    const cv1 = Math.floor((vMax + PAD / TPU) / CHUNK);
    if (!this.room(surface, cu0, cu1, cv0, cv1))
      return false;
    const du = 1 / (uMax - uMin);
    const dv = 1 / (vMax - vMin);
    const locate = (u, v, out) => {
      if (u < uMin || u > uMax || v < vMin || v > vMax)
        return false;
      const fv = (v - vMin) * dv;
      // a quad that narrows (a stem running down) shows the picture squeezed about its middle
      const squeeze = widthBottom + (widthTop - widthBottom) * fv;
      const fu = 0.5 + ((u - uMin) * du - 0.5) / squeeze;
      if (fu < 0 || fu > 1)
        return false;
      out[0] = (cx0 + (cx1 - cx0) * fu) * CELL - 0.5;
      out[1] = (1 - (uv[1] + (uv[3] - uv[1]) * fv)) * CELL - 0.5;
      return true;
    };
    for (let cv = cv0; cv <= cv1; cv++)
      for (let cu = cu0; cu <= cu1; cu++)
        this.pour(this.chunk(surface, cu, cv), locate, layer, heightScale, uMin, uMax, vMin, vMax);
    return true;
  }

  /** The point of the tile's quad at (u, v) of the surface, as a world position: floors at `height`, walls `lift` off the face. */
  corner(chunk, u, v, height, lift, out, o) {
    const s = chunk.surface;
    if (s.kind === 'floor') {
      out[o] = u;
      out[o + 1] = height;
      out[o + 2] = v;
    } else {
      wallPoint(s, u, lift, POINT);
      out[o] = POINT[0];
      out[o + 1] = v;
      out[o + 2] = POINT[1];
    }
  }

  /** The four corners of a tile's quad (bottom-left, bottom-right, top-right, top-left; 12 numbers), written into `out`. */
  chunkCorners(chunk, height, lift, out = new Array(12)) {
    const span = TEX / TPU;
    const { u0, v0 } = chunk;
    this.corner(chunk, u0, v0, height, lift, out, 0);
    this.corner(chunk, u0 + span, v0, height, lift, out, 3);
    this.corner(chunk, u0 + span, v0 + span, height, lift, out, 6);
    this.corner(chunk, u0, v0 + span, height, lift, out, 9);
    return out;
  }

  /**
   * Pours into the texels of `chunk` inside the surface rectangle given. `locate(u, v, out)` finds where in the atlas
   * cell the surface point is (bilinear coordinates into `layer`, in out[0] and out[1]), or returns false when the
   * picture does not cover it.
   */
  pour(chunk, locate, layer, heightScale, uMin, uMax, vMin, vMax) {
    const c0 = Math.max(0, Math.floor((uMin - chunk.u0) * TPU));
    const c1 = Math.min(TEX - 1, Math.ceil((uMax - chunk.u0) * TPU));
    const r0 = Math.max(0, Math.floor((vMin - chunk.v0) * TPU));
    const r1 = Math.min(TEX - 1, Math.ceil((vMax - chunk.v0) * TPU));
    if (c0 > c1 || r0 > r1)
      return;
    const { at } = this;
    let touched = false;
    for (let r = r0; r <= r1; r++) {
      const v = chunk.v0 + (r + 0.5) / TPU;
      for (let c = c0; c <= c1; c++) {
        const u = chunk.u0 + (c + 0.5) / TPU;
        if (locate(u, v, at) && this.merge(chunk, r * TEX + c, layer, at[0], at[1], heightScale))
          touched = true;
      }
    }
    if (!touched)
      return;
    const d = chunk.dirty;
    if (d) {
      d.c0 = Math.min(d.c0, c0);
      d.c1 = Math.max(d.c1, c1);
      d.r0 = Math.min(d.r0, r0);
      d.r1 = Math.max(d.r1, r1);
    } else
      chunk.dirty = { c0, c1, r0, r1 };
    this.changed.add(chunk);
  }

  /** Merges the picture at bilinear cell coordinates (fu, fv) into texel `i`; false when the picture is empty there. */
  merge(chunk, i, layer, fu, fv, heightScale) {
    const { cov: lc, H: lh, rgb: lr, gloss: lg } = layer;
    const u0 = Math.max(0, Math.min(CELL - 1, Math.floor(fu)));
    const v0 = Math.max(0, Math.min(CELL - 1, Math.floor(fv)));
    const u1 = Math.min(CELL - 1, u0 + 1);
    const v1 = Math.min(CELL - 1, v0 + 1);
    const tu = Math.max(0, Math.min(1, fu - u0));
    const tv = Math.max(0, Math.min(1, fv - v0));
    const i00 = v0 * CELL + u0;
    const i10 = v0 * CELL + u1;
    const i01 = v1 * CELL + u0;
    const i11 = v1 * CELL + u1;
    const w00 = (1 - tu) * (1 - tv);
    const w10 = tu * (1 - tv);
    const w01 = (1 - tu) * tv;
    const w11 = tu * tv;
    const nc = lc[i00] * w00 + lc[i10] * w10 + lc[i01] * w01 + lc[i11] * w11;
    if (nc < 0.004)
      return false;
    const { H, cov, rgb, gloss } = chunk;
    const nh = (lh[i00] * w00 + lh[i10] * w10 + lh[i01] * w01 + lh[i11] * w11) * heightScale;
    const oldH = H[i];
    const oldCov = cov[i] / 255;
    // thickness-weighted colour: the deeper blood decides what the mix looks like
    const wNew = nh * nc;
    const wOld = oldH * oldCov;
    const mix = wNew / (wNew + wOld + 1e-6);
    for (let k = 0; k < 3; k++) {
      const nv = lr[i00 * 3 + k] * w00 + lr[i10 * 3 + k] * w10 + lr[i01 * 3 + k] * w01 + lr[i11 * 3 + k] * w11;
      rgb[i * 3 + k] = oldCov > 0 ? rgb[i * 3 + k] + (nv - rgb[i * 3 + k]) * mix : nv;
    }
    const ng = lg[i00] * w00 + lg[i10] * w10 + lg[i01] * w01 + lg[i11] * w11;
    gloss[i] = oldCov > 0 ? gloss[i] + (ng - gloss[i]) * mix : ng;
    H[i] = Math.max(oldH, nh) + OVERLAP_GAIN * Math.min(oldH, nh);
    cov[i] = Math.round(255 * (1 - (1 - oldCov) * (1 - nc)));
    return true;
  }

  /**
   * Lights what was poured since the last call, and returns the tiles that changed. Each has its `dirty` rect to upload
   * (set `chunk.dirty = null` once it is).
   */
  flush() {
    const list = [];
    for (const chunk of this.changed) {
      this.light(chunk);
      list.push(chunk);
    }
    this.changed.clear();
    return list;
  }

  /** Re-lights the changed part of a tile (a texel more all round, for the slopes beside it), bleeding colour into the empty texels at its edge. */
  light(chunk) {
    const { dirty, H, cov, rgb, gloss } = chunk;
    const { out } = this;
    const c0 = Math.max(0, dirty.c0 - 2);
    const c1 = Math.min(TEX - 1, dirty.c1 + 2);
    const r0 = Math.max(0, dirty.r0 - 2);
    const r1 = Math.min(TEX - 1, dirty.r1 + 2);
    const data = chunk.atlas.data;
    // the atlas is lit with its rows running down; a wall's rows run up
    const flip = chunk.surface.up ? -1 : 1;
    const h = (r, c) => H[(r < 0 ? 0 : r >= TEX ? TEX - 1 : r) * TEX + (c < 0 ? 0 : c >= TEX ? TEX - 1 : c)];
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const i = r * TEX + c;
        const o = i * 4;
        if (cov[i]) {
          // a slope read across three rows (or columns), which smooths the grain of the picture
          const gx = (h(r - 1, c + 1) + h(r, c + 1) + h(r + 1, c + 1) - h(r - 1, c - 1) - h(r, c - 1) - h(r + 1, c - 1)) / 6;
          const gy = ((h(r + 1, c - 1) + h(r + 1, c) + h(r + 1, c + 1) - h(r - 1, c - 1) - h(r - 1, c) - h(r - 1, c + 1)) / 6) * flip;
          litColor(gx, gy, rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], gloss[i] / 255, out);
          data[o] = out[0];
          data[o + 1] = out[1];
          data[o + 2] = out[2];
          data[o + 3] = cov[i];
        } else {
          // empty: take the colour of its covered neighbours, so filtering has nothing black to blend in
          let sr = 0;
          let sg = 0;
          let sb = 0;
          let n = 0;
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) {
              const rr = r + dr;
              const cc = c + dc;
              if ((dr || dc) && rr >= 0 && rr < TEX && cc >= 0 && cc < TEX && cov[rr * TEX + cc]) {
                const j = (rr * TEX + cc) * 4;
                sr += data[j];
                sg += data[j + 1];
                sb += data[j + 2];
                n++;
              }
            }
          data[o] = n ? sr / n : 0;
          data[o + 1] = n ? sg / n : 0;
          data[o + 2] = n ? sb / n : 0;
          data[o + 3] = 0;
        }
      }
    // what the caller uploads: the rows that changed
    chunk.dirty = { c0, c1, r0, r1 };
  }
}
