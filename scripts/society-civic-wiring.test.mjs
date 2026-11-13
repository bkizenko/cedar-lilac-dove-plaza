// W2 civic wiring (M2-11 arrival/departure hooks, M2-14 prehistory at start) on live Game.step for new rulersVersion 2 games.
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {applyEngineReadQuery} from '../src/game/engineReadModels.ts';
import {mulberry32} from '../src/game/rng.ts';
import * as S from '../src/game/societyRuntime.ts';
import * as R from '../src/game/societyCivicRuntime.ts';
import {PREHISTORY_RULES} from '../src/game/societyCivic.ts';
import {prepareOwnedHandover} from '../src/game/communityHandover.ts';
import {validDecisionState} from '../src/game/societyState.ts';
const random=Math.random;test.beforeEach(()=>{Math.random=mulberry32(0x7a11);});test.afterEach(()=>{Math.random=random;});
function game(opts={rulersVersion:2}){const g=new Game();g.reset(5,10,opts);g.enterIsland();return g;}
function run(g,seconds){const end=g.state.time+seconds;while(g.state.time<end){g.state.paused=false;g.step(.5);}assert.deepEqual(g.simulationErrors,[]);}
const stock=g=>g.state.tribes.map(t=>({food:t.food,wood:t.wood,stone:t.stone}));

test('M2-14: a new game records its bounded prehistory on the first tick over the real start sizes, granting no goods',()=>{
 const g=game();const sizes=new Map([0,1,2,4].map(t=>[t,g.state.units.filter(u=>u.team===t&&u.hp>0).length]));
 assert.equal(R.peekCivic(g),undefined,'nothing before the first tick');
 const before=stock(g);g.state.paused=false;g.step(.5);
 const c=R.peekCivic(g);assert.ok(c?.prehistory,'recorded on the first step');
 assert.equal(c.prehistory.steps,PREHISTORY_RULES.steps,'bounded run');assert.ok(c.prehistory.societies.length>=4);
 for(const s of c.prehistory.societies)if(sizes.has(s.team))assert.ok(Math.abs(s.size-sizes.get(s.team))<=2,`real start size for ${s.team}: ${s.size} vs ${sizes.get(s.team)}`);
 for(const t of [0,1,2,4])assert.ok(c.identity[String(t)],'identity seeded at start for '+t);
 assert.deepEqual(c.politics,{},'no yearly review yet');
 const m=applyEngineReadQuery(g,{kind:'society-civic'}).civic;assert.ok(m.enabled&&m.prehistory.lines.length>=3,'asymmetry disclosed in the read model from the opening');
 const after=stock(g);for(let i=0;i<before.length;i++)for(const k of ['food','wood','stone'])assert.ok(after[i][k]<=before[i][k]+1e-9,`prehistory grants no goods (${i} ${k})`);
 const pre=JSON.stringify(c.prehistory);run(g,200);assert.equal(JSON.stringify(R.peekCivic(g).prehistory),pre,'recorded once, never re-run by the yearly review');
 assert.ok(validDecisionState(S.ensureDecisions(g)));
 const g2=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(JSON.stringify(R.peekCivic(g2).prehistory),pre,'survives a save');
});

test('M2-14: rulersVersion 1 games stay untouched',()=>{
 const g=game({rulersVersion:1});run(g,20);assert.equal(R.peekCivic(g),undefined);R.beginCivic(g);assert.equal(R.peekCivic(g),undefined);
});

test('M2-11: departures and arrivals are consumed by the yearly review and keep identity valid',()=>{
 const g=game();run(g,5);const c=R.peekCivic(g);
 const pend=t=>c.pending[String(t)]??{arrivals:0,refugees:0,departures:0};
 R.noteArrivals(g,0,1,true);R.noteDepartures(g,1,1);
 assert.equal(pend(1).departures,1);assert.equal(pend(0).refugees,1);
 run(g,100);
 assert.ok(c.identity['1'].continuity>0&&c.identity['1'].native>=1);assert.equal(pend(1).departures,0,'consumed by the yearly review');
 assert.ok(validDecisionState(S.ensureDecisions(g)));
});

test('M2-11: a whole-society handover records the joining people as arrivals in the committed state only, goods conserved',()=>{
 const g=game();run(g,5);const people=g.state.units.filter(u=>u.team===4).length;assert.ok(people>0);
 const plan=prepareOwnedHandover(g,4,0);assert.ok(plan.accepted,plan.reason);
 const civ=plan.state.rulers.decisions.civic;assert.ok(civ.pending['0'].arrivals>=people,'handover arrivals recorded');
 assert.equal(civ.pending['4']?.departures??0,0,'a whole-society handover is not a departure');
 assert.ok((R.peekCivic(g).pending['0']?.arrivals??0)<people,'the live game is not written before commit');
 const total=st=>st.tribes.reduce((s,t)=>s+t.food+t.wood+t.stone,0);
 assert.ok(total(plan.state)<=total(g.state)+1e-6,'no goods created by the identity record');
});
