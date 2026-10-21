import { CustomMesh, Cylinder, FullscreenQuad, Material, Mesh, PerspectiveCamera, Quat, Rand, Renderer, RenderTarget, Scene, Sprite, Trigo, Utils, Vec2, Vec3 } from '@1pizzateam/roostr';
import { BLOOD } from './blood.js';
import { barrelAtlas, skinBarrel } from './barrel.js';
import { bloodAtlas, floorGibQuad, floorSplatQuad, particleQuad, printQuad, wallDripQuads, wallSplatQuad } from './bloodsprites.js';
import { DOOR_FRAGMENT, DOOR_INSET, DOOR_THICKNESS, DOOR_VERTEX, WALL_FRAGMENT, doorAtlas, doorBox, doubleDoorBox, lockedDoorAtlas, secretDoorBox } from './door.js';
import { CEILING_AMBIENT_COLOR, CEILING_CONE_FRAGMENT, CEILING_CONE_VERTEX, CEILING_FRAGMENT, ceilingAtlas, ceilingCellFor, ceilingCellUv, ceilingLightCones, ceilingLightFixtures, createCeilingLights, updateCeilingLights } from './ceiling.js';
import { WALL_CELLS, diagWallFaceQuads, wallAtlas, wallCellUv, wallFaceQuads } from './wall.js';
import { EXPLOSION_FRAMES, explosionAtlas, teleportAtlas } from './explosion.js';
import { FIREBALL_FRAMES, fireballAtlas } from './fireball.js';
import { FLOOR_FRAGMENT, FLOOR_VERTEX, SLIME_FRAGMENT, TELEPORTER_FRAGMENT, floorAtlas, floorCellFor, floorCellUv, slimeAtlas, teleporterAtlas, teleporterMachineQuads } from './floor.js';
import { CEILING, DOOR, EXIT, EYE, FLOOR, PILLAR, TILE, WALL } from './level.js';
import { faceCorners, quadTriangles } from './lines.js';
import { MONSTERS } from './monsters.js';
import { Overlay } from './overlay.js';
import { LIGHT_GLSL, PARTICLE_FRAGMENT, PARTICLE_VERTEX, QuadBatch, SOLID_ALPHA, SOLID_TEXTURED_FRAGMENT, TEXTURED_FRAGMENT, texturedMesh } from './quads.js';
import { holeQuad, IMPACT_CELLS, impactAtlas, SPARK_FRAMES, SPARK_VARIANTS } from './impacts.js';
import { medikitAtlas, medikitMesh } from './medikit.js';
import { ammoAtlas, ammoMesh, bulletAtlas, bulletMesh, rocketAmmoAtlas, rocketAmmoMesh } from './ammo.js';
import { keycardAtlas, keycardMesh } from './keycard.js';
import { chaingunAtlas, chaingunMesh, chaingunParts, chaingunPose, chainsawAtlas, chainsawMesh, chainsawParts, chainsawPose, knifeAtlas, knifeParts, knifePose, rocketLauncherAtlas, rocketLauncherMesh, rocketLauncherParts, rocketLauncherPose, shotgunAtlas, shotgunMesh, shotgunParts, shotgunPose } from './arsenal.js';
import { armorAtlas, armorMesh } from './armor.js';
import { berserkAtlas, berserkMesh, radsuitAtlas, radsuitMesh, soulsphereAtlas, soulsphereMesh } from './powerups.js';

// Blue is the world, green is what helps you, orange is what hurts, red is blood.
const BG = [7 / 255, 9 / 255, 15 / 255];
const COLORS = {
  blue: [0x5b / 255, 0x8c / 255, 0xff / 255],
  green: [0x38 / 255, 0xc7 / 255, 0x93 / 255],
  orange: [0xff / 255, 0x9f / 255, 0x43 / 255],
  red: [0xe8 / 255, 0x10 / 255, 0x2c / 255],
};

// Rooms are closed by a ceiling one wall high (a wall texture is one tile high): the walls go right up to it, so nothing
// in another room shows above a wall. Tall walls are drawn no higher than it, and the stretch above a low wall is wall.
const ROOF = CEILING;

const NEAR = 6;
const FAR = 2400;
const FOG_NEAR = 260;
const FOG_FAR = 1500;
const HORIZONTAL_FOV = 82;

const LINE_VERTEX = `
attribute vec3 aVertexPosition;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
varying float vDepth;

void main(void) {
  vec4 v = uViewMatrix * uModelMatrix * vec4(aVertexPosition, 1.0);
  vDepth = -v.z;
  // pull lines slightly towards the camera so they win depth ties against the hiding faces
  v.z += 1.2 + vDepth * 0.01;
  gl_Position = uProjectionMatrix * v;
}
`;

const LINE_FRAGMENT = `
precision mediump float;
uniform vec3 uMaterialDiffuse;
uniform int uHasFog;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vDepth;

void main(void) {
  vec3 color = uMaterialDiffuse;
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade * 0.9);
  }
  gl_FragColor = vec4(color, 1.0);
}
`;

// The colours of a sprite: RoostR's Sprite places it and hands over `vTextureCoord` and `vDepth`.
const SPRITE_FRAGMENT = `
precision mediump float;
uniform sampler2D uSampler;
uniform vec3 uMaterialDiffuse;
uniform float uGlare;
uniform int uHasFog;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vDepth;
varying vec2 vTextureCoord;

const vec3 BACKGROUND = vec3(${BG.map((v) => v.toFixed(5)).join(', ')});
const vec3 BLOOD = vec3(${COLORS.red.map((v) => v.toFixed(5)).join(', ')});
const float FULL = ${new Vec3(...COLORS.orange).subtract(new Vec3(...BG)).getMagnitude().toFixed(5)};

void main(void) {
  vec4 texel = texture2D(uSampler, vTextureCoord);
  if (texel.a < 0.5)
    discard;
  float strength = min(1.0, length(uMaterialDiffuse - BACKGROUND) / FULL);
  vec3 base;
  if (texel.g > 0.99) {
    // Glowing eyes: eerie spectral ectoplasm when lurking, flaring into blazing hellfire crimson when enraged
    vec3 spectralEye = vec3(0.42, 0.96, 0.78);
    vec3 rageEye = vec3(1.0, 0.22, 0.34);
    float rage = clamp((uGlare - 0.3) / 0.7, 0.0, 1.0);
    base = mix(spectralEye, rageEye, rage) * (0.65 + 0.55 * uGlare);
  } else if (texel.b > 0.99) {
    // Visceral gore when blown apart: dark clotted crimson to deep arterial red
    vec3 clot = vec3(0.18, 0.01, 0.02);
    vec3 arterial = mix(vec3(0.46, 0.02, 0.04), BLOOD, texel.r);
    base = mix(clot, arterial, clamp((texel.r - 0.35) * 1.35, 0.0, 1.0));
  } else {
    base = texel.rgb;
  }
  vec3 color = mix(BACKGROUND, base, strength);
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade * 0.9);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA});
}
`;

const MONSTER_VERTEX = `
attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aTextureCoord;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;
varying float vDepth;
varying vec2 vTextureCoord;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main(void) {
  vec4 world = uModelMatrix * vec4(aVertexPosition, 1.0);
  vec4 v = uViewMatrix * world;
  vDepth = -v.z;
  vTextureCoord = aTextureCoord;
  vWorldPos = world.xyz;
  vNormal = normalize(uNormalMatrix * aVertexNormal);
  gl_Position = uProjectionMatrix * v;
}
`;

const MONSTER_FRAGMENT = `
precision mediump float;
uniform sampler2D uSampler;
uniform vec3 uMaterialDiffuse;
uniform float uGlare;
uniform int uHasFog;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vDepth;
varying vec2 vTextureCoord;
varying vec3 vWorldPos;
varying vec3 vNormal;

const vec3 BACKGROUND = vec3(${BG.map((v) => v.toFixed(5)).join(', ')});
const vec3 BLOOD = vec3(${COLORS.red.map((v) => v.toFixed(5)).join(', ')});
const float FULL = ${new Vec3(...COLORS.orange).subtract(new Vec3(...BG)).getMagnitude().toFixed(5)};

${LIGHT_GLSL}
void main(void) {
  vec4 texel = texture2D(uSampler, vTextureCoord);
  if (texel.a < 0.5)
    discard;
  float strength = length(uMaterialDiffuse - BACKGROUND) / FULL;
  vec3 base;
  float emissive = 0.0;
  if (texel.g > 0.99) {
    vec3 spectralEye = vec3(0.42, 0.96, 0.78);
    vec3 rageEye = vec3(1.0, 0.22, 0.34);
    float rage = clamp((uGlare - 0.3) / 0.7, 0.0, 1.0);
    base = mix(spectralEye, rageEye, rage) * (0.72 + 0.62 * uGlare);
    emissive = 1.0;
  } else if (texel.b > 0.99) {
    vec3 clot = vec3(0.18, 0.01, 0.02);
    vec3 arterial = mix(vec3(0.46, 0.02, 0.04), BLOOD, texel.r);
    base = mix(clot, arterial, clamp((texel.r - 0.35) * 1.35, 0.0, 1.0));
  } else {
    base = texel.rgb;
  }
  vec3 n = normalize(vNormal);
  float relief = 0.74 + 0.22 * n.y + 0.14 * abs(n.x) + 0.08 * max(0.0, n.z);
  vec3 sceneLit = mix(vec3(0.76), surfaceLight(vWorldPos, emissive), 0.52) * relief;
  vec3 shaded = base * mix(sceneLit, vec3(1.15), emissive) * clamp(strength, 0.05, 1.6);
  vec3 color = mix(BACKGROUND, shaded, min(1.0, strength));
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade * 0.9);
  }
  gl_FragColor = vec4(color, emissive > 0.5 ? 1.0 : ${SOLID_ALPHA.toFixed(1)});
}
`;

const VIEWMODEL_VERTEX = `
attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aTextureCoord;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;
varying vec2 vTextureCoord;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main(void) {
  vec4 world = uModelMatrix * vec4(aVertexPosition, 1.0);
  vec4 v = uViewMatrix * world;
  vTextureCoord = aTextureCoord;
  vWorldPos = world.xyz;
  vNormal = normalize(uNormalMatrix * aVertexNormal);
  vec4 clip = uProjectionMatrix * v;
  clip.z = mix(-clip.w * 0.96, clip.z, 0.08);
  gl_Position = clip;
}
`;

const VIEWMODEL_FRAGMENT = `
precision mediump float;
uniform sampler2D uSampler;
uniform vec3 uMaterialDiffuse;
varying vec2 vTextureCoord;
varying vec3 vWorldPos;
varying vec3 vNormal;

${LIGHT_GLSL}
void main(void) {
  vec4 texel = texture2D(uSampler, vTextureCoord);
  if (texel.a < 0.5)
    discard;
  vec3 n = normalize(vNormal);
  float relief = 0.72 + 0.24 * n.y + 0.14 * abs(n.x) + 0.1 * max(0.0, -n.z);
  vec3 sceneLit = mix(vec3(0.84), surfaceLight(vWorldPos, 0.0), 0.48) * relief;
  vec3 color = texel.rgb * uMaterialDiffuse * sceneLit;
  gl_FragColor = vec4(color, ${SOLID_ALPHA.toFixed(1)});
}
`;

const POST_VERTEX = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
varying vec2 vTextureCoord;

void main(void) {
  vTextureCoord = aTextureCoord;
  gl_Position = vec4(aVertexPosition, 0.0, 1.0);
}
`;

// The neon look is made in three cheap passes instead of one expensive one:
//  1. CORE (full resolution): thickens the 1px GL lines with four taps.
//  2. DOWN (a small target): averages the scene into a much smaller texture, where blurring is nearly free.
//  3. GLOW (full resolution, additive): adds that small texture back, smoothly upscaled by the GPU.
const BG_GLSL = `const vec3 BG = vec3(${BG.map((v) => v.toFixed(5)).join(', ')});`;

const CORE_FRAGMENT = `
precision mediump float;
uniform sampler2D uSampler;
uniform vec2 uScreenResolution;
varying vec2 vTextureCoord;

${BG_GLSL}

// solid surfaces (floor, walls, doors, barrels) are marked in alpha and are neither thickened nor made to glow
bool solid(vec4 texel) {
  return texel.a > 0.25 && texel.a < 0.75;
}

vec3 tap(vec2 offset) {
  vec4 texel = texture2D(uSampler, vTextureCoord + offset / uScreenResolution);
  return solid(texel) ? vec3(0.0) : max(texel.rgb - BG, 0.0);
}

void main(void) {
  vec4 here = texture2D(uSampler, vTextureCoord);
  if (solid(here)) {
    gl_FragColor = vec4(here.rgb, 1.0);
    return;
  }
  float s = max(uScreenResolution.y / 760.0, 1.0);
  vec3 line = tap(vec2(0.0));
  line = max(line, tap(vec2(1.0, 0.0) * s) * 0.9);
  line = max(line, tap(vec2(-1.0, 0.0) * s) * 0.9);
  line = max(line, tap(vec2(0.0, 1.0) * s) * 0.9);
  line = max(line, tap(vec2(0.0, -1.0) * s) * 0.9);
  gl_FragColor = vec4(BG + line, 1.0);
}
`;

// Four bilinear taps average the whole span x span block of scene pixels under each small pixel.
// The result is boosted so that faint, thin lines survive the 8-bit target; GLOW takes the boost out again.
const DOWN_BOOST = 8;

const DOWN_FRAGMENT = `
precision mediump float;
uniform sampler2D uSampler;
uniform vec2 uSourceTexel;
uniform float uSpan;
varying vec2 vTextureCoord;

${BG_GLSL}

vec3 tap(vec2 offset) {
  vec4 texel = texture2D(uSampler, vTextureCoord + offset * uSourceTexel);
  // a solid surface (marked in alpha) gives no glow
  return texel.a > 0.25 && texel.a < 0.75 ? vec3(0.0) : max(texel.rgb - BG, 0.0);
}

void main(void) {
  float h = uSpan * 0.25;
  vec3 sum = tap(vec2(-h, -h)) + tap(vec2(h, -h)) + tap(vec2(-h, h)) + tap(vec2(h, h));
  gl_FragColor = vec4(min(sum * 0.25 * ${DOWN_BOOST.toFixed(1)}, 1.0), 1.0);
}
`;

const GLOW_STRENGTH = 2.8;

const GLOW_FRAGMENT = `
precision mediump float;
uniform sampler2D uSampler;
uniform vec2 uGlowTexel;
varying vec2 vTextureCoord;

vec3 tap(vec2 offset) {
  return texture2D(uSampler, vTextureCoord + offset * uGlowTexel).rgb;
}

void main(void) {
  vec3 glow = tap(vec2(0.0)) * 0.34;
  glow += (tap(vec2(1.5, 0.0)) + tap(vec2(-1.5, 0.0)) + tap(vec2(0.0, 1.5)) + tap(vec2(0.0, -1.5))) * 0.12;
  glow += (tap(vec2(1.2, 1.2)) + tap(vec2(-1.2, 1.2)) + tap(vec2(1.2, -1.2)) + tap(vec2(-1.2, -1.2))) * 0.045;
  gl_FragColor = vec4(glow * ${(GLOW_STRENGTH / DOWN_BOOST).toFixed(4)}, 1.0);
}
`;

const BG_VEC = new Vec3(BG[0], BG[1], BG[2]);
const scratchPos = new Vec3();
const scratchRot = new Vec3();
const scratchScale = new Vec3();
const tintScratch = new Vec3();
const scratchForward = new Vec3();
const scratchRight = new Vec3();
const scratchUp = new Vec3();
const scratchQuat = new Quat();
const scratchLocalQuat = new Quat();

function setPos(node, x, y, z) {
  scratchPos.setScalar(x, y, z);
  node.setPosition(scratchPos);
}

function setRot(node, x, y, z) {
  scratchRot.setScalar(x, y, z);
  node.setRotation(scratchRot);
}

function setUniformScale(node, s) {
  scratchScale.setScalar(s, s, s);
  node.setScale(scratchScale);
}

function setScale(node, x, y, z) {
  scratchScale.setScalar(x, y, z);
  node.setScale(scratchScale);
}

/** Fades a colour towards the background. Writes straight into the material, so a frame allocates nothing. */
function tint(material, color, amount) {
  tintScratch.setScalar(
    Utils.lerp(BG[0], color[0], amount),
    Utils.lerp(BG[1], color[1], amount),
    Utils.lerp(BG[2], color[2], amount)
  );
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
    this.barrelViews = new Map();
    this.shotViews = new Map();
    this.effectViews = new Map();
    this.staticMeshes = [];
    this.slimeMesh = null;
    this.chainsawView = null;
    this.chaingunView = null;
    this.shotgunView = null;
    this.rocketLauncherView = null;
    this.droplets = null;
    this.splatters = null;
    this.splatVersion = -1;
    this.splatCache = new WeakMap();
    this.dripCache = new WeakMap();
    this.syncStamp = 0;
    this.lightFixtures = [];
    this.ceilingLights = [];
    this.ambientLight = null;
    this.cutaway = false;
    this.cutawayNearFar = new Vec2(NEAR, 8000);
    this.ceilingMesh = null;
    this.roofSolidMesh = null;
    this.lightConesMesh = null;
    this.wallTopsMesh = null;
  }

  /** Toggles architectural roof cutaway for 3D overhead diorama inspection while preserving full wall top caps. */
  setCutaway(cutaway, nearFar = new Vec2(NEAR, 8000)) {
    this.cutaway = Boolean(cutaway);
    this.cutawayNearFar.copy(nearFar);
    if (this.ceilingMesh) {
      if (this.cutaway)
        this.ceilingMesh.setInactive();
      else
        this.ceilingMesh.setActive();
    }
    if (this.roofSolidMesh) {
      if (this.cutaway)
        this.roofSolidMesh.setInactive();
      else
        this.roofSolidMesh.setActive();
    }
    if (this.lightConesMesh) {
      if (this.cutaway)
        this.lightConesMesh.setInactive();
      else
        this.lightConesMesh.setActive();
    }
    if (this.wallTopsMesh) {
      if (this.cutaway)
        this.wallTopsMesh.setActive();
      else
        this.wallTopsMesh.setInactive();
    }
    if (this.ambientLight)
      this.ambientLight.setColor(this.cutaway ? new Vec3(0.95, 1.0, 1.08) : CEILING_AMBIENT_COLOR);
    const activeNearFar = this.cutaway ? this.cutawayNearFar : new Vec2(NEAR, FAR);
    this.camera.setNearFar(activeNearFar);
    this.camera.setProjectionMatrix(this.viewportSize);
    this.scene.setFog(BG_VEC, this.cutaway ? activeNearFar.y * 0.65 : FOG_NEAR, this.cutaway ? activeNearFar.y * 1.25 : FOG_FAR);
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
    for (const target of [this.target, this.glowTarget])
      target.restore();
    this.downQuad.WebGLTexture = this.target.texture;
    this.quad.WebGLTexture = this.target.texture;
    this.glowQuad.WebGLTexture = this.glowTarget.texture;
    for (const scene of [this.scene, this.down, this.post])
      scene.restore();
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
    mesh.setTexture(atlas.data, {
      size: new Vec2(atlas.width, atlas.height),
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
    mesh.setTexture(atlas.data, {
      size: new Vec2(atlas.width, atlas.height),
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
    const batch = new QuadBatch(this.gl, { capacity, atlas, material });
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
    this.barrelViews.clear();
    this.shotViews.clear();
    this.effectViews.clear();
    this.staticMeshes = [];
    this.slimeMesh = null;
    this.knifeView = null;
    this.chainsawView = null;
    this.chaingunView = null;
    this.shotgunView = null;
    this.rocketLauncherView = null;
    this.level = level;
    this.lightFixtures = ceilingLightFixtures(level);
    const { ambient, pointLights } = createCeilingLights(this.scene);
    this.ambientLight = ambient;
    this.ceilingLights = pointLights;
    this.buildStatic(level);
    for (const door of level.doors.values())
      this.buildDoor(door);
    for (const crusher of level.crushers)
      this.buildCrusher(crusher);

    // blood: droplets move every frame, splats are rewritten only when the game adds or drops one
    this.bloodTexture ??= bloodAtlas();
    this.droplets = new QuadBatch(this.gl, {
      capacity: BLOOD.particles,
      atlas: this.bloodTexture,
      vertex: PARTICLE_VERTEX,
      fragment: PARTICLE_FRAGMENT,
    });
    this.splatters = new QuadBatch(this.gl, { capacity: BLOOD.floor + BLOOD.gibs + BLOOD.walls + BLOOD.ceiling + BLOOD.prints, atlas: this.bloodTexture, material: this.splatMaterial() });
    // the drips running down the walls: a stem and a drop each, redrawn while they move
    this.drips = new QuadBatch(this.gl, { capacity: BLOOD.walls * 6 * 6, atlas: this.bloodTexture, material: this.splatMaterial() });
    this.dripVersion = -1;
    this.dripsLive = false;
    // bullet holes and chainsaw marks sit on the wall behind any blood splats or drips
    this.impactPixels ??= impactAtlas();
    this.holes = new QuadBatch(this.gl, { capacity: BLOOD.holes, atlas: this.impactPixels });
    this.scene.addMesh(this.holes);
    this.holesVersion = -1;
    this.scene.addMesh(this.droplets);
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
      const quad = this.cachedQuad(hole, holeQuad);
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
  syncDoorMarks(door, blood) {
    let marks = this.doorMarks.get(door);
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
      const quad = holeQuad({
        ...mark,
        x: mark.x - mark.nx * inset,
        y: mark.y - mark.ny * inset,
        z: mark.z - drop,
        top: mark.top * height,
      });
      if (quad)
        holes.quad(quad.corners, quad.uv);
    }
    holes.end();
    const batch = marks.splats.begin();
    for (const mark of blood.walls) {
      if (mark.door !== door)
        continue;
      const sunk = {
        ...mark,
        x: mark.x - mark.nx * inset,
        y: mark.y - mark.ny * inset,
        z: mark.z - drop,
        top: mark.top * height,
      };
      const quad = wallSplatQuad(sunk);
      if (quad)
        batch.quad(quad.corners, quad.uv);
      for (const drip of wallDripQuads(sunk))
        batch.quad(drip.corners, drip.uv);
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
  syncParticleSprites(blood) {
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
    const right = [scratchRight.x, scratchRight.y, scratchRight.z];
    const up = [scratchUp.x, scratchUp.y, scratchUp.z];

    const drops = this.droplets.begin();
    for (const p of blood.particles) {
      const quad = particleQuad(p, right, up, p.gib ? p.age * 9 : p.age * 4 + p.vx);
      if (!drops.quad(quad.corners, quad.uv))
        break;
    }
    drops.end();
  }

  syncSplatSprites(blood) {
    const batch = this.splatters.begin();
    const add = (quad) => quad && batch.quad(quad.corners, quad.uv);
    for (const splat of blood.floor)
      add(this.cachedQuad(splat, floorSplatQuad));
    for (const gib of blood.gibs)
      add(this.cachedQuad(gib, floorGibQuad));
    for (const splat of blood.walls) {
      if (!splat.door)
        add(this.cachedQuad(splat, wallSplatQuad));
    }
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
      let quads;
      if (splat.age >= splat.dripTime) {
        quads = this.dripCache.get(splat);
        if (!quads) {
          quads = wallDripQuads(splat);
          this.dripCache.set(splat, quads);
        }
      } else
        quads = wallDripQuads(splat);
      for (const drip of quads)
        batch.quad(drip.corners, drip.uv);
    }
    batch.end();
  }

  syncBlood(blood) {
    this.syncParticleSprites(blood);

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
        const base = level.inBounds(nx, ny) && kind[nidx] !== DOOR && level.hasCardinalFace(nidx, d ^ 1) ? baseHeight[nidx] : 0;
        const along = d < 2 ? y : x;
        const group = groups.get(id) ?? { d, kind: kind[idx], top: Math.min(baseHeight[idx], ROOF), base: Math.min(base, ROOF), x, y, from: along, to: along };
        group.from = Math.min(group.from, along);
        group.to = Math.max(group.to, along);
        groups.set(id, group);
      }
    }

    const faces = [];
    const hide = [];
    const solid = (x, y) => level.inBounds(x, y) && (kind[y * width + x] === WALL || kind[y * width + x] === EXIT);
    for (const group of groups.values()) {
      const { d, top, base } = group;
      const axis = d < 2 ? 'x' : 'z';
      const plane = (d === 0 ? group.x : d === 1 ? group.x + 1 : d === 2 ? group.y : group.y + 1) * TILE;
      const a0 = group.from * TILE;
      const a1 = (group.to + 1) * TILE;
      const inward = d === 0 || d === 2 ? 0.9 : -0.9;
      const offset = axis === 'x' ? [inward, 0, 0] : [0, 0, inward];
      const nx = group.x + (d === 0 ? -1 : d === 1 ? 1 : 0);
      const ny = group.y + (d === 2 ? -1 : d === 3 ? 1 : 0);

      // the hiding faces run a little past interior (concave) corners so two of them meeting overlap and leave no crack,
      // while stopping flush at exterior corners and door jambs so they never protrude in front of adjacent walls
      const lap0 = (d < 2 ? solid(nx, group.from - 1) : solid(group.from - 1, ny)) ? 1.2 : 0;
      const lap1 = (d < 2 ? solid(nx, group.to + 1) : solid(group.to + 1, ny)) ? 1.2 : 0;
      const lap = (y0, y1) => faceCorners(axis, plane, a0 - lap0, a1 + lap1, y0, y1);
      hide.push(...quadTriangles(lap(base, top), offset));
      // the wall carries on up to the roof, without being drawn; a low pillar does not, it has sky above,
      // and nor does a face looking into the giant's room, which is open to the sky
      const roofless = level.arena?.has(ny * width + nx);
      const toRoof = group.kind !== PILLAR && top < ROOF && !roofless;
      if (toRoof)
        hide.push(...quadTriangles(lap(top, ROOF), offset));
      // the textured wall goes right up to the ceiling, so there is no gap between them
      faces.push(...wallFaceQuads({ axis, plane, from: group.from, to: group.to, base, top: toRoof ? ROOF : top, x: group.x, y: group.y, d, exit: group.kind === EXIT }));
    }

    for (let idx = 0; idx < kind.length; idx++) {
      const df = level.diagInfo(idx);
      if (!df)
        continue;
      const top = Math.min(baseHeight[idx], ROOF);
      const tx = (df.bx - df.ax) / TILE;
      const ty = (df.by - df.ay) / TILE;
      const offset = [-df.nx * 0.9, 0, -df.ny * 0.9];
      const lap = (y0, y1) => [
        [df.ax - tx * 1.2, y0, df.ay - ty * 1.2],
        [df.bx + tx * 1.2, y0, df.by + ty * 1.2],
        [df.bx + tx * 1.2, y1, df.by + ty * 1.2],
        [df.ax - tx * 1.2, y1, df.ay - ty * 1.2],
      ];
      hide.push(...quadTriangles(lap(0, top), offset));
      const roofless = level.arena?.has(idx);
      const toRoof = kind[idx] !== PILLAR && top < ROOF && !roofless;
      if (toRoof)
        hide.push(...quadTriangles(lap(top, ROOF), offset));
      faces.push(...diagWallFaceQuads({ ax: df.ax, ay: df.ay, bx: df.bx, by: df.by, base: 0, top: toRoof ? ROOF : top, x: df.x, y: df.y, diag: df.diag, exit: kind[idx] === EXIT }));
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
          ? faceCorners('z', (y + end) * TILE, x * TILE, (x + 1) * TILE, top, ROOF)
          : faceCorners('x', (x + end) * TILE, y * TILE, (y + 1) * TILE, top, ROOF);
        hide.push(...quadTriangles(corners, alongY ? [0, 0, inset] : [inset, 0, 0]));
        // and the lintel is textured wall as well
        faces.push(...wallFaceQuads(alongY
          ? { axis: 'z', plane: (y + end) * TILE, from: x, to: x, base: top, top: ROOF, x, y, d: 2 + end, exit: false }
          : { axis: 'x', plane: (x + end) * TILE, from: y, to: y, base: top, top: ROOF, x, y, d: end, exit: false }));
      }
    }

    // and the ceiling closes the roof over everything
    // (except over the giant's room: one strip of ceiling per row, with a gap wherever that room is)
    const roofHide = [];
    for (let y = 0; y < rowCount; y++) {
      let start = 0;
      for (let x = 0; x <= width; x++) {
        const roofed = x < width && !level.arena?.has(y * width + x);
        if (roofed)
          continue;
        if (x > start)
          roofHide.push(...quadTriangles([[start * TILE, ROOF, y * TILE], [x * TILE, ROOF, y * TILE], [x * TILE, ROOF, (y + 1) * TILE], [start * TILE, ROOF, (y + 1) * TILE]]));
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
          ? [df.sx, top, df.sy, df.ax, top, df.ay, df.bx, top, df.by, df.sx, top, df.sy]
          : [x * TILE, top, y * TILE, (x + 1) * TILE, top, y * TILE, (x + 1) * TILE, top, (y + 1) * TILE, x * TILE, top, (y + 1) * TILE];
        wallTops.push({ corners, uv: wallCellUv(WALL_CELLS.top) });
        continue;
      }
      const h = baseHeight[idx] - 0.9;
      const top = baseHeight[idx] - 0.3;
      const corners = df
        ? [df.sx, top, df.sy, df.ax, top, df.ay, df.bx, top, df.by, df.sx, top, df.sy]
        : [x * TILE, top, y * TILE, (x + 1) * TILE, top, y * TILE, (x + 1) * TILE, top, (y + 1) * TILE, x * TILE, top, (y + 1) * TILE];
      faces.push({ corners, uv: wallCellUv(WALL_CELLS.top) });
      if (df)
        hide.push(df.sx, h, df.sy, df.ax, h, df.ay, df.bx, h, df.by);
      else
        hide.push(
          x * TILE, h, y * TILE, (x + 1) * TILE, h, y * TILE, (x + 1) * TILE, h, (y + 1) * TILE,
          x * TILE, h, y * TILE, (x + 1) * TILE, h, (y + 1) * TILE, x * TILE, h, (y + 1) * TILE
        );
    }

    this.track(this.floorBatch(level), this.staticMeshes);
    this.slimeMesh = this.track(this.slimeBatch(level), this.staticMeshes);
    this.teleporterMesh = this.track(this.teleporterBatch(level), this.staticMeshes);
    this.ceilingMesh = this.track(this.ceilingBatch(level), this.staticMeshes);
    this.track(this.solid(hide), this.staticMeshes);
    this.roofSolidMesh = roofHide.length ? this.track(this.solid(roofHide), this.staticMeshes) : null;
    this.track(this.wallBatch(faces), this.staticMeshes);
    this.wallTopsMesh = wallTops.length ? this.track(this.wallBatch(wallTops), this.staticMeshes) : null;
    if (this.wallTopsMesh)
      this.wallTopsMesh.setInactive();
    this.lightConesMesh = this.lightFixtures.length
      ? this.track(this.lightConesBatch(this.lightFixtures), this.staticMeshes)
      : null;
    if (this.cutaway)
      this.setCutaway(true, this.cutawayNearFar);
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
  ceilingBatch(level) {
    const { gl } = this;
    this.ceilingPixels ??= ceilingAtlas();
    const batch = new QuadBatch(gl, {
      capacity: level.width * level.rowCount,
      atlas: this.ceilingPixels,
      vertex: FLOOR_VERTEX,
      fragment: CEILING_FRAGMENT,
      textureOptions: { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST },
    });
    // just under the invisible roof, so the roof never hides it
    const y = ROOF - 1.2;
    batch.begin();
    for (let ty = 0; ty < level.rowCount; ty++) {
      for (let tx = 0; tx < level.width; tx++) {
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

  /** The faces of the walls, one quad per tile and per 64 units up, in one mesh: steel bulkheads, rusted like the doors. */
  wallBatch(faces) {
    const { gl } = this;
    this.wallPixels ??= wallAtlas();
    const batch = new QuadBatch(gl, {
      capacity: Math.max(1, faces.length),
      atlas: this.wallPixels,
      // the rust of the doors: many small patches, thicker low down, worked out on the wall itself
      vertex: DOOR_VERTEX,
      fragment: WALL_FRAGMENT,
      textureOptions: { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST },
    });
    batch.begin();
    for (const face of faces)
      batch.quad(face.corners, face.uv);
    return batch.end();
  }

  /** One quad per walkable tile, each showing one of the deck's patterns, drawn as a single mesh. */
  floorBatch(level) {
    const { gl } = this;
    this.floorPixels ??= floorAtlas();
    const batch = new QuadBatch(gl, {
      capacity: level.width * level.rowCount,
      atlas: this.floorPixels,
      // rust is worked out in the shader, from where each pixel is in the world, so it carries on across tiles
      vertex: FLOOR_VERTEX,
      fragment: FLOOR_FRAGMENT,
      // mipmaps keep the far floor from shimmering; close up the texels stay crisp
      textureOptions: { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST },
    });
    // just under the blood, so it sits on the floor
    const y = -0.2;
    batch.begin();
    for (let ty = 0; ty < level.rowCount; ty++) {
      for (let tx = 0; tx < level.width; tx++) {
        const idx = ty * level.width + tx;
        const kind = level.kind[idx];
        if ((kind !== FLOOR && kind !== DOOR && !level.diag[idx]) || level.slime[idx] || level.teleporter?.[idx])
          continue;
        const x0 = tx * TILE;
        const x1 = x0 + TILE;
        const z0 = ty * TILE;
        const z1 = z0 + TILE;
        batch.quad([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0], floorCellUv(floorCellFor(tx, ty, kind === DOOR && !level.doors.get(idx)?.secret)));
      }
    }
    return batch.end();
  }

  /** Radioactive slime floor tiles: glowing, churning green nukage vats and channels. */
  slimeBatch(level) {
    const { gl } = this;
    this.slimePixels ??= slimeAtlas();
    const batch = new QuadBatch(gl, {
      capacity: Math.max(1, level.width * level.rowCount),
      atlas: this.slimePixels,
      vertex: FLOOR_VERTEX,
      fragment: SLIME_FRAGMENT,
      textureOptions: { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST, wrapS: gl.REPEAT, wrapT: gl.REPEAT },
    });
    batch.addCustomUniform('time', 'uniform1f', 0);
    const y = -0.35;
    batch.begin();
    for (let ty = 0; ty < level.rowCount; ty++) {
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
    for (let ty = 0; ty < level.rowCount; ty++) {
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
    }
    const batch = new QuadBatch(gl, {
      capacity: Math.max(1, allQuads.length),
      atlas: this.teleporterPixels,
      vertex: FLOOR_VERTEX,
      fragment: TELEPORTER_FRAGMENT,
      textureOptions: { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST },
    });
    batch.addCustomUniform('time', 'uniform1f', 0);
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
    root.setTexture(atlas.data, {
      size: new Vec2(atlas.width, atlas.height),
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
    root.setTexture(this.doorPixels.data, {
      size: new Vec2(this.doorPixels.width, this.doorPixels.height),
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
  updateEnemy(enemy, view, player, time, game = null) {
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

  buildPickup(pickup) {
    const { gl } = this;
    const keyColor = pickup.type === 'redKey' ? 'red' : pickup.type === 'yellowKey' ? 'yellow' : pickup.type === 'blueKey' ? 'blue' : null;
    const armorColor = pickup.type === 'greenArmor' ? 'green' : pickup.type === 'blueArmor' ? 'blue' : null;
    const isSoulsphere = pickup.type === 'soulsphere';
    const isBerserk = pickup.type === 'berserk';
    const isRadsuit = pickup.type === 'radsuit';
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
    const root = texturedMesh(gl, geometry, {
      fragment: SOLID_TEXTURED_FRAGMENT,
      atlas,
      material: new Material({ diffuse: new Vec3(1, 1, 1) }),
      textureOptions: { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST },
    });
    this.scene.addMesh(root);
    return { root, spinSpeed: isChainsaw || isShotgun || isChaingun || isRocket ? 1.4 : 1.8 };
  }

  /** An oil drum: ribbed sides, a zig-zag hazard band, and a lid. It is orange because it hurts. */
  buildBarrel() {
    const R = 9.5;
    const H = 26;
    // an orange oil drum: a RoostR cylinder in its skin, standing on its base. It is opaque, so it hides what is
    // behind it, and it is all there is of it: no lines over it
    const { gl } = this;
    this.barrelPixels ??= barrelAtlas();
    const cylinder = skinBarrel(new Cylinder(new Vec2(R * 0.985, R * 0.985), H, 20, 1, false), 20, 1);
    for (let i = 1; i < cylinder.vertices.length; i += 3)
      cylinder.vertices[i] += H / 2;
    const skinMaterial = new Material({ diffuse: new Vec3(1, 1, 1) });
    const root = texturedMesh(gl, cylinder, {
      fragment: SOLID_TEXTURED_FRAGMENT,
      atlas: this.barrelPixels,
      material: skinMaterial,
      textureOptions: { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST },
    });
    this.scene.addMesh(root);
    return { root, skinMaterial };
  }

  buildShot() {
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

  buildEffect(effect) {
    // every effect is a sprite animation that faces the camera: fire for blasts, plasma for teleports, sparks for metal hits
    const spark = effect.type === 'spark';
    const boom = effect.type === 'boom';
    const teleport = effect.type === 'teleport';
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
      anchor: boom ? 'bottom' : 'center',
      billboard: boom ? 'cylindrical' : 'spherical',
      depthBias: boom ? 6 : 8,
      fragment: TEXTURED_FRAGMENT,
    });
    this.scene.addMesh(root);
    // each spark is one of several kinds, and it keeps it for its whole life
    return { root, material, spark, boom, teleport, kind: Rand.integer(0, SPARK_VARIANTS - 1) };
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

    if (this.slimeMesh)
      this.slimeMesh.setCustomUniform('time', time);
    if (this.teleporterMesh)
      this.teleporterMesh.setCustomUniform('time', time);

    for (const door of game.level.doors.values()) {
      const view = this.doorViews.get(door);
      const height = 1 - door.open;
      // the door slides down into the floor whole; the part below the floor is not drawn
      setPos(view, door.center.x, -door.open * game.level.baseHeight[door.idx], door.center.y);
      if (height > 0.02)
        view.setActive();
      else
        view.setInactive();
      this.syncDoorMarks(door, game.blood);
    }

    for (const crusher of game.level.crushers) {
      const view = this.crusherViews.get(crusher);
      if (view)
        setPos(view, crusher.center.x, crusher.low, crusher.center.y);
    }

    this.syncViews(
      this.enemyViews,
      game.enemies,
      (enemy) => this.buildEnemy(enemy),
      (enemy, view) => this.updateEnemy(enemy, view, player, time, game)
    );
    this.syncViews(this.pickupViews, game.pickups, (pickup) => this.buildPickup(pickup), (pickup, view) => {
      const bob = 1.5 + Math.sin(time * 3 + pickup.phase) * 1.2;
      setPos(view.root, pickup.pos.x, bob, pickup.pos.y);
      setRot(view.root, 0, time * view.spinSpeed + pickup.phase, 0);
    });
    this.syncViews(this.barrelViews, game.barrels, () => this.buildBarrel(), (barrel, view) => {
      // a barrel that has been set off flickers and shudders until it blows
      const burning = barrel.fuse >= 0;
      const skin = burning ? 0.8 + 0.6 * Math.abs(Math.sin(time * 70)) : 1;
      scratchPos.setScalar(skin, skin, skin);
      view.skinMaterial.setDiffuse(scratchPos);
      setPos(view.root, barrel.pos.x, 0, barrel.pos.y);
      setUniformScale(view.root, burning ? 1 + 0.05 * Math.sin(time * 90) : 1);
    }, (barrel) => !barrel.gone);
    this.syncViews(this.shotViews, game.shots, () => this.buildShot(), (shot, view) => {
      view.root.setFrame(Math.floor((time * 18) % FIREBALL_FRAMES));
      setPos(view.root, shot.pos.x, EYE - 4, shot.pos.y);
      const baseScale = shot.kind === 'rocket' ? 1.35 : 1;
      setUniformScale(view.root, baseScale * (1 + 0.08 * Math.sin(time * 24)));
    });
    this.syncViews(this.effectViews, game.effects, (effect) => this.buildEffect(effect), (effect, view) => {
      const progress = Math.min(0.999, effect.age / effect.life);
      if (view.spark) {
        const width = 19;
        view.root.setFrame(IMPACT_CELLS.spark + view.kind * SPARK_FRAMES + Math.floor(progress * SPARK_FRAMES));
        setPos(view.root, effect.x, effect.z, effect.y);
        setUniformScale(view.root, width);
        return;
      }
      // a barrel explosion sits flat on the floor and spreads wider horizontally than vertically; projectile blasts sit at impact height
      const width = explosionWidth(effect);
      view.root.setFrame(Math.min(EXPLOSION_FRAMES - 1, Math.floor(progress * EXPLOSION_FRAMES)));
      if (view.boom) {
        setPos(view.root, effect.x, -2, effect.y);
        setScale(view.root, width, width * 0.65, width);
      } else {
        setPos(view.root, effect.x, effect.z, effect.y);
        setUniformScale(view.root, width);
      }
    });

    this.updateCamera(game);
    this.updateKnife(game);
    this.updateChainsaw(game);
    this.updateChaingun(game);
    this.updateShotgun(game);
    this.updateRocketLauncher(game);
    updateCeilingLights(this.ceilingLights, this.lightFixtures, this.camera.position, time, game);
    this.syncBlood(game.blood);

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
    const pose = chainsawPose(
      {
        time: game.time ?? 0,
        bob: player.bob ?? 0,
        moving: player.moving ?? 0,
        recoil: player.recoil ?? 0,
        switchOffset,
        attacking,
      },
      view.pose
    );

    const cosA = Math.cos(player.angle);
    const sinA = Math.sin(player.angle);
    scratchForward.setScalar(cosA, 0, sinA);
    scratchRight.setScalar(-sinA, 0, cosA);
    scratchUp.setScalar(0, 1, 0);

    scratchPos
      .copy(this.camera.position)
      .addScaledVector(scratchRight, pose.offset.x)
      .addScaledVector(scratchUp, pose.offset.y)
      .addScaledVector(scratchForward, pose.offset.z);
    view.root.setPosition(scratchPos);

    scratchRot.setScalar(0, Trigo.halfpi - player.angle + pose.rotation.y, 0);
    scratchQuat.setFromEuler(scratchRot);
    scratchRot.setScalar(pose.rotation.x, 0, pose.rotation.z);
    scratchLocalQuat.setFromEuler(scratchRot);
    scratchQuat.multiply(scratchLocalQuat);
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
    const pose = chaingunPose(
      {
        time: game.time ?? 0,
        bob: player.bob ?? 0,
        moving: player.moving ?? 0,
        recoil: player.recoil ?? 0,
        switchOffset,
        attacking,
        spinDown,
      },
      view.pose
    );

    const flashBoost = attacking && (player.flash ?? 0) > 0 ? Math.min(1, player.flash / 0.08) * 0.38 : 0;
    tintScratch.setScalar(1 + flashBoost, 1 + flashBoost * 0.78, 1 + flashBoost * 0.42);
    view.material.setDiffuse(tintScratch);

    const cosA = Math.cos(player.angle);
    const sinA = Math.sin(player.angle);
    scratchForward.setScalar(cosA, 0, sinA);
    scratchRight.setScalar(-sinA, 0, cosA);
    scratchUp.setScalar(0, 1, 0);

    scratchPos
      .copy(this.camera.position)
      .addScaledVector(scratchRight, pose.offset.x)
      .addScaledVector(scratchUp, pose.offset.y)
      .addScaledVector(scratchForward, pose.offset.z);
    view.root.setPosition(scratchPos);

    scratchRot.setScalar(0, Trigo.halfpi - player.angle + pose.rotation.y, 0);
    scratchQuat.setFromEuler(scratchRot);
    scratchRot.setScalar(pose.rotation.x, 0, pose.rotation.z);
    scratchLocalQuat.setFromEuler(scratchRot);
    scratchQuat.multiply(scratchLocalQuat);
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
    const elapsed = isFiring && (player.cooldown ?? 0) > 0 ? 1.05 - player.cooldown : -1;
    const hasAmmo = (player.shells ?? player.ammo ?? 1) >= 1;
    const pose = shotgunPose(
      {
        time: game.time ?? 0,
        bob: player.bob ?? 0,
        moving: player.moving ?? 0,
        recoil: player.recoil ?? 0,
        switchOffset,
        elapsed,
        hasAmmo,
      },
      view.pose
    );

    const flashBoost =
      isFiring && ((player.flash ?? 0) > 0 || (elapsed >= 0 && elapsed < 0.1))
        ? Math.max(Math.min(1, (player.flash ?? 0) / 0.1), elapsed >= 0 && elapsed < 0.1 ? 1 - elapsed / 0.1 : 0) * 0.45
        : 0;
    tintScratch.setScalar(1 + flashBoost, 1 + flashBoost * 0.78, 1 + flashBoost * 0.42);
    view.material.setDiffuse(tintScratch);

    const cosA = Math.cos(player.angle);
    const sinA = Math.sin(player.angle);
    scratchForward.setScalar(cosA, 0, sinA);
    scratchRight.setScalar(-sinA, 0, cosA);
    scratchUp.setScalar(0, 1, 0);

    scratchPos
      .copy(this.camera.position)
      .addScaledVector(scratchRight, pose.offset.x)
      .addScaledVector(scratchUp, pose.offset.y)
      .addScaledVector(scratchForward, pose.offset.z);
    view.root.setPosition(scratchPos);

    scratchRot.setScalar(0, Trigo.halfpi - player.angle + pose.rotation.y, 0);
    scratchQuat.setFromEuler(scratchRot);
    scratchRot.setScalar(pose.rotation.x, 0, pose.rotation.z);
    scratchLocalQuat.setFromEuler(scratchRot);
    scratchQuat.multiply(scratchLocalQuat);
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
    const elapsed = isFiring && (player.cooldown ?? 0) > 0 ? 0.78 - player.cooldown : -1;
    const hasAmmo = (player.rockets ?? player.ammo ?? 1) >= 1;
    const pose = rocketLauncherPose(
      {
        time: game.time ?? 0,
        bob: player.bob ?? 0,
        moving: player.moving ?? 0,
        recoil: player.recoil ?? 0,
        switchOffset,
        elapsed,
        hasAmmo,
      },
      view.pose
    );

    const flashBoost =
      isFiring && ((player.flash ?? 0) > 0 || (elapsed >= 0 && elapsed < 0.14))
        ? Math.max(Math.min(1, (player.flash ?? 0) / 0.12), elapsed >= 0 && elapsed < 0.14 ? 1 - elapsed / 0.14 : 0) * 0.5
        : 0;
    tintScratch.setScalar(1 + flashBoost, 1 + flashBoost * 0.78, 1 + flashBoost * 0.42);
    view.material.setDiffuse(tintScratch);

    const cosA = Math.cos(player.angle);
    const sinA = Math.sin(player.angle);
    scratchForward.setScalar(cosA, 0, sinA);
    scratchRight.setScalar(-sinA, 0, cosA);
    scratchUp.setScalar(0, 1, 0);

    scratchPos
      .copy(this.camera.position)
      .addScaledVector(scratchRight, pose.offset.x)
      .addScaledVector(scratchUp, pose.offset.y)
      .addScaledVector(scratchForward, pose.offset.z);
    view.root.setPosition(scratchPos);

    scratchRot.setScalar(0, Trigo.halfpi - player.angle + pose.rotation.y, 0);
    scratchQuat.setFromEuler(scratchRot);
    scratchRot.setScalar(pose.rotation.x, 0, pose.rotation.z);
    scratchLocalQuat.setFromEuler(scratchRot);
    scratchQuat.multiply(scratchLocalQuat);
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
    const elapsed = isFiring && (player.cooldown ?? 0) > 0 ? 0.3 - player.cooldown : -1;
    const pose = knifePose(
      {
        time: game.time ?? 0,
        bob: player.bob ?? 0,
        moving: player.moving ?? 0,
        recoil: player.recoil ?? 0,
        switchOffset,
        elapsed,
        attack: player.knifeAttack ?? 'vertical',
      },
      view.pose
    );

    const cosA = Math.cos(player.angle);
    const sinA = Math.sin(player.angle);
    scratchForward.setScalar(cosA, 0, sinA);
    scratchRight.setScalar(-sinA, 0, cosA);
    scratchUp.setScalar(0, 1, 0);

    scratchPos
      .copy(this.camera.position)
      .addScaledVector(scratchRight, pose.offset.x)
      .addScaledVector(scratchUp, pose.offset.y)
      .addScaledVector(scratchForward, pose.offset.z);
    view.root.setPosition(scratchPos);

    scratchRot.setScalar(0, Trigo.halfpi - player.angle + pose.rotation.y, 0);
    scratchQuat.setFromEuler(scratchRot);
    scratchRot.setScalar(pose.rotation.x, 0, pose.rotation.z);
    scratchLocalQuat.setFromEuler(scratchRot);
    scratchQuat.multiply(scratchLocalQuat);
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
    const teleFlash = player.teleFlash ?? 0;
    if (teleFlash > 0) {
      const warp = Math.min(1, teleFlash / 0.65);
      camera.fov = this.baseFov * (1 + warp * warp * 0.2);
      camera.setProjectionMatrix(this.viewportSize);
      this.teleWarped = true;
    } else if (this.teleWarped) {
      this.teleWarped = false;
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
    camera.target.setScalar(
      camera.position.x + Math.cos(player.angle) * 100,
      eyeY - (dead ? drop * 2 : 0),
      camera.position.z + Math.sin(player.angle) * 100
    );
    camera.setViewMatrix();
  }
}
