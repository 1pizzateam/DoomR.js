/**
 * Classic Doom UAC security keycard pickups (Red, Yellow, Blue) as 3D textured meshes:
 * - Drawn procedurally in code as a crisp power-of-two RGBA pixel-art atlas (32 x 32 per cell, 4 cells = 128 x 32):
 *   - Cell 0 (FRONT): Color-coded security pass face with glowing status LED bar, gold microchip pad & magnetic code stripe.
 *   - Cell 1 (SIDE): Beveled metallic titanium edge rail with illuminated security trim.
 *   - Cell 2 (TOP): Ribbed security pass header cap with glowing status beacon strip.
 *   - Cell 3 (GRIP): Heavy dark-steel top grip collar with recessed lanyard slot and hazard chevrons.
 * - `keycardMesh()` builds the 3D UAC security keycard geometry: main pass slab, raised top grip collar, and protruding LED header.
 */

export const KEYCARD_CELL = 32;
export const KEYCARD_FRAMES = 4;
export const KEYCARD_CELLS = { front: 0, side: 1, top: 2, grip: 3 };
export const KEYCARD_COLORS = ['red', 'yellow', 'blue'];

const PALETTES = {
  red: [
    [48, 6, 12],
    [98, 12, 22],
    [164, 18, 34],
    [224, 32, 48],
    [255, 88, 96],
    [255, 184, 184],
  ],
  yellow: [
    [54, 36, 6],
    [108, 76, 12],
    [176, 128, 18],
    [236, 184, 32],
    [255, 226, 78],
    [255, 248, 184],
  ],
  blue: [
    [8, 22, 58],
    [16, 48, 116],
    [28, 86, 184],
    [54, 134, 242],
    [108, 186, 255],
    [196, 232, 255],
  ],
};

const STEEL = [
  [14, 18, 26],
  [28, 34, 46],
  [52, 64, 82],
  [88, 106, 132],
  [142, 164, 194],
];

const GOLD = [
  [78, 54, 14],
  [138, 98, 24],
  [204, 156, 42],
  [248, 212, 86],
];

function cellPutter(data, atlasWidth, cell) {
  const S = KEYCARD_CELL;
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

function drawFrontCell(put, pal) {
  const S = KEYCARD_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      if (border) {
        put(x, y, STEEL[0]);
        continue;
      }
      if (x === 1 || x === S - 2 || y === 1 || y === S - 2) {
        put(x, y, pal[4]);
        continue;
      }
      // Top glowing security status beacon strip
      if (y >= 3 && y <= 7 && x >= 4 && x <= S - 5) {
        const core = y >= 4 && y <= 6 && x >= 6 && x <= S - 7;
        put(x, y, core ? pal[5] : pal[4]);
        continue;
      }
      // Metallic divider groove under beacon
      if (y === 8 || y === 9) {
        put(x, y, y === 8 ? STEEL[0] : STEEL[3]);
        continue;
      }
      // Gold UAC security microchip contact pad on left
      if (y >= 12 && y <= 19 && x >= 5 && x <= 12) {
        const grid = x === 8 || x === 9 || y === 15;
        const rim = x === 5 || x === 12 || y === 12 || y === 19;
        put(x, y, rim ? GOLD[0] : grid ? GOLD[1] : GOLD[3]);
        continue;
      }
      // Luminous security clearance bars on right
      if (y >= 12 && y <= 19 && x >= 15 && x <= 26) {
        const barRow = (y - 12) % 3 !== 2;
        put(x, y, barRow ? (x < 23 ? pal[4] : pal[5]) : pal[1]);
        continue;
      }
      // Dark magnetic optical code stripe near bottom
      if (y >= 22 && y <= 26 && x >= 4 && x <= S - 5) {
        const bit = ((x * 3 + y) & 3) === 0;
        put(x, y, bit ? pal[4] : STEEL[0]);
        continue;
      }
      // Anodized color-coded keycard body with subtle diagonal sheen
      const sheen = x + y;
      const shade = sheen < 22 ? 4 : sheen < 38 ? 3 : 2;
      put(x, y, pal[shade]);
    }
}

function drawSideCell(put, pal) {
  const S = KEYCARD_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (x === 0 || x === S - 1 || y === 0 || y === S - 1) {
        put(x, y, STEEL[0]);
        continue;
      }
      // Center illuminated edge waveguide strip
      if (x >= 11 && x <= 20) {
        const core = x >= 14 && x <= 17;
        put(x, y, (y & 3) === 0 ? pal[2] : core ? pal[5] : pal[4]);
        continue;
      }
      put(x, y, x < 11 ? STEEL[3] : STEEL[2]);
    }
}

function drawTopCell(put, pal) {
  const S = KEYCARD_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (x === 0 || x === S - 1 || y === 0 || y === S - 1) {
        put(x, y, STEEL[0]);
        continue;
      }
      // Glowing top status strip
      if (y >= 10 && y <= 21 && x >= 5 && x <= S - 6) {
        const core = y >= 13 && y <= 18;
        put(x, y, core ? pal[5] : pal[4]);
        continue;
      }
      put(x, y, (x + y) % 2 === 0 ? pal[3] : pal[2]);
    }
}

function drawGripCell(put, pal) {
  const S = KEYCARD_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (x === 0 || x === S - 1 || y === 0 || y === S - 1) {
        put(x, y, STEEL[0]);
        continue;
      }
      // Recessed lanyard slot in center of top grip
      if (y >= 9 && y <= 16 && x >= 8 && x <= 23) {
        const rim = y === 9 || y === 16 || x === 8 || x === 23;
        put(x, y, rim ? STEEL[3] : STEEL[0]);
        continue;
      }
      // Color-coded security stripe along lower collar edge
      if (y >= 22 && y <= 27) {
        const chevron = ((x + y) & 3) < 2;
        put(x, y, chevron ? pal[4] : STEEL[1]);
        continue;
      }
      const rib = (y & 1) === 0 ? STEEL[3] : STEEL[2];
      put(x, y, rib);
    }
}

/** Returns the power-of-two RGBA texture atlas for a Red, Yellow, or Blue 3D keycard mesh. */
export function keycardAtlas(color = 'red') {
  const pal = PALETTES[color] ?? PALETTES.red;
  const width = KEYCARD_CELL * KEYCARD_FRAMES;
  const height = KEYCARD_CELL;
  const data = new Uint8Array(width * height * 4);
  drawFrontCell(cellPutter(data, width, KEYCARD_CELLS.front), pal);
  drawSideCell(cellPutter(data, width, KEYCARD_CELLS.side), pal);
  drawTopCell(cellPutter(data, width, KEYCARD_CELLS.top), pal);
  drawGripCell(cellPutter(data, width, KEYCARD_CELLS.grip), pal);
  return { name: `${color}Key`, data, width, height, cell: KEYCARD_CELL, frames: KEYCARD_FRAMES };
}

function pushQuad(vertices, uvs, c0, c1, c2, c3, u0, v0, u1, v1) {
  const corners = [c0, c1, c2, c3];
  const quadUvs = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
  for (const k of [0, 1, 2, 0, 2, 3]) {
    vertices.push(...corners[k]);
    uvs.push(...quadUvs[k]);
  }
}

function cellRange(cell) {
  const inset = 0.35 / (KEYCARD_CELL * KEYCARD_FRAMES);
  return [cell / KEYCARD_FRAMES + inset, (cell + 1) / KEYCARD_FRAMES - inset];
}

function pushBox(vertices, uvs, x0, y0, z0, x1, y1, z1, frontCell, sideCell, topCell) {
  const [uf0, uf1] = cellRange(frontCell);
  const [us0, us1] = cellRange(sideCell);
  const [ut0, ut1] = cellRange(topCell);

  // Front (+Z) and Back (-Z)
  pushQuad(vertices, uvs, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], uf0, 0, uf1, 1);
  pushQuad(vertices, uvs, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], uf0, 0, uf1, 1);
  // Right (+X) and Left (-X)
  pushQuad(vertices, uvs, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], us0, 0, us1, 1);
  pushQuad(vertices, uvs, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], us0, 0, us1, 1);
  // Top (+Y) and Bottom (-Y)
  pushQuad(vertices, uvs, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], ut0, 0, ut1, 1);
  pushQuad(vertices, uvs, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], ut0, 0, ut1, 1);
}

/**
 * Builds the 3D UAC security keycard geometry:
 * - Main anodized keycard slab with microchip & optical stripe
 * - Raised armoured top grip collar with lanyard slot
 * - Glowing lower holoprojector / bevel bumper
 */
export function keycardMesh() {
  const vertices = [];
  const uvs = [];

  // Main keycard pass body
  pushBox(vertices, uvs, -5.2, 1.0, -1.1, 5.2, 13.6, 1.1, KEYCARD_CELLS.front, KEYCARD_CELLS.side, KEYCARD_CELLS.top);

  // Heavy top grip collar & beacon cap
  pushBox(vertices, uvs, -5.8, 12.6, -1.65, 5.8, 16.4, 1.65, KEYCARD_CELLS.grip, KEYCARD_CELLS.side, KEYCARD_CELLS.top);

  // Lower beveled contact bumper
  pushBox(vertices, uvs, -4.6, 0.0, -1.4, 4.6, 1.6, 1.4, KEYCARD_CELLS.side, KEYCARD_CELLS.side, KEYCARD_CELLS.top);

  return { vertices: new Float32Array(vertices), uvs: new Float32Array(uvs) };
}
