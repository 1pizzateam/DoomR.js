/**
 * Flat 2D sprites for the monsters that are not line meshes.
 *
 * A sprite is a small pixel image drawn here, in code, so there are no image files. Every pixel carries two things
 * in its channels: red is how bright it is (0 is the background colour, 1 the full colour of the monster) and green
 * marks the glowing eyes, which the shader flares as the monster gets angrier, and blue marks flesh, drawn in red
 * instead of the monster's own colour. Alpha is 0 outside the shape.
 * The frames sit side by side in one atlas; the world draws one of them on an upright quad that always faces you.
 */

const WRAITH_WIDTH = 32;
const WRAITH_HEIGHT = 48;
// the last five frames are its death: it is flung back, folds in on itself, slumps, and what is left drifts off as embers
// and when it is killed from close range it bursts instead: it swells, splits open, and what it is made of flies apart
export const WRAITH_FRAMES = { idleA: 0, idleB: 1, attack: 2, pain: 3, dying: [4, 5, 6, 7, 8], bursting: [9, 10, 11, 12, 13, 14] };
const WRAITH_FRAME_COUNT = 15;
// each frame is drawn on a 32 x 48 grid, then set at the bottom middle of a larger cell, which leaves room for what flies off
const CELL_WIDTH = 48;
const CELL_HEIGHT = 64;

function grid(width, height) {
  return { width, height, cells: new Uint8Array(width * height) };
}

function at(mask, x, y) {
  return x >= 0 && y >= 0 && x < mask.width && y < mask.height ? mask.cells[y * mask.width + x] : 0;
}

function put(mask, x, y) {
  if (x >= 0 && y >= 0 && x < mask.width && y < mask.height)
    mask.cells[y * mask.width + x] = 1;
}

function disc(mask, cx, cy, radius) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius)
        put(mask, x, y);
    }
  }
}

/** A thick line that thins out along its length: a sleeve, or a claw. */
function stroke(mask, x0, y0, x1, y1, from, to) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    disc(mask, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, from + (to - from) * k);
  }
}

/**
 * One pose of the hooded wraith, as a grid of [brightness, eye] pairs.
 * `sway` ripples the hem, `hand` is where each hand ends up (mirrored for the other arm, as an offset from the
 * middle), `claws` is the direction the fingers point (radians, 0 is straight down), `maw` opens the hood's void.
 */
function drawWraith({ sway, hand, claws, maw, lean }) {
  const W = WRAITH_WIDTH;
  const H = WRAITH_HEIGHT;
  const mid = (W - 1) / 2;
  const robe = grid(W, H);
  const sleeves = grid(W, H);
  const hood = grid(W, H);
  const hollow = grid(W, H);
  const eyes = grid(W, H);

  // the hood: round on top, pinched at the neck
  for (let y = 0; y < H; y++) {
    const shift = lean * Math.max(0, 1 - y / 26);
    let half = 0;
    if (y <= 10)
      half = 8 * Math.sqrt(Math.max(0, 1 - ((y - 10) / 10.5) ** 2));
    else if (y <= 17)
      half = 8 - (y - 10) * 0.35;
    else
      half = 5.6 + (y - 17) * 0.32;
    // the hem is ragged and drifts from side to side as it floats
    const hem = H - 6;
    for (let x = 0; x < W; x++) {
      const dx = x - mid - shift;
      if (Math.abs(dx) > half)
        continue;
      const ragged = hem + 3 * Math.sin(x * 0.95 + sway) + 1.5 * Math.sin(x * 2.3 - sway * 1.3);
      if (y <= ragged)
        (y <= 15 ? hood : robe).cells[y * W + x] = 1;
    }
  }
  for (let i = 0; i < hood.cells.length; i++)
    robe.cells[i] |= hood.cells[i];

  // the face: a dark hollow with two coals in it
  const faceY = 9;
  const faceX = mid + lean * 0.7;
  const rx = 4.6 + maw * 0.8;
  const ry = 5.6 + maw * 2.2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (((x - faceX) / rx) ** 2 + ((y - faceY - maw) / ry) ** 2 <= 1)
        hollow.cells[y * W + x] = 1;
    }
  }
  for (const side of [-1, 1]) {
    const ex = Math.round(faceX + side * 2.4 - (side < 0 ? 1 : 0));
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [side > 0 ? 1 : -1, -1]])
      put(eyes, ex + dx, faceY - 1 + dy);
  }

  // sleeves and claws
  for (const side of [-1, 1]) {
    const sx = mid + side * 6;
    const sy = 19;
    const hx = mid + side * hand[0] + lean * 0.5;
    const hy = hand[1];
    stroke(sleeves, sx, sy, hx, hy, 2.6, 1.5);
    for (const spread of [-0.55, 0, 0.55]) {
      const angle = claws + spread * side;
      stroke(sleeves, hx, hy, hx + Math.sin(angle) * 5 * side, hy + Math.cos(angle) * 5, 0.7, 0.2);
    }
  }

  const body = (x, y) => at(robe, x, y) || at(sleeves, x, y);
  const cells = new Uint8Array(W * H * 2);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!body(x, y))
        continue;
      const edge = !body(x - 1, y) || !body(x + 1, y) || !body(x, y - 1) || !body(x, y + 1);
      const sleeve = at(sleeves, x, y);
      const seam = sleeve && (!at(sleeves, x - 1, y) || !at(sleeves, x + 1, y) || !at(sleeves, x, y - 1) || !at(sleeves, x, y + 1));
      let light;
      if (edge) {
        light = 1;
      } else if (at(eyes, x, y)) {
        light = 1;
      } else if (at(hollow, x, y)) {
        // the rim of the hollow glows faintly, the inside is as dark as the background
        const rim = !at(hollow, x - 1, y) || !at(hollow, x + 1, y) || !at(hollow, x, y - 1) || !at(hollow, x, y + 1);
        light = rim ? 0.55 : 0;
      } else if (seam) {
        light = 0.6;
      } else if (sleeve) {
        light = (x + y) % 2 ? 0.26 : 0.1;
      } else {
        // folds of cloth: long vertical creases that wander, with a dither between them
        const fold = Math.sin((x - mid) * 0.9 + y * 0.12 + sway * 0.4);
        light = fold > 0.72 ? 0.42 : (x + y) % 2 ? 0.2 : 0.07;
      }
      cells[(y * W + x) * 2] = Math.round(light * 255);
      cells[(y * W + x) * 2 + 1] = at(eyes, x, y) ? 255 : 1;
    }
  }
  return cells;
}

/** A cheap, repeatable hash of a pixel, 0..1, so the same frame always dissolves the same way. */
function noise(x, y, salt) {
  let h = Math.imul(x * 374761393 + y * 668265263 + salt * 1274126177, 1103515245);
  h ^= h >>> 13;
  return ((Math.imul(h, 1274126177) >>> 0) % 1024) / 1024;
}

/**
 * One step of the death: the drawn pose is squashed towards the floor and spread a little, pixels fall out of it
 * from the top down, the eyes go out, and embers rise above what is left.
 */
function collapse(cells, { squash, widen, dissolve, eyes, embers }, salt) {
  const W = WRAITH_WIDTH;
  const H = WRAITH_HEIGHT;
  const mid = (W - 1) / 2;
  const out = new Uint8Array(W * H * 2);
  for (let y = 0; y < H; y++) {
    const sy = Math.round(H - 1 - (H - 1 - y) / squash);
    if (sy < 0)
      continue;
    const top = 1 - (H - 1 - y) / (H * squash);
    for (let x = 0; x < W; x++) {
      const sx = Math.round(mid + (x - mid) / widen);
      if (sx < 0 || sx >= W)
        continue;
      const i = (sy * W + sx) * 2;
      if (!cells[i + 1])
        continue;
      if (noise(x, y, salt) < dissolve * (0.55 + 0.45 * Math.max(0, top)))
        continue;
      const eye = cells[i + 1] === 255 && eyes;
      out[(y * W + x) * 2] = eye ? 255 : cells[i + 1] === 255 ? 90 : cells[i];
      out[(y * W + x) * 2 + 1] = eye ? 255 : 1;
    }
  }
  // embers climb off the remains, one pixel each, brightest the nearer they are
  for (let k = 0; k < embers; k++) {
    const x = Math.floor(2 + noise(k, 7, salt) * (W - 4));
    const y = Math.floor(H - 6 - noise(k, 11, salt) * (H * (0.25 + 0.12 * salt)));
    if (y >= 0 && !out[(y * W + x) * 2 + 1]) {
      out[(y * W + x) * 2] = Math.round(255 * (0.45 + 0.55 * noise(k, 13, salt)));
      out[(y * W + x) * 2 + 1] = 1;
    }
  }
  return out;
}

/** Sets a frame drawn on the 32 x 48 grid at the bottom middle of the larger cell. */
function embed(cells) {
  const out = new Uint8Array(CELL_WIDTH * CELL_HEIGHT * 2);
  const left = (CELL_WIDTH - WRAITH_WIDTH) / 2;
  const top = CELL_HEIGHT - WRAITH_HEIGHT;
  for (let y = 0; y < WRAITH_HEIGHT; y++) {
    for (let x = 0; x < WRAITH_WIDTH; x++) {
      const from = (y * WRAITH_WIDTH + x) * 2;
      const to = ((y + top) * CELL_WIDTH + x + left) * 2;
      out[to] = cells[from];
      out[to + 1] = cells[from + 1];
    }
  }
  return out;
}

/**
 * One step of the burst: the pose swells and cracks open with red, then it is cut into chunks that fly out from the
 * middle of the body and fall, about a third of them turned to red meat. A red core blooms where it was, throwing
 * droplets, and at the end what is left thins out.
 */
function burst(source, { t, swell = 1, cracks = false, core = 0, dissolve = 0, eyes = true }, salt) {
  const W = CELL_WIDTH;
  const H = CELL_HEIGHT;
  const cx = (W - 1) / 2;
  const cy = H - 26;
  const out = new Uint8Array(W * H * 2);
  const put = (x, y, light, flag, over = true) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H)
      return;
    const i = (y * W + x) * 2;
    if (!over && out[i + 1])
      return;
    out[i] = light;
    out[i + 1] = flag;
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 2;
      const flag = source[i + 1];
      if (!flag || noise(x, y, salt) < dissolve)
        continue;
      // chunks are blocks of about 5 pixels in rows that are staggered, so they do not look like a grid
      const bx = Math.floor((x + (Math.floor(y / 5) % 2) * 2) / 5);
      const by = Math.floor(y / 5);
      const dx = bx * 5 + 2.5 - cx;
      const dy = by * 5 + 2.5 - cy;
      const length = Math.hypot(dx, dy) || 1;
      const speed = 14 + 26 * noise(bx, by, 1);
      const vx = (dx / length) * speed + (noise(bx, by, 2) - 0.5) * 10;
      const vy = (dy / length) * speed - 10 - 12 * noise(bx, by, 3);
      const meat = t > 0 && noise(bx, by, 4) < 0.4;
      const eye = flag === 255 && eyes && t < 0.6;
      const light = eye ? 255 : flag === 255 ? 90 : meat ? Math.max(source[i], 140) : source[i];
      put(cx + (x - cx) * swell + vx * t, cy + (y - cy) * swell + vy * t + 45 * t * t, light, eye ? 255 : meat ? 2 : 1);
    }
  }

  // before it goes, the body splits: red lines run out of its middle
  if (cracks) {
    for (let k = 0; k < 7; k++) {
      const angle = (k / 7) * Math.PI * 2 + noise(k, 5, salt) * 0.6;
      const reach = 8 + noise(k, 6, salt) * 12;
      for (let d = 2; d < reach; d += 0.7)
        put(cx + Math.cos(angle) * d, cy + Math.sin(angle) * d * 1.2, 255, 2);
    }
  }

  if (core > 0) {
    const radius = 3 + 15 * Math.min(1, t * 1.6);
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        const d = Math.hypot(x - cx, (y - cy) * 0.85) / radius;
        if (d <= 1 && noise(x, y, salt + 9) < core * (1.15 - d))
          put(x, y, Math.round(255 * (0.4 + 0.6 * noise(x, y, salt + 3))), 2);
      }
    }
    // droplets thrown out of it, some trailing a second pixel behind them
    for (let k = 0; k < 10 + Math.round(24 * core); k++) {
      const angle = noise(k, 21, salt) * Math.PI * 2;
      const speed = 18 + 46 * noise(k, 22, salt);
      const x = cx + Math.cos(angle) * speed * t;
      const y = cy + Math.sin(angle) * speed * t * 0.9 - 14 * t + 45 * t * t * noise(k, 23, salt);
      put(x, y, 255, 2, false);
      if (noise(k, 24, salt) < 0.5)
        put(x - Math.cos(angle) * 1.5, y - Math.sin(angle) * 1.5, 150, 2, false);
    }
  }
  return out;
}

/** The wraith: a hooded, floating thing that drifts, rakes with its claws and wails. */
export function wraithAtlas() {
  const poses = [
    { sway: 0, hand: [14, 34], claws: 0.5, maw: 0, lean: 0 },
    { sway: Math.PI, hand: [14, 31], claws: 0.8, maw: 0.1, lean: 0 },
    { sway: 1.2, hand: [13, 9], claws: 3.0, maw: 1, lean: 0 },
    { sway: 2.4, hand: [4, 13], claws: 2.6, maw: 0.5, lean: 2 },
  ];
  // flung back with its arms up and its mouth wide: the start of the death
  const flung = drawWraith({ sway: 2, hand: [14, 12], claws: 2.8, maw: 1, lean: 3 });
  const steps = [
    { squash: 1, widen: 1, dissolve: 0, eyes: true, embers: 0 },
    { squash: 0.78, widen: 1.08, dissolve: 0.05, eyes: true, embers: 3 },
    { squash: 0.5, widen: 1.18, dissolve: 0.22, eyes: false, embers: 6 },
    { squash: 0.26, widen: 1.25, dissolve: 0.5, eyes: false, embers: 8 },
    { squash: 0.12, widen: 1.25, dissolve: 0.8, eyes: false, embers: 9 },
  ];
  // blown apart: it throws its arms up and opens its mouth wide, then goes
  const bursts = [
    { t: 0, swell: 1.16, cracks: true },
    { t: 0.12, swell: 1.06, core: 0.35 },
    { t: 0.28, core: 0.7 },
    { t: 0.5, core: 1 },
    { t: 0.78, core: 0.8, dissolve: 0.3, eyes: false },
    { t: 1.1, core: 0.45, dissolve: 0.6, eyes: false },
  ];
  const width = CELL_WIDTH * WRAITH_FRAME_COUNT;
  const height = CELL_HEIGHT;
  const data = new Uint8Array(width * height * 4);
  const open = embed(drawWraith(poses[2]));
  const frames = [
    ...poses.map((pose) => embed(drawWraith(pose))),
    ...steps.map((step, i) => embed(collapse(flung, step, i + 1))),
    ...bursts.map((step, i) => burst(open, step, i + 1)),
  ];
  frames.forEach((cells, frame) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < CELL_WIDTH; x++) {
        const i = (y * CELL_WIDTH + x) * 2;
        const o = (y * width + frame * CELL_WIDTH + x) * 4;
        data[o] = cells[i];
        data[o + 1] = cells[i + 1] === 255 ? 255 : 0;
        data[o + 2] = cells[i + 1] === 2 ? 255 : 0;
        data[o + 3] = cells[i + 1] > 0 ? 255 : 0;
      }
    }
  });
  return { name: 'wraith', data, width, height, cell: CELL_WIDTH, frames: WRAITH_FRAME_COUNT };
}
