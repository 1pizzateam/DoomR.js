import { RollingAverage } from '@1pizzateam/spock';

/**
 * Adaptive resolution: renders the 3D view at a fraction of the screen when the GPU cannot keep up.
 * Dropping is quick, rising is slow, and a level that failed right after a rise is never tried again,
 * so the picture does not flap between two sizes.
 */
export const SCALES = [1, 0.85, 0.7, 0.55];

const WINDOW = 45; // frames averaged before a decision
const SLOW = 0.0225; // seconds: below ~45 fps
const FAST = 0.0175; // seconds: comfortably at 60 fps
const RISE_AFTER = 8; // seconds of fast frames before trying a sharper picture
const FAILED_WITHIN = 10; // seconds: a drop this soon after a rise bans that level
const IGNORE_ABOVE = 0.09; // seconds: stalls (tab switch, shader compile) say nothing about the GPU

export class Quality {
  constructor(scales = SCALES) {
    this.scales = scales;
    this.level = 0;
    this.ceiling = 0; // sharpest level still allowed
    this.window = new RollingAverage(WINDOW);
    this.fastTime = 0;
    this.clock = 0;
    this.lastRise = -Infinity;
  }

  get scale() {
    return this.scales[this.level];
  }

  /** Feed one frame time. Returns the new scale when it changed, otherwise null. */
  update(dt) {
    if (dt <= 0 || dt > IGNORE_ABOVE)
      return null;
    this.clock += dt;
    this.window.push(dt);
    if (this.window.count < WINDOW)
      return null;

    const average = this.window.average;
    this.window.reset();

    if (average > SLOW && this.level < this.scales.length - 1) {
      if (this.clock - this.lastRise < FAILED_WITHIN)
        this.ceiling = Math.max(this.ceiling, this.level + 1);
      this.level++;
      this.fastTime = 0;
      return this.scale;
    }

    this.fastTime = average < FAST ? this.fastTime + average * WINDOW : 0;
    if (this.fastTime >= RISE_AFTER && this.level > this.ceiling) {
      this.level--;
      this.fastTime = 0;
      this.lastRise = this.clock;
      return this.scale;
    }
    return null;
  }
}
