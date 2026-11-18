import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Utils } from '@1pizzateam/spock';


console.log('# file: tests/perf-allocations-246.test.mjs');

const { Input } = await import('../src/input.js');
const { SHOTS, TitleDirector } = await import('../src/title.js');

const read = (name) => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

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

const pass = (name) => console.log(`ok   ${name}`);

// ctrltab binds document listeners on construction
globalThis.document ??= { addEventListener() {}, removeEventListener() {} };
globalThis.window ??= { addEventListener() {}, removeEventListener() {} };
const newInput = () => new Input({ addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }) });

// AC-1
{
  const input = newInput();
  const a = input.poll();
  const b = input.poll();
  assert.equal(a, b);
  assert.equal(a, input.controls);
  const src = body(read('input.js'), 'poll');
  assert.ok(!/=\s*\{/.test(src), 'poll must not assign an object literal');
  assert.ok(/return controls;/.test(src));
  pass('AC-1 poll returns the same pre-allocated controls object');
}

// AC-2
{
  const input = newInput();
  for (const id of ['moveForward', 'strafeLeft', 'turnRight', 'run', 'jump', 'crouch', 'fire'])
    input.keys.add(id);
  input.mouseDX = 7;
  const c = input.poll();
  assert.equal(c.forward, 1);
  assert.equal(c.strafe, -1);
  assert.equal(c.turn, 1);
  assert.equal(c.run, true);
  assert.equal(c.jump, true);
  assert.equal(c.crouch, true);
  assert.equal(c.fire, true);
  assert.equal(c.mouseX, 7);
  assert.equal(input.mouseDX, 0);
  input.keys.clear();
  const d = input.poll();
  assert.equal(d.forward, 0);
  assert.equal(d.run, false);
  assert.equal(d.mouseX, 0);
  pass('AC-2 controls reflect live input state and mouseDX resets');
}

// AC-3
{
  const input = newInput();
  for (let w = 1; w <= 4; w++) {
    input.pressed.add(`weapon${w}`);
    input.pressed.add('grenade');
    input.pressed.add('use');
    input.pressed.add('nightVision');
    const c = input.poll();
    assert.equal(c.weapon, w);
    assert.equal(c.grenade, true);
    assert.equal(c.use, true);
    assert.equal(c.nightVision, true);
    input.endFrame();
    const n = input.poll();
    assert.equal(n.weapon, 0);
    assert.equal(n.grenade, false);
    assert.equal(n.use, false);
    assert.equal(n.nightVision, false);
  }
  pass('AC-3 one-shot flags and weapon do not go stale');
}

const makeGame = () => ({
  levelIndex: 0,
  time: 0,
  barrels: [],
  enemies: [],
  fade: 0,
  cam: null,
  load() {},
  addBarrel(b) { this.barrels.push(b); },
  hitBarrel() {},
  updateBarrels() {},
  updateEnemy() {},
});
const CAM_KEYS = ['x', 'y', 'eye', 'lookX', 'lookY', 'lookEye', 'roll', 'zoom'];

// AC-4
{
  const game = makeGame();
  const title = new TitleDirector(game);
  assert.deepEqual(Object.keys(title.cam).sort(), [...CAM_KEYS].sort());
  title.update(0.016);
  assert.equal(game.cam, title.cam);
  pass('AC-4 TitleDirector owns a persistent cam assigned to game.cam');
}

// AC-5
{
  const game = makeGame();
  const title = new TitleDirector(game);
  title.update(0.016);
  game.time = 3.3;
  title.update(1.5);
  const shot = SHOTS[title.shot];
  const u = Utils.clamp(title.t / shot.duration, 0, 1);
  const e = u * 0.6 + Utils.smoothstep(0, 1, u) * 0.4;
  const sway = Math.sin(game.time * 0.8 + title.shot) * 1.4;
  const mix = Utils.lerp;
  const want = {
    x: mix(shot.from[0], shot.to[0], e),
    y: mix(shot.from[1], shot.to[1], e),
    eye: mix(shot.from[2], shot.to[2], e) + sway,
    lookX: mix(shot.look[0][0], shot.look[1][0], e),
    lookY: mix(shot.look[0][1], shot.look[1][1], e),
    lookEye: mix(shot.look[0][2], shot.look[1][2], e),
    roll: shot.roll + Math.sin(game.time * 0.5) * 0.015,
    zoom: mix(shot.zoom[0], shot.zoom[1], e),
  };
  for (const k of CAM_KEYS)
    assert.ok(Math.abs(game.cam[k] - want[k]) < 1e-9, k);
  title.end();
  assert.equal(game.cam, null);
  pass('AC-5 cam values match the original formulas and end clears cam');
}

// AC-6
{
  const game = makeGame();
  const title = new TitleDirector(game);
  title.update(0.016);
  const first = game.cam;
  const shots = new Set();
  for (let i = 0; i < 600; i++) {
    game.time += 0.25;
    title.update(0.25);
    shots.add(title.shot);
    assert.equal(game.cam, first);
  }
  assert.ok(shots.size > 1, 'shots changed');
  assert.ok(!/game\.cam\s*=\s*\{/.test(body(read('title.js'), 'update')));
  pass('AC-6 cam identity is stable across frames and shots');
}
