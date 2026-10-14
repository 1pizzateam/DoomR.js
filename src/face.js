/**
 * The marine's HUD portrait (modelled on the classic Doom status-bar mugshot, STFST / STFOUCH / STFEVL / STFKILL):
 * - Drawn procedurally in code as a crisp pixel-art sprite atlas (48 x 56 pixels per frame).
 * - Five health damage tiers (0 = 81..100 HP clean, up to 4 = 1..20 HP heavily bloodied) x five expressions:
 *   - center: alert, furrowed brow looking straight ahead
 *   - left:   glancing left (head and eyes shifted left)
 *   - right:  glancing right (head and eyes shifted right)
 *   - shoot:  fierce battle snarl / evil grin with warm muzzle-flash rim light when firing
 *   - pain:   shocked ouch/pain grimace when taking damage
 * - Plus a final `dead` frame when health reaches 0.
 */

export const FACE_CELL_W = 48;
export const FACE_CELL_H = 56;
export const FACE_TIERS = 5;
export const FACE_POSES = { center: 0, left: 1, right: 2, shoot: 3, pain: 4 };
export const FACE_POSE_COUNT = 5;
export const FACE_DEAD_FRAME = FACE_TIERS * FACE_POSE_COUNT;
export const FACE_FRAME_COUNT = FACE_TIERS * FACE_POSE_COUNT + 1;

const W = FACE_CELL_W;
const H = FACE_CELL_H;
const CX = 24;

const SKIN = [
  [48, 26, 18],
  [76, 42, 28],
  [108, 62, 42],
  [142, 86, 58],
  [174, 112, 76],
  [202, 138, 96],
  [226, 166, 120],
  [244, 194, 148]
];

const HAIR = [
  [20, 12, 8],
  [36, 22, 14],
  [58, 36, 22],
  [82, 52, 32],
  [108, 70, 44]
];

const ARMOR_STEEL = [
  [12, 16, 22],
  [24, 32, 44],
  [42, 54, 72],
  [66, 84, 108],
  [98, 122, 152],
  [140, 168, 202],
  [188, 214, 242]
];

const ARMOR_SLATE = [
  [14, 22, 24],
  [24, 38, 42],
  [38, 60, 64],
  [56, 86, 90],
  [82, 118, 122],
  [116, 156, 160]
];

const NECK_SEAL = [
  [10, 12, 16],
  [18, 22, 30],
  [30, 38, 48],
  [46, 56, 70]
];

const LED_CYAN = [
  [16, 88, 112],
  [32, 164, 204],
  [64, 228, 255],
  [172, 250, 255]
];

const LED_WARN = [
  [110, 48, 8],
  [196, 96, 14],
  [250, 168, 28],
  [255, 228, 120]
];

const LED_CRIT = [
  [96, 10, 18],
  [168, 18, 28],
  [236, 36, 48],
  [255, 130, 140]
];

const BLOOD_RAMP = [
  [52, 6, 10],
  [92, 8, 14],
  [142, 12, 20],
  [188, 18, 28],
  [224, 34, 42]
];

const BRUISE = [
  [54, 28, 44],
  [78, 38, 56],
  [104, 52, 68]
];

const TEETH = [
  [168, 158, 142],
  [212, 204, 188],
  [242, 238, 226]
];

const EYE_WHITE = [222, 226, 232];
const IRIS = [56, 92, 64];
const PUPIL = [14, 16, 20];

const BAYER4 = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5
];

function hash(x, y) {
  let h = Math.imul(x * 374761393 + y * 668265263, 1103515245);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function ramp(palette, t, x, y) {
  const scaled = Math.max(0, Math.min(palette.length - 1.001, t * (palette.length - 1)));
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const threshold = BAYER4[((y & 3) << 2) | (x & 3)] / 16;
  return palette[Math.min(palette.length - 1, idx + (frac > threshold ? 1 : 0))];
}

/**
 * Which face frame to display for the player's current state:
 * - `health <= 0` -> `FACE_DEAD_FRAME`
 * - `hurt > 0` -> pain grimace for the current damage tier
 * - `shotElapsed >= 0 && shotElapsed < 0.42` -> fierce firing grin for the current damage tier
 * - otherwise -> idle scanning cycle (center -> left -> center -> right)
 */
export function faceFrame({ health = 100, hurt = 0, shotElapsed = -1, time = 0 } = {}) {
  if (health <= 0)
    return FACE_DEAD_FRAME;
  const clamped = Math.max(1, Math.min(100, health));
  const tier =
    clamped > 90
      ? 0
      : clamped > 65
        ? 1
        : clamped > 40
          ? 2
          : clamped > 20
            ? 3
            : 4;
  let pose = FACE_POSES.center;
  if (hurt > 0.02)
    pose = FACE_POSES.pain;
  else if (shotElapsed >= 0 && shotElapsed < 0.42)
    pose = FACE_POSES.shoot;
  else {
    const step = Math.floor(time * 1.15) % 6;
    if (step === 1)
      pose = FACE_POSES.left;
    else if (step === 4)
      pose = FACE_POSES.right;
  }
  return tier * FACE_POSE_COUNT + pose;
}

/**
 * Screen rectangle `{ x0, y0, x1, y1, pixel }` for the HUD portrait box at the bottom-left of the screen.
 */
export function facePlacement({ width, height, hurt = 0 } = {}) {
  const scale = Math.min(1.35, Math.max(0.75, height / 760));
  const pixel = Math.max(1, Math.round(1.5 * scale));
  const w = W * pixel;
  const h = H * pixel;
  const joltX = hurt > 0 ? Math.round(Math.sin(hurt * 55) * 2 * pixel) : 0;
  const joltY = hurt > 0 ? Math.round(hurt * 4 * pixel) : 0;
  const x0 = 24 + joltX;
  const y1 = height - 18 + joltY;
  return { x0, y0: y1 - h, x1: x0 + w, y1, pixel };
}

/** Texture coordinates `[u0, v0, u1, v1]` for a frame in `faceAtlas()`. */
export function faceCellUv(frame) {
  const inset = 0.02 / (W * FACE_FRAME_COUNT);
  return [frame / FACE_FRAME_COUNT + inset, 0, (frame + 1) / FACE_FRAME_COUNT - inset, 1];
}

class Art {
  constructor() {
    this.pixels = new Uint8Array(W * H * 4);
  }

  put(x, y, rgb, a = 255) {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || xi >= W || yi < 0 || yi >= H || !rgb)
      return;
    const o = (yi * W + xi) * 4;
    this.pixels[o] = rgb[0];
    this.pixels[o + 1] = rgb[1];
    this.pixels[o + 2] = rgb[2];
    this.pixels[o + 3] = a;
  }

  has(x, y) {
    if (x < 0 || x >= W || y < 0 || y >= H)
      return false;
    return this.pixels[(y * W + x) * 4 + 3] > 0;
  }

  rect(x0, y0, w, h, rgb) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        this.put(x, y, rgb);
  }
}

function drawMarineFace(a, tier, pose, dead = false) {
  const shiftX = pose === FACE_POSES.left ? -2 : pose === FACE_POSES.right ? 2 : pose === FACE_POSES.pain ? -1 : 0;
  const shiftY = dead ? 4 : pose === FACE_POSES.pain || pose === FACE_POSES.shoot ? 1 : 0;
  const hx = CX + shiftX;
  const ledRamp = dead || tier >= 3 ? LED_CRIT : tier === 2 ? LED_WARN : LED_CYAN;

  // 1. Ribbed cybernetic carbon-mesh neck seal & hydraulic throat column (y = 37..48)
  for (let y = 37; y <= 48; y++)
    for (let x = hx - 9; x <= hx + 9; x++) {
      const u = (x - (hx - 9)) / 18;
      const cyl = Math.sin(u * Math.PI);
      const rib = (y + shiftY) % 2 === 0 ? 0.18 : -0.08;
      const piston = Math.abs(Math.abs(x - hx) - 5) < 1.2;
      a.put(x, y, piston ? ramp(ARMOR_STEEL, 0.35 + cyl * 0.4, x, y) : ramp(NECK_SEAL, 0.2 + cyl * 0.55 + rib, x, y));
    }

  // 2. Heavy futuristic space-marine power armor pauldrons, gorget & chest core (y = 34..55)
  for (let y = 34; y < H; y++) {
    const t = (y - 34) / (H - 1 - 34);
    const outerHalfW = Math.min(23, Math.round(17 + t * 8));
    // V-shaped armored gorget opening around the lower jaw and ribbed neck seal
    const throatHalfW = y < 46 ? Math.round(11.5 - (y - 34) * 0.55) : 0;
    for (let x = CX - outerHalfW; x <= CX + outerHalfW; x++) {
      const dx = x - CX;
      const adx = Math.abs(dx);
      if (adx < throatHalfW)
        continue;
      // Shoulder pauldron silhouette slopes down slightly toward outer frame edges
      const pauldronTop = 34 + Math.max(0, Math.round((adx - 15) * 0.75));
      if (y < pauldronTop)
        continue;

      const u = (x - (CX - outerHalfW)) / Math.max(1, outerHalfW * 2);
      const dome = Math.sin(u * Math.PI);
      const gorgetRim = y < 47 && Math.abs(adx - throatHalfW) <= 1.6;
      const pauldronSeam = Math.abs(adx - 13) <= 0.8 || y === pauldronTop + 4;
      const bevelTop = y <= pauldronTop + 1;
      const chestCenter = y >= 47 && adx <= 5;

      // Glowing plasma telemetry vents on both chest plates (y = 48..52, adx = 8..12)
      if (y >= 48 && y <= 52 && adx >= 8 && adx <= 12 && (y - 48) % 2 === 0) {
        const glow = adx === 10 ? 3 : adx >= 9 && adx <= 11 ? 2 : 1;
        a.put(x, y, dead ? LED_CRIT[0] : ledRamp[glow]);
        continue;
      }
      // Central sternum power-core slit (y = 49..53, adx <= 2)
      if (y >= 49 && y <= 53 && adx <= 2) {
        a.put(x, y, adx === 0 && !dead ? ledRamp[3] : ledRamp[dead ? 0 : 1]);
        continue;
      }

      if (pauldronSeam)
        a.put(x, y, ARMOR_STEEL[0]);
      else if (gorgetRim || bevelTop)
        a.put(x, y, ramp(ARMOR_STEEL, 0.58 + dome * 0.35, x, y));
      else if (chestCenter)
        a.put(x, y, ramp(ARMOR_STEEL, 0.28 + dome * 0.45, x, y));
      else {
        const plateShade = 0.22 + dome * 0.54 + (y < 43 ? 0.14 : -0.06);
        a.put(x, y, ramp(adx > 13 ? ARMOR_SLATE : ARMOR_STEEL, plateShade, x, y));
      }
    }
  }

  // 3. Sculpted 3D cranium, brow ridge, cheekbones, square jaw, and cleft chin (y = 8 + shiftY .. 44 + shiftY)
  const headTop = 8 + shiftY;
  const headBot = 44 + shiftY;
  const eyeY = 23 + shiftY;
  for (let y = headTop; y <= headBot; y++) {
    const v = (y - headTop) / (headBot - headTop);
    let halfW;
    if (v < 0.25)
      halfW = 11 + Math.sin((v / 0.25) * (Math.PI * 0.5)) * 4.0;
    else if (v < 0.62)
      halfW = 14.8 - (v - 0.25) * 2.2;
    else if (v < 0.85)
      halfW = 14.0 - (v - 0.62) * 14.5;
    else
      halfW = 10.6 - (v - 0.85) * 32.0;

    const hw = Math.max(2, Math.round(halfW));
    for (let x = hx - hw; x <= hx + hw; x++) {
      const dx = x - hx;
      const nx = dx / Math.max(1, hw);
      const cyl = Math.sqrt(Math.max(0, 1 - nx * nx));

      // Smooth 3D radial lobes for anatomical facial structure
      let light = 0.22 + cyl * 0.52 + (-nx * 0.08);

      // Forehead dome & brow bossing
      const browDist = Math.hypot(dx / 11, (y - (18 + shiftY)) / 3.2);
      if (browDist < 1)
        light += (1 - browDist) * 0.2;

      // Smooth orbital eye sockets (left and right)
      const sockL = Math.hypot((dx + 6) / 4.8, (y - (eyeY + 0.5)) / 3.0);
      const sockR = Math.hypot((dx - 6) / 4.8, (y - (eyeY + 0.5)) / 3.0);
      const sock = Math.min(sockL, sockR);
      if (sock < 1)
        light -= (1 - sock) * 0.32;

      // Sculpted zygomatic cheekbones below outer eyes
      const cheekL = Math.hypot((dx + 8.5) / 4.8, (y - (28 + shiftY)) / 3.5);
      const cheekR = Math.hypot((dx - 8.5) / 4.8, (y - (28 + shiftY)) / 3.5);
      const cheek = Math.min(cheekL, cheekR);
      if (cheek < 1)
        light += (1 - cheek) * 0.18;

      // Sub-malar cheek hollows above jawline
      const hollowL = Math.hypot((dx + 9.5) / 4.2, (y - (34 + shiftY)) / 4.0);
      const hollowR = Math.hypot((dx - 9.5) / 4.2, (y - (34 + shiftY)) / 4.0);
      const hollow = Math.min(hollowL, hollowR);
      if (hollow < 1)
        light -= (1 - hollow) * 0.18;

      // Nasolabial folds (smile/snarl lines)
      const foldY = y - (30 + shiftY);
      if (foldY >= 0 && foldY <= 8) {
        const foldX = 3.5 + foldY * 0.45;
        const foldD = Math.abs(Math.abs(dx) - foldX);
        if (foldD < 1.3)
          light -= (1 - foldD / 1.3) * (pose === FACE_POSES.shoot || pose === FACE_POSES.pain ? 0.22 : 0.14);
      }

      // Strong cleft chin pad
      const chinDist = Math.hypot(dx / 5.5, (y - (42 + shiftY)) / 2.8);
      if (chinDist < 1) {
        if (Math.abs(dx) < 1.2 && y >= 41 + shiftY)
          light -= 0.18;
        else
          light += (1 - chinDist) * 0.16;
      }

      // Smooth radial bruising around right cheekbone (tier >= 1) and left eye/cheek (tier >= 2)
      const bruiseR = Math.hypot((dx - 7.5) / 4.5, (y - (27.5 + shiftY)) / 3.8);
      const bruiseL = Math.hypot((dx + 7.5) / 4.2, (y - (26.5 + shiftY)) / 3.5);
      if ((tier >= 1 && bruiseR < 1 && hash(x, y) > bruiseR * (tier === 1 ? 0.82 : 0.65)) || (tier >= 2 && bruiseL < 1 && hash(x + 9, y) > bruiseL * 0.68)) {
        a.put(x, y, ramp(BRUISE, Math.max(0.1, Math.min(0.95, light)), x, y));
        continue;
      }

      const rgb = Math.abs(dx) === hw ? SKIN[0] : ramp(SKIN, Math.max(0.05, Math.min(0.98, light)), x, y);
      a.put(x, y, rgb);
    }
  }

  // 4. Open-face futuristic tactical combat helmet & cyber-comms cheek/ear guards (y = 2 + shiftY .. 36 + shiftY)
  const helmTop = 2 + shiftY;
  for (let y = helmTop; y <= 16 + shiftY; y++) {
    const v = (y - helmTop) / 14;
    const hw = v < 0.22 ? 12 + Math.round(v * 22) : 17;
    for (let x = hx - hw; x <= hx + hw; x++) {
      const dx = x - hx;
      const adx = Math.abs(dx);
      // Angled V-shaped tactical brow-plate dipping at center glabella (adx <= 3) and sweeping down into temple guards (adx >= 12)
      const rimY =
        adx >= 12
          ? 16 + shiftY
          : adx <= 3
            ? 14 + shiftY - Math.round(adx * 0.3)
            : 12.5 + shiftY + ((adx - 3) / 9) * 1.5;
      if (y > rimY)
        continue;

      // Glowing horizontal tactical telemetry visor strip across forehead plate (y = 7..9 + shiftY, adx <= 9)
      if (y >= 7 + shiftY && y <= 9 + shiftY && adx <= 9) {
        if (y === 8 + shiftY && adx <= 8)
          a.put(x, y, dead ? LED_CRIT[0] : adx % 3 === 0 ? ledRamp[3] : ledRamp[2]);
        else
          a.put(x, y, ARMOR_STEEL[0]);
        continue;
      }

      const ridge = adx <= 2;
      const seam = adx === 7 || Math.abs(y - rimY) < 0.9;
      const dome = Math.sqrt(Math.max(0, 1 - (dx / Math.max(1, hw)) ** 2));
      const hShade = 0.25 + dome * 0.56 + (ridge ? 0.18 : 0) - v * 0.1;
      if (adx === hw || y === helmTop || seam)
        a.put(x, y, seam && y >= rimY - 1 ? ARMOR_STEEL[5] : ARMOR_STEEL[0]);
      else
        a.put(x, y, ramp(adx > 9 ? ARMOR_SLATE : ARMOR_STEEL, hShade, x, y));
    }
  }

  // Armored temple ear-pods, mandible cheek-clamps & tactical comms boom (y = 14 + shiftY .. 36 + shiftY)
  for (let y = 14 + shiftY; y <= 36 + shiftY; y++) {
    const vy = (y - (14 + shiftY)) / 22;
    const innerEdge = y < 27 + shiftY ? 13 : Math.round(13 - (y - (27 + shiftY)) * 0.35);
    const outerEdge = y < 31 + shiftY ? 17 : Math.round(17 - (y - (31 + shiftY)) * 0.6);
    for (const side of [-1, 1])
      for (let adx = innerEdge; adx <= outerEdge; adx++) {
        const x = hx + side * adx;
        // Glowing side comms status LED pip on ear-pods
        if ((y === 22 + shiftY || y === 25 + shiftY) && adx === innerEdge + 2) {
          a.put(x, y, dead ? LED_CRIT[0] : ledRamp[2]);
          continue;
        }
        const edge = adx === innerEdge || adx === outerEdge || y === 36 + shiftY;
        const shade = 0.24 + (1 - (adx - innerEdge) / 5) * 0.48 - vy * 0.12;
        a.put(x, y, edge ? ARMOR_STEEL[adx === innerEdge ? 5 : 0] : ramp(ARMOR_SLATE, shade, x, y));
      }
  }
  // Sleek cyber-comms microphone boom extending from left mandible guard toward mouth corner
  for (let dx = -12; dx <= -8; dx++) {
    const by = 35 + shiftY + (dx > -10 ? 1 : 0);
    a.put(hx + dx, by, dx === -8 ? (dead ? LED_CRIT[0] : ledRamp[2]) : ARMOR_STEEL[2]);
  }

  // 6. Sculpted nose bridge, rounded tip, and nostril wings (y = 21 + shiftY .. 31 + shiftY)
  for (let y = 21 + shiftY; y <= 31 + shiftY; y++) {
    const nv = (y - (21 + shiftY)) / 10;
    const halfN = nv < 0.55 ? 1.6 : 1.6 + (nv - 0.55) * 3.8;
    for (let dx = -Math.ceil(halfN); dx <= Math.ceil(halfN); dx++) {
      if (Math.abs(dx) > halfN)
        continue;
      const nx = dx / Math.max(1, halfN);
      const tipGlow = Math.hypot(dx / 2.2, (y - (29 + shiftY)) / 2.0) < 1 ? 0.14 : 0;
      const shade = 0.36 + Math.sqrt(Math.max(0, 1 - nx * nx)) * 0.44 - nx * 0.1 + tipGlow;
      a.put(hx + dx, y, ramp(SKIN, shade, hx + dx, y));
    }
  }
  // Nostril shadows and underside of septum
  a.put(hx - 2, 31 + shiftY, SKIN[0]);
  a.put(hx + 2, 31 + shiftY, SKIN[0]);
  a.put(hx - 1, 31 + shiftY, SKIN[1]);
  a.put(hx + 1, 31 + shiftY, SKIN[1]);
  a.put(hx, 31 + shiftY, SKIN[2]);

  // 7. Eyes & Heavy Furrowed Eyebrows (y = 19 + shiftY .. 25 + shiftY)
  const lookDx = pose === FACE_POSES.left ? -1 : pose === FACE_POSES.right ? 1 : 0;
  for (const side of [-1, 1]) {
    const ex = hx + side * 6;
    // Heavy angry/determined/wincing eyebrow
    for (let dx = -4; dx <= 4; dx++) {
      const inner = side * dx < 0;
      const browTilt =
        pose === FACE_POSES.pain
          ? inner
            ? 2
            : 1
          : pose === FACE_POSES.shoot
            ? inner
              ? 1
              : -1
            : inner
              ? 1
              : 0;
      a.put(ex + dx, eyeY - 3 + browTilt, HAIR[0]);
      a.put(ex + dx, eyeY - 2 + browTilt, HAIR[1]);
    }
    if (dead) {
      for (let dx = -3; dx <= 3; dx++) {
        a.put(ex + dx, eyeY, SKIN[0]);
        a.put(ex + dx, eyeY + 1, BRUISE[0]);
      }
    } else if (pose === FACE_POSES.pain) {
      // Tightly clenched wincing eyes (> <) squeezed shut in physical agony
      for (let dx = -3; dx <= 3; dx++) {
        const pinch = side * dx < 0 ? 0 : 1;
        a.put(ex + dx, eyeY + pinch - 1, SKIN[1]);
        a.put(ex + dx, eyeY + pinch, SKIN[0]);
        a.put(ex + dx, eyeY + 1, Math.abs(dx) <= 2 ? SKIN[3] : SKIN[1]);
      }
      // Outer crow's-feet wince creases & cheek bunching
      a.put(ex + side * 4, eyeY - 1, SKIN[0]);
      a.put(ex + side * 4, eyeY + 1, SKIN[0]);
      // Tiny sliver of strained eye on right side of face during asymmetrical wince
      if (side === 1) {
        a.put(ex - 1, eyeY, EYE_WHITE);
        a.put(ex, eyeY, IRIS);
      }
    } else {
      // Focused marine glare (narrowed when shooting)
      const hOpen = pose === FACE_POSES.shoot ? 1 : 2;
      for (let dy = 0; dy < hOpen; dy++)
        for (let dx = -3; dx <= 3; dx++)
          a.put(ex + dx, eyeY + dy, Math.abs(dx) === 3 ? SKIN[1] : EYE_WHITE);
      a.put(ex + lookDx, eyeY, IRIS);
      a.put(ex + lookDx, eyeY, PUPIL);
      if (hOpen > 1)
        a.put(ex + lookDx, eyeY + 1, IRIS);
    }
  }
  // Furrowed glabella crease between the brows
  a.put(hx - 1, eyeY - 2, SKIN[1]);
  a.put(hx + 1, eyeY - 2, SKIN[1]);
  if (pose === FACE_POSES.shoot || pose === FACE_POSES.pain) {
    a.put(hx - 1, eyeY - 3, SKIN[0]);
    a.put(hx + 1, eyeY - 3, SKIN[0]);
  }
  if (pose === FACE_POSES.pain) {
    // Scrunched nose-bridge pain wrinkles
    a.put(hx, eyeY - 1, SKIN[0]);
    a.put(hx - 1, eyeY + 1, SKIN[1]);
    a.put(hx + 1, eyeY + 1, SKIN[1]);
  }
  // Tactical holo-HUD targeting monocle reticle projected over left eye from helmet rim
  if (!dead) {
    const holo = pose === FACE_POSES.shoot ? ledRamp[3] : ledRamp[2];
    a.put(hx - 10, eyeY - 1, holo);
    a.put(hx - 10, eyeY, holo);
    a.put(hx - 10, eyeY + 2, holo);
    a.put(hx - 9, eyeY + 2, holo);
    a.put(hx - 2, eyeY + 2, holo);
  }

  // 8. Mouth: stern grit, fierce downward-curved firing scowl/snarl, contorted pain wince, or slack dead jaw
  const mouthY = 36 + shiftY;
  if (dead) {
    for (let dy = 0; dy <= 2; dy++)
      for (let dx = -5; dx <= 5; dx++)
        a.put(hx + dx, mouthY + dy, dy === 0 ? BLOOD_RAMP[1] : SKIN[0]);
  } else if (pose === FACE_POSES.pain) {
    // Contorted, lopsided agony grimace with clenched/parted teeth and downward-pulled corners
    for (let dx = -6; dx <= 6; dx++) {
      const adx = Math.abs(dx);
      const drop = (adx >= 5 ? 2 : adx >= 3 ? 1 : 0) + (dx > 1 ? 1 : 0);
      a.put(hx + dx, mouthY - 2 + drop, SKIN[0]);
      if (adx <= 5) {
        a.put(hx + dx, mouthY - 1 + drop, (dx & 1) === 0 ? TEETH[2] : TEETH[1]);
        a.put(hx + dx, mouthY + drop, adx <= 2 ? BLOOD_RAMP[0] : (dx & 1) === 0 ? TEETH[1] : TEETH[0]);
        a.put(hx + dx, mouthY + 1 + drop, adx <= 3 ? ((dx & 1) === 0 ? TEETH[1] : TEETH[0]) : SKIN[0]);
        a.put(hx + dx, mouthY + 2 + drop, SKIN[0]);
      } else {
        a.put(hx + dx, mouthY - 1 + drop, SKIN[0]);
        a.put(hx + dx, mouthY + drop, SKIN[1]);
      }
    }
  } else if (pose === FACE_POSES.shoot) {
    // Fierce downward-turned angry battle scowl / bared-teeth snarl (corners pulled sharply down)
    for (let dx = -6; dx <= 6; dx++) {
      const adx = Math.abs(dx);
      const drop = adx >= 5 ? 2 : adx >= 3 ? 1 : 0;
      a.put(hx + dx, mouthY - 2 + drop, SKIN[0]);
      if (adx <= 5) {
        a.put(hx + dx, mouthY - 1 + drop, (dx & 1) === 0 ? TEETH[2] : TEETH[1]);
        a.put(hx + dx, mouthY + drop, (dx & 1) === 0 ? TEETH[1] : TEETH[0]);
        a.put(hx + dx, mouthY + 1 + drop, SKIN[0]);
      } else {
        a.put(hx + dx, mouthY - 1 + drop, SKIN[0]);
        a.put(hx + dx, mouthY + drop, SKIN[1]);
      }
    }
  } else {
    // Stern, downward-turned marine scowl
    for (let dx = -5; dx <= 5; dx++) {
      const drop = Math.abs(dx) >= 4 ? 1 : 0;
      a.put(hx + dx, mouthY - 1 + drop, SKIN[2]);
      a.put(hx + dx, mouthY + drop, SKIN[0]);
      a.put(hx + dx, mouthY + 1 + drop, Math.abs(dx) < 4 ? SKIN[4] : SKIN[1]);
    }
  }

  // 9. Organic blood trickles & battle wounds across tiers 1..4 (and dead)
  // Even at tier 1 (~80% health), visible cuts and blood streams appear across brow, nose, cheek, and lip.
  const dmg = dead ? 4 : tier;
  if (dmg >= 1) {
    // Left forehead/brow gash streaming down temple & left cheekbone
    let bx = hx - 7;
    const len = 14 + dmg * 3;
    for (let i = 0; i < len; i++) {
      const y = 14 + shiftY + i;
      if (i % 4 === 2)
        bx += i & 1 ? 1 : -1;
      a.put(bx, y, BLOOD_RAMP[i < 4 ? 4 : i < 9 ? 3 : 2]);
      a.put(bx + 1, y, BLOOD_RAMP[i < 3 ? 3 : 1]);
      if (i < 3)
        a.put(bx - 1, y + 1, BLOOD_RAMP[2]);
    }
    // Fresh nosebleed trickling from right nostril down philtrum to upper lip
    for (let y = 31 + shiftY; y <= 35 + shiftY + (dmg >> 1); y++) {
      a.put(hx + 1, y, BLOOD_RAMP[4]);
      a.put(hx + 2, y, BLOOD_RAMP[y === 31 + shiftY ? 3 : 2]);
    }
    // Right cheekbone slash & blood drip
    for (let i = 0; i < 6; i++) {
      const cx = hx + 4 + i;
      const cy = 26 + shiftY + (i >> 1);
      a.put(cx, cy, BLOOD_RAMP[i >= 1 && i <= 4 ? 4 : 2]);
      a.put(cx, cy + 1, BLOOD_RAMP[2]);
    }
    for (let dy = 1; dy <= 3 + dmg; dy++)
      a.put(hx + 7, 28 + shiftY + dy, BLOOD_RAMP[dy < 3 ? 3 : 1]);
    // Split lower lip / chin blood trickle
    for (let dy = 0; dy <= 2 + dmg; dy++) {
      a.put(hx - 2, mouthY + 1 + dy, BLOOD_RAMP[dy === 0 ? 4 : 3]);
      if (dy < 2)
        a.put(hx - 1, mouthY + 1 + dy, BLOOD_RAMP[2]);
    }
  }
  if (dmg >= 2) {
    // Right brow gash streaming down past outer right eye onto cheek
    for (let i = 0; i < 14 + dmg * 2; i++) {
      const rx = hx + 7 + ((i % 3 === 0) ? 1 : 0);
      const ry = 14 + shiftY + i;
      a.put(rx, ry, BLOOD_RAMP[i < 5 ? 4 : 3]);
      a.put(rx - 1, ry, BLOOD_RAMP[i < 3 ? 3 : 1]);
    }
    // Second nostril bleed & bridge-of-nose cut
    for (let y = 31 + shiftY; y <= 36 + shiftY; y++) {
      a.put(hx - 1, y, BLOOD_RAMP[3]);
      a.put(hx - 2, y, BLOOD_RAMP[2]);
    }
    for (let dx = -2; dx <= 2; dx++)
      a.put(hx + dx, 24 + shiftY + (dx > 0 ? 1 : 0), BLOOD_RAMP[Math.abs(dx) <= 1 ? 4 : 2]);
    // Blood running from right corner of mouth down chin
    for (let i = 0; i < 5 + dmg; i++) {
      a.put(hx + 3 + (i >> 2), mouthY + 1 + i, BLOOD_RAMP[i < 2 ? 4 : 2]);
      a.put(hx + 4 + (i >> 2), mouthY + 1 + i, BLOOD_RAMP[1]);
    }
  }
  if (dmg >= 3) {
    // Heavy glabella/forehead blood sheet between eyebrows & twin chin streams onto neck seal
    for (let y = 14 + shiftY; y <= 22 + shiftY; y++)
      for (let dx = -2; dx <= 2; dx++)
        if (Math.abs(dx) <= 1 || ((y + dx) & 1) === 0)
          a.put(hx + dx, y, BLOOD_RAMP[y < 17 + shiftY ? 4 : 2]);
    for (let i = 0; i < 9; i++) {
      a.put(hx - 4 - (i >> 2), mouthY + 1 + i, BLOOD_RAMP[i < 4 ? 4 : 2]);
      a.put(hx - 3 - (i >> 2), mouthY + 1 + i, BLOOD_RAMP[2]);
      a.put(hx + 3 + (i >> 2), mouthY + 1 + i, BLOOD_RAMP[i < 4 ? 4 : 3]);
    }
    // Blood smears across lower jaw hollows
    for (let y = 32 + shiftY; y <= 39 + shiftY; y++)
      for (const side of [-1, 1])
        if (((y + side) & 1) === 0)
          a.put(hx + side * 8, y, BLOOD_RAMP[2]);
  }
  if (dmg >= 4) {
    // Critical trauma: heavy blood streaks and splatters across forehead, nose bridge, chin, and armor gorget
    for (let y = 12 + shiftY; y <= H - 3; y++)
      for (let x = hx - 14; x <= hx + 14; x++)
        if (a.has(x, y) && hash(x * 3, y * 5) > 0.72 && ((x + y) & 1) === 0)
          a.put(x, y, BLOOD_RAMP[hash(x, y) > 0.45 ? 3 : 1]);
  }

  // 10. Dynamic lighting tint: warm golden-orange muzzle-flash light when shooting, crimson jolt when hurt
  if (pose === FACE_POSES.shoot && !dead) {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!a.has(x, y))
          continue;
        const o = (y * W + x) * 4;
        a.pixels[o] = Math.min(255, a.pixels[o] + 28);
        a.pixels[o + 1] = Math.min(255, a.pixels[o + 1] + 14);
      }
  } else if (pose === FACE_POSES.pain && !dead) {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!a.has(x, y))
          continue;
        const o = (y * W + x) * 4;
        a.pixels[o] = Math.min(255, a.pixels[o] + 34);
        a.pixels[o + 1] = Math.max(0, a.pixels[o + 1] - 10);
        a.pixels[o + 2] = Math.max(0, a.pixels[o + 2] - 10);
      }
  }
}

function drawFrame(frame) {
  const a = new Art();
  if (frame >= FACE_DEAD_FRAME)
    drawMarineFace(a, FACE_TIERS - 1, FACE_POSES.center, true);
  else {
    const tier = Math.floor(frame / FACE_POSE_COUNT);
    const pose = frame % FACE_POSE_COUNT;
    drawMarineFace(a, tier, pose, false);
  }
  return a.pixels;
}

/** The marine portrait atlas as RGBA pixels, ready for a NEAREST-filtered HUD texture. */
export function faceAtlas() {
  const width = W * FACE_FRAME_COUNT;
  const data = new Uint8Array(width * H * 4);
  for (let frame = 0; frame < FACE_FRAME_COUNT; frame++) {
    const pixels = drawFrame(frame);
    for (let y = 0; y < H; y++)
      data.set(pixels.subarray(y * W * 4, (y + 1) * W * 4), (y * width + frame * W) * 4);
  }
  return { name: 'face', data, width, height: H, cell: W, frames: FACE_FRAME_COUNT };
}
