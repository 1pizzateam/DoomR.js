import { Material, Mesh, QuadBatch as RoostrQuadBatch, Vec2, Vec3 } from '@1pizzateam/roostr';
import texturedQuadShader from './shaders/textured-quad.shadergun.json' with { type: 'json' };
import solidLitShader from './shaders/solid-lit.shadergun.json' with { type: 'json' };
import particleLitShader from './shaders/particle-lit.shadergun.json' with { type: 'json' };

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

export const TEXTURED_VERTEX = texturedQuadShader.vertex;

export const TEXTURED_FRAGMENT = texturedQuadShader.fragment;

/** Every textured surface in the world is dynamically lit and solid to the neon pass. */
export const SOLID_TEXTURED_FRAGMENT = solidLitShader.fragment;

export const PARTICLE_VERTEX = particleLitShader.vertex;

export const PARTICLE_FRAGMENT = particleLitShader.fragment;

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
  constructor(gl, { capacity, atlas, sharedTexture = null, material = new Material({ diffuse: new Vec3(1, 1, 1) }), textureOptions = {}, vertex = TEXTURED_VERTEX, fragment = SOLID_TEXTURED_FRAGMENT, pbr = null }) {
    super(gl, {
      capacity,
      vertexShader: vertex,
      fragmentShader: fragment,
      material,
      sharedTexture,
      texture: sharedTexture ? undefined : atlas?.data,
      textureOptions: sharedTexture ? undefined : { size: new Vec2(atlas.width, atlas.height), magFilter: gl.NEAREST, minFilter: gl.NEAREST, ...textureOptions },
    });
    this.pbrTextures = null;
    if (pbr)
      this.setPbrTextures(pbr.normal, pbr.detail, pbr.ao, pbr.noise);
  }

  /**
   * Turns on physically based shading for this batch: `normal` is the GPU texture of the material atlas (normal x and
   * y, height, AO; laid out like the colour atlas, see `pbr.js`), `detail` the fine-grain normal map, `ao` the level's
   * occlusion map and `noise` the rust noise. RoostR binds one texture per mesh, so these sit on texture units 1 to 4
   * and are bound in `renderSelf`, just before the draw.
   */
  setPbrTextures(normal, detail = null, ao = null, noise = null) {
    installPbrTextures(this, normal, detail, ao, noise);
  }

  renderSelf(projectionMatrix, viewMatrix, lights, time, blendMode, cameraPosition, fog, frame) {
    bindPbrMaps(this, blendMode);
    return super.renderSelf(projectionMatrix, viewMatrix, lights, time, blendMode, cameraPosition, fog, frame);
  }
}

function installPbrTextures(mesh, normal, detail, ao, noise) {
  if (!mesh.pbrTextures && typeof mesh.addCustomUniform === 'function') {
    mesh.addCustomUniform('hasPbr', 'uniform1i', 1);
    mesh.addCustomUniform('hasNoise', 'uniform1i', 1);
    mesh.addCustomUniform('normalSampler', 'uniform1i', 1);
    mesh.addCustomUniform('detailSampler', 'uniform1i', 2);
    mesh.addCustomUniform('aoSampler', 'uniform1i', 3);
    mesh.addCustomUniform('noiseSampler', 'uniform1i', 4);
    mesh.addCustomUniform('aoInvSize', 'uniform2f', new Vec2(0, 0));
    mesh.addCustomUniform('parallax', 'uniform1f', 1);
  }
  mesh.pbrTextures = { normal, detail, ao, noise };
}

/** Binds the material maps on units 1 to 4, just before the mesh draws. */
function bindPbrMaps(mesh, blendMode) {
  const pbr = mesh.pbrTextures;
  const gl = mesh.context;
  if (!pbr || !mesh.isActive() || mesh.blendMode !== blendMode || typeof gl.activeTexture !== 'function')
    return;
  const bound = boundUnits(gl);
  let switched = bindUnit(gl, bound, 1, pbr.normal);
  switched = bindUnit(gl, bound, 2, pbr.detail) || switched;
  switched = bindUnit(gl, bound, 3, pbr.ao) || switched;
  switched = bindUnit(gl, bound, 4, pbr.noise) || switched;
  if (switched)
    gl.activeTexture(gl.TEXTURE0);
}

/**
 * Gives a plain mesh (barrel, chest, furniture) the same material maps a QuadBatch can have: afterwards it has
 * `setPbrTextures` and binds them just before each draw. Returns the mesh.
 */
export function enableMeshPbr(mesh) {
  if (mesh.setPbrTextures)
    return mesh;
  mesh.pbrTextures = null;
  mesh.setPbrTextures = (normal, detail = null, ao = null, noise = null) => installPbrTextures(mesh, normal, detail, ao, noise);
  const base = mesh.renderSelf;
  mesh.renderSelf = function (projectionMatrix, viewMatrix, lights, time, blendMode, cameraPosition, fog, frame) {
    bindPbrMaps(this, blendMode);
    return base.call(this, projectionMatrix, viewMatrix, lights, time, blendMode, cameraPosition, fog, frame);
  };
  return mesh;
}

/** The texture last bound on each extra unit of a context, so batches that share maps do not bind them again. */
const boundUnitsOfContext = new WeakMap();

function boundUnits(gl) {
  let units = boundUnitsOfContext.get(gl);
  if (!units) {
    units = [];
    boundUnitsOfContext.set(gl, units);
  }
  return units;
}

/** Binds `texture` on texture `unit` unless it is already there; returns whether the active unit was changed. */
function bindUnit(gl, bound, unit, texture) {
  if (bound[unit] === texture)
    return false;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  bound[unit] = texture;
  return true;
}


/**
 * A mesh of any geometry with a texture on it, drawn like the batches above: the picture times the material colour,
 * clear pixels dropped, fog applied. The geometry needs texture coordinates.
 */
export function texturedMesh(gl, geometry, { atlas, sharedTexture = null, material = new Material({ diffuse: new Vec3(1, 1, 1) }), textureOptions = {}, vertex = TEXTURED_VERTEX, fragment = SOLID_TEXTURED_FRAGMENT }) {
  const mesh = new Mesh(gl, geometry);
  mesh.addProgram(vertex, fragment, material);
  if (sharedTexture && typeof mesh.setSharedTexture === 'function')
    mesh.setSharedTexture(sharedTexture);
  else
    mesh.setTexture(atlas.data, { size: new Vec2(atlas.width, atlas.height), magFilter: gl.NEAREST, minFilter: gl.NEAREST, ...textureOptions });
  return mesh;
}
