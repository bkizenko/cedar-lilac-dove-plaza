import {endowStructureReports} from './helpers/endowed-structure-reports.mjs';
import {endowSettlementSites} from './helpers/endowed-settlement-sites.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {SEGS} from '../src/game/constants.ts';
import {beginRiverboat,riverboatWaterPoint,riverboatDestination} from '../src/game/boats.ts';
import{reviewCoastalCommissioning}from'../src/game/coastalCommission.ts';import {dispatchCoastalTrade,resumeCoastalTrade} from '../src/game/coastalTrade.ts';
import {initializeSurvival} from '../src/game/survivalNeeds.ts';import {scoutKnowledge} from '../src/game/scouting.ts';
import {writeFileSync} from 'node:fs';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function ground(g){const size=g.world.size;for(let z=0;z<=SEGS;z++)for(let x=0;x<=SEGS;x++){const p=z/SEGS*size-size/2;g.world.heights[z*(SEGS+1)+x]=Math.abs(p)<8?g.world.waterY-1:4;}g.world.rivers=[];g.world.features=[];g.rebuildWalk();for(const u of g.state.units)u.y=u.haulage==='canoe'?Math.max(g.height(u.x,u.z),g.waterAt(u.x,u.z)+.16):g.height(u.x,u.z);for(const b of g.state.buildings)b.y=g.height(b.x,b.z);const clock=g.clockState.bind(g);g.clockState=()=>({...clock(),period:'Day'});}
function fixture(){const g=new Game();g.reset(123456,3);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.autoWorkEnabled=false;g.state.rivalKnowledge=[];g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.conflict='quiet';for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 for(const t of g.state.tribes)Object.assign(t,{food:300,foodLots:undefined,wood:0,stone:0,copper:0,iron:0,spears:0,bows:0,blades:0,aggro:0,hostile:false,ally:false,trust:.8,tension:0,thinkT:10000});
 for(const [team,z]of [[1,-24],[2,24]]){g.state.buildings.push(g.makeBld('townhall',0,z,team));g.state.buildings.push(g.makeBld('dock',0,team===1?-10:10,team));for(let i=0;i<5;i++){const u=g.spawnUnit('worker',10+i*2,z,team);u.order='hold';u.jobLock=true;}}
 const player=g.spawnUnit('worker',-100,-40,0);player.order='hold';player.jobLock=true;g.state.buildings.push(g.makeBld('townhall',-100,-40,0));ground(g);const captain=g.state.units.find(u=>u.team===1);captain.jobLock=false;const home=g.state.buildings.find(b=>b.team===1&&b.type==='townhall');const p=g.interactionSpot(captain,home);assert.ok(p);Object.assign(captain,{x:p.x,z:p.z,tx:p.x,tz:p.z});
 const observer=g.state.units.find(u=>u.team===1&&u!==captain);observer.x=20;observer.z=20;scoutKnowledge(g,observer);observer.x=18;observer.z=-24;endowSettlementSites(g,1,2);endowStructureReports(g,1,2);
 Object.assign(g.tribe(1),{wood:180,stone:36});Object.assign(g.tribe(2),{wood:0,stone:100});initializeSurvival(g);g.state.coastalTradeReviewAt=1e8;g.state.scoutTimer=1000;return {g,captain,home,dock:g.state.buildings.find(b=>b.team===1&&b.type==='dock')};}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.state.paused=false;const before=g.state.time;g.step(.1);assert.ok(g.state.time>before,'Scenario simulation must keep running');}assert.deepEqual(g.simulationErrors,[]);}

import{prepareSocietyHandover}from'../src/game/communityHandover.ts';import{validateGameSave,gameSnapshot}from'../src/game/persistence.ts';
test('refused actual coastal voyage returns after lawful handover without corrupting planner memory',()=>{
 const{g,captain,dock,home}=fixture();g.state.contacts=[1,2];g.state.nightWork=true;
 // No requested stone exists in the partner's declared initial inventory.
 g.tribe(2).stone=0;
 assert.equal(beginRiverboat(g,dock.id,1,captain.id),true);drive(g,230,()=>!!g.state.boats?.length);
 const boat=g.state.boats[0],spot=g.interactionSpot(captain,home);captain.order='move';captain.tx=spot.x;captain.tz=spot.z;drive(g,40,()=>g.buildingWorkReached(captain,home));captain.order='hold';
 const dispatch=dispatchCoastalTrade(g,1,boat.id,2,'wood','stone',12);assert.equal(dispatch.accepted,true,dispatch.reason);let v=g.state.coastalVoyages.find(v=>v.id===dispatch.voyageId);
 drive(g,450,()=>v.phase==='boardingHome');assert.equal(v.phase,'boardingHome',JSON.stringify(v));assert.equal(v.traded,false);assert.ok(v.talk>=4);assert.equal(captain.carry,12);
 const before={x:captain.x,z:captain.z,cargo:captain.carry,food:v.food,water:v.water,boatX:boat.x,boatZ:boat.z,talk:v.talk};
 g.state.paused=true;const plan=prepareSocietyHandover(g,1);assert.equal(plan.accepted,true,plan.reason);g.commitCommunityState(plan.state);v=g.state.coastalVoyages.find(row=>row.id===dispatch.voyageId);const body=g.state.units.find(u=>u.id===captain.id),hull=g.state.boats.find(b=>b.id===boat.id);
 assert.deepEqual({x:body.x,z:body.z,cargo:body.carry,food:v.food,water:v.water,boatX:hull.x,boatZ:hull.z,talk:v.talk},before);assert.equal(v.originTeam,1);assert.equal(v.team,0);assert.doesNotThrow(()=>validateGameSave(gameSnapshot(g)));
 const wood=g.tribe(0).wood;drive(g,450,()=>v.phase==='complete');assert.equal(v.phase,'complete',JSON.stringify({v,body}));assert.equal(g.tribe(0).wood,wood+12);assert.equal(body.carry,0);assert.equal(v.metrics.returned,1);assert.doesNotThrow(()=>validateGameSave(gameSnapshot(g)));assert.ok(g.state.rivalTradeRefusals?.some(r=>r.team===1&&r.partner===2));assert.equal(g.state.rivalTradeRefusals?.some(r=>r.team===0),false);
});
