import { Trigo, Vec2 } from '@1pizzateam/spock';
import { EYE, TILE } from './level.js';

// What the minimap knows about: a cone matching the view plus a small ring around the player.
const CONE_HALF_ANGLE = 0.8;
const CONE_RAYS = 64;
const CONE_RANGE = 20;
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
    this.explored = new Uint8Array(level.width * level.rowCount);
    this.visible = new Uint8Array(level.width * level.rowCount);
    this.exploredCount = 0;
    this.pt = new Vec2();
    this.pos = new Vec2();
    this.step = new Vec2();
  }

  /** Walk a ray tile by tile, marking what it passes and stopping at the first thing that blocks sight. */
  cast(x, y, angle, range) {
    const { level, explored, visible, pos, step } = this;
    step.setScalar(STEP, 0).setRadian(angle);
    pos.setScalar(x / TILE, y / TILE);
    for (let travelled = 0; travelled <= range; travelled += STEP) {
      const tx = Math.floor(pos.x);
      const ty = Math.floor(pos.y);
      if (!level.inBounds(tx, ty))
        return;
      const idx = ty * level.width + tx;
      visible[idx] = 1;
      if (!explored[idx]) {
        explored[idx] = 1;
        this.exploredCount++;
      }
      this.pt.scaleVector(pos, TILE);
      const h = level.heightAtPoint ? level.heightAtPoint(this.pt) : level.heights[idx];
      if (h >= EYE)
        return;
      pos.add(step);
    }
  }

  update(x, y, angle) {
    this.visible.fill(0);
    for (let i = 0; i < CONE_RAYS; i++)
      this.cast(x, y, angle + (i / (CONE_RAYS - 1) - 0.5) * 2 * CONE_HALF_ANGLE, CONE_RANGE);
    for (let i = 0; i < RING_RAYS; i++)
      this.cast(x, y, (i / RING_RAYS) * Trigo.twopi, RING_RANGE);
  }

  tileIndex(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    return this.level.inBounds(tx, ty) ? ty * this.level.width + tx : -1;
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
}
