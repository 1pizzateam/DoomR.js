import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vec2 } from '@1pizzateam/roostr';
import { FLOOR, TILE, WALL } from '../src/level.js';
import { World } from '../src/world.js';

const worldSrc = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
const EPS = 1e-6;

function span(src, re) {
  const match = re.exec(src);
  assert.ok(match, `declaration ${re} not found`);
  const open = src.indexOf('{', match.index + match[0].length - 1);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{')
      depth++;
    else if (src[i] === '}' && --depth === 0)
      return { start: match.index, end: i + 1, text: src.slice(open + 1, i) };
  }
  throw new Error(`unbalanced braces for ${re}`);
}

const syncSpan = span(worldSrc, /^ {2}syncShadows\(game, fog = null\) \{/m);
const helperSpans = ['canCastOnFloor', 'isSolidNeighbor', 'clampToTileWalls'].map((name) => ({ name, ...span(worldSrc, new RegExp(`^function ${name}\\(.*\\) \\{`, 'm')) }));

const W = 4;
const H = 4;
function makeLevel() {
  const kind = new Uint8Array(W * H).fill(FLOOR);
  for (let i = 0; i < W; i++) {
    kind[i] = WALL;
    kind[i + W * (H - 1)] = WALL;
    kind[i * W] = WALL;
    kind[i * W + W - 1] = WALL;
  }
  return { kind, width: W, inBounds: (v) => v.x >= 0 && v.y >= 0 && v.x < W && v.y < H, slimeAt: (p) => p.x === 999, emptyPitAt: (p) => p.x === 888 };
}

function run(game, { fog = null, cull = Infinity } = {}) {
  const out = [];
  const world = Object.create(World.prototype);
  world.frameCullDistSq = cull;
  world.shadows = { begin: () => ({ quad: (c, uv) => out.push({ corners: Array.from(c), uv: Array.from(uv) }), end() {} }) };
  world.syncShadows(game, fog);
  return out;
}

const mk = (x, y, o = {}) => ({ pos: new Vec2(x, y), ...o });
const near = (a, b, msg) => {
  assert.equal(a.length, b.length, msg);
  for (let i = 0; i < a.length; i++)
    assert.ok(Math.abs(a[i] - b[i]) < EPS, `${msg} [${i}] ${a[i]} vs ${b[i]}`);
};

const tests = {
  'AC-1 syncShadows declares no inline functions'() {
    assert.ok(!syncSpan.text.includes('=>'), 'no arrow function');
    assert.ok(!/\bfunction\b/.test(syncSpan.text), 'no function keyword');
  },
  'AC-2 helpers are declared at module scope with explicit arguments'() {
    for (const h of helperSpans)
      assert.ok(h.end <= syncSpan.start || h.start >= syncSpan.end, `${h.name} outside syncShadows`);
    assert.ok(/^function canCastOnFloor\(pos, level, fog, cullDistSq\)/m.test(worldSrc));
    assert.ok(/^function isSolidNeighbor\(level, tx, ty\)/m.test(worldSrc));
    assert.ok(/^function clampToTileWalls\(level, pos\)/m.test(worldSrc));
  },
  'AC-3 clampToTileWalls clamps against solid neighbors only'() {
    const c = run({ level: makeLevel(), enemies: [mk(TILE * 1.5, TILE * 1.5, { radius: 100 })] })[0].corners;
    const minC = Math.min(c[0], c[3], c[6], c[9]);
    const maxC = Math.max(c[0], c[3], c[6], c[9]);
    const minZ = Math.min(c[2], c[5], c[8], c[11]);
    const maxZ = Math.max(c[2], c[5], c[8], c[11]);
    assert.ok(Math.abs(minC - (TILE + 0.5)) < EPS, 'left wall clamps x');
    assert.ok(Math.abs(minZ - (TILE + 0.5)) < EPS, 'top wall clamps z');
    assert.ok(maxC > 2 * TILE, 'open right side stays unclamped');
    assert.ok(maxZ > 2 * TILE, 'open bottom side stays unclamped');
    const walled = makeLevel();
    walled.kind[1 * W + 2] = WALL;
    walled.kind[2 * W + 1] = WALL;
    const d = run({ level: walled, enemies: [mk(TILE * 1.5, TILE * 1.5, { radius: 100 })] })[0].corners;
    assert.ok(Math.abs(Math.max(d[0], d[3], d[6], d[9]) - (2 * TILE - 0.5)) < EPS, 'right wall clamps x');
    assert.ok(Math.abs(Math.max(d[2], d[5], d[8], d[11]) - (2 * TILE - 0.5)) < EPS, 'bottom wall clamps z');
  },
  'AC-4 canCastOnFloor rejects culled, fogged, slime and pit positions'() {
    const level = makeLevel();
    const pos = (x) => mk(x, TILE * 1.5);
    assert.equal(run({ level, pickups: [pos(TILE * 1.5)] }).length, 1, 'visible by default');
    assert.equal(run({ level, pickups: [pos(TILE * 2.5)] }, { cull: 1 }).length, 0, 'culled');
    assert.equal(run({ level, pickups: [pos(TILE * 1.5)] }, { fog: { canSeeNear: () => false } }).length, 0, 'fogged');
    assert.equal(run({ level, pickups: [pos(TILE * 1.5)] }, { fog: { canSeeNear: () => true } }).length, 1, 'visible');
    assert.equal(run({ level, pickups: [pos(999)] }).length, 0, 'slime');
    assert.equal(run({ level, pickups: [pos(888)] }).length, 0, 'pit');
    assert.equal(run({ level, pickups: [{ pos: null }] }).length, 0, 'null pos');
  },
  'AC-5 syncShadows output is unchanged'() {
    const game = {
      level: makeLevel(),
      furnitures: [mk(TILE * 1.5, TILE * 1.5, { type: 'desk' })],
      caches: [mk(TILE * 1.5, TILE * 2.5)],
      barrels: [mk(TILE * 2.5, TILE * 1.5)],
      enemies: [mk(TILE * 1.5, TILE * 1.5, { radius: 14 })],
      pickups: [mk(TILE * 2.5, TILE * 2.5)],
    };
    const out = run(game);
    const expected = [
      [[77, -0.08, 120.394, 117.736, -0.08, 120.394, 117.736, -0.08, 74, 77, -0.08, 74], [0.51, 0.02, 0.99, 0.98]],
      [[74, -0.08, 190.512, 119.728, -0.08, 190.512, 119.728, -0.08, 131, 74, -0.08, 131], [0.51, 0.02, 0.99, 0.98]],
      [[140.5, -0.08, 117.516, 181.804, -0.08, 117.516, 181.804, -0.08, 76.5, 140.5, -0.08, 76.5], [0.01, 0.02, 0.49, 0.98]],
      [[76.68, -0.08, 117.462, 117.768, -0.08, 117.462, 117.768, -0.08, 76.68, 76.68, -0.08, 76.68], [0.01, 0.02, 0.49, 0.98]],
      [[147, -0.08, 173.756, 173.864, -0.08, 173.756, 173.864, -0.08, 147, 147, -0.08, 147], [0.01, 0.02, 0.49, 0.98]],
    ];
    assert.equal(out.length, expected.length);
    for (let i = 0; i < expected.length; i++) {
      near(out[i].corners, expected[i][0], `quad ${i} corners`);
      near(out[i].uv, expected[i][1], `quad ${i} uv`);
    }
  },
  'AC-6 helpers allocate no object or array literals'() {
    for (const h of helperSpans) {
      assert.ok(!/=\s*[[{]|\(\s*[[{]|return\s+[[{]|\bnew\b|=>|\bfunction\b/.test(h.text), `${h.name} allocates`);
    }
  },
};

console.log('# file: tests/perf-shadows-247.test.mjs');
let failed = false;
for (const [name, fn] of Object.entries(tests)) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed = true;
    console.log(`not ok   ${name}\n${error.stack}`);
  }
}
if (failed)
  process.exit(1);
