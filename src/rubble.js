import { Rand, Utils } from '@1pizzateam/spock';

/** Blast damage left on walls, floor and ceiling by explosions. Purely visual: nothing here touches gameplay. */
export const RUBBLE = { wall: 96, floor: 48, ceiling: 48, tiers: 3 };

export const SURFACE = Object.freeze({ WALL: 0, FLOOR: 1, CEILING: 2 });

const CAPS = [RUBBLE.wall, RUBBLE.floor, RUBBLE.ceiling];
// below this a blast is too weak to leave a mark
const MIN_SEVERITY = 0.02;
const TIER_MARGIN = 1e-6;
const TIER_1 = 0.34;
const TIER_2 = 0.67;
const BASE_SEED = 5171;
const FLAT_TURNS = 4;
const WALL_SIZE = [26, 48];
const FLAT_SIZE = [22, 48];

/** How hard a blast of `power` hits a surface `distance` from its centre; 0 when it is too weak to mark. */
export function severityOf(distance, radius, power) {
  const severity = Utils.clamp(power * (1 - distance / radius), 0, 1);
  return severity < MIN_SEVERITY ? 0 : severity;
}

/** The look of a mark of this severity: 0 scuffed and cracked, 1 chipped and exposed, 2 blown out. */
export function tierOf(severity) {
  if (severity < TIER_1 - TIER_MARGIN)
    return 0;
  return severity < TIER_2 - TIER_MARGIN ? 1 : 2;
}

function makeSlot(kind) {
  return { kind, x: 0, y: 0, z: 0, nx: 0, ny: 0, size: 0, severity: 0, tier: 0, seed: 0, variant: 0, lo: 0, hi: 0, top: 0, slope: 0, door: null, gen: 0 };
}

/**
 * Three capped ring buffers of blast marks (walls, floors, ceilings). Slots are allocated once and rewritten in place,
 * the oldest first, so `gen` tells a cache that a slot now holds another mark. `version` changes whenever a mark is added.
 */
export class Rubble {
  constructor() {
    this.slots = [[], [], []];
    for (let kind = 0; kind < 3; kind++)
      for (let i = 0; i < CAPS[kind]; i++)
        this.slots[kind].push(makeSlot(kind));
    this.lengths = [0, 0, 0];
    this.cursors = [0, 0, 0];
    this.version = 0;
    this.rand = Rand.create(BASE_SEED);
  }

  /** Forgets every mark. The seed comes from the level alone, so no random number is taken from the game's. */
  reset(level = null) {
    this.lengths[0] = this.lengths[1] = this.lengths[2] = 0;
    this.cursors[0] = this.cursors[1] = this.cursors[2] = 0;
    this.rand = Rand.create(BASE_SEED + (level ? level.width * 31 + level.rowCount : 0));
    this.version++;
  }

  length(kind) {
    return this.lengths[kind];
  }

  /** Index of the oldest live slot of a ring: 0 until it wraps, then the cursor; the j-th oldest is (oldest + j) % length. */
  oldest(kind) {
    return this.lengths[kind] < CAPS[kind] ? 0 : this.cursors[kind];
  }

  next(kind, severity) {
    const slot = this.slots[kind][this.cursors[kind]];
    this.cursors[kind] = (this.cursors[kind] + 1) % CAPS[kind];
    if (this.lengths[kind] < CAPS[kind])
      this.lengths[kind]++;
    slot.gen++;
    slot.severity = severity;
    slot.tier = tierOf(severity);
    slot.seed = this.rand.integer(1, 2147483647);
    slot.variant = slot.seed % FLAT_TURNS;
    slot.door = null;
    this.version++;
    return slot;
  }

  /** A mark on a wall face at `pos` (z the height), facing `normal`. `span` is the face's { lo, hi, top, slope, door }. */
  addWall(pos, normal, severity, span) {
    if (severity < MIN_SEVERITY)
      return null;
    const slot = this.next(SURFACE.WALL, severity);
    slot.x = pos.x;
    slot.y = pos.y;
    slot.z = pos.z;
    slot.nx = normal.x;
    slot.ny = normal.y;
    slot.size = Utils.lerp(WALL_SIZE[0], WALL_SIZE[1], severity);
    slot.lo = span.lo;
    slot.hi = span.hi;
    slot.top = span.top;
    slot.slope = span.slope;
    slot.door = span.door;
    return slot;
  }

  addFloor(pos, severity) {
    return this.addFlat(SURFACE.FLOOR, pos, severity);
  }

  addCeiling(pos, severity) {
    return this.addFlat(SURFACE.CEILING, pos, severity);
  }

  addFlat(kind, pos, severity) {
    if (severity < MIN_SEVERITY)
      return null;
    const slot = this.next(kind, severity);
    slot.x = pos.x;
    slot.y = pos.y;
    slot.size = Utils.lerp(FLAT_SIZE[0], FLAT_SIZE[1], severity);
    return slot;
  }
}
