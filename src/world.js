import { CustomMesh, Cylinder, FullscreenQuad, Grid, Material, Mesh, PerspectiveCamera, Quat, Rand, Renderer, RenderTarget, Scene, Sprite, Texture, Trigo, Utils, Vec2, Vec3 } from '@1pizzateam/roostr';
import { BLOOD } from './blood.js';
import { ACID_PIT_DEPTH } from './game.js';
import { barrelAtlas, barrelExplosionPose, barrelShrapnelParts, barrelWreckMesh, createBarrelExplosionPose, skinBarrel } from './barrel.js';
import { bloodAtlas, createQuadTarget, floorGibQuad, floorSplatQuad, particleQuad, printQuad, wallDripQuads, wallSplatQuad } from './bloodsprites.js';
import { DOOR_FRAGMENT, DOOR_INSET, DOOR_THICKNESS, DOOR_VERTEX, WALL_FRAGMENT, WALL_VERTEX, doorAtlas, doorBox, doubleDoorBox, lockedDoorAtlas, secretDoorBox } from './door.js';
import { CEILING_AMBIENT_COLOR, CEILING_CONE_FRAGMENT, CEILING_CONE_VERTEX, CEILING_FRAGMENT, MARS_SKY_FRAGMENT, MARS_SKY_VERTEX, ceilingAtlas, ceilingCellFor, ceilingCellUv, ceilingLightCones, ceilingLightFixtures, createCeilingLights, marsSkyAtlas, marsSkyMesh, updateCeilingLights } from './ceiling.js';
import { WALL_CELLS, diagWallFaceQuads, marsRockAtlas, wallAtlas, wallCellUv, wallFaceQuads } from './wall.js';
import { createExplosion3dPose, EXPLOSION_FRAMES, EXPLOSION_PARTICLE_COUNT, explosion3dAtlas, explosion3dMesh, explosion3dPose, explosionAtlas, explosionParticleQuads, teleportAtlas } from './explosion.js';
import { FIREBALL_FRAMES, fireballAtlas } from './fireball.js';
import { grenadeAtlas, grenadeParts } from './grenade.js';
import { CRATE_FRAGMENT, FLOOR_FRAGMENT, FLOOR_VERTEX, MARS_DIRT_FRAGMENT, MARS_ROCK_FRAGMENT, SLIME_FRAGMENT, TELEPORTER_FRAGMENT, crateAtlas, crateQuads, floorAtlas, floorCellFor, floorCellUv, marsBoulderAtlas, marsBoulderQuads, marsDirtAtlas, slimeAtlas, teleporterAtlas, teleporterMachineQuads } from './floor.js';
import { CEILING, DOOR, EXIT, EYE, FLOOR, PILLAR, TILE, WALL } from './level.js';
import { FOG_FAR, FOG_NEAR, MARS_INDOOR_FOG, MARS_NVG_FOG, MARS_OUTDOOR_FOG, marsFogNearFar } from './fog.js';
import { faceCorners, quadTriangles } from './lines.js';
import { MONSTERS } from './monsters.js';
import { Overlay } from './overlay.js';
import { LIGHT_GLSL, PARTICLE_FRAGMENT, PARTICLE_VERTEX, QuadBatch, SOLID_ALPHA, SOLID_TEXTURED_FRAGMENT, TEXTURED_FRAGMENT, texturedMesh } from './quads.js';
import { holeQuad, IMPACT_CELLS, impactAtlas, SPARK_FRAMES, SPARK_VARIANTS } from './impacts.js';
import { medikitAtlas, medikitMesh } from './medikit.js';
import { ammoAtlas, ammoMesh, bulletAtlas, bulletMesh, rocketAmmoAtlas, rocketAmmoMesh } from './ammo.js';
import { keycardAtlas, keycardMesh } from './keycard.js';
import { CHEST_LID_HINGE, CHEST_LID_OPEN_ANGLE, CHEST_TINTS, chestAtlas, chestBodyMesh, chestLidMesh } from './cache.js';
import { chaingunAtlas, chaingunMesh, chaingunParts, chaingunPose, chainsawAtlas, chainsawMesh, chainsawParts, chainsawPose, knifeAtlas, knifeParts, knifePose, rocketLauncherAtlas, rocketLauncherMesh, rocketLauncherParts, rocketLauncherPose, shotgunAtlas, shotgunMesh, shotgunParts, shotgunPose } from './arsenal.js';
import { WEAPONS } from './weapon.js';
import { armorAtlas, armorMesh } from './armor.js';
import { berserkAtlas, berserkMesh, nightvisionAtlas, nightvisionMesh, radsuitAtlas, radsuitMesh, soulsphereAtlas, soulsphereMesh } from './powerups.js';
import lineFogShader from './shaders/line-fog.shadergun.json' with { type: 'json' };
import monster3dShader from './shaders/monster-3d.shadergun.json' with { type: 'json' };
import viewmodel3dShader from './shaders/viewmodel-3d.shadergun.json' with { type: 'json' };
import explosion3dShader from './shaders/explosion-3d.shadergun.json' with { type: 'json' };
import sparkParticleShader from './shaders/spark-particle.shadergun.json' with { type: 'json' };
import postCoreNvgShader from './shaders/post-core-nvg.shadergun.json' with { type: 'json' };
import postDownsampleShader from './shaders/post-downsample.shadergun.json' with { type: 'json' };
import postGlowShader from './shaders/post-glow.shadergun.json' with { type: 'json' };

// Blue is the world, green is what helps you, orange is what hurts, red is blood.
const BG = [7 / 255, 9 / 255, 15 / 255];
const BG_VEC = new Vec3(BG[0], BG[1], BG[2]);
const COLORS = {
  blue: new Vec3(0x5b / 255, 0x8c / 255, 0xff / 255),
  green: new Vec3(0x38 / 255, 0xc7 / 255, 0x93 / 255),
  orange: new Vec3(0xff / 255, 0x9f / 255, 0x43 / 255),
  red: new Vec3(0xe8 / 255, 0x10 / 255, 0x2c / 255),
};

// Rooms are closed by a ceiling one wall high (a wall texture is one tile high): the walls go right up to it, so nothing
// in another room shows above a wall. Tall walls are drawn no higher than it, and the stretch above a low wall is wall.
const ROOF = CEILING;

const NEAR = 6;
const FAR = 2400;
const HORIZONTAL_FOV = 82;

export const LINE_VERTEX = lineFogShader.vertex;

export const LINE_FRAGMENT = lineFogShader.fragment;

// The colours of a sprite: RoostR's Sprite places it and hands over `vTextureCoord` and `vDepth`.
export const SPRITE_FRAGMENT = TEXTURED_FRAGMENT;

const MONSTER_VERTEX = monster3dShader.vertex;

export const MONSTER_FRAGMENT = monster3dShader.fragment;

const VIEWMODEL_VERTEX = viewmodel3dShader.vertex;

const VIEWMODEL_FRAGMENT = viewmodel3dShader.fragment;

export const EXPLOSION_3D_VERTEX = explosion3dShader.vertex;

export const EXPLOSION_3D_FRAGMENT = explosion3dShader.fragment;

export const SPARK_PARTICLE_FRAGMENT = sparkParticleShader.fragment;

const POST_VERTEX = postCoreNvgShader.vertex;

// The neon look is made in three cheap passes instead of one expensive one:
//  1. CORE (full resolution): thickens the 1px GL lines with four taps.
//  2. DOWN (a small target): averages the scene into a much smaller texture, where blurring is nearly free.
//  3. GLOW (full resolution, additive): adds that small texture back, smoothly upscaled by the GPU.
const CORE_FRAGMENT = postCoreNvgShader.fragment;

// Four bilinear taps average the whole span x span block of scene pixels under each small pixel.
// The result is boosted so that faint, thin lines survive the 8-bit target; GLOW takes the boost out again.
const DOWN_FRAGMENT = postDownsampleShader.fragment;

const GLOW_FRAGMENT = postGlowShader.fragment;

const MARS_SKY_VEC = new Vec3(0.46, 0.18, 0.06);
export const MARS_AMBIENT_COLOR = new Vec3(1.04, 0.86, 0.72);
export const MARS_DUST_TINT = new Vec3(1.2, 7.5, 1.8);
export { MARS_INDOOR_FOG, MARS_NVG_FOG, MARS_OUTDOOR_FOG, marsFogNearFar };
const scratchHolePos = new Vec3();
const scratchHoleNormal = new Vec2();
const scratchHoleMark = { pos: scratchHolePos, normal: scratchHoleNormal, top: 0, seed: 0, kind: undefined, lo: undefined, hi: undefined, slope: undefined };
const scratchHoleQuad = { corners: new Array(12).fill(0), uv: new Array(4).fill(0) };

/** Builds the quad of a stored scalar hole mark; with no `out` it returns a fresh quad that callers may retain. */
function wallHoleQuad(mark, out = null) {
  const hm = scratchHoleMark;
  hm.pos.x = mark.x;
  hm.pos.y = mark.y;
  hm.pos.z = mark.z;
  hm.normal.x = mark.nx;
  hm.normal.y = mark.ny;
  hm.top = mark.top;
  hm.seed = mark.seed;
  hm.kind = mark.kind;
  hm.lo = mark.lo;
  hm.hi = mark.hi;
  hm.slope = mark.slope;
  return holeQuad(hm, out);
}
const scratchSplatMark = { x: 0, y: 0, z: 0, nx: 0, ny: 0, size: 0, top: 0, seed: 0, age: undefined, lo: undefined, hi: undefined, slope: undefined };
const scratchChainsawOpts = { time: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0, attacking: false };
const scratchChaingunOpts = { time: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0, attacking: false, spinDown: 0 };
const scratchShotgunOpts = { time: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0, elapsed: -1, hasAmmo: true };
const scratchRocketOpts = { time: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0, elapsed: -1, hasAmmo: true };
const scratchKnifeOpts = { time: 0, bob: 0, moving: 0, recoil: 0, switchOffset: 0, elapsed: -1, attack: 'vertical' };
const scratchPos = new Vec3();
const scratchRot = new Vec3();
const scratchScale = new Vec3();
const tintScratch = new Vec3();
const scratchForward = new Vec3();
const scratchRight = new Vec3();
const scratchUp = new Vec3();
const scratchQuat = new Quat();
const ZERO_KICK = Object.freeze({ pitch: 0, yaw: 0, roll: 0, fov: 0 });
const SHOTGUN_FLASH = WEAPONS.shotgun.feel.flash;
const ROCKET_FLASH = WEAPONS.rocket.feel.flash;

/** Writes the kicked view basis into scratchForward / scratchRight / scratchUp. */
function writeViewBasis(angle, kick) {
  const a = angle + kick.yaw;
  const cosA = Math.cos(a);
  const sinA = Math.sin(a);
  const cosP = Math.cos(kick.pitch);
  const sinP = Math.sin(kick.pitch);
  const cosR = Math.cos(kick.roll);
  const sinR = Math.sin(kick.roll);
  scratchForward.setScalar(cosA * cosP, sinP, sinA * cosP);
  const upX = -cosA * sinP;
  const upZ = -sinA * sinP;
  scratchUp.setScalar(upX * cosR + -sinA * sinR, cosP * cosR, upZ * cosR + cosA * sinR);
  scratchRight.setScalar(-sinA * cosR - upX * sinR, -cosP * sinR, cosA * cosR - upZ * sinR);
}

/** Writes the kicked viewmodel root rotation into scratchQuat. */
function writeViewQuat(angle, kick, rotation) {
  scratchQuat
    .setFromEuler(scratchRot.setScalar(0, Trigo.halfpi - (angle + kick.yaw), 0))
    .rotateX(-kick.pitch)
    .rotateZ(kick.roll)
    .rotateY(rotation.y)
    .rotateX(rotation.x)
    .rotateZ(rotation.z);
}
const scratchFog = new Vec2();
const scratchCam2d = new Vec2();
const EMPTY = Object.freeze([]);
const scratchEntity2d = new Vec2();
const scratchRightArr = [0, 0, 0];
const scratchUpArr = [0, 0, 0];
const scratchParticleQuad = { corners: new Float32Array(12), uv: [0, 0, 0, 0] };
const SECTOR_TILES = 16;

function makeSectorBounds(sx, sy, width, rowCount) {
  return {
    x0: Math.max(0, sx - 1),
    y0: Math.max(0, sy - 1),
    x1: Math.min(width, sx + SECTOR_TILES + 1),
    y1: Math.min(rowCount, sy + SECTOR_TILES + 1),
  };
}

function partitionQuadsBySector(quads, sectorGrid, sectorWorldSize = SECTOR_TILES * TILE, width = Infinity, rowCount = Infinity) {
  if (!quads.length)
    return [];
  const buckets = new Map();
  for (let i = 0; i < quads.length; i++) {
    const q = quads[i];
    const c = q.corners;
    scratchEntity2d.setScalar(Math.max(0, c[0]), Math.max(0, c[2]));
    const key = sectorGrid.getCell(scratchEntity2d);
    let bucket = buckets.get(key);
    if (!bucket) {
      sectorGrid.getCellCoords(key, scratchFog);
      bucket = {
        faces: [],
        center: new Vec2((scratchFog.x + 0.5) * sectorWorldSize, (scratchFog.y + 0.5) * sectorWorldSize),
        radius: sectorWorldSize * 0.85,
        bounds: Number.isFinite(width) ? makeSectorBounds(scratchFog.x * SECTOR_TILES, scratchFog.y * SECTOR_TILES, width, rowCount) : null,
      };
      buckets.set(key, bucket);
    }
    bucket.faces.push(q);
  }
  return [...buckets.values()];
}

function partitionTrianglesBySector(vertices, sectorGrid, sectorWorldSize = SECTOR_TILES * TILE, width = Infinity, rowCount = Infinity) {
  if (!vertices.length)
    return [];
  const buckets = new Map();
  for (let i = 0; i < vertices.length; i += 9) {
    scratchEntity2d.setScalar(Math.max(0, vertices[i]), Math.max(0, vertices[i + 2]));
    const key = sectorGrid.getCell(scratchEntity2d);
    let bucket = buckets.get(key);
    if (!bucket) {
      sectorGrid.getCellCoords(key, scratchFog);
      bucket = {
        vertices: [],
        center: new Vec2((scratchFog.x + 0.5) * sectorWorldSize, (scratchFog.y + 0.5) * sectorWorldSize),
        radius: sectorWorldSize * 0.85,
        bounds: Number.isFinite(width) ? makeSectorBounds(scratchFog.x * SECTOR_TILES, scratchFog.y * SECTOR_TILES, width, rowCount) : null,
      };
      buckets.set(key, bucket);
    }
    bucket.vertices.push(
      vertices[i], vertices[i + 1], vertices[i + 2],
      vertices[i + 3], vertices[i + 4], vertices[i + 5],
      vertices[i + 6], vertices[i + 7], vertices[i + 8]
    );
  }
  return [...buckets.values()];
}

// walls end at y = 0 but floor and dirt tiles sit at y = -0.2; lowering the bottom edge closes the seam that shows the sky
const WALL_FLOOR_Y = -0.2;
function sinkToFloor(quads) {
  for (const quad of quads)
    for (let i = 1; i < 12; i += 3)
      if (quad.corners[i] === 0)
        quad.corners[i] = WALL_FLOOR_Y;
}

export function registerStaticChunk(chunks, mesh, fallbackCenter, fallbackRadius, hideInCutaway = false, bounds = null) {
  const sphere = mesh?.localBoundingSphere;
  const hasSphere = sphere?.center && Number.isFinite(sphere.radius) && sphere.radius > 0;
  chunks.push({
    mesh,
    center: hasSphere ? new Vec2(sphere.center.x, sphere.center.z) : fallbackCenter,
    radius: hasSphere ? sphere.radius : fallbackRadius,
    hideInCutaway,
    bounds,
  });
  return mesh;
}

function isChunkVisibleInFog(fog, bounds, levelWidth) {
  const visible = fog.visible;
  if (!visible || !(fog.exploredCount > 0))
    return true;
  const { x0, y0, x1, y1 } = bounds;
  for (let ty = y0; ty < y1; ty++) {
    const row = ty * levelWidth;
    for (let tx = x0; tx < x1; tx++)
      if (visible[row + tx] === 1)
        return true;
  }
  return false;
}

function setPos(node, x, y, z) {
  node.setPosition(scratchPos.setScalar(x, y, z));
}

function setRot(node, x, y, z) {
  node.setRotation(scratchRot.setScalar(x, y, z));
}

function setUniformScale(node, s) {
  node.setScale(scratchScale.setScalar(s, s, s));
}

function setScale(node, x, y, z) {
  node.setScale(scratchScale.setScalar(x, y, z));
}

/** Fades a colour towards the background. Writes straight into the material, so a frame allocates nothing. */
function tint(material, color, amount) {
  tintScratch.lerpVectors(BG_VEC, color, amount);
  material.setDiffuse(tintScratch);
}

/** How wide an explosion sprite is: a fireball impact is compact, and a barrel explosion spreads wide across the floor. */
export function explosionWidth(effect) {
  if (effect.type === 'blast')
    return 24;
  if (effect.type === 'teleport')
    return 62;
  return 120;
}

/** RoostR scene for the 3D world: wall faces, doors, enemies, pickups and projectiles are all line meshes. */
export class World {
  /** `events.onLost` and `events.onRestored` fire when the browser drops and gives back the GPU context. */
  constructor(canvas, events = {}) {
    this.lost = false;
    this.renderer = new Renderer(canvas, {
      size: new Vec2(canvas.width, canvas.height),
      contextAttributes: { antialias: false, alpha: false, depth: true },
      onContextLost: () => {
        this.lost = true;
        events.onLost?.();
      },
      onContextRestored: () => {
        this.restoreGpu();
        events.onRestored?.();
      },
    });
    const gl = this.renderer.getContext();
    if (!gl)
      throw new Error('WebGL is not available in this browser');
    // RoostR culls back faces by default; the hiding triangles are single-sided and must always draw
    this.renderer.disable('CULL_FACE');
    this.canvas = canvas;
    this.gl = gl;
    this.ratio = 1;
    this.width = 1;
    this.height = 1;
    this.viewportSize = new Vec2(1, 1);
    this.glowViewportSize = new Vec2(1, 1);

    this.scene = new Scene({ context: gl, clearColor: BG_VEC, depthTest: true, enableFrustumCulling: true, viewport: this.viewportSize });
    this.scene.setFog(BG_VEC, FOG_NEAR, FOG_FAR);
    this.camera = new PerspectiveCamera(60, new Vec2(NEAR, FAR), gl);
    this.camera.up.setScalar(0, 1, 0);

    // post-processing, all with RoostR render targets and full-screen quads
    this.postCamera = new PerspectiveCamera(45, new Vec2(0.1, 10), gl);
    this.target = new RenderTarget(this.viewportSize, gl);
    this.glowTarget = new RenderTarget(this.glowViewportSize, gl);
    this.glowDivisor = 4;

    this.down = new Scene({ context: gl, clearColor: BG_VEC, viewport: this.glowViewportSize });
    this.downQuad = this.screenQuad(DOWN_FRAGMENT, this.target.texture);
    this.downQuad.addCustomUniform('sourceTexel', 'uniform2f', new Vec2(1, 1));
    this.downQuad.addCustomUniform('span', 'uniform1f', 4);
    this.down.addMesh(this.downQuad);

    this.post = new Scene({ context: gl, clearColor: BG_VEC, viewport: this.viewportSize });
    this.quad = this.screenQuad(CORE_FRAGMENT, this.target.texture);
    this.quad.addCustomUniform('nightVision', 'uniform1f', 0);
    this.quad.addCustomUniform('time', 'uniform1f', 0);
    this.glowQuad = this.screenQuad(GLOW_FRAGMENT, this.glowTarget.texture);
    this.glowQuad.addCustomUniform('glowTexel', 'uniform2f', new Vec2(1, 1));
    this.glowQuad.setBlend('ONE', 'ONE');
    this.post.addMesh(this.quad);
    this.post.addMesh(this.glowQuad);

    this.overlay = new Overlay(this);

    this.hiding = new Material({ diffuse: BG_VEC });
    this.level = null;
    this.doorViews = new Map();
    this.crusherViews = new Map();
    this.enemyViews = new Map();
    this.pickupViews = new Map();
    this.cacheViews = new Map();
    this.frameGame = null;
    this.framePlayer = null;
    this.frameTime = 0;
    this.frameCullDistSq = Infinity;
    this.frameEffectCullDistSq = Infinity;
    this.frameOccludeFog = null;
    this.barrelViews = new Map();
    this.shotViews = new Map();
    this.effectViews = new Map();
    this.staticMeshes = [];
    this.staticChunks = [];
    this.skyMesh = null;
    this.slimeMesh = null;
    this.chainsawView = null;
    this.chaingunView = null;
    this.shotgunView = null;
    this.rocketLauncherView = null;
    this.droplets = null;
    this.dust = null;
    this.splatters = null;
    this.splatVersion = -1;
    this.splatCache = new WeakMap();
    this.dripCache = new WeakMap();
    this.dripTarget = createQuadTarget();
    this.syncStamp = 0;
    this.lightFixtures = [];
    this.ceilingLights = [];
    this.ambientLight = null;
    this.cutaway = false;
    this.cutawayNearFar = new Vec2(NEAR, 8000);
    this.fogNearFar = new Vec2(FOG_NEAR, FOG_FAR);
    this.ceilingMesh = null;
    this.ceilingMeshes = [];
    this.crateMeshes = [];
    this.roofSolidMesh = null;
    this.lightConesMesh = null;
    this.lightConesMeshes = [];
    this.wallTopsMesh = null;
    this.textureCache = new Map();
    this.sharedTexturedMeshes = [];
  }

  /** Returns a cached GPU `WebGLTexture` for `atlas` and `options`, uploading pixel data only once per context. */
  sharedTexture(atlas, options = {}) {
    if (!atlas || !this.gl)
      return null;
    if (typeof this.gl.createTexture !== 'function')
      return {};
    this.textureCache ??= new WeakMap();
    const { gl } = this;
    const magFilter = options.magFilter ?? gl.NEAREST;
    const minFilter = options.minFilter ?? gl.NEAREST;
    const wrapS = options.wrapS ?? gl.CLAMP_TO_EDGE;
    const wrapT = options.wrapT ?? gl.CLAMP_TO_EDGE;
    const generateMipmaps = Boolean(options.generateMipmaps);
    const flipY = options.flipY !== false;
    let byOptions = this.textureCache.get(atlas);
    if (!byOptions) {
      byOptions = new Map();
      this.textureCache.set(atlas, byOptions);
    }
    const key = `${magFilter}|${minFilter}|${wrapS}|${wrapT}|${generateMipmaps ? 1 : 0}|${flipY ? 1 : 0}`;
    let tex = byOptions.get(key);
    if (!tex) {
      tex = Texture.create(atlas.data, gl, {
        size: new Vec2(atlas.width, atlas.height),
        magFilter,
        minFilter,
        wrapS,
        wrapT,
        generateMipmaps,
        flipY,
      });
      byOptions.set(key, tex);
    }
    return tex;
  }

  /** Binds a shared GPU `WebGLTexture` to `mesh` and records the binding so WebGL context recovery can restore it. */
  bindAtlasTexture(mesh, atlas, options = {}) {
    if (!mesh || !atlas)
      return mesh;
    const shared = this.sharedTexture(atlas, options);
    if (shared && typeof mesh.setSharedTexture === 'function') {
      mesh.setSharedTexture(shared);
      mesh.sharedAtlas = atlas;
      mesh.sharedTexOptions = options;
      this.sharedTexturedMeshes.push(mesh);
    } else if (typeof mesh.setTexture === 'function')
      mesh.setTexture(atlas.data, {
        size: new Vec2(atlas.width, atlas.height),
        magFilter: this.gl.NEAREST,
        minFilter: this.gl.NEAREST,
        ...options,
      });
    return mesh;
  }

  /** Toggles architectural roof cutaway for 3D overhead diorama inspection while preserving full wall top caps. */
  setCutaway(cutaway, nearFar = new Vec2(NEAR, 8000)) {
    this.cutaway = Boolean(cutaway);
    this.cutawayNearFar.copy(nearFar);
    if (this.skyMesh)
      if (this.cutaway)
        this.skyMesh.setInactive();
      else
        this.skyMesh.setActive();
    if (this.ceilingMesh)
      if (this.cutaway)
        this.ceilingMesh.setInactive();
      else
        this.ceilingMesh.setActive();
    if (this.ceilingMeshes)
      for (let i = 0; i < this.ceilingMeshes.length; i++)
        if (this.cutaway)
          this.ceilingMeshes[i].setInactive();
        else
          this.ceilingMeshes[i].setActive();
    if (this.roofSolidMesh)
      if (this.cutaway)
        this.roofSolidMesh.setInactive();
      else
        this.roofSolidMesh.setActive();
    if (this.lightConesMesh)
      if (this.cutaway)
        this.lightConesMesh.setInactive();
      else
        this.lightConesMesh.setActive();
    if (this.lightConesMeshes)
      for (let i = 0; i < this.lightConesMeshes.length; i++)
        if (this.cutaway)
          this.lightConesMeshes[i].setInactive();
        else
          this.lightConesMeshes[i].setActive();
    if (this.wallTopsMesh)
      if (this.cutaway)
        this.wallTopsMesh.setActive();
      else
        this.wallTopsMesh.setInactive();
    if (this.cutaway && this.staticChunks)
      for (let i = 0; i < this.staticChunks.length; i++) {
        const chunk = this.staticChunks[i];
        const chunkMesh = chunk.mesh;
        if (!chunkMesh || typeof chunkMesh.setActive !== 'function')
          continue;
        if (chunk.hideInCutaway)
          chunkMesh.setInactive();
        else
          chunkMesh.setActive();
      }
    const isMars = this.level?.planet === 'mars';
    const skyVec = isMars ? MARS_SKY_VEC : BG_VEC;
    if (this.ambientLight)
      this.ambientLight.setColor(this.cutaway ? new Vec3(0.95, 1.0, 1.08) : (isMars ? MARS_AMBIENT_COLOR : CEILING_AMBIENT_COLOR));
    const activeNearFar = this.cutaway ? this.cutawayNearFar : new Vec2(NEAR, FAR);
    this.camera.setNearFar(activeNearFar);
    this.camera.setProjectionMatrix(this.viewportSize);
    this.scene.setFog(
      skyVec,
      this.cutaway ? activeNearFar.y * 0.65 : this.fogNearFar.x,
      this.cutaway ? activeNearFar.y * 1.25 : this.fogNearFar.y
    );
  }

  /** Stops listening for context events. */
  dispose() {
    this.renderer.dispose();
  }

  /**
   * After the browser gives the GPU back, every buffer, program and texture is gone. RoostR rebuilds them from
   * the CPU data of each mesh; what the game uploaded by hand is sent again here, and the render targets'
   * new textures are handed back to the quads that sample them.
   */
  restoreGpu() {
    this.renderer.disable('CULL_FACE');
    this.textureCache.clear();
    for (const target of [this.target, this.glowTarget])
      target.restore();
    this.downQuad.WebGLTexture = this.target.texture;
    this.quad.WebGLTexture = this.target.texture;
    this.glowQuad.WebGLTexture = this.glowTarget.texture;
    for (const scene of [this.scene, this.down, this.post])
      scene.restore();
    for (let i = 0; i < this.sharedTexturedMeshes.length; i++) {
      const mesh = this.sharedTexturedMeshes[i];
      const atlas = mesh.activeAtlas ?? mesh.sharedAtlas;
      if (atlas && typeof mesh.setSharedTexture === 'function')
        mesh.setSharedTexture(this.sharedTexture(atlas, mesh.sharedTexOptions ?? {}));
    }
    this.overlay.restore();
    this.lost = false;
  }

  /** A full-screen quad that draws a texture through a fragment shader. */
  screenQuad(fragment, texture) {
    const quad = new Mesh(this.gl, new FullscreenQuad());
    quad.addProgram(POST_VERTEX, fragment, new Material());
    quad.WebGLTexture = texture;
    quad.setDepthWrite(false);
    return quad;
  }

  resize(cssWidth, cssHeight, ratio) {
    this.ratio = ratio;
    this.width = Math.max(1, Math.round(cssWidth * ratio));
    this.height = Math.max(1, Math.round(cssHeight * ratio));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.viewportSize.setScalar(this.width, this.height);
    this.scene.setViewport(this.viewportSize);
    this.post.setViewport(this.viewportSize);
    this.target.setSize(this.viewportSize);

    // the glow is blurred in a texture a fraction of the size, so its cost does not grow with the screen
    const scale = Math.max(this.height / 760, 1);
    this.glowDivisor = Math.max(3, Math.round(4 * scale));
    const glowWidth = Math.max(1, Math.ceil(this.width / this.glowDivisor));
    const glowHeight = Math.max(1, Math.ceil(this.height / this.glowDivisor));
    this.glowViewportSize.setScalar(glowWidth, glowHeight);
    this.glowTarget.setSize(this.glowViewportSize);
    this.down.setViewport(this.glowViewportSize);
    this.downQuad.setCustomUniform('sourceTexel', new Vec2(1 / this.width, 1 / this.height));
    this.downQuad.setCustomUniform('span', this.glowDivisor);
    this.glowQuad.setCustomUniform('glowTexel', new Vec2(1 / glowWidth, 1 / glowHeight));
    this.overlay.resize(cssWidth, cssHeight, this.width, this.height);

    // keep the horizontal field of view stable whatever the window shape
    const aspect = this.width / this.height;
    const vertical = Trigo.radianToDegree(2 * Math.atan(Math.tan(Trigo.degreeToRadian(HORIZONTAL_FOV / 2)) / aspect));
    this.baseFov = Math.min(vertical, 78);
    this.camera.fov = this.baseFov;
    this.zoom = 1;
    this.camera.setProjectionMatrix(this.viewportSize);
  }

  // ---- mesh helpers -------------------------------------------------------

  makeMesh(vertices, primitive, material) {
    const geometry = new CustomMesh();
    geometry.vertices = vertices instanceof Float32Array ? vertices : new Float32Array(vertices);
    geometry.setPrimitive(primitive);
    const mesh = new Mesh(this.gl, geometry);
    mesh.addProgram(LINE_VERTEX, LINE_FRAGMENT, material);
    return mesh;
  }

  solid(vertices, parent = null) {
    const mesh = this.makeMesh(vertices, 'TRIANGLES', this.hiding);
    if (parent)
      parent.addChild(mesh);
    return mesh;
  }

  material(color, amount = 1) {
    const material = new Material();
    tint(material, COLORS[color], amount);
    return material;
  }

  /**
   * A 2D sprite `width` by `height` units that faces the camera: by default it stands on the mesh's position and stays
   * upright, like a monster. `setFrame` picks the cell of the atlas to draw and the `glare` uniform how brightly the
   * eyes of the monster shader burn.
   */
  sprite(atlas, material, width, height, { anchor = 'bottom', billboard = 'cylindrical', depthBias = 0, fragment = SPRITE_FRAGMENT } = {}) {
    const { gl } = this;
    const sprite = new Sprite(gl, {
      size: new Vec2(width, height),
      texture: atlas.data,
      textureOptions: { size: new Vec2(atlas.width, atlas.height), magFilter: gl.NEAREST, minFilter: gl.NEAREST },
      frames: atlas.frames,
      anchor,
      billboard,
      depthBias,
      material,
      fragment,
    });
    sprite.addCustomUniform('glare', 'uniform1f', 0.3);
    return sprite;
  }

  /** A 3D body-part mesh for an articulated monster, lit by scene lights and 3D normals with glowing eyes. */
  monsterPartMesh(geometry, atlas, material) {
    const { gl } = this;
    const mesh = new Mesh(gl, geometry);
    mesh.addProgram(MONSTER_VERTEX, MONSTER_FRAGMENT, material);
    this.bindAtlasTexture(mesh, atlas, {
      magFilter: gl.NEAREST,
      minFilter: gl.NEAREST,
    });
    mesh.addCustomUniform('glare', 'uniform1f', 0.3);
    return mesh;
  }

  /** A 3D textured viewmodel sub-mesh lit by scene lights and 3D surface normals. */
  chainsawPartMesh(part, atlas, material) {
    const { gl } = this;
    const geometry = new CustomMesh();
    geometry.vertices = part.vertices;
    geometry.normals = part.normals;
    geometry.uvs = part.uvs;
    geometry.setPrimitive('TRIANGLES');
    const mesh = new Mesh(gl, geometry);
    mesh.addProgram(VIEWMODEL_VERTEX, VIEWMODEL_FRAGMENT, material);
    this.bindAtlasTexture(mesh, atlas, {
      magFilter: gl.NEAREST,
      minFilter: gl.NEAREST_MIPMAP_NEAREST,
      generateMipmaps: true,
    });
    mesh.localBoundingSphere.radius = 64;
    return mesh;
  }

  /** Builds the first-person 3D textured chainsaw viewmodel and its animated cutting chain hierarchy. */
  buildChainsaw() {
    this.chainsawTexture ??= chainsawAtlas();
    const parts = chainsawParts();
    const material = new Material({ diffuse: new Vec3(1, 1, 1) });
    const root = this.chainsawPartMesh(parts.body, this.chainsawTexture, material);
    const topChain = this.chainsawPartMesh(parts.topChain, this.chainsawTexture, material);
    const bottomChain = this.chainsawPartMesh(parts.bottomChain, this.chainsawTexture, material);
    const noseChain = this.chainsawPartMesh(parts.noseChain, this.chainsawTexture, material);
    const hands = this.chainsawPartMesh(parts.hands, this.chainsawTexture, material);
    topChain.setPosition(parts.pivots.topChain);
    bottomChain.setPosition(parts.pivots.bottomChain);
    noseChain.setPosition(parts.pivots.noseChain);
    hands.setPosition(parts.pivots.hands);
    root.addChild(topChain);
    root.addChild(bottomChain);
    root.addChild(noseChain);
    root.addChild(hands);
    setScale(root, -0.68, 0.68, 0.68);
    root.setInactive();
    this.scene.addMesh(root);
    this.chainsawView = {
      root,
      topChain,
      bottomChain,
      noseChain,
      hands,
      material,
      pose: chainsawPose(),
    };
  }

  /** Builds the first-person 3D textured chaingun viewmodel, its articulated 6-barrel rotary cluster, and gloved player hands/forearms. */
  buildChaingun() {
    this.chaingunPixels ??= chaingunAtlas();
    const parts = chaingunParts();
    const material = new Material({ diffuse: new Vec3(1, 1, 1) });
    const root = this.chainsawPartMesh(parts.body, this.chaingunPixels, material);
    const rotor = this.chainsawPartMesh(parts.rotor, this.chaingunPixels, material);
    const hands = this.chainsawPartMesh(parts.hands, this.chaingunPixels, material);
    rotor.setPosition(parts.pivots.rotor);
    hands.setPosition(parts.pivots.hands);
    root.addChild(rotor);
    root.addChild(hands);
    setScale(root, -0.56, 0.56, 0.56);
    root.setInactive();
    this.scene.addMesh(root);
    this.chaingunView = {
      root,
      rotor,
      hands,
      material,
      pose: chaingunPose(),
    };
  }

  /** Builds the first-person 3D textured pump-action shotgun viewmodel with sliding pump forend, gloved player arm, and ejecting shell. */
  buildShotgun() {
    this.shotgunPixels ??= shotgunAtlas();
    const parts = shotgunParts();
    const material = new Material({ diffuse: new Vec3(1, 1, 1) });
    const root = this.chainsawPartMesh(parts.body, this.shotgunPixels, material);
    const pump = this.chainsawPartMesh(parts.pump, this.shotgunPixels, material);
    const arm = this.chainsawPartMesh(parts.arm, this.shotgunPixels, material);
    const shell = this.chainsawPartMesh(parts.shell, this.shotgunPixels, material);
    pump.setPosition(parts.pivots.pump);
    arm.setPosition(parts.pivots.arm);
    shell.setPosition(parts.pivots.shell);
    root.addChild(pump);
    root.addChild(arm);
    root.addChild(shell);
    setScale(root, -0.68, 0.68, 0.68);
    root.setInactive();
    this.scene.addMesh(root);
    this.shotgunView = {
      root,
      pump,
      arm,
      shell,
      material,
      pose: shotgunPose(),
    };
  }

  /** Builds the first-person 3D textured rocket launcher viewmodel with articulated chambered warhead and gloved player hands/forearms. */
  buildRocketLauncher() {
    this.rocketLauncherPixels ??= rocketLauncherAtlas();
    const parts = rocketLauncherParts();
    const material = new Material({ diffuse: new Vec3(1, 1, 1) });
    const root = this.chainsawPartMesh(parts.body, this.rocketLauncherPixels, material);
    const warhead = this.chainsawPartMesh(parts.warhead, this.rocketLauncherPixels, material);
    const hands = this.chainsawPartMesh(parts.hands, this.rocketLauncherPixels, material);
    warhead.setPosition(parts.pivots.warhead);
    hands.setPosition(parts.pivots.hands);
    root.addChild(warhead);
    root.addChild(hands);
    setScale(root, -0.58, 0.58, 0.58);
    root.setInactive();
    this.scene.addMesh(root);
    this.rocketLauncherView = {
      root,
      warhead,
      hands,
      material,
      pose: rocketLauncherPose(),
    };
  }

  /** Builds the first-person 3D textured combat knife viewmodel held in the player's gloved right hand. */
  buildKnife() {
    this.knifePixels ??= knifeAtlas();
    const parts = knifeParts();
    const material = new Material({ diffuse: new Vec3(1, 1, 1) });
    const root = this.chainsawPartMesh(parts.body, this.knifePixels, material);
    setScale(root, -0.58, 0.58, 0.58);
    root.setInactive();
    this.scene.addMesh(root);
    this.knifeView = {
      root,
      material,
      pose: knifePose(),
    };
  }

  doorBatch(capacity, atlas, material) {
    const sharedTexture = this.sharedTexture(atlas);
    const batch = new QuadBatch(this.gl, { capacity, atlas, sharedTexture, material });
    if (sharedTexture) {
      batch.sharedAtlas = atlas;
      this.sharedTexturedMeshes.push(batch);
    }
    this.scene.addMesh(batch);
    return batch;
  }

  doorSplatBatch() {
    return this.doorBatch(BLOOD.doorSplats * 37, this.bloodTexture, this.splatMaterial());
  }

  /** The tint of blood that has landed: a little darker than what is still in the air. */
  splatMaterial() {
    return new Material({ diffuse: new Vec3(0.85, 0.85, 0.85) });
  }

  track(mesh, bucket) {
    this.scene.addMesh(mesh);
    bucket.push(mesh);
    return mesh;
  }

  discard(mesh) {
    this.scene.removeMesh(mesh);
    mesh.destroy();
  }

  // ---- level --------------------------------------------------------------

  rebuild(level) {
    for (const mesh of [...this.scene.meshes])
      this.discard(mesh);
    this.doorViews.clear();
    this.crusherViews.clear();
    this.enemyViews.clear();
    this.pickupViews.clear();
    this.cacheViews.clear();
    this.barrelViews.clear();
    this.shotViews.clear();
    this.effectViews.clear();
    this.staticMeshes = [];
    this.staticChunks = [];
    this.sharedTexturedMeshes = [];
    this.ceilingMeshes = [];
    this.crateMeshes = [];
    this.lightConesMeshes = [];
    this.skyMesh = null;
    this.slimeMesh = null;
    this.knifeView = null;
    this.chainsawView = null;
    this.chaingunView = null;
    this.shotgunView = null;
    this.rocketLauncherView = null;
    this.level = level;
    const isMars = level?.planet === 'mars';
    const skyVec = isMars ? MARS_SKY_VEC : BG_VEC;
    this.hiding.setDiffuse(skyVec);
    marsFogNearFar(level, level?.playerStart ?? scratchFog.setScalar(0, 0), this.fogNearFar);
    this.scene.setFog(skyVec, this.fogNearFar.x, this.fogNearFar.y);
    this.lightFixtures = ceilingLightFixtures(level);
    const { ambient, pointLights } = createCeilingLights(this.scene);
    ambient.setColor(isMars ? MARS_AMBIENT_COLOR : CEILING_AMBIENT_COLOR);
    this.ambientLight = ambient;
    this.ceilingLights = pointLights;
    this.buildStatic(level);
    for (const door of level.doors.values())
      this.buildDoor(door);
    for (const crusher of level.crushers)
      this.buildCrusher(crusher);

    // blood: droplets move every frame, splats are rewritten only when the game adds or drops one
    this.bloodTexture ??= bloodAtlas();
    const sharedBloodTex = this.sharedTexture(this.bloodTexture);
    this.droplets = new QuadBatch(this.gl, {
      capacity: BLOOD.particles,
      atlas: this.bloodTexture,
      sharedTexture: sharedBloodTex,
      vertex: PARTICLE_VERTEX,
      fragment: PARTICLE_FRAGMENT,
    });
    this.dust = new QuadBatch(this.gl, {
      capacity: 320,
      atlas: this.bloodTexture,
      sharedTexture: sharedBloodTex,
      material: new Material({ diffuse: MARS_DUST_TINT }),
      vertex: PARTICLE_VERTEX,
      fragment: PARTICLE_FRAGMENT,
    });
    this.explosion3dPixels ??= explosion3dAtlas();
    const sharedBoomTex = this.sharedTexture(this.explosion3dPixels);
    this.boomParticles = new QuadBatch(this.gl, {
      capacity: EXPLOSION_PARTICLE_COUNT * 12,
      atlas: this.explosion3dPixels,
      sharedTexture: sharedBoomTex,
      vertex: PARTICLE_VERTEX,
      fragment: SPARK_PARTICLE_FRAGMENT,
    });
    this.boomParticles.sharedAtlas = this.explosion3dPixels;
    this.sharedTexturedMeshes.push(this.boomParticles);
    this.splatters = new QuadBatch(this.gl, { capacity: BLOOD.floor + BLOOD.gibs + BLOOD.walls + BLOOD.ceiling + BLOOD.prints, atlas: this.bloodTexture, sharedTexture: sharedBloodTex, material: this.splatMaterial() });
    // the drips running down the walls: a stem and a drop each, redrawn while they move
    this.drips = new QuadBatch(this.gl, { capacity: BLOOD.walls * 6 * 6, atlas: this.bloodTexture, sharedTexture: sharedBloodTex, material: this.splatMaterial() });
    this.dripVersion = -1;
    this.dripsLive = false;
    // bullet holes and chainsaw marks sit on the wall behind any blood splats or drips
    this.impactPixels ??= impactAtlas();
    const sharedImpactTex = this.sharedTexture(this.impactPixels);
    this.holes = new QuadBatch(this.gl, { capacity: BLOOD.holes, atlas: this.impactPixels, sharedTexture: sharedImpactTex });
    for (const b of [this.droplets, this.dust, this.splatters, this.drips]) {
      b.sharedAtlas = this.bloodTexture;
      this.sharedTexturedMeshes.push(b);
    }
    this.holes.sharedAtlas = this.impactPixels;
    this.sharedTexturedMeshes.push(this.holes);
    this.scene.addMesh(this.holes);
    this.holesVersion = -1;
    this.scene.addMesh(this.droplets);
    this.scene.addMesh(this.dust);
    this.scene.addMesh(this.boomParticles);
    this.scene.addMesh(this.splatters);
    this.scene.addMesh(this.drips);
    this.splatVersion = -1;
    this.doorMarks = new Map();
    this.buildKnife();
    this.buildChainsaw();
    this.buildChaingun();
    this.buildShotgun();
    this.buildRocketLauncher();
  }

  /** Bullet holes on walls go in one buffer; the ones on doors are handled by syncDoorMarks. */
  syncHoles(blood) {
    const batch = this.holes.begin();
    for (const hole of blood.holes) {
      if (hole.door)
        continue;
      const quad = this.cachedQuad(hole, wallHoleQuad);
      if (quad)
        batch.quad(quad.corners, quad.uv);
    }
    batch.end();
  }

  /**
   * Holes and blood on a door sink and rise with it. The door slides down into the floor whole (see render), so the
   * marks do exactly that: they keep their size and their spacing, drop by as much as the door has dropped, and are
   * cut off where they meet the floor. They are rebuilt in world space whenever the door
   * moves or a mark is added.
   */
  syncDoorMarks(door, blood, visible = true) {
    let marks = this.doorMarks.get(door);
    if (!visible) {
      if (marks) {
        marks.holes.show(false);
        marks.splats.show(false);
      }
      return;
    }
    if (!marks) {
      marks = {
        holes: this.doorBatch(BLOOD.doorHoles, this.impactPixels),
        splats: this.doorSplatBatch(),
        open: -1,
        holesVersion: -1,
        version: -1,
      };
      this.doorMarks.set(door, marks);
    }
    const height = 1 - door.open;
    const drop = door.open * this.level.baseHeight[door.idx];
    if (height <= 0.02) {
      marks.holes.show(false);
      marks.splats.show(false);
      return;
    }
    if (marks.open === door.open && marks.holesVersion === blood.holesVersion && marks.version === blood.version && !blood.dripping) {
      marks.holes.show(true);
      marks.splats.show(true);
      return;
    }
    marks.open = door.open;
    marks.holesVersion = blood.holesVersion;
    marks.version = blood.version;

    const inset = door.secret ? 0 : DOOR_INSET;
    // stored at the height it has on a closed door; the door has dropped by `drop`
    const holes = marks.holes.begin();
    for (const mark of blood.holes) {
      if (mark.door !== door)
        continue;
      const hm = scratchHoleMark;
      hm.pos.x = mark.x - mark.nx * inset;
      hm.pos.y = mark.y - mark.ny * inset;
      hm.pos.z = mark.z - drop;
      hm.top = mark.top * height;
      hm.normal.x = mark.nx;
      hm.normal.y = mark.ny;
      hm.seed = mark.seed;
      hm.kind = mark.kind;
      hm.lo = mark.lo;
      hm.hi = mark.hi;
      hm.slope = mark.slope;
      const quad = holeQuad(hm, scratchHoleQuad);
      if (quad)
        holes.quad(quad.corners, quad.uv);
    }
    holes.end();
    const batch = marks.splats.begin();
    for (const mark of blood.walls) {
      if (mark.door !== door)
        continue;
      const sunk = scratchSplatMark;
      sunk.x = mark.x - mark.nx * inset;
      sunk.y = mark.y - mark.ny * inset;
      sunk.z = mark.z - drop;
      sunk.top = mark.top * height;
      sunk.nx = mark.nx;
      sunk.ny = mark.ny;
      sunk.size = mark.size;
      sunk.seed = mark.seed;
      sunk.age = mark.age;
      sunk.lo = mark.lo;
      sunk.hi = mark.hi;
      sunk.slope = mark.slope;
      const quad = wallSplatQuad(sunk);
      if (quad)
        batch.quad(quad.corners, quad.uv);
      const drips = wallDripQuads(sunk, this.dripTarget);
      for (let i = 0; i < drips.count; i++)
        batch.quad(drips.quads[i].corners, drips.quads[i].uv);
    }
    batch.end();
  }

  /** A sprite's four corners are worked out once per mark and kept; dissolving marks on acid update dynamically. */
  cachedQuad(item, build) {
    if (item.dissolving)
      return build(item) ?? false;
    let quad = this.splatCache.get(item);
    if (quad === undefined) {
      quad = build(item) ?? false;
      this.splatCache.set(item, quad);
    }
    return quad;
  }

  /** Droplets and gibs are squares that face the camera, so they need its right and up in the world. */
  syncParticleSprites(blood, dust = null, fog = null, effects = null) {
    const { camera } = this;
    scratchForward.subVectors(camera.target, camera.position);
    scratchRight.crossVectors(scratchForward, camera.up);
    if (scratchRight.getMagnitude(true) > 0)
      scratchRight.normalize();
    else
      scratchRight.setScalar(1, 0, 0);
    scratchUp.crossVectors(scratchRight, scratchForward);
    if (scratchUp.getMagnitude(true) > 0)
      scratchUp.normalize();
    else
      scratchUp.setScalar(0, 1, 0);
    scratchRightArr[0] = scratchRight.x;
    scratchRightArr[1] = scratchRight.y;
    scratchRightArr[2] = scratchRight.z;
    scratchUpArr[0] = scratchUp.x;
    scratchUpArr[1] = scratchUp.y;
    scratchUpArr[2] = scratchUp.z;
    scratchCam2d.setScalar(camera.position.x, camera.position.z);
    const maxParticleDist = this.cutaway ? Infinity : this.fogNearFar.y + 16;
    const maxParticleDistSq = maxParticleDist * maxParticleDist;

    const drops = this.droplets.begin();
    for (const p of blood.particles) {
      scratchEntity2d.setScalar(p.x, p.y);
      if (Number.isFinite(maxParticleDistSq) && scratchEntity2d.getDistance(scratchCam2d, true) > maxParticleDistSq)
        continue;
      if (fog && !fog.canSeeNear(scratchEntity2d))
        continue;
      const quad = particleQuad(p, scratchRightArr, scratchUpArr, p.gib ? p.age * 9 : p.age * 4 + p.vx, scratchParticleQuad);
      if (!drops.quad(quad.corners, quad.uv))
        break;
    }
    drops.end();

    if (this.dust) {
      const dustBatch = this.dust.begin();
      if (dust)
        for (const d of dust) {
          scratchEntity2d.setScalar(d.x, d.y);
          if (Number.isFinite(maxParticleDistSq) && scratchEntity2d.getDistance(scratchCam2d, true) > maxParticleDistSq)
            continue;
          if (fog && !fog.canSeeNear(scratchEntity2d))
            continue;
          const quad = particleQuad(d, scratchRightArr, scratchUpArr, d.age * 6 + d.vx * 0.02, scratchParticleQuad);
          if (!dustBatch.quad(quad.corners, quad.uv))
            break;
        }
      dustBatch.end();
    }

    if (this.boomParticles) {
      const boomBatch = this.boomParticles.begin();
      if (effects) {
        const maxBoomDist = this.cutaway ? Infinity : this.fogNearFar.y + 96;
        const maxBoomDistSq = maxBoomDist * maxBoomDist;
        for (const effect of effects) {
          if (effect.type !== 'boom')
            continue;
          scratchEntity2d.setScalar(effect.x, effect.y);
          if (Number.isFinite(maxBoomDistSq) && scratchEntity2d.getDistance(scratchCam2d, true) > maxBoomDistSq)
            continue;
          if (fog && !fog.canSeeNear(scratchEntity2d, 2))
            continue;
          const quads = explosionParticleQuads(effect, scratchRight, scratchUp);
          let full = false;
          for (let i = 0; i < quads.length; i++)
            if (!boomBatch.quad(quads[i].corners, quads[i].uv)) {
              full = true;
              break;
            }
          if (full)
            break;
        }
      }
      boomBatch.end();
    }
  }

  syncSplatSprites(blood) {
    const batch = this.splatters.begin();
    const add = (quad) => quad && batch.quad(quad.corners, quad.uv);
    for (const splat of blood.floor)
      add(this.cachedQuad(splat, floorSplatQuad));
    for (const gib of blood.gibs)
      add(this.cachedQuad(gib, floorGibQuad));
    for (const splat of blood.walls)
      if (!splat.door)
        add(this.cachedQuad(splat, wallSplatQuad));
    for (const splat of blood.ceiling)
      add(this.cachedQuad(splat, floorSplatQuad));
    for (const print of blood.prints)
      add(this.cachedQuad(print, printQuad));
    batch.end();
  }

  /** The drips of every splat on a wall: running ones are redrawn every frame, finished ones are kept as they ended. */
  syncDrips(blood) {
    const batch = this.drips.begin();
    for (const splat of blood.walls) {
      if (splat.door)
        continue;
      if (splat.age >= splat.dripTime) {
        let quads = this.dripCache.get(splat);
        if (!quads) {
          quads = wallDripQuads(splat);
          this.dripCache.set(splat, quads);
        }
        for (const drip of quads)
          batch.quad(drip.corners, drip.uv);
      } else {
        const drips = wallDripQuads(splat, this.dripTarget);
        for (let i = 0; i < drips.count; i++)
          batch.quad(drips.quads[i].corners, drips.quads[i].uv);
      }
    }
    batch.end();
  }

  syncBlood(blood, dust = null, fog = null, effects = null) {
    this.syncParticleSprites(blood, dust, fog, effects);

    if (blood.holesVersion !== this.holesVersion) {
      this.holesVersion = blood.holesVersion;
      this.syncHoles(blood);
    }

    if (blood.dripping || this.dripsLive || blood.version !== this.dripVersion) {
      this.dripVersion = blood.version;
      // one more pass after the last drip stops, so it is drawn where it ended
      this.dripsLive = blood.dripping;
      this.syncDrips(blood);
    }

    if (blood.version === this.splatVersion)
      return;
    this.splatVersion = blood.version;
    this.syncSplatSprites(blood);
  }

  /** One outline quad per flat wall face; the hiding faces sit just behind them. */
  buildStatic(level) {
    const { width, rowCount, kind, baseHeight, faceIds } = level;
    const groups = new Map();

    for (let idx = 0; idx < kind.length; idx++) {
      if (!kind[idx] || kind[idx] === DOOR)
        continue;
      const x = idx % width;
      const y = (idx - x) / width;
      for (let d = 0; d < 4; d++) {
        const id = faceIds[idx * 4 + d];
        if (!id)
          continue;
        const nx = x + (d === 0 ? -1 : d === 1 ? 1 : 0);
        const ny = y + (d === 2 ? -1 : d === 3 ? 1 : 0);
        const nidx = ny * width + nx;
        const base = level.inBounds(nx, ny) && kind[nidx] !== DOOR && kind[nidx] !== PILLAR && level.hasCardinalFace(nidx, d ^ 1) ? baseHeight[nidx] : 0;
        const along = d < 2 ? y : x;
        const group = groups.get(id) ?? { d, kind: kind[idx], top: Math.min(baseHeight[idx], ROOF), base: Math.min(base, ROOF), x, y, from: along, to: along };
        group.from = Math.min(group.from, along);
        group.to = Math.max(group.to, along);
        groups.set(id, group);
      }
    }

    const faces = [];
    const outdoorFaces = [];
    const hide = [];
    const isMars = level.planet === 'mars';
    const solid = (x, y) => level.inBounds(x, y) && (kind[y * width + x] === WALL || kind[y * width + x] === EXIT);
    for (const group of groups.values()) {
      const { d, top, base } = group;
      const axis = d < 2 ? 'x' : 'z';
      const plane = (d === 0 ? group.x : d === 1 ? group.x + 1 : d === 2 ? group.y : group.y + 1) * TILE;
      const a0 = group.from * TILE;
      const a1 = (group.to + 1) * TILE;
      const inward = d === 0 || d === 2 ? 0.9 : -0.9;
      const offset = axis === 'x' ? new Vec3(inward, 0, 0) : new Vec3(0, 0, inward);
      const nx = group.x + (d === 0 ? -1 : d === 1 ? 1 : 0);
      const ny = group.y + (d === 2 ? -1 : d === 3 ? 1 : 0);

      // the hiding faces run a little past interior (concave) corners so two of them meeting overlap and leave no crack,
      // while stopping flush at exterior corners and door jambs so they never protrude in front of adjacent walls
      const lap0 = (d < 2 ? solid(nx, group.from - 1) : solid(group.from - 1, ny)) ? 1.2 : 0;
      const lap1 = (d < 2 ? solid(nx, group.to + 1) : solid(group.to + 1, ny)) ? 1.2 : 0;
      const lap = (y0, y1) => axis === 'x'
        ? faceCorners(axis, new Vec3(plane, y0, a0 - lap0), new Vec3(plane, y1, a1 + lap1))
        : faceCorners(axis, new Vec3(a0 - lap0, y0, plane), new Vec3(a1 + lap1, y1, plane));
      if (group.kind !== PILLAR)
        hide.push(...quadTriangles(lap(base === 0 ? WALL_FLOOR_Y : base, top), offset));
      // the wall carries on up to the roof, without being drawn; a low pillar does not, it has sky above,
      // and nor does a face looking into the giant's room, which is open to the sky
      const roofless = level.arena?.has(ny * width + nx);
      const toRoof = group.kind !== PILLAR && top < ROOF && !roofless;
      if (toRoof)
        hide.push(...quadTriangles(lap(top, ROOF), offset));
      // the textured wall goes right up to the ceiling, so there is no gap between them;
      // low cover tiles ('o' / PILLAR) are rendered as 3D futuristic crates or Martian boulders instead of flat half-walls
      if (group.kind !== PILLAR) {
        for (let a = group.from; a <= group.to; a++) {
          const adjX = d < 2 ? nx : a;
          const adjY = d < 2 ? a : ny;
          const adjIdx = adjY * width + adjX;
          const tileRoofless = level.arena?.has(adjIdx);
          const tileToRoof = top < ROOF && !tileRoofless;
          const quads = wallFaceQuads({ axis, plane, from: a, to: a, base, top: tileToRoof ? ROOF : top, x: group.x, y: group.y, d, exit: group.kind === EXIT });
          if (base === 0)
            sinkToFloor(quads);
          if (isMars && !level.isIndoorTile(adjIdx))
            outdoorFaces.push(...quads);
          else
            faces.push(...quads);
        }
      }
    }

    for (let idx = 0; idx < kind.length; idx++) {
      const df = level.diagInfo(idx);
      if (!df)
        continue;
      const top = Math.min(baseHeight[idx], ROOF);
      const tx = (df.b.x - df.a.x) / TILE;
      const ty = (df.b.y - df.a.y) / TILE;
      const offset = new Vec3(-df.normal.x * 0.9, 0, -df.normal.y * 0.9);
      const lap = (y0, y1) => [
        new Vec3(df.a.x - tx * 1.2, y0, df.a.y - ty * 1.2),
        new Vec3(df.b.x + tx * 1.2, y0, df.b.y + ty * 1.2),
        new Vec3(df.b.x + tx * 1.2, y1, df.b.y + ty * 1.2),
        new Vec3(df.a.x - tx * 1.2, y1, df.a.y - ty * 1.2),
      ];
      hide.push(...quadTriangles(lap(WALL_FLOOR_Y, top), offset));
      const roofless = level.arena?.has(idx);
      const toRoof = kind[idx] !== PILLAR && top < ROOF && !roofless;
      if (toRoof)
        hide.push(...quadTriangles(lap(top, ROOF), offset));
      const quads = diagWallFaceQuads({ ax: df.a.x, ay: df.a.y, bx: df.b.x, by: df.b.y, base: 0, top: toRoof ? ROOF : top, x: df.x, y: df.y, diag: df.diag, exit: kind[idx] === EXIT });
      sinkToFloor(quads);
      if (isMars && !level.isIndoorTile(idx))
        outdoorFaces.push(...quads);
      else
        faces.push(...quads);
    }

    // a doorway has no wall of its own, so its two open ends get a lintel from the door's height up to the roof
    for (const door of level.doors.values()) {
      const { x, y } = door;
      const top = Math.min(baseHeight[door.idx], ROOF);
      if (top >= ROOF)
        continue;
      const alongY = solid(x - 1, y) && solid(x + 1, y);
      for (const end of [0, 1]) {
        // an end that opens onto the giant's room gets no lintel
        const outX = alongY ? x : x + (end ? 1 : -1);
        const outY = alongY ? y + (end ? 1 : -1) : y;
        if (level.arena?.has(outY * width + outX))
          continue;
        const inset = end ? -0.9 : 0.9;
        const corners = alongY
          ? faceCorners('z', new Vec3(x * TILE, top, (y + end) * TILE), new Vec3((x + 1) * TILE, ROOF, (y + end) * TILE))
          : faceCorners('x', new Vec3((x + end) * TILE, top, y * TILE), new Vec3((x + end) * TILE, ROOF, (y + 1) * TILE));
        hide.push(...quadTriangles(corners, alongY ? new Vec3(0, 0, inset) : new Vec3(inset, 0, 0)));
        // and the lintel is textured wall as well
        const quads = wallFaceQuads(alongY
          ? { axis: 'z', plane: (y + end) * TILE, from: x, to: x, base: top, top: ROOF, x, y, d: 2 + end, exit: false }
          : { axis: 'x', plane: (x + end) * TILE, from: y, to: y, base: top, top: ROOF, x, y, d: end, exit: false });
        if (isMars && !level.isIndoorTile(outY * width + outX))
          outdoorFaces.push(...quads);
        else
          faces.push(...quads);
      }
    }

    // Close the exposed edges below the deck, including walls adjoining a pit.
    for (let ty = 0; ty < rowCount; ty++)
      for (let tx = 0; tx < width; tx++) {
        if (!level.slime[ty * width + tx])
          continue;
        for (let d = 0; d < 4; d++) {
          const nx = tx + (d === 0 ? -1 : d === 1 ? 1 : 0);
          const ny = ty + (d === 2 ? -1 : d === 3 ? 1 : 0);
          if (level.inBounds(nx, ny) && level.slime[ny * width + nx])
            continue;
          const axis = d < 2 ? 'x' : 'z';
          const plane = (d < 2 ? tx + (d === 1 ? 1 : 0) : ty + (d === 3 ? 1 : 0)) * TILE;
          const along = (d < 2 ? ty : tx) * TILE;
          hide.push(...quadTriangles(axis === 'x'
            ? faceCorners(axis, new Vec3(plane, -ACID_PIT_DEPTH - 0.35, along), new Vec3(plane, -0.2, along + TILE))
            : faceCorners(axis, new Vec3(along, -ACID_PIT_DEPTH - 0.35, plane), new Vec3(along + TILE, -0.2, plane))));
        }
      }

    // and the ceiling closes the roof over everything
    // (except over the giant's room or outdoor Martian terrain: one strip of ceiling per row, with a gap wherever open to the sky)
    const roofHide = [];
    for (let y = 0; y < rowCount; y++) {
      let start = 0;
      for (let x = 0; x <= width; x++) {
        const idx = y * width + x;
        const roofed = x < width && (isMars ? level.isIndoorTile(idx) : !level.arena?.has(idx));
        if (roofed)
          continue;
        if (x > start)
          roofHide.push(...quadTriangles([new Vec3(start * TILE, ROOF, y * TILE), new Vec3(x * TILE, ROOF, y * TILE), new Vec3(x * TILE, ROOF, (y + 1) * TILE), new Vec3(start * TILE, ROOF, (y + 1) * TILE)]));
        start = x + 1;
      }
    }

    // low tiles can be seen from above: close their tops so the floor grid cannot show through
    const wallTops = [];
    for (let idx = 0; idx < kind.length; idx++) {
      if (!kind[idx] || kind[idx] === DOOR)
        continue;
      const x = idx % width;
      const y = (idx - x) / width;
      const df = level.diagInfo(idx);
      if (baseHeight[idx] >= EYE + 8) {
        const top = ROOF - 0.25;
        const corners = df
          ? [df.s.x, top, df.s.y, df.a.x, top, df.a.y, df.b.x, top, df.b.y, df.s.x, top, df.s.y]
          : [x * TILE, top, y * TILE, (x + 1) * TILE, top, y * TILE, (x + 1) * TILE, top, (y + 1) * TILE, x * TILE, top, (y + 1) * TILE];
        wallTops.push({ corners, uv: wallCellUv(WALL_CELLS.top) });
        continue;
      }
      const h = baseHeight[idx] - 0.9;
      const top = baseHeight[idx] - 0.3;
      const corners = df
        ? [df.s.x, top, df.s.y, df.a.x, top, df.a.y, df.b.x, top, df.b.y, df.s.x, top, df.s.y]
        : [x * TILE, top, y * TILE, (x + 1) * TILE, top, y * TILE, (x + 1) * TILE, top, (y + 1) * TILE, x * TILE, top, (y + 1) * TILE];
      if (kind[idx] !== PILLAR) {
        if (isMars && !level.indoor?.has(idx))
          outdoorFaces.push({ corners, uv: wallCellUv(WALL_CELLS.top) });
        else
          faces.push({ corners, uv: wallCellUv(WALL_CELLS.top) });
        if (df)
          hide.push(df.s.x, h, df.s.y, df.a.x, h, df.a.y, df.b.x, h, df.b.y);
        else
          hide.push(
            x * TILE, h, y * TILE, (x + 1) * TILE, h, y * TILE, (x + 1) * TILE, h, (y + 1) * TILE,
            x * TILE, h, y * TILE, (x + 1) * TILE, h, (y + 1) * TILE, x * TILE, h, (y + 1) * TILE
          );
      }
    }

    this.staticChunks = [];
    const sectorWorldSize = SECTOR_TILES * TILE;
    const sectorGrid = new Grid(new Vec2((width + SECTOR_TILES) * TILE, (rowCount + SECTOR_TILES) * TILE), sectorWorldSize);
    this.skyMesh = isMars ? this.track(this.marsSkyBatch(), this.staticMeshes) : null;
    // Register opaque wall occluders first so Early-Z rejects distant floor, dirt, crate, boulder, and ceiling fragments behind walls
    const wallSectors = partitionQuadsBySector(faces, sectorGrid, sectorWorldSize, width, rowCount);
    if (wallSectors.length)
      for (const sec of wallSectors)
        registerStaticChunk(this.staticChunks, this.track(this.wallBatch(sec.faces, false), this.staticMeshes), sec.center, sec.radius, false, sec.bounds);
    else
      this.track(this.wallBatch(faces, false), this.staticMeshes);
    if (outdoorFaces.length)
      for (const sec of partitionQuadsBySector(outdoorFaces, sectorGrid, sectorWorldSize, width, rowCount))
        registerStaticChunk(this.staticChunks, this.track(this.wallBatch(sec.faces, true), this.staticMeshes), sec.center, sec.radius, false, sec.bounds);
    const hideSectors = partitionTrianglesBySector(hide, sectorGrid, sectorWorldSize, width, rowCount);
    if (hideSectors.length)
      for (const sec of hideSectors)
        registerStaticChunk(this.staticChunks, this.track(this.solid(sec.vertices), this.staticMeshes), sec.center, sec.radius, false, sec.bounds);
    else
      this.track(this.solid(hide), this.staticMeshes);
    this.roofSolidMesh = roofHide.length ? this.track(this.solid(roofHide), this.staticMeshes) : null;
    this.wallTopsMesh = wallTops.length ? this.track(this.wallBatch(wallTops, isMars), this.staticMeshes) : null;
    if (this.wallTopsMesh)
      this.wallTopsMesh.setInactive();

    const floorSectors = [];
    const dirtSectors = [];
    const crateSectors = [];
    const boulderSectors = [];
    const ceilingSectors = [];
    for (let sy = 0; sy < rowCount; sy += SECTOR_TILES)
      for (let sx = 0; sx < width; sx += SECTOR_TILES) {
        const x0 = sx;
        const y0 = sy;
        const x1 = Math.min(width, sx + SECTOR_TILES);
        const y1 = Math.min(rowCount, sy + SECTOR_TILES);
        let hasFloor = false;
        let hasDirt = false;
        let hasCrate = false;
        let hasBoulder = false;
        let hasCeiling = false;
        for (let ty = y0; ty < y1; ty++)
          for (let tx = x0; tx < x1; tx++) {
            const idx = ty * width + tx;
            const k = kind[idx];
            const walkable = k === FLOOR || k === DOOR || k === PILLAR || level.diag[idx] > 0;
            if (walkable && !level.slime[idx] && !level.teleporter?.[idx]) {
              if (isMars && !level.isIndoorTile(idx))
                hasDirt = true;
              else
                hasFloor = true;
            }
            if (k === PILLAR) {
              if (isMars && !level.indoor?.has(idx))
                hasBoulder = true;
              else
                hasCrate = true;
            }
            if (walkable && !level.arena?.has(idx))
              hasCeiling = true;
          }
        const center = new Vec2(((x0 + x1) * 0.5) * TILE, ((y0 + y1) * 0.5) * TILE);
        const radius = scratchCam2d.setScalar(x1 - x0, y1 - y0).getMagnitude() * TILE * 0.55;
        const bounds = makeSectorBounds(x0, y0, width, rowCount);
        const sec = { x0, y0, x1, y1, center, radius, bounds };
        if (hasFloor)
          floorSectors.push(sec);
        if (hasDirt)
          dirtSectors.push(sec);
        if (hasCrate)
          crateSectors.push(sec);
        if (hasBoulder)
          boulderSectors.push(sec);
        if (hasCeiling)
          ceilingSectors.push(sec);
      }

    if (floorSectors.length)
      for (const sec of floorSectors)
        registerStaticChunk(this.staticChunks, this.track(this.floorBatch(level, sec), this.staticMeshes), sec.center, sec.radius, false, sec.bounds);
    else
      this.track(this.floorBatch(level), this.staticMeshes);
    if (isMars) {
      if (dirtSectors.length)
        for (const sec of dirtSectors)
          registerStaticChunk(this.staticChunks, this.track(this.marsDirtBatch(level, sec), this.staticMeshes), sec.center, sec.radius, false, sec.bounds);
      else
        this.track(this.marsDirtBatch(level), this.staticMeshes);
    }
    this.slimeMesh = this.track(this.slimeBatch(level), this.staticMeshes);
    this.teleporterMesh = this.track(this.teleporterBatch(level), this.staticMeshes);
    this.crateMeshes = [];
    if (crateSectors.length)
      for (const sec of crateSectors) {
        const mesh = registerStaticChunk(this.staticChunks, this.track(this.crateBatch(level, sec), this.staticMeshes), sec.center, sec.radius, false, sec.bounds);
        this.crateMeshes.push(mesh);
      }
    else
      this.crateMeshes.push(this.track(this.crateBatch(level), this.staticMeshes));
    this.crateMesh = this.crateMeshes[0] ?? null;
    if (isMars) {
      if (boulderSectors.length)
        for (const sec of boulderSectors)
          this.marsBoulderMesh = registerStaticChunk(this.staticChunks, this.track(this.marsBoulderBatch(level, sec), this.staticMeshes), sec.center, sec.radius, false, sec.bounds);
      else
        this.marsBoulderMesh = this.track(this.marsBoulderBatch(level), this.staticMeshes);
    }
    this.ceilingMeshes = [];
    if (ceilingSectors.length)
      for (const sec of ceilingSectors) {
        const mesh = registerStaticChunk(this.staticChunks, this.track(this.ceilingBatch(level, sec), this.staticMeshes), sec.center, sec.radius, true, sec.bounds);
        this.ceilingMeshes.push(mesh);
      }
    else
      this.ceilingMeshes.push(this.track(this.ceilingBatch(level), this.staticMeshes));
    this.ceilingMesh = this.ceilingMeshes[0] ?? null;

    this.lightConesMeshes = [];
    if (this.lightFixtures.length) {
      const coneBuckets = new Map();
      for (const f of this.lightFixtures) {
        scratchEntity2d.setScalar(Math.max(0, f.position.x), Math.max(0, f.position.z));
        const key = sectorGrid.getCell(scratchEntity2d);
        let bucket = coneBuckets.get(key);
        if (!bucket) {
          sectorGrid.getCellCoords(key, scratchFog);
          bucket = {
            fixtures: [],
            center: new Vec2((scratchFog.x + 0.5) * sectorWorldSize, (scratchFog.y + 0.5) * sectorWorldSize),
            radius: sectorWorldSize * 0.85,
            bounds: makeSectorBounds(scratchFog.x * SECTOR_TILES, scratchFog.y * SECTOR_TILES, width, rowCount),
          };
          coneBuckets.set(key, bucket);
        }
        bucket.fixtures.push(f);
      }
      for (const bucket of coneBuckets.values()) {
        const mesh = registerStaticChunk(this.staticChunks, this.track(this.lightConesBatch(bucket.fixtures), this.staticMeshes), bucket.center, bucket.radius, true, bucket.bounds);
        this.lightConesMeshes.push(mesh);
      }
    }
    this.lightConesMesh = this.lightConesMeshes[0] ?? null;
    if (this.cutaway)
      this.setCutaway(true, this.cutawayNearFar);
  }

  /** Camera-centered 360° Martian sky cylinder/dome with twin moons, hazy sun, distant canyon ranges, and drifting dust-storm clouds. */
  marsSkyBatch() {
    const { gl } = this;
    this.marsSkyPixels ??= marsSkyAtlas({ includeMoons: false });
    const { vertices, uvs } = marsSkyMesh(new Vec2(1200, 720));
    const geometry = new CustomMesh();
    geometry.vertices = vertices;
    geometry.uvs = uvs;
    geometry.setPrimitive('TRIANGLES');
    const mesh = new Mesh(gl, geometry);
    mesh.addProgram(MARS_SKY_VERTEX, MARS_SKY_FRAGMENT, new Material({ diffuse: new Vec3(1, 1, 1) }));
    this.bindAtlasTexture(mesh, this.marsSkyPixels, {
      flipY: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.REPEAT,
      wrapT: gl.CLAMP_TO_EDGE,
    });
    mesh.addCustomUniform('time', 'uniform1f', 0);
    mesh.setDepthWrite(false);
    return mesh;
  }

  /** Soft translucent volumetric light cones hanging under every ceiling light fixture, drawn with additive blending. */
  lightConesBatch(fixtures) {
    const { vertices, uvs } = ceilingLightCones(fixtures);
    const geometry = new CustomMesh();
    geometry.vertices = vertices;
    geometry.uvs = uvs;
    geometry.setPrimitive('TRIANGLES');
    const mesh = new Mesh(this.gl, geometry);
    mesh.addProgram(CEILING_CONE_VERTEX, CEILING_CONE_FRAGMENT, new Material({ diffuse: new Vec3(0.76, 0.88, 1.0) }));
    mesh.setBlend('ONE', 'ONE');
    mesh.setDepthWrite(false);
    return mesh;
  }

  /** The ceiling: one quad over every tile you can stand on or see over, except the giant's room, which is open to the sky. */
  ceilingBatch(level, bounds = null) {
    const { gl } = this;
    this.ceilingPixels ??= ceilingAtlas();
    const x0Bound = bounds ? bounds.x0 : 0;
    const y0Bound = bounds ? bounds.y0 : 0;
    const x1Bound = bounds ? bounds.x1 : level.width;
    const y1Bound = bounds ? bounds.y1 : level.rowCount;
    const texOpts = { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST };
    const sharedTexture = this.sharedTexture(this.ceilingPixels, texOpts);
    const batch = new QuadBatch(gl, {
      capacity: Math.max(1, (x1Bound - x0Bound) * (y1Bound - y0Bound)),
      atlas: this.ceilingPixels,
      sharedTexture,
      vertex: FLOOR_VERTEX,
      fragment: CEILING_FRAGMENT,
      textureOptions: texOpts,
    });
    if (sharedTexture) {
      batch.sharedAtlas = this.ceilingPixels;
      batch.sharedTexOptions = texOpts;
      this.sharedTexturedMeshes.push(batch);
    }
    // just under the invisible roof, so the roof never hides it
    const y = ROOF - 1.2;
    batch.begin();
    for (let ty = y0Bound; ty < y1Bound; ty++) {
      for (let tx = x0Bound; tx < x1Bound; tx++) {
        const idx = ty * level.width + tx;
        if ((level.kind[idx] !== FLOOR && level.kind[idx] !== DOOR && level.kind[idx] !== PILLAR && !level.diag[idx]) || level.arena?.has(idx))
          continue;
        const x0 = tx * TILE;
        const z0 = ty * TILE;
        batch.quad([x0, y, z0 + TILE, x0 + TILE, y, z0 + TILE, x0 + TILE, y, z0, x0, y, z0], ceilingCellUv(ceilingCellFor(tx, ty)));
      }
    }
    return batch.end();
  }

  /** The faces of the walls, one quad per tile and per 64 units up, in one mesh: steel bulkheads indoors or craggy rock cliffs on Mars. */
  wallBatch(faces, marsRock = false) {
    const { gl } = this;
    if (marsRock)
      this.marsRockPixels ??= marsRockAtlas();
    else
      this.wallPixels ??= wallAtlas();
    const atlas = marsRock ? this.marsRockPixels : this.wallPixels;
    const texOpts = marsRock
      ? { minFilter: gl.NEAREST, magFilter: gl.NEAREST }
      : { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST };
    const sharedTexture = this.sharedTexture(atlas, texOpts);
    const batch = new QuadBatch(gl, {
      capacity: Math.max(1, faces.length),
      atlas,
      sharedTexture,
      material: new Material({ diffuse: new Vec3(1, 1, 1) }),
      // the rust of the doors: many small patches, thicker low down, worked out on the wall itself
      vertex: WALL_VERTEX,
      fragment: marsRock ? MARS_ROCK_FRAGMENT : WALL_FRAGMENT,
      textureOptions: texOpts,
    });
    if (sharedTexture) {
      batch.sharedAtlas = atlas;
      batch.sharedTexOptions = texOpts;
      this.sharedTexturedMeshes.push(batch);
    }
    batch.begin();
    for (const face of faces)
      batch.quad(face.corners, face.uv);
    return batch.end();
  }

  /** One quad per walkable indoor tile, each showing one of the steel deck's patterns, drawn as a single mesh. */
  floorBatch(level, bounds = null) {
    const { gl } = this;
    this.floorPixels ??= floorAtlas();
    const isMars = level?.planet === 'mars';
    const x0Bound = bounds ? bounds.x0 : 0;
    const y0Bound = bounds ? bounds.y0 : 0;
    const x1Bound = bounds ? bounds.x1 : level.width;
    const y1Bound = bounds ? bounds.y1 : level.rowCount;
    const texOpts = { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST };
    const sharedTexture = this.sharedTexture(this.floorPixels, texOpts);
    const batch = new QuadBatch(gl, {
      capacity: Math.max(1, (x1Bound - x0Bound) * (y1Bound - y0Bound)),
      atlas: this.floorPixels,
      sharedTexture,
      material: new Material({ diffuse: new Vec3(1, 1, 1) }),
      // rust is worked out in the shader, from where each pixel is in the world, so it carries on across tiles
      vertex: FLOOR_VERTEX,
      fragment: FLOOR_FRAGMENT,
      // mipmaps keep the far floor from shimmering; close up the texels stay crisp
      textureOptions: texOpts,
    });
    if (sharedTexture) {
      batch.sharedAtlas = this.floorPixels;
      batch.sharedTexOptions = texOpts;
      this.sharedTexturedMeshes.push(batch);
    }
    // just under the blood, so it sits on the floor
    const y = -0.2;
    batch.begin();
    for (let ty = y0Bound; ty < y1Bound; ty++)
      for (let tx = x0Bound; tx < x1Bound; tx++) {
        const idx = ty * level.width + tx;
        const kind = level.kind[idx];
        if ((kind !== FLOOR && kind !== DOOR && kind !== PILLAR && !level.diag[idx]) || level.slime[idx] || level.teleporter?.[idx])
          continue;
        if (isMars && !level.isIndoorTile(idx))
          continue;
        const x0 = tx * TILE;
        const x1 = x0 + TILE;
        const z0 = ty * TILE;
        const z1 = z0 + TILE;
        batch.quad([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0], floorCellUv(floorCellFor(tx, ty, kind === DOOR && !level.doors.get(idx)?.secret)));
      }
    return batch.end();
  }

  /** Outdoor Martian dirt, wind-rippled sand dunes, craters, and basalt gravel floor tiles on `planet: 'mars'`. */
  marsDirtBatch(level, bounds = null) {
    const { gl } = this;
    this.marsDirtPixels ??= marsDirtAtlas();
    const x0Bound = bounds ? bounds.x0 : 0;
    const y0Bound = bounds ? bounds.y0 : 0;
    const x1Bound = bounds ? bounds.x1 : level.width;
    const y1Bound = bounds ? bounds.y1 : level.rowCount;
    const texOpts = { minFilter: gl.NEAREST, magFilter: gl.NEAREST };
    const sharedTexture = this.sharedTexture(this.marsDirtPixels, texOpts);
    const batch = new QuadBatch(gl, {
      capacity: Math.max(1, (x1Bound - x0Bound) * (y1Bound - y0Bound)),
      atlas: this.marsDirtPixels,
      sharedTexture,
      material: new Material({ diffuse: new Vec3(1, 1, 1) }),
      vertex: FLOOR_VERTEX,
      fragment: MARS_DIRT_FRAGMENT,
      textureOptions: texOpts,
    });
    if (sharedTexture) {
      batch.sharedAtlas = this.marsDirtPixels;
      batch.sharedTexOptions = texOpts;
      this.sharedTexturedMeshes.push(batch);
    }
    const y = -0.2;
    batch.begin();
    for (let ty = y0Bound; ty < y1Bound; ty++)
      for (let tx = x0Bound; tx < x1Bound; tx++) {
        const idx = ty * level.width + tx;
        const kind = level.kind[idx];
        if ((kind !== FLOOR && kind !== DOOR && kind !== PILLAR && !level.diag[idx]) || level.slime[idx] || level.teleporter?.[idx])
          continue;
        if (level.isIndoorTile(idx))
          continue;
        const x0 = tx * TILE;
        const x1 = x0 + TILE;
        const z0 = ty * TILE;
        const z1 = z0 + TILE;
        batch.quad([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0], floorCellUv(floorCellFor(tx, ty, false)));
      }
    return batch.end();
  }

  /** Radioactive slime floor tiles: glowing, churning green nukage vats and channels. */
  slimeBatch(level) {
    const { gl } = this;
    this.slimePixels ??= slimeAtlas();
    const texOpts = { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST, wrapS: gl.REPEAT, wrapT: gl.REPEAT };
    const sharedTexture = this.sharedTexture(this.slimePixels, texOpts);
    const batch = new QuadBatch(gl, {
      capacity: Math.max(1, level.width * level.rowCount),
      atlas: this.slimePixels,
      sharedTexture,
      vertex: FLOOR_VERTEX,
      fragment: SLIME_FRAGMENT,
      textureOptions: texOpts,
    });
    if (sharedTexture) {
      batch.sharedAtlas = this.slimePixels;
      batch.sharedTexOptions = texOpts;
      this.sharedTexturedMeshes.push(batch);
    }
    batch.addCustomUniform('time', 'uniform1f', 0);
    const y = -ACID_PIT_DEPTH - 0.35;
    batch.begin();
    for (let ty = 0; ty < level.rowCount; ty++)
      for (let tx = 0; tx < level.width; tx++) {
        const idx = ty * level.width + tx;
        if (!level.slime[idx])
          continue;
        const x0 = tx * TILE;
        const x1 = x0 + TILE;
        const z0 = ty * TILE;
        const z1 = z0 + TILE;
        batch.quad([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0], [0, 0, 1, 1]);
      }
    return batch.end();
  }

  /** Futuristic 3D quantum teleporter machines ('T'): stepped emitter pedestal, four corner field pylons, and overhead ceiling ring. */
  teleporterBatch(level) {
    const { gl } = this;
    this.teleporterPixels ??= teleporterAtlas();
    const allQuads = [];
    const center = new Vec3();
    const size = new Vec2();
    const baseY = -0.18;
    for (let ty = 0; ty < level.rowCount; ty++)
      for (let tx = 0; tx < level.width; tx++) {
        const idx = ty * level.width + tx;
        if (!level.teleporter?.[idx])
          continue;
        center.setScalar((tx + 0.5) * TILE, baseY, (ty + 0.5) * TILE);
        size.setScalar(TILE, level.arena?.has(idx) ? 0 : ROOF - 1.2);
        const machineQuads = teleporterMachineQuads(center, size);
        for (const q of machineQuads)
          allQuads.push(q);
      }
    const texOpts = { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST };
    const sharedTexture = this.sharedTexture(this.teleporterPixels, texOpts);
    const batch = new QuadBatch(gl, {
      capacity: Math.max(1, allQuads.length),
      atlas: this.teleporterPixels,
      sharedTexture,
      vertex: FLOOR_VERTEX,
      fragment: TELEPORTER_FRAGMENT,
      textureOptions: texOpts,
    });
    if (sharedTexture) {
      batch.sharedAtlas = this.teleporterPixels;
      batch.sharedTexOptions = texOpts;
      this.sharedTexturedMeshes.push(batch);
    }
    batch.addCustomUniform('time', 'uniform1f', 0);
    batch.begin();
    for (const q of allQuads)
      batch.quad(q.corners, q.uv);
    return batch.end();
  }

  /** Futuristic 3D UAC armored cover crates ('o' / PILLAR): skid plinth, recessed diagonal-braced cargo bay, corner bumpers, and locking clamps. */
  crateBatch(level, bounds = null) {
    const { gl } = this;
    this.cratePixels ??= crateAtlas();
    const isMars = level?.planet === 'mars';
    const x0Bound = bounds ? bounds.x0 : 0;
    const y0Bound = bounds ? bounds.y0 : 0;
    const x1Bound = bounds ? bounds.x1 : level.width;
    const y1Bound = bounds ? bounds.y1 : level.rowCount;
    const allQuads = [];
    const center = new Vec3();
    const size = new Vec2();
    const baseY = -0.18;
    for (let ty = y0Bound; ty < y1Bound; ty++) {
      for (let tx = x0Bound; tx < x1Bound; tx++) {
        const idx = ty * level.width + tx;
        if (level.kind[idx] !== PILLAR)
          continue;
        if (isMars && !level.indoor?.has(idx))
          continue;
        center.setScalar((tx + 0.5) * TILE, baseY, (ty + 0.5) * TILE);
        size.setScalar(TILE, level.baseHeight[idx]);
        const quads = crateQuads(center, size);
        for (const q of quads)
          allQuads.push(q);
      }
    }
    const texOpts = { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST };
    const sharedTexture = this.sharedTexture(this.cratePixels, texOpts);
    const batch = new QuadBatch(gl, {
      capacity: Math.max(1, allQuads.length),
      atlas: this.cratePixels,
      sharedTexture,
      vertex: FLOOR_VERTEX,
      fragment: CRATE_FRAGMENT,
      textureOptions: texOpts,
    });
    if (sharedTexture) {
      batch.sharedAtlas = this.cratePixels;
      batch.sharedTexOptions = texOpts;
      this.sharedTexturedMeshes.push(batch);
    }
    batch.addCustomUniform('time', 'uniform1f', 0);
    batch.begin();
    for (const q of allQuads)
      batch.quad(q.corners, q.uv);
    return batch.end();
  }

  /** Jagged multi-tiered Martian rock boulder formations ('o' / PILLAR outdoors on `planet: 'mars'`). */
  marsBoulderBatch(level, bounds = null) {
    const { gl } = this;
    this.marsBoulderPixels ??= marsBoulderAtlas();
    const x0Bound = bounds ? bounds.x0 : 0;
    const y0Bound = bounds ? bounds.y0 : 0;
    const x1Bound = bounds ? bounds.x1 : level.width;
    const y1Bound = bounds ? bounds.y1 : level.rowCount;
    const allQuads = [];
    const center = new Vec3();
    const size = new Vec2();
    const baseY = -0.18;
    for (let ty = y0Bound; ty < y1Bound; ty++)
      for (let tx = x0Bound; tx < x1Bound; tx++) {
        const idx = ty * level.width + tx;
        if (level.kind[idx] !== PILLAR || level.indoor?.has(idx))
          continue;
        center.setScalar((tx + 0.5) * TILE, baseY, (ty + 0.5) * TILE);
        size.setScalar(TILE, level.baseHeight[idx]);
        const quads = marsBoulderQuads(center, size);
        for (const q of quads)
          allQuads.push(q);
      }
    const texOpts = { minFilter: gl.NEAREST, magFilter: gl.NEAREST };
    const sharedTexture = this.sharedTexture(this.marsBoulderPixels, texOpts);
    const batch = new QuadBatch(gl, {
      capacity: Math.max(1, allQuads.length),
      atlas: this.marsBoulderPixels,
      sharedTexture,
      material: new Material({ diffuse: new Vec3(1, 1, 1) }),
      vertex: DOOR_VERTEX,
      fragment: MARS_ROCK_FRAGMENT,
      textureOptions: texOpts,
    });
    if (sharedTexture) {
      batch.sharedAtlas = this.marsBoulderPixels;
      batch.sharedTexOptions = texOpts;
      this.sharedTexturedMeshes.push(batch);
    }
    batch.begin();
    for (const q of allQuads)
      batch.quad(q.corners, q.uv);
    return batch.end();
  }

  buildDoor(door) {
    // a blast door: two thin parallel door slabs recessed inside the 64-unit wall thickness, standing on the floor
    // and sinking into it as it opens. A secret door ('S') stays disguised as a full-thickness bulkhead wall block.
    // A locked door ('R', 'Y', 'U') carries glowing color-coded security stripes and jamb lock bars.
    const { gl } = this;
    const isSecret = Boolean(door.secret);
    const atlas = isSecret
      ? (this.wallPixels ??= wallAtlas())
      : door.lock
        ? ((this.lockedDoorPixels ??= {})[door.lock] ??= lockedDoorAtlas(door.lock))
        : (this.doorPixels ??= doorAtlas());
    const { vertices, uvs } = isSecret
      ? secretDoorBox(scratchScale.setScalar(TILE, TILE, TILE))
      : doubleDoorBox(scratchScale.setScalar(TILE - 0.8, TILE, DOOR_THICKNESS), Boolean(door.alongY), DOOR_INSET);
    const geometry = new CustomMesh();
    geometry.vertices = new Float32Array(vertices);
    geometry.setUvs(uvs);
    geometry.setPrimitive('TRIANGLES');
    const root = new Mesh(gl, geometry);
    root.addProgram(DOOR_VERTEX, isSecret ? WALL_FRAGMENT : DOOR_FRAGMENT, new Material({ diffuse: new Vec3(1, 1, 1) }));
    this.bindAtlasTexture(root, atlas, {
      magFilter: gl.NEAREST,
      minFilter: gl.NEAREST_MIPMAP_NEAREST,
      generateMipmaps: true,
    });
    setPos(root, door.center.x, 0, door.center.y);
    this.scene.addMesh(root);
    this.doorViews.set(door, root);
  }

  buildCrusher(crusher) {
    // a hydraulic ceiling crusher piston that slams down from the roof and retracts back into the ceiling
    const { gl } = this;
    this.doorPixels ??= doorAtlas();
    const { vertices, uvs } = doorBox(TILE - 1.6, TILE);
    const geometry = new CustomMesh();
    geometry.vertices = new Float32Array(vertices);
    geometry.setUvs(uvs);
    geometry.setPrimitive('TRIANGLES');
    const root = new Mesh(gl, geometry);
    root.addProgram(DOOR_VERTEX, DOOR_FRAGMENT, new Material({ diffuse: new Vec3(0.92, 0.72, 0.68) }));
    this.bindAtlasTexture(root, this.doorPixels, {
      magFilter: gl.NEAREST,
      minFilter: gl.NEAREST_MIPMAP_NEAREST,
      generateMipmaps: true,
    });
    setPos(root, crusher.center.x, crusher.low, crusher.center.y);
    this.scene.addMesh(root);
    this.crusherViews.set(crusher, root);
  }

  // ---- actors -------------------------------------------------------------

  buildEnemy(enemy) {
    return MONSTERS[enemy.type].build(this, enemy);
  }

  /** Poses one monster sprite for this frame, or advances its death / gibbing animation. */
  updateEnemy(enemy, view, player, time, game = null, cullDistSq = Infinity, fog = null) {
    if ((Number.isFinite(cullDistSq) && enemy.pos.getDistance(scratchCam2d, true) > cullDistSq) || (fog && !fog.canSeeNear(enemy.pos))) {
      view.lastTime = time;
      view.root.setInactive();
      return;
    }
    view.root.setActive();
    const dead = enemy.state === 'dead';
    const dt = Utils.clamp(time - (view.lastTime ?? time), 0, 0.1);
    view.lastTime = time;
    const fade = dead ? Math.max(0.78, 1 - enemy.deadTime * 0.12) : 1;
    const flash = !dead && (enemy.hurt > 0 || enemy.pain > 0) ? 1 : 0;
    let dynBoost = 0;
    if (player && (player.flash ?? 0) > 0 && (player.weapon ?? 'shotgun') !== 'fist') {
      const distSq = enemy.pos.getDistance(player.pos, true);
      if (distSq < 125 * 125)
        dynBoost = Math.max(dynBoost, (1 - distSq / (125 * 125)) * Math.min(1, player.flash / 0.12) * 0.55);
    }
    if (game && Array.isArray(game.shots)) {
      for (let i = 0; i < game.shots.length; i++) {
        const distSq = enemy.pos.getDistance(game.shots[i].pos, true);
        if (distSq < 180 * 180)
          dynBoost = Math.max(dynBoost, (1 - distSq / (180 * 180)) * 0.3);
      }
    }
    if (player?.nightVisionActive && (player?.nightVisionBattery ?? 0) > 0)
      dynBoost = Math.max(dynBoost, 0.45);
    const amount = fade * (flash ? 0.55 + 0.45 * Math.sin(time * 90) : 1 + dynBoost);
    const brightness = Math.max(0.05, amount);
    if (brightness !== view.brightness) {
      view.brightness = brightness;
      tint(view.material, COLORS.orange, brightness);
    }

    const { root } = view;
    if (!dead) {
      MONSTERS[enemy.type].animate(view, enemy, { time, dt, player });
      setPos(root, enemy.pos.x, view.lift * view.scale, enemy.pos.y);
      setRot(root, view.pitch ?? 0, view.yaw ?? 0, view.roll ?? 0);
      setScale(root, view.scale * view.sx, view.scale * view.sy, view.scale * (view.sz ?? view.sx));
      return;
    }

    MONSTERS[enemy.type].die(view, enemy);
  }

  buildEnemyView(enemy) {
    return this.buildEnemy(enemy);
  }

  updateEnemyView(enemy, view) {
    this.updateEnemy(enemy, view, this.framePlayer, this.frameTime, this.frameGame, this.frameCullDistSq, this.frameOccludeFog);
  }

  buildPickup(pickup) {
    const { gl } = this;
    const keyColor = pickup.type === 'redKey' ? 'red' : pickup.type === 'yellowKey' ? 'yellow' : pickup.type === 'blueKey' ? 'blue' : null;
    const armorColor = pickup.type === 'greenArmor' ? 'green' : pickup.type === 'blueArmor' ? 'blue' : null;
    const isSoulsphere = pickup.type === 'soulsphere';
    const isBerserk = pickup.type === 'berserk';
    const isRadsuit = pickup.type === 'radsuit';
    const isNightvision = pickup.type === 'nightvision';
    const isHealth = pickup.type === 'health';
    const isChainsaw = pickup.type === 'chainsaw';
    const isShotgun = pickup.type === 'shotgun';
    const isChaingun = pickup.type === 'chaingun';
    const isRocket = pickup.type === 'rocket';
    const isBullets = pickup.type === 'bullets';
    const isRockets = pickup.type === 'rockets';
    const atlas = keyColor
      ? ((this.keycardPixels ??= {})[keyColor] ??= keycardAtlas(keyColor))
      : armorColor
        ? ((this.armorPixels ??= {})[armorColor] ??= armorAtlas(armorColor))
        : isSoulsphere
          ? (this.soulspherePixels ??= soulsphereAtlas())
          : isBerserk
            ? (this.berserkPixels ??= berserkAtlas())
            : isRadsuit
              ? (this.radsuitPixels ??= radsuitAtlas())
              : isNightvision
                ? (this.nightvisionPixels ??= nightvisionAtlas())
                : isChainsaw
                  ? (this.chainsawTexture ??= chainsawAtlas())
                  : isShotgun
                    ? (this.shotgunPixels ??= shotgunAtlas())
                    : isChaingun
                      ? (this.chaingunPixels ??= chaingunAtlas())
                      : isRocket
                        ? (this.rocketLauncherPixels ??= rocketLauncherAtlas())
                        : isHealth
                          ? (this.medikitPixels ??= medikitAtlas())
                          : isBullets
                            ? (this.bulletPixels ??= bulletAtlas())
                            : isRockets
                              ? (this.rocketAmmoPixels ??= rocketAmmoAtlas())
                              : (this.ammoPixels ??= ammoAtlas());
    const { vertices, uvs } = keyColor
      ? keycardMesh()
      : armorColor
        ? armorMesh()
        : isSoulsphere
          ? soulsphereMesh()
          : isBerserk
            ? berserkMesh()
            : isRadsuit
              ? radsuitMesh()
              : isNightvision
                ? nightvisionMesh()
                : isChainsaw
                  ? chainsawMesh()
                  : isShotgun
                    ? shotgunMesh()
                    : isChaingun
                      ? chaingunMesh()
                      : isRocket
                        ? rocketLauncherMesh()
                        : isHealth
                          ? medikitMesh()
                          : isBullets
                            ? bulletMesh()
                            : isRockets
                              ? rocketAmmoMesh()
                              : ammoMesh();
    const geometry = new CustomMesh();
    geometry.vertices = vertices;
    geometry.uvs = uvs;
    geometry.setPrimitive('TRIANGLES');
    const texOpts = { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST };
    const sharedTexture = this.sharedTexture(atlas, texOpts);
    const root = texturedMesh(gl, geometry, {
      fragment: SOLID_TEXTURED_FRAGMENT,
      atlas,
      sharedTexture,
      material: new Material({ diffuse: new Vec3(1, 1, 1) }),
      textureOptions: texOpts,
    });
    if (sharedTexture) {
      root.sharedAtlas = atlas;
      root.sharedTexOptions = texOpts;
      this.sharedTexturedMeshes.push(root);
    }
    this.scene.addMesh(root);
    return { root, spinSpeed: isChainsaw || isShotgun || isChaingun || isRocket ? 1.4 : 1.8 };
  }

  buildPickupView(pickup) {
    return this.buildPickup(pickup);
  }

  updatePickupView(pickup, view) {
    const time = this.frameTime;
    const cullDistSq = this.frameCullDistSq;
    const occludeFog = this.frameOccludeFog;
    if ((Number.isFinite(cullDistSq) && pickup.pos.getDistance(scratchCam2d, true) > cullDistSq) || (occludeFog && !occludeFog.canSeeNear(pickup.pos))) {
      view.root.setInactive();
      return;
    }
    view.root.setActive();
    const bob = 1.5 + Math.sin(time * 3 + pickup.phase) * 1.2;
    setPos(view.root, pickup.pos.x, bob, pickup.pos.y);
    setRot(view.root, 0, time * view.spinSpeed + pickup.phase, 0);
  }

  /** A supply chest: a textured body plus a lid child hinged at the back top edge. */
  buildCache(cache) {
    const { gl } = this;
    const atlas = (this.chestPixels ??= chestAtlas());
    this.chestBodyGeo ??= chestBodyMesh();
    this.chestLidGeo ??= chestLidMesh();
    const texOpts = { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST };
    const sharedTexture = this.sharedTexture(atlas, texOpts);
    const makePart = (data, material) => {
      const geometry = new CustomMesh();
      geometry.vertices = data.vertices;
      geometry.uvs = data.uvs;
      geometry.setPrimitive('TRIANGLES');
      const mesh = texturedMesh(gl, geometry, {
        fragment: SOLID_TEXTURED_FRAGMENT,
        atlas,
        sharedTexture,
        material,
        textureOptions: texOpts,
      });
      if (sharedTexture) {
        mesh.sharedAtlas = atlas;
        mesh.sharedTexOptions = texOpts;
        this.sharedTexturedMeshes.push(mesh);
      }
      return mesh;
    };
    const bodyMaterial = new Material({ diffuse: new Vec3(1, 1, 1) });
    const lidMaterial = new Material({ diffuse: new Vec3(1, 1, 1) });
    const body = makePart(this.chestBodyGeo, bodyMaterial);
    const lid = makePart(this.chestLidGeo, lidMaterial);
    const root = new Mesh(gl, new CustomMesh());
    root.addChild(body);
    root.addChild(lid);
    setPos(lid, CHEST_LID_HINGE.x, CHEST_LID_HINGE.y, CHEST_LID_HINGE.z);
    const yaw = Trigo.halfpi - cache.angle;
    setPos(root, cache.pos.x, 0, cache.pos.y);
    setRot(root, 0, yaw, 0);
    this.scene.addMesh(root);
    return { root, body, lid, bodyMaterial, lidMaterial, yaw, lastLid: -1, lastState: '' };
  }

  updateCache(cache, view) {
    const occludeFog = this.frameOccludeFog;
    if ((Number.isFinite(this.frameCullDistSq) && cache.pos.getDistance(scratchCam2d, true) > this.frameCullDistSq) || (occludeFog && !occludeFog.canSeeNear(cache.pos))) {
      view.root.setInactive();
      return;
    }
    view.root.setActive();
    if (cache.lid !== view.lastLid) {
      setRot(view.lid, -cache.lid * CHEST_LID_OPEN_ANGLE, 0, 0);
      view.lastLid = cache.lid;
    }
    if (cache.state !== view.lastState) {
      const tint = cache.state === 'emptied' ? CHEST_TINTS.emptied : CHEST_TINTS.closed;
      view.bodyMaterial.setDiffuse(tint);
      view.lidMaterial.setDiffuse(tint);
      view.lastState = cache.state;
    }
  }

  /** An oil drum: ribbed sides, a zig-zag hazard band, and a lid; when detonated, its ruptured stump and flying 3D shrapnel remain. */
  buildBarrel() {
    const R = 9.5;
    const H = 26;
    const { gl } = this;
    this.barrelPixels ??= barrelAtlas();
    this.barrelWreckGeo ??= barrelWreckMesh(new Vec2(R, H));
    this.barrelShrapnelGeo ??= barrelShrapnelParts(new Vec2(R, H));

    const texOpts = { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST };
    const sharedBarrelTex = this.sharedTexture(this.barrelPixels, texOpts);
    const root = new Mesh(gl, new CustomMesh());
    const cylinder = skinBarrel(new Cylinder(new Vec2(R * 0.985, R * 0.985), H, 20, 1, false), 20, 1);
    for (let i = 1; i < cylinder.vertices.length; i += 3)
      cylinder.vertices[i] += H / 2;
    const skinMaterial = new Material({ diffuse: new Vec3(1, 1, 1) });
    const intact = texturedMesh(gl, cylinder, {
      fragment: SOLID_TEXTURED_FRAGMENT,
      atlas: this.barrelPixels,
      sharedTexture: sharedBarrelTex,
      material: skinMaterial,
      textureOptions: texOpts,
    });
    if (sharedBarrelTex) {
      intact.sharedAtlas = this.barrelPixels;
      intact.sharedTexOptions = texOpts;
      this.sharedTexturedMeshes.push(intact);
    }
    root.addChild(intact);

    const wreckMaterial = new Material({ diffuse: new Vec3(1, 1, 1) });
    const makePart = (partGeo) => {
      const geometry = new CustomMesh();
      geometry.vertices = partGeo.vertices;
      geometry.normals = partGeo.normals;
      geometry.uvs = partGeo.uvs;
      geometry.setPrimitive('TRIANGLES');
      const mesh = texturedMesh(gl, geometry, {
        fragment: SOLID_TEXTURED_FRAGMENT,
        atlas: this.barrelPixels,
        sharedTexture: sharedBarrelTex,
        material: wreckMaterial,
        textureOptions: texOpts,
      });
      if (sharedBarrelTex) {
        mesh.sharedAtlas = this.barrelPixels;
        mesh.sharedTexOptions = texOpts;
        this.sharedTexturedMeshes.push(mesh);
      }
      mesh.setInactive();
      root.addChild(mesh);
      return mesh;
    };

    const wreck = makePart(this.barrelWreckGeo);
    const lid = makePart(this.barrelShrapnelGeo.lid);
    const staves = this.barrelShrapnelGeo.staves.map((staveGeo) => makePart(staveGeo));

    this.scene.addMesh(root);
    return {
      root,
      intact,
      wreck,
      lid,
      staves,
      skinMaterial,
      wreckMaterial,
      pose: createBarrelExplosionPose(),
      wasGone: false,
      lastX: Number.NaN,
      lastY: Number.NaN,
      intactSettled: false,
      wreckSettled: false,
    };
  }

  buildBarrelView() {
    return this.buildBarrel();
  }

  updateBarrelView(barrel, view) {
    const time = this.frameTime;
    const cullDistSq = this.frameCullDistSq;
    const occludeFog = this.frameOccludeFog;
    if ((Number.isFinite(cullDistSq) && barrel.pos.getDistance(scratchCam2d, true) > cullDistSq) || (occludeFog && !occludeFog.canSeeNear(barrel.pos))) {
      view.root.setInactive();
      return;
    }
    view.root.setActive();
    if (barrel.pos.x !== view.lastX || barrel.pos.y !== view.lastY) {
      view.lastX = barrel.pos.x;
      view.lastY = barrel.pos.y;
      setPos(view.root, barrel.pos.x, 0, barrel.pos.y);
    }
    if (!barrel.gone) {
      if (view.wasGone) {
        view.wasGone = false;
        view.intactSettled = false;
        view.wreckSettled = false;
        view.intact.setActive();
        view.wreck.setInactive();
        view.lid.setInactive();
        for (const stave of view.staves)
          stave.setInactive();
      }
      // a barrel that has been set off flickers and shudders until it blows
      const burning = barrel.fuse >= 0;
      if (!burning && view.intactSettled)
        return;
      const skin = burning ? 0.8 + 0.6 * Math.abs(Math.sin(time * 70)) : 1;
      scratchPos.setScalar(skin, skin, skin);
      view.skinMaterial.setDiffuse(scratchPos);
      setUniformScale(view.intact, burning ? 1 + 0.05 * Math.sin(time * 90) : 1);
      view.intactSettled = !burning;
      return;
    }

    if (!view.wasGone) {
      view.wasGone = true;
      view.intactSettled = false;
      view.wreckSettled = false;
      view.intact.setInactive();
      view.wreck.setActive();
      view.lid.setActive();
      for (const stave of view.staves)
        stave.setActive();
    }
    if (view.wreckSettled)
      return;
    const deadTime = barrel.deadTime ?? 0;
    const flash = deadTime < 0.45 ? (1 - deadTime / 0.45) * 0.65 : 0;
    scratchPos.setScalar(0.92 + flash, 0.9 + flash * 0.7, 0.88 + flash * 0.35);
    view.wreckMaterial.setDiffuse(scratchPos);

    barrelExplosionPose(deadTime, barrel.phase ?? 0, view.pose);
    view.wreck.setRotation(view.pose.wreckRot);
    view.wreck.setScale(view.pose.wreckScale);
    view.lid.setPosition(view.pose.lid.pos);
    view.lid.setRotation(view.pose.lid.rot);
    for (let i = 0; i < view.staves.length; i++) {
      view.staves[i].setPosition(view.pose.staves[i].pos);
      view.staves[i].setRotation(view.pose.staves[i].rot);
    }
    if (deadTime >= 1.25)
      view.wreckSettled = true;
  }

  buildShot(shot) {
    if (shot?.kind === 'grenade') {
      const atlas = (this.grenadePixels ??= grenadeAtlas());
      const texOptions = { flipY: false };
      const sharedTexture = this.sharedTexture(atlas, texOptions);
      const parts = (this.grenadeGeo ??= grenadeParts());
      const material = new Material({ diffuse: new Vec3(1, 1, 1) });
      const makePart = (geometry) => {
        const mesh = texturedMesh(this.gl, geometry, {
          atlas,
          sharedTexture,
          material,
          textureOptions: texOptions,
          fragment: SOLID_TEXTURED_FRAGMENT,
        });
        if (sharedTexture && this.sharedTexturedMeshes) {
          mesh.sharedAtlas = atlas;
          mesh.sharedTexOptions = texOptions;
          this.sharedTexturedMeshes.push(mesh);
        }
        return mesh;
      };
      const root = makePart(parts.body);
      const addPart = (geometry, position) => {
        const mesh = makePart(geometry);
        mesh.position.copy(position);
        root.addChild(mesh);
      };
      for (let i = 0; i < parts.ridges.length; i++)
        addPart(parts.ridges[i].geometry, parts.ridges[i].position);
      addPart(parts.neck.geometry, parts.neck.position);
      addPart(parts.fuse.geometry, parts.fuse.position);
      this.scene.addMesh(root);
      return { root };
    }
    const atlas = (this.fireballPixels ??= fireballAtlas());
    const material = new Material({ diffuse: new Vec3(1, 1, 1) });
    const root = this.sprite(atlas, material, 18, 18, {
      anchor: 'center',
      billboard: 'spherical',
      depthBias: 6,
      fragment: TEXTURED_FRAGMENT,
    });
    this.scene.addMesh(root);
    return { root };
  }

  buildShotView(shot) {
    return this.buildShot(shot);
  }

  updateShotView(shot, view) {
    const time = this.frameTime;
    const cullDistSq = this.frameCullDistSq;
    const occludeFog = this.frameOccludeFog;
    if ((Number.isFinite(cullDistSq) && shot.pos.getDistance(scratchCam2d, true) > cullDistSq) || (occludeFog && !occludeFog.canSeeNear(shot.pos))) {
      view.root.setInactive();
      return;
    }
    view.root.setActive();
    if (shot.kind === 'grenade') {
      setPos(view.root, shot.pos.x, shot.z, shot.pos.y);
      setRot(view.root, time * 8, 0, time * 5);
      return;
    }
    view.root.setFrame(Math.floor((time * 18) % FIREBALL_FRAMES));
    setPos(view.root, shot.pos.x, EYE - 4, shot.pos.y);
    const baseScale = shot.kind === 'rocket' ? 1.35 : 1;
    setUniformScale(view.root, baseScale * (1 + 0.08 * Math.sin(time * 24)));
  }

  buildEffect(effect) {
    const spark = effect.type === 'spark';
    const boom = effect.type === 'boom';
    const teleport = effect.type === 'teleport';
    if (boom) {
      const { gl } = this;
      const atlas = (this.explosion3dPixels ??= explosion3dAtlas());
      const geo = (this.explosion3dGeo ??= explosion3dMesh(new Vec3(1, 1, 1)));
      const material = new Material({ diffuse: new Vec3(1, 1, 1) });
      const geometry = new CustomMesh();
      geometry.vertices = geo.vertices;
      geometry.normals = geo.normals;
      geometry.uvs = geo.uvs;
      geometry.setPrimitive('TRIANGLES');
      const root = new Mesh(gl, geometry);
      root.addProgram(EXPLOSION_3D_VERTEX, EXPLOSION_3D_FRAGMENT, material);
      this.bindAtlasTexture(root, atlas, {
        magFilter: gl.LINEAR,
        minFilter: gl.LINEAR,
      });
      root.addCustomUniform('dissolve', 'uniform1f', 0);
      root.addCustomUniform('heat', 'uniform1f', 1);
      root.addCustomUniform('progress', 'uniform1f', 0);
      root.addCustomUniform('phase', 'uniform1f', 0.7);
      this.scene.addMesh(root);
      return {
        root,
        material,
        boom: true,
        spark: false,
        teleport: false,
        pose: createExplosion3dPose(),
      };
    }

    const atlas = spark
      ? (this.impactPixels ??= impactAtlas())
      : teleport
        ? (this.teleportPixels ??= teleportAtlas())
        : (this.explosionPixels ??= explosionAtlas());
    const material = new Material({
      diffuse: new Vec3(1, 1, 1),
    });
    // a small depth bias keeps the sprite from z-fighting at its origin without projecting in front of the barrel
    const root = this.sprite(atlas, material, 1, 1, {
      anchor: 'center',
      billboard: 'spherical',
      depthBias: 8,
      fragment: TEXTURED_FRAGMENT,
    });
    this.scene.addMesh(root);
    // each spark is one of several kinds, and it keeps it for its whole life
    return { root, material, spark, boom: false, teleport, kind: Rand.integer(0, SPARK_VARIANTS - 1) };
  }

  buildEffectView(effect) {
    return this.buildEffect(effect);
  }

  updateEffectView(effect, view) {
    const effectCullDistSq = this.frameEffectCullDistSq;
    const occludeFog = this.frameOccludeFog;
    scratchEntity2d.setScalar(effect.x, effect.y);
    if ((Number.isFinite(effectCullDistSq) && scratchEntity2d.getDistance(scratchCam2d, true) > effectCullDistSq) || (occludeFog && !occludeFog.canSeeNear(scratchEntity2d, view.boom ? 2 : 1))) {
      view.root.setInactive();
      return;
    }
    view.root.setActive();
    const progress = Math.min(0.999, effect.age / effect.life);
    if (view.spark) {
      const width = 19;
      view.root.setFrame(IMPACT_CELLS.spark + view.kind * SPARK_FRAMES + Math.floor(progress * SPARK_FRAMES));
      setPos(view.root, effect.x, effect.z, effect.y);
      setUniformScale(view.root, width);
      return;
    }
    if (view.boom) {
      const radius = explosionWidth(effect) * 0.5;
      const pose = explosion3dPose(progress, view.pose);
      if (!pose.active) {
        view.root.setInactive();
        return;
      }
      setPos(
        view.root,
        effect.x + pose.pos.x * radius,
        Math.max(0, effect.z) + pose.pos.y * radius,
        effect.y + pose.pos.z * radius
      );
      view.root.setRotation(pose.rot);
      setScale(
        view.root,
        pose.scale.x * radius,
        pose.scale.y * radius,
        pose.scale.z * radius
      );
      view.material.setDiffuse(pose.color);
      view.root.setCustomUniform('dissolve', pose.dissolve);
      view.root.setCustomUniform('heat', pose.heat);
      view.root.setCustomUniform('progress', progress);
      view.root.setCustomUniform('phase', pose.phase);
      return;
    }
    // projectile blasts and teleporter plasma sit at impact height as camera-facing sprites
    const width = explosionWidth(effect);
    view.root.setFrame(Math.min(EXPLOSION_FRAMES - 1, Math.floor(progress * EXPLOSION_FRAMES)));
    setPos(view.root, effect.x, effect.z, effect.y);
    setUniformScale(view.root, width);
  }

  /** Create views for new entities, update live ones, drop the ones that are gone. `keep` filters the list. */
  syncViews(map, list, build, update, keep = null) {
    const stamp = ++this.syncStamp;
    for (const entity of list) {
      if (keep && !keep(entity))
        continue;
      let view = map.get(entity);
      if (!view) {
        view = build(entity);
        map.set(entity, view);
      }
      view.stamp = stamp;
      update(entity, view);
    }
    for (const [entity, view] of map)
      if (view.stamp !== stamp) {
        this.discard(view.root);
        map.delete(entity);
      }
  }

  // ---- frame --------------------------------------------------------------

  render(game) {
    if (game.level !== this.level)
      this.rebuild(game.level);

    const player = game.player;
    const time = game.time;

    this.updateCamera(game);
    const nvgActive = Boolean(player?.nightVisionActive && (player?.nightVisionBattery ?? 0) > 0 && !this.cutaway && !game.cam);
    if (this.quad) {
      this.quad.setCustomUniform('nightVision', nvgActive ? 1 : 0);
      this.quad.setCustomUniform('time', time);
    }
    if (!this.cutaway) {
      const isMars = game.level?.planet === 'mars';
      const skyVec = isMars ? MARS_SKY_VEC : BG_VEC;
      marsFogNearFar(game.level, player.pos, scratchFog, nvgActive);
      this.fogNearFar.setScalar(
        Utils.lerp(this.fogNearFar.x, scratchFog.x, 0.22),
        Utils.lerp(this.fogNearFar.y, scratchFog.y, 0.22)
      );
      this.scene.setFog(skyVec, this.fogNearFar.x, this.fogNearFar.y);
    }
    if (this.skyMesh) {
      this.skyMesh.setPosition(this.camera.position);
      this.skyMesh.setCustomUniform('time', time);
    }

    scratchCam2d.setScalar(this.camera.position.x, this.camera.position.z);
    const fogFar = this.cutaway ? Infinity : this.fogNearFar.y;
    const cullDist = fogFar + TILE;
    const cullDistSq = cullDist * cullDist;
    const effectCullDist = fogFar + 96;
    const effectCullDistSq = effectCullDist * effectCullDist;
    const occludeFog = !this.cutaway && !game.cam ? game.fog ?? null : null;

    this.frameGame = game;
    this.framePlayer = player;
    this.frameTime = time;
    this.frameCullDistSq = cullDistSq;
    this.frameEffectCullDistSq = effectCullDistSq;
    this.frameOccludeFog = occludeFog;

    if (this.staticChunks)
      for (let i = 0; i < this.staticChunks.length; i++) {
        const chunk = this.staticChunks[i];
        if (!chunk.mesh || typeof chunk.mesh.setActive !== 'function')
          continue;
        if (this.cutaway) {
          if (chunk.hideInCutaway)
            chunk.mesh.setInactive();
          else
            chunk.mesh.setActive();
          continue;
        }
        if (!Number.isFinite(fogFar)) {
          chunk.mesh.setActive();
          continue;
        }
        const maxDist = fogFar + chunk.radius + TILE;
        if (chunk.center.getDistance(scratchCam2d, true) > maxDist * maxDist) {
          chunk.mesh.setInactive();
          continue;
        }
        if (occludeFog && chunk.bounds && !isChunkVisibleInFog(occludeFog, chunk.bounds, game.level.width)) {
          chunk.mesh.setInactive();
          continue;
        }
        chunk.mesh.setActive();
      }

    if (this.slimeMesh)
      this.slimeMesh.setCustomUniform('time', time);
    if (this.teleporterMesh)
      this.teleporterMesh.setCustomUniform('time', time);
    if (this.crateMeshes)
      for (let i = 0; i < this.crateMeshes.length; i++) {
        const m = this.crateMeshes[i];
        if (m && typeof m.setCustomUniform === 'function' && m.active !== false)
          m.setCustomUniform('time', time);
      }
    else if (this.crateMesh)
      this.crateMesh.setCustomUniform('time', time);

    for (const door of game.level.doors.values()) {
      const view = this.doorViews.get(door);
      const height = 1 - door.open;
      const inRange = (!Number.isFinite(cullDistSq) || door.center.getDistance(scratchCam2d, true) <= cullDistSq) && (!occludeFog || occludeFog.canSeeNear(door.center));
      if (height > 0.02 && inRange) {
        // the door slides down into the floor whole; the part below the floor is not drawn
        setPos(view, door.center.x, -door.open * game.level.baseHeight[door.idx], door.center.y);
        view.setActive();
        this.syncDoorMarks(door, game.blood, true);
      } else {
        view.setInactive();
        this.syncDoorMarks(door, game.blood, false);
      }
    }

    for (const crusher of game.level.crushers) {
      const view = this.crusherViews.get(crusher);
      if (!view)
        continue;
      if ((Number.isFinite(cullDistSq) && crusher.center.getDistance(scratchCam2d, true) > cullDistSq) || (occludeFog && !occludeFog.canSeeNear(crusher.center))) {
        view.setInactive();
        continue;
      }
      view.setActive();
      setPos(view, crusher.center.x, crusher.low, crusher.center.y);
    }

    this.syncViews(
      this.enemyViews,
      game.enemies,
      (this.buildEnemyViewFn ??= (enemy) => this.buildEnemyView(enemy)),
      (this.updateEnemyViewFn ??= (enemy, view) => this.updateEnemyView(enemy, view))
    );
    this.syncViews(
      this.pickupViews,
      game.pickups,
      (this.buildPickupViewFn ??= (pickup) => this.buildPickupView(pickup)),
      (this.updatePickupViewFn ??= (pickup, view) => this.updatePickupView(pickup, view))
    );
    this.syncViews(
      this.cacheViews,
      game.caches ?? EMPTY,
      (this.buildCacheView ??= (cache) => this.buildCache(cache)),
      (this.updateCacheView ??= (cache, view) => this.updateCache(cache, view))
    );
    this.syncViews(
      this.barrelViews,
      game.barrels,
      (this.buildBarrelViewFn ??= () => this.buildBarrelView()),
      (this.updateBarrelViewFn ??= (barrel, view) => this.updateBarrelView(barrel, view))
    );
    this.syncViews(
      this.shotViews,
      game.shots,
      (this.buildShotViewFn ??= (shot) => this.buildShotView(shot)),
      (this.updateShotViewFn ??= (shot, view) => this.updateShotView(shot, view))
    );
    this.syncViews(
      this.effectViews,
      game.effects,
      (this.buildEffectViewFn ??= (effect) => this.buildEffectView(effect)),
      (this.updateEffectViewFn ??= (effect, view) => this.updateEffectView(effect, view))
    );

    this.updateKnife(game);
    this.updateChainsaw(game);
    this.updateChaingun(game);
    this.updateShotgun(game);
    this.updateRocketLauncher(game);
    updateCeilingLights(this.ceilingLights, this.lightFixtures, this.camera.position, time, game, cullDist, occludeFog);
    this.syncBlood(game.blood, game.dust, occludeFog, game.effects);

    const { gl } = this;
    this.target.bind();
    this.scene.clear();
    this.scene.render(this.camera, time);
    this.overlay.glow.render(this.postCamera, time);
    this.target.unbind(this.viewportSize);

    this.glowTarget.bind();
    this.down.clear(false, true);
    this.down.render(this.postCamera, time);
    this.glowTarget.unbind(this.viewportSize);

    gl.viewport(0, 0, this.width, this.height);
    this.post.clear();
    this.post.render(this.postCamera, time);
    this.overlay.crisp.render(this.postCamera, time);
  }

  /** Positions and animates the 3D textured chainsaw viewmodel in front of the player camera. */
  updateChainsaw(game) {
    const view = this.chainsawView;
    if (!view)
      return;
    const player = game.player;
    const visible = Boolean(player && player.weapon === 'chainsaw' && !game.cam && game.state !== 'dead' && !game.automap);
    if (!visible) {
      view.root.setInactive();
      return;
    }
    view.root.setActive();
    const switchOffset = player.switchOffset ?? Math.min(1, (player.switchTimer ?? 0) / 0.22);
    const attacking = Boolean(
      player.attacking || (!player.dryFire && (player.switchTimer ?? 0) <= 0 && ((player.cooldown ?? 0) > 0 || player.triggerHeld))
    );
    scratchChainsawOpts.time = game.time ?? 0;
    scratchChainsawOpts.bob = player.bob ?? 0;
    scratchChainsawOpts.moving = player.moving ?? 0;
    scratchChainsawOpts.recoil = player.recoil ?? 0;
    scratchChainsawOpts.switchOffset = switchOffset;
    scratchChainsawOpts.attacking = attacking;
    const pose = chainsawPose(scratchChainsawOpts, view.pose);

    const kick = player.kick ?? ZERO_KICK;
    writeViewBasis(player.angle, kick);

    scratchPos
      .copy(this.camera.position)
      .addScaledVector(scratchRight, pose.offset.x)
      .addScaledVector(scratchUp, pose.offset.y)
      .addScaledVector(scratchForward, pose.offset.z);
    view.root.setPosition(scratchPos);

    writeViewQuat(player.angle, kick, pose.rotation);
    view.root.setQuaternion(scratchQuat);

    view.topChain.setPosition(pose.topChainPos);
    view.bottomChain.setPosition(pose.bottomChainPos);
    view.noseChain.setRotation(pose.noseChainRot);
  }

  /** Positions and animates the 3D textured chaingun viewmodel and its rotary 6-barrel cluster in front of the player camera. */
  updateChaingun(game) {
    const view = this.chaingunView;
    if (!view)
      return;
    const player = game.player;
    const visible = Boolean(player && player.weapon === 'chaingun' && !game.cam && game.state !== 'dead' && !game.automap);
    if (!visible) {
      view.root.setInactive();
      return;
    }
    view.root.setActive();
    const switchOffset = player.switchOffset ?? Math.min(1, (player.switchTimer ?? 0) / 0.22);
    const canSpin = !player.dryFire && (player.switchTimer ?? 0) <= 0;
    const attacking = Boolean(
      player.attacking || (canSpin && (player.cooldown ?? 0) > 0 && player.triggerHeld !== false)
    );
    const spinDown = canSpin ? Math.max(player.spinDown ?? 0, (player.cooldown ?? 0) > 0 ? 0.1 : 0) : 0;
    scratchChaingunOpts.time = game.time ?? 0;
    scratchChaingunOpts.bob = player.bob ?? 0;
    scratchChaingunOpts.moving = player.moving ?? 0;
    scratchChaingunOpts.recoil = player.recoil ?? 0;
    scratchChaingunOpts.switchOffset = switchOffset;
    scratchChaingunOpts.attacking = attacking;
    scratchChaingunOpts.spinDown = spinDown;
    const pose = chaingunPose(scratchChaingunOpts, view.pose);

    const flashBoost = attacking && (player.flash ?? 0) > 0 ? Math.min(1, player.flash / WEAPONS.chaingun.feel.flash) * 0.38 : 0;
    tintScratch.setScalar(1 + flashBoost, 1 + flashBoost * 0.78, 1 + flashBoost * 0.42);
    view.material.setDiffuse(tintScratch);

    const kick = player.kick ?? ZERO_KICK;
    writeViewBasis(player.angle, kick);

    scratchPos
      .copy(this.camera.position)
      .addScaledVector(scratchRight, pose.offset.x)
      .addScaledVector(scratchUp, pose.offset.y)
      .addScaledVector(scratchForward, pose.offset.z);
    view.root.setPosition(scratchPos);

    writeViewQuat(player.angle, kick, pose.rotation);
    view.root.setQuaternion(scratchQuat);

    view.rotor.setRotation(pose.rotorRot);
  }

  /** Positions and animates the 3D textured pump-action shotgun viewmodel, sliding forend, and spent shell ejection. */
  updateShotgun(game) {
    const view = this.shotgunView;
    if (!view)
      return;
    const player = game.player;
    const weapon = player?.weapon ?? 'shotgun';
    const visible = Boolean(player && weapon === 'shotgun' && !game.cam && game.state !== 'dead' && !game.automap);
    if (!visible) {
      view.root.setInactive();
      return;
    }
    view.root.setActive();
    const switchOffset = player.switchOffset ?? Math.min(1, (player.switchTimer ?? 0) / 0.22);
    const isFiring = !player.dryFire && (player.switchTimer ?? 0) <= 0;
    const elapsed = isFiring && (player.cooldown ?? 0) > 0 ? WEAPONS.shotgun.cooldown - player.cooldown : -1;
    const hasAmmo = (player.shells ?? player.ammo ?? 1) >= 1;
    scratchShotgunOpts.time = game.time ?? 0;
    scratchShotgunOpts.bob = player.bob ?? 0;
    scratchShotgunOpts.moving = player.moving ?? 0;
    scratchShotgunOpts.recoil = player.recoil ?? 0;
    scratchShotgunOpts.switchOffset = switchOffset;
    scratchShotgunOpts.elapsed = elapsed;
    scratchShotgunOpts.hasAmmo = hasAmmo;
    const pose = shotgunPose(scratchShotgunOpts, view.pose);

    const flashBoost =
      isFiring && ((player.flash ?? 0) > 0 || (elapsed >= 0 && elapsed < SHOTGUN_FLASH))
        ? Math.max(Math.min(1, (player.flash ?? 0) / SHOTGUN_FLASH), elapsed >= 0 && elapsed < SHOTGUN_FLASH ? 1 - elapsed / SHOTGUN_FLASH : 0) * 0.45
        : 0;
    tintScratch.setScalar(1 + flashBoost, 1 + flashBoost * 0.78, 1 + flashBoost * 0.42);
    view.material.setDiffuse(tintScratch);

    const kick = player.kick ?? ZERO_KICK;
    writeViewBasis(player.angle, kick);

    scratchPos
      .copy(this.camera.position)
      .addScaledVector(scratchRight, pose.offset.x)
      .addScaledVector(scratchUp, pose.offset.y)
      .addScaledVector(scratchForward, pose.offset.z);
    view.root.setPosition(scratchPos);

    writeViewQuat(player.angle, kick, pose.rotation);
    view.root.setQuaternion(scratchQuat);

    view.pump.setPosition(pose.pumpPos);
    view.arm.setPosition(pose.armPos);
    view.arm.setRotation(pose.armRot);
    view.shell.setPosition(pose.shellPos);
    view.shell.setRotation(pose.shellRot);
  }

  /** Positions and animates the 3D textured rocket launcher viewmodel and its auto-loader chambered warhead. */
  updateRocketLauncher(game) {
    const view = this.rocketLauncherView;
    if (!view)
      return;
    const player = game.player;
    const visible = Boolean(player && player.weapon === 'rocket' && !game.cam && game.state !== 'dead' && !game.automap);
    if (!visible) {
      view.root.setInactive();
      return;
    }
    view.root.setActive();
    const switchOffset = player.switchOffset ?? Math.min(1, (player.switchTimer ?? 0) / 0.22);
    const isFiring = !player.dryFire && (player.switchTimer ?? 0) <= 0;
    const elapsed = isFiring && (player.cooldown ?? 0) > 0 ? WEAPONS.rocket.cooldown - player.cooldown : -1;
    const hasAmmo = (player.rockets ?? player.ammo ?? 1) >= 1;
    scratchRocketOpts.time = game.time ?? 0;
    scratchRocketOpts.bob = player.bob ?? 0;
    scratchRocketOpts.moving = player.moving ?? 0;
    scratchRocketOpts.recoil = player.recoil ?? 0;
    scratchRocketOpts.switchOffset = switchOffset;
    scratchRocketOpts.elapsed = elapsed;
    scratchRocketOpts.hasAmmo = hasAmmo;
    const pose = rocketLauncherPose(scratchRocketOpts, view.pose);

    const flashBoost =
      isFiring && ((player.flash ?? 0) > 0 || (elapsed >= 0 && elapsed < ROCKET_FLASH))
        ? Math.max(Math.min(1, (player.flash ?? 0) / ROCKET_FLASH), elapsed >= 0 && elapsed < ROCKET_FLASH ? 1 - elapsed / ROCKET_FLASH : 0) * 0.5
        : 0;
    tintScratch.setScalar(1 + flashBoost, 1 + flashBoost * 0.78, 1 + flashBoost * 0.42);
    view.material.setDiffuse(tintScratch);

    const kick = player.kick ?? ZERO_KICK;
    writeViewBasis(player.angle, kick);

    scratchPos
      .copy(this.camera.position)
      .addScaledVector(scratchRight, pose.offset.x)
      .addScaledVector(scratchUp, pose.offset.y)
      .addScaledVector(scratchForward, pose.offset.z);
    view.root.setPosition(scratchPos);

    writeViewQuat(player.angle, kick, pose.rotation);
    view.root.setQuaternion(scratchQuat);

    view.warhead.setPosition(pose.warheadPos);
  }

  /** Positions and animates the 3D textured combat knife viewmodel held in the player's gloved right hand. */
  updateKnife(game) {
    const view = this.knifeView;
    if (!view)
      return;
    const player = game.player;
    const visible = Boolean(player && player.weapon === 'knife' && !game.cam && game.state !== 'dead' && !game.automap);
    if (!visible) {
      view.root.setInactive();
      return;
    }
    view.root.setActive();
    const switchOffset = player.switchOffset ?? Math.min(1, (player.switchTimer ?? 0) / 0.22);
    const isFiring = !player.dryFire && (player.switchTimer ?? 0) <= 0;
    const elapsed = isFiring && (player.cooldown ?? 0) > 0 ? WEAPONS.knife.cooldown - player.cooldown : -1;
    scratchKnifeOpts.time = game.time ?? 0;
    scratchKnifeOpts.bob = player.bob ?? 0;
    scratchKnifeOpts.moving = player.moving ?? 0;
    scratchKnifeOpts.recoil = player.recoil ?? 0;
    scratchKnifeOpts.switchOffset = switchOffset;
    scratchKnifeOpts.elapsed = elapsed;
    scratchKnifeOpts.attack = player.knifeAttack ?? 'vertical';
    const pose = knifePose(scratchKnifeOpts, view.pose);

    const kick = player.kick ?? ZERO_KICK;
    writeViewBasis(player.angle, kick);

    scratchPos
      .copy(this.camera.position)
      .addScaledVector(scratchRight, pose.offset.x)
      .addScaledVector(scratchUp, pose.offset.y)
      .addScaledVector(scratchForward, pose.offset.z);
    view.root.setPosition(scratchPos);

    writeViewQuat(player.angle, kick, pose.rotation);
    view.root.setQuaternion(scratchQuat);
  }

  /** The title screen's camera: placed, aimed, tilted and zoomed by the film, shaking with explosions. */
  updateFilmCamera(cam, game) {
    const { camera } = this;
    const shake = game.shake * 6;
    camera.position.setScalar(
      cam.x + Rand.float(-0.5, 0.5) * shake,
      cam.eye + Rand.float(-0.5, 0.5) * shake,
      cam.y + Rand.float(-0.5, 0.5) * shake
    );
    camera.target.setScalar(cam.lookX, cam.lookEye, cam.lookY);
    // a roll tips "up" towards the viewer's right
    const dx = cam.lookX - cam.x;
    const dz = cam.lookY - cam.y;
    scratchForward.setScalar(dx, 0, dz);
    const length = scratchForward.getMagnitude() || 1;
    camera.up.setScalar((-dz / length) * Math.sin(cam.roll), Math.cos(cam.roll), (dx / length) * Math.sin(cam.roll));
    if (Math.abs(cam.zoom - this.zoom) > 0.002) {
      this.zoom = cam.zoom;
      camera.fov = this.baseFov * cam.zoom;
      camera.setProjectionMatrix(this.viewportSize);
    }
    camera.setViewMatrix();
    this.filmed = true;
  }

  updateCamera(game) {
    if (game.cam) {
      this.updateFilmCamera(game.cam, game);
      return;
    }
    if (this.filmed) {
      // back to the player's own view
      this.filmed = false;
      this.camera.up.setScalar(0, 1, 0);
      this.camera.fov = this.baseFov;
      this.zoom = 1;
      this.camera.setProjectionMatrix(this.viewportSize);
    }
    const player = game.player;
    const dead = game.state === 'dead';
    const drop = dead ? Math.min(player.deadTime * 36, 24) : 0;
    const crouch = player.crouch ?? 0;
    const bob = Math.sin(player.bob * 2) * 1.6 * player.moving * (1 - 0.35 * crouch);
    const shake = Math.max(player.hurt > 0 ? player.hurt * 5 : 0, game.shake * 6);
    const { camera } = this;
    const kick = player.kick ?? ZERO_KICK;
    const teleFlash = player.teleFlash ?? 0;
    const warp = teleFlash > 0 ? Math.min(1, teleFlash / 0.65) : 0;
    const desired = this.baseFov * (1 + warp * warp * 0.2) * (1 + kick.fov);
    if (Math.abs(desired - camera.fov) > 1e-3) {
      camera.fov = desired;
      camera.setProjectionMatrix(this.viewportSize);
    } else if (warp === 0 && kick.fov === 0 && camera.fov !== this.baseFov) {
      camera.fov = this.baseFov;
      camera.setProjectionMatrix(this.viewportSize);
    }
    const baseEye = player.eye ?? EYE;
    const eyeY = Math.max(8, baseEye - drop) + bob;
    camera.position.setScalar(
      player.pos.x + Rand.float(-0.5, 0.5) * shake,
      eyeY + Rand.float(-0.5, 0.5) * shake,
      player.pos.y + Rand.float(-0.5, 0.5) * shake
    );
    writeViewBasis(player.angle, kick);
    camera.target.setScalar(
      camera.position.x + scratchForward.x * 100,
      eyeY - (dead ? drop * 2 : 0) + scratchForward.y * 100,
      camera.position.z + scratchForward.z * 100
    );
    camera.up.copy(scratchUp);
    camera.setViewMatrix();
  }
}
