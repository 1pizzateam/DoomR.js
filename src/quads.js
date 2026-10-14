import { CustomMesh, Material, Mesh, Vec2, Vec3, BoundingBox } from '@1pizzateam/roostr';

// A textured quad batch is drawn with this: the texture is multiplied by the material colour, pixels with no alpha are
// dropped, and the quads are pulled a little towards the camera so they win depth ties against the faces they lie on.
/**
 * Surfaces that are solid (floor, walls, doors, barrels) write this alpha. The neon pass thickens and glows lines and
 * light, which would smear a picture painted on a surface, so it passes anything with this alpha through untouched.
 */
export const SOLID_ALPHA = 0.5;

/**
 * Dynamic scene lighting from RoostR's `AmbientLight` and `PointLight` uniforms (`uNbLights`, `uAmbientLight`,
 * `uLightPosition`, `uLightDiffuse`, `uLightAttenuation`). Recessed ceiling fixtures cast pools of light onto the deck,
 * bulkheads, doors and barrels below while emissive diffuser strips stay bright.
 */
export const LIGHT_GLSL = `
uniform int uNbLights;
uniform vec3 uAmbientLight;
uniform vec3 uLightPosition[8];
uniform vec3 uLightDiffuse[8];
uniform vec3 uLightAttenuation[8];

vec3 surfaceLight(vec3 worldPos, float emissive) {
  if (uNbLights <= 0)
    return vec3(1.0);
  vec3 total = uAmbientLight;
  for (int i = 0; i < 8; i++) {
    if (i >= uNbLights)
      break;
    vec3 delta = uLightPosition[i] - worldPos;
    float dist = length(delta);
    vec3 att = uLightAttenuation[i];
    float attenuation = 1.0 / max(att.x + att.y * dist + att.z * dist * dist, 0.0001);
    float downward = worldPos.y > 58.0 ? 1.0 : clamp((uLightPosition[i].y - worldPos.y) / max(dist, 1.0), 0.0, 1.0);
    float spread = 0.5 + 0.75 * downward * downward;
    total += uLightDiffuse[i] * (attenuation * spread);
  }
  return mix(min(total, vec3(2.2)), max(total, vec3(1.35)), clamp(emissive, 0.0, 1.0));
}
`;

export const TEXTURED_VERTEX = `
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
varying float vDepth;
varying vec2 vTextureCoord;
varying vec3 vWorldPos;

void main(void) {
  vec4 world = uModelMatrix * vec4(aVertexPosition, 1.0);
  vec4 v = uViewMatrix * world;
  vDepth = -v.z;
  v.z += 1.2 + vDepth * 0.01;
  vTextureCoord = aTextureCoord;
  vWorldPos = world.xyz;
  gl_Position = uProjectionMatrix * v;
}
`;

export const TEXTURED_FRAGMENT = `
precision mediump float;
uniform sampler2D uSampler;
uniform vec3 uMaterialDiffuse;
uniform int uHasFog;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vDepth;
varying vec2 vTextureCoord;

void main(void) {
  vec4 texel = texture2D(uSampler, vTextureCoord);
  if (texel.a < 0.5)
    discard;
  vec3 color = texel.rgb * uMaterialDiffuse;
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade * 0.9);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA.toFixed(1)});
}
`;

/** Every textured surface in the world is dynamically lit and solid to the neon pass. */
export const SOLID_TEXTURED_FRAGMENT = `
precision mediump float;
uniform sampler2D uSampler;
uniform vec3 uMaterialDiffuse;
uniform int uHasFog;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vDepth;
varying vec2 vTextureCoord;
varying vec3 vWorldPos;

${LIGHT_GLSL}
void main(void) {
  vec4 texel = texture2D(uSampler, vTextureCoord);
  if (texel.a < 0.5)
    discard;
  vec3 color = texel.rgb * uMaterialDiffuse * surfaceLight(vWorldPos, 0.0);
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade * 0.9);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA.toFixed(1)});
}
`;

/**
 * Many flat textured quads in one RoostR mesh, one draw call, refilled whenever they change. Decals on walls and floors
 * and particles that face the camera are all this: the caller works out the four corners of each in the world.
 *
 *   batch.begin(); batch.quad(corners, [u0, v0, u1, v1]); ...; batch.end();
 *
 * The arrays live in the mesh itself, so after a lost GPU context RoostR rebuilds the buffers (and the texture,
 * which it owns) from them, with what was last filled.
 */
export class QuadBatch extends Mesh {
  constructor(gl, { capacity, atlas, material = new Material({ diffuse: new Vec3(1, 1, 1) }), textureOptions = {}, vertex = TEXTURED_VERTEX, fragment = SOLID_TEXTURED_FRAGMENT }) {
    const geometry = new CustomMesh();
    geometry.vertices = new Float32Array(capacity * 18);
    geometry.uvs = new Float32Array(capacity * 12);
    geometry.setPrimitive('TRIANGLES');
    super(gl, geometry);
    this.capacity = capacity;
    this.used = 0;
    this.low = new Vec3();
    this.high = new Vec3();
    this.bounds = new BoundingBox();
    this.addProgram(vertex, fragment, material);
    this.setTexture(atlas.data, { size: new Vec2(atlas.width, atlas.height), magFilter: gl.NEAREST, minFilter: gl.NEAREST, ...textureOptions });
    this.setInactive();
  }

  begin() {
    this.used = 0;
    this.low.setScalar(Infinity, Infinity, Infinity);
    this.high.setScalar(-Infinity, -Infinity, -Infinity);
    return this;
  }

  /** Adds a quad: corners are 12 numbers (bottom-left, bottom-right, top-right, top-left); false when the batch is full. */
  quad(corners, [u0, v0, u1, v1]) {
    if (this.used >= this.capacity)
      return false;
    const { vertices, uvs } = this;
    let v = this.used * 18;
    let t = this.used * 12;
    for (const corner of [0, 1, 2, 0, 2, 3]) {
      const i = corner * 3;
      vertices[v++] = corners[i];
      vertices[v++] = corners[i + 1];
      vertices[v++] = corners[i + 2];
      uvs[t++] = corner === 1 || corner === 2 ? u1 : u0;
      uvs[t++] = corner >= 2 ? v1 : v0;
      this.measure(corners[i], corners[i + 1], corners[i + 2]);
    }
    this.used++;
    return true;
  }

  measure(x, y, z) {
    const { low, high } = this;
    if (x < low.x) low.x = x;
    if (y < low.y) low.y = y;
    if (z < low.z) low.z = z;
    if (x > high.x) high.x = x;
    if (y > high.y) high.y = y;
    if (z > high.z) high.z = z;
  }

  /** Sends what was filled to the GPU. An empty batch is not drawn. */
  end() {
    const { context: gl } = this;
    this.subMeshes[0].count = this.used * 6;
    if (!this.used) {
      this.setInactive();
      return this;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices.subarray(0, this.used * 18));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.uvs.subarray(0, this.used * 12));
    // frustum culling needs the size of what is in the buffer now, which RoostR cannot know
    if (typeof this.setLocalBounds === 'function')
      this.setLocalBounds(this.bounds.set(this.low, this.high));
    this.setActive();
    return this;
  }

  /** Hides the batch without losing what is in it, e.g. while its door is sunk into the floor. */
  show(visible) {
    if (visible && this.used)
      this.setActive();
    else
      this.setInactive();
  }
}

/**
 * A mesh of any geometry with a texture on it, drawn like the batches above: the picture times the material colour,
 * clear pixels dropped, fog applied. The geometry needs texture coordinates.
 */
export function texturedMesh(gl, geometry, { atlas, material = new Material({ diffuse: new Vec3(1, 1, 1) }), textureOptions = {}, fragment = SOLID_TEXTURED_FRAGMENT }) {
  const mesh = new Mesh(gl, geometry);
  mesh.addProgram(TEXTURED_VERTEX, fragment, material);
  mesh.setTexture(atlas.data, { size: new Vec2(atlas.width, atlas.height), magFilter: gl.NEAREST, minFilter: gl.NEAREST, ...textureOptions });
  return mesh;
}
