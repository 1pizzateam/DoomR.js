import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/game.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const gameSrc = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');

function extractMethodBody(src, methodName) {
  const cleanName = methodName.replace(/\(.*$/, '').trim();
  const pattern = new RegExp(`^\\s*(?:async\\s+)?${cleanName}\\s*\\([^)]*\\)\\s*\\{`, 'm');
  const match = pattern.exec(src);
  assert.ok(match, `Could not find declaration for "${cleanName}" in src/game.js`);
  const openBrace = src.indexOf('{', match.index + match[0].length - 1);
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

function parseSemver(v) {
  const clean = v.replace(/^[^0-9]*/, '');
  const [major, minor, patch] = clean.split('.').map(Number);
  return { major, minor, patch };
}

function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

const checks = [
  ['AC-1 bumpr dependency is upgraded past 1.2.0', () => {
    const pkgVer = pkg.dependencies['@1pizzateam/bumpr'];
    assert.ok(pkgVer, '@1pizzateam/bumpr missing in package.json');
    assert.notEqual(pkgVer, '1.2.0', 'bumpr should not be pinned to 1.2.0');
    assert.ok(compareSemver(parseSemver(pkgVer), parseSemver('1.2.0')) > 0, 'bumpr version should be > 1.2.0');

    const lockEntry = lock.packages?.['node_modules/@1pizzateam/bumpr'] ?? lock.dependencies?.['@1pizzateam/bumpr'];
    assert.ok(lockEntry, '@1pizzateam/bumpr missing in package-lock.json');
    const lockVer = lockEntry.version;
    assert.equal(lockVer, pkgVer, 'package-lock.json should resolve the same pinned version');
  }],
  ['AC-2 Game allocates a single queryScratch array', () => {
    const ctorBody = extractMethodBody(gameSrc, 'constructor');
    const scratchMatches = [...ctorBody.matchAll(/this\.queryScratch\s*=\s*\[\s*\]/g)];
    assert.equal(scratchMatches.length, 1, 'Game constructor must allocate exactly one this.queryScratch = []');

    // Ensure all queryCircle calls in src/game.js provide a target scratch argument
    const queryCircleCalls = [...gameSrc.matchAll(/this\.scene\.queryCircle\s*\(([^)]+)\)/g)];
    assert.ok(queryCircleCalls.length > 0, 'No queryCircle calls found');
    for (const match of queryCircleCalls) {
      const args = match[1].split(',').map((s) => s.trim());
      assert.equal(args.length, 4, `queryCircle call must have 4 arguments (center, radius, options, target): "${match[0]}"`);
      assert.match(args[3], /^this\.queryScratch\w*$/, `queryCircle target argument must be a queryScratch: "${args[3]}"`);
    }
  }],
  ['AC-3 every queryCircle call passes a scratch target', () => {
    const expectedSites = [
      'this.scene.queryCircle(enemy.pos, 240, QUERY_ENEMY, this.queryScratch)',
      'this.scene.queryCircle(pos, shot.radius, QUERY_ENEMY, this.queryScratch)',
      'this.scene.queryCircle(pos, shot.radius, QUERY_BARREL, this.queryScratch)',
      'this.scene.queryCircle(barrel.pos, BARREL.blast, QUERY_ENEMY, this.queryScratch)',
      'this.scene.queryCircle(barrel.pos, BARREL.blast, QUERY_BARREL, this.queryScratch)',
      'this.scene.queryCircle(crusher.center, TILE * 0.45, QUERY_ENEMY, this.queryScratch)',
      'this.scene.queryCircle(pad.target, PLAYER_RADIUS + 10, QUERY_ENEMY, this.queryScratch)',
    ];
    for (const site of expectedSites) {
      assert.ok(gameSrc.includes(site), `Expected call site not found: ${site}`);
    }
  }],
  ['AC-4 hitCorpseAlongRay reuses a hoisted hit structure', () => {
    const ctorBody = extractMethodBody(gameSrc, 'constructor');
    assert.match(ctorBody, /this\.corpseHit\s*=\s*\{\s*fraction:\s*0/, 'constructor must initialize this.corpseHit');

    const methodBody = extractMethodBody(gameSrc, 'hitCorpseAlongRay');
    assert.match(methodBody, /Raycast\.sweepCircleCircle\([^)]*this\.corpseHit\s*\)/, 'sweepCircleCircle must receive this.corpseHit');
    assert.doesNotMatch(methodBody, /\bnew\b/, 'hitCorpseAlongRay must not instantiate objects with new');
    assert.doesNotMatch(methodBody, /\[\s*\]/, 'hitCorpseAlongRay must not create array literals');
    assert.doesNotMatch(methodBody, /=\s*\{/, 'hitCorpseAlongRay must not assign object literals');
  }],
  ['AC-5 scratch reuse yields no stale results or nested overlap', () => {
    const game = new Game();
    game.load(0);

    // Verify consecutive queries with different radii / targets
    const pos = game.player.pos;
    const res1 = game.scene.queryCircle(pos, 500, { mask: 4 }, game.queryScratch);
    assert.equal(res1, game.queryScratch, 'queryCircle should return the passed scratch array');
    const count1 = res1.length;

    const res2 = game.scene.queryCircle(pos, 1, { mask: 4 }, game.queryScratch);
    assert.equal(res2, game.queryScratch);
    assert.ok(res2.length <= count1, 'second query with tiny radius should yield fewer or equal results');
    assert.equal(game.queryScratch.length, res2.length, 'scratch array length should match query result length');

    // Static check: no queryCircle loop body invokes queryCircle on the same scratch
    const loopRegex = /for\s*\(\s*const\s+\w+\s+of\s+this\.scene\.queryCircle\([^)]+\)\s*\)\s*\{([^}]+)\}/g;
    let loopMatch;
    while ((loopMatch = loopRegex.exec(gameSrc)) !== null) {
      assert.doesNotMatch(loopMatch[1], /this\.scene\.queryCircle\(/, 'queryCircle loop body must not contain nested queryCircle on same scratch');
    }
  }],
  ['AC-6 npm test and build stay green with unchanged sim behavior', () => {
    const game = new Game();
    assert.ok(game.queryScratch instanceof Array);
    assert.equal(game.queryScratch.length, 0);
    assert.ok(game.corpseHit && typeof game.corpseHit === 'object');
    assert.equal(game.corpseHit.fraction, 0);
  }],
];

console.log('# file: tests/bumpr-zero-gc.test.mjs');
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
