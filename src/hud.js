import { Utils } from '@1pizzateam/spock';
import { DOOR, EXIT, TILE } from './level.js';
import { LEVELS } from './levels.js';
import { screenSplatQuads } from './bloodsprites.js';
import { FIRE_COOLDOWN } from './game.js';
import { weaponCellUv, weaponFrame, weaponPlacement } from './weapon.js';

const COLORS = ['#5b8cff', '#38c793', '#ff9f43', '#e8102c'];
const BLUE = 0;
const GREEN = 1;
const ORANGE = 2;
const RED = 3;
const BACKGROUND = '#07090f';
const RGB = COLORS.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255));
const BACKGROUND_RGB = [7 / 255, 9 / 255, 15 / 255];
const dimmed = (color, amount) => color.map((v, i) => BACKGROUND_RGB[i] + (v - BACKGROUND_RGB[i]) * amount);
const FLOOR_SEEN = dimmed(RGB[BLUE], 0.25);
const FLOOR_VISIBLE = dimmed(RGB[BLUE], 0.6);
const FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/**
 * Everything that is drawn flat on top of the 3D world: weapon, HUD, minimap and menus.
 * The line art is handed to RoostR through the overlay; this canvas only draws text and the dimming screens.
 */
export class Hud {
  constructor(canvas, overlay) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.ratio = 1;
    this.showMap = true;
    this.diagnostics = '';
  }

  resize(cssWidth, cssHeight, ratio) {
    this.ratio = ratio;
    this.width = cssWidth;
    this.height = cssHeight;
    this.canvas.width = Math.round(cssWidth * ratio);
    this.canvas.height = Math.round(cssHeight * ratio);
  }

  render(game) {
    const { ctx, width, height } = this;
    // reapplied every frame: the browser can reset canvas state behind our back
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    this.overlay.clear();
    this.drawWeapon(game);
    this.drawBlood(game);
    this.drawHud(game);
    if (this.showMap)
      this.drawMap(game);
    this.drawOverlay(game);
    if (this.diagnostics)
      this.text(this.diagnostics, 28, 26, GREEN, { size: 11, alpha: 0.8, glow: 0 });
  }

  /** A polyline in the glowing layer: it goes through the same neon pass as the 3D world. */
  line(points, color, alpha = 1) {
    this.overlay.glow.line(points, RGB[color], alpha);
  }

  /** A polyline on the canvas, for the few frames that must sit above the dimming screens. */
  canvasLine(points, color, alpha = 1, width = 1.5, glow = 8) {
    const { ctx } = this;
    ctx.beginPath();
    for (let i = 0; i < points.length; i += 2) {
      if (i === 0)
        ctx.moveTo(points[i], points[i + 1]);
      else
        ctx.lineTo(points[i], points[i + 1]);
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = COLORS[color];
    ctx.lineWidth = width;
    ctx.shadowColor = COLORS[color];
    ctx.shadowBlur = glow;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  text(text, x, y, color, { size = 14, align = 'left', alpha = 1, weight = 600, glow = 6 } = {}) {
    const { ctx } = this;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS[color];
    ctx.shadowColor = COLORS[color];
    ctx.shadowBlur = glow;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  /** The shotgun: a pixel-art sprite on the finished picture, swaying as you walk, kicking when it fires and being pumped. */
  drawWeapon(game) {
    const player = game.player;
    if (game.state === 'dead' || game.state === 'title')
      return;
    const { x0, y0, x1, y1 } = weaponPlacement({ width: this.width, height: this.height, bob: player.bob, moving: player.moving, recoil: player.recoil });
    // a gun that is cooling down after a shot is animated by how long ago the shot was
    const elapsed = player.cooldown > 0 ? FIRE_COOLDOWN - player.cooldown : -1;
    this.overlay.crisp.weapon.quad(x0, y0, x1, y1, weaponCellUv(weaponFrame(elapsed, player.ammo > 0)), 1);
  }

  /** Blood on the player's view: the sprites of the blood in the world, a starburst that grows and a drip that slides down. */
  drawBlood(game) {
    const { width, height } = this;
    const { sprites } = this.overlay.crisp;
    for (const splat of game.blood.splats) {
      const fade = Utils.clamp((splat.life - splat.age) / (splat.life * 0.4), 0, 1);
      for (const q of screenSplatQuads(splat, width, height, fade))
        sprites.quad(q.x0, q.y0, q.x1, q.y1, q.uv, q.fade);
    }
  }

  drawBar(x, y, w, ticks, value, color, lowColor) {
    const gap = w / ticks;
    const lit = Math.ceil(value * ticks);
    for (let i = 0; i < ticks; i++) {
      const on = i < lit;
      this.line([x + i * gap, y, x + i * gap, y - 16], on ? (value < 0.3 ? lowColor : color) : BLUE, on ? 1 : 0.22);
    }
  }

  drawHud(game) {
    const { width, height } = this;
    const player = game.player;
    if (game.state === 'title')
      return;

    // crosshair and hit marker
    const cx = width / 2;
    const cy = height / 2;
    this.line([cx - 10, cy, cx - 4, cy], GREEN, 0.9);
    this.line([cx + 4, cy, cx + 10, cy], GREEN, 0.9);
    this.line([cx, cy - 10, cx, cy - 4], GREEN, 0.9);
    this.line([cx, cy + 4, cx, cy + 10], GREEN, 0.9);
    if (player.hitMarker > 0) {
      const m = 8 + (0.15 - player.hitMarker) * 40;
      this.line([cx - m, cy - m, cx - m / 2, cy - m / 2], ORANGE);
      this.line([cx + m, cy - m, cx + m / 2, cy - m / 2], ORANGE);
      this.line([cx - m, cy + m, cx - m / 2, cy + m / 2], ORANGE);
      this.line([cx + m, cy + m, cx + m / 2, cy + m / 2], ORANGE);
    }

    const base = height - 28;
    this.text('HEALTH', 28, base - 24, BLUE, { size: 11, alpha: 0.8 });
    this.drawBar(28, base, 200, 25, player.health / 100, GREEN, ORANGE);
    this.text(String(Math.ceil(player.health)), 240, base, player.health < 30 ? ORANGE : GREEN, { size: 20, weight: 700 });
    this.text('SHELLS', width - 28, base - 24, BLUE, { size: 11, alpha: 0.8, align: 'right' });
    this.text(String(player.ammo), width - 28, base, player.ammo < 5 ? ORANGE : GREEN, { size: 20, weight: 700, align: 'right' });

    this.text(`${game.kills}/${game.totalEnemies} kills`, width / 2, 26, BLUE, { size: 12, align: 'center', alpha: 0.8 });

    if (game.message.age < game.message.life) {
      const fade = Utils.clamp((game.message.life - game.message.age) * 2, 0, 1);
      this.text(game.message.text, width / 2, 56, GREEN, { size: 16, align: 'center', alpha: fade });
    }

    if (player.hurt > 0) {
      const a = Math.min(1, player.hurt / 0.3);
      for (let i = 0; i < 3; i++) {
        const inset = 4 + i * 7;
        this.line([inset, inset, width - inset, inset, width - inset, height - inset, inset, height - inset, inset, inset], ORANGE, a * (0.8 - i * 0.25));
      }
    }
  }

  drawMap(game) {
    const { width } = this;
    if (game.state === 'title')
      return;
    const layer = this.overlay.crisp;
    const level = game.level;
    const s = Math.max(4, Math.min(7, Math.floor(width / 220)));
    const mw = level.width * s;
    const mh = level.rowCount * s;
    const ox = width - mw - 20;
    const oy = 44;

    layer.fillRect(ox - 6, oy - 6, mw + 12, mh + 12, BACKGROUND_RGB);
    layer.rectLine(ox - 6.5, oy - 6.5, mw + 13, mh + 13, RGB[BLUE], 0.25);

    // fog of war: only tiles that have been seen are drawn, and the ones in view right now are brighter
    const fog = game.fog;
    for (let y = 0; y < level.rowCount; y++) {
      for (let x = 0; x < level.width; x++) {
        const idx = y * level.width + x;
        if (!fog.isExplored(idx))
          continue;
        const visible = fog.isVisible(idx);
        if (!level.kind[idx] || level.heights[idx] <= 0) {
          layer.fillRect(ox + x * s + s / 2 - 0.5, oy + y * s + s / 2 - 0.5, 1, 1, visible ? FLOOR_VISIBLE : FLOOR_SEEN);
          continue;
        }
        const door = level.kind[idx] === DOOR || level.kind[idx] === EXIT;
        layer.rectLine(ox + x * s + 0.5, oy + y * s + 0.5, s - 1, s - 1, door ? RGB[GREEN] : RGB[BLUE], door ? (visible ? 1 : 0.5) : (visible ? 0.9 : 0.35));
      }
    }

    // enemies only show while they are in view: the map is not a radar
    for (const enemy of game.enemies) {
      if (enemy.state === 'dead' || !fog.canSee(enemy.pos.x, enemy.pos.y))
        continue;
      layer.fillRect(ox + (enemy.pos.x / TILE) * s - 1.5, oy + (enemy.pos.y / TILE) * s - 1.5, 3, 3, RGB[ORANGE]);
    }
    const player = game.player;
    const x = ox + (player.pos.x / TILE) * s;
    const y = oy + (player.pos.y / TILE) * s;
    layer.line([x, y, x + Math.cos(player.angle) * 9, y + Math.sin(player.angle) * 9], RGB[GREEN]);
    layer.circleLine(x, y, 2.5, RGB[GREEN]);
  }

  drawOverlay(game) {
    const { ctx, width, height } = this;
    const state = game.state;
    const cx = width / 2;
    const cy = height / 2;
    const dim = (alpha) => {
      ctx.fillStyle = BACKGROUND;
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    };
    const frame = (w, h, color, alpha = 0.7) => {
      const x = cx - w / 2;
      const y = cy - h / 2;
      this.canvasLine([x, y, x + w, y, x + w, y + h, x, y + h, x, y], color, alpha);
    };

    if (state === 'title') {
      dim(Math.max(0.55, game.fade));
      this.text('DOOMR', cx, cy - 60, BLUE, { size: Math.min(110, width / 7), align: 'center', weight: 800, glow: 22 });
      this.text('three colours and blood. no polygons. just lines.', cx, cy - 20, GREEN, { size: 15, align: 'center', alpha: 0.9 });
      const blink = 0.5 + 0.5 * Math.sin(game.time * 2.2);
      this.text('click or press ENTER to start', cx, cy + 56, ORANGE, { size: 16, align: 'center', alpha: 0.5 + blink * 0.5 });
      const keys = ['W A S D  move', 'mouse / ← →  turn', 'click / SPACE  fire', 'E  open doors', 'SHIFT  run', 'M  map     N  sound     ESC  pause'];
      keys.forEach((k, i) => this.text(k, cx, cy + 100 + i * 20, BLUE, { size: 12, align: 'center', alpha: 0.75, glow: 3 }));
    } else if (state === 'paused') {
      dim(0.6);
      this.text('PAUSED', cx, cy, BLUE, { size: 40, align: 'center', weight: 800, glow: 14 });
      this.text('click or press ENTER to resume', cx, cy + 36, GREEN, { size: 14, align: 'center' });
    } else if (state === 'dead') {
      const fade = Utils.clamp(game.player.deadTime / 1.2, 0, 1);
      dim(0.5 * fade);
      this.text('YOU DIED', cx, cy, ORANGE, { size: 64, align: 'center', weight: 800, alpha: fade, glow: 20 });
      if (game.player.deadTime > 1)
        this.text('click or press ENTER to try again', cx, cy + 40, GREEN, { size: 14, align: 'center' });
    } else if (state === 'cleared') {
      dim(0.6);
      frame(420, 190, GREEN);
      const last = game.levelIndex + 1 >= LEVELS.length;
      this.text(last ? 'DEMO COMPLETE' : 'LEVEL CLEARED', cx, cy - 40, GREEN, { size: 34, align: 'center', weight: 800, glow: 14 });
      const time = game.stats.time;
      this.text(`kills ${game.kills}/${game.totalEnemies}    time ${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`, cx, cy + 4, BLUE, { size: 16, align: 'center' });
      this.text(last ? 'click or ENTER to return to the title' : 'click or ENTER for the next level', cx, cy + 50, ORANGE, { size: 13, align: 'center' });
    }
  }
}
