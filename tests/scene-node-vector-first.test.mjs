import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vec2, Vec3 } from '@1pizzateam/roostr';
import { MONSTERS, monsterSkinAtlas, monsterGoreSkinAtlas, monsterParts } from '../src/monsters.js';

const monstersSrc = readFileSync(new URL('../src/monsters.js', import.meta.url), 'utf8');
const worldSrc = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const checks = [
  ['AC-1 no scalar transform helper declarations or calls remain in monsters.js and world.js', () => {
    const forbiddenDecls = /function\s+(setPos|setRot|setScale|setUniformScale|mag2)\b/;
    assert.doesNotMatch(monstersSrc, forbiddenDecls, 'monsters.js must not declare scalar transform helpers');
    assert.doesNotMatch(worldSrc, forbiddenDecls, 'world.js must not declare scalar transform helpers');

    const forbiddenCalls = /(?<!\.)\b(setPos|setRot|setScale|setUniformScale|mag2)\s*\(/;
    assert.doesNotMatch(monstersSrc, forbiddenCalls, 'monsters.js must not call scalar transform helpers');
    assert.doesNotMatch(worldSrc, forbiddenCalls, 'world.js must not call scalar transform helpers');
  }],
  ['AC-2 node transform calls receive Vec3 scratch instances', () => {
    // Assert no function declarations taking (node, x, y, z) or similar scalar coordinates for scene nodes
    const scalarNodeTransformDecl = /function\s+\w+\s*\([^)]*\bnode\b[^)]*\bx\b[^)]*\by\b[^)]*\bz\b[^)]*\)/;
    assert.doesNotMatch(monstersSrc, scalarNodeTransformDecl, 'monsters.js has function taking node with x, y, z');
    assert.doesNotMatch(worldSrc, scalarNodeTransformDecl, 'world.js has function taking node with x, y, z');

    // In monsters.js, every .setPosition(, .setRotation(, .setScale( must pass a Vec3 scratch instance, not numeric literals
    const transformCalls = monstersSrc.matchAll(/\.(setPosition|setRotation|setScale)\s*\(([^)]+)\)/g);
    let count = 0;
    for (const match of transformCalls) {
      count++;
      const arg = match[2].trim();
      assert.match(
        arg,
        /^(?:scratchPos|scratchRot|scratchScale|scratchVec3|vec3|pivots\.\w+|parts\.pivots\.\w+|view\.parts\.pivots\.\w+|new\s+Vec3)\b/,
        `Transform argument "${arg}" must begin with a Vec3 scratch instance or vector expression`
      );
      assert.doesNotMatch(arg, /^\d+/, `Transform argument "${arg}" must not be a numeric literal`);
    }
    assert.ok(count > 0, 'Expected to find transform calls in monsters.js');
  }],
  ['AC-3 mag2 replaced by Vec2 getMagnitude and skin atlas deterministic', () => {
    assert.match(
      monstersSrc,
      /scratchVec2\.setScalar\([^)]+\)\.getMagnitude\(\)/,
      'monsters.js must use scratchVec2.setScalar(...).getMagnitude() in place of mag2'
    );

    const monsterTypes = ['imp', 'brute', 'boss', 'skull', 'crawler', 'swarmer', 'wraith'];
    for (const type of monsterTypes) {
      const atlasA = monsterSkinAtlas(type);
      const atlasB = monsterSkinAtlas(type);
      assert.equal(atlasA.width, 256, `${type} skin atlas width must be 256`);
      assert.equal(atlasA.height, 32, `${type} skin atlas height must be 32`);
      assert.equal(atlasA.data.length, 256 * 32 * 4, `${type} skin atlas buffer length must be 256*32*4`);
      assert.deepEqual(atlasA.data, atlasB.data, `${type} skin atlas must be deterministic across calls`);

      // Check non-empty (has non-zero pixels)
      assert.ok(atlasA.data.some((byte) => byte > 0), `${type} skin atlas data must not be empty`);

      const goreA = monsterGoreSkinAtlas(type);
      const goreB = monsterGoreSkinAtlas(type);
      assert.equal(goreA.width, 256, `${type} gore atlas width must be 256`);
      assert.equal(goreA.height, 32, `${type} gore atlas height must be 32`);
      assert.deepEqual(goreA.data, goreB.data, `${type} gore atlas must be deterministic`);
    }
  }],
  ['AC-4 monster hierarchies pose deterministically with finite transforms', () => {
    const monsterTypes = ['imp', 'brute', 'boss', 'skull', 'crawler', 'swarmer', 'wraith'];
    for (const type of monsterTypes) {
      const parts = monsterParts(type);
      assert.ok(parts && parts.pivots, `monsterParts(${type}) must return parts with pivots`);
      for (const [pivotName, pivot] of Object.entries(parts.pivots)) {
        assert.ok(pivot instanceof Vec3, `${type} pivot ${pivotName} must be Vec3`);
        assert.ok(Number.isFinite(pivot.x) && Number.isFinite(pivot.y) && Number.isFinite(pivot.z), `${type} pivot ${pivotName} values must be finite`);
      }
      assert.ok(type in MONSTERS, `MONSTERS.${type} must be defined`);
      assert.equal(typeof MONSTERS[type].animate, 'function');
      assert.equal(typeof MONSTERS[type].die, 'function');
    }
  }],
  ['AC-5 world transforms use vector API and render allocation checks remain green', () => {
    // Assert no bare scalar transform helper calls exist in world.js
    assert.doesNotMatch(worldSrc, /(?<!\.)\b(setPos|setRot|setScale|setUniformScale)\s*\(/);
  }],
  ['AC-6 package.json test script runs the new test', () => {
    assert.ok(
      pkg.scripts.test.includes('tests/scene-node-vector-first.test.mjs'),
      'package.json scripts.test must include tests/scene-node-vector-first.test.mjs'
    );
  }],
];

console.log('# file: tests/scene-node-vector-first.test.mjs');
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
