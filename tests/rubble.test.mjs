import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vec2, Vec3 } from '@1pizzateam/roostr';
import { Game } from '../src/game.js';
import { Rubble, RUBBLE, severityOf, SURFACE, tierOf } from '../src/rubble.js';
import { blastFlatQuad, blastWallQuad, burnFlatQuad, burnWallQuad, IMPACT_CELL_COUNT, IMPACT_CELLS, impactAtlas, impactCellUv, SLASH_VARIANTS } from '../src/impacts.js';
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

const CELL = 64;
const TIERS = 3;
const BASES = 2;
const blastCells = () => Array.from({ length: 3 * TIERS * BASES }, (_, i) => IMPACT_CELLS.brokenWall + i);
function cellPixels(atlas, cell) {
  const out = new Uint8Array(CELL * CELL * 4);
  for (let y = 0; y < CELL; y++)
    out.set(atlas.data.subarray((y * atlas.width + cell * CELL) * 4, (y * atlas.width + (cell + 1) * CELL) * 4), y * CELL * 4);
  return out;
}
const lumsOf = (pixels) => {
  const out = [];
  for (let i = 0; i < pixels.length; i += 4)
    if (pixels[i + 3] >= 128)
      out.push(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
  return out.sort((a, b) => a - b);
};

function blastWorld() {
  const quads = [];
  const batch = { begin() { return this; }, quad(c) { quads.push(c); }, end() {} };
  const entries = (n) => Array.from({ length: n }, () => ({ gen: -1, ok: false, burnOk: false, quad: { corners: new Array(12).fill(0), uv: new Array(8).fill(0) }, burn: { corners: new Array(12).fill(0), uv: new Array(8).fill(0) } }));
  return { quads, world: { blasts: batch, blastQuads: [entries(RUBBLE.wall), entries(RUBBLE.floor), entries(RUBBLE.ceiling)] } };
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
    assert.equal(atlas.width, 64 * IMPACT_CELL_COUNT);
    const slashEnd = IMPACT_CELLS.slash + SLASH_VARIANTS;
    const starts = [IMPACT_CELLS.brokenWall, IMPACT_CELLS.brokenFloor, IMPACT_CELLS.brokenCeiling];
    assert.ok(starts[0] >= slashEnd);
    assert.equal(starts[1], starts[0] + 6);
    assert.equal(starts[2], starts[1] + 6);
    assert.ok(starts[2] + 6 <= IMPACT_CELL_COUNT);
    for (const start of starts)
      for (let cell = start; cell < start + 6; cell++) {
        let painted = 0;
        for (let y = 0; y < 64; y++)
          for (let x = 0; x < 64; x++)
            if (atlas.data[(y * atlas.width + cell * 64 + x) * 4 + 3] > 0)
              painted++;
        assert.ok(painted > 400, `cell ${cell} has ${painted} painted pixels`);
      }
  }],
  ['AC-4 quad builders place wall, floor and ceiling quads on the right plane', () => {
    const wall = { pos: new Vec3(128, 100, 30), normal: new Vec2(1, 0), top: 64, seed: 5, tier: 1, lo: -30, hi: 30, slope: 0, size: 30 };
    const quad = blastWallQuad(wall);
    for (let k = 0; k < 12; k += 3) {
      assert.ok(quad.corners[k] > 128 && quad.corners[k] < 128.5, 'wall quad stands off the face along its normal');
      assert.ok(quad.corners[k + 1] >= 0 && quad.corners[k + 1] <= 64);
    }
    const cell = IMPACT_CELLS.brokenWall + 2 + (wall.seed % 4 & 1);
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
    assert.equal(floor.uv[0], (IMPACT_CELLS.brokenFloor + 4 + (3 & 1)) / IMPACT_CELL_COUNT);
    assert.equal(ceiling.uv[0], (IMPACT_CELLS.brokenCeiling + (3 & 1)) / IMPACT_CELL_COUNT);
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
  ['AC-1 atlas is a single 64 px row with unchanged legacy cells', () => {
    const atlas = impactAtlas();
    assert.equal(atlas.width, CELL * IMPACT_CELL_COUNT);
    assert.equal(atlas.height, CELL);
    assert.equal(atlas.frames, IMPACT_CELL_COUNT);
    const px = (cell, x, y) => atlas.data.subarray((y * atlas.width + cell * CELL + x) * 4, (y * atlas.width + cell * CELL + x) * 4 + 4);
    for (const cell of [IMPACT_CELLS.hole + 3, IMPACT_CELLS.spark + 1, IMPACT_CELLS.slash + 2])
      for (let y = 0; y < CELL; y += 2)
        for (let x = 0; x < CELL; x += 2) {
          const a = px(cell, x, y);
          for (const [dx, dy] of [[1, 0], [0, 1], [1, 1]])
            assert.deepEqual(px(cell, x + dx, y + dy), a, `cell ${cell} is a 2x upscale at ${x},${y}`);
        }
    assert.equal(impactCellUv(IMPACT_CELL_COUNT - 1)[2], 1);
  }],
  ['AC-2 blast cell layout is non-overlapping and inside the atlas', () => {
    const slashEnd = IMPACT_CELLS.slash + SLASH_VARIANTS;
    assert.ok(IMPACT_CELLS.brokenWall >= slashEnd);
    assert.equal(IMPACT_CELLS.brokenFloor, IMPACT_CELLS.brokenWall + TIERS * BASES);
    assert.equal(IMPACT_CELLS.brokenCeiling, IMPACT_CELLS.brokenFloor + TIERS * BASES);
    assert.ok(IMPACT_CELLS.brokenCeiling + TIERS * BASES <= IMPACT_CELL_COUNT);
  }],
  ['AC-3 every blast cell is deterministic, soft edged, opaque enough and layered', () => {
    const a = impactAtlas();
    const b = impactAtlas();
    for (const cell of blastCells()) {
      const pixels = cellPixels(a, cell);
      assert.deepEqual(pixels, cellPixels(b, cell), `cell ${cell} is deterministic`);
      for (let y = 0; y < CELL; y++)
        for (let x = 0; x < CELL; x++)
          if (x < 3 || y < 3 || x >= CELL - 3 || y >= CELL - 3)
            assert.equal(pixels[(y * CELL + x) * 4 + 3], 0, `cell ${cell} edge ${x},${y} is clear`);
      const lums = lumsOf(pixels);
      assert.ok(lums.length >= 600, `cell ${cell} has ${lums.length} opaque pixels`);
      assert.ok(new Set(lums.map((l) => Math.floor(l / 16))).size > 5, `cell ${cell} has more than 5 tonal bands`);
      const median = lums[lums.length >> 1];
      assert.ok(lums[lums.length - 1] >= median * 1.5, `cell ${cell} has a lit rim`);
      assert.ok(lums[0] <= median * 0.6, `cell ${cell} has deep shadow`);
    }
  }],
  ['AC-4 bases differ and damage escalates with tier on every surface', () => {
    const atlas = impactAtlas();
    for (const start of [IMPACT_CELLS.brokenWall, IMPACT_CELLS.brokenFloor, IMPACT_CELLS.brokenCeiling]) {
      let lastCount = 0;
      let lastDark = -1;
      for (let tier = 0; tier < TIERS; tier++) {
        const one = cellPixels(atlas, start + tier * BASES);
        const two = cellPixels(atlas, start + tier * BASES + 1);
        let differ = 0;
        for (let i = 3; i < one.length; i += 4)
          if ((one[i] >= 128) !== (two[i] >= 128))
            differ++;
        assert.ok(differ >= lumsOf(one).length * 0.05, `surface ${start} tier ${tier} bases differ (${differ})`);
        const count = (lumsOf(one).length + lumsOf(two).length) / 2;
        const dark = (lumsOf(one).filter((l) => l < 45).length / lumsOf(one).length + lumsOf(two).filter((l) => l < 45).length / lumsOf(two).length) / 2;
        assert.ok(count > lastCount, `surface ${start} opaque count grows at tier ${tier}`);
        assert.ok(dark > lastDark, `surface ${start} dark share grows at tier ${tier} (${dark})`);
        lastCount = count;
        lastDark = dark;
      }
    }
  }],
  ['AC-5 variants pick the base and mirror and keep planes and determinism', () => {
    const wall = { pos: new Vec3(128, 100, 30), normal: new Vec2(1, 0), top: 64, seed: 5, lo: -30, hi: 30, slope: 0, size: 30 };
    for (let tier = 0; tier < TIERS; tier++) {
      const uvs = new Set();
      for (let variant = 0; variant < 4; variant++) {
        const quad = blastWallQuad({ ...wall, tier, variant });
        const cell = IMPACT_CELLS.brokenWall + tier * BASES + (variant & 1);
        const lo = cell / IMPACT_CELL_COUNT;
        const hi = (cell + 1) / IMPACT_CELL_COUNT;
        assert.ok(quad.uv[0] >= lo - 1e-9 && quad.uv[0] <= hi + 1e-9 && quad.uv[2] >= lo - 1e-9 && quad.uv[2] <= hi + 1e-9);
        if (variant & 2)
          assert.ok(quad.uv[0] > quad.uv[2], 'mirrored U runs backwards');
        else
          assert.ok(quad.uv[0] < quad.uv[2]);
        for (let k = 0; k < 12; k += 3)
          assert.ok(quad.corners[k] > 128 && quad.corners[k] < 128.5, 'wall quad stands off its face');
        assert.deepEqual(blastWallQuad({ ...wall, tier, variant }), quad);
        uvs.add(quad.uv.join());
        for (const ceiling of [false, true]) {
          const flat = blastFlatQuad({ pos: new Vec3(50, 60, 0), seed: 3, tier, size: 40, ceiling, variant });
          const start = ceiling ? IMPACT_CELLS.brokenCeiling : IMPACT_CELLS.brokenFloor;
          assert.equal(flat.uv[0], (start + tier * BASES + (variant & 1)) / IMPACT_CELL_COUNT);
          for (let k = 0; k < 12; k += 3)
            assert.ok(ceiling ? flat.corners[k + 1] < 64 && flat.corners[k + 1] > 63.5 : flat.corners[k + 1] > 0 && flat.corners[k + 1] < 0.5);
        }
      }
      assert.equal(uvs.size, 4, 'four variants, four different quads');
    }
  }],
  ['AC-6 door blast marks keep the mark variant and syncDoorMarks does not allocate', () => {
    const source = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
    const body = methodBody(source, 'syncDoorMarks');
    assert.ok(body.includes('fillDoorBlast(mark'));
    assert.ok(source.slice(source.indexOf('function fillDoorBlast')).split('\n}\n')[0].includes('bm.variant = mark.variant'));
    assert.ok(!/\bnew\b|=>|\{\}|\[\]/.test(body), 'syncDoorMarks allocates nothing');
    const out = { corners: new Array(12), uv: new Array(4) };
    const mark = { pos: new Vec3(128, 100, 30), normal: new Vec2(1, 0), top: 64, seed: 5, tier: 1, lo: -30, hi: 30, slope: 0, size: 30, variant: 3 };
    assert.equal(blastWallQuad(mark, out), out);
  }],
  ['AC-3 burn backdrop cells are soft, dark, wider than the crater and deterministic', () => {
    const a = impactAtlas();
    const b = impactAtlas();
    const width = a.width;
    assert.ok(IMPACT_CELLS.burn + 6 <= IMPACT_CELL_COUNT && IMPACT_CELLS.burn >= IMPACT_CELLS.brokenCeiling + 6);
    const opaque = [];
    for (let n = 0; n < 6; n++) {
      const cell = IMPACT_CELLS.burn + n;
      let count = 0;
      for (let y = 0; y < CELL; y++)
        for (let x = 0; x < CELL; x++) {
          const o = (y * width + cell * CELL + x) * 4;
          assert.equal(a.data[o + 3], b.data[o + 3]);
          assert.equal(a.data[o], b.data[o]);
          if (x < 3 || y < 3 || x >= CELL - 3 || y >= CELL - 3)
            assert.equal(a.data[o + 3], 0, 'border stays clear');
          if (a.data[o + 3] > 0) {
            count++;
            assert.ok(a.data[o] < 120, 'soot is dark');
          }
        }
      opaque.push(count);
    }
    assert.ok(opaque.every((n) => n >= 500), 'each burn is a wide patch');
    for (const start of [0, 3])
      assert.ok(opaque[start] < opaque[start + 1] && opaque[start + 1] < opaque[start + 2], 'burn grows with the tier');
  }],
  ['AC-5 burn quads sit under the damage, are wider and stay in their cell', () => {
    const wall = { pos: new Vec3(128, 100, 30), normal: new Vec2(1, 0), top: 64, seed: 5, tier: 2, lo: -100, hi: 100, slope: 0, size: 20, variant: 0 };
    const blast = blastWallQuad(wall);
    const burn = burnWallQuad(wall);
    const span = (q) => Math.abs(q.corners[7] - q.corners[1]);
    assert.ok(span(burn) > span(blast), 'wider than the crater');
    assert.ok(burn.corners[0] < blast.corners[0], 'behind the damage along the normal');
    const a0 = (IMPACT_CELLS.burn + 2) / IMPACT_CELL_COUNT;
    assert.ok(burn.uv[0] >= a0 - 1e-9 && burn.uv[2] <= a0 + 1 / IMPACT_CELL_COUNT + 1e-9);
    assert.deepEqual(burnWallQuad(wall), burn);
    for (const ceiling of [false, true]) {
      const flat = { pos: new Vec3(100, 100, 0), seed: 1, tier: 1, size: 20, ceiling, variant: 1 };
      const f = blastFlatQuad(flat);
      const bf = burnFlatQuad(flat);
      assert.ok(Math.abs(bf.corners[3] - bf.corners[0]) > Math.abs(f.corners[3] - f.corners[0]) || Math.abs(bf.corners[5] - bf.corners[2]) > 0);
      assert.ok(ceiling ? bf.corners[1] > f.corners[1] : bf.corners[1] < f.corners[1]);
      assert.equal(bf.uv[0], (IMPACT_CELLS.burn + 4) / IMPACT_CELL_COUNT);
    }
  }],
  ['AC-7 blasts leave gameplay unchanged', () => {
    const run = (stub) => {
      const game = gameOf(ROOM);
      if (stub)
        game.blastSurfaces = () => {};
      game.detonateRocket(rocketAt(game, 4 * 64 + 32, 2 * 64 + 32));
      const marks = [];
      for (let kind = 0; kind < 3; kind++)
        for (let i = 0; i < game.rubble.length(kind); i++) {
          const m = game.rubble.slots[kind][i];
          marks.push([m.kind, m.tier, m.seed, m.variant, m.size]);
        }
      return { marks, next: game.rand.float(0, 1), health: game.player.health };
    };
    const first = run(false);
    assert.ok(first.marks.length > 0);
    assert.deepEqual(run(false), first, 'same marks every run');
    assert.ok(first.marks.every((m) => m[3] === m[2] % 4));
    const stubbed = run(true);
    assert.equal(first.next, stubbed.next);
    assert.equal(first.health, stubbed.health);
  }],
  ['AC-1 oldest slot is index 0 until the ring wraps then the cursor', () => {
    const rubble = new Rubble();
    const normal = new Vec2(1, 0);
    const span = { lo: -20, hi: 20, top: 64, slope: 0, door: null };
    for (let i = 0; i < 5; i++)
      rubble.addWall(new Vec3(i, 10, 30), normal, 0.5, span);
    assert.equal(rubble.oldest(SURFACE.WALL), 0);
    assert.equal(rubble.oldest(SURFACE.FLOOR), 0);
    for (let i = 5; i < RUBBLE.wall + 5; i++)
      rubble.addWall(new Vec3(i, 10, 30), normal, 0.5, span);
    const n = rubble.length(SURFACE.WALL);
    const start = rubble.oldest(SURFACE.WALL);
    assert.equal(start, rubble.cursors[SURFACE.WALL]);
    for (let j = 1; j < n; j++)
      assert.ok(rubble.slots[SURFACE.WALL][(start + j) % n].x > rubble.slots[SURFACE.WALL][(start + j - 1) % n].x);
  }],
  ['AC-2 syncBlasts emits all scorch before all damage, oldest first', () => {
    const rubble = new Rubble();
    const { world, quads } = blastWorld();
    const span = { lo: -1000, hi: 1000, top: 64, slope: 0, door: null };
    for (let i = 0; i < RUBBLE.wall + 4; i++)
      rubble.addWall(new Vec3(100 + i * 2, 10, 30), new Vec2(0, 1), 0.5, span);
    rubble.addFloor(new Vec3(50, 50, 0), 0.5);
    rubble.addCeiling(new Vec3(60, 60, 64), 0.5);
    World.prototype.syncBlasts.call(world, rubble);
    const half = quads.length / 2;
    assert.ok(half > 0 && Number.isInteger(half));
    const burnSet = new Set();
    for (let k = 0; k < 3; k++)
      for (const e of world.blastQuads[k])
        if (e.burnOk)
          burnSet.add(e.burn.corners);
    for (let i = 0; i < quads.length; i++)
      assert.equal(burnSet.has(quads[i]), i < half, `quad ${i} is in the right pass`);
    const wallScorch = quads.slice(0, half).filter((c) => Math.abs(c[2] - 10) < 1);
    assert.ok(wallScorch.length > 2, 'wall scorch quads found');
    const xs = wallScorch.map((c) => Math.min(c[0], c[3], c[6], c[9]));
    for (let i = 1; i < xs.length; i++)
      assert.ok(xs[i] >= xs[i - 1], 'wall scorch oldest first');
  }],
  ['AC-3 syncBlasts skips door marks and keeps the gen cache', () => {
    const rubble = new Rubble();
    const { world, quads } = blastWorld();
    const normal = new Vec2(0, 1);
    const span = { lo: -1000, hi: 1000, top: 64, slope: 0, door: null };
    rubble.addWall(new Vec3(100, 10, 30), normal, 0.5, span);
    rubble.addWall(new Vec3(300, 10, 30), normal, 0.5, { ...span, door: {} });
    rubble.addWall(new Vec3(500, 10, 30), normal, 0.5, span);
    World.prototype.syncBlasts.call(world, rubble);
    const perMark = quads.length;
    assert.ok(perMark >= 2 && perMark <= 4, 'two walls emit, the door one does not');
    const gens = world.blastQuads[SURFACE.WALL].map((e) => e.gen);
    assert.equal(gens[1], -1, 'door slot is never built');
    quads.length = 0;
    World.prototype.syncBlasts.call(world, rubble);
    assert.deepEqual(world.blastQuads[SURFACE.WALL].map((e) => e.gen), gens);
    assert.equal(quads.length, perMark);
    const before = world.blastQuads[SURFACE.WALL][0].quad.corners.slice();
    rubble.slots[SURFACE.WALL][0].x = 700;
    rubble.slots[SURFACE.WALL][0].gen++;
    World.prototype.syncBlasts.call(world, rubble);
    const after = world.blastQuads[SURFACE.WALL].map((e) => e.gen);
    assert.notEqual(after[0], gens[0]);
    assert.equal(after[2], gens[2]);
    assert.notDeepEqual(world.blastQuads[SURFACE.WALL][0].quad.corners, before);
  }],
  ['AC-4 syncDoorMarks orders scorch then damage and keeps the newest 12', () => {
    const rubble = new Rubble();
    const door = { open: 0, idx: 0, secret: false };
    const span = { lo: -1000, hi: 1000, top: 64, slope: 0, door };
    for (let i = 0; i < 14; i++)
      rubble.addWall(new Vec3(100 + i * 20, 50, 30), new Vec2(0, 1), 0.5, span);
    rubble.addWall(new Vec3(900, 50, 30), new Vec2(0, 1), 0.5, { ...span, door: null });
    const quads = [];
    const record = { begin() { return this; }, quad(c) { quads.push(c.slice()); }, end() {}, show() {} };
    const none = { begin() { return this; }, quad() {}, end() {}, show() {} };
    const mock = { level: { baseHeight: [20] }, doorMarks: new Map(), doorBatch: (cap) => (cap === 24 ? record : none), doorSplatBatch: () => none };
    World.prototype.syncDoorMarks.call(mock, door, { holes: [], walls: [], holesVersion: 1, version: 1, dripping: false }, true, rubble);
    assert.equal(quads.length, 24);
    const minX = (c) => Math.min(c[0], c[3], c[6], c[9]);
    const scorch = quads.slice(0, 12).map(minX);
    const damage = quads.slice(12).map(minX);
    for (const list of [scorch, damage])
      for (let i = 1; i < list.length; i++)
        assert.ok(list[i] > list[i - 1], 'oldest to newest');
    assert.ok(Math.max(...scorch) > Math.max(...damage) - 60 && Math.min(...scorch) < Math.min(...damage), 'scorch is wider than damage');
    assert.ok(Math.min(...scorch) > 100 + 20 * 2 - 60, 'the two oldest door marks are dropped');
  }],
  ['AC-5 blast batches disable depth writes while holes keep them', () => {
    const src = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
    assert.ok(src.includes('this.blasts.setDepthWrite(false)'));
    assert.ok(src.includes('blastBatch.setDepthWrite'));
    assert.ok(!/holes[A-Za-z]*\.setDepthWrite\(false\)/.test(src));
    assert.ok(!/this\.holes[A-Za-z]*\.setDepthWrite/.test(src));
  }],
  ['AC-6 quad offsets are unchanged and below the bullet hole layer', () => {
    const wall = { pos: new Vec3(100, 50, 30), normal: new Vec2(0, 1), top: 64, lo: -1000, hi: 1000, slope: 0, size: 30, variant: 0, ceiling: false };
    const dist = (q) => q.corners[2] - 50;
    const blast = blastWallQuad(wall);
    const burn = burnWallQuad(wall);
    assert.ok(Math.abs(Math.abs(dist(blast)) - 0.15) < 1e-6);
    assert.ok(Math.abs(Math.abs(dist(burn)) - 0.1) < 1e-6);
    for (const ceiling of [false, true]) {
      const flat = { pos: new Vec3(100, 50, ceiling ? 64 : 0), size: 30, variant: 0, ceiling };
      const base = ceiling ? 64 : 0;
      assert.ok(Math.abs(Math.abs(blastFlatQuad(flat).corners[1] - base) - 0.15) < 1e-6);
      assert.ok(Math.abs(Math.abs(burnFlatQuad(flat).corners[1] - base) - 0.1) < 1e-6);
    }
    assert.ok(0.1 < 0.15 && 0.15 < 0.25);
  }],
  ['AC-7 syncBlasts and syncDoorMarks stay allocation free and use ring order', () => {
    const src = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
    const blasts = methodBody(src, 'syncBlasts');
    assert.ok(!/\bnew\b|=>|\{\}|\[\]|\bfunction\b/.test(blasts));
    assert.ok(blasts.includes('oldest('));
    assert.ok(!/\bnew\b|=>|\{\}|\[\]/.test(methodBody(src, 'syncDoorMarks')));
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
