import { LEVELS } from '../src/levels.js';
import { Level } from '../src/level.js';

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

process.exit(failed ? 1 : 0);
