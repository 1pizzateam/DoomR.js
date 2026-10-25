import assert from 'node:assert/strict';
import { Clock, Player, Quality } from '@1pizzateam/loopr';
import { AmbientLight, CustomMesh, Material, MAX_LIGHTS, Mesh, PointLight, Rand, Vec2, Vec3 } from '@1pizzateam/roostr';
import { CAT, DIFFICULTIES, DIFFICULTY_ORDER, ENEMY_TYPES, Game } from '../src/game.js';
import { BLOOD } from '../src/blood.js';
import { RECIPES, Sound, spatial } from '../src/audio.js';
import { validateSong } from '@1pizzateam/groovr';
import { FADE_IN, FADE_OUT, Music, SONGS } from '../src/music.js';
import { HOLE_VARIANTS, holeQuad, IMPACT_CELL_COUNT, IMPACT_CELLS, impactAtlas, impactCellUv, SLASH_VARIANTS, SPARK_FRAMES, SPARK_VARIANTS } from '../src/impacts.js';
import { LEVELS } from '../src/levels.js';
import { FACE_CELL_H, FACE_CELL_W, FACE_DEAD_FRAME, FACE_FRAME_COUNT, FACE_POSE_COUNT, FACE_POSES, faceAtlas, faceCellUv, faceFrame, facePlacement } from '../src/face.js';
import { WEAPON_CELL_H, WEAPON_CELL_W, WEAPON_FRAME_COUNT, WEAPON_FRAMES, WEAPON_ORDER, WEAPON_SLOTS, WEAPON_TIMES, WEAPONS, arsenalAtlas, weaponAtlas, weaponCellUv, weaponFrame, weaponPlacement } from '../src/weapon.js';
import { ARSENAL_CELL, ARSENAL_FRAMES, CHAINSAW_TOOTH_PITCH, chaingunAtlas, chaingunMesh, chaingunParts, chaingunPose, chainsawAtlas, chainsawMesh, chainsawParts, chainsawPose, KNIFE_ATTACKS, knifeAtlas, knifeMesh, knifeParts, knifePose, rocketLauncherAtlas, rocketLauncherMesh, rocketLauncherParts, rocketLauncherPose, shotgunAtlas, shotgunMesh, shotgunParts, shotgunPose } from '../src/arsenal.js';
import { AMMO_FLASH_DURATION, FIRE_COOLDOWN } from '../src/game.js';
import { BOOM_LIGHT_COLOR, CEILING_CELL_COUNT, CEILING_CELLS, CEILING_CONE_FRAGMENT, CEILING_CONE_VERTEX, CEILING_FRAGMENT, CEILING_LIGHT_ATTENUATION, collectDynamicLights, ceilingAtlas, ceilingCellFor, ceilingCellUv, ceilingLightCones, ceilingLightFixtures, createCeilingLights, DEIMOS_ANGULAR_RADIUS, DEIMOS_CENTER, DYNAMIC_LIGHT_ATTENUATION, FIREBALL_LIGHT_COLOR, MARS_SKY_FRAGMENT, MARS_SKY_HEIGHT, MARS_SKY_VERTEX, MARS_SKY_WIDTH, MUZZLE_LIGHT_ATTENUATION, MUZZLE_LIGHT_COLOR, marsSkyAtlas, marsSkyMesh, PHOBOS_ANGULAR_RADIUS, PHOBOS_CENTER, ROCKET_LIGHT_COLOR, skyPixelDir, TELEPORT_LIGHT_COLOR, updateCeilingLights } from '../src/ceiling.js';
import { diagWallFaceQuads, marsRockAtlas, WALL_CELL_COUNT, WALL_CELLS, wallAtlas, wallCellFor, wallFaceQuads } from '../src/wall.js';
import { DOOR_CELLS, DOOR_FRAGMENT, DOOR_INSET, DOOR_THICKNESS, WALL_FRAGMENT, doorAtlas, doorBox, doubleDoorBox, lockedDoorAtlas, secretDoorBox } from '../src/door.js';
import { BARREL_ATLAS, BARREL_STAVE_COUNT, barrelAtlas, barrelExplosionPose, barrelShrapnelParts, barrelWreckMesh, createBarrelExplosionPose, skinBarrel } from '../src/barrel.js';
import { createExplosion3dPose, EXPLOSION_3D_CELL, EXPLOSION_3D_CELLS, EXPLOSION_3D_FRAMES, EXPLOSION_CELL, EXPLOSION_FLOOR_Y, EXPLOSION_FRAMES, EXPLOSION_PARTICLE_COUNT, explosion3dAtlas, explosion3dMesh, explosion3dPose, explosionAtlas, explosionParticleQuads, teleportAtlas } from '../src/explosion.js';
import { CRATE_CELL, CRATE_FRAGMENT, CRATE_FRAMES, FLOOR_CELL_COUNT, FLOOR_CELLS, FLOOR_FRAGMENT, FLOOR_VERTEX, MARS_BOULDER_BASE_INSET, MARS_BOULDER_CELL_COUNT, MARS_BOULDER_SLOPE, MARS_DIRT_FRAGMENT, MARS_ROCK_FRAGMENT, SLIME_FRAGMENT, TELEPORTER_FRAGMENT, crateAtlas, crateMesh, crateQuads, floorAtlas, floorCellFor, floorCellUv, marsBoulderAtlas, marsBoulderMesh, marsBoulderQuads, marsDirtAtlas, slimeAtlas, teleporterAtlas, teleporterMachineMesh, teleporterMachineQuads, TILE_PIXELS } from '../src/floor.js';
import { LIGHT_GLSL, PARTICLE_FRAGMENT, SOLID_ALPHA, SOLID_TEXTURED_FRAGMENT, TEXTURED_FRAGMENT } from '../src/quads.js';
import { CELLS, GIB_VARIANTS, STEM_KINDS, TIP_HEIGHTS, TIP_KINDS, dripTime, wallDrips, wallDripQuads, screenSplatQuads, bloodAtlas, CELL, cellUv, floorGibQuad, floorSplatQuad, particleQuad, printQuad, wallSplatQuad } from '../src/bloodsprites.js';
import { CROUCH_EYE, DIAG_NE, DIAG_NW, DIAG_SE, DIAG_SW, DOOR, EYE, Level, PILLAR } from '../src/level.js';
import { Fog } from '../src/fog.js';
import { MONSTER_SKIN_CELL, MONSTER_SKIN_CELLS, MONSTER_SKIN_FRAMES, MONSTERS, monsterGoreSkinAtlas, monsterMesh, monsterParts, monsterSkinAtlas } from '../src/monsters.js';
import { MONSTER_ATLASES, MONSTER_FRAMES, WRAITH_FRAMES, wraithAtlas } from '../src/sprites.js';
import { SHOTS, TitleDirector } from '../src/title.js';
import { EXPLOSION_3D_FRAGMENT, EXPLOSION_3D_VERTEX, explosionWidth, LINE_FRAGMENT, LINE_VERTEX, MARS_INDOOR_FOG, MARS_NVG_FOG, MARS_OUTDOOR_FOG, MONSTER_FRAGMENT, marsFogNearFar, registerStaticChunk, SPARK_PARTICLE_FRAGMENT, SPRITE_FRAGMENT, World } from '../src/world.js';
import { MEDIKIT_CELL, MEDIKIT_CELLS, MEDIKIT_FRAMES, medikitAtlas, medikitMesh } from '../src/medikit.js';
import { AMMO_CELL, AMMO_CELLS, AMMO_FRAMES, AMMO_TYPES, ammoAtlas, ammoMesh, bulletAtlas, bulletMesh, rocketAmmoAtlas, rocketAmmoMesh } from '../src/ammo.js';
import { KEYCARD_CELL, KEYCARD_CELLS, KEYCARD_FRAMES, keycardAtlas, keycardMesh } from '../src/keycard.js';
import { ARMOR_CELL, ARMOR_CELLS, ARMOR_COLORS, ARMOR_FRAMES, ARMOR_TYPES, armorAtlas, armorMesh } from '../src/armor.js';
import { POWERUP_CELL, POWERUP_CELLS, POWERUP_FRAMES, POWERUP_TYPES, berserkAtlas, berserkMesh, nightvisionAtlas, nightvisionMesh, radsuitAtlas, radsuitMesh, soulsphereAtlas, soulsphereMesh } from '../src/powerups.js';
import { FIREBALL_CELL, FIREBALL_FRAMES, fireballAtlas } from '../src/fireball.js';
import { Hud, SCREEN_BLOOD_ALPHA } from '../src/hud.js';
import { Input } from '../src/input.js';

const idle = { forward: 0, strafe: 0, turn: 0, mouseX: 0, run: false, fire: false, use: false };
const input = (patch) => ({ ...idle, ...patch });

function run(game, seconds, controls = idle) {
  for (let t = 0; t < seconds; t += 1 / 60)
    game.update(1 / 60, controls);
}

function fresh(levelIndex = 0) {
  const game = new Game();
  game.load(levelIndex, {
    health: 100,
    shells: 24,
    bullets: 50,
    rockets: 0,
    weapons: { knife: true, chainsaw: true, shotgun: true, chaingun: false, rocket: false },
    weapon: 'shotgun',
  });
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
    warden[0].roar = 0;
    warden[0].cooldown = 0;
    warden[0].los = true;
    warden[0].losTimer = 10;
    level.state = 'play';
    level.player.body.setPosition(new Vec2(warden[0].pos.x + 220, warden[0].pos.y));
    run(level, 0.8);
    assert.ok(level.shots.length >= 3, 'the warden fires a fan of fireballs at medium range');
  },

  'a wraith is a flat sprite: it wails when it wakes, drifts in, rakes the player and drops no limbs'() {
    const atlas = wraithAtlas();
    assert.equal(atlas.data.length, atlas.width * atlas.height * 4);
    const count = (frame) => {
      let solid = 0;
      let eyes = 0;
      let shroud = 0;
      let bone = 0;
      let blood = 0;
      for (let y = 0; y < atlas.height; y++) {
        for (let x = 0; x < atlas.cell; x++) {
          const o = (y * atlas.width + frame * atlas.cell + x) * 4;
          const r = atlas.data[o];
          const g = atlas.data[o + 1];
          const b = atlas.data[o + 2];
          const a = atlas.data[o + 3];
          solid += a ? 1 : 0;
          eyes += g === 255 ? 1 : 0;
          if (a && g < 255 && b < 255) {
            if (b > r && r > g)
              shroud++;
            else if (r > g && g > b && g > 130)
              bone++;
            else if (r > 120 && r > b * 2)
              blood++;
          }
        }
      }
      return { solid, eyes, shroud, bone, blood };
    };
    for (const frame of [0, 1, 2, 3, WRAITH_FRAMES.dying[0]]) {
      const { solid, eyes, shroud, bone, blood } = count(frame);
      assert.ok(solid > 200 && solid < atlas.cell * atlas.height, `frame ${frame} should be a shape, not a block`);
      assert.ok(eyes >= 4, `frame ${frame} should have eyes`);
      assert.ok(shroud > 80, `frame ${frame} should have a necrotic violet/indigo shroud`);
      assert.ok(bone > 8, `frame ${frame} should have pale bone claws, ribs, or fangs`);
      assert.ok(blood > 8, `frame ${frame} should have blood-tipped claws and crimson accents`);
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
    game.rand = Rand.create(1);
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

    // an ammo crate is picked up whatever is in hand, and fills the shell pool up to its own cap
    assert.deepEqual([AMMO_TYPES.shells.max, AMMO_TYPES.bullets.max, AMMO_TYPES.rockets.max], [80, 200, 40], 'ammo caps are 80 shells, 200 bullets, 40 rockets');
    for (const weapon of ['chainsaw', 'chaingun', 'rocket']) {
      const g = fresh();
      clearEnemies(g);
      g.player.weapons.chaingun = true;
      g.player.weapons.rocket = true;
      g.player.weapon = weapon;
      g.player.shells = 10;
      const crate = g.pickups.find((p) => p.type === 'ammo');
      g.touch(crate.body);
      assert.equal(g.player.shells, 10 + AMMO_TYPES.shells.bonus, `ammo crate is picked up while holding ${weapon}`);
      assert.equal(crate.taken, true, `ammo crate is taken while holding ${weapon}`);
    }
    // every ammo crate in every level is collected by walking onto it, whatever is in hand, and says so when its pool is full
    for (let level = 0; level < LEVELS.length; level++)
      for (const [type, pool] of [['ammo', 'shells'], ['bullets', 'bullets'], ['rockets', 'rockets']]) {
        const walk = (hold, amount) => {
          const g = fresh(level);
          clearEnemies(g);
          g.player.weapons.chaingun = true;
          g.player.weapons.rocket = true;
          g.player.weapon = hold;
          g.player[pool] = amount;
          const crate = g.pickups.find((p) => p.type === type);
          assert.ok(crate, `level ${level} has a ${type} crate`);
          g.player.body.setPosition(crate.pos.clone());
          run(g, 0.2);
          return { g, crate };
        };
        for (const hold of ['shotgun', 'chainsaw', 'chaingun', 'rocket']) {
          const { g, crate } = walk(hold, 0);
          assert.equal(crate.taken, true, `level ${level} ${type} crate is collected while holding ${hold}`);
          assert.equal(g.player[pool], AMMO_TYPES[pool].bonus, `level ${level} ${type} crate fills the ${pool} pool`);
        }
        const { g, crate } = walk('chainsaw', AMMO_TYPES[pool].max);
        assert.equal(crate.taken, false, `level ${level} ${type} crate stays when ${pool} are full`);
        assert.equal(g.message.text, `${AMMO_TYPES[pool].label} full`, `level ${level} ${type} crate says ${pool} are full`);
      }
    const capped = fresh();
    clearEnemies(capped);
    capped.player.shells = AMMO_TYPES.shells.max - 3;
    const crate = capped.pickups.find((p) => p.type === 'ammo');
    capped.touch(crate.body);
    assert.equal(capped.player.shells, AMMO_TYPES.shells.max, 'shells never exceed their cap');
    const full = fresh();
    clearEnemies(full);
    full.player.weapon = 'chainsaw';
    full.player.shells = AMMO_TYPES.shells.max;
    const crate2 = full.pickups.find((p) => p.type === 'ammo');
    full.touch(crate2.body);
    assert.equal(crate2.taken, false, 'a crate is left alone when shells are full');
    assert.equal(full.message.text, 'SHELLS full', 'a refused crate says why');
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

    // shotgun pellets deal full damage up close and fall off at long range
    clearEnemies(game);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.angle = 0;
    const closeBrute = game.addEnemy('brute', new Vec2(6 * 64 + 80, 9 * 64 + 32));
    game.player.cooldown = 0;
    game.fireShotgun();
    const closeDamage = ENEMY_TYPES.brute.hp - closeBrute.hp;
    assert.equal(closeDamage, WEAPONS.shotgun.pellets * WEAPONS.shotgun.damage, 'point-blank shotgun blast lands all pellets at full damage (18)');

    clearEnemies(game);
    const farBrute = game.addEnemy('brute', new Vec2(6 * 64 + 440, 9 * 64 + 32));
    game.player.cooldown = 0;
    game.fireShotgun();
    const farDamage = ENEMY_TYPES.brute.hp - farBrute.hp;
    assert.ok(farDamage < closeDamage * 0.45, `long-range shotgun blast drops off sharply from spread and distance falloff (${farDamage} vs ${closeDamage})`);
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
    game.rand = Rand.create(2);
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

  'killing an enemy bursts into gore, gibs and a settled pool that stops growing'() {
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
    assert.ok(game.blood.floor.length > before + 8, 'falling droplets land on the floor');
    game.blood.ceiling.length = 0;
    game.blood.particles.length = 0;
    const settled = game.blood.floor.length;
    run(game, 2);
    assert.equal(game.blood.floor.length, settled, 'floor blood does not keep growing after death');
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
    const slash = holeQuad({ ...hole, kind: 'slash' });
    const splat = wallSplatQuad({ ...hole, size: 10 });
    const drips = wallDripQuads({ ...hole, size: 10, age: 2 });
    for (let i = 0; i < 12; i += 3) {
      assert.ok(Math.abs(quad.corners[i + 2] - 64.25) < 1e-6, 'every corner must sit just in front of the face');
      assert.ok(quad.corners[i + 2] < splat.corners[i + 2], 'bullet holes must sit behind wall blood splats');
      assert.ok(slash.corners[i + 2] < splat.corners[i + 2], 'chainsaw marks must sit behind wall blood splats');
      if (drips.length > 0)
        assert.ok(quad.corners[i + 2] < drips[0].corners[i + 2], 'bullet holes and chainsaw marks must sit behind wall blood drips');
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
      const open = (x, y) => level.inBounds(Math.floor(x / 64), Math.floor(y / 64)) && level.heightAtPoint(new Vec2(x, y)) <= 0;
      const solid = (x, y) => level.inBounds(Math.floor(x / 64), Math.floor(y / 64)) && level.heightAtPoint(new Vec2(x, y)) > 0;
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
    // the ground blocks downward expansion: nothing appears below EXPLOSION_FLOOR_Y, and the blast spreads wide along the floor
    for (let f = 0; f < EXPLOSION_FRAMES; f++)
      for (let y = EXPLOSION_FLOOR_Y + 1; y < EXPLOSION_CELL; y++)
        for (let x = 0; x < EXPLOSION_CELL; x++)
          assert.equal(atlas.data[(y * atlas.width + f * EXPLOSION_CELL + x) * 4 + 3], 0, `frame ${f} leaks below the floor at y=${y}`);
    const bounds = (frame) => {
      let minX = EXPLOSION_CELL;
      let maxX = -1;
      let minY = EXPLOSION_CELL;
      let maxY = -1;
      let floorContacts = 0;
      for (let y = 0; y < EXPLOSION_CELL; y++) {
        for (let x = 0; x < EXPLOSION_CELL; x++) {
          const a = atlas.data[(y * atlas.width + frame * EXPLOSION_CELL + x) * 4 + 3];
          if (a < 40)
            continue;
          if (x < minX)
            minX = x;
          if (x > maxX)
            maxX = x;
          if (y < minY)
            minY = y;
          if (y > maxY)
            maxY = y;
          if (y >= EXPLOSION_FLOOR_Y - 1)
            floorContacts++;
        }
      }
      return { width: maxX - minX + 1, height: maxY - minY + 1, maxY, floorContacts };
    };
    const early = bounds(3);
    assert.equal(early.maxY, EXPLOSION_FLOOR_Y, 'the blast sits flush against the floor line');
    assert.ok(early.floorContacts >= 28, 'the bottom of the fireball flattens into a wide skirt along the floor');
    assert.ok(early.width > early.height * 1.15, 'the ground-deflected blast is wider than it is tall (non-spherical)');
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
    assert.equal(CEILING_CELL_COUNT, 8, 'all 8 ceiling atlas cells are distinct overhead architectural structures');
    const signatures = new Set();
    for (let cell = 0; cell < CEILING_CELL_COUNT; cell++) {
      let r = 0;
      let b = 0;
      let hash = 0;
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const o = (y * atlas.width + cell * 64 + x) * 4;
          assert.equal(atlas.data[o + 3], 255);
          r += atlas.data[o];
          b += atlas.data[o + 2];
          hash = (Math.imul(hash, 31) + atlas.data[o] + atlas.data[o + 1] * 3 + atlas.data[o + 2] * 7) | 0;
        }
      }
      assert.ok(b > r, `ceiling cell ${cell} is cool gunmetal/slate overhead steel`);
      signatures.add(hash);
    }
    assert.equal(signatures.size, CEILING_CELL_COUNT, 'every ceiling cell has a unique pixel-art pattern');
    const light = (y, x) => atlas.data[(y * atlas.width + CEILING_CELLS.light * 64 + x) * 4 + 2];
    assert.ok(light(32, 30) > 150, 'a light fixture is bright');
    assert.equal(ceilingCellFor(2, 3), CEILING_CELLS.light);
    assert.equal(ceilingCellFor(7, 3), CEILING_CELLS.light, 'fixtures repeat every five by four tiles');
    assert.notEqual(ceilingCellFor(2, 2), CEILING_CELLS.light, 'adjacent rows are not crowded with light fixtures');
    assert.equal(ceilingCellFor(3, 7), ceilingCellFor(3, 7), 'the same ceiling every time');
    const seen = new Set();
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++)
        seen.add(ceilingCellFor(x, y));
    }
    assert.equal(seen.size, CEILING_CELL_COUNT, 'rooms mix all 8 coffered overhead ceiling cells');
    assert.ok(!CEILING_FRAGMENT.includes('RUST_BRIGHT'), 'ceiling shader does not paint brown floor rust puddles onto the ceiling');
    assert.ok(CEILING_FRAGMENT.includes('edgeGirder'), 'ceiling shader accentuates overhead coffer girder seams');
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

  'the shotgun is a pixel-art sprite: a steel and wood gun in five frames, flashing when it fires and pumping after, sharp at whole screen pixels'() {
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

    // the animation follows the time since the shot: flash, flash, rest, then the pump goes back and forth
    assert.equal(weaponFrame(-1), WEAPON_FRAMES.idle);
    assert.equal(weaponFrame(0.01), WEAPON_FRAMES.flashA);
    assert.equal(weaponFrame(WEAPON_TIMES.flashB + 0.001), WEAPON_FRAMES.flashB);
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
        for (let x = 0; x < CELL; x++)
          if (atlas.data[(y * atlas.width + (CELLS.tips + k) * CELL + x) * 4 + 3]) {
            n++;
            row++;
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

    // Hud.drawBlood always keeps screen blood translucent so the player can see the 3D world behind it
    assert.ok(SCREEN_BLOOD_ALPHA >= 0.6 && SCREEN_BLOOD_ALPHA <= 0.85, 'screen blood max alpha is translucent yet clearly visible');
    const drawnAlphas = [];
    const hud = new Hud(
      { width: 800, height: 600, getContext: () => ({}) },
      {
        crisp: {
          sprites: {
            quad(_x0, _y0, _x1, _y1, _uv, a) {
              drawnAlphas.push(a);
            },
          },
        },
      },
    );
    hud.width = 800;
    hud.height = 600;
    hud.drawBlood({ blood: { splats: [{ x: 0.5, y: 0.5, size: 50, age: 0, life: 4, drip: 120, seed: 42 }] } });
    assert.ok(drawnAlphas.length > 0 && drawnAlphas.every((a) => a > 0 && a <= SCREEN_BLOOD_ALPHA + 1e-6), 'fresh visor blood splats are always translucent');

    const particle = particleQuad({ x: 10, y: 20, z: 30, gib: false }, [1, 0, 0], [0, 1, 0], 0);
    assert.deepEqual(particle.corners.map((v) => +v.toFixed(6)), [9.35, 29.35, 20, 10.65, 29.35, 20, 10.65, 30.65, 20, 9.35, 30.65, 20], 'a droplet faces the camera');
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

  'the HUD marine face is an animated sprite atlas that glances around, scowls when shooting, winces on damage and bleeds as health drops'() {
    const atlas = faceAtlas();
    assert.equal(atlas.width, FACE_CELL_W * FACE_FRAME_COUNT);
    assert.equal(atlas.height, FACE_CELL_H);
    const pictures = new Set();
    let armorSteel = 0;
    let cyanTelemetry = 0;
    const crimsonCount = (f) => {
      let red = 0;
      let key = 0;
      for (let y = 0; y < FACE_CELL_H; y++)
        for (let x = 0; x < FACE_CELL_W; x++) {
          const o = (y * atlas.width + f * FACE_CELL_W + x) * 4;
          const r = atlas.data[o];
          const g = atlas.data[o + 1];
          const b = atlas.data[o + 2];
          const a = atlas.data[o + 3];
          key = (Math.imul(key, 31) + r + g + a) | 0;
          if (a && r > g * 2.2 && r > b * 2.2)
            red++;
          if (f === 0 && a && b > r * 1.15 && g > r * 1.05 && (y <= 16 || y >= 34))
            armorSteel++;
          if (f === 0 && a && b >= 200 && g >= 160 && b > r * 2)
            cyanTelemetry++;
        }
      pictures.add(key);
      return red;
    };
    for (let f = 0; f < FACE_FRAME_COUNT; f++)
      crimsonCount(f);
    assert.equal(pictures.size, FACE_FRAME_COUNT, 'every face frame is distinct');
    assert.ok(armorSteel > 450, 'marine wears futuristic steel/slate helmet and power-armor pauldrons/gorget');
    assert.ok(cyanTelemetry >= 20, 'helmet brow-visor, holo-reticle, and chest armor vents have glowing cyan telemetry LEDs');
    const tier80Frame = faceFrame({ health: 80, time: 0 });
    assert.equal(tier80Frame, 1 * FACE_POSE_COUNT + FACE_POSES.center, '80% health uses damage tier 1');
    assert.ok(crimsonCount(tier80Frame) >= crimsonCount(0) + 40, 'visible blood appears on the marine face even at 80% health');
    for (let t = 1; t < 5; t++)
      assert.ok(crimsonCount(t * FACE_POSE_COUNT) > crimsonCount((t - 1) * FACE_POSE_COUNT), `damage tier ${t} is bloodier than tier ${t - 1}`);

    // reactions to health, hurt, shooting, and idle time
    assert.equal(faceFrame({ health: 0 }), FACE_DEAD_FRAME, 'dead at 0 health');
    assert.equal(faceFrame({ health: 100, hurt: 0.3 }), FACE_POSES.pain, 'winces immediately when hurt');
    assert.equal(faceFrame({ health: 100, hurt: 0, shotElapsed: 0.1 }), FACE_POSES.shoot, 'scowls fiercely when firing');
    assert.equal(faceFrame({ health: 30, hurt: 0.25 }), 3 * FACE_POSE_COUNT + FACE_POSES.pain, 'hurt in tier 3');
    const idleFrames = new Set([0, 1, 2, 3, 4, 5].map((s) => faceFrame({ health: 100, time: s / 1.15 + 0.01 })));
    assert.ok(idleFrames.has(FACE_POSES.center) && idleFrames.has(FACE_POSES.left) && idleFrames.has(FACE_POSES.right), 'glances left and right while idle');

    const calm = facePlacement({ width: 1280, height: 760, hurt: 0 });
    const jolted = facePlacement({ width: 1280, height: 760, hurt: 0.25 });
    assert.equal(calm.x1 - calm.x0, FACE_CELL_W * calm.pixel);
    assert.equal(calm.y1 - calm.y0, FACE_CELL_H * calm.pixel);
    assert.ok(jolted.x0 !== calm.x0 || jolted.y0 !== calm.y0, 'taking damage jolts the portrait box');
    const [u0, v0, u1, v1] = faceCellUv(3);
    assert.ok(u0 > 3 / FACE_FRAME_COUNT && u1 < 4 / FACE_FRAME_COUNT && v0 === 0 && v1 === 1);

    // barrel explosion spawns a single floor-grounded 'boom' right at the barrel's position with world-scale width
    const game = fresh();
    clearEnemies(game);
    const barrel = game.barrels[0];
    const bx = barrel.pos.x;
    const by = barrel.pos.y;
    game.effects.length = 0;
    game.detonate(barrel);
    assert.equal(game.effects.length, 1, 'barrel detonation spawns a single explosion effect at the barrel');
    assert.equal(game.effects[0].type, 'boom');
    assert.equal(game.effects[0].x, bx, 'explosion x is right where the barrel stood');
    assert.equal(game.effects[0].y, by, 'explosion y is right where the barrel stood');
    assert.equal(game.effects[0].z, 0, 'explosion is grounded on the floor');
    assert.equal(explosionWidth(game.effects[0]), 120, 'barrel explosion spreads wide across the floor around the barrel');
  },

  'ceiling light fixture tiles position RoostR PointLight and AmbientLight sources and drive dynamic surface lighting'() {
    const game = fresh(0);
    const { level } = game;
    const fixtures = ceilingLightFixtures(level);
    assert.ok(fixtures.length >= 10 && fixtures.length <= Math.ceil((level.width * level.rowCount) / 18), 'a level has sparse, well-spaced ceiling light fixtures');
    for (const fixture of fixtures) {
      assert.ok(fixture.tile instanceof Vec2 && fixture.position instanceof Vec3, 'fixtures use Vec2 tile coords and Vec3 positions');
      assert.equal(ceilingCellFor(fixture.tile.x, fixture.tile.y), CEILING_CELLS.light, 'every fixture sits on a ceiling light cell');
      assert.equal(fixture.position.x, (fixture.tile.x + 0.5) * 64);
      assert.equal(fixture.position.y, 62);
      assert.equal(fixture.position.z, (fixture.tile.y + 0.5) * 64);
    }

    const added = [];
    let cleared = 0;
    const mockScene = {
      clearLights() {
        cleared++;
        added.length = 0;
      },
      addLight(light) {
        added.push(light);
      },
    };
    const { ambient, pointLights } = createCeilingLights(mockScene);
    assert.equal(cleared, 1);
    assert.ok(ambient instanceof AmbientLight, 'uses RoostR AmbientLight');
    assert.ok(ambient.diffuse.x > 0.38 && ambient.diffuse.x < 0.65 && ambient.diffuse.y > 0.42 && ambient.diffuse.z < 0.7, 'ambient base light is moderately dim without going pitch-black or full-bright');
    assert.equal(pointLights.length, MAX_LIGHTS);
    assert.ok(pointLights.every((l) => l instanceof PointLight), 'uses RoostR PointLight instances');
    assert.equal(added.length, 1 + MAX_LIGHTS);

    const cones = ceilingLightCones(fixtures);
    assert.equal(cones.count, fixtures.length * 4 * 6, 'each fixture gets 4 intersecting volumetric light-cone quads');
    assert.equal(cones.vertices.length, cones.count * 3);
    assert.equal(cones.uvs.length, cones.count * 2);
    assert.ok(CEILING_CONE_VERTEX.includes('vFixtureCenter') && CEILING_CONE_FRAGMENT.includes('vFixtureCenter'), 'volumetric cone shaders evaluate smooth 3D cone falloff around each fixture center');

    const camPos = new Vec3(game.player.pos.x, 32, game.player.pos.y);
    updateCeilingLights(pointLights, fixtures, camPos, 1.25);
    assert.ok(pointLights[0].diffuse.getMagnitude() > 0.5, 'nearest ceiling light is active and bright');
    const d0 = camPos.getDistance(pointLights[0].position, true);
    const d1 = camPos.getDistance(pointLights[1].position, true);
    assert.ok(d0 <= d1, 'point lights are ordered from nearest ceiling fixture outward');

    // when far outside the level, all pooled point lights turn off cleanly
    updateCeilingLights(pointLights, fixtures, new Vec3(-99999, 32, -99999), 0);
    assert.ok(pointLights.every((l) => l.diffuse.isOrigin()), 'lights out of range fade to zero');

    for (const shader of [FLOOR_FRAGMENT, DOOR_FRAGMENT, WALL_FRAGMENT, SOLID_TEXTURED_FRAGMENT])
      assert.ok(shader.includes('uNbLights') && shader.includes('uLightPosition') && shader.includes('uAmbientLight'), 'surface shaders consume RoostR light uniforms');
    assert.ok(!TEXTURED_FRAGMENT.includes('vWorldPos'), 'effect sprite shader stays compatible with RoostR Sprite vertex shader');
  },

  'medikit and ammo pickups are 3D textured meshes with power-of-two face atlases'() {
    const pow2 = (n) => (n & (n - 1)) === 0;
    const med = medikitAtlas();
    assert.ok(pow2(med.width) && pow2(med.height), 'medikit atlas is power-of-two');
    assert.equal(med.width, MEDIKIT_CELL * MEDIKIT_FRAMES);
    assert.equal(med.height, MEDIKIT_CELL);
    const medHashes = new Set();
    let whiteCase = 0;
    let redCross = 0;
    let greenLed = 0;
    for (let f = 0; f < MEDIKIT_FRAMES; f++) {
      let h = 0;
      for (let y = 0; y < MEDIKIT_CELL; y++)
        for (let x = 0; x < MEDIKIT_CELL; x++) {
          const o = (y * med.width + f * MEDIKIT_CELL + x) * 4;
          const r = med.data[o];
          const g = med.data[o + 1];
          const b = med.data[o + 2];
          const a = med.data[o + 3];
          assert.equal(a, 255, 'medikit 3D face atlas is fully opaque');
          h = (Math.imul(h, 31) + r + g + b + a) | 0;
          if (r > 180 && g > 190 && b > 205)
            whiteCase++;
          if (r > 170 && g < 100 && b < 100)
            redCross++;
          if (g > 130 && g > r * 1.4)
            greenLed++;
        }
      medHashes.add(h);
    }
    assert.equal(medHashes.size, Object.keys(MEDIKIT_CELLS).length, 'medikit atlas has distinct front, side, top, and handle face cells');
    assert.ok(whiteCase > 400 && redCross >= 150 && greenLed >= 20, 'medikit atlas has a white armored case, red cross, and green bio-LED strips');

    const medGeo = medikitMesh();
    assert.ok(medGeo.vertices instanceof Float32Array && medGeo.uvs instanceof Float32Array);
    assert.equal(medGeo.vertices.length, 4 * 36 * 3, 'medikit mesh has 4 boxes (main case + 3D handle posts and grip)');
    assert.equal(medGeo.uvs.length, 4 * 36 * 2);
    for (let i = 0; i < medGeo.uvs.length; i++)
      assert.ok(medGeo.uvs[i] >= 0 && medGeo.uvs[i] <= 1, 'medikit UVs stay within [0, 1]');

    const ammo = ammoAtlas();
    assert.ok(pow2(ammo.width) && pow2(ammo.height), 'ammo atlas is power-of-two');
    assert.equal(ammo.width, AMMO_CELL * AMMO_FRAMES);
    assert.equal(ammo.height, AMMO_CELL);
    const ammoHashes = new Set();
    let shellRed = 0;
    let brassGold = 0;
    let oliveCrate = 0;
    for (let f = 0; f < AMMO_FRAMES; f++) {
      let h = 0;
      for (let y = 0; y < AMMO_CELL; y++)
        for (let x = 0; x < AMMO_CELL; x++) {
          const o = (y * ammo.width + f * AMMO_CELL + x) * 4;
          const r = ammo.data[o];
          const g = ammo.data[o + 1];
          const b = ammo.data[o + 2];
          const a = ammo.data[o + 3];
          assert.equal(a, 255, 'ammo 3D face atlas is fully opaque');
          h = (Math.imul(h, 31) + r + g + b + a) | 0;
          if (r > 110 && g < 50 && b < 55)
            shellRed++;
          if (r > 120 && g > 80 && b < 70)
            brassGold++;
          if (g > r && g > b && g < 165)
            oliveCrate++;
        }
      ammoHashes.add(h);
    }
    assert.equal(ammoHashes.size, Object.keys(AMMO_CELLS).length, 'ammo atlas has distinct crate front, crate side, shell side, and shell crimp top cells');
    assert.ok(shellRed >= 400 && brassGold >= 150 && oliveCrate >= 500, 'ammo atlas has red buckshot hulls, brass bases, and an olive ordnance crate');

    const ammoGeo = ammoMesh();
    assert.ok(ammoGeo.vertices instanceof Float32Array && ammoGeo.uvs instanceof Float32Array);
    // 1 tray box (36 verts) + 8 shells * 8 radial sides * (6 side + 3 cap verts) = 36 + 576 = 612 verts
    assert.equal(ammoGeo.vertices.length, (36 + 8 * 8 * 9) * 3, 'ammo mesh has an ordnance tray and 8 3D cylindrical buckshot shells');
    assert.equal(ammoGeo.uvs.length, (36 + 8 * 8 * 9) * 2);
    for (let i = 0; i < ammoGeo.uvs.length; i++)
      assert.ok(ammoGeo.uvs[i] >= 0 && ammoGeo.uvs[i] <= 1, 'ammo UVs stay within [0, 1]');
  },

  'every monster is an animated horror sprite with multi-tone gore, bone, glowing eyes, and gruesome death and gibbing frames'() {
    for (const type of Object.keys(ENEMY_TYPES)) {
      assert.equal(typeof MONSTER_ATLASES[type], 'function', `${type} has a sprite atlas builder`);
      assert.equal(typeof MONSTERS[type].die, 'function', `${type} has a sprite death animation`);
      const atlas = MONSTER_ATLASES[type]();
      assert.equal(atlas.data.length, atlas.width * atlas.height * 4);
      const stats = (frame) => {
        let solid = 0;
        let eyes = 0;
        let gore = 0;
        let bone = 0;
        let hash = 0;
        let airborne = 0;
        for (let y = 0; y < atlas.height; y++)
          for (let x = 0; x < atlas.cell; x++) {
            const o = (y * atlas.width + frame * atlas.cell + x) * 4;
            const r = atlas.data[o];
            const g = atlas.data[o + 1];
            const b = atlas.data[o + 2];
            const a = atlas.data[o + 3];
            solid += a ? 1 : 0;
            if (a && y < atlas.height - 16)
              airborne++;
            eyes += g === 255 ? 1 : 0;
            gore += b === 255 || (a && r > 120 && r > b * 2) ? 1 : 0;
            bone += a && g < 255 && b < 255 && r > g && g > b && g > 130 ? 1 : 0;
            hash = (Math.imul(hash, 31) + r + g + b + a) | 0;
          }
        return { solid, airborne, eyes, gore, bone, hash };
      };
      const live = [MONSTER_FRAMES.idleA, MONSTER_FRAMES.idleB, MONSTER_FRAMES.attack, MONSTER_FRAMES.pain].map(stats);
      for (const s of live) {
        assert.ok(s.solid > 120, `${type} live pose is a substantial sprite shape`);
        assert.ok(s.eyes >= 4, `${type} live pose has glowing eyes`);
        assert.ok(s.gore >= 6, `${type} live pose has arterial gore details`);
        assert.ok(s.bone >= 6, `${type} live pose has bone/fang/horn/rib details`);
      }
      assert.notEqual(live[0].hash, live[1].hash, `${type} idleA and idleB frames animate`);
      assert.notEqual(live[0].hash, live[2].hash, `${type} attack frame is distinct from idle`);
      const dying = MONSTER_FRAMES.dying.map(stats);
      assert.equal(dying[dying.length - 1].eyes, 0, `${type} eyes go out by the end of dying`);
      assert.equal(dying[dying.length - 1].airborne, 0, `${type} final dying corpse frame has no blood or body pixels floating in the air`);
      if (type !== 'wraith')
        assert.ok(dying[dying.length - 1].gore > 40, `${type} leaves a bloody carcass and pool of gore when killed`);
      const bursting = MONSTER_FRAMES.bursting.map(stats);
      assert.ok(Math.max(...bursting.map((s) => s.gore)) > 250, `${type} detonates into a mass of red gore when gibbed`);
      assert.equal(bursting[bursting.length - 1].eyes, 0, `${type} eyes are gone when blown apart`);
      assert.equal(bursting[bursting.length - 1].airborne, 0, `${type} final gibbed corpse frame has no blood or gore pixels floating in the air`);
    }
    const game = fresh();
    const victim = game.enemies[0];
    victim.pain = 0.25;
    victim.hurt = 0.12;
    game.damageEnemy(victim, 999);
    assert.equal(victim.state, 'dead');
    assert.equal(victim.pain, 0, 'dying clears enemy.pain so corpses never strobe-blink');
    assert.equal(victim.hurt, 0, 'dying clears enemy.hurt so corpses never strobe-blink');
  },

  'enemy fireball projectiles are an animated power-of-two pixel-art sprite atlas'() {
    const atlas = fireballAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height), 'fireball atlas is power-of-two');
    assert.equal(atlas.cell, FIREBALL_CELL);
    assert.equal(atlas.frames, FIREBALL_FRAMES);
    assert.equal(atlas.data.length, atlas.width * atlas.height * 4);
    const hashes = new Set();
    for (let f = 0; f < FIREBALL_FRAMES; f++) {
      let solid = 0;
      let core = 0;
      let flame = 0;
      let hash = 0;
      for (let y = 0; y < FIREBALL_CELL; y++)
        for (let x = 0; x < FIREBALL_CELL; x++) {
          const o = (y * atlas.width + f * FIREBALL_CELL + x) * 4;
          const r = atlas.data[o];
          const g = atlas.data[o + 1];
          const b = atlas.data[o + 2];
          const a = atlas.data[o + 3];
          if (x === 0 || x === FIREBALL_CELL - 1 || y === 0 || y === FIREBALL_CELL - 1)
            assert.equal(a, 0, `fireball frame ${f} has a 1px transparent safety border`);
          if (a) {
            solid++;
            if (r > 240 && g > 200)
              core++;
            else if (r > 130 && r > b * 2)
              flame++;
          }
          hash = (Math.imul(hash, 31) + r + g + b + a) | 0;
        }
      assert.ok(solid > 180, `fireball frame ${f} is a substantial plasma orb`);
      assert.ok(core >= 20, `fireball frame ${f} has a hot incandescent core`);
      assert.ok(flame >= 80, `fireball frame ${f} has crimson/orange hellfire corona`);
      hashes.add(hash);
    }
    assert.equal(hashes.size, FIREBALL_FRAMES, 'every fireball frame is distinct');
  },

  'crouching lowers the player eye below low pillars, slows movement, and stands back up when released'() {
    const game = fresh();
    clearEnemies(game);
    assert.equal(game.player.eye, EYE);
    assert.equal(game.player.crouch, 0);

    const startX = game.player.pos.x;
    run(game, 0.25, input({ crouch: true, forward: 1 }));
    const crouchedDist = game.player.pos.x - startX;
    assert.equal(game.player.crouch, 1, 'player reaches full crouch');
    assert.equal(game.player.eye, CROUCH_EYE, 'crouched eye height drops to CROUCH_EYE (below 26-high pillars)');

    const gameWalk = fresh();
    clearEnemies(gameWalk);
    run(gameWalk, 0.25, input({ forward: 1 }));
    const walkDist = gameWalk.player.pos.x - startX;
    assert.ok(crouchedDist > 0 && crouchedDist < walkDist * 0.75, 'crouching moves slower than walking');

    run(game, 0.25, idle);
    assert.equal(game.player.crouch, 0, 'releasing crouch returns crouch factor to 0');
    assert.equal(game.player.eye, EYE, 'releasing crouch restores standing eye height');

    // jumping launches the player upward, clears toxic acid tiles without taking damage, and lands back at z = 0
    const slimeIdx = game.level.slime.findIndex((v) => v === 1);
    const slimeX = (slimeIdx % game.level.width) * 64 + 32;
    const slimeY = Math.floor(slimeIdx / game.level.width) * 64 + 32;
    game.player.body.setPosition(new Vec2(slimeX, slimeY));
    const hpBefore = game.player.health;
    game.events.length = 0;
    game.update(1 / 60, input({ jump: true }));
    assert.ok(game.player.z > 0 && game.player.eye > EYE, 'jumping raises player z and eye above standing EYE');
    run(game, 0.28, idle);
    assert.ok(game.player.z > 15, 'player reaches jump apex mid-air above acid');
    assert.equal(game.player.slimeTimer, 0, 'airborne player does not accumulate acid burn timer');
    assert.equal(game.player.health, hpBefore, 'jumping over acid takes no damage');
    run(game, 0.4, idle);
    assert.equal(game.player.z, 0, 'gravity brings jumping player back to floor');
    assert.equal(game.player.eye, EYE, 'landing restores standing eye height');
    assert.ok(game.events.some((e) => e.type === 'step' && e.who === 'player'), 'landing emits a player footfall sound');
  },

  'every level has par time and secret closets, and clearing a level runs the Doom intermission tally and Phobos overworld map'() {
    for (const sound of ['secret', 'tallyTick', 'tallyBoom'])
      assert.equal(typeof RECIPES[sound], 'function', `${sound} audio recipe exists`);

    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      assert.ok(g.level.par >= 60, `level ${i} has a par time`);
      assert.ok(g.totalSecrets >= 1, `level ${i} has at least one secret supply room`);
      assert.ok(g.totalItems >= 4, `level ${i} tracks total initial pickups`);
    }

    const game = fresh(0);
    clearEnemies(game);
    assert.equal(game.secretsFound, 0);
    // step into the first secret room tile
    const secretIdx = [...game.level.secrets[0]][0];
    const sx = (secretIdx % game.level.width) * 64 + 32;
    const sy = Math.floor(secretIdx / game.level.width) * 64 + 32;
    game.events.length = 0;
    game.player.body.setPosition(new Vec2(sx, sy));
    game.update(1 / 60, idle);
    assert.equal(game.secretsFound, 1, 'stepping into a secret room increments secretsFound');
    assert.equal(game.message.text, 'Secret area found!');
    assert.ok(game.events.some((e) => e.type === 'secret'), 'secret discovery emits secret chime');
    // stepping again in the same secret room does not double-count
    game.events.length = 0;
    game.update(1 / 60, idle);
    assert.equal(game.secretsFound, 1);
    assert.ok(!game.events.some((e) => e.type === 'secret'));

    // collect an initial pickup and verify itemsPicked increments
    const pickup = game.pickups[0];
    game.player.ammo = 4;
    game.player.health = 50;
    game.player.body.setPosition(pickup.pos.clone());
    run(game, 0.05);
    assert.ok(game.itemsPicked >= 1, 'picking up a map item increments itemsPicked');

    // reach the exit to trigger intermission
    game.kills = Math.ceil(game.totalEnemies * 0.75);
    game.stats.time = 68;
    const exit = game.level.exits[0];
    game.player.body.setPosition(exit.clone());
    game.events.length = 0;
    game.update(1 / 60, idle);
    assert.equal(game.state, 'cleared');
    assert.ok(game.intermission && !game.intermission.done, 'intermission starts in counting state');
    assert.equal(game.intermission.phase, 0);

    // let the intermission count through all phases and emit ticks & booms
    let ticks = 0;
    let booms = 0;
    for (let t = 0; t < 6 && !game.intermission.done; t += 1 / 60) {
      game.update(1 / 60, idle);
      ticks += game.events.filter((e) => e.type === 'tallyTick').length;
      booms += game.events.filter((e) => e.type === 'tallyBoom').length;
      game.events.length = 0;
    }
    assert.equal(game.intermission.done, true, 'intermission finishes counting all 4 phases');
    assert.ok(ticks >= 5, 'intermission emits tallyTick sounds while counting');
    assert.equal(booms, 4, 'each of the 4 tally phases locks in with a tallyBoom');
    assert.equal(game.intermission.shownKills, game.intermission.killsPct);
    assert.equal(game.intermission.shownItems, game.intermission.itemsPct);
    assert.equal(game.intermission.shownSecrets, game.intermission.secretsPct);
    assert.equal(game.intermission.shownTime, 68);

    // test skipIntermission() when mid-count
    game.startIntermission();
    assert.equal(game.intermission.done, false);
    game.events.length = 0;
    assert.equal(game.skipIntermission(), true, 'skipIntermission snaps an active tally to completion');
    assert.equal(game.intermission.done, true);
    assert.equal(game.intermission.shownKills, game.intermission.killsPct);
    assert.equal(game.intermission.shownTime, game.intermission.timeSec);
    assert.ok(game.events.some((e) => e.type === 'tallyBoom'));
    assert.equal(game.skipIntermission(), false, 'skipIntermission returns false when already done');

    // verify Hud renders the intermission screen with facility nodes, PAR BEATEN, and YOU ARE HERE
    const texts = [];
    const lines = [];
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {},
          clearRect() {},
          fillRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
          fillText(str) {
            texts.push(str);
          },
        };
      },
    };
    const mockOverlay = {
      clear() {},
      glow: { line() {} },
      crisp: {
        fillRect() {},
        rectLine() {},
        line() {},
        circleLine() {},
        weapon: { quad() {} },
        sprites: { quad() {} },
        face: { quad() {} },
      },
    };
    const hud = new Hud(mockCanvas, mockOverlay);
    hud.resize(1280, 760, 1);
    const origCanvasLine = hud.canvasLine.bind(hud);
    hud.canvasLine = (pts, ...rest) => {
      lines.push(pts);
      origCanvasLine(pts, ...rest);
    };
    hud.render(game);
    assert.ok(texts.includes('E1M1 · HANGAR'), 'draws finished level name');
    assert.ok(texts.includes('FINISHED'), 'draws FINISHED subheader');
    assert.ok(texts.includes('KILLS') && texts.includes('ITEMS') && texts.includes('SECRETS'), 'draws KILLS, ITEMS, SECRETS rows');
    assert.ok(texts.includes('TIME') && texts.includes('PAR') && texts.includes('PAR BEATEN'), 'draws TIME, PAR, and PAR BEATEN badge');
    assert.ok(texts.includes('ENTERING: E1M2 · NUCLEAR PLANT'), 'draws next facility banner');
    assert.ok(texts.includes('YOU ARE HERE'), 'draws YOU ARE HERE pointer over next facility');
    assert.ok(lines.length >= 20, 'draws vector facility icons, progress bars, and blood X marks');
  },

  'extreme gore: 5 distinct gib variants bleed mid-air, bounce off surfaces, settle as permanent floor gibs, and corpses can be mutilated into XDeath'() {
    assert.equal(GIB_VARIANTS, 5, 'five distinct anatomical gib variants exist');
    const atlas = bloodAtlas();
    const hashes = new Set();
    for (let v = 0; v < GIB_VARIANTS; v++) {
      let hash = 0;
      let solid = 0;
      const cell = CELLS.gib + v;
      for (let y = 0; y < CELL; y++)
        for (let x = 0; x < CELL; x++) {
          const o = (y * atlas.width + cell * CELL + x) * 4;
          if (!atlas.data[o + 3])
            continue;
          solid++;
          hash = (Math.imul(hash, 31) + atlas.data[o] + atlas.data[o + 1] + atlas.data[o + 2]) | 0;
        }
      assert.ok(solid > 35, `gib variant ${v} is a substantial chunk`);
      hashes.add(hash);
      const quad = floorGibQuad({ x: 120, y: 180, size: 4, variant: v, angle: 0.7 });
      assert.equal(quad.corners.length, 12);
      for (let k = 1; k < 12; k += 3)
        assert.ok(Math.abs(quad.corners[k] - 0.36) < 1e-9, 'floor gib quad sits slightly above floor splats');
      assert.deepEqual(quad.uv, cellUv(cell));
    }
    assert.equal(hashes.size, GIB_VARIANTS, 'every gib variant has a unique sprite');

    // flying gibs bleed droplet trails in mid-air, bounce on the floor, and settle into permanent floor gibs
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.blood.gore(6 * 64 + 32, 9 * 64 + 32, 1.4, 1, 0);
    const initialGibParticles = game.blood.particles.filter((p) => p.gib);
    assert.ok(initialGibParticles.length >= 3, 'gore spawns subtle flying gibs');
    assert.ok(initialGibParticles.every((p) => p.bounces >= 1), 'flying gibs can bounce');
    run(game, 2.5);
    assert.equal(game.blood.particles.filter((p) => p.gib).length, 0, 'all bouncing gibs settle onto the floor');
    assert.ok(game.blood.gibs.length >= 3, `settled gibs remain on the floor (${game.blood.gibs.length})`);
    assert.ok(game.blood.gibs.length <= BLOOD.gibs, 'floor gibs respect their cap');

    // shooting a dead corpse from afar leaves a body first, then shooting the corpse mutilates and gibs it ("XDeath")
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.angle = 0;
    game.addEnemy('imp', new Vec2(6 * 64 + 260, 9 * 64 + 32));
    const imp = game.enemies[0];
    imp.hp = 1;
    game.player.cooldown = 0;
    game.fire();
    assert.equal(imp.state, 'dead', 'imp killed from afar');
    assert.equal(imp.gibbed, false, 'single-pellet kill from afar leaves an intact corpse');

    // advance time past 3 seconds: corpse stays in game.enemies and can still be mutilated
    run(game, 3.5);
    assert.ok(imp.deadTime > 3, 'corpse persists long past 2.2s');
    // walk closer and fire the shotgun into the corpse on the floor
    game.player.body.setPosition(new Vec2(6 * 64 + 190, 9 * 64 + 32));
    game.player.cooldown = 0;
    game.events.length = 0;
    game.fire();
    assert.equal(imp.gibbed, true, 'shooting a dead corpse shreds it into XDeath gibs');
    assert.ok(game.events.some((e) => e.type === 'gib'), 'corpse gibbing emits gib sound');
    assert.ok(game.blood.particles.some((p) => p.gib), 'mutilating a corpse launches fresh gib chunks');

    // once gibbed, shooting the corpse spawns blood and meat twice more and then stops
    for (let postHit = 1; postHit <= 2; postHit++) {
      run(game, 0.8);
      game.blood.particles.length = 0;
      game.events.length = 0;
      game.player.cooldown = 0;
      game.fire();
      assert.equal(imp.postGibHits, postHit, `post-gib shot ${postHit} increments postGibHits`);
      assert.ok(game.blood.particles.some((p) => !p.gib), `post-gib shot ${postHit} spawns blood`);
      assert.ok(game.blood.particles.some((p) => p.gib), `post-gib shot ${postHit} spawns meat chunks`);
    }
    run(game, 0.8);
    game.blood.particles.length = 0;
    game.events.length = 0;
    game.player.cooldown = 0;
    game.fire();
    assert.equal(game.blood.particles.length, 0, '3rd shot after gibbing spawns no more blood or gibs');
    assert.equal(game.events.some((e) => e.type === 'flesh' || e.type === 'gib'), false, 'no flesh or gib sound after 2 post-gib hits');

    // barrel blast also blows nearby intact corpses into gibs
    clearEnemies(game);
    for (const b of game.barrels)
      game.scene.removeBody(b.body);
    game.barrels = [];
    game.addEnemy('brute', new Vec2(8 * 64, 9 * 64 + 32));
    const corpse = game.enemies[0];
    game.damageEnemy(corpse, 999);
    corpse.gibbed = false;
    game.addBarrel(new Vec2(8 * 64 + 40, 9 * 64 + 32));
    game.detonate(game.barrels[0]);
    assert.equal(corpse.gibbed, true, 'barrel explosion blows nearby corpses into gibs');
  },

  'environmental hazards and secret push-walls: toxic slime burns, secret doors disguise as walls until pushed, and ceiling crushers pulp anything underneath'() {
    assert.equal(typeof RECIPES.acid, 'function', 'acid sizzle audio recipe exists');
    assert.equal(typeof RECIPES.crush, 'function', 'hydraulic crusher slam audio recipe exists');

    // slime atlas is power-of-two, opaque, and dominantly radioactive green; shader animates with uTime
    const slime = slimeAtlas();
    assert.equal(slime.width, TILE_PIXELS);
    assert.equal(slime.height, TILE_PIXELS);
    let greenDominant = 0;
    for (let i = 0; i < slime.data.length; i += 4) {
      assert.equal(slime.data[i + 3], 255, 'slime atlas is fully opaque');
      if (slime.data[i + 1] > slime.data[i] * 1.4 && slime.data[i + 1] > slime.data[i + 2] * 1.4)
        greenDominant++;
    }
    assert.ok(greenDominant > (slime.data.length / 4) * 0.75, 'slime atlas is radioactive green');
    assert.ok(SLIME_FRAGMENT.includes('uTime'), 'slime fragment shader ripples with uTime');
    // slime atlas wraps seamlessly across both horizontal (x=0 vs x=63) and vertical (y=0 vs y=63) borders
    let seamDiffX = 0;
    let seamDiffY = 0;
    for (let i = 0; i < TILE_PIXELS; i++) {
      const leftG = slime.data[i * TILE_PIXELS * 4 + 1];
      const rightG = slime.data[(i * TILE_PIXELS + (TILE_PIXELS - 1)) * 4 + 1];
      seamDiffX += Math.abs(leftG - rightG);
      const topG = slime.data[i * 4 + 1];
      const bottomG = slime.data[((TILE_PIXELS - 1) * TILE_PIXELS + i) * 4 + 1];
      seamDiffY += Math.abs(topG - bottomG);
    }
    assert.ok(seamDiffX / TILE_PIXELS < 12, `slime atlas wraps seamlessly horizontally (avg delta ${seamDiffX / TILE_PIXELS})`);
    assert.ok(seamDiffY / TILE_PIXELS < 12, `slime atlas wraps seamlessly vertically (avg delta ${seamDiffY / TILE_PIXELS})`);

    // secret door box uses wall UV cell framing (5 faces: 4 sides + top) and full 64-unit tile dimensions so it sits completely flush with adjacent walls
    const sBox = secretDoorBox(new Vec2(64, 64));
    assert.equal(sBox.vertices.length, 30 * 3);
    assert.equal(sBox.uvs.length, 30 * 2);
    for (let i = 0; i < sBox.vertices.length; i += 3) {
      assert.equal(Math.abs(sBox.vertices[i]), 32, 'secret door X faces sit flush at ±32 (TILE / 2) with zero recess');
      assert.equal(Math.abs(sBox.vertices[i + 2]), 32, 'secret door Z faces sit flush at ±32 (TILE / 2) with zero recess');
    }

    // every level has slime pools (~) and crushing traps (^); indoor base levels have secret push-wall doors (S), while Mars has only the 1 starting-room door
    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      let slimeTiles = 0;
      for (let idx = 0; idx < g.level.slime.length; idx++)
        if (g.level.slime[idx])
          slimeTiles++;
      const secretDoors = [...g.level.doors.values()].filter((d) => d.secret);
      assert.ok(slimeTiles >= 6, `level ${i} has radioactive slime tiles (${slimeTiles})`);
      if (g.level.planet === 'mars')
        assert.equal(g.level.doors.size, 1, 'Mars surface level has only the single starting-room door and zero exterior doors');
      else
        assert.ok(secretDoors.length >= 2, `level ${i} has secret push-wall doors (${secretDoors.length})`);
      assert.ok(g.level.crushers.length >= 1, `level ${i} has crushing ceiling traps (${g.level.crushers.length})`);
    }

    // wading in toxic slime periodically burns the player, flashes green radFlash, and emits 'acid'
    const game = fresh(0);
    clearEnemies(game);
    const slimeIdx = game.level.slime.findIndex((v) => v === 1);
    const slimeX = (slimeIdx % game.level.width) * 64 + 32;
    const slimeY = Math.floor(slimeIdx / game.level.width) * 64 + 32;
    assert.equal(game.level.slimeAt(slimeX, slimeY), true);
    game.player.body.setPosition(new Vec2(slimeX, slimeY));
    game.events.length = 0;
    const hpBefore = game.player.health;
    run(game, 0.9);
    assert.equal(game.player.health, hpBefore - 5, 'wading in slime for 0.85s burns 5 HP');
    assert.ok(game.player.radFlash > 0, 'slime burn triggers green radiation border flash');
    assert.ok(game.events.some((e) => e.type === 'acid'), 'slime burn emits acid sizzle sound');

    // secret push-wall door starts unrevealed and reveals when pushed open with use()
    const secretDoor = [...game.level.doors.values()].find((d) => d.secret);
    assert.equal(secretDoor.revealed, false, 'secret push-wall door starts disguised');
    game.player.body.setPosition(new Vec2(secretDoor.center.x, secretDoor.center.y + 48));
    game.player.angle = -Math.PI / 2;
    game.use();
    assert.equal(secretDoor.target, 1, 'pushing secret wall opens it');
    assert.equal(secretDoor.revealed, true, 'pushing secret wall reveals it on the automap');

    // crushing ceiling trap cycles down, emits 'crush', gibs live monsters, and shreds corpses underneath
    const crusher = game.level.crushers[0];
    crusher.phase = 0;
    crusher.slamming = false;
    game.addEnemy('imp', crusher.center.clone());
    const victim = game.enemies[0];
    game.events.length = 0;
    run(game, 0.8);
    assert.equal(victim.state, 'dead', 'ceiling crusher kills monster underneath');
    assert.equal(victim.gibbed, true, 'ceiling crusher gibs monster into XDeath chunks');
    assert.ok(game.events.some((e) => e.type === 'crush'), 'ceiling crusher emits hydraulic slam sound');

    // crusher also hurts the player when caught underneath at low height
    crusher.phase = 0;
    crusher.hurtCooldown = 0;
    game.player.health = 100;
    game.player.body.setPosition(crusher.center.clone());
    run(game, 0.75);
    assert.ok(game.player.health < 100, 'player caught under a slamming ceiling crusher takes crushing damage');
  },

  'classic Doom keycards and locked doors: 3D keycard meshes, color-coded security doors, HUD key slots, and progressive Blue -> Yellow -> Red -> Exit routing'() {
    assert.equal(typeof RECIPES.keycard, 'function', 'keycard pickup chime recipe exists');
    assert.equal(typeof RECIPES.locked, 'function', 'locked door buzzer recipe exists');

    // 3D keycard mesh & power-of-two atlases for Red, Yellow, and Blue keys
    const pow2 = (n) => (n & (n - 1)) === 0;
    const mesh = keycardMesh();
    assert.equal(mesh.vertices.length, 108 * 3, 'keycard 3D mesh has 3 boxes (108 vertices)');
    assert.equal(mesh.uvs.length, 108 * 2);
    assert.ok(KEYCARD_CELLS.front === 0 && KEYCARD_CELLS.side === 1 && KEYCARD_CELLS.top === 2 && KEYCARD_CELLS.grip === 3);

    for (const color of ['red', 'yellow', 'blue']) {
      const ka = keycardAtlas(color);
      assert.equal(ka.width, KEYCARD_CELL * KEYCARD_FRAMES);
      assert.equal(ka.height, KEYCARD_CELL);
      assert.ok(pow2(ka.width) && pow2(ka.height), `${color} keycard atlas is power-of-two`);

      const da = lockedDoorAtlas(color);
      assert.equal(da.width, 64 * DOOR_CELLS);
      assert.equal(da.height, 64);
      assert.ok(pow2(da.width) && pow2(da.height), `${color} locked door atlas is power-of-two`);
      let coloredRail = 0;
      for (let y = 14; y < 50; y++) {
        const o = (y * da.width + 28) * 4;
        const r = da.data[o];
        const g = da.data[o + 1];
        const b = da.data[o + 2];
        if (color === 'red' && r > g * 2 && r > b * 2)
          coloredRail++;
        if (color === 'yellow' && r > 180 && g > 130 && b < 90)
          coloredRail++;
        if (color === 'blue' && b > r * 1.8 && b > 150)
          coloredRail++;
      }
      assert.ok(coloredRail > 20, `${color} locked door has glowing ${color} security status rails`);
    }

    // Gameplay: locked doors block until the matching keycard is collected
    const game = fresh(0);
    clearEnemies(game);
    assert.deepEqual(game.player.keys, { red: false, yellow: false, blue: false }, 'player starts with no keycards');

    const blueDoor = [...game.level.doors.values()].find((d) => d.lock === 'blue');
    assert.ok(blueDoor, 'E1M1 has a blue-locked security door');
    game.player.body.setPosition(new Vec2(blueDoor.center.x, blueDoor.center.y - 48));
    game.player.angle = Math.PI / 2;
    game.events.length = 0;
    game.use();
    assert.equal(blueDoor.target, 0, 'blue door refuses to open without Blue keycard');
    assert.ok(game.message.text.includes('Blue keycard'), 'HUD message tells player which keycard is needed');
    assert.ok(game.events.some((e) => e.type === 'locked'), 'locked door emits locked buzzer sound');

    // Touching the blue keycard pickup grants the key, increments itemsPicked, and lets the door open
    const blueKeyPickup = game.pickups.find((p) => p.type === 'blueKey');
    assert.ok(blueKeyPickup, 'E1M1 has a blueKey pickup');
    const itemsBefore = game.itemsPicked;
    game.events.length = 0;
    game.touch(blueKeyPickup.body);
    assert.equal(game.player.keys.blue, true, 'touching blueKey grants blue keycard');
    assert.equal(blueKeyPickup.taken, true);
    assert.equal(game.itemsPicked, itemsBefore + 1, 'picking up a level keycard counts toward items');
    assert.ok(game.message.text.includes('Picked up a Blue keycard'), 'pickup message announces Blue keycard');
    assert.ok(game.events.some((e) => e.type === 'keycard'), 'picking up keycard emits keycard chime');

    game.use();
    assert.equal(blueDoor.target, 1, 'blue door opens once player holds Blue keycard');

    // HUD & Automap render keycard slots and color-coded locked doors
    const texts = [];
    const glowLines = [];
    const rectLines = [];
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {},
          clearRect() {},
          fillRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
          fillText(str) {
            texts.push(str);
          },
        };
      },
    };
    const mockOverlay = {
      clear() {},
      glow: {
        line(pts, col, alpha) {
          glowLines.push({ pts, col, alpha });
        },
      },
      crisp: {
        fillRect() {},
        rectLine(x, y, w, h, col, alpha) {
          rectLines.push({ x, y, w, h, col, alpha });
        },
        line() {},
        circleLine() {},
        weapon: { quad() {} },
        sprites: { quad() {} },
        face: { quad() {} },
      },
    };
    game.fog.explored.fill(1);
    game.fog.visible.fill(1);
    const hud = new Hud(mockCanvas, mockOverlay);
    hud.resize(1280, 760, 1);
    hud.render(game);
    assert.ok(texts.includes('KEYS'), 'HUD draws KEYS label on the status bar');
    assert.ok(rectLines.some((r) => r.col[0] > 0.85 && r.col[1] < 0.2), 'automap draws red-locked doors in red');
    assert.ok(rectLines.some((r) => r.col[0] > 0.9 && r.col[1] > 0.5 && r.col[2] < 0.4), 'automap draws yellow-locked doors in orange/yellow');

    // Verify indoor base levels have solvable progressive keycard routing (Start -> Blue Key -> Yellow Key -> Red Key -> Exit)
    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      const { level } = g;
      if (level.planet === 'mars') {
        assert.equal(level.doors.size, 1, 'Mars surface level has only the starting room door and no exterior locked doors');
        continue;
      }
      const locks = new Set([...level.doors.values()].map((d) => d.lock).filter(Boolean));
      assert.ok(locks.has('blue') && locks.has('yellow') && locks.has('red'), `level ${i} has blue, yellow, and red locked doors`);
      const keyPickups = new Map();
      for (const p of level.pickups)
        if (p.type === 'blueKey' || p.type === 'yellowKey' || p.type === 'redKey') {
          const tx = Math.floor(p.pos.x / 64);
          const ty = Math.floor(p.pos.y / 64);
          keyPickups.set(`${tx},${ty}`, p.type === 'redKey' ? 'red' : p.type === 'yellowKey' ? 'yellow' : 'blue');
        }
      assert.equal(keyPickups.size, 3, `level ${i} has all 3 keycards placed`);

      const held = new Set();
      let changed = true;
      let reached = new Set();
      while (changed) {
        changed = false;
        const start = [Math.floor(level.playerStart.x / 64), Math.floor(level.playerStart.y / 64)];
        reached = new Set([start.join()]);
        const queue = [start];
        while (queue.length) {
          const [x, y] = queue.pop();
          const keyHere = keyPickups.get(`${x},${y}`);
          if (keyHere && !held.has(keyHere)) {
            held.add(keyHere);
            changed = true;
          }
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            if (!level.isWalkable(nx, ny) || reached.has(`${nx},${ny}`))
              continue;
            const door = level.doors.get(ny * level.width + nx);
            if (door?.lock && !held.has(door.lock))
              continue;
            reached.add(`${nx},${ny}`);
            queue.push([nx, ny]);
          }
        }
      }
      assert.ok(held.has('blue') && held.has('yellow') && held.has('red'), `level ${i} allows collecting all 3 keys in order`);
      const exitReachableWithKeys = level.exits.some((e) =>
        [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => reached.has(`${Math.floor(e.x / 64) + dx},${Math.floor(e.y / 64) + dy}`))
      );
      assert.ok(exitReachableWithKeys, `level ${i} exit is reachable after collecting keycards`);

      // Also verify the exit is NOT reachable without the Red keycard
      const start = [Math.floor(level.playerStart.x / 64), Math.floor(level.playerStart.y / 64)];
      const withoutRed = new Set([start.join()]);
      const q2 = [start];
      while (q2.length) {
        const [x, y] = q2.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (!level.isWalkable(nx, ny) || withoutRed.has(`${nx},${ny}`))
            continue;
          const door = level.doors.get(ny * level.width + nx);
          if (door?.lock === 'red')
            continue;
          withoutRed.add(`${nx},${ny}`);
          q2.push([nx, ny]);
        }
      }
      const exitWithoutRed = level.exits.some((e) =>
        [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => withoutRed.has(`${Math.floor(e.x / 64) + dx},${Math.floor(e.y / 64) + dy}`))
      );
      assert.equal(exitWithoutRed, false, `level ${i} exit is gated behind a Red security door`);
    }
  },

  'expanded arsenal and weapon switching (1-4): chainsaw melee gibbing, chaingun rotary fire, rocket launcher splash blast, and 3D weapon pickups'() {
    // 1. Arsenal atlas & 3D weapon pickup meshes
    const fullAtlas = arsenalAtlas();
    assert.equal(fullAtlas.width, WEAPON_CELL_W * WEAPON_FRAME_COUNT);
    assert.equal(fullAtlas.height, WEAPON_CELL_H * WEAPON_ORDER.length);
    for (const weapon of WEAPON_ORDER) {
      const uv = weaponCellUv(0, weapon);
      assert.ok(uv[0] >= 0 && uv[2] <= 1 && uv[1] >= 0 && uv[3] <= 1, `valid UV for ${weapon}`);
      assert.ok(uv[3] > uv[1], `non-empty vertical UV range for ${weapon}`);
      const wAtlas = weaponAtlas(weapon);
      const rowSpan = (y) => {
        let minX = WEAPON_CELL_W;
        let maxX = -1;
        for (let x = 0; x < WEAPON_CELL_W; x++)
          if (wAtlas.data[(y * wAtlas.width + x) * 4 + 3] > 0) {
            if (x < minX)
              minX = x;
            if (x > maxX)
              maxX = x;
          }
        return maxX >= minX ? maxX - minX + 1 : 0;
      };
      const tipSpan = rowSpan(182);
      const baseSpan = rowSpan(252);
      assert.ok(tipSpan > 0 && baseSpan > tipSpan * 2.2, `${weapon} sprite foreshortens strongly toward the horizon (${tipSpan}px -> ${baseSpan}px)`);
      if (weapon === 'chainsaw') {
        assert.ok(tipSpan <= 18, `chainsaw guide bar is a narrow upright vertical blade at y=182 (${tipSpan}px wide, not a wide sideways paddle)`);
        let minY = WEAPON_CELL_H;
        let maxY = -1;
        for (let y = 160; y <= 212; y++)
          if (wAtlas.data[(y * wAtlas.width + 98) * 4 + 3] > 0) {
            if (y < minY)
              minY = y;
            if (y > maxY)
              maxY = y;
          }
        const vertBladeSpan = maxY - minY + 1;
        assert.ok(
          vertBladeSpan > tipSpan * 1.4,
          `chainsaw guide bar & cutting chain stand vertically to the ground (${vertBladeSpan}px vertical depth vs ${tipSpan}px horizontal width)`
        );
      }
    }
    const cgSheet = weaponAtlas('chaingun');
    const cgBarrelHashes = new Set();
    for (let f = 0; f < WEAPON_FRAME_COUNT; f++) {
      let h = 0;
      for (let y = 188; y <= 214; y++)
        for (let x = 96; x <= 160; x++) {
          const o = (y * cgSheet.width + f * WEAPON_CELL_W + x) * 4;
          h = (Math.imul(h, 31) + cgSheet.data[o] + cgSheet.data[o + 1] * 3 + cgSheet.data[o + 2] * 7) | 0;
        }
      cgBarrelHashes.add(h);
    }
    assert.equal(cgBarrelHashes.size, WEAPON_FRAME_COUNT, 'every chaingun frame has a distinct rotated barrel-cluster & clamp-lug phase');
    const countExtractedCasingPixels = (f) => {
      let count = 0;
      for (let y = 208; y <= 232; y++)
        for (let x = 130; x <= 165; x++) {
          const o = (y * cgSheet.width + f * WEAPON_CELL_W + x) * 4;
          if (cgSheet.data[o + 3] > 0)
            count++;
        }
      return count;
    };
    assert.ok(countExtractedCasingPixels(WEAPON_FRAMES.flashA) >= 60, 'chaingun flashA draws detailed multi-stage extracted brass casings');
    assert.ok(countExtractedCasingPixels(WEAPON_FRAMES.flashB) >= 60, 'chaingun flashB advances extracted brass casings along parabolic arc');
    assert.equal(countExtractedCasingPixels(WEAPON_FRAMES.idle), 0, 'chaingun idle has no extracted casings in flight');
    assert.equal(countExtractedCasingPixels(WEAPON_FRAMES.pumpA), 0, 'chaingun pumpA rolls the barrel with zero extracted casings in flight');
    assert.equal(countExtractedCasingPixels(WEAPON_FRAMES.pumpB), 0, 'chaingun pumpB rolls the barrel with zero extracted casings in flight');
    assert.deepEqual(
      [0.01, 0.05, 0.08, 0.11, 0.16, 0.25, 0.45].map((t) => weaponFrame(t, true, 'chaingun')),
      [
        WEAPON_FRAMES.flashA,
        WEAPON_FRAMES.flashB,
        WEAPON_FRAMES.pumpA,
        WEAPON_FRAMES.pumpB,
        WEAPON_FRAMES.pumpA,
        WEAPON_FRAMES.pumpB,
        WEAPON_FRAMES.idle,
      ],
      'chaingun weaponFrame cycles through all 4 active spin frames during firing and spin-down'
    );
    for (const [atlas, mesh, label] of [
      [chaingunAtlas(), chaingunMesh(), 'chaingun'],
      [rocketLauncherAtlas(), rocketLauncherMesh(), 'rocketLauncher'],
    ]) {
      assert.equal(atlas.width, ARSENAL_CELL * ARSENAL_FRAMES, `${label} atlas width`);
      assert.equal(atlas.height, ARSENAL_CELL, `${label} atlas height`);
      assert.ok(mesh.vertices.length >= 36 * 3 && mesh.vertices.length % 9 === 0, `${label} mesh triangles`);
      assert.equal(mesh.uvs.length, (mesh.vertices.length / 3) * 2, `${label} mesh UVs match vertices`);
      if (label === 'chaingun') {
        let minY = Infinity;
        for (let vi = 1; vi < mesh.vertices.length; vi += 3)
          if (mesh.vertices[vi] < minY) minY = mesh.vertices[vi];
        assert.ok(minY >= 2, 'chaingun pickup mesh is elevated above floor to prevent clipping');
      }
    }

    // 2. Every level places both Chaingun (C) and Rocket Launcher (M) pickups
    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      assert.ok(g.pickups.some((p) => p.type === 'chaingun'), `level ${i} has chaingun pickup`);
      assert.ok(g.pickups.some((p) => p.type === 'rocket'), `level ${i} has rocket launcher pickup`);
    }

    // 3. Starting inventory, weapon switching (1-4), and picking up Chaingun & Rocket Launcher
    const game = fresh(0);
    clearEnemies(game);
    assert.equal(game.player.weapon, 'shotgun', 'shotgun is active at start');
    assert.equal(game.player.weapons.chainsaw, true, 'chainsaw is owned at start');
    assert.equal(game.player.weapons.shotgun, true, 'shotgun is owned at start');
    assert.equal(game.player.weapons.chaingun, false, 'chaingun is locked at start');
    assert.equal(game.player.weapons.rocket, false, 'rocket launcher is locked at start');

    // Cannot switch to unowned Chaingun (slot 3) or Rocket Launcher (slot 4)
    game.update(1 / 60, input({ weapon: 3 }));
    assert.equal(game.player.weapon, 'shotgun', 'cannot switch to unowned chaingun');
    game.update(1 / 60, input({ weapon: 4 }));
    assert.equal(game.player.weapon, 'shotgun', 'cannot switch to unowned rocket launcher');

    // Switch to Chainsaw (slot 1)
    game.events.length = 0;
    game.update(1 / 60, input({ weapon: 1 }));
    assert.equal(game.player.weapon, 'chainsaw', 'Digit1 switches to chainsaw');
    assert.ok(game.player.switchTimer > 0, 'switching sets weapon switch timer');
    assert.ok(game.events.some((e) => e.type === 'weaponSwitch' && e.weapon === 'chainsaw'), 'switching emits weaponSwitch sound with chainsaw rev tag');

    // Holding the chainsaw at idle emits rhythmic 2-stroke chainsawIdle chug events
    run(game, 0.5);
    assert.ok(game.events.some((e) => e.type === 'chainsawIdle'), 'equipped chainsaw idles with 2-stroke engine chug');

    // Chainsaw has a tight melee reach and misses targets standing further away
    assert.ok(WEAPONS.chainsaw.reach <= 40, 'chainsaw reach is tight close-quarters melee');
    game.player.ammo = 0;
    game.player.cooldown = 0;
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.player.angle = 0;
    const farEnemy = game.addEnemy('imp', new Vec2(3 * 64 + 92, 3 * 64 + 32));
    farEnemy.hp = 4;
    game.fire();
    assert.equal(farEnemy.hp, 4, 'chainsaw does not hit an enemy beyond tight melee reach');
    game.scene.removeBody(farEnemy.body);
    game.enemies.pop();

    // Chainsaw shreds enemies at close range with zero ammo cost and guaranteed XDeath gibbing
    game.player.cooldown = 0;
    const victim = game.addEnemy('imp', new Vec2(3 * 64 + 74, 3 * 64 + 32));
    victim.hp = 3;
    game.events.length = 0;
    game.fire();
    assert.equal(game.player.ammo, 0, 'chainsaw uses 0 ammo');
    assert.equal(game.player.shootFace, 0.42, 'triggering chainsaw sets 0.42s shooting face timer just like shotgun');
    assert.equal(victim.state, 'dead', 'chainsaw kills enemy in melee reach');
    assert.equal(victim.gibbed, true, 'chainsaw kill triggers guaranteed XDeath gibbing');
    assert.ok(game.events.some((e) => e.type === 'chainsaw' && e.hit === true), 'chainsaw emits biting chainsaw sound when hitting a target');

    // Chainsaw puts specific vertical slash marks on walls distinct from firearm bullet holes
    const holesBeforeSaw = game.blood.holes.length;
    game.player.cooldown = 0;
    game.player.body.setPosition(new Vec2(1 * 64 + 28, 3 * 64 + 32));
    game.player.angle = Math.PI;
    game.events.length = 0;
    game.fire();
    assert.equal(game.blood.holes.length, holesBeforeSaw + 1, 'chainsaw leaves a permanent mark on the wall face');
    const sawMark = game.blood.holes[game.blood.holes.length - 1];
    assert.equal(sawMark.kind, 'slash', 'chainsaw wall mark has slash kind rather than firearm hole');
    const sawQuad = holeQuad({ ...sawMark, top: 64 });
    const gunQuad = holeQuad({ ...sawMark, kind: 'hole', top: 64 });
    const slashMinU = impactCellUv(IMPACT_CELLS.slash)[0];
    const slashMaxU = impactCellUv(IMPACT_CELLS.slash + SLASH_VARIANTS - 1)[2];
    assert.ok(sawQuad.uv[0] >= slashMinU && sawQuad.uv[2] <= slashMaxU, 'chainsaw wall quad maps to IMPACT_CELLS.slash atlas cells');
    assert.notEqual(sawQuad.uv[0], gunQuad.uv[0], 'chainsaw slash UV differs from firearm bullet hole UV');
    const impAtlas = impactAtlas();
    for (let v = 0; v < SLASH_VARIANTS; v++) {
      const xBase = (IMPACT_CELLS.slash + v) * 32;
      let minX = 32;
      let maxX = -1;
      let minY = 32;
      let maxY = -1;
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++)
          if (impAtlas.data[(y * impAtlas.width + xBase + x) * 4 + 3] > 0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
      const spanW = maxX - minX + 1;
      const spanH = maxY - minY + 1;
      assert.ok(spanH >= 20 && spanH > spanW * 1.5, `slash variant ${v} is a tall vertical saw gash (${spanW}x${spanH})`);
    }
    assert.ok(game.events.some((e) => e.type === 'impact'), 'chainsaw wall hit emits impact event');
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.player.angle = 0;

    // Picking up Chaingun unlocks slot 3, grants ammo, and auto-equips when newly unlocked
    const cgPickup = game.pickups.find((p) => p.type === 'chaingun');
    game.events.length = 0;
    game.touch(cgPickup.body);
    assert.equal(game.player.weapons.chaingun, true, 'chaingun unlocked on pickup');
    assert.equal(game.player.weapon, 'chaingun', 'chaingun auto-equipped on first pickup');
    assert.equal(game.player.bullets, 50 + AMMO_TYPES.bullets.weaponBonus, 'chaingun pickup grants its bullet bonus');
    assert.ok(game.events.some((e) => e.type === 'weaponPickup'), 'weapon pickup emits weaponPickup sound');

    // Chaingun fires rapid hitscan rounds consuming 1 ammo per shot
    const target = game.addEnemy('brute', new Vec2(4 * 64 + 32, 3 * 64 + 32));
    const hpBefore = target.hp;
    game.player.cooldown = 0;
    game.events.length = 0;
    game.fire();
    assert.equal(game.player.bullets, 50 + AMMO_TYPES.bullets.weaponBonus - 1, 'chaingun consumes 1 ammo');
    assert.equal(target.hp, hpBefore - WEAPONS.chaingun.damage, 'chaingun deals 2 damage per round');
    assert.ok(game.events.some((e) => e.type === 'chaingun'), 'chaingun emits chaingun sound');

    // Chaingun stops shooting/spinning animation once out of ammo and when dry-firing
    assert.equal(
      weaponFrame(0.15, false, 'chaingun', 1),
      WEAPON_FRAMES.idle,
      'chaingun returns to idle after last shot flash when out of ammo'
    );
    const savedAmmo = game.player.ammo;
    game.player.ammo = 0;
    game.player.cooldown = 0;
    game.events.length = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.equal(game.player.dryFire, true, 'firing chaingun with 0 ammo marks dryFire');
    assert.ok(game.events.some((e) => e.type === 'dry'), 'firing chaingun with 0 ammo emits dry click');
    const recordedUvs = [];
    const mockHud = Object.create(Hud.prototype);
    mockHud.width = 960;
    mockHud.height = 600;
    mockHud.overlay = {
      crisp: {
        weapon: {
          quad(_x0, _y0, _x1, _y1, uv) {
            recordedUvs.push(uv.slice());
          },
        },
      },
    };
    while (game.player.cooldown > 0) {
      mockHud.drawWeapon(game);
      const canSpin = !game.player.dryFire && (game.player.switchTimer ?? 0) <= 0;
      const pose = chaingunPose({
        time: game.time,
        attacking: canSpin && game.player.cooldown > 0 && game.player.triggerHeld !== false,
        spinDown: canSpin ? game.player.spinDown : 0,
      });
      assert.equal(pose.rotorRot.z, 0, 'chaingun 3D rotor stays stationary throughout dry-fire cooldown with 0 ammo');
      game.update(1 / 60, input({ fire: false }));
    }
    assert.equal(recordedUvs.length, 0, 'drawWeapon suppresses 2D sprite quad when chaingun is equipped (uses 3D viewmodel)');
    game.player.ammo = savedAmmo;
    game.player.cooldown = 0;
    game.player.dryFire = false;

    // Holding fire spins the 3D chaingun rotor at full rate; releasing fire stops active firing jolt while keeping spin-down barrel rotation
    game.player.angle = Math.PI;
    game.update(1 / 60, input({ fire: true }));
    mockHud.drawWeapon(game);
    assert.equal(recordedUvs.length, 0, 'drawWeapon skips 2D sprite quad while firing chaingun');
    const firingPose = chaingunPose({
      time: game.time,
      recoil: game.player.recoil,
      attacking: !game.player.dryFire && game.player.cooldown > 0 && game.player.triggerHeld !== false,
      spinDown: game.player.spinDown,
    });
    assert.ok(firingPose.rotorRot.z > 0, 'while holding fire, 3D chaingun rotor spins around Z axis');
    game.update(1 / 60, input({ fire: false }));
    const spinDownPose = chaingunPose({
      time: game.time,
      recoil: game.player.recoil,
      attacking: !game.player.dryFire && game.player.cooldown > 0 && game.player.triggerHeld !== false,
      spinDown: Math.max(game.player.spinDown ?? 0, game.player.cooldown > 0 ? 0.1 : 0),
    });
    assert.ok(spinDownPose.rotorRot.z > 0, 'releasing fire keeps 3D chaingun barrel rotor spinning through spin-down');
    game.player.angle = 0;
    game.player.ammo = savedAmmo;
    game.player.cooldown = 0;
    game.player.spinDown = 0;

    // Picking up Rocket Launcher unlocks slot 4, grants ammo, and auto-equips
    const rlPickup = game.pickups.find((p) => p.type === 'rocket');
    game.touch(rlPickup.body);
    assert.equal(game.player.weapons.rocket, true, 'rocket launcher unlocked on pickup');
    assert.equal(game.player.weapon, 'rocket', 'rocket launcher auto-equipped on first pickup');
    assert.equal(game.player.rockets, AMMO_TYPES.rockets.weaponBonus, 'rocket launcher pickup grants its rocket bonus');

    // Firing Rocket Launcher spawns a player rocket projectile consuming 2 ammo and detonating on impact with splash damage & gibbing
    game.player.cooldown = 0;
    const ammoBeforeRocket = game.player.ammo;
    game.events.length = 0;
    game.fire();
    assert.equal(game.player.ammo, ammoBeforeRocket - WEAPONS.rocket.ammoCost, 'rocket launcher costs 2 ammo');
    assert.ok(game.events.some((e) => e.type === 'rocketFire'), 'rocket launcher emits rocketFire sound');
    const rocketShot = game.shots.find((s) => s.kind === 'rocket' && s.team === 'player');
    assert.ok(rocketShot, 'player rocket projectile spawned');

    run(game, 0.4);
    assert.equal(target.state, 'dead', 'rocket direct + splash blast kills brute');
    assert.equal(target.gibbed, true, 'rocket kill triggers guaranteed XDeath gibbing');
    assert.ok(game.effects.some((e) => e.type === 'boom'), 'rocket detonation spawns boom explosion effect');

    // Weapon inventory & active weapon persist across nextLevel()
    game.nextLevel();
    assert.equal(game.player.weapons.chaingun, true, 'chaingun persists to next level');
    assert.equal(game.player.weapons.rocket, true, 'rocket launcher persists to next level');
    assert.equal(game.player.weapon, 'rocket', 'active weapon persists to next level');
  },

  'armor system: 3D green security armor & blue megaarmor pickups absorb 33% and 50% damage and persist across levels'() {
    for (const color of ARMOR_COLORS) {
      const atlas = armorAtlas(color);
      assert.equal(atlas.width, ARMOR_CELL * ARMOR_FRAMES);
      assert.equal(atlas.height, ARMOR_CELL);
      assert.equal(atlas.data.length, atlas.width * atlas.height * 4);
      for (const idx of Object.values(ARMOR_CELLS)) {
        let opaque = 0;
        for (let y = 0; y < ARMOR_CELL; y++) {
          for (let x = 0; x < ARMOR_CELL; x++) {
            if (atlas.data[(y * atlas.width + idx * ARMOR_CELL + x) * 4 + 3] === 255)
              opaque++;
          }
        }
        assert.equal(opaque, ARMOR_CELL * ARMOR_CELL, `armor ${color} cell ${idx} is fully opaque`);
      }
    }

    const mesh = armorMesh();
    assert.ok(mesh.vertices.length >= 36 * 3 && mesh.vertices.length % 9 === 0, '3D armor vest mesh has multi-box triangle vertices');
    assert.equal(mesh.uvs.length, (mesh.vertices.length / 3) * 2, '3D armor vest mesh UVs match vertices');

    assert.ok(RECIPES.armor, 'armor pickup sound recipe exists');

    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      assert.ok(g.pickups.some((p) => p.type === 'greenArmor'), `level ${i + 1} has a green security armor pickup`);
      assert.ok(g.pickups.some((p) => p.type === 'blueArmor'), `level ${i + 1} has a blue megaarmor pickup`);
    }

    const game = fresh(0);
    clearEnemies(game);
    assert.equal(game.player.armor, 0, 'player starts with 0 armor');
    assert.equal(game.player.armorType, null, 'player starts with no armor type');

    // Green Security Armor grants 100 armor and absorbs 33% (1/3) of incoming damage
    const greenPickup = game.pickups.find((p) => p.type === 'greenArmor');
    game.events.length = 0;
    game.touch(greenPickup.body);
    assert.equal(game.player.armor, ARMOR_TYPES.green.points, 'green armor grants 100 armor points');
    assert.equal(game.player.armorType, 'green', 'armorType set to green');
    assert.equal(greenPickup.taken, true, 'green armor pickup marked taken');
    assert.ok(game.events.some((e) => e.type === 'armor'), 'emits armor pickup sound');

    // Cannot pick up another green armor when already at >= 100 armor
    const extraGreen = game.addPickup('greenArmor', new Vec2(128, 128), false);
    game.touch(extraGreen.body);
    assert.equal(extraGreen.taken, false, 'green armor ignored when player already has >= 100 armor');

    // 30 damage with Green Armor: absorbs round(30 * 1/3) = 10 armor, health loses 20
    game.hurtPlayer(30);
    assert.equal(game.player.armor, 90, 'green armor absorbs 10 of 30 damage (33%)');
    assert.equal(game.player.health, 80, 'player health takes remaining 20 damage');

    // Blue MegaArmor upgrades over Green Armor (< 200), granting 200 armor and absorbing 50% of incoming damage
    const bluePickup = game.pickups.find((p) => p.type === 'blueArmor');
    game.events.length = 0;
    game.touch(bluePickup.body);
    assert.equal(game.player.armor, ARMOR_TYPES.blue.points, 'blue megaarmor sets armor to 200');
    assert.equal(game.player.armorType, 'blue', 'armorType set to blue');
    assert.equal(bluePickup.taken, true, 'blue megaarmor pickup marked taken');
    assert.ok(game.events.some((e) => e.type === 'armor'), 'emits armor pickup sound');

    // Green armor is ignored while holding 200 blue armor
    game.touch(extraGreen.body);
    assert.equal(extraGreen.taken, false, 'green armor cannot overwrite 200 blue megaarmor');
    assert.equal(game.player.armorType, 'blue', 'armorType stays blue');

    // 30 damage with Blue MegaArmor: absorbs round(30 * 0.5) = 15 armor, health loses 15
    game.hurtPlayer(30);
    assert.equal(game.player.armor, 185, 'blue megaarmor absorbs 15 of 30 damage (50%)');
    assert.equal(game.player.health, 65, 'player health takes remaining 15 damage');

    // Armor and armorType persist across nextLevel()
    game.nextLevel();
    assert.equal(game.player.armor, 185, 'armor points persist to next level');
    assert.equal(game.player.armorType, 'blue', 'armorType persists to next level');

    // Depleting armor resets armorType to null
    game.player.armor = 5;
    game.player.health = 100;
    game.hurtPlayer(20);
    assert.equal(game.player.armor, 0, 'armor clamps to 0 when depleted');
    assert.equal(game.player.armorType, null, 'armorType resets to null when armor reaches 0');
    assert.equal(game.player.health, 85, 'remaining unabsorbed damage goes to health');
  },

  'Supercharge Powerups (Soulsphere, Berserk Pack & Rad Suit) have 3D textured meshes and grant overcharge, 4x chainsaw gibbing, and slime immunity'() {
    // 1. Verify 3D procedural atlases and meshes for Soulsphere, Berserk Pack, and Rad Suit
    for (const [kind, makeAtlas, makeMesh] of [
      ['soulsphere', soulsphereAtlas, soulsphereMesh],
      ['berserk', berserkAtlas, berserkMesh],
      ['radsuit', radsuitAtlas, radsuitMesh],
    ]) {
      const atlas = makeAtlas();
      assert.equal(atlas.width, POWERUP_CELL * POWERUP_FRAMES, `${kind} atlas width is 128`);
      assert.equal(atlas.height, POWERUP_CELL, `${kind} atlas height is 32`);
      for (const cell of Object.values(POWERUP_CELLS)) {
        let opaque = 0;
        for (let y = 0; y < POWERUP_CELL; y++)
          for (let x = 0; x < POWERUP_CELL; x++)
            if (atlas.data[(y * atlas.width + cell * POWERUP_CELL + x) * 4 + 3] === 255)
              opaque++;
        assert.equal(opaque, POWERUP_CELL * POWERUP_CELL, `${kind} cell ${cell} is fully opaque`);
      }
      const mesh = makeMesh();
      assert.ok(mesh.vertices.length >= 180 && mesh.vertices.length % 9 === 0, `${kind} mesh has valid 3D triangles`);
      assert.equal(mesh.uvs.length, (mesh.vertices.length / 3) * 2, `${kind} mesh UVs match vertex count`);
    }

    // 2. Verify all three levels spawn Supercharge Powerups from WAD symbols O, Z, V
    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      assert.ok(
        g.pickups.some((p) => p.type === 'soulsphere' || p.type === 'berserk' || p.type === 'radsuit'),
        `level ${i} spawns at least one supercharge powerup`
      );
    }

    // 3. Soulsphere supercharges health by +100 up to 200% (overriding standard 100% cap)
    const game = fresh(0);
    clearEnemies(game);
    const soulPickup = game.pickups.find((p) => p.type === 'soulsphere');
    assert.ok(soulPickup, 'E1M1 has a Soulsphere pickup');
    game.events.length = 0;
    game.touch(soulPickup.body);
    assert.equal(game.player.health, 200, 'Soulsphere boosts 100 HP player to 200 HP');
    assert.equal(soulPickup.taken, true, 'Soulsphere marked taken');
    assert.ok(game.player.soulFlash > 0, 'Soulsphere triggers blue visor flash');
    assert.ok(game.events.some((e) => e.type === 'powerup' && e.kind === 'soulsphere'), 'emits powerup sound');

    // Standard medikits cannot be picked up while supercharged (>= 100 HP), and another Soulsphere is ignored at 200 HP
    const extraSoul = game.addPickup('soulsphere', new Vec2(128, 128), false);
    game.touch(extraSoul.body);
    assert.equal(extraSoul.taken, false, 'Soulsphere ignored when already at 200 HP');

    // 4. Berserk Pack heals to 100%, auto-switches to Chainsaw, and multiplies Chainsaw damage by 4x (instant gibbing)
    game.player.health = 45;
    game.player.weapon = 'shotgun';
    const berserkPickup = game.pickups.find((p) => p.type === 'berserk');
    assert.ok(berserkPickup, 'E1M1 has a Berserk Pack pickup');
    game.events.length = 0;
    game.touch(berserkPickup.body);
    assert.equal(game.player.health, 100, 'Berserk heals injured player up to 100 HP');
    assert.equal(game.player.berserk, true, 'player.berserk is enabled');
    assert.equal(game.player.berserkTimer, POWERUP_TYPES.berserk.tintDuration, 'berserk crimson tint timer started');
    assert.equal(game.player.weapon, 'chainsaw', 'Berserk auto-switches to Chainsaw');
    assert.equal(berserkPickup.taken, true, 'Berserk Pack marked taken');

    // Test 4x Chainsaw damage on a tough Brute (hp: 22 -> 1 hit of 3 * 4 = 12 leaves 10 HP; 2nd hit gibs it!)
    const brute = game.addEnemy('brute', new Vec2(game.player.pos.x + 36, game.player.pos.y));
    game.player.angle = 0;
    game.player.cooldown = 0;
    game.fireChainsaw();
    assert.equal(brute.hp, 10, 'Berserk chainsaw deals 12 damage (4x base 3) in a single strike');
    game.fireChainsaw();
    assert.equal(brute.state, 'dead', 'second Berserk chainsaw strike kills the Brute');
    assert.equal(brute.gibbed, true, 'Berserk chainsaw guarantees XDeath gibbing');

    // 5. Radiation Shielding Suit grants 45 seconds of complete immunity to toxic slime floors
    const radPickup = game.pickups.find((p) => p.type === 'radsuit');
    assert.ok(radPickup, 'E1M1 has a Radiation Shielding Suit pickup');
    game.events.length = 0;
    game.touch(radPickup.body);
    assert.equal(game.player.radSuit, POWERUP_TYPES.radsuit.duration, 'Rad Suit grants 45s of protection');
    assert.equal(radPickup.taken, true, 'Rad Suit marked taken');

    // Find a toxic slime tile and stand on it for 3 seconds while Rad Suit is active
    const slimeIdx = game.level.slime.findIndex((v) => v === 1);
    assert.ok(slimeIdx >= 0, 'level has toxic slime tiles');
    const sx = ((slimeIdx % game.level.width) + 0.5) * 64;
    const sy = (Math.floor(slimeIdx / game.level.width) + 0.5) * 64;
    game.player.body.setPosition(new Vec2(sx, sy));
    const healthBefore = game.player.health;
    for (let i = 0; i < 30; i++)
      game.updateHazards(0.1);
    assert.equal(game.player.health, healthBefore, 'player takes 0 slime damage while Rad Suit is active');
    assert.ok(game.player.radSuit < POWERUP_TYPES.radsuit.duration && game.player.radSuit > 40, 'Rad Suit timer ticks down');

    // Once Rad Suit expires, slime damages the player again
    game.player.radSuit = 0;
    for (let i = 0; i < 10; i++)
      game.updateHazards(0.1);
    assert.ok(game.player.health < healthBefore, 'toxic slime damages player once Rad Suit expires');
  },

  'full-screen tactical automap: toggle, zoom, grid, vector architecture, and telemetry'() {
    const game = fresh(0);
    game.state = 'play';
    game.kills = 4;
    game.itemsPicked = 3;
    game.secretsFound = 1;
    game.stats.time = 75;

    const texts = [];
    const rectLines = [];
    const crispLines = [];
    const fills = [];
    let weaponQuads = 0;
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {},
          clearRect() {},
          fillRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
          fillText(str) {
            texts.push(str);
          },
        };
      },
    };
    const mockOverlay = {
      clear() {},
      glow: {
        line() {},
      },
      crisp: {
        fillRect(x, y, w, h, col) {
          fills.push({ x, y, w, h, col });
        },
        rectLine(x, y, w, h, col, alpha) {
          rectLines.push({ x, y, w, h, col, alpha });
        },
        line(pts, col, alpha) {
          crispLines.push({ pts, col, alpha });
        },
        circleLine() {},
        weapon: {
          quad() {
            weaponQuads++;
          },
        },
        sprites: { quad() {} },
        face: { quad() {} },
      },
    };

    const hud = new Hud(mockCanvas, mockOverlay);
    hud.resize(1280, 760, 1);
    assert.equal(hud.automap, false, 'automap starts closed');
    assert.equal(hud.automapZoom, 1, 'automap zoom starts at 1.0');
    assert.equal(hud.automapGrid, true, 'automap grid starts enabled');

    // Toggle automap on -> emits 'automap' sound event and hides 3D weapon sprite while keeping status bar
    game.events.length = 0;
    assert.equal(hud.toggleAutomap(game), true, 'toggleAutomap opens automap');
    assert.ok(game.events.some((e) => e.type === 'automap'), 'toggling automap emits automap sound event');

    // Zoom & grid controls clamp and toggle cleanly
    assert.equal(hud.zoomAutomap(0.5), 1.5, 'zoomAutomap increases zoom');
    assert.equal(hud.zoomAutomap(10), 3.0, 'zoomAutomap clamps at 3.0x');
    assert.equal(hud.zoomAutomap(-10), 0.6, 'zoomAutomap clamps at 0.6x');
    hud.automapZoom = 1;
    assert.equal(hud.toggleAutomapGrid(), false, 'toggleAutomapGrid turns grid off');
    assert.equal(hud.toggleAutomapGrid(), true, 'toggleAutomapGrid turns grid back on');

    // Reveal the map and render full-screen automap
    game.fog.explored.fill(1);
    game.fog.visible.fill(1);
    const secretDoor = [...game.level.doors.values()].find((d) => d.secret);
    if (secretDoor)
      secretDoor.revealed = true;
    if (game.level.secrets.length > 0)
      game.discoveredSecrets.add(game.level.secrets[0]);

    game.player.weapon = 'rocket';
    hud.render(game);
    assert.equal(weaponQuads, 0, 'weapon sprite is hidden while full-screen tactical automap is open');
    assert.equal(game.automap, true, '3D weapon viewmodel is hidden while full-screen tactical automap is open');
    assert.ok(texts.some((t) => t.includes('TACTICAL AUTOMAP')), 'automap header displays TACTICAL AUTOMAP');
    assert.ok(
      texts.some((t) => t.includes(`KILLS 4/${game.totalEnemies}`) && t.includes(`ITEMS 3/${game.totalItems}`) && t.includes(`SECRETS 1/${game.totalSecrets}`) && t.includes('TIME 01:15')),
      'automap header displays live KILLS, ITEMS, SECRETS, and TIME telemetry',
    );
    assert.ok(texts.some((t) => t.includes('[TAB] CLOSE') && t.includes('ZOOM 100%') && t.includes('GRID ON')), 'automap footer displays interactive controls');
    assert.ok(texts.includes('S'), 'revealed secret door / discovered secret room is marked with S on the automap');
    assert.ok(texts.includes('X'), 'explored exit portal is marked with X on the automap');
    assert.ok(crispLines.some((l) => l.col[0] > 0.85 && l.col[1] < 0.2), 'automap draws classic Doom red vector boundary wall lines');
    assert.ok(rectLines.some((r) => r.col[0] > 0.9 && r.col[1] > 0.5 && r.col[2] < 0.4), 'automap draws orange elevation / secret / yellow-lock outlines');
    assert.ok(crispLines.some((l) => l.col[1] > 0.7 && l.alpha === 1), 'automap draws classic Doom green vector player arrow');

    // Toggling automap off restores normal HUD + 3D weapon viewmodel visibility
    assert.equal(hud.toggleAutomap(game), false, 'toggleAutomap closes automap');
    hud.render(game);
    assert.equal(game.automap, false, 'closing automap restores 3D weapon viewmodel visibility');
  },

  'procedural level soundtracks (E1M1 Ambient, E1M2 Metal, E1M3 Horror, E1M4 Boss, E1M5 Gore, Intro) and M track cycling'() {
    const sound = new Sound();
    // By default ('auto'), each level has its own distinct soundtrack
    assert.equal(sound.effectiveMusicMode('play', 0), 'play', 'Level 1 (E1M1) defaults to ambient/spooky play soundtrack');
    assert.equal(sound.effectiveMusicMode('play', 1), 'metal', 'Level 2 (E1M2) defaults to industrial metal soundtrack');
    assert.equal(sound.effectiveMusicMode('play', 2), 'horror', 'Level 3 (E1M3) defaults to horror metal soundtrack');
    assert.equal(sound.effectiveMusicMode('play', 3), 'boss', 'Level 4 (E1M4) defaults to boss finale soundtrack');
    assert.equal(sound.effectiveMusicMode('play', 4), 'gore', 'Level 5 (E1M5) defaults to gore metal soundtrack');
    assert.equal(sound.effectiveMusicMode('title', 0), 'title', 'title state uses intro theme by default');

    // Pressing M on Level 1 cycles through all 6 tracks + Off:
    // E1M1 ('play') -> E1M2 ('metal') -> E1M3 ('horror') -> E1M4 ('boss') -> E1M5 ('gore') -> Intro ('title') -> Off ('off') -> E1M1 ('play')
    assert.equal(sound.toggleMusic(0), 'Music: E1M2 Industrial Metal', 'first M press on Level 1 switches to E1M2 Industrial Metal');
    assert.equal(sound.effectiveMusicMode('play', 0), 'metal', 'effectiveMusicMode reflects E1M2 override');
    assert.equal(sound.toggleMusic(0), 'Music: E1M3 Horror Metal', 'second M press switches to E1M3 Horror Metal');
    assert.equal(sound.effectiveMusicMode('play', 0), 'horror', 'effectiveMusicMode reflects E1M3 override');
    assert.equal(sound.toggleMusic(0), 'Music: E1M4 Boss Finale', 'third M press switches to E1M4 Boss Finale');
    assert.equal(sound.effectiveMusicMode('play', 0), 'boss', 'effectiveMusicMode reflects E1M4 override');
    assert.equal(sound.toggleMusic(0), 'Music: E1M5 Gore Metal', 'fourth M press switches to E1M5 Gore Metal');
    assert.equal(sound.effectiveMusicMode('play', 0), 'gore', 'effectiveMusicMode reflects E1M5 override');
    assert.equal(sound.toggleMusic(0), 'Music: Intro Theme', 'fifth M press switches to Intro Theme during gameplay');
    assert.equal(sound.effectiveMusicMode('play', 0), 'title', 'effectiveMusicMode allows listening to Intro Theme in level');
    assert.equal(sound.toggleMusic(0), 'Music: Off', 'sixth M press switches music Off');
    assert.equal(sound.effectiveMusicMode('play', 0), 'off', 'effectiveMusicMode reflects Off');
    assert.equal(sound.effectiveMusicMode('title', 0), 'off', 'Off preference silences title music too');
    assert.equal(sound.toggleMusic(0), 'Music: E1M1 Ambient', 'seventh M press wraps around to E1M1 Ambient');
    assert.equal(sound.effectiveMusicMode('play', 0), 'play', 'effectiveMusicMode reflects E1M1 Ambient');
    assert.equal(sound.effectiveMusicMode('title', 0), 'play', 'explicit track selection overrides title screen music too');

    // Every score is a GroovR song played by the GroovR engine
    for (const [mode, song] of Object.entries(SONGS))
      assert.deepEqual(validateSong(song), [], `the ${mode} score is a valid GroovR song`);
    const pattern = (mode, id) => SONGS[mode].patterns.find((p) => p.id === `pat-${id}`);
    assert.equal(pattern('horror', 'guitar-palm').length, 64, 'E1M3 has a sixteen-bar riff cycle');
    assert.equal(pattern('boss', 'guitar-palm').length, 32, 'E1M4 has an eight-bar riff cycle');
    assert.equal(pattern('gore', 'guitar-palm').length, 128, 'E1M5 has a thirty-two-bar (128-beat / 512-step) gore metal riff cycle');
    assert.ok(SONGS.gore.bpm >= 150, 'E1M5 Gore Metal has a fast driving industrial tempo');
    assert.ok(pattern('gore', 'lead-metal').notes.length >= 90, 'E1M5 centers around a clear, evolving main melody across all 32 bars');
    assert.ok(pattern('gore', 'growl-gore').notes.length >= 4, 'E1M5 punctuates phrase turnarounds and breakdown rests with monster gore growls');
    assert.ok(pattern('boss', 'boss-horn').notes.some((n) => n.time >= 16), 'E1M4 has a second-half horn variation in bars 5-8');
    assert.equal(pattern('horror', 'music-box').notes.length, 59, 'E1M3 music-box lullaby spans both eight-bar halves with detuned variations');
    const boxSemitones = new Set(pattern('horror', 'music-box').notes.map((n) => Math.round(n.pitch - 81)));
    assert.ok(boxSemitones.has(1) && boxSemitones.has(6), 'the lullaby goes wrong on the flat second and the tritone');
    assert.equal(pattern('metal', 'guitar-palm').length, 64, 'E1M2 repeats after sixteen bars');
    assert.equal(SONGS.title.loopStart, 16, 'the intro settles into its last two passes, as it does in the game');
    assert.ok(SONGS.title.tracks.some((t) => t.id === 'throb' && t.period > 0), 'the intro drone repeats on its own period');
    assert.ok(SONGS.metal.buses.some((b) => b.id === 'amp'), 'industrial metal has the guitar amp bus');
    assert.equal(SONGS.play.buses.length, 0, 'the ambient score has no guitar amp');
    const layersOf = (mode, id) => SONGS[mode].instruments.find((i) => i.id === id).layers;
    assert.equal(layersOf('metal', 'snare').length, 3, 'backbeat snares ring with the boss anvil');
    assert.equal(layersOf('metal', 'snare-ghost').length, 2, 'a ghost snare has no anvil ring');
    assert.equal(layersOf('metal', 'snare-dry').length, 2, 'a snare struck dry has no anvil ring');
    const anvil = layersOf('metal', 'snare')[2];
    assert.deepEqual(anvil.velocity, { b: 0.5, r: 0.5 }, 'each anvil ring is struck with its own random velocity');
    assert.ok(anvil.voices.every((v) => typeof v.freq === 'number'), 'the anvil ring keeps one fixed tuning');
    assert.ok(layersOf('metal', 'guitar-palm')[0].out === 'amp' && layersOf('metal', 'guitar-palm')[0].shaper, 'guitar notes go through the amp with per-note preamp waveshaping');

    // The engine plays them through a mock audio context
    const counts = { osc: 0, sources: 0, amps: 0, starts: [] };
    const mockParam = () => ({
      value: 0,
      setValueAtTime() {},
      setTargetAtTime() {},
      cancelScheduledValues() {},
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
    });
    const mockNode = () => ({
      connect() {
        return this;
      },
      disconnect() {},
      start(t) {
        counts.starts.push(t);
      },
      stop() {},
      frequency: mockParam(),
      detune: mockParam(),
      Q: mockParam(),
      gain: mockParam(),
      delayTime: mockParam(),
      pan: mockParam(),
      threshold: mockParam(),
      ratio: mockParam(),
      attack: mockParam(),
      release: mockParam(),
      knee: mockParam(),
      buffer: null,
      curve: null,
      oversample: 'none',
      type: 'sine',
    });
    const mockCtx = {
      currentTime: 0,
      sampleRate: 100,
      createGain: () => mockNode(),
      createDelay: () => mockNode(),
      createChannelMerger: () => mockNode(),
      createChannelSplitter: () => mockNode(),
      createStereoPanner: () => mockNode(),
      createDynamicsCompressor: () => mockNode(),
      createOscillator: () => {
        counts.osc++;
        return mockNode();
      },
      createBiquadFilter: () => mockNode(),
      createWaveShaper: () => {
        const node = mockNode();
        Object.defineProperty(node, 'oversample', {
          set(v) {
            if (v === '2x') counts.amps++;
          },
          get: () => 'none',
        });
        return node;
      },
      createConvolver: () => mockNode(),
      createBuffer: (_ch, len) => ({ getChannelData: () => new Float32Array(len) }),
      createBufferSource: () => {
        counts.sources++;
        return mockNode();
      },
    };
    const ticks = [];
    const realSetInterval = globalThis.setInterval;
    const realClearInterval = globalThis.clearInterval;
    globalThis.setInterval = (fn) => ticks.push(fn);
    globalThis.clearInterval = () => {};
    const run = (seconds) => {
      for (let t = 0; t < seconds; t += 0.5) {
        mockCtx.currentTime += 0.5;
        for (const tick of ticks) tick();
      }
    };
    const reset = () => {
      Object.assign(counts, { osc: 0, sources: 0, amps: 0, starts: [] });
      ticks.length = 0;
    };
    try {
      const music = new Music(mockCtx, mockNode());

      // 1. Intro / Intermission: solo bass, then sub-bass and kick join, then the lead melody
      music.setLevel(0.28, 'title');
      assert.equal(music.mode, 'title', 'the intro theme is playing');
      run(6);
      const pass0 = counts.osc;
      assert.ok(pass0 > 0, 'the intro schedules its picked bass ostinato');
      run(7.68);
      const pass1 = counts.osc - pass0;
      assert.ok(pass1 > pass0, 'after four repetitions sub-bass, throb and kick join under the picked bass');
      run(7.68);
      const pass2 = counts.osc - pass0 - pass1;
      assert.ok(pass2 > pass1, 'after eight repetitions the Phrygian lead melody joins');
      music.setLevel(0);
      reset();

      // 2. E1M1 Ambient: pads, booms, bells and a metallic scrape, with no guitar amp
      music.setLevel(0.28, 'play');
      run(25);
      assert.ok(counts.osc > 10, 'Level 1 ambient mode schedules pad, boom and bell oscillators');
      assert.ok(counts.sources > 0, 'Level 1 ambient mode schedules the metallic scrape');
      assert.equal(counts.amps, 0, 'the guitar amp is not built during Level 1 ambient mode');
      music.setLevel(0);
      reset();

      // 3. E1M2 Industrial Metal across eight bars
      music.setLevel(0.24, 'metal');
      run(14.8);
      assert.ok(counts.amps > 0, 'industrial metal activates the waveshaper guitar amp');
      assert.ok(counts.osc > 300, 'industrial metal schedules chords, sub-bass, Phrygian leads, kicks, snares and anvils');
      assert.ok(counts.sources > 40, 'industrial metal schedules drum and cymbal transients');
      music.setLevel(0);
      reset();

      // 4. E1M3 Horror Metal across an eight-bar cycle
      music.setLevel(0.24, 'horror');
      run(21);
      assert.ok(counts.amps > 0, 'E1M3 routes its downtuned guitar chugs through the guitar amp');
      assert.ok(counts.osc > 150, 'E1M3 schedules chugs, sub-bass, lullaby, strings and drums');
      assert.ok(counts.sources > 15, 'E1M3 schedules snare, risers and cymbal ticks');
      music.setLevel(0);
      reset();

      // 5. E1M4 Boss Finale
      music.setLevel(0.24, 'boss');
      run(14);
      assert.ok(counts.osc > 150, 'E1M4 schedules drop-C doom chords, tritone dread horns and double-kicks');
      assert.ok(counts.sources > 30, 'E1M4 schedules war-march percussion transients');
      music.setLevel(0);
      reset();

      // 6. E1M5 Gore Metal
      music.setLevel(0.24, 'gore');
      run(16);
      assert.ok(counts.amps > 0, 'E1M5 routes its industrial gore guitars through the guitar amp');
      assert.ok(counts.osc > 200, 'E1M5 schedules Hungarian-minor main melody, gallop riffs, sub-bass, and sparse gore growls');
      assert.ok(counts.sources > 30, 'E1M5 schedules tight industrial drums and cymbal transients');

      // Switching to 0 ('off') silences the score
      music.setLevel(0);
      assert.equal(music.mode, null, 'Music mode clears cleanly when silenced');
      reset();

      // 6. Fast non-overlapping fade in & fade out between score changes
      assert.equal(FADE_OUT, 0.25, 'fast fade-out is 0.25s');
      assert.equal(FADE_IN, 0.25, 'fast fade-in is 0.25s');
      const paramLogs = [];
      const logParam = (name) => ({
        name,
        value: 0,
        setValueAtTime(v, t) {
          paramLogs.push({ name, method: 'setValueAtTime', v, t });
        },
        linearRampToValueAtTime(v, t) {
          paramLogs.push({ name, method: 'linearRampToValueAtTime', v, t });
        },
        exponentialRampToValueAtTime() {},
        cancelScheduledValues() {},
        setTargetAtTime() {},
      });
      let gainId = 0;
      const testGainCtx = {
        ...mockCtx,
        currentTime: 10.0,
        createGain() {
          const node = { gain: logParam(`gain_${gainId++}`), connect() {}, disconnect() {} };
          return node;
        },
      };
      const testMusic = new Music(testGainCtx, mockNode());
      testMusic.setLevel(0.3, 'metal');
      const firstFadeIn = paramLogs.find((l) => l.method === 'linearRampToValueAtTime' && l.v === 0.3);
      assert.equal(firstFadeIn.t, 10.0 + FADE_IN, 'first track fades in over FADE_IN');
      const oldLevel = firstFadeIn.name;

      // Switch from metal to horror at currentTime = 12.0
      testGainCtx.currentTime = 12.0;
      paramLogs.length = 0;
      counts.starts.length = 0;
      testMusic.setLevel(0.3, 'horror');
      const rampsToZero = paramLogs.filter((l) => l.method === 'linearRampToValueAtTime' && l.v === 0 && l.t === 12.0 + FADE_OUT);
      assert.equal(rampsToZero.length, 3, 'old track dry bus, reverb send and reverb return all fade out so no reverb tail rings under the new track');
      assert.ok(rampsToZero.some((l) => l.name === oldLevel), 'the old track ramps to 0 gain');
      const newFadeIn = paramLogs.find((l) => l.method === 'linearRampToValueAtTime' && l.v === 0.3);
      assert.equal(newFadeIn.t, 12.0 + FADE_OUT + FADE_IN, 'new track completes fade-in at now + FADE_OUT + FADE_IN');
      assert.ok(paramLogs.some((l) => l.name === newFadeIn.name && l.method === 'setValueAtTime' && l.v === 0 && l.t === 12.0 + FADE_OUT), 'new track holds 0 gain until old track completes fade-out');
      assert.ok(counts.starts.length > 0 && counts.starts.every((t) => t >= 12.0 + FADE_OUT), 'new track notes start only after old track fade-out completes (no overlap)');

      // The same score keeps playing and just eases to the new level
      paramLogs.length = 0;
      testMusic.setLevel(0.12, 'horror');
      assert.equal(testMusic.mode, 'horror', 'the same score is kept');
      assert.equal(paramLogs.length, 0, 'a level change does not restart or fade the score');
      testMusic.setLevel(0);
    } finally {
      globalThis.setInterval = realSetInterval;
      globalThis.clearInterval = realClearInterval;
    }
  },

  'teleporters (T), telefrag XDeath gibbing, and E1M4 Phobos Anomaly twin Warden finale'() {
    assert.equal(typeof RECIPES.teleport, 'function', 'teleport plasma audio recipe exists');
    const makeParam = (label) => ({
      value: 0,
      setValueAtTime(v, t) {
        assert.ok(Number.isFinite(v) && Number.isFinite(t), `${label}.setValueAtTime requires finite floats`);
      },
      exponentialRampToValueAtTime(v, t) {
        assert.ok(Number.isFinite(v) && v > 0 && Number.isFinite(t), `${label}.exponentialRampToValueAtTime requires positive finite floats`);
      },
    });
    const recipeCtx = {
      sampleRate: 44100,
      createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
      createWaveShaper: () => ({ curve: null, connect() {} }),
      createOscillator: () => ({ type: 'sine', frequency: makeParam('osc.frequency'), connect() {}, start() {}, stop() {} }),
      createGain: () => ({ gain: makeParam('gain.gain'), connect() {} }),
      createBiquadFilter: () => ({ type: 'lowpass', frequency: makeParam('filter.frequency'), Q: makeParam('filter.Q'), connect() {} }),
      createBufferSource: () => ({ buffer: null, connect() {}, start() {}, stop() {} }),
    };
    for (const [rName, rFn] of Object.entries(RECIPES)) {
      const info = rFn(recipeCtx, { connect() {} }, 0, {});
      assert.ok(info && info.duration > 0, `recipe ${rName} executes with valid AudioParams`);
    }

    // Teleporter atlas is power-of-two, opaque, and has bright cyan/emerald quantum rings and beacons (no crimson pentagram); shader pulses with uTime
    const tele = teleporterAtlas();
    assert.equal(tele.width, TILE_PIXELS);
    assert.equal(tele.height, TILE_PIXELS);
    let brightPixels = 0;
    let redDominantPixels = 0;
    for (let i = 0; i < tele.data.length; i += 4) {
      assert.equal(tele.data[i + 3], 255, 'teleporter pad atlas is fully opaque');
      if (tele.data[i] > 180 || tele.data[i + 1] > 180 || tele.data[i + 2] > 180)
        brightPixels++;
      if (tele.data[i] > tele.data[i + 1] && tele.data[i] > tele.data[i + 2])
        redDominantPixels++;
    }
    assert.ok(brightPixels > 250, 'teleporter atlas contains glowing quantum stator rings, core, and corner beacon pixels');
    assert.equal(redDominantPixels, 0, 'futuristic teleporter atlas has cool cyan/emerald tech glow instead of crimson pentagram');
    assert.ok(TELEPORTER_FRAGMENT.includes('uTime'), 'teleporter fragment shader pulses with uTime');

    // 3D futuristic teleporter machine geometry includes base pedestal, 4 corner pylons, and overhead ceiling ring
    const enclosedQuads = teleporterMachineQuads(new Vec3(96, -0.18, 160), new Vec2(64, 62.8));
    const openQuads = teleporterMachineQuads(new Vec3(96, -0.18, 160), new Vec2(64, 0));
    assert.ok(enclosedQuads.length > openQuads.length, 'enclosed teleporter machine adds overhead ceiling emitter hood quads');
    assert.ok(openQuads.length >= 60, 'teleporter machine builds 3D stepped pedestal and 4 corner field pylons with coil collars');
    let maxMachineY = -Infinity;
    for (const q of enclosedQuads) {
      assert.equal(q.corners.length, 12, 'each teleporter machine quad has 4 3D vertices');
      assert.equal(q.uv.length, 4, 'each teleporter machine quad has 4 UV bounds');
      for (let k = 1; k < 12; k += 3)
        maxMachineY = Math.max(maxMachineY, q.corners[k]);
    }
    assert.ok(maxMachineY > 60, '3D teleporter machine reaches up to the ceiling emitter unit');
    const teleMesh = teleporterMachineMesh(new Vec3(0, 0, 0), new Vec2(64, 62.8));
    assert.equal(teleMesh.vertices.length, enclosedQuads.length * 18, 'teleporterMachineMesh converts each quad into 2 triangles (18 floats)');
    assert.equal(teleMesh.uvs.length, enclosedQuads.length * 12, 'teleporterMachineMesh converts each quad into 6 UVs (12 floats)');

    // Every level (E1M1..E1M5) has paired teleporter pads
    assert.equal(LEVELS.length, 5, 'Episode 1 has 5 levels including E1M5 Red Planet');
    assert.equal(LEVELS[3].name, 'E1M4 · Phobos Anomaly');
    assert.equal(LEVELS[4].name, 'E1M5 · Red Planet');
    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      assert.ok(g.level.teleporters.length >= 2, `level ${i} has paired teleporter pads (${g.level.teleporters.length})`);
      assert.equal(g.level.teleporters.length % 2, 0, `level ${i} teleporters come in linked pairs`);
      for (const pad of g.level.teleporters) {
        const partner = g.level.teleporterByTile.get(pad.targetIdx);
        assert.ok(partner && partner !== pad, 'every teleporter pad links to its partner pad');
        assert.equal(partner.targetIdx, pad.idx, 'teleporter pairing is symmetric');
        assert.equal(g.level.teleporterAt(pad.center.x, pad.center.y), pad, 'teleporterAt resolves pad from world coordinates');
      }
    }

    // Teleporter TFOG plasma sprite atlas is 16 frames of 64x64 with vivid emerald/cyan plasma and 1px cell borders
    const tfog = teleportAtlas();
    assert.equal(tfog.width, EXPLOSION_CELL * EXPLOSION_FRAMES, 'teleportAtlas width is 1024');
    assert.equal(tfog.height, EXPLOSION_CELL, 'teleportAtlas height is 64');
    assert.equal(explosionWidth({ type: 'teleport' }), 62, 'teleport sprite has full-height 62-unit width');
    for (let f = 0; f < EXPLOSION_FRAMES; f++) {
      let greenCyan = 0;
      for (let y = 0; y < EXPLOSION_CELL; y++) {
        for (let x = 0; x < EXPLOSION_CELL; x++) {
          const o = (y * tfog.width + f * EXPLOSION_CELL + x) * 4;
          const a = tfog.data[o + 3];
          if (x === 0 || y === 0 || x === EXPLOSION_CELL - 1 || y === EXPLOSION_CELL - 1)
            assert.equal(a, 0, `teleportAtlas frame ${f} has 1px transparent cell border`);
          else if (a === 255 && tfog.data[o + 1] > tfog.data[o])
            greenCyan++;
        }
      }
      assert.ok(greenCyan > 80, `teleportAtlas frame ${f} contains vivid green/cyan plasma vortex pixels`);
    }

    // Stepping onto a teleporter pad warps the player to the destination pad, sets cooldown & teleFlash, emits 'teleport', and Telefrags any enemy on the exit pad
    const game = fresh(0);
    clearEnemies(game);
    const padA = game.level.teleporters[0];
    const padB = game.level.teleporterByTile.get(padA.targetIdx);
    game.addEnemy('brute', padB.center.clone());
    const blocker = game.enemies[0];
    game.events.length = 0;
    game.effects.length = 0;

    game.player.body.setPosition(padA.center.clone());
    game.updateTeleporters(1 / 60);

    assert.ok(game.player.pos.getDistance(padB.center) < 1, 'player warps to paired destination teleporter pad');
    assert.ok(game.player.teleportCooldown > 0.7, 'teleport cooldown prevents immediate bounce-back');
    assert.ok(game.player.teleFlash > 0.3, 'teleport triggers green-cyan plasma visor flash');
    assert.ok(game.player.shootFace > 0.3, 'teleport triggers marine portrait reaction');
    assert.ok(game.events.some((e) => e.type === 'teleport'), 'teleport emits plasma warp sound');
    const teleEffects = game.effects.filter((e) => e.type === 'teleport');
    assert.equal(teleEffects.length, 3, 'teleport spawns entry pad, exit pad, and forward-visible camera TFOG bursts');
    assert.ok(
      teleEffects.some((e) => Math.hypot(e.x - padB.center.x, e.y - padB.center.y) > 20),
      'one TFOG burst spawns in front of the player camera beyond the near clip plane',
    );
    assert.equal(blocker.state, 'dead', 'enemy standing on exit teleporter pad is instantly Telefragged');
    assert.equal(blocker.gibbed, true, 'Telefragged enemy explodes into XDeath gibs');
    assert.equal(game.message.text, 'Telefrag!', 'Telefrag displays classic Doom message');

    // Standing still on padB does not warp back to padA even long after cooldown expires
    game.updateTeleporters(1 / 60);
    assert.ok(game.player.pos.getDistance(padB.center) < 1, 'player stays on destination pad while cooldown is active');
    game.updateTeleporters(3.0);
    assert.equal(game.player.teleportCooldown, 0, 'teleport cooldown has fully expired');
    assert.ok(game.player.pos.getDistance(padB.center) < 1, 'standing still on destination pad never teleports player back');

    // Stepping off padB and stepping back onto padB teleports back to padA
    game.player.body.setPosition(new Vec2(padB.center.x + 56, padB.center.y));
    game.updateTeleporters(1 / 60);
    assert.equal(game.player.teleportPad, -1, 'stepping off destination pad resets teleportPad lock');
    game.player.body.setPosition(padB.center.clone());
    game.updateTeleporters(1 / 60);
    assert.ok(game.player.pos.getDistance(padA.center) < 1, 'stepping back onto padB warps back to padA');

    // Chasing non-boss monster stepping onto a teleporter pad warps to the partner pad when closer to player
    clearEnemies(game);
    game.player.body.setPosition(new Vec2(padB.center.x + 56, padB.center.y));
    game.addEnemy('imp', padA.center.clone());
    const imp = game.enemies[0];
    imp.state = 'chase';
    imp.teleportCooldown = 0;
    game.updateTeleporters(1 / 60);
    assert.ok(imp.pos.getDistance(padB.center) < 1, 'chasing monster warps through teleporter pad');
    assert.ok(imp.teleportCooldown > 1.0, 'warped monster receives teleport cooldown');

    // E1M4 Phobos Anomaly has twin Wardens (2 bosses): killing the first announces 'A WARDEN FALLS', killing the second announces 'THE WARDEN IS DEAD'
    const e1m4 = fresh(3);
    const bosses = e1m4.enemies.filter((e) => e.type === 'boss');
    assert.equal(bosses.length, 2, 'E1M4 Phobos Anomaly spawns twin Wardens');
    assert.ok(e1m4.level.arena.size > 20, 'E1M4 star sanctum arena encompasses the twin Wardens');
    e1m4.damageEnemy(bosses[0], 9999);
    assert.equal(bosses[0].state, 'dead', 'first Warden killed');
    assert.equal(e1m4.message.text, 'A WARDEN FALLS', 'killing first of twin Wardens announces A WARDEN FALLS');
    e1m4.damageEnemy(bosses[1], 9999);
    assert.equal(bosses[1].state, 'dead', 'second Warden killed');
    assert.equal(e1m4.message.text, 'THE WARDEN IS DEAD', 'killing final Warden announces THE WARDEN IS DEAD');
  },

  'dynamic projectile, muzzle flash, explosion, and teleporter point lighting'() {
    assert.ok(LIGHT_GLSL.includes('isCeilingFixture'), 'LIGHT_GLSL distinguishes ceiling fixtures from omnidirectional mid-room dynamic lights');

    const game = fresh(0);
    clearEnemies(game);
    const camPos = new Vec3(game.player.pos.x, EYE, game.player.pos.y);

    // 1. Weapon muzzle flash creates a warm amber-gold dynamic light in front of the player
    game.player.weapon = 'shotgun';
    game.player.flash = 0.12;
    let dyn = collectDynamicLights(game, camPos, 1.0);
    assert.equal(dyn.length, 1, 'active shotgun muzzle flash emits 1 dynamic light');
    assert.equal(dyn[0].kind, 'muzzle');
    assert.equal(dyn[0].color, MUZZLE_LIGHT_COLOR);
    assert.equal(dyn[0].attenuation, MUZZLE_LIGHT_ATTENUATION, 'muzzle flash uses short-range attenuation');
    assert.ok(MUZZLE_LIGHT_ATTENUATION.y > DYNAMIC_LIGHT_ATTENUATION.y * 2 && MUZZLE_LIGHT_ATTENUATION.z > DYNAMIC_LIGHT_ATTENUATION.z * 25, 'muzzle flash attenuates rapidly over a very short distance');
    assert.ok(LIGHT_GLSL.includes('rangeCutoff'), 'LIGHT_GLSL enforces a hard distance cutoff on short-range muzzle flash lights');
    assert.ok(dyn[0].strength > 0.9, 'muzzle flash light has strong intensity');

    // Fist melee does not emit a firearm muzzle flash light
    game.player.weapon = 'fist';
    assert.equal(collectDynamicLights(game, camPos, 1.0).length, 0, 'fist melee does not emit firearm muzzle flash');
    game.player.flash = 0;
    game.player.weapon = 'shotgun';

    // 2. Flying rockets and enemy fireballs emit traveling colored point lights
    game.shots.push({
      pos: new Vec2(game.player.pos.x + 80, game.player.pos.y),
      vel: new Vec2(360, 0),
      kind: 'rocket',
    });
    game.shots.push({
      pos: new Vec2(game.player.pos.x + 140, game.player.pos.y),
      vel: new Vec2(-220, 0),
      kind: 'shot',
    });
    dyn = collectDynamicLights(game, camPos, 1.5);
    assert.equal(dyn.length, 2, 'flying rocket and fireball each emit a dynamic light');
    assert.equal(dyn[0].kind, 'rocket', 'closer rocket prioritized first');
    assert.equal(dyn[0].color, ROCKET_LIGHT_COLOR);
    assert.equal(dyn[1].kind, 'fireball');
    assert.equal(dyn[1].color, FIREBALL_LIGHT_COLOR);

    // 3. Explosions ('boom') and teleporter plasma bursts ('teleport') emit high-priority decaying point lights
    game.effects.push({
      type: 'boom',
      x: game.player.pos.x + 90,
      y: game.player.pos.y,
      z: 20,
      age: 0.05,
      life: 0.45,
    });
    game.effects.push({
      type: 'teleport',
      x: game.player.pos.x + 110,
      y: game.player.pos.y,
      z: 22,
      age: 0.04,
      life: 0.42,
    });
    game.effects.push({
      type: 'spark',
      x: game.player.pos.x + 240,
      y: game.player.pos.y,
      z: 28,
      age: 0.02,
      life: 0.25,
    });
    dyn = collectDynamicLights(game, camPos, 2.0);
    assert.equal(dyn.length, 4, 'collectDynamicLights gathers rocket, fireball, boom, and teleport lights while ignoring wall sparks');
    assert.ok(dyn.some((d) => d.kind === 'boom' && d.color === BOOM_LIGHT_COLOR), 'explosion emits BOOM_LIGHT_COLOR');
    assert.ok(dyn.some((d) => d.kind === 'teleport' && d.color === TELEPORT_LIGHT_COLOR), 'teleporter burst emits TELEPORT_LIGHT_COLOR');
    assert.ok(!dyn.some((d) => d.kind === 'spark'), 'bullet wall-impact sparks do not spawn distant dynamic room lights');

    // 4. updateCeilingLights allocates dynamic lights into the first PointLight slots with DYNAMIC_LIGHT_ATTENUATION
    // and fills the remaining slots with nearest ceiling fixtures using CEILING_LIGHT_ATTENUATION
    const mockScene = { addLight() {}, clearLights() {} };
    const { pointLights } = createCeilingLights(mockScene, MAX_LIGHTS);
    const fixtures = ceilingLightFixtures(game.level);
    updateCeilingLights(pointLights, fixtures, camPos, 2.0, game);

    assert.equal(pointLights[0].linearAttenuation, DYNAMIC_LIGHT_ATTENUATION.y, 'first PointLight slot uses dynamic light attenuation');
    assert.ok(pointLights[0].position.y < 54, 'dynamic light sits at mid-room projectile/explosion height (< 54)');
    assert.equal(pointLights[4].linearAttenuation, CEILING_LIGHT_ATTENUATION.y, 'remaining PointLight slots use ceiling fixture attenuation');
    assert.ok(pointLights[4].position.y > 54, 'ceiling fixture slots sit at ceiling diffuser height (> 54)');

    // Clearing shots and effects restores all PointLight slots back to ceiling fixtures
    game.shots.length = 0;
    game.effects.length = 0;
    updateCeilingLights(pointLights, fixtures, camPos, 2.5, game);
    assert.equal(pointLights[0].linearAttenuation, CEILING_LIGHT_ATTENUATION.y, 'slot 0 restores ceiling light attenuation when no dynamic lights are active');
  },

  'enemies are 3D articulated textured meshes with power-of-two horror skin atlases, vertex normals, and joint animation'() {
    const pow2 = (n) => (n & (n - 1)) === 0;
    const types = Object.keys(ENEMY_TYPES);
    for (const type of types) {
      const atlas = monsterSkinAtlas(type);
      assert.equal(atlas.width, MONSTER_SKIN_CELL * MONSTER_SKIN_FRAMES, `${type} skin atlas width is 256`);
      assert.equal(atlas.height, MONSTER_SKIN_CELL, `${type} skin atlas height is 32`);
      assert.ok(pow2(atlas.width) && pow2(atlas.height), `${type} skin atlas is power-of-two`);
      assert.equal(atlas.data.length, atlas.width * atlas.height * 4, `${type} skin atlas RGBA length matches`);

      // Every anatomical cell is fully opaque and carries glowing eyes/core (G=255) on the face cell and gore (B=255) on the gore cell
      for (const [cellName, cellIdx] of Object.entries(MONSTER_SKIN_CELLS)) {
        let opaque = 0;
        let eyes = 0;
        let gore = 0;
        for (let y = 0; y < MONSTER_SKIN_CELL; y++)
          for (let x = 0; x < MONSTER_SKIN_CELL; x++) {
            const o = (y * atlas.width + cellIdx * MONSTER_SKIN_CELL + x) * 4;
            if (atlas.data[o + 3] === 255)
              opaque++;
            if (atlas.data[o + 1] === 255)
              eyes++;
            if (atlas.data[o + 2] === 255)
              gore++;
          }
        assert.equal(opaque, MONSTER_SKIN_CELL * MONSTER_SKIN_CELL, `${type} cell ${cellName} is 100% opaque`);
        if (cellName === 'face')
          assert.ok(eyes >= 8, `${type} face cell has emissive glowing eyes (G=255)`);
        if (cellName === 'gore')
          assert.ok(gore >= 40, `${type} gore cell has arterial blood ramp (B=255)`);
      }

      // Verify mangled gore skin atlas for heavily wounded and dead monsters
      const goreAtlas = monsterGoreSkinAtlas(type);
      assert.equal(goreAtlas.width, MONSTER_SKIN_CELL * MONSTER_SKIN_FRAMES, `${type} gore skin atlas width is 256px`);
      assert.equal(goreAtlas.height, MONSTER_SKIN_CELL, `${type} gore skin atlas height is 32px`);
      let goreAtlasBlood = 0;
      let goreAtlasBone = 0;
      for (let i = 0; i < goreAtlas.data.length; i += 4) {
        if (goreAtlas.data[i + 3] === 0)
          continue;
        if (goreAtlas.data[i + 2] === 255)
          goreAtlasBlood++;
        if (goreAtlas.data[i] >= 180 && goreAtlas.data[i + 1] >= 165)
          goreAtlasBone++;
      }
      if (type !== 'wraith') {
        assert.ok(goreAtlasBlood >= 400, `${type} gore skin atlas is drenched in arterial blood (B=255)`);
        assert.ok(goreAtlasBone >= 100, `${type} gore skin atlas exposes shattered ribcage/spine bone`);
      }

      // Verify 3D anatomical part geometries and combined monsterMesh
      const parts = monsterParts(type);
      assert.ok(parts.pivots && parts.body && parts.head && parts.jaw && parts.goreViscera && parts.gorePool && Array.isArray(parts.goreChunks), `${type} has core 3D anatomical parts including goreViscera and goreChunks`);
      for (const [partName, geom] of Object.entries(parts)) {
        if (partName === 'pivots' || partName === 'goreChunks')
          continue;
        assert.ok(geom.vertices.length >= 36 * 3 && geom.vertices.length % 9 === 0, `${type}.${partName} has valid 3D triangle vertices`);
        assert.equal(geom.normals.length, geom.vertices.length, `${type}.${partName} has 3D vertex normals matching vertices`);
        assert.equal(geom.uvs.length, (geom.vertices.length / 3) * 2, `${type}.${partName} has 2D UVs matching vertices`);
      }
      const combined = monsterMesh(type);
      assert.ok(combined.vertices.length >= 180 * 3, `${type} combined 3D mesh has rich multi-prism geometry`);
      assert.equal(combined.normals.length, combined.vertices.length, `${type} combined 3D mesh has matching normals`);
      assert.equal(combined.uvs.length, (combined.vertices.length / 3) * 2, `${type} combined 3D mesh has matching UVs`);

      // Verify runtime buildMonster, animateMonster, and dieMonster scene-graph execution
      const addedMeshes = [];
      const texOptionsSeen = [];
      const mockWorld = {
        gl: { NEAREST: 9728 },
        scene: { addMesh: (m) => addedMeshes.push(m) },
        material: () => new Material(),
        monsterPartMesh: (geo) => {
          assert.ok(geo.vertices.length >= 36 * 3, `${type} part CustomMesh has vertices`);
          const m = new Mesh(null, new CustomMesh());
          m.setTexture = (_data, opts) => texOptionsSeen.push(opts);
          m.setCustomUniform = (name, val) => {
            m.customUniforms ??= {};
            m.customUniforms[name] = val;
          };
          return m;
        },
      };
      const enemy = {
        type,
        def: ENEMY_TYPES[type],
        hp: ENEMY_TYPES[type].hp,
        pos: new Vec2(100, 100),
        body: { velocity: new Vec2(40, 0) },
        state: 'chase',
        walk: 1.2,
        phase: 0.3,
        windup: 0.1,
        roar: 0,
        hurt: 0,
        pain: 0,
        leap: 0,
        deadTime: 0,
        gibbed: false,
        inSlime: false,
      };
      const view = MONSTERS[type].build(mockWorld, enemy);
      assert.ok(view.root instanceof Mesh, `${type} buildMonster creates a RoostR Mesh root`);
      assert.equal(addedMeshes.length, 1, `${type} buildMonster adds root to world scene`);
      assert.equal(view.meshes.length, 16, `${type} buildMonster creates 16 articulated sub-meshes including goreViscera and 6 goreChunks`);
      assert.equal(view.goreViscera.isActive(), false, `${type} goreViscera starts hidden while healthy`);
      assert.equal(view.gorePool.isActive(), false, `${type} gorePool starts hidden`);

      MONSTERS[type].animate(view, enemy, { time: 1.5, dt: 1 / 60, player: { pos: new Vec2(160, 100) } });
      assert.ok(Number.isFinite(view.yaw) && Number.isFinite(view.lift), `${type} animateMonster updates yaw and lift`);

      // Heavily wounded state swaps to gore skin and exposes 3D viscera without mipmap averaging
      enemy.hp = Math.floor(ENEMY_TYPES[type].hp * 0.4);
      MONSTERS[type].animate(view, enemy, { time: 1.6, dt: 1 / 60, player: { pos: new Vec2(160, 100) } });
      if (type !== 'wraith') {
        assert.equal(view.goreSkin, true, `${type} switches to gore skin when heavily wounded`);
        assert.equal(view.goreViscera.isActive(), true, `${type} exposes 3D goreViscera when heavily wounded`);
        assert.ok(texOptionsSeen.length >= 16, `${type} gore skin swap updates sub-mesh textures`);
        for (const opts of texOptionsSeen) {
          assert.equal(opts.minFilter, 9728, `${type} gore skin uses NEAREST minFilter so B=255 gore flag never mipmap-averages into pink`);
          assert.equal(Boolean(opts.generateMipmaps), false, `${type} gore skin disables mipmap generation`);
        }
      }

      enemy.deadTime = 0.25;
      MONSTERS[type].die(view, enemy);
      assert.equal(view.wasDead, true, `${type} dieMonster transitions view into multi-stage horrific death`);
      assert.equal(view.gorePool.isActive(), false, `${type} dieMonster keeps 3D floor gorePool inactive in favor of RoostR particle splats`);
      assert.equal(
        view.goreChunks.filter((c) => c.isActive()).length,
        type === 'wraith' ? 0 : 1,
        `${type} normal death activates subtle 3D goreChunks`
      );
      if (type !== 'wraith') {
        assert.equal(view.goreViscera.isActive(), true, `${type} dieMonster keeps 3D goreViscera active`);
        const severedParts = [view.head, view.jaw, view.leftArm, view.rightArm, view.extra].filter((p) => p && p.parent === view.root);
        assert.ok(severedParts.length >= 1, `${type} normal death severs at least one anatomical part into root space`);
      }

      enemy.gibbed = true;
      MONSTERS[type].die(view, enemy);
      assert.equal(view.wasDead, true, `${type} dieMonster supports close-range XDeath detonation`);
      assert.equal(view.gorePool.isActive(), false, `${type} XDeath keeps 3D floor gorePool inactive`);
      assert.equal(
        view.goreChunks.filter((c) => c.isActive()).length,
        2,
        `${type} XDeath activates 2 subtle 3D goreChunks`
      );
      if (type !== 'wraith') {
        assert.equal(view.head.parent, view.root, `${type} XDeath blasts head into root space`);
        assert.equal(view.leftArm.parent, view.root, `${type} XDeath blasts leftArm into root space`);
        assert.equal(view.rightArm.parent, view.root, `${type} XDeath blasts rightArm into root space`);
      }
    }
  },

  'blood quantity and pool size scale with enemy size'() {
    const measureKillBlood = (type) => {
      const game = fresh();
      clearEnemies(game);
      game.rand = Rand.create(2);
      game.blood.reset(game.level, game.rand);
      const pos = new Vec2(9 * 64 + 16, 3 * 64 + 32);
      game.addEnemy(type, pos);
      const enemy = game.enemies[0];
      game.player.body.setPosition(new Vec2(6 * 64, 3 * 64 + 32));
      game.blood.hit(pos.x, pos.y, 24, 1, 0, enemy.def.gore);
      const hitParticles = game.blood.particles.length;
      const hitSplatSize = game.blood.floor[0]?.size ?? 0;

      game.damageEnemy(enemy, enemy.hp);
      run(game, 2.5);
      const totalFloorArea = game.blood.floor.reduce((sum, s) => sum + s.size * s.size, 0);
      return { hitParticles, hitSplatSize, floorSplats: game.blood.floor.length, totalFloorArea };
    };

    const swarmer = measureKillBlood('swarmer');
    const imp = measureKillBlood('imp');
    const brute = measureKillBlood('brute');
    const boss = measureKillBlood('boss');

    assert.ok(swarmer.hitParticles < imp.hitParticles, 'swarmer hit sprays fewer blood droplets than imp');
    assert.ok(imp.hitParticles < brute.hitParticles, 'imp hit sprays fewer blood droplets than brute');
    assert.ok(brute.hitParticles < boss.hitParticles, 'brute hit sprays fewer blood droplets than boss');

    assert.ok(swarmer.hitSplatSize < imp.hitSplatSize, 'swarmer hit splat is smaller than imp');
    assert.ok(imp.hitSplatSize < brute.hitSplatSize, 'imp hit splat is smaller than brute');
    assert.ok(brute.hitSplatSize < boss.hitSplatSize, 'brute hit splat is smaller than boss');

    assert.ok(swarmer.totalFloorArea < imp.totalFloorArea * 0.5, 'swarmer death and corpse pool blood area is much smaller than imp');
    assert.ok(imp.totalFloorArea < brute.totalFloorArea, 'imp death and corpse pool blood area is smaller than brute');
    assert.ok(brute.totalFloorArea < boss.totalFloorArea, 'brute death and corpse pool blood area is smaller than boss');
  },

  'blood, gibs and footprints on acid dissolve instead of staying still'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);

    // Find a slime tile in E1M1
    const slimeIdx = game.level.slime.findIndex((v) => v === 1);
    assert.ok(slimeIdx >= 0, 'level has slime tiles');
    const sx = ((slimeIdx % game.level.width) + 0.5) * 64;
    const sy = (Math.floor(slimeIdx / game.level.width) + 0.5) * 64;
    assert.equal(game.level.slimeAt(sx, sy), true);

    // Also pick a regular dry floor tile
    const dryX = 2 * 64 + 32;
    const dryY = 2 * 64 + 32;
    assert.equal(game.level.slimeAt(dryX, dryY), false);

    game.blood.floorSplat(sx, sy, 8);
    game.blood.floorGib(sx, sy, 3.0, 0);
    game.blood.floorSplat(dryX, dryY, 8);
    game.blood.floorGib(dryX, dryY, 3.0, 1);

    assert.equal(game.blood.floor[0].dissolving, true, 'splat on acid is marked dissolving');
    assert.equal(game.blood.gibs[0].dissolving, true, 'gib on acid is marked dissolving');
    assert.ok(!game.blood.floor[1].dissolving, 'splat on dry deck is permanent');
    assert.ok(!game.blood.gibs[1].dissolving, 'gib on dry deck is permanent');

    const v0 = game.blood.version;
    run(game, 0.5);
    assert.ok(game.blood.version > v0, 'dissolving blood bumps splat version as it shrinks and drifts');
    assert.ok(game.blood.floor[0].size < 8, 'blood splat on acid shrinks as it dissolves');

    run(game, 4.0);
    assert.equal(game.blood.floor.length, 1, 'blood splat on acid dissolved completely while dry splat remained');
    assert.equal(game.blood.floor[0].x, dryX, 'remaining splat is the dry floor splat');
    assert.equal(game.blood.gibs.length, 1, 'gib on acid dissolved completely while dry gib remained');
  },

  '3D textured chainsaw viewmodel: procedural atlas, articulated chain loop parts, allocation-free pose, and HUD sprite suppression'() {
    const atlas = chainsawAtlas();
    assert.equal(atlas.width, ARSENAL_FRAMES * ARSENAL_CELL, 'chainsaw atlas width is 128px');
    assert.equal(atlas.height, ARSENAL_CELL, 'chainsaw atlas height is 32px');
    assert.equal(atlas.data.length, atlas.width * atlas.height * 4);
    for (let i = 3; i < atlas.data.length; i += 4)
      assert.equal(atlas.data[i], 255, 'chainsaw atlas pixels are opaque');

    const parts = chainsawParts();
    assert.equal(parts, chainsawParts(), 'chainsawParts is cached');
    for (const key of ['body', 'topChain', 'bottomChain', 'noseChain', 'hands']) {
      const part = parts[key];
      assert.ok(part.vertices instanceof Float32Array && part.vertices.length >= 36, `${key} has 3D triangle vertices`);
      assert.equal(part.normals.length, part.vertices.length, `${key} has matching 3D surface normals`);
      assert.equal(part.uvs.length, (part.vertices.length / 3) * 2, `${key} has matching UVs`);
    }
    assert.ok(parts.pivots.topChain instanceof Vec3, 'topChain pivot is a Vec3');
    assert.ok(parts.pivots.bottomChain instanceof Vec3, 'bottomChain pivot is a Vec3');
    assert.ok(parts.pivots.noseChain instanceof Vec3, 'noseChain pivot is a Vec3');
    assert.ok(parts.pivots.hands instanceof Vec3, 'hands pivot is a Vec3');
    assert.equal(parts.toothPitch, CHAINSAW_TOOTH_PITCH);

    // Verify WebGL UNPACK_FLIP_Y_WEBGL = true UV orientation:
    // Every vertex in `parts.hands` maps to rows y = 12..31 of cell 2 (leather glove, olive cuff, bare forearm skin),
    // never to the dark cast-iron cooling-fin rows y = 0..11.
    for (let i = 0; i < parts.hands.uvs.length; i += 2) {
      const v = parts.hands.uvs[i + 1];
      const webglRow = Math.floor((1 - v) * 32);
      assert.ok(
        webglRow >= 12 && webglRow < 32,
        `chainsaw hand UV v=${v.toFixed(3)} samples WebGL row ${webglRow} (expected leather/cuff/skin rows 12..31)`
      );
    }

    const combined = chainsawMesh();
    assert.equal(
      combined.vertices.length,
      parts.body.vertices.length + parts.topChain.vertices.length + parts.bottomChain.vertices.length + parts.noseChain.vertices.length,
      'chainsawMesh combines body and all three animated chain segments without disembodied player hands'
    );

    const target = chainsawPose({ time: 0.1, bob: 0.4, moving: 0.8, recoil: 0, switchOffset: 0, attacking: false });
    assert.ok(target.offset instanceof Vec3, 'pose offset is a Vec3');
    assert.ok(target.rotation instanceof Vec3, 'pose rotation is a Vec3');
    assert.ok(target.topChainPos instanceof Vec3, 'pose topChainPos is a Vec3');
    assert.ok(target.bottomChainPos instanceof Vec3, 'pose bottomChainPos is a Vec3');
    assert.ok(target.noseChainRot instanceof Vec3, 'pose noseChainRot is a Vec3');

    const idleZ = target.offset.z;
    const idleTopZ = target.topChainPos.z;
    const idleBottomZ = target.bottomChainPos.z;
    const reused = chainsawPose({ time: 0.25, bob: 0.4, moving: 0.8, recoil: 1, switchOffset: 0, attacking: true }, target);
    assert.equal(reused, target, 'chainsawPose reuses pre-allocated target');
    assert.ok(target.offset.z > idleZ + 1.0, 'attacking chainsaw thrusts forward');
    assert.notEqual(target.topChainPos.z, idleTopZ, 'top cutting chain advances over time');
    assert.notEqual(target.bottomChainPos.z, idleBottomZ, 'bottom return chain advances in opposite direction');
    assert.ok(target.noseChainRot.x > 0, 'nose sprocket wheel spins around X axis');

    // HUD suppresses 2D weapon sprite quad when chainsaw is equipped, while still drawing 2D sprites for other weapons
    const quadCalls = [];
    const fakeHud = Object.create(Hud.prototype);
    fakeHud.width = 1280;
    fakeHud.height = 720;
    fakeHud.overlay = {
      crisp: {
        weapon: {
          quad: (...args) => quadCalls.push(args),
        },
      },
    };
    const game = fresh();
    game.player.weapon = 'chainsaw';
    fakeHud.drawWeapon(game);
    assert.equal(quadCalls.length, 0, 'Hud.drawWeapon skips 2D sprite quad when chainsaw is equipped');

    game.player.weapon = 'chaingun';
    fakeHud.drawWeapon(game);
    assert.equal(quadCalls.length, 0, 'Hud.drawWeapon skips 2D sprite quad when chaingun is equipped');

    const cgParts = chaingunParts();
    assert.equal(cgParts, chaingunParts(), 'chaingunParts is cached');
    for (const key of ['body', 'rotor', 'hands']) {
      const part = cgParts[key];
      assert.ok(part.vertices instanceof Float32Array && part.vertices.length >= 36, `chaingun ${key} has 3D triangle vertices`);
      assert.equal(part.normals.length, part.vertices.length, `chaingun ${key} has matching 3D surface normals`);
      assert.equal(part.uvs.length, (part.vertices.length / 3) * 2, `chaingun ${key} has matching UVs`);
    }
    for (let i = 1; i < cgParts.hands.uvs.length; i += 2) {
      const row = Math.floor((1 - cgParts.hands.uvs[i]) * 31.999);
      assert.ok(
        row >= 12 && row < 32,
        `chaingun hands UV v=${cgParts.hands.uvs[i].toFixed(3)} maps to WebGL-flipped glove/cuff/arm rows 12..31 (got row ${row})`
      );
    }
    assert.ok(cgParts.pivots.rotor instanceof Vec3, 'chaingun rotor pivot is a Vec3');
    assert.ok(cgParts.pivots.hands instanceof Vec3, 'chaingun hands pivot is a Vec3');
    const cgCombined = chaingunMesh();
    assert.equal(
      cgCombined.vertices.length,
      cgParts.body.vertices.length + cgParts.rotor.vertices.length,
      'chaingunMesh combines body and 6-barrel rotor assembly without disembodied hands'
    );
    const cgTarget = chaingunPose({ time: 0.2, bob: 0.3, moving: 0.5, recoil: 0, switchOffset: 0, attacking: false, spinDown: 0 });
    assert.ok(cgTarget.offset instanceof Vec3, 'chaingunPose offset is a Vec3');
    assert.ok(cgTarget.rotation instanceof Vec3, 'chaingunPose rotation is a Vec3');
    assert.ok(cgTarget.rotorRot instanceof Vec3, 'chaingunPose rotorRot is a Vec3');
    assert.ok(cgTarget.offset.y < -11.2, 'chaingun sits low near the bottom of the screen');
    assert.ok(cgTarget.offset.z > 13.5, 'chaingun sits far enough forward for a compact screen footprint');
    assert.ok(cgTarget.rotation.x > 0.04, 'chaingun barrels are pitched horizontally toward enemies');
    assert.equal(cgTarget.rotorRot.z, 0, 'idle chaingun rotor does not spin');
    const cgIdleForward = cgTarget.offset.z;
    const cgReused = chaingunPose({ time: 0.2, bob: 0.3, moving: 0.5, recoil: 0.8, switchOffset: 0, attacking: true, spinDown: 0.4 }, cgTarget);
    assert.equal(cgReused, cgTarget, 'chaingunPose reuses pre-allocated target');
    assert.ok(cgTarget.rotorRot.z > 0, 'firing chaingun spins 6-barrel rotor around Z axis');
    assert.ok(cgTarget.offset.z < cgIdleForward, 'firing chaingun kicks back along Z');

    game.player.weapon = 'shotgun';
    fakeHud.drawWeapon(game);
    assert.equal(quadCalls.length, 0, 'Hud.drawWeapon skips 2D sprite quad when shotgun is equipped');

    const sgAtlas = shotgunAtlas();
    assert.equal(sgAtlas, shotgunAtlas(), 'shotgunAtlas is cached');
    const sgParts = shotgunParts();
    assert.equal(sgParts, shotgunParts(), 'shotgunParts is cached');
    for (const key of ['body', 'pump', 'arm', 'shell']) {
      const part = sgParts[key];
      assert.ok(part.vertices instanceof Float32Array && part.vertices.length >= 36, `shotgun ${key} has 3D triangle vertices`);
      assert.equal(part.normals.length, part.vertices.length, `shotgun ${key} has matching 3D surface normals`);
      assert.equal(part.uvs.length, (part.vertices.length / 3) * 2, `shotgun ${key} has matching UVs`);
    }
    assert.ok(sgParts.pivots.pump instanceof Vec3, 'shotgun pump pivot is a Vec3');
    assert.ok(sgParts.pivots.arm instanceof Vec3, 'shotgun arm pivot is a Vec3');
    assert.ok(sgParts.pivots.shell instanceof Vec3, 'shotgun shell pivot is a Vec3');
    const sgCombined = shotgunMesh();
    assert.equal(
      sgCombined.vertices.length,
      sgParts.body.vertices.length + sgParts.pump.vertices.length + sgParts.shell.vertices.length,
      'shotgunMesh combines receiver/barrel body, pump forend, and shell without disembodied player arm'
    );

    const sgTarget = shotgunPose({ time: 0.2, bob: 0.3, moving: 0.5, recoil: 0, switchOffset: 0, elapsed: -1, hasAmmo: true });
    assert.ok(sgTarget.offset instanceof Vec3, 'shotgunPose offset is a Vec3');
    assert.ok(sgTarget.rotation instanceof Vec3, 'shotgunPose rotation is a Vec3');
    assert.ok(sgTarget.pumpPos instanceof Vec3, 'shotgunPose pumpPos is a Vec3');
    assert.ok(sgTarget.armPos instanceof Vec3, 'shotgunPose armPos is a Vec3');
    assert.ok(sgTarget.armRot instanceof Vec3, 'shotgunPose armRot is a Vec3');
    assert.ok(sgTarget.shellPos instanceof Vec3, 'shotgunPose shellPos is a Vec3');
    assert.ok(sgTarget.shellRot instanceof Vec3, 'shotgunPose shellRot is a Vec3');
    assert.ok(sgTarget.offset.y < -6.5, 'shotgun sits low near the bottom of the screen');
    assert.ok(sgTarget.rotation.x > 0.05, 'shotgun barrel is pitched horizontally toward enemies');
    const sgIdleForward = sgTarget.offset.z;
    const sgIdlePumpZ = sgTarget.pumpPos.z;
    assert.equal(sgIdlePumpZ, sgParts.pivots.pump.z, 'idle shotgun pump forend rests at forward battery position');
    assert.ok(sgTarget.armPos.y < sgParts.pivots.arm.y - 8.0, 'idle shotgun left hand and forearm are stowed below the viewport');

    // Blast recoil kickback right after firing
    const sgBlast = shotgunPose({ time: 0.2, bob: 0.3, moving: 0.5, recoil: 0.9, switchOffset: 0, elapsed: 0.04, hasAmmo: true }, sgTarget);
    assert.equal(sgBlast, sgTarget, 'shotgunPose reuses pre-allocated target');
    assert.ok(sgTarget.offset.z < sgIdleForward, 'firing shotgun kicks back along Z');

    // Sweep through all phases of the pump reload cycle (reach, raise, rack back, hold, rack forward, lower)
    for (const e of [0.2, 0.28, 0.46, 0.58, 0.72, 0.82, 0.91, 1.02]) {
      shotgunPose({ time: e, bob: 0.3, moving: 0.5, recoil: 0.2, switchOffset: 0, elapsed: e, hasAmmo: true }, sgTarget);
      assert.ok(
        Number.isFinite(sgTarget.offset.y) && Number.isFinite(sgTarget.pumpPos.z) && Number.isFinite(sgTarget.armPos.z),
        `shotgunPose produces finite transforms at elapsed=${e}`
      );
    }

    // Mid-pump reload animation (left hand & forearm gripped onto the forend, forend racked back, spent shell ejecting right)
    shotgunPose({ time: 0.55, bob: 0.3, moving: 0.5, recoil: 0.2, switchOffset: 0, elapsed: 0.58, hasAmmo: true }, sgTarget);
    assert.ok(sgTarget.pumpPos.z < sgIdlePumpZ - 3.0, 'pump reload racks forend backward along the magazine tube');
    assert.equal(sgTarget.armPos.y, sgParts.pivots.arm.y, 'player left hand and forearm reach up onto the pump forend during reload');
    assert.equal(sgTarget.armPos.z, sgTarget.pumpPos.z, 'player left hand and forearm slide back in lockstep with the pump forend');
    assert.ok(sgTarget.shellPos.x > sgParts.pivots.shell.x + 2.0, 'pump reload ejects spent 12-gauge shell outward from right-side receiver port');
    assert.ok(Math.abs(sgTarget.shellRot.x) > 0.5, 'ejected shell tumbles in mid-air');

    // Empty shotgun does not run pump reload animation after firing last shell
    shotgunPose({ time: 0.55, bob: 0.3, moving: 0.5, recoil: 0.2, switchOffset: 0, elapsed: 0.58, hasAmmo: false }, sgTarget);
    assert.equal(sgTarget.pumpPos.z, sgIdlePumpZ, 'shotgun does not rack pump forend when out of shells');
    assert.ok(sgTarget.armPos.y < sgParts.pivots.arm.y - 8.0, 'player left arm stays stowed when shotgun is out of shells');

    game.player.weapon = 'rocket';
    fakeHud.drawWeapon(game);
    assert.equal(quadCalls.length, 0, 'Hud.drawWeapon skips 2D sprite quad when rocket launcher is equipped');

    const rlAtlas = rocketLauncherAtlas();
    assert.equal(rlAtlas, rocketLauncherAtlas(), 'rocketLauncherAtlas is cached');
    const rlParts = rocketLauncherParts();
    assert.equal(rlParts, rocketLauncherParts(), 'rocketLauncherParts is cached');
    for (const key of ['body', 'warhead']) {
      const part = rlParts[key];
      assert.ok(part.vertices instanceof Float32Array && part.vertices.length >= 36, `rocketLauncher ${key} has 3D triangle vertices`);
      assert.equal(part.normals.length, part.vertices.length, `rocketLauncher ${key} has matching 3D surface normals`);
      assert.equal(part.uvs.length, (part.vertices.length / 3) * 2, `rocketLauncher ${key} has matching UVs`);
      let minY = Infinity;
      let maxY = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (let i = 0; i < part.vertices.length; i += 3) {
        if (part.vertices[i + 1] < minY) minY = part.vertices[i + 1];
        if (part.vertices[i + 1] > maxY) maxY = part.vertices[i + 1];
        if (part.vertices[i + 2] < minZ) minZ = part.vertices[i + 2];
        if (part.vertices[i + 2] > maxZ) maxZ = part.vertices[i + 2];
      }
      assert.ok(maxZ - minZ > (maxY - minY) * 1.6, `rocketLauncher ${key} is elongated horizontally along the Z launch axis`);
    }
    assert.ok(rlParts.pivots.warhead instanceof Vec3, 'rocketLauncher warhead pivot is a Vec3');
    const rlCombined = rocketLauncherMesh();
    assert.equal(
      rlCombined.vertices.length,
      rlParts.body.vertices.length + rlParts.warhead.vertices.length,
      'rocketLauncherMesh combines body and loaded warhead assembly'
    );

    const rlTarget = rocketLauncherPose({ time: 0.2, bob: 0.3, moving: 0.5, recoil: 0, switchOffset: 0, elapsed: -1, hasAmmo: true });
    assert.ok(rlTarget.offset instanceof Vec3, 'rocketLauncherPose offset is a Vec3');
    assert.ok(rlTarget.rotation instanceof Vec3, 'rocketLauncherPose rotation is a Vec3');
    assert.ok(rlTarget.warheadPos instanceof Vec3, 'rocketLauncherPose warheadPos is a Vec3');
    const rlIdleForward = rlTarget.offset.z;
    const rlIdleWarheadZ = rlTarget.warheadPos.z;
    assert.equal(rlIdleWarheadZ, rlParts.pivots.warhead.z, 'idle rocket launcher warhead rests seated inside the front muzzle');

    // Heavy backblast recoil and warhead launch right after firing
    const rlLaunch = rocketLauncherPose({ time: 0.2, bob: 0.3, moving: 0.5, recoil: 0.9, switchOffset: 0, elapsed: 0.06, hasAmmo: true }, rlTarget);
    assert.equal(rlLaunch, rlTarget, 'rocketLauncherPose reuses pre-allocated target');
    assert.ok(rlTarget.offset.z < rlIdleForward - 2.0, 'firing rocket launcher kicks back strongly along Z');
    assert.ok(rlTarget.warheadPos.z > rlIdleWarheadZ + 4.0, 'fired rocket warhead streaks forward out of the muzzle');

    // Breech auto-loader feeds fresh rocket warhead forward along the tube
    for (const e of [0.18, 0.35, 0.62, 0.68, 0.76]) {
      rocketLauncherPose({ time: e, bob: 0.3, moving: 0.5, recoil: 0.1, switchOffset: 0, elapsed: e, hasAmmo: true }, rlTarget);
      assert.ok(Number.isFinite(rlTarget.offset.z) && Number.isFinite(rlTarget.warheadPos.z), `rocketLauncherPose produces finite transforms at elapsed=${e}`);
    }
    rocketLauncherPose({ time: 0.5, bob: 0.3, moving: 0.5, recoil: 0.1, switchOffset: 0, elapsed: 0.35, hasAmmo: true }, rlTarget);
    assert.ok(rlTarget.warheadPos.z < rlIdleWarheadZ - 2.0, 'auto-loader slides fresh rocket warhead forward from the rear breech');

    // Empty rocket launcher leaves tube empty (warhead retracted inside tube)
    rocketLauncherPose({ time: 0.5, bob: 0.3, moving: 0.5, recoil: 0, switchOffset: 0, elapsed: -1, hasAmmo: false }, rlTarget);
    assert.ok(rlTarget.warheadPos.z < rlIdleWarheadZ - 8.0, 'rocket launcher keeps warhead retracted when out of rockets');
  },

  'classic Doom separate ammo pools: shells, bullets, and rockets have independent pools, 3D pickup meshes, and HUD tally'() {
    assert.equal(WEAPONS.chainsaw.ammoType, null, 'chainsaw uses no ammo pool');
    assert.equal(WEAPONS.shotgun.ammoType, 'shells', 'shotgun uses shells');
    assert.equal(WEAPONS.chaingun.ammoType, 'bullets', 'chaingun uses bullets');
    assert.equal(WEAPONS.rocket.ammoType, 'rockets', 'rocket launcher uses rockets');

    for (const [name, makeAtlas, makeMesh] of [
      ['bullets', bulletAtlas, bulletMesh],
      ['rockets', rocketAmmoAtlas, rocketAmmoMesh],
    ]) {
      const atlas = makeAtlas();
      assert.equal(atlas.width, 128, `${name} atlas width is 128`);
      assert.equal(atlas.height, AMMO_CELL, `${name} atlas height is 32`);
      const mesh = makeMesh();
      assert.ok(mesh.vertices.length > 0 && mesh.vertices.length % 3 === 0, `${name} mesh has valid triangle vertices`);
      assert.equal(mesh.uvs.length, (mesh.vertices.length / 3) * 2, `${name} mesh has matching UVs`);
    }

    const game = fresh();
    assert.equal(game.player.shells, 24, 'player starts with 24 shells');
    assert.equal(game.player.bullets, 50, 'player starts with 50 bullets');
    assert.equal(game.player.rockets, 0, 'player starts with 0 rockets');

    // Firing shotgun only drains shells, leaving bullets and rockets untouched
    game.player.weapons.chaingun = true;
    game.player.weapons.rocket = true;
    game.player.rockets = 6;
    game.player.weapon = 'shotgun';
    game.player.cooldown = 0;
    game.fire();
    assert.equal(game.player.shells, 23, 'shotgun drains 1 shell');
    assert.equal(game.player.bullets, 50, 'shotgun does not drain bullets');
    assert.equal(game.player.rockets, 6, 'shotgun does not drain rockets');

    // Firing chaingun only drains bullets
    game.player.weapon = 'chaingun';
    game.player.cooldown = 0;
    game.fire();
    assert.equal(game.player.shells, 23, 'chaingun does not drain shells');
    assert.equal(game.player.bullets, 49, 'chaingun drains 1 bullet');
    assert.equal(game.player.rockets, 6, 'chaingun does not drain rockets');

    // Firing rocket launcher only drains rockets
    game.player.weapon = 'rocket';
    game.player.cooldown = 0;
    game.fire();
    assert.equal(game.player.shells, 23, 'rocket launcher does not drain shells');
    assert.equal(game.player.bullets, 49, 'rocket launcher does not drain bullets');
    assert.equal(game.player.rockets, 5, 'rocket launcher drains 1 rocket');

    // Bullet and rocket pickups replenish their respective pools up to max
    const bulletPickup = game.addPickup('bullets', new Vec2(128, 128));
    game.touch(bulletPickup.body);
    assert.equal(game.player.bullets, 49 + AMMO_TYPES.bullets.bonus, 'bullet box adds 20 bullets');

    const rocketPickup = game.addPickup('rockets', new Vec2(192, 128));
    game.touch(rocketPickup.body);
    assert.equal(game.player.rockets, 5 + AMMO_TYPES.rockets.bonus, 'rocket crate adds 5 rockets');

    // HUD drawAmmo renders active pool and 3-row tally
    const labels = [];
    const fakeHud = Object.create(Hud.prototype);
    fakeHud.text = (str) => labels.push(str);
    fakeHud.drawAmmo(900, 560, game.player, WEAPONS.rocket);
    assert.ok(labels.includes('ROCKETS'), 'HUD shows active ROCKETS label');
    assert.ok(labels.includes('BUL') && labels.includes('SHL') && labels.includes('RKT'), 'HUD shows 3-pool tally');
  },

  'localized dismemberment: shoulder hits sever arms, leg hits explode legs and force foes to crawl while continuing to attack'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);

    // Place player at (192, 192) facing +X (angle = 0) and a brute at (280, 192) facing player (-X)
    game.player.body.setPosition(new Vec2(192, 192));
    game.player.angle = 0;
    const brute = game.addEnemy('brute', new Vec2(280, 192));
    assert.equal(brute.limbs.leftArm, true, 'brute starts with intact leftArm');
    assert.equal(brute.limbs.rightArm, true, 'brute starts with intact rightArm');
    assert.equal(brute.limbs.leftLeg, true, 'brute starts with intact leftLeg');
    assert.equal(brute.limbs.rightLeg, true, 'brute starts with intact rightLeg');
    assert.equal(brute.crawling, false, 'brute starts standing');

    // Mid-close hits (140..240 units) apply reduced limb trauma, while hits >= 240 units apply 0
    const midBrute = game.addEnemy('brute', new Vec2(382, 192)); // dist = 190 -> falloff = 0.5, scale = 0.25
    assert.equal(game.hitEnemyLimb(midBrute, new Vec2(382, 186), 30, 1, 0, 6), false, 'fresh limb is not severed in one hit at mid-close range');
    const midTarget = midBrute.limbs.sideTarget?.left;
    assert.ok((midTarget === 'leftArm' || midTarget === 'leftLeg') && midBrute.limbs.damage[midTarget] > 0 && midBrute.limbs.damage[midTarget] < 6, 'mid-close left-side hit accumulates reduced trauma on leftArm or leftLeg');
    const farBrute = game.addEnemy('brute', new Vec2(450, 192)); // dist = 258 >= 240
    assert.equal(game.hitEnemyLimb(farBrute, new Vec2(450, 186), 30, 1, 0, 10), false, 'shots beyond 240 units do not dismember');
    assert.equal(Object.values(farBrute.limbs.damage).reduce((a, b) => a + b, 0), 0, 'shots beyond 240 units deal 0 limb trauma');

    // Verify left/right aim strictly respects the struck side while randomly picking arm vs leg on that side
    const leftSevered = new Set();
    const rightSevered = new Set();
    for (let i = 0; i < 20; i++) {
      const dummyL = game.addEnemy('brute', new Vec2(260, 192));
      game.hitEnemyLimb(dummyL, new Vec2(260, 184), 30, 1, 0, 10); // monster's left side (y < 192)
      for (const l of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg']) {
        if (!dummyL.limbs[l])
          leftSevered.add(l);
      }
      const dummyR = game.addEnemy('brute', new Vec2(260, 192));
      game.hitEnemyLimb(dummyR, new Vec2(260, 200), 30, 1, 0, 10); // monster's right side (y > 192)
      for (const l of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg']) {
        if (!dummyR.limbs[l])
          rightSevered.add(l);
      }
      for (const d of [dummyL, dummyR]) {
        game.scene.removeBody(d.body);
        game.enemies.splice(game.enemies.indexOf(d), 1);
      }
    }
    assert.ok(leftSevered.has('leftArm') && leftSevered.has('leftLeg'), 'aiming left randomly severs leftArm or leftLeg');
    assert.ok(!leftSevered.has('rightArm') && !leftSevered.has('rightLeg'), 'aiming left never severs right-side limbs');
    assert.ok(rightSevered.has('rightArm') && rightSevered.has('rightLeg'), 'aiming right randomly severs rightArm or rightLeg');
    assert.ok(!rightSevered.has('leftArm') && !rightSevered.has('leftLeg'), 'aiming right never severs left-side limbs');
    game.blood.reset(game.level, game.rand);

    // Hit the brute's left side (severs leftArm) and right side (severs rightLeg) to verify gore and crawling
    brute.limbs.sideTarget = { left: 'leftArm', right: 'rightLeg' };
    const leftHit = new Vec2(280, 186);
    game.hitEnemyLimb(brute, leftHit, 30, 1, 0, 6);
    assert.equal(brute.limbs.leftArm, false, 'left-side hit severs leftArm');
    assert.equal(brute.crawling, false, 'losing an arm does not make the foe crawl');
    assert.ok(game.blood.gibs.length >= 1, 'severing an arm spawns a fallen limb gib on the floor');
    const armDrops = game.blood.particles.filter((p) => !p.gib).length;
    const armGibs = game.blood.particles.filter((p) => p.gib).length;
    assert.ok(armDrops >= 24 && armGibs >= 4, 'severing an arm erupts in a full burst of blood and flying meat chunks');

    const prevParticles = game.blood.particles.length;
    const rightHit = new Vec2(280, 198);
    game.hitEnemyLimb(brute, rightHit, 18, 1, 0, 6);
    assert.equal(brute.limbs.rightLeg, false, 'right-side hit explodes rightLeg');
    assert.equal(brute.crawling, true, 'losing a leg forces a non-flying foe to crawl');
    const legParticles = game.blood.particles.slice(prevParticles);
    assert.equal(legParticles.filter((p) => !p.gib).length, armDrops, 'leg explosion spawns the same full blood burst as arm dismemberment');
    assert.equal(legParticles.filter((p) => p.gib).length, armGibs, 'leg explosion spawns the same flying meat chunk burst as arm dismemberment');

    // Dismemberment cap applies per foe: at most 1 limb per foe per shot, but multiple foes can each lose 1 limb in a single shot
    const targetA = game.addEnemy('boss', new Vec2(240, 172));
    const targetB = game.addEnemy('boss', new Vec2(240, 212));
    for (const t of [targetA, targetB]) {
      t.limbs.damage.leftArm = 999;
      t.limbs.damage.rightArm = 999;
      t.limbs.damage.leftLeg = 999;
      t.limbs.damage.rightLeg = 999;
    }
    game.inShot = true;
    targetA.limbs.severedThisShot = false;
    targetB.limbs.severedThisShot = false;
    assert.equal(game.hitEnemyLimb(targetA, new Vec2(240, 162), 30, 1, 0, 3), true, 'first foe loses 1 limb in the shot');
    assert.equal(game.hitEnemyLimb(targetA, new Vec2(240, 182), 30, 1, 0, 3), false, 'same foe cannot lose a second limb in the same shot');
    assert.equal(game.hitEnemyLimb(targetB, new Vec2(240, 202), 30, 1, 0, 3), true, 'second foe can still lose 1 limb in the same shot');
    assert.equal(game.hitEnemyLimb(targetB, new Vec2(240, 222), 30, 1, 0, 3), false, 'second foe also cannot lose a second limb in the same shot');
    game.inShot = false;
    for (const temp of [targetA, targetB, midBrute, farBrute]) {
      game.scene.removeBody(temp.body);
      game.enemies.splice(game.enemies.indexOf(temp), 1);
    }

    // Verify crawling foe moves slower than an intact foe but still chases and attacks the player
    const intactBrute = game.addEnemy('brute', new Vec2(280, 230));
    brute.state = 'chase';
    brute.pain = 0;
    intactBrute.state = 'chase';
    game.updateEnemy(brute, 1 / 60);
    game.updateEnemy(intactBrute, 1 / 60);
    const crawlSpeed = Math.hypot(brute.body.velocity.x, brute.body.velocity.y);
    const intactSpeed = Math.hypot(intactBrute.body.velocity.x, intactBrute.body.velocity.y);
    assert.ok(crawlSpeed > 0 && crawlSpeed < intactSpeed * 0.6, 'crawling foe drags itself forward at reduced speed');

    // Move crawling brute into attack range and verify it still winds up and attacks with its remaining limb/jaws
    brute.body.setPosition(new Vec2(224, 192));
    brute.pos = brute.body.position;
    brute.cooldown = 0;
    brute.roar = 0;
    game.updateEnemy(brute, 1 / 60);
    assert.ok(brute.windup > 0, 'dismembered crawling foe still initiates attacks');

    // Verify 3D monster view animates falling severed arm, exploded leg stump + chunks, and low crawling posture
    const mockWorld = {
      gl: null,
      scene: { addMesh: () => {} },
      material: () => new Material(),
      monsterPartMesh: () => {
        const m = new Mesh(null, new CustomMesh());
        m.setCustomUniform = () => {};
        return m;
      },
    };
    const view = MONSTERS.brute.build(mockWorld, brute);
    const standY = view.parts.pivots.body.y;

    // Immediately after dismemberment (t = severedAt + 0.1s), leftArm detaches into root space to fall to the floor,
    // rightLeg is scaled to a hip stump, goreChunks burst from the hip, and body drops into crawling posture
    MONSTERS.brute.animate(view, brute, { time: brute.limbs.severedAt.leftArm + 0.1, dt: 1 / 60, player: game.player });
    assert.equal(view.leftArm.parent, view.root, 'severed arm detaches into root space while falling to the floor');
    assert.ok(view.rightLeg.scale.y < 0.3, 'exploded leg scales down to a shattered hip stump');
    assert.ok(view.body.position.y < standY * 0.5, 'crawling monster drops its torso close to the floor');
    assert.ok(view.body.rotation.x > 0.8, 'crawling monster pitches torso forward onto the deck');
    assert.equal(view.goreChunks.filter((c) => c.isActive()).length, 2, 'leg explosion bursts 2 3D meat chunks from the hip');

    // After the arm finishes falling (t = severedAt + 0.7s), leftArm becomes a bloody shoulder stump on the body
    MONSTERS.brute.animate(view, brute, { time: brute.limbs.severedAt.leftArm + 0.7, dt: 1 / 60, player: game.player });
    assert.equal(view.leftArm.parent, view.body, 'after falling, shoulder mesh reattaches as a bloody shoulder stump');
    assert.ok(view.leftArm.scale.y < 0.25, 'missing arm remains scaled down as a shoulder stump');
  },

  'level 1 opening progression: start with 3D combat knife and zero ammo, pick up floor shotgun with 0 ammo then ammo/bullet packs in room 1, and find hidden chainsaw in top-right secret room'() {
    // 1. Verify 3D combat knife atlas, parts, mesh, and allocation-free pose
    const kAtlas = knifeAtlas();
    assert.equal(kAtlas.width, ARSENAL_CELL * ARSENAL_FRAMES);
    assert.equal(kAtlas.height, ARSENAL_CELL);
    const kParts = knifeParts();
    assert.ok(kParts.body.vertices.length >= 180, '3D knife viewmodel has blade, crossguard, grip, gloved hand, and forearm');
    const kMesh = knifeMesh();
    assert.equal(kMesh.vertices.length / 3, kMesh.uvs.length / 2);
    const targetPose = { offset: new Vec3(), rotation: new Vec3() };
    const idlePose = knifePose({ time: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0, elapsed: -1 }, targetPose);
    assert.equal(idlePose, targetPose, 'knifePose reuses pre-allocated target');
    assert.ok(idlePose.offset.y < -5.0, 'knife sits low on the screen near the bottom-right viewport edge');
    assert.ok(idlePose.rotation.x < -0.45, 'knife blade pitches upward in first-person view');
    const idleX = idlePose.offset.x;
    const idleY = idlePose.offset.y;
    const idleZ = idlePose.offset.z;

    // Verify vertical, horizontal, and diagonal knife attack trajectories
    assert.deepEqual(KNIFE_ATTACKS, ['vertical', 'horizontal', 'diagonal']);
    const vertPose = knifePose({ time: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0, elapsed: 0.08, attack: 'vertical' });
    const horizPose = knifePose({ time: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0, elapsed: 0.08, attack: 'horizontal' });
    const diagPose = knifePose({ time: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0, elapsed: 0.08, attack: 'diagonal' });
    for (const [label, p] of [
      ['vertical', vertPose],
      ['horizontal', horizPose],
      ['diagonal', diagPose],
    ]) {
      assert.ok(p.offset.z > idleZ + 4, `${label} knife slash thrusts forward into the target`);
      assert.ok(p.rotation.x < -0.25, `${label} knife remains pointed upward during slash lunge`);
    }
    assert.ok(Math.abs(vertPose.offset.y - idleY) > Math.abs(vertPose.offset.x - idleX) * 4, 'vertical attack moves predominantly along the vertical axis');
    assert.ok(Math.abs(horizPose.offset.x - idleX) > Math.abs(horizPose.offset.y - idleY) * 8, 'horizontal attack slashes wide along the horizontal axis');
    assert.ok(Math.abs(diagPose.offset.x - idleX) > 1.5 && Math.abs(diagPose.offset.y - idleY) > 1.2, 'diagonal attack slashes diagonally across both horizontal and vertical axes');

    // Verify 3D floor pickup meshes for shotgun and chainsaw sit cleanly above the floor (minY >= 2)
    for (const [label, mesh] of [
      ['shotgun', shotgunMesh()],
      ['chainsaw', chainsawMesh()],
    ]) {
      let minY = Infinity;
      for (let i = 1; i < mesh.vertices.length; i += 3)
        if (mesh.vertices[i] < minY)
          minY = mesh.vertices[i];
      assert.ok(minY >= 2, `${label} 3D floor pickup mesh sits above floor level (minY=${minY.toFixed(2)})`);
    }

    // 2. Starting a fresh game begins in Room 1 of Level 1 holding the knife with 0 ammo
    const game = new Game();
    game.state = 'play';
    clearEnemies(game);
    assert.equal(game.player.weapon, 'knife', 'player starts Level 1 holding the combat knife');
    assert.equal(game.player.weapons.knife, true, 'knife is owned at start');
    assert.equal(game.player.weapons.shotgun, false, 'shotgun is not owned at start');
    assert.equal(game.player.weapons.chainsaw, false, 'chainsaw is not owned at start');
    assert.equal(game.player.shells, 0, 'player starts with 0 shells');
    assert.equal(game.player.bullets, 0, 'player starts with 0 bullets');
    assert.equal(game.player.rockets, 0, 'player starts with 0 rockets');

    // Knife attacks emit a whoosh sound ('knife'), cycle through vertical/horizontal/diagonal movements, work at close range with zero ammo cost, and leave no traces on walls
    assert.equal(typeof RECIPES.knife, 'function', 'knife whoosh audio recipe exists');
    const imp = game.addEnemy('imp', new Vec2(game.player.pos.x + 28, game.player.pos.y));
    const startHp = imp.hp;
    game.events.length = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.equal(imp.hp, startHp - WEAPONS.knife.damage, 'knife melee slash damages close enemy with 0 ammo');
    assert.equal(game.player.knifeAttack, 'vertical', 'first knife swing performs a vertical attack');
    assert.ok(game.events.some((e) => e.type === 'knife' && e.attack === 'vertical'), 'knife swing emits a whoosh sound event');
    game.scene.removeBody(imp.body);
    game.enemies.pop();
    game.player.cooldown = 0;

    // Slashing a wall with the knife advances to horizontal attack, emits whoosh, and leaves no trace on the wall
    const savedX = game.player.pos.x;
    const savedY = game.player.pos.y;
    const savedAngle = game.player.angle;
    game.player.pos.setScalar(80, 96);
    game.player.body.setPosition(game.player.pos);
    game.player.angle = Math.PI;
    game.events.length = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.equal(game.player.knifeAttack, 'horizontal', 'second knife swing performs a horizontal attack');
    assert.ok(game.events.some((e) => e.type === 'knife' && e.attack === 'horizontal'), 'second knife swing emits whoosh sound');
    assert.equal(game.blood.holes.length, 0, 'knife does not leave traces on walls');
    game.player.pos.setScalar(savedX, savedY);
    game.player.body.setPosition(game.player.pos);
    game.player.angle = savedAngle;
    game.player.cooldown = 0;

    // Third knife swing advances to diagonal attack and emits whoosh even in open air
    game.events.length = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.equal(game.player.knifeAttack, 'diagonal', 'third knife swing performs a diagonal attack');
    assert.ok(game.events.some((e) => e.type === 'knife' && e.attack === 'diagonal'), 'open-air knife swing emits whoosh sound');
    game.player.cooldown = 0;

    // 3. Opening entry (cols 1..6, rows 1..4) has the shotgun on the floor followed by 2 shotgun shell packs (no chaingun bullet pack)
    const room1Pickups = game.pickups.filter((p) => p.pos.x < 7 * 64 && p.pos.y < 5 * 64);
    const floorShotgun = room1Pickups.find((p) => p.type === 'shotgun');
    const floorShellPacks = room1Pickups.filter((p) => p.type === 'ammo');
    const floorBullets = room1Pickups.find((p) => p.type === 'bullets');
    assert.ok(floorShotgun, 'shotgun pickup is on the floor in the first room of Level 1');
    assert.equal(floorShellPacks.length, 3, 'three shotgun ammo pickups are on the floor in the opening of Level 1');
    assert.equal(floorBullets, undefined, 'no chaingun bullet pack in the first room of Level 1');

    // Walk over the floor shotgun: unlocks and equips shotgun with ZERO ammo
    game.touch(floorShotgun.body);
    assert.equal(game.player.weapons.shotgun, true, 'picking up floor shotgun unlocks shotgun');
    assert.equal(game.player.weapon, 'shotgun', 'picking up floor shotgun auto-equips shotgun');
    assert.equal(game.player.shells, 0, 'picking up the first shotgun grants 0 ammo');
    assert.equal(game.player.bullets, 0, 'bullets remain 0');

    // Attempting to fire the shotgun with 0 ammo dry-fires
    game.player.cooldown = 0;
    game.events.length = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.equal(game.player.dryFire, true, 'shotgun with 0 ammo dry-fires');
    assert.ok(game.events.some((e) => e.type === 'dry'), 'dry-firing emits dry click');

    // Then pick up the 2 shotgun ammo packs in the first room
    game.touch(floorShellPacks[0].body);
    assert.equal(game.player.shells, AMMO_TYPES.shells.bonus, 'first ammo pack loads shotgun shells');
    game.touch(floorShellPacks[1].body);
    assert.equal(game.player.shells, AMMO_TYPES.shells.bonus * 2, 'second ammo pack adds another crate of shotgun shells');

    // 4. Chainsaw is hidden in the center of the top-right secret room of Level 1 (col 52, row 3), directly in the line of sight of secret door S at (49, 3)
    const secretChainsaw = game.pickups.find((p) => p.type === 'chainsaw');
    assert.ok(secretChainsaw, 'chainsaw pickup exists in Level 1');
    const csCol = Math.floor(secretChainsaw.pos.x / 64);
    const csRow = Math.floor(secretChainsaw.pos.y / 64);
    assert.equal(csCol, 52, 'chainsaw sits 3 tiles inside the secret room so the player sees it rotating before reaching it');
    assert.equal(csRow, 3, 'chainsaw is aligned on row 3 directly in front of the secret push-wall at (49, 3)');
    const secretDoor = game.level.doors.get(3 * game.level.width + 49);
    assert.ok(secretDoor?.secret, 'top-right secret room is guarded by secret push-wall at (49, 3)');
    assert.equal(game.level.doors.has(5 * game.level.width + 50), false, 'top-right secret room has no back door on row 5');

    // Pick up the hidden chainsaw: unlocks and auto-equips chainsaw, and slot 1 toggles between chainsaw and knife
    game.touch(secretChainsaw.body);
    assert.equal(game.player.weapons.chainsaw, true, 'picking up secret chainsaw unlocks chainsaw');
    assert.equal(game.player.weapon, 'chainsaw', 'picking up secret chainsaw auto-equips chainsaw');
    game.selectWeapon(1);
    assert.equal(game.player.weapon, 'knife', 'pressing 1 while holding chainsaw toggles to knife');
    game.selectWeapon(1);
    assert.equal(game.player.weapon, 'chainsaw', 'pressing 1 while holding knife toggles back to chainsaw');
  },

  'startup difficulty selection: four classic skill levels scale foe counts strictly upward across every level and hit-test cleanly on the title screen'() {
    assert.deepEqual(DIFFICULTY_ORDER, ['easy', 'normal', 'hard', 'nightmare']);
    for (const key of DIFFICULTY_ORDER) {
      assert.ok(DIFFICULTIES[key]?.label, `difficulty ${key} has a display label`);
      assert.ok(DIFFICULTIES[key]?.desc, `difficulty ${key} has a description`);
    }

    const game = new Game();
    assert.equal(game.difficulty, 'normal', 'default difficulty is normal (HURT ME PLENTY)');
    assert.equal(game.cycleDifficulty(1), 'hard', 'cycling down advances to hard');
    assert.equal(game.cycleDifficulty(1), 'nightmare', 'cycling down advances to nightmare');
    assert.equal(game.cycleDifficulty(1), 'easy', 'cycling down wraps around to easy');
    assert.equal(game.cycleDifficulty(-1), 'nightmare', 'cycling up wraps back to nightmare');
    assert.equal(game.setDifficulty(1), 'normal', 'numeric index 1 selects normal');

    for (let lvl = 0; lvl < LEVELS.length; lvl++) {
      const counts = {};
      for (const diff of DIFFICULTY_ORDER) {
        game.setDifficulty(diff);
        game.load(lvl);
        counts[diff] = game.enemies.length;
        assert.equal(game.totalEnemies, game.enemies.length, `totalEnemies matches spawned enemies on level ${lvl} (${diff})`);
        for (const enemy of game.enemies) {
          const tx = Math.floor(enemy.pos.x / 64);
          const ty = Math.floor(enemy.pos.y / 64);
          const idx = ty * game.level.width + tx;
          assert.equal(
            game.level.kind[idx],
            0,
            `enemy ${enemy.type} at (${enemy.pos.x.toFixed(1)}, ${enemy.pos.y.toFixed(1)}) on level ${lvl} (${diff}) is on an open floor tile`,
          );
        }
      }
      assert.ok(
        counts.easy < counts.normal && counts.normal < counts.hard && counts.hard < counts.nightmare,
        `level ${lvl} foe count strictly increases with difficulty: easy=${counts.easy} < normal=${counts.normal} < hard=${counts.hard} < nightmare=${counts.nightmare}`,
      );
    }

    // Verify HUD title-screen difficulty hit-testing with Vec2 screen coordinates
    const texts = [];
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {},
          clearRect() {},
          fillRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
          fillText(str) {
            texts.push(str);
          },
        };
      },
    };
    const fakeOverlay = {
      clear() {},
      glow: { line() {} },
      crisp: {
        fillRect() {},
        rectLine() {},
        line() {},
        circleLine() {},
        weapon: { quad() {} },
        sprites: { quad() {} },
        face: { quad() {} },
      },
    };
    const hud = new Hud(fakeCanvas, fakeOverlay);
    hud.resize(1024, 768, 1);
    const cx = 512;
    const rowsTop = 384 - 42;
    assert.equal(hud.difficultyAt(new Vec2(cx, rowsTop + 10)), 'easy');
    assert.equal(hud.difficultyAt(new Vec2(cx, rowsTop + 36)), 'normal');
    assert.equal(hud.difficultyAt(new Vec2(cx, rowsTop + 62)), 'hard');
    assert.equal(hud.difficultyAt(new Vec2(cx, rowsTop + 88)), 'nightmare');
    assert.equal(hud.difficultyAt(new Vec2(20, rowsTop + 10)), null, 'outside horizontal bounds returns null');
    assert.equal(hud.difficultyAt(new Vec2(cx, rowsTop - 15)), null, 'above difficulty rows returns null');

    game.state = 'title';
    game.selectingDifficulty = false;
    game.setDifficulty('hard');
    hud.render(game);
    assert.ok(!texts.some((t) => t.includes('SELECT SKILL LEVEL')), 'first title screen does not show skill selector before pressing Enter');
    assert.ok(texts.some((t) => t.includes('click or press ENTER to start')), 'first title screen shows press ENTER prompt');

    texts.length = 0;
    game.selectingDifficulty = true;
    game.setLevel(4);
    hud.render(game);
    assert.ok(texts.some((t) => t.includes('SELECT SKILL LEVEL')), 'difficulty screen renders skill selector header after pressing Enter');
    assert.ok(texts.some((t) => t.includes('▸ [3] ULTRA-VIOLENCE')), 'difficulty screen highlights selected difficulty');
    assert.ok(texts.some((t) => t.includes('E1M5 · RED PLANET')), 'difficulty screen displays selected mission');
    assert.equal(hud.levelStepAt(new Vec2(cx - 60, 384 + 105)), -1, 'clicking left half of mission row steps level backward');
    assert.equal(hud.levelStepAt(new Vec2(cx + 60, 384 + 105)), 1, 'clicking right half of mission row steps level forward');
    assert.equal(hud.levelStepAt(new Vec2(cx, rowsTop + 10)), 0, 'clicking difficulty rows does not step level');

    // Cycling levels on title screen preserves selected level across TitleDirector loops and loads it on end()
    const td = new TitleDirector(game);
    td.update(0.1);
    assert.equal(game.cycleLevel(1), 0, 'cycling forward from E1M5 wraps to E1M1');
    assert.equal(game.cycleLevel(-1), 4, 'cycling backward from E1M1 wraps to E1M5');
    td.begin();
    assert.equal(game.levelIndex, 4, 'TitleDirector.begin() preserves chosen starting levelIndex');
    td.end();
    assert.equal(game.level.name, 'E1M5 · Red Planet', 'TitleDirector.end() loads the selected starting level');
  },

  'foes immediately stop attacking, winding up, leaping, and moving when the player dies'() {
    const game = fresh(1);
    const px = 8 * 64 + 32;
    const py = 9 * 64 + 32;
    game.player.body.setPosition(new Vec2(px, py));

    // Place a mix of melee, ranged, and leaping enemies right next to the player in an active attack state
    const types = ['brute', 'imp', 'crawler', 'skull', 'swarmer', 'wraith', 'boss'];
    for (let i = 0; i < types.length; i++) {
      const enemy = game.enemies[i] || game.enemies[0];
      enemy.type = types[i];
      enemy.def = ENEMY_TYPES[types[i]];
      enemy.state = 'chase';
      enemy.los = true;
      enemy.losTimer = 10;
      enemy.windup = 0.05;
      enemy.cooldown = 0;
      enemy.leap = types[i] === 'crawler' ? 0.3 : 0;
      enemy.roar = 0.2;
      enemy.body.setPosition(new Vec2(px + 28, py));
      enemy.body.setVelocity(new Vec2(120, 0));
    }

    // Kill the player
    game.hurtPlayer(999);
    assert.equal(game.state, 'dead');
    assert.equal(game.player.health, 0);

    // Clear any existing shots or events from before death, then step the simulation
    game.shots.length = 0;
    game.events.length = 0;
    const attackEvents = new Set(['swing', 'bite', 'rake', 'slam', 'leap', 'fireball', 'wake']);

    for (const enemy of game.enemies)
      if (enemy.state !== 'dead') {
        assert.equal(enemy.windup, 0, `${enemy.type} windup cleared on player death`);
        assert.equal(enemy.leap, 0, `${enemy.type} leap cleared on player death`);
        assert.equal(enemy.roar, 0, `${enemy.type} roar cleared on player death`);
      }

    run(game, 2.0);

    assert.equal(game.shots.length, 0, 'no fireballs or projectiles are fired after player death');
    for (const ev of game.events)
      assert.ok(!attackEvents.has(ev.type), `no enemy attack or wake event (${ev.type}) emitted after player death`);
    for (const enemy of game.enemies)
      if (enemy.state !== 'dead') {
        assert.equal(enemy.windup, 0, `${enemy.type} never winds up while player is dead`);
        assert.equal(enemy.leap, 0, `${enemy.type} never leaps while player is dead`);
        assert.equal(enemy.body.velocity.x, 0, `${enemy.type} velocity.x is zero while player is dead`);
        assert.equal(enemy.body.velocity.y, 0, `${enemy.type} velocity.y is zero while player is dead`);
      }
  },

  'ammo pickup flash: HUD ammo counter flashes, displays +N badge, and visibly rolls numbers up when picking up ammo'() {
    const game = new Game();
    game.state = 'play';
    clearEnemies(game);

    const room1Pickups = game.pickups.filter((p) => p.pos.x < 5 * 64 && p.pos.y < 5 * 64);
    const floorShotgun = room1Pickups.find((p) => p.type === 'shotgun');
    const floorShellPacks = room1Pickups.filter((p) => p.type === 'ammo');

    // Picking up the 0-ammo floor shotgun does not flash shells
    game.touch(floorShotgun.body);
    assert.equal(game.player.ammoFlash.shells, 0, '0-ammo shotgun pickup does not trigger shell flash');

    // Picking up the first shell crate triggers ammoFlash on shells from 0 -> 8
    game.touch(floorShellPacks[0].body);
    assert.equal(game.player.shells, 8);
    assert.equal(game.player.ammoFrom.shells, 0);
    assert.equal(game.player.ammoDelta.shells, 8);
    assert.equal(game.player.ammoFlash.shells, AMMO_FLASH_DURATION);
    assert.equal(game.player.ammoFlash.bullets, 0, 'other ammo pools do not flash');

    const texts = [];
    const lines = [];
    const fakeHud = Object.create(Hud.prototype);
    fakeHud.text = (str, _x, _y, color, opts) => texts.push({ str, color, opts });
    fakeHud.line = (pts, color, alpha) => lines.push({ pts, color, alpha });

    // Right at pickup start (flash = 0.65), shownAmmo starts at 0 and rolls upward as time advances
    assert.equal(fakeHud.shownAmmo(game.player, 'shells'), 0, 'counter starts rolling from pre-pickup value 0');
    fakeHud.drawAmmo(900, 560, game.player, WEAPONS.shotgun);
    assert.ok(texts.some((t) => t.str === '+8'), 'HUD displays +8 gain badge while flashing');
    assert.ok(lines.length >= 2, 'HUD draws glowing highlight frames around active readout and SHL tally row');

    // Step partway through the roll (0.2s elapsed -> halfway through the 0.4s roll window)
    run(game, 0.2);
    const midShown = fakeHud.shownAmmo(game.player, 'shells');
    assert.ok(midShown > 0 && midShown < 8, `counter visibly grows through intermediate values (midShown=${midShown})`);

    // Step past the 0.4s roll window (total 0.45s elapsed): counter reaches 8 while still finishing its flash
    run(game, 0.25);
    assert.equal(fakeHud.shownAmmo(game.player, 'shells'), 8, 'counter reaches final value 8 before flash ends');
    assert.ok(game.player.ammoFlash.shells > 0, 'flash glow is still active right after roll completes');

    // Step until flash completes: flash timer settles to 0
    run(game, 0.3);
    assert.equal(game.player.ammoFlash.shells, 0, 'ammoFlash timer decays back to 0');
    assert.equal(fakeHud.shownAmmo(game.player, 'shells'), 8, 'counter remains at 8 after flash ends');
  },

  'foe projectiles hit other foes and disappear with no friendly fire'() {
    const game = fresh();
    clearEnemies(game);
    // Place player far out of the line of fire
    game.player.body.setPosition(new Vec2(6 * 64, 7 * 64 + 32));
    game.player.health = 100;

    // Place shooter imp and blocker imp along the same horizontal corridor
    game.addEnemy('imp', new Vec2(6 * 64, 9 * 64 + 32));
    game.addEnemy('imp', new Vec2(6 * 64 + 90, 9 * 64 + 32));
    const [shooter, blocker] = game.enemies;
    const initialBlockerHp = blocker.hp;
    const initialShooterHp = shooter.hp;

    // Fire a shot directly from shooter's center (overlapping shooter) toward blocker
    game.events.length = 0;
    game.effects.length = 0;
    game.addShot(shooter.pos.clone(), new Vec2(1, 0), 220, 10, shooter);
    assert.equal(game.shots.length, 1, 'shot is spawned');

    // Step one tick: shot overlaps shooter initially, must not self-collide with shooter
    game.update(1 / 60, idle);
    assert.equal(game.shots.length, 1, 'shot ignores its own shooter');
    assert.equal(shooter.hp, initialShooterHp, 'shooter takes no self-damage');

    // Advance until shot reaches blocker (~90px at 220px/s -> ~0.4s)
    let exploded = false;
    for (let i = 0; i < 40 && game.shots.length > 0; i++) {
      game.update(1 / 60, idle);
      if (game.events.some((e) => e.type === 'explode'))
        exploded = true;
    }

    assert.equal(game.shots.length, 0, 'shot disappears upon hitting the other foe');
    assert.ok(exploded, 'shot emits explode event on hitting the other foe');
    assert.ok(game.effects.some((fx) => fx.type === 'blast'), 'shot spawns blast effect on impact');
    assert.equal(blocker.hp, initialBlockerHp, 'other foe takes no friendly fire damage');
    assert.ok(!blocker.dead, 'other foe remains alive');
  },

  'doors use two thin recessed slabs across the 64-unit wall thickness, oriented to their corridor'() {
    const dims = new Vec3(63.2, 64, DOOR_THICKNESS);
    const alongX = doubleDoorBox(dims, false, DOOR_INSET);
    const alongY = doubleDoorBox(dims, true, DOOR_INSET);
    assert.equal(alongX.vertices.length / 3, 60, 'two slabs with four sides and a top each (10 quads, 60 vertices)');
    assert.equal(alongX.uvs.length / 2, 60);
    assert.equal(alongY.vertices.length / 3, 60);

    // Along-X corridor (alongY = false): doorway width spans Z [-31.6, 31.6], two thin slabs sit at X in [-26, -18] and [18, 26]
    const xs = new Set();
    for (let i = 0; i < alongX.vertices.length; i += 3) {
      xs.add(alongX.vertices[i]);
      assert.ok(alongX.vertices[i + 1] >= 0 && alongX.vertices[i + 1] <= 64, 'stands on floor up to tile height');
      assert.ok(Math.abs(Math.abs(alongX.vertices[i + 2]) - 31.6) < 1e-6, 'spans full doorway width along Z');
    }
    const outer = 32 - DOOR_INSET;
    const inner = outer - DOOR_THICKNESS;
    assert.deepEqual([...xs].sort((a, b) => a - b), [-outer, -inner, inner, outer]);
    assert.ok(inner * 2 >= 32, 'leaves a wide hollow airlock chamber between the two thin door slabs');

    // Along-Y corridor (alongY = true): doorway width spans X [-31.6, 31.6], two thin slabs sit at Z in [-26, -18] and [18, 26]
    const zs = new Set();
    for (let i = 0; i < alongY.vertices.length; i += 3) {
      zs.add(alongY.vertices[i + 2]);
      assert.ok(Math.abs(Math.abs(alongY.vertices[i]) - 31.6) < 1e-6, 'spans full doorway width along X');
    }
    assert.deepEqual([...zs].sort((a, b) => a - b), [-outer, -inner, inner, outer]);

    // Level parser determines corridor orientation for every door
    const game = fresh();
    const doorEastWest = game.level.doors.get(3 * game.level.width + 5);
    const doorNorthSouth = game.level.doors.get(5 * game.level.width + 3);
    assert.equal(doorEastWest.alongY, false, 'door at (5, 3) has walls North/South and opens an East/West corridor');
    assert.equal(doorNorthSouth.alongY, true, 'door at (3, 5) has walls West/East and opens a North/South corridor');
  },

  'diagonal walls: 4 triangle orientations parse, mesh, block rays, slide bodies, and take marks'() {
    // 1. Explicit 4-direction glyphs and auto-oriented / and \
    const custom = new Level({
      name: 'DiagExplicit',
      rows: [
        '#######',
        '#◤...◥#',
        '#..P..#',
        '#◣...◢#',
        '#######',
      ],
    });
    assert.equal(custom.diag[1 * custom.width + 1], DIAG_NW, '◤ parses as DIAG_NW');
    assert.equal(custom.diag[1 * custom.width + 5], DIAG_NE, '◥ parses as DIAG_NE');
    assert.equal(custom.diag[3 * custom.width + 1], DIAG_SW, '◣ parses as DIAG_SW');
    assert.equal(custom.diag[3 * custom.width + 5], DIAG_SE, '◢ parses as DIAG_SE');

    const auto = new Level({
      name: 'DiagAuto',
      rows: [
        '#######',
        '#/...\\#',
        '#..P..#',
        '#\\.../#',
        '#######',
      ],
    });
    assert.equal(auto.diag[1 * auto.width + 1], DIAG_NW, '/ against North+West walls orients as DIAG_NW');
    assert.equal(auto.diag[1 * auto.width + 5], DIAG_NE, '\\ against North+East walls orients as DIAG_NE');
    assert.equal(auto.diag[3 * auto.width + 1], DIAG_SW, '\\ against South+West walls orients as DIAG_SW');
    assert.equal(auto.diag[3 * auto.width + 5], DIAG_SE, '/ against South+East walls orients as DIAG_SE');

    // 2. Half-space heightAtPoint and cardinal faces for all 4 orientations
    // Tile (1, 1) is DIAG_NW ([64..128, 64..128]): solid in NW (lx + ly <= 64), open in SE (lx + ly > 64)
    assert.equal(custom.heightAtPoint(new Vec2(64 + 12, 64 + 12)), 64, 'NW corner of DIAG_NW is solid');
    assert.equal(custom.heightAtPoint(new Vec2(64 + 52, 64 + 52)), 0, 'SE half of DIAG_NW is open');
    assert.equal(custom.hasCardinalFace(1 * custom.width + 1, 0), true, 'DIAG_NW has West leg (d=0)');
    assert.equal(custom.hasCardinalFace(1 * custom.width + 1, 2), true, 'DIAG_NW has North leg (d=2)');
    assert.equal(custom.hasCardinalFace(1 * custom.width + 1, 1), false, 'DIAG_NW has no East cardinal face (d=1)');
    assert.equal(custom.hasCardinalFace(1 * custom.width + 1, 3), false, 'DIAG_NW has no South cardinal face (d=3)');

    // Tile (5, 1) is DIAG_NE ([320..384, 64..128]): solid in NE (lx >= ly), open in SW (lx < ly)
    assert.equal(custom.heightAtPoint(new Vec2(320 + 52, 64 + 12)), 64, 'NE corner of DIAG_NE is solid');
    assert.equal(custom.heightAtPoint(new Vec2(320 + 12, 64 + 52)), 0, 'SW half of DIAG_NE is open');

    // Tile (1, 3) is DIAG_SW ([64..128, 192..256]): solid in SW (ly >= lx), open in NE (ly < lx)
    assert.equal(custom.heightAtPoint(new Vec2(64 + 12, 192 + 52)), 64, 'SW corner of DIAG_SW is solid');
    assert.equal(custom.heightAtPoint(new Vec2(64 + 52, 192 + 12)), 0, 'NE half of DIAG_SW is open');

    // Tile (5, 3) is DIAG_SE ([320..384, 192..256]): solid in SE (lx + ly >= 64), open in NW (lx + ly < 64)
    assert.equal(custom.heightAtPoint(new Vec2(320 + 52, 192 + 52)), 64, 'SE corner of DIAG_SE is solid');
    assert.equal(custom.heightAtPoint(new Vec2(320 + 12, 192 + 12)), 0, 'NW half of DIAG_SE is open');

    // 3. 3D hypotenuse mesh generation
    for (const [idx, expectedNx, expectedNy] of [
      [1 * custom.width + 1, Math.SQRT1_2, Math.SQRT1_2],
      [1 * custom.width + 5, -Math.SQRT1_2, Math.SQRT1_2],
      [3 * custom.width + 1, Math.SQRT1_2, -Math.SQRT1_2],
      [3 * custom.width + 5, -Math.SQRT1_2, -Math.SQRT1_2],
    ]) {
      const info = custom.diagInfo(idx);
      assert.ok(Math.abs(info.nx - expectedNx) < 1e-6 && Math.abs(info.ny - expectedNy) < 1e-6);
      const quads = diagWallFaceQuads({
        ax: info.ax,
        ay: info.ay,
        bx: info.bx,
        by: info.by,
        base: 0,
        top: 64,
        x: idx % custom.width,
        y: Math.floor(idx / custom.width),
        diag: info.diag,
        exit: null,
      });
      assert.equal(quads.length, 1);
      assert.deepEqual(quads[0].corners.slice(0, 6), [info.ax, 0, info.ay, info.bx, 0, info.by]);
      for (const u of quads[0].uv)
        assert.ok(u >= 0 && u <= 1, 'diagonal wall UVs stay inside [0, 1]');
    }

    // 4. Level 1 has all 4 diagonal wall orientations; test raycasting, sliding collision, and bullet holes
    const e1m1 = fresh(0);
    assert.ok(e1m1.diagWalls.length >= 4, 'E1M1 contains diagonal walls');
    const seenTypes = new Set(e1m1.diagWalls.map((dw) => dw.diag));
    for (const d of [DIAG_NW, DIAG_NE, DIAG_SW, DIAG_SE])
      assert.ok(seenTypes.has(d), `E1M1 includes diagonal orientation ${d}`);

    const game = new Game();
    game.load(custom);
    game.state = 'play';

    // Tile (1, 1) in custom is DIAG_NW (hypotenuse from (64, 128) to (128, 64), normal (+SQRT1_2, +SQRT1_2))
    const hitHyp = game.scene.raycast(new Vec2(140, 140), new Vec2(70, 70), { mask: CAT.WALL });
    assert.ok(hitHyp && hitHyp.body?.ref?.kind === 'wall' && hitHyp.body?.ref?.diag === DIAG_NW, 'ray into NW diagonal hits hypotenuse');
    assert.ok(Math.abs(hitHyp.point.x + hitHyp.point.y - (64 + 128)) < 1e-3, 'hit point lies on the hypotenuse x + y = 192');
    assert.ok(Math.abs(hitHyp.normal.x - Math.SQRT1_2) < 1e-3 && Math.abs(hitHyp.normal.y - Math.SQRT1_2) < 1e-3, 'hit normal is 45 degrees (+SQRT1_2, +SQRT1_2)');

    // Ray passing through the open SE half of tile (1, 1) (e.g. from (120, 125) to (125, 120), where lx+ly = 56+61 = 117 > 64) is unblocked
    const openHalfRay = game.scene.raycast(new Vec2(120, 125), new Vec2(125, 120), { mask: CAT.WALL });
    assert.equal(openHalfRay, null, 'open half of diagonal wall tile does not block rays');

    // Player pushed into the NW diagonal wall at (1, 1) slides smoothly along the 45-degree hypotenuse
    game.player.body.setPosition(new Vec2(112, 112));
    game.player.angle = -Math.PI * 0.75; // facing NW into the diagonal wall
    for (let i = 0; i < 20; i++)
      game.update(1 / 60, input({ forward: 1 }));
    const p = game.player.pos;
    const nwDiag = custom.diagInfo(1 * custom.width + 1);
    const signedDist = nwDiag.tri.signedDistanceToHypotenuse(p);
    assert.ok(signedDist >= 14 - 1e-4, `player stays outside the diagonal hypotenuse (signedDist=${signedDist})`);

    // Bullet holes and blood splats on diagonal wall hypotenuse are recorded and clamped to hypotenuse span
    game.blood.holes.length = 0;
    game.blood.walls.length = 0;
    game.blood.impact(96, 96, Math.SQRT1_2, Math.SQRT1_2, 32);
    game.blood.wallSplat(96, 96, 32, Math.SQRT1_2, Math.SQRT1_2, 10, 64);
    assert.equal(game.blood.holes.length, 1, 'bullet hole attaches to diagonal wall hypotenuse');
    assert.equal(game.blood.walls.length, 1, 'blood splat attaches to diagonal wall hypotenuse');
    assert.ok(game.blood.holes[0].lo < -40 && game.blood.holes[0].hi > 40, 'diagonal face span covers the ~90.5-unit hypotenuse');
  },

  'half-size walls (PILLAR) have ceiling above them in roofed rooms and stay roofless inside the boss arena'() {
    // 1. In a normal roofed room, a half-size wall ('o', height 26) at tile (2, 3) has ceiling above it
    const roofedSpec = {
      name: 'Roofed Pillar Test',
      rows: [
        '#####',
        '#P..#',
        '#...#',
        '#.o.#',
        '#####',
      ],
    };
    const game = new Game();
    game.load(roofedSpec);
    game.state = 'play';
    const pillarIdx = 3 * game.level.width + 2;
    assert.equal(game.level.kind[pillarIdx], PILLAR, 'tile (2, 3) is a half-size PILLAR');
    assert.equal(game.level.baseHeight[pillarIdx], 26, 'half-size PILLAR has height 26 (< 64 ceiling)');
    assert.equal(game.blood.hitsCeiling(2.5 * 64, 3.5 * 64), true, 'ceiling exists above half-size wall in a roofed room');

    // Tile (2, 3) satisfies ceilingCellFor(2, 3) === CEILING_CELLS.light (2 % 5 === 2 && 3 % 4 === 3)
    const fixtures = ceilingLightFixtures(game.level);
    assert.ok(fixtures.some((f) => f.tile.x === 2 && f.tile.y === 3), 'ceiling light fixture is placed on the ceiling above a half-size wall at (2, 3)');

    // 2. Inside a boss arena, half-size walls ('o') are part of level.arena and remain open to the sky
    const arenaSpec = {
      name: 'Boss Arena Pillar Test',
      rows: [
        '#######',
        '#P#...#',
        '#D#.o.#',
        '#.#.B.#',
        '#######',
      ],
    };
    const arenaGame = new Game();
    arenaGame.load(arenaSpec);
    const arenaPillarIdx = 2 * arenaGame.level.width + 4;
    assert.equal(arenaGame.level.kind[arenaPillarIdx], PILLAR);
    assert.ok(arenaGame.level.arena?.has(arenaPillarIdx), 'half-size wall inside the boss room is included in the roofless arena set');
    assert.equal(arenaGame.blood.hitsCeiling(4.5 * 64, 2.5 * 64), false, 'no ceiling over a half-size wall inside the roofless boss arena');

    // 3. Low cover tiles ('o' / PILLAR) render as 3D UAC futuristic cover crates (256x64 4-cell atlas + multi-part 3D mesh)
    const cAtlas = crateAtlas();
    assert.equal(cAtlas.width, CRATE_CELL * CRATE_FRAMES, 'crateAtlas width is 256 (4 x 64 cells)');
    assert.equal(cAtlas.height, CRATE_CELL, 'crateAtlas height is 64');
    const cQuads = crateQuads(new Vec3(160, 0, 224), new Vec2(64, 26));
    assert.ok(cQuads.length >= 80, 'crateQuads builds skid plinth, cargo core, corner bumpers, side bulkheads, lid, locking bars, and lugs');
    const cMesh = crateMesh(new Vec3(0, 0, 0), new Vec2(64, 26));
    assert.equal(cMesh.vertices.length, cQuads.length * 18, 'crateMesh converts every quad to 2 triangles');
    assert.equal(cMesh.uvs.length, cQuads.length * 12, 'crateMesh UVs match triangle vertices');
  },

  'E1M5 Red Planet: indoor airlock start room opening onto roofless hostile Martian surface with wind and blowing orange dirt'() {
    const g = fresh(4);
    const { level } = g;
    assert.equal(level.name, 'E1M5 · Red Planet');
    assert.equal(level.planet, 'mars');
    assert.ok(level.wind.x > 200 && level.wind.y > 0, 'Martian surface has strong crosswind vector');

    // 1. Player spawns inside an enclosed indoor airlock room with a ceiling and overhead light fixture
    assert.equal(level.isOutdoor(g.player.pos), false, 'player starts indoors inside the airlock room');
    assert.equal(g.blood.hitsCeiling(g.player.pos.x, g.player.pos.y), true, 'starting room has a solid ceiling overhead');
    const fixtures = ceilingLightFixtures(level);
    assert.ok(
      fixtures.some((f) => level.indoor.has(f.tile.y * level.width + f.tile.x)),
      'starting airlock room has an overhead ceiling light fixture'
    );
    assert.ok(
      fixtures.every((f) => !level.outdoor.has(f.tile.y * level.width + f.tile.x)),
      'no ceiling light fixtures float over the roofless Martian exterior'
    );

    // 2. Opening the starting airlock door leads directly outside onto the roofless Martian surface, with ZERO other doors on the planet
    assert.equal(level.doors.size, 1, 'E1M5 has only 1 door (the first room door) and no doors outside on the planet');
    const airlockDoor = level.doors.get(3 * level.width + 6);
    assert.ok(airlockDoor, 'airlock door exists at (6, 3) on the east wall of the starting room');
    assert.equal(level.doorTouchesIndoor(airlockDoor.idx), true, 'airlock door borders the indoor starting room');
    assert.equal(level.isIndoorTile(airlockDoor.idx), true, 'airlock doorway tile is indoor so its side walls use interior bulkhead textures');
    assert.equal(level.isIndoorTile(3 * level.width + 7), false, 'tile outside the airlock door is outdoor so its walls use Martian rock');
    const outsidePos = new Vec2(7.5 * 64, 3.5 * 64);
    assert.equal(level.isOutdoor(outsidePos), true, 'stepping through the airlock door places the player on the outdoor Martian surface');
    assert.equal(g.blood.hitsCeiling(outsidePos.x, outsidePos.y), false, 'Martian exterior is roofless (open to the orange sky)');

    // 3. Outdoor Martian dirt floor atlas, rock cliff wall atlas, and 3D boulder outcrops replace base floor/walls/crates
    const dirt = marsDirtAtlas();
    assert.equal(dirt.width, TILE_PIXELS * FLOOR_CELL_COUNT, 'marsDirtAtlas is 512 px wide (8 cells)');
    assert.equal(dirt.height, TILE_PIXELS, 'marsDirtAtlas is 64 px tall');
    assert.ok(MARS_DIRT_FRAGMENT.includes('uSampler'), 'MARS_DIRT_FRAGMENT samples the Martian dirt atlas');

    const rock = marsRockAtlas();
    assert.equal(rock.width, 64 * WALL_CELL_COUNT, 'marsRockAtlas is 512 px wide (8 cells)');
    assert.equal(rock.height, 64, 'marsRockAtlas is 64 px tall');
    // Verify warm iron-oxide orange/red dominance in both dirt and rock atlases (avg R > avg G > avg B)
    let dirtR = 0;
    let dirtG = 0;
    let dirtB = 0;
    for (let i = 0; i < dirt.data.length; i += 4) {
      dirtR += dirt.data[i];
      dirtG += dirt.data[i + 1];
      dirtB += dirt.data[i + 2];
    }
    assert.ok(dirtR > dirtG * 1.5 && dirtG > dirtB * 1.4, 'marsDirtAtlas has orange-red Martian regolith palette');
    // Every dirt floor cell shares the exact same periodic boundary texels so adjacent floor tiles have zero border discontinuity
    for (let cell = 1; cell < FLOOR_CELL_COUNT; cell++)
      for (let i = 0; i < TILE_PIXELS; i++) {
        const left0 = (i * dirt.width + 0) * 4;
        const leftC = (i * dirt.width + cell * TILE_PIXELS + 0) * 4;
        const right0 = (i * dirt.width + (TILE_PIXELS - 1)) * 4;
        const rightC = (i * dirt.width + cell * TILE_PIXELS + (TILE_PIXELS - 1)) * 4;
        const top0 = i * 4;
        const topC = (cell * TILE_PIXELS + i) * 4;
        const bot0 = ((TILE_PIXELS - 1) * dirt.width + i) * 4;
        const botC = ((TILE_PIXELS - 1) * dirt.width + cell * TILE_PIXELS + i) * 4;
        assert.equal(dirt.data[leftC], dirt.data[left0], 'seamless left border across dirt cells');
        assert.equal(dirt.data[rightC], dirt.data[right0], 'seamless right border across dirt cells');
        assert.equal(dirt.data[topC], dirt.data[top0], 'seamless top border across dirt cells');
        assert.equal(dirt.data[botC], dirt.data[bot0], 'seamless bottom border across dirt cells');
      }
    assert.ok(MARS_DIRT_FRAGMENT.includes('sampleDirtCell'), 'MARS_DIRT_FRAGMENT blends multiple periodic dirt cells across domain-warped layers');

    let rockR = 0;
    let rockG = 0;
    let rockB = 0;
    let rockMinR = 255;
    let rockMaxR = 0;
    for (let i = 0; i < rock.data.length; i += 4) {
      rockR += rock.data[i];
      rockG += rock.data[i + 1];
      rockB += rock.data[i + 2];
      if (rock.data[i] < rockMinR)
        rockMinR = rock.data[i];
      if (rock.data[i] > rockMaxR)
        rockMaxR = rock.data[i];
    }
    assert.ok(rockR > rockG * 1.4 && rockG > rockB * 1.3, 'marsRockAtlas has stratified red-orange canyon rock palette');
    assert.ok(rockMinR < 40 && rockMaxR > 190, 'marsRockAtlas has high-contrast dark crevices and sunlit ochre ledges');
    assert.ok(MARS_ROCK_FRAGMENT.includes('sampleRockCell'), 'MARS_ROCK_FRAGMENT blends multiple periodic rock cells across domain-warped layers');
    // Every rock wall cell shares the exact same periodic boundary texels so adjacent wall tiles never show hard seams
    for (let cell = 1; cell < WALL_CELL_COUNT; cell++)
      for (let i = 0; i < TILE_PIXELS; i++) {
        const left0 = (i * rock.width + 0) * 4;
        const leftC = (i * rock.width + cell * TILE_PIXELS + 0) * 4;
        const right0 = (i * rock.width + (TILE_PIXELS - 1)) * 4;
        const rightC = (i * rock.width + cell * TILE_PIXELS + (TILE_PIXELS - 1)) * 4;
        assert.equal(rock.data[leftC], rock.data[left0], 'seamless left border across rock cells');
        assert.equal(rock.data[rightC], rock.data[right0], 'seamless right border across rock cells');
      }

    const bAtlas = marsBoulderAtlas();
    assert.equal(bAtlas.width, TILE_PIXELS * MARS_BOULDER_CELL_COUNT, 'marsBoulderAtlas is 256 px wide (4 cells)');
    assert.equal(bAtlas.height, TILE_PIXELS, 'marsBoulderAtlas is 64 px tall');
    let bMinR = 255;
    let bMaxR = 0;
    for (let i = 0; i < bAtlas.data.length; i += 4) {
      if (bAtlas.data[i] < bMinR)
        bMinR = bAtlas.data[i];
      if (bAtlas.data[i] > bMaxR)
        bMaxR = bAtlas.data[i];
    }
    assert.ok(bMinR < 40 && bMaxR > 190, 'marsBoulderAtlas has high-contrast dark crevices and sunlit ochre highlights');
    const bQuads = marsBoulderQuads(new Vec3(160, 0, 224), new Vec2(64, 26));
    assert.equal(bQuads.length, 30, 'marsBoulderQuads builds 6 tapered rock masses (30 quads)');
    const bMesh = marsBoulderMesh(new Vec3(0, 0, 0), new Vec2(64, 26));
    assert.equal(bMesh.vertices.length, bQuads.length * 18, 'marsBoulderMesh converts every quad to 2 triangles');
    assert.equal(bMesh.uvs.length, bQuads.length * 12, 'marsBoulderMesh UVs match triangle vertices');

    // Bullet holes, blood splats, and blood drips on outdoor Martian boulders follow the rock slope instead of floating vertically
    const boulderIdx = level.kind.findIndex((k, idx) => k === PILLAR && !level.indoor.has(idx));
    assert.ok(boulderIdx >= 0, 'E1M5 has outdoor Martian boulder tiles');
    const btx = boulderIdx % level.width;
    const bty = Math.floor(boulderIdx / level.width);
    const bcx = (btx + 0.5) * 64;
    const bSouthY = (bty + 1) * 64;
    g.blood.holes.length = 0;
    g.blood.walls.length = 0;
    const hitH = g.blood.impact(bcx, bSouthY, 0, 1, 16, 'hole');
    assert.equal(hitH, 16, 'bullet impact on Martian boulder records at hit height');
    const bHole = g.blood.holes[g.blood.holes.length - 1];
    assert.equal(bHole.slope, MARS_BOULDER_SLOPE, 'boulder bullet hole carries MARS_BOULDER_SLOPE');
    const expectedFaceY = (bty + 0.5) * 64 + (32 - MARS_BOULDER_BASE_INSET - MARS_BOULDER_SLOPE * 16);
    assert.ok(Math.abs(bHole.y - expectedFaceY) < 1e-4, 'boulder bullet hole is recessed onto the sloped rock surface');
    const hQuad = holeQuad(bHole);
    assert.ok(hQuad, 'holeQuad produces a valid quad on the sloped boulder');
    // South face (ny = +1): top corners (indices 2, 3 -> z offset +2, +5, +8, +11) must lean inward (smaller world Z) than bottom corners
    assert.ok(hQuad.corners[8] < hQuad.corners[2] && hQuad.corners[11] < hQuad.corners[5], 'boulder bullet hole quad tilts inward along the rock slope');
    const expectedSlope = (hQuad.corners[2] - hQuad.corners[8]) / (hQuad.corners[7] - hQuad.corners[1]);
    assert.ok(Math.abs(expectedSlope - MARS_BOULDER_SLOPE) < 1e-4, 'boulder bullet hole quad slope matches MARS_BOULDER_SLOPE');

    g.blood.wallSplat(bcx, bSouthY, 18, 0, 1, 5, 26, null);
    const bSplat = g.blood.walls[g.blood.walls.length - 1];
    assert.equal(bSplat.slope, MARS_BOULDER_SLOPE, 'boulder blood splat carries MARS_BOULDER_SLOPE');
    const sQuad = wallSplatQuad(bSplat);
    assert.ok(sQuad, 'wallSplatQuad produces a valid quad on the sloped boulder');
    assert.ok(sQuad.corners[8] < sQuad.corners[2], 'boulder blood splat quad tilts inward from bottom to top');
    const dQuads = wallDripQuads({ ...bSplat, age: 5 });
    assert.ok(dQuads.length > 0, 'wallDripQuads produces blood drips on the sloped boulder');
    for (const dq of dQuads)
      assert.ok(dq.corners[2] >= dq.corners[8], 'every blood drip segment on the boulder slopes outward as it runs down');

    // 3b. Procedural 360° Martian sky panorama (twin moons, hazy sun, distant mountain ranges, and wind-driven dust clouds)
    const sky = marsSkyAtlas();
    assert.equal(sky.width, MARS_SKY_WIDTH, 'marsSkyAtlas is 1024 px wide');
    assert.equal(sky.height, MARS_SKY_HEIGHT, 'marsSkyAtlas is 256 px tall');
    assert.equal(sky.data.length, MARS_SKY_WIDTH * MARS_SKY_HEIGHT * 4, 'marsSkyAtlas RGBA buffer size');
    // Zenith row (y = 0) is a deep crimson/rust sky while lower horizon row (y = 255) blends into the Martian fog color [117, 46, 15]
    const zenithIdx = (0 * sky.width + 400) * 4;
    const horizonIdx = ((sky.height - 1) * sky.width + 400) * 4;
    assert.ok(sky.data[zenithIdx] < sky.data[horizonIdx], 'Martian zenith is darker crimson than the dusty lower horizon');
    assert.equal(sky.data[horizonIdx], 117, 'bottom horizon row matches MARS_SKY_VEC red channel');
    assert.equal(sky.data[horizonIdx + 1], 46, 'bottom horizon row matches MARS_SKY_VEC green channel');
    assert.equal(sky.data[horizonIdx + 2], 15, 'bottom horizon row matches MARS_SKY_VEC blue channel');
    // Pale hazy sun at (224, 60) and twin moons Phobos (632, 92) & Deimos (836, 104) stand out brightly against the upper sky
    const sunIdx = (60 * sky.width + 224) * 4;
    const phobosIdx = ((PHOBOS_CENTER.y - 6) * sky.width + (PHOBOS_CENTER.x - 10)) * 4;
    const deimosIdx = ((DEIMOS_CENTER.y - 2) * sky.width + (DEIMOS_CENTER.x - 4)) * 4;
    const ambientUpperIdx = (PHOBOS_CENTER.y * sky.width + 440) * 4;
    assert.ok(sky.data[sunIdx] > 235 && sky.data[sunIdx + 1] > 190, 'pale hazy Martian sun core is bright butterscotch-white');
    assert.ok(sky.data[phobosIdx] > sky.data[ambientUpperIdx] + 35, 'Phobos moon disc stands out against the rust sky');
    assert.ok(sky.data[deimosIdx] > sky.data[ambientUpperIdx] + 25, 'Deimos moon disc stands out against the rust sky');
    const skyNoMoons = marsSkyAtlas({ includeMoons: false });
    assert.ok(sky.data[phobosIdx] > skyNoMoons.data[phobosIdx] + 35, 'marsSkyAtlas({ includeMoons: false }) omits baked moons so 3D shader moons are never duplicated');
    // Spherical 3D angular projection: skyPixelDir maps panorama coordinates to unit 3D sphere directions with equal horizontal & vertical angular radii
    const phobosDirDefault = skyPixelDir(PHOBOS_CENTER);
    const dirTarget = new Vec3();
    const phobosDirTargeted = skyPixelDir(PHOBOS_CENTER, dirTarget);
    assert.equal(phobosDirTargeted, dirTarget, 'skyPixelDir writes into the provided target Vec3');
    assert.ok(Math.abs(phobosDirDefault.getMagnitude() - 1) < 1e-6, 'skyPixelDir returns a normalized 3D unit vector');
    assert.ok(phobosDirDefault.equals(phobosDirTargeted), 'skyPixelDir default and target-allocated calls match');
    const phobosWestDir = skyPixelDir(new Vec2(PHOBOS_CENTER.x - 13, PHOBOS_CENTER.y));
    const phobosNorthDir = skyPixelDir(new Vec2(PHOBOS_CENTER.x, PHOBOS_CENTER.y - 34));
    assert.ok(phobosWestDir.getAngle(phobosDirDefault) < PHOBOS_ANGULAR_RADIUS, 'Phobos western limb lies within spherical PHOBOS_ANGULAR_RADIUS');
    assert.ok(phobosNorthDir.getAngle(phobosDirDefault) < PHOBOS_ANGULAR_RADIUS, 'Phobos northern limb (aspect-corrected dy = -34) lies within spherical PHOBOS_ANGULAR_RADIUS');
    const phobosNorthIdx = ((PHOBOS_CENTER.y - 30) * sky.width + PHOBOS_CENTER.x) * 4;
    const ambientNorthIdx = ((PHOBOS_CENTER.y - 30) * sky.width + 440) * 4;
    assert.ok(sky.data[phobosNorthIdx] > sky.data[ambientNorthIdx] + 25, 'Phobos is aspect-corrected vertically in the atlas so it projects as a 3D sphere rather than a flat ellipse');
    const deimosDir = skyPixelDir(DEIMOS_CENTER);
    const deimosNorthDir = skyPixelDir(new Vec2(DEIMOS_CENTER.x, DEIMOS_CENTER.y - 15));
    assert.ok(deimosNorthDir.getAngle(deimosDir) < DEIMOS_ANGULAR_RADIUS, 'Deimos northern limb lies within spherical DEIMOS_ANGULAR_RADIUS');
    assert.ok(MARS_SKY_FRAGMENT.includes('evalMoonSphere'), 'MARS_SKY_FRAGMENT evaluates per-fragment 3D ray-sphere shading for Phobos & Deimos');
    assert.ok(
      MARS_SKY_FRAGMENT.includes('moonLimbRadius') &&
      MARS_SKY_FRAGMENT.includes('moonCellularCraters') &&
      MARS_SKY_FRAGMENT.includes('moonRelief'),
      'MARS_SKY_FRAGMENT renders organic irregular limb silhouettes, overlapping cellular craters, and 3D normal-perturbed relief'
    );
    // Horizontal wrap continuity across x = 0 and x = 1023 on every scanline
    for (let y = 0; y < sky.height; y++) {
      const leftIdx = (y * sky.width + 0) * 4;
      const rightIdx = (y * sky.width + (sky.width - 1)) * 4;
      assert.ok(Math.abs(sky.data[leftIdx] - sky.data[rightIdx]) <= 4, `seamless horizontal wrap at row ${y} (R)`);
      assert.ok(Math.abs(sky.data[leftIdx + 1] - sky.data[rightIdx + 1]) <= 4, `seamless horizontal wrap at row ${y} (G)`);
      assert.ok(Math.abs(sky.data[leftIdx + 2] - sky.data[rightIdx + 2]) <= 4, `seamless horizontal wrap at row ${y} (B)`);
    }
    assert.ok(
      MARS_SKY_FRAGMENT.includes('skyPeriodicNoise') &&
      MARS_SKY_FRAGMENT.includes('skyPeriodicFbm'),
      'MARS_SKY_FRAGMENT wraps azimuth noise periodically across u = 0 and u = 1 with zero seam behind the player'
    );
    const skyDome = marsSkyMesh(new Vec2(1200, 720));
    assert.ok(skyDome.vertices.length > 1000 && skyDome.vertices.length % 9 === 0, 'marsSkyMesh builds valid triangle vertices');
    assert.equal(skyDome.uvs.length, (skyDome.vertices.length / 3) * 2, 'marsSkyMesh UV count matches vertex count');
    assert.ok(MARS_SKY_VERTEX.includes('vRayDir'), 'MARS_SKY_VERTEX passes view direction ray');
    assert.ok(MARS_SKY_FRAGMENT.includes('uTime') && MARS_SKY_FRAGMENT.includes('sampleSmoothSky'), 'MARS_SKY_FRAGMENT smooth-samples the panorama and animates drifting dust clouds');

    // 4. Blowing dirt/dust particles swirl across the outdoor Martian surface and never spawn inside the starting airlock
    assert.ok(g.dust.length >= 160, 'Martian surface is densely populated with blowing orange dirt particles');
    for (const d of g.dust)
      assert.equal(level.isOutdoor(new Vec2(d.x, d.y)), true, 'every blowing dirt particle is on the outdoor Martian surface');

    // 4b. Heavy Martian dust-storm fog: clear inside the closed airlock, thickens when the airlock opens, and drops to dense close-range fog outside
    const fogTarget = new Vec2();
    const indoorFogDefault = marsFogNearFar(level, g.player.pos);
    const indoorFogTargeted = marsFogNearFar(level, g.player.pos, fogTarget);
    assert.equal(indoorFogTargeted, fogTarget, 'marsFogNearFar writes into the pre-allocated target Vec2');
    assert.ok(indoorFogDefault.equals(MARS_INDOOR_FOG), 'closed starting airlock keeps indoor visibility clear (MARS_INDOOR_FOG)');
    assert.ok(indoorFogDefault.equals(indoorFogTargeted), 'marsFogNearFar default and targeted calls return identical Vec2 values');
    const outdoorFog = marsFogNearFar(level, outsidePos, fogTarget);
    assert.ok(outdoorFog.equals(MARS_OUTDOOR_FOG), 'stepping outside onto the Martian surface applies heavy close-range dust-storm fog (MARS_OUTDOOR_FOG)');
    assert.ok(MARS_OUTDOOR_FOG.x < 50 && MARS_OUTDOOR_FOG.y <= 300, 'outdoor Martian fog starts within a tile and reaches full dust-storm whiteout within ~4.5 tiles');
    assert.ok(MARS_DIRT_FRAGMENT.includes('color = mix(color, uFogColor, fade);'), 'MARS_DIRT_FRAGMENT blends 100% into uFogColor at uFogFar');
    assert.ok(MARS_ROCK_FRAGMENT.includes('color = mix(color, uFogColor, fade);'), 'MARS_ROCK_FRAGMENT blends 100% into uFogColor at uFogFar');
    assert.ok(
      MARS_SKY_FRAGMENT.includes('uFogNear') && MARS_SKY_FRAGMENT.includes('uFogFar') && MARS_SKY_FRAGMENT.includes('opticalFog') && MARS_SKY_FRAGMENT.includes('skyFog'),
      'MARS_SKY_FRAGMENT applies optical path fog (uFogNear/uFogFar) and stormFog across the entire sky dome'
    );

    // 5. Opening the airlock door or stepping outside triggers howling Martian wind audio,
    //    pulls fog closer through the doorway, blows airborne blood droplets, and does NOT push/move the player character
    g.events.length = 0;
    airlockDoor.open = 1;
    const doorwayFog = marsFogNearFar(level, g.player.pos, fogTarget);
    assert.ok(doorwayFog.x < MARS_INDOOR_FOG.x && doorwayFog.y < MARS_INDOOR_FOG.y, 'opening the airlock door pulls Martian dust-storm fog closer even before stepping outside');
    assert.ok(doorwayFog.x > MARS_OUTDOOR_FOG.x && doorwayFog.y > MARS_OUTDOOR_FOG.y, 'open-airlock indoor fog is intermediate between indoor and full outdoor storm fog');
    g.windTimer = 0;
    g.update(1 / 30, input());
    assert.ok(g.events.some((e) => e.type === 'wind'), 'opening the airlock door lets in the howling Martian wind sound');

    g.player.body.setPosition(outsidePos.clone());
    const stationaryX = g.player.pos.x;
    const stationaryY = g.player.pos.y;
    g.update(0.25, input());
    assert.equal(g.player.pos.x, stationaryX, 'Martian wind does not push the player character X position');
    assert.equal(g.player.pos.y, stationaryY, 'Martian wind does not push the player character Y position');

    g.blood.particles.length = 0;
    g.blood.spray(outsidePos.x, outsidePos.y, 24, 0, 0, 4, { speed: 10, spread: 5, up: 120 });
    const drop = g.blood.particles[0];
    const vxBefore = drop.vx;
    g.blood.update(0.1);
    assert.ok(drop.vx > vxBefore + 20, 'outdoor blood droplets are blown downwind by the Martian gale');
  },

  '3D barrel & rocket explosions: volumetric 3D fireball plume, shockwave ring, mushroom smoke lobes, flying 3D shrapnel staves, and persistent ruptured barrel stump'() {
    // 1. 3D explosion texture atlas (4 cells of 64x64: core, plume, ring, smoke)
    const expAtlas = explosion3dAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(expAtlas.width) && pow2(expAtlas.height), 'explosion3dAtlas has power-of-two dimensions');
    assert.equal(expAtlas.width, EXPLOSION_3D_CELL * EXPLOSION_3D_FRAMES, 'explosion3dAtlas width covers 4 cells');
    assert.equal(expAtlas.height, EXPLOSION_3D_CELL, 'explosion3dAtlas height is 64');
    // Ring cell has transparent inner/outer edges (y = 0, y = 63) and an opaque incandescent shockwave ridge (y = 32)
    const ringEdgeIdx = (0 * expAtlas.width + EXPLOSION_3D_CELLS.ring * 64 + 32) * 4;
    const ringBandIdx = (32 * expAtlas.width + EXPLOSION_3D_CELLS.ring * 64 + 32) * 4;
    assert.equal(expAtlas.data[ringEdgeIdx + 3], 0, 'shockwave ring cell has transparent inner/outer edges');
    assert.equal(expAtlas.data[ringBandIdx + 3], 255, 'shockwave ring ridge is opaque');
    assert.ok(expAtlas.data[ringBandIdx] > 200, 'shockwave ring ridge is incandescent');
    // Core cell is incandescent white-yellow-orange while smoke cell is dark soot with ember veins
    let coreLum = 0;
    let smokeLum = 0;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const co = (y * expAtlas.width + EXPLOSION_3D_CELLS.core * 64 + x) * 4;
        const so = (y * expAtlas.width + EXPLOSION_3D_CELLS.smoke * 64 + x) * 4;
        coreLum += expAtlas.data[co] + expAtlas.data[co + 1];
        smokeLum += expAtlas.data[so] + expAtlas.data[so + 1];
      }
    }
    assert.ok(coreLum > smokeLum * 1.35, 'plasma core cell is brighter than the volcanic smoke cell');

    // 2. Single sculpted 3D exploding fireball mesh with smooth per-vertex normals and Vec3 size signature
    const mesh = explosion3dMesh(new Vec3(1, 1, 1));
    assert.ok(mesh.vertices.length > 0 && mesh.vertices.length % 9 === 0, '3D explosion mesh has valid triangle vertices');
    assert.equal(mesh.normals.length, mesh.vertices.length, '3D explosion mesh has matching vertex normals');
    assert.equal(mesh.uvs.length, (mesh.vertices.length / 3) * 2, '3D explosion mesh has matching UVs');
    for (let i = 0; i < mesh.normals.length; i += 3) {
      const len = Math.hypot(mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2]);
      assert.ok(Number.isFinite(len) && Math.abs(len - 1) < 1e-4, 'every 3D explosion vertex normal is a finite unit vector');
    }
    // Verify smooth analytical per-vertex normals (triangle vertices have distinct interpolated normals rather than flat identical triangle normals)
    let smoothNormalsFound = false;
    for (let i = 0; i < mesh.normals.length; i += 9) {
      const dx = Math.abs(mesh.normals[i] - mesh.normals[i + 3]);
      const dy = Math.abs(mesh.normals[i + 1] - mesh.normals[i + 4]);
      const dz = Math.abs(mesh.normals[i + 2] - mesh.normals[i + 5]);
      if (dx + dy + dz > 1e-3) {
        smoothNormalsFound = true;
        break;
      }
    }
    assert.ok(smoothNormalsFound, '3D explosion mesh computes smooth per-vertex normals rather than flat faceted triangle normals');
    for (let i = 1; i < mesh.vertices.length; i += 3)
      assert.ok(mesh.vertices[i] >= -1e-4, '3D explosion mesh sits above the floor plane (y >= 0)');
    const vertUniforms = [...EXPLOSION_3D_VERTEX.matchAll(/uniform\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]);
    const fragUniforms = new Set([...EXPLOSION_3D_FRAGMENT.matchAll(/uniform\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]));
    const sharedUniforms = vertUniforms.filter((u) => fragUniforms.has(u));
    assert.equal(sharedUniforms.length, 0, 'EXPLOSION_3D_VERTEX and EXPLOSION_3D_FRAGMENT share no uniforms that could fail WebGL 1.0 linkProgram precision checks');
    assert.ok(
      EXPLOSION_3D_VERTEX.includes('precision mediump float;') &&
      EXPLOSION_3D_FRAGMENT.includes('precision mediump float;') &&
      EXPLOSION_3D_VERTEX.includes('aVertexNormal') &&
      EXPLOSION_3D_VERTEX.includes('uProgress') &&
      EXPLOSION_3D_FRAGMENT.includes('fbmBillow') &&
      EXPLOSION_3D_FRAGMENT.includes('evalBlackbody') &&
      EXPLOSION_3D_FRAGMENT.includes('uDissolve') &&
      !EXPLOSION_3D_FRAGMENT.includes('pow('),
      '3D explosion shaders declare matching mediump float precision, displace boiling vertices, evaluate 3D volumetric fbmBillow + blackbody temperature shading, and avoid GLSL ES 1.00 NaN pow(0, y)'
    );

    // 3. Allocation-free single-mesh 3D explosion pose over normalized progress (0..1) + particle shower
    const expTarget = createExplosion3dPose();
    const poseEarly = explosion3dPose(0.06, expTarget);
    assert.equal(poseEarly, expTarget, 'explosion3dPose writes into the pre-allocated target');
    assert.ok(poseEarly.pos instanceof Vec3 && poseEarly.scale instanceof Vec3 && poseEarly.color instanceof Vec3, 'explosion3dPose uses Vec3 primitives');
    assert.ok(poseEarly.heat > 1.0, 'early explosion pose has high internal blackbody heat');
    const earlyRadius = poseEarly.scale.x;
    const earlyY = poseEarly.pos.y;
    const earlyHeat = poseEarly.heat;

    const poseMid = explosion3dPose(0.36);
    assert.ok(poseMid.scale.x > earlyRadius, '3D exploding mesh expands rapidly outward');
    assert.ok(poseMid.pos.y > earlyY, '3D exploding mesh rises upward as the fireball ascends');

    // Verify high-density small particle shower (explosionParticleQuads) with strict Vec3 right/up signature
    const camRight = new Vec3(1, 0, 0);
    const camUp = new Vec3(0, 1, 0);
    const earlyQuads = explosionParticleQuads({ type: 'boom', x: 100, y: 200, z: 0, age: 0.08, life: 0.45, radius: 60 }, camRight, camUp);
    assert.equal(earlyQuads.length, EXPLOSION_PARTICLE_COUNT, 'explosionParticleQuads emits full shower of 88 small spark & cinder particles early in blast');
    const dotQuad = earlyQuads[0].corners;
    const dotWidth = Math.hypot(dotQuad[3] - dotQuad[0], dotQuad[4] - dotQuad[1], dotQuad[5] - dotQuad[2]);
    assert.ok(dotWidth >= 1.0 && dotWidth <= 2.6, `spark dot quad is a true small particle (${dotWidth.toFixed(2)} world units across, matching blood droplet scale)`);
    assert.ok(SPARK_PARTICLE_FRAGMENT.includes('rSq > 1.0'), 'SPARK_PARTICLE_FRAGMENT clips each quad to a crisp circular/elliptical spark');

    const poseLate = explosion3dPose(0.92, expTarget);
    assert.ok(poseLate.dissolve > poseMid.dissolve && poseLate.dissolve > 0.75, '3D exploding mesh erodes away in the late smoke phase');
    assert.ok(poseLate.heat < earlyHeat * 0.25, '3D exploding mesh cools from bright fire into dark charcoal smoke');

    // 4. 3D ruptured barrel stump, charred atlas cell, flying shrapnel staves, and ballistic pose
    const bAtlas = barrelAtlas();
    assert.ok(bAtlas.char && bAtlas.char.x === 192 && bAtlas.char.width === 64, 'barrelAtlas includes the 4th 64x64 charred interior/scorch cell');
    const wreck = barrelWreckMesh(new Vec2(9.5, 26));
    assert.ok(wreck.vertices.length > 300 && wreck.vertices.length % 9 === 0, 'barrelWreckMesh builds valid 3D triangle geometry');
    assert.equal(wreck.normals.length, wreck.vertices.length, 'barrelWreckMesh has matching vertex normals');
    assert.equal(wreck.uvs.length, (wreck.vertices.length / 3) * 2, 'barrelWreckMesh has matching UVs');
    let hasOuterSkin = false;
    let hasCharSkin = false;
    for (let i = 0; i < wreck.uvs.length; i += 2) {
      if (wreck.uvs[i] < 0.5)
        hasOuterSkin = true;
      if (wreck.uvs[i] >= 0.75)
        hasCharSkin = true;
    }
    assert.ok(hasOuterSkin && hasCharSkin, 'barrelWreckMesh maps both outer hazard drum skin and charred interior/scorch cell');

    const shrapnel = barrelShrapnelParts(new Vec2(9.5, 26));
    assert.ok(shrapnel.lid.vertices.length > 0 && shrapnel.lid.normals.length === shrapnel.lid.vertices.length, 'barrelShrapnelParts builds 3D warped lid mesh');
    assert.equal(shrapnel.staves.length, BARREL_STAVE_COUNT, 'barrelShrapnelParts builds 5 curved 3D metal staves');
    for (const stave of shrapnel.staves) {
      assert.ok(stave.vertices.length > 0 && stave.vertices.length % 9 === 0, 'each barrel stave is a 3D triangle mesh');
      assert.equal(stave.normals.length, stave.vertices.length, 'each barrel stave has vertex normals');
    }

    const barrelTarget = createBarrelExplosionPose();
    const bLaunch = barrelExplosionPose(0.01, 7, barrelTarget);
    assert.equal(bLaunch, barrelTarget, 'barrelExplosionPose reuses pre-allocated target');
    const bLaunchLidY = bLaunch.lid.pos.y;
    const bLaunchStaveR = bLaunch.staves.map((s) => Math.hypot(s.pos.x, s.pos.z));

    const bJolt = barrelExplosionPose(0.09, 7);
    assert.ok(bJolt.wreckScale.x > 1.1 && bJolt.wreckScale.y < 0.92, 'ruptured barrel stump squashes and bulges outward on detonation');

    const bAir = barrelExplosionPose(0.18, 7);
    assert.ok(bAir.lid.pos.y > bLaunchLidY + 12, 'warped barrel lid blasts high into the air');
    for (let i = 0; i < BARREL_STAVE_COUNT; i++)
      assert.ok(Math.hypot(bAir.staves[i].pos.x, bAir.staves[i].pos.z) > bLaunchStaveR[i] + 5, `stave ${i} launches radially outward`);

    const bRest = barrelExplosionPose(1.5, 7, barrelTarget);
    assert.ok(Math.abs(bRest.wreckScale.x - 1) < 1e-4 && Math.abs(bRest.wreckScale.y - 1) < 1e-4, 'barrel stump settles to scale (1,1,1)');
    assert.ok(bRest.lid.pos.y <= 2.5, 'warped barrel lid bounces and settles on the floor');
    for (let i = 0; i < BARREL_STAVE_COUNT; i++) {
      assert.ok(bRest.staves[i].pos.y <= 2.5, `stave ${i} settles on the floor`);
      assert.ok(Math.hypot(bRest.staves[i].pos.x, bRest.staves[i].pos.z) > 15, `stave ${i} rests scattered around the barrel wreck`);
    }

    // 5. Detonating a barrel in Game tracks barrel.deadTime while keeping its position for persistent 3D wreck rendering
    const game = fresh();
    const barrel = game.barrels[0];
    assert.equal(barrel.deadTime, 0, 'intact barrel starts with deadTime = 0');
    game.detonate(barrel);
    assert.equal(barrel.gone, true, 'detonated barrel is marked gone');
    assert.equal(barrel.deadTime, 0, 'detonated barrel starts deadTime at 0');
    run(game, 0.5);
    assert.ok(barrel.deadTime >= 0.48, 'updateBarrels advances deadTime on spent barrels for 3D shrapnel & wreck animation');
  },

  'Night Vision Goggles (N) provide a 3D binocular pickup, rechargeable battery toggle, and cut through Martian fog'() {
    // 1. 3D Night Vision Goggles atlas and mesh
    const nvgAtlas = nightvisionAtlas();
    assert.equal(nvgAtlas.name, 'nightvision');
    assert.equal(nvgAtlas.width, POWERUP_CELL * POWERUP_FRAMES);
    assert.equal(nvgAtlas.height, POWERUP_CELL);
    let emeraldPixels = 0;
    for (let i = 0; i < nvgAtlas.data.length; i += 4)
      if (nvgAtlas.data[i + 3] === 255 && nvgAtlas.data[i + 1] > nvgAtlas.data[i] + 60)
        emeraldPixels++;
    assert.ok(emeraldPixels > 60, 'nightvisionAtlas has glowing emerald phosphor objective lenses');

    const nvgGeo = nightvisionMesh();
    assert.ok(nvgGeo.vertices instanceof Float32Array && nvgGeo.vertices.length >= 7 * 36 * 3, 'nightvisionMesh has 3D housing, twin lens tubes, IR module, and strap');
    assert.equal(nvgGeo.uvs.length, (nvgGeo.vertices.length / 3) * 2, 'nightvisionMesh has matching UVs');

    // 2. E1M5 spawns Night Vision Goggles right outside the starting airlock door and in the Martian wastes
    const marsGame = fresh(4);
    const nvgPickups = marsGame.pickups.filter((p) => p.type === 'nightvision');
    assert.ok(nvgPickups.length >= 3, `expected >= 3 nightvision pickups on E1M5, got ${nvgPickups.length}`);
    const airlockNvg = nvgPickups.find((p) => Math.floor(p.pos.x / 64) === 9 && Math.floor(p.pos.y / 64) === 3);
    assert.ok(airlockNvg, 'E1M5 places Night Vision Goggles right outside the starting airlock door at (9, 3)');

    // 3. Picking up Night Vision Goggles activates night vision, charges battery, and pushes Mars fog far back
    assert.equal(marsGame.player.hasNightVision, false);
    assert.equal(marsGame.player.nightVisionActive, false);
    marsGame.touch({ ref: airlockNvg });
    assert.equal(airlockNvg.taken, true);
    assert.equal(marsGame.player.hasNightVision, true);
    assert.equal(marsGame.player.nightVisionActive, true);
    assert.equal(marsGame.player.nightVisionBattery, POWERUP_TYPES.nightvision.duration);

    const fogTarget = new Vec2();
    const outdoorPos = new Vec2(10 * 64 + 32, 3 * 64 + 32);
    const stormFog = marsFogNearFar(marsGame.level, outdoorPos, fogTarget, false).clone();
    const nvgFog = marsFogNearFar(marsGame.level, outdoorPos, fogTarget, true);
    assert.equal(nvgFog, fogTarget, 'marsFogNearFar reuses pre-allocated target Vec2');
    assert.ok(nvgFog.x > stormFog.x * 10 && nvgFog.y > stormFog.y * 6, `Night Vision cuts through Martian outdoor fog (${stormFog.x}..${stormFog.y} -> ${nvgFog.x}..${nvgFog.y})`);
    assert.equal(nvgFog.x, MARS_NVG_FOG.x);
    assert.equal(nvgFog.y, MARS_NVG_FOG.y);

    // 4. Battery drains while active, toggles off with N (input.nightVision), and recharges while inactive
    run(marsGame, 10);
    const drained = marsGame.player.nightVisionBattery;
    assert.ok(drained < POWERUP_TYPES.nightvision.duration - 9 && drained > POWERUP_TYPES.nightvision.duration - 11, `battery drains while active (${drained})`);

    marsGame.update(1 / 60, input({ nightVision: true }));
    assert.equal(marsGame.player.nightVisionActive, false, 'pressing N toggles Night Vision OFF');
    assert.equal(marsGame.player.nightVision, 0);

    run(marsGame, 6);
    assert.ok(marsGame.player.nightVisionBattery > drained + 2, `battery recharges while switched off (${drained} -> ${marsGame.player.nightVisionBattery})`);

    marsGame.update(1 / 60, input({ nightVision: true }));
    assert.equal(marsGame.player.nightVisionActive, true, 'pressing N toggles Night Vision back ON');

    // 5. Auto-shutoff when battery reaches 0
    marsGame.player.nightVisionBattery = 0.2;
    run(marsGame, 0.5);
    assert.equal(marsGame.player.nightVisionActive, false, 'Night Vision auto-shuts off when battery depletes');
  },

  'E1M5 fog occlusion, shader early-outs, entity/particle/light distance culling, and minimap fog range'() {
    // 1. All fragment shaders blend 100% into uFogColor at uFogFar (no 0.9 cap), suppress bloom alpha under fog,
    // and heavy surface shaders early-return at vDepth >= uFogFar.
    const allFogShaders = [
      ['LINE_FRAGMENT', LINE_FRAGMENT],
      ['SPRITE_FRAGMENT', SPRITE_FRAGMENT],
      ['MONSTER_FRAGMENT', MONSTER_FRAGMENT],
      ['EXPLOSION_3D_FRAGMENT', EXPLOSION_3D_FRAGMENT],
      ['TEXTURED_FRAGMENT', TEXTURED_FRAGMENT],
      ['SOLID_TEXTURED_FRAGMENT', SOLID_TEXTURED_FRAGMENT],
      ['PARTICLE_FRAGMENT', PARTICLE_FRAGMENT],
      ['DOOR_FRAGMENT', DOOR_FRAGMENT],
      ['WALL_FRAGMENT', WALL_FRAGMENT],
      ['FLOOR_FRAGMENT', FLOOR_FRAGMENT],
      ['SLIME_FRAGMENT', SLIME_FRAGMENT],
      ['TELEPORTER_FRAGMENT', TELEPORTER_FRAGMENT],
      ['CRATE_FRAGMENT', CRATE_FRAGMENT],
      ['MARS_DIRT_FRAGMENT', MARS_DIRT_FRAGMENT],
      ['MARS_ROCK_FRAGMENT', MARS_ROCK_FRAGMENT],
      ['CEILING_FRAGMENT', CEILING_FRAGMENT],
    ];
    for (const [name, src] of allFogShaders) {
      assert.ok(!src.includes('fade * 0.9'), `${name} does not cap fog at 90%`);
      assert.ok(src.includes('mix(color, uFogColor,'), `${name} mixes to full uFogColor`);
    }
    assert.ok(
      MONSTER_FRAGMENT.includes('emissive * (1.0 - fogFade) > 0.5'),
      'MONSTER_FRAGMENT suppresses emissive bloom alpha when occluded by fog'
    );
    assert.ok(
      EXPLOSION_3D_FRAGMENT.includes('localTemp * (1.0 - fogFade) >'),
      'EXPLOSION_3D_FRAGMENT suppresses explosion bloom alpha when occluded by fog'
    );
    const earlyOutSurfaceShaders = [
      ['DOOR_FRAGMENT', DOOR_FRAGMENT],
      ['WALL_FRAGMENT', WALL_FRAGMENT],
      ['FLOOR_FRAGMENT', FLOOR_FRAGMENT],
      ['SLIME_FRAGMENT', SLIME_FRAGMENT],
      ['TELEPORTER_FRAGMENT', TELEPORTER_FRAGMENT],
      ['CRATE_FRAGMENT', CRATE_FRAGMENT],
      ['MARS_DIRT_FRAGMENT', MARS_DIRT_FRAGMENT],
      ['MARS_ROCK_FRAGMENT', MARS_ROCK_FRAGMENT],
      ['CEILING_FRAGMENT', CEILING_FRAGMENT],
    ];
    for (const [name, src] of earlyOutSurfaceShaders)
      assert.ok(src.includes('uHasFog == 1 && vDepth >= uFogFar'), `${name} has fast vDepth >= uFogFar early-out`);

    // 2. Minimap Fog cone range on Mars matches active fog visibility (tight outdoors in sandstorm, wider indoors / with NVG)
    const marsGame = fresh(4);
    assert.equal(marsGame.level.planet, 'mars');
    // Player starts inside the enclosed airlock at (2, 3) facing east (+X)
    assert.equal(marsGame.level.isOutdoor(marsGame.player.pos), false);
    assert.equal(marsGame.fogConeRange(), MARS_INDOOR_FOG.y / 64, 'indoor Mars airlock uses indoor fog cone range (15 tiles)');

    // Move player outdoors into an open corridor on Mars with no Night Vision
    marsGame.player.pos.setScalar(10 * 64 + 32, 3 * 64 + 32);
    marsGame.player.body.setPosition(marsGame.player.pos);
    marsGame.player.angle = 0;
    marsGame.player.nightVisionActive = false;
    assert.equal(marsGame.level.isOutdoor(marsGame.player.pos), true);
    const outdoorRange = marsGame.fogConeRange();
    assert.equal(outdoorRange, MARS_OUTDOOR_FOG.y / 64, 'outdoor Mars dust storm restricts minimap cone range (~4.06 tiles)');
    marsGame.fog.explored.fill(0);
    marsGame.fog.exploredCount = 0;
    marsGame.fog.update(marsGame.player.pos.x, marsGame.player.pos.y, 0, outdoorRange);
    // Tile (12, 3) is 2 tiles ahead (visible in storm), while tile (17, 3) is 7 tiles ahead (beyond storm fog)
    assert.equal(marsGame.fog.isVisible(3 * marsGame.level.width + 12), true, 'nearby tile within storm fog is visible on minimap');
    assert.equal(marsGame.fog.isVisible(3 * marsGame.level.width + 17), false, 'distant tile beyond storm fog is hidden on minimap');

    // Enabling Night Vision Goggles restores long-range minimap sight
    marsGame.player.hasNightVision = true;
    marsGame.player.nightVisionActive = true;
    marsGame.player.nightVisionBattery = 30;
    assert.equal(marsGame.fogConeRange(), 20, 'Night Vision restores full 20-tile minimap cone range on Mars');

    // 3. Dynamic & ceiling light distance culling via maxRadius
    const camPos = new Vec3(marsGame.player.pos.x, 28, marsGame.player.pos.y);
    marsGame.shots.push({
      kind: 'rocket',
      pos: new Vec2(marsGame.player.pos.x + 500, marsGame.player.pos.y),
      age: 0.1,
      life: 3,
    });
    const uncappedLights = collectDynamicLights(marsGame, camPos, 1.0);
    const fogCappedLights = collectDynamicLights(marsGame, camPos, 1.0, MARS_OUTDOOR_FOG.y + 64);
    assert.equal(uncappedLights.length, 1, 'distant rocket light is collected when uncapped');
    assert.equal(fogCappedLights.length, 0, 'distant rocket light beyond fog cull radius is skipped');

    // 4. World.prototype.updateEnemy and syncParticleSprites distance-culling beyond fogNearFar.y
    let enemyActive = true;
    let animated = false;
    const fakeEnemyView = {
      lastTime: 0,
      brightness: 1,
      scale: 1,
      lift: 0,
      sx: 1,
      sy: 1,
      material: { setDiffuse() {} },
      root: {
        setActive() {
          enemyActive = true;
        },
        setInactive() {
          enemyActive = false;
        },
        setPosition() {},
        setRotation() {},
        setScale() {},
      },
    };
    const farEnemy = {
      type: 'imp',
      state: 'idle',
      pos: new Vec2(marsGame.player.pos.x + 600, marsGame.player.pos.y),
      hurt: 0,
      pain: 0,
    };
    const cullDist = MARS_OUTDOOR_FOG.y + 64;
    const cullDistSq = cullDist * cullDist;
    // Prime scratchCam2d via syncParticleSprites on a lightweight mock World context
    const drawnDrops = [];
    const drawnDust = [];
    const mockWorld = {
      cutaway: false,
      fogNearFar: new Vec2(MARS_OUTDOOR_FOG.x, MARS_OUTDOOR_FOG.y),
      camera: {
        position: camPos,
        target: new Vec3(camPos.x + 1, camPos.y, camPos.z),
        up: new Vec3(0, 1, 0),
      },
      droplets: {
        begin() {
          drawnDrops.length = 0;
          return {
            quad(corners) {
              drawnDrops.push(corners);
              return true;
            },
            end() {},
          };
        },
      },
      dust: {
        begin() {
          drawnDust.length = 0;
          return {
            quad(corners) {
              drawnDust.push(corners);
              return true;
            },
            end() {},
          };
        },
      },
      doorMarks: new Map(),
    };
    World.prototype.syncParticleSprites.call(
      mockWorld,
      {
        particles: [
          { x: camPos.x + 80, y: camPos.z, z: 16, size: 2, age: 0.1, vx: 1 },
          { x: camPos.x + 500, y: camPos.z, z: 16, size: 2, age: 0.1, vx: 1 },
        ],
      },
      [
        { x: camPos.x + 100, y: camPos.z, z: 20, size: 2.5, age: 0.2, vx: 10 },
        { x: camPos.x + 450, y: camPos.z, z: 20, size: 2.5, age: 0.2, vx: 10 },
      ]
    );
    assert.equal(drawnDrops.length, 1, 'syncParticleSprites culls blood droplets beyond fogNearFar.y + 16');
    assert.equal(drawnDust.length, 1, 'syncParticleSprites culls Martian dust particles beyond fogNearFar.y + 16');

    World.prototype.updateEnemy.call(mockWorld, farEnemy, fakeEnemyView, marsGame.player, 2.5, marsGame, cullDistSq);
    assert.equal(enemyActive, false, 'updateEnemy deactivates distant enemy mesh beyond fog cull distance');
    assert.equal(fakeEnemyView.lastTime, 2.5, 'updateEnemy still advances view.lastTime while culled so dt does not spike on re-entry');

    // Door marks are hidden without rebuilding when a distant door is culled
    let holesShown = true;
    let splatsShown = true;
    const doorRef = {};
    mockWorld.doorMarks.set(doorRef, {
      holes: { show(v) { holesShown = v; } },
      splats: { show(v) { splatsShown = v; } },
    });
    World.prototype.syncDoorMarks.call(mockWorld, doorRef, marsGame.blood, false);
    assert.equal(holesShown, false, 'syncDoorMarks hides door bullet holes when door is fog-culled');
    assert.equal(splatsShown, false, 'syncDoorMarks hides door blood splats when door is fog-culled');
  },

  'line-of-sight occlusion culling (Fog.canSeeNear) hides entities, particles, and lights behind walls/closed doors and orders wall occluders first'() {
    // 1. Fog.canSeeNear(pos: Vec2) blocks visibility behind closed doors and walls (even 1 tile behind),
    //    and immediately reveals the room as soon as a door cracks open.
    const game = fresh(0);
    clearEnemies(game);
    const { level, fog } = game;
    const door = [...level.doors.values()].find((d) => d.x === 5 && d.y === 3);
    assert.ok(door, 'E1M1 has a door at (5, 3)');

    // Stand at (3, 3) facing east (+X) toward the closed door at (5, 3)
    game.player.pos.setScalar(3 * 64 + 32, 3 * 64 + 32);
    game.player.body.setPosition(game.player.pos);
    game.player.angle = 0;
    level.setDoorOpen(door, 0);
    fog.update(game.player.pos.x, game.player.pos.y, 0);

    const inFrontOfDoor = new Vec2(4 * 64 + 32, 3 * 64 + 32);
    const onClosedDoor = door.center;
    const oneTileBehindDoor = new Vec2(6 * 64 + 32, 3 * 64 + 32);
    const twoTilesBehindDoor = new Vec2(7 * 64 + 32, 3 * 64 + 32);

    assert.equal(fog.canSeeNear(inFrontOfDoor), true, 'tile in front of closed door is visible');
    assert.equal(fog.canSeeNear(onClosedDoor), true, 'the closed door tile itself is visible');
    assert.equal(
      fog.canSeeNear(oneTileBehindDoor),
      false,
      'tile immediately behind closed door (6, 3) is occluded even with 1-tile neighbor check because closed door blocks sight'
    );
    assert.equal(fog.canSeeNear(twoTilesBehindDoor), false, 'room further behind closed door is occluded');

    // Crack the door open slightly (5%): sight immediately passes through the upper doorway gap so nothing pops in
    level.setDoorOpen(door, 0.05);
    fog.update(game.player.pos.x, game.player.pos.y, 0);
    assert.equal(fog.canSeeNear(oneTileBehindDoor), true, 'cracking the door open 5% immediately makes the tile behind it visible');
    assert.equal(fog.canSeeNear(twoTilesBehindDoor), true, 'cracking the door open 5% immediately reveals the hall behind it');

    // Close the door again to verify entity, particle, and light occlusion behind it
    level.setDoorOpen(door, 0);
    fog.update(game.player.pos.x, game.player.pos.y, 0);

    // 2. Dynamic lights and ceiling lights behind a closed door or wall are culled when fog is provided
    const camPos = new Vec3(game.player.pos.x, EYE, game.player.pos.y);
    game.shots.length = 0;
    game.shots.push({
      kind: 'rocket',
      pos: oneTileBehindDoor.clone(),
      age: 0.1,
      life: 2,
    });
    assert.equal(collectDynamicLights(game, camPos, 1.0, Infinity, null).length, 1, 'rocket light behind door is collected when fog is omitted');
    assert.equal(collectDynamicLights(game, camPos, 1.0, Infinity, fog).length, 0, 'rocket light behind closed door is occluded when fog is passed');

    const mockScene = { addLight() {}, clearLights() {} };
    const { pointLights } = createCeilingLights(mockScene, 2);
    const hiddenFixture = {
      tile: new Vec2(7, 3),
      position: new Vec3(7 * 64 + 32, 62, 3 * 64 + 32),
      phase: 0,
      flicker: false,
    };
    const visibleFixture = {
      tile: new Vec2(3, 3),
      position: new Vec3(3 * 64 + 32, 62, 3 * 64 + 32),
      phase: 0,
      flicker: false,
    };
    game.shots.length = 0;
    updateCeilingLights(pointLights, [hiddenFixture, visibleFixture], camPos, 1.0, game, Infinity, fog);
    assert.equal(pointLights[0].position.x, visibleFixture.position.x, 'visible ceiling fixture claims slot 0');
    assert.equal(pointLights[1].diffuse.x, 0, 'occluded ceiling fixture behind closed door is not assigned to active light slot');

    // 3. updateEnemy and syncParticleSprites cull nearby objects hidden behind a closed door/wall
    let enemyActive = true;
    const fakeEnemyView = {
      lastTime: 0,
      brightness: 1,
      scale: 1,
      lift: 0,
      sx: 1,
      sy: 1,
      material: { setDiffuse() {} },
      root: {
        setActive() {
          enemyActive = true;
        },
        setInactive() {
          enemyActive = false;
        },
        setPosition() {},
        setRotation() {},
        setScale() {},
      },
    };
    const occludedEnemy = {
      type: 'imp',
      state: 'idle',
      pos: oneTileBehindDoor.clone(),
      hurt: 0,
      pain: 0,
    };
    const drawnDrops = [];
    const mockWorld = {
      cutaway: false,
      fogNearFar: new Vec2(260, 1500),
      camera: {
        position: camPos,
        target: new Vec3(camPos.x + 1, camPos.y, camPos.z),
        up: new Vec3(0, 1, 0),
      },
      droplets: {
        begin() {
          drawnDrops.length = 0;
          return {
            quad(corners) {
              drawnDrops.push(corners);
              return true;
            },
            end() {},
          };
        },
      },
      dust: null,
    };
    World.prototype.syncParticleSprites.call(
      mockWorld,
      {
        particles: [
          { x: inFrontOfDoor.x, y: inFrontOfDoor.y, z: 16, size: 2, age: 0.1, vx: 1 },
          { x: oneTileBehindDoor.x, y: oneTileBehindDoor.y, z: 16, size: 2, age: 0.1, vx: 1 },
        ],
      },
      null,
      fog
    );
    assert.equal(drawnDrops.length, 1, 'syncParticleSprites culls blood droplet behind closed door even though it is within distance range');

    World.prototype.updateEnemy.call(mockWorld, occludedEnemy, fakeEnemyView, game.player, 3.0, game, 1500 * 1500, fog);
    assert.equal(enemyActive, false, 'updateEnemy deactivates nearby enemy occluded behind closed door');

    // 4. World.prototype.buildStatic registers wall occluders before floor/ceiling/crate batches for hardware Early-Z rejection
    const buildOrder = [];
    const orderMockWorld = {
      staticMeshes: [],
      lightFixtures: [],
      cutaway: false,
      track(mesh, bucket) {
        bucket.push(mesh);
        buildOrder.push(mesh.name ?? mesh);
        return mesh;
      },
      marsSkyBatch: () => 'sky',
      wallBatch: (_faces, marsRock) => ({ name: marsRock ? 'outdoorWalls' : 'walls', setInactive() {} }),
      solid: () => 'solidHide',
      floorBatch: () => 'floor',
      marsDirtBatch: () => 'marsDirt',
      slimeBatch: () => 'slime',
      teleporterBatch: () => 'teleporter',
      crateBatch: () => 'crate',
      marsBoulderBatch: () => 'marsBoulder',
      ceilingBatch: () => 'ceiling',
      lightConesBatch: () => 'lightCones',
    };
    World.prototype.buildStatic.call(orderMockWorld, level);
    const wallIdx = buildOrder.indexOf('walls');
    const solidIdx = buildOrder.indexOf('solidHide');
    const floorIdx = buildOrder.indexOf('floor');
    const crateIdx = buildOrder.indexOf('crate');
    const ceilingIdx = buildOrder.indexOf('ceiling');
    assert.ok(wallIdx >= 0 && wallIdx < floorIdx, 'walls are registered before floor for Early-Z occlusion');
    assert.ok(solidIdx >= 0 && solidIdx < floorIdx, 'solid wall blockers are registered before floor for Early-Z occlusion');
    assert.ok(wallIdx < crateIdx && wallIdx < ceilingIdx, 'walls are registered before crates and ceiling for Early-Z occlusion');
    assert.ok(orderMockWorld.staticChunks.length > 4, 'static level walls and floors are partitioned into spatial sector chunks for frustum/fog culling');
    assert.ok(
      LINE_FRAGMENT.includes(`gl_FragColor = vec4(color, ${SOLID_ALPHA});`),
      'solid wall hiders write SOLID_ALPHA so post-processing never blooms Mars fog color into glowing yellow'
    );
    assert.ok(
      !LINE_VERTEX.includes('v.z +='),
      'solid wall hiders stay at true depth behind DOOR_VERTEX wall quads and never z-fight with textured walls'
    );
    assert.ok(
      LIGHT_GLSL.includes('distSq > 160000.0') && LIGHT_GLSL.includes('diff.x + diff.y + diff.z <= 0.001'),
      'LIGHT_GLSL skips inactive lights and distant lights beyond 400 units before computing sqrt'
    );
    assert.ok(
      MONSTER_FRAGMENT.includes('uHasFog == 1 && vDepth >= uFogFar') &&
        TEXTURED_FRAGMENT.includes('uHasFog == 1 && vDepth >= uFogFar') &&
        CEILING_CONE_FRAGMENT.includes('uHasFog == 1 && vDepth >= uFogFar'),
      'MONSTER_FRAGMENT, TEXTURED_FRAGMENT, and CEILING_CONE_FRAGMENT early-out beyond fog far distance'
    );

    // 5. Monster gore skin swap uses pre-cached shared WebGLTexture without re-uploading via setTexture
    let sharedTexCalls = 0;
    let uploadCalls = 0;
    const sharedWorld = {
      gl: { NEAREST: 9728 },
      scene: { addMesh() {} },
      material: () => new Material(),
      sharedTexture: (atlas) => ({ atlas }),
      monsterPartMesh: () => {
        const m = new Mesh(null, new CustomMesh());
        m.setSharedTexture = (tex) => {
          sharedTexCalls++;
          m.WebGLTexture = tex;
        };
        m.setTexture = () => {
          uploadCalls++;
        };
        return m;
      },
    };
    const testEnemy = {
      type: 'imp',
      def: ENEMY_TYPES.imp,
      hp: ENEMY_TYPES.imp.hp,
      pos: new Vec2(100, 100),
      body: { velocity: new Vec2(0, 0) },
      state: 'chase',
      walk: 0,
      phase: 0,
      windup: 0,
      roar: 0,
      hurt: 0,
      pain: 0,
      leap: 0,
      deadTime: 0,
      gibbed: false,
      inSlime: false,
    };
    const sharedView = MONSTERS.imp.build(sharedWorld, testEnemy);
    testEnemy.hp = 1;
    MONSTERS.imp.animate(sharedView, testEnemy, { time: 1.0, dt: 1 / 60, player: { pos: new Vec2(160, 100) } });
    assert.equal(uploadCalls, 0, 'monster gore skin swap performs zero gl.texImage2D uploads when sharedTexture is cached');
    assert.equal(sharedTexCalls, 16, 'monster gore skin swap rebinds all 16 sub-meshes to the cached gore WebGLTexture');

    // 6. Level & Fog delegate spatial tile indexing to Spock Grid, and World.registerStaticChunk reads BoundingSphere.center
    const e1m1 = new Level(LEVELS[0]);
    assert.ok(e1m1.grid, 'Level initializes a Spock Grid instance');
    assert.equal(e1m1.grid.getCell(new Vec2(3 * 64 + 10, 2 * 64 + 10)), 2 * e1m1.width + 3, 'Level.grid.getCell resolves tile index');
    const e1m1Fog = new Fog(e1m1);
    assert.equal(e1m1Fog.grid, e1m1.grid, 'Fog reuses Level.grid');
    assert.equal(e1m1Fog.tileIndex(3 * 64 + 10, 2 * 64 + 10), 2 * e1m1.width + 3, 'Fog.tileIndex delegates to Spock Grid');

    const chunks = [];
    const chunkGeom = new CustomMesh();
    chunkGeom.setVertices([new Vec3(64, 0, 128), new Vec3(128, 32, 192), new Vec3(64, 32, 128)]);
    const mockGl = { createBuffer: () => ({}), bindBuffer() {}, bufferData() {}, UNSIGNED_SHORT: 5123 };
    const chunkMesh = new Mesh(mockGl, chunkGeom);
    registerStaticChunk(chunks, chunkMesh, new Vec2(0, 0), 32);
    assert.equal(chunks.length, 1, 'registerStaticChunk registers chunk');
    assert.ok(
      chunks[0].center.x > 0 && chunks[0].center.y > 0,
      'registerStaticChunk reads BoundingSphere.center coordinates cleanly'
    );
  },

  'LoopR FPS counter: Player.getFPS feeds Hud.fps and renders current FPS on DoomR screen and automap'() {
    const clock = new Clock();
    clock.start();
    const t0 = clock.now ?? 0;
    clock.computeDelta(t0 + 1000 / 60);
    clock.tick(t0 + 1000 / 60);
    assert.equal(Math.round(clock.computeAverageFPS()), 60, 'LoopR Clock computes 60 FPS from a 16.67ms frame');

    const loop = new Player(() => {});
    assert.equal(loop.getFPS(), 0, 'LoopR Player starts at 0 FPS before frames run');

    const texts = [];
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {},
          clearRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
          fillRect() {},
          fillText(str) {
            texts.push(str);
          },
        };
      },
    };
    const mockOverlay = {
      clear() {},
      glow: { line() {} },
      crisp: {
        fillRect() {},
        rectLine() {},
        line() {},
        circleLine() {},
        weapon: { quad() {} },
        sprites: { quad() {} },
        face: { quad() {} },
      },
    };

    const game = fresh(0);
    const hud = new Hud(mockCanvas, mockOverlay);
    hud.resize(1280, 760, 1);
    hud.fps = clock.computeAverageFPS();
    hud.render(game);
    assert.ok(texts.includes('60 FPS'), 'Hud renders current LoopR FPS on the DoomR screen');

    texts.length = 0;
    hud.toggleAutomap(game);
    hud.render(game);
    assert.ok(texts.some((t) => t.includes('FPS 60')), 'Hud automap header telemetry includes current LoopR FPS');
  },

  'Input uses @dwtechs/ctrltab Keyboard with X for fire and physical key codes across layouts'() {
    const prevDoc = globalThis.document;
    const prevWin = globalThis.window;
    globalThis.document = { addEventListener() {}, pointerLockElement: null };
    globalThis.window = { addEventListener() {} };
    try {
      const mockCanvas = { addEventListener() {} };
      const inp = new Input(mockCanvas);

      // Hold W (87) + Shift (16) -> forward + run
      globalThis.document.onkeydown({ code: 'KeyW', which: 87, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
      globalThis.document.onkeydown({ code: 'ShiftLeft', which: 16, shiftKey: true, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
      let c = inp.poll();
      assert.equal(c.forward, 1);
      assert.equal(c.run, true);
      inp.endFrame();

      // Press X (88) to fire while strafing right with D (68)
      globalThis.document.onkeydown({ code: 'KeyX', which: 88, shiftKey: true, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
      globalThis.document.onkeydown({ code: 'KeyD', which: 68, shiftKey: true, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
      c = inp.poll();
      assert.equal(c.fire, true);
      assert.equal(c.strafe, 1);
      assert.equal(c.forward, 1);
      inp.endFrame();

      // Release X (88) and D (68) -> fire stops, strafe stops, W keeps moving forward
      globalThis.document.onkeyup({ code: 'KeyX', which: 88, metaKey: false });
      globalThis.document.onkeyup({ code: 'KeyD', which: 68, metaKey: false });
      c = inp.poll();
      assert.equal(c.fire, false);
      assert.equal(c.strafe, 0);
      assert.equal(c.forward, 1);
      globalThis.document.onkeyup({ code: 'KeyW', which: 87, metaKey: false });
      inp.endFrame();

      // Physical key layout (AZERTY vs QWERTY): event.code 'KeyA' (which=81 on AZERTY) maps to KeyA (strafe left),
      // while physical Q ('KeyQ' with which=65 on AZERTY) does not falsely trigger KeyA
      globalThis.document.onkeydown({ code: 'KeyQ', which: 65, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
      c = inp.poll();
      assert.equal(c.strafe, 0, 'physical KeyQ on AZERTY (which=65) does not trigger KeyA strafe');
      globalThis.document.onkeydown({ code: 'KeyA', which: 81, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
      c = inp.poll();
      assert.equal(c.strafe, -1, 'physical KeyA on AZERTY (which=81) triggers KeyA strafe left');
      globalThis.document.onkeyup({ code: 'KeyA', which: 81, metaKey: false });
      c = inp.poll();
      assert.equal(c.strafe, 0, 'releasing physical KeyA stops strafing');
      inp.endFrame();

      // Weapon selection 1-4 (top row Digit1-4 and Numpad1-4)
      for (const [digitCode, expectedSlot] of [['Digit1', 1], ['Digit2', 2], ['Digit3', 3], ['Digit4', 4], ['Numpad2', 2]]) {
        globalThis.document.onkeydown({ code: digitCode, which: 48 + expectedSlot, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
        c = inp.poll();
        assert.equal(c.weapon, expectedSlot, `${digitCode} selects weapon slot ${expectedSlot}`);
        globalThis.document.onkeyup({ code: digitCode, which: 48 + expectedSlot, metaKey: false });
        inp.endFrame();
      }
    } finally {
      globalThis.document = prevDoc;
      globalThis.window = prevWin;
    }
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
