import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {enableCombatDoctrine} from '../src/game/combatDoctrine.ts';
import {assignGuardDuty,releaseGuardDuty,onGuardDuty,gathererOccupants,guardDutyAI,patrolWaypoint,tickGuardDuties,validGuardDuties} from '../src/game/guardDuty.ts';
import {treeHasRoom} from '../src/game/workAllocation.ts';
import {noteRaidCombat,tickRaidReports,raidReportText,latestRaidReport,validRaidReports} from '../src/game/raidReports.ts';
import {raidLootAI} from '../src/game/warfare.ts';
import {declareSocietyHostility,agreeSocietyTruce,nudgeSocietyRelation} from '../src/game/societyRelations.ts';
import {transitStatus,agreeTransit,transitDeparture,routeAbandoned,tickTransit,validTransit,findAgreement,TRANSIT_RULES} from '../src/game/transit.ts';
import {planCaravan,tickCaravanRoutes} from '../src/game/caravanRoutes.ts';
import {refreshSettlementSites} from '../src/game/settlementKnowledge.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function world(){
 const g=new Game();g.reset(4242,3);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.buildings=[g.makeBld('townhall',0,0,0),g.makeBld('townhall',70,0,1)];g.state.conflict='quiet';g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();
 return g;
}
const armed=(g,type,x,z,team=0)=>{const u=g.spawnUnit(type,x,z,team);u.militia=true;return u;};

test('guards, patrols and escorts never occupy gatherer slots, and gatherers keep theirs', () => {
 const g=world();enableCombatDoctrine(g);
 const tree={kind:'tree',id:9001,x:10,z:10,amount:100,hp:100};
 const cutter=g.spawnUnit('worker',11,10,0),second=g.spawnUnit('worker',9,10,0),third=g.spawnUnit('worker',10,12,0);
 for(const w of [cutter,second]){w.order='gather';w.node=tree;}
 const guard=armed(g,'spearman',10,11),patrol=armed(g,'spearman',12,10),escorted=armed(g,'spearman',13,10);
 for(const u of [guard,patrol,escorted]){u.order='gather';u.node=tree;}
 assert.equal(gathererOccupants(g,tree),5,'before duty everybody beside the tree counts');
 assert.equal(assignGuardDuty(g,guard.id,'post',10,11).accepted,true);assert.equal(assignGuardDuty(g,patrol.id,'patrol',20,20).accepted,true);
 escorted.escortId=cutter.id;
 assert.equal(onGuardDuty(g,guard)&&onGuardDuty(g,patrol)&&onGuardDuty(g,escorted),true);
 // assignment released the claim on the tree, and escorts do not count either.
 assert.equal(guard.node,null);assert.equal(gathererOccupants(g,tree),2,'only the two real gatherers hold slots');
 assert.equal(treeHasRoom(g,tree,third),false,'two cutters fill the tree');
 releaseGuardDuty(g,guard.id);guard.order='idle';guard.node=null;
 for(const u of [patrol,escorted])u.order='idle';
 // Guards stood beside a tree add nothing to its crew: the third cutter's refusal is only about the two real cutters.
 const lone=world();enableCombatDoctrine(lone);const t2={kind:'tree',id:9002,x:10,z:10,amount:100,hp:100};
 const a=armed(lone,'spearman',10,10),b=armed(lone,'spearman',11,10),w=lone.spawnUnit('worker',12,10,0);
 for(const u of [a,b]){u.order='gather';u.node=t2;assignGuardDuty(lone,u.id,'post',10,10);u.order='gather';u.node=t2;}
 assert.equal(treeHasRoom(lone,t2,w),true,'two sentries at the same tree leave both cutter slots open');
});

test('only armed adults take duty; patrols are seeded loops and duty AI walks them', () => {
 const g=world();enableCombatDoctrine(g);
 const worker=g.spawnUnit('worker',5,5,0),guard=armed(g,'spearman',5,6);
 assert.equal(assignGuardDuty(g,worker.id,'post',5,5).accepted,false);assert.match(assignGuardDuty(g,worker.id,'post',5,5).reason,/gatherers keep their work/);
 assert.equal(assignGuardDuty(g,guard.id,'patrol',30,30).accepted,true);
 const duty=g.state.guardDuties[0];
 const route=[0,1,2,3,4].map(i=>patrolWaypoint(duty,i));assert.deepEqual(route[0],route[4]);assert.deepEqual(route,[0,1,2,3,4].map(i=>patrolWaypoint({...duty},i)));
 for(const p of route)assert.ok(Math.hypot(p.x-30,p.z-30)<=duty.radius+1e-9);
 const seen=new Set();let moved=0;
 for(let i=0;i<1500;i++){g.state.time+=.1;g.navBudget=50;guardDutyAI(g,guard,.1);g.combatAI(guard,.1);seen.add(duty.leg);moved=Math.max(moved,Math.hypot(guard.x-5,guard.z-6));}
 assert.ok(seen.size>=3,`patrol advanced through its legs: ${[...seen]}`);assert.ok(moved>10);
 assert.ok(Math.hypot(guard.x-30,guard.z-30)<=duty.radius+4,'the patrol stays near its anchor');
 // Duty ends when the person dies or is stood down, and bad saves are rejected.
 guard.hp=0;tickGuardDuties(g);assert.equal(g.state.guardDuties.length,0);
 const s=JSON.parse(JSON.stringify(g.state));assert.equal(validGuardDuties(s),true);s.guardDuties=[{id:1,team:0,unitId:2,kind:'sentinel',x:0,z:0,radius:5,leg:0,since:0}];assert.equal(validGuardDuties(s),false);
});

test('a standing watch fights inside its leash and returns to the post afterwards', () => {
 const g=world();enableCombatDoctrine(g);declareSocietyHostility(g,0,1);g.tribe(1).hostile=true;
 const guard=armed(g,'spearman',40,40);assignGuardDuty(g,guard.id,'post',40,40);
 const intruder=g.spawnUnit('spearman',44,40,3);intruder.hp=1;
 for(let i=0;i<600&&intruder.hp>0;i++){g.state.time+=.1;g.navBudget=50;guardDutyAI(g,guard,.1);g.combatAI(guard,.1);}
 assert.equal(intruder.hp,0,'the guard dealt with the intruder');
 guard.x=48;guard.z=40;for(let i=0;i<400;i++){g.state.time+=.1;g.navBudget=50;guardDutyAI(g,guard,.1);g.combatAI(guard,.1);}
 assert.ok(Math.hypot(guard.x-40,guard.z-40)<3.5,'back on post');
});

test('duty state is optional and old saves are untouched', () => {
 const g=world();assert.equal(g.state.guardDuties,undefined);
 const guard=armed(g,'spearman',5,6);assert.equal(assignGuardDuty(g,guard.id,'post',5,5).accepted,false,'switch off: no duty table appears');assert.equal(g.state.guardDuties,undefined);
 enableCombatDoctrine(g);assignGuardDuty(g,guard.id,'post',5,5);
 const back=decodeGame(encodeGame(g));assert.equal(back.state.guardDuties.length,1);assert.equal(back.state.guardDuties[0].unitId,guard.id);
});

// --- Raid reporting ---------------------------------------------------------------------------
function raidWorld(){
 const g=world();enableCombatDoctrine(g);g.state.buildings=[g.makeBld('townhall',0,0,0),g.makeBld('townhall',60,0,1),g.makeBld('warehouse',64,4,1)];
 g.tribe(1).food=300;g.tribe(1).wood=120;g.tribe(0).hostile=true;g.tribe(1).hostile=true;declareSocietyHostility(g,0,1);
 return g;
}
test('a raid report counts actual casualties, loot carried off, retreat and residents back at work', () => {
 const g=raidWorld();
 const raiders=[armed(g,'spearman',58,4),armed(g,'spearman',58,6),armed(g,'archer',56,5)];for(const r of raiders){r.pillage=1;r.order='attack';r.returnAfterCombat=true;}
 const defenders=[armed(g,'spearman',62,2,1),g.spawnUnit('worker',66,6,1),g.spawnUnit('worker',66,8,1)];
 const [sentry,farmer,weaver]=defenders;
 // Real fights: a defender and a civilian die, one raider dies; the weaver is hit and runs to shelter.
 g.applyCombatDamage(0,farmer,999,raiders[1].id);g.applyCombatDamage(0,sentry,999,raiders[0].id);g.applyCombatDamage(0,weaver,5,raiders[1].id);weaver.emergency={until:g.state.time+10,job:null,jobLock:false,autoArmed:false};
 g.applyCombatDamage(1,raiders[2],999,sentry.id);
 // The warehouse burns; its stores are exposed and a raider physically carries part of them away.
 const store=g.state.buildings[2];g.applyCombatDamage(0,store,store.hp+1,raiders[0].id);
 assert.ok(store.raidLoot?.food>0);const exposed=store.raidLoot.food;
 weaver.x=64;weaver.z=45;sentry.x=64;sentry.z=45;raiders[0].x=store.x;raiders[0].z=store.z;raiders[0].carry=0;raiders[0].order='attack';raiders[0].pillage=1;
 assert.equal(raidLootAI(g,raiders[0],.1),true);const carried=raiders[0].carry;assert.ok(carried>0);
 const rec=g.state.raidReports.active[0];
 assert.equal(rec.defenderLost,2);assert.equal(rec.defenderCivilianLost,1);assert.equal(rec.attackerLost,1);assert.equal(rec.buildingsLost,1);assert.equal(rec.kind,'raid');
 assert.equal(rec.carried.food,carried);assert.equal(rec.exposed.food,exposed);
 // Fighting stops; the survivors withdraw and the weaver goes back to work.
 raiders[0].order='return';raiders[1].x=10;raiders[1].z=0;
 let banner=null;g.banner=text=>{banner=text;};
 for(let i=0;i<60;i++){g.state.time+=1;tickRaidReports(g,1);}
 assert.equal(rec.phase,'settling');assert.equal(rec.outcome,'sacked');assert.equal(rec.retreated,2);assert.equal(rec.attackerSurvivors,2);
 assert.equal(rec.leftBehind.food,exposed-carried);
 // Alarm armed her; once the danger passes the normal stand-down returns her to her work.
 weaver.emergency=undefined;Object.assign(weaver,{type:'worker',militia:false});
 for(let i=0;i<30;i++){g.state.time+=1;tickRaidReports(g,1);}
 const done=latestRaidReport(g,1);assert.ok(done&&done.phase==='closed');assert.equal(g.state.raidReports.active.length,0);
 assert.equal(done.resumed,1,'only the weaver survives and she is back at civilian work');assert.equal(done.stillArmed,0);
 const text=raidReportText(g,done);
 assert.match(text,/sacked/);assert.match(text,/2 defenders lost \(1 civilian\)/);assert.match(text,/1 attacker lost/);assert.match(text,new RegExp(`${carried} food carried off`));assert.match(text,/2 raiders retreating/);assert.match(text,/1 resident back at civilian work/);
 assert.ok(banner&&/sacked/.test(banner),'the player is told');
 const back=decodeGame(encodeGame(g));assert.equal(back.state.raidReports.done.length,1);assert.equal(back.state.raidReports.done[0].carried.food,carried);
});
test('a repelled raid is reported as such, and reports are off without the switch', () => {
 const g=raidWorld();const raider=armed(g,'spearman',58,4);raider.pillage=1;raider.returnAfterCombat=true;const guard=armed(g,'swordsman',60,4,1);
 g.applyCombatDamage(1,raider,9999,guard.id);for(let i=0;i<50;i++){g.state.time+=1;tickRaidReports(g,1);}
 const r=g.state.raidReports.active[0]||g.state.raidReports.done[0];assert.equal(r.outcome,'destroyed');assert.equal(r.defenderLost,0);assert.equal(r.attackerLost,1);
 const quiet=world();const a=armed(quiet,'spearman',5,5),b=armed(quiet,'spearman',6,5,1);declareSocietyHostility(quiet,0,1);quiet.applyCombatDamage(0,b,5,a.id);assert.equal(quiet.state.raidReports,undefined);
 const s=JSON.parse(JSON.stringify(g.state));assert.equal(validRaidReports(s),true);
 const bad=JSON.parse(JSON.stringify(g.state));(bad.raidReports.active[0]||bad.raidReports.done[0]).outcome='won';assert.equal(validRaidReports(bad),false);
});

// --- Transit agreements and escorts -----------------------------------------------------------
function tradeWorld(){
 const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.buildings=[g.makeBld('townhall',0,0,0),g.makeBld('townhall',70,0,1)];g.vision.fill(2);g.state.weather='clear';g.clockState=()=>({period:'Afternoon'});
 Object.assign(g.tribe(0),{food:5000,wood:500,stone:50,spears:10});Object.assign(g.tribe(1),{alive:true,hostile:false,food:5000,wood:2000,stone:500,trust:.8,tension:0,age:0});
 for(let i=0;i<16;i++)g.spawnUnit('worker',i===15?52:8+i%4,i===15?0:8+Math.floor(i/4),0);
 refreshSettlementSites(g);g.rebuildWalk();return g;
}
test('a contested route needs a face-to-face agreement or armed escorts, and war blocks it', () => {
 const g=tradeWorld();enableCombatDoctrine(g);
 assert.equal(transitStatus(g,0,1).mode,'open');
 g.tribe(1).tension=.6;assert.equal(transitStatus(g,0,1).mode,'escort');assert.equal(transitStatus(g,0,1).guardsNeeded,TRANSIT_RULES.escortsWithoutAgreement);
 const envoy=g.spawnUnit('worker',20,0,0),elder=g.spawnUnit('worker',60,0,1);
 assert.equal(agreeTransit(g,envoy,elder).accepted,false);assert.match(agreeTransit(g,envoy,elder).reason,/face to face/);assert.equal(findAgreement(g,0,1),undefined);
 envoy.x=55;envoy.z=0;g.tribe(1).trust=.1;nudgeSocietyRelation(g,0,1,{trust:-1});
 assert.equal(agreeTransit(g,envoy,elder).accepted,false,'they must trust travellers first');
 g.tribe(1).trust=.8;nudgeSocietyRelation(g,0,1,{trust:.8});
 const signed=agreeTransit(g,envoy,elder);assert.equal(signed.accepted,true,signed.reason);
 assert.equal(transitStatus(g,0,1).mode,'agreement');assert.equal(g.state.transit.agreements.length,1);
 // Agreements lapse by the clock...
 g.state.time+=TRANSIT_RULES.agreementSeconds+5;tickTransit(g,3);assert.equal(g.state.transit.agreements[0].status,'lapsed');assert.equal(transitStatus(g,0,1).mode,'escort');
 // ...and break when someone attacks.
 agreeTransit(g,envoy,elder);assert.equal(transitStatus(g,0,1).mode,'agreement');
 declareSocietyHostility(g,1,0);g.tribe(1).hostile=true;tickTransit(g,3);
 assert.equal(g.state.transit.agreements[0].status,'broken');assert.equal(transitStatus(g,0,1).mode,'blocked');
 const back=decodeGame(encodeGame(g));assert.equal(back.state.transit.agreements.length,1);
 const s=JSON.parse(JSON.stringify(g.state));assert.equal(validTransit(s),true);s.transit.agreements[0].status='kinda';assert.equal(validTransit(s),false);
});
test('caravans on a contested road wait for escorts, then abandon the route; escorts or an agreement reopen it', () => {
 const g=tradeWorld();enableCombatDoctrine(g);
 for(let i=0;i<3;i++){const s=armed(g,'spearman',10+i,12);s.order='hold';}
 g.tribe(1).tension=.6;
 assert.equal(planCaravan(g,1,'food','wood',60,9,3,0),true);const r=g.state.routes[0];
 for(let i=0;i<3;i++){r.t=0;tickCaravanRoutes(g,.1);}
 assert.match(r.status,/Route abandoned/);assert.equal(routeAbandoned(g,1),true);assert.equal(r.caravan.workerIds.length,0,'nobody walked out');
 // Two armed guards on the route satisfy a contested road.
 r.caravan.guards=2;r.t=0;tickCaravanRoutes(g,.1);assert.equal(routeAbandoned(g,1),false);assert.ok(r.caravan.workerIds.length>0,r.status);
 // Quiet roads are never affected, and with the switch off nothing changes.
 const plain=tradeWorld();plain.tribe(1).tension=.6;for(let i=0;i<3;i++){const s=armed(plain,'spearman',10+i,12);s.order='hold';}
 planCaravan(plain,1,'food','wood',60,9,3,0);const pr=plain.state.routes[0];pr.t=0;tickCaravanRoutes(plain,.1);assert.ok(pr.caravan.workerIds.length>0);assert.equal(plain.state.transit,undefined);
 const departure=transitDeparture(g,1,0);assert.equal(departure.go,false);
});
