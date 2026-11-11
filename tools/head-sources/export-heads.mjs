import fs from 'node:fs';
const base = '/Users/Shared/Projects/1pizzateam/FaceR.js/dist/facer.js';
const { getCanonicalBaseHead, BASE_HEAD_ARCHETYPES } = await import(base);
const ids = Object.keys(BASE_HEAD_ARCHETYPES);
const r = (a) => Array.from(a, (x) => Math.round(x * 1e5) / 1e5);
for (const id of ids) {
  const g = getCanonicalBaseHead(id);
  const v3 = (v) => [v.x, v.y, v.z];
  const out = {
    format: 'facer-head', version: 1, id,
    label: BASE_HEAD_ARCHETYPES[id].label, subtitle: BASE_HEAD_ARCHETYPES[id].subtitle,
    positions: r(g.positions), normals: r(g.normals), uvs: r(g.uvs),
    indices: Array.from(g.indices), submeshes: g.submeshes,
    vertexRegionMap: Array.from(g.vertexRegionMap), jawWeights: r(g.jawWeights),
    pivots: { neck: v3(g.pivots.neck), jaw: v3(g.pivots.jaw), eyeLeft: v3(g.pivots.eyeLeft), eyeRight: v3(g.pivots.eyeRight) },
  };
  const f = `/Users/Shared/Projects/1pizzateam/FaceR.js/heads/${id}.facerhead.json`;
  fs.writeFileSync(f, JSON.stringify(out));
  console.log(id, g.vertexCount, (fs.statSync(f).size / 1024) | 0, 'KB');
}
