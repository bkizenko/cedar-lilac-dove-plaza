// Variety sheet: N dwellings per civ side by side (same village: one settlementSeed + heraldry), built through the same
// carvedVariantFor -> variantSpec path the game and the ghost use. zoom 'close' = two civs per sheet, 'mid' = seven.
//   node tools/render-preview/render-three.mjs hut-variety-mid-a out.png   (see scenes.mjs for names)
// BUILDING_MUTE=1 renders with the opt-in muted adult tone (setBuildingMute).
import { Soup, specMesh, slab, grainTexture, parts as PT, MAT } from './scene-lib.mjs';
import { rigFor } from './rigs.mjs';
const cb = await import('../../src/scene/civSkin.ts'), sm = await import('../../src/scene/buildingStyleMap.ts'), cs = await import('../../src/scene/civStyles.ts'), vi = await import('../../src/scene/villageIdentity.ts');
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
function paint(spec) {
  const stand = { ...spec, parts: spec.parts.map(p => ({ ...p, mat: 'plaster' })) };
  const m = specMesh(stand, 0), colors = new Float32Array(m.colors.length), mats = new Uint8Array(m.mats.length); let v = 0;
  for (const p of PT.partsAtLod(spec, 0)) { const n = PT.partTriangles(p) * 3, sw = spec.materials[p.mat], c = sw ? hex(sw.hex || '#aaa') : [.5, .5, .5];
    for (let i = 0; i < n; i++, v++) { const k = 1; colors[v * 3] = Math.min(1, c[0] * k); colors[v * 3 + 1] = Math.min(1, c[1] * k); colors[v * 3 + 2] = Math.min(1, c[2] * k); mats[v] = MAT.plaster ?? 0; } }
  return { ...m, colors, mats };
}
export const hutVarietyScene = (opts = {}) => async ({ rig }) => {
  const civs = opts.civs || cs.CIV_IDS, per = opts.per || 6, era = opts.era ?? 1, type = opts.type || 'hut', close = !!opts.close, sx = close ? 9 : 8.6, rd = close ? 14 : 10.5;
  const soup = new Soup('huts'), base = new Soup('plinth'), labels = [], W = sx * per;
  base.add(slab(W + 6, civs.length * rd + 4, .6, '#8f8b78', .35), { x: 0, z: 0 });
  civs.forEach((civ, row) => {
    const z = -civs.length * rd / 2 + rd * (row + .5), skin = cb.presetSkin(civ), her = vi.villageHeraldry(7, row + 1);
    for (let k = 0; k < per; k++) {
      const x = -W / 2 + sx * (k + .5);
      const v = sm.carvedVariantFor({ worldSeed: 7, type, id: 11 + row * 17 + k * 5, era, footprint: type === 'hut' ? { w: 5.4, d: 5.2 } : { w: 7.5, d: 6.5 }, settlementSeed: row + 1, skin, heraldry: her });
      soup.add(paint(sm.variantSpec(v)), { x, y: .3, z, yaw: ((k * 37 + row * 11) % 9 - 4) * .045 });
    }
    labels.push({ world: [-W / 2 - 1, .3, z + rd * .42], text: `${civ} ${type} era${era}`, align: 'left', size: 11 });
  });
  const p = (close ? 38 : 34) * Math.PI / 180, hH = civs.length * rd * .5 * Math.sin(p) * 1.02 + 6.5, hW = W / 2 + 2.5, pxW = close ? 1500 : 1700, pxH = Math.round(pxW * hH / hW);
  return { width: pxW, height: pxH, background: '#c9c7b8', camera: { ortho: hH, eye: [0, Math.sin(p) * 300, 4 + Math.cos(p) * 300], target: [0, 0, 4], near: 10, far: 900 },
    rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: Math.max(W, civs.length * rd) * .58 }, grain: grainTexture(), meshes: [base.encode(), soup.encode()], labels };
};
