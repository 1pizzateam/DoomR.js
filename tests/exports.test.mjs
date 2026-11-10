import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

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
  hud: ['CONTROLS_LAYOUT', 'HINTS_LAYOUT', 'layoutHints'],
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
  ['AC-3 sprites.js legacy atlas module is gone', () => {
    assert.equal(existsSync(new URL('../src/sprites.js', import.meta.url)), false, 'sprites.js still exists');
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
  ['issue-61 AC-1 level.js has no DIAG_NONE', () => {
    assert.ok(!read('level').includes('DIAG_NONE'));
  }],
  ['issue-61 AC-2 level.js keeps DIAG_NW/NE/SW/SE exports with values 1..4', () => {
    const src = read('level');
    for (const [n, v] of [['DIAG_NW', 1], ['DIAG_NE', 2], ['DIAG_SW', 3], ['DIAG_SE', 4]]) {
      assert.ok(exported(src, n), `level.js lost export ${n}`);
      assert.ok(new RegExp(`${n}\\s*=\\s*${v}\\b`).test(src), `${n} is not ${v}`);
    }
  }],
  ['issue-61 AC-4 npm test chain includes levels, sim, and exports tests', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    for (const t of ['levels', 'sim', 'exports']) assert.ok(pkg.scripts.test.includes(`tests/${t}.test.mjs`));
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
    for (const n of ['floorAtlas', 'crateAtlas', 'slimeAtlas', 'marsDirtAtlas', 'marsBoulderAtlas', 'FLOOR_FRAGMENT', 'CRATE_FRAGMENT', 'SLIME_FRAGMENT', 'ACID_MIST_FRAGMENT', 'MARS_DIRT_FRAGMENT', 'MARS_ROCK_FRAGMENT', 'TILE_PIXELS', 'MARS_BOULDER_BASE_INSET']) assert.ok(n in mod, `missing ${n}`);
    for (const n of ['RUST_GLSL', 'LIGHT_GLSL', 'RUST', 'HAZARD']) assert.ok(!(n in mod), `${n} still exported`);
  }],
  ['issue-181 AC-6 floor.js exports ACID_MIST_FRAGMENT as a non-empty string', async () => {
    const mod = await import('../src/floor.js');
    assert.equal(typeof mod.ACID_MIST_FRAGMENT, 'string');
    assert.ok(mod.ACID_MIST_FRAGMENT.length > 0);
    assert.ok('SLIME_FRAGMENT' in mod);
  }],
  ['issue-105 AC-6 npm test chain still runs sim and exports suites', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(pkg.scripts.test.includes('tests/sim.test.mjs'));
    assert.ok(pkg.scripts.test.includes('tests/exports.test.mjs'));
  }],
  ['issue-81 AC-1 src/sprites.js is removed and no src module imports it', () => {
    const srcDir = new URL('../src/', import.meta.url);
    assert.equal(existsSync(new URL('../src/sprites.js', import.meta.url)), false, 'src/sprites.js still exists');
    const files = readdirSync(srcDir).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const content = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
      assert.ok(
        !/(?:from\s+['"][^'"]*|import\s+['"][^'"]*)(?<!blood)sprites\.js['"]/.test(content),
        `${file} contains an import specifier resolving to sprites.js`
      );
    }
  }],
  ['issue-81 AC-2 every relative import in src resolves to an existing file other than sprites.js', () => {
    const srcDir = new URL('../src/', import.meta.url);
    const files = readdirSync(srcDir).filter((f) => f.endsWith('.js'));
    const relativeImportRegex = /(?:from\s+['"]|import\s+['"])(\.\/[^'"]+)['"]/g;
    for (const file of files) {
      const content = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
      let match;
      while ((match = relativeImportRegex.exec(content)) !== null) {
        const specifier = match[1];
        assert.notEqual(specifier, './sprites.js', `${file} imports ./sprites.js`);
        const targetUrl = new URL(specifier, new URL(`../src/${file}`, import.meta.url));
        assert.ok(existsSync(targetUrl), `${file} relative import ${specifier} does not exist`);
      }
    }
  }],
  ['issue-140 AC-1 keymap exports structured DEFAULT_HINT_LINES and hud exports drawControlHints and controlHints without leaking layout internals', async () => {
    const keymapMod = await import('../src/keymap.js');
    assert.ok(Array.isArray(keymapMod.DEFAULT_HINT_LINES), 'DEFAULT_HINT_LINES should be an array');
    assert.equal(keymapMod.DEFAULT_HINT_LINES.length, 4, 'DEFAULT_HINT_LINES should have 4 groups');
    for (const g of keymapMod.DEFAULT_HINT_LINES) {
      assert.ok(typeof g.title === 'string', 'Group title must be a string');
      assert.ok(Array.isArray(g.rows), 'Group rows must be an array');
      for (const r of g.rows) {
        assert.ok(typeof r.keys === 'string', 'Row keys must be a string');
        assert.ok(typeof r.label === 'string', 'Row label must be a string');
      }
    }

    const hudMod = await import('../src/hud.js');
    assert.ok(typeof hudMod.Hud.prototype.drawControlHints === 'function', 'Hud must expose drawControlHints');
    assert.ok(!('HINTS_LAYOUT' in hudMod), 'HINTS_LAYOUT internal should not be exported');
    assert.ok(!('layoutHints' in hudMod), 'layoutHints internal should not be exported');
  }],
  ['issue-56 AC-1 world.js has no dead MARS tint exports', () => {
    const src = read('world');
    assert.ok(!/MARS_FLOOR_TINT/.test(src), 'world.js still references or exports MARS_FLOOR_TINT');
    assert.ok(!/MARS_WALL_TINT/.test(src), 'world.js still references or exports MARS_WALL_TINT');
    assert.ok(exported(src, 'MARS_DUST_TINT'), 'world.js lost export MARS_DUST_TINT');
    assert.ok(exported(src, 'MARS_AMBIENT_COLOR'), 'world.js lost export MARS_AMBIENT_COLOR');
  }],
  ['issue-56 AC-2 world.js has no unused quads imports', () => {
    const src = read('world');
    const quadsImportMatch = src.match(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/quads\.js['"]/);
    assert.ok(quadsImportMatch, 'world.js does not import from ./quads.js');
    const imported = quadsImportMatch[1].split(',').map((s) => s.trim());
    assert.ok(!imported.includes('LIGHT_GLSL'), 'world.js still imports LIGHT_GLSL from ./quads.js');
    assert.ok(!imported.includes('SOLID_ALPHA'), 'world.js still imports SOLID_ALPHA from ./quads.js');
    for (const expected of ['PARTICLE_FRAGMENT', 'PARTICLE_VERTEX', 'QuadBatch', 'SOLID_TEXTURED_FRAGMENT', 'TEXTURED_FRAGMENT', 'texturedMesh'])
      assert.ok(imported.includes(expected), `world.js missing expected import ${expected} from ./quads.js`);
  }],
  ['issue-198 AC-1 src/impacts.js has no PLASTER_DARK declaration or reference', () => {
    const src = read('impacts');
    assert.ok(!src.includes('PLASTER_DARK'), 'impacts.js still references or defines PLASTER_DARK');
  }],
  ['issue-198 AC-2 src/impacts.js preserves PLASTER palette constant and SKIN entry', () => {
    const src = read('impacts');
    assert.ok(/const PLASTER = \[172, 164, 148\];/.test(src), 'PLASTER palette constant was modified or removed');
    assert.ok(/const SKIN = \[PLASTER, DUST, PANEL\];/.test(src), 'SKIN array was modified or removed');
  }],
  ['issue-198 AC-3 src/impacts.js dead-code check asserts PLASTER_DARK is absent', async () => {
    const mod = await import('../src/impacts.js');
    assert.ok(!('PLASTER_DARK' in mod), 'PLASTER_DARK leaked as an export from impacts.js');
    const src = read('impacts');
    assert.ok(!/\bPLASTER_DARK\b/.test(src), 'PLASTER_DARK identifier found in impacts.js');
  }],
  ['issue-198 AC-4 npm test runs complete test suite cleanly', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(pkg.scripts.test.includes('tests/exports.test.mjs'), 'package.json test script missing exports.test.mjs');
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
