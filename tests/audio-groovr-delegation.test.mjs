import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { softClip } from '@1pizzateam/groovr';
import { RECIPES, Sound } from '../src/audio.js';

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

process.exit(failed ? 1 : 0);
