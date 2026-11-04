import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vec2, Vec3 } from '@1pizzateam/roostr';

const worldSrc = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
const ceilingSrc = readFileSync(new URL('../src/ceiling.js', import.meta.url), 'utf8');
const arsenal = await import('../src/arsenal.js');
const ceiling = await import('../src/ceiling.js');

function extractMethodBody(src, methodName) {
  const cleanName = methodName.replace(/\(.*$/, '').trim();
  const pattern = new RegExp(`^\\s*(?:async\\s+)?${cleanName}\\s*\\([^)]*\\)\\s*\\{`, 'm');
  const match = pattern.exec(src);
  assert.ok(match, `Could not find declaration for "${cleanName}" in src/world.js`);
  const openBrace = src.indexOf('{', match.index);
  assert.ok(openBrace !== -1, `Opening brace not found for "${cleanName}"`);
  let depth = 0;
  for (let i = openBrace; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(openBrace + 1, i);
    }
  }
  throw new Error(`Unbalanced braces for "${cleanName}"`);
}

function extractSyncViewsCall(src, name) {
  const pattern = new RegExp(`this\\.syncViews\\(\\s*this\\.${name}Views\\b`);
  const match = pattern.exec(src);
  assert.ok(match, `Could not find this.syncViews(this.${name}Views) in src/world.js`);
  const idx = match.index;
  let depth = 0;
  for (let i = idx; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')') {
      depth--;
      if (depth === 0) return src.slice(idx, i + 1);
    }
  }
  throw new Error(`Unbalanced parens for ${name}`);
}

function extractExportFunctionBody(src, fnName) {
  const cleanName = fnName.replace(/\(.*$/, '').trim();
  const pattern = new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${cleanName}\\s*\\([^)]*\\)\\s*\\{`, 'm');
  const match = pattern.exec(src);
  assert.ok(match, `Could not find declaration for "${cleanName}" in source`);
  const openBrace = src.indexOf('{', match.index);
  assert.ok(openBrace !== -1, `Opening brace not found for "${cleanName}"`);
  let depth = 0;
  for (let i = openBrace; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(openBrace + 1, i);
    }
  }
  throw new Error(`Unbalanced braces for "${cleanName}"`);
}

const checks = [
  ['AC-1 syncViews callbacks for enemy/pickup/barrel/shot/effect views are memoized', () => {
    const viewNames = ['enemy', 'pickup', 'barrel', 'shot', 'effect'];
    for (const name of viewNames) {
      const call = extractSyncViewsCall(worldSrc, name);
      const eqMatches = call.match(/\?\?=/g);
      assert.equal(eqMatches?.length, 2, `syncViews for ${name}Views should match ??= twice`);
      const withoutMemoizedArrows = call.replace(/\?\?=\s*(\([^)]*\)|\w+)\s*=>/g, '');
      assert.doesNotMatch(withoutMemoizedArrows, /=>/, `syncViews for ${name}Views contains inline arrow function outside ??=`);
    }
  }],
  ['AC-2 per-frame state is refreshed once per render', () => {
    const renderBody = extractMethodBody(worldSrc, 'render(game)');
    const enemySyncMatch = /this\.syncViews\(\s*this\.enemyViews\b/.exec(renderBody);
    assert.ok(enemySyncMatch, 'this.syncViews(this.enemyViews) not found in render');
    const enemySyncIdx = enemySyncMatch.index;

    const fields = [
      'frameTime',
      'framePlayer',
      'frameGame',
      'frameCullDistSq',
      'frameEffectCullDistSq',
      'frameOccludeFog',
    ];
    for (const field of fields) {
      const re = new RegExp(`\\bthis\\.${field}\\s*=`, 'g');
      const matches = [...renderBody.matchAll(re)];
      assert.equal(matches.length, 1, `this.${field} should be assigned exactly once in render`);
      assert.ok(
        matches[0].index < enemySyncIdx,
        `this.${field} assignment must occur before enemyViews sync`
      );
    }
  }],
  ['AC-3 updateEnemy contains no audio closure', () => {
    const updateEnemyBody = extractMethodBody(worldSrc, 'updateEnemy(');
    assert.doesNotMatch(updateEnemyBody, /\(snd\)\s*=>/);
    assert.doesNotMatch(updateEnemyBody, /audio\?\.play/);
    assert.doesNotMatch(worldSrc, /audio\?\.play\(/);
  }],
  ['AC-4 viewmodel pose calls use scratch option objects', () => {
    const weaponPoses = [
      ['chainsawPose', 'updateChainsaw('],
      ['chaingunPose', 'updateChaingun('],
      ['shotgunPose', 'updateShotgun('],
      ['rocketLauncherPose', 'updateRocketLauncher('],
      ['knifePose', 'updateKnife('],
    ];
    for (const [poseFn, methodDecl] of weaponPoses) {
      const body = extractMethodBody(worldSrc, methodDecl);
      const poseCallMatch = new RegExp(`\\b${poseFn}\\s*\\(\\s*([^,\\s]+)`).exec(body);
      assert.ok(poseCallMatch, `${poseFn} call not found in ${methodDecl}`);
      const arg = poseCallMatch[1].trim();
      assert.match(arg, /^scratch\w+$/, `${poseFn} argument "${arg}" should be a scratch identifier`);
      assert.ok(!arg.startsWith('{'), `${poseFn} argument "${arg}" must not be an object literal`);
      const declPattern = new RegExp(`^const\\s+${arg}\\s*=\\s*\\{`, 'm');
      assert.match(worldSrc, declPattern, `Module-level scratch object ${arg} definition not found`);
    }
  }],
  ['AC-5 door marks reuse scratch marks', () => {
    const syncDoorMarksBody = extractMethodBody(worldSrc, 'syncDoorMarks(');
    assert.ok(syncDoorMarksBody.includes('scratchHoleMark'), 'syncDoorMarks should use scratchHoleMark');
    assert.ok(syncDoorMarksBody.includes('scratchSplatMark'), 'syncDoorMarks should use scratchSplatMark');
    assert.doesNotMatch(worldSrc, /\{\s*\.\.\.mark\b/);
  }],
  ['AC-6 pose exports unchanged', () => {
    const poseNames = ['chainsawPose', 'chaingunPose', 'shotgunPose', 'rocketLauncherPose', 'knifePose'];
    for (const name of poseNames) {
      assert.equal(typeof arsenal[name], 'function', `${name} is not a function in arsenal.js`);
      const pose = arsenal[name]();
      assert.ok(pose && typeof pose === 'object', `${name}() did not return an object`);
      assert.ok(pose.offset && typeof pose.offset === 'object', `${name}() returned pose missing offset`);
    }
  }],
  ['AC-1 collectDynamicLights has no per-call allocations', () => {
    const body = extractExportFunctionBody(ceilingSrc, 'collectDynamicLights');
    assert.doesNotMatch(body, /\bnew\s+Vec3\b/, 'collectDynamicLights should not instantiate new Vec3');
    assert.doesNotMatch(body, /\.slice\s*\(/, 'collectDynamicLights should not call .slice(');
    assert.doesNotMatch(body, /\[\s*\]/, 'collectDynamicLights should not instantiate array literal []');
    assert.doesNotMatch(body, /\bkind\s*:/, 'collectDynamicLights should not create candidate object literal with kind:');
  }],
  ['AC-2 comparators are hoisted', () => {
    assert.match(ceilingSrc, /^function\s+compareDynamicLightSortKey\s*\(/m, 'compareDynamicLightSortKey should be declared at module scope');
    assert.match(ceilingSrc, /^function\s+compareFixtureDistSq\s*\(/m, 'compareFixtureDistSq should be declared at module scope');
    const collectBody = extractExportFunctionBody(ceilingSrc, 'collectDynamicLights');
    const updateBody = extractExportFunctionBody(ceilingSrc, 'updateCeilingLights');
    assert.ok(collectBody.includes('compareDynamicLightSortKey'), 'collectDynamicLights should use compareDynamicLightSortKey');
    assert.ok(updateBody.includes('compareFixtureDistSq'), 'updateCeilingLights should use compareFixtureDistSq');
    assert.doesNotMatch(collectBody, /=>/, 'collectDynamicLights should not contain inline arrow function');
    assert.doesNotMatch(updateBody, /=>/, 'updateCeilingLights should not contain inline arrow function');
  }],
  ['AC-3 dynamic light values match baseline', () => {
    const time = 1.0;
    const camPos = new Vec3(100, 28, 200);
    const maxDistSq = (64 * 9) ** 2;
    const player = {
      pos: new Vec2(100, 200),
      angle: 0,
      eye: 28,
      weapon: 'shotgun',
      flash: 0.1,
    };
    const shot = {
      pos: new Vec2(150, 200),
      kind: 'rocket',
    };
    const effect = {
      x: 140,
      y: 190,
      type: 'boom',
      age: 0.1,
      life: 0.5,
    };
    const barrel = {
      pos: new Vec2(180, 210),
      gone: false,
      fuse: 10,
    };
    const game = {
      player,
      shots: [shot],
      effects: [effect],
      barrels: [barrel],
      state: 'play',
    };

    const res = ceiling.collectDynamicLights(game, camPos, time);
    assert.equal(res.length, 4, 'should collect 4 candidates');

    assert.equal(res[0].kind, 'muzzle');
    assert.equal(res[0].color, ceiling.MUZZLE_LIGHT_COLOR);
    assert.equal(res[0].attenuation, ceiling.MUZZLE_LIGHT_ATTENUATION);
    assert.deepEqual([res[0].position.x, res[0].position.y, res[0].position.z], [124, 24, 200]);
    assert.ok(Math.abs(res[0].strength - 1.02) < 1e-9);

    const expBoomFade = 1 - 0.3 * (1764 / maxDistSq);
    const expBoomStrength = 0.8 * 1.38 * expBoomFade;
    assert.equal(res[1].kind, 'boom');
    assert.equal(res[1].color, ceiling.BOOM_LIGHT_COLOR);
    assert.equal(res[1].attenuation, ceiling.DYNAMIC_LIGHT_ATTENUATION);
    assert.deepEqual([res[1].position.x, res[1].position.y, res[1].position.z], [140, 20, 190]);
    assert.ok(Math.abs(res[1].strength - expBoomStrength) < 1e-9);

    const expRocketFlicker = 0.92 + 0.08 * Math.sin(time * 32);
    const expRocketFade = 1 - 0.35 * (2516 / maxDistSq);
    const expRocketStrength = 1.15 * expRocketFlicker * expRocketFade;
    assert.equal(res[2].kind, 'rocket');
    assert.equal(res[2].color, ceiling.ROCKET_LIGHT_COLOR);
    assert.equal(res[2].attenuation, ceiling.DYNAMIC_LIGHT_ATTENUATION);
    assert.deepEqual([res[2].position.x, res[2].position.y, res[2].position.z], [150, 24, 200]);
    assert.ok(Math.abs(res[2].strength - expRocketStrength) < 1e-9);

    const expBarrelStrength = 0.75 + 0.35 * Math.abs(Math.sin(time * 55));
    assert.equal(res[3].kind, 'Fuse');
    assert.equal(res[3].color, ceiling.BOOM_LIGHT_COLOR);
    assert.equal(res[3].attenuation, ceiling.DYNAMIC_LIGHT_ATTENUATION);
    assert.deepEqual([res[3].position.x, res[3].position.y, res[3].position.z], [180, 18, 210]);
    assert.ok(Math.abs(res[3].strength - expBarrelStrength) < 1e-9);
  }],
  ['AC-4 result is capped and empty cases', () => {
    const camPos = new Vec3(100, 28, 200);
    const shots = [50, 70, 90, 110, 130, 150].map((dx) => ({
      kind: 'rocket',
      pos: new Vec2(100 + dx, 200),
    }));
    const res = ceiling.collectDynamicLights({ shots }, camPos);
    assert.equal(res.length, 4, 'result should be capped at 4 entries');
    assert.equal(res[0].position.x, 150);
    assert.equal(res[1].position.x, 170);
    assert.equal(res[2].position.x, 190);
    assert.equal(res[3].position.x, 210);

    assert.equal(ceiling.collectDynamicLights(null, camPos).length, 0, 'null game returns 0 entries');
    assert.equal(ceiling.collectDynamicLights({ shots: [], effects: [], barrels: [], player: null }, camPos).length, 0, 'empty game returns 0 entries');
  }],
  ['AC-5 pooled results do not leak stale entries', () => {
    const camPos = new Vec3(100, 28, 200);
    const res1 = ceiling.collectDynamicLights({
      shots: [
        { kind: 'rocket', pos: new Vec2(120, 200) },
        { kind: 'fireball', pos: new Vec2(140, 200) },
        { kind: 'rocket', pos: new Vec2(160, 200) },
      ],
    }, camPos);
    assert.equal(res1.length, 3);
    const slot0Pos = res1[0].position;

    const res2 = ceiling.collectDynamicLights({
      barrels: [{ pos: new Vec2(110, 200), gone: false, fuse: 5 }],
    }, camPos);
    assert.equal(res2.length, 1, 'second result reflects only second call sources without stale entries');
    assert.equal(res2[0].kind, 'Fuse');
    assert.equal(res2[0].position, slot0Pos, 'position Vec3 is reused across calls');
  }],
  ['AC-6 fixtures ranked nearest first', () => {
    function createStubLight() {
      return {
        position: null,
        attenuation: { x: 0, y: 0, z: 0 },
        diffuse: {
          scaleVector() {},
          setScalar() {},
        },
        setPosition(p) { this.position = p; },
        setConstantAttenuation(v) { this.attenuation.x = v; },
        setLinearAttenuation(v) { this.attenuation.y = v; },
        setQuadraticAttenuation(v) { this.attenuation.z = v; },
      };
    }

    const camPos = new Vec3(100, 28, 200);
    const f1 = { position: new Vec3(150, 40, 200), phase: 0, flicker: false };
    const f2 = { position: new Vec3(250, 40, 200), phase: 0, flicker: false };
    const f3 = { position: new Vec3(350, 40, 200), phase: 0, flicker: false };
    const pointLights = [createStubLight(), createStubLight(), createStubLight()];

    ceiling.updateCeilingLights(pointLights, [f3, f1, f2], camPos, 0, null);
    assert.equal(pointLights[0].position, f1.position, 'nearest fixture at slot 0');
    assert.equal(pointLights[1].position, f2.position, 'second nearest fixture at slot 1');
    assert.equal(pointLights[2].position, f3.position, 'third nearest fixture at slot 2');
  }],
];

console.log('# file: tests/render-allocations.test.mjs');
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
