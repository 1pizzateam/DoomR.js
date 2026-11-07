import { Vec2, Vec3, Quat, Mat4x3, Utils, Rand } from '@1pizzateam/spock';
import { CustomMesh, Mesh, Texture, Material, PhongShader } from '@1pizzateam/roostr';
import {
  FACS_MUSCLE_NAMES,
  FACE_REGION_IDS,
  IFaceAppearance,
  IFaceCartridge,
  IFacePoseState
} from '../interfaces';

/**
 * Build a 4x3 affine matrix (`Mat4x3`) that rotates around `pivot` (`Vec3`) by `q` (`Quat`).
 */
function buildPivotMatrix(pivot: Vec3, q: Quat, mat: Mat4x3, unitScale: Vec3, negPivot: Vec3): Mat4x3 {
  negPivot.oppositeVector(pivot);
  return mat.compose(pivot, q, unitScale).translate(negPivot);
}

/**
 * Rotate a 3D vector `v` (`Vec3`) in-place by unit quaternion `q` (`Quat`)
 * using Spock's `Quat.multiplyVector`.
 */
export function rotateVec3ByQuat(v: Vec3, q: Quat): Vec3 {
  return q.multiplyVector(v, v);
}

const _unitScale = new Vec3(1, 1, 1);
const _negPivot = new Vec3();
const _eyeLeftMat = new Mat4x3();
const _eyeRightMat = new Mat4x3();
const _jawMat = new Mat4x3();
const _neckMat = new Mat4x3();
const _scratchPoint = new Vec3();

const NECK_WEIGHT_BASE_Y = -9.8;
const NECK_FULL_WEIGHT_Y = -5.8;

interface ITraumaZone {
  indices: Uint32Array;
  falloff: Float32Array;
}

/**
 * Per-rig lookup tables for the deformer: which vertices each pivot moves (with weights), and the
 * static falloff of each trauma zone. They only depend on the rest pose, so they are built once and
 * dropped by `rebuildCartridgeRig` whenever the rest pose changes.
 */
interface IDeformCache {
  vertexCount: number;
  eyeLeft: Uint32Array;
  eyeRight: Uint32Array;
  jaw: Uint32Array;
  jawWeights: Float32Array;
  neck: Uint32Array;
  neckWeights: Float32Array;
  malar: ITraumaZone;
  lid: ITraumaZone;
  brow: ITraumaZone;
  lip: ITraumaZone;
  nose: ITraumaZone;
}

const TRAUMA_MIN_Z = 2.2;
const ZONE_CENTER_MALAR = new Vec3(-1.95, 1.05, 5.45);
const ZONE_RADII_MALAR = new Vec3(1.15, 0.85, 1.40);
const ZONE_CENTER_LID = new Vec3(-1.78, 2.18, 5.55);
const ZONE_RADII_LID = new Vec3(0.72, 0.36, 1.10);
const ZONE_CENTER_BROW = new Vec3(2.05, 2.92, 5.75);
const ZONE_RADII_BROW = new Vec3(0.95, 0.52, 1.25);

/** Brows are painted into the atlas; the 3D brow strips are disabled (see GEOMETRY_BROWS in baseHead.ts). */
const PAINT_TEXTURE_BROWS = true;
const ZONE_CENTER_LIP = new Vec3(0.68, -2.62, 6.35);
const ZONE_RADII_LIP = new Vec3(0.58, 0.38, 1.10);
const ZONE_CENTER_NOSE = new Vec3(0, 0.68, 6.75);
const ZONE_RADII_NOSE = new Vec3(0.92, 1.05, 1.35);

function buildTraumaZone(
  candidates: number[],
  basePositions: Float32Array,
  center: Vec3,
  radii: Vec3
): ITraumaZone {
  const idx: number[] = [];
  const fall: number[] = [];
  for (let c = 0; c < candidates.length; c++) {
    const i = candidates[c];
    _scratchPoint.setArray(basePositions, i * 3);
    const d = _scratchPoint.getEllipsoidDistance(center, radii);
    if (d < 1.0) {
      idx.push(i);
      fall.push(Utils.smoothstep(1.0, 0.0, d));
    }
  }
  return { indices: Uint32Array.from(idx), falloff: Float32Array.from(fall) };
}

function buildDeformCache(cartridge: IFaceCartridge): IDeformCache {
  const base = cartridge.positions;
  const regionMap = cartridge.vertexRegionMap;
  const jawW = cartridge.jawWeights;
  const vertexCount = (base.length / 3) | 0;

  const eyeLeft: number[] = [];
  const eyeRight: number[] = [];
  const jaw: number[] = [];
  const jawWeights: number[] = [];
  const neck: number[] = [];
  const neckWeights: number[] = [];
  const traumaCandidates: number[] = [];

  for (let i = 0; i < vertexCount; i++) {
    const region = regionMap[i];
    if (region === FACE_REGION_IDS.eyeLeft) eyeLeft.push(i);
    else if (region === FACE_REGION_IDS.eyeRight) eyeRight.push(i);

    if (jawW[i] > 0.001) {
      jaw.push(i);
      jawWeights.push(jawW[i]);
    }

    const baseY = base[i * 3 + 1];
    if (region !== FACE_REGION_IDS.skin || baseY >= NECK_FULL_WEIGHT_Y) {
      neck.push(i);
      neckWeights.push(1);
    } else if (baseY > NECK_WEIGHT_BASE_Y) {
      neck.push(i);
      neckWeights.push(Utils.smoothstep(NECK_WEIGHT_BASE_Y, NECK_FULL_WEIGHT_Y, baseY));
    }

    if (region === FACE_REGION_IDS.skin && base[i * 3 + 2] >= TRAUMA_MIN_Z) {
      traumaCandidates.push(i);
    }
  }

  return {
    vertexCount,
    eyeLeft: Uint32Array.from(eyeLeft),
    eyeRight: Uint32Array.from(eyeRight),
    jaw: Uint32Array.from(jaw),
    jawWeights: Float32Array.from(jawWeights),
    neck: Uint32Array.from(neck),
    neckWeights: Float32Array.from(neckWeights),
    malar: buildTraumaZone(traumaCandidates, base, ZONE_CENTER_MALAR, ZONE_RADII_MALAR),
    lid: buildTraumaZone(traumaCandidates, base, ZONE_CENTER_LID, ZONE_RADII_LID),
    brow: buildTraumaZone(traumaCandidates, base, ZONE_CENTER_BROW, ZONE_RADII_BROW),
    lip: buildTraumaZone(traumaCandidates, base, ZONE_CENTER_LIP, ZONE_RADII_LIP),
    nose: buildTraumaZone(traumaCandidates, base, ZONE_CENTER_NOSE, ZONE_RADII_NOSE)
  };
}

function getDeformCache(cartridge: IFaceCartridge): IDeformCache {
  const holder = cartridge as { _deformCache?: IDeformCache };
  const cached = holder._deformCache;
  if (cached && cached.vertexCount === ((cartridge.positions.length / 3) | 0)) {
    return cached;
  }
  const built = buildDeformCache(cartridge);
  Object.defineProperty(cartridge, '_deformCache', {
    value: built,
    enumerable: false,
    writable: true,
    configurable: true
  });
  return built;
}

/**
 * Drop the cached deformer lookup tables of a cartridge. Call after changing its rest pose
 * (`positions`, `vertexRegionMap`, `jawWeights`) by hand; `rebuildCartridgeRig` does it for you.
 */
export function invalidateDeformCache(cartridge: IFaceCartridge): void {
  delete (cartridge as { _deformCache?: IDeformCache })._deformCache;
}

/**
 * Evaluate the complete sparse FACS muscle morphs + eyeball, jaw, and neck
 * `Quat` / `Mat4x3` pivot rotations into `outPositions` and `outNormals`.
 * Zero heap allocations per frame once the cartridge's lookup tables are built.
 */
export function evaluateFaceDeformation(
  cartridge: IFaceCartridge,
  pose: IFacePoseState,
  outPositions: Float32Array,
  outNormals: Float32Array
): void {
  outPositions.set(cartridge.positions);
  outNormals.set(cartridge.normals);

  // 1. Accumulate active sparse FACS muscle deltas (`w > 0.001`)
  const muscles = cartridge.muscles;
  const weights = pose.muscles;

  for (let m = 0; m < FACS_MUSCLE_NAMES.length; m++) {
    const name = FACS_MUSCLE_NAMES[m];
    const w = weights[name];
    if (!w || Math.abs(w) <= 0.001) continue;

    const delta = muscles[name];
    if (!delta) continue;

    const indices = delta.indices;
    const dPos = delta.dPos;
    const dNorm = delta.dNorm;
    for (let k = 0, n = indices.length; k < n; k++) {
      const v = indices[k] * 3;
      const d = k * 3;
      outPositions[v] += dPos[d] * w;
      outPositions[v + 1] += dPos[d + 1] * w;
      outPositions[v + 2] += dPos[d + 2] * w;
      outNormals[v] += dNorm[d] * w;
      outNormals[v + 1] += dNorm[d + 1] * w;
      outNormals[v + 2] += dNorm[d + 2] * w;
    }
  }

  const cache = getDeformCache(cartridge);
  const pivots = cartridge.pivots;

  // 2. Apply 3D physical trauma swelling & broken-nose deflection when `pose.damageTier > 0`
  const tier = Utils.clamp(pose.damageTier | 0, 0, 4);
  if (tier > 0) {
    applyTrauma(cache, tier, outPositions, outNormals);
  }

  // 3. Rotate eyeballs, jaw and neck about their pivots (`Mat4x3`), in that order, weighted per vertex
  if (pose.eyeLeftQuat.vector.getMagnitude(true) > 1e-8) {
    buildPivotMatrix(pivots.eyeLeft, pose.eyeLeftQuat, _eyeLeftMat, _unitScale, _negPivot);
    _eyeLeftMat.transformPoints(outPositions, cache.eyeLeft);
    _eyeLeftMat.transformDirections(outNormals, cache.eyeLeft);
  }
  if (pose.eyeRightQuat.vector.getMagnitude(true) > 1e-8) {
    buildPivotMatrix(pivots.eyeRight, pose.eyeRightQuat, _eyeRightMat, _unitScale, _negPivot);
    _eyeRightMat.transformPoints(outPositions, cache.eyeRight);
    _eyeRightMat.transformDirections(outNormals, cache.eyeRight);
  }
  if (pose.jawQuat.vector.getMagnitude(true) > 1e-8) {
    buildPivotMatrix(pivots.jaw, pose.jawQuat, _jawMat, _unitScale, _negPivot);
    _jawMat.transformPoints(outPositions, cache.jaw, cache.jawWeights);
    _jawMat.transformDirections(outNormals, cache.jaw, cache.jawWeights);
  }
  if (pose.neckQuat.vector.getMagnitude(true) > 1e-8) {
    buildPivotMatrix(pivots.neck, pose.neckQuat, _neckMat, _unitScale, _negPivot);
    _neckMat.transformPoints(outPositions, cache.neck, cache.neckWeights);
    _neckMat.transformDirections(outNormals, cache.neck, cache.neckWeights);
  }
}

function applyTrauma(
  cache: IDeformCache,
  tier: number,
  pos: Float32Array,
  nrm: Float32Array
): void {
  // Tier 1+: left malar & infraorbital hematoma puffiness + swollen upper left eyelid droop
  const malar = cache.malar;
  for (let k = 0; k < malar.indices.length; k++) {
    const i = malar.indices[k] * 3;
    const w = malar.falloff[k] * (0.085 * tier);
    pos[i] += nrm[i] * w;
    pos[i + 1] += nrm[i + 1] * w - 0.03 * w;
    pos[i + 2] += nrm[i + 2] * w * 1.15;
  }

  const lid = cache.lid;
  for (let k = 0; k < lid.indices.length; k++) {
    const i = lid.indices[k] * 3;
    const w = lid.falloff[k] * (0.055 * tier);
    pos[i + 1] -= w;
    pos[i + 2] += w * 0.45;
  }

  // Tier 2+: right supraorbital brow ridge welt + swollen split lower lip
  if (tier >= 2) {
    const scale2 = tier - 1;
    const brow = cache.brow;
    for (let k = 0; k < brow.indices.length; k++) {
      const i = brow.indices[k] * 3;
      const w = brow.falloff[k] * (0.075 * scale2);
      pos[i] += nrm[i] * w;
      pos[i + 1] += nrm[i + 1] * w * 0.6;
      pos[i + 2] += nrm[i + 2] * w * 1.2;
    }

    const lip = cache.lip;
    for (let k = 0; k < lip.indices.length; k++) {
      const i = lip.indices[k] * 3;
      const w = lip.falloff[k] * (0.07 * scale2);
      pos[i + 1] -= w * 0.55;
      pos[i + 2] += w * 1.15;
    }
  }

  // Tier 3+: crooked / fractured nasal bridge lateral deflection + swollen dorsum
  if (tier >= 3) {
    const scale3 = tier - 2;
    const nose = cache.nose;
    for (let k = 0; k < nose.indices.length; k++) {
      const i = nose.indices[k] * 3;
      const f = nose.falloff[k];
      pos[i] += 0.16 * scale3 * f;
      pos[i + 2] += 0.05 * scale3 * f;
    }
  }
}

function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm2(x: number, y: number, seed: number): number {
  return (
    valueNoise(x, y, seed) * 0.55 +
    valueNoise(x * 2.1 + 17.3, y * 2.1 - 9.1, seed + 1) * 0.3 +
    valueNoise(x * 4.3 - 5.7, y * 4.3 + 23.9, seed + 2) * 0.15
  );
}

/**
 * Generate a procedural RGBA texture atlas (`Uint8Array` of length `size * size * 4`)
 * for the UV layout of `buildAnatomicalBaseHead` (Skin in `v: 0..0.75`, Left/Right Eyes
 * in `u: 0..0.5, v: 0.75..1.0`, Teeth/Mouth/Brows in `u: 0.5..1.0, v: 0.75..1.0`) plus
 * progressive damage/gore splatters for `damageTier` (`0 = 100%..95% HP` .. `4 = <40% HP`).
 */
export function generateFaceAtlasPixels(
  appearance: IFaceAppearance,
  damageTier = 0,
  size = 256
): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);
  const rng = Rand.create(appearance.damageSeed + damageTier * 97);

  const skin = appearance.skinColor;
  const shadow = appearance.skinShadowColor;
  const lip = appearance.lipColor;
  const iris = appearance.irisColor;
  const sclera = appearance.scleraColor;
  const brow = appearance.browColor;
  const hair = appearance.hairColor ?? appearance.browColor;
  const hairStyle = appearance.hairStyle ?? 'bald';
  const teeth = appearance.teethColor;

  const clampedTier = Utils.clamp(damageTier | 0, 0, 4);
  const seedPhase = ((appearance.damageSeed % 97) / 97) * Math.PI * 2;
  const col = new Vec3();

  for (let y = 0; y < size; y++) {
    const v = y / (size - 1);
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      const pIdx = (y * size + x) * 4;

      if (v < 0.75) {
        // Upper 75% (v: 0..0.75, u: 0..1): Facial Skin, Hairline, Brows, Eyelids, Nose & Lips
        // In baseHead: u_uv = 0.5 + uGrid * 0.48, v_uv = 0.74 - sv * 0.72 where sv = (y + 11.0) / 21.5
        const uGrid = (u - 0.5) / 0.48;
        const absU = Math.abs(uGrid);
        const sv = Utils.clamp((0.74 - v) / 0.72, 0.0, 1.0);
        const yHead = Utils.lerp(-11.0, 10.5, sv);

        const shade = Utils.smoothstep(0.0, 0.25, sv) * (1.0 - absU * 0.22);
        col.setScalar(
          Utils.lerp(shadow.x, skin.x, shade),
          Utils.lerp(shadow.y, skin.y, shade),
          Utils.lerp(shadow.z, skin.z, shade)
        );

        // Subtle skin pore variation
        const pore = rng.float(-0.010, 0.010);
        col.addScalar(pore);

        // Submental under-chin & neck transition shadow (yHead around -5.5..-4.5)
        const submentalShadow =
          Math.exp(-Math.pow((yHead - -5.2) / 0.70, 2)) *
          Math.exp(-Math.pow(absU / 0.30, 2));
        col.scale(1.0 - submentalShadow * 0.24);

        // Subtle lower-face / jawline beard-stubble cool tone (yHead in -5.2..-1.2, anterior)
        const jawStubble =
          Utils.smoothstep(-5.4, -4.4, yHead) *
          Utils.smoothstep(-1.0, -2.0, yHead) *
          Utils.smoothstep(0.34, 0.14, absU) *
          (1.0 - Math.exp(-Math.pow((yHead - -2.42) / 0.65, 2)) * Math.exp(-Math.pow(absU / 0.092, 2)));
        if (jawStubble > 0.01) {
          const stubbleNoise = 0.85 + 0.15 * Math.sin(uGrid * 190.0 + yHead * 45.0);
          const stW = jawStubble * 0.12 * stubbleNoise;
          col.x = Utils.lerp(col.x, brow.x * 0.85, stW);
          col.y = Utils.lerp(col.y, brow.y * 0.88, stW);
          col.z = Utils.lerp(col.z, brow.z * 0.95, stW);
        }

        // Cheek & nasal warmth around mid-face (yHead in -0.9..1.8)
        const cheekWarmth =
          Math.exp(-Math.pow((yHead - 0.35) / 1.55, 2)) *
          Math.exp(-Math.pow((absU - 0.14) / 0.12, 2));
        col.x += cheekWarmth * 0.055;
        col.y -= cheekWarmth * 0.012;
        col.z -= cheekWarmth * 0.015;

        // Nasolabial fold & philtrum shading
        const philtrumGroove =
          Math.exp(-Math.pow(absU / 0.013, 2)) *
          Math.exp(-Math.pow((yHead - -1.28) / 0.36, 2));
        const philtrumColumns =
          Math.exp(-Math.pow((absU - 0.019) / 0.008, 2)) *
          Math.exp(-Math.pow((yHead - -1.28) / 0.36, 2));
        col.scale(1.0 - philtrumGroove * 0.12 + philtrumColumns * 0.045);

        const nlTargetU = 0.056 + Math.max(0, -0.55 - yHead) * 0.020;
        const nasolabial =
          Math.exp(-Math.pow((absU - nlTargetU) / 0.018, 2)) *
          Utils.smoothstep(-0.35, -0.95, yHead) *
          Utils.smoothstep(-2.9, -2.1, yHead);
        col.scale(1.0 - nasolabial * 0.045);

        // Nasal bridge highlight, alar crease, and dark nostril cavities (placed inside 3D nostrils at yHead = -0.45)
        const noseBridgeHighlight =
          Math.exp(-Math.pow(absU / 0.020, 2)) *
          Utils.smoothstep(-0.20, 0.25, yHead) *
          Utils.smoothstep(2.5, 1.4, yHead);
        col.addScalar(noseBridgeHighlight * 0.055);

        const alarShadow =
          Math.exp(-Math.pow((absU - 0.068) / 0.012, 2)) *
          Math.exp(-Math.pow((yHead - -0.38) / 0.24, 2));
        col.scale(1.0 - alarShadow * 0.22);

        const nostrilDark =
          Math.exp(-Math.pow((absU - 0.032) / 0.011, 2)) *
          Math.exp(-Math.pow((yHead - -0.45) / 0.085, 2));
        if (nostrilDark > 0.01) {
          const nW = Utils.clamp(nostrilDark * 0.92, 0.0, 0.92);
          col.x = Utils.lerp(col.x, 0.05, nW);
          col.y = Utils.lerp(col.y, 0.025, nW);
          col.z = Utils.lerp(col.z, 0.025, nW);
        }

        // Vermilion upper & lower lips + Cupid's bow + 3D-aligned curved oral stomion fissure
        const uMouth = absU / 0.088;
        const lipArch = Math.max(0, 1.0 - uMouth * uMouth);
        if (lipArch > 0.0 && yHead > -3.05 && yHead < -1.55) {
          const stomionY = -2.35 - 0.28 * uMouth * uMouth;
          const cupidDip = 0.08 * Math.exp(-Math.pow(absU / 0.012, 2));
          const cupidPeak = 0.09 * Math.exp(-Math.pow((absU - 0.015) / 0.014, 2));
          const upperBorderY = stomionY + (0.58 + cupidPeak - cupidDip) * lipArch;
          const lowerBorderY = stomionY - 0.54 * Math.pow(lipArch, 0.85);

          if (yHead >= lowerBorderY && yHead <= upperBorderY) {
            const distToEdge = Math.min(upperBorderY - yHead, yHead - lowerBorderY);
            const lipW = Utils.smoothstep(0.0, 0.13, distToEdge) * Utils.smoothstep(0.0, 0.20, lipArch);
            const isUpperLip = yHead >= stomionY;
            const lowerPillowY = stomionY - 0.18 * lipArch;
            const lipShade = isUpperLip
              ? 0.86
              : 1.04 + 0.14 * Math.exp(-Math.pow((yHead - lowerPillowY) / 0.15, 2)) * Math.exp(-Math.pow(absU / 0.044, 2));
            col.x = Utils.lerp(col.x, lip.x * lipShade, lipW);
            col.y = Utils.lerp(col.y, lip.y * lipShade, lipW);
            col.z = Utils.lerp(col.z, lip.z * lipShade, lipW);
          }

          // Crisp dark oral stomion parting line aligned to 3D mouth fissure (yHead = -2.35..-2.63)
          const stomionLine =
            Math.exp(-Math.pow((yHead - stomionY) / 0.055, 2)) *
            Utils.smoothstep(0.0, 0.12, lipArch);
          if (stomionLine > 0.01) {
            const stLineW = Utils.clamp(stomionLine * 0.80, 0.0, 0.80);
            col.x = Utils.lerp(col.x, 0.12, stLineW);
            col.y = Utils.lerp(col.y, 0.04, stLineW);
            col.z = Utils.lerp(col.z, 0.05, stLineW);
          }
        }

        // Orbital socket shading, eyelids, upper eyelash line & supra-tarsal crease (eye center: absU = 0.100, yHead = 1.86)
        const dSocket = Math.hypot((absU - 0.100) / 0.068, (yHead - 1.88) / 0.85);
        if (dSocket < 1.5) {
          const socketAO = Math.exp(-dSocket * dSocket * 1.65);
          col.scale(1.0 - socketAO * 0.18);
        }

        const eyeArchX = Math.max(0, 1.0 - Math.pow((absU - 0.100) / 0.056, 2));
        if (eyeArchX > 0.0) {
          // Dark upper eyelash margin
          const upperLashY = 1.86 + 0.28 * eyeArchX;
          const lashW = Math.exp(-Math.pow((yHead - upperLashY) / 0.08, 2)) * Utils.smoothstep(0.0, 0.2, eyeArchX);
          if (lashW > 0.01) {
            col.x = Utils.lerp(col.x, brow.x * 0.35, lashW * 0.85);
            col.y = Utils.lerp(col.y, brow.y * 0.35, lashW * 0.85);
            col.z = Utils.lerp(col.z, brow.z * 0.35, lashW * 0.85);
          }
          // Supra-tarsal upper eyelid fold crease
          const foldY = 1.86 + 0.56 * eyeArchX;
          const foldW = Math.exp(-Math.pow((yHead - foldY) / 0.075, 2)) * Utils.smoothstep(0.0, 0.25, eyeArchX);
          col.scale(1.0 - foldW * 0.26);

          // Lower eyelid rim shadow
          const lowerRimY = 1.86 - 0.28 * eyeArchX;
          const lowerW = Math.exp(-Math.pow((yHead - lowerRimY) / 0.08, 2)) * Utils.smoothstep(0.0, 0.2, eyeArchX);
          col.scale(1.0 - lowerW * 0.22);
        }

        // Painted eyebrow hair bed (absU in 0.030..0.175, yHead ~ 2.85).
        // Single brow source: the 3D strips are disabled, so this painted bed is the only eyebrow.
        if (PAINT_TEXTURE_BROWS && absU > 0.028&& absU < 0.180 && yHead > 2.45 && yHead < 3.35) {
          const browT = Utils.clamp((absU - 0.032) / 0.135, 0.0, 1.0);
          const browCenterY = 2.76 + 0.18 * Math.sin(browT * Math.PI * 0.85) - 0.10 * browT;
          const browHalfH = 0.20 * (1.0 - 0.42 * Math.pow(browT, 1.6));
          const dBrowY = Math.abs(yHead - browCenterY) / Math.max(0.05, browHalfH);
          if (dBrowY < 1.35) {
            const browEndFade = Utils.smoothstep(0.0, 0.12, browT) * Utils.smoothstep(1.0, 0.82, browT);
            const browW = Utils.smoothstep(1.35, 0.25, dBrowY) * browEndFade;
            const browStroke = 0.78 + 0.22 * Math.sin((absU * 260.0) - (yHead * 32.0));
            col.x = Utils.lerp(col.x, brow.x * browStroke, browW * 0.88);
            col.y = Utils.lerp(col.y, brow.y * browStroke, browW * 0.88);
            col.z = Utils.lerp(col.z, brow.z * browStroke, browW * 0.88);
          }
        }

        // Ear concha & antihelix shading (absU around 0.48..0.58, yHead in -0.5..2.4)
        const earConcha =
          Math.exp(-Math.pow((absU - 0.53) / 0.035, 2)) *
          Math.exp(-Math.pow((yHead - 0.85) / 1.05, 2));
        col.scale(1.0 - earConcha * 0.22);

        // Subtle cranial crown highlight / scalp follicle micro-texture (no blocky painted sideburns or ear overlap)
        const crownHighlight =
          Utils.smoothstep(4.5, 8.2, yHead) * (1.0 - absU * 0.45);
        col.addScalar(crownHighlight * 0.035);

        // ====================================================================
        // ANATOMICALLY ANCHORED MULTI-STAGE FACIAL TRAUMA (Tiers 1..4)
        // ====================================================================
        if (clampedTier > 0) {
          const tierNorm = clampedTier / 4.0;
          // Dirt is never mirror-symmetric: every patch is placed from the signed position, each side gets its own seeded
          // offset, size and strength, and the mask is broken up by streaky noise (stretched downward, like grime that has run)
          const dirtSeed = appearance.damageSeed | 0;
          const side = (k: number) => 0.5 + 0.5 * Math.sin(seedPhase * k + k * 1.7); // 0..1, fixed per seed
          const grimeWave =
            0.25 +
            // the more damage, the more of the noise counts as dirt, so the grime spreads over more of the face
            1.0 * Utils.smoothstep(0.5 - 0.17 * tierNorm, 0.84 - 0.14 * tierNorm, fbm2(uGrid * 15.0, yHead * 0.85, dirtSeed)) +
            0.35 * valueNoise(uGrid * 60.0, yHead * 4.0, dirtSeed + 5);

          // 1. Tier 1+: Combat Soot, Ash & Directional Cheekbone/Forehead Scuffs (left and right differ)
          const cheekSootL =
            Math.exp(-Math.pow((uGrid - -(0.165 + 0.03 * side(1))) / (0.06 + 0.03 * side(2)), 2)) *
            Math.exp(-Math.pow((yHead - (0.2 + 0.6 * side(3))) / (0.8 + 0.5 * side(4)), 2)) *
            (0.45 + 0.55 * side(5));
          const cheekSootR =
            Math.exp(-Math.pow((uGrid - (0.14 + 0.04 * side(6))) / (0.05 + 0.04 * side(7)), 2)) *
            Math.exp(-Math.pow((yHead - (0.5 + 0.7 * side(8))) / (0.7 + 0.6 * side(9)), 2)) *
            (0.3 + 0.7 * side(10));
          const bridgeSoot =
            Math.exp(-Math.pow((uGrid - (side(11) - 0.5) * 0.05) / 0.034, 2)) *
            Math.exp(-Math.pow((yHead - (0.7 + 0.5 * side(12))) / 0.7, 2)) *
            (0.35 + 0.65 * side(13));
          const browSoot =
            Math.exp(-Math.pow((uGrid - (-0.02 - 0.11 * side(14))) / (0.07 + 0.08 * side(15)), 2)) *
            Math.exp(-Math.pow((yHead - (3.8 + 0.6 * side(16))) / 0.85, 2)) *
            (0.4 + 0.6 * side(17));
          const chinSoot =
            Math.exp(-Math.pow((uGrid - (side(18) - 0.5) * 0.14) / (0.06 + 0.05 * side(19)), 2)) *
            Math.exp(-Math.pow((yHead - -(3.9 + 0.5 * side(20))) / 0.6, 2)) *
            (0.35 + 0.65 * side(21));

          // heavier damage adds more patches: a smeared forehead, dirty temples and a grimy jaw, each uneven and one-sided
          const foreheadSoot =
            Math.exp(-Math.pow((uGrid - (side(22) - 0.5) * 0.3) / (0.12 + 0.1 * side(23)), 2)) *
            Math.exp(-Math.pow((yHead - (6.0 + 1.2 * side(24))) / 1.1, 2)) *
            (0.4 + 0.6 * side(25));
          const templeSoot =
            Math.exp(-Math.pow((absU - (0.3 + 0.05 * side(26))) / 0.07, 2)) *
            Math.exp(-Math.pow((yHead - (2.4 + 1.0 * side(27))) / 1.3, 2)) *
            (uGrid < 0 ? 0.35 + 0.65 * side(28) : 0.2 + 0.8 * side(29));
          const jawSoot =
            Math.exp(-Math.pow((absU - (0.17 + 0.05 * side(30))) / 0.07, 2)) *
            Math.exp(-Math.pow((yHead - -(2.3 + 0.8 * side(31))) / 1.0, 2)) *
            (uGrid < 0 ? 0.3 + 0.7 * side(32) : 0.5 + 0.5 * side(33));
          const extraSoot = Utils.smoothstep(0.2, 0.55, tierNorm) * (foreheadSoot * 0.8 + templeSoot * 0.7 + jawSoot * 0.8);

          // dirt gets both stronger and darker with every tier, so tier 4 is filthy and tier 1 only lightly dusted
          const sootMask =
            Utils.clamp((cheekSootL * 0.9 + cheekSootR * 0.8 + bridgeSoot * 0.7 + browSoot * 0.65 + chinSoot * 0.6 + extraSoot) * grimeWave, 0, 1) *
            (0.15 + 0.68 * tierNorm);
          const sootDark = 0.5 - 0.22 * tierNorm;
          col.x = Utils.lerp(col.x, col.x * sootDark + 0.03, sootMask);
          col.y = Utils.lerp(col.y, col.y * (sootDark - 0.04) + 0.025, sootMask);
          col.z = Utils.lerp(col.z, col.z * (sootDark - 0.06) + 0.025, sootMask);

          // 2. Tier 1+: Left Periorbital & Malar Contusion (Multi-Ring Subsurface Hematoma)
          // Adapts multiplicatively to any skin tone: yellowish-green bilirubin outer ring -> plum/violet inner core
          const bruiseWarp = 0.012 * Math.sin(yHead * 6.5 + seedPhase) + 0.008 * Math.cos(uGrid * 95.0);
          const dMalarBruise = Math.hypot(
            (uGrid - -0.108 + bruiseWarp) / (0.056 + 0.009 * clampedTier),
            (yHead - 1.18) / (0.72 + 0.11 * clampedTier)
          );
          if (dMalarBruise < 1.35) {
            const outerRing =
              Utils.smoothstep(1.35, 0.82, dMalarBruise) *
              Utils.smoothstep(0.35, 0.85, dMalarBruise) *
              (0.22 + 0.12 * tierNorm);
            const midPlum =
              Utils.smoothstep(1.05, 0.25, dMalarBruise) * (0.34 + 0.28 * tierNorm);
            const deepCore =
              Utils.smoothstep(0.62, 0.0, dMalarBruise) * (0.25 + 0.42 * tierNorm);

            // Outer bilirubin olive-yellow tint
            col.x = Utils.lerp(col.x, col.x * 0.88 + 0.04, outerRing);
            col.y = Utils.lerp(col.y, col.y * 0.84 + 0.03, outerRing);
            col.z = Utils.lerp(col.z, col.z * 0.48, outerRing);

            // Mid-ring reddish-violet contusion
            col.x = Utils.lerp(col.x, col.x * 0.56 + 0.08, midPlum);
            col.y = Utils.lerp(col.y, col.y * 0.24 + 0.01, midPlum);
            col.z = Utils.lerp(col.z, col.z * 0.48 + 0.05, midPlum);

            // Deep periorbital hematoma core
            col.x = Utils.lerp(col.x, col.x * 0.30 + 0.03, deepCore);
            col.y = Utils.lerp(col.y, col.y * 0.14 + 0.01, deepCore);
            col.z = Utils.lerp(col.z, col.z * 0.32 + 0.04, deepCore);
          }

          // Cheekbone & nasal bridge epidermal scrape / raw erythema at Tier 1+
          const dirtSeedScrape = (appearance.damageSeed | 0) + 31;
          const scrapeLineY = 0.72 + (uGrid - -0.145) * 2.4;
          const dCheekScrape =
            Math.abs(yHead - scrapeLineY) / 0.14 +
            Math.max(0, Math.abs(uGrid - -0.145) - 0.042) * 18.0;
          if (dCheekScrape < 1.0) {
            // irregular scrape marks: broken, uneven streaks along the drag direction instead of a regular stripe pattern
            const scrapeStreaks = Utils.smoothstep(0.25, 0.75, valueNoise(uGrid * 210.0 + yHead * 30.0, yHead * 7.0, dirtSeedScrape));
            const wScrape = Utils.smoothstep(1.0, 0.1, dCheekScrape) * scrapeStreaks * (0.42 + 0.25 * tierNorm);
            col.x = Utils.lerp(col.x, 0.48, wScrape);
            col.y = Utils.lerp(col.y, 0.11, wScrape);
            col.z = Utils.lerp(col.z, 0.10, wScrape);
          }

          // 3. Tier 2+: Right Supraorbital Brow Laceration, Left Nostril Epistaxis, Split Lower Lip & Right Jaw Contusion
          if (clampedTier >= 2) {
            const t2 = (clampedTier - 1) / 3.0;

            // Secondary right mandibular / jaw bruise (uGrid ~ +0.145, yHead ~ -2.05)
            const dJawBruise = Math.hypot((uGrid - 0.145) / 0.055, (yHead - -2.05) / 0.75);
            if (dJawBruise < 1.1) {
              const wJawB = Utils.smoothstep(1.1, 0.15, dJawBruise) * (0.28 + 0.26 * t2);
              col.x = Utils.lerp(col.x, col.x * 0.48 + 0.04, wJawB);
              col.y = Utils.lerp(col.y, col.y * 0.24 + 0.01, wJawB);
              col.z = Utils.lerp(col.z, col.z * 0.42 + 0.04, wJawB);
            }

            // Right Supraorbital Brow Gash (diagonal cut across right brow ridge: uGrid in 0.068..0.158, yHead ~ 2.95)
            if (uGrid > 0.055 && uGrid < 0.172 && yHead > 2.15 && yHead < 3.65) {
              const cutTargetY = 3.05 - (uGrid - 0.075) * 4.2;
              const uSpan = Math.max(0, Math.abs(uGrid - 0.115) - 0.038);
              const dCut = Math.abs(yHead - cutTargetY) + uSpan * 5.2;
              if (dCut < 0.26) {
                const wHalo = Utils.smoothstep(0.26, 0.04, dCut) * (0.55 + 0.25 * t2);
                col.x = Utils.lerp(col.x, 0.46, wHalo);
                col.y = Utils.lerp(col.y, 0.09, wHalo);
                col.z = Utils.lerp(col.z, 0.09, wHalo);

                const wSlit = Utils.smoothstep(0.065, 0.012, dCut);
                col.x = Utils.lerp(col.x, 0.16, wSlit);
                col.y = Utils.lerp(col.y, 0.015, wSlit);
                col.z = Utils.lerp(col.z, 0.02, wSlit);
              }
            }

            // Gravity-driven crimson rivulet trickling down from the outer right brow gash along the temple/cheek
            const browTrickleBottomY = clampedTier === 2 ? 0.55 : clampedTier === 3 ? -1.45 : -3.65;
            if (yHead <= 2.75 && yHead >= browTrickleBottomY && uGrid > 0.11 && uGrid < 0.19) {
              const trickleProgress = Utils.clamp((2.75 - yHead) / (2.75 - browTrickleBottomY), 0.0, 1.0);
              const meanderU =
                0.146 +
                0.0045 * Math.sin(yHead * 3.8 + seedPhase) +
                0.0025 * Math.cos(yHead * 9.5);
              const halfWidth = 0.0055 * (1.0 - 0.45 * trickleProgress) * (0.9 + 0.25 * t2);
              const dTrickle = Math.abs(uGrid - meanderU);
              if (dTrickle < halfWidth * 2.2) {
                const taper = Utils.smoothstep(1.0, 0.78, trickleProgress);
                const wEdge = Utils.smoothstep(halfWidth * 2.2, halfWidth * 0.4, dTrickle) * taper;
                const wWet = Utils.smoothstep(halfWidth * 0.75, 0.0, dTrickle) * taper;
                // Coagulated dark crimson edge
                col.x = Utils.lerp(col.x, 0.26, wEdge * 0.88);
                col.y = Utils.lerp(col.y, 0.02, wEdge * 0.88);
                col.z = Utils.lerp(col.z, 0.025, wEdge * 0.88);
                // Wet arterial highlight center
                col.x = Utils.lerp(col.x, 0.56, wWet * 0.75);
                col.y = Utils.lerp(col.y, 0.04, wWet * 0.75);
                col.z = Utils.lerp(col.z, 0.045, wWet * 0.75);
              }
            }

            // Left Nostril Epistaxis (Nosebleed starting directly inside the 3D left nostril at uGrid = -0.032, yHead = -0.45)
            const noseBleedBottomY = clampedTier === 2 ? -2.32 : clampedTier === 3 ? -3.45 : -5.15;
            if (yHead <= -0.42 && yHead >= noseBleedBottomY && uGrid > -0.068 && uGrid < 0.005) {
              const nbProgress = Utils.clamp((-0.42 - yHead) / (-0.42 - noseBleedBottomY), 0.0, 1.0);
              const nbPathU =
                -0.031 +
                0.005 * Math.sin((yHead + 0.45) * 2.4) +
                0.002 * Math.cos(yHead * 7.2 + seedPhase);
              const nbHalfW = (0.0052 + 0.0035 * t2) * (1.0 - 0.35 * nbProgress);
              const dNb = Math.abs(uGrid - nbPathU);
              if (dNb < nbHalfW * 2.2) {
                const nbTaper = Utils.smoothstep(1.0, 0.80, nbProgress);
                const wNbEdge = Utils.smoothstep(nbHalfW * 2.2, nbHalfW * 0.35, dNb) * nbTaper;
                const wNbCore = Utils.smoothstep(nbHalfW * 0.7, 0.0, dNb) * nbTaper;
                col.x = Utils.lerp(col.x, 0.24, wNbEdge * 0.92);
                col.y = Utils.lerp(col.y, 0.018, wNbEdge * 0.92);
                col.z = Utils.lerp(col.z, 0.022, wNbEdge * 0.92);

                col.x = Utils.lerp(col.x, 0.54, wNbCore * 0.82);
                col.y = Utils.lerp(col.y, 0.035, wNbCore * 0.82);
                col.z = Utils.lerp(col.z, 0.04, wNbCore * 0.82);
              }
            }

            // Split Right Lower Vermilion Lip (uGrid ~ +0.038, yHead ~ -2.62)
            const dLipBruise = Math.hypot((uGrid - 0.038) / 0.018, (yHead - -2.62) / 0.22);
            if (dLipBruise < 1.0) {
              const wLipB = Utils.smoothstep(1.0, 0.2, dLipBruise) * (0.65 + 0.25 * t2);
              col.x = Utils.lerp(col.x, 0.28, wLipB);
              col.y = Utils.lerp(col.y, 0.04, wLipB);
              col.z = Utils.lerp(col.z, 0.08, wLipB);

              const dLipCut = Math.hypot((uGrid - 0.038 + (yHead - -2.62) * 0.015) / 0.0045, (yHead - -2.62) / 0.14);
              if (dLipCut < 1.0) {
                const wLipCut = Utils.smoothstep(1.0, 0.15, dLipCut);
                col.x = Utils.lerp(col.x, 0.14, wLipCut);
                col.y = Utils.lerp(col.y, 0.01, wLipCut);
                col.z = Utils.lerp(col.z, 0.015, wLipCut);
              }
            }
          }

          // 4. Tier 3+: Severe Black Eye, Fractured Nasal Bridge Hematoma & Left Zygomatic Laceration
          if (clampedTier >= 3) {
            const t3 = (clampedTier - 2) / 2.0;

            // Deep periorbital black-eye ring encircling the left eye socket (uGrid = -0.100, yHead = 1.72)
            const dBlackEye = Math.hypot((uGrid - -0.102) / 0.058, (yHead - 1.68) / 0.68);
            if (dBlackEye < 1.15) {
              const wBlackEye = Utils.smoothstep(1.15, 0.22, dBlackEye) * (0.48 + 0.28 * t3);
              col.x = Utils.lerp(col.x, col.x * 0.22 + 0.03, wBlackEye);
              col.y = Utils.lerp(col.y, col.y * 0.10 + 0.01, wBlackEye);
              col.z = Utils.lerp(col.z, col.z * 0.28 + 0.04, wBlackEye);
            }

            // Broken nasal bridge saddle contusion & dorsal split (absU < 0.052, yHead ~ 1.05)
            const dNoseSaddle = Math.hypot(uGrid / 0.048, (yHead - 1.05) / 0.52);
            if (dNoseSaddle < 1.0) {
              const wSaddle = Utils.smoothstep(1.0, 0.15, dNoseSaddle) * (0.52 + 0.25 * t3);
              col.x = Utils.lerp(col.x, col.x * 0.35 + 0.08, wSaddle);
              col.y = Utils.lerp(col.y, col.y * 0.14 + 0.01, wSaddle);
              col.z = Utils.lerp(col.z, col.z * 0.28 + 0.03, wSaddle);

              // Transverse skin split across the fractured nasal bridge
              const dBridgeSplit = Math.hypot(uGrid / 0.026, (yHead - (1.08 + uGrid * 1.8)) / 0.055);
              if (dBridgeSplit < 1.0) {
                const wSplit = Utils.smoothstep(1.0, 0.1, dBridgeSplit);
                col.x = Utils.lerp(col.x, 0.18, wSplit * 0.9);
                col.y = Utils.lerp(col.y, 0.015, wSplit * 0.9);
                col.z = Utils.lerp(col.z, 0.02, wSplit * 0.9);
              }
            }

            // Left zygomatic cheek laceration (uGrid in -0.19..-0.085, yHead ~ 0.32)
            if (uGrid > -0.205 && uGrid < -0.075 && yHead > -0.35 && yHead < 0.95) {
              const cheekCutY = 0.28 + (uGrid - -0.135) * 3.1;
              const uCheekSpan = Math.max(0, Math.abs(uGrid - -0.135) - 0.042);
              const dCheekCut = Math.abs(yHead - cheekCutY) + uCheekSpan * 5.0;
              if (dCheekCut < 0.24) {
                const wChHalo = Utils.smoothstep(0.24, 0.04, dCheekCut) * 0.65;
                col.x = Utils.lerp(col.x, 0.44, wChHalo);
                col.y = Utils.lerp(col.y, 0.07, wChHalo);
                col.z = Utils.lerp(col.z, 0.08, wChHalo);

                const wChSlit = Utils.smoothstep(0.06, 0.012, dCheekCut);
                col.x = Utils.lerp(col.x, 0.15, wChSlit);
                col.y = Utils.lerp(col.y, 0.012, wChSlit);
                col.z = Utils.lerp(col.z, 0.018, wChSlit);
              }
            }
          }

          // 5. Tier 4 (<20% HP): Critical Scalp/Forehead Arterial Stream & Bilateral Oral/Nasal Hemorrhage
          if (clampedTier >= 4) {
            // Heavy arterial stream from upper left forehead hairline (uGrid ~ -0.058, yHead = 6.2) down past inner brow & cheek
            if (yHead <= 6.2 && yHead >= -2.8 && uGrid > -0.11 && uGrid < 0.01) {
              const fProg = Utils.clamp((6.2 - yHead) / 9.0, 0.0, 1.0);
              const fPathU =
                -0.056 +
                0.012 * Math.sin((6.2 - yHead) * 0.55) +
                0.004 * Math.sin(yHead * 4.2 + seedPhase);
              const fHalfW = 0.0085 * (1.0 - 0.35 * fProg);
              const dFStream = Math.abs(uGrid - fPathU);
              if (dFStream < fHalfW * 2.3) {
                const fTaper = Utils.smoothstep(1.0, 0.82, fProg);
                const wFEdge = Utils.smoothstep(fHalfW * 2.3, fHalfW * 0.35, dFStream) * fTaper;
                const wFWet = Utils.smoothstep(fHalfW * 0.75, 0.0, dFStream) * fTaper;
                col.x = Utils.lerp(col.x, 0.22, wFEdge * 0.92);
                col.y = Utils.lerp(col.y, 0.015, wFEdge * 0.92);
                col.z = Utils.lerp(col.z, 0.02, wFEdge * 0.92);

                col.x = Utils.lerp(col.x, 0.58, wFWet * 0.85);
                col.y = Utils.lerp(col.y, 0.035, wFWet * 0.85);
                col.z = Utils.lerp(col.z, 0.04, wFWet * 0.85);
              }
            }

            // Right nostril secondary blood trickle + commissure mouth-corner blood streams down the chin
            if (yHead <= -0.45 && yHead >= -4.2 && uGrid > 0.005 && uGrid < 0.062) {
              const rNbPath = 0.031 + 0.003 * Math.cos(yHead * 5.0);
              const dRNb = Math.abs(uGrid - rNbPath);
              if (dRNb < 0.011) {
                const rTaper = Utils.smoothstep(-4.2, -3.1, yHead);
                const wRNb = Utils.smoothstep(0.011, 0.002, dRNb) * rTaper;
                col.x = Utils.lerp(col.x, 0.38, wRNb * 0.88);
                col.y = Utils.lerp(col.y, 0.025, wRNb * 0.88);
                col.z = Utils.lerp(col.z, 0.03, wRNb * 0.88);
              }
            }

            // Oral commissure blood trickling from right mouth corner (uGrid ~ +0.062, yHead: -2.55..-5.2)
            if (yHead <= -2.50 && yHead >= -5.25 && uGrid > 0.032 && uGrid < 0.092) {
              const mPathU = 0.058 + 0.004 * Math.sin((yHead + 2.5) * 3.8);
              const dMStream = Math.abs(uGrid - mPathU);
              if (dMStream < 0.014) {
                const mTaper = Utils.smoothstep(-5.25, -4.1, yHead);
                const wMEdge = Utils.smoothstep(0.014, 0.003, dMStream) * mTaper;
                const wMWet = Utils.smoothstep(0.005, 0.0, dMStream) * mTaper;
                col.x = Utils.lerp(col.x, 0.22, wMEdge * 0.90);
                col.y = Utils.lerp(col.y, 0.015, wMEdge * 0.90);
                col.z = Utils.lerp(col.z, 0.02, wMEdge * 0.90);

                col.x = Utils.lerp(col.x, 0.52, wMWet * 0.80);
                col.y = Utils.lerp(col.y, 0.03, wMWet * 0.80);
                col.z = Utils.lerp(col.z, 0.035, wMWet * 0.80);
              }
            }
          }
        }
      } else if (u < 0.50) {
        // Bottom-Left (u: 0..0.50, v: 0.75..1.0): Left Eyeball (0.02..0.24) & Right Eyeball (0.26..0.48)
        const isLeftEye = u < 0.25;
        const eyeCenterU = isLeftEye ? 0.13 : 0.37;
        const eyeCenterV = 0.87;
        const dx = (u - eyeCenterU) / 0.11;
        const dy = (v - eyeCenterV) / 0.11;
        const r = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        const vignette = Utils.clamp(1.0 - r * 0.18, 0.72, 1.0);
        col.copy(sclera).scale(vignette);

        // Ocular Trauma: Bloodshot scleral capillaries (Tier 2+) & Subconjunctival hemorrhage on Left Eye (Tier 3+)
        if (clampedTier >= 2 && r > 0.44 && r < 0.98) {
          const scleralMask = Utils.smoothstep(0.44, 0.54, r) * Utils.smoothstep(0.98, 0.82, r);
          const veinWave = Math.pow(
            0.5 + 0.5 * Math.sin(angle * 15.0 + Math.sin(r * 22.0 + seedPhase) * 2.2),
            6.0
          );
          const veinW = scleralMask * veinWave * (0.25 + 0.18 * (clampedTier - 1));
          col.x = Utils.lerp(col.x, 0.68, veinW);
          col.y = Utils.lerp(col.y, 0.08, veinW);
          col.z = Utils.lerp(col.z, 0.09, veinW);

          if (clampedTier >= 3 && isLeftEye) {
            // Ruptured subconjunctival blood patch on outer/lower sclera of the bruised left eye
            const dHemorrhage = Math.hypot((dx - -0.58) / 0.28, (dy - 0.12) / 0.32);
            if (dHemorrhage < 1.0) {
              const wHem = Utils.smoothstep(1.0, 0.25, dHemorrhage) * scleralMask * (0.65 + 0.22 * (clampedTier - 3));
              col.x = Utils.lerp(col.x, 0.54, wHem);
              col.y = Utils.lerp(col.y, 0.04, wHem);
              col.z = Utils.lerp(col.z, 0.05, wHem);
            }
          }
        }

        if (r < 0.50) {
          const limbus = Utils.smoothstep(0.50, 0.43, r);
          const fiber = 0.88 + 0.18 * Math.sin(angle * 24.0) * Math.cos(r * 18.0);
          const limbalDark = Utils.smoothstep(0.36, 0.48, r) * 0.45;
          const irR = iris.x * fiber * (1.0 - limbalDark);
          const irG = iris.y * fiber * (1.0 - limbalDark);
          const irB = iris.z * fiber * (1.0 - limbalDark);
          col.setScalar(
            Utils.lerp(col.x, irR, limbus),
            Utils.lerp(col.y, irG, limbus),
            Utils.lerp(col.z, irB, limbus)
          );
        }

        if (r < 0.22) {
          const pupilW = Utils.smoothstep(0.22, 0.16, r);
          col.scale(1.0 - pupilW * 0.94);
        }

        const dSpec = Math.hypot(dx + 0.11, dy - 0.11);
        if (dSpec < 0.09) {
          const specW = Utils.smoothstep(0.09, 0.02, dSpec);
          col.x = Utils.lerp(col.x, 1.0, specW);
          col.y = Utils.lerp(col.y, 1.0, specW);
          col.z = Utils.lerp(col.z, 1.0, specW);
        }
      } else if (u < 0.84 && v < 0.94) {
        // Bottom-Right Teeth region (u: 0.50..0.84, v: 0.75..0.94): Upper & Lower Dental Arches
        const tu = (u - 0.52) / 0.30;
        const tv = (v - 0.78) / 0.15;
        const toothGroove = Math.pow(Math.abs(Math.sin(tu * Math.PI * 8.0)), 0.35);
        const gumBlend = Utils.smoothstep(0.0, 0.18, tv) * Utils.smoothstep(1.0, 0.82, tv);
        const shade = (0.75 + 0.25 * toothGroove) * (0.72 + 0.28 * gumBlend);
        col.copy(teeth).scale(shade);

        // Dental Trauma: Blood-stained gumline & interdental grooves (Tier 3+), Chipped tooth gap (Tier 4)
        if (clampedTier >= 3) {
          const grooveBlood = (1.0 - toothGroove) * 0.85 + (1.0 - gumBlend) * 0.65;
          const wBloodTeeth = Utils.clamp(grooveBlood * (clampedTier === 3 ? 0.52 : 0.78), 0.0, 0.88);
          col.x = Utils.lerp(col.x, 0.45, wBloodTeeth);
          col.y = Utils.lerp(col.y, 0.03, wBloodTeeth);
          col.z = Utils.lerp(col.z, 0.04, wBloodTeeth);
        }
        if (clampedTier >= 4 && tu > 0.37 && tu < 0.48 && tv > 0.32 && tv < 0.72) {
          // Chipped / broken lateral incisor cavity
          col.setScalar(0.14, 0.02, 0.03);
        }
      } else if (u < 0.84 && v >= 0.94) {
        // Inner Oral Cavity (u: 0.50..0.84, v: 0.94..1.0)
        col.setScalar(0.22, 0.06, 0.07);
      } else if (v < 0.85) {
        // Eyebrow region (u: 0.84..1.0, v: 0.75..0.85)
        const bu = (u - 0.84) / 0.16;
        const browStreak = 0.82 + 0.24 * Math.sin(bu * 65.0 + v * 18.0);
        col.copy(brow).scale(browStreak);
      } else {
        // 3D Cranial Hair / Headgear region (u: 0.84..1.0, v: 0.85..1.0)
        const hu = Utils.clamp((u - 0.85) / 0.13, 0.0, 1.0);
        const hv = Utils.clamp((v - 0.86) / 0.12, 0.0, 1.0);
        if (hairStyle === 'combat_helmet') {
          // Tactical Space Marine armored helmet plating & panel seams
          const panelSeam =
            Math.exp(-Math.pow((hv - 0.22) / 0.025, 2)) +
            Math.exp(-Math.pow((hv - 0.76) / 0.025, 2));
          const visorStripe = Utils.smoothstep(0.18, 0.0, hv) * 0.28;
          const armorShade = (0.78 + 0.28 * hv - 0.35 * Math.min(1.0, panelSeam) - visorStripe);
          col.copy(hair).scale(armorShade);
        } else if (hairStyle === 'buzz_fade') {
          // High-and-tight fade gradient from skin tone at lower border (hv=0) to hairColor on crown
          const fadeW = Utils.smoothstep(0.0, 0.42, hv);
          const follicle = 0.84 + 0.18 * Math.sin(hu * 140.0) * Math.cos(hv * 120.0);
          col.setScalar(
            Utils.lerp(skin.x * 0.78, hair.x * follicle, fadeW),
            Utils.lerp(skin.y * 0.78, hair.y * follicle, fadeW),
            Utils.lerp(skin.z * 0.78, hair.z * follicle, fadeW)
          );
        } else if (hairStyle === 'afro_short') {
          // Tightly coiled sponge/curl clusters
          const coilPattern = 0.72 + 0.32 * Math.sin(hu * 95.0) * Math.sin(hv * 95.0);
          col.copy(hair).scale(coilPattern * (0.82 + 0.22 * hv));
        } else if (hairStyle === 'dreadlocks') {
          // Braided lock cords with deep dark grooves between locks
          const cord = Math.pow(0.5 + 0.5 * Math.cos(hu * Math.PI * 14.0), 0.45);
          const twist = 0.82 + 0.22 * Math.sin(hv * 85.0 + hu * 25.0);
          col.copy(hair).scale((0.38 + 0.72 * cord) * twist);
        } else {
          // Anisotropic hair strands (flattop, mohawk, slick_back)
          const strands = 0.78 + 0.26 * Math.sin(hu * 85.0 + hv * 24.0);
          const rootShadow = Utils.smoothstep(0.0, 0.16, hv);
          col.copy(hair).scale(strands * (0.68 + 0.36 * rootShadow));
        }
      }

      pixels[pIdx] = Utils.clamp(Math.round(col.x * 255), 0, 255);
      pixels[pIdx + 1] = Utils.clamp(Math.round(col.y * 255), 0, 255);
      pixels[pIdx + 2] = Utils.clamp(Math.round(col.z * 255), 0, 255);
      pixels[pIdx + 3] = 255;
    }
  }

  // Apply custom painted overrides if present for this tier
  const customOverrides = appearance.customTierOverrides?.[clampedTier];
  if (Array.isArray(customOverrides)) {
    for (let i = 0; i + 4 < customOverrides.length; i += 5) {
      const pIdx = customOverrides[i] * 4;
      if (pIdx >= 0 && pIdx + 3 < pixels.length) {
        pixels[pIdx] = customOverrides[i + 1];
        pixels[pIdx + 1] = customOverrides[i + 2];
        pixels[pIdx + 2] = customOverrides[i + 3];
        pixels[pIdx + 3] = customOverrides[i + 4];
      }
    }
  }

  return pixels;
}

/**
 * Create a live `@1pizzateam/roostr` `Mesh` + `CustomMesh` pair bound to a WebGL context,
 * configured with `DYNAMIC_DRAW` vertex/normal buffers and a procedural RGBA atlas texture.
 */
export function createRoostrFaceMesh(
  gl: WebGLRenderingContext,
  cartridge: IFaceCartridge,
  damageTier = 0,
  atlasSize = 256
): { customMesh: CustomMesh; mesh: Mesh; atlasPixels: Uint8Array } {
  const customMesh = new CustomMesh();
  customMesh.vertices = new Float32Array(cartridge.positions);
  customMesh.indices = new Int32Array(cartridge.indices);
  customMesh.normals = new Float32Array(cartridge.normals);
  customMesh.uvs = new Float32Array(cartridge.uvs);
  customMesh.bufferUsage = 'DYNAMIC_DRAW';

  const mesh = new Mesh(customMesh, gl);
  const mat = new Material({
    ambient: new Vec3(0.38, 0.34, 0.34),
    diffuse: new Vec3(0.92, 0.90, 0.88),
    specular: new Vec3(0.22, 0.20, 0.18),
    shininess: 22
  });
  mesh.addProgram(PhongShader.vertex, PhongShader.fragment, mat);

  const atlasPixels = generateFaceAtlasPixels(cartridge.appearance, damageTier, atlasSize);
  const tex = Texture.create(atlasPixels, gl, {
    size: new Vec2(atlasSize, atlasSize),
    flipY: false,
    generateMipmaps: true
  });
  if (tex) {
    mesh.setSharedTexture(tex);
  }

  return { customMesh, mesh, atlasPixels };
}

/**
 * Upload deformed `positions` and `normals` into a bound `@1pizzateam/roostr` `Mesh`'s
 * WebGL buffers using `bufferSubData` while keeping `MeshRenderer`'s `GLState` in sync.
 */
export function syncRoostrMeshBuffers(
  mesh: Mesh,
  positions: Float32Array,
  normals: Float32Array
): void {
  if (mesh.vertices instanceof Float32Array && mesh.vertices.length === positions.length) {
    mesh.vertices.set(positions);
  }
  if (mesh.normals instanceof Float32Array && mesh.normals.length === normals.length) {
    mesh.normals.set(normals);
  }

  const gl = mesh.context;
  if (!gl) return;

  if (mesh.vertexBuffer) {
    mesh.renderer.bindBuffer('ARRAY_BUFFER', mesh.vertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
  }
  if (mesh.normalBuffer) {
    mesh.renderer.bindBuffer('ARRAY_BUFFER', mesh.normalBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, normals);
  }
}
