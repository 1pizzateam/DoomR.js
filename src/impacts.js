import { Trigo, Utils, Vec2 } from '@1pizzateam/spock';
import { mulberry32 } from './rng.js';

const scratchPt = new Vec2();

/**
 * What a bullet leaves behind and what it throws up, as procedural high-resolution art drawn here in code (no image files):
 * bullet holes in steel (twelve variants across eight ballistic archetypes: clean punctures, peeled petals, ricochet gouges,
 * fractured plates, double hits, concussive dents, scorched punctures, star-crazed craters), metallic pellet sparks (four
 * kinds, five frames each), vertical chainsaw/blade gashes (six variants), and multi-tier blast craters and scorch halos.
 * Every cell is painted natively at 64 x 64 texels in a single row.
 */

const ATLAS_CELL = 64;
const mid2 = (ATLAS_CELL - 1) / 2;
export const IMPACT_CELL_COUNT = 64;
export const HOLE_VARIANTS = 12;
export const SLASH_VARIANTS = 6;
export const SPARK_FRAMES = 5;
export const SPARK_VARIANTS = 4;
const BLAST_TIERS = 3;
// two painted bases per tier; the mark's variant picks one (bit 0) and mirrors it (bit 1)
const BLAST_BASES = 2;
const BLAST_SPAN = BLAST_TIERS * BLAST_BASES;
// the burn backdrop is this many times wider than the damage it sits under, and a little deeper in the surface
const BURN_SCALE = 1.9;
// like BLAST_OFFSET, only keeps the scorch off its face and below the holes; its place under the damage comes from draw order
const BURN_OFFSET = 0.1;
// the flat scorch lift likewise only clears the surface; draw order puts it under the damage
const BURN_LIFT = 0.1;
const SLASH_CELL = HOLE_VARIANTS + SPARK_FRAMES * SPARK_VARIANTS;
// three damage tiers of two paintings per surface: cell = surface start + tier * 2 + base, so an editor can mirror the layout
export const IMPACT_CELLS = {
  hole: 0,
  spark: HOLE_VARIANTS,
  slash: SLASH_CELL,
  brokenWall: SLASH_CELL + SLASH_VARIANTS,
  brokenFloor: SLASH_CELL + SLASH_VARIANTS + BLAST_SPAN,
  brokenCeiling: SLASH_CELL + SLASH_VARIANTS + BLAST_SPAN * 2,
  // the scorched backdrop under the damage: three tiers for walls, then three for floor and ceiling
  burn: SLASH_CELL + SLASH_VARIANTS + BLAST_SPAN * 3,
};

// marks stop this far short of the edge of a face, so none sits right on a corner
const EDGE = 0.3;
// a hole is a square this many world units across: the crater is a quarter of it, so about 3 units, and its cracks reach
// a little further
const HOLE_SIZE = 16;
// blast marks sit off their face and below bullet holes (0.25), so a hole shot into a blast still shows; overlap between
// blast marks is decided by draw order in World.syncBlasts and World.syncDoorMarks (scorch pass, then damage pass, oldest
// first, depth writes off), not by this offset
const BLAST_OFFSET = 0.15;
// a flat blast mark hovers this far off the floor or ceiling so it does not fight the surface for depth; layering between
// overlapping marks is by draw order, not by this lift
const FLAT_LIFT = 0.15;
const CEILING_HEIGHT = 64;
const MIN_SPAN = 1e-3;

const CHAR = [5, 7, 11];
const SCORCH = [12, 15, 23];
const CRACK = [8, 10, 16];
const RIM = [112, 130, 160];
const CHIP = [150, 168, 196];
const PLASTER = [172, 164, 148];
const CONCRETE = [118, 120, 124];
const CONCRETE_DARK = [68, 70, 76];
const REBAR = [150, 74, 40];
const RUBBLE_LIGHT = [136, 130, 120];
const FLASH = [255, 252, 226];
const YELLOW = [255, 220, 110];
const ORANGE = [255, 150, 46];
const EMBER = [196, 78, 28];
const EMBER_DIM = [148, 48, 18];

const SHADE = [24, 30, 44];
const PRIMER = [50, 58, 76];
const BORE_LIT = [58, 70, 92];
const BARE = [146, 166, 196];
const SPECULAR_STEEL = [192, 212, 236];

function mix3(a, b, t) {
  return [Utils.lerp(a[0], b[0], t), Utils.lerp(a[1], b[1], t), Utils.lerp(a[2], b[2], t)];
}

function clampSteelColor(color, jitter = 0) {
  return [
    Math.max(0, Math.min(198, color[0] + jitter)),
    Math.max(0, Math.min(242, color[1] + jitter)),
    Math.max(0, Math.min(255, color[2] + jitter)),
  ];
}

/**
 * Paints a 64x64 3D ballistic crater or concussive dent at `(cx, cy)` with semi-axes `(rx, ry)` rotated by `turn`.
 * Features a deep ambient-occluded entry cavity with grazing light on the lower-right bore wall, an undercut shadow
 * beneath the upper-left overhang, a raised 3D bevel collar of sheared bare steel, an exposed primer ring, and a
 * domain-warped powder-soot halo with smooth alpha falloff.
 */
function crater(c, cx, cy, rx, ry, turn, { depth = 1, bare = true, halo = 1.38, seed = 17, rnd } = {}) {
  const wobble = rnd() * Trigo.twopi;
  const wobble2 = rnd() * Trigo.twopi;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const reach = Math.ceil(Math.max(rx, ry) * (halo + 0.22) + 2);
  const yMin = Math.max(BORDER, Math.floor(cy - reach));
  const yMax = Math.min(ATLAS_CELL - BORDER - 1, Math.ceil(cy + reach));
  const xMin = Math.max(BORDER, Math.floor(cx - reach));
  const xMax = Math.min(ATLAS_CELL - BORDER - 1, Math.ceil(cx + reach));

  for (let y = yMin; y <= yMax; y++)
    for (let x = xMin; x <= xMax; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const u = (dx * cos + dy * sin) / rx;
      const v = (-dx * sin + dy * cos) / ry;
      const r = scratchPt.setScalar(u, v).getMagnitude();
      const theta = Math.atan2(dy, dx);
      const n1 = fbm(x * 0.24 + seed * 0.37, y * 0.24 + seed * 0.19, seed);
      const n2 = fbm(x * 0.58, y * 0.58, seed + 13);
      const lobe = 1
        + 0.09 * Math.sin(theta * 3 + wobble)
        + 0.06 * Math.cos(theta * 5 - wobble2)
        + (n1 - 0.5) * 0.24;
      const d = r / lobe;
      if (d > halo)
        continue;

      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      // Upper-left directional light (+1 when surface normal points upper-left, -1 when lower-right)
      const lightDot = -(ux * 0.68 + uy * 0.73);
      const jitter = (hash2(x, y, seed + 5) - 0.5) * 10;

      if (depth <= 0.5) {
        // Concussive non-penetrating dent: concave bowl shadowed on upper-left inner slope, lit on lower-right inner bowl
        if (d < 0.92) {
          const bowlT = d / 0.92;
          const innerLit = Utils.clamp(-lightDot * 0.65 * bowlT + 0.35, 0, 1);
          const impactCore = 1 - Utils.smoothstep(0, 0.36, d);
          const baseCol = mix3(SHADE, mix3(RIM, BARE, innerLit * 0.65), innerLit * (0.45 + 0.55 * n2));
          const dented = mix3(baseCol, SCORCH, impactCore * 0.72);
          c.put(x, y, clampSteelColor(dented, jitter), 255);
        } else if (d < 1.12) {
          const rimLit = Utils.clamp(lightDot * 0.7 + 0.3, 0, 1);
          const rimCol = mix3(SCORCH, RIM, rimLit * (0.55 + 0.45 * n2));
          c.put(x, y, clampSteelColor(rimCol, jitter), 255);
        } else {
          const fade = 1 - Utils.smoothstep(1.1, halo, d);
          const alpha = Math.round(235 * fade * (0.65 + 0.35 * n1));
          if (alpha >= 132)
            c.put(x, y, clampSteelColor(mix3(SCORCH, SHADE, n2 * 0.5), jitter * 0.5), alpha, false);
        }
        continue;
      }

      if (d < 0.56) {
        // Deep ballistic entry bore: dark ambient-occluded throat with grazing illumination on lower-right cylinder wall
        const inner = d / 0.56;
        const wallGrazing = Utils.smoothstep(0.32, 0.98, inner) * Utils.clamp(-lightDot + 0.15, 0, 1);
        const striation = 0.7 + 0.3 * Math.sin(theta * 11 + wobble * 2);
        const boreCol = mix3(CHAR, mix3(SCORCH, BORE_LIT, wallGrazing * striation), inner * inner * (0.35 + 0.65 * wallGrazing));
        c.put(x, y, clampSteelColor(boreCol, jitter * 0.4), 255);
      } else if (d < 0.75) {
        // Inner sheared lip: undercut shadow under upper-left overhang, bright sheared inner bevel on lower-right
        const t = (d - 0.56) / 0.19;
        if (lightDot > 0.08) {
          const crest = Utils.smoothstep(0.45, 1.0, t);
          const col = mix3(CHAR, bare ? BARE : RIM, crest * (0.55 + 0.45 * lightDot));
          c.put(x, y, clampSteelColor(col, jitter), 255);
        } else {
          const bevelPeak = 1 - Math.abs(t - 0.5) * 1.6;
          const sheen = Utils.clamp((-lightDot) * Math.max(0, bevelPeak), 0, 1);
          const col = mix3(SCORCH, bare ? CHIP : RIM, sheen * (0.6 + 0.4 * n2));
          c.put(x, y, clampSteelColor(col, jitter), 255);
        }
      } else if (d < 1.04) {
        // Raised outer spall crown: strongly lit on upper-left slope, shadowed on lower-right slope
        const crownT = 1 - Math.abs((d - 0.88) / 0.16);
        const facet = 0.6 + 0.4 * Math.cos(theta * 6 - wobble2);
        if (lightDot >= -0.05) {
          const spec = Utils.clamp(lightDot * (0.65 + 0.35 * Math.max(0, crownT)) * (0.7 + 0.3 * facet), 0, 1);
          const metal = bare ? mix3(RIM, SPECULAR_STEEL, spec) : mix3(PRIMER, CHIP, spec * 0.85);
          c.put(x, y, clampSteelColor(metal, jitter), 255);
        } else {
          const shadowT = Utils.clamp((-lightDot) * 0.85, 0, 1);
          const shadowCol = mix3(PRIMER, SCORCH, shadowT * (0.65 + 0.35 * (1 - n2)));
          c.put(x, y, clampSteelColor(shadowCol, jitter * 0.7), 255);
        }
      } else if (d < 1.17) {
        // Exposed primer / chipped paint step around the crater collar
        const stepLit = Utils.clamp(lightDot * 0.5 + 0.5, 0, 1);
        const stepCol = mix3(SCORCH, mix3(SHADE, PRIMER, stepLit), 0.45 + 0.55 * n2);
        c.put(x, y, clampSteelColor(stepCol, jitter * 0.6), 248);
      } else {
        // Outer powder-soot & shock halo with radial blast striations
        const jet = 0.65 + 0.35 * Math.sin(theta * 7 + wobble * 1.3);
        const fade = (1 - Utils.smoothstep(1.14, halo, d)) * (0.55 + 0.45 * n1 * jet);
        const alpha = Math.round(240 * fade);
        if (alpha >= 132) {
          const sootCol = mix3(CHAR, SHADE, n2 * 0.65);
          c.put(x, y, clampSteelColor(sootCol, jitter * 0.4), alpha, false);
        }
      }
    }
}

/** A high-resolution radial fracture in steel with tapered sub-pixel crevice, side branches, and a specular catch-lip. */
function crack(c, rnd, x, y, angle, length, light = true, branches = 1) {
  let a = angle;
  const steps = Math.max(2, Math.ceil(length * 2.4));
  const stepLen = length / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    a += (rnd() - 0.5) * 0.42;
    x += Math.cos(a) * stepLen;
    y += Math.sin(a) * stepLen;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const halfW = 0.55 * (1 - t * 0.65);
    c.put(x, y, CRACK, 255);
    if (halfW > 0.32) {
      c.put(x + nx * 0.45, y + ny * 0.45, SCORCH, 220, false);
      c.put(x - nx * 0.45, y - ny * 0.45, SCORCH, 220, false);
    }
    if (light && i % 2 === 0 && t < 0.85) {
      // Catch-edge on the side of the fracture facing the upper-left key light
      const side = nx + ny > 0 ? 1 : -1;
      const lipCol = t < 0.45 ? CHIP : RIM;
      c.put(x + nx * side * 1.05, y + ny * side * 1.05, lipCol, 235, false);
    }
    if (branches > 0 && i > 4 && i % 4 === 0 && rnd() < 0.34)
      crack(c, rnd, x, y, a + (rnd() < 0.5 ? -1 : 1) * (0.55 + rnd() * 0.45), (length - i * stepLen) * (0.45 + rnd() * 0.35), false, branches - 1);
  }
}

/** Organic FBM powder-burn and friction-soot halo around an impact. */
function scorch(c, rnd, cx, cy, radius, density = 1, seed = 41) {
  const ox = rnd() * 30;
  const oy = rnd() * 30;
  const phase = rnd() * Trigo.twopi;
  const yMin = Math.max(BORDER, Math.floor(cy - radius));
  const yMax = Math.min(ATLAS_CELL - BORDER - 1, Math.ceil(cy + radius));
  const xMin = Math.max(BORDER, Math.floor(cx - radius));
  const xMax = Math.min(ATLAS_CELL - BORDER - 1, Math.ceil(cx + radius));
  for (let y = yMin; y <= yMax; y++)
    for (let x = xMin; x <= xMax; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = scratchPt.setScalar(dx, dy).getMagnitude();
      if (dist >= radius)
        continue;
      const theta = Math.atan2(dy, dx);
      const warp = fbm(x * 0.22 + ox, y * 0.22 + oy, seed);
      const rays = 0.72 + 0.28 * Math.cos(theta * 6 + phase);
      const reach = radius * (0.62 + 0.46 * warp) * rays;
      if (dist >= reach)
        continue;
      const t = dist / reach;
      const grain = fbm(x * 0.48, y * 0.48, seed + 7);
      const strength = (1 - Utils.smoothstep(0.18, 1.0, t)) * density * (0.65 + 0.35 * grain);
      if (strength < 0.34)
        continue;
      const alpha = Math.round(Utils.clamp(136 + strength * 118, 136, 250));
      const col = mix3(CHAR, mix3(SCORCH, SHADE, grain), Utils.smoothstep(0, 0.85, t));
      c.put(x, y, clampSteelColor(col, (hash2(x, y, seed) - 0.5) * 6), alpha, false);
    }
}

/** Sheared metallic spall chips and micro-burrs thrown out around a hit, with lit facet and dark cast shadow. */
function flecks(c, rnd, cx, cy, count, near, far) {
  for (let i = 0; i < count; i++) {
    const angle = rnd() * Trigo.twopi;
    const distance = near + rnd() * (far - near);
    const x = cx + Math.cos(angle) * distance;
    const y = cy + Math.sin(angle) * distance;
    const big = rnd() < 0.45;
    c.put(x, y, big ? BARE : CHIP, 250, false);
    c.put(x + 0.8, y + 0.8, SCORCH, 225, false);
    if (big)
      c.put(x - 0.6, y + 0.4, RIM, 235, false);
  }
}

// Eight ballistic impact archetypes painted natively at 64x64 resolution
const KINDS = [
  // 0: Clean armor-piercing puncture — crisp circular bore, bevelled steel collar, radial micro-fissures
  (c, rnd, scale, seed) => {
    const r = 7.6 * scale;
    scorch(c, rnd, mid2, mid2, 13.5 * scale, 0.72, seed);
    const nCracks = 4 + Math.floor(rnd() * 2);
    for (let i = 0; i < nCracks; i++)
      crack(c, rnd, mid2, mid2, (i / nCracks) * Trigo.twopi + (rnd() - 0.5) * 0.45, (8.0 + rnd() * 6.5) * scale, true, 0);
    crater(c, mid2, mid2, r, r * 0.94, rnd() * Trigo.twopi, { halo: 1.38, seed, rnd });
  },
  // 1: Torn hollow-point / buckshot petals — steel peeled back in curled, gleaming metallic petals with deep radial slots
  (c, rnd, scale, seed) => {
    const petals = 5 + Math.floor(rnd() * 3);
    const start = rnd() * Trigo.twopi;
    scorch(c, rnd, mid2, mid2, 14.0 * scale, 0.65, seed);
    for (let k = 0; k < petals; k++) {
      const a = start + (k / petals) * Trigo.twopi + (rnd() - 0.5) * 0.32;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const length = (7.8 + rnd() * 5.2) * scale;
      const r0 = 4.8 * scale;
      for (let d = r0; d <= r0 + length; d += 0.45) {
        const t = (d - r0) / length;
        const w = Math.max(0.5, 3.2 * scale * (1 - t * 0.8) * Math.sin(t * Trigo.pi * 0.85 + 0.25));
        for (let o = -w; o <= w; o += 0.45) {
          const px = mid2 + ca * d - sa * o;
          const py = mid2 + sa * d + ca * o;
          const edgeT = o / (w || 1);
          const col = edgeT < -0.25 ? SPECULAR_STEEL : edgeT < 0.35 ? CHIP : RIM;
          c.put(px, py, clampSteelColor(col, (hash2(px | 0, py | 0, seed + k) - 0.5) * 8), 255);
        }
      }
      // Dark tear slot and cast shadow between adjacent curled petals
      const slotA = a + Trigo.pi / petals;
      c.line(
        mid2 + Math.cos(slotA) * (r0 * 0.85),
        mid2 + Math.sin(slotA) * (r0 * 0.85),
        mid2 + Math.cos(slotA) * (r0 + length * 0.92),
        mid2 + Math.sin(slotA) * (r0 + length * 0.92),
        CHAR,
        255
      );
    }
    crater(c, mid2, mid2, 6.4 * scale, 6.2 * scale, start, { halo: 1.3, seed, rnd });
  },
  // 2: Grazing ricochet gouge — elongated teardrop trough with piled-up steel prow and skid scratches
  (c, rnd, scale, seed) => {
    const turn = rnd() * Trigo.twopi;
    const dx = Math.cos(turn);
    const dy = Math.sin(turn);
    const nx = -dy;
    const ny = dx;
    for (let d = -5 * scale; d < 20.5 * scale; d += 0.45) {
      const t = Math.max(0, d / (20.5 * scale));
      const halfSkid = Math.max(0.5, (2.6 - t * 1.9) * scale);
      for (let o = -halfSkid; o <= halfSkid; o += 0.5) {
        const px = mid2 + dx * d + nx * o;
        const py = mid2 + dy * d + ny * o;
        const isEdge = Math.abs(o) > halfSkid * 0.55;
        c.put(px, py, isEdge ? (o < 0 ? CHIP : SHADE) : (t < 0.5 ? CRACK : SCORCH), Math.round(250 * (1 - t * 0.35)));
      }
    }
    // Piled-up displaced steel wave at the exit end of the ricochet trough
    for (let a = -1.0; a <= 1.0; a += 0.12) {
      const rProw = 9.8 * scale;
      const px = mid2 + Math.cos(turn + a * 0.55) * rProw;
      const py = mid2 + Math.sin(turn + a * 0.55) * rProw;
      c.put(px, py, SPECULAR_STEEL, 255);
      c.put(px + dx * 0.9, py + dy * 0.9, BARE, 245);
    }
    crater(c, mid2, mid2, 10.2 * scale, 5.0 * scale, turn, { halo: 1.34, seed, rnd });
    flecks(c, rnd, mid2 + dx * 15 * scale, mid2 + dy * 15 * scale, 5, 1, 7.5 * scale);
  },
  // 3: Fractured armor plate — deep impact with long branching stress cracks and a secondary spall crater
  (c, rnd, scale, seed) => {
    const main = rnd() * Trigo.twopi;
    scorch(c, rnd, mid2, mid2, 13.0 * scale, 0.65, seed);
    for (let i = 0; i < 4; i++)
      crack(c, rnd, mid2, mid2, main + i * Trigo.halfpi + (rnd() - 0.5) * 0.65, (14.5 + rnd() * 9.5) * scale, true, 1);
    crater(c, mid2, mid2, 6.2 * scale, 6.0 * scale, main, { halo: 1.32, seed, rnd });
    const a = main + 0.75 + rnd() * 1.2;
    const dist = 10.6 * scale;
    crater(c, mid2 + Math.cos(a) * dist, mid2 + Math.sin(a) * dist, 3.6 * scale, 3.1 * scale, a, { depth: 0.4, bare: false, halo: 1.25, seed: seed + 19, rnd });
  },
  // 4: Double-tap / paired buckshot hit — two overlapping craters with a buckled steel bridge between them
  (c, rnd, scale, seed) => {
    const a = rnd() * Trigo.twopi;
    const gap = (5.4 + rnd() * 2.0) * scale;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    scorch(c, rnd, mid2, mid2, 15.0 * scale, 0.7, seed);
    crater(c, mid2 + ca * gap, mid2 + sa * gap, 5.6 * scale, 5.3 * scale, a, { halo: 1.34, seed, rnd });
    crater(c, mid2 - ca * gap, mid2 - sa * gap, 4.8 * scale, 4.6 * scale, a + 0.5, { halo: 1.34, seed: seed + 23, rnd });
    // Buckled steel ridge pinched between the two entry bores
    for (let o = -3.8 * scale; o <= 3.8 * scale; o += 0.45) {
      const bx = mid2 - sa * o;
      const by = mid2 + ca * o;
      c.put(bx, by, SPECULAR_STEEL, 255);
      c.put(bx + ca * 0.8, by + sa * 0.8, CRACK, 255);
    }
    crack(c, rnd, mid2, mid2, a + Trigo.halfpi, (9.0 + rnd() * 5.0) * scale, true, 0);
    crack(c, rnd, mid2, mid2, a - Trigo.halfpi, (8.0 + rnd() * 4.5) * scale, true, 0);
  },
  // 5: Heavy concussive slug dent — dished steel bowl with concentric stress ripples and crazed center scar
  (c, rnd, scale, seed) => {
    scorch(c, rnd, mid2, mid2, 14.0 * scale, 0.65, seed);
    crater(c, mid2, mid2, 8.8 * scale, 8.2 * scale, rnd() * Trigo.pi, { depth: 0.35, bare: false, halo: 1.35, seed, rnd });
    // Crushed central slug-flattening scar and radial micro-crazing
    crater(c, mid2, mid2, 3.0 * scale, 2.8 * scale, 0, { depth: 0.85, bare: true, halo: 1.2, seed: seed + 31, rnd });
    for (let i = 0; i < 4; i++)
      crack(c, rnd, mid2, mid2, rnd() * Trigo.twopi, (7.0 + rnd() * 4.5) * scale, true, 0);
    flecks(c, rnd, mid2, mid2, 4, 9.5 * scale, 15.0 * scale);
  },
  // 6: Hot plasma-scorched / point-blank puncture — wide FBM soot halo with upward smoke tongues around a quenched bore
  (c, rnd, scale, seed) => {
    scorch(c, rnd, mid2, mid2, 19.5 * scale, 1.15, seed);
    scorch(c, rnd, mid2, mid2 - 4.0 * scale, 14.5 * scale, 0.95, seed + 11);
    for (let i = 0; i < 4; i++) {
      const sx0 = mid2 + (i - 1.5) * 4.0 * scale + (rnd() - 0.5) * 2.0;
      const sy0 = mid2 - 5.0 * scale;
      const sx1 = sx0 + (rnd() - 0.5) * 5.0 * scale;
      const sy1 = mid2 - (15.5 + rnd() * 8.0) * scale;
      c.line(sx0, sy0, sx1, sy1, SCORCH, 215);
      c.line(sx0 + 0.7, sy0, sx1 + 0.7, sy1 + 1.5, SHADE, 180);
    }
    for (let i = 0; i < 4; i++)
      crack(c, rnd, mid2, mid2, rnd() * Trigo.twopi, (8.0 + rnd() * 5.5) * scale, true, 0);
    crater(c, mid2, mid2, 6.4 * scale, 6.2 * scale, 0, { halo: 1.48, seed, rnd });
  },
  // 7: Star-shattered brittle plate — dense radial fracture web and concentric spall ring around a sharp punch
  (c, rnd, scale, seed) => {
    const n = 7 + Math.floor(rnd() * 3);
    scorch(c, rnd, mid2, mid2, 13.5 * scale, 0.65, seed);
    for (let i = 0; i < n; i++)
      crack(c, rnd, mid2, mid2, (i / n) * Trigo.twopi + (rnd() - 0.5) * 0.25, (9.5 + rnd() * 9.5) * scale, i % 2 === 0, 0);
    // Concentric shock-spall ring connecting the radial cracks
    for (const rRing of [9.5 * scale, 14.5 * scale])
      for (let k = 0; k < 24; k++)
        if (rnd() < 0.65) {
          const a0 = (k / 24) * Trigo.twopi;
          const a1 = ((k + 1) / 24) * Trigo.twopi;
          c.line(
            mid2 + Math.cos(a0) * rRing,
            mid2 + Math.sin(a0) * rRing,
            mid2 + Math.cos(a1) * rRing,
            mid2 + Math.sin(a1) * rRing,
            CRACK,
            225
          );
        }
    crater(c, mid2, mid2, 5.8 * scale, 5.6 * scale, 0, { halo: 1.32, seed, rnd });
  },
];

// Per-variant caliber scale so the 12 hole cells span from tight sub-caliber punctures to heavy buckshot/slug wounds
const HOLE_SCALES = [0.92, 1.02, 0.98, 1.06, 1.0, 0.96, 1.12, 0.98, 0.84, 1.14, 0.96, 1.18];

/** A bullet hole of one of twelve high-resolution variants. */
function drawHole(c, variant, rnd) {
  const scale = HOLE_SCALES[variant % HOLE_SCALES.length];
  const seed = 300 + variant * 97;
  KINDS[variant % KINDS.length](c, rnd, scale, seed);
  if (variant % 3 !== 0)
    flecks(c, rnd, mid2, mid2, 2 + Math.floor(rnd() * 3), 10.5 * scale, 16.5 * scale);
}

/**
 * One frame of one kind of spark at 64x64 resolution:
 * 0 a crisp star flash and high-velocity streaks, 1 a heavy shower arcing downward,
 * 2 a sharp metallic glint and slow embers, 3 a directional ricochet cone of sparks.
 */
function drawSpark(c, variant, frame) {
  const t = frame / (SPARK_FRAMES - 1);
  const rnd = mulberry32(900 + variant * 131);
  const lastFrame = frame === SPARK_FRAMES - 1;
  const fade = (life) => {
    if (lastFrame)
      return EMBER;
    return t < life * 0.35 ? YELLOW : t < life * 0.7 ? ORANGE : EMBER;
  };
  // Each spark is painted at 64x64 with a bright incandescent head and a motion-blurred velocity tail
  const spark = (angle, speed, life, drop) => {
    if (t > life)
      return;
    const travel = t * speed * 2;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const x = mid2 + ca * travel;
    const y = mid2 + sa * travel + drop * 2 * t * t;
    const col = fade(life);
    c.put(x, y, col, 255);
    c.put(x + 0.7, y, lastFrame ? EMBER_DIM : col, 235, false);
    c.put(x, y + 0.7, lastFrame ? EMBER_DIM : col, 235, false);
    if (t < life * 0.78) {
      const tailCol = lastFrame ? EMBER_DIM : (t < life * 0.35 ? ORANGE : EMBER);
      const tailLen = lastFrame ? 1.8 : 3.4 * (1 - t / life);
      const vx = ca;
      const vy = sa + drop * 0.14 * t;
      for (let s = 0.7; s <= tailLen; s += 0.65)
        c.put(x - vx * s, y - vy * s, s > tailLen * 0.6 ? (lastFrame ? EMBER_DIM : EMBER) : tailCol, 240, false);
    }
  };
  const flash = (size, color) => {
    const r = size * 1.75;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++)
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const dist = Math.hypot(dx, dy);
        const axial = Math.min(Math.abs(dx), Math.abs(dy));
        const diag = Math.abs(Math.abs(dx) - Math.abs(dy));
        if (dist <= 1.6)
          c.put(mid2 + dx, mid2 + dy, color, 255);
        else if (axial <= 0.8 && dist <= r)
          c.put(mid2 + dx, mid2 + dy, dist <= r * 0.45 ? FLASH : YELLOW, 250);
        else if (diag <= 0.8 && dist <= r * 0.72)
          c.put(mid2 + dx, mid2 + dy, size > 1 ? YELLOW : ORANGE, 235, false);
      }
  };
  if (variant === 0) {
    if (frame === 0)
      flash(3, FLASH);
    else if (frame === 1)
      flash(2, YELLOW);
    for (let k = 0; k < 6; k++)
      spark(rnd() * Trigo.twopi, 7 + rnd() * 7, 0.55 + rnd() * 0.4, 6);
  } else if (variant === 1) {
    if (frame === 0)
      flash(2, FLASH);
    else if (frame === 1)
      flash(1, YELLOW);
    for (let k = 0; k < 7; k++)
      spark(Trigo.halfpi + (rnd() - 0.5) * 1.8, 4 + rnd() * 6, 0.5 + rnd() * 0.5, 12);
  } else if (variant === 2) {
    if (frame < 2)
      flash(frame === 0 ? 3 : 2, frame === 0 ? FLASH : YELLOW);
    for (let k = 0; k < 4; k++)
      spark(rnd() * Trigo.twopi, 3.5 + rnd() * 4.5, 0.7 + rnd() * 0.3, 10);
  } else {
    const heading = -0.5 + rnd() * 0.4 + (rnd() < 0.5 ? 0 : Trigo.pi - 0.4);
    if (frame === 0)
      flash(2, FLASH);
    else if (frame === 1)
      flash(1, YELLOW);
    for (let k = 0; k < 5; k++)
      spark(heading + (rnd() - 0.5) * 0.7, 9 + rnd() * 6, 0.5 + rnd() * 0.45, 5);
  }
}

/**
 * A high-resolution vertical chainsaw or combat-knife gash in steel (64x64 native):
 * a deep V-grooved vertical kerf with diagonal tooth striations on the grazing-lit inner wall,
 * curled bare-steel burr ridges with raker-tooth scallops along the lips, continuous FBM friction
 * scorch, parallel chain-skip chatter scratches, and thrown metal shavings.
 */
function drawSlash(c, variant, rnd) {
  const seed = 700 + variant * 113;
  const y0 = 6 + (variant % 2) * 2;
  const y1 = ATLAS_CELL - 7 - ((variant + 1) % 2) * 2;
  const tilt = (variant % 2 === 0 ? 1 : -1) * (0.045 + (variant % 3) * 0.038);
  const curve = (variant % 3 === 1 ? 1 : -1) * 1.55;

  for (let y = y0; y <= y1; y++) {
    const t = (y - y0) / (y1 - y0);
    const env = Math.sin(t * Trigo.pi);
    const warp = (fbm(variant * 7.3, y * 0.28, seed) - 0.5) * 0.9;
    const cx = mid2 + (y - mid2) * tilt + Math.sin(t * Trigo.pi) * curve + warp;
    const toothPhase = Math.sin(y * 1.15 + variant * 1.7);
    const tooth = toothPhase > 0.38;
    const halfW = (1.15 + 1.85 * env) + (tooth ? 0.85 * env : 0);
    const scorchW = halfW + 2.2 * env + 0.8;

    for (let dx = -Math.ceil(scorchW + 1); dx <= Math.ceil(scorchW + 1); dx += 0.5) {
      const px = cx + dx;
      const adx = Math.abs(dx);
      const grain = fbm(px * 0.45, y * 0.45, seed + 5);
      const jitter = (hash2(px | 0, y, seed) - 0.5) * 9;

      if (adx <= halfW) {
        // Inside the V-groove kerf: pitch-black root, shadowed left wall, grazing-lit striated right wall
        const normX = dx / (halfW || 1);
        if (Math.abs(normX) < 0.44)
          c.put(px, y, CHAR, 255);
        else if (normX < 0)
          c.put(px, y, clampSteelColor(mix3(CHAR, SCORCH, (normX + 1) * 0.8), jitter * 0.5), 255);
        else {
          const striation = 0.55 + 0.45 * Math.sin(y * 1.6 - dx * 1.2 + variant);
          const innerCol = mix3(CRACK, mix3(PRIMER, RIM, striation), normX * 0.85);
          c.put(px, y, clampSteelColor(innerCol, jitter), 255);
        }
      } else if (dx < 0 && adx <= halfW + 1.65) {
        // Raised left burr lip: curled bare steel catching the upper-left light
        const lipT = 1 - (adx - halfW) / 1.65;
        const burrCol = tooth && lipT > 0.45 ? SPECULAR_STEEL : mix3(RIM, BARE, lipT * (0.65 + 0.35 * grain));
        c.put(px, y, clampSteelColor(burrCol, jitter), 255);
      } else if (dx > 0 && adx <= halfW + 1.55) {
        // Right burr lip: thin specular ridge followed by cast overhang shadow
        const lipT = (adx - halfW) / 1.55;
        const rightCol = lipT < 0.48 ? mix3(SHADE, CHIP, (1 - lipT) * (tooth ? 0.9 : 0.55)) : SCORCH;
        c.put(px, y, clampSteelColor(rightCol, jitter * 0.7), 255);
      } else if (adx <= scorchW) {
        // Continuous FBM friction-burn and heat-tint halo along the cut
        const haloT = (adx - (halfW + 1.55)) / Math.max(0.6, scorchW - (halfW + 1.55));
        const alpha = Math.round(235 * (1 - Utils.smoothstep(0, 1, haloT)) * (0.65 + 0.35 * grain));
        if (alpha >= 136)
          c.put(px, y, clampSteelColor(mix3(SCORCH, SHADE, grain * 0.6), jitter * 0.4), alpha, false);
      }
    }
  }

  // Secondary parallel chain-skip score line on variants 1 and 3
  if (variant === 1 || variant === 3) {
    const side = variant === 1 ? 5.6 : -5.6;
    const sy0 = y0 + 7;
    const sy1 = y1 - 6;
    for (let y = sy0; y <= sy1; y++) {
      const env = Math.sin(((y - sy0) / (sy1 - sy0)) * Trigo.pi);
      const sx = mid2 + side + (y - mid2) * tilt + (fbm(y * 0.3, variant, seed + 19) - 0.5) * 0.7;
      c.put(sx, y, CRACK, 255);
      c.put(sx - 0.85, y, env > 0.35 ? CHIP : RIM, 235, false);
      c.put(sx + 0.85, y, SCORCH, 210, false);
    }
  }

  // Double-bite overlapping vertical chatter gouge on variant 3
  if (variant === 3)
    for (let y = y0 + 5; y <= y1 - 9; y++) {
      const sx = mid2 + 2.8 - (y - mid2) * tilt * 0.65;
      c.put(sx, y, CHAR, 255);
      c.put(sx + 0.9, y, BARE, 245, false);
    }

  // Short oblique shear cracks branching off the kerf on variants 4 and 5 (kept compact so the gash stays tall and narrow)
  if (variant >= 4) {
    crack(c, rnd, mid2 - 1.5, mid2 - 6, Trigo.pi + 0.35 + (rnd() - 0.5) * 0.25, 5.2, true, 0);
    crack(c, rnd, mid2 + 1.5, mid2 + 6, -0.35 + (rnd() - 0.5) * 0.25, 5.2, true, 0);
  }

  // Shaved steel flecks thrown out near the bottom exit of the cut
  flecks(c, rnd, mid2 + (y1 - mid2) * tilt, y1 - 2, 4, 2.0, 5.8);
}


const BRICK = [146, 78, 62];
const BRICK_DARK = [92, 48, 40];
const MORTAR = [128, 122, 112];
const DUST = [118, 116, 112];
const DUST_DARK = [70, 70, 74];
const PANEL = [156, 162, 172];
const PIPE = [104, 118, 130];
const JOIST = [96, 68, 46];
const SOOT = [[78, 80, 88], [38, 40, 48], [14, 16, 24]];
const SKIN = [PLASTER, DUST, PANEL];
const BORDER = 3;
const BLAST_RADIUS = [12, 17, 22];
const BLAST_CORE = [0, 0.45, 0.55];
const SHARD_POINTS = 8;

const bandOf = (v) => Math.max(0, Math.min(255, v));

/** A 64 px cell for the blast art: same `put` as `Cell`, but with alpha blending and a cleared border. */
class BlastCell {
  constructor() {
    this.pixels = new Uint8Array(ATLAS_CELL * ATLAS_CELL * 4);
  }

  put(x, y, color, alpha = 255, over = true) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < BORDER || y < BORDER || x >= ATLAS_CELL - BORDER || y >= ATLAS_CELL - BORDER || alpha <= 0)
      return;
    const o = (y * ATLAS_CELL + x) * 4;
    const old = this.pixels[o + 3];
    if (!over && old)
      return;
    const t = old ? alpha / 255 : 1;
    this.pixels[o] = bandOf(Utils.lerp(this.pixels[o], color[0], t));
    this.pixels[o + 1] = bandOf(Utils.lerp(this.pixels[o + 1], color[1], t));
    this.pixels[o + 2] = bandOf(Utils.lerp(this.pixels[o + 2], color[2], t));
    this.pixels[o + 3] = Math.max(old, alpha);
  }

  line(x0, y0, x1, y1, color, alpha = 255) {
    const steps = Math.ceil(scratchPt.setScalar(x1 - x0, y1 - y0).getMagnitude() * 1.5) || 1;
    for (let i = 0; i <= steps; i++)
      this.put(Utils.lerp(x0, x1, i / steps), Utils.lerp(y0, y1, i / steps), color, alpha);
  }
}

function hash2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = Utils.smoothstep(0, 1, x - ix);
  const fy = Utils.smoothstep(0, 1, y - iy);
  return Utils.lerp(
    Utils.lerp(hash2(ix, iy, seed), hash2(ix + 1, iy, seed), fx),
    Utils.lerp(hash2(ix, iy + 1, seed), hash2(ix + 1, iy + 1, seed), fx),
    fy,
  );
}

/** Three octaves of value noise, 0 to 1. */
function fbm(x, y, seed) {
  return vnoise(x, y, seed) * 0.57 + vnoise(x * 2, y * 2, seed + 1) * 0.29 + vnoise(x * 4, y * 4, seed + 2) * 0.14;
}

function shade3(color, k, jitter = 0) {
  return [color[0] * k + jitter, color[1] * k + jitter, color[2] * k + jitter];
}

/** What shows through the opening: brick courses on walls, slabs on floors, joists and panel backs on ceilings. */
function substrate(surface, x, y, tone, noise) {
  if (surface === 0) {
    const row = Math.floor(y / 6);
    const col = Math.floor((x + (row % 2) * 6) / 12);
    const mortar = y % 6 === 0 || (x + (row % 2) * 6) % 12 === 0;
    if (noise > 0.62)
      return shade3(CONCRETE, 0.8 + tone * 0.3);
    return mortar ? shade3(MORTAR, 0.85) : mix3(BRICK_DARK, BRICK, (tone + hash2(col, row, 3)) * 0.5);
  }
  if (surface === 1)
    return mix3(CONCRETE_DARK, CONCRETE, tone);
  return mix3(shade3(JOIST, 0.7), noise > 0.55 ? PANEL : JOIST, tone);
}

/**
 * One blast cell, painted at the atlas resolution in layers: a ragged outline (domain-warped noise), a dark crater, the
 * substrate in Voronoi shards with crack seams, a lit rim on the upper left and a shadowed one on the lower right, a
 * soot halo, then loose pieces (bars, pipes, flaps, rubble). `tier` is 0 scuffed, 1 chipped, 2 blown out; `base` tells the
 * two paintings of the same tier apart through their seed.
 */
function drawBlast(c, surface, tier, base, rnd) {
  const seed = Math.floor(rnd() * 100000);
  const ox = rnd() * 40;
  const oy = rnd() * 40;
  const radius = BLAST_RADIUS[tier];
  const core = BLAST_CORE[tier];
  const soot = SOOT[tier];
  const skin = SKIN[surface];
  const shards = SHARD_POINTS + tier * 3 + base * 4;
  const sx = new Array(shards);
  const sy = new Array(shards);
  for (let i = 0; i < shards; i++) {
    const a = rnd() * Trigo.twopi;
    const r = Math.sqrt(rnd()) * radius * 1.1;
    sx[i] = mid2 + Math.cos(a) * r;
    sy[i] = mid2 + Math.sin(a) * r;
  }
  for (let y = BORDER; y < ATLAS_CELL - BORDER; y++)
    for (let x = BORDER; x < ATLAS_CELL - BORDER; x++) {
      const dx = x - mid2;
      const dy = y - mid2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ux = dist ? dx / dist : 0;
      const uy = dist ? dy / dist : 0;
      const warp = fbm(ux * 1.7 + ox, uy * 1.7 + oy, seed) - 0.5;
      const reach = radius * (1 + warp * (0.7 + tier * 0.25)) + (vnoise(x * 0.5, y * 0.5, seed + 9) - 0.5) * 2;
      const d = dist / reach;
      if (d > 1.4)
        continue;
      let near = 1e9;
      let second = 1e9;
      let id = 0;
      for (let i = 0; i < shards; i++) {
        const ddx = x - sx[i];
        const ddy = y - sy[i];
        const dd = ddx * ddx + ddy * ddy;
        if (dd < near) {
          second = near;
          near = dd;
          id = i;
        } else if (dd < second)
          second = dd;
      }
      const seam = Math.sqrt(second) - Math.sqrt(near);
      const tone = hash2(id, seed, 17);
      const grain = fbm(x * 0.4, y * 0.4, seed + 5);
      const jitter = (hash2(x, y, seed) - 0.5) * 14;
      // lit on the upper left, in shadow on the lower right
      const lit = -(ux + uy) * 0.7071;
      let color;
      let alpha = 255;
      if (core > 0 && d < core) {
        const t = d / core;
        color = mix3(CHAR, shade3(substrate(surface, x, y, tone, grain), 0.28), t * t);
        if (seam < 1.2 && t > 0.4)
          color = shade3(color, 1.6, 6);
      } else if (d < 0.92) {
        const ring = core > 0 ? (d - core) / (0.92 - core) : d / 0.92;
        const ao = 0.55 + 0.45 * Utils.smoothstep(0, 1, ring);
        if (tier === 0)
          color = grain > 0.58 ? shade3(substrate(surface, x, y, tone, grain), 0.75 + 0.3 * lit) : shade3(skin, 0.62 + tone * 0.2 + lit * 0.12);
        else
          color = shade3(substrate(surface, x, y, tone, grain), ao + lit * 0.15 * ring);
        if (seam < 1.3)
          color = seam < 0.7 ? CRACK : shade3(color, 0.6);
        else if (lit > 0.5 && seam < 2.4)
          color = shade3(color, 1.35);
      } else if (d < 1.1) {
        // the lip: lit on the upper left, shadowed on the lower right
        if (lit > 0.15)
          color = shade3(skin, 0.95 + lit * 0.5 + (grain - 0.5) * 0.3);
        else
          color = shade3(DUST_DARK, 0.5 - lit * 0.2);
      } else {
        color = mix3(soot, shade3(skin, 0.5), grain * 0.5);
        alpha = 230 * (1 - Utils.smoothstep(1.1, 1.4, d));
      }
      alpha *= Utils.smoothstep(BORDER, BORDER + 5, Math.min(x, y, ATLAS_CELL - 1 - x, ATLAS_CELL - 1 - y));
      c.put(x, y, shade3(color, 1, jitter), alpha);
    }
  // hairline cracks fanning out of the opening into the surface
  const cracks = 3 + tier * 2 + base * 2;
  for (let i = 0; i < cracks; i++) {
    let a = (i / cracks) * Trigo.twopi + rnd() * 0.6;
    let px = mid2 + Math.cos(a) * radius * 0.9;
    let py = mid2 + Math.sin(a) * radius * 0.9;
    const length = radius * (0.4 + rnd() * 0.5);
    for (let s = 0; s < length; s++) {
      a += (rnd() - 0.5) * 0.7;
      px += Math.cos(a);
      py += Math.sin(a);
      c.put(px, py, CRACK, 235);
      c.put(px - 1, py - 1, CHIP, 150, false);
      if (s % 7 === 6)
        c.line(px, py, px + Math.cos(a + 0.9) * 4, py + Math.sin(a + 0.9) * 4, CRACK, 200);
    }
  }
  if (tier === 0)
    return;
  const bars = tier === 1 ? 2 : 4;
  for (let i = 0; i < bars; i++) {
    const a = rnd() * Trigo.twopi;
    const from = radius * 0.5;
    const to = radius * (0.9 + rnd() * 0.3);
    if (surface === 2) {
      // a pipe crossing the opening and, further in, joists
      const yy = mid2 - radius * 0.4 + i * 4;
      c.line(mid2 - radius * 0.8, yy, mid2 + radius * 0.8, yy + 1, PIPE);
      c.line(mid2 - radius * 0.8, yy - 1, mid2 + radius * 0.8, yy, CHIP, 220);
      if (tier === 2)
        c.line(mid2 - radius * 0.7 + i * 9, mid2 - radius * 0.7, mid2 - radius * 0.6 + i * 9, mid2 + radius * 0.7, JOIST);
    } else {
      c.line(mid2 + Math.cos(a) * from, mid2 + Math.sin(a) * from, mid2 + Math.cos(a) * to, mid2 + Math.sin(a) * to, REBAR);
      c.put(mid2 + Math.cos(a) * to, mid2 + Math.sin(a) * to, BARE);
    }
  }
  // flakes, flaps and rubble thrown round the opening
  const pieces = 14 + tier * 12 + base * 6;
  for (let i = 0; i < pieces; i++) {
    const a = rnd() * Trigo.twopi;
    const r = radius * (0.85 + rnd() * 0.5);
    const px = mid2 + Math.cos(a) * r;
    const py = mid2 + Math.sin(a) * r;
    const size = 1 + Math.floor(rnd() * (1 + tier));
    for (let k = 0; k < size; k++) {
      c.put(px + k, py, i % 2 ? RUBBLE_LIGHT : skin, 255, false);
      c.put(px + k + 1, py + 1, CONCRETE_DARK, 255, false);
    }
  }
  if (surface === 0 && tier === 2) {
    // a soot streak running up the wall from the top of the crater
    const w = 3 + base * 2;
    for (let y = BORDER; y < mid2 - radius; y++)
      for (let x = -w; x <= w; x++)
        c.put(mid2 + x + (vnoise(y * 0.3, seed, 4) - 0.5) * 6, y, SOOT[2], 150 * (1 - Math.abs(x) / (w + 1)) * ((y - BORDER) / (mid2 - radius - BORDER)), false);
  }
}

const BURN_REACH = [0.5, 0.68, 0.86];
const BURN_ALPHA = [150, 195, 235];

/**
 * The scorched backdrop of a blast: soot that bleeds far past the crater, darkest at its heart, with tongues licking
 * upward on walls (`flat` false) or spreading as a ragged star on floors and ceilings, fading out before the cell border.
 */
function drawBurn(c, flat, tier, rnd) {
  const seed = Math.floor(rnd() * 100000);
  const ox = rnd() * 40;
  const oy = rnd() * 40;
  const reach = (ATLAS_CELL / 2 - BORDER - 2) * BURN_REACH[tier];
  const tongues = 5 + tier * 2;
  const phase = rnd() * Trigo.twopi;
  for (let y = BORDER; y < ATLAS_CELL - BORDER; y++)
    for (let x = BORDER; x < ATLAS_CELL - BORDER; x++) {
      const dx = x - mid2;
      const dy = y - mid2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const a = Math.atan2(dy, dx);
      const warp = fbm(x * 0.12 + ox, y * 0.12 + oy, seed) - 0.5;
      let r = reach * (1 + warp * 0.9) * (1 + 0.35 * Math.cos(a * tongues + phase) * (0.4 + tier * 0.2));
      // flames climb: on a wall the soot reaches further up (small y) than down
      if (!flat)
        r *= dy < 0 ? 1.25 : 0.8;
      const d = dist / r;
      if (d >= 1)
        continue;
      const grain = fbm(x * 0.35, y * 0.35, seed + 3);
      const fade = 1 - Utils.smoothstep(0.25, 1, d);
      const alpha = BURN_ALPHA[tier] * fade * (0.7 + 0.3 * grain);
      const heat = 1 - Utils.smoothstep(0, 0.55, d);
      const color = mix3(shade3(SOOT[1], 0.6 + grain * 0.5), CHAR, heat);
      c.put(x, y, shade3(color, 1, (hash2(x, y, seed) - 0.5) * 8), alpha * Utils.smoothstep(BORDER, BORDER + 5, Math.min(x, y, ATLAS_CELL - 1 - x, ATLAS_CELL - 1 - y)));
    }
}

/** The atlas as RGBA pixels, ready to be a texture. */
export function impactAtlas() {
  const width = ATLAS_CELL * IMPACT_CELL_COUNT;
  const data = new Uint8Array(width * ATLAS_CELL * 4);
  const blastEnd = IMPACT_CELLS.brokenCeiling + BLAST_SPAN;
  for (let cell = 0; cell < IMPACT_CELL_COUNT; cell++) {
    const b = new BlastCell();
    if (cell < HOLE_VARIANTS)
      drawHole(b, cell, mulberry32(2024 + cell * 7919));
    else if (cell < IMPACT_CELLS.slash)
      drawSpark(b, Math.floor((cell - HOLE_VARIANTS) / SPARK_FRAMES), (cell - HOLE_VARIANTS) % SPARK_FRAMES);
    else if (cell < IMPACT_CELLS.slash + SLASH_VARIANTS) {
      const slashIdx = cell - IMPACT_CELLS.slash;
      drawSlash(b, slashIdx, mulberry32(4096 + slashIdx * 6151));
    } else if (cell >= IMPACT_CELLS.brokenWall && cell < blastEnd) {
      const broken = cell - IMPACT_CELLS.brokenWall;
      const tierBase = broken % BLAST_SPAN;
      drawBlast(b, Math.floor(broken / BLAST_SPAN), Math.floor(tierBase / BLAST_BASES), tierBase % BLAST_BASES, mulberry32(8192 + cell * 7919));
    } else if (cell >= IMPACT_CELLS.burn && cell < IMPACT_CELLS.burn + BLAST_TIERS * 2) {
      const n = cell - IMPACT_CELLS.burn;
      drawBurn(b, n >= BLAST_TIERS, n % BLAST_TIERS, mulberry32(16384 + cell * 7919));
    } else
      continue;
    for (let y = 0; y < ATLAS_CELL; y++)
      data.set(b.pixels.subarray(y * ATLAS_CELL * 4, (y + 1) * ATLAS_CELL * 4), (y * width + cell * ATLAS_CELL) * 4);
  }
  return { name: 'impacts', data, width, height: ATLAS_CELL, cell: ATLAS_CELL, frames: IMPACT_CELL_COUNT };
}

/** Texture coordinates of a cell: [u0, v0, u1, v1], with v1 at the top of the image. */
export function impactCellUv(cell) {
  return [cell / IMPACT_CELL_COUNT, 0, (cell + 1) / IMPACT_CELL_COUNT, 1];
}

/**
 * A bullet hole or chainsaw slash on a wall face, as a flat quad just in front of it. The quad is cut where it would leave the face (the
 * face runs `lo` and `hi` along its tangent, and from the floor to `top`), and the picture is cut with it, so no hole
 * hangs in the air past a corner or above a low wall. Null when nothing of it is left on the face.
 * `pos` is a Vec3 (x, y in the game plane, z the height of the hit) and `normal` a Vec2 face normal in the game plane.
 * With `out` ({ corners: 12, uv: 4 }) the values are written in place and `out` is returned, valid until the next call; callers that
 * retain the quad (`cachedQuad`) must not pass `out`.
 */
export function holeQuad({ pos, normal, top, seed, kind = 'hole', lo = -Infinity, hi = Infinity, slope = 0 }, out = null) {
  const x = pos.x;
  const y = pos.y;
  const z = pos.z;
  const nx = normal.x;
  const ny = normal.y;
  const rnd = mulberry32(seed);
  const cell = kind === 'slash'
    ? IMPACT_CELLS.slash + Math.floor(rnd() * SLASH_VARIANTS)
    : IMPACT_CELLS.hole + Math.floor(rnd() * HOLE_VARIANTS);
  const half = HOLE_SIZE / 2;
  const cu0 = Math.max(-half, lo + EDGE);
  const cu1 = Math.min(half, hi - EDGE);
  const cv0 = Math.max(-half, 0.6 - z);
  const cv1 = Math.min(half, top - 0.6 - z);
  if (cu0 >= cu1 || cv0 >= cv1)
    return null;
  const tx = -ny;
  const ty = nx;
  const n0 = 0.25 - slope * cv0;
  const n1 = 0.25 - slope * cv1;
  const dest = out ?? { corners: new Array(12), uv: new Array(4) };
  const c = dest.corners;
  c[0] = x + tx * cu0 + nx * n0;
  c[1] = z + cv0;
  c[2] = y + ty * cu0 + ny * n0;
  c[3] = x + tx * cu1 + nx * n0;
  c[4] = z + cv0;
  c[5] = y + ty * cu1 + ny * n0;
  c[6] = x + tx * cu1 + nx * n1;
  c[7] = z + cv1;
  c[8] = y + ty * cu1 + ny * n1;
  c[9] = x + tx * cu0 + nx * n1;
  c[10] = z + cv1;
  c[11] = y + ty * cu0 + ny * n1;
  const a0 = cell / IMPACT_CELL_COUNT;
  const a1 = (cell + 1) / IMPACT_CELL_COUNT;
  const uv = dest.uv;
  uv[0] = a0 + ((cu0 - -half) / (half - -half)) * (a1 - a0);
  uv[1] = 0 + ((cv0 - -half) / (half - -half)) * (1 - 0);
  uv[2] = a0 + ((cu1 - -half) / (half - -half)) * (a1 - a0);
  uv[3] = 0 + ((cv1 - -half) / (half - -half)) * (1 - 0);
  return dest;
}

/**
 * Blast damage on a wall face, a flat quad just in front of it and cut where the face ends, like `holeQuad` but
 * larger (`size` world units across) and in the cell of the damage `tier` (0 to 2). Null when nothing of it is left.
 * `pos` is a Vec3 (the height of the blast in z), `normal` a Vec2. With `out` the values are written in place.
 */
export function blastWallQuad({ pos, normal, top, seed, tier, lo = -Infinity, hi = Infinity, slope = 0, size, variant = seed % 4 }, out = null) {
  const cell = IMPACT_CELLS.brokenWall + Utils.clamp(tier, 0, BLAST_TIERS - 1) * BLAST_BASES + (variant & 1);
  return wallQuadIn({ pos, normal, top, lo, hi, slope, size, variant }, out, cell, BLAST_OFFSET);
}

/**
 * The scorched backdrop of a wall blast: the same marks as `blastWallQuad`, `BURN_SCALE` times wider, a little closer to
 * the face so the damage draws over it, in the burn cell of the damage `tier`.
 */
export function burnWallQuad({ pos, normal, top, tier, lo = -Infinity, hi = Infinity, slope = 0, size, variant = 0 }, out = null) {
  const cell = IMPACT_CELLS.burn + Utils.clamp(tier, 0, BLAST_TIERS - 1);
  return wallQuadIn({ pos, normal, top, lo, hi, slope, size: size * BURN_SCALE, variant }, out, cell, BURN_OFFSET);
}

function wallQuadIn({ pos, normal, top, lo, hi, slope, size, variant }, out, cell, offset) {
  const half = size / 2;
  const cu0 = Math.max(-half, lo + EDGE);
  const cu1 = Math.min(half, hi - EDGE);
  const cv0 = Math.max(-half, 0.6 - pos.z);
  const cv1 = Math.min(half, top - 0.6 - pos.z);
  if (cu1 - cu0 < MIN_SPAN || cv1 - cv0 < MIN_SPAN)
    return null;
  const nx = normal.x;
  const ny = normal.y;
  const tx = -ny;
  const ty = nx;
  const n0 = offset - slope * cv0;
  const n1 = offset - slope * cv1;
  const dest = out ?? { corners: new Array(12), uv: new Array(4) };
  const c = dest.corners;
  c[0] = pos.x + tx * cu0 + nx * n0;
  c[1] = pos.z + cv0;
  c[2] = pos.y + ty * cu0 + ny * n0;
  c[3] = pos.x + tx * cu1 + nx * n0;
  c[4] = pos.z + cv0;
  c[5] = pos.y + ty * cu1 + ny * n0;
  c[6] = pos.x + tx * cu1 + nx * n1;
  c[7] = pos.z + cv1;
  c[8] = pos.y + ty * cu1 + ny * n1;
  c[9] = pos.x + tx * cu0 + nx * n1;
  c[10] = pos.z + cv1;
  c[11] = pos.y + ty * cu0 + ny * n1;
  const a0 = cell / IMPACT_CELL_COUNT;
  const a1 = (cell + 1) / IMPACT_CELL_COUNT;
  const uv = dest.uv;
  const mirror = (variant & 2) !== 0;
  uv[0] = a0 + ((mirror ? half - cu0 : cu0 + half) / size) * (a1 - a0);
  uv[1] = (cv0 + half) / size;
  uv[2] = a0 + ((mirror ? half - cu1 : cu1 + half) / size) * (a1 - a0);
  uv[3] = (cv1 + half) / size;
  return dest;
}

/**
 * Blast damage on the floor or, with `ceiling`, the ceiling: a horizontal square of `size` world units centred on `pos` (a
 * Vec3 whose x and y are the game plane), turned a quarter turn per `variant`, hovering a little off the surface.
 */
export function blastFlatQuad({ pos, seed, tier, size, ceiling = false, variant = seed % 4 }, out = null) {
  const cell = (ceiling ? IMPACT_CELLS.brokenCeiling : IMPACT_CELLS.brokenFloor) + Utils.clamp(tier, 0, BLAST_TIERS - 1) * BLAST_BASES + (variant & 1);
  return flatQuadIn(pos, size, ceiling, variant, out, cell, FLAT_LIFT);
}

/** The scorched backdrop of a floor or ceiling blast, `BURN_SCALE` times wider and under the damage. */
export function burnFlatQuad({ pos, tier, size, ceiling = false, variant = 0 }, out = null) {
  const cell = IMPACT_CELLS.burn + BLAST_TIERS + Utils.clamp(tier, 0, BLAST_TIERS - 1);
  return flatQuadIn(pos, size * BURN_SCALE, ceiling, variant, out, cell, BURN_LIFT);
}

function flatQuadIn(pos, size, ceiling, variant, out, cell, lift) {
  const half = size / 2;
  const height = ceiling ? CEILING_HEIGHT - lift : lift;
  const dest = out ?? { corners: new Array(12), uv: new Array(4) };
  const c = dest.corners;
  // the corners go round the square, started a quarter turn further on for each variant
  for (let k = 0; k < 4; k++) {
    const q = (k + variant) % 4;
    const sx = q === 0 || q === 3 ? -half : half;
    const sy = q < 2 ? -half : half;
    c[k * 3] = pos.x + sx;
    c[k * 3 + 1] = height;
    c[k * 3 + 2] = pos.y + sy;
  }
  const uv = dest.uv;
  uv[0] = cell / IMPACT_CELL_COUNT;
  uv[1] = 0;
  uv[2] = (cell + 1) / IMPACT_CELL_COUNT;
  uv[3] = 1;
  return dest;
}
