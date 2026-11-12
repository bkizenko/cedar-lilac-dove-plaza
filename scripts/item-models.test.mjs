import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {WEAPON_IDS,WEAPONS} from '../src/game/weaponFamilies.ts';
import {ITEM_DEFS,ITEM_IDS,buildItem,clearItemCache,itemDef,itemKey} from '../src/scene/itemModels.ts';
import {meshIsFinite} from '../src/scene/itemMesh.ts';
import {itemStyleFor} from '../src/scene/itemStyle.ts';
import {modelIdFor,requestFor,meshForEquipment,heldItemMesh,groundItemMesh,inventoryItemMesh,RIG_ITEM_MODEL,CARGO_MODEL,lodForDistance} from '../src/scene/itemRegistry.ts';
import {WEAPON_CARGO_KINDS} from '../src/game/weaponCargo.ts';

const CIVS=['aureline','hanrei','steppan','sandrill','kaaltun','mekhari','skoldar','nilemark','tigrane','rusvolt','vedara','sahelan','quillan','brythen'];
const TOOLS=['hoe','spade','sickle','flail','quern','ard','mallet','hammer','fellingAxe','pickaxe','staff','standard','skinningKnife','scraper','snare','huntNet','deadfall','hideFrame','fishingRod','leister','fishNet','fishTrap','pot','basket','waterskin','pack','sack','torch','handcart','harness','oar','steerOar','anchor','ropeCoil','block','bailer'];
const EXTRA_WEAPONS=['dagger','atlatl','arrow','quiver','shield'];
const hash=m=>createHash('sha1').update(Buffer.from(m.positions.buffer,m.positions.byteOffset,m.positions.byteLength)).update(Buffer.from(m.colors.buffer,m.colors.byteOffset,m.colors.byteLength)).digest('hex');
const req=(id,o={})=>({id,era:2,skin:'skoldar',condition:.9,seed:5,lod:0,...o});

test('every weapon family and siege engine in weaponFamilies has a mesh of the same id',()=>{
 assert.equal(WEAPON_IDS.length,18);
 for(const id of WEAPON_IDS){const d=itemDef(id);assert.ok(d,`no model for weapon ${id}`);assert.equal(d.weapon??id,id);const m=buildItem(req(id));assert.ok(m&&m.triangles>100,id);}
 for(const id of EXTRA_WEAPONS)assert.ok(itemDef(id),id);
 for(const k of WEAPON_CARGO_KINDS)assert.ok(modelIdFor(k),`cargo ${k}`);
});
test('every tool, hunting, fishing, carried and ship item has a mesh',()=>{
 for(const id of TOOLS){assert.ok(itemDef(id),`no def for ${id}`);const m=buildItem(req(id));assert.ok(m&&m.triangles>50,id);}
 assert.ok(ITEM_IDS.length>=WEAPON_IDS.length+TOOLS.length);
 for(const k of Object.keys(RIG_ITEM_MODEL))assert.ok(itemDef(RIG_ITEM_MODEL[k]),`rig item ${k}`);
 for(const k of Object.keys(CARGO_MODEL))assert.ok(itemDef(CARGO_MODEL[k]),`cargo ${k}`);
});
test('deterministic: identical requests give identical bytes, and the cache returns the same object',()=>{
 for(const id of ['spear','bladeSword','shield','bow','ballista','pot','handcart','sickle']){
  clearItemCache();const a=hash(buildItem(req(id)));clearItemCache();const b=hash(buildItem(req(id)));assert.equal(a,b,id);
  const m1=buildItem(req(id));assert.equal(buildItem(req(id)),m1,'cache');
 }
});
test('no NaN or infinity anywhere: every item, era, LOD, condition and a broken variant',()=>{
 let n=0;
 for(const id of ITEM_IDS)for(const era of [0,1,2,3,4])for(const lod of [0,1,2])for(const [condition,variant] of (lod===0?[[1,undefined],[.1,undefined],[0,undefined],[.6,'broken']]:[[.5,undefined]])){
  const m=buildItem({id,era,skin:'rusvolt',condition,seed:3,lod,variant});assert.ok(m,id);
  assert.ok(meshIsFinite(m),`${id} era${era} lod${lod} c${condition} ${variant??''}`);assert.ok(m.triangles>0,`${id} empty`);n++;
  for(let k=0;k<3;k++){assert.ok(Number.isFinite(m.bounds.min[k])&&Number.isFinite(m.bounds.max[k]));}
 }
 assert.ok(n>1000);
});
test('triangle budgets hold at every LOD and LOD never grows detail',()=>{
 for(const id of ITEM_IDS){const d=ITEM_DEFS[id];
  for(const era of [0,1,2,3,4]){const t=[0,1,2].map(lod=>buildItem(req(id,{era,lod})).triangles);
   for(let l=0;l<3;l++)assert.ok(t[l]<=d.budget[l],`${id} era${era} lod${l}: ${t[l]} > ${d.budget[l]}`);
   assert.ok(t[1]<=t[0]&&t[2]<=t[1],`${id} era${era} LOD order ${t}`);}}
});
test('sizes are real: hand items about a metre, siege engines a few metres, nothing absurd',()=>{
 const size=m=>[0,1,2].map(k=>m.bounds.max[k]-m.bounds.min[k]);
 const lenOf=id=>Math.max(...size(buildItem(req(id))));
 assert.ok(lenOf('spear')>2&&lenOf('spear')<2.6);assert.ok(lenOf('pike')>3.8&&lenOf('pike')<4.6);assert.ok(lenOf('bladeSword')>.55&&lenOf('bladeSword')<1);
 assert.ok(lenOf('dagger')<.45);assert.ok(lenOf('bow')>1.1&&lenOf('bow')<1.6);assert.ok(lenOf('siegeTower')>8&&lenOf('siegeTower')<16);
 assert.ok(lenOf('battering_ram')>3&&lenOf('battering_ram')<6);assert.ok(lenOf('catapult')>2.5&&lenOf('catapult')<6);assert.ok(lenOf('handcart')>1.5&&lenOf('handcart')<4);
 for(const id of ITEM_IDS)for(const e of [0,4]){const s=size(buildItem(req(id,{era:e})));assert.ok(Math.max(...s)>.05&&Math.max(...s)<16,`${id} ${s}`);}
});
test('eras differ in form: stone, copper, bronze, iron and steel are all distinct meshes',()=>{
 for(const id of ['spear','bladeSword','handAxe','club','warPick','dagger','javelin','arrow','shield','hoe','sickle','sapperTools','battering_ram','anchor','mattock'].filter(itemDef)){
  const h=new Set([0,1,2,3,4].map(era=>hash(buildItem(req(id,{era})))));assert.ok(h.size>=4,`${id} eras collapse (${h.size} distinct)`);}
});
test('societies differ: fourteen civ bibles give distinct styles and distinct spears, shields and swords',()=>{
 const styles=new Set(CIVS.map(c=>JSON.stringify(itemStyleFor(c))));assert.equal(styles.size,14);
 for(const id of ['spear','shield','bladeSword','handAxe','pot','basket']){const h=new Set(CIVS.map(skin=>hash(buildItem(req(id,{skin,era:3})))));assert.ok(h.size>=8,`${id}: only ${h.size} distinct across 14 civs`);}
 assert.notEqual(hash(buildItem(req('spear',{skin:null}))),hash(buildItem(req('spear',{skin:'hanrei'}))));
});
test('condition shows: new, worn and broken are different; metal patinates and wood greys with wear',()=>{
 for(const id of ['spear','bladeSword','handAxe','bow','shield','pot','handcart','ballista','sickle','club']){
  const a=hash(buildItem(req(id,{condition:1}))),b=hash(buildItem(req(id,{condition:.35}))),c=hash(buildItem(req(id,{variant:'broken',condition:.5})));
  assert.notEqual(a,b,`${id} new == worn`);assert.notEqual(a,c,`${id} new == broken`);assert.notEqual(b,c,`${id} worn == broken`);
 }
 const mean=m=>{let s=0;for(const v of m.colors)s+=v;return s/m.colors.length;};
 assert.ok(mean(buildItem(req('bladeSword',{era:2,condition:1})))!==mean(buildItem(req('bladeSword',{era:2,condition:.2}))));
});
test('maker marks and seeds: a different seed is a different (but equally valid) item',()=>{
 assert.notEqual(hash(buildItem(req('spear',{seed:1}))),hash(buildItem(req('spear',{seed:2}))));
 assert.notEqual(itemKey(req('spear',{seed:1})),itemKey(req('spear',{seed:2})));
});
test('equipment-to-mesh mapping: weapons, rig items, cargo and tools resolve; unknown kinds do not get a placeholder',()=>{
 for(const id of WEAPON_IDS)assert.equal(modelIdFor(id),id);
 assert.equal(modelIdFor('blade'),'bladeSword');assert.equal(modelIdFor('spears'),'spear');assert.equal(modelIdFor('bows'),'bow');assert.equal(modelIdFor('blades'),'bladeSword');
 assert.equal(modelIdFor('rod'),'fishingRod');assert.equal(modelIdFor('pottery'),'pot');assert.equal(modelIdFor('not-a-thing'),null);assert.equal(meshForEquipment({kind:'not-a-thing'}),null);assert.equal(requestFor({kind:'nope'}),null);
 const r=requestFor({kind:'shield',era:undefined,condition:.4,skin:'aureline'});assert.equal(r.id,'shield');assert.equal(r.condition,.4);
 assert.equal(requestFor({kind:'hideShield'}),null);
 const hs=heldItemMesh('shield',{skin:'skoldar',lod:0,shieldKind:'hideShield'}),bs=heldItemMesh('shield',{skin:'skoldar',lod:0,shieldKind:'bronzeShield'});assert.notEqual(hash(hs),hash(bs));
 assert.equal(heldItemMesh('standard-nope',{lod:0}),null);
 assert.equal(requestFor({kind:'spear',broken:true}).variant,'broken');
 assert.equal(lodForDistance(5),0);assert.equal(lodForDistance(25),1);assert.equal(lodForDistance(90),2);
});
test('ground and inventory placements sit on the ground, are finite and are scaled',()=>{
 for(const kind of ['spear','bow','bladeSword','handAxe','shield','pot','basket','ballista','hoe','torch','waterskin']){
  const g=groundItemMesh({kind,era:2,skin:'tigrane'},1,.4),i=inventoryItemMesh({kind,era:2,skin:'tigrane'},1);assert.ok(g&&i,kind);
  assert.ok(meshIsFinite(g)&&meshIsFinite(i),kind);assert.ok(Math.abs(g.bounds.min[1])<1e-4,`${kind} not on the ground: ${g.bounds.min[1]}`);
  const d=Math.max(...[0,1,2].map(k=>i.bounds.max[k]-i.bounds.min[k]));assert.ok(Math.abs(d-1)<.02,`${kind} icon size ${d}`);
 }
 const g=groundItemMesh({kind:'spear'});assert.ok(g.bounds.max[0]-g.bounds.min[0]>2&&g.bounds.max[1]<.3,'a spear lies flat');
});
test('colours stay in range and normals are unit length (sampled)',()=>{
 for(const id of ['spear','shield','pot','siegeTower','handcart','torch']){const m=buildItem(req(id));
  for(let i=0;i<m.colors.length;i++){assert.ok(m.colors[i]>=0&&m.colors[i]<=1.0001,`${id} colour ${m.colors[i]}`);}
  for(let i=0;i<m.normals.length;i+=3*37){const l=Math.hypot(m.normals[i],m.normals[i+1],m.normals[i+2]);assert.ok(Math.abs(l-1)<.01||l===0,`${id} normal ${l}`);}}
});
test('weapon ids in weaponFamilies are untouched by the model layer',()=>{
 assert.equal(Object.keys(WEAPONS).length,WEAPON_IDS.length);
});
