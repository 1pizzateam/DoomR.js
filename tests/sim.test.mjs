import assert from 'node:assert/strict';
import { Vec2 } from '@1pizzateam/spock';
import { CAT, ENEMY_TYPES, Game } from '../src/game.js';
import { BLOOD } from '../src/blood.js';
import { RECIPES, spatial } from '../src/audio.js';
import { HOLE_VARIANTS, holeQuad, IMPACT_CELL_COUNT, IMPACT_CELLS, impactAtlas, impactCellUv, SPARK_FRAMES, SPARK_VARIANTS } from '../src/impacts.js';
import { LEVELS } from '../src/levels.js';
import { WEAPON_CELL_H, WEAPON_CELL_W, WEAPON_FRAME_COUNT, WEAPON_FRAMES, WEAPON_TIMES, weaponAtlas, weaponCellUv, weaponFrame, weaponPlacement } from '../src/weapon.js';
import { FIRE_COOLDOWN } from '../src/game.js';
import { CEILING_CELLS, ceilingAtlas, ceilingCellFor, ceilingCellUv } from '../src/ceiling.js';
import { WALL_CELL_COUNT, WALL_CELLS, wallAtlas, wallCellFor, wallFaceQuads } from '../src/wall.js';
import { DOOR_CELLS, DOOR_FRAGMENT, doorAtlas, doorBox } from '../src/door.js';
import { BARREL_ATLAS, barrelAtlas, skinBarrel } from '../src/barrel.js';
import { EXPLOSION_CELL, EXPLOSION_FRAMES, explosionAtlas } from '../src/explosion.js';
import { FLOOR_CELL_COUNT, FLOOR_CELLS, FLOOR_FRAGMENT, FLOOR_VERTEX, floorAtlas, floorCellFor, floorCellUv, TILE_PIXELS } from '../src/floor.js';
import { CELLS, STEM_KINDS, TIP_HEIGHTS, TIP_KINDS, dripTime, wallDrips, wallDripQuads, screenSplatQuads, bloodAtlas, CELL, cellUv, floorSplatQuad, particleQuad, printQuad, wallSplatQuad } from '../src/bloodsprites.js';
import { DOOR } from '../src/level.js';
import { Quality } from '../src/quality.js';
import { MONSTERS } from '../src/monsters.js';
import { WRAITH_FRAMES, wraithAtlas } from '../src/sprites.js';
import { SHOTS, TitleDirector } from '../src/title.js';

const idle = { forward: 0, strafe: 0, turn: 0, mouseX: 0, run: false, fire: false, use: false };
const input = (patch) => ({ ...idle, ...patch });

function run(game, seconds, controls = idle) {
  for (let t = 0; t < seconds; t += 1 / 60)
    game.update(1 / 60, controls);
}

function fresh(levelIndex = 0) {
  const game = new Game();
  game.load(levelIndex);
  game.state = 'play';
  return game;
}

function clearEnemies(game) {
  for (const enemy of game.enemies)
    game.damageEnemy(enemy, 999);
  game.enemies = [];
  game.kills = 0;
}

const tests = {
  'bullet holes stay on their wall, even right at a corner'() {
    const game = new Game();
    game.load(1);
    const { level, blood } = game;
    const faces = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let marks = 0;
    for (let ty = 0; ty < level.rowCount; ty++) {
      for (let tx = 0; tx < level.width; tx++) {
        const i = ty * level.width + tx;
        if (!level.kind[i] || level.heights[i] <= 20 || level.kind[i] === DOOR) continue;
        for (const [nx, ny] of faces) {
          if (!level.inBounds(tx + nx, ty + ny) || level.heights[(ty + ny) * level.width + tx + nx] > 0) continue;
          // the face lies on the tile boundary on the side the normal points to
          const fx = (tx + (nx > 0 ? 1 : 0)) * 64;
          const fy = (ty + (ny > 0 ? 1 : 0)) * 64;
          for (const along of [0.2, 1, 5, 32, 59, 63, 63.8]) {
            const x = nx ? fx : tx * 64 + along;
            const y = ny ? fy : ty * 64 + along;
            blood.impact(x, y, nx, ny, 10);
            blood.wallSplat(x, y, 10, nx, ny, 9, level.heights[i]);
            marks += 2;
          }
        }
      }
    }
    assert.ok(marks > 100, 'expected plenty of test marks');
    const onWall = (px, py, nx, ny) => {
      // a point just behind the face must be inside a wall tile of this very wall
      const wx = Math.floor((px - nx * 1) / 64);
      const wy = Math.floor((py - ny * 1) / 64);
      return level.inBounds(wx, wy) && level.heights[wy * level.width + wx] > 0;
    };
    for (const mark of blood.holes) {
      const quad = holeQuad(mark);
      if (!quad)
        continue;
      const v = quad.corners;
      for (let k = 0; k < v.length; k += 3)
        assert.ok(onWall(v[k], v[k + 2], mark.nx, mark.ny), `a hole left its wall at ${v[k].toFixed(1)}, ${v[k + 2].toFixed(1)}`);
    }
  },

  'a face runs on past tile seams but stops at a corner and at a door'() {
    const game = new Game();
    game.load(0);
    const { blood, level } = game;
    // west face of the wall between the first two rooms: two wall tiles (rows 1 and 2) above a door
    const span = blood.faceSpan(5 * 64, 1 * 64 + 10, -1, 0);
    // the tangent of a west-facing wall points up the map: 10 units to the corner above, 118 down to the door
    assert.ok(Math.abs(span.hi - 10) < 0.01 && Math.abs(span.lo + 118) < 0.01, `got ${span.lo}..${span.hi}`);
    // the door below is its own tile, however long the wall around it is
    const door = level.doors.get(3 * level.width + 5);
    const own = blood.faceSpan(5 * 64, door.center.y, -1, 0, door);
    assert.ok(Math.abs(own.hi - own.lo - 64) < 0.01, `a door face is one tile wide, got ${own.hi - own.lo}`);
  },

  'marks on a door keep their size while it moves, and blood on a door belongs to the door'() {
    const game = new Game();
    game.load(0);
    const { blood, level } = game;
    const door = level.doors.get(3 * level.width + 5);
    const y = door.center.y;
    for (let i = 0; i < 80; i++)
      blood.hitWall({ x: 300, y, z: 30, vx: 100, vy: 0, gib: false }, 330, y);
    const onDoor = blood.walls.filter((w) => w.door === door);
    assert.ok(onDoor.length > 0, 'blood that hits a door should be attached to it');
    assert.ok(onDoor.length <= BLOOD.doorSplats, `door keeps at most ${BLOOD.doorSplats}, has ${onDoor.length}`);
    assert.ok(onDoor.every((w) => w.top === level.baseHeight[door.idx] && w.z <= w.top), 'kept at the door\'s full height');

    // a door slides down: marks keep their size and spacing, drop with it, and are cut off at the floor
    const hole = { x: 320, y, z: 40, nx: -1, ny: 0, top: 64, seed: 99, lo: -32, hi: 32 };
    const other = { ...hole, y: y + 5, z: 50, seed: 7 };
    const bounds = (quad, axis) => {
      let min = Infinity;
      let max = -Infinity;
      for (let k = axis; k < quad.corners.length; k += 3) {
        min = Math.min(min, quad.corners[k]);
        max = Math.max(max, quad.corners[k]);
      }
      return [min, max];
    };
    const at = (mark, open) => holeQuad({ ...mark, z: mark.z - open * 64, top: mark.top * (1 - open) });
    const [closedLow, closedHigh] = bounds(at(hole, 0), 1);
    const [halfLow, halfHigh] = bounds(at(hole, 0.25), 1);
    assert.ok(Math.abs((closedHigh - closedLow) - (halfHigh - halfLow)) < 1e-6, 'hole changed size');
    assert.ok(Math.abs((closedLow - halfLow) - 16) < 1e-6, 'hole should have dropped with the door');
    // two holes stay the same distance apart as the door opens, so they never run into each other
    const gap = (open) => bounds(at(other, open), 1)[0] - bounds(at(hole, open), 1)[0];
    assert.ok(Math.abs(gap(0) - gap(0.25)) < 1e-6, 'holes moved relative to each other');
    assert.equal(at(hole, 0.9), null, 'a mark that sank below the floor must be gone');
    for (const v of bounds(at(other, 0.5), 1))
      assert.ok(v >= 0.6 - 1e-9 && v <= 32 - 0.6 + 1e-9, 'a mark must stay within the door that is left');
  },

  'every monster has a model, a voice for being alerted, hurt and killed, and the level legend knows it'() {
    for (const type of Object.keys(ENEMY_TYPES)) {
      assert.ok(MONSTERS[type], `${type} has no model`);
      const voice = type[0].toUpperCase() + type.slice(1);
      for (const sound of ['alert', 'pain', 'die'])
        assert.equal(typeof RECIPES[sound + voice], 'function', `${type} has no ${sound} sound`);
    }
    for (const sound of ['stomp', 'slam', 'gib', 'leap', 'bite', 'rake'])
      assert.equal(typeof RECIPES[sound], 'function', `${sound} sound missing`);
    const spawned = new Set(LEVELS.flatMap((l) => l.rows.join('').split('')).filter((c) => 'icbswrB'.includes(c)));
    for (const c of 'scr') assert.ok(spawned.has(c), `no level uses ${c}`);
    assert.ok(spawned.has('B'), 'the warden is in no level');
  },

  'swarmers come in packs and wake together; the warden shakes the floor and drops health'() {
    const game = fresh();
    clearEnemies(game);
    const before = game.enemies.length;
    game.addEnemy('swarmer', new Vec2(20 * 64, 9 * 64 + 32));
    game.addEnemy('swarmer', new Vec2(20 * 64 + 20, 9 * 64 + 32));
    game.addEnemy('swarmer', new Vec2(20 * 64, 9 * 64 + 60));
    assert.equal(game.enemies.length, before + 3);
    game.wake(game.enemies[0]);
    assert.ok(game.enemies.every((e) => e.state === 'chase'), 'one swarmer woke, the pack should follow');

    const level = new Game();
    level.load(1);
    const warden = level.enemies.filter((e) => e.type === 'boss');
    assert.equal(warden.length, 1, 'level 2 should hold the warden');
    assert.ok(level.enemies.filter((e) => e.type === 'swarmer').length >= 4, 'a swarm spawn should make a pack');
    assert.ok(ENEMY_TYPES.boss.hp > ENEMY_TYPES.brute.hp * 3, 'the warden should be a real fight');
    level.wake(warden[0]);
    assert.ok(level.shake > 0, 'the warden waking should shake the floor');
    assert.ok(warden[0].roar > 1, 'and it should roar before it moves');
  },

  'a wraith is a flat sprite: it wails when it wakes, drifts in, rakes the player and drops no limbs'() {
    const atlas = wraithAtlas();
    assert.equal(atlas.data.length, atlas.width * atlas.height * 4);
    const count = (frame) => {
      let solid = 0;
      let eyes = 0;
      for (let y = 0; y < atlas.height; y++) {
        for (let x = 0; x < atlas.cell; x++) {
          const o = (y * atlas.width + frame * atlas.cell + x) * 4;
          solid += atlas.data[o + 3] ? 1 : 0;
          eyes += atlas.data[o + 1] === 255 ? 1 : 0;
        }
      }
      return { solid, eyes };
    };
    for (const frame of [0, 1, 2, 3, WRAITH_FRAMES.dying[0]]) {
      const { solid, eyes } = count(frame);
      assert.ok(solid > 200 && solid < atlas.cell * atlas.height, `frame ${frame} should be a shape, not a block`);
      assert.ok(eyes >= 4, `frame ${frame} should have eyes`);
    }
    // the death folds up and dissolves: each frame leaves less than the one before, and the eyes go out
    const dying = WRAITH_FRAMES.dying.map(count);
    for (let i = 1; i < dying.length; i++)
      assert.ok(dying[i].solid < dying[i - 1].solid, `death frame ${i} should have less of the wraith left`);
    assert.equal(dying[dying.length - 1].eyes, 0, 'the eyes should be out at the end');
    assert.ok(dying[dying.length - 1].solid > 10, 'embers should be left in the last frame');

    // blown apart, it turns red: the frames are mostly meat in the middle, and it thins out at the end
    const meat = (frame) => {
      let red = 0;
      for (let y = 0; y < atlas.height; y++) {
        for (let x = 0; x < atlas.cell; x++)
          red += atlas.data[(y * atlas.width + frame * atlas.cell + x) * 4 + 2] === 255 ? 1 : 0;
      }
      return red;
    };
    const bursting = WRAITH_FRAMES.bursting;
    assert.ok(meat(bursting[0]) > 0, 'it should crack open red before it goes');
    assert.ok(Math.max(...bursting.map(meat)) > 300, 'it should be a mass of red when it bursts');
    assert.ok(meat(bursting[bursting.length - 1]) < Math.max(...bursting.map(meat)), 'and thin out again');
    assert.equal(count(bursting[bursting.length - 1]).eyes, 0, 'the eyes should be out when it is gone');
    assert.ok(Object.values(WRAITH_FRAMES).flat().every((f) => f >= 0 && f < atlas.frames), 'every named frame exists');
    assert.equal(typeof MONSTERS.wraith.die, 'function', 'a wraith has a death of its own');

    const game = fresh();
    clearEnemies(game);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.health = 100;
    game.addEnemy('wraith', new Vec2(6 * 64 + 220, 9 * 64 + 32));
    const wraith = game.enemies[0];
    game.update(1 / 60, idle);
    game.events.length = 0;
    game.wake(wraith);
    assert.ok(game.events.some((e) => e.type === 'alert' && e.kind === 'wraith'), 'it should wail when it wakes');
    assert.ok(wraith.roar > 0, 'and stop to do it');
    let raked = false;
    for (let t = 0; t < 8 && !raked; t += 1 / 60) {
      game.update(1 / 60, idle);
      raked = game.events.some((e) => e.type === 'rake');
    }
    assert.ok(raked, 'it should reach the player and rake');
    assert.ok(game.player.health < 100, 'the rake should hurt');
    assert.equal(MONSTERS.wraith.build.length, 2);
  },

  'a crawler leaps and cannot be stopped mid-air; a skull keeps its distance'() {
    const game = fresh();
    clearEnemies(game);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.health = 100;
    game.addEnemy('crawler', new Vec2(6 * 64 + 200, 9 * 64 + 32));
    const crawler = game.enemies[0];
    game.wake(crawler);
    let leapt = false;
    for (let t = 0; t < 4 && !leapt; t += 1 / 60) {
      game.update(1 / 60, idle);
      leapt = game.events.some((e) => e.type === 'leap');
    }
    assert.ok(leapt, 'the crawler should leap');
    crawler.pain = 1;
    const speeds = [];
    for (let i = 0; i < 6; i++) {
      game.update(1 / 60, idle);
      speeds.push(crawler.body.velocity.getMagnitude());
    }
    assert.ok(Math.max(...speeds) > 300, 'a leaping crawler is not stopped by pain');

    clearEnemies(game);
    game.player.health = 100;
    game.addEnemy('skull', new Vec2(6 * 64 + 100, 9 * 64 + 32));
    const skull = game.enemies[0];
    game.wake(skull);
    run(game, 1.5);
    assert.ok(skull.pos.getDistance(game.player.pos) > 140, `skull closed in to ${skull.pos.getDistance(game.player.pos)}`);
  },

  'a monster killed up close is blown apart, one killed from afar is not'() {
    const game = fresh();
    clearEnemies(game);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.angle = 0;
    game.addEnemy('imp', new Vec2(6 * 64 + 60, 9 * 64 + 32));
    const near = game.enemies[0];
    near.hp = 1;
    game.update(1 / 60, input({ fire: true }));
    assert.equal(near.state, 'dead');
    assert.ok(near.gibbed, 'a point-blank kill should gib');
    assert.ok(game.events.some((e) => e.type === 'gib'), 'and make the sound');

    clearEnemies(game);
    game.player.cooldown = 0;
    game.addEnemy('imp', new Vec2(6 * 64 + 400, 9 * 64 + 32));
    const far = game.enemies[0];
    far.hp = 1;
    game.update(1 / 60, input({ fire: true }));
    if (far.state === 'dead')
      assert.ok(!far.gibbed, 'a kill from afar should leave a body');
  },

  'the warden is confined to his own room, which is found without crossing a door'() {
    const game = new Game();
    game.load(1);
    const { level } = game;
    assert.ok(level.arena && level.arena.size > 20, 'level 2 should have a giant\'s room');
    const [boss] = game.enemies.filter((e) => e.type === 'boss');
    assert.ok(level.inArena(boss.pos.x, boss.pos.y), 'the warden starts in his room');
    for (const door of level.doors.values())
      assert.ok(!level.arena.has(door.idx), 'a door is never part of the room');
    assert.equal(new Game().level.arena, null, 'a level without a giant has no such room');

    // wake him with the player waiting right outside a door, doors open, and let him chase for a long time
    for (const door of level.doors.values())
      level.setDoorOpen(door, 1);
    game.state = 'play';
    game.player.body.setPosition(new Vec2(4 * 64 + 32, 12 * 64 + 32));
    game.wake(boss);
    for (let t = 0; t < 25; t += 1 / 60) {
      game.player.health = 100;
      game.update(1 / 60, idle);
      for (const door of level.doors.values()) {
        game.level.setDoorOpen(door, 1);
        door.target = 1;
      }
      assert.ok(level.inArena(boss.pos.x, boss.pos.y), `the warden left his room at ${boss.pos.x.toFixed(0)}, ${boss.pos.y.toFixed(0)}`);
    }
  },

  'a barrel takes a couple of pellets to set off, then hurts what is near it, kills monsters in pieces and chains to neighbours'() {
    const game = fresh();
    clearEnemies(game);
    for (const barrel of game.barrels) game.scene.removeBody(barrel.body);
    game.barrels = [];
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.angle = 0;
    game.player.health = 100;
    game.addBarrel(new Vec2(10 * 64, 9 * 64 + 32));
    game.addBarrel(new Vec2(10 * 64 + 90, 9 * 64 + 32));
    game.addBarrel(new Vec2(18 * 64, 9 * 64 + 32));
    game.addEnemy('imp', new Vec2(10 * 64 + 40, 9 * 64 + 32 - 50));
    game.addEnemy('brute', new Vec2(10 * 64 + 40, 9 * 64 + 32 + 50));
    const [first, second, far] = game.barrels;
    const [imp, brute] = game.enemies;
    for (const enemy of game.enemies) enemy.def = { ...enemy.def, sight: 0 };

    game.hitBarrel(first, 3);
    assert.ok(first.fuse < 0 && first.hp === 3, 'one pellet should not set it off');
    // the shotgun does: six pellets at a barrel 4 tiles away
    game.player.cooldown = 0;
    game.events.length = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.ok(game.events.some((e) => e.type === 'clang'), 'pellets ring off a barrel');
    assert.ok(first.fuse >= 0 || first.gone, 'the first barrel should be burning');

    run(game, 0.1);
    assert.ok(first.gone, 'it should blow up shortly after');
    assert.ok(game.events.some((e) => e.type === 'boom'), 'and be heard');
    assert.equal(imp.state, 'dead', 'the imp next to it should be killed');
    assert.ok(imp.gibbed, 'and torn apart');
    assert.ok(brute.hp < ENEMY_TYPES.brute.hp, 'the brute should be hurt');
    assert.ok(game.shake > 0, 'the floor shakes');
    assert.ok(!second.gone, 'a neighbour does not go up in the same instant');
    run(game, 0.6);
    assert.ok(second.gone, 'the blast should chain to the barrel next to it');
    assert.ok(!far.gone, 'a barrel far away is left alone');
    assert.ok(game.scene.bodies.every((b) => b.ref?.kind !== 'barrel' || !b.ref.gone), 'a spent barrel must leave the scene');
  },

  'a blast is stopped by walls, and hurts the player in the open by how close they are'() {
    const game = fresh();
    clearEnemies(game);
    for (const barrel of game.barrels) game.scene.removeBody(barrel.body);
    game.barrels = [];
    // close, in the open
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.health = 100;
    game.addBarrel(new Vec2(6 * 64 + 50, 9 * 64 + 32));
    game.hitBarrel(game.barrels[0], 99, 0);
    run(game, 0.05);
    const near = 100 - game.player.health;
    assert.ok(near >= 20 && near <= 50, `blast next to the player did ${near}`);

    // further away it does less
    game.player.health = 100;
    game.addBarrel(new Vec2(6 * 64 + 150, 9 * 64 + 32));
    game.hitBarrel(game.barrels[1], 99, 0);
    run(game, 0.05);
    const far = 100 - game.player.health;
    assert.ok(far > 0 && far < near, `a further blast should hurt less (${far} vs ${near})`);

    // behind a wall it does nothing: the barrel is in the next room
    game.player.body.setPosition(new Vec2(2 * 64, 2 * 64 + 32));
    game.player.health = 100;
    game.addBarrel(new Vec2(7 * 64, 2 * 64 + 32));
    game.hitBarrel(game.barrels[2], 99, 0);
    run(game, 0.05);
    assert.equal(game.player.health, 100, 'a wall must stop the blast');
  },

  'barrels are solid, fireballs set them off, and every level has some'() {
    const game = fresh();
    assert.ok(game.barrels.length >= 3, 'level 1 should hold barrels');
    assert.ok(new Game().level.barrels.length === game.barrels.length);
    const barrel = game.barrels[0];
    game.player.body.setPosition(new Vec2(barrel.pos.x - 60, barrel.pos.y));
    game.player.body.setVelocity(new Vec2(160, 0));
    for (let i = 0; i < 60; i++) game.scene.step(1 / 60);
    assert.ok(game.player.pos.x < barrel.pos.x, 'the player should not walk through a barrel');

    clearEnemies(game);
    game.player.body.setPosition(new Vec2(2 * 64, 2 * 64 + 32));
    const x = barrel.pos.x;
    game.addShot(new Vec2(x - 60, barrel.pos.y), new Vec2(1, 0), 250, 10);
    run(game, 0.6);
    assert.ok(barrel.gone || barrel.fuse >= 0, 'a fireball should set a barrel off');
    const level2 = new Game();
    level2.load(1);
    assert.ok(level2.barrels.length >= 3, 'level 2 should hold barrels');
  },

  'the title film only ever puts its camera on open floor, and looks at something'() {
    const level = new Game().level;
    for (const [n, shot] of SHOTS.entries()) {
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        const x = shot.from[0] + (shot.to[0] - shot.from[0]) * u;
        const y = shot.from[1] + (shot.to[1] - shot.from[1]) * u;
        assert.ok(level.isWalkable(Math.floor(x / 64), Math.floor(y / 64)) && level.kind[Math.floor(y / 64) * level.width + Math.floor(x / 64)] === 0, `shot ${n} leaves the floor at ${x.toFixed(0)}, ${y.toFixed(0)}`);
      }
      assert.ok(shot.from[2] > 5 && shot.from[2] < 60 && shot.to[2] > 5 && shot.to[2] < 60, `shot ${n} camera height is odd`);
      assert.ok(shot.duration >= 5, `shot ${n} is too short to read`);
    }
    assert.ok(SHOTS.some((s) => s.boom !== undefined), 'the film should blow something up');
  },

  'the title film runs, blows up the barrel beside the imps, loops cleanly and hands back an untouched level'() {
    const game = new Game();
    const director = new TitleDirector(game);
    const total = SHOTS.reduce((sum, shot) => sum + shot.duration, 0);
    const booms = [];
    let maxFade = 0;
    let minFade = 1;
    for (let t = 0; t < total * 2 + 5; t += 1 / 30) {
      game.time += 1 / 30;
      director.update(1 / 30);
      for (const e of game.events) if (e.type === 'boom') booms.push(t);
      game.events.length = 0;
      const { cam } = game;
      assert.ok(cam && [cam.x, cam.y, cam.eye, cam.lookX, cam.lookY, cam.lookEye, cam.roll, cam.zoom].every(Number.isFinite), 'camera went bad');
      assert.ok(cam.zoom > 0.5 && cam.zoom <= 1.05, `zoom ${cam.zoom}`);
      maxFade = Math.max(maxFade, game.fade);
      minFade = Math.min(minFade, game.fade);
    }
    assert.equal(booms.length, 2, `one explosion per loop, got ${booms.length}`);
    assert.ok(booms[0] > 5 && booms[0] < 7, `the first boom came at ${booms[0]}`);
    assert.equal(maxFade, 1, 'cuts go through black');
    assert.equal(minFade, 0, 'the middle of a shot is clear');

    // the first loop killed the imps; the second must have started over with them alive
    assert.equal(game.enemies.filter((e) => e.type === 'imp' && e.state === 'dead').length === 0 || director.shot === 0, true);
    director.end();
    assert.equal(game.cam, null);
    assert.equal(game.fade, 0);
    assert.ok(game.enemies.every((e) => e.state === 'idle'), 'the game must start with every monster alive and unaware');
    assert.equal(game.barrels.length, new Game().barrels.length, 'and with only the level\'s own barrels');
    assert.equal(game.blood.floor.length, 0, 'and a clean floor');
  },

  'collisions run through a grid, and nothing escapes the level with it'() {
    const game = new Game();
    game.load(1);
    game.state = 'play';
    assert.ok(game.scene.getGrid(), 'the scene should use a broadphase grid');
    for (const enemy of game.enemies) enemy.state = 'chase';
    run(game, 20, input({ forward: 1, run: true, turn: 0.3 }));
    const { width, rowCount } = game.level;
    for (const body of [game.player, ...game.enemies]) {
      const { x, y } = body.pos;
      assert.ok(x > 0 && y > 0 && x < width * 64 && y < rowCount * 64, `left the level at ${x}, ${y}`);
    }
    assert.ok(game.scene.bodies.length > 50, 'bodies should still be in the scene');
  },

  'player stops at walls and slides along them'() {
    const game = fresh();
    clearEnemies(game);
    game.player.angle = Math.PI;
    run(game, 3, input({ forward: 1 }));
    // west wall tile spans x 0..64, the player radius is 14
    assert.ok(game.player.pos.x >= 64 + 13, `penetrated wall: ${game.player.pos.x}`);
    assert.ok(game.player.pos.x < 64 + 20, `did not reach wall: ${game.player.pos.x}`);
  },

  'closed doors block and open doors let the player through'() {
    const game = fresh();
    clearEnemies(game);
    game.player.angle = 0;
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    run(game, 2, input({ forward: 1 }));
    assert.ok(game.player.pos.x < 5 * 64, `walked through a closed door: ${game.player.pos.x}`);
    run(game, 0.1, input({ use: true }));
    run(game, 3, input({ forward: 1 }));
    assert.ok(game.player.pos.x > 6 * 64, `could not pass open door: ${game.player.pos.x}`);
  },

  'pickups are collected through sensor overlaps'() {
    const game = fresh();
    clearEnemies(game);
    const ammo = game.pickups.find((p) => p.type === 'ammo');
    game.player.ammo = 5;
    game.player.body.setPosition(ammo.pos.clone());
    run(game, 0.1);
    assert.equal(game.player.ammo, 13);
    assert.ok(!game.pickups.includes(ammo));
  },

  'the shotgun kills an enemy in front of it and uses ammo'() {
    const game = fresh();
    const imp = game.enemies[0];
    clearEnemies(game);
    game.addEnemy('imp', new Vec2(10 * 64 + 32, 3 * 64 + 32));
    game.player.body.setPosition(new Vec2(8 * 64, 3 * 64 + 32));
    game.player.angle = 0;
    const ammo = game.player.ammo;
    for (let i = 0; i < 4 && game.enemies[0].state !== 'dead'; i++) {
      game.enemies[0].body.setPosition(new Vec2(9 * 64 + 16, 3 * 64 + 32));
      game.player.cooldown = 0;
      game.fire();
    }
    assert.equal(game.enemies[0].state, 'dead');
    assert.ok(game.player.ammo < ammo);
    assert.equal(game.kills, 1);
    assert.ok(imp);
  },

  'hitscan is stopped by walls'() {
    const game = fresh();
    clearEnemies(game);
    game.addEnemy('brute', new Vec2(4 * 64 + 32, 3 * 64 + 32));
    game.player.body.setPosition(new Vec2(8 * 64 + 32, 3 * 64 + 32));
    game.player.angle = Math.PI;
    const hp = game.enemies[0].hp;
    game.player.cooldown = 0;
    game.fire();
    assert.equal(game.enemies[0].hp, hp, 'shot went through the door');
  },

  'monsters cannot open doors: they wait behind a closed one, and come through once the player opens it'() {
    const game = fresh();
    const player = game.player;
    for (const enemy of game.enemies)
      game.scene.removeBody(enemy.body);
    game.enemies = [];
    game.addEnemy('brute', new Vec2(8 * 64 + 32, 3 * 64 + 32));
    game.enemies[0].state = 'chase';
    player.body.setPosition(new Vec2(2 * 64 + 32, 3 * 64 + 32));
    const door = game.level.doors.get(3 * game.level.width + 5);
    run(game, 8);
    assert.equal(door.open, 0, 'a monster must not open a door');
    assert.equal(player.health, 100, 'the brute got through a closed door');
    assert.ok(game.enemies[0].pos.x > 5 * 64 + 40, 'the brute should be waiting on its own side');

    door.target = 1; // the player opens it
    run(game, 8);
    assert.ok(player.health < 100, `brute never came through the open door (${game.enemies[0].pos.x.toFixed(0)})`);
  },

  'imps fire projectiles that hurt the player and vanish on walls'() {
    const game = fresh();
    for (const enemy of game.enemies)
      game.scene.removeBody(enemy.body);
    game.enemies = [];
    game.addEnemy('imp', new Vec2(12 * 64 + 32, 3 * 64 + 32));
    game.enemies[0].state = 'chase';
    game.player.body.setPosition(new Vec2(10 * 64 + 32, 3 * 64 + 32));
    run(game, 6);
    assert.ok(game.player.health < 100, 'fireballs never landed');
    run(game, 6);
    assert.ok(game.shots.every((shot) => !shot.dead));
    for (const body of game.scene.bodies)
      assert.ok(body.position.x === body.position.x, 'NaN position');
  },

  'dying stops the game and the full first level loads'() {
    const game = fresh();
    game.hurtPlayer(500);
    assert.equal(game.state, 'dead');
    for (let i = 0; i < LEVELS.length; i++) {
      game.load(i);
      assert.ok(game.enemies.length > 0);
    }
  },

  'categories keep pickups from colliding with enemies'() {
    const game = fresh();
    assert.ok(game.pickups.every((p) => p.body.collisionMask === CAT.PLAYER));
  },

  'shotgun hits spray blood that lands as permanent floor splats'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.addEnemy('brute', new Vec2(9 * 64 + 16, 3 * 64 + 32));
    game.player.body.setPosition(new Vec2(7 * 64, 3 * 64 + 32));
    game.player.angle = 0;
    game.player.cooldown = 0;
    game.fire();
    assert.ok(game.blood.particles.length >= 10, `only ${game.blood.particles.length} droplets`);
    // a wounded enemy keeps dripping, so heal it to isolate this volley
    game.enemies[0].hp = game.enemies[0].def.hp;
    run(game, 3);
    assert.equal(game.blood.particles.length, 0, 'droplets never settled');
    assert.ok(game.blood.floor.length >= 3, `only ${game.blood.floor.length} floor splats`);
    run(game, 10);
    assert.ok(game.blood.floor.length >= 3, 'splats must persist');
  },

  'killing an enemy bursts into gore, gibs and a spreading pool'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.addEnemy('imp', new Vec2(9 * 64 + 16, 3 * 64 + 32));
    const imp = game.enemies[0];
    game.damageEnemy(imp, 999);
    assert.ok(game.blood.particles.length >= 40, 'no fountain');
    assert.ok(game.blood.particles.some((p) => p.gib), 'no gibs');
    const before = game.blood.floor.length;
    assert.ok(before >= 8, 'no initial spatter');
    run(game, 2);
    assert.ok(game.blood.floor.length > before + 8, 'pool did not spread under the corpse');
  },

  'blood that hits a wall leaves a splat on its face, within the level'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    // east wall of the first room is x = 5 * 64; spray at it from the west
    game.blood.spray(4 * 64 + 40, 4 * 64 + 32, 30, 1, 0, 200, { speed: 300, spread: 40, up: 60 });
    run(game, 2);
    assert.ok(game.blood.walls.length > 0, 'no wall splats');
    for (const w of game.blood.walls) {
      assert.ok(Math.abs(w.nx) + Math.abs(w.ny) === 1, 'normal must be an axis');
      assert.ok(w.z > 0 && w.z < 110, `bad height ${w.z}`);
    }
  },

  'blood respects its caps even when hammered'() {
    const game = fresh();
    clearEnemies(game);
    for (let i = 0; i < 80; i++)
      game.blood.gore(7 * 64, 8 * 64, 1.5);
    assert.ok(game.blood.particles.length <= BLOOD.particles);
    assert.ok(game.blood.floor.length <= BLOOD.floor);
    run(game, 6);
    assert.ok(game.blood.floor.length <= BLOOD.floor && game.blood.walls.length <= BLOOD.walls);
    for (const p of [...game.blood.floor, ...game.blood.walls])
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'NaN splat');
  },

  'getting hurt sprays the screen and the splats fade away'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.hurtPlayer(20);
    assert.ok(game.blood.splats.length >= 5, 'no screen splats');
    assert.ok(game.blood.floor.length >= 1, 'no blood under the player');
    run(game, 6);
    assert.equal(game.blood.splats.length, 0, 'screen splats never faded');
  },

  'a new level starts clean and bumps the splat version'() {
    const game = fresh();
    game.blood.gore(7 * 64, 8 * 64);
    const version = game.blood.version;
    game.load(1);
    assert.equal(game.blood.floor.length + game.blood.particles.length + game.blood.splats.length, 0);
    assert.ok(game.blood.version > version);
  },

  'walking through a pool leaves alternating footprints that fade out'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    const start = new Vec2(6 * 64, 9 * 64 + 32);
    game.player.body.setPosition(start);
    game.player.angle = 0;
    game.blood.floorSplat(start.x + 40, start.y, 22);
    run(game, 0.1);
    run(game, 3, input({ forward: 1 }));
    const prints = game.blood.prints;
    assert.ok(prints.length >= 6, `only ${prints.length} prints`);
    assert.ok(prints.every((p) => Math.abs(p.angle) < 0.2), 'prints must point the way we walked');
    for (let i = 1; i < prints.length; i++)
      assert.notEqual(prints[i].side, prints[i - 1].side, 'feet must alternate');
    assert.ok(prints[0].strength > prints[prints.length - 1].strength, 'the trail must thin out');
    assert.ok(prints[prints.length - 1].x > start.x + 60, 'the trail must run beyond the pool');
    // the left and right prints sit on opposite sides of the path
    const left = prints.filter((p) => p.side > 0).map((p) => p.y);
    const right = prints.filter((p) => p.side < 0).map((p) => p.y);
    assert.ok(Math.min(...left) > Math.max(...right) || Math.max(...left) < Math.min(...right), 'prints overlap');
  },

  'dry feet, standing still and teleporting leave no prints'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.angle = 0;
    run(game, 2, input({ forward: 1 }));
    assert.equal(game.blood.prints.length, 0, 'dry feet left prints');
    // wet but still: no prints
    game.blood.floorSplat(game.player.pos.x, game.player.pos.y, 22);
    run(game, 2);
    assert.equal(game.blood.prints.length, 0, 'standing still left prints');
    // a jump is a teleport, not a step
    game.player.body.setPosition(new Vec2(12 * 64, 9 * 64 + 32));
    run(game, 0.1);
    assert.equal(game.blood.prints.length, 0, 'teleport left prints');
  },

  'footprints point the way they were walked, left and right mirrored, thin ones plain outlines'() {
    for (const angle of [0, Math.PI / 2, Math.PI, -1]) {
      const { corners } = printQuad({ x: 100, y: 200, angle, side: 1, strength: 1, scale: 1 });
      // the quad's bottom edge runs along the heading, so the picture's toe (to the right) is ahead of its heel
      const along = (corners[3] - corners[0]) * Math.cos(angle) + (corners[5] - corners[2]) * Math.sin(angle);
      assert.ok(along > 3, `toe is not ahead of the heel for heading ${angle}`);
    }
    const right = printQuad({ x: 0, y: 0, angle: 0, side: 1, strength: 1, scale: 1 });
    const left = printQuad({ x: 0, y: 0, angle: 0, side: -1, strength: 1, scale: 1 });
    assert.deepEqual(right.uv.slice(0, 1), left.uv.slice(0, 1));
    assert.equal(right.uv[1], left.uv[3], 'left and right are the same picture, one upside down');
    const thin = printQuad({ x: 0, y: 0, angle: 0, side: 1, strength: 0.2, scale: 1 });
    assert.notDeepEqual(thin.uv, right.uv, 'a thin print is a plain outline, not a fresh heavy print');
  },

  'shooting a wall leaves holes on its face, one per pellet, at their own height'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    // the north wall of the first room: tile row 0, its face is the plane y = 64
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.player.angle = -Math.PI / 2;
    game.player.cooldown = 0;
    game.fire();
    const holes = game.blood.holes;
    assert.ok(holes.length >= 5, `only ${holes.length} holes from six pellets`);
    for (const hole of holes) {
      assert.equal(hole.y, 64, 'holes must lie on the wall plane');
      assert.deepEqual([hole.nx, hole.ny], [0, 1], 'normal must point into the room');
      assert.ok(hole.z > 1 && hole.z < 63, `bad height ${hole.z}`);
    }
    assert.ok(new Set(holes.map((h) => h.x)).size > 1, 'the shotgun cone should scatter the holes');
    // they stay
    run(game, 5);
    assert.equal(game.blood.holes.length, holes.length);
  },

  'the cap holds, a pellet in the floor marks nothing and a new level is clean'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    // a pellet in the floor has nothing to mark
    assert.equal(game.blood.impact(9 * 64, 2 * 64 + 32, -1, 0, 0.5), false, 'a pellet in the floor marks nothing');
    // cap
    for (let i = 0; i < BLOOD.holes + 60; i++)
      game.blood.impact(64, 4 * 64 + 32, 1, 0, 20 + (i % 20));
    assert.equal(game.blood.holes.length, BLOOD.holes);
    assert.ok(game.blood.holes.every((h) => Number.isFinite(h.x) && Number.isFinite(h.z)));
    const version = game.blood.holesVersion;
    game.load(1);
    assert.equal(game.blood.holes.length, 0);
    assert.ok(game.blood.holesVersion > version);
  },

  'a closed door takes bullet holes on its face, tied to the door'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    const door = [...game.level.doors.values()].find((d) => d.x === 5 && d.y === 3);
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.player.angle = 0;
    game.player.cooldown = 0;
    game.fire();
    const holes = game.blood.holes;
    assert.ok(holes.length >= 5, `only ${holes.length} holes from six pellets`);
    for (const hole of holes) {
      assert.equal(hole.door, door, 'a door hole must belong to its door');
      assert.equal(hole.x, 320, 'hole must lie on the door face');
      assert.deepEqual([hole.nx, hole.ny], [-1, 0]);
      assert.ok(hole.z > 1 && hole.z < 63, `bad height ${hole.z}`);
      assert.equal(hole.top, 64);
    }
    // the door opens, the holes stay in the door's own height and so travel with it
    const before = holes.map((h) => h.z);
    door.target = 1;
    run(game, 0.3);
    assert.ok(door.open > 0.1 && door.open < 1);
    assert.deepEqual(holes.map((h) => h.z), before, 'holes must be fixed to the door, not the world');
    assert.ok(game.blood.holes.every((h) => h.z * (1 - door.open) < 64 * (1 - door.open) + 1e-6), 'a hole is above the lowered door');
  },

  'a half-open door is marked within its current height, a sunk door cannot be marked, and the door cap holds'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    const door = [...game.level.doors.values()].find((d) => d.x === 5 && d.y === 3);
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.player.angle = 0;
    game.level.setDoorOpen(door, 0.5);
    for (let i = 0; i < 6; i++) {
      game.player.cooldown = 0;
      game.player.ammo = 20;
      game.fire();
    }
    assert.ok(game.blood.holes.length >= 20, `only ${game.blood.holes.length} holes`);
    for (const hole of game.blood.holes) {
      // measured where the door is now, a hole must be on the 32 high part that is left
      const now = hole.z * (1 - door.open);
      assert.ok(now > 0 && now < 32, `hole at ${now} is off the half-open door`);
    }
    // fully sunk: nothing left to mark
    game.level.setDoorOpen(door, 1);
    assert.equal(game.blood.impact(320, 3 * 64 + 32, -1, 0, 20), false, 'marked a door that has sunk away');
    // each door keeps a bounded number of holes
    game.level.setDoorOpen(door, 0);
    for (let i = 0; i < BLOOD.doorHoles + 40; i++)
      game.blood.impact(320, 3 * 64 + 32, -1, 0, 10 + (i % 40));
    assert.ok(game.blood.holes.filter((h) => h.door === door).length <= BLOOD.doorHoles, 'door hole cap exceeded');
    assert.ok(game.blood.holes.length <= BLOOD.holes);
  },

  'every pellet that stops on a half-height pillar marks its face, inside its height'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    // the pillar at tile (9, 2) is 26 high, below the 32 eye height: its west face is the plane x = 576
    assert.equal(game.level.heights[2 * game.level.width + 9], 26);
    game.player.body.setPosition(new Vec2(6 * 64 + 32, 2 * 64 + 32));
    game.player.angle = 0;
    let stopped = 0;
    for (let i = 0; i < 10; i++) {
      game.player.cooldown = 0;
      game.player.ammo = 20;
      game.fire();
    }
    stopped = game.effects.filter((e) => e.type === 'spark').length;
    assert.equal(stopped, 60, 'every pellet should stop on the pillar');
    assert.equal(game.blood.holes.length, 60, `only ${game.blood.holes.length} of ${stopped} pellets left a mark`);
    for (const hole of game.blood.holes) {
      assert.equal(hole.x, 576, 'hole must lie on the pillar face');
      assert.deepEqual([hole.nx, hole.ny], [-1, 0]);
      assert.ok(hole.z > 1 && hole.z < 26, `hole at ${hole.z} is outside the pillar`);
      assert.equal(hole.top, 26);
    }
    // the sparks land on the pillar too, not floating above it
    assert.ok(game.effects.filter((e) => e.type === 'spark').every((e) => e.z < 26), 'a spark hovers above the pillar');
    // and it is spread over the face, not stacked on one line
    const heights = game.blood.holes.map((h) => h.z);
    assert.ok(Math.max(...heights) - Math.min(...heights) > 8, 'holes should be spread over the face');
  },

  'a bullet hole is a small sprite on the wall plane, cut at the edges of its face, and sparks are a short animation'() {
    const hole = { x: 128, y: 64, z: 30, nx: 0, ny: 1, top: 64, seed: 99 };
    const quad = holeQuad(hole);
    for (let i = 0; i < 12; i += 3) {
      assert.ok(Math.abs(quad.corners[i + 2] - 64.5) < 1e-6, 'every corner must sit just in front of the face');
      assert.ok(quad.corners[i + 1] > 0 && quad.corners[i + 1] < 64, `height ${quad.corners[i + 1]} outside the wall`);
      assert.ok(Math.abs(quad.corners[i] - 128) < 9, 'a hole stays small');
    }
    // near the top of a low wall nothing may poke above it, and the picture is cut by the same share
    for (const seed of [1, 2, 3, 4, 5]) {
      const low = holeQuad({ ...hole, z: 25, top: 26, seed });
      for (let i = 1; i < low.corners.length; i += 3)
        assert.ok(low.corners[i] <= 26, 'hole pokes above the wall');
      assert.ok(low.uv[3] < 1, 'the picture is cut with the quad');
    }
    // a face that ends beside it cuts it, a face that is too narrow leaves nothing
    const cut = holeQuad({ ...hole, lo: -3, hi: 3 });
    assert.ok(cut.corners[0] >= 128 - 3 + 0.3 - 1e-9 && cut.corners[3] <= 128 + 3 - 0.3 + 1e-9, 'cut at the ends of its face');
    assert.equal(holeQuad({ ...hole, lo: -0.1, hi: 0.2 }), null);

    const atlas = impactAtlas();
    assert.equal(atlas.width, 32 * IMPACT_CELL_COUNT);
    const solid = (cell) => {
      let n = 0;
      let bright = 0;
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const o = (y * atlas.width + cell * 32 + x) * 4;
          if (atlas.data[o + 3]) {
            n++;
            if (atlas.data[o] > 200)
              bright++;
          }
        }
      }
      return { n, bright };
    };
    for (let v = 0; v < HOLE_VARIANTS; v++)
      assert.ok(solid(IMPACT_CELLS.hole + v).n > 30 && solid(IMPACT_CELLS.hole + v).n < 330 && solid(IMPACT_CELLS.hole + v).bright === 0, 'a hole is a small patch of dark steel, nothing bright');
    // the kinds really differ: no two holes are the same picture, and they differ in how much of the cell they take
    const pictures = new Set();
    const sizes = new Set();
    for (let v = 0; v < HOLE_VARIANTS; v++) {
      let key = '';
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++)
          key += atlas.data[(y * atlas.width + (IMPACT_CELLS.hole + v) * 32 + x) * 4 + 3] ? '1' : '0';
      }
      pictures.add(key);
      sizes.add(Math.round(solid(IMPACT_CELLS.hole + v).n / 8));
    }
    assert.equal(pictures.size, HOLE_VARIANTS, 'every hole is its own picture');
    assert.ok(sizes.size >= 4, 'from small clean punctures to big cracked ones');
    // sparks are small and subtle: four kinds of five frames, each a flash or glint and a few pixels thrown out
    assert.ok(HOLE_VARIANTS + SPARK_VARIANTS * SPARK_FRAMES <= IMPACT_CELL_COUNT, 'the sparks fit the atlas');
    const kinds = new Set();
    for (let k = 0; k < SPARK_VARIANTS; k++) {
      let key = '';
      for (let f = 0; f < SPARK_FRAMES; f++) {
        const cell = IMPACT_CELLS.spark + k * SPARK_FRAMES + f;
        const { n, bright } = solid(cell);
        assert.ok(n < 60, `spark ${k} frame ${f} is a few pixels, not a burst (${n})`);
        if (f === SPARK_FRAMES - 1)
          assert.ok(bright === 0, 'and the last frame is only embers');
        key += n + ',';
      }
      kinds.add(key);
    }
    assert.equal(kinds.size, SPARK_VARIANTS, 'every kind of spark is different');
    assert.ok(solid(IMPACT_CELLS.spark).n > solid(IMPACT_CELLS.spark + SPARK_FRAMES - 1).n, 'it dies away');
    assert.ok(impactCellUv(IMPACT_CELL_COUNT - 1)[2] === 1);
  },

  'the map starts mostly hidden and only reveals what the player can see'() {
    const game = fresh();
    const { fog, level } = game;
    const idx = (x, y) => y * level.width + x;
    assert.equal(fog.isExplored(idx(1, 1)), true, 'the start tile must be known');
    assert.ok(fog.exploredCount < level.width * level.rowCount * 0.15, `${fog.exploredCount} tiles known at the start`);
    // the closed door at (5, 3) hides the big hall behind it
    assert.equal(fog.isExplored(idx(8, 3)), false, 'saw through a closed door');
    assert.equal(fog.isExplored(idx(20, 8)), false, 'knows a far room it never saw');
    // sight is a subset of memory
    for (let i = 0; i < fog.visible.length; i++) {
      if (fog.visible[i])
        assert.equal(fog.explored[i], 1, 'a visible tile must be explored');
    }
  },

  'an opened door lets sight through, and what was seen is remembered'() {
    const game = fresh();
    clearEnemies(game);
    const { level } = game;
    const idx = (x, y) => y * level.width + x;
    const door = [...level.doors.values()].find((d) => d.x === 5 && d.y === 3);
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.player.angle = 0;
    door.target = 1;
    run(game, 1.2);
    assert.equal(game.fog.isExplored(idx(8, 3)), true, 'could not see through the open door');
    assert.equal(game.fog.isVisible(idx(8, 3)), true);
    const known = game.fog.exploredCount;

    // turn away: it leaves the view but stays on the map, and nothing is ever forgotten
    game.player.angle = Math.PI;
    run(game, 0.5);
    assert.equal(game.fog.isVisible(idx(8, 3)), false, 'still in view while facing away');
    assert.equal(game.fog.isExplored(idx(8, 3)), true, 'forgot a tile it had seen');
    assert.ok(game.fog.exploredCount >= known, 'the explored count went down');
    assert.equal(game.fog.canSee(8 * 64 + 32, 3 * 64 + 32), false);
  },

  'tall walls block sight but the low pillars do not'() {
    const game = fresh();
    clearEnemies(game);
    const { level, fog } = game;
    const idx = (x, y) => y * level.width + x;
    // in the big hall (row 7), looking east along row 9's pillar at column 3: pillars are 26 high, under the eye
    assert.equal(level.heights[idx(3, 9)], 26);
    fog.explored.fill(0);
    fog.visible.fill(0);
    fog.exploredCount = 0;
    fog.update(1 * 64 + 32, 9 * 64 + 32, 0);
    assert.equal(fog.isVisible(idx(3, 9)), true, 'the pillar itself should be seen');
    assert.equal(fog.isVisible(idx(8, 9)), true, 'sight must pass over a low pillar');
    // the wall between the hall and the south room (row 13) stops sight dead
    fog.update(10 * 64 + 32, 12 * 64 + 32, Math.PI / 2);
    assert.equal(fog.isVisible(idx(10, 13)), true, 'the wall face itself is seen');
    assert.equal(fog.isVisible(idx(10, 15)), false, 'saw through a tall wall');
  },

  'enemies show on the map only while in view, and a new level starts with a fresh fog'() {
    const game = fresh();
    const { fog } = game;
    // enemies in the hall behind the closed door are not in view
    assert.ok(game.enemies.every((e) => !fog.canSee(e.pos.x, e.pos.y)), 'an enemy is visible through the walls');
    game.player.body.setPosition(new Vec2(6 * 64 + 32, 9 * 64 + 32));
    game.player.angle = 0;
    run(game, 0.2);
    assert.ok(game.enemies.some((e) => fog.canSee(e.pos.x, e.pos.y)), 'an enemy in plain view is not visible');
    const known = fog.exploredCount;
    assert.ok(known > 0);
    game.load(1);
    assert.notEqual(game.fog, fog);
    assert.ok(game.fog.exploredCount < known + 200 && game.fog.exploredCount > 0);
    assert.equal(game.fog.isExplored(0), false);
  },

  'the shotgun is heard firing and pumping, and an empty gun only clicks'() {
    const game = fresh();
    clearEnemies(game);
    game.events.length = 0;
    game.player.cooldown = 0;
    game.fire();
    const types = game.events.map((e) => e.type);
    assert.ok(types.includes('fire'), 'no shot sound');
    assert.equal(game.events.find((e) => e.type === 'fire').pump, true, 'a shell is left, so it should pump');

    game.events.length = 0;
    game.player.ammo = 1;
    game.player.cooldown = 0;
    game.fire();
    assert.equal(game.events.find((e) => e.type === 'fire').pump, false, 'the last shell needs no pump');

    game.events.length = 0;
    game.player.ammo = 0;
    game.player.cooldown = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.ok(game.events.some((e) => e.type === 'dry'), 'no click on an empty gun');
    assert.ok(!game.events.some((e) => e.type === 'fire'));
  },

  'pellets sound different on a wall, on a door and on flesh'() {
    const game = fresh();
    clearEnemies(game);
    game.player.angle = -Math.PI / 2;
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.events.length = 0;
    game.player.cooldown = 0;
    game.fire();
    const walls = game.events.filter((e) => e.type === 'impact');
    assert.ok(walls.length >= 5 && walls.every((e) => e.surface === 'wall'), 'plain wall hits');

    game.player.angle = 0;
    game.events.length = 0;
    game.player.cooldown = 0;
    game.fire();
    const doors = game.events.filter((e) => e.type === 'impact');
    assert.ok(doors.length >= 5 && doors.every((e) => e.surface === 'door'), 'door hits');
    assert.ok(doors.every((e) => e.x > 300 && e.x < 340), 'the sound comes from the door, not the player');

    clearEnemies(game);
    game.addEnemy('brute', new Vec2(4 * 64, 3 * 64 + 32));
    game.player.body.setPosition(new Vec2(2 * 64, 3 * 64 + 32));
    game.events.length = 0;
    game.player.cooldown = 0;
    game.fire();
    assert.ok(game.events.some((e) => e.type === 'flesh'), 'no flesh hit');
  },

  'enemies announce themselves once, cry out in pain and die with their own voice'() {
    const game = fresh();
    clearEnemies(game);
    // off to the side of the line of fire, so the volley wakes them without hitting them
    game.addEnemy('imp', new Vec2(8 * 64, 11 * 64 + 32));
    game.addEnemy('brute', new Vec2(12 * 64, 10 * 64 + 32));
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.events.length = 0;
    // both have the player in sight, so both wake
    game.player.angle = 0;
    game.player.cooldown = 0;
    game.fire();
    run(game, 0.5);
    const alerts = game.events.filter((e) => e.type === 'alert');
    assert.deepEqual(alerts.map((e) => e.kind).sort(), ['brute', 'imp'], 'each enemy wakes exactly once, in its own voice');
    run(game, 1);
    assert.equal(game.events.filter((e) => e.type === 'alert').length, 2, 'awake enemies must not announce themselves again');
    // heard from where they stand, and flagged by whether the player can see them
    assert.ok(alerts.every((e) => Number.isFinite(e.x) && typeof e.visible === 'boolean'));

    game.events.length = 0;
    const imp = game.enemies.find((e) => e.type === 'imp');
    game.damageEnemy(imp, 999);
    const death = game.events.find((e) => e.type === 'die');
    assert.equal(death.kind, 'imp');
    assert.equal(death.x, imp.pos.x);
  },

  'monsters wake only once they can see the player: gunfire through a wall wakes no one'() {
    const game = fresh();
    clearEnemies(game);
    // the first room (x 1..4) is closed off by a wall at x = 5; put the monsters in the next room
    game.addEnemy('imp', new Vec2(7 * 64, 2 * 64 + 32));
    game.addEnemy('brute', new Vec2(8 * 64, 3 * 64));
    game.player.body.setPosition(new Vec2(2 * 64, 2 * 64 + 32));
    game.player.angle = 0;
    for (let i = 0; i < 4; i++) {
      game.player.cooldown = 0;
      game.fire();
      run(game, 0.4);
    }
    assert.ok(game.enemies.every((e) => e.state === 'idle'), 'gunfire woke a monster that cannot see the player');

    // a pack wakes together only when it can see each other
    game.addEnemy('swarmer', new Vec2(7 * 64 + 20, 2 * 64 + 32));
    game.addEnemy('swarmer', new Vec2(2 * 64, 2 * 64 + 50));
    const [near, behind] = game.enemies.slice(-2);
    game.wake(near);
    assert.equal(behind.state, 'idle', 'a swarmer behind a wall must not be woken by its pack');
  },

  'imp fireballs are heard being launched and exploding, brutes are heard swinging'() {
    const game = fresh();
    for (const enemy of game.enemies)
      game.scene.removeBody(enemy.body);
    game.enemies = [];
    game.addEnemy('imp', new Vec2(12 * 64 + 32, 3 * 64 + 32));
    game.enemies[0].state = 'chase';
    game.player.body.setPosition(new Vec2(10 * 64 + 32, 3 * 64 + 32));
    game.events.length = 0;
    run(game, 6);
    const kinds = game.events.map((e) => e.type);
    assert.ok(kinds.includes('fireball'), 'no launch sound');
    assert.ok(kinds.includes('explode'), 'no explosion sound');
    assert.ok(kinds.indexOf('fireball') < kinds.indexOf('explode'));

    const brawl = fresh();
    clearEnemies(brawl);
    brawl.addEnemy('brute', new Vec2(6 * 64 + 40, 9 * 64 + 32));
    brawl.enemies[0].state = 'chase';
    brawl.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    brawl.events.length = 0;
    run(brawl, 4);
    assert.ok(brawl.events.some((e) => e.type === 'swing' && e.kind === 'brute'), 'no swing');
    assert.ok(brawl.events.some((e) => e.type === 'hurt'), 'no grunt when hit');
  },

  'getting hurt, dying and a failing heart all make sound'() {
    const game = fresh();
    clearEnemies(game);
    game.events.length = 0;
    game.hurtPlayer(10);
    assert.ok(game.events.some((e) => e.type === 'hurt'));
    assert.ok(!game.events.some((e) => e.type === 'death'));

    game.player.health = 25;
    game.events.length = 0;
    run(game, 6);
    const slow = game.events.filter((e) => e.type === 'heartbeat').length;
    assert.ok(slow >= 5, `only ${slow} heartbeats in 6s`);

    game.player.health = 5;
    game.events.length = 0;
    run(game, 6);
    const fast = game.events.filter((e) => e.type === 'heartbeat').length;
    assert.ok(fast > slow + 1, `a weaker heart must beat faster (${fast} against ${slow})`);

    game.player.health = 80;
    game.events.length = 0;
    run(game, 3);
    assert.equal(game.events.filter((e) => e.type === 'heartbeat').length, 0, 'a healthy player has no heartbeat');

    game.events.length = 0;
    game.hurtPlayer(500);
    assert.ok(game.events.some((e) => e.type === 'death'));
  },

  'doors, pickups and the exit have sounds, and doors announce each direction once'() {
    const game = fresh();
    clearEnemies(game);
    const door = [...game.level.doors.values()].find((d) => d.x === 5 && d.y === 3);
    game.player.body.setPosition(new Vec2(4 * 64 + 40, 3 * 64 + 32));
    game.player.angle = 0;
    game.events.length = 0;
    // one key press: use() reaches doors within 96 units
    game.update(1 / 60, input({ use: true }));
    run(game, 1);
    const opening = game.events.filter((e) => e.type === 'doorOpen');
    assert.equal(opening.length, 1, 'a door opening must be announced exactly once');
    assert.deepEqual([opening[0].x, opening[0].y], [door.center.x, door.center.y]);
    // left alone it closes again, which is announced too
    game.player.body.setPosition(new Vec2(1 * 64 + 32, 3 * 64 + 32));
    run(game, 7);
    assert.equal(game.events.filter((e) => e.type === 'doorClose').length, 1);

    game.events.length = 0;
    const ammo = game.pickups.find((p) => p.type === 'ammo');
    game.player.ammo = 5;
    game.player.body.setPosition(ammo.pos.clone());
    run(game, 0.1);
    assert.deepEqual(game.events.filter((e) => e.type === 'pickup').map((e) => e.kind), ['ammo']);

    // the exit of the first level, with the way clear
    const exit = game.level.exits[0];
    game.player.body.setPosition(new Vec2(exit.x, exit.y - 64));
    game.player.angle = Math.PI / 2;
    game.events.length = 0;
    run(game, 1.5, input({ forward: 1 }));
    assert.equal(game.state, 'cleared');
    assert.equal(game.events.filter((e) => e.type === 'clear').length, 1, 'the level-clear sound plays once');
  },

  'footsteps: the player and the enemies are heard, and steps in blood are wet'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.angle = 0;
    game.events.length = 0;
    run(game, 1.5, input({ forward: 1 }));
    const dry = game.events.filter((e) => e.type === 'step');
    assert.ok(dry.length >= 4, `only ${dry.length} steps in 1.5s`);
    assert.ok(dry.every((e) => e.wet === false && e.who === 'player'), 'dry floor, dry steps');

    game.blood.floorSplat(game.player.pos.x + 30, game.player.pos.y, 22);
    game.events.length = 0;
    run(game, 1.5, input({ forward: 1 }));
    assert.ok(game.events.some((e) => e.type === 'step' && e.wet), 'no wet steps after the pool');

    game.addEnemy('brute', new Vec2(20 * 64, 9 * 64 + 32));
    game.enemies[0].state = 'chase';
    game.events.length = 0;
    run(game, 2);
    const heavy = game.events.filter((e) => e.type === 'stomp' && e.kind === 'brute');
    assert.ok(heavy.length >= 2, 'a walking brute should be heard');
    assert.ok(heavy.every((e) => e.x > 640), 'its steps come from where it stands');
  },

  'the event queue is capped and a new level starts with none'() {
    const game = fresh();
    for (let i = 0; i < 600; i++)
      game.emit('step', null, { wet: false });
    assert.equal(game.events.length, 256);
    game.load(1);
    assert.equal(game.events.length, 0);
  },

  'sound is placed by distance and by which side of the listener it is on'() {
    const listener = { x: 0, y: 0, angle: 0 };
    // facing east, "right" is south (+y) in the game's plane
    assert.ok(spatial(listener, 200, 200).pan > 0.3, 'a sound to the right must pan right');
    assert.ok(spatial(listener, 200, -200).pan < -0.3, 'a sound to the left must pan left');
    assert.ok(Math.abs(spatial(listener, 300, 0).pan) < 1e-9, 'a sound dead ahead is centred');
    assert.ok(Math.abs(spatial(listener, -300, 0).pan) < 1e-9, 'so is one dead behind');
    // turning to face south, the same sound is now on the left
    assert.ok(spatial({ ...listener, angle: Math.PI / 2 }, 200, 200).pan > 0.3 === false);
    assert.ok(spatial({ ...listener, angle: Math.PI / 2 }, -200, 200).pan > 0.3, 'facing south, west is on the right');
    // louder when near, silent when out of range, and right on top of the listener it is centred and full
    const gains = [0, 100, 300, 600, 900].map((d) => spatial(listener, d, 0).gain);
    for (let i = 1; i < gains.length; i++)
      assert.ok(gains[i] < gains[i - 1], 'gain must fall with distance');
    assert.equal(spatial(listener, 0, 0).gain, 1);
    assert.equal(spatial(listener, 0, 0).pan, 0);
    assert.equal(spatial(listener, 5000, 0).gain, 0, 'out of range is silent');
    assert.ok(Math.abs(spatial(listener, 0, 20).pan) < 0.3, 'a source very close has a soft pan');
  },

  'only the player leaves bloody footprints; monsters walk through blood cleanly, and prints are capped'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.addEnemy('brute', new Vec2(20 * 64, 9 * 64 + 32));
    const brute = game.enemies[0];
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    brute.state = 'chase';
    game.blood.floorSplat(brute.pos.x, brute.pos.y, 24);
    game.events.length = 0;
    run(game, 3);
    assert.equal(game.blood.prints.length, 0, `the brute left ${game.blood.prints.length} prints`);
    assert.equal(brute.feet.blood, 0, 'a monster\'s feet must stay clean');
    assert.ok(game.events.some((e) => e.type === 'stomp'), 'but it is still heard walking');

    for (let i = 0; i < 400; i++)
      game.blood.walk({ blood: 1, travel: 1000, side: 1, x: 0, y: 0, hx: 1, hy: 0 }, 1, 0);
    assert.ok(game.blood.prints.length <= BLOOD.prints, 'prints exceeded their cap');
    for (const p of game.blood.prints)
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.angle), 'NaN print');
  },

  'the player\'s footsteps land once per head-bob dip, not once per few units walked'() {
    const game = new Game();
    game.load(0);
    game.state = 'play';
    const before = game.player.bob;
    let steps = 0;
    const count = () => { steps += game.events.filter((e) => e.type === 'step').length; game.events.length = 0; };
    for (let t = 0; t < 4; t += 1 / 60) {
      game.update(1 / 60, input({ forward: 1 }));
      count();
    }
    const dips = (game.player.bob - before) / Math.PI;
    assert.ok(Math.abs(steps - dips) <= 1, `${steps} steps for ${dips.toFixed(1)} bob dips`);
    assert.ok(steps >= 8 && steps <= 14, `walking 4s is about 3 steps a second, got ${steps}`);
  },

  'blood thrown at a wall corner marks a face that exists, never open air beside it'() {
    for (const index of [0, 1]) {
      const game = fresh(index);
      const { level, blood } = game;
      const open = (x, y) => level.inBounds(Math.floor(x / 64), Math.floor(y / 64)) && level.heights[Math.floor(y / 64) * level.width + Math.floor(x / 64)] <= 0;
      const solid = (x, y) => level.inBounds(Math.floor(x / 64), Math.floor(y / 64)) && level.heights[Math.floor(y / 64) * level.width + Math.floor(x / 64)] > 0;
      let checked = 0;
      const verify = () => {
        for (const w of blood.walls) {
          if (w.door)
            continue;
          checked++;
          assert.ok(solid(w.x - w.nx * 0.5, w.y - w.ny * 0.5), `a splat at ${w.x},${w.y} has no wall behind it`);
          assert.ok(open(w.x + w.nx * 0.5, w.y + w.ny * 0.5), `a splat at ${w.x},${w.y} faces a wall`);
          assert.ok(w.lo <= 0 && w.hi >= 0, 'the splat must sit within its own face');
        }
        blood.walls.length = 0;
      };
      for (let ty = 0; ty < level.rowCount; ty++) {
        for (let tx = 0; tx < level.width; tx++) {
          if (!open(tx * 64 + 32, ty * 64 + 32))
            continue;
          // spots touching a wall, flat on or at a corner: that is where drops reach corners
          const near = [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => solid((tx + dx) * 64 + 32, (ty + dy) * 64 + 32));
          if (!near)
            continue;
          for (let round = 0; round < 6; round++) {
            blood.spray(tx * 64 + 32, ty * 64 + 32, 20, 0, 0, 60, { spread: 300, up: 120 });
            for (let i = 0; i < 40; i++)
              blood.update(1 / 60);
            verify();
          }
        }
      }
      assert.ok(checked > 0, 'no blood reached a wall');
    }
  },

  'the barrel skin is an orange drum in a power-of-two atlas, wrapped on a cylinder by its texture coordinates'() {
    const atlas = barrelAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height), 'a power-of-two atlas can have mipmaps');
    assert.equal(atlas.data.length, BARREL_ATLAS.width * BARREL_ATLAS.height * 4);
    let r = 0;
    let b = 0;
    for (let y = 0; y < atlas.side.height; y++) {
      for (let x = 0; x < atlas.side.width; x++) {
        const o = (y * atlas.width + x) * 4;
        assert.equal(atlas.data[o + 3], 255, 'the skin has no holes in it');
        r += atlas.data[o];
        b += atlas.data[o + 2];
      }
    }
    assert.ok(r > b * 2.5, 'the drum is orange');

    // a cylinder like RoostR's: the side comes first, then the two caps, and every coordinate runs 0..1
    const sides = 20;
    const uvs = [];
    for (let row = 0; row <= 1; row++) {
      for (let x = 0; x <= sides; x++)
        uvs.push(x / sides, 1 - row);
    }
    for (let cap = 0; cap < 2; cap++) {
      uvs.push(0.5, 0.5);
      for (let x = 0; x <= sides; x++)
        uvs.push(Math.sin((x / sides) * Math.PI * 2) * 0.5 + 0.5, Math.cos((x / sides) * Math.PI * 2) * 0.5 + 0.5);
    }
    skinBarrel({ uvs }, sides, 1);
    const sideVertices = (sides + 1) * 2;
    for (let i = 0; i < uvs.length / 2; i++) {
      const u = uvs[i * 2];
      if (i < sideVertices)
        assert.ok(u >= 0 && u <= 0.5, 'the side wraps round the left half of the atlas');
      else
        assert.ok(u >= 0.5 && u <= 0.75, 'a cap shows the lid');
    }
  },

  'the explosion is sixteen frames of a fireball that grows, cools into smoke and thins out'() {
    const atlas = explosionAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height));
    assert.equal(atlas.width, EXPLOSION_CELL * EXPLOSION_FRAMES);
    const stats = (frame) => {
      let solid = 0;
      let bright = 0;
      for (let y = 0; y < EXPLOSION_CELL; y++) {
        for (let x = 0; x < EXPLOSION_CELL; x++) {
          const o = (y * atlas.width + frame * EXPLOSION_CELL + x) * 4;
          if (!atlas.data[o + 3])
            continue;
          solid++;
          if (atlas.data[o] > 200 && atlas.data[o + 1] > 120)
            bright++;
        }
      }
      return { solid, bright };
    };
    const frames = Array.from({ length: EXPLOSION_FRAMES }, (_, i) => stats(i));
    assert.ok(frames[5].solid > frames[0].solid * 4, 'it grows from the flash');
    assert.ok(Math.max(...frames.map((f) => f.bright)) > 300, 'it burns bright');
    assert.ok(frames[EXPLOSION_FRAMES - 1].solid < frames[5].solid / 4, 'and thins out to almost nothing');
    assert.ok(frames[EXPLOSION_FRAMES - 1].bright < frames[5].bright / 20, 'the last frame is smoke and a few embers, not fire');
    // the picture stays inside its cell: nothing on the edge could be cut off
    for (const frame of [4, 6, 8]) {
      for (let k = 0; k < EXPLOSION_CELL; k++) {
        for (const [x, y] of [[k, 0], [k, EXPLOSION_CELL - 1], [0, k], [EXPLOSION_CELL - 1, k]])
          assert.equal(atlas.data[(y * atlas.width + frame * EXPLOSION_CELL + x) * 4 + 3], 0, `frame ${frame} touches the edge of its cell`);
      }
    }
  },

  'the ceiling is a dark power-of-two atlas of steel panels, with light fixtures in a regular rhythm'() {
    const atlas = ceilingAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height), 'a power-of-two atlas can have mipmaps');
    for (let cell = 0; cell < 5; cell++) {
      let r = 0;
      let b = 0;
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const o = (y * atlas.width + cell * 64 + x) * 4;
          assert.equal(atlas.data[o + 3], 255);
          r += atlas.data[o];
          b += atlas.data[o + 2];
        }
      }
      assert.ok(b > r, `ceiling cell ${cell} is blue-grey steel`);
    }
    const light = (y, x) => atlas.data[(y * atlas.width + CEILING_CELLS.light * 64 + x) * 4 + 2];
    assert.ok(light(32, 30) > 150, 'a light fixture is bright');
    assert.equal(ceilingCellFor(0, 0), CEILING_CELLS.light);
    assert.equal(ceilingCellFor(5, 0), CEILING_CELLS.light, 'fixtures repeat every five tiles');
    assert.equal(ceilingCellFor(3, 7), ceilingCellFor(3, 7), 'the same ceiling every time');
    const [u0, , u1] = ceilingCellUv(2);
    assert.ok(u0 > 2 / 8 && u1 < 3 / 8, 'a cell is sampled a hair inside its edges');
  },

  'walls are steel bulkheads in a power-of-two atlas, one quad per tile and per 64 units up, with no rust baked in'() {
    const atlas = wallAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height), 'a power-of-two atlas can have mipmaps');
    assert.equal(atlas.width, 64 * WALL_CELL_COUNT);
    for (let cell = 0; cell < WALL_CELL_COUNT; cell++) {
      let r = 0;
      let b = 0;
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const o = (y * atlas.width + cell * 64 + x) * 4;
          assert.equal(atlas.data[o + 3], 255);
          r += atlas.data[o];
          b += atlas.data[o + 2];
        }
      }
      assert.ok(b > r, `cell ${cell} is blue-grey steel, with the rust left to the shader`);
    }

    // a face 3 tiles long and 104 high (a tall wall): 3 tiles, 2 pieces up each, and the pieces tile the face exactly
    const quads = wallFaceQuads({ axis: 'x', plane: 128, from: 2, to: 4, base: 0, top: 104, x: 2, y: 0, d: 1, exit: false });
    assert.equal(quads.length, 6);
    let area = 0;
    for (const q of quads) {
      const c = q.corners;
      assert.ok(c.every((v, i) => i % 3 !== 0 || v === 128), 'every piece is on the plane of the face');
      area += Math.abs(c[8] - c[2]) * Math.abs(c[7] - c[1]);
      assert.ok(q.uv[2] > q.uv[0] && q.uv[3] > q.uv[1], 'its picture is a real rectangle');
    }
    assert.equal(area, 3 * 64 * 104, 'the pieces cover the face exactly, with no gaps and no overlap');
    const exitQuads = wallFaceQuads({ axis: 'z', plane: 64, from: 1, to: 1, base: 0, top: 64, x: 1, y: 0, d: 3, exit: true });
    assert.equal(exitQuads.length, 1);
    assert.equal(wallCellFor(1, 0, 3, true), WALL_CELLS.exit, 'an exit wears the green hatch');
    assert.equal(wallCellFor(5, 9, 2), wallCellFor(5, 9, 2), 'the same wall always looks the same');
    const seen = new Set();
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 30; x++)
        seen.add(wallCellFor(x, y, 0));
    }
    assert.ok(seen.size >= 5 && !seen.has(WALL_CELLS.exit), 'a wall mixes plain panels with vents, pipes, lights and consoles');
  },

  'doors are a box in a power-of-two atlas of steel with green lights, rusted in the shader on the door itself'() {
    const atlas = doorAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height), 'a power-of-two atlas can have mipmaps');
    assert.equal(atlas.width, 64 * DOOR_CELLS);
    let green = 0;
    let rusty = 0;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const o = (y * atlas.width + x) * 4;
        assert.equal(atlas.data[o + 3], 255, 'a door has no holes in it');
        if (atlas.data[o + 1] > atlas.data[o] * 1.6 && atlas.data[o + 1] > atlas.data[o + 2] * 1.2)
          green++;
        if (atlas.data[o] > atlas.data[o + 2] * 2.2 && atlas.data[o + 1] < atlas.data[o] * 0.5 && atlas.data[o] < 125)
          rusty++;
      }
    }
    assert.ok(green > 40, 'the status lights are green');
    assert.equal(rusty, 0, 'no rust is baked in: it is worked out in the shader');

    const { vertices, uvs } = doorBox(64, 64);
    assert.equal(vertices.length / 3, 30, 'four sides and a top, two triangles each');
    assert.equal(uvs.length / 2, 30);
    for (let i = 1; i < vertices.length; i += 3)
      assert.ok(vertices[i] >= 0 && vertices[i] <= 64, 'a door stands on the floor and no higher than its tile');
    assert.ok(DOOR_FRAGMENT.includes('vHeight < -0.01'), 'what has sunk below the floor is not drawn');
    assert.ok(DOOR_FRAGMENT.includes('vSurface'), 'rust follows the door, not the world, so it does not slide off as it sinks');
  },

  'the floor texture is a power-of-two atlas of opaque, dark deck tiles, rust is brown, and doorsteps are hazard stripes'() {
    const atlas = floorAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height), 'a power-of-two atlas can have mipmaps');
    assert.equal(atlas.width, TILE_PIXELS * FLOOR_CELL_COUNT);
    const average = (cell) => {
      const sum = [0, 0, 0];
      for (let y = 0; y < TILE_PIXELS; y++) {
        for (let x = 0; x < TILE_PIXELS; x++) {
          const o = (y * atlas.width + cell * TILE_PIXELS + x) * 4;
          assert.equal(atlas.data[o + 3], 255, 'a floor tile has no holes in it');
          for (let k = 0; k < 3; k++)
            sum[k] += atlas.data[o + k];
        }
      }
      return sum.map((v) => v / (TILE_PIXELS * TILE_PIXELS));
    };
    for (let cell = 0; cell < FLOOR_CELL_COUNT; cell++) {
      const [r, g, b] = average(cell);
      assert.ok(Math.max(r, g, b) < 110, `cell ${cell} stays dark enough for the lines to read over it`);
    }
    const [pr, , pb] = average(FLOOR_CELLS.plain);
    assert.ok(pb > pr, 'bare deck is blue-grey steel');
    for (let cell = 0; cell < FLOOR_CELL_COUNT; cell++) {
      if (cell === FLOOR_CELLS.hazard)
        continue;
      const [r, , b] = average(cell);
      assert.ok(b > r, `cell ${cell} has no rust baked in: the rust is worked out in the shader, so it crosses tiles`);
    }
    assert.ok(FLOOR_FRAGMENT.includes('vWorld') && FLOOR_VERTEX.includes('vWorld = world.xz'), 'rust follows the world, not the tile');
    const [hr, , hb] = average(FLOOR_CELLS.hazard);
    assert.ok(hr > hb, 'a doorstep is striped orange');

    const [u0, v0, u1, v1] = floorCellUv(3);
    assert.ok(u0 > 3 / FLOOR_CELL_COUNT && u1 < 4 / FLOOR_CELL_COUNT && v0 === 0 && v1 === 1, 'a cell is sampled a hair inside its edges');
    assert.equal(floorCellFor(4, 7, true), FLOOR_CELLS.hazard);
    assert.equal(floorCellFor(4, 7), floorCellFor(4, 7), 'the same tile always looks the same');
    const seen = new Set();
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 30; x++)
        seen.add(floorCellFor(x, y));
    }
    assert.ok(seen.size >= 7 && !seen.has(FLOOR_CELLS.hazard), 'a room mixes the patterns, and keeps the stripes for doors');
  },

  'the shotgun is a pixel-art sprite: a steel and wood gun in six frames, flashing and smoking when it fires and pumping after, sharp at whole screen pixels'() {
    const atlas = weaponAtlas();
    assert.equal(atlas.width, WEAPON_CELL_W * WEAPON_FRAME_COUNT);
    assert.equal(atlas.height, WEAPON_CELL_H);
    const frame = (f) => {
      let solid = 0;
      let bright = 0;
      let wood = 0;
      let lowest = 0;
      for (let y = 0; y < WEAPON_CELL_H; y++) {
        for (let x = 0; x < WEAPON_CELL_W; x++) {
          const o = (y * atlas.width + f * WEAPON_CELL_W + x) * 4;
          if (!atlas.data[o + 3])
            continue;
          solid++;
          lowest = Math.max(lowest, y);
          if (atlas.data[o] > 230 && atlas.data[o + 1] > 190)
            bright++;
          if (atlas.data[o] > atlas.data[o + 2] * 1.8 && atlas.data[o + 1] > 40 && atlas.data[o] < 200)
            wood++;
        }
      }
      return { solid, bright, wood, lowest };
    };
    const rest = frame(WEAPON_FRAMES.idle);
    assert.ok(rest.solid > 2500, 'the gun fills a good part of its picture');
    assert.ok(rest.wood > 150, 'the pump is wood');
    assert.equal(rest.lowest, WEAPON_CELL_H - 1, 'it stands on the bottom edge, so it can come up from under the screen');
    assert.ok(frame(WEAPON_FRAMES.flashA).bright > 60, 'the first frame of the shot is a bright flash');
    assert.ok(frame(WEAPON_FRAMES.flashA).solid > frame(WEAPON_FRAMES.flashB).solid, 'and the flash dies down');
    assert.ok(frame(WEAPON_FRAMES.smoke).solid > rest.solid, 'then there is smoke');
    assert.ok(frame(WEAPON_FRAMES.smoke).bright < 10, 'with no fire left in it');
    const pictures = new Set();
    for (let f = 0; f < WEAPON_FRAME_COUNT; f++) {
      let key = 0;
      for (let y = 0; y < WEAPON_CELL_H; y++) {
        for (let x = 0; x < WEAPON_CELL_W; x++)
          key = (Math.imul(key, 31) + atlas.data[(y * atlas.width + f * WEAPON_CELL_W + x) * 4 + 3] + atlas.data[(y * atlas.width + f * WEAPON_CELL_W + x) * 4]) | 0;
      }
      pictures.add(key);
    }
    assert.equal(pictures.size, WEAPON_FRAME_COUNT, 'every frame is its own picture');

    // the animation follows the time since the shot: flash, flash, smoke, rest, then the pump goes back and forth
    assert.equal(weaponFrame(-1), WEAPON_FRAMES.idle);
    assert.equal(weaponFrame(0.01), WEAPON_FRAMES.flashA);
    assert.equal(weaponFrame(WEAPON_TIMES.flashB + 0.001), WEAPON_FRAMES.flashB);
    assert.equal(weaponFrame(WEAPON_TIMES.smoke + 0.01), WEAPON_FRAMES.smoke);
    assert.equal(weaponFrame(WEAPON_TIMES.rest + 0.05), WEAPON_FRAMES.idle);
    assert.equal(weaponFrame(WEAPON_TIMES.pumpA + 0.01), WEAPON_FRAMES.pumpA);
    assert.equal(weaponFrame(WEAPON_TIMES.pumpB + 0.01), WEAPON_FRAMES.pumpB);
    assert.equal(weaponFrame(WEAPON_TIMES.pumpBack + 0.01), WEAPON_FRAMES.pumpA);
    assert.equal(weaponFrame(WEAPON_TIMES.done + 0.01), WEAPON_FRAMES.idle);
    assert.equal(weaponFrame(WEAPON_TIMES.pumpB + 0.01, false), WEAPON_FRAMES.idle, 'an empty gun is not pumped');
    assert.ok(WEAPON_TIMES.done < FIRE_COOLDOWN, 'the whole animation is over before the gun can fire again');
    let last = -1;
    for (let t = 0; t < FIRE_COOLDOWN; t += 1 / 60) {
      const f = weaponFrame(t);
      assert.ok(f >= 0 && f < WEAPON_FRAME_COUNT);
      last = f;
    }
    assert.equal(last, WEAPON_FRAMES.idle, 'it ends at rest');

    // placement: whole screen pixels per art pixel, centred, standing on the bottom, kicking up and swaying
    const still = weaponPlacement({ width: 1280, height: 760 });
    assert.ok(Number.isInteger(still.pixel) && still.pixel >= 2, 'pixels are whole, so the art stays sharp');
    assert.equal(still.x1 - still.x0, WEAPON_CELL_W * still.pixel);
    assert.equal(still.y1 - still.y0, WEAPON_CELL_H * still.pixel);
    assert.ok(Math.abs((still.x0 + still.x1) / 2 - 640) <= 1, 'centred');
    assert.ok(still.y1 > 760, 'it stands below the edge of the screen');
    const kicked = weaponPlacement({ width: 1280, height: 760, recoil: 1 });
    assert.ok(kicked.y1 < still.y1 && kicked.y1 > 760, 'the kick lifts it but never shows a gap under it');
    const swayed = weaponPlacement({ width: 1280, height: 760, bob: Math.PI / 2, moving: 1 });
    assert.ok(swayed.x0 !== still.x0, 'it sways as you walk');
    assert.ok(weaponPlacement({ width: 3000, height: 2000 }).pixel > still.pixel, 'and it is bigger on a bigger screen');
    const [u0, v0, u1, v1] = weaponCellUv(2);
    assert.ok(u0 > 2 / WEAPON_FRAME_COUNT && u1 < 3 / WEAPON_FRAME_COUNT && v0 === 0 && v1 === 1);
  },

  'blood thrown up sticks to the ceiling and lets go of drops; blood on a wall runs down it for a few seconds and stops'() {
    const game = new Game();
    game.load(0);
    const { blood } = game;
    blood.reset(game.level, game.rand);
    // a fountain straight up in the first room
    blood.spray(2 * 64, 3 * 64, 30, 0, 0, 200, { speed: 0, spread: 40, up: 560 });
    for (let i = 0; i < 90; i++)
      blood.update(1 / 60);
    assert.ok(blood.ceiling.length > 10, `only ${blood.ceiling.length} ceiling splats`);
    assert.ok(blood.ceiling.every((c) => c.height > 60 && c.height < 64), 'a ceiling splat is just under the ceiling');
    assert.ok(blood.ceiling.length <= BLOOD.ceiling, 'ceiling blood is capped');
    // they let go of drops that fall back down
    const before = blood.particles.length;
    for (let i = 0; i < 60 * 6; i++)
      blood.update(1 / 60);
    assert.ok(blood.floor.length > 0, 'the drops come down');
    assert.ok(blood.ceiling.some((c) => c.age > 5), 'ceiling splats age');
    void before;

    // a wall splat: drips are fixed by its seed, run down, slow, stop where they stop, and stay on the face
    const splat = { x: 192, y: 64, z: 61, nx: 0, ny: 1, size: 10, top: 64, seed: 4242, lo: -30, hi: 30 };
    const drips = wallDrips(splat.seed, splat.size);
    assert.deepEqual(drips, wallDrips(splat.seed, splat.size), 'the same seed always gives the same drips');
    assert.ok(drips.length >= 1 && drips.every((d) => d.length > 5 && d.duration > 2));
    const lowest = (age) => {
      const quads = wallDripQuads({ ...splat, age });
      let low = Infinity;
      for (const q of quads) {
        for (let k = 1; k < 12; k += 3)
          low = Math.min(low, q.corners[k]);
      }
      return { low, count: quads.length };
    };
    assert.equal(lowest(0).count, 0, 'nothing runs at the moment of the hit');
    const a = lowest(1.5).low;
    const b = lowest(3).low;
    const end = dripTime(splat.seed, splat.size);
    const c = lowest(end).low;
    assert.ok(a > b && b > c, 'the drips run down');
    assert.ok(a - b > (b - c) * 0.9, 'and they slow as they go');
    assert.equal(lowest(end + 5).low, c, 'then they stay where they stopped');
    for (const q of wallDripQuads({ ...splat, age: end })) {
      for (let k = 0; k < 12; k += 3) {
        assert.ok(Math.abs(q.corners[k + 2] - 64.45) < 1e-6, 'drips lie on the wall plane');
        assert.ok(q.corners[k + 1] >= 0.6 - 1e-6, 'and stop at the floor');
      }
    }
    // diversity: over many splats every kind of stem and tip shows up, in every motion, with stubs and long runs
    const stems = new Set();
    const tips = new Set();
    const profiles = new Set();
    const counts = new Set();
    const pixels = [];
    let stubs = 0;
    let longRuns = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const found = wallDrips(seed * 7919, 4 + (seed % 9));
      counts.add(found.length);
      for (const d of found) {
        stems.add(d.stem);
        tips.add(d.tip);
        profiles.add(d.profile);
        pixels.push(d.pixel);
        if (d.length < 10)
          stubs++;
        if (d.length > 30)
          longRuns++;
      }
    }
    assert.equal(stems.size, STEM_KINDS, 'every kind of stem is used');
    assert.equal(tips.size, TIP_KINDS, 'every kind of tip is used');
    assert.equal(profiles.size, 4, 'drips slow, stutter and creep');
    assert.ok(counts.size >= 4, 'splats have different numbers of drips');
    assert.ok(stubs > 50 && longRuns > 50, 'there are short stubs and long runs');
    assert.ok(Math.max(...pixels) / Math.min(...pixels) > 1.8, 'and thin and thick ones');
    // the tip is small: much smaller than the width of the stem it ends, and never a round blob
    assert.ok(Math.max(...TIP_HEIGHTS) <= 9, 'a tip is at most nine pixels tall');
    const atlas = bloodAtlas();
    for (let k = 0; k < TIP_KINDS; k++) {
      let n = 0;
      let widest = 0;
      for (let y = 0; y < TIP_HEIGHTS[k]; y++) {
        let row = 0;
        for (let x = 0; x < CELL; x++) {
          if (atlas.data[(y * atlas.width + (CELLS.tips + k) * CELL + x) * 4 + 3]) {
            n++;
            row++;
          }
        }
        widest = Math.max(widest, row);
      }
      assert.ok(n < TIP_HEIGHTS[k] * 4 + 2 && widest <= 7, `tip ${k} is a small point (${n} pixels, ${widest} wide), not a blob`);
    }
    // a face that ends beside the splat takes the drips that would hang past it
    const narrow = wallDripQuads({ ...splat, age: end, lo: -0.2, hi: 0.2 });
    assert.equal(narrow.length, 0);
    // the sim keeps the time the renderer needs to stop redrawing
    blood.reset(game.level, game.rand);
    blood.wallSplat(192, 64, 40, 0, 1, 10, 64);
    assert.equal(blood.walls[0].dripTime, dripTime(blood.walls[0].seed, 10));
    blood.update(0.1);
    assert.equal(blood.dripping, true, 'a fresh splat is dripping');
    for (let i = 0; i < 60 * 8; i++)
      blood.update(1 / 60);
    assert.equal(blood.dripping, false, 'and it stops');
  },

  'blood sprites: the atlas is red, the quads lie flat where they should, and a wall splat is cut at the edge of its face'() {
    const atlas = bloodAtlas();
    assert.equal(atlas.data.length, atlas.width * atlas.height * 4);
    assert.equal(atlas.width, atlas.frames * CELL);
    for (let cell = 0; cell < atlas.frames; cell++) {
      let solid = 0;
      for (let y = 0; y < CELL; y++) {
        for (let x = 0; x < CELL; x++) {
          const o = (y * atlas.width + cell * CELL + x) * 4;
          if (!atlas.data[o + 3])
            continue;
          solid++;
          assert.ok(atlas.data[o] >= atlas.data[o + 1] && atlas.data[o] >= atlas.data[o + 2], 'every pixel is red');
        }
      }
      // the tips of drips are the smallest sprites, a few pixels
      assert.ok(solid > (cell >= CELLS.tips ? 8 : 20), `cell ${cell} should have something drawn in it`);
    }
    assert.deepEqual(cellUv(0).map((v) => +v.toFixed(4)), [0, 0, +(1 / atlas.frames).toFixed(4), 1]);

    const floor = floorSplatQuad({ x: 200, y: 300, size: 6, seed: 99 });
    assert.equal(floor.corners.length, 12);
    for (let i = 1; i < 12; i += 3)
      assert.ok(Math.abs(floor.corners[i] - 0.3) < 1e-9, 'a floor splat lies just above the floor');
    const side = Math.hypot(floor.corners[3] - floor.corners[0], floor.corners[5] - floor.corners[2]);
    assert.ok(Math.abs(side - 19.2) < 1e-9, 'a floor splat is 3.2 times its size across');

    const print = printQuad({ x: 100, y: 100, angle: 0.5, side: 1, strength: 1, scale: 1 });
    const mirrored = printQuad({ x: 100, y: 100, angle: 0.5, side: -1, strength: 1, scale: 1 });
    assert.equal(print.uv[1], 0);
    assert.equal(mirrored.uv[1], 1, 'a left foot is the right one upside down');
    assert.notDeepEqual(print.uv, printQuad({ x: 100, y: 100, angle: 0.5, side: 1, strength: 0.2, scale: 1 }).uv, 'a faint print is an outline');

    // a splat on a wall face: it stays on the face's plane, inside its ends and below its top, whatever the corner
    const game = new Game();
    game.load(1);
    const { level, blood } = game;
    let checked = 0;
    for (let ty = 0; ty < level.rowCount; ty++) {
      for (let tx = 0; tx < level.width; tx++) {
        const i = ty * level.width + tx;
        if (!level.kind[i] || level.kind[i] === DOOR || level.heights[i] <= 20)
          continue;
        for (const [nx, ny] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!level.inBounds(tx + nx, ty + ny) || level.heights[(ty + ny) * level.width + tx + nx] > 0)
            continue;
          const fx = (tx + (nx > 0 ? 1 : 0)) * 64;
          const fy = (ty + (ny > 0 ? 1 : 0)) * 64;
          for (const along of [0.2, 3, 32, 61, 63.8]) {
            const x = nx ? fx : tx * 64 + along;
            const y = ny ? fy : ty * 64 + along;
            blood.wallSplat(x, y, 30, nx, ny, 12, level.heights[i]);
            const splat = blood.walls[blood.walls.length - 1];
            const quad = wallSplatQuad(splat);
            if (!quad)
              continue;
            checked++;
            for (let k = 0; k < 12; k += 3) {
              const px = quad.corners[k];
              const py = quad.corners[k + 1];
              const pz = quad.corners[k + 2];
              // on the plane of the face, a hair in front of it
              assert.ok(Math.abs((nx ? px - fx : pz - fy) * (nx || ny) - 0.4) < 1e-6, 'a wall splat lies on its face');
              // within the stretch of face that runs either side of the splat
              const u = (px - splat.x) * -ny + (pz - splat.y) * nx;
              assert.ok(u >= splat.lo - 1e-6 && u <= splat.hi + 1e-6, 'a wall splat does not run past a corner');
              assert.ok(py >= 0.6 - 1e-6 && py <= level.heights[i] - 0.6 + 1e-6, 'a wall splat stays between the floor and the top');
            }
            for (let k = 0; k < 4; k += 2)
              assert.ok(quad.uv[k] >= cellUv(6)[0] - 1e-9 && quad.uv[k] <= cellUv(9)[2] + 1e-9, 'its picture stays inside the atlas');
          }
        }
      }
    }
    assert.ok(checked > 100, 'no wall splats were checked');
    // cut entirely away by a face that is too narrow
    assert.equal(wallSplatQuad({ x: 64, y: 100, z: 30, nx: -1, ny: 0, size: 6, top: 64, seed: 5, lo: -0.1, hi: 0.2 }), null);

    // blood on the player's view: a starburst that grows, and a drip that runs down and fades with it
    const splat = { x: 0.5, y: 0.4, size: 60, age: 0, drip: 120, seed: 77 };
    const fresh0 = screenSplatQuads(splat, 1000, 800, 1);
    const grown = screenSplatQuads({ ...splat, age: 2 }, 1000, 800, 0.5);
    assert.equal(fresh0.length, 1, 'a fresh splat has no drip yet');
    assert.ok(grown.length >= 3, 'an older one has a drip, made of a stem and a tip');
    assert.ok(grown[0].x1 - grown[0].x0 > fresh0[0].x1 - fresh0[0].x0, 'the starburst grows');
    assert.ok(grown.every((q) => q.fade === 0.5), 'all of it fades together');
    const dripQuads = grown.slice(1);
    const reach = Math.max(...dripQuads.map((q) => q.y1)) - Math.min(...dripQuads.map((q) => q.y0));
    assert.ok(Math.min(...dripQuads.map((q) => q.y0)) > grown[0].y0, 'the drip starts inside the burst and runs down from it');
    assert.ok(reach > 100, 'the drip runs down');

    const particle = particleQuad({ x: 10, y: 20, z: 30, gib: false }, [1, 0, 0], [0, 1, 0], 0);
    assert.deepEqual(particle.corners.map((v) => +v.toFixed(6)), [8.6, 28.6, 20, 11.4, 28.6, 20, 11.4, 31.4, 20, 8.6, 31.4, 20], 'a droplet faces the camera');
  },

  'adaptive resolution drops on slow frames, ignores stalls and rises only after a long fast spell'() {
    const q = new Quality();
    const feed = (dt, seconds) => {
      const frames = Math.round(seconds / dt / 45) * 45; // whole averaging windows
      for (let i = 0; i < frames; i++) q.update(dt);
    };

    feed(1 / 60, 20);
    assert.equal(q.scale, 1, 'a steady 60 fps must stay sharp');

    for (let i = 0; i < 500; i++) q.update(0.5);
    assert.equal(q.scale, 1, 'stalls must not count as slow frames');

    feed(1 / 30, 1.5);
    assert.ok(q.scale < 1, 'a 30 fps stretch must lower the resolution');
    const dropped = q.scale;

    feed(1 / 60, 4);
    assert.equal(q.scale, dropped, 'it must not bounce back quickly');
    feed(1 / 60, 12);
    assert.ok(q.scale > dropped, 'it should recover after a long fast spell');
  },

  'adaptive resolution stops retrying a level that failed right after a rise'() {
    const q = new Quality();
    const feed = (dt, seconds) => {
      const frames = Math.round(seconds / dt / 45) * 45; // whole averaging windows
      for (let i = 0; i < frames; i++) q.update(dt);
    };

    feed(1 / 30, 1.5);
    const low = q.scale;
    feed(1 / 60, 12);
    assert.ok(q.scale > low, 'rose');
    feed(1 / 30, 1.5); // the sharper level cannot be sustained
    assert.equal(q.scale, low);
    feed(1 / 60, 60);
    assert.equal(q.scale, low, 'must not try the failed level again');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${name}\n     ${error.message}`);
  }
}
process.exit(failed ? 1 : 0);
