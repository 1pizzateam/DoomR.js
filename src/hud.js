import { Circ, Rect, Trigo, Utils, Vec2 } from '@1pizzateam/spock';
import { CEILING, DOOR, EXIT, PILLAR, TILE } from './level.js';
import { LEVELS } from './levels.js';
import { createQuadTarget, screenSplatQuads } from './bloodsprites.js';
import { facePlacement, portraitBackdrop } from './face.js';
import { WALL_CELLS, wallCellUv } from './wall.js';
import { AMMO_FLASH_DURATION, DIFFICULTIES, DIFFICULTY_ORDER } from './game.js';
import { AMMO_TYPES } from './ammo.js';
import { DEFAULT_HINT_LINES, DEFAULT_SELECT_HINT, defaultActionLabel } from './keymap.js';
import { MAIN_MENU_ITEMS } from './menu.js';
import { HIT_BACK, HIT_LABELS, HIT_NONE, HIT_RESET_ALL, HIT_SCROLL_DOWN, HIT_SCROLL_UP } from './controls.js';
import { WEAPON_SLOTS, WEAPONS, weaponCellUv, weaponFrame, weaponPlacement } from './weapon.js';

const scratchBloodViewport = new Vec2();
const scratchBloodSplat = { pos: new Vec2(), size: 0, age: 0, drip: 0, seed: 0 };
const COLORS = ['#5b8cff', '#38c793', '#ff9f43', '#e8102c'];
const BLUE = 0;
const GREEN = 1;
const ORANGE = 2;
const RED = 3;
const BACKGROUND = '#07090f';
const RGB = COLORS.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255));
const BACKGROUND_RGB = [7 / 255, 9 / 255, 15 / 255];
const dimmed = (color, amount) => color.map((v, i) => Utils.lerp(BACKGROUND_RGB[i], v, amount));
const FLOOR_SEEN = dimmed(RGB[BLUE], 0.25);
const FLOOR_VISIBLE = dimmed(RGB[BLUE], 0.6);
const SLIME_SEEN = dimmed(RGB[GREEN], 0.38);
const SLIME_VISIBLE = dimmed(RGB[GREEN], 0.82);
const EMPTY_CACHES = Object.freeze([]);
const FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const HINT_STYLE = Object.freeze({ size: 12, align: 'center', alpha: 0.75, glow: 3 });
const HINT_DIM_STYLE = Object.freeze({ size: 12, align: 'center', alpha: 0.45, glow: 2 });

const USE_PROMPT_TOP = 20;
const USE_PROMPT_H = 16;
const USE_PROMPT_CHAR_W = 6.6;
const USE_PROMPT_PAD = 5;
const USE_PROMPT_LABEL_ALPHA = 0.75;
const USE_PROMPT_VERB_ALPHA = 0.45;
const USE_PROMPT_FRAME_ALPHA = 0.5;
const USE_PROMPT_EPSILON = 1e-3;
const USE_LABEL_STYLE = { size: 11, align: 'center', alpha: 0, glow: 0 };
const USE_VERB_STYLE = { size: 9, align: 'center', alpha: 0, glow: 0 };
const USE_LOCK_COLOR = { red: RED, yellow: ORANGE, blue: BLUE };

export const SCREEN_BLOOD_ALPHA = 0.72;

const CONTROLS_ROW_H = 20;
const CONTROLS_TOP = 64;
const CONTROLS_HEADER_H = 64;
const CONTROLS_FOOTER_H = 94;
const CONTROLS_ENTRY_PAUSED_DY = 58;
const RESUME_FALLBACK_TEXT = 'click or press ENTER to resume';
const CONTROLS_LEGEND = '↑↓←→ select · ENTER / click rebind · DEL clear · R reset row · ESC back';
const CONTROLS_CUE_W = 24;
const CONTROLS_BUTTON_HALF_W = 70;
const CONTROLS_LABELS_HALF_W = 150;
const SEG4 = [0, 0, 0, 0];
const RECT10 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const controlsRect = (x0, y0, x1, y1) => {
  RECT10[0] = x0; RECT10[1] = y0; RECT10[2] = x1; RECT10[3] = y0; RECT10[4] = x1;
  RECT10[5] = y1; RECT10[6] = x0; RECT10[7] = y1; RECT10[8] = x0; RECT10[9] = y0;
  return RECT10;
};
const controlsSeg = (x0, y0, x1, y1) => {
  SEG4[0] = x0; SEG4[1] = y0; SEG4[2] = x1; SEG4[3] = y1;
  return SEG4;
};
const POLY6 = [0, 0, 0, 0, 0, 0];
const KEYCARD_SLOTS = Object.freeze([
  Object.freeze(['blue', BLUE]),
  Object.freeze(['yellow', ORANGE]),
  Object.freeze(['red', RED]),
]);
const AMMO_POOL_KEYS = Object.freeze([
  Object.freeze(['bullets', AMMO_TYPES.bullets]),
  Object.freeze(['shells', AMMO_TYPES.shells]),
  Object.freeze(['rockets', AMMO_TYPES.rockets]),
]);
const WEAPON_PLACE_OPTS = { width: 0, height: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0 };
const WEAPON_RECT = { x0: 0, y0: 0, x1: 0, y1: 0, pixel: 0 };
const FACE_VIEWPORT = new Vec2();
const FACE_PLACEMENT = { rect: new Rect(), pixel: 0 };
const WALL_LOWER = new Rect();
const WALL_UPPER = new Rect();
const WALL_ALPHA = 0.4;

const SCRATCH_SIZE = new Vec2();
const SCRATCH_POS = new Vec2();
const WEAPON_QUAD = new Rect();
const BLOOD_QUAD = new Rect();
const DRAW_RECT = new Rect();
const DRAW_CIRC = new Circ(1);
const SEG_V = [new Vec2(), new Vec2()];
const POLY3_V = [new Vec2(), new Vec2(), new Vec2()];
const TRI_V = [new Vec2(), new Vec2(), new Vec2(), new Vec2()];
const RECT_V = [new Vec2(), new Vec2(), new Vec2(), new Vec2(), new Vec2()];

// Writes the edges into a reused Rect; corners are set exactly rather than derived from a centre and half size.
const setRectEdges = (rect, x0, y0, x1, y1) => {
  SCRATCH_SIZE.setScalar(x1 - x0, y1 - y0);
  rect.setSize(SCRATCH_SIZE);
  SCRATCH_POS.setScalar((x0 + x1) * 0.5, (y0 + y1) * 0.5);
  rect.setPosition(SCRATCH_POS);
  rect.topLeftCorner.setScalar(x0, y0);
  rect.bottomRightCorner.setScalar(x1, y1);
  return rect;
};
// Top-left corner and size, with the far corner computed as x + w, y + h.
const setRect = (x, y, w, h) => {
  setRectEdges(DRAW_RECT, x, y, x + w, y + h);
  DRAW_RECT.size.setScalar(w, h);
  return DRAW_RECT;
};
const setCirc = (cx, cy, radius) => {
  DRAW_CIRC.position.setScalar(cx, cy);
  DRAW_CIRC.radius = radius;
  return DRAW_CIRC;
};
const segmentPoints = (x0, y0, x1, y1) => {
  SEG_V[0].setScalar(x0, y0);
  SEG_V[1].setScalar(x1, y1);
  return SEG_V;
};

// Scalar drawing into a Layer through shared scratch Vec2 arrays: no per-call coordinate arrays.
const layerSegment = (layer, x0, y0, x1, y1, color, alpha = 1) => {
  layer.line(segmentPoints(x0, y0, x1, y1), color, alpha);
};
const cornerBracket = (x0, y0, x1, y1, x2, y2) => {
  POLY6[0] = x0; POLY6[1] = y0; POLY6[2] = x1; POLY6[3] = y1; POLY6[4] = x2; POLY6[5] = y2;
  return POLY6;
};
const layerPoly3 = (layer, x0, y0, x1, y1, x2, y2, color, alpha = 1) => {
  POLY3_V[0].setScalar(x0, y0); POLY3_V[1].setScalar(x1, y1); POLY3_V[2].setScalar(x2, y2);
  layer.line(POLY3_V, color, alpha);
};
const layerTriangle = (layer, x0, y0, x1, y1, x2, y2, color, alpha = 1) => {
  TRI_V[0].setScalar(x0, y0); TRI_V[1].setScalar(x1, y1); TRI_V[2].setScalar(x2, y2); TRI_V[3].setScalar(x0, y0);
  layer.line(TRI_V, color, alpha);
};
const layerDiamond = (layer, cx, cy, r, color, alpha = 1) => {
  RECT_V[0].setScalar(cx, cy - r); RECT_V[1].setScalar(cx + r, cy); RECT_V[2].setScalar(cx, cy + r);
  RECT_V[3].setScalar(cx - r, cy); RECT_V[4].setScalar(cx, cy - r);
  layer.line(RECT_V, color, alpha);
};

/** Written by layoutControls and read by both drawing and hit-testing so they never drift. */
const CONTROLS_LAYOUT = {
  boxX: 0, boxY: 0, boxW: 0, boxH: 0, rowsTop: 0, footerTop: 0, visibleRows: 4, rowH: CONTROLS_ROW_H,
  nameX: 0, slot0X: 0, slot1X: 0, slotHalf: 0, resetX: 0, backX: 0, buttonY: 0, labelsX: 0, labelsY: 0,
};

const MENU_BUTTON_H = 34;
const MENU_BUTTON_GAP = 12;
const MENU_LAYOUT = { width: -1, height: -1, buttonW: 0, buttonH: MENU_BUTTON_H, gap: MENU_BUTTON_GAP, x: 0, tops: [0, 0] };
const MENU_FRAME = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

/** Shared by drawing and hit-testing so they never drift. */
export const layoutMainMenu = (width, height) => {
  const L = MENU_LAYOUT;
  if (L.width === width && L.height === height)
    return L;
  L.width = width;
  L.height = height;
  L.buttonW = Utils.clamp(width - 48, 200, 260);
  L.x = width / 2 - L.buttonW / 2;
  L.tops[0] = height / 2 + 36;
  L.tops[1] = L.tops[0] + MENU_BUTTON_H + MENU_BUTTON_GAP;
  return L;
};

const HINT_TITLE_STYLE = Object.freeze({ size: 11, align: 'left', alpha: 0.55, weight: 800, glow: 3 });
const HINT_KEY_STYLE = Object.freeze({ size: 10, align: 'center', alpha: 0.85, weight: 600, glow: 2 });
const HINT_KEY_COMPACT_STYLE = Object.freeze({ size: 8, align: 'center', alpha: 0.85, weight: 600, glow: 2 });
const HINT_LABEL_STYLE = Object.freeze({ size: 10, align: 'left', alpha: 0.72, weight: 500, glow: 0 });

const HINTS_LAYOUT = {
  width: 0,
  height: 0,
  hintsRef: null,
  cols: 1,
  totalH: 0,
  colPositions: [0, 0, 0, 0],
  colWidths: [0, 0, 0, 0],
  groupOffsetsY: [0, 0, 0, 0],
  groupHeights: [0, 0, 0, 0],
};

const layoutHints = (hints, width, height) => {
  const H = HINTS_LAYOUT;
  if (H.hintsRef === hints && H.width === width && H.height === height)
    return H;
  H.hintsRef = hints;
  H.width = width;
  H.height = height;

  if (!Array.isArray(hints) || hints.length === 0) {
    H.cols = 1;
    H.totalH = 0;
    return H;
  }

  const rowHeight = 18;
  const headerHeight = 16;
  const numGroups = hints.length;
  for (let g = 0; g < numGroups; g++) {
    const rowCount = Array.isArray(hints[g]?.rows) ? hints[g].rows.length : 0;
    H.groupHeights[g] = headerHeight + rowCount * rowHeight;
  }

  if (width < 560) {
    H.cols = 1;
    const colW = Math.min(width - 32, 280);
    H.colWidths[0] = colW;
    H.colPositions[0] = -colW / 2;
    let currY = 0;
    for (let g = 0; g < numGroups; g++) {
      H.groupOffsetsY[g] = currY;
      currY += H.groupHeights[g] + 6;
    }
    H.totalH = currY > 0 ? currY - 6 : 0;
  } else {
    H.cols = Math.min(numGroups, 4);
    const colGap = 16;
    const maxTotalW = Math.min(width - 48, 720);
    const colW = Math.floor((maxTotalW - colGap * (H.cols - 1)) / H.cols);
    const totalW = colW * H.cols + colGap * (H.cols - 1);
    const startX = -totalW / 2;

    let maxColH = 0;
    for (let g = 0; g < H.cols; g++) {
      H.colWidths[g] = colW;
      H.colPositions[g] = startX + g * (colW + colGap);
      H.groupOffsetsY[g] = 0;
      if (H.groupHeights[g] > maxColH)
        maxColH = H.groupHeights[g];
    }
    H.totalH = maxColH;
  }

  return H;
};

export const layoutControls = (width, height) => {
  const L = CONTROLS_LAYOUT;
  L.boxW = Utils.clamp(width - 48, 360, 640);
  L.boxH = Math.max(CONTROLS_HEADER_H + CONTROLS_FOOTER_H + CONTROLS_ROW_H * 4, Math.min(height - 48, 760));
  L.boxX = width / 2 - L.boxW / 2;
  L.boxY = Math.max(8, (height - L.boxH) / 2);
  L.rowsTop = L.boxY + CONTROLS_TOP;
  L.footerTop = L.boxY + L.boxH - CONTROLS_FOOTER_H;
  L.visibleRows = Math.max(4, Math.floor((L.boxH - CONTROLS_HEADER_H - CONTROLS_FOOTER_H) / CONTROLS_ROW_H));
  L.nameX = L.boxX + 24;
  L.slot0X = L.boxX + L.boxW * 0.58;
  L.slot1X = L.boxX + L.boxW * 0.82;
  L.slotHalf = L.boxW * 0.11;
  L.resetX = L.boxX + L.boxW * 0.3;
  L.backX = L.boxX + L.boxW * 0.7;
  L.buttonY = L.footerTop + 58;
  L.labelsX = L.boxX + L.boxW / 2;
  L.labelsY = L.footerTop + 80;
  return L;
};

/**
 * Everything that is drawn flat on top of the 3D world: weapon, HUD, minimap and menus.
 * The line art is handed to RoostR through the overlay; this canvas only draws text and the dimming screens.
 */
export class Hud {
  constructor(canvas, overlay) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.ctx = canvas.getContext('2d');
    this.bloodQuads = createQuadTarget();
    this.width = 0;
    this.height = 0;
    this.ratio = 1;
    this.showMap = true;
    this.automap = false;
    this.useKeyLabel = defaultActionLabel('use');
    this.automapZoom = 1;
    this.automapFollow = true;
    this.automapGrid = true;
    this.fps = 0;
    this.diagnostics = '';
    this.lastHudTextKey = '';
    this.skipCanvasText = false;
    this.lastFont = '';
    this.lastAlign = '';
    this.controlHints = DEFAULT_HINT_LINES;
    this.selectHint = DEFAULT_SELECT_HINT;
    this.controlsView = null;
    this.controlsEntryText = 'CONTROLS · F1';
    this.controlsKeyLabel = 'F1';
    this.optionsText = 'OPTIONS · F1';
    this.mainMenuView = { cursor: 0, items: MAIN_MENU_ITEMS };
    this.unboundText = '';
    this.pauseKeyLabel = '';
    this.resumeText = RESUME_FALLBACK_TEXT;
    this.setPauseKeyLabel(defaultActionLabel('pause'));
  }

  setPauseKeyLabel(label) {
    if (label === this.pauseKeyLabel)
      return;
    this.pauseKeyLabel = label;
    this.resumeText = !label || label === 'UNBOUND' ? RESUME_FALLBACK_TEXT : `press ${label}, ENTER or click to resume`;
  }

  setControlsStatus(label, unboundCount) {
    this.controlsEntryText = `CONTROLS · ${label}`;
    this.controlsKeyLabel = label;
    this.optionsText = `OPTIONS · ${label}`;
    this.unboundText = unboundCount > 0 ? `${unboundCount} controls unbound — open CONTROLS` : '';
  }

  drawControlHints(cx, y) {
    const hints = this.controlHints;
    if (!Array.isArray(hints) || hints.length === 0)
      return 0;

    // Backward compatibility if hints are still an array of strings
    if (typeof hints[0] === 'string') {
      for (let i = 0; i < hints.length; i++)
        this.text(hints[i], cx, y + i * 20, BLUE, i === 5 ? HINT_DIM_STYLE : HINT_STYLE);
      return hints.length * 20;
    }

    const L = layoutHints(hints, this.width, this.height);
    const rowH = 18;
    const headerH = 16;
    const capPadX = 3;
    const capH = 14;

    for (let g = 0; g < hints.length; g++) {
      const group = hints[g];
      const colIdx = L.cols === 1 ? 0 : g;
      const colX = cx + L.colPositions[colIdx];
      const colW = L.colWidths[colIdx];
      const groupY = y + L.groupOffsetsY[g];

      this.text(group.title, colX, groupY + 12, BLUE, HINT_TITLE_STYLE);

      const rows = group.rows;
      if (!Array.isArray(rows))
        continue;

      const keyW = Utils.clamp(Math.floor(colW * 0.44), 36, 90);
      const labelX = colX + keyW + 6;

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const ry = groupY + headerH + r * rowH;
        const capBoxX = colX;
        const capBoxY = ry + 2;

        this.canvasLine(controlsRect(capBoxX, capBoxY, capBoxX + keyW, capBoxY + capH), BLUE, 0.35, 1, 3);

        const keysText = row.keys ?? '';
        const keyColor = keysText === 'UNBOUND' ? RED : BLUE;
        const keyStyle = keysText.length > 10 ? HINT_KEY_COMPACT_STYLE : HINT_KEY_STYLE;
        this.text(keysText, capBoxX + keyW / 2, ry + 12, keyColor, keyStyle);

        this.text(row.label ?? '', labelX, ry + 12, BLUE, HINT_LABEL_STYLE);
      }
    }

    return L.totalH;
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
    this.lastHudTextKey = '';
    this.lastFont = '';
    this.lastAlign = '';
  }

  computeHudTextKey(game, showAutomap) {
    if (game.state !== 'play' || showAutomap)
      return '';
    if (game.message && game.message.age < game.message.life)
      return '';
    const p = game.player;
    if ((p.ammoFlash?.bullets ?? 0) > 0 || (p.ammoFlash?.shells ?? 0) > 0 || (p.ammoFlash?.rockets ?? 0) > 0)
      return '';
    const radKey = (p.radSuit ?? 0) > 0 ? `${Math.ceil(p.radSuit)}:${p.radSuit > 5 || Math.floor(p.radSuit * 4) % 2 === 0 ? 1 : 0}` : '0';
    const bat = p.nightVisionBattery ?? 0;
    const nvgActive = Boolean(p.nightVisionActive && bat > 0);
    const nvgKey = p.hasNightVision
      ? `${Math.round((bat / 45) * 100)}:${nvgActive ? 1 : 0}:${!nvgActive || bat > 5 || Math.floor(bat * 4) % 2 === 0 ? 1 : 0}`
      : '0';
    const w = p.weapons;
    const wMask = (w?.chainsaw || w?.knife ? 1 : 0) | (w?.shotgun ? 2 : 0) | (w?.chaingun ? 4 : 0) | (w?.rocket ? 8 : 0);
    return `${this.width}|${this.height}|${this.ratio}|${Math.round(this.fps)}|${this.diagnostics}|${Math.ceil(p.health)}|${Math.max(0, Math.ceil(p.armor ?? 0))}|${p.armorType ?? ''}|${p.weapon ?? 'shotgun'}|${wMask}|${p.berserk ? 1 : 0}|${radKey}|${nvgKey}|${p.bullets ?? 0}|${p.shells ?? 0}|${p.rockets ?? 0}|${game.kills}|${game.totalEnemies}|${this.useKeyLabel}|${game.usePrompt?.verb ?? ''}|${Math.round((game.usePrompt?.fade ?? 0) * 20)}`;
  }

  render(game) {
    const { ctx, width, height } = this;
    const showAutomap = this.automap && game.state !== 'title' && game.state !== 'cleared';
    game.automap = showAutomap;
    const isBrowserCanvas = typeof HTMLCanvasElement !== 'undefined' && this.canvas instanceof HTMLCanvasElement;
    const hudTextKey = isBrowserCanvas ? this.computeHudTextKey(game, showAutomap) : '';
    const skipText = Boolean(hudTextKey && hudTextKey === this.lastHudTextKey);
    this.skipCanvasText = skipText;
    if (!skipText) {
      this.lastHudTextKey = hudTextKey;
      // reapplied when redrawing text: the browser can reset canvas state behind our back
      ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      this.lastFont = '';
      this.lastAlign = '';
    }
    this.overlay.clear();
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
    else if (!showAutomap)
      this.text(`${Math.round(this.fps)} FPS`, 28, 26, GREEN, { size: 12, alpha: 0.8 });
    this.skipCanvasText = false;
  }

  /** A polyline of Vec2 points in the glowing layer: it goes through the same neon pass as the 3D world. */
  line(points, color, alpha = 1) {
    this.overlay?.glow?.line(points, RGB[color], alpha);
  }

  /** One segment in the glowing layer, from scalar coordinates. */
  segment(x0, y0, x1, y1, color, alpha = 1) {
    this.overlay?.glow?.line(segmentPoints(x0, y0, x1, y1), RGB[color], alpha);
  }

  /** A closed rectangle outline in the glowing layer: top-left corner, size. */
  rect(x0, y0, w, h, color, alpha = 1) {
    const x1 = x0 + w;
    const y1 = y0 + h;
    RECT_V[0].setScalar(x0, y0); RECT_V[1].setScalar(x1, y0); RECT_V[2].setScalar(x1, y1);
    RECT_V[3].setScalar(x0, y1); RECT_V[4].setScalar(x0, y0);
    this.overlay?.glow?.line(RECT_V, RGB[color], alpha);
  }

  /** A polyline on the canvas, for the few frames that must sit above the dimming screens. */
  canvasLine(points, color, alpha = 1, width = 1.5, glow = 8) {
    const { ctx } = this;
    ctx.beginPath();
    for (let i = 0; i < points.length; i += 2)
      if (i === 0)
        ctx.moveTo(points[i], points[i + 1]);
      else
        ctx.lineTo(points[i], points[i + 1]);
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
    if (this.skipCanvasText)
      return;
    const { ctx } = this;
    const font = `${weight} ${size}px ${FONT}`;
    if (this.lastFont !== font) {
      ctx.font = font;
      this.lastFont = font;
    }
    if (this.lastAlign !== align) {
      ctx.textAlign = align;
      this.lastAlign = align;
    }
    ctx.globalAlpha = alpha;
    const col = COLORS[color];
    ctx.fillStyle = col;
    if (glow > 0) {
      ctx.shadowColor = col;
      ctx.shadowBlur = glow;
    }
    ctx.fillText(text, x, y);
    if (glow > 0)
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
    WEAPON_PLACE_OPTS.width = this.width;
    WEAPON_PLACE_OPTS.height = this.height;
    WEAPON_PLACE_OPTS.bob = player.bob;
    WEAPON_PLACE_OPTS.moving = player.moving;
    WEAPON_PLACE_OPTS.recoil = player.recoil;
    WEAPON_PLACE_OPTS.switchOffset = switchOffset;
    const placed = weaponPlacement(WEAPON_PLACE_OPTS, WEAPON_RECT);
    setRectEdges(WEAPON_QUAD, placed.x0, placed.y0, placed.x1, placed.y1);
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
    this.overlay.crisp.weapon.quad(WEAPON_QUAD, weaponCellUv(frame, weapon), 1);
  }

  /** Blood on the player's view: always translucent on the visor so the 3D world remains visible behind it. */
  drawBlood(game) {
    scratchBloodViewport.setScalar(this.width, this.height);
    const { sprites } = this.overlay.crisp;
    for (const splat of game.blood.splats) {
      const fade = Utils.clamp((splat.life - splat.age) / (splat.life * 0.6), 0, 1) * SCREEN_BLOOD_ALPHA;
      scratchBloodSplat.pos.setScalar(splat.x, splat.y);
      scratchBloodSplat.size = splat.size;
      scratchBloodSplat.age = splat.age;
      scratchBloodSplat.drip = splat.drip;
      scratchBloodSplat.seed = splat.seed;
      const target = screenSplatQuads(scratchBloodSplat, scratchBloodViewport, fade, this.bloodQuads);
      for (let i = 0; i < target.count; i++) {
        const q = target.quads[i];
        sprites.quad(setRectEdges(BLOOD_QUAD, q.x0, q.y0, q.x1, q.y1), q.uv, q.fade);
      }
    }
  }

  drawBar(x, y, w, ticks, value, color, lowColor, critColor = lowColor, lowThreshold = 0.5, critThreshold = 0.3) {
    const gap = w / ticks;
    const lit = Math.ceil(value * ticks);
    const activeColor = value <= critThreshold ? critColor : value <= lowThreshold ? lowColor : color;
    for (let i = 0; i < ticks; i++) {
      const on = i < lit;
      this.segment(x + i * gap, y, x + i * gap, y - 16, on ? activeColor : BLUE, on ? 1 : 0.22);
    }
  }

  /** Discreet keycap under the crosshair telling the player which key uses the door or chest in reach. */
  drawUsePrompt(game, cx, cy) {
    const prompt = game.usePrompt;
    if (!prompt || game.state !== 'play' || game.automap || this.controlsView?.open || prompt.fade <= USE_PROMPT_EPSILON)
      return;
    const label = this.useKeyLabel;
    const w = Math.max(USE_PROMPT_H, label.length * USE_PROMPT_CHAR_W + USE_PROMPT_PAD * 2);
    const x0 = cx - w / 2;
    const y0 = cy + USE_PROMPT_TOP;
    const locked = prompt.verb === 'LOCKED' && USE_LOCK_COLOR[prompt.lock] !== undefined;
    const color = locked ? USE_LOCK_COLOR[prompt.lock] : GREEN;
    this.overlay.crisp.rectLine(setRect(Math.round(x0) + 0.5, Math.round(y0) + 0.5, Math.round(w), USE_PROMPT_H), RGB[color], USE_PROMPT_FRAME_ALPHA * prompt.fade);
    USE_LABEL_STYLE.alpha = USE_PROMPT_LABEL_ALPHA * prompt.fade;
    USE_VERB_STYLE.alpha = USE_PROMPT_VERB_ALPHA * prompt.fade;
    this.text(label, cx, y0 + USE_PROMPT_H / 2 + 4, color, USE_LABEL_STYLE);
    this.text(prompt.verb, cx, y0 + USE_PROMPT_H + 12, color, USE_VERB_STYLE);
  }

  drawHud(game) {
    const { width, height } = this;
    const player = game.player;
    if (game.state === 'title' || game.state === 'cleared')
      return;

    // crosshair and hit marker
    const cx = width / 2;
    const cy = height / 2;
    this.segment(cx - 10, cy, cx - 4, cy, GREEN, 0.9);
    this.segment(cx + 4, cy, cx + 10, cy, GREEN, 0.9);
    this.segment(cx, cy - 10, cx, cy - 4, GREEN, 0.9);
    this.segment(cx, cy + 4, cx, cy + 10, GREEN, 0.9);
    if (player.hitMarker > 0) {
      const m = 12 + (0.15 - player.hitMarker) * 70;
      this.segment(cx - m, cy - m, cx - m / 2, cy - m / 2, ORANGE);
      this.segment(cx + m, cy - m, cx + m / 2, cy - m / 2, ORANGE);
      this.segment(cx - m, cy + m, cx - m / 2, cy + m / 2, ORANGE);
      this.segment(cx + m, cy + m, cx + m / 2, cy + m / 2, ORANGE);
    }

    this.drawUsePrompt(game, cx, cy);

    FACE_VIEWPORT.setScalar(width, height);
    const faceRect = facePlacement(FACE_VIEWPORT, player.hurt, FACE_PLACEMENT).rect;
    const faceTL = faceRect.topLeftCorner;
    const faceBR = faceRect.bottomRightCorner;
    const weaponDef = WEAPONS[player.weapon ?? 'shotgun'] ?? WEAPONS.shotgun;
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
    crisp.fillRect(setRect(faceTL.x - 4, faceTL.y - 4, faceBR.x - faceTL.x + 8, faceBR.y - faceTL.y + 8), portraitBackdrop(player));
    crisp.rectLine(setRect(faceTL.x - 4.5, faceTL.y - 4.5, faceBR.x - faceTL.x + 9, faceBR.y - faceTL.y + 9), borderCol, player.hurt > 0 || (player.berserkTimer ?? 0) > 0 || (player.soulFlash ?? 0) > 0 || (player.teleFlash ?? 0) > 0 ? 0.85 : 0.45);
    this.drawPortraitWall(faceRect);
    if (game.state !== 'paused')
      this.overlay.head?.update(player, game.time);
    this.overlay.head?.place(faceRect);

    const base = height - 28;
    const hx = faceBR.x + 18;
    const overcharged = player.health > 100;
    const healthCol = overcharged ? BLUE : player.health <= 30 ? RED : player.health <= 50 ? ORANGE : GREEN;
    this.text(overcharged ? 'SOUL' : 'HEALTH', hx, base - 24, BLUE, { size: 11, alpha: 0.8 });
    this.drawBar(hx, base, 160, 20, Utils.clamp(player.health / 100, 0, 1), GREEN, ORANGE, RED, 0.5, 0.3);
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
        this.rect(8, 8, width - 16, height - 16, GREEN, a);
      }
    }

    if (player.nightVisionActive && (player.nightVisionBattery ?? 0) > 0) {
      const blink = player.nightVisionBattery > 5 || Math.floor(player.nightVisionBattery * 4) % 2 === 0;
      if (blink) {
        const a = Math.min(0.72, 0.32 + (player.nightVisionBattery / 45) * 0.35);
        this.rect(12, 12, width - 24, height - 24, GREEN, a);
      }
    }

    if ((player.soulFlash ?? 0) > 0) {
      const a = Math.min(1, player.soulFlash / 0.5);
      for (let i = 0; i < 3; i++) {
        const inset = 5 + i * 7;
        this.rect(inset, inset, width - 2 * inset, height - 2 * inset, BLUE, a * (0.85 - i * 0.25));
      }
    }

    if ((player.berserkTimer ?? 0) > 0) {
      const pulse = 0.55 + 0.45 * Math.sin(game.time * 7);
      const fade = Math.min(1, player.berserkTimer / 3);
      const a = fade * (0.28 + 0.32 * pulse);
      for (let i = 0; i < 2; i++) {
        const inset = 5 + i * 6;
        this.rect(inset, inset, width - 2 * inset, height - 2 * inset, RED, a * (1 - i * 0.35));
      }
    }

    if (player.radFlash > 0) {
      const a = Math.min(1, player.radFlash / 0.35);
      for (let i = 0; i < 3; i++) {
        const inset = 6 + i * 7;
        this.rect(inset, inset, width - 2 * inset, height - 2 * inset, GREEN, a * (0.75 - i * 0.22));
      }
    }

    if (player.hurt > 0) {
      const a = Math.min(1, player.hurt / 0.3);
      for (let i = 0; i < 3; i++) {
        const inset = 4 + i * 7;
        this.rect(inset, inset, width - 2 * inset, height - 2 * inset, ORANGE, a * (0.8 - i * 0.25));
      }
    }
  }

  /** Active supercharge powerup badges (BERSERK 4x melee, RAD SUIT countdown & NVG battery). */
  drawPowerups(x, base, player) {
    let offset = 0;
    if (player.berserk) {
      this.text('BERSERK', x, base - 24 + offset, RED, { size: 11, weight: 700, alpha: 0.95 });
      offset += 14;
    }
    if ((player.radSuit ?? 0) > 0) {
      const blink = player.radSuit > 5 || Math.floor(player.radSuit * 4) % 2 === 0;
      this.text(`RAD ${Math.ceil(player.radSuit)}s`, x, base - 24 + offset, GREEN, {
        size: 11,
        weight: 700,
        alpha: blink ? 0.95 : 0.3,
      });
      offset += 14;
    }
    if (player.hasNightVision) {
      const bat = player.nightVisionBattery ?? 0;
      const pct = Math.min(100, Math.max(0, Math.round((bat / 45) * 100)));
      const active = Boolean(player.nightVisionActive && bat > 0);
      const blink = !active || bat > 5 || Math.floor(bat * 4) % 2 === 0;
      this.text(`NVG ${pct}%`, x, base - 24 + offset, active ? GREEN : BLUE, {
        size: 11,
        weight: 700,
        alpha: active ? (blink ? 0.95 : 0.3) : 0.72,
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
      this.rect(sx, sy, 16, 16, col, active ? 1 : owned ? 0.8 : 0.24);
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
    for (let i = 0; i < KEYCARD_SLOTS.length; i++) {
      const [name, col] = KEYCARD_SLOTS[i];
      const held = Boolean(keys?.[name]);
      const kx = x + i * 24;
      const ky = base - 16;
      const kw = 16;
      const kh = 16;
      // notched security badge outline
      const badgeAlpha = held ? 1 : 0.24;
      this.segment(kx, ky, kx + kw - 4, ky, col, badgeAlpha);
      this.segment(kx + kw - 4, ky, kx + kw, ky + 4, col, badgeAlpha);
      this.segment(kx + kw, ky + 4, kx + kw, ky + kh, col, badgeAlpha);
      this.segment(kx + kw, ky + kh, kx, ky + kh, col, badgeAlpha);
      this.segment(kx, ky + kh, kx, ky, col, badgeAlpha);
      if (held) {
        // inner chip & magnetic stripe when the keycard is held
        this.segment(kx + 3, ky + 5, kx + kw - 3, ky + 5, col, 0.95);
        this.segment(kx + 3, ky + 9, kx + 9, ky + 9, col, 0.95);
        this.segment(kx + 9, ky + 9, kx + 9, ky + 13, col, 0.95);
        this.segment(kx + 9, ky + 13, kx + 3, ky + 13, col, 0.95);
        this.segment(kx + 3, ky + 13, kx + 3, ky + 9, col, 0.95);
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
  /**
   * The wall behind the portrait: a plain bulkhead panel at the foot, a pipe run above it, at the texels' true proportions,
   * drawn see-through so the state's backdrop colour tints it.
   */
  drawPortraitWall(faceRect) {
    const wall = this.overlay.crisp.wall;
    if (!wall)
      return;
    const tl = faceRect.topLeftCorner;
    const br = faceRect.bottomRightCorner;
    const w = br.x - tl.x;
    const pieceH = Math.min(w, br.y - tl.y);
    const topH = br.y - tl.y - pieceH;
    wall.quad(setRectEdges(WALL_LOWER, tl.x, br.y - pieceH, br.x, br.y), wallCellUv(WALL_CELLS.plain), WALL_ALPHA);
    if (topH > 0.5) {
      // the top part of a pipe panel, as much of it as fits
      wall.quad(setRectEdges(WALL_UPPER, tl.x, tl.y, br.x, tl.y + topH), wallCellUv(WALL_CELLS.pipes, 1 - topH / w, 1), WALL_ALPHA);
    }
  }

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
    const activeSize = activeFlash > 0 ? 20 + Math.round(Math.sin(activeFlashNorm * Trigo.pi) * 6) : 20;
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
      this.rect(rightX - 154, base - 21, 64, 26, activeCol, 0.35 + 0.55 * activeFlashNorm);
    }

    for (let i = 0; i < AMMO_POOL_KEYS.length; i++) {
      const [key, def] = AMMO_POOL_KEYS[i];
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
        this.rect(rightX - 86, rowY - 9, 90, 11, flashCol, 0.35 + 0.55 * flashNorm);
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
    const s = Utils.clamp(Math.floor(Math.min(maxW / level.width, maxH / level.rowCount)), 3, 7);
    const mw = level.width * s;
    const mh = level.rowCount * s;
    const ox = width - mw - 20;
    const oy = 44;

    layer.fillRect(setRect(ox - 6, oy - 6, mw + 12, mh + 12), BACKGROUND_RGB);
    layer.rectLine(setRect(ox - 6.5, oy - 6.5, mw + 13, mh + 13), RGB[BLUE], 0.25);

    // fog of war: only tiles that have been seen are drawn, and the ones in view right now are brighter
    const fog = game.fog;
    const exploredArr = fog.explored;
    const visibleArr = fog.visible;
    const kindArr = level.kind;
    const heightsArr = level.heights;
    const halfS = s * 0.5 - 0.5;
    const boxS = Math.max(1, s - 1);
    for (let y = 0; y < level.rowCount; y++) {
      const rowOffset = y * level.width;
      const rowY = oy + y * s;
      for (let x = 0; x < level.width; x++) {
        const idx = rowOffset + x;
        if (exploredArr ? exploredArr[idx] !== 1 : !fog.isExplored(idx))
          continue;
        const visible = visibleArr ? visibleArr[idx] === 1 : fog.isVisible(idx);
        const colX = ox + x * s;
        const k = kindArr[idx];
        if (!k || heightsArr[idx] <= 0) {
          if (level.teleporter?.[idx] === 1) {
            layer.rectLine(setRect(colX + 0.5, rowY + 0.5, boxS, boxS), RGB[GREEN], visible ? 0.95 : 0.65);
            continue;
          }
          const isSlime = level.slime?.[idx] === 1;
          const col = isSlime ? (visible ? SLIME_VISIBLE : SLIME_SEEN) : (visible ? FLOOR_VISIBLE : FLOOR_SEEN);
          layer.fillRect(setRect(colX + halfS, rowY + halfS, isSlime ? 1.5 : 1, isSlime ? 1.5 : 1), col);
          continue;
        }
        const doorObj = k === DOOR ? level.doors.get(idx) : null;
        const hiddenSecret = doorObj?.secret && !doorObj.revealed;
        const door = (k === DOOR && !hiddenSecret) || k === EXIT;
        const doorCol = doorObj?.lock === 'red'
          ? RGB[RED]
          : doorObj?.lock === 'yellow'
            ? RGB[ORANGE]
            : doorObj?.lock === 'blue'
              ? RGB[BLUE]
              : RGB[GREEN];
        if (!door && level.diag?.[idx] > 0) {
          const df = level.diagInfo(idx);
          const ax = ox + (df.a.x / TILE) * s;
          const ay = oy + (df.a.y / TILE) * s;
          const bx = ox + (df.b.x / TILE) * s;
          const by = oy + (df.b.y / TILE) * s;
          const sx = ox + (df.s.x / TILE) * s;
          const sy = oy + (df.s.y / TILE) * s;
          layerTriangle(layer, sx, sy, ax, ay, bx, by, RGB[BLUE], visible ? 0.9 : 0.35);
          continue;
        }
        layer.rectLine(setRect(colX + 0.5, rowY + 0.5, s - 1, s - 1), door ? doorCol : RGB[BLUE], door ? (visible ? 1 : 0.55) : (visible ? 0.9 : 0.35));
      }
    }

    // enemies only show while they are in view: the map is not a radar
    for (const enemy of game.enemies) {
      if (enemy.state === 'dead' || !fog.canSee(enemy.pos))
        continue;
      layer.fillRect(setRect(ox + (enemy.pos.x / TILE) * s - 1.5, oy + (enemy.pos.y / TILE) * s - 1.5, 3, 3), RGB[ORANGE]);
    }
    const player = game.player;
    const x = ox + (player.pos.x / TILE) * s;
    const y = oy + (player.pos.y / TILE) * s;
    layerSegment(layer, x, y, x + Math.cos(player.angle) * 9, y + Math.sin(player.angle) * 9, RGB[GREEN]);
    layer.circleLine(setCirc(x, y, 2.5), RGB[GREEN]);
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
    layer.fillRect(setRect(x0, y0, w, h), BACKGROUND_RGB);
    layer.rectLine(setRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1), RGB[BLUE], 0.48);
    layerSegment(layer, x0, y0 + headerH, x1, y0 + headerH, RGB[BLUE], 0.3);
    layerSegment(layer, x0, y1 - footerH, x1, y1 - footerH, RGB[BLUE], 0.3);

    const arm = 14;
    this.canvasLine(cornerBracket(x0 - 2, y0 + arm, x0 - 2, y0 - 2, x0 + arm, y0 - 2), GREEN, 0.9, 2, 8);
    this.canvasLine(cornerBracket(x1 - arm, y0 - 2, x1 + 2, y0 - 2, x1 + 2, y0 + arm), GREEN, 0.9, 2, 8);
    this.canvasLine(cornerBracket(x0 - 2, y1 - arm, x0 - 2, y1 + 2, x0 + arm, y1 + 2), GREEN, 0.9, 2, 8);
    this.canvasLine(cornerBracket(x1 - arm, y1 + 2, x1 + 2, y1 + 2, x1 + 2, y1 - arm), GREEN, 0.9, 2, 8);

    // map viewport and zoom/pan coordinate transform
    const mapX0 = x0 + 10;
    const mapY0 = y0 + headerH + 8;
    const mapW = Math.max(60, w - 20);
    const mapH = Math.max(60, h - headerH - footerH - 16);
    const baseScale = Utils.clamp(Math.min(mapW / level.width, mapH / level.rowCount) * 0.88, 6, 22);
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
          layerSegment(layer, lx, gyMin, lx, gyMax, RGB[BLUE], gx % 4 === 0 ? 0.14 : 0.06);
      }
      for (let gy = 0; gy <= level.rowCount; gy++) {
        const ly = oy + gy * s;
        if (ly >= mapY0 && ly <= mapY0 + mapH && gxMax > gxMin)
          layerSegment(layer, gxMin, ly, gxMax, ly, RGB[BLUE], gy % 4 === 0 ? 0.14 : 0.06);
      }
    }

    // explored architecture: boundary walls, elevation steps, doors, secrets, slime, and exit portal
    for (let y = 0; y < level.rowCount; y++)
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
            layer.rectLine(setRect(tx + 1.5, ty + 1.5, Math.max(2, s - 3), Math.max(2, s - 3)), RGB[GREEN], visible ? 0.95 : 0.72);
            layer.circleLine(setCirc(tx + s * 0.5, ty + s * 0.5, Math.max(1.5, s * 0.28)), RGB[BLUE], visible ? 0.85 : 0.55);
            this.text('T', tx + s * 0.5, ty + s * 0.5 + 3, GREEN, { size: Utils.clamp(Math.floor(s * 0.55), 8, 11), align: 'center', weight: 800, glow: 5 });
          } else if (isSlime) {
            layer.fillRect(setRect(tx + 1.5, ty + 1.5, Math.max(1, s - 3), Math.max(1, s - 3)), visible ? SLIME_VISIBLE : SLIME_SEEN);
            layerSegment(layer, tx + 2, ty + s - 2, tx + s - 2, ty + 2, RGB[GREEN], visible ? 0.55 : 0.3);
          } else
            layer.fillRect(setRect(tx + s * 0.5 - 0.5, ty + s * 0.5 - 0.5, 1.5, 1.5), visible ? FLOOR_VISIBLE : FLOOR_SEEN);
          if (game.discoveredSecrets?.has(idx)) {
            layer.rectLine(setRect(tx + 2, ty + 2, Math.max(2, s - 4), Math.max(2, s - 4)), RGB[ORANGE], 0.8);
            this.text('S', tx + s * 0.5, ty + s * 0.5 + 3, ORANGE, { size: Utils.clamp(Math.floor(s * 0.6), 8, 12), align: 'center', weight: 800, glow: 5 });
          }
          continue;
        }

        const doorObj = kind === DOOR ? level.doors.get(idx) : null;
        const hiddenSecret = doorObj?.secret && !doorObj.revealed;
        if (kind === EXIT) {
          layer.rectLine(setRect(tx + 1, ty + 1, s - 2, s - 2), RGB[GREEN], 0.95);
          layerSegment(layer, tx + 2, ty + 2, tx + s - 2, ty + s - 2, RGB[ORANGE], 0.85);
          layerSegment(layer, tx + s - 2, ty + 2, tx + 2, ty + s - 2, RGB[ORANGE], 0.85);
          this.text('X', tx + s * 0.5, ty + s * 0.5 + 3, GREEN, { size: Utils.clamp(Math.floor(s * 0.55), 8, 11), align: 'center', weight: 800, glow: 6 });
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
          layer.rectLine(setRect(tx + 1, ty + 1, s - 2, s - 2), doorCol, alpha);
          const closed = 1 - (doorObj?.open ?? 0);
          if (closed > 0.05 && isSecret)
            layerSegment(layer, tx + 2, ty + s * 0.5, tx + 2 + (s - 4) * closed, ty + s * 0.5, doorCol, alpha);
          else if (closed > 0.05 && doorObj?.alongY) {
            layerSegment(layer, tx + 2, ty + s * 0.28, tx + 2 + (s - 4) * closed, ty + s * 0.28, doorCol, alpha);
            layerSegment(layer, tx + 2, ty + s * 0.72, tx + 2 + (s - 4) * closed, ty + s * 0.72, doorCol, alpha);
          } else if (closed > 0.05) {
            layerSegment(layer, tx + s * 0.28, ty + 2, tx + s * 0.28, ty + 2 + (s - 4) * closed, doorCol, alpha);
            layerSegment(layer, tx + s * 0.72, ty + 2, tx + s * 0.72, ty + 2 + (s - 4) * closed, doorCol, alpha);
          }
          if (isSecret)
            this.text('S', tx + s * 0.5, ty + s * 0.5 + 3, ORANGE, { size: Utils.clamp(Math.floor(s * 0.55), 8, 11), align: 'center', weight: 800, glow: 5 });
          continue;
        }

        if (kind === PILLAR || (hVal > 0 && hVal < CEILING)) {
          layer.rectLine(setRect(tx + 1.5, ty + 1.5, Math.max(2, s - 3), Math.max(2, s - 3)), RGB[ORANGE], visible ? 0.95 : 0.55);
          continue;
        }

        const edgeAlpha = visible ? 0.95 : 0.58;
        const isOpenNeighbor = (nx, ny, dir) => {
          if (nx < 0 || ny < 0 || nx >= level.width || ny >= level.rowCount)
            return false;
          const nIdx = ny * level.width + nx;
          if (level.diag?.[nIdx] > 0 && !level.hasCardinalFace?.(nIdx, dir ^ 2))
            return true;
          const nKind = level.kind[nIdx];
          if (!nKind || level.heights[nIdx] < CEILING || nKind === EXIT)
            return true;
          if (nKind === DOOR) {
            const nDoor = level.doors.get(nIdx);
            return !(nDoor?.secret && !nDoor.revealed);
          }
          return false;
        };

        if (level.diag?.[idx] > 0) {
          const df = level.diagInfo(idx);
          const ax = ox + (df.a.x / TILE) * s;
          const ay = oy + (df.a.y / TILE) * s;
          const bx = ox + (df.b.x / TILE) * s;
          const by = oy + (df.b.y / TILE) * s;
          const sx = ox + (df.s.x / TILE) * s;
          const sy = oy + (df.s.y / TILE) * s;
          layerTriangle(layer, sx, sy, ax, ay, bx, by, RGB[BLUE], visible ? 0.38 : 0.2);
          layerSegment(layer, ax, ay, bx, by, RGB[RED], edgeAlpha);
          if (level.hasCardinalFace(idx, 0) && isOpenNeighbor(x, y - 1, 0))
            layerSegment(layer, tx, ty + 0.5, tx + s, ty + 0.5, RGB[RED], edgeAlpha);
          if (level.hasCardinalFace(idx, 2) && isOpenNeighbor(x, y + 1, 2))
            layerSegment(layer, tx, ty + s - 0.5, tx + s, ty + s - 0.5, RGB[RED], edgeAlpha);
          if (level.hasCardinalFace(idx, 3) && isOpenNeighbor(x - 1, y, 3))
            layerSegment(layer, tx + 0.5, ty, tx + 0.5, ty + s, RGB[RED], edgeAlpha);
          if (level.hasCardinalFace(idx, 1) && isOpenNeighbor(x + 1, y, 1))
            layerSegment(layer, tx + s - 0.5, ty, tx + s - 0.5, ty + s, RGB[RED], edgeAlpha);
          continue;
        }

        // full-height wall (or unrevealed secret door disguised as a normal wall):
        // subtle blue block outline + classic Doom red vector boundary lines against open space
        layer.rectLine(setRect(tx + 0.5, ty + 0.5, s - 1, s - 1), RGB[BLUE], visible ? 0.38 : 0.2);
        if (isOpenNeighbor(x, y - 1, 0))
          layerSegment(layer, tx, ty + 0.5, tx + s, ty + 0.5, RGB[RED], edgeAlpha);
        if (isOpenNeighbor(x, y + 1, 2))
          layerSegment(layer, tx, ty + s - 0.5, tx + s, ty + s - 0.5, RGB[RED], edgeAlpha);
        if (isOpenNeighbor(x - 1, y, 3))
          layerSegment(layer, tx + 0.5, ty, tx + 0.5, ty + s, RGB[RED], edgeAlpha);
        if (isOpenNeighbor(x + 1, y, 1))
          layerSegment(layer, tx + s - 0.5, ty, tx + s - 0.5, ty + s, RGB[RED], edgeAlpha);
      }

    // ceiling crushers on explored tiles
    if (level.crushers)
      for (const crusher of level.crushers) {
        if (!fog.isExplored(crusher.idx))
          continue;
        const cx = ox + crusher.x * s;
        const cy = oy + crusher.y * s;
        if (cx + s < mapX0 || cx > mapX0 + mapW || cy + s < mapY0 || cy > mapY0 + mapH)
          continue;
        layer.rectLine(setRect(cx + 2, cy + 2, Math.max(2, s - 4), Math.max(2, s - 4)), RGB[RED], 0.8);
        layerSegment(layer, cx + 2, cy + 2, cx + s - 2, cy + s - 2, RGB[ORANGE], 0.75);
        layerSegment(layer, cx + s - 2, cy + 2, cx + 2, cy + s - 2, RGB[ORANGE], 0.75);
      }

    // uncollected keycards and high-value pickups on explored tiles
    if (game.pickups)
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
        const isMajor = isKey || kind === 'soulsphere' || kind === 'berserk' || kind === 'radsuit' || kind === 'nightvision' || kind === 'megaArmor' || kind === 'shotgun' || kind === 'chaingun' || kind === 'rocketLauncher';
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
        layerDiamond(layer, sx, sy, r, col, 0.95);
      }

    // supply chests on explored tiles: weapon chests stand out, emptied ones fade
    const caches = game.caches ?? EMPTY_CACHES;
    for (let i = 0; i < caches.length; i++) {
      const cache = caches[i];
      if (!fog.isExplored(cache.idx))
        continue;
      const sx = ox + (cache.pos.x / TILE) * s;
      const sy = oy + (cache.pos.y / TILE) * s;
      if (sx < mapX0 || sx > mapX0 + mapW || sy < mapY0 || sy > mapY0 + mapH)
        continue;
      const emptied = cache.state === 'emptied';
      const major = cache.hasWeapon && !emptied;
      const r = Math.max(2.5, s * 0.22) * (major ? 1.25 : 1);
      layer.rectLine(setRect(sx - r, sy - r, 2 * r, 2 * r), major ? RGB[ORANGE] : RGB[GREEN], major ? 0.95 : emptied ? 0.3 : 0.85);
    }

    // visible enemies (only while currently in line-of-sight)
    for (const enemy of game.enemies) {
      if (enemy.state === 'dead' || !fog.canSee(enemy.pos))
        continue;
      const ex = ox + (enemy.pos.x / TILE) * s;
      const ey = oy + (enemy.pos.y / TILE) * s;
      if (ex < mapX0 || ex > mapX0 + mapW || ey < mapY0 || ey > mapY0 + mapH)
        continue;
      const r = Math.max(3, s * 0.24);
      layerDiamond(layer, ex, ey, r, RGB[ORANGE], 0.95);
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
      layerSegment(layer, px, py, px + Math.cos(a - 0.62) * coneLen, py + Math.sin(a - 0.62) * coneLen, RGB[GREEN], 0.22);
      layerSegment(layer, px, py, px + Math.cos(a + 0.62) * coneLen, py + Math.sin(a + 0.62) * coneLen, RGB[GREEN], 0.22);

      const arrowR = Utils.clamp(s * 0.65, 6, 13);
      const tipX = px + cos * arrowR * 1.25;
      const tipY = py + sin * arrowR * 1.25;
      const tailX = px - cos * arrowR * 0.95;
      const tailY = py - sin * arrowR * 0.95;
      // main shaft
      layerSegment(layer, tailX, tailY, tipX, tipY, RGB[GREEN], 1);
      // arrowhead barbs
      const headBackX = tipX - cos * arrowR * 0.75;
      const headBackY = tipY - sin * arrowR * 0.75;
      const wing = arrowR * 0.52;
      layerPoly3(layer, headBackX + perpX * wing, headBackY + perpY * wing, tipX, tipY, headBackX - perpX * wing, headBackY - perpY * wing, RGB[GREEN], 1);
      // classic Doom tail fletching
      const fletchX = tailX + cos * arrowR * 0.35;
      const fletchY = tailY + sin * arrowR * 0.35;
      const fWing = arrowR * 0.38;
      layerPoly3(layer, fletchX + perpX * fWing, fletchY + perpY * fWing, tailX, tailY, fletchX - perpX * fWing, fletchY - perpY * fWing, RGB[GREEN], 0.9);
    }

    // header telemetry: sector code/name + live KILLS / ITEMS / SECRETS / TIME
    const levelMeta = LEVELS[game.levelIndex] ?? {};
    const code = level.code ?? levelMeta.code ?? `E1M${(game.levelIndex ?? 0) + 1}`;
    const name = (level.name ?? levelMeta.name ?? 'HANGAR').toUpperCase();
    this.text(`${code} · ${name} — TACTICAL AUTOMAP`, x0 + 14, y0 + 20, BLUE, { size: 13, weight: 800, glow: 8 });

    const totalSec = Math.floor(game.stats?.time ?? 0);
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    const statsText = `KILLS ${game.kills ?? 0}/${game.totalEnemies ?? 0}   ITEMS ${game.itemsPicked ?? 0}/${game.totalItems ?? 0}   SECRETS ${game.secretsFound ?? 0}/${game.totalSecrets ?? 0}   TIME ${mins}:${secs}   FPS ${Math.round(this.fps)}`;
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
    const w = Utils.clamp(width - 48, 420, 620);
    const h = Utils.clamp(height - 48, 380, 470);
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
    const span = Math.min(230, w * 0.38);
    const nodes = [
      { x: cx - span, y: mapY + 10, code: 'E1M1', label: 'HANGAR' },
      { x: cx - span * 0.5, y: mapY - 14, code: 'E1M2', label: 'NUCLEAR PLANT' },
      { x: cx, y: mapY + 8, code: 'E1M3', label: 'TOXIN REFINERY' },
      { x: cx + span * 0.5, y: mapY - 12, code: 'E1M4', label: 'PHOBOS ANOMALY' },
      { x: cx + span, y: mapY + 10, code: 'E1M5', label: 'RED PLANET' },
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
      } else if (i === 3) {
        // E1M4 Phobos Anomaly star sanctum + portal ring
        this.canvasLine([n.x, n.y - 15, n.x + 15, n.y, n.x, n.y + 15, n.x - 15, n.y, n.x, n.y - 15], col, alpha, 1.5, 6);
        this.canvasLine([n.x - 11, n.y - 11, n.x + 11, n.y - 11, n.x + 11, n.y + 11, n.x - 11, n.y + 11, n.x - 11, n.y - 11], col, alpha * 0.85, 1.2, 4);
      } else {
        // E1M5 Red Planet Martian canyon ridge & howling dust storm
        this.canvasLine([n.x - 18, n.y + 12, n.x - 11, n.y - 10, n.x - 2, n.y + 2, n.x + 8, n.y - 13, n.x + 18, n.y + 12, n.x - 18, n.y + 12], col, alpha, 1.5, 6);
        this.canvasLine([n.x - 16, n.y - 6, n.x + 16, n.y - 6], col, alpha * 0.75, 1.2, 4);
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
    const boxW = Utils.clamp(this.width - 48, 280, 390);
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

  levelStepAt(pos) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const boxW = Utils.clamp(this.width - 48, 280, 390);
    const boxX = cx - boxW / 2;
    if (pos.x < boxX || pos.x > boxX + boxW || pos.y < cy + 88 || pos.y > cy + 124)
      return 0;
    return pos.x < cx ? -1 : 1;
  }

  controlsHitAt(pos) {
    const view = this.controlsView;
    if (!view?.open)
      return HIT_NONE;
    const L = layoutControls(this.width, this.height);
    if (pos.x < L.boxX || pos.x > L.boxX + L.boxW || pos.y < L.boxY || pos.y > L.boxY + L.boxH)
      return HIT_NONE;
    if (pos.y >= L.labelsY - 16 && pos.y <= L.labelsY + 6)
      return Math.abs(pos.x - L.labelsX) <= CONTROLS_LABELS_HALF_W ? HIT_LABELS : HIT_NONE;
    if (pos.y >= L.buttonY - 16 && pos.y <= L.buttonY + 6) {
      if (Math.abs(pos.x - L.resetX) <= CONTROLS_BUTTON_HALF_W)
        return HIT_RESET_ALL;
      if (Math.abs(pos.x - L.backX) <= CONTROLS_BUTTON_HALF_W)
        return HIT_BACK;
      return HIT_NONE;
    }
    if (pos.x >= L.boxX + L.boxW - CONTROLS_CUE_W) {
      if (pos.y >= L.rowsTop - 16 && pos.y < L.rowsTop && view.scroll > 0)
        return HIT_SCROLL_UP;
      if (pos.y >= L.footerTop - 16 && pos.y < L.footerTop && view.scroll + L.visibleRows < view.lines.length)
        return HIT_SCROLL_DOWN;
    }
    if (pos.y < L.rowsTop || pos.y >= L.rowsTop + L.visibleRows * CONTROLS_ROW_H)
      return HIT_NONE;
    const line = view.scroll + Math.floor((pos.y - L.rowsTop) / CONTROLS_ROW_H);
    if (line >= view.lines.length || view.lines[line].kind !== 'action')
      return HIT_NONE;
    if (Math.abs(pos.x - L.slot0X) <= L.slotHalf)
      return line * 2;
    if (Math.abs(pos.x - L.slot1X) <= L.slotHalf)
      return line * 2 + 1;
    return HIT_NONE;
  }

  menuHitAt(pos) {
    const L = layoutMainMenu(this.width, this.height);
    if (pos.x < L.x || pos.x > L.x + L.buttonW)
      return -1;
    for (let i = 0; i < 2; i++)
      if (pos.y >= L.tops[i] && pos.y < L.tops[i] + L.buttonH)
        return i;
    return -1;
  }

  drawMainMenu() {
    const view = this.mainMenuView;
    if (!view)
      return;
    const L = layoutMainMenu(this.width, this.height);
    const cx = this.width / 2;
    const F = MENU_FRAME;
    for (let i = 0; i < view.items.length; i++) {
      const focus = view.cursor === i;
      const top = L.tops[i];
      const left = L.x;
      const right = L.x + L.buttonW;
      const bottom = top + L.buttonH;
      F[0] = left; F[1] = top; F[2] = right; F[3] = top; F[4] = right; F[5] = bottom;
      F[6] = left; F[7] = bottom; F[8] = left; F[9] = top;
      this.canvasLine(F, focus ? ORANGE : BLUE, focus ? 0.85 : 0.45, 1.5, focus ? 10 : 4);
      const label = i === 1 ? this.optionsText : view.items[i].label;
      this.text(label, cx, top + 22, focus ? ORANGE : GREEN, { size: 14, align: 'center', weight: focus ? 800 : 600, alpha: focus ? 1 : 0.8, glow: focus ? 10 : 3 });
      if (focus) {
        this.text('▸', left + 14, top + 22, ORANGE, { size: 14, align: 'center', glow: 8 });
        this.text('◂', right - 14, top + 22, ORANGE, { size: 14, align: 'center', glow: 8 });
      }
    }
  }

  controlsButtonAt(pos, game) {
    if (game.state !== 'paused')
      return false;
    const dy = CONTROLS_ENTRY_PAUSED_DY;
    const cx = this.width / 2;
    const cy = this.height / 2;
    return Math.abs(pos.x - cx) <= 110 && pos.y >= cy + dy - 14 && pos.y <= cy + dy + 6;
  }

  drawControls(view, game) {
    const L = layoutControls(this.width, this.height);
    view.visibleRows = L.visibleRows;
    const { boxX, boxY, boxW, boxH, rowsTop, footerTop } = L;
    const right = boxX + boxW;
    const bottom = boxY + boxH;
    this.canvasLine(controlsRect(boxX, boxY, right, bottom), BLUE, 0.45, 1.5, 8);
    const arm = 12;
    this.canvasLine(controlsSeg(boxX - 3, boxY + arm, boxX - 3, boxY - 3), GREEN, 0.85, 2, 8);
    this.canvasLine(controlsSeg(right + 3, boxY + arm, right + 3, boxY - 3), GREEN, 0.85, 2, 8);
    this.canvasLine(controlsSeg(boxX - 3, bottom - arm, boxX - 3, bottom + 3), GREEN, 0.85, 2, 8);
    this.canvasLine(controlsSeg(right + 3, bottom - arm, right + 3, bottom + 3), GREEN, 0.85, 2, 8);
    this.text('CONTROLS', boxX + boxW / 2, boxY + 22, BLUE, { size: 14, align: 'center', weight: 800, glow: 8 });
    this.text('ACTION', L.nameX, boxY + 50, BLUE, { size: 10, alpha: 0.6, glow: 0 });
    this.text('KEY 1', L.slot0X, boxY + 50, BLUE, { size: 10, align: 'center', alpha: 0.6, glow: 0 });
    this.text('KEY 2', L.slot1X, boxY + 50, BLUE, { size: 10, align: 'center', alpha: 0.6, glow: 0 });
    this.canvasLine(controlsSeg(boxX + 18, boxY + 28, right - 18, boxY + 28), BLUE, 0.25, 1, 2);

    const capturing = view.mode === 'capture';
    const blink = 0.5 + 0.5 * Math.sin(game.time * 8);
    const lines = view.lines;
    const last = Math.min(lines.length, view.scroll + L.visibleRows);
    for (let i = view.scroll; i < last; i++) {
      const line = lines[i];
      const base = rowsTop + (i - view.scroll) * CONTROLS_ROW_H;
      const y = base + 14;
      if (line.kind === 'header') {
        this.text(line.title, L.nameX, y, BLUE, { size: 11, weight: 800, alpha: 0.55, glow: 0 });
        continue;
      }
      const selectedRow = view.footerFocus < 0 && view.cursorLine === i;
      if (line.custom)
        this.text('•', L.nameX - 10, y, GREEN, { size: 12, glow: 0 });
      if (capturing && selectedRow)
        this.text('PRESS A KEY… (ESC cancel)', L.nameX, y, ORANGE, { size: 10, weight: 800, alpha: 0.4 + blink * 0.6, glow: 6 });
      else
        this.text(line.name, L.nameX, y, line.custom ? GREEN : BLUE, { size: 12, alpha: selectedRow ? 1 : 0.8, glow: selectedRow ? 6 : 0 });
      for (let col = 0; col < 2; col++) {
        const x = col === 0 ? L.slot0X : L.slot1X;
        const selected = selectedRow && view.cursorCol === col;
        const text = col === 0 ? line.slot0 : line.slot1;
        if (selected)
          this.canvasLine(controlsRect(x - L.slotHalf, base + 2, x + L.slotHalf, base + CONTROLS_ROW_H - 2), ORANGE, 0.8, 1.5, 6);
        if (selected && capturing) {
          this.canvasLine(controlsSeg(x - L.slotHalf + 3, base + CONTROLS_ROW_H - 4, x - L.slotHalf + 3 + (L.slotHalf * 2 - 6) * Utils.clamp(view.captureTime / view.captureMax, 0, 1), base + CONTROLS_ROW_H - 4), ORANGE, 0.9, 2, 4);
          continue;
        }
        const tone = text === 'UNBOUND' ? RED : (selected ? ORANGE : BLUE);
        this.text(text, x, y, tone, { size: 12, align: 'center', alpha: selected ? 1 : 0.8, glow: selected ? 6 : 0 });
      }
    }
    if (view.scroll > 0)
      this.text('▲', right - 12, rowsTop - 4, ORANGE, { size: 11, align: 'center', glow: 0 });
    if (view.scroll + L.visibleRows < lines.length)
      this.text('▼', right - 12, footerTop - 4, ORANGE, { size: 11, align: 'center', glow: 0 });

    this.canvasLine(controlsSeg(boxX + 18, footerTop, right - 18, footerTop), BLUE, 0.25, 1, 2);
    this.text(CONTROLS_LEGEND, boxX + boxW / 2, footerTop + 16, BLUE, { size: 10, align: 'center', alpha: 0.6, glow: 0 });
    if (view.toastTime > 0)
      this.text(view.toastText, boxX + boxW / 2, footerTop + 34, view.toastTone, { size: 12, align: 'center', alpha: Utils.clamp(view.toastTime * 2, 0, 1), glow: 4 });
    const confirming = view.mode === 'confirmReset';
    const resetFocus = view.footerFocus === 0;
    this.text(confirming ? '[PRESS AGAIN TO RESET ALL]' : '[RESET ALL]', L.resetX, L.buttonY, RED, { size: 12, align: 'center', weight: 800, alpha: resetFocus || confirming ? 1 : 0.7, glow: resetFocus ? 8 : 2 });
    const backFocus = view.footerFocus === 1;
    this.text('[BACK]', L.backX, L.buttonY, backFocus ? ORANGE : BLUE, { size: 12, align: 'center', weight: 800, alpha: backFocus ? 1 : 0.7, glow: backFocus ? 8 : 2 });
    const labelsFocus = view.footerFocus === 2;
    this.text(`[KEY LABELS: ${view.layoutText}]`, L.labelsX, L.labelsY, labelsFocus ? ORANGE : BLUE, { size: 12, align: 'center', weight: 800, alpha: labelsFocus ? 1 : 0.7, glow: labelsFocus ? 8 : 2 });
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

    if (this.controlsView?.open && (state === 'title' || state === 'paused')) {
      dim(0.82);
      this.drawControls(this.controlsView, game);
      return;
    }

    if (state === 'title') {
      dim(Math.max(0.55, game.fade));
      const blink = 0.5 + 0.5 * Math.sin(game.time * 2.2);
      if (!game.selectingDifficulty) {
        this.text('DOOMR', cx, cy - 60, BLUE, { size: Math.min(110, width / 7), align: 'center', weight: 800, glow: 22 });
        this.text('Rip and tear', cx, cy - 20, GREEN, { size: 15, align: 'center', alpha: 0.9 });
        this.drawMainMenu();
        const panelH = this.drawControlHints(cx, cy + 140);
        if (this.unboundText)
          this.text(this.unboundText, cx, cy + 140 + panelH + 16, RED, { size: 12, align: 'center' });
      } else {
        this.text('DOOMR', cx, cy - 116, BLUE, { size: Math.min(84, width / 8), align: 'center', weight: 800, glow: 22 });
        const boxW = Utils.clamp(width - 48, 280, 390);
        const boxH = 196;
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
        this.text(activeDef.desc, cx, boxY + 150, GREEN, { size: 11, align: 'center', alpha: 0.9, glow: 4 });
        this.canvasLine([boxX + 18, boxY + 160, boxX + boxW - 18, boxY + 160], BLUE, 0.25, 1, 2);
        const levelDef = LEVELS[game.levelIndex] ?? LEVELS[0];
        this.text(`MISSION:  ◂  ${levelDef.name.toUpperCase()}  ▸`, cx, boxY + 181, ORANGE, { size: 13, align: 'center', weight: 800, glow: 8 });
        this.text(this.selectHint, cx, cy + 148, ORANGE, { size: 14, align: 'center', alpha: 0.5 + blink * 0.5 });
      }
    } else if (state === 'paused') {
      dim(0.6);
      this.text('PAUSED', cx, cy, BLUE, { size: 40, align: 'center', weight: 800, glow: 14 });
      this.text(this.resumeText, cx, cy + 36, GREEN, { size: 14, align: 'center' });
      this.text(this.controlsEntryText, cx, cy + CONTROLS_ENTRY_PAUSED_DY, GREEN, { size: 13, align: 'center', alpha: 0.85 });
      const panelH = this.drawControlHints(cx, cy + 76);
      if (this.unboundText)
        this.text(this.unboundText, cx, cy + 76 + panelH + 16, RED, { size: 12, align: 'center' });
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
