import assert from 'node:assert/strict';

const { GraphicsSettings, GRAPHICS_STORAGE_KEY, GLOW_OFF, GLOW_LOW, GLOW_HIGH } = await import('../src/graphics.js');
const { OptionsMenu, OPTION_CONTROLS, OPTIONS_PAGE_ROOT, OPTIONS_PAGE_GRAPHICS } = await import('../src/options.js');
const { NAV_UP, NAV_DOWN, NAV_LEFT, NAV_RIGHT, NAV_NONE } = await import('../src/input.js');

const memoryStorage = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), data };
};
const makeInput = () => ({
  nav: NAV_NONE,
  taken: new Set(),
  mousePos: { x: 0, y: 0 },
  mouseMoved: false,
  navigate() { return this.nav; },
  took(name) { return this.taken.has(name); },
});
const game = { zero: {}, emit() {} };
const press = (input, menu, nav, taken) => {
  input.nav = nav;
  input.taken = new Set(taken ? [taken] : []);
  menu.update(false, game);
  input.nav = NAV_NONE;
  input.taken.clear();
};

const checks = [
  ['AC-2 GraphicsSettings preserves its high-quality defaults', () => {
    const s = new GraphicsSettings(memoryStorage());
    assert.equal(s.presetName, 'high');
    assert.equal(s.scale, 1);
    assert.equal(s.glow, GLOW_HIGH);
    assert.equal(s.hudGlow, true);
  }],
  ['AC-3 forward preset cycling preserves order and wraps from low to high', () => {
    const s = new GraphicsSettings(memoryStorage());
    s.cyclePreset(1);
    assert.equal(s.presetName, 'medium');
    assert.equal(s.glow, GLOW_LOW);
    s.cyclePreset(1);
    assert.equal(s.presetName, 'low');
    assert.equal(s.glow, GLOW_OFF);
    assert.equal(s.hudGlow, false);
    assert.equal(s.scale, 0.5);
    s.cyclePreset(1);
    assert.equal(s.presetName, 'high');
  }],
  ['AC-3 preset cycling preserves named and custom transitions in both directions', () => {
    const named = new GraphicsSettings(memoryStorage());
    named.cyclePreset(-1);
    assert.equal(named.presetName, 'low');
    named.cyclePreset(-1);
    assert.equal(named.presetName, 'medium');
    named.cyclePreset(-1);
    assert.equal(named.presetName, 'high');

    const customForward = new GraphicsSettings(memoryStorage());
    customForward.toggleHudGlow();
    assert.equal(customForward.presetName, 'custom');
    customForward.cyclePreset(1);
    assert.equal(customForward.presetName, 'high');

    const customBackward = new GraphicsSettings(memoryStorage());
    customBackward.toggleHudGlow();
    assert.equal(customBackward.presetName, 'custom');
    customBackward.cyclePreset(-1);
    assert.equal(customBackward.presetName, 'low');
  }],
  ['AC-3 changing one option makes the preset custom, and every change bumps version', () => {
    const s = new GraphicsSettings(memoryStorage());
    const v = s.version;
    s.toggleHudGlow();
    assert.equal(s.presetName, 'custom');
    assert.ok(s.version > v);
  }],
  ['AC-4 settings persist across reloads and malformed or out-of-range data preserves defaults', () => {
    const storage = memoryStorage();
    const a = new GraphicsSettings(storage);
    a.applyPreset('low');
    const b = new GraphicsSettings(storage);
    assert.equal(b.presetName, 'low');
    storage.data.set(GRAPHICS_STORAGE_KEY, '{"version":1,"resolution":99,"adaptive":"x","glow":99,"hudGlow":0}');
    const c = new GraphicsSettings(storage);
    assert.equal(c.presetName, 'high');
    assert.equal(c.scale, 1);
    assert.equal(c.glow, GLOW_HIGH);
    storage.data.set(GRAPHICS_STORAGE_KEY, 'not json');
    assert.equal(new GraphicsSettings(storage).presetName, 'high');
    assert.equal(new GraphicsSettings(null).presetName, 'high');
  }],
  ['options root: CONTROLS signals main.js for one frame, GRAPHICS opens its page, BACK closes', () => {
    const input = makeInput();
    const menu = new OptionsMenu(input, new GraphicsSettings(memoryStorage()));
    menu.open('title');
    assert.equal(menu.view.page, OPTIONS_PAGE_ROOT);
    press(input, menu, NAV_NONE, 'confirm');
    assert.equal(menu.activated, OPTION_CONTROLS);
    press(input, menu, NAV_NONE);
    assert.equal(menu.activated, '');
    press(input, menu, NAV_DOWN);
    press(input, menu, NAV_NONE, 'confirm');
    assert.equal(menu.view.page, OPTIONS_PAGE_GRAPHICS);
    press(input, menu, NAV_NONE, 'menu');
    assert.equal(menu.view.page, OPTIONS_PAGE_ROOT);
    assert.equal(menu.view.cursor, 1);
    press(input, menu, NAV_NONE, 'menu');
    assert.equal(menu.isOpen, false);
  }],
  ['graphics page: left/right change the focused value and the view text follows', () => {
    const input = makeInput();
    const settings = new GraphicsSettings(memoryStorage());
    const menu = new OptionsMenu(input, settings);
    menu.open('paused');
    press(input, menu, NAV_DOWN);
    press(input, menu, NAV_NONE, 'confirm');
    const rows = menu.view.rows;
    assert.equal(rows[0].value, 'HIGH');
    press(input, menu, NAV_RIGHT);
    assert.equal(rows[0].value, 'MEDIUM');
    press(input, menu, NAV_DOWN);
    press(input, menu, NAV_LEFT);
    assert.equal(settings.resolution, 0);
    assert.equal(rows[1].value, settings.resolutionText);
    assert.equal(rows[0].value, 'CUSTOM');
    press(input, menu, NAV_UP);
    press(input, menu, NAV_RIGHT);
    assert.notEqual(rows[0].value, 'CUSTOM');
  }],
  ['mouse hover moves the cursor and click activates the hovered row', () => {
    const input = makeInput();
    const menu = new OptionsMenu(input, new GraphicsSettings(memoryStorage()), { hitAt: () => 1 });
    menu.open('title');
    input.mouseMoved = true;
    press(input, menu, NAV_NONE);
    assert.equal(menu.view.cursor, 1);
    input.mouseMoved = false;
    press(input, menu, NAV_NONE, 'Click');
    assert.equal(menu.view.page, OPTIONS_PAGE_GRAPHICS);
  }],
  ['AC-1 returnFromControls switches to root page and resets cursor to 0', () => {
    const input = makeInput();
    const menu = new OptionsMenu(input, new GraphicsSettings(memoryStorage()));
    menu.open('title');
    press(input, menu, NAV_DOWN);
    press(input, menu, NAV_NONE, 'confirm');
    assert.equal(menu.view.page, OPTIONS_PAGE_GRAPHICS);
    press(input, menu, NAV_DOWN);
    press(input, menu, NAV_DOWN);
    press(input, menu, NAV_DOWN);
    assert.equal(menu.view.cursor, 3);
    menu.returnFromControls();
    assert.equal(menu.view.page, OPTIONS_PAGE_ROOT);
    assert.equal(menu.view.cursor, 0);
  }],
  ['AC-2 returnState reports the state passed to open()', () => {
    const menu = new OptionsMenu(makeInput(), new GraphicsSettings(memoryStorage()));
    menu.open('paused');
    assert.equal(menu.returnState, 'paused');
    menu.open('title');
    assert.equal(menu.returnState, 'title');
  }],
  ['AC-3 blocked update moves cursor but ignores confirm, jump, menu, and Click', () => {
    const input = makeInput();
    const menu = new OptionsMenu(input, new GraphicsSettings(memoryStorage()), { hitAt: () => 1 });
    menu.open('title');
    const pressBlocked = (nav, taken) => {
      input.nav = nav;
      input.taken = new Set(taken ? [taken] : []);
      menu.update(true, game);
      input.nav = NAV_NONE;
      input.taken.clear();
    };
    pressBlocked(NAV_DOWN);
    assert.equal(menu.view.cursor, 1);
    pressBlocked(NAV_NONE, 'confirm');
    pressBlocked(NAV_NONE, 'jump');
    pressBlocked(NAV_NONE, 'menu');
    input.mouseMoved = false;
    pressBlocked(NAV_NONE, 'Click');
    assert.equal(menu.view.page, OPTIONS_PAGE_ROOT);
    assert.equal(menu.isOpen, true);
    assert.equal(menu.view.cursor, 1);
    assert.equal(menu.activated, '');
  }],
  ['AC-4 jump input activates the selected row like confirm', () => {
    const input = makeInput();
    const menu = new OptionsMenu(input, new GraphicsSettings(memoryStorage()));
    menu.open('title');
    press(input, menu, NAV_DOWN);
    press(input, menu, NAV_NONE, 'jump');
    assert.equal(menu.view.page, OPTIONS_PAGE_GRAPHICS);
    press(input, menu, NAV_NONE, 'menu');
    assert.equal(menu.view.page, OPTIONS_PAGE_ROOT);
    press(input, menu, NAV_UP);
    assert.equal(menu.view.cursor, 0);
    press(input, menu, NAV_NONE, 'jump');
    assert.equal(menu.activated, OPTION_CONTROLS);
    press(input, menu, NAV_NONE);
    assert.equal(menu.activated, '');
  }],
  ['AC-5 adaptive toggles and glow cycles OFF, LOW, HIGH through the menu', () => {
    const input = makeInput();
    const settings = new GraphicsSettings(memoryStorage());
    const menu = new OptionsMenu(input, settings);
    menu.open('paused');
    press(input, menu, NAV_DOWN);
    press(input, menu, NAV_NONE, 'confirm');
    press(input, menu, NAV_DOWN);
    press(input, menu, NAV_DOWN);
    press(input, menu, NAV_RIGHT);
    assert.equal(settings.adaptive, false);
    assert.equal(menu.view.rows[2].value, 'OFF');
    press(input, menu, NAV_DOWN);
    assert.equal(settings.glow, GLOW_HIGH);
    const seen = [];
    for (let i = 0; i < 3; i++) {
      press(input, menu, NAV_RIGHT);
      seen.push(menu.view.rows[3].value);
    }
    assert.deepEqual(seen, ['OFF', 'LOW', 'HIGH']);
  }],
  ['AC-4 BACK on root closes the menu and BACK on graphics returns to root', () => {
    const input = makeInput();
    const menu = new OptionsMenu(input, new GraphicsSettings(memoryStorage()));
    menu.open('title');
    press(input, menu, NAV_DOWN);
    press(input, menu, NAV_DOWN);
    press(input, menu, NAV_NONE, 'confirm');
    assert.equal(menu.isOpen, false);

    const againInput = makeInput();
    const again = new OptionsMenu(againInput, new GraphicsSettings(memoryStorage()));
    again.open('title');
    press(againInput, again, NAV_DOWN);
    press(againInput, again, NAV_NONE, 'confirm');
    assert.equal(again.view.page, OPTIONS_PAGE_GRAPHICS);
    for (let i = 0; i < 5; i++)
      press(againInput, again, NAV_DOWN);
    assert.equal(again.view.cursor, 5);
    press(againInput, again, NAV_NONE, 'confirm');
    assert.equal(again.view.page, OPTIONS_PAGE_ROOT);
    assert.equal(again.view.cursor, 1);
  }],
  ['AC-6 cycleGlow wraps forward and backward', () => {
    const s = new GraphicsSettings(memoryStorage());
    assert.equal(s.glow, GLOW_HIGH);
    s.cycleGlow(1);
    assert.equal(s.glow, GLOW_OFF);
    s.cycleGlow(-1);
    assert.equal(s.glow, GLOW_HIGH);
    s.applyPreset('low');
    assert.equal(s.glow, GLOW_OFF);
    s.cycleGlow(-1);
    assert.equal(s.glow, GLOW_HIGH);
    s.cycleGlow(1);
    assert.equal(s.glow, GLOW_OFF);
    s.cycleGlow(1);
    assert.equal(s.glow, GLOW_LOW);
    s.cycleGlow(-1);
    assert.equal(s.glow, GLOW_OFF);
  }],
  ['AC-7 applyPreset returns false for unknown preset without mutation', () => {
    const s = new GraphicsSettings(memoryStorage());
    const before = { resolution: s.resolution, adaptive: s.adaptive, glow: s.glow, hudGlow: s.hudGlow, version: s.version };
    assert.equal(s.applyPreset('nope'), false);
    assert.equal(s.resolution, before.resolution);
    assert.equal(s.adaptive, before.adaptive);
    assert.equal(s.glow, before.glow);
    assert.equal(s.hudGlow, before.hudGlow);
    assert.equal(s.version, before.version);
    assert.equal(s.presetName, 'high');
  }],
  ['AC-8 throwing storage is handled by load and save without escaping errors', () => {
    const throwingStorage = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
    };
    let s;
    assert.doesNotThrow(() => { s = new GraphicsSettings(throwingStorage); });
    assert.equal(s.presetName, 'high');
    assert.doesNotThrow(() => s.toggleHudGlow());
    assert.equal(s.hudGlow, false);
    assert.doesNotThrow(() => s.save());
  }],
];

console.log('# file: tests/options-menu.test.mjs');
let failed = 0;
for (const [name, fn] of checks) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${name}\n     ${error.message}`);
  }
}
if (failed > 0)
  process.exit(1);
