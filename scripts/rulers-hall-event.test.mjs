import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {validDecisionState,HALL_EVENT_CAP} from '../src/game/societyState.ts';
import {validRulersState} from '../src/game/rulersState.ts';
import * as S from '../src/game/societyRuntime.ts';
import * as R from '../src/game/rulersRuntime.ts';
import {councilModel} from '../src/game/rulersView.ts';

const change=(g,team)=>{const soc=g.state.rulers.societies[String(team)],prev=soc.dynasty.rulerId;
 S.yearlySocieties(g);
 let heir=Object.values(soc.dynasty.people).find(p=>p.alive&&p.id!==prev)?.id;
 if(!heir){heir=team+'-heir';soc.dynasty.people[heir]={...soc.dynasty.people[prev],id:heir,name:'Heir',parent:prev,ruler:undefined,legit:true,spouse:undefined};}
 soc.dynasty.people[prev]={...soc.dynasty.people[prev],alive:false};soc.dynasty.rulerId=heir;S.yearlySocieties(g);};
test('a ruler change raises one hall event with mourning; it expires, saves round-trip, old saves have none',()=>{
 const g=new Game();g.reset(123456,10);g.enterIsland();g.state.time=R.RULERS_YEAR_SECONDS*3+1;R.advanceRulers(g);
 assert.deepEqual(S.hallEventsOf(g,1),[],'no event before a change');assert.equal(S.mourningOf(g,1),undefined);
 change(g,1);
 const ev=S.hallEventsOf(g,1);assert.equal(ev.length,1,'exactly one event');
 assert.equal(ev[0].kind,'ruler-death');assert.ok(ev[0].mourningUntil>ev[0].time);assert.ok(ev[0].from&&ev[0].to&&ev[0].from!==ev[0].to);
 assert.equal(S.mourningOf(g,1)?.id,ev[0].id,'in mourning now');
 assert.equal(S.hallEventsOf(g,2).length,0,'other houses unaffected');
 const m=councilModel(g,1).mourning;assert.ok(m&&m.secondsLeft>0&&m.to===ev[0].to,'handover card data reaches the council model');
 const copy=JSON.parse(JSON.stringify(g.state.rulers));assert.ok(validRulersState(copy));assert.deepEqual(copy.decisions.halls,ev);
 g.state.time=ev[0].mourningUntil+1;assert.equal(S.mourningOf(g,1),undefined,'mourning ends');assert.equal(councilModel(g,1).mourning,undefined);
 const old=JSON.parse(JSON.stringify(copy));delete old.decisions.halls;assert.ok(validRulersState(old),'old saves without halls load');
 const bad=JSON.parse(JSON.stringify(copy));bad.decisions.halls=new Array(HALL_EVENT_CAP+1).fill(ev[0]);assert.equal(validDecisionState(bad.decisions),false,'unbounded halls rejected');
 const bad2=JSON.parse(JSON.stringify(copy));bad2.decisions.halls[0].kind='coup-of-gods';assert.equal(validDecisionState(bad2.decisions),false);
});
