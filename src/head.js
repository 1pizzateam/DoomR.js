import { DirectionalLight, PerspectiveCamera, Scene, Texture } from '@1pizzateam/roostr';
import { registerHeadView } from './overlay.js';
import { createShirtMesh, updateShirt } from './shirt.js';
import { paintFaceAtlas } from './skin/atlas.js';
import {
  FaceR,
  Vec2,
  Vec3,
  createDefaultCartridge,
  hydrateCartridge,
  loadBaseHead,
  loadHairStyle,
  registerAtlasPainter,
  loadFaceProfile,
  rebuildCartridgeRig
} from '@1pizzateam/facer';

/**
 * The marine's HUD portrait as a live 3D head: a FaceR African-sculpt head (the FaceGun "Doom Marine" preset),
 * fully animated by FaceR's Ken Perlin behaviour engine (blinks, eye saccades, head follow-through) plus combat reactions:
 * - health drives the 5 progressive damage tiers (bruises, blood) and the death expression
 * - taking damage fires a directional pain flinch
 * - firing a weapon holds a battle snarl while it keeps firing, picking up a power-up an evil grin
 *
 * It is drawn straight into the main framebuffer, in the HUD's face box, by its own RoostR Scene with a positioned viewport.
 */

const FOV = 38;
const FACE_Z = 31;
const SEED = 1993;
// seconds a snarl lasts after a shot: longer than the chainsaw's and chaingun's gap between shots, shorter than any other weapon's
const SHOT_HOLD = 0.16;

// FaceR ships no heads: the marine's head is a DoomR asset (src/heads), bundled by Vite because it is referenced by URL here
const MARINE_HEAD_URL = new URL('./heads/african_sculpt.facerhead.json', import.meta.url).href;

const MARINE_PROFILE_URL = new URL('./face/doomr.facerprofile.json', import.meta.url).href;
const MARINE_HAIR_URL = new URL('./hair/buzz_fade.facerhair.json', import.meta.url).href;
// the marine as last saved from FaceGun (proportions, sculpt, colours, personality)
const MARINE_CARTRIDGE_URL = new URL('./models/doom_marine.facer.json', import.meta.url).href;

let savedMarine = null;

async function loadSavedMarine() {
  try {
    const res = await fetch(MARINE_CARTRIDGE_URL, { cache: 'no-store' });
    savedMarine = res.ok ? await res.json() : null;
  } catch {
    savedMarine = null;
  }
}

/** Load the marine's face profile, head and hair and register the skin painter (all DoomR assets, FaceR bundles none) before the first HeadView. */
export function loadHeadAssets() {
  registerAtlasPainter(paintFaceAtlas);
  // the face profile (emotions, default look, damage, reactions, material) is the game's too
  return Promise.all([
    loadFaceProfile(MARINE_PROFILE_URL),
    loadBaseHead('african_sculpt', MARINE_HEAD_URL),
    loadHairStyle('buzz_fade', MARINE_HAIR_URL),
    loadSavedMarine(),
  ]);
}

/** The FaceGun "Doom Marine" cartridge: broad square jaw, strong brow ridge, battle-hardened gaze. */
export function marineCartridge() {
  if (savedMarine) {
    const saved = hydrateCartridge(savedMarine);
    // emotions come from the face profile, not from the saved copy, so profile edits are not frozen out
    saved.emotions = createDefaultCartridge('Doom Marine', 'doom_marine').emotions;
    return rebuildCartridgeRig(saved, true);
  }
  const cart = createDefaultCartridge('Doom Marine', 'doom_marine');
  const p = cart.proportions;
  p.craniumScale.setScalar(1.01, 1.0, 1.01);
  p.jawScale.setScalar(1.06, 1.02, 1.04);
  p.chinOffset.setScalar(0.0, -0.12, 0.22);
  p.cheekboneOffset.setScalar(0.14, 0.06, 0.12);
  p.browOffset.setScalar(0.05, -0.08, 0.22);
  p.eyeSocketOffset.setScalar(0.0, 0.0, 0.0);
  p.noseScale.setScalar(0.95, 1.0, 1.04);
  p.mouthScale.setScalar(1.03, 1.0, 0.9);
  p.earScale.setScalar(1.0, 1.0, 1.0);

  const a = cart.appearance;
  // the "Golden Bronze" skin tone of FaceGun's character editor (#966145, shadow #5c3420, lips #9e534a)
  a.skinColor.setScalar(150 / 255, 97 / 255, 69 / 255);
  a.skinShadowColor.setScalar(92 / 255, 52 / 255, 32 / 255);
  a.lipColor.setScalar(158 / 255, 83 / 255, 74 / 255);
  a.irisColor.setScalar(0.22, 0.13, 0.07);
  a.browColor.setScalar(0.08, 0.05, 0.04);
  a.hairColor.setScalar(0.06, 0.05, 0.04);
  a.baseHead = 'african_sculpt';
  a.hairStyle = 'buzz_fade';
  a.damageSeed = SEED;

  const q = cart.personality;
  q.blinkIntervalRange = new Vec2(2.6, 5.4);
  q.blinkDuration = 0.18;
  q.saccadeFrequency = 1.45;
  q.saccadeAmplitude = new Vec2(0.32, 0.16);
  q.headFollowRatio = 0.38;
  q.headDamping = 6.5;
  q.eyeDamping = 24.0;
  q.asymmetryAmount = 0.16;
  q.microJitterAmount = 0.14;

  return rebuildCartridgeRig(cart, true);
}

const PAIN_DIRECTION = new Vec3();
const VIEWPORT_POS = new Vec2();
const VIEWPORT_SIZE = new Vec2();

export class HeadView {
  constructor(gl) {
    this.gl = gl;
    this.tierPixels = new Array(5);
    this.tierTextures = new Array(5);
    this.facer = new FaceR(marineCartridge(), { seed: SEED, gl, atlasSize: 256 });
    const sizeVec = new Vec2(this.facer.atlasSize, this.facer.atlasSize);
    for (let tier = 0; tier < 5; tier++) {
      const pixels = paintFaceAtlas(this.facer.cartridge.appearance, tier, this.facer.atlasSize);
      this.tierPixels[tier] = pixels;
      this.tierTextures[tier] = gl
        ? Texture.create(pixels, gl, { size: sizeVec, flipY: false, generateMipmaps: true })
        : null;
    }
    this.facer.refreshAtlasTexture = () => {
      const tier = Math.max(0, Math.min(4, this.facer.pose.damageTier | 0));
      const tex = this.tierTextures[tier];
      if (tex && this.facer.mesh)
        this.facer.mesh.setSharedTexture(tex);
      return this.tierPixels[tier];
    };
    this.facer.refreshAtlasTexture();
    this.facer.setHealth(100);

    this.scene = new Scene({
      context: gl,
      ambientColor: new Vec3(0.54, 0.52, 0.55),
      depthTest: true,
      cullFace: 'NONE'
    });
    this.scene.addLight(new DirectionalLight({
      direction: new Vec3(-0.42, -0.56, -0.71),
      diffuse: new Vec3(1.04, 0.97, 0.9),
      specular: new Vec3(0.32, 0.29, 0.27)
    }));
    this.scene.addLight(new DirectionalLight({
      direction: new Vec3(0.62, -0.18, -0.45),
      diffuse: new Vec3(0.22, 0.26, 0.32),
      specular: new Vec3(0, 0, 0)
    }));
    this.scene.addMesh(this.facer.mesh);
    // the shirt is stitched to the skin's neck seam, so the portrait shows his shoulders
    this.shirt = createShirtMesh(gl, this.facer.cartridge);
    if (this.shirt)
      this.scene.addMesh(this.shirt);

    this.camera = new PerspectiveCamera(FOV, new Vec2(0.5, 200), gl);
    this.camera.setPosition(new Vec3(0, 0.8, FACE_Z));
    this.camera.setTarget(new Vec3(0, 0.3, 1));
    this.aspect = new Vec2(1, 1);

    this.visible = false;
    this.cssHeight = 1;
    this.scaleX = 1;
    this.scaleY = 1;
    this.x = 0;
    this.y = 0;
    this.w = 1;
    this.h = 1;
    this.lastTime = -1;
    this.lastHealth = 100;
    this.lastHurt = 0;
    this.lastShootFace = 0;
    this.lastShotAt = -10;
    this.lastPower = false;
    this.deadApplied = false;
  }

  /** The canvas is `width` x `height` backing pixels for `cssWidth` x `cssHeight` CSS pixels. */
  resize(cssWidth, cssHeight, width, height) {
    this.cssHeight = cssHeight;
    this.scaleX = width / cssWidth;
    this.scaleY = height / cssHeight;
  }

  /** Where the face box is: a Rect in CSS pixels, y down. */
  place(rect) {
    const tl = rect.topLeftCorner;
    const br = rect.bottomRightCorner;
    this.x = Math.round(tl.x * this.scaleX);
    this.w = Math.max(1, Math.round((br.x - tl.x) * this.scaleX));
    this.h = Math.max(1, Math.round((br.y - tl.y) * this.scaleY));
    // GL viewports are y up
    this.y = Math.round((this.cssHeight - br.y) * this.scaleY);
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

  /** Feeds the player's state into FaceR and advances its simulation. `game.time` is the game clock in seconds. */
  update(player, time) {
    const { facer } = this;
    const first = this.lastTime < 0;
    const dt = first ? 0 : Math.min(0.1, Math.max(0, time - this.lastTime));
    this.lastTime = time;

    const health = Math.max(0, Math.min(100, player.health));
    if (health !== this.lastHealth) {
      facer.setHealth(health);
      this.lastHealth = health;
    }

    const hurt = player.hurt ?? 0;
    if (hurt > 0.02 && this.lastHurt <= 0.02 && health > 0) {
      // hurt kicks the head away from the blow; the sign alternates so repeated hits don't lean one way forever
      PAIN_DIRECTION.setScalar(Math.sin(time * 7.3) > 0 ? 1 : -1, 0.2, 1);
      facer.triggerImpulse('pain', 1, PAIN_DIRECTION);
    }
    this.lastHurt = hurt;

    // every shot tops shootFace up, so a rise is a shot. The snarl is held while shots keep coming faster than SHOT_HOLD
    // (chainsaw, chaingun), and a single shot only gives a quick snarl that lets go at once
    const shootFace = player.shootFace ?? 0;
    if (shootFace > this.lastShootFace + 0.01)
      this.lastShotAt = time;
    this.lastShootFace = shootFace;
    facer.setShooting(health > 0 && time - this.lastShotAt < SHOT_HOLD);

    const power = (player.soulFlash ?? 0) > 0 || (player.berserkTimer ?? 0) > 18.5;
    if (power && !this.lastPower && health > 0)
      facer.triggerImpulse('evilGrin', 1);
    this.lastPower = power;

    if (first || dt > 0) {
      facer.update(dt);
      // the shirt is stitched to the neck seam, so it follows the neck as the rig moves it
      if (this.shirt)
        updateShirt(this.shirt, facer.deformedPositions);
    }
  }

  render(time) {
    if (!this.visible)
      return;
    const { gl, scene, camera } = this;
    VIEWPORT_POS.setScalar(this.x, this.y);
    VIEWPORT_SIZE.setScalar(this.w, this.h);
    scene.setViewport(VIEWPORT_SIZE, VIEWPORT_POS);
    camera.setProjectionMatrix(VIEWPORT_SIZE);

    // keep the head inside its box
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(this.x, this.y, this.w, this.h);
    scene.clear(false, true);
    scene.render(camera, time);
    gl.disable(gl.SCISSOR_TEST);
  }

  restore() {
    this.scene.restore();
    if (this.gl) {
      const sizeVec = new Vec2(this.facer.atlasSize, this.facer.atlasSize);
      for (let tier = 0; tier < 5; tier++) {
        this.tierTextures[tier] = Texture.create(this.tierPixels[tier], this.gl, {
          size: sizeVec,
          flipY: false,
          generateMipmaps: true,
        });
      }
      this.facer.refreshAtlasTexture();
    }
  }
}

registerHeadView(HeadView);
