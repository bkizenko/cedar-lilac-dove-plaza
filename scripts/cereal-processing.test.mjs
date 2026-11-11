import {consumeAndSpoilFood} from '../src/game/pantry.ts';
import{measureVillageWorkload}from'../src/game/villageWorkload.ts';
import{equipBasket}from'../src/game/fibre.ts';import{cachedProductionUnits}from'../src/game/productionOwnership.ts';
import test from'node:test';import assert from'node:assert/strict';import{Game}from'../src/game/sim.ts';import{encodeGame,decodeGame}from'../src/game/persistence.ts';
import{farmWork,calendar}from'../src/game/settlement.ts';import{beginProduction,productionIssue,productionAI,exposedHarvestUnits,deliverProductionCargo,pauseProductionProject,resumeProduction,tickProduction,unloadProductionProject,cerealReservedMaterials,PRODUCTION_RECIPES}from'../src/game/production.ts';
import{CEREAL_RULES,CEREAL_STORAGE_RULES,rawCerealField}from'../src/game/cerealRules.ts';import{harvestBacklogAlert,reviewCerealProcessing,reviewAutomaticFoodProcessing}from'../src/game/cerealProcessing.ts';import{villageStorageReport}from'../src/game/storageReport.ts';
function ground(g){g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];for(const u of g.state.units)u.y=4;for(const b of g.state.buildings)b.y=4;g.rebuildWalk();g.vision.fill(2);}
function fixture(team=0){const g=new Game();g.reset(42,10);g.enterIsland();g.state.units=[];g.state.buildings=[];for(const k of['trees','stones','forage','fish','copper','iron','wildlife'])g.state[k]=[];g.state.autoWorkEnabled=false;g.state.time=950;g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;g.state.conflict='quiet';g.state.encounter=undefined;for(const t of g.state.tribes)t.thinkT=10000;Object.assign(g.tribe(team),{wood:100,stone:100,food:1000,foodLots:{provisions:1000},seeds:12,items:{},cultivated:['grain']});g.state.campSites=team===0?[{team:0,x:0,z:30}]:[{team:0,x:-90,z:30}];g.world.camps.find(c=>c.team===team).x=0;g.world.camps.find(c=>c.team===team).z=30;const hall=g.makeBld('townhall',0,30,team),hearth=g.makeBld('hearth',12,30,team);g.state.buildings=[hall,hearth];if(team!==0){g.state.buildings.push(g.makeBld('townhall',-90,30,0));const spectator=g.spawnUnit('worker',-90,38,0);spectator.order='hold';spectator.jobLock=true;}ground(g);const u=g.spawnUnit('worker',0,36,team),v=g.spawnUnit('worker',2,36,team);for(const p of[u,v]){p.order='hold';p.jobLock=false;}return{g,u,v,hall,hearth};}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){const before=g.state.time;g.state.paused=false;g.step(.1);assert.ok(g.state.time>before,JSON.stringify({time:g.state.time,ended:g.state.ended,encounter:g.state.encounter,banner:g.state.banner}));}assert.deepEqual(g.simulationErrors,[]);}
function batch(g,key,b){assert.equal(beginProduction(g,key,b.id),true,productionIssue(g,key,b.id));const p=g.state.production.projects.at(-1);drive(g,150,()=>['complete','lost'].includes(p.phase));assert.equal(p.phase,'complete',JSON.stringify({p,people:g.state.units.map(u=>({id:u.id,x:u.x,z:u.z,reason:u.workReason}))}));return p;}
function farm(g,team=0){const b=g.makeBld('farm',20,40,team);b.cropType='grain';b.crop={year:0,planted:1,tended:1,remaining:4,ripened:true,kind:'grain',water:1};g.state.buildings.push(b);g.rebuildWalk();return b;}
function toCache(g,u){g.clearSelect();g.selectEntity(u);g.issueMove(0,40);drive(g,30,()=>u.order!=='move');}
test('new marked farm grain travels as finite inedible sheaves; paid threshing/winnowing delivers grain and diverts real seeds once',()=>{
 const{g,u,hearth}=fixture(),field=farm(g);u.x=field.x;u.z=field.z;u.y=4;u.order='gather';u.node=field;const food=g.tribe(0).food,seeds=g.tribe(0).seeds;
 for(let i=0;i<10&&field.crop.remaining;i++)farmWork(g,u,field,.3);
 assert.equal(field.crop.remaining,0);assert.equal(u.itemCargo.grainSheaves,8);assert.equal(u.carry,0);assert.equal(g.tribe(0).food,food);assert.equal(g.tribe(0).seeds,seeds);
 drive(g,80,()=>!u.itemCargo);assert.equal(g.tribe(0).items.grainSheaves,8);assert.equal(g.state.cerealProcessing.deliveredSheaves,8);assert.equal(g.state.simulationEvents?.totals['food_received:0:food']||0,0);
 batch(g,'threshCerealHand',hearth);assert.equal(g.tribe(0).items.grainSheaves,0);assert.equal(g.tribe(0).items.roughGrain,6);assert.equal(g.tribe(0).items.straw,2);assert.equal(g.tribe(0).seeds,seeds);
 batch(g,'winnowCerealHand',hearth);assert.equal(g.tribe(0).items.roughGrain,0);assert.equal(g.tribe(0).items.chaff,2);assert.ok(Math.abs(g.tribe(0).seeds-seeds-.32)<1e-9);assert.ok(Math.abs(g.state.simulationEvents.totals['food_received:0:food']-3.68)<1e-9);assert.equal(g.state.cerealProcessing.cleanedGrain,4);
 assert.ok(Math.abs(3.68+.32+g.tribe(0).items.straw+g.tribe(0).items.chaff-8)<1e-9);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('legacy fields, carried/stored grain, wild sample delivery and non-cereal crops keep their old contract across saves',()=>{
 const{g,u}=fixture(),field=farm(g);delete field.cerealProcessingVersion;g.tribe(0).foodLots={grain:10,provisions:990};u.x=20;u.z=40;u.node=field;u.order='gather';farmWork(g,u,field,1);assert.equal(u.carry,2);assert.equal(u.carryFood,'grain');assert.equal(u.itemCargo,undefined);
 const copy=decodeGame(encodeGame(g)),f=copy.state.buildings.find(b=>b.id===field.id);assert.equal(f.cerealProcessingVersion,undefined);assert.equal(copy.state.units.find(a=>a.id===u.id).carry,2);assert.equal(copy.tribe(0).foodLots.grain,10);
 for(const kind of['pulses','tubers']){const b=farm(g);b.crop.kind=kind;b.cropType=kind;u.carry=0;u.itemCargo=undefined;u.node=b;u.order='gather';farmWork(g,u,b,1);assert.equal(u.carryFood,kind);assert.equal(u.itemCargo,undefined);assert.equal(rawCerealField(b),false);}
 const bad=structuredClone(encodeGame(g));bad.state.buildings.find(b=>b.id===field.id).cerealProcessingVersion=2;assert.throws(()=>decodeGame(bad));assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('pending cereal output reserves cache capacity through paid pauses, parked inputs and replacement; interleaved harvest cannot steal it',()=>{
 const{g,u,v,hearth,hall}=fixture();g.tribe(0).items={grainSheaves:8,plantFibre:92};assert.equal(beginProduction(g,'threshCerealHand',hearth.id,u.id),true);let p=g.state.production.projects[0];assert.equal(cerealReservedMaterials(g,0),8);const before=JSON.stringify(g.state),random=Math.random;let draws=0;Math.random=()=>{draws++;return .5;};try{assert.equal(cerealReservedMaterials(g,0),8);}finally{Math.random=random;}assert.equal(draws,0);assert.equal(JSON.stringify(g.state),before);
 v.itemCargo={grainSheaves:4};assert.equal(deliverProductionCargo(g,v),false);assert.equal(v.itemCargo.grainSheaves,4);const store=g.makeBld('warehouse',-20,30,0);store.build=0;g.state.buildings.push(store);const report=villageStorageReport(g,store);assert.equal(report.materialReserved,8);assert.equal(report.materialUsed,92);
 assert.equal(pauseProductionProject(g,p.id),true);assert.equal(cerealReservedMaterials(g,0),8);const raw=encodeGame(g),saved=decodeGame(raw);assert.equal(cerealReservedMaterials(saved,0),8);
 assert.equal(resumeProduction(g,p.id,u.id),true);drive(g,100,()=>p.phase==='complete');assert.equal(p.phase,'complete');assert.equal(cerealReservedMaterials(g,0),0);assert.equal(g.tribe(0).items.roughGrain,6);assert.equal(deliverProductionCargo(g,v),false,'full actual outputs still occupy the cache');
 assert.equal(beginProduction(g,'winnowCerealHand',hearth.id,u.id),true,productionIssue(g,'winnowCerealHand',hearth.id,u.id));p=g.state.production.projects.at(-1);assert.equal(cerealReservedMaterials(g,0),2);assert.equal(deliverProductionCargo(g,v),true);drive(g,100,()=>p.phase==='complete');assert.equal(p.phase,'complete');assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('rain pauses the same paid winnowing work and strict save; loss releases its reservation without edible or seed refunds',()=>{
 let{g,u,hearth}=fixture();g.tribe(0).items={roughGrain:6};assert.equal(beginProduction(g,'winnowCerealHand',hearth.id,u.id),true);let p=g.state.production.projects[0];drive(g,50,()=>p.phase==='working'&&p.progress>1);const progress=p.progress,seeds=g.tribe(0).seeds;g.state.weather='rain';g.state.weatherT=1000;drive(g,2);assert.equal(p.progress,progress);assert.match(p.blockedReason,/Wet weather/);assert.equal(g.tribe(0).seeds,seeds);g=decodeGame(encodeGame(g));ground(g);p=g.state.production.projects[0];assert.equal(p.progress,progress);g.state.weather='clear';u=g.state.units.find(a=>a.id===p.actorId);u.hp=0;tickProduction(g,0);assert.equal(p.phase,'paused');assert.equal(cerealReservedMaterials(g,0),2);
 const replacement=g.state.units.find(a=>a.hp>0);assert.equal(resumeProduction(g,p.id,replacement.id),true);drive(g,100,()=>p.phase==='complete');assert.equal(p.phase,'complete');assert.equal(g.state.production.metrics.consumed.roughGrain,6);assert.ok(Math.abs(g.tribe(0).seeds-seeds-.32)<1e-9);assert.equal(cerealReservedMaterials(g,0),0);
});
test('hand processing requires player Auto work and empty unlocked hands, while a rival uses the same paid cereal commands',()=>{
 for(const team of[0,1]){const{g,hearth}=fixture(team);g.tribe(team).items={grainSheaves:8};const seeds=g.tribe(team).seeds;if(team===0){assert.equal(reviewCerealProcessing(g,team),false);assert.equal(g.state.production,undefined);g.setAutoWork(true);}else for(const u of g.state.units)u.jobLock=false;
 drive(g,140,()=>g.state.cerealProcessing?.cleanedGrain===4);assert.equal(g.state.cerealProcessing?.cleanedGrain,4,JSON.stringify({team,projects:g.state.production?.projects,people:g.state.units.map(u=>({id:u.id,order:u.order,job:u.jobLock,why:u.workReason}))}));assert.ok(Math.abs(g.tribe(team).seeds-seeds-.32)<1e-9);assert.equal(g.state.production.projects.filter(p=>p.phase==='complete'&&p.team===team).length,2);assert.equal(g.state.production.projects[0].workplace,hearth.id);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));}
});

test('parked paid cereal inputs occupy cache space once, survive replacement pickup and release future output space on real loss',()=>{let{g,u,v,hearth}=fixture();g.tribe(0).items={grainSheaves:8,plantFibre:92};assert.equal(beginProduction(g,'threshCerealHand',hearth.id,u.id),true);let p=g.state.production.projects[0];assert.equal(unloadProductionProject(g,p.id),true);drive(g,30,()=>p.phase==='stored');assert.equal(p.phase,'stored');assert.equal(cachedProductionUnits(g,0),8);assert.equal(cerealReservedMaterials(g,0),0);v.itemCargo={plantFibre:1};assert.equal(deliverProductionCargo(g,v),false);v.itemCargo=undefined;const copy=decodeGame(encodeGame(g));assert.equal(cachedProductionUnits(copy,0),8);assert.equal(cerealReservedMaterials(copy,0),0);assert.equal(resumeProduction(g,p.id,v.id),true);assert.notEqual(p.actorId,u.id);drive(g,80,()=>p.phase==='working');assert.equal(p.phase,'working');assert.equal(cachedProductionUnits(g,0),0);assert.equal(cerealReservedMaterials(g,0),8);hearth.hp=0;tickProduction(g,0);assert.equal(p.phase,'lost');assert.equal(cerealReservedMaterials(g,0),0);assert.equal(g.tribe(0).items.grainSheaves,0);assert.equal(g.state.production.metrics.lost.grainSheaves,8);assert.equal(g.tribe(0).items.roughGrain||0,0);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));});
test('owned basket/sled/cart cereal loads remain strictly saveable at their actual capacity; other material limits are unchanged',()=>{for(const mode of['basket','sled','cart']){const{g,u}=fixture();if(mode==='basket'){g.tribe(0).items={basket:1};assert.equal(equipBasket(g,u.id),true);u.basket.condition=1/24;}else u.haulage=mode;const b=farm(g);b.crop.remaining=100;u.x=20;u.z=40;u.y=4;u.order='gather';u.node=b;for(let i=0;i<100&&u.order!=='return';i++)farmWork(g,u,b,.3);const expected=mode==='basket'?60:mode==='sled'?80:120;assert.equal(u.itemCargo.grainSheaves,expected);assert.doesNotThrow(()=>decodeGame(encodeGame(g)),mode);const bad=structuredClone(encodeGame(g));bad.state.units.find(a=>a.id===u.id).itemCargo.grainSheaves=expected+1;assert.throws(()=>decodeGame(bad));const other=structuredClone(encodeGame(g));other.state.units.find(a=>a.id===u.id).itemCargo={cloth:41};assert.throws(()=>decodeGame(other));if(mode==='basket'){drive(g,100,()=>!u.itemCargo);assert.equal(g.tribe(0).items.grainSheaves,60);assert.equal(u.basket,undefined);assert.equal(g.state.fibre.metrics.basketsWornOut,1);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));}}});
test('automatic cereal work preserves a final free adult during low edible reserves and never unlocks directly assigned farmers',()=>{const{g,u,v,hearth}=fixture();g.tribe(0).food=1;g.tribe(0).foodLots={provisions:1};g.tribe(0).items={grainSheaves:16};g.state.autoWorkEnabled=true;assert.equal(reviewCerealProcessing(g,0,u.id),true);assert.equal(g.state.production.projects.length,1);assert.equal(reviewCerealProcessing(g,0,v.id),false);assert.equal(v.productionProjectId,undefined);assert.equal(g.state.production.projects.length,1);v.jobLock=true;const stock=g.tribe(0).items.grainSheaves;g.state.time+=6;assert.equal(reviewCerealProcessing(g,0),false);assert.equal(v.jobLock,true);assert.equal(g.tribe(0).items.grainSheaves,stock);assert.equal(g.state.production.projects[0].workplace,hearth.id);});

test('cereal workload includes raw backlog and future winnowing of paid batches without double-counting project work or delivery',()=>{const{g,u,hearth}=fixture();g.tribe(0).items={grainSheaves:16,roughGrain:6};assert.equal(beginProduction(g,'threshCerealHand',hearth.id,u.id),true);const p=g.state.production.projects[0];const before=JSON.stringify(g.state);let r=measureVillageWorkload(g);let row=r.tasks.find(t=>t.id==='cereal-backlog:0');assert.equal(row.personSeconds,40+32);assert.equal(r.tasks.filter(t=>t.id===`production:${p.id}`).length,1);assert.equal(JSON.stringify(g.state),before);g.state.production.projects.push(p);r=measureVillageWorkload(g);assert.equal(r.tasks.find(t=>t.id==='cereal-backlog:0').personSeconds,72);assert.equal(r.tasks.filter(t=>t.id===`production:${p.id}`).length,1);p.phase='lost';assert.equal(measureVillageWorkload(g).tasks.find(t=>t.id==='cereal-backlog:0').personSeconds,56);});

test('raw-carrier death loses finite sheaves once even without a completed hearth, and optional cereal save state is strict',()=>{const{g,u}=fixture();g.state.buildings=g.state.buildings.filter(b=>b.type!=='hearth');g.state.production=undefined;const field=farm(g);u.x=20;u.z=40;u.order='gather';u.node=field;for(let i=0;i<20&&field.crop.remaining;i++)farmWork(g,u,field,.3);assert.equal(u.itemCargo.grainSheaves,8);u.hp=0;tickProduction(g,0);assert.equal(g.state.cerealProcessing.lostCarriedSheaves,8);assert.equal(g.state.production.metrics.lost.grainSheaves,8);tickProduction(g,0);assert.equal(g.state.cerealProcessing.lostCarriedSheaves,8);for(const key of['version','harvestedSheaves']){const save=structuredClone(encodeGame(g));save.state.cerealProcessing[key]=-1;assert.throws(()=>decodeGame(save));}});
test('prepared floors keep finite independent two-person batch slots',()=>{const{g,u,v,hearth}=fixture();g.tribe(0).items={grainSheaves:40};batch(g,'threshCerealHand',hearth);const a=g.makeBld('threshingFloor',20,30,0),b=g.makeBld('threshingFloor',32,30,0);g.state.buildings.push(a,b);ground(g);const w=g.spawnUnit('worker',3,36,0);w.order='hold';w.jobLock=false;assert.equal(beginProduction(g,'threshCerealFloor',a.id,u.id),true);assert.equal(beginProduction(g,'threshCerealFloor',a.id,v.id),true);assert.equal(beginProduction(g,'threshCerealFloor',a.id,w.id),false);assert.equal(g.tribe(0).items.grainSheaves,16);assert.equal(beginProduction(g,'threshCerealFloor',b.id,w.id),true);assert.equal(g.tribe(0).items.grainSheaves,8);assert.equal(g.state.production.projects.filter(p=>p.workplace===a.id).length,2);assert.equal(g.state.production.projects.filter(p=>p.workplace===b.id).length,1);drive(g,100,()=>g.state.production.projects.every(p=>p.phase==='complete'));assert.ok(g.state.production.projects.every(p=>p.phase==='complete'));const ledger=g.state.production.metrics;assert.ok(ledger.produced.roughGrain>=24);assert.equal(g.tribe(0).items.roughGrain,ledger.produced.roughGrain-(ledger.consumed.roughGrain||0));assert.equal(g.tribe(0).items.straw,ledger.produced.roughGrain/CEREAL_RULES.roughBatch*CEREAL_RULES.strawPerBatch);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));});

test('Auto work takes a delivered raw catch through paid cooking or smoking, depending on meal reserves', () => {
 for (const {food, expected, kind} of [
  {food: 24, expected: 'cookMeat', kind: 'meat'},
  {food: 1000, expected: 'smokeMeat', kind: 'smokedMeat'},
 ]) {
  const {g, u, v, hearth} = fixture();
  const smokehouse = g.makeBld('smokehouse', -12, 36, 0);
  g.state.buildings.push(smokehouse);
  g.rebuildWalk();
  const tribe = g.tribe(0);
  Object.assign(tribe, {food, foodLots: {provisions: food}, animalProcessingVersion: 1});
  Object.assign(v, {jobLock: true, order: 'hold'});
  g.setAutoWork(true);
  Object.assign(u, {x: 0, z: 48, order: 'return', carry: 5, carryType: 'food', carryFood: 'meat', rawHuntMeat: true});
  const wood = tribe.wood;
  drive(g, 30, () => !!g.state.production?.projects.length);
  const project = g.state.production.projects[0];
  assert.equal(project.recipe, expected);
  assert.equal(project.workplace, expected === 'cookMeat' ? hearth.id : smokehouse.id);
  assert.equal(project.actorId, u.id);
  assert.equal(project.phase, 'carrying');
  assert.equal(tribe.foodLots[kind] ?? 0, 0);
  assert.equal(tribe.wood, wood - 1);
  assert.equal(g.state.production.metrics.consumed.rawMeat, 4);
  drive(g, 100, () => project.phase === 'complete');
  assert.equal(project.phase, 'complete', JSON.stringify(project));
  assert.equal(g.state.production.metrics.edibleFoodProduced, 4);
  assert.ok(tribe.foodLots[kind] > 0);
  assert.equal(v.jobLock, true);
  assert.doesNotThrow(() => decodeGame(encodeGame(g)));
 }
});

test('Auto work delivers harvested grain through threshing, winnowing, grinding and baking, with collected water and fuel', () => {
 const {g, u, v} = fixture();
 const field = farm(g);
 field.crop.remaining = 8;
 const grindingStone = g.makeBld('grindingStone', 12, 45, 0);
 const oven = g.makeBld('oven', -12, 45, 0);
 g.state.buildings.push(grindingStone, oven);
 g.rebuildWalk();
 const tribe = g.tribe(0);
 tribe.survival.waterLiters = 32;
 const wood = tribe.wood;
 const seeds = tribe.seeds;
 Object.assign(v, {jobLock: true, order: 'hold'});
 g.setAutoWork(true);
 Object.assign(u, {x: field.x, z: field.z, y: 4, order: 'gather', node: field});
 for (let i = 0; i < 40 && field.crop.remaining; i++) farmWork(g, u, field, .3);
 assert.equal(u.itemCargo.grainSheaves, 16);
 assert.equal(tribe.foodLots.grain ?? 0, 0);
 drive(g, 420, () => g.state.production?.projects.some(p => p.recipe === 'bakeBreadOven' && p.phase === 'complete'));
 const projects = g.state.production.projects;
 assert.deepEqual(projects.map(p => p.recipe), ['threshCerealHand', 'winnowCerealHand', 'threshCerealHand', 'winnowCerealHand', 'grindGrainStation', 'bakeBreadOven']);
 assert.ok(projects.every(p => p.phase === 'complete'), JSON.stringify(projects));
 assert.equal(projects[4].workplace, grindingStone.id);
 assert.equal(projects[5].workplace, oven.id);
 assert.equal(g.state.production.metrics.grainUsed, 4);
 assert.equal(g.state.production.metrics.consumed.flour, 4);
 assert.equal(g.state.production.metrics.logsUsed, 1);
 assert.equal(g.state.production.metrics.waterUsedLiters, 2);
 assert.equal(tribe.wood, wood - 1);
 assert.ok(Math.abs(tribe.seeds - seeds - .64) < 1e-9);
 assert.ok(tribe.foodLots.bread > 0);
 assert.doesNotThrow(() => decodeGame(encodeGame(g)));
});

test('automatic processing preserves clean grain when water for baking is unavailable', () => {
 const {g} = fixture();
 const tribe = g.tribe(0);
 Object.assign(tribe, {food: 105, foodLots: {grain: 5, provisions: 100}, items: {}});
 tribe.survival.waterLiters = 0;
 drive(g, 6);
 assert.equal(g.state.production.projects.length, 0);
 g.setAutoWork(true);
 drive(g, 6);
 assert.equal(g.state.production.projects.length, 0);
 assert.ok(tribe.foodLots.grain > 4);
});

test('a green threshing floor preview places a paid plan without prior hand-threshing',()=>{
 const {g}=fixture();
 const wood=g.tribe(0).wood;
 assert.equal(g.placementIssue('threshingFloor',32,38),null);
 assert.equal(g.placeBuilding('threshingFloor',32,38),true);
 assert.equal(g.state.buildings.at(-1).type,'threshingFloor');
 assert.equal(g.tribe(0).wood,wood-6);
 assert.match(g.state.banner,/Threshing floor placed/);
});

test('grain workplaces fit beside expanded plots, while their physical footprints stay clear',()=>{
 const {g}=fixture();
 const plot=g.makeBld('farm',40,48,0);
 plot.expansion={w:16.4,d:8.2};
 g.state.buildings.push(plot);
 const stations=[['grindingStone',3,30],['oven',4,39],['threshingFloor',6,48]];
 for(const [type,width,z] of stations){
  const x=40+16.4/2+width/2+.5;
  // Each position is beside an expanded footprint rather than inside it.
  plot.z=z;
  assert.equal(g.placementIssue(type,x,z),null,type);
  assert.match(g.placementIssue(type,x-.6,z),/another building/);
  assert.equal(g.placeBuilding(type,x,z),true,type);
  assert.equal(g.state.buildings.at(-1).x,x);
 }
});

test('a village with a full storehouse unloads real harvest and can turn the exposed backlog into edible grain',()=>{
 const {g,u,v,hearth}=fixture();
 g.state.buildings.push(g.makeBld('warehouse',-20,30,0));
 g.tribe(0).items={plantFibre:100,grainSheaves:200};
 v.itemCargo={grainSheaves:12};
 assert.equal(deliverProductionCargo(g,v),true);
 assert.equal(v.itemCargo,undefined);
 assert.equal(g.tribe(0).items.grainSheaves,212);
 assert.equal(exposedHarvestUnits(g,0),12);
 tickProduction(g,1);
 assert.ok(g.tribe(0).items.grainSheaves<212);
 assert.ok(g.state.production.metrics.spoiled.grainSheaves>0);
 batch(g,'threshCerealHand',hearth);
 batch(g,'winnowCerealHand',hearth);
 assert.ok(g.tribe(0).foodLots.grain>0);
 assert.ok(g.tribe(0).items.plantFibre===100);
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('cooking raw meat can free material space even while exposed cereal remains',()=>{
 const {g,u,hearth}=fixture();
 g.state.buildings.push(g.makeBld('warehouse',-20,30,0));
 g.tribe(0).items={rawMeat:6,grainSheaves:310};
 g.tribe(0).survival.waterLiters=10;
 assert.equal(productionIssue(g,'cookMeat',hearth.id,u.id),null);
 batch(g,'cookMeat',hearth);
 assert.ok(g.tribe(0).foodLots.meat>0);
 assert.ok(g.tribe(0).items.rawMeat<3);
});

test('with Auto work off a ripe field sends grain directly to a floor and then makes bread', () => {
 const {g, u, v} = fixture();
 v.jobLock = true;
 g.state.buildings.push(
  g.makeBld('threshingFloor', 35, 46, 0),
  g.makeBld('grindingStone', 20, 54, 0),
  g.makeBld('oven', 28, 54, 0),
 );
 g.tribe(0).survival = { ...g.tribe(0).survival, waterLiters: 40 };
 ground(g);
 const field = farm(g);
 field.crop.remaining = 8;
 drive(g, 100, () => !!g.state.production?.projects.length);
 const first = g.state.production.projects[0];
 const floor = g.state.buildings.find(b => b.type === 'threshingFloor');
 assert.equal(first.workplace, floor.id);
 assert.equal(first.actorId, u.id);
 assert.ok(g.buildingWorkReached(u, floor));
 assert.ok(Math.hypot(u.x, u.z - 30) > 20, 'first batch starts at the floor, away from the village cache');
 drive(g, 300, () => (g.tribe(0).foodLots?.bread || 0) > 0);
 assert.ok((g.tribe(0).foodLots?.bread || 0) > 0, JSON.stringify(g.state.production));
 const completed = g.state.production.projects.filter(p => p.phase === 'complete').map(p => p.recipe);
 for (const recipe of ['threshCerealFloor', 'winnowCerealFloor', 'grindGrainStation', 'bakeBreadOven']) assert.ok(completed.includes(recipe), recipe);
 assert.equal(g.state.autoWorkEnabled, false);
 assert.equal(v.jobLock, true);
});

test('fresh fish is cooked at the hearth with Auto work off and credits only delivered fish', () => {
 const {g,u,v,hearth} = fixture();
 v.jobLock = true;
 Object.assign(u, {x:0,z:48,order:'return',carry:5,carryType:'food',carryFood:'fish'});
 drive(g, 120, () => g.state.production?.projects.some(p => p.phase === 'complete'));
 const project = g.state.production.projects[0];
 assert.equal(project.recipe, 'cookFish');
 assert.equal(project.workplace, hearth.id);
 assert.equal(g.state.production.metrics.foodInputsUsed.fish, 4);
 assert.ok(g.tribe(0).foodLots.cookedFish > 0);
 assert.doesNotThrow(() => decodeGame(encodeGame(g)));
});

test('emergency grain, fish and meat provide a tenth of their normal value and risky rations can cause illness', () => {
 const {g,u}=fixture();
 const tribe=g.tribe(0);
 Object.assign(tribe,{food:4,foodLots:{provisions:1,grain:3},items:{rawMeat:2}});
 consumeAndSpoilFood(g,0,.5,1);
 assert.ok(tribe.foodLots.grain>2.99,'grain is held back while meals are available');
 Object.assign(tribe,{food:4,foodLots:{grain:2,fish:2},items:{rawMeat:2}});
 const random=Math.random;
 try {
  Math.random=()=>0;
  const deficit=consumeAndSpoilFood(g,0,1,1);
  assert.ok(deficit>.399&&deficit<.401);
  assert.equal(tribe.food,0);
  assert.equal(tribe.items.rawMeat,0);
  assert.ok(u.sickUntil>g.state.time);
 } finally {
  Math.random=random;
 }
});


test('stored cereal spoils measurably after its own grace period and reload preserves the age',()=>{
 let {g}=fixture();
 let tribe=g.tribe(0);
 tribe.items={grainSheaves:24,roughGrain:18};
 const pantryBefore=tribe.food;
 const {coveredGraceSeconds,coveredLossPerSecond}=CEREAL_STORAGE_RULES.grainSheaves;
 tickProduction(g,1);
 const placedAt=g.state.time;
 assert.equal(tribe.itemFreshness.grainSheaves,placedAt);
 g.state.time=placedAt+coveredGraceSeconds;
 tickProduction(g,1);
 assert.equal(tribe.items.grainSheaves,24);
 g=decodeGame(encodeGame(g));
 tribe=g.tribe(0);
 assert.equal(tribe.itemFreshness.grainSheaves,placedAt);
 g.state.time+=100;
 tickProduction(g,100);
 const loss=24*100*coveredLossPerSecond;
 assert.ok(Math.abs(tribe.items.grainSheaves-(24-loss))<1e-9);
 assert.ok(Math.abs(g.state.production.metrics.spoiled.grainSheaves-loss)<1e-9);
 assert.equal(tribe.items.roughGrain,18);
 assert.equal(tribe.food,pantryBefore);
});

test('the urgent harvest alert points to the current bottleneck and clears with the backlog',()=>{
 const {g}=fixture(),tribe=g.tribe(0);
 assert.equal(harvestBacklogAlert(g),null);
 tribe.items={grainSheaves:32};
 assert.match(harvestBacklogAlert(g),/finish a threshing floor/);
 g.state.buildings.push(g.makeBld('threshingFloor',30,35,0));
 assert.match(harvestBacklogAlert(g),/clear route/);
 tribe.items={roughGrain:24};
 g.state.weather='rain';
 assert.match(harvestBacklogAlert(g),/dry weather/);
 g.state.weather='clear';
 tribe.items={flour:4};
 tribe.food=0;
 tribe.foodLots={};
 assert.match(harvestBacklogAlert(g),/finish a bread oven/);
 g.state.buildings.push(g.makeBld('oven',34,35,0));
 tribe.survival.waterLiters=0;
 assert.match(harvestBacklogAlert(g),/collect drinking water/);
 tribe.items={};
 assert.equal(harvestBacklogAlert(g),null);
});

test('the urgent harvest alert prioritizes stored flour over wet grain or a missing threshing floor',()=>{
 const {g}=fixture(),tribe=g.tribe(0);
 tribe.items={flour:4,roughGrain:24,grainSheaves:32};
 tribe.food=5;
 tribe.foodLots={grain:5};
 g.state.weather='rain';
 assert.match(harvestBacklogAlert(g),/finish a bread oven to bake the stored flour/);
 const oven=g.makeBld('oven',28,36,0);
 g.state.buildings.push(oven);
 tribe.survival.waterLiters=0;
 assert.match(harvestBacklogAlert(g),/collect drinking water/);
 tribe.survival.waterLiters=24;
 tribe.wood=0;
 assert.match(harvestBacklogAlert(g),/gather firewood/);
});

test('a village with Auto work off cooks clean grain at a hearth before it has a mill or oven', () => {
 const {g, hearth}=fixture();
 const tribe=g.tribe(0);
 tribe.foodLots={provisions:100,grain:12};
 tribe.food=112;
 tribe.survival.waterLiters=40;
 const initialWood=tribe.wood;
 drive(g,130,()=>g.state.production?.projects.some(p=>p.recipe==='cookPorridge'&&p.phase==='complete'));
 assert.equal(g.state.autoWorkEnabled,false);
 const job=g.state.production.projects.find(p=>p.recipe==='cookPorridge');
 assert.equal(job.workplace,hearth.id);
 assert.equal(job.phase,'complete');
 assert.equal(g.state.production.metrics.grainUsed,4);
 assert.equal(g.state.production.metrics.waterUsedLiters,2);
 assert.equal(tribe.wood,initialWood-1);
 assert.ok(tribe.foodLots.porridge>0);
 assert.ok(decodeGame(encodeGame(g)).tribe(0).foodLots.porridge>0);
});

test('wet weather holds winnowing while workers can still thresh delivered sheaves',()=>{
 const {g}=fixture(),tribe=g.tribe(0),floor=g.makeBld('threshingFloor',14,42,0);
 g.state.buildings.push(floor);
 ground(g);
 g.state.weather='rain';
 tribe.items={grainSheaves:8,roughGrain:6};
 assert.equal(reviewCerealProcessing(g,0),true);
 const project=g.state.production.projects.at(-1);
 assert.equal(project.recipe,'threshCerealFloor');
 assert.equal(tribe.items.roughGrain,6,'the wet batch stays available');
 drive(g,80,()=>project.phase==='complete');
 assert.equal(project.phase,'complete');
 assert.equal(tribe.items.roughGrain,12);
});

test('an off-site grain worker loads a real batch after arriving, including across a save',()=>{
 let {g,u,v}=fixture();
 const floor=g.makeBld('threshingFloor',14,42,0);
 g.state.buildings.push(floor);
 ground(g);
 Object.assign(u,{x:24,z:36});
 Object.assign(v,{x:26,z:36});
 g.tribe(0).items={grainSheaves:8};
 assert.equal(reviewCerealProcessing(g,0),true);
 assert.equal(u.order,'return');
 assert.equal(u.recalled,undefined);
 assert.equal(g.state.production?.projects.length??0,0,'no charge before pickup');
 g=decodeGame(encodeGame(g));ground(g);
 assert.equal(reviewCerealProcessing(g,0),false,'the saved pickup already has a worker');
 assert.notEqual(g.state.units.find(worker=>worker.id===v.id).order,'return');
 drive(g,120,()=>g.state.production?.projects.some(p=>p.recipe==='winnowCerealFloor'&&p.phase==='complete'));
 const projects=g.state.production?.projects??[];
 assert.equal(projects.filter(p=>p.recipe==='threshCerealFloor'&&p.phase==='complete').length,1);
 assert.equal(projects.filter(p=>p.recipe==='winnowCerealFloor'&&p.phase==='complete').length,1);
 assert.ok(g.tribe(0).foodLots.grain>0);
});

test('an unrelated returning carrier cannot block dispatch to bake existing flour',()=>{
 const {g,u,v}=fixture(),tribe=g.tribe(0),oven=g.makeBld('oven',12,44,0);
 g.state.buildings.push(oven);
 ground(g);
 Object.assign(u,{order:'return',carry:5,carryType:'wood',x:60,z:36});
 Object.assign(v,{x:24,z:36});
 tribe.items={flour:4};
 tribe.survival.waterLiters=40;
 assert.equal(reviewAutomaticFoodProcessing(g,0),true);
 assert.equal(v.order,'return');
 assert.equal(v.workReason,'Returning to collect food processing inputs');
 const other=g.spawnUnit('worker',26,36,0);
 g.state.time+=CEREAL_RULES.reviewSeconds;
 assert.equal(reviewAutomaticFoodProcessing(g,0),false);
 assert.notEqual(other.order,'return','one active pickup is enough');
 v.stuckT=CEREAL_RULES.reviewSeconds+1;
 g.state.time+=CEREAL_RULES.reviewSeconds;
 assert.equal(reviewAutomaticFoodProcessing(g,0),true);
 assert.equal(other.order,'return','a stalled pickup frees the dispatch');
 drive(g,140,()=>g.state.production?.projects.some(p=>p.recipe==='bakeBreadOven'&&p.phase==='complete'));
 assert.equal(g.state.production?.metrics.edibleFoodProduced,4);
 assert.equal(g.state.production?.metrics.consumed.flour,4);
});

test('two oven slots and a separate mill process grain in parallel with Auto work off', () => {
 let {g}=fixture();
 const tribe=g.tribe(0);
 const oven=g.makeBld('oven',12,44,0),mill=g.makeBld('grindingStone',20,44,0);
 g.state.buildings.push(oven,mill);
 ground(g);
 for(let i=0;i<5;i++){
  const worker=g.spawnUnit('worker',i*.4,36,0);
  worker.order='hold';
  worker.jobLock=false;
 }
 tribe.food=1016;tribe.foodLots={provisions:1000,grain:16};
 tribe.items={flour:8};
 tribe.survival.waterLiters=60;
 drive(g,30,()=>g.state.production?.projects.length>=3);
 const paid=g.state.production.projects;
 assert.equal(paid.filter(p=>p.workplace===oven.id).length,2);
 assert.equal(paid.filter(p=>p.workplace===mill.id).length,1);
 assert.equal(new Set(paid.map(p=>p.actorId)).size,3);
 assert.ok(paid.every(p=>p.phase==='working'||p.phase==='carrying'));
 assert.equal(g.state.production.metrics.grainUsed,4);
 assert.equal(g.state.production.metrics.consumed.flour,8);
 assert.equal(g.state.production.metrics.logsUsed,2);
 g=decodeGame(encodeGame(g));ground(g);
 assert.equal(g.state.autoWorkEnabled,false);
 const ids=paid.map(p=>p.id);
 drive(g,120,()=>g.state.production.projects.filter(p=>ids.includes(p.id)&&p.phase==='complete').length===3);
 assert.equal(g.state.production.projects.filter(p=>ids.includes(p.id)&&p.phase==='complete').length,3);
 assert.ok(g.tribe(0).foodLots.bread>0);
});

test('delivered mill and oven practice unlocks larger physical batches with paid inputs',()=>{
 let {g}=fixture();
 const tribe=g.tribe(0),oven=g.makeBld('oven',12,44,0),mill=g.makeBld('grindingStone',20,44,0);
 g.state.buildings.push(oven,mill);
 ground(g);
 tribe.food=1040;tribe.foodLots={provisions:1000,grain:40};
 tribe.survival.waterLiters=100;
 assert.match(productionIssue(g,'grindGrainDouble',mill.id),/0\/3/);
 assert.match(productionIssue(g,'bakeBreadDouble',oven.id),/0\/3/);
 const doubled=(recipe)=>g.state.production?.projects.find(p=>p.recipe===recipe);
 drive(g,450,()=>!!doubled('bakeBreadDouble'));
 assert.ok(doubled('grindGrainDouble'));
 const bread=doubled('bakeBreadDouble');
 assert.ok(bread);
 assert.equal(tribe.productionPractice.grindGrainStation.batches,3);
 assert.equal(tribe.productionPractice.bakeBreadOven.batches,3);
 const paidRecipes=g.state.production.projects.map(project=>PRODUCTION_RECIPES[project.recipe]);
 const paid=(amount)=>paidRecipes.reduce((total,recipe)=>total+amount(recipe),0);
 assert.equal(g.state.production.metrics.grainUsed,paid(recipe=>recipe.grain));
 assert.equal(g.state.production.metrics.consumed.flour,paid(recipe=>recipe.inputs.flour||0));
 assert.equal(g.state.production.metrics.logsUsed,paid(recipe=>recipe.wood));
 assert.equal(g.state.production.metrics.waterUsedLiters,paid(recipe=>recipe.water));
 g=decodeGame(encodeGame(g));ground(g);
 drive(g,150,()=>doubled('bakeBreadDouble').phase==='complete');
 assert.equal(doubled('bakeBreadDouble').phase,'complete');
 assert.equal(g.tribe(0).productionPractice.bakeBreadDouble.usefulOutputs,8);
 assert.equal(g.state.autoWorkEnabled,false);
});

test('a practiced threshing floor processes double loads and preserves the exact grain and seed yield through a save',()=>{
 let {g,v}=fixture();
 v.jobLock=true;
 const floor=g.makeBld('threshingFloor',12,44,0);
 g.state.buildings.push(floor);
 ground(g);
 const tribe=g.tribe(0),initialSeed=tribe.seeds;
 tribe.items={grainSheaves:40};
 assert.match(productionIssue(g,'threshCerealFloorDouble',floor.id),/0\/3/);
 assert.match(productionIssue(g,'winnowCerealFloorDouble',floor.id),/0\/3/);
 drive(g,300,()=>g.state.production?.projects.some(p=>p.recipe==='winnowCerealFloorDouble'));
 const job=g.state.production.projects.find(p=>p.recipe==='winnowCerealFloorDouble');
 assert.ok(job);
 assert.equal(g.state.production.metrics.consumed.grainSheaves,40);
 assert.equal(g.state.production.metrics.consumed.roughGrain,30);
 g.state.weather='rain';
 drive(g,2);
 assert.equal(job.progress,0);
 assert.match(job.blockedReason,/Wet weather/);
 g=decodeGame(encodeGame(g));ground(g);
 g.state.weather='clear';
 drive(g,100,()=>g.state.production.projects.find(p=>p.id===job.id).phase==='complete');
 assert.equal(g.state.production.projects.find(p=>p.id===job.id).phase,'complete');
 assert.equal(g.state.cerealProcessing.cleanedGrain,20);
 assert.equal(g.state.production.metrics.produced.chaff,10);
 assert.equal(g.state.production.metrics.produced.straw,10);
 assert.ok(Math.abs(g.tribe(0).seeds-initialSeed-1.6)<1e-9);
});

test('four-load grain processing needs expanded sites and delivered practice, then makes real bread',()=>{
 let {g}=fixture();
 const sites=[
  ['threshCerealFloorBulk','threshCerealFloorDouble',g.makeBld('threshingFloor',14,42,0)],
  ['winnowCerealFloorBulk','winnowCerealFloorDouble',null],
  ['grindGrainBulk','grindGrainDouble',g.makeBld('grindingStone',25,44,0)],
  ['bakeBreadBulk','bakeBreadDouble',g.makeBld('oven',36,44,0)],
 ];
 sites[1][2]=sites[0][2];
 const buildings=[...new Set(sites.map(([, ,building])=>building))];
 g.state.buildings.push(...buildings);
 ground(g);
 const tribe=g.tribe(0);
 assert.match(productionIssue(g,sites[0][0],buildings[0].id),/workplace extension/);
 for(const building of buildings)building.w*=2;
 ground(g);
 assert.match(productionIssue(g,sites[0][0],buildings[0].id),/0\/3/);
 tribe.productionPractice=Object.fromEntries(sites.map(([,prior])=>[prior,{
  batches:3,failedBatches:0,usefulOutputs:24,firstAt:g.state.time-10,lastAt:g.state.time,makers:[g.state.units[0].id],
 }]));
 tribe.items={grainSheaves:96};
 tribe.survival.waterLiters=100;
 drive(g,180,()=>g.state.production?.projects.some(p=>p.recipe==='threshCerealFloorBulk'&&p.phase==='working'));
 assert.ok(g.state.production.projects.some(p=>p.recipe==='threshCerealFloorBulk'));
 g=decodeGame(encodeGame(g));ground(g);
 const bulkKeys=sites.map(([key])=>key);
 drive(g,500,()=>bulkKeys.every(key=>g.state.production?.projects.some(p=>p.recipe===key&&p.phase==='complete')));
 const jobs=g.state.production.projects;
 for(const key of bulkKeys)assert.ok(jobs.some(p=>p.recipe===key&&p.phase==='complete'),key);
 const metrics=g.state.production.metrics;
 assert.equal(metrics.consumed.grainSheaves,jobs.reduce((n,p)=>n+(PRODUCTION_RECIPES[p.recipe].inputs.grainSheaves||0),0));
 assert.equal(metrics.logsUsed,jobs.reduce((n,p)=>n+PRODUCTION_RECIPES[p.recipe].wood,0));
 assert.equal(metrics.waterUsedLiters,jobs.reduce((n,p)=>n+PRODUCTION_RECIPES[p.recipe].water,0));
 assert.ok(g.tribe(0).foodLots.bread>0);
 assert.ok(Math.abs(g.state.cerealProcessing.seedsAllocated-g.state.cerealProcessing.cleanedGrain*CEREAL_RULES.seedFraction)<1e-8);
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('grain workload uses unlocked batch sizes and prices the remainder at the standard rate',()=>{
 const {g,u}=fixture(),tribe=g.tribe(0),floor=g.makeBld('threshingFloor',14,42,0);
 g.state.buildings.push(floor);
 ground(g);
 tribe.items={grainSheaves:40};
 const work=()=>measureVillageWorkload(g).tasks.find(task=>task.id==='cereal-backlog:0').personSeconds;
 assert.equal(work(),100);
 const practice={batches:3,failedBatches:0,usefulOutputs:24,firstAt:g.state.time,lastAt:g.state.time,makers:[u.id]};
 tribe.productionPractice={threshCerealFloor:practice,winnowCerealFloor:practice,threshCerealFloorDouble:practice,winnowCerealFloorDouble:practice};
 assert.equal(work(),80);
 floor.w*=2;
 assert.equal(work(),60);
 assert.equal(tribe.items.grainSheaves,40);
});

test('workload shows clean grain and flour separately and excludes inputs committed to paid work',()=>{
 const {g,u}=fixture(),tribe=g.tribe(0);
 const oven=g.makeBld('oven',14,42,0),mill=g.makeBld('grindingStone',26,42,0);
 g.state.buildings.push(oven,mill);
 ground(g);
 tribe.food=1016;
 tribe.foodLots={grain:16,provisions:1000};
 tribe.items={flour:8};
 tribe.survival.waterLiters=1;
 const rows=()=>measureVillageWorkload(g).tasks;
 assert.equal(rows().find(row=>row.id==='flour-backlog:0').blocker,'Collect drinking water');
 tribe.survival.waterLiters=40;
 assert.equal(rows().find(row=>row.id==='flour-backlog:0').personSeconds,48);
 assert.equal(rows().find(row=>row.id==='clean-grain-backlog:0').personSeconds,96);
 assert.equal(beginProduction(g,'bakeBreadOven',oven.id,u.id),true);
 const after=rows();
 assert.equal(after.find(row=>row.id==='flour-backlog:0').personSeconds,24);
 assert.equal(after.filter(row=>row.id.startsWith('production:')).length,1);
});
