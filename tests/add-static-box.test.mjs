import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vec2 } from '@1pizzateam/roostr';
import { CAT, Game } from '../src/game.js';
import { DOOR, TILE } from '../src/level.js';
import { LEVELS } from '../src/levels.js';

const src = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');

function stub() {
  const added = [];
  return { added, scene: { addBody: (b) => added.push(b) } };
}

const add = (ctx, center, size) => Game.prototype.addStaticBox.call(ctx, center, size);

const checks = [
  ['AC-1 addStaticBox accepts a Vec2 size and applies its extents', () => {
    const body = add(stub(), new Vec2(10, 20), new Vec2(3 * TILE, TILE));
    assert.equal(body.body.size.x, 3 * TILE);
    assert.equal(body.body.size.y, TILE);
  }],
  ['AC-2 scalar width parameter is removed from addStaticBox', () => {
    assert.match(src, /addStaticBox\(center, size\)\s*\{/);
    assert.doesNotMatch(src, /addStaticBox\(center, width\)/);
    assert.doesNotMatch(src, /new Vec2\(width, TILE\)/);
  }],
  ['AC-3 wall run and door bodies keep identical extents', () => {
    const ctx = stub();
    const door = add(ctx, new Vec2(0, 0), new Vec2(TILE, TILE));
    assert.equal(door.body.size.x, TILE);
    assert.equal(door.body.size.y, TILE);
    const run = 5;
    const wall = add(ctx, new Vec2(0, 0), new Vec2(run * TILE, TILE));
    assert.equal(wall.body.size.x, run * TILE);
    assert.equal(wall.body.size.y, TILE);
  }],
  ['AC-4 size vector is copied and body is registered as a static wall', () => {
    const ctx = stub();
    const size = new Vec2(2 * TILE, TILE);
    const body = add(ctx, new Vec2(1, 1), size);
    size.x = 999;
    size.y = 999;
    assert.equal(body.body.size.x, 2 * TILE);
    assert.equal(body.body.size.y, TILE);
    assert.equal(body.ref.kind, 'wall');
    assert.equal(body.collisionCategory, CAT.WALL);
    assert.equal(body.bodyType, 'static');
    assert.equal(ctx.added.length, 1);
    assert.equal(ctx.added[0], body);
  }],
  ['AC-5 all level wall and door bodies have valid extents', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      const game = new Game();
      game.load(i);
      const doorBodies = [...game.level.doors.values()].map((d) => d.body);
      const bodies = [...doorBodies];
      let wallWidth = 0;
      for (const b of game.scene.bodies)
        if (b.ref?.kind === 'wall' && b.body.shape === 'aabb' && !doorBodies.includes(b)) {
          bodies.push(b);
          wallWidth += b.body.size.x;
        }
      assert.ok(bodies.length > 0, `level ${i} has no bodies`);
      for (const b of bodies) {
        assert.ok(Number.isFinite(b.body.size.x) && b.body.size.x > 0, `level ${i} bad width`);
        assert.equal(b.body.size.y, TILE);
      }
      let expected = 0;
      const { level } = game;
      for (let k = 0; k < level.kind.length; k++)
        if (level.kind[k] && level.kind[k] !== DOOR && !level.diag[k])
          expected++;
      assert.equal(Math.round(wallWidth / TILE), expected);
    }
  }],
];

console.log('# file: tests/add-static-box.test.mjs');
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
