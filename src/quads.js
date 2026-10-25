import { Material, Mesh, QuadBatch as RoostrQuadBatch, Vec2, Vec3 } from '@1pizzateam/roostr';

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
    vec3 diff = uLightDiffuse[i];
    if (diff.x + diff.y + diff.z <= 0.001)
      continue;
    vec3 delta = uLightPosition[i] - worldPos;
    if (delta.x * delta.x + delta.z * delta.z > 160000.0)
      continue;
    float isCeilingFixture = step(54.0, uLightPosition[i].y);
    float onCeiling = step(58.0, worldPos.y) * isCeilingFixture;
    float verticalSpan = mix(delta.y, 62.0, onCeiling);
    vec3 lightVec = vec3(delta.x, verticalSpan, delta.z);
    float distSq = dot(lightVec, lightVec);
    if (distSq > 160000.0)
      continue;
    vec3 att = uLightAttenuation[i];
    if (att.z > 0.001 && distSq >= 18225.0)
      continue;
    float dist = sqrt(distSq);
    float shortRange = step(0.001, att.z);
    float rangeCutoff = mix(1.0, 1.0 - smoothstep(75.0, 135.0, dist), shortRange);
    float attenuation = rangeCutoff / max(att.x + att.y * dist + att.z * distSq, 0.0001);
    float downward = clamp((uLightPosition[i].y - worldPos.y) / max(dist, 1.0), 0.0, 1.0);
    float spread = mix(1.05, 0.5 + 0.75 * downward * downward, isCeilingFixture);
    total += diff * (attenuation * spread);
  }
  return mix(min(total, vec3(2.5)), max(total, vec3(1.35)), clamp(emissive, 0.0, 1.0));
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
  if (uHasFog == 1 && vDepth >= uFogFar) {
    gl_FragColor = vec4(uFogColor, ${SOLID_ALPHA.toFixed(1)});
    return;
  }
  vec3 color = texel.rgb * uMaterialDiffuse;
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade);
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
  if (uHasFog == 1 && vDepth >= uFogFar) {
    gl_FragColor = vec4(uFogColor, ${SOLID_ALPHA.toFixed(1)});
    return;
  }
  vec3 color = texel.rgb * uMaterialDiffuse * surfaceLight(vWorldPos, 0.0);
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade);
  }
  gl_FragColor = vec4(color, ${SOLID_ALPHA.toFixed(1)});
}
`;

export const PARTICLE_VERTEX = `
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
  v.z += min(vDepth * 0.45, 16.0 + vDepth * 0.02);
  vTextureCoord = aTextureCoord;
  vWorldPos = world.xyz;
  gl_Position = uProjectionMatrix * v;
}
`;

export const PARTICLE_FRAGMENT = `
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
  if (uHasFog == 1 && vDepth >= uFogFar) {
    gl_FragColor = vec4(uFogColor, ${SOLID_ALPHA.toFixed(1)});
    return;
  }
  vec3 lit = mix(vec3(1.12), surfaceLight(vWorldPos, 0.85), 0.35);
  vec3 color = texel.rgb * uMaterialDiffuse * lit;
  if (uHasFog == 1) {
    float fade = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fade);
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
export class QuadBatch extends RoostrQuadBatch {
  constructor(gl, { capacity, atlas, sharedTexture = null, material = new Material({ diffuse: new Vec3(1, 1, 1) }), textureOptions = {}, vertex = TEXTURED_VERTEX, fragment = SOLID_TEXTURED_FRAGMENT }) {
    super(gl, {
      capacity,
      vertexShader: vertex,
      fragmentShader: fragment,
      material,
      sharedTexture,
      texture: sharedTexture ? undefined : atlas?.data,
      textureOptions: sharedTexture ? undefined : { size: new Vec2(atlas.width, atlas.height), magFilter: gl.NEAREST, minFilter: gl.NEAREST, ...textureOptions },
    });
  }
}

/**
 * A mesh of any geometry with a texture on it, drawn like the batches above: the picture times the material colour,
 * clear pixels dropped, fog applied. The geometry needs texture coordinates.
 */
export function texturedMesh(gl, geometry, { atlas, sharedTexture = null, material = new Material({ diffuse: new Vec3(1, 1, 1) }), textureOptions = {}, fragment = SOLID_TEXTURED_FRAGMENT }) {
  const mesh = new Mesh(gl, geometry);
  mesh.addProgram(TEXTURED_VERTEX, fragment, material);
  if (sharedTexture && typeof mesh.setSharedTexture === 'function')
    mesh.setSharedTexture(sharedTexture);
  else
    mesh.setTexture(atlas.data, { size: new Vec2(atlas.width, atlas.height), magFilter: gl.NEAREST, minFilter: gl.NEAREST, ...textureOptions });
  return mesh;
}
