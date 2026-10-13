/**
 * Sound for the game, synthesised live with the Web Audio API: there are no audio files,
 * in the same spirit as the line-only graphics.
 *
 * The game never calls this directly. It emits plain events ({ type, x, y, ... }) that
 * main.js hands to Sound.handle(), so the rules stay headless and testable.
 * A recipe draws one sound into a bus node and returns how long it lasts and how much
 * of it should go to the room reverb. They also run in an OfflineAudioContext, which is
 * how they are checked for silence, clipping and clicks.
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rand = (min, max) => min + Math.random() * (max - min);

/**
 * Where a sound at (x, y) is heard from a listener at (x, y) looking along `angle`.
 * Sound fades with distance and pans left/right by where it is relative to the facing
 * direction. In the game's plane, "right" of a viewer looking along `angle` is (-sin, cos).
 */
export function spatial(listener, x, y, { reference = 220, range = 1000 } = {}) {
  const dx = x - listener.x;
  const dy = y - listener.y;
  const distance = Math.hypot(dx, dy);
  const side = distance < 1 ? 0 : (dx * -Math.sin(listener.angle) + dy * Math.cos(listener.angle)) / distance;
  // a source right on top of the listener has no direction, so ease the pan in
  const pan = clamp(side * Math.min(1, distance / 70), -1, 1) * 0.9;
  const gain = distance > range ? 0 : 1 / (1 + (distance / reference) ** 2);
  return { pan, gain, distance };
}

// ---- building blocks ------------------------------------------------------------------------

const noiseBuffers = new WeakMap();

function noiseBuffer(ctx) {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

/** Quick attack, exponential fall to silence: the shape of nearly every sound here. */
function envelope(param, t, attack, peak, duration) {
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(peak, t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + duration);
}

const shapers = new WeakMap();

function shaper(ctx, drive) {
  let curve = shapers.get(ctx);
  if (!curve) {
    curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++)
      curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * drive);
    shapers.set(ctx, curve);
  }
  const node = ctx.createWaveShaper();
  node.curve = curve;
  return node;
}

/** An oscillator with a pitch glide, an optional filter, vibrato and distortion. */
function tone(ctx, out, t, { type = 'sine', from, to = from, duration, gain, attack = 0.004, filter, vibrato, drive }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from)
    osc.frequency.exponentialRampToValueAtTime(to, t + duration);
  const level = ctx.createGain();
  envelope(level.gain, t, attack, gain, duration);

  let node = osc;
  if (filter) {
    const biquad = ctx.createBiquadFilter();
    biquad.type = filter.type ?? 'lowpass';
    biquad.frequency.setValueAtTime(filter.from ?? filter.freq, t);
    if (filter.to)
      biquad.frequency.exponentialRampToValueAtTime(filter.to, t + duration);
    biquad.Q.value = filter.q ?? 0.7;
    node.connect(biquad);
    node = biquad;
  }
  if (drive) {
    const shape = shaper(ctx, drive);
    node.connect(shape);
    node = shape;
  }
  node.connect(level);
  level.connect(out);

  if (vibrato) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = vibrato.rate;
    const depth = ctx.createGain();
    depth.gain.value = vibrato.depth;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + duration + 0.05);
  }
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

/** Filtered noise: crackle, whoosh, splat, breath. */
function noise(ctx, out, t, { duration, gain, filter = 'lowpass', from, to = from, q = 0.7, attack = 0.002 }) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const biquad = ctx.createBiquadFilter();
  biquad.type = filter;
  biquad.frequency.setValueAtTime(from, t);
  if (to !== from)
    biquad.frequency.exponentialRampToValueAtTime(to, t + duration);
  biquad.Q.value = q;
  const level = ctx.createGain();
  envelope(level.gain, t, attack, gain, duration);
  source.connect(biquad);
  biquad.connect(level);
  level.connect(out);
  source.start(t, Math.random() * 0.8);
  source.stop(t + duration + 0.05);
}

// ---- the sounds -----------------------------------------------------------------------------

/**
 * A throat: a distorted low saw with a slow tremble, and a wet rattle of band-passed noise on top.
 * It is the base of every monster voice, so they are low and guttural instead of whistly.
 */
function growl(ctx, out, t, { from, to, duration, gain = 0.3, drive = 3, rate = 11, depth = 14, cutoff = 600, wet = 0.2, rattle = 380 }) {
  tone(ctx, out, t, { type: 'sawtooth', from, to, duration, gain, filter: { freq: cutoff }, drive, vibrato: { rate, depth } });
  tone(ctx, out, t, { type: 'square', from: from * 0.5, to: to * 0.5, duration, gain: gain * 0.5, filter: { freq: cutoff * 0.5 } });
  noise(ctx, out, t, { duration, gain: wet, filter: 'bandpass', from: rattle, to: rattle * 0.5, q: 5, attack: 0.03 });
}

const arpeggio = (ctx, out, t, notes, { spacing, length, gain, type = 'triangle' }) => {
  notes.forEach((freq, i) => tone(ctx, out, t + i * spacing, { type, from: freq, duration: length, gain }));
};

export const RECIPES = {
  // the shotgun: a bright crack, a body of mid noise, a deep boom and a sub thump
  fire(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.5, gain: 0.45, from: 9000, to: 400 });
    noise(ctx, out, t, { duration: 0.26, gain: 0.3, filter: 'bandpass', from: 1800, to: 300, q: 0.8 });
    noise(ctx, out, t + 0.03, { duration: 0.08, gain: 0.18, filter: 'highpass', from: 3000 });
    tone(ctx, out, t, { from: 150, to: 38, duration: 0.36, gain: 0.45 });
    tone(ctx, out, t, { type: 'triangle', from: 72, to: 30, duration: 0.42, gain: 0.3 });
    return { duration: 0.6, wet: 0.5 };
  },
  // the pump: a back stroke, then a forward stroke with a heavier clunk
  pump(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.05, gain: 0.3, filter: 'highpass', from: 2500, to: 1500 });
    tone(ctx, out, t, { type: 'square', from: 1200, to: 600, duration: 0.04, gain: 0.1 });
    noise(ctx, out, t + 0.17, { duration: 0.06, gain: 0.34, filter: 'highpass', from: 1800, to: 900 });
    tone(ctx, out, t + 0.17, { from: 230, to: 110, duration: 0.09, gain: 0.28 });
    tone(ctx, out, t + 0.17, { type: 'square', from: 800, to: 400, duration: 0.05, gain: 0.08 });
    return { duration: 0.35, wet: 0.1 };
  },
  dry(ctx, out, t) {
    tone(ctx, out, t, { type: 'square', from: 2800, to: 1800, duration: 0.035, gain: 0.2 });
    noise(ctx, out, t, { duration: 0.025, gain: 0.2, filter: 'highpass', from: 4000 });
    return { duration: 0.1, wet: 0 };
  },

  impactWall(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.07, gain: 0.6, filter: 'bandpass', from: 3200, to: 1400, q: 2 });
    tone(ctx, out, t, { from: 1900, to: 900, duration: 0.06, gain: 0.16 });
    noise(ctx, out, t, { duration: 0.12, gain: 0.12, from: 900, to: 300 });
    return { duration: 0.2, wet: 0.25 };
  },
  impactDoor(ctx, out, t) {
    tone(ctx, out, t, { type: 'triangle', from: 320, to: 140, duration: 0.1, gain: 0.34 });
    noise(ctx, out, t, { duration: 0.06, gain: 0.22, filter: 'bandpass', from: 900, q: 1.2 });
    tone(ctx, out, t, { type: 'square', from: 540, to: 520, duration: 0.15, gain: 0.05 });
    return { duration: 0.25, wet: 0.2 };
  },
  flesh(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.14, gain: 0.45, from: 900, to: 250 });
    tone(ctx, out, t, { from: 110, to: 55, duration: 0.12, gain: 0.4 });
    noise(ctx, out, t + 0.02, { duration: 0.1, gain: 0.18, filter: 'bandpass', from: 700, to: 300, q: 3 });
    return { duration: 0.2, wet: 0.15 };
  },

  // enemies. Each has its own throat: the imp rasps and screams, the brute and the warden are huge and wet,
  // the skull wails, the crawler hisses and clicks, the swarmers squeal, the wraith keens.
  dieImp(ctx, out, t) {
    growl(ctx, out, t, { from: 330, to: 70, duration: 0.7, gain: 0.26, drive: 4, rate: 24, depth: 50, cutoff: 1600, rattle: 900, wet: 0.3 });
    noise(ctx, out, t + 0.03, { duration: 0.5, gain: 0.45, from: 1400, to: 200 });
    tone(ctx, out, t, { from: 90, to: 35, duration: 0.4, gain: 0.45 });
    return { duration: 0.8, wet: 0.3 };
  },
  dieBrute(ctx, out, t) {
    growl(ctx, out, t, { from: 120, to: 28, duration: 1.2, gain: 0.32, drive: 5, rate: 8, depth: 10, cutoff: 500, rattle: 300, wet: 0.35 });
    noise(ctx, out, t + 0.04, { duration: 0.7, gain: 0.45, from: 1200, to: 100 });
    tone(ctx, out, t, { from: 70, to: 24, duration: 0.9, gain: 0.42 });
    return { duration: 1.3, wet: 0.45 };
  },
  painImp(ctx, out, t) {
    growl(ctx, out, t, { from: 380, to: 220, duration: 0.2, gain: 0.2, drive: 3, rate: 30, depth: 40, cutoff: 1500, rattle: 800, wet: 0.1 });
    return { duration: 0.25, wet: 0.1 };
  },
  painBrute(ctx, out, t) {
    growl(ctx, out, t, { from: 110, to: 60, duration: 0.3, gain: 0.34, drive: 4, rate: 9, depth: 8, cutoff: 450, rattle: 300, wet: 0.18 });
    return { duration: 0.35, wet: 0.15 };
  },
  alertImp(ctx, out, t) {
    growl(ctx, out, t, { from: 230, to: 140, duration: 0.55, gain: 0.22, drive: 4, rate: 26, depth: 34, cutoff: 1200, rattle: 700, wet: 0.2 });
    return { duration: 0.6, wet: 0.25 };
  },
  alertBrute(ctx, out, t) {
    growl(ctx, out, t, { from: 78, to: 42, duration: 1.1, gain: 0.42, drive: 5, rate: 7, depth: 8, cutoff: 450, rattle: 260, wet: 0.3 });
    return { duration: 1.2, wet: 0.35 };
  },

  alertSkull(ctx, out, t) {
    tone(ctx, out, t, { type: 'triangle', from: 520, to: 340, duration: 0.9, gain: 0.2, vibrato: { rate: 6.5, depth: 36 } });
    tone(ctx, out, t, { type: 'sine', from: 780, to: 520, duration: 0.9, gain: 0.1, vibrato: { rate: 7.5, depth: 30 } });
    noise(ctx, out, t, { duration: 0.8, gain: 0.12, filter: 'bandpass', from: 2200, to: 900, q: 2, attack: 0.2 });
    return { duration: 1, wet: 0.55 };
  },
  painSkull(ctx, out, t) {
    tone(ctx, out, t, { type: 'sawtooth', from: 900, to: 380, duration: 0.2, gain: 0.16, filter: { freq: 2000 }, vibrato: { rate: 30, depth: 60 } });
    return { duration: 0.25, wet: 0.3 };
  },
  dieSkull(ctx, out, t) {
    tone(ctx, out, t, { type: 'triangle', from: 380, to: 1100, duration: 0.35, gain: 0.2, vibrato: { rate: 10, depth: 60 } });
    noise(ctx, out, t + 0.3, { duration: 0.08, gain: 0.5, filter: 'highpass', from: 2500 });
    noise(ctx, out, t + 0.32, { duration: 0.35, gain: 0.4, from: 2500, to: 250 });
    tone(ctx, out, t + 0.3, { from: 120, to: 40, duration: 0.3, gain: 0.4 });
    return { duration: 0.8, wet: 0.5 };
  },

  alertCrawler(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.55, gain: 0.2, filter: 'bandpass', from: 4200, to: 2600, q: 3, attack: 0.05 });
    for (let i = 0; i < 4; i++)
      noise(ctx, out, t + i * 0.07, { duration: 0.03, gain: 0.3, filter: 'highpass', from: 3500 });
    return { duration: 0.6, wet: 0.2 };
  },
  painCrawler(ctx, out, t) {
    tone(ctx, out, t, { type: 'sawtooth', from: 1500, to: 700, duration: 0.14, gain: 0.14, filter: { freq: 3000 } });
    noise(ctx, out, t, { duration: 0.12, gain: 0.2, filter: 'bandpass', from: 3000, q: 4 });
    return { duration: 0.2, wet: 0.15 };
  },
  dieCrawler(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.3, gain: 0.5, filter: 'bandpass', from: 1200, to: 250, q: 3 });
    noise(ctx, out, t, { duration: 0.05, gain: 0.35, filter: 'highpass', from: 3500 });
    tone(ctx, out, t, { from: 160, to: 50, duration: 0.25, gain: 0.4 });
    return { duration: 0.4, wet: 0.2 };
  },
  leap(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.3, gain: 0.5, filter: 'bandpass', from: 700, to: 3000, q: 1.2, attack: 0.04 });
    tone(ctx, out, t, { type: 'sawtooth', from: 900, to: 400, duration: 0.2, gain: 0.08, filter: { freq: 2500 } });
    return { duration: 0.35, wet: 0.15 };
  },

  alertSwarmer(ctx, out, t) {
    for (let i = 0; i < 5; i++)
      tone(ctx, out, t + i * 0.06, { type: 'square', from: 1900 - i * 90, to: 1400 - i * 90, duration: 0.05, gain: 0.07, filter: { freq: 3500 } });
    return { duration: 0.4, wet: 0.2 };
  },
  painSwarmer(ctx, out, t) {
    tone(ctx, out, t, { type: 'square', from: 2300, to: 1300, duration: 0.07, gain: 0.08, filter: { freq: 3500 } });
    return { duration: 0.1, wet: 0.1 };
  },
  dieSwarmer(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.14, gain: 0.45, filter: 'bandpass', from: 1500, to: 300, q: 4 });
    tone(ctx, out, t, { from: 200, to: 60, duration: 0.12, gain: 0.25 });
    return { duration: 0.2, wet: 0.1 };
  },
  bite(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.06, gain: 0.35, filter: 'highpass', from: 2800 });
    tone(ctx, out, t, { type: 'square', from: 320, to: 140, duration: 0.07, gain: 0.1, filter: { freq: 1500 } });
    return { duration: 0.12, wet: 0.1 };
  },

  alertWraith(ctx, out, t) {
    tone(ctx, out, t, { type: 'sine', from: 240, to: 520, duration: 0.7, gain: 0.2, vibrato: { rate: 5, depth: 28 } });
    tone(ctx, out, t + 0.1, { type: 'triangle', from: 360, to: 780, duration: 0.6, gain: 0.08, vibrato: { rate: 6.5, depth: 24 } });
    noise(ctx, out, t, { duration: 0.65, gain: 0.14, filter: 'bandpass', from: 700, to: 2400, q: 1.5, attack: 0.25 });
    return { duration: 0.8, wet: 0.6 };
  },
  painWraith(ctx, out, t) {
    tone(ctx, out, t, { type: 'sine', from: 700, to: 260, duration: 0.25, gain: 0.18, vibrato: { rate: 14, depth: 40 } });
    noise(ctx, out, t, { duration: 0.18, gain: 0.16, filter: 'bandpass', from: 1800, to: 600, q: 2 });
    return { duration: 0.3, wet: 0.4 };
  },
  dieWraith(ctx, out, t) {
    tone(ctx, out, t, { type: 'sine', from: 520, to: 90, duration: 0.9, gain: 0.22, vibrato: { rate: 8, depth: 50 } });
    noise(ctx, out, t, { duration: 0.8, gain: 0.25, filter: 'bandpass', from: 2600, to: 300, q: 1.2 });
    noise(ctx, out, t + 0.05, { duration: 0.12, gain: 0.3, filter: 'highpass', from: 3000 });
    return { duration: 1, wet: 0.65 };
  },
  rake(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.18, gain: 0.45, filter: 'bandpass', from: 5200, to: 1500, q: 1.5, attack: 0.02 });
    noise(ctx, out, t + 0.04, { duration: 0.1, gain: 0.3, filter: 'highpass', from: 4000 });
    tone(ctx, out, t, { type: 'sawtooth', from: 800, to: 300, duration: 0.15, gain: 0.07, filter: { freq: 2200 } });
    return { duration: 0.25, wet: 0.2 };
  },

  alertBoss(ctx, out, t) {
    growl(ctx, out, t, { from: 62, to: 34, duration: 1.8, gain: 0.34, drive: 6, rate: 6, depth: 7, cutoff: 380, rattle: 200, wet: 0.35 });
    noise(ctx, out, t, { duration: 1.6, gain: 0.18, filter: 'lowpass', from: 500, to: 150, attack: 0.3 });
    tone(ctx, out, t, { from: 38, to: 24, duration: 1.7, gain: 0.4 });
    return { duration: 1.9, wet: 0.6 };
  },
  painBoss(ctx, out, t) {
    growl(ctx, out, t, { from: 70, to: 40, duration: 0.45, gain: 0.45, drive: 5, rate: 7, depth: 7, cutoff: 380, rattle: 220, wet: 0.25 });
    return { duration: 0.5, wet: 0.3 };
  },
  dieBoss(ctx, out, t) {
    growl(ctx, out, t, { from: 80, to: 22, duration: 2.4, gain: 0.5, drive: 6, rate: 5, depth: 8, cutoff: 360, rattle: 180, wet: 0.4 });
    noise(ctx, out, t + 0.5, { duration: 1.6, gain: 0.5, from: 2000, to: 100 });
    tone(ctx, out, t + 0.2, { from: 60, to: 20, duration: 2, gain: 0.6 });
    return { duration: 2.6, wet: 0.7 };
  },
  stomp(ctx, out, t, { power = 1 } = {}) {
    tone(ctx, out, t, { from: 70, to: 26, duration: 0.3, gain: 0.35 + 0.35 * power });
    noise(ctx, out, t, { duration: 0.14, gain: 0.2 + 0.3 * power, from: 400, to: 90 });
    return { duration: 0.35, wet: 0.2 };
  },
  slam(ctx, out, t) {
    tone(ctx, out, t, { from: 90, to: 22, duration: 0.6, gain: 0.62 });
    noise(ctx, out, t, { duration: 0.5, gain: 0.45, from: 2500, to: 100 });
    noise(ctx, out, t, { duration: 0.08, gain: 0.4, filter: 'highpass', from: 2000 });
    return { duration: 0.7, wet: 0.5 };
  },
  // a body bursting: a wet crump, a rattle of squelches and bone cracks
  gib(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.4, gain: 0.7, from: 2200, to: 150 });
    tone(ctx, out, t, { from: 110, to: 30, duration: 0.4, gain: 0.55 });
    for (let i = 0; i < 4; i++)
      noise(ctx, out, t + 0.04 + i * 0.05, { duration: 0.1, gain: 0.28, filter: 'bandpass', from: 1100 - i * 150, to: 300, q: 4 });
    noise(ctx, out, t + 0.05, { duration: 0.03, gain: 0.35, filter: 'highpass', from: 3200 });
    noise(ctx, out, t + 0.14, { duration: 0.03, gain: 0.3, filter: 'highpass', from: 3600 });
    return { duration: 0.6, wet: 0.4 };
  },

  fireball(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.36, gain: 0.32, filter: 'bandpass', from: 500, to: 2200, q: 1.2 });
    tone(ctx, out, t, { type: 'sawtooth', from: 160, to: 520, duration: 0.3, gain: 0.12, filter: { freq: 900 } });
    tone(ctx, out, t, { from: 880, to: 1760, duration: 0.2, gain: 0.07 });
    return { duration: 0.45, wet: 0.2 };
  },
  explode(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.5, gain: 0.5, from: 3000, to: 150 });
    tone(ctx, out, t, { from: 100, to: 28, duration: 0.5, gain: 0.5 });
    noise(ctx, out, t, { duration: 0.15, gain: 0.18, filter: 'highpass', from: 2500 });
    return { duration: 0.6, wet: 0.5 };
  },
  // a barrel going up: a flat crack, a roaring body and a low rumble that lasts
  boom(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.9, gain: 0.5, from: 4500, to: 120 });
    noise(ctx, out, t, { duration: 0.08, gain: 0.3, filter: 'highpass', from: 3000 });
    tone(ctx, out, t, { from: 120, to: 24, duration: 1, gain: 0.55 });
    tone(ctx, out, t + 0.05, { type: 'sawtooth', from: 70, to: 30, duration: 0.8, gain: 0.14, filter: { freq: 300 }, drive: 3 });
    return { duration: 1.1, wet: 0.6 };
  },
  // a pellet ringing off a drum
  clang(ctx, out, t, { pitch = 1 } = {}) {
    tone(ctx, out, t, { type: 'triangle', from: 640 * pitch, to: 520 * pitch, duration: 0.3, gain: 0.16 });
    tone(ctx, out, t, { type: 'square', from: 1730 * pitch, duration: 0.12, gain: 0.05, filter: { freq: 3000 } });
    noise(ctx, out, t, { duration: 0.05, gain: 0.25, filter: 'highpass', from: 2500 });
    return { duration: 0.35, wet: 0.3 };
  },
  swing(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.22, gain: 0.9, filter: 'bandpass', from: 300, to: 1400, q: 0.9, attack: 0.05 });
    return { duration: 0.3, wet: 0.1 };
  },

  hurt(ctx, out, t) {
    tone(ctx, out, t, { type: 'sawtooth', from: 210, to: 95, duration: 0.28, gain: 0.28, filter: { freq: 900 } });
    noise(ctx, out, t, { duration: 0.12, gain: 0.32, from: 500, to: 200 });
    tone(ctx, out, t, { from: 70, to: 40, duration: 0.2, gain: 0.45 });
    return { duration: 0.35, wet: 0.15 };
  },
  death(ctx, out, t) {
    tone(ctx, out, t, { type: 'sawtooth', from: 160, to: 32, duration: 1.6, gain: 0.3, filter: { from: 600, to: 150 } });
    tone(ctx, out, t, { from: 60, to: 25, duration: 1.4, gain: 0.45 });
    noise(ctx, out, t, { duration: 1, gain: 0.13, from: 300, to: 100 });
    return { duration: 1.7, wet: 0.6 };
  },
  heartbeat(ctx, out, t) {
    tone(ctx, out, t, { from: 62, to: 40, duration: 0.12, gain: 0.55 });
    tone(ctx, out, t + 0.22, { from: 55, to: 35, duration: 0.14, gain: 0.4 });
    return { duration: 0.4, wet: 0 };
  },

  pickupHealth(ctx, out, t) {
    arpeggio(ctx, out, t, [659, 880, 1320], { spacing: 0.09, length: 0.16, gain: 0.22 });
    return { duration: 0.45, wet: 0.3 };
  },
  pickupAmmo(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.04, gain: 0.2, filter: 'highpass', from: 2500 });
    tone(ctx, out, t, { type: 'square', from: 1500, duration: 0.05, gain: 0.1 });
    tone(ctx, out, t + 0.07, { type: 'square', from: 1100, duration: 0.05, gain: 0.1 });
    tone(ctx, out, t + 0.12, { type: 'triangle', from: 990, duration: 0.12, gain: 0.16 });
    return { duration: 0.3, wet: 0.2 };
  },

  doorOpen(ctx, out, t) {
    tone(ctx, out, t, { from: 180, to: 90, duration: 0.1, gain: 0.3 });
    noise(ctx, out, t, { duration: 0.75, gain: 0.3, filter: 'bandpass', from: 180, q: 2, attack: 0.08 });
    tone(ctx, out, t, { type: 'sawtooth', from: 55, to: 48, duration: 0.75, gain: 0.1, filter: { freq: 200 } });
    return { duration: 0.85, wet: 0.3 };
  },
  doorClose(ctx, out, t) {
    noise(ctx, out, t, { duration: 0.55, gain: 0.3, filter: 'bandpass', from: 180, q: 2, attack: 0.08 });
    tone(ctx, out, t, { type: 'sawtooth', from: 48, to: 55, duration: 0.55, gain: 0.1, filter: { freq: 200 } });
    tone(ctx, out, t + 0.5, { from: 120, to: 45, duration: 0.18, gain: 0.5 });
    noise(ctx, out, t + 0.5, { duration: 0.1, gain: 0.25, from: 600, to: 200 });
    return { duration: 0.75, wet: 0.3 };
  },

  step(ctx, out, t, { pitch = 1 } = {}) {
    noise(ctx, out, t, { duration: 0.07, gain: 0.22, from: 500 * pitch, to: 200 });
    tone(ctx, out, t, { from: 85 * pitch, to: 50, duration: 0.09, gain: 0.32 });
    return { duration: 0.15, wet: 0.1 };
  },
  // a step in blood adds a wet squelch
  stepWet(ctx, out, t, { pitch = 1 } = {}) {
    noise(ctx, out, t, { duration: 0.07, gain: 0.2, from: 500 * pitch, to: 200 });
    tone(ctx, out, t, { from: 85 * pitch, to: 50, duration: 0.09, gain: 0.3 });
    noise(ctx, out, t + 0.01, { duration: 0.13, gain: 0.26, filter: 'bandpass', from: 900 * pitch, to: 350, q: 4 });
    tone(ctx, out, t + 0.02, { from: 300 * pitch, to: 120, duration: 0.07, gain: 0.08 });
    return { duration: 0.2, wet: 0.1 };
  },

  clear(ctx, out, t) {
    arpeggio(ctx, out, t, [523, 659, 784, 1047], { spacing: 0.11, length: 0.28, gain: 0.22 });
    tone(ctx, out, t + 0.33, { from: 2093, duration: 0.5, gain: 0.06 });
    return { duration: 1, wet: 0.5 };
  },
};

/** Render one recipe offline: used to check that it is audible, does not clip and ends cleanly. */
export async function renderRecipe(name, params = {}, sampleRate = 44100, seconds = 2.5) {
  const ctx = new OfflineAudioContext(2, Math.round(sampleRate * seconds), sampleRate);
  const bus = ctx.createGain();
  bus.connect(ctx.destination);
  const info = RECIPES[name](ctx, bus, 0, params);
  return { buffer: await ctx.startRendering(), ...info };
}

// ---- the player-facing side -----------------------------------------------------------------

/** Never play the same sound again sooner than this, so a shotgun volley is not 6 impacts at once. */
const MIN_INTERVAL = {
  impactWall: 0.03,
  impactDoor: 0.03,
  flesh: 0.04,
  step: 0.07,
  stepWet: 0.07,
  painImp: 0.15,
  painBrute: 0.15,
  hurt: 0.1,
  alertImp: 0.2,
  alertBrute: 0.3,
  alertSwarmer: 0.25,
  alertCrawler: 0.2,
  alertSkull: 0.25,
  painSwarmer: 0.1,
  dieSwarmer: 0.06,
  bite: 0.08,
  rake: 0.1,
  alertWraith: 0.25,
  painWraith: 0.12,
  dieWraith: 0.1,
  fireball: 0.07,
  stomp: 0.12,
  gib: 0.08,
  explode: 0.05,
  boom: 0.06,
  clang: 0.04,
  doorOpen: 0.2,
  doorClose: 0.2,
};

/** Which recipes an event plays, and whether it is a sound in the world or one in the player's head. */
function route(event) {
  // monsters speak with the voice of their kind: the recipes are named dieImp, painSkull, alertBoss...
  const voice = event.kind ? event.kind[0].toUpperCase() + event.kind.slice(1) : 'Imp';
  switch (event.type) {
    case 'fire': return [{ name: 'fire', local: true }, ...(event.pump ? [{ name: 'pump', local: true, delay: 0.42 }] : [])];
    case 'dry': return [{ name: 'dry', local: true }];
    case 'impact': return [{ name: event.surface === 'door' ? 'impactDoor' : 'impactWall' }];
    case 'flesh': return [{ name: 'flesh' }];
    case 'die': return [{ name: `die${voice}` }];
    case 'pain': return [{ name: `pain${voice}` }];
    case 'alert': return [{ name: `alert${voice}` }];
    case 'stomp': return [{ name: 'stomp', params: { power: event.power } }];
    case 'slam': return [{ name: 'slam' }];
    case 'gib': return [{ name: 'gib' }];
    case 'leap': return [{ name: 'leap' }];
    case 'rake': return [{ name: 'rake', pitch: true }];
    case 'bite': return [{ name: 'bite', pitch: true }];
    case 'fireball': return [{ name: 'fireball' }];
    case 'explode': return [{ name: 'explode' }];
    case 'boom': return [{ name: 'boom' }];
    case 'clang': return [{ name: 'clang', pitch: true }];
    case 'swing': return [{ name: 'swing' }];
    case 'hurt': return [{ name: 'hurt', local: true }];
    case 'death': return [{ name: 'death', local: true }];
    case 'heartbeat': return [{ name: 'heartbeat', local: true }];
    case 'pickup': return [{ name: event.kind === 'health' ? 'pickupHealth' : 'pickupAmmo', local: true }];
    case 'doorOpen': return [{ name: 'doorOpen' }];
    case 'doorClose': return [{ name: 'doorClose' }];
    case 'step': return [{ name: event.wet ? 'stepWet' : 'step', pitch: true }];
    case 'clear': return [{ name: 'clear', local: true }];
    default: return [];
  }
}

function readMuted() {
  try {
    return globalThis.localStorage?.getItem('doomr.muted') === '1';
  } catch {
    return false;
  }
}

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.reverb = null;
    this.ambient = null;
    this.listener = { x: 0, y: 0, angle: 0 };
    this.muted = readMuted();
    this.volume = 0.8;
    this.lastPlayed = new Map();
    this.scene = 'title';
  }

  /** Browsers only allow audio after a user gesture: call this from key and pointer handlers. */
  unlock() {
    if (!this.ctx)
      this.build();
    if (this.ctx?.state === 'suspended' && this.scene !== 'paused')
      this.ctx.resume();
  }

  build() {
    const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Context)
      return;
    const ctx = new Context();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    this.master.connect(limiter);
    limiter.connect(ctx.destination);

    // a small generated room: noise that decays, used as the reverb for loud sounds
    const length = Math.round(ctx.sampleRate * 1.8);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++)
        data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.5;
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = impulse;
    const reverbLevel = ctx.createGain();
    reverbLevel.gain.value = 0.5;
    this.reverb.connect(reverbLevel);
    reverbLevel.connect(this.master);

    this.buildAmbient();
    this.setScene(this.scene);
  }

  /** A low, slowly breathing drone under everything while you play. */
  buildAmbient() {
    const { ctx } = this;
    const level = ctx.createGain();
    level.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    filter.connect(level);
    level.connect(this.master);
    for (const [type, freq] of [['sine', 49], ['sine', 49.6], ['triangle', 98.4]]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(filter);
      osc.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const depth = ctx.createGain();
    depth.gain.value = 0.015;
    lfo.connect(depth);
    depth.connect(level.gain);
    lfo.start();
    this.ambient = level;
  }

  setListener(x, y, angle) {
    this.listener.x = x;
    this.listener.y = y;
    this.listener.angle = angle;
  }

  /** Follow the game state: the drone plays while the game does, and everything stops while paused. */
  setScene(state) {
    const changed = state !== this.scene;
    this.scene = state;
    const { ctx } = this;
    if (!ctx)
      return;
    if (state === 'paused') {
      if (ctx.state === 'running')
        ctx.suspend();
      return;
    }
    if (changed && ctx.state === 'suspended')
      ctx.resume();
    const playing = state === 'play' || state === 'dead' || state === 'cleared';
    this.ambient.gain.setTargetAtTime(playing ? 0.05 : 0, ctx.currentTime, 0.6);
  }

  setMuted(muted) {
    this.muted = muted;
    try {
      globalThis.localStorage?.setItem('doomr.muted', muted ? '1' : '0');
    } catch {
      // remembering the choice is a nicety
    }
    if (this.master)
      this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.03);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  handle(event) {
    for (const play of route(event))
      this.play(play.name, { ...play, x: event.x, y: event.y, visible: event.visible !== false });
  }

  play(name, { x = 0, y = 0, local = false, delay = 0, visible = true, pitch = false, params = {} } = {}) {
    const { ctx } = this;
    if (!ctx || this.muted || ctx.state !== 'running')
      return;
    const now = ctx.currentTime;
    const gap = MIN_INTERVAL[name] ?? 0;
    if (gap && now - (this.lastPlayed.get(name) ?? -1) < gap)
      return;
    this.lastPlayed.set(name, now);

    const place = local ? { pan: 0, gain: 1 } : spatial(this.listener, x, y);
    if (place.gain < 0.01)
      return;

    // a bus per sound: level, then muffling when the source is out of sight, then stereo position
    const bus = ctx.createGain();
    bus.gain.value = place.gain * (visible ? 1 : 0.55);
    let node = bus;
    if (!visible && !local) {
      const muffle = ctx.createBiquadFilter();
      muffle.type = 'lowpass';
      muffle.frequency.value = 800;
      node.connect(muffle);
      node = muffle;
    }
    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = place.pan;
      node.connect(panner);
      node = panner;
    }
    node.connect(this.master);

    const info = RECIPES[name](ctx, bus, now + delay + 0.005, pitch ? { ...params, pitch: rand(0.9, 1.12) } : params);
    if (info.wet > 0) {
      const send = ctx.createGain();
      send.gain.value = info.wet;
      bus.connect(send);
      send.connect(this.reverb);
    }
  }
}
