/**
 * Generative dark score, synthesised live like the rest of the sound: no audio files.
 * Slow layers are scheduled just ahead of the audio clock, so nothing repeats exactly.
 * In play: a dissonant pad that swells and fades, a sub boom, far-off inharmonic bells and a
 * metallic scrape. On the title screen: a sub-bass throb, and a pounding slow bassline, with no pad, melody or bells so it stays apart from the play score.
 */

const ROOT = 36.71; // D1
// D phrygian with a tritone: the semitone above the root and the flat fifth are the unease
const SCALE = [1, 16 / 15, 6 / 5, 45 / 32, 8 / 5, 9 / 5];
const CHORDS = [[1, 16 / 15, 45 / 32], [1, 6 / 5, 45 / 32], [1, 16 / 15, 8 / 5], [1, 45 / 32, 9 / 5]];
const LOOKAHEAD = 3;
const FADE = 2;
const LAYERS = {
  play: ['pad', 'boom', 'bell', 'scrape'],
  title: ['throb', 'bassline'],
  metal: ['bar'],
};
// one note per step, 0 is a rest: hammering the root, then slipping to the flat second
// metal: 150 bpm, sixteen steps a bar, four bars to a phrase. x chug, o open chord, b flat second, t tritone, . rest
const BEAT = 0.4;
const STEP = BEAT / 4;
const RIFFS = [
  'xx.xx.xxo.xx.xx.',
  'xx.xx.xx.xxbb.t.',
  'xxxxxxxxxxxxbbbb',
  'o...o.bb.o..ttt.',
];
const GUITAR = { x: [1, false], o: [1, true], b: [16 / 15, false], t: [45 / 32, false] };

const BASSLINE = [1, 0, 1, 0, 1, 1, 16 / 15, 0, 1, 0, 1, 0, 16 / 15, 16 / 15, 1, 0];

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function noiseBuffer(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++)
    data[i] = Math.random() * 2 - 1;
  return buffer;
}

export class Music {
  constructor(ctx, destination, reverb) {
    this.ctx = ctx;
    this.reverb = reverb;
    this.destination = destination;
    this.level = this.bus();
    this.noise = noiseBuffer(ctx, 4);
    this.next = {};
    this.mode = null;
    this.grit = this.distortion();
    this.timer = null;
  }

  bus() {
    const level = this.ctx.createGain();
    level.gain.value = 0;
    level.connect(this.destination);
    this.wetBus = this.ctx.createGain();
    this.wetBus.connect(this.reverb);
    this.chain = null;
    this.barCount = 0;
    return level;
  }

  fadeOut(level, wetBus) {
    const now = this.ctx.currentTime;
    for (const node of [level, wetBus]) {
      node.gain.cancelScheduledValues(now);
      node.gain.setValueAtTime(node.gain.value, now);
      node.gain.linearRampToValueAtTime(0, now + FADE);
    }
    setTimeout(() => {
      level.disconnect();
      wetBus.disconnect();
    }, FADE * 1000 + 100);
  }

  /** Fade the score in or out. It only schedules notes while audible. */
  setLevel(level, mode = 'play') {
    const { ctx } = this;
    if (this.mode && this.mode !== mode && level > 0) {
      // changing score fades the old one out over two seconds, its notes still scheduled but going nowhere
      this.fadeOut(this.level, this.wetBus);
      this.level = this.bus();
      this.mode = null;
    }
    this.level.gain.setTargetAtTime(level, ctx.currentTime, this.mode ? 1.5 : 0.3);
    if (level === 0) {
      clearInterval(this.timer);
      this.timer = null;
      this.mode = null;
      return;
    }
    if (this.mode !== mode) {
      const now = ctx.currentTime;
      this.mode = mode;
      this.next = mode === 'title'
        ? { throb: now + 0.2, bassline: now + 3 }
        : mode === 'metal'
        ? { bar: now + 0.3 }
        : { pad: now + 0.5, boom: now + 4, bell: now + 6, scrape: now + 20 };
    }
    if (!this.timer)
      this.timer = setInterval(() => this.schedule(), 500);
  }

  schedule() {
    const horizon = this.ctx.currentTime + LOOKAHEAD;
    for (const name of LAYERS[this.mode])
      while (this.next[name] < horizon)
        this.next[name] += this[name](this.next[name]);
  }

  /** A soft-clipping curve that turns saws into something heavy and industrial. */
  distortion() {
    const shaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++)
      curve[i] = Math.tanh((i / 127.5 - 1) * 4);
    shaper.curve = curve;
    shaper.oversample = '2x';
    return shaper;
  }

  send(node, amount) {
    const wet = this.ctx.createGain();
    wet.gain.value = amount;
    node.connect(wet);
    wet.connect(this.wetBus);
  }

  /** A swelling, detuned chord that opens up its filter as it rises, then sinks away. Returns the wait before the next one. */
  pad(t) {
    const { ctx } = this;
    const octave = pick([1, 1, 2]);
    const rise = rand(5, 8);
    const fall = rand(6, 10);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.16, t + rise);
    gain.gain.linearRampToValueAtTime(0, t + rise + fall);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 3;
    filter.frequency.setValueAtTime(140, t);
    filter.frequency.linearRampToValueAtTime(rand(500, 900), t + rise);
    filter.frequency.linearRampToValueAtTime(120, t + rise + fall);
    filter.connect(gain);
    gain.connect(this.level);
    this.send(gain, 0.6);
    for (const ratio of pick(CHORDS)) {
      for (const detune of [-9, 7]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = ROOT * octave * 2 * ratio;
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(t);
        osc.stop(t + rise + fall + 0.1);
      }
    }
    return rise + fall * rand(0.3, 0.6);
  }

  /** A deep, slow hit with a falling pitch, like something heavy far below. */
  boom(t) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.exponentialRampToValueAtTime(ROOT, t + 1.2);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 3);
    osc.connect(gain);
    gain.connect(this.level);
    this.send(gain, 0.4);
    osc.start(t);
    osc.stop(t + 3.1);
    return rand(7, 14);
  }

  /** A thin, inharmonic bell from far away: a few notes of the scale, soaked in reverb. */
  bell(t) {
    const { ctx } = this;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + 5);
    gain.connect(this.level);
    this.send(gain, 1.2);
    const base = ROOT * 8 * pick(SCALE);
    for (const ratio of [1, 2.76, 5.4]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = base * ratio;
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 5.1);
    }
    return rand(4, 11);
  }

  /** A rare, rising metallic screech: noise through a narrow band that sweeps upward. */
  scrape(t) {
    const { ctx } = this;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 14;
    filter.frequency.setValueAtTime(rand(500, 900), t);
    filter.frequency.exponentialRampToValueAtTime(rand(1800, 3200), t + 3.5);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 2);
    gain.gain.linearRampToValueAtTime(0, t + 3.5);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.level);
    this.send(gain, 0.8);
    source.start(t);
    source.stop(t + 3.6);
    return rand(25, 50);
  }

  /** A constant sub-bass throb: a low sine and a muffled saw, pulsing slowly like a machine far below. */
  throb(t) {
    const { ctx } = this;
    const length = 16;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 3);
    gain.gain.setValueAtTime(0.3, t + length - 3);
    gain.gain.linearRampToValueAtTime(0, t + length);
    const pulse = ctx.createGain();
    pulse.gain.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.5;
    const depth = ctx.createGain();
    depth.gain.value = 0.4;
    lfo.connect(depth);
    depth.connect(pulse.gain);
    pulse.connect(gain);
    gain.connect(this.level);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 160;
    filter.connect(pulse);
    for (const [type, ratio] of [['sine', 1], ['sawtooth', 2]]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = ROOT * ratio;
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + length + 0.1);
    }
    lfo.start(t);
    lfo.stop(t + length + 0.1);
    return length - 3;
  }

  /** Slow, pounding bass notes that stay on the root and slip down to the flat second, then rest. */
  bassline(t) {
    const { ctx } = this;
    const step = rand(1.1, 1.3);
    BASSLINE.forEach((ratio, i) => {
      if (!ratio)
        return;
      const start = t + i * step;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.4, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + step * 1.6);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, start);
      filter.frequency.exponentialRampToValueAtTime(90, start + step);
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.grit.curve;
      shaper.connect(filter);
      filter.connect(gain);
      gain.connect(this.level);
      this.send(gain, 0.25);
      const sub = ctx.createOscillator();
      sub.frequency.value = ROOT * ratio;
      sub.connect(gain);
      sub.start(start);
      sub.stop(start + step * 1.6 + 0.1);
      const saw = ctx.createOscillator();
      saw.type = 'sawtooth';
      saw.frequency.value = ROOT * 2 * ratio;
      saw.connect(shaper);
      saw.start(start);
      saw.stop(start + step * 1.6 + 0.1);
    });
    return BASSLINE.length * step + rand(2, 5);
  }

  /** A struck piece of heavy metal, ringing in a very large room. */
  clang(t) {
    const { ctx } = this;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.14, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + 6);
    gain.connect(this.level);
    this.send(gain, 1.4);
    const base = ROOT * pick([4, 6, 8]);
    for (const ratio of [1, 1.51, 2.39, 3.71]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = base * ratio;
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 6.1);
    }
    return rand(6, 12);
  }

  /** The guitar amp: everything played goes through one drive stage, a cabinet-ish filter and the level bus. */
  amp() {
    if (this.chain)
      return this.chain;
    const { ctx } = this;
    const drive = ctx.createGain();
    drive.gain.value = 7;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    const body = ctx.createBiquadFilter();
    body.type = 'highpass';
    body.frequency.value = 70;
    const out = ctx.createGain();
    out.gain.value = 0.2;
    drive.connect(this.grit);
    this.grit.connect(tone);
    tone.connect(body);
    body.connect(out);
    out.connect(this.level);
    this.send(out, 0.2);
    this.chain = drive;
    return drive;
  }

  /** A power chord: root, fifth and octave on detuned saws and a square. Palm-muted ones are short and dry. */
  chord(t, ratio, open) {
    const { ctx } = this;
    const length = open ? STEP * 3.5 : STEP * 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.004);
    gain.gain.setValueAtTime(1, t + length * 0.6);
    gain.gain.linearRampToValueAtTime(0, t + length);
    gain.connect(this.amp());
    const root = ROOT * 2 * ratio;
    for (const [type, mult, detune] of [['sawtooth', 1, -7], ['sawtooth', 1, 7], ['sawtooth', 1.5, 0], ['square', 2, 0]]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = root * mult;
      osc.detune.value = detune;
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + length + 0.05);
    }
  }

  noiseHit(t, { type, freq, length, level, wet = 0 }) {
    const { ctx } = this;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + length);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.level);
    if (wet)
      this.send(gain, wet);
    source.start(t, Math.random() * 3);
    source.stop(t + length + 0.02);
  }

  kick(t, level) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain);
    gain.connect(this.level);
    osc.start(t);
    osc.stop(t + 0.25);
    this.noiseHit(t, { type: 'bandpass', freq: 3500, length: 0.012, level: level * 0.4 });
  }

  snare(t) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.1);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.level);
    osc.start(t);
    osc.stop(t + 0.16);
    this.noiseHit(t, { type: 'highpass', freq: 1800, length: 0.2, level: 0.45, wet: 0.25 });
  }

  /** One bar of drums and guitar. Four bars make a phrase, which ends on a crash. Returns the bar length. */
  bar(t) {
    const riff = RIFFS[this.barCount % RIFFS.length];
    if (this.barCount % RIFFS.length === 0)
      this.noiseHit(t, { type: 'highpass', freq: 4500, length: 2.2, level: 0.3, wet: 0.5 });
    for (let i = 0; i < 16; i++) {
      const at = t + i * STEP;
      const note = GUITAR[riff[i]];
      if (note) {
        this.chord(at, note[0], note[1]);
        this.kick(at, note[1] ? 0.7 : 0.45);
      }
      if (i === 4 || i === 12)
        this.snare(at);
      if (i % 2 === 0)
        this.noiseHit(at, { type: 'highpass', freq: 7500, length: 0.045, level: 0.12 });
    }
    this.barCount++;
    return 16 * STEP;
  }
}
