import { CustomMesh, Material, Mesh, Scene, Vec2, Vec3 } from '@1pizzateam/roostr';
import { Trigo } from '@1pizzateam/spock';
import { bloodAtlas } from './bloodsprites.js';
import { faceAtlas } from './face.js';
import { arsenalAtlas } from './weapon.js';

const VERTEX = `
attribute vec2 aVertexPosition;
attribute vec3 aVertexNormal;
uniform vec2 uSize;
varying vec3 vColor;

void main(void) {
  // positions are in CSS pixels with the origin at the top left; the normal slot carries the colour
  vColor = aVertexNormal;
  gl_Position = vec4(aVertexPosition.x / uSize.x * 2.0 - 1.0, 1.0 - aVertexPosition.y / uSize.y * 2.0, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision mediump float;
varying vec3 vColor;

void main(void) {
  gl_FragColor = vec4(vColor, 1.0);
}
`;

const TEXTURED_VERTEX = `
attribute vec2 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aTextureCoord;
uniform vec2 uSize;
varying float vBright;
varying vec2 vTextureCoord;

void main(void) {
  // positions are in CSS pixels; the normal slot carries how bright the quad is
  vBright = aVertexNormal.x;
  vTextureCoord = aTextureCoord;
  gl_Position = vec4(aVertexPosition.x / uSize.x * 2.0 - 1.0, 1.0 - aVertexPosition.y / uSize.y * 2.0, 0.0, 1.0);
}
`;

const TEXTURED_FRAGMENT = `
precision mediump float;
uniform sampler2D uSampler;
varying float vBright;
varying vec2 vTextureCoord;

void main(void) {
  vec4 texel = texture2D(uSampler, vTextureCoord);
  if (texel.a < 0.5)
    discard;
  // it is a picture on the glass: it fades by being see-through, not by being added to what is behind it
  gl_FragColor = vec4(texel.rgb, vBright);
}
`;

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

  /** A quad from (x0, y0) to (x1, y1), y down, showing the texture rectangle [u0, v0, u1, v1]. */
  quad(x0, y0, x1, y1, [u0, v0, u1, v1], bright) {
    if (this.count + 6 > this.capacity)
      return;
    // v1 is the top of the picture, which is the top of the quad
    const corners = [[x0, y1, u0, v0], [x1, y1, u1, v0], [x1, y0, u1, v1], [x0, y1, u0, v0], [x1, y0, u1, v1], [x0, y0, u0, v1]];
    for (const [x, y, u, v] of corners) {
      const i = this.count++;
      this.positions[i * 2] = x;
      this.positions[i * 2 + 1] = y;
      this.brights[i * 3] = bright;
      this.uvs[i * 2] = u;
      this.uvs[i * 2 + 1] = v;
    }
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

  vertex(x, y, color) {
    if (this.count >= this.capacity)
      return;
    const i = this.count++;
    this.positions[i * 2] = x;
    this.positions[i * 2 + 1] = y;
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
    this.face = withWeapon ? new SpriteBuffer(gl, 1, faceAtlas()) : null;
    if (this.face)
      this.scene.addMesh(this.face.mesh);
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
    this.face?.mesh.setCustomUniform('size', size);
  }

  clear() {
    this.fills.clear();
    this.lines.clear();
    this.sprites?.clear();
    this.weapon?.clear();
    this.face?.clear();
  }

  /** Strokes a polyline given as x, y pairs. */
  line(points, color, alpha = 1) {
    const { lines } = this;
    scratch[0] = color[0] * alpha;
    scratch[1] = color[1] * alpha;
    scratch[2] = color[2] * alpha;
    for (let i = 0; i + 3 < points.length; i += 2) {
      lines.vertex(points[i], points[i + 1], scratch);
      lines.vertex(points[i + 2], points[i + 3], scratch);
    }
  }

  /** Strokes the outline of an axis-aligned rectangle. */
  rectLine(x, y, w, h, color, alpha = 1) {
    const { lines } = this;
    scratch[0] = color[0] * alpha;
    scratch[1] = color[1] * alpha;
    scratch[2] = color[2] * alpha;
    const x2 = x + w;
    const y2 = y + h;
    lines.vertex(x, y, scratch); lines.vertex(x2, y, scratch);
    lines.vertex(x2, y, scratch); lines.vertex(x2, y2, scratch);
    lines.vertex(x2, y2, scratch); lines.vertex(x, y2, scratch);
    lines.vertex(x, y2, scratch); lines.vertex(x, y, scratch);
  }

  /** Strokes a closed circle approximated with segments. */
  circleLine(cx, cy, radius, color, alpha = 1, segments = 10) {
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Trigo.twopi;
      const b = ((i + 1) / segments) * Trigo.twopi;
      this.line([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, cx + Math.cos(b) * radius, cy + Math.sin(b) * radius], color, alpha);
    }
  }

  /** Fills a convex polygon given as x, y pairs. The fill is opaque, so use it to hide what is behind. */
  fill(points, color) {
    const { fills } = this;
    for (let i = 4; i < points.length; i += 2) {
      fills.vertex(points[0], points[1], color);
      fills.vertex(points[i - 2], points[i - 1], color);
      fills.vertex(points[i], points[i + 1], color);
    }
  }

  fillRect(x, y, w, h, color) {
    const { fills } = this;
    fills.vertex(x, y, color); fills.vertex(x + w, y, color); fills.vertex(x + w, y + h, color);
    fills.vertex(x, y, color); fills.vertex(x + w, y + h, color); fills.vertex(x, y + h, color);
  }

  render(camera, time) {
    this.fills.upload();
    this.lines.upload();
    this.weapon?.upload();
    this.face?.upload();
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
  }

  resize(cssWidth, cssHeight, width, height) {
    this.glow.resize(cssWidth, cssHeight, width, height);
    this.crisp.resize(cssWidth, cssHeight, width, height);
  }

  clear() {
    this.glow.clear();
    this.crisp.clear();
  }

  restore() {
    this.glow.scene.restore();
    this.crisp.scene.restore();
  }
}
