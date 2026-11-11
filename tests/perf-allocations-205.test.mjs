import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vec2, Vec3 } from '@1pizzateam/roostr';
import { Blood } from '../src/blood.js';
import { floorGibQuad, floorSplatQuad, printQuad, wallSplatQuad } from '../src/bloodsprites.js';
import { Game } from '../src/game.js';
import { LEVELS } from '../src/levels.js';
import { DOOR, Level, TILE } from '../src/level.js';
import { World } from '../src/world.js';

const read = (name) => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const bloodSrc = read('blood.js');
const spritesSrc = read('bloodsprites.js');
const gameSrc = read('game.js');
const worldSrc = read('world.js');
const fogSrc = read('fog.js');

function body(src, name) {
  const match = new RegExp(`^\\s*(?:(?:export )?function |async\\s+)?${name}\\s*\\([^)]*\\)\\s*\\{`, 'm').exec(src);
  assert.ok(match, `declaration of ${name} not found`);
  const open = src.indexOf('{', match.index + match[0].length - 1);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{')
      depth++;
    else if (src[i] === '}' && --depth === 0)
      return src.slice(open + 1, i);
  }
  throw new Error(`unbalanced braces for ${name}`);
}

const fresh = () => ({ corners: new Array(12).fill(-1), uv: new Array(4).fill(-1) });
const pos2 = new Vec2(10, 20);
const wallOpts = { pos: new Vec3(40, 50, 3), normal: new Vec2(0, 1), size: 2, top: 12, seed: 77 };
const builders = {
  floorSplatQuad: [floorSplatQuad, { pos: pos2, size: 4, seed: 99 }],
  floorGibQuad: [floorGibQuad, { pos: pos2, size: 3, variant: 2, angle: 0.7 }],
  printQuad: [printQuad, { pos: pos2, angle: 1.1, side: -1, strength: 0.8, scale: 2 }],
  wallSplatQuad: [wallSplatQuad, wallOpts],
};

const tests = {
  'AC-1 Blood.update compacts splats in place'() {
    const blood = new Blood();
    const splats = blood.splats;
    const mk = (id, age, life) => ({ id, age, life });
    splats.push(mk(1, 0, 5), mk(2, 9, 1), mk(3, 0, 5), mk(4, 2, 2), mk(5, 0, 5));
    blood.update(0.1);
    assert.equal(blood.splats, splats, 'AC-1: same array instance');
    assert.deepEqual(blood.splats.map((s) => s.id), [1, 3, 5], 'AC-1: live splats stay in order');
    assert.ok(!body(bloodSrc, 'update').includes('.filter('), 'AC-1: update has no .filter(');
  },

  'AC-2 wall and hole eviction avoid filter'() {
    assert.ok(!body(bloodSrc, 'impact').includes('.filter('), 'AC-2: impact (holes) has no .filter(');
    assert.ok(!body(bloodSrc, 'wallSplat').includes('.filter('), 'AC-2: wallSplat has no .filter(');
    assert.ok(!body(bloodSrc, 'evictOldestOf').includes('.filter('), 'AC-2: evictOldestOf has no .filter(');
    const blood = new Blood();
    const doorA = {};
    const doorB = {};
    const list = [{ door: doorA, n: 1 }, { door: doorB, n: 2 }, { door: doorA, n: 3 }, { door: doorA, n: 4 }];
    blood.evictOldestOf(list, doorA, 3);
    assert.deepEqual(list.map((m) => m.n), [1, 2, 3, 4], 'AC-2: nothing evicted at the cap');
    blood.evictOldestOf(list, doorA, 2);
    assert.deepEqual(list.map((m) => m.n), [2, 3, 4], 'AC-2: oldest mark of the door evicted, others kept');
    assert.equal(list.length, 3);
  },

  'AC-3 quad builders populate out in place'() {
    for (const [name, [build, opts]] of Object.entries(builders)) {
      const expected = build(opts);
      const out = fresh();
      const got = build(opts, out);
      assert.equal(got, out, `AC-3: ${name} returns out`);
      assert.deepEqual(out.corners, expected.corners, `AC-3: ${name} corners identical`);
      assert.deepEqual(out.uv, expected.uv, `AC-3: ${name} uv identical`);
      assert.equal(out.corners.length, 12);
      assert.equal(out.uv.length, 4);
    }
    const out = fresh();
    assert.equal(wallSplatQuad({ ...wallOpts, lo: 100, hi: 101 }, out), null, 'AC-3: fully clipped wall splat is null');
    assert.deepEqual(out, fresh(), 'AC-3: out untouched when clipped');
  },

  'AC-4 default object only when out is nullish'() {
    for (const [name, [build, opts]] of Object.entries(builders)) {
      const a = build(opts);
      const b = build(opts, null);
      const c = build(opts, undefined);
      assert.notEqual(a, b, `AC-4: ${name} fresh object`);
      assert.notEqual(b, c, `AC-4: ${name} fresh object for null and undefined`);
      assert.equal(a.corners.length, 12);
      assert.equal(a.uv.length, 4);
      const src = body(spritesSrc, name);
      assert.ok(!src.includes('const at ='), `AC-4: ${name} has no at closure`);
      assert.ok(!src.includes('...at('), `AC-4: ${name} has no at spread`);
    }
  },

  'AC-5 updateFlow queue buffer and rocket scratch vectors'() {
    const flowSrc = body(gameSrc, 'updateFlow');
    assert.ok(!flowSrc.includes('= [start]') && !flowSrc.includes('queue.push'), 'AC-5: updateFlow has no array queue');
    for (const name of ['fireRocket', 'detonateRocket', 'addShot']) {
      const src = body(gameSrc, name);
      assert.ok(!src.includes('new Vec2(') && !src.includes('.clone()'), `AC-5: ${name} allocates no Vec2`);
    }
    const game = new Game();
    game.load(0);
    game.updateFlow();
    const { level, flow } = game;
    const start = Math.floor(game.player.pos.y / TILE) * level.width + Math.floor(game.player.pos.x / TILE);
    const ref = new Int32Array(flow.length).fill(-1);
    ref[start] = 0;
    const queue = [start];
    for (let head = 0; head < queue.length; head++) {
      const idx = queue[head];
      const x = idx % level.width;
      const y = (idx - x) / level.width;
      for (let d = 0; d < 4; d++) {
        if (level.diag[idx] && level.hasCardinalFace(idx, d))
          continue;
        const nx = x + (d === 0 ? -1 : d === 1 ? 1 : 0);
        const ny = y + (d === 2 ? -1 : d === 3 ? 1 : 0);
        if (!level.isWalkable(nx, ny))
          continue;
        const nidx = ny * level.width + nx;
        if (level.diag[nidx] && level.hasCardinalFace(nidx, d ^ 1))
          continue;
        if (level.kind[nidx] === DOOR && level.heights[nidx] >= level.baseHeight[nidx] * 0.5)
          continue;
        if (ref[nidx] >= 0)
          continue;
        ref[nidx] = ref[idx] + 1;
        queue.push(nidx);
      }
    }
    assert.deepEqual(Array.from(flow), Array.from(ref), 'AC-5: flow equals reference BFS');
    assert.ok(queue.length > 1, 'AC-5: the flow reaches beyond the start tile');
  },

  'AC-6 doorsList synced with doors Map'() {
    let checked = 0;
    for (const def of LEVELS) {
      const level = new Level(def);
      assert.equal(level.doorsList.length, level.doors.size, 'AC-6: same count');
      const values = [...level.doors.values()];
      for (let i = 0; i < values.length; i++) {
        assert.equal(level.doorsList[i], values[i], 'AC-6: same door object in the same order');
        assert.equal(level.doors.get(values[i].idx), values[i], 'AC-6: keyed lookup still works');
        checked++;
      }
    }
    assert.ok(checked > 0, 'AC-6: at least one door was checked');
    assert.ok(!/doors\.(values|keys)\(\)/.test(fogSrc), 'AC-6: fog.js iterates doorsList');
    for (const name of ['findUseTarget', 'updateDoors', 'updateFlow', 'loadPhysics', 'updateMarsWeather']) {
      const match = new RegExp(`^\\s*${name}\\s*\\(`, 'm').exec(gameSrc);
      if (match)
        assert.ok(!/doors\.(values|keys)\(\)/.test(body(gameSrc, name)), `AC-6: ${name} iterates doorsList`);
    }
    assert.ok(!/level\.doors\.(values|keys)\(\)/.test(worldSrc), 'AC-6: world.js iterates doorsList');
    assert.ok(!/level\.doors\.(values|keys)\(\)/.test(gameSrc), 'AC-6: game.js iterates doorsList');
  },

  'AC-7 syncViews prunes without closure'() {
    const src = body(worldSrc, 'syncViews');
    assert.ok(!src.includes('=>') && !src.includes('forEach((') && !src.includes('function'), 'AC-7: no inline closure');
    const discarded = [];
    const host = { syncStamp: 0, discard: (root) => discarded.push(root) };
    const map = new Map();
    const built = [];
    const updated = [];
    const build = (e) => {
      built.push(e.id);
      return { root: `root${e.id}` };
    };
    const update = (e) => updated.push(e.id);
    const a = { id: 'a' };
    const b = { id: 'b' };
    World.prototype.syncViews.call(host, map, [a, b], build, update);
    assert.deepEqual(built, ['a', 'b'], 'AC-7: views built');
    World.prototype.syncViews.call(host, map, [a, b], build, update);
    assert.deepEqual(built, ['a', 'b'], 'AC-7: views reused');
    assert.deepEqual(updated, ['a', 'b', 'a', 'b'], 'AC-7: views updated');
    World.prototype.syncViews.call(host, map, [b], build, update);
    assert.deepEqual(discarded, ['roota'], 'AC-7: stale view discarded');
    assert.equal(map.has(a), false);
    assert.equal(map.has(b), true);
    World.prototype.syncViews.call(host, map, [a, b], build, update, (e) => e !== b);
    assert.deepEqual(discarded, ['roota', 'rootb'], 'AC-7: filtered-out view discarded');
    assert.equal(map.size, 1);
  },

  'AC-8 mark adapters reuse scratch only for dissolving marks'() {
    const src = worldSrc;
    for (const name of ['floorSplatOf', 'floorGibOf', 'printOf', 'wallSplatOf'])
      assert.ok(body(src, name).includes('mark.dissolving ? scratchMarkQuad : null'), `AC-8: ${name} gates the scratch on dissolving`);
    const host = { splatCache: new Map(), cachedQuad: World.prototype.cachedQuad };
    const marks = [{ x: 1, y: 2, size: 3, seed: 5 }, { x: 4, y: 5, size: 3, seed: 6 }];
    const build = (m) => floorSplatQuad({ pos: new Vec2(m.x, m.y), size: m.size, seed: m.seed }, m.dissolving ? host.scratch : null);
    host.scratch = fresh();
    const q0 = host.cachedQuad(marks[0], build);
    const q1 = host.cachedQuad(marks[1], build);
    assert.notEqual(q0, q1, 'AC-8: non-dissolving marks get distinct cached quads');
    assert.equal(host.cachedQuad(marks[0], build), q0, 'AC-8: cached quad is kept');
    marks[0].dissolving = true;
    marks[1].dissolving = true;
    assert.equal(host.cachedQuad(marks[0], build), host.scratch, 'AC-8: dissolving mark reuses the scratch');
  },
};

console.log('# file: tests/perf-allocations-205.test.mjs');
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
