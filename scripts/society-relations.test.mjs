import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {acceptPrisonerSurrender} from '../src/game/captivity.ts';
import {initializeSurvival} from '../src/game/survivalNeeds.ts';
import {raidLootAI} from '../src/game/warfare.ts';
import {scoutKnowledge} from '../src/game/scouting.ts';
import {societyRelation,societiesAreFoes,recordSocietyContact,recordSocietyAttack,declareSocietyHostility,acceptSocietyPeace,validSocietyRelations} from '../src/game/societyRelations.ts';
import {assessRivalPairRaid,planRivalPairRaid,dispatchPairRaid,dispatchSocietyPeace,societyMissionAI,tickSocietyMissionNeeds,tickRivalActivity,cancelSocietyMission,resumeSocietyMission,validRivalActivityState,rivalPairActivityStatus} from '../src/game/rivalActivity.ts';

// Declared small land scenario, not a natural-map or campaign balance gate.
// Knowledge is supplied by an actual society-owned observer, not global vision.
function fixture(){
 const g=new Game();g.reset(123456,2);g.enterIsland();g.state.time=800;g.state.conflict='dangerous';g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];
 g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,0,1),g.makeBld('townhall',85,0,2),g.makeBld('warehouse',110,0,2),g.makeBld('warehouse',110,80,0)];
 for(const key of ['trees','stones','copper','iron','forage','fish','wildlife'])g.state[key]=[];
 Object.assign(g.tribe(1),{alive:true,food:100,aggro:.8,hostile:false,ally:false});Object.assign(g.tribe(2),{alive:true,hostile:false,ally:false});
 for(let i=0;i<10;i++){const u=g.spawnUnit(i<4?'spearman':'worker',6+i%3,8+Math.floor(i/3),1);u.order='idle';}
 g.spawnUnit('worker',80,8,2);g.rebuildWalk();return g;
}
function observe(g,team,x,z){const observer=g.spawnUnit('worker',x,z,team);observer.jobLock=true;observer.order='hold';scoutKnowledge(g,observer);return observer;}
function putAtOwnCache(g,u){const home=g.state.buildings.find(b=>b.team===u.team&&b.type==='townhall'),spot=g.interactionSpot(u,home);assert.ok(spot);Object.assign(u,{x:spot.x,z:spot.z,tx:spot.x,tz:spot.z});}
function drive(g,seconds,{combat=false,until=()=>false}={}){
 const end=g.state.time+seconds;while(g.state.time<end&&!until()){
  g.state.time+=.1;g.navBudget=50;tickSocietyMissionNeeds(g,.1);
  for(const u of [...g.state.units]){if(u.hp<=0)continue;if(societyMissionAI(g,u,.1))continue;if(u.societyMissionId){if(combat){if(!raidLootAI(g,u,.1))g.combatAI(u,.1);}else g.steer(u,.1);}}
  tickRivalActivity(g);if(g.state.walkDirty){g.rebuildWalk();g.state.walkDirty=false;}
 }
}
test('directed firsthand grievances create pair conflict, and a witnessed truce leaves unrelated pairs unchanged',()=>{
 const g=fixture(),attacker=g.state.units[0],victim=g.spawnUnit('worker',12,8,2),third=g.spawnUnit('worker',13,8,0);
 assert.equal(societiesAreFoes(g,1,2),false);assert.equal(g.state.societyRelations,undefined);
 assert.equal(recordSocietyAttack(g,attacker,victim,4),true);assert.ok(societyRelation(g,2,1).grievance>0);assert.equal(societyRelation(g,1,2).grievance,0);assert.equal(societiesAreFoes(g,2,1),true);
 assert.equal(recordSocietyAttack(g,third,victim,2),true);assert.equal(societiesAreFoes(g,0,2),true);assert.equal(acceptSocietyPeace(g,attacker,victim),true);assert.equal(societiesAreFoes(g,1,2),false);assert.equal(societiesAreFoes(g,0,2),true);assert.ok(societyRelation(g,2,1).peaceUntil>g.state.time);
 const remote=g.spawnUnit('worker',250,200,2);const before=JSON.stringify(g.state.societyRelations);assert.equal(acceptSocietyPeace(g,attacker,remote),false);assert.equal(JSON.stringify(g.state.societyRelations),before);
 assert.equal(validSocietyRelations(g.state.societyRelations,g.state.tribes.length),true);const broken=structuredClone(g.state.societyRelations);broken.push({...broken[0]});assert.equal(validSocietyRelations(broken,g.state.tribes.length),false);
});
test('pair raid utility requires own observations, can target another rival, and never inspects its remote treasury or armies',()=>{
 const g=fixture();assert.equal(planRivalPairRaid(g,1,600,2),null);observe(g,1,95,0);
 const original=g.tribe(2).food;Object.defineProperty(g.tribe(2),'food',{configurable:true,get(){throw Error('Remote treasury was inspected');}});
 const plan=planRivalPairRaid(g,1,600,2);assert.ok(plan);assert.equal(plan.target.team,2);assert.ok(plan.fighters.length>=2);assert.ok(plan.metrics.guards>=1);assert.equal(g.state.societyRelations,undefined,'considering a known target does not fabricate contact');
 for(let i=0;i<20;i++)g.spawnUnit('spearman',400+i,300,2);const next=planRivalPairRaid(g,1,600,2);assert.equal(next.metrics.observedDefenders,plan.metrics.observedDefenders);assert.equal(next.utility,plan.utility);
 Object.defineProperty(g.tribe(2),'food',{configurable:true,writable:true,value:original});
});
test('actual pair dispatch, physical contact and bounded withdrawal count separately with real existing actors',()=>{
 const g=fixture();observe(g,1,95,0);const ids=new Set(g.state.units.map(u=>u.id)),stock=g.tribe(1).wood,allUnits=g.state.units.length;
 const dispatched=dispatchPairRaid(g,1,600,2);assert.equal(dispatched.accepted,true,dispatched.reason);const m=g.state.rivalMissions[0];assert.equal(m.partner,2);assert.ok(m.actors.every(a=>ids.has(a.id)));assert.equal(g.state.units.length,allUnits);assert.equal(g.tribe(1).wood,stock);assert.equal(societiesAreFoes(g,1,2),false);assert.equal(g.state.rivalActivity.totals['1:2:raid:departed'],1);assert.equal(g.state.rivalActivity.totals['1:2:raid:contact'],undefined);
 drive(g,70,{until:()=>m.phase==='contact'});assert.equal(m.phase,'contact');assert.equal(societiesAreFoes(g,1,2),true);assert.ok(g.state.rivalActivity.totals['1:2:raid:meters']>20);
 // The existing combat executor remains responsible for damage and finite ruins.
 g.isFoe=(a,b)=>societiesAreFoes(g,a,b);drive(g,160,{combat:true,until:()=>m.phase==='completed'});assert.equal(m.resolved,true,JSON.stringify({mission:m,buildings:g.state.buildings.map(b=>({id:b.id,hp:b.hp,team:b.team,type:b.type})),actors:g.state.units.filter(u=>u.societyMissionId).map(u=>({id:u.id,order:u.order,x:u.x,z:u.z,target:u.target?.id}))}));assert.equal(m.phase,'completed');assert.equal(g.state.rivalActivity.totals['1:2:raid:contact'],1);assert.equal(g.state.rivalActivity.totals['1:2:raid:returned'],1);assert.equal(g.state.rivalActivity.totals['1:2:raid:actors_returned'],m.actors.length);assert.equal(g.state.units.length,allUnits);assert.ok(g.state.units.filter(u=>u.team===1&&!u.societyMissionId).length>=m.actors.length);
});
test('peace courier pays for a physical round trip; agreement and return occur only on arrival',()=>{
 const g=fixture();observe(g,1,90,0);declareSocietyHostility(g,1,2);const u=g.state.units.find(u=>u.team===1&&u.type==='worker'&&!u.jobLock);putAtOwnCache(g,u);
 const initialFood=g.tribe(1).food,initialCount=g.state.units.length,result=dispatchSocietyPeace(g,1,2);assert.equal(result.accepted,true,result.reason);let m=g.state.rivalMissions[0];assert.ok(m.food>0);assert.equal(g.tribe(1).food,initialFood-m.food);assert.equal(g.state.rivalActivity.totals['1:2:peace:contact'],undefined);assert.equal(societiesAreFoes(g,1,2),true);
 drive(g,2);assert.equal(m.resolved,false);assert.equal(societiesAreFoes(g,1,2),true);
 // Optional extensions survive JSON before shared save wiring is enabled.
 g.state.rivalMissions=JSON.parse(JSON.stringify(g.state.rivalMissions));g.state.rivalActivity=JSON.parse(JSON.stringify(g.state.rivalActivity));g.state.societyRelations=JSON.parse(JSON.stringify(g.state.societyRelations));m=g.state.rivalMissions[0];assert.equal(validRivalActivityState(g.state,g.state.tribes.length),true);
 drive(g,160,{until:()=>m.phase==='completed'});assert.equal(m.phase,'completed');assert.equal(m.resolved,true);assert.equal(societiesAreFoes(g,1,2),false);assert.equal(g.state.rivalActivity.totals['1:2:peace:contact'],1);assert.equal(g.state.rivalActivity.totals['1:2:peace:returned'],1);assert.ok(g.state.rivalActivity.totals['1:2:peace:meters']>100);assert.equal(g.state.units.length,initialCount);assert.ok(Math.abs(initialFood-g.tribe(1).food-g.state.rivalActivity.totals['1:2:peace:food_used'])<1e-7);
});
test('interrupted courier retains paid supplies, yields to explicit orders and resumes without repurchase; death is counted once',()=>{
 const g=fixture();observe(g,1,90,0);declareSocietyHostility(g,1,2);const u=g.state.units.find(u=>u.team===1&&u.type==='worker'&&!u.jobLock);putAtOwnCache(g,u);assert.equal(dispatchSocietyPeace(g,1,2).accepted,true);const m=g.state.rivalMissions[0];drive(g,3);const paid=g.tribe(1).food,pack=m.food;assert.equal(cancelSocietyMission(g,u),true);u.order='hold';assert.equal(societyMissionAI(g,u,1),false);assert.equal(m.food,pack);tickSocietyMissionNeeds(g,1);assert.ok(m.food<pack);assert.equal(resumeSocietyMission(g,m.id),true);assert.equal(g.tribe(1).food,paid);
 u.hp=0;tickRivalActivity(g);tickRivalActivity(g);assert.equal(m.phase,'lost');assert.equal(m.food,0);assert.equal(g.state.rivalActivity.totals['1:2:peace:lost'],1);assert.equal(g.state.rivalActivity.totals['1:2:peace:returned'],undefined);
 const bad=structuredClone(g.state);bad.rivalMissions[0].food=-1;assert.equal(validRivalActivityState(bad,g.state.tribes.length),false);
});

test('messenger drinking water is paid locally, consumed from the real pack, and returned without duplication',()=>{
 const g=fixture();observe(g,1,90,0);initializeSurvival(g);declareSocietyHostility(g,1,2);const u=g.state.units.find(u=>u.team===1&&u.type==='worker'&&!u.jobLock);putAtOwnCache(g,u);const stock=g.tribe(1).survival,initial=stock.waterLiters;assert.equal(dispatchSocietyPeace(g,1,2).accepted,true);const m=g.state.rivalMissions[0];assert.ok(m.waterLiters>0);assert.equal(stock.waterLiters+m.waterLiters,initial);drive(g,160,{until:()=>m.phase==='completed'});assert.equal(m.phase,'completed');assert.ok(stock.waterConsumedLiters>0);assert.ok(Math.abs(initial-stock.waterLiters-stock.waterConsumedLiters)<1e-7);assert.equal(m.waterLiters,0);
});
test('pair assessments explain scarcity and guard failures, and save validation rejects duplicate actor ownership',()=>{
 const g=fixture();assert.match(assessRivalPairRaid(g,1,20,2).reason,/Food reserve/);for(const u of g.state.units)if(u.team===1&&u.type!=='worker')u.jobLock=true;assert.match(assessRivalPairRaid(g,1,600,2).reason,/guards/);for(const u of g.state.units)u.jobLock=false;observe(g,1,90,0);declareSocietyHostility(g,1,2);const u=g.state.units.find(u=>u.team===1&&u.type==='worker'&&!u.jobLock);putAtOwnCache(g,u);assert.equal(dispatchSocietyPeace(g,1,2).accepted,true);assert.equal(validRivalActivityState(g.state,g.state.tribes.length),true);const bad=structuredClone(g.state);bad.rivalMissions.push({...structuredClone(bad.rivalMissions[0]),id:bad.rivalMissions[0].id+100});assert.equal(validRivalActivityState(bad,g.state.tribes.length),false);const flag=structuredClone(g.state);delete flag.units.find(p=>p.id===u.id).societyMissionId;assert.equal(validRivalActivityState(flag,g.state.tribes.length),false);
});

test('capturing the actual peace courier preserves paid pack supplies on that same body, without refund',()=>{
 const g=fixture();observe(g,1,90,0);initializeSurvival(g);declareSocietyHostility(g,1,2);const u=g.state.units.find(u=>u.team===1&&u.type==='worker'&&!u.jobLock);putAtOwnCache(g,u);assert.equal(dispatchSocietyPeace(g,1,2).accepted,true);const m=g.state.rivalMissions[0];drive(g,40,{until:()=>u.x>50});assert.ok(u.x>50);g.spawnUnit('spearman',u.x+1,u.z,2);const food=m.food,water=m.waterLiters,stock=g.tribe(1).food;assert.equal(acceptPrisonerSurrender(g,u,2).accepted,true);tickRivalActivity(g);assert.equal(u.prisoner.food,food);assert.equal(u.prisoner.waterLiters,water);assert.equal(m.food,0);assert.equal(m.waterLiters,0);assert.equal(m.phase,'lost');assert.equal(g.tribe(1).food,stock);assert.equal(u.societyMissionId,undefined);assert.equal(g.state.rivalActivity.totals['1:2:peace:actors_lost'],1);
});
test('activity ratios count missions separately from actors and keep unexecuted plans out of contact totals',()=>{
 const g=fixture();observe(g,1,95,0);assert.ok(planRivalPairRaid(g,1,600,2));assert.equal(rivalPairActivityStatus(g,1,2,'raid').departures,0);assert.equal(dispatchPairRaid(g,1,600,2).accepted,true);let status=rivalPairActivityStatus(g,1,2,'raid');assert.equal(status.departures,1);assert.equal(status.contacts,0);assert.equal(status.returnRate,0);const m=g.state.rivalMissions[0];drive(g,70,{until:()=>m.phase==='contact'});g.isFoe=(a,b)=>societiesAreFoes(g,a,b);drive(g,160,{combat:true,until:()=>m.phase==='completed'});status=rivalPairActivityStatus(g,1,2,'raid');assert.equal(status.contactRate,1);assert.equal(status.returnRate,1);assert.equal(status.actorsReturned,m.actors.length);assert.ok(status.goodsDelivered>0);
});

test('witnessed pair truce clears cached attacks and orders actual mission withdrawal while third-party combat survives',()=>{
 const g=fixture();observe(g,1,95,0);assert.equal(dispatchPairRaid(g,1,600,2).accepted,true);const m=g.state.rivalMissions[0];drive(g,70,{until:()=>m.phase==='contact'});const actor=g.state.units.find(u=>u.id===m.actors[0].id),recipient=g.state.units.find(u=>u.team===2);recipient.x=actor.x+1;recipient.z=actor.z;const third=g.spawnUnit('spearman',actor.x+2,actor.z,0);declareSocietyHostility(g,0,2);third.target=recipient;third.pillage=2;third.order='attack';assert.equal(acceptSocietyPeace(g,actor,recipient),true);assert.equal(actor.target,null);assert.equal(actor.pillage,-1);assert.equal(third.target,recipient);assert.equal(societiesAreFoes(g,0,2),true);tickRivalActivity(g);assert.equal(m.phase,'returning');drive(g,90,{until:()=>m.phase==='completed'});assert.equal(m.phase,'completed');assert.equal(societiesAreFoes(g,1,2),false);assert.equal(g.state.rivalActivity.totals['1:2:raid:returned'],1);
});
