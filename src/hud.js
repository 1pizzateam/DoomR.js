import { Utils } from '@1pizzateam/spock';
import { CEILING, DOOR, EXIT, PILLAR, TILE } from './level.js';
import { LEVELS } from './levels.js';
import { screenSplatQuads } from './bloodsprites.js';
import { faceCellUv, faceFrame, facePlacement } from './face.js';
import { AMMO_FLASH_DURATION, DIFFICULTIES, DIFFICULTY_ORDER, FIRE_COOLDOWN } from './game.js';
import { AMMO_TYPES } from './ammo.js';
import { WEAPON_SLOTS, WEAPONS, weaponCellUv, weaponFrame, weaponPlacement } from './weapon.js';

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
const SLIME_SEEN = dimmed(RGB[GREEN], 0.38);
const SLIME_VISIBLE = dimmed(RGB[GREEN], 0.82);
const FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export const SCREEN_BLOOD_ALPHA = 0.72;

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
    this.automap = false;
    this.automapZoom = 1;
    this.automapFollow = true;
    this.automapGrid = true;
    this.diagnostics = '';
  }

  toggleAutomap(game) {
    this.automap = !this.automap;
    if (typeof game?.emit === 'function')
      game.emit('automap');
    return this.automap;
  }

  zoomAutomap(delta) {
    this.automapZoom = Utils.clamp(this.automapZoom + delta, 0.6, 3.0);
    return this.automapZoom;
  }

  toggleAutomapGrid() {
    this.automapGrid = !this.automapGrid;
    return this.automapGrid;
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
    const showAutomap = this.automap && game.state !== 'title' && game.state !== 'cleared';
    game.automap = showAutomap;
    if (!showAutomap)
      this.drawWeapon(game);
    this.drawBlood(game);
    this.drawHud(game);
    if (showAutomap)
      this.drawAutomap(game);
    else if (this.showMap)
      this.drawMap(game);
    this.drawOverlay(game);
    if (this.diagnostics)
      this.text(this.diagnostics, 28, 26, GREEN, { size: 11, alpha: 0.8, glow: 0 });
  }

  /** A polyline in the glowing layer: it goes through the same neon pass as the 3D world. */
  line(points, color, alpha = 1) {
    this.overlay?.glow?.line(points, RGB[color], alpha);
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

  /** First-person weapon sprite: sways as you walk, kicks when firing, and dips during weapon switches. */
  drawWeapon(game) {
    const player = game.player;
    if (game.state === 'dead' || game.state === 'title' || game.state === 'cleared')
      return;
    const weapon = player.weapon ?? 'shotgun';
    if (weapon === 'knife' || weapon === 'chainsaw' || weapon === 'chaingun' || weapon === 'shotgun' || weapon === 'rocket')
      return;
    const def = WEAPONS[weapon] ?? WEAPONS.shotgun;
    const switchOffset = Math.min(1, (player.switchTimer ?? 0) / 0.22);
    const { x0, y0, x1, y1 } = weaponPlacement({
      width: this.width,
      height: this.height,
      bob: player.bob,
      moving: player.moving,
      recoil: player.recoil,
      switchOffset,
    });
    const isFiring = !player.dryFire && (player.switchTimer ?? 0) <= 0;
    const spinDown = player.spinDown ?? player.shootFace ?? 0;
    let elapsed =
      isFiring && player.cooldown > 0
        ? def.cooldown - player.cooldown
        : isFiring && weapon === 'chaingun' && spinDown > 0
          ? 0.42 - spinDown
          : -1;
    // As soon as the player stops holding fire, stop chaingun bullet extraction/muzzle flash immediately
    // while keeping the barrel rolling smoothly through pumpA/pumpB.
    if (weapon === 'chaingun' && elapsed >= 0 && elapsed < 0.065 && player.triggerHeld === false)
      elapsed += 0.065;
    const currentAmmo = def.ammoType ? (player[def.ammoType] ?? player.ammo ?? 0) : Infinity;
    const frame = weaponFrame(elapsed, currentAmmo >= def.ammoCost, weapon, game.time);
    this.overlay.crisp.weapon.quad(x0, y0, x1, y1, weaponCellUv(frame, weapon), 1);
  }

  /** Blood on the player's view: always translucent on the visor so the 3D world remains visible behind it. */
  drawBlood(game) {
    const { width, height } = this;
    const { sprites } = this.overlay.crisp;
    for (const splat of game.blood.splats) {
      const fade = Utils.clamp((splat.life - splat.age) / (splat.life * 0.6), 0, 1) * SCREEN_BLOOD_ALPHA;
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
    if (game.state === 'title' || game.state === 'cleared')
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

    const faceRect = facePlacement({ width, height, hurt: player.hurt });
    const weaponDef = WEAPONS[player.weapon ?? 'shotgun'] ?? WEAPONS.shotgun;
    const shotElapsed =
      (player.soulFlash ?? 0) > 0 || (player.berserkTimer ?? 0) > 18.5
        ? 0.1
        : (player.shootFace ?? 0) > 0
          ? 0.42 - player.shootFace
          : !player.dryFire && player.cooldown > 0 && (player.switchTimer ?? 0) <= 0
            ? Math.max(0, weaponDef.cooldown - player.cooldown)
            : -1;
    const frameIdx = faceFrame({ health: player.health, hurt: player.hurt, shotElapsed, time: game.time });
    const crisp = this.overlay.crisp;
    const borderCol =
      (player.teleFlash ?? 0) > 0
        ? RGB[GREEN]
        : (player.soulFlash ?? 0) > 0
          ? RGB[BLUE]
          : (player.berserkTimer ?? 0) > 0
            ? RGB[RED]
            : player.hurt > 0 || player.health < 30
              ? RGB[ORANGE]
              : RGB[BLUE];
    crisp.fillRect(faceRect.x0 - 4, faceRect.y0 - 4, faceRect.x1 - faceRect.x0 + 8, faceRect.y1 - faceRect.y0 + 8, BACKGROUND_RGB);
    crisp.rectLine(faceRect.x0 - 4.5, faceRect.y0 - 4.5, faceRect.x1 - faceRect.x0 + 9, faceRect.y1 - faceRect.y0 + 9, borderCol, player.hurt > 0 || (player.berserkTimer ?? 0) > 0 || (player.soulFlash ?? 0) > 0 || (player.teleFlash ?? 0) > 0 ? 0.85 : 0.45);
    crisp.face?.quad(faceRect.x0, faceRect.y0, faceRect.x1, faceRect.y1, faceCellUv(frameIdx), 1);

    const base = height - 28;
    const hx = faceRect.x1 + 18;
    const overcharged = player.health > 100;
    const healthCol = overcharged ? BLUE : player.health < 30 ? ORANGE : GREEN;
    this.text(overcharged ? 'SOUL' : 'HEALTH', hx, base - 24, BLUE, { size: 11, alpha: 0.8 });
    this.drawBar(hx, base, 160, 20, Utils.clamp(player.health / 100, 0, 1), GREEN, ORANGE);
    if (overcharged)
      this.drawBar(hx, base - 3, 160, 20, Utils.clamp((player.health - 100) / 100, 0, 1), BLUE, BLUE);
    this.text(String(Math.ceil(player.health)), hx + 170, base, healthCol, { size: 20, weight: 700 });
    this.drawArmor(hx + 226, base, player);
    this.drawPowerups(hx + 394, base, player);
    this.drawArms(width - 360, base, player);
    this.drawKeys(width - 252, base, player.keys);
    this.drawAmmo(width - 28, base, player, weaponDef);

    this.text(`${game.kills}/${game.totalEnemies} kills`, width / 2, 26, BLUE, { size: 12, align: 'center', alpha: 0.8 });

    if (game.message.age < game.message.life) {
      const fade = Utils.clamp((game.message.life - game.message.age) * 2, 0, 1);
      this.text(game.message.text, width / 2, 56, GREEN, { size: 16, align: 'center', alpha: fade });
    }

    if ((player.radSuit ?? 0) > 0) {
      const blink = player.radSuit > 5 || Math.floor(player.radSuit * 4) % 2 === 0;
      if (blink) {
        const a = Math.min(0.65, 0.25 + (player.radSuit / 45) * 0.35);
        this.line([8, 8, width - 8, 8, width - 8, height - 8, 8, height - 8, 8, 8], GREEN, a);
      }
    }

    if ((player.soulFlash ?? 0) > 0) {
      const a = Math.min(1, player.soulFlash / 0.5);
      for (let i = 0; i < 3; i++) {
        const inset = 5 + i * 7;
        this.line([inset, inset, width - inset, inset, width - inset, height - inset, inset, height - inset, inset, inset], BLUE, a * (0.85 - i * 0.25));
      }
    }

    if ((player.berserkTimer ?? 0) > 0) {
      const pulse = 0.55 + 0.45 * Math.sin(game.time * 7);
      const fade = Math.min(1, player.berserkTimer / 3);
      const a = fade * (0.28 + 0.32 * pulse);
      for (let i = 0; i < 2; i++) {
        const inset = 5 + i * 6;
        this.line([inset, inset, width - inset, inset, width - inset, height - inset, inset, height - inset, inset, inset], RED, a * (1 - i * 0.35));
      }
    }

    if (player.radFlash > 0) {
      const a = Math.min(1, player.radFlash / 0.35);
      for (let i = 0; i < 3; i++) {
        const inset = 6 + i * 7;
        this.line([inset, inset, width - inset, inset, width - inset, height - inset, inset, height - inset, inset, inset], GREEN, a * (0.75 - i * 0.22));
      }
    }

    if (player.hurt > 0) {
      const a = Math.min(1, player.hurt / 0.3);
      for (let i = 0; i < 3; i++) {
        const inset = 4 + i * 7;
        this.line([inset, inset, width - inset, inset, width - inset, height - inset, inset, height - inset, inset, inset], ORANGE, a * (0.8 - i * 0.25));
      }
    }
  }

  /** Active supercharge powerup badges (BERSERK 4x melee & RAD SUIT countdown). */
  drawPowerups(x, base, player) {
    let offset = 0;
    if (player.berserk) {
      this.text('BERSERK', x, base - 16, RED, { size: 11, weight: 700, alpha: 0.95 });
      offset = 14;
    }
    if ((player.radSuit ?? 0) > 0) {
      const blink = player.radSuit > 5 || Math.floor(player.radSuit * 4) % 2 === 0;
      this.text(`RAD ${Math.ceil(player.radSuit)}s`, x, base - 24 + offset, GREEN, {
        size: 11,
        weight: 700,
        alpha: blink ? 0.95 : 0.3,
      });
    }
  }

  /** Armor readout (Green Security Armor 100 / Blue MegaArmor 200) right beside Health on the lower HUD bar. */
  drawArmor(x, base, player) {
    const armor = Math.max(0, Math.ceil(player.armor ?? 0));
    const isBlue = player.armorType === 'blue';
    const col = isBlue ? BLUE : GREEN;
    const maxArmor = isBlue || armor > 100 ? 200 : 100;
    this.text('ARMOR', x, base - 24, BLUE, { size: 11, alpha: 0.8 });
    this.drawBar(x, base, 112, 14, Utils.clamp(armor / maxArmor, 0, 1), col, col);
    this.text(String(armor), x + 122, base, armor > 0 ? col : BLUE, {
      size: 20,
      weight: 700,
      alpha: armor > 0 ? 1 : 0.4,
    });
  }

  /** Classic Doom ARMS indicator (slots 1–4) on the lower HUD bar. */
  drawArms(x, base, player) {
    this.text('ARMS', x, base - 24, BLUE, { size: 11, alpha: 0.8 });
    for (let slot = 1; slot <= 4; slot++) {
      const name = WEAPON_SLOTS[slot];
      const owned =
        slot === 1
          ? Boolean(player.weapons?.chainsaw || player.weapons?.knife)
          : Boolean(player.weapons?.[name]);
      const active =
        slot === 1
          ? player.weapon === 'chainsaw' || player.weapon === 'knife'
          : player.weapon === name;
      const col = active ? ORANGE : owned ? GREEN : BLUE;
      const sx = x + (slot - 1) * 22;
      const sy = base - 16;
      this.line([sx, sy, sx + 16, sy, sx + 16, sy + 16, sx, sy + 16, sx, sy], col, active ? 1 : owned ? 0.8 : 0.24);
      this.text(String(slot), sx + 8, base - 3, col, {
        size: 12,
        align: 'center',
        weight: active ? 800 : 600,
        alpha: active ? 1 : owned ? 0.9 : 0.32,
        glow: active ? 10 : 4,
      });
    }
  }

  /** Three security keycard slots (Blue, Yellow, Red) on the lower HUD bar. */
  drawKeys(x, base, keys) {
    this.text('KEYS', x, base - 24, BLUE, { size: 11, alpha: 0.8 });
    const slots = [
      ['blue', BLUE],
      ['yellow', ORANGE],
      ['red', RED],
    ];
    for (let i = 0; i < slots.length; i++) {
      const [name, col] = slots[i];
      const held = Boolean(keys?.[name]);
      const kx = x + i * 24;
      const ky = base - 16;
      const kw = 16;
      const kh = 16;
      // notched security badge outline
      this.line([kx, ky, kx + kw - 4, ky, kx + kw, ky + 4, kx + kw, ky + kh, kx, ky + kh, kx, ky], col, held ? 1 : 0.24);
      if (held) {
        // inner chip & magnetic stripe when the keycard is held
        this.line([kx + 3, ky + 5, kx + kw - 3, ky + 5], col, 0.95);
        this.line([kx + 3, ky + 9, kx + 9, ky + 9, kx + 9, ky + 13, kx + 3, ky + 13, kx + 3, ky + 9], col, 0.95);
      }
    }
  }

  /** Displayed ammo count for a pool: rolls up smoothly from the pre-pickup value while flashing. */
  shownAmmo(player, key) {
    const count = player[key] ?? 0;
    const flash = player.ammoFlash?.[key] ?? 0;
    if (flash <= 0)
      return count;
    const from = player.ammoFrom?.[key] ?? count;
    const rollProgress = Utils.clamp(1 - Math.max(0, flash - 0.25) / (AMMO_FLASH_DURATION - 0.25), 0, 1);
    return Math.round(Utils.lerp(from, count, rollProgress));
  }

  /** Active weapon ammo readout and classic Doom 3-pool tally (Bullets, Shells, Rockets). */
  drawAmmo(rightX, base, player, weaponDef) {
    const ammoType = weaponDef?.ammoType ?? null;
    const ammoDef = ammoType ? AMMO_TYPES[ammoType] : null;
    const activeCount = ammoType ? this.shownAmmo(player, ammoType) : null;
    const activeFlash = ammoType ? (player.ammoFlash?.[ammoType] ?? 0) : 0;
    const activeFlashNorm = Utils.clamp(activeFlash / AMMO_FLASH_DURATION, 0, 1);
    const activePulse = activeFlash > 0 && Math.floor(activeFlash * 18) % 2 === 0;
    const activeCol =
      activeFlash > 0
        ? (activePulse ? ORANGE : GREEN)
        : ammoDef && (player[ammoType] ?? 0) <= ammoDef.low
          ? ORANGE
          : GREEN;
    const activeSize = activeFlash > 0 ? 20 + Math.round(Math.sin(activeFlashNorm * Math.PI) * 6) : 20;
    this.text(ammoDef ? ammoDef.label : 'MELEE', rightX - 96, base - 24, activeFlash > 0 ? activeCol : BLUE, {
      size: 11,
      align: 'right',
      alpha: activeFlash > 0 ? 1 : 0.8,
      glow: activeFlash > 0 ? 12 : 6,
    });
    this.text(ammoDef ? String(activeCount) : '--', rightX - 96, base, activeCol, {
      size: activeSize,
      align: 'right',
      weight: activeFlash > 0 ? 800 : 700,
      glow: activeFlash > 0 ? 16 : 6,
    });
    if (activeFlash > 0) {
      const delta = player.ammoDelta?.[ammoType] ?? 0;
      if (delta > 0)
        this.text(`+${delta}`, rightX - 96, base - 36 - (1 - activeFlashNorm) * 6, ORANGE, {
          size: 12,
          align: 'right',
          weight: 800,
          alpha: Math.min(1, activeFlashNorm * 1.5),
          glow: 12,
        });
      this.line(
        [rightX - 154, base - 21, rightX - 90, base - 21, rightX - 90, base + 5, rightX - 154, base + 5, rightX - 154, base - 21],
        activeCol,
        0.35 + 0.55 * activeFlashNorm,
      );
    }

    const pools = [
      ['bullets', AMMO_TYPES.bullets],
      ['shells', AMMO_TYPES.shells],
      ['rockets', AMMO_TYPES.rockets],
    ];
    for (let i = 0; i < pools.length; i++) {
      const [key, def] = pools[i];
      const count = player[key] ?? 0;
      const shown = this.shownAmmo(player, key);
      const flash = player.ammoFlash?.[key] ?? 0;
      const flashNorm = Utils.clamp(flash / AMMO_FLASH_DURATION, 0, 1);
      const pulse = flash > 0 && Math.floor(flash * 18) % 2 === 0;
      const isActive = ammoType === key;
      const rowY = base - 23 + i * 11;
      const flashCol = pulse ? ORANGE : GREEN;
      const labelCol = flash > 0 ? flashCol : isActive ? GREEN : BLUE;
      const valueCol = flash > 0 ? flashCol : count <= def.low ? ORANGE : isActive ? GREEN : BLUE;
      const rowSize = flash > 0 ? 10 + Math.round(flashNorm * 2) : 10;
      const rowGlow = flash > 0 ? 14 : 6;
      this.text(def.short, rightX - 82, rowY, labelCol, {
        size: rowSize,
        weight: flash > 0 || isActive ? 800 : 600,
        alpha: flash > 0 || isActive ? 1 : 0.72,
        glow: rowGlow,
      });
      this.text(`${shown}/${def.max}`, rightX, rowY, valueCol, {
        size: rowSize,
        align: 'right',
        weight: flash > 0 || isActive ? 800 : 600,
        alpha: flash > 0 || isActive ? 1 : 0.82,
        glow: rowGlow,
      });
      if (flash > 0) {
        this.line(
          [rightX - 86, rowY - 9, rightX + 4, rowY - 9, rightX + 4, rowY + 2, rightX - 86, rowY + 2, rightX - 86, rowY - 9],
          flashCol,
          0.35 + 0.55 * flashNorm,
        );
        const delta = player.ammoDelta?.[key] ?? 0;
        if (!isActive && delta > 0)
          this.text(`+${delta}`, rightX - 90, rowY, ORANGE, {
            size: 10,
            align: 'right',
            weight: 800,
            alpha: Math.min(1, flashNorm * 1.5),
            glow: 12,
          });
      }
    }
  }

  drawMap(game) {
    const { width } = this;
    if (game.state === 'title' || game.state === 'cleared')
      return;
    const layer = this.overlay.crisp;
    const level = game.level;
    const maxW = Math.min(260, Math.floor(width * 0.25));
    const maxH = Math.min(180, Math.floor(this.height * 0.28));
    const s = Math.max(3, Math.min(7, Math.floor(Math.min(maxW / level.width, maxH / level.rowCount))));
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
          if (level.teleporter?.[idx] === 1) {
            layer.rectLine(ox + x * s + 0.5, oy + y * s + 0.5, Math.max(1, s - 1), Math.max(1, s - 1), RGB[GREEN], visible ? 0.95 : 0.65);
            continue;
          }
          const isSlime = level.slime?.[idx] === 1;
          const col = isSlime ? (visible ? SLIME_VISIBLE : SLIME_SEEN) : (visible ? FLOOR_VISIBLE : FLOOR_SEEN);
          layer.fillRect(ox + x * s + s / 2 - 0.5, oy + y * s + s / 2 - 0.5, isSlime ? 1.5 : 1, isSlime ? 1.5 : 1, col);
          continue;
        }
        const doorObj = level.doors.get(idx);
        const hiddenSecret = doorObj?.secret && !doorObj.revealed;
        const door = (level.kind[idx] === DOOR && !hiddenSecret) || level.kind[idx] === EXIT;
        const doorCol = doorObj?.lock === 'red'
          ? RGB[RED]
          : doorObj?.lock === 'yellow'
            ? RGB[ORANGE]
            : doorObj?.lock === 'blue'
              ? RGB[BLUE]
              : RGB[GREEN];
        layer.rectLine(ox + x * s + 0.5, oy + y * s + 0.5, s - 1, s - 1, door ? doorCol : RGB[BLUE], door ? (visible ? 1 : 0.55) : (visible ? 0.9 : 0.35));
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

  /**
   * Classic Doom full-screen tactical vector automap (Tab) rendered above the lower marine status bar.
   * Displays color-coded boundary walls, elevation steps, locked/secret doors, slime hazards, crushers,
   * explored keycards, live sector telemetry (KILLS, ITEMS, SECRETS, TIME), and the vector player arrow.
   */
  drawAutomap(game) {
    const { width, height } = this;
    if (game.state === 'title' || game.state === 'cleared')
      return;
    const layer = this.overlay.crisp;
    const level = game.level;
    const fog = game.fog;
    const padX = Math.max(20, Math.floor(width * 0.03));
    const x0 = padX;
    const y0 = 18;
    const x1 = width - padX;
    const y1 = Math.max(y0 + 180, height - 96);
    const w = x1 - x0;
    const h = y1 - y0;
    const headerH = 30;
    const footerH = 24;

    // tactical CRT dark screen backdrop and outer neon frame
    layer.fillRect(x0, y0, w, h, BACKGROUND_RGB);
    layer.rectLine(x0 + 0.5, y0 + 0.5, w - 1, h - 1, RGB[BLUE], 0.48);
    layer.line([x0, y0 + headerH, x1, y0 + headerH], RGB[BLUE], 0.3);
    layer.line([x0, y1 - footerH, x1, y1 - footerH], RGB[BLUE], 0.3);

    const arm = 14;
    this.canvasLine([x0 - 2, y0 + arm, x0 - 2, y0 - 2, x0 + arm, y0 - 2], GREEN, 0.9, 2, 8);
    this.canvasLine([x1 - arm, y0 - 2, x1 + 2, y0 - 2, x1 + 2, y0 + arm], GREEN, 0.9, 2, 8);
    this.canvasLine([x0 - 2, y1 - arm, x0 - 2, y1 + 2, x0 + arm, y1 + 2], GREEN, 0.9, 2, 8);
    this.canvasLine([x1 - arm, y1 + 2, x1 + 2, y1 + 2, x1 + 2, y1 - arm], GREEN, 0.9, 2, 8);

    // map viewport and zoom/pan coordinate transform
    const mapX0 = x0 + 10;
    const mapY0 = y0 + headerH + 8;
    const mapW = Math.max(60, w - 20);
    const mapH = Math.max(60, h - headerH - footerH - 16);
    const baseScale = Math.max(6, Math.min(22, Math.min(mapW / level.width, mapH / level.rowCount) * 0.88));
    const s = baseScale * this.automapZoom;
    const mw = level.width * s;
    const mh = level.rowCount * s;
    const mapCenterX = mapX0 + mapW * 0.5;
    const mapCenterY = mapY0 + mapH * 0.5;
    const player = game.player;
    const pxTile = player.pos.x / TILE;
    const pyTile = player.pos.y / TILE;
    const ox = this.automapFollow && (mw > mapW || this.automapZoom > 1)
      ? Utils.clamp(mapCenterX - pxTile * s, mapX0 + Math.min(0, mapW - mw), mapX0 + Math.max(0, mapW - mw))
      : mapCenterX - mw * 0.5;
    const oy = this.automapFollow && (mh > mapH || this.automapZoom > 1)
      ? Utils.clamp(mapCenterY - pyTile * s, mapY0 + Math.min(0, mapH - mh), mapY0 + Math.max(0, mapH - mh))
      : mapCenterY - mh * 0.5;

    // optional tactical coordinate grid
    if (this.automapGrid) {
      const gxMin = Math.max(mapX0, ox);
      const gxMax = Math.min(mapX0 + mapW, ox + mw);
      const gyMin = Math.max(mapY0, oy);
      const gyMax = Math.min(mapY0 + mapH, oy + mh);
      for (let gx = 0; gx <= level.width; gx++) {
        const lx = ox + gx * s;
        if (lx >= mapX0 && lx <= mapX0 + mapW && gyMax > gyMin)
          layer.line([lx, gyMin, lx, gyMax], RGB[BLUE], gx % 4 === 0 ? 0.14 : 0.06);
      }
      for (let gy = 0; gy <= level.rowCount; gy++) {
        const ly = oy + gy * s;
        if (ly >= mapY0 && ly <= mapY0 + mapH && gxMax > gxMin)
          layer.line([gxMin, ly, gxMax, ly], RGB[BLUE], gy % 4 === 0 ? 0.14 : 0.06);
      }
    }

    // explored architecture: boundary walls, elevation steps, doors, secrets, slime, and exit portal
    for (let y = 0; y < level.rowCount; y++) {
      for (let x = 0; x < level.width; x++) {
        const idx = y * level.width + x;
        if (!fog.isExplored(idx))
          continue;
        const tx = ox + x * s;
        const ty = oy + y * s;
        if (tx + s < mapX0 || tx > mapX0 + mapW || ty + s < mapY0 || ty > mapY0 + mapH)
          continue;
        const visible = fog.isVisible(idx);
        const kind = level.kind[idx];
        const hVal = level.heights[idx];

        if (!kind || hVal <= 0) {
          const isTeleporter = level.teleporter?.[idx] === 1;
          const isSlime = level.slime?.[idx] === 1;
          if (isTeleporter) {
            layer.rectLine(tx + 1.5, ty + 1.5, Math.max(2, s - 3), Math.max(2, s - 3), RGB[GREEN], visible ? 0.95 : 0.72);
            layer.circleLine(tx + s * 0.5, ty + s * 0.5, Math.max(1.5, s * 0.28), RGB[BLUE], visible ? 0.85 : 0.55);
            this.text('T', tx + s * 0.5, ty + s * 0.5 + 3, GREEN, { size: Math.max(8, Math.min(11, Math.floor(s * 0.55))), align: 'center', weight: 800, glow: 5 });
          } else if (isSlime) {
            layer.fillRect(tx + 1.5, ty + 1.5, Math.max(1, s - 3), Math.max(1, s - 3), visible ? SLIME_VISIBLE : SLIME_SEEN);
            layer.line([tx + 2, ty + s - 2, tx + s - 2, ty + 2], RGB[GREEN], visible ? 0.55 : 0.3);
          } else
            layer.fillRect(tx + s * 0.5 - 0.5, ty + s * 0.5 - 0.5, 1.5, 1.5, visible ? FLOOR_VISIBLE : FLOOR_SEEN);
          if (game.discoveredSecrets?.has(idx)) {
            layer.rectLine(tx + 2, ty + 2, Math.max(2, s - 4), Math.max(2, s - 4), RGB[ORANGE], 0.8);
            this.text('S', tx + s * 0.5, ty + s * 0.5 + 3, ORANGE, { size: Math.max(8, Math.min(12, Math.floor(s * 0.6))), align: 'center', weight: 800, glow: 5 });
          }
          continue;
        }

        const doorObj = level.doors.get(idx);
        const hiddenSecret = doorObj?.secret && !doorObj.revealed;
        if (kind === EXIT) {
          layer.rectLine(tx + 1, ty + 1, s - 2, s - 2, RGB[GREEN], 0.95);
          layer.line([tx + 2, ty + 2, tx + s - 2, ty + s - 2], RGB[ORANGE], 0.85);
          layer.line([tx + s - 2, ty + 2, tx + 2, ty + s - 2], RGB[ORANGE], 0.85);
          this.text('X', tx + s * 0.5, ty + s * 0.5 + 3, GREEN, { size: Math.max(8, Math.min(11, Math.floor(s * 0.55))), align: 'center', weight: 800, glow: 6 });
          continue;
        }

        if (kind === DOOR && !hiddenSecret) {
          const isSecret = !!doorObj?.secret;
          const doorCol = isSecret
            ? RGB[ORANGE]
            : doorObj?.lock === 'red'
              ? RGB[RED]
              : doorObj?.lock === 'yellow'
                ? RGB[ORANGE]
                : doorObj?.lock === 'blue'
                  ? RGB[BLUE]
                  : RGB[GREEN];
          const alpha = visible ? 1 : 0.7;
          layer.rectLine(tx + 1, ty + 1, s - 2, s - 2, doorCol, alpha);
          const closed = 1 - (doorObj?.open ?? 0);
          if (closed > 0.05)
            layer.line([tx + 2, ty + s * 0.5, tx + 2 + (s - 4) * closed, ty + s * 0.5], doorCol, alpha);
          if (isSecret)
            this.text('S', tx + s * 0.5, ty + s * 0.5 + 3, ORANGE, { size: Math.max(8, Math.min(11, Math.floor(s * 0.55))), align: 'center', weight: 800, glow: 5 });
          continue;
        }

        if (kind === PILLAR || (hVal > 0 && hVal < CEILING)) {
          layer.rectLine(tx + 1.5, ty + 1.5, Math.max(2, s - 3), Math.max(2, s - 3), RGB[ORANGE], visible ? 0.95 : 0.55);
          continue;
        }

        // full-height wall (or unrevealed secret door disguised as a normal wall):
        // subtle blue block outline + classic Doom red vector boundary lines against open space
        layer.rectLine(tx + 0.5, ty + 0.5, s - 1, s - 1, RGB[BLUE], visible ? 0.38 : 0.2);
        const edgeAlpha = visible ? 0.95 : 0.58;
        const isOpenNeighbor = (nx, ny) => {
          if (nx < 0 || ny < 0 || nx >= level.width || ny >= level.rowCount)
            return false;
          const nIdx = ny * level.width + nx;
          const nDoor = level.doors.get(nIdx);
          const nHidden = nDoor?.secret && !nDoor.revealed;
          return !level.kind[nIdx] || level.heights[nIdx] < CEILING || (level.kind[nIdx] === DOOR && !nHidden) || level.kind[nIdx] === EXIT;
        };
        if (isOpenNeighbor(x, y - 1))
          layer.line([tx, ty + 0.5, tx + s, ty + 0.5], RGB[RED], edgeAlpha);
        if (isOpenNeighbor(x, y + 1))
          layer.line([tx, ty + s - 0.5, tx + s, ty + s - 0.5], RGB[RED], edgeAlpha);
        if (isOpenNeighbor(x - 1, y))
          layer.line([tx + 0.5, ty, tx + 0.5, ty + s], RGB[RED], edgeAlpha);
        if (isOpenNeighbor(x + 1, y))
          layer.line([tx + s - 0.5, ty, tx + s - 0.5, ty + s], RGB[RED], edgeAlpha);
      }
    }

    // ceiling crushers on explored tiles
    if (level.crushers) {
      for (const crusher of level.crushers) {
        if (!fog.isExplored(crusher.idx))
          continue;
        const cx = ox + crusher.x * s;
        const cy = oy + crusher.y * s;
        if (cx + s < mapX0 || cx > mapX0 + mapW || cy + s < mapY0 || cy > mapY0 + mapH)
          continue;
        layer.rectLine(cx + 2, cy + 2, Math.max(2, s - 4), Math.max(2, s - 4), RGB[RED], 0.8);
        layer.line([cx + 2, cy + 2, cx + s - 2, cy + s - 2], RGB[ORANGE], 0.75);
        layer.line([cx + s - 2, cy + 2, cx + 2, cy + s - 2], RGB[ORANGE], 0.75);
      }
    }

    // uncollected keycards and high-value pickups on explored tiles
    if (game.pickups) {
      for (const item of game.pickups) {
        if (item.taken)
          continue;
        const ix = Math.floor(item.pos.x / TILE);
        const iy = Math.floor(item.pos.y / TILE);
        const iIdx = iy * level.width + ix;
        if (!fog.isExplored(iIdx))
          continue;
        const sx = ox + (item.pos.x / TILE) * s;
        const sy = oy + (item.pos.y / TILE) * s;
        if (sx < mapX0 || sx > mapX0 + mapW || sy < mapY0 || sy > mapY0 + mapH)
          continue;
        const kind = item.type ?? item.kind;
        const isKey = kind === 'redKey' || kind === 'yellowKey' || kind === 'blueKey';
        const isMajor = isKey || kind === 'soulsphere' || kind === 'berserk' || kind === 'radsuit' || kind === 'megaArmor' || kind === 'shotgun' || kind === 'chaingun' || kind === 'rocketLauncher';
        if (!isMajor)
          continue;
        const col = kind === 'redKey' || kind === 'berserk'
          ? RGB[RED]
          : kind === 'yellowKey' || kind === 'rocketLauncher'
            ? RGB[ORANGE]
            : kind === 'blueKey' || kind === 'soulsphere' || kind === 'megaArmor'
              ? RGB[BLUE]
              : RGB[GREEN];
        const r = isKey ? Math.max(3.5, s * 0.28) : Math.max(2.5, s * 0.2);
        layer.line([sx, sy - r, sx + r, sy, sx, sy + r, sx - r, sy, sx, sy - r], col, 0.95);
      }
    }

    // visible enemies (only while currently in line-of-sight)
    for (const enemy of game.enemies) {
      if (enemy.state === 'dead' || !fog.canSee(enemy.pos.x, enemy.pos.y))
        continue;
      const ex = ox + (enemy.pos.x / TILE) * s;
      const ey = oy + (enemy.pos.y / TILE) * s;
      if (ex < mapX0 || ex > mapX0 + mapW || ey < mapY0 || ey > mapY0 + mapH)
        continue;
      const r = Math.max(3, s * 0.24);
      layer.line([ex, ey - r, ex + r, ey, ex, ey + r, ex - r, ey, ex, ey - r], RGB[ORANGE], 0.95);
    }

    // classic Doom vector player arrow + subtle FOV cone
    const px = ox + pxTile * s;
    const py = oy + pyTile * s;
    if (px >= mapX0 && px <= mapX0 + mapW && py >= mapY0 && py <= mapY0 + mapH) {
      const a = player.angle;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const perpX = -sin;
      const perpY = cos;
      const coneLen = Math.max(18, s * 2.1);
      layer.line([px, py, px + Math.cos(a - 0.62) * coneLen, py + Math.sin(a - 0.62) * coneLen], RGB[GREEN], 0.22);
      layer.line([px, py, px + Math.cos(a + 0.62) * coneLen, py + Math.sin(a + 0.62) * coneLen], RGB[GREEN], 0.22);

      const arrowR = Math.max(6, Math.min(13, s * 0.65));
      const tipX = px + cos * arrowR * 1.25;
      const tipY = py + sin * arrowR * 1.25;
      const tailX = px - cos * arrowR * 0.95;
      const tailY = py - sin * arrowR * 0.95;
      // main shaft
      layer.line([tailX, tailY, tipX, tipY], RGB[GREEN], 1);
      // arrowhead barbs
      const headBackX = tipX - cos * arrowR * 0.75;
      const headBackY = tipY - sin * arrowR * 0.75;
      const wing = arrowR * 0.52;
      layer.line([headBackX + perpX * wing, headBackY + perpY * wing, tipX, tipY, headBackX - perpX * wing, headBackY - perpY * wing], RGB[GREEN], 1);
      // classic Doom tail fletching
      const fletchX = tailX + cos * arrowR * 0.35;
      const fletchY = tailY + sin * arrowR * 0.35;
      const fWing = arrowR * 0.38;
      layer.line([fletchX + perpX * fWing, fletchY + perpY * fWing, tailX, tailY, fletchX - perpX * fWing, fletchY - perpY * fWing], RGB[GREEN], 0.9);
    }

    // header telemetry: sector code/name + live KILLS / ITEMS / SECRETS / TIME
    const levelMeta = LEVELS[game.levelIndex] ?? {};
    const code = level.code ?? levelMeta.code ?? `E1M${(game.levelIndex ?? 0) + 1}`;
    const name = (level.name ?? levelMeta.name ?? 'HANGAR').toUpperCase();
    this.text(`${code} · ${name} — TACTICAL AUTOMAP`, x0 + 14, y0 + 20, BLUE, { size: 13, weight: 800, glow: 8 });

    const totalSec = Math.floor(game.stats?.time ?? 0);
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    const statsText = `KILLS ${game.kills ?? 0}/${game.totalEnemies ?? 0}   ITEMS ${game.itemsPicked ?? 0}/${game.totalItems ?? 0}   SECRETS ${game.secretsFound ?? 0}/${game.totalSecrets ?? 0}   TIME ${mins}:${secs}`;
    this.text(statsText, x1 - 14, y0 + 20, ORANGE, { size: 12, align: 'right', weight: 700, glow: 6 });

    // footer legend & tactical controls
    const legendY = y1 - 8;
    this.text('WALL', x0 + 14, legendY, RED, { size: 10, weight: 700, glow: 4 });
    this.text('STEP/SECRET', x0 + 54, legendY, ORANGE, { size: 10, weight: 700, glow: 4 });
    this.text('DOOR/SLIME/TELE/EXIT', x0 + 142, legendY, GREEN, { size: 10, weight: 700, glow: 4 });
    this.text('KEY/LOCK', x0 + 282, legendY, BLUE, { size: 10, weight: 700, glow: 4 });
    const controlsText = `[TAB] CLOSE   [+/-] ZOOM ${Math.round(this.automapZoom * 100)}%   [G] GRID ${this.automapGrid ? 'ON' : 'OFF'}`;
    this.text(controlsText, x1 - 14, legendY, GREEN, { size: 10, align: 'right', alpha: 0.9, glow: 4 });
  }

  drawIntermission(game) {
    const { width, height } = this;
    const cx = width / 2;
    const cy = height / 2;
    const w = Math.min(620, Math.max(420, width - 48));
    const h = Math.min(470, Math.max(380, height - 48));
    const x0 = cx - w / 2;
    const y0 = cy - h / 2;
    const last = game.levelIndex + 1 >= LEVELS.length;
    const inter = game.intermission ?? {
      phase: 4,
      done: true,
      killsPct: game.totalEnemies > 0 ? Math.round((game.kills / game.totalEnemies) * 100) : 100,
      itemsPct: game.totalItems > 0 ? Math.round((game.itemsPicked / game.totalItems) * 100) : 100,
      secretsPct: game.totalSecrets > 0 ? Math.round((game.secretsFound / game.totalSecrets) * 100) : 100,
      timeSec: Math.floor(game.stats.time),
      parSec: game.level.par ?? 120,
      shownKills: game.totalEnemies > 0 ? Math.round((game.kills / game.totalEnemies) * 100) : 100,
      shownItems: game.totalItems > 0 ? Math.round((game.itemsPicked / game.totalItems) * 100) : 100,
      shownSecrets: game.totalSecrets > 0 ? Math.round((game.secretsFound / game.totalSecrets) * 100) : 100,
      shownTime: Math.floor(game.stats.time),
    };

    // outer frame and tactical corner brackets
    this.canvasLine([x0, y0, x0 + w, y0, x0 + w, y0 + h, x0, y0 + h, x0, y0], BLUE, 0.5, 1.5, 10);
    const arm = 16;
    this.canvasLine([x0 - 3, y0 + arm, x0 - 3, y0 - 3, x0 + arm, y0 - 3], GREEN, 0.9, 2, 10);
    this.canvasLine([x0 + w - arm, y0 - 3, x0 + w + 3, y0 - 3, x0 + w + 3, y0 + arm], GREEN, 0.9, 2, 10);
    this.canvasLine([x0 - 3, y0 + h - arm, x0 - 3, y0 + h + 3, x0 + arm, y0 + h + 3], GREEN, 0.9, 2, 10);
    this.canvasLine([x0 + w - arm, y0 + h + 3, x0 + w + 3, y0 + h + 3, x0 + w + 3, y0 + h - arm], GREEN, 0.9, 2, 10);

    // header
    this.text(game.level.name.toUpperCase(), cx, y0 + 36, BLUE, { size: 22, align: 'center', weight: 800, glow: 14 });
    this.text(last ? 'EPISODE COMPLETE' : 'FINISHED', cx, y0 + 60, GREEN, { size: 14, align: 'center', weight: 700, glow: 10 });
    this.canvasLine([x0 + 28, y0 + 74, x0 + w - 28, y0 + 74], BLUE, 0.3, 1, 4);

    // KILLS / ITEMS / SECRETS rows
    const rows = [
      { label: 'KILLS', raw: `${game.kills}/${game.totalEnemies}`, shown: Math.round(inter.shownKills), phase: 0 },
      { label: 'ITEMS', raw: `${game.itemsPicked}/${game.totalItems}`, shown: Math.round(inter.shownItems), phase: 1 },
      { label: 'SECRETS', raw: `${game.secretsFound}/${game.totalSecrets}`, shown: Math.round(inter.shownSecrets), phase: 2 },
    ];
    const barX = x0 + 204;
    const barW = Math.max(110, w - 324);
    const ticks = 20;
    const gap = barW / ticks;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const ry = y0 + 108 + r * 38;
      const active = inter.phase === row.phase;
      const reached = inter.phase >= row.phase;
      const full = reached && row.shown >= 100;
      this.text(row.label, x0 + 32, ry, BLUE, { size: 15, weight: 700 });
      this.text(row.raw, x0 + 132, ry, BLUE, { size: 12, alpha: 0.7, glow: 2 });
      const lit = reached ? Math.round((Utils.clamp(row.shown, 0, 100) / 100) * ticks) : 0;
      for (let i = 0; i < ticks; i++) {
        const on = i < lit;
        this.canvasLine([barX + i * gap, ry, barX + i * gap, ry - 13], on ? (full ? ORANGE : GREEN) : BLUE, on ? 0.95 : 0.2, 2, on ? 6 : 0);
      }
      const valText = reached ? `${row.shown}%` : '--%';
      const valCol = active || full ? ORANGE : (reached ? GREEN : BLUE);
      this.text(valText, x0 + w - 32, ry, valCol, { size: 17, align: 'right', weight: 800, alpha: reached ? 1 : 0.45, glow: active ? 14 : 8 });
    }

    // TIME and PAR
    this.canvasLine([x0 + 28, y0 + 202, x0 + w - 28, y0 + 202], BLUE, 0.25, 1, 4);
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const timeReached = inter.phase >= 3;
    const timeActive = inter.phase === 3;
    const timeY = y0 + 230;
    this.text('TIME', x0 + 32, timeY, BLUE, { size: 15, weight: 700 });
    this.text(timeReached ? fmt(inter.shownTime) : '--:--', x0 + 96, timeY, timeActive ? ORANGE : (timeReached ? GREEN : BLUE), { size: 18, weight: 800, alpha: timeReached ? 1 : 0.45 });
    this.text('PAR', cx - 10, timeY, BLUE, { size: 15, weight: 700 });
    this.text(fmt(inter.parSec), cx + 42, timeY, ORANGE, { size: 18, weight: 800 });
    if (inter.done && inter.timeSec <= inter.parSec)
      this.text('PAR BEATEN', x0 + w - 32, timeY, GREEN, { size: 12, align: 'right', weight: 800, glow: 10 });

    // Episode 1 Phobos facility overworld map
    this.canvasLine([x0 + 28, y0 + 246, x0 + w - 28, y0 + 246], BLUE, 0.25, 1, 4);
    const nextBanner = last
      ? 'PHOBOS ANOMALY SECURED · ALL FACILITIES CLEARED'
      : (inter.done ? `ENTERING: ${LEVELS[game.levelIndex + 1].name.toUpperCase()}` : 'PHOBOS SECTOR TELEMETRY');
    this.text(nextBanner, cx, y0 + 268, inter.done ? GREEN : BLUE, { size: 13, align: 'center', weight: 700, alpha: inter.done ? 0.95 : 0.75 });

    const mapY = y0 + 342;
    const span = Math.min(220, w * 0.36);
    const nodes = [
      { x: cx - span, y: mapY + 10, code: 'E1M1', label: 'HANGAR' },
      { x: cx - span * 0.33, y: mapY - 14, code: 'E1M2', label: 'NUCLEAR PLANT' },
      { x: cx + span * 0.33, y: mapY + 8, code: 'E1M3', label: 'TOXIN REFINERY' },
      { x: cx + span, y: mapY - 10, code: 'E1M4', label: 'PHOBOS ANOMALY' },
    ];

    // subtle Phobos crater ridge lines behind the facilities
    this.canvasLine([x0 + 38, mapY + 34, cx - span * 0.6, mapY + 22, cx + span * 0.4, mapY + 30, x0 + w - 38, mapY + 18], BLUE, 0.18, 1, 0);
    // transit paths between facilities
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const passed = i <= game.levelIndex;
      this.canvasLine([a.x + 22, a.y, (a.x + b.x) / 2, Math.min(a.y, b.y) - 6, b.x - 22, b.y], passed ? GREEN : BLUE, passed ? 0.65 : 0.28, 1.5, passed ? 6 : 2);
    }

    // facility architectural icons, blood X on cleared sectors, and blinking YOU ARE HERE pointer
    const blink = 0.5 + 0.5 * Math.sin(game.time * 6.5);
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const cleared = i <= game.levelIndex;
      const next = i === game.levelIndex + 1;
      const col = next ? ORANGE : (cleared ? GREEN : BLUE);
      const alpha = cleared || next ? 0.9 : 0.45;
      if (i === 0) {
        // E1M1 Hangar bunker
        this.canvasLine([n.x - 18, n.y + 12, n.x - 18, n.y - 4, n.x - 10, n.y - 12, n.x + 10, n.y - 12, n.x + 18, n.y - 4, n.x + 18, n.y + 12, n.x - 18, n.y + 12], col, alpha, 1.5, 6);
        this.canvasLine([n.x - 8, n.y + 12, n.x - 8, n.y + 1, n.x + 8, n.y + 1, n.x + 8, n.y + 12], col, alpha * 0.8, 1.2, 4);
      } else if (i === 1) {
        // E1M2 Nuclear Plant cooling towers
        this.canvasLine([n.x - 18, n.y + 12, n.x - 13, n.y - 12, n.x - 3, n.y - 12, n.x + 2, n.y + 12, n.x - 18, n.y + 12], col, alpha, 1.5, 6);
        this.canvasLine([n.x + 2, n.y + 12, n.x + 6, n.y - 9, n.x + 15, n.y - 9, n.x + 19, n.y + 12, n.x + 2, n.y + 12], col, alpha, 1.5, 6);
      } else if (i === 2) {
        // E1M3 Toxin Refinery tanks + pipes
        this.canvasLine([n.x - 18, n.y - 6, n.x - 6, n.y - 13, n.x + 6, n.y - 6, n.x + 6, n.y + 8, n.x - 6, n.y + 14, n.x - 18, n.y + 8, n.x - 18, n.y - 6], col, alpha, 1.5, 6);
        this.canvasLine([n.x + 6, n.y - 4, n.x + 18, n.y - 4, n.x + 18, n.y + 10, n.x + 6, n.y + 10], col, alpha, 1.5, 6);
      } else {
        // E1M4 Phobos Anomaly star sanctum + portal ring
        this.canvasLine([n.x, n.y - 15, n.x + 15, n.y, n.x, n.y + 15, n.x - 15, n.y, n.x, n.y - 15], col, alpha, 1.5, 6);
        this.canvasLine([n.x - 11, n.y - 11, n.x + 11, n.y - 11, n.x + 11, n.y + 11, n.x - 11, n.y + 11, n.x - 11, n.y - 11], col, alpha * 0.85, 1.2, 4);
      }
      this.text(`${n.code} · ${n.label}`, n.x, n.y + 28, col, { size: 9, align: 'center', alpha: alpha + 0.1, glow: 4 });

      if (cleared) {
        // Doom-style bloody X splattered across conquered facilities
        this.canvasLine([n.x - 16, n.y - 14, n.x + 16, n.y + 14], RED, 0.95, 3, 12);
        this.canvasLine([n.x + 16, n.y - 14, n.x - 16, n.y + 14], RED, 0.95, 3, 12);
      } else if (next) {
        const py = n.y - 22 - blink * 4;
        const pAlpha = 0.55 + blink * 0.45;
        this.text('YOU ARE HERE', n.x, py - 18, RED, { size: 10, align: 'center', weight: 800, alpha: pAlpha, glow: 10 });
        this.canvasLine([n.x, py - 13, n.x, py], RED, pAlpha, 2, 10);
        this.canvasLine([n.x - 5, py - 6, n.x, py, n.x + 5, py - 6], RED, pAlpha, 2, 10);
      }
    }

    // bottom action prompt
    const promptAlpha = 0.5 + 0.5 * Math.sin(game.time * 3);
    const prompt = !inter.done
      ? 'click or press ENTER to skip tally'
      : (last ? 'click or press ENTER to return to the title' : 'click or press ENTER for the next level');
    this.text(prompt, cx, y0 + h - 18, ORANGE, { size: 13, align: 'center', alpha: 0.55 + promptAlpha * 0.45 });
  }

  difficultyAt(pos) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const boxW = Math.min(390, Math.max(280, this.width - 48));
    const boxX = cx - boxW / 2;
    const rowsTop = cy - 42;
    const rowH = 26;
    if (pos.x < boxX || pos.x > boxX + boxW)
      return null;
    const idx = Math.floor((pos.y - rowsTop) / rowH);
    if (idx < 0 || idx >= DIFFICULTY_ORDER.length)
      return null;
    return DIFFICULTY_ORDER[idx];
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

    if (state === 'title') {
      dim(Math.max(0.55, game.fade));
      const blink = 0.5 + 0.5 * Math.sin(game.time * 2.2);
      if (!game.selectingDifficulty) {
        this.text('DOOMR', cx, cy - 60, BLUE, { size: Math.min(110, width / 7), align: 'center', weight: 800, glow: 22 });
        this.text('Rip and tear', cx, cy - 20, GREEN, { size: 15, align: 'center', alpha: 0.9 });
        this.text('click or press ENTER to start', cx, cy + 56, ORANGE, { size: 16, align: 'center', alpha: 0.5 + blink * 0.5 });
        const keys = ['W A S D  move', 'mouse / ← →  turn', 'click / SPACE  fire     1-5  weapons', 'E  open doors', 'SHIFT  run     ALT / CMD  crouch', 'TAB  automap     M  music     N  sound     ESC  pause'];
        keys.forEach((k, i) => this.text(k, cx, cy + 100 + i * 20, BLUE, { size: 12, align: 'center', alpha: 0.75, glow: 3 }));
      } else {
        this.text('DOOMR', cx, cy - 116, BLUE, { size: Math.min(84, width / 8), align: 'center', weight: 800, glow: 22 });
        const boxW = Math.min(390, Math.max(280, width - 48));
        const boxH = 160;
        const boxX = cx - boxW / 2;
        const boxY = cy - 72;
        const rowsTop = cy - 42;
        const rowH = 26;
        this.canvasLine([boxX, boxY, boxX + boxW, boxY, boxX + boxW, boxY + boxH, boxX, boxY + boxH, boxX, boxY], BLUE, 0.45, 1.5, 8);
        const arm = 12;
        this.canvasLine([boxX - 3, boxY + arm, boxX - 3, boxY - 3, boxX + arm, boxY - 3], GREEN, 0.85, 2, 8);
        this.canvasLine([boxX + boxW - arm, boxY - 3, boxX + boxW + 3, boxY - 3, boxX + boxW + 3, boxY + arm], GREEN, 0.85, 2, 8);
        this.canvasLine([boxX - 3, boxY + boxH - arm, boxX - 3, boxY + boxH + 3, boxX + arm, boxY + boxH + 3], GREEN, 0.85, 2, 8);
        this.canvasLine([boxX + boxW - arm, boxY + boxH + 3, boxX + boxW + 3, boxY + boxH + 3, boxX + boxW + 3, boxY + boxH - arm], GREEN, 0.85, 2, 8);
        this.text('SELECT SKILL LEVEL', cx, boxY + 20, BLUE, { size: 12, align: 'center', weight: 800, alpha: 0.9, glow: 6 });
        this.canvasLine([boxX + 18, boxY + 26, boxX + boxW - 18, boxY + 26], BLUE, 0.25, 1, 2);

        const currentDiff = game.difficulty ?? 'normal';
        for (let i = 0; i < DIFFICULTY_ORDER.length; i++) {
          const key = DIFFICULTY_ORDER[i];
          const def = DIFFICULTIES[key];
          const selected = currentDiff === key;
          const ry = rowsTop + i * rowH;
          const textY = ry + 18;
          const col = selected ? (key === 'nightmare' ? RED : ORANGE) : BLUE;
          if (selected)
            this.canvasLine([boxX + 14, ry + 2, boxX + boxW - 14, ry + 2, boxX + boxW - 14, ry + rowH - 2, boxX + 14, ry + rowH - 2, boxX + 14, ry + 2], col, 0.65, 1.5, 8);
          const prefix = selected ? `▸ [${i + 1}] ` : `  [${i + 1}] `;
          this.text(`${prefix}${def.label}`, cx, textY, col, {
            size: 14,
            align: 'center',
            weight: selected ? 800 : 600,
            alpha: selected ? 1 : 0.72,
            glow: selected ? 12 : 4,
          });
        }
        const activeDef = DIFFICULTIES[currentDiff] ?? DIFFICULTIES.normal;
        this.text(activeDef.desc, cx, boxY + boxH - 10, GREEN, { size: 11, align: 'center', alpha: 0.9, glow: 4 });
        this.text('↑/↓ or 1-4 select skill  ·  click or press ENTER to begin  ·  ESC back', cx, cy + 120, ORANGE, { size: 14, align: 'center', alpha: 0.5 + blink * 0.5 });
      }
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
      dim(0.82);
      this.drawIntermission(game);
    }

    if ((state === 'title' || state === 'cleared') && game.message.age < game.message.life && game.message.text !== game.level?.name) {
      const fade = Utils.clamp((game.message.life - game.message.age) * 2, 0, 1);
      this.text(game.message.text, cx, 56, GREEN, { size: 16, align: 'center', alpha: fade, glow: 6 });
    }
  }
}
