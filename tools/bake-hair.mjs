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

// the atlas formulas of the old generateFaceAtlasPixels, as (shade, skinMix) over the hair region (hu, hv in 0..1)
function atlasAt(style, hu, hv) {
  if (style === 'combat_helmet') {
    const seam = Math.exp(-Math.pow((hv - 0.22) / 0.025, 2)) + Math.exp(-Math.pow((hv - 0.76) / 0.025, 2));
    return [0.78 + 0.28 * hv - 0.35 * Math.min(1, seam) - smoothstep(0.18, 0.0, hv) * 0.28, 0];
  }
  if (style === 'buzz_fade') {
    const sideMask = smoothstep(0.16, 0.34, hu);
    const fadeW = smoothstep(0.0, 0.28, hv);
    return [0.84 + 0.18 * Math.sin(hu * 140.0) * Math.cos(hv * 120.0), (1 - fadeW) * (0.18 + 0.54 * sideMask)];
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
