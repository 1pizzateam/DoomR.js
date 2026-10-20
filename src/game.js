import { Grid, Rand, Trigo, Utils, Vec2 } from '@1pizzateam/spock';
import { Physics, Raycast, Scene } from '@1pizzateam/bumpr';
import { Blood, makeFeet } from './blood.js';
import { Fog } from './fog.js';
import { CEILING, CROUCH_EYE, DOOR, EYE, Level, TILE } from './level.js';
import { LEVELS } from './levels.js';
import { WEAPON_SLOTS, WEAPONS } from './weapon.js';
import { AMMO_TYPES } from './ammo.js';
import { ARMOR_TYPES } from './armor.js';
import { KNIFE_ATTACKS } from './arsenal.js';
import { POWERUP_TYPES } from './powerups.js';

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
  brute: { hp: 22, radius: 18, speed: 130, mass: 3, sight: 900, gait: 0.05, gore: 1.65, steps: true, stomp: 0.3, roar: 0.7 },
  skull: { hp: 6, radius: 12, speed: 95, mass: 0.6, sight: 1000, gait: 0.04, gore: 0.7, flying: true },
  crawler: { hp: 5, radius: 11, speed: 170, mass: 0.8, sight: 800, gait: 0.2, gore: 0.6 },
  swarmer: { hp: 2, radius: 8, speed: 150, mass: 0.4, sight: 700, gait: 0.22, gore: 0.35 },
  wraith: { hp: 7, radius: 12, speed: 115, mass: 0.5, sight: 900, gait: 0.05, gore: 0.45, flying: true, roar: 0.5 },
  boss: { hp: 90, radius: 32, speed: 55, mass: 12, sight: 1300, gait: 0.03, gore: 3.4, steps: true, stomp: 1, roar: 1.5 },
};

/** Monsters that come in packs: one spawn point in a level makes this many on normal difficulty. */
const PACK = { swarmer: 4 };

/** Classic Doom-style startup skill levels: higher difficulty spawns more foes across every level. */
export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard', 'nightmare'];
export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: 'HEY, NOT TOO ROUGH',
    desc: 'FEWER FOES · Half the monsters patrol each facility',
    swarmerPack: 2,
    extra: 0,
  },
  normal: {
    id: 'normal',
    label: 'HURT ME PLENTY',
    desc: 'STANDARD · Full garrison across the Phobos complex',
    swarmerPack: 4,
    extra: 0,
  },
  hard: {
    id: 'hard',
    label: 'ULTRA-VIOLENCE',
    desc: 'HEAVY RESISTANCE · +50% more foes & larger packs',
    swarmerPack: 6,
    extra: 0.5,
  },
  nightmare: {
    id: 'nightmare',
    label: 'NIGHTMARE!',
    desc: 'MAXIMUM HORDE · Double foes & swarmer packs in every sector',
    swarmerPack: 8,
    extra: 1,
  },
};
const LEAP_SPEED = 470;

const PLAYER_RADIUS = 14;
const GRID_CELL = TILE * 2;
const PLAYER_CROUCH = 95;
const PLAYER_WALK = 160;
const PLAYER_RUN = 235;
const CROUCH_SPEED = 10;
// the head bob advances 9 rad/s at walking pace and the camera dips twice per 2π of it, so one stride is π of bob
const PLAYER_STRIDE = (PLAYER_WALK * Trigo.pi) / 9;
const FOOTFALL = (3 * Trigo.pi) / 4; // bob phase where sin(2 * bob), the camera height, is at its lowest
const PELLETS = WEAPONS.shotgun.pellets;
const PELLET_DAMAGE = WEAPONS.shotgun.damage;
const PELLET_MIN_DAMAGE = WEAPONS.shotgun.minDamage;
const PELLET_SPREAD = WEAPONS.shotgun.spread;
const PELLET_FALLOFF_START = WEAPONS.shotgun.falloffStart;
const PELLET_FALLOFF_END = WEAPONS.shotgun.falloffEnd;
const PELLET_VERTICAL_SPREAD = 0.045;
export const FIRE_COOLDOWN = WEAPONS.shotgun.cooldown;
export const AMMO_FLASH_DURATION = 0.65;
// the ammo crates and the pool each one fills, whatever weapon is in hand
const AMMO_CRATES = { ammo: 'shells', bullets: 'bullets', rockets: 'rockets' };
const MAX_HEALTH = 100;

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
  constructor({ difficulty = 'normal' } = {}) {
    this.time = 0;
    this.state = 'title';
    this.selectingDifficulty = false;
    this.difficulty = DIFFICULTIES[difficulty] ? difficulty : 'normal';
    this.levelIndex = 0;
    this.carry = { health: MAX_HEALTH, shells: 0, bullets: 0, rockets: 0 };
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

  get difficultyDef() {
    return DIFFICULTIES[this.difficulty] ?? DIFFICULTIES.normal;
  }

  setDifficulty(difficulty) {
    const next = typeof difficulty === 'number'
      ? DIFFICULTY_ORDER[Utils.clamp(difficulty, 0, DIFFICULTY_ORDER.length - 1)]
      : difficulty;
    if (!DIFFICULTIES[next])
      return this.difficulty;
    const changed = this.difficulty !== next;
    this.difficulty = next;
    if (changed && !this.cam)
      this.load(this.customLevelDef ?? this.levelIndex, this.carry);
    return this.difficulty;
  }

  cycleDifficulty(delta = 1) {
    const idx = DIFFICULTY_ORDER.indexOf(this.difficulty);
    const nextIdx = ((idx < 0 ? 1 : idx) + delta + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length;
    return this.setDifficulty(DIFFICULTY_ORDER[nextIdx]);
  }

  reinforcementPos(spawnPos, slot = 0, target = new Vec2()) {
    const tx = Math.floor(spawnPos.x / TILE);
    const ty = Math.floor(spawnPos.y / TILE);
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];
    const open = [];
    for (const [dx, dy] of dirs) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx <= 0 || ny <= 0 || nx >= this.level.width - 1 || ny >= this.level.rowCount - 1)
        continue;
      const nidx = ny * this.level.width + nx;
      if (this.level.kind[nidx] !== 0)
        continue;
      if (dx !== 0 && dy !== 0) {
        const idxA = ty * this.level.width + (tx + dx);
        const idxB = (ty + dy) * this.level.width + tx;
        if (this.level.kind[idxA] !== 0 || this.level.kind[idxB] !== 0)
          continue;
      }
      const cx = (nx + 0.5) * TILE;
      const cy = (ny + 0.5) * TILE;
      this.scratch.setScalar(cx, cy);
      if (this.scratch.getDistance(this.level.playerStart) < TILE * 2.5)
        continue;
      if (this.level.barrels.some((b) => b.pos.getDistance(this.scratch) < TILE * 0.45))
        continue;
      open.push([cx, cy]);
    }
    if (open.length > 0) {
      const pick = open[(tx * 7 + ty * 13 + slot) % open.length];
      return target.setScalar(pick[0], pick[1]);
    }
    const ox = slot % 2 === 0 ? 10 : -10;
    const oy = slot < 2 ? 10 : -10;
    return target.setScalar(spawnPos.x + ox, spawnPos.y + oy);
  }

  load(indexOrDef, carry = { health: MAX_HEALTH, shells: 0, bullets: 0, rockets: 0 }) {
    if (indexOrDef && typeof indexOrDef === 'object') {
      this.customLevelDef = indexOrDef;
      this.levelIndex = 0;
    } else if (typeof indexOrDef === 'number') {
      if (indexOrDef !== this.levelIndex)
        this.customLevelDef = null;
      this.levelIndex = indexOrDef;
    }
    const def = this.customLevelDef ?? LEVELS[this.levelIndex] ?? LEVELS[0];
    const seedIndex = this.levelIndex;
    this.level = def instanceof Level ? def : new Level(def);
    // the grid lets BumpR test only bodies that share a cell instead of every pair; two tiles per cell
    // is wider than any body, so each one touches at most four cells
    this.scene = new Scene(new Grid(new Vec2(this.level.width * TILE, this.level.rowCount * TILE), GRID_CELL));
    this.scene.setGravity(new Vec2(0, 0));
    this.scene.setPositionCorrection(1);
    this.rand = Rand.create(7 + seedIndex * 101);
    this.limbRand = Rand.create(77 + seedIndex * 101);
    this.blood.reset(this.level, this.rand);
    this.events.length = 0;
    this.heartbeat = 0;
    this.enemies = [];
    this.pickups = [];
    this.barrels = [];
    this.shots = [];
    this.effects = [];
    this.kills = 0;
    this.itemsPicked = 0;
    this.secretsFound = 0;
    this.discoveredSecrets = new Set();
    this.intermission = null;
    this.flowTile = -1;
    this.flow = new Int16Array(this.level.width * this.level.rowCount);
    this.stats = { time: 0 };

    this.addWalls();
    this.addPlayer(carry);
    this.fog = new Fog(this.level);
    this.fog.update(this.player.pos.x, this.player.pos.y, this.player.angle);
    const diff = this.difficultyDef;
    let nonBossIndex = 0;
    for (const spawn of this.level.enemies) {
      const isBoss = spawn.type === 'boss';
      const idx = isBoss ? 0 : nonBossIndex++;
      if (this.difficulty === 'easy' && !isBoss && spawn.type !== 'swarmer' && idx % 2 === 1)
        continue;
      const count = spawn.type === 'swarmer' ? diff.swarmerPack : (PACK[spawn.type] ?? 1);
      for (let i = 0; i < count; i++) {
        // a pack starts in a ring around its spawn point
        const angle = (i / count) * Trigo.twopi + this.rand.float(0, 1);
        const spread = count > 1 ? ENEMY_TYPES[spawn.type].radius * 1.6 : 0;
        this.addEnemy(spawn.type, new Vec2(spawn.pos.x + Math.cos(angle) * spread, spawn.pos.y + Math.sin(angle) * spread));
      }
      if (!isBoss && spawn.type !== 'swarmer') {
        const extraCount = diff.extra >= 1 ? 1 : diff.extra >= 0.5 && idx % 2 === 0 ? 1 : 0;
        for (let e = 0; e < extraCount; e++)
          this.addEnemy(spawn.type, this.reinforcementPos(spawn.pos, idx + e));
      }
    }
    for (const spawn of this.level.barrels)
      this.addBarrel(spawn.pos);
    for (const spawn of this.level.pickups)
      this.addPickup(spawn.type, spawn.pos, true);
    this.totalEnemies = this.enemies.length;
    this.totalItems = this.level.pickups.length;
    this.totalSecrets = this.level.secrets.length;
    this.say(this.level.name, 3);
  }

  restart() {
    this.load(this.customLevelDef ?? this.levelIndex, { health: MAX_HEALTH, shells: 0, bullets: 0, rockets: 0 });
    this.state = 'play';
  }

  giveAll() {
    if (!this.player)
      return;
    const p = this.player;
    p.weapons.knife = true;
    p.weapons.chainsaw = true;
    p.weapons.shotgun = true;
    p.weapons.chaingun = true;
    p.weapons.rocket = true;
    p.shells = AMMO_TYPES.shells.max;
    p.bullets = AMMO_TYPES.bullets.max;
    p.rockets = AMMO_TYPES.rockets.max;
    p.ammo = p.shells;
    p.health = Math.max(p.health, 200);
    p.armor = 200;
    p.armorType = 'blue';
    p.keys.blue = true;
    p.keys.yellow = true;
    p.keys.red = true;
    if (p.weapon === 'knife')
      p.weapon = 'shotgun';
    this.say('IDKFA · Full Arsenal & Keycards Granted', 2.5);
  }

  nextLevel() {
    if (this.customLevelDef) {
      this.restart();
      return;
    }
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.load(0);
      this.state = 'title';
      this.selectingDifficulty = false;
      return;
    }
    this.load(this.levelIndex + 1, {
      health: this.player.health,
      armor: this.player.armor,
      armorType: this.player.armorType,
      shells: Math.max(this.player.shells, 16),
      bullets: Math.max(this.player.bullets, 50),
      rockets: this.player.rockets,
      weapons: { ...this.player.weapons },
      weapon: this.player.weapon,
    });
    this.state = 'play';
  }

  startIntermission() {
    const killsPct = this.totalEnemies > 0 ? Math.min(100, Math.round((this.kills / this.totalEnemies) * 100)) : 100;
    const itemsPct = this.totalItems > 0 ? Math.min(100, Math.round((this.itemsPicked / this.totalItems) * 100)) : 100;
    const secretsPct = this.totalSecrets > 0 ? Math.min(100, Math.round((this.secretsFound / this.totalSecrets) * 100)) : 100;
    const timeSec = Math.floor(this.stats.time);
    const parSec = this.level.par ?? 120;
    this.intermission = {
      age: 0,
      phase: 0,
      pause: 0.45,
      tickTimer: 0,
      killsPct,
      itemsPct,
      secretsPct,
      timeSec,
      parSec,
      shownKills: 0,
      shownItems: 0,
      shownSecrets: 0,
      shownTime: 0,
      done: false,
    };
    this.state = 'cleared';
    this.player.body.setVelocity(this.zero);
    this.emit('clear');
  }

  skipIntermission() {
    const inter = this.intermission;
    if (!inter || inter.done)
      return false;
    inter.shownKills = inter.killsPct;
    inter.shownItems = inter.itemsPct;
    inter.shownSecrets = inter.secretsPct;
    inter.shownTime = inter.timeSec;
    inter.phase = 4;
    inter.pause = 0;
    inter.done = true;
    this.emit('tallyBoom');
    return true;
  }

  updateIntermission(dt) {
    const inter = this.intermission;
    if (!inter || inter.done)
      return;
    inter.age += dt;
    if (inter.pause > 0) {
      inter.pause -= dt;
      return;
    }
    const keys = [
      ['shownKills', 'killsPct', 95],
      ['shownItems', 'itemsPct', 95],
      ['shownSecrets', 'secretsPct', 95],
      ['shownTime', 'timeSec', Math.max(60, inter.timeSec * 0.9)],
    ];
    const [shownKey, targetKey, rate] = keys[inter.phase];
    const target = inter[targetKey];
    const next = inter[shownKey] + dt * rate;
    if (next < target) {
      inter[shownKey] = next;
      inter.tickTimer -= dt;
      if (inter.tickTimer <= 0) {
        inter.tickTimer = 0.065;
        this.emit('tallyTick');
      }
      return;
    }
    inter[shownKey] = target;
    this.emit('tallyBoom');
    inter.phase++;
    inter.tickTimer = 0;
    if (inter.phase >= 4)
      inter.done = true;
    else
      inter.pause = 0.35;
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
    if (enemy.type === 'swarmer')
      for (const body of this.scene.queryCircle(enemy.pos, 240, { mask: CAT.ENEMY })) {
        const other = body.ref;
        if (other?.type === 'swarmer' && other.state === 'idle' && this.scene.hasLineOfSight(other.pos, enemy.pos, { mask: CAT.WALL }))
          other.state = 'chase';
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
    const { level } = this;
    this.diagWalls = [];
    for (let y = 0; y < level.rowCount; y++) {
      let x = 0;
      while (x < level.width) {
        const idx = y * level.width + x;
        const kind = level.kind[idx];
        if (!kind || kind === DOOR) {
          x++;
          continue;
        }
        const df = level.diagInfo(idx);
        if (df) {
          const body = this.addStaticTriangle(df);
          this.diagWalls.push({ ...df, body });
          x++;
          continue;
        }
        // merge horizontal runs of solid full tiles into one wide AABB
        let run = 1;
        while (x + run < level.width && level.kind[idx + run] && level.kind[idx + run] !== DOOR && !level.diag[idx + run])
          run++;
        this.addStaticBox(new Vec2((x + run / 2) * TILE, (y + 0.5) * TILE), run * TILE);
        x += run;
      }
    }
    for (const door of level.doors.values())
      door.body = this.addStaticBox(door.center, TILE);
  }

  addStaticTriangle(df) {
    const body = new Physics(df.tri.position, new Vec2(), df.tri.size, 0, 1, 0, df.tri.shape, 0, false, CAT.WALL, 0xFFFF, 0, 'static');
    body.ref = { kind: 'wall', diag: df.diag, idx: df.idx };
    this.scene.addBody(body);
    return body;
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
    const weapons = {
      knife: carry.weapons?.knife ?? true,
      chainsaw: Boolean(carry.weapons?.chainsaw),
      shotgun: Boolean(carry.weapons?.shotgun),
      chaingun: Boolean(carry.weapons?.chaingun),
      rocket: Boolean(carry.weapons?.rocket),
    };
    const weapon = carry.weapon && weapons[carry.weapon] ? carry.weapon : weapons.shotgun ? 'shotgun' : 'knife';
    const armor = carry.armor ?? 0;
    const armorType = armor > 0 ? (carry.armorType ?? (armor > 100 ? 'blue' : 'green')) : null;
    this.player = {
      body,
      pos: body.position,
      angle: this.level.playerAngle,
      health: carry.health,
      armor,
      armorType,
      shells: carry.shells ?? carry.ammo ?? 0,
      bullets: carry.bullets ?? 0,
      rockets: carry.rockets ?? 0,
      get ammo() {
        const pool = WEAPONS[this.weapon]?.ammoType ?? 'shells';
        return this[pool];
      },
      set ammo(value) {
        const pool = WEAPONS[this.weapon]?.ammoType ?? 'shells';
        this[pool] = value;
      },
      keys: { red: false, yellow: false, blue: false },
      weapons,
      weapon,
      knifeAttack: 'vertical',
      knifeCombo: 0,
      switchTimer: 0,
      cooldown: 0,
      dryFire: false,
      triggerHeld: false,
      spinDown: 0,
      shootFace: 0,
      flash: 0,
      recoil: 0,
      hurt: 0,
      bob: 0,
      moving: 0,
      crouch: 0,
      eye: EYE,
      hitMarker: 0,
      deadTime: 0,
      slimeTimer: 0,
      radFlash: 0,
      berserk: false,
      berserkTimer: 0,
      radSuit: 0,
      soulFlash: 0,
      teleFlash: 0,
      ammoFlash: { shells: 0, bullets: 0, rockets: 0 },
      ammoFrom: { shells: carry.shells ?? carry.ammo ?? 0, bullets: carry.bullets ?? 0, rockets: carry.rockets ?? 0 },
      ammoDelta: { shells: 0, bullets: 0, rockets: 0 },
      teleportCooldown: 0,
      teleportPad: -1,
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
      mask: CAT.WALL | CAT.PLAYER | CAT.ENEMY | CAT.BARREL | CAT.SHOT,
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
      phase: this.rand.float(0, Trigo.twopi),
      mode: '',
      leap: 0,
      roar: 0,
      leapDir: new Vec2(),
      hit: false,
      diedAt: -1,
      volley: 0,
      gibbed: false,
      teleportCooldown: 0,
      limbs: {
        leftArm: true,
        rightArm: true,
        leftLeg: true,
        rightLeg: true,
        damage: { leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 },
        severedAt: { leftArm: -1, rightArm: -1, leftLeg: -1, rightLeg: -1 },
      },
      crawling: false,
    };
    body.ref = enemy;
    this.scene.addBody(body);
    this.enemies.push(enemy);
    return enemy;
  }

  addPickup(type, pos, initial = false) {
    const body = makeBody(pos, 11, { type: 'static', sensor: true, category: CAT.PICKUP, mask: CAT.PLAYER });
    const pickup = { kind: 'pickup', type, body, pos: body.position, taken: false, initial, phase: this.rand.float(0, 6) };
    body.ref = pickup;
    this.scene.addBody(body);
    this.pickups.push(pickup);
    return pickup;
  }

  addShot(from, direction, speed, damage, owner = null) {
    const velocity = new Vec2().scaleVector(direction, speed);
    const body = makeBody(from, 6, {
      sensor: true,
      category: CAT.SHOT,
      mask: CAT.WALL | CAT.PLAYER | CAT.ENEMY | CAT.BARREL,
      velocity,
    });
    if (owner?.body)
      body.ignoreCollisionWith(owner.body);
    const shot = { kind: 'shot', team: 'enemy', body, pos: body.position, damage, life: 5, age: 0, dead: false, owner };
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

  addRocket(from, direction) {
    const def = WEAPONS.rocket;
    const velocity = new Vec2().scaleVector(direction, def.speed);
    const body = makeBody(from, 7, {
      sensor: true,
      category: CAT.SHOT,
      mask: CAT.WALL | CAT.ENEMY | CAT.BARREL,
      velocity,
    });
    const shot = {
      kind: 'rocket',
      team: 'player',
      body,
      pos: body.position,
      dir: direction.clone(),
      damage: def.damage,
      splash: def.splashDamage,
      radius: def.splashRadius,
      life: 4,
      age: 0,
      dead: false,
    };
    body.ref = shot;
    body.onCollision = (other) => {
      if (shot.dead)
        return;
      shot.dead = true;
      this.detonateRocket(shot, other.ref);
    };
    this.scene.addBody(body);
    this.shots.push(shot);
    return shot;
  }

  detonateRocket(shot, directRef = null) {
    const pos = shot.pos;
    this.burst(pos.x, pos.y, 0, 'boom');
    this.emit('boom', pos);
    for (const enemy of this.enemies)
      enemy.volley = 0;

    if (directRef?.kind === 'enemy' && directRef.state !== 'dead') {
      directRef.volley = 1e6;
      this.damageEnemy(directRef, shot.damage);
    } else if (directRef?.kind === 'barrel')
      this.hitBarrel(directRef, BARREL.hp, 0.02);
    else if ((!directRef || directRef.kind === 'wall') && shot.dir) {
      const from = pos.clone().addScaledVector(shot.dir, -16);
      const to = pos.clone().addScaledVector(shot.dir, 16);
      const wallHit = this.scene.raycast(from, to, { mask: CAT.WALL });
      if (wallHit) {
        const nx = Math.abs(wallHit.normal.x) > 0.9 ? Math.round(wallHit.normal.x) : wallHit.normal.x;
        const ny = Math.abs(wallHit.normal.y) > 0.9 ? Math.round(wallHit.normal.y) : wallHit.normal.y;
        this.blood.impact(wallHit.point.x, wallHit.point.y, nx, ny, this.player.eye - 2);
      }
    }

    const reaches = (target) => this.scene.hasLineOfSight(pos, target, { mask: CAT.WALL });
    const away = this.player.pos.getDistance(pos);
    this.shake = Math.max(this.shake, Utils.clamp(1 - away / 520, 0, 1) * 1.15);
    if (away < shot.radius && reaches(this.player.pos))
      this.hurtPlayer(Math.round(6 + 26 * (1 - away / shot.radius)));

    for (const body of this.scene.queryCircle(pos, shot.radius, { mask: CAT.ENEMY })) {
      const enemy = body.ref;
      if (!enemy || enemy.state === 'dead')
        continue;
      const d = enemy.pos.getDistance(pos);
      if (d >= shot.radius + enemy.def.radius || !reaches(enemy.pos))
        continue;
      enemy.volley = 1e6;
      this.damageEnemy(enemy, Math.round(8 + shot.splash * Math.max(0, 1 - d / shot.radius)));
    }
    for (const enemy of this.enemies) {
      if (enemy.state !== 'dead' || !enemy.body.overlapsCircle(pos, shot.radius) || !reaches(enemy.pos))
        continue;
      const dir = this.scratch.subVectors(enemy.pos, pos);
      if (dir.getMagnitude(true) > 0)
        dir.normalize();
      else
        dir.setScalar(1, 0);
      this.mutilateCorpse(enemy, dir.x, dir.y, true);
    }
    for (const body of this.scene.queryCircle(pos, shot.radius, { mask: CAT.BARREL })) {
      const barrel = body.ref;
      const d = barrel.pos.getDistance(pos);
      if (!barrel.gone && d < shot.radius && reaches(barrel.pos))
        this.hitBarrel(barrel, BARREL.hp, 0.08 + 0.2 * (d / shot.radius));
    }
    this.resolveGibs();
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
    const reaches = (target) => this.scene.hasLineOfSight(barrel.pos, target, { mask: CAT.WALL });
    this.burst(x, y, 0, 'boom');
    this.emit('boom', barrel.pos);

    const away = this.player.pos.getDistance(barrel.pos);
    this.shake = Math.max(this.shake, Utils.clamp(1 - away / 520, 0, 1) * 1.1);
    if (away < BARREL.blast && reaches(this.player.pos))
      this.hurtPlayer(Math.round(8 + 42 * (1 - away / BARREL.blast)));

    for (const body of this.scene.queryCircle(barrel.pos, BARREL.blast, { mask: CAT.ENEMY })) {
      const enemy = body.ref;
      if (!enemy || enemy.state === 'dead')
        continue;
      const d = enemy.pos.getDistance(barrel.pos);
      if (d >= BARREL.blast + enemy.def.radius || !reaches(enemy.pos))
        continue;
      enemy.volley = 1e6; // anything a blast kills is blown apart
      this.damageEnemy(enemy, 6 + 30 * Math.max(0, 1 - d / BARREL.blast));
    }
    for (const enemy of this.enemies) {
      if (enemy.state !== 'dead' || !enemy.body.overlapsCircle(barrel.pos, BARREL.blast) || !reaches(enemy.pos))
        continue;
      const dir = this.scratch.subVectors(enemy.pos, barrel.pos);
      if (dir.getMagnitude(true) > 0)
        dir.normalize();
      else
        dir.setScalar(1, 0);
      this.mutilateCorpse(enemy, dir.x, dir.y, true);
    }
    for (const body of this.scene.queryCircle(barrel.pos, BARREL.blast, { mask: CAT.BARREL })) {
      const other = body.ref;
      const d = other.pos.getDistance(barrel.pos);
      if (!other.gone && d < BARREL.blast && reaches(other.pos))
        this.hitBarrel(other, BARREL.hp, 0.12 + 0.25 * (d / BARREL.blast));
    }
    this.resolveGibs();
  }

  burst(x, y, z, type) {
    this.effects.push({
      type,
      x,
      y,
      z,
      age: 0,
      life: type === 'spark' ? 0.25 : type === 'boom' ? 0.8 : type === 'fireball' ? 0.55 : type === 'teleport' ? 0.55 : 0.45,
    });
  }

  flashAmmo(poolId, before, after) {
    const gained = after - before;
    if (gained <= 0)
      return;
    const player = this.player;
    player.ammoFlash ??= { shells: 0, bullets: 0, rockets: 0 };
    player.ammoFrom ??= { shells: 0, bullets: 0, rockets: 0 };
    player.ammoDelta ??= { shells: 0, bullets: 0, rockets: 0 };
    const currentFlash = player.ammoFlash[poolId] ?? 0;
    if (currentFlash > 0) {
      const rollProgress = Utils.clamp(1 - Math.max(0, currentFlash - 0.25) / (AMMO_FLASH_DURATION - 0.25), 0, 1);
      player.ammoFrom[poolId] = Math.round(Utils.lerp(player.ammoFrom[poolId] ?? before, before, rollProgress));
      player.ammoDelta[poolId] = (player.ammoDelta[poolId] ?? 0) + gained;
    } else {
      player.ammoFrom[poolId] = before;
      player.ammoDelta[poolId] = gained;
    }
    player.ammoFlash[poolId] = AMMO_FLASH_DURATION;
  }

  /** Player body callback: pickups are sensors, so they report overlaps without pushing back. */
  touch(other) {
    const ref = other.ref;
    if (!ref || ref.kind !== 'pickup' || ref.taken)
      return;
    const player = this.player;
    if (ref.type === 'redKey' || ref.type === 'yellowKey' || ref.type === 'blueKey') {
      const color = ref.type === 'redKey' ? 'red' : ref.type === 'yellowKey' ? 'yellow' : 'blue';
      const label = color === 'red' ? 'Red' : color === 'yellow' ? 'Yellow' : 'Blue';
      player.keys[color] = true;
      ref.taken = true;
      if (ref.initial)
        this.itemsPicked = Math.min(this.totalItems, this.itemsPicked + 1);
      this.say(`Picked up a ${label} keycard.`);
      this.emit('keycard');
      return;
    }
    if (ref.type === 'chainsaw') {
      if (player.weapons.chainsaw)
        return;
      player.weapons.chainsaw = true;
      ref.taken = true;
      if (ref.initial)
        this.itemsPicked = Math.min(this.totalItems, this.itemsPicked + 1);
      this.selectWeapon('chainsaw');
      this.say('You got the Chainsaw! Find some meat!', 2.5);
      this.emit('weaponPickup');
      return;
    }
    if (ref.type === 'shotgun' || ref.type === 'chaingun' || ref.type === 'rocket') {
      const isNew = !player.weapons[ref.type];
      const pool = AMMO_TYPES[WEAPONS[ref.type].ammoType];
      if (!isNew && player[pool.id] >= pool.max) {
        this.say(`${pool.label} full`);
        return;
      }
      player.weapons[ref.type] = true;
      const bonus = isNew && ref.type === 'shotgun' ? 0 : pool.weaponBonus;
      const before = player[pool.id];
      player[pool.id] = Math.min(pool.max, before + bonus);
      this.flashAmmo(pool.id, before, player[pool.id]);
      ref.taken = true;
      if (ref.initial)
        this.itemsPicked = Math.min(this.totalItems, this.itemsPicked + 1);
      if (isNew) {
        this.selectWeapon(ref.type);
        this.say(
          ref.type === 'shotgun'
            ? 'You got the Shotgun!'
            : ref.type === 'chaingun'
              ? 'You got the Chaingun!'
              : 'You got the Rocket Launcher!',
          2.5
        );
      } else
        this.say(`${pool.label} +${bonus}`);
      this.emit('weaponPickup');
      return;
    }
    if (ref.type === 'greenArmor' || ref.type === 'blueArmor') {
      const isBlue = ref.type === 'blueArmor';
      const cap = isBlue ? ARMOR_TYPES.blue.points : ARMOR_TYPES.green.points;
      if (player.armor >= cap)
        return;
      player.armor = cap;
      player.armorType = isBlue ? 'blue' : 'green';
      ref.taken = true;
      if (ref.initial)
        this.itemsPicked = Math.min(this.totalItems, this.itemsPicked + 1);
      this.say(isBlue ? 'Picked up the MegaArmor!' : 'Picked up the Security Armor.');
      this.emit('armor');
      return;
    }
    if (ref.type === 'soulsphere') {
      const { bonus, maxHealth } = POWERUP_TYPES.soulsphere;
      if (player.health >= maxHealth)
        return;
      player.health = Math.min(maxHealth, player.health + bonus);
      player.soulFlash = 0.75;
      ref.taken = true;
      if (ref.initial)
        this.itemsPicked = Math.min(this.totalItems, this.itemsPicked + 1);
      this.say('Supercharge! +100% Health', 2.5);
      this.emit('powerup', null, { kind: 'soulsphere' });
      return;
    }
    if (ref.type === 'berserk') {
      const { healTo, tintDuration } = POWERUP_TYPES.berserk;
      if (player.berserk && player.health >= healTo)
        return;
      player.health = Math.max(player.health, healTo);
      player.berserk = true;
      player.berserkTimer = tintDuration;
      ref.taken = true;
      if (ref.initial)
        this.itemsPicked = Math.min(this.totalItems, this.itemsPicked + 1);
      this.selectWeapon(player.weapons.chainsaw ? 'chainsaw' : 'knife');
      this.say('Berserk! Rip and tear!', 2.5);
      this.emit('powerup', null, { kind: 'berserk' });
      return;
    }
    if (ref.type === 'radsuit') {
      const { duration } = POWERUP_TYPES.radsuit;
      if ((player.radSuit ?? 0) >= duration - 2)
        return;
      player.radSuit = duration;
      player.slimeTimer = 0;
      ref.taken = true;
      if (ref.initial)
        this.itemsPicked = Math.min(this.totalItems, this.itemsPicked + 1);
      this.say('Radiation Shielding Suit!', 2.5);
      this.emit('powerup', null, { kind: 'radsuit' });
      return;
    }
    if (ref.type === 'health' && player.health < MAX_HEALTH) {
      player.health = Math.min(MAX_HEALTH, player.health + 25);
      this.say('Health +25');
    } else if (AMMO_CRATES[ref.type]) {
      const pool = AMMO_TYPES[AMMO_CRATES[ref.type]];
      if (player[pool.id] >= pool.max) {
        this.say(`${pool.label} full`);
        return;
      }
      const before = player[pool.id];
      player[pool.id] = Math.min(pool.max, before + pool.bonus);
      this.flashAmmo(pool.id, before, player[pool.id]);
      this.say(`${pool.label} +${pool.bonus}`);
    } else
      return;
    ref.taken = true;
    if (ref.initial)
      this.itemsPicked = Math.min(this.totalItems, this.itemsPicked + 1);
    this.emit('pickup', null, { kind: ref.type });
  }

  hurtPlayer(amount) {
    const player = this.player;
    if (this.state !== 'play' || player.godMode)
      return;
    let healthLoss = amount;
    if (player.armor > 0) {
      const save = player.armorType === 'blue' ? ARMOR_TYPES.blue.save : ARMOR_TYPES.green.save;
      const absorbed = Math.min(player.armor, Math.max(1, Math.round(amount * save)));
      player.armor -= absorbed;
      healthLoss = Math.max(0, amount - absorbed);
      if (player.armor <= 0)
        player.armorType = null;
    }
    player.health = Math.max(0, player.health - healthLoss);
    player.hurt = 0.4;
    this.emit('hurt');
    this.blood.splat(Math.ceil(amount / 5) + 1);
    this.blood.floorSplat(player.pos.x + this.rand.float(-18, 18), player.pos.y + this.rand.float(-18, 18), this.rand.float(6, 12));
    if (!player.health) {
      this.state = 'dead';
      player.body.setVelocity(this.zero);
      for (const enemy of this.enemies) {
        if (enemy.state === 'dead')
          continue;
        enemy.windup = 0;
        enemy.leap = 0;
        enemy.roar = 0;
        enemy.body.setVelocity(this.zero);
      }
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
    enemy.pain = 0;
    enemy.hurt = 0;
    enemy.diedAt = this.time;
    this.kills++;
    this.scene.removeBody(enemy.body);
    this.emit('die', enemy.pos, { kind: enemy.type });
    const away = Math.atan2(enemy.pos.y - this.player.pos.y, enemy.pos.x - this.player.pos.x);
    const dirX = Math.cos(away);
    const dirY = Math.sin(away);
    enemy.deathDirX = dirX;
    enemy.deathDirY = dirY;
    enemy.deathFountain = 0.08;
    this.blood.gore(enemy.pos.x, enemy.pos.y, enemy.def.gore, dirX, dirY);
    // killing at point-blank range sprays the player too
    if (enemy.pos.getDistance(this.player.pos) < 130)
      this.blood.splat(Math.max(1, Math.round(4 * enemy.def.gore)), 0.8 + 0.5 * Math.min(enemy.def.gore, 2));
    if (enemy.type === 'boss') {
      const remainingBosses = this.enemies.some((other) => other.type === 'boss' && other.state !== 'dead');
      this.shake = Math.max(this.shake, remainingBosses ? 1 : 1.35);
      this.say(remainingBosses ? 'A WARDEN FALLS' : 'THE WARDEN IS DEAD', 3);
    }
    const drop = enemy.type === 'boss' ? 1 : enemy.type === 'swarmer' ? 0.06 : 0.35;
    if (this.rand.float(0, 1) < drop) {
      const weapon = this.player.weapon ?? 'shotgun';
      const ammoKind = weapon === 'chaingun' ? 'bullets' : weapon === 'rocket' ? 'rockets' : 'ammo';
      this.addPickup(enemy.type === 'boss' || this.rand.float(0, 1) < 0.5 ? 'health' : ammoKind, enemy.pos);
    }
  }

  /** Blows an enemy or corpse apart ("XDeath"), launching directional fountains of arterial blood and bouncing gibs. */
  gibEnemy(enemy, dirX = 0, dirY = 0) {
    enemy.gibbed = true;
    enemy.gibbedAt = this.time;
    enemy.postGibHits = 0;
    enemy.postGibTime1 = 0;
    enemy.postGibTime2 = 0;
    enemy.deadTime = 0;
    enemy.pain = 0;
    enemy.hurt = 0;
    const gore = enemy.def.gore;
    const sizeScale = Math.sqrt(gore);
    const freshKill = enemy.diedAt === this.time;
    this.blood.gore(enemy.pos.x, enemy.pos.y, gore * (freshKill ? 0.55 : 1.15), dirX, dirY);
    this.blood.spray(enemy.pos.x, enemy.pos.y, 26, dirX, dirY, Math.max(2, Math.round(36 * gore)), { speed: 290, spread: 165 * sizeScale, up: 320, scale: sizeScale });
    this.blood.spray(enemy.pos.x, enemy.pos.y, 30, dirX, dirY, Math.max(1, Math.round(2 * gore)), { speed: 170, spread: 230 * sizeScale, up: 380, gib: true, scale: sizeScale });
    if (enemy.pos.getDistance(this.player.pos) < 170) {
      this.blood.splat(Math.max(1, Math.round(6 * gore)), 0.9 + 0.5 * Math.min(gore, 2));
      this.shake = Math.max(this.shake, 0.35 * gore);
    }
    this.emit('gib', enemy.pos, { kind: enemy.type });
  }

  /** Mutilates a dead corpse when struck by shotgun pellets or a nearby explosion, shredding it into gibs and allowing 2 post-gib hits before exhausting. */
  mutilateCorpse(enemy, dirX, dirY, forceGib = false) {
    if (enemy.type === 'wraith')
      return;
    const gore = enemy.def.gore;
    const sizeScale = Math.sqrt(gore);
    if (enemy.gibbed) {
      if ((enemy.gibbedAt ?? -1) >= this.time || (enemy.lastPostGibShot ?? -1) >= this.time || (enemy.postGibHits ?? 0) >= 2)
        return;
      enemy.postGibHits = (enemy.postGibHits ?? 0) + 1;
      enemy.lastPostGibShot = this.time;
      if (enemy.postGibHits === 1)
        enemy.postGibTime1 = enemy.deadTime;
      else
        enemy.postGibTime2 = enemy.deadTime;
      this.blood.hit(enemy.pos.x + this.rand.float(-8, 8) * sizeScale, enemy.pos.y + this.rand.float(-8, 8) * sizeScale, this.rand.float(6, 20), dirX, dirY, gore * 1.35);
      this.blood.spray(enemy.pos.x, enemy.pos.y, 12, dirX, dirY, Math.max(3, Math.round(3 * gore)), { speed: 165, spread: 160 * sizeScale, up: 240, gib: true, scale: sizeScale });
      this.emit('flesh', enemy.pos);
      if (enemy.pos.getDistance(this.player.pos) < 120)
        this.blood.splat(1, 0.55 + 0.25 * Math.min(gore, 2));
      return;
    }
    enemy.corpseDamage = (enemy.corpseDamage ?? 0) + (forceGib ? 999 : PELLET_DAMAGE);
    this.blood.hit(enemy.pos.x + this.rand.float(-8, 8) * sizeScale, enemy.pos.y + this.rand.float(-8, 8) * sizeScale, this.rand.float(6, 20), dirX, dirY, gore);
    this.emit('flesh', enemy.pos);
    if (enemy.pos.getDistance(this.player.pos) < 120)
      this.blood.splat(1, 0.55 + 0.25 * Math.min(gore, 2));
    if (forceGib || enemy.corpseDamage >= Math.max(9, Math.round(18 * gore)))
      this.gibEnemy(enemy, dirX, dirY);
  }

  /** Severs an arm (making it fall to the deck) or blows apart a leg (forcing the monster to crawl while still attacking). */
  severLimb(enemy, limb, dirX = 0, dirY = 0) {
    if (!enemy?.limbs || !enemy.limbs[limb] || enemy.state === 'dead' || enemy.type === 'wraith' || (this.inShot && enemy.limbs.severedThisShot))
      return false;
    enemy.limbs[limb] = false;
    enemy.limbs.severedAt[limb] = this.time;
    if (this.inShot)
      enemy.limbs.severedThisShot = true;
    enemy.pain = Math.max(enemy.pain, 0.28);
    const isLeg = limb === 'leftLeg' || limb === 'rightLeg';
    if (isLeg && !enemy.def.flying) {
      enemy.crawling = true;
      enemy.leap = 0;
    }
    this.blood.severBurst(enemy.pos.x, enemy.pos.y, isLeg ? 12 : 28, dirX, dirY, enemy.def.gore, isLeg);
    return true;
  }

  damageLimb(enemy, limb, amount, dirX = 0, dirY = 0) {
    if (!enemy?.limbs || !enemy.limbs[limb] || enemy.state === 'dead' || enemy.type === 'wraith' || (this.inShot && enemy.limbs.severedThisShot))
      return false;
    enemy.limbs.damage[limb] += amount;
    const threshold = Math.max(2, Math.round(enemy.def.hp * 0.25));
    if (enemy.limbs.damage[limb] >= threshold && enemy.hp > amount)
      return this.severLimb(enemy, limb, dirX, dirY);
    return false;
  }

  /** Localizes a close-range impact to the struck left/right side, randomly targeting the arm or leg on that side. */
  hitEnemyLimb(enemy, hitPoint, _hitZ, dirX, dirY, amount) {
    if (!enemy?.limbs || enemy.state === 'dead' || enemy.type === 'wraith' || enemy.hp <= amount || (this.inShot && enemy.limbs.severedThisShot))
      return false;
    const dist = this.player ? enemy.pos.getDistance(this.player.pos) : 0;
    if (dist >= 240)
      return false;
    const falloff = dist <= 140 ? 1 : Utils.clamp((240 - dist) / 100, 0, 1);
    const limbAmount = amount * falloff * falloff;
    const hx = hitPoint.x - enemy.pos.x;
    const hy = hitPoint.y - enemy.pos.y;
    const lateral = (hx * -dirY + hy * dirX) / Math.max(1, enemy.def.radius);
    if (Math.abs(lateral) < 0.12)
      return false;
    const side = lateral < 0 ? 'left' : 'right';
    const arm = `${side}Arm`;
    const leg = `${side}Leg`;
    const hasArm = enemy.limbs[arm];
    const hasLeg = enemy.limbs[leg];
    if (!hasArm && !hasLeg)
      return false;
    let limb;
    if (hasArm && hasLeg) {
      enemy.limbs.sideTarget ??= {};
      if (!enemy.limbs.sideTarget[side] || !enemy.limbs[enemy.limbs.sideTarget[side]])
        enemy.limbs.sideTarget[side] = this.limbRand.pick(arm, leg);
      limb = enemy.limbs.sideTarget[side];
    } else
      limb = hasArm ? arm : leg;
    return this.damageLimb(enemy, limb, limbAmount, dirX, dirY);
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
      const close = enemy.pos.getDistance(this.player.pos) < 120;
      const overkill = enemy.hp <= -Math.max(4, enemy.def.hp * 0.45) || enemy.volley >= Math.max(9, enemy.def.hp * 1.35);
      if (enemy.type !== 'boss' && !close && !overkill)
        continue;
      const away = Math.atan2(enemy.pos.y - this.player.pos.y, enemy.pos.x - this.player.pos.x);
      this.gibEnemy(enemy, Math.cos(away), Math.sin(away));
    }
  }

  selectWeapon(slotOrName) {
    const player = this.player;
    let target = WEAPON_SLOTS[slotOrName] ?? slotOrName;
    if (slotOrName === 1) {
      if (player.weapons.chainsaw && player.weapons.knife)
        target = player.weapon === 'chainsaw' ? 'knife' : 'chainsaw';
      else
        target = player.weapons.chainsaw ? 'chainsaw' : 'knife';
    }
    if (!WEAPONS[target] || !player.weapons[target] || player.weapon === target)
      return false;
    player.weapon = target;
    player.switchTimer = 0.22;
    player.cooldown = Math.max(player.cooldown, 0.16);
    player.dryFire = true;
    player.triggerHeld = false;
    player.spinDown = 0;
    player.chainsawIdle = 0.24;
    this.emit('weaponSwitch', null, { weapon: target });
    return true;
  }

  fire() {
    const weapon = this.player.weapon ?? 'shotgun';
    if (weapon === 'knife')
      this.fireKnife();
    else if (weapon === 'chainsaw')
      this.fireChainsaw();
    else if (weapon === 'chaingun')
      this.fireChaingun();
    else if (weapon === 'rocket')
      this.fireRocket();
    else
      this.fireShotgun();
  }

  hitCorpseAlongRay(end, dirX, dirY, radiusPad, forceGib = false) {
    const { player } = this;
    for (const corpse of this.enemies) {
      if (corpse.state !== 'dead' || (corpse.gibbed && (corpse.postGibHits ?? 0) >= 2) || corpse.diedAt >= this.time)
        continue;
      if ((corpse.pos.x - player.pos.x) * dirX + (corpse.pos.y - player.pos.y) * dirY <= 0)
        continue;
      if (Raycast.sweepCircleCircle(player.pos, end, radiusPad, corpse.pos, corpse.def.radius)) {
        this.mutilateCorpse(corpse, dirX, dirY, forceGib);
        return;
      }
    }
  }

  fireKnife() {
    const player = this.player;
    const def = WEAPONS.knife;
    const attack = KNIFE_ATTACKS[(player.knifeCombo ?? 0) % KNIFE_ATTACKS.length];
    player.knifeAttack = attack;
    player.knifeCombo = ((player.knifeCombo ?? 0) + 1) % KNIFE_ATTACKS.length;
    player.cooldown = def.cooldown;
    player.dryFire = false;
    player.shootFace = 0.32;
    player.recoil = 0.25;
    this.shake = Math.max(this.shake, 0.08);
    this.emit('knife', player.pos, { attack });

    for (const enemy of this.enemies)
      enemy.volley = 0;

    const cos = Math.cos(player.angle);
    const sin = Math.sin(player.angle);
    const end = this.scratch.setScalar(player.pos.x + cos * def.reach, player.pos.y + sin * def.reach);
    const hit = this.scene.raycast(player.pos, end, { mask: CAT.WALL | CAT.ENEMY | CAT.BARREL });
    this.hitCorpseAlongRay(hit ? hit.point : end, cos, sin, 10, Boolean(player.berserk));

    const dmg = def.damage * (player.berserk ? POWERUP_TYPES.berserk.multiplier : 1);
    if (!hit)
      return;
    if (hit.body.ref?.kind === 'barrel') {
      this.burst(hit.point.x, hit.point.y, 14, 'spark');
      this.emit('clang', hit.point);
      this.hitBarrel(hit.body.ref, dmg);
      return;
    }
    const enemy = hit.body.ref?.kind === 'enemy' ? hit.body.ref : null;
    if (!enemy) {
      const height = Utils.clamp(player.eye - 2 + this.rand.float(-5, 5), 4, 62);
      this.burst(hit.point.x, hit.point.y, height, 'spark');
      this.emit('clang', hit.point);
      this.emit('impact', hit.point, { surface: this.surfaceAt(hit) });
      return;
    }
    const gore = enemy.def.gore;
    const sizeScale = Math.sqrt(gore);
    if (player.berserk)
      enemy.volley = 1e6;
    enemy.pain = Math.max(enemy.pain, 0.22);
    const hitZ = this.rand.float(16, 44) - (player.crouch ?? 0) * 12;
    this.blood.hit(hit.point.x, hit.point.y, hitZ, cos, sin, gore);
    this.blood.spray(hit.point.x, hit.point.y, 20, -cos, -sin, Math.max(2, Math.round((player.berserk ? 14 : 5) * gore)), { speed: 170, spread: 130 * sizeScale, up: 200, gib: Boolean(player.berserk), scale: sizeScale });
    this.blood.splat(Math.max(1, Math.round((player.berserk ? 4 : 1) * Math.min(gore, 1.8))), 0.65 + 0.25 * Math.min(gore, 2));
    this.shake = Math.max(this.shake, player.berserk ? 0.42 : 0.2);
    this.emit('flesh', hit.point);
    this.hitEnemyLimb(enemy, hit.point, hitZ, cos, sin, dmg);
    this.damageEnemy(enemy, dmg);
    this.resolveGibs();
  }

  fireChainsaw() {
    const player = this.player;
    const def = WEAPONS.chainsaw;
    player.cooldown = def.cooldown;
    player.dryFire = false;
    player.shootFace = 0.42;
    player.recoil = 0.35;
    this.shake = Math.max(this.shake, 0.14);

    for (const enemy of this.enemies)
      enemy.volley = 0;

    const cos = Math.cos(player.angle);
    const sin = Math.sin(player.angle);
    const end = this.scratch.setScalar(player.pos.x + cos * def.reach, player.pos.y + sin * def.reach);
    const hit = this.scene.raycast(player.pos, end, { mask: CAT.WALL | CAT.ENEMY | CAT.BARREL });
    this.emit('chainsaw', null, { hit: Boolean(hit) });
    this.hitCorpseAlongRay(hit ? hit.point : end, cos, sin, 10, true);

    const dmg = def.damage * (player.berserk ? POWERUP_TYPES.berserk.multiplier : 1);
    if (!hit)
      return;
    if (hit.body.ref?.kind === 'barrel') {
      this.burst(hit.point.x, hit.point.y, 14, 'spark');
      this.emit('clang', hit.point);
      this.hitBarrel(hit.body.ref, dmg);
      return;
    }
    const enemy = hit.body.ref?.kind === 'enemy' ? hit.body.ref : null;
    if (!enemy) {
      const height = player.eye - 2 + this.rand.float(-5, 5);
      const nx = Math.abs(hit.normal.x) > 0.9 ? Math.round(hit.normal.x) : hit.normal.x;
      const ny = Math.abs(hit.normal.y) > 0.9 ? Math.round(hit.normal.y) : hit.normal.y;
      const marked = this.blood.impact(hit.point.x, hit.point.y, nx, ny, height, 'slash');
      this.burst(hit.point.x, hit.point.y, marked || Utils.clamp(height, 4, 62), 'spark');
      this.emit('clang', hit.point);
      this.emit('impact', hit.point, { surface: this.surfaceAt(hit) });
      return;
    }
    const gore = enemy.def.gore;
    const sizeScale = Math.sqrt(gore);
    enemy.volley = 1e6;
    enemy.pain = Math.max(enemy.pain, 0.22);
    const hitZ = this.rand.float(16, 44) - (player.crouch ?? 0) * 12;
    this.blood.hit(hit.point.x, hit.point.y, hitZ, cos, sin, gore);
    this.blood.spray(hit.point.x, hit.point.y, 20, -cos, -sin, Math.max(2, Math.round((player.berserk ? 16 : 8) * gore)), { speed: 190, spread: 140 * sizeScale, up: 220, gib: player.berserk || this.rand.float(0, 1) < 0.35, scale: sizeScale });
    this.blood.splat(Math.max(1, Math.round((player.berserk ? 4 : 2) * Math.min(gore, 1.8))), 0.75 + 0.25 * Math.min(gore, 2));
    this.shake = Math.max(this.shake, player.berserk ? 0.48 : 0.28);
    this.emit('flesh', hit.point);
    this.hitEnemyLimb(enemy, hit.point, hitZ, cos, sin, dmg);
    this.damageEnemy(enemy, dmg);
    this.resolveGibs();
  }

  fireShotgun() {
    const player = this.player;
    player.shells = Math.max(0, player.shells - 1);
    this.emit('fire', null, { pump: player.shells > 0 });
    player.cooldown = FIRE_COOLDOWN;
    player.dryFire = false;
    player.shootFace = 0.42;
    player.flash = 0.1;
    player.recoil = 1;

    for (const enemy of this.enemies) {
      enemy.volley = 0;
      if (enemy.limbs)
        enemy.limbs.severedThisShot = false;
    }
    this.inShot = true;
    const end = this.scratch;
    for (let i = 0; i < PELLETS; i++) {
      const angle = player.angle + this.rand.float(-PELLET_SPREAD, PELLET_SPREAD);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      end.setScalar(player.pos.x + cos * 1600, player.pos.y + sin * 1600);
      const hit = this.scene.raycast(player.pos, end, { mask: CAT.WALL | CAT.ENEMY | CAT.BARREL });
      const maxDist = hit ? hit.point.getDistance(player.pos) : 1600;
      this.hitCorpseAlongRay(hit ? hit.point : end, cos, sin, 6);
      if (!hit)
        continue;
      const falloff = Utils.clamp((maxDist - PELLET_FALLOFF_START) / (PELLET_FALLOFF_END - PELLET_FALLOFF_START), 0, 1);
      const pelletDmg = PELLET_DAMAGE - falloff * (PELLET_DAMAGE - PELLET_MIN_DAMAGE);
      if (hit.body.ref?.kind === 'barrel') {
        this.burst(hit.point.x, hit.point.y, 14, 'spark');
        this.emit('clang', hit.point);
        this.hitBarrel(hit.body.ref, pelletDmg);
        continue;
      }
      const enemy = hit.body.ref?.kind === 'enemy' ? hit.body.ref : null;
      if (!enemy) {
        // the pellets spread vertically like they do sideways: tight up close, wide at range
        const height = player.eye + this.rand.float(-PELLET_VERTICAL_SPREAD, PELLET_VERTICAL_SPREAD) * maxDist;
        const nx = Math.abs(hit.normal.x) > 0.9 ? Math.round(hit.normal.x) : hit.normal.x;
        const ny = Math.abs(hit.normal.y) > 0.9 ? Math.round(hit.normal.y) : hit.normal.y;
        const marked = this.blood.impact(hit.point.x, hit.point.y, nx, ny, height);
        this.burst(hit.point.x, hit.point.y, marked || Utils.clamp(height, 4, 62), 'spark');
        this.emit('impact', hit.point, { surface: this.surfaceAt(hit) });
        continue;
      }
      const hitZ = this.rand.float(14, 50) - (player.crouch ?? 0) * 12;
      this.blood.hit(hit.point.x, hit.point.y, hitZ, cos, sin, enemy.def.gore);
      this.emit('flesh', hit.point);
      if (maxDist < 110)
        this.blood.splat(1, 0.55 + 0.25 * Math.min(enemy.def.gore, 2));
      this.hitEnemyLimb(enemy, hit.point, hitZ, cos, sin, pelletDmg);
      this.damageEnemy(enemy, pelletDmg);
    }
    this.inShot = false;

    this.resolveGibs();
  }

  fireChaingun() {
    const player = this.player;
    const def = WEAPONS.chaingun;
    player.bullets = Math.max(0, player.bullets - def.ammoCost);
    this.emit('chaingun');
    player.cooldown = def.cooldown;
    player.dryFire = false;
    player.triggerHeld = true;
    player.spinDown = 0.42;
    player.shootFace = 0.42;
    player.flash = 0.06;
    player.recoil = 0.55;
    this.shake = Math.max(this.shake, 0.12);

    for (const enemy of this.enemies)
      enemy.volley = 0;

    const angle = player.angle + this.rand.float(-def.spread, def.spread);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const end = this.scratch.setScalar(player.pos.x + cos * 1600, player.pos.y + sin * 1600);
    const hit = this.scene.raycast(player.pos, end, { mask: CAT.WALL | CAT.ENEMY | CAT.BARREL });
    const maxDist = hit ? hit.point.getDistance(player.pos) : 1600;
    this.hitCorpseAlongRay(hit ? hit.point : end, cos, sin, 6);
    if (!hit)
      return;
    if (hit.body.ref?.kind === 'barrel') {
      this.burst(hit.point.x, hit.point.y, 14, 'spark');
      this.emit('clang', hit.point);
      this.hitBarrel(hit.body.ref, def.damage);
      return;
    }
    const enemy = hit.body.ref?.kind === 'enemy' ? hit.body.ref : null;
    if (!enemy) {
      const height = player.eye + this.rand.float(-0.02, 0.02) * maxDist;
      const nx = Math.abs(hit.normal.x) > 0.9 ? Math.round(hit.normal.x) : hit.normal.x;
      const ny = Math.abs(hit.normal.y) > 0.9 ? Math.round(hit.normal.y) : hit.normal.y;
      const marked = this.blood.impact(hit.point.x, hit.point.y, nx, ny, height);
      this.burst(hit.point.x, hit.point.y, marked || Utils.clamp(height, 4, 62), 'spark');
      this.emit('impact', hit.point, { surface: this.surfaceAt(hit) });
      return;
    }
    const hitZ = this.rand.float(14, 48) - (player.crouch ?? 0) * 12;
    this.blood.hit(hit.point.x, hit.point.y, hitZ, cos, sin, enemy.def.gore);
    this.emit('flesh', hit.point);
    if (maxDist < 110)
      this.blood.splat(1, 0.5 + 0.25 * Math.min(enemy.def.gore, 2));
    if (this.rand.float(0, 1) < 0.65)
      enemy.pain = Math.max(enemy.pain, 0.24);
    this.hitEnemyLimb(enemy, hit.point, hitZ, cos, sin, def.damage);
    this.damageEnemy(enemy, def.damage);
    this.resolveGibs();
  }

  fireRocket() {
    const player = this.player;
    const def = WEAPONS.rocket;
    player.rockets = Math.max(0, player.rockets - def.ammoCost);
    this.emit('rocketFire');
    player.cooldown = def.cooldown;
    player.dryFire = false;
    player.shootFace = 0.42;
    player.flash = 0.14;
    player.recoil = 1.15;
    this.shake = Math.max(this.shake, 0.35);

    const direction = new Vec2(1, 0).setRadian(player.angle);
    const start = player.pos.clone().addScaledVector(direction, PLAYER_RADIUS + 8);
    this.addRocket(start, direction);
  }

  /** What a pellet hit: 'door' or plain 'wall', judged by the tile behind the struck face. */
  surfaceAt(hit) {
    if (hit.body?.ref?.diag)
      return 'wall';
    const { level } = this;
    const tx = Math.floor((hit.point.x - Math.round(hit.normal.x) * 0.5) / TILE);
    const ty = Math.floor((hit.point.y - Math.round(hit.normal.y) * 0.5) / TILE);
    return level.inBounds(tx, ty) && level.kind[ty * level.width + tx] === DOOR ? 'door' : 'wall';
  }

  use() {
    const player = this.player;
    const facing = this.scratch.setScalar(1, 0).setRadian(player.angle);
    let best = null;
    let bestDistance = 96;
    for (const door of this.level.doors.values()) {
      const toDoor = this.toPlayer.subVectors(door.center, player.pos);
      const distance = toDoor.getMagnitude();
      if (distance > 0 && distance < bestDistance && toDoor.dotProduct(facing) / distance > 0.35) {
        best = door;
        bestDistance = distance;
      }
    }
    if (best) {
      if (best.lock && !player.keys?.[best.lock]) {
        const label = best.lock === 'red' ? 'Red' : best.lock === 'yellow' ? 'Yellow' : 'Blue';
        this.say(`You need a ${label} keycard to open this door.`);
        this.emit('locked', best.center);
        return;
      }
      best.target = best.target ? 0 : 1;
      if (best.secret)
        best.revealed = true;
    }
  }

  actorNear(point, distance, enemyDistance = distance) {
    if (this.scene.queryCircleFirst(point, Math.max(0, distance - PLAYER_RADIUS), { mask: CAT.PLAYER }))
      return true;
    for (const body of this.scene.queryCircle(point, enemyDistance, { mask: CAT.ENEMY }))
      if (body.ref?.state !== 'dead' && body.position.getDistance(point) < enemyDistance)
        return true;
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
        if (level.diag[idx] && level.hasCardinalFace(idx, d))
          continue;
        const nx = x + (d === 0 ? -1 : d === 1 ? 1 : 0);
        const ny = y + (d === 2 ? -1 : d === 3 ? 1 : 0);
        if (!level.isWalkable(nx, ny))
          continue;
        const nidx = ny * level.width + nx;
        if (level.diag[nidx] && level.hasCardinalFace(nidx, d ^ 1))
          continue;
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
    const idx = y * level.width + x;
    const here = flow[idx];
    if (here <= 0)
      return null;
    let best = here;
    let bx = -1;
    let by = -1;
    for (let d = 0; d < 4; d++) {
      if (level.diag[idx] && level.hasCardinalFace(idx, d))
        continue;
      const nx = x + (d === 0 ? -1 : d === 1 ? 1 : 0);
      const ny = y + (d === 2 ? -1 : d === 3 ? 1 : 0);
      if (!level.inBounds(nx, ny))
        continue;
      const nidx = ny * level.width + nx;
      if (level.diag[nidx] && level.hasCardinalFace(nidx, d ^ 1))
        continue;
      const value = flow[nidx];
      if (value >= 0 && value < best) {
        best = value;
        bx = nx;
        by = ny;
      }
    }
    if (bx < 0)
      return null;
    const df = level.diagInfo(by * level.width + bx);
    if (df)
      return out.setScalar(df.cx + df.nx * 18, df.cy + df.ny * 18);
    return out.setScalar((bx + 0.5) * TILE, (by + 0.5) * TILE);
  }

  updateEnemy(enemy, dt) {
    enemy.hurt = Math.max(0, enemy.hurt - dt);
    enemy.bleed -= dt;
    const gore = enemy.def.gore;
    if (enemy.state === 'dead') {
      enemy.pain = 0;
      enemy.deadTime += dt;
      enemy.inSlime = Boolean(this.level.slimeAt(enemy.pos.x, enemy.pos.y));
      if (enemy.type !== 'wraith' && enemy.deadTime <= 0.72) {
        enemy.deathFountain = (enemy.deathFountain ?? 0.08) - dt;
        if (enemy.deathFountain <= 0) {
          enemy.deathFountain += 0.06;
          const progress = enemy.deadTime / 0.72;
          const z = Math.max(6, (enemy.gibbed ? 14 : 26) * (1 - progress * 0.65));
          const scale = Math.sqrt(Math.max(0.18, gore));
          const count = Math.max(2, Math.round((1 - progress * 0.45) * 9 * gore));
          this.blood.spray(enemy.pos.x, enemy.pos.y, z, (enemy.deathDirX ?? 0) * 0.35, (enemy.deathDirY ?? 0) * 0.35, count, {
            speed: 95,
            spread: 195 * scale,
            up: 265,
            scale,
          });
          if (progress < 0.65)
            this.blood.spray(enemy.pos.x, enemy.pos.y, z + 4, 0, 0, Math.max(2, Math.round(5 * gore)), {
              speed: 55,
              spread: 115 * scale,
              up: 285,
              scale,
            });
        }
      }
      return;
    }
    // wounded enemies leave a trail proportional to their size
    if (enemy.hp < enemy.def.hp * 0.6 && enemy.bleed <= 0) {
      enemy.bleed = 0.14 / Math.sqrt(Math.max(0.35, gore));
      this.blood.drip(enemy.pos.x, enemy.pos.y, gore);
    }

    if (this.state === 'dead' || this.player.health <= 0) {
      enemy.windup = 0;
      enemy.leap = 0;
      enemy.roar = 0;
      enemy.pain = Math.max(0, enemy.pain - dt);
      enemy.body.setVelocity(this.zero);
      return;
    }

    const player = this.player;
    const toPlayer = this.toPlayer.subVectors(player.pos, enemy.pos);
    const distance = toPlayer.getMagnitude();

    enemy.losTimer -= dt;
    if (enemy.losTimer <= 0) {
      enemy.losTimer = 0.15;
      enemy.los = distance < enemy.def.sight && this.scene.hasLineOfSight(enemy.pos, player.pos, { mask: CAT.WALL });
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
      if (!enemy.hit && enemy.body.overlapsCircle(player.pos, PLAYER_RADIUS + 8)) {
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

    const crawlScale = enemy.crawling
      ? (!enemy.limbs?.leftLeg && !enemy.limbs?.rightLeg
        ? (!enemy.limbs?.leftArm && !enemy.limbs?.rightArm ? 0.18 : 0.34)
        : 0.48)
      : 1;
    const speed = enemy.def.speed * rage * crawlScale * (enemy.windup > 0 ? 0.15 : 1);
    this.velocity.scaleVector(move, speed);
    if (enemy.type === 'boss')
      this.keepInArena(enemy, this.velocity);
    enemy.body.setVelocity(this.velocity);
    enemy.walk += dt * (enemy.windup > 0 ? 0 : speed * enemy.def.gait);
  }

  driveImp(enemy, dt, move, toPlayer, distance) {
    if (enemy.windup > 0) {
      enemy.windup -= dt;
      if (enemy.windup <= 0 && enemy.los) {
        const direction = toPlayer.clone().normalize();
        const from = enemy.pos.clone().addScaledVector(direction, enemy.def.radius + 8);
        this.addShot(from, direction, 220, 10, enemy);
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
        move.perp().scale(enemy.strafe * 0.7);
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
      const step = this.scratch.setScalar(vx, vy);
      if (step.getMagnitude(true) > 0)
        step.normalize();
      return level.inArena(enemy.pos.x + step.x * reach, enemy.pos.y + step.y * reach);
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
        this.addShot(enemy.pos.clone().addScaledVector(direction, enemy.def.radius + 8), direction, 250, 8, enemy);
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
      move.perp().scale(enemy.strafe * 0.8);
    if (enemy.cooldown <= 0 && distance < 800)
      enemy.windup = 0.4;
  }

  /** A crawler zigzags in fast, crouches, and leaps (or drags itself in to bite when its legs are blown off). */
  driveCrawler(enemy, dt, move, toPlayer, distance) {
    if (enemy.crawling) {
      const reach = enemy.def.radius + PLAYER_RADIUS + 10;
      if (enemy.windup > 0) {
        enemy.windup -= dt;
        if (enemy.windup <= 0) {
          this.emit('bite', enemy.pos, { kind: 'crawler' });
          if (distance < reach + 8)
            this.hurtPlayer(8);
          enemy.cooldown = 0.75;
        }
        return;
      }
      if (distance < reach && enemy.cooldown <= 0)
        enemy.windup = 0.25;
      return;
    }
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
          const base = toPlayer.getAngle() || 0;
          const arms = rage > 1 ? 2 : 1;
          for (let k = -arms; k <= arms; k++) {
            const direction = new Vec2(1, 0).setRadian(base + k * 0.22);
            this.addShot(enemy.pos.clone().addScaledVector(direction, enemy.def.radius + 10), direction, 230, 10, enemy);
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
    if (player.cooldown <= 0)
      player.dryFire = false;
    player.spinDown = Math.max(0, (player.spinDown ?? 0) - dt);
    player.shootFace = Math.max(0, (player.shootFace ?? 0) - dt);
    player.switchTimer = Math.max(0, (player.switchTimer ?? 0) - dt);
    player.flash = Math.max(0, player.flash - dt);
    player.recoil = Math.max(0, player.recoil - dt * 3.5);
    player.hurt = Math.max(0, player.hurt - dt);
    player.hitMarker = Math.max(0, player.hitMarker - dt);

    player.crouch = Utils.clamp(player.crouch + (input.crouch ? dt * CROUCH_SPEED : -dt * CROUCH_SPEED), 0, 1);
    player.eye = Utils.lerp(EYE, CROUCH_EYE, player.crouch);

    const topSpeed = input.run ? PLAYER_RUN : PLAYER_WALK;
    const speed = Utils.lerp(topSpeed, PLAYER_CROUCH, player.crouch);
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
    const landed = (bob) => Math.floor((bob - FOOTFALL) / Trigo.pi);
    if (this.state === 'play' && landed(player.bob) > landed(before))
      this.emit('step', null, { wet: player.feet.blood > 0.08, who: 'player' });

    if (input.weapon)
      this.selectWeapon(input.weapon);
    if (input.use)
      this.use();
    player.triggerHeld = Boolean(input.fire);
    if (input.fire && player.cooldown <= 0) {
      const def = WEAPONS[player.weapon ?? 'shotgun'] ?? WEAPONS.shotgun;
      const pool = def.ammoType ? AMMO_TYPES[def.ammoType] : null;
      const current = pool ? player[pool.id] : Infinity;
      if (current >= def.ammoCost)
        this.fire();
      else {
        player.cooldown = 0.3;
        player.dryFire = true;
        player.triggerHeld = false;
        player.spinDown = 0;
        player.shootFace = 0;
        this.emit('dry');
        this.say(`Out of ${pool.label.toLowerCase()}`, 1);
      }
    }
  }

  /** The player leaves bloody footprints after walking through blood. Monsters only take steps, which are heard. */
  trackFootprints() {
    const { player } = this;
    if (this.state === 'play') {
      for (const enemy of this.enemies)
        if (enemy.state === 'dead' && enemy.body.overlapsCircle(player.pos, PLAYER_RADIUS))
          player.feet.blood = 1;
      this.blood.walk(player.feet, player.pos.x, player.pos.y, 1, PLAYER_STRIDE);
    }
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead')
        continue;
      if (enemy.def.flying)
        continue;
      const step = this.blood.walk(enemy.feet, enemy.pos.x, enemy.pos.y, 1, Trigo.pi / enemy.def.gait, false);
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

  updateHazards(dt) {
    const { player } = this;
    player.radFlash = Math.max(0, (player.radFlash ?? 0) - dt);
    player.soulFlash = Math.max(0, (player.soulFlash ?? 0) - dt);
    player.berserkTimer = Math.max(0, (player.berserkTimer ?? 0) - dt);
    player.radSuit = Math.max(0, (player.radSuit ?? 0) - dt);
    if (player.ammoFlash) {
      player.ammoFlash.shells = Math.max(0, (player.ammoFlash.shells ?? 0) - dt);
      player.ammoFlash.bullets = Math.max(0, (player.ammoFlash.bullets ?? 0) - dt);
      player.ammoFlash.rockets = Math.max(0, (player.ammoFlash.rockets ?? 0) - dt);
    }
    if (this.state === 'play' && this.level.slimeAt(player.pos.x, player.pos.y)) {
      if ((player.radSuit ?? 0) > 0)
        player.slimeTimer = 0;
      else {
        player.slimeTimer = (player.slimeTimer ?? 0) + dt;
        if (player.slimeTimer >= 0.85) {
          player.slimeTimer -= 0.85;
          this.hurtPlayer(5);
          player.radFlash = 0.45;
          this.emit('acid');
        }
      }
    } else
      player.slimeTimer = Math.max(0, (player.slimeTimer ?? 0) - dt * 2);

    for (const crusher of this.level.crushers) {
      crusher.phase += dt * 2.2;
      crusher.hurtCooldown = Math.max(0, (crusher.hurtCooldown ?? 0) - dt);
      const wave = Math.sin(crusher.phase);
      crusher.low = CEILING - Math.max(0, wave) * (CEILING - 8);
      if (crusher.low > 36)
        crusher.slamming = false;
      else if (!crusher.slamming && crusher.low < 12) {
        crusher.slamming = true;
        this.emit('crush', crusher.center);
        const dist = player.pos.getDistance(crusher.center);
        if (dist < 420)
          this.shake = Math.max(this.shake, 0.35 * (1 - dist / 420));
      }
      if (crusher.low < 24) {
        for (const body of this.scene.queryCircle(crusher.center, TILE * 0.45, { mask: CAT.ENEMY })) {
          const enemy = body.ref;
          if (!enemy || enemy.state === 'dead')
            continue;
          enemy.volley = 1e6;
          this.damageEnemy(enemy, 999);
        }
        if (crusher.low < 18)
          for (const enemy of this.enemies)
            if (enemy.state === 'dead' && !enemy.gibbed && enemy.body.overlapsCircle(crusher.center, TILE * 0.45))
              this.mutilateCorpse(enemy, 1, 0, true);
        this.resolveGibs();
      }
      if (this.state === 'play' && crusher.low < player.eye + 4 && crusher.hurtCooldown <= 0 && this.scene.queryCircleFirst(crusher.center, TILE * 0.42, { mask: CAT.PLAYER })) {
        crusher.hurtCooldown = 0.35;
        this.hurtPlayer(18, crusher.center);
        this.blood.spray(player.pos.x, player.pos.y, player.eye * 0.6, 0, 0, 14);
      }
    }
  }

  updateTeleporters(dt) {
    const { player, level } = this;
    player.teleFlash = Math.max(0, (player.teleFlash ?? 0) - dt);
    player.teleportCooldown = Math.max(0, (player.teleportCooldown ?? 0) - dt);

    const pad = level.teleporterAt(player.pos.x, player.pos.y);
    if (!pad || pad.idx !== player.teleportPad || player.pos.getDistance(pad.center) >= TILE * 0.48)
      player.teleportPad = -1;

    if (
      this.state === 'play' &&
      player.teleportCooldown <= 0 &&
      pad &&
      pad.idx !== player.teleportPad &&
      pad.targetIdx !== pad.idx &&
      player.pos.getDistance(pad.center) < TILE * 0.42
    ) {
      this.burst(pad.center.x, pad.center.y, EYE - 4, 'teleport');
      this.burst(pad.target.x, pad.target.y, EYE - 4, 'teleport');
      // Also spawn a TFOG plasma burst directly in front of the player's exit view so it is not clipped by the camera near plane
      const fx = pad.target.x + Math.cos(player.angle) * 28;
      const fy = pad.target.y + Math.sin(player.angle) * 28;
      this.burst(fx, fy, EYE - 4, 'teleport');
      this.emit('teleport', pad.target);
      player.body.setPosition(pad.target.clone());
      player.body.setVelocity(this.zero);
      player.teleportCooldown = 1.1;
      player.teleportPad = pad.targetIdx;
      player.teleFlash = 0.65;
      player.shootFace = Math.max(player.shootFace ?? 0, 0.42);
      this.shake = Math.max(this.shake, 0.45);

      let telefragged = false;
      for (const body of this.scene.queryCircle(pad.target, PLAYER_RADIUS + 10, { mask: CAT.ENEMY })) {
        const enemy = body.ref;
        if (!enemy || enemy.state === 'dead')
          continue;
        enemy.volley = 1e6;
        this.damageEnemy(enemy, 999);
        telefragged = true;
      }
      if (telefragged) {
        this.resolveGibs();
        this.say('Telefrag!', 2.2);
      }
    }

    for (const enemy of this.enemies) {
      enemy.teleportCooldown = Math.max(0, (enemy.teleportCooldown ?? 0) - dt);
      if (this.state !== 'play' || enemy.state !== 'chase' || enemy.type === 'boss' || enemy.teleportCooldown > 0)
        continue;
      const pad = level.teleporterAt(enemy.pos.x, enemy.pos.y);
      if (!pad || pad.targetIdx === pad.idx || enemy.pos.getDistance(pad.center) >= TILE * 0.36)
        continue;
      if (pad.target.getDistance(player.pos) + 12 >= pad.center.getDistance(player.pos))
        continue;
      if (this.scene.queryCircleFirst(pad.target, enemy.def.radius + 12, { mask: CAT.PLAYER }) ||
          this.scene.queryCircleFirst(pad.target, enemy.def.radius + 8, { mask: CAT.ENEMY, ignoreBody: enemy.body }))
        continue;
      this.burst(pad.center.x, pad.center.y, EYE - 4, 'teleport');
      this.burst(pad.target.x, pad.target.y, EYE - 4, 'teleport');
      this.emit('teleport', pad.target);
      enemy.body.setPosition(pad.target.clone());
      enemy.teleportCooldown = 1.4;
    }
  }

  update(dt, input) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 1.6);
    this.message.age += dt;
    this.blood.update(dt);
    for (const effect of this.effects)
      effect.age += dt;
    this.effects = this.effects.filter((effect) => effect.age < effect.life);

    if (this.state === 'cleared') {
      this.updateIntermission(dt);
      return;
    }
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
    this.updateHazards(dt);
    for (const enemy of this.enemies)
      this.updateEnemy(enemy, dt);
    for (const shot of this.shots) {
      shot.age += dt;
      if (shot.age > shot.life)
        shot.dead = true;
    }

    this.scene.step(dt);
    this.updateTeleporters(dt);
    this.cleanup();
    this.trackFootprints();
    if (this.state === 'play')
      this.fog.update(this.player.pos.x, this.player.pos.y, this.player.angle);

    if (this.state === 'play') {
      const secretIdx = this.level.secretAt(this.player.pos.x, this.player.pos.y);
      if (secretIdx >= 0 && !this.discoveredSecrets.has(secretIdx)) {
        this.discoveredSecrets.add(secretIdx);
        this.secretsFound++;
        this.say('Secret area found!', 2.5);
        this.emit('secret');
      }
      // a failing heart: faster the lower the health
      const { health } = this.player;
      if (health > 0 && health < 30) {
        this.heartbeat -= dt;
        if (this.heartbeat <= 0) {
          this.emit('heartbeat');
          this.heartbeat = 0.55 + health / 60;
        }
      }
      if (this.player.weapon === 'chainsaw' && this.player.cooldown <= 0 && (this.player.switchTimer ?? 0) <= 0) {
        this.player.chainsawIdle = (this.player.chainsawIdle ?? 0) - dt;
        if (this.player.chainsawIdle <= 0) {
          this.emit('chainsawIdle');
          this.player.chainsawIdle = 0.14;
        }
      } else
        this.player.chainsawIdle = Math.max(this.player.chainsawIdle ?? 0, 0.06);
      for (const exit of this.level.exits)
        if (this.player.body.overlapsCircle(exit, TILE * 0.5 + 10)) {
          this.startIntermission();
          break;
        }
    }
  }
}
