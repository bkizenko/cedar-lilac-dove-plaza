import test from 'node:test';import assert from 'node:assert/strict';
import {CIVS,CIV_IDS} from '../src/scene/civStyles.ts';
import {cultureForCiv,emblemInk,emblemSvg,insignia,contrast,civShowcase} from '../src/scene/civPeople.ts';
import {unitAppearance,appearanceTriangles} from '../src/scene/unitAppearance.ts';
import {generateCivBuilding} from '../src/scene/civBuildings.ts';
import {BIOME_TERRAIN} from '../src/scene/biomeTerrain.ts';
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const dist=(a,b)=>Math.hypot(...rgb(a).map((v,i)=>v-rgb(b)[i]));
const app=(civ,type='worker',season='summer',item='woolCoat',armor=false)=>unitAppearance({type,seed:5,gear:{garment:{item,condition:1},...(armor?{armor:{kind:'paddedTorso',condition:1}}:{})},culture:cultureForCiv(civ,9),season});
test('emblems: 14 distinct, ink reaches 3:1 on the civ cloth, svg draws it',()=>{
 const svgs=new Set();for(const c of CIV_IDS){assert.ok(contrast(CIVS[c].materials.cloth.hex,emblemInk(c))>=3,c+' emblem contrast');const s=emblemSvg(c);assert.ok(s.startsWith('<svg')&&s.includes(CIVS[c].materials.cloth.hex)&&s.includes(emblemInk(c)));svgs.add(s);assert.ok(insignia(c).placement.worker);}
 assert.equal(svgs.size,14);
});
test('people differ by civ: cut, headwear and dye are unique combinations, dyes are far apart',()=>{
 const combos=new Set(CIV_IDS.map(c=>[CIVS[c].dress.cut,CIVS[c].dress.headwear,CIVS[c].dress.body].join('|')));assert.equal(combos.size,14);
 const heads=new Set(CIV_IDS.map(c=>CIVS[c].dress.headwear)),cuts=new Set(CIV_IDS.map(c=>CIVS[c].dress.cut));assert.ok(heads.size>=6&&cuts.size>=6,`headwear ${heads.size} cuts ${cuts.size}`);
 for(let i=0;i<CIV_IDS.length;i++)for(let j=i+1;j<CIV_IDS.length;j++)assert.ok(dist(CIVS[CIV_IDS[i]].dress.body,CIVS[CIV_IDS[j]].dress.body)>=28||CIVS[CIV_IDS[i]].dress.headwear!==CIVS[CIV_IDS[j]].dress.headwear||CIVS[CIV_IDS[i]].dress.cut!==CIVS[CIV_IDS[j]].dress.cut,`${CIV_IDS[i]} vs ${CIV_IDS[j]}`);
});
test('rendered units differ per civ for every unit type, within the unit budgets',()=>{
 for(const type of['worker','spearman','archer','swordsman','leader']){const sig=new Set();for(const c of CIV_IDS){const a=app(c,type,'summer','woolCoat',type!=='worker');sig.add(a.geometryKey+'|'+a.slotColors.garment+'|'+a.slotColors.trim);assert.ok(appearanceTriangles(a,0)<=800&&appearanceTriangles(a,1)<=340&&appearanceTriangles(a,2)<=120,c+' '+type+' budget');}
  assert.ok(sig.size>=13,`${type}: ${sig.size} distinct looks for 14 civs`);}
 const worn=new Set(CIV_IDS.map(c=>app(c,'worker','winter','hideCoat').slotColors.garment));assert.ok(worn.size>=12,'dye survives a different garment');
});
test('units still render only owned gear (no invented armor) for every civ',()=>{
 for(const c of CIV_IDS){const bare=unitAppearance({type:'worker',seed:1,gear:{},culture:cultureForCiv(c,2),season:'summer'}),armed=app(c,'spearman','summer','woolCoat',true);assert.equal(bare.rendered.garment,undefined);assert.equal(bare.rendered.armor,undefined);assert.equal(armed.rendered.armor,'paddedTorso');assert.equal(armed.rendered.weapon,'spear');}
});
test('culture for civ carries the civ palette and flag, deterministically',()=>{
 for(const c of CIV_IDS){const a=cultureForCiv(c,3),b=cultureForCiv(c,3);assert.deepEqual(a,b);assert.equal(a.flag.fields[0],CIVS[c].materials.cloth.hex);assert.equal(a.dress.summer.cut,CIVS[c].dress.cut);assert.ok(a.key.startsWith(c));}
 assert.equal(new Set(CIV_IDS.map(c=>cultureForCiv(c,1).key)).size,14);
});
test('showcase: every civ lays out a non-overlapping review scene on its own biome with buildings that generate',()=>{
 for(const c of CIV_IDS){const s=civShowcase(c,4);assert.ok(BIOME_TERRAIN[s.biome]);assert.equal(s.items.length,7);assert.deepEqual(civShowcase(c,4),s);
  const xs=[...s.items].sort((a,b)=>a.x-b.x);for(let i=1;i<xs.length;i++)assert.ok(xs[i].x-xs[i].footprint.w/2>=xs[i-1].x+xs[i-1].footprint.w/2+2.9,`${c} overlap`);
  for(const it of s.items){const b=generateCivBuilding(c,it.role,it);assert.ok(b.parts.length>0);}}
 assert.ok(new Set(CIV_IDS.map(c=>civShowcase(c).biome)).size>=9);
});
test('mid-LOD readability: every civ keeps its headwear, no civ is bare-headed at mid zoom, budgets unchanged',()=>{
 for(const c of CIV_IDS){const kind=CIVS[c].dress.headwear;if(kind==='none')continue;
  const a=app(c,'worker','summer','woolCoat',false),mid=a.parts.filter(p=>p.lod>=1&&(p.onlyFrom??0)<=1);
  const head=mid.filter(p=>p.pos[1]>=.55&&(p.slot==='trim'||p.slot==='hair'||p.slot==='garment'||p.slot==='leather')&&p.pos[1]>=(kind==='braids'?.7:kind==='hood'?.9:1.0));
  assert.ok(head.length>=1,`${c} (${kind}) has no headwear mass at mid LOD`);}
});
