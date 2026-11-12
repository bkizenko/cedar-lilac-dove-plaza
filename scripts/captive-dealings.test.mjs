import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {tickOccupation,occupationActorAI,validConflictIntentState} from '../src/game/conflictIntent.ts';
import {acceptPrisonerSurrender,prisonerAI} from '../src/game/captivity.ts';
import {interrogateCaptive,captiveIntel,proposeRansom,answerRansom,exchangePrisoners,integrateCaptive,custodySeconds,validCaptiveDealingsState,CAPTIVE_DEALINGS_RULES} from '../src/game/captiveDealings.ts';
import {tickStolenCargo,droppedParcels} from '../src/game/stolenCargo.ts';

function fixture(){const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',80,38,1),g.makeBld('townhall',-120,38,2)];g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();
 for(const id of [1,2])for(let i=0;i<4;i++){const u=g.spawnUnit('worker',(id===1?84:-116)+i,30,id);u.order='hold';}
 return{g,home:g.state.buildings[0],hall:g.state.buildings[1]};}
function drive(g,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units){if(u.hp<=0)continue;if(prisonerAI(g,u,.1))continue;occupationActorAI(g,u,.1);}tickOccupation(g,.1);tickStolenCargo(g,.1);}}
function capture(g,captor=0,origin=1,x=74){const guard=g.spawnUnit('spearman',x-2,52,captor),target=g.spawnUnit('worker',x,52,origin);const r=acceptPrisonerSurrender(g,target,captor);assert.equal(r.accepted,true,r.reason);return{guard,target};}
const reload=g=>{const c=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));c.world.heights.fill(4);c.vision.fill(2);c.rebuildWalk();return c;};
const woodTotal=g=>g.state.tribes.reduce((n,t)=>n+(t.wood||0),0)+g.state.units.reduce((n,u)=>n+(u.hp>0&&u.carryType==='wood'?u.carry:0),0)+droppedParcels(g).filter(p=>p.kind==='wood').reduce((n,p)=>n+p.amount,0);

test('interrogation needs custody, a present guard and time; yields only the capture-time snapshot',()=>{
 const {g}=fixture();g.tribe(1).wood=58;const {guard,target}=capture(g);
 assert.equal(interrogateCaptive(g,target.id).accepted,false,'not during escort');
 drive(g,60);assert.equal(target.prisoner.phase,'custody');const knew=target.prisoner.knows;assert.equal(knew.homeWood,60);assert.equal(knew.team,1);
 g.tribe(1).wood=900;for(let i=0;i<5;i++)g.spawnUnit('spearman',82+i,40,1);
 assert.equal(interrogateCaptive(g,target.id).accepted,true);
 const gx=guard.x,gz=guard.z;guard.x=-300;drive(g,20);assert.equal(g.state.captiveDealings.interrogations[0].progressSeconds,0,'no guard present: no progress');
 guard.x=gx;guard.z=gz;drive(g,CAPTIVE_DEALINGS_RULES.interrogationSeconds+3);
 const intel=captiveIntel(g,0);assert.equal(intel.length,1);assert.equal(intel[0].knowledge.homeWood,60,'stores as they were when taken, not now');assert.equal(intel[0].knowledge.homeArmed,0,'fighters raised after capture are unknown');
 assert.equal(captiveIntel(g,1).length,0,'origin learns nothing');assert.equal(interrogateCaptive(g,target.id).accepted,false,'nothing more to tell');
});
test('a person captured without any recorded knowledge (old save) yields nothing',()=>{
 const {g}=fixture();const {target}=capture(g);drive(g,60);delete target.prisoner.knows;interrogateCaptive(g,target.id);drive(g,CAPTIVE_DEALINGS_RULES.interrogationSeconds+3);
 assert.equal(captiveIntel(g,0)[0].knowledge,null);
});
test('ransom: origin pays from real stock by a carrier; goods conserved at every phase; captive released only on delivery',()=>{
 let {g}=fixture();g.tribe(1).wood=40;const {target}=capture(g);drive(g,60);const total=woodTotal(g);
 const r=proposeRansom(g,target.id);assert.equal(r.accepted,true,r.reason);assert.equal(woodTotal(g),total);
 drive(g,CAPTIVE_DEALINGS_RULES.ransomAnswerSeconds+2);let rec=g.state.captiveDealings.ransoms[0];assert.notEqual(rec.phase,'proposed');assert.notEqual(rec.phase,'refused',rec.reason);
 g=reload(g);let held=g.state.units.find(u=>u.id===target.id);assert.ok(held.prisoner&&held.prisoner.phase==='custody','still held until goods arrive');
 for(let i=0;i<40&&g.state.captiveDealings.ransoms[0].phase!=='carrying';i++)drive(g,1);
 rec=g.state.captiveDealings.ransoms[0];assert.equal(rec.phase,'carrying');assert.equal(woodTotal(g),total,'loaded goods are on the carrier');
 g=reload(g);assert.equal(woodTotal(g),total);
 for(let i=0;i<120&&g.state.captiveDealings.ransoms[0].phase==='carrying';i++)drive(g,1);
 rec=g.state.captiveDealings.ransoms[0];assert.equal(rec.phase,'paid',rec.reason);assert.equal(woodTotal(g),total);
 held=g.state.units.find(u=>u.id===target.id);assert.equal(held.team,1,'released to walk home');assert.equal(held.prisoner.phase,'released');
});
test('a ransom carrier killed on the road leaves a real parcel; nothing is credited and the captive stays held',()=>{
 const {g}=fixture();g.tribe(1).wood=40;const {target}=capture(g);drive(g,60);const total=woodTotal(g),ours=g.tribe(0).wood;
 proposeRansom(g,target.id);drive(g,CAPTIVE_DEALINGS_RULES.ransomAnswerSeconds+2);
 for(let i=0;i<40&&g.state.captiveDealings.ransoms[0].phase!=='carrying';i++)drive(g,1);
 const carrier=g.state.units.find(u=>u.id===g.state.captiveDealings.ransoms[0].carrierId);carrier.hp=0;drive(g,2);
 assert.equal(g.state.captiveDealings.ransoms[0].phase,'failed');assert.equal(g.tribe(0).wood,ours);assert.equal(woodTotal(g),total,'conserved as a dropped parcel');assert.equal(target.prisoner.phase,'custody');
});
test('exchange releases both people at once and each walks home with their own team',()=>{
 const {g}=fixture();const a=capture(g,0,1,74).target;const b=capture(g,1,0,30).target;
 const r=exchangePrisoners(g,a.id,b.id);assert.equal(r.accepted,true,r.reason);assert.equal(a.team,1);assert.equal(b.team,0);assert.equal(a.prisoner.phase,'released');assert.equal(b.prisoner.phase,'released');
 assert.equal(exchangePrisoners(g,a.id,b.id).accepted,false,'cannot exchange twice');
});
test('integration needs long custody and housing; provenance kept; the guard stands down to work afterwards',()=>{
 const {g}=fixture();const {guard,target}=capture(g);guard.militia=true;guard.type='worker';drive(g,60);
 assert.equal(integrateCaptive(g,target.id).accepted,false,'too soon');
 g.state.captiveDealings.custodySince[0].since-=CAPTIVE_DEALINGS_RULES.integrateAfterSeconds;assert.ok(custodySeconds(g,target.id)>=CAPTIVE_DEALINGS_RULES.integrateAfterSeconds);
 const r=integrateCaptive(g,target.id);assert.equal(r.accepted,true,r.reason);assert.equal(target.prisoner,undefined);assert.equal(target.team,0);
 assert.deepEqual(g.state.captiveDealings.integrations.map(i=>[i.unitId,i.originTeam,i.captorTeam]),[[target.id,1,0]]);
 drive(g,2);assert.equal(guard.demobilizing,true,'escort duty over: militia returns weapons and goes back to work');
});
test('NPC captors question and then ask ransom on their own; saves validate, corruption rejected, old saves load',()=>{
 const {g}=fixture();g.tribe(2).wood=60;const {target}=capture(g,1,2,84);drive(g,60);
 drive(g,CAPTIVE_DEALINGS_RULES.interrogationSeconds+3);assert.equal(captiveIntel(g,1).length,1,'NPC captor questioned its captive');
 drive(g,30);const since=g.state.captiveDealings.custodySince[0];since.since=g.state.time-CAPTIVE_DEALINGS_RULES.ransomAfterSeconds-1;assert.ok(since.since>=0);drive(g,2);
 assert.equal(g.state.captiveDealings.ransoms.length,1);assert.equal(g.state.captiveDealings.ransoms[0].captorTeam,1);
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));assert.equal(validCaptiveDealingsState(raw.state),true);assert.equal(validConflictIntentState(raw.state),true,JSON.stringify(raw.state.occupations));
 const bad=structuredClone(raw.state);bad.captiveDealings.ransoms[0].amount=-3;assert.equal(validCaptiveDealingsState(bad),false);
 const badK=structuredClone(raw.state);badK.units.find(u=>u.id===target.id).prisoner.knows.homeWood=-1;assert.equal(validCaptiveDealingsState(badK),false);
 const old=structuredClone(raw.state);delete old.captiveDealings;for(const u of old.units)if(u.prisoner)delete u.prisoner.knows;assert.equal(validCaptiveDealingsState(old),true);
 void answerRansom;
});
