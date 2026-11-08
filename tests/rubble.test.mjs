import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vec2, Vec3 } from '@1pizzateam/roostr';
import { Game } from '../src/game.js';
import { Rubble, RUBBLE, severityOf, SURFACE, tierOf } from '../src/rubble.js';
import { blastFlatQuad, blastWallQuad, IMPACT_CELL_COUNT, IMPACT_CELLS, impactAtlas, SLASH_VARIANTS } from '../src/impacts.js';
import { BLOOD } from '../src/blood.js';
import { World } from '../src/world.js';

const ROOM = ['#############', '#...........#', '#.P.........#', '#...........#', '#############'];

function gameOf(rows) {
  const game = new Game();
  game.load({ name: 'Rubble test', rows });
  game.state = 'play';
  return game;
}

const rocketAt = (game, x, y, radius = 175) => ({ kind: 'rocket', team: 'player', pos: new Vec2(x, y), radius, splash: 0, damage: 0, dead: false });
const kinds = (rubble) => [rubble.length(SURFACE.WALL), rubble.length(SURFACE.FLOOR), rubble.length(SURFACE.CEILING)];
const total = (rubble) => kinds(rubble).reduce((a, b) => a + b, 0);

function methodBody(source, name) {
  const start = source.indexOf(`\n  ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  const next = source.indexOf('\n  }\n', start);
  return source.slice(start, next);
}

const checks = [
  ['AC-1 ledger records scalar marks, bumps version and evicts the oldest at the cap', () => {
    const rubble = new Rubble();
    const normal = new Vec2(1, 0);
    const span = { lo: -20, hi: 20, top: 64, slope: 0, door: null };
    let version = rubble.version;
    const first = rubble.addWall(new Vec3(10, 10, 30), normal, 0.5, span);
    assert.ok(rubble.version > version);
    const firstGen = first.gen;
    for (let i = 0; i < RUBBLE.wall + 10; i++) {
      version = rubble.version;
      rubble.addWall(new Vec3(i, 10, 30), normal, 0.5, span);
      assert.ok(rubble.version > version, 'version rises on every append');
    }
    for (let i = 0; i < RUBBLE.floor + 5; i++)
      rubble.addFloor(new Vec3(i, 0, 0), 1);
    for (let i = 0; i < RUBBLE.ceiling + 5; i++)
      rubble.addCeiling(new Vec3(i, 0, 0), 0.2);
    assert.deepEqual(kinds(rubble), [RUBBLE.wall, RUBBLE.floor, RUBBLE.ceiling]);
    assert.notEqual(first.gen, firstGen, 'the oldest slot was rewritten');
    for (let kind = 0; kind < 3; kind++)
      for (let i = 0; i < rubble.length(kind); i++) {
        const mark = rubble.slots[kind][i];
        assert.equal(mark.kind, kind);
        assert.ok(mark.severity >= 0 && mark.severity <= 1);
        assert.ok(Number.isFinite(mark.x) && Number.isFinite(mark.y) && Number.isInteger(mark.variant));
        assert.equal(typeof mark.seed, 'number');
      }
  }],
  ['AC-2 severity falls off with distance and maps to three tiers', () => {
    assert.ok(severityOf(0, 100, 1) <= 1);
    let last = Infinity;
    for (let d = 0; d < 100; d += 10) {
      const s = severityOf(d, 100, 1);
      assert.ok(s < last, `severity at ${d} is below the nearer one`);
      last = s;
    }
    assert.equal(severityOf(100, 100, 1), 0);
    assert.equal(severityOf(250, 100, 1), 0);
    assert.equal(tierOf(0.1), 0);
    assert.equal(tierOf(0.34 - 1e-4), 0);
    assert.equal(tierOf(0.34), 1);
    assert.equal(tierOf(0.67 - 1e-4), 1);
    assert.equal(tierOf(0.67), 2);
    assert.equal(tierOf(1), 2);
    const rubble = new Rubble();
    const version = rubble.version;
    assert.equal(rubble.addFloor(new Vec3(1, 1, 0), 0), null);
    assert.equal(rubble.version, version, 'a blast too weak to mark leaves no mark');
    assert.equal(total(rubble), 0);
  }],
  ['AC-3 atlas keeps its size and the new cells are painted and non-overlapping', () => {
    const atlas = impactAtlas();
    assert.equal(atlas.width, 32 * IMPACT_CELL_COUNT);
    const slashEnd = IMPACT_CELLS.slash + SLASH_VARIANTS;
    const starts = [IMPACT_CELLS.brokenWall, IMPACT_CELLS.brokenFloor, IMPACT_CELLS.brokenCeiling];
    assert.ok(starts[0] >= slashEnd);
    assert.equal(starts[1], starts[0] + 3);
    assert.equal(starts[2], starts[1] + 3);
    assert.ok(starts[2] + 3 <= IMPACT_CELL_COUNT);
    for (const start of starts)
      for (let tier = 0; tier < 3; tier++) {
        let painted = 0;
        for (let y = 0; y < 32; y++)
          for (let x = 0; x < 32; x++)
            if (atlas.data[(y * atlas.width + (start + tier) * 32 + x) * 4 + 3] > 0)
              painted++;
        assert.ok(painted > 100, `cell ${start + tier} has ${painted} painted pixels`);
      }
  }],
  ['AC-4 quad builders place wall, floor and ceiling quads on the right plane', () => {
    const wall = { pos: new Vec3(128, 100, 30), normal: new Vec2(1, 0), top: 64, seed: 5, tier: 1, lo: -30, hi: 30, slope: 0, size: 30 };
    const quad = blastWallQuad(wall);
    for (let k = 0; k < 12; k += 3) {
      assert.ok(quad.corners[k] > 128 && quad.corners[k] < 128.5, 'wall quad stands off the face along its normal');
      assert.ok(quad.corners[k + 1] >= 0 && quad.corners[k + 1] <= 64);
    }
    const cell = IMPACT_CELLS.brokenWall + 1;
    assert.ok(quad.uv[0] >= cell / IMPACT_CELL_COUNT - 1e-9 && quad.uv[2] <= (cell + 1) / IMPACT_CELL_COUNT + 1e-9);
    assert.deepEqual(blastWallQuad(wall), quad, 'the same record builds the same quad');
    assert.equal(blastWallQuad({ ...wall, lo: -10, hi: -9.9 }), null, 'a degenerate span leaves nothing');

    const floor = blastFlatQuad({ pos: new Vec3(50, 60, 0), seed: 3, tier: 2, size: 40 });
    const ceiling = blastFlatQuad({ pos: new Vec3(50, 60, 0), seed: 3, tier: 0, size: 40, ceiling: true });
    for (let k = 0; k < 12; k += 3) {
      assert.ok(floor.corners[k + 1] > 0 && floor.corners[k + 1] < 0.5, 'floor quad hovers just above the floor');
      assert.ok(ceiling.corners[k + 1] < 64 && ceiling.corners[k + 1] > 63.5, 'ceiling quad hangs just below the ceiling');
      assert.ok(Math.abs(floor.corners[k] - 50) === 20 && Math.abs(floor.corners[k + 2] - 60) === 20);
    }
    assert.equal(floor.uv[0], (IMPACT_CELLS.brokenFloor + 2) / IMPACT_CELL_COUNT);
    assert.equal(ceiling.uv[0], IMPACT_CELLS.brokenCeiling / IMPACT_CELL_COUNT);
    assert.deepEqual(blastFlatQuad({ pos: new Vec3(50, 60, 0), seed: 3, tier: 2, size: 40 }), floor);
  }],
  ['AC-5 a rocket blast marks walls, floor and ceiling but never through walls', () => {
    const open = gameOf(ROOM);
    open.detonateRocket(rocketAt(open, 4 * 64 + 32, 2 * 64 + 32));
    const counts = kinds(open.rubble);
    assert.ok(counts.every((n) => n > 0), `walls, floor and ceiling are marked: ${counts}`);

    const split = gameOf(['##########', '#...#....#', '#.P.#....#', '#...#....#', '##########']);
    split.detonateRocket(rocketAt(split, 2 * 64 + 32, 2 * 64 + 32, 400));
    const walls = split.rubble.slots[SURFACE.WALL];
    assert.ok(split.rubble.length(SURFACE.WALL) > 0);
    for (let i = 0; i < split.rubble.length(SURFACE.WALL); i++)
      assert.ok(walls[i].x <= 4 * 64 + 1, `no wall mark behind the dividing wall, found one at ${walls[i].x}`);
    const floors = split.rubble.slots[SURFACE.FLOOR];
    for (let i = 0; i < split.rubble.length(SURFACE.FLOOR); i++)
      assert.ok(floors[i].x < 4 * 64, 'no floor mark in the room behind the wall');
  }],
  ['AC-6 barrel, grenade and fireball blasts use blastSurfaces and keep gameplay deterministic', () => {
    const rows = ['#############', '#...........#', '#.P....x..i.#', '#...........#', '#############'];
    const outcome = (stub) => {
      const game = gameOf(rows);
      let calls = 0;
      const real = game.blastSurfaces;
      game.blastSurfaces = stub ? () => {} : function (...args) { calls++; return real.apply(this, args); };
      game.detonate(game.barrels[0]);
      const grenade = game.addGrenade(new Vec2(4 * 64, 2 * 64 + 32), new Vec2(1, 0));
      game.detonateRocket(grenade);
      game.addShot(new Vec2(3 * 64, 3 * 64), new Vec2(1, 0), 100, 5);
      const fireball = game.shots[game.shots.length - 1];
      fireball.body.onCollision({ ref: { kind: 'wall' } });
      return {
        health: game.enemies.map((e) => e.hp),
        kills: game.kills,
        playerHealth: game.player.health,
        next: game.rand.float(0, 1),
        calls,
        marks: total(game.rubble),
      };
    };
    const real = outcome(false);
    const stubbed = outcome(true);
    assert.equal(real.calls, 3, 'barrel, grenade and fireball each record blast marks');
    assert.ok(real.marks > 0);
    assert.equal(stubbed.marks, 0);
    assert.deepEqual({ ...real, calls: 0, marks: 0 }, { ...stubbed, calls: 0, marks: 0 });
  }],
  ['AC-7 slime, pit, sky and sunken-door surfaces are never marked and door marks keep their size', () => {
    const slime = gameOf(['###########', '#P~~~~~~~~#', '#~~~~~~~~~#', '#~~~~~~~~~#', '###########']);
    slime.detonateRocket(rocketAt(slime, 6 * 64 + 32, 2 * 64 + 32, 60));
    assert.equal(slime.rubble.length(SURFACE.FLOOR), 0, 'no mark on acid or pits');
    assert.ok(slime.rubble.length(SURFACE.CEILING) > 0);

    const mars = new Game();
    mars.load(4);
    mars.state = 'play';
    const sky = mars.level;
    let outdoor = null;
    for (let i = 0; i < sky.width * sky.rowCount && !outdoor; i++)
      if (sky.heights[i] <= 0 && sky.outdoor?.has(i))
        outdoor = new Vec2((i % sky.width + 0.5) * 64, (Math.floor(i / sky.width) + 0.5) * 64);
    assert.ok(outdoor, 'the Red Planet has open sky');
    mars.rubble.reset(sky);
    mars.blastSurfaces(outdoor, 175, 1);
    assert.equal(mars.rubble.length(SURFACE.CEILING), 0, 'no mark on open sky');

    const doors = gameOf(['#######', '#..D..#', '#.P...#', '#######']);
    const door = [...doors.level.doors.values()][0];
    const faceAt = (open) => {
      door.open = open;
      doors.level.heights[door.idx] = doors.level.baseHeight[door.idx] * (1 - open);
      doors.rubble.reset(doors.level);
      doors.blastSurfaces(new Vec2(door.center.x - 40, door.center.y), 120, 1);
      return doors.rubble.slots[SURFACE.WALL].slice(0, doors.rubble.length(SURFACE.WALL)).filter((m) => m.door === door);
    };
    assert.ok(faceAt(0).length > 0, 'a closed door takes blast marks that belong to it');
    assert.equal(faceAt(1).length, 0, 'a door sunk into the floor takes none');
    const closed = faceAt(0)[0];
    const quad = (mark, open) => blastWallQuad({ pos: new Vec3(mark.x, mark.y, mark.z - open * mark.top), normal: new Vec2(mark.nx, mark.ny), top: mark.top * (1 - open), seed: mark.seed, tier: mark.tier, lo: mark.lo, hi: mark.hi, slope: mark.slope, size: mark.size });
    const wide = (q) => Math.hypot(q.corners[3] - q.corners[0], q.corners[5] - q.corners[2]);
    assert.equal(wide(quad(closed, 0)), wide(quad(closed, 0.25)), 'sliding does not rescale the mark');
  }],
  ['AC-8 blasts never evict bullet holes and level reload clears the ledger', () => {
    const game = gameOf(ROOM);
    for (let i = 0; i < 8; i++)
      game.blood.impact(new Vec3(64, 2 * 64 + 32, 20 + i), new Vec2(1, 0));
    const holes = game.blood.holes.length;
    assert.ok(holes > 0 && holes <= BLOOD.holes);
    for (let i = 0; i < 12; i++)
      game.detonateRocket(rocketAt(game, (2 + i % 8) * 64 + 20, 2 * 64 + 32));
    assert.equal(game.blood.holes.length, holes, 'blast marks do not evict bullet holes');
    assert.ok(total(game.rubble) > 0);
    const version = game.rubble.version;
    game.load({ name: 'Rubble test', rows: ROOM });
    assert.equal(total(game.rubble), 0);
    assert.notEqual(game.rubble.version, version);

    const source = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
    const body = methodBody(source, 'syncBlasts');
    assert.ok(!/\bnew\b|=>|\{\}|\[\]|\bfunction\b/.test(body), 'syncBlasts allocates nothing');
    assert.equal(typeof World.prototype.syncBlasts, 'function');
  }],
];

console.log('# file: tests/rubble.test.mjs');
for (const [name, fn] of checks) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}
