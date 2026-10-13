import { CustomMesh, Cylinder, FullscreenQuad, Material, Mesh, PerspectiveCamera, Renderer, RenderTarget, Scene, Vec2, Vec3 } from '@1pizzateam/roostr';
import * as roostr from '@1pizzateam/roostr';
import { BLOOD } from './blood.js';
import { barrelAtlas, skinBarrel } from './barrel.js';
import { bloodAtlas, floorSplatQuad, particleQuad, printQuad, wallDripQuads, wallSplatQuad } from './bloodsprites.js';
import { DOOR_FRAGMENT, DOOR_VERTEX, WALL_FRAGMENT, doorAtlas, doorBox } from './door.js';
import { ceilingAtlas, ceilingCellFor, ceilingCellUv } from './ceiling.js';
import { WALL_CELLS, wallAtlas, wallCellUv, wallFaceQuads } from './wall.js';
import { EXPLOSION_FRAMES, explosionAtlas } from './explosion.js';
import { FLOOR_FRAGMENT, FLOOR_VERTEX, floorAtlas, floorCellFor, floorCellUv } from './floor.js';
import { CEILING, DOOR, EXIT, EYE, FLOOR, PILLAR, TILE, WALL } from './level.js';
import { boxEdges, faceCorners, merge, octahedronEdges, quadTriangles, segment } from './lines.js';
import { MONSTERS } from './monsters.js';
import { Overlay } from './overlay.js';
import { QuadBatch, SOLID_ALPHA, SOLID_TEXTURED_FRAGMENT, TEXTURED_FRAGMENT, texturedMesh } from './quads.js';
import { holeQuad, IMPACT_CELLS, impactAtlas, SPARK_FRAMES, SPARK_VARIANTS } from './impacts.js';

// Blue is the world, green is what helps you, orange is what hurts, red is blood.
const BG = [7 / 255, 9 / 255, 15 / 255];
const COLORS = {
  blue: [0x5b / 255, 0x8c / 255, 0xff / 255],
  green: [0x38 / 255, 0xc7 / 255, 0x93 / 255],
  orange: [0xff / 255, 0x9f / 255, 0x43 / 255],
  red: [0xe8 / 255, 0x10 / 255, 0x2c / 255],
};

// RoostR newer than 0.7.0 can be told the size of a buffer that is filled after creation, can rebuild its
// GPU objects after a lost context, and has a Sprite. With 0.7.0 the game still runs: without culling and recovery,
// and with a sprite made here (see FallbackSprite). Sprite is read from the namespace, because a named import of
// something 0.7.0 does not export would stop the whole page from loading.
const Sprite = roostr.Sprite;
const HAS_BOUNDS = typeof Mesh.prototype.setLocalBounds === 'function';
const HAS_RESTORE = typeof Scene.prototype.restore === 'function';

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
const float FULL = ${Math.hypot(...COLORS.orange.map((v, i) => v - BG[i])).toFixed(5)};

void main(void) {
  vec4 texel = texture2D(uSampler, vTextureCoord);
  if (texel.a < 0.5)
    discard;
  // red is how bright the pixel is, green marks the eyes, which flare with the monster's temper, and blue marks
  // flesh, which is red; both colours fade together as the monster does
  float light = texel.g > 0.5 ? uGlare : texel.r;
  float strength = min(1.0, length(uMaterialDiffuse - BACKGROUND) / FULL);
  vec3 base = texel.b > 0.5 ? mix(BACKGROUND, BLOOD, strength) : uMaterialDiffuse;
  vec3 color = mix(BACKGROUND, base, light);
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade * 0.9);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA});
}
`;

// What RoostR's Sprite does, for a RoostR that does not have one yet: the mesh position is where the sprite is, and its
// corners are laid out in view space, facing the camera ('spherical') or upright ('cylindrical').
const SPRITE_VERTEX = `
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform float uFrame;
uniform float uFrames;
uniform float uBillboard;
uniform float uDepthBias;
varying float vDepth;
varying vec2 vTextureCoord;

void main(void) {
  vec3 origin = (uViewMatrix * uModelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 right = vec3(1.0, 0.0, 0.0);
  if (uBillboard > 1.5) {
    up = normalize((uViewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
    vec3 across = cross(origin, up);
    if (length(across) > 0.0001)
      right = normalize(across);
  }
  float scaleX = length(uModelMatrix[0].xyz);
  float scaleY = length(uModelMatrix[1].xyz);
  vec3 v = origin + right * aVertexPosition.x * scaleX + up * aVertexPosition.y * scaleY;
  vDepth = -v.z;
  vTextureCoord = vec2((uFrame + aTextureCoord.x) / uFrames, aTextureCoord.y);
  vec4 clip = uProjectionMatrix * vec4(v, 1.0);
  // only the depth moves: the picture stays where it is and as big as it is
  float bias = min(uDepthBias, max(0.0, vDepth - 1.0));
  if (bias > 0.0) {
    vec4 nearer = uProjectionMatrix * vec4(v.xy, v.z + bias, 1.0);
    clip.z = nearer.z / nearer.w * clip.w;
  }
  gl_Position = clip;
}
`;

class FallbackSprite extends Mesh {
  constructor(gl, { width, height, texture, textureOptions, frames, anchor, billboard, depthBias, material, fragment }) {
    const geometry = new CustomMesh();
    const x = width / 2;
    const y0 = anchor === 'bottom' ? 0 : -height / 2;
    const y1 = anchor === 'bottom' ? height : height / 2;
    geometry.setVertices([-x, y0, 0, x, y0, 0, x, y1, 0, -x, y0, 0, x, y1, 0, -x, y1, 0]);
    geometry.setUvs([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]);
    geometry.setPrimitive('TRIANGLES');
    super(gl, geometry);
    this.addProgram(SPRITE_VERTEX, fragment, material);
    this.addCustomUniform('frame', 'uniform1f', 0);
    this.addCustomUniform('frames', 'uniform1f', frames);
    this.addCustomUniform('billboard', 'uniform1f', billboard === 'cylindrical' ? 2 : 1);
    this.addCustomUniform('depthBias', 'uniform1f', depthBias ?? 0);
    this.setTexture(texture, textureOptions);
  }

  setFrame(frame) {
    this.setCustomUniform('frame', frame);
    return this;
  }
}

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

/** Fades a colour towards the background. Writes straight into the material, so a frame allocates nothing. */
function tint(material, color, amount) {
  material.setDiffuse(BG[0] + (color[0] - BG[0]) * amount, BG[1] + (color[1] - BG[1]) * amount, BG[2] + (color[2] - BG[2]) * amount);
}

/** How wide an explosion sprite is: the big one is as wide as its blast is far, a puff is small, the others depend on how high they are. */
function explosionWidth(effect) {
  if (effect.type === 'blast')
    return 24;
  return effect.type === 'boom' ? 280 : 70 + effect.z * 1.2;
}

/** RoostR scene for the 3D world: wall faces, doors, enemies, pickups and projectiles are all line meshes. */
export class World {
  /** `events.onLost` and `events.onRestored` fire when the browser drops and gives back the GPU context. */
  constructor(canvas, events = {}) {
    this.lost = false;
    this.renderer = new Renderer(canvas, {
      width: canvas.width,
      height: canvas.height,
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

    this.scene = new Scene({ context: gl, clearColor: BG, depthTest: true, enableFrustumCulling: HAS_BOUNDS, viewport: { x: 0, y: 0, width: 1, height: 1 } });
    this.scene.setFog(new Vec3(BG[0], BG[1], BG[2]), FOG_NEAR, FOG_FAR);
    this.camera = new PerspectiveCamera(60, NEAR, FAR, gl);
    this.camera.up.setScalar(0, 1, 0);

    // post-processing, all with RoostR render targets and full-screen quads
    this.postCamera = new PerspectiveCamera(45, 0.1, 10, gl);
    this.target = new RenderTarget(1, 1, gl);
    this.glowTarget = new RenderTarget(1, 1, gl);
    this.glowDivisor = 4;

    this.down = new Scene({ context: gl, clearColor: BG, viewport: { x: 0, y: 0, width: 1, height: 1 } });
    this.downQuad = this.screenQuad(DOWN_FRAGMENT, this.target.texture);
    this.downQuad.addCustomUniform('sourceTexel', 'uniform2f', new Vec2(1, 1));
    this.downQuad.addCustomUniform('span', 'uniform1f', 4);
    this.down.addMesh(this.downQuad);

    this.post = new Scene({ context: gl, clearColor: BG, viewport: { x: 0, y: 0, width: 1, height: 1 } });
    this.quad = this.screenQuad(CORE_FRAGMENT, this.target.texture);
    this.glowQuad = this.screenQuad(GLOW_FRAGMENT, this.glowTarget.texture);
    this.glowQuad.addCustomUniform('glowTexel', 'uniform2f', new Vec2(1, 1));
    this.glowQuad.setBlend('ONE', 'ONE');
    this.post.addMesh(this.quad);
    this.post.addMesh(this.glowQuad);

    this.overlay = new Overlay(this);

    this.hiding = new Material({ diffuse: new Vec3(BG[0], BG[1], BG[2]) });
    this.level = null;
    this.doorViews = new Map();
    this.enemyViews = new Map();
    this.pickupViews = new Map();
    this.barrelViews = new Map();
    this.shotViews = new Map();
    this.effectViews = new Map();
    this.staticMeshes = [];
    this.droplets = null;
    this.splatters = null;
    this.splatVersion = -1;
    this.splatCache = new WeakMap();
    this.dripCache = new WeakMap();
    this.syncStamp = 0;
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
    if (!HAS_RESTORE) {
      // nothing in this RoostR can rebuild the GPU objects, so start over
      window.location.reload();
      return;
    }
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
    this.scene.setViewport(0, 0, this.width, this.height);
    this.post.setViewport(0, 0, this.width, this.height);
    this.target.setSize(this.width, this.height);

    // the glow is blurred in a texture a fraction of the size, so its cost does not grow with the screen
    const scale = Math.max(this.height / 760, 1);
    this.glowDivisor = Math.max(3, Math.round(4 * scale));
    const glowWidth = Math.max(1, Math.ceil(this.width / this.glowDivisor));
    const glowHeight = Math.max(1, Math.ceil(this.height / this.glowDivisor));
    this.glowTarget.setSize(glowWidth, glowHeight);
    this.down.setViewport(0, 0, glowWidth, glowHeight);
    this.downQuad.setCustomUniform('sourceTexel', new Vec2(1 / this.width, 1 / this.height));
    this.downQuad.setCustomUniform('span', this.glowDivisor);
    this.glowQuad.setCustomUniform('glowTexel', new Vec2(1 / glowWidth, 1 / glowHeight));
    this.overlay.resize(cssWidth, cssHeight, this.width, this.height);

    // keep the horizontal field of view stable whatever the window shape
    const aspect = this.width / this.height;
    const vertical = (2 * Math.atan(Math.tan((HORIZONTAL_FOV / 2) * (Math.PI / 180)) / aspect) * 180) / Math.PI;
    this.baseFov = Math.min(vertical, 78);
    this.camera.fov = this.baseFov;
    this.zoom = 1;
    this.camera.setProjectionMatrix(new Vec2(this.width, this.height));
  }

  // ---- mesh helpers -------------------------------------------------------

  makeMesh(vertices, primitive, material) {
    const geometry = new CustomMesh();
    geometry.setVertices(vertices);
    geometry.setPrimitive(primitive);
    const mesh = new Mesh(this.gl, geometry);
    mesh.addProgram(LINE_VERTEX, LINE_FRAGMENT, material);
    return mesh;
  }

  lines(vertices, material, parent = null) {
    const mesh = this.makeMesh(vertices, 'LINES', material);
    if (parent)
      parent.addChild(mesh);
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
    const sprite = new (Sprite ?? FallbackSprite)(gl, {
      width,
      height,
      texture: atlas.data,
      textureOptions: { width: atlas.width, height: atlas.height, magFilter: gl.NEAREST, minFilter: gl.NEAREST },
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
    return new Material({ diffuse: [0.85, 0.85, 0.85] });
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
    this.enemyViews.clear();
    this.pickupViews.clear();
    this.barrelViews.clear();
    this.shotViews.clear();
    this.effectViews.clear();
    this.staticMeshes = [];
    this.level = level;
    this.buildStatic(level);
    for (const door of level.doors.values())
      this.buildDoor(door);

    // blood: droplets move every frame, splats are rewritten only when the game adds or drops one
    this.bloodTexture ??= bloodAtlas();
    this.droplets = new QuadBatch(this.gl, { capacity: BLOOD.particles, atlas: this.bloodTexture });
    this.splatters = new QuadBatch(this.gl, { capacity: BLOOD.floor + BLOOD.walls + BLOOD.ceiling + BLOOD.prints, atlas: this.bloodTexture, material: this.splatMaterial() });
    // the drips running down the walls: a stem and a drop each, redrawn while they move
    this.drips = new QuadBatch(this.gl, { capacity: BLOOD.walls * 6 * 6, atlas: this.bloodTexture, material: this.splatMaterial() });
    this.dripVersion = -1;
    this.dripsLive = false;
    this.scene.addMesh(this.droplets);
    this.scene.addMesh(this.splatters);
    this.scene.addMesh(this.drips);
    this.splatVersion = -1;
    // bullet holes are flat quads on the wall, in front of the blood
    this.impactPixels ??= impactAtlas();
    this.holes = new QuadBatch(this.gl, { capacity: BLOOD.holes, atlas: this.impactPixels });
    this.scene.addMesh(this.holes);
    this.holesVersion = -1;
    this.doorMarks = new Map();
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

    // stored at the height it has on a closed door; the door has dropped by `drop`
    const holes = marks.holes.begin();
    for (const mark of blood.holes) {
      if (mark.door !== door)
        continue;
      const quad = holeQuad({ ...mark, z: mark.z - drop, top: mark.top * height });
      if (quad)
        holes.quad(quad.corners, quad.uv);
    }
    holes.end();
    const batch = marks.splats.begin();
    for (const mark of blood.walls) {
      if (mark.door !== door)
        continue;
      const sunk = { ...mark, z: mark.z - drop, top: mark.top * height };
      const quad = wallSplatQuad(sunk);
      if (quad)
        batch.quad(quad.corners, quad.uv);
      for (const drip of wallDripQuads(sunk))
        batch.quad(drip.corners, drip.uv);
    }
    batch.end();
  }

  /** A sprite's four corners are worked out once per mark and kept; false is kept too, for a mark cut away entirely. */
  cachedQuad(item, build) {
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
    const fx = camera.target.x - camera.position.x;
    const fy = camera.target.y - camera.position.y;
    const fz = camera.target.z - camera.position.z;
    let rx = fy * camera.up.z - fz * camera.up.y;
    let ry = fz * camera.up.x - fx * camera.up.z;
    let rz = fx * camera.up.y - fy * camera.up.x;
    const length = Math.hypot(rx, ry, rz) || 1;
    rx /= length;
    ry /= length;
    rz /= length;
    const right = [rx, ry, rz];
    const up = [ry * fz - rz * fy, rz * fx - rx * fz, rx * fy - ry * fx];
    const upLength = Math.hypot(...up) || 1;
    up[0] /= upLength;
    up[1] /= upLength;
    up[2] /= upLength;

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
      } else {
        quads = wallDripQuads(splat);
      }
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
        const base = level.inBounds(nx, ny) && kind[nidx] !== DOOR ? baseHeight[nidx] : 0;
        const along = d < 2 ? y : x;
        const group = groups.get(id) ?? { d, kind: kind[idx], top: Math.min(baseHeight[idx], ROOF), base: Math.min(base, ROOF), x, y, from: along, to: along };
        group.from = Math.min(group.from, along);
        group.to = Math.max(group.to, along);
        groups.set(id, group);
      }
    }

    const faces = [];
    const hide = [];
    for (const group of groups.values()) {
      const { d, top, base } = group;
      const axis = d < 2 ? 'x' : 'z';
      const plane = (d === 0 ? group.x : d === 1 ? group.x + 1 : d === 2 ? group.y : group.y + 1) * TILE;
      const a0 = group.from * TILE;
      const a1 = (group.to + 1) * TILE;
      const corners = faceCorners(axis, plane, a0, a1, base, top);
      const inward = d === 0 || d === 2 ? 0.9 : -0.9;
      const offset = axis === 'x' ? [inward, 0, 0] : [0, 0, inward];

      // the hiding faces run a little past their ends, so two of them meeting at a corner overlap and leave no crack
      const lap = (y0, y1) => faceCorners(axis, plane, a0 - 1.2, a1 + 1.2, y0, y1);
      hide.push(...quadTriangles(lap(base, top), offset));
      // the wall carries on up to the roof, without being drawn; a low pillar does not, it has sky above,
      // and nor does a face looking into the giant's room, which is open to the sky
      const nx = group.x + (d === 0 ? -1 : d === 1 ? 1 : 0);
      const ny = group.y + (d === 2 ? -1 : d === 3 ? 1 : 0);
      const roofless = level.arena?.has(ny * width + nx);
      const toRoof = group.kind !== PILLAR && top < ROOF && !roofless;
      if (toRoof)
        hide.push(...quadTriangles(lap(top, ROOF), offset));
      // the textured wall goes right up to the ceiling, so there is no gap between them
      faces.push(...wallFaceQuads({ axis, plane, from: group.from, to: group.to, base, top: toRoof ? ROOF : top, x: group.x, y: group.y, d, exit: group.kind === EXIT }));
    }

    // a doorway has no wall of its own, so its two open ends get a lintel from the door's height up to the roof
    const solid = (x, y) => level.inBounds(x, y) && (kind[y * width + x] === WALL || kind[y * width + x] === EXIT);
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
    for (let y = 0; y < rowCount; y++) {
      let start = 0;
      for (let x = 0; x <= width; x++) {
        const roofed = x < width && !level.arena?.has(y * width + x);
        if (roofed)
          continue;
        if (x > start)
          hide.push(...quadTriangles([[start * TILE, ROOF, y * TILE], [x * TILE, ROOF, y * TILE], [x * TILE, ROOF, (y + 1) * TILE], [start * TILE, ROOF, (y + 1) * TILE]]));
        start = x + 1;
      }
    }

    // low tiles can be seen from above: close their tops so the floor grid cannot show through
    for (let idx = 0; idx < kind.length; idx++) {
      if (!kind[idx] || kind[idx] === DOOR || baseHeight[idx] >= EYE + 8)
        continue;
      const x = idx % width;
      const y = (idx - x) / width;
      const h = baseHeight[idx] - 0.9;
      const top = baseHeight[idx] - 0.3;
      faces.push({ corners: [x * TILE, top, y * TILE, (x + 1) * TILE, top, y * TILE, (x + 1) * TILE, top, (y + 1) * TILE, x * TILE, top, (y + 1) * TILE], uv: wallCellUv(WALL_CELLS.top) });
      hide.push(
        x * TILE, h, y * TILE, (x + 1) * TILE, h, y * TILE, (x + 1) * TILE, h, (y + 1) * TILE,
        x * TILE, h, y * TILE, (x + 1) * TILE, h, (y + 1) * TILE, x * TILE, h, (y + 1) * TILE
      );
    }

    this.track(this.floorBatch(level), this.staticMeshes);
    this.track(this.ceilingBatch(level), this.staticMeshes);
    this.track(this.solid(hide), this.staticMeshes);
    this.track(this.wallBatch(faces), this.staticMeshes);
  }

  /** The ceiling: one quad over every tile you can stand on, except the giant's room, which is open to the sky. */
  ceilingBatch(level) {
    const { gl } = this;
    this.ceilingPixels ??= ceilingAtlas();
    const batch = new QuadBatch(gl, {
      capacity: level.width * level.rowCount,
      atlas: this.ceilingPixels,
      // the floor's shader: it carries the same rust, and keeps the light fixtures clean
      vertex: FLOOR_VERTEX,
      fragment: FLOOR_FRAGMENT,
      textureOptions: { generateMipmaps: true, minFilter: gl.NEAREST_MIPMAP_NEAREST },
    });
    // just under the invisible roof, so the roof never hides it
    const y = ROOF - 1.2;
    batch.begin();
    for (let ty = 0; ty < level.rowCount; ty++) {
      for (let tx = 0; tx < level.width; tx++) {
        const idx = ty * level.width + tx;
        if ((level.kind[idx] !== FLOOR && level.kind[idx] !== DOOR) || level.arena?.has(idx))
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
        const kind = level.kind[ty * level.width + tx];
        if (kind !== FLOOR && kind !== DOOR)
          continue;
        const x0 = tx * TILE;
        const x1 = x0 + TILE;
        const z0 = ty * TILE;
        const z1 = z0 + TILE;
        batch.quad([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0], floorCellUv(floorCellFor(tx, ty, kind === DOOR)));
      }
    }
    return batch.end();
  }

  buildDoor(door) {
    // a blast door: a box in the deck's steel and rust, standing on the floor and sinking into it as it opens. It is
    // opaque, so it hides what is behind it, and it is all there is of it: no lines over it
    const { gl } = this;
    this.doorPixels ??= doorAtlas();
    const { vertices, uvs } = doorBox(TILE - 0.8, TILE);
    const geometry = new CustomMesh();
    geometry.setVertices(vertices);
    geometry.setUvs(uvs);
    geometry.setPrimitive('TRIANGLES');
    const root = new Mesh(gl, geometry);
    root.addProgram(DOOR_VERTEX, DOOR_FRAGMENT, new Material({ diffuse: [1, 1, 1] }));
    root.setTexture(this.doorPixels.data, {
      width: this.doorPixels.width,
      height: this.doorPixels.height,
      magFilter: gl.NEAREST,
      minFilter: gl.NEAREST_MIPMAP_NEAREST,
      generateMipmaps: true,
    });
    root.setPosition(door.center.x, 0, door.center.y);
    this.scene.addMesh(root);
    this.doorViews.set(door, root);
  }

  // ---- actors -------------------------------------------------------------

  buildEnemy(enemy) {
    return MONSTERS[enemy.type].build(this, enemy);
  }

  /** Poses one monster for this frame; a dead one is taken apart instead (see startGore). */
  updateEnemy(enemy, view, player, time, game) {
    const dead = enemy.state === 'dead';
    const dt = Math.min(0.1, Math.max(0, time - (view.lastTime ?? time)));
    view.lastTime = time;
    const fade = dead ? Math.max(0, 1 - enemy.deadTime / 2) : 1;
    const flash = enemy.hurt > 0 || enemy.pain > 0 ? 1 : 0;
    const amount = fade * (flash ? 0.55 + 0.45 * Math.sin(time * 90) : 1);
    const brightness = Math.max(0.05, amount);
    if (brightness !== view.brightness) {
      view.brightness = brightness;
      tint(view.material, COLORS.orange, brightness);
    }

    const { root } = view;
    if (!dead) {
      view.yaw = Math.atan2(-(player.pos.y - enemy.pos.y), player.pos.x - enemy.pos.x);
      MONSTERS[enemy.type].animate(view, enemy, { time, dt });
      root.setPosition(enemy.pos.x, view.lift * view.scale, enemy.pos.y);
      root.setScale(view.scale * view.sx, view.scale * view.sy, view.scale * view.sz);
      root.setRotation(0, view.yaw, view.tilt);
      return;
    }

    if (!view.gore)
      this.startGore(view, enemy);
    const die = MONSTERS[enemy.type].die;
    if (die)
      die(view, enemy);
    else
      this.tickGore(view, enemy, dt);
  }

  /**
   * A monster that dies comes apart. Its head, ribs and limbs leave the body (all of them, and the torso too,
   * when it was blown apart) and fly off as bodies of their own under gravity, then lie where they land.
   */
  startGore(view, enemy) {
    const { root } = view;
    const sin = Math.sin(view.yaw);
    const cos = Math.cos(view.yaw);
    const gibbed = enemy.gibbed;
    const flung = [];
    for (const part of view.parts) {
      // a clean kill takes the head and ribs and one arm; being blown apart takes everything
      const arm = part.name.startsWith('arm') || part.name.startsWith('leg');
      if (!gibbed && !(part.name === 'head' || part.name === 'ribs' || part.name === 'jaw' || (arm && Math.random() < 0.4)))
        continue;
      const { mesh } = part;
      const lx = mesh.position.x * view.scale;
      const ly = mesh.position.y * view.scale;
      const lz = mesh.position.z * view.scale;
      // the joint, turned to where the monster faces
      const x = enemy.pos.x + lx * cos + lz * sin;
      const z = enemy.pos.y - lx * sin + lz * cos;
      const y = root.position.y + ly;
      const rotation = mesh.rotation;
      root.removeChild(mesh);
      mesh.setPosition(x, y, z);
      mesh.setScale(view.scale);
      mesh.setRotation(rotation.x, rotation.y + view.yaw, rotation.z);
      this.scene.addMesh(mesh);
      const out = Math.atan2(z - enemy.pos.y, x - enemy.pos.x) + (Math.random() - 0.5) * 1.2;
      const power = (gibbed ? 150 : 70) * (0.5 + Math.random());
      flung.push({
        mesh,
        x, y, z,
        vx: Math.cos(out) * power,
        vy: (gibbed ? 200 : 110) * (0.6 + Math.random() * 0.8),
        vz: Math.sin(out) * power,
        spin: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 7),
        angle: rotation.z,
        pitch: rotation.x,
        landed: false,
      });
    }
    view.gore = { flung, fell: 0 };
    // a model with a death of its own plays it, blown apart or not
    if (gibbed && !MONSTERS[enemy.type].die)
      root.setInactive();
  }

  tickGore(view, enemy, dt) {
    const { gore, root } = view;
    for (const bit of gore.flung) {
      if (bit.landed)
        continue;
      bit.vy -= BLOOD.gravity * dt;
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      bit.z += bit.vz * dt;
      bit.angle += bit.spin * dt;
      if (bit.y <= 3) {
        // it lies flat where it lands, a quarter turn from upright
        bit.landed = true;
        bit.y = 3;
        bit.angle = Math.round(bit.angle / (Math.PI / 2)) * (Math.PI / 2);
        bit.pitch = 0;
      }
      bit.mesh.setPosition(bit.x, bit.y, bit.z);
      bit.mesh.setRotation(bit.pitch, view.yaw, bit.angle);
    }
    if (enemy.gibbed)
      return;
    // what is left of the body falls over, or slumps to the floor
    const k = Math.min(1, enemy.deadTime / 0.4);
    const eased = 1 - (1 - k) * (1 - k);
    if (view.death === 'topple') {
      root.setRotation(0, view.yaw, eased * 1.45);
      root.setPosition(enemy.pos.x, view.lift * view.scale * (1 - eased), enemy.pos.y);
    } else {
      root.setScale(view.scale, view.scale * Math.max(0.15, 1 - eased * 0.85), view.scale);
      root.setPosition(enemy.pos.x, view.lift * view.scale * (1 - eased), enemy.pos.y);
    }
  }

  buildPickup(pickup) {
    const material = this.material('green');
    let root;
    if (pickup.type === 'health') {
      root = this.lines(merge(
        boxEdges(11, 14, 11, 0, 0, 0),
        segment(5.6, 4, 0, 5.6, 10, 0), segment(5.6, 7, -3, 5.6, 7, 3),
        segment(-5.6, 4, 0, -5.6, 10, 0), segment(-5.6, 7, -3, -5.6, 7, 3)
      ), material);
    } else {
      root = this.lines(merge(boxEdges(5, 12, 5, 0, 0, -7), boxEdges(5, 12, 5, 0, 0, 0), boxEdges(5, 12, 5, 0, 0, 7)), material);
    }
    this.scene.addMesh(root);
    return { root };
  }

  /** An oil drum: ribbed sides, a zig-zag hazard band, and a lid. It is orange because it hurts. */
  buildBarrel() {
    const R = 9.5;
    const H = 26;
    // an orange oil drum: a RoostR cylinder in its skin, standing on its base. It is opaque, so it hides what is
    // behind it, and it is all there is of it: no lines over it
    const { gl } = this;
    this.barrelPixels ??= barrelAtlas();
    const cylinder = skinBarrel(new Cylinder(R * 0.985, R * 0.985, H, 20, 1, false), 20, 1);
    for (let i = 1; i < cylinder.vertices.length; i += 3)
      cylinder.vertices[i] += H / 2;
    const skinMaterial = new Material({ diffuse: [1, 1, 1] });
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
    const material = this.material('orange');
    const root = this.lines(merge(octahedronEdges(7), segment(-11, 0, 0, 11, 0, 0), segment(0, 0, -11, 0, 0, 11)), material);
    this.scene.addMesh(root);
    return { root };
  }

  buildEffect(effect) {
    // every effect is a sprite animation that faces the camera: fire for blasts, sparks for a pellet striking metal
    const spark = effect.type === 'spark';
    const atlas = spark ? (this.impactPixels ??= impactAtlas()) : (this.explosionPixels ??= explosionAtlas());
    const material = new Material({ diffuse: [1, 1, 1] });
    // a depth bias, or the walls and floor round it would cut it off flat
    const root = this.sprite(atlas, material, 1, 1, { anchor: 'center', billboard: 'spherical', depthBias: spark ? 10 : explosionWidth(effect) / 2, fragment: TEXTURED_FRAGMENT });
    this.scene.addMesh(root);
    // each spark is one of several kinds, and it keeps it for its whole life
    return { root, material, spark, kind: Math.floor(Math.random() * SPARK_VARIANTS) };
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
    for (const [entity, view] of map) {
      if (view.stamp !== stamp) {
        this.discard(view.root);
        // the bits that were thrown off a monster are meshes of their own
        for (const bit of view.gore?.flung ?? [])
          this.discard(bit.mesh);
        map.delete(entity);
      }
    }
  }

  // ---- frame --------------------------------------------------------------

  render(game) {
    if (game.level !== this.level)
      this.rebuild(game.level);

    const player = game.player;
    const time = game.time;

    for (const door of game.level.doors.values()) {
      const view = this.doorViews.get(door);
      const height = 1 - door.open;
      // the door slides down into the floor whole; the part below the floor is not drawn
      view.setPosition(door.center.x, -door.open * game.level.baseHeight[door.idx], door.center.y);
      if (height > 0.02)
        view.setActive();
      else
        view.setInactive();
      this.syncDoorMarks(door, game.blood);
    }

    this.syncViews(
      this.enemyViews,
      game.enemies,
      (enemy) => this.buildEnemy(enemy),
      (enemy, view) => this.updateEnemy(enemy, view, player, time, game),
      (enemy) => !(enemy.state === 'dead' && enemy.deadTime > 2.2)
    );
    this.syncViews(this.pickupViews, game.pickups, (pickup) => this.buildPickup(pickup), (pickup, view) => {
      view.root.setPosition(pickup.pos.x, 8 + Math.sin(time * 3 + pickup.phase) * 2.5, pickup.pos.y);
      view.root.setRotation(0, time * 1.6 + pickup.phase, 0);
    });
    this.syncViews(this.barrelViews, game.barrels, () => this.buildBarrel(), (barrel, view) => {
      // a barrel that has been set off flickers and shudders until it blows
      const burning = barrel.fuse >= 0;
      const skin = burning ? 0.8 + 0.6 * Math.abs(Math.sin(time * 70)) : 1;
      view.skinMaterial.setDiffuse(skin, skin, skin);
      view.root.setPosition(barrel.pos.x, 0, barrel.pos.y);
      view.root.setScale(burning ? 1 + 0.05 * Math.sin(time * 90) : 1);
    }, (barrel) => !barrel.gone);
    this.syncViews(this.shotViews, game.shots, () => this.buildShot(), (shot, view) => {
      view.root.setPosition(shot.pos.x, EYE - 4, shot.pos.y);
      view.root.setRotation(0, time * 6, 0);
    });
    this.syncViews(this.effectViews, game.effects, (effect) => this.buildEffect(effect), (effect, view) => {
      const progress = Math.min(0.999, effect.age / effect.life);
      if (view.spark) {
        const width = 15;
        view.root.setFrame(IMPACT_CELLS.spark + view.kind * SPARK_FRAMES + Math.floor(progress * SPARK_FRAMES));
        view.root.setPosition(effect.x, effect.z, effect.y);
        view.root.setScale(width, width, width);
        return;
      }
      // the fireball sits on the floor it is thrown from, and the big one is as wide as its blast is far
      const width = explosionWidth(effect);
      view.root.setFrame(Math.min(EXPLOSION_FRAMES - 1, Math.floor(progress * EXPLOSION_FRAMES)));
      view.root.setPosition(effect.x, effect.z + width * 0.12, effect.y);
      view.root.setScale(width, width, width);
    });

    this.updateCamera(game);
    this.syncBlood(game.blood);

    const { gl } = this;
    this.target.bind();
    this.scene.clear();
    this.scene.render(this.camera, time);
    this.overlay.glow.render(this.postCamera, time);
    this.target.unbind(this.width, this.height);

    this.glowTarget.bind();
    this.down.clear(false, true);
    this.down.render(this.postCamera, time);
    this.glowTarget.unbind(this.width, this.height);

    gl.viewport(0, 0, this.width, this.height);
    this.post.clear();
    this.post.render(this.postCamera, time);
    this.overlay.crisp.render(this.postCamera, time);
  }

  /** The title screen's camera: placed, aimed, tilted and zoomed by the film, shaking with explosions. */
  updateFilmCamera(cam, game) {
    const { camera } = this;
    const shake = game.shake * 6;
    camera.position.setScalar(
      cam.x + (Math.random() - 0.5) * shake,
      cam.eye + (Math.random() - 0.5) * shake,
      cam.y + (Math.random() - 0.5) * shake
    );
    camera.target.setScalar(cam.lookX, cam.lookEye, cam.lookY);
    // a roll tips "up" towards the viewer's right
    const dx = cam.lookX - cam.x;
    const dz = cam.lookY - cam.y;
    const length = Math.hypot(dx, dz) || 1;
    camera.up.setScalar((-dz / length) * Math.sin(cam.roll), Math.cos(cam.roll), (dx / length) * Math.sin(cam.roll));
    if (Math.abs(cam.zoom - this.zoom) > 0.002) {
      this.zoom = cam.zoom;
      camera.fov = this.baseFov * cam.zoom;
      camera.setProjectionMatrix(new Vec2(this.width, this.height));
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
      this.camera.setProjectionMatrix(new Vec2(this.width, this.height));
    }
    const player = game.player;
    const dead = game.state === 'dead';
    const drop = dead ? Math.min(player.deadTime * 36, 24) : 0;
    const bob = Math.sin(player.bob * 2) * 1.6 * player.moving;
    const shake = Math.max(player.hurt > 0 ? player.hurt * 5 : 0, game.shake * 6);
    const { camera } = this;
    const eyeY = EYE - drop + bob;
    camera.position.setScalar(
      player.pos.x + (Math.random() - 0.5) * shake,
      eyeY + (Math.random() - 0.5) * shake,
      player.pos.y + (Math.random() - 0.5) * shake
    );
    camera.target.setScalar(
      camera.position.x + Math.cos(player.angle) * 100,
      eyeY - (dead ? drop * 2 : 0),
      camera.position.z + Math.sin(player.angle) * 100
    );
    camera.setViewMatrix();
  }
}
