import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {knowledgeReport} from '../src/game/knowledge.ts';
import {tickObservedMethods,validObservedMethods,observedMethod} from '../src/game/observedKnowledge.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){
 const g=new Game();g.reset(42,10);g.enterIsland();g.state.time=100;
 const maker=g.spawnUnit('worker',3,36,1),watcher=g.spawnUnit('worker',5,36,0);
 g.state.production??={projects:[]};
 g.state.production.projects.push({id:9001,team:1,recipe:'formClayHand',workplace:0,actorId:maker.id,phase:'working',progress:0});
 return {g,maker,watcher};
}
test('watching a working maker records a named, partly-known observation without granting the method',()=>{
 const {g,maker,watcher}=fixture();
 for(let i=0;i<8;i++){g.state.time+=2;tickObservedMethods(g);}
 const o=observedMethod(g,0,'formClayHand');assert.ok(o&&o.seconds>=10);assert.equal(o.sourceTeam,1);assert.equal(o.sourcePersonId,maker.id);
 assert.equal(g.tribe(0).productionPractice?.formClayHand,undefined,'no instant unlock');
 const t=knowledgeReport(g).topics.find(t=>t.id==='production:pottery');
 assert.ok(t.provenance.some(p=>p.kind==='observed'&&p.method==='formClayHand'&&p.sourceName));
 assert.notEqual(t.knowledgeState,'known');assert.ok(watcher.hp>0);
});
test('distant onlookers learn nothing and the record survives save and load; bad records are rejected',()=>{
 const {g,watcher}=fixture();watcher.x=500;watcher.z=500;
 for(let i=0;i<8;i++){g.state.time+=2;tickObservedMethods(g);}
 assert.equal(observedMethod(g,0,'formClayHand'),undefined);
 watcher.x=5;watcher.z=36;for(let i=0;i<8;i++){g.state.time+=2;tickObservedMethods(g);}
 const before=JSON.stringify(observedMethod(g,0,'formClayHand'));assert.ok(before);
 delete g.state.production;const g2=decodeGame(encodeGame(g));assert.equal(JSON.stringify(observedMethod(g2,0,'formClayHand')),before);
 g2.tribe(0).observedMethods.formClayHand.seconds=-1;assert.equal(validObservedMethods(g2.state),false);
 const old=new Game();old.reset(42,10);old.enterIsland();assert.equal(validObservedMethods(old.state),true);
});
