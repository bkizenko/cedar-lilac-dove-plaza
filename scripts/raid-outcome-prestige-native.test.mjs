import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {dispatchExistingCampRaid} from '../src/game/raiders.ts';
import {claimParcel} from '../src/game/stolenCargo.ts';
import {releasePrisoner} from '../src/game/captivity.ts';
import {settledWarPrestige,raidDefensePrestige,RAID_DEFENSE_RULES} from '../src/game/warPrestige.ts';
const ESCAPE_CHECKPOINT=join(tmpdir(),'hearthwild-raid-prestige-escaped-native.json');
const terrain=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).digest('hex');
function walk(g,u,point,seconds=120){g.clearSelect();u.selected=true;g.issueMove(point.x,point.z);drive(g,seconds,()=>Math.hypot(u.x-point.x,u.z-point.z)<2);u.jobLock=true;u.order='hold';}
function drive(g,seconds,done){const until=g.state.time+seconds;let n=0;while(!done()&&g.state.time<until&&n++<5000){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);}assert.ok(done(),JSON.stringify({time:g.state.time,raid:g.state.raidDefense,history:g.state.raidIntentHistory?.map(h=>({id:h.actorId,outcome:h.outcome,reason:h.plan.reason,sites:h.plan.seenSites})),units:g.state.units.filter(u=>u.team===0||u.team===3).map(u=>({id:u.id,team:u.team,x:u.x,z:u.z,hp:u.hp,order:u.order,reason:u.workReason,carry:u.carry,raid:u.seaRaid?.plan?.metrics}))}));}
function fixture(){
 const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();
 const original=terrain(g),home=g.campOf(0),observer=g.state.units.find(u=>u.team===0&&u.type==='worker');
 // Authored one-resident local society; other generated societies stay intact.
 g.state.units=g.state.units.filter(u=>u.team!==0||u===observer);observer.carry=0;observer.carryType=null;observer.carryFood=undefined;
 g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.conflict='quiet';g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=g.state.birthT=10000;g.state.visitorTimer=900;g.raidT=g.seaT=g.calamityT=10000;for(const t of g.state.tribes)t.thinkT=10000;
 for(const u of g.state.units.filter(u=>u.team===0)){u.order='hold';u.jobLock=true;}
 // Finite scenario opening: legal finished store/camp, two finite camp guards,
 // actual starting stocks. No terrain/resource edits, grants after dispatch,
 // actor teleport, outcome injection, visibility fill or executor overrides.
 const site=g.findDryFoundation('warehouse',home.x+10,home.z,28,(x,z)=>g.placementIssue('warehouse',x,z,0)===null&&g.workBoard.connected(g,observer.x,observer.z,x,z));assert.ok(site);
 const store=g.makeBld('warehouse',site.x,site.z,0);g.state.buildings.push(store);g.rebuildWalk();
 let campPoint;
 for(let i=0;i<48&&!campPoint;i++){const a=i*Math.PI/24;campPoint=g.findDryFoundation('hut',store.x+Math.cos(a)*84,store.z+Math.sin(a)*84,3,(x,z)=>g.placementIssue('hut',x,z,3)===null&&g.workBoard.connected(g,observer.x,observer.z,x,z));}assert.ok(campPoint);
 const camp=g.makeBld('hut',campPoint.x,campPoint.z,3);camp.raiderCamp=true;g.state.buildings.push(camp);g.rebuildWalk();
 const hallPoint=g.findDryFoundation('townhall',store.x-12,store.z,16,(x,z)=>Math.hypot(x-store.x,z-store.z)<17&&Math.hypot(x-observer.x,z-observer.z)>9&&g.placementIssue('townhall',x,z,0)===null);assert.ok(hallPoint,'legal opening hall must observe the store through normal vision');
 const hall=g.makeBld('townhall',hallPoint.x,hallPoint.z,0);g.state.buildings.push(hall);g.rebuildWalk();
 const dx=(store.x-camp.x)/Math.hypot(store.x-camp.x,store.z-camp.z),dz=(store.z-camp.z)/Math.hypot(store.x-camp.x,store.z-camp.z);
 const retreat=g.nearestWalk(observer,store.x+dx*90,store.z+dz*90);assert.ok(retreat);walk(g,observer,retreat); // actual body away; completed hall supplies ordinary local eyes
 const spawn=g.interactionSpot(observer,camp);assert.ok(spawn);
 const crew=[g.spawnUnit('spearman',spawn.x,spawn.z,3),g.spawnUnit('spearman',spawn.x+1,spawn.z,3)];for(const u of crew){u.homeCamp=camp.id;u.order='hold';}
 // No food in this deliberately scarce opening: the targeted finite load is
 // timber, so ordinary food consumption cannot obscure timber conservation.
 Object.assign(g.tribe(0),{food:0,foodLots:{},wood:80,items:{rawMeat:200}});Object.assign(g.tribe(3),{food:100,foodLots:{provisions:100},wood:0});g.tribe(3).survival.waterLiters=100;
 camp.campEconomy={version:1,knownSites:[{version:1,campId:camp.id,siteId:store.id,team:0,x:store.x,z:store.z,observedAt:g.state.time}],lastDispatchAt:g.state.time-121,departures:0,returns:0,lost:0,foodPaid:0,waterPaid:0,foodUsed:0,waterUsed:0};
 return{g,original,store,camp,crew,observer};
}
function escapedScenario(){
 let {g,original,store,camp,observer}=fixture();const campId=camp.id,storeId=store.id,observerId=observer.id;
 g.state.conflict='balanced';assert.equal(dispatchExistingCampRaid(g),true);g.state.conflict='quiet';let thief=g.state.units.find(u=>u.campTrip?.campId===campId);assert.ok(thief);const firstId=thief.id,firstBand=thief.seaRaid.plan.bandId;
 drive(g,150,()=>thief.carry>0);const firstTake=thief.carry;assert.equal(thief.carryType,'wood');assert.equal(g.tribe(0).wood,80-firstTake);assert.equal(raidDefensePrestige(g.state).value,0);assert.equal(g.tribe(3).wood,0);assert.ok(g.state.raidDefense?.bands.some(b=>b.bandId===firstBand));
 g=decodeGame(encodeGame(g));thief=g.state.units.find(u=>u.id===firstId);assert.equal(raidDefensePrestige(g.state).value,0);
 drive(g,150,()=>g.state.raidDefense.bands.find(b=>b.bandId===firstBand).outcome==='escaped');assert.ok(g.buildingWorkReached(thief,g.state.buildings.find(b=>b.id===campId)));assert.equal(g.tribe(3).wood,firstTake);assert.equal(g.state.raidDefense.bands.find(b=>b.bandId===firstBand).outcome,'escaped');assert.equal(settledWarPrestige(g.state).value,0);assert.equal(g.tribe(0).wood+g.tribe(3).wood,80);
 const checkpoint={save:encodeGame(g),original,campId,storeId,observerId,firstTake};writeFileSync(ESCAPE_CHECKPOINT,JSON.stringify(checkpoint));return checkpoint;
}
test('native witnessed stolen timber escapes only at physical camp arrival after carried reload',()=>{escapedScenario();});
test('native stolen timber is recovered only through real interception and owner-cache delivery across pickup reload',()=>{
 const checkpoint=existsSync(ESCAPE_CHECKPOINT)?JSON.parse(readFileSync(ESCAPE_CHECKPOINT,'utf8')):escapedScenario();
 const {original,campId,storeId,observerId,firstTake}=checkpoint;let g=decodeGame(checkpoint.save),store,camp,observer,thief;
 // The defense force is a declared finite second-scenario initial endowment,
 // positioned off the raid route before departure; real combat is commanded
 // only after the next load was physically stolen. It creates no cargo.
 store=g.state.buildings.find(b=>b.id===storeId);camp=g.state.buildings.find(b=>b.id===campId);observer=g.state.units.find(u=>u.id===observerId);
 const vx=(camp.x-store.x)/Math.hypot(camp.x-store.x,camp.z-store.z),vz=(camp.z-store.z)/Math.hypot(camp.x-store.x,camp.z-store.z);
 let guardSpot;for(const sign of [1,-1]){const x=store.x+vx*12-vz*sign*16,z=store.z+vz*12+vx*sign*16;if(g.walkable(x,z)&&g.workBoard.connected(g,observer.x,observer.z,x,z)){guardSpot={x,z};break;}}assert.ok(guardSpot);
 const guards=[0,1,2].map(i=>{const u=g.spawnUnit('archer',guardSpot.x+i*.8,guardSpot.z,0);u.order='hold';u.jobLock=true;u.stationOnArrival=true;return u;});
 camp.campEconomy.lastDispatchAt=g.state.time-121;camp.campEconomy.knownSites[0].observedAt=g.state.time;g.state.conflict='balanced';assert.equal(dispatchExistingCampRaid(g),true);g.state.conflict='quiet';thief=g.state.units.find(u=>u.campTrip?.campId===campId);assert.ok(thief);const secondId=thief.id,secondBand=thief.seaRaid.plan.bandId;
 drive(g,150,()=>thief.seaRaid?.plan.workSeconds>=2.4);
 g.clearSelect();for(const u of guards)u.selected=true;const interception=g.interactionSpot(guards[0],store);assert.ok(interception);g.issueMove(interception.x,interception.z);
 drive(g,10,()=>thief.carry>0);const secondTake=thief.carry;assert.equal(thief.carryType,'wood');assert.equal(g.tribe(0).wood,80-firstTake-secondTake);
 g.clearSelect();for(const u of guards)u.selected=true;const approach=g.interactionSpot(guards[0],store);assert.ok(approach);g.issueMove(approach.x,approach.z);
 drive(g,30,()=>g.visibleAt(thief.x,thief.z));g.clearSelect();for(const u of guards)u.selected=true;g.issueAttack(thief);assert.ok(guards.some(u=>u.order==='attack'&&u.target===thief),'real visible attack order installed');

 drive(g,120,()=>!g.state.units.some(u=>u.id===secondId&&u.hp>0));assert.equal(raidDefensePrestige(g.state).value,0,'dead thief and dropped load are not recovered supplies');
 const parcel=g.state.droppedCargo.parcels.find(p=>p.raidBandId===secondBand);assert.ok(parcel);assert.equal(parcel.originalOwnerTeam,0);assert.equal(parcel.amount,secondTake);
 g=decodeGame(encodeGame(g));observer=g.state.units.find(u=>u.id===observerId);observer.jobLock=false;observer.order='hold';assert.ok(claimParcel(g,observer,parcel.id));
 drive(g,150,()=>observer.carry>0);assert.equal(raidDefensePrestige(g.state).value,0,'a carried recovery has not reached the owner cache');
 g=decodeGame(encodeGame(g));observer=g.state.units.find(u=>u.id===observerId);drive(g,150,()=>raidDefensePrestige(g.state).held===1);
 const b=g.state.raidDefense.bands.find(b=>b.bandId===secondBand);assert.equal(b.outcome,'held');assert.equal(b.recovered,secondTake);assert.equal(b.escaped,0);assert.equal(g.tribe(0).wood,80-firstTake);assert.equal(g.tribe(0).wood+g.tribe(3).wood,80);assert.equal(raidDefensePrestige(g.state).value,RAID_DEFENSE_RULES.heldWeight);assert.equal(settledWarPrestige(g.state).value,RAID_DEFENSE_RULES.heldWeight);
 if(process.env.RAID_PRESTIGE_NATIVE_SAVE)writeFileSync(process.env.RAID_PRESTIGE_NATIVE_SAVE,JSON.stringify(encodeGame(g)));
 const before=JSON.stringify(g.state.raidDefense);for(let i=0;i<5;i++)settledWarPrestige(g.state);assert.equal(JSON.stringify(g.state.raidDefense),before);g=decodeGame(encodeGame(g));drive(g,1,()=>g.state.time>b.settledAt+.5);assert.equal(g.state.raidDefense.bands.length,2);assert.equal(raidDefensePrestige(g.state).value,RAID_DEFENSE_RULES.heldWeight);assert.equal(terrain(g),original);
 for(const mutate of [s=>s.raidDefense.bands.push(structuredClone(s.raidDefense.bands[0])),s=>s.raidDefense.bands[1].recovered=0,s=>s.raidDefense.bands[1].settledAt=s.time+1,s=>s.raidDefense.bands[1].terminals.push(structuredClone(s.raidDefense.bands[1].terminals[0]))]){const raw=encodeGame(g);mutate(raw.state);assert.throws(()=>decodeGame(raw));}
 assert.equal(settledWarPrestige(g.state,1).value,0,'foreign band totals do not become private rival prestige');
});


function capturedScenario(){
 const checkpoint=existsSync(ESCAPE_CHECKPOINT)?JSON.parse(readFileSync(ESCAPE_CHECKPOINT,'utf8')):escapedScenario();
 let g=decodeGame(checkpoint.save);const {campId,storeId,observerId,original}=checkpoint;
 const camp=g.state.buildings.find(b=>b.id===campId),store=g.state.buildings.find(b=>b.id===storeId);let person=g.state.units.find(u=>u.id===observerId);
 const d=Math.hypot(camp.x-store.x,camp.z-store.z),vx=(camp.x-store.x)/d,vz=(camp.z-store.z)/d;
 const field=g.nearestWalk(person,store.x+vx*30,store.z+vz*30);walk(g,person,field);
 // Explicit finite capture-scenario starting body: existing wounded adult,
 // two carried meals and40 units transferred from its own initial raw-meat
 // endowment. Real carried burden slows flight; no speed override or teleport.
 person.hp=person.maxHp*.4;person.carry=2;person.carryType='food';person.carryFood='provisions';person.itemCargo={rawMeat:40};g.tribe(0).items.rawMeat-=40;
 const guards=[];for(let i=0;i<3;i++){const p=g.nearestWalk(person,person.x-vz*(24+i),person.z+vx*(24+i));const u=g.spawnUnit('archer',p.x,p.z,0);u.order='hold';u.stationOnArrival=true;u.jobLock=true;guards.push(u);}
 camp.campEconomy.lastDispatchAt=g.state.time-121;camp.campEconomy.knownSites[0].observedAt=g.state.time;g.state.conflict='balanced';dispatchExistingCampRaid(g);drive(g,45,()=>g.state.units.some(u=>u.campTrip?.campId===campId));g.state.conflict='quiet';
 let raider=g.state.units.find(u=>u.campTrip?.campId===campId);assert.ok(raider);const raiderId=raider.id,bandId=raider.seaRaid.plan.bandId;
 // Declared initial intent exercises the existing physical capture executor;
 // the actual surrender, custody, interception and return are not injected.
 raider.seaRaid.plan.intent='capture';
 drive(g,120,()=>person.prisoner?.captorTeam===3);assert.equal(person.id,observerId);assert.equal(person.team,3);assert.ok(g.state.raidDefense.bands.find(b=>b.bandId===bandId).capturedResidentIds.includes(observerId));assert.equal(raidDefensePrestige(g.state).value,0);
 return{save:encodeGame(g),guards:guards.map(u=>u.id),observerId,raiderId,bandId,original,vx,vz,storeId};
}
test('native captured resident recovers defense credit only after real interception, unguarded release and bodily home-cache return',()=>{
 const c=capturedScenario(),{observerId,raiderId,bandId,original,vx,vz}=c;let g=decodeGame(c.save),person=g.state.units.find(u=>u.id===observerId),raider=g.state.units.find(u=>u.id===raiderId);const guards=c.guards.map(id=>({id}));
 g=decodeGame(encodeGame(g));person=g.state.units.find(u=>u.id===observerId);raider=g.state.units.find(u=>u.id===raiderId);const party=guards.map(u=>g.state.units.find(p=>p.id===u.id));
 g.clearSelect();for(const u of party)u.selected=true;g.issueMove(person.x+vx*35,person.z+vz*35);drive(g,60,()=>party.some(u=>Math.hypot(u.x-raider.x,u.z-raider.z)<14)&&g.visibleAt(raider.x,raider.z));g.clearSelect();for(const u of party)u.selected=true;g.issueAttack(raider);assert.ok(party.some(u=>u.order==='attack'&&u.target===raider));
 drive(g,120,()=>!g.state.units.some(u=>u.id===raiderId&&u.hp>0));assert.equal(raidDefensePrestige(g.state).value,0,'guard loss alone is not a returned resident');
 drive(g,60,()=>person.prisoner?.phase==='released');assert.equal(raidDefensePrestige(g.state).value,0,'a released order away from home is not recovery');
 g=decodeGame(encodeGame(g));person=g.state.units.find(u=>u.id===observerId);drive(g,150,()=>g.state.raidDefense.bands.find(b=>b.bandId===bandId).outcome==='held');
 const band=g.state.raidDefense.bands.find(b=>b.bandId===bandId);assert.deepEqual(band.capturedResidentIds,[observerId]);assert.deepEqual(band.returnedResidentIds,[observerId]);assert.equal(person.team,0);assert.equal(person.prisoner,undefined);assert.equal(band.captivesLost,0);assert.equal(raidDefensePrestige(g.state).value,RAID_DEFENSE_RULES.heldWeight);assert.equal(terrain(g),original);
 const once=JSON.stringify(g.state.raidDefense);g=decodeGame(encodeGame(g));assert.equal(JSON.stringify(g.state.raidDefense),once);if(process.env.RAID_PRESTIGE_CAPTURE_SAVE)writeFileSync(process.env.RAID_PRESTIGE_CAPTURE_SAVE,JSON.stringify(encodeGame(g)));
});

test('native captive physically delivered to camp remains an escaped objective after actual release and home return',()=>{
 const c=capturedScenario();let g=decodeGame(c.save),person=g.state.units.find(u=>u.id===c.observerId);
 drive(g,120,()=>g.state.raidDefense.bands.find(b=>b.bandId===c.bandId).outcome==='escaped');
 let band=g.state.raidDefense.bands.find(b=>b.bandId===c.bandId);assert.equal(person.prisoner.phase,'custody');assert.deepEqual(band.deliveredResidentIds,[c.observerId]);assert.equal(raidDefensePrestige(g.state).value,0);
 // The actual captor releases this same body through the existing action. No
 // prisoner deletion, team assignment, supply refund or home teleport.
 assert.equal(releasePrisoner(g,person.id),true);g=decodeGame(encodeGame(g));person=g.state.units.find(u=>u.id===c.observerId);drive(g,150,()=>!person.prisoner);
 band=g.state.raidDefense.bands.find(b=>b.bandId===c.bandId);assert.equal(person.team,0);assert.equal(band.outcome,'escaped');assert.equal(raidDefensePrestige(g.state).value,0);assert.equal(terrain(g),c.original);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 const forged=encodeGame(g),falseReceipt=forged.state.raidDefense.bands.find(b=>b.bandId===c.bandId);falseReceipt.outcome='held';falseReceipt.captivesLost=0;assert.throws(()=>decodeGame(forged),'a save cannot erase actual delivered-captive evidence into victory');
});

test('native multi-actor paid dispatch settles one shared objective while keeping distinct conserved trip ownership across reload',()=>{
 const c=existsSync(ESCAPE_CHECKPOINT)?JSON.parse(readFileSync(ESCAPE_CHECKPOINT,'utf8')):escapedScenario();let g=decodeGame(c.save);
 const camp=g.state.buildings.find(b=>b.id===c.campId),observer=g.state.units.find(u=>u.id===c.observerId),front=g.interactionSpot(observer,camp);assert.ok(front);
 // Finite larger-camp opening, before departure: two additional real guards.
 // Stocks stay exactly those of the previously executed native checkpoint.
 for(let i=0;i<2;i++){const u=g.spawnUnit('spearman',front.x,front.z,3);u.homeCamp=camp.id;u.order='hold';}
 camp.campEconomy.lastDispatchAt=g.state.time-121;camp.campEconomy.knownSites[0].observedAt=g.state.time;g.state.conflict='balanced';assert.equal(dispatchExistingCampRaid(g),true);g.state.conflict='quiet';
 const party=g.state.units.filter(u=>u.campTrip?.campId===camp.id),ids=party.map(u=>u.id);assert.ok(party.length>=2);const keys=party.map(u=>u.seaRaid.plan.bandId);assert.equal(new Set(keys).size,party.length,'paid actor ownership IDs are never merged');const cohort=party[0].seaRaid.plan.objectiveBandId;assert.ok(cohort);assert.ok(party.every(u=>u.seaRaid.plan.objectiveBandId===cohort));
 const total=g.tribe(0).wood+g.tribe(3).wood;drive(g,150,()=>g.state.units.some(u=>ids.includes(u.id)&&u.carry>0));assert.equal(raidDefensePrestige(g.state).value,0);g=decodeGame(encodeGame(g));
 drive(g,180,()=>g.state.raidDefense.bands.some(b=>b.bandId===cohort&&b.settledAt!==undefined));const receipt=g.state.raidDefense.bands.find(b=>b.bandId===cohort);assert.equal(receipt.expectedActors,party.length);assert.equal(receipt.terminals.length,party.length);assert.deepEqual([...receipt.actorIds].sort((a,b)=>a-b),[...ids].sort((a,b)=>a-b));assert.equal(receipt.outcome,'escaped');assert.equal(g.state.raidDefense.bands.filter(b=>b.bandId===cohort).length,1);assert.equal(g.tribe(0).wood+g.tribe(3).wood,total);assert.equal(raidDefensePrestige(g.state).value,0);assert.equal(terrain(g),c.original);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 const bad=encodeGame(g),history=bad.state.raidIntentHistory.find(h=>h.plan.objectiveBandId===cohort);history.plan.objectiveBandId=bad.state.nextId;assert.throws(()=>decodeGame(bad),'impossible cohort provenance cannot be loaded');
});
