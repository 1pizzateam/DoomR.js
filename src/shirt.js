import { CustomMesh, Material, Mesh, Texture } from '@1pizzateam/roostr';
import { Vec2, Vec3, computeSmoothNormals, syncRoostrMeshBuffers } from '@1pizzateam/facer';

/**
 * A procedural shirt for the studio bust, stitched to the head mesh: its top row IS the skin's own bottom boundary (the seam
 * where the neck stops), vertex for vertex, so the two surfaces meet with no gap and nothing wraps the neck. From that seam
 * the cloth slopes out into big square shoulders and hangs down the chest, closed at the hem.
 */

const SUBDIVISIONS = 2; // cloth columns between two neighbouring seam vertices = 2 ** SUBDIVISIONS
const CENTERLINE = 1e-4;
const MIN_DROP = 0.2;
const SEAM_TOP_Y = -7.1; // trapezius crest height on the neck seam
const SEAM_CZ = -2.65; // depth centre of the trapezius crest on the neck seam
const WEAVE_SIZE = 128;
const THREAD = 4; // texels per thread
const WEAVE_TILE = 4.8; // world units covered by one repeat of the weave

export const SHIRT_COLOR = new Vec3(0.17, 0.32, 0.21);

// Rows below the seam, in world units: y, half width (x), half depth (z), depth centre, superellipse exponent (higher = boxier),
// and how far the row stays pulled toward the seam shape (0 = on the seam, 1 = fully its own ring) so the cloth blends smoothly off it.
// The sides of the seam sit high (the trapezius), so the cloth slopes down and out from there to the shoulder tips, about as
// wide as two heads; every column of cloth always runs downward, so the chest in front, whose seam is lower, never rises.
const ROWS = [
  { y: -8.0, a: 9.7, b: 5.2, cz: -2.0, n: 2.4, w: 0.42 },
  { y: -8.5, a: 10.9, b: 5.45, cz: -2.0, n: 2.45, w: 0.82 },
  { y: -9.1, a: 12.7, b: 5.75, cz: -2.0, n: 2.55, w: 1 },
  { y: -9.75, a: 14.3, b: 6.1, cz: -2.0, n: 2.65, w: 1 },
  { y: -10.5, a: 15.35, b: 6.35, cz: -2.0, n: 2.7, w: 1 }, // shoulder tips
  { y: -11.9, a: 15.6, b: 6.6, cz: -2.0, n: 2.8, w: 1 },
  { y: -14.05, a: 15.0, b: 6.8, cz: -2.0, n: 2.8, w: 1 },
  { y: -16.2, a: 14.4, b: 6.6, cz: -2.0, n: 2.7, w: 1 } // short hem: just enough chest to read as a shirt
];
// How much of the seam's movement each row follows, from the seam down: the neck's motion is passed on to the cloth just
// below it and fades out over the shoulders, so the hem and the shoulder tips stay put and the cloth never tears from the seam.
const FOLLOW = [1, 0.85, 0.6, 0.4, 0.22, 0.1];
const HEM_CAP = [0.7, 0.4, 0.15, 0];

const sgnPow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);

const SHIRT_VERTEX = `
  attribute vec3 aVertexPosition;
  attribute vec3 aVertexNormal;
  attribute vec2 aTextureCoord;
  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;
  uniform mat3 uNormalMatrix;
  varying vec3 vNormal;
  varying vec2 vTextureCoord;
  varying vec3 vViewPos;
  void main(void) {
    vec4 mvPos = uViewMatrix * (uModelMatrix * vec4(aVertexPosition, 1.0));
    gl_Position = uProjectionMatrix * mvPos;
    vNormal = uNormalMatrix * aVertexNormal;
    vTextureCoord = aTextureCoord;
    vViewPos = mvPos.xyz;
  }
`;

// Cloth is rough: no specular highlight. It is lit by the same key / fill / rim rig as the skin, wrapped diffuse so the
// shadow side stays soft, with a faint sheen of loose fibres that brightens grazing angles and a cavity term from the weave.
const SHIRT_FRAGMENT = `
  precision mediump float;
  varying vec3 vNormal;
  varying vec2 vTextureCoord;
  varying vec3 vViewPos;
  uniform sampler2D uSampler;
  void main(void) {
    vec4 tex = texture2D(uSampler, vTextureCoord);
    vec3 normal = normalize(vNormal);
    if (!gl_FrontFacing) normal = -normal;
    vec3 viewDir = normalize(-vViewPos);

    vec3 keyDir = normalize(vec3(0.42, 0.56, 0.71));
    vec3 fillDir = normalize(vec3(-0.62, 0.18, 0.45));
    vec3 rimDir = normalize(vec3(0.0, 0.45, -0.88));

    float wrapKey = max((dot(normal, keyDir) + 0.45) / 1.45, 0.0);
    float fill = max((dot(normal, fillDir) + 0.3) / 1.3, 0.0) * 0.38;
    float sky = 0.5 + 0.5 * normal.y;
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0) * max(dot(normal, rimDir) + 0.25, 0.0) * 0.45;
    float fuzz = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.6) * 0.16;

    vec3 light = vec3(0.25, 0.26, 0.29) * (0.55 + 0.45 * sky)
      + vec3(0.98, 0.94, 0.88) * wrapKey
      + vec3(0.62, 0.72, 0.90) * fill;
    vec3 sheen = mix(tex.rgb, vec3(0.8), 0.25);
    vec3 color = tex.rgb * light + sheen * (fuzz + rim * 0.7) * (0.4 + tex.a * 0.6);
    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * A tileable plain-weave cotton: threads alternate over and under in a checker, each one a rounded rib that is lit on its
 * crown and dark where it dips, with a little slub and tint noise per thread. The alpha channel carries how raised a texel is,
 * so the shader can add its fibre sheen only on the crowns.
 */
export function weaveTexture(size = WEAVE_SIZE) {
  const data = new Uint8Array(size * size * 4);
  let seed = 7;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const cells = size / THREAD;
  // a tint and a slub per thread, so the cloth is not perfectly even
  const warp = Array.from({ length: cells }, () => ({ tint: 0.92 + rnd() * 0.16, slub: rnd() }));
  const weft = Array.from({ length: cells }, () => ({ tint: 0.92 + rnd() * 0.16, slub: rnd() }));
  const base = [SHIRT_COLOR.x, SHIRT_COLOR.y, SHIRT_COLOR.z];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const cx = Math.floor(x / THREAD);
      const cy = Math.floor(y / THREAD);
      const fx = ((x % THREAD) + 0.5) / THREAD; // 0..1 across the thread running up
      const fy = ((y % THREAD) + 0.5) / THREAD; // 0..1 across the thread running along
      const warpOver = (cx + cy) % 2 === 0; // which thread is on top in this cell
      const across = warpOver ? fx : fy;
      const along = warpOver ? fy : fx;
      const thread = warpOver ? warp[cx] : weft[cy];
      // rounded rib across the thread, and a gentle swell along it where it bows over the crossing thread
      const rib = Math.sin(across * Math.PI);
      const swell = 0.75 + 0.25 * Math.sin(along * Math.PI);
      const height = Math.pow(rib, 0.8) * swell;
      const shade = (0.5 + 0.5 * height) * thread.tint * (0.94 + 0.12 * thread.slub * Math.sin((warpOver ? y : x) * 0.35));
      const o = (y * size + x) * 4;
      for (let k = 0; k < 3; k++)
        data[o + k] = Math.max(0, Math.min(255, Math.round(base[k] * shade * 1.25 * 255)));
      data[o + 3] = Math.round(height * 255);
    }
  return data;
}

/**
 * The skin's bottom seam as an ordered, closed ring of vertex indices: the lowest boundary vertex, followed along the open edge
 * of the skin surface in both directions until the centre line at the back of the neck. Returns null if there is no seam.
 */
export function findNeckSeamIds(cartridge) {
  const { positions, indices, submeshes } = cartridge;
  const skin = submeshes?.find((s) => s.name === 'skin');
  const end = skin ? skin.startIndex + skin.indexCount : indices.length;
  const start = skin ? skin.startIndex : 0;

  const edges = new Map();
  const key = (a, b) => (a < b ? a * 65536 + b : b * 65536 + a);
  for (let i = start; i < end; i += 3)
    for (let k = 0; k < 3; k++) {
      const kk = key(indices[i + k], indices[i + (k + 1) % 3]);
      edges.set(kk, (edges.get(kk) ?? 0) + 1);
    }
  const adjacency = new Map();
  for (const [kk, count] of edges) {
    if (count !== 1)
      continue;
    const a = Math.floor(kk / 65536);
    const b = kk % 65536;
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a).push(b);
    adjacency.get(b).push(a);
  }
  if (!adjacency.size)
    return null;

  let lowest = -1;
  for (const v of adjacency.keys())
    if (lowest < 0 || positions[v * 3 + 1] < positions[lowest * 3 + 1])
      lowest = v;

  // follows the boundary from `lowest` through one of its neighbours until it reaches the centre line (or comes back round)
  const walk = (first) => {
    const path = [];
    let prev = lowest;
    let cur = first;
    for (let guard = 0; guard < 4096; guard++) {
      path.push(cur);
      if (cur === lowest || Math.abs(positions[cur * 3]) < CENTERLINE)
        break;
      const next = adjacency.get(cur).find((n) => n !== prev);
      if (next === undefined)
        break;
      prev = cur;
      cur = next;
    }
    return path;
  };

  const [n1, n2] = adjacency.get(lowest);
  const left = walk(n1);
  const right = n2 === undefined ? [] : walk(n2);
  // left path runs outward from the lowest vertex; reverse it so the ring reads back -> front -> back
  const ring = [...left.reverse(), lowest, ...right];
  // both walks stop on the centre line at the back of the neck, at the same spot (two vertices of the open seam): drop the repeat
  const at = (v) => [positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]];
  const [f, l] = [at(ring[0]), at(ring[ring.length - 1])];
  const repeats = ring.length > 2 && Math.hypot(f[0] - l[0], f[1] - l[1], f[2] - l[2]) < 1e-3;
  const ids = repeats ? ring.slice(0, -1) : ring;
  if (ids.length < 6)
    return null;
  return ids;
}

/** Builds the shirt as a RoostR Mesh in `ctx`, stitched to `cartridge`'s neck seam; null when the head has no seam. */
export function createShirtMesh(ctx, cartridge) {
  const ids = findNeckSeamIds(cartridge);
  if (!ids)
    return null;
  const at = (v) => new Vec3(cartridge.positions[v * 3], cartridge.positions[v * 3 + 1], cartridge.positions[v * 3 + 2]);
  // each cloth column on the seam sits between two seam vertices, so it can follow them both as the skin deforms
  const perEdge = 2 ** SUBDIVISIONS;
  const columns = [];
  const seam = [];
  for (let i = 0; i < ids.length; i++) {
    const a = ids[i];
    const b = ids[(i + 1) % ids.length];
    const pa = at(a);
    const pb = at(b);
    for (let k = 0; k < perEdge; k++) {
      const t = k / perEdge;
      columns.push({ a, b, t });
      seam.push(new Vec3(pa.x + (pb.x - pa.x) * t, pa.y + (pb.y - pa.y) * t, pa.z + (pb.z - pa.z) * t));
    }
  }
  const count = seam.length;

  const rows = [seam.map((p) => [p.x, p.y, p.z])];
  let prevY = seam.map((p) => p.y);
  const hemY = ROWS[ROWS.length - 1].y;
  for (const row of ROWS) {
    const ring = [];
    const ys = [];
    const drop = (row.y - SEAM_TOP_Y) / (hemY - SEAM_TOP_Y);
    for (let s = 0; s < count; s++) {
      const p = seam[s];
      // the seam point's direction round the shoulders, so each cloth column runs straight down from its own seam vertex
      const t = Math.atan2((p.z - SEAM_CZ) / row.b, p.x / row.a);
      const x = row.a * sgnPow(Math.cos(t), 2 / row.n);
      const z = row.cz + row.b * sgnPow(Math.sin(t), 2 / row.n);
      const targetY = p.y <= SEAM_TOP_Y ? p.y + (hemY - p.y) * drop : p.y + (row.y - p.y) * row.w;
      const y = Math.min(targetY, prevY[s] - MIN_DROP);
      ys.push(y);
      ring.push([p.x + (x - p.x) * row.w, y, p.z + (z - p.z) * row.w]);
    }
    prevY = ys;
    rows.push(ring);
  }
  // the hem is closed by shrinking its last ring to its centre, so nothing inside shows
  const last = rows[rows.length - 1];
  const centre = [0, last[0][1], ROWS[ROWS.length - 1].cz];
  for (const k of HEM_CAP)
    rows.push(last.map((p) => [centre[0] + (p[0] - centre[0]) * k, p[1], centre[2] + (p[2] - centre[2]) * k]));

  const rowCount = rows.length;
  // one extra column repeats the first, so the texture can run all the way round without smearing across the back seam
  const cols = count + 1;
  const positions = new Float32Array(rowCount * cols * 3);
  const uvs = new Float32Array(rowCount * cols * 2);
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  const downV = new Array(count).fill(0);
  rows.forEach((ring, r) => {
    let u = 0;
    for (let s = 0; s < cols; s++) {
      const p = ring[s % count];
      if (s > 0)
        u += dist(p, ring[(s - 1) % count]);
      if (r > 0 && s < count)
        downV[s] += dist(p, rows[r - 1][s]);
      const i = r * cols + s;
      positions.set(p, i * 3);
      uvs[i * 2] = u / WEAVE_TILE;
      uvs[i * 2 + 1] = downV[s % count] / WEAVE_TILE;
    }
  });
  // the seam column closes on itself, so its u must be an exact whole repeat
  for (let r = 0; r < rowCount; r++) {
    const total = uvs[(r * cols + count) * 2];
    const whole = Math.max(1, Math.round(total));
    for (let s = 0; s < cols; s++)
      uvs[(r * cols + s) * 2] *= whole / total;
  }

  const build = (flip) => {
    const indices = [];
    for (let r = 0; r + 1 < rowCount; r++)
      for (let s = 0; s < count; s++) {
        const a0 = r * cols + s;
        const a1 = a0 + 1;
        const b0 = (r + 1) * cols + s;
        const b1 = b0 + 1;
        if (flip)
          indices.push(a0, a1, b0, a1, b1, b0);
        else
          indices.push(a0, b0, a1, a1, b0, b1);
      }
    return new Int32Array(indices);
  };

  // choose the winding whose normals point away from the body's centre line
  const smoothNormals = (indices) => {
    const normals = computeSmoothNormals(positions, indices);
    // the repeated seam column is the same spot as the first, so both get the shared normal
    for (let r = 0; r < rowCount; r++) {
      const a = (r * cols) * 3;
      const b = (r * cols + count) * 3;
      for (let k = 0; k < 3; k++)
        normals[a + k] = normals[b + k] = normals[a + k] + normals[b + k];
      const len = Math.hypot(normals[a], normals[a + 1], normals[a + 2]) || 1;
      for (let k = 0; k < 3; k++)
        normals[a + k] = normals[b + k] = normals[a + k] / len;
    }
    return normals;
  };
  let indices = build(false);
  let normals = smoothNormals(indices);
  let outward = 0;
  for (let r = 3; r < rowCount - 5; r++)
    for (let s = 0; s < count; s++) {
      const i = (r * cols + s) * 3;
      outward += normals[i] * positions[i] + normals[i + 2] * (positions[i + 2] - ROWS[0].cz);
    }
  if (outward < 0) {
    indices = build(true);
    normals = smoothNormals(indices);
  }

  const custom = new CustomMesh();
  custom.bufferUsage = 'DYNAMIC_DRAW';
  custom.vertices = positions;
  custom.indices = indices;
  custom.normals = normals;
  custom.uvs = uvs;

  const mesh = new Mesh(custom, ctx);
  mesh.addProgram(SHIRT_VERTEX, SHIRT_FRAGMENT, new Material({ diffuse: new Vec3(1, 1, 1) }));
  const texture = Texture.create(weaveTexture(), ctx, {
    size: new Vec2(WEAVE_SIZE, WEAVE_SIZE),
    flipY: false,
    wrapS: ctx.REPEAT,
    wrapT: ctx.REPEAT,
    minFilter: ctx.LINEAR_MIPMAP_LINEAR,
    magFilter: ctx.LINEAR,
    generateMipmaps: true
  });
  if (texture)
    mesh.setSharedTexture(texture);
  mesh.shirt = {
    columns,
    count,
    cols,
    rowCount,
    rest: positions.slice(),
    restNormals: normals.slice(),
    work: positions.slice(),
    restSeam: ids.map((v) => at(v)),
    ids,
    index: new Map(ids.map((v, i) => [v, i]))
  };
  return mesh;
}

/**
 * Makes the shirt follow the rig: its seam columns move with the skin's own neck-seam vertices in `deformed` (the animated
 * positions, as from `FaceR.deformedPositions`), and the movement fades out row by row down the shoulders. No allocation.
 */
export function updateShirt(mesh, deformed) {
  const state = mesh?.shirt;
  if (!state)
    return;
  const { columns, count, cols, rowCount, rest, work, restSeam, index } = state;
  for (let c = 0; c < count; c++) {
    const { a, b, t } = columns[c];
    const ra = restSeam[index.get(a)];
    const rb = restSeam[index.get(b)];
    const dx = (deformed[a * 3] - ra.x) * (1 - t) + (deformed[b * 3] - rb.x) * t;
    const dy = (deformed[a * 3 + 1] - ra.y) * (1 - t) + (deformed[b * 3 + 1] - rb.y) * t;
    const dz = (deformed[a * 3 + 2] - ra.z) * (1 - t) + (deformed[b * 3 + 2] - rb.z) * t;
    for (let r = 0; r < FOLLOW.length && r < rowCount; r++) {
      const w = FOLLOW[r];
      const i = (r * cols + c) * 3;
      work[i] = rest[i] + dx * w;
      work[i + 1] = rest[i + 1] + dy * w;
      work[i + 2] = rest[i + 2] + dz * w;
      if (c === 0) {
        // the repeated seam column is the same spot as the first
        const j = (r * cols + count) * 3;
        work[j] = work[i];
        work[j + 1] = work[i + 1];
        work[j + 2] = work[i + 2];
      }
    }
  }
  syncRoostrMeshBuffers(mesh, work, state.restNormals);
}
