import { CustomMesh, FullscreenQuad, Material, Mesh, PerspectiveCamera, Renderer, RenderTarget, Scene, Vec2, Vec3 } from '@1pizzateam/roostr';
import { BLOOD } from './blood.js';
import { DOOR, EXIT, EYE, PILLAR, TILE, WALL } from './level.js';
import { boxEdges, boxTriangles, circleEdges, faceCorners, merge, octahedronEdges, polyline, prismEdges, prismTriangles, quadEdges, quadTriangles, ringEdges, segment } from './lines.js';
import { MONSTERS } from './monsters.js';
import { Overlay } from './overlay.js';
import { floorSplatVertices, holeVertices, MAX_HOLE_VERTICES, MAX_PRINT_VERTICES, MAX_SPLAT_VERTICES, printVertices, wallSplatVertices } from './splatter.js';

// Blue is the world, green is what helps you, orange is what hurts, red is blood.
const BG = [7 / 255, 9 / 255, 15 / 255];
const COLORS = {
  blue: [0x5b / 255, 0x8c / 255, 0xff / 255],
  green: [0x38 / 255, 0xc7 / 255, 0x93 / 255],
  orange: [0xff / 255, 0x9f / 255, 0x43 / 255],
  red: [0xe8 / 255, 0x10 / 255, 0x2c / 255],
};

// RoostR newer than 0.7.0 can be told the size of a buffer that is filled after creation, and can rebuild its
// GPU objects after a lost context. With 0.7.0 the game still runs, without culling and without recovery.
const HAS_BOUNDS = typeof Mesh.prototype.setLocalBounds === 'function';
const HAS_RESTORE = typeof Scene.prototype.restore === 'function';

// Rooms have an invisible roof: the walls go on up to it and the ceiling closes it, all in the background colour,
// so nothing in another room shows above a wall. It is higher than the tallest monster.
const ROOF = 190;

const NEAR = 6;
const FAR = 2400;
const FOG_NEAR = 260;
const FOG_FAR = 1500;
const HORIZONTAL_FOV = 82;
const SEAM_TINT = 0.32;
const GRID_TINT = 0.22;

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

// A door slides down into the floor, so what has gone below the floor must not be drawn: the same line shader,
// with the height of every fragment passed along so those below the floor can be thrown away.
const SUNK_VERTEX = LINE_VERTEX
  .replace('varying float vDepth;', 'varying float vDepth;\nvarying float vHeight;')
  .replace('vec4 v = uViewMatrix', 'vHeight = (uModelMatrix * vec4(aVertexPosition, 1.0)).y;\n  vec4 v = uViewMatrix');

const SUNK_FRAGMENT = LINE_FRAGMENT
  .replace('varying float vDepth;', 'varying float vDepth;\nvarying float vHeight;')
  .replace('vec3 color = uMaterialDiffuse;', 'if (vHeight < -0.01)\n    discard;\n  vec3 color = uMaterialDiffuse;');

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

vec3 tap(vec2 offset) {
  return max(texture2D(uSampler, vTextureCoord + offset / uScreenResolution).rgb - BG, 0.0);
}

void main(void) {
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
  return max(texture2D(uSampler, vTextureCoord + offset * uSourceTexel).rgb - BG, 0.0);
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

/** A line mesh whose vertices are rewritten from the game state instead of being built once. */
class LineBatch {
  /** With a parent mesh the batch moves and scales with it (used for holes in a door). */
  constructor(world, material, capacityVertices, parent = null) {
    this.gl = world.gl;
    this.capacity = capacityVertices;
    this.floats = new Float32Array(capacityVertices * 3);
    this.count = 0;
    this.low = new Vec3();
    this.high = new Vec3();
    this.mesh = world.makeMesh(this.floats, 'LINES', material);
    this.mesh.setInactive();
    if (parent)
      parent.addChild(this.mesh);
    else
      world.scene.addMesh(this.mesh);
  }

  upload(vertexCount) {
    const { gl, mesh } = this;
    this.count = vertexCount;
    if (!vertexCount) {
      mesh.setInactive();
      return;
    }
    mesh.subMeshes[0].count = vertexCount;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.floats.subarray(0, vertexCount * 3));
    if (HAS_BOUNDS)
      this.measure(vertexCount);
    mesh.setActive();
  }

  /** Hide the batch without losing its contents, e.g. while its door is sunk into the floor. */
  /** Frustum culling needs the size of what is in the buffer now, not of the empty array it started as. */
  measure(vertexCount) {
    const { floats, low, high } = this;
    low.setScalar(Infinity, Infinity, Infinity);
    high.setScalar(-Infinity, -Infinity, -Infinity);
    for (let i = 0; i < vertexCount * 3; i += 3) {
      const x = floats[i];
      const y = floats[i + 1];
      const z = floats[i + 2];
      if (x < low.x) low.x = x;
      if (y < low.y) low.y = y;
      if (z < low.z) low.z = z;
      if (x > high.x) high.x = x;
      if (y > high.y) high.y = y;
      if (z > high.z) high.z = z;
    }
    this.mesh.setLocalBounds(low, high);
  }

  /** Sends the CPU copy to a buffer that was rebuilt empty after a lost context. */
  refresh() {
    this.upload(this.count);
  }

  show(visible) {
    if (visible && this.count)
      this.mesh.setActive();
    else
      this.mesh.setInactive();
  }
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
    const batches = [this.droplets, this.splatters, this.holes];
    for (const marks of this.doorMarks?.values() ?? [])
      batches.push(marks.holes, marks.splats);
    for (const batch of batches)
      batch?.refresh();
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

  makeMesh(vertices, primitive, material, sunk = false) {
    const geometry = new CustomMesh();
    geometry.setVertices(vertices);
    geometry.setPrimitive(primitive);
    const mesh = new Mesh(this.gl, geometry);
    mesh.addProgram(sunk ? SUNK_VERTEX : LINE_VERTEX, sunk ? SUNK_FRAGMENT : LINE_FRAGMENT, material);
    return mesh;
  }

  lines(vertices, material, parent = null, sunk = false) {
    const mesh = this.makeMesh(vertices, 'LINES', material, sunk);
    if (parent)
      parent.addChild(mesh);
    return mesh;
  }

  solid(vertices, parent = null, sunk = false) {
    const mesh = this.makeMesh(vertices, 'TRIANGLES', this.hiding, sunk);
    if (parent)
      parent.addChild(mesh);
    return mesh;
  }

  material(color, amount = 1) {
    const material = new Material();
    tint(material, COLORS[color], amount);
    return material;
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
    this.droplets = new LineBatch(this, this.material('red'), BLOOD.particles * 6);
    this.splatters = new LineBatch(this, this.material('red', 0.8), (BLOOD.floor + BLOOD.walls) * MAX_SPLAT_VERTICES + BLOOD.prints * MAX_PRINT_VERTICES);
    this.splatVersion = -1;
    // bullet holes are wall damage, so they are blue like the world
    this.holes = new LineBatch(this, this.material('blue'), BLOOD.holes * MAX_HOLE_VERTICES);
    this.holesVersion = -1;
    this.doorMarks = new Map();
  }

  /** Bullet holes on walls go in one buffer; the ones on doors are handled by syncDoorMarks. */
  syncHoles(blood) {
    const walls = this.holes.floats;
    let offset = 0;
    for (const hole of blood.holes) {
      if (hole.door)
        continue;
      const vertices = this.splatGeometry(hole, holeVertices);
      if (offset + vertices.length > walls.length)
        break;
      walls.set(vertices, offset);
      offset += vertices.length;
    }
    this.holes.upload(offset / 3);
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
        holes: new LineBatch(this, this.material('blue'), BLOOD.doorHoles * MAX_HOLE_VERTICES),
        splats: new LineBatch(this, this.material('red', 0.8), BLOOD.doorSplats * MAX_SPLAT_VERTICES),
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
    if (marks.open === door.open && marks.holesVersion === blood.holesVersion && marks.version === blood.version) {
      marks.holes.show(true);
      marks.splats.show(true);
      return;
    }
    marks.open = door.open;
    marks.holesVersion = blood.holesVersion;
    marks.version = blood.version;

    const fill = (batch, list, build) => {
      let n = 0;
      for (const mark of list) {
        if (mark.door !== door)
          continue;
        // stored at the height it has on a closed door; the door has dropped by `drop`
        const vertices = build({ ...mark, z: mark.z - drop, top: mark.top * height });
        if (n + vertices.length > batch.floats.length)
          break;
        batch.floats.set(vertices, n);
        n += vertices.length;
      }
      batch.upload(n / 3);
    };
    fill(marks.holes, blood.holes, holeVertices);
    fill(marks.splats, blood.walls, wallSplatVertices);
  }

  /** Vertices for one splat or footprint, built once and cached on the game object. */
  splatGeometry(item, build) {
    let vertices = this.splatCache.get(item);
    if (!vertices) {
      vertices = Float32Array.from(build(item));
      this.splatCache.set(item, vertices);
    }
    return vertices;
  }

  syncBlood(blood) {
    const drops = this.droplets.floats;
    let n = 0;
    for (const p of blood.particles) {
      if (n + 18 > drops.length)
        break;
      if (p.gib) {
        // gibs tumble as little three-axis crosses
        const s = 3;
        const spin = p.age * 9;
        const dx = Math.cos(spin) * s;
        const dz = Math.sin(spin) * s;
        drops.set([p.x - dx, p.z, p.y - dz, p.x + dx, p.z, p.y + dz, p.x, p.z - s, p.y, p.x, p.z + s, p.y, p.x - dz, p.z, p.y + dx, p.x + dz, p.z, p.y - dx], n);
        n += 18;
      } else {
        // droplets are streaks along their velocity
        drops.set([p.x, p.z, p.y, p.x - p.vx * 0.03, p.z - p.vz * 0.03, p.y - p.vy * 0.03], n);
        n += 6;
      }
    }
    this.droplets.upload(n / 3);

    if (blood.holesVersion !== this.holesVersion) {
      this.holesVersion = blood.holesVersion;
      this.syncHoles(blood);
    }

    if (blood.version === this.splatVersion)
      return;
    this.splatVersion = blood.version;
    const floats = this.splatters.floats;
    let offset = 0;
    const append = (vertices) => {
      if (offset + vertices.length > floats.length)
        return;
      floats.set(vertices, offset);
      offset += vertices.length;
    };
    for (const splat of blood.floor)
      append(this.splatGeometry(splat, floorSplatVertices));
    for (const splat of blood.walls) {
      if (!splat.door)
        append(this.splatGeometry(splat, wallSplatVertices));
    }
    for (const print of blood.prints)
      append(this.splatGeometry(print, printVertices));
    this.splatters.upload(offset / 3);
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
        const group = groups.get(id) ?? { d, kind: kind[idx], top: baseHeight[idx], base, x, y, from: along, to: along };
        group.from = Math.min(group.from, along);
        group.to = Math.max(group.to, along);
        groups.set(id, group);
      }
    }

    const wall = [];
    const exit = [];
    const seam = [];
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

      (group.kind === EXIT ? exit : wall).push(...quadEdges(corners));
      // the hiding faces run a little past their ends, so two of them meeting at a corner overlap and leave no crack
      const lap = (y0, y1) => faceCorners(axis, plane, a0 - 1.2, a1 + 1.2, y0, y1);
      hide.push(...quadTriangles(lap(base, top), offset));
      // the wall carries on up to the roof, without being drawn; a low pillar does not, it has sky above,
      // and nor does a face looking into the giant's room, which is open to the sky
      const nx = group.x + (d === 0 ? -1 : d === 1 ? 1 : 0);
      const ny = group.y + (d === 2 ? -1 : d === 3 ? 1 : 0);
      const roofless = level.arena?.has(ny * width + nx);
      if (group.kind !== PILLAR && top < ROOF && !roofless)
        hide.push(...quadTriangles(lap(top, ROOF), offset));
      if (group.kind === EXIT) {
        exit.push(...segment(...corners[0], ...corners[2]), ...segment(...corners[1], ...corners[3]));
      }

      for (let a = group.from + 1; a <= group.to; a++) {
        const p = a * TILE;
        seam.push(...(axis === 'x' ? segment(plane, base, p, plane, top, p) : segment(p, base, plane, p, top, plane)));
      }
      if (top > TILE && base < TILE)
        seam.push(...(axis === 'x' ? segment(plane, TILE, a0, plane, TILE, a1) : segment(a0, TILE, plane, a1, TILE, plane)));
    }

    // a doorway has no wall of its own, so its two open ends get a lintel from the door's height up to the roof
    const solid = (x, y) => level.inBounds(x, y) && (kind[y * width + x] === WALL || kind[y * width + x] === EXIT);
    for (const door of level.doors.values()) {
      const { x, y } = door;
      const top = baseHeight[door.idx];
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
      hide.push(
        x * TILE, h, y * TILE, (x + 1) * TILE, h, y * TILE, (x + 1) * TILE, h, (y + 1) * TILE,
        x * TILE, h, y * TILE, (x + 1) * TILE, h, (y + 1) * TILE, x * TILE, h, (y + 1) * TILE
      );
    }

    const grid = [];
    for (let x = 0; x <= width; x++)
      grid.push(...segment(x * TILE, 0, 0, x * TILE, 0, rowCount * TILE));
    for (let y = 0; y <= rowCount; y++)
      grid.push(...segment(0, 0, y * TILE, width * TILE, 0, y * TILE));

    this.track(this.solid(hide), this.staticMeshes);
    if (wall.length)
      this.track(this.lines(wall, this.material('blue')), this.staticMeshes);
    if (exit.length)
      this.track(this.lines(exit, this.material('green')), this.staticMeshes);
    this.track(this.lines(seam, this.material('blue', SEAM_TINT)), this.staticMeshes);
    this.track(this.lines(grid, this.material('blue', GRID_TINT)), this.staticMeshes);
  }

  buildDoor(door) {
    const size = TILE;
    const edges = merge(
      boxEdges(size, size, size, 0, 0, 0),
      segment(-size / 2, size * 0.33, -size / 2, size / 2, size * 0.33, -size / 2),
      segment(-size / 2, size * 0.66, -size / 2, size / 2, size * 0.66, -size / 2),
      segment(-size / 2, size * 0.33, size / 2, size / 2, size * 0.33, size / 2),
      segment(-size / 2, size * 0.66, size / 2, size / 2, size * 0.66, size / 2),
      segment(-size / 2, size * 0.33, -size / 2, -size / 2, size * 0.33, size / 2),
      segment(size / 2, size * 0.33, -size / 2, size / 2, size * 0.33, size / 2)
    );
    const root = this.lines(edges, this.material('green'), null, true);
    this.solid(boxTriangles(size - 1.8, size - 1.8, size - 1.8, 0, 0.9, 0), root, true);
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
    if (gibbed)
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
    const material = this.material('orange');
    const R = 9.5;
    const H = 26;
    const sides = 10;
    const hazard = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const b = ((i + 1) / sides) * Math.PI * 2;
      hazard.push(...segment(Math.cos(a) * R * 1.03, 9, Math.sin(a) * R * 1.03, Math.cos(b) * R * 1.03, 17, Math.sin(b) * R * 1.03));
    }
    const geometry = merge(
      prismEdges(R, H, sides, 0),
      ringEdges(R * 1.07, sides, 4), ringEdges(R * 1.07, sides, H - 4), ringEdges(R * 1.03, sides, 9), ringEdges(R * 1.03, sides, 17),
      ringEdges(R * 0.55, sides, H), hazard,
      segment(-R * 0.55, H, 0, R * 0.55, H, 0), segment(0, H, -R * 0.55, 0, H, R * 0.55)
    );
    const root = this.lines(geometry, material);
    this.solid(prismTriangles(R * 0.94, H - 0.8, sides, 0), root);
    this.scene.addMesh(root);
    return { root, material };
  }

  buildShot() {
    const material = this.material('orange');
    const root = this.lines(merge(octahedronEdges(7), segment(-11, 0, 0, 11, 0, 0), segment(0, 0, -11, 0, 0, 11)), material);
    this.scene.addMesh(root);
    return { root };
  }

  buildEffect(effect) {
    const material = this.material('orange');
    const geometry = effect.type === 'spark'
      ? merge(segment(-1, 0, 0, 1, 0, 0), segment(0, -1, 0, 0, 1, 0), segment(0, 0, -1, 0, 0, 1))
      : merge(circleEdges(1, 12, 'y'), circleEdges(1, 12, 'x'), circleEdges(1, 12, 'z'), circleEdges(0.5, 8, 'y'));
    const root = this.lines(geometry, material);
    this.scene.addMesh(root);
    return { root, material };
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
      tint(view.material, COLORS.orange, burning ? 0.55 + 0.45 * Math.sin(time * 70) : 0.9);
      view.root.setPosition(barrel.pos.x, 0, barrel.pos.y);
      view.root.setScale(burning ? 1 + 0.05 * Math.sin(time * 90) : 1);
    }, (barrel) => !barrel.gone);
    this.syncViews(this.shotViews, game.shots, () => this.buildShot(), (shot, view) => {
      view.root.setPosition(shot.pos.x, EYE - 4, shot.pos.y);
      view.root.setRotation(0, time * 6, 0);
    });
    this.syncViews(this.effectViews, game.effects, (effect) => this.buildEffect(effect), (effect, view) => {
      const progress = effect.age / effect.life;
      const size = effect.type === 'spark' ? 3 + progress * 7 : effect.type === 'boom' ? 18 + progress * 150 : 8 + progress * 34;
      tint(view.material, COLORS.orange, 1 - progress);
      view.root.setPosition(effect.x, effect.z, effect.y);
      view.root.setScale(size, size, size);
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
