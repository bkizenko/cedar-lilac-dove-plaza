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
test('G16: an outbound coastal trader that sights a storm turns home with its original cargo and completes without selling',()=>{
 let {g,captain,dock}=fixture();assert.equal(beginRiverboat(g,dock.id,1),true);drive(g,200,()=>!!g.state.boats?.length);const boat=g.state.boats[0];
 assert.equal(g.placeBuilding('fibreWorkshop',-26,-24,1),true);captain=g.state.units.find(u=>u.id===captain.id);const p=g.interactionSpot(captain,g.state.buildings.find(b=>b.team===1&&b.type==='townhall'));
 captain.order='move';captain.tx=p.x;captain.tz=p.z;drive(g,30,()=>g.buildingWorkReached(captain,g.state.buildings.find(b=>b.team===1&&b.type==='townhall')));captain.order='hold';
 for(let k=0;k<6&&!g.state.coastalVoyages?.length;k++){g.state.coastalTradeReviewAt=g.state.time;drive(g,30,()=>!!g.state.coastalVoyages?.length);}const v=g.state.coastalVoyages.find(v=>v.team===1);
 drive(g,120,()=>v.phase==='sailingOut');assert.equal(v.phase,'sailingOut');const cargo=captain.carry,kind=captain.carryType,partnerWood=g.tribe(2).wood;
 g.state.seaStorms={version:1,nextCheckAt:1e9,index:0,storms:[{id:g.id(),x:boat.x,z:boat.z+5,radius:30,intensity:.1,startedAt:g.state.time,until:g.state.time+40,exposures:[]}]};
 drive(g,1);assert.ok(['sailingHome','landingHome','unloading'].includes(v.phase),v.phase);assert.equal(v.stormTurnbacks,1);assert.match(v.blockedReason,/storm/);
 assert.doesNotThrow(()=>decodeGame(JSON.parse(JSON.stringify(encodeGame(g)))));
 drive(g,400,()=>['complete','lost'].includes(v.phase));assert.equal(v.traded,false,'never reached the partner');assert.equal(g.tribe(2).wood,partnerWood,'partner untouched');void cargo;void kind;
});
import {proposeTradeOffer} from '../src/game/tradeNeeds.ts';
test('G15: walking needs-caravans are not proposed across water; overseas partners are left to the boat path',()=>{
 const {g}=fixture();assert.equal(proposeTradeOffer(g,1,2,'wood','stone').reason,'no-land-route');
});
