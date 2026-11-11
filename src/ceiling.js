import { AmbientLight, MAX_LIGHTS, PointLight, Vec2, Vec3 } from '@1pizzateam/roostr';
import { Trigo, Utils } from '@1pizzateam/spock';
import { mulberry32 } from './rng.js';
import { GLOW, LIGHT, METAL, mix, periodicField, plate, rivet, SHADOW, Tile, TILE_PIXELS } from './floor.js';
import { CEILING, DOOR, FLOOR, PILLAR, TILE } from './level.js';
import { SOLID_TEXTURED_FRAGMENT } from './quads.js';
import { WEAPONS } from './weapon.js';
import ceilingConeShader from './shaders/ceiling-cone.shadergun.json' with { type: 'json' };
import marsSkyShader from './shaders/mars-sky.shadergun.json' with { type: 'json' };

const scratchPt = new Vec2();
const scratchPixel = new Vec2();
const scratchDir = new Vec3();
const scratchNormal = new Vec3();

/**
 * The ceiling of an old space base: deep recessed coffer bays, heavy I-beam girders, X-braced space-frame trusses,
 * cylindrical HVAC ducts, exhaust turbine shafts, overhead coolant pipe manifolds, maintenance hatches, and recessed
 * fluorescent troffers, drawn as an 8-cell 512x64 pixel-art atlas. Unlike the floor and walls, the ceiling uses its own
 * shader without brown floor rust so it reads unmistakably as a dark overhead industrial superstructure.
 */

export const CEILING_CELLS = {
  panels: 0,
  ribs: 1,
  duct: 2,
  grille: 3,
  light: 4,
  truss: 5,
  pipes: 6,
  hatch: 7,
};
export const CEILING_CELL_COUNT = 8;
export const DOOR_CEILING_CELLS = {
  lintel: 0,
  hoist: 1,
  seal: 2,
  strobe: 3,
  red: 4,
  yellow: 5,
  blue: 6,
  vestibule: 7,
};
export const DOOR_CEILING_CELL_COUNT = 8;
const CEILING_LIGHT_COLOR = new Vec3(0.85, 0.96, 1.12);
export const CEILING_AMBIENT_COLOR = new Vec3(0.45, 0.5, 0.58);
export const CEILING_LIGHT_ATTENUATION = new Vec3(1, 0.0032, 0.000018);
const CEILING_LIGHT_RADIUS = TILE * 11;
export const MUZZLE_LIGHT_COLOR = new Vec3(3.6, 2.35, 0.95);
export const MUZZLE_LIGHT_ATTENUATION = new Vec3(1, 0.014, 0.0012);
export const ROCKET_LIGHT_COLOR = new Vec3(1.48, 0.86, 0.28);
export const FIREBALL_LIGHT_COLOR = new Vec3(1.38, 0.44, 0.22);
export const BOOM_LIGHT_COLOR = new Vec3(1.75, 0.96, 0.34);
export const TELEPORT_LIGHT_COLOR = new Vec3(0.36, 1.48, 1.05);
export const DYNAMIC_LIGHT_ATTENUATION = new Vec3(1, 0.0052, 0.000042);
const DYNAMIC_LIGHT_RADIUS = TILE * 9;
const MAX_DYNAMIC_LIGHTS = 4;

function compareDynamicLightSortKey(a, b) {
  return a.sortKey - b.sortKey;
}

function compareFixtureDistSq(a, b) {
  return a.distSq - b.distSq;
}

const SIZE = TILE_PIXELS;
const VOID = [5, 7, 13];
const COFFER = [11, 15, 25];
const GIRDER = [24, 32, 48];
const FLANGE = [54, 70, 98];
const WARM = [214, 232, 255];
const CYAN_LED = [68, 188, 245];
const SIGNAL_GREEN = [70, 230, 150];
const LOCK_RED = [220, 48, 56];
const LOCK_YELLOW = [235, 190, 44];
const LOCK_BLUE = [56, 136, 245];

/**
 * Heavy load-bearing perimeter I-beam girder framing a deep sunken 50x50 overhead coffer cavity.
 * Adjacent tiles meet flange-to-flange to form continuous overhead box beams with recessed bays between them.
 */
function cofferBase(t, rnd, cavityColor = COFFER) {
  const s = t.scale;
  // Outer structural girder frame (0..63) with machined flange bevels and web groove
  plate(t, 0, 0, 64, 64, rnd, GIRDER);
  for (let i = 0; i < t.width; i++) {
    t.setRaw(i, 0, VOID, 0.94);
    t.setRaw(0, i, VOID, 0.94);
    t.setRaw(i, t.height - 1, VOID, 0.94);
    t.setRaw(t.width - 1, i, VOID, 0.94);
    for (let k = 0; k < s; k++) {
      const fAmt = (1 - k / s) * 0.62;
      t.setRaw(i, 2 * s + k, FLANGE, fAmt);
      t.setRaw(2 * s + k, i, FLANGE, fAmt);
      t.setRaw(i, 61 * s + k, SHADOW, 0.45 + (k / s) * 0.45);
      t.setRaw(61 * s + k, i, SHADOW, 0.45 + (k / s) * 0.45);
    }
  }

  // Deep stepped coffer recess (6..57) with smooth multi-pixel 45° chamfer lip and corner ambient occlusion
  t.rect(6, 6, 52, 52, VOID, 0.96);
  const c0 = 8 * s;
  const c1 = 56 * s;
  for (let y = 8; y < 56; y++)
    for (let x = 8; x < 56; x++) {
      const grain = (rnd() - 0.5) * 4;
      for (let dy = 0; dy < s; dy++)
        for (let dx = 0; dx < s; dx++) {
          const px = x * s + dx;
          const py = y * s + dy;
          const dEdge = Math.min(px - c0, py - c0, c1 - 1 - px, c1 - 1 - py);
          const ao = dEdge < 10 ? (1 - dEdge / 10) * 0.45 : 0;
          const micro = (((px * 13 ^ py * 7) & 3) - 1.5) * 0.6;
          const col = mix(
            [cavityColor[0] + grain + micro, cavityColor[1] + grain + micro, cavityColor[2] + (grain + micro) * 1.2],
            VOID,
            ao
          );
          t.setRaw(px, py, col, 1);
        }
    }
  // High-resolution stepped inner bevel of the sunken coffer lip (6*s .. 8*s and 56*s .. 58*s)
  for (let i = 6 * s; i < 58 * s; i++) {
    for (let k = 0; k < 2 * s; k++) {
      const topAmt = 1 - k / (2 * s) * 0.35;
      t.setRaw(i, 6 * s + k, VOID, topAmt);
      t.setRaw(6 * s + k, i, VOID, topAmt);
      const botAmt = 0.22 + (k / (2 * s)) * 0.42;
      t.setRaw(i, 56 * s + k, k < s ? FLANGE : VOID, k < s ? botAmt : 0.85);
      t.setRaw(56 * s + k, i, k < s ? FLANGE : VOID, k < s ? botAmt : 0.85);
    }
  }

  // Corner gusset plates with 45° beveled inner edge and structural bolts on the perimeter girder
  for (const [gx, gy] of [[2, 2], [54, 2], [2, 54], [54, 54]]) {
    const px0 = gx * s;
    const py0 = gy * s;
    const gw = 8 * s;
    for (let dy = 0; dy < gw; dy++)
      for (let dx = 0; dx < gw; dx++) {
        const border = dx === 0 || dy === 0 || dx === gw - 1 || dy === gw - 1;
        const hi = dx === 1 || dy === 1;
        t.setRaw(
          px0 + dx,
          py0 + dy,
          border ? VOID : hi ? FLANGE : mix(GIRDER, FLANGE, 0.28),
          border ? 0.85 : hi ? 0.62 : 0.9
        );
      }
    rivet(t, gx + 2, gy + 2);
  }
}

/** Cell 0: Twin recessed coffered acoustic/cooling bays separated by a central I-beam rib. */
function drawPanels(t, rnd) {
  cofferBase(t, rnd, COFFER);
  const s = t.scale;
  // Central divider box-girder across y = 28..36 with 3D flange highlights and web recess
  for (let py = 28 * s; py < 36 * s; py++) {
    const ly = (py + 0.5) / s;
    for (let px = 6 * s; px < 58 * s; px++) {
      if (ly < 29 || ly >= 35)
        t.setRaw(px, py, VOID, 0.92);
      else if (ly < 30.2)
        t.setRaw(px, py, mix(GIRDER, FLANGE, 0.72), 0.95);
      else if (ly > 33.8)
        t.setRaw(px, py, mix(VOID, GIRDER, 0.35), 0.95);
      else
        t.setRaw(px, py, mix(GIRDER, FLANGE, 0.22), 0.95);
    }
  }
  for (const x of [12, 22, 31, 40, 50])
    rivet(t, x, 31);

  // Fine high-resolution acoustic micro-louver slats inside both upper and lower coffer bays
  for (const [y0, y1] of [[10, 26], [38, 54]]) {
    t.rect(10, y0, 44, y1 - y0, VOID, 0.82);
    const pitch = 2 * s;
    for (let py = (y0 + 1) * s; py < (y1 - 1) * s; py++) {
      const phase = (py - (y0 + 1) * s) % pitch;
      const tSlat = phase / pitch;
      for (let px = 11 * s; px < 53 * s; px++) {
        // Subtle vertical rib sub-divisions every 8 logical units
        if ((px % (8 * s)) < 2) {
          t.setRaw(px, py, mix(VOID, GIRDER, 0.65), 0.9);
          continue;
        }
        if (tSlat < 0.35)
          t.setRaw(px, py, VOID, 0.96);
        else if (tSlat < 0.58)
          t.setRaw(px, py, mix(COFFER, FLANGE, 0.48), 0.9);
        else
          t.setRaw(px, py, mix(COFFER, GIRDER, 0.55), 0.9);
      }
    }
    // Central vertical stiffener strap down the middle of the slats
    for (let py = y0 * s; py < y1 * s; py++)
      for (let dx = 0; dx < 4 * s; dx++) {
        const px = 30 * s + dx;
        const col = dx < 2 ? VOID : dx < 5 ? mix(GIRDER, FLANGE, 0.55) : dx >= 4 * s - 2 ? VOID : GIRDER;
        t.setRaw(px, py, col, 0.94);
      }
  }
}

/** Cell 1: Heavy open-plenum structural rafters with deep shadow voids and lateral tie-rods. */
function drawRibs(t, rnd) {
  cofferBase(t, rnd, VOID);
  const s = t.scale;
  // Two 3D cylindrical horizontal tie-rods deep inside the plenum
  for (const ty of [18.5, 45.5]) {
    const rPx = 2.0 * s;
    const cy = ty * s;
    for (let dy = -Math.ceil(rPx); dy <= Math.ceil(rPx); dy++) {
      const norm = dy / rPx;
      const cyl = Math.sqrt(Math.max(0, 1 - norm * norm));
      const col = mix(VOID, mix(GIRDER, FLANGE, 0.55), 0.15 + cyl * 0.78);
      const py = Math.round(cy + dy);
      for (let px = 8 * s; px < 56 * s; px++) {
        const thread = (px & 3) === 0 ? 0.92 : 1.0;
        t.setRaw(px, py, [col[0] * thread, col[1] * thread, col[2] * thread], 0.95);
      }
    }
  }
  // Four heavy vertical I-beam rafters spanning the bay with 3D flange & web profile
  for (const x of [11, 24, 37, 50]) {
    const px0 = (x - 2) * s;
    const pw = 7 * s;
    for (let py = 4 * s; py < 60 * s; py++)
      for (let dx = 0; dx < pw; dx++) {
        const u = dx / (pw - 1);
        let col = GIRDER;
        if (u < 0.14 || u > 0.86)
          col = VOID;
        else if (u < 0.32)
          col = mix(GIRDER, FLANGE, 0.78);
        else if (u > 0.68)
          col = mix(VOID, GIRDER, 0.45);
        else
          col = mix(VOID, GIRDER, 0.82);
        t.setRaw(px0 + dx, py, col, 0.96);
      }
    // Bolted cross-flange brackets along each rafter
    for (const y of [10, 31, 51]) {
      for (let dy = 0; dy < 3 * s; dy++)
        for (let dx = 0; dx < pw; dx++) {
          const topHi = dy < 2;
          const botLo = dy >= 3 * s - 2;
          t.setRaw(px0 + dx, y * s + dy, topHi ? FLANGE : botLo ? VOID : mix(GIRDER, FLANGE, 0.52), 0.96);
        }
    }
  }
}

/** Cell 2: Overhead cylindrical HVAC ventilation trunk with bolted flange collars and side conduits. */
function drawDuct(t, rnd) {
  cofferBase(t, rnd, VOID);
  const s = t.scale;
  // Twin 3D cylindrical armored conduit pipes alongside the main trunk
  for (const yc of [11.5, 52.5]) {
    const rPx = 2.0 * s;
    for (let dy = -Math.ceil(rPx); dy <= Math.ceil(rPx); dy++) {
      const cyl = Math.sqrt(Math.max(0, 1 - (dy / rPx) ** 2));
      const col = mix(VOID, FLANGE, 0.18 + cyl * 0.72);
      const py = Math.round(yc * s + dy);
      for (let px = 6 * s; px < 58 * s; px++)
        t.setRaw(px, py, col, 0.96);
    }
  }
  // Main cylindrical overhead HVAC trunk (y = 17..47) with spiral lock-rib seams
  for (let py = 17 * s; py < 47 * s; py++) {
    const ly = (py + 0.5) / s - 0.5;
    const norm = (ly - 31.5) / 15;
    const cyl = Math.sqrt(Math.max(0, 1 - norm * norm));
    const spec = Math.pow(Math.max(0, -norm * 0.38 + cyl * 0.92), 2.6);
    const baseCol = mix(VOID, mix(GIRDER, FLANGE, 0.68), 0.16 + cyl * 0.72 + spec * 0.22);
    for (let px = 4 * s; px < 60 * s; px++) {
      const spiral = Math.abs(((px + py * 0.35) % (7 * s)) - 3.5 * s) < 1.3;
      const col = spiral ? mix(baseCol, FLANGE, 0.24 * cyl) : baseCol;
      t.setRaw(px, py, col, 0.98);
    }
  }
  // Crisp longitudinal lock-seam along the crown of the duct
  for (let px = 4 * s; px < 60 * s; px++) {
    t.setRaw(px, 31 * s - 1, VOID, 0.65);
    t.setRaw(px, 31 * s, FLANGE, 0.78);
    t.setRaw(px, 31 * s + 1, FLANGE, 0.55);
    t.setRaw(px, 31 * s + 2, VOID, 0.85);
  }
  // Heavy bolted flange collars strapping the duct to the ceiling frame
  for (const x of [12, 30, 48]) {
    const px0 = x * s;
    const pw = 4 * s;
    for (let py = 15 * s; py < 49 * s; py++) {
      const ly = (py + 0.5) / s - 0.5;
      const cyl = Math.sqrt(Math.max(0, 1 - ((ly - 31.5) / 17.5) ** 2));
      t.setRaw(px0 - 2, py, VOID, 0.88);
      t.setRaw(px0 - 1, py, VOID, 0.94);
      for (let dx = 0; dx < pw; dx++) {
        const edge = dx < 2 ? FLANGE : dx >= pw - 2 ? VOID : mix(GIRDER, FLANGE, 0.32 + cyl * 0.42);
        t.setRaw(px0 + dx, py, edge, 0.96);
      }
      t.setRaw(px0 + pw, py, VOID, 0.92);
    }
    rivet(t, x + 1, 18);
    rivet(t, x + 1, 43);
  }
}

/** Cell 3: Recessed octagonal exhaust fan turbine & armored louver grille. */
function drawGrille(t, rnd) {
  cofferBase(t, rnd, COFFER);
  const cx = 31.5;
  const cy = 31.5;
  const s = t.scale;
  // Deep circular/octagonal exhaust well with 8 curved 3D-shaded aerodynamic impeller blades
  for (let py = 10 * s; py < 54 * s; py++)
    for (let px = 10 * s; px < 54 * s; px++) {
      const x = (px + 0.5) / s - 0.5;
      const y = (py + 0.5) / s - 0.5;
      const dx = x - cx;
      const dy = y - cy;
      const r = scratchPt.setScalar(dx, dy).getMagnitude();
      if (r < 21.0) {
        if (r >= 18.2) {
          // Machined cylindrical turbine shroud ring with 3D radial bevel
          const ring = 1 - Math.abs(r - 19.6) / 1.4;
          const dirLight = Math.max(0.15, 0.55 - (dx + dy) / (r * 2.4));
          t.setRaw(px, py, mix(VOID, FLANGE, ring * 0.55 + dirLight * 0.35), 0.98);
        } else if (r < 5.4) {
          // 3D domed central turbine spinner cone
          const nz = Math.sqrt(Math.max(0, 1 - (r / 5.4) ** 2));
          const spec = Math.max(0, (-dx - dy) * 0.08 + nz * 0.78);
          t.setRaw(px, py, mix(VOID, FLANGE, 0.25 + spec * 0.68), 0.98);
        } else {
          const angle = Math.atan2(dy, dx) + r * 0.095;
          const phase = ((angle * 8) / Trigo.twopi + 10) % 1;
          if (phase < 0.62) {
            const pitch = 1 - phase / 0.62;
            const radialFade = Math.sin(((r - 5.4) / 12.8) * Trigo.pi);
            const col = mix(VOID, mix(COFFER, FLANGE, 0.68), (0.22 + pitch * 0.68) * (0.45 + 0.55 * radialFade));
            t.setRaw(px, py, col, 0.98);
          } else {
            t.setRaw(px, py, VOID, 0.98);
          }
        }
      }
    }
  // Crisp protective grating bars & central cross-beam across the turbine well
  for (let x = 14; x <= 50; x += 6) {
    const px0 = x * s;
    for (let py = 12 * s; py < 52 * s; py++) {
      const y = (py + 0.5) / s - 0.5;
      if (Math.hypot(x + 0.5 - cx, y - cy) > 19.8)
        continue;
      t.setRaw(px0 - 1, py, VOID, 0.8);
      for (let dx = 0; dx < s + 2; dx++) {
        const cyl = 1 - Math.abs(dx - s * 0.5) / (s * 0.75);
        t.setRaw(px0 + dx, py, mix(GIRDER, FLANGE, 0.28 + cyl * 0.52), 0.94);
      }
      t.setRaw(px0 + s + 2, py, VOID, 0.9);
    }
  }
  for (let py = 30 * s; py < 33 * s; py++)
    for (let px = 12 * s; px < 52 * s; px++) {
      const topHi = py < 30 * s + 2;
      const botLo = py >= 33 * s - 2;
      t.setRaw(px, py, topHi ? FLANGE : botLo ? VOID : GIRDER, 0.95);
    }
  rivet(t, 30, 30);
}

/** Cell 4: Recessed industrial fluorescent troffer with twin high-output tubes and louver baffles. */
function drawLight(t, rnd) {
  cofferBase(t, rnd, COFFER);
  const s = t.scale;
  // Outer recessed troffer housing (6..58, 15..49) with beveled steel frame
  t.rect(6, 15, 52, 34, VOID, 0.96);
  for (let px = 6 * s; px < 58 * s; px++) {
    for (let k = 0; k < s; k++) {
      t.setRaw(px, 16 * s + k, k < 2 ? VOID : FLANGE, k < 2 ? 0.95 : 0.65);
      t.setRaw(px, 47 * s + k, k < 2 ? FLANGE : VOID, k < 2 ? 0.65 : 0.95);
    }
  }
  // Polished parabolic reflector bed and twin bright high-output fluorescent tubes
  for (let py = 18 * s; py < 46 * s; py++) {
    const y = (py + 0.5) / s - 0.5;
    const dTube1 = Math.abs(y - 25.0);
    const dTube2 = Math.abs(y - 38.0);
    const dCenter = Math.abs(y - 31.5);
    const tube = Math.max(0, 1 - Math.min(dTube1, dTube2) / 5.4);
    const spine = Math.max(0, 1 - dCenter / 3.8) * 0.88;
    const glow = Math.max(tube, spine);
    const col = mix(GLOW, WARM, 0.45 + 0.53 * glow);
    const alpha = 0.72 + 0.28 * glow;
    for (let px = 8 * s; px < 56 * s; px++) {
      const lx = (px + 0.5) / s;
      // Dark tombstone lamp sockets at the left and right ends of the tubes
      if (lx < 10.2 || lx > 53.8) {
        t.setRaw(px, py, mix(GIRDER, FLANGE, 0.35), 0.94);
        continue;
      }
      t.setRaw(px, py, col, alpha);
    }
  }
  // Crisp thin aluminum parabolic cross-baffles dividing the troffer into bays
  for (const x of [19, 31, 43]) {
    const px0 = x * s + 1;
    for (let py = 18 * s; py < 46 * s; py++) {
      t.setRaw(px0 - 1, py, mix(GIRDER, GLOW, 0.35), 0.72);
      t.setRaw(px0, py, FLANGE, 0.85);
      t.setRaw(px0 + 1, py, GIRDER, 0.85);
      t.setRaw(px0 + 2, py, mix(VOID, GLOW, 0.25), 0.75);
    }
  }
}

/** Cell 5: Diagonal X-braced space-frame truss over a deep plenum cavity. */
function drawTruss(t, rnd) {
  cofferBase(t, rnd, VOID);
  const s = t.scale;
  // Background conduit bundle running across the dark plenum
  for (const yc of [29.5, 33.5]) {
    for (let dy = -s; dy <= s; dy++) {
      const cyl = 1 - Math.abs(dy) / (s + 1);
      const col = mix(VOID, mix(GIRDER, FLANGE, 0.45), cyl * 0.8);
      for (let px = 8 * s; px < 56 * s; px++)
        t.setRaw(px, Math.round(yc * s + dy), col, 0.92);
    }
  }
  // Smooth anti-aliased 45° I-beam diagonal X-brace struts with raised flanges and recessed web channel
  for (let py = 8 * s; py < 56 * s; py++)
    for (let px = 8 * s; px < 56 * s; px++) {
      const x = (px + 0.5) / s - 0.5;
      const y = (py + 0.5) / s - 0.5;
      const d1 = Math.abs(x - y);
      const d2 = Math.abs(x - (63 - y));
      const d = Math.min(d1, d2);
      if (d <= 3.5) {
        // I-beam profile: bright raised outer flanges (d in 1.7..3.0) and recessed web center (d < 1.7)
        const flange = d >= 1.65 && d <= 2.95 ? 0.78 : d < 0.75 ? 0.55 : 0.26;
        t.setRaw(px, py, mix(GIRDER, FLANGE, flange), 0.96);
      } else if (d <= 4.8) {
        t.setRaw(px, py, VOID, (1 - (d - 3.5) / 1.3) * 0.92);
      }
    }
  // Octagonal bolted central gusset plate where the X-struts cross (25..39, 25..39)
  const gx0 = 25 * s;
  const gx1 = 39 * s;
  for (let py = gx0; py < gx1; py++)
    for (let px = gx0; px < gx1; px++) {
      const dx = Math.abs(px - 32 * s + 0.5) / s;
      const dy = Math.abs(py - 32 * s + 0.5) / s;
      if (dx + dy > 9.8)
        continue;
      const edge = Math.max(dx, dy) > 6.2 || dx + dy > 9.0;
      const hi = (px < 27 * s || py < 27 * s) && !edge;
      t.setRaw(px, py, edge ? VOID : hi ? FLANGE : mix(GIRDER, FLANGE, 0.36), 0.96);
    }
  for (const [rx, ry] of [[28, 28], [34, 28], [28, 34], [34, 34]])
    rivet(t, rx, ry);
}

/** Cell 6: Overhead coolant pipe manifold with clamp brackets and cyan telemetry gauge. */
function drawPipes(t, rnd) {
  cofferBase(t, rnd, COFFER);
  const s = t.scale;
  t.rect(10, 10, 44, 44, VOID, 0.85);
  // Three parallel 3D cylindrical overhead pipes running along X with specular highlights and ring seams
  for (const [yc, rad] of [[17, 4], [31, 6], [46, 4]])
    for (let pdy = -rad * s - 2; pdy <= rad * s + 2; pdy++) {
      const dy = pdy / s;
      if (Math.abs(dy) > rad) {
        t.setRaw(0, 0, VOID, 0);
        for (let px = 6 * s; px < 58 * s; px++)
          t.setRaw(px, yc * s + pdy, VOID, 0.78);
        continue;
      }
      const norm = dy / rad;
      const cyl = Math.sqrt(Math.max(0, 1 - norm * norm));
      const spec = Math.pow(Math.max(0, -norm * 0.42 + cyl * 0.9), 2.8);
      const col = mix(VOID, FLANGE, Utils.clamp(0.18 + cyl * 0.65 + spec * 0.25, 0, 1));
      const py = yc * s + pdy;
      for (let px = 6 * s; px < 58 * s; px++) {
        const ring = (px % (6 * s)) === 0 ? 0.85 : 1.0;
        t.setRaw(px, py, [col[0] * ring, col[1] * ring, col[2] * ring], 0.97);
      }
    }
  // Vertical cross-over clamp rails at x = 16 and x = 46
  for (const x of [16, 46]) {
    const px0 = x * s;
    const pw = 4 * s;
    for (let py = 11 * s; py < 53 * s; py++)
      for (let dx = 0; dx < pw; dx++) {
        const col = dx < 2 ? FLANGE : dx >= pw - 2 ? VOID : mix(GIRDER, FLANGE, 0.48);
        t.setRaw(px0 + dx, py, col, 0.96);
      }
    rivet(t, x + 1, 12);
    rivet(t, x + 1, 49);
  }
  // Central manifold box (26..38, 22..40) with a circular high-resolution cyan telemetry gauge
  for (let py = 22 * s; py < 40 * s; py++)
    for (let px = 26 * s; px < 38 * s; px++) {
      const border = px < 26 * s + 2 || px >= 38 * s - 2 || py < 22 * s + 2 || py >= 40 * s - 2;
      const hi = px < 26 * s + 4 || py < 22 * s + 4;
      t.setRaw(px, py, border ? VOID : hi ? FLANGE : GIRDER, 0.96);
    }
  const gcx = 32 * s;
  const gcy = 31 * s;
  const gRad = 3.4 * s;
  for (let py = Math.floor(gcy - gRad - 2); py <= Math.ceil(gcy + gRad + 2); py++)
    for (let px = Math.floor(gcx - gRad - 2); px <= Math.ceil(gcx + gRad + 2); px++) {
      const dx = (px - gcx) / gRad;
      const dy = (py - gcy) / gRad;
      const r = Math.hypot(dx, dy);
      if (r <= 1.0) {
        const core = 1 - r * r;
        t.setRaw(px, py, mix(CYAN_LED, WARM, core * 0.55), 0.96);
      } else if (r <= 1.35) {
        t.setRaw(px, py, mix(VOID, CYAN_LED, (1 - (r - 1.0) / 0.35) * 0.45), 0.9);
      }
    }
}

/** Cell 7: Recessed octagonal overhead service hatch with dog-clamps and status beacon. */
function drawHatch(t, rnd) {
  cofferBase(t, rnd, COFFER);
  const s = t.scale;
  // Recessed octagonal service hatch well (11..53, 11..53) with 45° corner chamfers
  const h0 = 11 * s;
  const h1 = 53 * s;
  for (let py = h0; py < h1; py++)
    for (let px = h0; px < h1; px++) {
      const dx = Math.abs(px - 32 * s + 0.5) / s;
      const dy = Math.abs(py - 32 * s + 0.5) / s;
      const oct = Math.max(dx, dy, (dx + dy) * 0.76);
      if (oct > 21.0)
        continue;
      if (oct >= 19.0)
        t.setRaw(px, py, VOID, 0.94);
      else if (oct >= 18.0) {
        const isTopLeft = px + py < 64 * s;
        t.setRaw(px, py, isTopLeft ? FLANGE : VOID, isTopLeft ? 0.75 : 0.92);
      } else {
        t.setRaw(px, py, mix(COFFER, GIRDER, 0.68), 0.96);
      }
    }
  // Reinforcement cross-ribs and central lock boss
  for (let py = 30 * s; py < 34 * s; py++)
    for (let px = 15 * s; px < 49 * s; px++)
      t.setRaw(px, py, py < 30 * s + 2 ? FLANGE : py >= 34 * s - 2 ? VOID : GIRDER, 0.92);
  for (let py = 15 * s; py < 49 * s; py++)
    for (let px = 30 * s; px < 34 * s; px++)
      t.setRaw(px, py, px < 30 * s + 2 ? FLANGE : px >= 34 * s - 2 ? VOID : GIRDER, 0.92);
  for (let py = 26 * s; py < 38 * s; py++)
    for (let px = 26 * s; px < 38 * s; px++) {
      const edge = px === 26 * s || py === 26 * s ? FLANGE : px === 38 * s - 1 || py === 38 * s - 1 ? VOID : mix(GIRDER, FLANGE, 0.42);
      t.setRaw(px, py, edge, 0.96);
    }
  // Four heavy 3D dog-clamps on the hatch edges
  for (const [cx, cy, w, h] of [[29, 11, 6, 4], [29, 49, 6, 4], [11, 29, 4, 6], [49, 29, 4, 6]]) {
    for (let dy = 0; dy < h * s; dy++)
      for (let dx = 0; dx < w * s; dx++) {
        const hi = dx < 2 || dy < 2;
        const lo = dx >= w * s - 2 || dy >= h * s - 2;
        t.setRaw(cx * s + dx, cy * s + dy, hi ? WARM : lo ? VOID : FLANGE, hi ? 0.55 : 0.9);
      }
  }
  // Twin glowing cyan status LEDs with radial halos on the hatch lock
  for (const lx of [30, 34]) {
    const lcx = lx * s;
    const lcy = 32 * s;
    const lRad = 1.4 * s;
    for (let dy = -Math.ceil(lRad) - 2; dy <= Math.ceil(lRad) + 2; dy++)
      for (let dx = -Math.ceil(lRad) - 2; dx <= Math.ceil(lRad) + 2; dx++) {
        const r = Math.hypot(dx, dy) / lRad;
        if (r <= 1.0)
          t.setRaw(lcx + dx, lcy + dy, mix(CYAN_LED, WARM, (1 - r) * 0.5), 0.96);
        else if (r <= 1.7)
          t.setRaw(lcx + dx, lcy + dy, CYAN_LED, (1 - (r - 1.0) / 0.7) * 0.35);
      }
  }
}

const DRAW = [drawPanels, drawRibs, drawDuct, drawGrille, drawLight, drawTruss, drawPipes, drawHatch];

/** The atlas as RGBA pixels, ready to be a texture; its size is a power of two, so it can have mipmaps. */
export function ceilingAtlas() {
  const width = SIZE * 8;
  const data = new Uint8Array(width * SIZE * 4);
  DRAW.forEach((draw, cell) => {
    const t = new Tile(SIZE, SIZE, SIZE / 64);
    draw(t, mulberry32(4400 + cell * 7919));
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 3;
        const o = (y * width + cell * SIZE + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(t.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name: 'ceiling', data, width, height: SIZE, cell: SIZE, frames: 8 };
}

export function ceilingCellUv(cell) {
  const inset = 0.25 / (SIZE * 8);
  return [cell / 8 + inset, 0, (cell + 1) / 8 - inset, 1];
}

// ---- Doorway corridor (airlock soffit between twin blast-door slabs) ceiling atlas ---------------------------------

/**
 * Shared overhead doorway soffit frame: outer architrave header lips at x = 0..6 and x = 58..64 (`DOOR_INSET = 6`),
 * dual recessed upper blast-door seal/track channels at x = 6..14 and x = 50..58 (`DOOR_THICKNESS = 8`) where the two
 * slabs of `doubleDoorBox` meet the ceiling, side wall-header box girders at y = 0..6 and y = 58..64, and a sunken
 * central vestibule ceiling bay at x = 14..50, y = 6..58.
 */
function doorCeilingBase(t, rnd) {
  const s = t.scale;
  cofferBase(t, rnd, COFFER);

  // Outer doorway header architrave lips (x = 0..6 and x = 58..64)
  for (const [jx0, jx1] of [[0, 6], [58, 64]]) {
    for (let py = 2 * s; py < 62 * s; py++)
      for (let px = jx0 * s; px < jx1 * s; px++) {
        const edgeDist = Math.min(px - jx0 * s, jx1 * s - 1 - px);
        t.setRaw(px, py, edgeDist < 2 ? FLANGE : mix(GIRDER, FLANGE, 0.28), 0.9);
      }
    for (const ry of [10, 24, 39, 53])
      rivet(t, jx0 + 2, ry);
  }

  // Dual recessed overhead blast-door seal & guide channels (x = 6..14 and x = 50..58) aligned with `doubleDoorBox`
  for (const tx0 of [6, 50]) {
    const px0 = tx0 * s;
    const pw = 8 * s;
    const cx = px0 + pw * 0.5;
    for (let py = 2 * s; py < 62 * s; py++)
      for (let dx = 0; dx < pw; dx++) {
        const px = px0 + dx;
        const fromCenter = Math.abs(px + 0.5 - cx);
        const railEdge = dx < s || dx >= pw - s;
        const centerSlot = fromCenter < 1.2 * s;
        const roller = ((py >> 2) % 4) === 0 && !railEdge && !centerSlot;
        let col = VOID;
        if (railEdge)
          col = (dx === 0 || dx === pw - 1) ? VOID : FLANGE;
        else if (centerSlot)
          col = fromCenter < 0.5 * s ? VOID : mix(GIRDER, FLANGE, 0.52);
        else if (roller)
          col = mix(COFFER, GIRDER, 0.65);
        else
          col = mix(VOID, COFFER, 0.45);
        t.setRaw(px, py, col, 0.98);
      }
  }

  // Side wall-header box girders (y = 0..6 and y = 58..64) framing the central vestibule soffit
  for (const [yy0, yy1] of [[0, 6], [58, 64]])
    for (let py = yy0 * s; py < yy1 * s; py++)
      for (let px = 14 * s; px < 50 * s; px++) {
        const border = py === yy0 * s || py === yy1 * s - 1;
        t.setRaw(px, py, border ? VOID : mix(GIRDER, FLANGE, 0.32), 0.94);
      }
}

/** Cell 0 (`lintel`): Ribbed airlock header soffit with axial spine beam and twin green clearance LEDs. */
function drawDoorCeilingLintel(t, rnd) {
  doorCeilingBase(t, rnd);
  const s = t.scale;
  for (const [y0, y1] of [[8, 28], [36, 56]]) {
    t.rect(16, y0, 32, y1 - y0, VOID, 0.9);
    for (let py = (y0 + 1) * s; py < (y1 - 1) * s; py++)
      for (let px = 17 * s; px < 47 * s; px++) {
        const rib = ((px - 17 * s) % (5 * s)) < 2 * s;
        t.setRaw(px, py, rib ? mix(GIRDER, FLANGE, 0.42) : COFFER, 0.94);
      }
  }
  // Central axial spine girder (y = 28..36, x = 14..50) with twin green door-clearance status lamps
  for (let py = 28 * s; py < 36 * s; py++)
    for (let px = 14 * s; px < 50 * s; px++) {
      const edge = py < 28 * s + 2 || py >= 36 * s - 2;
      const hi = py >= 28 * s + 2 && py < 29 * s + 2;
      t.setRaw(px, py, edge ? VOID : hi ? FLANGE : GIRDER, 0.96);
    }
  for (const lx of [19, 43])
    for (let py = 30 * s; py < 34 * s; py++)
      for (let px = lx * s; px < (lx + 2) * s; px++)
        t.setRaw(px, py, mix(SIGNAL_GREEN, WARM, 0.3), 0.95);
}

/** Cell 1 (`hoist`): Overhead dual hydraulic/torsion door-sync drive shafts & central differential gearbox. */
function drawDoorCeilingHoist(t, rnd) {
  doorCeilingBase(t, rnd);
  const s = t.scale;
  t.rect(16, 8, 32, 48, VOID, 0.92);
  // Twin cylindrical overhead drive shafts spanning between the two door header tracks (y = 18 and y = 46)
  for (const yc of [18, 46]) {
    const rad = 4 * s;
    for (let dy = -rad; dy <= rad; dy++) {
      const norm = dy / rad;
      const cyl = Math.sqrt(Math.max(0, 1 - norm * norm));
      const spec = Math.pow(Math.max(0, -norm * 0.4 + cyl * 0.9), 2.8);
      const col = mix(VOID, FLANGE, Utils.clamp(0.22 + cyl * 0.62 + spec * 0.25, 0, 1));
      const py = yc * s + dy;
      for (let px = 14 * s; px < 50 * s; px++) {
        const collar = Math.abs(px - 20 * s) < 1.5 * s || Math.abs(px - 44 * s) < 1.5 * s;
        t.setRaw(px, py, collar ? mix(col, WARM, 0.25) : col, 0.98);
      }
    }
  }
  // Central synchronizing gearbox housing (x = 25..39, y = 12..52) with cyan pressure beacon
  for (let py = 12 * s; py < 52 * s; py++)
    for (let px = 25 * s; px < 39 * s; px++) {
      const border = px < 25 * s + 2 || px >= 39 * s - 2 || py < 12 * s + 2 || py >= 52 * s - 2;
      const hi = px < 26 * s || py < 13 * s;
      t.setRaw(px, py, border ? VOID : hi ? FLANGE : mix(GIRDER, FLANGE, 0.25), 0.96);
    }
  for (let py = 29 * s; py < 35 * s; py++)
    for (let px = 29 * s; px < 35 * s; px++)
      t.setRaw(px, py, mix(CYAN_LED, WARM, 0.35), 0.95);
}

/** Cell 2 (`seal`): Overhead airlock decompression plenum with ribbed gasket cushions & air-curtain purge vents. */
function drawDoorCeilingSeal(t, rnd) {
  doorCeilingBase(t, rnd);
  const s = t.scale;
  // Ribbed upper compression seal cushions bordering the two door tracks (x = 15..18 and x = 46..49)
  for (const gx0 of [15, 46])
    for (let py = 7 * s; py < 57 * s; py++) {
      const notch = ((py >> 2) % 3) === 0;
      const col = notch ? VOID : mix(GIRDER, FLANGE, 0.48);
      for (let px = gx0 * s; px < (gx0 + 3) * s; px++)
        t.setRaw(px, py, col, 0.95);
    }
  // Central air-curtain purge grille (x = 20..44, y = 10..54)
  t.rect(20, 10, 24, 44, VOID, 0.94);
  for (let py = 12 * s; py < 52 * s; py++) {
    const slat = ((py - 12 * s) % (3 * s)) < 1.8 * s;
    for (let px = 22 * s; px < 42 * s; px++)
      if (slat && ((px - 22 * s) % (6 * s)) >= 2)
        t.setRaw(px, py, mix(COFFER, FLANGE, 0.46), 0.92);
  }
  for (const [cx, cy] of [[22, 12], [38, 12], [22, 48], [38, 48]])
    rivet(t, cx, cy);
}

/** Cell 3 (`strobe`): Doorway threshold LED light-strip soffit & central transit radar dome. */
function drawDoorCeilingStrobe(t, rnd) {
  doorCeilingBase(t, rnd);
  const s = t.scale;
  // Twin recessed linear threshold light bars flanking the two door header tracks (x = 16.5..20.5 and x = 43.5..47.5)
  for (const lx0 of [16.5, 43.5]) {
    const px0 = Math.round(lx0 * s);
    const pw = 4 * s;
    for (let py = 9 * s; py < 55 * s; py++) {
      const baffle = ((py - 9 * s) % (7 * s)) < s;
      for (let dx = 0; dx < pw; dx++) {
        const core = 1 - Math.abs(dx - pw * 0.5) / (pw * 0.5);
        const col = baffle ? GIRDER : mix(CYAN_LED, WARM, 0.45 + 0.45 * core);
        t.setRaw(px0 + dx, py, col, 0.96);
      }
    }
  }
  // Central octagonal overhead transit sensor housing (x = 23..41, y = 21..43)
  const cx = 32 * s;
  const cy = 32 * s;
  const rad = 7.5 * s;
  for (let py = cy - rad; py <= cy + rad; py++)
    for (let px = cx - rad; px <= cx + rad; px++) {
      const r = Math.hypot(px - cx, py - cy) / rad;
      if (r > 1)
        continue;
      const col = r > 0.72
        ? mix(GIRDER, FLANGE, 0.55)
        : r > 0.42
          ? COFFER
          : mix(SIGNAL_GREEN, WARM, (1 - r / 0.42) * 0.55);
      t.setRaw(px, py, col, 0.96);
    }
}

/** Cells 4..6 (`red`, `yellow`, `blue`): Keycard security door-corridor ceiling with color-coded header light rails. */
function drawDoorCeilingLock(t, rnd, accent) {
  doorCeilingBase(t, rnd);
  const s = t.scale;
  // Security keycard light rails running alongside both overhead door header tracks (x = 15..18 and x = 46..49)
  for (const sx0 of [15, 46])
    for (let py = 8 * s; py < 56 * s; py++) {
      const seg = ((py - 8 * s) % (6 * s)) < 4.5 * s;
      const col = seg ? mix(FLANGE, accent, 0.76) : VOID;
      for (let px = sx0 * s; px < (sx0 + 3) * s; px++)
        t.setRaw(px, py, col, 0.95);
    }
  // Central overhead security lockdown beacon housing (x = 21..43, y = 14..50)
  t.rect(21, 14, 22, 36, VOID, 0.94);
  for (let py = 16 * s; py < 48 * s; py++)
    for (let px = 23 * s; px < 41 * s; px++) {
      const border = px < 23 * s + 2 || px >= 41 * s - 2 || py < 16 * s + 2 || py >= 48 * s - 2;
      t.setRaw(px, py, border ? FLANGE : mix(COFFER, GIRDER, 0.55), 0.94);
    }
  // Glowing keycard-color overhead status bar (x = 26..38, y = 24..40)
  for (let py = 24 * s; py < 40 * s; py++)
    for (let px = 26 * s; px < 38 * s; px++) {
      const dx = Math.abs(px - 32 * s) / (6 * s);
      const glow = Math.max(0, 1 - dx * 0.6);
      t.setRaw(px, py, mix(GIRDER, accent, 0.6 + 0.35 * glow), 0.96);
    }
}

/** Cell 7 (`vestibule`): Heavy X-braced airlock bridge soffit for 1-tile vestibules pinched between two doors. */
function drawDoorCeilingVestibule(t, rnd) {
  doorCeilingBase(t, rnd);
  const s = t.scale;
  t.rect(16, 8, 32, 48, VOID, 0.92);
  for (let py = 9 * s; py < 55 * s; py++)
    for (let px = 17 * s; px < 47 * s; px++) {
      const lx = (px + 0.5) / s;
      const ly = (py + 0.5) / s;
      const d1 = Math.abs((lx - 17) * 1.45 - (ly - 9));
      const d2 = Math.abs((lx - 17) * 1.45 - (55 - ly));
      const d = Math.min(d1, d2);
      if (d <= 2.6)
        t.setRaw(px, py, mix(GIRDER, FLANGE, d < 1.1 ? 0.68 : 0.32), 0.96);
    }
  for (const [bx, by] of [[19, 12], [43, 12], [19, 50], [43, 50]])
    for (let py = by * s; py < (by + 2) * s; py++)
      for (let px = bx * s; px < (bx + 2) * s; px++)
        t.setRaw(px, py, mix(CYAN_LED, WARM, 0.35), 0.95);
}

const DOOR_CEILING_DRAW = [
  drawDoorCeilingLintel,
  drawDoorCeilingHoist,
  drawDoorCeilingSeal,
  drawDoorCeilingStrobe,
  (t, rnd) => drawDoorCeilingLock(t, rnd, LOCK_RED),
  (t, rnd) => drawDoorCeilingLock(t, rnd, LOCK_YELLOW),
  (t, rnd) => drawDoorCeilingLock(t, rnd, LOCK_BLUE),
  drawDoorCeilingVestibule,
];

/**
 * 8-cell 2048x256 procedural door-corridor ceiling atlas used exclusively overhead inside doorway tiles
 * (in between the two blast-door slabs of `doubleDoorBox` and 1-tile vestibules pinched between doors).
 */
export function doorCeilingAtlas() {
  const width = SIZE * DOOR_CEILING_CELL_COUNT;
  const data = new Uint8Array(width * SIZE * 4);
  DOOR_CEILING_DRAW.forEach((draw, cell) => {
    const t = new Tile(SIZE, SIZE, SIZE / 64);
    draw(t, mulberry32(41000 + cell * 6733));
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 3;
        const o = (y * width + cell * SIZE + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(t.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name: 'doorCeiling', data, width, height: SIZE, cell: SIZE, frames: DOOR_CEILING_CELL_COUNT };
}

/** Texture coordinates of a door-corridor ceiling cell (`0..DOOR_CEILING_CELL_COUNT-1`). */
export function doorCeilingCellUv(cell) {
  const inset = 0.25 / (SIZE * DOOR_CEILING_CELL_COUNT);
  return [cell / DOOR_CEILING_CELL_COUNT + inset, 0, (cell + 1) / DOOR_CEILING_CELL_COUNT - inset, 1];
}

/** Picks a dedicated door-corridor ceiling cell (`lintel`, `hoist`, `seal`, `strobe`, `vestibule`, or keycard lock variant). */
export function doorCeilingCellFor(x, y, lock = null, vestibule = false) {
  if (lock === 'red')
    return DOOR_CEILING_CELLS.red;
  if (lock === 'yellow')
    return DOOR_CEILING_CELLS.yellow;
  if (lock === 'blue')
    return DOOR_CEILING_CELLS.blue;
  if (vestibule)
    return DOOR_CEILING_CELLS.vestibule;
  let h = Math.imul(x * 73856093 ^ y * 19349663 ^ 11, 2654435761);
  h ^= h >>> 15;
  const r = ((Math.imul(h, 2246822519) >>> 0) % 1000) / 1000;
  if (r < 0.3)
    return DOOR_CEILING_CELLS.lintel;
  if (r < 0.55)
    return DOOR_CEILING_CELLS.hoist;
  if (r < 0.8)
    return DOOR_CEILING_CELLS.seal;
  return DOOR_CEILING_CELLS.strobe;
}

/** Which cell hangs over a tile: dedicated door-corridor soffits inside doorways, light fixtures on a 5x4 grid, and structural bays/ducts/trusses across the rest. */
export function ceilingCellFor(x, y, door = false, lock = null, vestibule = false) {
  if (door)
    return doorCeilingCellFor(x, y, lock, vestibule);
  if (x % 5 === 2 && y % 4 === 3)
    return CEILING_CELLS.light;
  let h = Math.imul(x * 73856093 ^ y * 19349663 ^ 5, 2654435761);
  h ^= h >>> 15;
  const r = ((Math.imul(h, 2246822519) >>> 0) % 1000) / 1000;
  if (r < 0.26)
    return CEILING_CELLS.panels;
  if (r < 0.44)
    return CEILING_CELLS.ribs;
  if (r < 0.6)
    return CEILING_CELLS.truss;
  if (r < 0.74)
    return CEILING_CELLS.duct;
  if (r < 0.86)
    return CEILING_CELLS.pipes;
  if (r < 0.94)
    return CEILING_CELLS.grille;
  return CEILING_CELLS.hatch;
}

/**
 * Dedicated fragment shader for the ceiling: unlike the floor and walls, it never applies brown floor rust puddles.
 * Instead it deepens the recessed overhead coffer cavities, shades girder seams with dark industrial soot, and keeps
 * the fluorescent light diffusers and cyan status beacons crisp and self-lit.
 */
export const CEILING_FRAGMENT = SOLID_TEXTURED_FRAGMENT;


/**
 * Every ceiling tile with a light fixture texture (`CEILING_CELLS.light`) over a roofed room floor tile gets a 3D
 * light fixture entry positioned just beneath the ceiling diffuser.
 */
export function ceilingLightFixtures(level) {
  const fixtures = [];
  const lightY = CEILING - 2;
  for (let ty = 0; ty < level.rowCount; ty++)
    for (let tx = 0; tx < level.width; tx++) {
      const idx = ty * level.width + tx;
      if ((level.kind[idx] !== FLOOR && level.kind[idx] !== DOOR && level.kind[idx] !== PILLAR && !level.diag[idx]) || level.arena?.has(idx))
        continue;
      if (level.kind[idx] === DOOR && !level.doors?.get(idx)?.secret)
        continue;
      if (ceilingCellFor(tx, ty) !== CEILING_CELLS.light)
        continue;
      let h = Math.imul(tx * 73856093 ^ ty * 19349663 ^ 17, 2654435761);
      h = (h ^ (h >>> 15)) >>> 0;
      fixtures.push({
        tile: new Vec2(tx, ty),
        position: new Vec3((tx + 0.5) * TILE, lightY, (ty + 0.5) * TILE),
        phase: (h % 628) / 100,
        flicker: h % 5 === 0,
      });
    }
  return fixtures;
}

/** Registers an AmbientLight and up to `MAX_LIGHTS` reusable PointLight instances in the RoostR scene. */
export function createCeilingLights(scene, count = MAX_LIGHTS) {
  if (typeof scene.clearLights === 'function')
    scene.clearLights();
  const ambient = new AmbientLight(CEILING_AMBIENT_COLOR.clone());
  if (typeof scene.addLight === 'function')
    scene.addLight(ambient);
  const pointLights = [];
  for (let i = 0; i < count; i++) {
    const light = new PointLight({
      position: new Vec3(0, -9999, 0),
      diffuse: new Vec3(0, 0, 0),
      constantAttenuation: CEILING_LIGHT_ATTENUATION.x,
      linearAttenuation: CEILING_LIGHT_ATTENUATION.y,
      quadraticAttenuation: CEILING_LIGHT_ATTENUATION.z,
    });
    if (typeof scene.addLight === 'function')
      scene.addLight(light);
    pointLights.push(light);
  }
  return { ambient, pointLights };
}

const dynamicLightPool = [];
const dynamicLightCandidateArrays = [[], []];
let candidateArrayIdx = 0;
const EMPTY_DYNAMIC_LIGHTS = [];

function acquireDynamicLight(index) {
  let entry = dynamicLightPool[index];
  if (!entry) {
    entry = {
      kind: '',
      position: new Vec3(),
      color: null,
      strength: 0,
      attenuation: null,
      sortKey: 0,
    };
    dynamicLightPool[index] = entry;
  }
  return entry;
}

/**
 * Gathers transient dynamic point lights from weapon muzzle flashes, flying rockets/fireballs,
 * barrel/rocket detonations, teleporter plasma bursts, and burning barrels near `cameraPos`.
 * Returned array and its entries are pooled and reused across invocations; valid until next call.
 */
export function collectDynamicLights(game, cameraPos, time = 0, maxRadius = Infinity, fog = null) {
  if (!game)
    return EMPTY_DYNAMIC_LIGHTS;
  const dynamicLightCandidates = dynamicLightCandidateArrays[candidateArrayIdx];
  candidateArrayIdx = (candidateArrayIdx + 1) & 1;
  const radius = Math.min(DYNAMIC_LIGHT_RADIUS, maxRadius);
  const maxDistSq = radius * radius;
  let dynamicLightCount = 0;
  const player = game.player;

  if (player && (player.flash ?? 0) > 0 && game.state !== 'dead' && game.state !== 'title') {
    const weapon = player.weapon ?? 'shotgun';
    if (weapon !== 'fist' && weapon !== 'knife' && weapon !== 'chainsaw') {
      const flashRatio = Math.min(1, player.flash / (WEAPONS[weapon]?.feel?.flash ?? 0.12));
      const mult = weapon === 'rocket' ? 1.18 : weapon === 'chaingun' ? 0.92 : 1.02;
      const mx = player.pos.x + Math.cos(player.angle) * 24;
      const my = (player.eye ?? 28) - 4;
      const mz = player.pos.y + Math.sin(player.angle) * 24;
      const entry = acquireDynamicLight(dynamicLightCount);
      entry.kind = 'muzzle';
      entry.position.setScalar(mx, my, mz);
      entry.color = MUZZLE_LIGHT_COLOR;
      entry.strength = flashRatio * mult;
      entry.attenuation = MUZZLE_LIGHT_ATTENUATION;
      entry.sortKey = -1000;
      dynamicLightCandidates[dynamicLightCount++] = entry;
    }
  }

  if (Array.isArray(game.shots))
    for (let i = 0; i < game.shots.length; i++) {
      const shot = game.shots[i];
      if (fog && !fog.canSeeNear(shot.pos))
        continue;
      const entry = acquireDynamicLight(dynamicLightCount);
      entry.position.setScalar(shot.pos.x, 24, shot.pos.y);
      const distSq = cameraPos ? cameraPos.getDistance(entry.position, true) : 0;
      if (distSq > maxDistSq)
        continue;
      const isRocket = shot.kind === 'rocket';
      const flicker = 0.92 + 0.08 * Math.sin(time * 32 + i * 1.9);
      const fade = 1 - 0.35 * (distSq / maxDistSq);
      entry.kind = isRocket ? 'rocket' : 'fireball';
      entry.color = isRocket ? ROCKET_LIGHT_COLOR : FIREBALL_LIGHT_COLOR;
      entry.strength = (isRocket ? 1.15 : 0.95) * flicker * fade;
      entry.attenuation = DYNAMIC_LIGHT_ATTENUATION;
      entry.sortKey = distSq * (isRocket ? 0.65 : 0.85);
      dynamicLightCandidates[dynamicLightCount++] = entry;
    }

  if (Array.isArray(game.effects))
    for (let i = 0; i < game.effects.length; i++) {
      const effect = game.effects[i];
      if (effect.age >= effect.life || effect.type === 'spark')
        continue;
      if (fog && !fog.canSeeNear(scratchPt.setScalar(effect.x, effect.y), effect.type === 'boom' ? 2 : 1))
        continue;
      const ey = effect.type === 'boom' ? 20 : (effect.z ?? 24);
      const entry = acquireDynamicLight(dynamicLightCount);
      entry.position.setScalar(effect.x, ey, effect.y);
      const distSq = cameraPos ? cameraPos.getDistance(entry.position, true) : 0;
      if (distSq > maxDistSq)
        continue;
      const lifeRatio = Math.max(0, 1 - effect.age / Math.max(0.001, effect.life));
      const fade = 1 - 0.3 * (distSq / maxDistSq);
      const isBoom = effect.type === 'boom';
      const isTeleport = effect.type === 'teleport';
      const color = isBoom
        ? BOOM_LIGHT_COLOR
        : isTeleport
          ? TELEPORT_LIGHT_COLOR
          : FIREBALL_LIGHT_COLOR;
      const baseStrength = isBoom ? 1.38 : isTeleport ? 1.25 : 1.05;
      entry.kind = effect.type ?? 'blast';
      entry.color = color;
      entry.strength = lifeRatio * baseStrength * fade;
      entry.attenuation = DYNAMIC_LIGHT_ATTENUATION;
      entry.sortKey = distSq * (isBoom || isTeleport ? 0.5 : 0.8);
      dynamicLightCandidates[dynamicLightCount++] = entry;
    }

  if (Array.isArray(game.barrels))
    for (let i = 0; i < game.barrels.length; i++) {
      const barrel = game.barrels[i];
      if (barrel.gone || !(barrel.fuse >= 0))
        continue;
      if (fog && !fog.canSeeNear(barrel.pos))
        continue;
      const entry = acquireDynamicLight(dynamicLightCount);
      entry.position.setScalar(barrel.pos.x, 18, barrel.pos.y);
      const distSq = cameraPos ? cameraPos.getDistance(entry.position, true) : 0;
      if (distSq > maxDistSq)
        continue;
      const pulse = 0.75 + 0.35 * Math.abs(Math.sin(time * 55 + i));
      entry.kind = 'Fuse';
      entry.color = BOOM_LIGHT_COLOR;
      entry.strength = pulse;
      entry.attenuation = DYNAMIC_LIGHT_ATTENUATION;
      entry.sortKey = distSq * 0.9;
      dynamicLightCandidates[dynamicLightCount++] = entry;
    }

  dynamicLightCandidates.length = dynamicLightCount;
  dynamicLightCandidates.sort(compareDynamicLightSortKey);
  dynamicLightCandidates.length = Math.min(dynamicLightCount, MAX_DYNAMIC_LIGHTS);
  return dynamicLightCandidates;
}

const rankedFixturesPool = [];
const rankedFixturesScratch = [];

/**
 * Returns the ambient lighting multiplier `[0.2..1]` for the player's position relative to the starting elevator cab.
 * The cab interior stays dimly lit while riding and gradually brightens as the door opens and the player steps out.
 */
export function elevatorLightFactor(game) {
  if (!game || game.state === 'title' || game.cam)
    return 1;
  const elev = game.level?.elevator;
  const pos = game.player?.pos;
  if (!elev || !pos)
    return 1;
  const dx = pos.x - (elev.x + 0.5) * TILE;
  const dy = pos.y - (elev.y + 0.5) * TILE;
  const along = dx * elev.dirX + dy * elev.dirY;
  const perp = Math.abs(dx * elev.dirY - dy * elev.dirX);
  if (perp >= TILE * 0.75 || along >= TILE * 0.85)
    return 1;
  const outFactor = Utils.clamp((along - 10) / 44, 0, 1);
  const doorOpen = elev.door?.open ?? 0;
  return Utils.lerp(0.2 + 0.22 * doorOpen, 1, outFactor);
}

/**
 * Positions the scene's active RoostR PointLight pool: transient dynamic lights (muzzle flash, flying rockets and
 * fireballs, explosions, teleporter bursts) claim the first slots, and the remaining slots illuminate the ceiling
 * light fixtures nearest `cameraPos`.
 */
export function updateCeilingLights(pointLights, fixtures, cameraPos, time = 0, game = null, maxRadius = Infinity, fog = null) {
  const limit = pointLights.length;
  if (!limit)
    return pointLights;
  const dynamic = game ? collectDynamicLights(game, cameraPos, time, maxRadius, fog) : EMPTY_DYNAMIC_LIGHTS;
  const dynCount = Math.min(dynamic.length, Math.min(MAX_DYNAMIC_LIGHTS, limit));

  for (let i = 0; i < dynCount; i++) {
    const light = pointLights[i];
    const dyn = dynamic[i];
    light.setPosition(dyn.position);
    light.setConstantAttenuation(dyn.attenuation.x);
    light.setLinearAttenuation(dyn.attenuation.y);
    light.setQuadraticAttenuation(dyn.attenuation.z);
    light.diffuse.scaleVector(dyn.color, dyn.strength);
  }

  const ceilingRadius = Math.min(CEILING_LIGHT_RADIUS, maxRadius);
  const maxDistSq = ceilingRadius * ceilingRadius;
  let rankedCount = 0;
  for (let i = 0; i < fixtures.length; i++) {
    const fixture = fixtures[i];
    if (fog && !fog.canSeeNear(scratchPt.setScalar(fixture.position.x, fixture.position.z)))
      continue;
    const distSq = cameraPos.getDistance(fixture.position, true);
    if (distSq <= maxDistSq) {
      let item = rankedFixturesPool[rankedCount];
      if (!item) {
        item = { fixture: null, distSq: 0 };
        rankedFixturesPool[rankedCount] = item;
      }
      item.fixture = fixture;
      item.distSq = distSq;
      rankedFixturesScratch[rankedCount++] = item;
    }
  }
  rankedFixturesScratch.length = rankedCount;
  rankedFixturesScratch.sort(compareFixtureDistSq);

  let elevFixtureScale = 1;
  const elev = !game || game.state === 'title' || game.cam ? null : game.level?.elevator;
  const playerPos = game?.player?.pos;
  if (elev && playerPos) {
    const dx = playerPos.x - (elev.x + 0.5) * TILE;
    const dy = playerPos.y - (elev.y + 0.5) * TILE;
    const along = dx * elev.dirX + dy * elev.dirY;
    const perp = Math.abs(dx * elev.dirY - dy * elev.dirX);
    if (perp < TILE * 0.75 && along < TILE * 0.85) {
      const outFactor = Utils.clamp((along - 10) / 44, 0, 1);
      const doorOpen = elev.door?.open ?? 0;
      elevFixtureScale = Utils.lerp(0.06 + 0.28 * doorOpen, 1, outFactor);
    }
  }

  for (let i = dynCount; i < limit; i++) {
    const light = pointLights[i];
    light.setConstantAttenuation(CEILING_LIGHT_ATTENUATION.x);
    light.setLinearAttenuation(CEILING_LIGHT_ATTENUATION.y);
    light.setQuadraticAttenuation(CEILING_LIGHT_ATTENUATION.z);
    const entry = rankedFixturesScratch[i - dynCount];
    if (!entry) {
      light.diffuse.setScalar(0, 0, 0);
      continue;
    }
    const { fixture, distSq } = entry;
    light.setPosition(fixture.position);
    const ratio = distSq / maxDistSq;
    const windowFade = ratio > 0.65 ? Math.max(0, 1 - (ratio - 0.65) / 0.35) : 1;
    let hum = 1;
    if (fixture.flicker) {
      const wave = Math.sin(time * 19 + fixture.phase) * Math.sin(time * 43 + fixture.phase * 1.7);
      hum = wave < -0.68 ? 0.64 : 0.96 + 0.04 * wave;
    }
    light.diffuse.scaleVector(CEILING_LIGHT_COLOR, windowFade * hum * elevFixtureScale);
  }
  return pointLights;
}

export const CEILING_CONE_VERTEX = ceilingConeShader.vertex;

export const CEILING_CONE_FRAGMENT = ceilingConeShader.fragment;

/**
 * Builds intersecting translucent trapezoidal light-cone quads ("god rays") hanging softly beneath each ceiling light
 * fixture. Every vertex carries its fixture's `(cx, cz)` world center in `uvs` so the shader can evaluate a seamless
 * 3D cone volume and four fanned louver shafts without affine trapezoid distortion.
 */
export function ceilingLightCones(fixtures) {
  const quadsPerFixture = 4;
  const vertices = new Float32Array(fixtures.length * quadsPerFixture * 18);
  const uvs = new Float32Array(fixtures.length * quadsPerFixture * 12);
  const yTop = CEILING - 1.4;
  const yBot = 10;
  const topX = 22;
  const botX = 38;
  const topZ = 6;
  const botZ = 20;
  const sheets = [
    [-topX, -topZ * 0.55, topX, -topZ * 0.55, -botX, -botZ * 0.65, botX, -botZ * 0.65],
    [-topX, topZ * 0.55, topX, topZ * 0.55, -botX, botZ * 0.65, botX, botZ * 0.65],
    [-topX * 0.85, -topZ, topX * 0.85, topZ, -botX * 0.85, -botZ, botX * 0.85, botZ],
    [-topX * 0.85, topZ, topX * 0.85, -topZ, -botX * 0.85, botZ, botX * 0.85, -botZ],
  ];
  let v = 0;
  let t = 0;
  for (let i = 0; i < fixtures.length; i++) {
    const cx = fixtures[i].position.x;
    const cz = fixtures[i].position.z;
    for (let s = 0; s < sheets.length; s++) {
      const [tx0, tz0, tx1, tz1, bx0, bz0, bx1, bz1] = sheets[s];
      const corners = [
        cx + bx0, yBot, cz + bz0,
        cx + bx1, yBot, cz + bz1,
        cx + tx1, yTop, cz + tz1,
        cx + tx0, yTop, cz + tz0,
      ];
      for (const c of [0, 1, 2, 0, 2, 3]) {
        const k = c * 3;
        vertices[v++] = corners[k];
        vertices[v++] = corners[k + 1];
        vertices[v++] = corners[k + 2];
        uvs[t++] = cx;
        uvs[t++] = cz;
      }
    }
  }
  return { vertices, uvs, count: fixtures.length * quadsPerFixture * 6 };
}

// ---- Martian sky panorama & camera-centered dome (E1M5 Red Planet) -------------------------------------------------

export const MARS_SKY_WIDTH = 2048;
export const MARS_SKY_HEIGHT = 512;

const SKY_ZENITH = [36, 11, 10];
const SKY_UPPER = [76, 24, 14];
const SKY_MID = [132, 50, 21];
const SKY_LOWER = [176, 78, 34];
const SKY_FOG = [117, 46, 15];
const SUN_CORE = [255, 238, 188];
const SUN_HALO = [238, 152, 68];
const MOON_LIT = [226, 168, 114];
const MOON_MID = [142, 82, 48];
const MOON_DARK = [52, 20, 13];
const CLOUD_LIT = [214, 108, 46];
const CLOUD_DARK = [88, 30, 14];
const RIDGE_FAR_DARK = [74, 25, 13];
const RIDGE_FAR_LIT = [146, 60, 26];
const RIDGE_NEAR_ABYSS = [36, 13, 7];
const RIDGE_NEAR_DARK = [64, 23, 11];
const RIDGE_NEAR_BASE = [108, 42, 18];
const RIDGE_NEAR_LIT = [166, 74, 32];

function skyDeltaX(x, cx) {
  let dx = x - cx;
  if (dx > MARS_SKY_WIDTH * 0.5)
    dx -= MARS_SKY_WIDTH;
  else if (dx < -MARS_SKY_WIDTH * 0.5)
    dx += MARS_SKY_WIDTH;
  return dx;
}

const skySmooth = Utils.smoothstep;

export const PHOBOS_CENTER = new Vec2(1264, 184);
export const DEIMOS_CENTER = new Vec2(1672, 208);
export const PHOBOS_ANGULAR_RADIUS = 0.096;
export const DEIMOS_ANGULAR_RADIUS = 0.044;

/**
 * Maps a panorama pixel coordinate `pixel` (`Vec2(x, y)`) in `marsSkyAtlas` to the exact 3D unit direction
 * vector on the celestial dome matching `MARS_SKY_FRAGMENT`'s `(u, v)` projection.
 */
export function skyPixelDir(pixel, target = new Vec3()) {
  const u = pixel.x / MARS_SKY_WIDTH;
  const v = Utils.clamp(pixel.y / (MARS_SKY_HEIGHT - 1), 0, 1);
  const az = (u - 0.5) * Trigo.pi * 2;
  const elev = (1 - v) ** (1 / 0.88);
  const dirY = Utils.clamp(elev * 0.54, 0, 0.999);
  const horiz = Math.sqrt(Math.max(0, 1 - dirY * dirY));
  return target.setScalar(horiz * Math.cos(az), dirY, horiz * Math.sin(az));
}

function skyTangentBasis(pixel, right = new Vec3(), down = new Vec3(), center = new Vec3()) {
  skyPixelDir(pixel, center);
  const az = (pixel.x / MARS_SKY_WIDTH - 0.5) * Trigo.pi * 2;
  right.setScalar(-Math.sin(az), 0, Math.cos(az));
  down.crossVectors(center, right).normalize();
}

const phobosBasisRight = new Vec3();
const phobosBasisDown = new Vec3();
const phobosBasisCenter = new Vec3();
skyTangentBasis(PHOBOS_CENTER, phobosBasisRight, phobosBasisDown, phobosBasisCenter);

const deimosBasisRight = new Vec3();
const deimosBasisDown = new Vec3();
const deimosBasisCenter = new Vec3();
skyTangentBasis(DEIMOS_CENTER, deimosBasisRight, deimosBasisDown, deimosBasisCenter);
const sunLightDir = new Vec3(-0.68, -0.34, 0.65).normalize();

/**
 * 2048x512 horizontally seamless 360-degree Martian sky panorama atlas (`planet: 'mars'`).
 * Includes a deep rust-violet zenith grading down into warm iron-oxide dust haze, a pale hazy sun with an amber
 * forward-scattering aureole, twin cratered moons Phobos & Deimos, wind-sheared dust-storm cloud bands, and
 * multi-layered distant Martian mountain ranges, flat-topped mesas, and crater rims fading into `MARS_SKY_VEC`.
 */
export function marsSkyAtlas({ includeMoons = true } = {}) {
  const width = MARS_SKY_WIDTH;
  const height = MARS_SKY_HEIGHT;
  const S = height / 256;
  const tile = new Tile(width, height);
  const rnd = mulberry32(77319);
  const warp = periodicField(rnd, 6, width);
  const cloudCoarse = periodicField(rnd, 6, width);
  const cloudMed = periodicField(rnd, 12, width);
  const cloudFine = periodicField(rnd, 24, width);
  const ridgeFieldA = periodicField(rnd, 6, width);
  const ridgeFieldB = periodicField(rnd, 14, width);
  const strataField = periodicField(rnd, 28, width);
  const strataMicro = periodicField(rnd, 56, width);

  const sunX = 224 * S;
  const sunY = 60 * S;

  // 1. Smooth atmospheric gradient, wind-sheared dust cloud strata, and solar dust-scattering corona
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    let baseCol;
    if (t < 0.28)
      baseCol = mix(SKY_ZENITH, SKY_UPPER, skySmooth(0, 0.28, t));
    else if (t < 0.58)
      baseCol = mix(SKY_UPPER, SKY_MID, skySmooth(0.28, 0.58, t));
    else if (t < 0.82)
      baseCol = mix(SKY_MID, SKY_LOWER, skySmooth(0.58, 0.82, t));
    else
      baseCol = mix(SKY_LOWER, SKY_FOG, skySmooth(0.82, 1.0, t));

    const cloudBand = Math.sin(Utils.clamp((y / S - 28) / 164, 0, 1) * Trigo.pi);

    for (let x = 0; x < width; x++) {
      let col = [baseCol[0], baseCol[1], baseCol[2]];

      // Wind-swept horizontal dust cloud strata in the upper and mid sky
      if (cloudBand > 0.02) {
        const wx = x + (warp(x, y * 3) - 0.5) * 76 * S;
        const wy = y * 4.2 + (warp(x + 194 * S, y * 2) - 0.5) * 36 * S;
        const c = cloudCoarse(wx, wy) * 0.54 + cloudMed(wx + 82 * S, wy) * 0.32 + cloudFine(x, y * 2) * 0.14;
        const cAbove = cloudCoarse(wx, wy - 14 * S) * 0.6 + cloudMed(wx + 82 * S, wy - 14 * S) * 0.4;
        const density = skySmooth(0.41, 0.82, c) * cloudBand;
        if (density > 0.005) {
          const sunlitBillow = Utils.clamp((c - cAbove + 0.08) * 3.6, 0, 1);
          const cloudCol = mix(CLOUD_DARK, CLOUD_LIT, sunlitBillow);
          col = mix(col, cloudCol, density * 0.64);
        }
      }

      // Pale hazy Martian sun and butterscotch atmospheric Mie-scattering corona (aspect-corrected to 3D angular space)
      const sdx = skyDeltaX(x, sunX) / S;
      const sdy = (y - sunY) / S;
      const haloDist = scratchPt.setScalar(sdx, sdy * 0.55).getMagnitude();
      if (haloDist < 110) {
        const aureole = (1 - haloDist / 110) ** 2.2;
        col = mix(col, SUN_HALO, aureole * 0.62);
        const sunDist = scratchPt.setScalar(sdx, sdy * 0.378).getMagnitude();
        if (sunDist < 36) {
          const inner = (1 - sunDist / 36) ** 1.6;
          col = mix(col, mix(SUN_HALO, SUN_CORE, 0.65), inner * 0.78);
        }
        if (sunDist < 12) {
          const disc = skySmooth(12, 5.5, sunDist);
          const hazeStreak = 0.9 + 0.1 * cloudMed(x * 2, y * 6);
          col = mix(col, SUN_CORE, disc * hazeStreak);
        }
      }

      tile.set(x, y, col);
    }
  }

  // 2. Twin Martian moons: Phobos and Deimos projected as irregular, battered 3D rocky bodies in angular sky space
  if (includeMoons) {
    const phobosX = PHOBOS_CENTER.x;
    const phobosY = PHOBOS_CENTER.y;
    for (let dy = -48 * S; dy <= 48 * S; dy++)
      for (let dx = -22 * S; dx <= 22 * S; dx++) {
        const y = phobosY + dy;
        if (y < 0 || y >= height)
          continue;
        const x = ((phobosX + dx) % width + width) % width;
        skyPixelDir(scratchPixel.setScalar(x, y), scratchDir);
        const rawNx = scratchDir.dotProduct(phobosBasisRight) / PHOBOS_ANGULAR_RADIUS;
        const rawNy = scratchDir.dotProduct(phobosBasisDown) / PHOBOS_ANGULAR_RADIUS;
        const ang = Math.atan2(rawNy, rawNx);
        const limbR = 1.0
          + 0.018 * Math.cos(ang * 2 - 0.4)
          - 0.012 * Math.sin(ang * 3 + 1.1)
          + (cloudCoarse(x * 3, y * 3) - 0.5) * 0.028;
        const nx = rawNx / limbR;
        const ny = rawNy / limbR;
        const normDist = scratchPt.setScalar(nx, ny).getMagnitude();
        if (normDist > 1.0)
          continue;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const wx = nx + (warp(x * 4, y * 4) - 0.5) * 0.1;
        const wy = ny + (warp(x * 4 + 97, y * 4 + 53) - 0.5) * 0.1;
        const ndotl = Math.max(0, scratchNormal.setScalar(nx, ny, nz).dotProduct(sunLightDir));
        const limb = nz ** 0.35;
        let light = Utils.clamp((0.12 + 0.92 * ndotl) * (0.72 + 0.28 * limb), 0, 1);

        // Domain-warped irregular basins on Phobos (Stickney + secondary basins)
        for (const [cx, cy, cr] of [[-0.34, 0.16, 0.34], [0.24, -0.26, 0.23], [0.16, 0.33, 0.19], [-0.08, -0.39, 0.17], [0.46, 0.06, 0.16]]) {
          const cd = scratchPt.setScalar(wx - cx, wy - cy).getMagnitude();
          if (cd < cr) {
            const rim = cd / cr;
            if (rim > 0.72) {
              const rimBlend = Math.sin(((rim - 0.72) / 0.28) * Trigo.pi);
              const slope = cd > 1e-4 ? ((wx - cx) * 0.88 + (wy - cy) * 0.47) / cd : 0;
              light = Utils.clamp(light + slope * 0.16 * rimBlend, 0, 1);
            } else {
              const bowl = skySmooth(0, 0.72, rim);
              light *= 0.64 + 0.22 * bowl;
            }
          }
        }
        const surfDetail = (cloudFine(x * 3, y * 3) - 0.5) * 0.09 + (strataField(x * 2, y * 2) - 0.5) * 0.06;
        const moonShade = Utils.clamp(light + surfDetail * (light > 0.18 ? 1 : 0.35), 0, 1);
        const moonCol = moonShade > 0.55
          ? mix(MOON_MID, MOON_LIT, (moonShade - 0.55) / 0.45)
          : mix(MOON_DARK, MOON_MID, moonShade / 0.55);
        const edgeSoft = skySmooth(1.0, 0.85, normDist);
        tile.set(x, y, moonCol, edgeSoft * 0.94);
      }

    const deimosX = DEIMOS_CENTER.x;
    const deimosY = DEIMOS_CENTER.y;
    for (let dy = -26 * S; dy <= 26 * S; dy++)
      for (let dx = -12 * S; dx <= 12 * S; dx++) {
        const y = deimosY + dy;
        if (y < 0 || y >= height)
          continue;
        const x = ((deimosX + dx) % width + width) % width;
        skyPixelDir(scratchPixel.setScalar(x, y), scratchDir);
        const rawNx = scratchDir.dotProduct(deimosBasisRight) / DEIMOS_ANGULAR_RADIUS;
        const rawNy = scratchDir.dotProduct(deimosBasisDown) / DEIMOS_ANGULAR_RADIUS;
        const ang = Math.atan2(rawNy, rawNx);
        const limbR = 1.0
          + 0.024 * Math.sin(ang * 2 + 0.8)
          + 0.014 * Math.cos(ang * 3 - 0.5)
          + (cloudCoarse(x * 4, y * 4) - 0.5) * 0.028;
        const nx = rawNx / limbR;
        const ny = rawNy / limbR;
        const normDist = scratchPt.setScalar(nx, ny).getMagnitude();
        if (normDist > 1.0)
          continue;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const wx = nx + (warp(x * 4, y * 4) - 0.5) * 0.1;
        const wy = ny + (warp(x * 4 + 61, y * 4 + 29) - 0.5) * 0.1;
        const ndotl = Math.max(0, scratchNormal.setScalar(nx, ny, nz).dotProduct(sunLightDir));
        const limb = nz ** 0.35;
        let light = Utils.clamp((0.14 + 0.9 * ndotl) * (0.72 + 0.28 * limb), 0, 1);
        for (const [cx, cy, cr] of [[-0.22, 0.15, 0.36], [0.26, -0.18, 0.24], [0.05, 0.38, 0.2]]) {
          const craterDist = scratchPt.setScalar(wx - cx, wy - cy).getMagnitude();
          if (craterDist < cr)
            light *= 0.74 + 0.26 * skySmooth(0, cr, craterDist);
        }
        const surfDetail = (cloudFine(x * 3, y * 3) - 0.5) * 0.08;
        const moonShade = Utils.clamp(light + surfDetail * (light > 0.18 ? 1 : 0.35), 0, 1);
        const moonCol = moonShade > 0.5
          ? mix(MOON_MID, MOON_LIT, (moonShade - 0.5) / 0.5)
          : mix(MOON_DARK, MOON_MID, moonShade / 0.5);
        const edgeSoft = skySmooth(1.0, 0.83, normDist);
        tile.set(x, y, moonCol, edgeSoft * 0.92);
      }
  }

  // 3. Multi-layered distant Martian mountain ranges, flat-topped mesas, and caldera crater rims
  const farHeight = new Float32Array(width);
  const nearHeight = new Float32Array(width);
  const tau = (Trigo.pi * 2) / width;

  for (let x = 0; x < width; x++) {
    const a = x * tau;
    // Far range: high shield-volcano slopes, flat-topped tableland mesas, and distant crater rims
    const rawFar = 156
      - 22 * Math.sin(a * 2 + 0.4)
      - 14 * Math.cos(a * 5 - 1.1)
      - 10 * Math.sin(a * 9 + 2.3)
      + (ridgeFieldA(x, 40 * S) - 0.5) * 28
      + (ridgeFieldB(x, 104 * S) - 0.5) * 12;
    farHeight[x] = (rawFar < 136 ? 136 + (rawFar - 136) * 0.25 : Utils.clamp(rawFar, 128, 196)) * S;

    // Near range: sharper eroded Valles Marineris canyon crags, buttes, and foreground ridges
    const rawNear = 188
      - 18 * Math.sin(a * 3 - 0.8)
      - 12 * Math.cos(a * 7 + 0.6)
      - 9 * Math.sin(a * 13 - 1.7)
      + (ridgeFieldA(x + 346 * S, 176 * S) - 0.5) * 30
      + (ridgeFieldB(x + 122 * S, 208 * S) - 0.5) * 16;
    nearHeight[x] = (rawNear < 168 ? 168 + (rawNear - 168) * 0.3 : Utils.clamp(rawNear, 160, 220)) * S;
  }

  const slopeStep = 3 * S;
  const fogStart = 208 * S;
  for (let x = 0; x < width; x++) {
    const xm = (x - slopeStep + width) % width;
    const xp = (x + slopeStep) % width;
    const farTop = farHeight[x];
    const farSlope = (farHeight[xp] - farHeight[xm]) / (2 * S);
    const nearTop = nearHeight[x];
    const nearSlope = (nearHeight[xp] - nearHeight[xm]) / (2 * S);

    // Paint far mountain range
    for (let y = Math.max(0, Math.floor(farTop - S)); y < height; y++) {
      const depthFromRim = (y - farTop) / S;
      if (depthFromRim < -1)
        continue;
      const sunFacing = Utils.clamp(0.5 + farSlope * 0.14, 0, 1);
      const strata = strataField(x, y * 3.2) * 0.78 + strataMicro(x, y * 3.2) * 0.22;
      const rimGlow = Math.exp(-Math.max(0, depthFromRim) * 0.12) * (0.45 + 0.55 * sunFacing);
      let col = mix(RIDGE_FAR_DARK, RIDGE_FAR_LIT, sunFacing * 0.72 + strata * 0.28);
      col = mix(col, CLOUD_LIT, rimGlow * 0.35);
      const haze = Utils.clamp(Math.max(0, depthFromRim) / 76, 0, 1);
      col = mix(col, SKY_MID, haze * 0.45);
      const edgeAlpha = skySmooth(-1.0, 1.2, depthFromRim);
      tile.set(x, y, col, edgeAlpha);
    }

    // Paint near craggy canyon & mesa range in front of the far range
    for (let y = Math.max(0, Math.floor(nearTop - S)); y < height; y++) {
      const depthFromRim = (y - nearTop) / S;
      if (depthFromRim < -1)
        continue;
      const sunFacing = Utils.clamp(0.48 + nearSlope * 0.16, 0, 1);
      const strata = strataField(x + 66 * S, y * 3.8) * 0.75 + strataMicro(x + 66 * S, y * 3.8) * 0.25;
      const gully = ridgeFieldB(x * 2, y * 2);
      let col = mix(RIDGE_NEAR_DARK, RIDGE_NEAR_BASE, sunFacing * 0.65 + strata * 0.35);
      if (sunFacing > 0.52 && strata > 0.45)
        col = mix(col, RIDGE_NEAR_LIT, skySmooth(0.52, 0.92, sunFacing) * skySmooth(0.45, 0.85, strata));
      if (sunFacing < 0.42 || gully < 0.38) {
        const shadowWeight = Math.max(skySmooth(0.42, 0.18, sunFacing), skySmooth(0.38, 0.16, gully));
        col = mix(col, RIDGE_NEAR_ABYSS, shadowWeight * 0.55);
      }
      if (depthFromRim >= 0 && depthFromRim < 3.5)
        col = mix(col, RIDGE_NEAR_LIT, (1 - depthFromRim / 3.5) * (0.3 + 0.5 * sunFacing));
      const edgeAlpha = skySmooth(-1.0, 1.2, depthFromRim);
      tile.set(x, y, col, edgeAlpha);
    }

    // 4. Seamless foothill fog blend into MARS_SKY_VEC at the bottom horizon
    for (let y = fogStart; y < height; y++) {
      const ft = Utils.clamp((y - fogStart) / (height - 1 - fogStart), 0, 1);
      const smoothFog = ft * ft * (3 - 2 * ft);
      tile.set(x, y, SKY_FOG, smoothFog);
    }
  }

  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const o = (y * width + x) * 4;
      data[o] = Utils.clamp(Math.round(tile.pixels[i]), 0, 255);
      data[o + 1] = Utils.clamp(Math.round(tile.pixels[i + 1]), 0, 255);
      data[o + 2] = Utils.clamp(Math.round(tile.pixels[i + 2]), 0, 255);
      data[o + 3] = 255;
    }
  return { name: 'marsSky', data, width, height, cell: height, frames: 1 };
}

/**
 * Builds a camera-centered panoramic sky cylinder/dome mesh `{ vertices, uvs }` with dimensions `size`
 * (`Vec2(radius, height)`). Extends below the horizon (`-0.35 * height`) and closes at the zenith (`+height`)
 * so any camera pitch or roll sees a continuous 360-degree sky over outdoor canyon walls while indoor ceilings
 * and walls naturally occlude it.
 */
export function marsSkyMesh(size = new Vec2(1200, 720)) {
  const radius = size.x;
  const height = size.y;
  const radialSegments = 64;
  const rings = [
    { y: -height * 0.35, r: radius, v: 1.0 },
    { y: 0, r: radius, v: 0.98 },
    { y: height * 0.28, r: radius * 0.96, v: 0.56 },
    { y: height * 0.56, r: radius * 0.82, v: 0.22 },
    { y: height * 0.82, r: radius * 0.52, v: 0.06 },
    { y: height, r: 0, v: 0.0 },
  ];
  const bands = rings.length - 1;
  const vertices = new Float32Array(radialSegments * bands * 18);
  const uvs = new Float32Array(radialSegments * bands * 12);
  let vOut = 0;
  let uOut = 0;

  for (let b = 0; b < bands; b++) {
    const r0 = rings[b];
    const r1 = rings[b + 1];
    for (let s = 0; s < radialSegments; s++) {
      const u0 = s / radialSegments;
      const u1 = (s + 1) / radialSegments;
      const a0 = u0 * Trigo.pi * 2;
      const a1 = u1 * Trigo.pi * 2;
      const c0 = Math.cos(a0);
      const s0 = Math.sin(a0);
      const c1 = Math.cos(a1);
      const s1 = Math.sin(a1);

      const corners = [
        c0 * r0.r, r0.y, s0 * r0.r,
        c1 * r0.r, r0.y, s1 * r0.r,
        c1 * r1.r, r1.y, s1 * r1.r,
        c0 * r1.r, r1.y, s0 * r1.r,
      ];
      const cornerUvs = [
        u0, r0.v,
        u1, r0.v,
        u1, r1.v,
        u0, r1.v,
      ];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        vertices[vOut++] = corners[k * 3];
        vertices[vOut++] = corners[k * 3 + 1];
        vertices[vOut++] = corners[k * 3 + 2];
        uvs[uOut++] = cornerUvs[k * 2];
        uvs[uOut++] = cornerUvs[k * 2 + 1];
      }
    }
  }
  return { vertices, uvs };
}

export const MARS_SKY_VERTEX = marsSkyShader.vertex;

export const MARS_SKY_FRAGMENT = marsSkyShader.fragment;
