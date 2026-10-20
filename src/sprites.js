/**
 * Flat 2D procedural horror sprites for every monster in the game.
 *
 * Every frame is drawn on a 32 x 48 anatomical grid and embedded into a 48 x 64 cell so wide claws, horns,
 * and flying gore have room to spread. Each pixel stores [R, G, B, flag]:
 * - flag === 0: transparent background
 * - flag === 1: multi-tone monster body (shroud, flayed muscle, necrotic hide, bone, ribs, fangs, bloodstains)
 * - flag === 2: arterial gore & viscera chunks (encoded with B = 255 for the shader's multi-tone gore ramp)
 * - flag === 255: glowing supernatural eyes / hell-cores (encoded with G = 255 so the shader flares with uGlare)
 */

import { Trigo, Vec2 } from '@1pizzateam/spock';

const WRAITH_WIDTH = 32;
const WRAITH_HEIGHT = 48;
// frames 0..3 are live poses (idleA, idleB, attack, pain); 4..8 are the 5-frame death; 9..14 are the 6-frame close-range gib burst
export const WRAITH_FRAMES = { idleA: 0, idleB: 1, attack: 2, pain: 3, dying: [4, 5, 6, 7, 8], bursting: [9, 10, 11, 12, 13, 14] };
export const MONSTER_FRAMES = WRAITH_FRAMES;
const WRAITH_FRAME_COUNT = 15;
const CELL_WIDTH = 48;
const CELL_HEIGHT = 64;
const scratchPt = new Vec2();

function grid(width, height) {
  return { width, height, cells: new Uint8Array(width * height) };
}

function at(mask, x, y) {
  return x >= 0 && y >= 0 && x < mask.width && y < mask.height ? mask.cells[y * mask.width + x] : 0;
}

function put(mask, x, y, val = 1) {
  if (x >= 0 && y >= 0 && x < mask.width && y < mask.height)
    mask.cells[y * mask.width + x] = val;
}

function disc(mask, cx, cy, radius, val = 1) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++)
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius)
        put(mask, x, y, val);
}

function ellipse(mask, cx, cy, rx, ry, val = 1) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1)
        put(mask, x, y, val);
}

/** A thick line that thins out along its length: a limb, horn, spine, or claw. */
function stroke(mask, x0, y0, x1, y1, from, to, val = 1) {
  const steps = Math.max(1, Math.ceil(scratchPt.setScalar(x1 - x0, y1 - y0).getMagnitude() * 2.2));
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    disc(mask, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, from + (to - from) * k, val);
  }
}

function setCell(cells, W, H, x, y, r, g, b, flag = 1) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H)
    return;
  const idx = (y * W + x) * 4;
  cells[idx] = r;
  cells[idx + 1] = flag === 255 ? 255 : Math.min(245, g);
  cells[idx + 2] = flag === 2 ? 255 : Math.min(245, b);
  cells[idx + 3] = flag;
}

/** A cheap, repeatable hash of a pixel, 0..1, so the same frame always dissolves or splatters the same way. */
function noise(x, y, salt) {
  let h = Math.imul(x * 374761393 + y * 668265263 + salt * 1274126177, 1103515245);
  h ^= h >>> 13;
  return ((Math.imul(h, 1274126177) >>> 0) % 1024) / 1024;
}

// =====================================================================================================================
// 1. THE WRAITH: Tattered necrotic shroud, skull-maw, exposed ribcage, and blood-drenched corpse claws
// =====================================================================================================================

function drawWraith({ sway, hand, claws, maw, lean }) {
  const W = WRAITH_WIDTH;
  const H = WRAITH_HEIGHT;
  const mid = (W - 1) / 2;
  const robe = grid(W, H);
  const sleeves = grid(W, H);
  const clawMask = grid(W, H);
  const clawTip = grid(W, H);
  const hood = grid(W, H);
  const hollow = grid(W, H);
  const eyes = grid(W, H);

  for (let y = 0; y < H; y++) {
    const shift = lean * Math.max(0, 1 - y / 26);
    let half = 0;
    if (y <= 10)
      half = 8 * Math.sqrt(Math.max(0, 1 - ((y - 10) / 10.5) ** 2));
    else if (y <= 17)
      half = 8 - (y - 10) * 0.35;
    else
      half = 5.6 + (y - 17) * 0.32;
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

  const faceY = 9;
  const faceX = mid + lean * 0.7;
  const rx = 4.6 + maw * 0.8;
  const ry = 5.6 + maw * 2.2;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (((x - faceX) / rx) ** 2 + ((y - faceY - maw) / ry) ** 2 <= 1)
        hollow.cells[y * W + x] = 1;
  for (const side of [-1, 1]) {
    const ex = Math.round(faceX + side * 2.4 - (side < 0 ? 1 : 0));
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [side > 0 ? 1 : -1, -1]])
      put(eyes, ex + dx, faceY - 1 + dy);
  }

  for (const side of [-1, 1]) {
    const sx = mid + side * 6;
    const sy = 19;
    const hx = mid + side * hand[0] + lean * 0.5;
    const hy = hand[1];
    stroke(sleeves, sx, sy, hx, hy, 2.6, 1.5);
    for (const spread of [-0.55, 0, 0.55]) {
      const angle = claws + spread * side;
      const tx = hx + Math.sin(angle) * 5 * side;
      const ty = hy + Math.cos(angle) * 5;
      stroke(clawMask, hx, hy, tx, ty, 0.7, 0.2);
      stroke(clawTip, hx + (tx - hx) * 0.5, hy + (ty - hy) * 0.5, tx, ty, 0.55, 0.2);
    }
  }

  const body = (x, y) => at(robe, x, y) || at(sleeves, x, y) || at(clawMask, x, y);
  const cells = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const shift = lean * Math.max(0, 1 - y / 26);
    const center = mid + shift;
    const hem = H - 6;
    for (let x = 0; x < W; x++) {
      if (!body(x, y))
        continue;
      const idx = (y * W + x) * 4;
      if (at(eyes, x, y)) {
        setCell(cells, W, H, x, y, 255, 255, 185, 255);
        continue;
      }
      const edge = !body(x - 1, y) || !body(x + 1, y) || !body(x, y - 1) || !body(x, y + 1);
      const isClaw = at(clawMask, x, y);
      const isTip = at(clawTip, x, y);
      const sleeve = at(sleeves, x, y);
      const seam = sleeve && (!at(sleeves, x - 1, y) || !at(sleeves, x + 1, y) || !at(sleeves, x, y - 1) || !at(sleeves, x, y + 1));
      const nearEye = at(eyes, x - 1, y) || at(eyes, x + 1, y) || at(eyes, x, y - 1) || at(eyes, x, y + 1);
      let r = 0;
      let g = 0;
      let b = 0;

      if (isClaw) {
        if (isTip) {
          r = edge ? 215 : 152;
          g = edge ? 24 : 12;
          b = edge ? 36 : 22;
        } else {
          r = edge ? 212 : 158;
          g = edge ? 198 : 144;
          b = edge ? 174 : 124;
        }
      } else if (at(hollow, x, y)) {
        const rim = !at(hollow, x - 1, y) || !at(hollow, x + 1, y) || !at(hollow, x, y - 1) || !at(hollow, x, y + 1);
        const fangRow = y >= faceY + 2 && y <= faceY + 4 + Math.round(maw * 2) && Math.round(Math.abs(x - faceX)) % 2 === 0;
        if (nearEye) {
          r = 148;
          g = 24;
          b = 46;
        } else if (rim) {
          const lower = y > faceY + 1;
          r = lower ? 138 : 112;
          g = lower ? 28 : 96;
          b = lower ? 56 : 142;
        } else if (fangRow && Math.abs(x - faceX) < rx - 0.8) {
          r = 192;
          g = 178;
          b = 156;
        } else {
          r = 10;
          g = 6;
          b = 16;
        }
      } else if (edge) {
        const ragged = hem + 3 * Math.sin(x * 0.95 + sway) + 1.5 * Math.sin(x * 2.3 - sway * 1.3);
        if (y >= ragged - 2.5) {
          r = 128;
          g = 22;
          b = 38;
        } else {
          const k = Math.max(0, 1 - y / H);
          r = Math.round(108 + 38 * k);
          g = Math.round(118 + 46 * k);
          b = Math.round(158 + 52 * k);
        }
      } else if (seam) {
        r = 86;
        g = 68;
        b = 118;
      } else if (sleeve) {
        const dither = (x + y) % 2;
        r = dither ? 52 : 30;
        g = dither ? 36 : 20;
        b = dither ? 76 : 46;
      } else {
        const dx = x - center;
        const inChest = y >= 18 && y <= 29 && Math.abs(dx) <= 3.6;
        const rib = inChest && y % 3 === 0 && Math.abs(dx) >= 0.8;
        const heart = inChest && y >= 21 && y <= 25 && Math.abs(dx) <= 1.4;
        const ragged = hem + 3 * Math.sin(x * 0.95 + sway) + 1.5 * Math.sin(x * 2.3 - sway * 1.3);
        if (heart) {
          r = 188;
          g = 28;
          b = 54;
        } else if (rib) {
          r = 164;
          g = 150;
          b = 136;
        } else if (inChest) {
          r = 38;
          g = 12;
          b = 26;
        } else if (y >= ragged - 3.5) {
          const dither = (x + y) % 2;
          r = dither ? 78 : 48;
          g = dither ? 16 : 10;
          b = dither ? 30 : 20;
        } else {
          const fold = Math.sin((x - mid) * 0.9 + y * 0.12 + sway * 0.4);
          if (fold > 0.72) {
            r = 84;
            g = 68;
            b = 116;
          } else if ((x + y) % 2) {
            r = 48;
            g = 36;
            b = 72;
          } else {
            r = 24;
            g = 16;
            b = 38;
          }
        }
      }
      cells[idx] = r;
      cells[idx + 1] = Math.min(245, g);
      cells[idx + 2] = Math.min(245, b);
      cells[idx + 3] = 1;
    }
  }
  return cells;
}

// =====================================================================================================================
// 2. THE IMP: Flayed crimson hellspawn, twisted ram horns, split fang-jaw, exposed ribcage & gore talons
// =====================================================================================================================

function drawImp({ stride = 0, reach = 0, jaw = 0, lean = 0, hurt = 0 }) {
  const W = WRAITH_WIDTH;
  const H = WRAITH_HEIGHT;
  const mid = (W - 1) / 2 + lean;
  const flesh = grid(W, H);
  const bone = grid(W, H);
  const gore = grid(W, H);
  const maw = grid(W, H);
  const eyes = grid(W, H);
  const char = grid(W, H);

  // hunched flayed torso & narrow pelvis
  ellipse(flesh, mid, 19, 6.2, 6.5);
  ellipse(flesh, mid, 26, 4.4, 5.2);
  ellipse(flesh, mid, 31, 4.8, 3.6);
  // shoulder char & dorsal bone spines
  ellipse(char, mid - 5, 16, 2.8, 3.2);
  ellipse(char, mid + 5, 16, 2.8, 3.2);
  for (const y of [13, 16, 19, 22]) {
    put(bone, Math.round(mid - 1), y - 2);
    put(bone, Math.round(mid + 1), y - 2);
  }

  // exposed ribcage over torn thoracic cavity
  ellipse(maw, mid, 21, 3.6, 4.2);
  for (const ry of [17, 20, 23, 25])
    for (let dx = -3; dx <= 3; dx++)
      if (Math.abs(dx) >= 1)
        put(bone, Math.round(mid + dx), ry);
  disc(gore, mid, 21, 1.5);

  // skull, sweeping ram horns & unhinged fang maw
  const headY = 10 - Math.round(reach * 1.5);
  ellipse(flesh, mid, headY, 4.4, 4.2);
  for (const side of [-1, 1]) {
    stroke(bone, mid + side * 3, headY - 2, mid + side * 8.5, headY - 6, 1.4, 0.9);
    stroke(bone, mid + side * 8.5, headY - 6, mid + side * 6.5, headY - 9, 0.9, 0.4);
    put(eyes, Math.round(mid + side * 2), headY - 1);
    put(eyes, Math.round(mid + side * 2.8), headY - 1);
    put(eyes, Math.round(mid + side * 2.4), headY);
  }
  const jawDrop = Math.round(1 + jaw * 3.5);
  ellipse(maw, mid, headY + 2 + jawDrop * 0.5, 3.0, 1.5 + jawDrop * 0.6);
  ellipse(flesh, mid, headY + 3 + jawDrop, 3.2, 1.3);
  for (const dx of [-2, 0, 2]) {
    put(bone, Math.round(mid + dx), headY + 1);
    put(bone, Math.round(mid + dx), headY + 3 + jawDrop);
  }
  if (jaw > 0.4)
    disc(gore, mid, headY + 2 + jawDrop * 0.5, 1.4);

  // long sinewy arms & blood-drenched talons
  for (const side of [-1, 1]) {
    const sx = mid + side * 6;
    const sy = 17;
    const ex = mid + side * (9.5 + reach * 2.5);
    const ey = 23 - reach * 9;
    const hx = mid + side * (8.5 + reach * 4);
    const hy = 31 - reach * 19 + side * stride * 2;
    stroke(flesh, sx, sy, ex, ey, 2.0, 1.5);
    stroke(flesh, ex, ey, hx, hy, 1.5, 1.2);
    for (const spread of [-0.5, 0, 0.5]) {
      const ang = (reach > 0.4 ? 2.6 : 0.4) + spread * side;
      const tx = hx + Math.sin(ang) * 4.5 * side;
      const ty = hy + Math.cos(ang) * 4.5;
      stroke(bone, hx, hy, tx, ty, 0.7, 0.25);
      stroke(gore, hx + (tx - hx) * 0.45, hy + (ty - hy) * 0.45, tx, ty, 0.6, 0.25);
    }
  }

  // digitigrade legs & barbed whip tail
  for (const side of [-1, 1]) {
    const lift = Math.max(0, side * stride) * 3;
    const kx = mid + side * 4.8;
    const ky = 38 - lift * 0.6;
    const fx = mid + side * 4.2;
    const fy = 45 - lift;
    stroke(flesh, mid + side * 3.2, 32, kx, ky, 2.2, 1.5);
    stroke(char, kx, ky, fx, fy, 1.5, 1.1);
    stroke(bone, fx - 1.2, fy, fx + 1.2, fy + 1, 0.8, 0.5);
    stroke(gore, fx - 1, fy + 1, fx + 1, fy + 1, 0.7, 0.5);
  }
  stroke(flesh, mid + 2, 32, mid + 9, 37 + stride * 2, 1.3, 0.7);
  stroke(gore, mid + 9, 37 + stride * 2, mid + 12, 35 + stride * 2, 0.9, 0.4);

  if (hurt > 0) {
    disc(gore, mid - 2, 18, 2.8);
    disc(gore, mid + 3, 24, 2.2);
  }

  return shadeMonster(W, H, { flesh, bone, gore, maw, eyes, char }, 'imp', mid);
}

// =====================================================================================================================
// 3. THE BRUTE: Hulking stitch-scarred abomination, shoulder bone-spikes, boar tusks, ruptured gut & meat-hammer fists
// =====================================================================================================================

function drawBrute({ stride = 0, slam = 0, jaw = 0, lean = 0, hurt = 0 }) {
  const W = WRAITH_WIDTH;
  const H = WRAITH_HEIGHT;
  const mid = (W - 1) / 2 + lean;
  const flesh = grid(W, H);
  const bone = grid(W, H);
  const gore = grid(W, H);
  const maw = grid(W, H);
  const eyes = grid(W, H);
  const char = grid(W, H);

  // massive bloated torso & ripped gut
  ellipse(flesh, mid, 19, 10.2, 8.5);
  ellipse(flesh, mid, 28, 8.6, 7.2);
  ellipse(char, mid - 7, 15, 4.2, 4.0);
  ellipse(char, mid + 7, 15, 4.2, 4.0);

  // jagged bone shoulder spikes with bleeding roots
  for (const side of [-1, 1]) {
    stroke(bone, mid + side * 7.5, 13, mid + side * 11.5, 5, 1.8, 0.5);
    stroke(bone, mid + side * 5.2, 12, mid + side * 7.5, 6, 1.4, 0.4);
    disc(gore, mid + side * 7.5, 13, 1.8);
  }

  // ruptured abdominal cavity & surgical iron staples
  ellipse(maw, mid, 28, 4.5, 4.2);
  ellipse(gore, mid - 1, 28, 3.6, 3.2);
  ellipse(gore, mid + 1.5, 29.5, 3.0, 2.4);
  for (const y of [18, 21, 24, 27, 30])
    stroke(bone, mid - 4.5, y, mid + 4.5, y, 0.55, 0.55);

  // sunken brutish skull, glaring eyes & bloodied boar tusks
  const headY = 11 - Math.round(slam * 1.5);
  ellipse(flesh, mid, headY, 5.5, 4.8);
  for (const side of [-1, 1]) {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]])
      put(eyes, Math.round(mid + side * 2.3 + dx - 0.5), headY - 1 + dy);
    // huge upward boar tusks
    stroke(bone, mid + side * 3.8, headY + 3 + jaw * 2, mid + side * 5.2, headY - 1, 1.1, 0.4);
    put(gore, Math.round(mid + side * 5.2), headY - 1);
  }
  ellipse(maw, mid, headY + 2.5 + jaw * 1.5, 3.8, 1.8 + jaw * 1.4);

  // colossal meat-hammer arms & fists
  for (const side of [-1, 1]) {
    const sx = mid + side * 9.5;
    const sy = 17;
    const hx = mid + side * (11.5 - slam * 2.5);
    const hy = 31 - slam * 23 + side * stride * 2;
    stroke(flesh, sx, sy, hx, (sy + hy) / 2, 3.4, 2.8);
    stroke(char, hx, (sy + hy) / 2, hx, hy, 2.8, 3.2);
    disc(flesh, hx, hy, 3.6);
    disc(gore, hx, hy + (slam > 0.5 ? -1.5 : 1.5), 2.8);
    stroke(bone, hx - 2, hy, hx + 2, hy, 0.7, 0.7);
  }

  // pillar legs splashed with gore
  for (const side of [-1, 1]) {
    const lift = Math.max(0, side * stride) * 2.5;
    const lx = mid + side * 5.2;
    stroke(char, lx, 33, lx, 44 - lift, 3.2, 2.6);
    ellipse(gore, lx, 45 - lift, 3.2, 1.8);
  }

  if (hurt > 0) {
    disc(gore, mid - 4, 20, 3.4);
    disc(gore, mid + 4, 23, 3.0);
  }

  return shadeMonster(W, H, { flesh, bone, gore, maw, eyes, char }, 'brute', mid);
}

// =====================================================================================================================
// 4. THE WARDEN (BOSS): Five-horned obsidian-gore overlord, four burning eyes & exposed pulsing chest hell-core
// =====================================================================================================================

function drawBoss({ stride = 0, slam = 0, spread = 0, jaw = 0, lean = 0 }) {
  const W = WRAITH_WIDTH;
  const H = WRAITH_HEIGHT;
  const mid = (W - 1) / 2 + lean;
  const flesh = grid(W, H);
  const bone = grid(W, H);
  const gore = grid(W, H);
  const maw = grid(W, H);
  const eyes = grid(W, H);
  const char = grid(W, H);

  // colossal armored & flayed torso
  ellipse(char, mid, 20, 11.2, 9.2);
  ellipse(flesh, mid, 28, 9.2, 7.8);

  // double rows of blood-soaked shoulder spikes
  for (const side of [-1, 1]) {
    stroke(bone, mid + side * 8.5, 14, mid + side * 13.5, 5, 1.9, 0.5);
    stroke(bone, mid + side * 6.5, 12, mid + side * 10.5, 3, 1.6, 0.4);
    disc(gore, mid + side * 9, 13, 2.2);
  }

  // pried-open ribcage & blazing chest hell-core
  ellipse(maw, mid, 22, 5.6, 5.8);
  for (const ry of [17, 20, 23, 26, 29]) {
    stroke(bone, mid - 5.5, ry, mid - 2.2, ry + 0.5, 0.9, 0.6);
    stroke(bone, mid + 5.5, ry, mid + 2.2, ry + 0.5, 0.9, 0.6);
  }
  disc(gore, mid, 22, 3.4);
  disc(eyes, mid, 22, 1.8);

  // crown of five horns & four-eyed skull visage
  const headY = 10;
  ellipse(flesh, mid, headY, 5.8, 4.8);
  for (const k of [-2, -1, 0, 1, 2]) {
    const hx = mid + k * 2.2;
    const tipX = mid + k * 4.2;
    const tipY = headY - 7 - (2 - Math.abs(k)) * 1.5;
    stroke(bone, hx, headY - 2, tipX, tipY, 1.2, 0.35);
  }
  for (const side of [-1, 1]) {
    put(eyes, Math.round(mid + side * 2.2), headY - 1);
    put(eyes, Math.round(mid + side * 3.0), headY - 1);
    put(eyes, Math.round(mid + side * 1.8), headY - 3);
    stroke(bone, mid + side * 4.2, headY + 3 + jaw * 2, mid + side * 6.0, headY - 1, 1.2, 0.4);
  }
  ellipse(maw, mid, headY + 2.8 + jaw * 1.6, 4.0, 2.0 + jaw * 1.5);
  disc(gore, mid, headY + 4 + jaw * 2, 2.2);

  // titan arms: raised overhead for slam or thrown wide for fireball fan
  for (const side of [-1, 1]) {
    const sx = mid + side * 10.2;
    const sy = 17;
    const hx = mid + side * (11.8 + spread * 2.8 - slam * 2.2);
    const hy = 31 - slam * 24 - spread * 12 + side * stride * 2;
    stroke(char, sx, sy, hx, (sy + hy) / 2, 3.6, 3.0);
    stroke(flesh, hx, (sy + hy) / 2, hx, hy, 3.0, 3.4);
    disc(gore, hx, hy, 3.4);
    for (const sp of [-1, 0, 1])
      stroke(bone, hx + sp * 1.5, hy, hx + sp * 2.2, hy + (slam > 0.5 ? -3.5 : 3.5), 0.8, 0.3);
  }

  // massive greaves & hooves
  for (const side of [-1, 1]) {
    const lift = Math.max(0, side * stride) * 2.5;
    const lx = mid + side * 5.6;
    stroke(char, lx, 33, lx, 44 - lift, 3.5, 2.9);
    ellipse(gore, lx, 45 - lift, 3.6, 2.0);
  }

  return shadeMonster(W, H, { flesh, bone, gore, maw, eyes, char }, 'boss', mid);
}

// =====================================================================================================================
// 5. THE SKULL: Floating cracked demon cranium, unhinging fang-jaw, hellfire throat & dangling bloody spine
// =====================================================================================================================

function drawSkull({ chatter = 0, flame = 0, sway = 0, hurt = 0 }) {
  const W = WRAITH_WIDTH;
  const H = WRAITH_HEIGHT;
  const mid = (W - 1) / 2 + sway * 0.8;
  const flesh = grid(W, H);
  const bone = grid(W, H);
  const gore = grid(W, H);
  const maw = grid(W, H);
  const eyes = grid(W, H);
  const char = grid(W, H);

  // bulbous ossified cranium & cheekbones
  ellipse(bone, mid, 14, 9.2, 8.2);
  ellipse(bone, mid - 5.5, 19, 3.5, 3.2);
  ellipse(bone, mid + 5.5, 19, 3.5, 3.2);
  // strips of rotting scalp & crimson skull fractures
  stroke(flesh, mid - 8.5, 12, mid - 10, 22, 1.4, 0.5);
  stroke(flesh, mid + 8.5, 13, mid + 10, 23, 1.4, 0.5);
  stroke(gore, mid - 2, 7, mid + 1, 13, 0.7, 0.5);
  stroke(gore, mid + 1, 13, mid + 5, 10, 0.6, 0.4);

  // abyssal orbital sockets & burning coals
  for (const side of [-1, 1]) {
    const ex = mid + side * 3.8;
    ellipse(maw, ex, 15, 2.8, 2.6);
    put(eyes, Math.round(ex), 15);
    put(eyes, Math.round(ex + side * 0.8), 15);
    put(eyes, Math.round(ex), 16);
    // weeping blood tears beneath sockets
    stroke(gore, ex, 17.5, ex + side * 0.5, 22, 0.8, 0.4);
  }
  // nasal cavity
  ellipse(maw, mid, 18.5, 1.4, 1.8);

  // unhinging mandible jaw & jagged fangs
  const drop = Math.round(2 + chatter * 5 + flame * 6);
  ellipse(maw, mid, 22 + drop * 0.5, 6.2, 2.5 + drop * 0.55);
  stroke(bone, mid - 6.5, 20, mid - 5.2, 23 + drop, 1.6, 1.3);
  stroke(bone, mid + 6.5, 20, mid + 5.2, 23 + drop, 1.6, 1.3);
  stroke(bone, mid - 5.2, 23 + drop, mid + 5.2, 24.5 + drop, 1.6, 1.6);
  for (const dx of [-4, -2, 0, 2, 4]) {
    stroke(bone, mid + dx, 20.5, mid + dx, 22.5, 0.65, 0.3);
    stroke(bone, mid + dx, 23.5 + drop, mid + dx, 21.5 + drop, 0.65, 0.3);
  }
  if (flame > 0.2) {
    disc(gore, mid, 22 + drop * 0.5, 3.2 * flame);
    disc(eyes, mid, 22 + drop * 0.5, 1.7 * flame);
  }

  // dangling bloody spinal column & nerve tendrils
  for (let k = 0; k < 7; k++) {
    const sy = 25 + drop + k * 2.5;
    if (sy >= H - 2)
      break;
    const sx = mid + Math.sin(k * 0.7 + sway * 1.5) * 2.2;
    ellipse(k % 2 === 0 ? bone : gore, sx, sy, 2.1 - k * 0.18, 1.1);
  }
  stroke(gore, mid - 3, 24 + drop, mid - 5 - sway, 37, 1.0, 0.3);
  stroke(gore, mid + 3, 24 + drop, mid + 5 - sway, 38, 1.0, 0.3);

  if (hurt > 0)
    disc(gore, mid + 3, 12, 3.2);

  return shadeMonster(W, H, { flesh, bone, gore, maw, eyes, char }, 'skull', mid);
}

// =====================================================================================================================
// 6. THE CRAWLER: Six-legged arachnid-flesh hybrid, weeping pustule abdomen, 6 glaring eyes & dripping chelicerae
// =====================================================================================================================

function drawCrawler({ skitter = 0, lunge = 0, mandible = 0, hurt = 0 }) {
  const W = WRAITH_WIDTH;
  const H = WRAITH_HEIGHT;
  const mid = (W - 1) / 2;
  const liftY = Math.round(lunge * 5);
  const flesh = grid(W, H);
  const bone = grid(W, H);
  const gore = grid(W, H);
  const maw = grid(W, H);
  const eyes = grid(W, H);
  const char = grid(W, H);

  // bloated rear abdomen with weeping gore pustules & chitin plates
  ellipse(char, mid, 25 - liftY, 8.8, 6.8);
  ellipse(flesh, mid, 23 - liftY, 6.8, 4.8);
  disc(gore, mid - 3.5, 22 - liftY, 2.0);
  disc(gore, mid + 4.0, 24 - liftY, 2.2);
  disc(gore, mid, 20 - liftY, 1.8);
  for (const dx of [-5, -2, 2, 5])
    stroke(bone, mid + dx, 19 - liftY, mid + dx * 1.3, 15 - liftY, 0.8, 0.3);

  // cephalothorax, 6 glaring spider eyes & split vertical maw
  const headY = 30 - liftY;
  ellipse(char, mid, headY, 6.2, 4.8);
  ellipse(maw, mid, headY + 2, 2.6 + mandible, 3.2);
  for (const side of [-1, 1]) {
    put(eyes, Math.round(mid + side * 1.8), headY - 2);
    put(eyes, Math.round(mid + side * 3.4), headY - 1);
    put(eyes, Math.round(mid + side * 2.6), headY - 3);
    // curved chelicerae / mandibles dripping arterial blood
    const mx = mid + side * (3.2 + mandible * 2.5);
    const my = headY + 6 + mandible * 1.5;
    stroke(bone, mid + side * 2.8, headY + 1, mx, my, 1.4, 0.4);
    disc(gore, mx, my, 1.3);
  }

  // six razor-sharp multi-jointed scythe legs
  for (let i = 0; i < 3; i++)
    for (const side of [-1, 1]) {
      const phase = ((i + (side > 0 ? 1 : 0)) % 2 === 0 ? 1 : -1) * skitter;
      const rootX = mid + side * (5.5 + i * 0.8);
      const rootY = 26 + i * 3 - liftY;
      const kneeX = mid + side * (12.5 + i * 1.2);
      const kneeY = 19 + i * 3.5 - phase * 2.5 - liftY * 1.2;
      const tipX = mid + side * (14.2 - i * 0.6);
      const tipY = Math.min(H - 1, 39 + i * 2.5 + phase * 2 - liftY * 0.5);
      stroke(char, rootX, rootY, kneeX, kneeY, 1.5, 1.1);
      stroke(bone, kneeX, kneeY, tipX, tipY, 1.1, 0.4);
      stroke(gore, kneeX + (tipX - kneeX) * 0.6, kneeY + (tipY - kneeY) * 0.6, tipX, tipY, 0.8, 0.35);
    }

  if (hurt > 0)
    disc(gore, mid, 26 - liftY, 3.6);

  return shadeMonster(W, H, { flesh, bone, gore, maw, eyes, char }, 'crawler', mid);
}

// =====================================================================================================================
// 7. THE SWARMER: Feral skinless pack-fiend, oversized split shark-maw, exposed dorsal spine & sickle claws
// =====================================================================================================================

function drawSwarmer({ scurry = 0, bite = 0, hurt = 0 }) {
  const W = WRAITH_WIDTH;
  const H = WRAITH_HEIGHT;
  const mid = (W - 1) / 2;
  const flesh = grid(W, H);
  const bone = grid(W, H);
  const gore = grid(W, H);
  const maw = grid(W, H);
  const eyes = grid(W, H);
  const char = grid(W, H);

  // low, crouched skinless body & dorsal spinal fin-ridges
  ellipse(flesh, mid, 32, 7.2, 5.4);
  ellipse(char, mid, 35, 5.8, 3.2);
  for (const dx of [-4, -1.5, 1.5, 4]) {
    stroke(bone, mid + dx, 27, mid + dx * 1.2, 22, 0.9, 0.3);
    put(gore, Math.round(mid + dx), 27);
  }

  // oversized split shark-maw & rabid eyes
  const headY = 31 - Math.round(bite * 2);
  const open = Math.round(2 + bite * 5.5);
  ellipse(maw, mid, headY + 2, 5.4, 2.4 + open * 0.55);
  for (const side of [-1, 1]) {
    put(eyes, Math.round(mid + side * 3.0), headY - 2);
    put(eyes, Math.round(mid + side * 4.4), headY - 2);
    put(eyes, Math.round(mid + side * 3.6), headY - 3);
  }
  for (const dx of [-4, -2, 0, 2, 4]) {
    stroke(bone, mid + dx, headY - 0.5, mid + dx, headY + 1.8, 0.65, 0.25);
    stroke(bone, mid + dx, headY + 3.5 + open * 0.6, mid + dx, headY + 1.5 + open * 0.6, 0.65, 0.25);
  }
  disc(gore, mid, headY + 3 + open * 0.5, 1.8);

  // four frantic clawed legs & whip tail
  for (const [i, rx, ry] of [[0, 6.2, 34], [1, 3.8, 36]])
    for (const side of [-1, 1]) {
      const phase = ((i + (side > 0 ? 1 : 0)) % 2 === 0 ? 1 : -1) * scurry;
      const kx = mid + side * (rx + 3.2);
      const ky = ry + 3 - phase * 2;
      const fx = mid + side * (rx + 2.4);
      const fy = Math.min(H - 1, 45 - phase * 1.5);
      stroke(flesh, mid + side * rx, ry, kx, ky, 1.6, 1.1);
      stroke(bone, kx, ky, fx, fy, 1.0, 0.45);
      disc(gore, fx, fy, 0.9);
    }
  stroke(flesh, mid + 5, 31, mid + 12, 26 + scurry * 2, 1.2, 0.4);
  disc(gore, mid + 12, 26 + scurry * 2, 0.9);

  if (hurt > 0)
    disc(gore, mid - 2, 30, 2.8);

  return shadeMonster(W, H, { flesh, bone, gore, maw, eyes, char }, 'swarmer', mid);
}

/**
 * Shades the anatomical layers of a flesh-and-bone horror into [R, G, B, flag] pixels with rich dithered muscle,
 * necrotic hide, yellowed corpse-bone, abyssal maw cavities, arterial gore, and glowing eyes.
 */
function shadeMonster(W, H, { flesh, bone, gore, maw, eyes, char }, kind, mid) {
  const solid = (x, y) => at(flesh, x, y) || at(bone, x, y) || at(gore, x, y) || at(maw, x, y) || at(eyes, x, y) || at(char, x, y);
  const cells = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!solid(x, y))
        continue;
      if (at(eyes, x, y)) {
        setCell(cells, W, H, x, y, 255, 255, 185, 255);
        continue;
      }
      const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
      const dither = (x + y) % 2;
      const striations = Math.sin((x - mid) * 1.1 + y * 0.35) > 0.35;
      let r = 0;
      let g = 0;
      let b = 0;

      if (at(gore, x, y)) {
        // glistening wet arterial blood & torn viscera
        r = edge ? 228 : dither ? 186 : 132;
        g = edge ? 32 : dither ? 18 : 10;
        b = edge ? 44 : dither ? 28 : 18;
      } else if (at(bone, x, y)) {
        // desiccated yellow-ash corpse bone, teeth, horns & ribs
        const boneEdge = !at(bone, x - 1, y) || !at(bone, x + 1, y) || !at(bone, x, y - 1) || !at(bone, x, y + 1);
        r = boneEdge ? 224 : dither ? 192 : 154;
        g = boneEdge ? 208 : dither ? 176 : 138;
        b = boneEdge ? 180 : dither ? 148 : 114;
      } else if (at(maw, x, y)) {
        // gaping throat / thoracic cavity with wet crimson rim
        const rim = !at(maw, x - 1, y) || !at(maw, x + 1, y) || !at(maw, x, y - 1) || !at(maw, x, y + 1);
        r = rim ? 136 : 16;
        g = rim ? 20 : 6;
        b = rim ? 34 : 14;
      } else if (at(char, x, y)) {
        // charred obsidian hide, chitin carapace, or rusted surgical armor
        if (kind === 'crawler') {
          r = edge ? 88 : dither ? 54 : 32;
          g = edge ? 52 : dither ? 30 : 18;
          b = edge ? 104 : dither ? 68 : 44;
        } else if (kind === 'brute') {
          r = edge ? 96 : dither ? 64 : 42;
          g = edge ? 88 : dither ? 58 : 38;
          b = edge ? 82 : dither ? 56 : 36;
        } else {
          r = edge ? 78 : dither ? 48 : 28;
          g = edge ? 36 : dither ? 22 : 14;
          b = edge ? 52 : dither ? 34 : 22;
        }
      } else {
        // primary flesh: flayed crimson muscle (imp/swarmer), putrid necrotic green-gray (brute), or deep blood-burgundy (boss)
        if (kind === 'brute') {
          r = edge ? 126 : striations ? 96 : dither ? 76 : 54;
          g = edge ? 114 : striations ? 88 : dither ? 68 : 46;
          b = edge ? 98 : striations ? 74 : dither ? 62 : 44;
        } else if (kind === 'boss') {
          r = edge ? 158 : striations ? 118 : dither ? 86 : 56;
          g = edge ? 34 : striations ? 24 : dither ? 18 : 12;
          b = edge ? 54 : striations ? 42 : dither ? 32 : 22;
        } else if (kind === 'crawler') {
          r = edge ? 168 : striations ? 128 : dither ? 94 : 64;
          g = edge ? 44 : striations ? 28 : dither ? 20 : 14;
          b = edge ? 72 : striations ? 52 : dither ? 42 : 28;
        } else {
          r = edge ? 196 : striations ? 162 : dither ? 126 : 86;
          g = edge ? 36 : striations ? 24 : dither ? 16 : 10;
          b = edge ? 48 : striations ? 34 : dither ? 24 : 16;
        }
      }
      setCell(cells, W, H, x, y, r, g, b, 1);
    }
  return cells;
}

// =====================================================================================================================
// DEATH & GIBBING ANIMATION GENERATORS
// =====================================================================================================================

/**
 * Ghostly collapse for the wraith: squashes towards the floor, dissolves from the top down, and releases spectral embers.
 */
function collapse(cells, { squash, widen, dissolve, eyes, embers }, salt) {
  const W = WRAITH_WIDTH;
  const H = WRAITH_HEIGHT;
  const mid = (W - 1) / 2;
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const sy = Math.round(H - 1 - (H - 1 - y) / squash);
    if (sy < 0)
      continue;
    const top = 1 - (H - 1 - y) / (H * squash);
    for (let x = 0; x < W; x++) {
      const sx = Math.round(mid + (x - mid) / widen);
      if (sx < 0 || sx >= W)
        continue;
      const i = (sy * W + sx) * 4;
      if (!cells[i + 3])
        continue;
      if (noise(x, y, salt) < dissolve * (0.55 + 0.45 * Math.max(0, top)))
        continue;
      const dst = (y * W + x) * 4;
      const eye = cells[i + 3] === 255 && eyes;
      if (eye) {
        out[dst] = 255;
        out[dst + 1] = 255;
        out[dst + 2] = 185;
        out[dst + 3] = 255;
      } else if (cells[i + 3] === 255) {
        out[dst] = 105;
        out[dst + 1] = 22;
        out[dst + 2] = 42;
        out[dst + 3] = 1;
      } else {
        out[dst] = cells[i];
        out[dst + 1] = cells[i + 1];
        out[dst + 2] = cells[i + 2];
        out[dst + 3] = 1;
      }
    }
  }
  for (let k = 0; k < embers; k++) {
    const x = Math.floor(2 + noise(k, 7, salt) * (W - 4));
    const maxRise = H * Math.max(0.08, (0.28 + 0.08 * salt) * (1 - dissolve * 0.85));
    const y = Math.floor(H - 2 - noise(k, 11, salt) * maxRise);
    const dst = (y * W + x) * 4;
    if (y >= 0 && !out[dst + 3]) {
      const glow = 0.55 + 0.45 * noise(k, 13, salt);
      const crimson = k % 2 === 0;
      out[dst] = Math.round((crimson ? 215 : 145) * glow);
      out[dst + 1] = Math.round((crimson ? 38 : 175) * glow);
      out[dst + 2] = Math.round((crimson ? 64 : 225) * glow);
      out[dst + 3] = 1;
    }
  }
  return out;
}

/**
 * Gruesome visceral death for flesh-and-bone monsters: the fatal wound rips the torso open, arterial fountains
 * spray upward and arc down, white ribs and entrails spill out, and the mangled carcass collapses into a pool of blood.
 */
function goreDie(cells, { squash, widen, gash, fountain, pool, eyes }, salt) {
  const W = WRAITH_WIDTH;
  const H = WRAITH_HEIGHT;
  const mid = (W - 1) / 2;
  const out = new Uint8Array(W * H * 4);
  const woundY = Math.round(H - 1 - 24 * squash);

  for (let y = 0; y < H; y++) {
    const sy = Math.round(H - 1 - (H - 1 - y) / squash);
    if (sy < 0 || sy >= H)
      continue;
    for (let x = 0; x < W; x++) {
      const sx = Math.round(mid + (x - mid) / widen);
      if (sx < 0 || sx >= W)
        continue;
      const i = (sy * W + sx) * 4;
      if (!cells[i + 3])
        continue;
      // upper parts tear open along a jagged wound line
      const distWound = Math.abs(y - woundY) + Math.abs(x - mid) * 0.45;
      if (distWound < gash * 5.5) {
        const rib = (x + y) % 3 === 0 && Math.abs(x - mid) > 1.5;
        if (rib)
          setCell(out, W, H, x, y, 216, 198, 170, 1);
        else
          setCell(out, W, H, x, y, Math.round(165 + 85 * noise(x, y, salt)), 0, 255, 2);
        continue;
      }
      const eye = cells[i + 3] === 255 && eyes;
      if (eye)
        setCell(out, W, H, x, y, 255, 255, 185, 255);
      else if (cells[i + 3] === 255)
        setCell(out, W, H, x, y, 165, 18, 28, 1);
      else
        setCell(out, W, H, x, y, cells[i], cells[i + 1], cells[i + 2], 1);
    }
  }

  // arterial blood fountain spraying from the ruptured body
  const t = salt * 0.18;
  for (let k = 0; k < fountain; k++) {
    const angle = -Trigo.pi * (0.18 + 0.64 * noise(k, 31, salt));
    const speed = 14 + 26 * noise(k, 33, salt);
    const bx = mid + Math.cos(angle) * speed * t;
    const by = woundY + Math.sin(angle) * speed * t + 36 * t * t;
    setCell(out, W, H, bx, by, Math.round(180 + 75 * noise(k, 37, salt)), 0, 255, 2);
    if (k % 3 === 0)
      setCell(out, W, H, bx, by + 1, 135, 0, 255, 2);
  }

  // spreading pool of arterial blood & protruding white bone ribs on the floor
  if (pool > 0) {
    const rx = 5 + pool * 9.5;
    const ry = 1.5 + pool * 2.4;
    const py = H - 2;
    for (let y = Math.floor(py - ry); y <= H - 1; y++)
      for (let x = Math.floor(mid - rx); x <= Math.ceil(mid + rx); x++)
        if (((x - mid) / rx) ** 2 + ((y - py) / ry) ** 2 <= 1)
          setCell(out, W, H, x, y, Math.round(145 + 95 * noise(x, y, salt + 5)), 0, 255, 2);
    for (const dx of [-4, -2, 1, 3])
      if (pool > 0.45)
        setCell(out, W, H, mid + dx, py - 1, 214, 198, 170, 1);
  }
  return out;
}

/** Sets a frame drawn on the 32 x 48 grid at the bottom middle of the larger cell. */
function embed(cells) {
  const out = new Uint8Array(CELL_WIDTH * CELL_HEIGHT * 4);
  const left = (CELL_WIDTH - WRAITH_WIDTH) / 2;
  const top = CELL_HEIGHT - WRAITH_HEIGHT;
  for (let y = 0; y < WRAITH_HEIGHT; y++)
    for (let x = 0; x < WRAITH_WIDTH; x++) {
      const from = (y * WRAITH_WIDTH + x) * 4;
      const to = ((y + top) * CELL_WIDTH + x + left) * 4;
      out[to] = cells[from];
      out[to + 1] = cells[from + 1];
      out[to + 2] = cells[from + 2];
      out[to + 3] = cells[from + 3];
    }
  return out;
}

/**
 * One step of the close-range gib burst: the pose swells and splits open with crimson fissures, then detonates into
 * flying chunks of meat, bone shards, uncoiling viscera, and a blooming arterial blood cloud.
 */
function burst(source, { t, swell = 1, cracks = false, core = 0, dissolve = 0, eyes = true }, salt) {
  const W = CELL_WIDTH;
  const H = CELL_HEIGHT;
  const cx = (W - 1) / 2;
  const cy = H - 26;
  const out = new Uint8Array(W * H * 4);
  const putPixel = (x, y, r, g, b, flag, over = true) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H)
      return;
    const i = (y * W + x) * 4;
    if (!over && out[i + 3])
      return;
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = flag;
  };

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const flag = source[i + 3];
      if (!flag || noise(x, y, salt) < dissolve)
        continue;
      const bx = Math.floor((x + (Math.floor(y / 5) % 2) * 2) / 5);
      const by = Math.floor(y / 5);
      const dx = bx * 5 + 2.5 - cx;
      const dy = by * 5 + 2.5 - cy;
      const length = scratchPt.setScalar(dx, dy).getMagnitude() || 1;
      const speed = 14 + 26 * noise(bx, by, 1);
      const vx = (dx / length) * speed + (noise(bx, by, 2) - 0.5) * 10;
      const vy = (dy / length) * speed - 10 - 12 * noise(bx, by, 3);
      const meat = t > 0 && noise(bx, by, 4) < 0.4;
      const eye = flag === 255 && eyes && t < 0.6;
      const px = cx + (x - cx) * swell + vx * t;
      const py = cy + (y - cy) * swell + vy * t + 45 * t * t;
      if (eye)
        putPixel(px, py, 255, 255, 185, 255);
      else if (meat)
        putPixel(px, py, Math.max(source[i], 165), 0, 255, 2);
      else if (flag === 255)
        putPixel(px, py, 105, 22, 42, 1);
      else
        putPixel(px, py, source[i], source[i + 1], source[i + 2], 1);
    }

  if (cracks)
    for (let k = 0; k < 7; k++) {
      const angle = (k / 7) * Trigo.twopi + noise(k, 5, salt) * 0.6;
      const reach = 8 + noise(k, 6, salt) * 12;
      for (let d = 2; d < reach; d += 0.7)
        putPixel(cx + Math.cos(angle) * d, cy + Math.sin(angle) * d * 1.2, 255, 0, 255, 2);
    }

  if (core > 0) {
    const radius = 3 + 15 * Math.min(1, t * 1.6);
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++)
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        const d = scratchPt.setScalar(x - cx, (y - cy) * 0.85).getMagnitude() / radius;
        if (d <= 1 && noise(x, y, salt + 9) < core * (1.15 - d))
          putPixel(x, y, Math.round(255 * (0.4 + 0.6 * noise(x, y, salt + 3))), 0, 255, 2);
      }
    for (let k = 0; k < 10 + Math.round(24 * core); k++) {
      const angle = noise(k, 21, salt) * Trigo.twopi;
      const speed = 18 + 46 * noise(k, 22, salt);
      const x = cx + Math.cos(angle) * speed * t;
      const y = cy + Math.sin(angle) * speed * t * 0.9 - 14 * t + 45 * t * t * noise(k, 23, salt);
      putPixel(x, y, 255, 0, 255, 2, false);
      if (noise(k, 24, salt) < 0.5)
        putPixel(x - Math.cos(angle) * 1.5, y - Math.sin(angle) * 1.5, 150, 0, 255, 2, false);
    }
  }

  if (t >= 0.45) {
    const settle = Math.min(1, (t - 0.45) / 0.65);
    const poolRx = 10 + 11 * settle;
    const poolRy = 2.4 + 2.8 * settle;
    const poolCy = H - 2.6;
    for (let y = Math.floor(poolCy - poolRy - 5); y < H; y++)
      for (let x = Math.floor(cx - poolRx - 2); x <= Math.ceil(cx + poolRx + 2); x++) {
        const dx = (x - cx) / poolRx;
        const dy = (y - poolCy) / poolRy;
        const d = scratchPt.setScalar(dx, dy).getMagnitude();
        if (d <= 1 + 0.22 * noise(x, y, salt + 31)) {
          const shade = d < 0.55 ? 215 : d < 0.82 ? 155 : 105;
          putPixel(x, y, shade, 0, 255, 2);
        }
      }
    const moundRx = 7 + 6.5 * settle;
    const moundH = 4 + 5.5 * settle;
    for (let y = Math.floor(H - 2 - moundH); y <= H - 2; y++) {
      const rowT = (H - 2 - y) / moundH;
      const halfW = moundRx * Math.sqrt(Math.max(0, 1 - rowT * rowT));
      for (let x = Math.floor(cx - halfW); x <= Math.ceil(cx + halfW); x++) {
        const n = noise(x, y, salt + 41);
        if (n < 0.18 * rowT)
          continue;
        if (n > 0.78)
          putPixel(x, y, 224, 206, 174, 1);
        else if (n > 0.48)
          putPixel(x, y, 168, 18, 28, 1);
        else
          putPixel(x, y, 210, 0, 255, 2);
      }
    }
    const ribs = 3 + Math.round(3 * settle);
    for (let r = 0; r < ribs; r++) {
      const rx = cx + (r - (ribs - 1) / 2) * 3.4 + (noise(r, 51, salt) - 0.5) * 1.5;
      const rh = 3 + Math.round(3.5 * settle * (0.65 + 0.35 * noise(r, 52, salt)));
      const tilt = (r - (ribs - 1) / 2) * 0.32;
      for (let s = 0; s <= rh; s++) {
        putPixel(rx + tilt * s, H - 3 - s, 232, 214, 182, 1);
        if (s === rh)
          putPixel(rx + tilt * s, H - 4 - s, 215, 0, 255, 2);
      }
    }
  }
  return out;
}

const BURST_STEPS = [
  { t: 0, swell: 1.16, cracks: true },
  { t: 0.12, swell: 1.06, core: 0.35 },
  { t: 0.28, core: 0.7 },
  { t: 0.5, core: 1 },
  { t: 0.78, core: 0.55, dissolve: 0.45, eyes: false },
  { t: 1.1, core: 0, dissolve: 1, eyes: false },
];

const GORE_DIE_STEPS = [
  { squash: 0.94, widen: 1.04, gash: 0.45, fountain: 14, pool: 0.2, eyes: true },
  { squash: 0.74, widen: 1.14, gash: 0.75, fountain: 22, pool: 0.45, eyes: true },
  { squash: 0.48, widen: 1.24, gash: 0.92, fountain: 16, pool: 0.72, eyes: false },
  { squash: 0.28, widen: 1.34, gash: 1.0, fountain: 6, pool: 0.9, eyes: false },
  { squash: 0.16, widen: 1.4, gash: 1.0, fountain: 0, pool: 1.0, eyes: false },
];

function packAtlas(name, frames) {
  const width = CELL_WIDTH * WRAITH_FRAME_COUNT;
  const height = CELL_HEIGHT;
  const data = new Uint8Array(width * height * 4);
  frames.forEach((cells, frame) => {
    for (let y = 0; y < height; y++)
      for (let x = 0; x < CELL_WIDTH; x++) {
        const i = (y * CELL_WIDTH + x) * 4;
        const o = (y * width + frame * CELL_WIDTH + x) * 4;
        const flag = cells[i + 3];
        data[o] = cells[i];
        data[o + 1] = flag === 255 ? 255 : cells[i + 1];
        data[o + 2] = flag === 2 ? 255 : cells[i + 2];
        data[o + 3] = flag > 0 ? 255 : 0;
      }
  });
  return { name, data, width, height, cell: CELL_WIDTH, frames: WRAITH_FRAME_COUNT };
}

function buildFleshAtlas(name, drawPose, poses, flungPose) {
  const flung = drawPose(flungPose);
  const open = embed(drawPose(poses[2]));
  const frames = [
    ...poses.map((pose) => embed(drawPose(pose))),
    ...GORE_DIE_STEPS.map((step, i) => embed(goreDie(flung, step, i + 1))),
    ...BURST_STEPS.map((step, i) => burst(open, step, i + 1)),
  ];
  return packAtlas(name, frames);
}

/** The wraith: a hooded, floating thing that drifts, rakes with its claws and wails. */
export function wraithAtlas() {
  const poses = [
    { sway: 0, hand: [14, 34], claws: 0.5, maw: 0, lean: 0 },
    { sway: Trigo.pi, hand: [14, 31], claws: 0.8, maw: 0.1, lean: 0 },
    { sway: 1.2, hand: [13, 9], claws: 3.0, maw: 1, lean: 0 },
    { sway: 2.4, hand: [4, 13], claws: 2.6, maw: 0.5, lean: 2 },
  ];
  const flung = drawWraith({ sway: 2, hand: [14, 12], claws: 2.8, maw: 1, lean: 3 });
  const steps = [
    { squash: 1, widen: 1, dissolve: 0, eyes: true, embers: 0 },
    { squash: 0.78, widen: 1.08, dissolve: 0.05, eyes: true, embers: 3 },
    { squash: 0.5, widen: 1.18, dissolve: 0.22, eyes: false, embers: 6 },
    { squash: 0.26, widen: 1.25, dissolve: 0.5, eyes: false, embers: 8 },
    { squash: 0.12, widen: 1.25, dissolve: 0.8, eyes: false, embers: 9 },
  ];
  const open = embed(drawWraith(poses[2]));
  const frames = [
    ...poses.map((pose) => embed(drawWraith(pose))),
    ...steps.map((step, i) => embed(collapse(flung, step, i + 1))),
    ...BURST_STEPS.map((step, i) => burst(open, step, i + 1)),
  ];
  return packAtlas('wraith', frames);
}

export function impAtlas() {
  return buildFleshAtlas('imp', drawImp, [
    { stride: -1, reach: 0, jaw: 0.1, lean: 0, hurt: 0 },
    { stride: 1, reach: 0.15, jaw: 0.25, lean: 0, hurt: 0 },
    { stride: 0.5, reach: 1, jaw: 1, lean: 0, hurt: 0 },
    { stride: -0.5, reach: 0.4, jaw: 0.8, lean: 2, hurt: 1 },
  ], { stride: 0, reach: 0.9, jaw: 1, lean: 2.5, hurt: 1 });
}

export function bruteAtlas() {
  return buildFleshAtlas('brute', drawBrute, [
    { stride: -1, slam: 0, jaw: 0.1, lean: 0, hurt: 0 },
    { stride: 1, slam: 0.1, jaw: 0.3, lean: 0, hurt: 0 },
    { stride: 0.3, slam: 1, jaw: 1, lean: 0, hurt: 0 },
    { stride: -0.5, slam: 0.3, jaw: 0.8, lean: 1.8, hurt: 1 },
  ], { stride: 0, slam: 0.7, jaw: 1, lean: 2, hurt: 1 });
}

export function bossAtlas() {
  return buildFleshAtlas('boss', drawBoss, [
    { stride: -1, slam: 0, spread: 0, jaw: 0.15, lean: 0 },
    { stride: 1, slam: 0.1, spread: 0.2, jaw: 0.35, lean: 0 },
    { stride: 0, slam: 0.85, spread: 0.85, jaw: 1, lean: 0 },
    { stride: -0.5, slam: 0.2, spread: 0.4, jaw: 0.9, lean: 1.5 },
  ], { stride: 0, slam: 0.6, spread: 0.7, jaw: 1, lean: 2 });
}

export function skullAtlas() {
  return buildFleshAtlas('skull', drawSkull, [
    { chatter: 0, flame: 0, sway: -1, hurt: 0 },
    { chatter: 0.35, flame: 0.15, sway: 1, hurt: 0 },
    { chatter: 1, flame: 1, sway: 0, hurt: 0 },
    { chatter: 0.8, flame: 0, sway: 2, hurt: 1 },
  ], { chatter: 1, flame: 0.5, sway: 2, hurt: 1 });
}

export function crawlerAtlas() {
  return buildFleshAtlas('crawler', drawCrawler, [
    { skitter: -1, lunge: 0, mandible: 0.1, hurt: 0 },
    { skitter: 1, lunge: 0.1, mandible: 0.35, hurt: 0 },
    { skitter: 0.5, lunge: 1, mandible: 1, hurt: 0 },
    { skitter: -0.8, lunge: 0.2, mandible: 0.8, hurt: 1 },
  ], { skitter: 1, lunge: 0.4, mandible: 1, hurt: 1 });
}

export function swarmerAtlas() {
  return buildFleshAtlas('swarmer', drawSwarmer, [
    { scurry: -1, bite: 0.1, hurt: 0 },
    { scurry: 1, bite: 0.35, hurt: 0 },
    { scurry: 0.6, bite: 1, hurt: 0 },
    { scurry: -0.8, bite: 0.8, hurt: 1 },
  ], { scurry: 0.8, bite: 1, hurt: 1 });
}

export const MONSTER_ATLASES = {
  wraith: wraithAtlas,
  imp: impAtlas,
  brute: bruteAtlas,
  boss: bossAtlas,
  skull: skullAtlas,
  crawler: crawlerAtlas,
  swarmer: swarmerAtlas,
};
