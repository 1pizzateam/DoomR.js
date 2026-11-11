import assert from 'node:assert/strict';
import { Vec2, Vec3 } from '@1pizzateam/spock';
import { LEVELS } from '../src/levels.js';
import { CEILING, DESK_WALL_OFFSET, DIAG_NE, DIAG_NW, DIAG_SE, DIAG_SW, DISPENSER_WALL_OFFSET, Level, PILLAR, TILE, WALL } from '../src/level.js';
import { chestBodyMesh, chestLidMesh, switchBodyMesh, switchLeverMesh } from '../src/cache.js';
import { createDeskBreakPose, createDispenserBreakPose, DESK_ATLAS, DESK_HP, DESK_SHARD_COUNT, deskAtlas, deskBreakPose, deskDebrisMesh, deskMesh, deskShrapnelParts, deskWreckMesh, DISPENSER_ATLAS, DISPENSER_HP, DISPENSER_SHARD_COUNT, dispenserAtlas, dispenserBreakPose, dispenserMesh, dispenserPuddleMesh, dispenserShrapnelParts, dispenserWreckMesh, FURNITURE_FRAGMENT, FURNITURE_VERTEX, SHADOW_ATLAS, SHADOW_FRAGMENT, SHADOW_VERTEX, shadowAtlas, writeFloorShadowQuad, writeWallShadowQuad } from '../src/furniture.js';
import { Game } from '../src/game.js';

console.log('# file: tests/levels.test.mjs');

let failed = false;

for (const def of LEVELS) {
  const level = new Level(def);
  const { width, rowCount } = level;
  const start = [Math.floor(level.playerStart.x / 64), Math.floor(level.playerStart.y / 64)];
  const seen = new Set([start.join()]);
  const queue = [start];
  while (queue.length) {
    const [x, y] = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (level.isWalkable(nx, ny) && !seen.has(`${nx},${ny}`)) {
        seen.add(`${nx},${ny}`);
        queue.push([nx, ny]);
      }
    }
  }
  const reachable = (pos) => seen.has(`${Math.floor(pos.x / 64)},${Math.floor(pos.y / 64)}`);
  const unreachable = [...level.enemies, ...level.pickups, ...level.chests, ...level.furnitures].filter((o) => !reachable(o.pos));
  const exitReachable = level.exits.some((e) => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has(`${Math.floor(e.x / 64) + dx},${Math.floor(e.y / 64) + dy}`)));
  const enclosed = level.rows[0].includes('.') || level.rows[rowCount - 1].includes('.');
  console.log(`${def.name}: ${width}x${rowCount}, ${level.enemies.length} enemies, ${level.pickups.length} pickups, ${level.chests.length} chests, ${level.furnitures.length} furnitures, ${level.doors.size} doors, exits ${level.exits.length}`);
  if (unreachable.length || !exitReachable || enclosed || !level.exits.length) {
    failed = true;
    console.log('  PROBLEM', { unreachable: unreachable.map((o) => o.type || 'chest'), exitReachable, enclosed });
  }
}

const testName = 'AC-1: secret rooms retain their entrance-door associations';
let hasSecretEntrance = false;
let hasDoorlessSecret = false;
let secretAssociationsValid = true;
for (const def of LEVELS) {
  const level = new Level(def);
  if (level.secretDoorByRoom.length !== level.secrets.length) {
    failed = true;
    secretAssociationsValid = false;
    console.log(`FAIL ${testName}: ${def.name} association count differs from secret count`);
  }
  for (let secretIndex = 0; secretIndex < level.secrets.length; secretIndex++) {
    const doorIdx = level.secretDoorByRoom[secretIndex];
    if (doorIdx < 0) {
      hasDoorlessSecret = true;
      continue;
    }
    const door = level.doors.get(doorIdx);
    if (!door || !door.secret || level.secretRoomByDoor.get(doorIdx) !== secretIndex) {
      failed = true;
      secretAssociationsValid = false;
      console.log(`FAIL ${testName}: ${def.name} secret ${secretIndex} has an invalid entrance`);
    }
    if (door?.secret)
      hasSecretEntrance = true;
  }
}
if (!hasSecretEntrance || !hasDoorlessSecret) {
  failed = true;
  secretAssociationsValid = false;
  console.log(`FAIL ${testName}: authored levels must cover secret and doorless entrances`);
}
if (secretAssociationsValid)
  console.log(`ok   ${testName}`);

const ac1TestName = 'AC-1 throws descriptive errors on malformed level rows, unknown tiles, and missing player start';
try {
  // 1. Row length mismatch (shorter row)
  assert.throws(
    () => new Level({
      name: 'RowMismatchShort',
      rows: [
        '#####',
        '#P..#',
        '#..#',
        '#####',
      ],
    }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, 'RowMismatchShort: row 2 has 4 tiles, expected 5');
      return true;
    },
  );

  // 2. Row length mismatch (longer row)
  assert.throws(
    () => new Level({
      name: 'RowMismatchLong',
      rows: [
        '#####',
        '#P...#',
        '#...#',
        '#####',
      ],
    }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, 'RowMismatchLong: row 1 has 6 tiles, expected 5');
      return true;
    },
  );

  // 3. Unknown tile character '?'
  assert.throws(
    () => new Level({
      name: 'UnknownTileChar',
      rows: [
        '#####',
        '#P.?#',
        '#...#',
        '#####',
      ],
    }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, 'UnknownTileChar: unknown tile "?" at 3,1');
      return true;
    },
  );

  // 4. Another unknown tile character '%'
  assert.throws(
    () => new Level({
      name: 'UnknownTilePercent',
      rows: [
        '#####',
        '#P..#',
        '#%.#',
        '#####',
      ],
    }),
    (err) => {
      assert.ok(err instanceof Error);
      // Row 2 is 4 tiles: row mismatch triggers before unknown tile if length mismatch, so ensure row length matches
      return true;
    },
  );
  assert.throws(
    () => new Level({
      name: 'UnknownTilePercentValidWidth',
      rows: [
        '#####',
        '#P..#',
        '#%..#',
        '#####',
      ],
    }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, 'UnknownTilePercentValidWidth: unknown tile "%" at 1,2');
      return true;
    },
  );

  // 5. Missing player start marker 'P'
  assert.throws(
    () => new Level({
      name: 'MissingPlayerStart',
      rows: [
        '#####',
        '#...#',
        '#...#',
        '#####',
      ],
    }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, 'MissingPlayerStart: no player start');
      return true;
    },
  );
  console.log(`ok   ${ac1TestName}`);
} catch (error) {
  failed = true;
  console.log(`FAIL ${ac1TestName}\n     ${error.message}`);
}

const ac5TestName = 'AC-5 secretAt, heightAtPoint, and setDoorOpen accurately evaluate spatial clearance and secret room queries';
try {
  // Test secretAt on authored Level 0
  const l0 = new Level(LEVELS[0]);
  assert.ok(l0.secrets.length > 0, 'Level 0 has secrets');
  const secretTileIdx = [...l0.secrets[0]][0];
  const stx = secretTileIdx % l0.width;
  const sty = (secretTileIdx - stx) / l0.width;
  const secretRoomIndex = l0.secretByTile[secretTileIdx];
  assert.ok(secretRoomIndex >= 0);

  // world coordinates inside secret tile
  const secretWorldPos = new Vec2((stx + 0.5) * TILE, (sty + 0.5) * TILE);
  assert.equal(l0.secretAt(secretWorldPos), secretRoomIndex);

  // non-secret floor position
  const startWorldPos = l0.playerStart.clone();
  assert.equal(l0.secretAt(startWorldPos), -1);

  // wall position
  assert.equal(l0.secretAt(new Vec2(0.5 * TILE, 0.5 * TILE)), -1);

  // out of bounds coordinates
  assert.equal(l0.secretAt(new Vec2(-10, -10)), -1);
  assert.equal(l0.secretAt(new Vec2(99999, 99999)), -1);

  // Test heightAtPoint and setDoorOpen with custom level
  const customDef = {
    name: 'SpatialClearanceLevel',
    rows: [
      '#######',
      '#P...D#',
      '#o...S#',
      '#◤.◥..#',
      '#◣.◢..#',
      '#######',
    ],
  };
  const custom = new Level(customDef);

  // Out of bounds heightAtPoint returns CEILING (64)
  assert.equal(custom.heightAtPoint(new Vec2(-5, -5)), CEILING);
  assert.equal(custom.heightAtPoint(new Vec2(1000, 1000)), CEILING);

  // Full wall heightAtPoint returns 64
  assert.equal(custom.heightAtPoint(new Vec2(0.5 * TILE, 0.5 * TILE)), 64);

  // Open floor heightAtPoint returns 0
  assert.equal(custom.heightAtPoint(new Vec2(1.5 * TILE, 1.5 * TILE)), 0);

  // Pillar ('o', baseHeight=26) returns 26
  const pillarPos = new Vec2(1.5 * TILE, 2.5 * TILE);
  assert.equal(custom.heightAtPoint(pillarPos), 26);

  // Diagonal wall tiles: test inside solid half-space vs open half-space
  // Row 3: '◤' at (1, 3), '◥' at (3, 3)
  // Row 4: '◣' at (1, 4), '◢' at (3, 4)
  // For DIAG_NW ('◤') at (1, 3): solid corner is NW corner (x=1*64, y=3*64).
  // Center is (96, 224). (68, 196) is near NW corner -> solid (height 64). (120, 250) is near SE corner -> open (height 0).
  const nwSolidPos = new Vec2(1 * TILE + 4, 3 * TILE + 4);
  const nwOpenPos = new Vec2(1 * TILE + 60, 3 * TILE + 60);
  assert.equal(custom.heightAtPoint(nwSolidPos), 64);
  assert.equal(custom.heightAtPoint(nwOpenPos), 0);

  // For DIAG_NE ('◥') at (3, 3): solid corner is NE corner (x=4*64, y=3*64).
  const neSolidPos = new Vec2(3 * TILE + 60, 3 * TILE + 4);
  const neOpenPos = new Vec2(3 * TILE + 4, 3 * TILE + 60);
  assert.equal(custom.heightAtPoint(neSolidPos), 64);
  assert.equal(custom.heightAtPoint(neOpenPos), 0);

  // For DIAG_SW ('◣') at (1, 4): solid corner is SW corner (x=1*64, y=5*64).
  const swSolidPos = new Vec2(1 * TILE + 4, 4 * TILE + 60);
  const swOpenPos = new Vec2(1 * TILE + 60, 4 * TILE + 4);
  assert.equal(custom.heightAtPoint(swSolidPos), 64);
  assert.equal(custom.heightAtPoint(swOpenPos), 0);

  // For DIAG_SE ('◢') at (3, 4): solid corner is SE corner (x=4*64, y=5*64).
  const seSolidPos = new Vec2(3 * TILE + 60, 4 * TILE + 60);
  const seOpenPos = new Vec2(3 * TILE + 4, 4 * TILE + 4);
  assert.equal(custom.heightAtPoint(seSolidPos), 64);
  assert.equal(custom.heightAtPoint(seOpenPos), 0);

  // Door clearance with setDoorOpen(door, open)
  const door = [...custom.doors.values()].find((d) => !d.secret);
  assert.ok(door);
  assert.equal(door.open, 0);
  assert.equal(custom.heights[door.idx], 64);

  // Test setDoorOpen across fractional and extreme values
  custom.setDoorOpen(door, 0.25);
  assert.equal(door.open, 0.25);
  assert.equal(custom.heights[door.idx], 48);
  assert.equal(custom.heightAtPoint(door.center), 48);

  custom.setDoorOpen(door, 0.5);
  assert.equal(door.open, 0.5);
  assert.equal(custom.heights[door.idx], 32);
  assert.equal(custom.heightAtPoint(door.center), 32);

  custom.setDoorOpen(door, 0.75);
  assert.equal(door.open, 0.75);
  assert.equal(custom.heights[door.idx], 16);
  assert.equal(custom.heightAtPoint(door.center), 16);

  custom.setDoorOpen(door, 1.0);
  assert.equal(door.open, 1.0);
  assert.equal(custom.heights[door.idx], 0);
  assert.equal(custom.heightAtPoint(door.center), 0);

  custom.setDoorOpen(door, 0.0);
  assert.equal(door.open, 0.0);
  assert.equal(custom.heights[door.idx], 64);
  assert.equal(custom.heightAtPoint(door.center), 64);

  console.log(`ok   ${ac5TestName}`);
} catch (error) {
  failed = true;
  console.log(`FAIL ${ac5TestName}\n     ${error.message}`);
}

const dispenserTestName = 'Water Dispenser furniture (d): builds 256x64 power-of-two RGBA atlas, 3D cooler & carboy mesh, and aligns against the wall near the elevator';
try {
  const atlas = dispenserAtlas();
  assert.equal(atlas.name, 'dispenser');
  assert.equal(atlas.width, DISPENSER_ATLAS.width);
  assert.equal(atlas.height, DISPENSER_ATLAS.height);
  assert.equal(atlas.width & (atlas.width - 1), 0, 'dispenserAtlas width is a power of two');
  assert.equal(atlas.height & (atlas.height - 1), 0, 'dispenserAtlas height is a power of two');
  assert.equal(atlas.data.length, atlas.width * atlas.height * 4);

  const mesh = dispenserMesh();
  assert.ok(mesh.vertices instanceof Float32Array && mesh.vertices.length > 300);
  assert.equal(mesh.normals.length, mesh.vertices.length);
  assert.equal(mesh.uvs.length, (mesh.vertices.length / 3) * 2);
  let maxY = 0;
  let minY = Infinity;
  for (let i = 1; i < mesh.vertices.length; i += 3) {
    if (mesh.vertices[i] > maxY)
      maxY = mesh.vertices[i];
    if (mesh.vertices[i] < minY)
      minY = mesh.vertices[i];
  }
  assert.equal(minY, 0, 'dispenser base rests on y = 0');
  assert.equal(maxY, 42, 'dispenser carboy top reaches y = 42');
  assert.match(FURNITURE_VERTEX, /aVertexNormal/, 'FURNITURE_VERTEX transforms 3D surface normals');
  assert.match(FURNITURE_FRAGMENT, /uAmbientLight/, 'FURNITURE_FRAGMENT applies room ambient light');
  assert.match(FURNITURE_FRAGMENT, /uLightPosition/, 'FURNITURE_FRAGMENT applies room point lights');
  assert.match(FURNITURE_FRAGMENT, /floorAo/, 'FURNITURE_FRAGMENT applies ground-contact self-shadowing');
  assert.match(FURNITURE_FRAGMENT, /overhangAo/, 'FURNITURE_FRAGMENT applies overhang/alcove self-shadowing');
  assert.doesNotMatch(FURNITURE_FRAGMENT, /cyanGlow|amberGlow|vec3\(1\.35\)/, 'FURNITURE_FRAGMENT has no self-illuminated emissive floor');

  const sAtlas = shadowAtlas();
  assert.equal(sAtlas.width, SHADOW_ATLAS.width);
  assert.equal(sAtlas.height, SHADOW_ATLAS.height);
  assert.equal(sAtlas.width & (sAtlas.width - 1), 0, 'shadowAtlas width is a power of two');
  assert.equal(sAtlas.height & (sAtlas.height - 1), 0, 'shadowAtlas height is a power of two');
  let maxShadowAlpha = 0;
  for (let i = 3; i < sAtlas.data.length; i += 4)
    if (sAtlas.data[i] > maxShadowAlpha)
      maxShadowAlpha = sAtlas.data[i];
  assert.ok(maxShadowAlpha > 150 && maxShadowAlpha <= 195, 'shadowAtlas alpha preserves post-FX solid tag (0.25 < out.a < 0.75)');
  assert.match(SHADOW_VERTEX, /aVertexPosition/);
  assert.match(SHADOW_FRAGMENT, /uSampler/);

  const floorCorners = new Array(12).fill(0);
  writeFloorShadowQuad(floorCorners, new Vec3(100, -0.175, 200), new Vec2(0.4, 0), new Vec3(10, 10, 35));
  assert.ok(floorCorners[6] > floorCorners[0] + 25, 'floor shadow stretches along +X away from the light');
  assert.equal(floorCorners[1], -0.175);

  const wallCorners = new Array(12).fill(0);
  writeWallShadowQuad(wallCorners, new Vec2(2, 3), 2, new Vec3(10, 38, 4));
  assert.equal(wallCorners[1], 0, 'wall shadow starts at floor height y = 0');
  assert.equal(wallCorners[7], 38, 'wall shadow reaches top height y = 38');

  for (const def of LEVELS) {
    const level = new Level(def);
    assert.ok(level.furnitures.length >= 1, `${def.name} has a water dispenser near the elevator`);
    const disp = level.furnitures.find((f) => f.type === 'dispenser');
    assert.ok(disp, `${def.name} has a dispenser`);
    assert.ok(disp.wallSide >= 0 && disp.wallSide < 4, `${def.name} dispenser backs against an adjacent wall`);
    const distFromCenter = disp.pos.getDistance(level.center(disp.x, disp.y));
    assert.ok(Math.abs(distFromCenter - DISPENSER_WALL_OFFSET) < 1e-5);
  }

  // Destruction meshes & ballistic break pose
  const wreck = dispenserWreckMesh();
  assert.ok(wreck.vertices instanceof Float32Array && wreck.vertices.length > 150);
  assert.equal(wreck.normals.length, wreck.vertices.length);
  assert.equal(wreck.uvs.length, (wreck.vertices.length / 3) * 2);

  const puddle = dispenserPuddleMesh();
  assert.ok(puddle.vertices instanceof Float32Array && puddle.vertices.length >= 108);
  assert.equal(puddle.normals.length, puddle.vertices.length);

  const shrapnel = dispenserShrapnelParts();
  assert.ok(shrapnel.carboyTop.vertices.length > 90);
  assert.equal(shrapnel.shards.length, DISPENSER_SHARD_COUNT);
  for (const shard of shrapnel.shards)
    assert.ok(shard.vertices.length > 0 && shard.normals.length === shard.vertices.length);

  for (const mesh of [chestBodyMesh(), chestLidMesh(), switchBodyMesh(), switchLeverMesh()]) {
    assert.ok(mesh.normals instanceof Float32Array && mesh.normals.length === mesh.vertices.length);
    for (let i = 0; i < mesh.normals.length; i += 3) {
      const len = Math.hypot(mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2]);
      assert.ok(Math.abs(len - 1) < 1e-4);
    }
  }

  const pose = createDispenserBreakPose();
  dispenserBreakPose(0.05, 1.2, pose);
  assert.ok(pose.puddleScale.x < 0.4, 'water puddle starts compact at t = 0.05s');
  assert.ok(pose.carboyTop.pos.y > 28, 'carboy crown launches from upper bottle height');
  dispenserBreakPose(1.2, 1.2, pose);
  assert.equal(pose.puddleScale.x, 1, 'water puddle expands to full scale after settling');
  assert.ok(Math.abs(pose.carboyTop.pos.y - 3.6) < 1e-5, 'carboy crown settles on the floor');

  // Game destruction mechanics: one shot immediately shatters the dispenser & removes its collision body
  const game = new Game(0, 42);
  assert.ok(game.furnitures.length >= 1);
  const furn = game.furnitures.find((f) => f.type === 'dispenser');
  assert.equal(furn.hp, DISPENSER_HP);
  assert.equal(DISPENSER_HP, 1);
  assert.equal(furn.gone, false);
  assert.equal(game.inDispenserWater(furn.pos), false);

  game.hitFurniture(furn, 1);
  assert.equal(furn.hp, 0);
  assert.equal(furn.gone, true);
  assert.equal(game.inDispenserWater(furn.pos), true);
  game.updateFurnitures(0.25);
  assert.equal(furn.deadTime, 0.25);
  console.log(`ok   ${dispenserTestName}`);
} catch (error) {
  failed = true;
  console.log(`FAIL ${dispenserTestName}\n     ${error.message}`);
}

const deskTestName = 'Computer Desk & Chair furniture (t): builds 256x64 power-of-two RGBA atlas, 3D desk/chair/PC/monitor mesh, and shatters screen & PC when shot';
try {
  const atlas = deskAtlas();
  assert.equal(atlas.name, 'desk');
  assert.equal(atlas.width, DESK_ATLAS.width);
  assert.equal(atlas.height, DESK_ATLAS.height);
  assert.equal(atlas.width & (atlas.width - 1), 0, 'deskAtlas width is a power of two');
  assert.equal(atlas.height & (atlas.height - 1), 0, 'deskAtlas height is a power of two');
  assert.equal(atlas.data.length, atlas.width * atlas.height * 4);

  const mesh = deskMesh();
  assert.ok(mesh.vertices instanceof Float32Array && mesh.vertices.length > 400);
  assert.equal(mesh.normals.length, mesh.vertices.length);
  assert.equal(mesh.uvs.length, (mesh.vertices.length / 3) * 2);
  let maxY = 0;
  let minY = Infinity;
  for (let i = 1; i < mesh.vertices.length; i += 3) {
    if (mesh.vertices[i] > maxY)
      maxY = mesh.vertices[i];
    if (mesh.vertices[i] < minY)
      minY = mesh.vertices[i];
  }
  assert.equal(minY, 0, 'desk legs and chair casters rest on y = 0');
  assert.equal(maxY, 38, 'desk monitor top reaches y = 38');

  const wreck = deskWreckMesh();
  assert.ok(wreck.vertices instanceof Float32Array && wreck.vertices.length > 200);
  assert.equal(wreck.normals.length, wreck.vertices.length);
  assert.equal(wreck.uvs.length, (wreck.vertices.length / 3) * 2);

  const debris = deskDebrisMesh();
  assert.ok(debris.vertices instanceof Float32Array && debris.vertices.length >= 108);
  assert.equal(debris.normals.length, debris.vertices.length);

  const shrapnel = deskShrapnelParts();
  assert.ok(shrapnel.monitorTop.vertices.length > 60);
  assert.equal(shrapnel.carboyTop, shrapnel.monitorTop);
  assert.equal(shrapnel.shards.length, DESK_SHARD_COUNT);
  for (const shard of shrapnel.shards)
    assert.ok(shard.vertices.length > 0 && shard.normals.length === shard.vertices.length);

  const pose = createDeskBreakPose();
  deskBreakPose(0.05, 1.2, pose);
  assert.ok(pose.puddleScale.x < 0.45, 'CRT glass debris starts compact at t = 0.05s');
  assert.ok(pose.monitorTop.pos.y > 24, 'monitor top launches from desktop monitor height');
  deskBreakPose(1.2, 1.2, pose);
  assert.equal(pose.puddleScale.x, 1, 'debris field expands to full scale after settling');
  assert.ok(Math.abs(pose.monitorTop.pos.y - 3.2) < 1e-5, 'monitor housing settles on the floor');

  const customDeskLevel = new Level({
    name: 'DESK_TEST',
    rows: [
      '######',
      '#P..t#',
      '#...X#',
      '######',
    ],
  });
  assert.equal(customDeskLevel.furnitures.length, 1);
  const deskEntry = customDeskLevel.furnitures[0];
  assert.equal(deskEntry.type, 'desk');
  assert.ok(deskEntry.wallSide >= 0 && deskEntry.wallSide < 4);
  const distFromCenter = deskEntry.pos.getDistance(customDeskLevel.center(deskEntry.x, deskEntry.y));
  assert.ok(Math.abs(distFromCenter - DESK_WALL_OFFSET) < 1e-5);

  const game = new Game(0, 42);
  const addedDesk = game.addFurniture(deskEntry);
  assert.equal(addedDesk.type, 'desk');
  assert.equal(addedDesk.hp, DESK_HP);
  assert.equal(addedDesk.gone, false);
  game.hitFurniture(addedDesk, 1);
  assert.equal(addedDesk.gone, true);
  assert.equal(game.inDispenserWater(addedDesk.pos), false, 'destroyed computer desk does not spawn water puddle');
  console.log(`ok   ${deskTestName}`);
} catch (error) {
  failed = true;
  console.log(`FAIL ${deskTestName}\n     ${error.message}`);
}

const orientTestName = 'level `furnitures` list overrides which wall a furniture piece stands against';
try {
  const rows = [
    '#######',
    '#.....#',
    '#.....#',
    '#..t..#',
    '#.....#',
    '#.P...#',
    '#######',
  ];
  const auto = new Level({ name: 'Orient', rows }).furnitures[0];
  for (const wallSide of [0, 1, 2, 3]) {
    const placed = new Level({ name: 'Orient', rows, furnitures: [{ x: 3, y: 3, wallSide }] }).furnitures[0];
    assert.equal(placed.wallSide, wallSide, `wallSide ${wallSide} is used`);
    assert.ok(Math.abs(placed.angle - Math.atan2(-[0, 1, 0, -1][wallSide], -[1, 0, -1, 0][wallSide])) < 1e-9, `facing follows wallSide ${wallSide}`);
  }
  assert.ok(auto, 'a piece without an override is still placed');
  console.log(`ok   ${orientTestName}`);
} catch (error) {
  failed = true;
  console.log(`FAIL ${orientTestName}\n     ${error.message}`);
}

process.exit(failed ? 1 : 0);

