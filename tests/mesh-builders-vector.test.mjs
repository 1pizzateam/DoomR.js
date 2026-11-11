import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`../src/${name}.js`, import.meta.url), 'utf8');
const barrelSrc = read('barrel');
const monstersSrc = read('monsters');
const arsenalSrc = read('arsenal');
const weaponSrc = read('weapon');
const explosionSrc = read('explosion');
const doorSrc = read('door');
const BOX_SOURCES = ['cache', 'medikit', 'powerups', 'keycard', 'ammo', 'armor'].map((n) => [n, read(n)]);

function matchClose(src, open, openCh, closeCh) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === openCh)
      depth++;
    else if (src[i] === closeCh && --depth === 0)
      return i;
  }
  return -1;
}

function extractFunction(src, name) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} not found`);
  const paramsOpen = src.indexOf('(', start);
  const open = src.indexOf('{', matchClose(src, paramsOpen, '(', ')'));
  return src.slice(open, matchClose(src, open, '{', '}') + 1);
}

function callSpans(src, name) {
  const spans = [];
  const re = new RegExp(`(?<!function )\\b${name}\\(`, 'g');
  let m;
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length - 1;
    spans.push(src.slice(open + 1, matchClose(src, open, '(', ')')));
  }
  return spans;
}

// Array literal at the start of an argument (after "(", "," or line start), not an index access.
const ARRAY_ARG = /(?:^|[,(]\s*)\[/m;
const HELPERS = ['pushTri', 'pushQuad', 'pushSmoothQuad', 'pushCapTriangle'];

const checks = [
  ['AC-1 barrel pushTri and pushQuad take Vec3 points and Vec2 UVs', () => {
    const tri = extractFunction(barrelSrc, 'pushTri');
    assert.match(tri, /p0\.x/);
    assert.match(tri, /uv0\.x/);
    assert.doesNotMatch(tri, /p[012]\[\d\]|uv[012]\[\d\]/);
    const quad = extractFunction(barrelSrc, 'pushQuad');
    assert.doesNotMatch(quad, /\[\s*u[01]\s*,\s*v[01]\s*\]/);
    assert.doesNotMatch(quad, /c[0-3]\[\d\]/);
    for (const name of ['pushTri', 'pushQuad'])
      for (const span of callSpans(barrelSrc, name))
        assert.doesNotMatch(span, ARRAY_ARG, `${name} call receives an array literal`);
  }],
  ['AC-2 monsters pushQuad takes Vec3 corners', () => {
    const quad = extractFunction(monstersSrc, 'pushQuad');
    assert.doesNotMatch(quad, /c[0-3]\[\d\]/);
    assert.doesNotMatch(quad, /\.\.\.corners/);
    const prism = extractFunction(monstersSrc, 'taperPrism');
    for (const n of ['bFL', 'bFR', 'bBR', 'bBL', 'tFL', 'tFR', 'tBR', 'tBL'])
      assert.match(prism, new RegExp(`const ${n} = new Vec3\\(`));
  }],
  ['AC-3 no mesh builder helper receives array literal coordinates', () => {
    for (const src of [arsenalSrc, barrelSrc, monstersSrc])
      for (const name of HELPERS)
        for (const span of callSpans(src, name))
          assert.doesNotMatch(span, ARRAY_ARG, `${name} call receives an array literal`);
    assert.doesNotMatch(extractFunction(arsenalSrc, 'pushQuad'), /c[0-3]\[\d\]/);
  }],
  ['AC-1 weapon mag2 helper removed', () => {
    assert.doesNotMatch(weaponSrc, /function mag2\b/);
    assert.doesNotMatch(weaponSrc, /\bmag2\(/);
    assert.match(weaponSrc, /scratchVec2\.setScalar\([^)]*\)\.getMagnitude\(\)/);
  }],
  ['AC-5 mesh helpers take Vec3 corners and Vec2 UVs', () => {
    for (const [name, src] of BOX_SOURCES) {
      const quad = extractFunction(src, 'pushQuad');
      assert.match(quad, /c0\.x/, `${name} pushQuad reads Vec3 corners`);
      assert.doesNotMatch(quad, /c[0-3]\[\d\]/, `${name} pushQuad indexes arrays`);
      assert.doesNotMatch(quad, /\.\.\./, `${name} pushQuad spreads arrays`);
      for (const helper of ['pushQuad', 'pushBox', 'pushCellQuad', 'pushCrateTray', 'pushShellCylinder', 'pushRocketWarhead'])
        for (const span of callSpans(src, helper))
          assert.doesNotMatch(span, ARRAY_ARG, `${name} ${helper} call receives an array literal`);
    }
    for (const name of ['cache', 'medikit', 'powerups'])
      assert.match(BOX_SOURCES.find(([n]) => n === name)[1], /function pushBox\(vertices, uvs, min, max, faces\)/);
    const ammo = BOX_SOURCES.find(([n]) => n === 'ammo')[1];
    assert.match(ammo, /function pushCrateTray\(vertices, uvs, halfExtents\)/);
    assert.match(ammo, /function pushShellCylinder\(vertices, uvs, center, heightSpan,/);
    assert.match(ammo, /function pushRocketWarhead\(vertices, uvs, center, profile,/);
    for (const name of ['doorBox', 'doubleDoorBox', 'secretDoorBox']) {
      const body = extractFunction(doorSrc, name);
      assert.doesNotMatch(body, /\[\[/, `${name} builds nested coordinate arrays`);
      assert.doesNotMatch(body, /vertices\.push\(\.\.\./, `${name} spreads corner arrays`);
    }
    assert.doesNotMatch(extractFunction(doorSrc, 'pushQuad'), /c[0-3]\[\d\]/);
  }],
  ['AC-8 explosion helpers take Vec3 and Vec2', () => {
    const tri = extractFunction(explosionSrc, 'pushSmoothTri');
    assert.doesNotMatch(tri, /\.p\[\d\]|\.n\[\d\]|uv[012]\[\d\]/);
    assert.match(tri, /uv0\.x/);
    const quad = extractFunction(explosionSrc, 'pushSmoothQuad');
    assert.doesNotMatch(quad, /\[\s*u[01]\s*,\s*tv[01]\s*\]/);
    assert.match(explosionSrc, /function buildLumpyDome\(radii,/);
    assert.doesNotMatch(extractFunction(explosionSrc, 'evalSurfaceVertex'), /return \[|\[\d\]/);
  }],
];

console.log('# file: tests/mesh-builders-vector.test.mjs');
let failed = 0;
for (const [name, fn] of checks) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${name}\n     ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
