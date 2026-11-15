export const GRAPHICS_STORAGE_KEY = 'doomr.graphics';
export const GRAPHICS_VERSION = 1;

/** Fixed render-resolution steps, as a fraction of the screen; the adaptive scaler multiplies on top of this. */
export const RESOLUTION_STEPS = Object.freeze([1, 0.85, 0.7, 0.5]);

export const GLOW_OFF = 0;
export const GLOW_LOW = 1;
export const GLOW_HIGH = 2;
const GLOW_NAMES = Object.freeze(['OFF', 'LOW', 'HIGH']);

export const PRESET_NAMES = Object.freeze(['high', 'medium', 'low']);
const PRESETS = Object.freeze({
  high: Object.freeze({ resolution: 0, adaptive: true, glow: GLOW_HIGH, hudGlow: true }),
  medium: Object.freeze({ resolution: 1, adaptive: true, glow: GLOW_LOW, hudGlow: true }),
  low: Object.freeze({ resolution: 3, adaptive: true, glow: GLOW_OFF, hudGlow: false }),
});

const wrap = (value, delta, count) => (value + delta + count) % count;

/**
 * Graphics options that trade looks for speed on older machines. Persisted in localStorage;
 * `version` goes up on every change so the game knows when to re-apply them.
 */
export class GraphicsSettings {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage ?? null;
    this.version = 0;
    this.resolution = PRESETS.high.resolution;
    this.adaptive = PRESETS.high.adaptive;
    this.glow = PRESETS.high.glow;
    this.hudGlow = PRESETS.high.hudGlow;
    this.load();
  }

  get scale() {
    return RESOLUTION_STEPS[this.resolution];
  }

  /** The name of the preset the options match, or 'custom'. */
  get presetName() {
    for (const name of PRESET_NAMES) {
      const p = PRESETS[name];
      if (p.resolution === this.resolution && p.adaptive === this.adaptive && p.glow === this.glow && p.hudGlow === this.hudGlow)
        return name;
    }
    return 'custom';
  }

  get resolutionText() {
    return `${Math.round(this.scale * 100)}%`;
  }

  get glowText() {
    return GLOW_NAMES[this.glow];
  }

  applyPreset(name) {
    const p = PRESETS[name];
    if (!p)
      return false;
    this.resolution = p.resolution;
    this.adaptive = p.adaptive;
    this.glow = p.glow;
    this.hudGlow = p.hudGlow;
    this.changed();
    return true;
  }

  cyclePreset(delta) {
    const at = PRESET_NAMES.indexOf(this.presetName);
    // from a custom mix, forward goes to the first preset and backward to the last
    const next = at < 0 ? (delta > 0 ? 0 : PRESET_NAMES.length - 1) : wrap(at, delta, PRESET_NAMES.length);
    this.applyPreset(PRESET_NAMES[next]);
  }

  cycleResolution(delta) {
    this.resolution = wrap(this.resolution, delta, RESOLUTION_STEPS.length);
    this.changed();
  }

  toggleAdaptive() {
    this.adaptive = !this.adaptive;
    this.changed();
  }

  cycleGlow(delta) {
    this.glow = wrap(this.glow, delta, GLOW_NAMES.length);
    this.changed();
  }

  toggleHudGlow() {
    this.hudGlow = !this.hudGlow;
    this.changed();
  }

  changed() {
    this.version++;
    this.save();
  }

  load() {
    let raw = null;
    try {
      raw = this.storage?.getItem(GRAPHICS_STORAGE_KEY) ?? null;
    } catch {
      return;
    }
    if (raw === null)
      return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (data === null || typeof data !== 'object' || data.version !== GRAPHICS_VERSION)
      return;
    if (Number.isInteger(data.resolution) && data.resolution >= 0 && data.resolution < RESOLUTION_STEPS.length)
      this.resolution = data.resolution;
    if (typeof data.adaptive === 'boolean')
      this.adaptive = data.adaptive;
    if (Number.isInteger(data.glow) && data.glow >= GLOW_OFF && data.glow <= GLOW_HIGH)
      this.glow = data.glow;
    if (typeof data.hudGlow === 'boolean')
      this.hudGlow = data.hudGlow;
  }

  save() {
    try {
      this.storage?.setItem(GRAPHICS_STORAGE_KEY, JSON.stringify({
        version: GRAPHICS_VERSION,
        resolution: this.resolution,
        adaptive: this.adaptive,
        glow: this.glow,
        hudGlow: this.hudGlow,
      }));
    } catch {
      // storage can be blocked or full: the options still apply for this session
    }
  }
}
