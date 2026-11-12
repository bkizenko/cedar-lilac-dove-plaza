// Per-civ building sheet: original vs legacy grammar, house + civic, from generateCivBuilding (src/scene/civBuildings.ts).
import { Soup, specMesh, slab, grainTexture, palette, parts as PT, MAT } from './scene-lib.mjs';
import { rigFor } from './rigs.mjs';
const cb = await import('../../src/scene/civBuildings.ts');
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
/** civ specs use per-civ material ids; mesh with a stand-in carved material, then colour each part from spec.materials. */
function civMesh(spec) {
  const stand = { ...spec, parts: spec.parts.map(p => ({ ...p, mat: 'plaster' })) };
  const m = specMesh(stand, 0), colors = new Float32Array(m.colors.length), mats = new Uint8Array(m.mats.length); let v = 0;
  for (const p of PT.partsAtLod(spec, 0)) { const n = PT.partTriangles(p) * 3, sw = spec.materials[p.mat], c = sw ? hex(sw.hex || sw.color || '#aaa') : [.5, .5, .5];
    for (let i = 0; i < n; i++, v++) { const a = m.colors[v * 3] || 1; colors[v * 3] = c[0]; colors[v * 3 + 1] = c[1]; colors[v * 3 + 2] = c[2]; mats[v] = MAT.plaster ?? 0; } }
  return { ...m, colors, mats };
}
export const civBuildingsScene = (civs = ['mekhari', 'sandrill']) => async ({ rig }) => {
  const soup = new Soup('buildings'), base = new Soup('plinths'), labels = [], cw = 16, rd = 20;
  base.add(slab(cw * 4 + 6, civs.length * rd + 6, .6, palette.CARVED_TERRAIN.bands[0], .5), { x: 0, z: 0 });
  civs.forEach((civ, row) => {
    const z = -civs.length * rd / 2 + rd * (row + .5);
    [['original', 'house'], ['original', 'civic'], ['legacy', 'house'], ['legacy', 'civic']].forEach(([gs, role], c) => {
      cb.setGrammarSet(gs);
      const spec = cb.generateCivBuilding(civ, role, { seed: 11 + row, era: 3, wealth: .6, wear: .1, footprint: role === 'house' ? { w: 8, d: 7 } : { w: 14, d: 9 } }, ['civ', civ, role, gs, row].join('|'));
      const x = -cw * 2 + cw * (c + .5);
      soup.add(civMesh(spec), { x, y: .3, z, yaw: -.5 });
      labels.push({ world: [x - 5, .3, z + 8], text: `${civ} ${role} (${gs})`, align: 'left', size: 10 });
    });
  });
  cb.setGrammarSet('original');
  const half = cw * 2.2, p = 40 * Math.PI / 180;
  return { width: 1000, height: 600, background: '#e7c493', camera: { ortho: half * .62, eye: [0, Math.sin(p) * 300, 4 + Math.cos(p) * 300], target: [0, 0, 4], near: 10, far: 900 },
    rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: half }, grain: grainTexture(), meshes: [base.encode(), soup.encode()], labels };
};
