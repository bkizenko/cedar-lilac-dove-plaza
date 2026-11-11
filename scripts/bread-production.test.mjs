import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/game/sim.ts';import {BUILDINGS} from '../src/game/constants.ts';import {beginProduction,productionIssue,productionSlots,PRODUCTION_RECIPES,resumeProduction,pauseProductionProject,tickProduction} from '../src/game/production.ts';import {foodInventory,consumeAndSpoilFood,FOOD_NOURISHMENT,EMERGENCY_RATIONS} from '../src/game/pantry.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';import {craftingBenches,craftingEffort,craftingWorkplaceRate} from '../src/game/crafting.ts';
function ground(g){g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.world.waterHeights=undefined;for(const u of g.state.units)u.y=4;for(const b of g.state.buildings)b.y=4;g.rebuildWalk();g.vision.fill(2);}
function fixture(){const g=new Game();g.reset(42,10);g.enterIsland();g.state.autoWorkEnabled=false;g.state.units=g.state.units.filter(u=>u.team===0);g.state.buildings=[];g.state.campSites=[{team:0,x:0,z:30}];g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.conflict='quiet';g.state.visitorTimer=900;g.state.encounter=undefined;g.state.contacts=[];for(const k of ['trees','forage','stones','copper','iron','fish','wildlife'])g.state[k]=[];for(const t of g.state.tribes)t.thinkT=10000;for(const[i,u]of g.state.units.entries())Object.assign(u,{x:i*.4,z:30,order:'hold',jobLock:true});const neighbor=g.spawnUnit('worker',100,100,1);neighbor.order='hold';neighbor.jobLock=true;g.state.buildings.push(g.makeBld('townhall',100,100,1));Object.assign(g.tribe(0),{food:120,foodLots:{grain:16,provisions:104},wood:60,stone:24,items:{}});g.tribe(0).survival.waterLiters=24;const hearth=g.makeBld('hearth',12,30,0);g.spend(0,{wood:BUILDINGS.hearth.wood,stone:BUILDINGS.hearth.stone});g.state.buildings.push(hearth);ground(g);return{g,hearth};}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.state.paused=false;const before=g.state.time;g.step(.2);assert.ok(g.state.time>before,'Scenario must remain active');}assert.deepEqual(g.simulationErrors,[]);}
test('manual hearth physically grinds actual grain into distinct delivered flour, then bakes water/fuel-paid bread with no food multiplication',()=>{const{g,hearth}=fixture(),t=g.tribe(0),food=t.food; t.foodLots={grain:4,provisions:food-4};const grain=foodInventory(t).grain;assert.equal(beginProduction(g,'grindGrain',hearth.id),true);assert.equal(foodInventory(t).grain,grain-4);assert.equal(t.food,food-4);assert.equal(t.items.flour||0,0);const p=g.state.production.projects[0];p.blockedReason='No reachable workplace entrance';drive(g,1);assert.equal(p.blockedReason,'','A usable route clears the previous blocker');assert.equal(t.items.flour||0,0,'No output while walking');drive(g,180,()=>p.phase==='complete');assert.equal(p.phase,'complete');assert.equal(t.items.flour,4);assert.equal(g.state.production.metrics.grainUsed,4);const wood=t.wood,water=t.survival.waterLiters;assert.equal(beginProduction(g,'bakeBread',hearth.id),true);assert.equal(t.items.flour,0);assert.equal(t.wood,wood-1);assert.equal(t.survival.waterLiters,water-2);assert.equal(foodInventory(t).bread,0);const bake=g.state.production.projects.at(-1);drive(g,180,()=>bake.phase==='complete');assert.equal(bake.phase,'complete');assert.equal(g.state.production.metrics.edibleFoodProduced,4);assert.equal(g.state.simulationEvents.totals['food_received:0:food'],4);assert.ok(foodInventory(t).bread>0&&foodInventory(t).bread<=4);assert.equal(g.state.production.metrics.consumed.flour,4);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));});
test('paid grain work survives a saved interruption and replacement maker without another grain debit',()=>{let{g,hearth}=fixture();beginProduction(g,'grindGrain',hearth.id);drive(g,80,()=>g.state.production.projects[0].phase==='working'&&g.state.production.projects[0].progress>2);let p=g.state.production.projects[0];const former=p.actorId,progress=p.progress;assert.equal(pauseProductionProject(g,p.id),true);assert.equal(p.actorId,null);const grain=foodInventory(g.tribe(0)).grain;g=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));ground(g);p=g.state.production.projects[0];assert.equal(p.progress,progress);g.state.units.find(u=>u.id===former).order='move';assert.equal(resumeProduction(g,p.id),true);assert.notEqual(p.actorId,former);assert.equal(foodInventory(g.tribe(0)).grain,grain);assert.equal(g.state.production.metrics.grainUsed,4);drive(g,180,()=>p.phase==='complete');assert.equal(p.phase,'complete');assert.equal(g.tribe(0).items.flour,4);});
test('paid dedicated stations automatically grind and bake with Auto work off and no hearth',()=>{
 const {g}=fixture(),t=g.tribe(0);
 t.foodLots={provisions:t.food};
 g.state.buildings=g.state.buildings.filter(b=>b.type!=='hearth');
 g.rebuildWalk();
 const wood=t.wood,stone=t.stone;
 for(const [type,x] of [['grindingStone',10],['oven',20]]){
  assert.equal(g.placeBuilding(type,x,48),true,g.state.banner);
  const b=g.state.buildings.find(b=>b.type===type);
  assert.equal(b.build,0);
  g.clearSelect();
  g.selectEntity(g.state.units.find(u=>u.team===0&&!u.buildOrder));
  g.orderConstruction(b);
  drive(g,80,()=>g.finished(b));
  assert.ok(g.finished(b));
 }
 assert.equal(t.wood,wood-BUILDINGS.grindingStone.wood-BUILDINGS.oven.wood);
 assert.equal(t.stone,stone-BUILDINGS.grindingStone.stone-BUILDINGS.oven.stone);
 const grinding=g.state.buildings.find(b=>b.type==='grindingStone');
 const oven=g.state.buildings.find(b=>b.type==='oven');
 assert.equal(productionSlots(grinding),1);
 assert.equal(productionSlots(oven),2);
 assert.ok(PRODUCTION_RECIPES.grindGrainStation.workSeconds<PRODUCTION_RECIPES.grindGrain.workSeconds);
 assert.ok(PRODUCTION_RECIPES.bakeBreadOven.workSeconds<PRODUCTION_RECIPES.bakeBread.workSeconds);
 for(const u of g.state.units.filter(u=>u.team===0&&!u.buildOrder))u.jobLock=false;
 t.foodLots={grain:4.25,provisions:t.food-4.25};
 const recipeJob=(recipe)=>g.state.production?.projects.find(p=>p.recipe===recipe);
 drive(g,180,()=>recipeJob('grindGrainStation')?.phase==='complete');
 const mill=recipeJob('grindGrainStation');
 assert.equal(mill?.workplace,grinding.id);
 assert.equal(mill.phase,'complete');
 assert.equal(g.state.production.metrics.grainUsed,4);
 assert.equal(g.state.production.metrics.produced.flour,4);
 drive(g,40,()=>!!recipeJob('bakeBreadOven'));
 const bake=recipeJob('bakeBreadOven');
 assert.equal(bake?.workplace,oven.id);
 assert.equal(t.items.flour,0);
 assert.equal(g.state.production.metrics.consumed.flour,4);
 assert.equal(g.state.production.metrics.logsUsed,PRODUCTION_RECIPES.bakeBreadOven.wood);
 assert.equal(g.state.production.metrics.waterUsedLiters,PRODUCTION_RECIPES.bakeBreadOven.water);
 assert.equal(foodInventory(t).bread,0);
 drive(g,180,()=>bake.phase==='complete');
 assert.equal(bake.phase,'complete');
 assert.equal(g.state.production.metrics.edibleFoodProduced,4);
 assert.equal(g.state.simulationEvents.totals['food_received:0:food'],4);
 assert.equal(g.state.autoWorkEnabled,false);
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('generic provisions cannot stand in for grain; flour expires whole; a lost bread carrier never credits meals',()=>{const{g,hearth}=fixture();g.tribe(0).foodLots={provisions:120};assert.match(productionIssue(g,'grindGrain',hearth.id),/actual grain/);g.tribe(0).items={flour:4};g.tribe(0).itemFreshness={flour:0};g.state.time=3601;tickProduction(g,0);assert.equal(g.tribe(0).items.flour,0);assert.equal(g.state.production.metrics.spoiled.flour,4);g.tribe(0).items={flour:4};assert.equal(beginProduction(g,'bakeBread',hearth.id),true);drive(g,100,()=>g.state.production.projects[0].phase==='returning');const p=g.state.production.projects[0],u=g.state.units.find(u=>u.id===p.actorId);u.hp=0;drive(g,.2);assert.equal(p.phase,'lost');assert.equal(g.state.production.metrics.edibleFoodLost,4);assert.equal(g.state.production.metrics.edibleFoodProduced,0);assert.equal(foodInventory(g.tribe(0)).bread,0);assert.equal(g.state.simulationEvents?.totals['food_received:0:food']||0,0);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));});
test('a crafting shelter has three real benches and a measured hands-on advantage while practice tracks actual labor seconds',()=>{const{g}=fixture(),hall=g.makeBld('townhall',0,0,0),shelter=g.makeBld('workshop',20,0,0),a=g.state.units[0],b=g.state.units[1];a.craftingXP=0;b.craftingXP=0;assert.equal(craftingBenches(hall),1);assert.equal(craftingBenches(shelter),3);assert.equal(craftingWorkplaceRate(shelter),1.25);const ordinary=craftingEffort(a,8,hall),covered=craftingEffort(b,8,shelter);assert.equal(covered,ordinary*1.25);assert.equal(a.craftingXP,8);assert.equal(b.craftingXP,8);});

test('bread provides normal nourishment while raw grain is reserved for emergencies',()=>{
 const {g}=fixture();
 const measured=(foodLots)=>{
  g.state.tribes[0]={...g.tribe(0),food:12,foodLots};
  const before=g.state.simulationEvents?.totals['food_consumed:0:food']??0;
  assert.equal(consumeAndSpoilFood(g,0,1,1),0,'stock covers the meal demand');
  return g.state.simulationEvents.totals['food_consumed:0:food']-before;
 };
 assert.equal(FOOD_NOURISHMENT.bread,1.2);
 assert.equal(EMERGENCY_RATIONS.nourishment,.1);
 const rawEaten=measured({grain:12}),breadEaten=measured({bread:12});
 assert.ok(Math.abs(rawEaten-10)<1e-9);
 assert.ok(Math.abs(breadEaten-1/1.2)<1e-9);
 measured({provisions:2,grain:10});
 assert.ok(foodInventory(g.tribe(0)).grain>9.99,'ordinary meals leave raw grain for processing apart from spoilage');
});
test('paused paid grain and flour batches age and expire without refund, output or a second debit',()=>{for(const[recipe,life]of [['grindGrain',7200],['bakeBread',3600]]){const{g,hearth}=fixture();if(recipe==='bakeBread')g.tribe(0).items={flour:4};assert.equal(beginProduction(g,recipe,hearth.id),true);const p=g.state.production.projects[0];assert.equal(pauseProductionProject(g,p.id),true);const food=g.tribe(0).food,wood=g.tribe(0).wood;g.state.time=life+1;tickProduction(g,0);assert.equal(p.phase,'lost');assert.match(p.blockedReason,/spoiled/);assert.equal(g.tribe(0).food,food);assert.equal(g.tribe(0).wood,wood);assert.equal(g.state.production.metrics.edibleFoodProduced,0);assert.equal(g.tribe(0).items.flour||0,0);if(recipe==='grindGrain')assert.equal(g.state.production.metrics.grainLost,4);else assert.equal(g.state.production.metrics.lost.flour,4);}});
