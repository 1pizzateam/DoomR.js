import { Vec2 } from '@1pizzateam/spock';

export const TILE = 64;
export const EYE = 32;

export const FLOOR = 0;
export const WALL = 1;
export const PILLAR = 2;
export const DOOR = 3;
export const EXIT = 4;

const SOLIDS = {
  '#': { kind: WALL, height: 64 },
  T: { kind: WALL, height: 104 },
  o: { kind: PILLAR, height: 26 },
  D: { kind: DOOR, height: 64 },
  X: { kind: EXIT, height: 64 },
};
const ENEMIES = { i: 'imp', b: 'brute', s: 'skull', c: 'crawler', w: 'swarmer', B: 'boss' };
const PICKUPS = { h: 'health', a: 'ammo' };

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
  constructor({ name, rows, angle = 0 }) {
    this.name = name;
    this.rows = rows;
    this.width = rows[0].length;
    this.rowCount = rows.length;

    const total = this.width * this.rowCount;
    this.kind = new Uint8Array(total);
    this.baseHeight = new Float32Array(total);
    this.heights = new Float32Array(total);
    this.faceIds = new Int32Array(total * 4);

    this.playerStart = null;
    this.playerAngle = angle;
    this.enemies = [];
    this.pickups = [];
    this.barrels = [];
    this.exits = [];
    this.doors = new Map();

    this.parse();
    this.buildFaces();
    this.arena = this.findArena();
  }

  /**
   * The room of a giant: every floor tile reachable from its spawn without going through a door. A giant never
   * leaves it, and it has no roof, because he is taller than the walls. Null when the level has none.
   */
  findArena() {
    const giant = this.enemies.find((enemy) => enemy.type === 'boss');
    if (!giant)
      return null;
    const { width } = this;
    const arena = new Set();
    const stack = [Math.floor(giant.pos.y / TILE) * width + Math.floor(giant.pos.x / TILE)];
    while (stack.length) {
      const idx = stack.pop();
      if (arena.has(idx) || this.kind[idx] !== FLOOR)
        continue;
      arena.add(idx);
      const x = idx % width;
      const y = (idx - x) / width;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (this.inBounds(x + dx, y + dy))
          stack.push((y + dy) * width + x + dx);
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
          if (solid.kind === DOOR)
            this.doors.set(idx, { idx, x, y, center: this.center(x, y), open: 0, target: 0, timer: 0, body: null });
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
        else if (char !== '.')
          throw new Error(`${this.name}: unknown tile "${char}" at ${x},${y}`);
      }
    }
    if (!this.playerStart)
      throw new Error(`${this.name}: no player start`);
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
      // doors slide away, so the walls beside them need their own side faces
      return kind[nidx] === DOOR ? 0 : baseHeight[nidx];
    };

    for (let y = 0; y < rowCount; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const h = baseHeight[idx];
        if (!h)
          continue;
        for (let d = 0; d < 4; d++) {
          const nh = neighbourHeight(x, y, d);
          if (nh >= h)
            continue;
          // faces facing -x/+x run along y, faces facing -y/+y run along x
          const px = d < 2 ? x : x - 1;
          const py = d < 2 ? y - 1 : y;
          let id = 0;
          if (px >= 0 && py >= 0 && kind[idx] !== DOOR) {
            const pidx = py * width + px;
            if (kind[pidx] === kind[idx] && baseHeight[pidx] === h && neighbourHeight(px, py, d) === nh)
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
    const kind = this.kind[y * this.width + x];
    return kind === FLOOR || kind === DOOR;
  }

  /** Doors sink into the floor, so an open door is just a wall with no height left. */
  setDoorOpen(door, open) {
    door.open = open;
    this.heights[door.idx] = this.baseHeight[door.idx] * (1 - open);
  }
}
