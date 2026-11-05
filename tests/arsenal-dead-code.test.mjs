import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`../src/${name}.js`, import.meta.url), 'utf8');
const arsenalSrc = read('arsenal');
const worldSrc = read('world');
const arsenal = await import('../src/arsenal.js');

const WEAPONS = ['knife', 'chainsaw', 'shotgun', 'chaingun', 'rocketLauncher'];

const checks = [
  ['AC-1 playerHandsAtlas, playerHandsParts, playerHandsMesh and playerHandsPose are removed', () => {
    assert.doesNotMatch(arsenalSrc, /\bplayerHands(Atlas|Parts|Mesh|Pose)\b/);
    for (const k of ['playerHandsAtlas', 'playerHandsParts', 'playerHandsMesh', 'playerHandsPose'])
      assert.ok(!(k in arsenal), `${k} still exported`);
  }],
  ['AC-2 limbFromTo helper is removed', () => {
    assert.doesNotMatch(arsenalSrc, /\blimbFromTo\b/);
  }],
  ['AC-3 buildDetailedPlayerLimb and ARSENAL_CELLS are module-private', () => {
    assert.match(arsenalSrc, /^function buildDetailedPlayerLimb\(/m);
    assert.match(arsenalSrc, /^const ARSENAL_CELLS\b/m);
    assert.doesNotMatch(arsenalSrc, /^export\s+(function|const)\s+(buildDetailedPlayerLimb|ARSENAL_CELLS)\b/m);
    assert.ok(!('buildDetailedPlayerLimb' in arsenal));
    assert.ok(!('ARSENAL_CELLS' in arsenal));
    assert.equal(typeof arsenal.chaingunParts, 'function');
    assert.equal(typeof arsenal.rocketLauncherParts, 'function');
  }],
  ['AC-4 weapon viewmodel builders still work', () => {
    for (const w of WEAPONS) {
      const parts = arsenal[`${w}Parts`]();
      assert.ok(parts && Object.keys(parts).length > 0, `${w}Parts empty`);
      const atlas = arsenal[`${w}Atlas`]();
      assert.ok(atlas.width > 0 && atlas.height > 0, `${w}Atlas size`);
      const { offset } = arsenal[`${w}Pose`]();
      assert.ok(Number.isFinite(offset.x) && Number.isFinite(offset.y) && Number.isFinite(offset.z), `${w}Pose offset`);
      if (typeof arsenal[`${w}Mesh`] === 'function') {
        const mesh = arsenal[`${w}Mesh`]();
        assert.ok(mesh && mesh.vertices.length > 0, `${w}Mesh empty`);
        for (let i = 0; i < mesh.vertices.length; i += 7)
          assert.ok(Number.isFinite(mesh.vertices[i]), `${w}Mesh vertex ${i}`);
      }
    }
  }],
  ['AC-5 no dangling identifiers from the removed rig', () => {
    assert.doesNotMatch(arsenalSrc, /\b(cachedPlayerHands\w*|paintPlayerHandsArmorCell|buildArticulatedHandSide)\b/);
    assert.equal(typeof arsenal.ARSENAL_CELL, 'number');
    assert.equal(typeof arsenal.ARSENAL_FRAMES, 'number');
    assert.match(arsenalSrc, /function paintKnifeArm\(/);
    assert.match(arsenalSrc, /function paintKnifeGlove\(/);
  }],
  ['AC-6 world.js imports only symbols arsenal still exports', () => {
    const m = /import\s*\{([^}]*)\}\s*from\s*'\.\/arsenal\.js'/.exec(worldSrc);
    assert.ok(m, 'arsenal import not found');
    for (const n of m[1].split(',').map((s) => s.trim()).filter(Boolean))
      assert.ok(n in arsenal, `${n} missing from arsenal`);
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(pkg.scripts.test.includes('tests/arsenal-dead-code.test.mjs'));
  }],
  ['AC-3 orphaned weapon-player-hands.polygun.json model asset is removed', () => {
    assert.equal(existsSync(new URL('../src/models/weapon-player-hands.polygun.json', import.meta.url)), false);
  }],
  ['AC-5 no source file references weapon-player-hands', () => {
    assert.doesNotMatch(arsenalSrc, /weapon-player-hands/);
    assert.doesNotMatch(worldSrc, /weapon-player-hands/);
  }],
];

console.log('# file: tests/arsenal-dead-code.test.mjs');
let failed = 0;
for (const [name, fn] of checks) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}\n     ${e.message}`);
  }
}
if (failed) process.exit(1);
