import { mulberry32 } from './rng.js';

// marks stop this far short of the edge of a face, so none sits right on a corner
const EDGE = 0.3;

/** Upper bound on vertices per bullet hole. */
export const MAX_HOLE_VERTICES = 36;

/**
 * A bullet hole on a wall face: a ragged crater ring, a mark at its centre,
 * cracks running out of it and a couple of chipped fragments beyond the cracks.
 * (nx, ny) is the face normal in the game plane, top the wall height there.
 */
export function holeVertices({ x, y, z, nx, ny, top, seed, lo = -Infinity, hi = Infinity }) {
  const rnd = mulberry32(seed);
  const out = [];
  const tx = -ny;
  const ty = nx;
  const at = (u, v) => [x + tx * u + nx * 0.5, z + v, y + ty * u + ny * 0.5];
  const face = { ulo: lo + EDGE, uhi: hi - EDGE, vlo: 0.6 - z, vhi: top - 0.6 - z };
  const polar = (angle, radius) => [Math.cos(angle) * radius, Math.sin(angle) * radius];
  // every line is given as (u, v) points on the face and cut to the face before it is turned into 3D
  const line = (a, b) => {
    const cut = clipToFace(face, a[0], a[1], b[0], b[1]);
    if (cut)
      emit(out, at(cut[0], cut[1]), at(cut[2], cut[3]));
  };

  const radius = 2.2 * (0.85 + rnd() * 0.35);
  const ring = [];
  for (let i = 0; i < 8; i++)
    ring.push(polar((i / 8) * Math.PI * 2 + rnd() * 0.35, radius * (0.8 + rnd() * 0.4)));
  for (let i = 0; i < 8; i++)
    line(ring[i], ring[(i + 1) % 8]);

  line([-radius * 0.45, 0], [radius * 0.45, 0]);
  line([0, -radius * 0.45], [0, radius * 0.45]);

  const cracks = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < cracks; i++) {
    const angle = rnd() * Math.PI * 2;
    line(polar(angle, radius * 1.15), polar(angle + (rnd() - 0.5) * 0.3, radius * (1.9 + rnd() * 1.5)));
  }
  for (let i = 0; i < 2; i++) {
    const angle = rnd() * Math.PI * 2;
    const from = radius * (2.7 + rnd() * 1);
    line(polar(angle, from), polar(angle, from + radius * 0.5));
  }
  return out;
}

/** Upper bound on vertices per footprint. */
export const MAX_PRINT_VERTICES = 40;

const HEEL = [[-5.2, 0], [-4.6, -1.3], [-3.4, -1.6], [-2.4, -1.2], [-2.2, 0], [-2.4, 1.2], [-3.4, 1.6], [-4.6, 1.3]];
const FOREFOOT = [[-1, -1.6], [1, -2.3], [3.4, -2.4], [5, -1.4], [5.4, 0.2], [4.6, 1.8], [2.6, 2.6], [0.2, 2.4], [-1, 1.4]];

/**
 * A shoe print: heel and forefoot outlines, mirrored for the left foot.
 * Fresh, heavy prints get hatching across the forefoot; thin ones are just outlines and smaller.
 */
export function printVertices({ x, y, angle, side, strength, scale }) {
  const out = [];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const size = scale * 1.8 * (0.75 + 0.25 * Math.min(1, strength));
  const at = ([lx, ly]) => {
    const fx = lx * size;
    const fy = (ly + side * 0.3) * side * size;
    return [x + cos * fx - sin * fy, 0.32, y + sin * fx + cos * fy];
  };
  for (const shape of [HEEL, FOREFOOT]) {
    const points = shape.map(at);
    for (let i = 0; i < points.length; i++)
      emit(out, points[i], points[(i + 1) % points.length]);
  }
  if (strength > 0.55) {
    for (const lx of [0.4, 2.2, 3.9])
      emit(out, at([lx, -1.9]), at([lx, 1.9]));
  }
  return out;
}

/** Upper bound on vertices per splat; the renderer sizes its buffers with it. */
export const MAX_SPLAT_VERTICES = 96;

function emit(out, a, b) {
  out.push(a[0], a[1], a[2], b[0], b[1], b[2]);
}

// keeps marks on their wall face: a segment from (u1, v1) to (u2, v2) is cut where it leaves the face
// (u across it, v up it), or dropped if it lies entirely outside. Cutting, rather than squeezing the
// points onto the edge, keeps a mark near the edge or the top of a door the right shape.
function clipToFace(face, u1, v1, u2, v2) {
  let t0 = 0;
  let t1 = 1;
  const du = u2 - u1;
  const dv = v2 - v1;
  const limits = [[-du, u1 - face.ulo], [du, face.uhi - u1], [-dv, v1 - face.vlo], [dv, face.vhi - v1]];
  for (const [p, q] of limits) {
    if (p === 0) {
      if (q < 0)
        return null;
    } else {
      const t = q / p;
      if (p < 0)
        t0 = Math.max(t0, t);
      else
        t1 = Math.min(t1, t);
    }
  }
  if (t0 >= t1)
    return null;
  return [u1 + du * t0, v1 + dv * t0, u1 + du * t1, v1 + dv * t1];
}

/**
 * A splat on the floor: a starburst of rays with detached droplets beyond their tips,
 * and for bigger ones a ragged pool outline with a few chords across it.
 */
export function floorSplatVertices({ x, y, size, seed }) {
  const rnd = mulberry32(seed);
  const out = [];
  const h = 0.3;
  const at = (angle, radius) => [x + Math.cos(angle) * radius, h, y + Math.sin(angle) * radius];

  const rays = 6 + Math.min(9, Math.floor(size / 2));
  for (let i = 0; i < rays; i++) {
    const angle = rnd() * Math.PI * 2;
    const tip = size * (0.55 + rnd() * 0.8);
    emit(out, at(angle, size * 0.12), at(angle, tip));
    if (rnd() < 0.6)
      emit(out, at(angle, tip + size * 0.12), at(angle, tip + size * (0.2 + rnd() * 0.12)));
  }

  if (size >= 8) {
    const points = [];
    for (let i = 0; i < 10; i++)
      points.push(at((i / 10) * Math.PI * 2 + rnd() * 0.3, size * 0.32 * (0.75 + rnd() * 0.5)));
    for (let i = 0; i < 10; i++)
      emit(out, points[i], points[(i + 1) % 10]);
    for (let i = 0; i < 3; i++)
      emit(out, points[i], points[i + 5]);
  }
  return out;
}

/**
 * A splat on a wall face: rays in the plane of the wall and a couple of drips running down.
 * (nx, ny) is the face normal in the game plane, top is the wall height at that spot.
 */
export function wallSplatVertices({ x, y, z, nx, ny, size, top, seed, lo = -Infinity, hi = Infinity }) {
  const rnd = mulberry32(seed);
  const out = [];
  const tx = -ny;
  const ty = nx;
  const at = (u, v) => [x + tx * u + nx * 0.4, z + v, y + ty * u + ny * 0.4];
  const face = { ulo: lo + EDGE, uhi: hi - EDGE, vlo: 0.6 - z, vhi: top - 0.6 - z };
  const line = (u1, v1, u2, v2) => {
    const cut = clipToFace(face, u1, v1, u2, v2);
    if (cut)
      emit(out, at(cut[0], cut[1]), at(cut[2], cut[3]));
  };

  const rays = 5 + Math.min(7, Math.floor(size / 1.5));
  for (let i = 0; i < rays; i++) {
    const angle = rnd() * Math.PI * 2;
    const tip = size * (0.6 + rnd() * 0.9);
    line(Math.cos(angle) * size * 0.12, Math.sin(angle) * size * 0.12, Math.cos(angle) * tip, Math.sin(angle) * tip);
    if (rnd() < 0.5) {
      const a = tip + size * 0.15;
      const b = a + size * 0.15;
      line(Math.cos(angle) * a, Math.sin(angle) * a, Math.cos(angle) * b, Math.sin(angle) * b);
    }
  }
  for (let i = 0; i < 2; i++) {
    const u = (rnd() - 0.5) * size * 0.8;
    line(u, 0, u, -size * (1.2 + rnd() * 2.6));
  }
  return out;
}
