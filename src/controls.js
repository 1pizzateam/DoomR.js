import { CONTROL_GROUPS, RESERVED_CODES } from './keymap.js';

export const HIT_NONE = -1;
export const HIT_RESET_ALL = -2;
export const HIT_BACK = -3;
export const HIT_SCROLL_UP = -4;
export const HIT_SCROLL_DOWN = -5;

export const TONE_BLUE = 0;
export const TONE_GREEN = 1;
export const TONE_ORANGE = 2;
export const TONE_RED = 3;

export const CAPTURE_SECONDS = 5;
export const CONFIRM_SECONDS = 2;
export const TOAST_SECONDS = 2.5;
export const TIMER_EPSILON = 0.01;

const MENU_SOUND = Object.freeze({ visible: true });
const SCROLL_STEP = 3;
const FOOTER_RESET = 0;
const FOOTER_BACK = 1;

/** Headless controller for the CONTROLS page: draws nothing, owns the page state the Hud reads from `view`. */
export class ControlsMenu {
  constructor(keymap, input, { hitAt = () => HIT_NONE } = {}) {
    this.keymap = keymap;
    this.input = input;
    this.hitAt = hitAt;
    this.disarmCode = '';
    this.state = 'title';
    this.nameById = new Map();
    const lines = [];
    this.actionLines = [];
    for (const group of CONTROL_GROUPS) {
      lines.push({ kind: 'header', title: group.title });
      for (const action of group.actions) {
        this.nameById.set(action.id, action.name);
        this.actionLines.push(lines.length);
        lines.push({ kind: 'action', id: action.id, name: action.name, slot0: '', slot1: '', custom: false, unbound: false });
      }
    }
    this.view = {
      open: false,
      mode: 'browse',
      lines,
      cursorLine: this.actionLines[0],
      cursorCol: 0,
      footerFocus: -1,
      scroll: 0,
      visibleRows: 12,
      captureTime: 0,
      captureMax: CAPTURE_SECONDS,
      confirmTime: 0,
      toastText: '',
      toastTone: TONE_BLUE,
      toastTime: 0,
      labelVersion: -1,
    };
  }

  get isOpen() {
    return this.view.open;
  }

  get returnState() {
    return this.state;
  }

  open(returnState) {
    const v = this.view;
    this.state = returnState;
    v.open = true;
    v.mode = 'browse';
    v.cursorLine = this.actionLines[0];
    v.cursorCol = 0;
    v.footerFocus = -1;
    v.scroll = 0;
    v.toastText = '';
    v.toastTime = 0;
    v.captureTime = 0;
    v.confirmTime = 0;
    this.disarmCode = '';
    this.input.setRawMode(true);
    v.labelVersion = -1;
    this.refreshLabels();
  }

  close() {
    this.view.open = false;
    this.view.mode = 'browse';
    this.input.setRawMode(false);
  }

  refreshLabels() {
    const v = this.view;
    const keymap = this.keymap;
    if (keymap.version === v.labelVersion)
      return;
    v.labelVersion = keymap.version;
    for (let i = 0; i < this.actionLines.length; i++) {
      const line = v.lines[this.actionLines[i]];
      const slots = keymap.slotCodes(line.id);
      line.slot0 = slots.length > 0 ? keymap.codeLabel(slots[0]) : 'UNBOUND';
      line.slot1 = slots.length < 2 ? '—' : keymap.codeLabel(slots[1]);
      line.custom = keymap.isCustom(line.id);
      line.unbound = slots.length === 0;
    }
  }

  toast(text, tone) {
    const v = this.view;
    v.toastText = text;
    v.toastTone = tone;
    v.toastTime = TOAST_SECONDS;
  }

  update(dt, game) {
    const v = this.view;
    if (!v.open)
      return;
    if (v.toastTime > 0)
      v.toastTime -= dt;
    if (v.mode === 'capture') {
      v.captureTime -= dt;
      if (v.captureTime <= TIMER_EPSILON)
        this.cancelCapture(game);
    } else if (v.mode === 'confirmReset') {
      v.confirmTime -= dt;
      if (v.confirmTime <= TIMER_EPSILON)
        v.mode = 'browse';
    }
    const input = this.input;
    let record = input.nextRaw();
    while (record !== null) {
      if (v.mode === 'capture')
        this.captureEvent(record, game);
      else
        this.browseEvent(record, game);
      if (!v.open)
        return;
      record = input.nextRaw();
    }
    if (input.mouseMoved && v.mode === 'browse') {
      const hit = this.hitAt(input.mousePos);
      if (hit >= 0) {
        const line = hit >> 1;
        const col = hit & 1;
        if (line !== v.cursorLine || col !== v.cursorCol || v.footerFocus !== -1) {
          v.cursorLine = line;
          v.cursorCol = col;
          v.footerFocus = -1;
          game.emit('tallyTick', game.zero, MENU_SOUND);
        }
      }
    }
    this.refreshLabels();
  }

  cancelCapture(game) {
    this.view.mode = 'browse';
    this.toast('Cancelled', TONE_ORANGE);
    game.emit('dry', game.zero, MENU_SOUND);
  }

  startCapture(disarmCode) {
    const v = this.view;
    v.mode = 'capture';
    v.captureTime = CAPTURE_SECONDS;
    this.disarmCode = disarmCode;
  }

  captureEvent(record, game) {
    const kind = record.kind;
    const code = record.code;
    if (kind === 'keyup' || kind === 'buttonup') {
      if (code === this.disarmCode)
        this.disarmCode = '';
      return;
    }
    if ((kind !== 'keydown' && kind !== 'buttondown') || record.repeat)
      return;
    if (code === this.disarmCode)
      return;
    if (code === 'Escape') {
      this.cancelCapture(game);
      return;
    }
    const v = this.view;
    v.mode = 'browse';
    if (RESERVED_CODES.has(code)) {
      this.toast('ESC / ENTER / system keys are reserved', TONE_RED);
      game.emit('dry', game.zero, MENU_SOUND);
      return;
    }
    const line = v.lines[v.cursorLine];
    const change = this.keymap.setBinding(line.id, v.cursorCol, code);
    if (!change.ok) {
      this.toast('That key cannot be used', TONE_RED);
      game.emit('dry', game.zero, MENU_SOUND);
      return;
    }
    game.emit('keycard', game.zero, MENU_SOUND);
    this.reportChange(change, 'Saved');
  }

  reportChange(change, okText) {
    const keymap = this.keymap;
    if (change.stolenFrom) {
      const victim = this.nameById.get(change.stolenFrom).toUpperCase();
      const taken = `${keymap.codeLabel(change.code)} was taken from ${victim}`;
      if (keymap.effectiveCodes(change.stolenFrom).length === 0)
        this.toast(`${taken} — ${victim} is now UNBOUND`, TONE_RED);
      else
        this.toast(taken, TONE_ORANGE);
    } else if (!change.saved)
      this.toast('Not saved: browser storage unavailable', TONE_RED);
    else
      this.toast(okText, TONE_GREEN);
  }

  moveCursor(delta, game) {
    const v = this.view;
    if (v.footerFocus >= 0) {
      if (delta > 0)
        return;
      v.footerFocus = -1;
      v.cursorLine = this.actionLines[this.actionLines.length - 1];
    } else {
      const at = this.actionLines.indexOf(v.cursorLine) + delta;
      if (at < 0)
        return;
      if (at >= this.actionLines.length)
        v.footerFocus = FOOTER_RESET;
      else
        v.cursorLine = this.actionLines[at];
    }
    game.emit('tallyTick', game.zero, MENU_SOUND);
    this.keepCursorVisible();
  }

  moveColumn(delta, game) {
    const v = this.view;
    if (v.footerFocus >= 0) {
      const next = Math.max(FOOTER_RESET, Math.min(FOOTER_BACK, v.footerFocus + delta));
      if (next === v.footerFocus)
        return;
      v.footerFocus = next;
    } else {
      const next = Math.max(0, Math.min(1, v.cursorCol + delta));
      if (next === v.cursorCol)
        return;
      v.cursorCol = next;
    }
    game.emit('tallyTick', game.zero, MENU_SOUND);
  }

  keepCursorVisible() {
    const v = this.view;
    if (v.footerFocus >= 0)
      return;
    let top = v.cursorLine;
    if (top > 0 && v.lines[top - 1].kind === 'header')
      top--;
    if (top < v.scroll)
      v.scroll = top;
    else if (v.cursorLine > v.scroll + v.visibleRows - 1)
      v.scroll = v.cursorLine - v.visibleRows + 1;
  }

  scrollBy(lines) {
    const v = this.view;
    const max = Math.max(0, v.lines.length - v.visibleRows);
    v.scroll = Math.max(0, Math.min(max, v.scroll + lines));
  }

  activateReset(game) {
    const v = this.view;
    if (v.mode === 'confirmReset' && v.confirmTime > TIMER_EPSILON) {
      this.keymap.resetAll();
      v.mode = 'browse';
      game.emit('keycard', game.zero, MENU_SOUND);
      this.toast('All controls reset', TONE_GREEN);
      return;
    }
    v.mode = 'confirmReset';
    v.confirmTime = CONFIRM_SECONDS;
    this.toast('Press RESET ALL again to restore every default', TONE_ORANGE);
  }

  isResetKey(record) {
    const key = record.key;
    if (key.length === 1)
      return key.toLowerCase() === 'r';
    return record.code === 'KeyR';
  }

  browseEvent(record, game) {
    const v = this.view;
    const kind = record.kind;
    if (kind === 'wheel') {
      this.scrollBy(record.delta * SCROLL_STEP);
      return;
    }
    if (kind === 'keydown') {
      const code = record.code;
      const arrow = code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight';
      if (record.repeat && !arrow)
        return;
      const confirming = v.mode === 'confirmReset';
      const activating = (code === 'Enter' || code === 'NumpadEnter') && v.footerFocus === FOOTER_RESET;
      if (confirming && !activating) {
        v.mode = 'browse';
        if (code === 'Escape') {
          v.toastTime = 0;
          return;
        }
      }
      if (code === 'ArrowUp')
        this.moveCursor(-1, game);
      else if (code === 'ArrowDown')
        this.moveCursor(1, game);
      else if (code === 'ArrowLeft')
        this.moveColumn(-1, game);
      else if (code === 'ArrowRight')
        this.moveColumn(1, game);
      else if (code === 'Enter' || code === 'NumpadEnter') {
        if (v.footerFocus === FOOTER_RESET)
          this.activateReset(game);
        else if (v.footerFocus === FOOTER_BACK)
          this.close();
        else
          this.startCapture(code);
      } else if (code === 'Escape')
        this.close();
      else if (v.footerFocus < 0 && (code === 'Delete' || code === 'Backspace')) {
        const change = this.keymap.clearBinding(v.lines[v.cursorLine].id, v.cursorCol);
        if (change.ok) {
          game.emit('keycard', game.zero, MENU_SOUND);
          this.reportChange(change, 'Cleared');
        } else
          game.emit('dry', game.zero, MENU_SOUND);
      } else if (v.footerFocus < 0 && this.isResetKey(record)) {
        const change = this.keymap.resetAction(v.lines[v.cursorLine].id);
        game.emit('keycard', game.zero, MENU_SOUND);
        this.reportChange(change, 'Reset');
      }
      return;
    }
    if (kind === 'buttondown' && record.code === 'Mouse0') {
      const hit = this.hitAt(this.input.mousePos);
      if (v.mode === 'confirmReset' && hit !== HIT_RESET_ALL)
        v.mode = 'browse';
      if (hit >= 0) {
        v.cursorLine = hit >> 1;
        v.cursorCol = hit & 1;
        v.footerFocus = -1;
        this.startCapture('Mouse0');
      } else if (hit === HIT_RESET_ALL) {
        v.footerFocus = FOOTER_RESET;
        this.activateReset(game);
      } else if (hit === HIT_BACK)
        this.close();
      else if (hit === HIT_SCROLL_UP)
        this.scrollBy(-SCROLL_STEP);
      else if (hit === HIT_SCROLL_DOWN)
        this.scrollBy(SCROLL_STEP);
    }
  }
}
