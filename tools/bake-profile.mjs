// One-off bake of `src/face/doomr.facerprofile.json` from the FaceR build that still held this content as code
// (the version before FaceR stopped owning emotions, default look, material and damage shaping).
// Run: node tools/bake-profile.mjs <path to that FaceR dist/facer.js>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { createDefaultEmotions, createDefaultAppearance, createDefaultPersonality } = await import(path.resolve(process.argv[2]));
const v3 = (v) => [v.x, v.y, v.z].map((n) => Math.round(n * 1e5) / 1e5);

const emotions = {};
for (const [name, layer] of Object.entries(createDefaultEmotions())) {
  emotions[name] = { muscles: layer.muscles, headEulerOffset: v3(layer.headEulerOffset) };
}
const a = createDefaultAppearance();
const appearance = { damageSeed: a.damageSeed };
for (const k of ['skinColor', 'skinShadowColor', 'lipColor', 'irisColor', 'scleraColor', 'browColor', 'hairColor', 'teethColor']) appearance[k] = v3(a[k]);
const p = createDefaultPersonality();
const personality = {
  blinkIntervalRange: [p.blinkIntervalRange.x, p.blinkIntervalRange.y], blinkDuration: p.blinkDuration, saccadeFrequency: p.saccadeFrequency,
  saccadeAmplitude: [p.saccadeAmplitude.x, p.saccadeAmplitude.y], headFollowRatio: p.headFollowRatio, headDamping: p.headDamping,
  eyeDamping: p.eyeDamping, asymmetryAmount: p.asymmetryAmount, microJitterAmount: p.microJitterAmount,
};

// damage shaping, from the old deformer (applyTrauma) and FaceR.update (wound grimace / panting)
const damage = {
  // health below each value raises the tier by one (tier 1 below 95 ... tier 4 below 40)
  tierHealthThresholds: [95, 80, 60, 40],
  // skin vertices at or above this rest Z are candidates for the swelling zones
  minZ: 2.2,
  // displacement = falloff * weight * (tier - tierBase) * (normal * n + constant), per axis
  zones: [
    { id: 'malar', center: [-1.95, 1.05, 5.45], radii: [1.15, 0.85, 1.40], minTier: 1, tierBase: 0, weight: 0.085, normal: [1, 1, 1.15], constant: [0, -0.03, 0] },
    { id: 'lid', center: [-1.78, 2.18, 5.55], radii: [0.72, 0.36, 1.10], minTier: 1, tierBase: 0, weight: 0.055, normal: [0, 0, 0], constant: [0, -1, 0.45] },
    { id: 'brow', center: [2.05, 2.92, 5.75], radii: [0.95, 0.52, 1.25], minTier: 2, tierBase: 1, weight: 0.075, normal: [1, 0.6, 1.2], constant: [0, 0, 0] },
    { id: 'lip', center: [0.68, -2.62, 6.35], radii: [0.58, 0.38, 1.10], minTier: 2, tierBase: 1, weight: 0.07, normal: [0, 0, 0], constant: [0, -0.55, 1.15] },
    { id: 'nose', center: [0, 0.68, 6.75], radii: [0.92, 1.05, 1.35], minTier: 3, tierBase: 2, weight: 0.16, normal: [0, 0, 0], constant: [1, 0, 0.3125] },
  ],
  // live muscle grimace while injured (and alive, autonomous): muscle += perTier * (tier - tierBase) + intensity * traumaIntensity + pant * pantAmount
  reaction: {
    intensityHealthRef: 85, intensityPerTier: 0.22,
    pant: { minTier: 2, perTier: 0.085, tierBase: 1, floor: 0.45, freqBase: 2.6, freqIntensity: 2.4 },
    muscles: [
      { muscle: 'eyeSquintL', minTier: 1, tierBase: 0, perTier: 0.16 },
      { muscle: 'eyeBlinkL', minTier: 1, tierBase: 0, perTier: 0.11 },
      { muscle: 'cheekSquintL', minTier: 1, tierBase: 0, perTier: 0.14 },
      { muscle: 'browDownL', minTier: 1, tierBase: 0, perTier: 0.12 },
      { muscle: 'browInnerUp', minTier: 1, intensity: 0.14 },
      { muscle: 'noseSneerL', minTier: 2, tierBase: 1, perTier: 0.12 },
      { muscle: 'mouthUpperUpL', minTier: 2, tierBase: 1, perTier: 0.09 },
      { muscle: 'mouthFrownL', minTier: 2, tierBase: 1, perTier: 0.10 },
      { muscle: 'mouthFrownR', minTier: 2, tierBase: 1, perTier: 0.10 },
      { muscle: 'jawOpen', minTier: 2, pant: 1 },
      { muscle: 'mouthLowerDownL', minTier: 2, pant: 0.75 },
      { muscle: 'mouthLowerDownR', minTier: 2, pant: 0.75 },
    ],
  },
};


// transient reaction recipes, from the old ImpulseController (muscle weights scale with the impulse envelope `w`).
// duration/attack in seconds and phase fraction; headEuler is added x w; headEulerDirX is added x direction.x x w;
// directionalMuscles pick a weight by the sign of direction.x; gazeFromDir adds clamp(direction) x w to the gaze offset.
const shoot = {
  duration: 0.25, attack: 0.12,
  muscles: { browDownL: 0.88, browDownR: 0.88, eyeSquintL: 0.65, eyeSquintR: 0.65, noseSneerL: 0.72, noseSneerR: 0.72, mouthUpperUpL: 0.2, mouthUpperUpR: 0.2, mouthPress: 0.85, jawForward: 0.55 },
  headEuler: [-0.08, 0, 0],
};
const impulses = {
  pain: {
    duration: 0.45, attack: 0.18,
    muscles: { browInnerUp: 0.85, browDownL: 0.70, browDownR: 0.70, eyeSquintL: 0.92, eyeSquintR: 0.92, eyeBlinkL: 0.75, eyeBlinkR: 0.75, cheekSquintL: 0.80, cheekSquintR: 0.80, noseSneerL: 0.65, noseSneerR: 0.65, jawOpen: 0.65, mouthFrownL: 0.65, mouthFrownR: 0.65 },
    headEuler: [0.18, 0, 0], headEulerDirX: [0, -0.25, 0.14],
  },
  shoot,
  surprise: {
    duration: 0.65, attack: 0.18,
    muscles: { browInnerUp: 0.92, browOuterUpL: 0.85, browOuterUpR: 0.85, eyeWideL: 0.95, eyeWideR: 0.95, jawOpen: 0.58, mouthFunnel: 0.52 },
    headEuler: [0.10, 0, 0],
  },
  glance: {
    duration: 0.90, attack: 0.18,
    directionalMuscles: [{ muscle: 'browOuterUpL', whenXNegative: 0.45, otherwise: 0.15 }, { muscle: 'browOuterUpR', whenXNegative: 0.15, otherwise: 0.45 }],
    gazeFromDir: { maxX: 0.75, maxY: 0.45 },
  },
  evilGrin: {
    duration: 1.40, attack: 0.18,
    muscles: { browDownL: 0.80, browDownR: 0.80, browOuterUpL: 0.48, browOuterUpR: 0.48, eyeSquintL: 0.68, eyeSquintR: 0.68, cheekSquintL: 0.78, cheekSquintR: 0.78, mouthSmileL: 0.86, mouthSmileR: 0.86, mouthUpperUpL: 0.16, mouthUpperUpR: 0.16, jawOpen: 0.08 },
    headEuler: [-0.06, 0, 0],
  },
};
// the held snarl of a weapon that keeps firing (setShooting) uses the `shoot` recipe above; it eases in at `holdRiseRate`, out at `holdFallRate`
const holdShooting = { holdRiseRate: 35, holdFallRate: 22 };

const profile = {
  format: 'facer-profile', version: 1, id: 'doomr',
  defaultBaseHead: 'african_sculpt',
  emotions, appearance, personality,
  material: { ambient: [0.38, 0.34, 0.34], diffuse: [0.92, 0.90, 0.88], specular: [0.22, 0.20, 0.18], shininess: 22 },
  damage, impulses, holdShooting,
};
const out = path.resolve(here, '../src/face/doomr.facerprofile.json');
fs.writeFileSync(out, JSON.stringify(profile, null, 1) + '\n');
console.log('wrote', out, Object.keys(emotions).join(','));
