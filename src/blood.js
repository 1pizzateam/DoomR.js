import { Rand, Trigo, Utils, Vec2, Vec3 } from '@1pizzateam/spock';
import { dripTime, GIB_VARIANTS } from './bloodsprites.js';
import { MARS_BOULDER_BASE_INSET, MARS_BOULDER_SLOPE } from './floor.js';
import { CEILING, DOOR, FLOOR, PILLAR, TILE } from './level.js';

export const BLOOD = {
  particles: 1400,
  floor: 640,
  gibs: 260,
  walls: 280,
  ceiling: 220,
  holes: 320,
  doorHoles: 48,
  doorSplats: 24,
  prints: 360,
  splats: 40,
  gravity: 620,
  stride: 26,
};

/** Fresh feet: nothing on them yet. */
export function makeFeet() {
  return { blood: 0, travel: 0, side: 1, placed: false, pos: new Vec2(), heading: new Vec2() };
}

// read-only default direction: never mutate
const ZERO_DIR = new Vec2();

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
    this.pt = new Vec2();
    // scratch vectors for internal calls into the vector APIs; each is distinct so nested calls cannot clobber one another
    this.at = new Vec2();
    this.back = new Vec2();
    this.at3 = new Vec3();
    this.cell = new Vec2();
    this.spanAt = new Vec2();
    this.wallPos = new Vec3();
    this.wallNormal = new Vec2();
    this.reset(null, null);
  }

  reset(level, rand) {
    this.level = level;
    this.rand = rand;
    this.severRand = Rand.create(997);
    this.particles = [];
    this.pool = [];
    this.spawnBuf = [];
    this.floor = [];
    this.gibs = [];
    this.walls = [];
    this.ceiling = [];
    // true while some splat on a wall still has a drip running down it, so the renderer redraws them every frame
    this.dripping = false;
    this.hasDissolving = false;
    this.holes = [];
    this.prints = [];
    this.splats = [];
    this.version++;
    this.holesVersion++;
  }

  float(min, max) {
    return this.rand.float(min, max);
  }

  /** A recycled (or new) particle with the full stable shape; callers assign every field. */
  acquire() {
    const p = this.pool.pop();
    if (p)
      return p;
    return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 0, gib: false, sever: false, scale: 1, visualScale: 1, variant: 0, bounces: 0, bleedTimer: 99 };
  }

  release(p) {
    this.pool.push(p);
  }

  /** Drop the oldest particles beyond capacity, returning them to the pool. */
  trim() {
    const { particles } = this;
    const excess = particles.length - BLOOD.particles;
    if (excess <= 0)
      return;
    for (let i = 0; i < excess; i++)
      this.release(particles[i]);
    const kept = particles.length - excess;
    for (let i = 0; i < kept; i++)
      particles[i] = particles[i + excess];
    particles.length = kept;
  }

  /** Spray droplets (or gibs) from a point, mostly along a direction plus a random spread. */
  spray(pos, dir, count, { speed = 200, spread = 110, up = 170, gib = false, scale = 1 } = {}) {
    for (let i = 0; i < count; i++) {
      const s = speed * this.float(0.35, 1);
      const p = this.acquire();
      p.x = pos.x;
      p.y = pos.y;
      p.z = pos.z;
      p.vx = dir.x * s + this.float(-spread, spread);
      p.vy = dir.y * s + this.float(-spread, spread);
      p.vz = this.float(-20, up) * (gib ? 1.35 : 1);
      p.age = 0;
      p.life = gib ? 2.1 : 2.5;
      p.gib = gib;
      p.sever = false;
      p.scale = scale;
      p.visualScale = (gib ? 1.35 : 0.95) * scale;
      p.variant = gib ? (i + this.rand.integer(0, GIB_VARIANTS - 1)) % GIB_VARIANTS : 0;
      p.bounces = gib ? 2 : 0;
      p.bleedTimer = gib ? 0.04 : 99;
      this.particles.push(p);
    }
    this.trim();
  }

  /** A pellet hitting flesh: spray out of the back, a little back at the shooter, plus occasional torn meat shreds. */
  hit(pos, dir, scale = 1) {
    const spreadScale = 0.55 + 0.45 * Math.min(scale, 2);
    const sizeScale = Math.sqrt(scale);
    this.spray(pos, dir, Math.max(1, Math.round(11 * scale)), { speed: 270 * spreadScale, spread: 115 * spreadScale, up: 185, scale: sizeScale });
    this.back.setScalar(-dir.x, -dir.y);
    this.spray(pos, this.back, Math.max(1, Math.round(5 * scale)), { speed: 125 * spreadScale, spread: 80 * spreadScale, up: 135, scale: sizeScale });
    if (this.float(0, 1) < Math.min(0.95, 0.45 * scale))
      this.spray(pos, dir, Math.max(1, Math.round(scale)), { speed: 150 * spreadScale, spread: 95 * spreadScale, up: 190, gib: true, scale: sizeScale });
    this.at.setScalar(pos.x + dir.x * 14 * spreadScale, pos.y + dir.y * 14 * spreadScale);
    this.floorSplat(this.at, this.float(2.4, 5.2) * sizeScale);
  }

  /** An enemy bursting: a massive fountain of arterial droplets, bouncing gib chunks, and concentric pools of viscera. */
  gore(pos, scale = 1, dir = ZERO_DIR) {
    const spreadScale = 0.55 + 0.45 * Math.min(scale, 2.2);
    const sizeScale = Math.sqrt(scale);
    const { at, at3 } = this;
    at3.setScalar(pos.x, pos.y, 30);
    this.spray(at3, dir, Math.round(78 * scale), { speed: 130 * spreadScale, spread: 265 * spreadScale, up: 310, scale: sizeScale });
    at3.setScalar(pos.x, pos.y, 22);
    this.spray(at3, ZERO_DIR, Math.round(42 * scale), { speed: 0, spread: 210 * spreadScale, up: 360, scale: sizeScale });
    at3.setScalar(pos.x, pos.y, 34);
    this.spray(at3, dir, Math.max(1, Math.round(3 * scale)), { speed: 140 * spreadScale, spread: 195 * spreadScale, up: 320, gib: true, scale: sizeScale });
    this.floorSplat(pos, 16 * scale);
    for (let i = 0; i < Math.round(12 * scale); i++) {
      at.setScalar(pos.x + this.float(-42, 42) * scale, pos.y + this.float(-42, 42) * scale);
      this.floorSplat(at, this.float(5, 12) * sizeScale);
    }
    for (let i = 0; i < Math.max(1, Math.round(2 * scale)); i++) {
      at.setScalar(pos.x + this.float(-22, 22) * scale, pos.y + this.float(-22, 22) * scale);
      this.floorGib(at, this.float(2.0, 3.4) * sizeScale, i % GIB_VARIANTS);
    }
  }

  /** A single slow drop: wounded enemies leave a trail scaled to their size. */
  drip(pos, scale = 1) {
    const sizeScale = Math.sqrt(scale);
    this.at3.setScalar(pos.x, pos.y, 24);
    this.spray(this.at3, ZERO_DIR, Math.max(1, Math.round(scale)), { speed: 0, spread: 22 * sizeScale, up: 30, scale: sizeScale });
  }

  /** Localized limb dismemberment burst: arterial fountain + flying meat/bone chunks when an arm is severed or a leg explodes. */
  severBurst(pos, dir = ZERO_DIR, scale = 1, isLeg = false) {
    const sizeScale = Math.sqrt(Math.max(0.25, scale));
    const rng = this.severRand;
    const dropCount = Math.max(8, Math.round(24 * scale));
    for (let i = 0; i < dropCount; i++) {
      const spd = 220 * rng.float(0.35, 1);
      const spread = 170 * sizeScale;
      const p = this.acquire();
      p.x = pos.x;
      p.y = pos.y;
      p.z = pos.z;
      p.vx = dir.x * spd + rng.float(-spread, spread);
      p.vy = dir.y * spd + rng.float(-spread, spread);
      p.vz = rng.float(-20, 170);
      p.age = 0;
      p.life = 2.5;
      p.gib = false;
      p.sever = true;
      p.scale = sizeScale;
      p.visualScale = 0.95 * sizeScale;
      p.variant = 0;
      p.bounces = 0;
      p.bleedTimer = 99;
      this.particles.push(p);
    }
    const gibCount = Math.max(3, Math.round(4 * scale));
    for (let i = 0; i < gibCount; i++) {
      const spd = 175 * rng.float(0.4, 1);
      const spread = 180 * sizeScale;
      const p = this.acquire();
      p.x = pos.x;
      p.y = pos.y;
      p.z = pos.z;
      p.vx = dir.x * spd + rng.float(-spread, spread);
      p.vy = dir.y * spd + rng.float(-spread, spread);
      p.vz = rng.float(-15, 170);
      p.age = 0;
      p.life = 2.1;
      p.gib = true;
      p.sever = true;
      p.scale = sizeScale;
      p.visualScale = 1.35 * sizeScale;
      p.variant = (i + rng.integer(0, GIB_VARIANTS - 1)) % GIB_VARIANTS;
      p.bounces = 2;
      p.bleedTimer = 0.04;
      this.particles.push(p);
    }
    this.trim();
    const gx = pos.x + dir.x * 10;
    const gy = pos.y + dir.y * 10;
    const dissolving = Boolean(this.level?.slimeAt?.(gx, gy));
    if (dissolving)
      this.hasDissolving = true;
    const gibSize = 2.9 * sizeScale;
    const baseHeight = 0.36 + (this.gibs.length % 5) * 0.01;
    this.gibs.push({
      x: gx,
      y: gy,
      size: gibSize,
      baseSize: gibSize,
      variant: (rng.integer(0, GIB_VARIANTS - 1) + (isLeg ? 2 : 1)) % GIB_VARIANTS,
      angle: rng.float(0, Trigo.twopi),
      height: baseHeight,
      baseHeight,
      dissolving,
      age: 0,
      life: dissolving ? 1.8 + Math.min(1.6, gibSize * 0.3) : Infinity,
    });
    if (this.gibs.length > BLOOD.gibs)
      this.gibs.shift();
    this.version++;
  }

  isBoulderTile(idx) {
    const { level } = this;
    return Boolean(level && level.planet === 'mars' && level.kind[idx] === PILLAR && !level.indoor?.has(idx));
  }

  boulderPlacement(cell, pos, normal, top, halfExtent) {
    const cx = (cell.x + 0.5) * TILE;
    const cy = (cell.y + 0.5) * TILE;
    const tanX = -normal.y;
    const tanY = normal.x;
    const rawAlong = (pos.x - cx) * tanX + (pos.y - cy) * tanY;
    const halfW = TILE * 0.5 - (MARS_BOULDER_BASE_INSET + MARS_BOULDER_SLOPE * pos.z);
    const zTop = Math.min(top - 0.6, pos.z + halfExtent);
    const topHalfW = TILE * 0.5 - (MARS_BOULDER_BASE_INSET + MARS_BOULDER_SLOPE * zTop);
    const margin = Math.min(2, topHalfW * 0.25);
    const along = Utils.clamp(rawAlong * (halfW / (TILE * 0.5)), -topHalfW + margin, topHalfW - margin);
    return {
      x: cx + normal.x * halfW + tanX * along,
      y: cy + normal.y * halfW + tanY * along,
      lo: -topHalfW - along,
      hi: topHalfW - along,
      slope: MARS_BOULDER_SLOPE,
    };
  }

  /**
   * A bullet hitting a wall face at height z leaves a permanent crater there.
   * `normal` is the face normal. Returns the height it was marked at, or false when nothing could be marked:
   * a pellet in the floor, or a door that has sunk away, has nothing to hit.
   * Holes on a door belong to the door and move with it as it opens and closes.
   * Low walls stop the shot like any other, so one aimed over the top still marks
   * the face, somewhere on it, instead of leaving only a spark.
   */
  impact(pos, normal, kind = 'hole') {
    const { level } = this;
    const { x, y, z } = pos;
    const nx = normal.x;
    const ny = normal.y;
    const isDiag = Math.abs(nx) > 0.1 && Math.abs(ny) > 0.1;
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
    let px = x;
    let py = y;
    let span;
    if (!isDiag && this.isBoulderTile(idx)) {
      this.cell.setScalar(tx, ty);
      this.wallPos.setScalar(x, y, height);
      const boulder = this.boulderPlacement(this.cell, this.wallPos, normal, top, 8);
      px = boulder.x;
      py = boulder.y;
      span = { lo: boulder.lo, hi: boulder.hi, slope: boulder.slope };
    } else if (isDiag) {
      const cx = (tx + 0.5) * TILE;
      const cy = (ty + 0.5) * TILE;
      const tanX = -ny;
      const tanY = nx;
      const along = (x - cx) * tanX + (y - cy) * tanY;
      px = cx + tanX * along;
      py = cy + tanY * along;
      span = this.faceSpan(this.spanAt.setScalar(px, py), normal, door);
    } else {
      // the face lies on a tile boundary: snap to it so every hole shares the wall's plane
      px = nx ? Math.round(x / TILE) * TILE : x;
      py = ny ? Math.round(y / TILE) * TILE : y;
      span = this.faceSpan(this.spanAt.setScalar(px, py), normal, door);
    }
    // a door slides: its holes are kept in the door's own height, so they travel with it
    const hole = {
      x: px,
      y: py,
      z: door ? height / (1 - door.open) : height,
      nx,
      ny,
      top: door ? level.baseHeight[idx] : top,
      ...span,
      door,
      kind,
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
   * How far a wall face runs either side of a point on it, along the face (the tangent is (-normal.y, normal.x)):
   * `lo` is negative, `hi` positive. The face ends where the wall turns a corner, meets an opening or a
   * wall of another height, so marks can be cut off there instead of hanging in the air. A door is just
   * its own tile, because it slides away from the wall around it.
   */
  faceSpan(pos, normal, door = null) {
    const { level } = this;
    const { x, y } = pos;
    const nx = normal.x;
    const ny = normal.y;
    const tx = -ny;
    const ty = nx;
    const wx = Math.floor((x - nx * 0.5) / TILE);
    const wy = Math.floor((y - ny * 0.5) / TILE);
    if (!level.inBounds(wx, wy))
      return { lo: -TILE * 0.5, hi: TILE * 0.5 };
    const startIdx = wy * level.width + wx;
    const start = level.heights[startIdx];
    const kind = level.kind[startIdx];
    if (Math.abs(nx) > 0.1 && Math.abs(ny) > 0.1) {
      const cx = (wx + 0.5) * TILE;
      const cy = (wy + 0.5) * TILE;
      const along = (x - cx) * tx + (y - cy) * ty;
      const diag = level.diag?.[startIdx] ?? 0;
      const sx = Math.sign(tx);
      const sy = Math.sign(ty);
      const continuesDiag = (ix, iy) => {
        if (door || !diag || !level.inBounds(ix, iy))
          return false;
        const i = iy * level.width + ix;
        return level.diag[i] === diag && level.kind[i] === kind && level.heights[i] === start;
      };
      const reachDiag = (dir) => {
        let steps = 0;
        while (continuesDiag(wx + sx * dir * (steps + 1), wy + sy * dir * (steps + 1)))
          steps++;
        return dir * (steps * TILE * Math.SQRT2 + TILE * Math.SQRT1_2) - along;
      };
      return { lo: reachDiag(-1), hi: reachDiag(1) };
    }
    const faceDir = ny < 0 ? 0 : nx > 0 ? 1 : ny > 0 ? 2 : 3;
    const continues = (ix, iy) => {
      if (door || !level.inBounds(ix, iy) || !level.inBounds(ix + nx, iy + ny))
        return false;
      const i = iy * level.width + ix;
      if (level.diag?.[i] && !level.hasCardinalFace?.(i, faceDir))
        return false;
      const frontIdx = (iy + ny) * level.width + ix + nx;
      const frontOpen = level.heights[frontIdx] <= 0 || (level.diag?.[frontIdx] > 0 && !level.hasCardinalFace?.(frontIdx, faceDir ^ 2));
      return level.kind[i] === kind && level.heights[i] === start && frontOpen;
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

  floorSplat(pos, size) {
    const { x, y } = pos;
    const dissolving = Boolean(this.level?.slimeAt?.(x, y));
    if (dissolving)
      this.hasDissolving = true;
    const seed = this.rand.integer(1, 2147483647);
    this.floor.push(
      dissolving
        ? { x, y, size, baseSize: size, seed, dissolving: true, age: 0, life: 1.3 + Math.min(2.0, size * 0.12), height: 0.28 }
        : { x, y, size, seed }
    );
    if (this.floor.length > BLOOD.floor)
      this.floor.shift();
    this.version++;
  }

  /** Deposit a chunk of meat, bone, skull, or organ on the floor; on acid it dissolves away. */
  floorGib(pos, size = this.float(2.0, 3.4), variant = this.rand.integer(0, GIB_VARIANTS - 1)) {
    const { x, y } = pos;
    const dissolving = Boolean(this.level?.slimeAt?.(x, y));
    if (dissolving)
      this.hasDissolving = true;
    const baseHeight = 0.36 + (this.gibs.length % 5) * 0.01;
    this.gibs.push({
      x,
      y,
      size,
      baseSize: size,
      variant: (variant >>> 0) % GIB_VARIANTS,
      angle: this.float(0, Trigo.twopi),
      height: baseHeight,
      baseHeight,
      dissolving,
      age: 0,
      life: dissolving ? 1.8 + Math.min(1.6, size * 0.3) : Infinity,
    });
    if (this.gibs.length > BLOOD.gibs)
      this.gibs.shift();
    this.version++;
  }

  /** Splat on a wall face. `normal` is the face's normal in the game plane, top the wall's height. */
  wallSplat(pos, normal, size, top, door = null) {
    const { x, y, z } = pos;
    const nx = normal.x;
    const ny = normal.y;
    const isDiag = Math.abs(nx) > 0.1 && Math.abs(ny) > 0.1;
    const wx = Math.floor((x - nx * 0.5) / TILE);
    const wy = Math.floor((y - ny * 0.5) / TILE);
    const idx = this.level?.inBounds(wx, wy) ? wy * this.level.width + wx : -1;
    let px = x;
    let py = y;
    let span;
    if (!isDiag && idx >= 0 && this.isBoulderTile(idx)) {
      const boulder = this.boulderPlacement(this.cell.setScalar(wx, wy), pos, normal, top, size * 1.6);
      px = boulder.x;
      py = boulder.y;
      span = { lo: boulder.lo, hi: boulder.hi, slope: boulder.slope };
    } else
      span = this.faceSpan(this.spanAt.setScalar(x, y), normal, door);
    const seed = this.rand.integer(1, 2147483647);
    this.walls.push({ x: px, y: py, z, nx, ny, size, top, door, ...span, seed, age: 0, dripTime: dripTime(seed, size) });
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
  ceilingSplat(pos, size) {
    const { x, y } = pos;
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
    for (let i = 0; i < count; i++)
      this.splats.push({
        x: this.float(0.04, 0.96),
        y: this.float(0.04, 0.96),
        size: this.float(16, 54) * scale,
        age: 0,
        life: this.float(2.6, 4.8),
        drip: this.float(60, 210),
        seed: this.rand.integer(1, 2147483647),
      });
    if (this.splats.length > BLOOD.splats)
      this.splats.splice(0, this.splats.length - BLOOD.splats);
  }

  /** True when the point is inside a puddle big enough to soak a shoe. */
  inPool(pos) {
    this.pt.copy(pos);
    for (const splat of this.floor) {
      if (splat.size < 5)
        continue;
      const reach = splat.size * 0.75;
      if (this.pt.getDistance(splat, true) < reach * reach)
        return true;
    }
    return false;
  }

  /**
   * Feed a walker (the player or an enemy) its new position every frame.
   * Stepping in a pool soaks its feet; every stride then leaves an alternating left/right
   * footprint and some of the blood wears off, so the trail thins out and stops.
   */
  walk(feet, pos, scale = 1, stride = BLOOD.stride * scale, bloody = true) {
    const { x, y } = pos;
    if (!feet.placed) {
      feet.placed = true;
      feet.pos.copy(pos);
      return 0;
    }
    const dx = x - feet.pos.x;
    const dy = y - feet.pos.y;
    const distance = this.pt.setScalar(dx, dy).getMagnitude();
    feet.pos.copy(pos);
    // a jump means a teleport or a level change, not a step
    if (distance > 80 || distance < 0.01)
      return 0;

    // only the player tracks blood about; a monster's feet stay clean, it just takes steps
    if (bloody && this.inPool(pos))
      feet.blood = 1;
    feet.travel += distance;
    feet.heading.x += dx;
    feet.heading.y += dy;
    if (feet.travel < stride)
      return 0;

    const length = feet.heading.getMagnitude() || 1;
    const hx = feet.heading.x / length;
    const hy = feet.heading.y / length;
    feet.travel = 0;
    feet.heading.setScalar(0, 0);
    feet.side = -feet.side;
    if (this.level?.slimeAt?.(x, y))
      feet.blood *= 0.45;
    if (feet.blood <= 0.08)
      return 1;

    const offset = 5 * scale * feet.side;
    const px = x - hy * offset;
    const py = y + hx * offset;
    const dissolving = Boolean(this.level?.slimeAt?.(px, py));
    if (dissolving)
      this.hasDissolving = true;
    this.prints.push({
      x: px,
      y: py,
      angle: Math.atan2(hy, hx),
      side: feet.side,
      strength: feet.blood,
      baseStrength: feet.blood,
      scale,
      baseScale: scale,
      dissolving,
      age: 0,
      life: dissolving ? 1.1 : Infinity,
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
    if (level.heightAtPoint) {
      this.pt.x = x;
      this.pt.y = y;
      return level.heightAtPoint(this.pt) > z;
    }
    return level.heights[ty * level.width + tx] > z;
  }

  hitWall(p, nx, ny) {
    const { level } = this;
    const ox = Math.floor(p.x / TILE);
    const oy = Math.floor(p.y / TILE);
    const tx = Math.floor(nx / TILE);
    const ty = Math.floor(ny / TILE);
    for (let k = 0; k < 2; k++) {
      const dtx = k === 0 ? ox : tx;
      const dty = k === 0 ? oy : ty;
      if (!level.inBounds(dtx, dty))
        continue;
      const didx = dty * level.width + dtx;
      if (level.diag?.[didx] > 0 && level.heights[didx] > p.z) {
        const df = level.diagInfo(didx);
        const d0 = df.tri.signedDistanceToHypotenuse(this.pt.setScalar(p.x, p.y));
        const d1 = df.tri.signedDistanceToHypotenuse(this.pt.setScalar(nx, ny));
        if (d0 >= -1e-4 && d1 <= 1e-4) {
          if (p.z >= 1 && (p.gib || this.rand.float(0, 1) <= 0.65)) {
            const s = p.scale ?? 1;
            const size = (p.gib ? this.float(5.5, 9.5) : this.float(2.0, 5.2)) * s;
            df.tri.projectOntoHypotenuse(this.pt.setScalar(p.x, p.y), 2, this.pt);
            const sx = this.pt.x;
            const sy = this.pt.y;
            if (!this.blocked(sx + df.normal.x * 0.5, sy + df.normal.y * 0.5, p.z) && this.blocked(sx - df.normal.x * 0.5, sy - df.normal.y * 0.5, p.z))
              this.wallSplat(this.wallPos.setScalar(sx, sy, p.z), df.normal, size, level.heights[didx], null);
          }
          return 'diag';
        }
      }
    }
    // a face only exists where the tile next to the one the drop was in is solid. A drop that clips a corner
    // enters a tile diagonally, and the tiles beside it can be open floor: marking there would hang in the air.
    const solid = (x, y, faceDir) => {
      if (!level.inBounds(x, y))
        return false;
      const i = y * level.width + x;
      if (level.diag?.[i] > 0 && !level.hasCardinalFace?.(i, faceDir))
        return false;
      return level.heights[i] > p.z;
    };
    const across = tx !== ox && solid(tx, oy, p.vx > 0 ? 3 : 1);
    const along = ty !== oy && solid(ox, ty, p.vy > 0 ? 0 : 2);
    if (!across && !along)
      return false;
    // when the drop came through a corner of two walls, it struck the face it reached first
    const vertical = across && along
      ? Math.abs(((p.vy > 0 ? ty : ty + 1) * TILE - p.y) * p.vx) < Math.abs(((p.vx > 0 ? tx : tx + 1) * TILE - p.x) * p.vy)
      : along;
    if (p.z >= 1 && (p.gib || this.rand.float(0, 1) <= 0.65)) {
      const s = p.scale ?? 1;
      const size = (p.gib ? this.float(5.5, 9.5) : this.float(2.0, 5.2)) * s;
      const idx = (vertical ? ty : oy) * level.width + (vertical ? ox : tx);
      // a door slides: blood on it is kept in the door's own height, so it travels with it
      const door = level.kind[idx] === DOOR ? level.doors.get(idx) : null;
      const top = door ? level.baseHeight[idx] : level.heights[idx];
      const z = door ? p.z / (1 - door.open) : p.z;
      const plane = vertical ? (p.vy > 0 ? ty : ty + 1) * TILE : (p.vx > 0 ? tx : tx + 1) * TILE;
      const sx = vertical ? p.x : plane;
      const sy = vertical ? plane : p.y;
      const wnx = vertical ? 0 : (p.vx > 0 ? -1 : 1);
      const wny = vertical ? (p.vy > 0 ? -1 : 1) : 0;
      if (!this.blocked(sx + wnx * 0.5, sy + wny * 0.5, p.z) && this.blocked(sx - wnx * 0.5, sy - wny * 0.5, p.z))
        this.wallSplat(this.wallPos.setScalar(sx, sy, z), this.wallNormal.setScalar(wnx, wny), size, top, door);
    }
    return vertical ? 'y' : 'x';
  }

  /** True where there is a ceiling to stick to: over open floor, doorways, and low pillars, and not over the giant's room. */
  hitsCeiling(x, y) {
    const { level } = this;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (!level.inBounds(tx, ty))
      return false;
    const idx = ty * level.width + tx;
    return (level.kind[idx] === FLOOR || level.kind[idx] === DOOR || level.kind[idx] === PILLAR || level.diag[idx] > 0) && !level.arena?.has(idx);
  }

  land(p) {
    const s = p.scale ?? 1;
    if (p.gib) {
      this.at.setScalar(p.x, p.y);
      this.floorSplat(this.at, this.float(5, 9.5) * s);
      this.floorGib(this.at, this.float(2.0, 3.4) * s, p.variant ?? 0);
    } else if (this.rand.float(0, 1) < 0.5)
      this.floorSplat(this.at.setScalar(p.x, p.y), this.float(1.6, 4.0) * s);
  }

  update(dt) {
    const g = BLOOD.gravity;
    let keep = 0;
    const { spawnBuf } = this;
    spawnBuf.length = 0;
    const n = this.particles.length;
    const mainRand = this.rand;
    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      this.rand = p.sever ? this.severRand : mainRand;
      p.age += dt;
      p.vz -= g * dt;
      if (this.level?.planet === 'mars' && this.level.outdoor?.has(Math.floor(p.y / TILE) * this.level.width + Math.floor(p.x / TILE))) {
        p.vx += this.level.wind.x * dt * 1.6;
        p.vy += this.level.wind.y * dt * 1.6;
      }
      // flying gibs bleed a trail of arterial droplets in mid-air
      if (p.gib && p.age < 1.2) {
        p.bleedTimer = (p.bleedTimer ?? 0.05) - dt;
        if (p.bleedTimer <= 0) {
          p.bleedTimer = 0.065;
          if (n + spawnBuf.length < BLOOD.particles) {
            const d = this.acquire();
            d.x = p.x;
            d.y = p.y;
            d.z = p.z;
            d.vx = p.vx * 0.2 + this.float(-28, 28);
            d.vy = p.vy * 0.2 + this.float(-28, 28);
            d.vz = this.float(-15, 25);
            d.age = 0;
            d.life = 1.4;
            d.gib = false;
            d.sever = Boolean(p.sever);
            d.scale = p.scale ?? 1;
            d.visualScale = 0.8 * d.scale;
            d.variant = 0;
            d.bounces = 0;
            d.bleedTimer = 99;
            spawnBuf.push(d);
          }
        }
      }
      const nx = p.x + p.vx * dt;
      const ny = p.y + p.vy * dt;
      const nz = p.z + p.vz * dt;
      if (nz <= 0) {
        const onSlime = Boolean(this.level?.slimeAt?.(p.x, p.y));
        if (!onSlime && p.gib && p.bounces > 0 && Math.abs(p.vz) > 95 && p.age < 1.4) {
          p.bounces--;
          p.z = 0.5;
          p.vz = Math.abs(p.vz) * 0.36;
          p.vx *= 0.55;
          p.vy *= 0.55;
          this.floorSplat(this.at.setScalar(p.x, p.y), this.float(3.5, 7) * (p.scale ?? 1));
          if (p.age < p.life)
            this.particles[keep++] = p;
          continue;
        }
        this.land(p);
        this.release(p);
        continue;
      }
      if (this.blocked(nx, ny, nz)) {
        const axis = this.hitWall(p, nx, ny);
        if (p.gib && p.bounces > 0 && axis && p.age < 1.4) {
          p.bounces--;
          if (axis === 'x')
            p.vx = -p.vx * 0.42;
          else if (axis === 'y')
            p.vy = -p.vy * 0.42;
          else {
            p.vx = -p.vx * 0.42;
            p.vy = -p.vy * 0.42;
          }
          p.vz *= 0.65;
          p.z = nz;
          if (p.age < p.life)
            this.particles[keep++] = p;
          continue;
        }
        this.release(p);
        continue;
      }
      // thrown up as far as the ceiling, it sticks there (not over the warden's room, which has none)
      if (nz >= CEILING && p.vz > 0 && this.hitsCeiling(nx, ny)) {
        if (p.gib || this.rand.float(0, 1) < 0.55)
          this.ceilingSplat(this.at.setScalar(nx, ny), (p.gib ? this.float(4.8, 8.5) : this.float(1.6, 4.0)) * (p.scale ?? 1));
        if (p.gib && p.bounces > 0) {
          p.bounces--;
          p.z = CEILING - 1;
          p.vz = -Math.abs(p.vz) * 0.3;
          if (p.age < p.life) {
            this.particles[keep++] = p;
            continue;
          }
        }
        this.release(p);
        continue;
      }
      p.x = nx;
      p.y = ny;
      p.z = nz;
      if (p.age < p.life)
        this.particles[keep++] = p;
      else
        this.release(p);
    }
    this.rand = mainRand;
    this.particles.length = keep;
    for (let i = 0; i < spawnBuf.length; i++)
      if (this.particles.length < BLOOD.particles)
        this.particles.push(spawnBuf[i]);
      else
        this.release(spawnBuf[i]);
    spawnBuf.length = 0;

    // blood, gibs, and footprints that landed in liquid acid dissolve and disperse over time
    if (this.hasDissolving) {
      let dissolved = false;
      let stillDissolving = false;
      let keepFloor = 0;
      for (const splat of this.floor) {
        if (!splat.dissolving) {
          this.floor[keepFloor++] = splat;
          continue;
        }
        splat.age += dt;
        dissolved = true;
        if (splat.age >= splat.life)
          continue;
        const t = splat.age / splat.life;
        splat.size = splat.baseSize * (1 - t * t);
        splat.height = 0.28 - t * 0.24;
        splat.x += Math.sin(splat.seed + splat.age * 1.8) * dt * 1.8;
        splat.y += Math.cos(splat.seed * 0.7 + splat.age * 1.5) * dt * 1.8;
        if (splat.size > 0.2) {
          this.floor[keepFloor++] = splat;
          stillDissolving = true;
        }
      }
      this.floor.length = keepFloor;

      let keepGibs = 0;
      for (const gib of this.gibs) {
        if (!gib.dissolving) {
          this.gibs[keepGibs++] = gib;
          continue;
        }
        gib.age += dt;
        dissolved = true;
        if (gib.age >= gib.life)
          continue;
        const t = gib.age / gib.life;
        gib.size = gib.baseSize * (1 - t * t);
        gib.height = gib.baseHeight - t * 0.32;
        gib.angle += dt * 0.35;
        if (gib.size > 0.2) {
          this.gibs[keepGibs++] = gib;
          stillDissolving = true;
        }
      }
      this.gibs.length = keepGibs;

      let keepPrints = 0;
      for (const print of this.prints) {
        if (!print.dissolving) {
          this.prints[keepPrints++] = print;
          continue;
        }
        print.age += dt;
        dissolved = true;
        if (print.age >= print.life)
          continue;
        const t = print.age / print.life;
        print.scale = print.baseScale * (1 - t * 0.75);
        print.strength = print.baseStrength * (1 - t);
        this.prints[keepPrints++] = print;
        stillDissolving = true;
      }
      this.prints.length = keepPrints;
      this.hasDissolving = stillDissolving;

      if (dissolved)
        this.version++;
    }

    // drips run down the walls for a few seconds after a splat lands, and blood on the ceiling lets go of drops
    this.dripping = false;
    for (const wall of this.walls)
      if (wall.age < wall.dripTime) {
        wall.age += dt;
        this.dripping = true;
      }
    for (const splat of this.ceiling) {
      const before = splat.age;
      splat.age += dt;
      for (const at of splat.drops)
        if (before < at && splat.age >= at && this.particles.length < BLOOD.particles)
        {
          const d = this.acquire();
          d.x = splat.x + ((splat.seed % 7) - 3);
          d.y = splat.y + ((splat.seed % 5) - 2);
          d.z = CEILING - 1.8;
          d.vx = 0;
          d.vy = 0;
          d.vz = 0;
          d.age = 0;
          d.life = 2.5;
          d.gib = false;
          d.sever = false;
          d.scale = 1;
          d.visualScale = 1;
          d.variant = 0;
          d.bounces = 0;
          d.bleedTimer = 99;
          this.particles.push(d);
        }
    }

    for (const splat of this.splats)
      splat.age += dt;
    this.splats = this.splats.filter((splat) => splat.age < splat.life);
  }
}
