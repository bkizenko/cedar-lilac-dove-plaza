import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {SEGS} from '../src/game/constants.ts';
import {launchRiverboat} from '../src/game/boats.ts';
import {initializeSurvival} from '../src/game/survivalNeeds.ts';
import {waterNavigation} from '../src/game/waterNavigation.ts';
import {knownSettlementSite} from '../src/game/barter.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {reviewSeaExploration,cancelSeaExploration,SEA_EXPLORATION_RULES} from '../src/game/seaExploration.ts';
import {developRivalEquipment} from '../src/game/rivalDevelopment.ts';

// Controlled fixture: one water channel (|z|<8) crossing the map between dry
// banks. Team 1 starts beside a finished dock; nothing beyond its live sight is
// in its own memory. Team 2's hall is inland, far beyond any boat's sight.
function ground(g){const size=g.world.size;for(let z=0;z<=SEGS;z++)for(let x=0;x<=SEGS;x++){const p=z/SEGS*size-size/2;g.world.heights[z*(SEGS+1)+x]=Math.abs(p)<8?g.world.waterY-1:4;}g.world.rivers=[];g.world.features=[];g.rebuildWalk();for(const u of g.state.units)u.y=u.boat||u.haulage==='canoe'?Math.max(g.height(u.x,u.z),g.waterAt(u.x,u.z)+.16):g.height(u.x,u.z);for(const b of g.state.buildings)b.y=g.height(b.x,b.z);const clock=g.clockState.bind(g);g.clockState=()=>({...clock(),period:'Day'});}
function fixture({hull=false,locked=0}={}){const g=new Game();g.reset(123456,3);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.autoWorkEnabled=false;g.state.rivalKnowledge=[];g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.conflict='quiet';g.seaT=1e9;g.calamityT=1e9;for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 for(const t of g.state.tribes)Object.assign(t,{food:600,foodLots:undefined,wood:0,stone:0,copper:0,iron:0,spears:0,bows:0,blades:0,aggro:0,hostile:false,ally:false,trust:.8,tension:0,thinkT:10000});
 g.state.buildings.push(g.makeBld('townhall',0,-30,1));const dock=g.makeBld('dock',0,-10,1);g.state.buildings.push(dock);
 const people=[];for(let i=0;i<6;i++){const u=g.spawnUnit('worker',8+i*2,-30,1);u.order='hold';u.jobLock=i<locked;people.push(u);}
 // The old equipment blocker: one injured personal-canoe owner.
 const canoe=g.spawnUnit('worker',22,-28,1);canoe.order='hold';canoe.haulage='canoe';canoe.hp=canoe.maxHp*.3;
 g.state.buildings.push(g.makeBld('townhall',150,150,2));for(let i=0;i<5;i++){const u=g.spawnUnit('worker',150+i*2,160,2);u.order='hold';u.jobLock=true;}
 g.state.buildings.push(g.makeBld('townhall',-300,-200,0));const p=g.spawnUnit('worker',-300,-190,0);p.order='hold';p.jobLock=true;
 ground(g);Object.assign(g.tribe(1),{wood:180,stone:36});initializeSurvival(g);g.state.coastalTradeReviewAt=1e8;g.state.scoutTimer=1000;
 g.state.seaExploration={version:1,teams:g.state.tribes.filter(t=>t.id>0&&t.id!==3).map(t=>({team:t.id,nextReviewAt:t.id===1?0:1e9,reviews:0,lastReason:'',reasons:{}})),voyages:[]};
 if(hull){assert.equal(launchRiverboat(g,dock),true);}
 waterNavigation(g,true);return {g,dock,canoe};}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.state.paused=false;g.step(.1);}assert.deepEqual(g.simulationErrors,[]);}
const voyage=g=>g.state.seaExploration.voyages.find(v=>v.team===1);
function reload(g){const copy=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));ground(copy);copy.seaT=1e9;copy.calamityT=1e9;waterNavigation(copy,true);return copy;}
function ledger(v){const m=v.metrics;return m.foodLoaded-(m.foodReturned+m.foodUsed+m.foodLost+m.foodWithPeople);}
function waterLedger(v){const m=v.metrics;return m.waterLoaded-(m.waterReturned+m.waterUsed+m.waterLost+m.waterWithPeople);}
/** Drives to each phase, saving and strictly reloading at every transition. */
function driveThroughPhases(g,id,seconds,stop=['complete','failed','lost']){const seen=[];let v=g.state.seaExploration.voyages.find(v=>v.id===id),phase=v.phase;seen.push(phase);const end=g.state.time+seconds;
 while(g.state.time<end&&!stop.includes(v.phase)){g.state.paused=false;g.step(.1);assert.deepEqual(g.simulationErrors,[]);v=g.state.seaExploration.voyages.find(v=>v.id===id);if(v.phase!==phase){phase=v.phase;seen.push(phase);g=reload(g);v=g.state.seaExploration.voyages.find(v=>v.id===id);assert.equal(v.phase,phase,'phase survives strict save/load');}}
 return {g,v,seen};}

test('no hull: the rival pays a real hull, crews it with healthy adults, explores, returns and reports only what it saw',()=>{
 let {g,canoe}=fixture();const wood=g.tribe(1).wood,stone=g.tribe(1).stone;
 assert.equal(knownSettlementSite(g,2,1),undefined);assert.equal(g.state.boats,undefined);
 reviewSeaExploration(g);let v=voyage(g);assert.ok(v,JSON.stringify(g.state.seaExploration.teams));assert.equal(v.phase,'commission',v.reason);assert.equal(v.metrics.hullPayments,1,v.reason);
 assert.equal(g.tribe(1).wood,wood-40);assert.equal(g.tribe(1).stone,stone-4);assert.equal(g.state.boats,undefined,'no free hull');
 const id=v.id;let r=driveThroughPhases(g,id,900);g=r.g;v=r.v;
 assert.equal(v.phase,'complete',JSON.stringify({v,seen:r.seen,teams:g.state.seaExploration.teams}));
 for(const phase of ['commission','ready','mustering','outbound','returning','landing','unloading','complete'])assert.ok(r.seen.includes(phase),`visited ${phase}: ${r.seen}`);
 assert.equal(g.tribe(1).wood,wood-40,'hull paid exactly once');assert.equal(g.state.boats.length,1);const b=g.state.boats[0];assert.equal(b.id,v.boatId);assert.equal(b.team,1);assert.ok(Math.hypot(b.x-v.homeSea.x,b.z-v.homeSea.z)<=4,'hull back at the home dock');
 assert.ok(v.crew.length>=2&&v.crew.length<=3);assert.ok(!v.crew.includes(canoe.id),'injured canoe owner is neither crew nor blocker');assert.equal(v.home.length,v.crew.length);
 assert.ok(v.metrics.legs>=1&&v.metrics.sailMeters>40,JSON.stringify(v.metrics));assert.ok(v.returnReason,'return reason recorded');
 assert.ok(v.metrics.foodLoaded>0&&v.metrics.foodReturned>0&&v.metrics.foodUsed>0);assert.ok(Math.abs(ledger(v))<1e-6,JSON.stringify(v.metrics));assert.ok(v.metrics.waterLoaded>0&&Math.abs(waterLedger(v))<1e-6,JSON.stringify(v.metrics));
 assert.ok(g.state.units.every(u=>!u.scoutProvisions&&u.seaExplorationId===undefined&&!u.boat));
 const memory=new Set(g.state.rivalKnowledge.find(m=>m.team===1).cells);assert.ok(v.reportCommitted);assert.ok(v.report.cells.every(c=>memory.has(c)));assert.ok(v.metrics.cellsCommitted>4);assert.ok(v.report.coastCells.length>0);
 const size=g.world.size,hallCell=Math.floor((150+size/2)/size*32)*32+Math.floor((150+size/2)/size*32);assert.ok(!memory.has(hallCell),'unseen inland hall cell stays unknown');assert.equal(knownSettlementSite(g,2,1),undefined);assert.deepEqual(v.report.halls,[]);
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('an existing idle hull is reused; a dead crewmate’s pack stays aboard, total crew loss loses the report but not the hull',()=>{
 let {g}=fixture({hull:true});const boatId=g.state.boats[0].id,wood=g.tribe(1).wood;reviewSeaExploration(g);let v=voyage(g);assert.equal(v.phase,'mustering',v.reason);assert.equal(v.metrics.hullReused,1);assert.equal(g.tribe(1).wood,wood);
 drive(g,200,()=>v.phase==='outbound'&&v.metrics.sailMeters>15);assert.equal(v.phase,'outbound',v.reason);
 const crew=v.crew.map(id=>g.state.units.find(u=>u.id===id));const victim=crew.find(u=>u.id!==g.state.boats[0].captain),before=victim.scoutProvisions.food;victim.hp=0;drive(g,.3);
 assert.ok(v.left.includes(victim.id));assert.equal(v.metrics.crewLost,1);assert.ok(v.metrics.foodTransferred>0&&v.metrics.foodTransferred<=before);assert.ok(Math.abs(ledger(v)-[...activeCrew(g,v)].reduce((n,u)=>n+u.scoutProvisions.food+u.scoutProvisions.foodUsed,0))<1e-6);
 g=reload(g);v=voyage(g);for(const u of activeCrew(g,v))u.hp=0;drive(g,.3);
 assert.equal(v.phase,'lost');assert.equal(v.failure,'crew-lost');assert.equal(v.reportCommitted,false);assert.ok(g.state.boats.some(b=>b.id===boatId&&b.team===1),'hull ownership is retained');assert.ok(Math.abs(ledger(v))<1e-6,JSON.stringify(v.metrics));
 assert.equal(g.state.seaExploration.teams.find(t=>t.team===1).reasons['crew-lost'],1);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
function activeCrew(g,v){return v.crew.filter(id=>!v.home.includes(id)&&!v.left.includes(id)).map(id=>g.state.units.find(u=>u.id===id));}

test('provision exhaustion turns the voyage home early and leftover food returns to the cache',()=>{
 const {g}=fixture({hull:true});reviewSeaExploration(g);const v=voyage(g);drive(g,200,()=>v.phase==='outbound'&&v.metrics.sailMeters>10);assert.equal(v.phase,'outbound');
 // Consume (not delete) the packs: food actually eaten so far is booked as used.
 for(const u of activeCrew(g,v)){const p=u.scoutProvisions,eat=p.food-.6;p.food-=eat;p.foodUsed+=eat;}
 drive(g,2,()=>v.phase!=='outbound');assert.equal(v.phase,'returning');assert.equal(v.returnReason,'provisions');drive(g,300,()=>['complete','lost','failed'].includes(v.phase));assert.equal(v.phase,'complete',JSON.stringify(v));assert.ok(Math.abs(ledger(v))<1e-6,JSON.stringify(v.metrics));
});

test('per-society rejection reasons: partner known, no crew, no hull materials; cancel before departure refunds packs',()=>{
 {const {g}=fixture({locked:6});const wood=g.tribe(1).wood;reviewSeaExploration(g);assert.equal(g.state.seaExploration.teams.find(t=>t.team===1).reasons['no-builder'],1);assert.equal(g.tribe(1).wood,wood,'nothing paid without a builder');}
 {const {g}=fixture({hull:true,locked:5});reviewSeaExploration(g);const row=g.state.seaExploration.teams.find(t=>t.team===1);assert.equal(row.reasons['no-crew'],1);assert.equal(voyage(g),undefined);}
 {const {g}=fixture();Object.assign(g.tribe(1),{wood:20,stone:1});reviewSeaExploration(g);const v=voyage(g);assert.equal(v.failure,'no-hull-materials');assert.equal(g.tribe(1).wood,20);assert.equal(g.state.seaExploration.teams.find(t=>t.team===1).reasons['no-hull-materials'],1);}
 {const {g}=fixture({hull:true});const hall=g.state.buildings.find(b=>b.team===2);const witness=g.state.units.find(u=>u.team===1);Object.assign(witness,{x:hall.x+5,z:hall.z+5});g.state.time+=3;knownSettlementSite(g,2,1);Object.assign(witness,{x:8,z:-30});reviewSeaExploration(g);assert.equal(voyage(g),undefined);assert.equal(g.state.seaExploration.teams.find(t=>t.team===1).reasons['partner-known'],1);}
 {const {g}=fixture({hull:true});const food=g.tribe(1).food;reviewSeaExploration(g);const v=voyage(g);drive(g,40,()=>activeCrew(g,v).some(u=>u.scoutProvisions));assert.ok(activeCrew(g,v).some(u=>u.scoutProvisions));assert.equal(cancelSeaExploration(g,v.id),true);drive(g,120,()=>!['mustering','landing','unloading'].includes(v.phase));assert.ok(['failed','complete'].includes(v.phase),v.phase);assert.equal(v.failure,'cancelled');assert.ok(g.state.units.every(u=>!u.scoutProvisions));assert.ok(Math.abs(ledger(v))<1e-6,JSON.stringify(v.metrics));assert.ok(g.tribe(1).food<=food);}
});

test('old saves without sea exploration load as no voyages; dangling crew references are rejected',()=>{
 const {g}=fixture({hull:true});const raw=JSON.parse(JSON.stringify(encodeGame(g)));delete raw.state.seaExploration;const old=decodeGame(raw);assert.equal(old.state.seaExploration,undefined);
 const bad=JSON.parse(JSON.stringify(raw));bad.state.units.find(u=>u.team===1).seaExplorationId=99999;assert.throws(()=>decodeGame(bad));
 ground(old);old.state.coastalTradeReviewAt=1e8;old.state.time=SEA_EXPLORATION_RULES.firstReviewSeconds+1;reviewSeaExploration(old);assert.ok(old.state.seaExploration,'reviews start lazily on a loaded old village');
 reviewSeaExploration(g);const ok=JSON.parse(JSON.stringify(encodeGame(g)));ok.state.seaExploration.voyages[0].phase='teleporting';assert.throws(()=>decodeGame(ok));
});

test('the old personal-canoe equipment path stays blocked by the injured owner, yet the hull voyage departs',()=>{
 const {g,canoe}=fixture({hull:true});g.tribe(1).food=2000;assert.equal(canoe.haulage,'canoe');reviewSeaExploration(g);const v=voyage(g);assert.equal(v.phase,'mustering');assert.ok(!v.crew.includes(canoe.id));drive(g,200,()=>v.phase==='outbound');assert.equal(v.phase,'outbound');assert.equal(canoe.boat,undefined);void developRivalEquipment;
});

test('hull loss in open water: bounded wait, survivors released with their packs, report unconfirmed, no free hull',()=>{
 let {g}=fixture({hull:true});const boatId=g.state.boats[0].id,wood=g.tribe(1).wood;reviewSeaExploration(g);let v=voyage(g);drive(g,200,()=>v.phase==='outbound'&&v.metrics.sailMeters>15);assert.equal(v.phase,'outbound',v.reason);
 g.state.boats.find(b=>b.id===boatId).hp=0;drive(g,1);assert.equal(v.failure,'hull-lost',v.reason);g=reload(g);v=voyage(g);
 drive(g,400,()=>['complete','lost','failed'].includes(v.phase));assert.equal(v.phase,'lost',JSON.stringify(v));assert.equal(v.failure,'hull-lost');assert.equal(v.reportCommitted,false,'nobody physically brought the report home');assert.ok(v.metrics.foodWithPeople>0,'released survivors keep their actual packs');assert.ok(g.state.time-v.landingAt<=SEA_EXPLORATION_RULES.landingSeconds+1);
 assert.ok(!g.state.boats?.some(b=>b.id===boatId&&b.hp>0),'no free replacement hull');assert.equal(g.tribe(1).wood,wood,'nothing repaid or refunded for the lost hull');
 assert.ok(g.state.units.every(u=>u.seaExplorationId===undefined));assert.ok(Math.abs(ledger(v))<1e-6,JSON.stringify(v.metrics));assert.ok(Math.abs(waterLedger(v))<1e-6,JSON.stringify(v.metrics));
 assert.doesNotThrow(()=>decodeGame(JSON.parse(JSON.stringify(encodeGame(g)))));
});
