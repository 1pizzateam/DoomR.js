import { Grid, Trigo, Utils, Vec2 } from '@1pizzateam/spock';
import { DOOR, EYE, TILE } from './level.js';

export const FOG_NEAR = 260;
export const FOG_FAR = 1500;
export const MARS_INDOOR_FOG = new Vec2(170, 960);
export const MARS_OUTDOOR_FOG = new Vec2(32, 260);
export const MARS_NVG_FOG = new Vec2(420, 1850);

/**
 * Computes the active `[near, far]` fog bounds for a position on a level into `target`.
 * On Mars (E1M5), the enclosed starting airlock stays clear while the roofless outdoor surface is
 * engulfed in a dense, close-range Martian dust storm (`MARS_OUTDOOR_FOG`). When Night Vision
 * Goggles are active (`nightVision = true`), infrared image intensification cuts through the storm (`MARS_NVG_FOG`).
 *
 * @param {import('./level.js').Level} level
 * @param {Vec2} pos
 * @param {Vec2} [target=new Vec2()]
 * @param {boolean} [nightVision=false]
 * @returns {Vec2}
 */
export function marsFogNearFar(level, pos, target = new Vec2(), nightVision = false) {
  if (nightVision)
    return level?.planet === 'mars' ? target.copy(MARS_NVG_FOG) : target.setScalar(520, 2200);
  if (level?.planet !== 'mars')
    return target.setScalar(FOG_NEAR, FOG_FAR);
  if (level.isOutdoor(pos))
    return target.copy(MARS_OUTDOOR_FOG);
  let airlockOpen = 0;
  for (const door of level.doors.values())
    if (door.open > airlockOpen && level.doorTouchesIndoor(door.idx))
      airlockOpen = door.open;
  const mix = Utils.clamp(airlockOpen * 0.65, 0, 0.65);
  return target.setScalar(
    Utils.lerp(MARS_INDOOR_FOG.x, MARS_OUTDOOR_FOG.x, mix),
    Utils.lerp(MARS_INDOOR_FOG.y, MARS_OUTDOOR_FOG.y, mix)
  );
}

// What the minimap knows about: a cone matching the view plus a small ring around the player.
const CONE_HALF_ANGLE = 0.8;
const CONE_RAYS = 96;
export const CONE_RANGE = 20;
const RING_RAYS = 40;
const RING_RANGE = 2.5;
const STEP = 0.3;

/**
 * Fog of war for the minimap, in tiles.
 * `explored` remembers every tile that has ever been seen; `visible` is what is in view right now.
 * Sight follows what the 3D view shows: tall walls and closed doors block it,
 * but the player's eye is above the low pillars, so they do not.
 */
export class Fog {
  constructor(level) {
    this.level = level;
    this.grid = level.grid ?? new Grid(new Vec2(level.width * TILE, level.rowCount * TILE), TILE);
    this.explored = new Uint8Array(level.width * level.rowCount);
    this.visible = new Uint8Array(level.width * level.rowCount);
    this.exploredCount = 0;
    this.minExploredX = level.width;
    this.maxExploredX = -1;
    this.minExploredY = level.rowCount;
    this.maxExploredY = -1;
    this.pt = new Vec2();
    this.pos = new Vec2();
    this.step = new Vec2();
    this.minPt = new Vec2();
    this.maxPt = new Vec2();
    this.nearCells = [];
    this.lastPos = new Vec2(Number.NaN, Number.NaN);
    this.lastAngle = Number.NaN;
    this.lastRange = Number.NaN;
    this.lastDoorKey = -1;
  }

  /** Whether tile `idx` is an opaque full-tile sight blocker (tall cardinal wall or fully closed door). */
  blocksSightTile(idx) {
    const { level } = this;
    if (level.diag?.[idx] > 0)
      return false;
    if (level.kind?.[idx] === DOOR)
      return level.heights[idx] >= level.baseHeight[idx] * 0.98;
    return level.heights[idx] >= EYE;
  }

  /** Compact bit-hash of which doors are currently closed enough to block sight. */
  doorSightKey() {
    const { level } = this;
    if (!level.doors || !level.doors.size)
      return 0;
    let hash = 0;
    for (const idx of level.doors.keys()) {
      const closed = level.heights[idx] >= level.baseHeight[idx] * 0.98 ? 1 : 0;
      hash = ((hash * 31) ^ (idx * 3 + closed)) | 0;
    }
    return hash;
  }

  /** Walk a ray tile by tile, marking what it passes and stopping at the first thing that blocks sight. */
  cast(x, y, angle, range) {
    const { level, explored, visible, pos, step } = this;
    const { width, heights, baseHeight, kind, diag } = level;
    step.setScalar(STEP, 0).setRadian(angle);
    pos.setScalar(x / TILE, y / TILE);
    let prevIdx = -1;
    for (let travelled = 0; travelled <= range; travelled += STEP) {
      const tx = Math.floor(pos.x);
      const ty = Math.floor(pos.y);
      if (!level.inBounds(tx, ty))
        return;
      const idx = ty * width + tx;
      if (idx === prevIdx && !(diag?.[idx] > 0)) {
        pos.add(step);
        continue;
      }
      prevIdx = idx;
      visible[idx] = 1;
      if (!explored[idx]) {
        explored[idx] = 1;
        this.exploredCount++;
        if (tx < this.minExploredX)
          this.minExploredX = tx;
        if (tx > this.maxExploredX)
          this.maxExploredX = tx;
        if (ty < this.minExploredY)
          this.minExploredY = ty;
        if (ty > this.maxExploredY)
          this.maxExploredY = ty;
      }
      let h;
      if (kind?.[idx] === DOOR)
        h = heights[idx] >= baseHeight[idx] * 0.98 ? EYE : 0;
      else if (diag?.[idx] > 0 && level.heightAtPoint) {
        this.pt.scaleVector(pos, TILE);
        h = level.heightAtPoint(this.pt);
      } else
        h = heights[idx];
      if (h >= EYE)
        return;
      pos.add(step);
    }
  }

  update(x, y, angle, range = CONE_RANGE) {
    const doorKey = this.doorSightKey();
    const startIdx = this.tileIndex(x, y);
    if (
      startIdx >= 0 &&
      this.visible[startIdx] === 1 &&
      this.exploredCount > 0 &&
      Math.abs(x - this.lastPos.x) < 1.5 &&
      Math.abs(y - this.lastPos.y) < 1.5 &&
      Math.abs(Trigo.deltaRadian(angle, this.lastAngle)) < 0.008 &&
      range === this.lastRange &&
      doorKey === this.lastDoorKey
    )
      return;
    this.lastPos.setScalar(x, y);
    this.lastAngle = angle;
    this.lastRange = range;
    this.lastDoorKey = doorKey;
    this.visible.fill(0);
    for (let i = 0; i < CONE_RAYS; i++)
      this.cast(x, y, angle + (i / (CONE_RAYS - 1) - 0.5) * 2 * CONE_HALF_ANGLE, range);
    for (let i = 0; i < RING_RAYS; i++)
      this.cast(x, y, (i / RING_RAYS) * Trigo.twopi, Math.min(RING_RANGE, range));
  }

  tileIndex(x, y) {
    return this.grid.getCell(this.pt.setScalar(x, y));
  }

  isExplored(idx) {
    return this.explored[idx] === 1;
  }

  isVisible(idx) {
    return this.visible[idx] === 1;
  }

  /** True when a world position is inside a tile that is in view right now. */
  canSee(x, y) {
    const idx = this.tileIndex(x, y);
    return idx >= 0 && this.visible[idx] === 1;
  }

  /**
   * True when world position `pos` (`Vec2`) is inside a visible tile or within `radius` tiles
   * of an unblocked visible tile (used for 3D occlusion culling behind walls and closed doors).
   */
  canSeeNear(pos, radius = 1) {
    const { grid, visible } = this;
    const idx = grid.getCell(pos);
    if (idx >= 0 && visible[idx] === 1)
      return true;
    if (radius <= 0)
      return false;
    const cx = Math.floor(pos.x / TILE);
    const cy = Math.floor(pos.y / TILE);
    this.minPt.setScalar((cx - radius + 0.5) * TILE, (cy - radius + 0.5) * TILE);
    this.maxPt.setScalar((cx + radius + 0.5) * TILE, (cy + radius + 0.5) * TILE);
    grid.getCellsForBounds(this.minPt, this.maxPt, this.nearCells);
    for (let i = 0; i < this.nearCells.length; i++) {
      const cellIdx = this.nearCells[i];
      if (cellIdx >= 0 && visible[cellIdx] === 1 && !this.blocksSightTile(cellIdx))
        return true;
    }
    return false;
  }
}
