import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {mulberry32} from '../src/game/rng.ts';
import * as R from '../src/game/societyCivicRuntime.ts';
import {validProposal,PROPOSAL_RULES} from '../src/game/societyCivic.ts';
const random=Math.random;test.beforeEach(()=>{Math.random=mulberry32(0x5151);});test.afterEach(()=>{Math.random=random;});
function game(){const g=new Game();g.reset(5,10,{rulersVersion:2});g.enterIsland();return g;}
function run(g,s){const end=g.state.time+s;while(g.state.time<end){g.state.paused=false;g.step(.5);}}
/** Plant an open player-addressed proposal in the real civic record (the same shape propose() emits). */
function plant(g,extra={}){run(g,200);const c=R.peekCivic(g);const list=c.proposals['0']??(c.proposals['0']=[]);list.length=0;
 const p={id:c.nextId++,kind:'commitment',title:'hold a food reserve through the lean season',proposer:'x',at:g.state.time,until:g.state.time+PROPOSAL_RULES.openSeconds,status:'open',legitimacyDelta:0,continuityDelta:0,ask:true,planKind:'stockpile',...extra};list.push(p);return {c,p};}
test('command schema accepts only well-formed answer-proposal commands',()=>{
 assert.ok(isEngineDispatchCommand({kind:'answer-proposal',proposalId:3,accept:true}));
 assert.equal(isEngineDispatchCommand({kind:'answer-proposal',proposalId:3}),false);
 assert.equal(isEngineDispatchCommand({kind:'answer-proposal',proposalId:'3',accept:true}),false);
 assert.equal(isEngineDispatchCommand({kind:'answer-proposal',proposalId:3,accept:true,team:2}),false);
});
test('an asked proposal is not auto-answered by the council and is shown with an id',()=>{
 const g=game(),{c,p}=plant(g);run(g,100);assert.equal(c.proposals['0'].find(x=>x.id===p.id).status,'open');
 const line=R.civicModel(g).own.proposals.find(x=>x.id===p.id);assert.ok(line&&line.ask);
});
test('accept: dispatch moves it to accepted with a deadline, and it survives a save',()=>{
 const g=game(),{c,p}=plant(g);
 const r=applyEngineCommand(g,{kind:'answer-proposal',proposalId:p.id,accept:true});assert.equal(r.accepted,true,r.reason);
 const q=c.proposals['0'].find(x=>x.id===p.id);assert.equal(q.status,'accepted');assert.ok(!q.ask);assert.ok(q.until>g.state.time);assert.ok(validProposal(q));
 assert.equal(applyEngineCommand(g,{kind:'answer-proposal',proposalId:p.id,accept:false}).accepted,false,'cannot answer twice');
 const g2=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(R.peekCivic(g2).proposals['0'].find(x=>x.id===p.id).status,'accepted');
});
test('decline: dispatch declines it and costs the bounded legitimacy once',()=>{
 const g=game(),{c,p}=plant(g);const before=c.legitimacy['0']??0;
 const r=applyEngineCommand(g,{kind:'answer-proposal',proposalId:p.id,accept:false});assert.equal(r.accepted,true,r.reason);
 assert.equal(c.proposals['0'].find(x=>x.id===p.id).status,'declined');assert.equal(c.legitimacy['0'],R.boundLegitimacy?R.boundLegitimacy(before+PROPOSAL_RULES.declinedLegitimacy):before+PROPOSAL_RULES.declinedLegitimacy);
});
test('refusals: unknown id, a council-decided (legacy) proposal, a lapsed one',()=>{
 const g=game(),{c,p}=plant(g);
 assert.equal(applyEngineCommand(g,{kind:'answer-proposal',proposalId:99999,accept:true}).accepted,false);
 const legacy=c.proposals['0'][0];delete legacy.ask;assert.equal(applyEngineCommand(g,{kind:'answer-proposal',proposalId:p.id,accept:true}).accepted,false,'legacy proposals keep the automatic answer');
 legacy.ask=true;legacy.until=g.state.time-1;assert.equal(applyEngineCommand(g,{kind:'answer-proposal',proposalId:p.id,accept:true}).accepted,false);
});
test('an unanswered asked proposal lapses to declined at its deadline',()=>{
 const g=game(),{c,p}=plant(g);run(g,PROPOSAL_RULES.openSeconds+200);const q=c.proposals['0'].find(x=>x.id===p.id);assert.ok(q);assert.notEqual(q.status,'open');
});
test('a live game puts proposals to the player (no council auto-answer); no-ask proposals still validate',()=>{
 const g=game();run(g,200);const c=R.peekCivic(g);let found;
 // propose() is seeded by the next id: step the yearly review (90 s) and vary the id until the ruler speaks (bounded)
 for(let k=0;k<12&&!found;k++){c.nextId+=1;run(g,90);found=(c.proposals['0']??[]).find(p=>p.status==='open');}
 assert.ok(found,'the ruler put a proposal to the player');assert.equal(found.ask,true);assert.ok(validProposal(found));
 const before=found.status;run(g,100);assert.equal(c.proposals['0'].find(p=>p.id===found.id).status,before,'the council does not answer it for the player');
 const m=R.civicModel(g).own.proposals.find(p=>p.id===found.id);assert.ok(m&&m.ask);
 const legacy={...found};delete legacy.ask;assert.ok(validProposal(legacy));
});
