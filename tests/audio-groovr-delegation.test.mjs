import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { softClip } from '@1pizzateam/groovr';
import { Vec2 } from '@1pizzateam/spock';
import { RECIPES, Sound, spatial } from '../src/audio.js';
import { Game } from '../src/game.js';

let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${name}\n${error.stack}`);
  }
}

const source = readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8');
const importLine = source.match(/import \{[^}]*\} from '@1pizzateam\/groovr';/)?.[0] ?? '';

function node() {
  const target = { connect() {}, disconnect() {}, start() {}, stop() {}, resume: () => Promise.resolve() };
  return new Proxy(target, {
    get: (t, key) => {
      if (key in t)
        return t[key];
      if (typeof key === 'symbol')
        return undefined;
      return t[key] = { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, value: 0 };
    },
    set: (t, key, value) => (t[key] = value, true),
  });
}

function mockContext() {
  const created = { buffers: [], shapers: [], sources: [], convolvers: [] };
  const ctx = {
    state: 'running',
    currentTime: 0,
    sampleRate: 44100,
    destination: node(),
    createBuffer: (channels, length) => {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      const buffer = { numberOfChannels: channels, length, getChannelData: (c) => data[c] };
      created.buffers.push(buffer);
      return buffer;
    },
    createWaveShaper: () => (created.shapers.push(node()), created.shapers.at(-1)),
    createBufferSource: () => (created.sources.push(node()), created.sources.at(-1)),
    createConvolver: () => (created.convolvers.push(node()), created.convolvers.at(-1)),
  };
  const generic = new Proxy(ctx, { get: (t, key) => (key in t || typeof key !== 'string' || !key.startsWith('create') ? t[key] : node) });
  return { ctx: generic, created };
}

test('AC-1 audio.js delegates noise generation to createNoise', () => {
  assert.match(importLine, /createNoise/);
  assert.match(source, /createNoise\(ctx\)/);
  assert.doesNotMatch(source, /ctx\.createBuffer\(1,/);
});

test('AC-2 audio.js delegates distortion curves to softClip', () => {
  assert.match(importLine, /softClip/);
  assert.doesNotMatch(source, /shaperCurves/);
  assert.doesNotMatch(source, /Math\.tanh/);
});

test('AC-3 Sound.build delegates reverb impulse to createImpulse', () => {
  assert.match(importLine, /createImpulse/);
  assert.match(source, /createImpulse\(ctx, 1\.8, 2\.5\)/);
  assert.doesNotMatch(source, /ctx\.createBuffer\(2,/);
});

test('AC-4 shaper uses softClip curve and noise buffer is cached per context', () => {
  const { ctx, created } = mockContext();
  RECIPES.dieImp(ctx, node(), 0);
  assert.equal(created.shapers.length, 1);
  assert.equal(created.shapers[0].curve, softClip(4));
  const before = created.sources.length;
  RECIPES.fire(ctx, node(), 0);
  RECIPES.fire(ctx, node(), 1);
  const sources = created.sources.slice(before);
  assert.ok(sources.length >= 2);
  assert.ok(sources.every((s) => s.buffer === sources[0].buffer));
  assert.equal(created.buffers.filter((b) => b.numberOfChannels === 1).length, 1);
});

test('AC-5 reverb impulse keeps two channels, 1.8 s length and exponential decay', () => {
  const { ctx, created } = mockContext();
  const previous = globalThis.AudioContext;
  globalThis.AudioContext = function () { return ctx; };
  try {
    const sound = new Sound();
    sound.build();
  } finally {
    globalThis.AudioContext = previous;
  }
  const buffer = created.convolvers[0].buffer;
  assert.equal(buffer.numberOfChannels, 2);
  assert.equal(buffer.length, Math.round(44100 * 1.8));
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    assert.ok(data.every((v) => v >= -1 && v <= 1));
    assert.ok(Math.abs(data[data.length - 1]) < 0.001);
  }
});

test('AC-6 suite wired into npm test', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.scripts.test, /audio-groovr-delegation\.test\.mjs/);
});

const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const spatialBody = source.slice(source.indexOf('export function spatial('), source.indexOf('// ---- building blocks'));
const origin = new Vec2(0, 0);

test('AC-1 spatial delegates to spatial2D', () => {
  assert.match(importLine, /spatial2D/);
  assert.match(spatialBody, /spatial2D\(/);
  assert.doesNotMatch(spatialBody, /scratchRight|halfpi|\*\* 2/);
});

test('AC-2 groovr pinned to 0.1.0-alpha.4', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const installed = JSON.parse(readFileSync(new URL('../node_modules/@1pizzateam/groovr/package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.dependencies['@1pizzateam/groovr'], '0.1.0-alpha.4');
  assert.equal(installed.version, '0.1.0-alpha.4');
});

test('AC-3 pan follows side and facing', () => {
  assert.ok(spatial(origin, new Vec2(200, 200)).pan > 0.3);
  assert.ok(spatial(origin, new Vec2(200, -200)).pan < -0.3);
  assert.ok(Math.abs(spatial(origin, new Vec2(300, 0)).pan) < 1e-9);
  assert.ok(Math.abs(spatial(origin, new Vec2(-300, 0)).pan) < 1e-9);
  assert.ok(spatial(origin, new Vec2(200, 200), { angle: Math.PI / 2 }).pan < -0.3);
  assert.ok(spatial(origin, new Vec2(-200, 200), { angle: Math.PI / 2 }).pan > 0.3);
});

test('AC-4 gain falls off and cuts at range', () => {
  assert.equal(spatial(origin, new Vec2(0, 0)).gain, 1);
  const gains = [0, 100, 300, 600, 900].map((d) => spatial(origin, new Vec2(d, 0)).gain);
  for (let i = 1; i < gains.length; i++)
    assert.ok(gains[i] < gains[i - 1]);
  assert.equal(spatial(origin, new Vec2(1000.5, 0)).gain, 0);
  assert.equal(spatial(origin, new Vec2(5000, 0)).gain, 0);
});

test('AC-5 soft pan near the listener', () => {
  assert.ok(Math.abs(spatial(origin, new Vec2(0, 20)).pan) < 0.3);
  assert.ok(Math.abs(spatial(origin, new Vec2(0, 70)).pan - 0.9) < 1e-9);
  assert.equal(spatial(origin, new Vec2(0, 0)).pan, 0);
});

test('AC-6 spatial takes Vec2s without mutation', () => {
  const listener = new Vec2(10, -20);
  const source = new Vec2(300, 40);
  const got = spatial(listener, source, { angle: 0.7 });
  assert.ok(spatial.length <= 3);
  assert.deepEqual([listener.x, listener.y, source.x, source.y], [10, -20, 300, 40]);
  for (const key of ['pan', 'gain', 'distance'])
    assert.equal(typeof got[key], 'number');
});

test('AC-7 main.js passes no scalar coordinates to spatial', () => {
  assert.ok(!mainSource.includes('spatial('));
  assert.match(source, /spatial\(this\.listener\.pos, pos, this\.listener\)/);
});

test('AC-8 elevatorStop delegates female robotic welcome voice to speak', () => {
  assert.match(importLine, /speak/);
  assert.match(source, /elevatorStop\(ctx,\s*out,\s*t,\s*\{\s*gender\s*=\s*'female'\s*\}/);
  assert.match(source, /speak\(ctx,\s*out,\s*t\s*\+\s*0\.42,\s*'welcome',\s*\{\s*gender,\s*gain:\s*0\.38/);
  const { ctx, created } = mockContext();
  const info = RECIPES.elevatorStop(ctx, node(), 0);
  assert.ok(info.duration > 1, 'elevatorStop duration includes the welcome speech');
  assert.ok(created.shapers.length >= 1, 'elevatorStop creates vocal-cord waveshaper for robotic voice');
});

test('AC-9 whoAreYou synthesizes "who are you ?" and triggers once when opening the first non-elevator door', () => {
  assert.match(source, /whoAreYou\(ctx,\s*out,\s*t,\s*\{\s*gender\s*=\s*'female'\s*\}/);
  assert.match(source, /speak\(ctx,\s*out,\s*t\s*\+\s*0\.18,\s*'who are you \?',\s*\{\s*gender,\s*gain:\s*0\.38/);
  const { ctx, created } = mockContext();
  const info = RECIPES.whoAreYou(ctx, node(), 0);
  assert.ok(info.duration > 0.8, 'whoAreYou duration covers the full sentence');
  assert.ok(created.shapers.length >= 1, 'whoAreYou creates vocal-cord waveshaper');

  const game = new Game();
  const doors = [...game.level.doors.values()].filter((d) => !d.elevator);
  assert.ok(doors.length >= 2);
  // Elevator door opening does not trigger whoAreYou
  if (game.level.elevator?.door) {
    game.level.elevator.door.target = 1;
    game.events.length = 0;
    game.updateDoors(1 / 60);
    assert.equal(game.events.some((e) => e.type === 'whoAreYou'), false);
  }
  // First non-elevator door opening emits whoAreYou once
  doors[0].target = 1;
  game.events.length = 0;
  game.updateDoors(1 / 60);
  assert.equal(game.events.filter((e) => e.type === 'whoAreYou').length, 1);
  // Second non-elevator door opening does not emit whoAreYou again
  doors[1].target = 1;
  game.events.length = 0;
  game.updateDoors(1 / 60);
  assert.equal(game.events.filter((e) => e.type === 'whoAreYou').length, 0);
});

process.exit(failed ? 1 : 0);
