import { dripTime } from './bloodsprites.js';
import { CEILING, DOOR, FLOOR, TILE } from './level.js';

export const BLOOD = {
  particles: 800,
  floor: 360,
  walls: 160,
  ceiling: 140,
  holes: 320,
  doorHoles: 48,
  doorSplats: 24,
  prints: 260,
  splats: 28,
  gravity: 620,
  stride: 26,
};

/** Fresh feet: nothing on them yet. */
export function makeFeet() {
  return { blood: 0, travel: 0, side: 1, x: null, y: null, hx: 0, hy: 0 };
}

/**
 * Blood simulation, with no rendering in it.
 * Droplets and gibs fly under gravity; where they land they leave permanent splats
 * on the floor, and where they hit a wall they leave splats on that wall face.
 * Screen splats are the player's view being sprayed.
 */
export class Blood {
  constructor() {
    // monotonic: the renderer rebuilds its splat buffers whenever this changes
    this.version = 0;
    this.holesVersion = 0;
    this.reset(null, null);
  }

  reset(level, rand) {
    this.level = level;
    this.rand = rand;
    this.particles = [];
    this.floor = [];
    this.walls = [];
    this.ceiling = [];
    // true while some splat on a wall still has a drip running down it, so the renderer redraws them every frame
    this.dripping = false;
    this.holes = [];
    this.prints = [];
    this.splats = [];
    this.version++;
    this.holesVersion++;
  }

  float(min, max) {
    return this.rand.float(min, max);
  }

  /** Spray droplets (or gibs) from a point, mostly along a direction plus a random spread. */
  spray(x, y, z, dirX, dirY, count, { speed = 200, spread = 110, up = 170, gib = false } = {}) {
    for (let i = 0; i < count; i++) {
      const s = speed * this.float(0.35, 1);
      this.particles.push({
        x,
        y,
        z,
        vx: dirX * s + this.float(-spread, spread),
        vy: dirY * s + this.float(-spread, spread),
        vz: this.float(-20, up) * (gib ? 1.4 : 1),
        age: 0,
        life: 2.5,
        gib,
      });
    }
    if (this.particles.length > BLOOD.particles)
      this.particles.splice(0, this.particles.length - BLOOD.particles);
  }

  /** A pellet hitting flesh: spray out of the back, a little back at the shooter. */
  hit(x, y, z, dirX, dirY) {
    this.spray(x, y, z, dirX, dirY, 7, { speed: 250, spread: 95, up: 160 });
    this.spray(x, y, z, -dirX, -dirY, 3, { speed: 110, spread: 70, up: 120 });
    this.floorSplat(x + dirX * 14, y + dirY * 14, this.float(3, 7));
  }

  /** An enemy bursting: a fountain of droplets, gibs, and a wide spatter of splats. */
  gore(x, y, scale = 1) {
    this.spray(x, y, 30, 0, 0, Math.round(50 * scale), { speed: 0, spread: 240, up: 280 });
    this.spray(x, y, 36, 0, 0, Math.round(9 * scale), { spread: 170, up: 340, gib: true });
    this.floorSplat(x, y, 24 * scale);
    for (let i = 0; i < 8; i++)
      this.floorSplat(x + this.float(-34, 34) * scale, y + this.float(-34, 34) * scale, this.float(8, 20));
  }

  /** A single slow drop: wounded enemies leave a trail. */
  drip(x, y) {
    this.spray(x, y, 24, 0, 0, 1, { speed: 0, spread: 22, up: 30 });
  }

  /**
   * A bullet hitting a wall face at height z leaves a permanent crater there.
   * (nx, ny) is the face normal. Returns the height it was marked at, or false when nothing could be marked:
   * a pellet in the floor, or a door that has sunk away, has nothing to hit.
   * Holes on a door belong to the door and move with it as it opens and closes.
   * Low walls stop the shot like any other, so one aimed over the top still marks
   * the face, somewhere on it, instead of leaving only a spark.
   */
  impact(x, y, nx, ny, z) {
    const { level } = this;
    const tx = Math.floor((x - nx * 0.5) / TILE);
    const ty = Math.floor((y - ny * 0.5) / TILE);
    if (!level.inBounds(tx, ty))
      return false;
    const idx = ty * level.width + tx;
    const top = level.heights[idx];
    const door = level.kind[idx] === DOOR ? level.doors.get(idx) : null;
    // a door that has sunk into the floor has no face left to mark
    if (z <= 1 || top <= 1)
      return false;
    const height = z < top - 0.5 ? z : this.float(top * 0.3, top - 1.5);
    // the face lies on a tile boundary: snap to it so every hole shares the wall's plane
    const px = nx ? Math.round(x / TILE) * TILE : x;
    const py = ny ? Math.round(y / TILE) * TILE : y;
    // a door slides: its holes are kept in the door's own height, so they travel with it
    const hole = {
      x: px,
      y: py,
      z: door ? height / (1 - door.open) : height,
      nx,
      ny,
      top: door ? level.baseHeight[idx] : top,
      ...this.faceSpan(px, py, nx, ny, door),
      door,
      seed: this.rand.integer(1, 2147483647),
    };
    this.holes.push(hole);
    if (door) {
      const own = this.holes.filter((h) => h.door === door);
      if (own.length > BLOOD.doorHoles)
        this.holes.splice(this.holes.indexOf(own[0]), 1);
    }
    if (this.holes.length > BLOOD.holes)
      this.holes.shift();
    this.holesVersion++;
    return height;
  }

  /**
   * How far a wall face runs either side of a point on it, along the face (the tangent is (-ny, nx)):
   * `lo` is negative, `hi` positive. The face ends where the wall turns a corner, meets an opening or a
   * wall of another height, so marks can be cut off there instead of hanging in the air. A door is just
   * its own tile, because it slides away from the wall around it.
   */
  faceSpan(x, y, nx, ny, door = null) {
    const { level } = this;
    const tx = -ny;
    const ty = nx;
    const wx = Math.floor((x - nx * 0.5) / TILE);
    const wy = Math.floor((y - ny * 0.5) / TILE);
    const start = level.heights[wy * level.width + wx];
    const kind = level.kind[wy * level.width + wx];
    const continues = (ix, iy) => {
      if (door || !level.inBounds(ix, iy) || !level.inBounds(ix + nx, iy + ny))
        return false;
      const i = iy * level.width + ix;
      return level.kind[i] === kind && level.heights[i] === start && level.heights[(iy + ny) * level.width + ix + nx] <= 0;
    };
    const reach = (dir) => {
      let cx = wx;
      let cy = wy;
      while (continues(cx + tx * dir, cy + ty * dir)) {
        cx += tx * dir;
        cy += ty * dir;
      }
      // the far edge of that tile along the tangent, measured from the point
      const edge = tx ? (cx + (tx * dir > 0 ? 1 : 0)) * TILE : (cy + (ty * dir > 0 ? 1 : 0)) * TILE;
      return tx ? (edge - x) * tx : (edge - y) * ty;
    };
    return { lo: reach(-1), hi: reach(1) };
  }

  floorSplat(x, y, size) {
    this.floor.push({ x, y, size, seed: this.rand.integer(1, 2147483647) });
    if (this.floor.length > BLOOD.floor)
      this.floor.shift();
    this.version++;
  }

  /** Splat on a wall face. (nx, ny) is the face's normal in the game plane, top the wall's height. */
  wallSplat(x, y, z, nx, ny, size, top, door = null) {
    const span = this.faceSpan(x, y, nx, ny, door);
    const seed = this.rand.integer(1, 2147483647);
    this.walls.push({ x, y, z, nx, ny, size, top, door, ...span, seed, age: 0, dripTime: dripTime(seed, size) });
    // blood on a door rides with it, like a hole, and each door keeps only so many
    if (door) {
      const own = this.walls.filter((w) => w.door === door);
      if (own.length > BLOOD.doorSplats)
        this.walls.splice(this.walls.indexOf(own[0]), 1);
    }
    if (this.walls.length > BLOOD.walls)
      this.walls.shift();
    this.version++;
  }

  /**
   * Splat on the ceiling, where blood thrown up lands. For a few seconds it lets go of a drop or two, which fall back
   * down. The times come from its own seed, so nothing is taken from the game's random numbers.
   */
  ceilingSplat(x, y, size) {
    const seed = this.rand.integer(1, 2147483647);
    const drops = [];
    for (let i = 0; i < 1 + (seed % 3); i++)
      drops.push(0.8 + (((seed >>> (3 + i * 5)) % 100) / 100) * 4);
    this.ceiling.push({ x, y, size, seed, height: CEILING - 1.6, age: 0, drops });
    if (this.ceiling.length > BLOOD.ceiling)
      this.ceiling.shift();
    this.version++;
  }

  /** The player's view being sprayed. */
  splat(count, scale = 1) {
    for (let i = 0; i < count; i++) {
      this.splats.push({
        x: this.float(0.04, 0.96),
        y: this.float(0.04, 0.96),
        size: this.float(28, 95) * scale,
        age: 0,
        life: this.float(2.6, 4.8),
        drip: this.float(60, 210),
        seed: this.rand.integer(1, 2147483647),
      });
    }
    if (this.splats.length > BLOOD.splats)
      this.splats.splice(0, this.splats.length - BLOOD.splats);
  }

  /** True when the point is inside a puddle big enough to soak a shoe. */
  inPool(x, y) {
    for (const splat of this.floor) {
      if (splat.size < 5)
        continue;
      const reach = splat.size * 0.75;
      const dx = x - splat.x;
      const dy = y - splat.y;
      if (dx * dx + dy * dy < reach * reach)
        return true;
    }
    return false;
  }

  /**
   * Feed a walker (the player or an enemy) its new position every frame.
   * Stepping in a pool soaks its feet; every stride then leaves an alternating left/right
   * footprint and some of the blood wears off, so the trail thins out and stops.
   */
  walk(feet, x, y, scale = 1, stride = BLOOD.stride * scale, bloody = true) {
    if (feet.x === null) {
      feet.x = x;
      feet.y = y;
      return 0;
    }
    const dx = x - feet.x;
    const dy = y - feet.y;
    const distance = Math.hypot(dx, dy);
    feet.x = x;
    feet.y = y;
    // a jump means a teleport or a level change, not a step
    if (distance > 80 || distance < 0.01)
      return 0;

    // only the player tracks blood about; a monster's feet stay clean, it just takes steps
    if (bloody && this.inPool(x, y))
      feet.blood = 1;
    feet.travel += distance;
    feet.hx += dx;
    feet.hy += dy;
    if (feet.travel < stride)
      return 0;

    const length = Math.hypot(feet.hx, feet.hy) || 1;
    const hx = feet.hx / length;
    const hy = feet.hy / length;
    feet.travel = 0;
    feet.hx = 0;
    feet.hy = 0;
    feet.side = -feet.side;
    if (feet.blood <= 0.08)
      return 1;

    const offset = 5 * scale * feet.side;
    this.prints.push({
      x: x - hy * offset,
      y: y + hx * offset,
      angle: Math.atan2(hy, hx),
      side: feet.side,
      strength: feet.blood,
      scale,
    });
    if (this.prints.length > BLOOD.prints)
      this.prints.shift();
    feet.blood = feet.blood * 0.86 - 0.01;
    this.version++;
    return 2;
  }

  blocked(x, y, z) {
    const { level } = this;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (!level.inBounds(tx, ty))
      return true;
    return level.heights[ty * level.width + tx] > z;
  }

  hitWall(p, nx, ny) {
    if (p.z < 1 || this.rand.float(0, 1) > 0.65)
      return;
    const { level } = this;
    const ox = Math.floor(p.x / TILE);
    const oy = Math.floor(p.y / TILE);
    const tx = Math.floor(nx / TILE);
    const ty = Math.floor(ny / TILE);
    // a face only exists where the tile next to the one the drop was in is solid. A drop that clips a corner
    // enters a tile diagonally, and the tiles beside it can be open floor: marking there would hang in the air.
    const solid = (x, y) => level.inBounds(x, y) && level.heights[y * level.width + x] > p.z;
    const across = tx !== ox && solid(tx, oy);
    const along = ty !== oy && solid(ox, ty);
    if (!across && !along)
      return;
    // when the drop came through a corner of two walls, it struck the face it reached first
    const vertical = across && along
      ? Math.abs(((p.vy > 0 ? ty : ty + 1) * TILE - p.y) * p.vx) < Math.abs(((p.vx > 0 ? tx : tx + 1) * TILE - p.x) * p.vy)
      : along;
    const size = p.gib ? this.float(8, 14) : this.float(3, 9);
    const idx = (vertical ? ty : oy) * level.width + (vertical ? ox : tx);
    // a door slides: blood on it is kept in the door's own height, so it travels with it
    const door = level.kind[idx] === DOOR ? level.doors.get(idx) : null;
    const top = door ? level.baseHeight[idx] : level.heights[idx];
    const z = door ? p.z / (1 - door.open) : p.z;
    if (vertical) {
      const plane = (p.vy > 0 ? ty : ty + 1) * TILE;
      this.wallSplat(p.x, plane, z, 0, p.vy > 0 ? -1 : 1, size, top, door);
    } else {
      const plane = (p.vx > 0 ? tx : tx + 1) * TILE;
      this.wallSplat(plane, p.y, z, p.vx > 0 ? -1 : 1, 0, size, top, door);
    }
  }

  /** True where there is a ceiling to stick to: over open floor and doorways, and not over the giant's room. */
  hitsCeiling(x, y) {
    const { level } = this;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (!level.inBounds(tx, ty))
      return false;
    const idx = ty * level.width + tx;
    return (level.kind[idx] === FLOOR || level.kind[idx] === DOOR) && !level.arena?.has(idx);
  }

  land(p) {
    if (p.gib || this.rand.float(0, 1) < 0.5)
      this.floorSplat(p.x, p.y, p.gib ? this.float(8, 14) : this.float(2.5, 6.5));
  }

  update(dt) {
    const g = BLOOD.gravity;
    let keep = 0;
    for (const p of this.particles) {
      p.age += dt;
      p.vz -= g * dt;
      const nx = p.x + p.vx * dt;
      const ny = p.y + p.vy * dt;
      const nz = p.z + p.vz * dt;
      if (nz <= 0) {
        this.land(p);
        continue;
      }
      if (this.blocked(nx, ny, nz)) {
        this.hitWall(p, nx, ny);
        continue;
      }
      // thrown up as far as the ceiling, it sticks there (not over the warden's room, which has none)
      if (nz >= CEILING && p.vz > 0 && this.hitsCeiling(nx, ny)) {
        if (p.gib || this.rand.float(0, 1) < 0.55)
          this.ceilingSplat(nx, ny, p.gib ? this.float(8, 14) : this.float(2.5, 6.5));
        continue;
      }
      p.x = nx;
      p.y = ny;
      p.z = nz;
      if (p.age < p.life)
        this.particles[keep++] = p;
    }
    this.particles.length = keep;

    // drips run down the walls for a few seconds after a splat lands, and blood on the ceiling lets go of drops
    this.dripping = false;
    for (const wall of this.walls) {
      if (wall.age < wall.dripTime) {
        wall.age += dt;
        this.dripping = true;
      }
    }
    for (const splat of this.ceiling) {
      const before = splat.age;
      splat.age += dt;
      for (const at of splat.drops) {
        if (before < at && splat.age >= at && this.particles.length < BLOOD.particles) {
          this.particles.push({ x: splat.x + ((splat.seed % 7) - 3), y: splat.y + ((splat.seed % 5) - 2), z: CEILING - 1.8, vx: 0, vy: 0, vz: 0, age: 0, life: 2.5, gib: false });
        }
      }
    }

    for (const splat of this.splats)
      splat.age += dt;
    this.splats = this.splats.filter((splat) => splat.age < splat.life);
  }
}
