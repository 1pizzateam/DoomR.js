import { Utils, Vec2 } from '@1pizzateam/spock';

/**
 * Classic Doom Supercharge Powerups as 3D textured meshes:
 * - Soulsphere ('soulsphere', map symbol 'O'):
 *   Glowing cobalt-cyan crystalline orb with an agonized soul visage inside a faceted 3D sphere + energy ring.
 *   Grants +100 Health above the normal cap (up to 200% Health).
 * - Berserk Pack ('berserk', map symbol 'Z'):
 *   Matte-black tactical stimulant trauma case with a blazing crimson cross, red bio-LED bar & twin injector ampoules.
 *   Heals to 100%, activates red adrenaline rage, auto-equips the Chainsaw, and multiplies melee damage by 4x.
 * - Radiation Shielding Suit ('radsuit', map symbol 'V'):
 *   Upright NBC hazmat protective suit with a gold-tinted helmet visor, radioactive trefoil badge & dorsal oxygen tank.
 *   Grants 45 seconds of full immunity to toxic slime floors with a green visor overlay.
 */

export const POWERUP_CELL = 32;
export const POWERUP_FRAMES = 4;
export const POWERUP_CELLS = { front: 0, side: 1, top: 2, trim: 3 };

const scratchPt = new Vec2();

export const POWERUP_TYPES = {
  soulsphere: { bonus: 100, maxHealth: 200 },
  berserk: { healTo: 100, multiplier: 4, tintDuration: 20 },
  radsuit: { duration: 45 },
};

const SOUL_PALETTE = [
  [8, 18, 48],
  [14, 38, 92],
  [24, 68, 148],
  [38, 108, 204],
  [64, 156, 244],
  [112, 204, 255],
  [176, 236, 255],
  [236, 252, 255],
];

const BERSERK_CASE = [
  [10, 10, 14],
  [18, 20, 26],
  [30, 34, 44],
  [48, 54, 68],
  [74, 82, 100],
  [112, 122, 144],
];

const BERSERK_RED = [
  [72, 6, 14],
  [124, 12, 22],
  [182, 20, 32],
  [232, 36, 48],
  [255, 96, 104],
  [255, 184, 188],
];

const RADSUIT_SHELL = [
  [28, 38, 26],
  [48, 66, 44],
  [76, 102, 68],
  [116, 148, 104],
  [164, 194, 152],
  [208, 228, 198],
  [236, 246, 230],
];

const RADSUIT_VISOR = [
  [68, 44, 8],
  [124, 84, 14],
  [188, 136, 24],
  [238, 192, 48],
  [255, 236, 128],
];

const RADSUIT_HAZARD = [
  [24, 28, 18],
  [44, 128, 36],
  [76, 204, 58],
  [156, 255, 120],
];

function cellPutter(data, atlasWidth, cell) {
  const S = POWERUP_CELL;
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

function drawCross(put, cx, cy, armHalf, thickHalf, palette) {
  for (let dy = -armHalf; dy <= armHalf; dy++)
    for (let dx = -armHalf; dx <= armHalf; dx++) {
      const vert = Math.abs(dx) <= thickHalf;
      const horiz = Math.abs(dy) <= thickHalf;
      if (!vert && !horiz)
        continue;
      const hi = (vert && dy === -armHalf) || (horiz && dy === -thickHalf && Math.abs(dx) > thickHalf);
      const lo = (vert && dy === armHalf) || (horiz && dy === thickHalf && Math.abs(dx) > thickHalf);
      put(cx + dx, cy + dy, lo ? palette[1] : hi ? palette[5] : palette[3]);
    }
}

// ---- Soulsphere Atlas & 3D Mesh --------------------------------------------

function drawSoulsphereFront(put) {
  const S = POWERUP_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (x - 15.5) / 14.5;
      const dy = (y - 15.5) / 14.5;
      const r = scratchPt.setScalar(dx, dy).getMagnitude();
      const swirl = Math.sin(dx * 5 + dy * 4) * 0.12;
      const shade = Math.max(0, 1 - r * 0.85 + swirl);
      const idx = Utils.clamp(Math.floor(shade * (SOUL_PALETTE.length - 1)), 0, SOUL_PALETTE.length - 1);
      put(x, y, SOUL_PALETTE[idx]);
    }

  // Glowing spectral soul visage (brow, hollow glowing eyes, cheekbones, agonized open mouth)
  for (const ex of [11, 20])
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if (Math.abs(dx) + Math.abs(dy) <= 3)
          put(ex + dx, 12 + dy, dx === 0 && dy === 0 ? SOUL_PALETTE[7] : SOUL_PALETTE[0]);

  // Nasal cavity
  for (let y = 15; y <= 17; y++) {
    put(15, y, SOUL_PALETTE[1]);
    put(16, y, SOUL_PALETTE[1]);
  }

  // Screaming soul mouth
  for (let y = 19; y <= 25; y++)
    for (let x = 12; x <= 19; x++) {
      const rim = y === 19 || y === 25 || x === 12 || x === 19;
      const tooth = (y === 20 || y === 24) && (x & 1) === 1;
      put(x, y, tooth ? SOUL_PALETTE[6] : rim ? SOUL_PALETTE[2] : SOUL_PALETTE[0]);
    }

  // Upper-left specular lens flare on the sphere
  for (const [sx, sy] of [[8, 6], [9, 6], [8, 7], [10, 5], [7, 8]])
    put(sx, sy, SOUL_PALETTE[7]);
}

function drawSoulsphereSide(put) {
  const S = POWERUP_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (x - 15.5) / 15;
      const dy = (y - 15.5) / 15;
      const r = scratchPt.setScalar(dx, dy).getMagnitude();
      const arc = Math.abs(Math.sin(x * 0.42 + y * 0.25)) > 0.92;
      const idx = arc ? 6 : Utils.clamp(Math.floor((1 - r * 0.7) * 5), 1, 5);
      put(x, y, SOUL_PALETTE[idx]);
    }
}

function drawSoulsphereTop(put) {
  const S = POWERUP_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const r = scratchPt.setScalar(x - 15.5, y - 15.5).getMagnitude();
      const ring = Math.abs(r - 6) < 1.2 || Math.abs(r - 11) < 1.1;
      put(x, y, r < 3 ? SOUL_PALETTE[7] : ring ? SOUL_PALETTE[6] : r < 10 ? SOUL_PALETTE[4] : SOUL_PALETTE[2]);
    }
}

function drawSoulsphereTrim(put) {
  const S = POWERUP_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const band = y >= 12 && y <= 19;
      const pulse = ((x + y) & 3) === 0;
      put(x, y, band ? (pulse ? SOUL_PALETTE[7] : SOUL_PALETTE[5]) : SOUL_PALETTE[2]);
    }
}

/** Returns the 128x32 power-of-two RGBA pixel-art atlas for the Soulsphere pickup. */
export function soulsphereAtlas() {
  const width = POWERUP_CELL * POWERUP_FRAMES;
  const height = POWERUP_CELL;
  const data = new Uint8Array(width * height * 4);
  drawSoulsphereFront(cellPutter(data, width, POWERUP_CELLS.front));
  drawSoulsphereSide(cellPutter(data, width, POWERUP_CELLS.side));
  drawSoulsphereTop(cellPutter(data, width, POWERUP_CELLS.top));
  drawSoulsphereTrim(cellPutter(data, width, POWERUP_CELLS.trim));
  return { name: 'soulsphere', data, width, height, cell: POWERUP_CELL, frames: POWERUP_FRAMES };
}

// ---- Berserk Pack Atlas & 3D Mesh ------------------------------------------

function drawBerserkFront(put) {
  const S = POWERUP_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      if (border) {
        put(x, y, BERSERK_CASE[0]);
        continue;
      }
      if (y === 6 || y === 26) {
        put(x, y, BERSERK_CASE[0]);
        continue;
      }
      const bevel = x === 1 || y === 1 || (y === 7 && x >= 3 && x <= 28);
      put(x, y, bevel ? BERSERK_CASE[4] : y > 26 ? BERSERK_CASE[1] : BERSERK_CASE[2]);
    }

  // Recessed obsidian emblem well with crimson rim
  for (let y = 9; y <= 23; y++)
    for (let x = 8; x <= 23; x++) {
      const edge = y === 9 || y === 23 || x === 8 || x === 23;
      put(x, y, edge ? BERSERK_RED[1] : BERSERK_CASE[1]);
    }

  // Blazing crimson Berserk cross
  drawCross(put, 15, 16, 5, 2, BERSERK_RED);

  // Heavy gunmetal clasps
  for (const lx of [5, 25])
    for (let y = 5; y <= 8; y++) {
      put(lx, y, y === 6 ? BERSERK_CASE[5] : BERSERK_CASE[3]);
      put(lx + 1, y, BERSERK_CASE[2]);
    }

  // Glowing crimson adrenaline bio-bar along upper bezel
  for (let x = 9; x <= 22; x++) {
    put(x, 2, BERSERK_CASE[0]);
    put(x, 3, (x & 1) === 0 ? BERSERK_RED[5] : BERSERK_RED[3]);
    put(x, 4, BERSERK_RED[2]);
  }
}

function drawBerserkSide(put) {
  const S = POWERUP_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      const stripe = y >= 14 && y <= 17 && x >= 4 && x <= 27;
      const rib = (y === 10 || y === 21) && x >= 5 && x <= 26;
      put(x, y, border ? BERSERK_CASE[0] : stripe ? BERSERK_RED[3] : rib ? BERSERK_CASE[4] : BERSERK_CASE[2]);
    }
}

function drawBerserkTop(put) {
  const S = POWERUP_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      const bevel = x === 1 || y === 1 || x === S - 2 || y === S - 2;
      put(x, y, border ? BERSERK_CASE[0] : bevel ? BERSERK_CASE[4] : BERSERK_CASE[2]);
    }
  drawCross(put, 15, 15, 6, 2, BERSERK_RED);
  for (const [cx, cy] of [[4, 4], [26, 4], [4, 26], [26, 26]]) {
    put(cx, cy, BERSERK_RED[4]);
    put(cx + 1, cy, BERSERK_RED[3]);
  }
}

function drawBerserkTrim(put) {
  const S = POWERUP_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const vial = x >= 10 && x <= 21 && y >= 8 && y <= 23;
      put(x, y, vial ? ((y & 1) === 0 ? BERSERK_RED[4] : BERSERK_RED[2]) : ((x + y) & 1) === 0 ? BERSERK_CASE[3] : BERSERK_CASE[1]);
    }
}

/** Returns the 128x32 power-of-two RGBA pixel-art atlas for the Berserk Pack pickup. */
export function berserkAtlas() {
  const width = POWERUP_CELL * POWERUP_FRAMES;
  const height = POWERUP_CELL;
  const data = new Uint8Array(width * height * 4);
  drawBerserkFront(cellPutter(data, width, POWERUP_CELLS.front));
  drawBerserkSide(cellPutter(data, width, POWERUP_CELLS.side));
  drawBerserkTop(cellPutter(data, width, POWERUP_CELLS.top));
  drawBerserkTrim(cellPutter(data, width, POWERUP_CELLS.trim));
  return { name: 'berserk', data, width, height, cell: POWERUP_CELL, frames: POWERUP_FRAMES };
}

// ---- Radiation Shielding Suit Atlas & 3D Mesh ------------------------------

function drawRadsuitFront(put) {
  const S = POWERUP_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      if (border) {
        put(x, y, RADSUIT_SHELL[0]);
        continue;
      }
      const seam = x === 15 || x === 16;
      const belt = y >= 22 && y <= 25;
      put(x, y, belt ? RADSUIT_SHELL[1] : seam ? RADSUIT_SHELL[2] : y < 10 ? RADSUIT_SHELL[6] : RADSUIT_SHELL[5]);
    }

  // Gold-tinted NBC helmet visor window (upper chest/head region)
  for (let y = 3; y <= 10; y++)
    for (let x = 8; x <= 23; x++) {
      const rim = y === 3 || y === 10 || x === 8 || x === 23;
      const glare = y <= 5 && x >= 10 && x <= 14;
      put(x, y, rim ? RADSUIT_SHELL[1] : glare ? RADSUIT_VISOR[4] : y < 7 ? RADSUIT_VISOR[3] : RADSUIT_VISOR[2]);
    }

  // Glowing green radiation hazard chest badge
  for (let y = 13; y <= 20; y++)
    for (let x = 11; x <= 20; x++) {
      const edge = y === 13 || y === 20 || x === 11 || x === 20;
      const core = Math.abs(x - 15.5) <= 2 && Math.abs(y - 16.5) <= 2;
      put(x, y, edge ? RADSUIT_HAZARD[0] : core ? RADSUIT_HAZARD[3] : RADSUIT_HAZARD[2]);
    }
}

function drawRadsuitSide(put) {
  const S = POWERUP_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      const tank = x >= 8 && x <= 23 && y >= 6 && y <= 24;
      const band = y === 11 || y === 19;
      put(
        x,
        y,
        border
          ? RADSUIT_SHELL[0]
          : tank
            ? band
              ? RADSUIT_HAZARD[2]
              : RADSUIT_SHELL[3]
            : RADSUIT_SHELL[5]
      );
    }
}

function drawRadsuitTop(put) {
  const S = POWERUP_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const r = scratchPt.setScalar(x - 15.5, y - 15.5).getMagnitude();
      put(x, y, r < 6 ? RADSUIT_VISOR[3] : r < 12 ? RADSUIT_SHELL[6] : RADSUIT_SHELL[3]);
    }
}

function drawRadsuitTrim(put) {
  const S = POWERUP_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const stripe = y >= 4 && y <= 7;
      put(x, y, stripe ? RADSUIT_HAZARD[2] : ((x + y) & 1) === 0 ? RADSUIT_SHELL[1] : RADSUIT_SHELL[0]);
    }
}

/** Returns the 128x32 power-of-two RGBA pixel-art atlas for the Radiation Shielding Suit pickup. */
export function radsuitAtlas() {
  const width = POWERUP_CELL * POWERUP_FRAMES;
  const height = POWERUP_CELL;
  const data = new Uint8Array(width * height * 4);
  drawRadsuitFront(cellPutter(data, width, POWERUP_CELLS.front));
  drawRadsuitSide(cellPutter(data, width, POWERUP_CELLS.side));
  drawRadsuitTop(cellPutter(data, width, POWERUP_CELLS.top));
  drawRadsuitTrim(cellPutter(data, width, POWERUP_CELLS.trim));
  return { name: 'radsuit', data, width, height, cell: POWERUP_CELL, frames: POWERUP_FRAMES };
}

// ---- 3D Geometry Builders --------------------------------------------------

function pushBox(vertices, uvs, x0, y0, z0, x1, y1, z1, faces) {
  const quads = [
    [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], faces.front],
    [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], faces.back],
    [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], faces.right],
    [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], faces.left],
    [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], faces.top],
    [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], faces.bottom],
  ];
  const inset = 0.35 / (POWERUP_CELL * POWERUP_FRAMES);
  for (const [c0, c1, c2, c3, cell] of quads) {
    const u0 = cell / POWERUP_FRAMES + inset;
    const u1 = (cell + 1) / POWERUP_FRAMES - inset;
    const quadUvs = [[u0, 1], [u1, 1], [u1, 0], [u0, 0]];
    const corners = [c0, c1, c2, c3];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      vertices.push(...corners[k]);
      uvs.push(...quadUvs[k]);
    }
  }
}

/**
 * Builds the 3D Soulsphere geometry: faceted multi-tier crystalline sphere with soul visage on front/back
 * and an equatorial containment halo ring.
 */
export function soulsphereMesh() {
  const vertices = [];
  const uvs = [];
  const orbFaces = {
    front: POWERUP_CELLS.front,
    back: POWERUP_CELLS.front,
    left: POWERUP_CELLS.side,
    right: POWERUP_CELLS.side,
    top: POWERUP_CELLS.top,
    bottom: POWERUP_CELLS.top,
  };
  const ringFaces = {
    front: POWERUP_CELLS.trim,
    back: POWERUP_CELLS.trim,
    left: POWERUP_CELLS.trim,
    right: POWERUP_CELLS.trim,
    top: POWERUP_CELLS.trim,
    bottom: POWERUP_CELLS.trim,
  };

  // 1. Central core of the sphere
  pushBox(vertices, uvs, -7.2, 5.5, -7.2, 7.2, 18.5, 7.2, orbFaces);
  // 2. Front & back spherical bulges (bearing the soul face)
  pushBox(vertices, uvs, -5.4, 7.2, 7.2, 5.4, 16.8, 9.0, orbFaces);
  pushBox(vertices, uvs, -5.4, 7.2, -9.0, 5.4, 16.8, -7.2, orbFaces);
  // 3. Left & right lateral spherical caps
  pushBox(vertices, uvs, -9.0, 7.2, -5.4, -7.2, 16.8, 5.4, orbFaces);
  pushBox(vertices, uvs, 7.2, 7.2, -5.4, 9.0, 16.8, 5.4, orbFaces);
  // 4. Upper & lower polar dome caps
  pushBox(vertices, uvs, -5.2, 18.5, -5.2, 5.2, 20.6, 5.2, orbFaces);
  pushBox(vertices, uvs, -5.2, 3.4, -5.2, 5.2, 5.5, 5.2, orbFaces);
  // 5. Floating equatorial plasma halo ring
  pushBox(vertices, uvs, -10.4, 11.2, -1.8, 10.4, 12.8, 1.8, ringFaces);

  return { vertices: new Float32Array(vertices), uvs: new Float32Array(uvs) };
}

/**
 * Builds the 3D Berserk Pack geometry: matte-black tactical stimulant case + twin top adrenaline ampoules + carry handle.
 */
export function berserkMesh() {
  const vertices = [];
  const uvs = [];
  const hx = 8.8;
  const hy = 12.5;
  const hz = 5.6;

  // 1. Main tactical stimulant case
  pushBox(vertices, uvs, -hx, 0, -hz, hx, hy, hz, {
    front: POWERUP_CELLS.front,
    back: POWERUP_CELLS.front,
    left: POWERUP_CELLS.side,
    right: POWERUP_CELLS.side,
    top: POWERUP_CELLS.top,
    bottom: POWERUP_CELLS.trim,
  });

  // 2. Twin glowing crimson adrenaline injector ampoules mounted on top shoulders
  const trimFaces = {
    front: POWERUP_CELLS.trim,
    back: POWERUP_CELLS.trim,
    left: POWERUP_CELLS.trim,
    right: POWERUP_CELLS.trim,
    top: POWERUP_CELLS.trim,
    bottom: POWERUP_CELLS.trim,
  };
  pushBox(vertices, uvs, -7.6, hy, -2.4, -5.2, hy + 2.4, 2.4, trimFaces);
  pushBox(vertices, uvs, 5.2, hy, -2.4, 7.6, hy + 2.4, 2.4, trimFaces);

  // 3. 3D center carry handle arch
  pushBox(vertices, uvs, -3.8, hy, -1.1, -2.2, hy + 2.8, 1.1, trimFaces);
  pushBox(vertices, uvs, 2.2, hy, -1.1, 3.8, hy + 2.8, 1.1, trimFaces);
  pushBox(vertices, uvs, -3.8, hy + 2.0, -1.2, 3.8, hy + 3.4, 1.2, trimFaces);

  return { vertices: new Float32Array(vertices), uvs: new Float32Array(uvs) };
}

/**
 * Builds the 3D Radiation Shielding Suit geometry: upright NBC hazmat suit with boots, torso,
 * domed visor hood, dorsal oxygen tank, and shoulder sleeves.
 */
export function radsuitMesh() {
  const vertices = [];
  const uvs = [];
  const trimFaces = {
    front: POWERUP_CELLS.trim,
    back: POWERUP_CELLS.trim,
    left: POWERUP_CELLS.trim,
    right: POWERUP_CELLS.trim,
    top: POWERUP_CELLS.trim,
    bottom: POWERUP_CELLS.trim,
  };

  // 1. Heavy chemical-resistant left & right boots/legs
  pushBox(vertices, uvs, -5.8, 0, -3.4, -1.2, 7.5, 3.4, trimFaces);
  pushBox(vertices, uvs, 1.2, 0, -3.4, 5.8, 7.5, 3.4, trimFaces);

  // 2. Sealed NBC hazmat torso & radiation badge
  pushBox(vertices, uvs, -6.8, 7.5, -4.2, 6.8, 19.5, 4.2, {
    front: POWERUP_CELLS.front,
    back: POWERUP_CELLS.side,
    left: POWERUP_CELLS.side,
    right: POWERUP_CELLS.side,
    top: POWERUP_CELLS.top,
    bottom: POWERUP_CELLS.trim,
  });

  // 3. Domed hazmat helmet hood with gold visor on front
  pushBox(vertices, uvs, -4.8, 19.5, -4.0, 4.8, 26.5, 4.4, {
    front: POWERUP_CELLS.front,
    back: POWERUP_CELLS.side,
    left: POWERUP_CELLS.side,
    right: POWERUP_CELLS.side,
    top: POWERUP_CELLS.top,
    bottom: POWERUP_CELLS.trim,
  });

  // 4. Dorsal oxygen breather pack
  pushBox(vertices, uvs, -4.6, 9.5, -6.8, 4.6, 18.5, -4.2, {
    front: POWERUP_CELLS.side,
    back: POWERUP_CELLS.side,
    left: POWERUP_CELLS.side,
    right: POWERUP_CELLS.side,
    top: POWERUP_CELLS.top,
    bottom: POWERUP_CELLS.trim,
  });

  // 5. Left and right hazmat sleeves
  pushBox(vertices, uvs, -9.4, 9.0, -3.0, -6.8, 18.5, 3.0, {
    front: POWERUP_CELLS.side,
    back: POWERUP_CELLS.side,
    left: POWERUP_CELLS.side,
    right: POWERUP_CELLS.side,
    top: POWERUP_CELLS.top,
    bottom: POWERUP_CELLS.trim,
  });
  pushBox(vertices, uvs, 6.8, 9.0, -3.0, 9.4, 18.5, 3.0, {
    front: POWERUP_CELLS.side,
    back: POWERUP_CELLS.side,
    left: POWERUP_CELLS.side,
    right: POWERUP_CELLS.side,
    top: POWERUP_CELLS.top,
    bottom: POWERUP_CELLS.trim,
  });

  return { vertices: new Float32Array(vertices), uvs: new Float32Array(uvs) };
}
