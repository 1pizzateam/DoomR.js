import { Grid, Rand, Utils, Vec2 } from '@1pizzateam/spock';
import { Physics, Scene } from '@1pizzateam/bumpr';
import { Blood, makeFeet } from './blood.js';
import { Fog } from './fog.js';
import { DOOR, EYE, Level, TILE } from './level.js';
import { LEVELS } from './levels.js';

/** Collision categories: every body filters on what it should react to. */
export const CAT = { WALL: 1, PLAYER: 2, ENEMY: 4, PICKUP: 8, SHOT: 16, BARREL: 32 };

/** Explosive barrels: a couple of pellets set one off, and the blast sets off its neighbours. */
export const BARREL = { hp: 6, radius: 10, blast: 175, fuse: 0.08 };

/**
 * gait: radians of leg swing per unit walked, so one footfall is PI / gait units whatever the monster.
 * gore: how much blood it holds. stomp: how hard its steps shake the floor.
 */
export const ENEMY_TYPES = {
  imp: { hp: 8, radius: 14, speed: 80, mass: 1, sight: 900, gait: 0.06, gore: 1, steps: true, roar: 0.4 },
  brute: { hp: 22, radius: 18, speed: 130, mass: 3, sight: 900, gait: 0.05, gore: 1.6, steps: true, stomp: 0.3, roar: 0.7 },
  skull: { hp: 6, radius: 12, speed: 95, mass: 0.6, sight: 1000, gait: 0.04, gore: 0.8, flying: true },
  crawler: { hp: 5, radius: 11, speed: 170, mass: 0.8, sight: 800, gait: 0.2, gore: 0.7 },
  swarmer: { hp: 2, radius: 8, speed: 150, mass: 0.4, sight: 700, gait: 0.22, gore: 0.4 },
  wraith: { hp: 7, radius: 12, speed: 115, mass: 0.5, sight: 900, gait: 0.05, gore: 0.5, flying: true, roar: 0.5 },
  boss: { hp: 90, radius: 32, speed: 55, mass: 12, sight: 1300, gait: 0.03, gore: 3.4, steps: true, stomp: 1, roar: 1.5 },
};

/** Monsters that come in packs: one spawn point in a level makes this many. */
const PACK = { swarmer: 4 };
const LEAP_SPEED = 470;

const PLAYER_RADIUS = 14;
const GRID_CELL = TILE * 2;
const PLAYER_WALK = 160;
const PLAYER_RUN = 235;
// the head bob advances 9 rad/s at walking pace and the camera dips twice per 2π of it, so one stride is π of bob
const PLAYER_STRIDE = (PLAYER_WALK * Math.PI) / 9;
const FOOTFALL = (3 * Math.PI) / 4; // bob phase where sin(2 * bob), the camera height, is at its lowest
const PELLETS = 6;
const PELLET_DAMAGE = 3;
const PELLET_SPREAD = 0.075;
const PELLET_VERTICAL_SPREAD = 0.045;
export const FIRE_COOLDOWN = 0.65;
const MAX_HEALTH = 100;
const MAX_AMMO = 60;

function makeBody(pos, radius, { type = 'dynamic', mass = 1, sensor = false, category, mask, velocity }) {
  const size = new Vec2(radius * 2, radius * 2);
  const body = new Physics(pos.clone(), velocity ?? new Vec2(), size, type === 'static' ? 0 : mass, 1, 0, 'circle', 0, sensor, category, mask, 0, type);
  body.setCanSleep(false);
  return body;
}

/**
 * Game rules and simulation: no canvas in here, so it can run headless.
 * BumpR owns collisions and hitscan raycasts, Spock owns the vector maths.
 */
export class Game {
  constructor() {
    this.time = 0;
    this.state = 'title';
    this.levelIndex = 0;
    this.carry = { health: MAX_HEALTH, ammo: 24 };
    this.message = { text: '', age: 99 };
    this.zero = new Vec2();
    this.scratch = new Vec2();
    this.velocity = new Vec2();
    this.shake = 0;
    // set by the title screen's film: a camera that is not the player's, and a fade to black between shots
    this.cam = null;
    this.fade = 0;
    this.toPlayer = new Vec2();
    this.move = new Vec2();
    this.blood = new Blood();
    // sound events for main.js to hand to the audio layer; the rules never touch audio themselves
    this.events = [];
    this.load(0);
  }

  load(index, carry = { health: MAX_HEALTH, ammo: 24 }) {
    this.levelIndex = index;
    this.level = new Level(LEVELS[index]);
    // the grid lets BumpR test only bodies that share a cell instead of every pair; two tiles per cell
    // is wider than any body, so each one touches at most four cells
    this.scene = new Scene(new Grid(this.level.width * TILE, this.level.rowCount * TILE, GRID_CELL));
    this.scene.setGravity(new Vec2(0, 0));
    this.rand = Rand.create(7 + index * 101);
    this.blood.reset(this.level, this.rand);
    this.events.length = 0;
    this.heartbeat = 0;
    this.enemies = [];
    this.pickups = [];
    this.barrels = [];
    this.shots = [];
    this.effects = [];
    this.kills = 0;
    this.flowTile = -1;
    this.flow = new Int16Array(this.level.width * this.level.rowCount);
    this.stats = { time: 0 };

    this.addWalls();
    this.addPlayer(carry);
    this.fog = new Fog(this.level);
    this.fog.update(this.player.pos.x, this.player.pos.y, this.player.angle);
    for (const spawn of this.level.enemies) {
      const count = PACK[spawn.type] ?? 1;
      for (let i = 0; i < count; i++) {
        // a pack starts in a ring around its spawn point
        const angle = (i / count) * Math.PI * 2 + this.rand.float(0, 1);
        const spread = count > 1 ? ENEMY_TYPES[spawn.type].radius * 1.6 : 0;
        this.addEnemy(spawn.type, new Vec2(spawn.pos.x + Math.cos(angle) * spread, spawn.pos.y + Math.sin(angle) * spread));
      }
    }
    for (const spawn of this.level.barrels)
      this.addBarrel(spawn.pos);
    for (const spawn of this.level.pickups)
      this.addPickup(spawn.type, spawn.pos);
    this.totalEnemies = this.enemies.length;
    this.say(this.level.name, 3);
  }

  restart() {
    this.load(this.levelIndex, { health: MAX_HEALTH, ammo: 24 });
    this.state = 'play';
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.load(0);
      this.state = 'title';
      return;
    }
    this.load(this.levelIndex + 1, { health: this.player.health, ammo: Math.max(this.player.ammo, 16) });
    this.state = 'play';
  }

  /** Queue a sound event at a position (the player's, when none is given). */
  emit(type, position = null, extra = {}) {
    const at = position ?? this.player.pos;
    this.events.push({ type, x: at.x, y: at.y, visible: this.fog ? this.fog.canSee(at.x, at.y) : true, ...extra });
    if (this.events.length > 256)
      this.events.splice(0, this.events.length - 256);
  }

  /** An idle enemy that notices the player (or a shot) wakes up, and says so. */
  wake(enemy) {
    if (enemy.state !== 'idle')
      return;
    enemy.state = 'chase';
    // the big ones stop to roar before they come for you
    enemy.roar = enemy.def.roar ?? 0;
    this.emit('alert', enemy.pos, { kind: enemy.type });
    // a pack wakes as one
    if (enemy.type === 'swarmer') {
      for (const other of this.enemies) {
        if (other.type === 'swarmer' && other.state === 'idle' && other.pos.getDistance(enemy.pos) < 240 && !this.scene.raycast(other.pos, enemy.pos, { mask: CAT.WALL }))
          other.state = 'chase';
      }
    }
    if (enemy.type === 'boss') {
      this.say('THE WARDEN WAKES', 2.5);
      this.shake = Math.max(this.shake, 0.8);
    }
  }

  say(text, seconds = 2) {
    this.message = { text, age: 0, life: seconds };
  }

  addWalls() {
    const { level, scene } = this;
    for (let y = 0; y < level.rowCount; y++) {
      let x = 0;
      while (x < level.width) {
        const idx = y * level.width + x;
        const kind = level.kind[idx];
        if (!kind || kind === DOOR) {
          x++;
          continue;
        }
        // merge horizontal runs of solid tiles into one wide AABB
        let run = 1;
        while (x + run < level.width && level.kind[idx + run] && level.kind[idx + run] !== DOOR)
          run++;
        this.addStaticBox(new Vec2((x + run / 2) * TILE, (y + 0.5) * TILE), run * TILE);
        x += run;
      }
    }
    for (const door of level.doors.values())
      door.body = this.addStaticBox(door.center, TILE);
  }

  addStaticBox(center, width) {
    const body = new Physics(center.clone(), new Vec2(), new Vec2(width, TILE), 0, 1, 0, 'aabb', 0, false, CAT.WALL, 0xFFFF, 0, 'static');
    body.ref = { kind: 'wall' };
    this.scene.addBody(body);
    return body;
  }

  addPlayer(carry) {
    const body = makeBody(this.level.playerStart, PLAYER_RADIUS, {
      category: CAT.PLAYER,
      mask: CAT.WALL | CAT.ENEMY | CAT.PICKUP | CAT.SHOT | CAT.BARREL,
    });
    this.scene.addBody(body);
    this.player = {
      body,
      pos: body.position,
      angle: this.level.playerAngle,
      health: carry.health,
      ammo: carry.ammo,
      cooldown: 0,
      flash: 0,
      recoil: 0,
      hurt: 0,
      bob: 0,
      moving: 0,
      hitMarker: 0,
      deadTime: 0,
      feet: makeFeet(),
    };
    body.ref = { kind: 'player' };
    body.onCollision = (other) => this.touch(other);
  }

  addEnemy(type, pos) {
    const def = ENEMY_TYPES[type];
    const body = makeBody(pos, def.radius, {
      mass: def.mass,
      category: CAT.ENEMY,
      mask: CAT.WALL | CAT.PLAYER | CAT.ENEMY | CAT.BARREL,
    });
    const enemy = {
      kind: 'enemy',
      type,
      def,
      body,
      pos: body.position,
      hp: def.hp,
      state: 'idle',
      los: false,
      losTimer: this.rand.float(0, 0.2),
      cooldown: this.rand.float(0.4, 1.2),
      windup: 0,
      pain: 0,
      hurt: 0,
      walk: 0,
      strafe: this.rand.pick(-1, 1),
      strafeTimer: 0,
      bleed: 0,
      deadTime: 0,
      feet: makeFeet(),
      phase: this.rand.float(0, 6.28),
      mode: '',
      leap: 0,
      roar: 0,
      leapDir: new Vec2(),
      hit: false,
      diedAt: -1,
      volley: 0,
      gibbed: false,
    };
    body.ref = enemy;
    this.scene.addBody(body);
    this.enemies.push(enemy);
  }

  addPickup(type, pos) {
    const body = makeBody(pos, 11, { type: 'static', sensor: true, category: CAT.PICKUP, mask: CAT.PLAYER });
    const pickup = { kind: 'pickup', type, body, pos: body.position, taken: false, phase: this.rand.float(0, 6) };
    body.ref = pickup;
    this.scene.addBody(body);
    this.pickups.push(pickup);
  }

  addShot(from, direction, speed, damage) {
    const velocity = new Vec2().scaleVector(direction, speed);
    const body = makeBody(from, 6, {
      sensor: true,
      category: CAT.SHOT,
      mask: CAT.WALL | CAT.PLAYER | CAT.BARREL,
      velocity,
    });
    const shot = { kind: 'shot', body, pos: body.position, damage, life: 5, age: 0, dead: false };
    body.ref = shot;
    this.emit('fireball', from);
    body.onCollision = (other) => {
      if (shot.dead)
        return;
      shot.dead = true;
      if (other === this.player.body)
        this.hurtPlayer(shot.damage);
      else if (other.ref?.kind === 'barrel')
        this.hitBarrel(other.ref, BARREL.hp);
      this.burst(shot.pos.x, shot.pos.y, EYE - 4, 'blast');
      this.emit('explode', shot.pos);
    };
    this.scene.addBody(body);
    this.shots.push(shot);
  }

  addBarrel(pos) {
    const body = makeBody(pos, BARREL.radius, { type: 'static', category: CAT.BARREL, mask: CAT.PLAYER | CAT.ENEMY | CAT.SHOT });
    const barrel = { kind: 'barrel', body, pos: body.position, hp: BARREL.hp, fuse: -1, gone: false, phase: this.rand.float(0, 6) };
    body.ref = barrel;
    this.scene.addBody(body);
    this.barrels.push(barrel);
  }

  /** Damage a barrel. Once it is spent it burns for a moment (the longer the further it was from the first blast). */
  hitBarrel(barrel, amount, delay = BARREL.fuse) {
    if (barrel.gone || barrel.fuse >= 0)
      return;
    barrel.hp -= amount;
    if (barrel.hp <= 0)
      barrel.fuse = delay;
  }

  updateBarrels(dt) {
    for (const barrel of this.barrels) {
      if (barrel.gone || barrel.fuse < 0)
        continue;
      barrel.fuse -= dt;
      if (barrel.fuse <= 0)
        this.detonate(barrel);
    }
  }

  /** The blast hurts whatever it reaches in the open, less the further away it is, and sets off nearby barrels. */
  detonate(barrel) {
    barrel.gone = true;
    this.scene.removeBody(barrel.body);
    const { x, y } = barrel.pos;
    const reaches = (target) => !this.scene.raycast(barrel.pos, target, { mask: CAT.WALL });
    this.burst(x, y, 16, 'boom');
    for (let i = 0; i < 6; i++)
      this.burst(x + this.rand.float(-30, 30), y + this.rand.float(-30, 30), this.rand.float(6, 44), 'fireball');
    this.emit('boom', barrel.pos);

    const away = this.player.pos.getDistance(barrel.pos);
    this.shake = Math.max(this.shake, Utils.clamp(1 - away / 520, 0, 1) * 1.1);
    if (away < BARREL.blast && reaches(this.player.pos))
      this.hurtPlayer(Math.round(8 + 42 * (1 - away / BARREL.blast)));

    for (const enemy of this.enemies) {
      if (enemy.state === 'dead')
        continue;
      const d = enemy.pos.getDistance(barrel.pos);
      if (d < BARREL.blast + enemy.def.radius && reaches(enemy.pos)) {
        enemy.volley = 1e6; // anything a blast kills is blown apart
        this.damageEnemy(enemy, 6 + 30 * Math.max(0, 1 - d / BARREL.blast));
      }
    }
    for (const other of this.barrels) {
      const d = other.pos.getDistance(barrel.pos);
      if (!other.gone && d < BARREL.blast && reaches(other.pos))
        this.hitBarrel(other, BARREL.hp, 0.12 + 0.25 * (d / BARREL.blast));
    }
    this.resolveGibs();
  }

  burst(x, y, z, type) {
    this.effects.push({ type, x, y, z, age: 0, life: type === 'spark' ? 0.25 : type === 'boom' ? 0.8 : type === 'fireball' ? 0.55 : 0.45 });
  }

  /** Player body callback: pickups are sensors, so they report overlaps without pushing back. */
  touch(other) {
    const ref = other.ref;
    if (!ref || ref.kind !== 'pickup' || ref.taken)
      return;
    const player = this.player;
    if (ref.type === 'health' && player.health < MAX_HEALTH) {
      player.health = Math.min(MAX_HEALTH, player.health + 25);
      this.say('Health +25');
    } else if (ref.type === 'ammo' && player.ammo < MAX_AMMO) {
      player.ammo = Math.min(MAX_AMMO, player.ammo + 8);
      this.say('Shells +8');
    } else
      return;
    ref.taken = true;
    this.emit('pickup', null, { kind: ref.type });
  }

  hurtPlayer(amount) {
    const player = this.player;
    if (this.state !== 'play')
      return;
    player.health = Math.max(0, player.health - amount);
    player.hurt = 0.4;
    this.emit('hurt');
    this.blood.splat(Math.ceil(amount / 5) + 1);
    this.blood.floorSplat(player.pos.x + this.rand.float(-18, 18), player.pos.y + this.rand.float(-18, 18), this.rand.float(6, 12));
    if (!player.health) {
      this.state = 'dead';
      player.body.setVelocity(this.zero);
      this.blood.splat(12, 1.5);
      this.emit('death');
    }
  }

  damageEnemy(enemy, amount) {
    if (enemy.state === 'dead')
      return;
    enemy.volley += amount;
    enemy.hp -= amount;
    enemy.hurt = 0.12;
    this.player.hitMarker = 0.15;
    this.wake(enemy);
    if (enemy.hp > 0) {
      if (this.rand.float(0, 1) < 0.2) {
        enemy.pain = 0.25;
        this.emit('pain', enemy.pos, { kind: enemy.type });
      }
      return;
    }
    enemy.state = 'dead';
    enemy.windup = 0;
    enemy.leap = 0;
    enemy.diedAt = this.time;
    this.kills++;
    this.scene.removeBody(enemy.body);
    this.emit('die', enemy.pos, { kind: enemy.type });
    this.blood.gore(enemy.pos.x, enemy.pos.y, enemy.def.gore);
    // killing at point-blank range sprays the player too
    if (enemy.pos.getDistance(this.player.pos) < 130)
      this.blood.splat(enemy.type === 'boss' ? 10 : 4, 1.3);
    if (enemy.type === 'boss') {
      this.shake = 1;
      this.say('THE WARDEN IS DEAD', 3);
    }
    const drop = enemy.type === 'boss' ? 1 : enemy.type === 'swarmer' ? 0.06 : 0.35;
    if (this.rand.float(0, 1) < drop)
      this.addPickup(enemy.type === 'boss' || this.rand.float(0, 1) < 0.5 ? 'health' : 'ammo', enemy.pos);
  }

  /**
   * A monster killed by a volley is blown apart when it was close, or when that one volley did far more than
   * it took to kill it. Its limbs,
   * head and ribs are thrown about (the world draws that) and the blood spray is much bigger.
   */
  resolveGibs() {
    for (const enemy of this.enemies) {
      if (enemy.state !== 'dead' || enemy.diedAt !== this.time || enemy.gibbed)
        continue;
      const close = enemy.pos.getDistance(this.player.pos) < 110;
      if (enemy.type !== 'boss' && !close && enemy.volley < enemy.def.hp * 1.5)
        continue;
      enemy.gibbed = true;
      const away = Math.atan2(enemy.pos.y - this.player.pos.y, enemy.pos.x - this.player.pos.x);
      this.blood.spray(enemy.pos.x, enemy.pos.y, 26, Math.cos(away), Math.sin(away), Math.round(30 * enemy.def.gore), { speed: 280, spread: 150, up: 300 });
      this.blood.spray(enemy.pos.x, enemy.pos.y, 30, 0, 0, Math.round(6 * enemy.def.gore), { spread: 210, up: 360, gib: true });
      this.emit('gib', enemy.pos, { kind: enemy.type });
    }
  }

  fire() {
    const player = this.player;
    player.ammo--;
    this.emit('fire', null, { pump: player.ammo > 0 });
    player.cooldown = FIRE_COOLDOWN;
    player.flash = 0.1;
    player.recoil = 1;

    for (const enemy of this.enemies)
      enemy.volley = 0;
    const end = this.scratch;
    for (let i = 0; i < PELLETS; i++) {
      const angle = player.angle + this.rand.float(-PELLET_SPREAD, PELLET_SPREAD);
      end.setScalar(player.pos.x + Math.cos(angle) * 1600, player.pos.y + Math.sin(angle) * 1600);
      const hit = this.scene.raycast(player.pos, end, { mask: CAT.WALL | CAT.ENEMY | CAT.BARREL });
      if (!hit)
        continue;
      if (hit.body.ref?.kind === 'barrel') {
        this.burst(hit.point.x, hit.point.y, 14, 'spark');
        this.emit('clang', hit.point);
        this.hitBarrel(hit.body.ref, PELLET_DAMAGE);
        continue;
      }
      const enemy = hit.body.ref?.kind === 'enemy' ? hit.body.ref : null;
      if (!enemy) {
        // the pellets spread vertically like they do sideways: tight up close, wide at range
        const height = EYE + this.rand.float(-PELLET_VERTICAL_SPREAD, PELLET_VERTICAL_SPREAD) * hit.point.getDistance(player.pos);
        const marked = this.blood.impact(hit.point.x, hit.point.y, Math.round(hit.normal.x), Math.round(hit.normal.y), height);
        this.burst(hit.point.x, hit.point.y, marked || Utils.clamp(height, 4, 62), 'spark');
        this.emit('impact', hit.point, { surface: this.surfaceAt(hit) });
        continue;
      }
      this.blood.hit(hit.point.x, hit.point.y, this.rand.float(14, 50), Math.cos(angle), Math.sin(angle));
      this.emit('flesh', hit.point);
      if (hit.point.getDistance(player.pos) < 110)
        this.blood.splat(1, 0.7);
      this.damageEnemy(enemy, PELLET_DAMAGE);
    }

    this.resolveGibs();
  }

  /** What a pellet hit: 'door' or plain 'wall', judged by the tile behind the struck face. */
  surfaceAt(hit) {
    const { level } = this;
    const tx = Math.floor((hit.point.x - Math.round(hit.normal.x) * 0.5) / TILE);
    const ty = Math.floor((hit.point.y - Math.round(hit.normal.y) * 0.5) / TILE);
    return level.inBounds(tx, ty) && level.kind[ty * level.width + tx] === DOOR ? 'door' : 'wall';
  }

  use() {
    const player = this.player;
    const facing = this.scratch.setScalar(Math.cos(player.angle), Math.sin(player.angle));
    let best = null;
    let bestDistance = 96;
    for (const door of this.level.doors.values()) {
      const dx = door.center.x - player.pos.x;
      const dy = door.center.y - player.pos.y;
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance && (dx * facing.x + dy * facing.y) / distance > 0.35) {
        best = door;
        bestDistance = distance;
      }
    }
    if (best)
      best.target = best.target ? 0 : 1;
  }

  actorNear(point, distance, enemyDistance = distance) {
    if (this.player.pos.getDistance(point) < distance)
      return true;
    for (const enemy of this.enemies) {
      if (enemy.state !== 'dead' && enemy.pos.getDistance(point) < enemyDistance)
        return true;
    }
    return false;
  }

  updateDoors(dt) {
    for (const door of this.level.doors.values()) {
      if (door.target && door.open < 1)
        this.level.setDoorOpen(door, Math.min(1, door.open + dt / 0.7));
      else if (!door.target && door.open > 0) {
        // only the player opens doors; a closing one just waits for whatever stands in its way
        if (this.actorNear(door.center, 52, 36))
          door.target = 1;
        else
          this.level.setDoorOpen(door, Math.max(0, door.open - dt / 0.7));
      }
      door.body.setActive(door.open < 0.55);
      if (door.open >= 1) {
        door.timer += dt;
        if (door.timer > 4) {
          door.target = 0;
          door.timer = 0;
        }
      } else
        door.timer = 0;
      // one sound each time a door starts to open or to close, whoever asked it to
      if (door.target !== (door.lastTarget ?? 0)) {
        door.lastTarget = door.target;
        this.emit(door.target ? 'doorOpen' : 'doorClose', door.center);
      }
    }
  }

  /** Breadth-first distances from the player's tile, so enemies can path around walls. */
  updateFlow() {
    const { level, flow } = this;
    const tx = Math.floor(this.player.pos.x / TILE);
    const ty = Math.floor(this.player.pos.y / TILE);
    const start = ty * level.width + tx;
    // monsters cannot open doors, so the way through one only exists while it is open
    let doors = 0;
    for (const door of level.doors.values())
      doors = doors * 2 + (door.open > 0.5 ? 1 : 0);
    if (start === this.flowTile && doors === this.flowDoors)
      return;
    this.flowTile = start;
    this.flowDoors = doors;
    flow.fill(-1);
    flow[start] = 0;
    const queue = [start];
    for (let head = 0; head < queue.length; head++) {
      const idx = queue[head];
      const x = idx % level.width;
      const y = (idx - x) / level.width;
      for (let d = 0; d < 4; d++) {
        const nx = x + (d === 0 ? -1 : d === 1 ? 1 : 0);
        const ny = y + (d === 2 ? -1 : d === 3 ? 1 : 0);
        if (!level.isWalkable(nx, ny))
          continue;
        const nidx = ny * level.width + nx;
        if (level.kind[nidx] === DOOR && level.heights[nidx] >= level.baseHeight[nidx] * 0.5)
          continue;
        if (flow[nidx] >= 0)
          continue;
        flow[nidx] = flow[idx] + 1;
        queue.push(nidx);
      }
    }
  }

  /** Centre of the neighbouring tile that is closest to the player, or null if there is none. */
  flowTarget(enemy, out) {
    const { level, flow } = this;
    const x = Math.floor(enemy.pos.x / TILE);
    const y = Math.floor(enemy.pos.y / TILE);
    const here = flow[y * level.width + x];
    if (here <= 0)
      return null;
    let best = here;
    let bx = -1;
    let by = -1;
    for (let d = 0; d < 4; d++) {
      const nx = x + (d === 0 ? -1 : d === 1 ? 1 : 0);
      const ny = y + (d === 2 ? -1 : d === 3 ? 1 : 0);
      if (!level.inBounds(nx, ny))
        continue;
      const value = flow[ny * level.width + nx];
      if (value >= 0 && value < best) {
        best = value;
        bx = nx;
        by = ny;
      }
    }
    return bx < 0 ? null : out.setScalar((bx + 0.5) * TILE, (by + 0.5) * TILE);
  }

  updateEnemy(enemy, dt) {
    enemy.hurt = Math.max(0, enemy.hurt - dt);
    enemy.bleed -= dt;
    if (enemy.state === 'dead') {
      enemy.deadTime += dt;
      // the pool under a corpse keeps spreading while it lies there
      if (enemy.bleed <= 0 && enemy.deadTime < 2.2) {
        enemy.bleed = 0.16;
        const reach = 10 + enemy.deadTime * 12;
        this.blood.floorSplat(enemy.pos.x + this.rand.float(-reach, reach), enemy.pos.y + this.rand.float(-reach, reach), this.rand.float(8, 16) + enemy.deadTime * 6);
      }
      return;
    }
    // wounded enemies leave a trail
    if (enemy.hp < enemy.def.hp * 0.6 && enemy.bleed <= 0) {
      enemy.bleed = 0.14;
      this.blood.drip(enemy.pos.x, enemy.pos.y);
    }

    const player = this.player;
    const toPlayer = this.toPlayer.subVectors(player.pos, enemy.pos);
    const distance = toPlayer.getMagnitude();

    enemy.losTimer -= dt;
    if (enemy.losTimer <= 0) {
      enemy.losTimer = 0.15;
      enemy.los = distance < enemy.def.sight && !this.scene.raycast(enemy.pos, player.pos, { mask: CAT.WALL });
    }

    if (enemy.state === 'idle') {
      enemy.body.setVelocity(this.zero);
      if (enemy.los)
        this.wake(enemy);
      return;
    }
    if (enemy.roar > 0) {
      enemy.roar -= dt;
      enemy.body.setVelocity(this.zero);
      return;
    }
    // a leaping crawler cannot be stopped, not even by pain
    if (enemy.leap > 0) {
      enemy.leap -= dt;
      this.velocity.scaleVector(enemy.leapDir, LEAP_SPEED);
      enemy.body.setVelocity(this.velocity);
      enemy.walk += dt * 14;
      if (!enemy.hit && distance < enemy.def.radius + PLAYER_RADIUS + 8) {
        enemy.hit = true;
        this.hurtPlayer(12);
      }
      if (enemy.leap <= 0)
        enemy.cooldown = 1.6;
      return;
    }
    if (enemy.pain > 0) {
      enemy.pain -= dt;
      enemy.body.setVelocity(this.zero);
      return;
    }

    enemy.cooldown -= dt;
    const move = this.move;
    if (enemy.los || !this.flowTarget(enemy, move))
      move.copy(player.pos);
    move.subtract(enemy.pos).normalize();

    // behind a closed door and out of sight there is no way to the player: wait there
    if (!enemy.los && !enemy.leap && this.flow[Math.floor(enemy.pos.y / TILE) * this.level.width + Math.floor(enemy.pos.x / TILE)] < 0) {
      enemy.body.setVelocity(this.zero);
      return;
    }
    // the warden goes berserk when it is nearly dead
    const rage = enemy.type === 'boss' && enemy.hp < enemy.def.hp * 0.4 ? 1.5 : 1;
    if (rage > 1)
      enemy.cooldown -= dt * 0.5;
    switch (enemy.type) {
      case 'imp': this.driveImp(enemy, dt, move, toPlayer, distance); break;
      case 'skull': this.driveSkull(enemy, dt, move, toPlayer, distance); break;
      case 'crawler': this.driveCrawler(enemy, dt, move, toPlayer, distance); break;
      case 'swarmer': this.driveSwarmer(enemy, dt, move, distance); break;
      case 'wraith': this.driveWraith(enemy, dt, move, distance); break;
      case 'boss': this.driveBoss(enemy, dt, move, toPlayer, distance, rage); break;
      default: this.driveBrute(enemy, dt, move, distance);
    }

    const speed = enemy.def.speed * rage * (enemy.windup > 0 ? 0.15 : 1);
    this.velocity.scaleVector(move, speed);
    if (enemy.type === 'boss')
      this.keepInArena(enemy, this.velocity);
    enemy.body.setVelocity(this.velocity);
    enemy.walk += dt * (enemy.windup > 0 ? 0 : speed * enemy.def.gait);
    if (this.state === 'dead')
      enemy.body.setVelocity(this.zero);
  }

  driveImp(enemy, dt, move, toPlayer, distance) {
    if (enemy.windup > 0) {
      enemy.windup -= dt;
      if (enemy.windup <= 0 && enemy.los) {
        const direction = toPlayer.clone().normalize();
        const from = enemy.pos.clone().addScaledVector(direction, enemy.def.radius + 8);
        this.addShot(from, direction, 220, 10);
        enemy.cooldown = this.rand.float(1.3, 2.4);
      }
      return;
    }
    if (enemy.los) {
      enemy.strafeTimer -= dt;
      if (enemy.strafeTimer <= 0) {
        enemy.strafeTimer = this.rand.float(1.2, 2.5);
        enemy.strafe = -enemy.strafe;
      }
      if (distance < 200)
        move.scale(-0.8);
      else if (distance < 340)
        move.copy(move.perp()).scale(enemy.strafe * 0.7);
      if (enemy.cooldown <= 0 && distance < 750)
        enemy.windup = 0.4;
    }
  }

  /** The warden is too big for the doors: he stops at the edge of his room, sliding along it where he can. */
  keepInArena(enemy, velocity) {
    const { level } = this;
    if (!level.arena)
      return;
    const reach = enemy.def.radius + 6;
    const ahead = (vx, vy) => {
      const length = Math.hypot(vx, vy) || 1;
      return level.inArena(enemy.pos.x + (vx / length) * reach, enemy.pos.y + (vy / length) * reach);
    };
    if (ahead(velocity.x, velocity.y))
      return;
    // try each axis on its own, so he slides along a wall instead of stopping dead
    const vx = ahead(velocity.x, 0) ? velocity.x : 0;
    const vy = ahead(0, velocity.y) ? velocity.y : 0;
    velocity.setScalar(vx, vy);
  }

  /** A flying skull keeps its distance, circles, and spits fireballs. */
  driveSkull(enemy, dt, move, toPlayer, distance) {
    if (enemy.windup > 0) {
      enemy.windup -= dt;
      if (enemy.windup <= 0 && enemy.los) {
        const direction = toPlayer.clone().normalize();
        this.addShot(enemy.pos.clone().addScaledVector(direction, enemy.def.radius + 8), direction, 250, 8);
        enemy.cooldown = this.rand.float(0.9, 1.7);
      }
      return;
    }
    if (!enemy.los)
      return;
    enemy.strafeTimer -= dt;
    if (enemy.strafeTimer <= 0) {
      enemy.strafeTimer = this.rand.float(0.8, 1.8);
      enemy.strafe = -enemy.strafe;
    }
    if (distance < 190)
      move.scale(-0.8);
    else if (distance < 380)
      move.setScalar(-move.y * enemy.strafe * 0.8, move.x * enemy.strafe * 0.8);
    if (enemy.cooldown <= 0 && distance < 800)
      enemy.windup = 0.4;
  }

  /** A crawler zigzags in fast, crouches, and leaps. */
  driveCrawler(enemy, dt, move, toPlayer, distance) {
    if (enemy.windup > 0) {
      enemy.windup -= dt;
      if (enemy.windup <= 0) {
        enemy.leap = 0.34;
        enemy.hit = false;
        enemy.leapDir.copy(toPlayer).normalize();
        this.emit('leap', enemy.pos, { kind: 'crawler' });
      }
      return;
    }
    const weave = Math.sin(this.time * 8 + enemy.phase) * 0.7;
    move.setScalar(move.x - move.y * weave, move.y + move.x * weave).normalize();
    if (enemy.los && distance < 250 && enemy.cooldown <= 0)
      enemy.windup = 0.38;
  }

  /** Swarmers rush in and gnaw; there are always several. */
  driveSwarmer(enemy, dt, move, distance) {
    const reach = enemy.def.radius + PLAYER_RADIUS + 8;
    if (enemy.windup > 0) {
      enemy.windup -= dt;
      if (enemy.windup <= 0) {
        this.emit('bite', enemy.pos, { kind: 'swarmer' });
        if (distance < reach + 8)
          this.hurtPlayer(4);
        enemy.cooldown = 0.5;
      }
      return;
    }
    // each one wanders a little to the side, so a pack spreads around you instead of queueing
    const weave = Math.sin(this.time * 5 + enemy.phase) * 0.5;
    move.setScalar(move.x - move.y * weave, move.y + move.x * weave).normalize();
    if (distance < reach && enemy.cooldown <= 0)
      enemy.windup = 0.15;
  }

  /** A wraith drifts in on a wandering course and rakes whatever it reaches, hard but not often. */
  driveWraith(enemy, dt, move, distance) {
    const reach = enemy.def.radius + PLAYER_RADIUS + 12;
    if (enemy.windup > 0) {
      enemy.windup -= dt;
      if (enemy.windup <= 0) {
        this.emit('rake', enemy.pos, { kind: 'wraith' });
        if (distance < reach + 10)
          this.hurtPlayer(9);
        enemy.cooldown = 0.9;
      }
      return;
    }
    const weave = Math.sin(this.time * 2.2 + enemy.phase) * 0.6;
    move.setScalar(move.x - move.y * weave, move.y + move.x * weave).normalize();
    if (distance < reach && enemy.cooldown <= 0)
      enemy.windup = 0.35;
  }

  /** The warden: a slow giant that slams anything close and throws a fan of fireballs at anything else. */
  driveBoss(enemy, dt, move, toPlayer, distance, rage) {
    const reach = enemy.def.radius + PLAYER_RADIUS + 38;
    if (enemy.windup > 0) {
      enemy.windup -= dt;
      if (enemy.windup <= 0) {
        if (enemy.mode === 'slam') {
          this.shake = 1;
          this.emit('slam', enemy.pos, { kind: 'boss' });
          if (distance < reach + 24)
            this.hurtPlayer(28);
          enemy.cooldown = 1.3 / rage;
        } else {
          const base = Math.atan2(toPlayer.y, toPlayer.x);
          const arms = rage > 1 ? 2 : 1;
          for (let k = -arms; k <= arms; k++) {
            const direction = new Vec2(Math.cos(base + k * 0.22), Math.sin(base + k * 0.22));
            this.addShot(enemy.pos.clone().addScaledVector(direction, enemy.def.radius + 10), direction, 230, 10);
          }
          enemy.cooldown = 2.6 / rage;
        }
      }
      return;
    }
    if (enemy.cooldown > 0 || !enemy.los)
      return;
    if (distance < reach) {
      enemy.mode = 'slam';
      enemy.windup = 0.75;
    } else if (distance < 900) {
      enemy.mode = 'fan';
      enemy.windup = 0.6;
    }
  }

  driveBrute(enemy, dt, move, distance) {
    const reach = enemy.def.radius + PLAYER_RADIUS + 12;
    if (enemy.windup > 0) {
      enemy.windup -= dt;
      if (enemy.windup <= 0) {
        this.emit('swing', enemy.pos, { kind: 'brute' });
        if (distance < reach + 10)
          this.hurtPlayer(14);
        enemy.cooldown = 0.9;
      }
      return;
    }
    if (distance < reach && enemy.cooldown <= 0)
      enemy.windup = 0.3;
  }

  updatePlayer(dt, input) {
    const player = this.player;
    player.angle += input.turn * dt * 2.6 + input.mouseX * 0.0022;
    player.cooldown = Math.max(0, player.cooldown - dt);
    player.flash = Math.max(0, player.flash - dt);
    player.recoil = Math.max(0, player.recoil - dt * 3.5);
    player.hurt = Math.max(0, player.hurt - dt);
    player.hitMarker = Math.max(0, player.hitMarker - dt);

    const speed = input.run ? PLAYER_RUN : PLAYER_WALK;
    const cos = Math.cos(player.angle);
    const sin = Math.sin(player.angle);
    const move = this.velocity.setScalar(
      cos * input.forward - sin * input.strafe,
      sin * input.forward + cos * input.strafe
    );
    if (move.getMagnitude(true) > 1)
      move.normalize();
    move.scale(speed);
    player.body.setVelocity(move);
    player.moving = Utils.clamp(move.getMagnitude() / PLAYER_WALK, 0, 1.5);
    const before = player.bob;
    player.bob += dt * player.moving * 9;
    // the head is lowest once per stride; that is when the foot lands
    const landed = (bob) => Math.floor((bob - FOOTFALL) / Math.PI);
    if (this.state === 'play' && landed(player.bob) > landed(before))
      this.emit('step', null, { wet: player.feet.blood > 0.08, who: 'player' });

    if (input.use)
      this.use();
    if (input.fire && player.cooldown <= 0) {
      if (player.ammo > 0)
        this.fire();
      else {
        player.cooldown = 0.3;
        this.emit('dry');
        this.say('Out of shells', 1);
      }
    }
  }

  /** The player leaves bloody footprints after walking through blood. Monsters only take steps, which are heard. */
  trackFootprints() {
    const { player } = this;
    if (this.state === 'play') {
      this.blood.walk(player.feet, player.pos.x, player.pos.y, 1, PLAYER_STRIDE);
    }
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead')
        continue;
      if (enemy.def.flying)
        continue;
      const step = this.blood.walk(enemy.feet, enemy.pos.x, enemy.pos.y, 1, Math.PI / enemy.def.gait, false);
      if (!step || !enemy.def.steps)
        continue;
      if (enemy.def.stomp) {
        // a heavy foot is felt through the floor, the more the closer it lands
        const power = Utils.clamp(1 - enemy.pos.getDistance(this.player.pos) / 650, 0, 1) * enemy.def.stomp;
        this.shake = Math.max(this.shake, power * 0.55);
        this.emit('stomp', enemy.pos, { kind: enemy.type, power });
      } else
        this.emit('step', enemy.pos, { wet: step === 2, who: enemy.type });
    }
  }

  cleanup() {
    this.shots = this.shots.filter((shot) => {
      if (!shot.dead)
        return true;
      this.scene.removeBody(shot.body);
      return false;
    });
    this.pickups = this.pickups.filter((pickup) => {
      if (!pickup.taken)
        return true;
      this.scene.removeBody(pickup.body);
      return false;
    });
  }

  update(dt, input) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 1.6);
    this.message.age += dt;
    this.blood.update(dt);
    for (const effect of this.effects)
      effect.age += dt;
    this.effects = this.effects.filter((effect) => effect.age < effect.life);

    if (this.state === 'dead')
      this.player.deadTime += dt;
    if (this.state !== 'play' && this.state !== 'dead')
      return;

    if (this.state === 'play') {
      this.stats.time += dt;
      this.updatePlayer(dt, input);
    } else
      this.player.body.setVelocity(this.zero);

    this.updateFlow();
    this.updateDoors(dt);
    this.updateBarrels(dt);
    for (const enemy of this.enemies)
      this.updateEnemy(enemy, dt);
    for (const shot of this.shots) {
      shot.age += dt;
      if (shot.age > shot.life)
        shot.dead = true;
    }

    this.scene.step(dt);
    this.cleanup();
    this.trackFootprints();
    if (this.state === 'play')
      this.fog.update(this.player.pos.x, this.player.pos.y, this.player.angle);

    if (this.state === 'play') {
      // a failing heart: faster the lower the health
      const { health } = this.player;
      if (health > 0 && health < 30) {
        this.heartbeat -= dt;
        if (this.heartbeat <= 0) {
          this.emit('heartbeat');
          this.heartbeat = 0.55 + health / 60;
        }
      }
      for (const exit of this.level.exits) {
        if (exit.getDistance(this.player.pos) < TILE * 0.5 + PLAYER_RADIUS + 10) {
          this.state = 'cleared';
          this.emit('clear');
          break;
        }
      }
    }
  }
}
