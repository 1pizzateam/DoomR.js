import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`../src/${name}.js`, import.meta.url), 'utf8');
const barrelSrc = read('barrel');
const monstersSrc = read('monsters');
const arsenalSrc = read('arsenal');

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
