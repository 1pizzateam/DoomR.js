import { boxEdges, boxTriangles, ellipseEdges, loftEdges, merge, octahedronEdges, polyline, prismEdges, segment, teeth } from './lines.js';
import { WRAITH_FRAMES, wraithAtlas } from './sprites.js';

/**
 * The shapes and the movement of every monster, as RoostR line meshes.
 *
 * A model faces +x (towards the player), y is up, z is across. Each one is a root mesh (the torso) with parts hung
 * on it: a part pivots where its mesh is positioned, so rotating it swings it from that joint. `animate` moves the
 * parts from what the monster is doing; the world turns the root to face the player and, when the monster dies,
 * throws the parts off as separate bodies (see World.startGore).
 *
 * The wraith is the exception: a flat 2D sprite (see sprites.js) that faces the camera, so it has no parts to throw
 * off; `animate` only picks which frame to show, and `die` plays its death frames. A model that has a `die` plays that
 * instead of falling over or sinking.
 *
 * Rotations: about z swings forward and back (positive tips the top backward, or raises an arm forward),
 * about y turns, about x spreads sideways (positive spreads the -z side).
 */

/** Eases `view.pose[key]` towards a target, frame-rate independent: fast when the rate is high. */
function approach(view, key, target, rate, dt) {
  const value = view.pose[key] ?? 0;
  view.pose[key] = value + (target - value) * (1 - Math.exp(-rate * dt));
  return view.pose[key];
}

function newView(w, enemy, scale, death) {
  return {
    material: w.material('orange'),
    scale,
    death, // 'topple': the torso falls over; 'drop': it sinks to the floor
    root: null,
    parts: [],
    p: {},
    pose: {},
    tilt: 0,
    lift: 0,
    sx: 1,
    sy: 1,
    sz: 1,
    type: enemy.type,
  };
}

/** Hangs a mesh on the root (or another part) at its joint. Parts hung on the root can be thrown off when it dies. */
function attach(w, view, name, geometry, position, { parent = view.root, solid = null, detach = true } = {}) {
  const mesh = w.lines(geometry, view.material, parent);
  mesh.setPosition(position[0], position[1], position[2]);
  if (solid)
    w.solid(solid, mesh);
  view.p[name] = mesh;
  if (detach && parent === view.root)
    view.parts.push({ name, mesh });
  return mesh;
}

function finish(w, view) {
  w.scene.addMesh(view.root);
  return view;
}

/** Two glowing marks. They are scaled up as the monster gets angrier, which makes them flare. */
function eyes(spread, size) {
  const out = [];
  for (const side of [-1, 1]) {
    const z = side * spread;
    out.push(...segment(0, -size, z - size, 0, size, z + size), ...segment(0, size, z - size, 0, -size, z + size));
    out.push(...segment(0, 0, z - size * 1.8, 0, 0, z + size * 1.8), ...segment(0, -size * 1.4, z, 0, size * 1.4, z));
  }
  return out;
}

/** What a monster is doing, as smooth 0..1 numbers every animation shares. */
function mood(view, enemy, c, windupTime) {
  const idle = enemy.state === 'idle';
  const attack = approach(view, 'attack', enemy.windup > 0 ? 1 - enemy.windup / windupTime : 0, enemy.windup > 0 ? 14 : 24, c.dt);
  const roarTime = enemy.def.roar ?? 0;
  const roar = roarTime && enemy.roar > 0 ? Math.sin(Math.PI * (1 - enemy.roar / roarTime)) : 0;
  const pain = approach(view, 'pain', enemy.hurt > 0 || enemy.pain > 0 ? 1 : 0, 26, c.dt);
  const moving = approach(view, 'moving', idle || enemy.windup > 0 || enemy.roar > 0 ? 0 : 1, 9, c.dt);
  const anger = idle ? 0.25 : Math.max(0.7, attack, roar);
  return { idle, attack, roar, pain, moving, anger, swing: Math.sin(enemy.walk) * moving, t: c.time + enemy.phase };
}

function glare(view, m, c) {
  const flicker = 1 + 0.18 * Math.sin(c.time * 31 + view.pose.seed);
  view.p.eyes?.setScale(0.55 + 1.25 * m.anger * flicker);
}

// ---- the imp: a hunched, long-armed demon -----------------------------------------------------------------------

function buildImp(w, enemy) {
  const view = newView(w, enemy, 1, 'topple');
  view.pose.seed = enemy.phase * 7;
  // y, centre x, width (z), depth (x): the chest is broad and forward, the hips narrow and back
  const rings = [[40, 3, 22, 10], [32, 1, 18, 9], [24, -1, 11, 7], [18, -3, 13, 8]];
  const corners = rings.map(([y, cx, wd, dp]) => [[cx + dp / 2, y, -wd / 2], [cx + dp / 2, y, wd / 2], [cx - dp / 2, y, wd / 2], [cx - dp / 2, y, -wd / 2]]);
  const backs = rings.map(([y, cx, , dp]) => [cx - dp / 2, y]);
  const spine = merge(
    polyline([1, 45, 0, backs[0][0], backs[0][1], 0, backs[1][0], backs[1][1], 0, backs[2][0], backs[2][1], 0, backs[3][0], backs[3][1], 0]),
    ...backs.map(([x, y]) => segment(x, y, 0, x - 4, y + 3.5, 0))
  );
  view.root = w.lines(merge(loftEdges(corners), spine), view.material);
  w.solid(boxTriangles(7, 21, 15, 0, 18.5, 0), view.root);

  const ribs = [];
  for (const y of [37, 33, 29, 25]) {
    const half = 6 + (y - 25) * 0.25;
    ribs.push(...polyline([1.5, y, -half, 4.8, y - 1, -half / 2, 5.6, y - 1.6, 0, 4.8, y - 1, half / 2, 1.5, y, half]));
  }
  ribs.push(...segment(5.6, 38, 0, 3.4, 24, 0));
  attach(w, view, 'ribs', ribs, [0, 0, 0]);

  const horn = (s) => polyline([2, 6, s * 3.4, 0, 10, s * 7, -3, 15, s * 9.5, -7, 18, s * 8.5]);
  const head = attach(w, view, 'head', merge(
    prismEdges(6, 7, 6, 0, 4, 0, Math.PI / 6), horn(-1), horn(1),
    segment(8, 6.5, -4, 10, 4.5, -1.8), segment(8, 6.5, 4, 10, 4.5, 1.8)
  ), [3, 44, 0], { solid: boxTriangles(9, 7, 9, 4, 0.3, 0) });
  attach(w, view, 'eyes', eyes(2.6, 1), [9.3, 4.2, 0], { parent: head, detach: false });
  attach(w, view, 'jaw', merge(
    polyline([0, 0, -4.5, 7, -3, -4, 10, -4, 0, 7, -3, 4, 0, 0, 4.5]),
    teeth(5, -3, -2.6, 0, 0, 1.7, 4, 1, 3), segment(10, -4, 0, 10.5, -1, 0)
  ), [2, 0.2, 0], { parent: head, detach: false });

  const arm = (s) => merge(
    polyline([0, 0, 0, 2, -8, s * 1.5, 4, -14, s * 2.5, 7, -22, s * 2, 8, -26, s * 2]),
    segment(8, -26, s * 2, 11.5, -29.5, s * 0.2), segment(8, -26, s * 2, 12.5, -30, s * 2.2), segment(8, -26, s * 2, 11.5, -29.5, s * 4.2)
  );
  attach(w, view, 'armL', arm(-1), [4, 39, -12]);
  attach(w, view, 'armR', arm(1), [4, 39, 12]);
  const leg = merge(polyline([0, 0, 0, 3, -7, 0, -2, -13, 0, -2, -18, 0, 2.5, -18, 0]), segment(2.5, -18, 0, 4.5, -18, 1.6), segment(2.5, -18, 0, 4.5, -18, -1.6));
  attach(w, view, 'legL', leg, [-2, 18, -5]);
  attach(w, view, 'legR', leg, [-2, 18, 5]);
  attach(w, view, 'tail', merge(
    polyline([0, 0, 0, -6, -3, 0, -12, -6, 1.5, -18, -7, -1.5, -24, -5, 0]),
    segment(-24, -5, 0, -29, -3, 2.5), segment(-24, -5, 0, -29, -3, -2.5), segment(-24, -5, 0, -30, -8, 0)
  ), [-7, 17, 0]);
  return finish(w, view);
}

function animateImp(view, enemy, c) {
  const m = mood(view, enemy, c, 0.4);
  const { p } = view;
  const breathe = Math.sin(m.t * 2.2);
  view.sy = 1 + 0.025 * breathe * (m.idle ? 1 : 0.5);
  view.sx = 1 + m.roar * 0.1;
  view.tilt = m.pain * 0.3 + m.roar * 0.22;
  p.head.setRotation(0, m.idle ? Math.sin(m.t * 0.9) * 0.3 : 0, m.roar * 0.7 - m.attack * 0.15 + Math.sin(m.t * 0.7) * 0.05 * (m.idle ? 1 : 0));
  p.jaw.setRotation(0, 0, -(0.12 + m.attack * 0.55 + m.roar * 0.95 + m.pain * 0.4 + (m.idle ? 0.06 * Math.sin(m.t * 3) : 0)));

  const twitch = m.idle ? Math.sin(m.t * 1.7) * 0.07 + Math.sin(m.t * 6.1) * 0.03 : 0;
  p.armL.setRotation(m.roar * 0.9 + m.pain * 0.7, 0, -m.swing * 0.55 + twitch + m.attack * 1.5 + m.roar * 0.5);
  p.armR.setRotation(-m.roar * 0.9 - m.pain * 0.7, 0, m.swing * 0.55 - twitch + m.attack * 1.9 + m.roar * 0.5);
  p.legL.setRotation(0, 0, m.swing * 0.7);
  p.legR.setRotation(0, 0, -m.swing * 0.7);
  p.tail.setRotation(0, Math.sin(m.t * 2.6) * (0.25 + 0.3 * m.moving), Math.sin(m.t * 1.3) * 0.12 + m.attack * 0.4);
  glare(view, m, c);
}

// ---- the brute and the warden: hulks ---------------------------------------------------------------------------

function buildHulk(w, enemy, boss) {
  const view = newView(w, enemy, boss ? 2.4 : 1.2, 'topple');
  view.pose.seed = enemy.phase * 7;
  const rings = [[44, 5, 36, 18], [34, 3, 32, 17], [24, 1, 22, 14], [17, -1, 22, 13]];
  const corners = rings.map(([y, cx, wd, dp]) => [[cx + dp / 2, y, -wd / 2], [cx + dp / 2, y, wd / 2], [cx - dp / 2, y, wd / 2], [cx - dp / 2, y, -wd / 2]]);
  const ridge = [];
  rings.slice(0, 3).forEach(([y, cx, , dp]) => ridge.push(...segment(cx - dp / 2, y, 0, cx - dp / 2 - 7, y + 5, 0)));
  // spikes on the shoulders; the warden has two pairs
  for (const s of [-1, 1]) {
    ridge.push(...segment(3, 44, s * 18, 1, 54, s * 22), ...segment(6, 44, s * 17, 7, 52, s * 20));
    if (boss)
      ridge.push(...segment(0, 43, s * 16, -3, 56, s * 17), ...segment(-3, 40, s * 18, -7, 50, s * 24));
  }
  view.root = w.lines(merge(loftEdges(corners), ridge), view.material);
  w.solid(boxTriangles(14, 28, 26, 1, 17, 0), view.root);

  const plates = [];
  for (const y of [40, 35, 30, 25])
    plates.push(...polyline([9, y, -14, 11, y, 0, 9, y, 14]));
  plates.push(...segment(11, 42, 0, 7, 22, 0));
  attach(w, view, 'ribs', plates, [0, 0, 0]);
  if (boss) {
    // an exposed core in the chest: it pulses
    const core = attach(w, view, 'core', merge(octahedronEdges(4), ellipseEdges(6, 6, 'x', 10)), [12, 34, 0], { detach: false });
    core.setRotation(0, 0, 0);
  }

  const tusk = (s) => polyline([6, -4, s * 4.5, 9, 0, s * 6, 9, 6, s * 5.5, 8, 10, s * 4.5]);
  const horns = [];
  if (boss) {
    for (let k = -2; k <= 2; k++)
      horns.push(...polyline([2, 6, k * 2.4, 1 - Math.abs(k) * 0.4, 12 + (2 - Math.abs(k)) * 2, k * 4.2, -2 - Math.abs(k), 17 + (2 - Math.abs(k)) * 3, k * 6]));
  } else {
    horns.push(...polyline([2, 5, -3.5, 1, 9, -6, 2, 12, -6.5]), ...polyline([2, 5, 3.5, 1, 9, 6, 2, 12, 6.5]));
  }
  const head = attach(w, view, 'head', merge(prismEdges(5.5, 6, 5, 0, 5, 0, Math.PI / 5), horns, segment(9, 5, -5, 11, 3, -2), segment(9, 5, 5, 11, 3, 2)),
    [9, 44, 0], { solid: boxTriangles(8, 6, 8, 5, 0.3, 0) });
  attach(w, view, 'eyes', eyes(2.4, 1.1), [10.6, 3.4, 0], { parent: head, detach: false });
  attach(w, view, 'jaw', merge(
    polyline([0, 0, -5, 7, -5, -5, 10, -6, 0, 7, -5, 5, 0, 0, 5]), tusk(-1), tusk(1), teeth(5, -5, -3, 0, 0, 2, 4, 1, 3.5)
  ), [3, 0.3, 0], { parent: head, detach: false });

  const arm = (s) => merge(
    boxEdges(8, 14, 8, 0, -14, 0), boxEdges(9, 13, 9, 2, -27, 0), boxEdges(12, 10, 12, 4, -37, 0),
    segment(9, -28, s * 3, 12, -26, s * 3), segment(10.5, -28, 0, 14, -26, 0), segment(9, -28, -s * 3, 12, -26, -s * 3)
  );
  attach(w, view, 'armL', arm(-1), [4, 41, -21]);
  attach(w, view, 'armR', arm(1), [4, 41, 21]);
  const leg = merge(boxEdges(10, 10, 10, 0, -10, 0), boxEdges(9, 8, 9, 1, -18, 0), boxEdges(14, 3, 11, 3, -18, 0));
  attach(w, view, 'legL', leg, [0, 18, -8]);
  attach(w, view, 'legR', leg, [0, 18, 8]);
  return finish(w, view);
}

function animateHulk(view, enemy, c, boss) {
  const m = mood(view, enemy, c, boss ? (enemy.mode === 'slam' ? 0.75 : 0.6) : 0.3);
  const { p } = view;
  const stomp = Math.abs(Math.sin(enemy.walk)) * m.moving;
  view.lift = stomp * 1.4;
  view.sy = 1 + 0.02 * Math.sin(m.t * 1.6);
  view.tilt = Math.sin(enemy.walk) * 0.035 * m.moving + m.pain * 0.14 + m.roar * 0.2;
  p.head.setRotation(0, m.idle ? Math.sin(m.t * 0.6) * 0.25 : 0, m.roar * 0.55 + Math.sin(m.t * 0.8) * 0.05 - m.attack * 0.2);
  p.jaw.setRotation(0, 0, -(0.1 + m.roar * 0.85 + m.attack * 0.3 + m.pain * 0.3));

  const slam = !boss || enemy.mode === 'slam';
  // a slam lifts both fists overhead; the warden's fireball fan throws its arms wide instead
  const up = slam ? m.attack * 2.7 : m.attack * 1.1;
  const out = slam ? 0 : m.attack * 1.1;
  const drag = 0.12;
  p.armL.setRotation(out + m.roar * 0.8, 0, drag - m.swing * 0.35 + up);
  p.armR.setRotation(-out - m.roar * 0.8, 0, drag + m.swing * 0.35 + up);
  p.legL.setRotation(0, 0, m.swing * 0.45);
  p.legR.setRotation(0, 0, -m.swing * 0.45);
  if (p.core) {
    const beat = 1 + 0.25 * Math.sin(c.time * 5) + 0.5 * m.anger * Math.max(0, Math.sin(c.time * 9));
    p.core.setScale(beat);
    p.core.setRotation(c.time * 1.4, c.time * 2, 0);
  }
  glare(view, m, c);
}

// ---- the skull: a flying jaw that spits fire ---------------------------------------------------------------------

function buildSkull(w, enemy) {
  const view = newView(w, enemy, 1, 'drop');
  view.pose.seed = enemy.phase * 7;
  const cranium = merge(
    ellipseEdges(10, 8, 'y', 12), ellipseEdges(10, 10, 'z', 14), ellipseEdges(8, 10, 'x', 12),
    ellipseEdges(2.8, 2.8, 'x', 8, 9, 1.5, -3.6), ellipseEdges(2.8, 2.8, 'x', 8, 9, 1.5, 3.6),
    polyline([9.6, -2, -1.2, 10.4, -4.2, 0, 9.6, -2, 1.2]),
    teeth(6, -6, -4.5, 0, 0, 3, 4, 1, 2.2)
  );
  view.root = w.lines(cranium, view.material);
  w.solid(boxTriangles(15, 15, 14, 0, -7.5, 0), view.root);
  attach(w, view, 'eyes', eyes(3.6, 1.1), [10.2, 1.8, 0], { parent: view.root, detach: false });
  attach(w, view, 'jaw', merge(
    polyline([0, 0, -5, 7, -1.5, -4, 10.5, -1.5, 0, 7, -1.5, 4, 0, 0, 5]), teeth(5.5, -1.5, -2.5, 0, 0, 1.7, 4, 1, 2.4)
  ), [2, -6, 0]);
  attach(w, view, 'tail', merge(
    polyline([0, 0, 0, -5, -3, 0, -9, -6, 0, -12, -11, 0]),
    segment(-2.5, -1.5, -2, -2.5, -1.5, 2), segment(-5, -3, -2.5, -5, -3, 2.5), segment(-8, -5.5, -2, -8, -5.5, 2), segment(-10.5, -9, -1.5, -10.5, -9, 1.5)
  ), [-9, -2, 0]);
  // the fire that gathers in its mouth before it spits
  const flame = attach(w, view, 'flame', octahedronEdges(3.5), [11, -5, 0], { detach: false });
  flame.setScale(0.001);
  return finish(w, view);
}

function animateSkull(view, enemy, c) {
  const m = mood(view, enemy, c, 0.4);
  const { p } = view;
  view.lift = 40 + Math.sin(m.t * 2.4) * 4 + Math.sin(m.t * 0.9) * 2;
  view.tilt = Math.sin(m.t * 2.4) * 0.08 + m.pain * 0.4 - m.attack * 0.2;
  const chatter = m.idle ? 0.06 * Math.sin(m.t * 9) : 0.12 * Math.sin(m.t * 14);
  p.jaw.setRotation(0, 0, -(0.18 + chatter + m.attack * 0.75 + m.pain * 0.3));
  p.tail.setRotation(0, Math.sin(m.t * 4) * 0.45, Math.sin(m.t * 3) * 0.15);
  p.flame.setScale(Math.max(0.001, m.attack * (1 + 0.3 * Math.sin(c.time * 40))));
  p.flame.setRotation(c.time * 5, c.time * 3, 0);
  glare(view, m, c);
}

// ---- the crawler: six legs, fast, leaps -------------------------------------------------------------------------

function buildCrawler(w, enemy) {
  const view = newView(w, enemy, 1, 'drop');
  view.pose.seed = enemy.phase * 7;
  const body = merge(
    ellipseEdges(7, 5, 'y', 10, 1, 8, 0), ellipseEdges(7, 4, 'z', 10, 1, 8, 0),
    ellipseEdges(8, 6, 'y', 10, -10, 9, 0), ellipseEdges(8, 5.5, 'z', 10, -10, 9, 0), ellipseEdges(6, 6, 'x', 8, -10, 9, 0),
    ellipseEdges(3.4, 3, 'z', 8, 8, 8, 0),
    segment(10, 8, -1.6, 14.5, 3, -1.2), segment(10, 8, 1.6, 14.5, 3, 1.2),
    segment(14.5, 3, -1.2, 13, 1.5, -0.6), segment(14.5, 3, 1.2, 13, 1.5, 0.6)
  );
  view.root = w.lines(body, view.material);
  w.solid(boxTriangles(11, 6, 8, 0, 5, 0), view.root);
  attach(w, view, 'eyes', eyes(1.6, 0.6), [11, 10, 0], { parent: view.root, detach: false });
  const leg = (s) => polyline([0, 0, 0, 1, 5, s * 8, 2, 2, s * 14, 3, -8, s * 17]);
  [4, -1, -6].forEach((x, i) => {
    attach(w, view, `legL${i}`, leg(-1), [x, 8, -4]);
    attach(w, view, `legR${i}`, leg(1), [x, 8, 4]);
  });
  return finish(w, view);
}

function animateCrawler(view, enemy, c) {
  const m = mood(view, enemy, c, 0.38);
  const { p } = view;
  const leaping = enemy.leap > 0;
  view.sy = 1 - m.attack * 0.4;
  view.sx = 1 + (leaping ? 0.25 : 0) + m.attack * 0.1;
  view.tilt = leaping ? -0.35 : 0;
  view.lift = leaping ? 6 : Math.abs(Math.sin(enemy.walk * 2)) * 0.8 * m.moving;
  for (let i = 0; i < 3; i++) {
    // the legs move in two groups of three, the way a spider walks
    for (const [name, side, phase] of [[`legL${i}`, -1, i % 2 ? 0 : Math.PI], [`legR${i}`, 1, i % 2 ? Math.PI : 0]]) {
      const a = enemy.walk * 2 + phase;
      const lift = Math.max(0, Math.sin(a)) * 0.45 * m.moving;
      const fore = leaping ? -0.9 : Math.cos(a) * 0.55 * m.moving + (m.idle ? Math.sin(m.t * 3 + i) * 0.06 : 0);
      p[name].setRotation(side * -lift - side * m.attack * 0.4, fore + (i - 1) * 0.12, m.attack * 0.3);
    }
  }
  glare(view, m, c);
}

// ---- the swarmer: small, toothy, never alone -------------------------------------------------------------------

function buildSwarmer(w, enemy) {
  const view = newView(w, enemy, 0.95, 'drop');
  view.pose.seed = enemy.phase * 7;
  const body = merge(
    ellipseEdges(7, 3.5, 'y', 8, 0, 4.5, 0), ellipseEdges(7, 3.2, 'z', 8, 0, 4.5, 0), ellipseEdges(3.5, 3.2, 'x', 6, -3, 4.5, 0),
    polyline([-7, 4.5, 0, -12, 5, 0, -16, 7, 0, -19, 6, 0]),
    segment(-2, 8, 0, -4, 10.5, 0), segment(-5, 7.8, 0, -7, 10, 0)
  );
  view.root = w.lines(body, view.material);
  w.solid(boxTriangles(10, 5, 5.5, 0, 2, 0), view.root);
  attach(w, view, 'eyes', eyes(1.7, 0.55), [7.2, 6.4, 0], { parent: view.root, detach: false });
  attach(w, view, 'jaw', merge(polyline([0, 0, -2.6, 4, -1.5, -2, 6, -1.5, 0, 4, -1.5, 2, 0, 0, 2.6]), teeth(3, -1.5, -1.2, 0, 0, 1.2, 3, 1, 1.6)), [5, 3.8, 0]);
  const leg = (s) => polyline([0, 0, 0, 1.5, -1.5, s * 3.2, 2.5, -4.2, s * 3.6]);
  [2, -3].forEach((x, i) => {
    attach(w, view, `legL${i}`, leg(-1), [x, 4.2, -2.4]);
    attach(w, view, `legR${i}`, leg(1), [x, 4.2, 2.4]);
  });
  return finish(w, view);
}

function animateSwarmer(view, enemy, c) {
  const m = mood(view, enemy, c, 0.15);
  const { p } = view;
  view.lift = Math.abs(Math.sin(enemy.walk * 2)) * 1.2 * m.moving;
  view.tilt = Math.sin(enemy.walk * 2) * 0.12 * m.moving + m.pain * 0.4;
  p.jaw.setRotation(0, 0, -(0.2 + m.attack * 0.9 + (m.idle ? 0 : 0.15 * Math.sin(m.t * 20))));
  for (let i = 0; i < 2; i++) {
    for (const [name, phase] of [[`legL${i}`, i * Math.PI], [`legR${i}`, i * Math.PI + Math.PI]]) {
      p[name].setRotation(0, 0, Math.sin(enemy.walk * 2 + phase) * 0.8 * m.moving);
    }
  }
  glare(view, m, c);
}

// ---- the wraith: a flat sprite, not a mesh ----------------------------------------------------------------------

// world units per pixel of the sprite: its 48 pixels of ghost plus its float stay under the ceiling, one wall high (64)
const WRAITH_PIXEL = 1.0;
let wraithSprites = null;

function buildWraith(w, enemy) {
  wraithSprites ??= wraithAtlas();
  const view = newView(w, enemy, 1, 'drop');
  view.pose.seed = enemy.phase * 7;
  view.root = w.sprite(wraithSprites, view.material, wraithSprites.cell * WRAITH_PIXEL, wraithSprites.height * WRAITH_PIXEL);
  return finish(w, view);
}

function animateWraith(view, enemy, c) {
  const m = mood(view, enemy, c, 0.35);
  // it floats, bobbing slowly, and rocks from side to side as it drifts
  view.lift = 5 + Math.sin(m.t * 2.1) * 3 + Math.sin(m.t * 0.7) * 1.5;
  view.sx = 1 + Math.sin(m.t * 2.1) * 0.015;
  view.sy = 1 + Math.sin(m.t * 2.1 + 1) * 0.02 + m.roar * 0.08;
  const rate = m.idle ? 0.8 : 2.8;
  let frame = Math.floor(c.time * rate + view.pose.seed) % 2 ? WRAITH_FRAMES.idleB : WRAITH_FRAMES.idleA;
  if (m.pain > 0.5)
    frame = WRAITH_FRAMES.pain;
  else if (m.attack > 0.25 || m.roar > 0.35)
    frame = WRAITH_FRAMES.attack;
  view.root.setFrame(frame);
  view.root.setCustomUniform('glare', Math.min(1, 0.3 + 0.7 * m.anger * (1 + 0.18 * Math.sin(c.time * 31 + view.pose.seed))));
}

const WRAITH_DEATH_STEP = 0.14; // seconds each frame of the death is shown
const WRAITH_BURST_STEP = 0.07; // and of being blown apart, which is much faster

/**
 * A dead wraith plays its death frames, sinking to the floor as it folds up. Killed from close range it bursts
 * instead, in place; the last frame of either lingers and fades.
 */
function dieWraith(view, enemy) {
  const burst = enemy.gibbed;
  const frames = burst ? WRAITH_FRAMES.bursting : WRAITH_FRAMES.dying;
  const interval = burst ? WRAITH_BURST_STEP : WRAITH_DEATH_STEP;
  const step = Math.min(frames.length - 1, Math.floor(enemy.deadTime / interval));
  const k = burst ? 0 : Math.min(1, enemy.deadTime / (interval * 3));
  view.root.setFrame(frames[step]);
  view.root.setCustomUniform('glare', step < (burst ? 3 : 2) ? 1 : 0.3);
  view.root.setPosition(enemy.pos.x, 5 * (1 - k * k), enemy.pos.y);
  view.root.setScale(view.scale);
}

export const MONSTERS = {
  imp: { build: buildImp, animate: animateImp },
  brute: { build: (w, e) => buildHulk(w, e, false), animate: (v, e, c) => animateHulk(v, e, c, false) },
  boss: { build: (w, e) => buildHulk(w, e, true), animate: (v, e, c) => animateHulk(v, e, c, true) },
  skull: { build: buildSkull, animate: animateSkull },
  crawler: { build: buildCrawler, animate: animateCrawler },
  swarmer: { build: buildSwarmer, animate: animateSwarmer },
  wraith: { build: buildWraith, animate: animateWraith, die: dieWraith },
};

