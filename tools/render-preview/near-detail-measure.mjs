#!/usr/bin/env node
// Triangles per object near / mid / far, before and after the near-detail pass, for trees, people and items. Pure Node.
//   node --import ./scripts/game-loader.mjs tools/render-preview/near-detail-measure.mjs [out.json]
// "before" = the generators with the near passes switched off (the lod 0 tree, NEAR_PEOPLE / NEAR_ITEM disabled); "after" = hero tree tier and the enabled passes.
import fs from 'node:fs';
const out = process.argv[2] || 'docs/renders/near-detail/measure-near-detail.json';
const bot = await import('../../src/scene/treeBotany.ts'), spc = await import('../../src/scene/botanicalSpecies.ts');
const rig = await import('../../src/scene/characterRig.ts'), civp = await import('../../src/scene/civPeople.ts'), L = await import('../../src/scene/peopleLook.ts'), S = await import('../../src/scene/civSkin.ts');
const pd = await import('../../src/scene/peopleDetail.ts'), im = await import('../../src/scene/itemModels.ts'), inr = await import('../../src/scene/itemNear.ts');
const R = { generatedBy: 'tools/render-preview/near-detail-measure.mjs', trees: {}, people: {}, items: {} };
const avg = a => Math.round(a.reduce((s, x) => s + x, 0) / a.length);
// trees: before = lod 0 (near) / lod 1 (mid); after = lod 2 (hero). Far is the cheap crown (not geometry here).
for (const sp of spc.BOTANICAL_SPECIES) R.trees[sp.id] = { near: [0, 1, 2, 3].map(v => bot.botanicalTree(sp.id, v, 0).triangles), mid: [0, 1, 2, 3].map(v => bot.botanicalTree(sp.id, v, 1).triangles), hero: [0, 1, 2, 3].map(v => bot.botanicalTree(sp.id, v, 2).triangles) };
// people: three civs x four roles
const skins = S.listSkins().filter(s => s.id !== 'neutral').slice(0, 3);
const ROLES = [['worker', 'worker', 'adult', 'worker'], ['farmer', 'worker', 'adult', 'farmer'], ['soldier', 'spearman', 'soldier', 'soldier'], ['leader', 'leader', 'leader', 'ruler']];
const person = (skin, [name, type, cls, role], on) => {
  pd.NEAR_PEOPLE.enabled = on; const look = L.lookForSkin(skin), culture = civp.cultureForSkin(skin, 7), ind = L.individualFor(look, culture.key, 1234, cls);
  const gear = { garment: { item: 'woolCoat', condition: .9 }, ...(type === 'spearman' ? { armor: { kind: 'paddedTorso', condition: .9 } } : {}) };
  const o = rig.rigOutfit({ type, bodyClass: cls, seed: 1, gear, culture, season: 'summer', era: 3, teamColor: '#a33', affiliation: '#a33', look, individual: ind, role, unitId: 1234 });
  return [0, 1, 2].map(t => rig.rigTriangles(o, t, culture));
};
for (const skin of skins) for (const r of ROLES) { const b = person(skin, r, false), a = person(skin, r, true); R.people[skin.id + '/' + r[0]] = { before: b, after: a }; }
pd.NEAR_PEOPLE.enabled = true;
// items: near / mid / far, passes off then on
const ids = im.ITEM_IDS;
for (const id of ids) {
  const row = {};
  for (const on of [false, true]) {
    inr.NEAR_ITEM.enabled = on; im.clearItemCache();
    row[on ? 'after' : 'before'] = [0, 1, 2].map(lod => { try { return im.buildItem({ id, era: 2, skin: null, condition: .7, seed: 1, lod })?.triangles ?? null; } catch { return null; } });
  }
  R.items[id] = row;
}
inr.NEAR_ITEM.enabled = true; im.clearItemCache();
fs.mkdirSync(out.replace(/[^/]*$/, '') || '.', { recursive: true }); fs.writeFileSync(out, JSON.stringify(R, null, 1));
const T = Object.values(R.trees);
console.log('trees near/hero/mid mean', avg(T.flatMap(r => r.near)), avg(T.flatMap(r => r.hero)), avg(T.flatMap(r => r.mid)));
const P = Object.values(R.people);
for (const i of [0, 1, 2]) console.log('people tier', i, 'before', avg(P.map(p => p.before[i])), 'after', avg(P.map(p => p.after[i])));
const I = Object.values(R.items).filter(r => r.before[0] && r.after[0]);
for (const i of [0, 1, 2]) console.log('items tier', i, 'before', avg(I.map(r => r.before[i])), 'after', avg(I.map(r => r.after[i])));
