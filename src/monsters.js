import { CustomMesh, Mesh, Trigo, Utils, Vec2, Vec3 } from '@1pizzateam/roostr';

const scratchPos = new Vec3();
const scratchRot = new Vec3();
const scratchScale = new Vec3();
const scratchNormal = new Vec3();
const scratchEdgeA = new Vec3();
const scratchEdgeB = new Vec3();
const scratchVec2 = new Vec2();

function mag2(x, y) {
  return scratchVec2.setScalar(x, y).getMagnitude();
}

function setPos(node, x, y, z) {
  scratchPos.setScalar(x, y, z);
  node.setPosition(scratchPos);
}

function setRot(node, x, y, z) {
  scratchRot.setScalar(x, y, z);
  node.setRotation(scratchRot);
}

function setScale(node, x, y, z) {
  scratchScale.setScalar(x, y, z);
  node.setScale(scratchScale);
}

function setUniformScale(node, s) {
  scratchScale.setScalar(s, s, s);
  node.setScale(scratchScale);
}

/**
 * 3D Articulated Horror Monsters:
 * - Every enemy (`imp`, `brute`, `boss`, `skull`, `crawler`, `swarmer`, `wraith`) is an articulated 3D hierarchy of
 *   textured RoostR `Mesh` nodes (`body`, `head`, `jaw`, `leftArm`, `rightArm`, `leftLeg`, `rightLeg`, `extra`, `gorePool`)
 *   wrapped in a procedural power-of-two RGBA pixel-art skin atlas (`256 x 32`, 8 `32 x 32` anatomical cells).
 * - Preserves the exact horror palettes and shader encodings from `sprites.js`:
 *   - `G = 255`: Emissive supernatural eyes and chest hell-cores that flare with `uGlare` and extinguish on death.
 *   - `B = 255`: Arterial gore & torn viscera ramp.
 */

export const MONSTER_SKIN_CELL = 32;
export const MONSTER_SKIN_FRAMES = 8;
export const MONSTER_SKIN_CELLS = {
  chest: 0,
  back: 1,
  face: 2,
  jaw: 3,
  limb: 4,
  bone: 5,
  hide: 6,
  gore: 7,
};

const DEATH_DURATION = 0.78;
const BURST_DURATION = 0.62;

const CONFIGS = {
  imp: { scale: 1.0, windup: 0.4, baseLift: 0, walkRate: 1.4, idleRate: 1.1 },
  brute: { scale: 1.25, windup: 0.3, baseLift: 0, walkRate: 1.2, idleRate: 0.9, stomp: 1.6 },
  boss: { scale: 2.15, windup: 0.65, baseLift: 0, walkRate: 1.0, idleRate: 0.8, stomp: 2.2 },
  skull: { scale: 1.0, windup: 0.4, baseLift: 16, walkRate: 2.2, idleRate: 1.5, floatAmp: 3.5 },
  crawler: { scale: 1.0, windup: 0.38, baseLift: 0, walkRate: 2.4, idleRate: 1.4 },
  swarmer: { scale: 0.92, windup: 0.15, baseLift: 0, walkRate: 2.6, idleRate: 1.8 },
  wraith: { scale: 1.0, windup: 0.35, baseLift: 5, walkRate: 2.8, idleRate: 0.8, floatAmp: 3.0 },
};

const PALETTES = {
  imp: {
    flesh: [new Vec3(86, 10, 16), new Vec3(126, 16, 24), new Vec3(162, 24, 34), new Vec3(196, 36, 48)],
    hide: [new Vec3(28, 14, 22), new Vec3(48, 22, 34), new Vec3(78, 36, 52)],
    bone: [new Vec3(154, 138, 114), new Vec3(192, 176, 148), new Vec3(224, 208, 180)],
  },
  brute: {
    flesh: [new Vec3(54, 46, 44), new Vec3(76, 68, 62), new Vec3(96, 88, 74), new Vec3(126, 114, 98)],
    hide: [new Vec3(42, 38, 36), new Vec3(64, 58, 56), new Vec3(96, 88, 82)],
    bone: [new Vec3(154, 138, 114), new Vec3(192, 176, 148), new Vec3(224, 208, 180)],
  },
  boss: {
    flesh: [new Vec3(56, 12, 22), new Vec3(86, 18, 32), new Vec3(118, 24, 42), new Vec3(158, 34, 54)],
    hide: [new Vec3(24, 12, 18), new Vec3(44, 20, 32), new Vec3(76, 34, 50)],
    bone: [new Vec3(158, 140, 114), new Vec3(196, 178, 148), new Vec3(228, 212, 182)],
  },
  skull: {
    flesh: [new Vec3(138, 132, 116), new Vec3(168, 156, 134), new Vec3(198, 184, 158), new Vec3(224, 208, 180)],
    hide: [new Vec3(86, 14, 22), new Vec3(128, 22, 34), new Vec3(168, 32, 46)],
    bone: [new Vec3(154, 138, 114), new Vec3(192, 176, 148), new Vec3(228, 214, 186)],
  },
  crawler: {
    flesh: [new Vec3(64, 14, 28), new Vec3(94, 20, 42), new Vec3(128, 28, 52), new Vec3(168, 44, 72)],
    hide: [new Vec3(32, 18, 44), new Vec3(54, 30, 68), new Vec3(88, 52, 104)],
    bone: [new Vec3(154, 138, 114), new Vec3(192, 176, 148), new Vec3(224, 208, 180)],
  },
  swarmer: {
    flesh: [new Vec3(86, 10, 16), new Vec3(126, 16, 24), new Vec3(162, 24, 34), new Vec3(196, 36, 48)],
    hide: [new Vec3(34, 14, 22), new Vec3(56, 24, 36), new Vec3(86, 38, 54)],
    bone: [new Vec3(154, 138, 114), new Vec3(192, 176, 148), new Vec3(224, 208, 180)],
  },
  wraith: {
    flesh: [new Vec3(24, 16, 38), new Vec3(48, 36, 72), new Vec3(84, 68, 116), new Vec3(124, 134, 178)],
    hide: [new Vec3(20, 14, 34), new Vec3(38, 26, 58), new Vec3(72, 54, 102)],
    bone: [new Vec3(158, 144, 124), new Vec3(192, 178, 156), new Vec3(212, 198, 174)],
  },
};

function noise(x, y, salt) {
  let h = Math.imul(x * 374761393 + y * 668265263 + salt * 1274126177, 1103515245);
  h ^= h >>> 13;
  return ((Math.imul(h, 1274126177) >>> 0) % 1024) / 1024;
}

function cellPutter(data, atlasWidth, cell) {
  const S = MONSTER_SKIN_CELL;
  const ox = cell * S;
  return (x, y, r, g, b, flag = 1) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || px >= S || py < 0 || py >= S)
      return;
    const o = (py * atlasWidth + ox + px) * 4;
    data[o] = Utils.clamp(Math.round(r), 0, 255);
    data[o + 1] = flag === 255 ? 255 : Utils.clamp(Math.round(g), 0, 245);
    data[o + 2] = flag === 2 ? 255 : Utils.clamp(Math.round(b), 0, 245);
    data[o + 3] = 255;
  };
}

function drawChestCell(put, type, pal) {
  const S = MONSTER_SKIN_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = Math.abs(x - 15.5);
      const dy = y - 15.5;
      const edge = x === 0 || x === S - 1 || y === 0 || y === S - 1;
      const dither = (x + y) % 2;
      const striation = Math.sin(dx * 0.85 + y * 0.35) > 0.25;
      const base = edge ? pal.hide[0] : striation ? pal.flesh[2] : dither ? pal.flesh[1] : pal.flesh[0];
      put(x, y, base.x, base.y, base.z, 1);

      if (type === 'brute') {
        // Ruptured abdominal cavity held together by surgical iron staples
        if (y >= 9 && y <= 26 && dx <= 8.5) {
          if (y % 4 === 2 && dx <= 9.5) {
            const staple = dx > 7.5 ? pal.bone[0] : pal.bone[2];
            put(x, y, staple.x, staple.y, staple.z, 1);
          } else if (dx <= 6.5)
            put(x, y, 150 + 75 * noise(x, y, 3), 18, 255, 2);
          else
            put(x, y, 24, 8, 16, 1);
        }
      } else if (type === 'boss') {
        // Pried-open ribcage & blazing chest hell-core
        if (y >= 6 && y <= 26 && dx <= 10) {
          const distCore = mag2(dx, y - 15.5);
          if (distCore <= 3.6)
            put(x, y, 255, 255, 190, 255);
          else if (distCore <= 6.2)
            put(x, y, 185 + 60 * noise(x, y, 5), 22, 255, 2);
          else if (y % 4 <= 1 && dx >= 3.5) {
            const rib = y % 4 === 0 ? pal.bone[2] : pal.bone[1];
            put(x, y, rib.x, rib.y, rib.z, 1);
          } else
            put(x, y, 20, 6, 14, 1);
        }
      } else if (type === 'wraith') {
        // Necrotic shroud parting over exposed bone ribs and dark crimson heart
        const fold = Math.sin(x * 0.75 + y * 0.18);
        const robe = fold > 0.55 ? pal.flesh[2] : dither ? pal.flesh[1] : pal.flesh[0];
        put(x, y, robe.x, robe.y, robe.z, 1);
        if (y >= 7 && y <= 24 && dx <= 7.5) {
          if (mag2(dx, y - 15) <= 2.8)
            put(x, y, 205, 26, 255, 2);
          else if (y % 3 === 0 && dx >= 1.5)
            put(x, y, pal.bone[1].x, pal.bone[1].y, pal.bone[1].z, 1);
          else
            put(x, y, 32, 10, 24, 1);
        }
      } else if (type === 'skull') {
        // Cracked ossified cranium forehead with crimson fracture lines
        const crack = Math.abs(x - (15 + Math.sin(y * 0.35) * 3.5)) < 1.1;
        if (crack && y >= 4 && y <= 26)
          put(x, y, 185, 20, 255, 2);
        else if (dx > 11 && (x + y) % 3 === 0)
          put(x, y, pal.hide[1].x, pal.hide[1].y, pal.hide[1].z, 1);
      } else if (type === 'crawler') {
        // Arachnid ventral chitin & weeping gore pustules
        const p1 = mag2(x - 10, y - 11) <= 3.4;
        const p2 = mag2(x - 21, y - 19) <= 3.8;
        const p3 = mag2(x - 15, y - 24) <= 2.8;
        if (p1 || p2 || p3)
          put(x, y, 175 + 65 * noise(x, y, 7), 18, 255, 2);
        else if (y % 5 === 0)
          put(x, y, pal.hide[2].x, pal.hide[2].y, pal.hide[2].z, 1);
      } else {
        // Imp & Swarmer: torn thoracic cavity, exposed bone ribs & arterial core
        if (y >= 7 && y <= 25 && dx <= 8.5) {
          if (mag2(dx, y - 16) <= 3.0)
            put(x, y, 195 + 50 * noise(x, y, 9), 20, 255, 2);
          else if (y % 4 === 0 && dx >= 1.5) {
            const rib = dx < 5 ? pal.bone[2] : pal.bone[1];
            put(x, y, rib.x, rib.y, rib.z, 1);
          } else if (dx <= 6.5)
            put(x, y, 22, 6, 14, 1);
        }
      }
      if (Math.abs(dy) > 12 && dx < 4)
        put(x, y, pal.hide[0].x, pal.hide[0].y, pal.hide[0].z, 1);
    }
}

function drawBackCell(put, type, pal) {
  const S = MONSTER_SKIN_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = Math.abs(x - 15.5);
      const dither = (x + y) % 2;
      const ridge = Math.sin(dx * 0.7 + y * 0.4) > 0.3;
      const c = ridge ? pal.hide[2] : dither ? pal.flesh[1] : pal.hide[1];
      put(x, y, c.x, c.y, c.z, 1);
      // Dorsal vertebral column & bleeding spine sockets
      if (dx <= 2.2 && y >= 2 && y <= 29) {
        if (y % 4 <= 1)
          put(x, y, pal.bone[2].x, pal.bone[2].y, pal.bone[2].z, 1);
        else
          put(x, y, 175, 20, 255, 2);
      } else if (type === 'crawler' && ((x - 9) ** 2 + (y - 14) ** 2 <= 12 || (x - 22) ** 2 + (y - 18) ** 2 <= 12))
        put(x, y, 190, 24, 255, 2);
    }
}

function drawFaceCell(put, type, pal) {
  const S = MONSTER_SKIN_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = Math.abs(x - 15.5);
      const dither = (x + y) % 2;
      const base = y < 5 ? pal.hide[1] : dither ? pal.flesh[2] : pal.flesh[1];
      put(x, y, base.x, base.y, base.z, 1);

      // Sunken dark orbital sockets & nasal cavity
      const inSocket = y >= 9 && y <= 18 && dx >= 3 && dx <= 11.5;
      const inNose = y >= 17 && y <= 22 && dx <= 2.2;
      if (inSocket || inNose)
        put(x, y, 18, 6, 14, 1);

      // Glowing supernatural eyes (G = 255)
      let isEye = false;
      if (type === 'crawler' || type === 'swarmer') {
        const e1 = mag2(dx - 4.5, y - 13) <= 1.8;
        const e2 = mag2(dx - 8.5, y - 15) <= 1.7;
        const e3 = mag2(dx - 6.5, y - 10) <= 1.5;
        isEye = e1 || e2 || e3;
      } else if (type === 'boss') {
        const e1 = mag2(dx - 5.5, y - 14) <= 2.3;
        const e2 = mag2(dx - 8.2, y - 9.5) <= 1.8;
        isEye = e1 || e2;
      } else
        isEye = mag2(dx - 6.0, y - 13.5) <= 2.6;

      if (isEye) {
        put(x, y, 255, 255, 185, 255);
        continue;
      }

      // Weeping blood tears beneath sockets & upper fang row along bottom edge
      if (y >= 18 && y <= 25 && Math.abs(dx - 6.0) <= 1.1)
        put(x, y, 185, 22, 255, 2);
      if (y >= 25) {
        const fang = Math.floor((x + 1) / 3) % 2 === 0 && dx <= 12;
        if (fang && y <= 30) {
          const tip = y >= 29;
          if (tip)
            put(x, y, 200, 24, 255, 2);
          else
            put(x, y, pal.bone[2].x, pal.bone[2].y, pal.bone[2].z, 1);
        } else
          put(x, y, 16, 6, 14, 1);
      }
    }
}

function drawJawCell(put, pal) {
  const S = MONSTER_SKIN_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = Math.abs(x - 15.5);
      const dither = (x + y) % 2;
      if (y <= 7) {
        // Lower jagged bone fangs jutting upward into the maw
        const fang = Math.floor(x / 3) % 2 === 0 && dx <= 12;
        if (fang) {
          if (y <= 2)
            put(x, y, 205, 24, 255, 2);
          else
            put(x, y, pal.bone[2].x, pal.bone[2].y, pal.bone[2].z, 1);
        } else
          put(x, y, 16, 6, 14, 1);
      } else if (y <= 15 && dx <= 10) {
        // Abyssal throat interior with arterial blood pool
        if (mag2(dx, y - 11) <= 4.5)
          put(x, y, 180 + 60 * noise(x, y, 11), 18, 255, 2);
        else
          put(x, y, 24, 8, 16, 1);
      } else {
        const chin = dither ? pal.flesh[1] : pal.flesh[0];
        put(x, y, chin.x, chin.y, chin.z, 1);
        if (y >= 24 && (x + y) % 3 === 0 && dx <= 8)
          put(x, y, 172, 18, 255, 2);
      }
    }
}

function drawLimbCell(put, pal) {
  const S = MONSTER_SKIN_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dither = (x + y) % 2;
      const tendon = Math.sin(x * 0.65 + y * 0.25) > 0.35;
      const c = y > 24 ? pal.hide[1] : tendon ? pal.flesh[3] : dither ? pal.flesh[2] : pal.flesh[1];
      put(x, y, c.x, c.y, c.z, 1);
      if (y >= 26 && (x + y) % 2 === 0)
        put(x, y, 182, 22, 255, 2);
    }
}

function drawBoneCell(put, pal) {
  const S = MONSTER_SKIN_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dither = (x + y) % 2;
      const ring = y % 5 === 0;
      const c = ring ? pal.bone[0] : x < 6 || x > 25 ? pal.bone[0] : dither ? pal.bone[2] : pal.bone[1];
      put(x, y, c.x, c.y, c.z, 1);
      // Blood-drenched horn/talon tips and roots
      if (y <= 4 || y >= 28)
        put(x, y, 195 + 45 * noise(x, y, 13), 20, 255, 2);
    }
}

function drawHideCell(put, type, pal) {
  const S = MONSTER_SKIN_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dither = (x + y) % 2;
      const plate = (x % 8 === 0 || y % 8 === 0) && type !== 'wraith';
      const c = plate ? pal.hide[0] : dither ? pal.hide[2] : pal.hide[1];
      put(x, y, c.x, c.y, c.z, 1);
      if (type === 'wraith' && y >= 25)
        put(x, y, 148, 22, 42, 1);
    }
}

function drawGoreCell(put, pal) {
  const S = MONSTER_SKIN_CELL;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const n = noise(x, y, 19);
      if (n > 0.86)
        put(x, y, pal.bone[2].x, pal.bone[2].y, pal.bone[2].z, 1);
      else
        put(x, y, 125 + Math.round(125 * n), 16, 255, 2);
    }
}

const skinAtlasCache = {};
const goreSkinAtlasCache = {};

/** Builds (and caches) the 256 x 32 power-of-two RGBA pixel-art 3D skin atlas for `type`. */
export function monsterSkinAtlas(type = 'imp') {
  if (skinAtlasCache[type])
    return skinAtlasCache[type];
  const pal = PALETTES[type] ?? PALETTES.imp;
  const width = MONSTER_SKIN_CELL * MONSTER_SKIN_FRAMES;
  const height = MONSTER_SKIN_CELL;
  const data = new Uint8Array(width * height * 4);
  drawChestCell(cellPutter(data, width, MONSTER_SKIN_CELLS.chest), type, pal);
  drawBackCell(cellPutter(data, width, MONSTER_SKIN_CELLS.back), type, pal);
  drawFaceCell(cellPutter(data, width, MONSTER_SKIN_CELLS.face), type, pal);
  drawJawCell(cellPutter(data, width, MONSTER_SKIN_CELLS.jaw), pal);
  drawLimbCell(cellPutter(data, width, MONSTER_SKIN_CELLS.limb), pal);
  drawBoneCell(cellPutter(data, width, MONSTER_SKIN_CELLS.bone), pal);
  drawHideCell(cellPutter(data, width, MONSTER_SKIN_CELLS.hide), type, pal);
  drawGoreCell(cellPutter(data, width, MONSTER_SKIN_CELLS.gore), pal);
  const atlas = { data, width, height, cell: MONSTER_SKIN_CELL, frames: MONSTER_SKIN_FRAMES };
  skinAtlasCache[type] = atlas;
  return atlas;
}

/**
 * Builds (and caches) the mangled, gore-drenched 256 x 32 3D death/wound skin atlas for `type`:
 * - Ripped-open thoracic & dorsal cavities with exposed white ribcage/vertebral bones and drenched arterial blood (`B = 255`).
 * - Shattered orbital sockets with extinguished eye glare (`G < 255`) and arterial blood pouring down the skull/jaw.
 * - Deep shotgun/chainsaw craters with exposed bone splinters across limbs and hide.
 */
export function monsterGoreSkinAtlas(type = 'imp') {
  if (goreSkinAtlasCache[type])
    return goreSkinAtlasCache[type];
  const base = monsterSkinAtlas(type);
  const pal = PALETTES[type] ?? PALETTES.imp;
  const width = base.width;
  const height = base.height;
  const data = new Uint8Array(base.data);
  const S = MONSTER_SKIN_CELL;

  const putChest = cellPutter(data, width, MONSTER_SKIN_CELLS.chest);
  const putBack = cellPutter(data, width, MONSTER_SKIN_CELLS.back);
  const putFace = cellPutter(data, width, MONSTER_SKIN_CELLS.face);
  const putJaw = cellPutter(data, width, MONSTER_SKIN_CELLS.jaw);
  const putLimb = cellPutter(data, width, MONSTER_SKIN_CELLS.limb);
  const putHide = cellPutter(data, width, MONSTER_SKIN_CELLS.hide);

  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = Math.abs(x - 15.5);
      const n = noise(x, y, 37);

      // 1. Chest: blasted-open ribcage & torn sternum drenched in arterial gore
      if (y >= 4 && y <= 28 && dx <= 11.5 - (y % 3) * 0.5) {
        if (dx <= 1.4 && y % 3 <= 1)
          putChest(x, y, pal.bone[2].x, pal.bone[2].y, pal.bone[2].z, 1);
        else if (y % 4 === 1 && dx >= 2.0 && dx <= 9.5)
          putChest(x, y, pal.bone[1].x, pal.bone[1].y, pal.bone[1].z, 1);
        else if (dx <= 8.5 || n > 0.35)
          putChest(x, y, 145 + Math.round(105 * n), 16, 255, 2);
        else
          putChest(x, y, 18, 4, 12, 1);
      }

      // 2. Back: blown-out dorsal exit wound & exposed spinal column
      if (y >= 5 && y <= 27 && dx <= 9.0) {
        if (dx <= 2.4 && y % 3 === 0)
          putBack(x, y, pal.bone[2].x, pal.bone[2].y, pal.bone[2].z, 1);
        else if (dx <= 6.5 || n > 0.4)
          putBack(x, y, 135 + Math.round(110 * n), 16, 255, 2);
      }

      // 3. Face: shattered eye sockets (extinguish G=255 eyes), cracked cranium & arterial blood cascade
      const faceIdx = (y * width + MONSTER_SKIN_CELLS.face * S + x) * 4;
      if (data[faceIdx + 1] === 255 || (y >= 8 && y <= 20 && dx >= 3.0 && dx <= 10.5)) {
        if (dx >= 4.5 && dx <= 7.5 && y >= 12 && y <= 15 && n > 0.65)
          putFace(x, y, 18, 4, 10, 1);
        else
          putFace(x, y, 165 + Math.round(80 * n), 18, 255, 2);
      } else if (dx <= 4.5 && y >= 6 && y <= 28 && n > 0.38)
        putFace(x, y, 150 + Math.round(95 * n), 16, 255, 2);

      // 4. Jaw: blood-drenched fangs & ripped throat
      if (y <= 22 && (dx <= 9.5 || n > 0.5))
        if (y > 4 || n > 0.45)
          putJaw(x, y, 155 + Math.round(90 * n), 18, 255, 2);

      // 5. Limb & Hide: shotgun/chainsaw craters with exposed white bone splinters
      const c1 = mag2(x - 11, y - 11);
      const c2 = mag2(x - 21, y - 20);
      if (c1 <= 5.2 || c2 <= 5.6) {
        if (c1 <= 1.6 || c2 <= 1.8) {
          putLimb(x, y, pal.bone[2].x, pal.bone[2].y, pal.bone[2].z, 1);
          putHide(x, y, pal.bone[2].x, pal.bone[2].y, pal.bone[2].z, 1);
        } else {
          putLimb(x, y, 140 + Math.round(105 * n), 16, 255, 2);
          putHide(x, y, 140 + Math.round(105 * n), 16, 255, 2);
        }
      } else if (n > 0.78) {
        putLimb(x, y, 160, 18, 255, 2);
        putHide(x, y, 160, 18, 255, 2);
      }
    }

  const atlas = { data, width, height, cell: MONSTER_SKIN_CELL, frames: MONSTER_SKIN_FRAMES };
  goreSkinAtlasCache[type] = atlas;
  return atlas;
}

// =====================================================================================================================
// 3D SCULPTED GEOMETRY BUILDERS
// =====================================================================================================================

function cellRange(cell) {
  const step = 1 / MONSTER_SKIN_FRAMES;
  const pad = 0.003;
  return new Vec2(cell * step + pad, (cell + 1) * step - pad);
}

function pushQuad(vertices, normals, uvs, c0, c1, c2, c3, u0, v0, u1, v1) {
  scratchEdgeA.setScalar(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]);
  scratchEdgeB.setScalar(c2[0] - c0[0], c2[1] - c0[1], c2[2] - c0[2]);
  scratchNormal.crossVectors(scratchEdgeA, scratchEdgeB);
  if (scratchNormal.getMagnitude(true) > 0)
    scratchNormal.normalize();
  else
    scratchNormal.setScalar(0, 1, 0);
  const nx = scratchNormal.x;
  const ny = scratchNormal.y;
  const nz = scratchNormal.z;
  const corners = [c0, c1, c2, c3];
  const quadUvs = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
  for (const k of [0, 1, 2, 0, 2, 3]) {
    vertices.push(...corners[k]);
    normals.push(nx, ny, nz);
    uvs.push(...quadUvs[k]);
  }
}

/**
 * Builds a 3D tapered prism (frustum box) centered at `offset` with `bottomSize` at `-hy` and `topSize` at `+hy`
 * (shifted by `topShift` in X/Z for swept horns, spikes, hunched torsos, or digitigrade limbs).
 */
function taperPrism(bottomSize, topSize, offset = new Vec3(0, 0, 0), cells = {}, topShift = new Vec2(0, 0)) {
  const bx = bottomSize.x * 0.5;
  const tx = topSize.x * 0.5;
  const hy = bottomSize.y * 0.5;
  const bz = bottomSize.z * 0.5;
  const tz = topSize.z * 0.5;
  const ox = offset.x;
  const oy = offset.y;
  const oz = offset.z;
  const sx = topShift.x;
  const sz = topShift.y;

  const front = cellRange(cells.front ?? MONSTER_SKIN_CELLS.limb);
  const back = cellRange(cells.back ?? cells.front ?? MONSTER_SKIN_CELLS.limb);
  const side = cellRange(cells.side ?? cells.back ?? MONSTER_SKIN_CELLS.hide);
  const top = cellRange(cells.top ?? cells.side ?? MONSTER_SKIN_CELLS.hide);
  const bottom = cellRange(cells.bottom ?? cells.side ?? MONSTER_SKIN_CELLS.hide);

  const bFL = [ox - bx, oy - hy, oz + bz];
  const bFR = [ox + bx, oy - hy, oz + bz];
  const bBR = [ox + bx, oy - hy, oz - bz];
  const bBL = [ox - bx, oy - hy, oz - bz];

  const tFL = [ox + sx - tx, oy + hy, oz + sz + tz];
  const tFR = [ox + sx + tx, oy + hy, oz + sz + tz];
  const tBR = [ox + sx + tx, oy + hy, oz + sz - tz];
  const tBL = [ox + sx - tx, oy + hy, oz + sz - tz];

  const vertices = [];
  const normals = [];
  const uvs = [];
  // Front (+Z) & Back (-Z)
  pushQuad(vertices, normals, uvs, bFL, bFR, tFR, tFL, front.x, 0, front.y, 1);
  pushQuad(vertices, normals, uvs, bBR, bBL, tBL, tBR, back.x, 0, back.y, 1);
  // Right (+X) & Left (-X)
  pushQuad(vertices, normals, uvs, bFR, bBR, tBR, tFR, side.x, 0, side.y, 1);
  pushQuad(vertices, normals, uvs, bBL, bFL, tFL, tBL, side.x, 0, side.y, 1);
  // Top (+Y) & Bottom (-Y)
  pushQuad(vertices, normals, uvs, tFL, tFR, tBR, tBL, top.x, 0, top.y, 1);
  pushQuad(vertices, normals, uvs, bBL, bBR, bFR, bFL, bottom.x, 0, bottom.y, 1);
  return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), uvs: new Float32Array(uvs) };
}

function boxPrism(size, offset = new Vec3(0, 0, 0), cells = {}) {
  return taperPrism(size, size, offset, cells);
}

function mergeGeometries(list) {
  let vLen = 0;
  let uLen = 0;
  for (const g of list) {
    vLen += g.vertices.length;
    uLen += g.uvs.length;
  }
  const vertices = new Float32Array(vLen);
  const normals = new Float32Array(vLen);
  const uvs = new Float32Array(uLen);
  let vOff = 0;
  let uOff = 0;
  for (const g of list) {
    vertices.set(g.vertices, vOff);
    normals.set(g.normals, vOff);
    uvs.set(g.uvs, uOff);
    vOff += g.vertices.length;
    uOff += g.uvs.length;
  }
  return { vertices, normals, uvs };
}

function offsetGeometry(geo, offset) {
  const vertices = new Float32Array(geo.vertices.length);
  for (let i = 0; i < geo.vertices.length; i += 3) {
    vertices[i] = geo.vertices[i] + offset.x;
    vertices[i + 1] = geo.vertices[i + 1] + offset.y;
    vertices[i + 2] = geo.vertices[i + 2] + offset.z;
  }
  return { vertices, normals: new Float32Array(geo.normals), uvs: new Float32Array(geo.uvs) };
}

function buildImpParts() {
  const C = MONSTER_SKIN_CELLS;
  const bodyList = [
    // Pelvis & muscular waist
    taperPrism(new Vec3(9.5, 5, 6.5), new Vec3(8.5, 5, 6.0), new Vec3(0, 2.5, 0), { front: C.hide, back: C.back, side: C.hide }),
    // V-tapered flayed thoracic torso
    taperPrism(new Vec3(8.5, 13, 6.2), new Vec3(14.5, 13, 8.8), new Vec3(0, 11.5, 0.4), { front: C.chest, back: C.back, side: C.limb, top: C.hide }),
    // Charred shoulder humps
    taperPrism(new Vec3(4.5, 4.5, 6.5), new Vec3(3.2, 4.5, 5.0), new Vec3(-6.8, 17.5, 0.2), { front: C.hide, back: C.hide, side: C.hide }),
    taperPrism(new Vec3(4.5, 4.5, 6.5), new Vec3(3.2, 4.5, 5.0), new Vec3(6.8, 17.5, 0.2), { front: C.hide, back: C.hide, side: C.hide }),
  ];
  // Protruding 3D bone ribcage bars across chest
  for (const ry of [7.5, 10.5, 13.5, 16.0])
    bodyList.push(boxPrism(new Vec3(9.8, 1.1, 1.4), new Vec3(0, ry, 4.2), { front: C.bone, back: C.gore, side: C.bone, top: C.bone }));
  // 4 dorsal bone spines along the back
  for (const sy of [6.5, 10.0, 13.5, 16.8])
    bodyList.push(taperPrism(new Vec3(1.6, 3.2, 2.0), new Vec3(0.4, 3.2, 0.5), new Vec3(0, sy + 1.0, -4.6), { front: C.bone, back: C.bone, side: C.bone }, new Vec2(0, -1.8)));

  const headList = [
    // Sculpted demon skull cranium
    taperPrism(new Vec3(7.6, 6.8, 7.4), new Vec3(6.4, 6.8, 6.4), new Vec3(0, 3.6, 0.4), { front: C.face, back: C.back, side: C.limb, top: C.hide }),
    // Heavy furrowed brow ridge
    boxPrism(new Vec3(7.8, 1.5, 2.0), new Vec3(0, 5.2, 3.8), { front: C.hide, back: C.hide, side: C.hide, top: C.hide }),
  ];
  // Sweeping 2-segment curved ram horns
  for (const s of [-1, 1]) {
    headList.push(
      taperPrism(new Vec3(2.4, 4.5, 2.4), new Vec3(1.5, 4.5, 1.5), new Vec3(s * 4.2, 6.8, -0.2), { front: C.bone, back: C.bone, side: C.bone }, new Vec2(s * 3.4, -1.6)),
      taperPrism(new Vec3(1.5, 4.2, 1.5), new Vec3(0.4, 4.2, 0.4), new Vec3(s * 6.8, 10.5, -1.4), { front: C.bone, back: C.bone, side: C.bone }, new Vec2(-s * 1.6, 1.4))
    );
  }

  const jaw = mergeGeometries([
    taperPrism(new Vec3(5.6, 2.8, 5.8), new Vec3(6.4, 2.8, 6.4), new Vec3(0, -1.2, 0.8), { front: C.jaw, back: C.limb, side: C.jaw, top: C.gore, bottom: C.limb }),
    boxPrism(new Vec3(1.1, 1.6, 1.1), new Vec3(-2.1, 0.6, 3.2), { front: C.bone, back: C.bone, side: C.bone }),
    boxPrism(new Vec3(1.1, 1.6, 1.1), new Vec3(2.1, 0.6, 3.2), { front: C.bone, back: C.bone, side: C.bone }),
  ]);

  const makeArm = (side) => {
    const parts = [
      // Sinewy upper arm
      taperPrism(new Vec3(3.2, 7.5, 3.2), new Vec3(3.8, 7.5, 3.8), new Vec3(side * 1.2, -3.5, 0.8), { front: C.limb, back: C.limb, side: C.limb }, new Vec2(-side * 0.6, -0.8)),
      // Forearm reaching forward
      taperPrism(new Vec3(2.8, 7.0, 3.0), new Vec3(3.2, 7.0, 3.2), new Vec3(side * 1.6, -9.8, 3.4), { front: C.gore, back: C.limb, side: C.limb }, new Vec2(-side * 0.4, -2.4)),
    ];
    for (const sp of [-1.1, 0, 1.1])
      parts.push(taperPrism(new Vec3(0.5, 3.8, 0.6), new Vec3(0.9, 3.8, 1.0), new Vec3(side * 1.6 + sp, -14.2, 5.2), { front: C.bone, back: C.gore, side: C.bone }, new Vec2(-sp * 0.4, -1.4)));
    return mergeGeometries(parts);
  };

  const makeLeg = (side) => mergeGeometries([
    // Digitigrade thigh
    taperPrism(new Vec3(3.6, 7.5, 3.8), new Vec3(4.6, 7.5, 4.6), new Vec3(0, -3.8, 0.8), { front: C.limb, back: C.hide, side: C.limb }, new Vec2(0, -1.2)),
    // Shin & ankle
    taperPrism(new Vec3(2.8, 7.5, 3.0), new Vec3(3.4, 7.5, 3.4), new Vec3(0, -10.8, -0.4), { front: C.hide, back: C.hide, side: C.hide }, new Vec2(0, -1.4)),
    // Clawed 3D foot on y = -15
    taperPrism(new Vec3(4.2, 2.2, 6.2), new Vec3(3.2, 2.2, 4.4), new Vec3(side * 0.2, -14.4, 1.4), { front: C.bone, back: C.hide, side: C.gore, top: C.hide }),
  ]);

  const extra = mergeGeometries([
    // Barbed whip tail
    taperPrism(new Vec3(1.6, 2.2, 7.5), new Vec3(2.6, 2.6, 7.5), new Vec3(0, -1.2, -4.2), { front: C.limb, back: C.gore, side: C.limb, top: C.hide }),
    taperPrism(new Vec3(0.6, 1.8, 6.5), new Vec3(1.8, 1.8, 6.5), new Vec3(0, -0.4, -10.2), { front: C.gore, back: C.bone, side: C.gore, top: C.gore }),
  ]);

  return {
    pivots: {
      body: new Vec3(0, 15.5, 0),
      head: new Vec3(0, 18.5, 0.8),
      jaw: new Vec3(0, 1.2, 0.4),
      leftArm: new Vec3(-7.6, 16.5, 0.4),
      rightArm: new Vec3(7.6, 16.5, 0.4),
      leftLeg: new Vec3(-4.0, 15.5, 0),
      rightLeg: new Vec3(4.0, 15.5, 0),
      extra: new Vec3(0, 2.5, -3.2),
    },
    body: mergeGeometries(bodyList),
    head: mergeGeometries(headList),
    jaw,
    leftArm: makeArm(-1),
    rightArm: makeArm(1),
    leftLeg: makeLeg(-1),
    rightLeg: makeLeg(1),
    extra,
  };
}

function buildBruteParts() {
  const C = MONSTER_SKIN_CELLS;
  const bodyList = [
    // Massive wide pelvis & ruptured gut
    taperPrism(new Vec3(13.5, 6.5, 9.5), new Vec3(15.5, 6.5, 11.2), new Vec3(0, 3.2, 0), { front: C.hide, back: C.back, side: C.hide }),
    // Hulking bloated chest & stitched abdomen
    taperPrism(new Vec3(15.5, 14.5, 11.2), new Vec3(20.5, 14.5, 13.0), new Vec3(0, 13.5, 0.5), { front: C.chest, back: C.back, side: C.limb, top: C.hide }),
    // Protruding 3D ruptured visceral belly dome + surgical staples
    taperPrism(new Vec3(10.5, 8.5, 3.2), new Vec3(11.5, 8.5, 3.6), new Vec3(0, 9.5, 6.2), { front: C.chest, back: C.gore, side: C.gore, top: C.bone }),
    // Heavy charred shoulder pauldrons
    boxPrism(new Vec3(6.2, 5.5, 9.5), new Vec3(-10.2, 18.8, 0.2), { front: C.hide, back: C.hide, side: C.hide, top: C.hide }),
    boxPrism(new Vec3(6.2, 5.5, 9.5), new Vec3(10.2, 18.8, 0.2), { front: C.hide, back: C.hide, side: C.hide, top: C.hide }),
  ];
  // Jagged bone shoulder spikes jutting from bleeding roots
  for (const s of [-1, 1]) {
    bodyList.push(
      taperPrism(new Vec3(2.8, 7.5, 2.8), new Vec3(0.6, 7.5, 0.6), new Vec3(s * 10.5, 24.2, 0.2), { front: C.bone, back: C.bone, side: C.bone }, new Vec2(s * 3.2, -0.8)),
      taperPrism(new Vec3(2.2, 5.8, 2.2), new Vec3(0.5, 5.8, 0.5), new Vec3(s * 7.2, 23.2, -0.8), { front: C.bone, back: C.bone, side: C.bone }, new Vec2(s * 1.8, -1.2))
    );
  }

  const headList = [
    // Sunken brutish skull
    taperPrism(new Vec3(9.6, 7.4, 8.8), new Vec3(8.2, 7.4, 7.6), new Vec3(0, 3.4, 1.2), { front: C.face, back: C.back, side: C.limb, top: C.hide }),
    boxPrism(new Vec3(9.8, 1.8, 2.6), new Vec3(0, 5.2, 5.2), { front: C.hide, back: C.hide, side: C.hide, top: C.hide }),
  ];
  // Huge upward boar tusks
  for (const s of [-1, 1])
    headList.push(taperPrism(new Vec3(2.0, 5.2, 2.0), new Vec3(0.5, 5.2, 0.5), new Vec3(s * 4.4, 2.2, 5.4), { front: C.bone, back: C.gore, side: C.bone }, new Vec2(s * 1.2, 1.4)));

  const jaw = mergeGeometries([
    taperPrism(new Vec3(7.8, 3.4, 7.2), new Vec3(8.6, 3.4, 7.8), new Vec3(0, -1.4, 1.4), { front: C.jaw, back: C.limb, side: C.jaw, top: C.gore }),
    boxPrism(new Vec3(1.5, 2.2, 1.5), new Vec3(-2.8, 0.8, 4.4), { front: C.bone, back: C.bone, side: C.bone }),
    boxPrism(new Vec3(1.5, 2.2, 1.5), new Vec3(2.8, 0.8, 4.4), { front: C.bone, back: C.bone, side: C.bone }),
  ]);

  const makeArm = (side) => mergeGeometries([
    // Massive meat-hammer upper arm
    taperPrism(new Vec3(5.2, 8.5, 5.4), new Vec3(5.8, 8.5, 5.8), new Vec3(side * 1.8, -4.0, 0.6), { front: C.limb, back: C.hide, side: C.limb }),
    // Thick forearm
    taperPrism(new Vec3(5.8, 8.2, 6.0), new Vec3(4.8, 8.2, 5.0), new Vec3(side * 2.2, -11.2, 2.8), { front: C.hide, back: C.hide, side: C.limb }, new Vec2(0, -1.8)),
    // Colossal gore-drenched club fist + bone knuckle spikes
    boxPrism(new Vec3(6.6, 5.6, 6.8), new Vec3(side * 2.0, -16.2, 4.2), { front: C.gore, back: C.limb, side: C.gore, bottom: C.gore }),
    boxPrism(new Vec3(5.8, 1.4, 1.8), new Vec3(side * 2.0, -16.2, 7.8), { front: C.bone, back: C.bone, side: C.bone }),
  ]);

  const makeLeg = (side) => mergeGeometries([
    taperPrism(new Vec3(5.8, 8.2, 6.2), new Vec3(6.6, 8.2, 6.8), new Vec3(0, -4.0, 0.2), { front: C.hide, back: C.hide, side: C.limb }),
    taperPrism(new Vec3(5.4, 7.8, 5.8), new Vec3(5.6, 7.8, 6.0), new Vec3(0, -11.2, 0.0), { front: C.hide, back: C.hide, side: C.hide }),
    boxPrism(new Vec3(6.4, 2.8, 8.2), new Vec3(side * 0.3, -14.6, 1.4), { front: C.gore, back: C.hide, side: C.gore, top: C.hide }),
  ]);

  const extra = mergeGeometries([
    boxPrism(new Vec3(4.2, 13.5, 2.6), new Vec3(0, 12.0, -6.2), { front: C.bone, back: C.bone, side: C.gore }),
  ]);

  return {
    pivots: {
      body: new Vec3(0, 15.5, 0),
      head: new Vec3(0, 19.2, 1.2),
      jaw: new Vec3(0, 1.0, 0.6),
      leftArm: new Vec3(-11.2, 18.0, 0.6),
      rightArm: new Vec3(11.2, 18.0, 0.6),
      leftLeg: new Vec3(-5.2, 15.5, 0),
      rightLeg: new Vec3(5.2, 15.5, 0),
      extra: new Vec3(0, 2.0, 0),
    },
    body: mergeGeometries(bodyList),
    head: mergeGeometries(headList),
    jaw,
    leftArm: makeArm(-1),
    rightArm: makeArm(1),
    leftLeg: makeLeg(-1),
    rightLeg: makeLeg(1),
    extra,
  };
}

function buildBossParts() {
  const C = MONSTER_SKIN_CELLS;
  const bodyList = [
    // Obsidian-armored pelvis & waist tassets
    taperPrism(new Vec3(14.5, 6.5, 10.2), new Vec3(16.5, 6.5, 11.4), new Vec3(0, 3.2, 0), { front: C.hide, back: C.back, side: C.hide }),
    // Colossal flayed & armored thoracic cuirass
    taperPrism(new Vec3(16.0, 15.5, 11.4), new Vec3(22.5, 15.5, 13.8), new Vec3(0, 14.0, 0.6), { front: C.chest, back: C.back, side: C.hide, top: C.hide }),
    // Pulsing 3D chest hell-core & pried-open bone ribs
    boxPrism(new Vec3(7.5, 7.5, 2.8), new Vec3(0, 14.2, 6.8), { front: C.chest, back: C.gore, side: C.gore, top: C.gore }),
  ];
  for (const ry of [9.0, 12.0, 15.0, 18.0]) {
    bodyList.push(
      boxPrism(new Vec3(4.8, 1.3, 2.2), new Vec3(-5.2, ry, 6.6), { front: C.bone, back: C.gore, side: C.bone }),
      boxPrism(new Vec3(4.8, 1.3, 2.2), new Vec3(5.2, ry, 6.6), { front: C.bone, back: C.gore, side: C.bone })
    );
  }
  // Double rows of blood-soaked shoulder spikes
  for (const s of [-1, 1]) {
    bodyList.push(
      boxPrism(new Vec3(6.8, 6.0, 10.2), new Vec3(s * 11.2, 19.5, 0.4), { front: C.hide, back: C.hide, side: C.hide, top: C.gore }),
      taperPrism(new Vec3(3.0, 9.0, 3.0), new Vec3(0.6, 9.0, 0.6), new Vec3(s * 12.2, 25.5, 0.4), { front: C.bone, back: C.bone, side: C.bone }, new Vec2(s * 4.2, -1.0)),
      taperPrism(new Vec3(2.4, 7.5, 2.4), new Vec3(0.5, 7.5, 0.5), new Vec3(s * 8.6, 24.8, -0.8), { front: C.bone, back: C.bone, side: C.bone }, new Vec2(s * 2.5, -1.4))
    );
  }

  const headList = [
    // Four-eyed overlord skull visage
    taperPrism(new Vec3(10.2, 8.2, 9.2), new Vec3(8.8, 8.2, 8.2), new Vec3(0, 4.0, 1.0), { front: C.face, back: C.back, side: C.limb, top: C.hide }),
  ];
  // Crown of five sweeping horns
  for (const k of [-2, -1, 0, 1, 2]) {
    const h = 8.5 - Math.abs(k) * 1.2;
    headList.push(
      taperPrism(new Vec3(1.9, h, 1.9), new Vec3(0.4, h, 0.4), new Vec3(k * 2.2, 7.5 + h * 0.45, 0.2), { front: C.bone, back: C.bone, side: C.bone }, new Vec2(k * 1.9, -1.2))
    );
  }
  for (const s of [-1, 1])
    headList.push(taperPrism(new Vec3(2.0, 5.6, 2.0), new Vec3(0.5, 5.6, 0.5), new Vec3(s * 4.8, 2.4, 5.2), { front: C.bone, back: C.gore, side: C.bone }, new Vec2(s * 1.6, 1.5)));

  const jaw = mergeGeometries([
    taperPrism(new Vec3(8.2, 3.6, 7.6), new Vec3(9.0, 3.6, 8.0), new Vec3(0, -1.6, 1.2), { front: C.jaw, back: C.limb, side: C.jaw, top: C.gore }),
    boxPrism(new Vec3(5.6, 1.8, 2.2), new Vec3(0, -2.8, 3.2), { front: C.gore, back: C.gore, side: C.gore }),
  ]);

  const makeArm = (side) => {
    const parts = [
      taperPrism(new Vec3(5.6, 9.0, 5.8), new Vec3(6.4, 9.0, 6.2), new Vec3(side * 2.0, -4.2, 0.6), { front: C.hide, back: C.hide, side: C.limb }),
      taperPrism(new Vec3(6.0, 8.8, 6.2), new Vec3(5.2, 8.8, 5.4), new Vec3(side * 2.6, -11.8, 3.0), { front: C.limb, back: C.hide, side: C.gore }, new Vec2(0, -2.0)),
      boxPrism(new Vec3(6.4, 4.8, 6.4), new Vec3(side * 2.6, -16.8, 4.4), { front: C.gore, back: C.gore, side: C.gore }),
    ];
    for (const sp of [-1.8, 0, 1.8])
      parts.push(taperPrism(new Vec3(0.6, 4.6, 0.7), new Vec3(1.3, 4.6, 1.3), new Vec3(side * 2.6 + sp, -20.2, 5.8), { front: C.bone, back: C.bone, side: C.bone }, new Vec2(0, -1.2)));
    return mergeGeometries(parts);
  };

  const makeLeg = (side) => mergeGeometries([
    taperPrism(new Vec3(6.2, 8.6, 6.6), new Vec3(7.0, 8.6, 7.2), new Vec3(0, -4.2, 0.2), { front: C.hide, back: C.hide, side: C.hide }),
    taperPrism(new Vec3(5.8, 8.4, 6.2), new Vec3(6.0, 8.4, 6.4), new Vec3(0, -11.6, 0.0), { front: C.hide, back: C.hide, side: C.hide }),
    boxPrism(new Vec3(6.8, 3.0, 8.8), new Vec3(side * 0.3, -15.2, 1.6), { front: C.gore, back: C.hide, side: C.gore, top: C.hide }),
  ]);

  const extra = mergeGeometries([
    taperPrism(new Vec3(3.6, 15.0, 3.6), new Vec3(1.2, 15.0, 1.2), new Vec3(0, 13.0, -6.8), { front: C.bone, back: C.bone, side: C.gore }, new Vec2(0, -2.2)),
  ]);

  return {
    pivots: {
      body: new Vec3(0, 16.5, 0),
      head: new Vec3(0, 20.5, 1.2),
      jaw: new Vec3(0, 1.2, 0.6),
      leftArm: new Vec3(-12.2, 19.0, 0.6),
      rightArm: new Vec3(12.2, 19.0, 0.6),
      leftLeg: new Vec3(-5.6, 16.5, 0),
      rightLeg: new Vec3(5.6, 16.5, 0),
      extra: new Vec3(0, 2.0, 0),
    },
    body: mergeGeometries(bodyList),
    head: mergeGeometries(headList),
    jaw,
    leftArm: makeArm(-1),
    rightArm: makeArm(1),
    leftLeg: makeLeg(-1),
    rightLeg: makeLeg(1),
    extra,
  };
}

function buildSkullParts() {
  const C = MONSTER_SKIN_CELLS;
  const bodyList = [
    // Bulbous ossified cranium dome & recessed eye sockets
    taperPrism(new Vec3(14.5, 11.5, 13.5), new Vec3(12.0, 11.5, 11.0), new Vec3(0, 5.5, 0), { front: C.face, back: C.chest, side: C.chest, top: C.chest }),
    // Cranial crown vault
    taperPrism(new Vec3(12.0, 4.2, 11.0), new Vec3(7.5, 4.2, 7.0), new Vec3(0, 13.0, -0.5), { front: C.chest, back: C.chest, side: C.chest, top: C.chest }),
    // Wide protruding 3D cheekbones
    boxPrism(new Vec3(4.2, 4.8, 6.2), new Vec3(-7.2, 2.2, 2.2), { front: C.bone, back: C.bone, side: C.bone, top: C.bone }),
    boxPrism(new Vec3(4.2, 4.8, 6.2), new Vec3(7.2, 2.2, 2.2), { front: C.bone, back: C.bone, side: C.bone, top: C.bone }),
    // Upper jagged bone fangs
    boxPrism(new Vec3(9.6, 2.2, 2.2), new Vec3(0, -0.8, 5.4), { front: C.bone, back: C.gore, side: C.bone }),
  ];

  // Head node holds inner blazing hellfire throat core & brow horns
  const head = mergeGeometries([
    boxPrism(new Vec3(6.8, 4.8, 4.8), new Vec3(0, -1.2, 2.2), { front: C.face, back: C.gore, side: C.gore, top: C.gore }),
    taperPrism(new Vec3(2.2, 5.0, 2.2), new Vec3(0.5, 5.0, 0.5), new Vec3(-6.2, 11.2, 1.0), { front: C.bone, back: C.bone, side: C.bone }, new Vec2(-2.2, -1.2)),
    taperPrism(new Vec3(2.2, 5.0, 2.2), new Vec3(0.5, 5.0, 0.5), new Vec3(6.2, 11.2, 1.0), { front: C.bone, back: C.bone, side: C.bone }, new Vec2(2.2, -1.2)),
  ]);

  // Unhinging mandible jaw with 3D lower fangs
  const jaw = mergeGeometries([
    taperPrism(new Vec3(9.2, 3.6, 9.6), new Vec3(10.8, 3.6, 10.6), new Vec3(0, -2.2, 0.8), { front: C.jaw, back: C.bone, side: C.bone, top: C.gore, bottom: C.bone }),
    boxPrism(new Vec3(8.8, 2.0, 2.0), new Vec3(0, 0.2, 4.8), { front: C.bone, back: C.gore, side: C.bone }),
  ]);

  // Rotting crimson scalp & nerve tendrils flanking the skull
  const makeTendril = (side) => mergeGeometries([
    taperPrism(new Vec3(1.2, 9.5, 1.8), new Vec3(2.2, 9.5, 2.4), new Vec3(side * 1.2, -4.5, -0.8), { front: C.gore, back: C.hide, side: C.gore }, new Vec2(-side * 1.2, 0.8)),
  ]);

  // Dangling bloody spinal column segments
  const spineUpper = [];
  for (let k = 0; k < 4; k++) {
    const w = 3.8 - k * 0.45;
    const cell = k % 2 === 0 ? C.bone : C.gore;
    spineUpper.push(boxPrism(new Vec3(w, 2.2, w), new Vec3(0, -1.4 - k * 2.4, -0.4 * k), { front: cell, back: cell, side: cell, top: C.gore }));
  }
  const spineLower = [];
  for (let k = 0; k < 4; k++) {
    const w = 2.2 - k * 0.35;
    const cell = k % 2 === 0 ? C.gore : C.bone;
    spineLower.push(boxPrism(new Vec3(w, 2.2, w), new Vec3(0, -1.4 - k * 2.2, -0.4 * k), { front: cell, back: cell, side: cell }));
  }

  return {
    pivots: {
      body: new Vec3(0, 14.0, 0),
      head: new Vec3(0, 1.0, 0),
      jaw: new Vec3(0, -0.5, 0.6),
      leftArm: new Vec3(-7.8, 4.5, -1.0),
      rightArm: new Vec3(7.8, 4.5, -1.0),
      leftLeg: new Vec3(0, 12.5, -1.5),
      rightLeg: new Vec3(0, 4.5, -2.8),
      extra: new Vec3(0, 11.0, -2.0),
    },
    body: mergeGeometries(bodyList),
    head,
    jaw,
    leftArm: makeTendril(-1),
    rightArm: makeTendril(1),
    leftLeg: mergeGeometries(spineUpper),
    rightLeg: mergeGeometries(spineLower),
    extra: makeTendril(0),
  };
}

function buildCrawlerParts() {
  const C = MONSTER_SKIN_CELLS;
  const bodyList = [
    // Low arachnid cephalothorax
    taperPrism(new Vec3(11.5, 6.5, 11.5), new Vec3(9.5, 6.5, 9.5), new Vec3(0, 3.5, 3.2), { front: C.hide, back: C.hide, side: C.hide, top: C.chest }),
    // Bloated rear abdomen with weeping gore pustules
    taperPrism(new Vec3(14.5, 9.5, 14.5), new Vec3(11.5, 9.5, 11.5), new Vec3(0, 5.8, -7.2), { front: C.chest, back: C.back, side: C.chest, top: C.chest }),
    // Raised 3D arterial gore pustules on abdomen
    boxPrism(new Vec3(4.2, 2.8, 4.2), new Vec3(-3.8, 10.8, -6.2), { front: C.gore, back: C.gore, side: C.gore, top: C.gore }),
    boxPrism(new Vec3(4.5, 3.0, 4.5), new Vec3(4.0, 10.5, -8.5), { front: C.gore, back: C.gore, side: C.gore, top: C.gore }),
    boxPrism(new Vec3(3.8, 2.6, 3.8), new Vec3(0, 11.2, -3.8), { front: C.gore, back: C.gore, side: C.gore, top: C.gore }),
  ];
  // 4 dorsal bone spines jutting from the abdomen
  for (const dx of [-4.5, -1.5, 1.5, 4.5])
    bodyList.push(taperPrism(new Vec3(1.4, 5.2, 1.4), new Vec3(0.35, 5.2, 0.35), new Vec3(dx, 12.5, -5.5), { front: C.bone, back: C.bone, side: C.bone }, new Vec2(dx * 0.35, -1.4)));

  const head = mergeGeometries([
    // 6-eyed arachnid face plate
    taperPrism(new Vec3(9.2, 5.8, 5.2), new Vec3(7.6, 5.8, 4.2), new Vec3(0, 0.5, 2.2), { front: C.face, back: C.hide, side: C.hide, top: C.hide }),
  ]);

  // Curved dripping chelicerae / mandibles
  const jaw = mergeGeometries([
    taperPrism(new Vec3(1.6, 5.2, 2.2), new Vec3(2.8, 5.2, 2.8), new Vec3(-2.8, -2.2, 3.8), { front: C.bone, back: C.gore, side: C.bone }, new Vec2(0.8, -1.2)),
    taperPrism(new Vec3(1.6, 5.2, 2.2), new Vec3(2.8, 5.2, 2.8), new Vec3(2.8, -2.2, 3.8), { front: C.bone, back: C.gore, side: C.bone }, new Vec2(-0.8, -1.2)),
    boxPrism(new Vec3(4.8, 2.4, 2.6), new Vec3(0, -1.0, 2.4), { front: C.jaw, back: C.gore, side: C.gore }),
  ]);

  // Multi-jointed razor scythe legs (each limb mesh holds a pair of arched spider legs)
  const makeScythePair = (side, zA, zB) => {
    const parts = [];
    for (const zOff of [zA, zB]) {
      parts.push(
        // Arched femur rising outward from thorax
        taperPrism(new Vec3(7.5, 2.4, 2.2), new Vec3(7.5, 2.0, 1.8), new Vec3(side * 3.8, 3.2, zOff), { front: C.hide, back: C.hide, side: C.hide, top: C.hide }, new Vec2(side * 2.2, 0)),
        // Razor bone tibia plunging down to bloodied tip on floor (y = -9.5)
        taperPrism(new Vec3(0.9, 13.5, 0.9), new Vec3(2.4, 13.5, 2.2), new Vec3(side * 9.2, -2.5, zOff + 0.6), { front: C.bone, back: C.gore, side: C.bone }, new Vec2(-side * 2.2, 0))
      );
    }
    return mergeGeometries(parts);
  };

  return {
    pivots: {
      body: new Vec3(0, 9.5, 0),
      head: new Vec3(0, 4.2, 7.2),
      jaw: new Vec3(0, -0.8, 1.2),
      leftArm: new Vec3(-5.2, 3.5, 3.5),
      rightArm: new Vec3(5.2, 3.5, 3.5),
      leftLeg: new Vec3(-5.5, 9.5, -2.5),
      rightLeg: new Vec3(5.5, 9.5, -2.5),
      extra: new Vec3(0, 3.5, -6.5),
    },
    body: mergeGeometries(bodyList),
    head,
    jaw,
    leftArm: makeScythePair(-1, 2.2, -1.8),
    rightArm: makeScythePair(1, 2.2, -1.8),
    leftLeg: makeScythePair(-1, -1.5, -6.2),
    rightLeg: makeScythePair(1, -1.5, -6.2),
    extra: mergeGeometries([
      taperPrism(new Vec3(2.4, 2.4, 5.5), new Vec3(0.8, 1.2, 5.5), new Vec3(0, 1.5, -9.5), { front: C.gore, back: C.gore, side: C.bone }),
    ]),
  };
}

function buildSwarmerParts() {
  const C = MONSTER_SKIN_CELLS;
  const bodyList = [
    // Low crouched skinless predator torso elongated along Z
    taperPrism(new Vec3(9.5, 6.8, 13.5), new Vec3(7.8, 6.8, 11.5), new Vec3(0, 3.8, -0.5), { front: C.chest, back: C.back, side: C.limb, top: C.back }),
    taperPrism(new Vec3(7.2, 5.2, 6.5), new Vec3(5.8, 5.2, 5.5), new Vec3(0, 2.8, -7.5), { front: C.hide, back: C.hide, side: C.limb }),
  ];
  // 4 exposed dorsal spinal fin-ridges jutting from back
  for (const [i, tz] of [[0, 3.5], [1, 0.2], [2, -3.2], [3, -6.5]]) {
    const h = 5.5 - i * 0.5;
    bodyList.push(taperPrism(new Vec3(1.3, h, 2.2), new Vec3(0.3, h, 0.6), new Vec3(0, 7.2 + h * 0.4, tz), { front: C.bone, back: C.gore, side: C.bone }, new Vec2(0, -1.5)));
  }

  const head = mergeGeometries([
    // Oversized feral upper shark-skull & rabid eyes
    taperPrism(new Vec3(8.8, 5.2, 7.8), new Vec3(6.8, 5.2, 6.5), new Vec3(0, 1.8, 3.2), { front: C.face, back: C.limb, side: C.face, top: C.limb }),
    // Upper row of jagged shark fangs
    boxPrism(new Vec3(7.8, 1.8, 2.2), new Vec3(0, -1.2, 5.6), { front: C.bone, back: C.gore, side: C.bone }),
  ]);

  const jaw = mergeGeometries([
    // Split lower shark-maw
    taperPrism(new Vec3(7.6, 2.8, 7.4), new Vec3(8.4, 2.8, 7.8), new Vec3(0, -1.8, 3.0), { front: C.jaw, back: C.limb, side: C.jaw, top: C.gore }),
    boxPrism(new Vec3(7.2, 1.8, 2.0), new Vec3(0, 0.2, 5.4), { front: C.bone, back: C.gore, side: C.bone }),
  ]);

  const makeFrontLeg = (side) => mergeGeometries([
    taperPrism(new Vec3(2.8, 6.2, 3.0), new Vec3(3.4, 6.2, 3.4), new Vec3(side * 1.4, -3.0, 1.2), { front: C.limb, back: C.limb, side: C.limb }, new Vec2(-side * 0.8, -0.8)),
    taperPrism(new Vec3(1.6, 5.8, 2.2), new Vec3(2.6, 5.8, 2.8), new Vec3(side * 2.0, -7.8, 2.8), { front: C.bone, back: C.gore, side: C.bone }, new Vec2(-side * 0.5, -1.2)),
  ]);

  const makeHindLeg = (side) => mergeGeometries([
    taperPrism(new Vec3(3.2, 6.0, 3.8), new Vec3(4.0, 6.0, 4.2), new Vec3(side * 1.2, -2.8, -0.6), { front: C.limb, back: C.hide, side: C.limb }),
    taperPrism(new Vec3(2.2, 5.8, 3.2), new Vec3(2.8, 5.8, 3.4), new Vec3(side * 1.5, -7.6, 0.8), { front: C.bone, back: C.gore, side: C.bone }),
  ]);

  const extra = mergeGeometries([
    // Whip-like flayed tail angled upward
    taperPrism(new Vec3(2.2, 2.2, 6.8), new Vec3(1.2, 1.4, 6.8), new Vec3(0, 2.4, -3.5), { front: C.limb, back: C.gore, side: C.limb }, new Vec2(0, 2.2)),
    taperPrism(new Vec3(1.2, 1.4, 5.8), new Vec3(0.4, 0.6, 5.8), new Vec3(0, 4.8, -8.5), { front: C.gore, back: C.gore, side: C.gore }, new Vec2(0, 2.0)),
  ]);

  return {
    pivots: {
      body: new Vec3(0, 10.2, 0),
      head: new Vec3(0, 4.2, 5.5),
      jaw: new Vec3(0, -0.6, 0.4),
      leftArm: new Vec3(-4.5, 2.8, 3.8),
      rightArm: new Vec3(4.5, 2.8, 3.8),
      leftLeg: new Vec3(-4.0, 10.2, -4.8),
      rightLeg: new Vec3(4.0, 10.2, -4.8),
      extra: new Vec3(0, 3.8, -9.5),
    },
    body: mergeGeometries(bodyList),
    head,
    jaw,
    leftArm: makeFrontLeg(-1),
    rightArm: makeFrontLeg(1),
    leftLeg: makeHindLeg(-1),
    rightLeg: makeHindLeg(1),
    extra,
  };
}

function buildWraithParts() {
  const C = MONSTER_SKIN_CELLS;
  const bodyList = [
    // Flared tattered lower necrotic shroud skirt
    taperPrism(new Vec3(15.5, 13.0, 11.5), new Vec3(10.5, 13.0, 8.2), new Vec3(0, 6.5, 0), { front: C.hide, back: C.back, side: C.hide }),
    // Upper shroud & exposed bone ribcage + crimson heart
    taperPrism(new Vec3(10.5, 14.0, 8.2), new Vec3(14.0, 14.0, 9.5), new Vec3(0, 19.5, 0.4), { front: C.chest, back: C.back, side: C.hide, top: C.hide }),
  ];
  for (const ry of [15.5, 18.2, 21.0, 23.5])
    bodyList.push(boxPrism(new Vec3(7.6, 0.9, 1.2), new Vec3(0, ry, 4.5), { front: C.bone, back: C.gore, side: C.bone }));

  const head = mergeGeometries([
    // Deep cowled gothic hood enveloping the abyssal skull visage
    taperPrism(new Vec3(10.2, 8.5, 9.2), new Vec3(6.8, 8.5, 6.8), new Vec3(0, 4.2, 0.6), { front: C.face, back: C.hide, side: C.hide, top: C.hide }),
    // Pointed hood peak
    taperPrism(new Vec3(6.8, 4.2, 6.8), new Vec3(1.4, 4.2, 2.0), new Vec3(0, 10.2, -0.8), { front: C.hide, back: C.hide, side: C.hide }, new Vec2(0, -1.8)),
  ]);

  const jaw = mergeGeometries([
    taperPrism(new Vec3(5.8, 2.6, 5.4), new Vec3(6.6, 2.6, 6.0), new Vec3(0, -1.0, 1.0), { front: C.jaw, back: C.hide, side: C.jaw, top: C.gore }),
  ]);

  const makeArm = (side) => {
    const parts = [
      // Billowing tattered sleeve
      taperPrism(new Vec3(4.6, 8.5, 5.2), new Vec3(3.4, 8.5, 3.8), new Vec3(side * 1.6, -4.0, 1.8), { front: C.hide, back: C.hide, side: C.hide }, new Vec2(-side * 0.8, -1.6)),
      taperPrism(new Vec3(3.8, 6.5, 4.4), new Vec3(4.6, 6.5, 5.0), new Vec3(side * 2.2, -10.2, 4.6), { front: C.hide, back: C.gore, side: C.hide }, new Vec2(-side * 0.4, -2.2)),
    ];
    // 3 long blood-tipped corpse-bone claws per hand
    for (const sp of [-1.2, 0, 1.2])
      parts.push(taperPrism(new Vec3(0.4, 5.2, 0.5), new Vec3(0.9, 5.2, 1.0), new Vec3(side * 2.2 + sp, -15.0, 6.8), { front: C.bone, back: C.gore, side: C.bone }, new Vec2(-sp * 0.3, -1.6)));
    return mergeGeometries(parts);
  };

  const makeTatter = (side) => mergeGeometries([
    taperPrism(new Vec3(2.2, 7.5, 3.2), new Vec3(5.8, 7.5, 5.8), new Vec3(side * 0.8, -3.5, -0.4), { front: C.hide, back: C.gore, side: C.hide }),
  ]);

  return {
    pivots: {
      body: new Vec3(0, 6.5, 0),
      head: new Vec3(0, 26.0, 0.4),
      jaw: new Vec3(0, 0.8, 0.4),
      leftArm: new Vec3(-7.2, 24.5, 0.4),
      rightArm: new Vec3(7.2, 24.5, 0.4),
      leftLeg: new Vec3(-3.8, 7.5, 0),
      rightLeg: new Vec3(3.8, 7.5, 0),
      extra: new Vec3(0, 7.0, -3.5),
    },
    body: mergeGeometries(bodyList),
    head,
    jaw,
    leftArm: makeArm(-1),
    rightArm: makeArm(1),
    leftLeg: makeTatter(-1),
    rightLeg: makeTatter(1),
    extra: makeTatter(0),
  };
}

const partCache = {};
const meshCache = {};
const visceraCache = {};
let gorePoolGeo = null;
let goreChunkGeos = null;

function getGorePoolGeometry() {
  if (gorePoolGeo)
    return gorePoolGeo;
  const C = MONSTER_SKIN_CELLS;
  gorePoolGeo = mergeGeometries([
    taperPrism(new Vec3(18.0, 1.4, 18.0), new Vec3(13.0, 1.4, 13.0), new Vec3(0, 0.7, 0), { front: C.gore, back: C.gore, side: C.gore, top: C.gore, bottom: C.gore }),
    taperPrism(new Vec3(9.5, 3.2, 9.5), new Vec3(4.5, 3.2, 4.5), new Vec3(0, 2.0, 0), { front: C.gore, back: C.bone, side: C.gore, top: C.gore }),
  ]);
  return gorePoolGeo;
}

function getGoreChunkGeometries() {
  if (goreChunkGeos)
    return goreChunkGeos;
  const C = MONSTER_SKIN_CELLS;
  const meatOrgan = mergeGeometries([
    taperPrism(new Vec3(3.4, 3.2, 3.2), new Vec3(2.2, 3.2, 2.1), new Vec3(0, 0, 0), { front: C.gore, back: C.gore, side: C.gore, top: C.gore, bottom: C.gore }, new Vec2(0.4, -0.3)),
    taperPrism(new Vec3(1.8, 2.6, 1.6), new Vec3(0.9, 2.6, 0.8), new Vec3(1.1, 0.8, 0.6), { front: C.bone, back: C.gore, side: C.bone, top: C.bone }, new Vec2(0.8, 0.6)),
  ]);
  const boneRib = mergeGeometries([
    taperPrism(new Vec3(4.2, 1.6, 1.8), new Vec3(1.2, 1.2, 1.1), new Vec3(0, 0, 0), { front: C.bone, back: C.gore, side: C.bone, top: C.bone, bottom: C.gore }, new Vec2(-0.6, 0.8)),
    taperPrism(new Vec3(2.4, 2.4, 2.4), new Vec3(1.4, 2.4, 1.4), new Vec3(-1.2, -0.4, 0.3), { front: C.gore, back: C.gore, side: C.gore, top: C.gore }),
  ]);
  goreChunkGeos = [meatOrgan, boneRib];
  return goreChunkGeos;
}

/**
 * Builds the 3D internal skeletal & visceral horror geometry (`goreViscera`) for `type`:
 * - Jagged protruding cervical neck spine & ruptured windpipe at the neck stump (`pivots.head`).
 * - Shattered humerus bone stumps at the left and right shoulder sockets (`pivots.leftArm`, `pivots.rightArm`).
 * - 4 pairs of jagged white 3D rib bones bursting outward from the torn thoracic cavity.
 * - Ruptured arterial entrails and viscera coils spilling from the abdomen.
 */
function getGoreVisceraGeometry(type, pivots) {
  if (visceraCache[type])
    return visceraCache[type];
  const C = MONSTER_SKIN_CELLS;
  const hx = pivots.head.x;
  const hy = pivots.head.y;
  const hz = pivots.head.z;
  const lx = pivots.leftArm.x;
  const ly = pivots.leftArm.y;
  const lz = pivots.leftArm.z;
  const rx = pivots.rightArm.x;
  const ry = pivots.rightArm.y;
  const rz = pivots.rightArm.z;

  const list = [
    // Blood-drenched cervical neck stump & protruding jagged spinal column
    taperPrism(new Vec3(4.6, 3.2, 4.6), new Vec3(3.2, 3.2, 3.2), new Vec3(hx, hy - 0.5, hz), { front: C.gore, back: C.gore, side: C.gore, top: C.gore }),
    taperPrism(new Vec3(2.2, 4.8, 2.2), new Vec3(1.1, 4.8, 1.1), new Vec3(hx, hy + 2.2, hz - 0.3), { front: C.bone, back: C.bone, side: C.bone, top: C.gore }, new Vec2(0.3, -0.4)),
    taperPrism(new Vec3(1.6, 3.4, 1.6), new Vec3(0.7, 3.4, 0.7), new Vec3(hx + 0.9, hy + 1.4, hz + 0.8), { front: C.gore, back: C.bone, side: C.gore, top: C.bone }, new Vec2(0.5, 0.6)),

    // Left & right severed shoulder socket gore & protruding humerus bone splinters
    taperPrism(new Vec3(3.4, 3.6, 3.4), new Vec3(2.4, 3.6, 2.4), new Vec3(lx + 0.8, ly - 0.4, lz), { front: C.gore, back: C.gore, side: C.gore, top: C.gore }),
    taperPrism(new Vec3(1.8, 4.2, 1.8), new Vec3(0.7, 4.2, 0.7), new Vec3(lx - 1.2, ly - 1.2, lz + 0.4), { front: C.bone, back: C.bone, side: C.bone, top: C.gore }, new Vec2(-1.4, 0.5)),
    taperPrism(new Vec3(3.4, 3.6, 3.4), new Vec3(2.4, 3.6, 2.4), new Vec3(rx - 0.8, ry - 0.4, rz), { front: C.gore, back: C.gore, side: C.gore, top: C.gore }),
    taperPrism(new Vec3(1.8, 4.2, 1.8), new Vec3(0.7, 4.2, 0.7), new Vec3(rx + 1.2, ry - 1.2, rz + 0.4), { front: C.bone, back: C.bone, side: C.bone, top: C.gore }, new Vec2(1.4, 0.5)),

    // Exposed thoracic spinal column & ruptured crimson heart/viscera mass
    boxPrism(new Vec3(2.4, 14.5, 2.4), new Vec3(0, hy * 0.55, hz - 0.4), { front: C.bone, back: C.bone, side: C.gore, top: C.bone }),
    taperPrism(new Vec3(7.8, 9.5, 6.2), new Vec3(5.6, 9.5, 4.8), new Vec3(0, hy * 0.52, hz + 2.6), { front: C.gore, back: C.gore, side: C.gore, top: C.gore, bottom: C.gore }),

    // Hanging entrails & ruptured abdominal coils spilling forward
    taperPrism(new Vec3(5.4, 6.8, 4.6), new Vec3(3.2, 6.8, 3.2), new Vec3(-1.4, hy * 0.25, hz + 4.2), { front: C.gore, back: C.gore, side: C.gore, bottom: C.gore }, new Vec2(-0.8, 1.6)),
    taperPrism(new Vec3(4.8, 6.2, 4.2), new Vec3(2.8, 6.2, 2.8), new Vec3(1.8, hy * 0.22, hz + 3.8), { front: C.gore, back: C.bone, side: C.gore, bottom: C.gore }, new Vec2(0.9, 1.4)),
  ];

  // 4 pairs of jagged 3D white rib bones bursting outward from the chest cavity
  for (let i = 0; i < 4; i++) {
    const ribY = hy * (0.32 + i * 0.14);
    const ribW = 3.6 + (i === 1 || i === 2 ? 1.2 : 0);
    for (const side of [-1, 1])
      list.push(
        taperPrism(
          new Vec3(ribW, 1.15, 1.4),
          new Vec3(0.8, 0.9, 0.9),
          new Vec3(side * (ribW * 0.65 + 1.2), ribY, hz + 3.8),
          { front: C.bone, back: C.gore, side: C.bone, top: C.bone, bottom: C.gore },
          new Vec2(side * 1.4, 1.8)
        )
      );
  }

  const geo = mergeGeometries(list);
  visceraCache[type] = geo;
  return geo;
}

/** Returns the articulated 3D part geometries and joint pivots for `type`. */
export function monsterParts(type = 'imp') {
  if (partCache[type])
    return partCache[type];
  let parts;
  switch (type) {
    case 'brute': parts = buildBruteParts(); break;
    case 'boss': parts = buildBossParts(); break;
    case 'skull': parts = buildSkullParts(); break;
    case 'crawler': parts = buildCrawlerParts(); break;
    case 'swarmer': parts = buildSwarmerParts(); break;
    case 'wraith': parts = buildWraithParts(); break;
    default: parts = buildImpParts(); break;
  }
  parts.goreViscera = getGoreVisceraGeometry(type, parts.pivots);
  parts.gorePool = getGorePoolGeometry();
  parts.goreChunks = getGoreChunkGeometries();
  partCache[type] = parts;
  return parts;
}

/** Returns the combined rest-pose 3D geometry `{ vertices, normals, uvs }` for `type`. */
export function monsterMesh(type = 'imp') {
  if (meshCache[type])
    return meshCache[type];
  const parts = monsterParts(type);
  const { pivots } = parts;
  const bodyWorld = pivots.body;
  const headWorld = new Vec3().addVectors(bodyWorld, pivots.head);
  const jawWorld = new Vec3().addVectors(headWorld, pivots.jaw);
  const leftArmWorld = new Vec3().addVectors(bodyWorld, pivots.leftArm);
  const rightArmWorld = new Vec3().addVectors(bodyWorld, pivots.rightArm);
  const extraWorld = new Vec3().addVectors(bodyWorld, pivots.extra);
  const combined = mergeGeometries([
    offsetGeometry(parts.body, bodyWorld),
    offsetGeometry(parts.head, headWorld),
    offsetGeometry(parts.jaw, jawWorld),
    offsetGeometry(parts.leftArm, leftArmWorld),
    offsetGeometry(parts.rightArm, rightArmWorld),
    offsetGeometry(parts.leftLeg, pivots.leftLeg),
    offsetGeometry(parts.rightLeg, pivots.rightLeg),
    offsetGeometry(parts.extra, extraWorld),
  ]);
  meshCache[type] = combined;
  return combined;
}

function toCustomMesh(part) {
  const geo = new CustomMesh();
  geo.vertices = part.vertices;
  geo.normals = part.normals;
  geo.uvs = part.uvs;
  geo.setPrimitive('TRIANGLES');
  return geo;
}

/** Eases `view.pose[key]` towards a target, frame-rate independent: fast when the rate is high. */
function approach(view, key, target, rate, dt) {
  const value = view.pose[key] ?? 0;
  view.pose[key] = value + (target - value) * (1 - Math.exp(-rate * dt));
  return view.pose[key];
}

function approachAngle(view, key, target, rate, dt) {
  const current = view.pose[key] ?? target;
  let diff = (target - current) % Trigo.twopi;
  if (diff > Trigo.pi)
    diff -= Trigo.twopi;
  else if (diff < -Trigo.pi)
    diff += Trigo.twopi;
  const next = current + diff * (1 - Math.exp(-rate * dt));
  view.pose[key] = next;
  return next;
}

/** What a monster is doing, as smooth 0..1 numbers every animation shares. */
function mood(view, enemy, c, windupTime) {
  const idle = enemy.state === 'idle';
  const attack = approach(view, 'attack', enemy.windup > 0 ? 1 - enemy.windup / windupTime : 0, enemy.windup > 0 ? 14 : 24, c.dt);
  const roarTime = enemy.def.roar ?? 0;
  const roar = roarTime && enemy.roar > 0 ? Math.sin(Trigo.pi * (1 - enemy.roar / roarTime)) : 0;
  const pain = approach(view, 'pain', enemy.hurt > 0 || enemy.pain > 0 ? 1 : 0, 26, c.dt);
  const moving = approach(view, 'moving', idle || enemy.windup > 0 || enemy.roar > 0 ? 0 : 1, 9, c.dt);
  const anger = idle ? 0.25 : Math.max(0.7, attack, roar);
  return { idle, attack, roar, pain, moving, anger, swing: Math.sin(enemy.walk) * moving, t: c.time + enemy.phase };
}

function setMonsterGlare(view, glare) {
  if (Math.abs(glare - (view.glare ?? -1)) < 0.005)
    return;
  view.glare = glare;
  for (let i = 0; i < view.meshes.length; i++)
    view.meshes[i].setCustomUniform('glare', glare);
}

/** Swaps all 3D anatomical part meshes between the intact skin atlas and the mangled gore-damaged skin atlas. */
function setMonsterGoreSkin(view, goreActive) {
  if (view.goreSkin === goreActive)
    return;
  view.goreSkin = goreActive;
  const atlas = goreActive ? monsterGoreSkinAtlas(view.type) : monsterSkinAtlas(view.type);
  const texSize = new Vec2(atlas.width, atlas.height);
  for (let i = 0; i < view.meshes.length; i++) {
    const mesh = view.meshes[i];
    mesh.activeAtlas = atlas;
    if (view.gl && typeof mesh.setTexture === 'function')
      mesh.setTexture(atlas.data, {
        size: texSize,
        magFilter: view.gl.NEAREST,
        minFilter: view.gl.NEAREST,
      });
  }
}

function resetLimbTransforms(view) {
  const { pivots } = view.parts;
  view.head.addChild(view.jaw);
  view.body.addChild(view.head);
  view.body.addChild(view.leftArm);
  view.body.addChild(view.rightArm);
  view.body.addChild(view.extra);
  view.body.addChild(view.goreViscera);
  view.root.addChild(view.body);
  view.root.addChild(view.leftLeg);
  view.root.addChild(view.rightLeg);
  setPos(view.body, pivots.body.x, pivots.body.y, pivots.body.z);
  setPos(view.head, pivots.head.x, pivots.head.y, pivots.head.z);
  setPos(view.jaw, pivots.jaw.x, pivots.jaw.y, pivots.jaw.z);
  setPos(view.leftArm, pivots.leftArm.x, pivots.leftArm.y, pivots.leftArm.z);
  setPos(view.rightArm, pivots.rightArm.x, pivots.rightArm.y, pivots.rightArm.z);
  setPos(view.leftLeg, pivots.leftLeg.x, pivots.leftLeg.y, pivots.leftLeg.z);
  setPos(view.rightLeg, pivots.rightLeg.x, pivots.rightLeg.y, pivots.rightLeg.z);
  setPos(view.extra, pivots.extra.x, pivots.extra.y, pivots.extra.z);
  setPos(view.goreViscera, 0, 0, 0);
  setRot(view.goreViscera, 0, 0, 0);
  for (let i = 0; i < view.meshes.length; i++)
    setUniformScale(view.meshes[i], 1);
  for (let i = 0; i < view.goreChunks.length; i++)
    view.goreChunks[i].setInactive();
  view.goreViscera.setInactive();
  view.gorePool.setInactive();
  setMonsterGoreSkin(view, false);
}

function buildMonster(w, enemy) {
  const type = enemy.type;
  const cfg = CONFIGS[type];
  const atlas = monsterSkinAtlas(type);
  const parts = monsterParts(type);
  const material = w.material('orange');

  const makePart = (geo, pivot) => {
    const mesh = w.monsterPartMesh(toCustomMesh(geo), atlas, material);
    mesh.activeAtlas = atlas;
    if (pivot)
      setPos(mesh, pivot.x, pivot.y, pivot.z);
    return mesh;
  };

  // Root is an empty transform group that rotates by yaw in world space
  const root = new Mesh(w.gl, new CustomMesh());
  const body = makePart(parts.body, parts.pivots.body);
  const head = makePart(parts.head, parts.pivots.head);
  const jaw = makePart(parts.jaw, parts.pivots.jaw);
  const leftArm = makePart(parts.leftArm, parts.pivots.leftArm);
  const rightArm = makePart(parts.rightArm, parts.pivots.rightArm);
  const leftLeg = makePart(parts.leftLeg, parts.pivots.leftLeg);
  const rightLeg = makePart(parts.rightLeg, parts.pivots.rightLeg);
  const extra = makePart(parts.extra, parts.pivots.extra);
  const goreViscera = makePart(parts.goreViscera, new Vec3(0, 0, 0));
  goreViscera.setInactive();
  const gorePool = makePart(parts.gorePool, new Vec3(0, 0.2, 0));
  gorePool.setInactive();
  const goreChunks = [];
  for (let i = 0; i < 6; i++) {
    const chunk = makePart(parts.goreChunks[i % parts.goreChunks.length], new Vec3(0, 0, 0));
    chunk.setInactive();
    root.addChild(chunk);
    goreChunks.push(chunk);
  }

  head.addChild(jaw);
  body.addChild(head);
  body.addChild(leftArm);
  body.addChild(rightArm);
  body.addChild(extra);
  body.addChild(goreViscera);
  root.addChild(body);
  root.addChild(leftLeg);
  root.addChild(rightLeg);
  root.addChild(gorePool);
  setScale(root, cfg.scale, cfg.scale, cfg.scale);

  const meshes = [body, head, jaw, leftArm, rightArm, leftLeg, rightLeg, extra, goreViscera, gorePool, ...goreChunks];
  w.scene.addMesh(root);

  return {
    gl: w.gl,
    material,
    scale: cfg.scale,
    baseLift: cfg.baseLift,
    root,
    body,
    head,
    jaw,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    extra,
    goreViscera,
    gorePool,
    goreChunks,
    meshes,
    parts,
    pose: { seed: enemy.phase * 7, yaw: enemy.phase * Trigo.twopi },
    lift: cfg.baseLift,
    sx: 1,
    sy: 1,
    sz: 1,
    yaw: enemy.phase * Trigo.twopi,
    pitch: 0,
    roll: 0,
    wasDead: false,
    goreSkin: false,
    dismemberMode: -1,
    type,
  };
}

function animateMonster(view, enemy, c) {
  if (view.wasDead) {
    view.wasDead = false;
    resetLimbTransforms(view);
  }
  const type = enemy.type;
  const cfg = CONFIGS[type];
  const { pivots } = view.parts;
  const m = mood(view, enemy, c, cfg.windup);
  const leaping = enemy.leap > 0;
  const limbs = enemy.limbs;
  const leftArmOk = limbs ? limbs.leftArm !== false : true;
  const rightArmOk = limbs ? limbs.rightArm !== false : true;
  const leftLegOk = limbs ? limbs.leftLeg !== false : true;
  const rightLegOk = limbs ? limbs.rightLeg !== false : true;
  const hasMissingLimb = !leftArmOk || !rightArmOk || !leftLegOk || !rightLegOk;
  const crawling = Boolean(enemy.crawling && !cfg.floatAmp);

  // Heavily wounded (< 50% HP) or dismembered monsters switch to their mangled gore-damaged skin and expose internal viscera
  const bloodied = hasMissingLimb || (enemy.hp !== undefined && enemy.def?.hp !== undefined && enemy.hp <= enemy.def.hp * 0.5);
  setMonsterGoreSkin(view, bloodied);
  if (bloodied && type !== 'wraith')
    view.goreViscera.setActive();
  else
    view.goreViscera.setInactive();

  // Check if an arm or leg was just severed/exploded so 3D meat/bone chunks burst outward from the shoulder or hip socket
  const leftArmAge = !leftArmOk && limbs?.severedAt?.leftArm >= 0 ? c.time - limbs.severedAt.leftArm : 99;
  const rightArmAge = !rightArmOk && limbs?.severedAt?.rightArm >= 0 ? c.time - limbs.severedAt.rightArm : 99;
  const leftLegAge = !leftLegOk && limbs?.severedAt?.leftLeg >= 0 ? c.time - limbs.severedAt.leftLeg : 99;
  const rightLegAge = !rightLegOk && limbs?.severedAt?.rightLeg >= 0 ? c.time - limbs.severedAt.rightLeg : 99;
  const armBlastAge = Math.min(leftArmAge, rightArmAge);
  const legBlastAge = Math.min(leftLegAge, rightLegAge);
  const limbBlastAge = Math.min(armBlastAge, legBlastAge);
  const limbBlast = limbBlastAge >= 0 && limbBlastAge < 0.45 && type !== 'wraith';
  const isArmBlast = armBlastAge <= legBlastAge;
  const limbBlastSide = (isArmBlast ? leftArmAge <= rightArmAge : leftLegAge <= rightLegAge) ? -1 : 1;
  const socketBaseY = isArmBlast ? pivots.body.y + pivots.leftArm.y : pivots.leftLeg.y * 0.6;

  // During hit-pain convulsions or arm/leg dismemberment bursts, 3D meat/bone chunks erupt outward
  const painBurst = m.pain > 0.15 && type !== 'wraith';
  for (let i = 0; i < view.goreChunks.length; i++) {
    const chunk = view.goreChunks[i];
    if (limbBlast && i < 2) {
      chunk.setActive();
      const bt = limbBlastAge / 0.45;
      const ang = (i === 0 ? 0.35 : -0.45) + limbBlastSide * 1.2 + view.pose.seed;
      const dist = bt * 12.5 + 1.8;
      const arcY = socketBaseY * (1 - bt * 0.65) + Math.sin(bt * Trigo.pi) * 7.5 * (1 - bt * 0.4);
      setPos(chunk, limbBlastSide * 2.5 + Math.cos(ang) * dist, Math.max(1.2, arcY), Math.sin(ang) * dist);
      setRot(chunk, bt * 5.2, ang, bt * 4.1);
      setUniformScale(chunk, 1.05 + (i % 2) * 0.25);
    } else if (painBurst && i < 1) {
      chunk.setActive();
      const ang = i * 2.1 + view.pose.seed;
      const dist = (1 - m.pain) * 9.5 + 2.5;
      setPos(chunk, Math.cos(ang) * dist, pivots.body.y + 4 + Math.sin(m.pain * Trigo.pi) * 5 - (1 - m.pain) * 4, Math.sin(ang) * dist);
      setRot(chunk, (1 - m.pain) * 4.2, ang, (1 - m.pain) * 3.1);
      setUniformScale(chunk, 0.95 + 0.35 * m.pain);
    } else
      chunk.setInactive();
  }

  // Vertical lift / bobbing / stomping / crawling drag
  if (cfg.floatAmp)
    view.lift = cfg.baseLift + Math.sin(m.t * 2.1) * cfg.floatAmp + Math.sin(m.t * 0.7) * 1.5;
  else if (crawling)
    view.lift = Math.abs(Math.sin(enemy.walk * 1.6)) * m.moving * 0.45;
  else if (leaping)
    view.lift = 7.5;
  else if (cfg.stomp)
    view.lift = Math.abs(Math.sin(enemy.walk)) * m.moving * cfg.stomp;
  else
    view.lift = Math.abs(Math.sin(enemy.walk * 2)) * m.moving * 0.9;

  const breath = Math.sin(m.t * 2.4);
  view.sx = 1 + breath * 0.018 + (leaping ? 0.1 : 0) + m.roar * 0.06;
  view.sy = 1 + Math.sin(m.t * 2.4 + 1) * 0.022 + m.roar * 0.07 - (leaping ? 0.06 : 0);
  view.sz = 1 + breath * 0.018 + (leaping ? 0.12 : 0) + m.roar * 0.05;

  // World-space facing yaw: face movement vector when prowling, or lock onto the player when attacking/chasing
  let targetYaw = view.pose.yaw ?? 0;
  const vel = enemy.body?.velocity;
  const speedSq = vel ? vel.x * vel.x + vel.y * vel.y : 0;
  if (leaping && enemy.leapDir)
    targetYaw = Math.atan2(enemy.leapDir.x, enemy.leapDir.y);
  else if (c.player?.pos && (enemy.windup > 0 || enemy.roar > 0 || enemy.los || speedSq < 25)) {
    const dx = c.player.pos.x - enemy.pos.x;
    const dz = c.player.pos.y - enemy.pos.y;
    if (dx * dx + dz * dz > 1)
      targetYaw = Math.atan2(dx, dz);
  } else if (vel && speedSq >= 25)
    targetYaw = Math.atan2(vel.x, vel.y);
  view.yaw = approachAngle(view, 'yaw', targetYaw, m.idle ? 4 : 11, c.dt);
  view.pitch = 0;
  view.roll = 0;

  // Articulated 3D joint rotations
  const stride = Math.sin(enemy.walk * cfg.walkRate);
  const counterStride = Math.cos(enemy.walk * cfg.walkRate);
  const idleSway = Math.sin(m.t * cfg.idleRate);
  const jawOpen = Math.min(1, m.attack * 0.95 + m.roar * 1.1 + m.pain * 0.65 + (leaping ? 0.85 : 0) + Math.max(0, breath) * 0.15);

  const crawlBodyY = Math.max(3.2, pivots.body.y * 0.32);
  if (crawling) {
    // Collapsed onto the deck: torso pitched forward, hauling itself along with a side-to-side lurch
    const bodyPitch = 1.05 + m.attack * 0.18 - m.pain * 0.2 + Math.abs(stride) * m.moving * 0.12;
    const bodyYaw = stride * m.moving * 0.24 + idleSway * (1 - m.moving) * 0.05;
    const bodyRoll = stride * m.moving * 0.22 + m.pain * Math.sin(c.time * 45) * 0.12;
    setPos(view.body, stride * m.moving * 0.85, crawlBodyY, 0);
    setRot(view.body, bodyPitch, bodyYaw, bodyRoll);

    const headPitch = -0.78 + m.attack * 0.22 - m.roar * 0.2 - m.pain * 0.18;
    const headYaw = -bodyYaw * 0.65 + Math.sin(m.t * 1.7) * 0.08;
    const headRoll = m.pain * 0.18 - bodyRoll * 0.45;
    setRot(view.head, headPitch, headYaw, headRoll);
  } else {
    setPos(view.body, pivots.body.x, pivots.body.y, pivots.body.z);
    const bodyPitch = m.attack * 0.24 + (leaping ? 0.32 : 0) - m.roar * 0.22 - m.pain * 0.28 + m.moving * 0.08;
    const bodyRoll = stride * m.moving * 0.07 + m.pain * Math.sin(c.time * 45) * 0.12;
    const bodyYaw = stride * m.moving * 0.08 + idleSway * (1 - m.moving) * 0.05;
    setRot(view.body, bodyPitch, bodyYaw, bodyRoll);

    // Head tracks slightly counter to torso twist and tilts back on roar/pain
    const headPitch = -bodyPitch * 0.45 - m.roar * 0.25 - m.pain * 0.2 + m.attack * 0.15;
    const headYaw = -bodyYaw * 0.6 + Math.sin(m.t * 1.7) * (m.idle ? 0.18 : 0.06);
    const headRoll = m.pain * 0.18 - bodyRoll * 0.5;
    setRot(view.head, headPitch, headYaw, headRoll);
  }

  // Unhinging lower jaw / mandibles
  setRot(view.jaw, jawOpen * 0.58, 0, 0);

  if (crawling) {
    // Claw-dragging gait on the floor using remaining arm(s) while trailing any remaining leg behind
    const pullL = Math.sin(enemy.walk * cfg.walkRate * 1.15) * m.moving;
    const pullR = rightArmOk && leftArmOk ? -pullL : pullL;
    setRot(view.leftArm, -1.25 + pullL * 0.65 - m.attack * 0.45, 0.18, -0.22);
    setRot(view.rightArm, -1.25 + pullR * 0.65 - m.attack * 0.45, -0.18, 0.22);
    setRot(view.leftLeg, 1.22 + stride * m.moving * 0.25, -0.12, -0.15);
    setRot(view.rightLeg, 1.22 - stride * m.moving * 0.25, 0.12, 0.15);
    setRot(view.extra, -0.25 + counterStride * m.moving * 0.18, Math.sin(m.t * 3.8) * 0.25, 0);
  } else if (type === 'crawler') {
    // 6-legged alternating tripod skitter + raised front scythes on lunge
    const skitter = Math.sin(enemy.walk * 2.2) * m.moving;
    const lungeLift = Math.max(m.attack, leaping ? 1 : 0);
    setRot(view.leftArm, -lungeLift * 0.55 + skitter * 0.28, skitter * 0.32, lungeLift * 0.25);
    setRot(view.rightArm, -lungeLift * 0.55 - skitter * 0.28, -skitter * 0.32, -lungeLift * 0.25);
    setRot(view.leftLeg, -skitter * 0.32, -skitter * 0.35, 0);
    setRot(view.rightLeg, skitter * 0.32, skitter * 0.35, 0);
    setRot(view.extra, Math.sin(m.t * 4) * 0.12 + lungeLift * 0.25, skitter * 0.2, 0);
  } else if (type === 'swarmer') {
    // Quadruped feral pack bound + snapping shark-maw + whipping tail
    const bound = Math.sin(enemy.walk * 2.0) * m.moving;
    const bite = Math.max(m.attack, m.roar);
    setRot(view.leftArm, bound * 0.65 - bite * 0.55, 0, 0);
    setRot(view.rightArm, -bound * 0.65 - bite * 0.55, 0, 0);
    setRot(view.leftLeg, -bound * 0.65, 0, 0);
    setRot(view.rightLeg, bound * 0.65, 0, 0);
    setRot(view.extra, 0.2 + Math.sin(m.t * 5.5) * 0.22, Math.cos(m.t * 6.5) * 0.38, 0);
  } else if (type === 'skull') {
    // Floating skull: chattering jaw, swaying scalp tendrils, and sinuous dangling spine
    const sway = Math.sin(m.t * 3.2);
    const wave = Math.cos(m.t * 2.6);
    setRot(view.leftArm, sway * 0.22, 0, -0.15 - Math.abs(sway) * 0.18);
    setRot(view.rightArm, -sway * 0.22, 0, 0.15 + Math.abs(sway) * 0.18);
    setRot(view.leftLeg, 0.15 + wave * 0.28, 0, sway * 0.25);
    setRot(view.rightLeg, 0.25 - sway * 0.32, 0, wave * 0.32);
    setRot(view.extra, -0.18 + sway * 0.25, wave * 0.2, 0);
  } else if (type === 'wraith') {
    // Drifting spectral horror: outstretched raking corpse claws & billowing shroud tatters
    const rake = Math.max(m.attack, m.roar * 0.8);
    const drift = Math.sin(m.t * 2.4);
    setRot(view.leftArm, -0.45 - rake * 0.85 + drift * 0.12, 0.15 - rake * 0.25, -0.12 - rake * 0.2);
    setRot(view.rightArm, -0.45 - rake * 0.85 - drift * 0.12, -0.15 + rake * 0.25, 0.12 + rake * 0.2);
    setRot(view.leftLeg, drift * 0.22 + m.moving * 0.25, 0, -0.06);
    setRot(view.rightLeg, -drift * 0.22 + m.moving * 0.25, 0, 0.06);
    setRot(view.extra, 0.2 + Math.abs(drift) * 0.18, drift * 0.15, 0);
  } else {
    // Biped horrors (imp, brute, boss): swinging arms & digitigrade/pillar legs, overhead slam / fireball windup
    const armReach = m.attack * 1.25 + m.roar * 0.95;
    const armSpread = (type === 'boss' ? m.attack * 0.35 : 0) + m.roar * 0.4;
    const armSwing = stride * m.moving * 0.52 + idleSway * 0.08;
    setRot(view.leftArm, -armReach + armSwing - m.pain * 0.45, armSpread * 0.4, -0.08 - armSpread);
    setRot(view.rightArm, -armReach - armSwing - m.pain * 0.45, -armSpread * 0.4, 0.08 + armSpread);
    setRot(view.leftLeg, -stride * m.moving * 0.62, 0, 0);
    setRot(view.rightLeg, stride * m.moving * 0.62, 0, 0);
    setRot(view.extra, 0.14 + counterStride * m.moving * 0.18, Math.sin(m.t * 3.8 + enemy.walk) * 0.35, 0);
  }

  // Apply localized arm dismemberment: falling 3D arm over 0.55s, then a ragged bloody shoulder stump
  const activeBodyY = crawling ? crawlBodyY : pivots.body.y;
  if (!leftArmOk) {
    const severAge = limbs?.severedAt?.leftArm >= 0 ? Math.max(0, c.time - limbs.severedAt.leftArm) : 99;
    if (severAge < 0.55) {
      setScale(view.leftArm, 1, 1, 1);
      scratchStart.setScalar(pivots.leftArm.x, activeBodyY + pivots.leftArm.y, pivots.leftArm.z);
      scratchEnd.setScalar(pivots.leftArm.x - 5.5, 1.4, pivots.leftArm.z + 2.5);
      scratchSpin.setScalar(1.8, -1.4, -1.55);
      launchSeveredPart(view, view.leftArm, scratchStart, scratchEnd, scratchSpin, severAge / 0.55, 4.5);
    } else {
      view.body.addChild(view.leftArm);
      setPos(view.leftArm, pivots.leftArm.x, pivots.leftArm.y, pivots.leftArm.z);
      setScale(view.leftArm, 0.24, 0.18, 0.24);
    }
  } else {
    view.body.addChild(view.leftArm);
    setPos(view.leftArm, pivots.leftArm.x, pivots.leftArm.y, pivots.leftArm.z);
    setScale(view.leftArm, 1, 1, 1);
  }

  if (!rightArmOk) {
    const severAge = limbs?.severedAt?.rightArm >= 0 ? Math.max(0, c.time - limbs.severedAt.rightArm) : 99;
    if (severAge < 0.55) {
      setScale(view.rightArm, 1, 1, 1);
      scratchStart.setScalar(pivots.rightArm.x, activeBodyY + pivots.rightArm.y, pivots.rightArm.z);
      scratchEnd.setScalar(pivots.rightArm.x + 5.5, 1.4, pivots.rightArm.z + 2.5);
      scratchSpin.setScalar(1.8, 1.4, 1.55);
      launchSeveredPart(view, view.rightArm, scratchStart, scratchEnd, scratchSpin, severAge / 0.55, 4.5);
    } else {
      view.body.addChild(view.rightArm);
      setPos(view.rightArm, pivots.rightArm.x, pivots.rightArm.y, pivots.rightArm.z);
      setScale(view.rightArm, 0.24, 0.18, 0.24);
    }
  } else {
    view.body.addChild(view.rightArm);
    setPos(view.rightArm, pivots.rightArm.x, pivots.rightArm.y, pivots.rightArm.z);
    setScale(view.rightArm, 1, 1, 1);
  }

  // Apply localized leg explosion stumps and crawling hip positions
  const legY = crawling ? crawlBodyY * 0.65 : pivots.leftLeg.y;
  const legZ = crawling ? pivots.leftLeg.z - 2.5 : pivots.leftLeg.z;
  setPos(view.leftLeg, pivots.leftLeg.x, legY, legZ);
  setPos(view.rightLeg, pivots.rightLeg.x, crawling ? crawlBodyY * 0.65 : pivots.rightLeg.y, crawling ? pivots.rightLeg.z - 2.5 : pivots.rightLeg.z);
  if (!leftLegOk)
    setScale(view.leftLeg, 0.28, 0.18, 0.28);
  else
    setScale(view.leftLeg, 1, 1, 1);
  if (!rightLegOk)
    setScale(view.rightLeg, 0.28, 0.18, 0.28);
  else
    setScale(view.rightLeg, 1, 1, 1);

  const glare = Math.min(1, 0.3 + 0.7 * m.anger * (1 + 0.18 * Math.sin(c.time * 31 + view.pose.seed)));
  setMonsterGlare(view, glare);
}

const scratchStart = new Vec3();
const scratchEnd = new Vec3();
const scratchSpin = new Vec3();

/**
 * Reparents `part` directly to `view.root` and animates a ballistic trajectory from `startPos` to `endPos`
 * with parabolic gravity arc (`peakLift`) and two realistic floor bounces over normalized time `t` (0..1).
 */
function launchSeveredPart(view, part, startPos, endPos, spinTarget, t, peakLift) {
  view.root.addChild(part);
  const out = 1 - (1 - t) * (1 - t);
  const x = Utils.lerp(startPos.x, endPos.x, out);
  const z = Utils.lerp(startPos.z, endPos.z, out);
  let y;
  if (t < 0.62) {
    const u = t / 0.62;
    y = Utils.lerp(startPos.y, endPos.y, u * u) + Math.sin(u * Trigo.pi) * peakLift;
  } else if (t < 0.86) {
    const u = (t - 0.62) / 0.24;
    y = endPos.y + Math.sin(u * Trigo.pi) * (peakLift * 0.28);
  } else {
    const u = (t - 0.86) / 0.14;
    y = endPos.y + Math.sin(u * Trigo.pi) * (peakLift * 0.09);
  }
  setPos(part, x, y, z);
  setRot(part, spinTarget.x * out, spinTarget.y * out, spinTarget.z * out);
}

function dieMonster(view, enemy) {
  view.wasDead = true;
  const burst = Boolean(enemy.gibbed);
  const duration = burst ? BURST_DURATION : DEATH_DURATION;
  const t = Math.min(1, enemy.deadTime / duration);
  const ease = 1 - (1 - t) * (1 - t);
  const goreFactor = Math.sqrt(enemy.def?.gore ?? 1);
  const dissolve = enemy.inSlime
    ? Math.max(0, 1 - Math.max(0, (enemy.deadTime - 0.5) / (1.8 * goreFactor)))
    : 1;
  const s = view.scale * dissolve;

  // Switch to the mangled gore-damaged 3D skin and extinguish eye glare after the fatal flash
  setMonsterGoreSkin(view, true);
  setMonsterGlare(view, t < 0.18 ? 0.85 : 0.01);
  // Floor blood pools are generated organically by RoostR blood particle fountains rather than a growing floor mesh
  view.gorePool.setInactive();

  if (dissolve <= 0.02) {
    view.goreViscera.setInactive();
    setScale(view.root, 0.001, 0.001, 0.001);
    return;
  }

  setPos(view.root, enemy.pos.x, -(1 - dissolve) * 6, enemy.pos.y);
  setRot(view.root, 0, view.yaw, 0);
  setScale(view.root, s, s, s);

  if (enemy.type === 'wraith' && !burst) {
    view.goreViscera.setInactive();
    for (let i = 0; i < view.goreChunks.length; i++)
      view.goreChunks[i].setInactive();
    // Ghostly collapse: shroud folds down into the floor and flattens
    const collapseY = Math.max(0.08, 1 - ease * 0.9);
    const spread = 1 + ease * 0.45;
    setPos(view.body, 0, view.parts.pivots.body.y * collapseY, 0);
    setScale(view.body, spread, collapseY, spread);
    setRot(view.body, ease * 0.35, ease * 0.8, 0);
    setScale(view.leftLeg, spread, collapseY, spread);
    setScale(view.rightLeg, spread, collapseY, spread);
    return;
  }

  // Expose internal 3D ribcage, cervical spine stump, and ruptured entrails
  view.goreViscera.setActive();
  const { pivots } = view.parts;
  const baseBodyY = (enemy.crawling ? Math.max(3.2, pivots.body.y * 0.32) : pivots.body.y) + view.baseLift * 0.45;
  const fallDir = (view.pose.seed % 2 > 1) ? 1 : -1;
  const limbs = enemy.limbs;
  const leftArmAlreadyGone = limbs?.leftArm === false;
  const rightArmAlreadyGone = limbs?.rightArm === false;
  const leftLegAlreadyGone = limbs?.leftLeg === false;
  const rightLegAlreadyGone = limbs?.rightLeg === false;

  if (!burst) {
    // Pick a deterministic gruesome dismemberment mode from the monster's seed:
    // 0: Decapitation (head + jaw blasted off neck, leaving bloody cervical spine stump)
    // 1: Left arm & lower jaw blown off
    // 2: Right arm blown off at shoulder socket
    // 3: Both head and left arm blown off in opposite arcs
    const mode = Math.floor(Math.abs(view.pose.seed * 13.37)) % 4;
    view.dismemberMode = mode;

    // Multi-stage horrific death choreography:
    // Stage 1 (0..0.28): Violent hit-shock convulsion, chest arches, shoulders heave
    // Stage 2 (0.28..0.72): Knees buckle, hips drop, torso twists toward the deck
    // Stage 3 (0.72..1.0 + post-mortem < 1.85s): Heavy floor slam + decaying nerve twitches
    const shock = t < 0.28 ? Math.sin((t / 0.28) * Trigo.pi) : 0;
    const collapseT = Utils.clamp((t - 0.16) / 0.84, 0, 1);
    const collapseEase = 1 - (1 - collapseT) * (1 - collapseT);
    const slamBounce = t > 0.72 ? Math.sin(((t - 0.72) / 0.28) * Trigo.pi) * 1.6 : 0;
    const twitch = enemy.deadTime < 1.85
      ? Math.exp(-Math.max(0, enemy.deadTime - 0.35) * 2.3) * Math.sin(enemy.deadTime * 44 + view.pose.seed)
      : 0;

    const hipY = baseBodyY * (1 - collapseEase * 0.84) + 2.4 * collapseEase + shock * 2.2 + slamBounce;
    const bodyPitch = shock * 0.38 - collapseEase * Trigo.pi * 0.47 + twitch * 0.08;
    const bodyYaw = fallDir * (shock * -0.25 + collapseEase * 0.32);
    const bodyRoll = fallDir * (collapseEase * 0.28 + twitch * 0.1);
    setPos(view.body, fallDir * collapseEase * 1.8, hipY, -collapseEase * 5.2 + shock * 1.4);
    setScale(view.body, 1 + shock * 0.14, 1 - shock * 0.08, 1 + shock * 0.14);
    setRot(view.body, bodyPitch, bodyYaw, bodyRoll);
    setScale(view.goreViscera, 1.08 + collapseEase * 0.18, 1.08 + collapseEase * 0.15, 1.12 + collapseEase * 0.22);

    // Decapitation or head trauma
    if (mode === 0 || mode === 3) {
      view.head.addChild(view.jaw);
      setPos(view.jaw, pivots.jaw.x, pivots.jaw.y, pivots.jaw.z);
      setRot(view.jaw, 0.75, 0, 0);
      scratchStart.setScalar(pivots.head.x, baseBodyY + pivots.head.y, pivots.head.z);
      scratchEnd.setScalar(fallDir * 9.5, 2.6, 11.5);
      scratchSpin.setScalar(2.6, fallDir * 3.1, fallDir * 1.9);
      launchSeveredPart(view, view.head, scratchStart, scratchEnd, scratchSpin, t, 14.5);
    } else {
      view.body.addChild(view.head);
      setPos(view.head, pivots.head.x, pivots.head.y, pivots.head.z);
      setRot(view.head, -shock * 0.65 - collapseEase * 0.42 + twitch * 0.18, fallDir * collapseEase * 0.48, fallDir * collapseEase * 0.32);
    }

    // Jaw unhinged or blown free
    if (mode === 1) {
      scratchStart.setScalar(pivots.jaw.x, baseBodyY + pivots.head.y + pivots.jaw.y, pivots.jaw.z + 1.5);
      scratchEnd.setScalar(-fallDir * 7.5, 1.4, 9.2);
      scratchSpin.setScalar(3.2, -fallDir * 2.4, 1.8);
      launchSeveredPart(view, view.jaw, scratchStart, scratchEnd, scratchSpin, t, 11.0);
    } else if (mode !== 0 && mode !== 3) {
      view.head.addChild(view.jaw);
      setPos(view.jaw, pivots.jaw.x, pivots.jaw.y, pivots.jaw.z);
      setRot(view.jaw, 0.82 * ease + Math.abs(twitch) * 0.25, 0, 0);
    }

    // Left arm severed or convulsing (or already a stump from combat dismemberment)
    if (leftArmAlreadyGone) {
      view.body.addChild(view.leftArm);
      setPos(view.leftArm, pivots.leftArm.x, pivots.leftArm.y, pivots.leftArm.z);
      setScale(view.leftArm, 0.24, 0.18, 0.24);
    } else if (mode === 1 || mode === 3) {
      setScale(view.leftArm, 1, 1, 1);
      scratchStart.setScalar(pivots.leftArm.x, baseBodyY + pivots.leftArm.y, pivots.leftArm.z);
      scratchEnd.setScalar(-12.5, 1.8, 6.5 * fallDir);
      scratchSpin.setScalar(2.2, -2.6, -1.7);
      launchSeveredPart(view, view.leftArm, scratchStart, scratchEnd, scratchSpin, t, 13.0);
    } else {
      view.body.addChild(view.leftArm);
      setScale(view.leftArm, 1, 1, 1);
      setPos(view.leftArm, pivots.leftArm.x, pivots.leftArm.y, pivots.leftArm.z);
      setRot(view.leftArm, -shock * 0.9 - collapseEase * 1.25 + twitch * 0.35, -collapseEase * 0.35, -0.35 - collapseEase * 0.65);
    }

    // Right arm severed or convulsing (or already a stump from combat dismemberment)
    if (rightArmAlreadyGone) {
      view.body.addChild(view.rightArm);
      setPos(view.rightArm, pivots.rightArm.x, pivots.rightArm.y, pivots.rightArm.z);
      setScale(view.rightArm, 0.24, 0.18, 0.24);
    } else if (mode === 2) {
      setScale(view.rightArm, 1, 1, 1);
      scratchStart.setScalar(pivots.rightArm.x, baseBodyY + pivots.rightArm.y, pivots.rightArm.z);
      scratchEnd.setScalar(12.8, 1.8, -5.8 * fallDir);
      scratchSpin.setScalar(-2.4, 2.8, 1.8);
      launchSeveredPart(view, view.rightArm, scratchStart, scratchEnd, scratchSpin, t, 13.5);
    } else {
      view.body.addChild(view.rightArm);
      setScale(view.rightArm, 1, 1, 1);
      setPos(view.rightArm, pivots.rightArm.x, pivots.rightArm.y, pivots.rightArm.z);
      setRot(view.rightArm, -shock * 0.85 - collapseEase * 1.15 - twitch * 0.35, collapseEase * 0.35, 0.35 + collapseEase * 0.65);
    }

    // Buckling & twitching legs (keeping exploded legs as stumps)
    view.root.addChild(view.leftLeg);
    view.root.addChild(view.rightLeg);
    setPos(view.leftLeg, pivots.leftLeg.x - collapseEase * 1.2, hipY, collapseEase * 1.5);
    setPos(view.rightLeg, pivots.rightLeg.x + collapseEase * 1.2, hipY, -collapseEase * 1.2);
    setRot(view.leftLeg, collapseEase * 1.32 - shock * 0.35 + twitch * 0.42, -collapseEase * 0.25, -collapseEase * 0.38);
    setRot(view.rightLeg, collapseEase * 1.18 + shock * 0.25 - twitch * 0.38, collapseEase * 0.25, collapseEase * 0.42);
    if (leftLegAlreadyGone)
      setScale(view.leftLeg, 0.28, 0.18, 0.28);
    else
      setScale(view.leftLeg, 1, 1, 1);
    if (rightLegAlreadyGone)
      setScale(view.rightLeg, 0.28, 0.18, 0.28);
    else
      setScale(view.rightLeg, 1, 1, 1);

    for (let i = 0; i < view.goreChunks.length; i++) {
      const chunk = view.goreChunks[i];
      if (i < 1) {
        chunk.setActive();
        const ang = i * 2.094 + view.pose.seed;
        const radius = 12.0 + (i % 2) * 5.5;
        scratchStart.setScalar(Math.cos(ang) * 2.0, baseBodyY + 5 + (i % 2) * 3, Math.sin(ang) * 2.0);
        scratchEnd.setScalar(Math.cos(ang) * radius, 1.4, Math.sin(ang) * radius);
        scratchSpin.setScalar(3.4 * (i % 2 ? 1 : -1), ang * 1.5, 2.8);
        launchSeveredPart(view, chunk, scratchStart, scratchEnd, scratchSpin, t, 15.0 + i * 2.5);
        setUniformScale(chunk, 1.05 + (i % 2) * 0.25);
      } else
        chunk.setInactive();
    }
    return;
  }

  // Close-range / overkill XDeath gib detonation:
  // Every limb, skull, and mandible detaches into root space and blasts outward in a high parabolic arc with floor bounces
  // while the shattered ribcage & spine carcass (body + goreViscera) erupts in the center.
  view.dismemberMode = 4;
  scratchStart.setScalar(0, baseBodyY, 0);
  scratchEnd.setScalar(0, 2.4, -2.5);
  scratchSpin.setScalar(-1.55, 2.4, 0.95);
  launchSeveredPart(view, view.body, scratchStart, scratchEnd, scratchSpin, t, 11.5);
  setScale(view.body, 0.92, 0.72, 0.92);
  setScale(view.goreViscera, 1.35, 1.35, 1.35);

  // 1. Severed head flying forward-right
  scratchStart.setScalar(pivots.head.x, baseBodyY + pivots.head.y, pivots.head.z);
  scratchEnd.setScalar(7.5, 2.6, 16.5);
  scratchSpin.setScalar(3.4, 2.8, 2.1);
  launchSeveredPart(view, view.head, scratchStart, scratchEnd, scratchSpin, t, 21.0);

  // 2. Torn-off lower jaw flying forward-left
  scratchStart.setScalar(pivots.jaw.x, baseBodyY + pivots.head.y + pivots.jaw.y, pivots.jaw.z);
  scratchEnd.setScalar(-9.5, 1.4, 14.0);
  scratchSpin.setScalar(4.1, -3.2, 2.5);
  launchSeveredPart(view, view.jaw, scratchStart, scratchEnd, scratchSpin, t, 17.5);

  // 3. Left arm blasted wide left
  scratchStart.setScalar(pivots.leftArm.x, baseBodyY + pivots.leftArm.y, pivots.leftArm.z);
  scratchEnd.setScalar(-18.5, 1.8, 7.5);
  scratchSpin.setScalar(2.9, -2.5, -2.2);
  launchSeveredPart(view, view.leftArm, scratchStart, scratchEnd, scratchSpin, t, 18.5);

  // 4. Right arm blasted wide right
  scratchStart.setScalar(pivots.rightArm.x, baseBodyY + pivots.rightArm.y, pivots.rightArm.z);
  scratchEnd.setScalar(18.5, 1.8, -6.5);
  scratchSpin.setScalar(-2.8, 2.7, 2.3);
  launchSeveredPart(view, view.rightArm, scratchStart, scratchEnd, scratchSpin, t, 19.5);

  // 5. Left leg blown backward-left
  scratchStart.setScalar(pivots.leftLeg.x, pivots.leftLeg.y + 4, pivots.leftLeg.z);
  scratchEnd.setScalar(-13.5, 2.1, -14.0);
  scratchSpin.setScalar(2.4, -2.1, -1.8);
  launchSeveredPart(view, view.leftLeg, scratchStart, scratchEnd, scratchSpin, t, 14.5);

  // 6. Right leg blown backward-right
  scratchStart.setScalar(pivots.rightLeg.x, pivots.rightLeg.y + 4, pivots.rightLeg.z);
  scratchEnd.setScalar(14.0, 2.1, 11.5);
  scratchSpin.setScalar(-2.5, 2.2, 1.9);
  launchSeveredPart(view, view.rightLeg, scratchStart, scratchEnd, scratchSpin, t, 15.0);

  // 7. Dorsal spikes / tail / carapace blown backward
  scratchStart.setScalar(pivots.extra.x, baseBodyY + pivots.extra.y, pivots.extra.z);
  scratchEnd.setScalar(3.5, 1.6, -17.5);
  scratchSpin.setScalar(-3.1, -2.4, 2.0);
  launchSeveredPart(view, view.extra, scratchStart, scratchEnd, scratchSpin, t, 16.5);

  // 8. 3D meat organs & rib shards flying outward in a radial ring (2 on initial gib, +2 on each of the 2 post-gib shots)
  const activeChunks = 2 + Math.min(2, enemy.postGibHits ?? 0) * 2;
  for (let i = 0; i < view.goreChunks.length; i++) {
    const chunk = view.goreChunks[i];
    if (i < activeChunks) {
      chunk.setActive();
      const startTime = i < 2 ? 0 : i < 4 ? (enemy.postGibTime1 ?? 0) : (enemy.postGibTime2 ?? 0);
      const chunkT = Utils.clamp((enemy.deadTime - startTime) / duration, 0, 1);
      const ang = i * 1.0472 + view.pose.seed;
      const radius = 14.5 + (i % 3) * 4.0;
      scratchStart.setScalar(Math.cos(ang) * 2.5, baseBodyY * (i < 2 ? 1 : 0.35) + 4 + (i % 2) * 3, Math.sin(ang) * 2.5);
      scratchEnd.setScalar(Math.cos(ang) * radius, 1.3, Math.sin(ang) * radius);
      scratchSpin.setScalar(4.2 * (i % 2 ? 1 : -1), ang * 2.1, 3.5);
      launchSeveredPart(view, chunk, scratchStart, scratchEnd, scratchSpin, chunkT, 16.5 + (i % 2) * 3.5);
      setUniformScale(chunk, 1.15 + (i % 2) * 0.3);
    } else
      chunk.setInactive();
  }
}

export const MONSTERS = {
  imp: { build: buildMonster, animate: animateMonster, die: dieMonster },
  brute: { build: buildMonster, animate: animateMonster, die: dieMonster },
  boss: { build: buildMonster, animate: animateMonster, die: dieMonster },
  skull: { build: buildMonster, animate: animateMonster, die: dieMonster },
  crawler: { build: buildMonster, animate: animateMonster, die: dieMonster },
  swarmer: { build: buildMonster, animate: animateMonster, die: dieMonster },
  wraith: { build: buildMonster, animate: animateMonster, die: dieMonster },
};
