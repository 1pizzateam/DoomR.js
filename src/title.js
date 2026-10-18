import { Utils, Vec2 } from '@1pizzateam/spock';

/**
 * The title screen's film: a loop of slow camera shots through the real first level, with its monsters breathing
 * and a barrel that blows up beside two imps. It is headless: it only writes `game.cam` (where the camera is and
 * what it looks at) and `game.fade` (how dark the cut between shots is), and the world and HUD read those.
 *
 * Positions are in the game plane (x, y), heights are eye heights. `look` is the point the camera watches.
 */
export const SHOTS = [
  // two imps in the West Command Hall, then the barrel next to them goes up
  { duration: 10, from: [150, 544, 30], to: [410, 544, 26], look: [[576, 672, 30], [576, 672, 34]], zoom: [1, 0.9], roll: 0.02, boom: 5.2 },
  // the brute in the Central Courtyard, filmed from below so it towers
  { duration: 8, from: [1440, 1184, 15], to: [1620, 1184, 11], look: [[1504, 1376, 38], [1504, 1376, 44]], zoom: [1, 0.82], roll: -0.05 },
  // barrels and imps in the North Hub gallery
  { duration: 7, from: [1820, 416, 34], to: [1980, 416, 30], look: [[2144, 544, 18], [2144, 544, 22]], zoom: [1, 0.9], roll: 0.03 },
  // a skull floating in the South-West Ambush Hall
  { duration: 8, from: [480, 1568, 30], to: [640, 1568, 34], look: [[672, 1632, 44], [672, 1632, 40]], zoom: [0.95, 0.85], roll: -0.03 },
  // low to the floor, a crawler ahead in the South Pillar Gallery
  { duration: 8, from: [760, 1824, 13], to: [600, 1824, 11], look: [[160, 1696, 12], [160, 1696, 12]], zoom: [1, 0.85], roll: 0.06 },
];

const FADE = 0.7;
// where the extra barrel stands: a few steps from the imps
const BARREL_AT = [610, 640];
const mix = Utils.lerp;

export class TitleDirector {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.dirty = false;
    this.shot = 0;
    this.t = 0;
    this.lit = false;
    this.barrel = null;
  }

  /** Reloads the level and starts the film from the first shot. */
  begin() {
    const { game } = this;
    game.load(0);
    game.addBarrel(new Vec2(BARREL_AT[0], BARREL_AT[1]));
    this.barrel = game.barrels[game.barrels.length - 1];
    this.dirty = true;
    this.active = true;
    this.shot = 0;
    this.t = 0;
    this.lit = false;
  }

  /** Hands the level back untouched, ready to play. */
  end() {
    const { game } = this;
    this.active = false;
    game.cam = null;
    game.fade = 0;
    if (this.dirty) {
      game.load(game.levelIndex);
      this.dirty = false;
    }
  }

  update(dt) {
    const { game } = this;
    if (!this.active)
      this.begin();
    this.t += dt;
    while (this.t >= SHOTS[this.shot].duration) {
      this.t -= SHOTS[this.shot].duration;
      this.shot++;
      if (this.shot >= SHOTS.length) {
        // the loop's seam is a cut to black, so the level can be rebuilt unseen
        this.begin();
        this.t = 0;
      }
    }
    const shot = SHOTS[this.shot];

    if (shot.boom !== undefined && !this.lit && this.t >= shot.boom) {
      this.lit = true;
      game.hitBarrel(this.barrel, 99, 0);
    }
    // the rules are paused on the title screen, so the few things that must move are moved here
    game.updateBarrels(dt);
    for (const enemy of game.enemies) {
      if (enemy.state === 'dead')
        game.updateEnemy(enemy, dt);
    }

    const u = Utils.clamp(this.t / shot.duration, 0, 1);
    const e = u * 0.6 + u * u * (3 - 2 * u) * 0.4; // mostly steady, easing slightly at both ends
    const sway = Math.sin(game.time * 0.8 + this.shot) * 1.4;
    game.cam = {
      x: mix(shot.from[0], shot.to[0], e),
      y: mix(shot.from[1], shot.to[1], e),
      eye: mix(shot.from[2], shot.to[2], e) + sway,
      lookX: mix(shot.look[0][0], shot.look[1][0], e),
      lookY: mix(shot.look[0][1], shot.look[1][1], e),
      lookEye: mix(shot.look[0][2], shot.look[1][2], e),
      roll: shot.roll + Math.sin(game.time * 0.5) * 0.015,
      zoom: mix(shot.zoom[0], shot.zoom[1], e),
    };
    game.fade = 1 - Utils.clamp(Math.min(this.t, shot.duration - this.t) / FADE, 0, 1);
  }
}
