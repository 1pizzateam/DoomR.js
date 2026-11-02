export const LAYOUT_STORAGE_KEY = 'doomr.keyboardLayout';
export const LAYOUTS = Object.freeze(['auto', 'qwerty', 'azerty', 'qwertz', 'dvorak']);

const LETTER_CODES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => `Key${c}`);
const LABELLED_CODES = Object.freeze([
  ...LETTER_CODES,
  'Semicolon', 'Quote', 'Comma', 'Period', 'Slash', 'BracketLeft', 'BracketRight', 'Minus', 'Equal', 'Backquote', 'Backslash',
]);
const LABELLED_SET = new Set(LABELLED_CODES);

const QWERTY_GLYPHS = {};
for (const code of LETTER_CODES)
  QWERTY_GLYPHS[code] = code.slice(3).toLowerCase();
Object.assign(QWERTY_GLYPHS, {
  Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`', Backslash: '\\',
});

const preset = (name, overrides) => Object.freeze({ name, glyphs: Object.freeze({ ...QWERTY_GLYPHS, ...overrides }) });

export const PRESETS = Object.freeze({
  qwerty: preset('QWERTY', {}),
  azerty: preset('AZERTY', {
    KeyQ: 'a', KeyW: 'z', KeyA: 'q', KeyZ: 'w', KeyM: ',', Semicolon: 'm', Comma: ';', Period: ':', Slash: '!', Quote: 'ù',
    BracketLeft: '^', BracketRight: '$', Minus: ')', Equal: '=', Backquote: '²', Backslash: '*',
  }),
  qwertz: preset('QWERTZ', {
    KeyY: 'z', KeyZ: 'y', Semicolon: 'ö', Quote: 'ä', BracketLeft: 'ü', BracketRight: '+', Minus: 'ß', Equal: '´', Slash: '-', Backquote: '^', Backslash: '#',
  }),
  dvorak: preset('Dvorak', {
    KeyQ: "'", KeyW: ',', KeyE: '.', KeyR: 'p', KeyT: 'y', KeyY: 'f', KeyU: 'g', KeyI: 'c', KeyO: 'r', KeyP: 'l',
    BracketLeft: '/', BracketRight: '=', KeyA: 'a', KeyS: 'o', KeyD: 'e', KeyF: 'u', KeyG: 'i', KeyH: 'd', KeyJ: 'h', KeyK: 't', KeyL: 'n',
    Semicolon: 's', Quote: '-', KeyZ: ';', KeyX: 'q', KeyC: 'j', KeyV: 'k', KeyB: 'x', KeyN: 'b', KeyM: 'm', Comma: 'w', Period: 'v', Slash: 'z',
    Minus: '[', Equal: ']', Backquote: '`', Backslash: '\\',
  }),
});

const bind = (code, which) => Object.freeze({ code, which });
const positional = (id, ...bindings) => Object.freeze({ id, kind: 'positional', bindings: Object.freeze(bindings), glyphs: Object.freeze([]) });
const mnemonic = (id, glyphs, ...bindings) => Object.freeze({ id, kind: 'mnemonic', bindings: Object.freeze(bindings), glyphs: Object.freeze(glyphs) });

export const ACTIONS = Object.freeze([
  positional('moveForward', bind('KeyW', 87), bind('ArrowUp', 38)),
  positional('moveBack', bind('KeyS', 83), bind('ArrowDown', 40)),
  positional('strafeLeft', bind('KeyA', 65)),
  positional('strafeRight', bind('KeyD', 68)),
  positional('turnLeft', bind('ArrowLeft', 37)),
  positional('turnRight', bind('ArrowRight', 39)),
  positional('jump', bind('Space', 32)),
  positional('run', bind('ShiftLeft', 16), bind('ShiftRight', 160)),
  positional('fire', bind('KeyX', 88), bind('ControlLeft', 17), bind('ControlRight', 162), bind('AltLeft', 18), bind('AltRight', 164)),
  positional('confirm', bind('Enter', 13)),
  positional('crouch', bind('KeyC', 67)),
  positional('grenade', bind('KeyF', 70)),
  positional('weapon1', bind('Digit1', 49), bind('Numpad1', 97)),
  positional('weapon2', bind('Digit2', 50), bind('Numpad2', 98)),
  positional('weapon3', bind('Digit3', 51), bind('Numpad3', 99)),
  positional('weapon4', bind('Digit4', 52), bind('Numpad4', 100)),
  positional('automap', bind('Tab', 9)),
  positional('menu', bind('Escape', 27)),
  positional('diagnostics', bind('F3', 114)),
  positional('layoutCycle', bind('F2', 113)),
  mnemonic('use', ['e'], bind('KeyE', 69)),
  mnemonic('nightVision', ['n'], bind('KeyN', 78)),
  mnemonic('music', ['m'], bind('KeyM', 77)),
  mnemonic('map', ['v'], bind('KeyV', 86)),
  mnemonic('automapGrid', ['g'], bind('KeyG', 71)),
  mnemonic('pause', ['p'], bind('KeyP', 80)),
  mnemonic('sound', [';', 'b'], bind('Semicolon', 59), bind('KeyB', 66), bind(null, 186)),
  mnemonic('zoomIn', ['=', '+'], bind('Equal', 61), bind('NumpadAdd', 107), bind(null, 187)),
  mnemonic('zoomOut', ['-'], bind('Minus', 45), bind('NumpadSubtract', 109), bind(null, 189), bind(null, 173)),
  mnemonic('levelPrev', ['['], bind('BracketLeft', 219)),
  mnemonic('levelNext', [']'], bind('BracketRight', 221)),
]);

export const DEFAULT_SELECT_HINT = '←/→ select mission  ·  ↑/↓ or 1-4 select skill  ·  click or press ENTER to begin  ·  ESC back';

const buildHints = (label, layoutText) => Object.freeze([
  `${label('moveForward')} ${label('strafeLeft')} ${label('moveBack')} ${label('strafeRight')}  move     mouse / ← →  turn`,
  `click / ${label('fire')} / OPT / CTRL  fire     1-4  weapons`,
  `SPACE  jump     ${label('crouch')}  crouch     SHIFT  run`,
  `${label('use')}  open doors     ${label('levelPrev')} / ${label('levelNext')}  switch level     ${label('sound')}  sound`,
  `TAB  automap     ${label('nightVision')}  night vision     ${label('music')}  music     ESC  pause`,
  `F2  keyboard layout: ${layoutText}`,
]);

const POSITIONAL_LABEL_CODE = Object.freeze({
  moveForward: 'KeyW', moveBack: 'KeyS', strafeLeft: 'KeyA', strafeRight: 'KeyD', fire: 'KeyX', crouch: 'KeyC',
});

const ACTION_BY_ID = new Map();
for (const action of ACTIONS)
  ACTION_BY_ID.set(action.id, action);

const defaultLabel = (id) => {
  const action = ACTION_BY_ID.get(id);
  if (action.kind === 'positional')
    return QWERTY_GLYPHS[POSITIONAL_LABEL_CODE[id]].toUpperCase();
  return action.glyphs[0].toUpperCase();
};

export const DEFAULT_HINT_LINES = buildHints(defaultLabel, 'auto (QWERTY)');

export class Keymap {
  constructor({ storage = globalThis.localStorage, navigator = globalThis.navigator } = {}) {
    this.storage = storage;
    this.navigator = navigator;
    const flat = [];
    this.positionalByCode = new Map();
    this.glyphWhich = new Map();
    this.fallbackByCode = new Map();
    this.actionByWhich = new Map();
    this.whichesByAction = new Map();
    this.allWhich = new Set();
    this.claimedGlyphs = new Set();
    for (const action of ACTIONS) {
      const whiches = [];
      for (const { code, which } of action.bindings) {
        flat.push(Object.freeze({ action: action.id, code, which }));
        whiches.push(which);
        this.allWhich.add(which);
        this.actionByWhich.set(which, action.id);
        if (action.kind === 'positional')
          this.positionalByCode.set(code, which);
        else if (code)
          this.fallbackByCode.set(code, which);
      }
      this.whichesByAction.set(action.id, Object.freeze(whiches));
      for (const glyph of action.glyphs) {
        this.claimedGlyphs.add(glyph);
        this.glyphWhich.set(glyph, action.bindings[0].which);
        this.glyphWhich.set(glyph.toUpperCase(), action.bindings[0].which);
      }
    }
    this.bindings = Object.freeze(flat);
    this.layoutGlyphs = new Map();
    this.learned = new Map();
    const lang = String(navigator?.language ?? '').toLowerCase();
    if (lang === 'nl-be' || (lang.startsWith('fr') && lang !== 'fr-ca'))
      this.languagePreset = 'azerty';
    else if (lang.startsWith('de'))
      this.languagePreset = 'qwertz';
    else
      this.languagePreset = 'qwerty';
    this.detected = null;
    const stored = storage?.getItem(LAYOUT_STORAGE_KEY);
    this.override = LAYOUTS.includes(stored) ? stored : 'auto';
    this.version = 0;
    this.hintLines = DEFAULT_HINT_LINES;
    this.selectHint = DEFAULT_SELECT_HINT;
    this.rebuild();
    this.requestLayoutMap();
  }

  resolve(event) {
    const code = event.code;
    if (!code)
      return event.which || event.keyCode || 0;
    const pos = this.positionalByCode.get(code);
    if (pos !== undefined)
      return pos;
    const glyph = this.glyphWhich.get(event.key);
    if (glyph !== undefined)
      return glyph;
    return this.fallbackByCode.get(code) ?? 0;
  }

  actionOf(which) {
    return this.actionByWhich.get(which);
  }

  whichesOf(actionId) {
    return this.whichesByAction.get(actionId);
  }

  isBound(which) {
    return this.allWhich.has(which);
  }

  learn(event) {
    const code = event.code;
    if (!code || !LABELLED_SET.has(code))
      return false;
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey)
      return false;
    const key = event.key;
    if (key?.length !== 1 || this.learned.get(code) === key)
      return false;
    this.learned.set(code, key);
    this.refresh();
    return true;
  }

  applyLayoutMap(map) {
    let changed = false;
    for (const code of LABELLED_CODES) {
      const value = map.get(code);
      if (value?.length === 1 && this.layoutGlyphs.get(code) !== value) {
        this.layoutGlyphs.set(code, value);
        changed = true;
      }
    }
    if (changed)
      this.refresh();
    return changed;
  }

  requestLayoutMap() {
    const kb = this.navigator?.keyboard;
    if (!kb?.getLayoutMap)
      return undefined;
    try {
      return kb.getLayoutMap().then((m) => this.applyLayoutMap(m)).catch(() => false);
    } catch {
      return undefined;
    }
  }

  cycleOverride() {
    this.override = LAYOUTS[(LAYOUTS.indexOf(this.override) + 1) % LAYOUTS.length];
    this.storage?.setItem(LAYOUT_STORAGE_KEY, this.override);
    this.rebuild();
    this.version++;
    return this.statusText;
  }

  autoGlyph(code) {
    return this.layoutGlyphs.get(code) ?? this.learned.get(code);
  }

  glyphOf(code) {
    if (this.override !== 'auto')
      return PRESETS[this.override].glyphs[code] ?? QWERTY_GLYPHS[code];
    return this.autoGlyph(code) ?? PRESETS[this.detected ?? this.languagePreset].glyphs[code] ?? QWERTY_GLYPHS[code];
  }

  labelOf(code) {
    return this.glyphOf(code)?.toUpperCase();
  }

  detect() {
    const w = this.autoGlyph('KeyW');
    const q = this.autoGlyph('KeyQ');
    const y = this.autoGlyph('KeyY');
    const z = this.autoGlyph('KeyZ');
    if (w === ',')
      this.detected = 'dvorak';
    else if (q === 'a' || w === 'z')
      this.detected = 'azerty';
    else if (y === 'z' || z === 'y')
      this.detected = 'qwertz';
    else if ((w === 'w' || q === 'q') && y === 'y')
      this.detected = 'qwerty';
  }

  refresh() {
    this.detect();
    this.rebuild();
    this.version++;
  }

  mnemonicLabel(action) {
    for (const glyph of action.glyphs)
      for (const code of LABELLED_CODES)
        if (!this.positionalByCode.has(code) && this.glyphOf(code) === glyph)
          return glyph.toUpperCase();
    const first = action.bindings.find((b) => b.code);
    const own = first && this.glyphOf(first.code);
    if (own && !this.claimedGlyphs.has(own))
      return own.toUpperCase();
    return action.glyphs[0].toUpperCase();
  }

  rebuild() {
    const labels = new Map();
    for (const action of ACTIONS)
      if (action.kind === 'mnemonic')
        labels.set(action.id, this.mnemonicLabel(action));
    const label = (id) => labels.get(id) ?? this.labelOf(POSITIONAL_LABEL_CODE[id]);
    this.hintLines = buildHints(label, this.override === 'auto' ? `auto (${this.layoutName})` : this.layoutName);
  }

  get layoutName() {
    if (this.override !== 'auto')
      return PRESETS[this.override].name;
    return PRESETS[this.detected ?? this.languagePreset].name;
  }

  get statusText() {
    if (this.override !== 'auto')
      return `Keyboard: ${this.layoutName} (manual)`;
    if (this.detected)
      return `Keyboard: auto (${this.layoutName} detected)`;
    return `Keyboard: auto (${this.layoutName})`;
  }
}
