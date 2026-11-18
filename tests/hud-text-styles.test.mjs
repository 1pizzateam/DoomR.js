import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Hud } from '../src/hud.js';
import { Game } from '../src/game.js';
import { WEAPONS } from '../src/weapon.js';

const hudSrc = readFileSync(new URL('../src/hud.js', import.meta.url), 'utf8');

function body(src, name) {
  const match = new RegExp(`^\\s*${name}\\s*\\([^)]*\\)\\s*\\{`, 'm').exec(src);
  assert.ok(match, `declaration of ${name} not found`);
  const open = src.indexOf('{', match.index + match[0].length - 1);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{')
      depth++;
    else if (src[i] === '}' && --depth === 0)
      return src.slice(open + 1, i);
  }
  throw new Error(`unbalanced braces for ${name}`);
}

const makeHud = (ctx = new Proxy({}, { get: () => () => {}, set: () => true })) => {
  const hud = new Hud({ width: 800, height: 600, getContext: () => ctx }, null);
  hud.resize(800, 600, 1);
  return hud;
};

// Records the destructured style (with Hud.text defaults) at call time plus the style reference.
const spyText = (hud) => {
  const calls = [];
  hud.text = (str, x, y, color, style = {}) => {
    const { size = 14, align = 'left', alpha = 1, weight = 600, glow = 6 } = style;
    calls.push({ str, color, style, seen: { size, align, alpha, weight, glow } });
  };
  return calls;
};

const find = (calls, str) => calls.find((c) => c.str === str);
const player = (extra = {}) => ({
  health: 80,
  armor: 50,
  armorType: 'green',
  weapon: 'shotgun',
  weapons: { shotgun: true, chainsaw: true, chaingun: false, rocket: true },
  bullets: 40,
  shells: 8,
  rockets: 2,
  grenades: 2,
  keys: {},
  ...extra,
});

const tests = {
  'AC-1 static labels reuse identical frozen style objects across frames'() {
    const hud = makeHud();
    const calls = spyText(hud);
    const frame = () => {
      calls.length = 0;
      const p = player({ weapon: 'knife', weapons: { knife: true } });
      hud.drawArmor(10, 100, p);
      hud.drawArms(10, 100, p);
      hud.drawKeys(10, 100, p.keys);
      hud.drawGrenades(300, 100, p);
      hud.drawAmmo(300, 100, p, WEAPONS.knife ?? { ammoType: null });
      return calls.slice();
    };
    const a = frame();
    const b = frame();
    for (const label of ['ARMOR', 'ARMS', 'KEYS', 'GRENADES', 'MELEE', '--']) {
      const first = find(a, label);
      const second = find(b, label);
      assert.ok(first && second, `AC-1: ${label} drawn`);
      assert.equal(first.style, second.style, `AC-1: ${label} style reused across frames`);
      assert.ok(Object.isFrozen(first.style), `AC-1: ${label} style frozen`);
    }
    assert.equal(find(a, 'ARMOR').style, find(a, 'ARMS').style, 'AC-1: shared label style');
    assert.deepEqual(find(a, 'ARMOR').seen, { size: 11, align: 'left', alpha: 0.8, weight: 600, glow: 6 });
  },

  'AC-2 dynamic calls share one scratch style reference and method bodies have no inline text style literals'() {
    const hud = makeHud();
    const calls = spyText(hud);
    const p = player({ berserk: true, radSuit: 10, hasNightVision: true, nightVisionBattery: 20, nightVisionActive: true,
      ammoFlash: { shells: 0.3, bullets: 0.2 }, ammoDelta: { shells: 4, bullets: 6 }, ammoFrom: { shells: 4, bullets: 34 } });
    hud.drawArmor(10, 100, p);
    hud.drawArms(10, 100, p);
    hud.drawAmmo(300, 100, p, WEAPONS.shotgun);
    hud.drawPowerups(10, 100, p);
    const scratch = find(calls, '2').style;
    assert.ok(!Object.isFrozen(scratch), 'AC-2: scratch is mutable');
    for (const c of calls.filter((x) => /^(\d|\+|RAD|NVG)/.test(x.str)))
      assert.equal(c.style, scratch, `AC-2: ${c.str} uses the shared scratch`);
    for (const name of ['drawHud', 'drawArms', 'drawAmmo', 'drawArmor', 'drawPowerups']) {
      const src = body(hudSrc, name);
      assert.ok(!/this\.text\([^;]*\{\s*size/s.test(src), `AC-2: ${name} has no inline style literal`);
    }
  },

  'AC-3 scratch style never leaks fields between consecutive calls'() {
    const hud = makeHud();
    const calls = spyText(hud);
    const flashing = player({ ammoFlash: { shells: 0.3 }, ammoDelta: { shells: 4 }, ammoFrom: { shells: 4 } });
    hud.drawAmmo(300, 100, flashing, WEAPONS.shotgun);
    hud.drawArmor(10, 100, player());
    const armorNum = find(calls, '50');
    assert.deepEqual(armorNum.seen, { size: 20, align: 'left', alpha: 1, weight: 700, glow: 6 });
    calls.length = 0;
    hud.drawArms(10, 100, player());
    hud.drawArmor(10, 100, player({ armor: 0 }));
    const zero = find(calls, '0');
    assert.deepEqual(zero.seen, { size: 20, align: 'left', alpha: 0.4, weight: 700, glow: 6 });
  },

  'AC-4 arms slot digit styles for active owned unowned'() {
    const hud = makeHud();
    const calls = spyText(hud);
    hud.drawArms(10, 100, player({ weapon: 'shotgun' }));
    assert.deepEqual(find(calls, '2').seen, { size: 12, align: 'center', weight: 800, alpha: 1, glow: 10 });
    assert.deepEqual(find(calls, '1').seen, { size: 12, align: 'center', weight: 600, alpha: 0.9, glow: 4 });
    assert.deepEqual(find(calls, '3').seen, { size: 12, align: 'center', weight: 600, alpha: 0.32, glow: 4 });
  },

  'AC-5 ammo styles with and without ammoFlash'() {
    const hud = makeHud();
    const calls = spyText(hud);
    hud.drawAmmo(300, 100, player(), WEAPONS.shotgun);
    assert.deepEqual(find(calls, 'SHELLS')?.seen ?? calls[0].seen, { size: 11, align: 'right', alpha: 0.8, weight: 600, glow: 6 });
    assert.deepEqual(calls[1].seen, { size: 20, align: 'right', alpha: 1, weight: 700, glow: 6 });
    calls.length = 0;
    hud.drawAmmo(300, 100, player({ ammoFlash: { shells: 0.3 }, ammoDelta: { shells: 4 }, ammoFrom: { shells: 4 } }), WEAPONS.shotgun);
    assert.deepEqual(calls[0].seen, { size: 11, align: 'right', alpha: 1, weight: 600, glow: 12 });
    assert.equal(calls[1].seen.weight, 800);
    assert.equal(calls[1].seen.glow, 16);
    assert.equal(calls[1].seen.align, 'right');
    assert.ok(calls[1].seen.size >= 20);
    const badge = calls.find((c) => c.str === '+4');
    assert.equal(badge.seen.weight, 800);
    assert.equal(badge.seen.glow, 12);
    assert.equal(badge.seen.size, 12);
  },

  'AC-6 powerup badge alpha for berserk rad suit and night vision'() {
    const hud = makeHud();
    const calls = spyText(hud);
    hud.drawPowerups(10, 100, { berserk: true, radSuit: 10, hasNightVision: true, nightVisionBattery: 20, nightVisionActive: true });
    assert.deepEqual(find(calls, 'BERSERK').seen, { size: 11, align: 'left', alpha: 0.95, weight: 700, glow: 6 });
    assert.deepEqual(find(calls, 'RAD 10s').seen, { size: 11, align: 'left', alpha: 0.95, weight: 700, glow: 6 });
    assert.equal(find(calls, 'NVG 44%').seen.alpha, 0.95);
    calls.length = 0;
    hud.drawPowerups(10, 100, { radSuit: 4.8, hasNightVision: true, nightVisionBattery: 20, nightVisionActive: false });
    assert.equal(find(calls, 'RAD 5s').seen.alpha, 0.3);
    assert.equal(find(calls, 'NVG 44%').seen.alpha, 0.72);
  },

  'AC-7 drawHud completes and text writes match expected font alpha with proxy context'() {
    const writes = [];
    const ctx = new Proxy({}, {
      get: () => () => {},
      set: (_, key, value) => {
        writes.push([key, value]);
        return true;
      },
    });
    const hud = new Hud(
      { width: 800, height: 600, getContext: () => ctx },
      { clear() {}, glow: { line() {} }, crisp: { fillRect() {}, rectLine() {}, line() {}, circleLine() {}, weapon: { quad() {} }, sprites: { quad() {} }, face: { quad() {} } } },
    );
    hud.resize(800, 600, 1);
    const game = new Game();
    game.load(0, { health: 80, shells: 8, bullets: 40, rockets: 2, weapons: { shotgun: true, chainsaw: true }, weapon: 'shotgun' });
    game.state = 'play';
    Object.assign(game.player, { berserk: true, radSuit: 10, hasNightVision: true, nightVisionBattery: 20, nightVisionActive: true });
    game.player.ammoFlash = { shells: 0.3 };
    game.player.ammoDelta = { shells: 4 };
    hud.drawHud(game);
    const fonts = writes.filter(([k]) => k === 'font').map(([, v]) => v);
    const alphas = writes.filter(([k]) => k === 'globalAlpha').map(([, v]) => v);
    assert.ok(fonts.some((f) => f.startsWith('700 20px')), 'AC-7: health number font');
    assert.ok(fonts.some((f) => f.startsWith('800 ')), 'AC-7: active slot / flash font');
    assert.ok(alphas.includes(0.8) && alphas.includes(0.95), 'AC-7: label and badge alphas');
  },
};

console.log('# file: tests/hud-text-styles.test.mjs');
let failed = false;
for (const [name, fn] of Object.entries(tests)) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed = true;
    console.log(`not ok   ${name}\n${error.stack}`);
  }
}
if (failed)
  process.exit(1);
