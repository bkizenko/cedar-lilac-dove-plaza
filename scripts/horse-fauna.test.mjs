import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeHorses,HORSE_RULES} from '../src/game/horses.ts';
import {herdRules} from '../src/game/animalSpecies.ts';
import {CARCASS_MEAT,wildlifeFleeSpeed} from '../src/game/hunting.ts';

function world(overrides={}){
 let id=100,calls=0;
 const g={state:{seed:42,time:0,weather:'clear',wildlife:[{id:1,species:'goat',x:0,y:5,z:0}]},
  world:{size:500,heights:[5,5],rivers:[],camps:[{team:0,x:0,z:0}],biomes:[{kind:'plains',x:0,z:0}]},
  height:()=>5,waterAt:()=>0,walkable:()=>true,id:()=>id++,
  workBoard:{connected:()=>{calls++;return true;}},...overrides};
 return {g,calls:()=>calls};
}

test('horses are finite, repeatable fresh fauna without touching terrain, original actors or ambient RNG',()=>{
 const {g}=world(),original=structuredClone(g.state.wildlife),terrain=JSON.stringify(g.world),previous=Math.random;
 Math.random=()=>{throw new Error('Horse spawning must use its own random stream');};
 try{initializeHorses(g);}finally{Math.random=previous;}
 const horses=g.state.wildlife.filter(a=>a.species==='horse');
 assert.equal(horses.length,HORSE_RULES.perCamp);assert.equal(g.state.horseVersion,1);
 assert.deepEqual(g.state.wildlife.slice(0,original.length),original);assert.equal(JSON.stringify(g.world),terrain);
 assert.ok(horses.every(a=>a.hp===a.maxHp&&a.hp>0&&a.y>g.waterAt(a.x,a.z)+.4&&g.walkable(a.x,a.z)&&g.workBoard.connected(g,0,0,a.x,a.z)&&a.grazing.x===a.x&&a.grazing.z===a.z));
 const second=world().g;initializeHorses(second);assert.deepEqual(g.state.wildlife,second.state.wildlife);
 const saved=structuredClone(g.state.wildlife);initializeHorses(g);assert.deepEqual(g.state.wildlife,saved,'no replenishment on a repeated initialization');
});

test('horse search rejects water, forest, disconnected and invalid sites within a fixed attempt budget',()=>{
 for(const overrides of [{waterAt:()=>6},{walkable:()=>false},{height:()=>NaN},
  {world:{size:500,camps:[{team:0,x:0,z:0}],biomes:[{kind:'forest',x:0,z:0}]}},
  {workBoard:{connected:()=>false}}]){
  const {g}=world(overrides);initializeHorses(g);assert.equal(g.state.wildlife.length,1);assert.equal(g.state.horseVersion,1);
 }
 const {g,calls}=world();g.workBoard.connected=()=>{g.probes=(g.probes||0)+1;return false;};initializeHorses(g);
 assert.equal(g.probes,HORSE_RULES.spawnAttempts);assert.equal(calls(),0);
 const capped=world().g;capped.world.camps=Array.from({length:10},(_,team)=>({team,x:0,z:0}));initializeHorses(capped);
 assert.ok(capped.state.wildlife.filter(a=>a.species==='horse').length<=HORSE_RULES.maximumWild);
});

test('species rules retain small herd costs and give horses explicit larger care, pack and finite meat values',()=>{
 assert.deepEqual(herdRules('goat'),herdRules('sheep'));
 assert.deepEqual(herdRules('horse'),{places:3,maturity:600,gestation:600,tamingFood:12,tamingSeconds:120,careMultiplier:3,radius:.55,speed:3.4,packMultiplier:3.5,harnessSeconds:60,harnessWood:6});
 assert.equal(CARCASS_MEAT.horse,48);
 assert.equal(wildlifeFleeSpeed({species:'horse',hp:4,maxHp:4}),4.6);
 assert.ok(wildlifeFleeSpeed({species:'horse',hp:1,maxHp:4})<4.6);
});
