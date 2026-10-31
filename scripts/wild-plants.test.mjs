import {campRaidAI} from '../src/game/raiders.ts';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {initializeWildPlants,tickWildPlant,harvestWildPlant,wildPlantSpecies,wildPlantVisual,wildPlantCapacity,validWildPlantState,WILD_PLANT_SPECIES,WILD_PLANT_RULES} from '../src/game/ecology.ts';
import {WildPlantLayer} from '../src/scene/wildPlants.ts';
function fixture(initialize=true){const g={state:{time:0,seed:42,weather:'clear',units:[],forage:[]},world:{biomes:[{kind:'plains',x:0,z:0}],rivers:[]},height:()=>4,navigationRevision:()=>0,exploredAt:()=>true};let next=1;
 for(const species of WILD_PLANT_SPECIES){let node;do{node={id:next++,kind:'forage',x:g.state.forage.length*3,y:4,z:0,amount:60,maxAmt:60,regenT:0,scale:1,rich:1,...(species.startsWith('wild-')?{cropCandidate:species==='wild-grain'?'grain':species==='wild-pulses'?'pulses':'tubers'}:{})};}while(wildPlantSpecies(g,node)!==species);g.state.forage.push(node);}
 if(initialize)initializeWildPlants(g);return g;
}
const find=(g,s)=>g.state.forage.find(n=>n.wildPlant?.species===s);
function advance(g,to,harvest=false){while(g.state.time<to-1e-8){const dt=Math.min(5,to-g.state.time);g.state.time+=dt;for(const n of g.state.forage){tickWildPlant(g,n,dt);if(harvest)harvestWildPlant(g,n,1000);}}}
function conserved(n){const w=n.wildPlant;assert.ok(Math.abs(w.initialFood+w.grownTotal-w.harvestedTotal-w.lostTotal-n.amount)<1e-6);}
test('new worlds derive distinct species; early standing greens/roots do not make unripe summer fruit harvestable',()=>{
 const g=fixture();assert.equal(new Set(g.state.forage.map(n=>n.wildPlant.species)).size,6);assert.ok(find(g,'spring-greens').amount>0);assert.ok(find(g,'wild-tubers').amount>0);
 for(const s of['summer-berries','autumn-berries','wild-grain','wild-pulses']){const n=find(g,s);assert.equal(n.amount,0);assert.equal(harvestWildPlant(g,n,2),0);assert.equal(wildPlantVisual(g,n).fruitScale,0);}
 const before=JSON.stringify(g.state);initializeWildPlants(g);assert.equal(JSON.stringify(g.state),before,'initializing twice cannot refill a picked plant');
});
test('actual seasonal growth differentiates spring greens, summer and autumn berries, seed crops and winter roots',()=>{
 const g=fixture();advance(g,200);assert.ok(find(g,'spring-greens').amount>15);assert.equal(find(g,'summer-berries').amount,0);assert.equal(find(g,'autumn-berries').amount,0);
 advance(g,750);const summer=find(g,'summer-berries').amount;assert.ok(summer>20);assert.equal(find(g,'autumn-berries').amount,0);assert.ok(find(g,'wild-pulses').amount>0);
 advance(g,1100);assert.ok(find(g,'autumn-berries').amount>20);assert.ok(find(g,'wild-grain').amount>20);advance(g,1750);
 assert.ok(find(g,'summer-berries').amount<summer*.1);assert.ok(find(g,'wild-tubers').amount>10);assert.ok(find(g,'wild-grain').amount>10);
 for(const n of g.state.forage){conserved(n);assert.ok(n.wildPlant.producedThisYear<=wildPlantCapacity(g,n)+1e-6);}assert.equal(validWildPlantState(g.state),true);
});
test('rich harvests consume the exact mature amount, yearly quota prevents instant refills, duplicate/paused ticks produce nothing',()=>{
 const g=fixture();advance(g,800);const n=find(g,'summer-berries'),before=n.amount,harvested=harvestWildPlant(g,n,2);assert.equal(harvested,2);assert.equal(n.amount,before-2);
 const rest=harvestWildPlant(g,n,1e9);assert.ok(rest<=before-2);assert.equal(n.amount,0);const grown=n.wildPlant.grownTotal;
 tickWildPlant(g,n,10);assert.equal(n.wildPlant.grownTotal,grown);tickWildPlant(g,n,0);assert.equal(n.amount,0);
 advance(g,1795,true);assert.ok(n.wildPlant.producedThisYear<=wildPlantCapacity(g,n)+1e-6);const lastYear=n.wildPlant.grownTotal;
 advance(g,1850,true);assert.equal(n.wildPlant.grownTotal,lastYear,'summer berries do not immediately regrow just because a year changed');advance(g,2700,true);assert.ok(n.wildPlant.grownTotal>lastYear);conserved(n);
});
test('weather and harvest pressure reduce actual production, not just plant colors',()=>{
 const clear=fixture(),dry=fixture(),stripped=fixture();dry.state.weather='drought';for(const n of stripped.state.forage)n.pressure=1;
 advance(clear,1250);advance(dry,1250);advance(stripped,1250);
 const c=find(clear,'autumn-berries'),d=find(dry,'autumn-berries'),s=find(stripped,'autumn-berries');assert.ok(d.wildPlant.grownTotal<c.wildPlant.grownTotal*.8);assert.ok(s.wildPlant.grownTotal<c.wildPlant.grownTotal*.6);
 for(const n of[...clear.state.forage,...dry.state.forage,...stripped.state.forage])conserved(n);
});
test('saved seasonal quotas and counters survive reload; malformed stocks fail; legacy forage remains untouched',()=>{
 const g=fixture();advance(g,1000);harvestWildPlant(g,find(g,'wild-grain'),7);const loaded=fixture(false);loaded.state=JSON.parse(JSON.stringify(g.state));assert.equal(validWildPlantState(loaded.state),true);
 const before=loaded.state.forage.map(n=>n.wildPlant.grownTotal);for(const n of loaded.state.forage)tickWildPlant(loaded,n,5);assert.deepEqual(loaded.state.forage.map(n=>n.wildPlant.grownTotal),before);
 advance(g,1250);advance(loaded,1250);assert.deepEqual(loaded.state.forage,g.state.forage);loaded.state.forage[0].wildPlant.grownTotal+=10;assert.equal(validWildPlantState(loaded.state),false);
 const legacy=fixture(false),snapshot=JSON.stringify(legacy.state);assert.equal(tickWildPlant(legacy,legacy.state.forage[0],100),false);assert.equal(JSON.stringify(legacy.state),snapshot);assert.equal(validWildPlantState(legacy.state),true);
});
test('rendered produce instances share actual maturity and disappear after harvest while living foliage remains',()=>{
 const g=fixture(),scene=new THREE.Scene(),layer=new WildPlantLayer(scene,g);let group=scene.getObjectByName('seasonal-wild-plants');
 assert.equal(group.getObjectByName('ripe-produce-summer-berries').count,0);assert.ok(group.getObjectByName('wild-plant-summer-berries').count>0);
 advance(g,800);layer.sync(g);assert.ok(group.getObjectByName('ripe-produce-summer-berries').count>0);const picking=layer.pickingSources().find(s=>s.resourceIds.includes(find(g,'summer-berries').id));assert.equal(picking.mesh.count,picking.resourceIds.length);scene.updateMatrixWorld(true);picking.mesh.computeBoundingSphere();const berry=find(g,'summer-berries'),ray=new THREE.Raycaster(new THREE.Vector3(berry.x,10,berry.z),new THREE.Vector3(0,-1,0));assert.ok(ray.intersectObject(picking.mesh,false).some(hit=>picking.resourceIds[hit.instanceId]===berry.id),'a rendered plant is physically pickable by its real resource ID');const n=find(g,'summer-berries');assert.equal(wildPlantVisual(g,n).harvestableFood,n.amount);harvestWildPlant(g,n,1e9);g.state.time+=1;layer.sync(g);
 assert.equal(group.getObjectByName('ripe-produce-summer-berries').count,0);assert.ok(group.getObjectByName('wild-plant-summer-berries').count>0);layer.dispose();assert.equal(scene.getObjectByName('seasonal-wild-plants'),undefined);
});

test('raider camp harvesting debits the same seasonal conservation ledger while legacy camps retain their ordinary yield',()=>{for(const enabled of[false,true]){const g=fixture(enabled),n=enabled?find(g,'wild-tubers'):g.state.forage[0],camp={id:900,kind:'building',raiderCamp:true,hp:100,x:n.x,z:n.z},u={id:901,team:3,hp:48,homeCamp:camp.id,x:n.x,z:n.z,node:n,carry:0,carryType:null,target:null,order:'hold',wanderT:0,gatherT:0,stuckT:0};g.state.buildings=[camp];g.state.units=[u];g.tribe=()=>({food:0});g.isNight=()=>false;g.walkable=()=>true;g.workBoard={connected:()=>true};const before=n.amount;assert.equal(campRaidAI(g,u,8),true);assert.equal(u.carry,Math.min(5,Math.floor(before)));assert.equal(before-n.amount,u.carry);assert.equal(u.order,'return');if(enabled){assert.equal(n.wildPlant.harvestedTotal,u.carry);conserved(n);}assert.equal(validWildPlantState(g.state),true);}});
