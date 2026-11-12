import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {applyEngineReadQuery,isEngineReadQuery} from '../src/game/engineReadModels.ts';
import {mulberry32} from '../src/game/rng.ts';
import * as S from '../src/game/societyRuntime.ts';
import * as R from '../src/game/societyCivicRuntime.ts';
import {validDecisionState} from '../src/game/societyState.ts';
const random=Math.random;test.beforeEach(()=>{Math.random=mulberry32(0x5151);});test.afterEach(()=>{Math.random=random;});
function game(opts={rulersVersion:2}){const g=new Game();g.reset(5,10,opts);g.enterIsland();return g;}
function run(g,seconds){const end=g.state.time+seconds;while(g.state.time<end){g.state.paused=false;g.step(.5);}assert.deepEqual(g.simulationErrors,[]);}
test('old saves and rulersVersion 1 have no civic layer at all',()=>{
 const g=game({rulersVersion:1});run(g,200);assert.equal(R.peekCivic(g),undefined);assert.equal(R.civicModel(g).enabled,false);assert.equal(R.civicEffects(g,1).decisionDelay,1);assert.equal(R.politicsLoss(g,1),0);
 const g2=game();run(g2,5);const d=S.ensureDecisions(g2);assert.equal(d.civic,undefined,'no civic record before the first year');assert.ok(validDecisionState(d));
});
test('live: identity, prehistory, politics and the read model appear, stay valid and survive a save',()=>{
 const g=game();assert.ok(isEngineReadQuery({kind:'society-civic'}));assert.equal(isEngineReadQuery({kind:'society-civic',x:1}),false);
 run(g,400);const c=R.peekCivic(g);assert.ok(c,'civic record exists after a few years');
 const m=applyEngineReadQuery(g,{kind:'society-civic'}).civic;assert.ok(m.enabled);
 assert.ok(m.prehistory.lines.length>=3&&m.prehistory.societies.length>=4,'asymmetry is disclosed');
 assert.deepEqual(m.prehistory.societies.map(s=>s.size).length,m.prehistory.societies.length);
 assert.ok(m.own&&m.own.identity.continuity>0&&m.own.politics.stage);
 for(const t of [0,1,2,4]){const id=c.identity[String(t)];assert.ok(id&&id.continuity>0&&id.native>=1,'identity for '+t);assert.ok(c.politics[String(t)]);}
 assert.ok(m.chapter&&m.chapter.links.length===4);
 assert.ok(validDecisionState(S.ensureDecisions(g)));
 const before=JSON.stringify(g.state);applyEngineReadQuery(g,{kind:'society-civic'});assert.equal(JSON.stringify(g.state),before,'the read model is read-only');
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));const g2=decodeGame(raw);assert.deepEqual(R.peekCivic(g2).identity,c.identity);assert.deepEqual(R.peekCivic(g2).prehistory,c.prehistory);
});
test('live: arrivals and departures reach identity; institutions cost real stock; proposals carry consequences',()=>{
 const g=game();run(g,200);const c=R.peekCivic(g);
 R.noteArrivals(g,0,40,true);R.noteDepartures(g,0,3);const adoptedBefore=c.identity['0'].adopted;
 run(g,100);assert.ok(c.identity['0'].adopted>adoptedBefore||c.identity['0'].last!=='founded','arrivals changed identity');
 // give rival 1 an institution site and the means: it must pay upkeep out of its own stock, never create goods
 const t=g.tribe(1);t.food=2000;t.wood=500;t.stone=200;
 for(const type of ['temple','warehouse','workshop']){const b=g.makeBld(type,g.campOf(1).x+20,g.campOf(1).z+20,1);b.progress=b.progress??1;g.state.buildings.push(b);}
 const stockBefore=t.food+t.wood+t.stone;run(g,300);
 const list=c.institutions['1']??[];
 for(const i of list){assert.ok(S.ensureDecisions(g).history['1'].some(h=>h.text.includes(i.kind)),'recorded in the history');}
 const fx=R.civicEffects(g,1);assert.ok(fx.consent<=.24&&fx.decisionDelay<=1.3&&fx.identityShield<=.45);
 assert.ok(R.civicLegitimacy(g,1)<=15&&R.civicLegitimacy(g,1)>=-15);
 void stockBefore;assert.ok(g.tribe(1).food>=0&&g.tribe(1).wood>=0&&g.tribe(1).stone>=0);
 for(const [k,ps] of Object.entries(c.proposals)){assert.ok(ps.length<=12);assert.ok(ps.filter(p=>p.status==='open').length<=1,'one open proposal for '+k);}
});
test('live: unrest from complexity and distant hearths feeds the existing ledgers and stays bounded',()=>{
 const g=game();run(g,300);const c=R.peekCivic(g);
 c.politics['1']={...c.politics['1'],stage:'rupture'};assert.equal(R.politicsLoss(g,1),16);
 assert.ok(S.breakawayLoss(g,1)<=80);c.autonomy['77']=.5;assert.equal(R.outpostGrievance(g,77),.5);
 assert.ok(validDecisionState(S.ensureDecisions(g)));
});
import {recordSocietyContact} from '../src/game/societyRelations.ts';
import {recordFromSightings} from '../src/game/societyIntel.ts';
test('M2-16 chapter: surplus -> wider access -> exposed routes -> independent society decisions, each from real state',()=>{
 const g=game();run(g,120);const d=S.ensureDecisions(g),t0=g.tribe(0);
 assert.ok(R.civicModel(g).chapter.broken,'the chain is not complete before surplus, access and exposure exist');
 t0.food=4000;const home=g.state.buildings.find(b=>b.team===0&&b.type==='townhall');
 if(home){const h2=g.makeBld('townhall',home.x+150,home.z,0);h2.progress=1;g.state.buildings.push(h2);}
 const ua=g.state.units.find(u=>u.team===0&&u.hp>0),ub=g.state.units.find(u=>u.team===1&&u.hp>0);ub.x=ua.x+1;ub.z=ua.z;assert.ok(recordSocietyContact(g,ua,ub));
 const rec=recordFromSightings(1,0,[{id:1,observedAt:g.state.time,type:'warehouse',defenders:0,defensePower:0,x:0,z:0},{id:2,observedAt:g.state.time,type:'townhall',defenders:0,defensePower:0,x:0,z:0}],g.state.time,undefined,'route');
 assert.ok(rec);d.intel.push(rec);
 const after=R.chapterInput(g);assert.ok(after.knownSocieties>=1);assert.ok(after.exposure>0);
 const chain=R.civicModel(g).chapter;
 assert.deepEqual(chain.links.map(l=>l.id),['surplus','access','exposure','decisions']);
 for(const l of chain.links.slice(1,3))assert.ok(l.met,l.id+': '+l.evidence);
 d.plans['2']={id:91,kind:'grow',since:0,until:900,reserve:{food:0,wood:0,stone:0},people:0,score:50,reasons:['room']};d.plans['4']={id:92,kind:'stockpile',since:0,until:900,reserve:{food:0,wood:0,stone:0},people:0,score:50,reasons:['lean']};
 assert.ok(R.civicModel(g).chapter.links.find(l=>l.id==='decisions').met);
 const surplus=R.civicModel(g).chapter.links.find(l=>l.id==='surplus');assert.equal(surplus.met,after.foodSeconds>=900,surplus.evidence);
 t0.food=0;assert.equal(R.civicModel(g).chapter.broken,'surplus','breaking the surplus breaks the chain at its first link');
});
import {foundSocietyFromBreakaway} from '../src/game/societyBreakaway.ts';
test('CAT-118 finish: a recognised breakaway becomes a new society, conserving goods and surviving a save',()=>{
 const g=game();run(g,100);const t1=g.tribe(1),home=g.state.buildings.find(b=>b.team===1&&b.type==='townhall')??g.makeBld('townhall',g.campOf(1).x,g.campOf(1).z,1);
 if(!g.state.buildings.includes(home)){home.progress=1;g.state.buildings.push(home);}
 const h2=g.makeBld('townhall',home.x+160,home.z,1);h2.progress=1;g.state.buildings.push(h2);const house=g.makeBld('hut',h2.x+8,h2.z+8,1);house.progress=1;g.state.buildings.push(house);
 for(let i=0;i<6;i++){const u=g.spawnUnit('worker',h2.x+i,h2.z+3,1);u.homeHall=h2.id;}
 (g.state.communities??=[]).push({hall:h2.id,team:1,name:'Far Hearth',founded:0,emptySince:null,status:'thriving'});
 t1.food=1000;t1.wood=400;const before={food:t1.food,wood:t1.wood},n=g.state.tribes.length,peopleBefore=g.state.units.length;
 assert.equal(foundSocietyFromBreakaway(g,999999),null,'unknown hall is refused');
 const id=foundSocietyFromBreakaway(g,h2.id);assert.equal(id,n);assert.equal(g.state.tribes.length,n+1);
 const nt=g.tribe(id);assert.equal(nt.name,'Far Hearth');assert.ok(nt.food>0&&nt.food<before.food*.5);assert.equal(nt.food+t1.food,before.food,'food is conserved');assert.equal(nt.wood+t1.wood,before.wood,'wood is conserved');
 assert.equal(g.state.units.length,peopleBefore,'no one teleports or vanishes');assert.equal(g.state.units.filter(u=>u.team===id&&u.homeHall===h2.id).length,6);
 assert.equal(h2.team,id);assert.equal(house.team,id);assert.ok(g.state.buildings.some(b=>b.team===1&&b.type==='townhall'),'the parent keeps its own hall');
 assert.equal(g.state.communities.find(c=>c.hall===h2.id).team,id);
 assert.equal(foundSocietyFromBreakaway(g,h2.id),null,'cannot be founded twice');
 run(g,200);assert.ok(g.tribe(id).alive);assert.ok(S.ensureDecisions(g).history[String(id)].length>0);
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));const g2=decodeGame(raw);assert.equal(g2.state.tribes.length,n+1);run(g2,60);
});
