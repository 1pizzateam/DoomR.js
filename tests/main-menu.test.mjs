import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { MainMenu, MENU_PLAY, MENU_OPTIONS, MENU_NONE } = await import('../src/menu.js');
const { NAV_UP, NAV_DOWN, NAV_NONE } = await import('../src/input.js');
const { Hud, layoutControls, layoutMainMenu } = await import('../src/hud.js');
const { Vec2 } = await import('@1pizzateam/spock');
const mainSrc = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

const makeInput = () => ({
  nav: NAV_NONE,
  taken: new Set(),
  mousePos: { x: 0, y: 0 },
  mouseMoved: false,
  navigate() { return this.nav; },
  took(name) { return this.taken.has(name); },
});

const makeHud = (width, height) => {
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
  const hud = new Hud({ width, height, getContext: () => ctx }, null);
  hud.width = width;
  hud.height = height;
  return hud;
};

const centerOf = (L, i) => ({ x: L.x + L.buttonW / 2, y: L.tops[i] + L.buttonH / 2 });

const checks = [
  ['AC-1 MainMenu starts on PLAY with frozen play/options items', () => {
    const m = new MainMenu(makeInput());
    assert.ok(Object.isFrozen(m.items));
    assert.deepEqual(m.items.map((i) => i.id), [MENU_PLAY, MENU_OPTIONS]);
    assert.equal(m.cursor, 0);
    assert.equal(m.activated, MENU_NONE);
  }],
  ['AC-2 navigate down/up wraps between PLAY and OPTIONS', () => {
    const input = makeInput();
    const m = new MainMenu(input);
    input.nav = NAV_DOWN;
    m.update(false);
    assert.equal(m.cursor, 1);
    m.update(false);
    assert.equal(m.cursor, 0);
    input.nav = NAV_UP;
    m.update(false);
    assert.equal(m.cursor, 1);
  }],
  ['AC-3 confirm activates the focused item for one frame only', () => {
    const input = makeInput();
    const m = new MainMenu(input);
    m.cursor = 1;
    input.taken.add('confirm');
    m.update(false);
    assert.equal(m.activated, MENU_OPTIONS);
    input.taken.clear();
    m.update(false);
    assert.equal(m.activated, MENU_NONE);
    m.cursor = 0;
    input.taken.add('confirm');
    m.update(false);
    assert.equal(m.activated, MENU_PLAY);
  }],
  ['AC-4 hover focuses, click activates only inside a button, empty-space click does nothing', () => {
    const hud = makeHud(800, 600);
    const input = makeInput();
    const m = new MainMenu(input, { hitAt: (p) => hud.menuHitAt(p) });
    const L = layoutMainMenu(new Vec2(800, 600));
    input.mousePos = centerOf(L, 1);
    input.mouseMoved = true;
    m.update(false);
    assert.equal(m.cursor, 1);
    input.mouseMoved = false;
    input.mousePos = centerOf(L, 0);
    input.taken.add('Click');
    m.update(false);
    assert.equal(m.activated, MENU_PLAY);
    input.mousePos = { x: 2, y: 2 };
    m.update(false);
    assert.equal(m.activated, MENU_NONE);
    assert.equal(m.cursor, 0);
  }],
  ['AC-5 button rects do not overlap, keep 12px gap and 34px height at 320x480 and 960x600, and menuHitAt agrees with the drawn rects', () => {
    for (const [w, h] of [[320, 480], [960, 600]]) {
      const hud = makeHud(w, h);
      const L = layoutMainMenu(new Vec2(w, h));
      assert.ok(L.tops[1] - (L.tops[0] + L.buttonH) >= 12);
      assert.ok(L.buttonH >= 34);
      for (let i = 0; i < 2; i++) {
        const c = centerOf(L, i);
        assert.equal(hud.menuHitAt(c), i);
        assert.equal(hud.menuHitAt({ x: c.x, y: L.tops[i] - 1 }), -1);
        assert.equal(hud.menuHitAt({ x: c.x, y: L.tops[i] + L.buttonH }), -1);
        assert.equal(hud.menuHitAt({ x: L.x - 1, y: c.y }), -1);
        assert.equal(hud.menuHitAt({ x: L.x + L.buttonW + 1, y: c.y }), -1);
      }
      assert.ok(L.x >= 0 && L.x + L.buttonW <= w);
      assert.ok(L.tops[1] + L.buttonH <= h);
    }
  }],
  ['AC-6 controlsButtonAt is false on the title splash and true for the paused link', () => {
    const hud = makeHud(800, 600);
    const title = { state: 'title', selectingDifficulty: false };
    const paused = { state: 'paused', selectingDifficulty: false };
    const pos = { x: 400, y: 300 + 58 - 4 };
    assert.equal(hud.controlsButtonAt({ x: 400, y: 300 + 80 - 4 }, title), false);
    assert.equal(hud.controlsButtonAt(pos, title), false);
    assert.equal(hud.controlsButtonAt(pos, paused), true);
  }],
  ['AC-7 blocked update never activates a click on a button', () => {
    const hud = makeHud(800, 600);
    const input = makeInput();
    const m = new MainMenu(input, { hitAt: (p) => hud.menuHitAt(p) });
    input.mousePos = centerOf(layoutMainMenu(new Vec2(800, 600)), 0);
    input.taken.add('Click');
    input.taken.add('confirm');
    m.update(true);
    assert.equal(m.activated, MENU_NONE);
  }],
  ['AC-8 main.js wires PLAY to selectingDifficulty and OPTIONS to controlsMenu.open(\'title\') (source assertions), and focus(MENU_PLAY)/cursor persistence on OPTIONS are checked on the model', () => {
    assert.match(mainSrc, /mainMenu\.activated === MENU_PLAY\)\s*\{\s*game\.selectingDifficulty = true;/);
    assert.match(mainSrc, /mainMenu\.activated === MENU_OPTIONS\)\s*controlsMenu\.open\('title'\)/);
    assert.match(mainSrc, /game\.selectingDifficulty = false;\s*mainMenu\.focus\(MENU_PLAY\);/);
    const input = makeInput();
    const m = new MainMenu(input);
    m.focus(MENU_OPTIONS);
    m.focus('unknown');
    assert.equal(m.cursor, 1);
    assert.equal(m.view.cursor, 1);
    m.focus(MENU_PLAY);
    assert.equal(m.cursor, 0);
  }],
  ['AC-4 layout functions accept a viewportSize Vec2', () => {
    const src = readFileSync(new URL('../src/hud.js', import.meta.url), 'utf8');
    assert.match(src, /layoutMainMenu = \(viewportSize\) =>/);
    assert.match(src, /layoutControls = \(viewportSize\) =>/);
    assert.match(src, /layoutHints = \(hints, viewportSize\) =>/);
    const a = layoutMainMenu(new Vec2(1280, 760));
    assert.ok(a && typeof a === 'object');
    assert.ok(layoutControls(new Vec2(1280, 760)));
  }],
];

console.log('# file: tests/main-menu.test.mjs');
for (const [name, fn] of checks) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}
