import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {SEGS} from '../src/game/constants.ts';
import {launchRiverboat} from '../src/game/boats.ts';
import {initializeSurvival} from '../src/game/survivalNeeds.ts';
import {waterNavigation} from '../src/game/waterNavigation.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {reviewSeaExploration,SEA_EXPLORATION_RULES} from '../src/game/seaExploration.ts';
import {tickSeaStorms,activeSeaStorms,observedSeaStorm,deepWater,SEA_STORM_RULES} from '../src/game/seaStorms.ts';
// Controlled fixture: one water channel (|z|<8) crossing the map between dry
// banks. Team 1 starts beside a finished dock; nothing beyond its live sight is
// in its own memory. Team 2's hall is inland, far beyond any boat's sight.
SEA_STORM_RULES.deepMeters=.9;// test world water is 1 m deep: boats can only be boarded by wading, so the threshold is lowered here
let DEPTH=1;function ground(g){const size=g.world.size;for(let z=0;z<=SEGS;z++)for(let x=0;x<=SEGS;x++){const p=z/SEGS*size-size/2;g.world.heights[z*(SEGS+1)+x]=Math.abs(p)<8?g.world.waterY-DEPTH:4;}g.world.rivers=[];g.world.features=[];g.rebuildWalk();for(const u of g.state.units)u.y=u.boat||u.haulage==='canoe'?Math.max(g.height(u.x,u.z),g.waterAt(u.x,u.z)+.16):g.height(u.x,u.z);for(const b of g.state.buildings)b.y=g.height(b.x,b.z);const clock=g.clockState.bind(g);g.clockState=()=>({...clock(),period:'Day'});}
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


const stormAt=(g,x,z,r=40,i=1)=>{const s={id:g.id(),x,z,radius:r,intensity:i,startedAt:g.state.time,until:g.state.time+90,exposures:[]};(g.state.seaStorms??={version:1,nextCheckAt:1e9,index:0,storms:[]}).storms.push(s);g.state.seaStorms.nextCheckAt=1e9;return s;};

test('storms come only from the existing storm weather, only on deep water near hulls actually afloat; shallow water and docks are never hit',()=>{
 {const{g}=fixture({hull:true});g.state.weather='clear';g.state.time=100;for(let i=0;i<20;i++){g.state.time+=50;tickSeaStorms(g,.1);}assert.equal(g.state.seaStorms,undefined,'clear weather never creates a storm');}
 {const{g}=fixture({hull:true});g.state.weather='storm';const b=g.state.boats[0];assert.ok(deepWater(g,b.x,b.z));for(let i=0;i<40;i++){g.state.time+=50;tickSeaStorms(g,.1);}assert.equal(g.state.seaStorms?.storms.length??0,0,'a hull moored at its dock gives no storm a reason to form');}
 {const{g}=fixture({hull:true});g.state.weather='storm';const b=g.state.boats[0];b.x=0;b.z=2;g.state.buildings.find(d=>d.type==='dock').x=0;g.state.buildings.find(d=>d.type==='dock').z=-60;
  for(let i=0;i<40&&!(g.state.seaStorms?.storms.length);i++){g.state.time+=50;tickSeaStorms(g,.1);}const s=g.state.seaStorms.storms[0];assert.ok(s,'a deterministic storm forms near the afloat hull');assert.ok(deepWater(g,s.x,s.z));assert.ok(s.until>s.startedAt&&s.radius>=SEA_STORM_RULES.minimumRadius);
  const again=fixture({hull:true}).g;again.state.weather='storm';const b2=again.state.boats[0];b2.x=0;b2.z=2;const d2=again.state.buildings.find(d=>d.type==='dock');d2.x=0;d2.z=-60;for(let i=0;i<40&&!(again.state.seaStorms?.storms.length);i++){again.state.time+=50;tickSeaStorms(again,.1);}
  assert.deepEqual(again.state.seaStorms.storms[0],s,'same seed and same observations give the same storm');}
 DEPTH=.5;{const{g}=fixture({hull:true});g.state.weather='storm';const b=g.state.boats[0];assert.equal(deepWater(g,b.x,b.z),false);b.z=2;g.state.buildings.find(d=>d.type==='dock').z=-60;for(let i=0;i<40;i++){g.state.time+=50;tickSeaStorms(g,.1);}assert.equal(g.state.seaStorms?.storms.length??0,0,'shallow water never forms a storm');}DEPTH=1;
});

test('a hull inside a storm is damaged in proportion to exposure; hulls outside, in shallows or at their dock are untouched; save and reload keep the event',()=>{
 let{g}=fixture({hull:true});const b=g.state.boats[0];b.z=2;g.state.buildings.find(d=>d.type==='dock').z=-60;const hp0=b.hp;const far=stormAt(g,b.x+300,b.z,40);
 for(let i=0;i<50;i++){g.state.paused=false;tickSeaStorms(g,.1);}assert.equal(b.hp,hp0,'outside the storm: no damage');far.until=far.startedAt;tickSeaStorms(g,.1);assert.ok(far.ended);
 const s=stormAt(g,b.x,b.z,40,1);for(let i=0;i<200;i++)tickSeaStorms(g,.1);assert.ok(b.hp<hp0,'inside: damaged');const e=s.exposures[0];assert.ok(Math.abs(e.seconds-20)<1e-6);assert.ok(Math.abs(hp0-b.hp-e.damage)<1e-6,'recorded damage equals hull points lost');
 g=reload(g);assert.equal(activeSeaStorms(g).length,1);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));delete raw.state.seaStorms;assert.equal(decodeGame(raw).state.seaStorms,undefined,'old saves load');raw.state.seaStorms={version:1,nextCheckAt:1,index:0,storms:[{id:1,x:0,z:0,radius:-4,intensity:.5,startedAt:0,until:1,exposures:[]}]};assert.throws(()=>decodeGame(raw));
});

test('a sea exploration crew sees the storm only within sight, turns back, lands home and conserves every pack',()=>{
 let{g}=fixture({hull:true});reviewSeaExploration(g);let v=voyage(g);drive(g,200,()=>v.phase==='outbound'&&v.metrics.sailMeters>15);assert.equal(v.phase,'outbound',v.reason);const b=g.state.boats[0];
 const far=stormAt(g,b.x,b.z+400,30);assert.equal(observedSeaStorm(g,b),undefined,'a distant storm is not observed');drive(g,.5);assert.equal(v.phase,'outbound',v.reason);far.until=far.startedAt;
 const near=stormAt(g,b.x+30,b.z,30);assert.ok(observedSeaStorm(g,b),'within radius plus sight');drive(g,.5);assert.equal(v.phase,'returning',v.reason);assert.equal(v.returnReason,'storm');
 g=reload(g);v=voyage(g);drive(g,600,()=>['complete','lost','failed'].includes(v.phase));assert.equal(v.phase,'complete',JSON.stringify(v));assert.equal(v.home.length,v.crew.length);assert.ok(Math.abs(ledger(v))<1e-6,JSON.stringify(v.metrics));assert.ok(Math.abs(waterLedger(v))<1e-6);
 assert.ok(g.state.units.every(u=>!u.scoutProvisions&&u.seaExplorationId===undefined&&!u.boat));void near;
});

test('a hull destroyed by a storm follows the existing hull-loss path: survivors keep their packs, nothing is refunded or duplicated, ledgers exact',()=>{
 let{g}=fixture({hull:true});const id=g.state.boats[0].id,wood=g.tribe(1).wood;reviewSeaExploration(g);let v=voyage(g);drive(g,200,()=>v.phase==='outbound'&&v.metrics.sailMeters>15);assert.equal(v.phase,'outbound');
 const b=g.state.boats[0];b.hp=Math.max(1,b.hp*.01);const s=stormAt(g,b.x,b.z,200,1);drive(g,3);
 assert.ok(s.exposures[0]?.lost,'storm exposure recorded the loss');assert.equal(v.failure,'hull-lost',JSON.stringify(v));
 drive(g,400,()=>['complete','lost','failed'].includes(v.phase));assert.equal(v.phase,'lost');assert.equal(v.reportCommitted,false);assert.ok(!g.state.boats.some(x=>x.id===id&&x.hp>0));assert.equal(g.tribe(1).wood,wood,'no free replacement');
 assert.ok(Math.abs(ledger(v))<1e-6,JSON.stringify(v.metrics));assert.ok(Math.abs(waterLedger(v))<1e-6);assert.ok(v.metrics.foodWithPeople>0,'survivors keep their actual packs');assert.doesNotThrow(()=>decodeGame(JSON.parse(JSON.stringify(encodeGame(g)))));
});
