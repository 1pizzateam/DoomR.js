import { Grid, RightTriangle, Vec2 } from '@1pizzateam/spock';

export const TILE = 64;
export const ELEVATOR_DOOR_THICKNESS = 6;
export const BASE_FLOOR_LEVEL = -4;
export const EYE = 32;
export const CROUCH_EYE = 18;
/** The ceiling is one wall texture high. Blood thrown up this far lands on it. */
export const CEILING = 64;

export const FLOOR = 0;
export const WALL = 1;
export const PILLAR = 2;
export const DOOR = 3;
export const EXIT = 4;

export const DIAG_NW = 1;
export const DIAG_NE = 2;
export const DIAG_SW = 3;
export const DIAG_SE = 4;

const DIAG_CORNER = {
  [DIAG_NW]: 'nw',
  [DIAG_NE]: 'ne',
  [DIAG_SW]: 'sw',
  [DIAG_SE]: 'se',
};

const tileSize = new Vec2(TILE, TILE);
const scratchS = new Vec2();
const scratchA = new Vec2();
const scratchB = new Vec2();
const scratchO = new Vec2();

const SOLIDS = {
  '#': { kind: WALL, height: 64 },
  '/': { kind: WALL, height: 64, diag: '/' },
  '\\': { kind: WALL, height: 64, diag: '\\' },
  '◤': { kind: WALL, height: 64, diag: DIAG_NW },
  '◥': { kind: WALL, height: 64, diag: DIAG_NE },
  '◣': { kind: WALL, height: 64, diag: DIAG_SW },
  '◢': { kind: WALL, height: 64, diag: DIAG_SE },
  '┌': { kind: WALL, height: 64, diag: DIAG_NW },
  '┐': { kind: WALL, height: 64, diag: DIAG_NE },
  '└': { kind: WALL, height: 64, diag: DIAG_SW },
  '┘': { kind: WALL, height: 64, diag: DIAG_SE },
  o: { kind: PILLAR, height: 26 },
  D: { kind: DOOR, height: 64 },
  S: { kind: DOOR, height: 64, secret: true },
  R: { kind: DOOR, height: 64, lock: 'red' },
  Y: { kind: DOOR, height: 64, lock: 'yellow' },
  U: { kind: DOOR, height: 64, lock: 'blue' },
  L: { kind: DOOR, height: 64, lock: 'blue' },
  X: { kind: EXIT, height: 64 },
};
const ENEMIES = { i: 'imp', b: 'brute', s: 'skull', c: 'crawler', w: 'swarmer', r: 'wraith', B: 'boss' };
const PICKUPS = {
  h: 'health',
  a: 'ammo',
  m: 'bullets',
  q: 'rockets',
  k: 'redKey',
  y: 'yellowKey',
  u: 'blueKey',
  1: 'redKey',
  2: 'yellowKey',
  3: 'blueKey',
  W: 'chainsaw',
  G: 'shotgun',
  C: 'chaingun',
  M: 'rocket',
  g: 'greenArmor',
  A: 'blueArmor',
  O: 'soulsphere',
  Z: 'berserk',
  V: 'radsuit',
  N: 'nightvision',
};

// Face directions: the side of a tile a ray enters through (0: -x, 1: +x, 2: -y, 3: +y).
const DX = [-1, 1, 0, 0];
const DY = [0, 0, -1, 1];
const WALL_DX = [1, 0, -1, 0];
const WALL_DY = [0, 1, 0, -1];
export const CACHE_WALL_OFFSET = 14;
export const SWITCH_WALL_OFFSET = 2;

/**
 * A tile map parsed from ASCII rows.
 * Besides tile kinds and heights it precomputes face ids: neighbouring faces that
 * belong to the same flat wall share an id, so the renderer only draws a vertical
 * line where a wall really starts or ends.
 */
export class Level {
  constructor({ name, rows, angle = null, par = 120, planet = null, wind = null, chests = [], switches = [], floorLevel = null }) {
    this.name = name;
    this.rows = rows;
    this.par = par;
    this.planet = planet;
    const match = typeof name === 'string' ? name.match(/E\d+M(\d+)/i) : null;
    this.floorLevel = Number.isFinite(floorLevel)
      ? floorLevel
      : match
        ? BASE_FLOOR_LEVEL + (Number.parseInt(match[1], 10) - 1)
        : BASE_FLOOR_LEVEL;
    this.wind = wind ? wind.clone() : new Vec2(planet === 'mars' ? 320 : 0, planet === 'mars' ? 95 : 0);
    this.width = rows[0].length;
    this.rowCount = rows.length;
    this.grid = new Grid(new Vec2(this.width * TILE, this.rowCount * TILE), TILE);

    const total = this.width * this.rowCount;
    this.kind = new Uint8Array(total);
    this.diag = new Uint8Array(total);
    this.slime = new Uint8Array(total);
    this.acidSplash = new Uint8Array(total);
    this.emptyPit = new Uint8Array(total);
    this.teleporter = new Uint8Array(total);
    this.baseHeight = new Float32Array(total);
    this.heights = new Float32Array(total);
    this.faceIds = new Int32Array(total * 4);
    this.secretByTile = new Int16Array(total).fill(-1);

    this.playerStart = null;
    this.playerAngle = angle ?? 0;
    this.elevator = null;
    this.enemies = [];
    this.pickups = [];
    this.chestDefs = Array.isArray(chests) ? chests : [];
    this.chestTiles = [];
    this.chests = [];
    this.switchDefs = switches ?? [];
    this.switches = [];
    this.barrels = [];
    this.crushers = [];
    this.teleporters = [];
    this.teleporterByTile = new Map();
    this.exits = [];
    this.doors = new Map();
    this.diagTriangles = new Map();
    this.secrets = [];
    this.secretDoorByRoom = [];
    this.secretRoomByDoor = new Map();

    this.parse();
    this.buildFaces();
    this.elevator = this.findElevator();
    if (angle === null && this.elevator)
      this.playerAngle = this.elevator.angle;
    this.indoor = this.findIndoor();
    this.outdoor = this.findOutdoor();
    this.bossArena = this.findBossArena();
    this.arena = this.findArena();
    this.secrets = this.findSecrets();
    this.findRooms();
    this.buildChests();
    this.buildSwitches();
  }

  /**
   * Starting elevator cab: when `playerStart` sits in a 1-tile alcove enclosed on three sides by solid walls
   * and opening into the first room on the fourth side, builds a thin elevator door on the cab threshold.
   */
  findElevator() {
    if (!this.playerStart)
      return null;
    const { width, kind, diag } = this;
    const startIdx = this.grid.getCell(this.playerStart);
    if (startIdx < 0 || kind[startIdx] !== FLOOR || diag[startIdx] !== 0)
      return null;
    const x = startIdx % width;
    const y = (startIdx - x) / width;
    let wallCount = 0;
    let door = null;
    let doorDir = -1;
    let opensToFloor = false;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (!this.inBounds(nx, ny))
        return null;
      const nidx = ny * width + nx;
      if (kind[nidx] === WALL && diag[nidx] === 0)
        wallCount++;
      else if (kind[nidx] === DOOR) {
        const candidate = this.doors.get(nidx);
        if (candidate && !candidate.secret && !candidate.lock) {
          door = candidate;
          doorDir = d;
        }
      } else if (kind[nidx] === FLOOR && diag[nidx] === 0 && !this.doors.has(nidx)) {
        const perpX = DY[d];
        const perpY = DX[d];
        const roomWider =
          (this.inBounds(nx + perpX, ny + perpY) && kind[(ny + perpY) * width + (nx + perpX)] === FLOOR) ||
          (this.inBounds(nx - perpX, ny - perpY) && kind[(ny - perpY) * width + (nx - perpX)] === FLOOR);
        if (roomWider) {
          opensToFloor = true;
          doorDir = d;
        }
      }
    }
    if (wallCount !== 3 || doorDir < 0 || (!door && !opensToFloor))
      return null;
    if (opensToFloor) {
      const exitX = x + DX[doorDir];
      const exitY = y + DY[doorDir];
      if (!this.isWalkable(exitX, exitY))
        return null;
      const offset = TILE * 0.5 - ELEVATOR_DOOR_THICKNESS * 0.5;
      door = {
        idx: startIdx,
        x,
        y,
        center: new Vec2(
          (x + 0.5) * TILE + DX[doorDir] * offset,
          (y + 0.5) * TILE + DY[doorDir] * offset,
        ),
        open: 0,
        target: 0,
        timer: 0,
        secret: false,
        lock: null,
        switchLocked: false,
        revealed: false,
        alongY: DY[doorDir] !== 0,
        framed: true,
        elevator: true,
        floorLevel: this.floorLevel,
        thin: true,
        thickness: ELEVATOR_DOOR_THICKNESS,
        baseHeight: CEILING,
        dirX: DX[doorDir],
        dirY: DY[doorDir],
        body: null,
      };
      this.doors.set(startIdx, door);
      return {
        tileIdx: startIdx,
        x,
        y,
        doorIdx: door.idx,
        door,
        floorLevel: this.floorLevel,
        dirX: DX[doorDir],
        dirY: DY[doorDir],
        angle: Math.atan2(DY[doorDir], DX[doorDir]),
        exitTileIdx: exitY * width + exitX,
        exitCenter: this.center(exitX, exitY),
      };
    }
    const exitX = x + DX[doorDir] * 2;
    const exitY = y + DY[doorDir] * 2;
    if (!this.isWalkable(exitX, exitY))
      return null;
    door.elevator = true;
    door.floorLevel = this.floorLevel;
    door.thin = true;
    door.thickness = ELEVATOR_DOOR_THICKNESS;
    door.alongY = DY[doorDir] !== 0;
    door.framed = true;
    door.dirX = DX[doorDir];
    door.dirY = DY[doorDir];
    return {
      tileIdx: startIdx,
      x,
      y,
      doorIdx: door.idx,
      door,
      floorLevel: this.floorLevel,
      dirX: DX[doorDir],
      dirY: DY[doorDir],
      angle: Math.atan2(DY[doorDir], DX[doorDir]),
      exitTileIdx: exitY * width + exitX,
      exitCenter: this.center(exitX, exitY),
    };
  }

  /**
   * Secret supply closets: small dead-end rooms behind a single disguised push-wall 'S' that hold supplies and are not the start or exit.
   */
  findSecrets() {
    const { width, rowCount, kind } = this;
    const total = width * rowCount;
    const visited = new Uint8Array(total);
    const startIdx = this.grid.getCell(this.playerStart);
    const pickupTiles = new Set([
      ...this.pickups.map((p) => this.grid.getCell(p.pos)),
      ...this.chestTiles.map((c) => c.idx),
      ...this.chestDefs
        .filter((c) => Number.isInteger(c?.x) && Number.isInteger(c?.y) && this.inBounds(c.x, c.y))
        .map((c) => c.y * width + c.x),
    ]);
    const secrets = [];

    for (let i = 0; i < total; i++) {
      if (visited[i] || kind[i] !== FLOOR)
        continue;
      const tiles = new Set();
      const doors = new Set();
      let touchesExit = false;
      let hasPickup = false;
      const stack = [i];
      visited[i] = 1;
      while (stack.length) {
        const idx = stack.pop();
        tiles.add(idx);
        if (pickupTiles.has(idx))
          hasPickup = true;
        const x = idx % width;
        const y = (idx - x) / width;
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d];
          const ny = y + DY[d];
          if (!this.inBounds(nx, ny))
            continue;
          const nidx = ny * width + nx;
          if (kind[nidx] === DOOR)
            doors.add(nidx);
          else if (kind[nidx] === EXIT)
            touchesExit = true;
          else if (kind[nidx] === FLOOR && !visited[nidx]) {
            visited[nidx] = 1;
            stack.push(nidx);
          }
        }
      }
      const [doorIdx] = doors;
      const doorObj = doors.size === 1 ? this.doors.get(doorIdx) : null;
      const isSecretDoor = !!doorObj?.secret;
      if (doors.size === 1 && isSecretDoor && !doorObj?.lock && !touchesExit && !tiles.has(startIdx) && hasPickup && tiles.size <= 45) {
        const secretIndex = secrets.length;
        secrets.push(tiles);
        this.secretDoorByRoom.push(doorIdx);
        this.secretRoomByDoor.set(doorIdx, secretIndex);
        for (const tileIdx of tiles)
          this.secretByTile[tileIdx] = secretIndex;
      }
    }

    // On doorless outdoor planetary levels (e.g. Mars), hidden rock caves behind a 1-tile canyon crevice hold secret caches
    if (this.planet === 'mars' && secrets.length === 0) {
      const isRockChoke = (idx) => {
        if (kind[idx] !== FLOOR)
          return false;
        const x = idx % width;
        const y = (idx - x) / width;
        const ewWall = x > 0 && x < width - 1 && kind[idx - 1] === WALL && kind[idx + 1] === WALL;
        const nsWall = y > 0 && y < rowCount - 1 && kind[idx - width] === WALL && kind[idx + width] === WALL;
        return ewWall || nsWall;
      };
      for (const p of this.pickups) {
        if (p.type !== 'soulsphere' && p.type !== 'blueArmor')
          continue;
        const pIdx = this.grid.getCell(p.pos);
        if (pIdx < 0 || this.secretByTile[pIdx] >= 0 || isRockChoke(pIdx))
          continue;
        const cave = new Set();
        const stack = [pIdx];
        let touchesStartOrExit = false;
        while (stack.length) {
          const idx = stack.pop();
          if (cave.has(idx))
            continue;
          cave.add(idx);
          if (idx === startIdx)
            touchesStartOrExit = true;
          const x = idx % width;
          const y = (idx - x) / width;
          for (let d = 0; d < 4; d++) {
            const nx = x + DX[d];
            const ny = y + DY[d];
            if (!this.inBounds(nx, ny))
              continue;
            const nidx = ny * width + nx;
            if (kind[nidx] === EXIT)
              touchesStartOrExit = true;
            else if (kind[nidx] === FLOOR && !cave.has(nidx) && !isRockChoke(nidx))
              stack.push(nidx);
          }
        }
        if (!touchesStartOrExit && cave.size >= 2 && cave.size <= 24) {
          const secretIndex = secrets.length;
          secrets.push(cave);
          this.secretDoorByRoom.push(-1);
          for (const tileIdx of cave)
            this.secretByTile[tileIdx] = secretIndex;
        }
      }
    }

    return secrets;
  }

  /**
   * Door- and secret-bounded room partition: floor/pillar tiles flood into one room id; doors, exits and walls bound rooms,
   * and a secret area never merges with non-secret floor. Diagonal halves join a room through their open side only.
   */
  findRooms() {
    const { width, rowCount, kind, diag, secretByTile } = this;
    const total = width * rowCount;
    this.roomByTile = new Int16Array(total).fill(-1);
    this.roomCount = 0;
    const stack = [];
    for (let i = 0; i < total; i++) {
      if (this.roomByTile[i] !== -1 || (kind[i] !== FLOOR && kind[i] !== PILLAR))
        continue;
      const room = this.roomCount++;
      this.roomByTile[i] = room;
      stack.push(i);
      while (stack.length) {
        const idx = stack.pop();
        const x = idx % width;
        const y = (idx - x) / width;
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d];
          const ny = y + DY[d];
          if (!this.inBounds(nx, ny))
            continue;
          const j = ny * width + nx;
          if (this.roomByTile[j] !== -1)
            continue;
          if (diag[j] > 0) {
            if (!this.hasCardinalFace(j, d ^ 1))
              this.roomByTile[j] = room;
          } else if ((kind[j] === FLOOR || kind[j] === PILLAR) && secretByTile[j] === secretByTile[idx]) {
            this.roomByTile[j] = room;
            stack.push(j);
          }
        }
      }
    }
  }

  chestWallSide(x, y) {
    const { width, kind, diag } = this;
    const isWall = (tx, ty) => this.inBounds(tx, ty) && kind[ty * width + tx] === WALL && diag[ty * width + tx] === 0;
    for (const requireWalkableOpposite of [true, false]) {
      let side = -1;
      let sideScore = -1;
      for (let d = 0; d < 4; d++) {
        const ox = x - WALL_DX[d];
        const oy = y - WALL_DY[d];
        if (!isWall(x + WALL_DX[d], y + WALL_DY[d]) || (requireWalkableOpposite && !this.isWalkable(ox, oy)))
          continue;
        let score = 0;
        for (let e = 0; e < 4; e++) {
          if (this.isWalkable(ox + WALL_DX[e], oy + WALL_DY[e]))
            score++;
        }
        if (score > sideScore) {
          sideScore = score;
          side = d;
        }
      }
      if (side >= 0)
        return side;
    }
    return -1;
  }

  createChest(x, y, contents = ['ammo'], wallSide = null, angle = null, locked = false) {
    const idx = y * this.width + x;
    const resolvedWallSide = Number.isInteger(wallSide) && wallSide >= 0 && wallSide < 4
      ? wallSide
      : this.chestWallSide(x, y);
    const pos = this.center(x, y);
    let resolvedAngle = 0;
    if (resolvedWallSide >= 0) {
      pos.x += WALL_DX[resolvedWallSide] * CACHE_WALL_OFFSET;
      pos.y += WALL_DY[resolvedWallSide] * CACHE_WALL_OFFSET;
      resolvedAngle = Math.atan2(-WALL_DY[resolvedWallSide], -WALL_DX[resolvedWallSide]);
    } else {
      let bestScore = -1;
      for (let d = 0; d < 4; d++) {
        const nx = x + WALL_DX[d];
        const ny = y + WALL_DY[d];
        if (!this.isWalkable(nx, ny))
          continue;
        let score = 0;
        for (let e = 0; e < 4; e++) {
          if (this.isWalkable(nx + WALL_DX[e], ny + WALL_DY[e]))
            score++;
        }
        if (score > bestScore) {
          bestScore = score;
          resolvedAngle = Math.atan2(WALL_DY[d], WALL_DX[d]);
        }
      }
    }
    if (typeof angle === 'number' && Number.isFinite(angle))
      resolvedAngle = angle;
    const normalizedContents = Array.isArray(contents) && contents.length > 0
      ? contents.map((item) => PICKUPS[item] ?? item)
      : ['ammo'];
    return {
      idx,
      x,
      y,
      room: this.roomByTile[idx],
      wallSide: resolvedWallSide,
      pos,
      angle: resolvedAngle,
      contents: normalizedContents,
      locked: Boolean(locked),
    };
  }

  buildChests() {
    const defsByIdx = new Map();
    for (const entry of this.chestDefs) {
      if (!entry || !Number.isInteger(entry.x) || !Number.isInteger(entry.y) || !this.inBounds(entry.x, entry.y))
        continue;
      defsByIdx.set(entry.y * this.width + entry.x, entry);
    }
    const seen = new Set();
    for (const tile of this.chestTiles) {
      seen.add(tile.idx);
      const entry = defsByIdx.get(tile.idx);
      this.chests.push(this.createChest(tile.x, tile.y, entry?.contents, entry?.wallSide, entry?.angle, entry?.locked));
    }
    for (const [idx, entry] of defsByIdx) {
      if (seen.has(idx) || this.kind[idx] !== FLOOR)
        continue;
      seen.add(idx);
      this.chests.push(this.createChest(entry.x, entry.y, entry.contents, entry.wallSide, entry.angle, entry?.locked));
    }
  }

  buildSwitches() {
    for (let i = 0; i < this.switchDefs.length; i++) {
      const entry = this.switchDefs[i];
      if (!entry || !this.inBounds(entry.x, entry.y))
        continue;
      const idx = entry.y * this.width + entry.x;
      if (this.kind[idx] !== FLOOR)
        continue;
      const wallSide = entry.wallSide ?? this.chestWallSide(entry.x, entry.y);
      if (wallSide < 0 || wallSide >= 4)
        continue;
      const dx = WALL_DX[wallSide];
      const dy = WALL_DY[wallSide];
      const normal = new Vec2(-dx, -dy);
      const pos = new Vec2(
        (entry.x + 0.5) * TILE + dx * (TILE * 0.5 - SWITCH_WALL_OFFSET),
        (entry.y + 0.5) * TILE + dy * (TILE * 0.5 - SWITCH_WALL_OFFSET),
      );
      const angle = Math.atan2(normal.y, normal.x);
      const doors = [];
      const doorDefs = entry.doors ?? [];
      for (let j = 0; j < doorDefs.length; j++) {
        const d = doorDefs[j];
        if (!d || !this.inBounds(d.x, d.y))
          continue;
        const door = this.doors.get(d.y * this.width + d.x);
        if (!door)
          continue;
        door.switchLocked = true;
        doors.push(door);
      }
      this.switches.push({
        idx,
        x: entry.x,
        y: entry.y,
        room: this.roomByTile[idx],
        wallSide,
        pos,
        normal,
        angle,
        doors,
        activated: false,
        pull: 0,
      });
    }
  }

  /** Secret index at a 2D world point (`Vec2`), or -1. */
  secretAt(pos) {
    const idx = this.grid.getCell(pos);
    return idx >= 0 ? this.secretByTile[idx] : -1;
  }

  isSlime(x, y) {
    return this.inBounds(x, y) && this.slime[y * this.width + x] === 1;
  }

  /** Whether a 2D world point (`Vec2`) lies on a slime tile. */
  slimeAt(pos) {
    const idx = this.grid.getCell(pos);
    return idx >= 0 && this.slime[idx] === 1;
  }

  isAcidSplash(x, y) {
    return this.inBounds(x, y) && this.acidSplash[y * this.width + x] === 1;
  }

  /** Whether a 2D world point (`Vec2`) lies on a floor-level acid splash tile (','). */
  acidSplashAt(pos) {
    const idx = this.grid.getCell(pos);
    return idx >= 0 && this.acidSplash[idx] === 1;
  }

  isEmptyPit(x, y) {
    return this.inBounds(x, y) && this.emptyPit[y * this.width + x] === 1;
  }

  /** Whether a 2D world point (`Vec2`) lies on a bottomless/empty pit tile ('_'). */
  emptyPitAt(pos) {
    const idx = this.grid.getCell(pos);
    return idx >= 0 && this.emptyPit[idx] === 1;
  }

  isTeleporter(x, y) {
    return this.inBounds(x, y) && this.teleporter[y * this.width + x] === 1;
  }

  /** Teleporter pad at a 2D world point (`Vec2`), or null. */
  teleporterAt(pos) {
    const idx = this.grid.getCell(pos);
    return idx >= 0 ? (this.teleporterByTile.get(idx) ?? null) : null;
  }

  /**
   * On an outdoor planet level (e.g. Mars), the starting room is an enclosed indoor airlock:
   * every tile reachable from playerStart without passing through a door.
   */
  findIndoor() {
    if (this.planet !== 'mars' || !this.playerStart)
      return null;
    const { width } = this;
    const indoor = new Set();
    const startIdx = this.grid.getCell(this.playerStart);
    const stack = this.elevator ? [startIdx, this.elevator.exitTileIdx] : [startIdx];
    while (stack.length) {
      const idx = stack.pop();
      if (indoor.has(idx) || (this.kind[idx] !== FLOOR && this.kind[idx] !== PILLAR))
        continue;
      indoor.add(idx);
      const x = idx % width;
      const y = (idx - x) / width;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d];
        const ny = y + DY[d];
        if (!this.inBounds(nx, ny))
          continue;
        const nidx = ny * width + nx;
        if (this.diag[nidx] > 0 && !this.hasCardinalFace(nidx, d ^ 1))
          indoor.add(nidx);
        else
          stack.push(nidx);
      }
    }
    return indoor;
  }

  doorTouchesIndoor(idx) {
    if (!this.indoor)
      return false;
    const x = idx % this.width;
    const y = (idx - x) / this.width;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (this.inBounds(nx, ny) && this.indoor.has(ny * this.width + nx))
        return true;
    }
    return false;
  }

  /** Whether tile `idx` belongs to an indoor room or an indoor airlock doorway on a planetary level. */
  isIndoorTile(idx) {
    if (this.planet !== 'mars')
      return true;
    return Boolean(this.indoor?.has(idx) || (this.kind[idx] === DOOR && this.doorTouchesIndoor(idx)));
  }

  /** Every open tile outside the starting airlock room on a planetary surface level. */
  findOutdoor() {
    if (this.planet !== 'mars' || !this.indoor)
      return null;
    const outdoor = new Set();
    const total = this.width * this.rowCount;
    for (let idx = 0; idx < total; idx++) {
      if (this.indoor.has(idx))
        continue;
      const k = this.kind[idx];
      if (k === FLOOR || k === PILLAR || this.diag[idx] > 0 || (k === DOOR && !this.doorTouchesIndoor(idx)))
        outdoor.add(idx);
    }
    return outdoor;
  }

  isOutdoor(pos) {
    const idx = this.grid.getCell(pos);
    return idx >= 0 && !!this.outdoor?.has(idx);
  }

  /**
   * The room of a giant: every floor tile reachable from any boss spawn without going through a door. A giant never
   * leaves it, and it has no roof, because he is taller than the walls. Null when the level has none.
   */
  findBossArena() {
    const giants = this.enemies.filter((enemy) => enemy.type === 'boss');
    if (!giants.length)
      return null;
    const { width } = this;
    const arena = new Set();
    const stack = giants.map((giant) => this.grid.getCell(giant.pos));
    while (stack.length) {
      const idx = stack.pop();
      if (arena.has(idx) || (this.kind[idx] !== FLOOR && this.kind[idx] !== PILLAR))
        continue;
      arena.add(idx);
      const x = idx % width;
      const y = (idx - x) / width;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d];
        const ny = y + DY[d];
        if (!this.inBounds(nx, ny))
          continue;
        const nidx = ny * width + nx;
        if (this.diag[nidx] > 0 && !this.hasCardinalFace(nidx, d ^ 1))
          arena.add(nidx);
        else
          stack.push(nidx);
      }
    }
    return arena;
  }

  findArena() {
    if (this.outdoor) {
      const arena = new Set(this.outdoor);
      if (this.bossArena)
        for (const idx of this.bossArena)
          arena.add(idx);
      return arena;
    }
    return this.bossArena;
  }

  /** Whether a 2D world point (`Vec2`) lies inside an arena. */
  inArena(pos) {
    const idx = this.grid.getCell(pos);
    if (idx < 0)
      return false;
    if (this.bossArena)
      return this.bossArena.has(idx);
    return !!this.arena?.has(idx);
  }

  parse() {
    for (let y = 0; y < this.rowCount; y++) {
      const row = this.rows[y];
      if (row.length !== this.width)
        throw new Error(`${this.name}: row ${y} has ${row.length} tiles, expected ${this.width}`);
      for (let x = 0; x < this.width; x++) {
        const char = row[x];
        const idx = y * this.width + x;
        const solid = SOLIDS[char];
        if (solid) {
          this.kind[idx] = solid.kind;
          this.baseHeight[idx] = solid.height;
          this.heights[idx] = solid.height;
          if (typeof solid.diag === 'number')
            this.diag[idx] = solid.diag;
          if (solid.kind === DOOR)
            this.doors.set(idx, { idx, x, y, center: this.center(x, y), open: 0, target: 0, timer: 0, secret: !!solid.secret, lock: solid.lock ?? null, switchLocked: false, revealed: false, alongY: false, body: null });
          if (solid.kind === EXIT)
            this.exits.push(this.center(x, y));
        } else if (char === 'P')
          this.playerStart = this.center(x, y);
        else if (ENEMIES[char])
          this.enemies.push({ type: ENEMIES[char], pos: this.center(x, y) });
        else if (char === 'x' || char === 'z')
          this.barrels.push({ x, y, pos: this.center(x, y), horizontal: char === 'z', angle: 0 });
        else if (PICKUPS[char])
          this.pickups.push({ type: PICKUPS[char], pos: this.center(x, y) });
        else if (char === '=')
          this.chestTiles.push({ idx, x, y });
        else if (char === '~')
          this.slime[idx] = 1;
        else if (char === ',')
          this.acidSplash[idx] = 1;
        else if (char === '_')
          this.emptyPit[idx] = 1;
        else if (char === 'T') {
          this.teleporter[idx] = 1;
          const pad = { idx, x, y, center: this.center(x, y), pair: 0, targetIdx: idx, target: this.center(x, y) };
          this.teleporters.push(pad);
          this.teleporterByTile.set(idx, pad);
        } else if (char === '^')
          this.crushers.push({ idx, x, y, center: this.center(x, y), phase: ((x * 7 + y * 13) % 8) * 0.35, low: CEILING, slamming: false });
        else if (char !== '.')
          throw new Error(`${this.name}: unknown tile "${char}" at ${x},${y}`);
      }
    }
    const solidWall = (x, y) => this.inBounds(x, y) && (this.kind[y * this.width + x] === WALL || this.kind[y * this.width + x] === EXIT);
    for (let y = 0; y < this.rowCount; y++) {
      const row = this.rows[y];
      for (let x = 0; x < this.width; x++) {
        const solid = SOLIDS[row[x]];
        if (!solid?.diag || typeof solid.diag === 'number')
          continue;
        const idx = y * this.width + x;
        if (solid.diag === '/') {
          const nw = (solidWall(x - 1, y) ? 2 : 0) + (solidWall(x, y - 1) ? 2 : 0) + (solidWall(x - 1, y - 1) ? 1 : 0);
          const se = (solidWall(x + 1, y) ? 2 : 0) + (solidWall(x, y + 1) ? 2 : 0) + (solidWall(x + 1, y + 1) ? 1 : 0);
          this.diag[idx] = nw >= se ? DIAG_NW : DIAG_SE;
        } else {
          const ne = (solidWall(x + 1, y) ? 2 : 0) + (solidWall(x, y - 1) ? 2 : 0) + (solidWall(x + 1, y - 1) ? 1 : 0);
          const sw = (solidWall(x - 1, y) ? 2 : 0) + (solidWall(x, y + 1) ? 2 : 0) + (solidWall(x - 1, y + 1) ? 1 : 0);
          this.diag[idx] = ne >= sw ? DIAG_NE : DIAG_SW;
        }
      }
    }
    for (const door of this.doors.values()) {
      const solidX = (solidWall(door.x - 1, door.y) ? 1 : 0) + (solidWall(door.x + 1, door.y) ? 1 : 0);
      const solidY = (solidWall(door.x, door.y - 1) ? 1 : 0) + (solidWall(door.x, door.y + 1) ? 1 : 0);
      door.alongY = solidX > solidY;
      door.framed = (door.alongY ? solidX : solidY) === 2;
    }
    for (let i = 0; i < this.teleporters.length; i++) {
      const pad = this.teleporters[i];
      const mateIndex = i % 2 === 0 ? (i + 1 < this.teleporters.length ? i + 1 : 0) : i - 1;
      const mate = this.teleporters[mateIndex];
      pad.pair = Math.floor(i / 2);
      if (mate) {
        pad.targetIdx = mate.idx;
        pad.target = mate.center;
      }
    }
    for (const barrel of this.barrels) {
      if (!barrel.horizontal)
        continue;
      let bestDir = 0;
      let bestScore = -1;
      for (let d = 0; d < 4; d++) {
        const nx = barrel.x + WALL_DX[d];
        const ny = barrel.y + WALL_DY[d];
        if (!this.inBounds(nx, ny))
          continue;
        const nidx = ny * this.width + nx;
        if (this.kind[nidx] !== FLOOR || this.diag[nidx] > 0)
          continue;
        let score = this.acidSplash[nidx] ? 10 : this.slime[nidx] ? 1 : 4;
        for (let e = 0; e < 4; e++) {
          const ex = nx + WALL_DX[e];
          const ey = ny + WALL_DY[e];
          if (this.inBounds(ex, ey) && this.kind[ey * this.width + ex] === FLOOR)
            score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestDir = d;
        }
      }
      const jitter = (((barrel.x * 13 + barrel.y * 7) % 5) - 2) * 0.12;
      barrel.angle = Math.atan2(WALL_DY[bestDir], WALL_DX[bestDir]) + jitter;
    }
    for (let y = 0; y < this.rowCount; y++)
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const diag = this.diag[idx];
        if (diag)
          this.diagTriangles.set(idx, new RightTriangle(tileSize, this.center(x, y), DIAG_CORNER[diag]));
      }
    if (!this.playerStart)
      throw new Error(`${this.name}: no player start`);
  }

  /** Whether tile `idx` has its cardinal boundary on side `d` (0: -x, 1: +x, 2: -y, 3: +y) closed by a full wall face. */
  hasCardinalFace(idx, d) {
    const diag = this.diag[idx];
    if (!diag)
      return true;
    if (diag === DIAG_NW)
      return d === 0 || d === 2;
    if (diag === DIAG_NE)
      return d === 1 || d === 2;
    if (diag === DIAG_SW)
      return d === 0 || d === 3;
    return d === 1 || d === 3;
  }

  /**
   * Geometry of a diagonal wall triangle at tile `idx`, or null when the tile is not diagonal.
   * Returned vector instances (`a, b, s, o, normal, center`) are shared scratch or triangle-owned
   * Vec2 objects valid only until the next diagInfo call and must not be mutated by callers.
   */
  diagInfo(idx) {
    const tri = this.diagTriangles.get(idx);
    if (!tri)
      return null;
    const diag = this.diag[idx];
    const x = idx % this.width;
    const y = (idx - x) / this.width;
    tri.getVertices(scratchS, scratchA, scratchB);
    tri.getOppositeCorner(scratchO);
    return {
      idx,
      x,
      y,
      diag,
      tri,
      a: scratchA,
      b: scratchB,
      s: scratchS,
      o: scratchO,
      normal: tri.hypNormal,
      center: tri.position,
    };
  }

  /** Effective wall height at a 2D world point (`Vec2`), respecting the open half of diagonal tiles. */
  heightAtPoint(pos) {
    const idx = this.grid.getCell(pos);
    if (idx < 0)
      return CEILING;
    const h = this.heights[idx];
    if (!h)
      return 0;
    const tri = this.diagTriangles.get(idx);
    if (!tri)
      return h;
    return tri.isIn(pos) ? h : 0;
  }

  buildFaces() {
    let nextId = 1;
    const { width, rowCount, baseHeight, kind, faceIds } = this;
    const neighbourHeight = (x, y, d) => {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (nx < 0 || ny < 0 || nx >= width || ny >= rowCount)
        return Infinity;
      const nidx = ny * width + nx;
      // doors slide away, and the open side of a diagonal tile does not cover this boundary
      return kind[nidx] === DOOR || !this.hasCardinalFace(nidx, d ^ 1) ? 0 : baseHeight[nidx];
    };

    for (let y = 0; y < rowCount; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const h = baseHeight[idx];
        if (!h)
          continue;
        for (let d = 0; d < 4; d++) {
          if (!this.hasCardinalFace(idx, d))
            continue;
          const nh = neighbourHeight(x, y, d);
          if (nh >= h)
            continue;
          // faces facing -x/+x run along y, faces facing -y/+y run along x
          const px = d < 2 ? x : x - 1;
          const py = d < 2 ? y - 1 : y;
          let id = 0;
          if (px >= 0 && py >= 0 && kind[idx] !== DOOR) {
            const pidx = py * width + px;
            if (kind[pidx] === kind[idx] && baseHeight[pidx] === h && this.hasCardinalFace(pidx, d) && neighbourHeight(px, py, d) === nh)
              id = faceIds[pidx * 4 + d];
          }
          faceIds[idx * 4 + d] = id || nextId++;
        }
      }
    }
  }

  center(x, y) {
    return new Vec2((x + 0.5) * TILE, (y + 0.5) * TILE);
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.rowCount;
  }

  /** Tiles an actor can walk through (doors included, they open on demand). */
  isWalkable(x, y) {
    if (!this.inBounds(x, y))
      return false;
    const idx = y * this.width + x;
    const kind = this.kind[idx];
    return kind === FLOOR || kind === DOOR || this.diag[idx] > 0;
  }

  /** Doors sink into the floor, so an open door is just a wall with no height left. */
  setDoorOpen(door, open) {
    door.open = open;
    if (this.kind[door.idx] === DOOR)
      this.heights[door.idx] = this.baseHeight[door.idx] * (1 - open);
  }
}
