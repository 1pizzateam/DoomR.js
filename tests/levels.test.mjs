import assert from 'node:assert/strict';
import { Vec2, Vec3 } from '@1pizzateam/spock';
import { LEVELS } from '../src/levels.js';
import { CEILING, DESK_WALL_OFFSET, DIAG_NE, DIAG_NW, DIAG_SE, DIAG_SW, DISPENSER_WALL_OFFSET, Level, PILLAR, TILE, WALL } from '../src/level.js';
import { chestBodyMesh, chestLidMesh, switchBodyMesh, switchLeverMesh } from '../src/cache.js';
import { buildConferenceTable, buildKitchenSink, buildOfficePlant, createDeskBreakPose, createDispenserBreakPose, createPlantBreakPose, createSinkBreakPose, createTableBreakPose, DESK_ATLAS, DESK_HP, DESK_SHARD_COUNT, deskAtlas, deskBreakPose, deskDebrisMesh, deskMesh, deskShrapnelParts, deskWreckMesh, DISPENSER_ATLAS, DISPENSER_HP, DISPENSER_SHARD_COUNT, dispenserAtlas, dispenserBreakPose, dispenserMesh, dispenserPuddleMesh, dispenserShrapnelParts, dispenserWreckMesh, FURNITURE_FRAGMENT, FURNITURE_VERTEX, plantAtlas, plantBreakPose, SHADOW_ATLAS, SHADOW_FRAGMENT, SHADOW_VERTEX, shadowAtlas, sinkAtlas, sinkBreakPose, tableAtlas, tableBreakPose, writeFloorShadowQuad, writeWallShadowQuad } from '../src/furniture.js';
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

const furnitureAtlasAc1TestName = 'AC-1: tableAtlas, plantAtlas, and sinkAtlas generate 256x64 RGBA buffers';
try {
  for (const [name, fn, expectedSubtiles] of [
    ['table', tableAtlas, ['top', 'frame', 'chair', 'tray']],
    ['plant', plantAtlas, ['pot', 'foliage', 'stem', 'soil']],
    ['sink', sinkAtlas, ['front', 'side', 'top', 'water']],
  ]) {
    const atlas = fn();
    assert.equal(atlas.name, name, `${name} atlas name matches`);
    assert.equal(atlas.width, 256, `${name} atlas width is 256`);
    assert.equal(atlas.height, 64, `${name} atlas height is 64`);
    assert.equal(atlas.width & (atlas.width - 1), 0, `${name} atlas width is power of two`);
    assert.equal(atlas.height & (atlas.height - 1), 0, `${name} atlas height is power of two`);
    assert.ok(atlas.data instanceof Uint8Array, `${name} atlas data is Uint8Array`);
    assert.equal(atlas.data.length, 256 * 64 * 4, `${name} atlas buffer is 65536 bytes`);
    for (const key of expectedSubtiles) {
      assert.ok(atlas[key] && typeof atlas[key].x === 'number', `${name} contains subtile ${key}`);
      assert.equal(atlas[key].width, 64, `${name} subtile ${key} width is 64`);
      assert.equal(atlas[key].height, 64, `${name} subtile ${key} height is 64`);
    }
  }
  console.log(`ok   ${furnitureAtlasAc1TestName}`);
} catch (error) {
  failed = true;
  console.log(`FAIL ${furnitureAtlasAc1TestName}\n     ${error.message}`);
}

const furnitureMeshAc2TestName = 'AC-2: buildConferenceTable, buildOfficePlant, and buildKitchenSink generate 3D mesh geometries';
try {
  for (const [name, fn, expectedMinVerts, expectedMinY, expectedMaxY] of [
    ['conferenceTable', buildConferenceTable, 300, 0, 30.0],
    ['officePlant', buildOfficePlant, 300, 0, 36.0],
    ['kitchenSink', buildKitchenSink, 300, 0, 36.0],
  ]) {
    const mesh = fn();
    assert.ok(mesh.vertices instanceof Float32Array && mesh.vertices.length >= expectedMinVerts, `${name} vertices is non-empty Float32Array`);
    assert.ok(mesh.normals instanceof Float32Array, `${name} normals is Float32Array`);
    assert.ok(mesh.uvs instanceof Float32Array, `${name} uvs is Float32Array`);
    assert.equal(mesh.normals.length, mesh.vertices.length, `${name} normal count matches vertex float count`);
    assert.equal(mesh.uvs.length, (mesh.vertices.length / 3) * 2, `${name} uv count matches vertex count * 2`);
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 1; i < mesh.vertices.length; i += 3) {
      const y = mesh.vertices[i];
      if (y < minY)
        minY = y;
      if (y > maxY)
        maxY = y;
    }
    assert.equal(minY, expectedMinY, `${name} base rests on y = ${expectedMinY}`);
    assert.ok(maxY <= expectedMaxY + 1e-3, `${name} height does not exceed expectedMaxY`);
    assert.ok(maxY >= expectedMinY + 10, `${name} height is non-trivial`);
  }
  console.log(`ok   ${furnitureMeshAc2TestName}`);
} catch (error) {
  failed = true;
  console.log(`FAIL ${furnitureMeshAc2TestName}\n     ${error.message}`);
}

const furnitureBreakPoseAc3TestName = 'AC-3: tableBreakPose, plantBreakPose, and sinkBreakPose update pose transforms in-place';
try {
  const targetTable = createTableBreakPose();
  const targetPlant = createPlantBreakPose();
  const targetSink = createSinkBreakPose();

  for (const [name, breakPoseFn, target] of [
    ['table', tableBreakPose, targetTable],
    ['plant', plantBreakPose, targetPlant],
    ['sink', sinkBreakPose, targetSink],
  ]) {
    for (const elapsed of [0, 0.1, 0.5, 1.2]) {
      const result = breakPoseFn(elapsed, 42, target);
      assert.equal(result, target, `${name}BreakPose mutates target in-place`);
      assert.ok(Number.isFinite(target.wreckScale.x) && Number.isFinite(target.wreckScale.y) && Number.isFinite(target.wreckScale.z));
      assert.ok(Number.isFinite(target.wreckRot.x) && Number.isFinite(target.wreckRot.y) && Number.isFinite(target.wreckRot.z));
      assert.ok(Number.isFinite(target.puddleScale.x) && Number.isFinite(target.puddleScale.z));
      assert.ok(Number.isFinite(target.carboyTop.pos.x) && Number.isFinite(target.carboyTop.pos.y) && Number.isFinite(target.carboyTop.pos.z));
      assert.ok(Array.isArray(target.shards) && target.shards.length >= 5);
      for (let i = 0; i < target.shards.length; i++) {
        assert.ok(Number.isFinite(target.shards[i].pos.x) && Number.isFinite(target.shards[i].pos.y) && Number.isFinite(target.shards[i].pos.z));
        assert.ok(Number.isFinite(target.shards[i].rot.x) && Number.isFinite(target.shards[i].rot.y) && Number.isFinite(target.shards[i].rot.z));
      }
    }
  }
  console.log(`ok   ${furnitureBreakPoseAc3TestName}`);
} catch (error) {
  failed = true;
  console.log(`FAIL ${furnitureBreakPoseAc3TestName}\n     ${error.message}`);
}

const shadowQuadAc4TestName = 'AC-4: shadowAtlas, writeFloorShadowQuad, and writeWallShadowQuad across wall sides 0..3';
try {
  const sAtlas = shadowAtlas();
  assert.equal(sAtlas.width, 128);
  assert.equal(sAtlas.height, 64);
  assert.equal(sAtlas.data.length, 128 * 64 * 4);

  const floorCorners = new Float32Array(12);
  const floorRes = writeFloorShadowQuad(floorCorners, new Vec3(100, 0, 200), new Vec2(0.5, 0.5), new Vec3(12, 14, 28));
  assert.equal(floorRes, floorCorners);
  for (let i = 0; i < 12; i++)
    assert.ok(Number.isFinite(floorCorners[i]), `floorCorners[${i}] is finite`);
  assert.equal(floorCorners[1], 0);
  assert.equal(floorCorners[4], 0);
  assert.equal(floorCorners[7], 0);
  assert.equal(floorCorners[10], 0);

  const wallCorners = new Float32Array(12);
  const tileCoords = new Vec2(4, 5);
  const wallBounds = new Vec3(16, 28, 0);
  for (const wallSide of [0, 1, 2, 3]) {
    const wallRes = writeWallShadowQuad(wallCorners, tileCoords, wallSide, wallBounds);
    assert.equal(wallRes, wallCorners);
    for (let i = 0; i < 12; i++)
      assert.ok(Number.isFinite(wallCorners[i]), `wallSide ${wallSide} wallCorners[${i}] is finite`);
    assert.equal(wallCorners[1], 0, `wallSide ${wallSide} corner 0 bottomY is 0`);
    assert.equal(wallCorners[4], 0, `wallSide ${wallSide} corner 1 bottomY is 0`);
    assert.equal(wallCorners[7], 28, `wallSide ${wallSide} corner 2 topY is 28`);
    assert.equal(wallCorners[10], 28, `wallSide ${wallSide} corner 3 topY is 28`);
    if (wallSide === 0 || wallSide === 2) {
      const expectedX = wallSide === 2 ? tileCoords.x * 64 + 0.14 : (tileCoords.x + 1) * 64 - 0.14;
      assert.ok(Math.abs(wallCorners[0] - expectedX) < 1e-4);
      assert.ok(Math.abs(wallCorners[3] - expectedX) < 1e-4);
      assert.ok(Math.abs(wallCorners[6] - expectedX) < 1e-4);
      assert.ok(Math.abs(wallCorners[9] - expectedX) < 1e-4);
    } else {
      const expectedZ = wallSide === 3 ? tileCoords.y * 64 + 0.14 : (tileCoords.y + 1) * 64 - 0.14;
      assert.ok(Math.abs(wallCorners[2] - expectedZ) < 1e-4);
      assert.ok(Math.abs(wallCorners[5] - expectedZ) < 1e-4);
      assert.ok(Math.abs(wallCorners[8] - expectedZ) < 1e-4);
      assert.ok(Math.abs(wallCorners[11] - expectedZ) < 1e-4);
    }
  }
  console.log(`ok   ${shadowQuadAc4TestName}`);
} catch (error) {
  failed = true;
  console.log(`FAIL ${shadowQuadAc4TestName}\n     ${error.message}`);
}

const roomDoorsAc5TestName = 'AC-5: findRoomDoors returns bounding passage doors and handles invalid room IDs';
try {
  const sampleLevel = new Level({
    name: 'DoorTest',
    rows: [
      '#######',
      '#..D..#',
      '#..P..#',
      '#######',
    ],
  });
  for (const badRoomId of [-1, -99, 1.5, NaN, null, undefined, '0', 999])
    assert.deepEqual(sampleLevel.findRoomDoors(badRoomId), [], `findRoomDoors(${badRoomId}) returns empty array`);

  const multiDoorLevel = new Level({
    name: 'MixedDoors',
    rows: [
      '#########',
      '#...D...#',
      '#...U...#',
      '#...P...#',
      '#...X...#',
      '#########',
    ],
  });
  const room0Doors = multiDoorLevel.findRoomDoors(0);
  assert.ok(Array.isArray(room0Doors));
  assert.equal(room0Doors.length, 1, 'only standard passage door is returned');
  for (const door of room0Doors) {
    assert.ok(!door.elevator, 'elevator door excluded from findRoomDoors');
    assert.ok(!door.secret, 'secret door excluded from findRoomDoors');
    assert.ok(!door.lock, 'locked door excluded from findRoomDoors');
  }
  console.log(`ok   ${roomDoorsAc5TestName}`);
} catch (error) {
  failed = true;
  console.log(`FAIL ${roomDoorsAc5TestName}\n     ${error.message}`);
}

const createSwitchAc6TestName = 'AC-6: createSwitch without doorDefs resolves room doors and locks them';
try {
  const switchLevel = new Level({
    name: 'SwitchTest',
    rows: [
      '#########',
      '#...D...#',
      '#...P...#',
      '#.......#',
      '#########',
    ],
  });
  const door = switchLevel.doors.get(1 * switchLevel.width + 4);
  assert.ok(door, 'door exists at (4, 1)');
  assert.equal(door.switchLocked, false, 'door is not switchLocked before createSwitch');

  const sw = switchLevel.createSwitch(1, 2, 2, null);
  assert.ok(sw, 'switch was created');
  assert.ok(sw.doors.length > 0, 'switch resolved room doors');
  assert.ok(sw.doors.includes(door), 'resolved room doors include the bounding passage door');
  assert.equal(door.switchLocked, true, 'bounding passage door is marked switchLocked = true');
  console.log(`ok   ${createSwitchAc6TestName}`);
} catch (error) {
  failed = true;
  console.log(`FAIL ${createSwitchAc6TestName}\n     ${error.message}`);
}

const switchValidationAc7TestName = 'AC-7: createSwitch boundary validation on non-floor and non-wall tiles';
try {
  const boundaryLevel = new Level({
    name: 'BoundaryTest',
    rows: [
      '#########',
      '#.......#',
      '#...P...#',
      '#.......#',
      '#########',
    ],
  });
  assert.equal(boundaryLevel.createSwitch(0, 0, 0), null, 'createSwitch on wall tile returns null');
  assert.equal(boundaryLevel.createSwitch(-1, 2), null, 'createSwitch at negative X returns null');
  assert.equal(boundaryLevel.createSwitch(2, -1), null, 'createSwitch at negative Y returns null');
  assert.equal(boundaryLevel.createSwitch(20, 2), null, 'createSwitch beyond width returns null');
  assert.equal(boundaryLevel.createSwitch(4, 2, null), null, 'createSwitch on floor tile with no adjacent wall returns null');
  console.log(`ok   ${switchValidationAc7TestName}`);
} catch (error) {
  failed = true;
  console.log(`FAIL ${switchValidationAc7TestName}\n     ${error.message}`);
}

process.exit(failed ? 1 : 0);

