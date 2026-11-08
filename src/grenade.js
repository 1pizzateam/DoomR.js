/**
 * Half-Life 2 MK3A2-inspired fragmentation grenade projectile model and procedural RGBA texture atlas:
 * - Drawn procedurally as a crisp power-of-two RGBA atlas (32 x 32 per cell, 4 cells = 128 x 32):
 *   - Cell 0 (BODY): Dark olive-drab ordnance steel cylinder with horizontal fragmentation grooves,
 *     the signature Half-Life 2 crimson-red warning band, and yellow military stencil markings.
 *   - Cell 1 (RIB): Protruding serrated fragmentation grip ring with vertical knurling notches,
 *     beveled metallic highlights, and red hazard paint ticks.
 *   - Cell 2 (NECK): Machined gunmetal steel fuze collar, striker lever spine, rivets, and brass pull-pin ring.
 *   - Cell 3 (FUSE): Iconic Half-Life 2 glowing red-orange electronic timer cap and lens bezel.
 * - `grenadeParts()` builds the indexed `Cylinder` parts (`body`, four `ridges`, `neck`, `fuse`) with UVs mapped
 *   into the 4-cell atlas.
 * Everything here runs at build time, never per frame.
 */
import { Cylinder, Vec2, Vec3 } from '@1pizzateam/roostr';

export const GRENADE_CELL = 32;
export const GRENADE_FRAMES = 4;
export const GRENADE_SCALE = 0.45;
const GRENADE_CELLS = { body: 0, rib: 1, neck: 2, fuse: 3 };

const OLIVE = [
  [22, 26, 18],
  [36, 42, 28],
  [54, 62, 42],
  [72, 82, 54],
  [92, 104, 68],
  [114, 126, 84],
];

const CRIMSON = [
  [92, 20, 18],
  [148, 30, 24],
  [198, 44, 32],
  [236, 68, 42],
];

const STENCIL = [
  [176, 134, 36],
  [234, 188, 56],
];

const GUNMETAL = [
  [24, 28, 32],
  [46, 52, 58],
  [74, 82, 90],
  [108, 118, 128],
  [148, 160, 172],
  [192, 204, 214],
];

const BRASS = [
  [132, 102, 38],
  [196, 158, 62],
  [238, 202, 96],
];

const FUSE_LED = [
  [48, 18, 20],
  [124, 24, 22],
  [208, 42, 30],
  [248, 92, 38],
  [255, 156, 60],
  [255, 214, 112],
];

function cellPutter(data, atlasWidth, cell) {
  const S = GRENADE_CELL;
  const ox = cell * S;
  return (x, y, rgb) => {
    if (x < 0 || x >= S || y < 0 || y >= S || !rgb)
      return;
    const o = (y * atlasWidth + ox + x) * 4;
    data[o] = rgb[0];
    data[o + 1] = rgb[1];
    data[o + 2] = rgb[2];
    data[o + 3] = 255;
  };
}

function drawBodyCell(put) {
  const S = GRENADE_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = y === 0 || y === S - 1;
      const groove = y === 5 || y === 15 || y === 23 || y === 28;
      const bevel = y === 1 || y === 6 || y === 16 || y === 24;
      const seam = x === 0 || x === S - 1 || x === 15;
      const grain = ((x * 7 + y * 13) & 7) === 0;
      const highlight = x >= 6 && x <= 11;
      if (border || groove) {
        put(x, y, OLIVE[0]);
        continue;
      }
      if (y === 6 || y === 13) {
        put(x, y, seam ? STENCIL[0] : STENCIL[1]);
        continue;
      }
      if (y >= 7 && y <= 12) {
        const stripeShade = seam ? CRIMSON[0] : y === 7 || highlight ? CRIMSON[3] : y === 12 ? CRIMSON[1] : CRIMSON[2];
        put(x, y, stripeShade);
        continue;
      }
      if (seam) {
        put(x, y, OLIVE[1]);
        continue;
      }
      if (bevel) {
        put(x, y, highlight ? OLIVE[5] : OLIVE[4]);
        continue;
      }
      const base = highlight ? (grain ? OLIVE[4] : OLIVE[3]) : grain ? OLIVE[1] : OLIVE[2];
      put(x, y, base);
    }

  for (const [sx, sy] of [
    [4, 18], [5, 18], [7, 18], [8, 18], [10, 18], [11, 18], [13, 18],
    [4, 19], [7, 19], [10, 19], [13, 19],
    [4, 20], [5, 20], [7, 20], [8, 20], [10, 20], [11, 20], [13, 20],
    [19, 18], [20, 18], [22, 18], [24, 18], [25, 18],
    [19, 19], [22, 19], [25, 19],
    [19, 20], [20, 20], [22, 20], [24, 20], [25, 20],
  ])
    put(sx, sy, STENCIL[1]);
}

function drawRibCell(put) {
  const S = GRENADE_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const topShadow = y < 2 || y >= S - 2;
      const topBevel = y >= 2 && y <= 5;
      const bottomShadow = y >= S - 6 && y < S - 2;
      const notch = (x & 3) === 0;
      const notchBevel = (x & 3) === 1;
      const redTick = y >= 11 && y <= 19 && ((x >> 2) & 1) === 0 && !notch;
      if (topShadow) {
        put(x, y, OLIVE[0]);
        continue;
      }
      if (notch) {
        put(x, y, OLIVE[0]);
        continue;
      }
      if (redTick) {
        put(x, y, notchBevel || y <= 13 ? CRIMSON[3] : CRIMSON[2]);
        continue;
      }
      if (topBevel) {
        put(x, y, notchBevel ? OLIVE[5] : OLIVE[4]);
        continue;
      }
      if (bottomShadow) {
        put(x, y, OLIVE[1]);
        continue;
      }
      put(x, y, notchBevel ? OLIVE[4] : OLIVE[3]);
    }
}

function drawNeckCell(put) {
  const S = GRENADE_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = y === 0 || y === S - 1;
      const thread = y === 6 || y === 12 || y === 18 || y === 25;
      const bevel = y === 1 || y === 7 || y === 13 || y === 19;
      const leverSpine = x >= 13 && x <= 18;
      const leverEdge = x === 12 || x === 19;
      if (border || thread) {
        put(x, y, GUNMETAL[0]);
        continue;
      }
      if (leverEdge) {
        put(x, y, GUNMETAL[1]);
        continue;
      }
      if (leverSpine) {
        put(x, y, bevel ? GUNMETAL[5] : GUNMETAL[4]);
        continue;
      }
      if (bevel) {
        put(x, y, GUNMETAL[4]);
        continue;
      }
      put(x, y, ((x + y) & 3) === 0 ? GUNMETAL[3] : GUNMETAL[2]);
    }

  for (const [rx, ry] of [[5, 4], [26, 4], [5, 15], [26, 15], [15, 9], [15, 22]]) {
    put(rx, ry, GUNMETAL[5]);
    put(rx + 1, ry, GUNMETAL[3]);
    put(rx, ry + 1, GUNMETAL[1]);
    put(rx + 1, ry + 1, GUNMETAL[0]);
  }

  for (let y = 8; y <= 16; y++)
    for (let x = 21; x <= 28; x++) {
      const dx = x - 24.5;
      const dy = y - 12;
      const dist = Math.hypot(dx, dy);
      if (dist >= 2.2 && dist <= 3.8)
        put(x, y, dy < 0 ? BRASS[2] : BRASS[1]);
      else if (dist < 2.2 && dist >= 1.4)
        put(x, y, BRASS[0]);
    }
}

function drawFuseCell(put) {
  const S = GRENADE_CELL;
  const center = (S - 1) * 0.5;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dist = Math.hypot(x - center, y - center);
      const bandGlow = y >= 4 && y <= 14;
      if (dist > 13.5) {
        put(x, y, bandGlow ? FUSE_LED[2] : GUNMETAL[1]);
        continue;
      }
      if (dist > 10.5) {
        put(x, y, bandGlow ? FUSE_LED[3] : GUNMETAL[2]);
        continue;
      }
      if (dist > 7.5) {
        put(x, y, FUSE_LED[2]);
        continue;
      }
      if (dist > 4.2) {
        put(x, y, FUSE_LED[3]);
        continue;
      }
      if (dist > 2.0) {
        put(x, y, FUSE_LED[4]);
        continue;
      }
      put(x, y, FUSE_LED[5]);
    }
}

/** Returns the power-of-two RGBA texture atlas for the Half-Life 2 MK3A2 fragmentation grenade mesh. */
export function grenadeAtlas() {
  const width = GRENADE_CELL * GRENADE_FRAMES;
  const height = GRENADE_CELL;
  const data = new Uint8Array(width * height * 4);
  drawBodyCell(cellPutter(data, width, GRENADE_CELLS.body));
  drawRibCell(cellPutter(data, width, GRENADE_CELLS.rib));
  drawNeckCell(cellPutter(data, width, GRENADE_CELLS.neck));
  drawFuseCell(cellPutter(data, width, GRENADE_CELLS.fuse));
  return { name: 'grenade', data, width, height, cell: GRENADE_CELL, frames: GRENADE_FRAMES };
}

/**
 * Remaps a `Cylinder`'s UV coordinates so its lateral wall samples `sideCell` and its end caps sample `capCell`
 * within the 4-cell grenade atlas, with half-texel inset to prevent seam bleeding.
 */
export function skinGrenadeCylinder(cylinder, radialSegments, sideCell, capCell, heightSegments = 1) {
  const uvs = cylinder.uvs;
  const sideVerts = (radialSegments + 1) * (heightSegments + 1);
  const pad = 0.5 / (GRENADE_CELL * GRENADE_FRAMES);
  const sideU0 = sideCell / GRENADE_FRAMES + pad;
  const sideU1 = (sideCell + 1) / GRENADE_FRAMES - pad;
  const capU0 = capCell / GRENADE_FRAMES + pad;
  const capU1 = (capCell + 1) / GRENADE_FRAMES - pad;
  for (let i = 0; i < sideVerts; i++) {
    const o = i * 2;
    uvs[o] = sideU0 + uvs[o] * (sideU1 - sideU0);
    uvs[o + 1] = 0.04 + (1 - uvs[o + 1]) * 0.92;
  }
  for (let i = sideVerts; i < uvs.length / 2; i++) {
    const o = i * 2;
    uvs[o] = capU0 + uvs[o] * (capU1 - capU0);
    uvs[o + 1] = 0.06 + uvs[o + 1] * 0.88;
  }
  return cylinder;
}

/** Builds the UV-mapped indexed `Cylinder` geometry parts for the fragmentation grenade projectile. */
export function grenadeParts() {
  const body = skinGrenadeCylinder(
    new Cylinder(new Vec2(3.6, 4.4), 10, 12, 1, false),
    12,
    GRENADE_CELLS.body,
    GRENADE_CELLS.body
  );
  const ridges = [];
  for (let i = 0; i < 4; i++)
    ridges.push({
      geometry: skinGrenadeCylinder(
        new Cylinder(new Vec2(5.2, 5.2), 0.8, 12, 1, false),
        12,
        GRENADE_CELLS.rib,
        GRENADE_CELLS.body
      ),
      position: new Vec3(0, -3.6 + i * 2.4, 0),
    });
  const neck = {
    geometry: skinGrenadeCylinder(
      new Cylinder(new Vec2(2, 2), 2, 12, 1, false),
      12,
      GRENADE_CELLS.neck,
      GRENADE_CELLS.neck
    ),
    position: new Vec3(0, 6, 0),
  };
  const fuse = {
    geometry: skinGrenadeCylinder(
      new Cylinder(new Vec2(0.7, 0.7), 2, 8, 1, false),
      8,
      GRENADE_CELLS.fuse,
      GRENADE_CELLS.fuse
    ),
    position: new Vec3(0, 8, 0),
  };
  return { body, ridges, neck, fuse };
}
