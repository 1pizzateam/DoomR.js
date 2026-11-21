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

  'AC-1 layoutOptions geometry calculations match viewport dimensions and row counts'() {
    // Tests layoutOptions geometry calculation via optionsHitAt across various viewport dimensions
    // and row counts, asserting clamp of boxW (280..440), boxH (64 + rows * 34 + 52),
    // boxX ((w - boxW) / 2), boxY (Math.max(8, h / 2 - boxH / 2)), rowsTop (boxY + 56), and valueX (boxX + boxW - 36).
    const hud = makeHud();

    const checkView = (w, h, rowCount) => {
      hud.resize(w, h, 1);
      const rows = Array.from({ length: rowCount }, (_, i) => ({ id: `row-${i}`, label: `Row ${i}`, value: `${i}` }));
      hud.optionsView = { rows, cursor: 0, title: 'TEST', note: '' };

      const expBoxW = Math.min(440, Math.max(280, w - 48));
      const expBoxH = 64 + rowCount * 34 + 52;
      const expBoxX = w / 2 - expBoxW / 2;
      const expBoxY = Math.max(8, h / 2 - expBoxH / 2);
      const expRowsTop = expBoxY + 56;
      const expValueX = expBoxX + expBoxW - 36;

      // Hit at exactly rowsTop should hit row 0
      assert.equal(hud.optionsHitAt({ x: expBoxX + 10, y: expRowsTop }), 0, 'AC-1: row 0 hit at top');
      // Hit just above rowsTop should be outside (-1)
      assert.equal(hud.optionsHitAt({ x: expBoxX + 10, y: expRowsTop - 1 }), -1, 'AC-1: above rowsTop returns -1');
      // Hit at bottom of row 0
      assert.equal(hud.optionsHitAt({ x: expBoxX + 10, y: expRowsTop + 33 }), 0, 'AC-1: row 0 bottom edge');
      // Hit at start of row 1
      if (rowCount > 1) {
        assert.equal(hud.optionsHitAt({ x: expBoxX + 10, y: expRowsTop + 34 }), 1, 'AC-1: row 1 start');
      }
      // Hit past bottom of last row
      assert.equal(hud.optionsHitAt({ x: expBoxX + 10, y: expRowsTop + rowCount * 34 }), -1, 'AC-1: below rows returns -1');
      // Left and right edges of box
      assert.equal(hud.optionsHitAt({ x: expBoxX - 1, y: expRowsTop + 10 }), -1, 'AC-1: left of boxX returns -1');
      assert.equal(hud.optionsHitAt({ x: expBoxX + expBoxW + 1, y: expRowsTop + 10 }), -1, 'AC-1: right of boxX+boxW returns -1');

      // Verify geometry when captured via drawOptions
      let capturedRight = 0;
      let capturedValueX = 0;
      const testHud = makeHud();
      testHud.resize(w, h, 1);
      testHud.canvasLine = (path) => {
        if (path.length === 5) {
          capturedRight = path[1].x;
        }
      };
      testHud.text = (str, x) => {
        if (str === '0') {
          capturedValueX = x;
        }
      };
      testHud.drawOptions({
        title: 'TEST',
        rows: [{ id: 'opt0', label: 'Opt 0', value: '0', adjustable: true }],
        cursor: -1,
        note: '',
      });
      // In drawOptions, single row layout was recalculated
      const singleRowBoxW = Math.min(440, Math.max(280, w - 48));
      const singleRowBoxX = w / 2 - singleRowBoxW / 2;
      assert.equal(capturedRight, singleRowBoxX + singleRowBoxW, 'AC-1: captured right edge matches boxX + boxW');
      assert.equal(capturedValueX, singleRowBoxX + singleRowBoxW - 36, 'AC-1: captured valueX matches boxX + boxW - 36');
    };

    checkView(800, 600, 3);
    checkView(1280, 720, 6);
    checkView(300, 400, 2);
    checkView(1920, 1080, 8);
  },

  'AC-2 optionsHitAt translates coordinates to exact row indices and rejects out-of-bounds positions'() {
    const hud = makeHud();
    hud.resize(800, 600, 1);

    // When optionsView is null or undefined, returns -1
    hud.optionsView = null;
    assert.equal(hud.optionsHitAt({ x: 400, y: 300 }), -1, 'AC-2: null optionsView returns -1');

    const rows = [
      { id: 'item0', label: 'Item 0', value: 'A' },
      { id: 'item1', label: 'Item 1', value: 'B' },
      { id: 'item2', label: 'Item 2', value: 'C' },
      { id: 'item3', label: 'Item 3', value: 'D' },
    ];
    hud.optionsView = { rows, cursor: 0, title: 'OPTIONS', note: '' };

    const boxW = Math.min(440, Math.max(280, 800 - 48)); // 440
    const boxH = 64 + rows.length * 34 + 52; // 64 + 136 + 52 = 252
    const boxX = 800 / 2 - boxW / 2; // 400 - 220 = 180
    const boxY = Math.max(8, 600 / 2 - boxH / 2); // 300 - 126 = 174
    const rowsTop = boxY + 56; // 230

    // Center of each row returns exact index
    for (let i = 0; i < rows.length; i++) {
      const centerY = rowsTop + i * 34 + 17;
      assert.equal(hud.optionsHitAt({ x: boxX + 50, y: centerY }), i, `AC-2: row ${i} hit at center`);
      assert.equal(hud.optionsHitAt({ x: boxX, y: centerY }), i, `AC-2: row ${i} hit at left edge`);
      assert.equal(hud.optionsHitAt({ x: boxX + boxW, y: centerY }), i, `AC-2: row ${i} hit at right edge`);
    }

    // Points outside horizontal bounds
    assert.equal(hud.optionsHitAt({ x: boxX - 0.1, y: rowsTop + 17 }), -1, 'AC-2: left of box returns -1');
    assert.equal(hud.optionsHitAt({ x: boxX + boxW + 0.1, y: rowsTop + 17 }), -1, 'AC-2: right of box returns -1');

    // Points vertically out-of-bounds
    assert.equal(hud.optionsHitAt({ x: boxX + 50, y: rowsTop - 0.1 }), -1, 'AC-2: above rowsTop returns -1');
    assert.equal(hud.optionsHitAt({ x: boxX + 50, y: 0 }), -1, 'AC-2: at top of screen returns -1');
    assert.equal(hud.optionsHitAt({ x: boxX + 50, y: rowsTop + rows.length * 34 }), -1, 'AC-2: past last row returns -1');
    assert.equal(hud.optionsHitAt({ x: boxX + 50, y: 599 }), -1, 'AC-2: at bottom of screen returns -1');
  },

  'AC-3 drawOptions renders panel outline, titles, row items, focus highlight, and navigation hints'() {
    const lines = [];
    const texts = [];

    const hud = makeHud();
    hud.resize(800, 600, 1);
    hud.canvasLine = (path, color, alpha, width, glow) => {
      lines.push({ path: path.map((p) => ({ x: p.x, y: p.y })), color, alpha, width, glow });
    };
    hud.text = (str, x, y, color, style) => {
      texts.push({ str, x, y, color, style });
    };

    // 1. Root page view (non-adjustable rows)
    const rootView = {
      open: true,
      page: 'root',
      title: 'OPTIONS',
      note: '',
      cursor: 1, // Focused on row 1 (GRAPHICS)
      rows: [
        { id: 'controls', label: 'CONTROLS', value: '', adjustable: false },
        { id: 'graphics', label: 'GRAPHICS', value: '', adjustable: false },
        { id: 'back', label: 'BACK', value: '', adjustable: false },
      ],
    };

    hud.drawOptions(rootView);

    // Verify panel outline drawn
    assert.ok(lines.length >= 2, 'AC-3: panel outline and focus rect lines drawn');
    const panelOutline = lines[0];
    assert.equal(panelOutline.path.length, 5, 'AC-3: panel outline has 5 vertices (closed rect)');
    assert.equal(panelOutline.color, 0, 'AC-3: panel outline is BLUE');

    // Verify title text
    const titleText = texts.find((t) => t.str === 'OPTIONS');
    assert.ok(titleText, 'AC-3: title OPTIONS rendered');
    assert.equal(titleText.color, 0, 'AC-3: title is BLUE');
    assert.equal(titleText.style.align, 'center');

    // Verify focus highlight rectangle drawn for focused row (cursor = 1)
    const focusLine = lines.find((l) => l.color === 2); // ORANGE = 2
    assert.ok(focusLine, 'AC-3: focus highlight box drawn in ORANGE');

    // Verify row labels
    assert.ok(texts.some((t) => t.str === 'CONTROLS' && t.color === 1), 'AC-3: inactive CONTROLS row is GREEN');
    assert.ok(texts.some((t) => t.str === 'GRAPHICS' && t.color === 2), 'AC-3: active GRAPHICS row is ORANGE');
    assert.ok(texts.some((t) => t.str === 'BACK' && t.color === 1), 'AC-3: inactive BACK row is GREEN');

    // Verify navigation hint
    const hint = texts.find((t) => t.str.includes('ENTER confirm'));
    assert.ok(hint, 'AC-3: navigation hint rendered');
    assert.equal(hint.color, 0, 'AC-3: navigation hint is BLUE');

    // 2. Graphics page view (with adjustable items and note text)
    lines.length = 0;
    texts.length = 0;

    const graphicsView = {
      open: true,
      page: 'graphics',
      title: 'GRAPHICS',
      note: 'Lower these on older computers',
      cursor: 0, // Focused on row 0 (QUALITY PRESET)
      rows: [
        { id: 'preset', label: 'QUALITY PRESET', value: 'HIGH', adjustable: true },
        { id: 'resolution', label: 'RESOLUTION', value: '100%', adjustable: true },
        { id: 'back', label: 'BACK', value: '', adjustable: false },
      ],
    };

    hud.drawOptions(graphicsView);

    // Focused adjustable row renders step markers: ◂ HIGH ▸
    assert.ok(texts.some((t) => t.str === '◂ HIGH ▸' && t.color === 2), 'AC-3: focused adjustable value has step markers');
    // Inactive adjustable row renders value without markers: 100%
    assert.ok(texts.some((t) => t.str === '100%' && t.color === 1), 'AC-3: inactive adjustable value rendered plainly');
    // Note text rendered
    assert.ok(texts.some((t) => t.str === 'Lower these on older computers'), 'AC-3: note text rendered');
  },

  'AC-4 difficultyAt returns null and levelStepAt returns 0 for out-of-bounds coordinates'() {
    const hud = makeHud();
    hud.resize(800, 600, 1);

    const cx = 800 / 2; // 400
    const cy = 600 / 2; // 300
    const boxW = Math.min(390, Math.max(280, 800 - 48)); // 390
    const boxX = cx - boxW / 2; // 400 - 195 = 205
    const rowsTop = cy - 42; // 258
    const rowH = 26;

    // difficultyAt tests
    // 1. Outside horizontal bounds
    assert.equal(hud.difficultyAt({ x: boxX - 1, y: rowsTop + 10 }), null, 'AC-4: difficultyAt left of box is null');
    assert.equal(hud.difficultyAt({ x: boxX + boxW + 1, y: rowsTop + 10 }), null, 'AC-4: difficultyAt right of box is null');
    // 2. Above rowsTop
    assert.equal(hud.difficultyAt({ x: cx, y: rowsTop - 1 }), null, 'AC-4: difficultyAt above rowsTop is null');
    assert.equal(hud.difficultyAt({ x: cx, y: 0 }), null, 'AC-4: difficultyAt at y=0 is null');
    // 3. Below last difficulty row (DIFFICULTY_ORDER has length 5: indices 0..4)
    assert.equal(hud.difficultyAt({ x: cx, y: rowsTop + 5 * rowH + 1 }), null, 'AC-4: difficultyAt below last row is null');
    assert.equal(hud.difficultyAt({ x: cx, y: 599 }), null, 'AC-4: difficultyAt at y=599 is null');
    // In-bounds valid check
    assert.equal(hud.difficultyAt({ x: cx, y: rowsTop + 10 }), 'easy', 'AC-4: difficultyAt inside row 0 is easy');

    // levelStepAt tests
    // Bounds: pos.x >= boxX && pos.x <= boxX + boxW && pos.y >= cy + 88 && pos.y <= cy + 124
    // 1. Horizontal out-of-bounds
    assert.equal(hud.levelStepAt({ x: boxX - 1, y: cy + 100 }), 0, 'AC-4: levelStepAt left of box is 0');
    assert.equal(hud.levelStepAt({ x: boxX + boxW + 1, y: cy + 100 }), 0, 'AC-4: levelStepAt right of box is 0');
    // 2. Vertical out-of-bounds
    assert.equal(hud.levelStepAt({ x: cx - 10, y: cy + 87 }), 0, 'AC-4: levelStepAt above cy+88 is 0');
    assert.equal(hud.levelStepAt({ x: cx - 10, y: cy + 125 }), 0, 'AC-4: levelStepAt below cy+124 is 0');
    assert.equal(hud.levelStepAt({ x: cx - 10, y: 0 }), 0, 'AC-4: levelStepAt at y=0 is 0');
    assert.equal(hud.levelStepAt({ x: cx - 10, y: 599 }), 0, 'AC-4: levelStepAt at y=599 is 0');
    // 3. In-bounds valid checks (x < cx returns -1, x >= cx returns 1)
    assert.equal(hud.levelStepAt({ x: cx - 10, y: cy + 100 }), -1, 'AC-4: levelStepAt left half returns -1');
    assert.equal(hud.levelStepAt({ x: cx + 10, y: cy + 100 }), 1, 'AC-4: levelStepAt right half returns 1');
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
