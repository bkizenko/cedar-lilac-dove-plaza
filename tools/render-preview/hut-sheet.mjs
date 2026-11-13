// Contact sheet: the HUT (and the era-2 house for contrast) of every civ skin at eras 0/1/2, built through the
// same carvedVariantFor -> variantSpec path the game uses. A 1.7 m post stands beside each as a person-height gauge.
import { Soup, specMesh, slab, grainTexture, palette, parts as PT, MAT } from './scene-lib.mjs';
import { rigFor } from './rigs.mjs';
const cb = await import('../../src/scene/civSkin.ts'), sm = await import('../../src/scene/buildingStyleMap.ts'), cs = await import('../../src/scene/civStyles.ts');
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
function paint(spec) {
  const stand = { ...spec, parts: spec.parts.map(p => ({ ...p, mat: 'plaster' })) };
  const m = specMesh(stand, 0), colors = new Float32Array(m.colors.length), mats = new Uint8Array(m.mats.length); let v = 0;
  for (const p of PT.partsAtLod(spec, 0)) { const n = PT.partTriangles(p) * 3, sw = spec.materials[p.mat], c = sw ? hex(sw.hex || '#aaa') : [.5, .5, .5];
    for (let i = 0; i < n; i++, v++) { colors[v * 3] = c[0]; colors[v * 3 + 1] = c[1]; colors[v * 3 + 2] = c[2]; mats[v] = MAT.plaster ?? 0; } }
  return { ...m, colors, mats };
}
export const hutSheetScene = (opts = {}) => async ({ rig }) => {
  const civs = opts.civs || cs.CIV_IDS, eras = opts.eras || [0, 1, 2], type = opts.type || 'hut', cw = 12, rd = 10;
  const soup = new Soup('huts'), base = new Soup('plinth'), labels = [];
  base.add(slab(cw * eras.length + 6, civs.length * rd + 6, .6, palette.CARVED_TERRAIN.bands[0], .5), { x: 0, z: 0 });
  civs.forEach((civ, row) => {
    const z = -civs.length * rd / 2 + rd * (row + .5);
    eras.forEach((era, c) => {
      const skin = cb.presetSkin(civ), x = -cw * eras.length / 2 + cw * (c + .5);
      const v = sm.carvedVariantFor({ worldSeed: 7, type, id: 3 + row, era, footprint: type === 'hut' ? { w: 5.4, d: 5.2 } : { w: 9, d: 8 }, settlementSeed: 0, skin });
      const spec = sm.variantSpec(v);
      soup.add(paint(spec), { x, y: .3, z, yaw: 0 });
      soup.add(slab(.5, .4, 1.7, '#2f3f8f', 0), { x: x + 3.6, y: .3, z: z + 1.5 });
      labels.push({ world: [x - 3.8, .3, z + 3.6], text: `${civ} ${type} era${era}`, align: 'left', size: 10 });
    });
  });
  const hw = Math.max(cw * eras.length, civs.length * rd) * .56, p = 32 * Math.PI / 180;
  return { width: 1100, height: 1000, background: '#e7c493', camera: { ortho: civs.length * rd * .5 * Math.sin(p) * 1.12 + 4, eye: [0, Math.sin(p) * 300, 4 + Math.cos(p) * 300], target: [0, 0, 4], near: 10, far: 900 },
    rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: hw }, grain: grainTexture(), meshes: [base.encode(), soup.encode()], labels };
};
