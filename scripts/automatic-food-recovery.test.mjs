import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginProduction,pauseProduction,pauseProductionProject,resumeProduction,unloadProductionProject,productionAI,tickProduction,itemCapacity,outsideFoodCache} from '../src/game/production.ts';
import {reviewAutomaticFoodProcessing} from '../src/game/cerealProcessing.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function ground(g){g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];for(const u of g.state.units)u.y=4;for(const b of g.state.buildings)b.y=4;g.rebuildWalk();g.vision.fill(2);}
function fixture(){const g=new Game();g.reset(42,10);g.enterIsland();g.state.units=[];g.state.buildings=[];for(const k of ['trees','stones','forage','fish','copper','iron','wildlife'])g.state[k]=[];g.state.autoWorkEnabled=false;g.state.time=950;g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;g.state.conflict='quiet';g.state.encounter=undefined;for(const t of g.state.tribes)t.thinkT=10000;Object.assign(g.tribe(0),{wood:100,stone:100,food:1000,foodLots:{provisions:1000},seeds:12,items:{}});g.state.campSites=[{team:0,x:0,z:30}];const hall=g.makeBld('townhall',0,30,0),hearth=g.makeBld('hearth',12,30,0);g.state.buildings=[hall,hearth];ground(g);const a=g.spawnUnit('worker',0,36,0),b=g.spawnUnit('worker',2,36,0);for(const u of[a,b]){u.order='hold';u.jobLock=false;}return {g,a,b,hearth};}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.state.paused=false;const before=g.state.time;g.step(.1);assert.ok(g.state.time>before,'scenario remains running');assert.deepEqual(g.simulationErrors,[]);} }

test('hearth alone automatically harvests, threshes, winnows, grinds and bakes with Auto work off, through save reload',()=>{
 let {g}=fixture();g.tribe(0).cultivated=['grain'];const field=g.makeBld('farm',20,40,0);field.cropType='grain';field.cerealProcessingVersion=1;field.crop={year:0,planted:1,tended:1,remaining:8,ripened:true,kind:'grain',water:1};g.state.buildings.push(field);ground(g);
 drive(g,260,()=>g.state.production?.projects.some(p=>p.recipe==='grindGrain'));
 assert.ok(g.state.production.projects.some(p=>p.recipe==='grindGrain'));
 g=decodeGame(encodeGame(g));ground(g);drive(g,250,()=>g.state.production.projects.some(p=>p.recipe==='bakeBread'&&p.phase==='complete'));
 assert.equal(g.state.autoWorkEnabled,false);assert.ok(g.tribe(0).foodLots.bread>0);
 const m=g.state.production.metrics;assert.equal(m.consumed.grainSheaves,16);assert.equal(m.consumed.roughGrain,12);assert.equal(m.grainUsed,4);assert.equal(m.consumed.flour,4);assert.equal(m.edibleFoodProduced,11.36);assert.equal(m.logsUsed,0,'paid cereal residues supply this batch heat before logs');assert.ok((m.consumed.chaff||0)+(m.consumed.straw||0)>0,'cooking debits actual finite residues');assert.equal(m.waterUsedLiters,2);
 assert.ok(['threshCerealHand','winnowCerealHand','grindGrain','bakeBread'].every(recipe=>g.state.production.projects.some(p=>p.recipe===recipe&&p.phase==='complete')));
});
test('legacy interrupted winnowing resumes same paid progress without new input or teleport',()=>{
 let {g,a,hearth}=fixture();g.tribe(0).items={roughGrain:6};assert.equal(beginProduction(g,'winnowCerealHand',hearth.id,a.id),true);let p=g.state.production.projects[0];
 drive(g,60,()=>p.phase==='working'&&p.progress>1.9);assert.equal(pauseProduction(g,a),true);delete p.pauseCause;a.jobLock=true;
 const id=p.id,progress=p.progress,spent=g.state.production.metrics.consumed.roughGrain;
 g=decodeGame(encodeGame(g));ground(g);p=g.state.production.projects.find(p=>p.id===id);const positions=g.state.units.map(u=>[u.x,u.z]);assert.equal(reviewAutomaticFoodProcessing(g,0),true);assert.equal(p.id,id);assert.equal(p.progress,progress);assert.equal(p.phase,'working');assert.deepEqual(g.state.units.map(u=>[u.x,u.z]),positions);
 drive(g,90,()=>p.phase==='complete');assert.equal(p.phase,'complete');assert.equal(g.state.production.metrics.consumed.roughGrain,spent);assert.equal(g.state.production.projects.filter(p=>p.recipe==='winnowCerealHand').length,1);
});
test('explicit food Pause stays paused through automatic reviews and save, and manual Resume keeps progress',()=>{
 let {g,a,hearth}=fixture();g.tribe(0).items={roughGrain:6};assert.equal(beginProduction(g,'winnowCerealHand',hearth.id,a.id),true);let p=g.state.production.projects[0];drive(g,60,()=>p.phase==='working'&&p.progress>1.9);assert.equal(pauseProductionProject(g,p.id),true);const id=p.id,progress=p.progress;assert.equal(p.pauseCause,'manual');
 g=decodeGame(encodeGame(g));ground(g);p=g.state.production.projects.find(p=>p.id===id);drive(g,20);assert.equal(p.phase,'paused');assert.equal(p.progress,progress);assert.equal(p.pauseCause,'manual');assert.equal(resumeProduction(g,id),true);assert.equal(p.pauseCause,undefined);drive(g,90,()=>p.phase==='complete');assert.equal(p.phase,'complete');assert.equal(g.state.production.metrics.consumed.roughGrain,6);
});
test('invalid saved pause cause is rejected',()=>{const{g,a,hearth}=fixture();g.tribe(0).items={roughGrain:6};assert.equal(beginProduction(g,'winnowCerealHand',hearth.id,a.id),true);const save=structuredClone(encodeGame(g));save.state.production.projects[0].pauseCause='invented';assert.throws(()=>decodeGame(save));});

test('explicit Unload parks the paid food batch without automatic retrieval until Resume',()=>{
 let {g,a,hearth}=fixture();g.tribe(0).items={grainSheaves:8};assert.equal(beginProduction(g,'threshCerealHand',hearth.id,a.id),true);let p=g.state.production.projects[0];assert.equal(unloadProductionProject(g,p.id),true);drive(g,20);assert.equal(p.phase,'stored');assert.equal(p.pauseCause,'manual');assert.equal(p.actorId,null);assert.equal(g.tribe(0).items.grainSheaves,0);const id=p.id;g=decodeGame(encodeGame(g));ground(g);p=g.state.production.projects.find(p=>p.id===id);drive(g,15);assert.equal(p.phase,'stored');assert.equal(resumeProduction(g,id),true);drive(g,100,()=>p.phase==='complete');assert.equal(p.phase,'complete');assert.equal(g.state.production.metrics.consumed.grainSheaves,8);
});

test('lost working maker frees its paid food slot for a real replacement without charging again',()=>{
 const {g,a,hearth}=fixture();g.tribe(0).items={roughGrain:6};assert.equal(beginProduction(g,'winnowCerealHand',hearth.id,a.id),true);const p=g.state.production.projects[0];drive(g,60,()=>p.phase==='working'&&p.progress>1.9);const progress=p.progress;a.hp=0;tickProduction(g,0);assert.equal(p.phase,'paused');assert.equal(p.actorId,null);drive(g,100,()=>p.phase==='complete');assert.equal(p.phase,'complete');assert.ok(p.progress>=progress);assert.equal(g.state.production.metrics.consumed.roughGrain,6);assert.equal(g.state.production.projects.filter(p=>p.recipe==='winnowCerealHand').length,1);
});
test('an incidental order releases orphaned maker locks and automatically resumes a loaded food carrier',()=>{
 const {g,a,hearth}=fixture();g.tribe(0).items={roughGrain:6};assert.equal(beginProduction(g,'winnowCerealHand',hearth.id,a.id),true);const p=g.state.production.projects[0];assert.equal(p.phase,'carrying');assert.equal(pauseProduction(g,a),true);drive(g,100,()=>p.phase==='complete');assert.equal(p.phase,'complete');assert.equal(g.state.production.metrics.consumed.roughGrain,6);assert.equal(a.jobLock,false);
});
test('nine legacy interrupted food batches recover through a severely overfull real warehouse and produce bread',()=>{
 let {g,a,b}=fixture();const actors=[a,b];for(let i=2;i<9;i++){const u=g.spawnUnit('worker',i*.15,36,0);u.order='hold';u.jobLock=false;actors.push(u);}
 const t=g.tribe(0);t.items={grainSheaves:32,roughGrain:24};t.foodLots={provisions:1000,grain:4};t.food=1004;t.survival.waterLiters=200;g.state.buildings=g.state.buildings.filter(b=>b.type!=='hearth');
 const store=g.makeBld('warehouse',-16,30,0);g.state.buildings.push(store,g.makeBld('oven',-14,45,0));for(let i=1;i<13;i++)g.state.buildings.push(g.makeBld('warehouse',90+i%4*12,80+Math.floor(i/4)*12,0));
 const sites=[];for(let i=0;i<9;i++){const site=g.makeBld(i===8?'grindingStone':'hearth',14+(i%3)*8,40+Math.floor(i/3)*8,0);g.state.buildings.push(site);sites.push(site);}ground(g);assert.equal(itemCapacity(g,0),2700);
 const jobs=[];for(let i=0;i<9;i++){const recipe=i<4?'threshCerealHand':i<8?'winnowCerealHand':'grindGrainStation';assert.equal(beginProduction(g,recipe,sites[i].id,actors[i].id),true);const p=g.state.production.projects.at(-1);for(let step=0;step<1000&&p.progress<1.9;step++){g.state.time+=.1;g.navBudget=4;productionAI(g,actors[i],.1);}assert.ok(p.progress>=1.9);assert.equal(pauseProduction(g,actors[i]),true);delete p.pauseCause;assert.equal(actors[i].jobLock,false,'releasing the paid maker releases its obsolete lock');actors[i].jobLock=true;jobs.push(p.id);}
 Object.assign(t.items,{grainSheaves:12779,roughGrain:0,straw:2068,chaff:2046});const paid=structuredClone(g.state.production.metrics.consumed);g=decodeGame(encodeGame(g));ground(g);
 drive(g,330,()=>jobs.every(id=>g.state.production.projects.find(p=>p.id===id).phase==='complete')&&g.state.production.projects.some(p=>p.recipe==='bakeBreadOven'&&p.phase==='complete'));
 assert.ok(jobs.every(id=>g.state.production.projects.find(p=>p.id===id).phase==='complete'),JSON.stringify(g.state.production.projects.filter(p=>jobs.includes(p.id))));assert.ok(g.state.production.projects.some(p=>p.recipe==='bakeBreadOven'&&p.phase==='complete'));assert.equal(g.state.autoWorkEnabled,false);assert.ok(g.tribe(0).foodLots.bread>0);assert.ok(g.state.production.metrics.consumed.grainSheaves>=paid.grainSheaves);assert.ok(g.state.production.projects.length<200);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('paid food can park at an overfull warehouse frontage, survives save, and spoils in prolonged wet exposure',()=>{
 let {g,a,hearth}=fixture();const store=g.makeBld('warehouse',-16,30,0);g.state.buildings.push(store);ground(g);g.tribe(0).items={grainSheaves:8};assert.equal(beginProduction(g,'threshCerealHand',hearth.id,a.id),true);let p=g.state.production.projects[0];g.tribe(0).items.plantFibre=1000;assert.equal(unloadProductionProject(g,p.id),true);drive(g,60,()=>p.phase==='stored');assert.equal(p.phase,'stored');assert.equal(p.cacheAnchor.id,store.id);assert.ok(p.cacheExposure>=0);assert.equal(g.tribe(0).items.grainSheaves,0);assert.equal(outsideFoodCache(g,{...p,recipe:'spinYarnHand'}),undefined,'ordinary crafts never receive outside-food capacity');const id=p.id;g=decodeGame(encodeGame(g));ground(g);p=g.state.production.projects.find(p=>p.id===id);g.state.weather='rain';g.state.time+=3000;tickProduction(g,3000);assert.equal(p.phase,'lost');assert.match(p.blockedReason,/spoiled while exposed/);assert.equal(g.state.production.metrics.lost.grainSheaves,8);assert.equal(g.state.production.metrics.edibleFoodProduced,0);assert.equal(g.tribe(0).items.plantFibre,1000);
});
