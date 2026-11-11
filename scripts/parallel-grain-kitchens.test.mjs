import test from 'node:test';import assert from 'node:assert/strict';
import{Game}from'../src/game/sim.ts';import{reviewAutomaticFoodProcessing}from'../src/game/cerealProcessing.ts';import{PRODUCTION_RECIPES,pauseProduction}from'../src/game/production.ts';import{foodDemand}from'../src/game/settlement.ts';import{encodeGame,decodeGame}from'../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.state.units=[];g.state.buildings=[];for(const k of['trees','stones','forage','fish','copper','iron','wildlife'])g.state[k]=[];g.state.autoWorkEnabled=false;g.state.laborPolicy='food';g.state.time=950;g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;g.state.conflict='quiet';g.state.encounter=undefined;for(const t of g.state.tribes)t.thinkT=10000;g.state.campSites=[{team:0,x:0,z:30}];Object.assign(g.tribe(0),{wood:100,stone:100,food:24,foodLots:{fish:24},items:{},seeds:12});g.tribe(0).survival.waterLiters=100;g.state.buildings.push(g.makeBld('townhall',0,30,0));const sites=[];for(let i=0;i<6;i++){const b=g.makeBld('hearth',14+(i%3)*8,32+Math.floor(i/3)*10,0);g.state.buildings.push(b);sites.push(b);}for(const b of g.state.buildings)b.y=4;g.rebuildWalk();g.vision.fill(2);const people=[];for(let i=0;i<12;i++){const u=g.spawnUnit('worker',(i%3)*.2,36+(i%2)*.2,0);u.order='hold';u.jobLock=false;u.y=4;people.push(u);}return {g,people,sites};}

function pipeline(auto){const f=fixture(),{g}=f;g.state.autoWorkEnabled=auto;g.tribe(0).food=800;g.tribe(0).foodLots={fish:400,grain:400};for(let i=0;i<2;i++)g.state.buildings.push(g.makeBld('grindingStone',-12-i*8,42,0),g.makeBld('oven',-12-i*8,54,0));g.rebuildWalk();return f;}
for(const auto of[false,true])test(`ordinary simulation runs fish kitchens and dedicated grain/bread stages together with Auto work ${auto}`,()=>{
 const {g}=pipeline(auto);g.state.paused=false;for(let i=0;i<60;i++)g.step(.1);
 assert.ok(g.state.production.projects.some(p=>p.recipe==='cookFish'));assert.ok(g.state.production.projects.some(p=>PRODUCTION_RECIPES[p.recipe].workplace==='grindingStone'),'quick fish inputs must not suppress separate mills');
 const end=g.state.time+180;while(g.state.time<end&&!g.state.production.projects.some(p=>PRODUCTION_RECIPES[p.recipe].foodKind==='bread'&&p.phase==='complete')){g.step(.1);assert.deepEqual(g.simulationErrors,[]);}
 const jobs=g.state.production.projects;assert.ok(jobs.some(p=>p.recipe==='cookFish'&&p.phase==='complete'));assert.ok(jobs.some(p=>PRODUCTION_RECIPES[p.recipe].foodKind==='bread'&&p.phase==='complete'),'delivered flour must actually reach an oven and baked bread return to stores');
 assert.ok(g.state.production.metrics.grainUsed>0);assert.ok(g.state.production.metrics.foodInputsUsed.fish>0);assert.ok(g.state.production.metrics.consumed.flour>0);assert.ok(g.state.production.metrics.produced.flour>0);assert.ok(g.tribe(0).foodLots.fish>4,'parallel grain did not require exhausting fish first');assert.equal(g.state.autoWorkEnabled,auto);
 const active=jobs.filter(p=>p.actorId!==null&&!['complete','lost','paused','stored'].includes(p.phase));assert.equal(new Set(active.map(p=>p.actorId)).size,active.length,'one real actor per paid activity');assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('stored flour and paid milling outputs bound new grinding without blocking cooks or consuming extra grain',()=>{
 const {g}=pipeline(false);g.tribe(0).items.flour=64;const grain=g.tribe(0).foodLots.grain;reviewAutomaticFoodProcessing(g,0);g.state.time+=5;reviewAutomaticFoodProcessing(g,0);g.state.time+=5;reviewAutomaticFoodProcessing(g,0);assert.ok(g.state.production.projects.some(p=>p.recipe==='cookFish'));assert.ok(g.state.production.projects.every(p=>PRODUCTION_RECIPES[p.recipe].workplace!=='grindingStone'),'already ample flour needs baking, not grinding the whole harvest');assert.equal(g.tribe(0).foodLots.grain,grain);
});
test('sixty adults can staff twenty real urgent kitchens rather than an absolute twelve-worker ceiling',()=>{
 const {g,people}=fixture();g.tribe(0).food=400;g.tribe(0).foodLots={fish:400};for(let i=people.length;i<60;i++){const u=g.spawnUnit('worker',0+(i%3)*.2,36+(i%2)*.2,0);u.order='hold';u.jobLock=false;}
 for(let i=6;i<20;i++)g.state.buildings.push(g.makeBld('hearth',14+(i%3)*8,32+Math.floor(i/3)*10,0));g.rebuildWalk();g.state.paused=false;g.step(.1);const jobs=g.state.production.projects.filter(p=>p.recipe==='cookFish');assert.equal(jobs.length,20);assert.equal(new Set(jobs.map(p=>p.actorId)).size,20);assert.equal(g.state.production.metrics.foodInputsUsed.fish,80);
 assert.ok(foodDemand(g,0)>0);assert.ok(20*4/PRODUCTION_RECIPES.cookFish.workSeconds>foodDemand(g,0),'existing recipe output capacity, without travel, must be capable of meeting real demand');
});

test('independent stages preserve a manually paused paid mill batch and its grain custody',()=>{
 const {g}=pipeline(false);g.state.paused=false;for(let i=0;i<60;i++)g.step(.1);const p=g.state.production.projects.find(p=>PRODUCTION_RECIPES[p.recipe].workplace==='grindingStone');assert.ok(p);const maker=g.state.units.find(u=>u.id===p.actorId);assert.equal(pauseProduction(g,maker,'manual'),true);const id=p.id,heldGrain=g.tribe(0).foodLots.grain,charged=g.state.production.metrics.grainUsed;
 g.state.time+=5;reviewAutomaticFoodProcessing(g,0);assert.equal(p.phase,'paused');assert.equal(p.pauseCause,'manual');assert.equal(g.state.production.projects.filter(q=>q.id===id).length,1);assert.equal(g.tribe(0).foodLots.grain,heldGrain-(g.state.production.metrics.grainUsed-charged),'every charged grain unit remains reserved exactly once');assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

function distantBerries(g,people){
 for(const [i,u]of people.entries()){
  const node={id:g.id(),kind:'forage',x:98+(i%2),z:36+Math.floor(i/2)*3,y:4,amount:500,maxAmt:500,regenT:0,rich:1,scale:1};g.state.forage.push(node);
  Object.assign(u,{x:node.x,z:node.z,y:4,order:'gather',job:'food',node,jobLock:false});
 }
 g.rebuildWalk();
}
test('ordinary urgent food review recalls an empty unlocked distant berry gatherer for existing fish/grain stations',()=>{
 const {g,people}=pipeline(true);distantBerries(g,people);people[1].jobLock=true;people[2].carry=3;people[2].carryType='food';people[2].carryFood='berries';
 const direct=people[1].node,loaded=people[2].node;g.state.paused=false;g.step(.1);
 assert.equal(people[0].order,'return');assert.match(people[0].workReason,/collect food processing inputs/);assert.equal(people[1].jobLock,true);assert.equal(people[1].node,direct);assert.equal(people[1].productionProjectId,undefined);assert.equal(people[2].node,loaded);assert.ok(people[2].carry>=3);assert.equal(people[2].productionProjectId,undefined);
 const end=g.state.time+240;
 while(g.state.time<end&&!g.state.production?.projects.some(p=>p.recipe.startsWith('bakeBread')&&p.phase==='complete')){g.step(.1);assert.deepEqual(g.simulationErrors,[]);}
 assert.ok(g.state.production.projects.some(p=>p.recipe==='cookFish'&&p.phase==='complete'));assert.ok(g.state.production.projects.some(p=>p.recipe.startsWith('bakeBread')&&p.phase==='complete'),'stored grain reaches actual milling/baking instead of every adult remaining on distant berries');assert.ok(g.tribe(0).foodLots.fish>4);assert.equal(people[1].jobLock,true);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('distant berry work remains intact when no usable cooking or grain infrastructure exists',()=>{
 const {g,people}=pipeline(true);distantBerries(g,people);g.state.buildings=g.state.buildings.filter(b=>b.type==='townhall');g.rebuildWalk();const nodes=people.map(u=>u.node);g.state.paused=false;g.step(.1);
 assert.ok(!g.state.production?.projects.length);for(const [i,u]of people.entries()){assert.equal(u.order,'gather');assert.equal(u.node,nodes[i]);assert.equal(u.productionProjectId,undefined);}
});
test('urgent processing cannot recall directly locked berry gatherers even when every station is idle',()=>{
 const {g,people}=pipeline(true);distantBerries(g,people);for(const u of people)u.jobLock=true;const nodes=people.map(u=>u.node);g.state.paused=false;g.step(.1);
 assert.ok(!g.state.production?.projects.length);for(const [i,u]of people.entries()){assert.equal(u.order,'gather');assert.equal(u.node,nodes[i]);assert.equal(u.jobLock,true);assert.equal(u.productionProjectId,undefined);}
});
