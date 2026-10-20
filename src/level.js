import { RightTriangle, Vec2 } from '@1pizzateam/spock';

export const TILE = 64;
export const EYE = 32;
export const CROUCH_EYE = 18;
/** The ceiling is one wall texture high. Blood thrown up this far lands on it. */
export const CEILING = 64;

export const FLOOR = 0;
export const WALL = 1;
export const PILLAR = 2;
export const DOOR = 3;
export const EXIT = 4;

export const DIAG_NONE = 0;
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
};

// Face directions: the side of a tile a ray enters through (0: -x, 1: +x, 2: -y, 3: +y).
const DX = [-1, 1, 0, 0];
const DY = [0, 0, -1, 1];

/**
 * A tile map parsed from ASCII rows.
 * Besides tile kinds and heights it precomputes face ids: neighbouring faces that
 * belong to the same flat wall share an id, so the renderer only draws a vertical
 * line where a wall really starts or ends.
 */
export class Level {
  constructor({ name, rows, angle = 0, par = 120 }) {
    this.name = name;
    this.rows = rows;
    this.par = par;
    this.width = rows[0].length;
    this.rowCount = rows.length;

    const total = this.width * this.rowCount;
    this.kind = new Uint8Array(total);
    this.diag = new Uint8Array(total);
    this.slime = new Uint8Array(total);
    this.teleporter = new Uint8Array(total);
    this.baseHeight = new Float32Array(total);
    this.heights = new Float32Array(total);
    this.faceIds = new Int32Array(total * 4);
    this.secretByTile = new Int16Array(total).fill(-1);

    this.playerStart = null;
    this.playerAngle = angle;
    this.enemies = [];
    this.pickups = [];
    this.barrels = [];
    this.crushers = [];
    this.teleporters = [];
    this.teleporterByTile = new Map();
    this.exits = [];
    this.doors = new Map();
    this.diagTriangles = new Map();
    this.secrets = [];

    this.parse();
    this.buildFaces();
    this.arena = this.findArena();
    this.secrets = this.findSecrets();
  }

  /**
   * Secret supply closets: small dead-end rooms behind a single door (or disguised push-wall 'S') that hold supplies and are not the start or exit.
   */
  findSecrets() {
    const { width, rowCount, kind } = this;
    const total = width * rowCount;
    const visited = new Uint8Array(total);
    const startIdx = Math.floor(this.playerStart.y / TILE) * width + Math.floor(this.playerStart.x / TILE);
    const pickupTiles = new Set(this.pickups.map((p) => Math.floor(p.pos.y / TILE) * width + Math.floor(p.pos.x / TILE)));
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
      if (doors.size === 1 && !doorObj?.lock && !touchesExit && !tiles.has(startIdx) && hasPickup && ((isSecretDoor && tiles.size <= 45) || tiles.size <= 24)) {
        const secretIndex = secrets.length;
        secrets.push(tiles);
        for (const tileIdx of tiles)
          this.secretByTile[tileIdx] = secretIndex;
      }
    }
    return secrets;
  }

  secretAt(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    return this.inBounds(tx, ty) ? this.secretByTile[ty * this.width + tx] : -1;
  }

  isSlime(x, y) {
    return this.inBounds(x, y) && this.slime[y * this.width + x] === 1;
  }

  slimeAt(worldX, worldY) {
    return this.isSlime(Math.floor(worldX / TILE), Math.floor(worldY / TILE));
  }

  isTeleporter(x, y) {
    return this.inBounds(x, y) && this.teleporter[y * this.width + x] === 1;
  }

  teleporterAt(worldX, worldY) {
    const tx = Math.floor(worldX / TILE);
    const ty = Math.floor(worldY / TILE);
    if (!this.inBounds(tx, ty))
      return null;
    return this.teleporterByTile.get(ty * this.width + tx) ?? null;
  }

  /**
   * The room of a giant: every floor tile reachable from any boss spawn without going through a door. A giant never
   * leaves it, and it has no roof, because he is taller than the walls. Null when the level has none.
   */
  findArena() {
    const giants = this.enemies.filter((enemy) => enemy.type === 'boss');
    if (!giants.length)
      return null;
    const { width } = this;
    const arena = new Set();
    const stack = giants.map((giant) => Math.floor(giant.pos.y / TILE) * width + Math.floor(giant.pos.x / TILE));
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

  inArena(x, y) {
    return !!this.arena?.has(Math.floor(y / TILE) * this.width + Math.floor(x / TILE));
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
            this.doors.set(idx, { idx, x, y, center: this.center(x, y), open: 0, target: 0, timer: 0, secret: !!solid.secret, lock: solid.lock ?? null, revealed: false, alongY: false, body: null });
          if (solid.kind === EXIT)
            this.exits.push(this.center(x, y));
        } else if (char === 'P')
          this.playerStart = this.center(x, y);
        else if (ENEMIES[char])
          this.enemies.push({ type: ENEMIES[char], pos: this.center(x, y) });
        else if (char === 'x')
          this.barrels.push({ pos: this.center(x, y) });
        else if (PICKUPS[char])
          this.pickups.push({ type: PICKUPS[char], pos: this.center(x, y) });
        else if (char === '~')
          this.slime[idx] = 1;
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

  /** Geometry of a diagonal wall triangle at tile `idx`, or null when the tile is not diagonal. */
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
      ax: scratchA.x,
      ay: scratchA.y,
      bx: scratchB.x,
      by: scratchB.y,
      sx: scratchS.x,
      sy: scratchS.y,
      ox: scratchO.x,
      oy: scratchO.y,
      nx: tri.hypNormal.x,
      ny: tri.hypNormal.y,
      cx: tri.position.x,
      cy: tri.position.y,
    };
  }

  /** Effective wall height at a 2D world point (`Vec2`), respecting the open half of diagonal tiles. */
  heightAtPoint(pos) {
    const tx = Math.floor(pos.x / TILE);
    const ty = Math.floor(pos.y / TILE);
    if (!this.inBounds(tx, ty))
      return CEILING;
    const idx = ty * this.width + tx;
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
    this.heights[door.idx] = this.baseHeight[door.idx] * (1 - open);
  }
}
