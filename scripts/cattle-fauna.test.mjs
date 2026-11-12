import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeCattle,CATTLE_RULES} from '../src/game/cattle.ts';
import {herdRules,isDraftSpecies} from '../src/game/animalSpecies.ts';
import {CARCASS_MEAT,wildlifeFleeSpeed} from '../src/game/hunting.ts';

function world(overrides={}){
 let id=100,calls=0;
 const g={state:{seed:42,time:0,weather:'clear',wildlife:[{id:1,species:'goat',x:0,y:5,z:0}]},
  world:{size:500,heights:[5,5],rivers:[],camps:[{team:0,x:0,z:0}],biomes:[{kind:'plains',x:0,z:0}]},
  height:()=>5,waterAt:()=>0,walkable:()=>true,id:()=>id++,
  workBoard:{connected:()=>{calls++;return true;}},...overrides};
 return {g,calls:()=>calls};
}

test('cattle are finite, repeatable fresh fauna without touching terrain, original actors or ambient RNG',()=>{
 const {g}=world(),original=structuredClone(g.state.wildlife),terrain=JSON.stringify(g.world),previous=Math.random;
 Math.random=()=>{throw new Error('Cattle spawning must use its own random stream');};
 try{initializeCattle(g);}finally{Math.random=previous;}
 const cattle=g.state.wildlife.filter(a=>a.species==='cattle');
 assert.equal(cattle.length,CATTLE_RULES.perCamp);assert.equal(g.state.cattleVersion,1);
 assert.deepEqual(g.state.wildlife.slice(0,original.length),original);assert.equal(JSON.stringify(g.world),terrain);
 assert.ok(cattle.every(a=>a.hp===a.maxHp&&a.hp>0&&a.y>g.waterAt(a.x,a.z)+.4&&g.walkable(a.x,a.z)&&g.workBoard.connected(g,0,0,a.x,a.z)&&a.grazing.x===a.x&&a.grazing.z===a.z));
 const second=world().g;initializeCattle(second);assert.deepEqual(g.state.wildlife,second.state.wildlife);
 const saved=structuredClone(g.state.wildlife);initializeCattle(g);assert.deepEqual(g.state.wildlife,saved,'no replenishment on a repeated initialization');
});

test('cattle search rejects water, forest, disconnected, cold, arid and invalid sites within a fixed attempt budget',()=>{
 for(const overrides of [{waterAt:()=>6},{walkable:()=>false},{height:()=>NaN},{height:()=>200},
  {world:{size:500,camps:[{team:0,x:0,z:0}],biomes:[{kind:'forest',x:0,z:0}]}},
  {workBoard:{connected:()=>false}}]){
  const {g}=world(overrides);initializeCattle(g);assert.equal(g.state.wildlife.length,1);assert.equal(g.state.cattleVersion,1);
 }
 const dry=world().g;dry.world.biomes[0].kind='hills';dry.state.weather='drought';initializeCattle(dry);assert.equal(dry.state.wildlife.length,1,'extremely arid uplands cannot host cattle');
 const {g,calls}=world();g.workBoard.connected=()=>{g.probes=(g.probes||0)+1;return false;};initializeCattle(g);
 assert.equal(g.probes,CATTLE_RULES.spawnAttempts);assert.equal(calls(),0);
 const capped=world().g;capped.world.camps=Array.from({length:10},(_,team)=>({team,x:0,z:0}));initializeCattle(capped);
 assert.ok(capped.state.wildlife.filter(a=>a.species==='cattle').length<=CATTLE_RULES.maximumWild);
});

test('cattle have explicit costs, milk, draft capacity and finite meat while other species keep their coefficients',()=>{
 assert.deepEqual(herdRules('cattle'),{places:4,maturity:900,gestation:900,tamingFood:18,tamingSeconds:150,careMultiplier:4,radius:.65,speed:2.4,packMultiplier:3,harnessSeconds:90,harnessWood:8,milkCapacity:12,milkPerSecond:.06});
 assert.equal(CARCASS_MEAT.cattle,60);assert.equal(wildlifeFleeSpeed({species:'cattle',hp:6,maxHp:6}),3.3);
 assert.ok(wildlifeFleeSpeed({species:'cattle',hp:1,maxHp:6})<3.3);
 assert.equal(herdRules('goat').milkCapacity,6);assert.equal(herdRules('goat').milkPerSecond,.025);
 assert.equal(herdRules('sheep').milkCapacity,0);assert.equal(herdRules('horse').milkCapacity,0);
 assert.equal(herdRules('horse').places,3);assert.equal(herdRules('horse').packMultiplier,3.5);
 assert.equal(isDraftSpecies('cattle'),true);assert.equal(isDraftSpecies('horse'),true);assert.equal(isDraftSpecies('goat'),false);
 assert.equal(herdRules('cattle'),herdRules('cattle'));assert.ok(Object.isFrozen(herdRules('cattle')));
});
