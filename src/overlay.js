import { CustomMesh, Material, Mesh, Scene, Vec2 } from '@1pizzateam/roostr';

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

/** Growable-looking, but fixed-size, vertex data for one RoostR mesh: 2D positions plus an RGB colour per vertex. */
class Buffer {
  constructor(gl, capacity, primitive, additive) {
    this.gl = gl;
    this.capacity = capacity;
    this.positions = new Float32Array(capacity * 2);
    this.colors = new Float32Array(capacity * 3);
    this.count = 0;

    const geometry = new CustomMesh();
    geometry.setVertices(this.positions);
    geometry.setNormals(this.colors);
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
  constructor(world, fillCapacity, lineCapacity) {
    const { gl } = world;
    this.scene = new Scene({ context: gl, clearColor: [0, 0, 0], depthTest: false, viewport: { x: 0, y: 0, width: 1, height: 1 } });
    this.fills = new Buffer(gl, fillCapacity, 'TRIANGLES', false);
    this.lines = new Buffer(gl, lineCapacity, 'LINES', true);
    this.scene.addMesh(this.fills.mesh);
    this.scene.addMesh(this.lines.mesh);
  }

  resize(cssWidth, cssHeight, width, height) {
    this.scene.setViewport(0, 0, width, height);
    const size = new Vec2(cssWidth, cssHeight);
    this.fills.mesh.setCustomUniform('size', size);
    this.lines.mesh.setCustomUniform('size', size);
  }

  clear() {
    this.fills.clear();
    this.lines.clear();
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
      const a = (i / segments) * Math.PI * 2;
      const b = ((i + 1) / segments) * Math.PI * 2;
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
    this.crisp = new Layer(world, 8192, 8192);
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
