export const LAYOUT_STORAGE_KEY = 'doomr.keyboardLayout';
export const CONTROLS_STORAGE_KEY = 'doomr.controls';
export const CONTROLS_VERSION = 1;
export const MAX_SLOTS = 2;
export const MAX_CODE_LENGTH = 32;
export const RESERVED_CODES = Object.freeze(new Set(['Escape', 'Enter', 'NumpadEnter', 'MetaLeft', 'MetaRight', 'OSLeft', 'OSRight', 'ContextMenu']));
export const MOUSE_CODES = Object.freeze(['Mouse0', 'Mouse1', 'Mouse2', 'Mouse3', 'Mouse4']);
export const MOUSE_WHICH_BASE = 1000;
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
  positional('fire', bind('Mouse0', MOUSE_WHICH_BASE), bind('KeyX', 88)),
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
  positional('controls', bind('F1', 112)),
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

const NO_OVERRIDES = new Map();

const buildHints = (label, layoutText, custom = NO_OVERRIDES) => {
  const weapons = custom.has('weapon1') || custom.has('weapon2') || custom.has('weapon3') || custom.has('weapon4')
    ? `${label('weapon1')} ${label('weapon2')} ${label('weapon3')} ${label('weapon4')}`
    : '1-4';
  const turn = custom.has('turnLeft') || custom.has('turnRight') ? `mouse / ${label('turnLeft')} ${label('turnRight')}` : 'mouse / ← →';
  const fire = custom.has('fire') ? label('fire') : `click / ${label('fire')}`;
  const jump = custom.has('jump') ? label('jump') : 'SPACE';
  const run = custom.has('run') ? label('run') : 'SHIFT';
  const automap = custom.has('automap') ? label('automap') : 'TAB';
  return Object.freeze([
    `${label('moveForward')} ${label('strafeLeft')} ${label('moveBack')} ${label('strafeRight')}  move     ${turn}  turn`,
    `${fire}  fire     ${weapons}  weapons`,
    `${jump}  jump     ${label('crouch')}  crouch     ${run}  run`,
    `${label('use')}  open doors     ${label('levelPrev')} / ${label('levelNext')}  switch level     ${label('sound')}  sound`,
    `${automap}  automap     ${label('nightVision')}  night vision     ${label('music')}  music     ESC  pause`,
    `${label('layoutCycle')}  keyboard layout: ${layoutText}`,
    `${label('controls')}  controls`,
  ]);
};

const POSITIONAL_LABEL_CODE = Object.freeze({
  moveForward: 'KeyW', moveBack: 'KeyS', strafeLeft: 'KeyA', strafeRight: 'KeyD', fire: 'KeyX', crouch: 'KeyC',
});

const NAMED_KEY_LABELS = {
  Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', ControlLeft: 'CTRL', ControlRight: 'CTRL', AltLeft: 'ALT', AltRight: 'ALT',
  Tab: 'TAB', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'ESC', Enter: 'ENTER', Backspace: 'BKSP',
  Delete: 'DEL', Insert: 'INS', Home: 'HOME', End: 'END', PageUp: 'PG UP', PageDown: 'PG DN', CapsLock: 'CAPS',
  NumpadAdd: 'NUM +', NumpadSubtract: 'NUM -', NumpadMultiply: 'NUM *', NumpadDivide: 'NUM /', NumpadDecimal: 'NUM .',
  Mouse0: 'MOUSE L', Mouse1: 'MOUSE M', Mouse2: 'MOUSE R', Mouse3: 'MOUSE 4', Mouse4: 'MOUSE 5',
};
for (let i = 0; i <= 9; i++) {
  NAMED_KEY_LABELS[`Digit${i}`] = String(i);
  NAMED_KEY_LABELS[`Numpad${i}`] = `NUM ${i}`;
}
for (let i = 1; i <= 24; i++)
  NAMED_KEY_LABELS[`F${i}`] = `F${i}`;
Object.freeze(NAMED_KEY_LABELS);

const LEGACY_KEYCODES = {
  Backspace: 8, CapsLock: 20, PageUp: 33, PageDown: 34, End: 35, Home: 36, Insert: 45, Delete: 46,
  NumpadMultiply: 106, NumpadDecimal: 110, NumpadDivide: 111, Quote: 222, Comma: 188, Period: 190, Slash: 191, Backquote: 192, Backslash: 220, IntlBackslash: 226,
};
for (let i = 0; i < 26; i++)
  LEGACY_KEYCODES[LETTER_CODES[i]] = 65 + i;
for (let i = 0; i <= 9; i++) {
  LEGACY_KEYCODES[`Digit${i}`] = 48 + i;
  LEGACY_KEYCODES[`Numpad${i}`] = 96 + i;
}
for (let i = 1; i <= 12; i++)
  LEGACY_KEYCODES[`F${i}`] = 111 + i;

const NO_CODES = Object.freeze([]);
const NO_CLAIMS = new Set();
const SYNTHETIC_WHICH_BASE = 1024;

const MODIFIER_PAIRS = Object.freeze({
  ShiftLeft: Object.freeze(['ShiftLeft', 'ShiftRight']),
  ShiftRight: Object.freeze(['ShiftLeft', 'ShiftRight']),
  ControlLeft: Object.freeze(['ControlLeft', 'ControlRight']),
  ControlRight: Object.freeze(['ControlLeft', 'ControlRight']),
  AltLeft: Object.freeze(['AltLeft', 'AltRight']),
  AltRight: Object.freeze(['AltLeft', 'AltRight']),
});
const MODIFIER_LEFT = Object.freeze({ ShiftRight: 'ShiftLeft', ControlRight: 'ControlLeft', AltRight: 'AltLeft' });

const normalizeCode = (code) => MODIFIER_LEFT[code] ?? code;
const expandedCache = new Map();
const expandCode = (code) => {
  const pair = MODIFIER_PAIRS[code];
  if (pair)
    return pair;
  let single = expandedCache.get(code);
  if (!single) {
    single = Object.freeze([code]);
    expandedCache.set(code, single);
  }
  return single;
};

const ACTION_BY_ID = new Map();
for (const action of ACTIONS)
  ACTION_BY_ID.set(action.id, action);

const staticCodeLabel = (code) => NAMED_KEY_LABELS[code] ?? (LABELLED_SET.has(code) ? QWERTY_GLYPHS[code].toUpperCase() : code);

export const defaultActionLabel = (id) => {
  const action = ACTION_BY_ID.get(id);
  if (!action)
    return '';
  if (action.kind === 'positional') {
    const code = POSITIONAL_LABEL_CODE[id];
    return code ? QWERTY_GLYPHS[code].toUpperCase() : staticCodeLabel(action.bindings[0].code);
  }
  return action.glyphs[0].toUpperCase();
};

const group = (title, actions) => Object.freeze({ title, actions: Object.freeze(actions.map(([id, name]) => Object.freeze({ id, name }))) });

export const CONTROL_GROUPS = Object.freeze([
  group('MOVEMENT', [
    ['moveForward', 'Move forward'], ['moveBack', 'Move back'], ['strafeLeft', 'Strafe left'], ['strafeRight', 'Strafe right'],
    ['turnLeft', 'Turn left'], ['turnRight', 'Turn right'], ['jump', 'Jump'], ['crouch', 'Crouch'], ['run', 'Run'],
  ]),
  group('COMBAT', [['fire', 'Fire'], ['grenade', 'Throw grenade'], ['use', 'Use / open doors'], ['nightVision', 'Night vision']]),
  group('WEAPONS', [['weapon1', 'Weapon slot 1'], ['weapon2', 'Weapon slot 2'], ['weapon3', 'Weapon slot 3'], ['weapon4', 'Weapon slot 4']]),
  group('INTERFACE', [
    ['automap', 'Automap'], ['automapGrid', 'Automap grid'], ['zoomIn', 'Automap zoom in'], ['zoomOut', 'Automap zoom out'],
    ['map', 'Minimap'], ['pause', 'Pause'], ['music', 'Music'], ['sound', 'Sound'], ['levelPrev', 'Previous level'],
    ['levelNext', 'Next level'], ['layoutCycle', 'Keyboard layout labels'], ['diagnostics', 'Diagnostics'], ['controls', 'Controls page'],
  ]),
]);

const BINDABLE_IDS = [];
for (const g of CONTROL_GROUPS)
  for (const a of g.actions)
    BINDABLE_IDS.push(a.id);
Object.freeze(BINDABLE_IDS);
const BINDABLE_SET = new Set(BINDABLE_IDS);

const DEFAULT_POSITIONAL_CODES = new Set();
for (const action of ACTIONS)
  if (action.kind === 'positional')
    for (const b of action.bindings)
      DEFAULT_POSITIONAL_CODES.add(b.code);

export const DEFAULT_HINT_LINES = buildHints(defaultActionLabel, 'auto (QWERTY)');

const defaultStorage = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export class Keymap {
  constructor({ storage = defaultStorage(), navigator = globalThis.navigator } = {}) {
    this.storage = storage;
    this.navigator = navigator;
    this.whichByCode = new Map();
    this.claimedWhich = new Set();
    for (const action of ACTIONS)
      for (const { code, which } of action.bindings) {
        this.claimedWhich.add(which);
        if (code && !this.whichByCode.has(code))
          this.whichByCode.set(code, which);
      }
    for (let i = 0; i < MOUSE_CODES.length; i++) {
      this.whichByCode.set(MOUSE_CODES[i], MOUSE_WHICH_BASE + i);
      this.claimedWhich.add(MOUSE_WHICH_BASE + i);
    }
    this.nextSyntheticWhich = SYNTHETIC_WHICH_BASE;
    this.positionalByCode = new Map();
    this.glyphWhich = new Map();
    this.fallbackByCode = new Map();
    this.actionByWhich = new Map();
    this.whichesByAction = new Map();
    this.allWhich = new Set();
    this.claimedGlyphs = new Set();
    for (const action of ACTIONS)
      for (const glyph of action.glyphs)
        this.claimedGlyphs.add(glyph);
    this.bindings = Object.freeze([]);
    this.overrides = new Map();
    this.effective = new Map();
    this.slots = new Map();
    this.unbound = Object.freeze([]);
    this.saveFailed = false;
    this.lastChange = { ok: false, stolenFrom: null, swapped: false, saved: false, code: '' };
    this.bindingsVersion = 0;
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
    const stored = this.readStorage(LAYOUT_STORAGE_KEY);
    this.override = LAYOUTS.includes(stored) ? stored : 'auto';
    this.version = 0;
    this.hintLines = DEFAULT_HINT_LINES;
    this.selectHint = DEFAULT_SELECT_HINT;
    this.load();
    this.rebuildLookups();
    this.requestLayoutMap();
  }

  readStorage(key) {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  writeStorage(key, value) {
    try {
      if (!this.storage)
        return false;
      this.storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  removeStorage(key) {
    try {
      if (!this.storage)
        return false;
      this.storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  whichFor(code) {
    const known = this.whichByCode.get(code);
    if (known !== undefined)
      return known;
    const legacy = LEGACY_KEYCODES[code];
    let which;
    if (legacy !== undefined && !this.claimedWhich.has(legacy))
      which = legacy;
    else
      which = this.nextSyntheticWhich++;
    this.whichByCode.set(code, which);
    this.claimedWhich.add(which);
    return which;
  }

  whichOfCode(code) {
    return this.positionalByCode.get(code) ?? 0;
  }

  isCustom(id) {
    return this.overrides.has(id);
  }

  effectiveCodes(id) {
    return this.effective.get(id) ?? NO_CODES;
  }

  slotCodes(id) {
    return this.slots.get(id) ?? NO_CODES;
  }

  unboundActions() {
    return this.unbound;
  }

  load() {
    this.overrides = new Map();
    const raw = this.readStorage(CONTROLS_STORAGE_KEY);
    if (typeof raw !== 'string')
      return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (!isPlainObject(data) || data.version !== CONTROLS_VERSION || !isPlainObject(data.bindings))
      return;
    const seen = new Set();
    for (const id of BINDABLE_IDS) {
      if (!Object.hasOwn(data.bindings, id))
        continue;
      const list = data.bindings[id];
      if (!Array.isArray(list) || list.length > MAX_SLOTS)
        continue;
      const kept = [];
      for (const entry of list) {
        if (typeof entry !== 'string' || entry.length < 1 || entry.length > MAX_CODE_LENGTH || RESERVED_CODES.has(entry))
          continue;
        const code = normalizeCode(entry);
        if (seen.has(code))
          continue;
        seen.add(code);
        kept.push(code);
      }
      if (kept.length > 0 || list.length === 0)
        this.overrides.set(id, Object.freeze(kept));
    }
  }

  reload() {
    this.load();
    this.rebuildLookups();
    this.bindingsVersion++;
    this.version++;
  }

  save() {
    let result;
    if (this.overrides.size === 0)
      result = this.removeStorage(CONTROLS_STORAGE_KEY);
    else {
      const bindings = {};
      for (const id of BINDABLE_IDS) {
        const codes = this.overrides.get(id);
        if (codes)
          bindings[id] = Array.from(codes);
      }
      result = this.writeStorage(CONTROLS_STORAGE_KEY, JSON.stringify({ version: CONTROLS_VERSION, bindings }));
    }
    this.saveFailed = !result;
    return result;
  }

  rebuildLookups() {
    this.positionalByCode.clear();
    this.glyphWhich.clear();
    this.fallbackByCode.clear();
    this.actionByWhich.clear();
    this.whichesByAction.clear();
    this.allWhich.clear();
    const flat = [];
    const claimedByOverride = new Set();
    for (const codes of this.overrides.values())
      for (const code of codes)
        for (const expanded of expandCode(code))
          claimedByOverride.add(expanded);
    this.claimedByOverride = claimedByOverride;
    for (const action of ACTIONS) {
      if (this.overrides.has(action.id))
        continue;
      const whiches = [];
      for (const { code, which } of action.bindings) {
        if (code && claimedByOverride.has(code))
          continue;
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
      const first = action.bindings[0];
      if (!(first.code && claimedByOverride.has(first.code)))
        for (const glyph of action.glyphs) {
          this.glyphWhich.set(glyph, first.which);
          this.glyphWhich.set(glyph.toUpperCase(), first.which);
        }
    }
    for (const [id, codes] of this.overrides) {
      const whiches = [];
      for (const code of codes)
        for (const expanded of expandCode(code)) {
          const which = this.whichFor(expanded);
          flat.push(Object.freeze({ action: id, code: expanded, which }));
          whiches.push(which);
          this.allWhich.add(which);
          this.actionByWhich.set(which, id);
          this.positionalByCode.set(expanded, which);
        }
      this.whichesByAction.set(id, Object.freeze(whiches));
    }
    this.bindings = Object.freeze(flat);
    this.rebuild();
  }

  computeDefaultCodes(id, positional, claimed) {
    const action = ACTION_BY_ID.get(id);
    const out = [];
    const add = (code) => {
      if (code && !claimed.has(code) && !out.includes(code))
        out.push(code);
    };
    if (action.kind === 'positional') {
      for (const b of action.bindings)
        add(b.code && normalizeCode(b.code));
      return out;
    }
    for (const glyph of action.glyphs)
      for (const code of LABELLED_CODES)
        if (!positional.has(code) && this.glyphOf(code) === glyph) {
          add(code);
          break;
        }
    for (const b of action.bindings)
      if (b.code && !LABELLED_SET.has(b.code))
        add(b.code);
    if (out.length === 0)
      for (const b of action.bindings)
        if (b.code && LABELLED_SET.has(b.code) && !positional.has(b.code))
          add(b.code);
    return out;
  }

  defaultCodes(id) {
    return this.computeDefaultCodes(id, DEFAULT_POSITIONAL_CODES, NO_CLAIMS);
  }

  computeEffective(id) {
    const stored = this.overrides.get(id);
    if (stored)
      return stored;
    return this.computeDefaultCodes(id, this.positionalByCode, this.claimedByOverride);
  }

  codeLabel(code) {
    if (LABELLED_SET.has(code))
      return this.labelOf(code) ?? code;
    return NAMED_KEY_LABELS[code] ?? code;
  }

  actionLabel(id) {
    const codes = this.effectiveCodes(id);
    if (codes.length === 0)
      return 'UNBOUND';
    if (!this.overrides.has(id)) {
      const action = ACTION_BY_ID.get(id);
      if (action.kind === 'mnemonic')
        return this.mnemonicLabel(action);
      const code = POSITIONAL_LABEL_CODE[id];
      if (code)
        return this.labelOf(code);
    }
    return this.codeLabel(codes[0]);
  }

  materialise(id, codes) {
    this.overrides.set(id, Object.freeze(codes.slice(0, MAX_SLOTS)));
  }

  beginChange(code = '') {
    const change = this.lastChange;
    change.ok = false;
    change.stolenFrom = null;
    change.swapped = false;
    change.saved = false;
    change.code = code;
    return change;
  }

  commit(change) {
    this.rebuildLookups();
    this.bindingsVersion++;
    this.version++;
    change.ok = true;
    change.saved = this.save();
    return change;
  }

  stealFrom(code, exceptId, change) {
    for (const other of BINDABLE_IDS) {
      if (other === exceptId)
        continue;
      const codes = this.effectiveCodes(other);
      const at = codes.indexOf(code);
      if (at < 0)
        continue;
      const rest = codes.filter((c) => c !== code);
      this.materialise(other, rest);
      change.stolenFrom ??= other;
    }
  }

  setBinding(id, slot, rawCode) {
    const change = this.beginChange(typeof rawCode === 'string' ? rawCode : '');
    if (!BINDABLE_SET.has(id) || (slot !== 0 && slot !== 1) || typeof rawCode !== 'string'
      || rawCode.length < 1 || rawCode.length > MAX_CODE_LENGTH || RESERVED_CODES.has(rawCode))
      return change;
    const code = normalizeCode(rawCode);
    change.code = code;
    const current = this.effectiveCodes(id).slice(0, MAX_SLOTS);
    const at = current.indexOf(code);
    if (at === slot || (at >= 0 && slot >= current.length)) {
      change.ok = true;
      return change;
    }
    if (at >= 0) {
      current[at] = current[slot];
      current[slot] = code;
      change.swapped = true;
    } else if (slot < current.length)
      current[slot] = code;
    else
      current.push(code);
    this.overrides.set(id, Object.freeze(current));
    this.stealFrom(code, id, change);
    return this.commit(change);
  }

  clearBinding(id, slot) {
    const change = this.beginChange();
    if (!BINDABLE_SET.has(id))
      return change;
    const current = this.effectiveCodes(id).slice(0, MAX_SLOTS);
    if (!(slot >= 0 && slot < current.length))
      return change;
    change.code = current[slot];
    current.splice(slot, 1);
    this.overrides.set(id, Object.freeze(current));
    return this.commit(change);
  }

  resetAction(id) {
    const change = this.beginChange();
    if (!BINDABLE_SET.has(id))
      return change;
    const codes = this.defaultCodes(id);
    this.overrides.delete(id);
    for (let i = 0; i < codes.length; i++)
      this.stealFrom(codes[i], id, change);
    return this.commit(change);
  }

  resetAll() {
    const change = this.beginChange();
    this.overrides.clear();
    this.rebuildLookups();
    this.bindingsVersion++;
    this.version++;
    change.ok = true;
    change.saved = this.removeStorage(CONTROLS_STORAGE_KEY);
    this.saveFailed = !change.saved;
    return change;
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
    this.writeStorage(LAYOUT_STORAGE_KEY, this.override);
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
    this.effective.clear();
    this.slots.clear();
    const unbound = [];
    for (const id of BINDABLE_IDS) {
      const codes = Object.freeze(this.computeEffective(id).slice());
      this.effective.set(id, codes);
      this.slots.set(id, codes.length > MAX_SLOTS ? Object.freeze(codes.slice(0, MAX_SLOTS)) : codes);
      if (codes.length === 0)
        unbound.push(id);
    }
    this.unbound = Object.freeze(unbound);
    this.hintLines = buildHints((id) => this.actionLabel(id), this.override === 'auto' ? `auto (${this.layoutName})` : this.layoutName, this.overrides);
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
