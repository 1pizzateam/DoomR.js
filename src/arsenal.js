import { Mat4x3, Quat, Trigo, Utils, Vec2, Vec3 } from '@1pizzateam/spock';

const smoothStep = Utils.smoothstep;

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
const scratchPt = new Vec2();

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

const scratchTransformQuat = new Quat();
const scratchTransformMat = new Mat4x3();
const scratchTransformVert = new Vec3();
const scratchTransformNorm = new Vec3();

function transformMesh(raw, offset = new Vec3(), rotation = new Vec3(), scale = new Vec3(1, 1, 1)) {
  const vIn = raw.vertices;
  const nIn = raw.normals;
  const vertices = new Float32Array(vIn.length);
  const normals = new Float32Array(nIn.length);
  scratchTransformQuat.setFromEuler(rotation);
  scratchTransformMat.compose(offset, scratchTransformQuat, scale);
  for (let i = 0; i < vIn.length; i += 3) {
    scratchTransformVert.setScalar(vIn[i], vIn[i + 1], vIn[i + 2]);
    scratchTransformMat.transformPoint(scratchTransformVert, scratchTransformVert);
    vertices[i] = scratchTransformVert.x;
    vertices[i + 1] = scratchTransformVert.y;
    vertices[i + 2] = scratchTransformVert.z;
    scratchTransformNorm.setScalar(nIn[i], nIn[i + 1], nIn[i + 2]);
    scratchTransformQuat.multiplyVector(scratchTransformNorm, scratchTransformNorm);
    if (scratchTransformNorm.getMagnitude(true) > 0)
      scratchTransformNorm.normalize();
    normals[i] = scratchTransformNorm.x;
    normals[i + 1] = scratchTransformNorm.y;
    normals[i + 2] = scratchTransformNorm.z;
  }
  return { vertices, normals, uvs: new Float32Array(raw.uvs) };
}

function octagonalRing(center = new Vec3(), halfSize = new Vec2(0.5, 0.5), chamfer = new Vec2(0.28, 0.28)) {
  const cx = center.x;
  const cy = center.y;
  const cz = center.z;
  const hx = halfSize.x;
  const hy = halfSize.y;
  const ix = hx * (1 - chamfer.x);
  const iy = hy * (1 - chamfer.y);
  return [
    new Vec3(cx + hx, cy - iy, cz),
    new Vec3(cx + hx, cy + iy, cz),
    new Vec3(cx + ix, cy + hy, cz),
    new Vec3(cx - ix, cy + hy, cz),
    new Vec3(cx - hx, cy + iy, cz),
    new Vec3(cx - hx, cy - iy, cz),
    new Vec3(cx - ix, cy - hy, cz),
    new Vec3(cx + ix, cy - hy, cz),
  ];
}

function ellipticalRing(center = new Vec3(), radii = new Vec2(0.5, 0.5), segments = 10) {
  const ring = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Trigo.twopi;
    ring.push(new Vec3(center.x + Math.cos(a) * radii.x, center.y + Math.sin(a) * radii.y, center.z));
  }
  return ring;
}

function pushCapTriangle(vertices, normals, uvs, p0, p1, p2, uv0, uv1, uv2) {
  scratchEdgeA.setScalar(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
  scratchEdgeB.setScalar(p2.x - p0.x, p2.y - p0.y, p2.z - p0.z);
  scratchNormal.crossVectors(scratchEdgeA, scratchEdgeB);
  if (scratchNormal.getMagnitude(true) > 0)
    scratchNormal.normalize();
  else
    scratchNormal.setScalar(0, 0, 1);
  vertices.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
  normals.push(
    scratchNormal.x, scratchNormal.y, scratchNormal.z,
    scratchNormal.x, scratchNormal.y, scratchNormal.z,
    scratchNormal.x, scratchNormal.y, scratchNormal.z
  );
  uvs.push(uv0.x, uv0.y, uv1.x, uv1.y, uv2.x, uv2.y);
}

function pushSmoothQuad(vertices, normals, uvs, a0, a1, b1, b0, n0, n1, n2, n3, u0, v0, u1, v1) {
  const corners = [a0, a1, b1, b0];
  const vNorms = [n0, n1, n2, n3];
  const quadUvs = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
  for (const k of [0, 1, 2, 0, 2, 3]) {
    const p = corners[k];
    const n = vNorms[k];
    vertices.push(p.x, p.y, p.z);
    normals.push(n.x, n.y, n.z);
    uvs.push(...quadUvs[k]);
  }
}

function loftRingsMesh(rings, capEnds = true, smoothNormals = false) {
  const vertices = [];
  const normals = [];
  const uvs = [];
  const ringCount = rings.length;
  const segs = rings[0].length;
  const cFirst = new Vec3();
  const cLast = new Vec3();
  for (let i = 0; i < segs; i++) {
    cFirst.add(rings[0][i]);
    cLast.add(rings[ringCount - 1][i]);
  }
  cFirst.scale(1 / segs);
  cLast.scale(1 / segs);
  const axis = new Vec3().subVectors(cLast, cFirst);
  const radial = new Vec3().subVectors(rings[0][0], cFirst);
  const tangent = new Vec3().subVectors(rings[0][1], rings[0][0]);
  const outTest = new Vec3().crossVectors(tangent, axis);
  const orientedRings = outTest.dotProduct(radial) < 0 ? rings.map((r) => [...r].reverse()) : rings;

  const uvCenter = new Vec2(0.5, 0.5);
  const uvA = new Vec2();
  const uvB = new Vec2();

  let ringCenters = null;
  let smoothGrid = null;
  if (smoothNormals) {
    ringCenters = orientedRings.map((ring) => {
      const c = new Vec3();
      for (let i = 0; i < segs; i++)
        c.add(ring[i]);
      return c.scale(1 / segs);
    });
    const tanU = new Vec3();
    const tanV = new Vec3();
    smoothGrid = orientedRings.map((ring, r) => {
      const rPrev = Math.max(0, r - 1);
      const rNext = Math.min(ringCount - 1, r + 1);
      return ring.map((pt, i) => {
        const prevI = (i - 1 + segs) % segs;
        const nextI = (i + 1) % segs;
        tanU.subVectors(ring[nextI], ring[prevI]);
        tanV.subVectors(orientedRings[rNext][i], orientedRings[rPrev][i]);
        const n = new Vec3().crossVectors(tanU, tanV);
        if (n.getMagnitude(true) > 1e-8)
          n.normalize();
        else {
          n.subVectors(pt, ringCenters[r]);
          if (n.getMagnitude(true) > 1e-8)
            n.normalize();
          else
            n.setScalar(0, 1, 0);
        }
        return n;
      });
    });
  }

  if (capEnds) {
    const first = orientedRings[0];
    for (let i = 0; i < segs; i++) {
      const next = (i + 1) % segs;
      const a0 = (i / segs) * Trigo.twopi;
      const a1 = (next / segs) * Trigo.twopi;
      uvA.setScalar(0.5 + Math.cos(a1) * 0.42, 0.5 + Math.sin(a1) * 0.42);
      uvB.setScalar(0.5 + Math.cos(a0) * 0.42, 0.5 + Math.sin(a0) * 0.42);
      pushCapTriangle(vertices, normals, uvs, cFirst, first[next], first[i], uvCenter, uvA, uvB);
    }
  }

  for (let r = 0; r < ringCount - 1; r++) {
    const ringA = orientedRings[r];
    const ringB = orientedRings[r + 1];
    const v0 = r / (ringCount - 1);
    const v1 = (r + 1) / (ringCount - 1);
    for (let i = 0; i < segs; i++) {
      const next = (i + 1) % segs;
      const u0 = i / segs;
      const u1 = (i + 1) / segs;
      const a0 = ringA[i];
      const a1 = ringA[next];
      const b1 = ringB[next];
      const b0 = ringB[i];
      if (smoothGrid)
        pushSmoothQuad(
          vertices,
          normals,
          uvs,
          a0,
          a1,
          b1,
          b0,
          smoothGrid[r][i],
          smoothGrid[r][next],
          smoothGrid[r + 1][next],
          smoothGrid[r + 1][i],
          u0,
          v0,
          u1,
          v1
        );
      else
        pushQuad(
          vertices,
          normals,
          uvs,
          [a0.x, a0.y, a0.z],
          [a1.x, a1.y, a1.z],
          [b1.x, b1.y, b1.z],
          [b0.x, b0.y, b0.z],
          u0,
          v0,
          u1,
          v1
        );
    }
  }

  if (capEnds) {
    const last = orientedRings[ringCount - 1];
    for (let i = 0; i < segs; i++) {
      const next = (i + 1) % segs;
      const a0 = (i / segs) * Trigo.twopi;
      const a1 = (next / segs) * Trigo.twopi;
      uvA.setScalar(0.5 + Math.cos(a0) * 0.42, 0.5 + Math.sin(a0) * 0.42);
      uvB.setScalar(0.5 + Math.cos(a1) * 0.42, 0.5 + Math.sin(a1) * 0.42);
      pushCapTriangle(vertices, normals, uvs, cLast, last[i], last[next], uvCenter, uvA, uvB);
    }
  }

  return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), uvs: new Float32Array(uvs) };
}

function subdivideStations(stations, targetCount = 12) {
  if (!stations || stations.length < 2 || stations.length >= targetCount)
    return stations;
  const out = [];
  const maxIdx = stations.length - 1;
  for (let k = 0; k < targetCount; k++) {
    const u = k / (targetCount - 1);
    const scaled = u * maxIdx;
    const idx = Math.min(maxIdx - 1, Math.floor(scaled));
    const frac = scaled - idx;
    const s = smoothStep(0, 1, frac);
    const st0 = stations[idx];
    const st1 = stations[idx + 1];
    const r0 = st0.radii ?? st0.size;
    const r1 = st1.radii ?? st1.size;
    out.push({
      pos: new Vec3(
        Utils.lerp(st0.pos.x, st1.pos.x, frac),
        Utils.lerp(st0.pos.y, st1.pos.y, frac),
        Utils.lerp(st0.pos.z, st1.pos.z, frac)
      ),
      radii: new Vec2(
        Utils.lerp(r0.x, r1.x, s),
        Utils.lerp(r0.y, r1.y, s)
      ),
    });
  }
  return out;
}

function buildCurvedTubeRings(stations, segments = 16, upHint = new Vec3(0, 1, 0), profileFn = null) {
  const count = stations.length;
  const rings = [];
  const tangent = new Vec3();
  const prevUp = new Vec3().copy(upHint);
  if (prevUp.getMagnitude(true) > 0)
    prevUp.normalize();
  else
    prevUp.setScalar(0, 1, 0);
  const right = new Vec3();
  const up = new Vec3();
  const proj = new Vec3();
  const radScale = new Vec2(1, 1);

  for (let k = 0; k < count; k++) {
    if (k === 0)
      tangent.subVectors(stations[1].pos, stations[0].pos);
    else if (k === count - 1)
      tangent.subVectors(stations[count - 1].pos, stations[count - 2].pos);
    else
      tangent.subVectors(stations[k + 1].pos, stations[k - 1].pos);

    if (tangent.getMagnitude(true) > 1e-8)
      tangent.normalize();
    else
      tangent.setScalar(0, 0, 1);

    const dotUp = prevUp.dotProduct(tangent);
    proj.copy(tangent).scale(dotUp);
    up.subVectors(prevUp, proj);
    if (up.getMagnitude(true) < 1e-5) {
      up.setScalar(0, 0, 1);
      if (Math.abs(up.dotProduct(tangent)) > 0.9)
        up.setScalar(1, 0, 0);
      proj.copy(tangent).scale(up.dotProduct(tangent));
      up.subVectors(up, proj);
    }
    up.normalize();
    right.crossVectors(up, tangent);
    if (right.getMagnitude(true) > 1e-8)
      right.normalize();
    up.crossVectors(tangent, right).normalize();
    prevUp.copy(up);

    const st = stations[k];
    const baseRadii = st.radii ?? st.size;
    const u = count > 1 ? k / (count - 1) : 0;
    const ring = [];
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Trigo.twopi;
      radScale.setScalar(1, 1);
      if (profileFn)
        profileFn(theta, u, radScale);
      const lx = Math.cos(theta) * baseRadii.x * radScale.x;
      const ly = Math.sin(theta) * baseRadii.y * radScale.y;
      ring.push(
        new Vec3(
          st.pos.x + right.x * lx + up.x * ly,
          st.pos.y + right.y * lx + up.y * ly,
          st.pos.z + right.z * lx + up.z * ly
        )
      );
    }
    rings.push(ring);
  }
  return rings;
}

function hollowCylinderMesh(radii = new Vec2(0.4, 0.65), lengthSegs = new Vec2(0.5, 12)) {
  const rIn = Math.min(radii.x, radii.y);
  const rOut = Math.max(radii.x, radii.y);
  const hz = lengthSegs.x * 0.5;
  const segments = Math.max(6, Math.round(lengthSegs.y));
  const vertices = [];
  const normals = [];
  const uvs = [];
  for (let i = 0; i < segments; i++) {
    const u0 = i / segments;
    const u1 = (i + 1) / segments;
    const a0 = u0 * Trigo.twopi;
    const a1 = u1 * Trigo.twopi;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const ox0 = c0 * rOut;
    const oy0 = s0 * rOut;
    const ox1 = c1 * rOut;
    const oy1 = s1 * rOut;
    const ix0 = c0 * rIn;
    const iy0 = s0 * rIn;
    const ix1 = c1 * rIn;
    const iy1 = s1 * rIn;
    pushQuad(vertices, normals, uvs, [ox0, oy0, -hz], [ox1, oy1, -hz], [ox1, oy1, hz], [ox0, oy0, hz], u0, 0, u1, 1);
    pushQuad(vertices, normals, uvs, [ox0, oy0, hz], [ox1, oy1, hz], [ix1, iy1, hz], [ix0, iy0, hz], u0, 0, u1, 1);
    pushQuad(vertices, normals, uvs, [ix1, iy1, -hz], [ix0, iy0, -hz], [ix0, iy0, hz], [ix1, iy1, hz], u0, 0, u1, 1);
    pushQuad(vertices, normals, uvs, [ox1, oy1, -hz], [ox0, oy0, -hz], [ix0, iy0, -hz], [ix1, iy1, -hz], u0, 0, u1, 1);
  }
  return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), uvs: new Float32Array(uvs) };
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

function paintWeaponHandSubBands(canvas, cell, yStart = 12) {
  const S = ARSENAL_CELL;
  for (let y = yStart; y < S; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi);
      if (y < 16) {
        // Molded Twill Carbon-Fiber / Kevlar hard-shell dorsal knuckle armor & titanium rivets
        const weave = ((x + y) & 3) < 2 ? 12 : -10;
        const rim = y === yStart || y === 15 || x < 2 || x >= S - 2 ? 18 : 0;
        const spec = Math.pow(cyl, 2.8) * 52;
        const v = Utils.clamp(44 + cyl * 28 + spec + weave + rim, 20, 148);
        canvas.put(cell, x, y, v * 0.94, v * 0.98, v * 1.06);
      } else if (y < 21) {
        // Spec-Ops tactical combat glove (Nomex weave, saddle-leather panels & Clarino suede palm pads)
        const stitch = y === 16 || y === 20 || (x % 7 === 0 && (y & 1) === 0) ? -16 : 0;
        const pebble = ((x + y) & 1) === 0 ? 6 : -5;
        const spec = Math.pow(cyl, 2.1) * 38;
        const r = Utils.clamp(78 + cyl * 40 + spec + stitch + pebble, 32, 164);
        const g = Utils.clamp(50 + cyl * 28 + spec * 0.76 + stitch * 0.8 + pebble, 20, 118);
        const b = Utils.clamp(32 + cyl * 18 + spec * 0.52 + stitch * 0.6 + pebble, 14, 82);
        canvas.put(cell, x, y, r, g, b);
      } else if (y < 25) {
        // Ripstop military olive-drab field-jacket cuff, ballistic nylon strap & wrist chronometer readout
        const watchDial = y >= 21 && y <= 23 && x >= 11 && x <= 20;
        const watchAmber = y === 22 && x >= 13 && x <= 16;
        const watchTeal = (y === 21 || y === 23) && x >= 12 && x <= 19 && (x & 1) === 0;
        if (watchAmber)
          canvas.put(cell, x, y, 244, 178, 56);
        else if (watchTeal)
          canvas.put(cell, x, y, 76, 228, 196);
        else if (watchDial)
          canvas.put(cell, x, y, 18, 30, 38);
        else {
          const weave = ((x + y) & 1) === 0 ? 6 : -6;
          const seam = y === 21 || y === 24 ? -14 : 0;
          const r = Utils.clamp(62 + cyl * 34 + weave + seam, 26, 116);
          const g = Utils.clamp(76 + cyl * 40 + weave + seam, 34, 136);
          const b = Utils.clamp(46 + cyl * 24 + weave + seam, 18, 84);
          canvas.put(cell, x, y, r, g, b);
        }
      } else {
        // Sculpted anatomical muscular bare forearm skin with brachioradialis/extensor tendons & vascular relief
        const tendon = Math.sin((x / S) * Trigo.pi * 3.0) * 14;
        const vein = Math.abs(x - (10 + ((y - 25) >> 1))) <= 1 ? -8 : 0;
        const pore = ((x * 5 + y * 3) & 3) === 0 ? -4 : 2;
        const r = Utils.clamp(168 + cyl * 54 + tendon + vein * 0.5 + pore, 106, 238);
        const g = Utils.clamp(120 + cyl * 44 + tendon * 0.75 + vein * 0.3 + pore, 72, 186);
        const b = Utils.clamp(90 + cyl * 34 + tendon * 0.55 + pore, 50, 148);
        canvas.put(cell, x, y, r, g, b);
      }
    }
}

function weaponHandMaterials(cell = ARSENAL_CELLS.grip) {
  return {
    CARBON: (m) => remapCellSub(m, cell, 0.39, 0.49),
    GLOVE: (m) => remapCellSub(m, cell, 0.52, 0.64),
    PALM: (m) => remapCellSub(m, cell, 0.54, 0.65),
    WATCH: (m) => remapCellSub(m, cell, 0.67, 0.74),
    CUFF: (m) => remapCellSub(m, cell, 0.68, 0.77),
    ARM: (m) => remapCellSub(m, cell, 0.80, 0.98),
  };
}

function forearmAnatomyProfile(theta, u, side, outScale) {
  const s = side >= 0 ? 1 : -1;
  const bell = Math.sin(Utils.clamp(u, 0, 1) * Trigo.pi);
  // Brachioradialis muscle belly along the upper-radial forearm
  const brachioAngle = theta - 0.65 * s;
  const brachio = Math.pow(Math.max(0, Math.cos(brachioAngle)), 3.0) * 0.14 * bell;
  // Extensor digitorum & carpi radialis ridge with subtle longitudinal tendon flutes
  const extensorAngle = theta - 1.35 * s;
  const extensor = Math.pow(Math.max(0, Math.cos(extensorAngle)), 2.4) * 0.09 * bell;
  const tendonFlutes = Math.cos(theta * 5.0) * 0.018 * (0.4 + 0.6 * bell);
  // Deep flexor carpi / pronator teres muscle belly on the lower-medial underside
  const flexorAngle = theta + 1.45 * s;
  const flexor = Math.pow(Math.max(0, Math.cos(flexorAngle)), 2.2) * 0.11 * bell;
  // Ulnar styloid process wrist bone prominence near wrist exit (u = 0.03 .. 0.18)
  const wristWindow = Math.exp(-Math.pow((u - 0.09) / 0.06, 2.0));
  const ulnaAngle = theta - 2.35 * s;
  const ulnaBone = Math.pow(Math.max(0, Math.cos(ulnaAngle)), 4.0) * 0.08 * wristWindow;

  const rx = 1.0 + brachio + extensor + tendonFlutes + ulnaBone;
  const ry = 1.0 + flexor + brachio * 0.65 + tendonFlutes;
  outScale.setScalar(rx, ry);
}

function cuffPleatProfile(theta, u, outScale) {
  const drape = Math.cos(theta * 5.0) * 0.028 + Math.sin(theta * 3.0) * 0.018;
  const rollWave = Math.sin(u * Trigo.pi * 2.5) * 0.035;
  const flare = u > 0.72 && u < 0.92 ? 0.045 : 0;
  const scale = 1.0 + drape + rollWave + flare;
  outScale.setScalar(scale, scale);
}

function gauntletContourProfile(theta, u, outScale) {
  // Smooth superellipse / rounded-octagonal tactical wrist gauntlet contour
  const oct = Math.cos(theta * 4.0) * 0.032;
  const strapRib = Math.sin(u * Trigo.pi * 2.0) * 0.025;
  outScale.setScalar(1.0 + oct + strapRib, 1.0 - oct * 0.5 + strapRib);
}

function fingerPhalanxProfile(theta, u, outScale) {
  // PIP joint swell around u = 0.36 and DIP joint swell around u = 0.68
  const pipSwell = Math.exp(-Math.pow((u - 0.36) / 0.09, 2.0)) * 0.085;
  const dipSwell = Math.exp(-Math.pow((u - 0.68) / 0.08, 2.0)) * 0.065;
  // Slightly wider laterally at joints, slightly flatter on the volar grip pad
  const volarFlat = Math.sin(theta) < 0 ? -0.045 * Math.pow(Math.sin(theta), 2.0) : 0.03 * Math.pow(Math.sin(theta), 2.0);
  const lateralBulge = Math.pow(Math.cos(theta), 2.0) * (pipSwell + dipSwell);
  const tipTaper = u > 0.82 ? 1.0 - Math.pow((u - 0.82) / 0.18, 1.6) * 0.42 : 1.0;
  outScale.setScalar((1.0 + pipSwell * 0.7 + dipSwell * 0.7 + lateralBulge) * tipTaper, (1.0 + pipSwell * 0.5 + volarFlat) * tipTaper);
}

function handMetacarpalProfile(theta, u, side, outScale) {
  const s = side >= 0 ? 1 : -1;
  // Thenar eminence (thumb base muscle mound) on upper-palmar aspect & hypothenar eminence on lower-palmar aspect
  const thenar = Math.pow(Math.max(0, Math.sin(theta - 0.45 * s)), 2.4) * 0.12 * Math.sin(Utils.clamp(u, 0, 1) * Trigo.pi);
  const hypothenar = Math.pow(Math.max(0, -Math.sin(theta + 0.35 * s)), 2.4) * 0.10 * (1.0 - u * 0.35);
  const tendonRidges = Math.cos(theta * 4.0) * 0.024;
  outScale.setScalar(1.0 + thenar * 0.6 + hypothenar * 0.5 + tendonRidges, 1.0 + thenar + hypothenar + tendonRidges * 0.5);
}

/**
 * Shared high-detail Half-Life 2 / Spec-Ops 3D player hand & muscular forearm builder.
 * Generates a smooth-shaded, high-polygon articulated hand and forearm mesh in local weapon space:
 * - 9-station x 18-segment smooth-shaded anatomical metacarpal glove chassis with thenar/hypothenar eminences
 * - 7-station x 14-segment contoured twill carbon-fiber dorsal armor shell + 4 sculpted 14-segment carbon MCP knuckle domes
 * - Dual-zone Clarino synthetic-suede palm heel & metacarpal callous cushions
 * - 10-station x 16-segment tangent-aligned 3D articulated thumb with contoured dorsal carbon shield & volar suede thumbpad
 * - 4x (10-station x 16-segment) tangent-aligned 3D articulated fingers with PIP/DIP joint swells, dorsal carbon phalanx plates & volar suede pads
 * - 8-station x 16-segment ballistic nylon wrist gauntlet with 3D titanium buckle, 10-station x 20-segment pleated ripstop cuff, and 20-segment 3D digital chronometer watch
 * - 14-station x 20-segment smooth-shaded anatomical muscular forearm with brachioradialis/extensor/flexor bellies, ulnar wrist bone, and 3D dorsal veins
 */
export function buildDetailedPlayerLimb({
  side = 1,
  handOffset = new Vec3(),
  handRotation = new Vec3(),
  handScale = new Vec3(1, 1, 1),
  fingerCurl = 1.0,
  thumbSpread = 0.0,
  hasWatch = side > 0,
  forearmStations = null,
  cuffStations = null,
  gauntletStations = null,
  materials = null,
} = {}) {
  const s = side >= 0 ? 1 : -1;
  const mats = materials ?? weaponHandMaterials(ARSENAL_CELLS.grip);
  const { CARBON, GLOVE, PALM, WATCH, CUFF, ARM } = mats;
  const BEZEL = mats.BEZEL ?? CARBON;

  const localHandParts = [];
  const pushLocal = (raw) => {
    localHandParts.push({
      mesh: transformMesh(raw, handOffset, handRotation, handScale),
      offset: new Vec3(0, 0, 0),
    });
  };

  // 1. High-poly 9-station x 18-segment smooth-shaded anatomical metacarpal hand chassis (z = -4.28 .. -0.64)
  const rawHandStations = [
    { pos: new Vec3(0.86 * s, -0.22, -4.28), radii: new Vec2(0.60, 0.96) },
    { pos: new Vec3(0.82 * s, -0.14, -3.55), radii: new Vec2(0.65, 1.08) },
    { pos: new Vec3(0.78 * s, -0.08, -2.75), radii: new Vec2(0.66, 1.15) },
    { pos: new Vec3(0.74 * s, -0.04, -1.95), radii: new Vec2(0.65, 1.16) },
    { pos: new Vec3(0.70 * s, -0.04, -1.22), radii: new Vec2(0.61, 1.10) },
    { pos: new Vec3(0.66 * s, -0.06, -0.64), radii: new Vec2(0.54, 1.00) },
  ];
  const handStations = subdivideStations(rawHandStations, 9);
  const dorsalHandRings = buildCurvedTubeRings(
    handStations,
    18,
    new Vec3(0, 1, 0),
    (theta, u, out) => handMetacarpalProfile(theta, u, s, out)
  );
  pushLocal(GLOVE(loftRingsMesh(dorsalHandRings, true, true)));

  // 2. Contoured 7-station x 14-segment molded carbon-fiber dorsal knuckle armor shell on outer (+X*s) back of hand
  const rawCarbonStations = [
    { pos: new Vec3(1.14 * s, -0.14, -3.92), radii: new Vec2(0.20, 0.84) },
    { pos: new Vec3(1.21 * s, -0.06, -2.85), radii: new Vec2(0.25, 0.96) },
    { pos: new Vec3(1.22 * s, -0.02, -1.78), radii: new Vec2(0.26, 0.98) },
    { pos: new Vec3(1.12 * s, -0.04, -0.78), radii: new Vec2(0.20, 0.86) },
  ];
  const carbonStations = subdivideStations(rawCarbonStations, 7);
  const carbonPlateRings = buildCurvedTubeRings(carbonStations, 14, new Vec3(0, 1, 0));
  pushLocal(CARBON(loftRingsMesh(carbonPlateRings, true, true)));

  // 3. Dual-zone Clarino synthetic-suede palm cushions on inner (-X*s) palmar surface gripping the handle
  const rawPalmHeel = [
    { pos: new Vec3(0.42 * s, -0.46, -4.18), radii: new Vec2(0.46, 0.44) },
    { pos: new Vec3(0.38 * s, -0.38, -2.55), radii: new Vec2(0.52, 0.50) },
    { pos: new Vec3(0.34 * s, -0.32, -0.92), radii: new Vec2(0.44, 0.42) },
  ];
  const palmHeelRings = buildCurvedTubeRings(subdivideStations(rawPalmHeel, 6), 14, new Vec3(0, 1, 0));
  pushLocal(PALM(loftRingsMesh(palmHeelRings, true, true)));

  const rawPalmUpper = [
    { pos: new Vec3(0.24 * s, 0.22, -3.75), radii: new Vec2(0.40, 0.36) },
    { pos: new Vec3(0.20 * s, 0.28, -2.25), radii: new Vec2(0.44, 0.40) },
    { pos: new Vec3(0.18 * s, 0.32, -0.82), radii: new Vec2(0.38, 0.35) },
  ];
  const palmUpperRings = buildCurvedTubeRings(subdivideStations(rawPalmUpper, 6), 14, new Vec3(0, 1, 0));
  pushLocal(PALM(loftRingsMesh(palmUpperRings, true, true)));

  // 4. High-poly 10-station x 16-segment tangent-aligned 3D articulated thumb on upper radial (+Y) thenar crest
  const ts = thumbSpread;
  const rawThumbStations = [
    { pos: new Vec3(0.88 * s, 0.34, -3.32), radii: new Vec2(0.48, 0.52) },
    { pos: new Vec3((0.80 + ts * 0.08) * s, 0.56 + ts * 0.08, -2.68), radii: new Vec2(0.45, 0.48) },
    { pos: new Vec3((0.72 + ts * 0.14) * s, 0.74 + ts * 0.14, -2.08), radii: new Vec2(0.42, 0.44) },
    { pos: new Vec3((0.54 + ts * 0.22) * s, 0.98 + ts * 0.22, -1.28), radii: new Vec2(0.39, 0.41) },
    { pos: new Vec3((0.35 + ts * 0.28) * s, 1.12 + ts * 0.28, -0.52), radii: new Vec2(0.35, 0.36) },
    { pos: new Vec3((0.22 + ts * 0.31) * s, 1.10 + ts * 0.32, -0.10), radii: new Vec2(0.18, 0.18) },
  ];
  const thumbStations = subdivideStations(rawThumbStations, 10);
  const thumbRings = buildCurvedTubeRings(
    thumbStations,
    16,
    new Vec3(0, 1, 0),
    (theta, u, out) => fingerPhalanxProfile(theta, u, out)
  );
  pushLocal(GLOVE(loftRingsMesh(thumbRings, true, true)));

  // Contoured dorsal carbon-fiber thumb shield lofted along the proximal thumb phalanx
  const thumbArmorStations = subdivideStations(
    [
      { pos: new Vec3((0.88 + ts * 0.10) * s, 0.80 + ts * 0.09, -2.52), radii: new Vec2(0.24, 0.16) },
      { pos: new Vec3((0.74 + ts * 0.16) * s, 0.98 + ts * 0.15, -1.88), radii: new Vec2(0.28, 0.18) },
      { pos: new Vec3((0.58 + ts * 0.22) * s, 1.14 + ts * 0.20, -1.32), radii: new Vec2(0.22, 0.15) },
    ],
    5
  );
  pushLocal(CARBON(loftRingsMesh(buildCurvedTubeRings(thumbArmorStations, 12, new Vec3(0, 1, 0)), true, true)));

  // Volar Clarino suede thumb grip pad lofted along the distal phalanx
  const thumbPadStations = subdivideStations(
    [
      { pos: new Vec3((0.46 + ts * 0.22) * s, 0.88 + ts * 0.18, -1.22), radii: new Vec2(0.28, 0.22) },
      { pos: new Vec3((0.30 + ts * 0.28) * s, 0.98 + ts * 0.24, -0.56), radii: new Vec2(0.26, 0.20) },
      { pos: new Vec3((0.20 + ts * 0.30) * s, 1.00 + ts * 0.28, -0.20), radii: new Vec2(0.18, 0.14) },
    ],
    5
  );
  pushLocal(PALM(loftRingsMesh(buildCurvedTubeRings(thumbPadStations, 12, new Vec3(0, 1, 0)), true, true)));

  // 5. 4 Sculpted 14-segment Carbon-Kevlar MCP Knuckle Domes along the lower-outer dorsal arch (+X*s, -Y)
  //    + 4x (12-station x 16-segment) 3D Tangent-Aligned Articulated Fingers wrapping under the bottom (-Y)
  //    finger grooves and up the inner (-X*s) side opposite the thumb (+Y).
  const curl = Utils.clamp(fingerCurl, 0.0, 1.35);
  const openExtend = 1.0 - Utils.clamp(curl, 0.0, 1.0);
  const fingerSpecs = [
    { z: -0.86, rScale: 0.96, yKnuckle: -0.62, yBot: -1.16, xInner: -0.78, yTipEnd: 0.42 },
    { z: -1.82, rScale: 1.04, yKnuckle: -0.66, yBot: -1.22, xInner: -0.84, yTipEnd: 0.48 },
    { z: -2.78, rScale: 0.98, yKnuckle: -0.64, yBot: -1.18, xInner: -0.80, yTipEnd: 0.40 },
    { z: -3.72, rScale: 0.88, yKnuckle: -0.58, yBot: -1.08, xInner: -0.72, yTipEnd: 0.28 },
  ];

  for (const f of fingerSpecs) {
    const fw = 0.42 * f.rScale;
    const ft = 0.36 * f.rScale;
    const yK = f.yKnuckle;

    // Smooth-domed 5-station x 14-segment Carbon-Kevlar MCP knuckle protector on the lower-outer dorsal crest
    const knuckleDomeStations = subdivideStations(
      [
        { pos: new Vec3(0.86 * s, yK + 0.06, f.z - 0.34 * f.rScale), radii: new Vec2(0.24 * f.rScale, 0.22 * f.rScale) },
        { pos: new Vec3(0.98 * s, yK - 0.04, f.z), radii: new Vec2(0.35 * f.rScale, 0.29 * f.rScale) },
        { pos: new Vec3(0.86 * s, yK + 0.06, f.z + 0.34 * f.rScale), radii: new Vec2(0.24 * f.rScale, 0.22 * f.rScale) },
      ],
      5
    );
    pushLocal(CARBON(loftRingsMesh(buildCurvedTubeRings(knuckleDomeStations, 14, new Vec3(0, 1, 0)), true, true)));

    // Interpolate between curled saber grip (wrapping under -Y and up -X*s toward thumb) and open inspection extension
    const xProxMid = 0.36 * curl + 0.48 * openExtend;
    const yProxMid = (f.yBot * 0.92) * curl + (yK - 0.56) * openExtend;

    const xPip = (f.xInner * 0.45) * curl + 0.05 * openExtend;
    const yPip = f.yBot * curl + (yK - 1.12) * openExtend;

    const xMid = (f.xInner * 0.96) * curl + (-0.42) * openExtend;
    const yMid = (f.yBot * 0.48) * curl + (yK - 1.62) * openExtend;

    const xDip = (f.xInner * 1.02) * curl + (-0.86) * openExtend;
    const yDip = 0.06 * curl + (yK - 2.02) * openExtend;

    const xDist = (f.xInner * 0.78) * curl + (-1.22) * openExtend;
    const yDist = (f.yTipEnd * 0.75) * curl + (yK - 2.32) * openExtend;

    const xTip = (f.xInner * 0.52) * curl + (-1.46) * openExtend;
    const yTip = f.yTipEnd * curl + (yK - 2.50) * openExtend;

    // 12-station x 16-segment true 3D curved phalangeal path rooted deep inside the lower-outer MCP knuckle dome
    const rawFingerPath = [
      { pos: new Vec3(0.88 * s, yK + 0.22, f.z), radii: new Vec2(fw * 1.04, ft * 1.02) },
      { pos: new Vec3(0.82 * s, yK - 0.04, f.z), radii: new Vec2(fw * 1.02, ft * 1.00) },
      { pos: new Vec3(xProxMid * s, yProxMid, f.z), radii: new Vec2(fw * 1.00, ft * 0.98) },
      { pos: new Vec3(xPip * s, yPip, f.z), radii: new Vec2(fw * 1.03, ft * 1.04) },
      { pos: new Vec3(xMid * s, yMid, f.z), radii: new Vec2(fw * 0.99, ft * 0.99) },
      { pos: new Vec3(xDip * s, yDip, f.z), radii: new Vec2(fw * 0.95, ft * 0.95) },
      { pos: new Vec3(xDist * s, yDist, f.z), radii: new Vec2(fw * 0.85, ft * 0.83) },
      { pos: new Vec3(xTip * s, yTip, f.z), radii: new Vec2(fw * 0.48, ft * 0.46) },
    ];
    const fingerStations = subdivideStations(rawFingerPath, 12);
    const fingerRings = buildCurvedTubeRings(
      fingerStations,
      16,
      new Vec3(0, 0, 1),
      (theta, u, out) => fingerPhalanxProfile(theta, u, out)
    );
    pushLocal(GLOVE(loftRingsMesh(fingerRings, true, true)));

    // Tangential 6-station x 12-segment dorsal carbon-fiber proximal phalanx armor shell on the outer/bottom surface
    const proxArmorStations = subdivideStations(
      [
        { pos: new Vec3(0.76 * s, yK - 0.18, f.z), radii: new Vec2(fw * 0.66, 0.11) },
        { pos: new Vec3((xProxMid + 0.08) * s, yProxMid - 0.16, f.z), radii: new Vec2(fw * 0.72, 0.13) },
        { pos: new Vec3((xPip - 0.06) * s, yPip - 0.14, f.z), radii: new Vec2(fw * 0.68, 0.12) },
      ],
      6
    );
    pushLocal(CARBON(loftRingsMesh(buildCurvedTubeRings(proxArmorStations, 12, new Vec3(0, 0, 1)), true, true)));

    // Tangential 6-station x 12-segment volar Clarino suede finger-pad cushion on the inner gripping surface
    const volarPadStations = subdivideStations(
      [
        { pos: new Vec3((xMid + 0.14) * s, yMid + 0.12, f.z), radii: new Vec2(fw * 0.72, 0.14) },
        { pos: new Vec3((xDip + 0.16) * s, yDip + 0.08, f.z), radii: new Vec2(fw * 0.74, 0.16) },
        { pos: new Vec3((xDist + 0.14) * s, yDist + 0.04, f.z), radii: new Vec2(fw * 0.68, 0.14) },
      ],
      6
    );
    pushLocal(PALM(loftRingsMesh(buildCurvedTubeRings(volarPadStations, 12, new Vec3(0, 0, 1)), true, true)));
  }

  // 6. High-Poly 3D Tactical Digital Chronometer Watch & Ballistic Wrist Strap
  if (hasWatch) {
    // Ballistic nylon watch band with 16-segment smooth contour
    const watchBandStations = subdivideStations(
      [
        { pos: new Vec3(1.14 * s, -0.50, -4.68), radii: new Vec2(1.03, 1.01) },
        { pos: new Vec3(1.22 * s, -0.58, -4.96), radii: new Vec2(1.06, 1.04) },
        { pos: new Vec3(1.30 * s, -0.66, -5.24), radii: new Vec2(1.04, 1.02) },
      ],
      6
    );
    pushLocal(CUFF(loftRingsMesh(buildCurvedTubeRings(watchBandStations, 16, new Vec3(0, 1, 0)), true, true)));

    // 20-segment brushed titanium chronometer case, notched rotating bezel, sapphire dial, lugs & pushers
    const watchRot = new Vec3(1.18, 0.42 * s, -0.48 * s);
    pushLocal(
      BEZEL(
        transformMesh(
          cylinderMesh(new Vec2(0.62, 0.32), 20),
          new Vec3(0.73 * s, 0.37, -4.93),
          watchRot
        )
      )
    );
    pushLocal(
      CARBON(
        transformMesh(
          hollowCylinderMesh(new Vec2(0.46, 0.60), new Vec2(0.38, 18)),
          new Vec3(0.71 * s, 0.39, -4.92),
          watchRot
        )
      )
    );
    pushLocal(
      WATCH(
        transformMesh(
          cylinderMesh(new Vec2(0.47, 0.37), 20),
          new Vec3(0.70 * s, 0.40, -4.91),
          watchRot
        )
      )
    );
    // Watch lug horns & side crown/pushers
    pushLocal(
      BEZEL(
        transformMesh(
          boxMesh(new Vec3(0.72, 1.38, 0.20)),
          new Vec3(0.75 * s, 0.35, -4.94),
          watchRot
        )
      )
    );
    pushLocal(
      BEZEL(
        transformMesh(
          cylinderMesh(new Vec2(0.11, 0.78), 10),
          new Vec3(0.72 * s, 0.42, -4.72),
          new Vec3(0.25, 1.15 * s, 0)
        )
      )
    );
  } else {
    // Left-wrist ballistic nylon strap & titanium D-ring buckle
    const strapStations = subdivideStations(
      [
        { pos: new Vec3(1.14 * s, -0.50, -4.68), radii: new Vec2(1.02, 1.00) },
        { pos: new Vec3(1.26 * s, -0.62, -5.12), radii: new Vec2(1.05, 1.03) },
      ],
      5
    );
    pushLocal(BEZEL(loftRingsMesh(buildCurvedTubeRings(strapStations, 16, new Vec3(0, 1, 0)), true, true)));
  }

  // 7. 8-station x 16-segment wrist gauntlet, 10-station x 20-segment pleated ripstop cuff, and 14-station x 20-segment anatomical muscular forearm
  if (gauntletStations) {
    const gSub = subdivideStations(gauntletStations, 8);
    const gRings = buildCurvedTubeRings(gSub, 16, new Vec3(0, 1, 0), (theta, u, out) =>
      gauntletContourProfile(theta, u, out)
    );
    localHandParts.push({ mesh: GLOVE(loftRingsMesh(gRings, true, true)), offset: new Vec3(0, 0, 0) });
  } else {
    const rawGauntlet = [
      { pos: new Vec3(0.88 * s, -0.26, -3.88), radii: new Vec2(0.88, 0.92) },
      { pos: new Vec3(1.12 * s, -0.52, -4.65), radii: new Vec2(0.96, 0.96) },
      { pos: new Vec3(1.36 * s, -0.76, -5.35), radii: new Vec2(1.02, 1.00) },
    ];
    const gRings = buildCurvedTubeRings(
      subdivideStations(rawGauntlet, 8),
      16,
      new Vec3(0, 1, 0),
      (theta, u, out) => gauntletContourProfile(theta, u, out)
    );
    pushLocal(GLOVE(loftRingsMesh(gRings, true, true)));
  }

  if (cuffStations) {
    const cSub = subdivideStations(cuffStations, 10);
    const cRings = buildCurvedTubeRings(cSub, 20, new Vec3(0, 1, 0), (theta, u, out) =>
      cuffPleatProfile(theta, u, out)
    );
    localHandParts.push({ mesh: CUFF(loftRingsMesh(cRings, true, true)), offset: new Vec3(0, 0, 0) });
  } else {
    const rawCuff = [
      { pos: new Vec3(1.34 * s, -0.74, -5.28), radii: new Vec2(1.08, 1.04) },
      { pos: new Vec3(1.62 * s, -1.02, -6.08), radii: new Vec2(1.20, 1.14) },
      { pos: new Vec3(1.92 * s, -1.32, -6.88), radii: new Vec2(1.26, 1.20) },
      { pos: new Vec3(1.98 * s, -1.38, -7.02), radii: new Vec2(1.12, 1.06) },
    ];
    const cRings = buildCurvedTubeRings(
      subdivideStations(rawCuff, 10),
      20,
      new Vec3(0, 1, 0),
      (theta, u, out) => cuffPleatProfile(theta, u, out)
    );
    pushLocal(CUFF(loftRingsMesh(cRings, true, true)));
  }

  const defaultForearmStations = [
    { pos: new Vec3(1.90 * s, -1.30, -6.82), radii: new Vec2(1.10, 1.04) },
    { pos: new Vec3(2.32 * s, -1.70, -8.15), radii: new Vec2(1.24, 1.15) },
    { pos: new Vec3(2.82 * s, -2.18, -9.68), radii: new Vec2(1.38, 1.27) },
    { pos: new Vec3(3.38 * s, -2.72, -11.35), radii: new Vec2(1.48, 1.36) },
    { pos: new Vec3(3.92 * s, -3.24, -12.95), radii: new Vec2(1.54, 1.42) },
    { pos: new Vec3(4.42 * s, -3.72, -14.35), radii: new Vec2(1.56, 1.45) },
  ];
  const activeForearm = subdivideStations(forearmStations ?? defaultForearmStations, 14);
  const fRings = buildCurvedTubeRings(
    activeForearm,
    20,
    new Vec3(0, 1, 0),
    (theta, u, out) => forearmAnatomyProfile(theta, u, s, out)
  );
  const forearmMesh = ARM(loftRingsMesh(fRings, true, true));
  if (forearmStations)
    localHandParts.push({ mesh: forearmMesh, offset: new Vec3(0, 0, 0) });
  else
    pushLocal(forearmMesh);

  // Sculpted 3D dorsal superficial cephalic vein & extensor tendon relief running along the forearm
  const veinStations = [];
  for (let k = 1; k < activeForearm.length - 1; k++) {
    const st = activeForearm[k];
    const u = k / (activeForearm.length - 1);
    const wave = Math.sin(u * Trigo.pi * 2.2) * 0.14 * s;
    const swell = Math.sin(u * Trigo.pi) * 0.085 + 0.045;
    veinStations.push({
      pos: new Vec3(
        st.pos.x - (st.radii.x * 0.32 * s) + wave,
        st.pos.y + st.radii.y * 0.88,
        st.pos.z
      ),
      radii: new Vec2(swell * 1.25, swell * 0.85),
    });
  }
  const veinMesh = ARM(loftRingsMesh(buildCurvedTubeRings(veinStations, 10, new Vec3(0, 1, 0)), true, true));
  if (forearmStations)
    localHandParts.push({ mesh: veinMesh, offset: new Vec3(0, 0, 0) });
  else
    pushLocal(veinMesh);

  return appendMesh(localHandParts);
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
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < S; x++) {
      const knurl = ((x + y) & 1) * 14;
      canvas.put(cell, x, y, 48 + knurl, 42 + knurl * 0.8, 36 + knurl * 0.6);
    }
  paintWeaponHandSubBands(canvas, cell, 12);
}

function paintChaingunMuzzle(canvas, cell) {
  const S = ARSENAL_CELL;
  const half = (S - 1) * 0.5;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const r = scratchPt.setScalar(dx, dy).getMagnitude();
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
 * - `hands`: shared high-detail first-person spec-ops gloved hands, carbon knuckle shields, digital chronometer, ripstop cuffs, and sculpted muscular forearms gripping the left vertical handlebar and top horizontal crossbar
 */
export function chaingunParts() {
  if (cachedChaingunParts)
    return cachedChaingunParts;

  const GRIP = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.02, 0.35);
  const handMats = weaponHandMaterials(ARSENAL_CELLS.grip);

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

  // High-detail left & right player hands and sculpted forearms gripping the left vertical handlebar & top crossbar
  const leftLimb = buildDetailedPlayerLimb({
    side: -1,
    handOffset: new Vec3(-3.35, lift + 1.55, -2.45),
    handRotation: new Vec3(-1.32, 0.22, -0.18),
    handScale: new Vec3(0.76, 0.76, 0.76),
    fingerCurl: 1.08,
    hasWatch: false,
    materials: handMats,
    gauntletStations: [
      { pos: new Vec3(-4.22, lift + 1.75, -2.85), size: new Vec2(0.84, 0.96) },
      { pos: new Vec3(-4.52, lift + 1.62, -3.32), size: new Vec2(0.90, 0.98) },
      { pos: new Vec3(-4.82, lift + 1.48, -3.75), size: new Vec2(0.96, 1.00) },
    ],
    cuffStations: [
      { pos: new Vec3(-4.78, lift + 1.50, -3.70), radii: new Vec2(1.04, 1.04) },
      { pos: new Vec3(-5.18, lift + 1.28, -4.30), radii: new Vec2(1.12, 1.10) },
      { pos: new Vec3(-5.60, lift + 1.02, -4.92), radii: new Vec2(1.18, 1.14) },
    ],
    forearmStations: [
      { pos: new Vec3(-5.55, lift + 1.05, -4.85), radii: new Vec2(1.12, 1.08) },
      { pos: new Vec3(-6.35, lift + 0.52, -6.05), radii: new Vec2(1.24, 1.18) },
      { pos: new Vec3(-7.25, lift - 0.12, -7.35), radii: new Vec2(1.36, 1.28) },
      { pos: new Vec3(-8.20, lift - 0.88, -8.70), radii: new Vec2(1.46, 1.36) },
      { pos: new Vec3(-9.10, lift - 1.68, -9.95), radii: new Vec2(1.54, 1.42) },
      { pos: new Vec3(-9.95, lift - 2.48, -11.15), radii: new Vec2(1.58, 1.46) },
    ],
  });

  const rightLimb = buildDetailedPlayerLimb({
    side: 1,
    handOffset: new Vec3(2.35, lift + 3.35, -3.55),
    handRotation: new Vec3(-0.32, -0.18, 1.42),
    handScale: new Vec3(0.76, 0.76, 0.76),
    fingerCurl: 1.08,
    hasWatch: true,
    materials: handMats,
    gauntletStations: [
      { pos: new Vec3(2.65, lift + 3.62, -3.95), size: new Vec2(0.96, 0.82) },
      { pos: new Vec3(2.98, lift + 3.36, -4.32), size: new Vec2(1.00, 0.88) },
      { pos: new Vec3(3.32, lift + 3.08, -4.72), size: new Vec2(1.04, 0.94) },
    ],
    cuffStations: [
      { pos: new Vec3(3.28, lift + 3.12, -4.66), radii: new Vec2(1.08, 1.00) },
      { pos: new Vec3(3.72, lift + 2.68, -5.26), radii: new Vec2(1.16, 1.08) },
      { pos: new Vec3(4.18, lift + 2.22, -5.88), radii: new Vec2(1.22, 1.14) },
    ],
    forearmStations: [
      { pos: new Vec3(4.15, lift + 2.25, -5.82), radii: new Vec2(1.14, 1.06) },
      { pos: new Vec3(4.98, lift + 1.52, -6.92), radii: new Vec2(1.26, 1.18) },
      { pos: new Vec3(5.88, lift + 0.68, -8.12), radii: new Vec2(1.38, 1.28) },
      { pos: new Vec3(6.82, lift - 0.25, -9.38), radii: new Vec2(1.48, 1.38) },
      { pos: new Vec3(7.72, lift - 1.22, -10.58), radii: new Vec2(1.56, 1.44) },
      { pos: new Vec3(8.58, lift - 2.18, -11.72), radii: new Vec2(1.60, 1.48) },
    ],
  });

  const pivots = {
    rotor: new Vec3(0, lift + 0.7, 9.6),
    hands: new Vec3(0, 0, 0),
  };

  cachedChaingunParts = {
    body: appendMesh(bodyParts),
    rotor: appendMesh(rotorParts),
    hands: appendMesh([
      { mesh: leftLimb, offset: new Vec3(0, 0, 0) },
      { mesh: rightLimb, offset: new Vec3(0, 0, 0) },
    ]),
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
  const kick = attacking ? Utils.clamp(recoil, 0.35, 1) : Math.min(1, recoil * 0.7);
  const spinning = attacking || spinDown > 0;

  const walkSway = Math.sin(bob) * 0.62 * moving;
  const walkBob = Math.abs(Math.cos(bob)) * 0.4 * moving;
  const joltX = attacking ? Math.sin(time * 92) * 0.14 : 0;
  const joltY = attacking ? Math.cos(time * 108) * 0.12 : 0;
  const joltZ = attacking ? Math.sin(time * 78) * 0.24 : 0;

  const right = 0.85 + walkSway * 0.68 + joltX;
  const up = -11.45 + kick * 0.16 - walkBob + joltY - clampedSwitch * 5.4;
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
      const cyl = Math.sin((x / S) * Trigo.pi);
      if (y < 20) {
        // Heavy military olive-drab armored receiver shroud with recessed panel seams & hex rivets
        const border = x < 2 || x >= S - 2 || y < 2 || y === 19;
        const fuller = y >= 8 && y <= 11 && x >= 5 && x <= S - 6;
        const rivet = (x === 4 || x === S - 5) && (y === 4 || y === 15);
        const grime = ((x * 5 + y * 3) & 3) * 3 - 4;
        if (border)
          canvas.put(cell, x, y, 34, 42, 28);
        else if (rivet)
          canvas.put(cell, x, y, 148, 158, 136);
        else if (fuller)
          canvas.put(cell, x, y, 46, 56, 38);
        else {
          const g = Utils.clamp(76 + cyl * 36 + grime, 42, 138);
          canvas.put(cell, x, y, g * 0.84, g, g * 0.68);
        }
      } else {
        // High-contrast diagonal yellow-and-black backblast hazard collar markings
        const rim = y === 20 || y >= S - 2;
        const stripe = ((x + y) & 4) === 0;
        if (rim)
          canvas.put(cell, x, y, 38, 44, 34);
        else if (stripe) {
          const boost = cyl * 28;
          canvas.put(cell, x, y, 218 + boost, 172 + boost * 0.8, 34 + boost * 0.3);
        } else
          canvas.put(cell, x, y, 28, 30, 28);
      }
    }
}

function paintRocketTube(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi);
      if (y < 24) {
        // Cylindrical olive-drab fiberglass/steel launch barrel with specular sheen & reinforcement bands
        const spec = Math.pow(cyl, 2.4) * 32;
        const flute = (x & 3) === 0 ? -8 : 0;
        const ring = y < 3 || y === 11 || y === 12 || y >= 21;
        const g = Utils.clamp(64 + cyl * 38 + spec + flute + (ring ? 24 : 0), 30, 176);
        canvas.put(cell, x, y, g * 0.85, g, g * 0.70);
      } else {
        // Soot-darkened rifled interior launch bore & venturi exhaust throat
        const rifling = ((x + y) & 3) === 0 ? -6 : 4;
        const v = Utils.clamp(22 + cyl * 16 + rifling, 12, 48);
        canvas.put(cell, x, y, v, v + 2, v + 4);
      }
    }
}

function paintRocketGrip(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi);
      const rib = y % 3 === 0 ? -12 : y % 3 === 1 ? 8 : 0;
      const checkering = ((x + y) & 1) * 6;
      const base = Utils.clamp(48 + cyl * 28 + rib + checkering, 24, 118);
      canvas.put(cell, x, y, base + 8, base + 4, base);
    }
  paintWeaponHandSubBands(canvas, cell, 12);
}

function paintRocketWarhead(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi);
      const spec = Math.pow(cyl, 2.6) * 42;
      if (y < 11) {
        // High-explosive crimson ballistic warhead ogive nose cone
        const seam = y === 10 ? -28 : 0;
        const r = Utils.clamp(158 + cyl * 64 + spec + seam, 78, 248);
        const g = Utils.clamp(32 + cyl * 22 + spec * 0.45, 14, 96);
        const b = Utils.clamp(26 + cyl * 18 + spec * 0.35, 12, 78);
        canvas.put(cell, x, y, r, g, b);
      } else if (y < 16) {
        // Gleaming machined brass piezoelectric fuze ring & caution band
        const knurl = (x & 1) === 0 ? 8 : -6;
        const r = Utils.clamp(168 + cyl * 58 + spec + knurl, 96, 252);
        const g = Utils.clamp(132 + cyl * 48 + spec * 0.8 + knurl, 72, 218);
        const b = Utils.clamp(42 + cyl * 24 + spec * 0.4, 20, 108);
        canvas.put(cell, x, y, r, g, b);
      } else if (y < 25) {
        // Hardened gunmetal-steel rocket motor casing & hydraulic piston rod
        const rivet = y === 18 && (x & 7) === 3 ? 28 : 0;
        const v = Utils.clamp(112 + cyl * 52 + spec + rivet, 54, 224);
        canvas.put(cell, x, y, v * 0.96, v, v * 1.04);
      } else {
        // Emerald-cyan coated laser rangefinder objective lens & reticle glow
        const dx = x - 15.5;
        const dy = y - 28.0;
        const crosshair = Math.abs(dx) < 1.0 || Math.abs(dy) < 0.8;
        const glare = dx > -5 && dx < -1 && dy < 0;
        if (glare)
          canvas.put(cell, x, y, 188, 252, 238);
        else if (crosshair)
          canvas.put(cell, x, y, 92, 242, 198);
        else {
          const g = Utils.clamp(84 + cyl * 78, 36, 186);
          canvas.put(cell, x, y, 18 + cyl * 24, g, g * 0.88 + 24);
        }
      }
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
 * - `body`: Heavy olive-drab cylindrical launch tube with hollow rifled bore, armored octagonal receiver saddle,
 *   hazard-striped front blast collar & rear breech collar, multi-station flared rear venturi exhaust nozzle bell,
 *   top carry handle & Picatinny sighting rail with folding front sight hood, side-mounted laser rangefinder scope,
 *   twin horizontal hydraulic recoil damper cylinders with chrome piston rods, padded shoulder rest, and dual grips.
 * - `warhead`: Articulated 3D multi-station ogive high-explosive rocket warhead with brass fuze collar, boat-tail
 *   motor nozzle, and 4 swept cruciform stabilizer fins that launches out of the muzzle on fire and slides forward
 *   from the breech during the auto-loader reload cycle.
 * - `hands`: Shared high-detail first-person spec-ops gloved hands, carbon knuckle armor, wrist chronometer,
 *   ripstop cuffs, and sculpted muscular forearms gripping the forward stabilization foregrip and rear trigger grip.
 */
export function rocketLauncherParts() {
  if (cachedRocketLauncherParts)
    return cachedRocketLauncherParts;

  const SHROUD_ARMOR = (m) => remapCellSub(m, ARSENAL_CELLS.body, 0.03, 0.58);
  const HAZARD_COLLAR = (m) => remapCellSub(m, ARSENAL_CELLS.body, 0.64, 0.96);
  const LAUNCH_TUBE = (m) => remapCellSub(m, ARSENAL_CELLS.barrel, 0.03, 0.72);
  const DARK_BORE = (m) => remapCellSub(m, ARSENAL_CELLS.barrel, 0.77, 0.96);
  const GRIP = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.02, 0.35);
  const WARHEAD_TIP = (m) => remapCellSub(m, ARSENAL_CELLS.muzzle, 0.03, 0.31);
  const WARHEAD_BRASS = (m) => remapCellSub(m, ARSENAL_CELLS.muzzle, 0.36, 0.48);
  const WARHEAD_BODY = (m) => remapCellSub(m, ARSENAL_CELLS.muzzle, 0.52, 0.76);
  const SCOPE_OPTIC = (m) => remapCellSub(m, ARSENAL_CELLS.muzzle, 0.80, 0.97);
  const handMats = weaponHandMaterials(ARSENAL_CELLS.grip);

  const tubeY = 1.5;

  // Octagonal armored mid-receiver saddle wrapping the central launch tube (z = -5.2 .. +5.4)
  const receiverSaddleRings = [
    octagonalRing(new Vec3(0, tubeY - 0.1, -5.2), new Vec2(3.65, 3.75), new Vec2(0.34, 0.34)),
    octagonalRing(new Vec3(0, tubeY - 0.1, -4.4), new Vec2(3.92, 4.02), new Vec2(0.32, 0.32)),
    octagonalRing(new Vec3(0, tubeY - 0.1, 4.6), new Vec2(3.92, 4.02), new Vec2(0.32, 0.32)),
    octagonalRing(new Vec3(0, tubeY - 0.1, 5.4), new Vec2(3.65, 3.75), new Vec2(0.34, 0.34)),
  ];

  // Multi-station conical flared rear venturi backblast exhaust nozzle bell (z = -16.2 .. -10.8)
  const venturiBellRings = [
    ellipticalRing(new Vec3(0, tubeY, -16.2), new Vec2(5.05, 5.05), 16),
    ellipticalRing(new Vec3(0, tubeY, -14.8), new Vec2(4.45, 4.45), 16),
    ellipticalRing(new Vec3(0, tubeY, -13.2), new Vec2(3.65, 3.65), 16),
    ellipticalRing(new Vec3(0, tubeY, -11.8), new Vec2(3.08, 3.08), 16),
    ellipticalRing(new Vec3(0, tubeY, -10.8), new Vec2(3.45, 3.45), 16),
  ];

  // Ruggedized octagonal laser rangefinder / optical targeting scope body (x = 4.65, y = 4.15, z = -0.8 .. +4.8)
  const scopeBodyRings = [
    octagonalRing(new Vec3(4.65, 4.15, -0.8), new Vec2(1.48, 1.48), new Vec2(0.30, 0.30)),
    octagonalRing(new Vec3(4.65, 4.15, 4.8), new Vec2(1.56, 1.56), new Vec2(0.30, 0.30)),
  ];

  const bodyParts = [
    // 1. Main horizontal cylindrical olive-drab launch tube & dark rifled interior barrel bore (along Z axis)
    {
      mesh: LAUNCH_TUBE(cylinderMesh(new Vec2(3.38, 22.2), 16)),
      offset: new Vec3(0, tubeY, 0.3),
    },
    {
      mesh: DARK_BORE(cylinderMesh(new Vec2(2.48, 22.8), 16)),
      offset: new Vec3(0, tubeY, 0.1),
    },
    // Armored octagonal mid-receiver saddle housing
    {
      mesh: SHROUD_ARMOR(loftRingsMesh(receiverSaddleRings, true, false)),
      offset: new Vec3(0, 0, 0),
    },
    // Front heavy hollow muzzle blast collar & protective crown lip ring
    {
      mesh: HAZARD_COLLAR(hollowCylinderMesh(new Vec2(2.52, 4.12), new Vec2(3.0, 16))),
      offset: new Vec3(0, tubeY, 11.2),
    },
    {
      mesh: GRIP(hollowCylinderMesh(new Vec2(2.52, 3.85), new Vec2(0.85, 16))),
      offset: new Vec3(0, tubeY, 13.0),
    },
    // Rear hazard-striped breech collar ring
    {
      mesh: HAZARD_COLLAR(hollowCylinderMesh(new Vec2(2.55, 4.05), new Vec2(2.6, 16))),
      offset: new Vec3(0, tubeY, -10.0),
    },
    // Circumferential barrel reinforcement & cooling bands along the launch tube
    {
      mesh: GRIP(hollowCylinderMesh(new Vec2(3.32, 3.78), new Vec2(1.1, 16))),
      offset: new Vec3(0, tubeY, 7.6),
    },
    {
      mesh: GRIP(hollowCylinderMesh(new Vec2(3.32, 3.78), new Vec2(1.1, 16))),
      offset: new Vec3(0, tubeY, -7.2),
    },
    // Flared rear venturi backblast nozzle bell, shock bumper rim & dark exhaust throat
    {
      mesh: LAUNCH_TUBE(loftRingsMesh(venturiBellRings, true, true)),
      offset: new Vec3(0, 0, 0),
    },
    {
      mesh: GRIP(hollowCylinderMesh(new Vec2(3.65, 5.22), new Vec2(1.1, 16))),
      offset: new Vec3(0, tubeY, -15.95),
    },
    {
      mesh: DARK_BORE(cylinderMesh(new Vec2(3.68, 0.7), 16)),
      offset: new Vec3(0, tubeY, -15.8),
    },
    // 2. Twin horizontal side hydraulic recoil damper cylinders & chrome piston rods flanking the launch tube
    {
      mesh: GRIP(cylinderMesh(new Vec2(0.82, 11.4), 10)),
      offset: new Vec3(4.15, 0.35, -0.5),
    },
    {
      mesh: GRIP(cylinderMesh(new Vec2(0.82, 11.4), 10)),
      offset: new Vec3(-4.15, 0.35, -0.5),
    },
    {
      mesh: WARHEAD_BODY(cylinderMesh(new Vec2(0.48, 5.0), 10)),
      offset: new Vec3(4.15, 0.35, 7.3),
    },
    {
      mesh: WARHEAD_BODY(cylinderMesh(new Vec2(0.48, 5.0), 10)),
      offset: new Vec3(-4.15, 0.35, 7.3),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(1.6, 1.35, 1.15))),
      offset: new Vec3(3.65, 0.55, 8.8),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(1.6, 1.35, 1.15))),
      offset: new Vec3(-3.65, 0.55, 8.8),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(1.6, 1.35, 1.15))),
      offset: new Vec3(3.65, 0.55, -5.4),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(1.6, 1.35, 1.15))),
      offset: new Vec3(-3.65, 0.55, -5.4),
    },
    // 3. Top carry handle, Picatinny sighting rail bridge & front protective iron sight hood
    {
      mesh: GRIP(prismMesh(new Vec3(1.55, 1.8, 1.8), new Vec3(1.35, 1.8, 1.4), new Vec2(0, -0.25))),
      offset: new Vec3(0, 5.8, 4.9),
    },
    {
      mesh: GRIP(prismMesh(new Vec3(1.55, 1.8, 1.8), new Vec3(1.35, 1.8, 1.4), new Vec2(0, 0.25))),
      offset: new Vec3(0, 5.8, -3.7),
    },
    {
      mesh: SHROUD_ARMOR(boxMesh(new Vec3(1.85, 0.95, 11.0))),
      offset: new Vec3(0, 6.95, 0.6),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(2.1, 0.9, 1.5))),
      offset: new Vec3(0, 5.8, 11.2),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(0.34, 1.15, 1.2))),
      offset: new Vec3(-0.82, 6.65, 11.2),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(0.34, 1.15, 1.2))),
      offset: new Vec3(0.82, 6.65, 11.2),
    },
    {
      mesh: WARHEAD_TIP(boxMesh(new Vec3(0.28, 0.72, 0.36))),
      offset: new Vec3(0, 6.5, 11.2),
    },
    // 4. Side-mounted optical laser rangefinder / smart-target scope assembly (oriented along Z)
    {
      mesh: GRIP(boxMesh(new Vec3(1.8, 1.05, 1.25))),
      offset: new Vec3(3.55, 3.65, 3.8),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(1.8, 1.05, 1.25))),
      offset: new Vec3(3.55, 3.65, 0.2),
    },
    {
      mesh: SHROUD_ARMOR(loftRingsMesh(scopeBodyRings, true, false)),
      offset: new Vec3(0, 0, 0),
    },
    {
      mesh: GRIP(hollowCylinderMesh(new Vec2(0.95, 1.38), new Vec2(1.8, 12))),
      offset: new Vec3(4.65, 4.15, 5.55),
    },
    {
      mesh: SCOPE_OPTIC(cylinderMesh(new Vec2(0.98, 0.38), 12)),
      offset: new Vec3(4.65, 4.15, 6.12),
    },
    {
      mesh: GRIP(cylinderMesh(new Vec2(1.12, 1.4), 12)),
      offset: new Vec3(4.65, 4.15, -1.45),
    },
    {
      mesh: SCOPE_OPTIC(cylinderMesh(new Vec2(0.82, 0.32), 12)),
      offset: new Vec3(4.65, 4.15, -2.05),
    },
    {
      mesh: WARHEAD_BRASS(boxMesh(new Vec3(0.76, 0.55, 0.76))),
      offset: new Vec3(4.65, 5.85, 2.0),
    },
    // 5. Under-barrel receiver rail, trigger guard, padded shoulder rest, forward foregrip & rear pistol grip
    {
      mesh: SHROUD_ARMOR(boxMesh(new Vec3(2.8, 1.65, 13.4))),
      offset: new Vec3(0, -2.05, -0.3),
    },
    {
      mesh: GRIP(prismMesh(new Vec3(3.1, 6.2, 3.8), new Vec3(2.8, 6.2, 3.2), new Vec2(0, -0.6))),
      offset: new Vec3(0, -5.0, 4.2),
    },
    {
      mesh: GRIP(prismMesh(new Vec3(3.0, 5.6, 3.6), new Vec3(2.7, 5.6, 3.0), new Vec2(0, 0.8))),
      offset: new Vec3(0, -4.7, -4.8),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(1.35, 0.55, 2.8))),
      offset: new Vec3(0, -3.85, -2.35),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(1.35, 1.25, 0.55))),
      offset: new Vec3(0, -3.2, -1.1),
    },
    {
      mesh: WARHEAD_BRASS(prismMesh(new Vec3(0.55, 1.1, 0.55), new Vec3(0.55, 1.1, 0.45), new Vec2(0, 0.25))),
      offset: new Vec3(0, -3.1, -2.4),
    },
    {
      mesh: GRIP(prismMesh(new Vec3(3.2, 1.8, 3.8), new Vec3(3.5, 1.8, 4.2), new Vec2(0, 0))),
      offset: new Vec3(0, -2.35, -8.8),
    },
  ];

  // Picatinny rail recoil lugs along top carry handle spine
  for (const rz of [-3.4, -1.8, -0.2, 1.4, 3.0, 4.6])
    bodyParts.push({
      mesh: GRIP(boxMesh(new Vec3(1.95, 0.34, 0.55))),
      offset: new Vec3(0, 7.52, rz),
    });

  // Articulated 3D high-explosive anti-armor rocket warhead seated in the front launch tube (all stations along Z)
  const warheadNoseRings = [
    ellipticalRing(new Vec3(0, 0, 1.85), new Vec2(2.38, 2.38), 12),
    ellipticalRing(new Vec3(0, 0, 3.15), new Vec2(2.14, 2.14), 12),
    ellipticalRing(new Vec3(0, 0, 4.45), new Vec2(1.58, 1.58), 12),
    ellipticalRing(new Vec3(0, 0, 5.55), new Vec2(0.84, 0.84), 12),
    ellipticalRing(new Vec3(0, 0, 6.25), new Vec2(0.32, 0.32), 12),
  ];
  const warheadBodyRings = [
    ellipticalRing(new Vec3(0, 0, -4.5), new Vec2(1.85, 1.85), 12),
    ellipticalRing(new Vec3(0, 0, -3.7), new Vec2(1.48, 1.48), 12),
    ellipticalRing(new Vec3(0, 0, -2.2), new Vec2(1.94, 1.94), 12),
    ellipticalRing(new Vec3(0, 0, -0.8), new Vec2(2.34, 2.34), 12),
    ellipticalRing(new Vec3(0, 0, 1.25), new Vec2(2.36, 2.36), 12),
  ];

  const warheadParts = [
    {
      mesh: WARHEAD_BODY(loftRingsMesh(warheadBodyRings, true, true)),
      offset: new Vec3(0, 0, 0),
    },
    {
      mesh: WARHEAD_BRASS(cylinderMesh(new Vec2(2.42, 0.68), 12)),
      offset: new Vec3(0, 0, 1.55),
    },
    {
      mesh: WARHEAD_TIP(loftRingsMesh(warheadNoseRings, true, true)),
      offset: new Vec3(0, 0, 0),
    },
    {
      mesh: WARHEAD_BRASS(cylinderMesh(new Vec2(0.32, 0.72), 10)),
      offset: new Vec3(0, 0, 6.52),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(5.2, 0.38, 2.4))),
      offset: new Vec3(0, 0, -3.1),
    },
    {
      mesh: GRIP(boxMesh(new Vec3(0.38, 5.2, 2.4))),
      offset: new Vec3(0, 0, -3.1),
    },
  ];

  // High-detail left & right player hands and sculpted forearms gripping the forward foregrip & rear trigger grip
  const leftLimb = buildDetailedPlayerLimb({
    side: -1,
    handOffset: new Vec3(-0.75, -5.15, 4.45),
    handRotation: new Vec3(-1.35, 0.25, -0.15),
    handScale: new Vec3(0.84, 0.84, 0.84),
    fingerCurl: 1.05,
    hasWatch: false,
    materials: handMats,
    gauntletStations: [
      { pos: new Vec3(-1.85, -5.55, 3.45), size: new Vec2(0.92, 1.02) },
      { pos: new Vec3(-2.35, -5.85, 2.65), size: new Vec2(0.98, 1.06) },
      { pos: new Vec3(-2.85, -6.15, 1.85), size: new Vec2(1.04, 1.10) },
    ],
    cuffStations: [
      { pos: new Vec3(-2.80, -6.10, 1.92), radii: new Vec2(1.12, 1.12) },
      { pos: new Vec3(-3.45, -6.48, 0.88), radii: new Vec2(1.22, 1.18) },
      { pos: new Vec3(-4.10, -6.88, -0.15), radii: new Vec2(1.28, 1.24) },
    ],
    forearmStations: [
      { pos: new Vec3(-4.05, -6.85, -0.08), radii: new Vec2(1.22, 1.16) },
      { pos: new Vec3(-4.95, -7.40, -1.55), radii: new Vec2(1.34, 1.26) },
      { pos: new Vec3(-5.90, -7.98, -3.10), radii: new Vec2(1.46, 1.36) },
      { pos: new Vec3(-6.85, -8.56, -4.65), radii: new Vec2(1.56, 1.46) },
      { pos: new Vec3(-7.75, -9.12, -6.15), radii: new Vec2(1.64, 1.52) },
      { pos: new Vec3(-8.60, -9.65, -7.55), radii: new Vec2(1.68, 1.56) },
    ],
  });

  const rightLimb = buildDetailedPlayerLimb({
    side: 1,
    handOffset: new Vec3(0.72, -4.85, -4.55),
    handRotation: new Vec3(-1.32, -0.22, 0.14),
    handScale: new Vec3(0.84, 0.84, 0.84),
    fingerCurl: 1.08,
    hasWatch: true,
    materials: handMats,
    gauntletStations: [
      { pos: new Vec3(1.65, -5.25, -5.45), size: new Vec2(0.92, 1.02) },
      { pos: new Vec3(2.12, -5.58, -6.18), size: new Vec2(0.98, 1.06) },
      { pos: new Vec3(2.60, -5.92, -6.92), size: new Vec2(1.04, 1.10) },
    ],
    cuffStations: [
      { pos: new Vec3(2.55, -5.88, -6.85), radii: new Vec2(1.12, 1.12) },
      { pos: new Vec3(3.15, -6.32, -7.82), radii: new Vec2(1.22, 1.18) },
      { pos: new Vec3(3.75, -6.78, -8.78), radii: new Vec2(1.28, 1.24) },
    ],
    forearmStations: [
      { pos: new Vec3(3.70, -6.74, -8.70), radii: new Vec2(1.22, 1.16) },
      { pos: new Vec3(4.52, -7.35, -10.05), radii: new Vec2(1.34, 1.26) },
      { pos: new Vec3(5.38, -7.98, -11.45), radii: new Vec2(1.46, 1.36) },
      { pos: new Vec3(6.25, -8.62, -12.85), radii: new Vec2(1.56, 1.46) },
      { pos: new Vec3(7.08, -9.24, -14.20), radii: new Vec2(1.64, 1.52) },
      { pos: new Vec3(7.88, -9.82, -15.50), radii: new Vec2(1.68, 1.56) },
    ],
  });

  const pivots = {
    warhead: new Vec3(0, 1.5, 11.4),
    hands: new Vec3(0, 0, 0),
  };

  cachedRocketLauncherParts = {
    body: appendMesh(bodyParts),
    warhead: appendMesh(warheadParts),
    hands: appendMesh([
      { mesh: leftLimb, offset: new Vec3(0, 0, 0) },
      { mesh: rightLimb, offset: new Vec3(0, 0, 0) },
    ]),
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
      const fuelCap = scratchPt.setScalar(x - 24.5, y - 10.5).getMagnitude() <= 3.2;
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
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < S; x++) {
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
    }
  paintWeaponHandSubBands(canvas, cell, 12);
}

function paintChainsawChain(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const chisel = y < 8 || x < 6;
      const blood = chisel && ((x + y) % 5 < 2);
      const rivet = scratchPt.setScalar(x - 11, y - 16).getMagnitude() <= 2.6 || scratchPt.setScalar(x - 22, y - 16).getMagnitude() <= 2.6;
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
 * - `hands`: Shared high-detail first-person spec-ops gloved hands, carbon knuckle armor, wrist chronometer,
 *   ripstop cuffs, and sculpted muscular forearms gripping the top horizontal handlebar and left vertical handlebar.
 */
export function chainsawParts() {
  if (cachedChainsawParts)
    return cachedChainsawParts;

  const GRIP = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.02, 0.35);
  const handMats = weaponHandMaterials(ARSENAL_CELLS.grip);

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

  // High-detail left & right player hands and sculpted forearms gripping the left vertical handlebar & top crossbar
  const leftLimb = buildDetailedPlayerLimb({
    side: -1,
    handOffset: new Vec3(-2.15, 2.15, -1.25),
    handRotation: new Vec3(-1.32, 0.22, -0.18),
    handScale: new Vec3(0.76, 0.76, 0.76),
    fingerCurl: 1.08,
    hasWatch: false,
    materials: handMats,
    gauntletStations: [
      { pos: new Vec3(-3.12, 2.02, -1.85), size: new Vec2(0.84, 0.96) },
      { pos: new Vec3(-3.55, 1.85, -2.42), size: new Vec2(0.90, 0.98) },
      { pos: new Vec3(-3.95, 1.68, -2.98), size: new Vec2(0.96, 1.00) },
    ],
    cuffStations: [
      { pos: new Vec3(-3.90, 1.70, -2.92), radii: new Vec2(1.04, 1.04) },
      { pos: new Vec3(-4.38, 1.45, -3.62), radii: new Vec2(1.12, 1.10) },
      { pos: new Vec3(-4.88, 1.18, -4.32), radii: new Vec2(1.18, 1.14) },
    ],
    forearmStations: [
      { pos: new Vec3(-4.82, 1.22, -4.25), radii: new Vec2(1.12, 1.08) },
      { pos: new Vec3(-5.55, 0.76, -5.32), radii: new Vec2(1.24, 1.18) },
      { pos: new Vec3(-6.32, 0.24, -6.48), radii: new Vec2(1.36, 1.28) },
      { pos: new Vec3(-7.12, -0.32, -7.68), radii: new Vec2(1.46, 1.36) },
      { pos: new Vec3(-7.88, -0.88, -8.82), radii: new Vec2(1.54, 1.42) },
      { pos: new Vec3(-8.62, -1.42, -9.92), radii: new Vec2(1.58, 1.46) },
    ],
  });

  const rightLimb = buildDetailedPlayerLimb({
    side: 1,
    handOffset: new Vec3(2.45, 4.35, -1.25),
    handRotation: new Vec3(-0.32, -0.18, 1.42),
    handScale: new Vec3(0.76, 0.76, 0.76),
    fingerCurl: 1.08,
    hasWatch: true,
    materials: handMats,
    gauntletStations: [
      { pos: new Vec3(2.85, 4.52, -1.95), size: new Vec2(0.96, 0.82) },
      { pos: new Vec3(3.22, 4.18, -2.58), size: new Vec2(1.00, 0.88) },
      { pos: new Vec3(3.58, 3.82, -3.22), size: new Vec2(1.04, 0.94) },
    ],
    cuffStations: [
      { pos: new Vec3(3.54, 3.86, -3.15), radii: new Vec2(1.08, 1.00) },
      { pos: new Vec3(3.98, 3.32, -3.95), radii: new Vec2(1.16, 1.08) },
      { pos: new Vec3(4.42, 2.75, -4.75), radii: new Vec2(1.22, 1.14) },
    ],
    forearmStations: [
      { pos: new Vec3(4.38, 2.80, -4.68), radii: new Vec2(1.14, 1.06) },
      { pos: new Vec3(5.05, 1.92, -5.92), radii: new Vec2(1.26, 1.18) },
      { pos: new Vec3(5.75, 0.98, -7.22), radii: new Vec2(1.38, 1.28) },
      { pos: new Vec3(6.48, -0.02, -8.55), radii: new Vec2(1.48, 1.38) },
      { pos: new Vec3(7.18, -1.02, -9.85), radii: new Vec2(1.56, 1.44) },
      { pos: new Vec3(7.85, -1.98, -11.10), radii: new Vec2(1.60, 1.48) },
    ],
  });

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
    hands: appendMesh([
      { mesh: leftLimb, offset: new Vec3(0, 0, 0) },
      { mesh: rightLimb, offset: new Vec3(0, 0, 0) },
    ]),
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
  const centerZ = -2.5;
  const raw = appendMesh([
    { mesh: parts.body, offset: new Vec3(0, 0, centerZ) },
    { mesh: parts.topChain, offset: new Vec3(parts.pivots.topChain.x, parts.pivots.topChain.y, parts.pivots.topChain.z + centerZ) },
    { mesh: parts.bottomChain, offset: new Vec3(parts.pivots.bottomChain.x, parts.pivots.bottomChain.y, parts.pivots.bottomChain.z + centerZ) },
    { mesh: parts.noseChain, offset: new Vec3(parts.pivots.noseChain.x, parts.pivots.noseChain.y, parts.pivots.noseChain.z + centerZ) },
  ]);
  const scale = 1.35;
  const liftY = 12.5;
  const vertices = new Float32Array(raw.vertices.length);
  for (let i = 0; i < raw.vertices.length; i += 3) {
    vertices[i] = raw.vertices[i] * scale;
    vertices[i + 1] = raw.vertices[i + 1] * scale + liftY;
    vertices[i + 2] = raw.vertices[i + 2] * scale;
  }
  cachedChainsawMesh = { vertices, normals: raw.normals, uvs: raw.uvs };
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
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi);
      // Warm ribbed dark walnut wood (stock wrist & pump forend)
      const groove = y % 3 === 0;
      const ridge = y % 3 === 1;
      const grain = Math.sin(y * 0.55 + Math.sin(x * 0.35) * 2.0) * 14;
      const shade = (groove ? -32 : ridge ? 16 : 0) + cyl * 26;
      const r = Utils.clamp(112 + grain + shade, 36, 192);
      const g = Utils.clamp(64 + (grain + shade) * 0.58, 20, 118);
      const b = Utils.clamp(30 + (grain + shade) * 0.32, 10, 62);
      canvas.put(cell, x, y, r, g, b);
    }
  paintWeaponHandSubBands(canvas, cell, 12);
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
 * - `arm`: shared high-detail spec-ops left hand (carbon-fiber knuckle shield, Clarino suede palm, articulated thumb & fingers),
 *   ripstop olive wrist cuff, and 6-station sculpted muscular forearm cradling the walnut pump forend during reload
 * - `shell`: 3D crimson-and-brass 12-gauge shotgun hull that ejects out of the right-side port during the pump stroke
 */
export function shotgunParts() {
  if (cachedShotgunParts)
    return cachedShotgunParts;

  const WALNUT = (raw) => remapCellSub(raw, ARSENAL_CELLS.grip, 0.02, 0.35);
  const BRASS = (raw) => remapCellSub(raw, ARSENAL_CELLS.muzzle, 0.02, 0.19);
  const HULL = (raw) => remapCellSub(raw, ARSENAL_CELLS.muzzle, 0.24, 0.44);
  const handMats = weaponHandMaterials(ARSENAL_CELLS.grip);

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

  // Shared high-detail player left hand, ripstop olive wrist cuff & 6-station sculpted muscular forearm
  // Cradling the underside of the walnut pump forend (palm facing up +Y, thumb wrapping left -X, fingers curling up right +X)
  const armMesh = buildDetailedPlayerLimb({
    side: -1,
    handOffset: new Vec3(-0.15, -0.58, 2.15),
    handRotation: new Vec3(0.08, -0.06, -1.18),
    handScale: new Vec3(1.06, 1.06, 1.06),
    fingerCurl: 1.05,
    thumbSpread: 0.22,
    hasWatch: false,
    materials: handMats,
    gauntletStations: [
      { pos: new Vec3(-1.35, -1.28, -1.85), size: new Vec2(1.02, 0.96) },
      { pos: new Vec3(-1.72, -1.62, -2.65), size: new Vec2(1.10, 1.02) },
      { pos: new Vec3(-2.08, -1.94, -3.45), size: new Vec2(1.16, 1.08) },
    ],
    cuffStations: [
      { pos: new Vec3(-2.05, -1.90, -3.38), radii: new Vec2(1.22, 1.12) },
      { pos: new Vec3(-2.42, -2.22, -4.25), radii: new Vec2(1.32, 1.22) },
      { pos: new Vec3(-2.78, -2.54, -5.08), radii: new Vec2(1.38, 1.28) },
      { pos: new Vec3(-2.84, -2.58, -5.18), radii: new Vec2(1.26, 1.16) },
    ],
    forearmStations: [
      { pos: new Vec3(-2.76, -2.52, -5.05), radii: new Vec2(1.22, 1.12) },
      { pos: new Vec3(-3.32, -2.98, -6.55), radii: new Vec2(1.36, 1.24) },
      { pos: new Vec3(-3.94, -3.48, -8.25), radii: new Vec2(1.48, 1.36) },
      { pos: new Vec3(-4.58, -4.02, -10.05), radii: new Vec2(1.58, 1.44) },
      { pos: new Vec3(-5.18, -4.52, -11.85), radii: new Vec2(1.66, 1.52) },
      { pos: new Vec3(-5.75, -4.98, -13.45), radii: new Vec2(1.70, 1.56) },
    ],
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
    arm: armMesh,
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
      if (y < 16) {
        // Contoured charcoal-olive G10 / Kraton composite grip scales with diamond checkering & finger-groove channels
        const groove = y % 4 === 0 ? -15 : y % 4 === 2 ? 6 : 0;
        const diamond = ((x + y) & 1) === 0 ? 7 : -6;
        const weave = Math.sin(x * 0.85) * Math.cos(y * 0.85) * 5;
        const base = Utils.clamp(36 + cyl * 30 + groove + diamond + weave, 14, 94);
        canvas.put(cell, x, y, base * 0.92, base * 1.02, base * 0.96);
      } else if (y < 25) {
        // Matte Parkerized Titanium-Nitride (TiN) dark gunmetal M9 crossguard, barrel ring & octagonal pommel
        const spec = Math.pow(cyl, 2.6) * 48;
        const seam = y === 16 || y === 24 ? -16 : 0;
        const grain = ((x * 3 + y) & 3) - 1.5;
        const v = Utils.clamp(62 + cyl * 38 + spec + seam + grain * 2.5, 32, 168);
        canvas.put(cell, x, y, v * 0.93, v * 0.98, v * 1.08);
      } else {
        // Machined brushed stainless Torx bolts, lanyard bail & tungsten-carbide breaker tip
        const star = Math.abs(x - S * 0.5) < 4 && (y === 28 || y === 29) ? -42 : 0;
        const spec = Math.pow(cyl, 1.8) * 64;
        const v = Utils.clamp(132 + cyl * 52 + spec + star, 54, 242);
        canvas.put(cell, x, y, v * 0.96, v * 0.99, v * 1.05);
      }
    }
}

function paintKnifeBlade(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const glint = Math.sin((x / S) * Trigo.pi) * 42;
      const spec = Math.pow(Math.sin((x / S) * Trigo.pi), 3.2) * 34;
      if (y < 7) {
        // CNC-milled double-row sawback spine teeth with bright metallic edge bevels and dark gullets
        const tooth = (x & 3) < 2 ? 28 : -24;
        const v = Utils.clamp(158 + glint + tooth, 88, 238);
        canvas.put(cell, x, y, v * 0.95, v * 0.99, v * 1.06);
      } else if (y < 15) {
        // Darkened Ti-Al-N blood-fuller trough & laser-etched tactical spec-ops markings
        const border = y === 7 || y === 14;
        const stencil = y >= 10 && y <= 12 && x >= 7 && x <= S - 8 && ((x * 7 + y * 3) & 3) === 0;
        if (stencil)
          canvas.put(cell, x, y, 168, 178, 192);
        else if (border)
          canvas.put(cell, x, y, 86, 94, 108);
        else {
          const trough = Math.sin(((y - 7) / 7) * Trigo.pi) * -18;
          const v = Utils.clamp(54 + glint * 0.45 + trough, 28, 92);
          canvas.put(cell, x, y, v * 0.92, v * 0.98, v * 1.12);
        }
      } else if (y < 23) {
        // Satin bead-blasted 440C / S35VN high-carbon steel blade flat & clip-point swedge
        const brushed = ((x * 7 + y * 2) & 3) * 3.5 - 5;
        const plunge = x === 4 || x === S - 5 ? -18 : 0;
        const v = Utils.clamp(146 + glint + spec * 0.5 + brushed + plunge, 94, 224);
        canvas.put(cell, x, y, v * 0.94, v * 0.99, v * 1.06);
      } else {
        // Mirror-honed hollow-ground primary bevel & razor cutting edge apex
        const edgeApex = y >= S - 3 ? 28 : 0;
        const grindLine = y === 23 ? -16 : 0;
        const v = Utils.clamp(196 + glint + spec + edgeApex + grindLine, 148, 254);
        canvas.put(cell, x, y, v * 0.97, v, v * 1.04);
      }
    }
}

function paintKnifeGlove(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi);
      if (y < 10) {
        // Molded Twill Carbon-Fiber / Kevlar hard-shell dorsal knuckle armor plate
        const weave = ((x + y) & 3) < 2 ? 12 : -10;
        const rim = y === 0 || y === 9 || x < 2 || x >= S - 2 ? 18 : 0;
        const spec = Math.pow(cyl, 2.8) * 52;
        const v = Utils.clamp(44 + cyl * 28 + spec + weave + rim, 20, 148);
        canvas.put(cell, x, y, v * 0.94, v * 0.98, v * 1.06);
      } else if (y < 22) {
        // Half-Life 2 / Spec-Ops tactical glove dorsal chassis (dark slate Nomex weave + saddle-leather panels)
        const stitch = y === 10 || y === 21 || (x % 8 === 0 && (y & 1) === 0) ? -16 : 0;
        const pleat = y === 14 || y === 17 ? -14 : 0;
        const hex = ((x * 3 + y * 5) & 3) === 0 ? 5 : -3;
        const spec = Math.pow(cyl, 2.2) * 32;
        const r = Utils.clamp(62 + cyl * 36 + spec + stitch + pleat + hex, 26, 138);
        const g = Utils.clamp(58 + cyl * 32 + spec * 0.9 + stitch + pleat + hex, 24, 128);
        const b = Utils.clamp(54 + cyl * 28 + spec * 0.8 + stitch + pleat + hex, 22, 118);
        canvas.put(cell, x, y, r, g, b);
      } else {
        // Perforated synthetic Clarino suede & warm tactical leather palm/fingertip grip pads
        const pore = (x & 1) === 0 && (y & 1) === 0 ? -9 : 4;
        const crease = y === 25 || y === 29 ? -14 : 0;
        const spec = Math.pow(cyl, 2.0) * 26;
        const r = Utils.clamp(84 + cyl * 38 + spec + pore + crease, 36, 156);
        const g = Utils.clamp(56 + cyl * 26 + spec * 0.75 + pore + crease * 0.8, 24, 112);
        const b = Utils.clamp(38 + cyl * 18 + spec * 0.5 + pore + crease * 0.6, 16, 82);
        canvas.put(cell, x, y, r, g, b);
      }
    }
}

function paintKnifeArm(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi);
      if (y < 8) {
        // Tactical digital field chronometer / HEV wrist watch face (sapphire glass + glowing amber-teal readout)
        const bezel = y === 0 || y === 7 || x < 4 || x >= S - 4;
        const tick = (y === 2 || y === 5) && x >= 7 && x <= S - 8 && (x % 3 !== 0);
        const amber = y === 4 && x >= 9 && x <= 15;
        if (bezel)
          canvas.put(cell, x, y, 48, 54, 62);
        else if (amber)
          canvas.put(cell, x, y, 244, 178, 56);
        else if (tick)
          canvas.put(cell, x, y, 76, 228, 196);
        else
          canvas.put(cell, x, y, 16, 28, 34);
      } else if (y < 17) {
        // Heavy olive-drab & charcoal ripstop tactical field-jacket cuff & ballistic nylon wrist strap
        const ripstop = (x & 3) === 0 || (y & 3) === 0 ? -7 : 3;
        const seam = y === 8 || y === 12 || y === 16 ? -16 : 0;
        const r = Utils.clamp(62 + cyl * 34 + ripstop + seam, 26, 116);
        const g = Utils.clamp(76 + cyl * 40 + ripstop + seam, 34, 136);
        const b = Utils.clamp(48 + cyl * 24 + ripstop + seam, 20, 86);
        canvas.put(cell, x, y, r, g, b);
      } else {
        // Anatomical muscular forearm skin with brachioradialis/extensor tendon relief & subtle vascular shading
        const tendon = Math.sin((x / S) * Trigo.pi * 3.0) * 14;
        const vein = Math.abs(x - (11 + ((y - 17) >> 1))) <= 1 ? -8 : 0;
        const pore = ((x * 5 + y * 3) & 3) === 0 ? -4 : 2;
        const r = Utils.clamp(168 + cyl * 54 + tendon + vein * 0.5 + pore, 106, 238);
        const g = Utils.clamp(120 + cyl * 44 + tendon * 0.75 + vein * 0.3 + pore, 72, 186);
        const b = Utils.clamp(90 + cyl * 34 + tendon * 0.55 + pore, 50, 148);
        canvas.put(cell, x, y, r, g, b);
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
  paintKnifeGlove(canvas, ARSENAL_CELLS.grip);
  paintKnifeArm(canvas, ARSENAL_CELLS.muzzle);
  cachedKnifeAtlas = { width: canvas.width, height: canvas.height, data: canvas.data };
  return cachedKnifeAtlas;
}

/**
 * Returns the high-detail Half-Life 2 / CS:Source style articulated 3D tactical combat knife and gloved hand:
 * - `blade`: M9 / KM2000 tactical clip-point Bowie bayonet featuring a multi-station lofted satin blade,
 *   hollow-ground curved razor belly, honed clip-point swedge bevel, dual recessed dark TiN blood fullers,
 *   choil finger notch & ricasso bolster, 10-tooth canted sawback spine, thumb jimping ramp, M9 crossguard
 *   with hollow barrel-mount ring, 9-station contoured octagonal G10 handle with 6 Torx bolts, and octagonal
 *   skull-crusher pommel with lanyard bail & tungsten-carbide glass-breaker spike.
 * - `arm`: First-person spec-ops armored glove with molded carbon-fiber dorsal knuckle shield, 4 individual
 *   carbon knuckle domes, 4x3-phalange articulated curled fingers with Clarino suede pads, 3-phalange thumb
 *   braced on the spine jimping ramp, ballistic wrist strap, 3D digital wrist chronometer watch, ripstop
 *   olive field-jacket cuff, and a water-tight 6-station sculpted muscular forearm.
 */
export function knifeParts() {
  if (cachedKnifeParts)
    return cachedKnifeParts;

  const HANDLE = (m) => remapCellSub(m, ARSENAL_CELLS.body, 0.03, 0.46);
  const GUARD = (m) => remapCellSub(m, ARSENAL_CELLS.body, 0.53, 0.75);
  const BOLT = (m) => remapCellSub(m, ARSENAL_CELLS.body, 0.80, 0.97);

  const SAWBACK = (m) => remapCellSub(m, ARSENAL_CELLS.barrel, 0.03, 0.19);
  const FULLER = (m) => remapCellSub(m, ARSENAL_CELLS.barrel, 0.24, 0.44);
  const BLADE_FLAT = (m) => remapCellSub(m, ARSENAL_CELLS.barrel, 0.49, 0.69);
  const RAZOR_EDGE = (m) => remapCellSub(m, ARSENAL_CELLS.barrel, 0.74, 0.98);

  const CARBON_ARMOR = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.03, 0.28);
  const GLOVE_BODY = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.33, 0.66);
  const GLOVE_PALM = (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.71, 0.97);

  const WATCH_FACE = (m) => remapCellSub(m, ARSENAL_CELLS.muzzle, 0.03, 0.22);
  const SLEEVE_CUFF = (m) => remapCellSub(m, ARSENAL_CELLS.muzzle, 0.27, 0.50);
  const FOREARM_SKIN = (m) => remapCellSub(m, ARSENAL_CELLS.muzzle, 0.56, 0.97);

  // Helper to build a 6-vertex blade core cross-section ring at station z:
  // Counterclockwise in XY when viewed from +Z: right-lower grind ridge -> right-upper shoulder ->
  // spine-right -> spine-left -> left-upper shoulder -> left-lower grind ridge.
  const bladeCoreSection = (z, halfThick, yBottom, yTop, spineBevel = 0.05) => {
    const sx = Math.max(0.015, halfThick * 0.72);
    const sy = Math.max(yBottom + 0.04, yTop - spineBevel);
    return [
      new Vec3(halfThick, yBottom, z),
      new Vec3(halfThick, sy, z),
      new Vec3(sx, yTop, z),
      new Vec3(-sx, yTop, z),
      new Vec3(-halfThick, sy, z),
      new Vec3(-halfThick, yBottom, z),
    ];
  };

  // Helper to build a 6-vertex hollow-ground razor cutting bevel ring at station z:
  // Counterclockwise in XY: right-grind shoulder -> right-mid hollow -> razor apex right ->
  // razor apex left -> left-mid hollow -> left-grind shoulder.
  const razorBevelSection = (z, halfThick, yGrind, yEdge) => {
    const midY = yGrind * 0.45 + yEdge * 0.55;
    const midX = halfThick * 0.46;
    const apexX = Math.min(0.016, halfThick * 0.15);
    return [
      new Vec3(halfThick, yGrind, z),
      new Vec3(midX, midY, z),
      new Vec3(apexX, yEdge, z),
      new Vec3(-apexX, yEdge, z),
      new Vec3(-midX, midY, z),
      new Vec3(-halfThick, yGrind, z),
    ];
  };

  // 1. Multi-station lofted ergonomic octagonal G10 / Kraton handle (z = -4.92 .. +0.12)
  // Features palm swell in the center and 4 sculpted finger-groove valleys along -Y
  const handleStations = [
    { z: -4.92, cy: -0.08, hx: 0.64, hy: 0.92, ch: new Vec2(0.32, 0.28) },
    { z: -4.35, cy: -0.06, hx: 0.58, hy: 0.84, ch: new Vec2(0.34, 0.30) },
    { z: -3.72, cy: -0.10, hx: 0.63, hy: 0.88, ch: new Vec2(0.34, 0.30) },
    { z: -3.15, cy: -0.02, hx: 0.68, hy: 0.96, ch: new Vec2(0.32, 0.28) },
    { z: -2.45, cy: -0.08, hx: 0.70, hy: 0.92, ch: new Vec2(0.34, 0.30) },
    { z: -1.82, cy: -0.01, hx: 0.68, hy: 0.98, ch: new Vec2(0.32, 0.28) },
    { z: -1.22, cy: -0.09, hx: 0.64, hy: 0.88, ch: new Vec2(0.34, 0.30) },
    { z: -0.58, cy: -0.03, hx: 0.62, hy: 0.94, ch: new Vec2(0.32, 0.28) },
    { z: 0.12, cy: -0.02, hx: 0.66, hy: 0.96, ch: new Vec2(0.28, 0.26) },
  ];
  const handleRings = handleStations.map((s) =>
    octagonalRing(new Vec3(0, s.cy, s.z), new Vec2(s.hx, s.hy), s.ch)
  );

  // 2. Multi-station octagonal skull-crusher pommel & carbide glass-breaker spike (z = -6.12 .. -4.92)
  const pommelRings = [
    octagonalRing(new Vec3(0, -0.10, -5.58), new Vec2(0.46, 0.68), new Vec2(0.34, 0.34)),
    octagonalRing(new Vec3(0, -0.09, -5.22), new Vec2(0.72, 1.02), new Vec2(0.28, 0.28)),
    octagonalRing(new Vec3(0, -0.08, -4.90), new Vec2(0.68, 0.96), new Vec2(0.28, 0.28)),
  ];
  const spikeRings = [
    octagonalRing(new Vec3(0, -0.10, -6.14), new Vec2(0.05, 0.05), new Vec2(0.30, 0.30)),
    octagonalRing(new Vec3(0, -0.10, -5.78), new Vec2(0.24, 0.26), new Vec2(0.30, 0.30)),
    octagonalRing(new Vec3(0, -0.10, -5.56), new Vec2(0.34, 0.38), new Vec2(0.30, 0.30)),
  ];

  // 3. Multi-station aggressive swept tactical combat crossguard (z = 0.12 .. 0.76)
  const guardRings = [
    octagonalRing(new Vec3(0, -0.02, 0.12), new Vec2(0.76, 1.54), new Vec2(0.28, 0.20)),
    octagonalRing(new Vec3(0, 0.00, 0.44), new Vec2(0.86, 1.68), new Vec2(0.24, 0.16)),
    octagonalRing(new Vec3(0, 0.02, 0.76), new Vec2(0.72, 1.52), new Vec2(0.30, 0.22)),
  ];

  // 4. Forged satin blade flat & clip-point core lofted across 9 stations (z = 0.70 .. 11.45)
  const bladeCoreRings = [
    bladeCoreSection(0.70, 0.22, -0.36, 1.14, 0.04),
    bladeCoreSection(1.42, 0.21, -0.20, 1.14, 0.04),
    bladeCoreSection(2.80, 0.20, -0.22, 1.14, 0.05),
    bladeCoreSection(4.60, 0.20, -0.24, 1.14, 0.05),
    bladeCoreSection(6.55, 0.19, -0.22, 1.12, 0.05),
    bladeCoreSection(7.95, 0.16, -0.16, 0.86, 0.06),
    bladeCoreSection(9.25, 0.12, -0.06, 0.56, 0.05),
    bladeCoreSection(10.45, 0.07, 0.02, 0.28, 0.03),
    bladeCoreSection(11.45, 0.018, 0.08, 0.13, 0.01),
  ];

  // 5. Hollow-ground mirror-honed curved Bowie razor edge lofted across 9 stations (z = 1.38 .. 11.45)
  const razorBevelRings = [
    razorBevelSection(1.38, 0.20, -0.20, -0.82),
    razorBevelSection(2.20, 0.20, -0.21, -0.94),
    razorBevelSection(3.80, 0.20, -0.23, -0.98),
    razorBevelSection(5.40, 0.20, -0.24, -1.05),
    razorBevelSection(6.75, 0.19, -0.22, -1.02),
    razorBevelSection(8.05, 0.16, -0.16, -0.86),
    razorBevelSection(9.30, 0.12, -0.06, -0.56),
    razorBevelSection(10.48, 0.07, 0.02, -0.20),
    razorBevelSection(11.45, 0.016, 0.08, 0.06),
  ];

  // 6. Honed clip-point false-edge swedge bevel along the upper clip (z = 6.50 .. 11.45)
  const swedgeBevelRings = [
    bladeCoreSection(6.50, 0.17, 1.06, 1.16, 0.04),
    bladeCoreSection(7.95, 0.14, 0.80, 0.96, 0.06),
    bladeCoreSection(9.25, 0.10, 0.50, 0.66, 0.05),
    bladeCoreSection(10.45, 0.06, 0.24, 0.36, 0.03),
    bladeCoreSection(11.45, 0.015, 0.09, 0.14, 0.01),
  ];

  const bladeParts = [
    // Skull-crusher octagonal pommel cap & tungsten-carbide breaker spike
    { mesh: GUARD(loftRingsMesh(pommelRings, true)), offset: new Vec3(0, 0, 0) },
    { mesh: BOLT(loftRingsMesh(spikeRings, true)), offset: new Vec3(0, 0, 0) },
    // Lower pommel lanyard bail loop
    {
      mesh: BOLT(transformMesh(hollowCylinderMesh(new Vec2(0.16, 0.28), new Vec2(0.24, 8)), new Vec3(0, 0, 0), new Vec3(0, Trigo.halfpi, 0))),
      offset: new Vec3(0, -0.92, -5.38),
    },
    // Contoured octagonal G10 / Kraton handle scales
    { mesh: HANDLE(loftRingsMesh(handleRings, true)), offset: new Vec3(0, 0, 0) },
    // Tactical combat crossguard center block
    { mesh: GUARD(loftRingsMesh(guardRings, true)), offset: new Vec3(0, 0, 0) },
    // Upper forward-swept aggressive quillon spur
    {
      mesh: GUARD(prismMesh(new Vec3(1.12, 0.54, 0.62), new Vec3(0.58, 0.54, 0.38), new Vec2(0, 0.26))),
      offset: new Vec3(0, 1.66, 0.54),
    },
    // Lower forward-swept index-finger guard quillon hook
    {
      mesh: GUARD(prismMesh(new Vec3(0.62, 0.58, 0.42), new Vec3(1.18, 0.58, 0.62), new Vec2(0, -0.26))),
      offset: new Vec3(0, -1.68, 0.70),
    },
    // Ricasso bolster & curved finger-choil guard block ahead of crossguard (z = 0.72 .. 1.42)
    {
      mesh: BLADE_FLAT(prismMesh(new Vec3(0.46, 0.72, 0.68), new Vec3(0.44, 0.72, 0.52), new Vec2(0, -0.06))),
      offset: new Vec3(0, -0.52, 1.04),
    },
    // Main forged satin blade flat & clip-point core
    { mesh: BLADE_FLAT(loftRingsMesh(bladeCoreRings, true)), offset: new Vec3(0, 0, 0) },
    // Hollow-ground mirror-honed curved Bowie razor edge
    { mesh: RAZOR_EDGE(loftRingsMesh(razorBevelRings, true)), offset: new Vec3(0, 0, 0) },
    // Upper clip-point honed swedge bevel
    { mesh: RAZOR_EDGE(loftRingsMesh(swedgeBevelRings, true)), offset: new Vec3(0, 0, 0) },
    // Recessed dark TiN blood-fuller channels & central fuller rib on both blade flats (z = 1.78 .. 7.25)
    {
      mesh: FULLER(prismMesh(new Vec3(0.43, 0.48, 5.45), new Vec3(0.41, 0.48, 5.15), new Vec2(0, -0.08))),
      offset: new Vec3(0, 0.44, 4.48),
    },
    {
      mesh: BLADE_FLAT(boxMesh(new Vec3(0.445, 0.10, 5.05))),
      offset: new Vec3(0, 0.44, 4.45),
    },
  ];

  // 6 ergonomic G10 grip checkering ribs between the finger grooves
  for (const gz of [-4.28, -3.52, -2.76, -2.02, -1.28, -0.54])
    bladeParts.push({
      mesh: HANDLE(
        loftRingsMesh(
          [
            octagonalRing(new Vec3(0, -0.05, gz - 0.13), new Vec2(0.67, 0.94), new Vec2(0.32, 0.28)),
            octagonalRing(new Vec3(0, -0.05, gz), new Vec2(0.73, 0.99), new Vec2(0.30, 0.26)),
            octagonalRing(new Vec3(0, -0.05, gz + 0.13), new Vec2(0.67, 0.94), new Vec2(0.32, 0.28)),
          ],
          false
        )
      ),
      offset: new Vec3(0, 0, 0),
    });

  // 3 recessed stainless Torx screw bolts traversing the left and right G10 grip scales
  for (const bz of [-3.88, -2.42, -0.96])
    bladeParts.push({
      mesh: BOLT(transformMesh(cylinderMesh(new Vec2(0.22, 1.48), 8), new Vec3(0, -0.02, bz), new Vec3(0, Trigo.halfpi, 0))),
      offset: new Vec3(0, 0, 0),
    });

  // 5 fine anti-slip thumb jimping notches at the base of the blade spine (z = 0.78 .. 1.46)
  for (let j = 0; j < 5; j++)
    bladeParts.push({
      mesh: GUARD(boxMesh(new Vec3(0.46, 0.12, 0.08))),
      offset: new Vec3(0, 1.18, 0.80 + j * 0.15),
    });

  // 10 canted CNC double-row sawback spine teeth (z = 1.68 .. 6.36)
  for (let i = 0; i < 10; i++) {
    const sideShift = (i & 1) === 0 ? 0.04 : -0.04;
    bladeParts.push({
      mesh: SAWBACK(prismMesh(new Vec3(0.36, 0.30, 0.44), new Vec3(0.14, 0.30, 0.18), new Vec2(sideShift, -0.11))),
      offset: new Vec3(0, 1.28, 1.72 + i * 0.50),
    });
  }

  // ---- Shared High-Detail Spec-Ops Tactical Gloved Right Hand, Chronometer Watch & Sculpted Forearm ----
  const armMesh = buildDetailedPlayerLimb({
    side: 1,
    hasWatch: true,
    materials: {
      CARBON: CARBON_ARMOR,
      GLOVE: GLOVE_BODY,
      PALM: GLOVE_PALM,
      WATCH: WATCH_FACE,
      CUFF: SLEEVE_CUFF,
      ARM: FOREARM_SKIN,
    },
  });

  const pivots = {
    blade: new Vec3(0, 0, 0),
    arm: new Vec3(0, 0, 0),
  };

  const bladeMesh = appendMesh(bladeParts);
  cachedKnifeParts = {
    body: appendMesh([
      { mesh: bladeMesh, offset: new Vec3(0, 0, 0) },
      { mesh: armMesh, offset: new Vec3(0, 0, 0) },
    ]),
    blade: bladeMesh,
    arm: armMesh,
    pivots,
  };
  return cachedKnifeParts;
}

export function knifeMesh() {
  if (cachedKnifeMesh)
    return cachedKnifeMesh;
  const parts = knifeParts();
  const liftY = 7.5;
  cachedKnifeMesh = appendMesh([
    { mesh: parts.blade, offset: new Vec3(0, liftY, -2.2) },
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

// ---- Standalone Articulated First-Person Player Hands & Forearms Rig ----

let cachedPlayerHandsAtlas = null;
let cachedPlayerHandsParts = null;
let cachedPlayerHandsMesh = null;

function paintPlayerHandsArmorCell(canvas, cell) {
  const S = ARSENAL_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const cyl = Math.sin((x / S) * Trigo.pi);
      if (y < 16) {
        // 2x2 Twill Carbon-Fiber / Kevlar dorsal knuckle armor shell & titanium rivets
        const weave = ((x + y) & 3) < 2 ? 14 : -11;
        const rim = y === 0 || y === 15 || x < 2 || x >= S - 2 ? 20 : 0;
        const spec = Math.pow(cyl, 2.8) * 56;
        const v = Utils.clamp(46 + cyl * 30 + spec + weave + rim, 20, 156);
        canvas.put(cell, x, y, v * 0.94, v * 0.98, v * 1.07);
      } else {
        // Dark Parkerized Titanium-Nitride watch bezel, strap buckle & tactical hardware
        const spec = Math.pow(cyl, 2.4) * 52;
        const seam = y === 16 || y === 31 ? -16 : 0;
        const v = Utils.clamp(68 + cyl * 42 + spec + seam, 32, 178);
        canvas.put(cell, x, y, v * 0.94, v * 0.99, v * 1.06);
      }
    }
}

export function playerHandsAtlas() {
  if (cachedPlayerHandsAtlas)
    return cachedPlayerHandsAtlas;
  const canvas = createCanvas(ARSENAL_CELL, ARSENAL_FRAMES);
  paintPlayerHandsArmorCell(canvas, ARSENAL_CELLS.body);
  paintKnifeArm(canvas, ARSENAL_CELLS.barrel);
  paintKnifeGlove(canvas, ARSENAL_CELLS.grip);
  paintKnifeArm(canvas, ARSENAL_CELLS.muzzle);
  cachedPlayerHandsAtlas = { width: canvas.width, height: canvas.height, data: canvas.data };
  return cachedPlayerHandsAtlas;
}

function buildArticulatedHandSide(side, mats) {
  const s = side >= 0 ? 1 : -1;
  const { CARBON, BEZEL, GLOVE, PALM, WATCH, CUFF, ARM } = mats;

  // 1. High-Poly Smooth-Shaded Forearm + Pleated Cuff + Wrist Gauntlet + Chronometer Watch (centered around wrist pivot 0,0,0)
  const rawGauntletStations = [
    { pos: new Vec3(0.0, 0.02, 0.15), radii: new Vec2(0.96, 0.66) },
    { pos: new Vec3(0.16 * s, -0.18, -0.65), radii: new Vec2(1.00, 0.76) },
    { pos: new Vec3(0.36 * s, -0.40, -1.35), radii: new Vec2(1.04, 0.86) },
  ];
  const wristGauntletRings = buildCurvedTubeRings(
    subdivideStations(rawGauntletStations, 6),
    18,
    new Vec3(0, 1, 0),
    (theta, u, out) => gauntletContourProfile(theta, u, out)
  );

  const rawCuffStations = [
    { pos: new Vec3(0.34 * s, -0.38, -1.28), radii: new Vec2(1.10, 0.94) },
    { pos: new Vec3(0.60 * s, -0.66, -2.08), radii: new Vec2(1.18, 1.06) },
    { pos: new Vec3(0.88 * s, -0.94, -2.88), radii: new Vec2(1.24, 1.14) },
    { pos: new Vec3(0.92 * s, -0.98, -2.98), radii: new Vec2(1.14, 1.04) },
  ];
  const sleeveCuffRings = buildCurvedTubeRings(
    subdivideStations(rawCuffStations, 10),
    20,
    new Vec3(0, 1, 0),
    (theta, u, out) => cuffPleatProfile(theta, u, out)
  );

  const rawForearmStations = [
    { pos: new Vec3(0.86 * s, -0.92, -2.82), radii: new Vec2(1.10, 1.00) },
    { pos: new Vec3(1.26 * s, -1.30, -4.15), radii: new Vec2(1.22, 1.12) },
    { pos: new Vec3(1.72 * s, -1.76, -5.68), radii: new Vec2(1.34, 1.24) },
    { pos: new Vec3(2.24 * s, -2.26, -7.35), radii: new Vec2(1.44, 1.34) },
    { pos: new Vec3(2.74 * s, -2.76, -8.95), radii: new Vec2(1.50, 1.40) },
    { pos: new Vec3(3.20 * s, -3.20, -10.35), radii: new Vec2(1.54, 1.44) },
  ];
  const fineForearmStations = subdivideStations(rawForearmStations, 14);
  const forearmRings = buildCurvedTubeRings(
    fineForearmStations,
    20,
    new Vec3(0, 1, 0),
    (theta, u, out) => forearmAnatomyProfile(theta, u, s, out)
  );

  // Subtle 3D dorsal superficial vein running along the sculpted forearm
  const veinStations = [];
  for (let i = 1; i < fineForearmStations.length - 1; i++) {
    const v = i / (fineForearmStations.length - 1);
    const st = fineForearmStations[i];
    const wave = Math.sin(v * Trigo.pi * 2.2) * 0.08 * s;
    const vr = 0.055 * Math.sin(v * Trigo.pi);
    veinStations.push({
      pos: new Vec3(st.pos.x - st.radii.x * 0.18 * s + wave, st.pos.y + st.radii.y * 0.94, st.pos.z + 0.06),
      radii: new Vec2(vr * 1.25, vr * 0.85),
    });
  }
  const forearmVeinRings = buildCurvedTubeRings(veinStations, 8, new Vec3(0, 1, 0));

  const forearmParts = [
    { mesh: GLOVE(loftRingsMesh(wristGauntletRings, true, true)), offset: new Vec3(0, 0, 0) },
    { mesh: CUFF(loftRingsMesh(sleeveCuffRings, true, true)), offset: new Vec3(0, 0, 0) },
    { mesh: ARM(loftRingsMesh(forearmRings, true, true)), offset: new Vec3(0, 0, 0) },
    { mesh: ARM(loftRingsMesh(forearmVeinRings, true, true)), offset: new Vec3(0, 0, 0) },
  ];

  if (s > 0) {
    // High-Detail Right-Wrist 3D Tactical Digital Chronometer Watch seated on dorsal (+Y) wrist
    const watchStrapRings = buildCurvedTubeRings(
      subdivideStations(
        [
          { pos: new Vec3(0.20 * s, -0.22, -0.75), radii: new Vec2(1.05, 0.82) },
          { pos: new Vec3(0.30 * s, -0.34, -1.18), radii: new Vec2(1.08, 0.88) },
        ],
        4
      ),
      18,
      new Vec3(0, 1, 0),
      (theta, u, out) => gauntletContourProfile(theta, u, out)
    );
    const watchCenter = new Vec3(0.24 * s, 0.56, -0.92);
    const watchEuler = new Vec3(1.32, 0.18 * s, -0.12 * s);
    forearmParts.push(
      { mesh: CUFF(loftRingsMesh(watchStrapRings, true, true)), offset: new Vec3(0, 0, 0) },
      {
        mesh: BEZEL(transformMesh(cylinderMesh(new Vec2(0.58, 0.28), 20), watchCenter, watchEuler)),
        offset: new Vec3(0, 0, 0),
      },
      {
        mesh: BEZEL(transformMesh(hollowCylinderMesh(new Vec2(0.45, 0.59), new Vec2(0.14, 20)), watchCenter, watchEuler)),
        offset: new Vec3(0, 0, 0),
      },
      {
        mesh: WATCH(
          transformMesh(
            cylinderMesh(new Vec2(0.45, 0.33), 20),
            new Vec3(0.24 * s, 0.58, -0.91),
            watchEuler
          )
        ),
        offset: new Vec3(0, 0, 0),
      },
      {
        mesh: BEZEL(transformMesh(boxMesh(new Vec3(0.62, 0.20, 1.32)), watchCenter, watchEuler)),
        offset: new Vec3(0, 0, 0),
      },
      {
        mesh: BEZEL(
          transformMesh(
            cylinderMesh(new Vec2(0.11, 0.24), 10),
            new Vec3(0.56 * s, 0.56, -0.92),
            new Vec3(watchEuler.x, watchEuler.y, watchEuler.z + Trigo.halfpi)
          )
        ),
        offset: new Vec3(0, 0, 0),
      }
    );
  } else {
    // Left-wrist ballistic nylon buckle strap with smooth-shaded contour
    const leftStrapRings = buildCurvedTubeRings(
      subdivideStations(
        [
          { pos: new Vec3(0.20 * s, -0.22, -0.78), radii: new Vec2(1.04, 0.82) },
          { pos: new Vec3(0.28 * s, -0.32, -1.12), radii: new Vec2(1.07, 0.86) },
        ],
        4
      ),
      18,
      new Vec3(0, 1, 0),
      (theta, u, out) => gauntletContourProfile(theta, u, out)
    );
    forearmParts.push({
      mesh: BEZEL(loftRingsMesh(leftStrapRings, true, true)),
      offset: new Vec3(0, 0, 0),
    });
  }

  // 2. High-Poly 9-Station x 18-Segment Broad Open Metacarpal Hand Chassis + Dorsal (+Y) Carbon Plate + Palmar (-Y) Clarino Pads + 4 Distal MCP Domes
  const rawHandStations = [
    { pos: new Vec3(0.0, 0.04, -0.25), radii: new Vec2(0.96, 0.62) },
    { pos: new Vec3(0.02 * s, 0.06, 0.85), radii: new Vec2(1.16, 0.64) },
    { pos: new Vec3(0.04 * s, 0.06, 2.05), radii: new Vec2(1.28, 0.60) },
    { pos: new Vec3(0.02 * s, 0.04, 3.22), radii: new Vec2(1.30, 0.52) },
  ];
  const dorsalHandRings = buildCurvedTubeRings(
    subdivideStations(rawHandStations, 9),
    18,
    new Vec3(0, 1, 0),
    (theta, u, out) => {
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      // With tangent=(0,0,1) and up=(0,1,0): right=(-1,0,0), so cosT*s > 0 is inner radial (-X*s) thumb side, sinT > 0 is dorsal (+Y) top
      const radialSide = cosT * s;
      const dorsalArch = sinT > 0 ? 1.0 + 0.08 * Math.sin(u * Trigo.pi) * (1.0 - 0.16 * radialSide) : 1.0;
      const tendonFlutes = sinT > 0.25 ? 0.03 * Math.cos(theta * 4) * Math.sin(u * Trigo.pi) : 0.0;
      const palmarHollow =
        sinT < -0.15
          ? -0.09 * Math.sin(u * Trigo.pi) * Math.max(0, 1.0 - 1.5 * cosT * cosT) +
            0.08 * Math.max(0, radialSide) * (1.0 - u * 0.45) +
            0.06 * Math.max(0, -radialSide)
          : 0.0;
      const knuckleSpread = 1.0 + 0.08 * Math.pow(u, 1.4);
      out.setScalar(knuckleSpread, dorsalArch + tendonFlutes + palmarHollow);
    }
  );

  // Molded twill carbon-fiber dorsal armor shield on the top (+Y) back of the hand
  const rawCarbonStations = [
    { pos: new Vec3(0.02 * s, 0.44, 0.25), radii: new Vec2(0.84, 0.18) },
    { pos: new Vec3(0.04 * s, 0.48, 1.48), radii: new Vec2(1.02, 0.22) },
    { pos: new Vec3(0.02 * s, 0.42, 2.68), radii: new Vec2(1.06, 0.18) },
  ];
  const carbonPlateRings = buildCurvedTubeRings(
    subdivideStations(rawCarbonStations, 7),
    16,
    new Vec3(0, 1, 0),
    (theta, u, out) => {
      const ridge = 1.0 + 0.04 * Math.cos(theta * 4);
      const arch = 1.0 + 0.10 * Math.sin(u * Trigo.pi);
      out.setScalar(arch * ridge, ridge);
    }
  );

  // Dual-zone Clarino synthetic-suede palm cushions on the bottom (-Y) palmar surface
  const rawPalmHeelStations = [
    { pos: new Vec3(0.06 * s, -0.40, 0.05), radii: new Vec2(0.80, 0.22) },
    { pos: new Vec3(0.08 * s, -0.44, 1.15), radii: new Vec2(0.94, 0.25) },
    { pos: new Vec3(0.06 * s, -0.40, 2.05), radii: new Vec2(0.90, 0.20) },
  ];
  const palmHeelRings = buildCurvedTubeRings(
    subdivideStations(rawPalmHeelStations, 6),
    14,
    new Vec3(0, 1, 0),
    (_theta, u, out) => {
      const swell = 1.0 + 0.10 * Math.sin(u * Trigo.pi);
      out.setScalar(swell, swell);
    }
  );

  const rawPalmCallousStations = [
    { pos: new Vec3(0.02 * s, -0.34, 2.15), radii: new Vec2(0.98, 0.18) },
    { pos: new Vec3(0.02 * s, -0.36, 2.68), radii: new Vec2(1.06, 0.22) },
    { pos: new Vec3(0.02 * s, -0.30, 3.12), radii: new Vec2(1.02, 0.17) },
  ];
  const palmCallousRings = buildCurvedTubeRings(
    subdivideStations(rawPalmCallousStations, 5),
    14,
    new Vec3(0, 1, 0)
  );

  const handParts = [
    { mesh: GLOVE(loftRingsMesh(dorsalHandRings, true, true)), offset: new Vec3(0, 0, 0) },
    { mesh: CARBON(loftRingsMesh(carbonPlateRings, true, true)), offset: new Vec3(0, 0, 0) },
    { mesh: PALM(loftRingsMesh(palmHeelRings, true, true)), offset: new Vec3(0, 0, 0) },
    { mesh: PALM(loftRingsMesh(palmCallousRings, true, true)), offset: new Vec3(0, 0, 0) },
  ];

  // 4 Distal MCP Knuckle specs spread across X from inner radial (Index = -0.96*s) to outer ulnar (Pinky = +0.96*s)
  const fingerSpecs = [
    { x: -0.96 * s, y: 0.06, z: 3.18, rScale: 0.96, splayX: -0.12 * s, len: 3.25 },
    { x: -0.32 * s, y: 0.10, z: 3.34, rScale: 1.04, splayX: -0.02 * s, len: 3.55 },
    { x: 0.34 * s, y: 0.06, z: 3.16, rScale: 0.98, splayX: 0.05 * s, len: 3.30 },
    { x: 0.96 * s, y: -0.02, z: 2.86, rScale: 0.86, splayX: 0.14 * s, len: 2.68 },
  ];

  for (const f of fingerSpecs) {
    const kR = f.rScale;
    const knuckleDomeRings = buildCurvedTubeRings(
      subdivideStations(
        [
          { pos: new Vec3(f.x, f.y + 0.24 * kR, f.z - 0.32 * kR), radii: new Vec2(0.24 * kR, 0.18 * kR) },
          { pos: new Vec3(f.x, f.y + 0.34 * kR, f.z), radii: new Vec2(0.35 * kR, 0.26 * kR) },
          { pos: new Vec3(f.x, f.y + 0.24 * kR, f.z + 0.32 * kR), radii: new Vec2(0.24 * kR, 0.18 * kR) },
        ],
        5
      ),
      14,
      new Vec3(0, 1, 0)
    );
    handParts.push({
      mesh: CARBON(loftRingsMesh(knuckleDomeRings, true, true)),
      offset: new Vec3(0, 0, 0),
    });
  }

  // 3. High-Poly Smooth-Shaded Open 3-Phalange Thumb rooted on the inner radial (-X*s) thenar base
  const thumbPivot = new Vec3(-0.92 * s, -0.08, 0.92);
  const rawThumbStations = [
    { pos: new Vec3(0.28 * s, -0.04, -0.45), radii: new Vec2(0.54, 0.50) },
    { pos: new Vec3(0.0, 0.0, 0.0), radii: new Vec2(0.48, 0.45) },
    { pos: new Vec3(-0.52 * s, -0.04, 0.82), radii: new Vec2(0.43, 0.40) },
    { pos: new Vec3(-0.92 * s, -0.06, 1.58), radii: new Vec2(0.41, 0.39) },
    { pos: new Vec3(-1.18 * s, -0.04, 2.22), radii: new Vec2(0.36, 0.34) },
    { pos: new Vec3(-1.30 * s, -0.02, 2.68), radii: new Vec2(0.22, 0.20) },
  ];
  const thumbStations = subdivideStations(rawThumbStations, 11);
  const thumbAllRings = buildCurvedTubeRings(
    thumbStations,
    16,
    new Vec3(0, 1, 0),
    (theta, u, out) => fingerPhalanxProfile(theta, u, out)
  );
  const thumbArmorStations = [2, 3, 4, 5].map((idx) => {
    const st = thumbStations[idx];
    return {
      pos: new Vec3(st.pos.x, st.pos.y + 0.18, st.pos.z),
      radii: new Vec2(st.radii.x * 0.64, st.radii.y * 0.34),
    };
  });
  const thumbArmorRings = buildCurvedTubeRings(thumbArmorStations, 12, new Vec3(0, 1, 0));

  const thumbPadStations = [6, 7, 8, 9].map((idx) => {
    const st = thumbStations[idx];
    return {
      pos: new Vec3(st.pos.x, st.pos.y - 0.15, st.pos.z),
      radii: new Vec2(st.radii.x * 0.72, st.radii.y * 0.36),
    };
  });
  const thumbPadRings = buildCurvedTubeRings(thumbPadStations, 12, new Vec3(0, 1, 0));

  const thumbMesh = appendMesh([
    { mesh: GLOVE(loftRingsMesh(thumbAllRings, true, true)), offset: new Vec3(0, 0, 0) },
    { mesh: CARBON(loftRingsMesh(thumbArmorRings, true, true)), offset: new Vec3(0, 0, 0) },
    { mesh: PALM(loftRingsMesh(thumbPadRings, true, true)), offset: new Vec3(0, 0, 0) },
  ]);

  // Helper to build a high-poly 12-station x 16-segment open 3-phalange finger extending forward along +Z from its MCP knuckle dome
  const buildFingerLocal = (f, pivot) => {
    const fw = 0.36 * f.rScale;
    const ft = 0.33 * f.rScale;
    const toLocal = (wx, wy, wz) => new Vec3(wx - pivot.x, wy - pivot.y, wz - pivot.z);
    const L = f.len;
    const sx = f.splayX;
    const rawFingerStations = [
      { pos: toLocal(f.x, f.y + 0.04, f.z - 0.34), radii: new Vec2(fw * 1.06, ft * 1.04) },
      { pos: toLocal(f.x, f.y + 0.02, f.z), radii: new Vec2(fw * 1.02, ft * 1.00) },
      { pos: toLocal(f.x + sx * 0.22, f.y - 0.02, f.z + L * 0.24), radii: new Vec2(fw * 0.99, ft * 0.98) },
      { pos: toLocal(f.x + sx * 0.45, f.y - 0.08, f.z + L * 0.46), radii: new Vec2(fw * 1.03, ft * 1.04) },
      { pos: toLocal(f.x + sx * 0.66, f.y - 0.16, f.z + L * 0.66), radii: new Vec2(fw * 0.96, ft * 0.95) },
      { pos: toLocal(f.x + sx * 0.82, f.y - 0.24, f.z + L * 0.80), radii: new Vec2(fw * 0.94, ft * 0.93) },
      { pos: toLocal(f.x + sx * 0.94, f.y - 0.31, f.z + L * 0.92), radii: new Vec2(fw * 0.82, ft * 0.80) },
      { pos: toLocal(f.x + sx, f.y - 0.35, f.z + L), radii: new Vec2(fw * 0.52, ft * 0.48) },
    ];
    const fineFingerStations = subdivideStations(rawFingerStations, 12);
    const rings = buildCurvedTubeRings(
      fineFingerStations,
      16,
      new Vec3(0, 1, 0),
      (theta, u, out) => fingerPhalanxProfile(theta, u, out)
    );
    const phalanxArmorStations = [2, 3, 4, 5, 6].map((idx) => {
      const st = fineFingerStations[idx];
      return {
        pos: new Vec3(st.pos.x, st.pos.y + 0.15 * f.rScale, st.pos.z),
        radii: new Vec2(st.radii.x * 0.68, st.radii.y * 0.34),
      };
    });
    const phalanxArmorRings = buildCurvedTubeRings(phalanxArmorStations, 12, new Vec3(0, 1, 0));
    const padStations = [3, 4, 5, 6, 7, 8, 9, 10].map((idx) => {
      const st = fineFingerStations[idx];
      return {
        pos: new Vec3(st.pos.x, st.pos.y - 0.14 * f.rScale, st.pos.z),
        radii: new Vec2(st.radii.x * 0.76, st.radii.y * 0.36),
      };
    });
    const padRings = buildCurvedTubeRings(padStations, 10, new Vec3(0, 1, 0));
    return [
      { mesh: GLOVE(loftRingsMesh(rings, true, true)), offset: new Vec3(0, 0, 0) },
      { mesh: CARBON(loftRingsMesh(phalanxArmorRings, true, true)), offset: new Vec3(0, 0, 0) },
      { mesh: PALM(loftRingsMesh(padRings, true, true)), offset: new Vec3(0, 0, 0) },
    ];
  };

  const indexPivot = new Vec3(fingerSpecs[0].x, fingerSpecs[0].y, fingerSpecs[0].z);
  const indexMesh = appendMesh(buildFingerLocal(fingerSpecs[0], indexPivot));

  const fingersPivot = new Vec3(fingerSpecs[2].x, fingerSpecs[2].y, fingerSpecs[2].z);
  const lowerFingerParts = [
    ...buildFingerLocal(fingerSpecs[1], fingersPivot),
    ...buildFingerLocal(fingerSpecs[2], fingersPivot),
    ...buildFingerLocal(fingerSpecs[3], fingersPivot),
  ];
  const fingersMesh = appendMesh(lowerFingerParts);

  return {
    forearm: appendMesh(forearmParts),
    hand: appendMesh(handParts),
    thumb: thumbMesh,
    index: indexMesh,
    fingers: fingersMesh,
    pivots: {
      hand: new Vec3(0, 0, 0),
      thumb: thumbPivot,
      index: indexPivot,
      fingers: fingersPivot,
    },
  };
}

/**
 * Returns the standalone articulated 3D First-Person Player Hands & Forearms rig:
 * - `leftForearm`, `leftHand`, `leftThumb`, `leftIndex`, `leftFingers`
 * - `rightForearm`, `rightHand`, `rightThumb`, `rightIndex`, `rightFingers`
 * Enables inspecting and posing the shared high-detail player hands across every weapon grip in BlendR and DoomR.
 */
export function playerHandsParts() {
  if (cachedPlayerHandsParts)
    return cachedPlayerHandsParts;

  const mats = {
    CARBON: (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.03, 0.28),
    BEZEL: (m) => remapCellSub(m, ARSENAL_CELLS.body, 0.53, 0.95),
    GLOVE: (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.33, 0.66),
    PALM: (m) => remapCellSub(m, ARSENAL_CELLS.grip, 0.71, 0.97),
    WATCH: (m) => remapCellSub(m, ARSENAL_CELLS.muzzle, 0.03, 0.22),
    CUFF: (m) => remapCellSub(m, ARSENAL_CELLS.muzzle, 0.27, 0.50),
    ARM: (m) => remapCellSub(m, ARSENAL_CELLS.muzzle, 0.56, 0.97),
  };

  const left = buildArticulatedHandSide(-1, mats);
  const right = buildArticulatedHandSide(1, mats);

  const pivots = {
    leftForearm: new Vec3(-4.2, -1.8, 1.5),
    leftHand: new Vec3().copy(left.pivots.hand),
    leftThumb: new Vec3().copy(left.pivots.thumb),
    leftIndex: new Vec3().copy(left.pivots.index),
    leftFingers: new Vec3().copy(left.pivots.fingers),
    rightForearm: new Vec3(4.2, -1.8, 1.5),
    rightHand: new Vec3().copy(right.pivots.hand),
    rightThumb: new Vec3().copy(right.pivots.thumb),
    rightIndex: new Vec3().copy(right.pivots.index),
    rightFingers: new Vec3().copy(right.pivots.fingers),
  };

  const leftArmCombined = appendMesh([
    { mesh: left.forearm, offset: new Vec3(0, 0, 0) },
    { mesh: left.hand, offset: pivots.leftHand },
    { mesh: left.thumb, offset: pivots.leftThumb },
    { mesh: left.index, offset: pivots.leftIndex },
    { mesh: left.fingers, offset: pivots.leftFingers },
  ]);

  const rightArmCombined = appendMesh([
    { mesh: right.forearm, offset: new Vec3(0, 0, 0) },
    { mesh: right.hand, offset: pivots.rightHand },
    { mesh: right.thumb, offset: pivots.rightThumb },
    { mesh: right.index, offset: pivots.rightIndex },
    { mesh: right.fingers, offset: pivots.rightFingers },
  ]);

  cachedPlayerHandsParts = {
    body: appendMesh([
      { mesh: leftArmCombined, offset: pivots.leftForearm },
      { mesh: rightArmCombined, offset: pivots.rightForearm },
    ]),
    leftArm: leftArmCombined,
    rightArm: rightArmCombined,
    leftForearm: left.forearm,
    leftHand: left.hand,
    leftThumb: left.thumb,
    leftIndex: left.index,
    leftFingers: left.fingers,
    rightForearm: right.forearm,
    rightHand: right.hand,
    rightThumb: right.thumb,
    rightIndex: right.index,
    rightFingers: right.fingers,
    pivots,
  };
  return cachedPlayerHandsParts;
}

export function playerHandsMesh() {
  if (cachedPlayerHandsMesh)
    return cachedPlayerHandsMesh;
  const parts = playerHandsParts();
  cachedPlayerHandsMesh = appendMesh([
    { mesh: parts.body, offset: new Vec3(0, 7.2, 0) },
  ]);
  return cachedPlayerHandsMesh;
}

/**
 * Computes the allocation-free 3D pose for the standalone First-Person Player Hands & Forearms rig
 * across all DoomR weapon grip configurations (`'idle'`, `'knife'`, `'chainsaw'`, `'shotgun'`, `'chaingun'`, `'rocket'`).
 */
export function playerHandsPose(
  { time = 0, bob = 0, moving = 0, grip = 'idle' } = {},
  target = null
) {
  const out = target ?? {
    offset: new Vec3(),
    rotation: new Vec3(),
    leftForearmPos: new Vec3(),
    leftForearmRot: new Vec3(),
    leftHandRot: new Vec3(),
    leftThumbRot: new Vec3(),
    leftIndexRot: new Vec3(),
    leftFingersRot: new Vec3(),
    rightForearmPos: new Vec3(),
    rightForearmRot: new Vec3(),
    rightHandRot: new Vec3(),
    rightThumbRot: new Vec3(),
    rightIndexRot: new Vec3(),
    rightFingersRot: new Vec3(),
  };

  const { pivots } = playerHandsParts();
  const breathe = Math.sin(time * 2.4) * 0.05;
  const flex = Math.sin(time * 3.2) * 0.10;
  const walkSway = Math.sin(bob) * 0.55 * moving;
  const walkBob = Math.abs(Math.cos(bob)) * 0.35 * moving;

  out.offset.setScalar(walkSway * 0.6, -5.2 - walkBob + breathe, 11.5);
  out.rotation.setScalar(-0.12, 0, -walkSway * 0.05);

  out.leftForearmPos.copy(pivots.leftForearm);
  out.rightForearmPos.copy(pivots.rightForearm);
  out.leftForearmRot.setScalar(0, 0, 0);
  out.rightForearmRot.setScalar(0, 0, 0);
  out.leftHandRot.setScalar(0, 0, 0);
  out.rightHandRot.setScalar(0, 0, 0);
  out.leftThumbRot.setScalar(0, 0, 0);
  out.rightThumbRot.setScalar(0, 0, 0);
  out.leftIndexRot.setScalar(0, 0, 0);
  out.rightIndexRot.setScalar(0, 0, 0);
  out.leftFingersRot.setScalar(0, 0, 0);
  out.rightFingersRot.setScalar(0, 0, 0);

  if (grip === 'knife') {
    // Right hand forward in saber-grip on M9 bayonet handle; left hand in open CQC parrying guard stance
    out.leftForearmPos.setScalar(-4.6, -3.2 + breathe * 1.5, -0.8);
    out.leftForearmRot.setScalar(-0.32, 0.28, -0.35);
    out.leftHandRot.setScalar(0.12, 0.15, -0.45);
    out.leftThumbRot.setScalar(0.10, -0.14, 0.12);
    out.leftIndexRot.setScalar(0.22, 0, 0);
    out.leftFingersRot.setScalar(0.32, 0, 0);

    out.rightForearmPos.setScalar(2.4, -1.1 + Math.sin(time * 4.0) * 0.18, 2.8);
    out.rightForearmRot.setScalar(-0.48, 0.18, -1.25);
    out.rightHandRot.setScalar(0.08, 0.05, 0.04);
    out.rightThumbRot.setScalar(0.24, 0.28, -0.18);
    out.rightIndexRot.setScalar(1.18, 0, 0);
    out.rightFingersRot.setScalar(1.28, 0, 0);
  } else if (grip === 'chainsaw') {
    // Left hand overhand on top tubular handlebar; right hand on rear throttle trigger grip with 2-stroke vibration
    const buzz = Math.sin(time * 52) * 0.06;
    out.leftForearmPos.setScalar(-3.2, 0.85 + buzz, 2.6);
    out.leftForearmRot.setScalar(0.18, 0.12, -0.18);
    out.leftHandRot.setScalar(0.06, 0, -0.12);
    out.leftIndexRot.setScalar(1.12, 0, 0);
    out.leftFingersRot.setScalar(1.22, 0, 0);

    out.rightForearmPos.setScalar(1.8, -2.1 - buzz, -1.8);
    out.rightForearmRot.setScalar(-0.15, -0.08, -1.12);
    out.rightIndexRot.setScalar(0.75 + Math.sin(time * 8.0) * 0.14, 0, 0);
    out.rightFingersRot.setScalar(1.20, 0, 0);
  } else if (grip === 'shotgun') {
    // Left hand cradling the underside of the walnut pump forend & cycling backward/forward; right hand on stock wrist
    const pumpCycle = Math.max(0, Math.sin(time * 3.0));
    out.leftForearmPos.setScalar(-1.4, -1.25, 4.8 - pumpCycle * 3.6);
    out.leftForearmRot.setScalar(0.08, -0.06, -2.65);
    out.leftHandRot.setScalar(0.05, 0, 0.12 * pumpCycle);
    out.leftThumbRot.setScalar(0.18, -0.22, 0.15);
    out.leftIndexRot.setScalar(0.95, 0, 0);
    out.leftFingersRot.setScalar(1.08, 0, 0);

    out.rightForearmPos.setScalar(1.6, -2.45, -3.2);
    out.rightForearmRot.setScalar(-0.22, -0.05, -1.18);
    out.rightIndexRot.setScalar(0.68, 0, 0);
    out.rightFingersRot.setScalar(1.18, 0, 0);
  } else if (grip === 'chaingun') {
    // Left hand overhand on top crossbar handle; right hand on rear spade trigger grip
    const kick = Math.sin(time * 36) * 0.12;
    out.leftForearmPos.setScalar(-1.8, 1.45, 2.2 - kick);
    out.leftForearmRot.setScalar(0.24, 0.10, -0.15);
    out.leftIndexRot.setScalar(1.15, 0, 0);
    out.leftFingersRot.setScalar(1.24, 0, 0);

    out.rightForearmPos.setScalar(2.2, -1.65, -2.4 - kick);
    out.rightForearmRot.setScalar(-0.12, -0.10, -1.15);
    out.rightIndexRot.setScalar(0.72, 0, 0);
    out.rightFingersRot.setScalar(1.22, 0, 0);
  } else if (grip === 'rocket') {
    // Right hand on forward pistol trigger grip; left hand stabilizing forward under-barrel grip
    out.leftForearmPos.setScalar(-2.4, -2.65, 3.8);
    out.leftForearmRot.setScalar(-0.08, 0.16, -2.25);
    out.leftIndexRot.setScalar(1.02, 0, 0);
    out.leftFingersRot.setScalar(1.14, 0, 0);

    out.rightForearmPos.setScalar(1.4, -2.85, 0.4);
    out.rightForearmRot.setScalar(-0.14, -0.06, -1.18);
    out.rightIndexRot.setScalar(0.68, 0, 0);
    out.rightFingersRot.setScalar(1.18, 0, 0);
  } else {
    // Open-hand inspection pose: both hands open with fingers extended forward along +Z and thumbs on inner radial sides
    out.leftForearmPos.setScalar(-3.8, -1.6 + breathe, 1.8);
    out.leftForearmRot.setScalar(-0.18 + breathe, 0.14, -0.22);
    out.leftHandRot.setScalar(Math.sin(time * 2.0) * 0.08, 0.05, -0.10);
    out.leftThumbRot.setScalar(0.06, -0.08 + flex * 0.3, 0.08);
    out.leftIndexRot.setScalar(0.10 + flex * 0.6, 0, 0);
    out.leftFingersRot.setScalar(0.14 + flex * 0.8, 0, 0);

    out.rightForearmPos.setScalar(3.8, -1.6 + breathe, 1.8);
    out.rightForearmRot.setScalar(-0.18 + breathe, -0.14, 0.22);
    out.rightHandRot.setScalar(Math.cos(time * 2.0) * 0.08, -0.05, 0.10);
    out.rightThumbRot.setScalar(0.06, 0.08 - flex * 0.3, -0.08);
    out.rightIndexRot.setScalar(0.10 - flex * 0.6, 0, 0);
    out.rightFingersRot.setScalar(0.14 - flex * 0.8, 0, 0);
  }

  return out;
}

