/**
 * The supply chest (cache) as a 3D textured mesh with a hinged lid:
 * - Drawn procedurally as a crisp power-of-two RGBA atlas (32 x 32 per cell, 4 cells = 128 x 32):
 *   - Cell 0 (LID SEAL): Riveted lid plate with a hazard-striped seal band.
 *   - Cell 1 (LATCH): Steel latch plate with a lit status lamp.
 *   - Cell 2 (SIDE PANEL): Ribbed side panel with dark bumper edges.
 *   - Cell 3 (INTERIOR GLOW): Bright green glow with a darker rim, seen once the lid is up.
 * - `chestBodyMesh()` and `chestLidMesh()` build the two parts; the lid hinge sits at its local origin.
 * - The lid stops at about 80 degrees so a chest placed 14 units toward a wall (body back 5 units off the wall face) keeps every lid vertex at least 1 unit in front of the wall.
 * Everything here runs at build time, never per frame.
 */
import { Vec3 } from '@1pizzateam/spock';

export const CHEST_CELL = 32;
export const CHEST_FRAMES = 4;
const CHEST_CELLS = { lidSeal: 0, latch: 1, sidePanel: 2, interiorGlow: 3 };
const CHEST_SIZE = new Vec3(40, 18, 26);
export const CHEST_LID_HINGE = new Vec3(0, 18, -13);
export const CHEST_LID_OPEN_ANGLE = 1.4;
export const CHEST_TINTS = {
  closed: new Vec3(1, 1, 1),
  open: new Vec3(1, 1, 1),
  emptied: new Vec3(0.45, 0.45, 0.5),
};

const STEEL = [
  [16, 20, 26],
  [38, 46, 56],
  [66, 78, 92],
  [102, 118, 134],
  [146, 162, 178],
  [196, 208, 220],
];

const HAZARD = [
  [250, 196, 28],
  [28, 28, 32],
];

const LAMP = [
  [20, 84, 40],
  [44, 190, 84],
  [170, 255, 190],
];

const GLOW = [
  [10, 70, 40],
  [24, 140, 76],
  [60, 220, 130],
  [190, 255, 214],
];

const LID_HEIGHT = 4;
const LID_DEPTH = 27;

function cellPutter(data, atlasWidth, cell) {
  const S = CHEST_CELL;
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

function drawLidSealCell(put) {
  const S = CHEST_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      const bevel = x === 1 || y === 1;
      put(x, y, border ? STEEL[0] : bevel ? STEEL[4] : STEEL[3]);
    }
  for (let y = 12; y <= 19; y++)
    for (let x = 1; x < S - 1; x++)
      put(x, y, ((x + y) >> 2) & 1 ? HAZARD[0] : HAZARD[1]);
  for (const [cx, cy] of [[4, 4], [27, 4], [4, 27], [27, 27]]) {
    put(cx, cy, STEEL[5]);
    put(cx + 1, cy, STEEL[2]);
    put(cx, cy + 1, STEEL[2]);
    put(cx + 1, cy + 1, STEEL[0]);
  }
}

function drawLatchCell(put) {
  const S = CHEST_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      put(x, y, border ? STEEL[0] : x === 1 || y === 1 ? STEEL[4] : STEEL[2]);
    }
  for (let y = 8; y <= 23; y++)
    for (let x = 9; x <= 22; x++) {
      const edge = x === 9 || x === 22 || y === 8 || y === 23;
      put(x, y, edge ? STEEL[1] : y < 15 ? STEEL[4] : STEEL[3]);
    }
  for (let y = 17; y <= 20; y++)
    for (let x = 13; x <= 18; x++)
      put(x, y, x === 13 || x === 18 || y === 17 || y === 20 ? LAMP[0] : x < 15 && y < 19 ? LAMP[2] : LAMP[1]);
}

function drawSidePanelCell(put) {
  const S = CHEST_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      if (border || y >= 28) {
        put(x, y, border ? STEEL[0] : STEEL[1]);
        continue;
      }
      const rib = y >= 5 && y <= 25 && (x - 5) % 7 === 0;
      put(x, y, rib ? STEEL[4] : x === 1 || y === 1 ? STEEL[4] : STEEL[2]);
    }
}

function drawInteriorGlowCell(put) {
  const S = CHEST_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const edge = Math.min(x, y, S - 1 - x, S - 1 - y);
      put(x, y, edge < 2 ? GLOW[0] : edge < 5 ? GLOW[1] : edge < 9 ? GLOW[2] : GLOW[3]);
    }
}

/** Returns the power-of-two RGBA texture atlas for the supply chest meshes. */
export function chestAtlas() {
  const width = CHEST_CELL * CHEST_FRAMES;
  const height = CHEST_CELL;
  const data = new Uint8Array(width * height * 4);
  drawLidSealCell(cellPutter(data, width, CHEST_CELLS.lidSeal));
  drawLatchCell(cellPutter(data, width, CHEST_CELLS.latch));
  drawSidePanelCell(cellPutter(data, width, CHEST_CELLS.sidePanel));
  drawInteriorGlowCell(cellPutter(data, width, CHEST_CELLS.interiorGlow));
  return { name: 'chest', data, width, height, cell: CHEST_CELL, frames: CHEST_FRAMES };
}

const QUAD_ORDER = [0, 1, 2, 0, 2, 3];

function pushQuad(vertices, uvs, corners, cell) {
  const inset = 0.35 / (CHEST_CELL * CHEST_FRAMES);
  const u0 = cell / CHEST_FRAMES + inset;
  const u1 = (cell + 1) / CHEST_FRAMES - inset;
  const quadUvs = [[u0, 1], [u1, 1], [u1, 0], [u0, 0]];
  for (const k of QUAD_ORDER) {
    vertices.push(...corners[k]);
    uvs.push(...quadUvs[k]);
  }
}

function pushBox(vertices, uvs, x0, y0, z0, x1, y1, z1, faces) {
  const quads = [
    [[[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], faces.front],
    [[[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], faces.back],
    [[[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], faces.right],
    [[[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], faces.left],
    [[[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], faces.top],
    [[[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], faces.bottom],
  ];
  for (const [corners, cell] of quads) {
    if (cell !== undefined && cell !== null)
      pushQuad(vertices, uvs, corners, cell);
  }
}

/** Chest body standing on y = 0, centred on x/z, front facing local +Z; the top is open onto the glowing interior. */
export function chestBodyMesh() {
  const vertices = [];
  const uvs = [];
  const hx = CHEST_SIZE.x / 2;
  const hz = CHEST_SIZE.z / 2;
  const hy = CHEST_SIZE.y;
  pushBox(vertices, uvs, -hx, 0, -hz, hx, hy, hz, {
    front: CHEST_CELLS.latch,
    back: CHEST_CELLS.sidePanel,
    left: CHEST_CELLS.sidePanel,
    right: CHEST_CELLS.sidePanel,
    bottom: CHEST_CELLS.sidePanel,
  });
  const y = hy - 2;
  pushQuad(vertices, uvs, [[-hx + 2, y, hz - 2], [hx - 2, y, hz - 2], [hx - 2, y, -hz + 2], [-hx + 2, y, -hz + 2]], CHEST_CELLS.interiorGlow);
  pushBox(vertices, uvs, -3, 9, hz, 3, 15, hz + 1.5, { front: CHEST_CELLS.latch, left: CHEST_CELLS.latch, right: CHEST_CELLS.latch, top: CHEST_CELLS.latch });
  return { vertices: new Float32Array(vertices), uvs: new Float32Array(uvs) };
}

/** Chest lid with the hinge at the local origin; a negative X rotation lifts the +Z edge. */
export function chestLidMesh() {
  const vertices = [];
  const uvs = [];
  const hx = CHEST_SIZE.x / 2 + 0.5;
  pushBox(vertices, uvs, -hx, 0, 0, hx, LID_HEIGHT, LID_DEPTH, {
    front: CHEST_CELLS.sidePanel,
    back: CHEST_CELLS.sidePanel,
    left: CHEST_CELLS.sidePanel,
    right: CHEST_CELLS.sidePanel,
    top: CHEST_CELLS.lidSeal,
    bottom: CHEST_CELLS.sidePanel,
  });
  pushBox(vertices, uvs, -3, -5, LID_DEPTH - 1.5, 3, 0, LID_DEPTH, {
    front: CHEST_CELLS.latch,
    left: CHEST_CELLS.latch,
    right: CHEST_CELLS.latch,
    top: CHEST_CELLS.latch,
  });
  return { vertices: new Float32Array(vertices), uvs: new Float32Array(uvs) };
}
