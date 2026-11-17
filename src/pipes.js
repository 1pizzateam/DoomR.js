import { TILE } from './level.js';
import { PIPE_CLAMP_HEIGHT, PIPE_CLAMP_HEIGHTS, PIPE_IRON_ROWS, PIPE_RED_ROWS, PIPE_RUNS_PX, PIPE_WHEEL_Y, WALL_CELLS, wallCellFor } from './wall.js';
import { Vec2 } from '@1pizzateam/spock';

/**
 * Real 3D pipes for the "pipes" wall tile: three vertical runs standing off the wall, with clamps and brackets, and a
 * handwheel on the main one. Everything is plain quads, added to the same wall batch as the flat faces.
 *
 * The look is painted, not computed: each pipe has a strip in the pipes cell of the wall atlas (see `paintPipe` in wall.js)
 * with its steel, bolted flanges, iron clamps and the bands of paint that say what it carries, and a gentle dome in its
 * relief. Every facet is wrapped over the whole width of its strip, so the wall's own material maps (normal, occlusion,
 * rust) light the pipe exactly as they light the rest of the wall, and the dome rounds each flat facet.
 *
 * Positions are worked out on the wall as (s, n, y): s along the face, n out of the wall into the room, y up.
 */

/** The three vertical runs across a tile: centre along the face and radius, as in the old painting (world units). */
const PIPE_RUNS = PIPE_RUNS_PX.map(([x, w]) => ({ s: x + w / 2, r: w / 2 }));
/** Gap between the wall and the pipe's back. */
const PIPE_STANDOFF = 1.5;
const CLAMP_FLARE = 1.2;
const SIDES = 8;
const WHEEL_SEGMENTS = 12;

const CELL_WIDTH = 1 / 8;
const strip = (run, c) => WALL_CELLS.pipes * CELL_WIDTH + ((PIPE_RUNS_PX[run][0] + Math.min(0.98, Math.max(0.02, c)) * PIPE_RUNS_PX[run][1]) / 64) * CELL_WIDTH;
/** A tiny flat sample of one material in the middle of a strip, for the parts that are not wrapped (brackets, the wheel). */
const patch = (run, rows) => [strip(run, 0.45), rows[0] / 64, strip(run, 0.55), rows[1] / 64];
const IRON = PIPE_RUNS_PX.map((_, run) => patch(run, PIPE_IRON_ROWS));
const RED = patch(1, PIPE_RED_ROWS);

/**
 * The quads of the pipes on one tile's face, or none when the tile does not wear the pipes cell. `axis` is 'x' for a face
 * on a plane of constant x and 'z' for constant z; `a` is the tile's place along the face; `d` the side it faces (0 and 1 are
 * the x faces looking -x and +x, 2 and 3 the z faces looking -z and +z); `tile` is the tile that owns the face (Vec2).
 */
export function wallPipeQuads({ axis, plane, a, base, top, tile, d }) {
  const cellTile = axis === 'x' ? new Vec2(tile.x, a) : new Vec2(a, tile.y);
  if (wallCellFor(cellTile, d) !== WALL_CELLS.pipes)
    return [];
  const a0 = a * TILE;
  const sign = d === 1 || d === 3 ? 1 : -1;
  const out = [];
  const w = (s, n, y) => (axis === 'x' ? [plane + sign * n, y, a0 + s] : [a0 + s, y, plane + sign * n]);
  const quad = (p0, p1, p2, p3, uv) => out.push({ corners: [...p0, ...p1, ...p2, ...p3], uv });

  // a facet's picture runs across its whole strip, in the direction the facet runs along the wall, over the heights v0..v1
  const facetUv = (run, cosA, cosB, v0, v1) => (cosA >= cosB ? [strip(run, 1), v0, strip(run, 0), v1] : [strip(run, 0), v0, strip(run, 1), v1]);

  // an upright prism of `SIDES` facets: centre (s, n), radius r, between heights y0 and y1, wearing the strip of `run`;
  // the facets facing the wall are left out, nobody sees them
  const prism = (run, s, n, r, y0, y1, foot) => {
    for (let i = 0; i < SIDES; i++) {
      const t0 = ((i + 0.5) / SIDES) * Math.PI * 2;
      const t1 = ((i + 1.5) / SIDES) * Math.PI * 2;
      if (Math.sin((t0 + t1) / 2) < -0.7)
        continue;
      const p0 = [s + Math.cos(t0) * r, n + Math.sin(t0) * r];
      const p1 = [s + Math.cos(t1) * r, n + Math.sin(t1) * r];
      quad(w(p0[0], p0[1], y0), w(p1[0], p1[1], y0), w(p1[0], p1[1], y1), w(p0[0], p0[1], y1), facetUv(run, Math.cos(t0), Math.cos(t1), (y0 - foot) / TILE, (y1 - foot) / TILE));
    }
  };
  // a flat ring around the pipe, between radii r0 and r1, at height y (the lips of a clamp)
  const annulus = (run, s, n, r0, r1, y) => {
    for (let i = 0; i < SIDES; i++) {
      const t0 = ((i + 0.5) / SIDES) * Math.PI * 2;
      const t1 = ((i + 1.5) / SIDES) * Math.PI * 2;
      if (Math.sin((t0 + t1) / 2) < -0.7)
        continue;
      const c0 = Math.cos(t0);
      const s0 = Math.sin(t0);
      const c1 = Math.cos(t1);
      const s1 = Math.sin(t1);
      quad(w(s + c0 * r0, n + s0 * r0, y), w(s + c1 * r0, n + s1 * r0, y), w(s + c1 * r1, n + s1 * r1, y), w(s + c0 * r1, n + s0 * r1, y), IRON[run]);
    }
  };
  // a box in wall space wearing one flat sample; the face against the wall is left out
  const box = (uv, s0, s1, n0, n1, y0, y1) => {
    quad(w(s0, n1, y0), w(s1, n1, y0), w(s1, n1, y1), w(s0, n1, y1), uv); // front
    quad(w(s0, n0, y1), w(s1, n0, y1), w(s1, n1, y1), w(s0, n1, y1), uv); // top
    quad(w(s0, n0, y0), w(s1, n0, y0), w(s1, n1, y0), w(s0, n1, y0), uv); // bottom
    quad(w(s0, n0, y0), w(s0, n1, y0), w(s0, n1, y1), w(s0, n0, y1), uv); // left
    quad(w(s1, n0, y0), w(s1, n1, y0), w(s1, n1, y1), w(s1, n0, y1), uv); // right
  };

  for (let run = 0; run < PIPE_RUNS.length; run++) {
    const { s, r } = PIPE_RUNS[run];
    const n = PIPE_STANDOFF + r;
    for (let foot = base; foot < top - 1e-6; foot += TILE) {
      const pieceTop = Math.min(top, foot + TILE);
      prism(run, s, n, r, foot, pieceTop, foot);
      for (const h of PIPE_CLAMP_HEIGHTS) {
        const y0 = foot + h;
        const y1 = y0 + PIPE_CLAMP_HEIGHT;
        if (y1 > pieceTop + 1e-6)
          continue;
        const rr = r + CLAMP_FLARE;
        prism(run, s, n, rr, y0, y1, foot);
        annulus(run, s, n, r, rr, y1);
        annulus(run, s, n, r, rr, y0);
        // the bracket that ties the clamp back to the wall
        box(IRON[run], s - 1, s + 1, 0, n - r * 0.5, y0, y1);
      }
    }
  }

  // the shutoff handwheel on the main run, in the red of the valve: a stem, a hub, a rim and two crossed spokes
  const main = PIPE_RUNS[1];
  const front = PIPE_STANDOFF + main.r * 2;
  for (let foot = base; foot < top - 1e-6; foot += TILE) {
    const cy = foot + PIPE_WHEEL_Y;
    if (cy + 5.4 > Math.min(top, foot + TILE))
      continue;
    const rimOuter = 5;
    const rimInner = 3.8;
    const n0 = front + 1;
    const n1 = n0 + 1.2;
    box(RED, main.s - 0.8, main.s + 0.8, front - main.r * 0.5, n0, cy - 0.8, cy + 0.8); // stem
    box(RED, main.s - 1.6, main.s + 1.6, n0, n1 + 0.8, cy - 1.6, cy + 1.6); // hub
    box(RED, main.s - rimInner, main.s + rimInner, n0, n1, cy - 0.5, cy + 0.5); // horizontal spoke
    box(RED, main.s - 0.5, main.s + 0.5, n0, n1, cy - rimInner, cy + rimInner); // vertical spoke
    for (let i = 0; i < WHEEL_SEGMENTS; i++) {
      const t0 = (i / WHEEL_SEGMENTS) * Math.PI * 2;
      const t1 = ((i + 1) / WHEEL_SEGMENTS) * Math.PI * 2;
      const ring = (rad, ang) => [main.s + Math.cos(ang) * rad, cy + Math.sin(ang) * rad];
      const o0 = ring(rimOuter, t0);
      const o1 = ring(rimOuter, t1);
      const i0 = ring(rimInner, t0);
      const i1 = ring(rimInner, t1);
      quad(w(i0[0], n1, i0[1]), w(o0[0], n1, o0[1]), w(o1[0], n1, o1[1]), w(i1[0], n1, i1[1]), RED); // face
      quad(w(o0[0], n0, o0[1]), w(o1[0], n0, o1[1]), w(o1[0], n1, o1[1]), w(o0[0], n1, o0[1]), RED); // outer edge
      quad(w(i0[0], n0, i0[1]), w(i1[0], n0, i1[1]), w(i1[0], n1, i1[1]), w(i0[0], n1, i0[1]), RED); // inner edge
    }
  }
  return out;
}

/** Which of the four faces of a tile a wall mark belongs to, from its normal in the game plane: 0 looks -x, 1 +x, 2 -y, 3 +y (as in `wallPipeQuads`). */
export function faceDirOf(nx, ny) {
  return nx < -0.5 ? 0 : nx > 0.5 ? 1 : ny < -0.5 ? 2 : 3;
}

// neighbouring pieces of a mark overlap this much, since a mark is always cut a little short of the edge it is given
const FACET_OVERLAP = 0.4;
const COS_HALF = Math.cos(Math.PI / SIDES);
const SIN_HALF = Math.sin(Math.PI / SIDES);

/**
 * The pieces of a wall mark (a bullet hole, a blood splat) that fall on the pipes. The mark itself is a flat quad on the wall
 * plane, and a pipe standing in front of it would hide it, so the part of it that overlaps a pipe is drawn again on the pipe:
 * one piece on each flat facet it reaches, cut to that facet and lined up so the picture runs on from facet to facet round
 * the pipe. `half` is half the mark's size, (x, y) where it is aimed at on the wall plane, `z` its height, (nx, ny) the face's
 * normal. Each piece has the facet's own normal (the facets turn away from the wall, so marks lie on them like on a boulder),
 * its place on the facet and how far the facet runs either side of it (`lo` is negative, `hi` positive), as `faceSpan` does.
 * Nothing when the mark is nowhere near a pipe, or sits on a clamp.
 */
export function pipePlacements(x, y, z, nx, ny, half) {
  const axisX = Math.abs(nx) > 0.5;
  const sign = nx > 0.5 || ny > 0.5 ? 1 : -1;
  const plane = (axisX ? Math.round(x / TILE) : Math.round(y / TILE)) * TILE;
  const across = axisX ? y : x;
  const a0 = Math.floor(across / TILE) * TILE;
  const s = across - a0;
  const h = ((z % TILE) + TILE) % TILE;
  const out = [];
  for (const clamp of PIPE_CLAMP_HEIGHTS)
    if (h > clamp - 1 && h < clamp + PIPE_CLAMP_HEIGHT + 1)
      return out;
  const map = (ss, nn) => ({ x: axisX ? plane + sign * nn : a0 + ss, y: axisX ? a0 + ss : plane + sign * nn });
  for (const run of PIPE_RUNS) {
    const r = run.r;
    const ds = s - run.s;
    if (Math.abs(ds) >= r + half)
      continue;
    const facetWidth = 2 * r * SIN_HALF;
    const nc = PIPE_STANDOFF + r;
    // where the mark's middle is along the pipe's surface, measured round the facets from the middle of the front one
    // (growing with the angle from the wall's side); off the pipe it carries on in a straight line
    const along = Math.abs(ds) < r
      ? (((Math.acos(ds / r) * 180) / Math.PI - 90) / 45) * facetWidth
      : ds > 0 ? -(2 * facetWidth + ds - r) : 2 * facetWidth + (-ds - r);
    // the five facets that can be seen: facing 0, 45, 90, 135 and 180 degrees round from the wall's side
    for (let k = 0; k < 5; k++) {
      const middle = (k - 2) * facetWidth;
      if (Math.abs(middle - along) - facetWidth / 2 >= half)
        continue;
      const phi = (k * Math.PI) / 4;
      const centre = map(run.s + r * COS_HALF * Math.cos(phi), nc + r * COS_HALF * Math.sin(phi));
      const normalX = axisX ? sign * Math.sin(phi) : Math.cos(phi);
      const normalY = axisX ? Math.cos(phi) : sign * Math.sin(phi);
      // the mark's tangent, as the quad builders take it, and which way round the pipe it runs
      const tx = -normalY;
      const ty = normalX;
      const growS = -Math.sin(phi);
      const growN = Math.cos(phi);
      const growX = axisX ? sign * growN : growS;
      const growY = axisX ? growS : sign * growN;
      const direction = growX * tx + growY * ty > 0 ? 1 : -1;
      const offset = direction * (along - middle);
      out.push({ x: centre.x + tx * offset, y: centre.y + ty * offset, nx: normalX, ny: normalY, lo: -facetWidth / 2 - FACET_OVERLAP - offset, hi: facetWidth / 2 + FACET_OVERLAP - offset });
    }
  }
  return out;
}
