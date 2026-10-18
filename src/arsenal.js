import { Bezier, Trigo, Utils, Vec2, Vec3 } from '@1pizzateam/spock';

function smoothStep(min, max, x) {
  return Bezier.cubic(0, 0, 1, 1, Utils.clamp(Utils.normalize(x, min, max), 0, 1));
}

export const ARSENAL_CELL = 32;
export const ARSENAL_FRAMES = 4;

export const ARSENAL_CELLS = {
  body: 0,
  barrel: 1,
  grip: 2,
  muzzle: 3,
};

export const CHAINSAW_TOOTH_PITCH = 1.6;

const scratchEdgeA = new Vec3();
const scratchEdgeB = new Vec3();
const scratchNormal = new Vec3();

function pushQuad(vertices, normals, uvs, c0, c1, c2, c3, u0, v0, u1, v1) {
  scratchEdgeA.setScalar(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]);
  scratchEdgeB.setScalar(c2[0] - c0[0], c2[1] - c0[1], c2[2] - c0[2]);
  scratchNormal.crossVectors(scratchEdgeA, scratchEdgeB);
  if (scratchNormal.getMagnitude(true) > 0)
    scratchNormal.normalize();
  else
    scratchNormal.setScalar(0, 1, 0);
  const nx = scratchNormal.x;
  const ny = scratchNormal.y;
  const nz = scratchNormal.z;
  const corners = [c0, c1, c2, c3];
  const quadUvs = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
  for (const k of [0, 1, 2, 0, 2, 3]) {
    vertices.push(...corners[k]);
    normals.push(nx, ny, nz);
    uvs.push(...quadUvs[k]);
  }
}

function boxMesh(size = new Vec3(1, 1, 1)) {
  const hx = size.x * 0.5;
  const hy = size.y * 0.5;
  const hz = size.z * 0.5;
  const vertices = [];
  const normals = [];
  const uvs = [];
  pushQuad(vertices, normals, uvs, [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], 0, 0, 1, 1);
  pushQuad(vertices, normals, uvs, [hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], 0, 0, 1, 1);
  pushQuad(vertices, normals, uvs, [hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], 0, 0, 1, 1);
  pushQuad(vertices, normals, uvs, [-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], 0, 0, 1, 1);
  pushQuad(vertices, normals, uvs, [-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz], 0, 0, 1, 1);
  pushQuad(vertices, normals, uvs, [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz], 0, 0, 1, 1);
  return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), uvs: new Float32Array(uvs) };
}

function prismMesh(bottomSize = new Vec3(1, 1, 1), topSize = new Vec3(1, 1, 1), topShift = new Vec2(0, 0)) {
  const bx = bottomSize.x * 0.5;
  const tx = topSize.x * 0.5;
  const hy = bottomSize.y * 0.5;
  const bz = bottomSize.z * 0.5;
  const tz = topSize.z * 0.5;
  const sx = topShift.x;
  const sz = topShift.y;
  const bFL = [-bx, -hy, bz];
  const bFR = [bx, -hy, bz];
  const bBR = [bx, -hy, -bz];
  const bBL = [-bx, -hy, -bz];
  const tFL = [sx - tx, hy, sz + tz];
  const tFR = [sx + tx, hy, sz + tz];
  const tBR = [sx + tx, hy, sz - tz];
  const tBL = [sx - tx, hy, sz - tz];
  const vertices = [];
  const normals = [];
  const uvs = [];
  pushQuad(vertices, normals, uvs, bFL, bFR, tFR, tFL, 0, 0, 1, 1);
  pushQuad(vertices, normals, uvs, bBR, bBL, tBL, tBR, 0, 0, 1, 1);
  pushQuad(vertices, normals, uvs, bFR, bBR, tBR, tFR, 0, 0, 1, 1);
  pushQuad(vertices, normals, uvs, bBL, bFL, tFL, tBL, 0, 0, 1, 1);
  pushQuad(vertices, normals, uvs, tFL, tFR, tBR, tBL, 0, 0, 1, 1);
  pushQuad(vertices, normals, uvs, bBL, bBR, bFR, bFL, 0, 0, 1, 1);
  return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), uvs: new Float32Array(uvs) };
}

function cylinderMesh(radiusLength = new Vec2(1, 1), segments = 12) {
  const r = radiusLength.x;
  const hz = radiusLength.y * 0.5;
  const vertices = [];
  const normals = [];
  const uvs = [];
  for (let i = 0; i < segments; i++) {
    const u0 = i / segments;
    const u1 = (i + 1) / segments;
    const a0 = u0 * Trigo.twopi;
    const a1 = u1 * Trigo.twopi;
    const x0 = Math.cos(a0) * r;
    const y0 = Math.sin(a0) * r;
    const x1 = Math.cos(a1) * r;
    const y1 = Math.sin(a1) * r;
    pushQuad(vertices, normals, uvs, [x0, y0, -hz], [x1, y1, -hz], [x1, y1, hz], [x0, y0, hz], u0, 0, u1, 1);
    vertices.push(0, 0, hz, x0, y0, hz, x1, y1, hz);
    normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
    uvs.push(0.5, 0.5, 0.5 + Math.cos(a0) * 0.45, 0.5 + Math.sin(a0) * 0.45, 0.5 + Math.cos(a1) * 0.45, 0.5 + Math.sin(a1) * 0.45);
    vertices.push(0, 0, -hz, x1, y1, -hz, x0, y0, -hz);
    normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
    uvs.push(0.5, 0.5, 0.5 + Math.cos(a1) * 0.45, 0.5 + Math.sin(a1) * 0.45, 0.5 + Math.cos(a0) * 0.45, 0.5 + Math.sin(a0) * 0.45);
  }
  return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), uvs: new Float32Array(uvs) };
}

function rotateMeshX(raw, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const vertices = new Float32Array(raw.vertices.length);
  const normals = new Float32Array(raw.normals.length);
  for (let i = 0; i < raw.vertices.length; i += 3) {
    const y = raw.vertices[i + 1];
    const z = raw.vertices[i + 2];
    vertices[i] = raw.vertices[i];
    vertices[i + 1] = y * c - z * s;
    vertices[i + 2] = y * s + z * c;
    const ny = raw.normals[i + 1];
    const nz = raw.normals[i + 2];
    normals[i] = raw.normals[i];
    normals[i + 1] = ny * c - nz * s;
    normals[i + 2] = ny * s + nz * c;
  }
  return { vertices, normals, uvs: new Float32Array(raw.uvs) };
}

function limbFromTo(p0, size0, p1, size1, mapper) {
  return {
    mesh: mapper(
      rotateMeshX(
        prismMesh(
          new Vec3(size0.x, p1.z - p0.z, size0.y),
          new Vec3(size1.x, p1.z - p0.z, size1.y),
          new Vec2(p1.x - p0.x, -(p1.y - p0.y))
        ),
        Trigo.halfpi
      )
    ),
    offset: new Vec3(p0.x, p0.y, (p0.z + p1.z) * 0.5),
  };
}

function appendMesh(parts) {
  let vLen = 0;
  let uLen = 0;
  for (const part of parts) {
    vLen += part.mesh.vertices.length;
    uLen += part.mesh.uvs.length;
  }
  const vertices = new Float32Array(vLen);
  const normals = new Float32Array(vLen);
  const uvs = new Float32Array(uLen);
  let vOff = 0;
  let uOff = 0;
  for (const { mesh, offset } of parts) {
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      vertices[vOff + i] = mesh.vertices[i] + offset.x;
      vertices[vOff + i + 1] = mesh.vertices[i + 1] + offset.y;
      vertices[vOff + i + 2] = mesh.vertices[i + 2] + offset.z;
    }
    if (mesh.normals)
      normals.set(mesh.normals, vOff);
    uvs.set(mesh.uvs, uOff);
    vOff += mesh.vertices.length;
    uOff += mesh.uvs.length;
  }
  return { vertices, normals, uvs };
}

function createCanvas(size, count) {
  const width = size * count;
  const height = size;
  const data = new Uint8Array(width * height * 4);
  const put = (cell, x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size)
      return;
    const idx = (y * width + (cell * size + x)) * 4;
    data[idx] = Utils.clamp(Math.round(r), 0, 255);
    data[idx + 1] = Utils.clamp(Math.round(g), 0, 255);
    data[idx + 2] = Utils.clamp(Math.round(b), 0, 255);
    data[idx + 3] = Utils.clamp(Math.round(a), 0, 255);
  };
  const rect = (cell, x0, y0, w, h, rgb) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        put(cell, x, y, rgb.x, rgb.y, rgb.z);
  };
  return { width, height, data, put, rect };
}

function cellRange(cell) {
  const step = 1 / ARSENAL_FRAMES;
  const pad = 0.003;
  return new Vec2(cell * step + pad, (cell + 1) * step - pad);
}

function remapCell(raw, cell) {
  const range = cellRange(cell);
  const span = range.y - range.x;
  const uvs = new Float32Array(raw.uvs.length);
  for (let i = 0; i < raw.uvs.length; i += 2) {
    uvs[i] = range.x + Utils.clamp(raw.uvs[i], 0, 1) * span;
    uvs[i + 1] = Utils.clamp(raw.uvs[i + 1], 0, 1);
  }
  return { ...raw, uvs };
}

function remapCellSub(raw, cell, vMin = 0, vMax = 1) {
  const range = cellRange(cell);
  const span = range.y - range.x;
  const vSpan = vMax - vMin;
  const uvs = new Float32Array(raw.uvs.length);
  for (let i = 0; i < raw.uvs.length; i += 2) {
    uvs[i] = range.x + Utils.clamp(raw.uvs[i], 0, 1) * span;
    uvs[i + 1] = 1 - (vMin + Utils.clamp(raw.uvs[i + 1], 0, 1) * vSpan);
  }
  return { ...raw, uvs };
}

function paintChaingunBody(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const bevel = x < 2 || y < 2 || x >= S - 2 || y >= S - 2;
      const groove = y >= 12 && y <= 19 && x >= 5 && x <= S - 6;
      const vent = groove && x % 4 < 2;
      const belt = y >= 22 && y <= 27 && x >= 6 && x <= S - 7 && x % 3 !== 0;
      const base = bevel ? 42 : groove ? 58 : 82;
      if (belt)
        canvas.put(cell, x, y, 218, 174, 52);
      else if (vent)
        canvas.put(cell, x, y, 22, 26, 32);
      else
        canvas.put(cell, x, y, base, base + 6, base + 14);
    }
}

function paintChaingunBarrel(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const flute = Math.sin((x / S) * Trigo.pi * 6) * 28;
      const band = y < 4 || (y >= 14 && y <= 17) || y >= S - 4;
      const v = Utils.clamp(112 + flute + (band ? 26 : 0), 34, 210);
      canvas.put(cell, x, y, v, v + 8, v + 18);
    }
}

function paintChaingunGrip(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi);
      if (y < 12) {
        const knurl = ((x + y) & 1) * 14;
        canvas.put(cell, x, y, 48 + knurl, 42 + knurl * 0.8, 36 + knurl * 0.6);
      } else if (y < 20) {
        // Saddle-brown tactical leather combat glove with knuckle creases & specular highlights
        const crease = y === 15 || y === 18 || x % 7 === 0 ? -18 : 0;
        const pebble = ((x + y) & 1) === 0 ? 6 : -5;
        const spec = Math.pow(cyl, 2.0) * 42;
        const r = Utils.clamp(78 + cyl * 42 + spec + crease + pebble, 34, 168);
        const g = Utils.clamp(48 + cyl * 28 + spec * 0.72 + crease * 0.7 + pebble, 20, 114);
        const b = Utils.clamp(28 + cyl * 18 + spec * 0.45 + crease * 0.5 + pebble, 12, 74);
        canvas.put(cell, x, y, r, g, b);
      } else if (y < 25) {
        // Military olive-drab woven wrist cuff band
        const weave = ((x + y) & 1) === 0 ? 6 : -6;
        const seam = y === 20 || y === 24 ? -14 : 0;
        const r = Utils.clamp(64 + cyl * 36 + weave + seam, 28, 118);
        const g = Utils.clamp(78 + cyl * 42 + weave + seam, 36, 138);
        const b = Utils.clamp(46 + cyl * 24 + weave + seam, 18, 84);
        canvas.put(cell, x, y, r, g, b);
      } else {
        // Warm sun-tanned muscular bare forearm skin with subtle extensor tendon shading
        const tendon = Math.sin((x / S) * Trigo.pi * 2.0) * 12;
        const pore = ((x * 3 + y * 5) & 3) === 0 ? -4 : 2;
        const r = Utils.clamp(166 + cyl * 56 + tendon + pore, 108, 238);
        const g = Utils.clamp(118 + cyl * 46 + tendon * 0.75 + pore, 72, 186);
        const b = Utils.clamp(88 + cyl * 36 + tendon * 0.55 + pore, 50, 146);
        canvas.put(cell, x, y, r, g, b);
      }
    }
}

function paintChaingunMuzzle(canvas, cell) {
  const S = ARSENAL_CELL;
  const half = (S - 1) * 0.5;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const r = Math.hypot(dx, dy);
      const hole = r > 0.35 && r < 0.72 && Math.cos(Math.atan2(dy, dx) * 6) > 0.35;
      if (hole || r < 0.18)
        canvas.put(cell, x, y, 16, 18, 22);
      else
        canvas.put(cell, x, y, 134, 146, 162);
    }
}

let cachedChaingunAtlas = null;
let cachedChaingunParts = null;
let cachedChaingunMesh = null;

export function chaingunAtlas() {
  if (cachedChaingunAtlas)
    return cachedChaingunAtlas;
  const canvas = createCanvas(ARSENAL_CELL, ARSENAL_FRAMES);
  paintChaingunBody(canvas, ARSENAL_CELLS.body);
  paintChaingunBarrel(canvas, ARSENAL_CELLS.barrel);
  paintChaingunGrip(canvas, ARSENAL_CELLS.grip);
  paintChaingunMuzzle(canvas, ARSENAL_CELLS.muzzle);
  cachedChaingunAtlas = { width: canvas.width, height: canvas.height, data: canvas.data };
  return cachedChaingunAtlas;
}

/**
 * Builds the articulated 3D chaingun sub-meshes so the 6-barrel rotary Gatling cluster spins around its Z axis:
 * - `body`: heavy armored receiver housing, beveled upper shroud, side ammo drum & brass belt feed chute, rear motor cap, and tubular handlebars
 * - `rotor`: 6 fluted steel barrels, central rotor shaft, and 3 perforated barrel clamp disks centered around `(0, 0, 0)`
 * - `hands`: first-person player's leather-gloved hands, military olive-drab wrist cuffs, and muscular bare forearms gripping the left vertical handlebar and top horizontal crossbar
 */
export function chaingunParts() {
  if (cachedChaingunParts)
    return cachedChaingunParts;

  const GRIP = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.02, 0.35);
  const GLOVE = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.39, 0.6);
  const CUFF = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.64, 0.76);
  const ARM = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.8, 0.98);

  const lift = 9.6;
  const bodyParts = [
    // Main armored receiver housing (compact rear deck so the 6-barrel rotor projects prominently in front)
    {
      mesh: remapCell(boxMesh(new Vec3(7.4, 4.8, 8.6)), ARSENAL_CELLS.body),
      offset: new Vec3(0.3, lift - 1.4, -4.4),
    },
    // Upper sloped heat shield / receiver hood with brass feed vents
    {
      mesh: remapCell(prismMesh(new Vec3(7.0, 1.0, 8.2), new Vec3(5.0, 1.0, 7.2), new Vec2(0, 0.2)), ARSENAL_CELLS.body),
      offset: new Vec3(0.3, lift + 1.5, -4.4),
    },
    // Forward barrel shroud collar where the 6-barrel rotor emerges from the receiver
    {
      mesh: GRIP(cylinderMesh(new Vec2(2.85, 1.6), 12)),
      offset: new Vec3(0, lift + 0.7, -0.2),
    },
    // Side-mounted ammunition drum box + brass cartridge belt feed chute on the left flank (-X is screen left)
    {
      mesh: GRIP(boxMesh(new Vec3(3.6, 4.2, 5.0))),
      offset: new Vec3(-4.8, lift - 1.5, -4.0),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(2.8, 1.9, 3.8)), ARSENAL_CELLS.body),
      offset: new Vec3(-3.8, lift + 0.4, -4.0),
    },
    // Rear electric drive motor housing
    {
      mesh: GRIP(cylinderMesh(new Vec2(2.4, 1.6), 10)),
      offset: new Vec3(0.3, lift - 1.1, -9.0),
    },
    // Tubular wrap-around handlebars:
    // Top horizontal crossbar (y = lift + 3.2, z = -3.8), right vertical support post (x = 3.9), and left vertical grip handle (x = -3.5)
    {
      mesh: GRIP(boxMesh(new Vec3(7.9, 0.82, 0.82))),
      offset: new Vec3(0.2, lift + 3.2, -3.8),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(0.82, 3.2, 0.82))),
      offset: new Vec3(3.9, lift + 1.7, -3.8),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(0.82, 3.8, 0.82))),
      offset: new Vec3(-3.5, lift + 1.6, -2.7),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(1.7, 0.82, 0.82))),
      offset: new Vec3(-2.8, lift - 0.1, -2.7),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(0.82, 0.82, 1.5))),
      offset: new Vec3(-3.5, lift + 3.2, -3.25),
    },
  ];

  // Rotary 6-barrel Gatling assembly centered around local (0, 0, 0) so Z-rotation spins cleanly on axis
  const rotorParts = [
    // Central rotor drive shaft
    {
      mesh: GRIP(cylinderMesh(new Vec2(1.05, 19.8), 8)),
      offset: new Vec3(0, 0, 0),
    },
    // Rear, middle, and front perforated muzzle clamp plates (radius 3.25 so the 6 outer barrels protrude cleanly)
    {
      mesh: remapCell(cylinderMesh(new Vec2(3.25, 1.3), 12), ARSENAL_CELLS.muzzle),
      offset: new Vec3(0, 0, -6.4),
    },
    {
      mesh: remapCell(cylinderMesh(new Vec2(3.25, 1.2), 12), ARSENAL_CELLS.muzzle),
      offset: new Vec3(0, 0, 0.8),
    },
    {
      mesh: remapCell(cylinderMesh(new Vec2(3.35, 1.6), 12), ARSENAL_CELLS.muzzle),
      offset: new Vec3(0, 0, 7.8),
    },
  ];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Trigo.twopi + 0.26;
    rotorParts.push({
      mesh: remapCell(cylinderMesh(new Vec2(0.95, 20.6), 8), ARSENAL_CELLS.barrel),
      offset: new Vec3(Math.cos(a) * 2.74, Math.sin(a) * 2.74, 0.5),
    });
  }

  // Water-tight joint cross-sections for left limb (sweeping from lower-left screen into left vertical handlebar)
  const lElbow = new Vec3(-9.4, lift - 4.4, -10.8);
  const lMidArm = new Vec3(-6.9, lift - 0.4, -6.9);
  const lWristRear = new Vec3(-5.55, lift + 0.9, -4.9);
  const lWristFront = new Vec3(-4.72, lift + 1.52, -3.65);
  const lHandBack = new Vec3(-4.22, lift + 1.75, -2.85);
  const sLElbow = new Vec2(2.75, 2.35);
  const sLMidArm = new Vec2(2.3, 2.0);
  const sLWristRear = new Vec2(1.92, 1.74);
  const sLWristFront = new Vec2(1.66, 1.58);
  const sLHandBack = new Vec2(1.36, 1.85);

  // Water-tight joint cross-sections for right limb (sweeping from lower-right screen into top horizontal crossbar)
  const rElbow = new Vec3(8.2, lift - 3.6, -11.4);
  const rMidArm = new Vec3(5.6, lift + 0.4, -7.8);
  const rWristRear = new Vec3(4.15, lift + 2.05, -5.85);
  const rWristFront = new Vec3(3.25, lift + 3.05, -4.6);
  const rHandBack = new Vec3(2.55, lift + 3.68, -3.85);
  const sRElbow = new Vec2(2.85, 2.4);
  const sRMidArm = new Vec2(2.4, 2.02);
  const sRWristRear = new Vec2(2.04, 1.72);
  const sRWristFront = new Vec2(1.82, 1.48);
  const sRHandBack = new Vec2(1.92, 1.18);

  // First-person player hands, military olive-drab wrist cuffs & smooth muscular forearms gripping both handlebars
  const handParts = [
    // A. Left leather-gloved hand gripping the left vertical handlebar (x = -3.5, y = lift + 1.6, z = -2.7)
    {
      mesh: GLOVE(prismMesh(new Vec3(1.25, 2.05, 1.5), new Vec3(1.08, 1.9, 1.32), new Vec2(-0.08, 0.06))),
      offset: new Vec3(-4.15, lift + 1.75, -2.72),
    },
    // Left thumb wrapping over the upper-inner side of the left vertical handlebar
    {
      mesh: GLOVE(boxMesh(new Vec3(1.22, 0.56, 0.84))),
      offset: new Vec3(-3.55, lift + 2.68, -3.22),
    },
    {
      mesh: GLOVE(boxMesh(new Vec3(0.7, 0.52, 0.86))),
      offset: new Vec3(-2.92, lift + 2.5, -2.7),
    },
    // Water-tight left glove gauntlet, military olive-drab cuff, and muscular bare forearm
    limbFromTo(lWristFront, sLWristFront, lHandBack, sLHandBack, GLOVE),
    limbFromTo(lWristRear, sLWristRear, lWristFront, sLWristFront, CUFF),
    limbFromTo(lMidArm, sLMidArm, lWristRear, sLWristRear, ARM),
    limbFromTo(lElbow, sLElbow, lMidArm, sLMidArm, ARM),

    // B. Right leather-gloved hand gripping the top horizontal crossbar (x = 1.3..3.3, y = lift + 3.2, z = -3.8)
    {
      mesh: GLOVE(prismMesh(new Vec3(2.1, 0.96, 1.52), new Vec3(1.92, 0.88, 1.35), new Vec2(0.08, 0.08))),
      offset: new Vec3(2.35, lift + 3.78, -3.85),
    },
    // Right thumb wrapping under the rear-left of the top crossbar
    {
      mesh: GLOVE(boxMesh(new Vec3(0.82, 0.84, 0.9))),
      offset: new Vec3(1.18, lift + 3.18, -4.3),
    },
    {
      mesh: GLOVE(boxMesh(new Vec3(0.88, 0.56, 0.84))),
      offset: new Vec3(1.48, lift + 2.6, -3.8),
    },
    // Water-tight right glove gauntlet, military olive-drab cuff, and muscular bare forearm
    limbFromTo(rWristFront, sRWristFront, rHandBack, sRHandBack, GLOVE),
    limbFromTo(rWristRear, sRWristRear, rWristFront, sRWristFront, CUFF),
    limbFromTo(rMidArm, sRMidArm, rWristRear, sRWristRear, ARM),
    limbFromTo(rElbow, sRElbow, rMidArm, sRMidArm, ARM),
  ];

  // 4 curled leather fingers for the left hand around the left vertical handlebar (-3.5, lift + 1.6, -2.7)
  for (const fy of [lift + 0.98, lift + 1.46, lift + 1.94, lift + 2.42])
    handParts.push(
      {
        mesh: GLOVE(boxMesh(new Vec3(1.34, 0.42, 0.78))),
        offset: new Vec3(-3.65, fy, -1.98),
      },
      {
        mesh: GLOVE(boxMesh(new Vec3(0.62, 0.4, 0.84))),
        offset: new Vec3(-2.92, fy, -2.55),
      }
    );

  // 4 curled leather fingers for the right hand around the top horizontal crossbar (x = 1.55..3.15, y = lift + 3.2, z = -3.8)
  for (const fx of [1.56, 2.06, 2.56, 3.06])
    handParts.push(
      {
        mesh: GLOVE(boxMesh(new Vec3(0.44, 1.28, 0.78))),
        offset: new Vec3(fx, lift + 3.22, -3.08),
      },
      {
        mesh: GLOVE(boxMesh(new Vec3(0.42, 0.58, 0.86))),
        offset: new Vec3(fx, lift + 2.56, -3.62),
      }
    );

  const pivots = {
    rotor: new Vec3(0, lift + 0.7, 9.6),
    hands: new Vec3(0, 0, 0),
  };

  cachedChaingunParts = {
    body: appendMesh(bodyParts),
    rotor: appendMesh(rotorParts),
    hands: appendMesh(handParts),
    pivots,
  };
  return cachedChaingunParts;
}

export function chaingunMesh() {
  if (cachedChaingunMesh)
    return cachedChaingunMesh;
  const parts = chaingunParts();
  cachedChaingunMesh = appendMesh([
    { mesh: parts.body, offset: new Vec3(0, 0, 0) },
    { mesh: parts.rotor, offset: parts.pivots.rotor },
  ]);
  return cachedChaingunMesh;
}

/**
 * Computes the allocation-free 3D first-person chaingun viewmodel pose and rotary barrel spin:
 * - `offset` (`Vec3`): camera-relative `(right, up, forward)` offset
 * - `rotation` (`Vec3`): local `(pitch, yaw, roll)` Euler angles relative to camera aim
 * - `rotorRot` (`Vec3`): local `(0, 0, roll)` Euler rotation spinning the 6-barrel cluster around its Z axis
 */
export function chaingunPose(
  { time = 0, bob = 0, moving = 0, recoil = 0, switchOffset = 0, attacking = false, spinDown = 0 } = {},
  target = null
) {
  const out = target ?? {
    offset: new Vec3(),
    rotation: new Vec3(),
    rotorRot: new Vec3(),
  };
  const clampedSwitch = Utils.clamp(switchOffset, 0, 1);
  const kick = attacking ? Math.max(0.35, Math.min(1, recoil)) : Math.min(1, recoil * 0.7);
  const spinning = attacking || spinDown > 0;

  const walkSway = Math.sin(bob) * 0.62 * moving;
  const walkBob = Math.abs(Math.cos(bob)) * 0.4 * moving;
  const joltX = attacking ? Math.sin(time * 92) * 0.14 : 0;
  const joltY = attacking ? Math.cos(time * 108) * 0.12 : 0;
  const joltZ = attacking ? Math.sin(time * 78) * 0.24 : 0;

  const right = 0.85 + walkSway * 0.68 + joltX;
  const up = -9.35 + kick * 0.16 - walkBob + joltY - clampedSwitch * 5.4;
  const forward = 13.8 - kick * 0.95 + joltZ - clampedSwitch * 1.4;
  out.offset.setScalar(right, up, forward);

  const pitch = 0.048 - kick * 0.035 + joltY * 0.14 + clampedSwitch * 0.46;
  const yaw = 0.08 - walkSway * 0.05 + joltX * 0.12;
  const roll = -walkSway * 0.07 + (attacking ? Math.sin(time * 86) * 0.035 : 0);
  out.rotation.setScalar(pitch, yaw, roll);

  const spinRate = attacking ? 28 : spinning ? 16 : 0;
  out.rotorRot.setScalar(0, 0, time * spinRate);
  return out;
}

function paintRocketBody(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const seam = x < 2 || y < 2 || x >= S - 2 || y >= S - 2;
      const hazard = y >= 10 && y <= 21 && x >= 6 && x <= S - 7;
      const stripe = hazard && ((x + y) & 4) === 0;
      if (stripe)
        canvas.put(cell, x, y, 224, 178, 38);
      else if (hazard)
        canvas.put(cell, x, y, 36, 34, 30);
      else if (seam)
        canvas.put(cell, x, y, 44, 52, 36);
      else
        canvas.put(cell, x, y, 78, 92, 62);
    }
}

function paintRocketTube(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const shade = Math.sin((x / S) * Trigo.pi) * 34;
      const ring = y < 3 || y >= S - 3 || (y >= 14 && y <= 17);
      const g = Utils.clamp(68 + shade + (ring ? 22 : 0), 32, 164);
      canvas.put(cell, x, y, g * 0.86, g, g * 0.72);
    }
}

function paintRocketGrip(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const grain = ((x * 3 + y) & 3) * 8;
      canvas.put(cell, x, y, 92 + grain, 56 + grain * 0.7, 34 + grain * 0.4);
    }
}

function paintRocketWarhead(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const tip = y < 12;
      if (tip)
        canvas.put(cell, x, y, 206, 52, 38);
      else
        canvas.put(cell, x, y, 168, 172, 178);
    }
}

let cachedRocketLauncherAtlas = null;
let cachedRocketLauncherParts = null;
let cachedRocketLauncherMesh = null;

export function rocketLauncherAtlas() {
  if (cachedRocketLauncherAtlas)
    return cachedRocketLauncherAtlas;
  const canvas = createCanvas(ARSENAL_CELL, ARSENAL_FRAMES);
  paintRocketBody(canvas, ARSENAL_CELLS.body);
  paintRocketTube(canvas, ARSENAL_CELLS.barrel);
  paintRocketGrip(canvas, ARSENAL_CELLS.grip);
  paintRocketWarhead(canvas, ARSENAL_CELLS.muzzle);
  cachedRocketLauncherAtlas = { width: canvas.width, height: canvas.height, data: canvas.data };
  return cachedRocketLauncherAtlas;
}

/**
 * Returns the articulated 3D rocket launcher geometries and joint pivots:
 * - `body`: Heavy olive-drab cylindrical launch tube, armored octagonal shroud with hazard markings,
 *   front blast collar, flared rear venturi exhaust nozzle bell, top carry handle & sighting rail,
 *   side optical targeting scope, twin hydraulic recoil damper cylinders, and front/rear grips.
 * - `warhead`: Articulated 3D crimson-tipped high-explosive rocket warhead with cruciform fins that
 *   launches out of the muzzle on fire and slides forward from the breech during the auto-loader reload cycle.
 */
export function rocketLauncherParts() {
  if (cachedRocketLauncherParts)
    return cachedRocketLauncherParts;

  const bodyParts = [
    // 1. Main cylindrical olive-drab launch tube & armored octagonal shroud
    {
      mesh: remapCell(rotateMeshX(cylinderMesh(new Vec2(3.6, 23.0), 12), Trigo.halfpi), ARSENAL_CELLS.barrel),
      offset: new Vec3(0, 1.5, 0),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(7.8, 8.4, 18.6)), ARSENAL_CELLS.barrel),
      offset: new Vec3(0, 1.5, -0.2),
    },
    // Front heavy blast collar ring & rear hazard-striped breech collar
    {
      mesh: remapCell(boxMesh(new Vec3(9.6, 10.2, 4.2)), ARSENAL_CELLS.body),
      offset: new Vec3(0, 1.5, 10.2),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(9.4, 10.0, 4.0)), ARSENAL_CELLS.body),
      offset: new Vec3(0, 1.5, -9.8),
    },
    // Flared rear venturi backblast nozzle bell
    {
      mesh: remapCell(prismMesh(new Vec3(8.2, 8.6, 3.6), new Vec3(10.6, 11.0, 3.6), new Vec2(0, 0)), ARSENAL_CELLS.grip),
      offset: new Vec3(0, 1.5, -13.2),
    },
    // 2. Twin side hydraulic recoil damper cylinders flanking the launch tube
    {
      mesh: remapCell(rotateMeshX(cylinderMesh(new Vec2(0.95, 15.6), 8), Trigo.halfpi), ARSENAL_CELLS.grip),
      offset: new Vec3(4.35, 0.2, 0.8),
    },
    {
      mesh: remapCell(rotateMeshX(cylinderMesh(new Vec2(0.95, 15.6), 8), Trigo.halfpi), ARSENAL_CELLS.grip),
      offset: new Vec3(-4.35, 0.2, 0.8),
    },
    // 3. Top carry handle & sighting rail bridge
    {
      mesh: remapCell(boxMesh(new Vec3(1.8, 1.8, 1.6)), ARSENAL_CELLS.grip),
      offset: new Vec3(0, 6.2, 5.2),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(1.8, 1.8, 1.6)), ARSENAL_CELLS.grip),
      offset: new Vec3(0, 6.2, -3.8),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(2.1, 1.1, 11.2)), ARSENAL_CELLS.body),
      offset: new Vec3(0, 7.2, 0.7),
    },
    // 4. Side-mounted optical rangefinder / targeting scope assembly
    {
      mesh: remapCell(boxMesh(new Vec3(3.4, 3.4, 6.2)), ARSENAL_CELLS.body),
      offset: new Vec3(4.8, 4.5, 2.2),
    },
    {
      mesh: remapCell(rotateMeshX(cylinderMesh(new Vec2(1.25, 2.4), 8), Trigo.halfpi), ARSENAL_CELLS.grip),
      offset: new Vec3(4.8, 4.5, 6.0),
    },
    // 5. Forward vertical stabilization foregrip & rear trigger grip
    {
      mesh: remapCell(prismMesh(new Vec3(3.1, 6.2, 3.8), new Vec3(2.8, 6.2, 3.2), new Vec2(0, -0.6)), ARSENAL_CELLS.grip),
      offset: new Vec3(0, -5.0, 4.2),
    },
    {
      mesh: remapCell(prismMesh(new Vec3(3.0, 5.6, 3.6), new Vec3(2.7, 5.6, 3.0), new Vec2(0, 0.8)), ARSENAL_CELLS.grip),
      offset: new Vec3(0, -4.7, -4.8),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(2.2, 1.2, 3.4)), ARSENAL_CELLS.grip),
      offset: new Vec3(0, -3.2, -2.2),
    },
  ];

  // Articulated 3D high-explosive rocket warhead seated in the front launch tube
  const warheadParts = [
    {
      mesh: remapCell(rotateMeshX(cylinderMesh(new Vec2(2.35, 5.2), 10), Trigo.halfpi), ARSENAL_CELLS.muzzle),
      offset: new Vec3(0, 0, -1.2),
    },
    {
      mesh: remapCell(rotateMeshX(cylinderMesh(new Vec2(2.1, 2.8), 10), Trigo.halfpi), ARSENAL_CELLS.muzzle),
      offset: new Vec3(0, 0, 2.2),
    },
    {
      mesh: remapCell(prismMesh(new Vec3(2.9, 2.9, 2.4), new Vec3(1.1, 1.1, 2.4), new Vec2(0, 0)), ARSENAL_CELLS.muzzle),
      offset: new Vec3(0, 0, 4.4),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(5.6, 0.45, 2.2)), ARSENAL_CELLS.grip),
      offset: new Vec3(0, 0, -2.4),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(0.45, 5.6, 2.2)), ARSENAL_CELLS.grip),
      offset: new Vec3(0, 0, -2.4),
    },
  ];

  const pivots = {
    warhead: new Vec3(0, 1.5, 11.4),
  };

  cachedRocketLauncherParts = {
    body: appendMesh(bodyParts),
    warhead: appendMesh(warheadParts),
    pivots,
  };
  return cachedRocketLauncherParts;
}

export function rocketLauncherMesh() {
  if (cachedRocketLauncherMesh)
    return cachedRocketLauncherMesh;
  const parts = rocketLauncherParts();
  cachedRocketLauncherMesh = appendMesh([
    { mesh: parts.body, offset: new Vec3(0, 0, 0) },
    { mesh: parts.warhead, offset: parts.pivots.warhead },
  ]);
  return cachedRocketLauncherMesh;
}

/**
 * Computes the allocation-free 3D first-person rocket launcher viewmodel pose and breech auto-loader reload animation:
 * - `offset` (`Vec3`): camera-relative `(right, up, forward)` offset
 * - `rotation` (`Vec3`): local `(pitch, yaw, roll)` Euler angles relative to camera aim
 * - `warheadPos` (`Vec3`): local position of the chambered 3D rocket warhead inside the launch tube
 */
export function rocketLauncherPose(
  { time = 0, bob = 0, moving = 0, recoil = 0, switchOffset = 0, elapsed = -1, hasAmmo = true } = {},
  target = null
) {
  const out = target ?? {
    offset: new Vec3(),
    rotation: new Vec3(),
    warheadPos: new Vec3(),
  };
  const { pivots } = rocketLauncherParts();
  const clampedSwitch = Utils.clamp(switchOffset, 0, 1);

  // Heavy backblast recoil kickback (0 <= elapsed < 0.34)
  let blast = Math.min(1, recoil * 0.9);
  if (elapsed >= 0 && elapsed < 0.34) {
    const t = elapsed < 0.08 ? elapsed / 0.08 : 1 - (elapsed - 0.08) / 0.26;
    blast = Math.max(blast, Math.sin(Utils.clamp(t, 0, 1) * Trigo.halfpi));
  }

  // Breech auto-loader reload cycle (0.24 <= elapsed < 0.72 when hasAmmo is true)
  let reloadTilt = 0;
  let loadJolt = 0;
  let warheadShiftZ = hasAmmo ? 0 : -9.8;
  if (elapsed >= 0 && elapsed < 0.1) {
    // Fired rocket streaks forward out of the launch tube
    const launchT = elapsed / 0.1;
    warheadShiftZ = launchT * 7.5;
  } else if (elapsed >= 0.1 && elapsed < 0.72) {
    if (hasAmmo) {
      if (elapsed < 0.26)
        warheadShiftZ = -9.8;
      else if (elapsed < 0.64) {
        const u = (elapsed - 0.26) / 0.38;
        const smooth = smoothStep(0.26, 0.64, elapsed);
        warheadShiftZ = -9.8 * (1 - smooth);
        reloadTilt = Math.sin(u * Trigo.pi) * 0.45;
      } else {
        warheadShiftZ = 0;
        reloadTilt = Math.sin(((0.72 - elapsed) / 0.08) * Trigo.halfpi) * 0.15;
      }
      if (elapsed >= 0.58 && elapsed < 0.7)
        loadJolt = Math.sin(((elapsed - 0.58) / 0.12) * Trigo.pi) * 0.45;
    } else
      warheadShiftZ = -9.8;
  }

  const walkSway = Math.sin(bob) * 0.58 * moving;
  const walkBob = Math.abs(Math.cos(bob)) * 0.38 * moving;
  const idleBreathe = Math.sin(time * 2.0) * 0.04;

  const right = 1.05 - reloadTilt * 0.22 + walkSway * 0.72;
  const up = -7.35 + blast * 0.38 + reloadTilt * 0.25 - walkBob + idleBreathe - clampedSwitch * 5.6;
  const forward = 11.8 - blast * 2.35 - reloadTilt * 0.45 + loadJolt * 0.5 - clampedSwitch * 1.5;
  out.offset.setScalar(right, up, forward);

  const pitch = 0.055 - blast * 0.12 - reloadTilt * 0.04 + loadJolt * 0.03 + clampedSwitch * 0.46;
  const yaw = 0.04 + reloadTilt * 0.05 - walkSway * 0.045;
  const roll = -walkSway * 0.065 - reloadTilt * 0.08;
  out.rotation.setScalar(pitch, yaw, roll);

  out.warheadPos.setScalar(pivots.warhead.x, pivots.warhead.y, pivots.warhead.z + warheadShiftZ);
  return out;
}

function paintChainsawBody(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const seam = x < 2 || y < 2 || x >= S - 2 || y >= S - 2;
      const louver = y >= 6 && y <= 17 && x >= 5 && x <= 19 && y % 3 === 0;
      const hazard = y >= 21 && y <= 27 && x >= 4 && x <= S - 5;
      const stripe = hazard && ((x + y) & 4) === 0;
      const fuelCap = Math.hypot(x - 24.5, y - 10.5) <= 3.2;
      if (seam)
        canvas.put(cell, x, y, 36, 26, 12);
      else if (louver)
        canvas.put(cell, x, y, 18, 21, 28);
      else if (fuelCap)
        canvas.put(cell, x, y, 168, 34, 28);
      else if (hazard && !stripe)
        canvas.put(cell, x, y, 28, 30, 36);
      else {
        const arch = Math.sin((x / S) * Trigo.pi) * 28;
        const grime = ((x * 5 + y * 3) & 3) * 4 - 6;
        const r = Utils.clamp(206 + arch + grime, 120, 252);
        const g = Utils.clamp(156 + arch * 0.8 + grime, 88, 212);
        const b = Utils.clamp(32 + arch * 0.25, 16, 68);
        canvas.put(cell, x, y, r, g, b);
      }
    }
}

function paintChainsawBar(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const railEdge = y < 3 || y >= S - 3;
      const railHighlight = y === 3 || y === S - 4;
      const groove = y >= 14 && y <= 17 && x >= 4 && x <= S - 5;
      const hazard = y >= 8 && y <= 23 && x >= 7 && x <= 21 && !groove;
      const stripe = hazard && ((x + y) & 4) === 0;
      const blood = x >= 22 && ((x * 3 + y * 5) % 7 < 2);
      if (groove)
        canvas.put(cell, x, y, 20, 24, 32);
      else if (blood)
        canvas.put(cell, x, y, 184, 28, 32);
      else if (railEdge)
        canvas.put(cell, x, y, 58, 66, 82);
      else if (railHighlight)
        canvas.put(cell, x, y, 194, 208, 228);
      else if (stripe)
        canvas.put(cell, x, y, 218, 172, 38);
      else {
        const brushed = ((x * 7 + y) & 3) * 5;
        const v = Utils.clamp(132 + brushed - Math.abs(y - 15.5) * 1.4, 72, 188);
        canvas.put(cell, x, y, v, v + 10, v + 24);
      }
    }
}

function paintChainsawGrip(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi);
      if (y < 12) {
        // Dark ribbed cast-iron cooling fins & knurled tubular handlebar grip
        const fin = y % 4 === 0;
        const slot = y % 4 === 1;
        const knurl = ((x + y) & 1) * 10;
        if (fin)
          canvas.put(cell, x, y, 96 + knurl, 108 + knurl, 126 + knurl);
        else if (slot)
          canvas.put(cell, x, y, 18, 21, 28);
        else
          canvas.put(cell, x, y, 42 + knurl, 48 + knurl, 58 + knurl);
      } else if (y < 20) {
        // Saddle-brown grained combat leather glove (palms, curled fingers, thumbs & knuckle ridges)
        const crease = y === 15 || y === 18 || x % 7 === 0 ? -18 : 0;
        const pebble = ((x + y) & 1) === 0 ? 6 : -5;
        const spec = Math.pow(cyl, 2.0) * 42;
        const r = Utils.clamp(78 + cyl * 42 + spec + crease + pebble, 34, 168);
        const g = Utils.clamp(48 + cyl * 28 + spec * 0.72 + crease * 0.7 + pebble, 20, 114);
        const b = Utils.clamp(28 + cyl * 18 + spec * 0.45 + crease * 0.5 + pebble, 12, 74);
        canvas.put(cell, x, y, r, g, b);
      } else if (y < 25) {
        // Military olive-drab woven wrist cuff
        const weave = ((x + y) & 1) === 0 ? 6 : -6;
        const seam = y === 20 || y === 24 ? -14 : 0;
        const r = Utils.clamp(64 + cyl * 36 + weave + seam, 28, 118);
        const g = Utils.clamp(78 + cyl * 42 + weave + seam, 36, 138);
        const b = Utils.clamp(46 + cyl * 24 + weave + seam, 18, 84);
        canvas.put(cell, x, y, r, g, b);
      } else {
        // Warm muscular bare forearm skin with anatomical tendon & muscle-belly shading
        const tendon = Math.sin((x / S) * Trigo.pi * 2.0) * 12;
        const pore = ((x * 3 + y * 5) & 3) === 0 ? -4 : 2;
        const r = Utils.clamp(166 + cyl * 56 + tendon + pore, 108, 238);
        const g = Utils.clamp(118 + cyl * 46 + tendon * 0.75 + pore, 72, 186);
        const b = Utils.clamp(88 + cyl * 36 + tendon * 0.55 + pore, 50, 146);
        canvas.put(cell, x, y, r, g, b);
      }
    }
}

function paintChainsawChain(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const chisel = y < 8 || x < 6;
      const blood = chisel && ((x + y) % 5 < 2);
      const rivet = Math.hypot(x - 11, y - 16) <= 2.6 || Math.hypot(x - 22, y - 16) <= 2.6;
      const baseLink = y >= 8 && y <= 24;
      if (blood)
        canvas.put(cell, x, y, 204, 32, 36);
      else if (chisel)
        canvas.put(cell, x, y, 214, 224, 238);
      else if (rivet)
        canvas.put(cell, x, y, 192, 204, 222);
      else if (baseLink)
        canvas.put(cell, x, y, 68, 78, 96);
      else
        canvas.put(cell, x, y, 22, 26, 34);
    }
}

let cachedChainsawAtlas = null;
let cachedChainsawParts = null;
let cachedChainsawMesh = null;

export function chainsawAtlas() {
  if (cachedChainsawAtlas)
    return cachedChainsawAtlas;
  const canvas = createCanvas(ARSENAL_CELL, ARSENAL_FRAMES);
  paintChainsawBody(canvas, ARSENAL_CELLS.body);
  paintChainsawBar(canvas, ARSENAL_CELLS.barrel);
  paintChainsawGrip(canvas, ARSENAL_CELLS.grip);
  paintChainsawChain(canvas, ARSENAL_CELLS.muzzle);
  cachedChainsawAtlas = { width: canvas.width, height: canvas.height, data: canvas.data };
  return cachedChainsawAtlas;
}

/**
 * Returns the articulated 3D chainsaw geometries and joint pivots:
 * - `body`: 2-stroke hazard-yellow motor block, ribbed cast-iron cylinder head, recoil starter + T-handle,
 *   tubular wrap-around front handlebar, chain-brake guard, bolted clutch cover with stud nuts & bucking spikes,
 *   two-cheek hardened steel vertical guide bar with central groove, and continuous chain tie-strap loop.
 * - `topChain`: 3D raked chisel cutter teeth riding along the top spine of the vertical guide bar.
 * - `bottomChain`: 3D return cutter teeth riding along the bottom return rail all the way into the clutch cover.
 * - `noseChain`: 3D 8-tooth rotary nose sprocket wheel centered in the front guide bar groove.
 * - `hands`: First-person player's 3D leather-gloved hands, olive-drab wrist cuffs, and muscular forearms
 *   gripping both the top horizontal handlebar and the left vertical handlebar.
 */
export function chainsawParts() {
  if (cachedChainsawParts)
    return cachedChainsawParts;

  const GRIP = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.02, 0.35);
  const GLOVE = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.39, 0.60);
  const CUFF = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.64, 0.76);
  const ARM = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.80, 0.98);

  const barX = -1.6;
  const bodyParts = [
    // 1. Main hazard-yellow 2-stroke engine block & beveled upper cowling
    {
      mesh: remapCell(boxMesh(new Vec3(6.6, 5.0, 8.6)), ARSENAL_CELLS.body),
      offset: new Vec3(0.4, -2.2, -3.8),
    },
    {
      mesh: remapCell(prismMesh(new Vec3(6.4, 1.5, 8.2), new Vec3(5.0, 1.5, 6.8), new Vec2(0, 0.2)), ARSENAL_CELLS.body),
      offset: new Vec3(0.4, 0.9, -3.6),
    },
    // Left-flank recoil starter cover & pull-cord T-handle
    {
      mesh: remapCell(prismMesh(new Vec3(1.2, 4.2, 6.4), new Vec3(0.8, 3.4, 5.4), new Vec2(-0.15, 0)), ARSENAL_CELLS.body),
      offset: new Vec3(4.1, -2.1, -3.6),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(0.6, 1.1, 0.6))),
      offset: new Vec3(4.2, 0.4, -5.8),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(1.7, 0.65, 1.6))),
      offset: new Vec3(4.4, 1.1, -5.8),
    },
    // Cast-iron cylinder head & 4 stacked horizontal cooling fins
    {
      mesh: GRIP(boxMesh(new Vec3(3.2, 2.1, 3.6))),
      offset: new Vec3(0.8, 2.2, -2.8),
    },
    // Rear pistol grip, trigger housing & bottom hand-guard baseplate
    {
      mesh: GRIP(prismMesh(new Vec3(2.1, 3.2, 2.8), new Vec3(2.0, 3.2, 2.4), new Vec2(0, 0.9))),
      offset: new Vec3(0.4, -1.9, -9.4),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(2.5, 0.9, 4.2))),
      offset: new Vec3(0.4, -3.9, -9.2),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(2.3, 1.1, 2.6)), ARSENAL_CELLS.body),
      offset: new Vec3(0.4, -0.1, -8.5),
    },
    // 2. Tubular wrap-around front handlebar (top crossbar at y = 4.2, right vertical post at x = 4.6, and left vertical grip handle at x = -2.25)
    {
      mesh: GRIP(boxMesh(new Vec3(7.7, 0.85, 0.85))),
      offset: new Vec3(1.18, 4.2, -1.5),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(0.85, 6.2, 0.85))),
      offset: new Vec3(4.6, 1.0, -1.5),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(1.3, 1.0, 1.3))),
      offset: new Vec3(4.1, -2.1, -1.5),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(0.85, 4.6, 0.85))),
      offset: new Vec3(-2.25, 2.25, -1.5),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(1.6, 0.85, 0.85))),
      offset: new Vec3(-1.88, 0.35, -1.5),
    },
    {
      mesh: GRIP(prismMesh(new Vec3(4.6, 2.7, 0.55), new Vec3(3.8, 2.7, 0.45), new Vec2(-0.2, 0.25))),
      offset: new Vec3(1.1, 2.3, 0.4),
    },
    // 3. Right-side bolted clutch cover, silver bar-mount stud nuts & front steel bucking spikes
    {
      mesh: GRIP(boxMesh(new Vec3(1.5, 4.1, 6.2))),
      offset: new Vec3(-2.7, -1.7, -1.6),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(0.55, 0.85, 0.85)), ARSENAL_CELLS.muzzle),
      offset: new Vec3(-3.6, -1.5, -0.6),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(0.55, 0.85, 0.85)), ARSENAL_CELLS.muzzle),
      offset: new Vec3(-3.6, -1.5, -2.5),
    },
    // 4. Upright vertical steel guide bar: left & right hardened steel cheek plates + recessed central groove core
    {
      mesh: remapCell(boxMesh(new Vec3(0.36, 4.4, 15.2)), ARSENAL_CELLS.barrel),
      offset: new Vec3(barX + 0.36, -1.1, 6.8),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(0.36, 4.4, 15.2)), ARSENAL_CELLS.barrel),
      offset: new Vec3(barX - 0.36, -1.1, 6.8),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(0.36, 3.6, 15.0))),
      offset: new Vec3(barX, -1.1, 6.7),
    },
    // Rounded semicircular nose tip of the vertical guide bar (left & right cheeks)
    {
      mesh: remapCell(boxMesh(new Vec3(0.36, 3.5, 1.2)), ARSENAL_CELLS.barrel),
      offset: new Vec3(barX + 0.36, -1.1, 14.9),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(0.36, 3.5, 1.2)), ARSENAL_CELLS.barrel),
      offset: new Vec3(barX - 0.36, -1.1, 14.9),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(0.36, 2.2, 0.9)), ARSENAL_CELLS.barrel),
      offset: new Vec3(barX + 0.36, -1.1, 15.8),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(0.36, 2.2, 0.9)), ARSENAL_CELLS.barrel),
      offset: new Vec3(barX - 0.36, -1.1, 15.8),
    },
    // Nose sprocket bearing rivet across the guide bar cheeks
    {
      mesh: remapCell(boxMesh(new Vec3(1.18, 0.75, 0.75)), ARSENAL_CELLS.muzzle),
      offset: new Vec3(barX, -1.1, 14.4),
    },
    // 5. Continuous unbroken steel chain tie-strap rails (top spine, bottom return rail into clutch, and nose wrap)
    {
      mesh: remapCell(boxMesh(new Vec3(0.62, 0.42, 15.6)), ARSENAL_CELLS.muzzle),
      offset: new Vec3(barX, 1.22, 6.9),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(0.62, 0.42, 15.8)), ARSENAL_CELLS.muzzle),
      offset: new Vec3(barX, -3.42, 6.8),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(0.58, 3.8, 0.45)), ARSENAL_CELLS.muzzle),
      offset: new Vec3(barX, -1.1, 16.25),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(0.6, 0.45, 1.5)), ARSENAL_CELLS.muzzle),
      offset: new Vec3(barX, 0.85, 15.45),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(0.6, 0.45, 1.5)), ARSENAL_CELLS.muzzle),
      offset: new Vec3(barX, -3.05, 15.45),
    },
  ];

  // Stacked horizontal cooling fins on cylinder head
  for (const fy of [1.4, 1.95, 2.5, 3.05])
    bodyParts.push({
      mesh: GRIP(boxMesh(new Vec3(4.1, 0.24, 4.3))),
      offset: new Vec3(0.8, fy, -2.8),
    });

  // Front steel bucking spikes (bumper dawgs)
  for (const sy of [0.3, -1.1, -2.5])
    bodyParts.push({
      mesh: remapCell(prismMesh(new Vec3(0.38, 0.55, 1.4), new Vec3(0.2, 0.18, 1.4), new Vec2(0, 0.35)), ARSENAL_CELLS.muzzle),
      offset: new Vec3(barX + 0.55, sy, 0.2),
    });

  // Top & bottom animated cutting chain tooth rows (9 teeth spaced by CHAINSAW_TOOTH_PITCH = 1.6)
  const topTeeth = [];
  const bottomTeeth = [];
  for (let i = 0; i < 9; i++) {
    const z = 0.6 + i * CHAINSAW_TOOTH_PITCH;
    const kerf = (i & 1) === 0 ? 0.14 : -0.14;
    // Top tooth: raked forward (+Z) along top cutting spine
    topTeeth.push(
      {
        mesh: remapCell(prismMesh(new Vec3(0.54, 0.72, 0.86), new Vec3(0.28, 0.72, 0.52), new Vec2(kerf * 0.5, 0.28)), ARSENAL_CELLS.muzzle),
        offset: new Vec3(kerf, 0.42, z),
      },
      {
        mesh: remapCell(boxMesh(new Vec3(0.36, 0.42, 0.34)), ARSENAL_CELLS.muzzle),
        offset: new Vec3(0, 0.24, z + 0.52),
      }
    );
    // Bottom return tooth: raked backward (-Z) along lower return rail all the way to clutch housing
    bottomTeeth.push(
      {
        mesh: remapCell(prismMesh(new Vec3(0.28, 0.72, 0.52), new Vec3(0.54, 0.72, 0.86), new Vec2(-kerf * 0.5, 0.28)), ARSENAL_CELLS.muzzle),
        offset: new Vec3(kerf, -0.42, z),
      },
      {
        mesh: remapCell(boxMesh(new Vec3(0.36, 0.42, 0.34)), ARSENAL_CELLS.muzzle),
        offset: new Vec3(0, -0.24, z - 0.52),
      }
    );
  }

  // Front nose sprocket wheel: 8 radial cutter teeth orbiting in the central groove between the guide bar cheeks
  const noseTeeth = [];
  const toothTemplate = remapCell(
    prismMesh(new Vec3(0.34, 0.78, 0.74), new Vec3(0.24, 0.78, 0.46), new Vec2(0, 0.22)),
    ARSENAL_CELLS.muzzle
  );
  const noseRadius = 2.42;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Trigo.twopi;
    const rotated = rotateMeshX(toothTemplate, -angle);
    noseTeeth.push({
      mesh: rotated,
      offset: new Vec3(0, Math.cos(angle) * noseRadius, Math.sin(angle) * noseRadius),
    });
  }

  // First-person player hands, olive-drab wrist cuffs & muscular forearms gripping the left and top handlebars
  const handParts = [
    // A. Left leather-gloved hand gripping the left vertical handlebar (-2.25, 2.25, -1.5)
    {
      mesh: GLOVE(prismMesh(new Vec3(1.12, 1.72, 1.46), new Vec3(0.95, 1.62, 1.28), new Vec2(-0.1, 0.05))),
      offset: new Vec3(-2.96, 2.15, -1.55),
    },
    // Left thumb wrapping over the upper-rear of the left vertical bar (leaving the bar corner visible above)
    {
      mesh: GLOVE(boxMesh(new Vec3(1.12, 0.52, 0.78))),
      offset: new Vec3(-2.28, 2.86, -2.02),
    },
    {
      mesh: GLOVE(boxMesh(new Vec3(0.64, 0.48, 0.8))),
      offset: new Vec3(-1.72, 2.72, -1.55),
    },
    // Left glove wrist gauntlet, military olive-drab woven cuff & muscular bare left forearm sweeping in from screen left
    {
      mesh: GLOVE(prismMesh(new Vec3(1.44, 1.46, 1.38), new Vec3(1.3, 1.36, 1.24), new Vec2(-0.14, -0.05))),
      offset: new Vec3(-3.55, 1.88, -2.42),
    },
    {
      mesh: CUFF(prismMesh(new Vec3(1.64, 1.62, 1.42), new Vec3(1.48, 1.5, 1.3), new Vec2(-0.16, -0.06))),
      offset: new Vec3(-4.18, 1.56, -3.32),
    },
    {
      mesh: ARM(prismMesh(new Vec3(1.84, 1.82, 2.35), new Vec3(1.68, 1.68, 2.15), new Vec2(-0.22, -0.08))),
      offset: new Vec3(-5.05, 1.08, -4.65),
    },
    {
      mesh: ARM(prismMesh(new Vec3(2.04, 2.0, 2.55), new Vec3(1.84, 1.84, 2.35), new Vec2(-0.24, -0.1))),
      offset: new Vec3(-6.05, 0.48, -6.25),
    },
    {
      mesh: ARM(prismMesh(new Vec3(2.2, 2.14, 2.65), new Vec3(2.04, 2.0, 2.45), new Vec2(-0.26, -0.12))),
      offset: new Vec3(-7.08, -0.12, -7.95),
    },

    // B. Right leather-gloved hand gripping the top horizontal handlebar (x = 1.85..3.35, y = 4.2, z = -1.5)
    {
      mesh: GLOVE(prismMesh(new Vec3(1.76, 0.88, 1.48), new Vec3(1.62, 0.78, 1.3), new Vec2(0.08, 0.08))),
      offset: new Vec3(2.6, 4.72, -1.62),
    },
    // Right thumb wrapping under the rear-left of the top horizontal bar
    {
      mesh: GLOVE(boxMesh(new Vec3(0.74, 0.8, 0.84))),
      offset: new Vec3(1.62, 4.18, -2.02),
    },
    {
      mesh: GLOVE(boxMesh(new Vec3(0.82, 0.54, 0.78))),
      offset: new Vec3(1.86, 3.64, -1.55),
    },
    // Right glove wrist gauntlet, military olive-drab woven cuff & muscular bare right forearm sweeping in from screen right
    {
      mesh: GLOVE(prismMesh(new Vec3(1.68, 1.28, 1.34), new Vec3(1.56, 1.18, 1.22), new Vec2(0.14, -0.06))),
      offset: new Vec3(3.12, 4.24, -2.58),
    },
    {
      mesh: CUFF(prismMesh(new Vec3(1.84, 1.46, 1.38), new Vec3(1.7, 1.34, 1.26), new Vec2(0.16, -0.08))),
      offset: new Vec3(3.68, 3.7, -3.52),
    },
    {
      mesh: ARM(prismMesh(new Vec3(2.02, 1.72, 2.35), new Vec3(1.86, 1.58, 2.15), new Vec2(0.22, -0.12))),
      offset: new Vec3(4.38, 2.86, -4.88),
    },
    {
      mesh: ARM(prismMesh(new Vec3(2.18, 1.92, 2.55), new Vec3(2.02, 1.76, 2.35), new Vec2(0.24, -0.14))),
      offset: new Vec3(5.18, 1.8, -6.5),
    },
    {
      mesh: ARM(prismMesh(new Vec3(2.32, 2.08, 2.65), new Vec3(2.16, 1.9, 2.45), new Vec2(0.26, -0.16))),
      offset: new Vec3(5.98, 0.66, -8.2),
    },
  ];

  // 4 curled leather fingers for the left hand around the left vertical handlebar (-2.25, 2.25, -1.5)
  for (const fy of [1.56, 1.96, 2.36, 2.76])
    handParts.push(
      {
        mesh: GLOVE(boxMesh(new Vec3(1.22, 0.36, 0.7))),
        offset: new Vec3(-2.36, fy, -0.82),
      },
      {
        mesh: GLOVE(boxMesh(new Vec3(0.56, 0.35, 0.76))),
        offset: new Vec3(-1.72, fy, -1.35),
      }
    );

  // 4 curled leather fingers for the right hand around the top horizontal handlebar (x = 1.95..3.24, y = 4.2, z = -1.5)
  for (const fx of [1.96, 2.38, 2.80, 3.22])
    handParts.push(
      {
        mesh: GLOVE(boxMesh(new Vec3(0.38, 1.18, 0.7))),
        offset: new Vec3(fx, 4.22, -0.82),
      },
      {
        mesh: GLOVE(boxMesh(new Vec3(0.37, 0.54, 0.8))),
        offset: new Vec3(fx, 3.6, -1.35),
      }
    );

  const pivots = {
    topChain: new Vec3(barX, 1.38, 0),
    bottomChain: new Vec3(barX, -3.58, 0),
    noseChain: new Vec3(barX, -1.1, 14.4),
    hands: new Vec3(0, 0, 0),
  };

  cachedChainsawParts = {
    body: appendMesh(bodyParts),
    topChain: appendMesh(topTeeth),
    bottomChain: appendMesh(bottomTeeth),
    noseChain: appendMesh(noseTeeth),
    hands: appendMesh(handParts),
    pivots,
    toothPitch: CHAINSAW_TOOTH_PITCH,
  };
  return cachedChainsawParts;
}

/** Returns the complete combined 3D chainsaw geometry `{ vertices, normals, uvs }`. */
export function chainsawMesh() {
  if (cachedChainsawMesh)
    return cachedChainsawMesh;
  const parts = chainsawParts();
  const liftY = 7.2;
  cachedChainsawMesh = appendMesh([
    { mesh: parts.body, offset: new Vec3(0, liftY, 0) },
    { mesh: parts.topChain, offset: new Vec3(parts.pivots.topChain.x, parts.pivots.topChain.y + liftY, parts.pivots.topChain.z) },
    { mesh: parts.bottomChain, offset: new Vec3(parts.pivots.bottomChain.x, parts.pivots.bottomChain.y + liftY, parts.pivots.bottomChain.z) },
    { mesh: parts.noseChain, offset: new Vec3(parts.pivots.noseChain.x, parts.pivots.noseChain.y + liftY, parts.pivots.noseChain.z) },
  ]);
  return cachedChainsawMesh;
}

/**
 * Computes the allocation-free 3D first-person chainsaw viewmodel pose and animated chain loop transforms:
 * - `offset` (`Vec3`): camera-relative `(right, up, forward)` offset
 * - `rotation` (`Vec3`): local `(pitch, yaw, roll)` Euler angles relative to camera aim
 * - `topChainPos` (`Vec3`), `bottomChainPos` (`Vec3`), `noseChainRot` (`Vec3`): animated 3D chain loop transforms
 */
export function chainsawPose(
  { time = 0, bob = 0, moving = 0, recoil = 0, switchOffset = 0, attacking = false } = {},
  target = null
) {
  const out = target ?? {
    offset: new Vec3(),
    rotation: new Vec3(),
    topChainPos: new Vec3(),
    bottomChainPos: new Vec3(),
    noseChainRot: new Vec3(),
  };
  const { pivots } = chainsawParts();
  const clampedSwitch = Utils.clamp(switchOffset, 0, 1);
  const thrust = attacking ? 1 : Math.min(1, recoil * 0.85);

  // Walk sway & bob + 2-stroke engine vibration (steady chug at idle, ferocious high-RPM bite when sawing)
  const walkSway = Math.sin(bob) * 0.65 * moving;
  const walkBob = Math.abs(Math.cos(bob)) * 0.42 * moving;
  const chugX = attacking ? Math.sin(time * 74) * 0.16 : Math.sin(time * 28) * 0.035;
  const chugY = attacking ? Math.cos(time * 88) * 0.14 : Math.abs(Math.sin(time * 28)) * 0.055;
  const chugZ = attacking ? Math.sin(time * 62) * 0.22 : 0;

  const right = 1.65 - thrust * 0.45 + walkSway * 0.8 + chugX;
  const up = -5.85 + thrust * 0.45 - walkBob + chugY - clampedSwitch * 5.2;
  const forward = 12.6 + thrust * 1.45 + chugZ - clampedSwitch * 1.4;
  out.offset.setScalar(right, up, forward);

  const pitch = -0.11 - thrust * 0.055 + chugY * 0.18 + clampedSwitch * 0.48;
  const yaw = 0.14 + thrust * 0.045 - walkSway * 0.06 + chugX * 0.15;
  const roll = -walkSway * 0.08 + (attacking ? Math.sin(time * 82) * 0.045 : Math.sin(time * 28) * 0.012);
  out.rotation.setScalar(pitch, yaw, roll);

  // Continuous modular chain conveyor travel along top spine (+Z), nose sprocket wheel, and bottom return rail (-Z)
  const rate = attacking ? 26 : 7.5;
  const phase = (((time * rate) % CHAINSAW_TOOTH_PITCH) + CHAINSAW_TOOTH_PITCH) % CHAINSAW_TOOTH_PITCH;
  const shift = phase - CHAINSAW_TOOTH_PITCH * 0.5;
  out.topChainPos.setScalar(pivots.topChain.x, pivots.topChain.y, pivots.topChain.z + shift);
  out.bottomChainPos.setScalar(pivots.bottomChain.x, pivots.bottomChain.y, pivots.bottomChain.z - shift);
  out.noseChainRot.setScalar(time * (rate / 2.42), 0, 0);
  return out;
}

// ---- 3D Pump-Action Shotgun (procedural texture atlas, articulated pump & shell ejection) -------------------------

function paintShotgunBody(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const border = x < 2 || y < 2 || x >= S - 2 || y >= S - 2;
      const fuller = y >= 11 && y <= 15 && x >= 5 && x <= S - 6;
      const pin = (x === 6 || x === S - 7) && (y === 7 || y === S - 8);
      const grain = Math.sin(x * 0.45 + y * 0.2) * 6;
      const base = border ? 34 : pin ? 148 : fuller ? 48 : 74 + grain;
      canvas.put(cell, x, y, base, base + 6, base + 14);
    }
}

function paintShotgunBarrel(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi) * 48;
      const slot = ((x >= 5 && x <= 9) || (x >= S - 10 && x <= S - 6)) && y >= 5 && y <= S - 6 && y % 4 < 2;
      const band = y < 3 || y >= S - 3;
      if (slot)
        canvas.put(cell, x, y, 16, 20, 26);
      else {
        const v = Utils.clamp(78 + cyl + (band ? 24 : 0), 28, 212);
        canvas.put(cell, x, y, v, v + 8, v + 18);
      }
    }
}

function paintShotgunGrip(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi);
      if (y < 18) {
        // Warm ribbed dark walnut wood (stock wrist & pump forend)
        const groove = y % 4 === 0;
        const ridge = y % 4 === 1;
        const grain = Math.sin(y * 0.5 + Math.sin(x * 0.35) * 2.0) * 14;
        const shade = (groove ? -32 : ridge ? 16 : 0) + cyl * 26;
        const r = Utils.clamp(112 + grain + shade, 36, 192);
        const g = Utils.clamp(64 + (grain + shade) * 0.58, 20, 118);
        const b = Utils.clamp(30 + (grain + shade) * 0.32, 10, 62);
        canvas.put(cell, x, y, r, g, b);
      } else {
        // Dark espresso-brown grained combat leather glove (palm, curled fingers & thumb)
        const crease = y === 22 || y === 27 || x % 7 === 0 ? -16 : 0;
        const pebble = ((x + y) & 1) === 0 ? 5 : -4;
        const spec = Math.pow(cyl, 2.2) * 34;
        const r = Utils.clamp(58 + cyl * 34 + spec + crease + pebble, 24, 134);
        const g = Utils.clamp(38 + cyl * 24 + spec * 0.72 + crease * 0.7 + pebble, 15, 94);
        const b = Utils.clamp(24 + cyl * 16 + spec * 0.45 + crease * 0.5 + pebble, 10, 64);
        canvas.put(cell, x, y, r, g, b);
      }
    }
}

function paintShotgunMuzzle(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi);
      if (y < 7) {
        // Golden brass rim, chamber lifter & front bead sight
        const rim = y < 2 ? 18 : 0;
        const r = Utils.clamp(142 + cyl * 76 + rim, 78, 236);
        const g = Utils.clamp(108 + cyl * 62 + rim, 58, 194);
        const b = Utils.clamp(34 + cyl * 28, 18, 92);
        canvas.put(cell, x, y, r, g, b);
      } else if (y < 15) {
        // Ribbed crimson 12-gauge shotgun hull
        const rib = (x & 3) === 0 ? -12 : 0;
        const r = Utils.clamp(124 + cyl * 78 + rib, 68, 224);
        const g = Utils.clamp(20 + cyl * 18, 10, 52);
        const b = Utils.clamp(22 + cyl * 18, 10, 54);
        canvas.put(cell, x, y, r, g, b);
      } else if (y < 22) {
        // Military olive-drab woven wrist cuff
        const weave = ((x + y) & 1) === 0 ? 6 : -6;
        const seam = y === 15 || y === 21 ? -14 : 0;
        const r = Utils.clamp(64 + cyl * 36 + weave + seam, 28, 118);
        const g = Utils.clamp(78 + cyl * 42 + weave + seam, 36, 138);
        const b = Utils.clamp(46 + cyl * 24 + weave + seam, 18, 84);
        canvas.put(cell, x, y, r, g, b);
      } else {
        // Warm muscular bare forearm skin with anatomical tendon & muscle-belly shading
        const tendon = Math.sin((x / S) * Trigo.pi * 2.0) * 12;
        const pore = ((x * 3 + y * 5) & 3) === 0 ? -4 : 2;
        const r = Utils.clamp(166 + cyl * 56 + tendon + pore, 108, 238);
        const g = Utils.clamp(118 + cyl * 46 + tendon * 0.75 + pore, 72, 186);
        const b = Utils.clamp(88 + cyl * 36 + tendon * 0.55 + pore, 50, 146);
        canvas.put(cell, x, y, r, g, b);
      }
    }
}

let cachedShotgunAtlas = null;
let cachedShotgunParts = null;
let cachedShotgunMesh = null;

export function shotgunAtlas() {
  if (cachedShotgunAtlas)
    return cachedShotgunAtlas;
  const canvas = createCanvas(ARSENAL_CELL, ARSENAL_FRAMES);
  paintShotgunBody(canvas, ARSENAL_CELLS.body);
  paintShotgunBarrel(canvas, ARSENAL_CELLS.barrel);
  paintShotgunGrip(canvas, ARSENAL_CELLS.grip);
  paintShotgunMuzzle(canvas, ARSENAL_CELLS.muzzle);
  cachedShotgunAtlas = { width: canvas.width, height: canvas.height, data: canvas.data };
  return cachedShotgunAtlas;
}

/**
 * Builds the articulated 3D pump-action shotgun sub-meshes:
 * - `body`: walnut stock wrist, machined gunmetal receiver with ejection port, blued-steel barrel, perforated heat shield,
 *   under-barrel magazine tube, ventilated top sighting rib, and front brass bead sight
 * - `pump`: ribbed dark walnut pump forend, twin gleaming chrome action bars, and sliding steel breech bolt
 * - `arm`: marine's leather-gloved left hand, olive-drab wrist cuff, and muscular bare forearm gripping the pump forend during reload
 * - `shell`: 3D crimson-and-brass 12-gauge shotgun hull that ejects out of the right-side port during the pump stroke
 */
export function shotgunParts() {
  if (cachedShotgunParts)
    return cachedShotgunParts;

  const WALNUT = (raw) => remapCellSub(raw, ARSENAL_CELLS.grip, 0.02, 0.54);
  const GLOVE = (raw) => remapCellSub(raw, ARSENAL_CELLS.grip, 0.58, 0.98);
  const BRASS = (raw) => remapCellSub(raw, ARSENAL_CELLS.muzzle, 0.02, 0.19);
  const HULL = (raw) => remapCellSub(raw, ARSENAL_CELLS.muzzle, 0.24, 0.44);
  const CUFF = (raw) => remapCellSub(raw, ARSENAL_CELLS.muzzle, 0.49, 0.66);
  const ARM = (raw) => remapCellSub(raw, ARSENAL_CELLS.muzzle, 0.71, 0.98);

  const bodyParts = [
    // 1. Rear dark walnut stock wrist & angled pistol grip
    {
      mesh: WALNUT(prismMesh(new Vec3(2.4, 2.8, 5.2), new Vec3(2.1, 2.8, 4.6), new Vec2(0, 0.8))),
      offset: new Vec3(0, -1.55, -6.8),
    },
    // 2. Heavy machined gunmetal receiver housing & beveled upper deck
    {
      mesh: remapCell(boxMesh(new Vec3(3.2, 3.5, 7.2)), ARSENAL_CELLS.body),
      offset: new Vec3(0, -0.35, -1.6),
    },
    {
      mesh: remapCell(prismMesh(new Vec3(3.0, 0.95, 6.8), new Vec3(2.0, 0.95, 6.2), new Vec2(0, -0.15)), ARSENAL_CELLS.body),
      offset: new Vec3(0, 1.85, -1.6),
    },
    // Right-side recessed ejection port & brass shell lifter inside chamber (local +X is screen right)
    {
      mesh: BRASS(boxMesh(new Vec3(0.28, 1.05, 2.5))),
      offset: new Vec3(1.52, 0.58, -0.85),
    },
    // Trigger guard loop under the receiver
    {
      mesh: remapCell(boxMesh(new Vec3(0.9, 1.1, 2.2)), ARSENAL_CELLS.body),
      offset: new Vec3(0, -2.4, -3.2),
    },
    // 3. Long blued-steel main barrel + perforated cooling shroud
    {
      mesh: remapCell(cylinderMesh(new Vec2(0.88, 17.6), 10), ARSENAL_CELLS.barrel),
      offset: new Vec3(0, 1.15, 10.2),
    },
    {
      mesh: remapCell(cylinderMesh(new Vec2(1.04, 10.2), 10), ARSENAL_CELLS.barrel),
      offset: new Vec3(0, 1.15, 6.7),
    },
    // 4. Under-barrel tubular magazine, front barrel-to-magazine clamp bracket & knurled magazine cap
    {
      mesh: remapCell(cylinderMesh(new Vec2(0.74, 15.0), 10), ARSENAL_CELLS.body),
      offset: new Vec3(0, -0.45, 9.1),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(1.82, 2.75, 0.95)), ARSENAL_CELLS.body),
      offset: new Vec3(0, 0.35, 15.6),
    },
    {
      mesh: remapCell(cylinderMesh(new Vec2(0.84, 1.1), 10), ARSENAL_CELLS.barrel),
      offset: new Vec3(0, -0.45, 17.0),
    },
    // 5. Elevated ventilated top sighting rib, muzzle crown collar & front brass bead sight
    {
      mesh: remapCell(boxMesh(new Vec3(0.68, 0.34, 17.0)), ARSENAL_CELLS.barrel),
      offset: new Vec3(0, 2.26, 10.2),
    },
    {
      mesh: remapCell(cylinderMesh(new Vec2(0.98, 0.85), 10), ARSENAL_CELLS.body),
      offset: new Vec3(0, 1.15, 18.7),
    },
    {
      mesh: BRASS(boxMesh(new Vec3(0.36, 0.48, 0.44))),
      offset: new Vec3(0, 2.58, 18.5),
    },
  ];

  // Ventilated sighting rib support stanchions along the barrel spine
  for (const rz of [2.6, 5.6, 8.6, 11.6, 14.6, 17.6])
    bodyParts.push({
      mesh: remapCell(boxMesh(new Vec3(0.52, 0.36, 0.75)), ARSENAL_CELLS.body),
      offset: new Vec3(0, 1.98, rz),
    });

  // Articulated pump assembly: ribbed dark walnut forend, twin chrome action bars, and sliding steel breech bolt
  const pumpParts = [
    {
      mesh: WALNUT(prismMesh(new Vec3(2.45, 2.15, 6.8), new Vec3(2.05, 2.15, 6.5), new Vec2(0, 0))),
      offset: new Vec3(0, 0, 0),
    },
    // Left & right gleaming chrome action bars connecting the pump forend into the receiver
    {
      mesh: remapCell(boxMesh(new Vec3(0.28, 0.34, 6.4)), ARSENAL_CELLS.barrel),
      offset: new Vec3(-0.92, 0.42, -5.8),
    },
    {
      mesh: remapCell(boxMesh(new Vec3(0.28, 0.34, 6.4)), ARSENAL_CELLS.barrel),
      offset: new Vec3(0.92, 0.42, -5.8),
    },
    // Sliding steel breech bolt carrier that retracts with the pump to uncover the right-side ejection port
    {
      mesh: remapCell(boxMesh(new Vec3(0.42, 0.96, 2.45)), ARSENAL_CELLS.barrel),
      offset: new Vec3(1.44, 1.1, -11.05),
    },
  ];
  for (const gz of [-2.4, -1.2, 0, 1.2, 2.4])
    pumpParts.push({
      mesh: WALNUT(boxMesh(new Vec3(2.66, 2.26, 0.56))),
      offset: new Vec3(0, 0, gz),
    });

  // Articulated 3D player left hand, olive wrist cuff & muscular bare forearm (local -X is screen left)
  const armParts = [
    // Leather-gloved palm pad cradling the underside of the walnut pump forend
    {
      mesh: GLOVE(prismMesh(new Vec3(2.95, 1.05, 4.4), new Vec3(2.65, 1.05, 4.1), new Vec2(-0.15, 0))),
      offset: new Vec3(-0.35, -1.35, -0.15),
    },
    // Gloved left-hand thumb & radial knuckle wrapping firmly up the left flank (-X) of the walnut forend
    {
      mesh: GLOVE(prismMesh(new Vec3(1.12, 1.85, 3.8), new Vec3(0.92, 1.85, 3.3), new Vec2(0.18, 0.15))),
      offset: new Vec3(-1.52, -0.22, -0.25),
    },
    {
      mesh: GLOVE(boxMesh(new Vec3(0.88, 0.92, 2.3))),
      offset: new Vec3(-1.46, 0.56, 0.65),
    },
    // Military olive-drab woven wrist cuff band at the base of the leather glove
    {
      mesh: CUFF(prismMesh(new Vec3(2.55, 2.15, 2.1), new Vec3(2.35, 1.95, 1.9), new Vec2(0.32, 0.16))),
      offset: new Vec3(-1.75, -1.75, -2.55),
    },
    // Muscular bare left forearm sweeping from lower-left screen up into the wrist cuff
    {
      mesh: ARM(prismMesh(new Vec3(2.65, 2.25, 3.8), new Vec3(2.35, 2.05, 3.4), new Vec2(0.75, 0.38))),
      offset: new Vec3(-2.55, -2.25, -4.75),
    },
    {
      mesh: ARM(prismMesh(new Vec3(2.95, 2.45, 4.2), new Vec3(2.65, 2.25, 3.8), new Vec2(0.85, 0.42))),
      offset: new Vec3(-3.65, -2.85, -7.85),
    },
    {
      mesh: ARM(prismMesh(new Vec3(3.15, 2.6, 4.4), new Vec3(2.95, 2.45, 4.2), new Vec2(0.9, 0.45))),
      offset: new Vec3(-4.85, -3.45, -11.05),
    },
  ];
  // 4 curled leather-gloved fingers wrapping under and up the right side (+X) of the walnut forend
  for (const fz of [-1.65, -0.6, 0.45, 1.5])
    armParts.push({
      mesh: GLOVE(boxMesh(new Vec3(0.92, 1.75, 0.78))),
      offset: new Vec3(1.32, -0.42, fz),
    });

  // Articulated 3D 12-gauge shotgun shell (crimson hull + brass rim) that ejects during the pump stroke
  const shellParts = [
    {
      mesh: HULL(cylinderMesh(new Vec2(0.44, 1.5), 8)),
      offset: new Vec3(0, 0, 0.22),
    },
    {
      mesh: BRASS(cylinderMesh(new Vec2(0.48, 0.52), 8)),
      offset: new Vec3(0, 0, -0.68),
    },
  ];

  const pivots = {
    pump: new Vec3(0, -0.52, 10.2),
    arm: new Vec3(0, -0.52, 10.2),
    shell: new Vec3(0.6, 0.55, -0.85),
  };

  cachedShotgunParts = {
    body: appendMesh(bodyParts),
    pump: appendMesh(pumpParts),
    arm: appendMesh(armParts),
    shell: appendMesh(shellParts),
    pivots,
  };
  return cachedShotgunParts;
}

export function shotgunMesh() {
  if (cachedShotgunMesh)
    return cachedShotgunMesh;
  const parts = shotgunParts();
  const liftY = 7.8;
  cachedShotgunMesh = appendMesh([
    { mesh: parts.body, offset: new Vec3(0, liftY, 0) },
    { mesh: parts.pump, offset: new Vec3(parts.pivots.pump.x, parts.pivots.pump.y + liftY, parts.pivots.pump.z) },
    { mesh: parts.shell, offset: new Vec3(parts.pivots.shell.x, parts.pivots.shell.y + liftY, parts.pivots.shell.z) },
  ]);
  return cachedShotgunMesh;
}

/**
 * Computes the allocation-free 3D first-person shotgun viewmodel pose and pump-action reload animation:
 * - `offset` (`Vec3`): camera-relative `(right, up, forward)` offset
 * - `rotation` (`Vec3`): local `(pitch, yaw, roll)` Euler angles relative to camera aim
 * - `pumpPos` (`Vec3`): local position of the sliding walnut pump forend & breech bolt
 * - `armPos` (`Vec3`), `armRot` (`Vec3`): local position and rotation of the marine's gloved left hand & forearm
 * - `shellPos` (`Vec3`), `shellRot` (`Vec3`): local position and tumbling Euler rotation of the ejected 12-gauge shell
 */
export function shotgunPose(
  { time = 0, bob = 0, moving = 0, recoil = 0, switchOffset = 0, elapsed = -1, hasAmmo = true } = {},
  target = null
) {
  const out = target ?? {
    offset: new Vec3(),
    rotation: new Vec3(),
    pumpPos: new Vec3(),
    armPos: new Vec3(),
    armRot: new Vec3(),
    shellPos: new Vec3(),
    shellRot: new Vec3(),
  };
  const { pivots } = shotgunParts();
  const clampedSwitch = Utils.clamp(switchOffset, 0, 1);

  // Blast recoil impulse immediately after firing (elapsed 0..0.24)
  const blastKick =
    elapsed >= 0 && elapsed < 0.24
      ? Math.sin(Utils.clamp(1 - elapsed / 0.24, 0, 1) * Trigo.halfpi)
      : Math.min(1, recoil * 0.75);

  // Deliberate pump-action reload cycle (elapsed 0.16..0.96 when shells remain):
  // 1. `reach`: marine's left hand & muscular forearm sweep up from bottom-left onto the walnut forend (0.16..0.26),
  //    stay locked on the forend through the entire pump stroke (0.26..0.86), and release downward (0.86..0.96)
  // 2. `raise`: subtle brace while keeping the barrel horizontal toward enemies
  // 3. `rack`: gloved hand pulls the ribbed walnut forend backward (0.26..0.48), holds open briefly, and slams forward (0.64..0.86)
  let reach = 0;
  let raise = 0;
  let rack = 0;
  let rackJolt = 0;
  if (hasAmmo && elapsed >= 0.16 && elapsed < 0.96) {
    if (elapsed < 0.26)
      reach = smoothStep(0.16, 0.26, elapsed);
    else if (elapsed < 0.86)
      reach = 1;
    else
      reach = 1 - smoothStep(0.86, 0.96, elapsed);

    if (elapsed >= 0.2 && elapsed < 0.36)
      raise = smoothStep(0.2, 0.36, elapsed);
    else if (elapsed >= 0.36 && elapsed < 0.76)
      raise = 1;
    else if (elapsed >= 0.76)
      raise = 1 - smoothStep(0.76, 0.96, elapsed);

    if (elapsed >= 0.26 && elapsed < 0.48)
      rack = smoothStep(0.26, 0.48, elapsed);
    else if (elapsed >= 0.48 && elapsed < 0.64)
      rack = 1;
    else if (elapsed >= 0.64 && elapsed < 0.86)
      rack = 1 - smoothStep(0.64, 0.86, elapsed);

    // Tactile mechanical snap at full rear stroke (~0.48s) and forward chamber lockup (~0.84s)
    if (elapsed >= 0.44 && elapsed < 0.56)
      rackJolt = -Math.sin(((elapsed - 0.44) / 0.12) * Trigo.pi) * 0.45;
    else if (elapsed >= 0.78 && elapsed < 0.9)
      rackJolt = Math.sin(((elapsed - 0.78) / 0.12) * Trigo.pi) * 0.38;
  }

  const walkSway = Math.sin(bob) * 0.62 * moving;
  const walkBob = Math.abs(Math.cos(bob)) * 0.4 * moving;
  const idleBreathe = Math.sin(time * 2.2) * 0.04;

  const right = 0.52 - raise * 0.22 + walkSway * 0.78;
  const up = -6.85 + blastKick * 0.28 + raise * 0.72 - rack * 0.16 - walkBob + idleBreathe - clampedSwitch * 5.4;
  const forward = 12.4 - blastKick * 2.15 - raise * 0.55 + rackJolt - clampedSwitch * 1.4;
  out.offset.setScalar(right, up, forward);

  const pitch = 0.088 - blastKick * 0.09 - raise * 0.025 + rack * 0.025 - rackJolt * 0.04 + clampedSwitch * 0.46;
  const yaw = 0.035 + raise * 0.11 + rack * 0.035 - walkSway * 0.05;
  const roll = raise * 0.12 + rack * 0.045 - walkSway * 0.07;
  out.rotation.setScalar(pitch, yaw, roll);

  const pumpZ = pivots.pump.z - rack * 4.6;
  out.pumpPos.setScalar(pivots.pump.x, pivots.pump.y, pumpZ);

  const stow = 1 - reach;
  out.armPos.setScalar(
    pivots.arm.x - stow * 2.6,
    pivots.arm.y - stow * 9.5,
    pumpZ - stow * 3.8
  );
  out.armRot.setScalar(stow * 0.42, -stow * 0.24, -stow * 0.32 + rack * 0.04);

  // Spent 12-gauge shell ejection arc out of the right-side (+X) receiver port during the pump stroke
  if (hasAmmo && elapsed >= 0.42 && elapsed < 0.88) {
    const u = (elapsed - 0.42) / 0.46;
    out.shellPos.setScalar(
      pivots.shell.x + 1.15 + u * 7.8,
      pivots.shell.y + 0.85 + u * 4.4 - u * u * 8.4,
      pivots.shell.z - 0.35 - u * 2.6
    );
    out.shellRot.setScalar(u * 15.0, -u * 9.5, -u * 19.0);
  } else {
    out.shellPos.copy(pivots.shell);
    out.shellRot.setScalar(0, 0, 0);
  }
  return out;
}

function paintKnifeHandle(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi);
      if (y < 20) {
        // Dark ribbed Kraton polymer combat handle with diamond knurling & finger-groove channels
        const groove = y % 4 === 0 ? -14 : 0;
        const knurl = ((x + y) & 1) === 0 ? 6 : -4;
        const v = Utils.clamp(38 + cyl * 28 + groove + knurl, 18, 86);
        canvas.put(cell, x, y, v, v + 2, v + 5);
      } else {
        // Parkerized gunmetal steel crossguard & skull-crusher pommel cap
        const spec = Math.pow(cyl, 2.4) * 42;
        const v = Utils.clamp(68 + cyl * 36 + spec, 42, 156);
        canvas.put(cell, x, y, v * 0.94, v * 0.98, v * 1.06);
      }
    }
}

function paintKnifeBlade(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const bevel = y >= 21;
      const fuller = y >= 9 && y <= 14 && x >= 5 && x <= S - 7;
      const spineEdge = y < 4;
      const glint = Math.sin((x / S) * Trigo.pi) * 36;
      if (fuller) {
        // Darkened blood fuller groove along the flat of the blade
        canvas.put(cell, x, y, 48, 54, 66);
      } else if (bevel) {
        // Honed razor-sharp lower cutting edge bevel
        const v = Utils.clamp(204 + glint, 168, 250);
        canvas.put(cell, x, y, v * 0.96, v, v * 1.04);
      } else if (spineEdge) {
        // Serrated sawback spine highlight
        const tooth = (x & 3) < 2 ? 24 : -18;
        const v = Utils.clamp(162 + glint + tooth, 108, 232);
        canvas.put(cell, x, y, v * 0.95, v * 0.99, v * 1.05);
      } else {
        // Brushed cold-rolled high-carbon Bowie steel flat
        const brushed = ((x * 5 + y) & 3) * 4;
        const v = Utils.clamp(138 + glint + brushed, 96, 206);
        canvas.put(cell, x, y, v * 0.94, v * 0.98, v * 1.06);
      }
    }
}

let cachedKnifeAtlas = null;
let cachedKnifeParts = null;
let cachedKnifeMesh = null;

export function knifeAtlas() {
  if (cachedKnifeAtlas)
    return cachedKnifeAtlas;
  const canvas = createCanvas(ARSENAL_CELL, ARSENAL_FRAMES);
  paintKnifeHandle(canvas, ARSENAL_CELLS.body);
  paintKnifeBlade(canvas, ARSENAL_CELLS.barrel);
  paintShotgunGrip(canvas, ARSENAL_CELLS.grip);
  paintShotgunMuzzle(canvas, ARSENAL_CELLS.muzzle);
  cachedKnifeAtlas = { width: canvas.width, height: canvas.height, data: canvas.data };
  return cachedKnifeAtlas;
}

/**
 * Returns the articulated 3D marine combat knife geometries and joint pivots:
 * - `blade`: Heavy clip-point Bowie combat blade with honed lower bevel, dark blood fuller groove,
 *   sawback spine serrations, S-shaped steel crossguard, ribbed Kraton handle, and skull-crusher pommel.
 * - `arm`: First-person player's leather-gloved right hand with carbon-steel knuckle armor,
 *   military olive-drab wrist cuff, and muscular bare forearm gripping the knife handle.
 */
export function knifeParts() {
  if (cachedKnifeParts)
    return cachedKnifeParts;

  const HANDLE = (m) => remapCellSub(m, ARSENAL_CELLS.body, 0.05, 0.58);
  const GUARD = (m) => remapCellSub(m, ARSENAL_CELLS.body, 0.66, 0.95);
  const BLADE = (m) => remapCell(m, ARSENAL_CELLS.barrel);
  const GLOVE = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.58, 0.98);
  const CUFF = (m) => remapCellSub(m, ARSENAL_CELLS.muzzle, 0.49, 0.66);
  const ARM = (m) => remapCellSub(m, ARSENAL_CELLS.muzzle, 0.71, 0.98);

  const bladeParts = [
    // 1. Tapered steel skull-crusher pommel cap & lanyard lug at rear of grip
    {
      mesh: GUARD(prismMesh(new Vec3(1.38, 1.96, 0.92), new Vec3(0.92, 1.38, 0.68), new Vec2(0, -0.08))),
      offset: new Vec3(0, -0.1, -5.25),
    },
    // 2. Contoured ribbed Kraton tactical grip handle
    {
      mesh: HANDLE(prismMesh(new Vec3(1.26, 1.88, 5.1), new Vec3(1.18, 1.72, 4.9), new Vec2(0, 0))),
      offset: new Vec3(0, -0.05, -2.35),
    },
    // 3. Heavy S-shaped steel crossguard (upper thumb ramp + lower index-finger guard hook)
    {
      mesh: GUARD(boxMesh(new Vec3(1.58, 3.55, 0.68))),
      offset: new Vec3(0, 0.05, 0.42),
    },
    {
      mesh: GUARD(boxMesh(new Vec3(1.36, 0.68, 0.88))),
      offset: new Vec3(0, -1.55, 0.72),
    },
    // 4. Forged Bowie combat blade: thick flat spine, recessed blood fuller, razor lower belly, and clip-point tip
    {
      mesh: BLADE(boxMesh(new Vec3(0.36, 1.48, 6.8))),
      offset: new Vec3(0, 0.36, 4.15),
    },
    // Honed razor-sharp lower cutting edge belly
    {
      mesh: BLADE(prismMesh(new Vec3(0.34, 0.86, 6.8), new Vec3(0.08, 0.86, 6.4), new Vec2(0, 0.15))),
      offset: new Vec3(0, -0.62, 4.15),
    },
    // Clip-point piercing Bowie tip tapering to a needle point at z = 10.6
    {
      mesh: BLADE(prismMesh(new Vec3(0.34, 1.85, 3.2), new Vec3(0.06, 0.24, 3.2), new Vec2(0, -0.25))),
      offset: new Vec3(0, 0.02, 9.05),
    },
  ];

  // Grip ribs around the handle & sawback serration teeth along the top spine
  for (const gz of [-3.9, -2.9, -1.9, -0.9])
    bladeParts.push({
      mesh: HANDLE(boxMesh(new Vec3(1.36, 1.98, 0.42))),
      offset: new Vec3(0, -0.05, gz),
    });
  for (let i = 0; i < 6; i++)
    bladeParts.push({
      mesh: BLADE(prismMesh(new Vec3(0.32, 0.36, 0.56), new Vec3(0.16, 0.36, 0.28), new Vec2(0, -0.1))),
      offset: new Vec3(0, 1.24, 1.45 + i * 0.92),
    });

  // First-person marine right hand (leather combat glove + carbon-steel knuckles), olive cuff, and muscular right forearm
  const armParts = [
    // Right palm & armored dorsal metacarpal backplate gripping the right (+X) and top of the handle
    {
      mesh: GLOVE(prismMesh(new Vec3(1.18, 2.25, 4.35), new Vec3(1.02, 2.08, 4.05), new Vec2(0.08, -0.06))),
      offset: new Vec3(0.68, -0.02, -2.35),
    },
    // Gloved right thumb braced forward along the upper spine ramp behind the crossguard
    {
      mesh: GLOVE(prismMesh(new Vec3(0.95, 0.92, 2.25), new Vec3(0.78, 0.78, 1.95), new Vec2(-0.12, 0.14))),
      offset: new Vec3(0.42, 1.08, -0.95),
    },
    // Right wrist gauntlet, military olive-drab woven cuff & muscular bare right forearm extending to bottom-right screen
    {
      mesh: GLOVE(rotateMeshX(prismMesh(new Vec3(1.95, 1.92, 2.05), new Vec3(1.78, 1.82, 1.85), new Vec2(0.14, -0.08)), -0.32)),
      offset: new Vec3(0.96, -0.42, -4.25),
    },
    {
      mesh: CUFF(rotateMeshX(prismMesh(new Vec3(2.22, 2.12, 2.35), new Vec3(2.04, 1.98, 2.15), new Vec2(0.18, -0.1)), -0.32)),
      offset: new Vec3(1.52, -0.92, -5.75),
    },
    {
      mesh: ARM(rotateMeshX(prismMesh(new Vec3(2.48, 2.32, 3.6), new Vec3(2.24, 2.15, 3.3), new Vec2(0.24, -0.14)), -0.32)),
      offset: new Vec3(2.32, -1.68, -8.05),
    },
    {
      mesh: ARM(rotateMeshX(prismMesh(new Vec3(2.76, 2.54, 4.0), new Vec3(2.48, 2.32, 3.6), new Vec2(0.28, -0.16)), -0.32)),
      offset: new Vec3(3.28, -2.62, -10.95),
    },
    {
      mesh: ARM(rotateMeshX(prismMesh(new Vec3(2.98, 2.72, 4.3), new Vec3(2.76, 2.54, 4.0), new Vec2(0.32, -0.18)), -0.32)),
      offset: new Vec3(4.35, -3.65, -14.05),
    },
  ];

  // 4 curled leather-gloved fingers wrapping tightly around the left (-X) and underside of the knife handle
  for (const fz of [-3.85, -2.85, -1.85, -0.85])
    armParts.push(
      {
        mesh: GLOVE(boxMesh(new Vec3(0.95, 1.85, 0.78))),
        offset: new Vec3(-0.62, -0.12, fz),
      },
      {
        mesh: GLOVE(boxMesh(new Vec3(1.35, 0.78, 0.76))),
        offset: new Vec3(-0.08, -1.02, fz),
      }
    );

  const pivots = {
    blade: new Vec3(0, 0, 0),
    arm: new Vec3(0, 0, 0),
  };

  cachedKnifeParts = {
    body: appendMesh([...bladeParts, ...armParts]),
    blade: appendMesh(bladeParts),
    arm: appendMesh(armParts),
    pivots,
  };
  return cachedKnifeParts;
}

export function knifeMesh() {
  if (cachedKnifeMesh)
    return cachedKnifeMesh;
  const parts = knifeParts();
  const liftY = 6.5;
  cachedKnifeMesh = appendMesh([
    { mesh: parts.blade, offset: new Vec3(0, liftY, 0) },
    { mesh: parts.arm, offset: new Vec3(0, liftY, 0) },
  ]);
  return cachedKnifeMesh;
}

export const KNIFE_ATTACKS = ['vertical', 'horizontal', 'diagonal'];

/**
 * Computes the allocation-free 3D first-person combat knife viewmodel pose and slash/lunge attack animation:
 * - `offset` (`Vec3`): camera-relative `(right, up, forward)` offset
 * - `rotation` (`Vec3`): local `(pitch, yaw, roll)` Euler angles relative to camera aim
 * - `attack`: `'vertical' | 'horizontal' | 'diagonal'` slash trajectory
 */
export function knifePose(
  { time = 0, bob = 0, moving = 0, recoil = 0, switchOffset = 0, elapsed = -1, attack = 'vertical' } = {},
  target = null
) {
  const out = target ?? {
    offset: new Vec3(),
    rotation: new Vec3(),
  };
  const clampedSwitch = Utils.clamp(switchOffset, 0, 1);

  let windup = 0;
  let lunge = 0;
  let slash = 0;
  if (elapsed >= 0 && elapsed < 0.3) {
    if (elapsed < 0.03)
      windup = smoothStep(0, 0.03, elapsed);
    else if (elapsed < 0.09) {
      const u = smoothStep(0.03, 0.09, elapsed);
      windup = 1 - u;
      lunge = u;
      slash = u;
    } else {
      const u = smoothStep(0.09, 0.3, elapsed);
      lunge = 1 - u;
      slash = 1 - u;
    }
  } else if (recoil > 0) {
    lunge = Math.min(1, recoil * 0.85);
    slash = lunge * 0.7;
  }

  const walkSway = Math.sin(bob) * 0.58 * moving;
  const walkBob = Math.abs(Math.cos(bob)) * 0.38 * moving;
  const idleBreathe = Math.sin(time * 2.5) * 0.05;

  let rightDelta = 0;
  let upDelta = 0;
  let pitchDelta = 0;
  let yawDelta = 0;
  let rollDelta = 0;
  if (attack === 'horizontal') {
    rightDelta = windup * 1.35 - slash * 3.85;
    upDelta = windup * 0.1 + lunge * 0.18;
    pitchDelta = -windup * 0.08 + lunge * 0.18;
    yawDelta = -windup * 0.32 + slash * 0.78;
    rollDelta = windup * 0.42 - slash * 0.88;
  } else if (attack === 'diagonal') {
    rightDelta = windup * 1.05 - slash * 2.65;
    upDelta = -windup * 0.65 + slash * 1.75;
    pitchDelta = windup * 0.12 - slash * 0.22;
    yawDelta = -windup * 0.22 + slash * 0.52;
    rollDelta = windup * 0.28 - slash * 0.54;
  } else {
    rightDelta = windup * 0.15 - slash * 0.35;
    upDelta = -windup * 0.85 + slash * 2.45;
    pitchDelta = windup * 0.18 - slash * 0.36;
    yawDelta = -windup * 0.04 + slash * 0.08;
    rollDelta = windup * 0.05 - slash * 0.08;
  }

  const right = 2.75 + rightDelta + walkSway * 0.72;
  const up = -5.55 + upDelta - walkBob + idleBreathe - clampedSwitch * 5.2;
  const forward = 10.1 - windup * 1.15 + lunge * 5.2 - clampedSwitch * 1.4;
  out.offset.setScalar(right, up, forward);

  const pitch = -0.58 + pitchDelta + clampedSwitch * 0.46;
  const yaw = 0.22 + yawDelta - walkSway * 0.05;
  const roll = -0.14 + rollDelta - walkSway * 0.07;
  out.rotation.setScalar(pitch, yaw, roll);
  return out;
}
