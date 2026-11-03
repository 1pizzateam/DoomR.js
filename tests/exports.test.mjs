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
  ['issue-107 AC-1 world.js has no MARS_FLOOR_TINT or MARS_WALL_TINT', () => {
    const src = read('world');
    assert.ok(!/MARS_FLOOR_TINT/.test(src));
    assert.ok(!/MARS_WALL_TINT/.test(src));
  }],
  ['issue-107 AC-2 level.js has no DIAG_NONE', () => {
    assert.ok(!read('level').includes('DIAG_NONE'));
  }],
  ['issue-107 AC-3 keycard.js has no KEYCARD_COLORS but keeps cell exports', () => {
    const src = read('keycard');
    assert.ok(!src.includes('KEYCARD_COLORS'));
    for (const n of ['KEYCARD_CELL', 'KEYCARD_FRAMES', 'KEYCARD_CELLS']) assert.ok(exported(src, n), `keycard.js lost export ${n}`);
  }],
  ['issue-107 AC-4 world.js shader constants are internal but still used', () => {
    const src = read('world');
    for (const n of ['MONSTER_VERTEX', 'VIEWMODEL_VERTEX', 'VIEWMODEL_FRAGMENT', 'POST_VERTEX', 'CORE_FRAGMENT', 'DOWN_FRAGMENT', 'GLOW_FRAGMENT', 'MARS_SKY_VEC']) {
      assert.ok(!exported(src, n), `world.js still exports ${n}`);
      assert.ok(new RegExp(`^const\\s+${n}\\b`, 'm').test(src), `${n} declaration missing`);
      assert.ok(src.split(new RegExp(`\\b${n}\\b`)).length > 2, `${n} unused`);
    }
  }],
  ['issue-107 AC-5 npm test chain still includes export-surface test', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(pkg.scripts.test.includes('tests/exports.test.mjs'));
  }],
  ['issue-105 AC-1 floor.js has no RUST_GLSL or rgb helper', () => {
    const src = read('floor');
    assert.ok(!src.includes('RUST_GLSL'));
    assert.ok(!/\bconst rgb\b/.test(src));
  }],
  ['issue-105 AC-2 dead constants removed, used boulder colors kept', () => {
    const src = read('floor');
    assert.ok(!/\bMARS_TAU\b/.test(src));
    for (const n of ['BOULDER_DARK', 'BOULDER_SLATE', 'BOULDER_BASE', 'BOULDER_LIGHT']) assert.ok(!new RegExp(`\\b${n}\\b`).test(src), `${n} still present`);
    for (const n of ['BOULDER_ABYSS', 'BOULDER_HIGHLIGHT']) assert.ok(new RegExp(`^const ${n}\\b`, 'm').test(src), `${n} missing`);
    assert.ok(!/\bTAU\b/.test(read('wall')));
  }],
  ['issue-105 AC-3 floor.js has no LIGHT_GLSL, quads.js keeps it', () => {
    assert.ok(!read('floor').includes('LIGHT_GLSL'));
    assert.ok(exported(read('quads'), 'LIGHT_GLSL'));
  }],
  ['issue-105 AC-4 internal floor helpers are no longer exported', () => {
    const src = read('floor');
    for (const n of ['RUST', 'RUST_BRIGHT', 'RUST_DARK', 'HAZARD', 'CRATE_CELLS', 'crateCellUv', 'MARS_BOULDER_CELLS', 'marsBoulderCellUv']) {
      assert.ok(!exported(src, n), `floor.js still exports ${n}`);
      assert.ok(new RegExp(`^(const|function)\\s+${n}\\b`, 'm').test(src), `${n} declaration missing`);
    }
  }],
  ['issue-105 AC-5 floor.js and wall.js load with retained exports', async () => {
    const mod = await import('../src/floor.js');
    await import('../src/wall.js');
    for (const n of ['floorAtlas', 'crateAtlas', 'slimeAtlas', 'marsDirtAtlas', 'marsBoulderAtlas', 'FLOOR_FRAGMENT', 'CRATE_FRAGMENT', 'SLIME_FRAGMENT', 'MARS_DIRT_FRAGMENT', 'MARS_ROCK_FRAGMENT', 'TILE_PIXELS', 'MARS_BOULDER_BASE_INSET']) assert.ok(n in mod, `missing ${n}`);
    for (const n of ['RUST_GLSL', 'LIGHT_GLSL', 'RUST', 'HAZARD']) assert.ok(!(n in mod), `${n} still exported`);
  }],
  ['issue-105 AC-6 npm test chain still runs sim and exports suites', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(pkg.scripts.test.includes('tests/sim.test.mjs'));
    assert.ok(pkg.scripts.test.includes('tests/exports.test.mjs'));
  }],
];

console.log('# file: tests/exports.test.mjs');
let failed = 0;
for (const [name, fn] of checks)
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}\n     ${e.message}`);
  }
if (failed) process.exit(1);
