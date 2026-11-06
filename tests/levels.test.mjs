import assert from 'node:assert/strict';
import { Vec2 } from '@1pizzateam/spock';
import { LEVELS } from '../src/levels.js';
import { CEILING, DIAG_NE, DIAG_NW, DIAG_SE, DIAG_SW, Level, PILLAR, TILE, WALL } from '../src/level.js';

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
  const unreachable = [...level.enemies, ...level.pickups].filter((o) => !reachable(o.pos));
  const exitReachable = level.exits.some((e) => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has(`${Math.floor(e.x / 64) + dx},${Math.floor(e.y / 64) + dy}`)));
  const enclosed = level.rows[0].includes('.') || level.rows[rowCount - 1].includes('.');
  console.log(`${def.name}: ${width}x${rowCount}, ${level.enemies.length} enemies, ${level.pickups.length} pickups, ${level.doors.size} doors, exits ${level.exits.length}`);
  if (unreachable.length || !exitReachable || enclosed || !level.exits.length) {
    failed = true;
    console.log('  PROBLEM', { unreachable: unreachable.map((o) => o.type), exitReachable, enclosed });
  }
}

const testName = 'AC-1: secret rooms retain their entrance-door associations';
let hasOrdinaryEntrance = false;
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
    if (!door || level.secretRoomByDoor.get(doorIdx) !== secretIndex) {
      failed = true;
      secretAssociationsValid = false;
      console.log(`FAIL ${testName}: ${def.name} secret ${secretIndex} has an invalid entrance`);
    }
    if (door?.secret)
      hasSecretEntrance = true;
    else if (door)
      hasOrdinaryEntrance = true;
  }
}
if (!hasOrdinaryEntrance || !hasSecretEntrance || !hasDoorlessSecret) {
  failed = true;
  secretAssociationsValid = false;
  console.log(`FAIL ${testName}: authored levels must cover ordinary, secret, and doorless entrances`);
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

process.exit(failed ? 1 : 0);

