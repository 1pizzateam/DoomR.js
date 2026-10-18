/**
 * The medikit pickup as a 3D textured mesh:
 * - Drawn procedurally in code as a crisp power-of-two RGBA pixel-art atlas (32 x 32 per cell, 4 cells = 128 x 32):
 *   - Cell 0 (FRONT/BACK): White/steel trauma case face with embossed red medical cross, clasps & emerald bio-LED bar.
 *   - Cell 1 (SIDE): Molded side panel with structural ribs, dark bumper base & steel compression latch.
 *   - Cell 2 (TOP): Top lid plate with a bold central red cross and corner rivets, visible when looking down.
 *   - Cell 3 (HANDLE/BASE): Dark gunmetal steel & textured grip for the 3D carry handle arch and rubberized base.
 * - `medikitMesh()` builds the 3D geometry (main case + raised 3D top carry handle posts and crossbar).
 */

export const MEDIKIT_CELL = 32;
export const MEDIKIT_FRAMES = 4;
export const MEDIKIT_CELLS = { front: 0, side: 1, top: 2, handle: 3 };

const CASE_PALETTE = [
  [18, 24, 32],
  [36, 46, 60],
  [64, 78, 98],
  [104, 122, 144],
  [148, 166, 188],
  [192, 208, 224],
  [226, 236, 246],
  [248, 252, 255]
];

const CROSS_PALETTE = [
  [76, 10, 18],
  [128, 14, 24],
  [184, 20, 32],
  [228, 34, 46],
  [255, 86, 96]
];

const BIO_LED = [
  [16, 68, 48],
  [32, 138, 92],
  [56, 214, 142],
  [156, 255, 204]
];

function cellPutter(data, atlasWidth, cell) {
  const S = MEDIKIT_CELL;
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

function drawCross(put, cx, cy, armHalf, thickHalf) {
  for (let dy = -armHalf; dy <= armHalf; dy++)
    for (let dx = -armHalf; dx <= armHalf; dx++) {
      const vert = Math.abs(dx) <= thickHalf;
      const horiz = Math.abs(dy) <= thickHalf;
      if (!vert && !horiz)
        continue;
      const hi = (vert && dy === -armHalf) || (horiz && dy === -thickHalf && Math.abs(dx) > thickHalf) || (vert && dx === -thickHalf && dy < -thickHalf);
      const lo = (vert && dy === armHalf) || (horiz && dy === thickHalf && Math.abs(dx) > thickHalf) || (vert && dx === thickHalf && dy > thickHalf);
      put(cx + dx, cy + dy, lo ? CROSS_PALETTE[1] : hi ? CROSS_PALETTE[4] : CROSS_PALETTE[3]);
    }
}

function drawFrontCell(put) {
  const S = MEDIKIT_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      if (border) {
        put(x, y, CASE_PALETTE[1]);
        continue;
      }
      if (y >= 26) {
        put(x, y, y === 26 ? CASE_PALETTE[0] : CASE_PALETTE[2]);
        continue;
      }
      if (y === 6) {
        put(x, y, CASE_PALETTE[1]);
        continue;
      }
      const bevel = y === 1 || x === 1 || (y === 7 && x >= 3 && x <= 28);
      put(x, y, bevel ? CASE_PALETTE[7] : y > 22 ? CASE_PALETTE[5] : CASE_PALETTE[6]);
    }

  // Recessed central emblem well
  for (let y = 9; y <= 23; y++)
    for (let x = 8; x <= 23; x++) {
      const rimTL = y === 9 || x === 8;
      const rimBR = y === 23 || x === 23;
      put(x, y, rimTL ? CASE_PALETTE[3] : rimBR ? CASE_PALETTE[7] : CASE_PALETTE[5]);
    }

  // Bold crimson medical cross
  drawCross(put, 15, 16, 5, 2);

  // Steel lid clasps
  for (const lx of [5, 25])
    for (let y = 5; y <= 8; y++) {
      put(lx, y, y === 6 ? CASE_PALETTE[7] : CASE_PALETTE[2]);
      put(lx + 1, y, y === 6 ? CASE_PALETTE[4] : CASE_PALETTE[1]);
    }

  // Glowing emerald bio-status LED bar across upper bezel
  for (let x = 10; x <= 21; x++) {
    put(x, 2, CASE_PALETTE[0]);
    put(x, 3, (x === 12 || x === 15 || x === 19) ? BIO_LED[3] : BIO_LED[2]);
    put(x, 4, BIO_LED[1]);
  }
}

function drawSideCell(put) {
  const S = MEDIKIT_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      if (border) {
        put(x, y, CASE_PALETTE[1]);
        continue;
      }
      if (y >= 26) {
        put(x, y, y === 26 ? CASE_PALETTE[0] : CASE_PALETTE[2]);
        continue;
      }
      if (y === 6) {
        put(x, y, CASE_PALETTE[1]);
        continue;
      }
      const rib = y >= 11 && y <= 21 && ((y - 11) % 3 === 0) && x >= 6 && x <= 25;
      put(x, y, rib ? CASE_PALETTE[3] : y === 1 || x === 1 ? CASE_PALETTE[7] : CASE_PALETTE[5]);
    }

  // Heavy side compression latch
  for (let y = 10; y <= 19; y++)
    for (let x = 12; x <= 19; x++) {
      const edge = x === 12 || x === 19 || y === 10 || y === 19;
      put(x, y, edge ? CASE_PALETTE[1] : y === 14 ? BIO_LED[2] : CASE_PALETTE[3]);
    }
}

function drawTopCell(put) {
  const S = MEDIKIT_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      const bevel = x === 1 || y === 1 || x === S - 2 || y === S - 2;
      put(x, y, border ? CASE_PALETTE[1] : bevel ? CASE_PALETTE[7] : CASE_PALETTE[6]);
    }
  // Recessed top medallion & red cross
  for (let y = 7; y <= 24; y++)
    for (let x = 7; x <= 24; x++) {
      const edge = x === 7 || x === 24 || y === 7 || y === 24;
      put(x, y, edge ? CASE_PALETTE[3] : CASE_PALETTE[5]);
    }
  drawCross(put, 15, 15, 6, 2);
  // Corner emerald bio-status indicators
  for (const [cx, cy] of [[4, 4], [26, 4], [4, 26], [26, 26]]) {
    put(cx, cy, BIO_LED[2]);
    put(cx + 1, cy, BIO_LED[3]);
  }
}

function drawHandleCell(put) {
  const S = MEDIKIT_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const knurl = ((x + y) & 1) === 0;
      put(x, y, y < 4 || y > S - 5 ? CASE_PALETTE[3] : knurl ? CASE_PALETTE[1] : CASE_PALETTE[0]);
    }
}

/** Returns the power-of-two RGBA texture atlas for the 3D medikit mesh. */
export function medikitAtlas() {
  const width = MEDIKIT_CELL * MEDIKIT_FRAMES;
  const height = MEDIKIT_CELL;
  const data = new Uint8Array(width * height * 4);
  drawFrontCell(cellPutter(data, width, MEDIKIT_CELLS.front));
  drawSideCell(cellPutter(data, width, MEDIKIT_CELLS.side));
  drawTopCell(cellPutter(data, width, MEDIKIT_CELLS.top));
  drawHandleCell(cellPutter(data, width, MEDIKIT_CELLS.handle));
  return { name: 'medikit', data, width, height, cell: MEDIKIT_CELL, frames: MEDIKIT_FRAMES };
}

function pushBox(vertices, uvs, x0, y0, z0, x1, y1, z1, faces) {
  const quads = [
    [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], faces.front],
    [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], faces.back],
    [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], faces.right],
    [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], faces.left],
    [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], faces.top],
    [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], faces.bottom],
  ];
  const inset = 0.35 / (MEDIKIT_CELL * MEDIKIT_FRAMES);
  for (const [c0, c1, c2, c3, cell] of quads) {
    const u0 = cell / MEDIKIT_FRAMES + inset;
    const u1 = (cell + 1) / MEDIKIT_FRAMES - inset;
    const quadUvs = [[u0, 1], [u1, 1], [u1, 0], [u0, 0]];
    const corners = [c0, c1, c2, c3];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      vertices.push(...corners[k]);
      uvs.push(...quadUvs[k]);
    }
  }
}

/**
 * Builds the 3D medikit geometry: main armored case standing on y = 0 plus a 3D carry handle arch on top.
 */
export function medikitMesh() {
  const vertices = [];
  const uvs = [];
  const hx = 8.5;
  const hy = 12.5;
  const hz = 5.5;

  // 1. Main armored medikit box
  pushBox(vertices, uvs, -hx, 0, -hz, hx, hy, hz, {
    front: MEDIKIT_CELLS.front,
    back: MEDIKIT_CELLS.front,
    left: MEDIKIT_CELLS.side,
    right: MEDIKIT_CELLS.side,
    top: MEDIKIT_CELLS.top,
    bottom: MEDIKIT_CELLS.handle,
  });

  // 2. 3D top carry handle arch (left post, right post, and top grip bar)
  const hFaces = {
    front: MEDIKIT_CELLS.handle,
    back: MEDIKIT_CELLS.handle,
    left: MEDIKIT_CELLS.handle,
    right: MEDIKIT_CELLS.handle,
    top: MEDIKIT_CELLS.handle,
    bottom: MEDIKIT_CELLS.handle,
  };
  pushBox(vertices, uvs, -4.2, hy, -1.1, -2.6, hy + 2.6, 1.1, hFaces);
  pushBox(vertices, uvs, 2.6, hy, -1.1, 4.2, hy + 2.6, 1.1, hFaces);
  pushBox(vertices, uvs, -4.2, hy + 1.8, -1.2, 4.2, hy + 3.2, 1.2, hFaces);

  return { vertices: new Float32Array(vertices), uvs: new Float32Array(uvs) };
}
