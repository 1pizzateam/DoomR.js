/**
 * The shotgun ammo pickup as a 3D textured mesh:
 * - Drawn procedurally in code as a crisp power-of-two RGBA pixel-art atlas (32 x 32 per cell, 4 cells = 128 x 32):
 *   - Cell 0 (CRATE_FRONT): Olive-drab & steel ordnance crate front/back wall with brass hazard stencil stripe.
 *   - Cell 1 (CRATE_SIDE): Olive-drab & steel side wall with recessed grip slot and corner bumper brackets.
 *   - Cell 2 (SHELL_SIDE): 12-gauge buckshot shell cylinder wrap (ribbed crimson hull above, gleaming brass base below).
 *   - Cell 3 (SHELL_TOP): Star-crimped crimson shotgun shell mouth & dark steel tray floor.
 * - `ammoMesh()` builds the 3D open-top ordnance crate holding two rows of four 3D cylindrical buckshot shells.
 */

export const AMMO_CELL = 32;
export const AMMO_FRAMES = 4;
export const AMMO_CELLS = { crateFront: 0, crateSide: 1, shellSide: 2, shellTop: 3 };

export const AMMO_TYPES = {
  shells: {
    id: 'shells',
    label: 'SHELLS',
    short: 'SHL',
    max: 80,
    bonus: 8,
    weaponBonus: 8,
    low: 5,
  },
  bullets: {
    id: 'bullets',
    label: 'BULLETS',
    short: 'BUL',
    max: 200,
    bonus: 20,
    weaponBonus: 20,
    low: 15,
  },
  rockets: {
    id: 'rockets',
    label: 'ROCKETS',
    short: 'RKT',
    max: 40,
    bonus: 5,
    weaponBonus: 5,
    low: 3,
  },
};

const CRATE_OLIVE = [
  [14, 18, 14],
  [28, 36, 26],
  [46, 58, 40],
  [68, 86, 58],
  [96, 118, 80],
  [132, 156, 112]
];

const STEEL = [
  [16, 20, 28],
  [34, 42, 54],
  [62, 76, 94],
  [104, 122, 146],
  [158, 178, 204]
];

const SHELL_RED = [
  [68, 8, 14],
  [118, 14, 22],
  [172, 22, 32],
  [222, 38, 48],
  [255, 98, 104]
];

const BRASS = [
  [76, 50, 12],
  [128, 88, 20],
  [184, 136, 36],
  [234, 188, 64],
  [255, 236, 148]
];

const COPPER = [
  [74, 34, 18],
  [124, 58, 28],
  [176, 86, 42],
  [222, 122, 64],
  [252, 168, 108]
];

function cellPutter(data, atlasWidth, cell) {
  const S = AMMO_CELL;
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

function drawCrateFrontCell(put) {
  const S = AMMO_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      if (border) {
        put(x, y, CRATE_OLIVE[0]);
        continue;
      }
      // Top steel collar rim
      if (y <= 3) {
        put(x, y, y === 1 ? STEEL[4] : STEEL[2]);
        continue;
      }
      // Corner steel bumper brackets
      if (x <= 4 || x >= S - 5) {
        put(x, y, (y === 8 || y === 22) ? STEEL[0] : (x === 2 || x === S - 3) ? STEEL[3] : STEEL[2]);
        continue;
      }
      // Diagonal brass/amber hazard stencil stripe across front plate
      if (y >= 12 && y <= 19 && x >= 7 && x <= 24) {
        if (y === 12 || y === 19) {
          put(x, y, CRATE_OLIVE[1]);
          continue;
        }
        const stripe = ((x + y) & 3) < 2;
        put(x, y, stripe ? BRASS[3] : CRATE_OLIVE[0]);
        continue;
      }
      const shade = y < 10 ? 4 : y > 24 ? 2 : 3;
      put(x, y, CRATE_OLIVE[shade + ((x + y) % 3 === 0 ? 1 : 0)]);
    }
}

function drawCrateSideCell(put) {
  const S = AMMO_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      if (border) {
        put(x, y, CRATE_OLIVE[0]);
        continue;
      }
      if (y <= 3) {
        put(x, y, y === 1 ? STEEL[4] : STEEL[2]);
        continue;
      }
      if (x <= 4 || x >= S - 5) {
        put(x, y, STEEL[2]);
        continue;
      }
      // Recessed side carry handle slot
      if (y >= 10 && y <= 17 && x >= 9 && x <= 22) {
        const rim = y === 10 || y === 17 || x === 9 || x === 22;
        put(x, y, rim ? STEEL[3] : CRATE_OLIVE[0]);
        continue;
      }
      put(x, y, CRATE_OLIVE[y < 10 ? 4 : 3]);
    }
}

function drawShellSideCell(put) {
  const S = AMMO_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      // Cylindrical highlight wave around the circumference of the shell
      const wave = Math.sin((x / S) * Math.PI * 2);
      const shade = wave > 0.55 ? 4 : wave > 0.05 ? 3 : wave > -0.5 ? 2 : 1;
      if (y <= 2) {
        // Folded star-crimp mouth bevel
        put(x, y, SHELL_RED[Math.max(1, shade - 1)]);
      } else if (y < 19) {
        // Ribbed crimson shotgun hull
        const rib = (y & 1) === 0 ? 0 : -1;
        put(x, y, SHELL_RED[Math.max(0, Math.min(4, shade + rib))]);
      } else if (y === 19) {
        // Dark seam between plastic hull and brass base
        put(x, y, BRASS[0]);
      } else {
        // High-brass metallic cartridge base with extractor rim at bottom
        const rim = y === 20 || y >= S - 2;
        put(x, y, BRASS[Math.max(0, Math.min(4, shade + (rim ? 1 : 0)))]);
      }
    }
}

function drawShellTopCell(put) {
  const S = AMMO_CELL;
  const cx = (S - 1) / 2;
  const cy = (S - 1) / 2;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      if (d > 13.5) {
        put(x, y, STEEL[1]);
        continue;
      }
      if (d > 11.2) {
        put(x, y, SHELL_RED[4]);
        continue;
      }
      // 6-fold star-crimp creases on the top of the buckshot shell
      const crease = Math.abs(Math.sin(angle * 3)) < 0.22;
      put(x, y, d < 2.5 ? SHELL_RED[0] : crease ? SHELL_RED[1] : SHELL_RED[3]);
    }
}

/** Returns the power-of-two RGBA texture atlas for the 3D shotgun ammo mesh. */
export function ammoAtlas() {
  const width = AMMO_CELL * AMMO_FRAMES;
  const height = AMMO_CELL;
  const data = new Uint8Array(width * height * 4);
  drawCrateFrontCell(cellPutter(data, width, AMMO_CELLS.crateFront));
  drawCrateSideCell(cellPutter(data, width, AMMO_CELLS.crateSide));
  drawShellSideCell(cellPutter(data, width, AMMO_CELLS.shellSide));
  drawShellTopCell(cellPutter(data, width, AMMO_CELLS.shellTop));
  return { name: 'ammo', data, width, height, cell: AMMO_CELL, frames: AMMO_FRAMES };
}

function drawBulletBoxFrontCell(put) {
  const S = AMMO_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (x === 0 || x === S - 1 || y === 0 || y === S - 1) {
        put(x, y, CRATE_OLIVE[0]);
        continue;
      }
      // Hinged upper rim and steel latch clasp
      if (y <= 4) {
        put(x, y, y === 2 ? STEEL[3] : CRATE_OLIVE[1]);
        continue;
      }
      if (x >= 13 && x <= 18 && y >= 5 && y <= 11) {
        put(x, y, y === 5 || y === 11 ? STEEL[0] : x === 14 || x === 17 ? STEEL[4] : STEEL[2]);
        continue;
      }
      // Brass 7.62mm stencil rectangle on the olive ammo can
      if (y >= 15 && y <= 23 && x >= 6 && x <= 25) {
        const stencil = (y === 16 || y === 22) || (y >= 18 && y <= 20 && ((x + y) & 1) === 0);
        put(x, y, stencil ? BRASS[3] : CRATE_OLIVE[1]);
        continue;
      }
      const rib = y === 12 || y === 26;
      put(x, y, CRATE_OLIVE[rib ? 4 : y < 14 ? 3 : 2]);
    }
}

function drawBulletBoxSideCell(put) {
  const S = AMMO_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (x === 0 || x === S - 1 || y === 0 || y === S - 1) {
        put(x, y, CRATE_OLIVE[0]);
        continue;
      }
      // Wire bail handle on the narrow side of the ammo can
      if (y >= 8 && y <= 16 && x >= 9 && x <= 22) {
        const wire = y === 8 || y === 16 || x === 9 || x === 22;
        put(x, y, wire ? STEEL[3] : CRATE_OLIVE[1]);
        continue;
      }
      const rib = (y & 3) === 0;
      put(x, y, CRATE_OLIVE[rib ? 4 : 2]);
    }
}

function drawBulletCartridgeSideCell(put) {
  const S = AMMO_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const wave = Math.sin((x / S) * Math.PI * 2);
      const shade = wave > 0.55 ? 4 : wave > 0.05 ? 3 : wave > -0.5 ? 2 : 1;
      if (y < 10)
        // Copper-jacketed FMJ spire-point bullet tip
        put(x, y, COPPER[Math.max(0, Math.min(4, shade))]);
      else if (y === 10)
        // Case neck crimp
        put(x, y, BRASS[0]);
      else if (y >= 16 && y <= 20)
        // Dark steel disintegrating belt link
        put(x, y, STEEL[Math.max(0, Math.min(4, shade - 1))]);
      else
        // Gleaming brass 7.62mm casing
        put(x, y, BRASS[Math.max(0, Math.min(4, shade))]);
    }
}

function drawBulletCartridgeTopCell(put) {
  const S = AMMO_CELL;
  const cx = (S - 1) / 2;
  const cy = (S - 1) / 2;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > 13.5)
        put(x, y, CRATE_OLIVE[1]);
      else if (d > 9.5)
        put(x, y, BRASS[3]);
      else if (d > 4.2)
        put(x, y, COPPER[3]);
      else
        put(x, y, COPPER[4]);
    }
}

/** Returns the power-of-two RGBA texture atlas for the 3D bullet ammo box mesh. */
export function bulletAtlas() {
  const width = AMMO_CELL * AMMO_FRAMES;
  const height = AMMO_CELL;
  const data = new Uint8Array(width * height * 4);
  drawBulletBoxFrontCell(cellPutter(data, width, AMMO_CELLS.crateFront));
  drawBulletBoxSideCell(cellPutter(data, width, AMMO_CELLS.crateSide));
  drawBulletCartridgeSideCell(cellPutter(data, width, AMMO_CELLS.shellSide));
  drawBulletCartridgeTopCell(cellPutter(data, width, AMMO_CELLS.shellTop));
  return { name: 'bullets', data, width, height, cell: AMMO_CELL, frames: AMMO_FRAMES };
}

function drawRocketCrateFrontCell(put) {
  const S = AMMO_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (x === 0 || x === S - 1 || y === 0 || y === S - 1) {
        put(x, y, STEEL[0]);
        continue;
      }
      if (y <= 3 || y >= S - 4 || x <= 3 || x >= S - 4) {
        put(x, y, (x + y) % 5 === 0 ? STEEL[3] : STEEL[1]);
        continue;
      }
      // Red and brass explosive ordnance hazard chevron across the crate front
      if (y >= 11 && y <= 20 && x >= 6 && x <= 25) {
        const chevron = ((x + y) & 3) < 2;
        put(x, y, chevron ? SHELL_RED[3] : BRASS[3]);
        continue;
      }
      put(x, y, CRATE_OLIVE[y < 11 ? 3 : 2]);
    }
}

function drawRocketCrateSideCell(put) {
  const S = AMMO_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (x === 0 || x === S - 1 || y === 0 || y === S - 1) {
        put(x, y, STEEL[0]);
        continue;
      }
      if (x <= 4 || x >= S - 5 || y <= 3 || y >= S - 4) {
        put(x, y, STEEL[2]);
        continue;
      }
      put(x, y, CRATE_OLIVE[(y & 3) === 0 ? 4 : 2]);
    }
}

function drawRocketSideCell(put) {
  const S = AMMO_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const wave = Math.sin((x / S) * Math.PI * 2);
      const shade = wave > 0.55 ? 4 : wave > 0.05 ? 3 : wave > -0.5 ? 2 : 1;
      if (y < 6)
        // High-explosive crimson warhead band
        put(x, y, SHELL_RED[Math.max(0, Math.min(4, shade))]);
      else if (y === 6 || y === 7)
        // Brass fuse collar ring
        put(x, y, BRASS[Math.max(1, shade)]);
      else if (y < 24)
        // Olive-drab rocket motor tube
        put(x, y, CRATE_OLIVE[Math.max(1, Math.min(5, shade + 1))]);
      else
        // Dark steel exhaust nozzle & stabilizer fin base
        put(x, y, STEEL[Math.max(0, Math.min(4, shade - 1))]);
    }
}

function drawRocketTopCell(put) {
  const S = AMMO_CELL;
  const cx = (S - 1) / 2;
  const cy = (S - 1) / 2;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > 13)
        put(x, y, STEEL[1]);
      else if (d > 8)
        put(x, y, SHELL_RED[2]);
      else if (d > 3.2)
        put(x, y, SHELL_RED[4]);
      else
        put(x, y, BRASS[4]);
    }
}

/** Returns the power-of-two RGBA texture atlas for the 3D rocket ammo crate mesh. */
export function rocketAmmoAtlas() {
  const width = AMMO_CELL * AMMO_FRAMES;
  const height = AMMO_CELL;
  const data = new Uint8Array(width * height * 4);
  drawRocketCrateFrontCell(cellPutter(data, width, AMMO_CELLS.crateFront));
  drawRocketCrateSideCell(cellPutter(data, width, AMMO_CELLS.crateSide));
  drawRocketSideCell(cellPutter(data, width, AMMO_CELLS.shellSide));
  drawRocketTopCell(cellPutter(data, width, AMMO_CELLS.shellTop));
  return { name: 'rockets', data, width, height, cell: AMMO_CELL, frames: AMMO_FRAMES };
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
  const inset = 0.35 / (AMMO_CELL * AMMO_FRAMES);
  return [cell / AMMO_FRAMES + inset, (cell + 1) / AMMO_FRAMES - inset];
}

function pushCrateTray(vertices, uvs, hx, hy, hz) {
  const [uf0, uf1] = cellRange(AMMO_CELLS.crateFront);
  const [us0, us1] = cellRange(AMMO_CELLS.crateSide);
  const [ut0, ut1] = cellRange(AMMO_CELLS.shellTop);

  // Outer walls of the open-top olive ordnance tray
  pushQuad(vertices, uvs, [-hx, 0, hz], [hx, 0, hz], [hx, hy, hz], [-hx, hy, hz], uf0, 0, uf1, 1);
  pushQuad(vertices, uvs, [hx, 0, -hz], [-hx, 0, -hz], [-hx, hy, -hz], [hx, hy, -hz], uf0, 0, uf1, 1);
  pushQuad(vertices, uvs, [hx, 0, hz], [hx, 0, -hz], [hx, hy, -hz], [hx, hy, hz], us0, 0, us1, 1);
  pushQuad(vertices, uvs, [-hx, 0, -hz], [-hx, 0, hz], [-hx, hy, hz], [-hx, hy, -hz], us0, 0, us1, 1);
  // Bottom and recessed interior tray bed
  pushQuad(vertices, uvs, [-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz], us0, 0.5, us1, 0.95);
  pushQuad(vertices, uvs, [-hx, hy - 1.2, hz], [hx, hy - 1.2, hz], [hx, hy - 1.2, -hz], [-hx, hy - 1.2, -hz], ut0, 0, ut1, 0.12);
}

function pushShellCylinder(vertices, uvs, cx, cz, y0, y1, radius, sides = 8) {
  const [us0, us1] = cellRange(AMMO_CELLS.shellSide);
  const [ut0, ut1] = cellRange(AMMO_CELLS.shellTop);
  const uMid = (ut0 + ut1) * 0.5;
  const uHalf = (ut1 - ut0) * 0.42;

  for (let i = 0; i < sides; i++) {
    const t0 = i / sides;
    const t1 = (i + 1) / sides;
    const a0 = t0 * Math.PI * 2;
    const a1 = t1 * Math.PI * 2;
    const x0 = cx + Math.cos(a0) * radius;
    const z0 = cz + Math.sin(a0) * radius;
    const x1 = cx + Math.cos(a1) * radius;
    const z1 = cz + Math.sin(a1) * radius;

    // Cylindrical side wall of the shotgun shell
    const u0 = us0 + (us1 - us0) * t0;
    const u1 = us0 + (us1 - us0) * t1;
    pushQuad(vertices, uvs, [x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], u0, 0, u1, 1);

    // Star-crimped top cap triangle
    vertices.push(cx, y1, cz, x1, y1, z1, x0, y1, z0);
    uvs.push(
      uMid, 0.5,
      uMid + Math.cos(a1) * uHalf, 0.5 + Math.sin(a1) * 0.42,
      uMid + Math.cos(a0) * uHalf, 0.5 + Math.sin(a0) * 0.42
    );
  }
}

/**
 * Builds the 3D shotgun ammo pickup geometry: an olive-drab ordnance tray holding 8 upright 3D buckshot shells.
 */
export function ammoMesh() {
  const vertices = [];
  const uvs = [];
  const hx = 8.5;
  const hy = 7.2;
  const hz = 5.5;

  pushCrateTray(vertices, uvs, hx, hy, hz);

  // Two rows of four upright 12-gauge shells standing inside the tray
  const xs = [-5.4, -1.8, 1.8, 5.4];
  const zs = [-2.2, 2.2];
  for (const cz of zs)
    for (const cx of xs)
      pushShellCylinder(vertices, uvs, cx, cz, hy - 1.5, 14.5, 1.48, 8);

  return { vertices: new Float32Array(vertices), uvs: new Float32Array(uvs) };
}

/**
 * Builds the 3D bullet ammo box pickup geometry: a tall olive-drab 7.62mm ammo can with an open hinged lid
 * and two rows of six brass-and-copper rifle cartridges protruding from the feed tray.
 */
export function bulletMesh() {
  const vertices = [];
  const uvs = [];
  const hx = 7.8;
  const hy = 10.2;
  const hz = 4.6;

  pushCrateTray(vertices, uvs, hx, hy, hz);

  // Open hinged steel lid tilted back along the rear rim of the ammo can
  const [uf0, uf1] = cellRange(AMMO_CELLS.crateFront);
  pushQuad(
    vertices,
    uvs,
    [-hx, hy, -hz],
    [hx, hy, -hz],
    [hx, hy + 4.4, -hz - 2.2],
    [-hx, hy + 4.4, -hz - 2.2],
    uf0,
    0,
    uf1,
    0.45
  );
  pushQuad(
    vertices,
    uvs,
    [hx, hy, -hz],
    [-hx, hy, -hz],
    [-hx, hy + 4.4, -hz - 2.2],
    [hx, hy + 4.4, -hz - 2.2],
    uf0,
    0,
    uf1,
    0.45
  );

  // Two dense rows of six 7.62mm brass cartridges inside the ammo can
  const xs = [-5.5, -3.3, -1.1, 1.1, 3.3, 5.5];
  const zs = [-1.6, 1.6];
  for (const cz of zs)
    for (const cx of xs)
      pushShellCylinder(vertices, uvs, cx, cz, hy - 1.2, 15.2, 0.92, 6);

  return { vertices: new Float32Array(vertices), uvs: new Float32Array(uvs) };
}

function pushRocketWarhead(vertices, uvs, cx, cz, yBase, yShoulder, yTip, radius, sides = 8) {
  const [us0, us1] = cellRange(AMMO_CELLS.shellSide);
  const [ut0, ut1] = cellRange(AMMO_CELLS.shellTop);
  const uMid = (ut0 + ut1) * 0.5;
  const uHalf = (ut1 - ut0) * 0.42;

  for (let i = 0; i < sides; i++) {
    const t0 = i / sides;
    const t1 = (i + 1) / sides;
    const a0 = t0 * Math.PI * 2;
    const a1 = t1 * Math.PI * 2;
    const x0 = cx + Math.cos(a0) * radius;
    const z0 = cz + Math.sin(a0) * radius;
    const x1 = cx + Math.cos(a1) * radius;
    const z1 = cz + Math.sin(a1) * radius;

    const u0 = us0 + (us1 - us0) * t0;
    const u1 = us0 + (us1 - us0) * t1;
    // Cylindrical rocket motor body
    pushQuad(vertices, uvs, [x0, yBase, z0], [x1, yBase, z1], [x1, yShoulder, z1], [x0, yShoulder, z0], u0, 0, u1, 1);

    // Conical high-explosive warhead nose cone
    vertices.push(cx, yTip, cz, x1, yShoulder, z1, x0, yShoulder, z0);
    uvs.push(
      uMid, 0.5,
      uMid + Math.cos(a1) * uHalf, 0.5 + Math.sin(a1) * 0.42,
      uMid + Math.cos(a0) * uHalf, 0.5 + Math.sin(a0) * 0.42
    );
  }
}

/**
 * Builds the 3D rocket ammo crate geometry: a reinforced ordnance rack holding 5 upright warhead rockets.
 */
export function rocketAmmoMesh() {
  const vertices = [];
  const uvs = [];
  const hx = 9.6;
  const hy = 6.8;
  const hz = 6.2;

  pushCrateTray(vertices, uvs, hx, hy, hz);

  // 5 upright finned warhead rockets arranged in a staggered 3 + 2 ordnance rack
  const positions = [
    [-5.6, -2.1],
    [0, -2.1],
    [5.6, -2.1],
    [-2.8, 2.1],
    [2.8, 2.1],
  ];
  for (const [cx, cz] of positions)
    pushRocketWarhead(vertices, uvs, cx, cz, hy - 1.4, 16.2, 20.6, 1.65, 8);

  return { vertices: new Float32Array(vertices), uvs: new Float32Array(uvs) };
}

