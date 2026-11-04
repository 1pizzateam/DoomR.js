import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vec3 } from '@1pizzateam/roostr';

const read = (name) => readFileSync(new URL(`../src/${name}.js`, import.meta.url), 'utf8');
const linesSrc = read('lines');
const worldSrc = read('world');
const { faceCorners, quadTriangles } = await import('../src/lines.js');

const legacyFace = (axis, plane, a0, a1, y0, y1) => axis === 'x'
  ? [[plane, y0, a0], [plane, y0, a1], [plane, y1, a1], [plane, y1, a0]]
  : [[a0, y0, plane], [a1, y0, plane], [a1, y1, plane], [a0, y1, plane]];
const legacyQuad = (corners, offset = [0, 0, 0]) => {
  const c = corners.map((p) => [p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]]);
  return [...c[0], ...c[1], ...c[2], ...c[0], ...c[2], ...c[3]];
};
const asArrays = (corners) => corners.map((p) => [p.x, p.y, p.z]);
const quad = () => [new Vec3(1, 2, 3), new Vec3(4, 5, 6), new Vec3(7, 8, 9), new Vec3(10, 11, 12)];

const checks = [
  ['AC-1 quadTriangles applies Vec3 offset', () => {
    const out = quadTriangles(quad(), new Vec3(0.5, 0.25, -1));
    assert.equal(out.length, 18);
    assert.deepEqual(out, [
      1.5, 2.25, 2, 4.5, 5.25, 5, 7.5, 8.25, 8,
      1.5, 2.25, 2, 7.5, 8.25, 8, 10.5, 11.25, 11,
    ]);
  }],
  ['AC-2 quadTriangles defaults to zero offset', () => {
    assert.deepEqual(quadTriangles(quad()), quadTriangles(quad(), new Vec3(0, 0, 0)));
    assert.deepEqual(quadTriangles(quad()).slice(0, 3), [1, 2, 3]);
    assert.doesNotMatch(linesSrc, /\[\s*0\s*,\s*0\s*,\s*0\s*\]/);
  }],
  ['AC-3 faceCorners x-axis', () => {
    const c = faceCorners('x', new Vec3(5, -1, 2), new Vec3(5, 3, 8));
    assert.equal(c.length, 4);
    for (const p of c) {
      assert.ok(p instanceof Vec3);
      assert.equal(p.x, 5);
    }
    assert.deepEqual(asArrays(c), [[5, -1, 2], [5, -1, 8], [5, 3, 8], [5, 3, 2]]);
  }],
  ['AC-4 faceCorners z-axis', () => {
    const c = faceCorners('z', new Vec3(2, -1, 7), new Vec3(8, 3, 7));
    for (const p of c) {
      assert.ok(p instanceof Vec3);
      assert.equal(p.z, 7);
    }
    assert.deepEqual(asArrays(c), [[2, -1, 7], [8, -1, 7], [8, 3, 7], [2, 3, 7]]);
  }],
  ['AC-5 occlusion triangles identical to legacy', () => {
    // wall with lap and inward offset
    const wallX = quadTriangles(faceCorners('x', new Vec3(16, -2, 14.8), new Vec3(16, 6, 33.2)), new Vec3(0.9, 0, 0));
    assert.deepEqual(wallX, legacyQuad(legacyFace('x', 16, 14.8, 33.2, -2, 6), [0.9, 0, 0]));
    const wallZ = quadTriangles(faceCorners('z', new Vec3(14.8, -2, 16), new Vec3(33.2, 6, 16)), new Vec3(0, 0, -0.9));
    assert.deepEqual(wallZ, legacyQuad(legacyFace('z', 16, 14.8, 33.2, -2, 6), [0, 0, -0.9]));
    // door lintel
    const lintel = quadTriangles(faceCorners('z', new Vec3(32, 3, 48), new Vec3(48, 10, 48)), new Vec3(0, 0, 0.9));
    assert.deepEqual(lintel, legacyQuad(legacyFace('z', 48, 32, 48, 3, 10), [0, 0, 0.9]));
    // acid pit
    const pit = quadTriangles(faceCorners('x', new Vec3(64, -5.35, 16), new Vec3(64, -0.2, 32)));
    assert.deepEqual(pit, legacyQuad(legacyFace('x', 64, 16, 32, -5.35, -0.2)));
    // ceiling strip
    const ceil = quadTriangles([new Vec3(0, 10, 16), new Vec3(48, 10, 16), new Vec3(48, 10, 32), new Vec3(0, 10, 32)]);
    assert.deepEqual(ceil, legacyQuad([[0, 10, 16], [48, 10, 16], [48, 10, 32], [0, 10, 32]]));
  }],
  ['AC-6 world.js has no scalar faceCorners or array-literal quadTriangles calls', () => {
    assert.doesNotMatch(worldSrc, /faceCorners\(\s*(axis|'[xz]')\s*,(?!\s*new Vec3)/);
    assert.doesNotMatch(worldSrc, /quadTriangles\(\s*\[\s*\[/);
    assert.doesNotMatch(worldSrc, /quadTriangles\([^)]*,\s*(alongY \? )?\[/);
    assert.doesNotMatch(worldSrc, /\boffset = \[/);
  }],
];

console.log('# file: tests/lines.test.mjs');
let failed = 0;
for (const [name, fn] of checks) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}\n     ${e.message}`);
  }
}
if (failed) process.exit(1);
