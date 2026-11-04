import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const worldSrc = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
const arsenal = await import('../src/arsenal.js');

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
