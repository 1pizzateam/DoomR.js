import assert from 'node:assert/strict';
import { barrelShrapnelParts, barrelWreckMesh } from '../src/barrel.js';
import { MONSTERS, monsterMesh } from '../src/monsters.js';
import { chaingunMesh, chainsawMesh, knifeMesh, rocketLauncherMesh, shotgunMesh } from '../src/arsenal.js';

const EXPECTED = {
  barrelWreck: '1296:9dfc82fe/1296:29f27aa6/864:751676f6',
  barrelLid: '360:e777fa80/360:852ce1b5/240:c3fdf159',
  barrelStave0: '108:65bcbf55/108:9be6a101/72:f071f0b2',
  barrelStave1: '108:c8dd1af4/108:4a8fc4fa/72:3b2e3025',
  barrelStave2: '108:65bcbf55/108:9be6a101/72:0aeb87e7',
  barrelStave3: '108:c8dd1af4/108:4a8fc4fa/72:2aaaa423',
  barrelStave4: '108:65bcbf55/108:9be6a101/72:1d3c3f7f',
  'monster:imp': '4212:a05fbbe8/4212:6659c5f9/2808:188f175e',
  'monster:brute': '3348:ed64b4f5/3348:cc8638e5/2232:59bc18a5',
  'monster:boss': '4968:ab2cd7aa/4968:62ae52c3/3312:78da5e25',
  'monster:skull': '2268:f80eccf0/2268:9a002623/1512:c1e3c0ce',
  'monster:crawler': '3240:3cb77e84/3240:174dc08d/2160:b3afcf7b',
  'monster:swarmer': '2160:df45f556/2160:afa8b975/1440:fa33de70',
  'monster:wraith': '2376:811cf7f1/2376:8e22cbe3/1584:97720e4e',
  knife: '10404:97215e65/10404:fee827d3/6936:7f534e06',
  chainsaw: '8856:cea26e39/8856:bf265c43/5904:8feb1b05',
  shotgun: '4860:13117f9f/4860:3fce2551/3240:9eb80893',
  chaingun: '5076:5052c19a/5076:b58d9cc9/3384:88c05675',
  rocketLauncher: '20628:37c04f4a/20628:11073133/13752:6b008677',
};

function fnv1a(buffer) {
  const bits = new Uint32Array(buffer.buffer, buffer.byteOffset, buffer.length);
  let h = 0x811c9dc5;
  for (let i = 0; i < bits.length; i++) {
    h ^= bits[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const sums = (m) => `${m.vertices.length}:${fnv1a(m.vertices)}/${m.normals.length}:${fnv1a(m.normals)}/${m.uvs.length}:${fnv1a(m.uvs)}`;

function collect() {
  const out = {};
  out.barrelWreck = barrelWreckMesh();
  const shrapnel = barrelShrapnelParts();
  out.barrelLid = shrapnel.lid;
  shrapnel.staves.forEach((s, i) => { out[`barrelStave${i}`] = s; });
  for (const type of Object.keys(MONSTERS))
    out[`monster:${type}`] = monsterMesh(type);
  out.knife = knifeMesh();
  out.chainsaw = chainsawMesh();
  out.shotgun = shotgunMesh();
  out.chaingun = chaingunMesh();
  out.rocketLauncher = rocketLauncherMesh();
  return out;
}

const checks = [
  ['AC-4 mesh buffers are byte-identical to the pre-refactor baseline', () => {
    const a = collect();
    const b = collect();
    const keys = Object.keys(a);
    for (const k of keys)
      assert.equal(sums(a[k]), sums(b[k]), `${k} not deterministic`);
    assert.deepEqual(Object.keys(EXPECTED), keys);
    for (const k of keys)
      assert.equal(sums(a[k]), EXPECTED[k], `${k} buffers changed`);
  }],
  ['AC-5 mesh buffers are well formed', () => {
    const all = collect();
    for (const [k, m] of Object.entries(all)) {
      assert.equal(m.vertices.length, m.normals.length, `${k} normals length`);
      assert.equal(m.vertices.length / 3, m.uvs.length / 2, `${k} uv length`);
      assert.equal((m.vertices.length / 3) % 3, 0, `${k} not whole triangles`);
      for (const buf of [m.vertices, m.normals, m.uvs])
        for (let i = 0; i < buf.length; i++)
          assert.ok(Number.isFinite(buf[i]), `${k} non-finite value`);
    }
  }],
];

let failed = 0;
for (const [name, fn] of checks) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    failed++;
    console.error(`not ok - ${name}\n${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
