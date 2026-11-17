import { NAV_DOWN, NAV_LEFT, NAV_RIGHT, NAV_UP } from './input.js';

export const OPTIONS_PAGE_ROOT = 'root';
export const OPTIONS_PAGE_GRAPHICS = 'graphics';

export const OPTION_CONTROLS = 'controls';
const OPTION_GRAPHICS = 'graphics';
const OPTION_BACK = 'back';
const OPTION_PRESET = 'preset';
const OPTION_RESOLUTION = 'resolution';
const OPTION_ADAPTIVE = 'adaptive';
const OPTION_GLOW = 'glow';
const OPTION_HUD_GLOW = 'hudGlow';

const MENU_SOUND = Object.freeze({ visible: true });

const row = (id, label, value = '') => ({ id, label, value, adjustable: value !== '' });

/**
 * Headless second-level OPTIONS menu: a root page (CONTROLS, GRAPHICS, BACK) and a GRAPHICS page
 * of quality settings. Draws nothing; the Hud reads `view`. `activated` is OPTION_CONTROLS for one
 * frame when the player picks CONTROLS, so main.js can open the key bindings page.
 */
export class OptionsMenu {
  constructor(input, settings, { hitAt = () => -1 } = {}) {
    this.input = input;
    this.settings = settings;
    this.hitAt = hitAt;
    this.state = 'title';
    this.activated = '';
    this.settingsVersion = -1;
    this.rootRows = [
      row(OPTION_CONTROLS, 'CONTROLS'),
      row(OPTION_GRAPHICS, 'GRAPHICS'),
      row(OPTION_BACK, 'BACK'),
    ];
    this.graphicsRows = [
      row(OPTION_PRESET, 'QUALITY PRESET', '-'),
      row(OPTION_RESOLUTION, 'RESOLUTION', '-'),
      row(OPTION_ADAPTIVE, 'AUTO RESOLUTION', '-'),
      row(OPTION_GLOW, 'BLOOM GLOW', '-'),
      row(OPTION_HUD_GLOW, 'HUD GLOW', '-'),
      row(OPTION_BACK, 'BACK'),
    ];
    this.view = {
      open: false,
      page: OPTIONS_PAGE_ROOT,
      title: 'OPTIONS',
      note: '',
      cursor: 0,
      rows: this.rootRows,
    };
    this.refreshValues();
  }

  get isOpen() {
    return this.view.open;
  }

  get returnState() {
    return this.state;
  }

  open(returnState) {
    this.state = returnState;
    this.activated = '';
    this.showPage(OPTIONS_PAGE_ROOT, 0);
    this.view.open = true;
  }

  close() {
    this.view.open = false;
  }

  /** Coming back from the CONTROLS page lands on its entry in the root page. */
  returnFromControls() {
    this.showPage(OPTIONS_PAGE_ROOT, 0);
  }

  showPage(page, cursor) {
    const v = this.view;
    v.page = page;
    v.cursor = cursor;
    if (page === OPTIONS_PAGE_GRAPHICS) {
      v.title = 'GRAPHICS';
      v.note = 'Lower these on older computers';
      v.rows = this.graphicsRows;
    } else {
      v.title = 'OPTIONS';
      v.note = '';
      v.rows = this.rootRows;
    }
  }

  refreshValues() {
    const s = this.settings;
    if (s.version === this.settingsVersion)
      return;
    this.settingsVersion = s.version;
    const r = this.graphicsRows;
    r[0].value = s.presetName.toUpperCase();
    r[1].value = s.resolutionText;
    r[2].value = s.adaptive ? 'ON' : 'OFF';
    r[3].value = s.glowText;
    r[4].value = s.hudGlow ? 'ON' : 'OFF';
  }

  update(blocked, game) {
    const v = this.view;
    this.activated = '';
    if (!v.open)
      return;
    const input = this.input;
    const count = v.rows.length;
    const nav = input.navigate();
    if (nav === NAV_UP || nav === NAV_DOWN) {
      v.cursor = (v.cursor + (nav === NAV_UP ? count - 1 : 1)) % count;
      game.emit('tallyTick', game.zero, MENU_SOUND);
    } else if ((nav === NAV_LEFT || nav === NAV_RIGHT) && v.rows[v.cursor].adjustable)
      this.adjust(v.rows[v.cursor].id, nav === NAV_RIGHT ? 1 : -1, game);
    if (input.mouseMoved) {
      const hovered = this.hitAt(input.mousePos);
      if (hovered >= 0 && hovered !== v.cursor) {
        v.cursor = hovered;
        game.emit('tallyTick', game.zero, MENU_SOUND);
      }
    }
    if (!blocked) {
      if (input.took('menu'))
        this.back(game);
      else if (input.took('Click')) {
        const hit = this.hitAt(input.mousePos);
        if (hit >= 0) {
          v.cursor = hit;
          this.activate(game);
        }
      } else if (input.took('confirm') || input.took('jump'))
        this.activate(game);
    }
    this.refreshValues();
  }

  back(game) {
    game.emit('keycard', game.zero, MENU_SOUND);
    if (this.view.page === OPTIONS_PAGE_GRAPHICS)
      this.showPage(OPTIONS_PAGE_ROOT, 1);
    else
      this.close();
  }

  activate(game) {
    const item = this.view.rows[this.view.cursor];
    if (item.id === OPTION_BACK)
      this.back(game);
    else if (item.id === OPTION_GRAPHICS) {
      game.emit('keycard', game.zero, MENU_SOUND);
      this.showPage(OPTIONS_PAGE_GRAPHICS, 0);
    } else if (item.id === OPTION_CONTROLS) {
      game.emit('keycard', game.zero, MENU_SOUND);
      this.activated = OPTION_CONTROLS;
    } else
      this.adjust(item.id, 1, game);
  }

  adjust(id, delta, game) {
    const s = this.settings;
    if (id === OPTION_PRESET)
      s.cyclePreset(delta);
    else if (id === OPTION_RESOLUTION)
      s.cycleResolution(delta);
    else if (id === OPTION_ADAPTIVE)
      s.toggleAdaptive();
    else if (id === OPTION_GLOW)
      s.cycleGlow(delta);
    else if (id === OPTION_HUD_GLOW)
      s.toggleHudGlow();
    else
      return;
    game.emit('keycard', game.zero, MENU_SOUND);
    this.refreshValues();
  }
}
