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

  const sc = c.scale || 1;
  const step = 1 / sc;
  const putPx = (x, y, col, alpha = 255, over = true) => {
    if (sc === 1)
      c.putRaw(Math.round(x), Math.round(y), col, alpha, over);
    else
      c.putRaw(Math.round((x + 0.5) * sc - 0.5), Math.round((y + 0.5) * sc - 0.5), col, alpha, over);
  };
  for (let y = yMin; y <= yMax; y += step)
    for (let x = xMin; x <= xMax; x += step) {
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
      const jitter = (hash2(x * sc, y * sc, seed + 5) - 0.5) * 10;

      if (depth <= 0.5) {
        // Concussive non-penetrating dent: concave bowl shadowed on upper-left inner slope, lit on lower-right inner bowl
        if (d < 0.92) {
          const bowlT = d / 0.92;
          const innerLit = Utils.clamp(-lightDot * 0.65 * bowlT + 0.35, 0, 1);
          const impactCore = 1 - Utils.smoothstep(0, 0.36, d);
          const baseCol = mix3(SHADE, mix3(RIM, BARE, innerLit * 0.65), innerLit * (0.45 + 0.55 * n2));
          const dented = mix3(baseCol, SCORCH, impactCore * 0.72);
          putPx(x, y, clampSteelColor(dented, jitter), 236);
        } else if (d < 1.12) {
          const rimLit = Utils.clamp(lightDot * 0.7 + 0.3, 0, 1);
          const rimCol = mix3(SCORCH, RIM, rimLit * (0.55 + 0.45 * n2));
          const rimAlpha = Math.round(Utils.lerp(236, 168, Utils.smoothstep(0.95, 1.12, d)));
          putPx(x, y, clampSteelColor(rimCol, jitter), rimAlpha);
        } else {
          const fade = 1 - Utils.smoothstep(1.1, halo, d);
          const rawAlpha = Math.round(235 * fade * (0.65 + 0.35 * n1));
          if (rawAlpha >= 132) {
            const softAlpha = Math.round(Utils.clamp(38 + (rawAlpha - 132) * 1.15, 38, 158));
            putPx(x, y, clampSteelColor(mix3(CHAR, SCORCH, n2 * 0.5), jitter * 0.5), softAlpha, false);
          }
        }
        continue;
      }

      if (d < 0.56) {
        // Deep ballistic entry bore: dark ambient-occluded throat with grazing illumination on lower-right cylinder wall
        const inner = d / 0.56;
        const wallGrazing = Utils.smoothstep(0.32, 0.98, inner) * Utils.clamp(-lightDot + 0.15, 0, 1);
        const striation = 0.7 + 0.3 * Math.sin(theta * 11 + wobble * 2);
        const boreCol = mix3(CHAR, mix3(SCORCH, BORE_LIT, wallGrazing * striation), inner * inner * (0.35 + 0.65 * wallGrazing));
        putPx(x, y, clampSteelColor(boreCol, jitter * 0.4), 255);
      } else if (d < 0.75) {
        // Inner sheared lip: transitions smoothly from Subpass 1 cavity (255) to Subpass 0 collar (238)
        const t = (d - 0.56) / 0.19;
        const lipAlpha = Math.round(Utils.lerp(255, 238, Utils.smoothstep(0.35, 1.0, t)));
        if (lightDot > 0.08) {
          const crest = Utils.smoothstep(0.45, 1.0, t);
          const col = mix3(CHAR, bare ? BARE : RIM, crest * (0.55 + 0.45 * lightDot));
          putPx(x, y, clampSteelColor(col, jitter), lipAlpha);
        } else {
          const bevelPeak = 1 - Math.abs(t - 0.5) * 1.6;
          const sheen = Utils.clamp((-lightDot) * Math.max(0, bevelPeak), 0, 1);
          const col = mix3(SCORCH, bare ? CHIP : RIM, sheen * (0.6 + 0.4 * n2));
          putPx(x, y, clampSteelColor(col, jitter), lipAlpha);
        }
      } else if (d < 1.02) {
        // Raised outer spall crown (Subpass 0, alpha <= 236): lit on inner upper-left crest, darkening toward outer slope
        const crownT = 1 - Math.abs((d - 0.85) / 0.15);
        const outerDark = Utils.smoothstep(0.90, 1.02, d);
        const facet = 0.6 + 0.4 * Math.cos(theta * 6 - wobble2);
        if (lightDot >= -0.05) {
          const spec = Utils.clamp(lightDot * (0.62 + 0.38 * Math.max(0, crownT)) * (0.65 + 0.35 * facet) * (1 - outerDark * 0.65), 0, 1);
          const metal = bare ? mix3(RIM, SPECULAR_STEEL, spec) : mix3(PRIMER, CHIP, spec * 0.82);
          const col = mix3(metal, SCORCH, outerDark * 0.45);
          putPx(x, y, clampSteelColor(col, jitter), Math.round(Utils.lerp(236, 218, outerDark)));
        } else {
          const shadowT = Utils.clamp((-lightDot) * 0.85, 0, 1);
          const shadowCol = mix3(PRIMER, SCORCH, shadowT * (0.65 + 0.35 * (1 - n2)));
          putPx(x, y, clampSteelColor(shadowCol, jitter * 0.7), Math.round(Utils.lerp(236, 214, outerDark)));
        }
      } else if (d < 1.17) {
        // Scorched primer collar tapering smoothly in opacity into the soot halo
        const stepT = (d - 1.02) / 0.15;
        const stepLit = Utils.clamp(lightDot * 0.45 + 0.45, 0, 1) * (1 - stepT * 0.55);
        const stepCol = mix3(CHAR, mix3(SCORCH, PRIMER, stepLit), 0.38 + 0.48 * n2);
        const stepAlpha = Math.round(Utils.lerp(212, 142, Utils.smoothstep(0, 1, stepT)));
        putPx(x, y, clampSteelColor(stepCol, jitter * 0.6), stepAlpha);
      } else {
        // Translucent outer powder-soot & shock halo with radial blast striations
        const jet = 0.65 + 0.35 * Math.sin(theta * 7 + wobble * 1.3);
        const fade = (1 - Utils.smoothstep(1.14, halo, d)) * (0.55 + 0.45 * n1 * jet);
        const rawAlpha = Math.round(240 * fade);
        if (rawAlpha >= 132) {
          const softAlpha = Math.round(Utils.clamp(32 + (rawAlpha - 132) * 1.05, 32, 140));
          const sootCol = mix3(CHAR, SCORCH, n2 * 0.55);
          putPx(x, y, clampSteelColor(sootCol, jitter * 0.4), softAlpha, false);
        }
      }
    }
}

/** A high-resolution radial fracture in steel with tapered sub-pixel crevice, side branches, and a specular catch-lip. */
function crack(c, rnd, x, y, angle, length, light = true, branches = 1) {
  let a = angle;
  const steps = Math.max(2, Math.ceil(length * 2.4));
  const stepLen = length / steps;
  const sub = c.scale || 1;
  const rCore = 0.28 / sub;
  const rEdge = 0.24 / sub;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const x0 = x;
    const y0 = y;
    a += (rnd() - 0.5) * 0.42;
    x += Math.cos(a) * stepLen;
    y += Math.sin(a) * stepLen;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const halfW = 0.55 * (1 - t * 0.65);
    const side = nx + ny > 0 ? 1 : -1;
    const lipCol = t < 0.45 ? CHIP : RIM;
    for (let s = 1; s <= sub; s++) {
      const u = s / sub;
      const sx = Utils.lerp(x0, x, u);
      const sy = Utils.lerp(y0, y, u);
      if (sub === 1)
        c.put(sx, sy, CRACK, 236);
      else
        c.disc(sx, sy, rCore * (1.15 - t * 0.45), CRACK, 236);
      if (halfW > 0.32) {
        if (sub === 1) {
          c.put(sx + nx * 0.45, sy + ny * 0.45, SCORCH, 215, false);
          c.put(sx - nx * 0.45, sy - ny * 0.45, SCORCH, 215, false);
        } else {
          c.disc(sx + nx * 0.32, sy + ny * 0.32, rEdge, SCORCH, 215, false);
          c.disc(sx - nx * 0.32, sy - ny * 0.32, rEdge, SCORCH, 215, false);
        }
      }
      if (light && i % 2 === 0 && t < 0.85) {
        if (sub === 1)
          c.put(sx + nx * side * 1.05, sy + ny * side * 1.05, lipCol, 228, false);
        else
          c.disc(sx + nx * side * 0.68, sy + ny * side * 0.68, rEdge, lipCol, 228, false);
      }
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
  const sc = c.scale || 1;
  const step = 1 / sc;
  for (let y = yMin; y <= yMax; y += step)
    for (let x = xMin; x <= xMax; x += step) {
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
      const alpha = Math.round(Utils.clamp(34 + (strength - 0.34) * 185, 34, 152));
      const col = mix3(CHAR, mix3(SCORCH, SHADE, grain * 0.65), Utils.smoothstep(0, 0.85, t));
      const px = sc === 1 ? Math.round(x) : Math.round((x + 0.5) * sc - 0.5);
      const py = sc === 1 ? Math.round(y) : Math.round((y + 0.5) * sc - 0.5);
      c.putRaw(px, py, clampSteelColor(col, (hash2(px, py, seed) - 0.5) * 6), alpha, false);
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
    c.put(x, y, big ? BARE : CHIP, 234, false);
    c.put(x + 0.8, y + 0.8, SCORCH, 215, false);
    if (big)
      c.put(x - 0.6, y + 0.4, RIM, 228, false);
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
          c.put(px, py, clampSteelColor(col, (hash2(px | 0, py | 0, seed + k) - 0.5) * 8), 236);
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
        236
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
        c.put(px, py, isEdge ? (o < 0 ? CHIP : SHADE) : (t < 0.5 ? CRACK : SCORCH), Math.round(236 * (1 - t * 0.35)));
      }
    }
    // Piled-up displaced steel wave at the exit end of the ricochet trough
    for (let a = -1.0; a <= 1.0; a += 0.12) {
      const rProw = 9.8 * scale;
      const px = mid2 + Math.cos(turn + a * 0.55) * rProw;
      const py = mid2 + Math.sin(turn + a * 0.55) * rProw;
      c.put(px, py, SPECULAR_STEEL, 236);
      c.put(px + dx * 0.9, py + dy * 0.9, BARE, 232);
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
      c.put(bx, by, SPECULAR_STEEL, 236);
      c.put(bx + ca * 0.8, by + sa * 0.8, CRACK, 236);
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
  const sc = c.scale || 1;
  const yStep = 1 / sc;
  const xStep = sc === 1 ? 0.5 : 1 / sc;
  const putSlash = (lx, ly, col, alpha, over = true) => {
    if (sc === 1) {
      c.put(lx, ly, col, alpha, over);
      return;
    }
    const px = Math.round((lx + 0.5) * sc - 0.5);
    const py = Math.round((ly + 0.5) * sc - 0.5);
    c.putRaw(px, py, col, alpha, over);
  };

  for (let y = y0; y <= y1; y += yStep) {
    const t = (y - y0) / (y1 - y0);
    const env = Math.sin(t * Trigo.pi);
    const warp = (fbm(variant * 7.3, y * 0.28, seed) - 0.5) * 0.9;
    const cx = mid2 + (y - mid2) * tilt + Math.sin(t * Trigo.pi) * curve + warp;
    const toothPhase = Math.sin(y * 1.15 + variant * 1.7);
    const tooth = toothPhase > 0.38;
    const halfW = (1.15 + 1.85 * env) + (tooth ? 0.85 * env : 0);
    const scorchW = halfW + 2.2 * env + 0.8;

    for (let dx = -Math.ceil(scorchW + 1); dx <= Math.ceil(scorchW + 1); dx += xStep) {
      const px = cx + dx;
      const adx = Math.abs(dx);
      const grain = fbm(px * 0.45, y * 0.45, seed + 5);
      const jitter = (hash2(px * sc, y * sc, seed) - 0.5) * 9;

      if (adx <= halfW) {
        // Inside the V-groove kerf (Subpass 1, alpha 244..255): pitch-black root, shadowed left wall, grazing-lit striated right wall
        const normX = dx / (halfW || 1);
        const kerfAlpha = Math.round(Utils.lerp(255, 244, Utils.smoothstep(0.6, 1.0, Math.abs(normX))));
        if (Math.abs(normX) < 0.44)
          putSlash(px, y, CHAR, 255);
        else if (normX < 0)
          putSlash(px, y, clampSteelColor(mix3(CHAR, SCORCH, (normX + 1) * 0.8), jitter * 0.5), kerfAlpha);
        else {
          const striation = 0.55 + 0.45 * Math.sin(y * 1.6 - dx * 1.2 + variant);
          const innerCol = mix3(CRACK, mix3(PRIMER, RIM, striation), normX * 0.85);
          putSlash(px, y, clampSteelColor(innerCol, jitter), kerfAlpha);
        }
      } else if (dx < 0 && adx <= halfW + 1.65) {
        // Raised left burr lip (Subpass 0, alpha <= 236): curled bare steel catching the upper-left light
        const lipT = 1 - (adx - halfW) / 1.65;
        const burrCol = tooth && lipT > 0.45 ? SPECULAR_STEEL : mix3(RIM, BARE, lipT * (0.65 + 0.35 * grain));
        putSlash(px, y, clampSteelColor(burrCol, jitter), Math.round(Utils.lerp(205, 236, lipT)));
      } else if (dx > 0 && adx <= halfW + 1.55) {
        // Right burr lip (Subpass 0, alpha <= 236): thin specular ridge followed by cast overhang shadow
        const lipT = (adx - halfW) / 1.55;
        const rightCol = lipT < 0.48 ? mix3(SHADE, CHIP, (1 - lipT) * (tooth ? 0.9 : 0.55)) : SCORCH;
        putSlash(px, y, clampSteelColor(rightCol, jitter * 0.7), Math.round(Utils.lerp(236, 205, lipT)));
      } else if (adx <= scorchW) {
        // Continuous FBM friction-burn and heat-tint halo along the cut
        const haloT = (adx - (halfW + 1.55)) / Math.max(0.6, scorchW - (halfW + 1.55));
        const rawAlpha = Math.round(235 * (1 - Utils.smoothstep(0, 1, haloT)) * (0.65 + 0.35 * grain));
        if (rawAlpha >= 136) {
          const softAlpha = Math.round(Utils.clamp(38 + (rawAlpha - 136) * 1.15, 38, 155));
          putSlash(px, y, clampSteelColor(mix3(CHAR, SCORCH, grain * 0.6), jitter * 0.4), softAlpha, false);
        }
      }
    }
  }

  // Secondary parallel chain-skip score line on variants 1 and 3
  if (variant === 1 || variant === 3) {
    const side = variant === 1 ? 5.6 : -5.6;
    const sy0 = y0 + 7;
    const sy1 = y1 - 6;
    for (let y = sy0; y <= sy1; y += yStep) {
      const env = Math.sin(((y - sy0) / (sy1 - sy0)) * Trigo.pi);
      const sx = mid2 + side + (y - mid2) * tilt + (fbm(y * 0.3, variant, seed + 19) - 0.5) * 0.7;
      c.put(sx, y, CRACK, 236);
      c.put(sx - 0.85, y, env > 0.35 ? CHIP : RIM, 224, false);
      c.put(sx + 0.85, y, SCORCH, 200, false);
    }
  }

  // Double-bite overlapping vertical chatter gouge on variant 3
  if (variant === 3)
    for (let y = y0 + 5; y <= y1 - 9; y += yStep) {
      const sx = mid2 + 2.8 - (y - mid2) * tilt * 0.65;
      c.put(sx, y, CHAR, 252);
      c.put(sx + 0.9, y, BARE, 234, false);
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
const BLAST_RADIUS = [12.2, 15.4, 18.6];
const BLAST_CORE = [0, 0.45, 0.55];
const SHARD_POINTS = 8;

const bandOf = (v) => Math.max(0, Math.min(255, v));

/**
 * A cell for the impact & blast art at resolution `ATLAS_CELL * scale` (`64` by default for headless unit tests,
 * `256` on the GPU in `World`), with sub-pixel anti-aliased disc splatting and edge colour bleeding so bilinear
 * filtering never pulls a dark fringe from transparent neighbour texels.
 */
class BlastCell {
  constructor(scale = 1) {
    this.scale = scale;
    this.size = ATLAS_CELL * scale;
    this.border = BORDER * scale;
    this.pixels = new Uint8Array(this.size * this.size * 4);
  }

  putRaw(px, py, color, alpha = 255, over = true) {
    if (px < this.border || py < this.border || px >= this.size - this.border || py >= this.size - this.border || alpha <= 0)
      return;
    const o = (py * this.size + px) * 4;
    const old = this.pixels[o + 3];
    if (!over && old)
      return;
    const a = bandOf(Math.round(alpha));
    const t = old ? a / 255 : 1;
    this.pixels[o] = bandOf(Utils.lerp(this.pixels[o], color[0], t));
    this.pixels[o + 1] = bandOf(Utils.lerp(this.pixels[o + 1], color[1], t));
    this.pixels[o + 2] = bandOf(Utils.lerp(this.pixels[o + 2], color[2], t));
    this.pixels[o + 3] = Math.max(old, a);
  }

  /** Sub-pixel anti-aliased disc at logical `(x, y)` with logical radius `r`. */
  disc(x, y, r, color, alpha = 255, over = true) {
    if (alpha <= 0)
      return;
    const s = this.scale;
    const cx = (x + 0.5) * s - 0.5;
    const cy = (y + 0.5) * s - 0.5;
    const pr = r * s;
    const reach = pr + 0.65;
    const x0 = Math.max(this.border, Math.floor(cx - reach));
    const x1 = Math.min(this.size - this.border - 1, Math.ceil(cx + reach));
    const y0 = Math.max(this.border, Math.floor(cy - reach));
    const y1 = Math.min(this.size - this.border - 1, Math.ceil(cy + reach));
    for (let py = y0; py <= y1; py++)
      for (let px = x0; px <= x1; px++) {
        const d = Math.hypot(px - cx, py - cy);
        if (d >= reach)
          continue;
        const cov = Utils.clamp(pr + 0.55 - d, 0, 1);
        this.putRaw(px, py, color, alpha * cov, over);
      }
  }

  put(x, y, color, alpha = 255, over = true) {
    if (this.scale === 1) {
      this.putRaw(Math.round(x), Math.round(y), color, alpha, over);
      return;
    }
    this.disc(x, y, 0.48, color, alpha, over);
  }

  line(x0, y0, x1, y1, color, alpha = 255) {
    const steps = Math.ceil(scratchPt.setScalar(x1 - x0, y1 - y0).getMagnitude() * 1.5 * this.scale) || 1;
    for (let i = 0; i <= steps; i++)
      this.put(Utils.lerp(x0, x1, i / steps), Utils.lerp(y0, y1, i / steps), color, alpha);
  }

  /** Spreads edge RGB into adjacent transparent texels (keeping alpha = 0) so `gl.LINEAR` never interpolates towards black. */
  bleed(passes = 3) {
    const n = this.size;
    const px = this.pixels;
    const filled = new Uint8Array(n * n);
    for (let i = 0; i < n * n; i++)
      if (px[i * 4 + 3] > 0)
        filled[i] = 1;
    for (let p = 0; p < passes; p++) {
      const next = [];
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const i = y * n + x;
          if (filled[i])
            continue;
          let r = 0;
          let g = 0;
          let b = 0;
          let c = 0;
          if (x > 0 && filled[i - 1]) { r += px[(i - 1) * 4]; g += px[(i - 1) * 4 + 1]; b += px[(i - 1) * 4 + 2]; c++; }
          if (x + 1 < n && filled[i + 1]) { r += px[(i + 1) * 4]; g += px[(i + 1) * 4 + 1]; b += px[(i + 1) * 4 + 2]; c++; }
          if (y > 0 && filled[i - n]) { r += px[(i - n) * 4]; g += px[(i - n) * 4 + 1]; b += px[(i - n) * 4 + 2]; c++; }
          if (y + 1 < n && filled[i + n]) { r += px[(i + n) * 4]; g += px[(i + n) * 4 + 1]; b += px[(i + n) * 4 + 2]; c++; }
          if (c > 0)
            next.push(i, Math.round(r / c), Math.round(g / c), Math.round(b / c));
        }
      for (let k = 0; k < next.length; k += 4) {
        const i = next[k];
        px[i * 4] = next[k + 1];
        px[i * 4 + 1] = next[k + 2];
        px[i * 4 + 2] = next[k + 3];
        filled[i] = 1;
      }
    }
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

/**
 * What shows through the breached armor skin: fractured ferro-concrete aggregate and sheared sub-plate on walls,
 * heavy spalled deck slab on floors, and recessed plenum backing and structural framing on ceilings.
 */
function substrate(surface, x, y, tone, noise, bumpLit = 0) {
  const med = fbm(x * 0.72, y * 0.72, 23);
  const fine = vnoise(x * 1.85, y * 1.85, 31) * 0.58 + vnoise(x * 4.2, y * 4.2, 83) * 0.42;
  // Pit cavities and protruding aggregate stones in the fractured substrate
  const pit = Utils.smoothstep(0.62, 0.22, med * 0.65 + fine * 0.35);
  const stone = Utils.smoothstep(0.58, 0.86, fine * 0.6 + med * 0.4);
  const lightK = Utils.clamp(0.78 + bumpLit * 0.52 - pit * 0.28 + stone * 0.16, 0.22, 1.45);

  if (surface === 0) {
    const plateMix = Utils.smoothstep(0.36, 0.62, noise + (tone - 0.5) * 0.25);
    const plate = mix3(SHADE, mix3(PRIMER, RIM, fine * 0.78), Utils.clamp(0.32 + tone * 0.42 + bumpLit * 0.28, 0, 1));
    const aggWarm = mix3(CONCRETE, BRICK_DARK, 0.22 + med * 0.28);
    const concreteSub = mix3(CONCRETE_DARK, mix3(aggWarm, RUBBLE_LIGHT, stone * 0.65), Utils.clamp(0.28 + tone * 0.38 + fine * 0.34, 0, 1));
    const baseCol = mix3(concreteSub, plate, plateMix);
    return mix3(shade3(baseCol, lightK), CHAR, pit * 0.45);
  }
  if (surface === 1) {
    const slabMix = Utils.smoothstep(0.5, 0.72, noise);
    const slab = mix3(
      mix3(CONCRETE_DARK, mix3(CONCRETE, RUBBLE_LIGHT, stone * 0.5), Utils.clamp(tone * 0.55 + fine * 0.45, 0, 1)),
      mix3(SHADE, PRIMER, fine * 0.8),
      slabMix,
    );
    return mix3(shade3(slab, lightK), CHAR, pit * 0.42);
  }
  const plenumMix = Utils.smoothstep(0.42, 0.64, noise);
  const plenum = mix3(
    mix3(shade3(JOIST, 0.58), JOIST, Utils.clamp(tone * 0.62 + fine * 0.38, 0, 1)),
    mix3(PRIMER, PANEL, Utils.clamp(tone * 0.52 + fine * 0.48, 0, 1)),
    plenumMix,
  );
  return mix3(shade3(plenum, lightK), CHAR, pit * 0.4);
}

/**
 * Paints a 3D cylindrical reinforcing bar or ruptured conduit inside the breached cavity (`reachFn`),
 * with a drop shadow on the cavity floor, ribbed cylindrical shading under the upper-left key light,
 * ambient occlusion where it tucks under the crater rim, and darkened heat-sheared tips.
 */
function drawRebar3D(c, x0, y0, x1, y1, isPipe, seed, reachFn) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = scratchPt.setScalar(dx, dy).getMagnitude();
  if (len < 1)
    return;
  const tx = dx / len;
  const ty = dy / len;
  const nx = -ty;
  const ny = tx;
  const halfW = isPipe ? 1.1 : 0.65;
  const bendAmp = isPipe ? 0.22 : 0.48;
  const bendSign = hash2(seed, 3, 19) < 0.5 ? -1 : 1;
  const sc = c.scale || 1;
  const sStep = 0.32 / sc;
  const oStep = 0.28 / sc;
  const rDot = 0.34 / sc;

  // Cast shadow onto the cavity behind the bar (clipped to inner opening)
  for (let s = 0; s <= len; s += sStep * 1.15) {
    const t = s / len;
    const bend = Math.sin(t * Trigo.pi) * bendAmp * bendSign;
    const bx = x0 + tx * s + nx * bend + 0.95;
    const by = y0 + ty * s + ny * bend + 0.95;
    if (reachFn(bx, by) > 0.83)
      continue;
    for (let o = -halfW; o <= halfW; o += oStep * 1.3) {
      const px = bx + nx * o;
      const py = by + ny * o;
      if (sc === 1)
        c.put(px, py, CHAR, 225);
      else
        c.disc(px, py, rDot, CHAR, 225);
    }
  }

  // 3D cylindrical body with spiral ribs, rim ambient occlusion, and scorched taper into the blast throat
  const nLight = -(nx * 0.68 + ny * 0.73);
  for (let s = 0; s <= len; s += sStep) {
    const t = s / len;
    const bend = Math.sin(t * Trigo.pi) * bendAmp * bendSign;
    const bx = x0 + tx * s + nx * bend;
    const by = y0 + ty * s + ny * bend;
    const dNorm = reachFn(bx, by);
    if (dNorm > 0.82)
      continue;
    // Darken both where the bar tucks under the overhanging crater lip and where its sheared end plunges into the dark throat
    const rimAo = (1 - 0.62 * Utils.smoothstep(0.58, 0.82, dNorm)) * (0.38 + 0.62 * Utils.smoothstep(0.18, 0.52, dNorm));
    const rib = 0.5 + 0.5 * Math.sin(s * 2.6 + seed);
    const tipTaper = !isPipe && s > len - 1.2 ? Utils.clamp((len - s) / 1.2, 0.45, 1) : 1;
    const wHere = halfW * tipTaper;
    for (let o = -wHere; o <= wHere; o += oStep) {
      const profile = o / (wHere || 1);
      const cylLit = Utils.clamp(profile * nLight * 0.82 + (1 - Math.abs(profile)) * 0.48, 0, 1);
      let col;
      if (isPipe) {
        const scorchK = (0.38 + 0.48 * Math.abs(t - 0.5) * 2) * rimAo;
        const basePipe = mix3(CHAR, shade3(PIPE, scorchK), 0.22 + 0.66 * cylLit);
        const specPipe = Utils.smoothstep(0.65, 0.96, cylLit) * 0.52 * rimAo;
        col = mix3(basePipe, CHIP, specPipe);
      } else {
        const rustCore = mix3(SHADE, REBAR, 0.34 + 0.42 * rib);
        const metalCore = shade3(mix3(rustCore, PRIMER, 0.34), rimAo);
        const darkMix = Utils.smoothstep(0, 0.34, cylLit);
        const specMix = Utils.smoothstep(0.64, 0.96, cylLit) * 0.58 * rimAo;
        const midBar = mix3(CHAR, shade3(metalCore, 0.78 + cylLit * 0.4), darkMix);
        col = mix3(midBar, RIM, specMix);
      }
      const px = bx + nx * o;
      const py = by + ny * o;
      if (sc === 1)
        c.put(px, py, col, 255);
      else
        c.disc(px, py, rDot, col, 255);
    }
  }
}

/**
 * One high-definition 3D blast cell painted natively at `c.size x c.size` (`256x256` on GPU, `64x64` in unit tests):
 * - True heightfield-gradient bump-mapped 3D surface normals across the spalled crater bowl, stepped Voronoi slabs, and torn collar
 * - Deep ambient-occluded blast throat (`core`) with rocky stepped ledges and grazing bore-wall illumination
 * - Internal 3D cylindrical rebar, conduits, and recessed joists tucked beneath the overhanging crater rim
 * - Jagged, craggy 3D spalled concrete/steel collar with natural upper-left key lighting and lower-right cast shadows
 * - Sub-pixel branching radial stress fractures and fine micro-spall burrs
 */
function drawBlast(c, surface, tier, base, rnd) {
  const seed = Math.floor(rnd() * 100000);
  const ox = rnd() * 40;
  const oy = rnd() * 40;
  const phase = rnd() * Trigo.twopi;
  const phase2 = rnd() * Trigo.twopi;
  const radius = BLAST_RADIUS[tier];
  const core = BLAST_CORE[tier];
  const soot = SOOT[tier];
  const skin = SKIN[surface];
  const sc = c.scale || 1;
  // Blend surface skin with steel/concrete palette for realistic sheared collars
  const rimBase = surface === 0 ? mix3(RIM, skin, 0.34) : surface === 2 ? mix3(PANEL, RIM, 0.42) : mix3(skin, RIM, 0.25);
  const rimBright = surface === 1 ? mix3(skin, SPECULAR_STEEL, 0.48) : mix3(CHIP, SPECULAR_STEEL, 0.52);

  const reachAt = (x, y) => {
    const dx = x - mid2;
    const dy = y - mid2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ux = dist ? dx / dist : 0;
    const uy = dist ? dy / dist : 0;
    const theta = Math.atan2(dy, dx);
    const warp = fbm(ux * 1.8 + ox, uy * 1.8 + oy, seed) - 0.5;
    const petal = 0.08 * Math.cos(theta * (5 + tier) + phase) + 0.05 * Math.sin(theta * (9 + tier * 2) - phase2);
    const fine = (vnoise(x * 0.45, y * 0.45, seed + 9) - 0.5) * 1.3;
    const rawReach = radius * (1 + warp * (0.44 + tier * 0.08) + petal) + fine;
    const maxReach = 20.6;
    const reach = rawReach > maxReach ? maxReach + Math.tanh((rawReach - maxReach) / 2.2) * 1.2 : rawReach;
    return dist / reach;
  };

  // Multi-octave rocky relief field used for finite-difference 3D bump normals
  const rockRelief = (x, y) =>
    fbm(x * 0.36, y * 0.36, seed + 5) * 0.55
    + fbm(x * 0.92, y * 0.92, seed + 19) * 0.3
    + vnoise(x * 2.6, y * 2.6, seed + 41) * 0.15;

  const shards = SHARD_POINTS + tier * 4 + base * 4;
  const sx = new Array(shards);
  const sy = new Array(shards);
  const snx = new Array(shards);
  const sny = new Array(shards);
  for (let i = 0; i < shards; i++) {
    const a = (i / shards) * Trigo.twopi + (rnd() - 0.5) * 0.55;
    const r = (0.2 + 0.85 * Math.sqrt(rnd())) * radius * 1.08;
    sx[i] = mid2 + Math.cos(a) * r;
    sy[i] = mid2 + Math.sin(a) * r;
    const tiltA = hash2(i, seed, 11) * Trigo.twopi;
    const tiltM = 0.35 + 0.65 * hash2(i, seed, 23);
    snx[i] = Math.cos(tiltA) * tiltM;
    sny[i] = Math.sin(tiltA) * tiltM;
  }

  // Pass 1: Paint the inner blast cavity and Voronoi spall substrate (`d < 0.92`) at full `c.size x c.size` resolution
  const maxR1 = radius * 1.38;
  const eps = 0.45 / sc;
  for (let py = c.border; py < c.size - c.border; py++) {
    const y = (py + 0.5) / sc - 0.5;
    const dy = y - mid2;
    if (Math.abs(dy) > maxR1)
      continue;
    for (let px = c.border; px < c.size - c.border; px++) {
      const x = (px + 0.5) / sc - 0.5;
      const dx = x - mid2;
      if (Math.abs(dx) > maxR1)
        continue;
      const d = reachAt(x, y);
      if (d >= 0.86)
        continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ux = dist ? dx / dist : 0;
      const uy = dist ? dy / dist : 0;
      const theta = Math.atan2(dy, dx);

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
      const grain = rockRelief(x, y);
      // 3D bump gradient from rocky relief field
      const dGx = (rockRelief(x + eps, y) - rockRelief(x - eps, y)) / (2 * eps);
      const dGy = (rockRelief(x, y + eps) - rockRelief(x, y - eps)) / (2 * eps);
      const bumpDot = -(dGx * 0.68 + dGy * 0.73) * 1.35;

      const jitter = (hash2(px, py, seed) - 0.5) * 3.5;
      const lightDot = -(ux * 0.68 + uy * 0.73);
      const facetDot = -(snx[id] * 0.68 + sny[id] * 0.73);

      // Stepped Voronoi crater slope with bump-mapped relief lighting
      const ring = core > 0 ? Utils.clamp((d - core) / (0.90 - core), 0, 1) : d / 0.90;
      const coreUndercut = core > 0
        ? (1 - Utils.smoothstep(0, 0.24, ring)) * Utils.clamp(lightDot + 0.15, 0, 1)
        : 0;
      const bowlLit = -lightDot * 0.44 * (0.35 + 0.65 * ring) + facetDot * 0.3 + bumpDot * 0.45;
      const ao = 0.46 + 0.54 * Utils.smoothstep(0, 1, ring);
      const sub = substrate(surface, x, y, tone, grain, bowlLit);

      let bowlCol;
      if (tier === 0) {
        const centerPit = 1 - Utils.smoothstep(0, 0.5, d);
        const upperShadow = Utils.smoothstep(0.5, 0.86, d) * Utils.clamp(lightDot, 0, 1) * 0.52;
        const lowerSheen = Utils.smoothstep(0.4, 0.85, d) * Utils.clamp(-lightDot + bumpDot * 0.35, 0, 1) * 0.42;
        const plateMix = Utils.smoothstep(0.45, 0.66, grain + (1 - d) * 0.25);
        const surfacePlate = shade3(rimBase, 0.54 + tone * 0.18 + bowlLit * 0.32);
        bowlCol = mix3(surfacePlate, shade3(sub, 0.76 + bowlLit * 0.28), plateMix);
        bowlCol = mix3(bowlCol, rimBright, lowerSheen);
        bowlCol = mix3(bowlCol, SCORCH, Utils.clamp(centerPit * 0.74 + upperShadow, 0, 0.88));
        const fissure = (1 - Utils.smoothstep(0.16, 0.65, seam)) * (1 - Utils.smoothstep(0.68, 0.84, d));
        const bevelDark = (1 - Utils.smoothstep(0.42, 1.3, seam)) * (1 - fissure);
        const bevelLip = Utils.smoothstep(0.45, 0.95, seam) * (1 - Utils.smoothstep(0.95, 2.0, seam)) * Utils.clamp(bowlLit * 1.6, 0, 1);
        bowlCol = mix3(bowlCol, rimBright, bevelLip * 0.26);
        bowlCol = shade3(bowlCol, 1 - bevelDark * 0.28);
        bowlCol = mix3(bowlCol, CRACK, fissure * 0.78);
      } else {
        bowlCol = shade3(sub, ao + bowlLit * 0.22);
        if (coreUndercut > 0)
          bowlCol = mix3(bowlCol, CHAR, coreUndercut * 0.84);
        if (core > 0) {
          const innerLip = (1 - Utils.smoothstep(0, 0.22, ring)) * Utils.clamp(-lightDot + bumpDot * 0.3, 0, 1);
          bowlCol = mix3(bowlCol, rimBright, innerLip * 0.34);
        }
        const fissure = 1 - Utils.smoothstep(0.2, 0.74, seam);
        const bevelDark = (1 - Utils.smoothstep(0.5, 1.45, seam)) * (1 - fissure);
        const lipFactor = Utils.clamp(Math.max(bowlLit * 1.4, lightDot * 0.95), 0, 1);
        const bevelLip = Utils.smoothstep(0.48, 0.98, seam) * (1 - Utils.smoothstep(0.98, 2.2, seam)) * lipFactor;
        bowlCol = mix3(bowlCol, rimBright, bevelLip * 0.28);
        bowlCol = shade3(bowlCol, 1 - bevelDark * 0.44);
        bowlCol = mix3(bowlCol, CRACK, fissure);
      }

      let color = bowlCol;
      if (core > 0) {
        // Organic, craggy blast throat boundary modulated by Voronoi shard tone and rocky grain
        const coreEdge = core + (grain - 0.5) * 0.08 + (tone - 0.5) * 0.05;
        if (d < coreEdge + 0.06) {
          const inner = Utils.clamp(d / Math.max(0.1, coreEdge), 0, 1);
          const wallGrazing = Utils.smoothstep(0.38, 0.98, inner) * Utils.clamp(-lightDot + 0.18 + bumpDot * 0.25, 0, 1);
          const striation = 0.65 + 0.35 * Math.sin(theta * 12 + phase * 1.7);
          const deepSub = substrate(surface, x, y, tone, grain, facetDot * 0.35 + bumpDot * 0.3);
          const deepWall = mix3(CHAR, shade3(deepSub, (0.28 + 0.16 * striation) * (tier === 2 ? 0.82 : 1)), wallGrazing);
          let coreCol = mix3(CHAR, deepWall, inner * inner * (0.22 + 0.78 * wallGrazing));
          const coreSeam = (1 - Utils.smoothstep(0.3, 1.05, seam)) * Utils.smoothstep(0.5, 0.88, inner);
          if (coreSeam > 0)
            coreCol = mix3(coreCol, wallGrazing > 0.42 ? shade3(coreCol, 1.3, 3) : CHAR, coreSeam);
          const coreBlend = Utils.smoothstep(coreEdge - 0.05, coreEdge + 0.06, d);
          color = mix3(coreCol, bowlCol, coreBlend);
        }
      }
      const cavAlpha = d < 0.78 ? 255 : Math.round(Utils.lerp(255, 236, Utils.smoothstep(0.78, 0.86, d)));
      c.putRaw(px, py, shade3(color, 1, jitter), cavAlpha);
    }
  }

  // Pass 2: Internal 3D structural rebar, conduits, and recessed ceiling joists (clipped inside the cavity)
  if (tier > 0) {
    if (surface === 2) {
      // Ceiling plenum: recessed structural joists deep in the cavity + 1 or 2 ruptured conduits
      const nJoists = tier === 1 ? 1 : 2;
      const jStep = 0.35 / sc;
      const jRad = 0.38 / sc;
      for (let j = 0; j < nJoists; j++) {
        const jx = mid2 + (j === 0 ? -radius * 0.32 : radius * 0.34);
        for (let jy = mid2 - radius * 0.78; jy <= mid2 + radius * 0.78; jy += jStep) {
          const dNorm = reachAt(jx, jy);
          if (dNorm > 0.80)
            continue;
          const rimAo = (1 - 0.65 * Utils.smoothstep(0.55, 0.80, dNorm)) * (tier === 2 ? 0.78 : 0.9);
          if (sc === 1) {
            c.put(jx + 1.2, jy, CHAR, 252);
            c.put(jx, jy, shade3(JOIST, 0.68 * rimAo), 255);
            c.put(jx - 0.8, jy, shade3(JOIST, 1.05 * rimAo), 250);
          } else {
            c.disc(jx + 1.1, jy, jRad * 1.2, CHAR, 252);
            c.disc(jx, jy, jRad * 1.1, shade3(JOIST, 0.68 * rimAo), 255);
            c.disc(jx - 0.75, jy, jRad, shade3(JOIST, 1.05 * rimAo), 250);
          }
        }
      }
      const nPipes = tier === 1 ? 1 : 2;
      for (let i = 0; i < nPipes; i++) {
        const yy = mid2 + (i === 0 ? -radius * 0.24 : radius * 0.28);
        if (tier === 2 && i === 0) {
          // Ruptured conduit with a blown-out gap across the central blast throat
          drawRebar3D(c, mid2 - radius * 0.8, yy, mid2 - radius * 0.22, yy + 0.6, true, seed + i * 31, reachAt);
          drawRebar3D(c, mid2 + radius * 0.8, yy + 0.8, mid2 + radius * 0.24, yy + 0.2, true, seed + i * 31 + 7, reachAt);
        } else {
          drawRebar3D(c, mid2 - radius * 0.78, yy, mid2 + radius * 0.78, yy + 1.0, true, seed + i * 31, reachAt);
        }
      }
    } else {
      const bars = tier === 1 ? 2 : 4;
      for (let i = 0; i < bars; i++) {
        const a = (i / bars) * Trigo.twopi + rnd() * 0.85;
        const from = radius * (0.28 + rnd() * 0.22);
        const to = radius * (0.82 + rnd() * 0.14);
        const x0 = mid2 + Math.cos(a) * to;
        const y0 = mid2 + Math.sin(a) * to;
        const x1 = mid2 + Math.cos(a + (rnd() - 0.5) * 0.35) * from;
        const y1 = mid2 + Math.sin(a + (rnd() - 0.5) * 0.35) * from;
        drawRebar3D(c, x0, y0, x1, y1, false, seed + i * 29, reachAt);
      }
    }
  }

  // Pass 3: 3D bump-mapped spalled crater collar, sheared armor/surface lip, and radial blast-jet halo (`d >= 0.80`)
  const petalFreq = 7 + tier * 2 + base;
  const maxR3 = radius * 1.95;
  for (let py = c.border; py < c.size - c.border; py++) {
    const y = (py + 0.5) / sc - 0.5;
    const dy = y - mid2;
    if (Math.abs(dy) > maxR3)
      continue;
    for (let px = c.border; px < c.size - c.border; px++) {
      const x = (px + 0.5) / sc - 0.5;
      const dx = x - mid2;
      if (Math.abs(dx) > maxR3)
        continue;
      const d = reachAt(x, y);
      if (d < 0.80 || d > 1.38)
        continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ux = dist ? dx / dist : 0;
      const uy = dist ? dy / dist : 0;
      const theta = Math.atan2(dy, dx);
      const warp = fbm(ux * 1.8 + ox, uy * 1.8 + oy, seed) - 0.5;
      const grain = rockRelief(x, y);
      const dGx = (rockRelief(x + eps, y) - rockRelief(x - eps, y)) / (2 * eps);
      const dGy = (rockRelief(x, y + eps) - rockRelief(x, y - eps)) / (2 * eps);
      const bumpDot = -(dGx * 0.68 + dGy * 0.73) * 1.4;
      const jitter = (hash2(px, py, seed) - 0.5) * 3.5;
      const lightDot = -(ux * 0.68 + uy * 0.73);
      const petalWave = Math.cos(theta * petalFreq - phase2 + warp * 1.6);
      const tearCrease = Utils.smoothstep(-0.66, -0.96, petalWave);

      // 3D ridge profile across the crater collar (`0.82 <= d <= 1.04`):
      // Inner slope (`d < ridgeCrest`) faces inward `(-ux, -uy)` catching sheared highlights; outer slope (`d > ridgeCrest`) darkens into scorch
      const ridgeCrest = 0.91 + (grain - 0.5) * 0.055 + petalWave * 0.025;
      const slopeSign = Utils.smoothstep(ridgeCrest - 0.08, ridgeCrest + 0.08, d) * 2 - 1;
      const slopeNormalDot = slopeSign * lightDot + bumpDot * 0.58;
      const crestPeak = Math.exp(-Math.pow((d - (ridgeCrest - 0.02)) / 0.055, 2));
      const tearFacet = 0.5 + 0.5 * petalWave;
      const outerDarken = Utils.smoothstep(ridgeCrest - 0.01, ridgeCrest + 0.11, d);

      // Blend from dark scorched primer/concrete in shadowed troughs to craggy facet highlights on the inner lip
      const litT = Utils.clamp(slopeNormalDot * 0.52 + 0.46 + crestPeak * (0.20 + 0.24 * Math.max(0, lightDot)), 0, 1) * (1 - outerDarken * 0.55);
      const shadowCol = mix3(CHAR, mix3(SCORCH, DUST_DARK, grain * 0.55), 0.32 + 0.42 * grain);
      const midRim = mix3(SCORCH, shade3(rimBase, 0.84), Utils.clamp(0.28 + 0.52 * grain + 0.18 * tearFacet, 0, 1));
      const hiSpec = Utils.smoothstep(0.62, 0.95, litT) * (0.42 + 0.58 * tearFacet) * crestPeak * (1 - tearCrease) * (1 - outerDarken);
      let lipCol = mix3(shadowCol, midRim, Utils.smoothstep(0.14, 0.72, litT));
      lipCol = mix3(lipCol, rimBright, hiSpec * 0.82);

      // Darken undercut overhang beneath the upper-left rim (`d < ridgeCrest` and `lightDot > 0`)
      const underAo = (1 - Utils.smoothstep(0.80, ridgeCrest, d)) * Utils.clamp(lightDot * 1.1 - bumpDot * 0.3, 0, 1);
      if (underAo > 0)
        lipCol = mix3(lipCol, CHAR, Utils.clamp(underAo * 0.85, 0, 0.88));

      // Radial tear fissures cutting across the collar petals so adjacent craters interlock without a solid ring
      const slotFactor = tearCrease * (1 - Utils.smoothstep(0.98, 1.14, d));
      if (slotFactor > 0)
        lipCol = mix3(lipCol, mix3(CHAR, CRACK, tearCrease * 0.7), slotFactor * 0.9);

      // Scorched outer collar slope (`0.96 <= d <= 1.14`): darkens into charred soot so overlapping rims never paint a light ring
      const stepLit = Utils.clamp(lightDot * 0.35 + bumpDot * 0.3 + 0.42, 0, 1);
      const stepCol = mix3(CHAR, mix3(soot, shade3(rimBase, 0.48), stepLit * 0.55), 0.35 + 0.5 * grain);

      // Outer radial shockwave & soot halo (`d >= 1.14`)
      const jet = 0.55 + 0.45 * Math.cos(theta * (11 + tier * 2) + phase * 1.3 + warp * 3.5);
      const haloCol = mix3(CHAR, soot, 0.35 + grain * 0.45);
      const tearNotch = tearCrease * 0.07;

      let color;
      let alpha = 236;

      if (d < 0.86) {
        // Feathered overhang blend over Pass 1 cavity and Pass 2 rebar ends (preserving Pass 1's 255->236 transition alpha)
        const t = Utils.smoothstep(0.80, 0.86, d);
        color = lipCol;
        alpha = Math.round(Utils.lerp(40, 236, t));
      } else if (d < 1.02) {
        const toStep = Utils.smoothstep(0.93, 1.02, d);
        color = mix3(lipCol, stepCol, toStep);
        alpha = Utils.lerp(236, 196, Utils.smoothstep(0.92 - tearNotch, 1.02, d));
      } else if (d < 1.16) {
        const toHalo = Utils.smoothstep(1.02, 1.16, d);
        color = mix3(stepCol, haloCol, toHalo);
        alpha = Utils.lerp(196, 132, toHalo) * (1 - tearCrease * 0.18 * toHalo);
      } else {
        color = haloCol;
        const haloReach = 1.16 + 0.14 * (0.48 + 0.52 * jet) * (0.65 + 0.35 * grain) - tearNotch;
        const fade = 1 - Utils.smoothstep(1.14, Math.max(1.16, haloReach), d);
        alpha = 132 * fade;
      }

      if (alpha < 6)
        continue;
      alpha *= Utils.smoothstep(BORDER, BORDER + 5, Math.min(x, y, ATLAS_CELL - 1 - x, ATLAS_CELL - 1 - y));
      c.putRaw(px, py, shade3(color, 1, jitter), alpha);
    }
  }

  // Sub-pixel tapered radial stress fractures fanning out from the torn rim
  const cracks = 4 + tier * 2 + base * 2;
  for (let i = 0; i < cracks; i++) {
    const a = (i / cracks) * Trigo.twopi + (rnd() - 0.5) * 0.45;
    const startR = radius * (0.86 + rnd() * 0.12);
    const px = mid2 + Math.cos(a) * startR;
    const py = mid2 + Math.sin(a) * startR;
    const length = radius * (0.34 + rnd() * 0.38);
    crack(c, rnd, px, py, a, length, true, tier > 0 ? 1 : 0);
  }

  if (tier === 0) {
    flecks(c, rnd, mid2, mid2, 8 + base * 3, radius * 0.8, radius * 1.28);
    return;
  }

  // Fine anti-aliased 3D spall chips and metallic burrs integrated along the torn collar (Subpass 0, alpha <= 236)
  const pieces = 12 + tier * 10 + base * 6;
  const rChip = 0.28 / sc;
  for (let i = 0; i < pieces; i++) {
    const a = rnd() * Trigo.twopi;
    const r = radius * (0.88 + rnd() * 0.28);
    const px = mid2 + Math.cos(a) * r;
    const py = mid2 + Math.sin(a) * r;
    const size = 1 + Math.floor(rnd() * (1 + tier));
    const shardAng = a + (rnd() - 0.5) * 1.1;
    const ca = Math.cos(shardAng);
    const sa = Math.sin(shardAng);
    const litCol = i % 3 === 0 ? BARE : i % 2 ? RUBBLE_LIGHT : rimBright;
    const midCol = i % 2 ? rimBase : CONCRETE;
    for (let k = 0; k < size; k++) {
      const sx0 = px + ca * k * (0.55 / sc);
      const sy0 = py + sa * k * (0.55 / sc);
      if (sc === 1) {
        c.put(sx0 + 0.85, sy0 + 0.85, SCORCH, 224, false);
        c.put(sx0, sy0, midCol, 236, false);
        c.put(sx0 - 0.6, sy0 - 0.6, litCol, 232, false);
      } else {
        c.disc(sx0 + 0.45 / sc, sy0 + 0.45 / sc, rChip, SCORCH, 224, false);
        c.disc(sx0, sy0, rChip * 1.05, midCol, 236, false);
        c.disc(sx0 - 0.35 / sc, sy0 - 0.35 / sc, rChip * 0.9, litCol, 232, false);
      }
    }
  }

  if (surface === 0 && tier === 2) {
    // Thermal soot & smoke plume rising up the bulkhead wall from the top of the blown-out crater
    const w = 4 + base * 2;
    const yEnd = mid2 - radius * 0.85;
    const pStep = 1 / sc;
    const pRad = 0.55 / sc;
    for (let y = BORDER; y < yEnd; y += pStep) {
      const vT = (y - BORDER) / Math.max(1, yEnd - BORDER);
      const sway = (vnoise(y * 0.25, seed, 4) - 0.5) * 5.5;
      for (let x = -w; x <= w; x += pStep) {
        const hT = 1 - Math.abs(x) / (w + 1);
        const plumeNoise = fbm((mid2 + x) * 0.32, y * 0.28, seed + 77);
        const strength = hT * Utils.smoothstep(0, 0.85, vT) * (0.68 + 0.32 * plumeNoise);
        const alpha = Math.round(215 * strength);
        if (alpha > 0) {
          const plumeCol = mix3(SOOT[2], SHADE, plumeNoise * 0.45);
          if (sc === 1)
            c.put(mid2 + x + sway, y, plumeCol, alpha, false);
          else
            c.disc(mid2 + x + sway, y, pRad, plumeCol, alpha, false);
        }
      }
    }
  }
}

const BURN_REACH = [0.5, 0.68, 0.86];
const BURN_ALPHA = [220, 240, 255];

/**
 * The scorched blast-wave backdrop under an explosion: radial supersonic soot striations, heat-oxidized dark gunmetal
 * rings, and carbonized core, with tongues climbing upward on walls (`flat` false) or radiating as a jagged starburst
 * on floors and ceilings. All non-transparent texels stay strictly dark (`r < 120`).
 */
function drawBurn(c, flat, tier, rnd) {
  const seed = Math.floor(rnd() * 100000);
  const ox = rnd() * 40;
  const oy = rnd() * 40;
  const reach = (ATLAS_CELL / 2 - BORDER - 2) * BURN_REACH[tier];
  const tongues = 7 + tier * 2;
  const fineRays = 18 + tier * 4;
  const phase = rnd() * Trigo.twopi;
  const phase2 = rnd() * Trigo.twopi;
  const sc = c.scale || 1;
  for (let py = c.border; py < c.size - c.border; py++) {
    const y = (py + 0.5) / sc - 0.5;
    for (let px = c.border; px < c.size - c.border; px++) {
      const x = (px + 0.5) / sc - 0.5;
      const dx = x - mid2;
      const dy = y - mid2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const a = Math.atan2(dy, dx);
      const warp = fbm(x * 0.14 + ox, y * 0.14 + oy, seed) - 0.5;
      const fine = fbm(x * 0.38, y * 0.38, seed + 3);
      const micro = vnoise(x * 1.15, y * 1.15, seed + 11) * 0.62 + vnoise(x * 3.4, y * 3.4, seed + 29) * 0.38;
      const primaryLobe = 1 + 0.32 * Math.cos(a * tongues + phase + warp * 1.8) * (0.45 + tier * 0.2);
      const jetStreaks = 1 + 0.22 * Math.cos(a * fineRays - phase2 + warp * 4.2) * (0.55 + 0.45 * fine);
      let r = reach * (1 + warp * 0.82) * primaryLobe * jetStreaks;
      // Flames and thermal soot climb higher up vertical walls than down
      if (!flat)
        r *= dy < 0 ? 1.25 : 0.8;
      const d = dist / r;
      if (d >= 1)
        continue;

      // Continuous radial alpha feathering so overlapping scorch starbursts accumulate smoothly without hard edges
      const fade = (1 - Utils.smoothstep(0.34, 0.99, d)) * (0.82 + 0.18 * fine);
      const borderFade = Utils.smoothstep(BORDER, BORDER + 5, Math.min(x, y, ATLAS_CELL - 1 - x, ATLAS_CELL - 1 - y));
      const alpha = BURN_ALPHA[tier] * 0.88 * fade * borderFade;
      if (alpha < 1)
        continue;

      // Multi-zone thermal discoloration: carbonized CHAR center -> scorched dark gunmetal -> dark soot-streaked outer rim
      const heatCore = 1 - Utils.smoothstep(0, 0.56, d);
      const shockRing = Math.exp(-Math.pow((d - 0.58) / 0.16, 2)) * (0.5 + 0.5 * fine);
      const ux = dist ? dx / dist : 0;
      const uy = dist ? dy / dist : 0;
      const lightDot = -(ux * 0.68 + uy * 0.73);
      const ridgeLit = Utils.clamp(lightDot * 0.35 + 0.5, 0, 1) * (0.45 + 0.55 * micro);
      const grainMod = 0.55 * fine + 0.45 * micro;

      // Keep all channels well below 120 (`r < 120` invariant) while providing rich HD scorched contrast on steel bulkheads
      const outerSoot = [
        15 + 18 * grainMod + 10 * ridgeLit,
        19 + 20 * grainMod + 12 * ridgeLit,
        26 + 24 * grainMod + 14 * ridgeLit,
      ];
      const temperRing = [
        36 + 24 * ridgeLit + 14 * grainMod,
        32 + 20 * ridgeLit + 12 * grainMod,
        42 + 28 * ridgeLit + 16 * grainMod,
      ];
      const ringBlended = mix3(outerSoot, temperRing, shockRing * 0.74);
      const color = mix3(ringBlended, CHAR, heatCore);
      const jitter = (hash2(px, py, seed) - 0.5) * 4;
      c.putRaw(
        px,
        py,
        [
          Math.min(108, Math.max(0, color[0] + jitter)),
          Math.min(112, Math.max(0, color[1] + jitter)),
          Math.min(120, Math.max(0, color[2] + jitter)),
        ],
        alpha,
      );
    }
  }
}

/** The atlas as RGBA pixels, ready to be a texture. `scale = 4` renders native 256x256 HD cells; `scale = 1` renders 64x64 for fast unit tests. */
export function impactAtlas(scale = 1) {
  const s = Math.max(1, scale | 0);
  const cellPx = ATLAS_CELL * s;
  const width = cellPx * IMPACT_CELL_COUNT;
  const data = new Uint8Array(width * cellPx * 4);
  const blastEnd = IMPACT_CELLS.brokenCeiling + BLAST_SPAN;
  for (let cell = 0; cell < IMPACT_CELL_COUNT; cell++) {
    const b = new BlastCell(s);
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
    b.bleed(3);
    for (let y = 0; y < cellPx; y++)
      data.set(b.pixels.subarray(y * cellPx * 4, (y + 1) * cellPx * 4), (y * width + cell * cellPx) * 4);
  }
  return { name: 'impacts', data, width, height: cellPx, cell: cellPx, frames: IMPACT_CELL_COUNT };
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
