// Placement ghost / slope / plinth / village identity demos built from the REAL generators (buildingStyleMap + villageIdentity + siteSlope).
import { Soup, specMesh, slab, terrainMesh, grainTexture, palette, parts as PT, MAT } from './scene-lib.mjs';
import { rigFor } from './rigs.mjs';
const sm = await import('../../src/scene/buildingStyleMap.ts'), cs = await import('../../src/scene/civSkin.ts'), vi = await import('../../src/scene/villageIdentity.ts'), ss = await import('../../src/game/siteSlope.ts');
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
export function paint(spec) {
  const stand = { ...spec, parts: spec.parts.map(p => ({ ...p, mat: 'plaster' })) };
  const m = specMesh(stand, 0), colors = new Float32Array(m.colors.length), mats = new Uint8Array(m.mats.length); let v = 0;
  for (const p of PT.partsAtLod(spec, 0)) { const n = PT.partTriangles(p) * 3, sw = spec.materials[p.mat], c = sw ? hex(sw.hex || '#aaa') : [.5, .5, .5];
    for (let i = 0; i < n; i++, v++) { colors[v * 3] = c[0]; colors[v * 3 + 1] = c[1]; colors[v * 3 + 2] = c[2]; mats[v] = MAT.plaster ?? 0; } }
  return { ...m, colors, mats };
}
const GREEN = [.55, 1.1, .6], RED = [1.15, .45, .4];
/** Slope scene: left to right = before (floating on wall strips), after (levelled plinth), green ghost on the same slope, red ghost on a cliff. */
export const slopeScene = () => async ({ rig }) => {
  const H = (x) => x < 6 ? .3 * x : 1.8 + 1.5 * (x - 6) * 1; // 17 degree slope, then a cliff
  const terrain = terrainMesh({ x0: -34, x1: 26, z0: -14, z1: 14, step: .5, height: (x, z) => H(x) + 0, colorHeight: (x, z) => 0, waterY: -99, seed: 3, natural: true });
  const soup = new Soup('b'), hut = (tint, id = 5) => paint(sm.variantSpec(sm.carvedVariantFor({ worldSeed: 4, type: 'hut', id, era: 1, footprint: { w: 5.4, d: 5.2 }, settlementSeed: 0, skin: cs.presetSkin('aureline'), heraldry: vi.villageHeraldry(4, 0) })));
  const labels = [], W = 5.4, D = 5.2, stone = '#a89c86';
  const place = (x, mode, label) => {
    const lo = H(x - W / 2), hi = H(x + W / 2), level = hi + .03, ok = ss.siteRelief(xx => H(xx), x, 0, W, D);
    const tint = mode === 'ghost' ? GREEN : mode === 'red' ? RED : null;
    soup.add(hut(), { x, y: level, z: 0, yaw: 0, tint });
    const st = tint;
    if (mode === 'before') { for (const sx of [-1, 1]) soup.add(slab(.18, D, level - H(x + sx * W / 2) + .2, stone, .5), { x: x + sx * W / 2, y: level - .02, z: 0 }); }
    else if (mode === 'red') { /* refused: no foundation is drawn, red */ }
    else { const p = ss.levellingPlinth('hut', { x, z: 0, w: W, d: D }, level, lo, .18); if (p) soup.add(slab(p.length, p.width, p.height, stone, .5), { x: p.x, y: p.y + p.height / 2, z: p.z, tint: st }); }
    labels.push({ world: [x - 3, H(x) + .3, 5], text: `${label} (${ok.range.toFixed(1)} m fall, limit ${ok.allowance.toFixed(1)}${ok.ok ? '' : ' - REFUSED'})`, align: 'left', size: 10 });
  };
  place(-26, 'before', 'before: floats on wall strips'); place(-14, 'after', 'after: levelled plinth'); place(-2, 'ghost', 'ghost: same model, green'); place(15, 'red', 'ghost: red, truly too steep');
  const p = 36 * Math.PI / 180, half = 34;
  return { width: 1200, height: 560, background: '#e7c493', camera: { ortho: half * .62, eye: [-4, Math.sin(p) * 200 + 7, 40 + Math.cos(p) * 200], target: [-4, 7, 2], near: 5, far: 700 },
    rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [-4, 0, 0], radius: half }, grain: grainTexture(), meshes: [terrain, soup.encode()], labels };
};
/** Same-colour villages: one civ, one palette, six villages: heraldry finial + rim trim + banner cut + seeded layout differ. */
export const villagesScene = () => async ({ rig }) => {
  const soup = new Soup('v'), base = new Soup('p'), labels = [], cw = 13, civ = 'aureline';
  base.add(slab(cw * 6 + 4, 24, .6, palette.CARVED_TERRAIN.bands[0], .5), { x: 0, z: 0 });
  for (let v = 0; v < 6; v++) {
    const x = -cw * 2.5 + cw * v, skin = cs.presetSkin(civ), h = vi.villageHeraldry(11, v);
    for (const [i, type, fp, z] of [[0, 'house', { w: 7, d: 6 }, -4], [1, 'hut', { w: 5.4, d: 5.2 }, 6]]) {
      const spec = sm.variantSpec(sm.carvedVariantFor({ worldSeed: 11, type, id: 20 + i * 3 + v, era: type === 'hut' ? 1 : 3, footprint: fp, settlementSeed: v, skin, heraldry: h }));
      soup.add(paint(spec), { x, y: .3, z: z - (type === 'townhall' ? 3 : 0), yaw: 0 });
    }
    labels.push({ world: [x - 4, .3, 11], text: `village ${v}  finial${h.shape} trim${h.trim} ${vi.BANNER_ORDER[h.banner]}`, align: 'left', size: 9 });
  }
  const p = 34 * Math.PI / 180, half = 40;
  return { width: 1300, height: 640, background: '#e7c493', camera: { ortho: half * .56, eye: [0, Math.sin(p) * 300, 4 + Math.cos(p) * 300], target: [0, 0, 4], near: 10, far: 900 },
    rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: half }, grain: grainTexture(), meshes: [base.encode(), soup.encode()], labels };
};
