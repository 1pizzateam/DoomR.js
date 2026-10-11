/**
 * Plain-array geometry helpers. Lines come out as GL_LINES pairs, solids as triangles.
 * World space is Y up; the game's (x, y) tile plane maps to (X, Z).
 */

function pushEdge(out, a, b) {
  out.push(a[0], a[1], a[2], b[0], b[1], b[2]);
}

function boxCorners(w, h, d, x = 0, y = 0, z = 0) {
  const hx = w / 2;
  const hz = d / 2;
  return [
    [x - hx, y, z - hz], [x + hx, y, z - hz], [x + hx, y, z + hz], [x - hx, y, z + hz],
    [x - hx, y + h, z - hz], [x + hx, y + h, z - hz], [x + hx, y + h, z + hz], [x - hx, y + h, z + hz],
  ];
}

/** 12 edges of a box standing on y (centred on x/z). */
export function boxEdges(w, h, d, x = 0, y = 0, z = 0) {
  const c = boxCorners(w, h, d, x, y, z);
  const out = [];
  for (let i = 0; i < 4; i++) {
    pushEdge(out, c[i], c[(i + 1) % 4]);
    pushEdge(out, c[i + 4], c[((i + 1) % 4) + 4]);
    pushEdge(out, c[i], c[i + 4]);
  }
  return out;
}

/** Triangles of a box (all six faces); used to hide whatever is behind it. */
export function boxTriangles(w, h, d, x = 0, y = 0, z = 0) {
  const c = boxCorners(w, h, d, x, y, z);
  const quads = [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
  const out = [];
  for (const [a, b, e, f] of quads) {
    out.push(...c[a], ...c[b], ...c[e], ...c[a], ...c[e], ...c[f]);
  }
  return out;
}

/** Regular polygon outline around the Y axis at height y. */
export function ringEdges(radius, sides, y = 0, x = 0, z = 0, rotation = 0) {
  const out = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    const b = rotation + ((i + 1) / sides) * Math.PI * 2;
    pushEdge(out, [x + Math.cos(a) * radius, y, z + Math.sin(a) * radius], [x + Math.cos(b) * radius, y, z + Math.sin(b) * radius]);
  }
  return out;
}

/** Prism: two rings joined by vertical edges. */
export function prismEdges(radius, height, sides, y = 0, x = 0, z = 0, rotation = 0) {
  const out = [...ringEdges(radius, sides, y, x, z, rotation), ...ringEdges(radius, sides, y + height, x, z, rotation)];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * radius;
    const pz = z + Math.sin(a) * radius;
    pushEdge(out, [px, y, pz], [px, y + height, pz]);
  }
  return out;
}

/** Circle outline in the XZ ('y'), XY ('z') or YZ ('x') plane, centred on the origin. */
export function circleEdges(radius, sides, normalAxis = 'y') {
  const out = [];
  const at = (angle) => {
    const a = Math.cos(angle) * radius;
    const b = Math.sin(angle) * radius;
    return normalAxis === 'y' ? [a, 0, b] : normalAxis === 'z' ? [a, b, 0] : [0, a, b];
  };
  for (let i = 0; i < sides; i++)
    pushEdge(out, at((i / sides) * Math.PI * 2), at(((i + 1) / sides) * Math.PI * 2));
  return out;
}

export function octahedronEdges(radius) {
  const v = [[radius, 0, 0], [-radius, 0, 0], [0, radius, 0], [0, -radius, 0], [0, 0, radius], [0, 0, -radius]];
  const out = [];
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      if (j === i + 1 && i % 2 === 0)
        continue;
      pushEdge(out, v[i], v[j]);
    }
  }
  return out;
}

/** Connected polyline as GL_LINES pairs from flat [x, y, z, ...] points. */
export function polyline(points) {
  const out = [];
  for (let i = 3; i < points.length; i += 3)
    out.push(points[i - 3], points[i - 2], points[i - 1], points[i], points[i + 1], points[i + 2]);
  return out;
}

export function segment(ax, ay, az, bx, by, bz) {
  return [ax, ay, az, bx, by, bz];
}

/** Rectangle spanning a wall face. axis 'x' is a plane of constant X, axis 'z' of constant Z. */
export function faceCorners(axis, plane, a0, a1, y0, y1) {
  return axis === 'x'
    ? [[plane, y0, a0], [plane, y0, a1], [plane, y1, a1], [plane, y1, a0]]
    : [[a0, y0, plane], [a1, y0, plane], [a1, y1, plane], [a0, y1, plane]];
}

export function quadEdges(corners) {
  const out = [];
  for (let i = 0; i < 4; i++)
    pushEdge(out, corners[i], corners[(i + 1) % 4]);
  return out;
}

export function quadTriangles(corners, offset = [0, 0, 0]) {
  const c = corners.map((p) => [p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]]);
  return [...c[0], ...c[1], ...c[2], ...c[0], ...c[2], ...c[3]];
}

/** Ellipse outline in the XZ ('y'), XY ('z') or YZ ('x') plane, with the half-axes of that plane, centred at (cx, cy, cz). */
export function ellipseEdges(ra, rb, normalAxis = 'y', sides = 10, cx = 0, cy = 0, cz = 0) {
  const out = [];
  const at = (angle) => {
    const a = Math.cos(angle) * ra;
    const b = Math.sin(angle) * rb;
    return normalAxis === 'y' ? [cx + a, cy, cz + b] : normalAxis === 'z' ? [cx + a, cy + b, cz] : [cx, cy + a, cz + b];
  };
  for (let i = 0; i < sides; i++)
    pushEdge(out, at((i / sides) * Math.PI * 2), at(((i + 1) / sides) * Math.PI * 2));
  return out;
}

/** A tapered body: each ring is four corners, joined to the next by edges. */
export function loftEdges(rings) {
  const out = [];
  rings.forEach((ring, r) => {
    for (let i = 0; i < ring.length; i++) {
      pushEdge(out, ring[i], ring[(i + 1) % ring.length]);
      if (r + 1 < rings.length)
        pushEdge(out, ring[i], rings[r + 1][i]);
    }
  });
  return out;
}

/** A row of teeth: short lines from a point along a direction, every `step`, `count` of them. */
export function teeth(x, y, z, dx, dy, dz, count, step, length) {
  const out = [];
  for (let i = 0; i < count; i++)
    out.push(x + dx * i * step, y + dy * i * step, z + dz * i * step, x + dx * i * step, y + length, z + dz * i * step);
  return out;
}

/** Triangles of a closed prism (sides and top), used to hide what is behind a round object. */
export function prismTriangles(radius, height, sides, y = 0, x = 0, z = 0, rotation = 0) {
  const out = [];
  const at = (i, h) => {
    const a = rotation + (i / sides) * Math.PI * 2;
    return [x + Math.cos(a) * radius, y + h, z + Math.sin(a) * radius];
  };
  for (let i = 0; i < sides; i++) {
    const a = at(i, 0);
    const b = at(i + 1, 0);
    const c = at(i + 1, height);
    const d = at(i, height);
    out.push(...a, ...b, ...c, ...a, ...c, ...d, ...d, ...c, ...[x, y + height, z]);
  }
  return out;
}

export function merge(...lists) {
  const out = [];
  for (const list of lists) {
    for (let i = 0; i < list.length; i++)
      out.push(list[i]);
  }
  return out;
}
