/**
 * Vec3 geometry helpers for wall and ceiling occlusion triangles.
 * World space is Y up; the game's (x, y) tile plane maps to (X, Z).
 */
import { Vec3 } from '@1pizzateam/roostr';

/**
 * Rectangle spanning a wall face between the bottom-left `min` and top-right `max` points.
 * axis 'x' is a plane of constant X (taken from min.x), axis 'z' of constant Z (taken from min.z).
 */
export function faceCorners(axis, min, max) {
  return axis === 'x'
    ? [new Vec3(min.x, min.y, min.z), new Vec3(min.x, min.y, max.z), new Vec3(min.x, max.y, max.z), new Vec3(min.x, max.y, min.z)]
    : [new Vec3(min.x, min.y, min.z), new Vec3(max.x, min.y, min.z), new Vec3(max.x, max.y, min.z), new Vec3(min.x, max.y, min.z)];
}

export function quadTriangles(corners, offset = new Vec3()) {
  const c0 = corners[0];
  const c1 = corners[1];
  const c2 = corners[2];
  const c3 = corners[3];
  return [
    c0.x + offset.x, c0.y + offset.y, c0.z + offset.z,
    c1.x + offset.x, c1.y + offset.y, c1.z + offset.z,
    c2.x + offset.x, c2.y + offset.y, c2.z + offset.z,
    c0.x + offset.x, c0.y + offset.y, c0.z + offset.z,
    c2.x + offset.x, c2.y + offset.y, c2.z + offset.z,
    c3.x + offset.x, c3.y + offset.y, c3.z + offset.z,
  ];
}
