import { Trigo, Utils, Vec2, Vec3 } from '@1pizzateam/spock';
import { mulberry32 } from './rng.js';
import { field, mix, plate, rivet, rust, SHADOW, Tile } from './floor.js';

const scratchPt = new Vec2();
const scratchEdgeA = new Vec3();
const scratchEdgeB = new Vec3();
const scratchNormal = new Vec3();

/**
 * The skin of an explosive barrel: an orange oil drum, as a pixel-art atlas drawn here in code. The side is 128 x 64
 * (round the barrel and down it) with a hazard band, rolling hoops, two warning labels, weld seams and rust; the lid is
 * 64 x 64; and the fourth 64 x 64 cell is scorched soot, blistered steel, and glowing residual embers for the ruptured
 * barrel stump and flying shrapnel after detonation.
 */

const SIDE = { x: 0, width: 128, height: 64 };
const LID = { x: 128, width: 64, height: 64 };
const CHAR = { x: 192, width: 64, height: 64 };
export const BARREL_ATLAS = { width: 256, height: 64 };
export const BARREL_STAVE_COUNT = 5;

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

function drawChar(rnd) {
  const t = new Tile(CHAR.width, CHAR.height);
  plate(t, 0, 0, CHAR.width, CHAR.height, rnd);
  const sootField = field(rnd, 9);
  const emberField = field(rnd, 5);
  const cx = 31.5;
  const cy = 31.5;
  for (let y = 0; y < CHAR.height; y++)
    for (let x = 0; x < CHAR.width; x++) {
      const d = scratchPt.setScalar(x - cx, y - cy).getMagnitude() / 31.5;
      const n = sootField(x, y);
      const e = emberField(x * 1.4, y * 1.4);
      // Dark carbonized soot core with glowing ember fissures and blistered orange rust around the torn rim
      const soot = [16 + n * 18, 13 + n * 15, 16 + n * 17];
      t.set(x, y, soot, 0.88);
      if (d < 0.72 && e > 0.74)
        t.set(x, y, [218, 86 + (e - 0.74) * 320, 26], 0.82);
      else if (d >= 0.72 && n > 0.52)
        t.set(x, y, mix(PAINT_DARK, soot, 0.45), 0.7);
    }
  rust(t, rnd, 0.42);
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
  blit(drawChar(mulberry32(7)), CHAR.x);
  return { name: 'barrel', data, width, height, side: SIDE, lid: LID, char: CHAR };
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

function pushTri(vertices, normals, uvs, p0, p1, p2, uv0, uv1, uv2) {
  scratchEdgeA.setScalar(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
  scratchEdgeB.setScalar(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]);
  scratchNormal.crossVectors(scratchEdgeA, scratchEdgeB);
  if (scratchNormal.getMagnitude(true) > 0)
    scratchNormal.normalize();
  else
    scratchNormal.setScalar(0, 1, 0);
  const nx = scratchNormal.x;
  const ny = scratchNormal.y;
  const nz = scratchNormal.z;
  vertices.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
  normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  uvs.push(uv0[0], uv0[1], uv1[0], uv1[1], uv2[0], uv2[1]);
}

function pushQuad(vertices, normals, uvs, c0, c1, c2, c3, u0, v0, u1, v1) {
  pushTri(vertices, normals, uvs, c0, c1, c2, [u0, v1], [u1, v1], [u1, v0]);
  pushTri(vertices, normals, uvs, c0, c2, c3, [u0, v1], [u1, v0], [u0, v0]);
}

/**
 * Builds the 3D ruptured barrel stump & scorched floor crater left behind when a barrel detonates:
 * a blackened blast-scorch ring on the floor, a charred lower drum collar, an ember-sludge interior floor,
 * and 12 jagged peeled-open metal petals flaring outward around the rim.
 */
export function barrelWreckMesh(size = new Vec2(9.5, 26)) {
  const R = size.x;
  const H = size.y;
  const segs = 12;
  const vertices = [];
  const normals = [];
  const uvs = [];

  const sideU0 = 0.002;
  const sideU1 = (SIDE.x + SIDE.width) / BARREL_ATLAS.width - 0.002;
  const charU0 = CHAR.x / BARREL_ATLAS.width + 0.003;
  const charU1 = (CHAR.x + CHAR.width) / BARREL_ATLAS.width - 0.003;
  const charUC = (charU0 + charU1) * 0.5;

  const collarH = H * 0.24;
  const petalHeights = [0.46, 0.34, 0.56, 0.38, 0.52, 0.31, 0.49, 0.36, 0.55, 0.33, 0.48, 0.37];
  const petalFlares = [1.34, 1.16, 1.46, 1.22, 1.38, 1.14, 1.42, 1.2, 1.44, 1.18, 1.36, 1.22];

  for (let i = 0; i < segs; i++) {
    const u0 = i / segs;
    const u1 = (i + 1) / segs;
    const a0 = u0 * Trigo.twopi;
    const a1 = u1 * Trigo.twopi;
    const aMid = (a0 + a1) * 0.5;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const cM = Math.cos(aMid);
    const sM = Math.sin(aMid);

    // 1. Scorched floor crater rim around the barrel base (y = 0.08)
    const scorchR = R * (1.42 + (i % 2) * 0.14);
    const scorchNextR = R * (1.42 + ((i + 1) % 2) * 0.14);
    pushTri(
      vertices,
      normals,
      uvs,
      [0, 0.08, 0],
      [c1 * scorchNextR, 0.08, s1 * scorchNextR],
      [c0 * scorchR, 0.08, s0 * scorchR],
      [charUC, 0.5],
      [charUC + c1 * 0.11, 0.5 + s1 * 0.42],
      [charUC + c0 * 0.11, 0.5 + s0 * 0.42]
    );

    // 2. Charred interior floor plate inside the ruptured stump (y = 1.4)
    const innerFloorR = R * 0.94;
    pushTri(
      vertices,
      normals,
      uvs,
      [0, 1.4, 0],
      [c1 * innerFloorR, 1.1, s1 * innerFloorR],
      [c0 * innerFloorR, 1.1, s0 * innerFloorR],
      [charUC, 0.5],
      [charUC + c1 * 0.09, 0.5 + s1 * 0.36],
      [charUC + c0 * 0.09, 0.5 + s0 * 0.36]
    );

    // 3. Lower drum collar (y = 0 .. collarH): orange/rusted outer skin + charred soot inner wall
    const rBase = R * 0.985;
    const rCollar = R * 1.04;
    const b0 = [c0 * rBase, 0, s0 * rBase];
    const b1 = [c1 * rBase, 0, s1 * rBase];
    const m0 = [c0 * rCollar, collarH, s0 * rCollar];
    const m1 = [c1 * rCollar, collarH, s1 * rCollar];
    const su0 = Utils.lerp(sideU0, sideU1, u0);
    const su1 = Utils.lerp(sideU0, sideU1, u1);
    pushQuad(vertices, normals, uvs, b0, b1, m1, m0, su0, 0.68, su1, 0.98);
    pushQuad(vertices, normals, uvs, b1, b0, m0, m1, charU0, 0.55, charU1, 0.95);

    // 4. Jagged peeled-open metal petal flaring outward from the collar rim
    const h0 = H * petalHeights[i];
    const h1 = H * petalHeights[(i + 1) % segs];
    const f0 = R * petalFlares[i];
    const f1 = R * petalFlares[(i + 1) % segs];
    const tipR = R * (petalFlares[i] + 0.16);
    const tipH = H * (petalHeights[i] + 0.09);

    const t0 = [c0 * f0, h0, s0 * f0];
    const t1 = [c1 * f1, h1, s1 * f1];
    const tip = [cM * tipR, tipH, sM * tipR];

    // Outer face of flared petal (shows hazard band / orange paint)
    pushQuad(vertices, normals, uvs, m0, m1, t1, t0, su0, 0.36, su1, 0.68);
    pushTri(vertices, normals, uvs, t0, t1, tip, [su0, 0.36], [su1, 0.36], [(su0 + su1) * 0.5, 0.22]);

    // Inner face of flared petal (shows blackened soot & glowing embers)
    pushQuad(vertices, normals, uvs, m1, m0, t0, t1, charU0, 0.18, charU1, 0.55);
    pushTri(vertices, normals, uvs, t1, t0, tip, [charU1, 0.18], [charU0, 0.18], [charUC, 0.05]);
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}

/**
 * Builds the 3D shrapnel parts blasted off a detonating barrel:
 * - `lid`: warped, buckled circular steel drum head with bungs and scorched underside.
 * - `staves`: `BARREL_STAVE_COUNT` curved, twisted orange/hazard metal shell fragments that fly outward and bounce on the floor.
 */
export function barrelShrapnelParts(size = new Vec2(9.5, 26)) {
  const R = size.x;
  const H = size.y;
  const sideU0 = 0.002;
  const sideU1 = (SIDE.x + SIDE.width) / BARREL_ATLAS.width - 0.002;
  const lidU0 = LID.x / BARREL_ATLAS.width + 0.003;
  const lidU1 = (LID.x + LID.width) / BARREL_ATLAS.width - 0.003;
  const lidUC = (lidU0 + lidU1) * 0.5;
  const charU0 = CHAR.x / BARREL_ATLAS.width + 0.003;
  const charU1 = (CHAR.x + CHAR.width) / BARREL_ATLAS.width - 0.003;
  const charUC = (charU0 + charU1) * 0.5;

  // 1. Warped 3D barrel lid (buckled upward along one edge from internal blast pressure)
  const lidVerts = [];
  const lidNorms = [];
  const lidUvs = [];
  const lidSegs = 10;
  const lidR = R * 0.96;
  const lidThick = 1.15;
  for (let i = 0; i < lidSegs; i++) {
    const a0 = (i / lidSegs) * Trigo.twopi;
    const a1 = ((i + 1) / lidSegs) * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const warp0 = Math.max(0, c0) * 1.85;
    const warp1 = Math.max(0, c1) * 1.85;

    const top0 = [c0 * lidR, lidThick * 0.5 + warp0, s0 * lidR];
    const top1 = [c1 * lidR, lidThick * 0.5 + warp1, s1 * lidR];
    const bot0 = [c0 * lidR, -lidThick * 0.5 + warp0, s0 * lidR];
    const bot1 = [c1 * lidR, -lidThick * 0.5 + warp1, s1 * lidR];

    pushTri(
      lidVerts,
      lidNorms,
      lidUvs,
      [0, lidThick * 0.5 + 0.35, 0],
      top1,
      top0,
      [lidUC, 0.5],
      [lidUC + c1 * 0.12, 0.5 + s1 * 0.46],
      [lidUC + c0 * 0.12, 0.5 + s0 * 0.46]
    );
    pushTri(
      lidVerts,
      lidNorms,
      lidUvs,
      [0, -lidThick * 0.5 + 0.35, 0],
      bot0,
      bot1,
      [charUC, 0.5],
      [charUC + c0 * 0.11, 0.5 + s0 * 0.42],
      [charUC + c1 * 0.11, 0.5 + s1 * 0.42]
    );
    pushQuad(lidVerts, lidNorms, lidUvs, bot0, bot1, top1, top0, charU0, 0.2, charU1, 0.8);
  }

  // 2. Curved, twisted 3D torn barrel stave shards (`BARREL_STAVE_COUNT` pieces)
  const staves = [];
  const arcSpan = (Trigo.twopi / BARREL_STAVE_COUNT) * 0.78;
  for (let s = 0; s < BARREL_STAVE_COUNT; s++) {
    const sVerts = [];
    const sNorms = [];
    const sUvs = [];
    const subSegs = 3;
    const staveH = H * (0.36 + (s % 2) * 0.08);
    const halfH = staveH * 0.5;
    const uBase = s / BARREL_STAVE_COUNT;
    const uSpan = 0.78 / BARREL_STAVE_COUNT;

    for (let j = 0; j < subSegs; j++) {
      const f0 = j / subSegs - 0.5;
      const f1 = (j + 1) / subSegs - 0.5;
      const a0 = f0 * arcSpan;
      const a1 = f1 * arcSpan;
      // Local coordinates centered on the stave body at radius ~0 so rotations spin around the shard's own center of mass
      const x0 = Math.sin(a0) * R;
      const z0 = (Math.cos(a0) - 0.92) * R;
      const x1 = Math.sin(a1) * R;
      const z1 = (Math.cos(a1) - 0.92) * R;
      const jagTop0 = halfH * (0.82 + ((s + j) % 2) * 0.32);
      const jagTop1 = halfH * (0.82 + ((s + j + 1) % 2) * 0.32);
      const jagBot0 = -halfH * (0.78 + ((s + j + 1) % 2) * 0.28);
      const jagBot1 = -halfH * (0.78 + ((s + j) % 2) * 0.28);
      const bend0 = f0 * 1.1;
      const bend1 = f1 * 1.1;

      const b0 = [x0, jagBot0, z0 + bend0];
      const b1 = [x1, jagBot1, z1 + bend1];
      const t0 = [x0 * 1.08, jagTop0, z0 + 0.65 + bend0];
      const t1 = [x1 * 1.08, jagTop1, z1 + 0.65 + bend1];

      const su0 = Utils.lerp(sideU0, sideU1, uBase + (j / subSegs) * uSpan);
      const su1 = Utils.lerp(sideU0, sideU1, uBase + ((j + 1) / subSegs) * uSpan);
      pushQuad(sVerts, sNorms, sUvs, b0, b1, t1, t0, su0, 0.14, su1, 0.66);
      pushQuad(sVerts, sNorms, sUvs, b1, b0, t0, t1, charU0, 0.2, charU1, 0.8);
    }

    staves.push({
      vertices: new Float32Array(sVerts),
      normals: new Float32Array(sNorms),
      uvs: new Float32Array(sUvs),
    });
  }

  return {
    lid: {
      vertices: new Float32Array(lidVerts),
      normals: new Float32Array(lidNorms),
      uvs: new Float32Array(lidUvs),
    },
    staves,
  };
}

/** Pre-allocates a reusable pose structure for `barrelExplosionPose`. */
export function createBarrelExplosionPose() {
  const staves = [];
  for (let i = 0; i < BARREL_STAVE_COUNT; i++)
    staves.push({ pos: new Vec3(), rot: new Vec3() });
  return {
    wreckScale: new Vec3(1, 1, 1),
    wreckRot: new Vec3(0, 0, 0),
    lid: { pos: new Vec3(), rot: new Vec3() },
    staves,
  };
}

function writeBallisticArc(posTarget, rotTarget, startX, startY, startZ, endX, endY, endZ, spinX, spinY, spinZ, restPitch, restYaw, restRoll, t, peakLift) {
  const clamped = Utils.clamp(t, 0, 1);
  const out = 1 - (1 - clamped) * (1 - clamped);
  const x = Utils.lerp(startX, endX, out);
  const z = Utils.lerp(startZ, endZ, out);
  let y;
  if (clamped < 0.6) {
    const u = clamped / 0.6;
    y = Utils.lerp(startY, endY, u * u) + Math.sin(u * Trigo.pi) * peakLift;
  } else if (clamped < 0.85) {
    const u = (clamped - 0.6) / 0.25;
    y = endY + Math.sin(u * Trigo.pi) * (peakLift * 0.26);
  } else if (clamped < 1) {
    const u = (clamped - 0.85) / 0.15;
    y = endY + Math.sin(u * Trigo.pi) * (peakLift * 0.08);
  } else
    y = endY;
  posTarget.setScalar(x, y, z);

  const settle = Utils.clamp((clamped - 0.58) / 0.42, 0, 1);
  const rx = Utils.lerp(spinX * out, restPitch, settle * settle);
  const ry = Utils.lerp(spinY * out, restYaw, settle * settle);
  const rz = Utils.lerp(spinZ * out, restRoll, settle * settle);
  rotTarget.setScalar(rx, ry, rz);
}

/**
 * Computes the 3D transforms for a detonated barrel's ruptured base, flying lid, and 5 shrapnel staves
 * at `elapsed` seconds after detonation, writing into `target` with zero allocations.
 */
export function barrelExplosionPose(elapsed, seed = 0, target = createBarrelExplosionPose()) {
  const t = Math.max(0, elapsed);

  // 1. Ruptured stump jolt: peels outward during the first 0.18s of detonation, then settles on the floor
  const jolt = t < 0.18 ? Math.sin((t / 0.18) * Trigo.pi) : 0;
  target.wreckScale.setScalar(1 + jolt * 0.18, 1 - jolt * 0.12, 1 + jolt * 0.18);
  target.wreckRot.setScalar(jolt * 0.08 * Math.sin(seed * 3), seed, jolt * 0.08 * Math.cos(seed * 3));

  // 2. Blown-off barrel lid: blasts high toward the ceiling, flips end-over-end, bounces twice, and rests on the floor
  const lidDuration = 0.92;
  const lidAngle = seed * 1.73 + 0.45;
  const lidDist = 24 + ((Math.sin(seed * 5.1) + 1) * 0.5) * 11;
  const lidEndX = Math.cos(lidAngle) * lidDist;
  const lidEndZ = Math.sin(lidAngle) * lidDist;
  writeBallisticArc(
    target.lid.pos,
    target.lid.rot,
    0,
    25.5,
    0,
    lidEndX,
    0.75,
    lidEndZ,
    Trigo.pi * 3.1,
    lidAngle + Trigo.pi * 1.4,
    Trigo.pi * 2.2,
    0.14,
    lidAngle + 0.8,
    -0.12,
    t / lidDuration,
    28
  );

  // 3. Five torn metal staves: blast outward radially in parabolic arcs, bounce across the floor, and settle around the stump
  for (let i = 0; i < BARREL_STAVE_COUNT; i++) {
    const stave = target.staves[i];
    const hash = Math.sin(seed * 2.3 + i * 4.17) * 0.5 + 0.5;
    const angle = seed + (i / BARREL_STAVE_COUNT) * Trigo.twopi + (hash - 0.5) * 0.42;
    const startR = 8.2;
    const dist = 20 + hash * 18 + (i % 2) * 5;
    const duration = 0.68 + hash * 0.24;
    const peakLift = 14 + (1 - hash) * 13;
    const dirSign = i % 2 === 0 ? 1 : -1;
    writeBallisticArc(
      stave.pos,
      stave.rot,
      Math.cos(angle) * startR,
      15.5 + (i % 3) * 1.8,
      Math.sin(angle) * startR,
      Math.cos(angle) * dist,
      0.85,
      Math.sin(angle) * dist,
      dirSign * Trigo.pi * (2.4 + hash),
      angle + dirSign * 1.8,
      -dirSign * Trigo.pi * 1.9,
      Trigo.halfpi - 0.16,
      angle + 0.4 * dirSign,
      (hash - 0.5) * 0.28,
      t / duration,
      peakLift
    );
  }

  return target;
}
