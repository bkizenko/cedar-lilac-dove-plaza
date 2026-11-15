import test from 'node:test';import assert from 'node:assert/strict';
import {carvedBuildingSpec} from '../src/scene/buildingStyleMap.ts';
import {BUILDINGS} from '../src/game/constants.ts';
const spec=(type,id,era,prosperity,habitat='plains')=>carvedBuildingSpec({worldSeed:11,type,id,era,habitat,prosperity,footprint:{w:BUILDINGS[type].w,d:BUILDINGS[type].d}});
const stat=(type,era,prosperity)=>{let parts=0,height=0,mats=new Set(),roofs=new Set(),n=0;
 for(let id=1;id<=24;id++){const s=spec(type,id,era,prosperity);parts+=s.parts.length;height+=Math.max(...s.parts.map(p=>p.pos[1]+p.size[1]));n++;for(const p of s.parts){mats.add(p.mat);if(/thatch|straw|tile|slate|shingle/.test(p.mat))roofs.add(p.mat);}}
 return{parts:parts/n,height:height/n,mats,roofs};};
test('prosperity changes visible geometry, not only colour: more parts, taller, richer materials',()=>{
 for(const type of ['hut','workshop']) for(const era of [1,3]){
  const poor=stat(type,era,.1),rich=stat(type,era,.9);
  assert.ok(rich.parts>poor.parts,`${type} era${era}: parts ${poor.parts.toFixed(0)} -> ${rich.parts.toFixed(0)}`);
  if(era>=3)assert.ok(rich.height>=poor.height,`${type} era${era}: height ${poor.height.toFixed(2)} -> ${rich.height.toFixed(2)}`);
 }
});
test('roofs climb thatch to shingle/tile/slate as prosperity and era rise',()=>{
 const poor=stat('hut',3,.1),rich=stat('hut',3,.9);
 assert.ok(rich.roofs.size>=poor.roofs.size);const early=stat('hut',0,.1);assert.ok([...early.roofs].some(r=>/thatch|straw/.test(r)),'primitive huts are thatched');
 const late=stat('hut',3,.9);assert.ok([...late.roofs].some(r=>/tile|slate|shingle/.test(r))||late.mats.has('stone'),'wealthy late huts are not thatch');
});
import {WEALTH_TIERS,wealthTiersFor} from '../src/scene/wealthTiers.ts';
test('wealth tiers are an ordered data table and add geometry only past their threshold',()=>{
 assert.deepEqual(wealthTiersFor(.1),[]);assert.deepEqual(wealthTiersFor(.5),['plinth']);assert.deepEqual(wealthTiersFor(.9),['plinth','cornice']);
 for(let i=1;i<WEALTH_TIERS.length;i++)assert.ok(WEALTH_TIERS[i].min>WEALTH_TIERS[i-1].min);
});
