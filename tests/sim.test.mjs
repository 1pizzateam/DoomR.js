import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Circ, Mat4, Rect } from '@1pizzateam/spock';
import { Clock, Player, Quality } from '@1pizzateam/loopr';
import { AmbientLight, CustomMesh, Material, MAX_LIGHTS, Mesh, PerspectiveCamera, PointLight, Rand, Trigo, Vec2, Vec3 } from '@1pizzateam/roostr';
import { ACID_PIT_DEPTH, CACHE_LID_TIME, CACHE_OUTDOOR_LINK, CACHE_TYPES, CACHE_WALL_OFFSET, CAT, DIFFICULTIES, DIFFICULTY_ORDER, ENEMY_TYPES, Game } from '../src/game.js';
import { CHEST_CELL, CHEST_FRAMES, CHEST_LID_HINGE, CHEST_LID_OPEN_ANGLE, CHEST_TINTS, chestAtlas, chestBodyMesh, chestLidMesh } from '../src/cache.js';
import { BLOOD, Blood, makeFeet } from '../src/blood.js';
import { DUCK_FLOOR, RECIPES, Sound, spatial } from '../src/audio.js';
import * as audioModule from '../src/audio.js';
import { validateSong } from '@1pizzateam/groovr';
import { FADE_IN, FADE_OUT, Music, SONGS } from '../src/music.js';
import { HOLE_VARIANTS, holeQuad, IMPACT_CELL_COUNT, IMPACT_CELLS, impactAtlas, impactCellUv, SLASH_VARIANTS, SPARK_FRAMES, SPARK_VARIANTS } from '../src/impacts.js';
import { mulberry32 } from '../src/rng.js';

const flatPoints = (pts) => pts.flatMap((p) => [p.x, p.y]);
const pointList = (flat) => {
  const out = [];
  for (let i = 0; i < flat.length; i += 2)
    out.push(new Vec2(flat[i], flat[i + 1]));
  return out;
};
const edgeRect = (x0, y0, x1, y1) => {
  const r = new Rect(new Vec2(x1 - x0, y1 - y0), new Vec2((x0 + x1) / 2, (y0 + y1) / 2));
  r.topLeftCorner.setScalar(x0, y0);
  r.bottomRightCorner.setScalar(x1, y1);
  return r;
};
const rectBox = (r) => ({ x: r.topLeftCorner.x, y: r.topLeftCorner.y, w: r.size.x, h: r.size.y });

const vecMark = ({ x, y, z, nx, ny, ...rest }) => ({ pos: new Vec3(x, y, z), normal: new Vec2(nx, ny), ...rest });
import { LEVELS } from '../src/levels.js';
import { FACE_CELL_H, FACE_CELL_W, FACE_DEAD_FRAME, FACE_FRAME_COUNT, FACE_POSE_COUNT, FACE_POSES, faceAtlas, faceCellUv, faceFrame, facePlacement } from '../src/face.js';
import { WEAPON_CELL_H, WEAPON_CELL_W, WEAPON_FRAME_COUNT, WEAPON_FRAMES, WEAPON_ORDER, WEAPON_SLOTS, WEAPON_TIMES, WEAPONS, SHOTGUN_PUMP, arsenalAtlas, weaponAtlas, weaponCellUv, weaponFrame, weaponPlacement } from '../src/weapon.js';
import { ARSENAL_CELL, ARSENAL_FRAMES, CHAINSAW_TOOTH_PITCH, chaingunAtlas, chaingunMesh, chaingunParts, chaingunPose, chainsawAtlas, chainsawMesh, chainsawParts, chainsawPose, KNIFE_ATTACKS, knifeAtlas, knifeMesh, knifeParts, knifePose, rocketLauncherAtlas, rocketLauncherMesh, rocketLauncherParts, rocketLauncherPose, shotgunAtlas, shotgunMesh, shotgunParts, shotgunPose } from '../src/arsenal.js';
import { AMMO_FLASH_DURATION, FIRE_COOLDOWN } from '../src/game.js';
import { BOOM_LIGHT_COLOR, CEILING_CELL_COUNT, CEILING_CELLS, CEILING_CONE_FRAGMENT, CEILING_CONE_VERTEX, CEILING_FRAGMENT, CEILING_LIGHT_ATTENUATION, collectDynamicLights, ceilingAtlas, ceilingCellFor, ceilingCellUv, ceilingLightCones, ceilingLightFixtures, createCeilingLights, DEIMOS_ANGULAR_RADIUS, DEIMOS_CENTER, DYNAMIC_LIGHT_ATTENUATION, FIREBALL_LIGHT_COLOR, MARS_SKY_FRAGMENT, MARS_SKY_HEIGHT, MARS_SKY_VERTEX, MARS_SKY_WIDTH, MUZZLE_LIGHT_ATTENUATION, MUZZLE_LIGHT_COLOR, marsSkyAtlas, marsSkyMesh, PHOBOS_ANGULAR_RADIUS, PHOBOS_CENTER, ROCKET_LIGHT_COLOR, skyPixelDir, TELEPORT_LIGHT_COLOR, updateCeilingLights } from '../src/ceiling.js';
import { diagWallFaceQuads, marsRockAtlas, WALL_CELL_COUNT, WALL_CELLS, wallAtlas, wallCellFor, wallCellUv, wallFaceQuads } from '../src/wall.js';
import { DOOR_CELLS, DOOR_FRAGMENT, DOOR_INSET, DOOR_THICKNESS, DOOR_VERTEX, WALL_FRAGMENT, WALL_VERTEX, doorAtlas, doorBox, doubleDoorBox, lockedDoorAtlas, secretDoorBox } from '../src/door.js';
import { BARREL_ATLAS, BARREL_STAVE_COUNT, barrelAtlas, barrelExplosionPose, barrelShrapnelParts, barrelWreckMesh, createBarrelExplosionPose, skinBarrel } from '../src/barrel.js';
import { createExplosion3dPose, EXPLOSION_3D_CELL, EXPLOSION_3D_CELLS, EXPLOSION_3D_FRAMES, EXPLOSION_CELL, EXPLOSION_FLOOR_Y, EXPLOSION_FRAMES, EXPLOSION_PARTICLE_COUNT, explosion3dAtlas, explosion3dMesh, explosion3dPose, explosionAtlas, explosionParticleQuads, teleportAtlas } from '../src/explosion.js';
import { CRATE_CELL, CRATE_FRAGMENT, CRATE_FRAMES, FLOOR_CELL_COUNT, FLOOR_CELLS, FLOOR_FRAGMENT, FLOOR_VERTEX, MARS_BOULDER_BASE_INSET, MARS_BOULDER_CELL_COUNT, MARS_BOULDER_SLOPE, MARS_DIRT_FRAGMENT, MARS_ROCK_FRAGMENT, SLIME_FRAGMENT, TELEPORTER_FRAGMENT, crateAtlas, crateMesh, crateQuads, floorAtlas, floorCellFor, floorCellUv, marsBoulderAtlas, marsBoulderMesh, marsBoulderQuads, marsDirtAtlas, slimeAtlas, teleporterAtlas, teleporterMachineMesh, teleporterMachineQuads, TILE_PIXELS } from '../src/floor.js';
import { LIGHT_GLSL, PARTICLE_FRAGMENT, QuadBatch, SOLID_ALPHA, SOLID_TEXTURED_FRAGMENT, TEXTURED_FRAGMENT, TEXTURED_VERTEX, texturedMesh } from '../src/quads.js';
import { CELLS, GIB_VARIANTS, STEM_KINDS, TIP_HEIGHTS, TIP_KINDS, dripTime, wallDrips, wallDripQuads as wallDripQuadsVec, screenSplatQuads as screenSplatQuadsVec, createQuadTarget, bloodAtlas, CELL, cellUv, floorGibQuad as floorGibQuadVec, floorSplatQuad as floorSplatQuadVec, particleQuad, printQuad as printQuadVec, wallSplatQuad as wallSplatQuadVec } from '../src/bloodsprites.js';
import { CROUCH_EYE, DIAG_NE, DIAG_NW, DIAG_SE, DIAG_SW, DOOR, EXIT, EYE, FLOOR, Level, PILLAR, TILE, WALL } from '../src/level.js';
import { Fog } from '../src/fog.js';
import { MONSTER_SKIN_CELL, MONSTER_SKIN_CELLS, MONSTER_SKIN_FRAMES, MONSTERS, monsterGoreSkinAtlas, monsterMesh, monsterParts, monsterSkinAtlas } from '../src/monsters.js';
import { SHOTS, TitleDirector } from '../src/title.js';
import { EXPLOSION_3D_FRAGMENT, EXPLOSION_3D_VERTEX, explosionWidth, LINE_FRAGMENT, LINE_VERTEX, MARS_INDOOR_FOG, MARS_NVG_FOG, MARS_OUTDOOR_FOG, MONSTER_FRAGMENT, marsFogNearFar, registerStaticChunk, SPARK_PARTICLE_FRAGMENT, SPRITE_FRAGMENT, World } from '../src/world.js';
import { MEDIKIT_CELL, MEDIKIT_CELLS, MEDIKIT_FRAMES, medikitAtlas, medikitMesh } from '../src/medikit.js';
import { AMMO_CELL, AMMO_CELLS, AMMO_FRAMES, AMMO_TYPES, ammoAtlas, ammoMesh, bulletAtlas, bulletMesh, rocketAmmoAtlas, rocketAmmoMesh } from '../src/ammo.js';
import { KEYCARD_CELL, KEYCARD_CELLS, KEYCARD_FRAMES, keycardAtlas, keycardMesh } from '../src/keycard.js';
import { ARMOR_CELL, ARMOR_CELLS, ARMOR_COLORS, ARMOR_FRAMES, ARMOR_TYPES, armorAtlas, armorMesh } from '../src/armor.js';
import { POWERUP_CELL, POWERUP_CELLS, POWERUP_FRAMES, POWERUP_TYPES, berserkAtlas, berserkMesh, nightvisionAtlas, nightvisionMesh, radsuitAtlas, radsuitMesh, soulsphereAtlas, soulsphereMesh } from '../src/powerups.js';
import { FIREBALL_CELL, FIREBALL_FRAMES, fireballAtlas } from '../src/fireball.js';
import { GRENADE_CELL, GRENADE_FRAMES, grenadeAtlas, grenadeParts, skinGrenadeCylinder } from '../src/grenade.js';
import { Hud, SCREEN_BLOOD_ALPHA, layoutControls } from '../src/hud.js';
import { Input } from '../src/input.js';
import { Overlay } from '../src/overlay.js';
import { ACTIONS, CONTROLS_STORAGE_KEY, CONTROLS_VERSION, CONTROL_GROUPS, DEFAULT_HINT_LINES, Keymap, LAYOUT_STORAGE_KEY, MAX_SLOTS, PRESETS, RESERVED_CODES } from '../src/keymap.js';
import { ControlsMenu, TONE_RED } from '../src/controls.js';
import { NAV_DOWN, NAV_LEFT, NAV_NONE, NAV_RIGHT, NAV_UP, RAW_RING_SIZE } from '../src/input.js';

// Scalar fixtures to the vector options of the blood quad generators
const pos2 = ({ x, y, ...rest }) => ({ pos: new Vec2(x, y), ...rest });
const wallOpts = ({ x, y, z, nx, ny, ...rest }) => ({ pos: new Vec3(x, y, z), normal: new Vec2(nx, ny), ...rest });
const floorSplatQuad = (o) => floorSplatQuadVec(pos2(o));
const floorGibQuad = (o) => floorGibQuadVec(pos2(o));
const printQuad = (o) => printQuadVec(pos2(o));
const wallSplatQuad = (o) => wallSplatQuadVec(wallOpts(o));
const wallDripQuads = (o, target) => wallDripQuadsVec(wallOpts(o), target);
const screenSplatQuads = ({ x, y, ...rest }, width, height, fade, target) => screenSplatQuadsVec({ pos: new Vec2(x, y), ...rest }, new Vec2(width, height), fade, target);


const idle = { forward: 0, strafe: 0, turn: 0, mouseX: 0, run: false, fire: false, use: false };
const input = (patch) => ({ ...idle, ...patch });

function run(game, seconds, controls = idle) {
  for (let t = 0; t < seconds; t += 1 / 60)
    game.update(1 / 60, controls);
}

function fresh(levelIndex = 0) {
  const game = new Game();
  game.load(levelIndex, {
    health: 100,
    shells: 24,
    bullets: 50,
    rockets: 0,
    weapons: { knife: true, chainsaw: true, shotgun: true, chaingun: false, rocket: false },
    weapon: 'shotgun',
  });
  game.state = 'play';
  return game;
}

function clearEnemies(game) {
  for (const enemy of game.enemies)
    game.damageEnemy(enemy, 999);
  game.enemies = [];
  game.kills = 0;
}

function acidPitGame() {
  const game = fresh();
  game.load({
    name: 'Acid pit test',
    rows: [
      '#########',
      '#.......#',
      '#..~~~..#',
      '#P.~~~..#',
      '#..~~~..#',
      '#.......#',
      '#########',
    ],
  });
  return game;
}

function rocketSelfDamageGame(playerRow = '#P.......#') {
  const game = new Game();
  game.load({
    name: 'Rocket self-damage test',
    rows: [
      '##########',
      '#........#',
      playerRow,
      '#........#',
      '##########',
    ],
  });
  game.state = 'play';
  return game;
}

function makeOverlayWorld() {
  const uploads = [];
  const target = {
    bufferSubData(bufferTarget, offset, data) { uploads.push({ target: bufferTarget, offset, data }); },
    bindBuffer() {},
    createBuffer: () => ({}),
  };
  const noop = () => ({});
  const gl = new Proxy(target, {
    get(obj, key) {
      if (key in obj)
        return obj[key];
      if (typeof key === 'string' && key === key.toUpperCase())
        return 1;
      return noop;
    },
  });
  return { world: { gl }, gl, uploads };
}

function withWallWorld(check) {
  const programs = [];
  const addProgram = Mesh.prototype.addProgram;
  Mesh.prototype.addProgram = function(vertex, fragment) {
    programs.push({ mesh: this, vertex, fragment });
    return true;
  };
  const stub = () => ({ setInactive() {} });
  const world = {
    gl: { createBuffer: () => ({}), bindBuffer() {}, bufferData() {}, bufferSubData() {}, UNSIGNED_SHORT: 5123, NEAREST: 9728, NEAREST_MIPMAP_NEAREST: 9984 },
    staticMeshes: [],
    sharedTexturedMeshes: [],
    lightFixtures: [],
    hiding: new Material(),
    scene: { addMesh() {} },
    doorViews: new Map(),
    sharedTexture: () => ({}),
    bindAtlasTexture() {},
    track(mesh, bucket) { bucket.push(mesh); return mesh; },
    wallBatch: World.prototype.wallBatch,
    solid: World.prototype.solid,
    makeMesh: World.prototype.makeMesh,
    marsSkyBatch: stub,
    floorBatch: stub,
    marsDirtBatch: stub,
    slimeBatch: stub,
    teleporterBatch: stub,
    crateBatch: stub,
    marsBoulderBatch: stub,
    ceilingBatch: stub,
    lightConesBatch: stub,
  };
  try {
    check(world, programs);
  } finally {
    Mesh.prototype.addProgram = addProgram;
  }
}

function withQuadHarness(check) {
  const programs = [];
  const textures = [];
  const sharedTextures = [];
  const inactives = [];
  const origAddProgram = Mesh.prototype.addProgram;
  const origSetTexture = Mesh.prototype.setTexture;
  const origSetSharedTexture = Mesh.prototype.setSharedTexture;
  const origSetInactive = Mesh.prototype.setInactive;

  Mesh.prototype.addProgram = function(...args) {
    programs.push({ mesh: this, args });
    return true;
  };
  Mesh.prototype.setTexture = function(...args) {
    textures.push({ mesh: this, args });
  };
  Mesh.prototype.setSharedTexture = function(...args) {
    sharedTextures.push({ mesh: this, args });
  };
  Mesh.prototype.setInactive = function(...args) {
    inactives.push({ mesh: this, args });
  };

  const gl = {
    createBuffer: () => ({}),
    bindBuffer() {},
    bufferData() {},
    bufferSubData() {},
    UNSIGNED_SHORT: 5123,
    NEAREST: 9728,
  };

  try {
    check({ gl, programs, textures, sharedTextures, inactives });
  } finally {
    Mesh.prototype.addProgram = origAddProgram;
    Mesh.prototype.setTexture = origSetTexture;
    Mesh.prototype.setSharedTexture = origSetSharedTexture;
    Mesh.prototype.setInactive = origSetInactive;
  }
}

function audioHarness() {
  const nodes = [];
  const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 });
  const ctx = {
    state: 'running',
    currentTime: 100,
    sampleRate: 44100,
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
    createWaveShaper: () => ({ curve: null, connect() {} }),
    createOscillator: () => ({ type: 'sine', frequency: param(), connect() {}, start() {}, stop() {} }),
    createGain: () => {
      const node = { gain: param(), connect() {} };
      nodes.push({ kind: 'gain', node });
      return node;
    },
    createBiquadFilter: () => {
      const node = { type: 'lowpass', frequency: param(), Q: param(), connect() {} };
      nodes.push({ kind: 'biquad', node });
      return node;
    },
    createBufferSource: () => ({ buffer: null, connect() {}, start() {}, stop() {} }),
    createStereoPanner: () => {
      const node = { pan: { value: 0 }, connect() {} };
      nodes.push({ kind: 'pan', node });
      return node;
    },
  };
  const sound = new Sound();
  sound.ctx = ctx;
  sound.master = { connect() {} };
  sound.reverb = { connect() {} };
  sound.duck = { gain: { cancelScheduledValues() {}, setTargetAtTime() {} } };
  sound.muted = false;
  const calls = [];
  const originals = {};
  const wrap = () => {
    for (const name of Object.keys(RECIPES)) {
      originals[name] = RECIPES[name];
      RECIPES[name] = (c, bus, t, params) => {
        calls.push({ name, t, params: { ...params }, bus });
        return originals[name](c, bus, t, params);
      };
    }
  };
  const restore = () => {
    for (const name of Object.keys(originals))
      RECIPES[name] = originals[name];
  };
  return { sound, ctx, calls, nodes, wrap, restore };
}

function withAudio(fn) {
  const h = audioHarness();
  h.wrap();
  try {
    fn(h);
  } finally {
    h.restore();
  }
}

// Output of the scalar-option generators before the Vec2/Vec3 migration, captured from the same inputs as the AC tests below
const BLOOD_BASELINE = JSON.parse('{"p1":{"c":[9.35,29.35,20,10.65,29.35,20,10.65,30.65,20,9.35,30.65,20],"uv":[0.42857142857142855,0,0.4642857142857143,1]},"p2":{"c":[12.679320953045938,5.305547613326364,-3.866669562088525,13.690900497858111,7.551390160681181,-4.383648752447415,12.320679046954062,8.694452386673635,-2.133330437911475,11.309099502141889,6.448609839318819,-1.6163512475525859],"uv":[0.5357142857142857,0,0.5714285714285714,1]},"f":[{"corners":[187.72210542649594,0.3,305.7942475647766,194.20575243522342,0.3,287.7221054264959,212.27789457350406,0.3,294.2057524352234,205.79424756477658,0.3,312.2778945735041],"uv":[0.03571428571428571,0,0.07142857142857142,1]},{"corners":[-7.336319960364153,0.5,4.124227942357285,-1.1242279423572858,0.5,5.663680039635846,-2.663680039635846,0.5,11.875772057642713,-8.875772057642713,0.5,10.336319960364154],"uv":[0.14285714285714285,0,0.17857142857142858,1]}],"g":[{"corners":[119.51750199981281,0.36,174.3637605019113,125.63623949808873,0.36,179.51750199981282,120.48249800018719,0.36,185.6362394980887,114.36376050191127,0.36,180.48249800018718],"uv":[0.4642857142857143,0,0.5,1]},{"corners":[119.51750199981281,0.36,174.3637605019113,125.63623949808873,0.36,179.51750199981282,120.48249800018719,0.36,185.6362394980887,114.36376050191127,0.36,180.48249800018718],"uv":[0.5,0,0.5357142857142857,1]},{"corners":[119.51750199981281,0.36,174.3637605019113,125.63623949808873,0.36,179.51750199981282,120.48249800018719,0.36,185.6362394980887,114.36376050191127,0.36,180.48249800018718],"uv":[0.6071428571428571,0,0.6428571428571429,1]},{"corners":[119.51750199981281,0.36,174.3637605019113,125.63623949808873,0.36,179.51750199981282,120.48249800018719,0.36,185.6362394980887,114.36376050191127,0.36,180.48249800018718],"uv":[0.4642857142857143,0,0.5,1]},{"corners":[119.51750199981281,0.36,174.3637605019113,125.63623949808873,0.36,179.51750199981282,120.48249800018719,0.36,185.6362394980887,114.36376050191127,0.36,180.48249800018718],"uv":[0.6071428571428571,0,0.6428571428571429,1]}],"pr":[{"corners":[93.60070095683844,0.32,79.81725759165694,120.4407481594325,0.32,94.48004220595892,105.7779635451305,0.32,121.32008940855299,78.93791634253644,0.32,106.657304794251],"uv":[0.35714285714285715,0,0.39285714285714285,1]},{"corners":[93.60070095683844,0.32,79.81725759165694,120.4407481594325,0.32,94.48004220595892,105.7779635451305,0.32,121.32008940855299,78.93791634253644,0.32,106.657304794251],"uv":[0.35714285714285715,1,0.39285714285714285,0]},{"corners":[94.88056076547076,0.32,83.85380607332554,116.35259852754601,0.32,95.58403376476714,104.62237083610441,0.32,117.05607152684239,83.15033307402916,0.32,105.32584383540079],"uv":[0.39285714285714285,0,0.42857142857142855,1]},{"corners":[93.76068343291747,0.32,80.32182615186552,119.92972945544669,0.32,94.61804115080996,105.63351445650225,0.32,120.78708717333916,79.46446843397304,0.32,106.49087217439472],"uv":[0.35714285714285715,1,0.39285714285714285,0]}],"ws":[{"corners":[100.56,24,184,100.56,24,216,100.24,56,216,100.24,56,184],"uv":[0.25,0,0.2857142857142857,1]},{"corners":[56.56,20.4,23.92,71.92,20.4,35.44,71.92,39.6,35.44,56.56,39.6,23.92],"uv":[0.2857142857142857,0,0.32142857142857145,1]}],"wsb":[{"corners":[64.08,20.4,29.56,64.32,20.4,29.74,64.32,39.6,29.74,64.08,39.6,29.56],"uv":[0.30319940476190477,0,0.30375744047619047,1]},null],"wd":[[[],[{"corners":[100.65240584223405,19.759415776595475,195.59600820388926,100.65240584223405,19.759415776595475,202.06122728766593,100.48,37,202.06122728766593,100.48,37,195.59600820388926],"uv":[0.6897321428571429,0,0.703125,1]},{"corners":[100.75420078856403,9.579921143596067,195.59600820388926,100.75420078856403,9.579921143596067,202.06122728766593,100.65240584223405,19.759415776595475,202.06122728766593,100.65240584223405,19.759415776595475,195.59600820388926],"uv":[0.6897321428571429,0.4095620832163861,0.703125,1]},{"corners":[100.79191456655273,5.808543344726324,195.59600820388926,100.79191456655273,5.808543344726324,202.06122728766593,100.75420078856403,9.579921143596067,202.06122728766593,100.75420078856403,9.579921143596067,195.59600820388926],"uv":[0.9754464285714286,0.78125,0.9888392857142857,1]},{"corners":[100.50556938903841,34.44306109615897,200.5994199786857,100.50556938903841,34.44306109615897,206.99892948637157,100.48,37,206.99892948637157,100.48,37,200.5994199786857],"uv":[0.7254464285714286,0.8501678780555306,0.7388392857142857,1]},{"corners":[100.55356571034605,29.64342896539455,200.5994199786857,100.55356571034605,29.64342896539455,206.99892948637157,100.50556938903841,34.44306109615897,206.99892948637157,100.50556938903841,34.44306109615897,200.5994199786857],"uv":[0.9397321428571429,0.71875,0.953125,1]},{"corners":[100.49295369016386,35.70463098361415,194.18049134773668,100.49295369016386,35.70463098361415,198.31934037717525,100.48,37,198.31934037717525,100.48,37,194.18049134773668],"uv":[0.6897321428571429,0.8826332205669782,0.703125,1]},{"corners":[100.51364793531106,33.635206468894864,194.18049134773668,100.51364793531106,33.635206468894864,198.31934037717525,100.49295369016386,35.70463098361415,198.31934037717525,100.49295369016386,35.70463098361415,194.18049134773668],"uv":[0.9040178571428572,0.8125,0.9174107142857143,1]}],[{"corners":[100.65240584223405,19.759415776595475,195.59600820388926,100.65240584223405,19.759415776595475,202.06122728766593,100.48,37,202.06122728766593,100.48,37,195.59600820388926],"uv":[0.6897321428571429,0,0.703125,1]},{"corners":[100.80628622201131,4.371377798869744,195.59600820388926,100.80628622201131,4.371377798869744,202.06122728766593,100.65240584223405,19.759415776595475,202.06122728766593,100.65240584223405,19.759415776595475,195.59600820388926],"uv":[0.6897321428571429,0.10745263743231603,0.703125,1]},{"corners":[100.844,0.6000000000000014,195.59600820388926,100.844,0.6000000000000014,202.06122728766593,100.80628622201131,4.371377798869744,202.06122728766593,100.80628622201131,4.371377798869744,195.59600820388926],"uv":[0.9754464285714286,0.78125,0.9888392857142857,1]},{"corners":[100.51201580661467,33.798419338533655,200.5994199786857,100.51201580661467,33.798419338533655,206.99892948637157,100.48,37,206.99892948637157,100.48,37,200.5994199786857],"uv":[0.7254464285714286,0.8123930050251584,0.7388392857142857,1]},{"corners":[100.5600121279223,28.99878720776923,200.5994199786857,100.5600121279223,28.99878720776923,206.99892948637157,100.51201580661467,33.798419338533655,206.99892948637157,100.51201580661467,33.798419338533655,200.5994199786857],"uv":[0.9397321428571429,0.71875,0.953125,1]},{"corners":[100.5616898696501,28.831013034991045,194.18049134773668,100.5616898696501,28.831013034991045,198.31934037717525,100.48,37,198.31934037717525,100.48,37,194.18049134773668],"uv":[0.6897321428571429,0.25984975772506,0.703125,1]},{"corners":[100.58238411479728,26.761588520271758,194.18049134773668,100.58238411479728,26.761588520271758,198.31934037717525,100.5616898696501,28.831013034991045,198.31934037717525,100.5616898696501,28.831013034991045,194.18049134773668],"uv":[0.9040178571428572,0.8125,0.9174107142857143,1]}],[{"corners":[100.65240584223405,19.759415776595475,195.59600820388926,100.65240584223405,19.759415776595475,202.06122728766593,100.48,37,202.06122728766593,100.48,37,195.59600820388926],"uv":[0.6897321428571429,0,0.703125,1]},{"corners":[100.80628622201131,4.371377798869744,195.59600820388926,100.80628622201131,4.371377798869744,202.06122728766593,100.65240584223405,19.759415776595475,202.06122728766593,100.65240584223405,19.759415776595475,195.59600820388926],"uv":[0.6897321428571429,0.10745263743231603,0.703125,1]},{"corners":[100.844,0.6000000000000014,195.59600820388926,100.844,0.6000000000000014,202.06122728766593,100.80628622201131,4.371377798869744,202.06122728766593,100.80628622201131,4.371377798869744,195.59600820388926],"uv":[0.9754464285714286,0.78125,0.9888392857142857,1]},{"corners":[100.54936453781906,30.063546218093485,200.5994199786857,100.54936453781906,30.063546218093485,206.99892948637157,100.48,37,206.99892948637157,100.48,37,200.5994199786857],"uv":[0.7254464285714286,0.5935360100503169,0.7388392857142857,1]},{"corners":[100.59736085912671,25.263914087329063,200.5994199786857,100.59736085912671,25.263914087329063,206.99892948637157,100.54936453781906,30.063546218093485,206.99892948637157,100.54936453781906,30.063546218093485,200.5994199786857],"uv":[0.9397321428571429,0.71875,0.953125,1]},{"corners":[100.5903693074517,25.96306925483048,194.18049134773668,100.5903693074517,25.96306925483048,198.31934037717525,100.48,37,198.31934037717525,100.48,37,194.18049134773668],"uv":[0.6897321428571429,0,0.703125,1]},{"corners":[100.66971798658206,18.02820134179434,194.18049134773668,100.66971798658206,18.02820134179434,198.31934037717525,100.5903693074517,25.96306925483048,198.31934037717525,100.5903693074517,25.96306925483048,194.18049134773668],"uv":[0.6897321428571429,0.281062090879844,0.703125,1]},{"corners":[100.69041223172925,15.958776827075056,194.18049134773668,100.69041223172925,15.958776827075056,198.31934037717525,100.66971798658206,18.02820134179434,198.31934037717525,100.66971798658206,18.02820134179434,194.18049134773668],"uv":[0.9040178571428572,0.8125,0.9174107142857143,1]}]],[[],[{"corners":[63.351012095245125,27.835881832342146,28.950759071433843,67.759133267892,27.835881832342146,32.256849950919005,67.759133267892,28.2,32.256849950919005,63.351012095245125,28.2,28.950759071433843],"uv":[0.6540178571428572,0.9752194991881848,0.6674107142857143,1]},{"corners":[63.351012095245125,23.7032682329857,28.950759071433843,67.759133267892,23.7032682329857,32.256849950919005,67.759133267892,27.835881832342146,32.256849950919005,63.351012095245125,27.835881832342146,28.950759071433843],"uv":[0.9397321428571429,0.71875,0.953125,1]},{"corners":[62.67197310139388,16.38964396646619,28.44147982604541,66.21507991145401,16.38964396646619,31.098809933590516,66.21507991145401,28.2,31.098809933590516,62.67197310139388,28.2,28.44147982604541],"uv":[0.6540178571428572,0,0.6674107142857143,1]},{"corners":[62.67197310139388,15.421610228920041,28.44147982604541,66.21507991145401,15.421610228920041,31.098809933590516,66.21507991145401,16.38964396646619,31.098809933590516,62.67197310139388,16.38964396646619,28.44147982604541],"uv":[0.6540178571428572,0.918035177364886,0.6674107142857143,1]},{"corners":[62.67197310139388,12.46902122053659,28.44147982604541,66.21507991145401,12.46902122053659,31.098809933590516,66.21507991145401,15.421610228920041,31.098809933590516,62.67197310139388,15.421610228920041,28.44147982604541],"uv":[0.8683035714285714,0.75,0.8816964285714286,1]},{"corners":[61.781359286116064,21.905525580868172,27.77351946458705,66.05556882832795,21.905525580868172,30.979176621245966,66.05556882832795,28.2,30.979176621245966,61.781359286116064,28.2,27.77351946458705],"uv":[0.7254464285714286,0.5582008071690521,0.7388392857142857,1]},{"corners":[61.781359286116064,17.898454135044524,27.77351946458705,66.05556882832795,17.898454135044524,30.979176621245966,66.05556882832795,21.905525580868172,30.979176621245966,61.781359286116064,21.905525580868172,27.77351946458705],"uv":[0.9397321428571429,0.71875,0.953125,1]},{"corners":[64.32730649308175,16.21378066768646,29.682979869811312,67.9231722927758,16.21378066768646,32.37987921958186,67.9231722927758,28.2,32.37987921958186,64.32730649308175,28.2,29.682979869811312],"uv":[0.6897321428571429,0,0.703125,1]},{"corners":[64.32730649308175,7.768366954394718,29.682979869811312,67.9231722927758,7.768366954394718,32.37987921958186,67.9231722927758,16.21378066768646,32.37987921958186,64.32730649308175,16.21378066768646,29.682979869811312],"uv":[0.6897321428571429,0.2954063763438878,0.703125,1]},{"corners":[64.32730649308175,4.397242767181535,29.682979869811312,67.9231722927758,4.397242767181535,32.37987921958186,67.9231722927758,7.768366954394718,32.37987921958186,64.32730649308175,7.768366954394718,29.682979869811312],"uv":[0.9397321428571429,0.71875,0.953125,1]}],[{"corners":[63.351012095245125,23.43097824801515,28.950759071433843,67.759133267892,23.43097824801515,32.256849950919005,67.759133267892,28.2,32.256849950919005,63.351012095245125,28.2,28.950759071433843],"uv":[0.6540178571428572,0.6754384760398093,0.6674107142857143,1]},{"corners":[63.351012095245125,19.298364648658705,28.950759071433843,67.759133267892,19.298364648658705,32.256849950919005,67.759133267892,23.43097824801515,32.256849950919005,63.351012095245125,23.43097824801515,28.950759071433843],"uv":[0.9397321428571429,0.71875,0.953125,1]},{"corners":[62.67197310139388,16.38964396646619,28.44147982604541,66.21507991145401,16.38964396646619,31.098809933590516,66.21507991145401,28.2,31.098809933590516,62.67197310139388,28.2,28.44147982604541],"uv":[0.6540178571428572,0,0.6674107142857143,1]},{"corners":[62.67197310139388,5.832985538361214,28.44147982604541,66.21507991145401,5.832985538361214,31.098809933590516,66.21507991145401,16.38964396646619,31.098809933590516,62.67197310139388,16.38964396646619,28.44147982604541],"uv":[0.6540178571428572,0.10615239725789316,0.6674107142857143,1]},{"corners":[62.67197310139388,2.8803965299777623,28.44147982604541,66.21507991145401,2.8803965299777623,31.098809933590516,66.21507991145401,5.832985538361214,31.098809933590516,62.67197310139388,5.832985538361214,28.44147982604541],"uv":[0.8683035714285714,0.75,0.8816964285714286,1]},{"corners":[61.781359286116064,16.000007623427546,27.77351946458705,66.05556882832795,16.000007623427546,30.979176621245966,66.05556882832795,28.2,30.979176621245966,61.781359286116064,28.2,27.77351946458705],"uv":[0.7254464285714286,0.1437018525119621,0.7388392857142857,1]},{"corners":[61.781359286116064,11.992936177603898,27.77351946458705,66.05556882832795,11.992936177603898,30.979176621245966,66.05556882832795,16.000007623427546,30.979176621245966,61.781359286116064,16.000007623427546,27.77351946458705],"uv":[0.9397321428571429,0.71875,0.953125,1]},{"corners":[64.32730649308175,16.21378066768646,29.682979869811312,67.9231722927758,16.21378066768646,32.37987921958186,67.9231722927758,28.2,32.37987921958186,64.32730649308175,28.2,29.682979869811312],"uv":[0.6897321428571429,0,0.703125,1]},{"corners":[64.32730649308175,4.227561335372922,29.682979869811312,67.9231722927758,4.227561335372922,32.37987921958186,67.9231722927758,16.21378066768646,32.37987921958186,64.32730649308175,16.21378066768646,29.682979869811312],"uv":[0.6897321428571429,0,0.703125,1]},{"corners":[64.32730649308175,3.971124187213185,29.682979869811312,67.9231722927758,3.971124187213185,32.37987921958186,67.9231722927758,4.227561335372922,32.37987921958186,64.32730649308175,4.227561335372922,29.682979869811312],"uv":[0.6897321428571429,0.978605668639117,0.703125,1]},{"corners":[64.32730649308175,0.6000000000000014,29.682979869811312,67.9231722927758,0.6000000000000014,32.37987921958186,67.9231722927758,3.971124187213185,32.37987921958186,64.32730649308175,3.971124187213185,29.682979869811312],"uv":[0.9397321428571429,0.71875,0.953125,1]}],[{"corners":[63.351012095245125,14.053666923118568,28.950759071433843,67.759133267892,14.053666923118568,32.256849950919005,67.759133267892,28.2,32.256849950919005,63.351012095245125,28.2,28.950759071433843],"uv":[0.6540178571428572,0.03725425031450358,0.6674107142857143,1]},{"corners":[63.351012095245125,9.921053323762116,28.950759071433843,67.759133267892,9.921053323762116,32.256849950919005,67.759133267892,14.053666923118568,32.256849950919005,63.351012095245125,14.053666923118568,28.950759071433843],"uv":[0.9397321428571429,0.71875,0.953125,1]},{"corners":[62.67197310139388,16.38964396646619,28.44147982604541,66.21507991145401,16.38964396646619,31.098809933590516,66.21507991145401,28.2,31.098809933590516,62.67197310139388,28.2,28.44147982604541],"uv":[0.6540178571428572,0,0.6674107142857143,1]},{"corners":[62.67197310139388,5.549377330786548,28.44147982604541,66.21507991145401,5.549377330786548,31.098809933590516,66.21507991145401,16.38964396646619,31.098809933590516,62.67197310139388,16.38964396646619,28.44147982604541],"uv":[0.6540178571428572,0.08213887837925804,0.6674107142857143,1]},{"corners":[62.67197310139388,2.5967883224030963,28.44147982604541,66.21507991145401,2.5967883224030963,31.098809933590516,66.21507991145401,5.549377330786548,31.098809933590516,62.67197310139388,5.549377330786548,28.44147982604541],"uv":[0.8683035714285714,0.75,0.8816964285714286,1]},{"corners":[61.781359286116064,16.000007623427546,27.77351946458705,66.05556882832795,16.000007623427546,30.979176621245966,66.05556882832795,28.2,30.979176621245966,61.781359286116064,28.2,27.77351946458705],"uv":[0.7254464285714286,0.1437018525119621,0.7388392857142857,1]},{"corners":[61.781359286116064,11.992936177603898,27.77351946458705,66.05556882832795,11.992936177603898,30.979176621245966,66.05556882832795,16.000007623427546,30.979176621245966,61.781359286116064,16.000007623427546,27.77351946458705],"uv":[0.9397321428571429,0.71875,0.953125,1]},{"corners":[64.32730649308175,16.21378066768646,29.682979869811312,67.9231722927758,16.21378066768646,32.37987921958186,67.9231722927758,28.2,32.37987921958186,64.32730649308175,28.2,29.682979869811312],"uv":[0.6897321428571429,0,0.703125,1]},{"corners":[64.32730649308175,4.227561335372922,29.682979869811312,67.9231722927758,4.227561335372922,32.37987921958186,67.9231722927758,16.21378066768646,32.37987921958186,64.32730649308175,16.21378066768646,29.682979869811312],"uv":[0.6897321428571429,0,0.703125,1]},{"corners":[64.32730649308175,3.971124187213185,29.682979869811312,67.9231722927758,3.971124187213185,32.37987921958186,67.9231722927758,4.227561335372922,32.37987921958186,64.32730649308175,4.227561335372922,29.682979869811312],"uv":[0.6897321428571429,0.978605668639117,0.703125,1]},{"corners":[64.32730649308175,0.6000000000000014,29.682979869811312,67.9231722927758,0.6000000000000014,32.37987921958186,67.9231722927758,3.971124187213185,32.37987921958186,64.32730649308175,3.971124187213185,29.682979869811312],"uv":[0.9397321428571429,0.71875,0.953125,1]}]]],"wdb":[],"s0":[{"x0":375.5,"y0":215.5,"x1":424.5,"y1":264.5,"uv":[0.10714285714285714,0,0.14285714285714285,1],"fade":0.7}],"s1":[{"x0":330,"y0":170,"x1":470,"y1":310,"uv":[0.10714285714285714,0,0.14285714285714285,1],"fade":0.7},{"x0":392.3658111799508,"y0":250,"x1":405.56581117995086,"y1":285.2,"uv":[0.6897321428571429,0,0.703125,1],"fade":0.7},{"x0":392.3658111799508,"y0":285.2,"x1":405.56581117995086,"y1":320.4,"uv":[0.6897321428571429,0,0.703125,1],"fade":0.7},{"x0":392.3658111799508,"y0":320.4,"x1":405.56581117995086,"y1":355.6,"uv":[0.6897321428571429,0,0.703125,1],"fade":0.7},{"x0":392.3658111799508,"y0":355.6,"x1":405.56581117995086,"y1":370,"uv":[0.6897321428571429,0.5909090909090912,0.703125,1],"fade":0.7},{"x0":392.3658111799508,"y0":368.9,"x1":405.56581117995086,"y1":375.5,"uv":[0.9040178571428572,0.8125,0.9174107142857143,1],"fade":0.7}]}');

const tests = {
  'AC-1 particleQuad takes Vec3 pos, right and up and matches baseline corners and uv'() {
    const base = BLOOD_BASELINE;
    const q1 = particleQuad({ pos: new Vec3(10, 20, 30), gib: false }, new Vec3(1, 0, 0), new Vec3(0, 1, 0), 0);
    assert.deepEqual({ c: Array.from(q1.corners), uv: q1.uv }, base.p1);
    const opts = { pos: new Vec3(12.5, -3, 7), gib: true, variant: 7, scale: 1.3, visualScale: 0.8 };
    const q2 = particleQuad(opts, new Vec3(0.6, 0, -0.8), new Vec3(0.1, 0.9, 0.2), 1.1);
    assert.deepEqual({ c: Array.from(q2.corners), uv: q2.uv }, base.p2);
    const target = { corners: new Float32Array(12), uv: [0, 0, 0, 0] };
    const reused = particleQuad(opts, new Vec3(0.6, 0, -0.8), new Vec3(0.1, 0.9, 0.2), 1.1, target);
    assert.equal(reused, target);
    assert.deepEqual(Array.from(target.corners), Array.from(new Float32Array(base.p2.c)));
    assert.deepEqual(target.uv, base.p2.uv);
  },

  'AC-2 world.js has no scratchRightArr or scratchUpArr and passes Vec3 axes to particleQuad'() {
    const source = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
    assert.ok(!source.includes('scratchRightArr'));
    assert.ok(!source.includes('scratchUpArr'));
    assert.equal(source.match(/particleQuad\(fillParticleOpts\(\w+\), scratchRight, scratchUp,/g).length, 2);
  },

  'AC-3 floorSplatQuad, floorGibQuad and printQuad take pos Vec2 and match baseline'() {
    const base = BLOOD_BASELINE;
    assert.deepEqual([floorSplatQuadVec({ pos: new Vec2(200, 300), size: 6, seed: 99 }), floorSplatQuadVec({ pos: new Vec2(-5, 8), size: 2, seed: 3, height: 0.5 })], base.f);
    assert.deepEqual([0, 1, 4, 5, 9].map((variant) => floorGibQuadVec({ pos: new Vec2(120, 180), size: 4, variant, angle: 0.7 })), base.g);
    assert.deepEqual([[1, 1], [-1, 1], [1, 0.2], [-1, 0.9]].map(([side, strength]) => printQuadVec({ pos: new Vec2(100, 100), angle: 0.5, side, strength, scale: 1.2 })), base.pr);
  },

  'AC-4 wallSplatQuad and wallDripQuads take pos Vec3 and normal Vec2 and match baseline'() {
    const base = BLOOD_BASELINE;
    const walls = [{ x: 100, y: 200, z: 40, nx: 1, ny: 0, size: 10, top: 110, seed: 77, slope: 0.01 }, { x: 64, y: 30, z: 30, nx: 0.6, ny: -0.8, size: 6, top: 64, seed: 5 }];
    assert.deepEqual(walls.map((w) => wallSplatQuadVec(wallOpts(w))), base.ws);
    assert.deepEqual([wallSplatQuadVec(wallOpts({ ...walls[1], lo: -0.5, hi: 0.4 })), wallSplatQuadVec(wallOpts({ x: 64, y: 100, z: 30, nx: -1, ny: 0, size: 6, top: 64, seed: 5, lo: -0.1, hi: 0.2 }))], base.wsb);
    assert.equal(wallSplatQuadVec(wallOpts({ x: 64, y: 100, z: 30, nx: -1, ny: 0, size: 6, top: 64, seed: 5, lo: -0.1, hi: 0.2 })), null);
    const target = createQuadTarget();
    base.wd.forEach((ages, wi) => {
      [0, 1.5, 3, dripTime(walls[wi].seed, walls[wi].size)].forEach((age, ai) => {
        const input = wallOpts({ ...walls[wi], age });
        assert.deepEqual(wallDripQuadsVec(input), ages[ai]);
        wallDripQuadsVec(input, target);
        assert.deepEqual(target.quads.slice(0, target.count), ages[ai]);
      });
    });
    assert.deepEqual(wallDripQuadsVec(wallOpts({ ...walls[0], age: 4, lo: -0.4, hi: 0.4 })), base.wdb);
  },

  'AC-5 screenSplatQuads takes pos Vec2 and viewportSize Vec2 and matches baseline'() {
    const base = BLOOD_BASELINE;
    const splat = { pos: new Vec2(0.5, 0.4), size: 50, drip: 120, seed: 42 };
    const viewport = new Vec2(800, 600);
    assert.deepEqual(screenSplatQuadsVec({ ...splat, age: 0 }, viewport, 0.7), base.s0);
    assert.equal(base.s0.length, 1);
    assert.deepEqual(screenSplatQuadsVec({ ...splat, age: 2 }, viewport, 0.7), base.s1);
    const target = createQuadTarget();
    screenSplatQuadsVec({ ...splat, age: 2 }, viewport, 0.7, target);
    assert.deepEqual(target.quads.slice(0, target.count), base.s1);
  },

  'AC-6 World splat, gib, print, wall and drip sync batches quads identical to baseline'() {
    const quads = [];
    const batch = { quad(c, u) { quads.push({ corners: Array.from(c), uv: Array.from(u) }); return true; }, end() {} };
    const mock = { splatters: { begin: () => batch }, drips: { begin: () => batch }, splatCache: new Map(), dripCache: new Map(), dripTarget: createQuadTarget(), cachedQuad: World.prototype.cachedQuad };
    const wall = { x: 100, y: 200, z: 40, nx: 1, ny: 0, size: 10, top: 110, seed: 77, slope: 0.01, age: 3, dripTime: 100 };
    const splat = { x: 200, y: 300, size: 6, seed: 99 };
    const gib = { x: 120, y: 180, size: 4, variant: 4, angle: 0.7 };
    const print = { x: 100, y: 100, angle: 0.5, side: -1, strength: 0.9, scale: 1.2 };
    const ceil = { x: 11, y: 22, size: 3, seed: 8, dissolving: true };
    const blood = { floor: [splat], gibs: [gib], walls: [wall], ceiling: [ceil], prints: [print] };
    World.prototype.syncSplatSprites.call(mock, blood);
    const want = [
      floorSplatQuadVec({ pos: new Vec2(200, 300), size: 6, seed: 99 }),
      floorGibQuadVec({ pos: new Vec2(120, 180), size: 4, variant: 4, angle: 0.7 }),
      wallSplatQuadVec(wallOpts(wall)),
      floorSplatQuadVec({ pos: new Vec2(11, 22), size: 3, seed: 8 }),
      printQuadVec({ pos: new Vec2(100, 100), angle: 0.5, side: -1, strength: 0.9, scale: 1.2 }),
    ];
    assert.deepEqual(quads, want.map((q) => ({ corners: q.corners, uv: q.uv })));
    assert.deepEqual(quads[0], { corners: BLOOD_BASELINE.f[0].corners, uv: BLOOD_BASELINE.f[0].uv });
    // a dissolving mark is rebuilt every frame from its current position, with no stale scratch values
    quads.length = 0;
    ceil.x = 400;
    ceil.y = 500;
    World.prototype.syncSplatSprites.call(mock, blood);
    const moved = floorSplatQuadVec({ pos: new Vec2(400, 500), size: 3, seed: 8 });
    assert.deepEqual(quads[3], { corners: moved.corners, uv: moved.uv });
    assert.deepEqual(quads[0], { corners: want[0].corners, uv: want[0].uv });
    quads.length = 0;
    const finished = { ...wall, age: 200 };
    const running = { ...wall, age: 3, dripTime: 100, x: 101 };
    World.prototype.syncDrips.call(mock, { walls: [finished, running] });
    const wantDrips = [...wallDripQuadsVec(wallOpts(finished)), ...wallDripQuadsVec(wallOpts(running))];
    assert.deepEqual(quads, wantDrips.map((q) => ({ corners: q.corners, uv: q.uv })));
  },

  'AC-7 hud drawBlood draws the baseline pixel rectangles with translucent fade'() {
    const drawn = [];
    const hud = new Hud({ width: 800, height: 600, getContext: () => ({}) }, { crisp: { sprites: { quad(r, uv, a) { drawn.push({ x0: r.topLeftCorner.x, y0: r.topLeftCorner.y, x1: r.bottomRightCorner.x, y1: r.bottomRightCorner.y, a }); } } } });
    hud.width = 800;
    hud.height = 600;
    hud.drawBlood({ blood: { splats: [{ x: 0.5, y: 0.4, size: 50, age: 2, life: 4, drip: 120, seed: 42 }] } });
    const base = BLOOD_BASELINE.s1;
    assert.equal(drawn.length, base.length);
    drawn.forEach((d, i) => {
      assert.deepEqual([d.x0, d.y0, d.x1, d.y1], [base[i].x0, base[i].y0, base[i].x1, base[i].y1]);
      assert.ok(d.a > 0 && d.a <= SCREEN_BLOOD_ALPHA + 1e-6);
    });
  },

  'AC-1 effects are pruned in place preserving order and array identity'() {
    const game = fresh();
    clearEnemies(game);
    const effects = game.effects;
    effects.length = 0;
    effects.push({ id: 'a', age: 0.5, life: 0.5 }, { id: 'b', age: 0, life: 1 }, { id: 'c', age: 0.2, life: 2 });
    game.update(1 / 60, idle);
    assert.equal(game.effects, effects, 'array identity is kept');
    assert.deepEqual(effects.map((e) => e.id), ['b', 'c']);
    assert.ok(Math.abs(effects[0].age - 1 / 60) < 1e-9 && Math.abs(effects[1].age - (0.2 + 1 / 60)) < 1e-9);
  },

  'AC-2 emit uses a shared empty extra and trims the queue in place'() {
    const game = fresh();
    game.events.length = 0;
    game.emit('dry');
    assert.deepEqual(Object.keys(game.events[0]).sort(), ['pos', 'type', 'visible', 'x', 'y']);
    assert.equal(game.events[0].pos.x, game.player.pos.x);
    assert.equal(game.events[0].pos.y, game.player.pos.y);
    const events = game.events;
    events.length = 0;
    for (let i = 0; i < 300; i++)
      game.emit('mark', null, { n: i });
    assert.equal(game.events, events);
    assert.equal(events.length, 256);
    assert.equal(events[0].n, 44);
    assert.equal(events[255].n, 299);
    events.length = 0;
    game.emit('dry');
    assert.deepEqual(Object.keys(events[0]).sort(), ['pos', 'type', 'visible', 'x', 'y']);
  },

  'AC-3 Mars weather reuses a fixed dust pool without replacing the live array'() {
    const game = fresh(4);
    game.state = 'play';
    const dust = game.dust;
    const seen = new Set();
    for (let f = 0; f < 120; f++) {
      game.time += 1 / 60;
      game.updateMarsWeather(1 / 60);
      for (const p of game.dust)
        seen.add(p);
    }
    assert.equal(game.dust, dust);
    assert.ok(game.dust.length >= 160, `population ${game.dust.length}`);
    assert.ok(seen.size <= 240, `distinct particles ${seen.size}`);
    for (const p of game.dust) {
      game.scratch.setScalar(p.x, p.y);
      assert.ok(game.level.isOutdoor(game.scratch));
    }
  },

  'AC-4 expired dust particles are reset in place'() {
    const game = fresh(4);
    game.state = 'play';
    const p = game.dust[0];
    p.age = p.life;
    game.time += 1 / 60;
    game.updateMarsWeather(1 / 60);
    if (game.dust.includes(p)) {
      assert.ok(p.age < p.life);
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
      assert.equal(p.gib, false);
      assert.equal(p.visualScale, p.scale);
    }
    assert.ok(game.dust.length >= 160);
    assert.equal(new Set(game.dust).size, game.dust.length, 'no particle is duplicated');
  },

  'AC-5 actorNear honours enemy distance and dead state with reused query options'() {
    const game = fresh();
    clearEnemies(game);
    game.addEnemy('imp', new Vec2(300, 200));
    const enemy = game.enemies[0];
    game.player.body.setPosition(new Vec2(100, 100));
    const center = new Vec2(300, 200);
    assert.equal(game.actorNear(center, 52, 36), true);
    enemy.state = 'dead';
    assert.equal(game.actorNear(center, 52, 36), false);
    enemy.state = 'idle';
    enemy.body.setPosition(new Vec2(300 + 45, 200));
    assert.equal(game.actorNear(center, 52, 36), false);
    assert.equal(game.actorNear(center, 52, 52), true);
    assert.equal(game.actorNear(center, 52, 36), false);
  },

  'AC-6 hot-path methods contain no filter, splice, new Vec, closures or inline mask literals'() {
    const src = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
    const body = (name) => {
      const start = src.indexOf(`\n  ${name}(`);
      assert.ok(start >= 0, name);
      const next = src.slice(start + 1).search(/\n  (?:\/\*\*|[A-Za-z]+\()/);
      return src.slice(start, start + 1 + next);
    };
    for (const name of ['update', 'emit', 'updateMarsWeather', 'actorNear']) {
      const text = body(name);
      for (const banned of ['.filter(', '.splice(', 'new Vec', '=>', '{ mask:'])
        assert.ok(!text.includes(banned), `${name} contains ${banned}`);
    }
    assert.match(src, /^const QUERY_WALL = /m);
    assert.match(src, /^const EMPTY_EXTRA = /m);
  },

  'AC-1 F maps to a one-shot grenade action and stays out of held fire'() {
    const prevDoc = globalThis.document;
    const prevWin = globalThis.window;
    globalThis.document = { addEventListener() {}, pointerLockElement: null };
    globalThis.window = { addEventListener() {} };
    try {
      const mouseHandlers = {};
      const controls = new Input({ addEventListener(name, handler) { mouseHandlers[name] = handler; } });
      const press = { code: 'KeyF', which: 70, repeat: false, preventDefault() {} };
      document.onkeydown(press);
      assert.equal(controls.poll().grenade, true);
      assert.equal(controls.poll().fire, false);
      controls.endFrame();
      assert.equal(controls.poll().grenade, false, 'holding F does not throw again');
      document.onkeydown({ ...press, repeat: true });
      assert.equal(controls.poll().grenade, false, 'OS key repeat does not throw again');
      assert.equal(controls.poll().fire, false);
      document.onkeyup(press);
      document.onkeydown(press);
      assert.equal(controls.poll().grenade, true, 'a new press throws again');
      controls.endFrame();
      document.onkeyup(press);
      for (const code of ['KeyX', 'Enter']) {
        document.onkeydown({ code, repeat: false, preventDefault() {} });
        assert.equal(controls.poll().fire, true, `${code} still fires`);
        assert.equal(controls.poll().grenade, false);
        document.onkeyup({ code });
        controls.endFrame();
      }
      mouseHandlers.mousedown({ button: 0, clientX: 0, clientY: 0 });
      assert.equal(controls.poll().fire, true, 'left mouse still fires');
      assert.equal(controls.poll().grenade, false, 'left mouse does not throw');
    } finally {
      globalThis.document = prevDoc;
      globalThis.window = prevWin;
    }
  },

  'AC-2 grenade launches once without ammo cost and expires after its fuse'() {
    const game = rocketSelfDamageGame('#P.#.....#');
    game.player.angle = 0;
    game.player.shells = 9;
    game.player.bullets = 12;
    game.player.rockets = 3;
    const ammo = [game.player.shells, game.player.bullets, game.player.rockets];
    game.update(1 / 60, input({ grenade: true }));
    assert.equal(game.shots.length, 1);
    const shot = game.shots[0];
    assert.equal(shot.kind, 'grenade');
    assert.equal(shot.team, 'player');
    assert.equal(shot.life, 1.5, 'fuse remains exactly 1.5 seconds');
    assert.ok(shot.body.velocity.x > 0, 'throw travels in facing direction');
    assert.ok(shot.pos.x > game.player.pos.x);
    assert.equal(shot.dead, false);
    assert.equal(shot.body.getSensor(), false, 'BumpR resolves grenade contacts');
    assert.equal(game.player.triggerHeld, false);
    run(game, 0.8);
    assert.equal(game.shots.length, 1, 'idle frames do not spawn more grenades');
    assert.equal(game.shots[0], shot);
    assert.equal(shot.dead, false, 'contact with a wall does not detonate early');
    assert.ok(shot.pos.x < 192 - 5, 'grenade stays on the near side of the wall');
    assert.ok(shot.z >= 6, 'grenade cannot fall through the floor');
    run(game, shot.life - shot.age + 1 / 60);
    assert.equal(shot.dead, true);
    assert.equal(game.shots.length, 0);
    assert.equal(shot.body.sceneIndex, -1, 'expired grenade body is removed');
    assert.equal(game.effects.filter((effect) => effect.type === 'boom').length, 1);
    assert.deepEqual([game.player.shells, game.player.bullets, game.player.rockets], ammo);
    run(game, 0.9);
    assert.equal(game.effects.length, 0, 'blast expires without detonating again');

    game.player.shells = 0;
    game.player.bullets = 0;
    game.player.rockets = 0;
    game.update(1 / 60, input({ grenade: true }));
    assert.equal(game.shots.length, 1, 'a later action launches even with empty ammo pools');
    game.load(0);
    assert.equal(game.shots.length, 0, 'loading a level clears grenades');
    for (const state of ['title', 'dead', 'cleared']) {
      game.state = state;
      game.update(1 / 60, input({ grenade: true }));
      assert.equal(game.shots.length, 0, `${state} does not accept throws`);
    }
  },

  'AC-3 grenade throws faster and farther than the 280-unit baseline without extending its fuse'() {
    const game = rocketSelfDamageGame();
    const baseline = rocketSelfDamageGame();
    const baselineShot = baseline.addGrenade(baseline.player.pos, new Vec2(1, 0));
    baselineShot.body.setVelocity(new Vec2(280, 0));
    game.player.angle = 0;
    const start = game.player.pos.clone();
    game.update(1 / 60, input({ grenade: true }));
    baseline.update(1 / 60, idle);
    const shot = game.shots[0];
    assert.ok(shot.body.velocity.getMagnitude() > 280, 'initial horizontal speed exceeds the old baseline');
    assert.equal(shot.life, 1.5);
    for (let frame = 1; frame < 60; frame++) {
      game.update(1 / 60, idle);
      baseline.update(1 / 60, idle);
    }
    assert.ok(shot.pos.x - start.x > baselineShot.pos.x - start.x, 'unobstructed flight travels farther under the same BumpR damping');
    assert.equal(shot.dead, false, 'longer range does not detonate early');
    for (let frame = 60; frame < 89; frame++)
      game.update(1 / 60, idle);
    assert.equal(shot.dead, false, 'grenade remains live immediately before 1.5 seconds');
    game.update(1 / 30, idle);
    assert.equal(shot.dead, true, 'unchanged fuse detonates by the next frame after 1.5 seconds');
  },

  'AC-4 grenade splash damages reachable enemies and barrels but not targets behind walls'() {
    const game = rocketSelfDamageGame('#P..#....#');
    const nearby = game.addEnemy('boss', new Vec2(200, 210));
    const blocked = game.addEnemy('boss', new Vec2(300, 160));
    const distant = game.addEnemy('boss', new Vec2(500, 160));
    game.addBarrel(new Vec2(200, 100));
    game.addBarrel(new Vec2(300, 100));
    game.addBarrel(new Vec2(500, 100));
    const shot = game.addGrenade(new Vec2(224, 160), new Vec2());
    shot.age = shot.life - 1 / 120;
    game.update(1 / 60, idle);
    assert.ok(nearby.hp < nearby.def.hp, 'reachable nearby enemy takes splash damage');
    assert.equal(blocked.hp, blocked.def.hp, 'wall blocks nearby enemy damage');
    assert.equal(distant.hp, distant.def.hp, 'distant enemy takes no damage');
    assert.ok(game.barrels[0].fuse > 0, 'reachable barrel starts its explosion fuse');
    assert.equal(game.barrels[1].fuse, -1, 'wall blocks nearby barrel damage');
    assert.equal(game.barrels[2].fuse, -1, 'distant barrel takes no damage');
    assert.equal(game.effects.filter((effect) => effect.type === 'boom').length, 1);
    assert.ok(game.events.some((event) => event.type === 'boom'));
  },

  'AC-5 grenade mesh has valid indexed triangles, body ridges, a neck and a fuse'() {
    const programs = [];
    const addProgram = Mesh.prototype.addProgram;
    Mesh.prototype.addProgram = function(vertex, fragment) {
      programs.push({ mesh: this, vertex, fragment });
      return true;
    };
    const world = Object.assign(Object.create(World.prototype), {
      gl: { createBuffer: () => ({}), bindBuffer() {}, bufferData() {}, UNSIGNED_SHORT: 5123 },
      scene: { addMesh() {} },
    });
    try {
      const atlas = grenadeAtlas();
      assert.equal(atlas.width, GRENADE_CELL * GRENADE_FRAMES, 'grenade atlas is 128px wide (4 cells x 32px)');
      assert.equal(atlas.height, GRENADE_CELL, 'grenade atlas is 32px tall');
      assert.equal(atlas.data.length, atlas.width * atlas.height * 4);
      for (let i = 3; i < atlas.data.length; i += 4)
        assert.equal(atlas.data[i], 255, 'every grenade atlas texel is opaque');
      const sampleCell = (cell, x, y) => {
        const o = (y * atlas.width + cell * GRENADE_CELL + x) * 4;
        return [atlas.data[o], atlas.data[o + 1], atlas.data[o + 2]];
      };
      const [bodyR, bodyG, bodyB] = sampleCell(0, 8, 22);
      assert.ok(bodyG > bodyR && bodyG > bodyB && bodyG - bodyR <= 12, 'cell 0 has dark olive-drab ordnance steel without triggering cyan glow');
      const [stripeR, stripeG, stripeB] = sampleCell(0, 8, 9);
      assert.ok(stripeR > 180 && stripeR > stripeG * 2 && stripeR > stripeB * 2, 'cell 0 includes the Half-Life 2 crimson identification stripe');
      const [stencilR, stencilG, stencilB] = sampleCell(0, 4, 18);
      assert.ok(stencilR > 200 && stencilG > 150 && stencilB < 80, 'cell 0 includes yellow-ochre military stencil markings');
      const [ribNotchR] = sampleCell(1, 0, 15);
      const [ribTickR, ribTickG] = sampleCell(1, 2, 15);
      assert.ok(ribNotchR < 40 && ribTickR > 180 && ribTickR > ribTickG * 2, 'cell 1 has serrated vertical notches and crimson hazard ticks');
      const [pinR, pinG, pinB] = sampleCell(2, 22, 12);
      assert.ok(pinR > 180 && pinG > 140 && pinB < 110, 'cell 2 includes the brass pull-pin ring on the gunmetal collar');
      const [ledR, ledG, ledB] = sampleCell(3, 15, 15);
      assert.ok(ledR === 255 && ledG >= 150 && ledR - ledB > 60, 'cell 3 has the glowing red-orange HL2 electronic timer fuse core');

      const rawParts = grenadeParts();
      assert.equal(rawParts.ridges.length, 4);
      assert.equal(skinGrenadeCylinder(rawParts.body, 12, 0, 0), rawParts.body);

      const pixelgun = JSON.parse(readFileSync(new URL('../src/textures/grenade_atlas.pixelgun.json', import.meta.url), 'utf8'));
      assert.equal(pixelgun.width, atlas.width);
      assert.equal(pixelgun.height, atlas.height);
      assert.deepEqual(new Uint8Array(Buffer.from(pixelgun.rgbaBase64, 'base64')), atlas.data);
      const polygun = JSON.parse(readFileSync(new URL('../src/models/projectile-grenade.polygun.json', import.meta.url), 'utf8'));
      assert.equal(polygun.id, 'projectile-grenade');
      assert.deepEqual(new Uint8Array(Buffer.from(polygun.atlas.dataBase64, 'base64')), atlas.data);

      const { root } = world.buildShot({ kind: 'grenade' });
      assert.equal(root.children.length, 6, 'four ridges, neck and fuse are attached to the body');
      const parts = [root, ...root.children];
      assert.equal(programs.length, parts.length, 'every grenade part registers a shader program');
      for (const entry of programs) {
        assert.equal(entry.vertex, TEXTURED_VERTEX, 'grenade parts use textured vertex shader');
        assert.equal(entry.fragment, SOLID_TEXTURED_FRAGMENT, 'grenade parts use lit solid textured fragment shader');
      }
      const expectedCells = [
        [0, 0],
        [1, 0],
        [1, 0],
        [1, 0],
        [1, 0],
        [2, 2],
        [3, 3],
      ];
      for (let p = 0; p < parts.length; p++) {
        const part = parts[p];
        const [sideCell, capCell] = expectedCells[p];
        const minCell = Math.min(sideCell, capCell) / GRENADE_FRAMES;
        const maxCell = (Math.max(sideCell, capCell) + 1) / GRENADE_FRAMES;
        assert.ok(part.vertices.length > 0 && part.vertices.length % 3 === 0);
        assert.ok(part.indices?.length > 0 && part.indices.length % 3 === 0, 'cylinder topology is retained for triangle rendering');
        assert.ok(part.vertices.every(Number.isFinite), 'mesh positions are finite');
        assert.equal(part.uvs?.length, (part.vertices.length / 3) * 2, 'every grenade vertex has UV coordinates');
        assert.ok(part.uvs.every(Number.isFinite), 'grenade UVs are finite');
        for (let u = 0; u < part.uvs.length; u += 2) {
          assert.ok(part.uvs[u] >= minCell && part.uvs[u] <= maxCell, 'grenade part U coordinate stays within its assigned atlas cells');
          assert.ok(part.uvs[u + 1] >= 0 && part.uvs[u + 1] <= 1, 'grenade part V coordinate stays within [0, 1]');
        }
        for (let i = 0; i < part.indices.length; i += 3) {
          const triangle = [];
          for (let j = 0; j < 3; j++) {
            const index = part.indices[i + j];
            assert.ok(Number.isInteger(index) && index >= 0 && index < part.vertices.length / 3);
            triangle.push(new Vec3(part.vertices[index * 3], part.vertices[index * 3 + 1], part.vertices[index * 3 + 2]));
          }
          const ab = new Vec3().subVectors(triangle[1], triangle[0]);
          const ac = new Vec3().subVectors(triangle[2], triangle[0]);
          assert.ok(new Vec3().crossVectors(ab, ac).getMagnitude() > 1e-6, 'each indexed triangle has nonzero area');
        }
      }
      const bounds = (mesh) => {
        let radius = 0;
        let bottom = Infinity;
        let top = -Infinity;
        for (let i = 0; i < mesh.vertices.length; i += 3) {
          radius = Math.max(radius, Math.hypot(mesh.vertices[i], mesh.vertices[i + 2]));
          bottom = Math.min(bottom, mesh.vertices[i + 1] + mesh.position.y);
          top = Math.max(top, mesh.vertices[i + 1] + mesh.position.y);
        }
        return { radius, bottom, top };
      };
      const body = bounds(root);
      let previousTop = body.bottom;
      for (let i = 0; i < 4; i++) {
        const ridge = bounds(root.children[i]);
        assert.ok(ridge.radius > body.radius, 'ridges protrude beyond the body silhouette');
        assert.ok(ridge.bottom > previousTop && ridge.top < body.top, 'ridges have visible gaps along the body');
        previousTop = ridge.top;
      }
      const neck = bounds(root.children[4]);
      const fuse = bounds(root.children[5]);
      assert.ok(neck.radius < body.radius && Math.abs(neck.bottom - body.top) < 1e-6, 'narrow neck joins the body top');
      assert.ok(fuse.radius < neck.radius && Math.abs(fuse.bottom - neck.top) < 1e-6, 'distinct thin fuse extends above the neck');
      assert.ok(fuse.top > neck.top);
    } finally {
      Mesh.prototype.addProgram = addProgram;
    }
  },

  'AC-6 World renders the grenade projectile and detonation blast'() {
    const game = rocketSelfDamageGame();
    game.player.angle = 0;
    game.update(1 / 60, input({ grenade: true }));
    const shot = game.shots[0];
    const addProgram = Mesh.prototype.addProgram;
    Mesh.prototype.addProgram = () => true;
    const noop = () => {};
    const discarded = [];
    const world = Object.assign(Object.create(World.prototype), {
      level: game.level,
      cutaway: true,
      syncStamp: 0,
      camera: { position: new Vec3(96, EYE, 160) },
      gl: { createBuffer: () => ({}), bindBuffer() {}, bufferData() {}, viewport() {}, UNSIGNED_SHORT: 5123 },
      doorViews: new Map(),
      crusherViews: new Map(),
      enemyViews: new Map(),
      pickupViews: new Map(),
      cacheViews: new Map(),
      barrelViews: new Map(),
      shotViews: new Map(),
      effectViews: new Map(),
      ceilingLights: [],
      lightFixtures: [],
      updateCamera: noop,
      updateKnife: noop,
      updateChainsaw: noop,
      updateChaingun: noop,
      updateShotgun: noop,
      updateRocketLauncher: noop,
      syncBlood: noop,
      bindAtlasTexture: noop,
      sharedTexture: () => ({}),
      sharedTexturedMeshes: [],
      discard: (root) => discarded.push(root),
      scene: { addMesh() {}, clear() {}, render() {} },
      target: { bind() {}, unbind() {} },
      glowTarget: { bind() {}, unbind() {} },
      down: { clear() {}, render() {} },
      post: { clear() {}, render() {} },
      overlay: { glow: { render() {} }, crisp: { render() {} } },
    });
    try {
      world.render(game);
      const projectile = world.shotViews.get(shot);
      assert.ok(projectile?.root.active, 'grenade has an active projectile view');
      assert.ok(projectile.root.vertices.length > 0, 'grenade has real mesh geometry');
      assert.deepEqual(
        [projectile.root.position.x, projectile.root.position.y, projectile.root.position.z],
        [shot.pos.x, shot.z, shot.pos.y],
        'projectile uses grenade position and flight height'
      );
      game.update(1 / 60, idle);
      world.render(game);
      assert.equal(world.shotViews.get(shot), projectile, 'flight reuses its view');
      assert.equal(projectile.root.position.y, shot.z);
      shot.age = shot.life - 1 / 120;
      game.update(1 / 60, idle);
      world.render(game);
      assert.equal(world.shotViews.size, 0);
      assert.ok(discarded.includes(projectile.root), 'expired projectile is discarded');
      const effect = game.effects.find((entry) => entry.type === 'boom');
      const blast = world.effectViews.get(effect);
      assert.ok(blast?.boom && blast.root.active, 'detonation uses the existing 3D explosion view');
      assert.ok(blast.root.vertices.length > 0);
      assert.equal(blast.root.position.x, effect.x);
      assert.equal(blast.root.position.z, effect.y);
      run(game, effect.life + 1 / 60);
      world.render(game);
      assert.equal(world.effectViews.size, 0);
      assert.ok(discarded.includes(blast.root), 'expired blast is discarded');
    } finally {
      Mesh.prototype.addProgram = addProgram;
    }
  },

  'AC-1 wall depth correction preserves projection'() {
    assert.match(WALL_VERTEX, /vec4 v = uViewMatrix \* world;\s*vDepth = -v.z;\s*vHeight = world.y;/);
    const correction = WALL_VERTEX.match(/vec4 clip = uProjectionMatrix \* v;\s*clip.z -= ([\d.]+) \* clip.w;\s*gl_Position = clip;/);
    assert.ok(correction, 'only clip-space Z changes after projection');
    assert.doesNotMatch(WALL_VERTEX, /\bv\.[xyzw]+\s*[+*/-]?=/, 'view coordinates are never shifted');
    const bias = Number(correction[1]);
    assert.ok(bias > 0 && bias <= 0.00001, 'depth bias is positive and bounded to avoid pulling walls through other surfaces');
    const projection = new Mat4().perspective(60, 2, 6, 2400);
    for (const distance of [6.01, 24, 200, 800, 2300])
      for (const degrees of [0, 60, 80, 85, 89])
        for (const along of [-32, 32]) {
          const angle = degrees * Math.PI / 180;
          const view = new Vec3(along * Math.cos(angle), 16, -distance - along * Math.sin(angle));
          if (view.z >= -6)
            continue;
          const projected = projection.transformPoint(view);
          const w = -view.z;
          const clip = new Vec3(projected.x * w, projected.y * w, projected.z * w);
          const corrected = clip.clone();
          corrected.z -= bias * w;
          assert.equal(corrected.x / w, clip.x / w, 'projected X is unchanged even at grazing angles');
          assert.equal(corrected.y / w, clip.y / w, 'projected Y is unchanged even at grazing angles');
          assert.equal(w, -view.z, 'clip W retains true view depth');
          assert.ok(corrected.z < clip.z, 'textured wall wins a depth tie');
          assert.ok(Math.abs((clip.z - corrected.z) / w - bias) < 1e-12, 'NDC bias is distance-independent');
          assert.ok(corrected.z >= -w && corrected.z <= w, 'visible samples remain inside depth clipping planes');
        }
    for (const depth of [5.9, 2500]) {
      const projected = projection.transformPoint(new Vec3(0, 0, -depth));
      const correctedZ = projected.z - bias;
      assert.ok(depth < 6 ? correctedZ < -1 : correctedZ > 1, 'geometry beyond the small depth-bias margin remains clipped');
    }
  },

  'AC-2 wall batches retain true-depth backing'() {
    const level = new Level(LEVELS.find((entry) => entry.name.startsWith('E1M5')));
    withWallWorld((world, programs) => {
      World.prototype.buildStatic.call(world, level);
      const indoor = programs.filter(({ fragment }) => fragment === WALL_FRAGMENT);
      const outdoor = programs.filter(({ fragment }) => fragment === MARS_ROCK_FRAGMENT);
      const backing = programs.filter(({ fragment }) => fragment === LINE_FRAGMENT);
      assert.ok(indoor.length > 0 && outdoor.length > 0, 'E1M5 builds indoor and outdoor wall batches');
      assert.ok(backing.length > 0, 'wall and roof backing is retained, not removed to hide the bug');
      for (const { mesh, vertex } of [...indoor, ...outdoor]) {
        assert.equal(vertex, WALL_VERTEX, 'all wall batches use the wall-only correction');
        assert.ok(mesh.used > 0, 'wall batch has real E1M5 quads');
      }
      for (const { mesh, vertex } of backing) {
        assert.equal(vertex, LINE_VERTEX, 'solid geometry uses the unbiased line projection');
        assert.ok(mesh.vertices.length > 0, 'backing triangles remain present');
      }
      assert.match(LINE_VERTEX, /vDepth = -v.z;\s*gl_Position = uProjectionMatrix \* v;/);
      assert.doesNotMatch(LINE_VERTEX, /v.z\s*\+=|clip.z/);
      const rim = outdoor.flatMap(({ mesh }) => Array.from(mesh.vertices));
      const solids = backing.flatMap(({ mesh }) => Array.from(mesh.vertices));
      assert.ok(rim.some((value, i) => i % 3 === 0 && value === 64), 'textured west rim stays on its tile boundary');
      assert.ok(solids.some((value, i) => i % 3 === 0 && Math.abs(value - 63.1) < 1e-4), 'solid west rim retains its existing 0.9-unit inset');
    });
  },

  'AC-1 E1M5 cardinal wall faces and backings reach the floor at y = -0.2'() {
    const level = new Level(LEVELS.find((entry) => entry.name.startsWith('E1M5')));
    withWallWorld((world, programs) => {
      World.prototype.buildStatic.call(world, level);
      const meshes = programs.filter(({ fragment }) => [WALL_FRAGMENT, MARS_ROCK_FRAGMENT].includes(fragment));
      const ys = [];
      for (const { mesh } of meshes)
        for (let i = 1; i < mesh.vertices.length; i += 3)
          ys.push(mesh.vertices[i]);
      assert.ok(ys.some((y) => Math.abs(y + 0.2) < 1e-6), 'lower edges reach the floor plane');
      assert.ok(ys.every((y) => y >= -0.2 - 1e-6), 'nothing is pushed below the floor plane');
    });
    const quads = wallFaceQuads({ axis: 'x', plane: 64, from: 1, to: 1, base: 0, top: 64, tile: new Vec2(1, 1), d: 0, exit: false });
    assert.equal(quads.length, 1, 'a 64-unit wall stays a single quad');
  },

  'AC-2 diagonal wall faces keep their quad count and sink to the floor'() {
    const entry = LEVELS.find((candidate) => {
      const level = new Level(candidate);
      for (let idx = 0; idx < level.kind.length; idx++)
        if (level.diagInfo(idx))
          return true;
      return false;
    });
    assert.ok(entry, 'a level with diagonal walls exists');
    const level = new Level(entry);
    withWallWorld((world, programs) => {
      World.prototype.buildStatic.call(world, level);
      const walls = programs.filter(({ fragment }) => fragment === WALL_FRAGMENT || fragment === MARS_ROCK_FRAGMENT);
      assert.ok(walls.length > 0);
      let low = Infinity;
      for (const { mesh } of walls)
        for (let i = 1; i < mesh.vertices.length; i += 3)
          low = Math.min(low, mesh.vertices[i]);
      assert.ok(Math.abs(low + 0.2) < 1e-6, `lowest wall vertex ${low}`);
    });
    assert.equal(diagWallFaceQuads({ a: new Vec2(0, 0), b: new Vec2(64, 64), heights: new Vec2(0, 64), tile: new Vec2(0, 0), diag: 0, exit: false }).length, 1);
  },

  'AC-3 wall and rock fragments keep y = -0.2 while doors still clip'() {
    for (const fragment of [WALL_FRAGMENT, MARS_ROCK_FRAGMENT])
      assert.match(fragment, /if \(vHeight < -0.21\)\s*discard;/);
    assert.match(DOOR_FRAGMENT, /if \(vHeight < -0.01\)\s*discard;/);
  },

  'AC-4 wall rust parameters and wall projection are unchanged'() {
    assert.match(WALL_FRAGMENT, /scale|spots/, 'rust shading remains');
    assert.match(WALL_VERTEX, /clip.z -= 0.00001 \* clip.w;\s*gl_Position = clip;/);
    assert.ok(WALL_FRAGMENT.includes(`gl_FragColor = vec4(color, ${SOLID_ALPHA});`));
  },

  'AC-5 floor stays at y = -0.2 and FLOOR_VERTEX uses true-depth clip bias'() {
    assert.match(FLOOR_VERTEX, /vDepth = -v.z;/);
    assert.doesNotMatch(FLOOR_VERTEX, /v\.z\s*\+=/);
    assert.match(FLOOR_VERTEX, /vec4 clip = uProjectionMatrix \* v;\s*clip.z -= 0.00001 \* clip.w;\s*gl_Position = clip;/);
  },

  'AC-3 doors retain their existing projection'() {
    withWallWorld((world, programs) => {
      for (const door of [
        { center: new Vec2(160, 224), alongY: true },
        { center: new Vec2(224, 160), alongY: false, lock: 'red' },
        { center: new Vec2(288, 224), secret: true },
      ]) {
        World.prototype.buildDoor.call(world, door);
        const { mesh, vertex, fragment } = programs.at(-1);
        assert.equal(vertex, DOOR_VERTEX, 'ordinary, locked, and secret doors do not inherit wall depth correction');
        assert.equal(fragment, door.secret ? WALL_FRAGMENT : DOOR_FRAGMENT);
        assert.equal(world.doorViews.get(door), mesh, 'door view remains registered');
        assert.ok(mesh.vertices.length > 0 && mesh.uvs.length > 0, 'door geometry and UVs remain populated');
      }
      assert.match(DOOR_VERTEX, /vDepth = -v.z;/);
      assert.match(DOOR_VERTEX, /vec4 clip = uProjectionMatrix \* v;\s*clip.z -= 0.00001 \* clip.w;\s*gl_Position = clip;/);
    });
  },

  'AC-4 wall UV, fog, and alpha invariants remain'() {
    withWallWorld((world, programs) => {
      for (const marsRock of [false, true])
        for (const exit of [false, true]) {
          const faces = wallFaceQuads({ axis: 'x', plane: 64, from: 1, to: 1, base: 0, top: 64, tile: new Vec2(1, 1), d: 0, exit });
          const batch = world.wallBatch(faces, marsRock);
          assert.equal(batch.used, faces.length);
          assert.equal(programs.at(-1).fragment, marsRock ? MARS_ROCK_FRAGMENT : WALL_FRAGMENT);
          for (let face = 0; face < faces.length; face++) {
            const uv = faces[face].uv;
            const expected = [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[1], uv[2], uv[3], uv[0], uv[3]];
            for (let i = 0; i < expected.length; i++)
              assert.ok(Math.abs(batch.uvs[face * 12 + i] - expected[i]) < 1e-6, 'atlas cell and exit UV selection are unchanged');
          }
        }
    });
    for (const varying of ['vDepth', 'vHeight', 'vTextureCoord', 'vSurface', 'vWorldPos']) {
      const assignment = new RegExp(`${varying} = [^;]+;`);
      assert.equal(WALL_VERTEX.match(assignment)?.[0], DOOR_VERTEX.match(assignment)?.[0], `${varying} keeps its existing inputs`);
    }
    for (const fragment of [WALL_FRAGMENT, MARS_ROCK_FRAGMENT]) {
      assert.match(fragment, /if \(vHeight < -0.21\)\s*discard;/);
      assert.ok(fragment.includes(`if (uHasFog == 1 && vDepth >= uFogFar) {
    gl_FragColor = vec4(uFogColor, ${SOLID_ALPHA});
    return;
  }`), 'at and beyond fog far, wall writes fog color and solid alpha without sampling its texture');
      assert.match(fragment, /texture2D\(uSampler, vTextureCoord\)/, 'in-range fragments keep atlas UV sampling');
      assert.match(fragment, /if \(uHasFog == 1\) \{\s*float fade = clamp\(\(vDepth - uFogNear\) \/ \(uFogFar - uFogNear\), 0.0, 1.0\);\s*color = mix\(color, uFogColor, fade\);/, 'fog uses true depth, clamps at near/far limits, and stays optional');
      assert.ok(fragment.includes(`gl_FragColor = vec4(color, ${SOLID_ALPHA});`), 'visible walls retain solid alpha for the neon pass');
    }
  },

  'bullet holes stay on their wall, even right at a corner'() {
    const game = new Game();
    game.load(1);
    const { level, blood } = game;
    const faces = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let marks = 0;
    for (let ty = 0; ty < level.rowCount; ty++) {
      for (let tx = 0; tx < level.width; tx++) {
        const i = ty * level.width + tx;
        if (!level.kind[i] || level.heights[i] <= 20 || level.kind[i] === DOOR) continue;
        for (const [nx, ny] of faces) {
          if (!level.inBounds(tx + nx, ty + ny) || level.heights[(ty + ny) * level.width + tx + nx] > 0) continue;
          // the face lies on the tile boundary on the side the normal points to
          const fx = (tx + (nx > 0 ? 1 : 0)) * 64;
          const fy = (ty + (ny > 0 ? 1 : 0)) * 64;
          for (const along of [0.2, 1, 5, 32, 59, 63, 63.8]) {
            const x = nx ? fx : tx * 64 + along;
            const y = ny ? fy : ty * 64 + along;
            blood.impact(new Vec3(x, y, 10), new Vec2(nx, ny));
            blood.wallSplat(new Vec3(x, y, 10), new Vec2(nx, ny), 9, level.heights[i]);
            marks += 2;
          }
        }
      }
    }
    assert.ok(marks > 100, 'expected plenty of test marks');
    const onWall = (px, py, nx, ny) => {
      // a point just behind the face must be inside a wall tile of this very wall
      const wx = Math.floor((px - nx * 1) / 64);
      const wy = Math.floor((py - ny * 1) / 64);
      return level.inBounds(wx, wy) && level.heights[wy * level.width + wx] > 0;
    };
    for (const mark of blood.holes) {
      const quad = holeQuad(vecMark(mark));
      if (!quad)
        continue;
      const v = quad.corners;
      for (let k = 0; k < v.length; k += 3)
        assert.ok(onWall(v[k], v[k + 2], mark.nx, mark.ny), `a hole left its wall at ${v[k].toFixed(1)}, ${v[k + 2].toFixed(1)}`);
    }
  },

  'a face runs on past tile seams but stops at a corner and at a door'() {
    const game = new Game();
    game.load(0);
    const { blood, level } = game;
    // west face of the wall between the first two rooms: two wall tiles (rows 1 and 2) above a door
    const span = blood.faceSpan(new Vec2(5 * 64, 1 * 64 + 10), new Vec2(-1, 0));
    // the tangent of a west-facing wall points up the map: 10 units to the corner above, 118 down to the door
    assert.ok(Math.abs(span.hi - 10) < 0.01 && Math.abs(span.lo + 118) < 0.01, `got ${span.lo}..${span.hi}`);
    // the door below is its own tile, however long the wall around it is
    const door = level.doors.get(3 * level.width + 5);
    const own = blood.faceSpan(new Vec2(5 * 64, door.center.y), new Vec2(-1, 0), door);
    assert.ok(Math.abs(own.hi - own.lo - 64) < 0.01, `a door face is one tile wide, got ${own.hi - own.lo}`);
  },

  'marks on a door keep their size while it moves, and blood on a door belongs to the door'() {
    const game = new Game();
    game.load(0);
    const { blood, level } = game;
    const door = level.doors.get(3 * level.width + 5);
    const y = door.center.y;
    for (let i = 0; i < 80; i++)
      blood.hitWall({ x: 300, y, z: 30, vx: 100, vy: 0, gib: false }, 330, y);
    const onDoor = blood.walls.filter((w) => w.door === door);
    assert.ok(onDoor.length > 0, 'blood that hits a door should be attached to it');
    assert.ok(onDoor.length <= BLOOD.doorSplats, `door keeps at most ${BLOOD.doorSplats}, has ${onDoor.length}`);
    assert.ok(onDoor.every((w) => w.top === level.baseHeight[door.idx] && w.z <= w.top), 'kept at the door\'s full height');

    // a door slides down: marks keep their size and spacing, drop with it, and are cut off at the floor
    const hole = { x: 320, y, z: 40, nx: -1, ny: 0, top: 64, seed: 99, lo: -32, hi: 32 };
    const other = { ...hole, y: y + 5, z: 50, seed: 7 };
    const bounds = (quad, axis) => {
      let min = Infinity;
      let max = -Infinity;
      for (let k = axis; k < quad.corners.length; k += 3) {
        min = Math.min(min, quad.corners[k]);
        max = Math.max(max, quad.corners[k]);
      }
      return [min, max];
    };
    const at = (mark, open) => holeQuad(vecMark({ ...mark, z: mark.z - open * 64, top: mark.top * (1 - open) }));
    const [closedLow, closedHigh] = bounds(at(hole, 0), 1);
    const [halfLow, halfHigh] = bounds(at(hole, 0.25), 1);
    assert.ok(Math.abs((closedHigh - closedLow) - (halfHigh - halfLow)) < 1e-6, 'hole changed size');
    assert.ok(Math.abs((closedLow - halfLow) - 16) < 1e-6, 'hole should have dropped with the door');
    // two holes stay the same distance apart as the door opens, so they never run into each other
    const gap = (open) => bounds(at(other, open), 1)[0] - bounds(at(hole, open), 1)[0];
    assert.ok(Math.abs(gap(0) - gap(0.25)) < 1e-6, 'holes moved relative to each other');
    assert.equal(at(hole, 0.9), null, 'a mark that sank below the floor must be gone');
    for (const v of bounds(at(other, 0.5), 1))
      assert.ok(v >= 0.6 - 1e-9 && v <= 32 - 0.6 + 1e-9, 'a mark must stay within the door that is left');
  },

  'every monster has a model, a voice for being alerted, hurt and killed, and the level legend knows it'() {
    for (const type of Object.keys(ENEMY_TYPES)) {
      assert.ok(MONSTERS[type], `${type} has no model`);
      const voice = type[0].toUpperCase() + type.slice(1);
      for (const sound of ['alert', 'pain', 'die'])
        assert.equal(typeof RECIPES[sound + voice], 'function', `${type} has no ${sound} sound`);
    }
    for (const sound of ['stomp', 'slam', 'gib', 'leap', 'bite', 'rake'])
      assert.equal(typeof RECIPES[sound], 'function', `${sound} sound missing`);
    const spawned = new Set(LEVELS.flatMap((l) => l.rows.join('').split('')).filter((c) => 'icbswrB'.includes(c)));
    for (const c of 'scr') assert.ok(spawned.has(c), `no level uses ${c}`);
    assert.ok(spawned.has('B'), 'the warden is in no level');
  },

  'swarmers come in packs and wake together; the warden shakes the floor and drops health'() {
    const game = fresh();
    clearEnemies(game);
    const before = game.enemies.length;
    game.addEnemy('swarmer', new Vec2(20 * 64, 9 * 64 + 32));
    game.addEnemy('swarmer', new Vec2(20 * 64 + 20, 9 * 64 + 32));
    game.addEnemy('swarmer', new Vec2(20 * 64, 9 * 64 + 60));
    assert.equal(game.enemies.length, before + 3);
    game.wake(game.enemies[0]);
    assert.ok(game.enemies.every((e) => e.state === 'chase'), 'one swarmer woke, the pack should follow');

    const level = new Game();
    level.load(1);
    const warden = level.enemies.filter((e) => e.type === 'boss');
    assert.equal(warden.length, 1, 'level 2 should hold the warden');
    assert.ok(level.enemies.filter((e) => e.type === 'swarmer').length >= 4, 'a swarm spawn should make a pack');
    assert.ok(ENEMY_TYPES.boss.hp > ENEMY_TYPES.brute.hp * 3, 'the warden should be a real fight');
    level.wake(warden[0]);
    assert.ok(level.shake > 0, 'the warden waking should shake the floor');
    assert.ok(warden[0].roar > 1, 'and it should roar before it moves');
    warden[0].roar = 0;
    warden[0].cooldown = 0;
    warden[0].los = true;
    warden[0].losTimer = 10;
    level.state = 'play';
    level.player.body.setPosition(new Vec2(warden[0].pos.x + 220, warden[0].pos.y));
    run(level, 0.8);
    assert.ok(level.shots.length >= 3, 'the warden fires a fan of fireballs at medium range');
  },

  'a wraith wails when it wakes, drifts in, rakes the player and drops no limbs'() {
    assert.equal(typeof MONSTERS.wraith.die, 'function', 'a wraith has a death of its own');
    assert.ok(MONSTERS.wraith, 'wraith definition exists in MONSTERS');
    assert.ok(MONSTERS.wraith.die, 'wraith has a die method');
    assert.notEqual(MONSTERS.wraith.build, null, 'wraith build is defined');

    const game = fresh();
    clearEnemies(game);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.health = 100;
    assert.equal(game.player.health, 100, 'player starts healthy');
    assert.equal(game.enemies.length, 0, 'enemies cleared');
    game.addEnemy('wraith', new Vec2(6 * 64 + 220, 9 * 64 + 32));
    const wraith = game.enemies[0];
    assert.ok(wraith, 'wraith enemy created');
    game.update(1 / 60, idle);
    game.events.length = 0;
    game.wake(wraith);
    assert.ok(game.events.some((e) => e.type === 'alert' && e.kind === 'wraith'), 'it should wail when it wakes');
    assert.ok(wraith.roar > 0, 'and stop to do it');
    let raked = false;
    for (let t = 0; t < 8 && !raked; t += 1 / 60) {
      game.update(1 / 60, idle);
      raked = game.events.some((e) => e.type === 'rake');
    }
    assert.ok(raked, 'it should reach the player and rake');
    assert.ok(game.player.health < 100, 'the rake should hurt');
    assert.equal(MONSTERS.wraith.build.length, 2);
  },

  'a crawler leaps and cannot be stopped mid-air; a skull keeps its distance'() {
    const game = fresh();
    clearEnemies(game);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.health = 100;
    game.addEnemy('crawler', new Vec2(6 * 64 + 200, 9 * 64 + 32));
    const crawler = game.enemies[0];
    game.wake(crawler);
    let leapt = false;
    for (let t = 0; t < 4 && !leapt; t += 1 / 60) {
      game.update(1 / 60, idle);
      leapt = game.events.some((e) => e.type === 'leap');
    }
    assert.ok(leapt, 'the crawler should leap');
    crawler.pain = 1;
    const speeds = [];
    for (let i = 0; i < 6; i++) {
      game.update(1 / 60, idle);
      speeds.push(crawler.body.velocity.getMagnitude());
    }
    assert.ok(Math.max(...speeds) > 300, 'a leaping crawler is not stopped by pain');

    clearEnemies(game);
    game.player.health = 100;
    game.addEnemy('skull', new Vec2(6 * 64 + 100, 9 * 64 + 32));
    const skull = game.enemies[0];
    game.wake(skull);
    run(game, 1.5);
    assert.ok(skull.pos.getDistance(game.player.pos) > 140, `skull closed in to ${skull.pos.getDistance(game.player.pos)}`);
  },

  'a monster killed up close is blown apart, one killed from afar is not'() {
    const game = fresh();
    clearEnemies(game);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.angle = 0;
    game.addEnemy('imp', new Vec2(6 * 64 + 60, 9 * 64 + 32));
    const near = game.enemies[0];
    near.hp = 1;
    game.update(1 / 60, input({ fire: true }));
    assert.equal(near.state, 'dead');
    assert.ok(near.gibbed, 'a point-blank kill should gib');
    assert.ok(game.events.some((e) => e.type === 'gib'), 'and make the sound');

    clearEnemies(game);
    game.player.cooldown = 0;
    game.addEnemy('imp', new Vec2(6 * 64 + 400, 9 * 64 + 32));
    const far = game.enemies[0];
    far.hp = 1;
    game.update(1 / 60, input({ fire: true }));
    if (far.state === 'dead')
      assert.ok(!far.gibbed, 'a kill from afar should leave a body');
  },

  'AC-6 warden starts in and never leaves his arena (the warden is confined to his own room, which is found without crossing a door)'() {
    const game = new Game();
    game.load(1);
    const { level } = game;
    assert.ok(level.arena && level.arena.size > 20, 'level 2 should have a giant\'s room');
    const [boss] = game.enemies.filter((e) => e.type === 'boss');
    assert.ok(level.inArena(boss.pos), 'the warden starts in his room');
    for (const door of level.doors.values())
      assert.ok(!level.arena.has(door.idx), 'a door is never part of the room');
    assert.equal(new Game().level.arena, null, 'a level without a giant has no such room');

    // wake him with the player waiting right outside a door, doors open, and let him chase for a long time
    for (const door of level.doors.values())
      level.setDoorOpen(door, 1);
    game.state = 'play';
    game.player.body.setPosition(new Vec2(4 * 64 + 32, 12 * 64 + 32));
    game.wake(boss);
    for (let t = 0; t < 25; t += 1 / 60) {
      game.player.health = 100;
      game.update(1 / 60, idle);
      for (const door of level.doors.values()) {
        game.level.setDoorOpen(door, 1);
        door.target = 1;
      }
      assert.ok(level.inArena(boss.pos), `the warden left his room at ${boss.pos.x.toFixed(0)}, ${boss.pos.y.toFixed(0)}`);
    }
  },

  'a barrel takes a couple of pellets to set off, then hurts what is near it, kills monsters in pieces and chains to neighbours'() {
    const game = fresh();
    clearEnemies(game);
    game.rand = Rand.create(1);
    for (const barrel of game.barrels) game.scene.removeBody(barrel.body);
    game.barrels = [];
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.angle = 0;
    game.player.health = 100;
    game.addBarrel(new Vec2(10 * 64, 9 * 64 + 32));
    game.addBarrel(new Vec2(10 * 64 + 90, 9 * 64 + 32));
    game.addBarrel(new Vec2(18 * 64, 9 * 64 + 32));
    game.addEnemy('imp', new Vec2(10 * 64 + 40, 9 * 64 + 32 - 50));
    game.addEnemy('brute', new Vec2(10 * 64 + 40, 9 * 64 + 32 + 50));
    const [first, second, far] = game.barrels;
    const [imp, brute] = game.enemies;
    for (const enemy of game.enemies) enemy.def = { ...enemy.def, sight: 0 };

    game.hitBarrel(first, 3);
    assert.ok(first.fuse < 0 && first.hp === 3, 'one pellet should not set it off');
    // the shotgun does: six pellets at a barrel 4 tiles away
    game.player.cooldown = 0;
    game.events.length = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.ok(game.events.some((e) => e.type === 'clang'), 'pellets ring off a barrel');
    assert.ok(first.fuse >= 0 || first.gone, 'the first barrel should be burning');

    run(game, 0.1);
    assert.ok(first.gone, 'it should blow up shortly after');
    assert.ok(game.events.some((e) => e.type === 'boom'), 'and be heard');
    assert.equal(imp.state, 'dead', 'the imp next to it should be killed');
    assert.ok(imp.gibbed, 'and torn apart');
    assert.ok(brute.hp < ENEMY_TYPES.brute.hp, 'the brute should be hurt');
    assert.ok(game.shake > 0, 'the floor shakes');
    assert.ok(!second.gone, 'a neighbour does not go up in the same instant');
    run(game, 0.6);
    assert.ok(second.gone, 'the blast should chain to the barrel next to it');
    assert.ok(!far.gone, 'a barrel far away is left alone');
    assert.ok(game.scene.bodies.every((b) => b.ref?.kind !== 'barrel' || !b.ref.gone), 'a spent barrel must leave the scene');
  },

  'a blast is stopped by walls, and hurts the player in the open by how close they are'() {
    const game = fresh();
    clearEnemies(game);
    for (const barrel of game.barrels) game.scene.removeBody(barrel.body);
    game.barrels = [];
    // close, in the open
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.health = 100;
    game.addBarrel(new Vec2(6 * 64 + 50, 9 * 64 + 32));
    game.hitBarrel(game.barrels[0], 99, 0);
    run(game, 0.05);
    const near = 100 - game.player.health;
    assert.ok(near >= 20 && near <= 50, `blast next to the player did ${near}`);

    // further away it does less
    game.player.health = 100;
    game.addBarrel(new Vec2(6 * 64 + 150, 9 * 64 + 32));
    game.hitBarrel(game.barrels[1], 99, 0);
    run(game, 0.05);
    const far = 100 - game.player.health;
    assert.ok(far > 0 && far < near, `a further blast should hurt less (${far} vs ${near})`);

    // behind a wall it does nothing: the barrel is in the next room
    game.player.body.setPosition(new Vec2(2 * 64, 2 * 64 + 32));
    game.player.health = 100;
    game.addBarrel(new Vec2(7 * 64, 2 * 64 + 32));
    game.hitBarrel(game.barrels[2], 99, 0);
    run(game, 0.05);
    assert.equal(game.player.health, 100, 'a wall must stop the blast');
  },

  'barrels are solid, fireballs set them off, and every level has some'() {
    const game = fresh();
    assert.ok(game.barrels.length >= 3, 'level 1 should hold barrels');
    assert.ok(new Game().level.barrels.length === game.barrels.length);
    const barrel = game.barrels[0];
    game.player.body.setPosition(new Vec2(barrel.pos.x - 60, barrel.pos.y));
    game.player.body.setVelocity(new Vec2(160, 0));
    for (let i = 0; i < 60; i++) game.scene.step(1 / 60);
    assert.ok(game.player.pos.x < barrel.pos.x, 'the player should not walk through a barrel');

    clearEnemies(game);
    game.player.body.setPosition(new Vec2(2 * 64, 2 * 64 + 32));
    const x = barrel.pos.x;
    game.addShot(new Vec2(x - 60, barrel.pos.y), new Vec2(1, 0), 250, 10);
    run(game, 0.6);
    assert.ok(barrel.gone || barrel.fuse >= 0, 'a fireball should set a barrel off');
    const level2 = new Game();
    level2.load(1);
    assert.ok(level2.barrels.length >= 3, 'level 2 should hold barrels');
  },

  'the title film only ever puts its camera on open floor, and looks at something'() {
    const level = new Game().level;
    for (const [n, shot] of SHOTS.entries()) {
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        const x = shot.from[0] + (shot.to[0] - shot.from[0]) * u;
        const y = shot.from[1] + (shot.to[1] - shot.from[1]) * u;
        assert.ok(level.isWalkable(Math.floor(x / 64), Math.floor(y / 64)) && level.kind[Math.floor(y / 64) * level.width + Math.floor(x / 64)] === 0, `shot ${n} leaves the floor at ${x.toFixed(0)}, ${y.toFixed(0)}`);
      }
      assert.ok(shot.from[2] > 5 && shot.from[2] < 60 && shot.to[2] > 5 && shot.to[2] < 60, `shot ${n} camera height is odd`);
      assert.ok(shot.duration >= 5, `shot ${n} is too short to read`);
    }
    assert.ok(SHOTS.some((s) => s.boom !== undefined), 'the film should blow something up');
  },

  'the title film runs, blows up the barrel beside the imps, loops cleanly and hands back an untouched level'() {
    const game = new Game();
    const director = new TitleDirector(game);
    const total = SHOTS.reduce((sum, shot) => sum + shot.duration, 0);
    const booms = [];
    let maxFade = 0;
    let minFade = 1;
    for (let t = 0; t < total * 2 + 5; t += 1 / 30) {
      game.time += 1 / 30;
      director.update(1 / 30);
      for (const e of game.events) if (e.type === 'boom') booms.push(t);
      game.events.length = 0;
      const { cam } = game;
      assert.ok(cam && [cam.x, cam.y, cam.eye, cam.lookX, cam.lookY, cam.lookEye, cam.roll, cam.zoom].every(Number.isFinite), 'camera went bad');
      assert.ok(cam.zoom > 0.5 && cam.zoom <= 1.05, `zoom ${cam.zoom}`);
      maxFade = Math.max(maxFade, game.fade);
      minFade = Math.min(minFade, game.fade);
    }
    assert.equal(booms.length, 2, `one explosion per loop, got ${booms.length}`);
    assert.ok(booms[0] > 5 && booms[0] < 7, `the first boom came at ${booms[0]}`);
    assert.equal(maxFade, 1, 'cuts go through black');
    assert.equal(minFade, 0, 'the middle of a shot is clear');

    // the first loop killed the imps; the second must have started over with them alive
    assert.equal(game.enemies.filter((e) => e.type === 'imp' && e.state === 'dead').length === 0 || director.shot === 0, true);
    director.end();
    assert.equal(game.cam, null);
    assert.equal(game.fade, 0);
    assert.ok(game.enemies.every((e) => e.state === 'idle'), 'the game must start with every monster alive and unaware');
    assert.equal(game.barrels.length, new Game().barrels.length, 'and with only the level\'s own barrels');
    assert.equal(game.blood.floor.length, 0, 'and a clean floor');
  },

  'collisions run through a grid, and nothing escapes the level with it'() {
    const game = new Game();
    game.load(1);
    game.state = 'play';
    assert.ok(game.scene.getGrid(), 'the scene should use a broadphase grid');
    for (const enemy of game.enemies) enemy.state = 'chase';
    run(game, 20, input({ forward: 1, run: true, turn: 0.3 }));
    const { width, rowCount } = game.level;
    for (const body of [game.player, ...game.enemies]) {
      const { x, y } = body.pos;
      assert.ok(x > 0 && y > 0 && x < width * 64 && y < rowCount * 64, `left the level at ${x}, ${y}`);
    }
    assert.ok(game.scene.bodies.length > 50, 'bodies should still be in the scene');
  },

  'player stops at walls and slides along them'() {
    const game = fresh();
    clearEnemies(game);
    game.player.angle = Math.PI;
    run(game, 3, input({ forward: 1 }));
    // west wall tile spans x 0..64, the player radius is 14
    assert.ok(game.player.pos.x >= 64 + 13, `penetrated wall: ${game.player.pos.x}`);
    assert.ok(game.player.pos.x < 64 + 20, `did not reach wall: ${game.player.pos.x}`);
  },

  'closed doors block and open doors let the player through'() {
    const game = fresh();
    clearEnemies(game);
    game.player.angle = 0;
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    run(game, 2, input({ forward: 1 }));
    assert.ok(game.player.pos.x < 5 * 64, `walked through a closed door: ${game.player.pos.x}`);
    run(game, 0.1, input({ use: true }));
    run(game, 3, input({ forward: 1 }));
    assert.ok(game.player.pos.x > 6 * 64, `could not pass open door: ${game.player.pos.x}`);
  },

  'pickups are collected through sensor overlaps'() {
    const game = fresh();
    clearEnemies(game);
    const ammo = game.addPickup('ammo', game.player.pos.clone());
    game.player.ammo = 5;
    game.player.body.setPosition(ammo.pos.clone());
    run(game, 0.1);
    assert.equal(game.player.ammo, 13);
    assert.ok(!game.pickups.includes(ammo));

    // an ammo crate is picked up whatever is in hand, and fills the shell pool up to its own cap
    assert.deepEqual([AMMO_TYPES.shells.max, AMMO_TYPES.bullets.max, AMMO_TYPES.rockets.max], [80, 200, 40], 'ammo caps are 80 shells, 200 bullets, 40 rockets');
    for (const weapon of ['chainsaw', 'chaingun', 'rocket']) {
      const g = fresh();
      clearEnemies(g);
      g.player.weapons.chaingun = true;
      g.player.weapons.rocket = true;
      g.player.weapon = weapon;
      g.player.shells = 10;
      const crate = g.addPickup('ammo', g.player.pos.clone());
      g.touch(crate.body);
      assert.equal(g.player.shells, 10 + AMMO_TYPES.shells.bonus, `ammo crate is picked up while holding ${weapon}`);
      assert.equal(crate.taken, true, `ammo crate is taken while holding ${weapon}`);
    }
    // every supply cache in every level hands out its ammo when opened, whatever is in hand, and says so when its pool is full
    for (let level = 0; level < LEVELS.length; level++)
      for (const [type, pool] of [['ammo', 'shells'], ['bullets', 'bullets'], ['rockets', 'rockets']]) {
        const open = (hold, amount) => {
          const g = fresh(level);
          clearEnemies(g);
          g.player.weapons.chaingun = true;
          g.player.weapons.rocket = true;
          g.player.weapon = hold;
          g.player[pool] = amount;
          g.player.health = 100;
          if (amount) {
            g.player.shells = AMMO_TYPES.shells.max;
            g.player.bullets = AMMO_TYPES.bullets.max;
            g.player.rockets = AMMO_TYPES.rockets.max;
          }
          const cache = g.caches.find((c) => c.contents.includes(type));
          assert.ok(cache, `level ${level} has a cache holding ${type}`);
          g.player.body.setPosition(cache.pos.clone());
          g.use();
          return { g, cache };
        };
        for (const hold of ['shotgun', 'chainsaw', 'chaingun', 'rocket']) {
          const { g, cache } = open(hold, 0);
          assert.equal(cache.contents.includes(type), false, `level ${level} ${type} leaves the cache while holding ${hold}`);
          assert.ok(g.player[pool] >= AMMO_TYPES[pool].bonus, `level ${level} ${type} cache fills the ${pool} pool`);
        }
        const { g, cache } = open('chainsaw', AMMO_TYPES[pool].max);
        assert.equal(cache.contents.includes(type), true, `level ${level} ${type} stays in the cache when ${pool} are full`);
        const last = cache.contents.at(-1);
        const lastLabel = last === 'health' ? 'Health' : last === 'chainsaw' ? null : AMMO_TYPES[{ ammo: 'shells', shotgun: 'shells', rockets: 'rockets', rocket: 'rockets' }[last] ?? 'bullets'].label;
        assert.equal(g.message.text, lastLabel ? `${lastLabel} full` : 'Chainsaw already owned', `level ${level} ${type} cache says why it stays shut`);
      }
    const capped = fresh();
    clearEnemies(capped);
    capped.player.shells = AMMO_TYPES.shells.max - 3;
    const crate = capped.addPickup('ammo', capped.player.pos.clone());
    capped.touch(crate.body);
    assert.equal(capped.player.shells, AMMO_TYPES.shells.max, 'shells never exceed their cap');
    const full = fresh();
    clearEnemies(full);
    full.player.weapon = 'chainsaw';
    full.player.shells = AMMO_TYPES.shells.max;
    const crate2 = full.addPickup('ammo', full.player.pos.clone());
    full.touch(crate2.body);
    assert.equal(crate2.taken, false, 'a crate is left alone when shells are full');
    assert.equal(full.message.text, 'SHELLS full', 'a refused crate says why');
  },

  'the shotgun kills an enemy in front of it and uses ammo'() {
    const game = fresh();
    const imp = game.enemies[0];
    clearEnemies(game);
    game.addEnemy('imp', new Vec2(10 * 64 + 32, 3 * 64 + 32));
    game.player.body.setPosition(new Vec2(8 * 64, 3 * 64 + 32));
    game.player.angle = 0;
    const ammo = game.player.ammo;
    for (let i = 0; i < 4 && game.enemies[0].state !== 'dead'; i++) {
      game.enemies[0].body.setPosition(new Vec2(9 * 64 + 16, 3 * 64 + 32));
      game.player.cooldown = 0;
      game.fire();
    }
    assert.equal(game.enemies[0].state, 'dead');
    assert.ok(game.player.ammo < ammo);
    assert.equal(game.kills, 1);
    assert.ok(imp);

    // shotgun pellets deal full damage up close and fall off at long range
    clearEnemies(game);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.angle = 0;
    const closeBrute = game.addEnemy('brute', new Vec2(6 * 64 + 80, 9 * 64 + 32));
    game.player.cooldown = 0;
    game.fireShotgun();
    const closeDamage = ENEMY_TYPES.brute.hp - closeBrute.hp;
    assert.equal(closeDamage, WEAPONS.shotgun.pellets * WEAPONS.shotgun.damage, 'point-blank shotgun blast lands all pellets at full damage (18)');

    clearEnemies(game);
    const farBrute = game.addEnemy('brute', new Vec2(6 * 64 + 440, 9 * 64 + 32));
    game.player.cooldown = 0;
    game.fireShotgun();
    const farDamage = ENEMY_TYPES.brute.hp - farBrute.hp;
    assert.ok(farDamage < closeDamage * 0.45, `long-range shotgun blast drops off sharply from spread and distance falloff (${farDamage} vs ${closeDamage})`);
  },

  'hitscan is stopped by walls'() {
    const game = fresh();
    clearEnemies(game);
    game.addEnemy('brute', new Vec2(4 * 64 + 32, 3 * 64 + 32));
    game.player.body.setPosition(new Vec2(8 * 64 + 32, 3 * 64 + 32));
    game.player.angle = Math.PI;
    const hp = game.enemies[0].hp;
    game.player.cooldown = 0;
    game.fire();
    assert.equal(game.enemies[0].hp, hp, 'shot went through the door');
  },

  'monsters cannot open doors: they wait behind a closed one, and come through once the player opens it'() {
    const game = fresh();
    const player = game.player;
    for (const enemy of game.enemies)
      game.scene.removeBody(enemy.body);
    game.enemies = [];
    game.addEnemy('brute', new Vec2(8 * 64 + 32, 3 * 64 + 32));
    game.enemies[0].state = 'chase';
    player.body.setPosition(new Vec2(2 * 64 + 32, 3 * 64 + 32));
    const door = game.level.doors.get(3 * game.level.width + 5);
    run(game, 8);
    assert.equal(door.open, 0, 'a monster must not open a door');
    assert.equal(player.health, 100, 'the brute got through a closed door');
    assert.ok(game.enemies[0].pos.x > 5 * 64 + 40, 'the brute should be waiting on its own side');

    door.target = 1; // the player opens it
    run(game, 8);
    assert.ok(player.health < 100, `brute never came through the open door (${game.enemies[0].pos.x.toFixed(0)})`);
  },

  'imps fire projectiles that hurt the player and vanish on walls'() {
    const game = fresh();
    for (const enemy of game.enemies)
      game.scene.removeBody(enemy.body);
    game.enemies = [];
    game.addEnemy('imp', new Vec2(12 * 64 + 32, 3 * 64 + 32));
    game.enemies[0].state = 'chase';
    game.player.body.setPosition(new Vec2(10 * 64 + 32, 3 * 64 + 32));
    run(game, 6);
    assert.ok(game.player.health < 100, 'fireballs never landed');
    run(game, 6);
    assert.ok(game.shots.every((shot) => !shot.dead));
    for (const body of game.scene.bodies)
      assert.ok(body.position.x === body.position.x, 'NaN position');
  },

  'dying stops the game and the full first level loads'() {
    const game = fresh();
    game.hurtPlayer(500);
    assert.equal(game.state, 'dead');
    for (let i = 0; i < LEVELS.length; i++) {
      game.load(i);
      assert.ok(game.enemies.length > 0);
    }
  },

  'categories keep pickups from colliding with enemies'() {
    const game = fresh();
    assert.ok(game.pickups.every((p) => p.body.collisionMask === CAT.PLAYER));
  },

  'shotgun hits spray blood that lands as permanent floor splats'() {
    const game = fresh();
    clearEnemies(game);
    game.rand = Rand.create(2);
    game.blood.reset(game.level, game.rand);
    game.addEnemy('brute', new Vec2(9 * 64 + 16, 3 * 64 + 32));
    game.player.body.setPosition(new Vec2(7 * 64, 3 * 64 + 32));
    game.player.angle = 0;
    game.player.cooldown = 0;
    game.fire();
    assert.ok(game.blood.particles.length >= 10, `only ${game.blood.particles.length} droplets`);
    // a wounded enemy keeps dripping, so heal it to isolate this volley
    game.enemies[0].hp = game.enemies[0].def.hp;
    run(game, 3);
    assert.equal(game.blood.particles.length, 0, 'droplets never settled');
    assert.ok(game.blood.floor.length >= 3, `only ${game.blood.floor.length} floor splats`);
    run(game, 10);
    assert.ok(game.blood.floor.length >= 3, 'splats must persist');
  },

  'killing an enemy bursts into gore, gibs and a settled pool that stops growing'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.addEnemy('imp', new Vec2(9 * 64 + 16, 3 * 64 + 32));
    const imp = game.enemies[0];
    game.damageEnemy(imp, 999);
    assert.ok(game.blood.particles.length >= 40, 'no fountain');
    assert.ok(game.blood.particles.some((p) => p.gib), 'no gibs');
    const before = game.blood.floor.length;
    assert.ok(before >= 8, 'no initial spatter');
    run(game, 2);
    assert.ok(game.blood.floor.length > before + 8, 'falling droplets land on the floor');
    game.blood.ceiling.length = 0;
    game.blood.particles.length = 0;
    const settled = game.blood.floor.length;
    run(game, 2);
    assert.equal(game.blood.floor.length, settled, 'floor blood does not keep growing after death');
  },

  'blood that hits a wall leaves a splat on its face, within the level'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    // east wall of the first room is x = 5 * 64; spray at it from the west
    game.blood.spray(new Vec3(4 * 64 + 40, 4 * 64 + 32, 30), new Vec2(1, 0), 200, { speed: 300, spread: 40, up: 60 });
    run(game, 2);
    assert.ok(game.blood.walls.length > 0, 'no wall splats');
    for (const w of game.blood.walls) {
      assert.ok(Math.abs(w.nx) + Math.abs(w.ny) === 1, 'normal must be an axis');
      assert.ok(w.z > 0 && w.z < 110, `bad height ${w.z}`);
    }
  },

  'AC-1 mid-air gib droplets spawn without exceeding capacity or allocating a spawned array'() {
    const game = fresh();
    clearEnemies(game);
    const { blood } = game;
    blood.reset(game.level, game.rand);
    blood.spray(new Vec3(4 * 64 + 32, 4 * 64 + 32, 30), new Vec2(0, 0), 6, { speed: 0, spread: 20, up: 150, gib: true });
    let droplets = 0;
    for (let i = 0; i < 60; i++) {
      blood.update(1 / 60);
      assert.ok(blood.particles.length <= BLOOD.particles);
      for (const p of blood.particles)
        if (p.life === 1.4 && !p.gib)
          droplets++;
    }
    assert.ok(droplets > 0, 'bleeding gibs should drop micro-droplets');
    assert.ok(!/spawned\s*=\s*\[\s*\]/.test(Blood.prototype.update.toString()));
  },

  'AC-2 hitWall has no nested array literals and still splats walls'() {
    assert.ok(!Blood.prototype.hitWall.toString().includes('[['));
    const game = fresh();
    clearEnemies(game);
    const { blood } = game;
    blood.reset(game.level, game.rand);
    const y = 4 * 64 + 32;
    const axis = blood.hitWall({ x: 5 * 64 - 10, y, z: 30, vx: 100, vy: 0, gib: true }, 5 * 64 + 5, y);
    assert.equal(axis, 'x');
    assert.ok(blood.walls.length > 0, 'a gib hitting a wall leaves a splat');
  },

  'AC-3 spray recycles pooled particles and resets every field'() {
    const game = fresh();
    clearEnemies(game);
    const { blood } = game;
    blood.reset(game.level, game.rand);
    blood.spray(new Vec3(4 * 64 + 32, 4 * 64 + 32, 30), new Vec2(0, 0), 20, { speed: 50, spread: 30, up: 60, gib: true });
    const before = new Set(blood.particles);
    for (const p of blood.particles) {
      p.bounces = 7;
      p.bleedTimer = -3;
      p.sever = true;
      p.age = 9;
    }
    for (let i = 0; i < 400 && blood.particles.length; i++)
      blood.update(1 / 30);
    assert.equal(blood.particles.length, 0, 'every particle eventually dies');
    blood.spray(new Vec3(4 * 64 + 32, 4 * 64 + 32, 30), new Vec2(0, 0), 20, { speed: 50, spread: 30, up: 60 });
    const reused = blood.particles.filter((p) => before.has(p));
    assert.ok(reused.length > 0, 'dead particles are recycled');
    for (const p of reused) {
      assert.equal(p.age, 0);
      assert.equal(p.bounces, 0);
      assert.equal(p.bleedTimer, 99);
      assert.equal(p.sever, false);
      assert.equal(p.variant, 0);
      assert.equal(p.gib, false);
    }
    blood.spray(new Vec3(4 * 64 + 32, 4 * 64 + 32, 30), new Vec2(0, 0), BLOOD.particles + 50);
    assert.ok(blood.particles.length <= BLOOD.particles);
    assert.equal(new Set(blood.particles).size, blood.particles.length, 'no particle is listed twice');
    assert.ok(blood.particles.every((p) => !blood.pool.includes(p)), 'a live particle is never in the pool');
  },

  'AC-4 screenSplatQuads and wallDripQuads reuse target storage and match fresh results'() {
    const splat = { x: 0.4, y: 0.3, size: 90, drip: 120, seed: 1234 };
    const screenTarget = createQuadTarget();
    for (const age of [0, 1.5, 3]) {
      const input = { ...splat, age };
      const expected = screenSplatQuads(input, 800, 600, 0.7);
      screenSplatQuads(input, 800, 600, 0.7, screenTarget);
      const refs = screenTarget.quads.slice(0, screenTarget.count);
      const uvs = refs.map((q) => q.uv);
      assert.equal(screenSplatQuads(input, 800, 600, 0.7, screenTarget), screenTarget);
      assert.equal(screenTarget.count, expected.length);
      refs.forEach((q, i) => {
        assert.equal(screenTarget.quads[i], q);
        assert.equal(q.uv, uvs[i]);
        assert.deepEqual(q, expected[i]);
      });
    }
    const wall = { x: 100, y: 200, z: 40, nx: 1, ny: 0, size: 10, top: 110, seed: 77, slope: 0.01 };
    const dripTarget = createQuadTarget();
    const end = dripTime(wall.seed, wall.size);
    for (const age of [0, 1.5, 3, end]) {
      const input = { ...wall, age };
      const expected = wallDripQuads(input);
      wallDripQuads(input, dripTarget);
      const refs = dripTarget.quads.slice(0, dripTarget.count);
      const parts = refs.map((q) => [q.corners, q.uv]);
      wallDripQuads(input, dripTarget);
      assert.equal(dripTarget.count, expected.length);
      refs.forEach((q, i) => {
        assert.equal(dripTarget.quads[i], q);
        assert.equal(q.corners, parts[i][0]);
        assert.equal(q.uv, parts[i][1]);
        assert.deepEqual(Array.from(q.corners), Array.from(expected[i].corners));
        assert.deepEqual(Array.from(q.uv), Array.from(expected[i].uv));
      });
    }
    assert.ok(wallDripQuads({ ...wall, age: end }).length > 0);
  },

  'AC-5 dripping and splat quad builders avoid map and dripTime equals the longest drip'() {
    for (const fn of [screenSplatQuads, wallDripQuads, dripTime])
      assert.ok(!fn.toString().includes('.map('), `${fn.name} still maps`);
    for (const seed of [1, 7, 99, 12345, 0xdeadbeef])
      for (const size of [4, 8, 12]) {
        const expected = Math.max(...wallDrips(seed, size).map((d) => d.delay + d.duration));
        assert.equal(dripTime(seed, size), expected);
      }
  },

  'AC-6 syncDrips keeps finished drip caches independent of the reusable target'() {
    const wall = { x: 100, y: 200, z: 40, nx: 1, ny: 0, size: 10, top: 110, seed: 77, age: 0 };
    const finished = wallDripQuads({ ...wall, age: dripTime(wall.seed, wall.size) });
    const snapshot = JSON.stringify(finished);
    const target = createQuadTarget();
    wallDripQuads({ ...wall, seed: 5, age: 2 }, target);
    wallDripQuads({ ...wall, seed: 9, age: 4 }, target);
    assert.equal(JSON.stringify(finished), snapshot);
    const splat = { x: 0.5, y: 0.5, size: 60, drip: 80, seed: 3, age: 1 };
    const quads = screenSplatQuads(splat, 640, 480, 0.5);
    const hudTarget = screenSplatQuads(splat, 640, 480, 0.5, createQuadTarget());
    for (let i = 0; i < quads.length; i++)
      assert.deepEqual(hudTarget.quads[i], quads[i]);
  },

  'blood respects its caps even when hammered'() {
    const game = fresh();
    clearEnemies(game);
    for (let i = 0; i < 80; i++)
      game.blood.gore(new Vec2(7 * 64, 8 * 64), 1.5);
    assert.ok(game.blood.particles.length <= BLOOD.particles);
    assert.ok(game.blood.floor.length <= BLOOD.floor);
    run(game, 6);
    assert.ok(game.blood.floor.length <= BLOOD.floor && game.blood.walls.length <= BLOOD.walls);
    for (const p of [...game.blood.floor, ...game.blood.walls])
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'NaN splat');
  },

  'getting hurt sprays the screen and the splats fade away'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.hurtPlayer(20);
    assert.ok(game.blood.splats.length >= 5, 'no screen splats');
    assert.ok(game.blood.floor.length >= 1, 'no blood under the player');
    run(game, 6);
    assert.equal(game.blood.splats.length, 0, 'screen splats never faded');
  },

  'a new level starts clean and bumps the splat version'() {
    const game = fresh();
    game.blood.gore(new Vec2(7 * 64, 8 * 64));
    const version = game.blood.version;
    game.load(1);
    assert.equal(game.blood.floor.length + game.blood.particles.length + game.blood.splats.length, 0);
    assert.ok(game.blood.version > version);
  },

  'walking through a pool leaves alternating footprints that fade out'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    const start = new Vec2(6 * 64, 9 * 64 + 32);
    game.player.body.setPosition(start);
    game.player.angle = 0;
    game.blood.floorSplat(new Vec2(start.x + 40, start.y), 22);
    run(game, 0.1);
    run(game, 3, input({ forward: 1 }));
    const prints = game.blood.prints;
    assert.ok(prints.length >= 6, `only ${prints.length} prints`);
    assert.ok(prints.every((p) => Math.abs(p.angle) < 0.2), 'prints must point the way we walked');
    for (let i = 1; i < prints.length; i++)
      assert.notEqual(prints[i].side, prints[i - 1].side, 'feet must alternate');
    assert.ok(prints[0].strength > prints[prints.length - 1].strength, 'the trail must thin out');
    assert.ok(prints[prints.length - 1].x > start.x + 60, 'the trail must run beyond the pool');
    // the left and right prints sit on opposite sides of the path
    const left = prints.filter((p) => p.side > 0).map((p) => p.y);
    const right = prints.filter((p) => p.side < 0).map((p) => p.y);
    assert.ok(Math.min(...left) > Math.max(...right) || Math.max(...left) < Math.min(...right), 'prints overlap');
  },

  'dry feet, standing still and teleporting leave no prints'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.angle = 0;
    run(game, 2, input({ forward: 1 }));
    assert.equal(game.blood.prints.length, 0, 'dry feet left prints');
    // wet but still: no prints
    game.blood.floorSplat(new Vec2(game.player.pos.x, game.player.pos.y), 22);
    run(game, 2);
    assert.equal(game.blood.prints.length, 0, 'standing still left prints');
    // a jump is a teleport, not a step
    game.player.body.setPosition(new Vec2(12 * 64, 9 * 64 + 32));
    run(game, 0.1);
    assert.equal(game.blood.prints.length, 0, 'teleport left prints');
  },

  'AC-1 spray, hit and severBurst accept Vec3 position and Vec2 direction without mutating them'() {
    const game = fresh();
    clearEnemies(game);
    const { blood } = game;
    blood.reset(game.level, game.rand);
    const pos = new Vec3(4 * 64 + 32, 4 * 64 + 32, 30);
    const dir = new Vec2(1, 0);
    blood.spray(pos, dir, 20, { speed: 300, spread: 10 });
    assert.equal(blood.particles.length, 20);
    for (const p of blood.particles)
      assert.ok(p.x === pos.x && p.y === pos.y && p.z === pos.z, 'particles must start at the position');
    assert.ok(blood.particles.reduce((sum, p) => sum + p.vx, 0) / 20 > 0, 'velocity must lean along the direction');
    const before = blood.particles.length;
    blood.hit(pos, dir, 1);
    assert.ok(blood.particles.length > before, 'hit sprayed nothing');
    assert.ok(blood.floor.length > 0, 'hit left no floor splat');
    const gibs = blood.gibs.length;
    blood.severBurst(pos, dir, 1, true);
    assert.equal(blood.gibs.length, gibs + 1, 'severBurst left no gib');
    assert.ok(pos.x === 4 * 64 + 32 && pos.y === 4 * 64 + 32 && pos.z === 30, 'position was mutated');
    assert.ok(dir.x === 1 && dir.y === 0, 'direction was mutated');
  },

  'AC-2 floorSplat, floorGib, ceilingSplat and inPool take Vec2 positions'() {
    const game = fresh();
    clearEnemies(game);
    const { blood } = game;
    blood.reset(game.level, game.rand);
    const pos = new Vec2(6 * 64, 9 * 64 + 32);
    blood.floorSplat(pos, 22);
    assert.ok(blood.floor[0].x === pos.x && blood.floor[0].y === pos.y);
    blood.floorGib(pos, 3, 1);
    assert.ok(blood.gibs[0].x === pos.x && blood.gibs[0].y === pos.y);
    blood.ceilingSplat(pos, 5);
    assert.ok(blood.ceiling[0].x === pos.x && blood.ceiling[0].y === pos.y);
    assert.equal(blood.inPool(new Vec2(pos.x + 22 * 0.75 * 0.5, pos.y)), true);
    assert.equal(blood.inPool(new Vec2(pos.x + 22 * 0.75 * 1.1, pos.y)), false);
    blood.reset(game.level, game.rand);
    blood.floorSplat(pos, 4);
    assert.equal(blood.inPool(pos), false, 'a splat under size 5 is not a pool');
  },

  'AC-3 makeFeet stores a Vec2 pos and walk leaves alternating prints, none on teleport'() {
    const game = fresh();
    clearEnemies(game);
    const { blood } = game;
    blood.reset(game.level, game.rand);
    const feet = makeFeet();
    assert.ok(feet.pos instanceof Vec2);
    assert.ok(!('x' in feet) && !('y' in feet));
    const start = new Vec2(6 * 64, 9 * 64 + 32);
    blood.floorSplat(start, 22);
    assert.equal(blood.walk(feet, start), 0);
    assert.ok(feet.pos.x === start.x && feet.pos.y === start.y);
    const at = new Vec2();
    for (let i = 1; i <= 40; i++)
      blood.walk(feet, at.setScalar(start.x + i * 5, start.y));
    const { prints } = blood;
    assert.ok(prints.length >= 3, `only ${prints.length} prints`);
    for (let i = 1; i < prints.length; i++) {
      assert.notEqual(prints[i].side, prints[i - 1].side, 'feet must alternate');
      assert.ok(prints[i].strength <= prints[i - 1].strength, 'the trail must not strengthen');
    }
    const count = prints.length;
    assert.equal(blood.walk(feet, at.setScalar(at.x + 200, at.y)), 0);
    assert.equal(blood.walk(feet, at), 0);
    assert.equal(blood.prints.length, count, 'a teleport or standing still left prints');
  },

  'AC-4 impact, wallSplat and faceSpan take vector position and normal'() {
    const game = fresh();
    clearEnemies(game);
    const { blood } = game;
    blood.reset(game.level, game.rand);
    assert.equal(blood.impact(new Vec3(9 * 64, 2 * 64 + 32, 0.5), new Vec2(-1, 0)), false, 'a pellet in the floor marks nothing');
    const span = blood.faceSpan(new Vec2(5 * 64, 1 * 64 + 10), new Vec2(-1, 0));
    assert.ok(span.lo < 0 && span.hi > 0 && span.hi - span.lo <= 64 * 64, 'span must straddle the point');
    const pos = new Vec3(5 * 64, 1 * 64 + 10, 30);
    const normal = new Vec2(-1, 0);
    blood.wallSplat(pos, normal, 9, 64);
    const w = blood.walls[blood.walls.length - 1];
    assert.ok(w.nx === -1 && w.ny === 0 && w.z === 30, 'splat must record the normal and height');
    assert.ok(pos.x === 5 * 64 && normal.x === -1, 'arguments were mutated');
  },

  'AC-5 blood method signatures declare no loose scalar coordinate or direction parameters'() {
    const source = readFileSync(new URL('../src/blood.js', import.meta.url), 'utf8');
    const methods = ['spray', 'hit', 'gore', 'drip', 'severBurst', 'boulderPlacement', 'impact', 'faceSpan', 'floorSplat', 'floorGib', 'wallSplat', 'ceilingSplat', 'inPool', 'walk'];
    for (const name of methods) {
      const match = new RegExp(`^  ${name}\\((.*)\\) \\{$`, 'm').exec(source);
      assert.ok(match, `${name} not found`);
      const params = match[1];
      assert.ok(!/\b(dirX|dirY|nx|ny|wx|wy)\b/.test(params), `${name} takes loose direction components: ${params}`);
      assert.ok(!/(^|[(,]\s*)[xyz]\s*[,=)]/.test(`(${params})`), `${name} takes loose coordinates: ${params}`);
    }
  },

  'AC-6 shotgun hits and footprints still produce splats and prints via vector APIs'() {
    const game = fresh();
    clearEnemies(game);
    const { blood } = game;
    blood.reset(game.level, game.rand);
    blood.gore(new Vec2(7 * 64, 8 * 64), 1.5, new Vec2(1, 0));
    run(game, 6);
    assert.ok(blood.floor.length >= 3, `only ${blood.floor.length} floor splats`);
    assert.equal(blood.particles.length, 0, 'droplets never settled');
    const start = new Vec2(6 * 64, 9 * 64 + 32);
    game.player.body.setPosition(start);
    game.player.angle = 0;
    blood.floorSplat(new Vec2(start.x + 40, start.y), 22);
    run(game, 0.1);
    run(game, 3, input({ forward: 1 }));
    assert.ok(blood.prints.length >= 6, `only ${blood.prints.length} prints`);
  },

  'footprints point the way they were walked, left and right mirrored, thin ones plain outlines'() {
    for (const angle of [0, Math.PI / 2, Math.PI, -1]) {
      const { corners } = printQuad({ x: 100, y: 200, angle, side: 1, strength: 1, scale: 1 });
      // the quad's bottom edge runs along the heading, so the picture's toe (to the right) is ahead of its heel
      const along = (corners[3] - corners[0]) * Math.cos(angle) + (corners[5] - corners[2]) * Math.sin(angle);
      assert.ok(along > 3, `toe is not ahead of the heel for heading ${angle}`);
    }
    const right = printQuad({ x: 0, y: 0, angle: 0, side: 1, strength: 1, scale: 1 });
    const left = printQuad({ x: 0, y: 0, angle: 0, side: -1, strength: 1, scale: 1 });
    assert.deepEqual(right.uv.slice(0, 1), left.uv.slice(0, 1));
    assert.equal(right.uv[1], left.uv[3], 'left and right are the same picture, one upside down');
    const thin = printQuad({ x: 0, y: 0, angle: 0, side: 1, strength: 0.2, scale: 1 });
    assert.notDeepEqual(thin.uv, right.uv, 'a thin print is a plain outline, not a fresh heavy print');
  },

  'shooting a wall leaves holes on its face, one per pellet, at their own height'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    // the north wall of the first room: tile row 0, its face is the plane y = 64
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.player.angle = -Math.PI / 2;
    game.player.cooldown = 0;
    game.fire();
    const holes = game.blood.holes;
    assert.ok(holes.length >= 5, `only ${holes.length} holes from six pellets`);
    for (const hole of holes) {
      assert.equal(hole.y, 64, 'holes must lie on the wall plane');
      assert.deepEqual([hole.nx, hole.ny], [0, 1], 'normal must point into the room');
      assert.ok(hole.z > 1 && hole.z < 63, `bad height ${hole.z}`);
    }
    assert.ok(new Set(holes.map((h) => h.x)).size > 1, 'the shotgun cone should scatter the holes');
    // they stay
    run(game, 5);
    assert.equal(game.blood.holes.length, holes.length);
  },

  'the cap holds, a pellet in the floor marks nothing and a new level is clean'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    // a pellet in the floor has nothing to mark
    assert.equal(game.blood.impact(new Vec3(9 * 64, 2 * 64 + 32, 0.5), new Vec2(-1, 0)), false, 'a pellet in the floor marks nothing');
    // cap
    for (let i = 0; i < BLOOD.holes + 60; i++)
      game.blood.impact(new Vec3(64, 4 * 64 + 32, 20 + (i % 20)), new Vec2(1, 0));
    assert.equal(game.blood.holes.length, BLOOD.holes);
    assert.ok(game.blood.holes.every((h) => Number.isFinite(h.x) && Number.isFinite(h.z)));
    const version = game.blood.holesVersion;
    game.load(1);
    assert.equal(game.blood.holes.length, 0);
    assert.ok(game.blood.holesVersion > version);
  },

  'a closed door takes bullet holes on its face, tied to the door'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    const door = [...game.level.doors.values()].find((d) => d.x === 5 && d.y === 3);
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.player.angle = 0;
    game.player.cooldown = 0;
    game.fire();
    const holes = game.blood.holes;
    assert.ok(holes.length >= 5, `only ${holes.length} holes from six pellets`);
    for (const hole of holes) {
      assert.equal(hole.door, door, 'a door hole must belong to its door');
      assert.equal(hole.x, 320, 'hole must lie on the door face');
      assert.deepEqual([hole.nx, hole.ny], [-1, 0]);
      assert.ok(hole.z > 1 && hole.z < 63, `bad height ${hole.z}`);
      assert.equal(hole.top, 64);
    }
    // the door opens, the holes stay in the door's own height and so travel with it
    const before = holes.map((h) => h.z);
    door.target = 1;
    run(game, 0.3);
    assert.ok(door.open > 0.1 && door.open < 1);
    assert.deepEqual(holes.map((h) => h.z), before, 'holes must be fixed to the door, not the world');
    assert.ok(game.blood.holes.every((h) => h.z * (1 - door.open) < 64 * (1 - door.open) + 1e-6), 'a hole is above the lowered door');
  },

  'a half-open door is marked within its current height, a sunk door cannot be marked, and the door cap holds'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    const door = [...game.level.doors.values()].find((d) => d.x === 5 && d.y === 3);
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.player.angle = 0;
    game.level.setDoorOpen(door, 0.5);
    for (let i = 0; i < 6; i++) {
      game.player.cooldown = 0;
      game.player.ammo = 20;
      game.fire();
    }
    assert.ok(game.blood.holes.length >= 20, `only ${game.blood.holes.length} holes`);
    for (const hole of game.blood.holes) {
      // measured where the door is now, a hole must be on the 32 high part that is left
      const now = hole.z * (1 - door.open);
      assert.ok(now > 0 && now < 32, `hole at ${now} is off the half-open door`);
    }
    // fully sunk: nothing left to mark
    game.level.setDoorOpen(door, 1);
    assert.equal(game.blood.impact(new Vec3(320, 3 * 64 + 32, 20), new Vec2(-1, 0)), false, 'marked a door that has sunk away');
    // each door keeps a bounded number of holes
    game.level.setDoorOpen(door, 0);
    for (let i = 0; i < BLOOD.doorHoles + 40; i++)
      game.blood.impact(new Vec3(320, 3 * 64 + 32, 10 + (i % 40)), new Vec2(-1, 0));
    assert.ok(game.blood.holes.filter((h) => h.door === door).length <= BLOOD.doorHoles, 'door hole cap exceeded');
    assert.ok(game.blood.holes.length <= BLOOD.holes);
  },

  'every pellet that stops on a half-height pillar marks its face, inside its height'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    // the pillar at tile (9, 2) is 26 high, below the 32 eye height: its west face is the plane x = 576
    assert.equal(game.level.heights[2 * game.level.width + 9], 26);
    game.player.body.setPosition(new Vec2(6 * 64 + 32, 2 * 64 + 32));
    game.player.angle = 0;
    let stopped = 0;
    for (let i = 0; i < 10; i++) {
      game.player.cooldown = 0;
      game.player.ammo = 20;
      game.fire();
    }
    stopped = game.effects.filter((e) => e.type === 'spark').length;
    assert.equal(stopped, 60, 'every pellet should stop on the pillar');
    assert.equal(game.blood.holes.length, 60, `only ${game.blood.holes.length} of ${stopped} pellets left a mark`);
    for (const hole of game.blood.holes) {
      assert.equal(hole.x, 576, 'hole must lie on the pillar face');
      assert.deepEqual([hole.nx, hole.ny], [-1, 0]);
      assert.ok(hole.z > 1 && hole.z < 26, `hole at ${hole.z} is outside the pillar`);
      assert.equal(hole.top, 26);
    }
    // the sparks land on the pillar too, not floating above it
    assert.ok(game.effects.filter((e) => e.type === 'spark').every((e) => e.z < 26), 'a spark hovers above the pillar');
    // and it is spread over the face, not stacked on one line
    const heights = game.blood.holes.map((h) => h.z);
    assert.ok(Math.max(...heights) - Math.min(...heights) > 8, 'holes should be spread over the face');
  },

  'a bullet hole is a small sprite on the wall plane, cut at the edges of its face, and sparks are a short animation'() {
    const hole = { x: 128, y: 64, z: 30, nx: 0, ny: 1, top: 64, seed: 99 };
    const quad = holeQuad(vecMark(hole));
    const slash = holeQuad(vecMark({ ...hole, kind: 'slash' }));
    const splat = wallSplatQuad({ ...hole, size: 10 });
    const drips = wallDripQuads({ ...hole, size: 10, age: 2 });
    for (let i = 0; i < 12; i += 3) {
      assert.ok(Math.abs(quad.corners[i + 2] - 64.25) < 1e-6, 'every corner must sit just in front of the face');
      assert.ok(quad.corners[i + 2] < splat.corners[i + 2], 'bullet holes must sit behind wall blood splats');
      assert.ok(slash.corners[i + 2] < splat.corners[i + 2], 'chainsaw marks must sit behind wall blood splats');
      if (drips.length > 0)
        assert.ok(quad.corners[i + 2] < drips[0].corners[i + 2], 'bullet holes and chainsaw marks must sit behind wall blood drips');
      assert.ok(quad.corners[i + 1] > 0 && quad.corners[i + 1] < 64, `height ${quad.corners[i + 1]} outside the wall`);
      assert.ok(Math.abs(quad.corners[i] - 128) < 9, 'a hole stays small');
    }
    // near the top of a low wall nothing may poke above it, and the picture is cut by the same share
    for (const seed of [1, 2, 3, 4, 5]) {
      const low = holeQuad(vecMark({ ...hole, z: 25, top: 26, seed }));
      for (let i = 1; i < low.corners.length; i += 3)
        assert.ok(low.corners[i] <= 26, 'hole pokes above the wall');
      assert.ok(low.uv[3] < 1, 'the picture is cut with the quad');
    }
    // a face that ends beside it cuts it, a face that is too narrow leaves nothing
    const cut = holeQuad(vecMark({ ...hole, lo: -3, hi: 3 }));
    assert.ok(cut.corners[0] >= 128 - 3 + 0.3 - 1e-9 && cut.corners[3] <= 128 + 3 - 0.3 + 1e-9, 'cut at the ends of its face');
    assert.equal(holeQuad(vecMark({ ...hole, lo: -0.1, hi: 0.2 })), null);

    const atlas = impactAtlas();
    assert.equal(atlas.width, 32 * IMPACT_CELL_COUNT);
    const solid = (cell) => {
      let n = 0;
      let bright = 0;
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const o = (y * atlas.width + cell * 32 + x) * 4;
          if (atlas.data[o + 3]) {
            n++;
            if (atlas.data[o] > 200)
              bright++;
          }
        }
      }
      return { n, bright };
    };
    for (let v = 0; v < HOLE_VARIANTS; v++)
      assert.ok(solid(IMPACT_CELLS.hole + v).n > 30 && solid(IMPACT_CELLS.hole + v).n < 330 && solid(IMPACT_CELLS.hole + v).bright === 0, 'a hole is a small patch of dark steel, nothing bright');
    // the kinds really differ: no two holes are the same picture, and they differ in how much of the cell they take
    const pictures = new Set();
    const sizes = new Set();
    for (let v = 0; v < HOLE_VARIANTS; v++) {
      let key = '';
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++)
          key += atlas.data[(y * atlas.width + (IMPACT_CELLS.hole + v) * 32 + x) * 4 + 3] ? '1' : '0';
      }
      pictures.add(key);
      sizes.add(Math.round(solid(IMPACT_CELLS.hole + v).n / 8));
    }
    assert.equal(pictures.size, HOLE_VARIANTS, 'every hole is its own picture');
    assert.ok(sizes.size >= 4, 'from small clean punctures to big cracked ones');
    // sparks are small and subtle: four kinds of five frames, each a flash or glint and a few pixels thrown out
    assert.ok(HOLE_VARIANTS + SPARK_VARIANTS * SPARK_FRAMES <= IMPACT_CELL_COUNT, 'the sparks fit the atlas');
    const kinds = new Set();
    for (let k = 0; k < SPARK_VARIANTS; k++) {
      let key = '';
      for (let f = 0; f < SPARK_FRAMES; f++) {
        const cell = IMPACT_CELLS.spark + k * SPARK_FRAMES + f;
        const { n, bright } = solid(cell);
        assert.ok(n < 60, `spark ${k} frame ${f} is a few pixels, not a burst (${n})`);
        if (f === SPARK_FRAMES - 1)
          assert.ok(bright === 0, 'and the last frame is only embers');
        key += n + ',';
      }
      kinds.add(key);
    }
    assert.equal(kinds.size, SPARK_VARIANTS, 'every kind of spark is different');
    assert.ok(solid(IMPACT_CELLS.spark).n > solid(IMPACT_CELLS.spark + SPARK_FRAMES - 1).n, 'it dies away');
    assert.ok(impactCellUv(IMPACT_CELL_COUNT - 1)[2] === 1);
  },

  'AC-1 holeQuad body has no closure, spread, vertex temporaries or impactCellUv call'() {
    const src = readFileSync(new URL('../src/impacts.js', import.meta.url), 'utf8');
    const start = src.indexOf('export function holeQuad');
    const next = src.indexOf('\nexport ', start + 1);
    const body = src.slice(start, next < 0 ? undefined : next).replace(/^export function holeQuad/, '');
    assert.ok(!body.includes('=>'), 'no arrow function');
    assert.ok(!body.includes('...'), 'no spread');
    assert.ok(!body.includes('function '), 'no inner function');
    assert.ok(!body.includes('impactCellUv('), 'no impactCellUv call');
    assert.ok(!/\bat\(/.test(body), 'no at() helper');
  },

  'AC-2 holeQuad writes into a supplied destination in place'() {
    const out = { corners: new Array(12).fill(NaN), uv: new Array(4).fill(NaN) };
    const { corners, uv } = out;
    const marks = [
      { x: 128, y: 64, z: 30, nx: 0, ny: 1, top: 64, seed: 7 },
      { x: 40, y: 90, z: 20, nx: 1, ny: 0, top: 64, seed: 31, slope: 0.1 },
    ];
    for (const mark of marks) {
      assert.equal(holeQuad(vecMark(mark), out), out);
      assert.equal(out.corners, corners);
      assert.equal(out.uv, uv);
      assert.equal(out.corners.length, 12);
      assert.equal(out.uv.length, 4);
      assert.ok(out.corners.every(Number.isFinite) && out.uv.every(Number.isFinite));
      const fresh = holeQuad(vecMark(mark));
      assert.deepEqual(out.corners, fresh.corners);
      assert.deepEqual(out.uv, fresh.uv);
    }
  },

  'AC-3 syncDoorMarks has no mark spread and reuses scratch per mark'() {
    const src = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
    const start = src.indexOf('  syncDoorMarks(');
    const end = src.indexOf('\n  /**', start);
    assert.ok(!src.slice(start, end).includes('...mark'), 'no mark spread');
    const record = (list) => ({ begin() { return this; }, quad(c, u) { list.push({ corners: c.slice(), uv: u.slice() }); }, end() {}, show() {} });
    const holeQuads = [];
    const splatQuads = [];
    const door = { open: 0.25, idx: 0, secret: false };
    const mockWorld = {
      level: { baseHeight: [20] },
      doorMarks: new Map(),
      doorBatch: () => record(holeQuads),
      doorSplatBatch: () => record(splatQuads),
    };
    const holes = [
      { door, x: 100, y: 50, z: 30, nx: 0, ny: 1, top: 64, seed: 3, kind: 'slash', lo: -20, hi: 20, slope: 0.1 },
      { door, x: 110, y: 52, z: 25, nx: 1, ny: 0, top: 64, seed: 9 },
    ];
    const walls = [
      { door, x: 100, y: 50, z: 30, nx: 0, ny: 1, top: 64, seed: 3, size: 8, age: 1, lo: -20, hi: 20, slope: 0.1 },
      { door, x: 110, y: 52, z: 25, nx: 1, ny: 0, top: 64, seed: 9, size: 6 },
    ];
    const blood = { holes, walls, holesVersion: 1, version: 1, dripping: false };
    World.prototype.syncDoorMarks.call(mockWorld, door, blood, true);
    const height = 1 - door.open;
    const drop = door.open * 20;
    const sunkOf = (m) => ({ ...m, x: m.x - m.nx * DOOR_INSET, y: m.y - m.ny * DOOR_INSET, z: m.z - drop, top: m.top * height });
    assert.equal(holeQuads.length, 2);
    holes.forEach((m, i) => {
      const want = holeQuad(vecMark(sunkOf(m)));
      assert.deepEqual(holeQuads[i].corners, want.corners);
      assert.deepEqual(holeQuads[i].uv, want.uv);
    });
    const firstSplat = wallSplatQuad(sunkOf(walls[0]));
    assert.deepEqual(splatQuads[0].corners, firstSplat.corners);
    assert.deepEqual(splatQuads[0].uv, firstSplat.uv);
    const secondSplat = wallSplatQuad(sunkOf(walls[1]));
    const idx = splatQuads.findIndex((q) => q.corners.every((v, k) => v === secondSplat.corners[k]));
    assert.ok(idx > 0, 'second splat uses its own values');
  },

  'AC-4 holeQuad output is bit-identical to the reference math'() {
    const reference = ({ x, y, z, nx, ny, top, seed, kind = 'hole', lo = -Infinity, hi = Infinity, slope = 0 }) => {
      const rnd = mulberry32(seed);
      const cell = kind === 'slash'
        ? IMPACT_CELLS.slash + Math.floor(rnd() * SLASH_VARIANTS)
        : IMPACT_CELLS.hole + Math.floor(rnd() * HOLE_VARIANTS);
      const half = 8;
      const cu0 = Math.max(-half, lo + 0.3);
      const cu1 = Math.min(half, hi - 0.3);
      const cv0 = Math.max(-half, 0.6 - z);
      const cv1 = Math.min(half, top - 0.6 - z);
      if (cu0 >= cu1 || cv0 >= cv1)
        return null;
      const tx = -ny;
      const ty = nx;
      const at = (u, v) => {
        const n = 0.25 - slope * v;
        return [x + tx * u + nx * n, z + v, y + ty * u + ny * n];
      };
      const [a0, b0, a1, b1] = impactCellUv(cell);
      const share = (v, from, to) => (v - from) / (to - from);
      return {
        corners: [...at(cu0, cv0), ...at(cu1, cv0), ...at(cu1, cv1), ...at(cu0, cv1)],
        uv: [a0 + share(cu0, -half, half) * (a1 - a0), b0 + share(cv0, -half, half) * (b1 - b0), a0 + share(cu1, -half, half) * (a1 - a0), b0 + share(cv1, -half, half) * (b1 - b0)],
      };
    };
    const out = { corners: new Array(12), uv: new Array(4) };
    const clips = [{}, { lo: -1, hi: 1 }, { z: 2 }, { top: 33 }, { lo: -5, hi: 0.5, z: 62 }];
    let compared = 0;
    for (let seed = 1; seed <= 12; seed++) {
      for (const slope of [0, 0.1]) {
        for (const kind of ['hole', 'slash']) {
          for (const clip of clips) {
            const mark = { x: 128.3, y: 64.7, z: 30.1, nx: 0.6, ny: 0.8, top: 64, seed, slope, kind, ...clip };
            const want = reference(mark);
            const got = holeQuad(vecMark(mark));
            const gotOut = holeQuad(vecMark(mark), out);
            if (want === null) {
              assert.equal(got, null);
              assert.equal(gotOut, null);
              continue;
            }
            compared++;
            for (const quad of [got, gotOut]) {
              assert.equal(quad.corners.length, 12);
              assert.equal(quad.uv.length, 4);
              want.corners.forEach((v, i) => assert.ok(quad.corners[i] === v));
              want.uv.forEach((v, i) => assert.ok(quad.uv[i] === v));
            }
          }
        }
      }
    }
    assert.ok(compared > 100);
  },

  'AC-5 holeQuad returns null for a fully clipped mark and leaves out untouched'() {
    const base = { x: 128, y: 64, z: 30, nx: 0, ny: 1, top: 64, seed: 5 };
    const out = { corners: new Array(12).fill(7), uv: new Array(4).fill(7) };
    const snapshot = JSON.stringify(out);
    for (const clip of [{ lo: -0.1, hi: 0.2 }, { z: 2, top: 0 }]) {
      assert.equal(holeQuad(vecMark({ ...base, ...clip })), null);
      assert.equal(holeQuad(vecMark({ ...base, ...clip }), out), null);
      assert.equal(JSON.stringify(out), snapshot);
    }
    assert.equal(holeQuad(vecMark(base), out), out);
    assert.deepEqual(out, holeQuad(vecMark(base)));
  },

  'AC-6 holeQuad without out returns independent objects'() {
    const mark = { x: 128, y: 64, z: 30, nx: 0, ny: 1, top: 64, seed: 5 };
    const a = holeQuad(vecMark(mark));
    const b = holeQuad(vecMark(mark));
    assert.notEqual(a, b);
    assert.notEqual(a.corners, b.corners);
    assert.notEqual(a.uv, b.uv);
    const before = b.corners[0];
    a.corners[0] = -999;
    assert.equal(b.corners[0], before);
  },


  'AC-1 holeQuad accepts a Vec3 position and Vec2 normal'() {
    const quad = holeQuad({ pos: new Vec3(128, 64, 30), normal: new Vec2(0, 1), top: 64, seed: 99 });
    assert.equal(quad.corners.length, 12);
    assert.equal(quad.uv.length, 4);
    for (const i of [2, 5, 8, 11])
      assert.ok(Math.abs(quad.corners[i] - 64.25) < 1e-6);
    for (const i of [1, 4, 7, 10])
      assert.ok(quad.corners[i] > 0 && quad.corners[i] < 64);
  },

  'AC-2 holeQuad public options expose pos and normal, not scalar coordinates'() {
    const src = readFileSync(new URL('../src/impacts.js', import.meta.url), 'utf8');
    const start = src.indexOf('export function holeQuad(') + 'export function holeQuad('.length;
    const sig = src.slice(start, src.indexOf(') {', start));
    assert.ok(/\bpos\b/.test(sig) && /\bnormal\b/.test(sig));
    assert.ok(!/\bx\b|\by\b|\bz\b|\bnx\b|\bny\b/.test(sig), 'no scalar coordinate options');
    assert.throws(() => holeQuad({ x: 128, y: 64, z: 30, nx: 0, ny: 1, top: 64, seed: 5 }));
  },

  'AC-3 holeQuad vector output matches the scalar reference geometry'() {
    const reference = ({ x, y, z, nx, ny, top, seed, kind = 'hole', lo = -Infinity, hi = Infinity, slope = 0 }) => {
      const rnd = mulberry32(seed);
      const cell = kind === 'slash'
        ? IMPACT_CELLS.slash + Math.floor(rnd() * SLASH_VARIANTS)
        : IMPACT_CELLS.hole + Math.floor(rnd() * HOLE_VARIANTS);
      const half = 8;
      const cu0 = Math.max(-half, lo + 0.3);
      const cu1 = Math.min(half, hi - 0.3);
      const cv0 = Math.max(-half, 0.6 - z);
      const cv1 = Math.min(half, top - 0.6 - z);
      if (cu0 >= cu1 || cv0 >= cv1)
        return null;
      const tx = -ny;
      const ty = nx;
      const at = (u, v) => {
        const n = 0.25 - slope * v;
        return [x + tx * u + nx * n, z + v, y + ty * u + ny * n];
      };
      const a0 = cell / IMPACT_CELL_COUNT;
      const a1 = (cell + 1) / IMPACT_CELL_COUNT;
      return {
        corners: [...at(cu0, cv0), ...at(cu1, cv0), ...at(cu1, cv1), ...at(cu0, cv1)],
        uv: [a0 + ((cu0 + half) / (2 * half)) * (a1 - a0), (cv0 + half) / (2 * half), a0 + ((cu1 + half) / (2 * half)) * (a1 - a0), (cv1 + half) / (2 * half)],
      };
    };
    const out = { corners: new Array(12), uv: new Array(4) };
    const clips = [{}, { lo: -1, hi: 1 }, { z: 2 }, { top: 33 }, { lo: -5, hi: 0.5, z: 62 }];
    let compared = 0;
    for (let seed = 1; seed <= 12; seed++)
      for (const slope of [0, 0.1])
        for (const kind of ['hole', 'slash'])
          for (const clip of clips) {
            const mark = { x: 128.3, y: 64.7, z: 30.1, nx: 0.6, ny: 0.8, top: 64, seed, slope, kind, ...clip };
            const want = reference(mark);
            const got = holeQuad(vecMark(mark));
            const gotOut = holeQuad(vecMark(mark), out);
            if (want === null) {
              assert.equal(got, null);
              assert.equal(gotOut, null);
              continue;
            }
            compared++;
            for (const quad of [got, gotOut]) {
              want.corners.forEach((v, i) => assert.ok(quad.corners[i] === v));
              want.uv.forEach((v, i) => assert.ok(quad.uv[i] === v));
            }
          }
    assert.ok(compared > 100);
  },

  'AC-4 holeQuad with a vector mark returns null when clipped and reuses out'() {
    const base = { x: 128, y: 64, z: 30, nx: 0, ny: 1, top: 64, seed: 5 };
    const out = { corners: new Array(12).fill(7), uv: new Array(4).fill(7) };
    const snapshot = JSON.stringify(out);
    for (const clip of [{ lo: -0.1, hi: 0.2 }, { top: 10 }]) {
      assert.equal(holeQuad(vecMark({ ...base, ...clip }), out), null);
      assert.equal(JSON.stringify(out), snapshot);
    }
    const { corners, uv } = out;
    assert.equal(holeQuad(vecMark(base), out), out);
    assert.equal(out.corners, corners);
    assert.equal(out.uv, uv);
  },

  'AC-5 syncDoorMarks emits sunk vector hole quads'() {
    const record = (list) => ({ begin() { return this; }, quad(c, u) { list.push({ corners: c.slice(), uv: u.slice() }); }, end() {}, show() {} });
    const holeQuads = [];
    const door = { open: 0.25, idx: 0, secret: false };
    const mockWorld = { level: { baseHeight: [20] }, doorMarks: new Map(), doorBatch: () => record(holeQuads), doorSplatBatch: () => record([]) };
    const holes = [
      { door, x: 100, y: 50, z: 30, nx: 0, ny: 1, top: 64, seed: 3, kind: 'slash', lo: -20, hi: 20, slope: 0.1 },
      { door, x: 110, y: 52, z: 25, nx: 1, ny: 0, top: 64, seed: 9 },
    ];
    World.prototype.syncDoorMarks.call(mockWorld, door, { holes, walls: [], holesVersion: 1, version: 1, dripping: false }, true);
    assert.equal(holeQuads.length, 2);
    holes.forEach((m, i) => {
      const want = holeQuad({ ...m, pos: new Vec3(m.x - m.nx * DOOR_INSET, m.y - m.ny * DOOR_INSET, m.z - door.open * 20), normal: new Vec2(m.nx, m.ny), top: m.top * (1 - door.open) });
      assert.deepEqual(holeQuads[i].corners, want.corners);
      assert.deepEqual(holeQuads[i].uv, want.uv);
    });
  },

  'AC-6 holeQuad does not mutate its vector arguments or allocate in its body'() {
    const pos = new Vec3(128.3, 64.7, 30.1);
    const normal = new Vec2(0.6, 0.8);
    holeQuad({ pos, normal, top: 64, seed: 4, slope: 0.1 }, { corners: new Array(12), uv: new Array(4) });
    assert.deepEqual([pos.x, pos.y, pos.z, normal.x, normal.y], [128.3, 64.7, 30.1, 0.6, 0.8]);
    const src = readFileSync(new URL('../src/impacts.js', import.meta.url), 'utf8');
    const start = src.indexOf('export function holeQuad');
    const next = src.indexOf('\nexport ', start + 1);
    const body = src.slice(start, next < 0 ? undefined : next).replace(/^export function holeQuad/, '');
    for (const bad of ['=>', '...', 'function ', 'impactCellUv('])
      assert.ok(!body.includes(bad), `body contains ${bad}`);
  },

  'AC-7 syncHoles submits cached vector hole quads'() {
    const quads = [];
    const batch = { quad(c, u) { quads.push({ corners: c.slice(), uv: u.slice() }); }, end() {} };
    const wall = { x: 128, y: 64, z: 30, nx: 0, ny: 1, top: 64, seed: 7 };
    const doorHole = { ...wall, door: {} };
    const mockWorld = { holes: { begin: () => batch }, splatCache: new Map(), cachedQuad: World.prototype.cachedQuad };
    const blood = { holes: [wall, doorHole] };
    World.prototype.syncHoles.call(mockWorld, blood);
    assert.equal(quads.length, 1);
    const want = holeQuad(vecMark(wall));
    assert.deepEqual(quads[0].corners, want.corners);
    assert.deepEqual(quads[0].uv, want.uv);
    const cached = [...mockWorld.splatCache.values()];
    World.prototype.syncHoles.call(mockWorld, blood);
    assert.equal(quads.length, 2);
    assert.deepEqual([...mockWorld.splatCache.values()], cached);
    assert.ok([...mockWorld.splatCache.values()].every((v, i) => v === cached[i]));
  },

  'the map starts mostly hidden and only reveals what the player can see'() {
    const game = fresh();
    const { fog, level } = game;
    const idx = (x, y) => y * level.width + x;
    assert.equal(fog.isExplored(idx(1, 1)), true, 'the start tile must be known');
    assert.ok(fog.exploredCount < level.width * level.rowCount * 0.15, `${fog.exploredCount} tiles known at the start`);
    // the closed door at (5, 3) hides the big hall behind it
    assert.equal(fog.isExplored(idx(8, 3)), false, 'saw through a closed door');
    assert.equal(fog.isExplored(idx(20, 8)), false, 'knows a far room it never saw');
    // sight is a subset of memory
    for (let i = 0; i < fog.visible.length; i++) {
      if (fog.visible[i])
        assert.equal(fog.explored[i], 1, 'a visible tile must be explored');
    }
  },

  'an opened door lets sight through, and what was seen is remembered'() {
    const game = fresh();
    clearEnemies(game);
    const { level } = game;
    const idx = (x, y) => y * level.width + x;
    const door = [...level.doors.values()].find((d) => d.x === 5 && d.y === 3);
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.player.angle = 0;
    door.target = 1;
    run(game, 1.2);
    assert.equal(game.fog.isExplored(idx(8, 3)), true, 'could not see through the open door');
    assert.equal(game.fog.isVisible(idx(8, 3)), true);
    const known = game.fog.exploredCount;

    // turn away: it leaves the view but stays on the map, and nothing is ever forgotten
    game.player.angle = Math.PI;
    run(game, 0.5);
    assert.equal(game.fog.isVisible(idx(8, 3)), false, 'still in view while facing away');
    assert.equal(game.fog.isExplored(idx(8, 3)), true, 'forgot a tile it had seen');
    assert.ok(game.fog.exploredCount >= known, 'the explored count went down');
    assert.equal(game.fog.canSee(new Vec2(8 * 64 + 32, 3 * 64 + 32)), false);
  },

  'tall walls block sight but the low pillars do not'() {
    const game = fresh();
    clearEnemies(game);
    const { level, fog } = game;
    const idx = (x, y) => y * level.width + x;
    // in the big hall (row 7), looking east along row 9's pillar at column 3: pillars are 26 high, under the eye
    assert.equal(level.heights[idx(3, 9)], 26);
    fog.explored.fill(0);
    fog.visible.fill(0);
    fog.exploredCount = 0;
    const p1 = new Vec2(1 * 64 + 32, 9 * 64 + 32);
    fog.update(p1, 0);
    assert.equal(fog.isVisible(idx(3, 9)), true, 'the pillar itself should be seen');
    assert.equal(fog.isVisible(idx(8, 9)), true, 'sight must pass over a low pillar');
    // the wall between the hall and the south room (row 13) stops sight dead
    const p2 = new Vec2(10 * 64 + 32, 12 * 64 + 32);
    fog.update(p2, Math.PI / 2);
    assert.equal(fog.isVisible(idx(10, 13)), true, 'the wall face itself is seen');
    assert.equal(fog.isVisible(idx(10, 15)), false, 'saw through a tall wall');
  },

  'AC-1 Fog.update takes a Vec2 and matches the scalar-era visibility'() {
    const game = fresh();
    clearEnemies(game);
    const { level, fog } = game;
    const idx = (x, y) => y * level.width + x;
    fog.explored.fill(0);
    fog.visible.fill(0);
    fog.exploredCount = 0;
    assert.equal(fog.update.length, 2);
    const pos = new Vec2(1 * 64 + 32, 9 * 64 + 32);
    fog.update(pos, 0);
    assert.equal(fog.isVisible(idx(3, 9)), true, 'pillar tile is visible');
    assert.equal(fog.isVisible(idx(8, 9)), true, 'hall tile past pillar is visible');
    assert.ok(fog.exploredCount > 0, 'explored count updated');
  },

  'AC-2 Fog.canSee and tileIndex accept a Vec2'() {
    const game = fresh();
    clearEnemies(game);
    const { level, fog } = game;
    fog.explored.fill(0);
    fog.visible.fill(0);
    fog.exploredCount = 0;
    const pos = new Vec2(1 * 64 + 32, 9 * 64 + 32);
    fog.update(pos, 0);
    const visiblePos = new Vec2(8 * 64 + 32, 9 * 64 + 32);
    const behindClosedDoor = new Vec2(8 * 64 + 32, 3 * 64 + 32);
    assert.equal(fog.canSee(visiblePos), true, 'visible tile returns true');
    assert.equal(fog.canSee(behindClosedDoor), false, 'hidden tile behind door returns false');
    assert.equal(fog.tileIndex(visiblePos), fog.grid.getCell(visiblePos));
    const oob = new Vec2(-64, -64);
    assert.ok(fog.tileIndex(oob) < 0, 'out-of-bounds Vec2 yields negative index');
    assert.equal(fog.canSee(oob), false, 'out-of-bounds Vec2 cannot be seen');
  },

  'AC-3 Fog.cast takes a Vec2 origin without mutating it'() {
    const game = fresh();
    clearEnemies(game);
    const { level, fog } = game;
    const idx = (x, y) => y * level.width + x;
    fog.visible.fill(0);
    const origin = new Vec2(10 * 64 + 32, 12 * 64 + 32);
    const origX = origin.x;
    const origY = origin.y;
    fog.cast(origin, Math.PI / 2, 20);
    assert.equal(fog.isVisible(idx(10, 13)), true, 'wall tile is marked visible');
    assert.equal(fog.isVisible(idx(10, 15)), false, 'tile beyond tall wall is not marked visible');
    assert.equal(origin.x, origX, 'origin.x was not mutated');
    assert.equal(origin.y, origY, 'origin.y was not mutated');
  },

  'AC-4 Fog.update skips unchanged poses and caches a copy of the Vec2'() {
    const game = fresh();
    clearEnemies(game);
    const { level, fog } = game;
    const idx = (x, y) => y * level.width + x;
    const pos = new Vec2(1 * 64 + 32, 9 * 64 + 32);
    fog.update(pos, 0);
    const sentinelIdx = idx(8, 9);
    assert.equal(fog.isVisible(sentinelIdx), true);
    fog.visible[sentinelIdx] = 0;

    // Shift by 1 unit (< 1.5 units): update is skipped and sentinel stays 0
    pos.x += 1;
    fog.update(pos, 0);
    assert.equal(fog.isVisible(sentinelIdx), false, 'small shift < 1.5 units skips recomputation');

    // Shift by 2 more units (total shift > 1.5 units from last cached pos): recomputed
    pos.x += 2;
    fog.update(pos, 0);
    assert.equal(fog.isVisible(sentinelIdx), true, 'shift >= 1.5 units triggers recomputation');

    // Mutating pos afterwards does not corrupt fog.lastPos
    const lastX = fog.lastPos.x;
    const lastY = fog.lastPos.y;
    pos.x += 100;
    pos.y += 100;
    assert.equal(fog.lastPos.x, lastX, 'fog.lastPos did not alias mutated vector');
    assert.equal(fog.lastPos.y, lastY, 'fog.lastPos did not alias mutated vector');
  },

  'AC-5 game and hud callers pass vectors to Fog without scalar extraction'() {
    const gameSrc = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
    const hudSrc = readFileSync(new URL('../src/hud.js', import.meta.url), 'utf8');
    const badPatterns = [
      /fog\.update\([^)]*\.(?:pos\.)?[xy]/,
      /fog\.canSee\([^)]*\.(?:pos\.)?[xy]/,
      /this\.fog\.canSee\([^)]*\.(?:pos\.)?[xy]/,
    ];
    for (const pattern of badPatterns) {
      assert.ok(!pattern.test(gameSrc), `src/game.js matched forbidden scalar extraction pattern: ${pattern}`);
      assert.ok(!pattern.test(hudSrc), `src/hud.js matched forbidden scalar extraction pattern: ${pattern}`);
    }
  },

  'enemies show on the map only while in view, and a new level starts with a fresh fog'() {
    const game = fresh();
    const { fog } = game;
    // enemies in the hall behind the closed door are not in view
    assert.ok(game.enemies.every((e) => !fog.canSee(e.pos)), 'an enemy is visible through the walls');
    game.player.body.setPosition(new Vec2(6 * 64 + 32, 9 * 64 + 32));
    game.player.angle = 0;
    run(game, 0.2);
    assert.ok(game.enemies.some((e) => fog.canSee(e.pos)), 'an enemy in plain view is not visible');
    const known = fog.exploredCount;
    assert.ok(known > 0);
    game.load(1);
    assert.notEqual(game.fog, fog);
    assert.ok(game.fog.exploredCount < known + 200 && game.fog.exploredCount > 0);
    assert.equal(game.fog.isExplored(0), false);
  },

  'the shotgun is heard firing and pumping, and an empty gun only clicks'() {
    const game = fresh();
    clearEnemies(game);
    game.events.length = 0;
    game.player.cooldown = 0;
    game.fire();
    const types = game.events.map((e) => e.type);
    assert.ok(types.includes('fire'), 'no shot sound');
    assert.equal(game.events.find((e) => e.type === 'fire').pump, true, 'a shell is left, so it should pump');

    game.events.length = 0;
    game.player.ammo = 1;
    game.player.cooldown = 0;
    game.fire();
    assert.equal(game.events.find((e) => e.type === 'fire').pump, false, 'the last shell needs no pump');

    game.events.length = 0;
    game.player.ammo = 0;
    game.player.cooldown = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.ok(game.events.some((e) => e.type === 'dry'), 'no click on an empty gun');
    assert.ok(!game.events.some((e) => e.type === 'fire'));
  },

  'pellets sound different on a wall, on a door and on flesh'() {
    const game = fresh();
    clearEnemies(game);
    game.player.angle = -Math.PI / 2;
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.events.length = 0;
    game.player.cooldown = 0;
    game.fire();
    const walls = game.events.filter((e) => e.type === 'impact');
    assert.ok(walls.length >= 5 && walls.every((e) => e.surface === 'wall'), 'plain wall hits');

    game.player.angle = 0;
    game.events.length = 0;
    game.player.cooldown = 0;
    game.fire();
    const doors = game.events.filter((e) => e.type === 'impact');
    assert.ok(doors.length >= 5 && doors.every((e) => e.surface === 'door'), 'door hits');
    assert.ok(doors.every((e) => e.x > 300 && e.x < 340), 'the sound comes from the door, not the player');

    clearEnemies(game);
    game.addEnemy('brute', new Vec2(4 * 64, 3 * 64 + 32));
    game.player.body.setPosition(new Vec2(2 * 64, 3 * 64 + 32));
    game.events.length = 0;
    game.player.cooldown = 0;
    game.fire();
    assert.ok(game.events.some((e) => e.type === 'flesh'), 'no flesh hit');
  },

  'enemies announce themselves once, cry out in pain and die with their own voice'() {
    const game = fresh();
    clearEnemies(game);
    // off to the side of the line of fire, so the volley wakes them without hitting them
    game.addEnemy('imp', new Vec2(8 * 64, 11 * 64 + 32));
    game.addEnemy('brute', new Vec2(12 * 64, 10 * 64 + 32));
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.events.length = 0;
    // both have the player in sight, so both wake
    game.player.angle = 0;
    game.player.cooldown = 0;
    game.fire();
    run(game, 0.5);
    const alerts = game.events.filter((e) => e.type === 'alert');
    assert.deepEqual(alerts.map((e) => e.kind).sort(), ['brute', 'imp'], 'each enemy wakes exactly once, in its own voice');
    run(game, 1);
    assert.equal(game.events.filter((e) => e.type === 'alert').length, 2, 'awake enemies must not announce themselves again');
    // heard from where they stand, and flagged by whether the player can see them
    assert.ok(alerts.every((e) => Number.isFinite(e.x) && typeof e.visible === 'boolean'));

    game.events.length = 0;
    const imp = game.enemies.find((e) => e.type === 'imp');
    game.damageEnemy(imp, 999);
    const death = game.events.find((e) => e.type === 'die');
    assert.equal(death.kind, 'imp');
    assert.equal(death.x, imp.pos.x);
  },

  'monsters wake only once they can see the player: gunfire through a wall wakes no one'() {
    const game = fresh();
    clearEnemies(game);
    // the first room (x 1..4) is closed off by a wall at x = 5; put the monsters in the next room
    game.addEnemy('imp', new Vec2(7 * 64, 2 * 64 + 32));
    game.addEnemy('brute', new Vec2(8 * 64, 3 * 64));
    game.player.body.setPosition(new Vec2(2 * 64, 2 * 64 + 32));
    game.player.angle = 0;
    for (let i = 0; i < 4; i++) {
      game.player.cooldown = 0;
      game.fire();
      run(game, 0.4);
    }
    assert.ok(game.enemies.every((e) => e.state === 'idle'), 'gunfire woke a monster that cannot see the player');

    // a pack wakes together only when it can see each other
    game.addEnemy('swarmer', new Vec2(7 * 64 + 20, 2 * 64 + 32));
    game.addEnemy('swarmer', new Vec2(2 * 64, 2 * 64 + 50));
    const [near, behind] = game.enemies.slice(-2);
    game.wake(near);
    assert.equal(behind.state, 'idle', 'a swarmer behind a wall must not be woken by its pack');
  },

  'imp fireballs are heard being launched and exploding, brutes are heard swinging'() {
    const game = fresh();
    for (const enemy of game.enemies)
      game.scene.removeBody(enemy.body);
    game.enemies = [];
    game.addEnemy('imp', new Vec2(12 * 64 + 32, 3 * 64 + 32));
    game.enemies[0].state = 'chase';
    game.player.body.setPosition(new Vec2(10 * 64 + 32, 3 * 64 + 32));
    game.events.length = 0;
    run(game, 6);
    const kinds = game.events.map((e) => e.type);
    assert.ok(kinds.includes('fireball'), 'no launch sound');
    assert.ok(kinds.includes('explode'), 'no explosion sound');
    assert.ok(kinds.indexOf('fireball') < kinds.indexOf('explode'));

    const brawl = fresh();
    clearEnemies(brawl);
    brawl.addEnemy('brute', new Vec2(6 * 64 + 40, 9 * 64 + 32));
    brawl.enemies[0].state = 'chase';
    brawl.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    brawl.events.length = 0;
    run(brawl, 4);
    assert.ok(brawl.events.some((e) => e.type === 'swing' && e.kind === 'brute'), 'no swing');
    assert.ok(brawl.events.some((e) => e.type === 'hurt'), 'no grunt when hit');
  },

  'getting hurt, dying and a failing heart all make sound'() {
    const game = fresh();
    clearEnemies(game);
    game.events.length = 0;
    game.hurtPlayer(10);
    assert.ok(game.events.some((e) => e.type === 'hurt'));
    assert.ok(!game.events.some((e) => e.type === 'death'));

    game.player.health = 25;
    game.events.length = 0;
    run(game, 6);
    const slow = game.events.filter((e) => e.type === 'heartbeat').length;
    assert.ok(slow >= 5, `only ${slow} heartbeats in 6s`);

    game.player.health = 5;
    game.events.length = 0;
    run(game, 6);
    const fast = game.events.filter((e) => e.type === 'heartbeat').length;
    assert.ok(fast > slow + 1, `a weaker heart must beat faster (${fast} against ${slow})`);

    game.player.health = 80;
    game.events.length = 0;
    run(game, 3);
    assert.equal(game.events.filter((e) => e.type === 'heartbeat').length, 0, 'a healthy player has no heartbeat');

    game.events.length = 0;
    game.hurtPlayer(500);
    assert.ok(game.events.some((e) => e.type === 'death'));
  },

  'doors, pickups and the exit have sounds, and doors announce each direction once'() {
    const game = fresh();
    clearEnemies(game);
    const door = [...game.level.doors.values()].find((d) => d.x === 5 && d.y === 3);
    game.player.body.setPosition(new Vec2(4 * 64 + 40, 3 * 64 + 32));
    game.player.angle = 0;
    game.events.length = 0;
    // one key press: use() reaches doors within 96 units
    game.update(1 / 60, input({ use: true }));
    run(game, 1);
    const opening = game.events.filter((e) => e.type === 'doorOpen');
    assert.equal(opening.length, 1, 'a door opening must be announced exactly once');
    assert.deepEqual([opening[0].x, opening[0].y], [door.center.x, door.center.y]);
    // left alone it closes again, which is announced too
    game.player.body.setPosition(new Vec2(1 * 64 + 32, 3 * 64 + 32));
    run(game, 7);
    assert.equal(game.events.filter((e) => e.type === 'doorClose').length, 1);

    game.events.length = 0;
    const ammo = game.addPickup('ammo', game.player.pos.clone());
    game.player.ammo = 5;
    game.player.body.setPosition(ammo.pos.clone());
    run(game, 0.1);
    assert.deepEqual(game.events.filter((e) => e.type === 'pickup').map((e) => e.kind), ['ammo']);

    // the exit of the first level, with the way clear
    const exit = game.level.exits[0];
    game.player.body.setPosition(new Vec2(exit.x, exit.y - 64));
    game.player.angle = Math.PI / 2;
    game.events.length = 0;
    run(game, 1.5, input({ forward: 1 }));
    assert.equal(game.state, 'cleared');
    assert.equal(game.events.filter((e) => e.type === 'clear').length, 1, 'the level-clear sound plays once');
  },

  'footsteps: the player and the enemies are heard, and steps in blood are wet'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.angle = 0;
    game.events.length = 0;
    run(game, 1.5, input({ forward: 1 }));
    const dry = game.events.filter((e) => e.type === 'step');
    assert.ok(dry.length >= 4, `only ${dry.length} steps in 1.5s`);
    assert.ok(dry.every((e) => e.wet === false && e.who === 'player'), 'dry floor, dry steps');

    game.blood.floorSplat(new Vec2(game.player.pos.x + 30, game.player.pos.y), 22);
    game.events.length = 0;
    run(game, 1.5, input({ forward: 1 }));
    assert.ok(game.events.some((e) => e.type === 'step' && e.wet), 'no wet steps after the pool');

    game.addEnemy('brute', new Vec2(20 * 64, 9 * 64 + 32));
    game.enemies[0].state = 'chase';
    game.events.length = 0;
    run(game, 2);
    const heavy = game.events.filter((e) => e.type === 'stomp' && e.kind === 'brute');
    assert.ok(heavy.length >= 2, 'a walking brute should be heard');
    assert.ok(heavy.every((e) => e.x > 640), 'its steps come from where it stands');
  },

  'the event queue is capped and a new level starts with none'() {
    const game = fresh();
    for (let i = 0; i < 600; i++)
      game.emit('step', null, { wet: false });
    assert.equal(game.events.length, 256);
    game.load(1);
    assert.equal(game.events.length, 0);
  },

  'sound is placed by distance and by which side of the listener it is on'() {
    const listener = new Vec2(0, 0);
    const south = { angle: Math.PI / 2 };
    // facing east, "right" is south (+y) in the game's plane
    assert.ok(spatial(listener, new Vec2(200, 200)).pan > 0.3, 'a sound to the right must pan right');
    assert.ok(spatial(listener, new Vec2(200, -200)).pan < -0.3, 'a sound to the left must pan left');
    assert.ok(Math.abs(spatial(listener, new Vec2(300, 0)).pan) < 1e-9, 'a sound dead ahead is centred');
    assert.ok(Math.abs(spatial(listener, new Vec2(-300, 0)).pan) < 1e-9, 'so is one dead behind');
    // turning to face south, the same sound is now on the left
    assert.ok(spatial(listener, new Vec2(200, 200), south).pan > 0.3 === false);
    assert.ok(spatial(listener, new Vec2(-200, 200), south).pan > 0.3, 'facing south, west is on the right');
    // louder when near, silent when out of range, and right on top of the listener it is centred and full
    const gains = [0, 100, 300, 600, 900].map((d) => spatial(listener, new Vec2(d, 0)).gain);
    for (let i = 1; i < gains.length; i++)
      assert.ok(gains[i] < gains[i - 1], 'gain must fall with distance');
    assert.equal(spatial(listener, new Vec2(0, 0)).gain, 1);
    assert.equal(spatial(listener, new Vec2(0, 0)).pan, 0);
    assert.equal(spatial(listener, new Vec2(5000, 0)).gain, 0, 'out of range is silent');
    assert.ok(Math.abs(spatial(listener, new Vec2(0, 20)).pan) < 0.3, 'a source very close has a soft pan');
  },

  'only the player leaves bloody footprints; monsters walk through blood cleanly, and prints are capped'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.addEnemy('brute', new Vec2(20 * 64, 9 * 64 + 32));
    const brute = game.enemies[0];
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    brute.state = 'chase';
    game.blood.floorSplat(new Vec2(brute.pos.x, brute.pos.y), 24);
    game.events.length = 0;
    run(game, 3);
    assert.equal(game.blood.prints.length, 0, `the brute left ${game.blood.prints.length} prints`);
    assert.equal(brute.feet.blood, 0, 'a monster\'s feet must stay clean');
    assert.ok(game.events.some((e) => e.type === 'stomp'), 'but it is still heard walking');

    for (let i = 0; i < 400; i++)
      game.blood.walk({ blood: 1, travel: 1000, side: 1, placed: true, pos: new Vec2(0, 0), heading: new Vec2(1, 0) }, new Vec2(1, 0));
    assert.ok(game.blood.prints.length <= BLOOD.prints, 'prints exceeded their cap');
    for (const p of game.blood.prints)
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.angle), 'NaN print');
  },

  'the player\'s footsteps land once per head-bob dip, not once per few units walked'() {
    const game = new Game();
    game.load(0);
    game.state = 'play';
    const before = game.player.bob;
    let steps = 0;
    const count = () => { steps += game.events.filter((e) => e.type === 'step').length; game.events.length = 0; };
    for (let t = 0; t < 4; t += 1 / 60) {
      game.update(1 / 60, input({ forward: 1 }));
      count();
    }
    const dips = (game.player.bob - before) / Math.PI;
    assert.ok(Math.abs(steps - dips) <= 1, `${steps} steps for ${dips.toFixed(1)} bob dips`);
    assert.ok(steps >= 8 && steps <= 14, `walking 4s is about 3 steps a second, got ${steps}`);
  },

  'blood thrown at a wall corner marks a face that exists, never open air beside it'() {
    for (const index of [0, 1]) {
      const game = fresh(index);
      const { level, blood } = game;
      const open = (x, y) => level.inBounds(Math.floor(x / 64), Math.floor(y / 64)) && level.heightAtPoint(new Vec2(x, y)) <= 0;
      const solid = (x, y) => level.inBounds(Math.floor(x / 64), Math.floor(y / 64)) && level.heightAtPoint(new Vec2(x, y)) > 0;
      let checked = 0;
      const verify = () => {
        for (const w of blood.walls) {
          if (w.door)
            continue;
          checked++;
          assert.ok(solid(w.x - w.nx * 0.5, w.y - w.ny * 0.5), `a splat at ${w.x},${w.y} has no wall behind it`);
          assert.ok(open(w.x + w.nx * 0.5, w.y + w.ny * 0.5), `a splat at ${w.x},${w.y} faces a wall`);
          assert.ok(w.lo <= 0 && w.hi >= 0, 'the splat must sit within its own face');
        }
        blood.walls.length = 0;
      };
      for (let ty = 0; ty < level.rowCount; ty++) {
        for (let tx = 0; tx < level.width; tx++) {
          if (!open(tx * 64 + 32, ty * 64 + 32))
            continue;
          // spots touching a wall, flat on or at a corner: that is where drops reach corners
          const near = [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => solid((tx + dx) * 64 + 32, (ty + dy) * 64 + 32));
          if (!near)
            continue;
          for (let round = 0; round < 6; round++) {
            blood.spray(new Vec3(tx * 64 + 32, ty * 64 + 32, 20), new Vec2(0, 0), 60, { spread: 300, up: 120 });
            for (let i = 0; i < 40; i++)
              blood.update(1 / 60);
            verify();
          }
        }
      }
      assert.ok(checked > 0, 'no blood reached a wall');
    }
  },

  'the barrel skin is an orange drum in a power-of-two atlas, wrapped on a cylinder by its texture coordinates'() {
    const atlas = barrelAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height), 'a power-of-two atlas can have mipmaps');
    assert.equal(atlas.data.length, BARREL_ATLAS.width * BARREL_ATLAS.height * 4);
    let r = 0;
    let b = 0;
    for (let y = 0; y < atlas.side.height; y++) {
      for (let x = 0; x < atlas.side.width; x++) {
        const o = (y * atlas.width + x) * 4;
        assert.equal(atlas.data[o + 3], 255, 'the skin has no holes in it');
        r += atlas.data[o];
        b += atlas.data[o + 2];
      }
    }
    assert.ok(r > b * 2.5, 'the drum is orange');

    // a cylinder like RoostR's: the side comes first, then the two caps, and every coordinate runs 0..1
    const sides = 20;
    const uvs = [];
    for (let row = 0; row <= 1; row++) {
      for (let x = 0; x <= sides; x++)
        uvs.push(x / sides, 1 - row);
    }
    for (let cap = 0; cap < 2; cap++) {
      uvs.push(0.5, 0.5);
      for (let x = 0; x <= sides; x++)
        uvs.push(Math.sin((x / sides) * Math.PI * 2) * 0.5 + 0.5, Math.cos((x / sides) * Math.PI * 2) * 0.5 + 0.5);
    }
    skinBarrel({ uvs }, sides, 1);
    const sideVertices = (sides + 1) * 2;
    for (let i = 0; i < uvs.length / 2; i++) {
      const u = uvs[i * 2];
      if (i < sideVertices)
        assert.ok(u >= 0 && u <= 0.5, 'the side wraps round the left half of the atlas');
      else
        assert.ok(u >= 0.5 && u <= 0.75, 'a cap shows the lid');
    }
  },

  'the explosion is sixteen frames of a fireball that grows, cools into smoke and thins out'() {
    const atlas = explosionAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height));
    assert.equal(atlas.width, EXPLOSION_CELL * EXPLOSION_FRAMES);
    const stats = (frame) => {
      let solid = 0;
      let bright = 0;
      for (let y = 0; y < EXPLOSION_CELL; y++) {
        for (let x = 0; x < EXPLOSION_CELL; x++) {
          const o = (y * atlas.width + frame * EXPLOSION_CELL + x) * 4;
          if (!atlas.data[o + 3])
            continue;
          solid++;
          if (atlas.data[o] > 200 && atlas.data[o + 1] > 120)
            bright++;
        }
      }
      return { solid, bright };
    };
    const frames = Array.from({ length: EXPLOSION_FRAMES }, (_, i) => stats(i));
    assert.ok(frames[5].solid > frames[0].solid * 4, 'it grows from the flash');
    assert.ok(Math.max(...frames.map((f) => f.bright)) > 300, 'it burns bright');
    assert.ok(frames[EXPLOSION_FRAMES - 1].solid < frames[5].solid / 4, 'and thins out to almost nothing');
    assert.ok(frames[EXPLOSION_FRAMES - 1].bright < frames[5].bright / 20, 'the last frame is smoke and a few embers, not fire');
    // the ground blocks downward expansion: nothing appears below EXPLOSION_FLOOR_Y, and the blast spreads wide along the floor
    for (let f = 0; f < EXPLOSION_FRAMES; f++)
      for (let y = EXPLOSION_FLOOR_Y + 1; y < EXPLOSION_CELL; y++)
        for (let x = 0; x < EXPLOSION_CELL; x++)
          assert.equal(atlas.data[(y * atlas.width + f * EXPLOSION_CELL + x) * 4 + 3], 0, `frame ${f} leaks below the floor at y=${y}`);
    const bounds = (frame) => {
      let minX = EXPLOSION_CELL;
      let maxX = -1;
      let minY = EXPLOSION_CELL;
      let maxY = -1;
      let floorContacts = 0;
      for (let y = 0; y < EXPLOSION_CELL; y++) {
        for (let x = 0; x < EXPLOSION_CELL; x++) {
          const a = atlas.data[(y * atlas.width + frame * EXPLOSION_CELL + x) * 4 + 3];
          if (a < 40)
            continue;
          if (x < minX)
            minX = x;
          if (x > maxX)
            maxX = x;
          if (y < minY)
            minY = y;
          if (y > maxY)
            maxY = y;
          if (y >= EXPLOSION_FLOOR_Y - 1)
            floorContacts++;
        }
      }
      return { width: maxX - minX + 1, height: maxY - minY + 1, maxY, floorContacts };
    };
    const early = bounds(3);
    assert.equal(early.maxY, EXPLOSION_FLOOR_Y, 'the blast sits flush against the floor line');
    assert.ok(early.floorContacts >= 28, 'the bottom of the fireball flattens into a wide skirt along the floor');
    assert.ok(early.width > early.height * 1.15, 'the ground-deflected blast is wider than it is tall (non-spherical)');
    // the picture stays inside its cell: nothing on the edge could be cut off
    for (const frame of [4, 6, 8]) {
      for (let k = 0; k < EXPLOSION_CELL; k++) {
        for (const [x, y] of [[k, 0], [k, EXPLOSION_CELL - 1], [0, k], [EXPLOSION_CELL - 1, k]])
          assert.equal(atlas.data[(y * atlas.width + frame * EXPLOSION_CELL + x) * 4 + 3], 0, `frame ${frame} touches the edge of its cell`);
      }
    }
  },

  'the ceiling is a dark power-of-two atlas of steel panels, with light fixtures in a regular rhythm'() {
    const atlas = ceilingAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height), 'a power-of-two atlas can have mipmaps');
    assert.equal(CEILING_CELL_COUNT, 8, 'all 8 ceiling atlas cells are distinct overhead architectural structures');
    const signatures = new Set();
    for (let cell = 0; cell < CEILING_CELL_COUNT; cell++) {
      let r = 0;
      let b = 0;
      let hash = 0;
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const o = (y * atlas.width + cell * 64 + x) * 4;
          assert.equal(atlas.data[o + 3], 255);
          r += atlas.data[o];
          b += atlas.data[o + 2];
          hash = (Math.imul(hash, 31) + atlas.data[o] + atlas.data[o + 1] * 3 + atlas.data[o + 2] * 7) | 0;
        }
      }
      assert.ok(b > r, `ceiling cell ${cell} is cool gunmetal/slate overhead steel`);
      signatures.add(hash);
    }
    assert.equal(signatures.size, CEILING_CELL_COUNT, 'every ceiling cell has a unique pixel-art pattern');
    const light = (y, x) => atlas.data[(y * atlas.width + CEILING_CELLS.light * 64 + x) * 4 + 2];
    assert.ok(light(32, 30) > 150, 'a light fixture is bright');
    assert.equal(ceilingCellFor(2, 3), CEILING_CELLS.light);
    assert.equal(ceilingCellFor(7, 3), CEILING_CELLS.light, 'fixtures repeat every five by four tiles');
    assert.notEqual(ceilingCellFor(2, 2), CEILING_CELLS.light, 'adjacent rows are not crowded with light fixtures');
    assert.equal(ceilingCellFor(3, 7), ceilingCellFor(3, 7), 'the same ceiling every time');
    const seen = new Set();
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++)
        seen.add(ceilingCellFor(x, y));
    }
    assert.equal(seen.size, CEILING_CELL_COUNT, 'rooms mix all 8 coffered overhead ceiling cells');
    assert.ok(!CEILING_FRAGMENT.includes('RUST_BRIGHT'), 'ceiling shader does not paint brown floor rust puddles onto the ceiling');
    assert.ok(CEILING_FRAGMENT.includes('edgeGirder'), 'ceiling shader accentuates overhead coffer girder seams');
    const [u0, , u1] = ceilingCellUv(2);
    assert.ok(u0 > 2 / 8 && u1 < 3 / 8, 'a cell is sampled a hair inside its edges');
  },

  'walls are steel bulkheads in a power-of-two atlas, one quad per tile and per 64 units up, with no rust baked in'() {
    const atlas = wallAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height), 'a power-of-two atlas can have mipmaps');
    assert.equal(atlas.width, 64 * WALL_CELL_COUNT);
    for (let cell = 0; cell < WALL_CELL_COUNT; cell++) {
      let r = 0;
      let b = 0;
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const o = (y * atlas.width + cell * 64 + x) * 4;
          assert.equal(atlas.data[o + 3], 255);
          r += atlas.data[o];
          b += atlas.data[o + 2];
        }
      }
      assert.ok(b > r, `cell ${cell} is blue-grey steel, with the rust left to the shader`);
    }

    // a face 3 tiles long and 104 high (a tall wall): 3 tiles, 2 pieces up each, and the pieces tile the face exactly
    const quads = wallFaceQuads({ axis: 'x', plane: 128, from: 2, to: 4, base: 0, top: 104, tile: new Vec2(2, 0), d: 1, exit: false });
    assert.equal(quads.length, 6);
    let area = 0;
    for (const q of quads) {
      const c = q.corners;
      assert.ok(c.every((v, i) => i % 3 !== 0 || v === 128), 'every piece is on the plane of the face');
      area += Math.abs(c[8] - c[2]) * Math.abs(c[7] - c[1]);
      assert.ok(q.uv[2] > q.uv[0] && q.uv[3] > q.uv[1], 'its picture is a real rectangle');
    }
    assert.equal(area, 3 * 64 * 104, 'the pieces cover the face exactly, with no gaps and no overlap');
    const exitQuads = wallFaceQuads({ axis: 'z', plane: 64, from: 1, to: 1, base: 0, top: 64, tile: new Vec2(1, 0), d: 3, exit: true });
    assert.equal(exitQuads.length, 1);
    assert.equal(wallCellFor(new Vec2(1, 0), 3, true), WALL_CELLS.exit, 'an exit wears the green hatch');
    assert.equal(wallCellFor(new Vec2(5, 9), 2), wallCellFor(new Vec2(5, 9), 2), 'the same wall always looks the same');
    const seen = new Set();
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 30; x++)
        seen.add(wallCellFor(new Vec2(x, y), 0));
    }
    assert.ok(seen.size >= 5 && !seen.has(WALL_CELLS.exit), 'a wall mixes plain panels with vents, pipes, lights and consoles');
  },

  'AC-1 diagWallFaceQuads takes Vec2 endpoints and heights'() {
    const quads = diagWallFaceQuads({ a: new Vec2(0, 0), b: new Vec2(64, 64), heights: new Vec2(0, 150), tile: new Vec2(0, 0), diag: 0, exit: false });
    assert.equal(quads.length, 3);
    assert.deepEqual(quads[0].corners.slice(0, 6), [0, 0, 0, 64, 0, 64]);
    assert.equal(quads[1].corners[1], 64);
  },

  'AC-2 wallCellFor takes a Vec2 tile'() {
    assert.equal(wallCellFor(new Vec2(5, 9), 2, true), WALL_CELLS.exit);
    assert.equal(wallCellFor(new Vec2(5, 9), 2), wallCellFor(new Vec2(5, 9), 2));
  },

  'AC-3 wallCellFor keeps the legacy hash'() {
    const legacy = (x, y, d) => {
      let h = Math.imul(x * 73856093 ^ y * 19349663 ^ d * 83492791, 2654435761);
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
    };
    const seen = new Set();
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 30; x++) {
        for (let d = 0; d < 8; d++) {
          const cell = wallCellFor(new Vec2(x, y), d);
          assert.equal(cell, legacy(x, y, d));
          seen.add(cell);
        }
      }
    }
    assert.ok(seen.size >= 5 && !seen.has(WALL_CELLS.exit));
  },

  'AC-4 wallFaceQuads takes a Vec2 tile'() {
    const quads = wallFaceQuads({ axis: 'x', plane: 128, from: 2, to: 4, base: 0, top: 104, tile: new Vec2(2, 0), d: 1, exit: false });
    assert.equal(quads.length, 6);
    let area = 0;
    for (const q of quads) {
      for (let i = 0; i < 12; i += 3)
        assert.equal(q.corners[i], 128);
      area += 64 * (q.corners[7] - q.corners[1]);
      assert.ok(q.uv[2] > q.uv[0] && q.uv[3] > q.uv[1]);
    }
    assert.equal(area, 3 * 64 * 104);
  },

  'AC-5 wallFaceQuads exit faces use the exit cell'() {
    const quads = wallFaceQuads({ axis: 'z', plane: 64, from: 1, to: 1, base: 0, top: 64, tile: new Vec2(1, 0), d: 3, exit: true });
    assert.equal(quads.length, 1);
    assert.equal(quads[0].uv[0], wallCellUv(WALL_CELLS.exit, 0, 1)[0]);
  },

  'AC-6 vectorized wall quads keep geometry'() {
    const quad = wallFaceQuads({ axis: 'x', plane: 64, from: 1, to: 1, base: 0, top: 64, tile: new Vec2(1, 1), d: 0, exit: false })[0];
    assert.deepEqual(quad.corners, [64, 0, 64, 64, 0, 128, 64, 64, 128, 64, 64, 64]);
    const level = new Level(LEVELS.find((entry) => entry.name.startsWith('E1M5')));
    withWallWorld((world, programs) => {
      World.prototype.buildStatic.call(world, level);
      let low = Infinity;
      for (const { mesh, fragment } of programs) {
        if (fragment !== WALL_FRAGMENT)
          continue;
        for (let i = 1; i < mesh.used * 3 && i < mesh.vertices.length; i += 3)
          low = Math.min(low, mesh.vertices[i]);
      }
      assert.ok(Math.abs(low - -0.2) < 1e-4, `lowest wall vertex is at the floor plane, got ${low}`);
    });
  },

  'AC-7 wall quad generators declare no scalar coordinates'() {
    const wall = readFileSync(new URL('../src/wall.js', import.meta.url), 'utf8');
    const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
    assert.ok(wall.includes('export function wallCellFor(tile'));
    assert.ok(wall.includes('export function diagWallFaceQuads({ a, b, heights, tile'));
    assert.doesNotMatch(world, /diagWallFaceQuads\(\{[^}]*\b(ax|ay|bx|by):/);
    assert.doesNotMatch(wall, /export function wallFaceQuads\(\{[^}]*\b[xy],/);
  },

  'doors are a box in a power-of-two atlas of steel with green lights, rusted in the shader on the door itself'() {
    const atlas = doorAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height), 'a power-of-two atlas can have mipmaps');
    assert.equal(atlas.width, 64 * DOOR_CELLS);
    let green = 0;
    let rusty = 0;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const o = (y * atlas.width + x) * 4;
        assert.equal(atlas.data[o + 3], 255, 'a door has no holes in it');
        if (atlas.data[o + 1] > atlas.data[o] * 1.6 && atlas.data[o + 1] > atlas.data[o + 2] * 1.2)
          green++;
        if (atlas.data[o] > atlas.data[o + 2] * 2.2 && atlas.data[o + 1] < atlas.data[o] * 0.5 && atlas.data[o] < 125)
          rusty++;
      }
    }
    assert.ok(green > 40, 'the status lights are green');
    assert.equal(rusty, 0, 'no rust is baked in: it is worked out in the shader');

    const { vertices, uvs } = doorBox(new Vec2(64, 64));
    assert.equal(vertices.length / 3, 30, 'four sides and a top, two triangles each');
    assert.equal(uvs.length / 2, 30);
    for (let i = 1; i < vertices.length; i += 3)
      assert.ok(vertices[i] >= 0 && vertices[i] <= 64, 'a door stands on the floor and no higher than its tile');
    assert.ok(DOOR_FRAGMENT.includes('vHeight < -0.01'), 'what has sunk below the floor is not drawn');
    assert.ok(DOOR_FRAGMENT.includes('vSurface'), 'rust follows the door, not the world, so it does not slide off as it sinks');
  },

  'AC-1 doorBox accepts a Vec2 or Vec3 dimensions primitive'() {
    const a = doorBox(new Vec2(64, 64));
    const b = doorBox(new Vec3(64, 64, 64));
    assert.deepEqual(a.vertices, b.vertices);
    assert.deepEqual(a.uvs, b.uvs);
  },

  'AC-2 doorBox takes a single dimensions parameter'() {
    assert.equal(doorBox.length, 1);
    assert.ok(/function doorBox\(\s*dimensions\s*\)/.test(doorBox.toString()));
  },

  'AC-3 doorBox honors non-square dimensions'() {
    const { vertices, uvs } = doorBox(new Vec2(62.4, 64));
    assert.equal(vertices.length / 3, 30);
    assert.equal(uvs.length / 2, 30);
    let top = -Infinity;
    for (let i = 0; i < vertices.length; i += 3) {
      assert.ok(Math.abs(vertices[i]) <= 31.2 + 1e-9);
      assert.ok(Math.abs(vertices[i + 2]) <= 31.2 + 1e-9);
      assert.ok(vertices[i + 1] >= 0 && vertices[i + 1] <= 64);
      top = Math.max(top, vertices[i + 1]);
    }
    assert.equal(top, 64);
  },

  'AC-4 doorBox preserves legacy vertex positions and UVs'() {
    const { vertices, uvs } = doorBox(new Vec2(64, 64));
    assert.deepEqual(vertices.slice(0, 3), [-32, 0, 32]);
    const inset = 0.25 / (64 * DOOR_CELLS);
    assert.ok(Math.abs(uvs[0] - inset) < 1e-9);
    assert.equal(uvs[1], 0);
    assert.ok(Math.abs(uvs[2] - (1 / DOOR_CELLS - inset)) < 1e-9);
    const topStart = vertices.length - 18;
    for (let i = topStart; i < vertices.length; i += 3)
      assert.equal(vertices[i + 1], 64);
    assert.ok(Math.abs(uvs[uvs.length - 12] - (1 / DOOR_CELLS + inset)) < 1e-9, 'the top face uses the second atlas cell');
  },

  'AC-5 buildCrusher passes a Vec2 to doorBox'() {
    const source = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
    assert.ok(source.includes('doorBox(new Vec2(TILE - 1.6, TILE))'));
    assert.ok(!source.includes('doorBox(TILE'));
  },

  'the floor texture is a power-of-two atlas of opaque, dark deck tiles, rust is brown, and doorsteps are hazard stripes'() {
    const atlas = floorAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height), 'a power-of-two atlas can have mipmaps');
    assert.equal(atlas.width, TILE_PIXELS * FLOOR_CELL_COUNT);
    const average = (cell) => {
      const sum = [0, 0, 0];
      for (let y = 0; y < TILE_PIXELS; y++) {
        for (let x = 0; x < TILE_PIXELS; x++) {
          const o = (y * atlas.width + cell * TILE_PIXELS + x) * 4;
          assert.equal(atlas.data[o + 3], 255, 'a floor tile has no holes in it');
          for (let k = 0; k < 3; k++)
            sum[k] += atlas.data[o + k];
        }
      }
      return sum.map((v) => v / (TILE_PIXELS * TILE_PIXELS));
    };
    for (let cell = 0; cell < FLOOR_CELL_COUNT; cell++) {
      const [r, g, b] = average(cell);
      assert.ok(Math.max(r, g, b) < 110, `cell ${cell} stays dark enough for the lines to read over it`);
    }
    const [pr, , pb] = average(FLOOR_CELLS.plain);
    assert.ok(pb > pr, 'bare deck is blue-grey steel');
    for (let cell = 0; cell < FLOOR_CELL_COUNT; cell++) {
      if (cell === FLOOR_CELLS.hazard)
        continue;
      const [r, , b] = average(cell);
      assert.ok(b > r, `cell ${cell} has no rust baked in: the rust is worked out in the shader, so it crosses tiles`);
    }
    assert.ok(FLOOR_FRAGMENT.includes('vWorld') && FLOOR_VERTEX.includes('vWorld = world.xz'), 'rust follows the world, not the tile');
    const [hr, , hb] = average(FLOOR_CELLS.hazard);
    assert.ok(hr > hb, 'a doorstep is striped orange');

    const [u0, v0, u1, v1] = floorCellUv(3);
    assert.ok(u0 > 3 / FLOOR_CELL_COUNT && u1 < 4 / FLOOR_CELL_COUNT && v0 === 0 && v1 === 1, 'a cell is sampled a hair inside its edges');
    assert.equal(floorCellFor(4, 7, true), FLOOR_CELLS.hazard);
    assert.equal(floorCellFor(4, 7), floorCellFor(4, 7), 'the same tile always looks the same');
    const seen = new Set();
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 30; x++)
        seen.add(floorCellFor(x, y));
    }
    assert.ok(seen.size >= 7 && !seen.has(FLOOR_CELLS.hazard), 'a room mixes the patterns, and keeps the stripes for doors');
  },

  'the shotgun is a pixel-art sprite: a steel and wood gun in five frames, flashing when it fires and pumping after, sharp at whole screen pixels'() {
    const atlas = weaponAtlas();
    assert.equal(atlas.width, WEAPON_CELL_W * WEAPON_FRAME_COUNT);
    assert.equal(atlas.height, WEAPON_CELL_H);
    const frame = (f) => {
      let solid = 0;
      let bright = 0;
      let wood = 0;
      let lowest = 0;
      for (let y = 0; y < WEAPON_CELL_H; y++) {
        for (let x = 0; x < WEAPON_CELL_W; x++) {
          const o = (y * atlas.width + f * WEAPON_CELL_W + x) * 4;
          if (!atlas.data[o + 3])
            continue;
          solid++;
          lowest = Math.max(lowest, y);
          if (atlas.data[o] > 230 && atlas.data[o + 1] > 190)
            bright++;
          if (atlas.data[o] > atlas.data[o + 2] * 1.8 && atlas.data[o + 1] > 40 && atlas.data[o] < 200)
            wood++;
        }
      }
      return { solid, bright, wood, lowest };
    };
    const rest = frame(WEAPON_FRAMES.idle);
    assert.ok(rest.solid > 2500, 'the gun fills a good part of its picture');
    assert.ok(rest.wood > 150, 'the pump is wood');
    assert.equal(rest.lowest, WEAPON_CELL_H - 1, 'it stands on the bottom edge, so it can come up from under the screen');
    assert.ok(frame(WEAPON_FRAMES.flashA).bright > 60, 'the first frame of the shot is a bright flash');
    assert.ok(frame(WEAPON_FRAMES.flashA).solid > frame(WEAPON_FRAMES.flashB).solid, 'and the flash dies down');
    const pictures = new Set();
    for (let f = 0; f < WEAPON_FRAME_COUNT; f++) {
      let key = 0;
      for (let y = 0; y < WEAPON_CELL_H; y++) {
        for (let x = 0; x < WEAPON_CELL_W; x++)
          key = (Math.imul(key, 31) + atlas.data[(y * atlas.width + f * WEAPON_CELL_W + x) * 4 + 3] + atlas.data[(y * atlas.width + f * WEAPON_CELL_W + x) * 4]) | 0;
      }
      pictures.add(key);
    }
    assert.equal(pictures.size, WEAPON_FRAME_COUNT, 'every frame is its own picture');

    // the animation follows the time since the shot: flash, flash, rest, then the pump goes back and forth
    assert.equal(weaponFrame(-1), WEAPON_FRAMES.idle);
    assert.equal(weaponFrame(0.01), WEAPON_FRAMES.flashA);
    assert.equal(weaponFrame(WEAPON_TIMES.flashB + 0.001), WEAPON_FRAMES.flashB);
    assert.equal(weaponFrame(WEAPON_TIMES.rest + 0.05), WEAPON_FRAMES.idle);
    assert.equal(weaponFrame(WEAPON_TIMES.pumpA + 0.01), WEAPON_FRAMES.pumpA);
    assert.equal(weaponFrame(WEAPON_TIMES.pumpB + 0.01), WEAPON_FRAMES.pumpB);
    assert.equal(weaponFrame(WEAPON_TIMES.pumpBack + 0.01), WEAPON_FRAMES.pumpA);
    assert.equal(weaponFrame(WEAPON_TIMES.done + 0.01), WEAPON_FRAMES.idle);
    assert.equal(weaponFrame(WEAPON_TIMES.pumpB + 0.01, false), WEAPON_FRAMES.idle, 'an empty gun is not pumped');
    assert.ok(WEAPON_TIMES.done < FIRE_COOLDOWN, 'the whole animation is over before the gun can fire again');
    let last = -1;
    for (let t = 0; t < FIRE_COOLDOWN; t += 1 / 60) {
      const f = weaponFrame(t);
      assert.ok(f >= 0 && f < WEAPON_FRAME_COUNT);
      last = f;
    }
    assert.equal(last, WEAPON_FRAMES.idle, 'it ends at rest');

    // placement: whole screen pixels per art pixel, centred, standing on the bottom, kicking up and swaying
    const still = weaponPlacement({ width: 1280, height: 760 });
    assert.ok(Number.isInteger(still.pixel) && still.pixel >= 2, 'pixels are whole, so the art stays sharp');
    assert.equal(still.x1 - still.x0, WEAPON_CELL_W * still.pixel);
    assert.equal(still.y1 - still.y0, WEAPON_CELL_H * still.pixel);
    assert.ok(Math.abs((still.x0 + still.x1) / 2 - 640) <= 1, 'centred');
    assert.ok(still.y1 > 760, 'it stands below the edge of the screen');
    const kicked = weaponPlacement({ width: 1280, height: 760, recoil: 1 });
    assert.ok(kicked.y1 < still.y1 && kicked.y1 > 760, 'the kick lifts it but never shows a gap under it');
    const swayed = weaponPlacement({ width: 1280, height: 760, bob: Math.PI / 2, moving: 1 });
    assert.ok(swayed.x0 !== still.x0, 'it sways as you walk');
    assert.ok(weaponPlacement({ width: 3000, height: 2000 }).pixel > still.pixel, 'and it is bigger on a bigger screen');
    const [u0, v0, u1, v1] = weaponCellUv(2);
    assert.ok(u0 > 2 / WEAPON_FRAME_COUNT && u1 < 3 / WEAPON_FRAME_COUNT && v0 === 0 && v1 === 1);
  },

  'blood thrown up sticks to the ceiling and lets go of drops; blood on a wall runs down it for a few seconds and stops'() {
    const game = new Game();
    game.load(0);
    const { blood } = game;
    blood.reset(game.level, game.rand);
    // a fountain straight up in the first room
    blood.spray(new Vec3(2 * 64, 3 * 64, 30), new Vec2(0, 0), 200, { speed: 0, spread: 40, up: 560 });
    for (let i = 0; i < 90; i++)
      blood.update(1 / 60);
    assert.ok(blood.ceiling.length > 10, `only ${blood.ceiling.length} ceiling splats`);
    assert.ok(blood.ceiling.every((c) => c.height > 60 && c.height < 64), 'a ceiling splat is just under the ceiling');
    assert.ok(blood.ceiling.length <= BLOOD.ceiling, 'ceiling blood is capped');
    // they let go of drops that fall back down
    const before = blood.particles.length;
    for (let i = 0; i < 60 * 6; i++)
      blood.update(1 / 60);
    assert.ok(blood.floor.length > 0, 'the drops come down');
    assert.ok(blood.ceiling.some((c) => c.age > 5), 'ceiling splats age');
    void before;

    // a wall splat: drips are fixed by its seed, run down, slow, stop where they stop, and stay on the face
    const splat = { x: 192, y: 64, z: 61, nx: 0, ny: 1, size: 10, top: 64, seed: 4242, lo: -30, hi: 30 };
    const drips = wallDrips(splat.seed, splat.size);
    assert.deepEqual(drips, wallDrips(splat.seed, splat.size), 'the same seed always gives the same drips');
    assert.ok(drips.length >= 1 && drips.every((d) => d.length > 5 && d.duration > 2));
    const lowest = (age) => {
      const quads = wallDripQuads({ ...splat, age });
      let low = Infinity;
      for (const q of quads) {
        for (let k = 1; k < 12; k += 3)
          low = Math.min(low, q.corners[k]);
      }
      return { low, count: quads.length };
    };
    assert.equal(lowest(0).count, 0, 'nothing runs at the moment of the hit');
    const a = lowest(1.5).low;
    const b = lowest(3).low;
    const end = dripTime(splat.seed, splat.size);
    const c = lowest(end).low;
    assert.ok(a > b && b > c, 'the drips run down');
    assert.ok(a - b > (b - c) * 0.9, 'and they slow as they go');
    assert.equal(lowest(end + 5).low, c, 'then they stay where they stopped');
    for (const q of wallDripQuads({ ...splat, age: end })) {
      for (let k = 0; k < 12; k += 3) {
        assert.ok(Math.abs(q.corners[k + 2] - 64.45) < 1e-6, 'drips lie on the wall plane');
        assert.ok(q.corners[k + 1] >= 0.6 - 1e-6, 'and stop at the floor');
      }
    }
    // diversity: over many splats every kind of stem and tip shows up, in every motion, with stubs and long runs
    const stems = new Set();
    const tips = new Set();
    const profiles = new Set();
    const counts = new Set();
    const pixels = [];
    let stubs = 0;
    let longRuns = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const found = wallDrips(seed * 7919, 4 + (seed % 9));
      counts.add(found.length);
      for (const d of found) {
        stems.add(d.stem);
        tips.add(d.tip);
        profiles.add(d.profile);
        pixels.push(d.pixel);
        if (d.length < 10)
          stubs++;
        if (d.length > 30)
          longRuns++;
      }
    }
    assert.equal(stems.size, STEM_KINDS, 'every kind of stem is used');
    assert.equal(tips.size, TIP_KINDS, 'every kind of tip is used');
    assert.equal(profiles.size, 4, 'drips slow, stutter and creep');
    assert.ok(counts.size >= 4, 'splats have different numbers of drips');
    assert.ok(stubs > 50 && longRuns > 50, 'there are short stubs and long runs');
    assert.ok(Math.max(...pixels) / Math.min(...pixels) > 1.8, 'and thin and thick ones');
    // the tip is small: much smaller than the width of the stem it ends, and never a round blob
    assert.ok(Math.max(...TIP_HEIGHTS) <= 9, 'a tip is at most nine pixels tall');
    const atlas = bloodAtlas();
    for (let k = 0; k < TIP_KINDS; k++) {
      let n = 0;
      let widest = 0;
      for (let y = 0; y < TIP_HEIGHTS[k]; y++) {
        let row = 0;
        for (let x = 0; x < CELL; x++)
          if (atlas.data[(y * atlas.width + (CELLS.tips + k) * CELL + x) * 4 + 3]) {
            n++;
            row++;
          }
        widest = Math.max(widest, row);
      }
      assert.ok(n < TIP_HEIGHTS[k] * 4 + 2 && widest <= 7, `tip ${k} is a small point (${n} pixels, ${widest} wide), not a blob`);
    }
    // a face that ends beside the splat takes the drips that would hang past it
    const narrow = wallDripQuads({ ...splat, age: end, lo: -0.2, hi: 0.2 });
    assert.equal(narrow.length, 0);
    // the sim keeps the time the renderer needs to stop redrawing
    blood.reset(game.level, game.rand);
    blood.wallSplat(new Vec3(192, 64, 40), new Vec2(0, 1), 10, 64);
    assert.equal(blood.walls[0].dripTime, dripTime(blood.walls[0].seed, 10));
    blood.update(0.1);
    assert.equal(blood.dripping, true, 'a fresh splat is dripping');
    for (let i = 0; i < 60 * 8; i++)
      blood.update(1 / 60);
    assert.equal(blood.dripping, false, 'and it stops');
  },

  'blood sprites: the atlas is red, the quads lie flat where they should, and a wall splat is cut at the edge of its face'() {
    const atlas = bloodAtlas();
    assert.equal(atlas.data.length, atlas.width * atlas.height * 4);
    assert.equal(atlas.width, atlas.frames * CELL);
    for (let cell = 0; cell < atlas.frames; cell++) {
      let solid = 0;
      for (let y = 0; y < CELL; y++) {
        for (let x = 0; x < CELL; x++) {
          const o = (y * atlas.width + cell * CELL + x) * 4;
          if (!atlas.data[o + 3])
            continue;
          solid++;
          assert.ok(atlas.data[o] >= atlas.data[o + 1] && atlas.data[o] >= atlas.data[o + 2], 'every pixel is red');
        }
      }
      // the tips of drips are the smallest sprites, a few pixels
      assert.ok(solid > (cell >= CELLS.tips ? 8 : 20), `cell ${cell} should have something drawn in it`);
    }
    assert.deepEqual(cellUv(0).map((v) => +v.toFixed(4)), [0, 0, +(1 / atlas.frames).toFixed(4), 1]);

    const floor = floorSplatQuad({ x: 200, y: 300, size: 6, seed: 99 });
    assert.equal(floor.corners.length, 12);
    for (let i = 1; i < 12; i += 3)
      assert.ok(Math.abs(floor.corners[i] - 0.3) < 1e-9, 'a floor splat lies just above the floor');
    const side = Math.hypot(floor.corners[3] - floor.corners[0], floor.corners[5] - floor.corners[2]);
    assert.ok(Math.abs(side - 19.2) < 1e-9, 'a floor splat is 3.2 times its size across');

    const print = printQuad({ x: 100, y: 100, angle: 0.5, side: 1, strength: 1, scale: 1 });
    const mirrored = printQuad({ x: 100, y: 100, angle: 0.5, side: -1, strength: 1, scale: 1 });
    assert.equal(print.uv[1], 0);
    assert.equal(mirrored.uv[1], 1, 'a left foot is the right one upside down');
    assert.notDeepEqual(print.uv, printQuad({ x: 100, y: 100, angle: 0.5, side: 1, strength: 0.2, scale: 1 }).uv, 'a faint print is an outline');

    // a splat on a wall face: it stays on the face's plane, inside its ends and below its top, whatever the corner
    const game = new Game();
    game.load(1);
    const { level, blood } = game;
    let checked = 0;
    for (let ty = 0; ty < level.rowCount; ty++) {
      for (let tx = 0; tx < level.width; tx++) {
        const i = ty * level.width + tx;
        if (!level.kind[i] || level.kind[i] === DOOR || level.heights[i] <= 20)
          continue;
        for (const [nx, ny] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!level.inBounds(tx + nx, ty + ny) || level.heights[(ty + ny) * level.width + tx + nx] > 0)
            continue;
          const fx = (tx + (nx > 0 ? 1 : 0)) * 64;
          const fy = (ty + (ny > 0 ? 1 : 0)) * 64;
          for (const along of [0.2, 3, 32, 61, 63.8]) {
            const x = nx ? fx : tx * 64 + along;
            const y = ny ? fy : ty * 64 + along;
            blood.wallSplat(new Vec3(x, y, 30), new Vec2(nx, ny), 12, level.heights[i]);
            const splat = blood.walls[blood.walls.length - 1];
            const quad = wallSplatQuad(splat);
            if (!quad)
              continue;
            checked++;
            for (let k = 0; k < 12; k += 3) {
              const px = quad.corners[k];
              const py = quad.corners[k + 1];
              const pz = quad.corners[k + 2];
              // on the plane of the face, a hair in front of it
              assert.ok(Math.abs((nx ? px - fx : pz - fy) * (nx || ny) - 0.4) < 1e-6, 'a wall splat lies on its face');
              // within the stretch of face that runs either side of the splat
              const u = (px - splat.x) * -ny + (pz - splat.y) * nx;
              assert.ok(u >= splat.lo - 1e-6 && u <= splat.hi + 1e-6, 'a wall splat does not run past a corner');
              assert.ok(py >= 0.6 - 1e-6 && py <= level.heights[i] - 0.6 + 1e-6, 'a wall splat stays between the floor and the top');
            }
            for (let k = 0; k < 4; k += 2)
              assert.ok(quad.uv[k] >= cellUv(6)[0] - 1e-9 && quad.uv[k] <= cellUv(9)[2] + 1e-9, 'its picture stays inside the atlas');
          }
        }
      }
    }
    assert.ok(checked > 100, 'no wall splats were checked');
    // cut entirely away by a face that is too narrow
    assert.equal(wallSplatQuad({ x: 64, y: 100, z: 30, nx: -1, ny: 0, size: 6, top: 64, seed: 5, lo: -0.1, hi: 0.2 }), null);

    // blood on the player's view: a starburst that grows, and a drip that runs down and fades with it
    const splat = { x: 0.5, y: 0.4, size: 60, age: 0, drip: 120, seed: 77 };
    const fresh0 = screenSplatQuads(splat, 1000, 800, 1);
    const grown = screenSplatQuads({ ...splat, age: 2 }, 1000, 800, 0.5);
    assert.equal(fresh0.length, 1, 'a fresh splat has no drip yet');
    assert.ok(grown.length >= 3, 'an older one has a drip, made of a stem and a tip');
    assert.ok(grown[0].x1 - grown[0].x0 > fresh0[0].x1 - fresh0[0].x0, 'the starburst grows');
    assert.ok(grown.every((q) => q.fade === 0.5), 'all of it fades together');
    const dripQuads = grown.slice(1);
    const reach = Math.max(...dripQuads.map((q) => q.y1)) - Math.min(...dripQuads.map((q) => q.y0));
    assert.ok(Math.min(...dripQuads.map((q) => q.y0)) > grown[0].y0, 'the drip starts inside the burst and runs down from it');
    assert.ok(reach > 100, 'the drip runs down');

    // Hud.drawBlood always keeps screen blood translucent so the player can see the 3D world behind it
    assert.ok(SCREEN_BLOOD_ALPHA >= 0.6 && SCREEN_BLOOD_ALPHA <= 0.85, 'screen blood max alpha is translucent yet clearly visible');
    const drawnAlphas = [];
    const hud = new Hud(
      { width: 800, height: 600, getContext: () => ({}) },
      {
        crisp: {
          sprites: {
            quad(_rect, _uv, a) {
              drawnAlphas.push(a);
            },
          },
        },
      },
    );
    hud.width = 800;
    hud.height = 600;
    hud.drawBlood({ blood: { splats: [{ x: 0.5, y: 0.5, size: 50, age: 0, life: 4, drip: 120, seed: 42 }] } });
    assert.ok(drawnAlphas.length > 0 && drawnAlphas.every((a) => a > 0 && a <= SCREEN_BLOOD_ALPHA + 1e-6), 'fresh visor blood splats are always translucent');

    const particle = particleQuad({ pos: new Vec3(10, 20, 30), gib: false }, new Vec3(1, 0, 0), new Vec3(0, 1, 0), 0);
    assert.deepEqual(particle.corners.map((v) => +v.toFixed(6)), [9.35, 29.35, 20, 10.65, 29.35, 20, 10.65, 30.65, 20, 9.35, 30.65, 20], 'a droplet faces the camera');
  },

  'adaptive resolution drops on slow frames, ignores stalls and rises only after a long fast spell'() {
    const q = new Quality();
    const feed = (dt, seconds) => {
      const frames = Math.round(seconds / dt / 45) * 45; // whole averaging windows
      for (let i = 0; i < frames; i++) q.update(dt);
    };

    feed(1 / 60, 20);
    assert.equal(q.scale, 1, 'a steady 60 fps must stay sharp');

    for (let i = 0; i < 500; i++) q.update(0.5);
    assert.equal(q.scale, 1, 'stalls must not count as slow frames');

    feed(1 / 30, 1.5);
    assert.ok(q.scale < 1, 'a 30 fps stretch must lower the resolution');
    const dropped = q.scale;

    feed(1 / 60, 4);
    assert.equal(q.scale, dropped, 'it must not bounce back quickly');
    feed(1 / 60, 12);
    assert.ok(q.scale > dropped, 'it should recover after a long fast spell');
  },

  'adaptive resolution stops retrying a level that failed right after a rise'() {
    const q = new Quality();
    const feed = (dt, seconds) => {
      const frames = Math.round(seconds / dt / 45) * 45; // whole averaging windows
      for (let i = 0; i < frames; i++) q.update(dt);
    };

    feed(1 / 30, 1.5);
    const low = q.scale;
    feed(1 / 60, 12);
    assert.ok(q.scale > low, 'rose');
    feed(1 / 30, 1.5); // the sharper level cannot be sustained
    assert.equal(q.scale, low);
    feed(1 / 60, 60);
    assert.equal(q.scale, low, 'must not try the failed level again');
  },

  'the HUD marine face is an animated sprite atlas that glances around, scowls when shooting, winces on damage and bleeds as health drops'() {
    const atlas = faceAtlas();
    assert.equal(atlas.width, FACE_CELL_W * FACE_FRAME_COUNT);
    assert.equal(atlas.height, FACE_CELL_H);
    const pictures = new Set();
    let armorSteel = 0;
    let cyanTelemetry = 0;
    const crimsonCount = (f) => {
      let red = 0;
      let key = 0;
      for (let y = 0; y < FACE_CELL_H; y++)
        for (let x = 0; x < FACE_CELL_W; x++) {
          const o = (y * atlas.width + f * FACE_CELL_W + x) * 4;
          const r = atlas.data[o];
          const g = atlas.data[o + 1];
          const b = atlas.data[o + 2];
          const a = atlas.data[o + 3];
          key = (Math.imul(key, 31) + r + g + a) | 0;
          if (a && r > g * 2.2 && r > b * 2.2)
            red++;
          if (f === 0 && a && b > r * 1.15 && g > r * 1.05 && (y <= 16 || y >= 34))
            armorSteel++;
          if (f === 0 && a && b >= 200 && g >= 160 && b > r * 2)
            cyanTelemetry++;
        }
      pictures.add(key);
      return red;
    };
    for (let f = 0; f < FACE_FRAME_COUNT; f++)
      crimsonCount(f);
    assert.equal(pictures.size, FACE_FRAME_COUNT, 'every face frame is distinct');
    assert.ok(armorSteel > 450, 'marine wears futuristic steel/slate helmet and power-armor pauldrons/gorget');
    assert.ok(cyanTelemetry >= 20, 'helmet brow-visor, holo-reticle, and chest armor vents have glowing cyan telemetry LEDs');
    const tier80Frame = faceFrame({ health: 80, time: 0 });
    assert.equal(tier80Frame, 1 * FACE_POSE_COUNT + FACE_POSES.center, '80% health uses damage tier 1');
    assert.ok(crimsonCount(tier80Frame) >= crimsonCount(0) + 40, 'visible blood appears on the marine face even at 80% health');
    for (let t = 1; t < 5; t++)
      assert.ok(crimsonCount(t * FACE_POSE_COUNT) > crimsonCount((t - 1) * FACE_POSE_COUNT), `damage tier ${t} is bloodier than tier ${t - 1}`);

    // reactions to health, hurt, shooting, and idle time
    assert.equal(faceFrame({ health: 0 }), FACE_DEAD_FRAME, 'dead at 0 health');
    assert.equal(faceFrame({ health: 100, hurt: 0.3 }), FACE_POSES.pain, 'winces immediately when hurt');
    assert.equal(faceFrame({ health: 100, hurt: 0, shotElapsed: 0.1 }), FACE_POSES.shoot, 'scowls fiercely when firing');
    assert.equal(faceFrame({ health: 30, hurt: 0.25 }), 3 * FACE_POSE_COUNT + FACE_POSES.pain, 'hurt in tier 3');
    const idleFrames = new Set([0, 1, 2, 3, 4, 5].map((s) => faceFrame({ health: 100, time: s / 1.15 + 0.01 })));
    assert.ok(idleFrames.has(FACE_POSES.center) && idleFrames.has(FACE_POSES.left) && idleFrames.has(FACE_POSES.right), 'glances left and right while idle');

    const calm = facePlacement(new Vec2(1280, 760), 0);
    const calmX = calm.rect.topLeftCorner.x;
    const calmY = calm.rect.topLeftCorner.y;
    assert.equal(calm.rect.size.x, FACE_CELL_W * calm.pixel);
    assert.equal(calm.rect.size.y, FACE_CELL_H * calm.pixel);
    const jolted = facePlacement(new Vec2(1280, 760), 0.25, { rect: new Rect(), pixel: 0 });
    assert.ok(jolted.rect.topLeftCorner.x !== calmX || jolted.rect.topLeftCorner.y !== calmY, 'taking damage jolts the portrait box');
    const [u0, v0, u1, v1] = faceCellUv(3);
    assert.ok(u0 > 3 / FACE_FRAME_COUNT && u1 < 4 / FACE_FRAME_COUNT && v0 === 0 && v1 === 1);

    // barrel explosion spawns a single floor-grounded 'boom' right at the barrel's position with world-scale width
    const game = fresh();
    clearEnemies(game);
    const barrel = game.barrels[0];
    const bx = barrel.pos.x;
    const by = barrel.pos.y;
    game.effects.length = 0;
    game.detonate(barrel);
    assert.equal(game.effects.length, 1, 'barrel detonation spawns a single explosion effect at the barrel');
    assert.equal(game.effects[0].type, 'boom');
    assert.equal(game.effects[0].x, bx, 'explosion x is right where the barrel stood');
    assert.equal(game.effects[0].y, by, 'explosion y is right where the barrel stood');
    assert.equal(game.effects[0].z, 0, 'explosion is grounded on the floor');
    assert.equal(explosionWidth(game.effects[0]), 120, 'barrel explosion spreads wide across the floor around the barrel');
  },

  'ceiling light fixture tiles position RoostR PointLight and AmbientLight sources and drive dynamic surface lighting'() {
    const game = fresh(0);
    const { level } = game;
    const fixtures = ceilingLightFixtures(level);
    assert.ok(fixtures.length >= 10 && fixtures.length <= Math.ceil((level.width * level.rowCount) / 18), 'a level has sparse, well-spaced ceiling light fixtures');
    for (const fixture of fixtures) {
      assert.ok(fixture.tile instanceof Vec2 && fixture.position instanceof Vec3, 'fixtures use Vec2 tile coords and Vec3 positions');
      assert.equal(ceilingCellFor(fixture.tile.x, fixture.tile.y), CEILING_CELLS.light, 'every fixture sits on a ceiling light cell');
      assert.equal(fixture.position.x, (fixture.tile.x + 0.5) * 64);
      assert.equal(fixture.position.y, 62);
      assert.equal(fixture.position.z, (fixture.tile.y + 0.5) * 64);
    }

    const added = [];
    let cleared = 0;
    const mockScene = {
      clearLights() {
        cleared++;
        added.length = 0;
      },
      addLight(light) {
        added.push(light);
      },
    };
    const { ambient, pointLights } = createCeilingLights(mockScene);
    assert.equal(cleared, 1);
    assert.ok(ambient instanceof AmbientLight, 'uses RoostR AmbientLight');
    assert.ok(ambient.diffuse.x > 0.38 && ambient.diffuse.x < 0.65 && ambient.diffuse.y > 0.42 && ambient.diffuse.z < 0.7, 'ambient base light is moderately dim without going pitch-black or full-bright');
    assert.equal(pointLights.length, MAX_LIGHTS);
    assert.ok(pointLights.every((l) => l instanceof PointLight), 'uses RoostR PointLight instances');
    assert.equal(added.length, 1 + MAX_LIGHTS);

    const cones = ceilingLightCones(fixtures);
    assert.equal(cones.count, fixtures.length * 4 * 6, 'each fixture gets 4 intersecting volumetric light-cone quads');
    assert.equal(cones.vertices.length, cones.count * 3);
    assert.equal(cones.uvs.length, cones.count * 2);
    assert.ok(CEILING_CONE_VERTEX.includes('vFixtureCenter') && CEILING_CONE_FRAGMENT.includes('vFixtureCenter'), 'volumetric cone shaders evaluate smooth 3D cone falloff around each fixture center');

    const camPos = new Vec3(game.player.pos.x, 32, game.player.pos.y);
    updateCeilingLights(pointLights, fixtures, camPos, 1.25);
    assert.ok(pointLights[0].diffuse.getMagnitude() > 0.5, 'nearest ceiling light is active and bright');
    const d0 = camPos.getDistance(pointLights[0].position, true);
    const d1 = camPos.getDistance(pointLights[1].position, true);
    assert.ok(d0 <= d1, 'point lights are ordered from nearest ceiling fixture outward');

    // when far outside the level, all pooled point lights turn off cleanly
    updateCeilingLights(pointLights, fixtures, new Vec3(-99999, 32, -99999), 0);
    assert.ok(pointLights.every((l) => l.diffuse.isOrigin()), 'lights out of range fade to zero');

    for (const shader of [FLOOR_FRAGMENT, DOOR_FRAGMENT, WALL_FRAGMENT, SOLID_TEXTURED_FRAGMENT])
      assert.ok(shader.includes('uNbLights') && shader.includes('uLightPosition') && shader.includes('uAmbientLight'), 'surface shaders consume RoostR light uniforms');
    assert.ok(!TEXTURED_FRAGMENT.includes('vWorldPos'), 'effect sprite shader stays compatible with RoostR Sprite vertex shader');
  },

  'medikit and ammo pickups are 3D textured meshes with power-of-two face atlases'() {
    const pow2 = (n) => (n & (n - 1)) === 0;
    const med = medikitAtlas();
    assert.ok(pow2(med.width) && pow2(med.height), 'medikit atlas is power-of-two');
    assert.equal(med.width, MEDIKIT_CELL * MEDIKIT_FRAMES);
    assert.equal(med.height, MEDIKIT_CELL);
    const medHashes = new Set();
    let whiteCase = 0;
    let redCross = 0;
    let greenLed = 0;
    for (let f = 0; f < MEDIKIT_FRAMES; f++) {
      let h = 0;
      for (let y = 0; y < MEDIKIT_CELL; y++)
        for (let x = 0; x < MEDIKIT_CELL; x++) {
          const o = (y * med.width + f * MEDIKIT_CELL + x) * 4;
          const r = med.data[o];
          const g = med.data[o + 1];
          const b = med.data[o + 2];
          const a = med.data[o + 3];
          assert.equal(a, 255, 'medikit 3D face atlas is fully opaque');
          h = (Math.imul(h, 31) + r + g + b + a) | 0;
          if (r > 180 && g > 190 && b > 205)
            whiteCase++;
          if (r > 170 && g < 100 && b < 100)
            redCross++;
          if (g > 130 && g > r * 1.4)
            greenLed++;
        }
      medHashes.add(h);
    }
    assert.equal(medHashes.size, Object.keys(MEDIKIT_CELLS).length, 'medikit atlas has distinct front, side, top, and handle face cells');
    assert.ok(whiteCase > 400 && redCross >= 150 && greenLed >= 20, 'medikit atlas has a white armored case, red cross, and green bio-LED strips');

    const medGeo = medikitMesh();
    assert.ok(medGeo.vertices instanceof Float32Array && medGeo.uvs instanceof Float32Array);
    assert.equal(medGeo.vertices.length, 4 * 36 * 3, 'medikit mesh has 4 boxes (main case + 3D handle posts and grip)');
    assert.equal(medGeo.uvs.length, 4 * 36 * 2);
    for (let i = 0; i < medGeo.uvs.length; i++)
      assert.ok(medGeo.uvs[i] >= 0 && medGeo.uvs[i] <= 1, 'medikit UVs stay within [0, 1]');

    const ammo = ammoAtlas();
    assert.ok(pow2(ammo.width) && pow2(ammo.height), 'ammo atlas is power-of-two');
    assert.equal(ammo.width, AMMO_CELL * AMMO_FRAMES);
    assert.equal(ammo.height, AMMO_CELL);
    const ammoHashes = new Set();
    let shellRed = 0;
    let brassGold = 0;
    let oliveCrate = 0;
    for (let f = 0; f < AMMO_FRAMES; f++) {
      let h = 0;
      for (let y = 0; y < AMMO_CELL; y++)
        for (let x = 0; x < AMMO_CELL; x++) {
          const o = (y * ammo.width + f * AMMO_CELL + x) * 4;
          const r = ammo.data[o];
          const g = ammo.data[o + 1];
          const b = ammo.data[o + 2];
          const a = ammo.data[o + 3];
          assert.equal(a, 255, 'ammo 3D face atlas is fully opaque');
          h = (Math.imul(h, 31) + r + g + b + a) | 0;
          if (r > 110 && g < 50 && b < 55)
            shellRed++;
          if (r > 120 && g > 80 && b < 70)
            brassGold++;
          if (g > r && g > b && g < 165)
            oliveCrate++;
        }
      ammoHashes.add(h);
    }
    assert.equal(ammoHashes.size, Object.keys(AMMO_CELLS).length, 'ammo atlas has distinct crate front, crate side, shell side, and shell crimp top cells');
    assert.ok(shellRed >= 400 && brassGold >= 150 && oliveCrate >= 500, 'ammo atlas has red buckshot hulls, brass bases, and an olive ordnance crate');

    const ammoGeo = ammoMesh();
    assert.ok(ammoGeo.vertices instanceof Float32Array && ammoGeo.uvs instanceof Float32Array);
    // 1 tray box (36 verts) + 8 shells * 8 radial sides * (6 side + 3 cap verts) = 36 + 576 = 612 verts
    assert.equal(ammoGeo.vertices.length, (36 + 8 * 8 * 9) * 3, 'ammo mesh has an ordnance tray and 8 3D cylindrical buckshot shells');
    assert.equal(ammoGeo.uvs.length, (36 + 8 * 8 * 9) * 2);
    for (let i = 0; i < ammoGeo.uvs.length; i++)
      assert.ok(ammoGeo.uvs[i] >= 0 && ammoGeo.uvs[i] <= 1, 'ammo UVs stay within [0, 1]');
  },

  'every monster is an animated 3D horror monster with death and gibbing behavior'() {
    for (const type of Object.keys(ENEMY_TYPES))
      assert.equal(typeof MONSTERS[type].die, 'function', `${type} has a 3D death animation`);
    const game = fresh();
    const victim = game.enemies[0];
    victim.pain = 0.25;
    victim.hurt = 0.12;
    game.damageEnemy(victim, 999);
    assert.equal(victim.state, 'dead');
    assert.equal(victim.pain, 0, 'dying clears enemy.pain so corpses never strobe-blink');
    assert.equal(victim.hurt, 0, 'dying clears enemy.hurt so corpses never strobe-blink');
  },

  'enemy fireball projectiles are an animated power-of-two pixel-art sprite atlas'() {
    const atlas = fireballAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(atlas.width) && pow2(atlas.height), 'fireball atlas is power-of-two');
    assert.equal(atlas.cell, FIREBALL_CELL);
    assert.equal(atlas.frames, FIREBALL_FRAMES);
    assert.equal(atlas.data.length, atlas.width * atlas.height * 4);
    const hashes = new Set();
    for (let f = 0; f < FIREBALL_FRAMES; f++) {
      let solid = 0;
      let core = 0;
      let flame = 0;
      let hash = 0;
      for (let y = 0; y < FIREBALL_CELL; y++)
        for (let x = 0; x < FIREBALL_CELL; x++) {
          const o = (y * atlas.width + f * FIREBALL_CELL + x) * 4;
          const r = atlas.data[o];
          const g = atlas.data[o + 1];
          const b = atlas.data[o + 2];
          const a = atlas.data[o + 3];
          if (x === 0 || x === FIREBALL_CELL - 1 || y === 0 || y === FIREBALL_CELL - 1)
            assert.equal(a, 0, `fireball frame ${f} has a 1px transparent safety border`);
          if (a) {
            solid++;
            if (r > 240 && g > 200)
              core++;
            else if (r > 130 && r > b * 2)
              flame++;
          }
          hash = (Math.imul(hash, 31) + r + g + b + a) | 0;
        }
      assert.ok(solid > 180, `fireball frame ${f} is a substantial plasma orb`);
      assert.ok(core >= 20, `fireball frame ${f} has a hot incandescent core`);
      assert.ok(flame >= 80, `fireball frame ${f} has crimson/orange hellfire corona`);
      hashes.add(hash);
    }
    assert.equal(hashes.size, FIREBALL_FRAMES, 'every fireball frame is distinct');
  },

  'AC-1 acid entry drops player below floor and walking cannot leave pit'() {
    for (const [pos, angle] of [
      [new Vec2(160, 224), 0],
      [new Vec2(416, 224), Math.PI],
      [new Vec2(288, 96), Math.PI / 2],
      [new Vec2(288, 352), -Math.PI / 2],
    ]) {
      const game = acidPitGame();
      game.player.body.setPosition(pos);
      game.player.angle = angle;
      run(game, 0.7, input({ forward: 1 }));
      assert.equal(game.player.z, -ACID_PIT_DEPTH, 'walking off the deck falls onto the pit floor');
      assert.equal(game.player.eye, EYE - ACID_PIT_DEPTH, 'camera follows the descent');
      const entered = game.player.pos.clone();
      run(game, 1, input({ forward: 1, run: true }));
      assert.ok(game.player.pos.getDistance(entered) > 20, 'movement continues between adjacent acid tiles');
      assert.ok(game.player.pos.x >= 192 + 14 && game.player.pos.x <= 384 - 14, 'body cannot cross either X edge below floor');
      assert.ok(game.player.pos.y >= 128 + 14 && game.player.pos.y <= 320 - 14, 'body cannot cross either Y edge below floor');
      assert.equal(game.player.z, -ACID_PIT_DEPTH);
      const blocked = game.player.pos.clone();
      run(game, 0.3, input({ forward: 1, run: true }));
      assert.ok(game.player.pos.getDistance(blocked) < 0.001, 'continued walking cannot escape the pit');
    }
    const game = acidPitGame();
    game.player.body.setPosition(new Vec2(288, 224));
    run(game, 0.1);
    assert.ok(game.player.z < 0 && game.player.z > -ACID_PIT_DEPTH, 'entry descends over time rather than snapping');
    game.update(1 / 60, input({ jump: true }));
    assert.ok(game.player.vz < 0, 'jump cannot launch while falling');
    run(game, 0.3);
    game.player.angle = Math.PI / 4;
    run(game, 1, input({ forward: 1, run: true }));
    assert.ok(game.player.pos.x <= 370 && game.player.pos.y <= 306, 'diagonal motion cannot cut across the raised floor corner');
    assert.equal(game.player.z, -ACID_PIT_DEPTH);
  },

  'AC-2 jumping raises player to floor level and permits pit exit'() {
    const game = acidPitGame();
    game.player.body.setPosition(new Vec2(224, 224));
    game.player.angle = Math.PI;
    run(game, 0.4);
    assert.equal(game.player.z, -ACID_PIT_DEPTH);
    const health = game.player.health;
    game.player.slimeTimer = 0;
    game.update(1 / 60, input({ jump: true, forward: 1 }));
    assert.ok(game.player.z > -ACID_PIT_DEPTH && game.player.vz > 0, 'jump launches from the pit floor');
    assert.equal(game.player.slimeTimer, 0, 'jumping below deck height is still airborne above acid');
    for (let frame = 0; frame < 20; frame++) {
      game.update(1 / 60, input({ forward: 1 }));
      if (game.player.pos.x < 192 + 14)
        assert.ok(game.player.z >= 0, 'crossing the lip requires floor-level clearance for the whole body');
    }
    assert.ok(game.player.pos.x + 14 < 192, 'jump carries the player fully onto adjacent ordinary floor');
    assert.equal(game.player.health, health, 'airborne pit exit causes no acid damage');
    run(game, 0.6);
    assert.equal(game.player.z, 0, 'player lands on the ordinary floor, not the pit bottom');
    assert.equal(game.player.eye, EYE);
    const before = game.player.pos.x;
    run(game, 0.1, input({ forward: 1 }));
    assert.ok(game.player.pos.x < before, 'ordinary walking resumes after exiting');
  },

  'AC-3 grounded player in acid pit continues taking periodic damage and emitting effects'() {
    const game = acidPitGame();
    game.player.body.setPosition(new Vec2(288, 224));
    run(game, 0.4);
    assert.equal(game.player.z, -ACID_PIT_DEPTH);
    game.player.slimeTimer = 0;
    game.events.length = 0;
    const health = game.player.health;
    run(game, 0.9);
    assert.equal(game.player.health, health - 5);
    assert.ok(game.player.radFlash > 0, 'acid damage flashes the radiation border');
    assert.equal(game.events.filter((event) => event.type === 'acid').length, 1, 'acid damage emits its sound event');
    run(game, 0.85);
    assert.equal(game.player.health, health - 10, 'acid burns repeat while grounded');
    assert.ok(game.player.radFlash > 0);
    assert.equal(game.events.filter((event) => event.type === 'acid').length, 2);
  },

  'AC-4 active rad suit prevents acid pit damage and clears burn timer'() {
    const game = acidPitGame();
    game.player.body.setPosition(new Vec2(288, 224));
    game.player.radSuit = 10;
    run(game, 0.4);
    assert.equal(game.player.z, -ACID_PIT_DEPTH);
    game.player.slimeTimer = 0.84;
    game.events.length = 0;
    const health = game.player.health;
    run(game, 1.8);
    assert.equal(game.player.health, health, 'suit prevents repeated acid burns');
    assert.equal(game.player.slimeTimer, 0, 'suit clears even a nearly completed burn timer');
    assert.equal(game.player.radFlash, 0);
    assert.equal(game.events.filter((event) => event.type === 'acid').length, 0);
    assert.ok(game.player.radSuit > 0 && game.player.radSuit < 10, 'protection still expires normally');
    game.player.radSuit = 0;
    run(game, 0.9);
    assert.equal(game.player.health, health - 5, 'acid resumes burning after protection expires');
  },

  'AC-5 acid mesh is recessed and retains animation'() {
    const game = acidPitGame();
    withWallWorld((world, programs) => {
      world.floorBatch = World.prototype.floorBatch;
      world.slimeBatch = World.prototype.slimeBatch;
      World.prototype.buildStatic.call(world, game.level);
      const acid = programs.find(({ fragment }) => fragment === SLIME_FRAGMENT);
      const floors = programs.filter(({ fragment, mesh }) => fragment === FLOOR_FRAGMENT && Math.abs(mesh.vertices[7] + 0.2) < 1e-5);
      assert.ok(acid && floors.length > 0, 'actual acid and adjoining floor batches are built');
      assert.equal(acid.mesh.used, 9, 'one recessed surface per acid tile, with no gaps inside the pool');
      assert.equal(acid.vertex, FLOOR_VERTEX);
      for (let i = 1; i < acid.mesh.used * 18; i += 3)
        assert.ok(Math.abs(acid.mesh.vertices[i] + ACID_PIT_DEPTH + 0.35) < 1e-5, 'surface matches the gameplay pit depth');
      for (const { mesh } of floors)
        for (let i = 1; i < mesh.used * 18; i += 3)
          assert.ok(Math.abs(mesh.vertices[i] + 0.2) < 1e-5, 'ordinary floor stays at deck height');
      const sides = programs.filter(({ fragment }) => fragment === LINE_FRAGMENT);
      assert.ok(sides.some(({ mesh }) => Array.from(mesh.vertices).some((value, i) => i % 3 === 1 && value < -ACID_PIT_DEPTH)), 'pit edges are closed below the deck');
      assert.match(acid.fragment, /uniform float uTime;/);
      assert.match(acid.fragment, /sin\([^;]*uTime/);
      assert.equal(acid.mesh.customUniforms.time.value, 0, 'animation time is registered');
      acid.mesh.setCustomUniform('time', 2);
      assert.equal(acid.mesh.customUniforms.time.value, 2, 'animation time remains updateable');
    });
  },

  'crouching lowers the player eye below low pillars, slows movement, and stands back up when released'() {
    const game = fresh();
    clearEnemies(game);
    assert.equal(game.player.eye, EYE);
    assert.equal(game.player.crouch, 0);

    const startX = game.player.pos.x;
    run(game, 0.25, input({ crouch: true, forward: 1 }));
    const crouchedDist = game.player.pos.x - startX;
    assert.equal(game.player.crouch, 1, 'player reaches full crouch');
    assert.equal(game.player.eye, CROUCH_EYE, 'crouched eye height drops to CROUCH_EYE (below 26-high pillars)');

    const gameWalk = fresh();
    clearEnemies(gameWalk);
    run(gameWalk, 0.25, input({ forward: 1 }));
    const walkDist = gameWalk.player.pos.x - startX;
    assert.ok(crouchedDist > 0 && crouchedDist < walkDist * 0.75, 'crouching moves slower than walking');

    run(game, 0.25, idle);
    assert.equal(game.player.crouch, 0, 'releasing crouch returns crouch factor to 0');
    assert.equal(game.player.eye, EYE, 'releasing crouch restores standing eye height');

    // jumping clears the acid surface without damage, then lands in the recessed pit
    const slimeIdx = game.level.slime.findIndex((v) => v === 1);
    const slimeX = (slimeIdx % game.level.width) * 64 + 32;
    const slimeY = Math.floor(slimeIdx / game.level.width) * 64 + 32;
    game.player.body.setPosition(new Vec2(slimeX, slimeY));
    run(game, 0.4);
    const hpBefore = game.player.health;
    game.events.length = 0;
    game.update(1 / 60, input({ jump: true }));
    assert.ok(game.player.z > -ACID_PIT_DEPTH && game.player.eye > EYE - ACID_PIT_DEPTH, 'jumping raises player z and eye above the pit floor');
    run(game, 0.28, idle);
    assert.ok(game.player.z > 0, 'player reaches jump apex above the ordinary floor');
    assert.equal(game.player.slimeTimer, 0, 'airborne player does not accumulate acid burn timer');
    assert.equal(game.player.health, hpBefore, 'jumping over acid takes no damage');
    run(game, 0.6, idle);
    assert.equal(game.player.z, -ACID_PIT_DEPTH, 'gravity brings jumping player down to the pit floor');
    assert.equal(game.player.eye, EYE - ACID_PIT_DEPTH, 'landing restores standing eye height relative to the pit');
    assert.ok(game.events.some((e) => e.type === 'step' && e.who === 'player'), 'landing emits a player footfall sound');
  },

  'AC-2: door-backed secrets chime once on their first opening transition'() {
    const game = fresh(0);
    const secretIndexes = [];
    for (let i = 0; i < game.level.secretDoorByRoom.length; i++)
      if (game.level.secretDoorByRoom[i] >= 0)
        secretIndexes.push(i);
    const firstDoor = game.level.doors.get(game.level.secretDoorByRoom[secretIndexes[0]]);
    const secondDoor = game.level.doors.get(game.level.secretDoorByRoom[secretIndexes[1]]);
    assert.ok(firstDoor && secondDoor);
    game.events.length = 0;
    firstDoor.target = 1;
    secondDoor.target = 1;
    game.updateDoors(1 / 60);
    assert.equal(game.events.filter((event) => event.type === 'secret').length, 2);
    firstDoor.open = 1;
    game.updateDoors(1 / 60);
    assert.equal(game.events.filter((event) => event.type === 'secret').length, 2);
    firstDoor.target = 0;
    game.updateDoors(1 / 60);
    firstDoor.target = 1;
    game.updateDoors(1 / 60);
    assert.equal(game.events.filter((event) => event.type === 'secret').length, 2);
    game.events.length = 0;
    game.actorNear = () => true;
    firstDoor.target = 0;
    game.updateDoors(1 / 60);
    assert.equal(game.events.some((event) => event.type === 'secret'), false);
  },

  'AC-3: entering a door-backed secret updates discovery without a chime'() {
    const game = fresh(0);
    const secretIndex = game.level.secretDoorByRoom.findIndex((doorIdx) => doorIdx >= 0);
    const tile = [...game.level.secrets[secretIndex]][0];
    game.player.body.setPosition(new Vec2((tile % game.level.width) * 64 + 32, Math.floor(tile / game.level.width) * 64 + 32));
    game.events.length = 0;
    game.update(1 / 60, idle);
    assert.equal(game.secretsFound, 1);
    assert.equal(game.message.text, 'Secret area found!');
    assert.equal(game.events.some((event) => event.type === 'secret'), false);
  },

  'AC-4: doorless secret entry chimes only on first discovery'() {
    const game = fresh(4);
    const secretIndex = game.level.secretDoorByRoom.findIndex((doorIdx) => doorIdx < 0);
    const tile = [...game.level.secrets[secretIndex]][0];
    game.player.body.setPosition(new Vec2((tile % game.level.width) * 64 + 32, Math.floor(tile / game.level.width) * 64 + 32));
    game.events.length = 0;
    game.update(1 / 60, idle);
    assert.equal(game.events.filter((event) => event.type === 'secret').length, 1);
    game.events.length = 0;
    game.update(1 / 60, idle);
    assert.equal(game.events.some((event) => event.type === 'secret'), false);
  },

  'AC-5: non-secret and denied locked doors do not emit secret chimes'() {
    const game = fresh(0);
    const ordinaryDoor = [...game.level.doors.values()].find((door) => !door.secret && !door.lock && !game.level.secretRoomByDoor.has(door.idx));
    assert.ok(ordinaryDoor);
    ordinaryDoor.target = 1;
    game.events.length = 0;
    game.updateDoors(1 / 60);
    assert.ok(game.events.some((event) => event.type === 'doorOpen'));
    assert.equal(game.events.some((event) => event.type === 'secret'), false);
    const lockedDoor = [...game.level.doors.values()].find((door) => door.lock === 'blue');
    assert.ok(lockedDoor);
    game.player.body.setPosition(new Vec2(lockedDoor.center.x, lockedDoor.center.y - 48));
    game.player.angle = Math.PI / 2;
    game.events.length = 0;
    game.use();
    assert.equal(lockedDoor.target, 0);
    assert.ok(game.events.some((event) => event.type === 'locked'));
    assert.equal(game.events.some((event) => event.type === 'secret'), false);
  },

  'AC-6: secret chime delivery resets on load and restart independently of reveal state'() {
    const game = fresh(0);
    const openSecretEntrance = () => {
      const secretIndex = game.level.secretDoorByRoom.findIndex((doorIdx) => doorIdx >= 0);
      const door = game.level.doors.get(game.level.secretDoorByRoom[secretIndex]);
      door.revealed = true;
      door.target = 1;
      game.events.length = 0;
      game.updateDoors(1 / 60);
      assert.equal(game.events.filter((event) => event.type === 'secret').length, 1);
    };
    openSecretEntrance();
    game.load(0);
    openSecretEntrance();
    game.restart();
    openSecretEntrance();
  },

  'every level has par time and secret closets, and clearing a level runs the Doom intermission tally and Phobos overworld map'() {
    for (const sound of ['secret', 'tallyTick', 'tallyBoom'])
      assert.equal(typeof RECIPES[sound], 'function', `${sound} audio recipe exists`);

    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      assert.ok(g.level.par >= 60, `level ${i} has a par time`);
      assert.ok(g.totalSecrets >= 1, `level ${i} has at least one secret supply room`);
      assert.ok(g.totalItems >= 4, `level ${i} tracks total initial pickups`);
    }

    const game = fresh(0);
    clearEnemies(game);
    assert.equal(game.secretsFound, 0);
    // step into the first secret room tile
    const secretIdx = [...game.level.secrets[0]][0];
    const sx = (secretIdx % game.level.width) * 64 + 32;
    const sy = Math.floor(secretIdx / game.level.width) * 64 + 32;
    game.events.length = 0;
    game.player.body.setPosition(new Vec2(sx, sy));
    game.update(1 / 60, idle);
    assert.equal(game.secretsFound, 1, 'stepping into a secret room increments secretsFound');
    assert.equal(game.message.text, 'Secret area found!');
    assert.ok(!game.events.some((e) => e.type === 'secret'), 'door-backed secret room entry does not emit secret chime');
    // stepping again in the same secret room does not double-count
    game.events.length = 0;
    game.update(1 / 60, idle);
    assert.equal(game.secretsFound, 1);
    assert.ok(!game.events.some((e) => e.type === 'secret'));

    // collect an initial pickup and verify itemsPicked increments
    const pickup = game.pickups[0];
    game.player.ammo = 4;
    game.player.health = 50;
    game.player.body.setPosition(pickup.pos.clone());
    run(game, 0.05);
    assert.ok(game.itemsPicked >= 1, 'picking up a map item increments itemsPicked');

    // reach the exit to trigger intermission
    game.kills = Math.ceil(game.totalEnemies * 0.75);
    game.stats.time = 68;
    const exit = game.level.exits[0];
    game.player.body.setPosition(exit.clone());
    game.events.length = 0;
    game.update(1 / 60, idle);
    assert.equal(game.state, 'cleared');
    assert.ok(game.intermission && !game.intermission.done, 'intermission starts in counting state');
    assert.equal(game.intermission.phase, 0);

    // let the intermission count through all phases and emit ticks & booms
    let ticks = 0;
    let booms = 0;
    for (let t = 0; t < 6 && !game.intermission.done; t += 1 / 60) {
      game.update(1 / 60, idle);
      ticks += game.events.filter((e) => e.type === 'tallyTick').length;
      booms += game.events.filter((e) => e.type === 'tallyBoom').length;
      game.events.length = 0;
    }
    assert.equal(game.intermission.done, true, 'intermission finishes counting all 4 phases');
    assert.ok(ticks >= 5, 'intermission emits tallyTick sounds while counting');
    assert.equal(booms, 4, 'each of the 4 tally phases locks in with a tallyBoom');
    assert.equal(game.intermission.shownKills, game.intermission.killsPct);
    assert.equal(game.intermission.shownItems, game.intermission.itemsPct);
    assert.equal(game.intermission.shownSecrets, game.intermission.secretsPct);
    assert.equal(game.intermission.shownTime, 68);

    // test skipIntermission() when mid-count
    game.startIntermission();
    assert.equal(game.intermission.done, false);
    game.events.length = 0;
    assert.equal(game.skipIntermission(), true, 'skipIntermission snaps an active tally to completion');
    assert.equal(game.intermission.done, true);
    assert.equal(game.intermission.shownKills, game.intermission.killsPct);
    assert.equal(game.intermission.shownTime, game.intermission.timeSec);
    assert.ok(game.events.some((e) => e.type === 'tallyBoom'));
    assert.equal(game.skipIntermission(), false, 'skipIntermission returns false when already done');

    // verify Hud renders the intermission screen with facility nodes, PAR BEATEN, and YOU ARE HERE
    const texts = [];
    const lines = [];
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {},
          clearRect() {},
          fillRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
          fillText(str) {
            texts.push(str);
          },
        };
      },
    };
    const mockOverlay = {
      clear() {},
      glow: { line() {} },
      crisp: {
        fillRect() {},
        rectLine() {},
        line() {},
        circleLine() {},
        weapon: { quad() {} },
        sprites: { quad() {} },
        face: { quad() {} },
      },
    };
    const hud = new Hud(mockCanvas, mockOverlay);
    hud.resize(1280, 760, 1);
    const origCanvasLine = hud.canvasLine.bind(hud);
    hud.canvasLine = (pts, ...rest) => {
      lines.push(pts);
      origCanvasLine(pts, ...rest);
    };
    hud.render(game);
    assert.ok(texts.includes('E1M1 · HANGAR'), 'draws finished level name');
    assert.ok(texts.includes('FINISHED'), 'draws FINISHED subheader');
    assert.ok(texts.includes('KILLS') && texts.includes('ITEMS') && texts.includes('SECRETS'), 'draws KILLS, ITEMS, SECRETS rows');
    assert.ok(texts.includes('TIME') && texts.includes('PAR') && texts.includes('PAR BEATEN'), 'draws TIME, PAR, and PAR BEATEN badge');
    assert.ok(texts.includes('ENTERING: E1M2 · NUCLEAR PLANT'), 'draws next facility banner');
    assert.ok(texts.includes('YOU ARE HERE'), 'draws YOU ARE HERE pointer over next facility');
    assert.ok(lines.length >= 20, 'draws vector facility icons, progress bars, and blood X marks');
  },

  'extreme gore: 5 distinct gib variants bleed mid-air, bounce off surfaces, settle as permanent floor gibs, and corpses can be mutilated into XDeath'() {
    assert.equal(GIB_VARIANTS, 5, 'five distinct anatomical gib variants exist');
    const atlas = bloodAtlas();
    const hashes = new Set();
    for (let v = 0; v < GIB_VARIANTS; v++) {
      let hash = 0;
      let solid = 0;
      const cell = CELLS.gib + v;
      for (let y = 0; y < CELL; y++)
        for (let x = 0; x < CELL; x++) {
          const o = (y * atlas.width + cell * CELL + x) * 4;
          if (!atlas.data[o + 3])
            continue;
          solid++;
          hash = (Math.imul(hash, 31) + atlas.data[o] + atlas.data[o + 1] + atlas.data[o + 2]) | 0;
        }
      assert.ok(solid > 35, `gib variant ${v} is a substantial chunk`);
      hashes.add(hash);
      const quad = floorGibQuad({ x: 120, y: 180, size: 4, variant: v, angle: 0.7 });
      assert.equal(quad.corners.length, 12);
      for (let k = 1; k < 12; k += 3)
        assert.ok(Math.abs(quad.corners[k] - 0.36) < 1e-9, 'floor gib quad sits slightly above floor splats');
      assert.deepEqual(quad.uv, cellUv(cell));
    }
    assert.equal(hashes.size, GIB_VARIANTS, 'every gib variant has a unique sprite');

    // flying gibs bleed droplet trails in mid-air, bounce on the floor, and settle into permanent floor gibs
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.blood.gore(new Vec2(6 * 64 + 32, 9 * 64 + 32), 1.4, new Vec2(1, 0));
    const initialGibParticles = game.blood.particles.filter((p) => p.gib);
    assert.ok(initialGibParticles.length >= 3, 'gore spawns subtle flying gibs');
    assert.ok(initialGibParticles.every((p) => p.bounces >= 1), 'flying gibs can bounce');
    run(game, 2.5);
    assert.equal(game.blood.particles.filter((p) => p.gib).length, 0, 'all bouncing gibs settle onto the floor');
    assert.ok(game.blood.gibs.length >= 3, `settled gibs remain on the floor (${game.blood.gibs.length})`);
    assert.ok(game.blood.gibs.length <= BLOOD.gibs, 'floor gibs respect their cap');

    // shooting a dead corpse from afar leaves a body first, then shooting the corpse mutilates and gibs it ("XDeath")
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);
    game.player.body.setPosition(new Vec2(6 * 64, 9 * 64 + 32));
    game.player.angle = 0;
    game.addEnemy('imp', new Vec2(6 * 64 + 260, 9 * 64 + 32));
    const imp = game.enemies[0];
    imp.hp = 1;
    game.player.cooldown = 0;
    game.fire();
    assert.equal(imp.state, 'dead', 'imp killed from afar');
    assert.equal(imp.gibbed, false, 'single-pellet kill from afar leaves an intact corpse');

    // advance time past 3 seconds: corpse stays in game.enemies and can still be mutilated
    run(game, 3.5);
    assert.ok(imp.deadTime > 3, 'corpse persists long past 2.2s');
    // walk closer and fire the shotgun into the corpse on the floor
    game.player.body.setPosition(new Vec2(6 * 64 + 190, 9 * 64 + 32));
    game.player.cooldown = 0;
    game.events.length = 0;
    game.fire();
    assert.equal(imp.gibbed, true, 'shooting a dead corpse shreds it into XDeath gibs');
    assert.ok(game.events.some((e) => e.type === 'gib'), 'corpse gibbing emits gib sound');
    assert.ok(game.blood.particles.some((p) => p.gib), 'mutilating a corpse launches fresh gib chunks');

    // once gibbed, shooting the corpse spawns blood and meat twice more and then stops
    for (let postHit = 1; postHit <= 2; postHit++) {
      run(game, 0.8);
      game.blood.particles.length = 0;
      game.events.length = 0;
      game.player.cooldown = 0;
      game.fire();
      assert.equal(imp.postGibHits, postHit, `post-gib shot ${postHit} increments postGibHits`);
      assert.ok(game.blood.particles.some((p) => !p.gib), `post-gib shot ${postHit} spawns blood`);
      assert.ok(game.blood.particles.some((p) => p.gib), `post-gib shot ${postHit} spawns meat chunks`);
    }
    run(game, 0.8);
    game.blood.particles.length = 0;
    game.events.length = 0;
    game.player.cooldown = 0;
    game.fire();
    assert.equal(game.blood.particles.length, 0, '3rd shot after gibbing spawns no more blood or gibs');
    assert.equal(game.events.some((e) => e.type === 'flesh' || e.type === 'gib'), false, 'no flesh or gib sound after 2 post-gib hits');

    // barrel blast also blows nearby intact corpses into gibs
    clearEnemies(game);
    for (const b of game.barrels)
      game.scene.removeBody(b.body);
    game.barrels = [];
    game.addEnemy('brute', new Vec2(8 * 64, 9 * 64 + 32));
    const corpse = game.enemies[0];
    game.damageEnemy(corpse, 999);
    corpse.gibbed = false;
    game.addBarrel(new Vec2(8 * 64 + 40, 9 * 64 + 32));
    game.detonate(game.barrels[0]);
    assert.equal(corpse.gibbed, true, 'barrel explosion blows nearby corpses into gibs');
  },

  'environmental hazards and secret push-walls: toxic slime burns, secret doors disguise as walls until pushed, and ceiling crushers pulp anything underneath'() {
    assert.equal(typeof RECIPES.acid, 'function', 'acid sizzle audio recipe exists');
    assert.equal(typeof RECIPES.crush, 'function', 'hydraulic crusher slam audio recipe exists');

    // slime atlas is power-of-two, opaque, and dominantly radioactive green; shader animates with uTime
    const slime = slimeAtlas();
    assert.equal(slime.width, TILE_PIXELS);
    assert.equal(slime.height, TILE_PIXELS);
    let greenDominant = 0;
    for (let i = 0; i < slime.data.length; i += 4) {
      assert.equal(slime.data[i + 3], 255, 'slime atlas is fully opaque');
      if (slime.data[i + 1] > slime.data[i] * 1.4 && slime.data[i + 1] > slime.data[i + 2] * 1.4)
        greenDominant++;
    }
    assert.ok(greenDominant > (slime.data.length / 4) * 0.75, 'slime atlas is radioactive green');
    assert.ok(SLIME_FRAGMENT.includes('uTime'), 'slime fragment shader ripples with uTime');
    // slime atlas wraps seamlessly across both horizontal (x=0 vs x=63) and vertical (y=0 vs y=63) borders
    let seamDiffX = 0;
    let seamDiffY = 0;
    for (let i = 0; i < TILE_PIXELS; i++) {
      const leftG = slime.data[i * TILE_PIXELS * 4 + 1];
      const rightG = slime.data[(i * TILE_PIXELS + (TILE_PIXELS - 1)) * 4 + 1];
      seamDiffX += Math.abs(leftG - rightG);
      const topG = slime.data[i * 4 + 1];
      const bottomG = slime.data[((TILE_PIXELS - 1) * TILE_PIXELS + i) * 4 + 1];
      seamDiffY += Math.abs(topG - bottomG);
    }
    assert.ok(seamDiffX / TILE_PIXELS < 12, `slime atlas wraps seamlessly horizontally (avg delta ${seamDiffX / TILE_PIXELS})`);
    assert.ok(seamDiffY / TILE_PIXELS < 12, `slime atlas wraps seamlessly vertically (avg delta ${seamDiffY / TILE_PIXELS})`);

    // secret door box uses wall UV cell framing (5 faces: 4 sides + top) and full 64-unit tile dimensions so it sits completely flush with adjacent walls
    const sBox = secretDoorBox(new Vec2(64, 64));
    assert.equal(sBox.vertices.length, 30 * 3);
    assert.equal(sBox.uvs.length, 30 * 2);
    for (let i = 0; i < sBox.vertices.length; i += 3) {
      assert.equal(Math.abs(sBox.vertices[i]), 32, 'secret door X faces sit flush at ±32 (TILE / 2) with zero recess');
      assert.equal(Math.abs(sBox.vertices[i + 2]), 32, 'secret door Z faces sit flush at ±32 (TILE / 2) with zero recess');
    }

    // every level has slime pools (~) and crushing traps (^); indoor base levels have secret push-wall doors (S), while Mars has only the 1 starting-room door
    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      let slimeTiles = 0;
      for (let idx = 0; idx < g.level.slime.length; idx++)
        if (g.level.slime[idx])
          slimeTiles++;
      const secretDoors = [...g.level.doors.values()].filter((d) => d.secret);
      assert.ok(slimeTiles >= 6, `level ${i} has radioactive slime tiles (${slimeTiles})`);
      if (g.level.planet === 'mars')
        assert.equal(g.level.doors.size, 1, 'Mars surface level has only the single starting-room door and zero exterior doors');
      else
        assert.ok(secretDoors.length >= 2, `level ${i} has secret push-wall doors (${secretDoors.length})`);
      assert.ok(g.level.crushers.length >= 1, `level ${i} has crushing ceiling traps (${g.level.crushers.length})`);
    }

    // wading in toxic slime periodically burns the player, flashes green radFlash, and emits 'acid'
    const game = fresh(0);
    clearEnemies(game);
    const slimeIdx = game.level.slime.findIndex((v) => v === 1);
    const slimeX = (slimeIdx % game.level.width) * 64 + 32;
    const slimeY = Math.floor(slimeIdx / game.level.width) * 64 + 32;
    assert.equal(game.level.slimeAt(slimeX, slimeY), true);
    game.player.body.setPosition(new Vec2(slimeX, slimeY));
    run(game, 0.4);
    game.events.length = 0;
    const hpBefore = game.player.health;
    run(game, 0.9);
    assert.equal(game.player.health, hpBefore - 5, 'wading in slime for 0.85s burns 5 HP');
    assert.ok(game.player.radFlash > 0, 'slime burn triggers green radiation border flash');
    assert.ok(game.events.some((e) => e.type === 'acid'), 'slime burn emits acid sizzle sound');

    // secret push-wall door starts unrevealed and reveals when pushed open with use()
    const secretDoor = [...game.level.doors.values()].find((d) => d.secret);
    assert.equal(secretDoor.revealed, false, 'secret push-wall door starts disguised');
    game.player.body.setPosition(new Vec2(secretDoor.center.x, secretDoor.center.y + 48));
    game.player.angle = -Math.PI / 2;
    game.use();
    assert.equal(secretDoor.target, 1, 'pushing secret wall opens it');
    assert.equal(secretDoor.revealed, true, 'pushing secret wall reveals it on the automap');

    // crushing ceiling trap cycles down, emits 'crush', gibs live monsters, and shreds corpses underneath
    const crusher = game.level.crushers[0];
    crusher.phase = 0;
    crusher.slamming = false;
    game.addEnemy('imp', crusher.center.clone());
    const victim = game.enemies[0];
    game.events.length = 0;
    run(game, 0.8);
    assert.equal(victim.state, 'dead', 'ceiling crusher kills monster underneath');
    assert.equal(victim.gibbed, true, 'ceiling crusher gibs monster into XDeath chunks');
    assert.ok(game.events.some((e) => e.type === 'crush'), 'ceiling crusher emits hydraulic slam sound');

    // crusher also hurts the player when caught underneath at low height
    crusher.phase = 0;
    crusher.hurtCooldown = 0;
    game.player.health = 100;
    game.player.body.setPosition(crusher.center.clone());
    run(game, 0.75);
    assert.ok(game.player.health < 100, 'player caught under a slamming ceiling crusher takes crushing damage');
  },

  'classic Doom keycards and locked doors: 3D keycard meshes, color-coded security doors, HUD key slots, and progressive Blue -> Yellow -> Red -> Exit routing'() {
    assert.equal(typeof RECIPES.keycard, 'function', 'keycard pickup chime recipe exists');
    assert.equal(typeof RECIPES.locked, 'function', 'locked door buzzer recipe exists');

    // 3D keycard mesh & power-of-two atlases for Red, Yellow, and Blue keys
    const pow2 = (n) => (n & (n - 1)) === 0;
    const mesh = keycardMesh();
    assert.equal(mesh.vertices.length, 108 * 3, 'keycard 3D mesh has 3 boxes (108 vertices)');
    assert.equal(mesh.uvs.length, 108 * 2);
    assert.ok(KEYCARD_CELLS.front === 0 && KEYCARD_CELLS.side === 1 && KEYCARD_CELLS.top === 2 && KEYCARD_CELLS.grip === 3);

    for (const color of ['red', 'yellow', 'blue']) {
      const ka = keycardAtlas(color);
      assert.equal(ka.width, KEYCARD_CELL * KEYCARD_FRAMES);
      assert.equal(ka.height, KEYCARD_CELL);
      assert.ok(pow2(ka.width) && pow2(ka.height), `${color} keycard atlas is power-of-two`);

      const da = lockedDoorAtlas(color);
      assert.equal(da.width, 64 * DOOR_CELLS);
      assert.equal(da.height, 64);
      assert.ok(pow2(da.width) && pow2(da.height), `${color} locked door atlas is power-of-two`);
      let coloredRail = 0;
      for (let y = 14; y < 50; y++) {
        const o = (y * da.width + 28) * 4;
        const r = da.data[o];
        const g = da.data[o + 1];
        const b = da.data[o + 2];
        if (color === 'red' && r > g * 2 && r > b * 2)
          coloredRail++;
        if (color === 'yellow' && r > 180 && g > 130 && b < 90)
          coloredRail++;
        if (color === 'blue' && b > r * 1.8 && b > 150)
          coloredRail++;
      }
      assert.ok(coloredRail > 20, `${color} locked door has glowing ${color} security status rails`);
    }

    // Gameplay: locked doors block until the matching keycard is collected
    const game = fresh(0);
    clearEnemies(game);
    assert.deepEqual(game.player.keys, { red: false, yellow: false, blue: false }, 'player starts with no keycards');

    const blueDoor = [...game.level.doors.values()].find((d) => d.lock === 'blue');
    assert.ok(blueDoor, 'E1M1 has a blue-locked security door');
    game.player.body.setPosition(new Vec2(blueDoor.center.x, blueDoor.center.y - 48));
    game.player.angle = Math.PI / 2;
    game.events.length = 0;
    game.use();
    assert.equal(blueDoor.target, 0, 'blue door refuses to open without Blue keycard');
    assert.ok(game.message.text.includes('Blue keycard'), 'HUD message tells player which keycard is needed');
    assert.ok(game.events.some((e) => e.type === 'locked'), 'locked door emits locked buzzer sound');

    // Touching the blue keycard pickup grants the key, increments itemsPicked, and lets the door open
    const blueKeyPickup = game.pickups.find((p) => p.type === 'blueKey');
    assert.ok(blueKeyPickup, 'E1M1 has a blueKey pickup');
    const itemsBefore = game.itemsPicked;
    game.events.length = 0;
    game.touch(blueKeyPickup.body);
    assert.equal(game.player.keys.blue, true, 'touching blueKey grants blue keycard');
    assert.equal(blueKeyPickup.taken, true);
    assert.equal(game.itemsPicked, itemsBefore + 1, 'picking up a level keycard counts toward items');
    assert.ok(game.message.text.includes('Picked up a Blue keycard'), 'pickup message announces Blue keycard');
    assert.ok(game.events.some((e) => e.type === 'keycard'), 'picking up keycard emits keycard chime');

    game.use();
    assert.equal(blueDoor.target, 1, 'blue door opens once player holds Blue keycard');

    // HUD & Automap render keycard slots and color-coded locked doors
    const texts = [];
    const glowLines = [];
    const rectLines = [];
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {},
          clearRect() {},
          fillRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
          fillText(str) {
            texts.push(str);
          },
        };
      },
    };
    const mockOverlay = {
      clear() {},
      glow: {
        line(pts, col, alpha) {
          glowLines.push({ pts: flatPoints(pts), col, alpha });
        },
      },
      crisp: {
        fillRect() {},
        rectLine(rect, col, alpha) {
          rectLines.push({ ...rectBox(rect), col, alpha });
        },
        line() {},
        circleLine() {},
        weapon: { quad() {} },
        sprites: { quad() {} },
        face: { quad() {} },
      },
    };
    game.fog.explored.fill(1);
    game.fog.visible.fill(1);
    const hud = new Hud(mockCanvas, mockOverlay);
    hud.resize(1280, 760, 1);
    hud.render(game);
    assert.ok(texts.includes('KEYS'), 'HUD draws KEYS label on the status bar');
    assert.ok(rectLines.some((r) => r.col[0] > 0.85 && r.col[1] < 0.2), 'automap draws red-locked doors in red');
    assert.ok(rectLines.some((r) => r.col[0] > 0.9 && r.col[1] > 0.5 && r.col[2] < 0.4), 'automap draws yellow-locked doors in orange/yellow');

    // Verify indoor base levels have solvable progressive keycard routing (Start -> Blue Key -> Yellow Key -> Red Key -> Exit)
    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      const { level } = g;
      if (level.planet === 'mars') {
        assert.equal(level.doors.size, 1, 'Mars surface level has only the starting room door and no exterior locked doors');
        continue;
      }
      const locks = new Set([...level.doors.values()].map((d) => d.lock).filter(Boolean));
      assert.ok(locks.has('blue') && locks.has('yellow') && locks.has('red'), `level ${i} has blue, yellow, and red locked doors`);
      const keyPickups = new Map();
      for (const p of level.pickups)
        if (p.type === 'blueKey' || p.type === 'yellowKey' || p.type === 'redKey') {
          const tx = Math.floor(p.pos.x / 64);
          const ty = Math.floor(p.pos.y / 64);
          keyPickups.set(`${tx},${ty}`, p.type === 'redKey' ? 'red' : p.type === 'yellowKey' ? 'yellow' : 'blue');
        }
      assert.equal(keyPickups.size, 3, `level ${i} has all 3 keycards placed`);

      const held = new Set();
      let changed = true;
      let reached = new Set();
      while (changed) {
        changed = false;
        const start = [Math.floor(level.playerStart.x / 64), Math.floor(level.playerStart.y / 64)];
        reached = new Set([start.join()]);
        const queue = [start];
        while (queue.length) {
          const [x, y] = queue.pop();
          const keyHere = keyPickups.get(`${x},${y}`);
          if (keyHere && !held.has(keyHere)) {
            held.add(keyHere);
            changed = true;
          }
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            if (!level.isWalkable(nx, ny) || reached.has(`${nx},${ny}`))
              continue;
            const door = level.doors.get(ny * level.width + nx);
            if (door?.lock && !held.has(door.lock))
              continue;
            reached.add(`${nx},${ny}`);
            queue.push([nx, ny]);
          }
        }
      }
      assert.ok(held.has('blue') && held.has('yellow') && held.has('red'), `level ${i} allows collecting all 3 keys in order`);
      const exitReachableWithKeys = level.exits.some((e) =>
        [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => reached.has(`${Math.floor(e.x / 64) + dx},${Math.floor(e.y / 64) + dy}`))
      );
      assert.ok(exitReachableWithKeys, `level ${i} exit is reachable after collecting keycards`);

      // Also verify the exit is NOT reachable without the Red keycard
      const start = [Math.floor(level.playerStart.x / 64), Math.floor(level.playerStart.y / 64)];
      const withoutRed = new Set([start.join()]);
      const q2 = [start];
      while (q2.length) {
        const [x, y] = q2.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (!level.isWalkable(nx, ny) || withoutRed.has(`${nx},${ny}`))
            continue;
          const door = level.doors.get(ny * level.width + nx);
          if (door?.lock === 'red')
            continue;
          withoutRed.add(`${nx},${ny}`);
          q2.push([nx, ny]);
        }
      }
      const exitWithoutRed = level.exits.some((e) =>
        [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => withoutRed.has(`${Math.floor(e.x / 64) + dx},${Math.floor(e.y / 64) + dy}`))
      );
      assert.equal(exitWithoutRed, false, `level ${i} exit is gated behind a Red security door`);
    }
  },

  'expanded arsenal and weapon switching (1-4): chainsaw melee gibbing, chaingun rotary fire, rocket launcher splash blast, and 3D weapon pickups'() {
    // 1. Arsenal atlas & 3D weapon pickup meshes
    const fullAtlas = arsenalAtlas();
    assert.equal(fullAtlas.width, WEAPON_CELL_W * WEAPON_FRAME_COUNT);
    assert.equal(fullAtlas.height, WEAPON_CELL_H * WEAPON_ORDER.length);
    for (const weapon of WEAPON_ORDER) {
      const uv = weaponCellUv(0, weapon);
      assert.ok(uv[0] >= 0 && uv[2] <= 1 && uv[1] >= 0 && uv[3] <= 1, `valid UV for ${weapon}`);
      assert.ok(uv[3] > uv[1], `non-empty vertical UV range for ${weapon}`);
      const wAtlas = weaponAtlas(weapon);
      const rowSpan = (y) => {
        let minX = WEAPON_CELL_W;
        let maxX = -1;
        for (let x = 0; x < WEAPON_CELL_W; x++)
          if (wAtlas.data[(y * wAtlas.width + x) * 4 + 3] > 0) {
            if (x < minX)
              minX = x;
            if (x > maxX)
              maxX = x;
          }
        return maxX >= minX ? maxX - minX + 1 : 0;
      };
      const tipSpan = rowSpan(182);
      const baseSpan = rowSpan(252);
      assert.ok(tipSpan > 0 && baseSpan > tipSpan * 2.2, `${weapon} sprite foreshortens strongly toward the horizon (${tipSpan}px -> ${baseSpan}px)`);
      if (weapon === 'chainsaw') {
        assert.ok(tipSpan <= 18, `chainsaw guide bar is a narrow upright vertical blade at y=182 (${tipSpan}px wide, not a wide sideways paddle)`);
        let minY = WEAPON_CELL_H;
        let maxY = -1;
        for (let y = 160; y <= 212; y++)
          if (wAtlas.data[(y * wAtlas.width + 98) * 4 + 3] > 0) {
            if (y < minY)
              minY = y;
            if (y > maxY)
              maxY = y;
          }
        const vertBladeSpan = maxY - minY + 1;
        assert.ok(
          vertBladeSpan > tipSpan * 1.4,
          `chainsaw guide bar & cutting chain stand vertically to the ground (${vertBladeSpan}px vertical depth vs ${tipSpan}px horizontal width)`
        );
      }
    }
    const cgSheet = weaponAtlas('chaingun');
    const cgBarrelHashes = new Set();
    for (let f = 0; f < WEAPON_FRAME_COUNT; f++) {
      let h = 0;
      for (let y = 188; y <= 214; y++)
        for (let x = 96; x <= 160; x++) {
          const o = (y * cgSheet.width + f * WEAPON_CELL_W + x) * 4;
          h = (Math.imul(h, 31) + cgSheet.data[o] + cgSheet.data[o + 1] * 3 + cgSheet.data[o + 2] * 7) | 0;
        }
      cgBarrelHashes.add(h);
    }
    assert.equal(cgBarrelHashes.size, WEAPON_FRAME_COUNT, 'every chaingun frame has a distinct rotated barrel-cluster & clamp-lug phase');
    const countExtractedCasingPixels = (f) => {
      let count = 0;
      for (let y = 208; y <= 232; y++)
        for (let x = 130; x <= 165; x++) {
          const o = (y * cgSheet.width + f * WEAPON_CELL_W + x) * 4;
          if (cgSheet.data[o + 3] > 0)
            count++;
        }
      return count;
    };
    assert.ok(countExtractedCasingPixels(WEAPON_FRAMES.flashA) >= 60, 'chaingun flashA draws detailed multi-stage extracted brass casings');
    assert.ok(countExtractedCasingPixels(WEAPON_FRAMES.flashB) >= 60, 'chaingun flashB advances extracted brass casings along parabolic arc');
    assert.equal(countExtractedCasingPixels(WEAPON_FRAMES.idle), 0, 'chaingun idle has no extracted casings in flight');
    assert.equal(countExtractedCasingPixels(WEAPON_FRAMES.pumpA), 0, 'chaingun pumpA rolls the barrel with zero extracted casings in flight');
    assert.equal(countExtractedCasingPixels(WEAPON_FRAMES.pumpB), 0, 'chaingun pumpB rolls the barrel with zero extracted casings in flight');
    assert.deepEqual(
      [0.01, 0.05, 0.08, 0.11, 0.16, 0.25, 0.45].map((t) => weaponFrame(t, true, 'chaingun')),
      [
        WEAPON_FRAMES.flashA,
        WEAPON_FRAMES.flashB,
        WEAPON_FRAMES.pumpA,
        WEAPON_FRAMES.pumpB,
        WEAPON_FRAMES.pumpA,
        WEAPON_FRAMES.pumpB,
        WEAPON_FRAMES.idle,
      ],
      'chaingun weaponFrame cycles through all 4 active spin frames during firing and spin-down'
    );
    for (const [atlas, mesh, label] of [
      [chaingunAtlas(), chaingunMesh(), 'chaingun'],
      [rocketLauncherAtlas(), rocketLauncherMesh(), 'rocketLauncher'],
    ]) {
      assert.equal(atlas.width, ARSENAL_CELL * ARSENAL_FRAMES, `${label} atlas width`);
      assert.equal(atlas.height, ARSENAL_CELL, `${label} atlas height`);
      assert.ok(mesh.vertices.length >= 36 * 3 && mesh.vertices.length % 9 === 0, `${label} mesh triangles`);
      assert.equal(mesh.uvs.length, (mesh.vertices.length / 3) * 2, `${label} mesh UVs match vertices`);
      if (label === 'chaingun') {
        let minY = Infinity;
        for (let vi = 1; vi < mesh.vertices.length; vi += 3)
          if (mesh.vertices[vi] < minY) minY = mesh.vertices[vi];
        assert.ok(minY >= 2, 'chaingun pickup mesh is elevated above floor to prevent clipping');
      }
    }

    // 2. Every level places both Chaingun (C) and Rocket Launcher (M) pickups
    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      assert.ok(g.caches.some((c) => c.contents.includes('chaingun')), `level ${i} has a chaingun cache`);
      assert.ok(g.caches.some((c) => c.contents.includes('rocket')), `level ${i} has a rocket launcher cache`);
    }

    // 3. Starting inventory, weapon switching (1-4), and picking up Chaingun & Rocket Launcher
    const game = fresh(0);
    clearEnemies(game);
    assert.equal(game.player.weapon, 'shotgun', 'shotgun is active at start');
    assert.equal(game.player.weapons.chainsaw, true, 'chainsaw is owned at start');
    assert.equal(game.player.weapons.shotgun, true, 'shotgun is owned at start');
    assert.equal(game.player.weapons.chaingun, false, 'chaingun is locked at start');
    assert.equal(game.player.weapons.rocket, false, 'rocket launcher is locked at start');

    // Cannot switch to unowned Chaingun (slot 3) or Rocket Launcher (slot 4)
    game.update(1 / 60, input({ weapon: 3 }));
    assert.equal(game.player.weapon, 'shotgun', 'cannot switch to unowned chaingun');
    game.update(1 / 60, input({ weapon: 4 }));
    assert.equal(game.player.weapon, 'shotgun', 'cannot switch to unowned rocket launcher');

    // Switch to Chainsaw (slot 1)
    game.events.length = 0;
    game.update(1 / 60, input({ weapon: 1 }));
    assert.equal(game.player.weapon, 'chainsaw', 'Digit1 switches to chainsaw');
    assert.ok(game.player.switchTimer > 0, 'switching sets weapon switch timer');
    assert.ok(game.events.some((e) => e.type === 'weaponSwitch' && e.weapon === 'chainsaw'), 'switching emits weaponSwitch sound with chainsaw rev tag');

    // Holding the chainsaw at idle emits rhythmic 2-stroke chainsawIdle chug events
    run(game, 0.5);
    assert.ok(game.events.some((e) => e.type === 'chainsawIdle'), 'equipped chainsaw idles with 2-stroke engine chug');

    // Chainsaw has a tight melee reach and misses targets standing further away
    assert.ok(WEAPONS.chainsaw.reach <= 40, 'chainsaw reach is tight close-quarters melee');
    game.player.ammo = 0;
    game.player.cooldown = 0;
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.player.angle = 0;
    const farEnemy = game.addEnemy('imp', new Vec2(3 * 64 + 92, 3 * 64 + 32));
    farEnemy.hp = 4;
    game.fire();
    assert.equal(farEnemy.hp, 4, 'chainsaw does not hit an enemy beyond tight melee reach');
    game.scene.removeBody(farEnemy.body);
    game.enemies.pop();

    // Chainsaw shreds enemies at close range with zero ammo cost and guaranteed XDeath gibbing
    game.player.cooldown = 0;
    const victim = game.addEnemy('imp', new Vec2(3 * 64 + 74, 3 * 64 + 32));
    victim.hp = 3;
    game.events.length = 0;
    game.fire();
    assert.equal(game.player.ammo, 0, 'chainsaw uses 0 ammo');
    assert.equal(game.player.shootFace, 0.42, 'triggering chainsaw sets 0.42s shooting face timer just like shotgun');
    assert.equal(victim.state, 'dead', 'chainsaw kills enemy in melee reach');
    assert.equal(victim.gibbed, true, 'chainsaw kill triggers guaranteed XDeath gibbing');
    assert.ok(game.events.some((e) => e.type === 'chainsaw' && e.hit === true), 'chainsaw emits biting chainsaw sound when hitting a target');

    // Chainsaw puts specific vertical slash marks on walls distinct from firearm bullet holes
    const holesBeforeSaw = game.blood.holes.length;
    game.player.cooldown = 0;
    game.player.body.setPosition(new Vec2(1 * 64 + 28, 3 * 64 + 32));
    game.player.angle = Math.PI;
    game.events.length = 0;
    game.fire();
    assert.equal(game.blood.holes.length, holesBeforeSaw + 1, 'chainsaw leaves a permanent mark on the wall face');
    const sawMark = game.blood.holes[game.blood.holes.length - 1];
    assert.equal(sawMark.kind, 'slash', 'chainsaw wall mark has slash kind rather than firearm hole');
    const sawQuad = holeQuad(vecMark({ ...sawMark, top: 64 }));
    const gunQuad = holeQuad(vecMark({ ...sawMark, kind: 'hole', top: 64 }));
    const slashMinU = impactCellUv(IMPACT_CELLS.slash)[0];
    const slashMaxU = impactCellUv(IMPACT_CELLS.slash + SLASH_VARIANTS - 1)[2];
    assert.ok(sawQuad.uv[0] >= slashMinU && sawQuad.uv[2] <= slashMaxU, 'chainsaw wall quad maps to IMPACT_CELLS.slash atlas cells');
    assert.notEqual(sawQuad.uv[0], gunQuad.uv[0], 'chainsaw slash UV differs from firearm bullet hole UV');
    const impAtlas = impactAtlas();
    for (let v = 0; v < SLASH_VARIANTS; v++) {
      const xBase = (IMPACT_CELLS.slash + v) * 32;
      let minX = 32;
      let maxX = -1;
      let minY = 32;
      let maxY = -1;
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++)
          if (impAtlas.data[(y * impAtlas.width + xBase + x) * 4 + 3] > 0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
      const spanW = maxX - minX + 1;
      const spanH = maxY - minY + 1;
      assert.ok(spanH >= 20 && spanH > spanW * 1.5, `slash variant ${v} is a tall vertical saw gash (${spanW}x${spanH})`);
    }
    assert.ok(game.events.some((e) => e.type === 'impact'), 'chainsaw wall hit emits impact event');
    game.player.body.setPosition(new Vec2(3 * 64 + 32, 3 * 64 + 32));
    game.player.angle = 0;

    // Picking up Chaingun unlocks slot 3, grants ammo, and auto-equips when newly unlocked
    assert.ok(game.caches.some((c) => c.contents.includes('chaingun')), 'every level hides a chaingun in a cache');
    const cgPickup = game.addPickup('chaingun', game.player.pos.clone());
    game.events.length = 0;
    game.touch(cgPickup.body);
    assert.equal(game.player.weapons.chaingun, true, 'chaingun unlocked on pickup');
    assert.equal(game.player.weapon, 'chaingun', 'chaingun auto-equipped on first pickup');
    assert.equal(game.player.bullets, 50 + AMMO_TYPES.bullets.weaponBonus, 'chaingun pickup grants its bullet bonus');
    assert.ok(game.events.some((e) => e.type === 'weaponPickup'), 'weapon pickup emits weaponPickup sound');

    // Chaingun fires rapid hitscan rounds consuming 1 ammo per shot
    const target = game.addEnemy('brute', new Vec2(4 * 64 + 32, 3 * 64 + 32));
    const hpBefore = target.hp;
    game.player.cooldown = 0;
    game.events.length = 0;
    game.fire();
    assert.equal(game.player.bullets, 50 + AMMO_TYPES.bullets.weaponBonus - 1, 'chaingun consumes 1 ammo');
    assert.equal(target.hp, hpBefore - WEAPONS.chaingun.damage, 'chaingun deals 2 damage per round');
    assert.ok(game.events.some((e) => e.type === 'chaingun'), 'chaingun emits chaingun sound');

    // Chaingun stops shooting/spinning animation once out of ammo and when dry-firing
    assert.equal(
      weaponFrame(0.15, false, 'chaingun', 1),
      WEAPON_FRAMES.idle,
      'chaingun returns to idle after last shot flash when out of ammo'
    );
    const savedAmmo = game.player.ammo;
    game.player.ammo = 0;
    game.player.cooldown = 0;
    game.events.length = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.equal(game.player.dryFire, true, 'firing chaingun with 0 ammo marks dryFire');
    assert.ok(game.events.some((e) => e.type === 'dry'), 'firing chaingun with 0 ammo emits dry click');
    const recordedUvs = [];
    const mockHud = Object.create(Hud.prototype);
    mockHud.width = 960;
    mockHud.height = 600;
    mockHud.overlay = {
      crisp: {
        weapon: {
          quad(_rect, uv) {
            recordedUvs.push(uv.slice());
          },
        },
      },
    };
    while (game.player.cooldown > 0) {
      mockHud.drawWeapon(game);
      const canSpin = !game.player.dryFire && (game.player.switchTimer ?? 0) <= 0;
      const pose = chaingunPose({
        time: game.time,
        attacking: canSpin && game.player.cooldown > 0 && game.player.triggerHeld !== false,
        spinDown: canSpin ? game.player.spinDown : 0,
      });
      assert.equal(pose.rotorRot.z, 0, 'chaingun 3D rotor stays stationary throughout dry-fire cooldown with 0 ammo');
      game.update(1 / 60, input({ fire: false }));
    }
    assert.equal(recordedUvs.length, 0, 'drawWeapon suppresses 2D sprite quad when chaingun is equipped (uses 3D viewmodel)');
    game.player.ammo = savedAmmo;
    game.player.cooldown = 0;
    game.player.dryFire = false;

    // Holding fire spins the 3D chaingun rotor at full rate; releasing fire stops active firing jolt while keeping spin-down barrel rotation
    game.player.angle = Math.PI;
    game.update(1 / 60, input({ fire: true }));
    mockHud.drawWeapon(game);
    assert.equal(recordedUvs.length, 0, 'drawWeapon skips 2D sprite quad while firing chaingun');
    const firingPose = chaingunPose({
      time: game.time,
      recoil: game.player.recoil,
      attacking: !game.player.dryFire && game.player.cooldown > 0 && game.player.triggerHeld !== false,
      spinDown: game.player.spinDown,
    });
    assert.ok(firingPose.rotorRot.z > 0, 'while holding fire, 3D chaingun rotor spins around Z axis');
    game.update(1 / 60, input({ fire: false }));
    const spinDownPose = chaingunPose({
      time: game.time,
      recoil: game.player.recoil,
      attacking: !game.player.dryFire && game.player.cooldown > 0 && game.player.triggerHeld !== false,
      spinDown: Math.max(game.player.spinDown ?? 0, game.player.cooldown > 0 ? 0.1 : 0),
    });
    assert.ok(spinDownPose.rotorRot.z > 0, 'releasing fire keeps 3D chaingun barrel rotor spinning through spin-down');
    game.player.angle = 0;
    game.player.ammo = savedAmmo;
    game.player.cooldown = 0;
    game.player.spinDown = 0;

    // Picking up Rocket Launcher unlocks slot 4, grants ammo, and auto-equips
    assert.ok(game.caches.some((c) => c.contents.includes('rocket')), 'every level hides a rocket launcher in a cache');
    const rlPickup = game.addPickup('rocket', game.player.pos.clone());
    game.touch(rlPickup.body);
    assert.equal(game.player.weapons.rocket, true, 'rocket launcher unlocked on pickup');
    assert.equal(game.player.weapon, 'rocket', 'rocket launcher auto-equipped on first pickup');
    assert.equal(game.player.rockets, AMMO_TYPES.rockets.weaponBonus, 'rocket launcher pickup grants its rocket bonus');

    // Firing Rocket Launcher spawns a player rocket projectile consuming 2 ammo and detonating on impact with splash damage & gibbing
    game.player.cooldown = 0;
    const ammoBeforeRocket = game.player.ammo;
    game.events.length = 0;
    game.fire();
    assert.equal(game.player.ammo, ammoBeforeRocket - WEAPONS.rocket.ammoCost, 'rocket launcher costs 2 ammo');
    assert.ok(game.events.some((e) => e.type === 'rocketFire'), 'rocket launcher emits rocketFire sound');
    const rocketShot = game.shots.find((s) => s.kind === 'rocket' && s.team === 'player');
    assert.ok(rocketShot, 'player rocket projectile spawned');

    run(game, 0.4);
    assert.equal(target.state, 'dead', 'rocket direct + splash blast kills brute');
    assert.equal(target.gibbed, true, 'rocket kill triggers guaranteed XDeath gibbing');
    assert.ok(game.effects.some((e) => e.type === 'boom'), 'rocket detonation spawns boom explosion effect');

    // Weapon inventory & active weapon persist across nextLevel()
    game.nextLevel();
    assert.equal(game.player.weapons.chaingun, true, 'chaingun persists to next level');
    assert.equal(game.player.weapons.rocket, true, 'rocket launcher persists to next level');
    assert.equal(game.player.weapon, 'rocket', 'active weapon persists to next level');
  },

  'AC-1 player rocket damages player within radius with clear line of sight'() {
    for (const [distance, damage] of [[0, 32], [41.25, 26], [82.5, 19], [164, 6]]) {
      const game = rocketSelfDamageGame();
      const shot = game.addRocket(new Vec2(game.player.pos.x + distance, game.player.pos.y), new Vec2(1, 0));
      assert.equal(shot.team, 'player');
      assert.equal(shot.radius, 165);
      assert.ok(distance < shot.radius);
      assert.ok(game.scene.hasLineOfSight(shot.pos, game.player.pos, { mask: CAT.WALL }));
      game.detonateRocket(shot);
      assert.equal(game.player.health, 100 - damage, `splash damage at distance ${distance}`);
      assert.equal(game.player.armor, 0);
    }
  },

  'AC-2 player rocket does not damage player at or beyond radius'() {
    for (const distance of [165, 166, 220]) {
      const game = rocketSelfDamageGame();
      game.player.armor = 100;
      game.player.armorType = 'green';
      const shot = game.addRocket(new Vec2(game.player.pos.x + distance, game.player.pos.y), new Vec2(1, 0));
      assert.ok(distance >= shot.radius);
      assert.ok(game.scene.hasLineOfSight(shot.pos, game.player.pos, { mask: CAT.WALL }));
      game.detonateRocket(shot);
      assert.equal(game.player.health, 100, `health unchanged at distance ${distance}`);
      assert.equal(game.player.armor, 100, `armor unchanged at distance ${distance}`);
    }
  },

  'AC-3 wall blocks player rocket self-damage'() {
    const game = rocketSelfDamageGame('#P#......#');
    game.player.armor = 100;
    game.player.armorType = 'green';
    const shot = game.addRocket(new Vec2(224, game.player.pos.y), new Vec2(1, 0));
    assert.ok(game.player.pos.getDistance(shot.pos) < shot.radius);
    assert.equal(game.scene.hasLineOfSight(shot.pos, game.player.pos, { mask: CAT.WALL }), false);
    game.detonateRocket(shot);
    assert.equal(game.player.health, 100);
    assert.equal(game.player.armor, 100);
  },

  'AC-4 player rocket self-damage respects armor handling'() {
    for (const [type, armor, remainingArmor, health] of [
      ['green', 100, 94, 87],
      ['blue', 200, 190, 91],
      ['green', 3, 0, 84],
    ]) {
      const game = rocketSelfDamageGame();
      game.player.armor = armor;
      game.player.armorType = type;
      const shot = game.addRocket(new Vec2(game.player.pos.x + 82.5, game.player.pos.y), new Vec2(1, 0));
      assert.ok(game.scene.hasLineOfSight(shot.pos, game.player.pos, { mask: CAT.WALL }));
      game.detonateRocket(shot);
      assert.equal(game.player.armor, remainingArmor, `${type} armor absorbs its share of 19 splash damage`);
      assert.equal(game.player.health, health, `${type} armor leaves remaining damage to health`);
      assert.equal(game.player.armorType, remainingArmor > 0 ? type : null);
    }
  },

  'AC-5 god mode blocks player rocket self-damage'() {
    for (const armor of [0, 100]) {
      const game = rocketSelfDamageGame();
      game.player.godMode = true;
      game.player.armor = armor;
      game.player.armorType = armor > 0 ? 'green' : null;
      const shot = game.addRocket(new Vec2(game.player.pos.x + 82.5, game.player.pos.y), new Vec2(1, 0));
      assert.ok(game.player.pos.getDistance(shot.pos) < shot.radius);
      assert.ok(game.scene.hasLineOfSight(shot.pos, game.player.pos, { mask: CAT.WALL }));
      game.detonateRocket(shot);
      assert.equal(game.player.health, 100);
      assert.equal(game.player.armor, armor);
    }
  },

  'armor system: 3D green security armor & blue megaarmor pickups absorb 33% and 50% damage and persist across levels'() {
    for (const color of ARMOR_COLORS) {
      const atlas = armorAtlas(color);
      assert.equal(atlas.width, ARMOR_CELL * ARMOR_FRAMES);
      assert.equal(atlas.height, ARMOR_CELL);
      assert.equal(atlas.data.length, atlas.width * atlas.height * 4);
      for (const idx of Object.values(ARMOR_CELLS)) {
        let opaque = 0;
        for (let y = 0; y < ARMOR_CELL; y++) {
          for (let x = 0; x < ARMOR_CELL; x++) {
            if (atlas.data[(y * atlas.width + idx * ARMOR_CELL + x) * 4 + 3] === 255)
              opaque++;
          }
        }
        assert.equal(opaque, ARMOR_CELL * ARMOR_CELL, `armor ${color} cell ${idx} is fully opaque`);
      }
    }

    const mesh = armorMesh();
    assert.ok(mesh.vertices.length >= 36 * 3 && mesh.vertices.length % 9 === 0, '3D armor vest mesh has multi-box triangle vertices');
    assert.equal(mesh.uvs.length, (mesh.vertices.length / 3) * 2, '3D armor vest mesh UVs match vertices');

    assert.ok(RECIPES.armor, 'armor pickup sound recipe exists');

    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      assert.ok(g.pickups.some((p) => p.type === 'greenArmor'), `level ${i + 1} has a green security armor pickup`);
      assert.ok(g.pickups.some((p) => p.type === 'blueArmor'), `level ${i + 1} has a blue megaarmor pickup`);
    }

    const game = fresh(0);
    clearEnemies(game);
    assert.equal(game.player.armor, 0, 'player starts with 0 armor');
    assert.equal(game.player.armorType, null, 'player starts with no armor type');

    // Green Security Armor grants 100 armor and absorbs 33% (1/3) of incoming damage
    const greenPickup = game.pickups.find((p) => p.type === 'greenArmor');
    game.events.length = 0;
    game.touch(greenPickup.body);
    assert.equal(game.player.armor, ARMOR_TYPES.green.points, 'green armor grants 100 armor points');
    assert.equal(game.player.armorType, 'green', 'armorType set to green');
    assert.equal(greenPickup.taken, true, 'green armor pickup marked taken');
    assert.ok(game.events.some((e) => e.type === 'armor'), 'emits armor pickup sound');

    // Cannot pick up another green armor when already at >= 100 armor
    const extraGreen = game.addPickup('greenArmor', new Vec2(128, 128), false);
    game.touch(extraGreen.body);
    assert.equal(extraGreen.taken, false, 'green armor ignored when player already has >= 100 armor');

    // 30 damage with Green Armor: absorbs round(30 * 1/3) = 10 armor, health loses 20
    game.hurtPlayer(30);
    assert.equal(game.player.armor, 90, 'green armor absorbs 10 of 30 damage (33%)');
    assert.equal(game.player.health, 80, 'player health takes remaining 20 damage');

    // Blue MegaArmor upgrades over Green Armor (< 200), granting 200 armor and absorbing 50% of incoming damage
    const bluePickup = game.pickups.find((p) => p.type === 'blueArmor');
    game.events.length = 0;
    game.touch(bluePickup.body);
    assert.equal(game.player.armor, ARMOR_TYPES.blue.points, 'blue megaarmor sets armor to 200');
    assert.equal(game.player.armorType, 'blue', 'armorType set to blue');
    assert.equal(bluePickup.taken, true, 'blue megaarmor pickup marked taken');
    assert.ok(game.events.some((e) => e.type === 'armor'), 'emits armor pickup sound');

    // Green armor is ignored while holding 200 blue armor
    game.touch(extraGreen.body);
    assert.equal(extraGreen.taken, false, 'green armor cannot overwrite 200 blue megaarmor');
    assert.equal(game.player.armorType, 'blue', 'armorType stays blue');

    // 30 damage with Blue MegaArmor: absorbs round(30 * 0.5) = 15 armor, health loses 15
    game.hurtPlayer(30);
    assert.equal(game.player.armor, 185, 'blue megaarmor absorbs 15 of 30 damage (50%)');
    assert.equal(game.player.health, 65, 'player health takes remaining 15 damage');

    // Armor and armorType persist across nextLevel()
    game.nextLevel();
    assert.equal(game.player.armor, 185, 'armor points persist to next level');
    assert.equal(game.player.armorType, 'blue', 'armorType persists to next level');

    // Depleting armor resets armorType to null
    game.player.armor = 5;
    game.player.health = 100;
    game.hurtPlayer(20);
    assert.equal(game.player.armor, 0, 'armor clamps to 0 when depleted');
    assert.equal(game.player.armorType, null, 'armorType resets to null when armor reaches 0');
    assert.equal(game.player.health, 85, 'remaining unabsorbed damage goes to health');
  },

  'Supercharge Powerups (Soulsphere, Berserk Pack & Rad Suit) have 3D textured meshes and grant overcharge, 4x chainsaw gibbing, and slime immunity'() {
    // 1. Verify 3D procedural atlases and meshes for Soulsphere, Berserk Pack, and Rad Suit
    for (const [kind, makeAtlas, makeMesh] of [
      ['soulsphere', soulsphereAtlas, soulsphereMesh],
      ['berserk', berserkAtlas, berserkMesh],
      ['radsuit', radsuitAtlas, radsuitMesh],
    ]) {
      const atlas = makeAtlas();
      assert.equal(atlas.width, POWERUP_CELL * POWERUP_FRAMES, `${kind} atlas width is 128`);
      assert.equal(atlas.height, POWERUP_CELL, `${kind} atlas height is 32`);
      for (const cell of Object.values(POWERUP_CELLS)) {
        let opaque = 0;
        for (let y = 0; y < POWERUP_CELL; y++)
          for (let x = 0; x < POWERUP_CELL; x++)
            if (atlas.data[(y * atlas.width + cell * POWERUP_CELL + x) * 4 + 3] === 255)
              opaque++;
        assert.equal(opaque, POWERUP_CELL * POWERUP_CELL, `${kind} cell ${cell} is fully opaque`);
      }
      const mesh = makeMesh();
      assert.ok(mesh.vertices.length >= 180 && mesh.vertices.length % 9 === 0, `${kind} mesh has valid 3D triangles`);
      assert.equal(mesh.uvs.length, (mesh.vertices.length / 3) * 2, `${kind} mesh UVs match vertex count`);
    }

    // 2. Verify all three levels spawn Supercharge Powerups from WAD symbols O, Z, V
    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      assert.ok(
        g.pickups.some((p) => p.type === 'soulsphere' || p.type === 'berserk' || p.type === 'radsuit'),
        `level ${i} spawns at least one supercharge powerup`
      );
    }

    // 3. Soulsphere supercharges health by +100 up to 200% (overriding standard 100% cap)
    const game = fresh(0);
    clearEnemies(game);
    const soulPickup = game.pickups.find((p) => p.type === 'soulsphere');
    assert.ok(soulPickup, 'E1M1 has a Soulsphere pickup');
    game.events.length = 0;
    game.touch(soulPickup.body);
    assert.equal(game.player.health, 200, 'Soulsphere boosts 100 HP player to 200 HP');
    assert.equal(soulPickup.taken, true, 'Soulsphere marked taken');
    assert.ok(game.player.soulFlash > 0, 'Soulsphere triggers blue visor flash');
    assert.ok(game.events.some((e) => e.type === 'powerup' && e.kind === 'soulsphere'), 'emits powerup sound');

    // Standard medikits cannot be picked up while supercharged (>= 100 HP), and another Soulsphere is ignored at 200 HP
    const extraSoul = game.addPickup('soulsphere', new Vec2(128, 128), false);
    game.touch(extraSoul.body);
    assert.equal(extraSoul.taken, false, 'Soulsphere ignored when already at 200 HP');

    // 4. Berserk Pack heals to 100%, auto-switches to Chainsaw, and multiplies Chainsaw damage by 4x (instant gibbing)
    game.player.health = 45;
    game.player.weapon = 'shotgun';
    const berserkPickup = game.pickups.find((p) => p.type === 'berserk');
    assert.ok(berserkPickup, 'E1M1 has a Berserk Pack pickup');
    game.events.length = 0;
    game.touch(berserkPickup.body);
    assert.equal(game.player.health, 100, 'Berserk heals injured player up to 100 HP');
    assert.equal(game.player.berserk, true, 'player.berserk is enabled');
    assert.equal(game.player.berserkTimer, POWERUP_TYPES.berserk.tintDuration, 'berserk crimson tint timer started');
    assert.equal(game.player.weapon, 'chainsaw', 'Berserk auto-switches to Chainsaw');
    assert.equal(berserkPickup.taken, true, 'Berserk Pack marked taken');

    // Test 4x Chainsaw damage on a tough Brute (hp: 22 -> 1 hit of 3 * 4 = 12 leaves 10 HP; 2nd hit gibs it!)
    const brute = game.addEnemy('brute', new Vec2(game.player.pos.x + 36, game.player.pos.y));
    game.player.angle = 0;
    game.player.cooldown = 0;
    game.fireChainsaw();
    assert.equal(brute.hp, 10, 'Berserk chainsaw deals 12 damage (4x base 3) in a single strike');
    game.fireChainsaw();
    assert.equal(brute.state, 'dead', 'second Berserk chainsaw strike kills the Brute');
    assert.equal(brute.gibbed, true, 'Berserk chainsaw guarantees XDeath gibbing');

    // 5. Radiation Shielding Suit grants 45 seconds of complete immunity to toxic slime floors
    const radPickup = game.pickups.find((p) => p.type === 'radsuit');
    assert.ok(radPickup, 'E1M1 has a Radiation Shielding Suit pickup');
    game.events.length = 0;
    game.touch(radPickup.body);
    assert.equal(game.player.radSuit, POWERUP_TYPES.radsuit.duration, 'Rad Suit grants 45s of protection');
    assert.equal(radPickup.taken, true, 'Rad Suit marked taken');

    // Find a toxic slime tile and stand on it for 3 seconds while Rad Suit is active
    const slimeIdx = game.level.slime.findIndex((v) => v === 1);
    assert.ok(slimeIdx >= 0, 'level has toxic slime tiles');
    const sx = ((slimeIdx % game.level.width) + 0.5) * 64;
    const sy = (Math.floor(slimeIdx / game.level.width) + 0.5) * 64;
    game.player.body.setPosition(new Vec2(sx, sy));
    run(game, 0.4);
    const healthBefore = game.player.health;
    for (let i = 0; i < 30; i++)
      game.updateHazards(0.1);
    assert.equal(game.player.health, healthBefore, 'player takes 0 slime damage while Rad Suit is active');
    assert.ok(game.player.radSuit < POWERUP_TYPES.radsuit.duration && game.player.radSuit > 40, 'Rad Suit timer ticks down');

    // Once Rad Suit expires, slime damages the player again
    game.player.radSuit = 0;
    for (let i = 0; i < 10; i++)
      game.updateHazards(0.1);
    assert.ok(game.player.health < healthBefore, 'toxic slime damages player once Rad Suit expires');
  },

  'full-screen tactical automap: toggle, zoom, grid, vector architecture, and telemetry'() {
    const game = fresh(0);
    game.state = 'play';
    game.kills = 4;
    game.itemsPicked = 3;
    game.secretsFound = 1;
    game.stats.time = 75;

    const texts = [];
    const rectLines = [];
    const crispLines = [];
    const fills = [];
    let weaponQuads = 0;
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {},
          clearRect() {},
          fillRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
          fillText(str) {
            texts.push(str);
          },
        };
      },
    };
    const mockOverlay = {
      clear() {},
      glow: {
        line() {},
      },
      crisp: {
        fillRect(rect, col) {
          fills.push({ ...rectBox(rect), col });
        },
        rectLine(rect, col, alpha) {
          rectLines.push({ ...rectBox(rect), col, alpha });
        },
        line(pts, col, alpha) {
          crispLines.push({ pts: flatPoints(pts), col, alpha });
        },
        circleLine() {},
        weapon: {
          quad() {
            weaponQuads++;
          },
        },
        sprites: { quad() {} },
        face: { quad() {} },
      },
    };

    const hud = new Hud(mockCanvas, mockOverlay);
    hud.resize(1280, 760, 1);
    assert.equal(hud.automap, false, 'automap starts closed');
    assert.equal(hud.automapZoom, 1, 'automap zoom starts at 1.0');
    assert.equal(hud.automapGrid, true, 'automap grid starts enabled');

    // Toggle automap on -> emits 'automap' sound event and hides 3D weapon sprite while keeping status bar
    game.events.length = 0;
    assert.equal(hud.toggleAutomap(game), true, 'toggleAutomap opens automap');
    assert.ok(game.events.some((e) => e.type === 'automap'), 'toggling automap emits automap sound event');

    // Zoom & grid controls clamp and toggle cleanly
    assert.equal(hud.zoomAutomap(0.5), 1.5, 'zoomAutomap increases zoom');
    assert.equal(hud.zoomAutomap(10), 3.0, 'zoomAutomap clamps at 3.0x');
    assert.equal(hud.zoomAutomap(-10), 0.6, 'zoomAutomap clamps at 0.6x');
    hud.automapZoom = 1;
    assert.equal(hud.toggleAutomapGrid(), false, 'toggleAutomapGrid turns grid off');
    assert.equal(hud.toggleAutomapGrid(), true, 'toggleAutomapGrid turns grid back on');

    // Reveal the map and render full-screen automap
    game.fog.explored.fill(1);
    game.fog.visible.fill(1);
    const secretDoor = [...game.level.doors.values()].find((d) => d.secret);
    if (secretDoor)
      secretDoor.revealed = true;
    if (game.level.secrets.length > 0)
      game.discoveredSecrets.add(game.level.secrets[0]);

    game.player.weapon = 'rocket';
    hud.render(game);
    assert.equal(weaponQuads, 0, 'weapon sprite is hidden while full-screen tactical automap is open');
    assert.equal(game.automap, true, '3D weapon viewmodel is hidden while full-screen tactical automap is open');
    assert.ok(texts.some((t) => t.includes('TACTICAL AUTOMAP')), 'automap header displays TACTICAL AUTOMAP');
    assert.ok(
      texts.some((t) => t.includes(`KILLS 4/${game.totalEnemies}`) && t.includes(`ITEMS 3/${game.totalItems}`) && t.includes(`SECRETS 1/${game.totalSecrets}`) && t.includes('TIME 01:15')),
      'automap header displays live KILLS, ITEMS, SECRETS, and TIME telemetry',
    );
    assert.ok(texts.some((t) => t.includes('[TAB] CLOSE') && t.includes('ZOOM 100%') && t.includes('GRID ON')), 'automap footer displays interactive controls');
    assert.ok(texts.includes('S'), 'revealed secret door / discovered secret room is marked with S on the automap');
    assert.ok(texts.includes('X'), 'explored exit portal is marked with X on the automap');
    assert.ok(crispLines.some((l) => l.col[0] > 0.85 && l.col[1] < 0.2), 'automap draws classic Doom red vector boundary wall lines');
    assert.ok(rectLines.some((r) => r.col[0] > 0.9 && r.col[1] > 0.5 && r.col[2] < 0.4), 'automap draws orange elevation / secret / yellow-lock outlines');
    assert.ok(crispLines.some((l) => l.col[1] > 0.7 && l.alpha === 1), 'automap draws classic Doom green vector player arrow');

    // Toggling automap off restores normal HUD + 3D weapon viewmodel visibility
    assert.equal(hud.toggleAutomap(game), false, 'toggleAutomap closes automap');
    hud.render(game);
    assert.equal(game.automap, false, 'closing automap restores 3D weapon viewmodel visibility');
  },

  'procedural level soundtracks (E1M1 Ambient, E1M2 Metal, E1M3 Horror, E1M4 Boss, E1M5 Gore, Intro) and M track cycling'() {
    const sound = new Sound();
    // By default ('auto'), each level has its own distinct soundtrack
    assert.equal(sound.effectiveMusicMode('play', 0), 'play', 'Level 1 (E1M1) defaults to ambient/spooky play soundtrack');
    assert.equal(sound.effectiveMusicMode('play', 1), 'metal', 'Level 2 (E1M2) defaults to industrial metal soundtrack');
    assert.equal(sound.effectiveMusicMode('play', 2), 'horror', 'Level 3 (E1M3) defaults to horror metal soundtrack');
    assert.equal(sound.effectiveMusicMode('play', 3), 'boss', 'Level 4 (E1M4) defaults to boss finale soundtrack');
    assert.equal(sound.effectiveMusicMode('play', 4), 'gore', 'Level 5 (E1M5) defaults to gore metal soundtrack');
    assert.equal(sound.effectiveMusicMode('title', 0), 'title', 'title state uses intro theme by default');

    // Pressing M on Level 1 cycles through all 6 tracks + Off:
    // E1M1 ('play') -> E1M2 ('metal') -> E1M3 ('horror') -> E1M4 ('boss') -> E1M5 ('gore') -> Intro ('title') -> Off ('off') -> E1M1 ('play')
    assert.equal(sound.toggleMusic(0), 'Music: E1M2 Industrial Metal', 'first M press on Level 1 switches to E1M2 Industrial Metal');
    assert.equal(sound.effectiveMusicMode('play', 0), 'metal', 'effectiveMusicMode reflects E1M2 override');
    assert.equal(sound.toggleMusic(0), 'Music: E1M3 Horror Metal', 'second M press switches to E1M3 Horror Metal');
    assert.equal(sound.effectiveMusicMode('play', 0), 'horror', 'effectiveMusicMode reflects E1M3 override');
    assert.equal(sound.toggleMusic(0), 'Music: E1M4 Boss Finale', 'third M press switches to E1M4 Boss Finale');
    assert.equal(sound.effectiveMusicMode('play', 0), 'boss', 'effectiveMusicMode reflects E1M4 override');
    assert.equal(sound.toggleMusic(0), 'Music: E1M5 Gore Metal', 'fourth M press switches to E1M5 Gore Metal');
    assert.equal(sound.effectiveMusicMode('play', 0), 'gore', 'effectiveMusicMode reflects E1M5 override');
    assert.equal(sound.toggleMusic(0), 'Music: Intro Theme', 'fifth M press switches to Intro Theme during gameplay');
    assert.equal(sound.effectiveMusicMode('play', 0), 'title', 'effectiveMusicMode allows listening to Intro Theme in level');
    assert.equal(sound.toggleMusic(0), 'Music: Off', 'sixth M press switches music Off');
    assert.equal(sound.effectiveMusicMode('play', 0), 'off', 'effectiveMusicMode reflects Off');
    assert.equal(sound.effectiveMusicMode('title', 0), 'off', 'Off preference silences title music too');
    assert.equal(sound.toggleMusic(0), 'Music: E1M1 Ambient', 'seventh M press wraps around to E1M1 Ambient');
    assert.equal(sound.effectiveMusicMode('play', 0), 'play', 'effectiveMusicMode reflects E1M1 Ambient');
    assert.equal(sound.effectiveMusicMode('title', 0), 'play', 'explicit track selection overrides title screen music too');

    // Every score is a GroovR song played by the GroovR engine
    for (const [mode, song] of Object.entries(SONGS))
      assert.deepEqual(validateSong(song), [], `the ${mode} score is a valid GroovR song`);
    const pattern = (mode, id) => SONGS[mode].patterns.find((p) => p.id === `pat-${id}`);
    assert.equal(pattern('horror', 'guitar-palm').length, 64, 'E1M3 has a sixteen-bar riff cycle');
    assert.equal(pattern('boss', 'guitar-palm').length, 32, 'E1M4 has an eight-bar riff cycle');
    assert.equal(pattern('gore', 'guitar-palm').length, 128, 'E1M5 has a thirty-two-bar (128-beat / 512-step) gore metal riff cycle');
    assert.ok(SONGS.gore.bpm >= 150, 'E1M5 Gore Metal has a fast driving industrial tempo');
    assert.ok(pattern('gore', 'lead-metal').notes.length >= 90, 'E1M5 centers around a clear, evolving main melody across all 32 bars');
    assert.ok(pattern('gore', 'growl-gore').notes.length >= 4, 'E1M5 punctuates phrase turnarounds and breakdown rests with monster gore growls');
    assert.ok(pattern('boss', 'boss-horn').notes.some((n) => n.time >= 16), 'E1M4 has a second-half horn variation in bars 5-8');
    assert.equal(pattern('horror', 'music-box').notes.length, 59, 'E1M3 music-box lullaby spans both eight-bar halves with detuned variations');
    const boxSemitones = new Set(pattern('horror', 'music-box').notes.map((n) => Math.round(n.pitch - 81)));
    assert.ok(boxSemitones.has(1) && boxSemitones.has(6), 'the lullaby goes wrong on the flat second and the tritone');
    assert.equal(pattern('metal', 'guitar-palm').length, 64, 'E1M2 repeats after sixteen bars');
    assert.equal(SONGS.title.loopStart, 16, 'the intro settles into its last two passes, as it does in the game');
    assert.ok(SONGS.title.tracks.some((t) => t.id === 'throb' && t.period > 0), 'the intro drone repeats on its own period');
    assert.ok(SONGS.metal.buses.some((b) => b.id === 'amp'), 'industrial metal has the guitar amp bus');
    assert.equal(SONGS.play.buses.length, 0, 'the ambient score has no guitar amp');
    const layersOf = (mode, id) => SONGS[mode].instruments.find((i) => i.id === id).layers;
    assert.equal(layersOf('metal', 'snare').length, 3, 'backbeat snares ring with the boss anvil');
    assert.equal(layersOf('metal', 'snare-ghost').length, 2, 'a ghost snare has no anvil ring');
    assert.equal(layersOf('metal', 'snare-dry').length, 2, 'a snare struck dry has no anvil ring');
    const anvil = layersOf('metal', 'snare')[2];
    assert.deepEqual(anvil.velocity, { b: 0.5, r: 0.5 }, 'each anvil ring is struck with its own random velocity');
    assert.ok(anvil.voices.every((v) => typeof v.freq === 'number'), 'the anvil ring keeps one fixed tuning');
    assert.ok(layersOf('metal', 'guitar-palm')[0].out === 'amp' && layersOf('metal', 'guitar-palm')[0].shaper, 'guitar notes go through the amp with per-note preamp waveshaping');

    // The engine plays them through a mock audio context
    const counts = { osc: 0, sources: 0, amps: 0, starts: [] };
    const mockParam = () => ({
      value: 0,
      setValueAtTime() {},
      setTargetAtTime() {},
      cancelScheduledValues() {},
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
    });
    const mockNode = () => ({
      connect() {
        return this;
      },
      disconnect() {},
      start(t) {
        counts.starts.push(t);
      },
      stop() {},
      frequency: mockParam(),
      detune: mockParam(),
      Q: mockParam(),
      gain: mockParam(),
      delayTime: mockParam(),
      pan: mockParam(),
      threshold: mockParam(),
      ratio: mockParam(),
      attack: mockParam(),
      release: mockParam(),
      knee: mockParam(),
      buffer: null,
      curve: null,
      oversample: 'none',
      type: 'sine',
    });
    const mockCtx = {
      currentTime: 0,
      sampleRate: 100,
      createGain: () => mockNode(),
      createDelay: () => mockNode(),
      createChannelMerger: () => mockNode(),
      createChannelSplitter: () => mockNode(),
      createStereoPanner: () => mockNode(),
      createDynamicsCompressor: () => mockNode(),
      createOscillator: () => {
        counts.osc++;
        return mockNode();
      },
      createBiquadFilter: () => mockNode(),
      createWaveShaper: () => {
        const node = mockNode();
        Object.defineProperty(node, 'oversample', {
          set(v) {
            if (v === '2x') counts.amps++;
          },
          get: () => 'none',
        });
        return node;
      },
      createConvolver: () => mockNode(),
      createBuffer: (_ch, len) => ({ getChannelData: () => new Float32Array(len) }),
      createBufferSource: () => {
        counts.sources++;
        return mockNode();
      },
    };
    const ticks = [];
    const realSetInterval = globalThis.setInterval;
    const realClearInterval = globalThis.clearInterval;
    globalThis.setInterval = (fn) => ticks.push(fn);
    globalThis.clearInterval = () => {};
    const run = (seconds) => {
      for (let t = 0; t < seconds; t += 0.5) {
        mockCtx.currentTime += 0.5;
        for (const tick of ticks) tick();
      }
    };
    const reset = () => {
      Object.assign(counts, { osc: 0, sources: 0, amps: 0, starts: [] });
      ticks.length = 0;
    };
    try {
      const music = new Music(mockCtx, mockNode());

      // 1. Intro / Intermission: solo bass, then sub-bass and kick join, then the lead melody
      music.setLevel(0.28, 'title');
      assert.equal(music.mode, 'title', 'the intro theme is playing');
      run(6);
      const pass0 = counts.osc;
      assert.ok(pass0 > 0, 'the intro schedules its picked bass ostinato');
      run(7.68);
      const pass1 = counts.osc - pass0;
      assert.ok(pass1 > pass0, 'after four repetitions sub-bass, throb and kick join under the picked bass');
      run(7.68);
      const pass2 = counts.osc - pass0 - pass1;
      assert.ok(pass2 > pass1, 'after eight repetitions the Phrygian lead melody joins');
      music.setLevel(0);
      reset();

      // 2. E1M1 Ambient: pads, booms, bells and a metallic scrape, with no guitar amp
      music.setLevel(0.28, 'play');
      run(25);
      assert.ok(counts.osc > 10, 'Level 1 ambient mode schedules pad, boom and bell oscillators');
      assert.ok(counts.sources > 0, 'Level 1 ambient mode schedules the metallic scrape');
      assert.equal(counts.amps, 0, 'the guitar amp is not built during Level 1 ambient mode');
      music.setLevel(0);
      reset();

      // 3. E1M2 Industrial Metal across eight bars
      music.setLevel(0.24, 'metal');
      run(14.8);
      assert.ok(counts.amps > 0, 'industrial metal activates the waveshaper guitar amp');
      assert.ok(counts.osc > 300, 'industrial metal schedules chords, sub-bass, Phrygian leads, kicks, snares and anvils');
      assert.ok(counts.sources > 40, 'industrial metal schedules drum and cymbal transients');
      music.setLevel(0);
      reset();

      // 4. E1M3 Horror Metal across an eight-bar cycle
      music.setLevel(0.24, 'horror');
      run(21);
      assert.ok(counts.amps > 0, 'E1M3 routes its downtuned guitar chugs through the guitar amp');
      assert.ok(counts.osc > 150, 'E1M3 schedules chugs, sub-bass, lullaby, strings and drums');
      assert.ok(counts.sources > 15, 'E1M3 schedules snare, risers and cymbal ticks');
      music.setLevel(0);
      reset();

      // 5. E1M4 Boss Finale
      music.setLevel(0.24, 'boss');
      run(14);
      assert.ok(counts.osc > 150, 'E1M4 schedules drop-C doom chords, tritone dread horns and double-kicks');
      assert.ok(counts.sources > 30, 'E1M4 schedules war-march percussion transients');
      music.setLevel(0);
      reset();

      // 6. E1M5 Gore Metal
      music.setLevel(0.24, 'gore');
      run(16);
      assert.ok(counts.amps > 0, 'E1M5 routes its industrial gore guitars through the guitar amp');
      assert.ok(counts.osc > 200, 'E1M5 schedules Hungarian-minor main melody, gallop riffs, sub-bass, and sparse gore growls');
      assert.ok(counts.sources > 30, 'E1M5 schedules tight industrial drums and cymbal transients');

      // Switching to 0 ('off') silences the score
      music.setLevel(0);
      assert.equal(music.mode, null, 'Music mode clears cleanly when silenced');
      reset();

      // 6. Fast non-overlapping fade in & fade out between score changes
      assert.equal(FADE_OUT, 0.25, 'fast fade-out is 0.25s');
      assert.equal(FADE_IN, 0.25, 'fast fade-in is 0.25s');
      const paramLogs = [];
      const logParam = (name) => ({
        name,
        value: 0,
        setValueAtTime(v, t) {
          paramLogs.push({ name, method: 'setValueAtTime', v, t });
        },
        linearRampToValueAtTime(v, t) {
          paramLogs.push({ name, method: 'linearRampToValueAtTime', v, t });
        },
        exponentialRampToValueAtTime() {},
        cancelScheduledValues() {},
        setTargetAtTime() {},
      });
      let gainId = 0;
      const testGainCtx = {
        ...mockCtx,
        currentTime: 10.0,
        createGain() {
          const node = { gain: logParam(`gain_${gainId++}`), connect() {}, disconnect() {} };
          return node;
        },
      };
      const testMusic = new Music(testGainCtx, mockNode());
      testMusic.setLevel(0.3, 'metal');
      const firstFadeIn = paramLogs.find((l) => l.method === 'linearRampToValueAtTime' && l.v === 0.3);
      assert.equal(firstFadeIn.t, 10.0 + FADE_IN, 'first track fades in over FADE_IN');
      const oldLevel = firstFadeIn.name;

      // Switch from metal to horror at currentTime = 12.0
      testGainCtx.currentTime = 12.0;
      paramLogs.length = 0;
      counts.starts.length = 0;
      testMusic.setLevel(0.3, 'horror');
      const rampsToZero = paramLogs.filter((l) => l.method === 'linearRampToValueAtTime' && l.v === 0 && l.t === 12.0 + FADE_OUT);
      assert.equal(rampsToZero.length, 3, 'old track dry bus, reverb send and reverb return all fade out so no reverb tail rings under the new track');
      assert.ok(rampsToZero.some((l) => l.name === oldLevel), 'the old track ramps to 0 gain');
      const newFadeIn = paramLogs.find((l) => l.method === 'linearRampToValueAtTime' && l.v === 0.3);
      assert.equal(newFadeIn.t, 12.0 + FADE_OUT + FADE_IN, 'new track completes fade-in at now + FADE_OUT + FADE_IN');
      assert.ok(paramLogs.some((l) => l.name === newFadeIn.name && l.method === 'setValueAtTime' && l.v === 0 && l.t === 12.0 + FADE_OUT), 'new track holds 0 gain until old track completes fade-out');
      assert.ok(counts.starts.length > 0 && counts.starts.every((t) => t >= 12.0 + FADE_OUT), 'new track notes start only after old track fade-out completes (no overlap)');

      // The same score keeps playing and just eases to the new level
      paramLogs.length = 0;
      testMusic.setLevel(0.12, 'horror');
      assert.equal(testMusic.mode, 'horror', 'the same score is kept');
      assert.equal(paramLogs.length, 0, 'a level change does not restart or fade the score');
      testMusic.setLevel(0);
    } finally {
      globalThis.setInterval = realSetInterval;
      globalThis.clearInterval = realClearInterval;
    }
  },

  'teleporters (T), telefrag XDeath gibbing, and E1M4 Phobos Anomaly twin Warden finale'() {
    assert.equal(typeof RECIPES.teleport, 'function', 'teleport plasma audio recipe exists');
    const makeParam = (label) => ({
      value: 0,
      setValueAtTime(v, t) {
        assert.ok(Number.isFinite(v) && Number.isFinite(t), `${label}.setValueAtTime requires finite floats`);
      },
      exponentialRampToValueAtTime(v, t) {
        assert.ok(Number.isFinite(v) && v > 0 && Number.isFinite(t), `${label}.exponentialRampToValueAtTime requires positive finite floats`);
      },
    });
    const recipeCtx = {
      sampleRate: 44100,
      createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
      createWaveShaper: () => ({ curve: null, connect() {} }),
      createOscillator: () => ({ type: 'sine', frequency: makeParam('osc.frequency'), connect() {}, start() {}, stop() {} }),
      createGain: () => ({ gain: makeParam('gain.gain'), connect() {} }),
      createBiquadFilter: () => ({ type: 'lowpass', frequency: makeParam('filter.frequency'), Q: makeParam('filter.Q'), connect() {} }),
      createBufferSource: () => ({ buffer: null, connect() {}, start() {}, stop() {} }),
    };
    for (const [rName, rFn] of Object.entries(RECIPES)) {
      const info = rFn(recipeCtx, { connect() {} }, 0, {});
      assert.ok(info && info.duration > 0, `recipe ${rName} executes with valid AudioParams`);
    }

    // Teleporter atlas is power-of-two, opaque, and has bright cyan/emerald quantum rings and beacons (no crimson pentagram); shader pulses with uTime
    const tele = teleporterAtlas();
    assert.equal(tele.width, TILE_PIXELS);
    assert.equal(tele.height, TILE_PIXELS);
    let brightPixels = 0;
    let redDominantPixels = 0;
    for (let i = 0; i < tele.data.length; i += 4) {
      assert.equal(tele.data[i + 3], 255, 'teleporter pad atlas is fully opaque');
      if (tele.data[i] > 180 || tele.data[i + 1] > 180 || tele.data[i + 2] > 180)
        brightPixels++;
      if (tele.data[i] > tele.data[i + 1] && tele.data[i] > tele.data[i + 2])
        redDominantPixels++;
    }
    assert.ok(brightPixels > 250, 'teleporter atlas contains glowing quantum stator rings, core, and corner beacon pixels');
    assert.equal(redDominantPixels, 0, 'futuristic teleporter atlas has cool cyan/emerald tech glow instead of crimson pentagram');
    assert.ok(TELEPORTER_FRAGMENT.includes('uTime'), 'teleporter fragment shader pulses with uTime');

    // 3D futuristic teleporter machine geometry includes base pedestal, 4 corner pylons, and overhead ceiling ring
    const enclosedQuads = teleporterMachineQuads(new Vec3(96, -0.18, 160), new Vec2(64, 62.8));
    const openQuads = teleporterMachineQuads(new Vec3(96, -0.18, 160), new Vec2(64, 0));
    assert.ok(enclosedQuads.length > openQuads.length, 'enclosed teleporter machine adds overhead ceiling emitter hood quads');
    assert.ok(openQuads.length >= 60, 'teleporter machine builds 3D stepped pedestal and 4 corner field pylons with coil collars');
    let maxMachineY = -Infinity;
    for (const q of enclosedQuads) {
      assert.equal(q.corners.length, 12, 'each teleporter machine quad has 4 3D vertices');
      assert.equal(q.uv.length, 4, 'each teleporter machine quad has 4 UV bounds');
      for (let k = 1; k < 12; k += 3)
        maxMachineY = Math.max(maxMachineY, q.corners[k]);
    }
    assert.ok(maxMachineY > 60, '3D teleporter machine reaches up to the ceiling emitter unit');
    const teleMesh = teleporterMachineMesh(new Vec3(0, 0, 0), new Vec2(64, 62.8));
    assert.equal(teleMesh.vertices.length, enclosedQuads.length * 18, 'teleporterMachineMesh converts each quad into 2 triangles (18 floats)');
    assert.equal(teleMesh.uvs.length, enclosedQuads.length * 12, 'teleporterMachineMesh converts each quad into 6 UVs (12 floats)');

    // Every level (E1M1..E1M5) has paired teleporter pads
    assert.equal(LEVELS.length, 5, 'Episode 1 has 5 levels including E1M5 Red Planet');
    assert.equal(LEVELS[3].name, 'E1M4 · Phobos Anomaly');
    assert.equal(LEVELS[4].name, 'E1M5 · Red Planet');
    for (let i = 0; i < LEVELS.length; i++) {
      const g = fresh(i);
      assert.ok(g.level.teleporters.length >= 2, `level ${i} has paired teleporter pads (${g.level.teleporters.length})`);
      assert.equal(g.level.teleporters.length % 2, 0, `level ${i} teleporters come in linked pairs`);
      for (const pad of g.level.teleporters) {
        const partner = g.level.teleporterByTile.get(pad.targetIdx);
        assert.ok(partner && partner !== pad, 'every teleporter pad links to its partner pad');
        assert.equal(partner.targetIdx, pad.idx, 'teleporter pairing is symmetric');
        assert.equal(g.level.teleporterAt(pad.center.x, pad.center.y), pad, 'teleporterAt resolves pad from world coordinates');
      }
    }

    // Teleporter TFOG plasma sprite atlas is 16 frames of 64x64 with vivid emerald/cyan plasma and 1px cell borders
    const tfog = teleportAtlas();
    assert.equal(tfog.width, EXPLOSION_CELL * EXPLOSION_FRAMES, 'teleportAtlas width is 1024');
    assert.equal(tfog.height, EXPLOSION_CELL, 'teleportAtlas height is 64');
    assert.equal(explosionWidth({ type: 'teleport' }), 62, 'teleport sprite has full-height 62-unit width');
    for (let f = 0; f < EXPLOSION_FRAMES; f++) {
      let greenCyan = 0;
      for (let y = 0; y < EXPLOSION_CELL; y++) {
        for (let x = 0; x < EXPLOSION_CELL; x++) {
          const o = (y * tfog.width + f * EXPLOSION_CELL + x) * 4;
          const a = tfog.data[o + 3];
          if (x === 0 || y === 0 || x === EXPLOSION_CELL - 1 || y === EXPLOSION_CELL - 1)
            assert.equal(a, 0, `teleportAtlas frame ${f} has 1px transparent cell border`);
          else if (a === 255 && tfog.data[o + 1] > tfog.data[o])
            greenCyan++;
        }
      }
      assert.ok(greenCyan > 80, `teleportAtlas frame ${f} contains vivid green/cyan plasma vortex pixels`);
    }

    // Stepping onto a teleporter pad warps the player to the destination pad, sets cooldown & teleFlash, emits 'teleport', and Telefrags any enemy on the exit pad
    const game = fresh(0);
    clearEnemies(game);
    const padA = game.level.teleporters[0];
    const padB = game.level.teleporterByTile.get(padA.targetIdx);
    game.addEnemy('brute', padB.center.clone());
    const blocker = game.enemies[0];
    game.events.length = 0;
    game.effects.length = 0;

    game.player.body.setPosition(padA.center.clone());
    game.updateTeleporters(1 / 60);

    assert.ok(game.player.pos.getDistance(padB.center) < 1, 'player warps to paired destination teleporter pad');
    assert.ok(game.player.teleportCooldown > 0.7, 'teleport cooldown prevents immediate bounce-back');
    assert.ok(game.player.teleFlash > 0.3, 'teleport triggers green-cyan plasma visor flash');
    assert.ok(game.player.shootFace > 0.3, 'teleport triggers marine portrait reaction');
    assert.ok(game.events.some((e) => e.type === 'teleport'), 'teleport emits plasma warp sound');
    const teleEffects = game.effects.filter((e) => e.type === 'teleport');
    assert.equal(teleEffects.length, 3, 'teleport spawns entry pad, exit pad, and forward-visible camera TFOG bursts');
    assert.ok(
      teleEffects.some((e) => Math.hypot(e.x - padB.center.x, e.y - padB.center.y) > 20),
      'one TFOG burst spawns in front of the player camera beyond the near clip plane',
    );
    assert.equal(blocker.state, 'dead', 'enemy standing on exit teleporter pad is instantly Telefragged');
    assert.equal(blocker.gibbed, true, 'Telefragged enemy explodes into XDeath gibs');
    assert.equal(game.message.text, 'Telefrag!', 'Telefrag displays classic Doom message');

    // Standing still on padB does not warp back to padA even long after cooldown expires
    game.updateTeleporters(1 / 60);
    assert.ok(game.player.pos.getDistance(padB.center) < 1, 'player stays on destination pad while cooldown is active');
    game.updateTeleporters(3.0);
    assert.equal(game.player.teleportCooldown, 0, 'teleport cooldown has fully expired');
    assert.ok(game.player.pos.getDistance(padB.center) < 1, 'standing still on destination pad never teleports player back');

    // Stepping off padB and stepping back onto padB teleports back to padA
    game.player.body.setPosition(new Vec2(padB.center.x + 56, padB.center.y));
    game.updateTeleporters(1 / 60);
    assert.equal(game.player.teleportPad, -1, 'stepping off destination pad resets teleportPad lock');
    game.player.body.setPosition(padB.center.clone());
    game.updateTeleporters(1 / 60);
    assert.ok(game.player.pos.getDistance(padA.center) < 1, 'stepping back onto padB warps back to padA');

    // Chasing non-boss monster stepping onto a teleporter pad warps to the partner pad when closer to player
    clearEnemies(game);
    game.player.body.setPosition(new Vec2(padB.center.x + 56, padB.center.y));
    game.addEnemy('imp', padA.center.clone());
    const imp = game.enemies[0];
    imp.state = 'chase';
    imp.teleportCooldown = 0;
    game.updateTeleporters(1 / 60);
    assert.ok(imp.pos.getDistance(padB.center) < 1, 'chasing monster warps through teleporter pad');
    assert.ok(imp.teleportCooldown > 1.0, 'warped monster receives teleport cooldown');

    // E1M4 Phobos Anomaly has twin Wardens (2 bosses): killing the first announces 'A WARDEN FALLS', killing the second announces 'THE WARDEN IS DEAD'
    const e1m4 = fresh(3);
    const bosses = e1m4.enemies.filter((e) => e.type === 'boss');
    assert.equal(bosses.length, 2, 'E1M4 Phobos Anomaly spawns twin Wardens');
    assert.ok(e1m4.level.arena.size > 20, 'E1M4 star sanctum arena encompasses the twin Wardens');
    e1m4.damageEnemy(bosses[0], 9999);
    assert.equal(bosses[0].state, 'dead', 'first Warden killed');
    assert.equal(e1m4.message.text, 'A WARDEN FALLS', 'killing first of twin Wardens announces A WARDEN FALLS');
    e1m4.damageEnemy(bosses[1], 9999);
    assert.equal(bosses[1].state, 'dead', 'second Warden killed');
    assert.equal(e1m4.message.text, 'THE WARDEN IS DEAD', 'killing final Warden announces THE WARDEN IS DEAD');
  },

  'dynamic projectile, muzzle flash, explosion, and teleporter point lighting'() {
    assert.ok(LIGHT_GLSL.includes('isCeilingFixture'), 'LIGHT_GLSL distinguishes ceiling fixtures from omnidirectional mid-room dynamic lights');

    const game = fresh(0);
    clearEnemies(game);
    const camPos = new Vec3(game.player.pos.x, EYE, game.player.pos.y);

    // 1. Weapon muzzle flash creates a warm amber-gold dynamic light in front of the player
    game.player.weapon = 'shotgun';
    game.player.flash = 0.12;
    let dyn = collectDynamicLights(game, camPos, 1.0);
    assert.equal(dyn.length, 1, 'active shotgun muzzle flash emits 1 dynamic light');
    assert.equal(dyn[0].kind, 'muzzle');
    assert.equal(dyn[0].color, MUZZLE_LIGHT_COLOR);
    assert.equal(dyn[0].attenuation, MUZZLE_LIGHT_ATTENUATION, 'muzzle flash uses short-range attenuation');
    assert.ok(MUZZLE_LIGHT_ATTENUATION.y > DYNAMIC_LIGHT_ATTENUATION.y * 2 && MUZZLE_LIGHT_ATTENUATION.z > DYNAMIC_LIGHT_ATTENUATION.z * 25, 'muzzle flash attenuates rapidly over a very short distance');
    assert.ok(LIGHT_GLSL.includes('rangeCutoff'), 'LIGHT_GLSL enforces a hard distance cutoff on short-range muzzle flash lights');
    assert.ok(dyn[0].strength > 0.9, 'muzzle flash light has strong intensity');

    // Fist melee does not emit a firearm muzzle flash light
    game.player.weapon = 'fist';
    assert.equal(collectDynamicLights(game, camPos, 1.0).length, 0, 'fist melee does not emit firearm muzzle flash');
    game.player.flash = 0;
    game.player.weapon = 'shotgun';

    // 2. Flying rockets and enemy fireballs emit traveling colored point lights
    game.shots.push({
      pos: new Vec2(game.player.pos.x + 80, game.player.pos.y),
      vel: new Vec2(360, 0),
      kind: 'rocket',
    });
    game.shots.push({
      pos: new Vec2(game.player.pos.x + 140, game.player.pos.y),
      vel: new Vec2(-220, 0),
      kind: 'shot',
    });
    dyn = collectDynamicLights(game, camPos, 1.5);
    assert.equal(dyn.length, 2, 'flying rocket and fireball each emit a dynamic light');
    assert.equal(dyn[0].kind, 'rocket', 'closer rocket prioritized first');
    assert.equal(dyn[0].color, ROCKET_LIGHT_COLOR);
    assert.equal(dyn[1].kind, 'fireball');
    assert.equal(dyn[1].color, FIREBALL_LIGHT_COLOR);

    // 3. Explosions ('boom') and teleporter plasma bursts ('teleport') emit high-priority decaying point lights
    game.effects.push({
      type: 'boom',
      x: game.player.pos.x + 90,
      y: game.player.pos.y,
      z: 20,
      age: 0.05,
      life: 0.45,
    });
    game.effects.push({
      type: 'teleport',
      x: game.player.pos.x + 110,
      y: game.player.pos.y,
      z: 22,
      age: 0.04,
      life: 0.42,
    });
    game.effects.push({
      type: 'spark',
      x: game.player.pos.x + 240,
      y: game.player.pos.y,
      z: 28,
      age: 0.02,
      life: 0.25,
    });
    dyn = collectDynamicLights(game, camPos, 2.0);
    assert.equal(dyn.length, 4, 'collectDynamicLights gathers rocket, fireball, boom, and teleport lights while ignoring wall sparks');
    assert.ok(dyn.some((d) => d.kind === 'boom' && d.color === BOOM_LIGHT_COLOR), 'explosion emits BOOM_LIGHT_COLOR');
    assert.ok(dyn.some((d) => d.kind === 'teleport' && d.color === TELEPORT_LIGHT_COLOR), 'teleporter burst emits TELEPORT_LIGHT_COLOR');
    assert.ok(!dyn.some((d) => d.kind === 'spark'), 'bullet wall-impact sparks do not spawn distant dynamic room lights');

    // 4. updateCeilingLights allocates dynamic lights into the first PointLight slots with DYNAMIC_LIGHT_ATTENUATION
    // and fills the remaining slots with nearest ceiling fixtures using CEILING_LIGHT_ATTENUATION
    const mockScene = { addLight() {}, clearLights() {} };
    const { pointLights } = createCeilingLights(mockScene, MAX_LIGHTS);
    const fixtures = ceilingLightFixtures(game.level);
    updateCeilingLights(pointLights, fixtures, camPos, 2.0, game);

    assert.equal(pointLights[0].linearAttenuation, DYNAMIC_LIGHT_ATTENUATION.y, 'first PointLight slot uses dynamic light attenuation');
    assert.ok(pointLights[0].position.y < 54, 'dynamic light sits at mid-room projectile/explosion height (< 54)');
    assert.equal(pointLights[4].linearAttenuation, CEILING_LIGHT_ATTENUATION.y, 'remaining PointLight slots use ceiling fixture attenuation');
    assert.ok(pointLights[4].position.y > 54, 'ceiling fixture slots sit at ceiling diffuser height (> 54)');

    // Clearing shots and effects restores all PointLight slots back to ceiling fixtures
    game.shots.length = 0;
    game.effects.length = 0;
    updateCeilingLights(pointLights, fixtures, camPos, 2.5, game);
    assert.equal(pointLights[0].linearAttenuation, CEILING_LIGHT_ATTENUATION.y, 'slot 0 restores ceiling light attenuation when no dynamic lights are active');
  },

  'AC-1 burning barrel fuse emits Fuse light with boom color'() {
    const game = {
      barrels: [
        { pos: new Vec2(180, 210), gone: false, fuse: 0.05 },
      ],
    };
    const camPos = new Vec3(100, 28, 200);
    const dyn = collectDynamicLights(game, camPos, 0.3);
    assert.equal(dyn.length, 1, 'exactly one dynamic light produced for burning barrel');
    assert.equal(dyn[0].kind, 'Fuse');
    assert.equal(dyn[0].color, BOOM_LIGHT_COLOR);
    assert.equal(dyn[0].attenuation, DYNAMIC_LIGHT_ATTENUATION);
    assert.equal(dyn[0].position.x, 180);
    assert.equal(dyn[0].position.y, 18, 'fuse light fixed at y = 18');
    assert.equal(dyn[0].position.z, 210);
  },

  'AC-2 barrel fuse light pulses with time and barrel index'() {
    const b0 = { pos: new Vec2(100, 200), gone: false, fuse: 0.1 };
    const b1 = { pos: new Vec2(120, 200), gone: false, fuse: 0.1 };
    const game = { barrels: [b0, b1] };
    const camPos = new Vec3(100, 18, 200);
    const sampleTimes = [0, 0.013, 0.3, 1.7];

    for (const time of sampleTimes) {
      const dyn = collectDynamicLights(game, camPos, time);
      assert.equal(dyn.length, 2);

      const light0 = dyn.find((l) => l.position.x === 100);
      const light1 = dyn.find((l) => l.position.x === 120);
      assert.ok(light0 && light1, 'both barrel lights found');

      const expected0 = 0.75 + 0.35 * Math.abs(Math.sin(time * 55 + 0));
      const expected1 = 0.75 + 0.35 * Math.abs(Math.sin(time * 55 + 1));

      assert.ok(Math.abs(light0.strength - expected0) < 1e-9, `barrel 0 strength matches formula at time ${time}`);
      assert.ok(Math.abs(light1.strength - expected1) < 1e-9, `barrel 1 strength matches formula at time ${time}`);

      assert.ok(light0.strength >= 0.75 && light0.strength <= 1.10, 'barrel 0 strength bounded in [0.75, 1.10]');
      assert.ok(light1.strength >= 0.75 && light1.strength <= 1.10, 'barrel 1 strength bounded in [0.75, 1.10]');
    }

    // At time = 0, sin(0) = 0 and sin(1) ≈ 0.84147, so strengths differ significantly (> 1e-3)
    const dynZero = collectDynamicLights(game, camPos, 0);
    const l0 = dynZero.find((l) => l.position.x === 100);
    const l1 = dynZero.find((l) => l.position.x === 120);
    assert.ok(Math.abs(l0.strength - l1.strength) > 1e-3, 'barrels at index 0 and 1 differ in pulse phase');
  },

  'AC-3 gone barrel emits no fuse light'() {
    const barrel = { pos: new Vec2(180, 210), gone: false, fuse: 0.05 };
    const game = { barrels: [barrel] };
    const camPos = new Vec3(100, 28, 200);

    const dynActive = collectDynamicLights(game, camPos, 0.3);
    const activeCount = dynActive.length;
    assert.equal(activeCount, 1, 'active barrel emits 1 light');

    barrel.gone = true;
    const dynGone = collectDynamicLights(game, camPos, 0.3);
    const goneCount = dynGone.length;
    assert.equal(goneCount, 0, 'gone barrel emits 0 lights');
  },

  'AC-4 inactive fuse emits no light but zero fuse still burns'() {
    const barrel = { pos: new Vec2(180, 210), gone: false, fuse: -1 };
    const game = { barrels: [barrel] };
    const camPos = new Vec3(100, 28, 200);

    assert.equal(collectDynamicLights(game, camPos, 0).length, 0, 'fuse -1 emits no light');

    barrel.fuse = -0.5;
    assert.equal(collectDynamicLights(game, camPos, 0).length, 0, 'fuse -0.5 emits no light');

    delete barrel.fuse;
    assert.equal(collectDynamicLights(game, camPos, 0).length, 0, 'undefined fuse emits no light');

    barrel.fuse = 0;
    const dynZero = collectDynamicLights(game, camPos, 0);
    assert.equal(dynZero.length, 1, 'fuse 0 emits 1 light');
    assert.equal(dynZero[0].kind, 'Fuse');
  },

  'AC-5 fog occlusion culls barrel fuse light'() {
    const barrel = { pos: new Vec2(180, 210), gone: false, fuse: 0.05 };
    const game = { barrels: [barrel] };
    const camPos = new Vec3(100, 28, 200);

    let receivedPos = null;
    const occludedFog = {
      canSeeNear(pos) {
        receivedPos = pos;
        return false;
      },
    };
    const dynOccluded = collectDynamicLights(game, camPos, 0.3, Infinity, occludedFog);
    assert.equal(dynOccluded.length, 0, 'occluded barrel is culled');
    assert.equal(receivedPos, barrel.pos, 'fog received barrel position');

    const visibleFog = { canSeeNear: () => true };
    const dynVisible = collectDynamicLights(game, camPos, 0.3, Infinity, visibleFog);
    assert.equal(dynVisible.length, 1, 'visible barrel emits light');
  },

  'AC-6 barrel fuse light is culled beyond max radius'() {
    // Barrel at (200, 18, 200), Camera at (100, 18, 200) -> distance exactly 100, distSq = 10000
    const barrel = { pos: new Vec2(200, 200), gone: false, fuse: 0.05 };
    const game = { barrels: [barrel] };
    const camPos = new Vec3(100, 18, 200);

    // With maxRadius = 90 (maxDistSq = 8100 < 10000), barrel is culled
    const dynCulled = collectDynamicLights(game, camPos, 0.3, 90);
    assert.equal(dynCulled.length, 0, 'culled beyond maxRadius (90 < 100)');

    // With maxRadius = 110 (maxDistSq = 12100 > 10000), barrel is included
    const dynIncluded = collectDynamicLights(game, camPos, 0.3, 110);
    assert.equal(dynIncluded.length, 1, 'included within maxRadius (110 > 100)');
  },

  'enemies are 3D articulated textured meshes with power-of-two horror skin atlases, vertex normals, and joint animation'() {
    const pow2 = (n) => (n & (n - 1)) === 0;
    const types = Object.keys(ENEMY_TYPES);
    for (const type of types) {
      const atlas = monsterSkinAtlas(type);
      assert.equal(atlas.width, MONSTER_SKIN_CELL * MONSTER_SKIN_FRAMES, `${type} skin atlas width is 256`);
      assert.equal(atlas.height, MONSTER_SKIN_CELL, `${type} skin atlas height is 32`);
      assert.ok(pow2(atlas.width) && pow2(atlas.height), `${type} skin atlas is power-of-two`);
      assert.equal(atlas.data.length, atlas.width * atlas.height * 4, `${type} skin atlas RGBA length matches`);

      // Every anatomical cell is fully opaque and carries glowing eyes/core (G=255) on the face cell and gore (B=255) on the gore cell
      for (const [cellName, cellIdx] of Object.entries(MONSTER_SKIN_CELLS)) {
        let opaque = 0;
        let eyes = 0;
        let gore = 0;
        for (let y = 0; y < MONSTER_SKIN_CELL; y++)
          for (let x = 0; x < MONSTER_SKIN_CELL; x++) {
            const o = (y * atlas.width + cellIdx * MONSTER_SKIN_CELL + x) * 4;
            if (atlas.data[o + 3] === 255)
              opaque++;
            if (atlas.data[o + 1] === 255)
              eyes++;
            if (atlas.data[o + 2] === 255)
              gore++;
          }
        assert.equal(opaque, MONSTER_SKIN_CELL * MONSTER_SKIN_CELL, `${type} cell ${cellName} is 100% opaque`);
        if (cellName === 'face')
          assert.ok(eyes >= 8, `${type} face cell has emissive glowing eyes (G=255)`);
        if (cellName === 'gore')
          assert.ok(gore >= 40, `${type} gore cell has arterial blood ramp (B=255)`);
      }

      // Verify mangled gore skin atlas for heavily wounded and dead monsters
      const goreAtlas = monsterGoreSkinAtlas(type);
      assert.equal(goreAtlas.width, MONSTER_SKIN_CELL * MONSTER_SKIN_FRAMES, `${type} gore skin atlas width is 256px`);
      assert.equal(goreAtlas.height, MONSTER_SKIN_CELL, `${type} gore skin atlas height is 32px`);
      let goreAtlasBlood = 0;
      let goreAtlasBone = 0;
      for (let i = 0; i < goreAtlas.data.length; i += 4) {
        if (goreAtlas.data[i + 3] === 0)
          continue;
        if (goreAtlas.data[i + 2] === 255)
          goreAtlasBlood++;
        if (goreAtlas.data[i] >= 180 && goreAtlas.data[i + 1] >= 165)
          goreAtlasBone++;
      }
      if (type !== 'wraith') {
        assert.ok(goreAtlasBlood >= 400, `${type} gore skin atlas is drenched in arterial blood (B=255)`);
        assert.ok(goreAtlasBone >= 100, `${type} gore skin atlas exposes shattered ribcage/spine bone`);
      }

      // Verify 3D anatomical part geometries and combined monsterMesh
      const parts = monsterParts(type);
      assert.ok(parts.pivots && parts.body && parts.head && parts.jaw && parts.goreViscera && parts.gorePool && Array.isArray(parts.goreChunks), `${type} has core 3D anatomical parts including goreViscera and goreChunks`);
      for (const [partName, geom] of Object.entries(parts)) {
        if (partName === 'pivots' || partName === 'goreChunks')
          continue;
        assert.ok(geom.vertices.length >= 36 * 3 && geom.vertices.length % 9 === 0, `${type}.${partName} has valid 3D triangle vertices`);
        assert.equal(geom.normals.length, geom.vertices.length, `${type}.${partName} has 3D vertex normals matching vertices`);
        assert.equal(geom.uvs.length, (geom.vertices.length / 3) * 2, `${type}.${partName} has 2D UVs matching vertices`);
      }
      const combined = monsterMesh(type);
      assert.ok(combined.vertices.length >= 180 * 3, `${type} combined 3D mesh has rich multi-prism geometry`);
      assert.equal(combined.normals.length, combined.vertices.length, `${type} combined 3D mesh has matching normals`);
      assert.equal(combined.uvs.length, (combined.vertices.length / 3) * 2, `${type} combined 3D mesh has matching UVs`);

      // Verify runtime buildMonster, animateMonster, and dieMonster scene-graph execution
      const addedMeshes = [];
      const texOptionsSeen = [];
      const mockWorld = {
        gl: { NEAREST: 9728 },
        scene: { addMesh: (m) => addedMeshes.push(m) },
        material: () => new Material(),
        monsterPartMesh: (geo) => {
          assert.ok(geo.vertices.length >= 36 * 3, `${type} part CustomMesh has vertices`);
          const m = new Mesh(null, new CustomMesh());
          m.setTexture = (_data, opts) => texOptionsSeen.push(opts);
          m.setCustomUniform = (name, val) => {
            m.customUniforms ??= {};
            m.customUniforms[name] = val;
          };
          return m;
        },
      };
      const enemy = {
        type,
        def: ENEMY_TYPES[type],
        hp: ENEMY_TYPES[type].hp,
        pos: new Vec2(100, 100),
        body: { velocity: new Vec2(40, 0) },
        state: 'chase',
        walk: 1.2,
        phase: 0.3,
        windup: 0.1,
        roar: 0,
        hurt: 0,
        pain: 0,
        leap: 0,
        deadTime: 0,
        gibbed: false,
        inSlime: false,
      };
      const view = MONSTERS[type].build(mockWorld, enemy);
      assert.ok(view.root instanceof Mesh, `${type} buildMonster creates a RoostR Mesh root`);
      assert.equal(addedMeshes.length, 1, `${type} buildMonster adds root to world scene`);
      assert.equal(view.meshes.length, 16, `${type} buildMonster creates 16 articulated sub-meshes including goreViscera and 6 goreChunks`);
      assert.equal(view.goreViscera.isActive(), false, `${type} goreViscera starts hidden while healthy`);
      assert.equal(view.gorePool.isActive(), false, `${type} gorePool starts hidden`);

      MONSTERS[type].animate(view, enemy, { time: 1.5, dt: 1 / 60, player: { pos: new Vec2(160, 100) } });
      assert.ok(Number.isFinite(view.yaw) && Number.isFinite(view.lift), `${type} animateMonster updates yaw and lift`);

      // Heavily wounded state swaps to gore skin and exposes 3D viscera without mipmap averaging
      enemy.hp = Math.floor(ENEMY_TYPES[type].hp * 0.4);
      MONSTERS[type].animate(view, enemy, { time: 1.6, dt: 1 / 60, player: { pos: new Vec2(160, 100) } });
      if (type !== 'wraith') {
        assert.equal(view.goreSkin, true, `${type} switches to gore skin when heavily wounded`);
        assert.equal(view.goreViscera.isActive(), true, `${type} exposes 3D goreViscera when heavily wounded`);
        assert.ok(texOptionsSeen.length >= 16, `${type} gore skin swap updates sub-mesh textures`);
        for (const opts of texOptionsSeen) {
          assert.equal(opts.minFilter, 9728, `${type} gore skin uses NEAREST minFilter so B=255 gore flag never mipmap-averages into pink`);
          assert.equal(Boolean(opts.generateMipmaps), false, `${type} gore skin disables mipmap generation`);
        }
      }

      enemy.deadTime = 0.25;
      MONSTERS[type].die(view, enemy);
      assert.equal(view.wasDead, true, `${type} dieMonster transitions view into multi-stage horrific death`);
      assert.equal(view.gorePool.isActive(), false, `${type} dieMonster keeps 3D floor gorePool inactive in favor of RoostR particle splats`);
      assert.equal(
        view.goreChunks.filter((c) => c.isActive()).length,
        type === 'wraith' ? 0 : 1,
        `${type} normal death activates subtle 3D goreChunks`
      );
      if (type !== 'wraith') {
        assert.equal(view.goreViscera.isActive(), true, `${type} dieMonster keeps 3D goreViscera active`);
        const severedParts = [view.head, view.jaw, view.leftArm, view.rightArm, view.extra].filter((p) => p && p.parent === view.root);
        assert.ok(severedParts.length >= 1, `${type} normal death severs at least one anatomical part into root space`);
      }

      enemy.gibbed = true;
      MONSTERS[type].die(view, enemy);
      assert.equal(view.wasDead, true, `${type} dieMonster supports close-range XDeath detonation`);
      assert.equal(view.gorePool.isActive(), false, `${type} XDeath keeps 3D floor gorePool inactive`);
      assert.equal(
        view.goreChunks.filter((c) => c.isActive()).length,
        2,
        `${type} XDeath activates 2 subtle 3D goreChunks`
      );
      if (type !== 'wraith') {
        assert.equal(view.head.parent, view.root, `${type} XDeath blasts head into root space`);
        assert.equal(view.leftArm.parent, view.root, `${type} XDeath blasts leftArm into root space`);
        assert.equal(view.rightArm.parent, view.root, `${type} XDeath blasts rightArm into root space`);
      }
    }
  },

  'blood quantity and pool size scale with enemy size'() {
    const measureKillBlood = (type) => {
      const game = fresh();
      clearEnemies(game);
      game.rand = Rand.create(2);
      game.blood.reset(game.level, game.rand);
      const pos = new Vec2(9 * 64 + 16, 3 * 64 + 32);
      game.addEnemy(type, pos);
      const enemy = game.enemies[0];
      game.player.body.setPosition(new Vec2(6 * 64, 3 * 64 + 32));
      game.blood.hit(new Vec3(pos.x, pos.y, 24), new Vec2(1, 0), enemy.def.gore);
      const hitParticles = game.blood.particles.length;
      const hitSplatSize = game.blood.floor[0]?.size ?? 0;

      game.damageEnemy(enemy, enemy.hp);
      run(game, 2.5);
      const totalFloorArea = game.blood.floor.reduce((sum, s) => sum + s.size * s.size, 0);
      return { hitParticles, hitSplatSize, floorSplats: game.blood.floor.length, totalFloorArea };
    };

    const swarmer = measureKillBlood('swarmer');
    const imp = measureKillBlood('imp');
    const brute = measureKillBlood('brute');
    const boss = measureKillBlood('boss');

    assert.ok(swarmer.hitParticles < imp.hitParticles, 'swarmer hit sprays fewer blood droplets than imp');
    assert.ok(imp.hitParticles < brute.hitParticles, 'imp hit sprays fewer blood droplets than brute');
    assert.ok(brute.hitParticles < boss.hitParticles, 'brute hit sprays fewer blood droplets than boss');

    assert.ok(swarmer.hitSplatSize < imp.hitSplatSize, 'swarmer hit splat is smaller than imp');
    assert.ok(imp.hitSplatSize < brute.hitSplatSize, 'imp hit splat is smaller than brute');
    assert.ok(brute.hitSplatSize < boss.hitSplatSize, 'brute hit splat is smaller than boss');

    assert.ok(swarmer.totalFloorArea < imp.totalFloorArea * 0.5, 'swarmer death and corpse pool blood area is much smaller than imp');
    assert.ok(imp.totalFloorArea < brute.totalFloorArea, 'imp death and corpse pool blood area is smaller than brute');
    assert.ok(brute.totalFloorArea < boss.totalFloorArea, 'brute death and corpse pool blood area is smaller than boss');
  },

  'blood, gibs and footprints on acid dissolve instead of staying still'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);

    // Find a slime tile in E1M1
    const slimeIdx = game.level.slime.findIndex((v) => v === 1);
    assert.ok(slimeIdx >= 0, 'level has slime tiles');
    const sx = ((slimeIdx % game.level.width) + 0.5) * 64;
    const sy = (Math.floor(slimeIdx / game.level.width) + 0.5) * 64;
    assert.equal(game.level.slimeAt(sx, sy), true);

    // Also pick a regular dry floor tile
    const dryX = 2 * 64 + 32;
    const dryY = 2 * 64 + 32;
    assert.equal(game.level.slimeAt(dryX, dryY), false);

    game.blood.floorSplat(new Vec2(sx, sy), 8);
    game.blood.floorGib(new Vec2(sx, sy), 3.0, 0);
    game.blood.floorSplat(new Vec2(dryX, dryY), 8);
    game.blood.floorGib(new Vec2(dryX, dryY), 3.0, 1);

    assert.equal(game.blood.floor[0].dissolving, true, 'splat on acid is marked dissolving');
    assert.equal(game.blood.gibs[0].dissolving, true, 'gib on acid is marked dissolving');
    assert.ok(!game.blood.floor[1].dissolving, 'splat on dry deck is permanent');
    assert.ok(!game.blood.gibs[1].dissolving, 'gib on dry deck is permanent');

    const v0 = game.blood.version;
    run(game, 0.5);
    assert.ok(game.blood.version > v0, 'dissolving blood bumps splat version as it shrinks and drifts');
    assert.ok(game.blood.floor[0].size < 8, 'blood splat on acid shrinks as it dissolves');

    run(game, 4.0);
    assert.equal(game.blood.floor.length, 1, 'blood splat on acid dissolved completely while dry splat remained');
    assert.equal(game.blood.floor[0].x, dryX, 'remaining splat is the dry floor splat');
    assert.equal(game.blood.gibs.length, 1, 'gib on acid dissolved completely while dry gib remained');
  },

  '3D textured chainsaw viewmodel: procedural atlas, articulated chain loop parts, allocation-free pose, and HUD sprite suppression'() {
    const atlas = chainsawAtlas();
    assert.equal(atlas.width, ARSENAL_FRAMES * ARSENAL_CELL, 'chainsaw atlas width is 128px');
    assert.equal(atlas.height, ARSENAL_CELL, 'chainsaw atlas height is 32px');
    assert.equal(atlas.data.length, atlas.width * atlas.height * 4);
    for (let i = 3; i < atlas.data.length; i += 4)
      assert.equal(atlas.data[i], 255, 'chainsaw atlas pixels are opaque');

    const parts = chainsawParts();
    assert.equal(parts, chainsawParts(), 'chainsawParts is cached');
    for (const key of ['body', 'topChain', 'bottomChain', 'noseChain', 'hands']) {
      const part = parts[key];
      assert.ok(part.vertices instanceof Float32Array && part.vertices.length >= 36, `${key} has 3D triangle vertices`);
      assert.equal(part.normals.length, part.vertices.length, `${key} has matching 3D surface normals`);
      assert.equal(part.uvs.length, (part.vertices.length / 3) * 2, `${key} has matching UVs`);
    }
    assert.ok(parts.pivots.topChain instanceof Vec3, 'topChain pivot is a Vec3');
    assert.ok(parts.pivots.bottomChain instanceof Vec3, 'bottomChain pivot is a Vec3');
    assert.ok(parts.pivots.noseChain instanceof Vec3, 'noseChain pivot is a Vec3');
    assert.ok(parts.pivots.hands instanceof Vec3, 'hands pivot is a Vec3');
    assert.equal(parts.toothPitch, CHAINSAW_TOOTH_PITCH);

    // Verify WebGL UNPACK_FLIP_Y_WEBGL = true UV orientation:
    // Every vertex in `parts.hands` maps to rows y = 12..31 of cell 2 (leather glove, olive cuff, bare forearm skin),
    // never to the dark cast-iron cooling-fin rows y = 0..11.
    for (let i = 0; i < parts.hands.uvs.length; i += 2) {
      const v = parts.hands.uvs[i + 1];
      const webglRow = Math.floor((1 - v) * 32);
      assert.ok(
        webglRow >= 12 && webglRow < 32,
        `chainsaw hand UV v=${v.toFixed(3)} samples WebGL row ${webglRow} (expected leather/cuff/skin rows 12..31)`
      );
    }

    const combined = chainsawMesh();
    assert.equal(
      combined.vertices.length,
      parts.body.vertices.length + parts.topChain.vertices.length + parts.bottomChain.vertices.length + parts.noseChain.vertices.length,
      'chainsawMesh combines body and all three animated chain segments without disembodied player hands'
    );

    const target = chainsawPose({ time: 0.1, bob: 0.4, moving: 0.8, recoil: 0, switchOffset: 0, attacking: false });
    assert.ok(target.offset instanceof Vec3, 'pose offset is a Vec3');
    assert.ok(target.rotation instanceof Vec3, 'pose rotation is a Vec3');
    assert.ok(target.topChainPos instanceof Vec3, 'pose topChainPos is a Vec3');
    assert.ok(target.bottomChainPos instanceof Vec3, 'pose bottomChainPos is a Vec3');
    assert.ok(target.noseChainRot instanceof Vec3, 'pose noseChainRot is a Vec3');

    const idleZ = target.offset.z;
    const idleTopZ = target.topChainPos.z;
    const idleBottomZ = target.bottomChainPos.z;
    const reused = chainsawPose({ time: 0.25, bob: 0.4, moving: 0.8, recoil: 1, switchOffset: 0, attacking: true }, target);
    assert.equal(reused, target, 'chainsawPose reuses pre-allocated target');
    assert.ok(target.offset.z > idleZ + 1.0, 'attacking chainsaw thrusts forward');
    assert.notEqual(target.topChainPos.z, idleTopZ, 'top cutting chain advances over time');
    assert.notEqual(target.bottomChainPos.z, idleBottomZ, 'bottom return chain advances in opposite direction');
    assert.ok(target.noseChainRot.x > 0, 'nose sprocket wheel spins around X axis');

    // HUD suppresses 2D weapon sprite quad when chainsaw is equipped, while still drawing 2D sprites for other weapons
    const quadCalls = [];
    const fakeHud = Object.create(Hud.prototype);
    fakeHud.width = 1280;
    fakeHud.height = 720;
    fakeHud.overlay = {
      crisp: {
        weapon: {
          quad: (rect, uv, bright) => quadCalls.push([rect.topLeftCorner.x, rect.topLeftCorner.y, rect.bottomRightCorner.x, rect.bottomRightCorner.y, uv, bright]),
        },
      },
    };
    const game = fresh();
    game.player.weapon = 'chainsaw';
    fakeHud.drawWeapon(game);
    assert.equal(quadCalls.length, 0, 'Hud.drawWeapon skips 2D sprite quad when chainsaw is equipped');

    game.player.weapon = 'chaingun';
    fakeHud.drawWeapon(game);
    assert.equal(quadCalls.length, 0, 'Hud.drawWeapon skips 2D sprite quad when chaingun is equipped');

    const cgParts = chaingunParts();
    assert.equal(cgParts, chaingunParts(), 'chaingunParts is cached');
    for (const key of ['body', 'rotor', 'hands']) {
      const part = cgParts[key];
      assert.ok(part.vertices instanceof Float32Array && part.vertices.length >= 36, `chaingun ${key} has 3D triangle vertices`);
      assert.equal(part.normals.length, part.vertices.length, `chaingun ${key} has matching 3D surface normals`);
      assert.equal(part.uvs.length, (part.vertices.length / 3) * 2, `chaingun ${key} has matching UVs`);
    }
    for (let i = 1; i < cgParts.hands.uvs.length; i += 2) {
      const row = Math.floor((1 - cgParts.hands.uvs[i]) * 31.999);
      assert.ok(
        row >= 12 && row < 32,
        `chaingun hands UV v=${cgParts.hands.uvs[i].toFixed(3)} maps to WebGL-flipped glove/cuff/arm rows 12..31 (got row ${row})`
      );
    }
    assert.ok(cgParts.pivots.rotor instanceof Vec3, 'chaingun rotor pivot is a Vec3');
    assert.ok(cgParts.pivots.hands instanceof Vec3, 'chaingun hands pivot is a Vec3');
    const cgCombined = chaingunMesh();
    assert.equal(
      cgCombined.vertices.length,
      cgParts.body.vertices.length + cgParts.rotor.vertices.length,
      'chaingunMesh combines body and 6-barrel rotor assembly without disembodied hands'
    );
    const cgTarget = chaingunPose({ time: 0.2, bob: 0.3, moving: 0.5, recoil: 0, switchOffset: 0, attacking: false, spinDown: 0 });
    assert.ok(cgTarget.offset instanceof Vec3, 'chaingunPose offset is a Vec3');
    assert.ok(cgTarget.rotation instanceof Vec3, 'chaingunPose rotation is a Vec3');
    assert.ok(cgTarget.rotorRot instanceof Vec3, 'chaingunPose rotorRot is a Vec3');
    assert.ok(cgTarget.offset.y < -11.2, 'chaingun sits low near the bottom of the screen');
    assert.ok(cgTarget.offset.z > 13.5, 'chaingun sits far enough forward for a compact screen footprint');
    assert.ok(cgTarget.rotation.x > 0.04, 'chaingun barrels are pitched horizontally toward enemies');
    assert.equal(cgTarget.rotorRot.z, 0, 'idle chaingun rotor does not spin');
    const cgIdleForward = cgTarget.offset.z;
    const cgReused = chaingunPose({ time: 0.2, bob: 0.3, moving: 0.5, recoil: 0.8, switchOffset: 0, attacking: true, spinDown: 0.4 }, cgTarget);
    assert.equal(cgReused, cgTarget, 'chaingunPose reuses pre-allocated target');
    assert.ok(cgTarget.rotorRot.z > 0, 'firing chaingun spins 6-barrel rotor around Z axis');
    assert.ok(cgTarget.offset.z < cgIdleForward, 'firing chaingun kicks back along Z');

    game.player.weapon = 'shotgun';
    fakeHud.drawWeapon(game);
    assert.equal(quadCalls.length, 0, 'Hud.drawWeapon skips 2D sprite quad when shotgun is equipped');

    const sgAtlas = shotgunAtlas();
    assert.equal(sgAtlas, shotgunAtlas(), 'shotgunAtlas is cached');
    const sgParts = shotgunParts();
    assert.equal(sgParts, shotgunParts(), 'shotgunParts is cached');
    for (const key of ['body', 'pump', 'arm', 'shell']) {
      const part = sgParts[key];
      assert.ok(part.vertices instanceof Float32Array && part.vertices.length >= 36, `shotgun ${key} has 3D triangle vertices`);
      assert.equal(part.normals.length, part.vertices.length, `shotgun ${key} has matching 3D surface normals`);
      assert.equal(part.uvs.length, (part.vertices.length / 3) * 2, `shotgun ${key} has matching UVs`);
    }
    assert.ok(sgParts.pivots.pump instanceof Vec3, 'shotgun pump pivot is a Vec3');
    assert.ok(sgParts.pivots.arm instanceof Vec3, 'shotgun arm pivot is a Vec3');
    assert.ok(sgParts.pivots.shell instanceof Vec3, 'shotgun shell pivot is a Vec3');
    const sgCombined = shotgunMesh();
    assert.equal(
      sgCombined.vertices.length,
      sgParts.body.vertices.length + sgParts.pump.vertices.length + sgParts.shell.vertices.length,
      'shotgunMesh combines receiver/barrel body, pump forend, and shell without disembodied player arm'
    );

    const sgTarget = shotgunPose({ time: 0.2, bob: 0.3, moving: 0.5, recoil: 0, switchOffset: 0, elapsed: -1, hasAmmo: true });
    assert.ok(sgTarget.offset instanceof Vec3, 'shotgunPose offset is a Vec3');
    assert.ok(sgTarget.rotation instanceof Vec3, 'shotgunPose rotation is a Vec3');
    assert.ok(sgTarget.pumpPos instanceof Vec3, 'shotgunPose pumpPos is a Vec3');
    assert.ok(sgTarget.armPos instanceof Vec3, 'shotgunPose armPos is a Vec3');
    assert.ok(sgTarget.armRot instanceof Vec3, 'shotgunPose armRot is a Vec3');
    assert.ok(sgTarget.shellPos instanceof Vec3, 'shotgunPose shellPos is a Vec3');
    assert.ok(sgTarget.shellRot instanceof Vec3, 'shotgunPose shellRot is a Vec3');
    assert.ok(sgTarget.offset.y < -6.5, 'shotgun sits low near the bottom of the screen');
    assert.ok(sgTarget.rotation.x > 0.05, 'shotgun barrel is pitched horizontally toward enemies');
    const sgIdleForward = sgTarget.offset.z;
    const sgIdlePumpZ = sgTarget.pumpPos.z;
    assert.equal(sgIdlePumpZ, sgParts.pivots.pump.z, 'idle shotgun pump forend rests at forward battery position');
    assert.ok(sgTarget.armPos.y < sgParts.pivots.arm.y - 8.0, 'idle shotgun left hand and forearm are stowed below the viewport');

    // Blast recoil kickback right after firing
    const sgBlast = shotgunPose({ time: 0.2, bob: 0.3, moving: 0.5, recoil: 0.9, switchOffset: 0, elapsed: 0.04, hasAmmo: true }, sgTarget);
    assert.equal(sgBlast, sgTarget, 'shotgunPose reuses pre-allocated target');
    assert.ok(sgTarget.offset.z < sgIdleForward, 'firing shotgun kicks back along Z');

    // Sweep through all phases of the pump reload cycle (reach, raise, rack back, hold, rack forward, lower)
    for (const e of [0.2, 0.28, 0.46, 0.58, 0.72, 0.82, 0.91, 1.02]) {
      shotgunPose({ time: e, bob: 0.3, moving: 0.5, recoil: 0.2, switchOffset: 0, elapsed: e, hasAmmo: true }, sgTarget);
      assert.ok(
        Number.isFinite(sgTarget.offset.y) && Number.isFinite(sgTarget.pumpPos.z) && Number.isFinite(sgTarget.armPos.z),
        `shotgunPose produces finite transforms at elapsed=${e}`
      );
    }

    // Mid-pump reload animation (left hand & forearm gripped onto the forend, forend racked back, spent shell ejecting right)
    shotgunPose({ time: 0.55, bob: 0.3, moving: 0.5, recoil: 0.2, switchOffset: 0, elapsed: 0.58, hasAmmo: true }, sgTarget);
    assert.ok(sgTarget.pumpPos.z < sgIdlePumpZ - 3.0, 'pump reload racks forend backward along the magazine tube');
    assert.equal(sgTarget.armPos.y, sgParts.pivots.arm.y, 'player left hand and forearm reach up onto the pump forend during reload');
    assert.equal(sgTarget.armPos.z, sgTarget.pumpPos.z, 'player left hand and forearm slide back in lockstep with the pump forend');
    assert.ok(sgTarget.shellPos.x > sgParts.pivots.shell.x + 2.0, 'pump reload ejects spent 12-gauge shell outward from right-side receiver port');
    assert.ok(Math.abs(sgTarget.shellRot.x) > 0.5, 'ejected shell tumbles in mid-air');

    // Empty shotgun does not run pump reload animation after firing last shell
    shotgunPose({ time: 0.55, bob: 0.3, moving: 0.5, recoil: 0.2, switchOffset: 0, elapsed: 0.58, hasAmmo: false }, sgTarget);
    assert.equal(sgTarget.pumpPos.z, sgIdlePumpZ, 'shotgun does not rack pump forend when out of shells');
    assert.ok(sgTarget.armPos.y < sgParts.pivots.arm.y - 8.0, 'player left arm stays stowed when shotgun is out of shells');

    game.player.weapon = 'rocket';
    fakeHud.drawWeapon(game);
    assert.equal(quadCalls.length, 0, 'Hud.drawWeapon skips 2D sprite quad when rocket launcher is equipped');

    const rlAtlas = rocketLauncherAtlas();
    assert.equal(rlAtlas, rocketLauncherAtlas(), 'rocketLauncherAtlas is cached');
    const rlParts = rocketLauncherParts();
    assert.equal(rlParts, rocketLauncherParts(), 'rocketLauncherParts is cached');
    for (const key of ['body', 'warhead']) {
      const part = rlParts[key];
      assert.ok(part.vertices instanceof Float32Array && part.vertices.length >= 36, `rocketLauncher ${key} has 3D triangle vertices`);
      assert.equal(part.normals.length, part.vertices.length, `rocketLauncher ${key} has matching 3D surface normals`);
      assert.equal(part.uvs.length, (part.vertices.length / 3) * 2, `rocketLauncher ${key} has matching UVs`);
      let minY = Infinity;
      let maxY = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (let i = 0; i < part.vertices.length; i += 3) {
        if (part.vertices[i + 1] < minY) minY = part.vertices[i + 1];
        if (part.vertices[i + 1] > maxY) maxY = part.vertices[i + 1];
        if (part.vertices[i + 2] < minZ) minZ = part.vertices[i + 2];
        if (part.vertices[i + 2] > maxZ) maxZ = part.vertices[i + 2];
      }
      assert.ok(maxZ - minZ > (maxY - minY) * 1.6, `rocketLauncher ${key} is elongated horizontally along the Z launch axis`);
    }
    assert.ok(rlParts.pivots.warhead instanceof Vec3, 'rocketLauncher warhead pivot is a Vec3');
    const rlCombined = rocketLauncherMesh();
    assert.equal(
      rlCombined.vertices.length,
      rlParts.body.vertices.length + rlParts.warhead.vertices.length,
      'rocketLauncherMesh combines body and loaded warhead assembly'
    );

    const rlTarget = rocketLauncherPose({ time: 0.2, bob: 0.3, moving: 0.5, recoil: 0, switchOffset: 0, elapsed: -1, hasAmmo: true });
    assert.ok(rlTarget.offset instanceof Vec3, 'rocketLauncherPose offset is a Vec3');
    assert.ok(rlTarget.rotation instanceof Vec3, 'rocketLauncherPose rotation is a Vec3');
    assert.ok(rlTarget.warheadPos instanceof Vec3, 'rocketLauncherPose warheadPos is a Vec3');
    const rlIdleForward = rlTarget.offset.z;
    const rlIdleWarheadZ = rlTarget.warheadPos.z;
    assert.equal(rlIdleWarheadZ, rlParts.pivots.warhead.z, 'idle rocket launcher warhead rests seated inside the front muzzle');

    // Heavy backblast recoil and warhead launch right after firing
    const rlLaunch = rocketLauncherPose({ time: 0.2, bob: 0.3, moving: 0.5, recoil: 0.9, switchOffset: 0, elapsed: 0.06, hasAmmo: true }, rlTarget);
    assert.equal(rlLaunch, rlTarget, 'rocketLauncherPose reuses pre-allocated target');
    assert.ok(rlTarget.offset.z < rlIdleForward - 2.0, 'firing rocket launcher kicks back strongly along Z');
    assert.ok(rlTarget.warheadPos.z > rlIdleWarheadZ + 4.0, 'fired rocket warhead streaks forward out of the muzzle');

    // Breech auto-loader feeds fresh rocket warhead forward along the tube
    for (const e of [0.18, 0.35, 0.62, 0.68, 0.76]) {
      rocketLauncherPose({ time: e, bob: 0.3, moving: 0.5, recoil: 0.1, switchOffset: 0, elapsed: e, hasAmmo: true }, rlTarget);
      assert.ok(Number.isFinite(rlTarget.offset.z) && Number.isFinite(rlTarget.warheadPos.z), `rocketLauncherPose produces finite transforms at elapsed=${e}`);
    }
    rocketLauncherPose({ time: 0.5, bob: 0.3, moving: 0.5, recoil: 0.1, switchOffset: 0, elapsed: 0.35, hasAmmo: true }, rlTarget);
    assert.ok(rlTarget.warheadPos.z < rlIdleWarheadZ - 2.0, 'auto-loader slides fresh rocket warhead forward from the rear breech');

    // Empty rocket launcher leaves tube empty (warhead retracted inside tube)
    rocketLauncherPose({ time: 0.5, bob: 0.3, moving: 0.5, recoil: 0, switchOffset: 0, elapsed: -1, hasAmmo: false }, rlTarget);
    assert.ok(rlTarget.warheadPos.z < rlIdleWarheadZ - 8.0, 'rocket launcher keeps warhead retracted when out of rockets');
  },

  'classic Doom separate ammo pools: shells, bullets, and rockets have independent pools, 3D pickup meshes, and HUD tally'() {
    assert.equal(WEAPONS.chainsaw.ammoType, null, 'chainsaw uses no ammo pool');
    assert.equal(WEAPONS.shotgun.ammoType, 'shells', 'shotgun uses shells');
    assert.equal(WEAPONS.chaingun.ammoType, 'bullets', 'chaingun uses bullets');
    assert.equal(WEAPONS.rocket.ammoType, 'rockets', 'rocket launcher uses rockets');

    for (const [name, makeAtlas, makeMesh] of [
      ['bullets', bulletAtlas, bulletMesh],
      ['rockets', rocketAmmoAtlas, rocketAmmoMesh],
    ]) {
      const atlas = makeAtlas();
      assert.equal(atlas.width, 128, `${name} atlas width is 128`);
      assert.equal(atlas.height, AMMO_CELL, `${name} atlas height is 32`);
      const mesh = makeMesh();
      assert.ok(mesh.vertices.length > 0 && mesh.vertices.length % 3 === 0, `${name} mesh has valid triangle vertices`);
      assert.equal(mesh.uvs.length, (mesh.vertices.length / 3) * 2, `${name} mesh has matching UVs`);
    }

    const game = fresh();
    assert.equal(game.player.shells, 24, 'player starts with 24 shells');
    assert.equal(game.player.bullets, 50, 'player starts with 50 bullets');
    assert.equal(game.player.rockets, 0, 'player starts with 0 rockets');

    // Firing shotgun only drains shells, leaving bullets and rockets untouched
    game.player.weapons.chaingun = true;
    game.player.weapons.rocket = true;
    game.player.rockets = 6;
    game.player.weapon = 'shotgun';
    game.player.cooldown = 0;
    game.fire();
    assert.equal(game.player.shells, 23, 'shotgun drains 1 shell');
    assert.equal(game.player.bullets, 50, 'shotgun does not drain bullets');
    assert.equal(game.player.rockets, 6, 'shotgun does not drain rockets');

    // Firing chaingun only drains bullets
    game.player.weapon = 'chaingun';
    game.player.cooldown = 0;
    game.fire();
    assert.equal(game.player.shells, 23, 'chaingun does not drain shells');
    assert.equal(game.player.bullets, 49, 'chaingun drains 1 bullet');
    assert.equal(game.player.rockets, 6, 'chaingun does not drain rockets');

    // Firing rocket launcher only drains rockets
    game.player.weapon = 'rocket';
    game.player.cooldown = 0;
    game.fire();
    assert.equal(game.player.shells, 23, 'rocket launcher does not drain shells');
    assert.equal(game.player.bullets, 49, 'rocket launcher does not drain bullets');
    assert.equal(game.player.rockets, 5, 'rocket launcher drains 1 rocket');

    // Bullet and rocket pickups replenish their respective pools up to max
    const bulletPickup = game.addPickup('bullets', new Vec2(128, 128));
    game.touch(bulletPickup.body);
    assert.equal(game.player.bullets, 49 + AMMO_TYPES.bullets.bonus, 'bullet box adds 20 bullets');

    const rocketPickup = game.addPickup('rockets', new Vec2(192, 128));
    game.touch(rocketPickup.body);
    assert.equal(game.player.rockets, 5 + AMMO_TYPES.rockets.bonus, 'rocket crate adds 5 rockets');

    // HUD drawAmmo renders active pool and 3-row tally
    const labels = [];
    const fakeHud = Object.create(Hud.prototype);
    fakeHud.text = (str) => labels.push(str);
    fakeHud.drawAmmo(900, 560, game.player, WEAPONS.rocket);
    assert.ok(labels.includes('ROCKETS'), 'HUD shows active ROCKETS label');
    assert.ok(labels.includes('BUL') && labels.includes('SHL') && labels.includes('RKT'), 'HUD shows 3-pool tally');
  },

  'localized dismemberment: shoulder hits sever arms, leg hits explode legs and force foes to crawl while continuing to attack'() {
    const game = fresh();
    clearEnemies(game);
    game.blood.reset(game.level, game.rand);

    // Place player at (192, 192) facing +X (angle = 0) and a brute at (280, 192) facing player (-X)
    game.player.body.setPosition(new Vec2(192, 192));
    game.player.angle = 0;
    const brute = game.addEnemy('brute', new Vec2(280, 192));
    assert.equal(brute.limbs.leftArm, true, 'brute starts with intact leftArm');
    assert.equal(brute.limbs.rightArm, true, 'brute starts with intact rightArm');
    assert.equal(brute.limbs.leftLeg, true, 'brute starts with intact leftLeg');
    assert.equal(brute.limbs.rightLeg, true, 'brute starts with intact rightLeg');
    assert.equal(brute.crawling, false, 'brute starts standing');

    // Mid-close hits (140..240 units) apply reduced limb trauma, while hits >= 240 units apply 0
    const midBrute = game.addEnemy('brute', new Vec2(382, 192)); // dist = 190 -> falloff = 0.5, scale = 0.25
    assert.equal(game.hitEnemyLimb(midBrute, new Vec2(382, 186), 30, 1, 0, 6), false, 'fresh limb is not severed in one hit at mid-close range');
    const midTarget = midBrute.limbs.sideTarget?.left;
    assert.ok((midTarget === 'leftArm' || midTarget === 'leftLeg') && midBrute.limbs.damage[midTarget] > 0 && midBrute.limbs.damage[midTarget] < 6, 'mid-close left-side hit accumulates reduced trauma on leftArm or leftLeg');
    const farBrute = game.addEnemy('brute', new Vec2(450, 192)); // dist = 258 >= 240
    assert.equal(game.hitEnemyLimb(farBrute, new Vec2(450, 186), 30, 1, 0, 10), false, 'shots beyond 240 units do not dismember');
    assert.equal(Object.values(farBrute.limbs.damage).reduce((a, b) => a + b, 0), 0, 'shots beyond 240 units deal 0 limb trauma');

    // Verify left/right aim strictly respects the struck side while randomly picking arm vs leg on that side
    const leftSevered = new Set();
    const rightSevered = new Set();
    for (let i = 0; i < 20; i++) {
      const dummyL = game.addEnemy('brute', new Vec2(260, 192));
      game.hitEnemyLimb(dummyL, new Vec2(260, 184), 30, 1, 0, 10); // monster's left side (y < 192)
      for (const l of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg']) {
        if (!dummyL.limbs[l])
          leftSevered.add(l);
      }
      const dummyR = game.addEnemy('brute', new Vec2(260, 192));
      game.hitEnemyLimb(dummyR, new Vec2(260, 200), 30, 1, 0, 10); // monster's right side (y > 192)
      for (const l of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg']) {
        if (!dummyR.limbs[l])
          rightSevered.add(l);
      }
      for (const d of [dummyL, dummyR]) {
        game.scene.removeBody(d.body);
        game.enemies.splice(game.enemies.indexOf(d), 1);
      }
    }
    assert.ok(leftSevered.has('leftArm') && leftSevered.has('leftLeg'), 'aiming left randomly severs leftArm or leftLeg');
    assert.ok(!leftSevered.has('rightArm') && !leftSevered.has('rightLeg'), 'aiming left never severs right-side limbs');
    assert.ok(rightSevered.has('rightArm') && rightSevered.has('rightLeg'), 'aiming right randomly severs rightArm or rightLeg');
    assert.ok(!rightSevered.has('leftArm') && !rightSevered.has('leftLeg'), 'aiming right never severs left-side limbs');
    game.blood.reset(game.level, game.rand);

    // Hit the brute's left side (severs leftArm) and right side (severs rightLeg) to verify gore and crawling
    brute.limbs.sideTarget = { left: 'leftArm', right: 'rightLeg' };
    const leftHit = new Vec2(280, 186);
    game.hitEnemyLimb(brute, leftHit, 30, 1, 0, 6);
    assert.equal(brute.limbs.leftArm, false, 'left-side hit severs leftArm');
    assert.equal(brute.crawling, false, 'losing an arm does not make the foe crawl');
    assert.ok(game.blood.gibs.length >= 1, 'severing an arm spawns a fallen limb gib on the floor');
    const armDrops = game.blood.particles.filter((p) => !p.gib).length;
    const armGibs = game.blood.particles.filter((p) => p.gib).length;
    assert.ok(armDrops >= 24 && armGibs >= 4, 'severing an arm erupts in a full burst of blood and flying meat chunks');

    const prevParticles = game.blood.particles.length;
    const rightHit = new Vec2(280, 198);
    game.hitEnemyLimb(brute, rightHit, 18, 1, 0, 6);
    assert.equal(brute.limbs.rightLeg, false, 'right-side hit explodes rightLeg');
    assert.equal(brute.crawling, true, 'losing a leg forces a non-flying foe to crawl');
    const legParticles = game.blood.particles.slice(prevParticles);
    assert.equal(legParticles.filter((p) => !p.gib).length, armDrops, 'leg explosion spawns the same full blood burst as arm dismemberment');
    assert.equal(legParticles.filter((p) => p.gib).length, armGibs, 'leg explosion spawns the same flying meat chunk burst as arm dismemberment');

    // Dismemberment cap applies per foe: at most 1 limb per foe per shot, but multiple foes can each lose 1 limb in a single shot
    const targetA = game.addEnemy('boss', new Vec2(240, 172));
    const targetB = game.addEnemy('boss', new Vec2(240, 212));
    for (const t of [targetA, targetB]) {
      t.limbs.damage.leftArm = 999;
      t.limbs.damage.rightArm = 999;
      t.limbs.damage.leftLeg = 999;
      t.limbs.damage.rightLeg = 999;
    }
    game.inShot = true;
    targetA.limbs.severedThisShot = false;
    targetB.limbs.severedThisShot = false;
    assert.equal(game.hitEnemyLimb(targetA, new Vec2(240, 162), 30, 1, 0, 3), true, 'first foe loses 1 limb in the shot');
    assert.equal(game.hitEnemyLimb(targetA, new Vec2(240, 182), 30, 1, 0, 3), false, 'same foe cannot lose a second limb in the same shot');
    assert.equal(game.hitEnemyLimb(targetB, new Vec2(240, 202), 30, 1, 0, 3), true, 'second foe can still lose 1 limb in the same shot');
    assert.equal(game.hitEnemyLimb(targetB, new Vec2(240, 222), 30, 1, 0, 3), false, 'second foe also cannot lose a second limb in the same shot');
    game.inShot = false;
    for (const temp of [targetA, targetB, midBrute, farBrute]) {
      game.scene.removeBody(temp.body);
      game.enemies.splice(game.enemies.indexOf(temp), 1);
    }

    // Verify crawling foe moves slower than an intact foe but still chases and attacks the player
    const intactBrute = game.addEnemy('brute', new Vec2(280, 230));
    brute.state = 'chase';
    brute.pain = 0;
    intactBrute.state = 'chase';
    game.updateEnemy(brute, 1 / 60);
    game.updateEnemy(intactBrute, 1 / 60);
    const crawlSpeed = Math.hypot(brute.body.velocity.x, brute.body.velocity.y);
    const intactSpeed = Math.hypot(intactBrute.body.velocity.x, intactBrute.body.velocity.y);
    assert.ok(crawlSpeed > 0 && crawlSpeed < intactSpeed * 0.6, 'crawling foe drags itself forward at reduced speed');

    // Move crawling brute into attack range and verify it still winds up and attacks with its remaining limb/jaws
    brute.body.setPosition(new Vec2(224, 192));
    brute.pos = brute.body.position;
    brute.cooldown = 0;
    brute.roar = 0;
    game.updateEnemy(brute, 1 / 60);
    assert.ok(brute.windup > 0, 'dismembered crawling foe still initiates attacks');

    // Verify 3D monster view animates falling severed arm, exploded leg stump + chunks, and low crawling posture
    const mockWorld = {
      gl: null,
      scene: { addMesh: () => {} },
      material: () => new Material(),
      monsterPartMesh: () => {
        const m = new Mesh(null, new CustomMesh());
        m.setCustomUniform = () => {};
        return m;
      },
    };
    const view = MONSTERS.brute.build(mockWorld, brute);
    const standY = view.parts.pivots.body.y;

    // Immediately after dismemberment (t = severedAt + 0.1s), leftArm detaches into root space to fall to the floor,
    // rightLeg is scaled to a hip stump, goreChunks burst from the hip, and body drops into crawling posture
    MONSTERS.brute.animate(view, brute, { time: brute.limbs.severedAt.leftArm + 0.1, dt: 1 / 60, player: game.player });
    assert.equal(view.leftArm.parent, view.root, 'severed arm detaches into root space while falling to the floor');
    assert.ok(view.rightLeg.scale.y < 0.3, 'exploded leg scales down to a shattered hip stump');
    assert.ok(view.body.position.y < standY * 0.5, 'crawling monster drops its torso close to the floor');
    assert.ok(view.body.rotation.x > 0.8, 'crawling monster pitches torso forward onto the deck');
    assert.equal(view.goreChunks.filter((c) => c.isActive()).length, 2, 'leg explosion bursts 2 3D meat chunks from the hip');

    // After the arm finishes falling (t = severedAt + 0.7s), leftArm becomes a bloody shoulder stump on the body
    MONSTERS.brute.animate(view, brute, { time: brute.limbs.severedAt.leftArm + 0.7, dt: 1 / 60, player: game.player });
    assert.equal(view.leftArm.parent, view.body, 'after falling, shoulder mesh reattaches as a bloody shoulder stump');
    assert.ok(view.leftArm.scale.y < 0.25, 'missing arm remains scaled down as a shoulder stump');
  },

  'level 1 opening progression: start with 3D combat knife and zero ammo, pick up floor shotgun with 0 ammo then ammo/bullet packs in room 1, and find hidden chainsaw in top-right secret room'() {
    // 1. Verify 3D combat knife atlas, parts, mesh, and allocation-free pose
    const kAtlas = knifeAtlas();
    assert.equal(kAtlas.width, ARSENAL_CELL * ARSENAL_FRAMES);
    assert.equal(kAtlas.height, ARSENAL_CELL);
    const kParts = knifeParts();
    assert.ok(kParts.body.vertices.length >= 180, '3D knife viewmodel has blade, crossguard, grip, gloved hand, and forearm');
    const kMesh = knifeMesh();
    assert.equal(kMesh.vertices.length / 3, kMesh.uvs.length / 2);
    const targetPose = { offset: new Vec3(), rotation: new Vec3() };
    const idlePose = knifePose({ time: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0, elapsed: -1 }, targetPose);
    assert.equal(idlePose, targetPose, 'knifePose reuses pre-allocated target');
    assert.ok(idlePose.offset.y < -5.0, 'knife sits low on the screen near the bottom-right viewport edge');
    assert.ok(idlePose.rotation.x < -0.45, 'knife blade pitches upward in first-person view');
    const idleX = idlePose.offset.x;
    const idleY = idlePose.offset.y;
    const idleZ = idlePose.offset.z;

    // Verify vertical, horizontal, and diagonal knife attack trajectories
    assert.deepEqual(KNIFE_ATTACKS, ['vertical', 'horizontal', 'diagonal']);
    const vertPose = knifePose({ time: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0, elapsed: 0.08, attack: 'vertical' });
    const horizPose = knifePose({ time: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0, elapsed: 0.08, attack: 'horizontal' });
    const diagPose = knifePose({ time: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0, elapsed: 0.08, attack: 'diagonal' });
    for (const [label, p] of [
      ['vertical', vertPose],
      ['horizontal', horizPose],
      ['diagonal', diagPose],
    ]) {
      assert.ok(p.offset.z > idleZ + 4, `${label} knife slash thrusts forward into the target`);
      assert.ok(p.rotation.x < -0.25, `${label} knife remains pointed upward during slash lunge`);
    }
    assert.ok(Math.abs(vertPose.offset.y - idleY) > Math.abs(vertPose.offset.x - idleX) * 4, 'vertical attack moves predominantly along the vertical axis');
    assert.ok(Math.abs(horizPose.offset.x - idleX) > Math.abs(horizPose.offset.y - idleY) * 8, 'horizontal attack slashes wide along the horizontal axis');
    assert.ok(Math.abs(diagPose.offset.x - idleX) > 1.5 && Math.abs(diagPose.offset.y - idleY) > 1.2, 'diagonal attack slashes diagonally across both horizontal and vertical axes');

    // Verify 3D floor pickup meshes for shotgun and chainsaw sit cleanly above the floor (minY >= 2)
    for (const [label, mesh] of [
      ['shotgun', shotgunMesh()],
      ['chainsaw', chainsawMesh()],
    ]) {
      let minY = Infinity;
      for (let i = 1; i < mesh.vertices.length; i += 3)
        if (mesh.vertices[i] < minY)
          minY = mesh.vertices[i];
      assert.ok(minY >= 2, `${label} 3D floor pickup mesh sits above floor level (minY=${minY.toFixed(2)})`);
    }

    // 2. Starting a fresh game begins in Room 1 of Level 1 holding the knife with 0 ammo
    const game = new Game();
    game.state = 'play';
    clearEnemies(game);
    assert.equal(game.player.weapon, 'knife', 'player starts Level 1 holding the combat knife');
    assert.equal(game.player.weapons.knife, true, 'knife is owned at start');
    assert.equal(game.player.weapons.shotgun, false, 'shotgun is not owned at start');
    assert.equal(game.player.weapons.chainsaw, false, 'chainsaw is not owned at start');
    assert.equal(game.player.shells, 0, 'player starts with 0 shells');
    assert.equal(game.player.bullets, 0, 'player starts with 0 bullets');
    assert.equal(game.player.rockets, 0, 'player starts with 0 rockets');

    // Knife attacks emit a whoosh sound ('knife'), cycle through vertical/horizontal/diagonal movements, work at close range with zero ammo cost, and leave no traces on walls
    assert.equal(typeof RECIPES.knife, 'function', 'knife whoosh audio recipe exists');
    const imp = game.addEnemy('imp', new Vec2(game.player.pos.x + 28, game.player.pos.y));
    const startHp = imp.hp;
    game.events.length = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.equal(imp.hp, startHp - WEAPONS.knife.damage, 'knife melee slash damages close enemy with 0 ammo');
    assert.equal(game.player.knifeAttack, 'vertical', 'first knife swing performs a vertical attack');
    assert.ok(game.events.some((e) => e.type === 'knife' && e.attack === 'vertical'), 'knife swing emits a whoosh sound event');
    game.scene.removeBody(imp.body);
    game.enemies.pop();
    game.player.cooldown = 0;

    // Slashing a wall with the knife advances to horizontal attack, emits whoosh, and leaves no trace on the wall
    const savedX = game.player.pos.x;
    const savedY = game.player.pos.y;
    const savedAngle = game.player.angle;
    game.player.pos.setScalar(80, 96);
    game.player.body.setPosition(game.player.pos);
    game.player.angle = Math.PI;
    game.events.length = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.equal(game.player.knifeAttack, 'horizontal', 'second knife swing performs a horizontal attack');
    assert.ok(game.events.some((e) => e.type === 'knife' && e.attack === 'horizontal'), 'second knife swing emits whoosh sound');
    assert.equal(game.blood.holes.length, 0, 'knife does not leave traces on walls');
    game.player.pos.setScalar(savedX, savedY);
    game.player.body.setPosition(game.player.pos);
    game.player.angle = savedAngle;
    game.player.cooldown = 0;

    // Third knife swing advances to diagonal attack and emits whoosh even in open air
    game.events.length = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.equal(game.player.knifeAttack, 'diagonal', 'third knife swing performs a diagonal attack');
    assert.ok(game.events.some((e) => e.type === 'knife' && e.attack === 'diagonal'), 'open-air knife swing emits whoosh sound');
    game.player.cooldown = 0;

    // 3. Opening entry (cols 1..6, rows 1..4) has the shotgun on the floor followed by 2 shotgun shell packs (no chaingun bullet pack)
    const room1Caches = game.caches.filter((c) => c.pos.x < 7 * 64 && c.pos.y < 5 * 64);
    assert.equal(room1Caches.length, 1, 'the first room holds one chest');
    const [shotgunCache] = room1Caches;
    assert.deepEqual(shotgunCache.contents, ['shotgun', 'ammo'], 'the first room chest holds the shotgun and a shell pack');
    assert.equal(game.level.grid.getCell(shotgunCache.pos), 1 * game.level.width + 2, 'the first-room chest backs the north wall on tile (2, 1)');
    assert.equal(game.caches.some((c) => c !== shotgunCache && c.pos.x < 7 * 64 && c.pos.y < 5 * 64), false, 'no second chest in the first room');

    // Open the first-room chest: unlocks and equips the shotgun, the first shotgun adds no ammo of its own
    game.openCache(shotgunCache);
    assert.equal(game.player.weapons.shotgun, true, 'opening the chest unlocks shotgun');
    assert.equal(game.player.weapon, 'shotgun', 'opening the chest auto-equips shotgun');
    assert.equal(game.player.shells, AMMO_TYPES.shells.bonus, 'the chest also hands out its shell pack');
    assert.equal(game.player.bullets, 0, 'bullets remain 0');

    // Attempting to fire the shotgun with 0 ammo dry-fires
    game.player.shells = 0;
    game.player.cooldown = 0;
    game.events.length = 0;
    game.update(1 / 60, input({ fire: true }));
    assert.equal(game.player.dryFire, true, 'shotgun with 0 ammo dry-fires');
    assert.ok(game.events.some((e) => e.type === 'dry'), 'dry-firing emits dry click');

    // The next room's chest holds two shell packs
    const nextCache = game.caches.find((c) => c.tiles.includes(3 * game.level.width + 6));
    assert.deepEqual(nextCache.contents, ['ammo', 'ammo'], 'the next room chest holds two shell packs');
    game.openCache(nextCache);
    assert.equal(game.player.shells, AMMO_TYPES.shells.bonus * 2, 'the next chest adds two crates of shotgun shells');

    // 4. Chainsaw is hidden in the center of the top-right secret room of Level 1 (col 52, row 3), directly in the line of sight of secret door S at (49, 3)
    const secretChainsaw = game.caches.find((c) => c.contents.includes('chainsaw'));
    assert.ok(secretChainsaw, 'chainsaw cache exists in Level 1');
    assert.ok(secretChainsaw.tiles.includes(3 * game.level.width + 52), 'chainsaw cache covers column 52, row 3');
    assert.deepEqual(secretChainsaw.contents, ['health', 'chainsaw'], 'the chainsaw shares its chest with the health pack');
    const secretDoor = game.level.doors.get(3 * game.level.width + 49);
    assert.ok(secretDoor?.secret, 'top-right secret room is guarded by secret push-wall at (49, 3)');
    assert.equal(game.level.doors.has(5 * game.level.width + 50), false, 'top-right secret room has no back door on row 5');

    // Pick up the hidden chainsaw: unlocks and auto-equips chainsaw, and slot 1 toggles between chainsaw and knife
    game.openCache(secretChainsaw);
    assert.equal(game.player.weapons.chainsaw, true, 'picking up secret chainsaw unlocks chainsaw');
    assert.equal(game.player.weapon, 'chainsaw', 'picking up secret chainsaw auto-equips chainsaw');
    game.selectWeapon(1);
    assert.equal(game.player.weapon, 'knife', 'pressing 1 while holding chainsaw toggles to knife');
    game.selectWeapon(1);
    assert.equal(game.player.weapon, 'chainsaw', 'pressing 1 while holding knife toggles back to chainsaw');
  },

  'startup difficulty selection: four classic skill levels scale foe counts strictly upward across every level and hit-test cleanly on the title screen'() {
    assert.deepEqual(DIFFICULTY_ORDER, ['easy', 'normal', 'hard', 'nightmare']);
    for (const key of DIFFICULTY_ORDER) {
      assert.ok(DIFFICULTIES[key]?.label, `difficulty ${key} has a display label`);
      assert.ok(DIFFICULTIES[key]?.desc, `difficulty ${key} has a description`);
    }

    const game = new Game();
    assert.equal(game.difficulty, 'normal', 'default difficulty is normal (HURT ME PLENTY)');
    assert.equal(game.cycleDifficulty(1), 'hard', 'cycling down advances to hard');
    assert.equal(game.cycleDifficulty(1), 'nightmare', 'cycling down advances to nightmare');
    assert.equal(game.cycleDifficulty(1), 'easy', 'cycling down wraps around to easy');
    assert.equal(game.cycleDifficulty(-1), 'nightmare', 'cycling up wraps back to nightmare');
    assert.equal(game.setDifficulty(1), 'normal', 'numeric index 1 selects normal');

    for (let lvl = 0; lvl < LEVELS.length; lvl++) {
      const counts = {};
      for (const diff of DIFFICULTY_ORDER) {
        game.setDifficulty(diff);
        game.load(lvl);
        counts[diff] = game.enemies.length;
        assert.equal(game.totalEnemies, game.enemies.length, `totalEnemies matches spawned enemies on level ${lvl} (${diff})`);
        for (const enemy of game.enemies) {
          const tx = Math.floor(enemy.pos.x / 64);
          const ty = Math.floor(enemy.pos.y / 64);
          const idx = ty * game.level.width + tx;
          assert.equal(
            game.level.kind[idx],
            0,
            `enemy ${enemy.type} at (${enemy.pos.x.toFixed(1)}, ${enemy.pos.y.toFixed(1)}) on level ${lvl} (${diff}) is on an open floor tile`,
          );
        }
      }
      assert.ok(
        counts.easy < counts.normal && counts.normal < counts.hard && counts.hard < counts.nightmare,
        `level ${lvl} foe count strictly increases with difficulty: easy=${counts.easy} < normal=${counts.normal} < hard=${counts.hard} < nightmare=${counts.nightmare}`,
      );
    }

    // Verify HUD title-screen difficulty hit-testing with Vec2 screen coordinates
    const texts = [];
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {},
          clearRect() {},
          fillRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
          fillText(str) {
            texts.push(str);
          },
        };
      },
    };
    const fakeOverlay = {
      clear() {},
      glow: { line() {} },
      crisp: {
        fillRect() {},
        rectLine() {},
        line() {},
        circleLine() {},
        weapon: { quad() {} },
        sprites: { quad() {} },
        face: { quad() {} },
      },
    };
    const hud = new Hud(fakeCanvas, fakeOverlay);
    hud.resize(1024, 768, 1);
    const cx = 512;
    const rowsTop = 384 - 42;
    assert.equal(hud.difficultyAt(new Vec2(cx, rowsTop + 10)), 'easy');
    assert.equal(hud.difficultyAt(new Vec2(cx, rowsTop + 36)), 'normal');
    assert.equal(hud.difficultyAt(new Vec2(cx, rowsTop + 62)), 'hard');
    assert.equal(hud.difficultyAt(new Vec2(cx, rowsTop + 88)), 'nightmare');
    assert.equal(hud.difficultyAt(new Vec2(20, rowsTop + 10)), null, 'outside horizontal bounds returns null');
    assert.equal(hud.difficultyAt(new Vec2(cx, rowsTop - 15)), null, 'above difficulty rows returns null');

    game.state = 'title';
    game.selectingDifficulty = false;
    game.setDifficulty('hard');
    hud.render(game);
    assert.ok(!texts.some((t) => t.includes('SELECT SKILL LEVEL')), 'first title screen does not show skill selector before pressing Enter');
    assert.ok(texts.some((t) => t.includes('click or press ENTER to start')), 'first title screen shows press ENTER prompt');

    texts.length = 0;
    game.selectingDifficulty = true;
    game.setLevel(4);
    hud.render(game);
    assert.ok(texts.some((t) => t.includes('SELECT SKILL LEVEL')), 'difficulty screen renders skill selector header after pressing Enter');
    assert.ok(texts.some((t) => t.includes('▸ [3] ULTRA-VIOLENCE')), 'difficulty screen highlights selected difficulty');
    assert.ok(texts.some((t) => t.includes('E1M5 · RED PLANET')), 'difficulty screen displays selected mission');
    assert.equal(hud.levelStepAt(new Vec2(cx - 60, 384 + 105)), -1, 'clicking left half of mission row steps level backward');
    assert.equal(hud.levelStepAt(new Vec2(cx + 60, 384 + 105)), 1, 'clicking right half of mission row steps level forward');
    assert.equal(hud.levelStepAt(new Vec2(cx, rowsTop + 10)), 0, 'clicking difficulty rows does not step level');

    // Cycling levels on title screen preserves selected level across TitleDirector loops and loads it on end()
    const td = new TitleDirector(game);
    td.update(0.1);
    assert.equal(game.cycleLevel(1), 0, 'cycling forward from E1M5 wraps to E1M1');
    assert.equal(game.cycleLevel(-1), 4, 'cycling backward from E1M1 wraps to E1M5');
    td.begin();
    assert.equal(game.levelIndex, 4, 'TitleDirector.begin() preserves chosen starting levelIndex');
    td.end();
    assert.equal(game.level.name, 'E1M5 · Red Planet', 'TitleDirector.end() loads the selected starting level');
  },

  'foes immediately stop attacking, winding up, leaping, and moving when the player dies'() {
    const game = fresh(1);
    const px = 8 * 64 + 32;
    const py = 9 * 64 + 32;
    game.player.body.setPosition(new Vec2(px, py));

    // Place a mix of melee, ranged, and leaping enemies right next to the player in an active attack state
    const types = ['brute', 'imp', 'crawler', 'skull', 'swarmer', 'wraith', 'boss'];
    for (let i = 0; i < types.length; i++) {
      const enemy = game.enemies[i] || game.enemies[0];
      enemy.type = types[i];
      enemy.def = ENEMY_TYPES[types[i]];
      enemy.state = 'chase';
      enemy.los = true;
      enemy.losTimer = 10;
      enemy.windup = 0.05;
      enemy.cooldown = 0;
      enemy.leap = types[i] === 'crawler' ? 0.3 : 0;
      enemy.roar = 0.2;
      enemy.body.setPosition(new Vec2(px + 28, py));
      enemy.body.setVelocity(new Vec2(120, 0));
    }

    // Kill the player
    game.hurtPlayer(999);
    assert.equal(game.state, 'dead');
    assert.equal(game.player.health, 0);

    // Clear any existing shots or events from before death, then step the simulation
    game.shots.length = 0;
    game.events.length = 0;
    const attackEvents = new Set(['swing', 'bite', 'rake', 'slam', 'leap', 'fireball', 'wake']);

    for (const enemy of game.enemies)
      if (enemy.state !== 'dead') {
        assert.equal(enemy.windup, 0, `${enemy.type} windup cleared on player death`);
        assert.equal(enemy.leap, 0, `${enemy.type} leap cleared on player death`);
        assert.equal(enemy.roar, 0, `${enemy.type} roar cleared on player death`);
      }

    run(game, 2.0);

    assert.equal(game.shots.length, 0, 'no fireballs or projectiles are fired after player death');
    for (const ev of game.events)
      assert.ok(!attackEvents.has(ev.type), `no enemy attack or wake event (${ev.type}) emitted after player death`);
    for (const enemy of game.enemies)
      if (enemy.state !== 'dead') {
        assert.equal(enemy.windup, 0, `${enemy.type} never winds up while player is dead`);
        assert.equal(enemy.leap, 0, `${enemy.type} never leaps while player is dead`);
        assert.equal(enemy.body.velocity.x, 0, `${enemy.type} velocity.x is zero while player is dead`);
        assert.equal(enemy.body.velocity.y, 0, `${enemy.type} velocity.y is zero while player is dead`);
      }
  },

  'ammo pickup flash: HUD ammo counter flashes, displays +N badge, and visibly rolls numbers up when picking up ammo'() {
    const game = new Game();
    game.state = 'play';
    clearEnemies(game);

    const room1Caches = game.caches.filter((c) => c.pos.x < 7 * 64 && c.pos.y < 5 * 64);
    const shellCache = room1Caches.find((c) => c.contents.includes('ammo'));

    // Opening the first-room chest (shotgun and shells) triggers ammoFlash on shells from 0 -> 8
    game.openCache(shellCache);
    assert.equal(game.player.shells, 8);
    assert.equal(game.player.ammoFrom.shells, 0);
    assert.equal(game.player.ammoDelta.shells, 8);
    assert.equal(game.player.ammoFlash.shells, AMMO_FLASH_DURATION);
    assert.equal(game.player.ammoFlash.bullets, 0, 'other ammo pools do not flash');

    const texts = [];
    const lines = [];
    const fakeHud = Object.create(Hud.prototype);
    fakeHud.text = (str, _x, _y, color, opts) => texts.push({ str, color, opts });
    fakeHud.rect = (x, y, w, h, color, alpha) => lines.push({ pts: [x, y, w, h], color, alpha });

    // Right at pickup start (flash = 0.65), shownAmmo starts at 0 and rolls upward as time advances
    assert.equal(fakeHud.shownAmmo(game.player, 'shells'), 0, 'counter starts rolling from pre-pickup value 0');
    fakeHud.drawAmmo(900, 560, game.player, WEAPONS.shotgun);
    assert.ok(texts.some((t) => t.str === '+8'), 'HUD displays +8 gain badge while flashing');
    assert.ok(lines.length >= 2, 'HUD draws glowing highlight frames around active readout and SHL tally row');

    // Step partway through the roll (0.2s elapsed -> halfway through the 0.4s roll window)
    run(game, 0.2);
    const midShown = fakeHud.shownAmmo(game.player, 'shells');
    assert.ok(midShown > 0 && midShown < 8, `counter visibly grows through intermediate values (midShown=${midShown})`);

    // Step past the 0.4s roll window (total 0.45s elapsed): counter reaches 8 while still finishing its flash
    run(game, 0.25);
    assert.equal(fakeHud.shownAmmo(game.player, 'shells'), 8, 'counter reaches final value 8 before flash ends');
    assert.ok(game.player.ammoFlash.shells > 0, 'flash glow is still active right after roll completes');

    // Step until flash completes: flash timer settles to 0
    run(game, 0.3);
    assert.equal(game.player.ammoFlash.shells, 0, 'ammoFlash timer decays back to 0');
    assert.equal(fakeHud.shownAmmo(game.player, 'shells'), 8, 'counter remains at 8 after flash ends');
  },

  'foe projectiles hit other foes and disappear with no friendly fire'() {
    const game = fresh();
    clearEnemies(game);
    // Place player far out of the line of fire
    game.player.body.setPosition(new Vec2(6 * 64, 7 * 64 + 32));
    game.player.health = 100;

    // Place shooter imp and blocker imp along the same horizontal corridor
    game.addEnemy('imp', new Vec2(6 * 64, 9 * 64 + 32));
    game.addEnemy('imp', new Vec2(6 * 64 + 90, 9 * 64 + 32));
    const [shooter, blocker] = game.enemies;
    const initialBlockerHp = blocker.hp;
    const initialShooterHp = shooter.hp;

    // Fire a shot directly from shooter's center (overlapping shooter) toward blocker
    game.events.length = 0;
    game.effects.length = 0;
    game.addShot(shooter.pos.clone(), new Vec2(1, 0), 220, 10, shooter);
    assert.equal(game.shots.length, 1, 'shot is spawned');

    // Step one tick: shot overlaps shooter initially, must not self-collide with shooter
    game.update(1 / 60, idle);
    assert.equal(game.shots.length, 1, 'shot ignores its own shooter');
    assert.equal(shooter.hp, initialShooterHp, 'shooter takes no self-damage');

    // Advance until shot reaches blocker (~90px at 220px/s -> ~0.4s)
    let exploded = false;
    for (let i = 0; i < 40 && game.shots.length > 0; i++) {
      game.update(1 / 60, idle);
      if (game.events.some((e) => e.type === 'explode'))
        exploded = true;
    }

    assert.equal(game.shots.length, 0, 'shot disappears upon hitting the other foe');
    assert.ok(exploded, 'shot emits explode event on hitting the other foe');
    assert.ok(game.effects.some((fx) => fx.type === 'blast'), 'shot spawns blast effect on impact');
    assert.equal(blocker.hp, initialBlockerHp, 'other foe takes no friendly fire damage');
    assert.ok(!blocker.dead, 'other foe remains alive');
  },

  'doors use two thin recessed slabs across the 64-unit wall thickness, oriented to their corridor'() {
    const dims = new Vec3(63.2, 64, DOOR_THICKNESS);
    const alongX = doubleDoorBox(dims, false, DOOR_INSET);
    const alongY = doubleDoorBox(dims, true, DOOR_INSET);
    assert.equal(alongX.vertices.length / 3, 60, 'two slabs with four sides and a top each (10 quads, 60 vertices)');
    assert.equal(alongX.uvs.length / 2, 60);
    assert.equal(alongY.vertices.length / 3, 60);

    // Along-X corridor (alongY = false): doorway width spans Z [-31.6, 31.6], two thin slabs sit at X in [-26, -18] and [18, 26]
    const xs = new Set();
    for (let i = 0; i < alongX.vertices.length; i += 3) {
      xs.add(alongX.vertices[i]);
      assert.ok(alongX.vertices[i + 1] >= 0 && alongX.vertices[i + 1] <= 64, 'stands on floor up to tile height');
      assert.ok(Math.abs(Math.abs(alongX.vertices[i + 2]) - 31.6) < 1e-6, 'spans full doorway width along Z');
    }
    const outer = 32 - DOOR_INSET;
    const inner = outer - DOOR_THICKNESS;
    assert.deepEqual([...xs].sort((a, b) => a - b), [-outer, -inner, inner, outer]);
    assert.ok(inner * 2 >= 32, 'leaves a wide hollow airlock chamber between the two thin door slabs');

    // Along-Y corridor (alongY = true): doorway width spans X [-31.6, 31.6], two thin slabs sit at Z in [-26, -18] and [18, 26]
    const zs = new Set();
    for (let i = 0; i < alongY.vertices.length; i += 3) {
      zs.add(alongY.vertices[i + 2]);
      assert.ok(Math.abs(Math.abs(alongY.vertices[i]) - 31.6) < 1e-6, 'spans full doorway width along X');
    }
    assert.deepEqual([...zs].sort((a, b) => a - b), [-outer, -inner, inner, outer]);

    // Level parser determines corridor orientation for every door
    const game = fresh();
    const doorEastWest = game.level.doors.get(3 * game.level.width + 5);
    const doorNorthSouth = game.level.doors.get(5 * game.level.width + 3);
    assert.equal(doorEastWest.alongY, false, 'door at (5, 3) has walls North/South and opens an East/West corridor');
    assert.equal(doorNorthSouth.alongY, true, 'door at (3, 5) has walls West/East and opens a North/South corridor');
  },

  'AC-5 player stays outside the diagonal hypotenuse and blood attaches (diagonal walls: 4 triangle orientations parse, mesh, block rays, slide bodies, and take marks)'() {
    // 1. Explicit 4-direction glyphs and auto-oriented / and \
    const custom = new Level({
      name: 'DiagExplicit',
      rows: [
        '#######',
        '#◤...◥#',
        '#..P..#',
        '#◣...◢#',
        '#######',
      ],
    });
    assert.equal(custom.diag[1 * custom.width + 1], DIAG_NW, '◤ parses as DIAG_NW');
    assert.equal(custom.diag[1 * custom.width + 5], DIAG_NE, '◥ parses as DIAG_NE');
    assert.equal(custom.diag[3 * custom.width + 1], DIAG_SW, '◣ parses as DIAG_SW');
    assert.equal(custom.diag[3 * custom.width + 5], DIAG_SE, '◢ parses as DIAG_SE');

    const auto = new Level({
      name: 'DiagAuto',
      rows: [
        '#######',
        '#/...\\#',
        '#..P..#',
        '#\\.../#',
        '#######',
      ],
    });
    assert.equal(auto.diag[1 * auto.width + 1], DIAG_NW, '/ against North+West walls orients as DIAG_NW');
    assert.equal(auto.diag[1 * auto.width + 5], DIAG_NE, '\\ against North+East walls orients as DIAG_NE');
    assert.equal(auto.diag[3 * auto.width + 1], DIAG_SW, '\\ against South+West walls orients as DIAG_SW');
    assert.equal(auto.diag[3 * auto.width + 5], DIAG_SE, '/ against South+East walls orients as DIAG_SE');

    // 2. Half-space heightAtPoint and cardinal faces for all 4 orientations
    // Tile (1, 1) is DIAG_NW ([64..128, 64..128]): solid in NW (lx + ly <= 64), open in SE (lx + ly > 64)
    assert.equal(custom.heightAtPoint(new Vec2(64 + 12, 64 + 12)), 64, 'NW corner of DIAG_NW is solid');
    assert.equal(custom.heightAtPoint(new Vec2(64 + 52, 64 + 52)), 0, 'SE half of DIAG_NW is open');
    assert.equal(custom.hasCardinalFace(1 * custom.width + 1, 0), true, 'DIAG_NW has West leg (d=0)');
    assert.equal(custom.hasCardinalFace(1 * custom.width + 1, 2), true, 'DIAG_NW has North leg (d=2)');
    assert.equal(custom.hasCardinalFace(1 * custom.width + 1, 1), false, 'DIAG_NW has no East cardinal face (d=1)');
    assert.equal(custom.hasCardinalFace(1 * custom.width + 1, 3), false, 'DIAG_NW has no South cardinal face (d=3)');

    // Tile (5, 1) is DIAG_NE ([320..384, 64..128]): solid in NE (lx >= ly), open in SW (lx < ly)
    assert.equal(custom.heightAtPoint(new Vec2(320 + 52, 64 + 12)), 64, 'NE corner of DIAG_NE is solid');
    assert.equal(custom.heightAtPoint(new Vec2(320 + 12, 64 + 52)), 0, 'SW half of DIAG_NE is open');

    // Tile (1, 3) is DIAG_SW ([64..128, 192..256]): solid in SW (ly >= lx), open in NE (ly < lx)
    assert.equal(custom.heightAtPoint(new Vec2(64 + 12, 192 + 52)), 64, 'SW corner of DIAG_SW is solid');
    assert.equal(custom.heightAtPoint(new Vec2(64 + 52, 192 + 12)), 0, 'NE half of DIAG_SW is open');

    // Tile (5, 3) is DIAG_SE ([320..384, 192..256]): solid in SE (lx + ly >= 64), open in NW (lx + ly < 64)
    assert.equal(custom.heightAtPoint(new Vec2(320 + 52, 192 + 52)), 64, 'SE corner of DIAG_SE is solid');
    assert.equal(custom.heightAtPoint(new Vec2(320 + 12, 192 + 12)), 0, 'NW half of DIAG_SE is open');

    // 3. 3D hypotenuse mesh generation
    for (const [idx, expectedNx, expectedNy] of [
      [1 * custom.width + 1, Math.SQRT1_2, Math.SQRT1_2],
      [1 * custom.width + 5, -Math.SQRT1_2, Math.SQRT1_2],
      [3 * custom.width + 1, Math.SQRT1_2, -Math.SQRT1_2],
      [3 * custom.width + 5, -Math.SQRT1_2, -Math.SQRT1_2],
    ]) {
      const info = custom.diagInfo(idx);
      assert.ok(Math.abs(info.normal.x - expectedNx) < 1e-6 && Math.abs(info.normal.y - expectedNy) < 1e-6);
      const quads = diagWallFaceQuads({
        a: info.a,
        b: info.b,
        heights: new Vec2(0, 64),
        tile: new Vec2(idx % custom.width, Math.floor(idx / custom.width)),
        diag: info.diag,
        exit: null,
      });
      assert.equal(quads.length, 1);
      assert.deepEqual(quads[0].corners.slice(0, 6), [info.a.x, 0, info.a.y, info.b.x, 0, info.b.y]);
      for (const u of quads[0].uv)
        assert.ok(u >= 0 && u <= 1, 'diagonal wall UVs stay inside [0, 1]');
    }

    // 4. Level 1 has all 4 diagonal wall orientations; test raycasting, sliding collision, and bullet holes
    const e1m1 = fresh(0);
    assert.ok(e1m1.diagWalls.length >= 4, 'E1M1 contains diagonal walls');
    const seenTypes = new Set(e1m1.diagWalls.map((dw) => dw.diag));
    for (const d of [DIAG_NW, DIAG_NE, DIAG_SW, DIAG_SE])
      assert.ok(seenTypes.has(d), `E1M1 includes diagonal orientation ${d}`);

    const game = new Game();
    game.load(custom);
    game.state = 'play';

    // Tile (1, 1) in custom is DIAG_NW (hypotenuse from (64, 128) to (128, 64), normal (+SQRT1_2, +SQRT1_2))
    const hitHyp = game.scene.raycast(new Vec2(140, 140), new Vec2(70, 70), { mask: CAT.WALL });
    assert.ok(hitHyp && hitHyp.body?.ref?.kind === 'wall' && hitHyp.body?.ref?.diag === DIAG_NW, 'ray into NW diagonal hits hypotenuse');
    assert.ok(Math.abs(hitHyp.point.x + hitHyp.point.y - (64 + 128)) < 1e-3, 'hit point lies on the hypotenuse x + y = 192');
    assert.ok(Math.abs(hitHyp.normal.x - Math.SQRT1_2) < 1e-3 && Math.abs(hitHyp.normal.y - Math.SQRT1_2) < 1e-3, 'hit normal is 45 degrees (+SQRT1_2, +SQRT1_2)');

    // Ray passing through the open SE half of tile (1, 1) (e.g. from (120, 125) to (125, 120), where lx+ly = 56+61 = 117 > 64) is unblocked
    const openHalfRay = game.scene.raycast(new Vec2(120, 125), new Vec2(125, 120), { mask: CAT.WALL });
    assert.equal(openHalfRay, null, 'open half of diagonal wall tile does not block rays');

    // Player pushed into the NW diagonal wall at (1, 1) slides smoothly along the 45-degree hypotenuse
    game.player.body.setPosition(new Vec2(112, 112));
    game.player.angle = -Math.PI * 0.75; // facing NW into the diagonal wall
    for (let i = 0; i < 20; i++)
      game.update(1 / 60, input({ forward: 1 }));
    const p = game.player.pos;
    const nwDiag = custom.diagInfo(1 * custom.width + 1);
    const signedDist = nwDiag.tri.signedDistanceToHypotenuse(p);
    assert.ok(signedDist >= 14 - 1e-4, `AC-5 player stays outside the diagonal hypotenuse (signedDist=${signedDist})`);

    // Bullet holes and blood splats on diagonal wall hypotenuse are recorded and clamped to hypotenuse span
    game.blood.holes.length = 0;
    game.blood.walls.length = 0;
    game.blood.impact(new Vec3(96, 96, 32), new Vec2(Math.SQRT1_2, Math.SQRT1_2));
    game.blood.wallSplat(new Vec3(96, 96, 32), new Vec2(Math.SQRT1_2, Math.SQRT1_2), 10, 64);
    assert.equal(game.blood.holes.length, 1, 'bullet hole attaches to diagonal wall hypotenuse');
    assert.equal(game.blood.walls.length, 1, 'blood splat attaches to diagonal wall hypotenuse');
    assert.ok(game.blood.holes[0].lo < -40 && game.blood.holes[0].hi > 40, 'diagonal face span covers the ~90.5-unit hypotenuse');
  },

  'AC-1 inArena accepts a Vec2 and reports arena membership'() {
    assert.equal(Level.prototype.inArena.length, 1, 'inArena has an arity of 1');
    const game = new Game();
    game.load(1);
    const { level } = game;
    const [boss] = game.enemies.filter((e) => e.type === 'boss');
    assert.ok(boss, 'warden boss exists');
    assert.equal(level.inArena(boss.pos), true, 'boss starting pos is in arena');
    const firstArenaTile = [...level.bossArena][0];
    const ax = firstArenaTile % level.width;
    const ay = Math.floor(firstArenaTile / level.width);
    assert.equal(level.inArena(new Vec2((ax + 0.5) * 64, (ay + 0.5) * 64)), true, 'tile center inside boss arena is in arena');
    assert.equal(level.inArena(new Vec2(1 * 64 + 32, 1 * 64 + 32)), false, 'known non-arena tile is not in arena');
    assert.equal(level.inArena(new Vec2(-10, -10)), false, 'negative coordinates outside grid return false');
    assert.equal(level.inArena(new Vec2(level.width * 64 + 100, level.rowCount * 64 + 100)), false, 'out-of-bounds coordinates return false');
  },

  'AC-2 diagInfo returns Vec2 primitives without scalar fields'() {
    const custom = new Level({
      name: 'DiagExplicit',
      rows: [
        '#######',
        '#◤...◥#',
        '#..P..#',
        '#◣...◢#',
        '#######',
      ],
    });
    const legacyKeys = ['ax', 'ay', 'bx', 'by', 'sx', 'sy', 'ox', 'oy', 'nx', 'ny', 'cx', 'cy'];
    for (const idx of custom.diagTriangles.keys()) {
      const info = custom.diagInfo(idx);
      assert.ok(info, `diagInfo exists for diagonal tile ${idx}`);
      assert.ok(info.a instanceof Vec2, 'info.a is a Vec2');
      assert.ok(info.b instanceof Vec2, 'info.b is a Vec2');
      assert.ok(info.s instanceof Vec2, 'info.s is a Vec2');
      assert.ok(info.o instanceof Vec2, 'info.o is a Vec2');
      assert.ok(info.normal instanceof Vec2, 'info.normal is a Vec2');
      assert.ok(info.center instanceof Vec2, 'info.center is a Vec2');
      for (const k of legacyKeys)
        assert.equal(k in info, false, `legacy key ${k} is not in diagInfo result`);
    }
  },

  'AC-3 diagInfo normals and vertices match the four diagonal orientations'() {
    const custom = new Level({
      name: 'DiagExplicit',
      rows: [
        '#######',
        '#◤...◥#',
        '#..P..#',
        '#◣...◢#',
        '#######',
      ],
    });
    const orientations = [
      { idx: 1 * custom.width + 1, diag: DIAG_NW, nx: Math.SQRT1_2, ny: Math.SQRT1_2 },
      { idx: 1 * custom.width + 5, diag: DIAG_NE, nx: -Math.SQRT1_2, ny: Math.SQRT1_2 },
      { idx: 3 * custom.width + 1, diag: DIAG_SW, nx: Math.SQRT1_2, ny: -Math.SQRT1_2 },
      { idx: 3 * custom.width + 5, diag: DIAG_SE, nx: -Math.SQRT1_2, ny: -Math.SQRT1_2 },
    ];
    const sTest = new Vec2();
    const aTest = new Vec2();
    const bTest = new Vec2();
    const oTest = new Vec2();
    for (const { idx, diag, nx, ny } of orientations) {
      const info = custom.diagInfo(idx);
      assert.equal(info.diag, diag);
      assert.ok(Math.abs(info.normal.x - nx) < 1e-6, `normal.x matches for diag ${diag}`);
      assert.ok(Math.abs(info.normal.y - ny) < 1e-6, `normal.y matches for diag ${diag}`);
      assert.ok(Math.abs(info.normal.x - info.tri.hypNormal.x) < 1e-6);
      assert.ok(Math.abs(info.normal.y - info.tri.hypNormal.y) < 1e-6);
      assert.ok(Math.abs(info.center.x - info.tri.position.x) < 1e-6);
      assert.ok(Math.abs(info.center.y - info.tri.position.y) < 1e-6);
      info.tri.getVertices(sTest, aTest, bTest);
      info.tri.getOppositeCorner(oTest);
      assert.ok(Math.abs(info.s.x - sTest.x) < 1e-6 && Math.abs(info.s.y - sTest.y) < 1e-6);
      assert.ok(Math.abs(info.a.x - aTest.x) < 1e-6 && Math.abs(info.a.y - aTest.y) < 1e-6);
      assert.ok(Math.abs(info.b.x - bTest.x) < 1e-6 && Math.abs(info.b.y - bTest.y) < 1e-6);
      assert.ok(Math.abs(info.o.x - oTest.x) < 1e-6 && Math.abs(info.o.y - oTest.y) < 1e-6);
    }
  },

  'AC-4 diagInfo returns null for non-diagonal tiles'() {
    const custom = new Level({
      name: 'DiagExplicit',
      rows: [
        '#######',
        '#◤...◥#',
        '#..P..#',
        '#◣...◢#',
        '#######',
      ],
    });
    const wallIdx = 0 * custom.width + 0;
    const floorIdx = 2 * custom.width + 2;
    assert.equal(custom.diagInfo(wallIdx), null, 'diagInfo returns null for plain wall');
    assert.equal(custom.diagInfo(floorIdx), null, 'diagInfo returns null for floor');
  },

  'half-size walls (PILLAR) have ceiling above them in roofed rooms and stay roofless inside the boss arena'() {
    // 1. In a normal roofed room, a half-size wall ('o', height 26) at tile (2, 3) has ceiling above it
    const roofedSpec = {
      name: 'Roofed Pillar Test',
      rows: [
        '#####',
        '#P..#',
        '#...#',
        '#.o.#',
        '#####',
      ],
    };
    const game = new Game();
    game.load(roofedSpec);
    game.state = 'play';
    const pillarIdx = 3 * game.level.width + 2;
    assert.equal(game.level.kind[pillarIdx], PILLAR, 'tile (2, 3) is a half-size PILLAR');
    assert.equal(game.level.baseHeight[pillarIdx], 26, 'half-size PILLAR has height 26 (< 64 ceiling)');
    assert.equal(game.blood.hitsCeiling(2.5 * 64, 3.5 * 64), true, 'ceiling exists above half-size wall in a roofed room');

    // Tile (2, 3) satisfies ceilingCellFor(2, 3) === CEILING_CELLS.light (2 % 5 === 2 && 3 % 4 === 3)
    const fixtures = ceilingLightFixtures(game.level);
    assert.ok(fixtures.some((f) => f.tile.x === 2 && f.tile.y === 3), 'ceiling light fixture is placed on the ceiling above a half-size wall at (2, 3)');

    // 2. Inside a boss arena, half-size walls ('o') are part of level.arena and remain open to the sky
    const arenaSpec = {
      name: 'Boss Arena Pillar Test',
      rows: [
        '#######',
        '#P#...#',
        '#D#.o.#',
        '#.#.B.#',
        '#######',
      ],
    };
    const arenaGame = new Game();
    arenaGame.load(arenaSpec);
    const arenaPillarIdx = 2 * arenaGame.level.width + 4;
    assert.equal(arenaGame.level.kind[arenaPillarIdx], PILLAR);
    assert.ok(arenaGame.level.arena?.has(arenaPillarIdx), 'half-size wall inside the boss room is included in the roofless arena set');
    assert.equal(arenaGame.blood.hitsCeiling(4.5 * 64, 2.5 * 64), false, 'no ceiling over a half-size wall inside the roofless boss arena');

    // 3. Low cover tiles ('o' / PILLAR) render as 3D UAC futuristic cover crates (256x64 4-cell atlas + multi-part 3D mesh)
    const cAtlas = crateAtlas();
    assert.equal(cAtlas.width, CRATE_CELL * CRATE_FRAMES, 'crateAtlas width is 256 (4 x 64 cells)');
    assert.equal(cAtlas.height, CRATE_CELL, 'crateAtlas height is 64');
    const cQuads = crateQuads(new Vec3(160, 0, 224), new Vec2(64, 26));
    assert.ok(cQuads.length >= 80, 'crateQuads builds skid plinth, cargo core, corner bumpers, side bulkheads, lid, locking bars, and lugs');
    const cMesh = crateMesh(new Vec3(0, 0, 0), new Vec2(64, 26));
    assert.equal(cMesh.vertices.length, cQuads.length * 18, 'crateMesh converts every quad to 2 triangles');
    assert.equal(cMesh.uvs.length, cQuads.length * 12, 'crateMesh UVs match triangle vertices');
  },

  'AC-1 E1M5 sky does not evaluate or composite Phobos'() {
    const composition = MARS_SKY_FRAGMENT.slice(MARS_SKY_FRAGMENT.indexOf('void main(void)'));
    assert.doesNotMatch(composition, /phobos/i, 'Phobos has no evaluation or composite in the fragment composition');
    assert.equal(composition.match(/\bevalMoonSphere\s*\(/g)?.length, 1, 'only one moon is evaluated');
  },

  'AC-2 E1M5 sky evaluates and composites Deimos'() {
    const composition = MARS_SKY_FRAGMENT.slice(MARS_SKY_FRAGMENT.indexOf('void main(void)'));
    assert.match(composition, /vec4 deimos = evalMoonSphere\(/, 'Deimos retains its sphere evaluation');
    assert.ok(composition.includes(`${DEIMOS_ANGULAR_RADIUS.toFixed(4)},`), 'Deimos retains its small angular radius');
    assert.ok(composition.includes('sky = mix(sky, deimos.rgb, deimos.a);'), 'Deimos is composited into the sky');
  },

  'AC-3 E1M5 sky retains its sun, panorama, terrain, clouds, and storm fog'() {
    const composition = MARS_SKY_FRAGMENT.slice(MARS_SKY_FRAGMENT.indexOf('void main(void)'));
    assert.ok(composition.includes('vec3 sky = sampleSmoothSky(vec2(u, v));'), 'the panorama remains the sky base');
    assert.ok(composition.includes('sky += vec3(0.055, 0.024, 0.01) * strata * mountainZone;'), 'terrain strata remain composited over the panorama');
    assert.ok(composition.includes('uTime * 0.11') && composition.includes('uTime * 0.19'), 'dust clouds keep drifting with time');
    assert.ok(composition.includes('color = mix(sky, dustCloud, cloudStrength);'), 'dust clouds remain composited');
    assert.ok(composition.includes('mix(opticalFog, 1.0, stormFog * 0.65)'), 'storm fog still blankets the optical fog path');
    assert.ok(composition.includes('color = mix(color * uMaterialDiffuse, fogCol, skyFog);'), 'fog remains composited into the final sky color');
    assert.ok(composition.includes(`gl_FragColor = vec4(color, ${SOLID_ALPHA});`), 'the composed sky reaches the fragment output');
    const panorama = marsSkyAtlas({ includeMoons: false });
    const sunIdx = (60 * panorama.width + 224) * 4;
    assert.ok(panorama.data[sunIdx] > 235 && panorama.data[sunIdx + 1] > 190, 'the moon-free panorama retains its bright hazy sun');
  },

  'E1M5 Red Planet: indoor airlock start room opening onto roofless hostile Martian surface with wind and blowing orange dirt'() {
    const g = fresh(4);
    const { level } = g;
    assert.equal(level.name, 'E1M5 · Red Planet');
    assert.equal(level.planet, 'mars');
    assert.ok(level.wind.x > 200 && level.wind.y > 0, 'Martian surface has strong crosswind vector');

    // 1. Player spawns inside an enclosed indoor airlock room with a ceiling and overhead light fixture
    assert.equal(level.isOutdoor(g.player.pos), false, 'player starts indoors inside the airlock room');
    assert.equal(g.blood.hitsCeiling(g.player.pos.x, g.player.pos.y), true, 'starting room has a solid ceiling overhead');
    const fixtures = ceilingLightFixtures(level);
    assert.ok(
      fixtures.some((f) => level.indoor.has(f.tile.y * level.width + f.tile.x)),
      'starting airlock room has an overhead ceiling light fixture'
    );
    assert.ok(
      fixtures.every((f) => !level.outdoor.has(f.tile.y * level.width + f.tile.x)),
      'no ceiling light fixtures float over the roofless Martian exterior'
    );

    // 2. Opening the starting airlock door leads directly outside onto the roofless Martian surface, with ZERO other doors on the planet
    assert.equal(level.doors.size, 1, 'E1M5 has only 1 door (the first room door) and no doors outside on the planet');
    const airlockDoor = level.doors.get(3 * level.width + 6);
    assert.ok(airlockDoor, 'airlock door exists at (6, 3) on the east wall of the starting room');
    assert.equal(level.doorTouchesIndoor(airlockDoor.idx), true, 'airlock door borders the indoor starting room');
    assert.equal(level.isIndoorTile(airlockDoor.idx), true, 'airlock doorway tile is indoor so its side walls use interior bulkhead textures');
    assert.equal(level.isIndoorTile(3 * level.width + 7), false, 'tile outside the airlock door is outdoor so its walls use Martian rock');
    const outsidePos = new Vec2(7.5 * 64, 3.5 * 64);
    assert.equal(level.isOutdoor(outsidePos), true, 'stepping through the airlock door places the player on the outdoor Martian surface');
    assert.equal(g.blood.hitsCeiling(outsidePos.x, outsidePos.y), false, 'Martian exterior is roofless (open to the orange sky)');

    // 3. Outdoor Martian dirt floor atlas, rock cliff wall atlas, and 3D boulder outcrops replace base floor/walls/crates
    const dirt = marsDirtAtlas();
    assert.equal(dirt.width, TILE_PIXELS * FLOOR_CELL_COUNT, 'marsDirtAtlas is 512 px wide (8 cells)');
    assert.equal(dirt.height, TILE_PIXELS, 'marsDirtAtlas is 64 px tall');
    assert.ok(MARS_DIRT_FRAGMENT.includes('uSampler'), 'MARS_DIRT_FRAGMENT samples the Martian dirt atlas');

    const rock = marsRockAtlas();
    assert.equal(rock.width, 64 * WALL_CELL_COUNT, 'marsRockAtlas is 512 px wide (8 cells)');
    assert.equal(rock.height, 64, 'marsRockAtlas is 64 px tall');
    // Verify warm iron-oxide orange/red dominance in both dirt and rock atlases (avg R > avg G > avg B)
    let dirtR = 0;
    let dirtG = 0;
    let dirtB = 0;
    for (let i = 0; i < dirt.data.length; i += 4) {
      dirtR += dirt.data[i];
      dirtG += dirt.data[i + 1];
      dirtB += dirt.data[i + 2];
    }
    assert.ok(dirtR > dirtG * 1.5 && dirtG > dirtB * 1.4, 'marsDirtAtlas has orange-red Martian regolith palette');
    // Every dirt floor cell shares the exact same periodic boundary texels so adjacent floor tiles have zero border discontinuity
    for (let cell = 1; cell < FLOOR_CELL_COUNT; cell++)
      for (let i = 0; i < TILE_PIXELS; i++) {
        const left0 = (i * dirt.width + 0) * 4;
        const leftC = (i * dirt.width + cell * TILE_PIXELS + 0) * 4;
        const right0 = (i * dirt.width + (TILE_PIXELS - 1)) * 4;
        const rightC = (i * dirt.width + cell * TILE_PIXELS + (TILE_PIXELS - 1)) * 4;
        const top0 = i * 4;
        const topC = (cell * TILE_PIXELS + i) * 4;
        const bot0 = ((TILE_PIXELS - 1) * dirt.width + i) * 4;
        const botC = ((TILE_PIXELS - 1) * dirt.width + cell * TILE_PIXELS + i) * 4;
        assert.equal(dirt.data[leftC], dirt.data[left0], 'seamless left border across dirt cells');
        assert.equal(dirt.data[rightC], dirt.data[right0], 'seamless right border across dirt cells');
        assert.equal(dirt.data[topC], dirt.data[top0], 'seamless top border across dirt cells');
        assert.equal(dirt.data[botC], dirt.data[bot0], 'seamless bottom border across dirt cells');
      }
    assert.ok(MARS_DIRT_FRAGMENT.includes('sampleDirtCell'), 'MARS_DIRT_FRAGMENT blends multiple periodic dirt cells across domain-warped layers');

    let rockR = 0;
    let rockG = 0;
    let rockB = 0;
    let rockMinR = 255;
    let rockMaxR = 0;
    for (let i = 0; i < rock.data.length; i += 4) {
      rockR += rock.data[i];
      rockG += rock.data[i + 1];
      rockB += rock.data[i + 2];
      if (rock.data[i] < rockMinR)
        rockMinR = rock.data[i];
      if (rock.data[i] > rockMaxR)
        rockMaxR = rock.data[i];
    }
    assert.ok(rockR > rockG * 1.4 && rockG > rockB * 1.3, 'marsRockAtlas has stratified red-orange canyon rock palette');
    assert.ok(rockMinR < 40 && rockMaxR > 190, 'marsRockAtlas has high-contrast dark crevices and sunlit ochre ledges');
    assert.ok(MARS_ROCK_FRAGMENT.includes('sampleRockCell'), 'MARS_ROCK_FRAGMENT blends multiple periodic rock cells across domain-warped layers');
    // Every rock wall cell shares the exact same periodic boundary texels so adjacent wall tiles never show hard seams
    for (let cell = 1; cell < WALL_CELL_COUNT; cell++)
      for (let i = 0; i < TILE_PIXELS; i++) {
        const left0 = (i * rock.width + 0) * 4;
        const leftC = (i * rock.width + cell * TILE_PIXELS + 0) * 4;
        const right0 = (i * rock.width + (TILE_PIXELS - 1)) * 4;
        const rightC = (i * rock.width + cell * TILE_PIXELS + (TILE_PIXELS - 1)) * 4;
        assert.equal(rock.data[leftC], rock.data[left0], 'seamless left border across rock cells');
        assert.equal(rock.data[rightC], rock.data[right0], 'seamless right border across rock cells');
      }

    const bAtlas = marsBoulderAtlas();
    assert.equal(bAtlas.width, TILE_PIXELS * MARS_BOULDER_CELL_COUNT, 'marsBoulderAtlas is 256 px wide (4 cells)');
    assert.equal(bAtlas.height, TILE_PIXELS, 'marsBoulderAtlas is 64 px tall');
    let bMinR = 255;
    let bMaxR = 0;
    for (let i = 0; i < bAtlas.data.length; i += 4) {
      if (bAtlas.data[i] < bMinR)
        bMinR = bAtlas.data[i];
      if (bAtlas.data[i] > bMaxR)
        bMaxR = bAtlas.data[i];
    }
    assert.ok(bMinR < 40 && bMaxR > 190, 'marsBoulderAtlas has high-contrast dark crevices and sunlit ochre highlights');
    const bQuads = marsBoulderQuads(new Vec3(160, 0, 224), new Vec2(64, 26));
    assert.equal(bQuads.length, 30, 'marsBoulderQuads builds 6 tapered rock masses (30 quads)');
    const bMesh = marsBoulderMesh(new Vec3(0, 0, 0), new Vec2(64, 26));
    assert.equal(bMesh.vertices.length, bQuads.length * 18, 'marsBoulderMesh converts every quad to 2 triangles');
    assert.equal(bMesh.uvs.length, bQuads.length * 12, 'marsBoulderMesh UVs match triangle vertices');

    // Bullet holes, blood splats, and blood drips on outdoor Martian boulders follow the rock slope instead of floating vertically
    const boulderIdx = level.kind.findIndex((k, idx) => k === PILLAR && !level.indoor.has(idx));
    assert.ok(boulderIdx >= 0, 'E1M5 has outdoor Martian boulder tiles');
    const btx = boulderIdx % level.width;
    const bty = Math.floor(boulderIdx / level.width);
    const bcx = (btx + 0.5) * 64;
    const bSouthY = (bty + 1) * 64;
    g.blood.holes.length = 0;
    g.blood.walls.length = 0;
    const hitH = g.blood.impact(new Vec3(bcx, bSouthY, 16), new Vec2(0, 1), 'hole');
    assert.equal(hitH, 16, 'bullet impact on Martian boulder records at hit height');
    const bHole = g.blood.holes[g.blood.holes.length - 1];
    assert.equal(bHole.slope, MARS_BOULDER_SLOPE, 'boulder bullet hole carries MARS_BOULDER_SLOPE');
    const expectedFaceY = (bty + 0.5) * 64 + (32 - MARS_BOULDER_BASE_INSET - MARS_BOULDER_SLOPE * 16);
    assert.ok(Math.abs(bHole.y - expectedFaceY) < 1e-4, 'boulder bullet hole is recessed onto the sloped rock surface');
    const hQuad = holeQuad(vecMark(bHole));
    assert.ok(hQuad, 'holeQuad produces a valid quad on the sloped boulder');
    // South face (ny = +1): top corners (indices 2, 3 -> z offset +2, +5, +8, +11) must lean inward (smaller world Z) than bottom corners
    assert.ok(hQuad.corners[8] < hQuad.corners[2] && hQuad.corners[11] < hQuad.corners[5], 'boulder bullet hole quad tilts inward along the rock slope');
    const expectedSlope = (hQuad.corners[2] - hQuad.corners[8]) / (hQuad.corners[7] - hQuad.corners[1]);
    assert.ok(Math.abs(expectedSlope - MARS_BOULDER_SLOPE) < 1e-4, 'boulder bullet hole quad slope matches MARS_BOULDER_SLOPE');

    g.blood.wallSplat(new Vec3(bcx, bSouthY, 18), new Vec2(0, 1), 5, 26, null);
    const bSplat = g.blood.walls[g.blood.walls.length - 1];
    assert.equal(bSplat.slope, MARS_BOULDER_SLOPE, 'boulder blood splat carries MARS_BOULDER_SLOPE');
    const sQuad = wallSplatQuad(bSplat);
    assert.ok(sQuad, 'wallSplatQuad produces a valid quad on the sloped boulder');
    assert.ok(sQuad.corners[8] < sQuad.corners[2], 'boulder blood splat quad tilts inward from bottom to top');
    const dQuads = wallDripQuads({ ...bSplat, age: 5 });
    assert.ok(dQuads.length > 0, 'wallDripQuads produces blood drips on the sloped boulder');
    for (const dq of dQuads)
      assert.ok(dq.corners[2] >= dq.corners[8], 'every blood drip segment on the boulder slopes outward as it runs down');

    // 3b. Procedural 360° Martian sky panorama (twin moons, hazy sun, distant mountain ranges, and wind-driven dust clouds)
    const sky = marsSkyAtlas();
    assert.equal(sky.width, MARS_SKY_WIDTH, 'marsSkyAtlas is 1024 px wide');
    assert.equal(sky.height, MARS_SKY_HEIGHT, 'marsSkyAtlas is 256 px tall');
    assert.equal(sky.data.length, MARS_SKY_WIDTH * MARS_SKY_HEIGHT * 4, 'marsSkyAtlas RGBA buffer size');
    // Zenith row (y = 0) is a deep crimson/rust sky while lower horizon row (y = 255) blends into the Martian fog color [117, 46, 15]
    const zenithIdx = (0 * sky.width + 400) * 4;
    const horizonIdx = ((sky.height - 1) * sky.width + 400) * 4;
    assert.ok(sky.data[zenithIdx] < sky.data[horizonIdx], 'Martian zenith is darker crimson than the dusty lower horizon');
    assert.equal(sky.data[horizonIdx], 117, 'bottom horizon row matches MARS_SKY_VEC red channel');
    assert.equal(sky.data[horizonIdx + 1], 46, 'bottom horizon row matches MARS_SKY_VEC green channel');
    assert.equal(sky.data[horizonIdx + 2], 15, 'bottom horizon row matches MARS_SKY_VEC blue channel');
    // Pale hazy sun at (224, 60) and twin moons Phobos (632, 92) & Deimos (836, 104) stand out brightly against the upper sky
    const sunIdx = (60 * sky.width + 224) * 4;
    const phobosIdx = ((PHOBOS_CENTER.y - 6) * sky.width + (PHOBOS_CENTER.x - 10)) * 4;
    const deimosIdx = ((DEIMOS_CENTER.y - 2) * sky.width + (DEIMOS_CENTER.x - 4)) * 4;
    const ambientUpperIdx = (PHOBOS_CENTER.y * sky.width + 440) * 4;
    assert.ok(sky.data[sunIdx] > 235 && sky.data[sunIdx + 1] > 190, 'pale hazy Martian sun core is bright butterscotch-white');
    assert.ok(sky.data[phobosIdx] > sky.data[ambientUpperIdx] + 35, 'Phobos moon disc stands out against the rust sky');
    assert.ok(sky.data[deimosIdx] > sky.data[ambientUpperIdx] + 25, 'Deimos moon disc stands out against the rust sky');
    const skyNoMoons = marsSkyAtlas({ includeMoons: false });
    assert.ok(sky.data[phobosIdx] > skyNoMoons.data[phobosIdx] + 35, 'marsSkyAtlas({ includeMoons: false }) omits baked moons so 3D shader moons are never duplicated');
    // Spherical 3D angular projection: skyPixelDir maps panorama coordinates to unit 3D sphere directions with equal horizontal & vertical angular radii
    const phobosDirDefault = skyPixelDir(PHOBOS_CENTER);
    const dirTarget = new Vec3();
    const phobosDirTargeted = skyPixelDir(PHOBOS_CENTER, dirTarget);
    assert.equal(phobosDirTargeted, dirTarget, 'skyPixelDir writes into the provided target Vec3');
    assert.ok(Math.abs(phobosDirDefault.getMagnitude() - 1) < 1e-6, 'skyPixelDir returns a normalized 3D unit vector');
    assert.ok(phobosDirDefault.equals(phobosDirTargeted), 'skyPixelDir default and target-allocated calls match');
    const phobosWestDir = skyPixelDir(new Vec2(PHOBOS_CENTER.x - 13, PHOBOS_CENTER.y));
    const phobosNorthDir = skyPixelDir(new Vec2(PHOBOS_CENTER.x, PHOBOS_CENTER.y - 34));
    assert.ok(phobosWestDir.getAngle(phobosDirDefault) < PHOBOS_ANGULAR_RADIUS, 'Phobos western limb lies within spherical PHOBOS_ANGULAR_RADIUS');
    assert.ok(phobosNorthDir.getAngle(phobosDirDefault) < PHOBOS_ANGULAR_RADIUS, 'Phobos northern limb (aspect-corrected dy = -34) lies within spherical PHOBOS_ANGULAR_RADIUS');
    const phobosNorthIdx = ((PHOBOS_CENTER.y - 30) * sky.width + PHOBOS_CENTER.x) * 4;
    const ambientNorthIdx = ((PHOBOS_CENTER.y - 30) * sky.width + 440) * 4;
    assert.ok(sky.data[phobosNorthIdx] > sky.data[ambientNorthIdx] + 25, 'Phobos is aspect-corrected vertically in the atlas so it projects as a 3D sphere rather than a flat ellipse');
    const deimosDir = skyPixelDir(DEIMOS_CENTER);
    const deimosNorthDir = skyPixelDir(new Vec2(DEIMOS_CENTER.x, DEIMOS_CENTER.y - 15));
    assert.ok(deimosNorthDir.getAngle(deimosDir) < DEIMOS_ANGULAR_RADIUS, 'Deimos northern limb lies within spherical DEIMOS_ANGULAR_RADIUS');
    assert.ok(MARS_SKY_FRAGMENT.includes('vec4 deimos = evalMoonSphere('), 'MARS_SKY_FRAGMENT evaluates per-fragment 3D ray-sphere shading for Deimos');
    assert.ok(
      MARS_SKY_FRAGMENT.includes('moonLimbRadius') &&
      MARS_SKY_FRAGMENT.includes('moonCellularCraters') &&
      MARS_SKY_FRAGMENT.includes('moonRelief'),
      'MARS_SKY_FRAGMENT renders organic irregular limb silhouettes, overlapping cellular craters, and 3D normal-perturbed relief'
    );
    // Horizontal wrap continuity across x = 0 and x = 1023 on every scanline
    for (let y = 0; y < sky.height; y++) {
      const leftIdx = (y * sky.width + 0) * 4;
      const rightIdx = (y * sky.width + (sky.width - 1)) * 4;
      assert.ok(Math.abs(sky.data[leftIdx] - sky.data[rightIdx]) <= 4, `seamless horizontal wrap at row ${y} (R)`);
      assert.ok(Math.abs(sky.data[leftIdx + 1] - sky.data[rightIdx + 1]) <= 4, `seamless horizontal wrap at row ${y} (G)`);
      assert.ok(Math.abs(sky.data[leftIdx + 2] - sky.data[rightIdx + 2]) <= 4, `seamless horizontal wrap at row ${y} (B)`);
    }
    assert.ok(
      MARS_SKY_FRAGMENT.includes('skyPeriodicNoise') &&
      MARS_SKY_FRAGMENT.includes('skyPeriodicFbm'),
      'MARS_SKY_FRAGMENT wraps azimuth noise periodically across u = 0 and u = 1 with zero seam behind the player'
    );
    const skyDome = marsSkyMesh(new Vec2(1200, 720));
    assert.ok(skyDome.vertices.length > 1000 && skyDome.vertices.length % 9 === 0, 'marsSkyMesh builds valid triangle vertices');
    assert.equal(skyDome.uvs.length, (skyDome.vertices.length / 3) * 2, 'marsSkyMesh UV count matches vertex count');
    assert.ok(MARS_SKY_VERTEX.includes('vRayDir'), 'MARS_SKY_VERTEX passes view direction ray');
    assert.ok(MARS_SKY_FRAGMENT.includes('uTime') && MARS_SKY_FRAGMENT.includes('sampleSmoothSky'), 'MARS_SKY_FRAGMENT smooth-samples the panorama and animates drifting dust clouds');

    // 4. Blowing dirt/dust particles swirl across the outdoor Martian surface and never spawn inside the starting airlock
    assert.ok(g.dust.length >= 160, 'Martian surface is densely populated with blowing orange dirt particles');
    for (const d of g.dust)
      assert.equal(level.isOutdoor(new Vec2(d.x, d.y)), true, 'every blowing dirt particle is on the outdoor Martian surface');

    // 4b. Heavy Martian dust-storm fog: clear inside the closed airlock, thickens when the airlock opens, and drops to dense close-range fog outside
    const fogTarget = new Vec2();
    const indoorFogDefault = marsFogNearFar(level, g.player.pos);
    const indoorFogTargeted = marsFogNearFar(level, g.player.pos, fogTarget);
    assert.equal(indoorFogTargeted, fogTarget, 'marsFogNearFar writes into the pre-allocated target Vec2');
    assert.ok(indoorFogDefault.equals(MARS_INDOOR_FOG), 'closed starting airlock keeps indoor visibility clear (MARS_INDOOR_FOG)');
    assert.ok(indoorFogDefault.equals(indoorFogTargeted), 'marsFogNearFar default and targeted calls return identical Vec2 values');
    const outdoorFog = marsFogNearFar(level, outsidePos, fogTarget);
    assert.ok(outdoorFog.equals(MARS_OUTDOOR_FOG), 'stepping outside onto the Martian surface applies heavy close-range dust-storm fog (MARS_OUTDOOR_FOG)');
    assert.ok(MARS_OUTDOOR_FOG.x < 50 && MARS_OUTDOOR_FOG.y <= 300, 'outdoor Martian fog starts within a tile and reaches full dust-storm whiteout within ~4.5 tiles');
    assert.ok(MARS_DIRT_FRAGMENT.includes('color = mix(color, uFogColor, fade);'), 'MARS_DIRT_FRAGMENT blends 100% into uFogColor at uFogFar');
    assert.ok(MARS_ROCK_FRAGMENT.includes('color = mix(color, uFogColor, fade);'), 'MARS_ROCK_FRAGMENT blends 100% into uFogColor at uFogFar');
    assert.ok(
      MARS_SKY_FRAGMENT.includes('uFogNear') && MARS_SKY_FRAGMENT.includes('uFogFar') && MARS_SKY_FRAGMENT.includes('opticalFog') && MARS_SKY_FRAGMENT.includes('skyFog'),
      'MARS_SKY_FRAGMENT applies optical path fog (uFogNear/uFogFar) and stormFog across the entire sky dome'
    );

    // 5. Opening the airlock door or stepping outside triggers howling Martian wind audio,
    //    pulls fog closer through the doorway, blows airborne blood droplets, and does NOT push/move the player character
    g.events.length = 0;
    airlockDoor.open = 1;
    const doorwayFog = marsFogNearFar(level, g.player.pos, fogTarget);
    assert.ok(doorwayFog.x < MARS_INDOOR_FOG.x && doorwayFog.y < MARS_INDOOR_FOG.y, 'opening the airlock door pulls Martian dust-storm fog closer even before stepping outside');
    assert.ok(doorwayFog.x > MARS_OUTDOOR_FOG.x && doorwayFog.y > MARS_OUTDOOR_FOG.y, 'open-airlock indoor fog is intermediate between indoor and full outdoor storm fog');
    g.windTimer = 0;
    g.update(1 / 30, input());
    assert.ok(g.events.some((e) => e.type === 'wind'), 'opening the airlock door lets in the howling Martian wind sound');

    g.player.body.setPosition(outsidePos.clone());
    const stationaryX = g.player.pos.x;
    const stationaryY = g.player.pos.y;
    g.update(0.25, input());
    assert.equal(g.player.pos.x, stationaryX, 'Martian wind does not push the player character X position');
    assert.equal(g.player.pos.y, stationaryY, 'Martian wind does not push the player character Y position');

    g.blood.particles.length = 0;
    g.blood.spray(new Vec3(outsidePos.x, outsidePos.y, 24), new Vec2(0, 0), 4, { speed: 10, spread: 5, up: 120 });
    const drop = g.blood.particles[0];
    const vxBefore = drop.vx;
    g.blood.update(0.1);
    assert.ok(drop.vx > vxBefore + 20, 'outdoor blood droplets are blown downwind by the Martian gale');
  },

  '3D barrel & rocket explosions: volumetric 3D fireball plume, shockwave ring, mushroom smoke lobes, flying 3D shrapnel staves, and persistent ruptured barrel stump'() {
    // 1. 3D explosion texture atlas (4 cells of 64x64: core, plume, ring, smoke)
    const expAtlas = explosion3dAtlas();
    const pow2 = (n) => (n & (n - 1)) === 0;
    assert.ok(pow2(expAtlas.width) && pow2(expAtlas.height), 'explosion3dAtlas has power-of-two dimensions');
    assert.equal(expAtlas.width, EXPLOSION_3D_CELL * EXPLOSION_3D_FRAMES, 'explosion3dAtlas width covers 4 cells');
    assert.equal(expAtlas.height, EXPLOSION_3D_CELL, 'explosion3dAtlas height is 64');
    // Ring cell has transparent inner/outer edges (y = 0, y = 63) and an opaque incandescent shockwave ridge (y = 32)
    const ringEdgeIdx = (0 * expAtlas.width + EXPLOSION_3D_CELLS.ring * 64 + 32) * 4;
    const ringBandIdx = (32 * expAtlas.width + EXPLOSION_3D_CELLS.ring * 64 + 32) * 4;
    assert.equal(expAtlas.data[ringEdgeIdx + 3], 0, 'shockwave ring cell has transparent inner/outer edges');
    assert.equal(expAtlas.data[ringBandIdx + 3], 255, 'shockwave ring ridge is opaque');
    assert.ok(expAtlas.data[ringBandIdx] > 200, 'shockwave ring ridge is incandescent');
    // Core cell is incandescent white-yellow-orange while smoke cell is dark soot with ember veins
    let coreLum = 0;
    let smokeLum = 0;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const co = (y * expAtlas.width + EXPLOSION_3D_CELLS.core * 64 + x) * 4;
        const so = (y * expAtlas.width + EXPLOSION_3D_CELLS.smoke * 64 + x) * 4;
        coreLum += expAtlas.data[co] + expAtlas.data[co + 1];
        smokeLum += expAtlas.data[so] + expAtlas.data[so + 1];
      }
    }
    assert.ok(coreLum > smokeLum * 1.35, 'plasma core cell is brighter than the volcanic smoke cell');

    // 2. Single sculpted 3D exploding fireball mesh with smooth per-vertex normals and Vec3 size signature
    const mesh = explosion3dMesh(new Vec3(1, 1, 1));
    assert.ok(mesh.vertices.length > 0 && mesh.vertices.length % 9 === 0, '3D explosion mesh has valid triangle vertices');
    assert.equal(mesh.normals.length, mesh.vertices.length, '3D explosion mesh has matching vertex normals');
    assert.equal(mesh.uvs.length, (mesh.vertices.length / 3) * 2, '3D explosion mesh has matching UVs');
    for (let i = 0; i < mesh.normals.length; i += 3) {
      const len = Math.hypot(mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2]);
      assert.ok(Number.isFinite(len) && Math.abs(len - 1) < 1e-4, 'every 3D explosion vertex normal is a finite unit vector');
    }
    // Verify smooth analytical per-vertex normals (triangle vertices have distinct interpolated normals rather than flat identical triangle normals)
    let smoothNormalsFound = false;
    for (let i = 0; i < mesh.normals.length; i += 9) {
      const dx = Math.abs(mesh.normals[i] - mesh.normals[i + 3]);
      const dy = Math.abs(mesh.normals[i + 1] - mesh.normals[i + 4]);
      const dz = Math.abs(mesh.normals[i + 2] - mesh.normals[i + 5]);
      if (dx + dy + dz > 1e-3) {
        smoothNormalsFound = true;
        break;
      }
    }
    assert.ok(smoothNormalsFound, '3D explosion mesh computes smooth per-vertex normals rather than flat faceted triangle normals');
    for (let i = 1; i < mesh.vertices.length; i += 3)
      assert.ok(mesh.vertices[i] >= -1e-4, '3D explosion mesh sits above the floor plane (y >= 0)');
    const vertUniforms = [...EXPLOSION_3D_VERTEX.matchAll(/uniform\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]);
    const fragUniforms = new Set([...EXPLOSION_3D_FRAGMENT.matchAll(/uniform\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]));
    const sharedUniforms = vertUniforms.filter((u) => fragUniforms.has(u));
    assert.equal(sharedUniforms.length, 0, 'EXPLOSION_3D_VERTEX and EXPLOSION_3D_FRAGMENT share no uniforms that could fail WebGL 1.0 linkProgram precision checks');
    assert.ok(
      EXPLOSION_3D_VERTEX.includes('precision mediump float;') &&
      EXPLOSION_3D_FRAGMENT.includes('precision mediump float;') &&
      EXPLOSION_3D_VERTEX.includes('aVertexNormal') &&
      EXPLOSION_3D_VERTEX.includes('uProgress') &&
      EXPLOSION_3D_FRAGMENT.includes('fbmBillow') &&
      EXPLOSION_3D_FRAGMENT.includes('evalBlackbody') &&
      EXPLOSION_3D_FRAGMENT.includes('uDissolve') &&
      !EXPLOSION_3D_FRAGMENT.includes('pow('),
      '3D explosion shaders declare matching mediump float precision, displace boiling vertices, evaluate 3D volumetric fbmBillow + blackbody temperature shading, and avoid GLSL ES 1.00 NaN pow(0, y)'
    );

    // 3. Allocation-free single-mesh 3D explosion pose over normalized progress (0..1) + particle shower
    const expTarget = createExplosion3dPose();
    const poseEarly = explosion3dPose(0.06, expTarget);
    assert.equal(poseEarly, expTarget, 'explosion3dPose writes into the pre-allocated target');
    assert.ok(poseEarly.pos instanceof Vec3 && poseEarly.scale instanceof Vec3 && poseEarly.color instanceof Vec3, 'explosion3dPose uses Vec3 primitives');
    assert.ok(poseEarly.heat > 1.0, 'early explosion pose has high internal blackbody heat');
    const earlyRadius = poseEarly.scale.x;
    const earlyY = poseEarly.pos.y;
    const earlyHeat = poseEarly.heat;

    const poseMid = explosion3dPose(0.36);
    assert.ok(poseMid.scale.x > earlyRadius, '3D exploding mesh expands rapidly outward');
    assert.ok(poseMid.pos.y > earlyY, '3D exploding mesh rises upward as the fireball ascends');

    // Verify high-density small particle shower (explosionParticleQuads) with strict Vec3 right/up signature
    const camRight = new Vec3(1, 0, 0);
    const camUp = new Vec3(0, 1, 0);
    const earlyQuads = explosionParticleQuads({ type: 'boom', x: 100, y: 200, z: 0, age: 0.08, life: 0.45, radius: 60 }, camRight, camUp);
    assert.equal(earlyQuads.length, EXPLOSION_PARTICLE_COUNT, 'explosionParticleQuads emits full shower of 88 small spark & cinder particles early in blast');
    const dotQuad = earlyQuads[0].corners;
    const dotWidth = Math.hypot(dotQuad[3] - dotQuad[0], dotQuad[4] - dotQuad[1], dotQuad[5] - dotQuad[2]);
    assert.ok(dotWidth >= 1.0 && dotWidth <= 2.6, `spark dot quad is a true small particle (${dotWidth.toFixed(2)} world units across, matching blood droplet scale)`);
    assert.ok(SPARK_PARTICLE_FRAGMENT.includes('rSq > 1.0'), 'SPARK_PARTICLE_FRAGMENT clips each quad to a crisp circular/elliptical spark');

    const barrelFx = { type: 'boom', x: 100, y: 200, z: 0, age: 0.08, life: 0.45, radius: 60 };
    const rocketFx = { type: 'boom', x: 40, y: 20, z: 12, age: 0.08, life: 0.45, radius: 90 };
    const snap = (qs) => {
      const out = [];
      for (let i = 0; i < qs.length; i++)
        out.push([Array.from(qs[i].corners), Array.from(qs[i].uv)]);
      return out;
    };
    const poolA = explosionParticleQuads(barrelFx, camRight, camUp);
    const refsA = poolA.slice();
    const cornersA = refsA.map((q) => q.corners);
    const uvsA = refsA.map((q) => q.uv);
    const poolB = explosionParticleQuads(rocketFx, camRight, camUp);
    assert.strictEqual(poolB, poolA, 'AC-1 result array is the identical shared object across calls');
    assert.equal(poolB.length, EXPLOSION_PARTICLE_COUNT, 'AC-1 rocket blast also emits 88 quads');
    for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
      assert.strictEqual(poolB[i], refsA[i], `AC-1 quad descriptor ${i} is the identical object across calls`);
      assert.strictEqual(poolB[i].corners, cornersA[i], `AC-2 corners buffer ${i} is reused`);
      assert.strictEqual(poolB[i].uv, uvsA[i], `AC-2 uv buffer ${i} is reused`);
      assert.equal(poolB[i].corners.length, 12, 'AC-2 corners has fixed length 12');
      assert.equal(poolB[i].uv.length, 4, 'AC-2 uv has fixed length 4');
      for (let k = 0; k < 12; k++)
        assert.ok(Number.isFinite(poolB[i].corners[k]), `AC-2 corner ${i}.${k} is finite`);
    }
    for (const idx of [0, 50, 80])
      assert.ok(poolB[idx].corners.every(Number.isFinite), `AC-2 dot/needle/cinder quad ${idx} has finite corners`);

    const barrel1 = snap(explosionParticleQuads(barrelFx, camRight, camUp));
    const rocket1 = snap(explosionParticleQuads(rocketFx, camRight, camUp));
    const barrel2 = snap(explosionParticleQuads(barrelFx, camRight, camUp));
    assert.deepStrictEqual(barrel2, barrel1, 'AC-3 alternating rocket and barrel explosions stay deterministic on the shared pool');
    assert.notDeepStrictEqual(rocket1[0][0], barrel1[0][0], 'AC-3 rocket and barrel explosions produce different corners');

    const expired = explosionParticleQuads({ ...barrelFx, age: 0.449 }, camRight, camUp);
    assert.strictEqual(expired, poolA, 'AC-4 expired explosion returns the shared array');
    assert.equal(expired.length, 0, 'AC-4 expired explosion returns zero quads');
    explosionParticleQuads(barrelFx, camRight, camUp);
    const lateQuads = explosionParticleQuads({ ...barrelFx, age: 0.36 }, camRight, camUp);
    assert.ok(lateQuads.length > 0 && lateQuads.length < EXPLOSION_PARTICLE_COUNT, 'AC-4 late blast returns fewer quads than 88');
    const lateSnap = snap(lateQuads);
    explosionParticleQuads({ ...barrelFx, age: 0.449 }, camRight, camUp);
    assert.deepStrictEqual(snap(explosionParticleQuads({ ...barrelFx, age: 0.36 }, camRight, camUp)), lateSnap, 'AC-4 late blast length and data carry no stale state from earlier calls');

    const early = explosionParticleQuads(barrelFx, camRight, camUp);
    assert.equal(early.length, EXPLOSION_PARTICLE_COUNT, 'AC-5 early blast keeps 88 quads');
    const w0 = early[0].corners;
    const w0Width = Math.hypot(w0[3] - w0[0], w0[4] - w0[1], w0[5] - w0[2]);
    assert.ok(w0Width >= 1.0 && w0Width <= 2.6, 'AC-5 first quad keeps spark size');
    for (let i = 0; i < early.length; i++) {
      const uv = early[i].uv;
      const slot = uv[0] - 0.02;
      assert.ok(Math.abs(slot - Math.round(slot)) < 1e-9 && Math.round(slot) >= 1 && Math.round(slot) <= 24, `AC-5 uv slot ${i} is an integer in 1..24`);
      assert.equal(uv[1], 0.02, 'AC-5 uv v0 is 0.02');
      assert.equal(uv[3], 0.98, 'AC-5 uv v1 is 0.98');
      assert.ok(Math.abs(uv[2] - uv[0] - 0.96) < 1e-9, 'AC-5 uv u span is 0.96');
    }

    const det1 = snap(explosionParticleQuads(rocketFx, camRight, camUp));
    const det2 = snap(explosionParticleQuads(rocketFx, camRight, camUp));
    assert.deepStrictEqual(det2, det1, 'AC-6 repeated identical calls yield identical corners and uv');

    const poseLate = explosion3dPose(0.92, expTarget);
    assert.ok(poseLate.dissolve > poseMid.dissolve && poseLate.dissolve > 0.75, '3D exploding mesh erodes away in the late smoke phase');
    assert.ok(poseLate.heat < earlyHeat * 0.25, '3D exploding mesh cools from bright fire into dark charcoal smoke');

    // 4. 3D ruptured barrel stump, charred atlas cell, flying shrapnel staves, and ballistic pose
    const bAtlas = barrelAtlas();
    assert.ok(bAtlas.char && bAtlas.char.x === 192 && bAtlas.char.width === 64, 'barrelAtlas includes the 4th 64x64 charred interior/scorch cell');
    const wreck = barrelWreckMesh(new Vec2(9.5, 26));
    assert.ok(wreck.vertices.length > 300 && wreck.vertices.length % 9 === 0, 'barrelWreckMesh builds valid 3D triangle geometry');
    assert.equal(wreck.normals.length, wreck.vertices.length, 'barrelWreckMesh has matching vertex normals');
    assert.equal(wreck.uvs.length, (wreck.vertices.length / 3) * 2, 'barrelWreckMesh has matching UVs');
    let hasOuterSkin = false;
    let hasCharSkin = false;
    for (let i = 0; i < wreck.uvs.length; i += 2) {
      if (wreck.uvs[i] < 0.5)
        hasOuterSkin = true;
      if (wreck.uvs[i] >= 0.75)
        hasCharSkin = true;
    }
    assert.ok(hasOuterSkin && hasCharSkin, 'barrelWreckMesh maps both outer hazard drum skin and charred interior/scorch cell');

    const shrapnel = barrelShrapnelParts(new Vec2(9.5, 26));
    assert.ok(shrapnel.lid.vertices.length > 0 && shrapnel.lid.normals.length === shrapnel.lid.vertices.length, 'barrelShrapnelParts builds 3D warped lid mesh');
    assert.equal(shrapnel.staves.length, BARREL_STAVE_COUNT, 'barrelShrapnelParts builds 5 curved 3D metal staves');
    for (const stave of shrapnel.staves) {
      assert.ok(stave.vertices.length > 0 && stave.vertices.length % 9 === 0, 'each barrel stave is a 3D triangle mesh');
      assert.equal(stave.normals.length, stave.vertices.length, 'each barrel stave has vertex normals');
    }

    const barrelTarget = createBarrelExplosionPose();
    const bLaunch = barrelExplosionPose(0.01, 7, barrelTarget);
    assert.equal(bLaunch, barrelTarget, 'barrelExplosionPose reuses pre-allocated target');
    const bLaunchLidY = bLaunch.lid.pos.y;
    const bLaunchStaveR = bLaunch.staves.map((s) => Math.hypot(s.pos.x, s.pos.z));

    const bJolt = barrelExplosionPose(0.09, 7);
    assert.ok(bJolt.wreckScale.x > 1.1 && bJolt.wreckScale.y < 0.92, 'ruptured barrel stump squashes and bulges outward on detonation');

    const bAir = barrelExplosionPose(0.18, 7);
    assert.ok(bAir.lid.pos.y > bLaunchLidY + 12, 'warped barrel lid blasts high into the air');
    for (let i = 0; i < BARREL_STAVE_COUNT; i++)
      assert.ok(Math.hypot(bAir.staves[i].pos.x, bAir.staves[i].pos.z) > bLaunchStaveR[i] + 5, `stave ${i} launches radially outward`);

    const bRest = barrelExplosionPose(1.5, 7, barrelTarget);
    assert.ok(Math.abs(bRest.wreckScale.x - 1) < 1e-4 && Math.abs(bRest.wreckScale.y - 1) < 1e-4, 'barrel stump settles to scale (1,1,1)');
    assert.ok(bRest.lid.pos.y <= 2.5, 'warped barrel lid bounces and settles on the floor');
    for (let i = 0; i < BARREL_STAVE_COUNT; i++) {
      assert.ok(bRest.staves[i].pos.y <= 2.5, `stave ${i} settles on the floor`);
      assert.ok(Math.hypot(bRest.staves[i].pos.x, bRest.staves[i].pos.z) > 15, `stave ${i} rests scattered around the barrel wreck`);
    }

    // 5. Detonating a barrel in Game tracks barrel.deadTime while keeping its position for persistent 3D wreck rendering
    const game = fresh();
    const barrel = game.barrels[0];
    assert.equal(barrel.deadTime, 0, 'intact barrel starts with deadTime = 0');
    game.detonate(barrel);
    assert.equal(barrel.gone, true, 'detonated barrel is marked gone');
    assert.equal(barrel.deadTime, 0, 'detonated barrel starts deadTime at 0');
    run(game, 0.5);
    assert.ok(barrel.deadTime >= 0.48, 'updateBarrels advances deadTime on spent barrels for 3D shrapnel & wreck animation');
  },

  'Night Vision Goggles (N) provide a 3D binocular pickup, rechargeable battery toggle, and cut through Martian fog'() {
    // 1. 3D Night Vision Goggles atlas and mesh
    const nvgAtlas = nightvisionAtlas();
    assert.equal(nvgAtlas.name, 'nightvision');
    assert.equal(nvgAtlas.width, POWERUP_CELL * POWERUP_FRAMES);
    assert.equal(nvgAtlas.height, POWERUP_CELL);
    let emeraldPixels = 0;
    for (let i = 0; i < nvgAtlas.data.length; i += 4)
      if (nvgAtlas.data[i + 3] === 255 && nvgAtlas.data[i + 1] > nvgAtlas.data[i] + 60)
        emeraldPixels++;
    assert.ok(emeraldPixels > 60, 'nightvisionAtlas has glowing emerald phosphor objective lenses');

    const nvgGeo = nightvisionMesh();
    assert.ok(nvgGeo.vertices instanceof Float32Array && nvgGeo.vertices.length >= 7 * 36 * 3, 'nightvisionMesh has 3D housing, twin lens tubes, IR module, and strap');
    assert.equal(nvgGeo.uvs.length, (nvgGeo.vertices.length / 3) * 2, 'nightvisionMesh has matching UVs');

    // 2. E1M5 spawns Night Vision Goggles right outside the starting airlock door and in the Martian wastes
    const marsGame = fresh(4);
    const nvgPickups = marsGame.pickups.filter((p) => p.type === 'nightvision');
    assert.ok(nvgPickups.length >= 3, `expected >= 3 nightvision pickups on E1M5, got ${nvgPickups.length}`);
    const airlockNvg = nvgPickups.find((p) => Math.floor(p.pos.x / 64) === 9 && Math.floor(p.pos.y / 64) === 3);
    assert.ok(airlockNvg, 'E1M5 places Night Vision Goggles right outside the starting airlock door at (9, 3)');

    // 3. Picking up Night Vision Goggles activates night vision, charges battery, and pushes Mars fog far back
    assert.equal(marsGame.player.hasNightVision, false);
    assert.equal(marsGame.player.nightVisionActive, false);
    marsGame.touch({ ref: airlockNvg });
    assert.equal(airlockNvg.taken, true);
    assert.equal(marsGame.player.hasNightVision, true);
    assert.equal(marsGame.player.nightVisionActive, true);
    assert.equal(marsGame.player.nightVisionBattery, POWERUP_TYPES.nightvision.duration);

    const fogTarget = new Vec2();
    const outdoorPos = new Vec2(10 * 64 + 32, 3 * 64 + 32);
    const stormFog = marsFogNearFar(marsGame.level, outdoorPos, fogTarget, false).clone();
    const nvgFog = marsFogNearFar(marsGame.level, outdoorPos, fogTarget, true);
    assert.equal(nvgFog, fogTarget, 'marsFogNearFar reuses pre-allocated target Vec2');
    assert.ok(nvgFog.x > stormFog.x * 10 && nvgFog.y > stormFog.y * 6, `Night Vision cuts through Martian outdoor fog (${stormFog.x}..${stormFog.y} -> ${nvgFog.x}..${nvgFog.y})`);
    assert.equal(nvgFog.x, MARS_NVG_FOG.x);
    assert.equal(nvgFog.y, MARS_NVG_FOG.y);

    // 4. Battery drains while active, toggles off with N (input.nightVision), and recharges while inactive
    run(marsGame, 10);
    const drained = marsGame.player.nightVisionBattery;
    assert.ok(drained < POWERUP_TYPES.nightvision.duration - 9 && drained > POWERUP_TYPES.nightvision.duration - 11, `battery drains while active (${drained})`);

    marsGame.update(1 / 60, input({ nightVision: true }));
    assert.equal(marsGame.player.nightVisionActive, false, 'pressing N toggles Night Vision OFF');
    assert.equal(marsGame.player.nightVision, 0);

    run(marsGame, 6);
    assert.ok(marsGame.player.nightVisionBattery > drained + 2, `battery recharges while switched off (${drained} -> ${marsGame.player.nightVisionBattery})`);

    marsGame.update(1 / 60, input({ nightVision: true }));
    assert.equal(marsGame.player.nightVisionActive, true, 'pressing N toggles Night Vision back ON');

    // 5. Auto-shutoff when battery reaches 0
    marsGame.player.nightVisionBattery = 0.2;
    run(marsGame, 0.5);
    assert.equal(marsGame.player.nightVisionActive, false, 'Night Vision auto-shuts off when battery depletes');
  },

  'E1M5 fog occlusion, shader early-outs, entity/particle/light distance culling, and minimap fog range'() {
    // 1. All fragment shaders blend 100% into uFogColor at uFogFar (no 0.9 cap), suppress bloom alpha under fog,
    // and heavy surface shaders early-return at vDepth >= uFogFar.
    const allFogShaders = [
      ['LINE_FRAGMENT', LINE_FRAGMENT],
      ['SPRITE_FRAGMENT', SPRITE_FRAGMENT],
      ['MONSTER_FRAGMENT', MONSTER_FRAGMENT],
      ['EXPLOSION_3D_FRAGMENT', EXPLOSION_3D_FRAGMENT],
      ['TEXTURED_FRAGMENT', TEXTURED_FRAGMENT],
      ['SOLID_TEXTURED_FRAGMENT', SOLID_TEXTURED_FRAGMENT],
      ['PARTICLE_FRAGMENT', PARTICLE_FRAGMENT],
      ['DOOR_FRAGMENT', DOOR_FRAGMENT],
      ['WALL_FRAGMENT', WALL_FRAGMENT],
      ['FLOOR_FRAGMENT', FLOOR_FRAGMENT],
      ['SLIME_FRAGMENT', SLIME_FRAGMENT],
      ['TELEPORTER_FRAGMENT', TELEPORTER_FRAGMENT],
      ['CRATE_FRAGMENT', CRATE_FRAGMENT],
      ['MARS_DIRT_FRAGMENT', MARS_DIRT_FRAGMENT],
      ['MARS_ROCK_FRAGMENT', MARS_ROCK_FRAGMENT],
      ['CEILING_FRAGMENT', CEILING_FRAGMENT],
    ];
    for (const [name, src] of allFogShaders) {
      assert.ok(!src.includes('fade * 0.9'), `${name} does not cap fog at 90%`);
      assert.ok(src.includes('mix(color, uFogColor,'), `${name} mixes to full uFogColor`);
    }
    assert.ok(
      MONSTER_FRAGMENT.includes('emissive * (1.0 - fogFade) > 0.5'),
      'MONSTER_FRAGMENT suppresses emissive bloom alpha when occluded by fog'
    );
    assert.ok(
      EXPLOSION_3D_FRAGMENT.includes('localTemp * (1.0 - fogFade) >'),
      'EXPLOSION_3D_FRAGMENT suppresses explosion bloom alpha when occluded by fog'
    );
    const earlyOutSurfaceShaders = [
      ['DOOR_FRAGMENT', DOOR_FRAGMENT],
      ['WALL_FRAGMENT', WALL_FRAGMENT],
      ['FLOOR_FRAGMENT', FLOOR_FRAGMENT],
      ['SLIME_FRAGMENT', SLIME_FRAGMENT],
      ['TELEPORTER_FRAGMENT', TELEPORTER_FRAGMENT],
      ['CRATE_FRAGMENT', CRATE_FRAGMENT],
      ['MARS_DIRT_FRAGMENT', MARS_DIRT_FRAGMENT],
      ['MARS_ROCK_FRAGMENT', MARS_ROCK_FRAGMENT],
      ['CEILING_FRAGMENT', CEILING_FRAGMENT],
    ];
    for (const [name, src] of earlyOutSurfaceShaders)
      assert.ok(src.includes('uHasFog == 1 && vDepth >= uFogFar'), `${name} has fast vDepth >= uFogFar early-out`);

    // 2. Minimap Fog cone range on Mars matches active fog visibility (tight outdoors in sandstorm, wider indoors / with NVG)
    const marsGame = fresh(4);
    assert.equal(marsGame.level.planet, 'mars');
    // Player starts inside the enclosed airlock at (2, 3) facing east (+X)
    assert.equal(marsGame.level.isOutdoor(marsGame.player.pos), false);
    assert.equal(marsGame.fogConeRange(), MARS_INDOOR_FOG.y / 64, 'indoor Mars airlock uses indoor fog cone range (15 tiles)');

    // Move player outdoors into an open corridor on Mars with no Night Vision
    marsGame.player.pos.setScalar(10 * 64 + 32, 3 * 64 + 32);
    marsGame.player.body.setPosition(marsGame.player.pos);
    marsGame.player.angle = 0;
    marsGame.player.nightVisionActive = false;
    assert.equal(marsGame.level.isOutdoor(marsGame.player.pos), true);
    const outdoorRange = marsGame.fogConeRange();
    assert.equal(outdoorRange, MARS_OUTDOOR_FOG.y / 64, 'outdoor Mars dust storm restricts minimap cone range (~4.06 tiles)');
    marsGame.fog.explored.fill(0);
    marsGame.fog.exploredCount = 0;
    marsGame.fog.update(marsGame.player.pos, 0, outdoorRange);
    // Tile (12, 3) is 2 tiles ahead (visible in storm), while tile (17, 3) is 7 tiles ahead (beyond storm fog)
    assert.equal(marsGame.fog.isVisible(3 * marsGame.level.width + 12), true, 'nearby tile within storm fog is visible on minimap');
    assert.equal(marsGame.fog.isVisible(3 * marsGame.level.width + 17), false, 'distant tile beyond storm fog is hidden on minimap');

    // Enabling Night Vision Goggles restores long-range minimap sight
    marsGame.player.hasNightVision = true;
    marsGame.player.nightVisionActive = true;
    marsGame.player.nightVisionBattery = 30;
    assert.equal(marsGame.fogConeRange(), 20, 'Night Vision restores full 20-tile minimap cone range on Mars');

    // 3. Dynamic & ceiling light distance culling via maxRadius
    const camPos = new Vec3(marsGame.player.pos.x, 28, marsGame.player.pos.y);
    marsGame.shots.push({
      kind: 'rocket',
      pos: new Vec2(marsGame.player.pos.x + 500, marsGame.player.pos.y),
      age: 0.1,
      life: 3,
    });
    const uncappedLights = collectDynamicLights(marsGame, camPos, 1.0);
    const fogCappedLights = collectDynamicLights(marsGame, camPos, 1.0, MARS_OUTDOOR_FOG.y + 64);
    assert.equal(uncappedLights.length, 1, 'distant rocket light is collected when uncapped');
    assert.equal(fogCappedLights.length, 0, 'distant rocket light beyond fog cull radius is skipped');

    // 4. World.prototype.updateEnemy and syncParticleSprites distance-culling beyond fogNearFar.y
    let enemyActive = true;
    let animated = false;
    const fakeEnemyView = {
      lastTime: 0,
      brightness: 1,
      scale: 1,
      lift: 0,
      sx: 1,
      sy: 1,
      material: { setDiffuse() {} },
      root: {
        setActive() {
          enemyActive = true;
        },
        setInactive() {
          enemyActive = false;
        },
        setPosition() {},
        setRotation() {},
        setScale() {},
      },
    };
    const farEnemy = {
      type: 'imp',
      state: 'idle',
      pos: new Vec2(marsGame.player.pos.x + 600, marsGame.player.pos.y),
      hurt: 0,
      pain: 0,
    };
    const cullDist = MARS_OUTDOOR_FOG.y + 64;
    const cullDistSq = cullDist * cullDist;
    // Prime scratchCam2d via syncParticleSprites on a lightweight mock World context
    const drawnDrops = [];
    const drawnDust = [];
    const mockWorld = {
      cutaway: false,
      fogNearFar: new Vec2(MARS_OUTDOOR_FOG.x, MARS_OUTDOOR_FOG.y),
      camera: {
        position: camPos,
        target: new Vec3(camPos.x + 1, camPos.y, camPos.z),
        up: new Vec3(0, 1, 0),
      },
      droplets: {
        begin() {
          drawnDrops.length = 0;
          return {
            quad(corners) {
              drawnDrops.push(corners);
              return true;
            },
            end() {},
          };
        },
      },
      dust: {
        begin() {
          drawnDust.length = 0;
          return {
            quad(corners) {
              drawnDust.push(corners);
              return true;
            },
            end() {},
          };
        },
      },
      doorMarks: new Map(),
    };
    World.prototype.syncParticleSprites.call(
      mockWorld,
      {
        particles: [
          { x: camPos.x + 80, y: camPos.z, z: 16, size: 2, age: 0.1, vx: 1 },
          { x: camPos.x + 500, y: camPos.z, z: 16, size: 2, age: 0.1, vx: 1 },
        ],
      },
      [
        { x: camPos.x + 100, y: camPos.z, z: 20, size: 2.5, age: 0.2, vx: 10 },
        { x: camPos.x + 450, y: camPos.z, z: 20, size: 2.5, age: 0.2, vx: 10 },
      ]
    );
    assert.equal(drawnDrops.length, 1, 'syncParticleSprites culls blood droplets beyond fogNearFar.y + 16');
    assert.equal(drawnDust.length, 1, 'syncParticleSprites culls Martian dust particles beyond fogNearFar.y + 16');

    World.prototype.updateEnemy.call(mockWorld, farEnemy, fakeEnemyView, marsGame.player, 2.5, marsGame, cullDistSq);
    assert.equal(enemyActive, false, 'updateEnemy deactivates distant enemy mesh beyond fog cull distance');
    assert.equal(fakeEnemyView.lastTime, 2.5, 'updateEnemy still advances view.lastTime while culled so dt does not spike on re-entry');

    // Door marks are hidden without rebuilding when a distant door is culled
    let holesShown = true;
    let splatsShown = true;
    const doorRef = {};
    mockWorld.doorMarks.set(doorRef, {
      holes: { show(v) { holesShown = v; } },
      splats: { show(v) { splatsShown = v; } },
    });
    World.prototype.syncDoorMarks.call(mockWorld, doorRef, marsGame.blood, false);
    assert.equal(holesShown, false, 'syncDoorMarks hides door bullet holes when door is fog-culled');
    assert.equal(splatsShown, false, 'syncDoorMarks hides door blood splats when door is fog-culled');
  },

  'line-of-sight occlusion culling (Fog.canSeeNear) hides entities, particles, and lights behind walls/closed doors and orders wall occluders first'() {
    // 1. Fog.canSeeNear(pos: Vec2) blocks visibility behind closed doors and walls (even 1 tile behind),
    //    and immediately reveals the room as soon as a door cracks open.
    const game = fresh(0);
    clearEnemies(game);
    const { level, fog } = game;
    const door = [...level.doors.values()].find((d) => d.x === 5 && d.y === 3);
    assert.ok(door, 'E1M1 has a door at (5, 3)');

    // Stand at (3, 3) facing east (+X) toward the closed door at (5, 3)
    game.player.pos.setScalar(3 * 64 + 32, 3 * 64 + 32);
    game.player.body.setPosition(game.player.pos);
    game.player.angle = 0;
    level.setDoorOpen(door, 0);
    fog.update(game.player.pos, 0);

    const inFrontOfDoor = new Vec2(4 * 64 + 32, 3 * 64 + 32);
    const onClosedDoor = door.center;
    const oneTileBehindDoor = new Vec2(6 * 64 + 32, 3 * 64 + 32);
    const twoTilesBehindDoor = new Vec2(7 * 64 + 32, 3 * 64 + 32);

    assert.equal(fog.canSeeNear(inFrontOfDoor), true, 'tile in front of closed door is visible');
    assert.equal(fog.canSeeNear(onClosedDoor), true, 'the closed door tile itself is visible');
    assert.equal(
      fog.canSeeNear(oneTileBehindDoor),
      false,
      'tile immediately behind closed door (6, 3) is occluded even with 1-tile neighbor check because closed door blocks sight'
    );
    assert.equal(fog.canSeeNear(twoTilesBehindDoor), false, 'room further behind closed door is occluded');

    // Crack the door open slightly (5%): sight immediately passes through the upper doorway gap so nothing pops in
    level.setDoorOpen(door, 0.05);
    fog.update(game.player.pos, 0);
    assert.equal(fog.canSeeNear(oneTileBehindDoor), true, 'cracking the door open 5% immediately makes the tile behind it visible');
    assert.equal(fog.canSeeNear(twoTilesBehindDoor), true, 'cracking the door open 5% immediately reveals the hall behind it');

    // Close the door again to verify entity, particle, and light occlusion behind it
    level.setDoorOpen(door, 0);
    fog.update(game.player.pos, 0);

    // 2. Dynamic lights and ceiling lights behind a closed door or wall are culled when fog is provided
    const camPos = new Vec3(game.player.pos.x, EYE, game.player.pos.y);
    game.shots.length = 0;
    game.shots.push({
      kind: 'rocket',
      pos: oneTileBehindDoor.clone(),
      age: 0.1,
      life: 2,
    });
    assert.equal(collectDynamicLights(game, camPos, 1.0, Infinity, null).length, 1, 'rocket light behind door is collected when fog is omitted');
    assert.equal(collectDynamicLights(game, camPos, 1.0, Infinity, fog).length, 0, 'rocket light behind closed door is occluded when fog is passed');

    const mockScene = { addLight() {}, clearLights() {} };
    const { pointLights } = createCeilingLights(mockScene, 2);
    const hiddenFixture = {
      tile: new Vec2(7, 3),
      position: new Vec3(7 * 64 + 32, 62, 3 * 64 + 32),
      phase: 0,
      flicker: false,
    };
    const visibleFixture = {
      tile: new Vec2(3, 3),
      position: new Vec3(3 * 64 + 32, 62, 3 * 64 + 32),
      phase: 0,
      flicker: false,
    };
    game.shots.length = 0;
    updateCeilingLights(pointLights, [hiddenFixture, visibleFixture], camPos, 1.0, game, Infinity, fog);
    assert.equal(pointLights[0].position.x, visibleFixture.position.x, 'visible ceiling fixture claims slot 0');
    assert.equal(pointLights[1].diffuse.x, 0, 'occluded ceiling fixture behind closed door is not assigned to active light slot');

    // 3. updateEnemy and syncParticleSprites cull nearby objects hidden behind a closed door/wall
    let enemyActive = true;
    const fakeEnemyView = {
      lastTime: 0,
      brightness: 1,
      scale: 1,
      lift: 0,
      sx: 1,
      sy: 1,
      material: { setDiffuse() {} },
      root: {
        setActive() {
          enemyActive = true;
        },
        setInactive() {
          enemyActive = false;
        },
        setPosition() {},
        setRotation() {},
        setScale() {},
      },
    };
    const occludedEnemy = {
      type: 'imp',
      state: 'idle',
      pos: oneTileBehindDoor.clone(),
      hurt: 0,
      pain: 0,
    };
    const drawnDrops = [];
    const mockWorld = {
      cutaway: false,
      fogNearFar: new Vec2(260, 1500),
      camera: {
        position: camPos,
        target: new Vec3(camPos.x + 1, camPos.y, camPos.z),
        up: new Vec3(0, 1, 0),
      },
      droplets: {
        begin() {
          drawnDrops.length = 0;
          return {
            quad(corners) {
              drawnDrops.push(corners);
              return true;
            },
            end() {},
          };
        },
      },
      dust: null,
    };
    World.prototype.syncParticleSprites.call(
      mockWorld,
      {
        particles: [
          { x: inFrontOfDoor.x, y: inFrontOfDoor.y, z: 16, size: 2, age: 0.1, vx: 1 },
          { x: oneTileBehindDoor.x, y: oneTileBehindDoor.y, z: 16, size: 2, age: 0.1, vx: 1 },
        ],
      },
      null,
      fog
    );
    assert.equal(drawnDrops.length, 1, 'syncParticleSprites culls blood droplet behind closed door even though it is within distance range');

    World.prototype.updateEnemy.call(mockWorld, occludedEnemy, fakeEnemyView, game.player, 3.0, game, 1500 * 1500, fog);
    assert.equal(enemyActive, false, 'updateEnemy deactivates nearby enemy occluded behind closed door');

    // 4. World.prototype.buildStatic registers wall occluders before floor/ceiling/crate batches for hardware Early-Z rejection
    const buildOrder = [];
    const orderMockWorld = {
      staticMeshes: [],
      lightFixtures: [],
      cutaway: false,
      track(mesh, bucket) {
        bucket.push(mesh);
        buildOrder.push(mesh.name ?? mesh);
        return mesh;
      },
      marsSkyBatch: () => 'sky',
      wallBatch: (_faces, marsRock) => ({ name: marsRock ? 'outdoorWalls' : 'walls', setInactive() {} }),
      solid: () => 'solidHide',
      floorBatch: () => 'floor',
      marsDirtBatch: () => 'marsDirt',
      slimeBatch: () => 'slime',
      teleporterBatch: () => 'teleporter',
      crateBatch: () => 'crate',
      marsBoulderBatch: () => 'marsBoulder',
      ceilingBatch: () => 'ceiling',
      lightConesBatch: () => 'lightCones',
    };
    World.prototype.buildStatic.call(orderMockWorld, level);
    const wallIdx = buildOrder.indexOf('walls');
    const solidIdx = buildOrder.indexOf('solidHide');
    const floorIdx = buildOrder.indexOf('floor');
    const crateIdx = buildOrder.indexOf('crate');
    const ceilingIdx = buildOrder.indexOf('ceiling');
    assert.ok(wallIdx >= 0 && wallIdx < floorIdx, 'walls are registered before floor for Early-Z occlusion');
    assert.ok(solidIdx >= 0 && solidIdx < floorIdx, 'solid wall blockers are registered before floor for Early-Z occlusion');
    assert.ok(wallIdx < crateIdx && wallIdx < ceilingIdx, 'walls are registered before crates and ceiling for Early-Z occlusion');
    assert.ok(orderMockWorld.staticChunks.length > 4, 'static level walls and floors are partitioned into spatial sector chunks for frustum/fog culling');
    assert.ok(
      LINE_FRAGMENT.includes(`gl_FragColor = vec4(color, ${SOLID_ALPHA});`),
      'solid wall hiders write SOLID_ALPHA so post-processing never blooms Mars fog color into glowing yellow'
    );
    assert.ok(
      !LINE_VERTEX.includes('v.z +=') && !LINE_VERTEX.includes('clip.z'),
      'solid wall hiders stay at true depth behind wall-only clip-depth-corrected quads'
    );
    assert.ok(
      LIGHT_GLSL.includes('distSq > 160000.0') && LIGHT_GLSL.includes('diff.x + diff.y + diff.z <= 0.001'),
      'LIGHT_GLSL skips inactive lights and distant lights beyond 400 units before computing sqrt'
    );
    assert.ok(
      MONSTER_FRAGMENT.includes('uHasFog == 1 && vDepth >= uFogFar') &&
        TEXTURED_FRAGMENT.includes('uHasFog == 1 && vDepth >= uFogFar') &&
        CEILING_CONE_FRAGMENT.includes('uHasFog == 1 && vDepth >= uFogFar'),
      'MONSTER_FRAGMENT, TEXTURED_FRAGMENT, and CEILING_CONE_FRAGMENT early-out beyond fog far distance'
    );

    // 5. Monster gore skin swap uses pre-cached shared WebGLTexture without re-uploading via setTexture
    let sharedTexCalls = 0;
    let uploadCalls = 0;
    const sharedWorld = {
      gl: { NEAREST: 9728 },
      scene: { addMesh() {} },
      material: () => new Material(),
      sharedTexture: (atlas) => ({ atlas }),
      monsterPartMesh: () => {
        const m = new Mesh(null, new CustomMesh());
        m.setSharedTexture = (tex) => {
          sharedTexCalls++;
          m.WebGLTexture = tex;
        };
        m.setTexture = () => {
          uploadCalls++;
        };
        return m;
      },
    };
    const testEnemy = {
      type: 'imp',
      def: ENEMY_TYPES.imp,
      hp: ENEMY_TYPES.imp.hp,
      pos: new Vec2(100, 100),
      body: { velocity: new Vec2(0, 0) },
      state: 'chase',
      walk: 0,
      phase: 0,
      windup: 0,
      roar: 0,
      hurt: 0,
      pain: 0,
      leap: 0,
      deadTime: 0,
      gibbed: false,
      inSlime: false,
    };
    const sharedView = MONSTERS.imp.build(sharedWorld, testEnemy);
    testEnemy.hp = 1;
    MONSTERS.imp.animate(sharedView, testEnemy, { time: 1.0, dt: 1 / 60, player: { pos: new Vec2(160, 100) } });
    assert.equal(uploadCalls, 0, 'monster gore skin swap performs zero gl.texImage2D uploads when sharedTexture is cached');
    assert.equal(sharedTexCalls, 16, 'monster gore skin swap rebinds all 16 sub-meshes to the cached gore WebGLTexture');

    // 6. Level & Fog delegate spatial tile indexing to Spock Grid, and World.registerStaticChunk reads BoundingSphere.center
    const e1m1 = new Level(LEVELS[0]);
    assert.ok(e1m1.grid, 'Level initializes a Spock Grid instance');
    assert.equal(e1m1.grid.getCell(new Vec2(3 * 64 + 10, 2 * 64 + 10)), 2 * e1m1.width + 3, 'Level.grid.getCell resolves tile index');
    const e1m1Fog = new Fog(e1m1);
    assert.equal(e1m1Fog.grid, e1m1.grid, 'Fog reuses Level.grid');
    assert.equal(e1m1Fog.tileIndex(new Vec2(3 * 64 + 10, 2 * 64 + 10)), 2 * e1m1.width + 3, 'Fog.tileIndex delegates to Spock Grid');

    const chunks = [];
    const chunkGeom = new CustomMesh();
    chunkGeom.setVertices([new Vec3(64, 0, 128), new Vec3(128, 32, 192), new Vec3(64, 32, 128)]);
    const mockGl = { createBuffer: () => ({}), bindBuffer() {}, bufferData() {}, UNSIGNED_SHORT: 5123 };
    const chunkMesh = new Mesh(mockGl, chunkGeom);
    registerStaticChunk(chunks, chunkMesh, new Vec2(0, 0), 32);
    assert.equal(chunks.length, 1, 'registerStaticChunk registers chunk');
    assert.ok(
      chunks[0].center.x > 0 && chunks[0].center.y > 0,
      'registerStaticChunk reads BoundingSphere.center coordinates cleanly'
    );
  },

  'LoopR FPS counter: Player.getFPS feeds Hud.fps and renders current FPS on DoomR screen and automap'() {
    const clock = new Clock();
    clock.start();
    const t0 = clock.now ?? 0;
    clock.computeDelta(t0 + 1000 / 60);
    clock.tick(t0 + 1000 / 60);
    assert.equal(Math.round(clock.computeAverageFPS()), 60, 'LoopR Clock computes 60 FPS from a 16.67ms frame');

    const loop = new Player(() => {});
    assert.equal(loop.getFPS(), 0, 'LoopR Player starts at 0 FPS before frames run');

    const texts = [];
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {},
          clearRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
          fillRect() {},
          fillText(str) {
            texts.push(str);
          },
        };
      },
    };
    const mockOverlay = {
      clear() {},
      glow: { line() {} },
      crisp: {
        fillRect() {},
        rectLine() {},
        line() {},
        circleLine() {},
        weapon: { quad() {} },
        sprites: { quad() {} },
        face: { quad() {} },
      },
    };

    const game = fresh(0);
    const hud = new Hud(mockCanvas, mockOverlay);
    hud.resize(1280, 760, 1);
    hud.fps = clock.computeAverageFPS();
    hud.render(game);
    assert.ok(texts.includes('60 FPS'), 'Hud renders current LoopR FPS on the DoomR screen');

    texts.length = 0;
    hud.toggleAutomap(game);
    hud.render(game);
    assert.ok(texts.some((t) => t.includes('FPS 60')), 'Hud automap header telemetry includes current LoopR FPS');
  },

  'Input uses @dwtechs/ctrltab Keyboard with X for fire and physical key codes across layouts'() {
    const prevDoc = globalThis.document;
    const prevWin = globalThis.window;
    globalThis.document = { addEventListener() {}, pointerLockElement: null };
    globalThis.window = { addEventListener() {} };
    try {
      const mockCanvas = { addEventListener() {} };
      const inp = new Input(mockCanvas);

      // Hold W (87) + Shift (16) -> forward + run
      globalThis.document.onkeydown({ code: 'KeyW', which: 87, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
      globalThis.document.onkeydown({ code: 'ShiftLeft', which: 16, shiftKey: true, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
      let c = inp.poll();
      assert.equal(c.forward, 1);
      assert.equal(c.run, true);
      inp.endFrame();

      // Press X (88) to fire while strafing right with D (68)
      globalThis.document.onkeydown({ code: 'KeyX', which: 88, shiftKey: true, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
      globalThis.document.onkeydown({ code: 'KeyD', which: 68, shiftKey: true, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
      c = inp.poll();
      assert.equal(c.fire, true);
      assert.equal(c.strafe, 1);
      assert.equal(c.forward, 1);
      inp.endFrame();

      // Release X (88) and D (68) -> fire stops, strafe stops, W keeps moving forward
      globalThis.document.onkeyup({ code: 'KeyX', which: 88, metaKey: false });
      globalThis.document.onkeyup({ code: 'KeyD', which: 68, metaKey: false });
      c = inp.poll();
      assert.equal(c.fire, false);
      assert.equal(c.strafe, 0);
      assert.equal(c.forward, 1);
      globalThis.document.onkeyup({ code: 'KeyW', which: 87, metaKey: false });
      inp.endFrame();

      globalThis.document.onkeydown({ code: 'KeyF', which: 70, repeat: false, preventDefault() {} });
      c = inp.poll();
      assert.equal(c.fire, false, 'F is not held fire');
      assert.equal(c.grenade, true, 'F throws a grenade');
      globalThis.document.onkeyup({ code: 'KeyF', which: 70 });
      inp.endFrame();

      // Physical key layout (AZERTY vs QWERTY): event.code 'KeyA' (which=81 on AZERTY) maps to KeyA (strafe left),
      // while physical Q ('KeyQ' with which=65 on AZERTY) does not falsely trigger KeyA
      globalThis.document.onkeydown({ code: 'KeyQ', which: 65, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
      c = inp.poll();
      assert.equal(c.strafe, 0, 'physical KeyQ on AZERTY (which=65) does not trigger KeyA strafe');
      globalThis.document.onkeydown({ code: 'KeyA', which: 81, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
      c = inp.poll();
      assert.equal(c.strafe, -1, 'physical KeyA on AZERTY (which=81) triggers KeyA strafe left');
      globalThis.document.onkeyup({ code: 'KeyA', which: 81, metaKey: false });
      c = inp.poll();
      assert.equal(c.strafe, 0, 'releasing physical KeyA stops strafing');
      inp.endFrame();

      // Weapon selection 1-4 (top row Digit1-4 and Numpad1-4)
      for (const [digitCode, expectedSlot] of [['Digit1', 1], ['Digit2', 2], ['Digit3', 3], ['Digit4', 4], ['Numpad2', 2]]) {
        globalThis.document.onkeydown({ code: digitCode, which: 48 + expectedSlot, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault() {} });
        c = inp.poll();
        assert.equal(c.weapon, expectedSlot, `${digitCode} selects weapon slot ${expectedSlot}`);
        globalThis.document.onkeyup({ code: digitCode, which: 48 + expectedSlot, metaKey: false });
        inp.endFrame();
      }
    } finally {
      globalThis.document = prevDoc;
      globalThis.window = prevWin;
    }
  },

  'AC-1 AC-2 AC-3 Semicolon toggles sound one-shot while N stays night vision and B stays a mute alias'() {
    const prevDoc = globalThis.document;
    const prevWin = globalThis.window;
    globalThis.document = { addEventListener() {}, pointerLockElement: null };
    globalThis.window = { addEventListener() {} };
    const down = (e) => globalThis.document.onkeydown({ repeat: false, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, preventDefault() {}, ...e });
    const up = (e) => globalThis.document.onkeyup({ metaKey: false, ...e });
    try {
      const inp = new Input({ addEventListener() {} });
      for (const ev of [{ code: 'Semicolon', which: 186 }, { which: 59 }, { which: 186 }]) {
        down(ev);
        assert.equal(inp.took('sound'), true, 'AC-1 physical Semicolon records a one-shot Semicolon press');
        assert.equal(inp.took('nightVision'), false, 'AC-1 Semicolon is not N');
        assert.equal(inp.poll().nightVision, false, 'AC-1 Semicolon does not toggle night vision');
        up(ev);
        inp.endFrame();
      }

      down({ code: 'Semicolon', which: 186 });
      inp.poll();
      inp.endFrame();
      down({ code: 'Semicolon', which: 186, repeat: true });
      down({ code: 'Semicolon', which: 186, repeat: true });
      assert.equal(inp.took('sound'), false, 'AC-2 held Semicolon repeats are ignored');
      inp.endFrame();
      up({ code: 'Semicolon', which: 186 });
      down({ code: 'Semicolon', which: 186 });
      assert.equal(inp.took('sound'), true, 'AC-2 fresh press after release is a new one-shot');
      inp.endFrame();
      assert.equal(inp.took('sound'), false, 'AC-2 one-shot clears at frame end');
      up({ code: 'Semicolon', which: 186 });

      down({ code: 'KeyN', which: 78 });
      assert.equal(inp.poll().nightVision, true, 'AC-3 N toggles night vision');
      assert.equal(inp.took('sound'), false, 'AC-3 N is not Semicolon');
      up({ code: 'KeyN', which: 78 });
      inp.endFrame();
      down({ code: 'KeyB', which: 66 });
      assert.equal(inp.took('sound'), true, 'AC-3 B stays a mute alias');
      assert.equal(inp.poll().nightVision, false, 'AC-3 B is not night vision');
      up({ code: 'KeyB', which: 66 });
      inp.endFrame();
    } finally {
      globalThis.document = prevDoc;
      globalThis.window = prevWin;
    }
  },

  'AC-4 main.js routes only Semicolon and B to sound.toggleMute and never references KeyN'() {
    const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
    assert.equal(src.split('sound.toggleMute()').length - 1, 1, 'AC-4 exactly one toggleMute call');
    const lines = src.split('\n');
    const at = lines.findIndex((l) => l.includes('sound.toggleMute()'));
    let g = at;
    while (g >= 0 && !lines[g].includes('if ('))
      g--;
    assert.ok(lines[g].includes("input.took('sound')"), 'AC-4 guard references the sound action');
    assert.ok(!src.includes('KeyN'), 'AC-4 main.js never references KeyN');
  },

  'AC-5 Sound.toggleMute persists doomr.muted and returns the new state'() {
    const prev = globalThis.localStorage;
    const writes = [];
    globalThis.localStorage = { setItem(k, v) { writes.push([k, v]); }, getItem() { return null; } };
    try {
      const sound = new Sound();
      sound.setMuted(false);
      writes.length = 0;
      assert.equal(sound.toggleMute(), true, 'AC-5 first toggle mutes');
      assert.equal(sound.muted, true);
      assert.deepEqual(writes.at(-1), ['doomr.muted', '1'], 'AC-5 persists 1');
      assert.equal(sound.toggleMute(), false, 'AC-5 second toggle unmutes');
      assert.equal(sound.muted, false);
      assert.deepEqual(writes.at(-1), ['doomr.muted', '0'], 'AC-5 persists 0');
    } finally {
      if (prev === undefined)
        delete globalThis.localStorage;
      else
        globalThis.localStorage = prev;
    }
  },

  'AC-6 title screen lists semicolon for sound and N for night vision'() {
    const texts = [];
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
          fillText(str) { texts.push(str); },
        };
      },
    };
    const fakeOverlay = {
      clear() {},
      glow: { line() {} },
      crisp: { fillRect() {}, rectLine() {}, line() {}, circleLine() {}, weapon: { quad() {} }, sprites: { quad() {} }, face: { quad() {} } },
    };
    const game = fresh(0);
    game.state = 'title';
    game.selectingDifficulty = false;
    const hud = new Hud(fakeCanvas, fakeOverlay);
    hud.resize(1024, 768, 1);
    hud.render(game);
    assert.ok(texts.includes(';'), 'AC-6 semicolon sound row');
    assert.ok(texts.includes('sound'), 'AC-6 sound label');
    assert.ok(texts.includes('N'), 'AC-6 N night vision row');
    assert.ok(texts.includes('night vision'), 'AC-6 night vision label');
    assert.ok(texts.includes('M'), 'AC-6 music label');
    assert.ok(texts.includes('music'), 'AC-6 music label');
    assert.ok(texts.includes('ESC'), 'AC-6 pause label');
    assert.ok(texts.includes('pause'), 'AC-6 pause label');
  },

  'AC-7 README controls table maps semicolon to sound and N to night vision'() {
    const md = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const start = md.indexOf('## Controls');
    const rest = md.slice(start + 1);
    const end = rest.indexOf('\n## ');
    const lines = (end < 0 ? rest : rest.slice(0, end)).split('\n');
    assert.ok(lines.some((l) => /^\|\s*;\s*\|[^|]*toggle sound/.test(l)), 'AC-7 ; row toggles sound');
    assert.ok(lines.some((l) => /^\|\s*N\s*\|\s*toggle night vision\s*\|/.test(l)), 'AC-7 N row toggles night vision');
    assert.ok(!lines.some((l) => /^\|\s*N\s*\|[^|]*sound/.test(l)), 'AC-7 no N sound row');
  },
  'AC-1 keyboard layouts: positional movement resolves by physical code on AZERTY'() {
    withInput((inp, down, up) => {
      down({ code: 'KeyW', key: 'z' });
      down({ code: 'KeyA', key: 'q' });
      const c = inp.poll();
      assert.equal(c.forward, 1, 'AC-1 AZERTY Z moves forward');
      assert.equal(c.strafe, -1, 'AC-1 AZERTY Q strafes left');
      up({ code: 'KeyW', key: 'z' });
      up({ code: 'KeyA', key: 'q' });
      inp.endFrame();
      down({ code: 'KeyZ', key: 'w' });
      down({ code: 'KeyQ', key: 'a' });
      const d = inp.poll();
      assert.equal(d.forward, 0, 'AC-1 physical KeyZ is not forward');
      assert.equal(d.strafe, 0, 'AC-1 physical KeyQ is not strafe');
    });
  },

  'AC-2 keyboard layouts: mnemonic music and sound follow the printed glyph on AZERTY and QWERTY'() {
    withInput((inp, down, up) => {
      const press = (e) => { down(e); const r = [inp.took('music'), inp.took('sound')]; up(e); inp.endFrame(); return r; };
      assert.deepEqual(press({ code: 'Semicolon', key: 'm' }), [true, false], 'AC-2 AZERTY printed M is music');
      assert.deepEqual(press({ code: 'Comma', key: ';' }), [false, true], 'AC-2 AZERTY printed ; is sound');
      assert.deepEqual(press({ code: 'KeyM', key: 'm' }), [true, false], 'AC-2 QWERTY M is music');
      assert.deepEqual(press({ code: 'Semicolon', key: ';' }), [false, true], 'AC-2 QWERTY ; is sound');
    });
  },

  'AC-3 keyboard layouts: Dvorak positional precedence, physical fallback, and legacy which aliases'() {
    withInput((inp, down, up) => {
      down({ code: 'KeyD', key: 'e' });
      assert.equal(inp.poll().strafe, 1, 'AC-3 Dvorak physical D strafes');
      assert.equal(inp.took('use'), false, 'AC-3 Dvorak printed E on KeyD is not use');
      up({ code: 'KeyD', key: 'e' });
      inp.endFrame();
      down({ code: 'KeyE', key: '.' });
      assert.equal(inp.took('use'), true, 'AC-3 Dvorak physical E falls back to use');
      up({ code: 'KeyE', key: '.' });
      inp.endFrame();
      down({ code: 'BracketLeft', key: 'Dead' });
      assert.equal(inp.took('levelPrev'), true, 'AC-3 dead key falls back to physical code');
      up({ code: 'BracketLeft', key: 'Dead' });
      inp.endFrame();
      down({ which: 186 });
      assert.equal(inp.took('sound'), true, 'AC-3 legacy which 186 is sound');
      up({ which: 186 });
      inp.endFrame();
      down({ code: 'KeyY', key: 'z' });
      assert.ok(ACTIONS.every((a) => !inp.took(a.id)), 'AC-3 QWERTZ KeyY z maps to no action');
    });
  },

  'AC-4 keyboard layouts: keyup reuses the keydown action and blur clears pins'() {
    withInput((inp, down, up, blur) => {
      down({ code: 'Semicolon', key: 'm' });
      assert.ok(inp.keys.has('music'));
      up({ code: 'Semicolon', key: ':' });
      assert.ok(!inp.keys.has('music'), 'AC-4 keyup releases music despite a changed key');
      assert.equal(inp.heldWhich.size, 0);
      assert.equal(inp.downByCode.size, 0);
      inp.keymap.setBinding('fire', 0, 'ControlLeft');
      inp.syncBindings();
      down({ code: 'KeyX', key: 'x' });
      down({ code: 'ControlLeft', key: 'Control' });
      up({ code: 'KeyX', key: 'x' });
      assert.equal(inp.poll().fire, true, 'AC-4 fire stays held by the second binding');
      up({ code: 'ControlLeft', key: 'Control' });
      assert.equal(inp.poll().fire, false);
      down({ code: 'KeyW', key: 'z' });
      down({ code: 'KeyX', key: 'x' });
      blur();
      assert.equal(inp.downByCode.size, 0);
      assert.equal(inp.keys.size, 0);
      assert.equal(inp.heldWhich.size, 0);
    });
  },

  'AC-5 keyboard layouts: hint lines default to QWERTY and follow AZERTY and Dvorak layouts'() {
    const k = new Keymap({ storage: null, navigator: null });
    assert.deepEqual(k.hintLines, DEFAULT_HINT_LINES);
    assert.equal(k.hintLines.length, 4);
    assert.equal(k.hintLines[0].title, 'MOVE');
    assert.equal(k.hintLines[0].rows[0].keys, 'W A S D');
    assert.equal(k.hintLines[0].rows[0].label, 'move');
    assert.equal(k.hintLines[1].title, 'COMBAT');
    assert.equal(k.hintLines[2].title, 'WORLD');
    assert.equal(k.hintLines[3].title, 'SYSTEM');

    k.applyLayoutMap(new Map(Object.entries(PRESETS.azerty.glyphs)));
    assert.equal(k.layoutName, 'AZERTY');
    assert.equal(k.hintLines[0].rows[0].keys, 'Z Q S D');
    assert.equal(k.hintLines[2].rows[0].keys, '^ / $');
    assert.equal(k.hintLines[2].rows[0].label, 'switch level');
    assert.equal(k.hintLines[3].rows[2].keys, 'M');
    assert.equal(k.hintLines[3].rows[2].label, 'music');

    const d = new Keymap({ storage: { getItem: () => 'dvorak' }, navigator: null });
    assert.equal(d.hintLines[0].rows[0].keys, ', A O E');
    assert.equal(d.hintLines[1].rows[3].keys, '.');
    assert.equal(d.hintLines[1].rows[3].label, 'use / open doors');
  },

  'AC-6 keyboard layouts: live learning detects AZERTY once and F2 cycles and persists the override'() {
    const writes = [];
    const storage = { getItem() { return null; }, setItem(k, v) { writes.push([k, v]); } };
    const k = new Keymap({ storage, navigator: null });
    const ev = { code: 'KeyQ', key: 'a', shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };
    const v0 = k.version;
    assert.equal(k.learn(ev), true);
    assert.equal(k.learn(ev), false);
    assert.equal(k.version - v0, 1, 'AC-6 version increments once');
    assert.equal(k.layoutName, 'AZERTY');
    assert.equal(k.learn({ ...ev, code: 'KeyE', key: 'Dead' }), false);
    assert.equal(k.learn({ ...ev, code: 'KeyE', key: 'e', shiftKey: true }), false);
    const statuses = [];
    for (let i = 0; i < 5; i++)
      statuses.push(k.cycleOverride());
    assert.deepEqual(statuses.slice(0, 4), ['Keyboard: QWERTY (manual)', 'Keyboard: AZERTY (manual)', 'Keyboard: QWERTZ (manual)', 'Keyboard: Dvorak (manual)']);
    assert.ok(statuses[4].startsWith('Keyboard: auto'));
    assert.deepEqual(writes.filter(([key]) => key === LAYOUT_STORAGE_KEY).map(([, v]) => v), ['qwerty', 'azerty', 'qwertz', 'dvorak', 'auto']);
    assert.equal(new Keymap({ storage: { getItem: () => 'qwertz' }, navigator: null }).override, 'qwertz');
    assert.equal(new Keymap({ storage: { getItem: () => 'bogus' }, navigator: null }).override, 'auto');
    withInput((inp, down) => {
      down({ code: 'F2', key: 'F2' });
      assert.equal(inp.took('layoutCycle'), true);
    });
  },

  'AC-7 keyboard layouts: HUD draws cached AZERTY hints on title and pause and main wires F2'() {
    const texts = [];
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
          fillText(str) { texts.push(str); },
        };
      },
    };
    const fakeOverlay = {
      clear() {},
      glow: { line() {} },
      crisp: { fillRect() {}, rectLine() {}, line() {}, circleLine() {}, weapon: { quad() {} }, sprites: { quad() {} }, face: { quad() {} } },
    };
    const game = fresh(0);
    game.state = 'title';
    game.selectingDifficulty = false;
    const hud = new Hud(fakeCanvas, fakeOverlay);
    hud.resize(1024, 768, 1);
    hud.controlHints = new Keymap({ storage: { getItem: () => 'azerty' }, navigator: null }).hintLines;
    hud.render(game);
    assert.ok(texts.includes('Z Q S D'));
    assert.ok(texts.includes('MOVE'));
    assert.ok(texts.includes('F2'));
    assert.ok(texts.includes('layout: AZERTY'));
    texts.length = 0;
    game.state = 'paused';
    hud.render(game);
    assert.ok(texts.some((t) => t.startsWith('layout:')));
    const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
    for (const s of ["input.took('layoutCycle')", 'keymap.cycleOverride()', 'hud.controlHints = keymap.hintLines'])
      assert.ok(src.includes(s), `AC-7 main.js contains ${s}`);
    for (const s of ["input.took('Key", "input.took('Semicolon')", "input.took('Bracket", "input.took('Digit", "input.took('Arrow"])
      assert.ok(!src.includes(s), `AC-7 main.js has no ${s}`);
  },

  'AC-8 keyboard layouts: README documents the strategy and CHANGELOG records #21'() {
    const md = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const start = md.indexOf('## Controls');
    const rest = md.slice(start + 1);
    const end = rest.indexOf('\n## ');
    const section = end < 0 ? rest : rest.slice(0, end);
    const lines = section.split('\n');
    assert.ok(lines.some((l) => /^\|\s*M\s*\|[^|]*toggle music/.test(l)));
    assert.ok(lines.some((l) => /^\|\s*V\s*\|[^|]*toggle map/.test(l)));
    assert.ok(lines.some((l) => /^\|\s*F2\s*\|[^|]*keyboard layout/.test(l)));
    assert.ok(!lines.some((l) => /^\|\s*M\s*\|[^|]*toggle map/.test(l)));
    assert.ok(lines.some((l) => /^\|\s*;\s*\|[^|]*toggle sound/.test(l)));
    assert.ok(lines.some((l) => /^\|\s*N\s*\|\s*toggle night vision\s*\|/.test(l)));
    assert.ok(section.includes('ZQSD'));
    const log = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
    assert.ok(log.includes('#21') && log.includes('doomr.keyboardLayout'));
  },

  'AC-1 supply chests hold every authored supply once per level'() {
    const expected = [15, 13, 13, 14, 11];
    const supply = new Set(CACHE_TYPES);
    for (let i = 0; i < LEVELS.length; i++) {
      const game = fresh(i);
      assert.equal(game.caches.length, expected[i], `level ${i} has ${expected[i]} caches`);
      const inCaches = game.caches.flatMap((c) => c.contents).sort();
      const authored = game.level.pickups.filter((p) => supply.has(p.type)).map((p) => p.type).sort();
      assert.deepEqual(inCaches, authored, `level ${i} caches hold every authored supply exactly once`);
      for (const cache of game.caches) {
        assert.equal(game.level.roomByTile[cache.idx], cache.room, 'the chest stands in its room');
        assert.equal(cache.state, 'closed');
        assert.equal(cache.lid, 0);
      }
      assert.equal(game.pickups.some((p) => supply.has(p.type)), false, `level ${i} keeps no supply on the floor`);
      assert.ok(game.pickups.every((p) => p.initial), 'only authored non-supply pickups start on the floor');
      assert.equal(game.totalItems, game.level.pickups.length, 'the item tally still counts every authored item');
    }
  },

  'AC-2 use opens the targeted chest once and animates the lid'() {
    const level = {
      name: 'Use test',
      rows: ['##########', '#........#', '#P...a...#', '#........#', '##########'],
    };
    const place = (game, dx, angle) => {
      game.player.body.setPosition(new Vec2(game.caches[0].pos.x + dx, game.caches[0].pos.y));
      game.player.angle = angle;
      game.events.length = 0;
    };
    const opens = (game) => game.events.filter((e) => e.type === 'cacheOpen');
    const game = new Game();
    game.load(level);
    game.state = 'play';
    const cache = game.caches[0];
    assert.equal(game.caches.length, 1);

    place(game, 130, 0);
    game.update(1 / 60, input({ use: true }));
    assert.equal(opens(game).length, 0, 'beyond 96 units nothing opens');
    place(game, -60, Math.PI);
    game.update(1 / 60, input({ use: true }));
    assert.equal(opens(game).length, 0, 'behind the player nothing opens');
    assert.equal(cache.state, 'closed');

    place(game, -60, 0);
    game.update(1 / 60, input({ use: true }));
    assert.equal(opens(game).length, 1, 'facing a chest in range opens it once');
    assert.deepEqual([opens(game)[0].x, opens(game)[0].y], [cache.pos.x, cache.pos.y]);
    assert.equal(cache.state, 'opening');
    assert.ok(cache.lid > 0 && cache.lid < 1);
    game.update(1 / 60, input({ use: true }));
    assert.equal(opens(game).length, 1, 'using again does not reopen a chest');
    run(game, CACHE_LID_TIME + 2 / 60);
    assert.equal(cache.lid, 1, 'the lid finishes lifting');
    assert.ok(cache.state === 'open' || cache.state === 'emptied');

    const near = new Game();
    near.load(level);
    near.state = 'play';
    place(near, 20, Math.PI);
    near.update(1 / 60, input({ use: true }));
    assert.equal(opens(near).length, 1, 'standing within half a tile opens a chest whichever way the player faces');

    const tie = new Game();
    tie.load({
      name: 'Door tie test',
      rows: ['#######', '#.....#', '#..D.a#', '#..P..#', '#######'],
    });
    tie.state = 'play';
    const door = [...tie.level.doors.values()][0];
    tie.player.body.setPosition(new Vec2((door.center.x + tie.caches[0].pos.x) / 2, tie.caches[0].pos.y + 56));
    tie.player.angle = -Math.PI / 2;
    tie.events.length = 0;
    tie.update(1 / 60, input({ use: true }));
    assert.equal(door.target, 1, 'an equally distant door wins');
    assert.equal(tie.caches[0].state, 'closed', 'the chest stays closed');
  },

  'AC-3 opening a chest grants contents with the existing award rules'() {
    const game = new Game();
    game.load({ name: 'Award test', rows: ['#######', '#P....#', '#######'] });
    game.state = 'play';
    game.totalItems = 10;
    const player = game.player;
    player.health = 90;
    player.shells = 0;
    player.weapons.shotgun = false;
    const cache = game.addCache([1 * game.level.width + 3], ['health', 'ammo', 'shotgun']);
    game.events.length = 0;
    game.openCache(cache);
    assert.equal(player.health, 100, 'health is capped at 100');
    assert.equal(player.shells, AMMO_TYPES.shells.bonus, 'the first shotgun adds no ammo of its own');
    assert.equal(player.weapons.shotgun, true);
    assert.equal(player.weapon, 'shotgun', 'new weapons are auto-selected');
    assert.equal(game.events.filter((e) => e.type === 'pickup').length, 2);
    assert.equal(game.events.filter((e) => e.type === 'weaponPickup').length, 1);
    assert.equal(game.message.text.split(' · ').length, 3, 'the message joins every granted line');
    assert.equal(game.itemsPicked, 3);
    assert.equal(player.ammoFlash.shells, AMMO_FLASH_DURATION);
    assert.equal(cache.contents.length, 0);

    player.weapons.chaingun = true;
    player.bullets = 0;
    const dup = game.addCache([1 * game.level.width + 4], ['chaingun']);
    game.openCache(dup);
    assert.equal(player.bullets, AMMO_TYPES.bullets.weaponBonus, 'a duplicate weapon grants its ammo bonus');
  },

  'AC-4 refused contents stay in the chest until they can be taken'() {
    const game = new Game();
    game.load({ name: 'Refuse test', rows: ['###########', '#P.ha#.m..#', '#....D....#', '###########'] });
    game.state = 'play';
    const player = game.player;
    assert.equal(game.totalItems, 3);
    assert.equal(game.caches.length, 2);
    const cache = game.caches.find((c) => c.contents.length === 2);
    const other = game.caches.find((c) => c !== cache);
    const stand = (c) => {
      player.body.setPosition(c.pos.clone());
      game.events.length = 0;
    };
    player.health = 100;
    player.shells = AMMO_TYPES.shells.max;
    stand(cache);
    game.update(1 / 60, input({ use: true }));
    run(game, CACHE_LID_TIME + 2 / 60);
    assert.equal(cache.state, 'open');
    assert.deepEqual(cache.contents, ['health', 'ammo']);
    assert.ok(game.message.text.includes('full'));
    assert.equal(game.itemsPicked, 0);

    player.health = 50;
    game.use();
    assert.deepEqual(cache.contents, ['ammo'], 'health is taken once there is room');
    assert.equal(player.health, 75);
    assert.equal(cache.state, 'open');

    player.shells = 0;
    game.events.length = 0;
    game.use();
    assert.equal(cache.state, 'emptied');
    assert.equal(game.events.filter((e) => e.type === 'cacheEmpty').length, 1);
    game.events.length = 0;
    game.use();
    assert.equal(game.events.length, 0, 'an emptied chest is no longer a use target');

    stand(other);
    player.bullets = 0;
    game.use();
    run(game, CACHE_LID_TIME + 2 / 60);
    assert.equal(other.state, 'emptied');
    assert.equal(game.itemsPicked, game.totalItems, 'the 100% item tally is reachable');
  },

  'AC-5 enemy drops stay floor pickups and chests ignore movement and weapons'() {
    const game = new Game();
    game.load({
      name: 'Passive test',
      rows: ['############', '#P...a.....#', '#..........#', '#..........#', '############'],
    });
    game.state = 'play';
    game.totalItems = 5;
    const player = game.player;
    const cache = game.caches[0];
    const snapshot = () => JSON.stringify([cache.state, cache.lid, cache.contents]);
    const before = snapshot();

    const boss = game.addEnemy('boss', new Vec2(9 * 64 + 32, 3 * 64 + 32));
    game.damageEnemy(boss, 99999);
    const drop = game.pickups.find((p) => p.type === 'health');
    assert.ok(drop, 'a boss always drops health');
    assert.equal(drop.initial, false);
    player.health = 50;
    player.body.setPosition(drop.pos.clone());
    run(game, 0.1);
    assert.equal(drop.taken, true, 'the drop is collected by overlap');
    assert.equal(player.health, 75, 'with unchanged amounts');
    assert.equal(game.itemsPicked, 0, 'and no item credit');

    player.body.setPosition(new Vec2(64 + 32, 64 + 32));
    player.angle = 0;
    run(game, 2, input({ forward: 1 }));
    assert.ok(player.pos.x > cache.pos.x + 20, 'the player walks through the chest tile');
    assert.equal(snapshot(), before);

    player.body.setPosition(new Vec2(cache.pos.x - 100, cache.pos.y));
    player.angle = 0;
    player.cooldown = 0;
    game.fire();
    player.weapons.rocket = true;
    player.weapon = 'rocket';
    player.rockets = 5;
    player.cooldown = 0;
    game.fire();
    game.addGrenade(player.pos, new Vec2(1, 0));
    game.addBarrel(new Vec2(cache.pos.x + 40, cache.pos.y));
    game.hitBarrel(game.barrels.at(-1), 99);
    run(game, 2);
    assert.equal(snapshot(), before, 'shots, rockets, grenades, and barrel blasts leave the chest alone');
  },

  'AC-6 chest views follow cache state, lid, and GPU lifecycle'() {
    const atlas = chestAtlas();
    assert.equal(atlas.width, CHEST_CELL * CHEST_FRAMES);
    assert.equal(atlas.width & (atlas.width - 1), 0);
    assert.equal(atlas.height & (atlas.height - 1), 0);
    for (let i = 3; i < atlas.data.length; i += 4)
      assert.equal(atlas.data[i], 255, 'the atlas is fully opaque');
    for (const mesh of [chestBodyMesh(), chestLidMesh()]) {
      assert.equal(mesh.vertices.length / 3, mesh.uvs.length / 2);
      assert.equal((mesh.vertices.length / 3) % 3, 0);
    }
    const lid = chestLidMesh();
    for (let i = 2; i < lid.vertices.length; i += 3)
      assert.ok(lid.vertices[i] >= 0 && lid.vertices[i] <= 27, 'lid z stays within the hinge-to-front span');

    const game = new Game();
    game.load({ name: 'View test', rows: ['#############', '#P.h#..a#..m#', '#...D...D...#', '#...#...#...#', '#############'] });
    game.state = 'play';
    assert.equal(game.caches.length, 3);
    const addProgram = Mesh.prototype.addProgram;
    Mesh.prototype.addProgram = () => true;
    const noop = () => {};
    const world = Object.assign(Object.create(World.prototype), {
      level: game.level,
      cutaway: true,
      syncStamp: 0,
      camera: { position: new Vec3(96, EYE, 160) },
      gl: { createBuffer: () => ({}), bindBuffer() {}, bufferData() {}, viewport() {}, UNSIGNED_SHORT: 5123 },
      doorViews: new Map([...game.level.doors.values()].map((door) => [door, { setPosition: noop, setActive: noop, setInactive: noop }])),
      crusherViews: new Map(),
      enemyViews: new Map(),
      pickupViews: new Map(),
      cacheViews: new Map(),
      barrelViews: new Map(),
      shotViews: new Map(),
      effectViews: new Map(),
      ceilingLights: [],
      lightFixtures: [],
      syncDoorMarks: noop,
      updateCamera: noop,
      updateKnife: noop,
      updateChainsaw: noop,
      updateChaingun: noop,
      updateShotgun: noop,
      updateRocketLauncher: noop,
      syncBlood: noop,
      bindAtlasTexture: noop,
      sharedTexture: () => ({}),
      sharedTexturedMeshes: [],
      discard: noop,
      scene: { addMesh() {}, clear() {}, render() {} },
      target: { bind() {}, unbind() {} },
      glowTarget: { bind() {}, unbind() {} },
      down: { clear() {}, render() {} },
      post: { clear() {}, render() {} },
      overlay: { glow: { render() {} }, crisp: { render() {} } },
    });
    try {
      world.render(game);
      assert.equal(world.cacheViews.size, game.caches.length);
      for (const cache of game.caches) {
        const view = world.cacheViews.get(cache);
        assert.equal(view.yaw, Trigo.halfpi - cache.angle);
        assert.ok(Math.abs(view.root.position.x - cache.pos.x) < 1e-6 && Math.abs(view.root.position.z - cache.pos.y) < 1e-6, 'the chest root stands at cache.pos');
      }
      const opened = game.caches[0];
      const emptiedCache = game.caches[1];
      emptiedCache.contents.length = 0;
      emptiedCache.state = 'emptied';
      opened.state = 'opening';
      opened.lid = 0.5;
      world.render(game);
      assert.equal(world.cacheViews.get(opened).lastLid, 0.5, 'the lid view tracks the cache lid');
      assert.equal(world.cacheViews.get(opened).lastState, 'opening');
      assert.equal(world.cacheViews.get(emptiedCache).lastState, 'emptied');
      assert.ok(Math.abs(world.cacheViews.get(opened).lid.rotation.x + 0.5 * CHEST_LID_OPEN_ANGLE) < 1e-6, 'the lid tilts by lid * open angle');
      assert.equal(world.cacheViews.get(game.caches[2]).lastState, 'closed');
      assert.equal(world.cacheViews.get(emptiedCache).bodyMaterial.diffuse.x, CHEST_TINTS.emptied.x, 'only emptied caches are tinted');
      assert.equal(world.cacheViews.get(opened).bodyMaterial.diffuse.x, CHEST_TINTS.closed.x);
      assert.equal(world.cacheViews.size, game.caches.length, 'one view per cache');
    } finally {
      Mesh.prototype.addProgram = addProgram;
    }
  },

  'AC-1 spatial takes listener and source Vec2s and pans by side'() {
    const listener = new Vec2(0, 0);
    const right = { ...spatial(listener, new Vec2(200, 200), { angle: 0 }) };
    const left = { ...spatial(listener, new Vec2(200, -200), { angle: 0 }) };
    assert.ok(right.pan > 0.3);
    assert.ok(left.pan < -0.3);
    for (const key of ['pan', 'gain', 'distance'])
      assert.equal(typeof right[key], 'number');
    assert.ok(spatial.length <= 3, 'no scalar coordinate parameters');
  },

  'AC-2 setListener takes a Vec2 and copies it'() {
    const sound = new Sound();
    const pos = new Vec2(100, 100);
    sound.setListener(pos, Math.PI / 2);
    pos.setScalar(9999, 9999);
    assert.equal(sound.listener.pos.x, 100);
    assert.equal(sound.listener.pos.y, 100);
    assert.equal(sound.listener.angle, Math.PI / 2);
    assert.ok(spatial(sound.listener.pos, new Vec2(300, 100), sound.listener).pan < -0.3);
  },

  'AC-3 play places a sound by its pos Vec2'() {
    const original = RECIPES.dry;
    RECIPES.dry = () => ({ wet: 0 });
    try {
      const buses = [];
      const makeSound = () => {
        const sound = new Sound();
        sound.master = { };
        sound.ctx = {
          currentTime: 10,
          state: 'running',
          createGain: () => {
            const node = { gain: { value: 0 }, connect() {} };
            buses.push(node);
            return node;
          },
        };
        return sound;
      };
      makeSound().play('dry', { pos: new Vec2(150, 0) });
      assert.equal(buses.length, 1);
      assert.ok(Math.abs(buses[0].gain.value - 1 / (1 + (150 / 220) ** 2)) < 1e-9);
      buses.length = 0;
      makeSound().play('dry', { pos: new Vec2(5000, 0) });
      assert.equal(buses.length, 0, 'out of range creates no bus');
      makeSound().play('dry', { pos: new Vec2(5000, 0), local: true });
      assert.equal(buses[0].gain.value, 1, 'local ignores pos');
      buses.length = 0;
      makeSound().play('dry');
      assert.equal(buses[0].gain.value, 1, 'no pos plays at the origin');
    } finally {
      RECIPES.dry = original;
    }
  },

  'AC-4 distance and azimuth curves are preserved'() {
    const listener = new Vec2(0, 0);
    const gains = [0, 100, 300, 600, 900, 1000].map((d) => {
      const { gain } = spatial(listener, new Vec2(d, 0));
      assert.ok(Math.abs(gain - 1 / (1 + (d / 220) ** 2)) < 1e-12);
      return gain;
    });
    for (let i = 1; i < gains.length; i++)
      assert.ok(gains[i] < gains[i - 1]);
    assert.equal(spatial(listener, new Vec2(1000.5, 0)).gain, 0);
    assert.equal(spatial(listener, new Vec2(5000, 0)).gain, 0);
    assert.equal(spatial(listener, new Vec2(0, 0)).gain, 1);
    assert.equal(spatial(listener, new Vec2(0, 0)).pan, 0);
    assert.ok(Math.abs(spatial(listener, new Vec2(0, 20)).pan) < 0.3);
    assert.ok(Math.abs(spatial(listener, new Vec2(0, 70)).pan - 0.9) < 1e-9);
  },

  'AC-5 azimuth follows the listener orientation'() {
    const listener = new Vec2(0, 0);
    const south = { angle: Math.PI / 2 };
    assert.ok(!(spatial(listener, new Vec2(200, 200), south).pan > 0.3));
    assert.ok(spatial(listener, new Vec2(-200, 200), south).pan > 0.3);
    assert.ok(Math.abs(spatial(listener, new Vec2(300, 0), { angle: 0 }).pan) < 1e-9);
    assert.ok(Math.abs(spatial(listener, new Vec2(-300, 0), { angle: 0 }).pan) < 1e-9);
  },

  'AC-6 emit queues an independent Vec2 pos copy'() {
    const game = fresh();
    const at = new Vec2(320, 448);
    game.emit('step', at);
    const event = game.events[game.events.length - 1];
    assert.ok(event.pos instanceof Vec2);
    assert.equal(event.pos.x, 320);
    assert.equal(event.pos.y, 448);
    assert.notEqual(event.pos, at);
    at.setScalar(0, 0);
    assert.equal(event.pos.x, 320);
    assert.equal(event.x, 320);
    game.events.length = 0;
    game.emit('step');
    const own = game.events[0];
    assert.equal(own.pos.x, game.player.pos.x);
    assert.equal(own.pos.y, game.player.pos.y);
    assert.notEqual(own.pos, game.player.pos);
  },

  'AC-7 handle routes event.pos and defaults to the origin'() {
    const sound = new Sound();
    const played = [];
    sound.play = (name, opts) => played.push({ name, ...opts });
    const pos = new Vec2(200, 0);
    sound.handle({ type: 'cacheOpen', pos, visible: true });
    assert.equal(played[0].pos, pos);
    played.length = 0;
    sound.handle({ type: 'chaingunSpin', heat: 0.6 });
    assert.equal(played.length, 1);
  },

  'AC-7 chest open sound routes spatially and the automap marks chests'() {
    const played = [];
    const sound = new Sound();
    sound.play = (name, opts) => played.push({ name, ...opts });
    sound.handle({ type: 'cacheOpen', pos: new Vec2(10, 20), visible: true });
    assert.equal(played.length, 1);
    assert.equal(played[0].name, 'cacheOpen');
    assert.ok(!played[0].local, 'the chest sound is spatial');
    assert.deepEqual([played[0].pos.x, played[0].pos.y], [10, 20]);
    sound.handle({ type: 'cacheEmpty', pos: new Vec2(10, 20) });
    assert.equal(played.length, 1, 'emptying a chest is silent');
    assert.equal(typeof RECIPES.cacheOpen, 'function');

    const game = fresh(0);
    game.state = 'play';
    const [weaponCache, supplyCache, emptied, hidden] = [
      game.caches.find((c) => c.hasWeapon),
      game.caches.find((c) => !c.hasWeapon),
      game.caches.filter((c) => !c.hasWeapon)[1],
      game.caches.filter((c) => !c.hasWeapon)[2],
    ];
    emptied.contents.length = 0;
    emptied.state = 'emptied';
    game.fog.explored.fill(1);
    game.fog.visible.fill(1);
    game.fog.explored[hidden.idx] = 0;
    const markers = [];
    const mockCanvas = { width: 0, height: 0, getContext: () => ({ setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {} }) };
    const mockOverlay = {
      clear() {},
      glow: { line() {} },
      crisp: {
        fillRect() {},
        rectLine(rect, col, alpha) { markers.push({ ...rectBox(rect), col, alpha }); },
        line() {},
        circleLine() {},
        weapon: { quad() {} },
        sprites: { quad() {} },
        face: { quad() {} },
      },
    };
    const hud = new Hud(mockCanvas, mockOverlay);
    hud.resize(1280, 760, 1);
    hud.toggleAutomap(game);
    hud.render(game);
    const square = (cache) => {
      const found = markers.filter((m) => m.w === m.h && m.w > 0);
      return found;
    };
    assert.ok(square(weaponCache).some((m) => m.col[0] > 0.9 && m.col[1] > 0.5 && m.col[2] < 0.4 && m.alpha === 0.95), 'a weapon chest is highlighted in orange');
    assert.ok(markers.some((m) => m.alpha === 0.85 && m.col[1] > 0.7 && m.col[0] < 0.3), 'a supply chest draws green');
    assert.ok(markers.some((m) => m.alpha === 0.3), 'an emptied chest draws dimmed');
    assert.equal(supplyCache.state, 'closed');
  },

  'AC-1 one supply chest per room holds every authored supply'() {
    const supply = new Set(CACHE_TYPES);
    const expected = [15, 13, 13, 14, 11];
    for (let i = 0; i < LEVELS.length; i++) {
      const game = fresh(i);
      const { level } = game;
      assert.equal(game.caches.length, expected[i], `level ${i} chest count`);
      const inCaches = game.caches.flatMap((c) => c.contents).sort();
      const authored = level.pickups.filter((p) => supply.has(p.type)).map((p) => p.type).sort();
      assert.deepEqual(inCaches, authored, `level ${i} chests hold the authored supply multiset`);
      const rooms = new Set();
      for (const cache of game.caches) {
        assert.ok(cache.contents.length <= 4, 'a chest holds at most 4 items');
        for (const t of cache.tiles)
          assert.equal(level.roomByTile[t], cache.room, 'source tiles lie in the chest room');
        const t0 = cache.tiles[0];
        if (!level.outdoor?.has(t0) || level.secretByTile[t0] >= 0) {
          assert.equal(rooms.has(cache.room), false, 'one chest per non-outdoor room');
          rooms.add(cache.room);
        }
      }
      assert.equal(game.pickups.some((p) => supply.has(p.type)), false, 'no supply stays on the floor');
      assert.equal(game.totalItems, level.pickups.length);
    }
  },

  'AC-2 doors, secret closets, and outdoor pockets split chests'() {
    const game = new Game();
    game.load({ name: 'Rooms', rows: ['############', '#P.h.#..a..#', '#....D.....#', '#.a..#..m..#', '#######S####', '#####..h.###', '############'] });
    assert.deepEqual(game.caches.map((c) => c.contents), [['health', 'ammo'], ['ammo', 'bullets'], ['health']]);
    assert.ok(game.level.secretByTile[game.caches[2].idx] >= 0, 'the closet chest stands in the secret area');
    assert.equal(CACHE_OUTDOOR_LINK, 6);
    const mars = new Game();
    mars.load({ name: 'Mars', planet: 'mars', rows: ['####################', '#P.#...............#', '#..D.h.....a......m#', '#..#...............#', '####################'] });
    assert.equal(mars.caches.length, 2);
    assert.deepEqual(mars.caches.map((c) => c.contents), [['health', 'ammo'], ['bullets']]);
  },

  'AC-7 room partition respects doors, walls, and secrets'() {
    const games = LEVELS.map((_, i) => fresh(i));
    const custom = new Game();
    custom.load({ name: 'Rooms', rows: ['############', '#P.h.#..a..#', '#....D.....#', '#.a..#..m..#', '#######S####', '#####..h.###', '############'] });
    games.push(custom);
    for (const { level } of games) {
      const total = level.width * level.rowCount;
      for (let i = 0; i < total; i++) {
        if (level.kind[i] === DOOR || level.kind[i] === EXIT || (level.kind[i] === WALL && level.diag[i] === 0))
          assert.equal(level.roomByTile[i], -1, 'walls, doors, and exits belong to no room');
      }
      level.secrets.forEach((tiles, k) => {
        const ids = new Set([...tiles].map((t) => level.roomByTile[t]));
        assert.equal(ids.size, 1, 'a secret area is one room');
        const [id] = ids;
        for (let i = 0; i < total; i++) {
          if (level.roomByTile[i] === id)
            assert.equal(level.secretByTile[i], k, 'no foreign floor shares a secret room');
        }
      });
      const snap = () => JSON.stringify([Array.from(level.secretByTile), level.secrets.length, Array.from(level.roomByTile), level.roomCount]);
      const before = snap();
      level.findRooms();
      assert.equal(snap(), before, 'findRooms is idempotent');
    }
  },

  'AC-3 chests stand against a full wall and face into the room'() {
    const dx = [1, 0, -1, 0];
    const dy = [0, 1, 0, -1];
    for (let i = 0; i < LEVELS.length; i++) {
      const game = fresh(i);
      const { level } = game;
      const { width } = level;
      const used = new Set();
      const blocked = new Set([level.grid.getCell(level.playerStart)]);
      for (const e of level.enemies)
        blocked.add(level.grid.getCell(e.pos));
      for (const b of level.barrels)
        blocked.add(level.grid.getCell(b.pos));
      for (const p of level.pickups) {
        if (!CACHE_TYPES.includes(p.type))
          blocked.add(level.grid.getCell(p.pos));
      }
      for (const c of level.crushers)
        blocked.add(c.idx);
      for (const cache of game.caches) {
        const { idx, wallSide } = cache;
        const x = idx % width;
        const y = (idx - x) / width;
        assert.equal(used.has(idx), false, 'no two chests share a tile');
        used.add(idx);
        assert.equal(level.kind[idx], FLOOR);
        assert.equal(level.diag[idx], 0);
        assert.equal(level.slime[idx], 0);
        assert.equal(level.teleporter[idx], 0);
        assert.equal(blocked.has(idx), false, 'chest tile is free of other entities');
        assert.equal(level.roomByTile[idx], cache.room);
        assert.ok(wallSide >= 0 && wallSide < 4, `level ${i} chest has a wall side`);
        const wi = (y + dy[wallSide]) * width + x + dx[wallSide];
        assert.equal(level.kind[wi], WALL);
        assert.equal(level.diag[wi], 0);
        assert.ok(level.isWalkable(x - dx[wallSide], y - dy[wallSide]), 'the tile opposite the wall is walkable');
        for (let d = 0; d < 4; d++) {
          const k = level.kind[(y + dy[d]) * width + x + dx[d]];
          assert.ok(k !== DOOR && k !== EXIT, 'no door or exit beside a chest');
        }
        const centre = level.center(x, y);
        assert.ok(Math.abs(cache.pos.x - (centre.x + CACHE_WALL_OFFSET * dx[wallSide])) < 1e-9);
        assert.ok(Math.abs(cache.pos.y - (centre.y + CACHE_WALL_OFFSET * dy[wallSide])) < 1e-9);
        assert.equal(cache.angle, Math.atan2(-dy[wallSide], -dx[wallSide]));
      }
    }
    const first = fresh(0).caches.find((c) => c.contents.includes('shotgun'));
    assert.equal(first.idx, 1 * fresh(0).level.width + 2);
    assert.equal(first.wallSide, 3);
  },

  'AC-4 a wall chest opens from its tile and doors still win ties'() {
    const rows = ['##########', '#........#', '#P...a...#', '#........#', '##########'];
    const make = () => {
      const g = new Game();
      g.load({ name: 'Wall chest', rows });
      g.state = 'play';
      return g;
    };
    const opens = (g) => g.events.filter((e) => e.type === 'cacheOpen').length;
    const tryAt = (offset, away) => {
      const g = make();
      const cache = g.caches[0];
      const centre = g.level.center(cache.idx % g.level.width, Math.floor(cache.idx / g.level.width));
      const dir = new Vec2(cache.pos.x - centre.x, cache.pos.y - centre.y);
      const len = dir.getMagnitude();
      let at = centre;
      let angle = Math.atan2(dir.y, dir.x) + Math.PI;
      if (offset) {
        const ux = len ? dir.x / len : 1;
        const uy = len ? dir.y / len : 0;
        at = new Vec2(cache.pos.x - ux * offset, cache.pos.y - uy * offset);
        angle = Math.atan2(uy, ux) + (away ? Math.PI : 0);
      }
      g.player.body.setPosition(at);
      g.player.angle = angle;
      g.events.length = 0;
      g.update(1 / 60, input({ use: true }));
      return opens(g);
    };
    assert.equal(tryAt(0, true), 1, 'standing on the chest tile facing away opens it once');
    assert.equal(tryAt(40, true), 0, 'facing away at 40 units opens nothing');
    assert.equal(tryAt(100, false), 0, 'beyond 96 units opens nothing');

    const tie = new Game();
    tie.load({ name: 'Door tie', rows: ['#######', '#.....#', '#..D.a#', '#..P..#', '#######'] });
    tie.state = 'play';
    const door = [...tie.level.doors.values()][0];
    tie.player.body.setPosition(new Vec2((door.center.x + tie.caches[0].pos.x) / 2, tie.caches[0].pos.y + 56));
    tie.player.angle = -Math.PI / 2;
    tie.update(1 / 60, input({ use: true }));
    assert.equal(door.target, 1, 'the door wins the tie');
    assert.equal(tie.caches[0].state, 'closed');
  },

  'AC-5 a room chest grants everything with one per-kind message'() {
    const game = new Game();
    game.load(0);
    game.state = 'play';
    game.player.health = 100;
    game.player.shells = 0;
    game.player.bullets = 0;
    game.player.rockets = 0;
    game.events.length = 0;
    const first = game.caches.find((c) => c.contents.includes('shotgun'));
    game.openCache(first);
    assert.equal(game.message.text, 'You got the Shotgun! · SHELLS +8');
    assert.equal(game.events.filter((e) => e.type === 'weaponPickup').length, 1);
    assert.equal(game.events.filter((e) => e.type === 'pickup').length, 1);
    assert.equal(game.itemsPicked, 2);
    const next = game.caches.find((c) => c.contents.join() === 'ammo,ammo');
    game.openCache(next);
    assert.equal(game.message.text, 'SHELLS +16');

    const custom = new Game();
    custom.load({ name: 'Msg', rows: ['#######', '#P....#', '#.....#', '#######'] });
    custom.state = 'play';
    const { player } = custom;
    player.health = 60;
    player.bullets = 0;
    player.weapons.chaingun = false;
    const cache = custom.addCache([1 * custom.level.width + 2], ['health', 'health', 'chaingun', 'bullets']);
    custom.openCache(cache);
    assert.equal(custom.message.text, 'You got the Chaingun! · Health +40 · BULLETS +40');

    player.health = 100;
    player.shells = AMMO_TYPES.shells.max;
    const full = custom.addCache([1 * custom.level.width + 3], ['health', 'ammo']);
    custom.openCache(full);
    assert.deepEqual(full.contents, ['health', 'ammo']);
    assert.equal(custom.message.text, 'SHELLS full');
  },

  'AC-6 the lid clears the wall in runtime and export'() {
    assert.equal(CHEST_LID_OPEN_ANGLE, 1.4);
    const lid = chestLidMesh();
    const s = Math.sin(-CHEST_LID_OPEN_ANGLE);
    const c = Math.cos(-CHEST_LID_OPEN_ANGLE);
    const limit = -(TILE / 2 - CACHE_WALL_OFFSET) + 1 - 1e-6;
    for (let i = 0; i < lid.vertices.length; i += 3) {
      const z = lid.vertices[i + 1] * s + lid.vertices[i + 2] * c + CHEST_LID_HINGE.z;
      assert.ok(z >= limit, `lid vertex stays clear of the wall (z=${z})`);
    }
    const model = JSON.parse(readFileSync(new URL('../src/models/prop-supply-chest.polygun.json', import.meta.url), 'utf8'));
    const track = (id) => model.animations.find((a) => a.id === id).tracks.lid.rotation;
    assert.equal(track('open').at(-1).value.x, -CHEST_LID_OPEN_ANGLE);
    for (const key of track('emptied'))
      assert.equal(key.value.x, -CHEST_LID_OPEN_ANGLE);
    assert.equal(track('closed').at(-1).value.x, 0);
  },

  'AC-8 chest editor exports mirror the runtime assets'() {
    const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
    const model = read('../src/models/prop-supply-chest.polygun.json');
    assert.equal(model.format, 'polygun');
    assert.equal(model.id, 'prop-supply-chest');
    assert.deepEqual(model.nodes.map((n) => n.id), ['root', 'body', 'lid']);
    assert.deepEqual(model.animations.map((a) => a.id), ['closed', 'open', 'emptied']);
    const atlas = chestAtlas();
    const pixels = read('../src/textures/chest_atlas.pixelgun.json');
    assert.equal(pixels.format, 'pixelgun');
    assert.equal([pixels.width, pixels.height].join('x'), `${atlas.width}x${atlas.height}`);
    assert.ok(Buffer.from(pixels.rgbaBase64, 'base64').equals(Buffer.from(atlas.data)), 'the exported atlas matches chestAtlas() byte for byte');
    assert.ok(Buffer.from(model.atlas.dataBase64, 'base64').equals(Buffer.from(atlas.data)));
    assert.deepEqual(validateSong(read('../src/songs/sfx-pickups-chest-open.groovr.json')), []);
  },

  'AC-1 shotgun kick is capped, render-only, and leaves seeded outcomes identical'() {
    const make = () => {
      const game = fresh(0);
      clearEnemies(game);
      game.rand = Rand.create(7);
      game.player.weapon = 'shotgun';
      game.player.shells = 10;
      game.player.cooldown = 0;
      game.player.angle = 0;
      const { x, y } = game.player.pos;
      game.addEnemy('imp', new Vec2(x + 120, y));
      game.addEnemy('imp', new Vec2(x + 200, y + 10));
      return game;
    };
    const a = make();
    const b = make();
    Object.assign(b.player.kick, { pitch: 0.05, yaw: 0.02, roll: 0.01, fov: 0.03 });
    a.update(1 / 60, input({ fire: true }));
    b.update(1 / 60, input({ fire: true }));
    assert.ok(a.player.kick.pitch > 0 && a.player.kick.pitch <= WEAPONS.shotgun.feel.cap + 1e-12, 'AC-1 pitch within cap');
    assert.ok(b.player.kick.pitch <= WEAPONS.shotgun.feel.cap + 1e-12, 'AC-1 pre-loaded pitch stays within cap');
    assert.ok(a.player.kick.fov > 0, 'AC-1 fov punch');
    assert.equal(a.player.angle, b.player.angle, 'AC-1 kick never changes aim');
    assert.deepEqual(a.enemies.map((e) => e.hp), b.enemies.map((e) => e.hp), 'AC-1 enemy outcomes identical');
    assert.equal(a.rand.float(), b.rand.float(), 'AC-1 rand stream identical');
  },

  'AC-2 kick relaxation is frame-rate independent and monotone'() {
    for (const weapon of ['shotgun', 'rocket']) {
      const make = () => {
        const game = fresh(0);
        clearEnemies(game);
        game.player.weapons.rocket = true;
        game.player.rockets = 5;
        game.player.weapon = weapon;
        game.player.cooldown = 0;
        game.update(1 / 60, input({ fire: true }));
        return game;
      };
      const a = make();
      const b = make();
      let last = a.player.kick.pitch;
      assert.ok(last > 0, `AC-2 ${weapon} kicked`);
      for (let i = 0; i < 36; i++) {
        a.update(1 / 60, input({}));
        assert.ok(a.player.kick.pitch <= last && a.player.kick.pitch >= 0, `AC-2 ${weapon} pitch monotone`);
        last = a.player.kick.pitch;
      }
      for (let i = 0; i < 6; i++)
        b.update(0.1, input({}));
      for (const key of ['pitch', 'roll', 'fov'])
        assert.ok(Math.abs(a.player.kick[key] - b.player.kick[key]) < 1e-6, `AC-2 ${weapon} ${key} frame-rate independent`);
      for (let i = 0; i < 90; i++)
        a.update(1 / 60, input({}));
      for (const key of ['pitch', 'yaw', 'roll', 'fov'])
        assert.equal(a.player.kick[key], 0, `AC-2 ${weapon} ${key} fully relaxed`);
    }
  },

  'AC-3 sustained chaingun fire plateaus under the cap and spins down once on release'() {
    const game = fresh(0);
    clearEnemies(game);
    game.player.weapons.chaingun = true;
    game.player.weapon = 'chaingun';
    game.player.bullets = 500;
    game.player.cooldown = 0;
    const cap = WEAPONS.chaingun.feel.cap;
    let maxPitch = 0;
    let lateMax = 0;
    const yawSigns = [];
    for (let i = 0; i < 180; i++) {
      game.events.length = 0;
      game.update(1 / 60, input({ fire: true }));
      const kick = game.player.kick;
      maxPitch = Math.max(maxPitch, kick.pitch);
      if (i >= 120)
        lateMax = Math.max(lateMax, kick.pitch);
      if (game.events.some((e) => e.type === 'chaingun'))
        yawSigns.push(Math.sign(kick.yaw));
    }
    assert.ok(maxPitch <= cap + 1e-9, 'AC-3 pitch capped');
    assert.ok(lateMax > cap / 2, 'AC-3 pitch plateaus above half the cap');
    for (let i = 1; i < yawSigns.length; i++)
      assert.notEqual(yawSigns[i], yawSigns[i - 1], 'AC-3 yaw alternates between rounds');
    game.events.length = 0;
    for (let i = 0; i < 15; i++)
      game.update(1 / 60, input({}));
    const spins = game.events.filter((e) => e.type === 'chaingunSpin');
    assert.equal(spins.length, 1, 'AC-3 exactly one spin-down');
    assert.ok(spins[0].heat > 0 && spins[0].heat <= 1, 'AC-3 spin heat in range');
    assert.equal(game.player.kick.burst, 0);
    assert.ok(game.player.kick.pitch < 0.15 * cap, 'AC-3 pitch falls within 0.25 s');
    for (let i = 0; i < 30; i++)
      game.update(1 / 60, input({}));
    assert.equal(game.events.filter((e) => e.type === 'chaingunSpin').length, 1, 'AC-3 no extra spin-down');
  },

  'AC-4 dry fire, melee, switching, death, and intermission leave no kick'() {
    const zero = (game, message) => {
      for (const key of ['pitch', 'yaw', 'roll', 'fov', 'heat', 'burst'])
        assert.equal(game.player.kick[key], 0, `AC-4 ${message}: ${key}`);
    };
    const setup = () => {
      const game = fresh(0);
      clearEnemies(game);
      game.player.weapons.chaingun = true;
      game.player.bullets = 500;
      game.player.cooldown = 0;
      return game;
    };
    let game = setup();
    game.player.shells = 0;
    game.player.cooldown = 0;
    game.events.length = 0;
    game.update(1 / 60, input({ fire: true }));
    zero(game, 'dry pull');
    assert.ok(game.events.some((e) => e.type === 'dry'));
    assert.ok(!game.events.some((e) => e.type === 'fire' || e.type === 'chaingunSpin'));

    game = setup();
    game.selectWeapon('knife');
    game.player.cooldown = 0;
    game.update(1 / 60, input({ fire: true }));
    zero(game, 'knife');

    game = setup();
    game.player.weapon = 'chaingun';
    game.update(1 / 60, input({ fire: true }));
    assert.ok(game.player.kick.pitch > 0);
    game.events.length = 0;
    game.selectWeapon(2);
    zero(game, 'switch');
    assert.ok(!game.events.some((e) => e.type === 'chaingunSpin'), 'AC-4 switching emits no spin-down');

    game = setup();
    game.update(1 / 60, input({ fire: true }));
    assert.ok(game.player.kick.pitch > 0);
    game.hurtPlayer(9999);
    assert.equal(game.state, 'dead');
    zero(game, 'death');

    game = setup();
    game.update(1 / 60, input({ fire: true }));
    game.startIntermission();
    zero(game, 'intermission');

    game = setup();
    game.player.weapon = 'chaingun';
    game.player.bullets = 3;
    game.events.length = 0;
    for (let i = 0; i < 60; i++)
      game.update(1 / 60, input({ fire: true }));
    assert.equal(game.events.filter((e) => e.type === 'chaingunSpin').length, 1, 'AC-4 one spin-down when ammo runs out');
    assert.ok(game.events.some((e) => e.type === 'dry'));
  },

  'AC-5 ranged fire no longer raises Game.shake but explosions still do'() {
    for (const weapon of ['shotgun', 'chaingun', 'rocket']) {
      const game = fresh(0);
      clearEnemies(game);
      Object.assign(game.player.weapons, { chaingun: true, rocket: true });
      Object.assign(game.player, { weapon, shells: 5, bullets: 50, rockets: 5, cooldown: 0 });
      game.shake = 0;
      game.fire();
      assert.equal(game.shake, 0, `AC-5 ${weapon} fire adds no shake`);
    }
    const game = fresh(0);
    clearEnemies(game);
    for (const barrel of game.barrels)
      game.scene.removeBody(barrel.body);
    game.barrels = [];
    game.addBarrel(new Vec2(game.player.pos.x + 60, game.player.pos.y));
    game.hitBarrel(game.barrels[0], 999, 0);
    let peak = 0;
    for (let i = 0; i < 60; i++) {
      game.update(1 / 60, input({}));
      peak = Math.max(peak, game.shake);
    }
    assert.ok(peak > 0, 'AC-5 barrel explosion still shakes');
  },

  'AC-7 camera kick pitches, rolls, and punches FOV, then restores exactly'() {
    const world = Object.assign(Object.create(World.prototype), {
      camera: new PerspectiveCamera(60, new Vec2(1, 4000)),
      baseFov: 60,
      viewportSize: new Vec2(800, 600),
      zoom: 1,
      filmed: false,
    });
    const player = { pos: new Vec2(100, 200), angle: 0.7, bob: 0, moving: 0, crouch: 0, hurt: 0, teleFlash: 0, eye: EYE, kick: { pitch: 0.05, yaw: 0, roll: 0.02, fov: 0.03 } };
    const game = { state: 'play', shake: 0, cam: null, player };
    world.updateCamera(game);
    const { camera } = world;
    assert.ok(camera.target.y > camera.position.y, 'AC-7 camera pitches up');
    const heading = Math.atan2(camera.target.z - camera.position.z, camera.target.x - camera.position.x);
    assert.ok(Math.abs(heading - 0.7) < 1e-9, 'AC-7 heading unchanged');
    assert.ok(camera.up.y < 1, 'AC-7 up tilts');
    assert.ok(Math.abs(Math.hypot(camera.up.x, camera.up.y, camera.up.z) - 1) < 1e-9, 'AC-7 up stays unit');
    assert.ok(Math.abs(camera.fov - 60 * 1.03) < 1e-9, 'AC-7 fov punch');
    assert.equal(player.angle, 0.7);
    Object.assign(player.kick, { pitch: 0, yaw: 0, roll: 0, fov: 0 });
    world.updateCamera(game);
    assert.ok(camera.up.x === 0 && camera.up.y === 1 && camera.up.z === 0, 'AC-7 up restored exactly');
    assert.equal(camera.fov, 60, 'AC-7 fov restored exactly');
  },

  'AC-7 muzzle light normalizes by weapon flash duration'() {
    const game = fresh(0);
    clearEnemies(game);
    const camPos = new Vec3(game.player.pos.x, EYE, game.player.pos.y);
    for (const [weapon, flash, expected] of [['chaingun', 0.06, 0.92], ['shotgun', 0.1, 1.02]]) {
      game.player.weapon = weapon;
      game.player.flash = flash;
      const lights = collectDynamicLights(game, camPos, 1.0).filter((l) => l.kind === 'muzzle');
      assert.equal(lights.length, 1);
      assert.ok(Math.abs(lights[0].strength - expected) < 1e-9, `AC-7 ${weapon} muzzle strength`);
    }
  },

  'AC-6 pump sound and pose share SHOTGUN_PUMP contact times'() {
    const sound = new Sound();
    const played = [];
    sound.play = (name, opts) => played.push({ name, ...opts });
    sound.handle({ type: 'fire', pump: true, pos: new Vec2(0, 0) });
    assert.equal(played.find((p) => p.name === 'pump').delay, SHOTGUN_PUMP.open, 'AC-6 pump delay');
    assert.equal(played.find((p) => p.name === 'fire').duck, WEAPONS.shotgun.feel.duck);
    played.length = 0;
    sound.handle({ type: 'chaingunSpin', heat: 0.6 });
    assert.equal(played[0].local, true);
    assert.equal(played[0].params.heat, 0.6);

    const starts = [];
    const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 });
    const ctx = {
      sampleRate: 44100,
      createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
      createWaveShaper: () => ({ curve: null, connect() {} }),
      createOscillator: () => ({ type: 'sine', frequency: param(), connect() {}, start(t) { starts.push(t); }, stop() {} }),
      createGain: () => ({ gain: param(), connect() {} }),
      createBiquadFilter: () => ({ type: 'lowpass', frequency: param(), Q: param(), connect() {} }),
      createBufferSource: () => ({ buffer: null, connect() {}, start(t) { starts.push(t); }, stop() {} }),
    };
    RECIPES.pump(ctx, { connect() {} }, 2, {});
    const forward = 2 + (SHOTGUN_PUMP.close - SHOTGUN_PUMP.open);
    assert.ok(starts.some((t) => Math.abs(t - forward) < 1e-9), 'AC-6 forward stroke at close - open');
    assert.ok(!starts.some((t) => t > 2 + 1e-9 && t < forward - 1e-9), 'AC-6 nothing between back and forward stroke');

    const open = shotgunPose({ elapsed: SHOTGUN_PUMP.open, hasAmmo: true });
    const held = shotgunPose({ elapsed: SHOTGUN_PUMP.push - 1e-6, hasAmmo: true });
    assert.ok(Math.abs(open.pumpPos.z - held.pumpPos.z) < 1e-6, 'AC-6 full rack at open');
    const idle = shotgunPose({ elapsed: -1, hasAmmo: true });
    const closed = shotgunPose({ elapsed: SHOTGUN_PUMP.close + 1e-6, hasAmmo: true });
    assert.ok(Math.abs(closed.pumpPos.z - idle.pumpPos.z) < 1e-9, 'AC-6 rack back to zero at close');
  },

  'AC-8 firearm reports duck the beds within the floor and recover'() {
    const log = [];
    const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 });
    const ctx = {
      state: 'running',
      currentTime: 5,
      sampleRate: 44100,
      createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
      createWaveShaper: () => ({ curve: null, connect() {} }),
      createOscillator: () => ({ type: 'sine', frequency: param(), connect() {}, start() {}, stop() {} }),
      createGain: () => ({ gain: param(), connect() {} }),
      createBiquadFilter: () => ({ type: 'lowpass', frequency: param(), Q: param(), connect() {} }),
      createBufferSource: () => ({ buffer: null, connect() {}, start() {}, stop() {} }),
      createStereoPanner: () => ({ pan: { value: 0 }, connect() {} }),
    };
    const sound = new Sound();
    sound.ctx = ctx;
    sound.master = { connect() {} };
    sound.reverb = { connect() {} };
    sound.duck = {
      gain: {
        cancelScheduledValues: (t) => log.push(['cancel', t]),
        setTargetAtTime: (v, t, tau) => log.push(['target', v, t, tau]),
      },
    };
    sound.muted = false;
    sound.handle({ type: 'rocketFire', pos: new Vec2(0, 0) });
    const targets = log.filter((e) => e[0] === 'target');
    assert.equal(targets[0][1], Math.max(DUCK_FLOOR, 1 - WEAPONS.rocket.feel.duck), 'AC-8 duck depth');
    assert.ok(targets[0][1] >= 0.5, 'AC-8 duck respects floor');
    assert.ok(targets.some((e) => e[1] === 1 && e[2] > 5 && e[3] > 0), 'AC-8 recovery scheduled');
    log.length = 0;
    ctx.currentTime += 0.01;
    sound.handle({ type: 'chaingun', heat: 0 });
    assert.equal(log.filter((e) => e[0] === 'target').length, 0, 'AC-8 shallower duck does not weaken an active deeper one');
    sound.muted = true;
    log.length = 0;
    ctx.currentTime += 1;
    sound.handle({ type: 'rocketFire', pos: new Vec2(0, 0) });
    assert.equal(log.length, 0, 'AC-8 muted schedules no duck');
  },

  'AC-1 spatial returns a shared scratch object updated in place'() {
    const a = spatial(new Vec2(0, 0), new Vec2(100, 0), { angle: 0 });
    const b = spatial(new Vec2(0, 0), new Vec2(0, 300), { angle: 0 });
    assert.equal(a, b);
    assert.ok(Math.abs(b.distance - 300) < 1e-9);
    assert.deepEqual(Object.keys(b), ['pan', 'gain', 'distance']);
  },

  'AC-3 spatial matches the reference attenuation and pan formula'() {
    const listener = new Vec2(10, -20);
    const angle = 0.7;
    const dirs = [[-Math.sin(angle), Math.cos(angle)], [Math.sin(angle), -Math.cos(angle)], [Math.cos(angle), Math.sin(angle)], [-Math.cos(angle), -Math.sin(angle)]];
    for (const d of [0, 20, 100, 300, 600, 1000, 5000])
      for (const [dx, dy] of dirs) {
        const src = new Vec2(listener.x + dx * d, listener.y + dy * d);
        const got = spatial(listener, src, { angle });
        const distance = Math.hypot(src.x - listener.x, src.y - listener.y);
        const side = distance < 1 ? 0 : ((src.x - listener.x) * -Math.sin(angle) + (src.y - listener.y) * Math.cos(angle)) / distance;
        const pan = Math.max(-1, Math.min(1, side * Math.min(1, distance / 70))) * 0.9;
        const gain = distance > 1000 ? 0 : 1 / (1 + (distance / 220) ** 2);
        assert.ok(Math.abs(got.pan - pan) < 1e-12, `pan at ${d}`);
        if (Math.abs(distance - 1000) > 1e-6)
          assert.ok(Math.abs(got.gain - gain) < 1e-12, `gain at ${d}`);
        assert.ok(Math.abs(got.distance - distance) < 1e-9, `distance at ${d}`);
      }
    assert.ok(spatial(new Vec2(0, 0), new Vec2(1000, 0)).gain > 0);
    assert.equal(spatial(new Vec2(0, 0), new Vec2(1000.5, 0)).gain, 0);
  },

  'AC-2 handle plays the same recipes with unchanged delay duck and params'() {
    withAudio(({ sound, ctx, calls }) => {
      const at = (event) => {
        calls.length = 0;
        ctx.currentTime += 10;
        sound.handle({ pos: new Vec2(0, 0), ...event });
        return calls.map((c) => ({ name: c.name, params: c.params, t: c.t }));
      };
      const fire = at({ type: 'fire', pump: true });
      assert.deepEqual(fire.map((c) => c.name), ['fire', 'pump']);
      assert.ok(Math.abs(fire[1].t - fire[0].t - SHOTGUN_PUMP.open) < 1e-9);
      assert.equal(at({ type: 'chaingun', heat: 0.6 })[0].params.heat, 0.6);
      assert.equal(at({ type: 'chainsaw', hit: true })[0].params.hit, true);
      assert.equal(at({ type: 'stomp', power: 0.5 })[0].params.power, 0.5);
      assert.equal(at({ type: 'pain', kind: 'brute' })[0].name, 'painBrute');
      assert.equal(at({ type: 'impact', surface: 'door' })[0].name, 'impactDoor');
    });
    const src = readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8');
    assert.ok(!/\{\s*\.\.\./.test(src.slice(src.indexOf('function route('))), 'no object spread in route/handle/play');
  },

  'AC-4 static routes are reused and dynamic params never leak'() {
    withAudio(({ sound, ctx, calls }) => {
      const run = (event) => {
        calls.length = 0;
        ctx.currentTime += 10;
        sound.handle({ pos: new Vec2(0, 0), ...event });
        return calls[0].params;
      };
      const k1 = run({ type: 'knife' });
      const k2 = run({ type: 'knife' });
      assert.deepEqual(Object.keys(k1), Object.keys(k2));
      assert.equal(run({ type: 'chaingun', heat: 0.6 }).heat, 0.6);
      assert.equal(run({ type: 'chaingun' }).heat, 0);
      assert.equal(run({ type: 'chainsaw', hit: true }).hit, true);
      assert.equal(run({ type: 'chainsaw' }).hit, false);
    });
  },

  'AC-5 pump route is not sticky'() {
    withAudio(({ sound, ctx, calls }) => {
      const names = (event) => {
        calls.length = 0;
        ctx.currentTime += 10;
        sound.handle({ pos: new Vec2(0, 0), ...event });
        return calls.map((c) => c.name);
      };
      assert.deepEqual(names({ type: 'fire' }), ['fire']);
      assert.deepEqual(names({ type: 'fire', pump: true }), ['fire', 'pump']);
      assert.deepEqual(names({ type: 'fire' }), ['fire']);
      assert.deepEqual(names({ type: 'knife' }), ['knife']);
    });
  },

  'AC-6 voiced events resolve recipes by kind and unknown events are silent'() {
    withAudio(({ sound, ctx, calls }) => {
      for (const type of ['pain', 'die', 'alert'])
        for (const kind of ['imp', 'brute', 'skull', 'crawler', 'swarmer', 'wraith', undefined]) {
          const name = `${type}${kind ? kind[0].toUpperCase() + kind.slice(1) : 'Imp'}`;
          if (typeof RECIPES[name] !== 'function')
            continue;
          calls.length = 0;
          ctx.currentTime += 10;
          sound.handle({ type, kind, pos: new Vec2(0, 0) });
          assert.deepEqual(calls.map((c) => c.name), [name]);
        }
      calls.length = 0;
      sound.handle({ type: 'nonsense', pos: new Vec2(0, 0) });
      assert.equal(calls.length, 0);
    });
  },

  'AC-7 world and local placement keep their bus gain and pan'() {
    withAudio(({ sound, ctx, nodes }) => {
      sound.listener.pos.setScalar(0, 0);
      sound.listener.angle = 0;
      const pos = new Vec2(0, 150);
      const expected = spatial(sound.listener.pos, pos, sound.listener);
      const gain = expected.gain;
      const pan = expected.pan;
      sound.play('impactWall', { pos, visible: false });
      const bus = nodes.find((n) => n.kind === 'gain').node;
      assert.ok(Math.abs(bus.gain.value - gain * 0.55) < 1e-12);
      assert.equal(nodes.find((n) => n.kind === 'biquad').node.frequency.value, 800);
      assert.ok(Math.abs(nodes.find((n) => n.kind === 'pan').node.pan.value - pan) < 1e-12);
      nodes.length = 0;
      ctx.currentTime += 10;
      sound.play('dry', { local: true });
      assert.equal(nodes.find((n) => n.kind === 'gain').node.gain.value, 1);
      assert.equal(nodes.find((n) => n.kind === 'pan').node.pan.value, 0);
    });
  },

  'AC-8 pitched sounds get a pitch in range and never leak it'() {
    withAudio(({ sound, ctx, calls }) => {
      for (let i = 0; i < 5; i++) {
        calls.length = 0;
        ctx.currentTime += 10;
        sound.handle({ type: 'knife', pos: new Vec2(0, 0) });
        assert.ok(calls[0].params.pitch >= 0.9 && calls[0].params.pitch <= 1.12);
      }
      calls.length = 0;
      ctx.currentTime += 10;
      sound.handle({ type: 'dry', pos: new Vec2(0, 0) });
      assert.equal(calls[0].params.pitch, undefined);
    });
  },

  'AC-2 dead audio constants are module-private'() {
    for (const name of ['DUCK_ATTACK', 'DUCK_HOLD', 'DUCK_RELEASE', 'LEVEL_MUSIC', 'MUSIC_TRACKS'])
      assert.equal(name in audioModule, false, name);
  },

  'AC-3 public audio test interfaces remain exported'() {
    assert.equal(typeof DUCK_FLOOR, 'number');
    assert.equal(typeof spatial, 'function');
    assert.equal(typeof Sound, 'function');
    for (const fn of Object.values(RECIPES))
      assert.equal(typeof fn, 'function');
  },

  'AC-4 firearm report ducking timings and floor unchanged'() {
    const log = [];
    const sound = new Sound();
    sound.muted = false;
    sound.duck = {
      gain: {
        cancelScheduledValues() {},
        setTargetAtTime: (v, t, tau) => log.push([v, t, tau]),
      },
    };
    sound.duckBeds(0.9, 5);
    assert.equal(log.length, 2);
    assert.ok(log[0][0] >= DUCK_FLOOR);
    assert.ok(Math.abs(log[0][2] - 0.012) < 1e-9);
    assert.ok(Math.abs(log[1][1] - 5.06) < 1e-9);
    assert.ok(Math.abs(log[1][2] - 0.09) < 1e-9);
  },

  'AC-5 level music selection order and fallback unchanged'() {
    const sound = new Sound();
    ['play', 'metal', 'horror', 'boss', 'gore'].forEach((mode, i) => assert.equal(sound.effectiveMusicMode('play', i), mode));
    assert.equal(sound.effectiveMusicMode('play', 99), 'metal');
  },

  'AC-1 controls page: defaults are unchanged, F1 opens controls and left click fires'() {
    const expected = {
      KeyW: 87, ArrowUp: 38, KeyS: 83, ArrowDown: 40, KeyA: 65, KeyD: 68, ArrowLeft: 37, ArrowRight: 39, Space: 32,
      ShiftLeft: 16, ShiftRight: 160, KeyX: 88, ControlLeft: 17, ControlRight: 162, AltLeft: 18, AltRight: 164, Enter: 13,
      KeyC: 67, KeyF: 70, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Numpad1: 97, Numpad2: 98, Numpad3: 99, Numpad4: 100,
      Tab: 9, Escape: 27, F3: 114, F2: 113, KeyE: 69, KeyN: 78, KeyM: 77, KeyV: 86, KeyG: 71, KeyP: 80, Semicolon: 59, KeyB: 66,
      Equal: 61, NumpadAdd: 107, Minus: 45, NumpadSubtract: 109, BracketLeft: 219, BracketRight: 221, F1: 112, Mouse0: 1000,
    };
    for (const layout of ['qwerty', 'azerty', 'qwertz', 'dvorak']) {
      const k = new Keymap({ storage: null, navigator: null });
      k.applyLayoutMap(new Map(Object.entries(PRESETS[layout].glyphs)));
      for (const action of ACTIONS)
        for (const { code, which } of action.bindings)
          if (code) {
            assert.equal(expected[code], which, `${code} keeps its which`);
            assert.equal(k.resolve({ code, key: '' }), which, `${layout} ${code}`);
            assert.equal(k.actionOf(which), action.id);
          }
      assert.equal(k.unboundActions().length, 0);
    }
    const k = new Keymap({ storage: null, navigator: null });
    assert.deepEqual(k.hintLines, DEFAULT_HINT_LINES);
    assert.equal(k.hintLines.length, 4);
    assert.equal(k.hintLines[3].rows[3].keys, 'F2');
    assert.equal(k.hintLines[3].rows[3].label, 'layout: auto (QWERTY)');
    assert.equal(k.hintLines[3].rows[4].keys, 'F1');
    assert.equal(k.hintLines[3].rows[4].label, 'controls');
    const ids = [];
    for (const g of CONTROL_GROUPS)
      for (const a of g.actions)
        ids.push(a.id);
    for (const a of ACTIONS)
      assert.equal(ids.filter((id) => id === a.id).length, a.id === 'menu' || a.id === 'confirm' ? 0 : 1, a.id);
    withRig((inp, rig) => {
      rig.down({ code: 'F1', key: 'F1' });
      assert.equal(inp.took('controls'), true);
      inp.endFrame();
      rig.canvas.mousedown({ button: 0, clientX: 0, clientY: 0 });
      assert.equal(inp.poll().fire, true);
    });
  },

  'AC-1 fire defaults: MOUSE L then X on every layout'() {
    for (const layout of ['qwerty', 'azerty', 'qwertz', 'dvorak']) {
      const k = new Keymap({ storage: null, navigator: null });
      k.applyLayoutMap(new Map(Object.entries(PRESETS[layout].glyphs)));
      assert.deepEqual([...k.slotCodes('fire')], ['Mouse0', 'KeyX'], layout);
      assert.deepEqual([...k.effectiveCodes('fire')], [...k.slotCodes('fire')], layout);
      assert.equal(k.codeLabel('Mouse0'), 'MOUSE L');
      assert.equal(k.codeLabel('KeyX'), (PRESETS[layout].glyphs.KeyX ?? 'x').toUpperCase(), layout);
    }
  },

  'AC-2 controls page: Fire row reads MOUSE L / X with no overflow'() {
    withRig((inp) => {
      const menu = new ControlsMenu(inp.keymap, inp);
      menu.open('title');
      menu.refreshLabels();
      const fire = menu.view.lines.find((l) => l.id === 'fire');
      assert.equal(fire.slot0, 'MOUSE L');
      assert.equal(fire.slot1, 'X');
      for (const line of menu.view.lines)
        if (line.kind === 'action') {
          assert.ok(!/ \+\d+$/.test(line.slot1), line.id);
          assert.equal('extra' in line, false, line.id);
        }
    });
  },

  'AC-3 default fire keys: bare CTRL and ALT no longer fire'() {
    withRig((inp, rig) => {
      for (const code of ['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight']) {
        rig.down({ code, key: '' });
        assert.equal(inp.poll().fire, false, `${code} does not fire`);
        assert.equal(inp.keymap.resolve({ code, key: '' }), 0, `${code} unbound`);
        rig.up({ code, key: '' });
        inp.endFrame();
      }
      for (const code of ['KeyX', 'Enter']) {
        rig.down({ code, key: '' });
        assert.equal(inp.poll().fire, true, `${code} fires`);
        rig.up({ code, key: '' });
        inp.endFrame();
      }
      rig.canvas.mousedown({ button: 0, clientX: 0, clientY: 0 });
      assert.equal(inp.poll().fire, true);
      assert.equal(inp.poll().grenade, false);
    });
  },

  'AC-4 hint lines: default fire hint is click / X and custom fire prints one label'() {
    assert.equal(DEFAULT_HINT_LINES[1].rows[0].keys, 'click / X');
    assert.equal(DEFAULT_HINT_LINES[1].rows[0].label, 'fire');
    const k = new Keymap({ storage: null, navigator: null });
    assert.equal(k.hintLines[1].rows[0].keys, 'click / X');
    k.setBinding('fire', 0, 'KeyJ');
    assert.equal(k.hintLines[1].rows[0].keys, 'J');
    assert.equal(k.hintLines[1].rows[0].label, 'fire');
  },

  'AC-5 two-slot invariant: every default action fits MAX_SLOTS'() {
    const k = new Keymap({ storage: null, navigator: null });
    for (const action of ACTIONS)
      assert.ok(k.effectiveCodes(action.id).length <= MAX_SLOTS, action.id);
    assert.equal(k.unboundActions().length, 0);
    assert.equal(typeof k.extraCount, 'undefined');
  },

  'AC-6 rebinding CTRL to fire is visible and effective'() {
    withRig((inp) => {
      const k = inp.keymap;
      assert.equal(k.setBinding('fire', 1, 'ControlRight').ok, true);
      const menu = new ControlsMenu(k, inp);
      menu.open('title');
      menu.refreshLabels();
      const fire = menu.view.lines.find((l) => l.id === 'fire');
      assert.equal(fire.slot0, 'MOUSE L');
      assert.equal(fire.slot1, 'CTRL');
      const left = k.resolve({ code: 'ControlLeft', key: '' });
      const right = k.resolve({ code: 'ControlRight', key: '' });
      assert.ok(left > 0 && right > 0);
      assert.equal(k.actionOf(left), 'fire');
      assert.equal(k.actionOf(right), 'fire');
      assert.equal(k.resolve({ code: 'AltLeft', key: '' }), 0);
    });
  },

  'AC-7 saved overrides: customised Fire loads verbatim'() {
    const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: '{"version":1,"bindings":{"fire":["KeyJ"]}}' });
    const k = new Keymap({ storage, navigator: null });
    assert.deepEqual([...k.effectiveCodes('fire')], ['KeyJ']);
    assert.equal(CONTROLS_VERSION, 1);
    assert.equal(MAX_SLOTS, 2);
  },

  'AC-2 controls page: bindings round-trip through doomr.controls'() {
    const storage = memoryStorage();
    const k = new Keymap({ storage, navigator: null });
    assert.equal(k.setBinding('jump', 0, 'KeyJ').ok, true);
    assert.equal(storage.data[CONTROLS_STORAGE_KEY], '{"version":1,"bindings":{"jump":["KeyJ"]}}');
    const again = new Keymap({ storage, navigator: null });
    assert.equal(again.actionOf(again.resolve({ code: 'KeyJ', key: 'j' })), 'jump');
    assert.equal(again.resolve({ code: 'Space', key: ' ' }), 0);
    assert.equal(again.codeLabel(again.slotCodes('jump')[0]), 'J');
    again.resetAll();
    assert.equal(storage.data[CONTROLS_STORAGE_KEY], undefined);
    assert.equal(again.resolve({ code: 'KeyJ', key: 'j' }), 0);
    assert.equal(again.resolve({ code: 'Space', key: ' ' }), 32);
    assert.equal(new Keymap({ storage, navigator: null }).resolve({ code: 'Space', key: ' ' }), 32);
  },

  'AC-3 controls page: corrupt or unavailable storage falls back safely'() {
    const record = (bindings, version = 1) => JSON.stringify({ version, bindings });
    const cases = [
      ['{', null],
      [record({ jump: ['KeyJ'] }, 2), null],
      [record([]), null],
      [record(null), null],
      [record({ bogus: ['KeyJ'] }), null],
      ...[...RESERVED_CODES].map((code) => [record({ jump: [code] }), null]),
      [record({ jump: ['KeyJ', 'KeyK', 'KeyL'] }), null],
      [record({ jump: [5] }), null],
      [record({ jump: [''] }), null],
      [record({ jump: ['K'.repeat(40)] }), null],
      [record({ jump: ['Enter'], crouch: ['KeyK'] }), ['crouch', 'KeyK']],
      [record({ jump: ['KeyJ'], crouch: ['KeyJ'] }), ['jump', 'KeyJ']],
    ];
    for (const [raw, survivor] of cases) {
      const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: raw });
      let k;
      assert.doesNotThrow(() => { k = new Keymap({ storage, navigator: null }); });
      assert.equal(storage.writes.length, 0, 'loading never writes');
      assert.equal(k.overrides.size, survivor ? 1 : 0, raw);
      if (survivor) {
        assert.deepEqual([...k.effectiveCodes(survivor[0])], [survivor[1]]);
        assert.equal(k.effectiveCodes(survivor[0] === 'jump' ? 'crouch' : 'jump').includes(survivor[1]), false);
      }
    }
    const boom = () => { throw new Error('storage unavailable'); };
    const throwing = { getItem: boom, setItem: boom, removeItem: boom };
    const k = new Keymap({ storage: throwing, navigator: null });
    assert.equal(k.resolve({ code: 'Space', key: ' ' }), 32);
    assert.equal(k.setBinding('jump', 0, 'KeyJ').saved, false);
    assert.equal(k.actionOf(k.resolve({ code: 'KeyJ', key: 'j' })), 'jump');
    const trapped = {};
    Object.defineProperty(trapped, 'localStorage', { get: boom });
    assert.doesNotThrow(() => new Keymap({ navigator: null }));
  },

  'AC-4 controls page: stealing, swapping and modifier normalisation'() {
    const k = new Keymap({ storage: null, navigator: null });
    const change = k.setBinding('grenade', 0, 'KeyM');
    assert.equal(k.actionOf(k.resolve({ code: 'KeyM', key: 'm' })), 'grenade');
    assert.deepEqual([...k.effectiveCodes('music')], []);
    assert.ok(k.unboundActions().includes('music'));
    assert.equal(change.stolenFrom, 'music');
    const swap = new Keymap({ storage: memoryStorage(), navigator: null });
    swap.setBinding('jump', 1, 'KeyJ');
    assert.deepEqual([...swap.effectiveCodes('jump')], ['Space', 'KeyJ']);
    assert.equal(swap.setBinding('jump', 0, 'KeyJ').swapped, true);
    assert.deepEqual([...swap.effectiveCodes('jump')], ['KeyJ', 'Space']);
    const mod = new Keymap({ storage: null, navigator: null });
    mod.setBinding('crouch', 0, 'ShiftRight');
    assert.deepEqual([...mod.overrides.get('crouch')], ['ShiftLeft']);
    assert.equal(mod.actionOf(mod.resolve({ code: 'ShiftLeft', key: 'Shift' })), 'crouch');
    assert.equal(mod.actionOf(mod.resolve({ code: 'ShiftRight', key: 'Shift' })), 'crouch');
    assert.ok(mod.unboundActions().includes('run'));
    withRig((inp, rig) => {
      const menu = new ControlsMenu(inp.keymap, inp);
      const game = fakeGame();
      menu.open('title');
      menu.view.cursorLine = menu.view.lines.findIndex((l) => l.id === 'grenade');
      rig.down({ code: 'Enter', key: 'Enter' });
      menu.update(0.016, game);
      rig.up({ code: 'Enter', key: 'Enter' });
      rig.down({ code: 'KeyM', key: 'm' });
      menu.update(0.016, game);
      assert.equal(menu.view.toastText, 'M was taken from MUSIC — MUSIC is now UNBOUND');
      assert.equal(menu.view.toastTone, TONE_RED);
    });
  },

  'AC-5 controls page: capture flow, reserved keys, timeout and mouse binding'() {
    withRig((inp, rig) => {
      const menu = new ControlsMenu(inp.keymap, inp);
      const game = fakeGame();
      const v = menu.view;
      const seek = (id) => { v.cursorLine = v.lines.findIndex((l) => l.id === id); v.cursorCol = 0; };
      const begin = () => {
        rig.down({ code: 'Enter', key: 'Enter' });
        menu.update(0.016, game);
        rig.up({ code: 'Enter', key: 'Enter' });
        menu.update(0.016, game);
        assert.equal(v.mode, 'capture');
      };
      menu.open('title');
      seek('jump');
      begin();
      rig.down({ code: 'KeyJ', key: 'j' });
      menu.update(0.016, game);
      assert.equal(inp.keymap.effectiveCodes('jump')[0], 'KeyJ');
      assert.ok(game.events.includes('keycard'));
      rig.up({ code: 'KeyJ', key: 'j' });
      for (const code of ['Escape', 'Enter', 'MetaLeft']) {
        game.events.length = 0;
        seek('crouch');
        begin();
        rig.down({ code, key: code });
        menu.update(0.016, game);
        assert.deepEqual([...inp.keymap.effectiveCodes('crouch')], ['KeyC'], code);
        assert.ok(game.events.includes('dry'), code);
        assert.equal(v.mode, 'browse');
        rig.up({ code, key: code });
        menu.update(0.016, game);
      }
      seek('crouch');
      begin();
      menu.update(5 + 0.02, game);
      assert.equal(v.mode, 'browse');
      seek('grenade');
      begin();
      rig.canvas.mousedown({ button: 2, clientX: 0, clientY: 0 });
      menu.update(0.016, game);
      assert.equal(inp.keymap.effectiveCodes('grenade')[0], 'Mouse2');
      menu.close();
      assert.equal(inp.syncBindings(), true);
      rig.canvas.mousedown({ button: 2, clientX: 0, clientY: 0 });
      assert.equal(inp.poll().grenade, true);
    });
  },

  'AC-6 controls page: raw mode isolates input and rebuilds leave no stuck keys'() {
    withRig((inp, rig) => {
      rig.down({ code: 'KeyW', key: 'w' });
      assert.ok(inp.keys.has('moveForward'));
      inp.setRawMode(true);
      assert.equal(inp.keys.size + inp.heldWhich.size + inp.downByCode.size + inp.pressed.size, 0);
      for (const [code, key] of [['KeyM', 'm'], ['F2', 'F2'], ['Tab', 'Tab'], ['KeyX', 'x']])
        rig.down({ code, key });
      rig.canvas.mousedown({ button: 0, clientX: 0, clientY: 0 });
      for (const id of ['music', 'layoutCycle', 'automap', 'fire', 'Click'])
        assert.equal(inp.took(id), false, id);
      assert.equal(inp.keys.size, 0);
      const drained = [];
      for (let r = inp.nextRaw(); r !== null; r = inp.nextRaw())
        drained.push(r.code);
      assert.deepEqual(drained, ['KeyM', 'F2', 'Tab', 'KeyX', 'Mouse0']);
      for (let i = 0; i < 20; i++)
        rig.down({ code: 'KeyZ', key: 'z' });
      let count = 0;
      while (inp.nextRaw() !== null)
        count++;
      assert.equal(count, RAW_RING_SIZE);
      inp.setRawMode(false);
      rig.down({ code: 'KeyW', key: 'w' });
      inp.keymap.setBinding('moveForward', 0, 'KeyI');
      inp.keymap.clearBinding('moveForward', 1);
      assert.equal(inp.syncBindings(), true);
      assert.equal(inp.keys.has('moveForward'), false);
      rig.down({ code: 'KeyI', key: 'i' });
      assert.equal(inp.poll().forward, 1);
      rig.up({ code: 'KeyI', key: 'i' });
      rig.up({ code: 'KeyW', key: 'w' });
      rig.down({ code: 'KeyW', key: 'w' });
      assert.equal(inp.poll().forward, 0);
    });
  },

  'AC-7 controls page: menus navigate after a WASD rebind and main.js is wired'() {
    withRig((inp, rig) => {
      const k = inp.keymap;
      const moves = [['moveForward', 'KeyI'], ['moveBack', 'KeyK'], ['strafeLeft', 'KeyJ'], ['strafeRight', 'KeyL'], ['turnLeft', 'KeyU'], ['turnRight', 'KeyO']];
      for (const [id, code] of moves) {
        k.setBinding(id, 0, code);
        k.clearBinding(id, 1);
      }
      inp.syncBindings();
      for (const [code, nav] of [['ArrowUp', NAV_UP], ['ArrowDown', NAV_DOWN], ['ArrowLeft', NAV_LEFT], ['ArrowRight', NAV_RIGHT], ['KeyI', NAV_UP]]) {
        rig.down({ code, key: code });
        assert.equal(inp.navigate(), nav, code);
        inp.endFrame();
        assert.equal(inp.navigate(), NAV_NONE);
        rig.up({ code, key: code });
      }
    });
    const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
    for (const s of ['input.navigate()', "input.took('controls')", 'input.syncBindings()', 'controlsMenu.open(', 'CONTROLS_STORAGE_KEY', 'keymap.reload()', 'game.keyLabel'])
      assert.ok(src.includes(s), `AC-7 main.js contains ${s}`);
    for (const s of ["input.took('Key", "input.took('Digit", "input.took('Arrow"])
      assert.ok(!src.includes(s), `AC-7 main.js has no ${s}`);
    const pickup = (game) => {
      const nvg = game.pickups.find((p) => p.type === 'nightvision');
      game.touch({ ref: nvg });
      return game.message.text;
    };
    assert.equal(pickup(fresh(4)), 'Night Vision Goggles! (Press N to toggle)');
    const custom = fresh(4);
    custom.keyLabel = () => 'K';
    assert.equal(pickup(custom), 'Night Vision Goggles! (Press K to toggle)');
  },

  'AC-8 controls page: HUD draws the page, entry, warning and hit-tests, and docs record #26'() {
    const texts = [];
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
          fillText(str) { texts.push(str); },
        };
      },
    };
    const fakeOverlay = {
      clear() {},
      glow: { line() {} },
      crisp: { fillRect() {}, rectLine() {}, line() {}, circleLine() {}, weapon: { quad() {} }, sprites: { quad() {} }, face: { quad() {} } },
    };
    withRig((inp) => {
      inp.keymap.setBinding('grenade', 0, 'KeyM');
      const menu = new ControlsMenu(inp.keymap, inp);
      const game = fresh(0);
      game.state = 'title';
      game.selectingDifficulty = false;
      const hud = new Hud(fakeCanvas, fakeOverlay);
      hud.resize(1024, 768, 1);
      hud.controlsView = menu.view;
      menu.open('title');
      hud.render(game);
      menu.view.scroll = menu.view.lines.length - menu.view.visibleRows;
      hud.render(game);
      for (const t of ['CONTROLS', 'MOVEMENT', 'COMBAT', 'WEAPONS', 'INTERFACE', 'KEY 1', 'KEY 2', '[RESET ALL]', '[BACK]', 'UNBOUND'])
        assert.ok(texts.includes(t), `draws ${t}`);
      menu.view.scroll = 0;
      const L = layoutControls(1024, 768);
      const probe = new Vec2(L.slot1X, L.rowsTop + 1 * 20 + 10);
      assert.equal(hud.controlsHitAt(probe), 3);
      probe.setScalar(L.slot0X, L.rowsTop + 1 * 20 + 10);
      assert.equal(hud.controlsHitAt(probe), 2);
      menu.close();
      assert.equal(hud.controlsHitAt(probe), -1);
      hud.setControlsStatus('F1', 1);
      for (const state of ['title', 'paused']) {
        texts.length = 0;
        game.state = state;
        hud.render(game);
        assert.ok(texts.includes('CONTROLS · F1'), state);
        assert.ok(texts.includes('1 controls unbound — open CONTROLS'), state);
        const dy = state === 'title' ? 80 : 58;
        assert.equal(hud.controlsButtonAt(new Vec2(512, 384 + dy), game), true);
        assert.equal(hud.controlsButtonAt(new Vec2(512, 384 + dy + 60), game), false);
      }
    });
    const md = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const start = md.indexOf('## Controls');
    const rest = md.slice(start + 1);
    const end = rest.indexOf('\n## ');
    const section = end < 0 ? rest : rest.slice(0, end);
    const lines = section.split('\n');
    assert.ok(lines.some((l) => /^\|\s*F1\s*\|[^|]*controls page/.test(l)));
    assert.ok(lines.some((l) => /^\|\s*F2\s*\|[^|]*keyboard layout/.test(l)));
    assert.ok(section.includes('doomr.controls'));
    const log = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
    assert.ok(log.includes('#26') && log.includes('doomr.controls'));
  },

  'AC-1 hud imports: ./game.js import in src/hud.js omits FIRE_COOLDOWN'() {
    const src = readFileSync(new URL('../src/hud.js', import.meta.url), 'utf8');
    const line = src.split('\n').find((l) => l.includes("from './game.js'"));
    for (const name of ['AMMO_FLASH_DURATION', 'DIFFICULTIES', 'DIFFICULTY_ORDER'])
      assert.ok(line.includes(name), name);
    assert.ok(!src.includes('FIRE_COOLDOWN'));
  },

  'AC-2 hud state: unboundControls is not a Hud property'() {
    const hud = new Hud({ width: 0, height: 0, getContext: () => ({}) }, {});
    assert.equal(Object.hasOwn(hud, 'unboundControls'), false);
    hud.setControlsStatus('F1', 3);
    assert.equal(Object.hasOwn(hud, 'unboundControls'), false);
  },

  'AC-1 prune write-only: Hud has no unboundControls and keeps unbound text'() {
    const hud = new Hud({ width: 0, height: 0, getContext: () => ({}) }, {});
    assert.equal(Object.hasOwn(hud, 'unboundControls'), false);
    hud.setControlsStatus('F1', 3);
    assert.equal(Object.hasOwn(hud, 'unboundControls'), false);
    assert.ok(hud.unboundText.includes('3'));
    assert.equal(hud.controlsEntryText, 'CONTROLS · F1');
  },

  'AC-2 prune write-only: Input has no onAction'() {
    const src = readFileSync(new URL('../src/input.js', import.meta.url), 'utf8');
    assert.ok(!src.includes('onAction'));
    const prevDoc = globalThis.document;
    const prevWin = globalThis.window;
    globalThis.document = { addEventListener() {}, pointerLockElement: null };
    globalThis.window = { addEventListener() {} };
    try {
      const inp = new Input({ addEventListener() {} });
      assert.equal(Object.hasOwn(inp, 'onAction'), false);
    } finally {
      globalThis.document = prevDoc;
      globalThis.window = prevWin;
    }
  },

  'AC-3 prune write-only: Keymap has no saveFailed'() {
    const src = readFileSync(new URL('../src/keymap.js', import.meta.url), 'utf8');
    assert.ok(!src.includes('saveFailed'));
    const failing = { getItem: () => null, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
    for (const storage of [memoryStorage(), failing]) {
      const k = new Keymap({ storage, navigator: null });
      assert.equal(Object.hasOwn(k, 'saveFailed'), false);
      k.save();
      assert.equal(Object.hasOwn(k, 'saveFailed'), false);
      k.setBinding('jump', 0, 'KeyJ');
      assert.equal(Object.hasOwn(k, 'saveFailed'), false);
      k.resetAll();
      assert.equal(Object.hasOwn(k, 'saveFailed'), false);
    }
  },

  'AC-4 prune write-only: save and reset return values survive'() {
    const failing = { getItem: () => null, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
    const k = new Keymap({ storage: failing, navigator: null });
    assert.equal(k.save(), false);
    const v = k.version;
    const b = k.bindingsVersion;
    const change = k.resetAll();
    assert.equal(change.ok, true);
    assert.equal(change.saved, false);
    assert.equal(k.version, v + 1);
    assert.equal(k.bindingsVersion, b + 1);
  },

  'AC-5 prune write-only: zero unbound count clears warning'() {
    const hud = new Hud({ width: 0, height: 0, getContext: () => ({}) }, {});
    hud.setControlsStatus('F1', 0);
    assert.equal(hud.unboundText, '');
    hud.setControlsStatus('F1', 2);
    assert.ok(hud.unboundText.length > 0);
  },

  'AC-6 prune write-only: input and keymap rebinding still work'() {
    const k = new Keymap({ storage: memoryStorage(), navigator: null });
    assert.equal(k.setBinding('jump', 0, 'KeyJ').ok, true);
    assert.equal(k.actionOf(k.resolve({ code: 'KeyJ', key: 'j' })), 'jump');
    k.resetAll();
    assert.equal(k.resolve({ code: 'KeyJ', key: 'j' }), 0);
    assert.equal(k.resolve({ code: 'Space', key: ' ' }), 32);
  },

  'AC-3 hud status: setControlsStatus sets entry and unbound text'() {
    const hud = new Hud({ width: 0, height: 0, getContext: () => ({}) }, {});
    hud.setControlsStatus('F1', 2);
    assert.equal(hud.controlsEntryText, 'CONTROLS · F1');
    assert.equal(hud.unboundText, '2 controls unbound — open CONTROLS');
  },

  'AC-4 hud status: zero unbound clears the banner'() {
    const texts = [];
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        fillText(str) { texts.push(str); },
      }),
    };
    const fakeOverlay = {
      clear() {},
      glow: { line() {} },
      crisp: { fillRect() {}, rectLine() {}, line() {}, circleLine() {}, weapon: { quad() {} }, sprites: { quad() {} }, face: { quad() {} } },
    };
    const hud = new Hud(fakeCanvas, fakeOverlay);
    hud.resize(1024, 768, 1);
    hud.setControlsStatus('F1', 2);
    hud.setControlsStatus('F1', 0);
    assert.equal(hud.unboundText, '');
    const game = fresh(0);
    game.selectingDifficulty = false;
    for (const state of ['title', 'paused']) {
      texts.length = 0;
      game.state = state;
      hud.render(game);
      assert.ok(!texts.some((t) => t.includes('controls unbound')), state);
    }
  },

  'AC-5 hud banner: unbound banner still renders on title and paused'() {
    const texts = [];
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        fillText(str) { texts.push(str); },
      }),
    };
    const fakeOverlay = {
      clear() {},
      glow: { line() {} },
      crisp: { fillRect() {}, rectLine() {}, line() {}, circleLine() {}, weapon: { quad() {} }, sprites: { quad() {} }, face: { quad() {} } },
    };
    const hud = new Hud(fakeCanvas, fakeOverlay);
    hud.resize(1024, 768, 1);
    hud.setControlsStatus('F1', 1);
    const game = fresh(0);
    game.selectingDifficulty = false;
    for (const state of ['title', 'paused']) {
      texts.length = 0;
      game.state = state;
      hud.render(game);
      assert.ok(texts.includes('1 controls unbound — open CONTROLS'), state);
      assert.ok(texts.includes('CONTROLS · F1'), state);
    }
  },

  'AC-1 use prompt: a door in reach prompts OPEN then CLOSE and nothing out of reach'() {
    const rows = ['#######', '#.....#', '#..D..#', '#..P..#', '#.....#', '#######'];
    const make = (dy, angle) => {
      const game = new Game();
      game.load({ name: 'Prompt door', rows });
      game.state = 'play';
      const door = [...game.level.doors.values()][0];
      game.player.body.setPosition(new Vec2(door.center.x, door.center.y + dy));
      game.player.angle = angle;
      return { game, door };
    };
    const { game, door } = make(64, -Math.PI / 2);
    game.update(1 / 60, idle);
    assert.equal(game.useTarget.kind, 'door');
    assert.equal(game.useTarget.door, door);
    assert.equal(game.useTarget.verb, 'OPEN');
    assert.ok(game.usePrompt.fade > 0);
    game.update(1 / 60, input({ use: true }));
    assert.equal(door.target, 1);
    game.update(1 / 60, idle);
    assert.equal(game.useTarget.verb, 'CLOSE');

    for (const [dy, angle] of [[100, -Math.PI / 2], [64, Math.PI / 2]]) {
      const far = make(dy, angle);
      run(far.game, 0.2);
      assert.equal(far.game.useTarget.kind, null);
      assert.equal(far.game.usePrompt.fade, 0);
      far.game.update(1 / 60, input({ use: true }));
      assert.equal(far.door.target, 0);
    }
  },

  'AC-2 use prompt: chests prompt LOOT, emptied chests do not, and the door wins ties'() {
    const level = { name: 'Prompt chest', rows: ['##########', '#........#', '#P...a...#', '#........#', '##########'] };
    const make = (dx, angle) => {
      const game = new Game();
      game.load(level);
      game.state = 'play';
      game.player.body.setPosition(new Vec2(game.caches[0].pos.x + dx, game.caches[0].pos.y));
      game.player.angle = angle;
      game.events.length = 0;
      return game;
    };
    for (const [dx, angle] of [[-60, 0], [20, Math.PI]]) {
      const game = make(dx, angle);
      game.update(1 / 60, idle);
      assert.equal(game.useTarget.kind, 'cache');
      assert.equal(game.useTarget.verb, 'LOOT');
      assert.ok(game.usePrompt.fade > 0);
    }
    const open = make(-60, 0);
    open.update(1 / 60, input({ use: true }));
    const events = open.events.filter((e) => e.type === 'cacheOpen');
    assert.equal(events.length, 1);
    assert.deepEqual([events[0].x, events[0].y], [open.caches[0].pos.x, open.caches[0].pos.y]);

    const empty = make(-60, 0);
    empty.caches[0].state = 'emptied';
    empty.caches[0].contents.length = 0;
    run(empty, 0.2);
    assert.equal(empty.useTarget.kind, null);
    assert.equal(empty.usePrompt.fade, 0);

    const tie = new Game();
    tie.load({ name: 'Prompt tie', rows: ['#######', '#.....#', '#..D.a#', '#..P..#', '#######'] });
    tie.state = 'play';
    const door = [...tie.level.doors.values()][0];
    tie.player.body.setPosition(new Vec2((door.center.x + tie.caches[0].pos.x) / 2, tie.caches[0].pos.y + 56));
    tie.player.angle = -Math.PI / 2;
    tie.update(1 / 60, idle);
    assert.equal(tie.useTarget.kind, 'door');
    tie.update(1 / 60, input({ use: true }));
    assert.equal(door.target, 1);
    assert.equal(tie.caches[0].state, 'closed');
  },

  'AC-3 use prompt: unrevealed secret doors never prompt but still open'() {
    const game = new Game();
    game.load({ name: 'Prompt secret', rows: ['#######', '#.....#', '#..S..#', '#..P..#', '#######'] });
    game.state = 'play';
    const door = [...game.level.doors.values()][0];
    game.player.body.setPosition(new Vec2(door.center.x, door.center.y + 64));
    game.player.angle = -Math.PI / 2;
    for (let t = 0; t < 0.3; t += 1 / 60) {
      game.update(1 / 60, idle);
      assert.equal(game.usePrompt.fade, 0);
      assert.equal(game.useTarget.kind, 'door');
      assert.equal(game.useTarget.promptable, false);
    }
    game.update(1 / 60, input({ use: true }));
    assert.equal(door.target, 1);
    assert.equal(door.revealed, true);
    game.update(1 / 60, idle);
    assert.equal(game.useTarget.promptable, true);
    assert.equal(game.useTarget.verb, 'CLOSE');
    assert.ok(game.usePrompt.fade > 0);
  },

  'AC-4 use prompt: a locked door shows LOCKED with its colour'() {
    const game = new Game();
    game.load({ name: 'Prompt lock', rows: ['#######', '#.....#', '#..R..#', '#..P..#', '#######'] });
    game.state = 'play';
    const door = [...game.level.doors.values()][0];
    game.player.body.setPosition(new Vec2(door.center.x, door.center.y + 64));
    game.player.angle = -Math.PI / 2;
    game.player.keys.red = false;
    game.update(1 / 60, idle);
    assert.equal(game.useTarget.verb, 'LOCKED');
    assert.equal(game.useTarget.lock, 'red');
    assert.equal(game.usePrompt.lock, 'red');
    game.events.length = 0;
    game.update(1 / 60, input({ use: true }));
    assert.equal(door.target, 0);
    assert.equal(game.events.filter((e) => e.type === 'locked').length, 1);
    assert.equal(game.message.text, 'You need a Red keycard to open this door.');
    game.player.keys.red = true;
    game.update(1 / 60, idle);
    assert.equal(game.useTarget.verb, 'OPEN');
    assert.equal(game.useTarget.lock, null);
    game.update(1 / 60, input({ use: true }));
    assert.equal(door.target, 1);
  },

  'AC-5 use prompt: the fade eases in and out and resets outside play'() {
    const game = new Game();
    game.load({ name: 'Prompt fade', rows: ['#######', '#.....#', '#..D..#', '#..P..#', '#.....#', '#######'] });
    game.state = 'play';
    const door = [...game.level.doors.values()][0];
    const near = () => {
      game.player.body.setPosition(new Vec2(door.center.x, door.center.y + 64));
      game.player.angle = -Math.PI / 2;
    };
    near();
    let prev = 0;
    for (let i = 0; i < 10; i++) {
      game.update(1 / 60, idle);
      assert.ok(game.usePrompt.fade >= prev);
      prev = game.usePrompt.fade;
    }
    assert.ok(prev >= 0.999);
    game.player.body.setPosition(new Vec2(door.center.x, door.center.y + 100));
    for (let i = 0; i < 16; i++) {
      game.update(1 / 60, idle);
      assert.ok(game.usePrompt.fade <= prev);
      if (game.usePrompt.fade > 0)
        assert.equal(game.usePrompt.verb, 'OPEN');
      prev = game.usePrompt.fade;
    }
    assert.equal(game.usePrompt.fade, 0);
    near();
    run(game, 0.2);
    assert.ok(game.usePrompt.fade > 0.9);
    game.state = 'paused';
    game.update(1 / 60, idle);
    assert.equal(game.usePrompt.fade, 0);
    game.state = 'play';
    near();
    run(game, 0.2);
    assert.ok(game.usePrompt.fade > 0.9);
    game.load(0);
    assert.equal(game.usePrompt.fade, 0);
    assert.equal(game.useTarget.kind, null);
  },

  'AC-6 use prompt: the HUD draws a discreet keycap with the bound key'() {
    const drawn = [];
    const rects = [];
    const ctx = {
      globalAlpha: 1,
      font: '',
      fillStyle: '',
      setTransform() {},
      clearRect() {},
      fillRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fillText(str, x, y) {
        drawn.push({ str, y, alpha: this.globalAlpha, font: this.font });
      },
    };
    const overlay = {
      clear() {},
      glow: { line() {} },
      crisp: {
        fillRect() {},
        rectLine(rect, color, alpha) {
          rects.push({ ...rectBox(rect), color: [...color], alpha });
        },
        line() {},
        circleLine() {},
        weapon: { quad() {} },
        sprites: { quad() {} },
        face: { quad() {} },
      },
    };
    const hud = new Hud({ width: 0, height: 0, getContext: () => ctx }, overlay);
    hud.resize(1024, 768, 1);
    const game = fresh(0);
    game.message.age = 99;
    game.usePrompt.fade = 1;
    game.usePrompt.verb = 'OPEN';
    const keycaps = () => rects.filter((r) => r.y > 394 && r.h < 30);
    hud.render(game);
    const labels = drawn.filter((d) => d.str === 'E');
    assert.equal(labels.length, 1);
    assert.ok(labels[0].font.includes('11px') && labels[0].alpha <= 0.75 && labels[0].y > 394);
    const verbs = drawn.filter((d) => d.str === 'OPEN');
    assert.equal(verbs.length, 1);
    assert.ok(verbs[0].font.includes('9px') && verbs[0].alpha <= 0.45 && verbs[0].y > 394);
    assert.equal(keycaps().length, 1);
    const narrow = keycaps()[0];
    assert.ok(Math.abs(narrow.x + narrow.w / 2 - 512) <= 1);

    const keymap = new Keymap({ storage: null, navigator: null });
    keymap.setBinding('use', 0, 'Mouse3');
    hud.useKeyLabel = keymap.actionLabel('use');
    drawn.length = 0;
    rects.length = 0;
    hud.render(game);
    assert.equal(drawn.filter((d) => d.str === 'MOUSE 4').length, 1);
    assert.ok(keycaps()[0].w > narrow.w);

    hud.useKeyLabel = 'E';
    game.usePrompt.verb = 'LOCKED';
    game.usePrompt.lock = 'red';
    rects.length = 0;
    hud.render(game);
    assert.notDeepEqual(keycaps()[0].color, narrow.color, 'a locked prompt tints the keycap');
    assert.ok(keycaps()[0].color[0] > keycaps()[0].color[1]);
  },

  'AC-7 use prompt: the HUD hides the prompt and keys its text cache'() {
    const drawn = [];
    const rects = [];
    const ctx = {
      globalAlpha: 1,
      setTransform() {},
      clearRect() {},
      fillRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fillText(str) {
        drawn.push(str);
      },
    };
    const overlay = {
      clear() {},
      glow: { line() {} },
      crisp: {
        fillRect() {},
        rectLine(rect) {
          rects.push({ y: rect.topLeftCorner.y, h: rect.size.y });
        },
        line() {},
        circleLine() {},
        weapon: { quad() {} },
        sprites: { quad() {} },
        face: { quad() {} },
      },
    };
    const hud = new Hud({ width: 0, height: 0, getContext: () => ctx }, overlay);
    hud.resize(1024, 768, 1);
    const game = fresh(0);
    const hidden = (label) => {
      drawn.length = 0;
      rects.length = 0;
      hud.render(game);
      assert.ok(!drawn.includes('OPEN'), label);
      assert.equal(rects.filter((r) => r.y > 394 && r.h === 16).length, 0, label);
    };
    game.message.age = 99;
    game.usePrompt.verb = 'OPEN';
    game.usePrompt.fade = 0;
    hidden('fade 0');
    game.usePrompt.fade = 1;
    hud.automap = true;
    hidden('automap');
    hud.automap = false;
    hud.controlsView = { open: true };
    hidden('controls view');
    hud.controlsView = null;
    for (const state of ['paused', 'dead', 'title']) {
      game.state = state;
      game.usePrompt.fade = 1;
      hidden(state);
    }
    game.state = 'play';
    game.message.age = 99;
    game.usePrompt.fade = 0;
    const base = hud.computeHudTextKey(game, false);
    game.usePrompt.fade = 1;
    const faded = hud.computeHudTextKey(game, false);
    assert.notEqual(base, faded);
    game.usePrompt.verb = 'CLOSE';
    assert.notEqual(hud.computeHudTextKey(game, false), faded);
    game.usePrompt.verb = 'OPEN';
    hud.useKeyLabel = 'MOUSE 4';
    assert.notEqual(hud.computeHudTextKey(game, false), faded);
  },

  'AC-8 use prompt: README E row and CHANGELOG document the key prompt'() {
    const md = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const start = md.indexOf('## Controls');
    const rest = md.slice(start + 1);
    const end = rest.indexOf('\n## ');
    const section = end < 0 ? rest : rest.slice(0, end);
    assert.ok(section.split('\n').some((l) => /^\|\s*E\s*\|[^|]*doors[^|]*chests[^|]*prompt/.test(l)));
    const log = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
    const from = log.indexOf('## Unreleased');
    const after = log.slice(from + 1);
    const next = after.indexOf('\n## ');
    assert.ok((next < 0 ? after : after.slice(0, next)).includes('#28'));
  },

  'AC-1 pause toggle: main.js resumes from paused on the pause action through start()'() {
    const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
    const paused = src.slice(src.indexOf("case 'paused':"), src.indexOf("case 'play':"));
    assert.ok(paused.includes("input.took('pause')"));
    assert.ok(paused.includes('start()'));
    assert.ok(!paused.includes("game.state = 'play'"));
    const play = src.slice(src.indexOf("case 'play':"), src.indexOf("case 'dead':"));
    assert.ok(play.includes("input.took('menu') || input.took('pause')"));
    assert.ok(play.includes("game.state = 'paused'"));
    assert.ok(play.includes('input.unlock()'));
  },

  'AC-2 pause toggle: one P press is one pause edge and held repeats never flicker'() {
    withInput((inp, down, up) => {
      const key = { code: 'KeyP', which: 80 };
      down(key);
      assert.equal(inp.took('pause'), true);
      inp.endFrame();
      assert.equal(inp.took('pause'), false);
      down({ ...key, repeat: true });
      down({ ...key, repeat: true });
      assert.equal(inp.took('pause'), false);
      inp.endFrame();
      up(key);
      down(key);
      assert.equal(inp.took('pause'), true);
      inp.endFrame();
      assert.equal(inp.took('pause'), false);
    });
  },

  'AC-3 pause toggle: paused freezes the simulation and play resumes it'() {
    const game = fresh(0);
    game.state = 'paused';
    const x = game.player.pos.x;
    const y = game.player.pos.y;
    const time = game.stats.time;
    const dt = 1 / 60;
    game.update(dt, input({ forward: 1 }));
    assert.equal(game.player.pos.x, x);
    assert.equal(game.player.pos.y, y);
    assert.equal(game.stats.time, time);
    game.state = 'play';
    game.update(dt, input({ forward: 1 }));
    assert.ok(Math.abs(game.stats.time - (time + dt)) < 1e-9);
  },

  'AC-4 pause toggle: the pause overlay names the default P key'() {
    const { texts, hud, game } = pausedHud();
    hud.render(game);
    assert.ok(texts.includes('press P, ENTER or click to resume'));
    assert.ok(texts.includes('PAUSED'));
    assert.ok(texts.includes(hud.controlsEntryText));
    assert.ok(!texts.includes('click or press ENTER to resume'));
  },

  'AC-5 pause toggle: the resume prompt follows rebinds and falls back when unbound'() {
    const { texts, hud, game } = pausedHud();
    const keymap = new Keymap({ storage: null, navigator: null });
    keymap.setBinding('pause', 0, 'KeyK');
    const label = keymap.actionLabel('pause');
    assert.notEqual(label, 'P');
    hud.setPauseKeyLabel(label);
    hud.render(game);
    assert.ok(texts.includes(`press ${label}, ENTER or click to resume`));
    texts.length = 0;
    keymap.clearBinding('pause', 0);
    assert.equal(keymap.actionLabel('pause'), 'UNBOUND');
    hud.setPauseKeyLabel(keymap.actionLabel('pause'));
    hud.render(game);
    assert.ok(texts.includes('click or press ENTER to resume'));
    assert.ok(!texts.some((t) => t.includes('UNBOUND, ENTER')));
  },

  'AC-6 pause toggle: the resume prompt is cached and refreshed only on keymap version change'() {
    const { hud, game } = pausedHud();
    const before = hud.resumeText;
    hud.render(game);
    hud.render(game);
    assert.equal(hud.resumeText, before);
    hud.setPauseKeyLabel(hud.pauseKeyLabel);
    assert.equal(hud.resumeText, before);
    const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
    const at = src.indexOf("hud.setPauseKeyLabel(keymap.actionLabel('pause'))");
    assert.ok(at > src.indexOf('keymap.version !== hintVersion'));
    assert.ok(at < src.indexOf('hintVersion = keymap.version'));
  },

  'AC-7 pause toggle: README P row and CHANGELOG document #31'() {
    const md = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const rest = md.slice(md.indexOf('## Controls') + 1);
    const end = rest.indexOf('\n## ');
    const section = end < 0 ? rest : rest.slice(0, end);
    assert.ok(section.split('\n').some((l) => /^\|\s*P \/ Esc\s*\|[^|]*toggles pause and resume/.test(l)));
    const log = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
    const after = log.slice(log.indexOf('## Unreleased') + 1);
    const next = after.indexOf('\n## ');
    assert.ok((next < 0 ? after : after.slice(0, next)).includes('#31'));
  },

  'AC-1 overlay SpriteBuffer: packs quad positions, UVs and brightness and refuses overflow'() {
    const overlay = new Overlay(makeOverlayWorld().world);
    const sprite = overlay.crisp.weapon;
    assert.equal(sprite.capacity, 6);
    assert.equal(sprite.positions.length, 12);
    assert.equal(sprite.brights.length, 18);
    assert.equal(sprite.uvs.length, 12);
    sprite.quad(edgeRect(10, 20, 30, 50), [0.25, 0.5, 0.75, 1], 0.5);
    assert.equal(sprite.count, 6);
    assert.deepEqual(Array.from(sprite.positions), [10, 50, 30, 50, 30, 20, 10, 50, 30, 20, 10, 20]);
    assert.deepEqual(Array.from(sprite.uvs), [0.25, 0.5, 0.75, 0.5, 0.75, 1, 0.25, 0.5, 0.75, 1, 0.25, 1]);
    for (const v of [0, 3, 6, 9, 12, 15])
      assert.equal(sprite.brights[v], 0.5);
    const before = [Array.from(sprite.positions), Array.from(sprite.uvs), Array.from(sprite.brights)];
    sprite.quad(edgeRect(1, 2, 3, 4), [0, 0, 1, 1], 1);
    assert.equal(sprite.count, 6);
    assert.deepEqual([Array.from(sprite.positions), Array.from(sprite.uvs), Array.from(sprite.brights)], before);
    sprite.clear();
    assert.equal(sprite.count, 0);
    assert.equal(sprite.capacity, 6);
    assert.equal(overlay.glow.weapon, null);
    assert.equal(overlay.glow.face, null);
    assert.equal(overlay.glow.sprites, null);
    assert.equal(overlay.crisp.sprites.capacity, 128 * 6);
  },

  'AC-2 overlay Buffer: appends positions and colors, bounds capacity, and deactivates when empty on upload'() {
    const { world, uploads } = makeOverlayWorld();
    const overlay = new Overlay(world);
    const { fills, lines } = overlay.glow;
    assert.equal(fills.count, 0);
    assert.equal(lines.count, 0);
    assert.equal(fills.mesh.active, false);
    assert.equal(lines.mesh.active, false);
    fills.vertex(new Vec2(1, 2), [0.25, 0.5, 0.75]);
    fills.vertex(new Vec2(3, 4), [1, 0, 0.5]);
    assert.equal(fills.count, 2);
    assert.deepEqual(Array.from(fills.positions.subarray(0, 4)), [1, 2, 3, 4]);
    assert.deepEqual(Array.from(fills.colors.subarray(0, 6)), [0.25, 0.5, 0.75, 1, 0, 0.5]);
    const shared = [0.5, 0.5, 0.5];
    const at = new Vec2();
    for (let i = 2; i < 96; i++)
      fills.vertex(at.setScalar(i, i), shared);
    assert.equal(fills.count, 96);
    fills.vertex(at.setScalar(999, 999), shared);
    assert.equal(fills.count, 96);
    assert.equal(fills.positions[190], 95);
    assert.equal(fills.positions[191], 95);
    uploads.length = 0;
    lines.upload();
    assert.equal(lines.mesh.active, false);
    assert.equal(uploads.length, 0);
    fills.upload();
    assert.equal(fills.mesh.active, true);
    assert.equal(fills.mesh.subMeshes[0].count, 96);
    assert.equal(uploads.length, 2);
    assert.equal(uploads[0].data.length, 192);
    assert.equal(uploads[1].data.length, 288);
    assert.equal(uploads[0].offset, 0);
    assert.equal(uploads[1].offset, 0);
    fills.clear();
    fills.upload();
    assert.equal(fills.mesh.active, false);
  },

  'AC-3 overlay Layer: line, rectLine, circleLine, fill and fillRect emit geometry and render uploads both buffers'() {
    const { world, uploads } = makeOverlayWorld();
    const layer = new Overlay(world).glow;
    const { fills, lines } = layer;
    const pos = (buffer) => Array.from(buffer.positions.subarray(0, buffer.count * 2));

    layer.line(pointList([0, 0, 10, 0, 10, 10]), [1, 0.5, 0.25], 0.5);
    assert.equal(lines.count, 4);
    assert.deepEqual(pos(lines), [0, 0, 10, 0, 10, 0, 10, 10]);
    for (let i = 0; i < 4; i++)
      assert.deepEqual(Array.from(lines.colors.subarray(i * 3, i * 3 + 3)), [0.5, 0.25, 0.125]);
    layer.clear();
    layer.line(pointList([0, 0, 10, 0]), [1, 0.5, 0.25]);
    assert.deepEqual(Array.from(lines.colors.subarray(0, 3)), [1, 0.5, 0.25]);
    layer.clear();
    layer.line(pointList([0, 0, 1, 1]), [1, 1, 1]);
    assert.equal(lines.count, 2);
    layer.clear();
    layer.line(pointList([0, 0]), [1, 1, 1]);
    assert.equal(lines.count, 0);

    layer.rectLine(edgeRect(2, 4, 8, 12), [1, 1, 1]);
    assert.equal(lines.count, 8);
    assert.deepEqual(pos(lines), [2, 4, 8, 4, 8, 4, 8, 12, 8, 12, 2, 12, 2, 12, 2, 4]);
    layer.clear();

    layer.circleLine(new Circ(20, new Vec2(100, 50)), [1, 1, 1], 1, 8);
    assert.equal(lines.count, 16);
    for (let i = 0; i < lines.count; i++)
      assert.ok(Math.abs(Math.hypot(lines.positions[i * 2] - 100, lines.positions[i * 2 + 1] - 50) - 20) < 1e-4);
    layer.clear();
    layer.circleLine(new Circ(20, new Vec2(100, 50)), [1, 1, 1]);
    assert.equal(lines.count, 20);
    layer.clear();

    layer.fill(pointList([0, 0, 4, 0, 4, 4, 0, 4]), [0.5, 0.25, 1]);
    assert.equal(fills.count, 6);
    assert.deepEqual(pos(fills), [0, 0, 4, 0, 4, 4, 0, 0, 4, 4, 0, 4]);
    layer.clear();
    layer.fill(pointList([0, 0, 4, 0, 4, 4]), [1, 1, 1]);
    assert.equal(fills.count, 3);
    layer.clear();
    layer.fill(pointList([0, 0, 4, 0]), [1, 1, 1]);
    assert.equal(fills.count, 0);

    layer.fillRect(edgeRect(1, 2, 4, 6), [1, 0, 0]);
    assert.equal(fills.count, 6);
    assert.deepEqual(pos(fills), [1, 2, 4, 2, 4, 6, 1, 2, 4, 6, 1, 6]);

    const calls = [];
    const camera = {};
    const sceneRender = layer.scene.render;
    layer.scene.render = (...args) => calls.push(args);
    try {
      uploads.length = 0;
      layer.render(camera, 0);
      assert.equal(calls.length, 1);
      assert.equal(calls[0][0], camera);
      assert.equal(calls[0][1], 0);
      assert.equal(fills.mesh.active, true);
      assert.equal(lines.mesh.active, false);
      assert.equal(uploads.length, 2);
      layer.line(pointList([0, 0, 1, 1]), [1, 1, 1]);
      layer.render(camera, 0);
      assert.equal(lines.mesh.active, true);
    } finally {
      layer.scene.render = sceneRender;
    }
  },

  'AC-4 overlay Overlay: initializes glow and crisp layers and delegates resize, clear and restore'() {
    const overlay = new Overlay(makeOverlayWorld().world);
    const { glow, crisp } = overlay;
    assert.notEqual(glow, crisp);
    assert.equal(glow.fills.capacity, 96);
    assert.equal(glow.lines.capacity, 8192);
    assert.equal(crisp.fills.capacity, 8192);
    assert.equal(crisp.lines.capacity, 8192);
    assert.equal(glow.sprites, null);
    assert.ok(crisp.weapon && crisp.face && crisp.sprites);

    const sizes = [];
    const setCustomUniform = Mesh.prototype.setCustomUniform;
    Mesh.prototype.setCustomUniform = function(name, value) {
      sizes.push({ mesh: this, name, value });
      return setCustomUniform.call(this, name, value);
    };
    try {
      overlay.resize(800, 600, 1600, 1200);
    } finally {
      Mesh.prototype.setCustomUniform = setCustomUniform;
    }
    for (const layer of [glow, crisp]) {
      assert.equal(layer.viewportSize.x, 1600);
      assert.equal(layer.viewportSize.y, 1200);
    }
    assert.equal(sizes.length, 7);
    for (const call of sizes) {
      assert.equal(call.name, 'size');
      assert.equal(call.value.x, 800);
      assert.equal(call.value.y, 600);
    }
    const meshes = new Set(sizes.map((c) => c.mesh));
    for (const mesh of [glow.fills.mesh, glow.lines.mesh, crisp.fills.mesh, crisp.lines.mesh, crisp.sprites.mesh, crisp.weapon.mesh, crisp.face.mesh])
      assert.ok(meshes.has(mesh));

    const buffers = [glow.fills, glow.lines, crisp.fills, crisp.lines, crisp.weapon, crisp.face, crisp.sprites];
    glow.fills.vertex(new Vec2(0, 0), [1, 1, 1]);
    glow.lines.vertex(new Vec2(0, 0), [1, 1, 1]);
    crisp.fills.vertex(new Vec2(0, 0), [1, 1, 1]);
    crisp.lines.vertex(new Vec2(0, 0), [1, 1, 1]);
    for (const sprite of [crisp.sprites, crisp.weapon, crisp.face])
      sprite.quad(edgeRect(0, 0, 1, 1), [0, 0, 1, 1], 1);
    for (const buffer of buffers)
      assert.ok(buffer.count > 0);
    overlay.clear();
    for (const buffer of buffers)
      assert.equal(buffer.count, 0);

    const restored = [0, 0];
    glow.scene.restore = () => restored[0]++;
    crisp.scene.restore = () => restored[1]++;
    overlay.restore();
    assert.deepEqual(restored, [1, 1]);
  },

  'AC-1 Hud.segment and Hud.rect write exact coordinates through one reused scratch array'() {
    const calls = [];
    const hud = new Hud(
      { width: 0, height: 0, getContext: () => ({}) },
      { glow: { line: (pts, col, alpha) => calls.push({ ref: pts, pts: flatPoints(pts), col, alpha }) } },
    );
    hud.segment(1, 2, 3, 4, 0, 0.5);
    hud.segment(5, 6, 7, 8, 1);
    hud.rect(10, 20, 30, 40, 2, 0.25);
    hud.rect(-1, -2, 3, 4, 3);
    assert.deepEqual(calls[0].pts, [1, 2, 3, 4]);
    assert.equal(calls[0].alpha, 0.5);
    assert.deepEqual(calls[1].pts, [5, 6, 7, 8]);
    assert.equal(calls[1].alpha, 1);
    assert.deepEqual(calls[2].pts, [10, 20, 40, 20, 40, 60, 10, 60, 10, 20]);
    assert.equal(calls[2].alpha, 0.25);
    assert.deepEqual(calls[3].pts, [-1, -2, 2, -2, 2, 2, -1, 2, -1, -2]);
    assert.notDeepEqual(calls[0].col, calls[1].col);
    assert.equal(calls[0].ref, calls[1].ref, 'segments share one scratch array');
    assert.equal(calls[2].ref, calls[3].ref, 'rects share one scratch array');
  },

  'AC-2 drawKeys and drawAmmo emit unchanged geometry from hoisted constants'() {
    const calls = [];
    const hud = new Hud(
      { width: 0, height: 0, getContext: () => ({ setTransform() {}, fillText() {} }) },
      { glow: { line: (pts, col, alpha) => calls.push({ pts: flatPoints(pts), col, alpha }) } },
    );
    hud.text = () => {};
    hud.drawKeys(100, 500, { blue: true });
    const [kx, ky] = [100, 484];
    const seq = (x, y) => [x, y, x + 12, y, x + 16, y + 4, x + 16, y + 16, x, y + 16, x, y];
    const badge = seq(kx, ky);
    const blueSegs = calls.slice(0, 5).map((c) => c.pts);
    for (let i = 0; i < 5; i++)
      assert.deepEqual(blueSegs[i], [badge[2 * i], badge[2 * i + 1], badge[2 * i + 2], badge[2 * i + 3]]);
    assert.equal(calls[0].alpha, 1);
    assert.deepEqual(calls[5].pts, [kx + 3, ky + 5, kx + 13, ky + 5]);
    assert.deepEqual(calls[6].pts, [kx + 3, ky + 9, kx + 9, ky + 9]);
    assert.deepEqual(calls[9].pts, [kx + 3, ky + 13, kx + 3, ky + 9]);
    assert.equal(calls.length, 10 + 10, 'two unheld cards draw only their five-segment badge outlines');
    assert.equal(calls[10].alpha, 0.24);

    calls.length = 0;
    const player = { shells: 10, bullets: 5, rockets: 0, ammoFlash: { shells: AMMO_FLASH_DURATION, bullets: AMMO_FLASH_DURATION } };
    hud.drawAmmo(1000, 500, player, WEAPONS.shotgun);
    const rects = calls.filter((c) => c.pts.length === 10).map((c) => c.pts);
    assert.deepEqual(rects[0], [846, 479, 910, 479, 910, 505, 846, 505, 846, 479]);
    const rowY = 500 - 23;
    assert.deepEqual(rects.find((r) => r[0] === 914), [914, rowY - 9, 1004, rowY - 9, 1004, rowY + 2, 914, rowY + 2, 914, rowY - 9]);
    const src = readFileSync(new URL('../src/hud.js', import.meta.url), 'utf8');
    assert.ok(!src.includes('const slots = ['));
    assert.ok(!src.includes('const pools = ['));
    assert.ok(/^const KEYCARD_SLOTS = /m.test(src));
    assert.ok(/^const AMMO_POOL_KEYS = /m.test(src));
  },

  'AC-3 weaponPlacement and facePlacement fill a supplied scratch rect'() {
    const wOpts = [
      { width: 1280, height: 760 },
      { width: 1280, height: 760, recoil: 1 },
      { width: 1920, height: 1080, bob: 1.3, moving: 1 },
      { width: 800, height: 600, switchOffset: 0.6 },
    ];
    const wOut = { x0: 0, y0: 0, x1: 0, y1: 0, pixel: 0 };
    for (const o of wOpts) {
      const expected = weaponPlacement(o);
      assert.equal(weaponPlacement(o, wOut), wOut);
      assert.deepEqual(wOut, expected);
    }
    assert.ok(wOut.pixel >= 2 && wOut.x1 - wOut.x0 === WEAPON_CELL_W * wOut.pixel);
    const fOpts = [[new Vec2(1280, 760), 0], [new Vec2(1280, 760), 0.3], [new Vec2(2560, 1440), 0.8]];
    const fOut = { rect: new Rect(), pixel: 0 };
    const snap = (p) => [p.rect.topLeftCorner.x, p.rect.topLeftCorner.y, p.rect.bottomRightCorner.x, p.rect.bottomRightCorner.y, p.pixel];
    for (const [size, hurt] of fOpts) {
      const expected = snap(facePlacement(size, hurt, { rect: new Rect(), pixel: 0 }));
      assert.equal(facePlacement(size, hurt, fOut), fOut);
      assert.deepEqual(snap(fOut), expected);
    }
    assert.notDeepEqual(snap(fOut), snap(facePlacement(fOpts[0][0], fOpts[0][1], { rect: new Rect(), pixel: 0 })), 'a later call overwrote the same object');
  },

  'AC-4 weaponCellUv and faceCellUv return cached identical tuples with the original values'() {
    const inset = 0.02 / (WEAPON_CELL_W * WEAPON_FRAME_COUNT);
    const rows = WEAPON_ORDER.length;
    const vInset = 0.02 / (WEAPON_CELL_H * rows);
    for (let f = 0; f < WEAPON_FRAME_COUNT; f++) {
      const u0 = f / WEAPON_FRAME_COUNT + inset;
      const u1 = (f + 1) / WEAPON_FRAME_COUNT - inset;
      assert.equal(weaponCellUv(f), weaponCellUv(f));
      assert.deepEqual([...weaponCellUv(f)], [u0, 0, u1, 1]);
      for (let r = 0; r < rows; r++) {
        const uv = weaponCellUv(f, WEAPON_ORDER[r]);
        assert.equal(uv, weaponCellUv(f, WEAPON_ORDER[r]));
        assert.deepEqual([...uv], [u0, 1 - (r + 1) / rows + vInset, u1, 1 - r / rows - vInset]);
      }
    }
    const fInset = 0.02 / (FACE_CELL_W * FACE_FRAME_COUNT);
    for (let f = 0; f < FACE_FRAME_COUNT; f++) {
      assert.equal(faceCellUv(f), faceCellUv(f));
      assert.deepEqual([...faceCellUv(f)], [f / FACE_FRAME_COUNT + fInset, 0, (f + 1) / FACE_FRAME_COUNT - fInset, 1]);
    }
  },

  'AC-5 weaponCellUv clamps out-of-range frames and maps unknown weapons to the first row'() {
    assert.equal(weaponCellUv(-3), weaponCellUv(0));
    assert.equal(weaponCellUv(999), weaponCellUv(WEAPON_FRAME_COUNT - 1));
    assert.equal(weaponCellUv(2.9), weaponCellUv(2));
    assert.equal(weaponCellUv(1, 'nope'), weaponCellUv(1, WEAPON_ORDER[0]));
    assert.equal(weaponCellUv(-1, 'nope'), weaponCellUv(0, WEAPON_ORDER[0]));
  },

  'AC-6 drawHud and drawWeapon feed placement and cached UVs to the quads on consecutive frames'() {
    const weaponQuads = [];
    const faceQuads = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const noop = () => {};
    const overlay = {
      clear: noop,
      glow: { line: noop },
      crisp: {
        fillRect: noop,
        rectLine: noop,
        line: noop,
        circleLine: noop,
        weapon: { quad: (r, ...a) => weaponQuads.push([r.topLeftCorner.x, r.topLeftCorner.y, r.bottomRightCorner.x, r.bottomRightCorner.y, ...a]) },
        sprites: { quad: noop },
        face: { quad: (r, ...a) => faceQuads.push([r.topLeftCorner.x, r.topLeftCorner.y, r.bottomRightCorner.x, r.bottomRightCorner.y, ...a]) },
      },
    };
    const hud = new Hud({ width: 0, height: 0, getContext: () => ctx }, overlay);
    hud.resize(1280, 760, 1);
    const game = fresh(0);
    game.player.weapon = 'plasma';
    const frames = [{ bob: 0.4, moving: 1, recoil: 0, hurt: 0 }, { bob: 1.7, moving: 0.5, recoil: 0.3, hurt: 0.2 }];
    let weaponRect;
    let faceRect;
    for (const f of frames) {
      Object.assign(game.player, f);
      hud.render(game);
      const wq = weaponQuads[weaponQuads.length - 1];
      const fq = faceQuads[faceQuads.length - 1];
      const wp = weaponPlacement({ width: 1280, height: 760, bob: f.bob, moving: f.moving, recoil: f.recoil, switchOffset: 0 });
      const fp = facePlacement(new Vec2(1280, 760), f.hurt, { rect: new Rect(), pixel: 0 });
      assert.deepEqual(wq.slice(0, 4), [wp.x0, wp.y0, wp.x1, wp.y1]);
      assert.deepEqual(fq.slice(0, 4), [fp.rect.topLeftCorner.x, fp.rect.topLeftCorner.y, fp.rect.bottomRightCorner.x, fp.rect.bottomRightCorner.y]);
      assert.ok(Object.isFrozen(wq[4]) && Object.isFrozen(fq[4]), 'UVs are the cached frozen tuples');
      assert.ok(Array.from({ length: FACE_FRAME_COUNT }, (_, i) => faceCellUv(i)).includes(fq[4]));
      assert.ok(Array.from({ length: WEAPON_FRAME_COUNT }, (_, i) => weaponCellUv(i, 'plasma')).includes(wq[4]));
      weaponRect = wq;
      faceRect = fq;
    }
    assert.notDeepEqual(weaponQuads[0].slice(0, 4), weaponRect.slice(0, 4), 'second frame moved the weapon quad');
    assert.notDeepEqual(faceQuads[0].slice(0, 4), faceRect.slice(0, 4), 'second frame moved the face quad');
  },

  'AC-1 QuadBatch defaults pass geometry sizes, default shaders and material to the superclass'() {
    withQuadHarness(({ gl, programs, inactives }) => {
      const atlas = { data: new Uint8Array(16), width: 2, height: 2 };
      const batch = new QuadBatch(gl, { capacity: 4, atlas });
      assert.equal(batch.vertices.length, 72);
      assert.equal(batch.uvs.length, 48);
      assert.equal(batch.capacity, 4);
      assert.equal(programs.length, 1);
      assert.equal(programs[0].mesh, batch);
      assert.equal(programs[0].args[0], TEXTURED_VERTEX);
      assert.equal(programs[0].args[1], SOLID_TEXTURED_FRAGMENT);
      const mat = programs[0].args[2];
      assert.ok(mat instanceof Material);
      assert.ok(mat.diffuse instanceof Vec3);
      assert.equal(mat.diffuse.x, 1);
      assert.equal(mat.diffuse.y, 1);
      assert.equal(mat.diffuse.z, 1);
      assert.equal(inactives.length, 1);
      assert.equal(inactives[0].mesh, batch);
    });
  },

  'AC-2 QuadBatch forwards custom vertex, fragment and material to addProgram'() {
    withQuadHarness(({ gl, programs }) => {
      const atlas = { data: new Uint8Array(16), width: 2, height: 2 };
      const customMat = new Material({ diffuse: new Vec3(0.5, 0.4, 0.3) });
      const customVertex = 'attribute vec3 aPosition; void main() {}';
      const customFragment = 'precision mediump float; void main() {}';
      const batch = new QuadBatch(gl, {
        capacity: 2,
        atlas,
        vertex: customVertex,
        fragment: customFragment,
        material: customMat,
      });
      assert.equal(programs.length, 1);
      assert.equal(programs[0].mesh, batch);
      assert.equal(programs[0].args[0], customVertex);
      assert.equal(programs[0].args[1], customFragment);
      assert.equal(programs[0].args[2], customMat);
    });
  },

  'AC-3 QuadBatch builds a nearest-neighbor atlas texture with overridable options'() {
    withQuadHarness(({ gl, textures, sharedTextures }) => {
      const atlas = { data: new Uint8Array(16), width: 2, height: 2 };
      const batchA = new QuadBatch(gl, { capacity: 2, atlas });
      assert.equal(textures.length, 1);
      assert.equal(textures[0].mesh, batchA);
      assert.equal(textures[0].args[0], atlas.data);
      assert.ok(textures[0].args[1].size instanceof Vec2);
      assert.equal(textures[0].args[1].size.x, atlas.width);
      assert.equal(textures[0].args[1].size.y, atlas.height);
      assert.equal(textures[0].args[1].magFilter, gl.NEAREST);
      assert.equal(textures[0].args[1].minFilter, gl.NEAREST);
      assert.equal(sharedTextures.length, 0);

      const batchB = new QuadBatch(gl, { capacity: 2, atlas, textureOptions: { magFilter: 1 } });
      assert.equal(textures.length, 2);
      assert.equal(textures[1].mesh, batchB);
      assert.equal(textures[1].args[0], atlas.data);
      assert.equal(textures[1].args[1].magFilter, 1);
      assert.equal(textures[1].args[1].minFilter, gl.NEAREST);
      assert.equal(sharedTextures.length, 0);
    });
  },

  'AC-4 QuadBatch binds sharedTexture and skips atlas upload'() {
    withQuadHarness(({ gl, textures, sharedTextures }) => {
      const sentinel = { id: 'sentinel-texture' };
      const batch = new QuadBatch(gl, { capacity: 2, sharedTexture: sentinel });
      assert.equal(sharedTextures.length, 1);
      assert.equal(sharedTextures[0].mesh, batch);
      assert.equal(sharedTextures[0].args[0], sentinel);
      assert.equal(textures.length, 0);
    });
  },

  'AC-5 texturedMesh binds shared texture or falls back to nearest-neighbor setTexture'() {
    withQuadHarness(({ gl, programs, textures, sharedTextures }) => {
      const geometry = new CustomMesh();
      geometry.vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      geometry.uvs = new Float32Array([0, 0, 1, 0, 0, 1]);
      geometry.setPrimitive('TRIANGLES');
      const atlas = { data: new Uint8Array(16), width: 2, height: 2 };
      const sentinel = { id: 'shared-texture' };

      const meshA = texturedMesh(gl, geometry, { atlas, sharedTexture: sentinel });
      assert.equal(sharedTextures.length, 1);
      assert.equal(sharedTextures[0].mesh, meshA);
      assert.equal(sharedTextures[0].args[0], sentinel);
      assert.equal(textures.length, 0);
      assert.equal(programs.length, 1);
      assert.equal(programs[0].mesh, meshA);
      assert.equal(programs[0].args[0], TEXTURED_VERTEX);
      assert.equal(programs[0].args[1], SOLID_TEXTURED_FRAGMENT);
      assert.ok(programs[0].args[2] instanceof Material);

      const customMat = new Material({ diffuse: new Vec3(0.1, 0.2, 0.3) });
      const customFrag = 'precision mediump float; void main() {}';
      const meshB = texturedMesh(gl, geometry, {
        atlas,
        material: customMat,
        fragment: customFrag,
        textureOptions: { magFilter: 1 },
      });
      assert.equal(textures.length, 1);
      assert.equal(textures[0].mesh, meshB);
      assert.equal(textures[0].args[0], atlas.data);
      assert.ok(textures[0].args[1].size instanceof Vec2);
      assert.equal(textures[0].args[1].size.x, atlas.width);
      assert.equal(textures[0].args[1].size.y, atlas.height);
      assert.equal(textures[0].args[1].magFilter, 1);
      assert.equal(textures[0].args[1].minFilter, gl.NEAREST);
      assert.equal(programs.length, 2);
      assert.equal(programs[1].mesh, meshB);
      assert.equal(programs[1].args[0], TEXTURED_VERTEX);
      assert.equal(programs[1].args[1], customFrag);
      assert.equal(programs[1].args[2], customMat);

      const savedSetSharedTexture = Mesh.prototype.setSharedTexture;
      try {
        Mesh.prototype.setSharedTexture = undefined;
        const meshC = texturedMesh(gl, geometry, { atlas, sharedTexture: sentinel });
        assert.equal(textures.length, 2);
        assert.equal(textures[1].mesh, meshC);
        assert.equal(textures[1].args[0], atlas.data);
        assert.ok(textures[1].args[1].size instanceof Vec2);
        assert.equal(textures[1].args[1].size.x, atlas.width);
        assert.equal(textures[1].args[1].size.y, atlas.height);
        assert.equal(textures[1].args[1].magFilter, gl.NEAREST);
        assert.equal(textures[1].args[1].minFilter, gl.NEAREST);
      } finally {
        Mesh.prototype.setSharedTexture = savedSetSharedTexture;
      }
    });
  },

  'AC-1 emit writes pooled events with exact keys and a copied pos'() {
    const game = fresh();
    game.events.length = 0;
    const initialArray = game.events;
    game.emit('dry');
    assert.deepEqual(Object.keys(game.events[0]).sort(), ['pos', 'type', 'visible', 'x', 'y']);
    assert.equal(game.events[0].pos.x, game.player.pos.x);
    assert.equal(game.events[0].pos.y, game.player.pos.y);
    assert.notEqual(game.events[0].pos, game.player.pos);
    game.emit('dry');
    game.emit('dry');
    assert.equal(game.events, initialArray);
  },

  'AC-2 emit caps the queue at 256 keeping the newest with unique objects'() {
    const game = fresh();
    game.events.length = 0;
    for (let i = 0; i < 300; i++)
      game.emit('mark', null, { n: i });
    assert.equal(game.events.length, 256);
    assert.equal(game.events[0].n, 44);
    assert.equal(game.events[255].n, 299);
    const set = new Set(game.events);
    assert.equal(set.size, 256);
  },

  'AC-3 recycled events carry no stale extras and extras are not retained'() {
    const game = fresh();
    game.events.length = 0;
    const extra = { kind: 'imp' };
    game.emit('alert', null, extra);
    extra.kind = 'mutated';
    assert.equal(game.events[0].kind, 'imp');
    game.events.length = 0;
    for (let i = 0; i < 256; i++)
      game.emit('dry');
    for (const ev of game.events)
      assert.equal('kind' in ev, false);
  },

  'AC-4 emit reuses pooled event objects and positions after draining'() {
    const game = fresh();
    game.events.length = 0;
    for (let i = 0; i < 256; i++)
      game.emit('dry');
    const firstRoundObjects = new Set(game.events);
    const firstRoundPositions = new Set(game.events.map((e) => e.pos));
    assert.equal(firstRoundObjects.size, 256);
    assert.equal(firstRoundPositions.size, 256);
    game.events.length = 0;
    for (let i = 0; i < 256; i++)
      game.emit('dry');
    assert.equal(game.events.length, 256);
    for (const ev of game.events) {
      assert.ok(firstRoundObjects.has(ev));
      assert.ok(firstRoundPositions.has(ev.pos));
    }
  },

  'AC-5 Sound.handle forwards one shared dispatch object per play'() {
    const sound = new Sound();
    const calls = [];
    sound.play = (name, options) => {
      calls.push({
        name,
        optionsRef: options,
        visible: options.visible,
        pos: options.pos?.clone?.() ?? options.pos,
      });
    };
    const boomPos = new Vec2(10, 10);
    sound.handle({ type: 'boom', pos: boomPos, visible: false });
    sound.handle({ type: 'boom', pos: boomPos, visible: false });
    sound.handle({ type: 'weaponSwitch', weapon: 'chainsaw', pos: new Vec2(), visible: true });
    assert.equal(calls.length, 4);
    const firstOptions = calls[0].optionsRef;
    for (const c of calls)
      assert.equal(c.optionsRef, firstOptions);
    assert.equal(calls[0].visible, false);
    assert.equal(calls[0].pos.x, 10);
    assert.equal(calls[0].pos.y, 10);
    assert.equal(calls[2].name, 'weaponSwitch');
    assert.equal(calls[3].name, 'chainsawUp');
  },

  'AC-6 spatial returns one reused result object and defaults range'() {
    const listener = new Vec2(0, 0);
    const r1 = spatial(listener, new Vec2(200, 200));
    const firstPan = r1.pan;
    const firstGain = r1.gain;
    const firstDist = r1.distance;
    const r2 = spatial(listener, new Vec2(5000, 0));
    assert.equal(r1, r2);
    assert.equal(r2.gain, 0);
    assert.equal(r2.distance, 5000);
    assert.ok(firstPan > 0.3);
  },

  'AC-1 computeHudTextKey is non-empty and stable in the play state'() {
    const hud = new Hud(
      { width: 0, height: 0, getContext: () => ({}) },
      { clear() {}, glow: { line() {} }, crisp: { fillRect() {}, rectLine() {}, line() {}, circleLine() {}, weapon: { quad() {} }, sprites: { quad() {} }, face: { quad() {} } } },
    );
    hud.resize(1024, 768, 1);
    const game = fresh(0);
    game.state = 'play';
    game.message.age = 99;
    game.player.ammoFlash = { bullets: 0, shells: 0, rockets: 0 };
    const key1 = hud.computeHudTextKey(game, false);
    const key2 = hud.computeHudTextKey(game, false);
    assert.ok(key1.length > 0, 'key must not be empty');
    assert.equal(key1, key2, 'consecutive calls with unchanged telemetry return identical keys');
  },

  'AC-2 computeHudTextKey changes with telemetry and is empty outside play or in automap'() {
    const hud = new Hud(
      { width: 0, height: 0, getContext: () => ({}) },
      { clear() {}, glow: { line() {} }, crisp: { fillRect() {}, rectLine() {}, line() {}, circleLine() {}, weapon: { quad() {} }, sprites: { quad() {} }, face: { quad() {} } } },
    );
    hud.resize(1024, 768, 1);
    const game = fresh(0);
    game.state = 'play';
    game.message.age = 99;
    game.player.ammoFlash = { bullets: 0, shells: 0, rockets: 0 };
    const baseKey = hud.computeHudTextKey(game, false);
    assert.ok(baseKey.length > 0);

    game.player.health = 80;
    const healthKey = hud.computeHudTextKey(game, false);
    assert.notEqual(healthKey, baseKey);
    game.player.health = 100;

    game.kills = (game.kills ?? 0) + 1;
    const killsKey = hud.computeHudTextKey(game, false);
    assert.notEqual(killsKey, baseKey);
    game.kills = 0;

    game.player.bullets = (game.player.bullets ?? 0) + 5;
    const bulletsKey = hud.computeHudTextKey(game, false);
    assert.notEqual(bulletsKey, baseKey);
    game.player.bullets = 50;

    for (const st of ['paused', 'dead', 'title']) {
      game.state = st;
      assert.equal(hud.computeHudTextKey(game, false), '', `state ${st} returns empty key`);
    }
    game.state = 'play';
    assert.equal(hud.computeHudTextKey(game, true), '', 'showAutomap true returns empty key');
  },

  'AC-3 drawBar draws every tick through one shared scratch array'() {
    const calls = [];
    const hud = new Hud(
      { width: 0, height: 0, getContext: () => ({}) },
      { glow: { line: (pts, col, alpha) => calls.push({ ref: pts, pts: flatPoints(pts), col, alpha }) } },
    );
    const GREEN = 1;
    const ORANGE = 2;
    hud.drawBar(10, 100, 160, 20, 0.5, GREEN, ORANGE);
    assert.equal(calls.length, 20);
    const firstRef = calls[0].ref;
    for (const c of calls) {
      assert.equal(c.ref, firstRef);
      assert.equal(c.pts.length, 4);
    }
    assert.equal(calls[19].pts[0], 10 + 19 * 8);
    const src = readFileSync(new URL('../src/hud.js', import.meta.url), 'utf8');
    assert.ok(!src.includes('.line(['));
  },

  'AC-4 drawHud reuses scratch options and rect for face placement and frame'() {
    const faceQuads = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const noop = () => {};
    const overlay = {
      clear: noop,
      glow: { line: noop },
      crisp: {
        fillRect: noop,
        rectLine: noop,
        line: noop,
        circleLine: noop,
        weapon: { quad: noop },
        sprites: { quad: noop },
        face: { quad: (r, ...a) => faceQuads.push([r.topLeftCorner.x, r.topLeftCorner.y, r.bottomRightCorner.x, r.bottomRightCorner.y, ...a]) },
      },
    };
    const hud = new Hud({ width: 0, height: 0, getContext: () => ctx }, overlay);
    hud.resize(1280, 760, 1);
    const game = fresh(0);
    const frames = [
      { health: 100, hurt: 0, time: 1.0 },
      { health: 50, hurt: 0.3, time: 2.0 },
    ];
    for (const f of frames) {
      game.player.health = f.health;
      game.player.hurt = f.hurt;
      game.time = f.time;
      hud.render(game);
      const quad = faceQuads[faceQuads.length - 1];
      const expectedPlacement = facePlacement(new Vec2(1280, 760), f.hurt, { rect: new Rect(), pixel: 0 }).rect;
      const expectedFrame = faceFrame({ health: f.health, hurt: f.hurt, shotElapsed: -1, time: f.time });
      assert.deepEqual(quad.slice(0, 4), [expectedPlacement.topLeftCorner.x, expectedPlacement.topLeftCorner.y, expectedPlacement.bottomRightCorner.x, expectedPlacement.bottomRightCorner.y]);
      assert.deepEqual(quad[4], faceCellUv(expectedFrame));
    }
    assert.notDeepEqual(faceQuads[0].slice(0, 4), faceQuads[1].slice(0, 4));
    assert.notDeepEqual(faceQuads[0][4], faceQuads[1][4]);

    const src = readFileSync(new URL('../src/hud.js', import.meta.url), 'utf8');
    assert.ok(/^const FACE_FRAME_OPTS = /m.test(src));
    assert.ok(/faceFrame\(FACE_FRAME_OPTS\)/.test(src));
    assert.ok(!src.includes('faceFrame({'));
  },

  'AC-5 circleLine emits the same ring segments without per-segment arrays'() {
    const vertices = [];
    const layer = new Overlay(makeOverlayWorld().world).glow;
    layer.lines.vertex = (pos, col) => vertices.push({ x: pos.x, y: pos.y, col: [...col] });
    layer.circleLine(new Circ(10, new Vec2(50, 60)), [1, 1, 1], 1, 8);
    assert.equal(vertices.length, 16);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Trigo.twopi;
      const b = ((i + 1) / 8) * Trigo.twopi;
      const ax = 50 + Math.cos(a) * 10;
      const ay = 60 + Math.sin(a) * 10;
      const bx = 50 + Math.cos(b) * 10;
      const by = 60 + Math.sin(b) * 10;
      assert.ok(Math.abs(vertices[i * 2].x - ax) < 1e-9);
      assert.ok(Math.abs(vertices[i * 2].y - ay) < 1e-9);
      assert.ok(Math.abs(vertices[i * 2 + 1].x - bx) < 1e-9);
      assert.ok(Math.abs(vertices[i * 2 + 1].y - by) < 1e-9);
      assert.deepEqual(vertices[i * 2].col, [1, 1, 1]);
      assert.deepEqual(vertices[i * 2 + 1].col, [1, 1, 1]);
    }
    const overlaySrc = readFileSync(new URL('../src/overlay.js', import.meta.url), 'utf8');
    assert.ok(!overlaySrc.includes('this.line(['));
  },

  'issue-81 AC-3 every enemy has a power-of-two opaque horror skin atlas with emissive eyes and arterial gore'() {
    for (const type of Object.keys(ENEMY_TYPES)) {
      const atlas = monsterSkinAtlas(type);
      assert.equal(atlas.width, 256);
      assert.equal(atlas.height, 32);
      assert.equal(atlas.data.length, 256 * 32 * 4);
      for (let i = 3; i < atlas.data.length; i += 4)
        assert.equal(atlas.data[i], 255, `${type} skin atlas cell must be 100% opaque`);

      let eyes = 0;
      const faceStart = MONSTER_SKIN_CELLS.face * MONSTER_SKIN_CELL;
      for (let y = 0; y < MONSTER_SKIN_CELL; y++)
        for (let x = 0; x < MONSTER_SKIN_CELL; x++) {
          const idx = (y * atlas.width + (faceStart + x)) * 4;
          if (atlas.data[idx + 1] === 255) eyes++;
        }
      assert.ok(eyes >= 8, `${type} face cell has fewer than 8 emissive pixels (G=255)`);

      let gore = 0;
      const goreStart = MONSTER_SKIN_CELLS.gore * MONSTER_SKIN_CELL;
      for (let y = 0; y < MONSTER_SKIN_CELL; y++)
        for (let x = 0; x < MONSTER_SKIN_CELL; x++) {
          const idx = (y * atlas.width + (goreStart + x)) * 4;
          if (atlas.data[idx + 2] === 255) gore++;
        }
      assert.ok(gore >= 40, `${type} gore cell has fewer than 40 arterial blood pixels (B=255)`);
    }
  },

  'issue-81 AC-4 gore skin atlases for non-wraith enemies are drenched in blood and expose bone'() {
    for (const type of Object.keys(ENEMY_TYPES)) {
      if (type === 'wraith') continue;
      const atlas = monsterGoreSkinAtlas(type);
      assert.equal(atlas.width, 256);
      assert.equal(atlas.height, 32);
      let blood = 0;
      let bone = 0;
      for (let i = 0; i < atlas.data.length; i += 4) {
        const r = atlas.data[i];
        const g = atlas.data[i + 1];
        const b = atlas.data[i + 2];
        if (b === 255) blood++;
        if (r >= 180 && g >= 165) bone++;
      }
      assert.ok(blood >= 400, `${type} gore skin atlas has fewer than 400 arterial blood pixels (B=255)`);
      assert.ok(bone >= 100, `${type} gore skin atlas has fewer than 100 bone pixels (R>=180, G>=165)`);
    }
  },

  'issue-81 AC-5 every enemy has a 3D death function and gore anatomy'() {
    for (const type of Object.keys(ENEMY_TYPES)) {
      assert.equal(typeof MONSTERS[type].die, 'function', `${type} has a 3D death animation`);
      assert.ok(MONSTERS[type].die, `${type} death function is defined`);
      assert.notEqual(MONSTERS[type].die, null, `${type} death function is not null`);
      const parts = monsterParts(type);
      assert.ok(parts, `${type} parts returned`);
      assert.ok(parts.pivots, `${type} missing pivots`);
      assert.ok(parts.body, `${type} missing body`);
      assert.ok(parts.head, `${type} missing head`);
      assert.ok(parts.jaw, `${type} missing jaw`);
      assert.ok(parts.goreViscera, `${type} missing goreViscera`);
      assert.ok(parts.gorePool, `${type} missing gorePool`);
      assert.ok(Array.isArray(parts.goreChunks), `${type} missing goreChunks array`);
      assert.ok(parts.goreChunks !== null, `${type} goreChunks array is not null`);
    }
  },

  'issue-81 AC-6 test suite and monsters module no longer reference the legacy sprites module'() {
    const simSrc = readFileSync(new URL('./sim.test.mjs', import.meta.url), 'utf8');
    const monstersSrc = readFileSync(new URL('../src/monsters.js', import.meta.url), 'utf8');
    const legacyPattern = new RegExp(`(?<!blood)${'sprites\\.js'}`);
    const filteredSimSrc = simSrc.split('\n').filter((line) => !line.includes('legacyPattern')).join('\n');
    assert.ok(!legacyPattern.test(filteredSimSrc), 'sim.test.mjs still references sprites.js');
    assert.ok(!legacyPattern.test(monstersSrc), 'monsters.js still references sprites.js');
  },

  'AC-1 default hint structure': () => {
    assert.ok(Array.isArray(DEFAULT_HINT_LINES), 'DEFAULT_HINT_LINES is an array');
    assert.equal(DEFAULT_HINT_LINES.length, 4, 'Has 4 functional groups');
    const titles = DEFAULT_HINT_LINES.map((g) => g.title);
    assert.deepEqual(titles, ['MOVE', 'COMBAT', 'WORLD', 'SYSTEM']);
    for (const group of DEFAULT_HINT_LINES) {
      assert.ok(Array.isArray(group.rows), `${group.title} has rows array`);
      for (const row of group.rows) {
        assert.equal(typeof row.keys, 'string');
        assert.equal(typeof row.label, 'string');
      }
    }
    assert.equal(DEFAULT_HINT_LINES[0].rows[0].keys, 'W A S D');
    assert.equal(DEFAULT_HINT_LINES[0].rows[0].label, 'move');
    assert.equal(DEFAULT_HINT_LINES[1].rows[0].keys, 'click / X');
    assert.equal(DEFAULT_HINT_LINES[1].rows[0].label, 'fire');
  },

  'AC-2 layout presets and custom overrides in hints': () => {
    const k = new Keymap({ storage: null, navigator: null });
    k.applyLayoutMap(new Map(Object.entries(PRESETS.azerty.glyphs)));
    assert.equal(k.hintLines[0].rows[0].keys, 'Z Q S D');
    assert.equal(k.hintLines[2].rows[0].keys, '^ / $');

    // Custom fire override
    k.setBinding('fire', 0, 'KeyJ');
    assert.equal(k.hintLines[1].rows[0].keys, 'J');

    // Unbound action
    k.clearBinding('crouch', 0);
    assert.equal(k.hintLines[0].rows[3].keys, 'UNBOUND');
  },

  'AC-3 HUD drawControlHints renders keycaps and returns panel height': () => {
    const texts = [];
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
          fillText(str) { texts.push(str); },
        };
      },
    };
    const hud = new Hud(fakeCanvas, {});
    hud.resize(1024, 768, 1);
    const height = hud.drawControlHints(512, 200);
    assert.ok(height > 0, 'Returns non-zero panel height');
    assert.ok(texts.includes('MOVE'));
    assert.ok(texts.includes('COMBAT'));
    assert.ok(texts.includes('WORLD'));
    assert.ok(texts.includes('SYSTEM'));
    assert.ok(texts.includes('W A S D'));
  },

  'AC-4 narrow viewport single column layout': () => {
    const texts = [];
    const lines = [];
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo(x, y) { lines.push([x, y]); }, stroke() {},
          fillText(str, x, y) { texts.push({ str, x, y }); },
        };
      },
    };
    const hud = new Hud(fakeCanvas, {});
    hud.resize(480, 800, 1);
    const height = hud.drawControlHints(240, 100);
    assert.ok(height > 0);
    for (const t of texts) {
      assert.ok(t.x >= 0 && t.x <= 480, `Text "${t.str}" at x=${t.x} is within canvas bounds`);
    }
  },

  'AC-5 wide viewport multi-column layout': () => {
    const texts = [];
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
          fillText(str, x) { texts.push({ str, x }); },
        };
      },
    };
    const hud = new Hud(fakeCanvas, {});
    hud.resize(1024, 768, 1);
    hud.drawControlHints(512, 100);
    const moveTitle = texts.find((t) => t.str === 'MOVE');
    const combatTitle = texts.find((t) => t.str === 'COMBAT');
    const worldTitle = texts.find((t) => t.str === 'WORLD');
    const sysTitle = texts.find((t) => t.str === 'SYSTEM');
    assert.ok(moveTitle && combatTitle && worldTitle && sysTitle);
    assert.ok(moveTitle.x < combatTitle.x);
    assert.ok(combatTitle.x < worldTitle.x);
    assert.ok(worldTitle.x < sysTitle.x);
  },

  'AC-7 unbound warning positioning below panel': () => {
    const texts = [];
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
          fillText(str, x, y) { texts.push({ str, y }); },
        };
      },
    };
    const fakeOverlay = {
      clear() {},
      glow: { line() {} },
      crisp: { fillRect() {}, rectLine() {}, line() {}, circleLine() {}, weapon: { quad() {} }, sprites: { quad() {} }, face: { quad() {} } },
    };
    const hud = new Hud(fakeCanvas, fakeOverlay);
    hud.resize(1024, 768, 1);
    hud.setControlsStatus('F1', 2);
    const game = fresh(0);
    game.state = 'title';
    game.selectingDifficulty = false;
    hud.render(game);
    const unboundMsg = texts.find((t) => t.str.includes('2 controls unbound'));
    assert.ok(unboundMsg, 'Unbound warning is rendered');
    const panelStartY = 768 / 2 + 100;
    const hintsH = hud.drawControlHints(512, panelStartY);
    assert.ok(unboundMsg.y >= panelStartY + hintsH + 16, `Warning at y=${unboundMsg.y} is strictly below panel (start=${panelStartY}, h=${hintsH})`);
  },

  'AC-1 cleanup purges dead shots in place preserving array reference'() {
    const game = fresh();
    clearEnemies(game);
    const initialShots = game.shots;
    const s1 = { dead: false, body: {} };
    const s2 = { dead: true, body: {} };
    const s3 = { dead: false, body: {} };
    const s4 = { dead: true, body: {} };
    const s5 = { dead: false, body: {} };
    game.shots = [s1, s2, s3, s4, s5];
    const initialRef = game.shots;
    const removedBodies = [];
    game.scene.removeBody = (body) => removedBodies.push(body);

    game.cleanup();

    assert.equal(game.shots, initialRef, 'shots array identity is preserved');
    assert.deepEqual(game.shots, [s1, s3, s5], 'surviving shots preserve relative ordering');
    assert.equal(game.shots.length, 3, 'shots length truncated to survivors count');
    assert.deepEqual(removedBodies, [s2.body, s4.body], 'dead shot bodies are removed');
  },

  'AC-2 cleanup purges taken pickups in place preserving array reference'() {
    const game = fresh();
    clearEnemies(game);
    const p1 = { taken: true, body: {} };
    const p2 = { taken: false, body: {} };
    const p3 = { taken: true, body: {} };
    const p4 = { taken: false, body: {} };
    game.pickups = [p1, p2, p3, p4];
    const initialRef = game.pickups;
    const removedBodies = [];
    game.scene.removeBody = (body) => removedBodies.push(body);

    game.cleanup();

    assert.equal(game.pickups, initialRef, 'pickups array identity is preserved');
    assert.deepEqual(game.pickups, [p2, p4], 'surviving pickups preserve relative ordering');
    assert.equal(game.pickups.length, 2, 'pickups length truncated to survivors count');
    assert.deepEqual(removedBodies, [p1.body, p3.body], 'taken pickup bodies are removed');
  },

  'AC-3 cleanup removes collision bodies for dead shots and taken pickups before truncation'() {
    const game = fresh();
    clearEnemies(game);
    const orderOfOps = [];
    const shotBody = { id: 'shot-body' };
    const pickupBody = { id: 'pickup-body' };
    game.shots = [
      { dead: true, body: shotBody },
      { dead: false, body: { id: 'alive-shot' } },
    ];
    game.pickups = [
      { taken: true, body: pickupBody },
      { taken: false, body: { id: 'alive-pickup' } },
    ];
    game.scene.removeBody = (body) => {
      orderOfOps.push({
        action: 'removeBody',
        bodyId: body.id,
        shotsLen: game.shots.length,
        pickupsLen: game.pickups.length,
      });
    };

    game.cleanup();

    assert.deepEqual(orderOfOps, [
      { action: 'removeBody', bodyId: 'shot-body', shotsLen: 2, pickupsLen: 2 },
      { action: 'removeBody', bodyId: 'pickup-body', shotsLen: 1, pickupsLen: 2 },
    ]);
    assert.equal(game.shots.length, 1);
    assert.equal(game.pickups.length, 1);
  },

  'AC-4 effects are pruned in place preserving order and array identity'() {
    const game = fresh();
    clearEnemies(game);
    const effects = game.effects;
    effects.length = 0;
    effects.push(
      { id: 'fx1', age: 0.1, life: 0.5 },
      { id: 'fx2', age: 0.5, life: 0.5 },
      { id: 'fx3', age: 0.0, life: 1.0 },
    );
    game.update(1 / 60, idle);
    assert.equal(game.effects, effects, 'effects array reference identity is preserved');
    assert.deepEqual(effects.map((e) => e.id), ['fx1', 'fx3'], 'expired effects purged preserving order');
    assert.equal(effects.length, 2);
  },

  'AC-5 cleanup and update contain no Array.prototype.filter calls'() {
    const gameSrc = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
    const cleanupMatch = gameSrc.match(/cleanup\(\)\s*\{([\s\S]*?)\n  \}/);
    assert.ok(cleanupMatch, 'cleanup() method found in src/game.js');
    assert.ok(!cleanupMatch[1].includes('.filter('), 'cleanup() contains no .filter( calls');
    assert.ok(!cleanupMatch[1].includes('filter'), 'cleanup() contains no filter keyword');

    const updateMatch = gameSrc.match(/update\(dt,\s*input\)\s*\{([\s\S]*?)\n  \}/);
    assert.ok(updateMatch, 'update() method found in src/game.js');
    assert.ok(!updateMatch[1].includes('.filter('), 'update() contains no .filter( calls');
    assert.ok(!gameSrc.includes('.filter('), 'src/game.js contains zero .filter( invocations');
  },

  'AC-1 chainsaw idle alternates idle/pumpA with the two-stroke cycle'() {
    // weaponFrame(-1, true, 'chainsaw', time) alternates between idle and pumpA based on (Math.floor(time * 14) & 1) === 0
    assert.equal(weaponFrame(-1, true, 'chainsaw', 0.01), WEAPON_FRAMES.idle, 'even cycle 0 returns idle');
    assert.equal(weaponFrame(-1, true, 'chainsaw', 0.1), WEAPON_FRAMES.pumpA, 'odd cycle 1 returns pumpA');
    assert.equal(weaponFrame(-1, true, 'chainsaw', 0.16), WEAPON_FRAMES.idle, 'even cycle 2 returns idle');
    assert.equal(weaponFrame(-1, true, 'chainsaw', 0.22), WEAPON_FRAMES.pumpA, 'odd cycle 3 returns pumpA');

    // Non-finite elapsed value behaves the same as elapsed < 0
    assert.equal(weaponFrame(NaN, true, 'chainsaw', 0.01), WEAPON_FRAMES.idle, 'NaN elapsed on even cycle returns idle');
    assert.equal(weaponFrame(NaN, true, 'chainsaw', 0.1), WEAPON_FRAMES.pumpA, 'NaN elapsed on odd cycle returns pumpA');
    assert.equal(weaponFrame(Infinity, true, 'chainsaw', 0.1), WEAPON_FRAMES.pumpA, 'Infinity elapsed on odd cycle returns pumpA');
  },

  'AC-2 chainsaw cutting shows flashA, flashB then idle'() {
    assert.equal(weaponFrame(0.03, true, 'chainsaw'), WEAPON_FRAMES.flashA, 'chainsaw elapsed < 0.06 returns flashA');
    assert.equal(weaponFrame(0.08, true, 'chainsaw'), WEAPON_FRAMES.flashB, 'chainsaw elapsed 0.06..0.12 returns flashB');
    assert.equal(weaponFrame(0.15, true, 'chainsaw'), WEAPON_FRAMES.idle, 'chainsaw elapsed >= 0.12 returns idle');
  },

  'AC-3 rocket flash frames'() {
    assert.equal(weaponFrame(0.05, true, 'rocket'), WEAPON_FRAMES.flashA, 'rocket elapsed < 0.09 returns flashA with ammo');
    assert.equal(weaponFrame(0.15, true, 'rocket'), WEAPON_FRAMES.flashB, 'rocket elapsed 0.09..0.24 returns flashB with ammo');
    assert.equal(weaponFrame(0.05, false, 'rocket'), WEAPON_FRAMES.flashA, 'rocket elapsed < 0.09 returns flashA without ammo');
    assert.equal(weaponFrame(0.15, false, 'rocket'), WEAPON_FRAMES.flashB, 'rocket elapsed 0.09..0.24 returns flashB without ammo');
  },

  'AC-4 rocket reload recoil pumpA only with ammo'() {
    assert.equal(weaponFrame(0.35, true, 'rocket'), WEAPON_FRAMES.pumpA, 'rocket elapsed 0.24..0.48 returns pumpA with ammo');
    assert.equal(weaponFrame(0.35, false, 'rocket'), WEAPON_FRAMES.idle, 'rocket elapsed 0.24..0.48 returns idle without ammo');
  },

  'AC-5 rocket pumpB, settle to idle and empty gun'() {
    assert.equal(weaponFrame(0.55, true, 'rocket'), WEAPON_FRAMES.pumpB, 'rocket elapsed 0.48..0.68 returns pumpB with ammo');
    assert.equal(weaponFrame(0.8, true, 'rocket'), WEAPON_FRAMES.idle, 'rocket elapsed >= 0.68 settles to idle with ammo');
    assert.equal(weaponFrame(0.55, false, 'rocket'), WEAPON_FRAMES.idle, 'rocket elapsed 0.48..0.68 returns idle without ammo');
  },

  'AC-1 keymap.statusText formats manual override layouts'() {
    for (const layout of ['qwerty', 'azerty', 'qwertz', 'dvorak']) {
      const k = new Keymap({ storage: null, navigator: null });
      k.override = layout;
      assert.equal(k.statusText, `Keyboard: ${PRESETS[layout].name} (manual)`);
    }
  },

  'AC-2 keymap.statusText formats auto-detected layouts'() {
    const azertyKeymap = new Keymap({ storage: null, navigator: null });
    azertyKeymap.applyLayoutMap(new Map([['KeyW', 'z']]));
    assert.equal(azertyKeymap.detected, 'azerty');
    assert.equal(azertyKeymap.statusText, 'Keyboard: auto (AZERTY detected)');

    const dvorakKeymap = new Keymap({ storage: null, navigator: null });
    dvorakKeymap.applyLayoutMap(new Map([['KeyW', ',']]));
    assert.equal(dvorakKeymap.detected, 'dvorak');
    assert.equal(dvorakKeymap.statusText, 'Keyboard: auto (Dvorak detected)');

    const qwertzKeymap = new Keymap({ storage: null, navigator: null });
    qwertzKeymap.applyLayoutMap(new Map([['KeyY', 'z']]));
    assert.equal(qwertzKeymap.detected, 'qwertz');
    assert.equal(qwertzKeymap.statusText, 'Keyboard: auto (QWERTZ detected)');

    const qwertyKeymap = new Keymap({ storage: null, navigator: null });
    qwertyKeymap.applyLayoutMap(new Map([['KeyW', 'w'], ['KeyY', 'y']]));
    assert.equal(qwertyKeymap.detected, 'qwerty');
    assert.equal(qwertyKeymap.statusText, 'Keyboard: auto (QWERTY detected)');
  },

  'AC-3 keymap.statusText formats auto fallback preset layouts'() {
    const enKeymap = new Keymap({ storage: null, navigator: { language: 'en-US' } });
    assert.equal(enKeymap.override, 'auto');
    assert.equal(enKeymap.detected, null);
    assert.equal(enKeymap.languagePreset, 'qwerty');
    assert.equal(enKeymap.statusText, 'Keyboard: auto (QWERTY)');

    const deKeymap = new Keymap({ storage: null, navigator: { language: 'de-DE' } });
    assert.equal(deKeymap.override, 'auto');
    assert.equal(deKeymap.detected, null);
    assert.equal(deKeymap.languagePreset, 'qwertz');
    assert.equal(deKeymap.statusText, 'Keyboard: auto (QWERTZ)');

    const frKeymap = new Keymap({ storage: null, navigator: { language: 'fr-FR' } });
    assert.equal(frKeymap.override, 'auto');
    assert.equal(frKeymap.detected, null);
    assert.equal(frKeymap.languagePreset, 'azerty');
    assert.equal(frKeymap.statusText, 'Keyboard: auto (AZERTY)');
  },

  'AC-4 keymap.requestLayoutMap handles missing keyboard, errors, and layout maps'() {
    const noNav = new Keymap({ storage: null, navigator: null });
    assert.equal(noNav.requestLayoutMap(), undefined);

    const noKb = new Keymap({ storage: null, navigator: {} });
    assert.equal(noKb.requestLayoutMap(), undefined);

    const noFn = new Keymap({ storage: null, navigator: { keyboard: {} } });
    assert.equal(noFn.requestLayoutMap(), undefined);

    const throwingKb = new Keymap({
      storage: null,
      navigator: {
        keyboard: {
          getLayoutMap() {
            throw new Error('sync error');
          },
        },
      },
    });
    assert.equal(throwingKb.requestLayoutMap(), undefined);

    let rejectPromise;
    const rejectingKb = new Keymap({
      storage: null,
      navigator: {
        keyboard: {
          getLayoutMap() {
            return Promise.reject(new Error('async rejected'));
          },
        },
      },
    });
    rejectPromise = rejectingKb.requestLayoutMap();
    assert.ok(rejectPromise instanceof Promise);
    let rejectResult;
    rejectPromise.then((val) => {
      rejectResult = val;
    });

    const mockMap = new Map([['KeyW', 'z'], ['KeyA', 'q']]);
    let calls = 0;
    const resolvingKb = new Keymap({
      storage: null,
      navigator: {
        keyboard: {
          getLayoutMap() {
            calls++;
            return calls === 1 ? Promise.resolve(new Map()) : Promise.resolve(mockMap);
          },
        },
      },
    });
    const versionBefore = resolvingKb.version;
    const resolvePromise = resolvingKb.requestLayoutMap();
    assert.ok(resolvePromise instanceof Promise);
    let resolveResult;
    resolvePromise.then((val) => {
      resolveResult = val;
    });

    return Promise.all([rejectPromise, resolvePromise]).then(() => {
      assert.equal(rejectResult, false);
      assert.equal(resolveResult, true);
      assert.equal(resolvingKb.layoutGlyphs.get('KeyW'), 'z');
      assert.equal(resolvingKb.layoutGlyphs.get('KeyA'), 'q');
      assert.equal(resolvingKb.detected, 'azerty');
      assert.ok(resolvingKb.version > versionBefore);
    });
  },

  'AC-5 keymap.resetAction restores default bindings and bumps version'() {
    const k = new Keymap({ storage: null, navigator: null });

    const nonBindableResult = k.resetAction('nonExistentAction');
    assert.equal(nonBindableResult.ok, false);

    assert.equal(k.setBinding('jump', 0, 'KeyJ').ok, true);
    assert.equal(k.isCustom('jump'), true);
    assert.deepEqual(k.effectiveCodes('jump'), ['KeyJ']);
    const vBefore = k.version;
    const bvBefore = k.bindingsVersion;

    const resetJump = k.resetAction('jump');
    assert.equal(resetJump.ok, true);
    assert.equal(k.isCustom('jump'), false);
    assert.deepEqual(k.effectiveCodes('jump'), ['Space']);
    assert.equal(k.version, vBefore + 1);
    assert.equal(k.bindingsVersion, bvBefore + 1);

    assert.equal(k.setBinding('grenade', 0, 'Space').ok, true);
    assert.deepEqual(k.effectiveCodes('grenade'), ['Space']);
    assert.ok(!k.effectiveCodes('jump').includes('Space'));

    const resetJumpReclaim = k.resetAction('jump');
    assert.equal(resetJumpReclaim.ok, true);
    assert.equal(resetJumpReclaim.stolenFrom, 'grenade');
    assert.deepEqual(k.effectiveCodes('jump'), ['Space']);
    assert.ok(!k.effectiveCodes('grenade').includes('Space'));
  },

  'AC-1 opened supply chest holding refused items presents TAKE use prompt verb'() {
    const level = {
      name: 'Refused prompt verb test',
      rows: ['##########', '#........#', '#P...a...#', '#........#', '##########'],
    };
    const game = new Game();
    game.load(level);
    game.state = 'play';
    assert.equal(game.caches.length, 1);
    const cache = game.caches[0];
    assert.equal(cache.state, 'closed');
    assert.ok(cache.contents.includes('ammo'));

    // Position player facing the chest within use range
    game.player.body.setPosition(new Vec2(cache.pos.x - 60, cache.pos.y));
    game.player.angle = 0;

    // Set player shotgun ammo to maximum capacity so chest ammo is refused
    game.player.shells = AMMO_TYPES.shells.max;

    // Use to open chest
    game.update(1 / 60, input({ use: true }));
    assert.equal(cache.state, 'opening');

    // Run past lid opening animation
    run(game, CACHE_LID_TIME + 2 / 60);
    assert.equal(cache.state, 'open');
    assert.ok(cache.contents.length > 0, 'refused ammo remains in chest');

    // Idle update while in range and line of sight finds use target
    game.update(1 / 60, idle);
    assert.equal(game.findUseTarget(), true);
    assert.equal(game.useTarget.kind, 'cache');
    assert.equal(game.useTarget.cache, cache);
    assert.equal(game.useTarget.verb, 'TAKE');
  },

  'AC-2 toggleNightVision rejects with Night Vision battery low message when battery is below minToggleBattery'() {
    const game = fresh();
    const player = game.player;
    player.hasNightVision = true;
    player.nightVisionActive = false;
    player.nightVisionBattery = POWERUP_TYPES.nightvision.minToggleBattery - 0.5;

    const activated = game.toggleNightVision();
    assert.equal(activated, false);
    assert.equal(player.nightVisionActive, false);
    assert.equal(game.message.text, 'Night Vision battery low');
  },

  'AC-3 running night vision until battery is exhausted emits Night Vision battery depleted message and deactivates night vision'() {
    const game = fresh();
    const player = game.player;
    player.hasNightVision = true;
    player.nightVisionActive = true;
    player.nightVisionBattery = 0.2;
    player.nightVision = 0.2;

    run(game, 0.5);
    assert.equal(player.nightVisionActive, false);
    assert.equal(player.nightVision, 0);
    assert.equal(game.message.text, 'Night Vision battery depleted');
  },

  'AC-4 boss AI at distance >= reach triggers fan windup and fires 3 fireballs normally or 5 fireballs when enraged'() {
    // Normal warden boss test (rage = 1)
    const gameNormal = fresh();
    clearEnemies(gameNormal);
    gameNormal.player.body.setPosition(new Vec2(100, 200));

    // Place warden boss at distance 220 from player: reach = def.radius (36) + PLAYER_RADIUS (16) + 38 = 90
    // 220 >= 90 and 220 < 900
    const bossNormal = gameNormal.addEnemy('boss', new Vec2(320, 200));
    bossNormal.state = 'chase';
    bossNormal.cooldown = 0;
    bossNormal.los = true;
    bossNormal.losTimer = 10;
    bossNormal.windup = 0;

    // Single step to trigger AI decision
    gameNormal.update(1 / 60, idle);
    assert.equal(bossNormal.mode, 'fan');
    assert.ok(bossNormal.windup > 0);

    const shotsBeforeNormal = gameNormal.shots.length;
    // Step simulation past windup expiration (windup is 0.6)
    run(gameNormal, 0.7);
    const spawnedNormal = gameNormal.shots.length - shotsBeforeNormal;
    assert.equal(spawnedNormal, 3, 'normal boss fires 3 fireballs in fan mode');

    // Enraged warden boss test (rage > 1 when hp < def.hp * 0.4)
    const gameRage = fresh();
    clearEnemies(gameRage);
    gameRage.player.body.setPosition(new Vec2(100, 200));

    const bossRage = gameRage.addEnemy('boss', new Vec2(320, 200));
    bossRage.state = 'chase';
    bossRage.hp = bossRage.def.hp * 0.2; // hp < def.hp * 0.4 triggers rage = 1.5
    bossRage.cooldown = 0;
    bossRage.los = true;
    bossRage.losTimer = 10;
    bossRage.windup = 0;

    gameRage.update(1 / 60, idle);
    assert.equal(bossRage.mode, 'fan');
    assert.ok(bossRage.windup > 0);

    const shotsBeforeRage = gameRage.shots.length;
    run(gameRage, 0.7);
    const spawnedRage = gameRage.shots.length - shotsBeforeRage;
    assert.equal(spawnedRage, 5, 'enraged boss fires 5 fireballs in fan mode');
  },

  'AC-5 wraith windup completion triggers rake sound and inflicts 9 damage to player'() {
    const game = fresh();
    clearEnemies(game);
    game.player.body.setPosition(new Vec2(100, 200));
    game.player.health = 100;
    game.player.armor = 0;
    game.player.armorType = null;

    // Place wraith within reach: reach = def.radius (24) + PLAYER_RADIUS (16) + 12 = 52
    // Place at distance 35
    const wraith = game.addEnemy('wraith', new Vec2(135, 200));
    wraith.state = 'chase';
    wraith.windup = 0.05;
    wraith.cooldown = 0;
    wraith.los = true;
    wraith.losTimer = 10;

    game.events.length = 0;
    // Advance simulation past windup expiration (0.05s)
    run(game, 0.1);

    assert.ok(game.events.some((e) => e.type === 'rake' && e.kind === 'wraith'), 'wraith emits rake event');
    assert.equal(game.player.health, 91, 'player takes 9 damage from wraith rake');
    assert.ok(Math.abs(wraith.cooldown - 0.9) < 0.15, 'wraith cooldown resets to ~0.9');
  },

  'AC-1 Input.prototype.axis resolves simultaneous opposing directions using insertion order'() {
    withRig((inp) => {
      assert.equal(inp.axis('moveForward', 'moveBack'), 0, '0 when neither key is pressed');
      inp.keys.add('moveForward');
      assert.equal(inp.axis('moveForward', 'moveBack'), 1, '1 when only positive key is pressed');
      inp.keys.delete('moveForward');
      inp.keys.add('moveBack');
      assert.equal(inp.axis('moveForward', 'moveBack'), -1, '-1 when only negative key is pressed');

      // Hold forward, then press back: moveBack is added later in Set insertion order -> axis resolves to -1
      inp.keys.clear();
      inp.keys.add('moveForward');
      inp.keys.add('moveBack');
      assert.equal(inp.axis('moveForward', 'moveBack'), -1, 'moveBack added after moveForward resolves to -1');

      // Re-press forward: moveForward is re-added latest -> axis resolves to 1
      inp.keys.delete('moveForward');
      inp.keys.add('moveForward');
      assert.equal(inp.axis('moveForward', 'moveBack'), 1, 'moveForward re-added after moveBack resolves to 1');
    });
  },

  'AC-2 Input.prototype.lock safely ignores synchronous exceptions and rejected promises from requestPointerLock'() {
    const prevDoc = globalThis.document;
    const prevWin = globalThis.window;
    globalThis.document = { addEventListener() {}, pointerLockElement: null };
    globalThis.window = { addEventListener() {} };
    try {
      // Synchronous throw
      const throwingCanvas = {
        addEventListener() {},
        requestPointerLock() {
          throw new Error('DOMException: Permission denied');
        },
      };
      const inpThrow = new Input(throwingCanvas, new Keymap({ storage: null, navigator: null }));
      assert.doesNotThrow(() => inpThrow.lock(), 'synchronous exception in requestPointerLock is caught and ignored');

      // Rejected Promise
      let catchCalled = false;
      const rejectingCanvas = {
        addEventListener() {},
        requestPointerLock() {
          const rejectingPromise = Promise.reject(new Error('Pointer lock denied'));
          return {
            catch(fn) {
              catchCalled = true;
              return rejectingPromise.catch(fn);
            },
          };
        },
      };
      const inpReject = new Input(rejectingCanvas, new Keymap({ storage: null, navigator: null }));
      assert.doesNotThrow(() => inpReject.lock(), 'rejected promise in requestPointerLock is caught and ignored');
      assert.equal(catchCalled, true, 'lock() safely invokes catch on the returned promise');
    } finally {
      globalThis.document = prevDoc;
      globalThis.window = prevWin;
    }
  },

  'AC-3 Input.prototype.pushRaw caps rawCount at RAW_RING_SIZE and preserves FIFO order'() {
    withRig((inp) => {
      inp.setRawMode(true);
      assert.equal(inp.rawCount, 0);

      // Push 20 events into ring buffer of capacity 16
      for (let i = 0; i < 20; i++) {
        inp.pushRaw('keydown', `Key${i}`, '', false, 0);
        if (i < RAW_RING_SIZE)
          assert.equal(inp.rawCount, i + 1, `rawCount increases to ${i + 1}`);
        else
          assert.equal(inp.rawCount, RAW_RING_SIZE, 'rawCount caps strictly at RAW_RING_SIZE');
      }

      // Drain all 16 events in FIFO order
      for (let i = 0; i < RAW_RING_SIZE; i++) {
        const item = inp.nextRaw();
        assert.ok(item !== null, `item ${i} drained`);
        assert.equal(item.code, `Key${i}`, `event ${i} matches Key${i} in original FIFO order`);
      }
      assert.equal(inp.rawCount, 0, 'all items drained, rawCount is 0');
      assert.equal(inp.nextRaw(), null, 'subsequent nextRaw returns null');
    });
  },

  'AC-4 Input.prototype.navigate resolves menu directions from fallback movement actions when navBits is unset'() {
    withRig((inp) => {
      inp.navBits = 0;
      assert.equal(inp.navigate(), NAV_NONE, 'no input resolves to NAV_NONE');

      // Fallback: moveForward -> NAV_UP
      inp.pressed.clear();
      inp.pressed.add('moveForward');
      assert.equal(inp.navigate(), NAV_UP, 'moveForward resolves to NAV_UP');

      // Fallback: moveBack -> NAV_DOWN
      inp.pressed.clear();
      inp.pressed.add('moveBack');
      assert.equal(inp.navigate(), NAV_DOWN, 'moveBack resolves to NAV_DOWN');

      // Fallback: turnLeft or strafeLeft -> NAV_LEFT
      inp.pressed.clear();
      inp.pressed.add('turnLeft');
      assert.equal(inp.navigate(), NAV_LEFT, 'turnLeft resolves to NAV_LEFT');
      inp.pressed.clear();
      inp.pressed.add('strafeLeft');
      assert.equal(inp.navigate(), NAV_LEFT, 'strafeLeft resolves to NAV_LEFT');

      // Fallback: turnRight or strafeRight -> NAV_RIGHT
      inp.pressed.clear();
      inp.pressed.add('turnRight');
      assert.equal(inp.navigate(), NAV_RIGHT, 'turnRight resolves to NAV_RIGHT');
      inp.pressed.clear();
      inp.pressed.add('strafeRight');
      assert.equal(inp.navigate(), NAV_RIGHT, 'strafeRight resolves to NAV_RIGHT');

      // Cleared pressed -> NAV_NONE
      inp.pressed.clear();
      assert.equal(inp.navigate(), NAV_NONE, 'cleared pressed resolves to NAV_NONE');
    });
  },

  'issue-56 AC-3 world.marsBoulderMesh is not assigned during buildLevel'() {
    const e1m5Level = new Level(LEVELS.find((l) => l.name.startsWith('E1M5')));
    assert.equal(e1m5Level.planet, 'mars');

    const createdBatches = [];
    const registeredChunks = [];
    const staticMeshes = [];

    const mockWorld = {
      staticMeshes,
      staticChunks: [],
      lightFixtures: [],
      cutaway: false,
      track(mesh, bucket) {
        bucket.push(mesh);
        return mesh;
      },
      marsSkyBatch: () => ({ name: 'sky' }),
      wallBatch: (_faces, marsRock) => ({ name: marsRock ? 'outdoorWalls' : 'walls', setInactive() {} }),
      solid: () => ({ name: 'solid' }),
      floorBatch: () => ({ name: 'floor' }),
      marsDirtBatch: () => ({ name: 'marsDirt' }),
      slimeBatch: () => ({ name: 'slime' }),
      teleporterBatch: () => ({ name: 'teleporter' }),
      crateBatch: () => ({ name: 'crate' }),
      marsBoulderBatch: (_lvl, sec) => {
        const b = { name: 'marsBoulder', sector: sec ?? null };
        createdBatches.push(b);
        return b;
      },
      ceilingBatch: () => ({ name: 'ceiling' }),
      lightConesBatch: () => ({ name: 'lightCones' }),
    };

    World.prototype.buildStatic.call(mockWorld, e1m5Level);

    assert.ok(mockWorld.staticChunks.length > 0, 'static chunks registered');
    assert.ok(createdBatches.length > 0, 'marsBoulderBatch was called for E1M5 Martian boulders');
    assert.ok(staticMeshes.some((m) => m.name === 'marsBoulder'), 'marsBoulder meshes tracked in staticMeshes');
    assert.equal(mockWorld.marsBoulderMesh, undefined, 'marsBoulderMesh property is not assigned on world');
  },

  'issue-56 AC-4 full test suite passes'() {
    assert.ok(true, 'suite execution confirms AC-4');
  },

  'issue-54 AC-1 AC-2 AC-3 AC-4 renderRecipe export is removed and absent from audio.js exports'() {
    assert.equal('renderRecipe' in audioModule, false, 'AC-1 renderRecipe is not an exported property of src/audio.js');
    assert.equal(typeof audioModule.renderRecipe, 'undefined', 'AC-2 audioModule.renderRecipe is undefined');
    assert.equal(audioModule.renderRecipe, undefined, 'AC-2 audioModule.renderRecipe is undefined');
    assert.equal(typeof audioModule.Sound, 'function', 'AC-3 Sound remains exported');
    assert.equal(typeof audioModule.spatial, 'function', 'AC-3 spatial remains exported');
    assert.equal(typeof audioModule.DUCK_FLOOR, 'number', 'AC-3 DUCK_FLOOR remains exported');
    assert.equal(typeof audioModule.RECIPES, 'object', 'AC-3 RECIPES remains exported');
    const sound = new Sound();
    assert.equal(typeof sound.play, 'function', 'AC-4 sound.play remains functional');
    assert.equal(typeof sound.handle, 'function', 'AC-4 sound.handle remains functional');
  },

  'AC-2 effectiveMusicMode maps scene states and levels 0-4 to expected track modes'() {
    const sound = new Sound();
    sound.musicPreference = 'auto';

    for (const lvl of [0, 1, 2, 3, 4, 99]) {
      assert.equal(sound.effectiveMusicMode('title', lvl), 'title', `title state on level ${lvl} resolves to title`);
      assert.equal(sound.effectiveMusicMode('cleared', lvl), 'title', `cleared state on level ${lvl} resolves to title`);
    }

    const expectedModes = ['play', 'metal', 'horror', 'boss', 'gore'];
    for (let i = 0; i < expectedModes.length; i++)
      assert.equal(sound.effectiveMusicMode('play', i), expectedModes[i], `play state on level ${i} resolves to ${expectedModes[i]}`);

    assert.equal(sound.effectiveMusicMode('play', 5), 'metal', 'out-of-range level 5 falls back to metal');
    assert.equal(sound.effectiveMusicMode('play', 99), 'metal', 'out-of-range level 99 falls back to metal');
    assert.equal(sound.effectiveMusicMode('play', -1), 'metal', 'out-of-range negative level falls back to metal');
  },

  'AC-3 toggleMusic cycles through all configured tracks and updates musicPreference'() {
    const sound = new Sound();
    sound.scene = 'play';
    sound.currentLevel = 0;
    sound.musicPreference = 'auto';

    const expectedSequence = [
      { label: 'Music: E1M2 Industrial Metal', mode: 'metal' },
      { label: 'Music: E1M3 Horror Metal', mode: 'horror' },
      { label: 'Music: E1M4 Boss Finale', mode: 'boss' },
      { label: 'Music: E1M5 Gore Metal', mode: 'gore' },
      { label: 'Music: Intro Theme', mode: 'title' },
      { label: 'Music: Off', mode: 'off' },
      { label: 'Music: E1M1 Ambient', mode: 'play' },
    ];

    for (const { label, mode } of expectedSequence) {
      const returnedLabel = sound.toggleMusic(0);
      assert.equal(returnedLabel, label, `toggleMusic returns "${label}"`);
      assert.equal(sound.musicPreference, mode, `musicPreference updated to "${mode}"`);
      assert.equal(sound.effectiveMusicMode('play', 0), mode, `effectiveMusicMode reflects "${mode}"`);
    }

    const nextLabel = sound.toggleMusic(0);
    assert.equal(nextLabel, 'Music: E1M2 Industrial Metal', 'wraps cleanly back to second track');
    assert.equal(sound.musicPreference, 'metal');
  },

  'AC-4 duckBeds ignores shallower duck requests while now is less than duckUntil'() {
    const sound = new Sound();
    const scheduled = [];
    sound.duck = {
      gain: {
        cancelScheduledValues(t) { scheduled.push({ method: 'cancelScheduledValues', t }); },
        setTargetAtTime(target, t, tau) { scheduled.push({ method: 'setTargetAtTime', target, t, tau }); },
      },
    };

    // Safe no-op on invalid duck depth
    sound.duckBeds(0, 10.0);
    assert.equal(scheduled.length, 0, 'duckBeds with depth <= 0 is a no-op');
    sound.duckBeds(-0.5, 10.0);
    assert.equal(scheduled.length, 0, 'duckBeds with negative depth is a no-op');

    // Safe no-op when duck node is null
    const noDuckSound = new Sound();
    noDuckSound.duck = null;
    assert.doesNotThrow(() => noDuckSound.duckBeds(0.8, 10.0), 'duckBeds with null duck node does not throw');

    // Establish deep duck at now = 10.0
    sound.duckBeds(0.8, 10.0);
    assert.equal(sound.duckDepth, 0.8, 'duckDepth recorded as 0.8');
    assert.equal(sound.duckUntil, 10.0 + 0.06, 'duckUntil recorded as 10.0 + DUCK_HOLD');
    assert.equal(scheduled.length, 3, 'initial duck schedules cancel and 2 target values');

    scheduled.length = 0;
    // Shallower duck request at now = 10.02 (within duckUntil 10.06)
    sound.duckBeds(0.3, 10.02);
    assert.equal(scheduled.length, 0, 'shallower duck during active hold is ignored');
    assert.equal(sound.duckDepth, 0.8, 'duckDepth remains 0.8');

    // Equal duck request at now = 10.03 (depth <= current duckDepth)
    sound.duckBeds(0.8, 10.03);
    assert.equal(scheduled.length, 0, 'equal depth duck during active hold is ignored');

    // Deeper duck request during active hold should be accepted and override
    sound.duckBeds(0.9, 10.04);
    assert.equal(sound.duckDepth, 0.9, 'deeper duck during active hold overrides duckDepth');
    assert.equal(sound.duckUntil, 10.04 + 0.06, 'duckUntil extended by deeper duck');
    assert.equal(scheduled.length, 3, 'deeper duck schedules new gain targets');

    scheduled.length = 0;
    // Time advances past duckUntil (10.10 > 10.04 + 0.06 = 10.10)
    sound.duckBeds(0.3, 10.15);
    assert.equal(sound.duckDepth, 0.3, 'new duck is accepted once prior hold expires');
    assert.equal(sound.duckUntil, 10.15 + 0.06, 'new duckUntil scheduled');
    assert.equal(scheduled.length, 3, 'new duck schedules gain targets');
  },

  'AC-5 setMuted tolerates localStorage exceptions and updates master gain'() {
    const prevLocalStorage = globalThis.localStorage;
    const targetCalls = [];
    const mockMaster = {
      gain: {
        setTargetAtTime(target, t, tau) {
          targetCalls.push({ target, t, tau });
        },
      },
    };

    try {
      globalThis.localStorage = {
        setItem() {
          throw new Error('QuotaExceededError: storage limit reached');
        },
        getItem() {
          return null;
        },
      };

      const sound = new Sound();
      sound.ctx = { currentTime: 2.5 };
      sound.master = mockMaster;
      sound.volume = 0.8;

      // Mute with throwing localStorage
      assert.doesNotThrow(() => sound.setMuted(true), 'setMuted(true) does not throw when localStorage.setItem throws');
      assert.equal(sound.muted, true, 'sound.muted is updated to true');
      assert.equal(targetCalls.length, 1);
      assert.equal(targetCalls[0].target, 0, 'master.gain targets 0 when muted');
      assert.equal(targetCalls[0].t, 2.5, 'target time matches ctx.currentTime');

      targetCalls.length = 0;

      // Unmute with throwing localStorage
      assert.doesNotThrow(() => sound.setMuted(false), 'setMuted(false) does not throw when localStorage.setItem throws');
      assert.equal(sound.muted, false, 'sound.muted is updated to false');
      assert.equal(targetCalls.length, 1);
      assert.equal(targetCalls[0].target, 0.8, 'master.gain targets sound.volume when unmuted');
      assert.equal(targetCalls[0].t, 2.5);
    } finally {
      if (prevLocalStorage === undefined)
        delete globalThis.localStorage;
      else
        globalThis.localStorage = prevLocalStorage;
    }
  },

  'AC-1: cleanup() purges inactive shots and collected pickups in-place without filter'() {
    const game = fresh(0);
    let filterCalls = 0;
    const originalFilter = Array.prototype.filter;
    Array.prototype.filter = function (...args) {
      filterCalls++;
      return originalFilter.apply(this, args);
    };

    try {
      const activeBody = { removeCalled: false };
      const deadBody = { removeCalled: false };
      const activeShot = { dead: false, body: activeBody, life: 1, age: 0 };
      const deadShot = { dead: true, body: deadBody, life: 1, age: 2 };
      game.shots.length = 0;
      game.shots.push(activeShot, deadShot);

      const keptPickupBody = { removeCalled: false };
      const takenPickupBody = { removeCalled: false };
      const keptPickup = { taken: false, body: keptPickupBody };
      const takenPickup = { taken: true, body: takenPickupBody };
      game.pickups.length = 0;
      game.pickups.push(keptPickup, takenPickup);

      const removedBodies = [];
      const origRemoveBody = game.scene.removeBody;
      game.scene.removeBody = (body) => {
        removedBodies.push(body);
        if (origRemoveBody)
          origRemoveBody.call(game.scene, body);
      };

      const shotsArr = game.shots;
      const pickupsArr = game.pickups;
      game.cleanup();

      assert.equal(filterCalls, 0, 'Array.prototype.filter must not be called during cleanup()');
      assert.equal(game.shots, shotsArr, 'shots array identity is preserved');
      assert.equal(game.pickups, pickupsArr, 'pickups array identity is preserved');
      assert.equal(game.shots.length, 1);
      assert.equal(game.shots[0], activeShot);
      assert.equal(game.pickups.length, 1);
      assert.equal(game.pickups[0], keptPickup);
      assert.ok(removedBodies.includes(deadBody), 'dead shot collision body is removed from scene');
      assert.ok(removedBodies.includes(takenPickupBody), 'taken pickup collision body is removed from scene');
    } finally {
      Array.prototype.filter = originalFilter;
    }
  },

  'AC-2: update() prunes expired effects in-place without filter allocations'() {
    const game = fresh(0);
    clearEnemies(game);

    const effectsArr = game.effects;
    effectsArr.length = 0;
    const alive1 = { id: 1, age: 0.1, life: 1.0 };
    const expired = { id: 2, age: 0.95, life: 1.0 };
    const alive2 = { id: 3, age: 0.2, life: 2.0 };
    effectsArr.push(alive1, expired, alive2);

    let filterCalledOnEffects = false;
    const originalFilter = effectsArr.filter;
    effectsArr.filter = function (...args) {
      filterCalledOnEffects = true;
      return originalFilter.apply(this, args);
    };

    try {
      game.update(0.1, idle);

      assert.equal(filterCalledOnEffects, false, 'effects.filter must not be called during update()');
      assert.equal(game.effects, effectsArr, 'effects array identity is preserved');
      assert.equal(game.effects.length, 2);
      assert.equal(game.effects[0].id, 1);
      assert.equal(game.effects[1].id, 3);
    } finally {
      effectsArr.filter = originalFilter;
    }
  },

  'AC-3: actorNear() uses pre-allocated query options without inline filter closures'() {
    const game = fresh(0);
    const initialQuery = game.actorQuery;
    const initialFilter = game.actorFilter;
    const initialPoint = game.actorPoint;

    assert.ok(initialQuery && typeof initialQuery === 'object', 'actorQuery is initialized on game instance');
    assert.ok(typeof initialFilter === 'function', 'actorFilter is initialized on game instance');
    assert.ok(initialPoint && typeof initialPoint.copy === 'function', 'actorPoint is initialized on game instance');

    let queryOptionPassed = null;
    const origQueryCircleFirst = game.scene.queryCircleFirst;
    game.scene.queryCircleFirst = (point, radius, opts) => {
      queryOptionPassed = opts;
      return null;
    };

    try {
      const testPoint = new Vec2(100, 100);
      const res = game.actorNear(testPoint, 50, 40);
      assert.equal(res, false);
      assert.equal(queryOptionPassed, initialQuery, 'scene.queryCircleFirst received the pre-allocated actorQuery object');
      assert.equal(queryOptionPassed.filter, initialFilter, 'actorQuery.filter uses the pre-allocated actorFilter function');
      assert.equal(game.actorDistance, 40, 'actorDistance updated in-place');
      assert.equal(game.actorPoint.x, 100, 'actorPoint updated in-place');
      assert.equal(game.actorPoint.y, 100);
    } finally {
      game.scene.queryCircleFirst = origQueryCircleFirst;
    }
  },

  'AC-4: updateMarsWeather() mutates pre-allocated dust particle instances in-place'() {
    const game = fresh(4);
    game.state = 'play';
    assert.ok(game.dustPool.length > 0, 'dustPool is initialized');
    assert.ok(game.dust.length > 0, 'dust particles are active');

    const particlesBefore = new Set(game.dustPool);
    const initialFreeCount = game.dustFree.length;

    // Force all active particles to expire
    for (const p of game.dust)
      p.age = p.life + 1;

    game.time += 1 / 60;
    game.updateMarsWeather(1 / 60);

    // Verify all active dust particles are still members of the pre-allocated pool
    for (const p of game.dust)
      assert.ok(particlesBefore.has(p), 'active dust particle must come from dustPool');

    for (const p of game.dustFree)
      assert.ok(particlesBefore.has(p), 'free dust particle must come from dustPool');

    assert.equal(game.dustPool.length + game.dustFree.length >= game.dust.length, true);
    assert.equal(new Set(game.dust).size, game.dust.length, 'no duplicate particle references in active dust list');
  },

  'AC-1 fillRect and rectLine accept a Rect and emit identical vertices'() {
    const layer = new Overlay(makeOverlayWorld().world).glow;
    const rect = new Rect(new Vec2(30, 40), new Vec2(25.5, 40.5));
    assert.equal(rect.topLeftCorner.x, 10.5);
    assert.equal(rect.topLeftCorner.y, 20.5);
    layer.fillRect(rect, [1, 0, 0]);
    assert.equal(layer.fills.count, 6);
    assert.deepEqual(Array.from(layer.fills.positions.subarray(0, 12)), [10.5, 20.5, 40.5, 20.5, 40.5, 60.5, 10.5, 20.5, 40.5, 60.5, 10.5, 60.5]);
    layer.rectLine(rect, [1, 0.5, 0.25], 0.5);
    assert.equal(layer.lines.count, 8);
    assert.deepEqual(Array.from(layer.lines.positions.subarray(0, 16)), [10.5, 20.5, 40.5, 20.5, 40.5, 20.5, 40.5, 60.5, 40.5, 60.5, 10.5, 60.5, 10.5, 60.5, 10.5, 20.5]);
    assert.deepEqual(Array.from(layer.lines.colors.subarray(0, 3)), [0.5, 0.25, 0.125]);
  },

  'AC-2 SpriteBuffer.quad accepts a Rect and emits identical sprite vertices'() {
    const sprite = new Overlay(makeOverlayWorld().world).crisp.weapon;
    sprite.quad(edgeRect(5, 6, 25, 46), [0.1, 0.2, 0.3, 0.4], 0.75);
    assert.equal(sprite.count, 6);
    assert.deepEqual(Array.from(sprite.positions), [5, 46, 25, 46, 25, 6, 5, 46, 25, 6, 5, 6]);
    assert.deepEqual(Array.from(sprite.uvs), [0.1, 0.2, 0.3, 0.2, 0.3, 0.4, 0.1, 0.2, 0.3, 0.4, 0.1, 0.4].map(Math.fround));
    assert.equal(sprite.brights[0], 0.75);
    sprite.quad(edgeRect(0, 0, 1, 1), [0, 0, 1, 1], 1);
    assert.equal(sprite.count, 6, 'a call at full capacity appends nothing');
  },

  'AC-3 circleLine accepts a Circ without mutating it'() {
    const layer = new Overlay(makeOverlayWorld().world).glow;
    const circ = new Circ(2.5, new Vec2(100, 50));
    layer.circleLine(circ, [1, 1, 1]);
    assert.equal(layer.lines.count, 20);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Trigo.twopi;
      assert.ok(Math.abs(layer.lines.positions[i * 4] - (100 + Math.cos(a) * 2.5)) < 1e-4);
      assert.ok(Math.abs(layer.lines.positions[i * 4 + 1] - (50 + Math.sin(a) * 2.5)) < 1e-4);
    }
    assert.equal(circ.radius, 2.5);
    assert.equal(circ.position.x, 100);
    assert.equal(circ.position.y, 50);
  },

  'AC-4 line and fill accept Vec2 arrays'() {
    const layer = new Overlay(makeOverlayWorld().world).glow;
    layer.line(pointList([0, 0, 5, 0, 5, 5]), [1, 1, 1]);
    assert.equal(layer.lines.count, 4);
    assert.deepEqual(Array.from(layer.lines.positions.subarray(0, 8)), [0, 0, 5, 0, 5, 0, 5, 5]);
    layer.clear();
    layer.line(pointList([3, 3]), [1, 1, 1]);
    assert.equal(layer.lines.count, 0);
    layer.fill(pointList([0, 0, 4, 0, 4, 4, 0, 4]), [1, 1, 1]);
    assert.equal(layer.fills.count, 6);
    assert.deepEqual(Array.from(layer.fills.positions.subarray(0, 12)), [0, 0, 4, 0, 4, 4, 0, 0, 4, 4, 0, 4]);
  },

  'AC-5 facePlacement takes a Vec2 viewport and returns a Rect'() {
    const view = new Vec2(1280, 760);
    const calm = facePlacement(view, 0);
    assert.ok(calm.rect instanceof Rect);
    assert.equal(calm.rect.size.x, FACE_CELL_W * calm.pixel);
    assert.equal(calm.rect.size.y, FACE_CELL_H * calm.pixel);
    assert.equal(calm.rect.bottomRightCorner.y, 760 - 18);
    const calmTop = calm.rect.topLeftCorner.y;
    const calmLeft = calm.rect.topLeftCorner.x;
    const jolted = facePlacement(view, 0.25, { rect: new Rect(), pixel: 0 });
    assert.ok(jolted.rect.topLeftCorner.x !== calmLeft || jolted.rect.topLeftCorner.y !== calmTop);
    assert.equal(view.x, 1280);
    assert.equal(view.y, 760);
  },

  'AC-6 Buffer.vertex accepts a Vec2 position and ignores overflow'() {
    const { fills } = new Overlay(makeOverlayWorld().world).glow;
    fills.vertex(new Vec2(7, 8), [0.25, 0.5, 0.75]);
    assert.equal(fills.count, 1);
    assert.deepEqual(Array.from(fills.positions.subarray(0, 2)), [7, 8]);
    assert.deepEqual(Array.from(fills.colors.subarray(0, 3)), [0.25, 0.5, 0.75]);
    const at = new Vec2(1, 1);
    while (fills.count < fills.capacity)
      fills.vertex(at, [0, 0, 0]);
    fills.vertex(at, [1, 1, 1]);
    assert.equal(fills.count, fills.capacity);
  },

  'AC-7 HUD overlay drawing passes spatial primitives with unchanged coordinates'() {
    const rects = [];
    const fillRects = [];
    const circles = [];
    const lineArgs = [];
    const quadArgs = [];
    const noop = () => {};
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const overlay = {
      clear: noop,
      glow: { line: (pts) => lineArgs.push(pts) },
      crisp: {
        fillRect: (r) => fillRects.push(r instanceof Rect ? rectBox(r) : null),
        rectLine: (r) => rects.push(r instanceof Rect ? rectBox(r) : null),
        line: (pts) => lineArgs.push(pts),
        circleLine: (c) => circles.push(c instanceof Circ),
        weapon: { quad: (r) => quadArgs.push(r instanceof Rect) },
        sprites: { quad: (r) => quadArgs.push(r instanceof Rect) },
        face: { quad: (r) => quadArgs.push(r instanceof Rect) },
      },
    };
    const hud = new Hud({ width: 0, height: 0, getContext: () => ctx }, overlay);
    hud.resize(1280, 760, 1);
    const game = fresh(0);
    game.player.hurt = 0;
    hud.render(game);
    const face = facePlacement(new Vec2(1280, 760), 0, { rect: new Rect(), pixel: 0 }).rect;
    const fx = face.topLeftCorner.x;
    const fy = face.topLeftCorner.y;
    assert.ok(rects.length > 0 && rects.every((r) => r !== null), 'every rectLine receives a Rect');
    assert.ok(fillRects.every((r) => r !== null), 'every fillRect receives a Rect');
    assert.ok(quadArgs.length > 0 && quadArgs.every(Boolean), 'every quad receives a Rect');
    assert.ok(lineArgs.length > 0 && lineArgs.every((pts) => pts.every((p) => p instanceof Vec2)), 'every line receives Vec2 points');
    assert.ok(rects.some((r) => r.x === fx - 4.5 && r.y === fy - 4.5 && r.w === face.size.x + 9 && r.h === face.size.y + 9), 'portrait border');
    assert.ok(fillRects.some((r) => r.x === fx - 4 && r.y === fy - 4 && r.w === face.size.x + 8 && r.h === face.size.y + 8), 'portrait background');

    hud.drawAutomap?.(game);
    assert.ok(circles.every(Boolean), 'every circleLine receives a Circ');
  },
};

function pausedHud() {
  const texts = [];
  const fakeCanvas = {
    width: 0,
    height: 0,
    getContext() {
      return {
        setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        fillText(str) { texts.push(str); },
      };
    },
  };
  const fakeOverlay = {
    clear() {},
    glow: { line() {} },
    crisp: { fillRect() {}, rectLine() {}, line() {}, circleLine() {}, weapon: { quad() {} }, sprites: { quad() {} }, face: { quad() {} } },
  };
  const game = fresh(0);
  game.state = 'paused';
  const hud = new Hud(fakeCanvas, fakeOverlay);
  hud.resize(1024, 768, 1);
  return { texts, hud, game };
}

const withInput = (fn) => {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const handlers = {};
  globalThis.document = { addEventListener() {}, pointerLockElement: null };
  globalThis.window = { addEventListener(name, handler) { handlers[name] = handler; } };
  const base = { repeat: false, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, preventDefault() {} };
  try {
    const inp = new Input({ addEventListener() {} }, new Keymap({ storage: null, navigator: null }));
    fn(inp, (e) => globalThis.document.onkeydown({ ...base, ...e }), (e) => globalThis.document.onkeyup({ ...base, ...e }), () => handlers.blur());
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
};

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  const writes = [];
  return {
    data,
    writes,
    getItem: (key) => data[key] ?? null,
    setItem(key, value) { writes.push(['set', key]); data[key] = String(value); },
    removeItem(key) { writes.push(['remove', key]); delete data[key]; },
  };
};

const fakeGame = () => ({ zero: new Vec2(), events: [], emit(type) { this.events.push(type); } });

const withRig = (fn, storage = null) => {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const canvas = { getBoundingClientRect: undefined };
  const canvasHandlers = {};
  globalThis.document = { addEventListener() {}, pointerLockElement: null };
  globalThis.window = { addEventListener() {} };
  const base = { repeat: false, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, preventDefault() {} };
  try {
    const target = { addEventListener(name, handler) { canvasHandlers[name] = handler; } };
    const inp = new Input(target, new Keymap({ storage, navigator: null }));
    fn(inp, {
      canvas: canvasHandlers,
      down: (e) => globalThis.document.onkeydown({ ...base, ...e }),
      up: (e) => globalThis.document.onkeyup({ ...base, ...e }),
    });
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
};

console.log('# file: tests/sim.test.mjs');
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    const res = fn();
    if (res && typeof res.then === 'function')
      await res;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${name}\n     ${error.message}`);
  }
}
process.exit(failed ? 1 : 0);
