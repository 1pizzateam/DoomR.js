import { Utils, Vec2, Vec3 } from '@1pizzateam/spock';

/**
 * Classic Doom Armor Pickups (Green Security Armor & Blue MegaArmor) as 3D textured meshes:
 * - Drawn procedurally as a crisp power-of-two RGBA pixel-art atlas (32 x 32 per cell, 4 cells = 128 x 32):
 *   - Cell 0 (CHEST): Ballistic pectoral plates, glowing UAC sternum core / trauma plate, and abdominal belt ribs.
 *   - Cell 1 (BACK): Dorsal spine plating, ventilation slats, and heavy tactical webbing straps.
 *   - Cell 2 (SHOULDER): Curved shoulder pauldron armor with hazard trim and rivets.
 *   - Cell 3 (TRIM): Dark titanium cummerbund / collar edge rail with luminous seam pips.
 * - `armorMesh()` builds the 3D UAC combat armor vest geometry: sculpted torso cuirass, protruding chest trauma plate,
 *   segmented waist belt, side rib guards, and left/right shoulder pauldrons flanking the collar opening.
 */

export const ARMOR_CELL = 32;
export const ARMOR_FRAMES = 4;
export const ARMOR_CELLS = {
  chest: 0,
  back: 1,
  shoulder: 2,
  trim: 3,
};
export const ARMOR_COLORS = ['green', 'blue'];

export const ARMOR_TYPES = {
  green: { points: 100, save: 1 / 3, label: 'Security Armor' },
  blue: { points: 200, save: 0.5, label: 'MegaArmor' },
};

const PALETTES = {
  green: [
    new Vec3(12, 34, 22),
    new Vec3(22, 68, 44),
    new Vec3(36, 116, 76),
    new Vec3(56, 168, 114),
    new Vec3(84, 214, 152),
    new Vec3(172, 250, 210),
  ],
  blue: [
    new Vec3(10, 22, 56),
    new Vec3(20, 48, 112),
    new Vec3(36, 88, 184),
    new Vec3(68, 138, 244),
    new Vec3(116, 188, 255),
    new Vec3(204, 236, 255),
  ],
};

const STEEL = [
  new Vec3(14, 18, 26),
  new Vec3(28, 34, 46),
  new Vec3(52, 64, 82),
  new Vec3(88, 106, 132),
  new Vec3(142, 164, 194),
];

function pushQuad(vertices, uvs, c0, c1, c2, c3, u0, v0, u1, v1) {
  const corners = [c0, c1, c2, c3];
  const quadUvs = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
  for (const k of [0, 1, 2, 0, 2, 3]) {
    vertices.push(...corners[k]);
    uvs.push(...quadUvs[k]);
  }
}

function cellRange(cell) {
  const step = 1 / ARMOR_FRAMES;
  const pad = 0.003;
  return new Vec2(cell * step + pad, (cell + 1) * step - pad);
}

function boxMesh(size = new Vec3(1, 1, 1), frontCell = 0, backCell = 1, sideCell = 3, topCell = 2) {
  const hx = size.x * 0.5;
  const hy = size.y * 0.5;
  const hz = size.z * 0.5;
  const uf = cellRange(frontCell);
  const ub = cellRange(backCell);
  const us = cellRange(sideCell);
  const ut = cellRange(topCell);
  const vertices = [];
  const uvs = [];
  // Front (+Z) and Back (-Z)
  pushQuad(vertices, uvs, [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], uf.x, 0, uf.y, 1);
  pushQuad(vertices, uvs, [hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], ub.x, 0, ub.y, 1);
  // Right (+X) and Left (-X)
  pushQuad(vertices, uvs, [hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], us.x, 0, us.y, 1);
  pushQuad(vertices, uvs, [-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], us.x, 0, us.y, 1);
  // Top (+Y) and Bottom (-Y)
  pushQuad(vertices, uvs, [-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz], ut.x, 0, ut.y, 1);
  pushQuad(vertices, uvs, [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz], ut.x, 0, ut.y, 1);
  return { vertices: new Float32Array(vertices), uvs: new Float32Array(uvs) };
}

function appendMesh(parts) {
  let vLen = 0;
  let uLen = 0;
  for (const part of parts) {
    vLen += part.mesh.vertices.length;
    uLen += part.mesh.uvs.length;
  }
  const vertices = new Float32Array(vLen);
  const uvs = new Float32Array(uLen);
  let vOff = 0;
  let uOff = 0;
  for (const { mesh, offset } of parts) {
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      vertices[vOff + i] = mesh.vertices[i] + offset.x;
      vertices[vOff + i + 1] = mesh.vertices[i + 1] + offset.y;
      vertices[vOff + i + 2] = mesh.vertices[i + 2] + offset.z;
    }
    uvs.set(mesh.uvs, uOff);
    vOff += mesh.vertices.length;
    uOff += mesh.uvs.length;
  }
  return { vertices, uvs };
}

function cellPutter(data, atlasWidth, cell) {
  const S = ARMOR_CELL;
  const ox = cell * S;
  return (x, y, rgb) => {
    if (x < 0 || x >= S || y < 0 || y >= S || !rgb)
      return;
    const o = (y * atlasWidth + ox + x) * 4;
    data[o] = Utils.clamp(Math.round(rgb.x), 0, 255);
    data[o + 1] = Utils.clamp(Math.round(rgb.y), 0, 255);
    data[o + 2] = Utils.clamp(Math.round(rgb.z), 0, 255);
    data[o + 3] = 255;
  };
}

function drawChestCell(put, pal, mega) {
  const S = ARMOR_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (x === 0 || x === S - 1 || y === 0 || y === S - 1) {
        put(x, y, STEEL[0]);
        continue;
      }
      // V-neck ballistic collar cutout at top center
      const dx = Math.abs(x - 15.5);
      if (y <= 5 && dx < 6 - y * 0.8) {
        put(x, y, STEEL[0]);
        continue;
      }
      if (y <= 6 && Math.abs(dx - (6 - y * 0.8)) < 1.2) {
        put(x, y, pal[4]);
        continue;
      }
      // Central sternum emblem / plasma core on chest
      if (y >= 8 && y <= 16 && x >= 12 && x <= 19) {
        const rim = y === 8 || y === 16 || x === 12 || x === 19;
        const inner = y >= 10 && y <= 14 && x >= 14 && x <= 17;
        put(x, y, rim ? STEEL[1] : inner ? (mega ? pal[5] : pal[4]) : pal[3]);
        continue;
      }
      // Pectoral plate bevel seams
      if (y === 18 || (y < 18 && (x === 15 || x === 16))) {
        put(x, y, STEEL[1]);
        continue;
      }
      // Lower abdominal segmented armor ribs
      if (y > 19) {
        const ribRow = (y - 20) % 4 === 0;
        const buckle = x >= 13 && x <= 18;
        put(x, y, ribRow ? STEEL[0] : buckle ? STEEL[3] : pal[2]);
        continue;
      }
      // Beveled pectoral armor plates with diagonal specular highlight
      const sheen = x + y;
      const shade = sheen < 18 ? 4 : sheen < 30 ? 3 : 2;
      put(x, y, pal[shade]);
    }
}

function drawBackCell(put, pal) {
  const S = ARMOR_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (x === 0 || x === S - 1 || y === 0 || y === S - 1) {
        put(x, y, STEEL[0]);
        continue;
      }
      // Dorsal spine column
      if (x >= 13 && x <= 18) {
        const vertebra = y % 4 === 0;
        put(x, y, vertebra ? STEEL[0] : pal[4]);
        continue;
      }
      // Diagonal tactical harness straps
      const d1 = Math.abs(x - (4 + y * 0.35));
      const d2 = Math.abs((S - 1 - x) - (4 + y * 0.35));
      if (d1 < 2.2 || d2 < 2.2) {
        put(x, y, STEEL[1]);
        continue;
      }
      put(x, y, (y & 3) === 0 ? pal[1] : pal[2]);
    }
}

function drawShoulderCell(put, pal) {
  const S = ARMOR_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (x === 0 || x === S - 1 || y === 0 || y === S - 1) {
        put(x, y, STEEL[0]);
        continue;
      }
      if (x === 2 || x === S - 3 || y === 2 || y === S - 3) {
        put(x, y, pal[4]);
        continue;
      }
      // Glowing pauldron ridge stripe
      if (y >= 12 && y <= 19) {
        put(x, y, y >= 14 && y <= 17 ? pal[5] : pal[4]);
        continue;
      }
      put(x, y, pal[3]);
    }
}

function drawTrimCell(put, pal) {
  const S = ARMOR_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (x === 0 || x === S - 1 || y === 0 || y === S - 1) {
        put(x, y, STEEL[0]);
        continue;
      }
      // Side cummerbund buckles and luminous status pips
      if (x >= 11 && x <= 20) {
        const pip = (y & 3) === 1;
        put(x, y, pip ? pal[4] : STEEL[1]);
        continue;
      }
      put(x, y, (y & 1) === 0 ? pal[2] : STEEL[2]);
    }
}

/** Returns the power-of-two 128x32 RGBA texture atlas for Green Security Armor ('green') or Blue MegaArmor ('blue'). */
export function armorAtlas(color = 'green') {
  const pal = PALETTES[color] ?? PALETTES.green;
  const mega = color === 'blue';
  const width = ARMOR_CELL * ARMOR_FRAMES;
  const height = ARMOR_CELL;
  const data = new Uint8Array(width * height * 4);
  drawChestCell(cellPutter(data, width, ARMOR_CELLS.chest), pal, mega);
  drawBackCell(cellPutter(data, width, ARMOR_CELLS.back), pal);
  drawShoulderCell(cellPutter(data, width, ARMOR_CELLS.shoulder), pal);
  drawTrimCell(cellPutter(data, width, ARMOR_CELLS.trim), pal);
  return { name: `${color}Armor`, data, width, height, cell: ARMOR_CELL, frames: ARMOR_FRAMES };
}

/**
 * Builds the 3D UAC combat armor vest geometry:
 * - Upper torso cuirass + protruding chest trauma plate
 * - Segmented abdominal waist belt + side cummerbund guards
 * - Left & right shoulder pauldrons flanking the neck opening
 */
export function armorMesh() {
  const c = ARMOR_CELLS;
  return appendMesh([
    // Main upper torso cuirass
    { mesh: boxMesh(new Vec3(13.6, 10.2, 7.2), c.chest, c.back, c.trim, c.shoulder), offset: new Vec3(0, 9.6, 0) },
    // Raised pectoral / sternum trauma plate on front chest
    { mesh: boxMesh(new Vec3(10.8, 6.6, 1.8), c.chest, c.chest, c.trim, c.shoulder), offset: new Vec3(0, 10.6, 4.1) },
    // Dorsal spine armor pack on back
    { mesh: boxMesh(new Vec3(9.2, 7.2, 1.4), c.back, c.back, c.trim, c.shoulder), offset: new Vec3(0, 10.2, -4.0) },
    // Lower abdominal segmented waist belt
    { mesh: boxMesh(new Vec3(12.0, 4.2, 6.4), c.chest, c.back, c.trim, c.trim), offset: new Vec3(0, 3.0, 0) },
    // Side rib cummerbund guards
    { mesh: boxMesh(new Vec3(15.0, 5.4, 5.0), c.trim, c.trim, c.trim, c.shoulder), offset: new Vec3(0, 7.4, 0) },
    // Left and right shoulder pauldrons flanking the collar opening
    { mesh: boxMesh(new Vec3(4.4, 3.0, 8.2), c.shoulder, c.shoulder, c.shoulder, c.shoulder), offset: new Vec3(-4.9, 15.6, 0) },
    { mesh: boxMesh(new Vec3(4.4, 3.0, 8.2), c.shoulder, c.shoulder, c.shoulder, c.shoulder), offset: new Vec3(4.9, 15.6, 0) },
  ]);
}
