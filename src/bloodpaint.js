/**
 * The painter of the blood atlas: every cell is drawn at 128 x 128 texels (4 per pixel of the old 32 x 32 art).
 *
 * Nothing is dithered. A cell is built the way a surface would be: shapes are signed-distance fields (a pool, tapered
 * rays, flung droplets, bone, meat), each rises from its edge into a rounded bead of liquid, and the result is a height
 * field. The light is worked out once from that height: a diffuse term, a tight wet specular glint, a broad sheen, a
 * meniscus at every edge. Thin blood is bright and translucent, thick blood is deep crimson, clots are dark and matte.
 * Edges carry a one texel anti-aliased alpha, and the colour is bled out into the transparent texels around them so that
 * filtering never pulls a black fringe into the picture.
 *
 * Pure maths, no GPU, and the same seed always gives the same picture.
 */

export const SCALE = 4;
export const RES = 32 * SCALE;
const N = RES;
const C = N / 2;

/** Pixels of the atlas per unit of the shoe print's shapes (the old art used 2.26 pixels of 32). */
export const PRINT_UNIT = 2.26 * SCALE;

/** The height of each drip tip, in the 32-pixel units the drips are laid out in. */
export const TIP_HEIGHTS = [8, 6, 9, 7];

// the shape of a shoe, in the units of printVertices, with the toe towards +x
const HEEL = [[-5.2, 0], [-4.6, -1.3], [-3.4, -1.6], [-2.4, -1.2], [-2.2, 0], [-2.4, 1.2], [-3.4, 1.6], [-4.6, 1.3]];
const FOREFOOT = [[-1, -1.6], [1, -2.3], [3.4, -2.4], [5, -1.4], [5.4, 0.2], [4.6, 1.8], [2.6, 2.6], [0.2, 2.4], [-1, 1.4]];

const TWO_PI = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// ---- noise ----------------------------------------------------------------------------------------------------------

function hash2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed + 1, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Value noise in 0..1. With `period` it repeats every `period` lattice cells along y (the stems tile top to bottom). */
function vnoise(x, y, seed, period = 0) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  let ya = y0;
  let yb = y0 + 1;
  if (period) {
    ya = ((y0 % period) + period) % period;
    yb = (ya + 1) % period;
  }
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = lerp(hash2(x0, ya, seed), hash2(x0 + 1, ya, seed), sx);
  const b = lerp(hash2(x0, yb, seed), hash2(x0 + 1, yb, seed), sx);
  return lerp(a, b, sy);
}

function fbm(x, y, seed, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let total = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(x * f, y * f, seed + o * 17);
    total += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / total;
}

/** Noise in 0..1 that repeats exactly every N texels along y. `fx` is cycles per texel across; `cells` lattice cells down the cell. */
function periodic(x, y, fx, cells, seed, octaves = 3) {
  let sum = 0;
  let amp = 0.5;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const per = cells * (1 << o);
    sum += amp * vnoise(x * fx * (1 << o), (y / N) * per, seed + o * 31, per);
    total += amp;
    amp *= 0.5;
  }
  return sum / total;
}

// ---- distance fields ----------------------------------------------------------------------------------------------

function smin(a, b, k) {
  if (a === Infinity)
    return b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** A circle (r1 omitted) or a tapered capsule from a to b, radius r0 growing or shrinking to r1. */
function element(ax, ay, bx, by, r0, r1 = r0) {
  const ex = bx - ax;
  const ey = by - ay;
  const len2 = ex * ex + ey * ey || 1;
  return (x, y) => {
    const wx = x - ax;
    const wy = y - ay;
    const t = clamp01((wx * ex + wy * ey) / len2);
    const dx = wx - ex * t;
    const dy = wy - ey * t;
    return Math.sqrt(dx * dx + dy * dy) - lerp(r0, r1, t);
  };
}

const circle = (cx, cy, r) => element(cx, cy, cx, cy, r, r);

/** Signed distance to a polygon, negative inside. */
function polygon(points) {
  const n = points.length;
  return (x, y) => {
    let d = Infinity;
    let s = 1;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const ex = points[j][0] - points[i][0];
      const ey = points[j][1] - points[i][1];
      const wx = x - points[i][0];
      const wy = y - points[i][1];
      const t = clamp01((wx * ex + wy * ey) / (ex * ex + ey * ey));
      const bx = wx - ex * t;
      const by = wy - ey * t;
      d = Math.min(d, bx * bx + by * by);
      const c1 = y >= points[i][1];
      const c2 = y < points[j][1];
      const c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3))
        s = -s;
    }
    return s * Math.sqrt(d);
  };
}

/** Elements fused softly (`k` texels), then separate ones that are only joined by a hard union. */
function fused(soft, k, hard = []) {
  return (x, y) => {
    let d = Infinity;
    for (let i = 0; i < soft.length; i++)
      d = smin(d, soft[i](x, y), k);
    for (let i = 0; i < hard.length; i++) {
      const e = hard[i](x, y);
      if (e < d)
        d = e;
    }
    return d;
  };
}

/** A distance field whose edge is torn: coarse waves, and a fine ragged grain. */
function ragged(field, seed, coarse = 4.5, fine = 1.1) {
  return (x, y) => {
    const d = field(x, y);
    if (d > 10)
      return d;
    return d + (fbm(x * 0.055, y * 0.055, seed, 3) - 0.5) * coarse * 2 + (vnoise(x * 0.3, y * 0.3, seed + 5) - 0.5) * fine * 2;
  };
}

/** A circular rise from the edge to the full height over `bevel` texels: a bead of liquid seen in section. */
const parabola = (bevel) => (x, y, depth) => {
  const u = clamp01(depth / bevel);
  return 1 - (1 - u) * (1 - u);
};

/** A sphere: the height of a ball of radius `r`, for eyes and droplets. */
const sphere = (r) => (x, y, depth) => {
  const u = clamp01(depth / r);
  return Math.sqrt(1 - (1 - u) * (1 - u));
};

// ---- the painter --------------------------------------------------------------------------------------------------

const LIGHT = [-0.5, -0.58, 0.64];
const lightLen = Math.hypot(...LIGHT);
const L = LIGHT.map((v) => v / lightLen);
const HALF = (() => {
  const h = [L[0], L[1], L[2] + 1];
  const len = Math.hypot(...h);
  return h.map((v) => v / len);
})();
const SCRATCH = new Float32Array(4);

const LIT = new Float32Array(3);

/**
 * The colour of a texel of blood lit from its slope (`gx`, `gy`: the height gradient per texel) and its unlit colour:
 * a diffuse term, a tight wet glint and a broad sheen. Written into `out` as r, g, b in 0..255. The cells of the atlas
 * and the merged floor blood are lit by this one function, so they match.
 */
export function litColor(gx, gy, r, g, b, gloss, out) {
  const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1);
  const nx = -gx * inv;
  const ny = -gy * inv;
  const nz = inv;
  const ndl = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
  const ndh = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]);
  const glint = Math.pow(ndh, 70) * gloss * 0.55;
  const sheen = Math.pow(ndh, 9) * gloss * 0.16;
  const diffuse = 0.66 + 0.55 * ndl;
  out[0] = Math.min(255, r * diffuse + 255 * (glint + sheen * 0.9));
  out[1] = Math.min(255, g * diffuse + 150 * glint + 60 * sheen);
  out[2] = Math.min(255, b * diffuse + 140 * glint + 58 * sheen);
}

class Paint {
  constructor() {
    const n = N * N;
    this.H = new Float32Array(n);
    this.cov = new Float32Array(n);
    this.rgb = new Float32Array(n * 3);
    this.gloss = new Float32Array(n);
  }

  /**
   * Lays down a shape. `albedo(x, y, q, out)` writes r, g, b and gloss into `out`; `q` is how far up the bead of liquid
   * the texel is (0 at the edge, 1 at the full height). `stack` lets the shape sit on what is already there.
   */
  shape(sdf, { lift = 8, bevel = 10, dome = null, albedo, bump = null, stack = false }) {
    const out = SCRATCH;
    const profile = dome ?? parabola(bevel);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const d = sdf(px, py);
        if (d > 0.75)
          continue;
        const c = clamp01(0.5 - d);
        const q = profile(px, py, -d);
        let hh = lift * q;
        if (bump)
          hh += bump(px, py, q) * clamp01(q * 2);
        albedo(px, py, q, out);
        const i = y * N + x;
        if (stack)
          hh += this.H[i];
        this.H[i] = lerp(this.H[i], hh, c);
        this.rgb[i * 3] = lerp(this.rgb[i * 3], out[0], c);
        this.rgb[i * 3 + 1] = lerp(this.rgb[i * 3 + 1], out[1], c);
        this.rgb[i * 3 + 2] = lerp(this.rgb[i * 3 + 2], out[2], c);
        this.gloss[i] = lerp(this.gloss[i], out[3], c);
        this.cov[i] = this.cov[i] + c - this.cov[i] * c;
      }
    }
  }

  /**
   * The lit picture as RGBA bytes. `wrapY` makes the cell tile top to bottom; `fade` is [x, y] flags for letting
   * the edges of the cell fall to nothing (a cell that continues into the next one must not).
   */
  finalize({ wrapY = false, fade = [true, true] } = {}) {
    const { H, cov, rgb, gloss } = this;
    const smooth = new Float32Array(N * N);
    const at = (x, y) => {
      const cx = x < 0 ? 0 : x >= N ? N - 1 : x;
      const cy = wrapY ? (y + N) % N : y < 0 ? 0 : y >= N ? N - 1 : y;
      return cy * N + cx;
    };
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            s += H[at(x + dx, y + dy)];
        smooth[y * N + x] = s / 9;
      }
    const data = new Uint8Array(N * N * 4);
    const filled = new Uint8Array(N * N);
    const alphas = new Float32Array(N * N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const edge = Math.min(fade[0] ? Math.min(x, N - 1 - x) : N, fade[1] ? (wrapY ? N : Math.min(y, N - 1 - y)) : N);
        const alpha = cov[i] * clamp01((edge - 2) / 5);
        if (cov[i] <= 0.001)
          continue;
        const gx = (smooth[at(x + 1, y)] - smooth[at(x - 1, y)]) * 0.5;
        const gy = (smooth[at(x, y + 1)] - smooth[at(x, y - 1)]) * 0.5;
        litColor(gx, gy, rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], gloss[i], LIT);
        const o = i * 4;
        data[o] = LIT[0];
        data[o + 1] = LIT[1];
        data[o + 2] = LIT[2];
        data[o + 3] = Math.round(alpha * 255);
        alphas[i] = alpha;
        filled[i] = 1;
      }
    }
    bleed(data, filled, wrapY);
    // the unlit layers, for blood that is merged with other blood (see bloodfloor.js)
    this.layers = {
      H: Float32Array.from(H),
      cov: alphas,
      rgb: Uint8Array.from(rgb, (v) => Math.min(255, Math.round(v))),
      gloss: Uint8Array.from(gloss, (v) => Math.round(v * 255)),
    };
    return data;
  }
}

/** Spreads the colour of the edge into the transparent texels around it, so filtering has nothing black to blend in. */
function bleed(data, filled, wrapY) {
  for (let pass = 0; pass < 4; pass++) {
    const grown = [];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        if (filled[i])
          continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          let ny = y + dy;
          if (nx < 0 || nx >= N)
            continue;
          if (wrapY)
            ny = (ny + N) % N;
          else if (ny < 0 || ny >= N)
            continue;
          const j = ny * N + nx;
          if (!filled[j])
            continue;
          r += data[j * 4];
          g += data[j * 4 + 1];
          b += data[j * 4 + 2];
          n++;
        }
        if (n)
          grown.push(i, r / n, g / n, b / n);
      }
    for (let k = 0; k < grown.length; k += 4) {
      const i = grown[k];
      data[i * 4] = grown[k + 1];
      data[i * 4 + 1] = grown[k + 2];
      data[i * 4 + 2] = grown[k + 3];
      filled[i] = 1;
    }
  }
}

// ---- materials ----------------------------------------------------------------------------------------------------

/** Liquid blood: bright and translucent where thin, deep crimson where thick, with dark, matte clots. */
function bloodAlbedo(seed, clotty = true) {
  return (x, y, q, out) => {
    const body = smoothstep(0.04, 0.9, q);
    const n = fbm(x * 0.04, y * 0.04, seed + 3, 3);
    const clot = clotty ? smoothstep(0.6, 0.74, fbm(x * 0.075 + 9, y * 0.075, seed + 5, 3)) * smoothstep(0.35, 0.8, q) : 0;
    const tone = 0.86 + 0.28 * (1 - n);
    let r = lerp(240, 172, body) * tone;
    let g = lerp(36, 12, body) * tone;
    let b = lerp(44, 22, body) * tone;
    r = lerp(r, 84, clot);
    g = lerp(g, 3, clot);
    b = lerp(b, 8, clot);
    out[0] = r;
    out[1] = g;
    out[2] = b;
    out[3] = lerp(0.95, 0.22, clot);
  };
}

/** Raw meat: striated along `angle`, mottled, flecked with pale fat, and coated in blood towards its edges. */
function fleshAlbedo(seed, angle, raw = 0.5) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  return (x, y, q, out) => {
    const u = x * ca + y * sa;
    const v = -x * sa + y * ca;
    const fibre = vnoise(v * 0.5, u * 0.06, seed);
    const mottle = fbm(x * 0.045, y * 0.045, seed + 2, 3);
    const t = clamp01((0.5 * fibre + 0.5 * mottle) * (0.7 + raw * 0.6));
    let r = lerp(88, 182, t);
    let g = lerp(8, 36, t);
    let b = lerp(12, 42, t);
    const fat = smoothstep(0.8, 0.9, vnoise(x * 0.14, y * 0.14, seed + 4)) * smoothstep(0.25, 0.6, q);
    r = lerp(r, 232, fat * 0.8);
    g = lerp(g, 172, fat * 0.8);
    b = lerp(b, 140, fat * 0.8);
    const coat = (1 - smoothstep(0, 0.45, q)) * 0.6;
    r = lerp(r, 128, coat);
    g = lerp(g, 8, coat);
    b = lerp(b, 16, coat);
    out[0] = r;
    out[1] = g;
    out[2] = b;
    out[3] = lerp(0.82, 0.55, fat);
  };
}

/** Bone: ivory, stained with blood where it was torn from the flesh, with a darker marrow at a broken end. */
function boneAlbedo(seed, stain = 0.35) {
  return (x, y, q, out) => {
    const grain = fbm(x * 0.08, y * 0.08, seed, 3);
    let r = lerp(212, 246, grain);
    let g = lerp(190, 226, grain);
    let b = lerp(158, 196, grain);
    const blood = clamp01((1 - smoothstep(0, 0.6, q)) * 0.8 + stain * (fbm(x * 0.05, y * 0.05, seed + 8, 3) - 0.35));
    r = lerp(r, 150, blood);
    g = lerp(g, 22, blood);
    b = lerp(b, 28, blood);
    out[0] = r;
    out[1] = g;
    out[2] = b;
    out[3] = 0.42;
  };
}

const flat = (r, g, b, gloss) => (x, y, q, out) => {
  out[0] = r;
  out[1] = g;
  out[2] = b;
  out[3] = gloss;
};

// ---- splatters ----------------------------------------------------------------------------------------------------

/**
 * A burst of blood: a pool of fused lobes, tapered rays running out of it, each often ending in a comet-shaped droplet,
 * flung beads beyond, and a fine mist of specks. `down` stretches what falls towards the bottom of the picture (for walls).
 */
function splatter(rnd, { seed, radius, rays, reach, down = 0, clots = true, lift = 7 }) {
  const paint = new Paint();
  const soft = [circle(C, C, radius)];
  const lobes = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < lobes; i++) {
    const a = rnd() * TWO_PI;
    const o = radius * (0.35 + rnd() * 0.45);
    soft.push(circle(C + Math.cos(a) * o, C + Math.sin(a) * o, radius * (0.55 + rnd() * 0.3)));
  }
  const hard = [];
  const limit = 53;
  const stretchAngle = rnd() * TWO_PI;
  for (let i = 0; i < rays; i++) {
    const a = ((i + rnd() * 0.8) / rays) * TWO_PI;
    const pull = 1 + 0.45 * Math.max(0, Math.cos(a - stretchAngle)) + (Math.sin(a) > 0 ? down : 0);
    let tip = (radius * (0.45 + rnd() * 0.9) + reach * (0.35 + rnd() * 0.65)) * pull;
    tip = Math.min(tip + radius * 0.6, limit - 5);
    const r0 = Math.min(radius * 0.34, 2.4 + rnd() * 3.4);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    soft.push(element(C + ca * radius * 0.45, C + sa * radius * 0.45, C + ca * tip, C + sa * tip, r0, 0.8 + rnd() * 0.5));
    if (rnd() < 0.78) {
      const gap = 2.4 + rnd() * 3.5;
      const dr = 1.5 + rnd() * 2.2;
      const dist = tip + gap;
      if (dist + dr < limit + 4)
        hard.push(element(C + ca * dist, C + sa * dist, C + ca * (dist + dr * 1.3), C + sa * (dist + dr * 1.3), dr, dr * 0.75));
    }
  }
  const beads = 3 + Math.floor(rnd() * 4);
  for (let i = 0; i < beads; i++) {
    const a = rnd() * TWO_PI;
    const dist = Math.min(limit - 3, radius + 10 + rnd() * (limit - radius - 12));
    const r = 1.8 + rnd() * 2.6;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const long = rnd() < 0.4 ? 3 + rnd() * 5 : 0;
    hard.push(element(C + ca * dist, C + sa * dist, C + ca * (dist + long), C + sa * (dist + long) + (sa > 0 ? down * 3 : 0), r, r * 0.8));
  }
  for (let i = 0; i < 34; i++) {
    const a = rnd() * TWO_PI;
    const dist = radius * 0.9 + Math.pow(rnd(), 1.4) * (limit - radius * 0.9 - 2);
    hard.push(circle(C + Math.cos(a) * dist, C + Math.sin(a) * dist, 0.7 + rnd() * 1.3));
  }
  paint.shape(ragged(fused(soft, 4.5, hard), seed, 4.2, 1.0), {
    lift,
    bevel: 11,
    albedo: bloodAlbedo(seed, clots),
    bump: (x, y) => (fbm(x * 0.05, y * 0.05, seed + 9, 3) - 0.5) * 3.4,
  });
  const pixels = paint.finalize();
  return { pixels, layers: paint.layers };
}

/** A floor splat as { pixels, layers }: the lit picture, and the height, coverage, colour and gloss it was lit from. */
export function paintFloorSplatCell(variant, rnd) {
  return splatter(rnd, { seed: 101 + variant * 13, radius: (4.5 + (variant % 3) * 1.6 + rnd()) * 4, rays: 8 + Math.floor(rnd() * 5) + (variant > 3 ? 2 : 0), reach: 26 });
}

/** A wall splat as { pixels, layers }. */
export function paintWallSplatCell(variant, rnd) {
  return splatter(rnd, { seed: 401 + variant * 13, radius: (3.2 + (variant % 2) * 1.2 + rnd()) * 4, rays: 9 + Math.floor(rnd() * 6), reach: 22, down: 0.35, lift: 5.5 });
}

// ---- footprints ---------------------------------------------------------------------------------------------------

export function paintPrint(filled) {
  const at = ([x, y]) => [C + x * PRINT_UNIT, C + y * PRINT_UNIT];
  const heel = polygon(HEEL.map(at));
  const fore = polygon(FOREFOOT.map(at));
  const sole = (x, y) => smin(heel(x, y), fore(x, y), 2.5);
  const seed = filled ? 61 : 73;
  const paint = new Paint();
  if (filled) {
    const slits = [0.4, 2.2, 3.9].map((u) => C + u * PRINT_UNIT);
    paint.shape(
      (x, y) => {
        let d = sole(x, y) + (fbm(x * 0.07, y * 0.07, seed, 3) - 0.5) * 7 + (vnoise(x * 0.3, y * 0.3, seed + 2) - 0.5) * 1.6;
        if (d < 0 && vnoise(x * 0.11, y * 0.11, seed + 6) > 0.42)
          for (const sx of slits)
            d = Math.max(d, 1.05 - Math.abs(x - sx) - Math.abs(y - C) * 0.03);
        return d;
      },
      {
        lift: 4,
        bevel: 5,
        albedo: bloodAlbedo(seed, false),
        bump: (x, y) => (fbm(x * 0.06, y * 0.06, seed + 9, 3) - 0.5) * 1.6,
      }
    );
  } else {
    paint.shape(
      (x, y) => {
        const ring = Math.abs(sole(x, y) + 3.6) - 1.8;
        const gap = (0.4 - vnoise(x * 0.06, y * 0.06, seed)) * 22;
        return Math.max(ring, gap) + (vnoise(x * 0.35, y * 0.35, seed + 2) - 0.5) * 1.1;
      },
      { lift: 3, bevel: 2.2, albedo: bloodAlbedo(seed, false) }
    );
  }
  return paint.finalize();
}

// ---- droplets -----------------------------------------------------------------------------------------------------

/** A flung droplet seen face on: a glossy bead of blood with a window-light glint, and two small beads beside it. */
export function paintDrop() {
  const paint = new Paint();
  const field = fused([], 1, [element(C - 3, C - 2, C + 3, C + 2, 31, 30), circle(C + 33, C - 22, 9.5), circle(C - 30, C + 28, 7.5), circle(C + 28, C + 31, 5)]);
  paint.shape(field, {
    lift: 26,
    dome: (x, y, depth) => sphere(30)(x, y, depth),
    albedo: (x, y, q, out) => {
      const body = smoothstep(0.0, 0.7, q);
      out[0] = lerp(236, 160, body);
      out[1] = lerp(34, 11, body);
      out[2] = lerp(42, 20, body);
      out[3] = 1;
    },
  });
  return paint.finalize();
}

// ---- drips --------------------------------------------------------------------------------------------------------

/** A cylinder of running blood seen from the front: lit down one side, with a bright wet stripe. */
function cylinder(hw) {
  return (x, y, depth) => {
    const u = clamp01(depth / hw);
    return Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u)));
  };
}

function runAlbedo(seed) {
  return (x, y, q, out) => {
    const body = smoothstep(0.0, 0.8, q);
    const tone = 0.88 + 0.26 * (1 - periodic(x, y, 0.05, 3, seed));
    out[0] = lerp(236, 168, body) * tone;
    out[1] = lerp(34, 12, body) * tone;
    out[2] = lerp(42, 22, body) * tone;
    out[3] = 0.95;
  };
}

const wrapDistance = (a, b) => {
  const d = Math.abs(a - b) % N;
  return Math.min(d, N - d);
};

/** The stems, as { pixels, layers }: running down the middle of their cell, and tiling exactly every N texels so a stem of any length is a stack. */
export function paintStem(kind) {
  const seed = 701 + kind * 29;
  const paint = new Paint();
  const wobble = (y, amp, fx = 1) => (periodic(0, y, 0, 4 * fx, seed + 3) - 0.5) * 2 * amp;
  const run = (centre, halfWidth, extra = null) => {
    const sdf = (x, y) => {
      const hw = halfWidth(y);
      return Math.abs(x - centre(y)) - hw;
    };
    paint.shape(extra ? extra(sdf) : sdf, {
      lift: 6.5,
      dome: (x, y, depth) => cylinder(Math.max(2, halfWidth(y)))(x, y, depth),
      albedo: runAlbedo(seed),
    });
  };
  if (kind === 0) {
    // a thread
    run((y) => C + wobble(y, 0.9), (y) => 3.7 + wobble(y, 0.5, 2));
  } else if (kind === 1) {
    // a ribbon: sleek and wet
    run((y) => C + wobble(y, 1), (y) => 7.4 + wobble(y, 0.9, 2));
  } else if (kind === 2) {
    // wavy
    run((y) => C + 6 * Math.sin((y / N) * TWO_PI), (y) => 4.6 + wobble(y, 0.5, 2));
  } else if (kind === 3) {
    // beaded: a thread with a bead of blood every so often
    const beads = [20, 64, 108];
    run((y) => C + wobble(y, 0.6), (y) => {
      let bead = 0;
      for (const b of beads) {
        const dy = wrapDistance(y, b) / 9;
        bead = Math.max(bead, Math.exp(-dy * dy));
      }
      return 3.2 + 5.8 * bead;
    });
  } else if (kind === 4) {
    // dry-brush: broad and broken, where the blood did not quite cover the steel
    run(
      (y) => C + wobble(y, 1.2),
      () => 8.2,
      (sdf) => (x, y) => {
        const gap = periodic(x, y, 0.16, 6, seed + 11, 3);
        const brokenAcross = periodic(x, y, 0.035, 7, seed + 17, 3);
        return Math.max(sdf(x, y) + (periodic(x, y, 0.1, 6, seed + 5) - 0.5) * 6, (0.46 - gap) * 14 + (0.33 - brokenAcross) * 40);
      }
    );
  } else {
    // a double: two thin threads side by side that never touch
    const a = (y) => C - 9.5 + wobble(y, 0.6);
    const b = (y) => C + 9.5 + wobble(y, 0.6, 2);
    const hw = (y) => 3.3 + wobble(y, 0.4, 2);
    paint.shape((x, y) => Math.abs(x - a(y)) - hw(y), { lift: 6, dome: (x, y, depth) => cylinder(hw(y))(x, y, depth), albedo: runAlbedo(seed) });
    paint.shape((x, y) => Math.abs(x - b(y)) - hw(y), { lift: 6, dome: (x, y, depth) => cylinder(hw(y))(x, y, depth), albedo: runAlbedo(seed + 1) });
  }
  const pixels = paint.finalize({ wrapY: true, fade: [true, false] });
  return { pixels, layers: paint.layers };
}

/** The ends of a drip, as { pixels, layers }: hanging from the top of their cell: a sliver, a slant, a needle and a frayed end. */
export function paintTip(kind) {
  const seed = 811 + kind * 23;
  const paint = new Paint();
  const height = TIP_HEIGHTS[kind] * SCALE;
  const albedo = runAlbedo(seed);
  if (kind === 3) {
    const threads = [[-7.5, 16], [-2.5, 24], [2.5, 28], [7.5, 12]];
    const soft = threads.map(([dx, len]) => element(C + dx * 0.55, -4, C + dx, len, 3.8, 0.8));
    soft.push(element(C - 8, -6, C + 8, -6, 7, 7));
    paint.shape(fused(soft, 3.5), { lift: 6, dome: cylinder(4.2), albedo });
  } else {
    const profile = (y) => {
      const t = clamp01(y / height);
      if (kind === 0)
        return t < 0.35 ? lerp(4, 5.8, t / 0.35) : 5.8 * Math.pow(1 - (t - 0.35) / 0.65, 0.62);
      if (kind === 1)
        return t < 0.3 ? lerp(4.2, 4.6, t / 0.3) : 4.6 * Math.pow(1 - (t - 0.3) / 0.7, 0.7);
      return 4.3 * Math.pow(1 - t, 0.9) + 0.35;
    };
    const lean = (y) => (kind === 1 ? 8 * Math.pow(clamp01(y / height), 1.6) : 0);
    paint.shape((x, y) => Math.max(Math.abs(x - C - lean(y)) - profile(y), y - height), {
      lift: 6.2,
      dome: (x, y, depth) => cylinder(Math.max(1.6, profile(y)))(x, y, depth),
      albedo,
    });
  }
  const pixels = paint.finalize({ fade: [true, false] });
  return { pixels, layers: paint.layers };
}

// ---- gibs ---------------------------------------------------------------------------------------------------------

/** A torn edge: a radius that wanders, with sharp little tears. */
function tornBlob(cx, cy, radius, seed, wander = 0.4, tear = 0.14) {
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const a = Math.atan2(dy, dx);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const r = radius * (0.78 + wander * fbm(ca * 1.6 + 4, sa * 1.6 + 4, seed, 3) + tear * (vnoise(a * 4.5 + 20, 3, seed + 7) - 0.5) * 2);
    return Math.sqrt(dx * dx + dy * dy) - r;
  };
}

/** A curve through three points as a chain of tapered capsules. */
function curve(p0, p1, p2, r0, r1, steps = 18) {
  const parts = [];
  const pt = (t) => [(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];
  for (let i = 0; i < steps; i++) {
    const a = pt(i / steps);
    const b = pt((i + 1) / steps);
    parts.push(element(a[0], a[1], b[0], b[1], lerp(r0, r1, i / steps), lerp(r0, r1, (i + 1) / steps)));
  }
  return fused(parts, 1.5);
}

function boneShape(paint, sdf, seed, { lift = 15, bevel = 5, stain = 0.35 } = {}) {
  paint.shape(sdf, {
    lift,
    bevel,
    stack: true,
    albedo: boneAlbedo(seed, stain),
    bump: (x, y) => (fbm(x * 0.09, y * 0.09, seed + 2, 3) - 0.5) * 1.8,
  });
}

function fleshShape(paint, sdf, seed, angle, { lift = 14, bevel = 12, raw = 0.5, stack = false } = {}) {
  paint.shape(sdf, {
    lift,
    bevel,
    stack,
    albedo: fleshAlbedo(seed, angle, raw),
    bump: (x, y) => {
      const u = x * Math.cos(angle) + y * Math.sin(angle);
      const v = -x * Math.sin(angle) + y * Math.cos(angle);
      return (vnoise(v * 0.45, u * 0.05, seed + 1) - 0.5) * 3.6 + (fbm(x * 0.05, y * 0.05, seed + 6, 3) - 0.5) * 2.4;
    },
  });
}

function bloodPool(paint, field, seed) {
  paint.shape(ragged(field, seed, 6.5, 1.2), { lift: 3.2, bevel: 7, albedo: bloodAlbedo(seed, true) });
}

/**
 * The five gibs of a gibbing:
 * 0: a torn chunk of striated muscle with bone sticking out of it
 * 1: a shattered ribcage: a spine and three curved ribs in gore
 * 2: a cracked jawbone with jagged teeth
 * 3: a ruptured eyeball with its trailing optic nerve
 * 4: a severed clawed limb: a mangled slab with a bone stump
 */
export function paintGib(variant, rnd) {
  const paint = new Paint();
  const seed = 900 + variant * 37;
  const angle = rnd() * TWO_PI;
  if (variant === 0) {
    bloodPool(paint, circle(C + 2, C + 3, 46), seed);
    fleshShape(paint, tornBlob(C, C, 38, seed, 0.5, 0.2), seed, angle, { raw: 0.6 });
    boneShape(paint, fused([element(C - 26, C - 12, C + 34, C + 14, 6.5, 4.6)], 1), seed + 40, { lift: 11, bevel: 5.5 });
    boneShape(paint, element(C - 24, C - 6, C + 30, C + 18, 2.2, 1.8), seed + 41, { lift: 4, bevel: 2, stain: 0.5 });
  } else if (variant === 1) {
    bloodPool(paint, fused([circle(C + 6, C + 2, 40), circle(C - 18, C + 20, 22)], 6), seed);
    fleshShape(paint, tornBlob(C + 2, C, 30, seed, 0.55, 0.2), seed, angle, { lift: 9, bevel: 9, raw: 0.4 });
    const vertebrae = [];
    for (let i = 0; i < 6; i++)
      vertebrae.push(element(24, 22 + i * 16.5, 25, 26 + i * 16.5, 9.5 - Math.abs(i - 2.5) * 0.5, 8.6 - Math.abs(i - 2.5) * 0.5));
    boneShape(paint, fused(vertebrae, 3), seed + 50, { lift: 13, bevel: 7 });
    for (const [y, sweep, drop] of [[34, 22, 4], [64, 30, 12], [94, 22, 20]]) {
      boneShape(paint, curve([30, y], [74, y - sweep], [112, y + drop], 5.2, 2.1), seed + 60 + y, { lift: 11, bevel: 4.6, stain: 0.5 });
    }
  } else if (variant === 2) {
    bloodPool(paint, circle(C + 2, C + 8, 44), seed);
    const jaw = polygon([[30, 42], [100, 36], [92, 66], [48, 92], [26, 72]]);
    fleshShape(paint, (x, y) => jaw(x, y) + 5 + (fbm(x * 0.06, y * 0.06, seed, 3) - 0.5) * 8, seed, angle, { lift: 9, bevel: 8, raw: 0.5 });
    boneShape(paint, (x, y) => jaw(x, y) + (fbm(x * 0.08, y * 0.08, seed + 3, 3) - 0.5) * 6, seed + 70, { lift: 13, bevel: 6, stain: 0.5 });
    for (const tx of [36, 52, 69, 86]) {
      const topY = 50 - (tx - 36) * 0.05;
      boneShape(paint, element(tx, topY, tx + 1, topY + 25, 4.6, 1.5), seed + 80 + tx, { lift: 9, bevel: 4.5, stain: 0.2 });
    }
  } else if (variant === 3) {
    bloodPool(paint, fused([circle(C - 6, C - 6, 42), circle(C + 22, C + 24, 18)], 6), seed);
    const nerve = curve([C + 10, C + 10], [C + 34, C + 22], [C + 52, C + 52], 6.5, 2.6, 22);
    fleshShape(paint, ragged(fused([circle(C - 6, C - 6, 31)], 1, [nerve]), seed + 1, 3.5, 1), seed, angle, { lift: 10, bevel: 9, raw: 0.75 });
    // the eye: a veined white ball, a muddy iris and a black pupil
    paint.shape(circle(C - 7, C - 7, 24), {
      lift: 21,
      dome: sphere(24),
      stack: true,
      albedo: (x, y, q, out) => {
        const vein = smoothstep(0.55, 0.62, 1 - Math.abs(fbm(x * 0.09, y * 0.09, seed + 12, 4) - 0.5) * 2) * (1 - q * 0.35);
        out[0] = lerp(236, 190, vein);
        out[1] = lerp(214, 40, vein);
        out[2] = lerp(204, 40, vein);
        out[3] = 0.95;
      },
    });
    paint.shape(circle(C - 11, C - 11, 11.5), {
      lift: 6,
      dome: sphere(11.5),
      stack: true,
      albedo: (x, y, q, out) => {
        const a = Math.atan2(y - (C - 11), x - (C - 11));
        const rays = 0.6 + 0.4 * vnoise(a * 4, 3, seed + 4);
        out[0] = lerp(70, 168, rays * (1 - q * 0.5));
        out[1] = lerp(26, 76, rays * (1 - q * 0.5));
        out[2] = lerp(18, 40, rays * (1 - q * 0.5));
        out[3] = 0.98;
      },
    });
    paint.shape(circle(C - 11, C - 11, 4.8), { lift: 3, bevel: 4.8, stack: true, albedo: flat(14, 0, 0, 1) });
  } else {
    bloodPool(paint, fused([circle(C - 2, C + 6, 44), circle(C + 28, C - 8, 14)], 6), seed);
    const claws = [[100, 28], [110, 58], [98, 92]];
    const palm = tornBlob(C - 2, C + 8, 29, seed, 0.5, 0.18);
    const fingers = claws.map(([tx, ty]) => element(C + 2, C + 4, tx - 6, ty + 2, 10, 5.2));
    fleshShape(paint, ragged(fused([palm, ...fingers], 6), seed + 2, 2.6, 0.8), seed, angle, { lift: 13, bevel: 11, raw: 0.55 });
    boneShape(paint, element(22, 94, C - 4, C + 4, 6.6, 4.4), seed + 90, { lift: 11, bevel: 5.2 });
    for (const [tx, ty] of claws) {
      const dx = tx - (C + 2);
      const dy = ty - (C + 4);
      const len = Math.hypot(dx, dy);
      const sx = C + 2 + dx * (0.78) - dy * 0.06;
      const sy = C + 4 + dy * 0.78 + dx * 0.06;
      boneShape(paint, element(sx, sy, tx + (dx / len) * 12, ty + (dy / len) * 12, 4, 0.9), seed + tx, { lift: 8, bevel: 3.6, stain: 0.6 });
      paint.shape(circle(tx - (dx / len) * 6, ty - (dy / len) * 6, 4.4), { lift: 4, bevel: 3, stack: true, albedo: bloodAlbedo(seed + ty, false) });
    }
  }
  return paint.finalize();
}
