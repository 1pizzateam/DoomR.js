import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`../src/${name}.js`, import.meta.url), 'utf8');
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exported = (src, name) => new RegExp(`^export\\s+(?:const|let|var|function|class)\\s+${escape(name)}\\b`, 'm').test(src)
  || new RegExp(`^export\\s*\\{[^}]*\\b${escape(name)}\\b[^}]*\\}`, 'm').test(src);

const INTERNALS = {
  controls: ['TONE_BLUE', 'TONE_GREEN', 'TONE_ORANGE', 'CAPTURE_SECONDS', 'CONFIRM_SECONDS', 'TOAST_SECONDS', 'TIMER_EPSILON'],
  cache: ['CHEST_CELLS', 'CHEST_SIZE'],
  ceiling: ['CEILING_LIGHT_COLOR', 'CEILING_LIGHT_RADIUS', 'DYNAMIC_LIGHT_RADIUS', 'MAX_DYNAMIC_LIGHTS'],
  door: ['DOOR_FACE', 'DOOR_TOP'],
  face: ['FACE_TIERS'],
  impacts: ['IMPACT_CELL'],
  overlay: ['VERTEX', 'FRAGMENT', 'TEXTURED_VERTEX', 'TEXTURED_FRAGMENT'],
  game: ['BARREL', 'USE_VERBS'],
  bloodsprites: ['FLOOR_VARIANTS', 'WALL_VARIANTS'],
  hud: ['CONTROLS_LAYOUT'],
};

const checks = [
  ['AC-1 listed internals are not exported from controls, cache, ceiling, door, face, impacts, overlay, game, bloodsprites, hud', () => {
    for (const [mod, names] of Object.entries(INTERNALS)) {
      const src = read(mod);
      for (const n of names) assert.ok(!exported(src, n), `${mod}.js still exports ${n}`);
    }
  }],
  ['AC-2 keymap hides MAX_CODE_LENGTH, MOUSE_WHICH_BASE, LAYOUTS but keeps CONTROLS_VERSION and MAX_SLOTS', () => {
    const src = read('keymap');
    for (const n of ['MAX_CODE_LENGTH', 'MOUSE_WHICH_BASE', 'LAYOUTS']) assert.ok(!exported(src, n), `keymap.js still exports ${n}`);
    for (const n of ['CONTROLS_VERSION', 'MAX_SLOTS']) assert.ok(exported(src, n), `keymap.js lost export ${n}`);
  }],
  ['AC-3 sprites per-monster atlas generators are not exported', () => {
    const src = read('sprites');
    for (const n of ['impAtlas', 'bruteAtlas', 'bossAtlas', 'skullAtlas', 'crawlerAtlas', 'swarmerAtlas']) assert.ok(!exported(src, n), `sprites.js still exports ${n}`);
    for (const n of ['wraithAtlas']) assert.ok(exported(src, n), `sprites.js lost export ${n}`);
  }],
  ['AC-4 keymap loads with retained exports and no ReferenceError', async () => {
    const mod = await import('../src/keymap.js');
    assert.equal(mod.CONTROLS_VERSION, 1);
    assert.equal(mod.MAX_SLOTS, 2);
    for (const n of ['MAX_CODE_LENGTH', 'MOUSE_WHICH_BASE', 'LAYOUTS']) assert.ok(!(n in mod), `${n} leaked`);
  }],
  ['AC-5 quads TEXTURED_VERTEX and TEXTURED_FRAGMENT remain exported', () => {
    const src = read('quads');
    for (const n of ['TEXTURED_VERTEX', 'TEXTURED_FRAGMENT']) assert.ok(exported(src, n), `quads.js lost export ${n}`);
  }],
  ['AC-6 npm test chain includes the export-surface test', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(pkg.scripts.test.includes('tests/exports.test.mjs'));
  }],
];

let failed = 0;
for (const [name, fn] of checks)
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    failed++;
    console.error(`not ok - ${name}\n${e.message}`);
  }
if (failed) process.exit(1);
