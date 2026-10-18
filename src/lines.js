/**
 * Plain-array geometry helpers for wall and ceiling occlusion triangles.
 * World space is Y up; the game's (x, y) tile plane maps to (X, Z).
 */

/** Rectangle spanning a wall face. axis 'x' is a plane of constant X, axis 'z' of constant Z. */
export function faceCorners(axis, plane, a0, a1, y0, y1) {
  return axis === 'x'
    ? [[plane, y0, a0], [plane, y0, a1], [plane, y1, a1], [plane, y1, a0]]
    : [[a0, y0, plane], [a1, y0, plane], [a1, y1, plane], [a0, y1, plane]];
}

export function quadTriangles(corners, offset = [0, 0, 0]) {
  const c = corners.map((p) => [p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]]);
  return [...c[0], ...c[1], ...c[2], ...c[0], ...c[2], ...c[3]];
}
