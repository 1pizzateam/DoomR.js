import { mulberry32 } from './rng.js';

/**
 * Blood as 2D sprites: one small pixel-art atlas, drawn here in code like the wraith's, and the functions that
 * place a cell of it in the world: flat on the floor, flat on a wall, or facing the camera. They only compute
 * corners and texture coordinates, so they stay headless and tested; the world puts them in a RoostR mesh.
 *
 * The atlas is a single row of 32 x 32 cells: floor splats, wall splats, footprints, droplets, gibs, and the stems and tips of drips.
 * Pixels are red already (brighter where the blood is fresher), so the mesh only has to dim them.
 */

export const CELL = 32;
export const FLOOR_VARIANTS = 6;
export const WALL_VARIANTS = 4;
export const GIB_VARIANTS = 5;
export const CELLS = {
  floor: 0,
  wall: FLOOR_VARIANTS,
  printFilled: FLOOR_VARIANTS + WALL_VARIANTS,
  printOutline: FLOOR_VARIANTS + WALL_VARIANTS + 1,
  drop: FLOOR_VARIANTS + WALL_VARIANTS + 2,
  gib: FLOOR_VARIANTS + WALL_VARIANTS + 3,
  dripStem: FLOOR_VARIANTS + WALL_VARIANTS + 3 + GIB_VARIANTS,
};
// the kinds of drip: how its stem looks and how it ends. The stems come first, then the tips.
export const STEM_KINDS = 6;
export const TIP_KINDS = 4;
CELLS.stems = CELLS.dripStem;
CELLS.tips = CELLS.stems + STEM_KINDS;
const CELL_COUNT = CELLS.tips + TIP_KINDS;

// marks stop this far short of the edge of a face, so none sits right on a corner
const EDGE = 0.3;
const RED = [232, 16, 44];
const BONE = [238, 172, 138];

class Canvas {
  constructor() {
    this.light = new Float32Array(CELL * CELL);
    this.bone = new Uint8Array(CELL * CELL);
  }

  put(x, y, light, isBone = 0) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < CELL && y < CELL && light > this.light[y * CELL + x]) {
      this.light[y * CELL + x] = light;
      this.bone[y * CELL + x] = isBone;
    }
  }

  /** Overwrites, for where an outline must stay dark inside a bright shape. */
  set(x, y, light, isBone = 0) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < CELL && y < CELL) {
      this.light[y * CELL + x] = light;
      this.bone[y * CELL + x] = isBone;
    }
  }

  line(x0, y0, x1, y1, light, isBone = 0) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5) || 1;
    for (let i = 0; i <= steps; i++)
      this.put(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, light, isBone);
  }

  /** A blob: dim inside, bright rim, optionally a bright highlight. */
  blob(cx, cy, radius, light = 0.9, isBone = 0) {
    for (let y = Math.floor(cy - radius - 1); y <= Math.ceil(cy + radius + 1); y++) {
      for (let x = Math.floor(cx - radius - 1); x <= Math.ceil(cx + radius + 1); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= radius - 0.9)
          this.put(x, y, (x + y) % 2 ? light * 0.36 : light * 0.24, isBone);
        else if (d <= radius + 0.2)
          this.put(x, y, light, isBone);
      }
    }
  }

  polygon(points, rim, fill, hatch = false) {
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
    if (fill > 0) {
      for (let y = 0; y < CELL; y++) {
        for (let x = 0; x < CELL; x++) {
          if (inside(x, y))
            this.put(x, y, hatch && x % 3 === 0 ? fill * 1.6 : (x + y) % 2 ? fill * 0.8 : fill * 0.55);
        }
      }
    }
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[(i + 1) % points.length];
      this.line(x0, y0, x1, y1, rim);
    }
  }
}

const mid = (CELL - 1) / 2;

/** A ragged pool with rays running out of it, and droplets that came off beyond their tips. */
function drawFloorSplat(c, variant, rnd) {
  const radius = 4.5 + (variant % 3) * 1.6 + rnd();
  const phase = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const edge = (angle) => radius * (0.78 + 0.16 * Math.sin(angle * 3 + phase[0]) + 0.12 * Math.sin(angle * 5 + phase[1]) + 0.1 * Math.sin(angle * 2 + phase[2]));
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const d = Math.hypot(x - mid, y - mid);
      const r = edge(Math.atan2(y - mid, x - mid));
      if (d <= r - 1)
        c.put(x, y, (x + y) % 2 ? 0.34 : 0.2);
      else if (d <= r + 0.3)
        c.put(x, y, 0.95);
    }
  }
  const rays = 6 + Math.floor(rnd() * 5) + (variant > 3 ? 2 : 0);
  for (let i = 0; i < rays; i++) {
    const angle = rnd() * Math.PI * 2;
    const from = edge(angle) * 0.6;
    const tip = radius + 2 + rnd() * 7;
    c.line(mid + Math.cos(angle) * from, mid + Math.sin(angle) * from, mid + Math.cos(angle) * tip, mid + Math.sin(angle) * tip, 0.85);
    if (rnd() < 0.7) {
      const beyond = tip + 1.5 + rnd() * 2;
      c.blob(mid + Math.cos(angle) * beyond, mid + Math.sin(angle) * beyond, 0.9 + rnd() * 0.8, 1);
    }
  }
  const drops = 2 + Math.floor(rnd() * 4);
  for (let i = 0; i < drops; i++) {
    const angle = rnd() * Math.PI * 2;
    const distance = radius + 5 + rnd() * 6;
    c.blob(mid + Math.cos(angle) * distance, mid + Math.sin(angle) * distance, 0.8 + rnd() * 1.1, 0.95);
  }
}

/** A splat on a wall: the burst only. Its drips are separate sprites that run down it (see `wallDripQuads`). */
function drawWallSplat(c, variant, rnd) {
  const cx = mid;
  const cy = mid;
  const radius = 3.2 + (variant % 2) * 1.2 + rnd();
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const d = Math.hypot((x - cx) * 0.9, (y - cy) * 1.1);
      const r = radius * (0.85 + 0.25 * Math.sin(Math.atan2(y - cy, x - cx) * 3 + variant));
      if (d <= r - 1)
        c.put(x, y, (x + y) % 2 ? 0.34 : 0.2);
      else if (d <= r + 0.3)
        c.put(x, y, 0.95);
    }
  }
  const rays = 7 + Math.floor(rnd() * 5);
  for (let i = 0; i < rays; i++) {
    const angle = rnd() * Math.PI * 2;
    const tip = radius + 2 + rnd() * 7;
    c.line(cx + Math.cos(angle) * radius * 0.6, cy + Math.sin(angle) * radius * 0.6, cx + Math.cos(angle) * tip, cy + Math.sin(angle) * tip, 0.85);
    if (rnd() < 0.5)
      c.blob(cx + Math.cos(angle) * (tip + 1.5), cy + Math.sin(angle) * (tip + 1.5), 0.8 + rnd() * 0.6, 1);
  }
}

// the shape of a shoe, in the units of printVertices, with the toe towards +x
const HEEL = [[-5.2, 0], [-4.6, -1.3], [-3.4, -1.6], [-2.4, -1.2], [-2.2, 0], [-2.4, 1.2], [-3.4, 1.6], [-4.6, 1.3]];
const FOREFOOT = [[-1, -1.6], [1, -2.3], [3.4, -2.4], [5, -1.4], [5.4, 0.2], [4.6, 1.8], [2.6, 2.6], [0.2, 2.4], [-1, 1.4]];
/** Pixels of the atlas per unit of printVertices' foot, so the foot fills about 24 of the 32 pixels. */
const PRINT_PIXELS = 2.26;

function drawPrint(c, filled) {
  const at = ([x, y]) => [mid + x * PRINT_PIXELS, mid + y * PRINT_PIXELS];
  for (const shape of [HEEL, FOREFOOT])
    c.polygon(shape.map(at), filled ? 0.95 : 0.8, filled ? 0.38 : 0);
  if (filled) {
    for (const x of [0.4, 2.2, 3.9]) {
      const [x0, y0] = at([x, -1.9]);
      const [x1, y1] = at([x, 1.9]);
      c.line(x0, y0, x1, y1, 0.85);
    }
  }
}

function drawDrop(c) {
  c.polygon(
    [
      [mid - 9, mid - 3],
      [mid - 4, mid - 10],
      [mid + 3, mid - 9],
      [mid + 10, mid - 4],
      [mid + 9, mid + 4],
      [mid + 3, mid + 10],
      [mid - 5, mid + 9],
      [mid - 10, mid + 3],
    ],
    0.98,
    0.72
  );
  c.blob(mid, mid, 6.2, 0.96, 0);
  c.blob(mid - 1.5, mid - 1.5, 3.8, 1.0, 0);
  c.line(mid - 12, mid - 5, mid + 12, mid + 5, 0.92, 0);
  c.line(mid - 6, mid + 12, mid + 7, mid - 12, 0.9, 0);
  c.blob(mid + 9, mid - 8, 2.8, 0.95, 0);
  c.blob(mid - 9, mid + 7, 2.6, 0.92, 0);
  c.blob(mid + 7, mid + 9, 2.4, 0.9, 0);
  c.blob(mid - 8, mid - 9, 2.2, 0.9, 0);
  c.put(mid - 2, mid - 2, 1, 0);
  c.put(mid - 1, mid - 2, 1, 0);
  c.put(mid - 2, mid - 1, 1, 0);
  c.put(mid - 1, mid - 1, 1, 0);
}

// A drip is a stem running down and a small tip at its end. The stems are drawn to repeat every 32 pixels top to bottom,
// in the middle 12 columns of their cell, so a stem of any length is a stack of them. The tips are 4 to 9 pixels tall, from the
// top of their cell, and narrow, pointed or ragged, never a round blob.
const STEM_FROM = 10;
const STEM_TO = 22;

/** Edge pixels are bright and the inside is darker and dithered, like the rest of the blood. */
function edged(c, x0, x1, y) {
  for (let x = x0; x <= x1; x++)
    c.put(x, y, x === x0 || x === x1 ? 0.95 : (x + y) % 2 ? 0.46 : 0.3);
}

const STEMS = [
  // a thread: two pixels wide
  (c) => {
    for (let y = 0; y < CELL; y++) {
      c.put(15, y, 0.9);
      c.put(16, y, y % 5 === 0 ? 0.3 : 0.55);
    }
  },
  // a ribbon: four wide, sleek and wet
  (c) => {
    for (let y = 0; y < CELL; y++)
      edged(c, 14, 17, y);
  },
  // wavy: two wide, swaying from side to side as it runs
  (c) => {
    for (let y = 0; y < CELL; y++) {
      const x = Math.round(15 + 1.5 * Math.sin((y / 32) * Math.PI * 2));
      edged(c, x, x + 1, y);
    }
  },
  // beaded: a thread with a small bead of blood every ten pixels or so
  (c) => {
    for (let y = 0; y < CELL; y++) {
      c.put(15, y, 0.9);
      c.put(16, y, 0.5);
    }
    for (const by of [5, 16, 27]) {
      for (let dy = -2; dy <= 2; dy++) {
        const half = dy === 0 ? 2 : 1;
        edged(c, 15 - half + 1, 16 + half - 1, by + dy);
      }
    }
  },
  // dry-brush: four wide and broken, where the blood did not quite cover the steel
  (c) => {
    for (let y = 0; y < CELL; y++) {
      for (let x = 14; x <= 17; x++) {
        const gap = ((y * 5 + x * 3) % 9) < 3 && x > 14 && x < 17;
        if (!gap)
          c.put(x, y, x === 14 || x === 17 ? 0.9 : (x + y) % 2 ? 0.5 : 0.32);
      }
    }
  },
  // a double: two thin threads side by side, joined here and there
  (c) => {
    for (let y = 0; y < CELL; y++) {
      c.put(14, y, 0.9);
      c.put(17, y, 0.9);
      if (y % 16 === 7 || y % 16 === 8) {
        for (let x = 15; x <= 16; x++)
          c.put(x, y, 0.55);
      }
    }
  },
];

// The ends of a drip, each a list of rows as [first column, width] from column 14, with the stem ending at the top.
const TIP_SHAPES = [
  // a sliver: a narrow teardrop with a point
  [[1, 2], [1, 2], [1, 3], [1, 3], [1, 2], [1, 2], [1, 1], [1, 1]],
  // a slant: leaning to one side as it dries
  [[1, 2], [1, 2], [1, 2], [2, 2], [2, 2], [2, 1]],
  // a needle: the stem simply thins to a point
  [[1, 2], [1, 2], [1, 2], [1, 2], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]],
  // frayed: handled apart, it splits into threads of different lengths
  null,
];

/** The height in pixels of each tip. */
export const TIP_HEIGHTS = [8, 6, 9, 7];

function drawTip(c, kind) {
  const shape = TIP_SHAPES[kind];
  if (shape) {
    shape.forEach(([from, width], row) => {
      for (let x = from; x < from + width; x++) {
        const edge = x === from || x === from + width - 1 || row === shape.length - 1;
        c.put(14 + x, row, edge ? 0.95 : (x + row) % 2 ? 0.46 : 0.3);
      }
    });
    return;
  }
  for (const [x, length] of [[14, 4], [15, 6], [16, 7], [17, 3]]) {
    for (let row = 0; row < length; row++)
      c.put(x, row, row === length - 1 ? 0.95 : x % 2 ? 0.55 : 0.8);
  }
}

/**
 * Five gruesome gib variants for XDeath carnage:
 * 0: Jagged torn chunk of striated muscle & protruding bone
 * 1: Shattered ribcage arc with 3 curved white ribs & bloody spine column
 * 2: Cracked demon skull / jawbone fragment with jagged teeth
 * 3: Ruptured organ / eyeball with trailing optic nerve & blood clots
 * 4: Severed clawed limb / mangled meat slab with bone stump
 */
function drawGib(c, variant, rnd) {
  if (variant === 0) {
    const points = [];
    const sides = 8;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const radius = 6.5 + rnd() * 6;
      points.push([mid + Math.cos(angle) * radius, mid + Math.sin(angle) * radius]);
    }
    c.polygon(points, 1, 0.45, true);
    c.line(mid - 5, mid - 2, mid + 6, mid + 3, 0.95, 1);
    c.line(mid - 5, mid - 1, mid + 6, mid + 4, 0.85, 1);
    c.line(mid - 2, mid + 4, mid + 4, mid - 4, 0.8);
  } else if (variant === 1) {
    // shattered ribcage with spine and 3 curved white ribs soaked in gore
    c.blob(mid, mid, 8.5, 0.88);
    for (let dy = -8; dy <= 8; dy++) {
      c.put(mid - 6, mid + dy, 0.96, 1);
      c.put(mid - 5, mid + dy, 0.88, 1);
    }
    for (const ry of [-6, 0, 6]) {
      for (let t = 0; t <= 14; t++) {
        const rx = mid - 5 + t;
        const y = mid + ry + Math.sin((t / 14) * Math.PI) * 2.4;
        c.put(rx, y, 0.96, 1);
        c.put(rx, y + 1, 0.82, 1);
      }
    }
  } else if (variant === 2) {
    // cracked demon jawbone / skull shard with jagged teeth
    c.blob(mid, mid + 1, 8.2, 0.86);
    c.polygon([[7, 10], [24, 9], [22, 16], [11, 22], [6, 17]], 0.96, 0.55);
    for (let x = 8; x <= 23; x++) {
      c.put(x, 10, 0.96, 1);
      c.put(x, 11, 0.9, 1);
      c.put(x, 12, 0.82, 1);
    }
    for (const tx of [9, 13, 17, 21]) {
      for (let ty = 13; ty <= 18; ty++) {
        c.put(tx, ty, 0.98, 1);
        if (ty < 17)
          c.put(tx + 1, ty, 0.85, 1);
      }
    }
  } else if (variant === 3) {
    // ruptured eyeball / organ with trailing arterial nerve cord
    c.blob(mid - 2, mid - 2, 7.2, 0.92);
    c.blob(mid - 2.5, mid - 2.5, 4.2, 0.96, 1);
    c.blob(mid - 3, mid - 3, 1.8, 0.45, 0);
    for (let i = 0; i <= 12; i++) {
      const tx = mid + 2 + i * 0.85;
      const ty = mid + 2 + i * 0.75 + Math.sin(i * 0.7) * 1.5;
      c.blob(tx, ty, Math.max(0.8, 2.4 - i * 0.14), 0.9);
    }
  } else {
    // severed clawed hand / mangled flesh chunk with protruding arm bone
    c.blob(mid - 1, mid + 2, 7.4, 0.88);
    for (let i = 0; i <= 8; i++) {
      c.put(6 + i, 23 - i, 0.96, 1);
      c.put(7 + i, 23 - i, 0.9, 1);
    }
    for (const [tx, ty] of [[25, 8], [27, 15], [24, 22]]) {
      c.line(mid, mid + 1, tx, ty, 0.96, 1);
      c.line(mid, mid + 2, tx - 1, ty, 0.86, 1);
      c.blob(tx, ty, 1.3, 0.95, 0);
    }
  }
}

let atlas = null;

/** The atlas as RGBA pixels, ready to be a texture. It is drawn once and shared. */
export function bloodAtlas() {
  if (atlas)
    return atlas;
  const width = CELL * CELL_COUNT;
  const height = CELL;
  const data = new Uint8Array(width * height * 4);
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    const c = new Canvas();
    const rnd = mulberry32(1000 + cell * 7919);
    if (cell < FLOOR_VARIANTS)
      drawFloorSplat(c, cell, rnd);
    else if (cell < CELLS.printFilled)
      drawWallSplat(c, cell - FLOOR_VARIANTS, rnd);
    else if (cell <= CELLS.printOutline)
      drawPrint(c, cell === CELLS.printFilled);
    else if (cell === CELLS.drop)
      drawDrop(c);
    else if (cell >= CELLS.stems && cell < CELLS.tips)
      STEMS[cell - CELLS.stems](c);
    else if (cell >= CELLS.tips)
      drawTip(c, cell - CELLS.tips);
    else
      drawGib(c, cell - CELLS.gib, rnd);
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const idx = y * CELL + x;
        const light = Math.min(1, c.light[idx]);
        const pal = c.bone[idx] ? BONE : RED;
        const o = (y * width + cell * CELL + x) * 4;
        data[o] = Math.round(pal[0] * light);
        data[o + 1] = Math.round(pal[1] * light);
        data[o + 2] = Math.round(pal[2] * light);
        data[o + 3] = light > 0 ? 255 : 0;
      }
    }
  }
  atlas = { name: 'blood', data, width, height, cell: CELL, frames: CELL_COUNT };
  return atlas;
}

/** Texture coordinates of a cell: [u0, v0, u1, v1], with v1 at the top of the image. */
export function cellUv(cell) {
  return [cell / CELL_COUNT, 0, (cell + 1) / CELL_COUNT, 1];
}

// A mark is a flat quad. Its corners come back as 12 numbers (bottom-left, bottom-right, top-right, top-left, in 3D)
// and its texture rectangle as [u0, v0, u1, v1]; null when nothing is left of it.

/** A splat on the floor, turned any way round. `size` is the splat's, and the quad is 3.2 times as wide. */
export function floorSplatQuad({ x, y, size, seed, height = 0.3 }) {
  const rnd = mulberry32(seed);
  const variant = Math.floor(rnd() * FLOOR_VARIANTS);
  const angle = rnd() * Math.PI * 2;
  const half = size * 1.6;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const at = (lx, ly) => [x + cos * lx - sin * ly, height, y + sin * lx + cos * ly];
  return { corners: [...at(-half, -half), ...at(half, -half), ...at(half, half), ...at(-half, half)], uv: cellUv(CELLS.floor + variant) };
}

/** A persistent chunk of meat, bone, skull, or organ resting on the floor after an XDeath gibbing. */
export function floorGibQuad({ x, y, size, variant = 0, angle = 0, height = 0.36 }) {
  const half = size;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const at = (lx, ly) => [x + cos * lx - sin * ly, height, y + sin * lx + cos * ly];
  return {
    corners: [...at(-half, -half), ...at(half, -half), ...at(half, half), ...at(-half, half)],
    uv: cellUv(CELLS.gib + ((variant >>> 0) % GIB_VARIANTS)),
  };
}

/**
 * A shoe print. `strength` picks a filled, hatched print or just an outline, and a left foot is a mirrored right one.
 * Like the line version it is about 10.6 * 1.8 * scale long.
 */
export function printQuad({ x, y, angle, side, strength, scale }) {
  const size = scale * 1.8 * (0.75 + 0.25 * Math.min(1, strength));
  const half = (CELL / 2) * (size / PRINT_PIXELS);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const offset = side * 0.3 * side * size;
  const at = (fx, fy) => [x + cos * fx - sin * (fy + offset), 0.32, y + sin * fx + cos * (fy + offset)];
  const [u0, v0, u1, v1] = cellUv(strength > 0.55 ? CELLS.printFilled : CELLS.printOutline);
  return {
    corners: [...at(-half, -half), ...at(half, -half), ...at(half, half), ...at(-half, half)],
    uv: side < 0 ? [u0, v1, u1, v0] : [u0, v0, u1, v1],
  };
}

/**
 * A splat on a wall face, with its drips running down. It is cut where it leaves the face (the face runs `lo` and
 * `hi` along its tangent, from the splat's height `z` and up to `top`), so none hangs in the air past a corner,
 * an opening or the top of the wall.
 */
export function wallSplatQuad({ x, y, z, nx, ny, size, top, seed, lo = -Infinity, hi = Infinity }) {
  const rnd = mulberry32(seed);
  const variant = Math.floor(rnd() * WALL_VARIANTS);
  const pixel = size / 10;
  // the splat is the whole 32 x 32 cell, centred on the hit
  const u0 = -16 * pixel;
  const u1 = 16 * pixel;
  const v0 = -16 * pixel;
  const v1 = 16 * pixel;
  const cu0 = Math.max(u0, lo + EDGE);
  const cu1 = Math.min(u1, hi - EDGE);
  const cv0 = Math.max(v0, 0.6 - z);
  const cv1 = Math.min(v1, top - 0.6 - z);
  if (cu0 >= cu1 || cv0 >= cv1)
    return null;
  const tx = -ny;
  const ty = nx;
  const at = (u, v) => [x + tx * u + nx * 0.4, z + v, y + ty * u + ny * 0.4];
  const [a0, b0, a1, b1] = cellUv(CELLS.wall + variant);
  const du = a1 - a0;
  return {
    corners: [...at(cu0, cv0), ...at(cu1, cv0), ...at(cu1, cv1), ...at(cu0, cv1)],
    // the cut takes the same share off the picture
    uv: [a0 + ((cu0 - u0) / (u1 - u0)) * du, b0 + ((cv0 - v0) / (v1 - v0)) * (b1 - b0), a0 + ((cu1 - u0) / (u1 - u0)) * du, b0 + ((cv1 - v0) / (v1 - v0)) * (b1 - b0)],
  };
}

// ---- drips ---------------------------------------------------------------------------------------------------------

const DRIP_SEED = 0x9e3779b9;

/**
 * The drips of a splat on a wall, worked out from its seed: where along it each one starts, how far it runs, when it
 * lets go and how long it takes, and what each one looks like. The same seed always gives the same drips, so the
 * simulation and the picture agree. They differ a lot: threads and ribbons, wavy, beaded, broken or doubled stems,
 * pointed, slanted, needle or frayed ends, stubs and long runs, and runs that slow, stutter or creep.
 */
export function wallDrips(seed, size) {
  const rnd = mulberry32((seed ^ DRIP_SEED) >>> 0);
  const count = (rnd() < 0.15 ? 1 : 2 + Math.floor(rnd() * 3)) + (size > 8 ? 1 : 0);
  const drips = [];
  for (let i = 0; i < count; i++) {
    const stub = rnd() < 0.25;
    drips.push({
      u: (rnd() - 0.5) * size * 1.1,
      length: stub ? 4 + rnd() * 6 : 9 + rnd() * (14 + size * 3),
      delay: rnd() * 1.1,
      duration: 1.8 + rnd() * 4.2,
      // units of the wall per pixel of the drip's picture: slender and proportional to the scaled-down splats
      pixel: (0.26 + size * 0.018) * (0.75 + rnd() * 0.55),
      stem: Math.floor(rnd() * STEM_KINDS),
      tip: Math.floor(rnd() * TIP_KINDS),
      profile: Math.floor(rnd() * 4),
    });
  }
  return drips;
}

/** How long, in seconds, until every drip of a splat has stopped. */
export function dripTime(seed, size) {
  return Math.max(...wallDrips(seed, size).map((d) => d.delay + d.duration));
}

/** How far a drip has run, 0..1, `t` of the way through its time: some slow steadily, some stutter, some creep. */
function progress(t, profile) {
  const ease = (x) => 1 - (1 - x) * (1 - x);
  if (profile === 0)
    return ease(t);
  if (profile === 1) {
    // it runs, stops, then runs again
    if (t < 0.3)
      return 0.5 * ease(t / 0.3);
    if (t < 0.55)
      return 0.5;
    return 0.5 + 0.5 * ease((t - 0.55) / 0.45);
  }
  if (profile === 2)
    return t * t * (3 - 2 * t);
  return 1 - (1 - t) ** 3;
}

/** A stem of any length is a stack of its 32-pixel picture: [from, to] along the drip, `part` of a picture each. */
function stack(top, bottom, segment) {
  const out = [];
  for (let y = top; y > bottom + 1e-6; y -= segment)
    out.push({ top: y, bottom: Math.max(bottom, y - segment), part: (y - Math.max(bottom, y - segment)) / segment });
  return out;
}

/** The part of a cell the drips use: its middle 12 columns. */
function columns(cell) {
  const [a0, , a1] = cellUv(cell);
  const share = (a1 - a0) / CELL;
  return [a0 + share * STEM_FROM, a0 + share * STEM_TO];
}

/**
 * The drips of a splat on a wall at the age it has now, as quads: a stem running down from the splat and a small tip at
 * its end. A drip starts fast and slows as the blood thickens, then stays where it stopped. They are cut where the face
 * ends and stop at the floor, like the splat itself. Each is `{ corners, uv }`.
 */
export function wallDripQuads({ x, y, z, nx, ny, size, top, seed, age = 0, lo = -Infinity, hi = Infinity }) {
  const out = [];
  const tx = -ny;
  const ty = nx;
  const at = (u, v) => [x + tx * u + nx * 0.45, z + v, y + ty * u + ny * 0.45];
  const quad = (u0, v0, u1, v1, uv) => out.push({ corners: [...at(u0, v0), ...at(u1, v0), ...at(u1, v1), ...at(u0, v1)], uv });
  const floor = 0.6 - z;
  const start = -size * 0.3;
  for (const drip of wallDrips(seed, size)) {
    const t = Math.min(1, (age - drip.delay) / drip.duration);
    if (t <= 0)
      continue;
    const px = drip.pixel;
    const half = ((STEM_TO - STEM_FROM) / 2) * px;
    if (drip.u - half < lo + EDGE || drip.u + half > hi - EDGE || start > top - 0.6 - z)
      continue;
    const tipHeight = TIP_HEIGHTS[drip.tip] * px;
    // the end of the stem, resting on the floor when it gets there
    const head = Math.max(floor + tipHeight - px, start - drip.length * progress(t, drip.profile));
    const [s0, s1] = columns(CELLS.stems + drip.stem);
    for (const part of stack(start, head + px, CELL * px))
      quad(drip.u - half, part.bottom, drip.u + half, part.top, [s0, 1 - part.part, s1, 1]);
    const [t0, t1] = columns(CELLS.tips + drip.tip);
    const rows = TIP_HEIGHTS[drip.tip] / CELL;
    quad(drip.u - half, head + px - tipHeight, drip.u + half, head + px, [t0, 1 - rows, t1, 1]);
  }
  return out;
}

/**
 * A droplet or a gib in the air: a square facing the camera, turned by `spin` in the view plane.
 * `right` and `up` are the camera's axes in the world.
 */
export function particleQuad({ x, y, z, gib, variant = 0, scale = 1, visualScale }, right, up, spin = 0) {
  const half = (gib ? 1.75 : 0.65) * (visualScale ?? scale);
  const cos = Math.cos(spin) * half;
  const sin = Math.sin(spin) * half;
  // the corner offsets, turned: (-1,-1), (1,-1), (1,1), (-1,1) in (right, up)
  const corner = (a, b) => {
    const r = a * cos - b * sin;
    const u = a * sin + b * cos;
    return [x + right[0] * r + up[0] * u, z + right[1] * r + up[1] * u, y + right[2] * r + up[2] * u];
  };
  const cell = gib ? CELLS.gib + ((variant >>> 0) % GIB_VARIANTS) : CELLS.drop;
  return { corners: [...corner(-1, -1), ...corner(1, -1), ...corner(1, 1), ...corner(-1, 1)], uv: cellUv(cell) };
}

/**
 * Blood on the player's view, as flat 2D quads in screen pixels: a starburst that grows out, and a drip that slides
 * down from it, all fading with `fade`. Each quad is `{ x0, y0, x1, y1, uv }`, y down. It is the same atlas as the
 * blood in the world, so the same red pixels are on the glass.
 */
export function screenSplatQuads({ x, y, size, age, drip, seed }, width, height, fade) {
  const rnd = mulberry32(seed);
  const grow = 1 - Math.pow(1 - Math.min(1, age * 7), 3);
  const half = size * (0.35 + 0.65 * grow) * 1.4;
  const cx = x * width;
  const cy = y * height;
  const quads = [{ x0: cx - half, y0: cy - half, x1: cx + half, y1: cy + half, uv: cellUv(CELLS.floor + Math.floor(rnd() * FLOOR_VARIANTS)), fade }];
  const run = drip * Math.min(1, age * 0.9);
  if (run > 4) {
    // the drip on the glass is the ribbon kind, with a slanted or pointed tip; slender screen-pixel scale
    const dx = cx + (rnd() - 0.5) * size * 0.4;
    const px = 0.55;
    const top = cy + size * 0.2;
    const half = ((STEM_TO - STEM_FROM) / 2) * px * 2;
    const [s0, s1] = columns(CELLS.stems + 1);
    const tip = rnd() < 0.5 ? 0 : 1;
    const [t0, t1] = columns(CELLS.tips + tip);
    for (const part of stack(0, -run, CELL * px * 2))
      quads.push({ x0: dx - half, y0: top - part.top, x1: dx + half, y1: top - part.bottom, uv: [s0, 1 - part.part, s1, 1], fade });
    const tipHeight = TIP_HEIGHTS[tip] * px * 2;
    quads.push({ x0: dx - half, y0: top + run - px * 2, x1: dx + half, y1: top + run - px * 2 + tipHeight, uv: [t0, 1 - TIP_HEIGHTS[tip] / CELL, t1, 1], fade });
  }
  return quads;
}
