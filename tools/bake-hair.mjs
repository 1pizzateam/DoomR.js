// One-off bake of the hair styles into `src/hair/<id>.facerhair.json`, from the FaceR build that still had them as code
// (the version before FaceR stopped owning hair styles). Run: node tools/bake-hair.mjs <path to that FaceR dist/facer.js>
//
// A style is data: `capDelta` (how each of the 462 hair-cap vertices moves from the unstyled cap, measured on african_sculpt
// at default proportions) and an `atlas` shade map (hair-region texture: `shade` scales the hair colour, `skinMix` blends
// toward skin). `bald` has no asset (FaceR just hides the cap).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const facer = await import(path.resolve(process.argv[2]));
const {
  registerBaseHead, deserializeBaseHead, getCanonicalBaseHead, createDefaultProportions,
  applyMacroProportions, applyHaircutStyleToPositions, HAIR_CAP_VERTEX_COUNT, Vec3,
} = facer;

registerBaseHead('african_sculpt', deserializeBaseHead(JSON.parse(
  fs.readFileSync(path.resolve(here, '../src/heads/african_sculpt.facerhead.json'), 'utf8'))));
const base = getCanonicalBaseHead('african_sculpt');
const sm = base.submeshes.find((s) => s.name === 'browsHair');
const capStart = sm.startVertex + sm.vertexCount - HAIR_CAP_VERTEX_COUNT;

function macroPositions() {
  const positions = new Float32Array(base.positions.length);
  const pivots = {
    neck: new Vec3().copy(base.pivots.neck), jaw: new Vec3().copy(base.pivots.jaw),
    eyeLeft: new Vec3().copy(base.pivots.eyeLeft), eyeRight: new Vec3().copy(base.pivots.eyeRight),
  };
  applyMacroProportions(base, createDefaultProportions(), new Float32Array(base.positions.length), positions, pivots);
  return positions;
}

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const smoothstep = (a, b, x) => (a < b ? sstep(a, b, x) : 1 - sstep(b, a, x));

const SEG_U = 20;
const ROWS_V = 10;
const STRIDE = SEG_U + 1;

// Evaluate 3D (y, z) on the canonical hair cap using piecewise-linear triangle interpolation
// matching the mesh triangulation ((a, b, c) for tu + tv <= 1, (b, d, c) for tu + tv > 1)
function sampleCapYAndZ(hu, hv) {
  const fu = Math.max(0, Math.min(SEG_U - 1e-5, hu * SEG_U));
  const fv = Math.max(0, Math.min(ROWS_V - 1e-5, hv * ROWS_V));
  const iu0 = fu | 0;
  const row0 = fv | 0;
  const tu = fu - iu0;
  const tv = fv - row0;
  const idx = (r, c) => (capStart + r * STRIDE + c) * 3;
  const ia = idx(row0, iu0);
  const ib = idx(row0, iu0 + 1);
  const ic = idx(row0 + 1, iu0);
  const id = idx(row0 + 1, iu0 + 1);
  const pos = base.positions;
  if (tu + tv <= 1.0) {
    const wa = 1.0 - tu - tv;
    const wb = tu;
    const wc = tv;
    return [
      pos[ia + 1] * wa + pos[ib + 1] * wb + pos[ic + 1] * wc,
      pos[ia + 2] * wa + pos[ib + 2] * wb + pos[ic + 2] * wc,
    ];
  }
  const wb = 1.0 - tv;
  const wd = tu + tv - 1.0;
  const wc = 1.0 - tu;
  return [
    pos[ib + 1] * wb + pos[id + 1] * wd + pos[ic + 1] * wc,
    pos[ib + 2] * wb + pos[id + 2] * wd + pos[ic + 2] * wc,
  ];
}

// the atlas formulas of the old generateFaceAtlasPixels, as (shade, skinMix) over the hair region (hu, hv in 0..1)
function atlasAt(style, hu, hv) {
  if (style === 'combat_helmet') {
    const seam = Math.exp(-Math.pow((hv - 0.22) / 0.025, 2)) + Math.exp(-Math.pow((hv - 0.76) / 0.025, 2));
    return [0.78 + 0.28 * hv - 0.35 * Math.min(1, seam) - smoothstep(0.18, 0.0, hv) * 0.28, 0];
  }
  if (style === 'buzz_fade') {
    const [yWorld, zWorld] = sampleCapYAndZ(hu, hv);
    const yFadeTop = 4.25 + 0.14 * zWorld;
    const yFadeBot = yFadeTop - 2.45;
    const worldFade = 1.0 - smoothstep(yFadeBot, yFadeTop, yWorld);
    const sideWeight = smoothstep(0.16, 0.26, hu);
    const frontSoft = (1.0 - smoothstep(0.0, 0.08, hv)) * 0.16;
    return [
      0.84 + 0.18 * Math.sin(hu * 140.0) * Math.cos(hv * 120.0),
      Math.max(frontSoft, worldFade * sideWeight * 0.88),
    ];
  }
  if (style === 'afro_short') return [(0.72 + 0.32 * Math.sin(hu * 95.0) * Math.sin(hv * 95.0)) * (0.82 + 0.22 * hv), 0];
  if (style === 'dreadlocks') {
    const cord = Math.pow(0.5 + 0.5 * Math.cos(hu * Math.PI * 14.0), 0.45);
    return [(0.38 + 0.72 * cord) * (0.82 + 0.22 * Math.sin(hv * 85.0 + hu * 25.0)), 0];
  }
  return [(0.78 + 0.26 * Math.sin(hu * 85.0 + hv * 24.0)) * (0.68 + 0.36 * smoothstep(0.0, 0.16, hv)), 0];
}

const SIZE = 128;
const STYLES = ['buzz_fade', 'flattop', 'afro_short', 'mohawk', 'slick_back', 'dreadlocks', 'combat_helmet'];
const outDir = path.resolve(here, '../src/hair');
fs.mkdirSync(outDir, { recursive: true });
const b64 = (arr) => Buffer.from(arr).toString('base64');

for (const style of STYLES) {
  const unstyled = macroPositions();
  const styled = new Float32Array(unstyled);
  applyHaircutStyleToPositions(styled, base.submeshes, style);
  const capDelta = [];
  for (let i = capStart * 3; i < (capStart + HAIR_CAP_VERTEX_COUNT) * 3; i++)
    capDelta.push(Math.round((styled[i] - unstyled[i]) * 1e5) / 1e5);

  const shade = new Uint8Array(SIZE * SIZE);
  const skinMix = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const [s, m] = atlasAt(style, x / (SIZE - 1), y / (SIZE - 1));
      shade[y * SIZE + x] = Math.max(0, Math.min(255, Math.round(s * 255)));
      skinMix[y * SIZE + x] = Math.max(0, Math.min(255, Math.round(m * 255)));
    }
  }
  const out = { format: 'facer-hair', version: 1, id: style, capDelta, atlas: { size: SIZE, shade: b64(shade), skinMix: b64(skinMix) } };
  const file = path.join(outDir, `${style}.facerhair.json`);
  fs.writeFileSync(file, JSON.stringify(out));
  console.log(style, (fs.statSync(file).size / 1024) | 0, 'KB');
}
