import {craftSiteReport} from '../src/game/craftSiteReport.ts';
import{measureVillageWorkload}from'../src/game/villageWorkload.ts';import test from'node:test';import assert from'node:assert/strict';import{Game}from'../src/game/sim.ts';import{JobCoordinator}from'../src/game/jobCoordinator.ts';import{workRuntime}from'../src/game/workRuntime.ts';import{beginProduction,productionIssue,pauseProductionProject,resumeProduction,unloadProductionProject}from'../src/game/production.ts';import{productionJobId,productionOwnershipDiagnostics,cachedProductionUnits}from'../src/game/productionOwnership.ts';import{campAnchor,supplyDrops,supplyApproach,supplyReached}from'../src/game/campAnchor.ts';import{reserveTreeWorker}from'../src/game/workAllocation.ts';import{reserveConstructionWorker}from'../src/game/constructionOwnership.ts';import{orderExploration}from'../src/game/explorationOrders.ts';import{encodeGame,decodeGame}from'../src/game/persistence.ts';
// Explicit finite scenario endowment; natural terrain and physical movement/work.
function fixture(){const g=new Game();g.reset(1,14,{size:1040,layout:'pangaea'});g.enterIsland();g.state.autoWorkEnabled=false;g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;for(const t of g.state.tribes)t.thinkT=10000;Object.assign(g.tribe(0),{wood:140,stone:60,food:1000,foodLots:{provisions:1000},items:{rawMeat:24,cleanHide:8,clay:16}});g.tribe(0).survival.waterLiters=1000;for(const u of g.state.units.filter(u=>u.team===0)){u.order='hold';u.jobLock=true;}return g;}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.state.paused=false;g.step(.2);}assert.deepEqual(g.simulationErrors,[]);}
function site(g,type){const home=campAnchor(g,0);for(let radius=10;radius<=40;radius+=5)for(let i=0;i<24;i++){const x=home.x+Math.cos(i*Math.PI/12)*radius,z=home.z+Math.sin(i*Math.PI/12)*radius;if(g.placementIssue(type,x,z))continue;assert.equal(g.placeBuilding(type,x,z),true,g.state.banner);const b=g.state.buildings.at(-1),u=g.state.units.find(u=>u.team===0&&!u.productionProjectId);g.clearSelect();g.selectEntity(u);assert.equal(g.orderConstruction(b),true);drive(g,120,()=>g.finished(b));assert.ok(g.finished(b));g.clearSelect();return b;}throw Error('No natural site for '+type);}
function begin(g,key,b){assert.equal(beginProduction(g,key,b.id),true,productionIssue(g,key,b.id));return g.state.production.projects.at(-1);}
const atCache=(g,u)=>supplyDrops(g,u.team).some(d=>{const p=supplyApproach(g,u,d);return p&&supplyReached(g,u,d,p);});
test('atomic actor amendment retains prior owner and capacity when replacement fails, and releases only hands for passive work',()=>{const j=new JobCoordinator();j.propose({id:'p',kind:'production',owner:0,actors:[],target:1});assert.equal(j.amend('p',[1],[{key:'rack',amount:1,capacity:1}]),true);j.propose({id:'other',kind:'build',owner:0,actors:[2],target:2});assert.equal(j.reserve('other'),true);assert.equal(j.amend('p',[2],[{key:'cache',amount:4,capacity:8}]),false);assert.equal(j.activeJob(1).id,'p');assert.equal(j.reservations.used('rack'),1);assert.equal(j.reservations.used('cache'),0);assert.equal(j.amend('p',[],[{key:'rack',amount:1,capacity:1}]),true);assert.equal(j.activeJob(1),undefined);assert.equal(j.reservations.used('rack'),1);assert.equal(j.metrics.accepted,2);});
test('shared production actor rejects competing tree/build claims, then physically unloads without refund and frees actor/slot',()=>{const g=fixture(),h=site(g,'hearth'),p=begin(g,'formClayHand',h),u=g.state.units.find(u=>u.id===p.actorId),tree=g.state.trees.find(n=>n.amount>0&&g.exploredAt(n.x,n.z)),b=g.makeBld('hut',h.x+12,h.z,0);b.build=.1;g.state.buildings.push(b);const j=workRuntime(g),before=g.tribe(0).items.clay;assert.equal(j.activeJob(u.id).id,productionJobId(p.id));g.clearSelect();g.selectEntity(u);g.issueGather(tree);assert.match(g.state.banner,/paid batch/);assert.equal(g.orderConstruction(b),false);assert.match(g.state.banner,/paid batch/);assert.equal(p.phase,'carrying');assert.equal(reserveTreeWorker(g,tree,u),false);assert.equal(reserveConstructionWorker(g,u,b),false);g.clearSelect();g.selectEntity(u);g.issueMove(h.x,h.z+8);assert.equal(p.phase,'paused');assert.equal(j.activeJob(u.id).id,productionJobId(p.id));drive(g,3);assert.equal(unloadProductionProject(g,p.id),true);assert.equal(p.actorId,u.id);drive(g,100,()=>p.phase==='stored');assert.equal(p.phase,'stored',JSON.stringify({p,u:u.workReason}));const job=craftSiteReport(g,h).jobs.find(job=>job.projectId===p.id);assert.deepEqual(job.cacheLocation,{x:p.cacheAnchor.x,z:p.cacheAnchor.z,name:'Camp cache',contents:'4 clay'});assert.equal(p.actorId,null);const parked=measureVillageWorkload(g).tasks.find(t=>t.id===`production:${p.id}`);assert.equal(parked.status,'paused');assert.match(parked.blocker,/parked at cache/);assert.deepEqual(parked.actorIds,[]);assert.equal(atCache(g,u),true);assert.equal(j.activeJob(u.id),undefined);assert.equal(j.reservations.used(`production:${h.id}:slots`),0);assert.equal(j.reservations.used('production:cache:0:units'),4);assert.equal(cachedProductionUnits(g,0),4);assert.equal(g.tribe(0).items.clay,before);assert.equal(reserveTreeWorker(g,tree,u),true);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));});
test('parked batch reconstructs saved capacity and replacement physically collects it and finishes without another debit',()=>{let g=fixture(),h=site(g,'hearth'),p=begin(g,'formClayHand',h),u=g.state.units.find(u=>u.id===p.actorId);g.clearSelect();g.selectEntity(u);g.issueMove(h.x,h.z+8);drive(g,3);assert.equal(unloadProductionProject(g,p.id),true);drive(g,100,()=>p.phase==='stored');const id=p.id,former=u.id,paid=g.state.production.metrics.consumed.clay,water=g.state.production.metrics.waterUsedLiters;g=decodeGame(encodeGame(g));p=g.state.production.projects.find(p=>p.id===id);assert.equal(workRuntime(g).reservations.used('production:cache:0:units'),4);u=g.state.units.find(u=>u.id===former);g.clearSelect();g.selectEntity(u);g.issueMove(u.x-12,u.z);assert.equal(resumeProduction(g,id),true,p.blockedReason);assert.equal(p.phase,'collecting');assert.notEqual(p.actorId,former);assert.equal(g.tribe(0).items.greenware||0,0);assert.equal(workRuntime(g).reservations.used(`production:${h.id}:slots`),1);assert.equal(workRuntime(g).reservations.used('production:cache:0:units'),4);drive(g,250,()=>p.phase==='complete');assert.equal(p.phase,'complete',JSON.stringify(p));assert.equal(g.tribe(0).items.greenware,4);assert.equal(g.state.production.metrics.consumed.clay,paid);assert.equal(g.state.production.metrics.waterUsedLiters,water);assert.equal(workRuntime(g).reservations.used('production:cache:0:units'),0);assert.equal(workRuntime(g).reservations.used(`production:${h.id}:slots`),0);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));});
test('passive curing keeps both rack slots across load while releasing hands; ready pickup owns an actor until physical delivery',()=>{let g=fixture(),r=site(g,'dryrack');const home=campAnchor(g,0);g.clearSelect();for(const u of g.state.units.filter(u=>u.team===0))u.selected=true;g.issueMove(home.x,home.z);drive(g,35,()=>g.state.units.filter(u=>u.team===0).filter(u=>atCache(g,u)).length>=2);g.clearSelect();let a=begin(g,'airDryMeat',r),b=begin(g,'drySkin',r);drive(g,90,()=>a.phase==='curing');assert.equal(a.phase,'curing');assert.equal(a.actorId,null);const before=JSON.stringify(g.state.production.metrics),ids=[a.id,b.id];g=decodeGame(encodeGame(g));const j=workRuntime(g);assert.equal(j.reservations.used(`production:${r.id}:slots`),2);a=g.state.production.projects.find(p=>p.id===ids[0]);assert.deepEqual(j.job(productionJobId(a.id)).actors,[]);assert.equal(JSON.stringify(g.state.production.metrics),before);assert.match(productionIssue(g,'airDryMeat',r.id),/slots/);drive(g,350,()=>a.phase==='returning');assert.equal(a.phase,'returning',JSON.stringify(a));assert.equal(j.activeJob(a.actorId).id,productionJobId(a.id));drive(g,120,()=>a.phase==='complete');assert.equal(a.phase,'complete');assert.equal(j.job(productionJobId(a.id)),undefined);assert.equal(productionOwnershipDiagnostics(g).rebuilds,1);});
test('Explore automatically parks the real carried paid batch before beginning a provisioned expedition',()=>{const g=fixture(),h=site(g,'hearth'),p=begin(g,'formClayHand',h),u=g.state.units.find(u=>u.id===p.actorId),clay=g.tribe(0).items.clay;g.clearSelect();g.selectEntity(u);g.issueMove(h.x,h.z+8);drive(g,3);assert.equal(orderExploration(g,u),null);assert.equal(u.exploreAfterDelivery,true);assert.equal(p.phase,'unloading');assert.equal(u.expedition,undefined);drive(g,150,()=>u.order==='explore');assert.equal(p.phase,'stored',JSON.stringify(p));assert.equal(p.actorId,null);assert.ok(u.expedition);assert.equal(u.productionProjectId,undefined);assert.equal(g.tribe(0).items.clay,clay);assert.equal(g.state.production.metrics.consumed.clay,4);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));});

test('strict saves reject a duplicated physical processing slot and an unanchored stored paid parcel',()=>{const g=fixture(),h=site(g,'hearth'),p=begin(g,'formClayHand',h),raw=JSON.parse(JSON.stringify(encodeGame(g))),copy=JSON.parse(JSON.stringify(p));copy.id=raw.state.nextId++;const other=raw.state.units.find(u=>u.team===0&&u.id!==p.actorId);copy.actorId=other.id;other.productionProjectId=copy.id;raw.state.production.projects.push(copy);assert.throws(()=>decodeGame(raw));const originalActor=p.actorId,stored=JSON.parse(JSON.stringify(encodeGame(g)));stored.state.production.projects[0].phase='stored';stored.state.production.projects[0].actorId=null;stored.state.units.find(u=>u.id===originalActor).productionProjectId=undefined;assert.throws(()=>decodeGame(stored));});

test('returning finished output unloads normally after workplace destruction and never becomes refunded input',()=>{const g=fixture(),h=site(g,'hearth'),p=begin(g,'formClayHand',h);drive(g,250,()=>p.phase==='returning');assert.equal(p.phase,'returning');const u=g.state.units.find(u=>u.id===p.actorId),paid=g.state.production.metrics.consumed.clay;assert.equal(pauseProductionProject(g,p.id),true);h.hp=0;assert.equal(unloadProductionProject(g,p.id),true,p.blockedReason);drive(g,100,()=>p.phase==='complete');assert.equal(p.phase,'complete');assert.equal(g.tribe(0).items.greenware,4);assert.equal(g.state.production.metrics.consumed.clay,paid);assert.equal(workRuntime(g).activeJob(u.id),undefined);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));});

test('blocked cache orders keep the current paid batch moving and report why',()=>{
 const g=fixture(),hearth=site(g,'hearth'),project=begin(g,'formClayHand',hearth);
 const worker=g.state.units.find(u=>u.id===project.actorId);
 const paid=g.state.production.metrics.consumed.clay;
 const connected=g.workBoard.connected;
 g.workBoard.connected=()=>false;
 assert.equal(unloadProductionProject(g,project.id),false);
 assert.equal(project.phase,'carrying');
 assert.match(orderExploration(g,worker),/No reachable cache/);
 assert.equal(worker.exploreAfterDelivery,undefined);
 assert.equal(project.actorId,worker.id);
 g.workBoard.connected=connected;
 const stock=g.tribe(0).items;
 stock.bone=10000;
 assert.equal(unloadProductionProject(g,project.id),false);
 assert.match(project.blockedReason,/No room/);
 assert.equal(project.phase,'carrying');
 delete stock.bone;
 drive(g,120,()=>project.phase==='complete');
 assert.equal(project.phase,'complete');
 assert.equal(g.state.production.metrics.consumed.clay,paid);
});

test('a cut pickup route releases the worker and another reachable worker collects the same paid parcel',()=>{
 const g=fixture(),hearth=site(g,'hearth'),project=begin(g,'formClayHand',hearth);
 assert.equal(unloadProductionProject(g,project.id),true);
 drive(g,100,()=>project.phase==='stored');
 assert.equal(project.phase,'stored');
 const paid=g.state.production.metrics.consumed.clay,anchor=project.cacheAnchor;
 assert.equal(resumeProduction(g,project.id),true,project.blockedReason);
 const first=g.state.units.find(u=>u.id===project.actorId);
 const connected=g.workBoard.connected;
 g.workBoard.connected=function(game,ax,az,bx,bz){
  if(ax===first.x&&az===first.z&&bx===anchor.x&&bz===anchor.z)return false;
  return connected.call(this,game,ax,az,bx,bz);
 };
 drive(g,2,()=>project.phase==='stored');
 assert.equal(project.phase,'stored');
 assert.equal(project.cacheAnchor,anchor);
 assert.equal(first.productionProjectId,undefined);
 assert.equal(cachedProductionUnits(g,0),4);
 assert.equal(resumeProduction(g,project.id),true,project.blockedReason);
 assert.notEqual(project.actorId,first.id);
 drive(g,160,()=>project.phase==='complete');
 assert.equal(project.phase,'complete');
 assert.equal(g.state.production.metrics.consumed.clay,paid);
});

test('a closed workshop approach prevents collecting a stored parcel until it can be delivered',()=>{
 const g=fixture(),hearth=site(g,'hearth'),project=begin(g,'formClayHand',hearth);
 assert.equal(unloadProductionProject(g,project.id),true);
 drive(g,100,()=>project.phase==='stored');
 assert.equal(project.phase,'stored');
 const paid=g.state.production.metrics.consumed.clay;
 const anchor=project.cacheAnchor;
 assert.equal(resumeProduction(g,project.id),true,project.blockedReason);
 const worker=g.state.units.find(u=>u.id===project.actorId);
 const spot=g.interactionSpot;
 g.interactionSpot=function(person,building){
  if(building===hearth)return null;
  return spot.call(this,person,building);
 };
 drive(g,75,()=>project.phase==='stored');
 assert.equal(project.phase,'stored');
 assert.equal(project.cacheAnchor,anchor);
 assert.match(project.blockedReason,/No route to the workshop/);
 assert.equal(worker.productionProjectId,undefined);
 assert.equal(cachedProductionUnits(g,0),4);
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 g.interactionSpot=spot;
 assert.equal(resumeProduction(g,project.id),true,project.blockedReason);
 drive(g,160,()=>project.phase==='complete');
 assert.equal(project.phase,'complete');
 assert.equal(g.state.production.metrics.consumed.clay,paid);
});
