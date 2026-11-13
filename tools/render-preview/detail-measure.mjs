#!/usr/bin/env node
// Pure (Node, no GPU) triangle counts per detail tier for every object class, plus the tier each class selects at a given camera distance.
//   node --import ./scripts/game-loader.mjs tools/render-preview/detail-measure.mjs [out.json]
// Every number is computed from the real generators (specTriangles, rigTriangles, botanicalTree, buildItem); nothing is estimated.
import fs from 'node:fs';
const out = process.argv[2] || 'docs/renders/detail-audit/measure.json';
const bp = await import('../../src/scene/buildingParts.ts'), sm = await import('../../src/scene/buildingStyleMap.ts'), skins = await import('../../src/scene/civSkin.ts'), cs = await import('../../src/scene/civStyles.ts');
const rig = await import('../../src/scene/characterRig.ts'), civp = await import('../../src/scene/civPeople.ts'), bot = await import('../../src/scene/treeBotany.ts'), spc = await import('../../src/scene/botanicalSpecies.ts');
const items = await import('../../src/scene/itemModels.ts'), K = await import('../../src/game/constants.ts');
const R = { generatedBy: 'tools/render-preview/detail-measure.mjs', buildings: {}, huts: {}, people: {}, trees: {}, items: {} };
for (const type of sm.CARVED_TYPES) {
  const fp = K.BUILDINGS[type]; if (!fp) continue; const row = {};
  for (const era of [0, 2, 3]) { const spec = sm.carvedBuildingSpec({ worldSeed: 1207, type, id: 11, era, habitat: 'plains', footprint: { w: fp.w, d: fp.d }, prosperity: .5, settlementSeed: 3 }); if (spec) row['e' + era] = [0, 1, 2].map(t => bp.specTriangles(spec, t)); }
  if (Object.keys(row).length) R.buildings[type] = row;
}
for (const civ of cs.CIV_IDS.slice(0, 8)) for (const era of [0, 1, 2]) {
  const skin = skins.presetSkin(civ), v = sm.carvedVariantFor({ worldSeed: 7, type: 'hut', id: 3, era, footprint: { w: 5.4, d: 5.2 }, settlementSeed: 0, skin }), spec = sm.variantSpec(v);
  (R.huts[civ] ??= {})['e' + era] = [0, 1, 2].map(t => bp.specTriangles(spec, t));
}
const cul = civ => civp.cultureForCiv(civ, 3);
for (const [role, type, cls] of [['worker', 'worker', 'adult'], ['soldier', 'spearman', 'soldier'], ['archer', 'archer', 'soldier'], ['leader', 'leader', 'leader'], ['child', 'worker', 'child']]) {
  const o = rig.rigOutfit({ type, bodyClass: cls, seed: 3, gear: { garment: { item: 'woolCoat', condition: .95 }, ...(type === 'spearman' ? { armor: { kind: 'paddedTorso', condition: .9 } } : {}) }, culture: cul('hanrei'), season: 'summer', era: 3, teamColor: '#c0a060', affiliation: '#c0a060' });
  R.people[role] = [0, 1, 2].map(t => rig.rigTriangles(o, t, cul('hanrei')));
}
R.people.RIG_BUDGET = rig.RIG_BUDGET;
for (const sp of spc.BOTANICAL_SPECIES) { const row = {}; for (const lod of [0, 1]) row['lod' + lod] = [0, 1, 2, 3].map(v => bot.botanicalTree(sp.id, v, lod).triangles); R.trees[sp.id] = row; }
for (const id of items.ITEM_IDS) { const t = [0, 1, 2].map(lod => { try { return items.buildItem({ id, era: 2, skin: null, condition: .85, seed: 1, lod })?.triangles ?? null; } catch { return null; } }); R.items[id] = t; }
// thresholds as shipped in this tree
R.thresholds = { buildingsM: bp.LOD_DISTANCES_METRES, rigTier: 'characterRig.tierForDistance (3-D metres)', rigDists: [35, 70].map(d => [d, rig.tierForDistance(d - .01), rig.tierForDistance(d)]) };
fs.mkdirSync(out.replace(/[^/]*$/, '') || '.', { recursive: true }); fs.writeFileSync(out, JSON.stringify(R, null, 1));
const avg = (rows, i) => Math.round(rows.reduce((s, r) => s + r[i], 0) / rows.length);
const bl = Object.values(R.buildings).map(r => r.e2 || Object.values(r)[0]);
console.log('buildings (era2, ' + bl.length + ' types) mean near/mid/far tris', [0, 1, 2].map(i => avg(bl, i)).join('/'));
const hl = Object.values(R.huts).flatMap(r => Object.values(r)); console.log('huts mean near/mid/far', [0, 1, 2].map(i => avg(hl, i)).join('/'));
for (const [k, v] of Object.entries(R.people)) if (Array.isArray(v)) console.log('person', k, v.join('/'));
const tl = Object.values(R.trees); console.log('trees lod0 mean/lod1 mean', avg(tl.map(r => r.lod0), 0), avg(tl.map(r => r.lod1), 0));
