import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {SEGS} from '../src/game/constants.ts';
import {initializeSurvival} from '../src/game/survivalNeeds.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {markStolenLoad,claimParcel,cargoOwner,droppedParcels,STOLEN_CARGO_RULES} from '../src/game/stolenCargo.ts';

// Controlled fixture: flat dry world, team 0 (the owner) with a finished hall and
// four idle adults; team 1 has its own hall far away; a team-3 raider holds
// goods stolen from team 0. Raids, weather and births are suppressed.
function flat(g){const size=g.world.size;for(let z=0;z<=SEGS;z++)for(let x=0;x<=SEGS;x++)g.world.heights[z*(SEGS+1)+x]=4;g.world.rivers=[];g.world.features=[];g.rebuildWalk();for(const u of g.state.units)u.y=g.height(u.x,u.z);for(const b of g.state.buildings)b.y=g.height(b.x,b.z);}
function fixture({adults=4}={}){const g=new Game();g.reset(123456,3);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.autoWorkEnabled=false;g.state.growthPolicy='stable';g.state.birthT=10000;g.state.conflict='quiet';g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.nightWork=true;g.state.rivalKnowledge=[];
 for(const t of g.state.tribes)Object.assign(t,{food:600,foodLots:undefined,wood:100,stone:0,copper:0,iron:0,aggro:0,hostile:false,ally:false,trust:.8,tension:0,thinkT:10000});
 const hall=g.makeBld('townhall',0,-30,0);g.state.buildings.push(hall);g.state.buildings.push(g.makeBld('townhall',300,300,1));
 const people=[];for(let i=0;i<adults;i++){const u=g.spawnUnit('worker',-8-i*3,-52,0);u.order='hold';people.push(u);}
 const far=g.spawnUnit('worker',300,310,1);far.order='hold';far.jobLock=true;
 const raider=g.spawnUnit('spearman',60,-30,3);raider.order='hold';raider.jobLock=true;raider.militia=true;
 flat(g);initializeSurvival(g);g.state.scoutTimer=1000;g.state.coastalTradeReviewAt=1e8;
 return {g,hall,people,raider,far};}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.state.paused=false;g.step(.1);}assert.deepEqual(g.simulationErrors,[]);}
function reload(g){const copy=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));flat(copy);copy.seaT=1e9;copy.calamityT=1e9;return copy;}
/** Raider steals goods from team 0 (the same marking call the raid AI makes). */
function steal(g,raider,kind='wood',amount=20){raider.carry=amount;raider.carryType=kind;raider.carryFood=kind==='food'?'provisions':undefined;markStolenLoad(g,raider,0);}
function kill(g,u){u.hp=0;g.step(.1);}
const total=(g,k)=>g.tribe(0)[k];

test('raider killed carrying stolen goods: a finite parcel with the exact amount, owner remembered, nothing created or destroyed',()=>{
 const {g,raider}=fixture();steal(g,raider,'wood',20);assert.equal(cargoOwner(g,raider),0);
 const wood=total(g,'wood');raider.x=40;raider.z=-30;kill(g,raider);
 const ps=droppedParcels(g);assert.equal(ps.length,1);const p=ps[0];
 assert.equal(p.kind,'wood');assert.equal(p.amount,20);assert.equal(p.originalOwnerTeam,0);assert.equal(p.fromTeam,3);assert.equal(Math.round(p.x),40);
 assert.equal(g.state.units.some(u=>u.id===raider.id),false);assert.equal(total(g,'wood'),wood,'owner stock untouched by the drop itself');
 assert.equal(g.state.droppedCargo.ledger.dropped,20);assert.equal(g.state.droppedCargo.marks.length,0);
 // A non-raider carrier drops its own goods the same way.
 const {g:g2,people}=fixture();const w=people[0];w.carry=12;w.carryType='stone';w.hp=0;g2.step(.1);const q=droppedParcels(g2)[0];assert.equal(q.amount,12);assert.equal(q.kind,'stone');assert.equal(q.originalOwnerTeam,0);
 // Food keeps its kind.
 const {g:g3,raider:r3}=fixture();steal(g3,r3,'food',4);kill(g3,r3);assert.equal(droppedParcels(g3)[0].food,'provisions');
});

test('the owner’s nearest free adult walks there, picks up, returns to the real cache and deposits: stock restored exactly',()=>{
 const {g,people,raider,hall}=fixture();const before=total(g,'wood');
 // The goods were taken out of the owner's stock when stolen.
 g.tribe(0).wood-=20;steal(g,raider,'wood',20);raider.x=45;raider.z=-30;kill(g,raider);
 const p=droppedParcels(g)[0];assert.ok(p);
 drive(g,5,()=>p.claimedBy!==undefined);assert.ok(p.claimedBy!==undefined,JSON.stringify(g.state.droppedCargo));
 const runner=g.state.units.find(u=>u.id===p.claimedBy);assert.equal(runner.team,0);
 const nearest=[...people].sort((a,b)=>Math.hypot(a.x-45,a.z+30)-Math.hypot(b.x-45,b.z+30))[0];assert.equal(runner.id,nearest.id,'nearest free adult is dispatched');
 const start=Math.hypot(runner.x-45,runner.z+30);assert.ok(start>20);
 drive(g,2);assert.ok(Math.hypot(runner.x-45,runner.z+30)<start,'walks, never teleports');assert.equal(total(g,'wood'),before-20,'stock unchanged while walking');
 drive(g,60,()=>runner.carry>0);assert.equal(runner.carry,20);assert.equal(runner.carryType,'wood');assert.equal(droppedParcels(g).length,0,'parcel consumed exactly');
 assert.equal(total(g,'wood'),before-20,'goods are in hands, not in stock');
 drive(g,120,()=>g.state.droppedCargo.trips.length===0);
 assert.equal(total(g,'wood'),before,'cache total restored exactly');assert.equal(runner.carry,0);
 const l=g.state.droppedCargo.ledger;assert.deepEqual([l.dropped,l.pickedUp,l.deposited,l.depositedByOwner],[20,20,20,20]);
 assert.ok(Math.hypot(runner.x-hall.x,runner.z-hall.z)<14,'deposit happened at the hall');assert.equal(g.state.droppedCargo.trips.length,0);
});

test('a parcel larger than one carry capacity takes several real trips and conserves every unit',()=>{
 const {g,people,raider}=fixture({adults:1});const before=total(g,'stone'),cap=24;
 // Two carriers fall in the same spot: parcels merge into one 40-unit parcel (cap is 24).
 g.tribe(0).stone-=0;const a=g.spawnUnit('worker',30,-30,0);a.carry=20;a.carryType='stone';a.jobLock=true;a.order='hold';const b=g.spawnUnit('worker',30.5,-30,0);b.carry=20;b.carryType='stone';b.jobLock=true;b.order='hold';
 a.hp=0;b.hp=0;g.step(.1);const p=droppedParcels(g)[0];assert.equal(droppedParcels(g).length,1);assert.equal(p.amount,40);
 const runner=people[0];let trips=0,last=0;
 for(let i=0;i<4000&&droppedParcels(g).length+g.state.droppedCargo.trips.length>0;i++){g.state.paused=false;g.step(.1);if(runner.carry>0&&runner.carry!==last){trips++;assert.ok(runner.carry<=cap);}last=runner.carry;}
 assert.equal(droppedParcels(g).length,0);assert.ok(trips>=2,`trips ${trips}`);
 assert.equal(total(g,'stone'),before+40,'all 40 units deposited, none duplicated or lost');assert.equal(g.state.droppedCargo.ledger.deposited,40);assert.deepEqual(g.simulationErrors,[]);
});

test('bounded pursuit: owner adults chase a fleeing raider within a time cap, then stand down to prior work',()=>{
 const {g,people,raider}=fixture();raider.team=1;raider.hp=raider.maxHp*100;raider.maxHp=raider.hp;raider.dmg=0;steal(g,raider,'wood',20);raider.x=10;raider.z=-50;
 raider.order='hold';
 drive(g,4,()=>g.state.droppedCargo.trips.some(t=>t.phase==='chase'));
 const chasers=g.state.droppedCargo.trips.filter(t=>t.phase==='chase');assert.ok(chasers.length>=1&&chasers.length<=STOLEN_CARGO_RULES.chaseMaximumPerRaider,JSON.stringify(g.state.droppedCargo.trips));
 // The raider flees faster than the chasers can close.
 const t0=g.state.time;let quit;
 for(let i=0;i<900&&!quit;i++){raider.x+=.7;g.state.paused=false;g.step(.1);quit=g.state.droppedCargo.reasons['pursuit-time']||g.state.droppedCargo.reasons['pursuit-distance']||g.state.droppedCargo.reasons['pursuit-hurt'];}
 assert.ok(quit,JSON.stringify(g.state.droppedCargo));assert.ok(g.state.time-t0<=STOLEN_CARGO_RULES.chaseSeconds+6,'stood down within the cap');
 assert.equal(g.state.droppedCargo.trips.filter(t=>t.phase==='chase').length,0);
 for(const p of people)assert.ok(['idle','hold','gather'].includes(p.order),`order ${p.order}`);
 assert.ok(g.state.droppedCargo.rest.length>=1,'stand-down rest prevents immediate re-chase');assert.equal(raider.carry,20,'the load is still the raider’s; nothing moved');assert.equal(g.state.droppedCargo.parcels.length,0);
});

test('save and reload in the middle of retrieval: claim, walk, carry and deposit survive; strict validation passes',()=>{
 let {g,raider}=fixture();const before=total(g,'wood');g.tribe(0).wood-=20;steal(g,raider,'wood',20);raider.x=45;raider.z=-30;kill(g,raider);
 drive(g,5,()=>droppedParcels(g)[0].claimedBy!==undefined);let p=droppedParcels(g)[0];const id=p.claimedBy;assert.ok(id);
 g=reload(g);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));p=droppedParcels(g)[0];assert.equal(p.claimedBy,id);assert.equal(g.state.droppedCargo.trips[0].phase,'walk');
 let runner=g.state.units.find(u=>u.id===id);drive(g,60,()=>runner.carry>0);assert.equal(runner.carry,20);
 g=reload(g);runner=g.state.units.find(u=>u.id===id);assert.equal(runner.carry,20);assert.equal(g.state.droppedCargo.trips[0].phase,'return');
 drive(g,120,()=>g.state.droppedCargo.trips.length===0);assert.equal(total(g,'wood'),before);assert.equal(g.state.droppedCargo.ledger.deposited,20);
});

test('old saves load: no field means no parcels; malformed state is rejected',()=>{
 const {g,raider}=fixture();assert.equal(g.state.droppedCargo,undefined);const old=JSON.parse(JSON.stringify(encodeGame(g)));assert.ok(!('droppedCargo' in (old.state??old))||true);
 assert.doesNotThrow(()=>decodeGame(old));
 steal(g,raider);raider.hp=0;g.step(.1);const bad=()=>{const d=JSON.parse(JSON.stringify(encodeGame(g)));return d;};
 const find=d=>d.droppedCargo??d.state?.droppedCargo??d.game?.droppedCargo;
 let d=bad();let root=find(d);assert.ok(root,'save carries the optional field when parcels exist');
 root.parcels[0].amount=-3;assert.throws(()=>decodeGame(d));
 d=bad();find(d).parcels[0].kind='gold';assert.throws(()=>decodeGame(d));
 d=bad();find(d).parcels[0].claimedBy=999999;assert.throws(()=>decodeGame(d));
 d=bad();find(d).trips=[{unitId:999999,team:0,phase:'return',startedAt:0,deadline:5,originX:0,originZ:0,owner:0,finder:false}];assert.throws(()=>decodeGame(d));
});

test('two units claiming one parcel never duplicate goods; unreachable and ineligible claims record reasons',()=>{
 const {g,people,raider}=fixture();g.tribe(0).wood-=20;steal(g,raider,'wood',20);raider.x=45;raider.z=-30;kill(g,raider);const p=droppedParcels(g)[0];
 const first=g.state.units.find(u=>u.id===p.claimedBy),other=people.find(u=>u!==first);assert.ok(first,'dispatch already claimed it');assert.equal(claimParcel(g,other,p.id),false,'second claim refused');assert.equal(g.state.droppedCargo.reasons.claimed,1);
 // Force the worst case: both walk the same parcel with the claim erased.
 delete p.claimedBy;g.state.droppedCargo.trips.push({unitId:other.id,team:0,phase:'walk',startedAt:g.state.time,deadline:g.state.time+200,originX:other.x,originZ:other.z,parcelId:p.id,owner:0,finder:false});other.order='move';
 const before=total(g,'wood');drive(g,150,()=>g.state.droppedCargo.trips.length===0&&droppedParcels(g).length===0);
 assert.equal(total(g,'wood'),before+20,'goods delivered once');assert.equal(g.state.droppedCargo.ledger.pickedUp,20);assert.equal(droppedParcels(g).length,0);
 // Ineligible: a prisoner-like busy unit is refused with a recorded reason.
 const {g:g2,people:p2,raider:r2}=fixture();steal(g2,r2);kill(g2,r2);const q=droppedParcels(g2)[0];p2[0].jobLock=true;assert.equal(claimParcel(g2,p2[0],q.id),false);assert.equal(q.lastReason,'not-eligible');
});

test('finders keepers: another team takes an unclaimed parcel only after the owner grace period; owner-first',()=>{
 const {g,raider,far}=fixture({adults:0});g.tribe(0).wood-=0;steal(g,raider,'wood',20);raider.x=290;raider.z=300;kill(g,raider);const p=droppedParcels(g)[0];
 far.jobLock=false;far.x=295;far.z=300;far.order='hold';const stock=g.tribe(1).wood;
 drive(g,30);assert.equal(p.claimedBy,undefined,'no finder before grace');assert.equal(g.state.droppedCargo.reasons['no-owner-adult']>0,true);
 g.state.time+=STOLEN_CARGO_RULES.finderGraceSeconds;drive(g,200,()=>g.state.droppedCargo.trips.length===0&&droppedParcels(g).length===0&&far.carry===0&&g.state.droppedCargo.ledger.deposited>0);
 assert.equal(g.tribe(1).wood,stock+20,'finder deposits into its own cache');assert.equal(g.state.droppedCargo.ledger.depositedByFinder,20);assert.equal(g.tribe(0).wood,100,'owner stock not invented');
});

test('end to end: owners chase a nearby thief, kill it, and bring the stolen load home',()=>{
 const {g,raider}=fixture();raider.team=1;raider.hp=3;raider.dmg=0;g.tribe(0).wood-=20;const before=total(g,'wood')+20;steal(g,raider,'wood',20);raider.x=10;raider.z=-50;
 drive(g,300,()=>g.state.droppedCargo.ledger.deposited>=20);
 assert.equal(g.state.units.some(u=>u.id===raider.id),false,'thief died');assert.equal(g.state.droppedCargo.ledger.deposited,20);assert.equal(total(g,'wood'),before,'every stolen unit returned, none duplicated');
 assert.equal(droppedParcels(g).length,0);assert.equal(g.state.droppedCargo.trips.length,0);
});
