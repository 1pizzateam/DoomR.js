import { Utils, Vec2 } from '@1pizzateam/spock';
import { mulberry32 } from './rng.js';
import { TILE } from './level.js';
import { field, GLOW, LIGHT, METAL, mix, periodicField, plate, rivet, SHADOW, Tile, TILE_PIXELS } from './floor.js';

const scratchPt = new Vec2();
const scratchTile = new Vec2();

/**
 * The walls of an old space base: riveted steel bulkhead panels, vents, pipe runs, light strips, a console and the
 * green-lit exit hatch, in a pixel-art atlas drawn here in code. One cell is one 64 x 64 world-unit piece of wall
 * rendered at 256 x 256 texels (4 texels per world unit). The rust is not in the pictures: the shader of the doors
 * rusts the walls too, in the same many small patches, thicker low down.
 */

export const WALL_CELLS = { plain: 0, vent: 1, pipes: 2, lights: 3, console: 4, exit: 5, top: 6, seam: 7 };
export const WALL_CELL_COUNT = 8;
const SIZE = TILE_PIXELS;

const SIGNAL = [70, 230, 150];
const FRAME = [20, 26, 40];

/** A bevelled recess or boss: light on one pair of edges, dark on the other, drawn at native 256x256 precision. */
function bevel(t, x0, y0, w, h, rise = true) {
  const s = t.scale;
  const [a, b] = rise ? [LIGHT, SHADOW] : [SHADOW, LIGHT];
  const px0 = Math.round(x0 * s);
  const py0 = Math.round(y0 * s);
  const pw = Math.round(w * s);
  const ph = Math.round(h * s);
  for (let dx = 0; dx < pw; dx++) {
    const px = px0 + dx;
    t.setRaw(px, py0, SHADOW, 0.88);
    t.setRaw(px, py0 + 1, a, 0.85);
    t.setRaw(px, py0 + 2, a, 0.48);
    t.setRaw(px, py0 + 3, a, 0.2);
    t.setRaw(px, py0 + ph - 4, b, 0.22);
    t.setRaw(px, py0 + ph - 3, b, 0.52);
    t.setRaw(px, py0 + ph - 2, b, 0.88);
    t.setRaw(px, py0 + ph - 1, SHADOW, 0.96);
  }
  for (let dy = 0; dy < ph; dy++) {
    const py = py0 + dy;
    t.setRaw(px0, py, SHADOW, 0.85);
    t.setRaw(px0 + 1, py, a, 0.72);
    t.setRaw(px0 + 2, py, a, 0.4);
    t.setRaw(px0 + 3, py, a, 0.16);
    t.setRaw(px0 + pw - 4, py, b, 0.22);
    t.setRaw(px0 + pw - 3, py, b, 0.52);
    t.setRaw(px0 + pw - 2, py, b, 0.88);
    t.setRaw(px0 + pw - 1, py, SHADOW, 0.96);
  }
}

/**Draws a horizontal machined seam groove with top shadow, bottom specular lip, and soft ambient occlusion. */
function horizontalSeam(t, yLog, strength = 1) {
  const s = t.scale;
  const py = Math.round(yLog * s);
  for (let px = 0; px < t.width; px++) {
    t.setRaw(px, py - 2, SHADOW, 0.25 * strength);
    t.setRaw(px, py - 1, SHADOW, 0.62 * strength);
    t.setRaw(px, py, SHADOW, 0.95 * strength);
    t.setRaw(px, py + 1, SHADOW, 0.88 * strength);
    t.setRaw(px, py + 2, LIGHT, 0.68 * strength);
    t.setRaw(px, py + 3, LIGHT, 0.34 * strength);
    t.setRaw(px, py + 4, LIGHT, 0.14 * strength);
  }
}

/** The bulkhead: two stacked plates, a crown molding at the top, and an embossed diamond-tread kick plate at the foot, riveted. */
function bulkhead(t, rnd) {
  const s = t.scale;
  plate(t, 0, 0, 64, 64, rnd, mix(METAL, FRAME, 0.25));
  // Upper crown molding & recessed cable raceway trim (y = 0..4.5)
  for (let py = 0; py < Math.round(4.5 * s); py++)
    for (let px = 0; px < t.width; px++)
      t.setRaw(px, py, mix(METAL, SHADOW, 0.28), 0.55);
  horizontalSeam(t, 4, 0.85);
  // Central interlocking horizontal bulkhead joint (y = 31.5)
  horizontalSeam(t, 31.5, 1.0);
  // Heavy armored kick-plate at the foot (y = 56..64) with diamond-tread embossing & vertical stiffener ribs
  horizontalSeam(t, 56.5, 0.95);
  for (let py = 57 * s; py < t.height; py++)
    for (let px = 0; px < t.width; px++) {
      const rib = (px % (8 * s)) < 3;
      const cellX = px % 12;
      const cellY = py % 12;
      const tread = (Math.abs(cellX - cellY) <= 1 || Math.abs(cellX + cellY - 11) <= 1) && cellX > 2 && cellX < 9;
      let col = mix(METAL, SHADOW, 0.46);
      if (rib)
        col = (px % (8 * s)) === 0 ? mix(METAL, LIGHT, 0.25) : mix(METAL, SHADOW, 0.72);
      else if (tread)
        col = mix(METAL, LIGHT, 0.14);
      t.setRaw(px, py, col, 0.92);
    }
  // Crisp vertical expansion joints at the left and right edges so neighbouring cells read as separate panels
  for (let py = 0; py < t.height; py++) {
    t.setRaw(0, py, SHADOW, 0.96);
    t.setRaw(1, py, SHADOW, 0.78);
    t.setRaw(2, py, LIGHT, 0.52);
    t.setRaw(3, py, LIGHT, 0.24);
    t.setRaw(t.width - 4, py, SHADOW, 0.24);
    t.setRaw(t.width - 3, py, SHADOW, 0.55);
    t.setRaw(t.width - 2, py, SHADOW, 0.85);
    t.setRaw(t.width - 1, py, SHADOW, 0.96);
  }
  for (const [x, y] of [[4, 6], [57, 6], [4, 24], [57, 24], [4, 35], [57, 35], [4, 50], [57, 50]])
    rivet(t, x, y);
}

function drawPlain(t, rnd) {
  bulkhead(t, rnd);
  const s = t.scale;
  // Fine hairline wear scratches across the steel plates
  for (let k = 0; k < 8; k++) {
    const x = 6 + Math.floor(rnd() * 50);
    const y = 8 + Math.floor(rnd() * 44);
    const len = (2 + Math.floor(rnd() * 5)) * s;
    const px0 = x * s;
    const py0 = y * s;
    for (let i = 0; i < len; i++) {
      const fade = Math.sin((i / len) * Math.PI);
      t.setRaw(px0 + i, py0 + (i >> 1), SHADOW, 0.42 * fade);
      t.setRaw(px0 + i, py0 + (i >> 1) + 1, LIGHT, 0.45 * fade);
    }
  }
  // Vertical stiffener flutes flanking the upper inspection bay
  for (const fx of [13, 49])
    bevel(t, fx, 9, 3, 19, false);
  // Recessed upper inspection hatch & engraved UAC data plaque
  bevel(t, 20, 11, 24, 15, false);
  for (let py = 12 * s; py < 25 * s; py++)
    for (let px = 21 * s; px < 43 * s; px++)
      t.setRaw(px, py, SHADOW, 0.18);
  // Riveted metallic data badge inside the lower panel (x = 24..40, y = 38..46)
  bevel(t, 24, 38, 16, 8, true);
  for (let row = 0; row < 3; row++) {
    const py = (40 + row * 2) * s;
    for (let px = 26 * s; px < 38 * s; px++)
      if (((px * 7 + row * 13) % 5) !== 0)
        t.setRaw(px, py, LIGHT, 0.35);
  }
}

function drawVent(t, rnd) {
  bulkhead(t, rnd);
  const s = t.scale;
  // Outer raised vent collar (11..53, 8..50) and dark recessed intake well
  bevel(t, 11, 8, 42, 42, true);
  for (let py = 11 * s; py < 47 * s; py++)
    for (let px = 14 * s; px < 50 * s; px++)
      t.setRaw(px, py, SHADOW, 0.94);
  // Angled 3D aerodynamic louver blades with top specular lip, curved face, and deep underside slot shadow
  const slatPitch = 4 * s;
  for (let py = 12 * s; py < 46 * s; py++) {
    const phase = (py - 12 * s) % slatPitch;
    const tSlat = phase / slatPitch;
    for (let px = 15 * s; px < 49 * s; px++) {
      if (tSlat < 0.28) {
        // Dark air intake gap with subtle wire screen mesh inside
        const mesh = ((px + py) & 3) === 0 ? 0.16 : 0.04;
        t.setRaw(px, py, mix(SHADOW, METAL, mesh), 0.98);
      } else if (tSlat < 0.42) {
        // Bright top leading edge of angled louver slat
        t.setRaw(px, py, mix(METAL, LIGHT, 0.68), 0.95);
      } else {
        // Sloped louver face darkening toward the bottom trailing edge
        const slope = (tSlat - 0.42) / 0.58;
        t.setRaw(px, py, mix(mix(METAL, LIGHT, 0.38), SHADOW, slope * 0.78), 0.95);
      }
    }
  }
  // Central vertical structural mullion bar dividing the louver grille into twin bays
  for (let py = 11 * s; py < 47 * s; py++) {
    t.setRaw(31 * s - 1, py, SHADOW, 0.85);
    t.setRaw(31 * s, py, LIGHT, 0.58);
    for (let dx = 1; dx < 2 * s - 1; dx++)
      t.setRaw(31 * s + dx, py, mix(METAL, LIGHT, 0.22), 0.95);
    t.setRaw(33 * s - 1, py, SHADOW, 0.9);
  }
  bevel(t, 14, 11, 36, 36, false);
  for (const [x, y] of [[13, 10], [48, 10], [13, 45], [48, 45]])
    rivet(t, x, y);
}

function drawPipes(t, rnd) {
  bulkhead(t, rnd);
  const s = t.scale;
  // Recessed dark pipe chase channel behind the vertical pipes (x = 10..55, y = 6..54)
  bevel(t, 10, 6, 45, 48, false);
  for (let py = 7 * s; py < 53 * s; py++)
    for (let px = 11 * s; px < 54 * s; px++)
      t.setRaw(px, py, SHADOW, 0.42);

  for (const x of [13, 27, 46]) {
    const w = x === 27 ? 9 : 6;
    const cx = (x + w * 0.5) * s;
    const rad = w * 0.5 * s;
    // Drop shadow cast to the right of each vertical pipe
    for (let py = 0; py < 56 * s; py++)
      for (let dx = 1; dx <= s + 2; dx++)
        t.setRaw(Math.round(cx + rad) + dx, py, SHADOW, (1 - dx / (s + 3)) * 0.68);
    // 3D cylindrical pipe body with off-center specular highlight and rim bounce light
    for (let px = Math.round(x * s); px < Math.round((x + w) * s); px++) {
      const nx = (px + 0.5 - cx) / rad;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
      const spec = Math.pow(Math.max(0, -nx * 0.48 + nz * 0.87), 3.2);
      const col = mix(
        mix(SHADOW, METAL, 0.18 + nz * 0.78),
        LIGHT,
        Utils.clamp(spec * 0.82 + (nx > 0.7 ? (nx - 0.7) * 0.35 : 0), 0, 0.95)
      );
      for (let py = 0; py < 56 * s; py++) {
        // Subtle horizontal brushed-metal ring grain along the pipe
        const ring = (((py * 17) & 7) - 3.5) * 1.1;
        t.setRaw(px, py, [col[0] + ring, col[1] + ring, col[2] + ring * 1.1], 0.98);
      }
    }
    // Machined U-bolt pipe clamps & flanged couplings at y = 8, 28, 46
    for (const y of [8, 28, 46]) {
      const py0 = y * s;
      const ph = 3 * s;
      const px0 = Math.round((x - 1.25) * s);
      const pw = Math.round((w + 2.5) * s);
      for (let py = py0; py < py0 + ph; py++)
        for (let px = px0; px < px0 + pw; px++) {
          const nx = (px - cx) / (pw * 0.5);
          const cyl = Math.sqrt(Math.max(0, 1 - nx * nx));
          const topBottom = py < py0 + 2 ? LIGHT : py >= py0 + ph - 2 ? SHADOW : mix(METAL, LIGHT, 0.25 + cyl * 0.55);
          t.setRaw(px, py, topBottom, 0.96);
        }
      for (let px = px0; px < px0 + pw; px++) {
        t.setRaw(px, py0 + ph, SHADOW, 0.88);
        t.setRaw(px, py0 + ph + 1, SHADOW, 0.45);
      }
    }
  }
  // Circular shutoff handwheel on the central main pipe at (31.5, 20.5)
  const vcx = 31.5 * s;
  const vcy = 20.5 * s;
  const vRad = 5.2 * s;
  for (let py = Math.floor(vcy - vRad - 2); py <= Math.ceil(vcy + vRad + 2); py++)
    for (let px = Math.floor(vcx - vRad - 2); px <= Math.ceil(vcx + vRad + 2); px++) {
      const dx = px - vcx;
      const dy = py - vcy;
      const r = Math.hypot(dx, dy) / s;
      if (r > 5.4)
        continue;
      const ang = Math.atan2(dy, dx);
      const spoke = Math.abs(Math.sin(ang * 2)) * r < 0.65 && r < 4.5;
      const rim = r >= 3.8 && r <= 5.0;
      const hub = r < 1.6;
      if (hub || rim || spoke) {
        const shade = hub ? 0.82 : rim ? 1 - Math.abs(r - 4.4) / 0.7 : 0.65;
        t.setRaw(px, py, mix(SHADOW, LIGHT, Utils.clamp(0.35 + shade * 0.58, 0.2, 0.95)), 0.96);
      } else if (r <= 5.3) {
        t.setRaw(px, py, SHADOW, 0.55);
      }
    }
}

function drawLights(t, rnd) {
  bulkhead(t, rnd);
  const s = t.scale;
  for (const x of [18, 44]) {
    // Recessed armored sconce housing (x - 2.5 .. x + 6.5, y = 7..54)
    bevel(t, x - 3, 7, 10, 47, false);
    const px0 = (x - 2) * s;
    const px1 = (x + 6) * s;
    const py0 = 8 * s;
    const py1 = 53 * s;
    for (let py = py0; py < py1; py++)
      for (let px = px0; px < px1; px++) {
        const lx = (px + 0.5) / s;
        const ly = (py + 0.5) / s;
        // Top and bottom socket end-caps
        if (ly < 10.2 || ly >= 50.8) {
          const capEdge = Math.abs(ly - 10.2) < 0.5 || Math.abs(ly - 50.8) < 0.5;
          t.setRaw(px, py, capEdge ? LIGHT : mix(SHADOW, METAL, 0.35), 0.95);
          continue;
        }
        // Horizontal protective cage ribs every 8 logical units
        const cageDist = Math.abs(((ly - 10) % 8) - 4);
        if (cageDist < 0.38) {
          t.setRaw(px, py, mix(SHADOW, GLOW, 0.32), 0.92);
          continue;
        }
        // Smooth cylindrical neon/fluorescent tube core centered at x + 2
        const dx = Math.abs(lx - (x + 2));
        const tube = Math.max(0, 1 - dx / 3.8);
        const core = Math.pow(tube, 1.5);
        const col = mix(GLOW, [224, 240, 255], core * 0.45);
        const alpha = 0.14 + 0.84 * core;
        t.setRaw(px, py, col, alpha);
      }
  }
}

function drawConsole(t, rnd) {
  bulkhead(t, rnd);
  const s = t.scale;
  // Sunken terminal bay (9..55, 9..49)
  bevel(t, 9, 9, 46, 40, false);
  for (let py = 10 * s; py < 48 * s; py++)
    for (let px = 10 * s; px < 54 * s; px++)
      t.setRaw(px, py, mix(SHADOW, METAL, 0.22), 0.85);

  // Dark CRT/phosphor monitor screen with subtle scanlines and coordinate grid (12..52, 12..31)
  const sx0 = 12 * s;
  const sx1 = 52 * s;
  const sy0 = 12 * s;
  const sy1 = 31 * s;
  for (let py = sy0; py < sy1; py++)
    for (let px = sx0; px < sx1; px++) {
      const scanline = (py & 1) === 0 ? 0.96 : 0.88;
      const grid = ((px - sx0) % (5 * s) === 0 || (py - sy0) % (4 * s) === 0) && ((px + py) & 1) === 0;
      const col = grid ? mix(SHADOW, SIGNAL, 0.16) : SHADOW;
      t.setRaw(px, py, col, scanline);
    }

  // Crisp anti-aliased dual telemetry waveform traces across the CRT screen
  for (let px = sx0 + 4; px < sx1 - 4; px++) {
    const lx = (px + 0.5) / s;
    const wave1 = (21.5 + Math.sin(lx * 0.45) * 3.8 + Math.sin(lx * 1.3) * 1.9) * s;
    const wave2 = (22.5 + Math.cos(lx * 0.32 + 1.2) * 2.4) * s;
    for (let py = sy0 + 3; py < sy1 - 3; py++) {
      const d1 = Math.abs(py - wave1);
      const d2 = Math.abs(py - wave2);
      if (d1 < 2.6) {
        const intensity = Math.pow(1 - d1 / 2.6, 1.4);
        t.setRaw(px, py, mix(SIGNAL, [200, 255, 225], intensity * 0.45), 0.25 + 0.72 * intensity);
      } else if (d2 < 1.8) {
        t.setRaw(px, py, GLOW, (1 - d2 / 1.8) * 0.55);
      }
    }
  }
  bevel(t, 12, 12, 40, 19, false);

  // Row of 8 beveled status indicator LEDs with soft glow halos at y = 34..37
  for (let i = 0; i < 8; i++) {
    const lit = (i * 5 + 3) % 7 < 4;
    const ledCol = i === 6 ? GLOW : SIGNAL;
    const lx0 = (13 + i * 5) * s;
    const ly0 = 34 * s;
    const lw = 3 * s;
    for (let py = ly0 - 2; py < ly0 + lw + 2; py++)
      for (let px = lx0 - 2; px < lx0 + lw + 2; px++) {
        const inBox = px >= lx0 && px < lx0 + lw && py >= ly0 && py < ly0 + lw;
        if (!inBox) {
          t.setRaw(px, py, lit ? ledCol : SHADOW, lit ? 0.22 : 0.75);
          continue;
        }
        const cx = (px - (lx0 + lw * 0.5)) / (lw * 0.5);
        const cy = (py - (ly0 + lw * 0.5)) / (lw * 0.5);
        const dome = Math.max(0, 1 - (cx * cx + cy * cy) * 0.65);
        const col = lit ? mix(ledCol, [220, 255, 240], dome * 0.45) : mix(SHADOW, METAL, 0.35 + dome * 0.25);
        t.setRaw(px, py, col, 0.95);
      }
  }

  // Tactile beveled control switches & keycaps along the lower console deck (y = 40..45)
  for (let i = 0; i < 4; i++) {
    const bx = 13 + i * 10;
    t.rect(bx, 40, 7, 5, mix(METAL, LIGHT, 0.38));
    bevel(t, bx, 40, 7, 5, true);
  }
}

/** The exit: a hatch outlined in green, with chevrons pointing in, lit. */
function drawExit(t, rnd) {
  bulkhead(t, rnd);
  const s = t.scale;
  // Recessed dark blast-hatch well (10..54, 8..52) with vertical armor ribs
  for (let py = 8 * s; py < 52 * s; py++)
    for (let px = 10 * s; px < 54 * s; px++) {
      const rib = ((px - 10 * s) % (6 * s)) < 2;
      t.setRaw(px, py, rib ? mix(SHADOW, METAL, 0.25) : SHADOW, 0.92);
    }
  bevel(t, 10, 8, 44, 44, false);

  // Glowing emerald-green perimeter channel with soft inner/outer halo (10..53, 8..51)
  const bx0 = 10 * s;
  const bx1 = 54 * s - 1;
  const by0 = 8 * s;
  const by1 = 52 * s - 1;
  for (let py = by0 - 3; py <= by1 + 3; py++)
    for (let px = bx0 - 3; px <= bx1 + 3; px++) {
      const dX = px < bx0 ? bx0 - px : px > bx1 ? px - bx1 : 0;
      const dY = py < by0 ? by0 - py : py > by1 ? py - by1 : 0;
      const onVert = px >= bx0 && px <= bx1 && Math.min( Math.abs(py - by0), Math.abs(py - by1) ) <= 3;
      const onHoriz = py >= by0 && py <= by1 && Math.min( Math.abs(px - bx0), Math.abs(px - bx1) ) <= 3;
      if (!onVert && !onHoriz && dX + dY > 0)
        continue;
      const dist = Math.min(
        Math.hypot(dX, Math.abs(py - by0)),
        Math.hypot(dX, Math.abs(py - by1)),
        Math.hypot(Math.abs(px - bx0), dY),
        Math.hypot(Math.abs(px - bx1), dY)
      );
      if (dist <= 3.2) {
        const core = 1 - dist / 3.2;
        t.setRaw(px, py, mix(SIGNAL, [210, 255, 230], core * 0.45), 0.35 + 0.63 * core);
      }
    }

  // Three razor-sharp 45° illuminated chevron arrows pointing inward
  for (const y0 of [15.5, 27.5, 39.5])
    for (let py = Math.floor((y0 - 2) * s); py < Math.ceil((y0 + 10) * s); py++)
      for (let px = 16 * s; px < 48 * s; px++) {
        const lx = (px + 0.5) / s;
        const ly = (py + 0.5) / s;
        for (const [xStart, strength] of [[18, 0.96], [32, 0.48]]) {
          const k = lx - xStart;
          if (k < 0 || k > 14)
            continue;
          const apexDist = k < 7 ? k : 14 - k;
          const targetY = y0 + apexDist / 1.4;
          const dy = ly - targetY;
          if (dy >= -0.35 && dy <= 3.15) {
            const centerDist = Math.abs(dy - 1.4) / 1.75;
            const core = Math.max(0, 1 - centerDist);
            const col = mix(SIGNAL, [215, 255, 235], core * 0.38);
            t.setRaw(px, py, col, strength * (0.45 + 0.55 * core));
          }
        }
      }
}

/** The top of a low wall or a pillar: machined cap plate with expansion grooves and bevelled edge. */
function drawTop(t, rnd) {
  plate(t, 0, 0, 64, 64, rnd, mix(METAL, SHADOW, 0.2));
  const s = t.scale;
  bevel(t, 3, 3, 58, 58, false);
  for (let i = 8; i < 56; i += 8) {
    const py = i * s;
    for (let px = 4 * s; px < 60 * s; px++) {
      t.setRaw(px, py - 1, SHADOW, 0.45);
      t.setRaw(px, py, SHADOW, 0.85);
      t.setRaw(px, py + 1, LIGHT, 0.42);
    }
  }
  rivet(t, 4, 4);
  rivet(t, 57, 4);
  rivet(t, 4, 57);
  rivet(t, 57, 57);
}

/** Two bulkhead plates meeting: for the upper part of a tall wall, so it is not a repeat of the lower one. */
function drawSeam(t, rnd) {
  bulkhead(t, rnd);
  horizontalSeam(t, 12.5, 0.95);
  bevel(t, 10, 16, 44, 12, false);
  for (const x of [12, 31, 49])
    rivet(t, x, 9);
}

const DRAW = [drawPlain, drawVent, drawPipes, drawLights, drawConsole, drawExit, drawTop, drawSeam];

/** The atlas as RGBA pixels, ready to be a texture; its size is a power of two, so it can have mipmaps. */
export function wallAtlas() {
  const width = SIZE * WALL_CELL_COUNT;
  const data = new Uint8Array(width * SIZE * 4);
  DRAW.forEach((draw, cell) => {
    const t = new Tile(SIZE, SIZE, SIZE / 64);
    draw(t, mulberry32(9000 + cell * 7919));
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 3;
        const o = (y * width + cell * SIZE + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(t.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name: 'wall', data, width, height: SIZE, cell: SIZE, frames: WALL_CELL_COUNT };
}

// ---- Martian rock cliff walls (E1M5 Red Planet) --------------------------------------------------------------------

const ROCK_ABYSS = [28, 11, 6];
const ROCK_DARK = [54, 20, 10];
const ROCK_BASALT = [42, 26, 22];
const ROCK_BASE = [126, 52, 24];
const ROCK_LIGHT = [178, 86, 38];
const ROCK_OCHRE = [204, 108, 48];


function periodicGrain(x, y) {
  const ix = ((x % SIZE) + SIZE) % SIZE;
  const iy = ((y % SIZE) + SIZE) % SIZE;
  let h = Math.imul(ix * 374761393 ^ iy * 668265263, 1274126177);
  h ^= h >>> 13;
  return (((Math.imul(h, 1911520717) >>> 0) % 1000) / 1000) - 0.5;
}

/** Smooth 0..1 mask that is 0 at all four tile borders (`x = 0, SIZE-1`, `y = 0, SIZE-1`) and 1 in the tile interior. */
function edgeMask(x, y, margin = 4) {
  const S = SIZE / 64;
  const mx = Math.min(x, SIZE - 1 - x);
  const my = Math.min(y, SIZE - 1 - y);
  return Utils.smoothstep(0, margin * S, mx) * Utils.smoothstep(0, margin * S, my);
}

function wrapCoord(v) {
  return ((Math.round(v) % SIZE) + SIZE) % SIZE;
}

function createSharedRockTile() {
  const S = SIZE / 64;
  const baseRnd = mulberry32(51000);
  const warpX = periodicField(baseRnd, 3, SIZE);
  const warpY = periodicField(baseRnd, 3, SIZE);
  const coarse = periodicField(baseRnd, 3, SIZE);
  const medium = periodicField(baseRnd, 6, SIZE);
  const fine = periodicField(baseRnd, 12, SIZE);
  const micro = periodicField(baseRnd, 24, SIZE);
  const tile = new Tile(SIZE, SIZE);

  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      // Domain-warped periodic coordinates matching the floor regolith (no linear sine stripes)
      const wx = x + (warpX(x, y) - 0.5) * 20 * S;
      const wy = y + (warpY(x, y) - 0.5) * 20 * S;
      const c = coarse(wx, wy);
      const m = medium(wx + 11 * S, wy + 7 * S);
      const f = fine(x, y) * 0.68 + micro(x, y) * 0.32;
      const ridge = 1 - Math.abs((coarse(wx + 23 * S, wy + 37 * S) - 0.5) * 2);
      const crag = 1 - Math.abs((medium(wx + 17 * S, wy + 29 * S) - 0.5) * 2);
      const shade = c * 0.42 + m * 0.34 + f * 0.24;
      let col = mix(ROCK_DARK, ROCK_BASE, Utils.clamp(shade * 1.15, 0, 1));
      col = mix(col, ROCK_LIGHT, ridge * 0.36 + crag * 0.14 + (f - 0.5) * 0.24);
      if (shade > 0.62 && ridge > 0.54)
        col = mix(col, ROCK_OCHRE, Utils.clamp((shade - 0.62) * 1.65, 0, 0.92));
      else if (shade < 0.34 && crag < 0.32)
        col = mix(col, ROCK_ABYSS, Utils.clamp((0.34 - shade) * 1.8, 0, 0.78));

      const grain = periodicGrain(x, y) * 14;
      tile.set(x, y, [col[0] + grain, col[1] + grain * 0.7, col[2] + grain * 0.45]);
    }

  // Fine, irregular mineral clasts & micro-grit (kept at 1.5..3.8 texel scale with soft polygonal falloff, never large ringed ovals)
  for (let k = 0; k < 36; k++) {
    const px = baseRnd() * SIZE;
    const py = baseRnd() * SIZE;
    const rx = 1.4 + baseRnd() * 2.4;
    const ry = 1.2 + baseRnd() * 2.0;
    const p1 = baseRnd() * Math.PI * 2;
    const p2 = baseRnd() * Math.PI * 2;
    const basalt = baseRnd() < 0.48;
    const rockCol = basalt ? mix(ROCK_BASALT, ROCK_DARK, 0.35) : mix(ROCK_BASE, ROCK_LIGHT, 0.5);
    const rCeil = Math.ceil(Math.max(rx, ry) * 1.35) + 1;
    for (let dy = -rCeil; dy <= rCeil; dy++)
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        const ang = Math.atan2(dy, dx);
        const facet = 1 + 0.24 * Math.cos(ang * 3 + p1) + 0.14 * Math.sin(ang * 5 + p2);
        const d = scratchPt.setScalar(dx / rx, dy / ry).getMagnitude() / facet;
        if (d >= 1.0)
          continue;
        const wx = wrapCoord(px + dx);
        const wy = wrapCoord(py + dy);
        const falloff = (1 - d) * (1 - d);
        const dirLit = Utils.clamp((-dx / rx - dy / ry) * 0.32, -0.35, 0.38);
        const c = dirLit >= 0 ? mix(rockCol, ROCK_OCHRE, dirLit) : mix(rockCol, ROCK_ABYSS, -dirLit);
        tile.set(wx, wy, k === 0 && d < 0.45 ? ROCK_ABYSS : c, (k === 0 && d < 0.45 ? 0.85 : 0.48) * falloff);
      }
  }

  return tile;
}

let sharedRockTile = null;

function rockCliffBase(t) {
  sharedRockTile ??= createSharedRockTile();
  t.pixels.set(sharedRockTile.pixels);
}

function scatterRockNodules(t, rnd, count, maxRadius = 3.4) {
  const S = SIZE / 64;
  for (let k = 0; k < count * 2; k++) {
    const px = 6 * S + rnd() * (SIZE - 12 * S);
    const py = 6 * S + rnd() * (SIZE - 12 * S);
    const rx = 1.5 + rnd() * (maxRadius * 1.15);
    const ry = 1.2 + rnd() * (maxRadius * 0.9);
    const p1 = rnd() * Math.PI * 2;
    const p2 = rnd() * Math.PI * 2;
    const basalt = rnd() < 0.48;
    const rockCol = basalt ? mix(ROCK_BASALT, ROCK_DARK, 0.35) : mix(ROCK_BASE, ROCK_LIGHT, 0.55);
    const rCeil = Math.ceil(Math.max(rx, ry) * 1.35) + 1;
    for (let dy = -rCeil; dy <= rCeil; dy++)
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        const x = Math.round(px + dx);
        const y = Math.round(py + dy);
        const mask = edgeMask(x, y, 5);
        if (mask <= 0.01)
          continue;
        const ang = Math.atan2(dy, dx);
        const facet = 1 + 0.25 * Math.cos(ang * 3 + p1) + 0.16 * Math.sin(ang * 5 + p2);
        const d = scratchPt.setScalar(dx / rx, dy / ry).getMagnitude() / facet;
        if (d >= 1.0)
          continue;
        const falloff = (1 - d) * (1 - d);
        const dirLit = Utils.clamp((-dx / rx - dy / ry) * 0.35, -0.38, 0.42);
        const c = dirLit >= 0 ? mix(rockCol, ROCK_OCHRE, dirLit) : mix(rockCol, ROCK_DARK, -dirLit);
        t.set(x, y, c, 0.52 * falloff * mask);
      }
  }
}

function carveRockCracks(t, rnd, count) {
  const S = SIZE / 64;
  const bend = periodicField(rnd, 3, SIZE);
  const microBend = periodicField(rnd, 9, SIZE);
  for (let k = 0; k < count; k++) {
    const xBase = (10 + rnd() * 44) * S;
    const y0 = Math.round((6 + rnd() * 6) * S);
    const y1 = Math.round((58 - rnd() * 6) * S);
    const span = Math.max(1, y1 - y0);
    const seedX = rnd() * SIZE;
    for (let y = y0; y < y1; y++) {
      const progress = (y - y0) / span;
      const taper = Math.sin(progress * Math.PI);
      const offset = (bend(seedX, y) - 0.5) * 14 * S + (microBend(seedX + 37, y) - 0.5) * 3.5 * S;
      const cx = Utils.clamp(xBase + offset, 7 * S, SIZE - 8 * S);
      const xInt = Math.round(cx);
      const mask = edgeMask(xInt, y, 5) * taper;
      if (mask <= 0.02)
        continue;
      const halfW = 1.2 + taper * 1.4;
      const rSpan = Math.ceil(halfW) + 2;
      for (let dx = -rSpan; dx <= rSpan; dx++) {
        const dist = (xInt + dx - cx) / halfW;
        const ad = Math.abs(dist);
        if (ad < 0.75) {
          t.set(xInt + dx, y, ROCK_ABYSS, (1 - ad / 0.75) * 0.78 * mask);
        } else if (ad < 1.6) {
          const rimFade = 1 - (ad - 0.75) / 0.85;
          const rimCol = dist > 0 ? ROCK_OCHRE : ROCK_DARK;
          t.set(xInt + dx, y, rimCol, rimFade * (dist > 0 ? 0.28 : 0.42) * mask);
        }
      }
    }
  }
}

function drawRockPlain(t, rnd) {
  rockCliffBase(t);
  const drift = periodicField(rnd, 3, SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const mask = edgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const d = drift(x, y);
      if (d > 0.56)
        t.set(x, y, ROCK_LIGHT, (d - 0.56) * 0.95 * mask);
      else if (d < 0.42)
        t.set(x, y, ROCK_DARK, (0.42 - d) * 0.75 * mask);
    }
  scatterRockNodules(t, rnd, 9, 2.4);
}

function drawRockFissures(t, rnd) {
  const S = SIZE / 64;
  rockCliffBase(t);
  const warpX = periodicField(rnd, 3, SIZE);
  const warpY = periodicField(rnd, 3, SIZE);
  const strata = periodicField(rnd, 4, SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const mask = edgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const wx = x + (warpX(x, y) - 0.5) * 22 * S;
      const wy = y + (warpY(x, y) - 0.5) * 22 * S;
      const ridge = 1 - Math.abs((strata(wx, wy) - 0.5) * 2);
      if (ridge > 0.64)
        t.set(x, y, ROCK_OCHRE, (ridge - 0.64) * 1.45 * mask);
      else if (ridge < 0.35)
        t.set(x, y, ROCK_DARK, (0.35 - ridge) * 1.35 * mask);
    }
  scatterRockNodules(t, rnd, 10, 2.6);
}

function drawRockColumns(t, rnd) {
  const S = SIZE / 64;
  rockCliffBase(t);
  const patch = periodicField(rnd, 3, SIZE);
  const detail = periodicField(rnd, 8, SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const mask = edgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const p = patch(x, y) * 0.75 + detail(x, y) * 0.25;
      if (p > 0.52) {
        const edge = Math.min(1, (p - 0.52) * 4.6) * mask;
        const vein = detail(x + 13 * S, y + 7 * S) > 0.62 ? ROCK_OCHRE : detail(x + 5 * S, y + 19 * S) < 0.38 ? ROCK_DARK : ROCK_BASALT;
        t.set(x, y, mix(ROCK_BASE, vein, 0.74), edge * 0.82);
      }
    }
  scatterRockNodules(t, rnd, 14, 3.0);
}

function drawRockMagmaVeins(t, rnd) {
  const S = SIZE / 64;
  rockCliffBase(t);
  carveRockCracks(t, rnd, 3);
  const sway = periodicField(rnd, 3, SIZE);
  const jag = periodicField(rnd, 8, SIZE);
  for (const [xStart, seed] of [[21 * S, 19], [43 * S, 97]]) {
    const y0 = 7 * S;
    const y1 = 57 * S;
    const span = y1 - y0;
    for (let y = y0; y < y1; y++) {
      const progress = (y - y0) / span;
      const taper = Math.sin(progress * Math.PI);
      const bend = (sway(seed * S, y) - 0.5) * 18 * S + (jag(seed * S + 41, y) - 0.5) * 4.5 * S;
      const cx = Utils.clamp(xStart + bend, 8 * S, SIZE - 8 * S);
      const xInt = Math.round(cx);
      const mask = edgeMask(xInt, y, 5) * taper;
      if (mask <= 0.01)
        continue;
      const widthScale = (0.45 + 0.55 * jag(xInt, y)) * taper;
      const halfSpan = Math.ceil(1.6 * S);
      for (let dx = -halfSpan; dx <= halfSpan; dx++) {
        const ad = Math.abs(xInt + dx - cx) / (S * Math.max(0.35, widthScale));
        if (ad < 0.42)
          t.set(xInt + dx, y, [242, 136, 48], (1 - ad / 0.42) * 0.72 * mask);
        else if (ad < 1.05)
          t.set(xInt + dx, y, [196, 68, 22], (1 - (ad - 0.42) / 0.63) * 0.52 * mask);
        else if (ad < 1.65)
          t.set(xInt + dx, y, ROCK_DARK, (1 - (ad - 1.05) / 0.6) * 0.58 * mask);
      }
    }
  }
  scatterRockNodules(t, rnd, 10, 2.5);
}

function drawRockAlcove(t, rnd) {
  const S = SIZE / 64;
  rockCliffBase(t);
  const hollow = periodicField(rnd, 3, SIZE);
  const rim = periodicField(rnd, 6, SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const mask = edgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const h = hollow(x, y);
      if (h > 0.52) {
        const depth = Math.min(1, (h - 0.52) * 4.2) * mask;
        const ledge = rim(x + 9 * S, y + 15 * S) > 0.56 ? ROCK_OCHRE : ROCK_DARK;
        t.set(x, y, mix(ROCK_BASALT, ledge, 0.58), depth * 0.78);
      }
    }
  scatterRockNodules(t, rnd, 11, 2.8);
}

function drawRockExit(t) {
  const S = SIZE / 64;
  rockCliffBase(t);
  // Ancient rock-hewn monolith portal with glowing exit chevrons so the exit remains unmistakable outdoors
  t.rect(10 * S, 8 * S, 44 * S, 46 * S, ROCK_ABYSS, 0.9);
  for (let i = 0; i < 44 * S; i++) {
    t.rect(10 * S + i, 8 * S, 1, S, SIGNAL, 0.95);
    t.rect(10 * S + i, 53 * S, 1, S, SIGNAL, 0.95);
    t.rect(10 * S, 8 * S + i, S, 1, SIGNAL, 0.95);
    t.rect(53 * S, 8 * S + i, S, 1, SIGNAL, 0.95);
  }
  for (const y0 of [16, 28, 40])
    for (let k = 0; k < 14; k += 0.25) {
      const x = (32 - 14 + k) * S;
      const dy = k < 7 ? k : 13 - k;
      for (let w = 0; w < 3 * S; w++) {
        t.set(x, (y0 + dy / 1.4) * S + w, SIGNAL, 0.95);
        t.set(x + 14 * S, (y0 + dy / 1.4) * S + w, SIGNAL, 0.4);
      }
    }
}

function drawRockTop(t, rnd) {
  rockCliffBase(t);
  const scree = periodicField(rnd, 4, SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const mask = edgeMask(x, y, 5);
      if (mask <= 0.01)
        continue;
      const s = scree(x, y);
      if (s > 0.58)
        t.set(x, y, ROCK_OCHRE, (s - 0.58) * 1.15 * mask);
      else if (s < 0.38)
        t.set(x, y, ROCK_BASALT, (0.38 - s) * 1.25 * mask);
    }
  scatterRockNodules(t, rnd, 16, 3.4);
  carveRockCracks(t, rnd, 2);
}

function drawRockSeam(t, rnd) {
  rockCliffBase(t);
  const basin = periodicField(rnd, 3, SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const mask = edgeMask(x, y, 5);
      if (mask > 0.01 && basin(x, y) > 0.48)
        t.set(x, y, mix(ROCK_BASE, ROCK_OCHRE, 0.38), (basin(x, y) - 0.48) * 1.1 * mask);
    }
  scatterRockNodules(t, rnd, 12, 2.6);
  carveRockCracks(t, rnd, 4);
}

const MARS_ROCK_DRAW = [
  drawRockPlain,
  drawRockFissures,
  drawRockColumns,
  drawRockMagmaVeins,
  drawRockAlcove,
  drawRockExit,
  drawRockTop,
  drawRockSeam,
];

/**
 * 8-cell 2048x256 procedural Martian canyon rock & cliff wall atlas for `planet: 'mars'`.
 * Replaces riveted steel bulkheads, vents, pipes, and consoles with craggy red-orange rock strata and fissures.
 */
export function marsRockAtlas() {
  const width = SIZE * WALL_CELL_COUNT;
  const data = new Uint8Array(width * SIZE * 4);
  MARS_ROCK_DRAW.forEach((draw, cell) => {
    const t = new Tile(SIZE, SIZE);
    draw(t, mulberry32(51000 + cell * 9973));
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 3;
        const o = (y * width + cell * SIZE + x) * 4;
        for (let k = 0; k < 3; k++)
          data[o + k] = Utils.clamp(Math.round(t.pixels[i + k]), 0, 255);
        data[o + 3] = 255;
      }
  });
  return { name: 'marsRock', data, width, height: SIZE, cell: SIZE, frames: WALL_CELL_COUNT };
}

/** Texture coordinates of a cell, a hair inside its edges; `v0` and `v1` pick how much of it height-wise (0..1). */
export function wallCellUv(cell, v0 = 0, v1 = 1) {
  const inset = 0.25 / (SIZE * WALL_CELL_COUNT);
  return [cell / WALL_CELL_COUNT + inset, v0, (cell + 1) / WALL_CELL_COUNT - inset, v1];
}

/** Which cell goes on a tile's face (`tile` is a Vec2 grid position): the exit hatch on exits, otherwise a mix scattered by where the tile is. */
export function wallCellFor(tile, d, exit = false) {
  if (exit)
    return WALL_CELLS.exit;
  let h = Math.imul(tile.x * 73856093 ^ tile.y * 19349663 ^ d * 83492791, 2654435761);
  h ^= h >>> 15;
  const r = ((Math.imul(h, 2246822519) >>> 0) % 1000) / 1000;
  if (r < 0.5)
    return WALL_CELLS.plain;
  if (r < 0.64)
    return WALL_CELLS.vent;
  if (r < 0.78)
    return WALL_CELLS.pipes;
  if (r < 0.88)
    return WALL_CELLS.lights;
  return WALL_CELLS.console;
}

/**
 * The quads of one flat wall face, one per tile along it and per 64 units up it, each with its cell and the part of the
 * picture that fits. `face` is { axis, plane, from, to (tiles), base, top, tile (Vec2), d, exit }. Corners come back as in
 * `faceCorners`: bottom-left, bottom-right, top-right, top-left.
 */
export function wallFaceQuads({ axis, plane, from, to, base, top, tile, d, exit }) {
  const out = [];
  for (let a = from; a <= to; a++) {
    if (axis === 'x')
      scratchTile.setScalar(tile.x, a);
    else
      scratchTile.setScalar(a, tile.y);
    const cell = wallCellFor(scratchTile, d, exit);
    for (let y0 = base, step = 0; y0 < top - 1e-6; y0 += TILE, step++) {
      const y1 = Math.min(top, y0 + TILE);
      const part = (y1 - y0) / TILE;
      // the first piece is the picture from the bottom; a shorter one above shows its top, so the trim stays at the top
      const uv = step === 0 ? wallCellUv(cell, 0, part) : wallCellUv(WALL_CELLS.seam, 1 - part, 1);
      const a0 = a * TILE;
      const a1 = a0 + TILE;
      const corners = axis === 'x'
        ? [[plane, y0, a0], [plane, y0, a1], [plane, y1, a1], [plane, y1, a0]]
        : [[a0, y0, plane], [a1, y0, plane], [a1, y1, plane], [a0, y1, plane]];
      out.push({ corners: corners.flat(), uv });
    }
  }
  return out;
}

/**
 * The quads of one diagonal (45-degree) wall hypotenuse face, stacked 64 units at a time. `a` and `b` are
 * the Vec2 hypotenuse endpoints, `heights` is Vec2(base, top) and `tile` the Vec2 grid position.
 */
export function diagWallFaceQuads({ a, b, heights, tile, diag, exit }) {
  const out = [];
  const cell = wallCellFor(tile, 4 + diag, exit);
  for (let y0 = heights.x, step = 0; y0 < heights.y - 1e-6; y0 += TILE, step++) {
    const y1 = Math.min(heights.y, y0 + TILE);
    const part = (y1 - y0) / TILE;
    const uv = step === 0 ? wallCellUv(cell, 0, part) : wallCellUv(WALL_CELLS.seam, 1 - part, 1);
    const corners = [[a.x, y0, a.y], [b.x, y0, b.y], [b.x, y1, b.y], [a.x, y1, a.y]];
    out.push({ corners: corners.flat(), uv });
  }
  return out;
}
