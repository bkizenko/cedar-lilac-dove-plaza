// CivSkin contract: registry, approved presets unchanged, generator derivation per game and slot, state/persistence, live carved layer, wonders, people.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BUILDINGS} from '../src/game/constants.ts';
import {Game} from '../src/game/sim.ts';
import {generateCiv,generateCast,PRESETS} from '../src/game/civGenerator.ts';
import {APPROVED_CIVS,listSkins,skinById,presetSkin,registerSkin,skinFromCiv,validSkin,lookOf,villageRetint,isApprovedSkin,skinSignature,NEUTRAL_SKIN,ROLE_OF_TYPE} from '../src/scene/civSkin.ts';
import {generateCivBuilding,ROLE_LIST} from '../src/scene/civBuildings.ts';
import {materialTable,CIV_IDS} from '../src/scene/civStyles.ts';
import {carvedBuildingSpec,carvedVariantFor,CARVED_TYPES} from '../src/scene/buildingStyleMap.ts';
import {specTriangles,partsAtLod,specBounds,renderTierForDistance} from '../src/scene/buildingParts.ts';
import {carvedSwatch,CARVED_MATERIAL_IDS} from '../src/scene/carvedPalette.ts';
import {CarvedBuildingLayer} from '../src/scene/carvedBuildingLayer.ts';
import {buildSkins,ensureSkins,skinOfTeam,validSkinsState} from '../src/game/skinState.ts';
import {cultureForCiv,cultureForSkin} from '../src/scene/civPeople.ts';
import {WonderLayer} from '../src/scene/wonderLayer.ts';

const fp=type=>({w:BUILDINGS[type].w,d:BUILDINGS[type].d});
const input=(type,skin,extra={})=>({worldSeed:11,type,id:3,era:3,habitat:'plains',footprint:fp(type),settlementSeed:1,...(skin?{skin}:{}),...extra});
const resolvable=spec=>spec.parts.every(p=>spec.materials?.[p.mat]||CARVED_MATERIAL_IDS.includes(p.mat));
const CAPS={near:2600,mid:1400,far:700};

test('registry: every civ bible is a preset skin, the ten approved are marked, extras are data-only and valid',()=>{
 for(const id of CIV_IDS){const s=skinById('civ:'+id);assert.ok(s&&validSkin(s),id);assert.equal(s.grammar,id);assert.equal(s.mode,'preset');}
 assert.deepEqual([...PRESETS].sort(),[...APPROVED_CIVS].sort(),'approved ten = the generator presets');
 for(const id of APPROVED_CIVS)assert.ok(isApprovedSkin('civ:'+id));
 assert.ok(listSkins().filter(s=>s.mode==='preset'&&!s.id.startsWith('civ:')).length>=8,'extra registry skins');
 assert.equal(NEUTRAL_SKIN.grammar,null);assert.ok(validSkin(NEUTRAL_SKIN));
});
test('adding a skin is one data object: registerSkin(spec) draws houses, halls and markets with no code change',()=>{
 const s=registerSkin({id:'test-plum',name:'Plum Court',base:'hanrei',palette:{roof:'#5a2a6a',wall:'#efe0c0'},banner:'swallow',emblem:'crescentStar'});
 assert.equal(skinById('test-plum'),s);assert.equal(s.palette.roof.hex,'#5a2a6a');assert.equal(s.grammar,'hanrei');assert.equal(s.palette.wall2.hex,presetSkin('hanrei').palette.wall2.hex,'omitted fields inherit');
 for(const type of ['house','townhall','market']){const spec=carvedBuildingSpec(input(type,s));assert.ok(spec.family.startsWith('civ.hanrei.'),type);assert.ok(resolvable(spec));assert.equal(spec.materials['hanrei.roof'].hex,'#5a2a6a');}
});
test('approved presets look exactly as approved: the skin path emits the same parts and materials as the civ bible, for every role, era and seed',()=>{
 for(const civ of APPROVED_CIVS)for(const role of ROLE_LIST)for(const era of [1,3,5])for(const seed of [3,11]){
  const ctx={seed,era,wealth:.6,wear:.1,footprint:role==='house'?{w:8,d:7}:{w:14,d:9},eraMode:'fixed',built:{era,wealth:.6}};
  const a=generateCivBuilding(civ,role,ctx,'k'),b=generateCivBuilding(civ,role,{...ctx,look:lookOf(presetSkin(civ))},'k');
  assert.deepEqual(b.parts,a.parts,`${civ} ${role} era ${era} parts`);assert.deepEqual(b.materials,a.materials,`${civ} ${role} materials`);assert.deepEqual(b.banners,a.banners);
  assert.deepEqual(b.materials,materialTable(civ));
 }
});
test('preset people are dressed exactly as before; remixed and free peoples differ',()=>{
 for(const civ of CIV_IDS)assert.deepEqual(cultureForSkin(presetSkin(civ),5),cultureForCiv(civ,5));
 const r=skinFromCiv(generateCiv(5,1,'remix','hanrei')),f=skinFromCiv(generateCiv(5,2,'free'));
 assert.notEqual(cultureForSkin(r,5).key,cultureForCiv('hanrei',5).key);assert.notEqual(cultureForSkin(f,5).dress.summer.body,cultureForCiv('hanrei',5).dress.summer.body);
});

test('generator: a skin per game and slot is deterministic, valid and kin to its civ; presets verbatim, remix mutated, free built from the materials',()=>{
 for(let seed=1;seed<=40;seed++)for(let slot=0;slot<4;slot++)for(const mode of ['preset','remix','free']){
  const c=generateCiv(seed,slot,mode),a=skinFromCiv(c),b=skinFromCiv(c);
  assert.deepEqual(a,b,'deterministic');assert.ok(validSkin(a),`${mode} ${seed}/${slot}`);assert.equal(a.origin.slot,slot);
  if(mode==='preset'){assert.equal(a.id,'civ:'+c.preset);assert.deepEqual(a.palette,presetSkin(c.preset).palette);}
  if(mode==='remix'){assert.equal(a.grammar,c.preset);assert.notDeepEqual(a.palette,presetSkin(c.preset).palette);}
  if(mode==='free')assert.equal(a.mode,'free');
 }
});
test('every new game differs: across 60 games the player, remix and free skins vary in grammar, palette, banner and emblem',()=>{
 const pal=new Set(),gram=new Set(),ban=new Set(),emb=new Set();
 for(let seed=100;seed<160;seed++){const st=buildSkins(seed,4);for(const s of Object.values(st.slots)){pal.add(skinSignature(s));gram.add(s.grammar);ban.add(s.banner.style);emb.add(s.banner.emblem);}}
 assert.ok(pal.size>=120,'palettes '+pal.size);assert.ok(gram.size>=10,'grammars '+gram.size);assert.equal(ban.size,6);assert.ok(emb.size>=12,'emblems '+emb.size);
});
test('societies never share a skin in one game, and the player may choose preset, remix, random or plain',()=>{
 for(let seed=1;seed<=80;seed++){const st=buildSkins(seed,4),sig=Object.values(st.slots).map(s=>s.id);assert.equal(new Set(sig).size,4,'seed '+seed+' '+sig);assert.ok(validSkinsState(st,4));}
 assert.equal(buildSkins(9,4,{mode:'preset',skinId:'civ:hanrei'}).slots['0'].id,'civ:hanrei');
 const rm=buildSkins(9,4,{mode:'remix',preset:'skoldar'}).slots['0'];assert.equal(rm.mode,'remix');assert.equal(rm.grammar,'skoldar');
 assert.equal(buildSkins(9,4,{mode:'neutral'}).slots['0'].grammar,null);assert.equal(skinOfTeam(buildSkins(9,4,{mode:'neutral'}),0),null);
 const r1=buildSkins(9,4,{mode:'random'}),r2=buildSkins(9,4,{mode:'random'});assert.deepEqual(r1,r2,'stable per seed');
 const chosen=buildSkins(9,4,{mode:'preset',skinId:'civ:rusvolt'});for(const k of ['1','2','3'])assert.notEqual(chosen.slots[k].id,'civ:rusvolt');
});
test('skins live in game state: new games carry them, they survive save/load exactly, old saves and damaged records are re-derived',async()=>{
 const {encodeGame,decodeGame}=await import('../src/game/persistence.ts');
 const g=new Game();g.reset(123456,18,{size:1040,layout:'pangaea',skin:{mode:'preset',skinId:'civ:hanrei'}});g.enterIsland();
 assert.equal(g.state.skins.slots['0'].id,'civ:hanrei');assert.equal(Object.keys(g.state.skins.slots).length,g.state.tribes.length);
 const wire=JSON.parse(JSON.stringify(encodeGame(g))),back=decodeGame(wire);
 assert.deepEqual(back.state.skins,g.state.skins,'round trip');
 // old save: no skins field -> derived from the seed, same as a fresh game with no request
 const old=JSON.parse(JSON.stringify(encodeGame(g)));delete old.state?.skins;delete old.skins;
 const o=decodeGame(old);assert.ok(validSkinsState(o.state.skins,o.state.tribes.length));assert.deepEqual(o.state.skins.slots,buildSkins(123456,o.state.tribes.length).slots);
 const dmg={...g.state,skins:{version:1,seed:1,slots:{0:{v:1,id:'x'}}}};ensureSkins(dmg);assert.ok(validSkinsState(dmg.skins,dmg.tribes.length));
});

test('live path: skin grammars draw homes, halls and markets inside their footprint and budgets; every other family stays in the Village grammar and is repainted',()=>{
 for(const sid of ['civ:aureline','civ:mekhari','civ:steppan','ember-basalt','civ:skoldar']){
  const skin=skinById(sid);
  for(const type of CARVED_TYPES){
   const plain=carvedBuildingSpec(input(type,null)),spec=carvedBuildingSpec(input(type,skin));assert.ok(spec,type);
   assert.ok(resolvable(spec),`${sid} ${type} materials`);
   if(ROLE_OF_TYPE[type]){assert.ok(spec.family.startsWith('civ.'+skin.grammar+'.'),`${sid} ${type} ${spec.family}`);}
   else{assert.equal(spec.family,plain.family,`${type} keeps its family`);assert.ok(spec.materials?.plaster&&spec.materials.tile,'repainted');}
   const b=specBounds(spec),f=fp(type);assert.ok(b.maxX-b.minX<=f.w+.01&&b.maxZ-b.minZ<=f.d+.01,`${sid} ${type} footprint`);
   const t=[0,1,2].map(i=>specTriangles(spec,i));assert.ok(t[0]<=CAPS.near&&t[1]<=CAPS.mid&&t[2]<=CAPS.far,`${sid} ${type} budget ${t}`);assert.ok(t[2]>0);
  }
 }
});
test('no skin = the plain Village grammar, untouched',()=>{
 for(const type of CARVED_TYPES){const a=carvedBuildingSpec(input(type,null)),b=carvedBuildingSpec(input(type,NEUTRAL_SKIN));assert.deepEqual(a,b);assert.equal(a.materials,undefined);}
});
test('mourning lowers the banners only for a skin grammar, and ruined buildings wear more',()=>{
 const skin=skinById('civ:hanrei'),a=carvedBuildingSpec(input('townhall',skin)),b=carvedBuildingSpec(input('townhall',skin,{mourning:true}));
 assert.notDeepEqual(a.parts,b.parts);assert.ok(specTriangles(b,2)<=specTriangles(a,2)+0,'far tier unchanged');
 const plain=carvedBuildingSpec(input('townhall',null)),plainM=carvedBuildingSpec(input('townhall',null,{mourning:true}));assert.deepEqual(plain,plainM);
 const worn=carvedBuildingSpec(input('house',skin,{condition:.2}));assert.notDeepEqual(worn.parts,carvedBuildingSpec(input('house',skin,{condition:1})).parts);
});
test('era marks and banners reach the live path: a late-era skin hall carries plinth, gate posts and pennants; era 5 adds more than era 2',()=>{
 const skin=skinById('civ:aureline'),n=e=>carvedBuildingSpec(input('townhall',skin,{era:e,id:5})).parts.length;
 assert.ok(n(5)>n(2),'era marks add parts');
 const spec=carvedBuildingSpec(input('townhall',skin,{era:5}));assert.ok(spec.parts.some(p=>p.mat==='aureline.cloth'&&p.size[2]<.1),'banner cloth');
});

test('layer: four societies in one view, each in its own skin, stay instanced and bounded; switching skin rebuilds',()=>{
 const scene=new THREE.Scene(),layer=new CarvedBuildingLayer(scene),cam=new THREE.Vector3(0,40,0);
 const skins=buildSkins(21,4).slots,list=[];let id=1;
 for(const team of [0,1,2,3])for(const type of ['house','house','house','hut','townhall','market','forge','well','temple'])for(let k=0;k<(type==='house'?4:1);k++)list.push({worldSeed:21,type,id:id++,era:3,footprint:fp(type),settlementSeed:team,skin:skins[team],x:team*60+k*9,y:0,z:(id%7)*8,yaw:0});
 layer.sync(list,cam);const s=layer.stats();
 assert.ok(s.drawCalls>0&&s.drawCalls<=list.length/2,'instanced: '+s.drawCalls+' draws for '+list.length+' buildings');assert.ok(s.buckets<=192);
 const first=layer.stats().triangles;
 for(const i of list)i.skin=skins[0];layer.sync(list,cam);assert.ok(layer.stats().triangles>0);assert.notEqual(layer.stats().triangles,first,'a different skin is a different set of meshes');
 layer.dispose();
});
test('layer: a skin building far away is one impostor card, painted from its own palette',()=>{
 const scene=new THREE.Scene(),layer=new CarvedBuildingLayer(scene);
 layer.sync([{worldSeed:2,type:'townhall',id:1,era:3,footprint:fp('townhall'),settlementSeed:0,skin:skinById('civ:sandrill'),x:900,y:0,z:0,yaw:0}],new THREE.Vector3(0,40,0));
 assert.equal(layer.stats().triangles,4);layer.dispose();
});

test('wonders wear their owner\'s skin: unique per record, signature landmark and palette from the skin, within the wonder budget',()=>{
 const rec=(id,family)=>({id,team:0,family,x:0,z:0,w:34,d:34,yaw:0,seed:7,progress:1,era:4,wealth:.7});
 const a=WonderLayer.specFor(rec(1,'assembly'),skinById('civ:aureline')),b=WonderLayer.specFor(rec(1,'assembly'),skinById('civ:sandrill')),c=WonderLayer.specFor(rec(2,'assembly'),skinById('civ:aureline'));
 assert.ok(resolvable(a)&&resolvable(b)&&resolvable(c));assert.notDeepEqual(a.parts,b.parts);assert.notDeepEqual(a.parts,c.parts,'unique per record');
 assert.equal(b.materials['sandrill.wall'].hex,skinById('civ:sandrill').palette.wall.hex);
 const rm=skinFromCiv(generateCiv(5,1,'free')),w=WonderLayer.specFor(rec(3,'observatory'),{...rm,wonder:{signature:'tigrane'}}),w2=WonderLayer.specFor(rec(3,'observatory'),{...rm,wonder:{signature:'steppan'}});
 assert.notDeepEqual(w.parts,w2.parts,'the signature landmark follows the skin');
 for(const fam of ['observatory','terraceGarden','harbor','millMarket','cistern','assembly'])for(const sid of ['civ:aureline','civ:mekhari','ember-basalt']){const sp=WonderLayer.specFor(rec(9,fam),skinById(sid));const t=[0,1,2].map(i=>specTriangles(sp,i));assert.ok(t[0]<=3800&&t[1]<=3300&&t[2]<=1500,`${fam} ${sid} ${t}`);}
 const plain=WonderLayer.specFor(rec(1,'assembly'),null);assert.ok(resolvable(plain),'no skin still draws');
 const scene=new THREE.Scene(),layer=new WonderLayer(scene);layer.sync([rec(1,'assembly')],new THREE.Vector3(0,40,40),()=>skinById('civ:hanrei'),()=>0);assert.equal(layer.stats().wonders,1);layer.dispose();
});

test('skin retint covers people-made materials only; water, fire, foliage and iron are not repainted',()=>{
 const t=villageRetint(skinById('civ:hanrei'));for(const k of ['plaster','stone','woodMid','thatch','tile','cloth'])assert.ok(t[k]);
 for(const k of ['water','fire','foliage','foliageDark','trunk','iron','recess'])assert.equal(t[k],undefined,k);
 assert.equal(villageRetint(NEUTRAL_SKIN),undefined);
 void carvedSwatch;void renderTierForDistance;void partsAtLod;void generateCast;
});
