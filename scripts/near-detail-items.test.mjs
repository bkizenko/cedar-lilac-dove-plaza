import test from 'node:test';import assert from 'node:assert/strict';
import {buildItem,clearItemCache,itemDef} from '../src/scene/itemModels.ts';
import {NEAR_ITEM} from '../src/scene/itemNear.ts';
const IDS=['spear','handAxe','shield','hoe','bow','bladeSword','sickle','mallet','quiver','standard','spade','pickaxe'];
const req=(id,lod,cond=.6,seed=3)=>({id,era:2,skin:null,condition:cond,seed,lod});
const bytes=m=>Array.from(m.positions).concat(Array.from(m.colors));
test('near item pass adds detail at lod 0 only, within the item budget, finite',()=>{
 for(const id of IDS){
  NEAR_ITEM.enabled=false;clearItemCache();const b=[0,1,2].map(l=>buildItem(req(id,l)).triangles);
  NEAR_ITEM.enabled=true;clearItemCache();const ms=[0,1,2].map(l=>buildItem(req(id,l)));
  assert.ok(ms[0].triangles>b[0],`${id} near ${b[0]} -> ${ms[0].triangles}`);
  assert.ok(ms[0].triangles<=itemDef(id).budget[0],`${id} near ${ms[0].triangles} over budget`);
  assert.ok(ms[0].triangles-b[0]<=1000,`${id} near added ${ms[0].triangles-b[0]}`);
  assert.equal(ms[1].triangles,b[1],`${id} mid unchanged`);assert.equal(ms[2].triangles,b[2],`${id} far unchanged`);
  assert.ok(Array.from(ms[0].positions).every(Number.isFinite)&&Array.from(ms[0].colors).every(Number.isFinite),id);
 }
 NEAR_ITEM.enabled=true;
});
test('near item detail is deterministic and grows with wear',()=>{
 NEAR_ITEM.enabled=true;clearItemCache();const a=bytes(buildItem(req('spear',0)));clearItemCache();assert.deepEqual(bytes(buildItem(req('spear',0))),a);
 const add=c=>{NEAR_ITEM.enabled=false;clearItemCache();const b=buildItem(req('handAxe',0,c)).triangles;NEAR_ITEM.enabled=true;clearItemCache();return buildItem(req('handAxe',0,c)).triangles-b;};
 const w=add(.15),f=add(.98);assert.ok(w>=f,`worn adds ${w}, fresh adds ${f}`);
});
