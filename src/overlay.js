import { CustomMesh, Material, Mesh, Scene, Vec2, Vec3 } from '@1pizzateam/roostr';
import { Trigo } from '@1pizzateam/spock';
import { bloodAtlas } from './bloodsprites.js';
import { HeadView } from './head.js';
import { wallAtlas } from './wall.js';
import { arsenalAtlas } from './weapon.js';
import hudOverlayShader from './shaders/hud-overlay.shadergun.json' with { type: 'json' };
import hudTexturedShader from './shaders/hud-textured.shadergun.json' with { type: 'json' };

const VERTEX = hudOverlayShader.vertex;

const FRAGMENT = hudOverlayShader.fragment;

const TEXTURED_VERTEX = hudTexturedShader.vertex;

const TEXTURED_FRAGMENT = hudTexturedShader.fragment;

/** Textured quads in screen pixels, drawn over what is behind them; a faded one is more see-through. */
class SpriteBuffer {
  constructor(gl, quads, atlas) {
    this.gl = gl;
    this.capacity = quads * 6;
    this.positions = new Float32Array(this.capacity * 2);
    this.brights = new Float32Array(this.capacity * 3);
    this.uvs = new Float32Array(this.capacity * 2);
    this.count = 0;
    const geometry = new CustomMesh();
    geometry.vertices = this.positions;
    geometry.normals = this.brights;
    geometry.uvs = this.uvs;
    geometry.setItemSize(2);
    geometry.setPrimitive('TRIANGLES');
    this.mesh = new Mesh(gl, geometry);
    this.mesh.addProgram(TEXTURED_VERTEX, TEXTURED_FRAGMENT, new Material());
    this.mesh.addCustomUniform('size', 'uniform2f', new Vec2(1, 1));
    this.mesh.setTexture(atlas.data, { size: new Vec2(atlas.width, atlas.height), magFilter: gl.NEAREST, minFilter: gl.NEAREST });
    this.mesh.setDepthWrite(false);
    this.mesh.setBlend('SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA');
    this.mesh.setInactive();
  }

  clear() {
    this.count = 0;
  }

  /** A quad covering a Rect, y down, showing the texture rectangle [u0, v0, u1, v1]. */
  quad(rect, uv, bright) {
    if (this.count + 6 > this.capacity)
      return;
    const x0 = rect.topLeftCorner.x;
    const y0 = rect.topLeftCorner.y;
    const x1 = rect.bottomRightCorner.x;
    const y1 = rect.bottomRightCorner.y;
    const u0 = uv[0];
    const v0 = uv[1];
    const u1 = uv[2];
    const v1 = uv[3];
    const { positions, brights, uvs } = this;
    let i = this.count;
    let p = i * 2;
    let b = i * 3;
    // v1 is the top of the picture, which is the top of the quad:
    // (x0, y1, u0, v0), (x1, y1, u1, v0), (x1, y0, u1, v1), (x0, y1, u0, v0), (x1, y0, u1, v1), (x0, y0, u0, v1)
    positions[p] = x0;
    positions[p + 1] = y1;
    uvs[p] = u0;
    uvs[p + 1] = v0;
    brights[b] = bright;

    positions[p + 2] = x1;
    positions[p + 3] = y1;
    uvs[p + 2] = u1;
    uvs[p + 3] = v0;
    brights[b + 3] = bright;

    positions[p + 4] = x1;
    positions[p + 5] = y0;
    uvs[p + 4] = u1;
    uvs[p + 5] = v1;
    brights[b + 6] = bright;

    positions[p + 6] = x0;
    positions[p + 7] = y1;
    uvs[p + 6] = u0;
    uvs[p + 7] = v0;
    brights[b + 9] = bright;

    positions[p + 8] = x1;
    positions[p + 9] = y0;
    uvs[p + 8] = u1;
    uvs[p + 9] = v1;
    brights[b + 12] = bright;

    positions[p + 10] = x0;
    positions[p + 11] = y0;
    uvs[p + 10] = u0;
    uvs[p + 11] = v1;
    brights[b + 15] = bright;

    this.count = i + 6;
  }

  upload() {
    const { gl, mesh, count } = this;
    if (!count) {
      mesh.setInactive();
      return;
    }
    mesh.subMeshes[0].count = count;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positions.subarray(0, count * 2));
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.brights.subarray(0, count * 3));
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.texCoordBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.uvs.subarray(0, count * 2));
    mesh.setActive();
  }
}

/** Growable-looking, but fixed-size, vertex data for one RoostR mesh: 2D positions plus an RGB colour per vertex. */
class Buffer {
  constructor(gl, capacity, primitive, additive) {
    this.gl = gl;
    this.capacity = capacity;
    this.positions = new Float32Array(capacity * 2);
    this.colors = new Float32Array(capacity * 3);
    this.count = 0;

    const geometry = new CustomMesh();
    geometry.vertices = this.positions;
    geometry.normals = this.colors;
    geometry.setItemSize(2);
    geometry.setPrimitive(primitive);
    this.mesh = new Mesh(gl, geometry);
    this.mesh.addProgram(VERTEX, FRAGMENT, new Material());
    this.mesh.addCustomUniform('size', 'uniform2f', new Vec2(1, 1));
    this.mesh.setDepthWrite(false);
    // lines add their light to what is behind them, so a faded line is simply a dimmer one
    if (additive)
      this.mesh.setBlend('ONE', 'ONE');
    this.mesh.setInactive();
  }

  clear() {
    this.count = 0;
  }

  vertex(pos, color) {
    if (this.count >= this.capacity)
      return;
    const i = this.count++;
    this.positions[i * 2] = pos.x;
    this.positions[i * 2 + 1] = pos.y;
    this.colors[i * 3] = color[0];
    this.colors[i * 3 + 1] = color[1];
    this.colors[i * 3 + 2] = color[2];
  }

  upload() {
    const { gl, mesh, count } = this;
    if (!count) {
      mesh.setInactive();
      return;
    }
    mesh.subMeshes[0].count = count;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positions.subarray(0, count * 2));
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.colors.subarray(0, count * 3));
    mesh.setActive();
  }
}

const scratch = [0, 0, 0];
const cornerTR = new Vec2();
const cornerBL = new Vec2();

/** Flat 2D drawing for the HUD with RoostR: one opaque triangle buffer under one additive line buffer. */
class Layer {
  constructor(world, fillCapacity, lineCapacity, spriteCapacity = 0, withWeapon = false) {
    const { gl } = world;
    this.viewportSize = new Vec2(1, 1);
    this.scene = new Scene({ context: gl, clearColor: new Vec3(0, 0, 0), depthTest: false, viewport: this.viewportSize });
    this.fills = new Buffer(gl, fillCapacity, 'TRIANGLES', false);
    this.lines = new Buffer(gl, lineCapacity, 'LINES', true);
    this.scene.addMesh(this.fills.mesh);
    this.scene.addMesh(this.lines.mesh);
    // the gun goes in before the blood, so blood on the glass is drawn over it
    this.weapon = withWeapon ? new SpriteBuffer(gl, 1, arsenalAtlas()) : null;
    if (this.weapon)
      this.scene.addMesh(this.weapon.mesh);
    // the portrait's backdrop is the base's own wall texture, so the marine stands in front of the bulkheads he fights through
    this.wall = withWeapon ? new SpriteBuffer(gl, 2, wallAtlas()) : null;
    if (this.wall)
      this.scene.addMesh(this.wall.mesh);
    this.sprites = spriteCapacity ? new SpriteBuffer(gl, spriteCapacity, bloodAtlas()) : null;
    if (this.sprites)
      this.scene.addMesh(this.sprites.mesh);
  }

  resize(cssWidth, cssHeight, width, height) {
    this.viewportSize.setScalar(width, height);
    this.scene.setViewport(this.viewportSize);
    const size = new Vec2(cssWidth, cssHeight);
    this.fills.mesh.setCustomUniform('size', size);
    this.lines.mesh.setCustomUniform('size', size);
    this.sprites?.mesh.setCustomUniform('size', size);
    this.weapon?.mesh.setCustomUniform('size', size);
    this.wall?.mesh.setCustomUniform('size', size);
  }

  clear() {
    this.fills.clear();
    this.lines.clear();
    this.sprites?.clear();
    this.weapon?.clear();
    this.wall?.clear();
  }

  /** Strokes a polyline given as Vec2 points. */
  line(points, color, alpha = 1) {
    const { lines } = this;
    scratch[0] = color[0] * alpha;
    scratch[1] = color[1] * alpha;
    scratch[2] = color[2] * alpha;
    for (let i = 0; i + 1 < points.length; i++) {
      lines.vertex(points[i], scratch);
      lines.vertex(points[i + 1], scratch);
    }
  }

  /** Strokes the outline of an axis-aligned Rect. */
  rectLine(rect, color, alpha = 1) {
    const { lines } = this;
    scratch[0] = color[0] * alpha;
    scratch[1] = color[1] * alpha;
    scratch[2] = color[2] * alpha;
    const tl = rect.topLeftCorner;
    const br = rect.bottomRightCorner;
    cornerTR.setScalar(br.x, tl.y);
    cornerBL.setScalar(tl.x, br.y);
    lines.vertex(tl, scratch); lines.vertex(cornerTR, scratch);
    lines.vertex(cornerTR, scratch); lines.vertex(br, scratch);
    lines.vertex(br, scratch); lines.vertex(cornerBL, scratch);
    lines.vertex(cornerBL, scratch); lines.vertex(tl, scratch);
  }

  /** Strokes a closed Circ approximated with segments. The Circ is not modified. */
  circleLine(circ, color, alpha = 1, segments = 10) {
    const { lines } = this;
    scratch[0] = color[0] * alpha;
    scratch[1] = color[1] * alpha;
    scratch[2] = color[2] * alpha;
    const cx = circ.position.x;
    const cy = circ.position.y;
    const radius = circ.radius;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Trigo.twopi;
      const b = ((i + 1) / segments) * Trigo.twopi;
      cornerTR.setScalar(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      cornerBL.setScalar(cx + Math.cos(b) * radius, cy + Math.sin(b) * radius);
      lines.vertex(cornerTR, scratch);
      lines.vertex(cornerBL, scratch);
    }
  }

  /** Fills a convex polygon given as Vec2 points. The fill is opaque, so use it to hide what is behind. */
  fill(points, color) {
    const { fills } = this;
    for (let i = 2; i < points.length; i++) {
      fills.vertex(points[0], color);
      fills.vertex(points[i - 1], color);
      fills.vertex(points[i], color);
    }
  }

  /** Fills an axis-aligned Rect. */
  fillRect(rect, color) {
    const { fills } = this;
    const tl = rect.topLeftCorner;
    const br = rect.bottomRightCorner;
    cornerTR.setScalar(br.x, tl.y);
    cornerBL.setScalar(tl.x, br.y);
    fills.vertex(tl, color); fills.vertex(cornerTR, color); fills.vertex(br, color);
    fills.vertex(tl, color); fills.vertex(br, color); fills.vertex(cornerBL, color);
  }

  render(camera, time) {
    this.fills.upload();
    this.lines.upload();
    this.weapon?.upload();
    this.wall?.upload();
    this.sprites?.upload();
    this.scene.render(camera, time);
  }
}

/**
 * The HUD's line art. It has two layers:
 *  - glow: drawn into the 3D scene before the neon pass, so it shines like the world does;
 *  - crisp: drawn on the finished picture, for fine detail such as the minimap that the neon pass would blur.
 */
export class Overlay {
  constructor(world) {
    this.glow = new Layer(world, 96, 8192);
    // blood on the view is a picture, so it goes on the finished image where nothing blurs it
    this.crisp = new Layer(world, 8192, 8192, 128, true);
    // the marine's portrait is a live 3D head, drawn in its box after the crisp layer
    this.head = new HeadView(world.gl);
  }

  resize(cssWidth, cssHeight, width, height) {
    this.glow.resize(cssWidth, cssHeight, width, height);
    this.crisp.resize(cssWidth, cssHeight, width, height);
    this.head.resize(cssWidth, cssHeight, width, height);
  }

  clear() {
    this.glow.clear();
    this.crisp.clear();
    this.head.hide();
  }

  restore() {
    this.glow.scene.restore();
    this.crisp.scene.restore();
    this.head.restore();
  }
}
