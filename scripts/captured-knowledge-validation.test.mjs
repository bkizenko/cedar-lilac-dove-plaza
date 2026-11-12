import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {PRODUCTION_RECIPES} from '../src/game/production.ts';
import {snapshotCapturedMethods,capturedMethodSourcesForPerson,capturedRecipeSources,validCapturedKnowledgeState} from '../src/game/capturedKnowledge.ts';
const recipe='fireClayHand',validRecipe=k=>Object.hasOwn(PRODUCTION_RECIPES,k);
// Serialization-only declared history. Native paid capture/learning is separately exercised.
const initial=new Game();initial.reset(94731,18);initial.enterIsland();const legacy=encodeGame(initial);
function fixture(){
 const raw=structuredClone(legacy),s=raw.state;s.time=100;
 const [teacher,learner]=s.units.filter(u=>u.team===0&&u.type==='worker');assert.ok(teacher&&learner);
 teacher.productionSkills={[recipe]:{successfulBatches:3,taughtBatches:0,observedSeconds:0}};
 const methods=snapshotCapturedMethods({...s,time:20},{...teacher,team:1});
 s.captiveDealings={version:1,custodySince:[],interrogations:[],intel:[],ransoms:[],integrations:[{unitId:teacher.id,originTeam:1,captorTeam:0,at:60,methods}]};
 const source={version:1,kind:'captured',originMakerId:teacher.id,sourceTeam:1,capturedAt:20,integratedAt:60,learnedAt:100,successfulBatchesAtCapture:3,taughtBatchesAtCapture:0};
 learner.productionSkills={[recipe]:{successfulBatches:0,taughtBatches:1,observedSeconds:30,lastTaughtAt:100,lastTeacherId:teacher.id,methodSources:[source]}};
 return{raw,s,teacher,learner,source,methods};
}
test('legacy villages load without inventing any captured method history',()=>{
 const copy=decodeGame(structuredClone(legacy));assert.equal(copy.state.captiveDealings,undefined);assert.equal(validCapturedKnowledgeState(copy.state,validRecipe),true);assert.deepEqual(capturedRecipeSources(copy.state,0,[recipe]),[]);
});
test('optional new evidence does not tighten legacy integration records',()=>{
 const raw=structuredClone(legacy),person=raw.state.units.find(u=>u.team===0);raw.state.time=100;
 raw.state.captiveDealings={version:1,custodySince:[],interrogations:[],intel:[],ransoms:[],integrations:[{unitId:person.id,originTeam:0,captorTeam:0,at:60}]};
 assert.equal(validCapturedKnowledgeState(raw.state,validRecipe),true);assert.doesNotThrow(()=>decodeGame(raw));
});
test('known personal methods are copied at capture and cannot change through later local experience',()=>{
 const {s,teacher,methods}=fixture(),before=JSON.stringify(methods);teacher.productionSkills[recipe].successfulBatches=14;
 assert.equal(JSON.stringify(methods),before);assert.equal(methods.recipes[0].successfulBatches,3);
 teacher.productionSkills.formClayHand={successfulBatches:9,taughtBatches:0,observedSeconds:0};
 assert.deepEqual(capturedMethodSourcesForPerson(s,teacher,'formClayHand'),[]);
 const data=JSON.stringify(s);capturedRecipeSources(s,0,[recipe,'formClayHand']);assert.equal(JSON.stringify(s),data,'knowledge queries are read-only');
});
test('valid source stories and exact learner receipts survive strict reload with immutable capture counters',()=>{
 const {raw,learner,teacher}=fixture();assert.equal(validCapturedKnowledgeState(raw.state,validRecipe),true);
 const copy=decodeGame(raw),saved=copy.state.units.find(u=>u.id===learner.id);assert.deepEqual(saved.productionSkills[recipe],learner.productionSkills[recipe]);
 assert.equal(capturedRecipeSources(copy.state,0,[recipe]).length,1,'one story is not multiplied by the number of holders');
 const returned=copy.state.units.find(u=>u.id===teacher.id);returned.team=1;assert.deepEqual(capturedMethodSourcesForPerson(copy.state,returned,recipe),[],'repatriation does not become capture by the original society');
 assert.equal(capturedRecipeSources(copy.state,0,[recipe]).length,1,'actual learner retains their acquired provenance');
});
test('strict saves reject forged chronology, counters, source identity, duplicate receipts and unknown methods',()=>{
 const changes=[
  f=>f.source.capturedAt=101,f=>f.source.integratedAt=10,f=>f.source.learnedAt=101,
  f=>f.source.originMakerId=f.s.nextId,f=>f.source.sourceTeam=999,
  f=>f.source.successfulBatchesAtCapture=0,f=>f.source.successfulBatchesAtCapture=4,
  f=>f.learner.productionSkills[recipe].methodSources.push({...f.source}),
  f=>f.learner.productionSkills[recipe].taughtBatches=0,
  f=>f.methods.recipes.push({...f.methods.recipes[0]}),
  f=>f.methods.recipes[0].recipe='unknownMethod',
  f=>f.methods.recipes=null,
 ];
 for(const change of changes){const f=fixture();change(f);assert.equal(validCapturedKnowledgeState(f.s,validRecipe),false);assert.throws(()=>decodeGame(f.raw));}
});
test('unfree people cannot expose method sources; a learned history travels with a later free migrant',()=>{
 const {s,teacher,learner}=fixture();learner.militia=true;assert.equal(capturedRecipeSources(s,0,[recipe]).length,1,'temporary duty does not erase learned history');delete learner.militia;teacher.prisoner={originTeam:1,captorTeam:0,phase:'custody',food:0,waterLiters:0,unguardedSeconds:0};learner.enslavedFrom=1;
 assert.deepEqual(capturedRecipeSources(s,0,[recipe]),[]);delete learner.enslavedFrom;learner.team=2;
 assert.equal(capturedRecipeSources(s,2,[recipe]).length,1);assert.equal(capturedRecipeSources(s,0,[recipe]).length,0);
});
