import {writeFileSync} from 'node:fs';
import test from 'node:test';import assert from 'node:assert/strict';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {secureVillage,captureTarget,dominateOccupiedVillage,occupationStatus,withdrawOccupation} from '../src/game/conflictIntent.ts';
import {dominations,dominationStatus,releaseDomination,DOMINATION_RULES} from '../src/game/domination.ts';
import {releasePrisoner} from '../src/game/captivity.ts';
import {PRODUCTION_RECIPES} from '../src/game/production.ts';
import {droppedParcels} from '../src/game/stolenCargo.ts';
function fixture(){const base=nativeDairyVillage(),g=decodeGame(structuredClone(base.save)),home=g.campOf(0);
 // Authored finite pre-existing village outpost and professional party. Native
 // terrain, rivers and original actors/resources remain intact. This scenario
 // qualifies occupation/obligations, not earning an army or constructing halls.
 const sites=[];
 for(let radius=25;radius<=145&&sites.length<2;radius+=12)for(let i=0;i<24&&sites.length<2;i++){
  const x=home.x+Math.cos(i*Math.PI/12)*radius,z=home.z+Math.sin(i*Math.PI/12)*radius;
  if(sites.some(p=>Math.hypot(x-p.x,z-p.z)<60)||g.placementIssue('townhall',x,z,0)!==null||!g.workBoard.connected(g,home.x,home.z,x,z))continue;
  const b=g.makeBld('townhall',x,z,sites.length?1:0);g.state.buildings.push(b);sites.push(b);g.rebuildWalk();
 }
 assert.equal(sites.length,2,'two separate legal connected native hall sites');const [ours,hall]=sites;
 for(const u of g.state.units){u.order='hold';u.jobLock=true;u.selected=false;}
 const guards=[];for(let i=0;i<2;i++){const u=g.spawnUnit('spearman',home.x+i*.7,home.z,0);u.selected=true;guards.push(u.id);}
 const residents=[];for(let i=0;i<4;i++){const p=g.findDryFoundation('hut',hall.x+12+i*2,hall.z+12,22,(x,z)=>g.workBoard.connected(g,hall.x,hall.z,x,z));assert.ok(p);const u=g.spawnUnit('worker',p.x,p.z,1);u.homeHall=hall.id;u.order='hold';u.jobLock=true;residents.push(u.id);}
 g.tribe(1).wood=30;g.tribe(1).food=1000;g.tribe(1).foodLots={provisions:1000};g.state.laborPolicy='balanced';g.state.paused=true;g.rebuildWalk();
 return{g,ours:ours.id,hall:hall.id,guards,residents,buildingIds:g.state.buildings.map(b=>b.id)};
}
const harvested=new WeakMap();
function reload(g){const result=decodeGame(structuredClone(encodeGame(g)));harvested.set(result,harvested.get(g)||0);return result;}
function drive(g,seconds,done){const end=g.state.time+seconds;while(g.state.time<end&&!done()){const before=new Map(g.state.units.filter(u=>u.team<=1).map(u=>[u.id,{wood:u.carryType==='wood'?u.carry:0,tree:u.node?.kind==='tree'}]));g.state.paused=false;g.step(.2);for(const u of g.state.units.filter(u=>u.team<=1)){const p=before.get(u.id);if(p&&(p.tree||u.node?.kind==='tree')){const gained=(u.carryType==='wood'?u.carry:0)-p.wood;if(gained>0)harvested.set(g,(harvested.get(g)||0)+gained);}}assert.deepEqual(g.simulationErrors,[]);}assert.ok(done(),JSON.stringify({time:g.state.time,occupations:g.state.occupations,dominations:g.state.dominations,units:g.state.units.filter(u=>u.conflictIntent||u.prisoner||u.team===1&&u.carry>0).map(u=>({id:u.id,x:u.x,z:u.z,order:u.order,reason:u.workReason,carry:u.carry}))}).slice(0,4500));}
const storedAndSpent=(g,team)=>g.tribe(team).wood+(g.tribe(team).survival?.fuelBurnedWood||0)+(g.state.production?.projects||[]).filter(p=>(p.originTeam??p.team)===team).reduce((n,p)=>n+PRODUCTION_RECIPES[p.recipe].wood,0);
const balance=g=>g.state.tribes.filter(t=>t.id===0||t.id===1).reduce((n,t)=>n+(t.wood||0)+(t.survival?.fuelBurnedWood||0),0)+(g.state.production?.projects||[]).filter(p=>(p.originTeam??p.team)<=1).reduce((n,p)=>n+PRODUCTION_RECIPES[p.recipe].wood,0)+g.state.units.reduce((n,u)=>n+(u.hp>0&&u.team<=1&&u.carryType==='wood'?u.carry:0),0)+droppedParcels(g).filter(p=>p.kind==='wood'&&p.originalOwnerTeam<=1).reduce((n,p)=>n+p.amount,0)-(harvested.get(g)||0);
for(const terms of ['tribute','puppet','autonomy'])test(`native ordinary simulation holds ${terms} locally and physically delivers recurring obligations through a saved journey`,()=>{
 let f=fixture(),g=f.g,r=secureVillage(g,f.hall);assert.equal(r.accepted,true,r.reason);const control=r.occupationId;
 drive(g,180,()=>g.state.occupations.find(c=>c.id===control)?.phase==='held');assert.equal(occupationStatus(g,control).guards,2);
 if(process.env.DOMINATION_HELD_NATIVE_SAVE&&terms==='tribute'){g.state.paused=true;g.selectEntity(g.state.buildings.find(b=>b.id===f.hall));writeFileSync(process.env.DOMINATION_HELD_NATIVE_SAVE,JSON.stringify(encodeGame(g)));}
 const result=dominateOccupiedVillage(g,control,terms);assert.equal(result.accepted,true,result.reason);const id=dominations(g)[0].id;
 const startFacts=g.state.tribes.filter(t=>t.id<=1).map(t=>({id:t.id,wood:t.wood,burn:t.survival?.fuelBurnedWood}));const start=balance(g);drive(g,DOMINATION_RULES.terms[terms].intervalSeconds+90,()=>dominations(g).find(d=>d.id===id)?.carry?.phase==='deliver');
 let d=dominations(g).find(d=>d.id===id),carrier=g.state.units.find(u=>u.id===d.carry.unitId),amount=d.carry.amount;assert.ok(amount>0);assert.equal(carrier.carry,amount);assert.equal(carrier.carryType,'wood');assert.equal(d.obligation.paid,0);assert.ok(dominationStatus(g,id).leverage>=1);
 const inTransit=balance(g);g=reload(g);assert.equal(balance(g),inTransit);assert.equal(g.state.units.find(u=>u.id===carrier.id).carry,amount);
 drive(g,180,()=>dominations(g).find(d=>d.id===id).obligation.paid>=amount);d=dominations(g).find(d=>d.id===id);assert.equal(d.obligation.paid,amount);drive(g,DOMINATION_RULES.terms[terms].intervalSeconds+180,()=>dominations(g).find(d=>d.id===id).obligation.paid>=2*amount);d=dominations(g).find(d=>d.id===id);assert.equal(d.obligation.paid,2*amount);assert.equal(g.tribe(0).survival?.residueFuel?.woodEquivalentDelivered||0,0);assert.equal(g.tribe(1).survival?.residueFuel?.woodEquivalentDelivered||0,0);assert.ok(d.obligation.dueCount>=2);assert.ok(Math.abs(balance(g)-start)<1e-6,JSON.stringify({balance:balance(g),start,startFacts,end:g.state.tribes.filter(t=>t.id<=1).map(t=>({id:t.id,wood:t.wood,burn:t.survival?.fuelBurnedWood})),production:g.state.production?.projects.map(p=>({id:p.id,recipe:p.recipe,team:p.team,origin:p.originTeam})),events:g.state.simulationEvents?.totals,woodCargo:g.state.units.filter(u=>u.team<=1&&u.carryType==='wood').map(u=>({id:u.id,team:u.team,n:u.carry})),d}).slice(0,6000));
 assert.equal(g.state.buildings.find(b=>b.id===f.hall).team,1);assert.ok(f.residents.every(id=>g.state.units.some(u=>u.id===id&&u.team===1&&u.hp>0)));assert.doesNotThrow(()=>decodeGame(structuredClone(encodeGame(g))));
 if(process.env.DOMINATION_NATIVE_SAVE&&terms==='tribute'){g.state.paused=true;g.selectEntity(g.state.buildings.find(b=>b.id===f.hall));writeFileSync(process.env.DOMINATION_NATIVE_SAVE,JSON.stringify(encodeGame(g)));}
});

test('native release keeps the same loaded subject carrier until physical home delivery and returns the garrison through a saved journey',()=>{
 let f=fixture(),g=f.g,r=secureVillage(g,f.hall);assert.equal(r.accepted,true,r.reason);drive(g,180,()=>g.state.occupations.find(c=>c.id===r.occupationId)?.phase==='held');assert.equal(dominateOccupiedVillage(g,r.occupationId,'tribute').accepted,true);const id=dominations(g)[0].id;
 drive(g,DOMINATION_RULES.terms.tribute.intervalSeconds+150,()=>{const d=dominations(g).find(d=>d.id===id),u=g.state.units.find(u=>u.id===d.carry?.unitId),h=g.state.buildings.find(b=>b.id===f.hall);return d.carry?.phase==='deliver'&&u&&Math.hypot(u.x-h.x,u.z-h.z)>22;});
 let d=dominations(g).find(d=>d.id===id),carrier=g.state.units.find(u=>u.id===d.carry.unitId),cid=carrier.id,amount=carrier.carry,stock=storedAndSpent(g,1),carriedAt={x:carrier.x,z:carrier.z},total=balance(g);
 assert.ok(amount>0);if(process.env.DOMINATION_RELEASE_NATIVE_SAVE){g.state.paused=true;g.selectEntity(g.state.buildings.find(b=>b.id===f.hall));writeFileSync(process.env.DOMINATION_RELEASE_NATIVE_SAVE,JSON.stringify(encodeGame(g)));}assert.equal(releaseDomination(g,id),true);assert.equal(storedAndSpent(g,1),stock);assert.equal(carrier.carry,amount);assert.equal(d.obligation.paid,0);g.state.paused=false;g.step(.2);
 assert.ok(Math.abs(storedAndSpent(g,1)-stock)<1e-8,'no remote refund on the first return tick; actual warmth spending is accounted');assert.equal(carrier.carry,amount);assert.equal(d.carry.unitId,cid);assert.equal(d.carry.phase,'return');assert.equal(d.phase,'released');assert.equal(d.garrisonIds.length,0);assert.equal(g.state.occupations.find(c=>c.id===r.occupationId).phase,'withdrawn');
 g=reload(g);assert.equal(g.state.units.find(u=>u.id===cid).carry,amount);assert.ok(Math.abs(balance(g)-total)<1e-6);
 drive(g,180,()=>!dominations(g).find(d=>d.id===id).carry);carrier=g.state.units.find(u=>u.id===cid);const hall=g.state.buildings.find(b=>b.id===f.hall);assert.ok(g.buildingWorkReached(carrier,hall));assert.ok(Math.hypot(carrier.x-carriedAt.x,carrier.z-carriedAt.z)>10);assert.equal(carrier.carry,0);assert.ok(Math.abs(storedAndSpent(g,1)-stock-amount)<1e-8);assert.equal(dominations(g).find(d=>d.id===id).obligation.paid,0);assert.ok(Math.abs(balance(g)-total)<1e-6);
 drive(g,180,()=>f.guards.every(id=>{const u=g.state.units.find(u=>u.id===id);return u.hp>0&&!u.conflictIntent&&!u.recalled;}));assert.ok(f.residents.every(id=>g.state.units.some(u=>u.id===id&&u.team===1&&u.hp>0)));assert.equal(hall.team,1);assert.doesNotThrow(()=>decodeGame(structuredClone(encodeGame(g))));
});

test('native occupation withdrawal brings surviving original guards and their carried possessions home without changing local ownership',()=>{
 let f=fixture(),g=f.g;const guard=g.state.units.find(u=>u.id===f.guards[0]);g.tribe(0).wood-=2;guard.carry=2;guard.carryType='wood';const cid=guard.id,start=balance(g),r=secureVillage(g,f.hall);assert.equal(r.accepted,true,r.reason);drive(g,180,()=>g.state.occupations.find(c=>c.id===r.occupationId)?.phase==='held');assert.equal(guard.carry,2);
 assert.equal(withdrawOccupation(g,r.occupationId),true);assert.equal(guard.carry,2);assert.equal(g.state.occupations.find(c=>c.id===r.occupationId).phase,'withdrawn');g=reload(g);assert.equal(g.state.units.find(u=>u.id===cid).carry,2);
 drive(g,180,()=>f.guards.every(id=>{const u=g.state.units.find(u=>u.id===id);return u.hp>0&&!u.recalled&&!u.conflictIntent&&u.carry===0;}));assert.ok(Math.abs(balance(g)-start)<1e-6);assert.equal(g.state.buildings.find(b=>b.id===f.hall).team,1);assert.ok(f.residents.every(id=>g.state.units.some(u=>u.id===id&&u.team===1&&u.hp>0)));assert.doesNotThrow(()=>decodeGame(structuredClone(encodeGame(g))));
});

test('native custody release returns the same living person and finite possessions to the original community through a saved return',()=>{
 let f=fixture(),g=f.g,person=g.state.units.find(u=>u.id===f.residents[0]);for(const u of g.state.units)u.selected=false;
 // A finite visiting party already present in this authored encounter. No actor
 // is repositioned after orders begin; all escort and release travel is native.
 const captors=[];for(let i=0;i<2;i++){const p=g.nearestWalk(person,person.x+(i?2:-2),person.z);assert.ok(p);const u=g.spawnUnit('spearman',p.x,p.z,0);u.selected=true;captors.push(u.id);}
 g.tribe(1).wood-=3;person.carry=3;person.carryType='wood';const id=person.id,total=balance(g),r=captureTarget(g,id);assert.equal(r.accepted,true,r.reason);
 drive(g,120,()=>g.state.units.find(u=>u.id===id)?.prisoner?.phase==='custody');person=g.state.units.find(u=>u.id===id);assert.equal(person.carry,3);assert.equal(person.team,0);assert.ok(person.hp>0);const guardId=person.prisoner.guardId,depart={x:person.x,z:person.z};assert.ok(guardId);
 assert.equal(releasePrisoner(g,id),true);assert.equal(person.prisoner.phase,'released');assert.equal(person.team,1);assert.equal(person.homeHall,f.hall);assert.equal(person.carry,3);assert.notEqual(g.state.units.find(u=>u.id===guardId).escortId,id);
 g=reload(g);assert.equal(g.state.units.find(u=>u.id===id).carry,3);assert.equal(g.state.units.find(u=>u.id===id).prisoner.phase,'released');
 drive(g,180,()=>{const u=g.state.units.find(u=>u.id===id);return u?.hp>0&&!u.prisoner&&u.carry===0;});person=g.state.units.find(u=>u.id===id);assert.equal(person.team,1);assert.equal(person.homeHall,f.hall);assert.ok(person.hp>0);assert.ok(Math.hypot(person.x-depart.x,person.z-depart.z)>10);assert.ok(Math.abs(balance(g)-total)<1e-6);assert.doesNotThrow(()=>decodeGame(structuredClone(encodeGame(g))));
});
