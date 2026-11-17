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
  hud: ['CONTROLS_LAYOUT', 'HINTS_LAYOUT', 'layoutHints', 'layoutOptions'],
  options: ['OPTION_GRAPHICS', 'OPTION_BACK', 'OPTION_PRESET', 'OPTION_RESOLUTION', 'OPTION_ADAPTIVE', 'OPTION_GLOW', 'OPTION_HUD_GLOW'],
};

const checks = [
  ['AC-1 graphics module does not export internal version, resolution steps, or preset names', async () => {
    const mod = await import('../src/graphics.js');
    for (const name of ['GRAPHICS_VERSION', 'RESOLUTION_STEPS', 'PRESET_NAMES'])
      assert.ok(!(name in mod), `${name} leaked from src/graphics.js`);
  }],
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
  ['issue-221 AC-1 src/bloodsprites.js has no orphaned stack and columns helpers', () => {
    const src = read('bloodsprites');
    assert.ok(!/function\s+stack\s*\(/.test(src), 'bloodsprites.js still defines stack() helper');
    assert.ok(!/function\s+columns\s*\(/.test(src), 'bloodsprites.js still defines columns() helper');
    assert.ok(!/\bstack\s*\(/.test(src), 'bloodsprites.js still calls stack()');
    assert.ok(!/\bcolumns\s*\(/.test(src), 'bloodsprites.js still calls columns()');
  }],
  ['issue-221 AC-2 src/bloodsprites.js does not import unused Utils from @1pizzateam/spock', () => {
    const src = read('bloodsprites');
    const spockImportMatch = src.match(/import\s*\{([^}]+)\}\s*from\s*['"]@1pizzateam\/spock['"]/);
    assert.ok(spockImportMatch, 'bloodsprites.js does not import from @1pizzateam/spock');
    const imported = spockImportMatch[1].split(',').map((s) => s.trim());
    assert.ok(!imported.includes('Utils'), 'bloodsprites.js still imports Utils from @1pizzateam/spock');
    for (const expected of ['Bezier', 'Rect', 'Trigo', 'Vec2'])
      assert.ok(imported.includes(expected), `bloodsprites.js missing expected import ${expected} from @1pizzateam/spock`);
  }],
  ['issue-221 AC-3 src/bloodsprites.js loads cleanly and exports required quad generators', async () => {
    const mod = await import('../src/bloodsprites.js');
    assert.equal(typeof mod.createQuadTarget, 'function');
    const target = mod.createQuadTarget();
    assert.deepEqual(target, { quads: [], count: 0 });
    for (const fn of ['floorSplatQuad', 'floorGibQuad', 'printQuad', 'wallSplatQuad', 'wallDripQuads', 'screenSplatQuads', 'dripTime', 'wallDrips', 'particleQuad'])
      assert.equal(typeof mod[fn], 'function', `${fn} is not exported from bloodsprites.js`);
    assert.ok(!('stack' in mod), 'stack leaked as an export from bloodsprites.js');
    assert.ok(!('columns' in mod), 'columns leaked as an export from bloodsprites.js');
  }],
  ['issue-221 AC-4 src/bloodpaint.js has no dead paintFloorSplat wrapper', async () => {
    const src = read('bloodpaint');
    assert.ok(!/function\s+paintFloorSplat\s*\(/.test(src), 'bloodpaint.js still defines paintFloorSplat()');
    assert.ok(!/\bpaintFloorSplat\b/.test(src), 'bloodpaint.js still references paintFloorSplat');
    const mod = await import('../src/bloodpaint.js');
    assert.ok(!('paintFloorSplat' in mod), 'paintFloorSplat leaked as an export from bloodpaint.js');
  }],
  ['issue-221 AC-5 src/bloodpaint.js does not export HEEL and FOREFOOT polygon constants', async () => {
    const src = read('bloodpaint');
    assert.ok(!exported(src, 'HEEL'), 'bloodpaint.js still exports HEEL');
    assert.ok(!exported(src, 'FOREFOOT'), 'bloodpaint.js still exports FOREFOOT');
    const mod = await import('../src/bloodpaint.js');
    assert.ok(!('HEEL' in mod), 'HEEL leaked as an export from bloodpaint.js');
    assert.ok(!('FOREFOOT' in mod), 'FOREFOOT leaked as an export from bloodpaint.js');
    assert.equal(typeof mod.paintPrint, 'function', 'paintPrint is missing from bloodpaint.js');
  }],
  ['issue-221 AC-6 src/bloodpaint.js footprint and floor splat cell generators operate without regressions', async () => {
    const { paintPrint, paintFloorSplatCell, RES } = await import('../src/bloodpaint.js');
    const { mulberry32 } = await import('../src/rng.js');
    const filled = paintPrint(true);
    assert.ok(filled instanceof Uint8Array, 'paintPrint(true) did not return a Uint8Array');
    assert.equal(filled.length, RES * RES * 4, 'paintPrint(true) unexpected buffer size');
    const outline = paintPrint(false);
    assert.ok(outline instanceof Uint8Array, 'paintPrint(false) did not return a Uint8Array');
    assert.equal(outline.length, RES * RES * 4, 'paintPrint(false) unexpected buffer size');
    const splat = paintFloorSplatCell(0, mulberry32(42));
    assert.ok(splat && splat.pixels instanceof Uint8Array, 'paintFloorSplatCell pixels missing or invalid');
    assert.equal(splat.pixels.length, RES * RES * 4, 'paintFloorSplatCell pixels unexpected size');
    assert.ok(splat.layers && splat.layers.H instanceof Float32Array, 'paintFloorSplatCell H layer missing');
  }],
  ['AC-1 verify FloorBlood export alias is removed from src/bloodfloor.js', () => {
    const src = read('bloodfloor');
    assert.ok(!exported(src, 'FloorBlood'), 'bloodfloor.js still exports FloorBlood');
    assert.ok(!src.includes('FloorBlood'), 'bloodfloor.js still contains references to FloorBlood');
  }],
  ['AC-2 verify FloorBlood is absent from bloodfloor.js module exports', async () => {
    const mod = await import('../src/bloodfloor.js');
    assert.ok(!('FloorBlood' in mod), 'FloorBlood leaked as an export from bloodfloor.js');
  }],
  ['AC-3 verify MergedBlood and canonical bloodfloor constants remain exported', async () => {
    const mod = await import('../src/bloodfloor.js');
    assert.ok('MergedBlood' in mod, 'MergedBlood export missing from bloodfloor.js');
    assert.equal(typeof mod.MergedBlood, 'function');
    for (const n of ['CHUNK', 'MAX_CHUNKS', 'PAD', 'TEX', 'TPU']) {
      assert.ok(n in mod, `${n} export missing from bloodfloor.js`);
      assert.equal(typeof mod[n], 'number', `${n} is not a number`);
    }
    assert.ok('FLOOR' in mod, 'FLOOR export missing from bloodfloor.js');
    assert.equal(typeof mod.FLOOR, 'object');
    assert.equal(mod.FLOOR.kind, 'floor');
  }],
  ['AC-4 verify exports suite passes with zero regressions', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(pkg.scripts.test.includes('tests/exports.test.mjs'), 'package.json test script missing exports.test.mjs');
  }],
  ['issue-220 AC-1 dead furniture size vectors are removed from src/furniture.js', async () => {
    const src = read('furniture');
    const deadVectors = ['DISPENSER_SIZE', 'DESK_SIZE', 'TABLE_SIZE', 'OVEN_SIZE', 'SINK_SIZE', 'PLANT_SIZE'];
    for (const name of deadVectors) {
      assert.ok(!new RegExp(`\\b${name}\\b`).test(src), `${name} still found in src/furniture.js`);
    }
    const mod = await import('../src/furniture.js');
    for (const name of deadVectors) {
      assert.ok(!(name in mod), `${name} leaked as an export from src/furniture.js`);
    }
  }],
  ['issue-220 AC-2 internal furniture atlas constants are unexported', async () => {
    const src = read('furniture');
    const unexported = [
      'DISPENSER_CELL', 'DISPENSER_FRAMES',
      'DESK_CELL', 'DESK_FRAMES',
      'TABLE_CELL', 'TABLE_FRAMES', 'TABLE_ATLAS', 'TABLE_SHARD_COUNT',
      'OVEN_CELL', 'OVEN_FRAMES', 'OVEN_ATLAS', 'OVEN_SHARD_COUNT',
      'SINK_CELL', 'SINK_FRAMES', 'SINK_ATLAS', 'SINK_SHARD_COUNT',
      'PLANT_CELL', 'PLANT_FRAMES', 'PLANT_ATLAS',
    ];
    for (const name of unexported) {
      assert.ok(!exported(src, name), `src/furniture.js still exports ${name}`);
      assert.ok(new RegExp(`^const\\s+${name}\\b`, 'm').test(src), `${name} module-level const declaration missing`);
    }
    const mod = await import('../src/furniture.js');
    for (const name of unexported) {
      assert.ok(!(name in mod), `${name} leaked as an export from src/furniture.js`);
    }
  }],
  ['issue-220 AC-3 public furniture exports remain intact', async () => {
    const mod = await import('../src/furniture.js');
    const publicExports = [
      'DISPENSER_RADIUS', 'DISPENSER_WALL_OFFSET', 'DISPENSER_HP', 'DISPENSER_SHARD_COUNT', 'DISPENSER_ATLAS',
      'DESK_RADIUS', 'DESK_WALL_OFFSET', 'DESK_HP', 'DESK_SHARD_COUNT', 'DESK_ATLAS',
      'TABLE_RADIUS', 'TABLE_WALL_OFFSET', 'TABLE_HP',
      'OVEN_RADIUS', 'OVEN_WALL_OFFSET', 'OVEN_HP',
      'SINK_RADIUS', 'SINK_WALL_OFFSET', 'SINK_HP',
      'PLANT_RADIUS', 'PLANT_WALL_OFFSET', 'PLANT_HP', 'PLANT_SHARD_COUNT',
      'FURNITURE_VERTEX', 'FURNITURE_FRAGMENT',
      'dispenserAtlas', 'dispenserMesh', 'dispenserWreckMesh', 'dispenserPuddleMesh', 'dispenserShrapnelParts',
      'deskAtlas', 'deskMesh', 'deskWreckMesh', 'deskDebrisMesh', 'deskShrapnelParts',
      'tableAtlas', 'tableMesh', 'tableWreckMesh', 'tableDebrisMesh', 'tableShrapnelParts',
      'ovenAtlas', 'ovenMesh', 'ovenWreckMesh', 'ovenDebrisMesh', 'ovenShrapnelParts',
      'sinkAtlas', 'sinkMesh', 'sinkWreckMesh', 'sinkPuddleMesh', 'sinkShrapnelParts',
      'plantAtlas', 'buildOfficePlant', 'plantWreckMesh', 'plantDebrisMesh', 'plantShrapnelParts',
    ];
    for (const name of publicExports) {
      assert.ok(name in mod, `${name} missing from src/furniture.js exports`);
    }
  }],
  ['issue-220 AC-4 export-surface regression test suite passes cleanly', () => {
    const src = read('furniture');
    assert.ok(!src.includes('DISPENSER_SIZE'), 'DISPENSER_SIZE remains');
    assert.ok(!src.includes('DESK_SIZE'), 'DESK_SIZE remains');
    assert.ok(!src.includes('TABLE_SIZE'), 'TABLE_SIZE remains');
    assert.ok(!src.includes('OVEN_SIZE'), 'OVEN_SIZE remains');
    assert.ok(!src.includes('SINK_SIZE'), 'SINK_SIZE remains');
    assert.ok(!src.includes('PLANT_SIZE'), 'PLANT_SIZE remains');
  }],
  ['issue-220 AC-5 full level and export test suites pass with zero regressions', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(pkg.scripts.test.includes('tests/levels.test.mjs'), 'tests/levels.test.mjs missing from test script');
    assert.ok(pkg.scripts.test.includes('tests/exports.test.mjs'), 'tests/exports.test.mjs missing from test script');
  }],
  ['issue-225 AC-3 shirt.js hides SHIRT_COLOR, weaveTexture, and findNeckSeamIds exports', async () => {
    const src = read('shirt');
    for (const name of ['SHIRT_COLOR', 'weaveTexture', 'findNeckSeamIds']) {
      assert.ok(!exported(src, name), `src/shirt.js still exports ${name}`);
      assert.ok(new RegExp(`^(const|function)\\s+${name}\\b`, 'm').test(src), `${name} declaration missing in src/shirt.js`);
    }
    const mod = await import('../src/shirt.js');
    for (const name of ['SHIRT_COLOR', 'weaveTexture', 'findNeckSeamIds']) {
      assert.ok(!(name in mod), `${name} leaked as an export from src/shirt.js`);
    }
    for (const name of ['createShirtMesh', 'updateShirt']) {
      assert.ok(name in mod, `${name} missing from src/shirt.js exports`);
      assert.equal(typeof mod[name], 'function', `${name} is not a function`);
    }
  }],
  ['issue-225 AC-5 export surface check and sim test suite verify clean dead-code removal', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(pkg.scripts.test.includes('tests/exports.test.mjs'), 'package.json test script missing exports.test.mjs');
    assert.ok(pkg.scripts.test.includes('tests/sim.test.mjs'), 'package.json test script missing sim.test.mjs');
  }],
  ['AC-1 shrapnel fire constants are unexported in source', () => {
    const src = read('barrel');
    const shrapnelFireConstants = [
      'BARREL_SHRAPNEL_FIRE_FADE_START',
      'BARREL_SHRAPNEL_FIRE_DURATION',
      'BARREL_SHRAPNEL_FIRE_RANDOM_SPAN',
    ];
    for (const name of shrapnelFireConstants) {
      assert.ok(!exported(src, name), `src/barrel.js still exports ${name}`);
      assert.ok(new RegExp(`^const\\s+${name}\\b`, 'm').test(src), `src/barrel.js missing module-level const declaration for ${name}`);
    }
  }],
  ['AC-2 barrel module does not export shrapnel fire constants', async () => {
    const mod = await import('../src/barrel.js');
    for (const name of ['BARREL_SHRAPNEL_FIRE_FADE_START', 'BARREL_SHRAPNEL_FIRE_DURATION', 'BARREL_SHRAPNEL_FIRE_RANDOM_SPAN']) {
      assert.ok(!(name in mod), `${name} leaked as an export from src/barrel.js`);
    }
  }],
  ['AC-3 barrel module retains public atlas, pose, and mesh exports', async () => {
    const mod = await import('../src/barrel.js');
    const publicExports = [
      'BARREL_ATLAS',
      'BARREL_STAVE_COUNT',
      'BARREL_FIRE_VERTEX',
      'BARREL_FIRE_FRAGMENT',
      'barrelAtlas',
      'skinBarrel',
      'barrelWreckMesh',
      'barrelShrapnelParts',
      'barrelFireMesh',
      'barrelShrapnelFireMesh',
      'barrelAcidPuddleMesh',
      'barrelAcidStreamMesh',
      'createBarrelExplosionPose',
      'barrelExplosionPose',
    ];
    for (const name of publicExports) {
      assert.ok(name in mod, `${name} missing from src/barrel.js exports`);
    }
    assert.equal(typeof mod.createBarrelExplosionPose, 'function');
    assert.equal(typeof mod.barrelExplosionPose, 'function');
  }],
  ['AC-4 internal shrapnel fire fade calculations execute cleanly', async () => {
    const mod = await import('../src/barrel.js');
    const pose = mod.createBarrelExplosionPose();
    assert.ok(pose, 'createBarrelExplosionPose returned falsy');
    assert.ok(pose.lidFire, 'pose.lidFire is missing');
    assert.ok(Array.isArray(pose.staveFires), 'pose.staveFires is not an array');
    assert.equal(pose.staveFires.length, mod.BARREL_STAVE_COUNT);

    mod.barrelExplosionPose(0.0, 42, pose);
    assert.equal(pose.lidFire.active, true, 'lidFire should be active at t=0');
    for (let i = 0; i < pose.staveFires.length; i++) {
      assert.equal(pose.staveFires[i].active, true, `staveFires[${i}] should be active at t=0`);
    }

    mod.barrelExplosionPose(30.0, 42, pose);
    assert.equal(pose.lidFire.active, false, 'lidFire should be inactive at t=30');
    for (let i = 0; i < pose.staveFires.length; i++) {
      assert.equal(pose.staveFires[i].active, false, `staveFires[${i}] should be inactive at t=30`);
    }
  }],
  ['issue-228 AC-1 verify LIGHT and METAL are not imported or referenced in src/ceiling.js', () => {
    const src = read('ceiling');
    const floorImportMatch = src.match(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/floor\.js['"]/);
    assert.ok(floorImportMatch, 'src/ceiling.js does not import from ./floor.js');
    const floorImports = floorImportMatch[1].split(',').map((s) => s.trim());
    assert.ok(!floorImports.includes('LIGHT'), 'src/ceiling.js still imports LIGHT from ./floor.js');
    assert.ok(!floorImports.includes('METAL'), 'src/ceiling.js still imports METAL from ./floor.js');
    assert.ok(!/\bLIGHT\b/.test(src), 'src/ceiling.js contains LIGHT identifier');
    assert.ok(!/\bMETAL\b/.test(src), 'src/ceiling.js contains METAL identifier');
  }],
  ['issue-228 AC-2 verify field is not imported or referenced in src/wall.js', () => {
    const src = read('wall');
    const floorImportMatch = src.match(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/floor\.js['"]/);
    assert.ok(floorImportMatch, 'src/wall.js does not import from ./floor.js');
    const floorImports = floorImportMatch[1].split(',').map((s) => s.trim());
    assert.ok(!floorImports.includes('field'), 'src/wall.js still imports field from ./floor.js');
    const withoutPeriodic = src.replace(/\bperiodicField\b/g, '');
    assert.ok(!/\bfield\b/.test(withoutPeriodic), 'src/wall.js references field identifier outside periodicField');
  }],
  ['issue-228 AC-3 Issue #228 dead-code assertions pass for ceiling and wall imports', async () => {
    const ceilingMod = await import('../src/ceiling.js');
    const wallMod = await import('../src/wall.js');
    assert.ok(ceilingMod.CEILING_CELLS, 'src/ceiling.js CEILING_CELLS export missing');
    assert.ok(wallMod.WALL_CELLS, 'src/wall.js WALL_CELLS export missing');
    const ceilingSrc = read('ceiling');
    assert.ok(!/\b(LIGHT|METAL)\b/.test(ceilingSrc), 'ceiling.js contains dead imports');
    const wallSrc = read('wall').replace(/\bperiodicField\b/g, '');
    assert.ok(!/\bfield\b/.test(wallSrc), 'wall.js contains dead field import');
  }],
  ['issue-228 AC-4 full exports test suite passes with zero regressions', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(pkg.scripts.test.includes('tests/exports.test.mjs'), 'package.json test script missing exports.test.mjs');
  }],
  ['issue-227 AC-1 src/pipes.js declares PIPE_RUNS and PIPE_STANDOFF as internal constants without export', () => {
    const src = read('pipes');
    assert.ok(!exported(src, 'PIPE_RUNS'), 'src/pipes.js still exports PIPE_RUNS');
    assert.ok(!exported(src, 'PIPE_STANDOFF'), 'src/pipes.js still exports PIPE_STANDOFF');
    assert.ok(/const\s+PIPE_RUNS\s*=/.test(src), 'src/pipes.js missing const PIPE_RUNS declaration');
    assert.ok(/const\s+PIPE_STANDOFF\s*=/.test(src), 'src/pipes.js missing const PIPE_STANDOFF declaration');
  }],
  ['issue-227 AC-2 pipes module does not export PIPE_RUNS or PIPE_STANDOFF', async () => {
    const mod = await import('../src/pipes.js');
    assert.ok(!('PIPE_RUNS' in mod), 'PIPE_RUNS leaked from src/pipes.js exports');
    assert.ok(!('PIPE_STANDOFF' in mod), 'PIPE_STANDOFF leaked from src/pipes.js exports');
  }],
  ['issue-227 AC-3 pipes module retains public wallPipeQuads, faceDirOf, and pipePlacements exports', async () => {
    const mod = await import('../src/pipes.js');
    assert.equal(typeof mod.wallPipeQuads, 'function', 'wallPipeQuads export missing');
    assert.equal(typeof mod.faceDirOf, 'function', 'faceDirOf export missing');
    assert.equal(typeof mod.pipePlacements, 'function', 'pipePlacements export missing');
  }],
  ['issue-227 AC-4 npm test runs complete test suite cleanly', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(pkg.scripts.test.includes('tests/exports.test.mjs'));
  }],
  ['issue-224 AC-1 internal option row identifier constants are not exported from src/options.js', async () => {
    const mod = await import('../src/options.js');
    const internalOptions = ['OPTION_GRAPHICS', 'OPTION_BACK', 'OPTION_PRESET', 'OPTION_RESOLUTION', 'OPTION_ADAPTIVE', 'OPTION_GLOW', 'OPTION_HUD_GLOW'];
    for (const name of internalOptions) {
      assert.ok(!(name in mod), `${name} leaked from src/options.js exports`);
    }
  }],
  ['issue-224 AC-2 OPTION_CONTROLS, OPTIONS_PAGE_ROOT, and OPTIONS_PAGE_GRAPHICS remain exported from src/options.js', async () => {
    const mod = await import('../src/options.js');
    for (const name of ['OPTION_CONTROLS', 'OPTIONS_PAGE_ROOT', 'OPTIONS_PAGE_GRAPHICS', 'OptionsMenu']) {
      assert.ok(name in mod, `${name} missing from src/options.js exports`);
    }
  }],
  ['issue-224 AC-3 layoutOptions helper is not exported from src/hud.js', async () => {
    const mod = await import('../src/hud.js');
    assert.ok(!('layoutOptions' in mod), 'layoutOptions leaked from src/hud.js exports');
  }],
  ['issue-224 AC-4 options menu, HUD layout, and export-surface test suite passes cleanly', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(pkg.scripts.test.includes('tests/exports.test.mjs'), 'tests/exports.test.mjs missing from test script');
    assert.ok(pkg.scripts.test.includes('tests/options-menu.test.mjs'), 'tests/options-menu.test.mjs missing from test script');
  }],
  ['AC-1 src/game.js omits EXIT and FLOOR from ./level.js imports', () => {
    const src = read('game');
    const levelImportMatch = src.match(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/level\.js['"]/);
    assert.ok(levelImportMatch, 'src/game.js does not import from ./level.js');
    const imported = levelImportMatch[1].split(',').map((s) => s.trim());
    assert.ok(!imported.includes('EXIT'), 'src/game.js still imports EXIT from ./level.js');
    assert.ok(!imported.includes('FLOOR'), 'src/game.js still imports FLOOR from ./level.js');
    const expected = ['BASE_FLOOR_LEVEL', 'CACHE_WALL_OFFSET', 'CEILING', 'CROUCH_EYE', 'DOOR', 'EYE', 'Level', 'TILE', 'WALL'];
    for (const exp of expected) {
      assert.ok(imported.includes(exp), `src/game.js missing required import ${exp} from ./level.js`);
    }
  }],
  ['AC-2 src/game.js contains no references to EXIT or FLOOR and sim tests pass', () => {
    const src = read('game');
    assert.ok(!/\bEXIT\b/.test(src), 'src/game.js still contains EXIT identifier');
    assert.ok(!/\bFLOOR\b/.test(src), 'src/game.js still contains FLOOR identifier');
  }],
  ['AC-3 src/level.js defines SWITCH_WALL_OFFSET as internal non-exported const', () => {
    const src = read('level');
    assert.ok(!exported(src, 'SWITCH_WALL_OFFSET'), 'src/level.js still exports SWITCH_WALL_OFFSET');
    assert.ok(/^const\s+SWITCH_WALL_OFFSET\s*=/m.test(src), 'src/level.js missing const SWITCH_WALL_OFFSET declaration');
  }],
  ['AC-4 src/level.js public exports remain intact without SWITCH_WALL_OFFSET', async () => {
    const mod = await import('../src/level.js');
    assert.ok(!('SWITCH_WALL_OFFSET' in mod), 'SWITCH_WALL_OFFSET leaked from src/level.js exports');
    const publicLevelExports = [
      'CACHE_WALL_OFFSET', 'DISPENSER_WALL_OFFSET', 'DESK_WALL_OFFSET', 'TABLE_WALL_OFFSET',
      'OVEN_WALL_OFFSET', 'SINK_WALL_OFFSET', 'PLANT_WALL_OFFSET',
      'Level', 'TILE', 'WALL', 'DOOR', 'FLOOR', 'EXIT',
    ];
    for (const exp of publicLevelExports) {
      assert.ok(exp in mod, `src/level.js missing expected public export ${exp}`);
    }
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
