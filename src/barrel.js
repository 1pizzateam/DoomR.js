import { Utils, Vec2 } from '@1pizzateam/spock';
import { mulberry32 } from './rng.js';
import { field, mix, plate, rivet, rust, SHADOW, Tile } from './floor.js';

const scratchPt = new Vec2();

/**
 * The skin of an explosive barrel: an orange oil drum, as a pixel-art atlas drawn here in code. The side is 128 x 64
 * (round the barrel and down it) with a hazard band, rolling hoops, two warning labels, weld seams and rust; the lid is
 * 64 x 64. A RoostR cylinder is wrapped in it by `skinBarrel`, which points its texture coordinates at the right part.
 */

const SIDE = { x: 0, width: 128, height: 64 };
const LID = { x: 128, width: 64, height: 64 };
export const BARREL_ATLAS = { width: 256, height: 64 };

const PAINT = [178, 96, 34];
const PAINT_LIGHT = [236, 140, 52];
const PAINT_DARK = [96, 48, 20];
const BAND_DARK = [26, 22, 28];
const BAND_PAINT = [218, 124, 38];
const LABEL = [172, 178, 190];
const LABEL_INK = [34, 22, 22];

function paint(t, x0, y0, w, h, rnd, top) {
  for (let y = y0; y < y0 + h; y++) {
    // lighter towards the top, as if lit from above
    const shade = 1.08 - ((y - y0) / h) * (top ? 0.34 : 0.2);
    for (let x = x0; x < x0 + w; x++) {
      const grain = 1 + (rnd() - 0.5) * 0.1;
      t.set(x, y, [PAINT[0] * shade * grain, PAINT[1] * shade * grain, PAINT[2] * shade * grain]);
    }
  }
}

/** A flame: a teardrop with a notch cut out of it, in dark ink on a pale plate. */
function flameLabel(t, cx, cy) {
  t.rect(cx - 12, cy - 8, 24, 17, LABEL);
  for (let i = 0; i < 24; i++) {
    t.set(cx - 12 + i, cy - 8, LABEL_INK);
    t.set(cx - 12 + i, cy + 8, LABEL_INK);
  }
  for (let i = 0; i < 17; i++) {
    t.set(cx - 12, cy - 8 + i, LABEL_INK);
    t.set(cx + 11, cy - 8 + i, LABEL_INK);
  }
  // the flame: pointed at the top, round at the bottom, leaning a little, with a smaller one cut out of its belly
  const flame = (height, scale, ink, lift) => {
    for (let dy = 0; dy < height; dy++) {
      const k = (dy + 0.5) / height;
      const half = 5.6 * scale * Math.pow(k, 0.6) * Math.sqrt(1 - Math.pow(k, 4));
      const lean = 2.2 * scale * (1 - k) * (1 - k);
      for (let x = Math.round(cx + lean - half); x <= Math.round(cx + lean + half); x++)
        t.set(x, cy - 7 + lift + dy, ink);
    }
  };
  flame(15, 1, LABEL_INK, 0);
  flame(8, 0.5, LABEL, 6);
}

function drawSide(rnd) {
  const t = new Tile(SIDE.width, SIDE.height);
  paint(t, 0, 0, SIDE.width, SIDE.height, rnd, true);

  // the top and bottom rims
  for (let x = 0; x < SIDE.width; x++) {
    t.set(x, 0, PAINT_LIGHT, 0.9);
    t.set(x, 1, PAINT_LIGHT, 0.4);
    t.set(x, 4, PAINT_DARK, 0.9);
    t.set(x, 5, PAINT_DARK, 0.4);
    t.set(x, 58, PAINT_LIGHT, 0.5);
    t.set(x, 59, PAINT_DARK, 0.7);
    t.set(x, 63, SHADOW);
    t.set(x, 62, SHADOW, 0.6);
  }
  // the rolling hoops: raised rings with a light edge above and a dark one below
  for (const y of [13, 52])
    for (let x = 0; x < SIDE.width; x++) {
      t.set(x, y, PAINT_LIGHT, 0.85);
      t.set(x, y + 1, mix(PAINT, PAINT_LIGHT, 0.45));
      t.set(x, y + 2, mix(PAINT, PAINT_LIGHT, 0.25));
      t.set(x, y + 3, PAINT_DARK, 0.95);
      t.set(x, y + 4, SHADOW, 0.5);
    }

  // the hazard band
  const wear = field(rnd, 10);
  for (let y = 21; y < 32; y++)
    for (let x = 0; x < SIDE.width; x++) {
      const stripe = Math.floor((x - y * 1.0 + 256) / 7) % 2 === 0;
      const worn = wear(x, y * 3) > 0.68;
      t.set(x, y, stripe ? mix(BAND_PAINT, PAINT_DARK, worn ? 0.55 : 0.05) : BAND_DARK, 0.97);
    }
  for (let x = 0; x < SIDE.width; x++) {
    t.set(x, 20, SHADOW, 0.85);
    t.set(x, 32, SHADOW, 0.85);
    t.set(x, 33, PAINT_DARK, 0.4);
  }

  // two warning labels, on opposite sides, so one is always in view
  flameLabel(t, 32, 42);
  flameLabel(t, 96, 42);

  // weld seams, where the sheet meets itself
  for (const x of [0, 64])
    for (let y = 5; y < 58; y++) {
      t.set(x, y, PAINT_DARK, 0.9);
      t.set(x + 1, y, PAINT_LIGHT, 0.25);
    }
  // dents and scrapes
  for (let k = 0; k < 14; k++) {
    const x = Math.floor(rnd() * SIDE.width);
    const y = 6 + Math.floor(rnd() * 50);
    const length = 3 + Math.floor(rnd() * 8);
    for (let d = 0; d < length; d++)
      t.set(x + d, y + (d >> 2), k % 2 ? PAINT_LIGHT : PAINT_DARK, 0.5);
  }
  rust(t, rnd, 0.3);
  return t;
}

function drawLid(rnd) {
  const t = new Tile(LID.width, LID.height);
  paint(t, 0, 0, LID.width, LID.height, rnd, false);
  const cx = 31.5;
  const cy = 31.5;
  for (let y = 0; y < LID.height; y++)
    for (let x = 0; x < LID.width; x++) {
      const d = scratchPt.setScalar(x - cx, y - cy).getMagnitude();
      if (d > 29 && d <= 31)
        t.set(x, y, PAINT_LIGHT, 0.9);
      else if (d > 27 && d <= 29)
        t.set(x, y, PAINT_DARK, 0.9);
      else if (d > 21 && d <= 22.6)
        t.set(x, y, PAINT_DARK);
      else if (d > 22.6 && d <= 23.6)
        t.set(x, y, PAINT_LIGHT, 0.5);
    }
  // two bungs
  for (const [bx, by, r] of [[22, 30, 7], [44, 38, 4.5]]) {
    for (let y = 0; y < LID.height; y++)
      for (let x = 0; x < LID.width; x++) {
        const d = scratchPt.setScalar(x - bx, y - by).getMagnitude();
        if (d <= r - 1.5)
          t.set(x, y, mix(PAINT, SHADOW, 0.35));
        else if (d <= r)
          t.set(x, y, PAINT_LIGHT, 0.8);
        else if (d <= r + 1)
          t.set(x, y, SHADOW, 0.8);
      }
    for (let d = -r + 2; d <= r - 2; d++) {
      t.set(bx + d, by, SHADOW);
      t.set(bx, by + d, SHADOW);
    }
  }
  for (const [x, y] of [[8, 8], [55, 8], [8, 55], [55, 55]])
    rivet(t, x, y);
  rust(t, rnd, 0.35);
  return t;
}

/** The atlas as RGBA pixels, ready to be a texture; its size is a power of two, so it can have mipmaps. */
export function barrelAtlas() {
  const { width, height } = BARREL_ATLAS;
  const data = new Uint8Array(width * height * 4);
  const blit = (tile, x0) => {
    for (let y = 0; y < tile.height; y++)
      for (let x = 0; x < tile.width; x++) {
        const i = (y * tile.width + x) * 3;
        const o = (y * width + x0 + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(tile.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  };
  blit(drawSide(mulberry32(31337)), SIDE.x);
  blit(drawLid(mulberry32(4242)), LID.x);
  // the rest is bare dark steel, for nothing in particular
  const spare = new Tile(width - SIDE.width - LID.width, height);
  plate(spare, 0, 0, spare.width, spare.height, mulberry32(7));
  blit(spare, LID.x + LID.width);
  return { name: 'barrel', data, width, height, side: SIDE, lid: LID };
}

/**
 * Points a RoostR Cylinder's texture coordinates at the barrel atlas: the side wraps round the left half, the caps
 * show the lid. `radialSegments` and `heightSegments` are the ones the cylinder was made with, and the caps are left
 * open at the ends of the index list, so the side comes first.
 */
export function skinBarrel(cylinder, radialSegments, heightSegments = 1) {
  const sideVertices = (radialSegments + 1) * (heightSegments + 1);
  const { uvs } = cylinder;
  const { width } = BARREL_ATLAS;
  const inset = 0.25 / width;
  for (let i = 0; i < uvs.length / 2; i++) {
    const u = uvs[i * 2];
    uvs[i * 2] = i < sideVertices
      ? (SIDE.x + u * SIDE.width) / width + (u === 0 ? inset : u === 1 ? -inset : 0)
      : (LID.x + u * LID.width) / width + (u === 0 ? inset : u === 1 ? -inset : 0);
  }
  return cylinder;
}
