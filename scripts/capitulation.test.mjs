import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {tickOccupation,occupationActorAI,validConflictIntentState,CONFLICT_RULES} from '../src/game/conflictIntent.ts';
import {prisonerAI} from '../src/game/captivity.ts';
import {acceptCapitulation,refuseCapitulation,capitulationOffers,capitulationIssue,validCapitulationState,CAPITULATION_RULES} from '../src/game/capitulation.ts';
import {declareSocietyHostility} from '../src/game/societyRelations.ts';
import {cargoOwner} from '../src/game/stolenCargo.ts';
import {dominations} from '../src/game/domination.ts';

function fixture(){const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',80,38,1),g.makeBld('hut',95,38,1),g.makeBld('townhall',200,38,1),g.makeBld('townhall',-120,38,2)];
 g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();
 const hall=g.state.buildings[1],hut=g.state.buildings[2];
 const residents=[0,1,2,3,4,5].map(i=>{const u=g.spawnUnit('worker',84+i,50,1);u.homeHall=hall.id;u.order='hold';return u;});
 const defenders=[0,1].map(i=>{const u=g.spawnUnit('spearman',82+i,46,1);u.homeHall=hall.id;u.order='hold';return u;});
 return{g,hall,hut,residents,defenders};}
function step(g,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units){if(u.hp<=0)continue;if(prisonerAI(g,u,.1))continue;occupationActorAI(g,u,.1);}tickOccupation(g,.1);}}
const attackers=(g,team,n,x=78)=>Array.from({length:n},(_,i)=>{const u=g.spawnUnit('spearman',x+i*.5,44,team);u.order='hold';return u;});
const front=g=>g.state.capitulation?.fronts.find(f=>f.phase==='pressed'||f.phase==='capitulated');
const reload=g=>decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));

test('presence alone never yields surrender; measured losses with present superior force do — no departure intent needed',()=>{
 const {g,defenders,residents}=fixture();g.makeHostile(1);const party=attackers(g,0,6);
 for(const u of party)assert.equal(u.conflictIntent,undefined,'no raid/conquer/dominate picker on the attackers');
 step(g,240);const f=front(g);assert.ok(f,'a front opens from observed armed presence');assert.equal(f.phase,'pressed','no losses: the community keeps resisting');assert.equal(f.casualties,0);
 assert.ok(f.score<f.threshold,`score ${f.score} below threshold ${f.threshold}`);
 for(const d of defenders)d.hp=0;residents[0].hp=0;residents[1].hp=0;step(g,3);
 assert.equal(f.phase,'capitulated',f.reason);assert.equal(f.lostArmed,2);assert.equal(f.casualties,4);
 assert.equal(capitulationOffers(g,0).length,1);assert.equal(capitulationOffers(g,2).length,0,'only the present attacker is offered terms');
 assert.ok(f.yieldedIds.includes(residents[2].id));
});
test('relief and withdrawal: a relieving force prevents the unrelieved term; leaving voids the offer; old saves validate',()=>{
 const {g,defenders,hall}=fixture();g.makeHostile(1);attackers(g,0,6);
 const relief=[0,1,2,3,4,5,6].map(i=>g.spawnUnit('spearman',80+i,38+90,1));for(const r of relief)r.order='hold';
 step(g,200);const f=front(g);assert.equal(f.unrelievedSeconds,0,'relief force within reach is measured');
 for(const r of relief)r.hp=0;step(g,30);assert.ok(f.unrelievedSeconds>=29);
 for(const d of defenders)d.hp=0;for(const u of g.state.units)if(u.team===1&&u.type==='worker')u.hp=Math.min(u.hp,1);
 for(const u of g.state.units)if(u.team===0)u.x=-400;step(g,CAPITULATION_RULES.relievedAfterAbsentSeconds+2);
 assert.equal(f.phase,'relieved','attackers gone: no surrender without present leverage');assert.equal(hall.team,1);
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));delete raw.state.capitulation;assert.equal(validCapitulationState(raw.state),true);assert.equal(validConflictIntentState(raw.state),true);
});
function capitulated(team=0){const s=fixture();if(team===0)s.g.makeHostile(1);else declareSocietyHostility(s.g,team,1);s.party=attackers(s.g,team,6);step(s.g,170);for(const d of s.defenders)d.hp=0;s.residents[0].hp=0;s.residents[1].hp=0;step(s.g,3);s.f=front(s.g);return s;}
test('accepting surrender as occupation preserves every building and resident; yielded people do not contest control',()=>{
 const {g,hall,hut,residents,f}=capitulated();assert.equal(f.phase,'capitulated');
 const hp=hall.hp,hutHp=hut.hp,wood=g.tribe(1).wood,alive=residents.filter(u=>u.hp>0).map(u=>u.id);
 const armedYield=g.spawnUnit('spearman',81,40,1);f.yieldedIds.push(armedYield.id);
 const r=acceptCapitulation(g,f.id,'occupy');assert.equal(r.accepted,true,r.reason);
 const c=g.state.occupations.find(c=>c.id===r.occupationId);assert.equal(c.phase,'held');
 step(g,40);assert.equal(c.phase,'held','a yielded defender does not contest');assert.equal(hall.hp,hp);assert.equal(hut.hp,hutHp);assert.equal(hall.team,1);assert.equal(hut.team,1);
 for(const id of alive)assert.equal(g.state.units.find(u=>u.id===id).team,1,'residents stay themselves');assert.equal(g.tribe(1).wood,wood,'no goods move');
 assert.equal(acceptCapitulation(g,f.id,'loot').accepted,false,'terms accepted once');
 const copy=reload(g);assert.equal(copy.state.occupations.find(x=>x.id===c.id).phase,'held');assert.equal(copy.state.capitulation.fronts[0].outcome,'occupy');
});
test('annexation transfers the surrendered community intact',()=>{
 const {g,hall,hut,residents,f}=capitulated();const hp=hall.hp;const r=acceptCapitulation(g,f.id,'annex');assert.equal(r.accepted,true,r.reason);
 const h=g.state.buildings.find(b=>b.id===hall.id),t=g.state.buildings.find(b=>b.id===hut.id);assert.equal(h.team,0);assert.equal(t.team,0);assert.equal(h.hp,hp);
 assert.equal(g.state.units.find(u=>u.id===residents[3].id).team,0);assert.equal(g.state.buildings.find(b=>b.x===200).team,1,'distant community stays independent');
});
test('looting moves exactly the carried goods out of the defender store and keeps their ownership on the road',()=>{
 const {g,hall,party,f}=capitulated();g.tribe(1).wood=50;g.tribe(1).stone=0;const before=g.tribe(1).wood+g.tribe(0).wood;
 const r=acceptCapitulation(g,f.id,'loot');assert.equal(r.accepted,true,r.reason);
 const carried=party.reduce((n,u)=>n+(u.carryType==='wood'?u.carry:0),0);assert.ok(carried>0);
 assert.equal(g.tribe(1).wood+g.tribe(0).wood+carried,before,'conserved');assert.equal(cargoOwner(g,party.find(u=>u.carry>0)),1,'stolen goods remain marked to their owner until delivered');
 assert.equal(hall.hp,hall.maxHp,'looting does not burn');assert.equal(g.tribe(1).hostile,false,'the community bought a truce');
});
test('deliberate capture takes surrendering adults into real escorted custody with what they knew',()=>{
 const {g,party,f}=capitulated();for(const p of party){p.x=86;p.z=50;}
 const r=acceptCapitulation(g,f.id,'captives');assert.equal(r.accepted,true,r.reason);assert.ok(r.prisonerIds.length>=1);
 const p=g.state.units.find(u=>u.id===r.prisonerIds[0]);assert.equal(p.prisoner.phase,'escorting');assert.equal(p.prisoner.originTeam,1);assert.ok(p.prisoner.knows);assert.equal(p.prisoner.knows.team,1);
});
test('an NPC attacker decides terms in the field from its own state and keeps buildings; save/reload at each phase',()=>{
 let s=fixture();declareSocietyHostility(s.g,2,1);attackers(s.g,2,6);step(s.g,170);
 let g=reload(s.g);assert.equal(validCapitulationState(JSON.parse(JSON.stringify(encodeGame(g))).state),true);assert.equal(g.state.capitulation.fronts[0].phase,'pressed');
 for(const u of g.state.units)if(u.team===1&&u.type==='spearman')u.hp=0;for(const u of g.state.units.filter(u=>u.team===1&&u.type==='worker').slice(0,2))u.hp=0;
 step(g,3);const f=g.state.capitulation.fronts[0];assert.equal(f.phase,'accepted',f.reason);assert.ok(['tribute','captives','autonomy','loot'].includes(f.outcome));
 const hall=g.state.buildings.find(b=>b.x===80);assert.equal(hall.team,1);assert.equal(hall.hp,hall.maxHp,'no automatic burning');
 if(f.outcome==='tribute'||f.outcome==='autonomy')assert.equal(dominations(g).length,1);
 const copy=reload(g);assert.equal(copy.state.capitulation.fronts[0].outcome,f.outcome);
});
test('refusal raises the bar; terms need the force still present; corrupted fronts are rejected',()=>{
 const {g,f,party}=capitulated();const t=f.threshold;assert.equal(refuseCapitulation(g,f.id),true);assert.equal(f.phase,'pressed');assert.ok(f.threshold>t);assert.deepEqual(f.yieldedIds,[]);
 step(g,2);if(f.phase==='capitulated'){for(const u of party)u.x=-400;assert.match(capitulationIssue(g,f.id),/present/);}
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));const bad=structuredClone(raw.state);bad.capitulation.fronts[0].score=-1;assert.equal(validCapitulationState(bad),false);
 const dup=structuredClone(raw.state);dup.capitulation.fronts.push({...dup.capitulation.fronts[0],id:999999});assert.equal(validCapitulationState(dup),false);
 void CONFLICT_RULES;
});
